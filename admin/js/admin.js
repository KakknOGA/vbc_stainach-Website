/* ═══════════════════════════════════════════════
   VBC Stainach – Admin CMS JavaScript
═══════════════════════════════════════════════ */
'use strict';

/* ── State ──────────────────────────────────── */
const state = {
  view:         'dashboard',
  news:         [],
  media:        [],
  pages:        {},
  editingNews:  null,
  theme:        localStorage.getItem('adminTheme') || 'dark',
  username:     '',
  searchQuery:  ''
};

/* ── Init ───────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
  applyTheme(state.theme);
  await checkAuth();
  setupNav();
  setupTopbar();
  setupSidebar();
  loadView('dashboard');
});

/* ── Auth ───────────────────────────────────── */
async function checkAuth() {
  try {
    const r = await api('GET', '/api/auth/me');
    state.username = r.username;
    document.getElementById('sidebarUsername').textContent = r.username;
    document.getElementById('sidebarAvatar').textContent   = r.username[0].toUpperCase();
  } catch {
    window.location.href = '/admin';
  }
}

/* ── Theme ──────────────────────────────────── */
function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  const btn = document.getElementById('themeBtn');
  if (btn) btn.textContent = t === 'dark' ? '☀️' : '🌙';
  localStorage.setItem('adminTheme', t);
  state.theme = t;
}

/* ── Navigation ─────────────────────────────── */
function setupNav() {
  document.querySelectorAll('[data-view]').forEach(el => {
    el.addEventListener('click', () => {
      const v = el.getAttribute('data-view');
      loadView(v);
      closeSidebar();
    });
  });
}

function loadView(view) {
  state.view = view;
  state.searchQuery = '';
  document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('[data-view]').forEach(el => {
    el.classList.toggle('active', el.getAttribute('data-view') === view);
  });
  /* Alle col-* Views teilen sich das generische Element #view-collection */
  const targetId = view.startsWith('col-') ? 'view-collection' : 'view-' + view;
  const target = document.getElementById(targetId);
  if (target) target.classList.add('active');
  updateTopbarTitle(view);

  if (view.startsWith('col-')) { showCollectionView(view.slice(4)); return; }

  switch (view) {
    case 'dashboard': loadDashboard(); break;
    case 'news':      loadNewsList();  break;
    case 'news-form': showNewsForm(state.editingNews); break;
    case 'media':     loadMedia();     break;
    case 'pages':     loadPages();     break;
    case 'preview':   loadPreview();   break;
    case 'settings':  /* static */     break;
  }
}

const viewTitles = {
  dashboard:   ['Dashboard', 'Willkommen im Admin-Bereich'],
  news:        ['Neuigkeiten', 'Alle News-Beiträge verwalten'],
  'news-form': ['News-Beitrag', 'Beitrag erstellen / bearbeiten'],
  media:       ['Medienbibliothek', 'Bilder hochladen und verwalten'],
  pages:       ['Seiten & Texte', 'Texte der Website bearbeiten'],
  preview:     ['Live-Vorschau', 'Website mit aktuellen Inhalten'],
  settings:    ['Einstellungen', 'Passwort und Account verwalten']
};
function updateTopbarTitle(view) {
  let title, sub;
  if (view.startsWith('col-')) {
    const def = COLLECTION_DEFS[view.slice(4)];
    title = def ? def.label : '';
    sub   = def ? def.sub   : '';
  } else {
    [title, sub] = viewTitles[view] || ['', ''];
  }
  const el = document.getElementById('topbarTitle');
  const se = document.getElementById('topbarSub');
  if (el) el.textContent = title;
  if (se) se.textContent = sub;
}

/* ── Topbar ─────────────────────────────────── */
function setupTopbar() {
  document.getElementById('themeBtn')?.addEventListener('click', () => {
    applyTheme(state.theme === 'dark' ? 'light' : 'dark');
  });
  document.getElementById('logoutBtn')?.addEventListener('click', logout);
  document.getElementById('topbarSearch')?.addEventListener('input', e => {
    state.searchQuery = e.target.value;
    if (state.view === 'news') filterNewsList();
    if (state.view === 'media') filterMediaGrid();
    if (state.view.startsWith('col-')) filterColTable();
  });
}

/* ── Sidebar Mobile ─────────────────────────── */
function setupSidebar() {
  document.getElementById('hamburgerBtn')?.addEventListener('click', openSidebar);
  document.getElementById('sidebarOverlay')?.addEventListener('click', closeSidebar);
}
function openSidebar() {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('sidebarOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('open');
  document.body.style.overflow = '';
}

/* ── API Helper ─────────────────────────────── */
async function api(method, url, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin'
  };
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(url, opts);
  if (r.status === 401) { window.location.href = '/admin'; throw new Error('Nicht angemeldet'); }
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error || 'Fehler'); }
  return r.json();
}
async function apiForm(method, url, formData) {
  const opts = { method, credentials: 'same-origin', body: formData };
  const r = await fetch(url, opts);
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error || 'Upload fehlgeschlagen'); }
  return r.json();
}

/* ── Logout ─────────────────────────────────── */
async function logout() {
  await fetch('/api/auth/logout', { method: 'POST' });
  window.location.href = '/admin';
}

/* ════════════════════════════════════════════
   DASHBOARD
════════════════════════════════════════════ */
async function loadDashboard() {
  try {
    const stats = await api('GET', '/api/stats');
    renderDashboard(stats);
  } catch(e) { showToast(e.message, 'error'); }
}

function renderDashboard(s) {
  document.getElementById('statNewsTotal').textContent     = s.newsTotal;
  document.getElementById('statNewsPublished').textContent = s.newsPublished;
  document.getElementById('statNewsDrafts').textContent    = s.newsDrafts;
  document.getElementById('statMedia').textContent         = s.mediaTotal;

  const ul = document.getElementById('activityList');
  if (!ul) return;
  if (!s.recentNews.length) {
    ul.innerHTML = '<li class="activity-item"><div class="activity-text" style="color:var(--text-muted)">Noch keine Beiträge vorhanden.</div></li>';
    return;
  }
  ul.innerHTML = s.recentNews.map(n => `
    <li class="activity-item">
      <div class="activity-dot"></div>
      <div>
        <div class="activity-text">${escHtml(n.title)}</div>
        <div class="activity-time">${n.published ? '✅ Veröffentlicht' : '📝 Entwurf'} · ${fmtDate(n.created_at)}</div>
      </div>
    </li>
  `).join('');
}

/* ════════════════════════════════════════════
   NEWS – List
════════════════════════════════════════════ */
async function loadNewsList() {
  const tbody = document.getElementById('newsTableBody');
  tbody.innerHTML = skeletonRows(5, 5);
  try {
    state.news = await api('GET', '/api/news');
    renderNewsList(state.news);
  } catch(e) { showToast(e.message, 'error'); }
}

function renderNewsList(list) {
  const tbody = document.getElementById('newsTableBody');
  const q = state.searchQuery.toLowerCase();
  const filtered = q ? list.filter(n =>
    n.title.toLowerCase().includes(q) || (n.description || '').toLowerCase().includes(q)
  ) : list;

  document.getElementById('newsCount').textContent = filtered.length + ' Beiträge';

  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="5">
      <div class="empty-state">
        <div class="empty-icon">📰</div>
        <div class="empty-title">Keine Beiträge gefunden</div>
        <div class="empty-desc">${q ? 'Keine Treffer für „' + escHtml(q) + '"' : 'Erstellen Sie Ihren ersten News-Beitrag.'}</div>
      </div>
    </td></tr>`;
    return;
  }
  tbody.innerHTML = filtered.map(n => `
    <tr>
      <td>
        ${n.image_url
          ? `<img class="td-img" src="${escHtml(n.image_url)}" alt="" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
          : ''}
        <div class="td-img-placeholder" style="${n.image_url ? 'display:none' : ''}">📰</div>
      </td>
      <td class="td-title">
        <strong>${escHtml(n.title)}</strong>
        <small>${escHtml((n.description||'').slice(0,60))}${(n.description||'').length>60?'…':''}</small>
      </td>
      <td><span class="tag-chip">${escHtml(n.tag||'')}</span></td>
      <td>
        ${n.published
          ? '<span class="badge badge-success">✓ Veröffentlicht</span>'
          : '<span class="badge badge-warning">✎ Entwurf</span>'}
      </td>
      <td>${fmtDateShort(n.publish_date || n.created_at)}</td>
      <td class="td-actions">
        <button class="btn btn-secondary btn-sm" onclick="editNews(${n.id})">✎ Bearbeiten</button>
        <button class="btn btn-danger btn-sm" onclick="confirmDeleteNews(${n.id},'${escHtml(n.title)}')">🗑</button>
      </td>
    </tr>
  `).join('');
}

function filterNewsList() { renderNewsList(state.news); }

/* ════════════════════════════════════════════
   NEWS – Form (Create / Edit)
════════════════════════════════════════════ */
function newNews() {
  state.editingNews = null;
  loadView('news-form');
}

async function editNews(id) {
  try {
    state.editingNews = await api('GET', '/api/news/' + id);
    loadView('news-form');
  } catch(e) { showToast(e.message, 'error'); }
}

function showNewsForm(news) {
  const title    = document.getElementById('nfTitle');
  const tag      = document.getElementById('nfTag');
  const desc     = document.getElementById('nfDesc');
  const content  = document.getElementById('nfContent');
  const date     = document.getElementById('nfDate');
  const toggle   = document.getElementById('publishToggle');
  const imgUrl   = document.getElementById('nfImgUrl');
  const preview  = document.getElementById('nfImgPreview');
  const hdr      = document.getElementById('newsFormHeader');

  if (!title) return;

  if (news) {
    hdr.textContent    = 'Beitrag bearbeiten';
    title.value        = news.title || '';
    tag.value          = news.tag   || 'Vereinsnews';
    desc.value         = news.description || '';
    content.value      = news.content || '';
    date.value         = (news.publish_date || '').split('T')[0] || today();
    toggle.classList.toggle('on', !!news.published);
    imgUrl.value       = news.image_url || '';
    updateImgPreview(news.image_url || '');
  } else {
    hdr.textContent = 'Neuer Beitrag';
    title.value = tag.value = desc.value = content.value = imgUrl.value = '';
    date.value  = today();
    toggle.classList.add('on');
    clearImgPreview();
  }
}

function setupNewsForm() {
  /* Image tabs */
  document.querySelectorAll('.image-tab').forEach(t => {
    t.addEventListener('click', () => {
      const tab = t.dataset.tab;
      document.querySelectorAll('.image-tab').forEach(x => x.classList.remove('active'));
      t.classList.add('active');
      document.getElementById('imgTabUrl').style.display    = tab === 'url'    ? '' : 'none';
      document.getElementById('imgTabUpload').style.display = tab === 'upload' ? '' : 'none';
      document.getElementById('imgTabLib').style.display    = tab === 'lib'    ? '' : 'none';
    });
  });

  /* URL input live preview */
  document.getElementById('nfImgUrl')?.addEventListener('input', e => {
    updateImgPreview(e.target.value.trim());
  });

  /* File upload zone */
  const zone = document.getElementById('newsUploadZone');
  const inp  = document.getElementById('newsFileInput');
  if (zone && inp) {
    zone.addEventListener('click', () => inp.click());
    zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
    zone.addEventListener('drop', e => {
      e.preventDefault(); zone.classList.remove('drag-over');
      if (e.dataTransfer.files[0]) uploadNewsImage(e.dataTransfer.files[0]);
    });
    inp.addEventListener('change', () => { if (inp.files[0]) uploadNewsImage(inp.files[0]); });
  }

  /* Published toggle */
  document.getElementById('publishToggle')?.addEventListener('click', function() {
    this.classList.toggle('on');
  });

  /* Remove preview image */
  document.getElementById('nfImgRemove')?.addEventListener('click', () => {
    document.getElementById('nfImgUrl').value = '';
    clearImgPreview();
  });

  /* Save */
  document.getElementById('newsFormSave')?.addEventListener('click', saveNews);
  document.getElementById('newsFormCancel')?.addEventListener('click', () => loadView('news'));
  document.getElementById('newsFormPreview')?.addEventListener('click', previewNews);

  /* Char count */
  document.getElementById('nfDesc')?.addEventListener('input', function() {
    const c = document.getElementById('descCount');
    if (c) c.textContent = this.value.length;
  });
}

function updateImgPreview(url) {
  const wrap = document.getElementById('nfPreviewWrap');
  const img  = document.getElementById('nfImgPreview');
  if (!url) { if (wrap) wrap.style.display = 'none'; return; }
  if (img)  { img.src = url; img.onerror = () => { wrap.style.display = 'none'; }; }
  if (wrap) wrap.style.display = 'inline-block';
}
function clearImgPreview() {
  const wrap = document.getElementById('nfPreviewWrap');
  if (wrap) wrap.style.display = 'none';
}

async function uploadNewsImage(file) {
  const fd = new FormData();
  fd.append('file', file);
  try {
    const r = await apiForm('POST', '/api/media', fd);
    document.getElementById('nfImgUrl').value = r.file_url;
    updateImgPreview(r.file_url);
    showToast('Bild hochgeladen', 'success');
    /* Switch to URL tab so user sees the result */
    document.querySelectorAll('.image-tab')[0]?.click();
  } catch(e) { showToast(e.message, 'error'); }
}

async function saveNews() {
  const title   = document.getElementById('nfTitle').value.trim();
  const tag     = document.getElementById('nfTag').value;
  const desc    = document.getElementById('nfDesc').value;
  const content = document.getElementById('nfContent').value;
  const date    = document.getElementById('nfDate').value;
  const pub     = document.getElementById('publishToggle').classList.contains('on');
  const imgUrl  = document.getElementById('nfImgUrl').value.trim();

  if (!title) { showToast('Titel ist erforderlich', 'error'); return; }

  const body = { title, tag, description: desc, content, image_url: imgUrl,
                 published: pub, publish_date: date };
  const btn  = document.getElementById('newsFormSave');
  btn.disabled = true; btn.textContent = 'Wird gespeichert…';

  try {
    if (state.editingNews) {
      await api('PUT', '/api/news/' + state.editingNews.id, body);
      showToast('Beitrag aktualisiert', 'success');
    } else {
      await api('POST', '/api/news', body);
      showToast('Beitrag erstellt', 'success');
    }
    state.editingNews = null;
    loadView('news');
  } catch(e) {
    showToast(e.message, 'error');
  } finally {
    btn.disabled = false; btn.textContent = '💾 Speichern';
  }
}

function previewNews() {
  const title   = document.getElementById('nfTitle').value || '(Kein Titel)';
  const desc    = document.getElementById('nfDesc').value  || '';
  const content = document.getElementById('nfContent').value || '';
  const tag     = document.getElementById('nfTag').value || '';
  const imgUrl  = document.getElementById('nfImgUrl').value || '';
  const date    = document.getElementById('nfDate').value || today();

  document.getElementById('previewTitle').textContent   = title;
  document.getElementById('previewTag').textContent     = tag;
  document.getElementById('previewDate').textContent    = fmtDateShort(date);
  document.getElementById('previewDesc').textContent    = desc;
  document.getElementById('previewContent').innerHTML   = content.replace(/\n/g, '<br>');
  const pImg = document.getElementById('previewImg');
  pImg.src   = imgUrl || '';
  pImg.style.display = imgUrl ? 'block' : 'none';

  openModal('previewModal');
}

/* ── Confirm / Delete News ───────────────────── */
function confirmDeleteNews(id, title) {
  document.getElementById('confirmMsg').textContent = `Beitrag „${title}" wirklich löschen?`;
  document.getElementById('confirmOk').onclick = async () => {
    closeModal('confirmModal');
    try {
      await api('DELETE', '/api/news/' + id);
      state.news = state.news.filter(n => n.id !== id);
      renderNewsList(state.news);
      showToast('Beitrag gelöscht', 'success');
    } catch(e) { showToast(e.message, 'error'); }
  };
  openModal('confirmModal');
}

/* ════════════════════════════════════════════
   MEDIA
════════════════════════════════════════════ */
async function loadMedia() {
  const grid = document.getElementById('mediaGrid');
  grid.innerHTML = '<div style="padding:1rem;color:var(--text-muted)">Wird geladen…</div>';
  try {
    state.media = await api('GET', '/api/media');
    renderMediaGrid(state.media);
  } catch(e) { showToast(e.message, 'error'); }
}

function renderMediaGrid(list) {
  const grid = document.getElementById('mediaGrid');
  const q    = state.searchQuery.toLowerCase();
  const items = q ? list.filter(m => m.original_name.toLowerCase().includes(q)) : list;

  document.getElementById('mediaCount').textContent = items.length + ' Dateien';

  if (!items.length) {
    grid.innerHTML = `<div class="empty-state">
      <div class="empty-icon">🖼️</div>
      <div class="empty-title">${q ? 'Keine Treffer' : 'Keine Bilder vorhanden'}</div>
      <div class="empty-desc">${q ? '' : 'Laden Sie Ihr erstes Bild hoch.'}</div>
    </div>`;
    return;
  }
  grid.innerHTML = items.map(m => `
    <div class="media-item" id="media-${m.id}">
      <img class="media-thumb" src="${escHtml(m.file_url)}" alt="${escHtml(m.original_name)}" loading="lazy"
           onerror="this.style.background='var(--bg-alt)';this.style.objectFit='contain'">
      <div class="media-info">
        <div class="media-name" title="${escHtml(m.original_name)}">${escHtml(m.original_name)}</div>
        <div class="media-size">${fmtSize(m.file_size)}</div>
      </div>
      <div class="media-actions">
        <button class="btn btn-secondary btn-sm" style="flex:1" onclick="copyUrl('${escHtml(m.file_url)}')">📋 URL</button>
        <button class="btn btn-danger btn-sm btn-icon" onclick="confirmDeleteMedia(${m.id},'${escHtml(m.original_name)}')">🗑</button>
      </div>
    </div>
  `).join('');
}

function filterMediaGrid() { renderMediaGrid(state.media); }

function setupMediaUpload() {
  const zone = document.getElementById('mediaUploadZone');
  const inp  = document.getElementById('mediaFileInput');
  if (!zone || !inp) return;

  zone.addEventListener('click', () => inp.click());
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', e => {
    e.preventDefault(); zone.classList.remove('drag-over');
    [...e.dataTransfer.files].forEach(f => uploadMedia(f));
  });
  inp.addEventListener('change', () => {
    [...inp.files].forEach(f => uploadMedia(f));
    inp.value = '';
  });
}

async function uploadMedia(file) {
  const fd = new FormData();
  fd.append('file', file);
  try {
    const m = await apiForm('POST', '/api/media', fd);
    state.media.unshift(m);
    renderMediaGrid(state.media);
    showToast(`${file.name} hochgeladen`, 'success');
  } catch(e) { showToast(e.message, 'error'); }
}

function copyUrl(url) {
  const full = window.location.origin + url;
  navigator.clipboard.writeText(full).then(
    () => showToast('URL kopiert', 'success'),
    () => {
      const ta = document.createElement('textarea');
      ta.value = full; document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); document.body.removeChild(ta);
      showToast('URL kopiert', 'success');
    }
  );
}

function confirmDeleteMedia(id, name) {
  document.getElementById('confirmMsg').textContent = `Bild „${name}" wirklich löschen?`;
  document.getElementById('confirmOk').onclick = async () => {
    closeModal('confirmModal');
    try {
      await api('DELETE', '/api/media/' + id);
      state.media = state.media.filter(m => m.id !== id);
      renderMediaGrid(state.media);
      showToast('Bild gelöscht', 'success');
    } catch(e) { showToast(e.message, 'error'); }
  };
  openModal('confirmModal');
}

/* ════════════════════════════════════════════
   PAGE CONTENT
════════════════════════════════════════════ */
const PAGE_DEFS = [
  { key: 'startseite', label: '🏠 Startseite (index.html)', sections: [
    { key: 'hero_title',       label: 'Hero-Überschrift',         hint: 'Große Überschrift im Header-Bereich (Zeilenumbruch = neue Zeile)' },
    { key: 'teams_intro',      label: 'Teams – Einleitung',       hint: 'Text unter der Überschrift "Unsere Teams"' },
    { key: 'sponsors_intro',   label: 'Sponsoren – Einleitung',   hint: 'Text unter "Sponsoren & Partner"' },
    { key: 'about_title',      label: 'Über uns – Überschrift',   hint: 'Überschrift im Abschnitt "Über den Verein"' },
    { key: 'about_text1',      label: 'Über uns – Absatz 1',      hint: 'Erster Absatz im "Über uns"-Abschnitt' },
    { key: 'about_text2',      label: 'Über uns – Absatz 2',      hint: 'Zweiter Absatz im "Über uns"-Abschnitt' },
    { key: 'history_title',    label: 'Geschichte – Überschrift', hint: 'Überschrift im Abschnitt "Unsere Geschichte"' },
    { key: 'history_text1',    label: 'Geschichte – Absatz 1',    hint: 'Erster Absatz der Vereinsgeschichte' },
    { key: 'history_text2',    label: 'Geschichte – Absatz 2',    hint: 'Zweiter Absatz der Vereinsgeschichte' },
    { key: 'history_text3',    label: 'Geschichte – Absatz 3',    hint: 'Dritter Absatz der Vereinsgeschichte' },
    { key: 'gallery_intro',    label: 'Galerie – Einleitung',     hint: 'Text unter "Bilder unserer Spiele"' },
    { key: 'kontakt_intro',    label: 'Kontakt – Einleitung',     hint: 'Text unter "Nimm Kontakt auf"' },
    { key: 'contact_email',    label: 'Allgemeine E-Mail',        hint: 'Allgemeine Kontakt-E-Mail-Adresse' },
    { key: 'contact_address',  label: 'Adresse',                  hint: 'Vereinsadresse im Kontaktbereich' },
    { key: 'contact_training', label: 'Trainingszeiten',          hint: 'Text zu den Trainingszeiten' },
    { key: 'footer_tagline',   label: 'Footer-Slogan',            hint: 'Kurzer Text im Seitenfuß' },
    { key: 'news_intro',       label: 'Neuigkeiten – Einleitung', hint: 'Text unter "Neuigkeiten" auf der Startseite' },
  ]},
  { key: 'teams', label: '👥 Teams (team.html)', sections: [
    { key: 'page_title', label: 'Seitenüberschrift', hint: 'Titel der Team-Seite' },
    { key: 'page_sub',   label: 'Untertitel',        hint: 'Text unter der Seitenüberschrift' },
  ]},
];

async function loadPages() {
  try {
    const rows = await api('GET', '/api/pages');
    state.pages = {};
    rows.forEach(r => { state.pages[r.page + ':' + r.section] = r.content; });
    renderPages('startseite');
  } catch(e) { showToast(e.message, 'error'); }
}

function renderPageNav(activePage) {
  const nav = document.getElementById('pageNavList');
  if (!nav) return;
  nav.innerHTML = PAGE_DEFS.map(p => `
    <div class="page-nav-item ${p.key === activePage ? 'active' : ''}" onclick="renderPages('${p.key}')">
      <span class="page-nav-icon">${p.label.split(' ')[0]}</span>
      ${p.label.split(' ').slice(1).join(' ')}
    </div>
  `).join('');
}

function renderPages(pageKey) {
  renderPageNav(pageKey);
  const def = PAGE_DEFS.find(p => p.key === pageKey);
  if (!def) return;
  const list = document.getElementById('sectionsList');
  if (!list) return;

  list.innerHTML = def.sections.map(s => {
    const val = state.pages[pageKey + ':' + s.key] || '';
    return `
      <div class="section-editor">
        <div class="section-editor-header">
          <h4>${escHtml(s.label)}</h4>
          <span class="section-saved" id="saved-${pageKey}-${s.key}">✓ Gespeichert</span>
        </div>
        <div class="section-editor-body">
          <p class="form-hint" style="margin-bottom:.75rem">${escHtml(s.hint)}</p>
          <textarea class="form-textarea" id="sec-${pageKey}-${s.key}"
            placeholder="${escHtml(s.label)}…" rows="4">${escHtml(val)}</textarea>
          <div style="margin-top:.75rem;text-align:right">
            <button class="btn btn-primary btn-sm"
              onclick="saveSection('${pageKey}','${s.key}')">💾 Speichern</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

async function saveSection(page, section) {
  const ta = document.getElementById(`sec-${page}-${section}`);
  if (!ta) return;
  try {
    await api('PUT', `/api/pages/${page}/${section}`, { content: ta.value });
    state.pages[page + ':' + section] = ta.value;
    const saved = document.getElementById(`saved-${page}-${section}`);
    if (saved) { saved.classList.add('show'); setTimeout(() => saved.classList.remove('show'), 2500); }
    showToast('Inhalt gespeichert', 'success');
  } catch(e) { showToast(e.message, 'error'); }
}

/* ════════════════════════════════════════════
   GENERISCHE COLLECTIONS (Teams, Spieler, …)
   Eine Engine, viele Datentypen: COLLECTION_DEFS
   beschreibt Spalten + Formularfelder, der Rest
   ist für alle Collections identisch.
════════════════════════════════════════════ */
const COLLECTION_DEFS = {
  teams: {
    label: 'Teams', icon: '🏐', sub: 'Mannschaften und Ligen verwalten',
    searchKeys: ['name', 'league'],
    columns: [
      { key: 'image', label: 'Bild', type: 'image' },
      { key: 'name', label: 'Name' },
      { key: 'league', label: 'Liga' },
      { key: 'email', label: 'Kontakt-E-Mail' }
    ],
    fields: [
      { key: 'name',        label: 'Name',                    type: 'text', required: true, hint: 'z. B. Herren 1' },
      { key: 'tab_label',   label: 'Bezeichnung (Team-Seite)',type: 'text',  hint: 'z. B. 1. Mannschaft Herren' },
      { key: 'key',         label: 'Technischer Schlüssel',   type: 'text',  hint: 'Kurzname ohne Leerzeichen, z. B. herren1' },
      { key: 'league',      label: 'Liga',                    type: 'text' },
      { key: 'season',      label: 'Saison',                  type: 'text',  hint: 'z. B. Saison 2025/26' },
      { key: 'claim',       label: 'Slogan',                  type: 'text',  hint: 'Kurzer Claim auf der Teamkarte' },
      { key: 'description', label: 'Beschreibung',            type: 'textarea' },
      { key: 'image',       label: 'Teambild',                type: 'image' },
      { key: 'email',       label: 'Kontakt-E-Mail',          type: 'text' },
      { key: 'sort_order',  label: 'Reihenfolge',             type: 'number' }
    ]
  },
  players: {
    label: 'Spieler', icon: '👥', sub: 'Kader aller Mannschaften verwalten',
    searchKeys: ['name', 'position'],
    columns: [
      { key: 'photo', label: 'Foto', type: 'image' },
      { key: 'name', label: 'Name' },
      { key: 'team_id', label: 'Team', type: 'team' },
      { key: 'number', label: 'Nr./Rolle' },
      { key: 'position', label: 'Position' }
    ],
    fields: [
      { key: 'name',       label: 'Name',       type: 'text', required: true },
      { key: 'team_id',    label: 'Team',       type: 'team', required: true },
      { key: 'number',     label: 'Nr. / Rolle',type: 'text', hint: 'z. B. "Nr. 7" oder "Libero"' },
      { key: 'position',   label: 'Position',   type: 'text', hint: 'z. B. Außenangreifer' },
      { key: 'photo',      label: 'Profilbild', type: 'image' },
      { key: 'sort_order', label: 'Reihenfolge',type: 'number' }
    ]
  },
  board: {
    label: 'Vorstand', icon: '👔', sub: 'Vereinsführung verwalten',
    searchKeys: ['name', 'role'],
    columns: [
      { key: 'photo', label: 'Foto', type: 'image' },
      { key: 'name', label: 'Name' },
      { key: 'role', label: 'Funktion' },
      { key: 'featured', label: 'Hervorgehoben', type: 'bool' }
    ],
    fields: [
      { key: 'name',       label: 'Name',                  type: 'text', required: true },
      { key: 'role',       label: 'Funktion',              type: 'text', hint: 'z. B. Obmann, Kassier' },
      { key: 'initials',   label: 'Initialen',             type: 'text', hint: 'Platzhalter, solange kein Foto vorhanden ist' },
      { key: 'photo',      label: 'Profilbild',            type: 'image' },
      { key: 'featured',   label: 'Hervorheben (große Karte)', type: 'checkbox' },
      { key: 'sort_order', label: 'Reihenfolge',           type: 'number' }
    ]
  },
  games: {
    label: 'Spiele', icon: '📅', sub: 'Kommende Spiele auf der Startseite',
    searchKeys: ['home', 'away', 'league'],
    columns: [
      { key: 'day', label: 'Tag' },
      { key: 'month', label: 'Monat' },
      { key: 'home', label: 'Heim' },
      { key: 'away', label: 'Gast' },
      { key: 'type', label: 'Typ', type: 'gametype' },
      { key: 'league', label: 'Liga' }
    ],
    fields: [
      { key: 'day',        label: 'Tag',      type: 'text', hint: 'z. B. 15' },
      { key: 'month',      label: 'Monat',    type: 'text', hint: 'z. B. Jun' },
      { key: 'time',       label: 'Uhrzeit',  type: 'text', hint: 'z. B. 18:00 Uhr' },
      { key: 'home',       label: 'Heimmannschaft', type: 'text', required: true },
      { key: 'away',       label: 'Gastmannschaft', type: 'text', required: true },
      { key: 'location',   label: 'Spielort', type: 'text', hint: 'z. B. Sporthalle Stainach' },
      { key: 'type',       label: 'Heim/Auswärts', type: 'select', options: [['home','Heimspiel'],['away','Auswärts']] },
      { key: 'league',     label: 'Liga',     type: 'text' },
      { key: 'sort_order', label: 'Reihenfolge', type: 'number' }
    ]
  },
  sponsors: {
    label: 'Sponsoren', icon: '🤝', sub: 'Partner-Logos im Sponsoren-Band',
    searchKeys: ['name'],
    columns: [
      { key: 'logo', label: 'Logo', type: 'image' },
      { key: 'name', label: 'Name' },
      { key: 'url', label: 'Website' }
    ],
    fields: [
      { key: 'name',       label: 'Name', type: 'text', required: true },
      { key: 'logo',       label: 'Logo', type: 'image' },
      { key: 'url',        label: 'Website-Link', type: 'text', hint: 'https://… (optional)' },
      { key: 'sort_order', label: 'Reihenfolge', type: 'number' }
    ]
  },
  gallery: {
    label: 'Galerie', icon: '📷', sub: 'Bilder im Galerie-Bereich der Startseite',
    searchKeys: ['alt'],
    columns: [
      { key: 'image', label: 'Bild', type: 'image' },
      { key: 'alt', label: 'Beschreibung' },
      { key: 'span', label: 'Layout', type: 'span' }
    ],
    fields: [
      { key: 'image',      label: 'Bild', type: 'image', required: true },
      { key: 'alt',        label: 'Bildbeschreibung', type: 'text', hint: 'Alt-Text für Barrierefreiheit & SEO' },
      { key: 'span',       label: 'Layout', type: 'select', options: [['normal','Normal'],['wide','Breit (2 Spalten)'],['tall','Hoch (2 Zeilen)']] },
      { key: 'sort_order', label: 'Reihenfolge', type: 'number' }
    ]
  },
  timeline: {
    label: 'Geschichte', icon: '🕰️', sub: 'Zeitleiste der Vereinsgeschichte',
    searchKeys: ['year', 'title'],
    columns: [
      { key: 'year', label: 'Jahr' },
      { key: 'title', label: 'Titel' },
      { key: 'text', label: 'Text' }
    ],
    fields: [
      { key: 'year',       label: 'Jahr', type: 'text', hint: 'z. B. 1985 oder 2007/08' },
      { key: 'title',      label: 'Titel', type: 'text', required: true },
      { key: 'text',       label: 'Text', type: 'textarea' },
      { key: 'sort_order', label: 'Reihenfolge', type: 'number' }
    ]
  },
  achievements: {
    label: 'Erfolge', icon: '🏆', sub: 'Auszeichnungen & Titel auf der Startseite',
    searchKeys: ['title'],
    columns: [
      { key: 'num', label: 'Zahl' },
      { key: 'title', label: 'Titel' },
      { key: 'sub', label: 'Beschreibung' },
      { key: 'featured', label: 'Hervorgehoben', type: 'bool' }
    ],
    fields: [
      { key: 'num',        label: 'Zahl / Kürzel', type: 'text', hint: 'z. B. 18, 1× oder Athen' },
      { key: 'title',      label: 'Titel', type: 'text', required: true },
      { key: 'sub',        label: 'Beschreibung', type: 'text' },
      { key: 'icon',       label: 'Icon-Pfad', type: 'text', hint: 'z. B. Icons/trophy.svg' },
      { key: 'featured',   label: 'Hervorheben', type: 'checkbox' },
      { key: 'sort_order', label: 'Reihenfolge', type: 'number' }
    ]
  },
  stats: {
    label: 'Statistiken', icon: '📈', sub: 'Zahlen-Leiste unter dem Hero-Bereich',
    searchKeys: ['label'],
    columns: [
      { key: 'value', label: 'Wert' },
      { key: 'label', label: 'Beschriftung' }
    ],
    fields: [
      { key: 'value',      label: 'Wert', type: 'text', hint: 'z. B. 49 oder 1.' },
      { key: 'label',      label: 'Beschriftung', type: 'text', required: true },
      { key: 'sort_order', label: 'Reihenfolge', type: 'number' }
    ]
  }
};

const colState = { name: null, rows: [], teams: [] };

/* Relative Website-Pfade (z. B. "WebsiteAssets/…") absolut machen,
   damit sie auch unter /admin/dashboard korrekt laden. */
function assetUrl(v) {
  if (!v) return '';
  return /^(https?:)?\/\//.test(v) || v.startsWith('/') || v.startsWith('data:')
    ? v : '/' + v;
}

async function showCollectionView(name) {
  const def = COLLECTION_DEFS[name];
  if (!def) return;
  colState.name = name;

  document.getElementById('colTitle').textContent = def.icon + ' ' + def.label;
  document.getElementById('colCount').textContent = 'Wird geladen…';
  document.getElementById('colAddBtn').onclick = () => openRecordForm(null);
  const search = document.getElementById('colSearch');
  search.value = '';
  search.oninput = () => { state.searchQuery = search.value; filterColTable(); };

  /* Kopfzeile */
  document.getElementById('colTableHead').innerHTML = '<tr>' +
    def.columns.map(c => `<th>${escHtml(c.label)}</th>`).join('') +
    '<th style="text-align:right">Aktionen</th></tr>';
  document.getElementById('colTableBody').innerHTML =
    skeletonRows(4, def.columns.length + 1);

  try {
    /* Teams parallel laden – für Team-Spalten/-Selects */
    const needTeams = def.columns.some(c => c.type === 'team') ||
                      def.fields.some(f => f.type === 'team');
    const [rows, teams] = await Promise.all([
      api('GET', '/api/collections/' + name),
      needTeams ? api('GET', '/api/collections/teams') : Promise.resolve(colState.teams)
    ]);
    colState.rows  = rows;
    colState.teams = teams;
    renderColTable(rows);
  } catch (e) { showToast(e.message, 'error'); }
}

function colCellValue(col, row) {
  const v = row[col.key];
  switch (col.type) {
    case 'image':
      return v
        ? `<img class="td-img" src="${escHtml(assetUrl(v))}" alt="" onerror="this.style.display='none'">`
        : '<div class="td-img-placeholder">🖼️</div>';
    case 'team': {
      const t = colState.teams.find(t => t.id === v);
      return `<span class="tag-chip">${escHtml(t ? t.name : '—')}</span>`;
    }
    case 'bool':
      return v ? '<span class="badge badge-success">✓ Ja</span>' : '<span style="color:var(--text-muted)">—</span>';
    case 'gametype':
      return v === 'home'
        ? '<span class="badge badge-success">Heimspiel</span>'
        : '<span class="badge badge-warning">Auswärts</span>';
    case 'span':
      return { wide: 'Breit', tall: 'Hoch' }[v] || 'Normal';
    default: {
      const s = String(v == null ? '' : v);
      return escHtml(s.length > 60 ? s.slice(0, 60) + '…' : s);
    }
  }
}

function renderColTable(rows) {
  const def   = COLLECTION_DEFS[colState.name];
  const tbody = document.getElementById('colTableBody');
  const q     = (state.searchQuery || '').toLowerCase();
  const list  = q
    ? rows.filter(r => (def.searchKeys || []).some(k => String(r[k] || '').toLowerCase().includes(q)))
    : rows;

  document.getElementById('colCount').textContent = list.length + ' Einträge';

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="${def.columns.length + 1}">
      <div class="empty-state">
        <div class="empty-icon">${def.icon}</div>
        <div class="empty-title">${q ? 'Keine Treffer' : 'Noch keine Einträge'}</div>
        <div class="empty-desc">${q ? '' : 'Legen Sie den ersten Eintrag an.'}</div>
      </div>
    </td></tr>`;
    return;
  }
  tbody.innerHTML = list.map(r => `
    <tr>
      ${def.columns.map(c => `<td>${colCellValue(c, r)}</td>`).join('')}
      <td class="td-actions">
        <button class="btn btn-secondary btn-sm" onclick="editRecord(${r.id})">✎ Bearbeiten</button>
        <button class="btn btn-danger btn-sm" onclick="confirmDeleteRecord(${r.id})">🗑</button>
      </td>
    </tr>
  `).join('');
}

function filterColTable() { renderColTable(colState.rows); }

/* ── Formular (Modal) generieren ────────────── */
function fieldInputHtml(f, value) {
  const v = value == null ? '' : value;
  switch (f.type) {
    case 'textarea':
      return `<textarea class="form-textarea" id="rf-${f.key}" rows="4">${escHtml(v)}</textarea>`;
    case 'number':
      return `<input class="form-input" type="number" id="rf-${f.key}" value="${escHtml(v)}">`;
    case 'checkbox':
      return `<label style="display:flex;align-items:center;gap:.6rem;cursor:pointer">
        <input type="checkbox" id="rf-${f.key}" ${v ? 'checked' : ''} style="width:18px;height:18px;accent-color:var(--accent)">
        <span style="font-size:.9rem">${escHtml(f.label)}</span>
      </label>`;
    case 'select':
      return `<select class="form-select" id="rf-${f.key}">
        ${f.options.map(([val, lbl]) =>
          `<option value="${escHtml(val)}" ${String(v) === val ? 'selected' : ''}>${escHtml(lbl)}</option>`).join('')}
      </select>`;
    case 'team':
      return `<select class="form-select" id="rf-${f.key}">
        ${colState.teams.map(t =>
          `<option value="${t.id}" ${v === t.id ? 'selected' : ''}>${escHtml(t.name)}</option>`).join('')}
      </select>`;
    case 'image':
      return `<div style="display:flex;gap:.5rem">
          <input class="form-input" type="text" id="rf-${f.key}" value="${escHtml(v)}"
            placeholder="/uploads/… oder WebsiteAssets/…" style="flex:1"
            oninput="updateFieldImgPreview('${f.key}')">
          <button type="button" class="btn btn-secondary" onclick="openMediaPicker('rf-${f.key}')">🖼️ Wählen</button>
        </div>
        <img id="rf-${f.key}-preview" alt="" src="${escHtml(assetUrl(v))}"
          style="margin-top:.5rem;max-height:90px;border-radius:12px;${v ? '' : 'display:none'}"
          onerror="this.style.display='none'">`;
    default:
      return `<input class="form-input" type="text" id="rf-${f.key}" value="${escHtml(v)}">`;
  }
}

function updateFieldImgPreview(key) {
  const inp = document.getElementById('rf-' + key);
  const img = document.getElementById('rf-' + key + '-preview');
  if (!inp || !img) return;
  img.src = assetUrl(inp.value);
  img.style.display = inp.value ? '' : 'none';
}

function openRecordForm(record) {
  const def = COLLECTION_DEFS[colState.name];
  if (!def) return;

  document.getElementById('recordModalTitle').textContent =
    (record ? '✎ Bearbeiten: ' : '+ Neu: ') + def.label;

  document.getElementById('recordModalBody').innerHTML = def.fields.map(f => `
    <div class="form-group">
      ${f.type !== 'checkbox' ? `<label class="form-label" for="rf-${f.key}">${escHtml(f.label)}${f.required ? ' <span>*</span>' : ''}</label>` : ''}
      ${fieldInputHtml(f, record ? record[f.key] : (f.type === 'number' ? nextSortOrder() : ''))}
      ${f.hint ? `<div class="form-hint">${escHtml(f.hint)}</div>` : ''}
    </div>
  `).join('');

  document.getElementById('recordModalSave').onclick = () => saveRecord(record ? record.id : null);
  openModal('recordModal');
}

function nextSortOrder() {
  return colState.rows.reduce((m, r) => Math.max(m, r.sort_order || 0), 0) + 1;
}

function editRecord(id) {
  const r = colState.rows.find(r => r.id === id);
  if (r) openRecordForm(r);
}

async function saveRecord(id) {
  const def  = COLLECTION_DEFS[colState.name];
  const body = {};
  for (const f of def.fields) {
    const el = document.getElementById('rf-' + f.key);
    if (!el) continue;
    if (f.type === 'checkbox')    body[f.key] = el.checked;
    else if (f.type === 'number') body[f.key] = parseInt(el.value) || 0;
    else if (f.type === 'team')   body[f.key] = parseInt(el.value) || 0;
    else                          body[f.key] = el.value.trim();
    if (f.required && !String(body[f.key]).trim()) {
      showToast(`"${f.label}" ist erforderlich`, 'error');
      return;
    }
  }

  const btn = document.getElementById('recordModalSave');
  btn.disabled = true;
  try {
    if (id) await api('PUT',  `/api/collections/${colState.name}/${id}`, body);
    else    await api('POST', `/api/collections/${colState.name}`, body);
    closeModal('recordModal');
    showToast(id ? 'Eintrag aktualisiert' : 'Eintrag erstellt', 'success');
    showCollectionView(colState.name);
  } catch (e) { showToast(e.message, 'error'); }
  finally { btn.disabled = false; }
}

function confirmDeleteRecord(id) {
  const def = COLLECTION_DEFS[colState.name];
  const row = colState.rows.find(r => r.id === id) || {};
  const label = row.name || row.title || row.home || row.label || row.alt || ('#' + id);
  document.getElementById('confirmMsg').textContent =
    `${def.label}-Eintrag „${label}" wirklich löschen?`;
  document.getElementById('confirmOk').onclick = async () => {
    closeModal('confirmModal');
    try {
      await api('DELETE', `/api/collections/${colState.name}/${id}`);
      colState.rows = colState.rows.filter(r => r.id !== id);
      renderColTable(colState.rows);
      showToast('Eintrag gelöscht', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  };
  openModal('confirmModal');
}

/* ════════════════════════════════════════════
   MEDIEN-PICKER (Bild aus Bibliothek wählen)
════════════════════════════════════════════ */
let mediaPickerTarget = null;

async function openMediaPicker(targetInputId) {
  mediaPickerTarget = targetInputId;
  openModal('mediaPickerModal');
  const grid = document.getElementById('mediaPickerGrid');
  grid.innerHTML = '<div style="padding:1rem;color:var(--text-muted)">Wird geladen…</div>';
  try {
    const media = await api('GET', '/api/media');
    grid.innerHTML = media.length ? media.map(m => `
      <img src="${escHtml(m.file_url)}" title="${escHtml(m.original_name)}" loading="lazy"
        class="media-picker-thumb" onclick="pickMedia('${escHtml(m.file_url)}')">
    `).join('') : '<p style="color:var(--text-muted);padding:.5rem">Noch keine Bilder in der Bibliothek.</p>';
  } catch (e) { showToast(e.message, 'error'); }
}

function pickMedia(url) {
  const inp = document.getElementById(mediaPickerTarget);
  if (inp) {
    inp.value = url;
    inp.dispatchEvent(new Event('input'));
    const key = mediaPickerTarget.replace(/^rf-/, '');
    updateFieldImgPreview(key);
  }
  closeModal('mediaPickerModal');
  showToast('Bild ausgewählt', 'success');
}

function setupMediaPicker() {
  const inp = document.getElementById('pickerFileInput');
  if (!inp) return;
  inp.addEventListener('change', async () => {
    if (!inp.files[0]) return;
    const fd = new FormData();
    fd.append('file', inp.files[0]);
    try {
      const m = await apiForm('POST', '/api/media', fd);
      pickMedia(m.file_url);
    } catch (e) { showToast(e.message, 'error'); }
    inp.value = '';
  });
}

/* ════════════════════════════════════════════
   LIVE-VORSCHAU
════════════════════════════════════════════ */
function loadPreview() {
  const frame = document.getElementById('previewFrame');
  const sel   = document.getElementById('previewPageSelect');
  if (frame && sel) frame.src = sel.value;
}
function setupPreview() {
  const frame  = document.getElementById('previewFrame');
  const sel    = document.getElementById('previewPageSelect');
  const reload = document.getElementById('previewReloadBtn');
  const open   = document.getElementById('previewOpenBtn');
  if (!frame || !sel) return;
  sel.addEventListener('change', () => { frame.src = sel.value; if (open) open.href = sel.value; });
  reload?.addEventListener('click', () => { frame.src = sel.value + '?_=' + Date.now(); });
}

/* ════════════════════════════════════════════
   SETTINGS
════════════════════════════════════════════ */
function setupSettings() {
  document.getElementById('changePasswordForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    const cur  = document.getElementById('currentPw').value;
    const newp = document.getElementById('newPw').value;
    const conf = document.getElementById('confirmPw').value;

    if (newp !== conf) { showToast('Passwörter stimmen nicht überein', 'error'); return; }
    if (newp.length < 6) { showToast('Mindestens 6 Zeichen erforderlich', 'error'); return; }

    const btn = e.submitter;
    btn.disabled = true; btn.textContent = 'Wird gespeichert…';
    try {
      await api('POST', '/api/auth/change-password', { currentPassword: cur, newPassword: newp });
      showToast('Passwort erfolgreich geändert', 'success');
      e.target.reset();
    } catch(err) { showToast(err.message, 'error'); }
    finally { btn.disabled = false; btn.textContent = '🔐 Passwort ändern'; }
  });
}

/* ════════════════════════════════════════════
   MODAL
════════════════════════════════════════════ */
function openModal(id) {
  document.getElementById(id)?.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeModal(id) {
  document.getElementById(id)?.classList.remove('open');
  document.body.style.overflow = '';
}

/* ════════════════════════════════════════════
   TOAST
════════════════════════════════════════════ */
function showToast(msg, type = 'info') {
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  const stack = document.getElementById('toastStack');
  const el    = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.innerHTML = `<span class="toast-icon">${icons[type]||'ℹ️'}</span>
    <span class="toast-msg">${escHtml(msg)}</span>
    <button class="toast-close" onclick="this.parentElement.remove()">✕</button>`;
  stack.appendChild(el);
  setTimeout(() => {
    el.classList.add('fade-out');
    el.addEventListener('animationend', () => el.remove());
  }, 3800);
}

/* ════════════════════════════════════════════
   UTIL
════════════════════════════════════════════ */
function escHtml(s) {
  if (!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function today() {
  return new Date().toISOString().split('T')[0];
}
function fmtDate(str) {
  if (!str) return '—';
  const d = new Date(str);
  return d.toLocaleDateString('de-AT', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
}
function fmtDateShort(str) {
  if (!str) return '—';
  const d = new Date(str);
  return d.toLocaleDateString('de-AT', { day:'2-digit', month:'2-digit', year:'numeric' });
}
function fmtSize(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes/1024).toFixed(1) + ' KB';
  return (bytes/1048576).toFixed(1) + ' MB';
}
function skeletonRows(rows, cols) {
  return Array.from({length: rows}, () =>
    `<tr>${Array.from({length: cols}, () =>
      `<td><div class="skeleton" style="height:18px;width:${60+Math.random()*30}%"></div></td>`
    ).join('')}</tr>`
  ).join('');
}

/* ── Bootstrap after DOM ─────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  setupNewsForm();
  setupMediaUpload();
  setupSettings();
  setupMediaPicker();
  setupPreview();

  /* Modal close buttons */
  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => closeModal(btn.getAttribute('data-close-modal')));
  });
  /* Close modal on overlay click */
  document.querySelectorAll('.modal-overlay').forEach(ov => {
    ov.addEventListener('click', e => {
      if (e.target === ov) closeModal(ov.id);
    });
  });

  /* Expose globals for inline onclick */
  window.editNews          = editNews;
  window.confirmDeleteNews = confirmDeleteNews;
  window.confirmDeleteMedia= confirmDeleteMedia;
  window.newNews           = newNews;
  window.copyUrl           = copyUrl;
  window.saveSection       = saveSection;
  window.renderPages       = renderPages;
  window.openModal         = openModal;
  window.closeModal        = closeModal;
  window.loadView          = loadView;

  /* Collection-Engine (inline onclick) */
  window.editRecord            = editRecord;
  window.confirmDeleteRecord   = confirmDeleteRecord;
  window.openMediaPicker       = openMediaPicker;
  window.pickMedia             = pickMedia;
  window.updateFieldImgPreview = updateFieldImgPreview;
});
