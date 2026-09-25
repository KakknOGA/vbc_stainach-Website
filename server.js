'use strict';
require('dotenv').config();

const express   = require('express');
const session   = require('express-session');
const helmet    = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt    = require('bcryptjs');
const multer    = require('multer');
const crypto    = require('crypto');
const path      = require('path');
const supabase = require('./lib/supabase');
const stvv     = require('./lib/stvv-schedule');
const standings = require('./lib/stvv-standings');

const app  = express();
const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const IS_PROD = process.env.NODE_ENV === 'production';

/* Ohne festes Secret wären Session-Cookies mit einem öffentlich
   bekannten Schlüssel signiert. In Produktion daher gar nicht starten;
   lokal reicht ein Zufallswert (Logins überleben dann keinen Neustart). */
let SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET) {
  if (IS_PROD) {
    console.error('❌  SESSION_SECRET fehlt in den Umgebungsvariablen');
    process.exit(1);
  }
  SESSION_SECRET = crypto.randomBytes(32).toString('hex');
  console.warn('⚠️  SESSION_SECRET fehlt – verwende zufälliges Secret nur für diese Sitzung.');
}

/* ════════════════════════════════════════════════
   SUPABASE DB WRAPPER
════════════════════════════════════════════════ */
const db = {
  async all(name) {
    const { data, error } = await supabase.from(name).select('*');
    if (error) throw error;
    return data || [];
  },

  async get(name, id) {
    const { data } = await supabase.from(name).select('*').eq('id', id).maybeSingle();
    return data || null;
  },

  async insert(name, obj) {
    const { data, error } = await supabase.from(name).insert(obj).select().single();
    if (error) throw error;
    return data;
  },

  async update(name, id, changes) {
    const { data, error } = await supabase.from(name).update(changes).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  async delete(name, id) {
    const { error } = await supabase.from(name).delete().eq('id', id);
    if (error) throw error;
    return true;
  },

  async findUser(username) {
    const { data } = await supabase.from('users').select('*').eq('username', username).maybeSingle();
    return data || null;
  },

  /* Wirft bei DB-Fehlern, damit ein Supabase-Aussetzer nicht als
     "Benutzer gelöscht" gilt und alle Admins abmeldet. */
  async getUser(id) {
    const { data, error } = await supabase.from('users').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data || null;
  }
};

/* ── Middleware ─────────────────────────────────── */
/* Nur JSON: alle Formulare senden per fetch. Ohne urlencoded-Parser
   lassen sich API-Routen nicht per klassischem HTML-Formular (CSRF)
   ansprechen. */
app.use(express.json({ limit: '2mb' }));

/* ── Sicherheits-Header ─────────────────────────── */
/* Bewusst nur CSP-Direktiven, die kein Skript/Bild/Stylesheet sperren
   (Vue im Admin braucht Laufzeit-Templates, die Seiten Inline-Skripte). */
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      'default-src':     helmet.contentSecurityPolicy.dangerouslyDisableDefaultSrc,
      'frame-ancestors': ["'self'"],
      'base-uri':        ["'self'"],
      'object-src':      ["'none'"],
      'form-action':     ["'self'"]
    }
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  strictTransportSecurity: IS_PROD ? { maxAge: 31536000 } : false
}));

/* ── Reverse-Proxy (Railway) ────────────────────── */
/* Dort endet HTTPS am Proxy; intern kommt HTTP an. Ohne "trust proxy"
   hält Express die Verbindung für unsicher und sendet das secure-Cookie
   nicht → Admin-Login schlägt fehl. Liefert außerdem die echte
   Client-IP für das Login-Rate-Limit. */
if (IS_PROD) app.set('trust proxy', 1);

app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: 'strict',
    secure: IS_PROD
  }
}));

/* ── Fehlerantworten ────────────────────────────── */
/* Interne Fehlermeldungen (Supabase, bcrypt …) nur an angemeldete
   Admins weitergeben, Besucher bekommen einen neutralen Text. */
function serverError(req, res, e) {
  console.error(`[${req.method} ${req.originalUrl}]`, e);
  const detail = req.session?.userId && e?.message;
  res.status(500).json({ error: detail || 'Interner Serverfehler' });
}

/* ── Datei-Upload ───────────────────────────────── */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /\.(jpe?g|png|gif|webp|svg)$/i.test(file.originalname) &&
               /^image\//i.test(file.mimetype);
    cb(null, ok);
  }
});

/* ── Auth Guard ─────────────────────────────────── */
/* Kennung des aktuellen Passwort-Hashs. Steht sie in der Session und
   passt nicht mehr (Passwort geändert, Benutzer gelöscht), ist die
   Session ungültig – so wirkt eine Passwortänderung auf alle Geräte. */
const pwFingerprint = hash =>
  crypto.createHash('sha256').update(String(hash)).digest('hex').slice(0, 32);

const requireAuth = async (req, res, next) => {
  const deny = () => req.path.startsWith('/api/')
    ? res.status(401).json({ error: 'Nicht angemeldet' })
    : res.redirect('/admin');
  if (!req.session?.userId) return deny();
  try {
    const user = await db.getUser(req.session.userId);
    if (!user || pwFingerprint(user.password_hash) !== req.session.pwv)
      return req.session.destroy(() => deny());
    req.user = user;
    next();
  } catch (e) { serverError(req, res, e); }
};

/* ── Login-Schutz ───────────────────────────────── */
/* Pro IP 10 Fehlversuche in 15 Minuten; erfolgreiche Logins zählen nicht. */
const authLimiter = () => rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Zu viele Fehlversuche. Bitte in 15 Minuten erneut versuchen.' }
});
const loginLimiter    = authLimiter();
const passwordLimiter = authLimiter();

/* Vergleich gegen einen Dummy-Hash, wenn der Benutzer nicht existiert:
   gleiche Antwortzeit, damit sich Benutzernamen nicht erraten lassen. */
const DUMMY_HASH = bcrypt.hashSync(crypto.randomBytes(16).toString('hex'), 12);

/* bcrypt wertet nur die ersten 72 Byte aus. */
const PW_MIN = 12;
const PW_MAX_BYTES = 72;

const logName = s => JSON.stringify(String(s).slice(0, 100));


/* ════════════════════════════════════════════════
   ADMIN-SEITEN
════════════════════════════════════════════════ */
app.get('/admin', (req, res) => {
  if (req.session?.userId) return res.redirect('/admin/dashboard');
  res.sendFile(path.join(ROOT, 'admin', 'index.html'));
});
app.get('/admin/dashboard', requireAuth, (_req, res) => {
  res.sendFile(path.join(ROOT, 'admin', 'dashboard.html'));
});
app.get('/admin/dashboard.html', (_req, res) => res.redirect('/admin/dashboard'));
app.get('/admin/index.html',     (_req, res) => res.redirect('/admin'));
app.use('/admin/css', express.static(path.join(ROOT, 'admin', 'css')));
app.use('/admin/js',  express.static(path.join(ROOT, 'admin', 'js')));

/* ── Public Static Files ────────────────────────── */
/* Nur public/ ist öffentlich – Server-Code, Schema, .git usw. bleiben
   außerhalb. Einzige Ausnahme: der STVV-Parser, den Server und Browser
   gemeinsam nutzen (index.html lädt ihn als lib/stvv-parse.js). */
app.use(express.static(path.join(ROOT, 'public'), { index: 'index.html' }));
app.get('/lib/stvv-parse.js', (_req, res) => res.sendFile(path.join(ROOT, 'lib', 'stvv-parse.js')));

/* ════════════════════════════════════════════════
   API – AUTH
════════════════════════════════════════════════ */
app.post('/api/auth/login', loginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (typeof username !== 'string' || typeof password !== 'string' || !username || !password)
      return res.status(400).json({ error: 'Benutzername und Passwort erforderlich' });
    if (username.length > 100 || password.length > 1024)
      return res.status(401).json({ error: 'Ungültige Anmeldedaten' });

    const user  = await db.findUser(username);
    const valid = await bcrypt.compare(password, user ? user.password_hash : DUMMY_HASH);
    if (!user || !valid) {
      console.warn(`[auth] Login fehlgeschlagen: ${logName(username)} von ${req.ip}`);
      return res.status(401).json({ error: 'Ungültige Anmeldedaten' });
    }

    /* Neue Session-ID nach dem Login (Schutz vor Session-Fixation) */
    req.session.regenerate(err => {
      if (err) return serverError(req, res, err);
      req.session.userId   = user.id;
      req.session.username = user.username;
      req.session.role     = user.role;
      req.session.pwv      = pwFingerprint(user.password_hash);
      req.session.save(err2 => {
        if (err2) return serverError(req, res, err2);
        console.log(`[auth] Login erfolgreich: ${logName(user.username)} von ${req.ip}`);
        res.json({ success: true, username: user.username });
      });
    });
  } catch (e) { serverError(req, res, e); }
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid', { path: '/', httpOnly: true, sameSite: 'strict', secure: IS_PROD });
    res.json({ success: true });
  });
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ username: req.session.username, role: req.session.role });
});

app.post('/api/auth/change-password', requireAuth, passwordLimiter, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (typeof currentPassword !== 'string' || typeof newPassword !== 'string' || !currentPassword)
      return res.status(400).json({ error: 'Aktuelles und neues Passwort erforderlich' });
    if (newPassword.length < PW_MIN)
      return res.status(400).json({ error: `Neues Passwort muss mindestens ${PW_MIN} Zeichen haben` });
    if (Buffer.byteLength(newPassword, 'utf8') > PW_MAX_BYTES)
      return res.status(400).json({ error: 'Neues Passwort ist zu lang (max. 72 Zeichen)' });

    const user = req.user;
    if (!await bcrypt.compare(currentPassword, user.password_hash))
      return res.status(401).json({ error: 'Aktuelles Passwort ist falsch' });

    const hash = await bcrypt.hash(newPassword, 12);
    await db.update('users', user.id, { password_hash: hash });
    /* Diese Session bleibt gültig, alle anderen fliegen beim nächsten Request raus. */
    req.session.pwv = pwFingerprint(hash);
    console.log(`[auth] Passwort geändert: ${logName(user.username)} von ${req.ip}`);
    res.json({ success: true });
  } catch (e) { serverError(req, res, e); }
});

/* ════════════════════════════════════════════════
   API – NEWS
════════════════════════════════════════════════ */
app.get('/api/news', async (req, res) => {
  try {
    const onlyPublished = req.query.published === '1';
    const isAdmin       = !!req.session?.userId;
    let news = await db.all('news');
    if (onlyPublished || !isAdmin) news = news.filter(n => n.published);
    news.sort((a, b) => new Date(b.publish_date || b.created_at) - new Date(a.publish_date || a.created_at));
    res.json(news);
  } catch (e) { serverError(req, res, e); }
});

app.get('/api/news/:id', async (req, res) => {
  try {
    const row = await db.get('news', parseInt(req.params.id));
    /* Entwürfe nur für Admins – sonst ließen sie sich per ID abrufen */
    if (!row || (!row.published && !req.session?.userId))
      return res.status(404).json({ error: 'Nicht gefunden' });
    res.json(row);
  } catch (e) { serverError(req, res, e); }
});

app.post('/api/news', requireAuth, async (req, res) => {
  try {
    const { title, description, content, image_url, tag, published, publish_date } = req.body;
    if (!title?.trim()) return res.status(400).json({ error: 'Titel ist erforderlich' });
    const now = new Date().toISOString();
    const row = await db.insert('news', {
      title:        title.trim(),
      description:  description  || '',
      content:      content      || '',
      image_url:    image_url    || '',
      tag:          tag          || 'Vereinsnews',
      published:    published    ? true : false,
      publish_date: publish_date || now.split('T')[0],
      created_at:   now,
      updated_at:   now
    });
    res.status(201).json(row);
  } catch (e) { serverError(req, res, e); }
});

app.put('/api/news/:id', requireAuth, async (req, res) => {
  try {
    const { title, description, content, image_url, tag, published, publish_date } = req.body;
    if (!title?.trim()) return res.status(400).json({ error: 'Titel ist erforderlich' });
    const id = parseInt(req.params.id);
    if (!await db.get('news', id)) return res.status(404).json({ error: 'Nicht gefunden' });
    const row = await db.update('news', id, {
      title:        title.trim(),
      description:  description  || '',
      content:      content      || '',
      image_url:    image_url    || '',
      tag:          tag          || 'Vereinsnews',
      published:    published    ? true : false,
      publish_date: publish_date || new Date().toISOString().split('T')[0],
      updated_at:   new Date().toISOString()
    });
    res.json(row);
  } catch (e) { serverError(req, res, e); }
});

app.delete('/api/news/:id', requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!await db.get('news', id)) return res.status(404).json({ error: 'Nicht gefunden' });
    await db.delete('news', id);
    res.json({ success: true });
  } catch (e) { serverError(req, res, e); }
});

/* ════════════════════════════════════════════════
   API – MEDIEN
════════════════════════════════════════════════ */
app.get('/api/media', requireAuth, async (req, res) => {
  try {
    const media = (await db.all('media')).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    res.json(media);
  } catch (e) { serverError(req, res, e); }
});

app.post('/api/media', requireAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Keine gültige Bilddatei' });
    const uid      = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext      = path.extname(req.file.originalname).toLowerCase();
    const filename = uid + ext;

    const { error: uploadError } = await supabase.storage
      .from('media')
      .upload(filename, req.file.buffer, { contentType: req.file.mimetype, upsert: false });
    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(filename);

    const row = await db.insert('media', {
      filename,
      original_name: req.file.originalname,
      file_url:      publicUrl,
      file_size:     req.file.size,
      mime_type:     req.file.mimetype,
      created_at:    new Date().toISOString()
    });
    res.status(201).json(row);
  } catch (e) { serverError(req, res, e); }
});

app.delete('/api/media/:id', requireAuth, async (req, res) => {
  try {
    const id  = parseInt(req.params.id);
    const row = await db.get('media', id);
    if (!row) return res.status(404).json({ error: 'Nicht gefunden' });
    await supabase.storage.from('media').remove([row.filename]);
    await db.delete('media', id);
    res.json({ success: true });
  } catch (e) { serverError(req, res, e); }
});

/* ════════════════════════════════════════════════
   API – KOMMENDE SPIELE (Liga + eigene Termine)
   ────────────────────────────────────────────────
   Führt den offiziellen STVV-Spielplan der 1. Mannschaft mit den
   im Redaktionssystem erfassten Terminen zusammen. Eigene Einträge
   ersetzen den Ligaspielplan nie, sie kommen dazu; nur bei einer
   echten Dopplung (gleiches Datum + gleiche Paarung) gewinnt der
   händische Eintrag, damit sich Zeit/Ort korrigieren lassen.

   Antwort: { fixtures, stvv: { ok, error, fetchedAt, count }, … }
   Ist stvv.ok false (auf Railway blockt Cloudflare den Abruf),
   holt cms.js den Spielplan direkt im Browser nach.
════════════════════════════════════════════════ */
const GAME_MONTHS = {
  'jän': 0, 'jan': 0, 'feb': 1, 'mär': 2, 'mar': 2, 'apr': 3, 'mai': 4, 'jun': 5,
  'jul': 6, 'aug': 7, 'sep': 8, 'okt': 9, 'oct': 9, 'nov': 10, 'dez': 11, 'dec': 11
};

/* Altbestand ohne Datumsfeld: Tag/Monat auf das nächste passende
   Jahr beziehen, damit z. B. "15 Jän" im Herbst nicht als vergangen gilt. */
function dateFromDayMonth(day, month) {
  const d = parseInt(String(day || '').replace(/\D/g, ''), 10);
  const m = GAME_MONTHS[String(month || '').trim().slice(0, 3).toLowerCase()];
  if (!d || m === undefined) return '';
  const today = new Date(); today.setHours(0, 0, 0, 0);
  let year = today.getFullYear();
  const iso = y => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  if (new Date(iso(year) + 'T00:00:00') < today) year += 1;
  return iso(year);
}

function toAdminFixture(row) {
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(String(row.date || '').slice(0, 10))
    ? String(row.date).slice(0, 10)
    : dateFromDayMonth(row.day, row.month);
  return {
    source:   'admin',
    id:       `admin-${row.id}`,
    date:     iso,
    time:     row.time || '',
    home:     row.home || '',
    away:     row.away || '',
    type:     row.type || '',
    location: row.location || '',
    league:   row.league || '',
    round:    '',
    url:      '',
    sort_order: row.sort_order || 0
  };
}

/* Ligatabellen 2026/27 von stvv.at (matches.html → standings.js) */
app.get('/api/standings', async (_req, res) => {
  res.set('Cache-Control', 'public, max-age=300');
  res.json(await standings.getStandings());
});

app.get('/api/fixtures/upcoming', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 5, 50);
  let admin = [];
  let dbError = null;

  try {
    admin = (await db.all('games')).map(toAdminFixture);
  } catch (e) {
    console.error('[GET /api/fixtures/upcoming]', e);
    dbError = 'Datenbank nicht erreichbar';
  }

  const feed = await stvv.getTeamFixtures();
  const merged = mergeFixtures(admin, feed.ok ? feed.fixtures : []);

  res.json({
    fixtures: upcomingOnly(merged).slice(0, limit),
    limit,
    stvv: {
      ok:        feed.ok,
      error:     feed.error,
      fetchedAt: feed.fetchedAt,
      count:     feed.fixtures.length,
      /* Damit der Browser den Spielplan notfalls selbst holen kann */
      url:       stvv.config.url,
      team:      stvv.config.team,
      league:    stvv.config.league,
      venue:     stvv.config.venue
    },
    dbError
  });
});

/* Eigene Termine haben Vorrang vor der gleichen Ligapaarung. */
function mergeFixtures(adminRows, stvvRows) {
  const key = f => [f.date, stvv.parser.norm(f.home), stvv.parser.norm(f.away)].join('|');
  const seen = new Set(adminRows.map(key));
  return adminRows.concat(stvvRows.filter(f => !seen.has(key(f))));
}

/* Alles ab heute (ein Spiel bleibt den ganzen Spieltag stehen). */
function upcomingOnly(list) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  return list
    .filter(f => f.date && f.date >= todayIso)
    .sort((a, b) =>
      a.date.localeCompare(b.date) ||
      (a.time || '99:99').localeCompare(b.time || '99:99') ||
      (a.sort_order || 0) - (b.sort_order || 0));
}

/* ════════════════════════════════════════════════
   API – GENERISCHE COLLECTIONS
════════════════════════════════════════════════ */
const COLLECTIONS = {
  teams:        { fields: ['key','name','tab_label','league','season','claim','description','image','email'], required: ['name'] },
  players:      { fields: ['team_id','name','number','position','photo'],                                     required: ['name'], numeric: ['team_id'] },
  board:        { fields: ['role','name','initials','photo','featured'],                                      required: ['name'], boolean: ['featured'] },
  games:        { fields: ['date','day','month','time','home','away','location','type','league'],             required: ['home','away'] },
  sponsors:     { fields: ['name','logo','url'],                                                              required: ['name'] },
  gallery:      { fields: ['image','alt','span'],                                                             required: ['image'] },
  timeline:     { fields: ['year','title','text'],                                                            required: ['title'] },
  achievements: { fields: ['num','title','sub','icon','featured'],                                            required: ['title'], boolean: ['featured'] },
  stats:        { fields: ['value','label'],                                                                  required: ['label'] }
};

function sanitizeRecord(def, body) {
  const out = {};
  for (const f of def.fields) {
    if (body[f] === undefined) continue;
    if ((def.boolean || []).includes(f))      out[f] = !!body[f];
    else if ((def.numeric || []).includes(f)) out[f] = parseInt(body[f]) || 0;
    else                                      out[f] = String(body[f]);
  }
  out.sort_order = parseInt(body.sort_order) || 0;
  return out;
}

/* ── Spiele: Datum ↔ Tag/Monat ──────────────────────
   Die Startseite sortiert nach echtem Datum, zeigt aber weiterhin
   Tag/Monat auf der Karte. Beide Felder werden daher aus "date"
   mitgepflegt. Fehlt die Spalte noch (Migration nicht eingespielt),
   wird sie stillschweigend weggelassen statt den Speichern-Vorgang
   scheitern zu lassen. */
const MONTH_ABBR = ['Jän','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];

let gamesDateColumn = null;
async function hasGamesDateColumn() {
  if (gamesDateColumn !== null) return gamesDateColumn;
  const { error } = await supabase.from('games').select('date').limit(1);
  gamesDateColumn = !error;
  if (error) console.warn('⚠️  Spalte games.date fehlt – bitte scripts/migration-games-date.sql einspielen.');
  return gamesDateColumn;
}

async function prepareGame(data) {
  const iso = String(data.date || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const d = new Date(iso + 'T00:00:00');
    if (!isNaN(d)) {
      data.day   = String(d.getDate()).padStart(2, '0');
      data.month = MONTH_ABBR[d.getMonth()];
    }
  } else if (data.date !== undefined) {
    data.date = '';
  }
  if (!await hasGamesDateColumn()) delete data.date;
  return data;
}

function collectionGuard(req, res, next) {
  const def = COLLECTIONS[req.params.name];
  if (!def) return res.status(404).json({ error: 'Unbekannte Collection' });
  req.collectionDef = def;
  next();
}

app.get('/api/collections/:name', collectionGuard, async (req, res) => {
  try {
    const rows = (await db.all(req.params.name))
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0) || a.id - b.id);
    res.json(rows);
  } catch (e) { serverError(req, res, e); }
});

app.post('/api/collections/:name', requireAuth, collectionGuard, async (req, res) => {
  try {
    const def  = req.collectionDef;
    const data = sanitizeRecord(def, req.body);
    if (req.params.name === 'games') await prepareGame(data);
    for (const f of def.required || []) {
      if (!String(data[f] ?? '').trim())
        return res.status(400).json({ error: `Feld "${f}" ist erforderlich` });
    }
    data.created_at = data.updated_at = new Date().toISOString();
    res.status(201).json(await db.insert(req.params.name, data));
  } catch (e) { serverError(req, res, e); }
});

app.put('/api/collections/:name/:id', requireAuth, collectionGuard, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!await db.get(req.params.name, id)) return res.status(404).json({ error: 'Nicht gefunden' });
    const data = sanitizeRecord(req.collectionDef, req.body);
    if (req.params.name === 'games') await prepareGame(data);
    data.updated_at = new Date().toISOString();
    res.json(await db.update(req.params.name, id, data));
  } catch (e) { serverError(req, res, e); }
});

app.delete('/api/collections/:name/:id', requireAuth, collectionGuard, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!await db.get(req.params.name, id)) return res.status(404).json({ error: 'Nicht gefunden' });
    await db.delete(req.params.name, id);
    res.json({ success: true });
  } catch (e) { serverError(req, res, e); }
});

/* ════════════════════════════════════════════════
   API – SEITENINHALTE
════════════════════════════════════════════════ */
app.get('/api/pages', async (req, res) => {
  try { res.json(await db.all('pages')); }
  catch (e) { serverError(req, res, e); }
});

app.get('/api/pages/:page', async (req, res) => {
  try {
    res.json((await db.all('pages')).filter(r => r.page === req.params.page));
  } catch (e) { serverError(req, res, e); }
});

app.put('/api/pages/:page/:section', requireAuth, async (req, res) => {
  try {
    const { content } = req.body;
    const { page, section } = req.params;
    if (content === undefined) return res.status(400).json({ error: 'content fehlt' });

    const { data, error } = await supabase
      .from('pages')
      .upsert(
        { page, section, content, updated_at: new Date().toISOString() },
        { onConflict: 'page,section' }
      )
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (e) { serverError(req, res, e); }
});

/* ════════════════════════════════════════════════
   API – ANMELDUNGEN
════════════════════════════════════════════════ */
app.post('/api/anmeldungen', async (req, res) => {
  try {
    const { vorname, nachname, email, geburtsdatum, telefon, position, erfahrung, nachricht, datenschutz, datenschutz_version } = req.body;
    if (!vorname?.trim() || !nachname?.trim() || !email?.trim() || !geburtsdatum) {
      return res.status(400).json({ error: 'Pflichtfelder fehlen' });
    }
    /* DSGVO: ohne ausdrückliche Einwilligung wird nichts gespeichert (Art. 7 DSGVO) */
    if (datenschutz !== true) {
      return res.status(400).json({ error: 'Bitte bestätige die Datenschutzerklärung.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ error: 'Bitte gib eine gültige E-Mail-Adresse an.' });
    }
    /* Datenminimierung: Längen begrenzen, nur die erwarteten Felder übernehmen */
    const clip = (v, n) => String(v || '').trim().slice(0, n);
    const row = await db.insert('registrations', {
      vorname:      clip(vorname, 80),
      nachname:     clip(nachname, 80),
      email:        clip(email, 254),
      telefon:      clip(telefon, 40),
      geburtsdatum,
      position:     clip(position, 60),
      erfahrung:    clip(erfahrung, 2000),
      nachricht:    clip(nachricht, 2000),
      status:       'neu',
      created_at:   new Date().toISOString(),
      /* Nachweis der Einwilligung – Spalten siehe supabase-schema.sql / migrations */
      consent_at:      new Date().toISOString(),
      consent_version: clip(datenschutz_version, 40) || 'unbekannt'
    });
    res.status(201).json({ success: true, id: row.id });
  } catch (e) { serverError(req, res, e); }
});

app.get('/api/anmeldungen', requireAuth, async (req, res) => {
  try {
    const rows = (await db.all('registrations'))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    res.json(rows);
  } catch (e) { serverError(req, res, e); }
});

app.patch('/api/anmeldungen/:id/status', requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status } = req.body;
    if (!['neu', 'bearbeitet'].includes(status)) return res.status(400).json({ error: 'Ungültiger Status' });
    const row = await db.update('registrations', id, { status });
    res.json(row);
  } catch (e) { serverError(req, res, e); }
});

app.delete('/api/anmeldungen/:id', requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete('registrations', id);
    res.json({ success: true });
  } catch (e) { serverError(req, res, e); }
});

/* ════════════════════════════════════════════════
   API – STATISTIKEN
════════════════════════════════════════════════ */
app.get('/api/stats', requireAuth, async (req, res) => {
  try {
    const [news, media, teams, players, games, registrations] = await Promise.all([
      db.all('news'), db.all('media'), db.all('teams'), db.all('players'), db.all('games'), db.all('registrations')
    ]);
    const recent = [...news]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 5)
      .map(n => ({ id: n.id, title: n.title, published: n.published, created_at: n.created_at }));
    res.json({
      newsTotal:            news.length,
      newsPublished:        news.filter(n => n.published).length,
      newsDrafts:           news.filter(n => !n.published).length,
      mediaTotal:           media.length,
      teamsTotal:           teams.length,
      playersTotal:         players.length,
      gamesTotal:           games.length,
      registrationsTotal:   registrations.length,
      registrationsNew:     registrations.filter(r => r.status === 'neu').length,
      recentNews:           recent
    });
  } catch (e) { serverError(req, res, e); }
});

/* ════════════════════════════════════════════════
   STARTUP (async – Supabase benötigt async Init)
════════════════════════════════════════════════ */
async function startup() {
  await require('./seed')(supabase);

  /* Kein fest eingebautes Standardpasswort: der erste Admin wird nur
     angelegt, wenn ADMIN_INITIAL_PASSWORD gesetzt ist. */
  const { count, error: usersError } = await supabase.from('users').select('*', { count: 'exact', head: true });
  const initialPw = process.env.ADMIN_INITIAL_PASSWORD;
  if (usersError) {
    console.warn('⚠️  Benutzertabelle nicht lesbar:', usersError.message);
  } else if (!count && initialPw && initialPw.length >= PW_MIN) {
    const { error } = await supabase.from('users').insert({
      username:      'admin',
      password_hash: await bcrypt.hash(initialPw, 12),
      role:          'admin',
      created_at:    new Date().toISOString()
    });
    if (error) console.warn('⚠️  Admin konnte nicht angelegt werden:', error.message);
    else console.log('✔  Admin "admin" angelegt – ADMIN_INITIAL_PASSWORD jetzt wieder entfernen.\n');
  } else if (!count) {
    console.warn(`⚠️  Kein Admin-Benutzer vorhanden. ADMIN_INITIAL_PASSWORD (mind. ${PW_MIN} Zeichen) setzen und neu starten.\n`);
  }

  app.listen(PORT, () => {
    console.log(`\n🏐  VBC Stainach CMS – powered by Supabase`);
    console.log(`   Website:       http://localhost:${PORT}`);
    console.log(`   Admin-Login:   http://localhost:${PORT}/admin\n`);
  });
}

startup().catch(err => {
  console.error('❌  Startup-Fehler:', err.message);
  process.exit(1);
});
