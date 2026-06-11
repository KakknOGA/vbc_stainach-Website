'use strict';
const express = require('express');
const session = require('express-session');
const bcrypt  = require('bcryptjs');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');

const app  = express();
const PORT = process.env.PORT || 3000;
const ROOT = __dirname;

/* ── Verzeichnisse ──────────────────────────────── */
const DATA_DIR    = path.join(ROOT, 'data');
const UPLOADS_DIR = path.join(ROOT, 'uploads');
for (const dir of [DATA_DIR, UPLOADS_DIR]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

/* ════════════════════════════════════════════════
   DATEI-DATENBANK (pure JSON, keine nativen Module)
════════════════════════════════════════════════ */
function loadDb(name) {
  const file = path.join(DATA_DIR, name + '.json');
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, JSON.stringify({ nextId: 1, records: [] }), 'utf8');
  }
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}
function saveDb(name, data) {
  const file = path.join(DATA_DIR, name + '.json');
  const tmp  = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, file);
}

const db = {
  /* --- Generic CRUD -------------------------------- */
  all(name) { return loadDb(name).records; },

  get(name, id) {
    return loadDb(name).records.find(r => r.id === id) || null;
  },

  insert(name, obj) {
    const store = loadDb(name);
    const record = { ...obj, id: store.nextId++ };
    store.records.push(record);
    saveDb(name, store);
    return record;
  },

  update(name, id, changes) {
    const store = loadDb(name);
    const i = store.records.findIndex(r => r.id === id);
    if (i < 0) return null;
    store.records[i] = { ...store.records[i], ...changes };
    saveDb(name, store);
    return store.records[i];
  },

  delete(name, id) {
    const store = loadDb(name);
    const i = store.records.findIndex(r => r.id === id);
    if (i < 0) return false;
    store.records.splice(i, 1);
    saveDb(name, store);
    return true;
  },

  /* --- Users ---------------------------------------- */
  findUser(username) {
    return loadDb('users').records.find(u => u.username === username) || null;
  },
  getUser(id) { return db.get('users', id); }
};

/* Standard-Admin anlegen falls noch keiner vorhanden */
if (!db.all('users').length) {
  db.insert('users', {
    username:      'admin',
    password_hash: bcrypt.hashSync('admin123', 12),
    role:          'admin',
    created_at:    new Date().toISOString()
  });
  console.log('✔  Standard-Admin angelegt → Benutzer: admin | Passwort: admin123');
  console.log('   Bitte Passwort nach dem ersten Login ändern!\n');
}

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
const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
  filename: (_req, file, cb) => {
    const uid = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uid + path.extname(file.originalname).toLowerCase());
  }
});
const upload = multer({
  storage,
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

/* ── Uploads (public) ───────────────────────────── */
app.use('/uploads', express.static(UPLOADS_DIR));

/* ════════════════════════════════════════════════
   ADMIN-SEITEN  (VOR static definiert → Auth greift)
════════════════════════════════════════════════ */
app.get('/admin', (req, res) => {
  if (req.session?.userId) return res.redirect('/admin/dashboard');
  res.sendFile(path.join(ROOT, 'admin', 'index.html'));
});
app.get('/admin/dashboard', requireAuth, (_req, res) => {
  res.sendFile(path.join(ROOT, 'admin', 'dashboard.html'));
});
/* Direkte .html-URLs → sicher weiterleiten */
app.get('/admin/dashboard.html', (_req, res) => res.redirect('/admin/dashboard'));
app.get('/admin/index.html',     (_req, res) => res.redirect('/admin'));
/* Admin-Assets (CSS/JS) frei zugänglich */
app.use('/admin/css', express.static(path.join(ROOT, 'admin', 'css')));
app.use('/admin/js',  express.static(path.join(ROOT, 'admin', 'js')));

/* ── Public Static Files ────────────────────────── */
app.use(express.static(ROOT, { index: 'index.html' }));

/* ════════════════════════════════════════════════
   API – AUTH
════════════════════════════════════════════════ */
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: 'Benutzername und Passwort erforderlich' });

  const user = db.findUser(username);
  if (!user || !bcrypt.compareSync(password, user.password_hash))
    return res.status(401).json({ error: 'Ungültige Anmeldedaten' });

  req.session.userId   = user.id;
  req.session.username = user.username;
  req.session.role     = user.role;
  res.json({ success: true, username: user.username });
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ username: req.session.username, role: req.session.role });
});

app.post('/api/auth/change-password', requireAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword || newPassword.length < 6)
    return res.status(400).json({ error: 'Neues Passwort muss mindestens 6 Zeichen haben' });

  const user = db.getUser(req.session.userId);
  if (!bcrypt.compareSync(currentPassword, user.password_hash))
    return res.status(401).json({ error: 'Aktuelles Passwort ist falsch' });

  db.update('users', user.id, { password_hash: bcrypt.hashSync(newPassword, 12) });
  res.json({ success: true });
});

/* ════════════════════════════════════════════════
   API – NEWS
════════════════════════════════════════════════ */
app.get('/api/news', (req, res) => {
  const onlyPublished = req.query.published === '1';
  const isAdmin       = !!req.session?.userId;
  let news = db.all('news');
  if (onlyPublished || !isAdmin) news = news.filter(n => n.published);
  news.sort((a, b) => new Date(b.publish_date || b.created_at) - new Date(a.publish_date || a.created_at));
  res.json(news);
});

app.get('/api/news/:id', (req, res) => {
  const row = db.get('news', parseInt(req.params.id));
  if (!row) return res.status(404).json({ error: 'Nicht gefunden' });
  res.json(row);
});

app.post('/api/news', requireAuth, (req, res) => {
  const { title, description, content, image_url, tag, published, publish_date } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: 'Titel ist erforderlich' });
  const now = new Date().toISOString();
  const row = db.insert('news', {
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
});

app.put('/api/news/:id', requireAuth, (req, res) => {
  const { title, description, content, image_url, tag, published, publish_date } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: 'Titel ist erforderlich' });
  const id  = parseInt(req.params.id);
  if (!db.get('news', id)) return res.status(404).json({ error: 'Nicht gefunden' });
  const row = db.update('news', id, {
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
});

app.delete('/api/news/:id', requireAuth, (req, res) => {
  const id = parseInt(req.params.id);
  if (!db.get('news', id)) return res.status(404).json({ error: 'Nicht gefunden' });
  db.delete('news', id);
  res.json({ success: true });
});

/* ════════════════════════════════════════════════
   API – MEDIEN
════════════════════════════════════════════════ */
app.get('/api/media', requireAuth, (_req, res) => {
  const media = db.all('media').sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
  res.json(media);
});

app.post('/api/media', requireAuth, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Keine gültige Bilddatei' });
  const row = db.insert('media', {
    filename:      req.file.filename,
    original_name: req.file.originalname,
    file_url:      '/uploads/' + req.file.filename,
    file_size:     req.file.size,
    mime_type:     req.file.mimetype,
    created_at:    new Date().toISOString()
  });
  res.status(201).json(row);
});

app.delete('/api/media/:id', requireAuth, (req, res) => {
  const id  = parseInt(req.params.id);
  const row = db.get('media', id);
  if (!row) return res.status(404).json({ error: 'Nicht gefunden' });
  const fp  = path.join(UPLOADS_DIR, row.filename);
  if (fs.existsSync(fp)) fs.unlinkSync(fp);
  db.delete('media', id);
  res.json({ success: true });
});

/* ════════════════════════════════════════════════
   API – SEITENINHALTE
════════════════════════════════════════════════ */
app.get('/api/pages', (_req, res) => {
  res.json(db.all('pages'));
});

app.get('/api/pages/:page', (req, res) => {
  res.json(db.all('pages').filter(r => r.page === req.params.page));
});

app.put('/api/pages/:page/:section', requireAuth, (req, res) => {
  const { content } = req.body;
  const { page, section } = req.params;
  if (content === undefined) return res.status(400).json({ error: 'content fehlt' });

  const existing = db.all('pages').find(r => r.page === page && r.section === section);
  if (existing) {
    const updated = db.update('pages', existing.id, { content, updated_at: new Date().toISOString() });
    return res.json(updated);
  }
  const row = db.insert('pages', { page, section, content, updated_at: new Date().toISOString() });
  res.json(row);
});

/* ════════════════════════════════════════════════
   API – STATISTIKEN
════════════════════════════════════════════════ */
app.get('/api/stats', requireAuth, (_req, res) => {
  const news    = db.all('news');
  const recent  = [...news]
    .sort((a,b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0,5)
    .map(n => ({ id: n.id, title: n.title, published: n.published, created_at: n.created_at }));
  res.json({
    newsTotal:     news.length,
    newsPublished: news.filter(n => n.published).length,
    newsDrafts:    news.filter(n => !n.published).length,
    mediaTotal:    db.all('media').length,
    recentNews:    recent
  });
});

/* ── Server starten ─────────────────────────────── */
app.listen(PORT, () => {
  console.log(`\n🏐  VBC Stainach CMS`);
  console.log(`   Website:       http://localhost:${PORT}`);
  console.log(`   Admin-Login:   http://localhost:${PORT}/admin\n`);
});
