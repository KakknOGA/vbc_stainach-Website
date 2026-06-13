/* ═══════════════════════════════════════════════
   VBC Stainach – Admin CMS (Vue 3)
═══════════════════════════════════════════════ */
'use strict';

/* ── Konstanten (außerhalb der Vue-App) ─────── */
const viewTitles = {
  dashboard:   ['Dashboard', 'Willkommen im Admin-Bereich'],
  news:        ['Neuigkeiten', 'Alle News-Beiträge verwalten'],
  'news-form': ['News-Beitrag', 'Beitrag erstellen / bearbeiten'],
  media:       ['Medienbibliothek', 'Bilder hochladen und verwalten'],
  pages:       ['Seiten & Texte', 'Texte der Website bearbeiten'],
  preview:     ['Live-Vorschau', 'Website mit aktuellen Inhalten'],
  settings:    ['Einstellungen', 'Passwort und Account verwalten']
};

const PAGE_DEFS = [
  { key: 'startseite', label: '🏠 Startseite (index.html)', sections: [
    { key: 'hero_title',       label: 'Hero-Überschrift',         hint: 'Große Überschrift im Header-Bereich' },
    { key: 'teams_intro',      label: 'Teams – Einleitung',       hint: 'Text unter "Unsere Teams"' },
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
      { key: 'name',        label: 'Name',                     type: 'text', required: true, hint: 'z. B. Herren 1' },
      { key: 'tab_label',   label: 'Bezeichnung (Team-Seite)', type: 'text',  hint: 'z. B. 1. Mannschaft Herren' },
      { key: 'key',         label: 'Technischer Schlüssel',    type: 'text',  hint: 'Kurzname ohne Leerzeichen, z. B. herren1' },
      { key: 'league',      label: 'Liga',                     type: 'text' },
      { key: 'season',      label: 'Saison',                   type: 'text',  hint: 'z. B. Saison 2025/26' },
      { key: 'claim',       label: 'Slogan',                   type: 'text',  hint: 'Kurzer Claim auf der Teamkarte' },
      { key: 'description', label: 'Beschreibung',             type: 'textarea' },
      { key: 'image',       label: 'Teambild',                 type: 'image' },
      { key: 'email',       label: 'Kontakt-E-Mail',           type: 'text' },
      { key: 'sort_order',  label: 'Reihenfolge',              type: 'number' }
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
      { key: 'name',       label: 'Name',        type: 'text', required: true },
      { key: 'team_id',    label: 'Team',        type: 'team', required: true },
      { key: 'number',     label: 'Nr. / Rolle', type: 'text', hint: 'z. B. "Nr. 7" oder "Libero"' },
      { key: 'position',   label: 'Position',    type: 'text', hint: 'z. B. Außenangreifer' },
      { key: 'photo',      label: 'Profilbild',  type: 'image' },
      { key: 'sort_order', label: 'Reihenfolge', type: 'number' }
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
      { key: 'name',       label: 'Name',                      type: 'text', required: true },
      { key: 'role',       label: 'Funktion',                  type: 'text', hint: 'z. B. Obmann, Kassier' },
      { key: 'initials',   label: 'Initialen',                 type: 'text', hint: 'Platzhalter ohne Foto' },
      { key: 'photo',      label: 'Profilbild',                type: 'image' },
      { key: 'featured',   label: 'Hervorheben (große Karte)', type: 'checkbox' },
      { key: 'sort_order', label: 'Reihenfolge',               type: 'number' }
    ]
  },
  games: {
    label: 'Spiele', icon: '📅', sub: 'Kommende Spiele auf der Startseite',
    searchKeys: ['home', 'away', 'league'],
    columns: [
      { key: 'day', label: 'Tag' }, { key: 'month', label: 'Monat' },
      { key: 'home', label: 'Heim' }, { key: 'away', label: 'Gast' },
      { key: 'type', label: 'Typ', type: 'gametype' }, { key: 'league', label: 'Liga' }
    ],
    fields: [
      { key: 'day',        label: 'Tag',             type: 'text', hint: 'z. B. 15' },
      { key: 'month',      label: 'Monat',           type: 'text', hint: 'z. B. Jun' },
      { key: 'time',       label: 'Uhrzeit',         type: 'text', hint: 'z. B. 18:00 Uhr' },
      { key: 'home',       label: 'Heimmannschaft',  type: 'text', required: true },
      { key: 'away',       label: 'Gastmannschaft',  type: 'text', required: true },
      { key: 'location',   label: 'Spielort',        type: 'text', hint: 'z. B. Sporthalle Stainach' },
      { key: 'type',       label: 'Heim/Auswärts',   type: 'select', options: [['home','Heimspiel'],['away','Auswärts']] },
      { key: 'league',     label: 'Liga',            type: 'text' },
      { key: 'sort_order', label: 'Reihenfolge',     type: 'number' }
    ]
  },
  sponsors: {
    label: 'Sponsoren', icon: '🤝', sub: 'Partner-Logos im Sponsoren-Band',
    searchKeys: ['name'],
    columns: [
      { key: 'logo', label: 'Logo', type: 'image' },
      { key: 'name', label: 'Name' }, { key: 'url', label: 'Website' }
    ],
    fields: [
      { key: 'name',       label: 'Name',         type: 'text', required: true },
      { key: 'logo',       label: 'Logo',         type: 'image' },
      { key: 'url',        label: 'Website-Link', type: 'text', hint: 'https://… (optional)' },
      { key: 'sort_order', label: 'Reihenfolge',  type: 'number' }
    ]
  },
  gallery: {
    label: 'Galerie', icon: '📷', sub: 'Bilder im Galerie-Bereich der Startseite',
    searchKeys: ['alt'],
    columns: [
      { key: 'image', label: 'Bild', type: 'image' },
      { key: 'alt', label: 'Beschreibung' }, { key: 'span', label: 'Layout', type: 'span' }
    ],
    fields: [
      { key: 'image',      label: 'Bild',            type: 'image', required: true },
      { key: 'alt',        label: 'Bildbeschreibung', type: 'text',  hint: 'Alt-Text für Barrierefreiheit & SEO' },
      { key: 'span',       label: 'Layout',           type: 'select', options: [['normal','Normal'],['wide','Breit (2 Spalten)'],['tall','Hoch (2 Zeilen)']] },
      { key: 'sort_order', label: 'Reihenfolge',      type: 'number' }
    ]
  },
  timeline: {
    label: 'Geschichte', icon: '🕰️', sub: 'Zeitleiste der Vereinsgeschichte',
    searchKeys: ['year', 'title'],
    columns: [
      { key: 'year', label: 'Jahr' }, { key: 'title', label: 'Titel' }, { key: 'text', label: 'Text' }
    ],
    fields: [
      { key: 'year',       label: 'Jahr',       type: 'text', hint: 'z. B. 1985 oder 2007/08' },
      { key: 'title',      label: 'Titel',      type: 'text', required: true },
      { key: 'text',       label: 'Text',       type: 'textarea' },
      { key: 'sort_order', label: 'Reihenfolge',type: 'number' }
    ]
  },
  achievements: {
    label: 'Erfolge', icon: '🏆', sub: 'Auszeichnungen & Titel auf der Startseite',
    searchKeys: ['title'],
    columns: [
      { key: 'num', label: 'Zahl' }, { key: 'title', label: 'Titel' },
      { key: 'sub', label: 'Beschreibung' }, { key: 'featured', label: 'Hervorgehoben', type: 'bool' }
    ],
    fields: [
      { key: 'num',        label: 'Zahl / Kürzel', type: 'text', hint: 'z. B. 18, 1× oder Athen' },
      { key: 'title',      label: 'Titel',          type: 'text', required: true },
      { key: 'sub',        label: 'Beschreibung',   type: 'text' },
      { key: 'icon',       label: 'Icon-Pfad',      type: 'text', hint: 'z. B. Icons/trophy.svg' },
      { key: 'featured',   label: 'Hervorheben',    type: 'checkbox' },
      { key: 'sort_order', label: 'Reihenfolge',    type: 'number' }
    ]
  },
  stats: {
    label: 'Statistiken', icon: '📈', sub: 'Zahlen-Leiste unter dem Hero-Bereich',
    searchKeys: ['label'],
    columns: [
      { key: 'value', label: 'Wert' }, { key: 'label', label: 'Beschriftung' }
    ],
    fields: [
      { key: 'value',      label: 'Wert',         type: 'text', hint: 'z. B. 49 oder 1.' },
      { key: 'label',      label: 'Beschriftung', type: 'text', required: true },
      { key: 'sort_order', label: 'Reihenfolge',  type: 'number' }
    ]
  }
};

/* ── Hilfsfunktionen ────────────────────────── */
function escHtml(s) {
  if (!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function today() { return new Date().toISOString().split('T')[0]; }
function fmtDate(str) {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('de-AT', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
}
function fmtDateShort(str) {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('de-AT', { day:'2-digit', month:'2-digit', year:'numeric' });
}
function fmtSize(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes/1024).toFixed(1) + ' KB';
  return (bytes/1048576).toFixed(1) + ' MB';
}
function assetUrl(v) {
  if (!v) return '';
  return /^(https?:)?\/\//.test(v) || v.startsWith('/') || v.startsWith('data:')
    ? v : '/' + v;
}

/* ════════════════════════════════════════════
   VUE 3 APP
════════════════════════════════════════════ */
const { createApp } = Vue;

createApp({
  data() {
    return {
      /* Navigation */
      view:        'dashboard',
      username:    '',
      theme:       localStorage.getItem('adminTheme') || 'dark',
      searchQuery: '',

      /* Dashboard */
      dashStats:   null,
      dashLoading: false,

      /* News Liste */
      newsList:    [],
      newsLoading: false,

      /* News Formular */
      nfEditing:   null,
      nfTitle:     '',
      nfTag:       'Vereinsnews',
      nfDesc:      '',
      nfContent:   '',
      nfDate:      today(),
      nfPublished: true,
      nfImgUrl:    '',
      nfImgTab:    'url',
      libThumbs:   [],

      /* Medienbibliothek */
      mediaList:   [],
      mediaLoading: false,

      /* Seitentexte */
      pagesData:   {},
      activePage:  'startseite',

      /* Collections */
      colName:    null,
      colRows:    [],
      colTeams:   [],
      colLoading: false,

      /* Datensatz-Modal */
      recordId:     null,
      recordFields: {},

      /* Modals */
      modal: { confirm: false, preview: false, record: false, mediaPicker: false },
      confirmMsg:      '',
      confirmCallback: null,

      /* News Vorschau */
      previewData: {},

      /* Medien-Picker */
      pickerTarget: null,
      pickerItems:  [],

      /* Live-Vorschau */
      previewPage: '/',

      /* Einstellungen */
      pwCurrent: '', pwNew: '', pwConfirm: '',
    };
  },

  computed: {
    filteredNews() {
      const q = this.searchQuery.toLowerCase();
      return q ? this.newsList.filter(n =>
        n.title.toLowerCase().includes(q) ||
        (n.description || '').toLowerCase().includes(q)
      ) : this.newsList;
    },
    filteredMedia() {
      const q = this.searchQuery.toLowerCase();
      return q ? this.mediaList.filter(m => m.original_name.toLowerCase().includes(q)) : this.mediaList;
    },
    filteredColRows() {
      const def = this.currentColDef;
      if (!def) return this.colRows;
      const q = this.searchQuery.toLowerCase();
      return q ? this.colRows.filter(r =>
        (def.searchKeys || []).some(k => String(r[k] || '').toLowerCase().includes(q))
      ) : this.colRows;
    },
    currentColDef() { return this.colName ? COLLECTION_DEFS[this.colName] : null; },
    currentPageDef() { return PAGE_DEFS.find(p => p.key === this.activePage); },
    topbarTitle() {
      if (this.view.startsWith('col-')) return COLLECTION_DEFS[this.view.slice(4)]?.label || '';
      return viewTitles[this.view]?.[0] || '';
    },
    topbarSub() {
      if (this.view.startsWith('col-')) return COLLECTION_DEFS[this.view.slice(4)]?.sub || '';
      return viewTitles[this.view]?.[1] || '';
    },
    topbarTitleColIcon() {
      if (this.view.startsWith('col-')) return COLLECTION_DEFS[this.view.slice(4)]?.icon || '';
      return '';
    },
    usernameInitial() { return this.username ? this.username[0].toUpperCase() : 'A'; },
  },

  methods: {
    /* ── Auth ────────────────────────────────── */
    async checkAuth() {
      try {
        const r = await this.api('GET', '/api/auth/me');
        this.username = r.username;
      } catch { window.location.href = '/admin'; }
    },
    async logout() {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.href = '/admin';
    },

    /* ── Theme ───────────────────────────────── */
    applyTheme(t) {
      document.documentElement.setAttribute('data-theme', t);
      localStorage.setItem('adminTheme', t);
      this.theme = t;
    },
    toggleTheme() { this.applyTheme(this.theme === 'dark' ? 'light' : 'dark'); },

    /* ── Navigation ──────────────────────────── */
    async loadView(v) {
      this.view = v;
      this.searchQuery = '';
      this.closeSidebar();
      if (v.startsWith('col-')) { await this.showCollectionView(v.slice(4)); return; }
      switch (v) {
        case 'dashboard': await this.loadDashboard(); break;
        case 'news':      await this.loadNewsList();  break;
        case 'media':     await this.loadMedia();     break;
        case 'pages':     await this.loadPages();     break;
        case 'preview':   this.$nextTick(() => this.loadPreview()); break;
      }
    },

    /* ── Sidebar ─────────────────────────────── */
    openSidebar()  {
      document.getElementById('sidebar')?.classList.add('open');
      document.getElementById('sidebarOverlay')?.classList.add('open');
      document.body.style.overflow = 'hidden';
    },
    closeSidebar() {
      document.getElementById('sidebar')?.classList.remove('open');
      document.getElementById('sidebarOverlay')?.classList.remove('open');
      document.body.style.overflow = '';
    },

    /* ── API ─────────────────────────────────── */
    async api(method, url, body) {
      const opts = { method, headers: {'Content-Type':'application/json'}, credentials:'same-origin' };
      if (body) opts.body = JSON.stringify(body);
      const r = await fetch(url, opts);
      if (r.status === 401) { window.location.href = '/admin'; throw new Error('Nicht angemeldet'); }
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error || 'Fehler'); }
      return r.json();
    },
    async apiForm(method, url, fd) {
      const r = await fetch(url, { method, credentials:'same-origin', body: fd });
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error || 'Upload fehlgeschlagen'); }
      return r.json();
    },

    /* ── Dashboard ───────────────────────────── */
    async loadDashboard() {
      this.dashLoading = true; this.dashStats = null;
      try { this.dashStats = await this.api('GET', '/api/stats'); }
      catch (e) { this.showToast(e.message, 'error'); }
      finally { this.dashLoading = false; }
    },

    /* ── News Liste ──────────────────────────── */
    async loadNewsList() {
      this.newsLoading = true;
      try { this.newsList = await this.api('GET', '/api/news'); }
      catch (e) { this.showToast(e.message, 'error'); }
      finally { this.newsLoading = false; }
    },

    /* ── News Formular ───────────────────────── */
    newNews() {
      this.nfEditing = null; this.nfTitle = ''; this.nfTag = 'Vereinsnews';
      this.nfDesc = ''; this.nfContent = ''; this.nfDate = today();
      this.nfPublished = true; this.nfImgUrl = ''; this.nfImgTab = 'url';
      this.view = 'news-form';
    },
    async editNews(id) {
      try {
        const n = await this.api('GET', '/api/news/' + id);
        this.nfEditing = n; this.nfTitle = n.title || ''; this.nfTag = n.tag || 'Vereinsnews';
        this.nfDesc = n.description || ''; this.nfContent = n.content || '';
        this.nfDate = (n.publish_date || '').split('T')[0] || today();
        this.nfPublished = !!n.published; this.nfImgUrl = n.image_url || ''; this.nfImgTab = 'url';
        this.view = 'news-form';
      } catch (e) { this.showToast(e.message, 'error'); }
    },
    async saveNews() {
      if (!this.nfTitle.trim()) { this.showToast('Titel ist erforderlich', 'error'); return; }
      const body = {
        title: this.nfTitle.trim(), tag: this.nfTag, description: this.nfDesc,
        content: this.nfContent, image_url: this.nfImgUrl,
        published: this.nfPublished, publish_date: this.nfDate
      };
      try {
        if (this.nfEditing) await this.api('PUT', '/api/news/' + this.nfEditing.id, body);
        else                await this.api('POST', '/api/news', body);
        this.showToast(this.nfEditing ? 'Beitrag aktualisiert' : 'Beitrag erstellt', 'success');
        this.nfEditing = null;
        await this.loadView('news');
      } catch (e) { this.showToast(e.message, 'error'); }
    },
    previewNews() {
      this.previewData = {
        title: this.nfTitle || '(Kein Titel)', tag: this.nfTag || '',
        date: fmtDateShort(this.nfDate || today()),
        description: this.nfDesc || '',
        content: (this.nfContent || '').replace(/\n/g, '<br>'),
        image_url: this.nfImgUrl || ''
      };
      this.modal.preview = true;
    },
    confirmDeleteNews(id, title) {
      this.confirmMsg = `Beitrag „${title}" wirklich löschen?`;
      this.confirmCallback = async () => {
        try {
          await this.api('DELETE', '/api/news/' + id);
          this.newsList = this.newsList.filter(n => n.id !== id);
          this.showToast('Beitrag gelöscht', 'success');
        } catch (e) { this.showToast(e.message, 'error'); }
      };
      this.modal.confirm = true;
    },

    /* Bild im News-Formular hochladen */
    async uploadNewsImage(event) {
      const file = event.target?.files?.[0] || event.dataTransfer?.files?.[0];
      if (!file) return;
      const fd = new FormData(); fd.append('file', file);
      try {
        const r = await this.apiForm('POST', '/api/media', fd);
        this.nfImgUrl = r.file_url; this.nfImgTab = 'url';
        this.showToast('Bild hochgeladen', 'success');
      } catch (e) { this.showToast(e.message, 'error'); }
    },
    handleNewsImgDrop(e) {
      e.preventDefault();
      e.currentTarget.classList.remove('drag-over');
      if (e.dataTransfer.files[0]) this.uploadNewsImage({ dataTransfer: e.dataTransfer });
    },
    async loadLibThumbs() {
      try { this.libThumbs = (await this.api('GET', '/api/media')).slice(0, 12); }
      catch { /* silent */ }
    },
    selectLibImg(url) {
      this.nfImgUrl = url; this.nfImgTab = 'url';
      this.showToast('Bild ausgewählt', 'success');
    },

    /* ── Medienbibliothek ────────────────────── */
    async loadMedia() {
      this.mediaLoading = true;
      try { this.mediaList = await this.api('GET', '/api/media'); }
      catch (e) { this.showToast(e.message, 'error'); }
      finally { this.mediaLoading = false; }
    },
    async uploadMedia(files) {
      for (const file of files) {
        const fd = new FormData(); fd.append('file', file);
        try {
          const m = await this.apiForm('POST', '/api/media', fd);
          this.mediaList.unshift(m);
          this.showToast(`${file.name} hochgeladen`, 'success');
        } catch (e) { this.showToast(e.message, 'error'); }
      }
    },
    handleMediaDrop(e) {
      e.preventDefault();
      e.currentTarget.classList.remove('drag-over');
      this.uploadMedia([...e.dataTransfer.files]);
    },
    handleMediaInput(e) { this.uploadMedia([...e.target.files]); e.target.value = ''; },
    copyUrl(url) {
      const full = window.location.origin + url;
      navigator.clipboard.writeText(full).then(
        () => this.showToast('URL kopiert', 'success'),
        () => {
          const ta = document.createElement('textarea');
          ta.value = full; document.body.appendChild(ta); ta.select();
          document.execCommand('copy'); document.body.removeChild(ta);
          this.showToast('URL kopiert', 'success');
        }
      );
    },
    confirmDeleteMedia(id, name) {
      this.confirmMsg = `Bild „${name}" wirklich löschen?`;
      this.confirmCallback = async () => {
        try {
          await this.api('DELETE', '/api/media/' + id);
          this.mediaList = this.mediaList.filter(m => m.id !== id);
          this.showToast('Bild gelöscht', 'success');
        } catch (e) { this.showToast(e.message, 'error'); }
      };
      this.modal.confirm = true;
    },

    /* ── Seitentexte ─────────────────────────── */
    async loadPages() {
      try {
        const rows = await this.api('GET', '/api/pages');
        this.pagesData = {};
        rows.forEach(r => { this.pagesData[r.page + ':' + r.section] = r.content; });
      } catch (e) { this.showToast(e.message, 'error'); }
    },
    pageKey(page, section) { return page + ':' + section; },
    async saveSection(page, section) {
      const content = this.pagesData[page + ':' + section] || '';
      try {
        await this.api('PUT', `/api/pages/${page}/${section}`, { content });
        this.showToast('Inhalt gespeichert', 'success');
      } catch (e) { this.showToast(e.message, 'error'); }
    },

    /* ── Generische Collections ──────────────── */
    async showCollectionView(name) {
      const def = COLLECTION_DEFS[name];
      if (!def) return;
      this.colName = name; this.colRows = []; this.colLoading = true;
      try {
        const needTeams = def.columns.some(c => c.type === 'team') ||
                          def.fields.some(f => f.type === 'team');
        const [rows, teams] = await Promise.all([
          this.api('GET', '/api/collections/' + name),
          needTeams ? this.api('GET', '/api/collections/teams') : Promise.resolve(this.colTeams)
        ]);
        this.colRows = rows; this.colTeams = teams;
      } catch (e) { this.showToast(e.message, 'error'); }
      finally { this.colLoading = false; }
    },
    teamName(id) { return this.colTeams.find(t => t.id === id)?.name || '—'; },
    spanLabel(v) { return { wide: 'Breit', tall: 'Hoch' }[v] || 'Normal'; },

    /* Collection-Formular */
    openRecordForm(record) {
      const def = this.currentColDef; if (!def) return;
      this.recordId = record ? record.id : null;
      this.recordFields = {};
      const nextOrder = this.colRows.reduce((m, r) => Math.max(m, r.sort_order || 0), 0) + 1;
      for (const f of def.fields) {
        if (record) {
          this.recordFields[f.key] = record[f.key] ?? (f.type === 'number' ? 0 : f.type === 'checkbox' ? false : '');
        } else {
          this.recordFields[f.key] = f.type === 'number' ? nextOrder
            : f.type === 'checkbox' ? false : '';
        }
      }
      this.modal.record = true;
    },
    editRecord(id) {
      const r = this.colRows.find(r => r.id === id);
      if (r) this.openRecordForm(r);
    },
    async saveRecord() {
      const def = this.currentColDef; if (!def) return;
      const body = {};
      for (const f of def.fields) {
        body[f.key] = this.recordFields[f.key];
        if (f.required && !String(body[f.key] ?? '').trim()) {
          this.showToast(`"${f.label}" ist erforderlich`, 'error'); return;
        }
      }
      try {
        if (this.recordId) await this.api('PUT', `/api/collections/${this.colName}/${this.recordId}`, body);
        else               await this.api('POST', `/api/collections/${this.colName}`, body);
        this.modal.record = false;
        this.showToast(this.recordId ? 'Eintrag aktualisiert' : 'Eintrag erstellt', 'success');
        await this.showCollectionView(this.colName);
      } catch (e) { this.showToast(e.message, 'error'); }
    },
    confirmDeleteRecord(id) {
      const def = this.currentColDef;
      const row = this.colRows.find(r => r.id === id) || {};
      const label = row.name || row.title || row.home || row.label || row.alt || ('#' + id);
      this.confirmMsg = `${def.label}-Eintrag „${label}" wirklich löschen?`;
      this.confirmCallback = async () => {
        try {
          await this.api('DELETE', `/api/collections/${this.colName}/${id}`);
          this.colRows = this.colRows.filter(r => r.id !== id);
          this.showToast('Eintrag gelöscht', 'success');
        } catch (e) { this.showToast(e.message, 'error'); }
      };
      this.modal.confirm = true;
    },

    /* ── Medien-Picker ───────────────────────── */
    async openMediaPicker(fieldKey) {
      this.pickerTarget = fieldKey; this.pickerItems = []; this.modal.mediaPicker = true;
      try { this.pickerItems = await this.api('GET', '/api/media'); }
      catch (e) { this.showToast(e.message, 'error'); }
    },
    pickMedia(url) {
      if (this.pickerTarget !== null) this.recordFields[this.pickerTarget] = url;
      this.modal.mediaPicker = false;
      this.showToast('Bild ausgewählt', 'success');
    },
    async pickerUpload(e) {
      const file = e.target.files?.[0]; if (!file) return;
      const fd = new FormData(); fd.append('file', file);
      try {
        const m = await this.apiForm('POST', '/api/media', fd);
        this.pickMedia(m.file_url);
      } catch (err) { this.showToast(err.message, 'error'); }
      e.target.value = '';
    },

    /* ── Live-Vorschau ───────────────────────── */
    loadPreview() {
      const frame = document.getElementById('previewFrame');
      if (frame) frame.src = this.previewPage;
    },
    changePreviewPage(e) {
      this.previewPage = e.target.value;
      const frame = document.getElementById('previewFrame');
      if (frame) frame.src = this.previewPage;
    },
    reloadPreview() {
      const frame = document.getElementById('previewFrame');
      if (frame) frame.src = this.previewPage + '?_=' + Date.now();
    },

    /* ── Einstellungen ───────────────────────── */
    async changePassword() {
      if (this.pwNew !== this.pwConfirm) { this.showToast('Passwörter stimmen nicht überein', 'error'); return; }
      if (this.pwNew.length < 6) { this.showToast('Mindestens 6 Zeichen erforderlich', 'error'); return; }
      try {
        await this.api('POST', '/api/auth/change-password', {
          currentPassword: this.pwCurrent, newPassword: this.pwNew
        });
        this.showToast('Passwort erfolgreich geändert', 'success');
        this.pwCurrent = this.pwNew = this.pwConfirm = '';
      } catch (e) { this.showToast(e.message, 'error'); }
    },

    /* ── Confirm Modal ───────────────────────── */
    runConfirm() {
      if (this.confirmCallback) this.confirmCallback();
      this.modal.confirm = false; this.confirmCallback = null;
    },

    /* ── Toast ───────────────────────────────── */
    showToast(msg, type = 'info') {
      const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
      const stack = document.getElementById('toastStack');
      const el = document.createElement('div');
      el.className = `toast toast-${type}`;
      el.innerHTML = `<span class="toast-icon">${icons[type]||'ℹ️'}</span>
        <span class="toast-msg">${escHtml(msg)}</span>
        <button class="toast-close" onclick="this.parentElement.remove()">✕</button>`;
      stack.appendChild(el);
      setTimeout(() => { el.classList.add('fade-out'); el.addEventListener('animationend', () => el.remove()); }, 3800);
    },

    /* ── Util-Methoden (für Templates) ──────── */
    assetUrl(v)       { return assetUrl(v); },
    fmtDate(s)        { return fmtDate(s); },
    fmtDateShort(s)   { return fmtDateShort(s); },
    fmtSize(b)        { return fmtSize(b); },
    escHtml(s)        { return escHtml(s); },
    today()           { return today(); },
    colDef(name)      { return COLLECTION_DEFS[name]; },
    pageDefs()        { return PAGE_DEFS; },
    truncate(s, n=60) { const st = String(s || ''); return st.length > n ? st.slice(0,n)+'…' : st; },
  },

  mounted() {
    this.applyTheme(this.theme);
    this.checkAuth().then(() => this.loadView('dashboard'));
    document.getElementById('sidebarOverlay')?.addEventListener('click', () => this.closeSidebar());
  }
}).mount('#app');
