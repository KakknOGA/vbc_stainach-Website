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
  document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('[data-view]').forEach(el => {
    el.classList.toggle('active', el.getAttribute('data-view') === view);
  });
  const target = document.getElementById('view-' + view);
  if (target) target.classList.add('active');
  updateTopbarTitle(view);

  switch (view) {
    case 'dashboard': loadDashboard(); break;
    case 'news':      loadNewsList();  break;
    case 'news-form': showNewsForm(state.editingNews); break;
    case 'media':     loadMedia();     break;
    case 'pages':     loadPages();     break;
    case 'settings':  /* static */     break;
  }
}

const viewTitles = {
  dashboard:   ['Dashboard', 'Willkommen im Admin-Bereich'],
  news:        ['Neuigkeiten', 'Alle News-Beiträge verwalten'],
  'news-form': ['News-Beitrag', 'Beitrag erstellen / bearbeiten'],
  media:       ['Medienbibliothek', 'Bilder hochladen und verwalten'],
  pages:       ['Seiteninhalte', 'Texte der Website bearbeiten'],
  settings:    ['Einstellungen', 'Passwort und Account verwalten']
};
function updateTopbarTitle(view) {
  const [title, sub] = viewTitles[view] || ['', ''];
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
  { key: 'startseite', label: '🏠 Startseite', sections: [
    { key: 'hero_title',    label: 'Hero-Überschrift',  hint: 'Große Überschrift im Header-Bereich' },
    { key: 'hero_subtitle', label: 'Hero-Untertitel',   hint: 'Kurzer Text unter der Hauptüberschrift' },
    { key: 'about_text',    label: 'Über uns – Text',   hint: 'Text im "Über uns"-Abschnitt' },
  ]},
  { key: 'neuigkeiten', label: '📰 Neuigkeiten', sections: [
    { key: 'page_header',   label: 'Seitenüberschrift', hint: 'Titel der Neuigkeiten-Seite' },
  ]},
  { key: 'allgemein', label: '⚙️ Allgemein', sections: [
    { key: 'footer_text',   label: 'Footer-Text',       hint: 'Text im Seitenfuß' },
    { key: 'contact_info',  label: 'Kontaktinformationen', hint: 'Adresse, E-Mail, Telefon' },
  ]}
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
});
