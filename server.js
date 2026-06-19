'use strict';
require('dotenv').config();

const express  = require('express');
const session  = require('express-session');
const bcrypt   = require('bcryptjs');
const multer   = require('multer');
const path     = require('path');
const supabase = require('./lib/supabase');

const app  = express();
const PORT = process.env.PORT || 3000;
const ROOT = __dirname;

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

  async getUser(id) { return this.get('users', id); }
};

/* ── Middleware ─────────────────────────────────── */
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

app.use(session({
  secret: process.env.SESSION_SECRET || 'vbc-stainach-cms-secret-2025',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production'
  }
}));

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
const requireAuth = (req, res, next) => {
  if (req.session?.userId) return next();
  if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'Nicht angemeldet' });
  res.redirect('/admin');
};


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
app.use(express.static(ROOT, { index: 'index.html' }));

/* ════════════════════════════════════════════════
   API – AUTH
════════════════════════════════════════════════ */
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ error: 'Benutzername und Passwort erforderlich' });

    const user = await db.findUser(username);
    if (!user || !bcrypt.compareSync(password, user.password_hash))
      return res.status(401).json({ error: 'Ungültige Anmeldedaten' });

    req.session.userId   = user.id;
    req.session.username = user.username;
    req.session.role     = user.role;
    res.json({ success: true, username: user.username });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ username: req.session.username, role: req.session.role });
});

app.post('/api/auth/change-password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword || newPassword.length < 6)
      return res.status(400).json({ error: 'Neues Passwort muss mindestens 6 Zeichen haben' });

    const user = await db.getUser(req.session.userId);
    if (!bcrypt.compareSync(currentPassword, user.password_hash))
      return res.status(401).json({ error: 'Aktuelles Passwort ist falsch' });

    await db.update('users', user.id, { password_hash: bcrypt.hashSync(newPassword, 12) });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
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
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/news/:id', async (req, res) => {
  try {
    const row = await db.get('news', parseInt(req.params.id));
    if (!row) return res.status(404).json({ error: 'Nicht gefunden' });
    res.json(row);
  } catch (e) { res.status(500).json({ error: e.message }); }
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
  } catch (e) { res.status(500).json({ error: e.message }); }
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
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/news/:id', requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!await db.get('news', id)) return res.status(404).json({ error: 'Nicht gefunden' });
    await db.delete('news', id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/* ════════════════════════════════════════════════
   API – MEDIEN
════════════════════════════════════════════════ */
app.get('/api/media', requireAuth, async (_req, res) => {
  try {
    const media = (await db.all('media')).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    res.json(media);
  } catch (e) { res.status(500).json({ error: e.message }); }
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
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/media/:id', requireAuth, async (req, res) => {
  try {
    const id  = parseInt(req.params.id);
    const row = await db.get('media', id);
    if (!row) return res.status(404).json({ error: 'Nicht gefunden' });
    await supabase.storage.from('media').remove([row.filename]);
    await db.delete('media', id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/* ════════════════════════════════════════════════
   API – GENERISCHE COLLECTIONS
════════════════════════════════════════════════ */
const COLLECTIONS = {
  teams:        { fields: ['key','name','tab_label','league','season','claim','description','image','email'], required: ['name'] },
  players:      { fields: ['team_id','name','number','position','photo'],                                     required: ['name'], numeric: ['team_id'] },
  board:        { fields: ['role','name','initials','photo','featured'],                                      required: ['name'], boolean: ['featured'] },
  games:        { fields: ['day','month','time','home','away','location','type','league'],                    required: ['home','away'] },
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
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/collections/:name', requireAuth, collectionGuard, async (req, res) => {
  try {
    const def  = req.collectionDef;
    const data = sanitizeRecord(def, req.body);
    for (const f of def.required || []) {
      if (!String(data[f] ?? '').trim())
        return res.status(400).json({ error: `Feld "${f}" ist erforderlich` });
    }
    data.created_at = data.updated_at = new Date().toISOString();
    res.status(201).json(await db.insert(req.params.name, data));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/collections/:name/:id', requireAuth, collectionGuard, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!await db.get(req.params.name, id)) return res.status(404).json({ error: 'Nicht gefunden' });
    const data = sanitizeRecord(req.collectionDef, req.body);
    data.updated_at = new Date().toISOString();
    res.json(await db.update(req.params.name, id, data));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/collections/:name/:id', requireAuth, collectionGuard, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!await db.get(req.params.name, id)) return res.status(404).json({ error: 'Nicht gefunden' });
    await db.delete(req.params.name, id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/* ════════════════════════════════════════════════
   API – SEITENINHALTE
════════════════════════════════════════════════ */
app.get('/api/pages', async (_req, res) => {
  try { res.json(await db.all('pages')); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/pages/:page', async (req, res) => {
  try {
    res.json((await db.all('pages')).filter(r => r.page === req.params.page));
  } catch (e) { res.status(500).json({ error: e.message }); }
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
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/* ════════════════════════════════════════════════
   API – ANMELDUNGEN
════════════════════════════════════════════════ */
app.post('/api/anmeldungen', async (req, res) => {
  try {
    const { vorname, nachname, email, geburtsdatum, telefon, position, erfahrung, nachricht } = req.body;
    if (!vorname?.trim() || !nachname?.trim() || !email?.trim() || !geburtsdatum) {
      return res.status(400).json({ error: 'Pflichtfelder fehlen' });
    }
    const row = await db.insert('registrations', {
      vorname:      vorname.trim(),
      nachname:     nachname.trim(),
      email:        email.trim(),
      telefon:      (telefon || '').trim(),
      geburtsdatum,
      position:     (position || '').trim(),
      erfahrung:    (erfahrung || '').trim(),
      nachricht:    (nachricht || '').trim(),
      status:       'neu',
      created_at:   new Date().toISOString()
    });
    res.status(201).json({ success: true, id: row.id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/anmeldungen', requireAuth, async (_req, res) => {
  try {
    const rows = (await db.all('registrations'))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/anmeldungen/:id/status', requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status } = req.body;
    if (!['neu', 'bearbeitet'].includes(status)) return res.status(400).json({ error: 'Ungültiger Status' });
    const row = await db.update('registrations', id, { status });
    res.json(row);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/anmeldungen/:id', requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete('registrations', id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/* ════════════════════════════════════════════════
   API – STATISTIKEN
════════════════════════════════════════════════ */
app.get('/api/stats', requireAuth, async (_req, res) => {
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
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/* ════════════════════════════════════════════════
   STARTUP (async – Supabase benötigt async Init)
════════════════════════════════════════════════ */
async function startup() {
  await require('./seed')(supabase);

  const { count } = await supabase.from('users').select('*', { count: 'exact', head: true });
  if (!count) {
    await supabase.from('users').insert({
      username:      'admin',
      password_hash: bcrypt.hashSync('admin123', 12),
      role:          'admin',
      created_at:    new Date().toISOString()
    });
    console.log('✔  Standard-Admin angelegt → Benutzer: admin | Passwort: admin123');
    console.log('   Bitte Passwort nach dem ersten Login ändern!\n');
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
