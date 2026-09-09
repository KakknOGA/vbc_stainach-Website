/* ═══════════════════════════════════════════════════════════════
   VBC Stainach – CMS-Loader (öffentliche Website)
   Lädt alle Inhalte dynamisch aus der Datenbank (/api/…) und
   rendert sie in die Seiten. Das statische HTML bleibt als
   Fallback bestehen: Wird die API nicht erreicht (z. B. Seite
   direkt als Datei geöffnet), bleibt der alte Inhalt sichtbar.
═══════════════════════════════════════════════════════════════ */
'use strict';

(function () {

  /* ── Utilities ──────────────────────────────────────────── */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  /* Mehrzeilige Texte sicher zu HTML (Zeilenumbruch → <br>) */
  function escMl(s) { return esc(s).replace(/\n/g, '<br>'); }

  async function getJson(url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  }

  /* ════════════════════════════════════════════════════════
     1) TEXTBAUSTEINE  – Elemente mit data-cms="seite:sektion"
        data-cms-html → Zeilenumbrüche werden zu <br>
  ════════════════════════════════════════════════════════ */
  async function applyContent() {
    const els = document.querySelectorAll('[data-cms]');
    if (!els.length) return;
    const rows = await getJson('/api/pages');
    const map = {};
    rows.forEach(r => { map[r.page + ':' + r.section] = r.content; });

    els.forEach(el => {
      const val = map[el.getAttribute('data-cms')];
      if (val === undefined || val === '') return;
      if (el.hasAttribute('data-cms-hero')) {
        /* Hero-Titel: Zeilenstruktur (.hero-title-line) muss für die
           Buchstaben-Animation aus script.js erhalten bleiben.
           Nur neu aufbauen, wenn sich der Text wirklich unterscheidet —
           sonst würde die laufende Animation zerstört. */
        const lines   = val.split('\n').map(l => l.trim()).filter(Boolean);
        const current = [...el.querySelectorAll('.hero-title-line')]
          .map(l => l.textContent.trim());
        if (lines.join('\n') === current.join('\n')) return;
        el.innerHTML = lines.map((l, i) =>
          `<span class="hero-title-line${i > 0 ? ' hero-title-line-small' : ''}">${esc(l)}</span>`
        ).join('');
        if (typeof window.refreshHeroTitle === 'function') window.refreshHeroTitle();
      }
      else if (el.hasAttribute('data-cms-html')) el.innerHTML = escMl(val);
      else if (el.tagName === 'A' && el.href.startsWith('mailto:')) {
        el.textContent = val;
        el.href = 'mailto:' + val;
      }
      else el.textContent = val;
    });
  }

  /* ════════════════════════════════════════════════════════
     2) STATISTIK-LEISTE (Startseite)
  ════════════════════════════════════════════════════════ */
  async function renderStats() {
    const grid = document.querySelector('[data-cms-stats]');
    if (!grid) return;
    const stats = await getJson('/api/collections/stats');
    if (!stats.length) return;
    grid.innerHTML = stats.map(s => `
      <div class="stat-item">
        <div class="stat-num">${escMl(s.value)}</div>
        <div class="stat-lbl">${esc(s.label)}</div>
      </div>`).join('');
  }

  /* ════════════════════════════════════════════════════════
     3) NÄCHSTE SPIELE (Startseite)
  ════════════════════════════════════════════════════════ */
  async function renderGames() {
    const el = document.getElementById('gameList');
    if (!el) return;
    let games = [];
    try { games = await getJson('/api/collections/games'); } catch { /* Fallback unten */ }

    if (!games.length) {
      el.innerHTML = `<div class="games-empty">
        Derzeit sind keine kommenden Spiele eingetragen.<br>
        <span style="font-size:0.8125rem;margin-top:0.618rem;display:block">
          Aktuelle Tabellen und Ergebnisse findest du auf
          <a href="matches.html">unserer Tabellen-Seite</a>.
        </span>
      </div>`;
      return;
    }
    el.innerHTML = games.map(g => `
      <div class="game-card">
        <div class="game-date">
          <div class="game-day">${esc(g.day)}</div>
          <div class="game-month">${esc(g.month)}</div>
        </div>
        <div class="game-body">
          <div class="game-teams">
            <div class="game-home">${esc(g.home)}</div>
            <div class="game-vs">vs.</div>
            <div class="game-away">${esc(g.away)}</div>
          </div>
          <div class="game-meta">
            <div class="game-meta-item">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              ${esc(g.time)}
            </div>
            <div class="game-meta-item">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              ${esc(g.location)}
            </div>
            <div class="game-meta-item" style="font-size:0.6875rem;color:rgba(255,255,255,0.28)">${esc(g.league)}</div>
          </div>
          <span class="game-badge ${g.type === 'home' ? 'badge-home' : 'badge-away'}">
            ${g.type === 'home' ? 'Heimspiel' : 'Auswärts'}
          </span>
        </div>
        <div class="game-action">
          <a href="matches.html" class="btn btn-outline" style="font-size:0.625rem;padding:10px 18px">Details</a>
        </div>
      </div>`).join('');
  }

  /* ════════════════════════════════════════════════════════
     4) TEAM-ÜBERSICHTSKARTEN (Startseite)
  ════════════════════════════════════════════════════════ */
  const TEAM_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 1 10 10M2 12a10 10 0 0 1 10-10M12 22a10 10 0 0 1-10-10M22 12a10 10 0 0 1-10 10"/><path d="M2 12h20M12 2v20"/></svg>';
  const ARROW_ICON = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>';

  async function renderTeamCards(teams) {
    const grid = document.querySelector('[data-cms-teams]');
    if (!grid || !teams.length) return;
    grid.innerHTML = teams.map(t => `
      <div class="team-overview-card">
        <div class="toc-visual">
          ${t.image ? `<img src="${esc(t.image)}" alt="${esc(t.name)} Team" loading="lazy">` : ''}
          <div class="toc-icon">${TEAM_ICON}</div>
          <div class="toc-accentbar"></div>
        </div>
        <div class="toc-body">
          <div class="toc-tag">${esc(t.league)}</div>
          <h3 class="toc-title">${esc(t.name)}</h3>
          <div class="toc-claim">${esc(t.claim)}</div>
          <p class="toc-desc">${esc(t.description)}</p>
          <a href="team.html" class="toc-link" aria-label="Zum Kader ${esc(t.name)}">
            Kader ansehen ${ARROW_ICON}
          </a>
        </div>
      </div>`).join('');
  }

  /* ════════════════════════════════════════════════════════
     5) KONTAKT-KARTEN PRO TEAM (Startseite)
  ════════════════════════════════════════════════════════ */
  const MAIL_ICON = '<img src="Icons/mail.svg" class="icon-svg" alt="" width="20" height="20" aria-hidden="true">';

  function renderTeamContacts(teams) {
    const grid = document.querySelector('[data-cms-contacts]');
    if (!grid || !teams.length) return;
    grid.innerHTML = teams.map(t => `
      <div class="contact-team-card">
        <div class="ctc-header">
          <div class="ctc-badge">${esc(t.name)}</div>
          <div class="ctc-league">${esc(t.league)}</div>
        </div>
        <div class="ctc-body">
          <div class="contact-card">
            <div class="contact-icon">${MAIL_ICON}</div>
            <div>
              <div class="contact-label">E-Mail</div>
              ${t.email
                ? `<a href="mailto:${esc(t.email)}" class="contact-value">${esc(t.email)}</a>`
                : '<span class="contact-value contact-value--pending">E-Mail folgt</span>'}
            </div>
          </div>
        </div>
      </div>`).join('');
  }

  /* ════════════════════════════════════════════════════════
     6) VORSTAND (Startseite)
  ════════════════════════════════════════════════════════ */
  async function renderBoard() {
    const grid = document.querySelector('[data-cms-board]');
    if (!grid) return;
    const board = await getJson('/api/collections/board');
    if (!board.length) return;
    grid.innerHTML = board.map(m => `
      <div class="board-card ${m.featured ? 'primary' : ''}">
        <div class="board-avatar-wrap">
          ${m.photo
            ? `<img src="${esc(m.photo)}" alt="${esc(m.name)}" style="width:100%;height:100%;object-fit:cover;border-radius:inherit">`
            : `<div class="person-placeholder">${esc(m.initials || (m.name || '?').split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase())}</div>`}
        </div>
        <div class="board-info">
          <div class="board-role">${esc(m.role)}</div>
          <div class="board-name">${esc(m.name)}</div>
          ${m.photo ? '' : '<div class="board-photo-note">Foto folgt</div>'}
        </div>
      </div>`).join('');
  }

  /* ════════════════════════════════════════════════════════
     7) SPONSOREN-MARQUEE (Startseite)
  ════════════════════════════════════════════════════════ */
  const SPONSOR_PLACEHOLDER = `
    <div class="sponsor-placeholder">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 12h6M12 9v6"/></svg>
      <span>Logo folgt</span>
    </div>`;

  async function renderSponsors() {
    const track = document.querySelector('[data-cms-sponsors]');
    if (!track) return;
    const sponsors = await getJson('/api/collections/sponsors');
    if (!sponsors.length) return;   /* Platzhalter aus dem HTML behalten */

    const card = s => `
      <div class="sponsor-logo-card" role="listitem">
        ${s.url ? `<a href="${esc(s.url)}" target="_blank" rel="noopener" title="${esc(s.name)}">` : ''}
        ${s.logo
          ? `<img src="${esc(s.logo)}" alt="${esc(s.name)}" style="max-width:140px;max-height:64px;object-fit:contain">`
          : SPONSOR_PLACEHOLDER}
        ${s.url ? '</a>' : ''}
      </div>`;
    /* 3× wiederholen für nahtlosen Marquee-Loop */
    track.innerHTML = sponsors.map(card).join('') +
                      sponsors.map(card).join('') +
                      sponsors.map(card).join('');
  }

  /* ════════════════════════════════════════════════════════
     8) ZEITLEISTE & ERFOLGE (Startseite)
  ════════════════════════════════════════════════════════ */
  async function renderTimeline() {
    const wrap = document.querySelector('[data-cms-timeline]');
    if (!wrap) return;
    const items = await getJson('/api/collections/timeline');
    if (!items.length) return;
    wrap.innerHTML = items.map(t => `
      <div class="timeline-item">
        <div class="tl-year">${esc(t.year)}</div>
        <div class="tl-title">${esc(t.title)}</div>
        <div class="tl-text">${esc(t.text)}</div>
      </div>`).join('');
  }

  async function renderAchievements() {
    const grid = document.querySelector('[data-cms-achievements]');
    if (!grid) return;
    const items = await getJson('/api/collections/achievements');
    if (!items.length) return;
    grid.innerHTML = items.map(a => `
      <div class="achievement-card ${a.featured ? 'featured' : ''}">
        <div class="ach-icon">
          ${a.icon ? `<img src="${esc(a.icon)}" alt="" aria-hidden="true" width="26" height="26" style="filter:brightness(0) invert(1) sepia(1) saturate(3) hue-rotate(190deg)">` : '🏆'}
        </div>
        <div class="ach-num" ${a.num.length > 4 ? 'style="font-size:1.75rem"' : ''}>${esc(a.num)}</div>
        <div class="ach-title">${esc(a.title)}</div>
        <div class="ach-sub">${esc(a.sub)}</div>
      </div>`).join('');
  }

  /* ════════════════════════════════════════════════════════
     9) GALERIE + LIGHTBOX (Startseite)
  ════════════════════════════════════════════════════════ */
  async function renderGallery() {
    const grid = document.querySelector('[data-cms-gallery]');
    if (!grid) return;
    const items = await getJson('/api/collections/gallery');
    if (!items.length) return;

    const ZOOM = '<div class="gal-zoom-icon" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg></div>';
    grid.innerHTML = items.map((g, i) => `
      <div class="gal-item-new ${g.span === 'wide' ? 'g-span2' : g.span === 'tall' ? 'g-tall' : ''}"
           onclick="openLightbox(${i})" role="button" tabindex="0"
           aria-label="Bild ${i + 1} vergrößern" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openLightbox(${i})}">
        <img src="${esc(g.image)}" alt="${esc(g.alt || 'VBC Stainach Volleyball')}" loading="lazy">
        ${ZOOM}
      </div>`).join('');

    /* Lightbox-Quellen aktualisieren (siehe Inline-Script index.html) */
    if (typeof window.setGalleryImages === 'function') {
      window.setGalleryImages(
        items.map(g => g.image),
        items.map(g => g.alt || 'VBC Stainach Volleyball')
      );
    }
  }

  /* ════════════════════════════════════════════════════════
     10) TEAM-SEITE – Tabs + Kader dynamisch
  ════════════════════════════════════════════════════════ */
  async function renderTeamPage(teams) {
    const tabsBar = document.querySelector('[data-cms-team-tabs]');
    const panels  = document.querySelector('[data-cms-team-panels]');
    if (!tabsBar || !panels || !teams.length) return;

    const players = await getJson('/api/collections/players');

    tabsBar.innerHTML = teams.map((t, i) => `
      <button class="team-tab-btn ${i === 0 ? 'active' : ''}" onclick="switchTeam('${esc(t.key || t.id)}')">
        ${esc(t.tab_label || t.name)}
      </button>`).join('');
    delete tabsBar.dataset.ariaReady;

    panels.innerHTML = teams.map((t, i) => {
      const roster = players.filter(p => p.team_id === t.id);
      const cards = roster.map(p => `
        <div class="team-card">
          <div class="tc-photo">${p.photo ? `<img src="${esc(p.photo)}" alt="${esc(p.name)}" style="width:100%;height:100%;object-fit:cover">` : '🏐'}</div>
          <div class="tc-body">
            <div class="tc-num">${esc(p.number)}</div>
            <div class="tc-name">${esc(p.name)}</div>
            <div class="tc-pos">${esc(p.position)}</div>
          </div>
        </div>`).join('');
      return `
      <div id="team-${esc(t.key || t.id)}" class="team-panel" ${i === 0 ? '' : 'style="display:none"'}>
        <section class="section section-mid reveal on">
          <div class="container">
            <div class="stitle">
              <h2>${esc(t.tab_label || t.name)}</h2>
              <p style="font-size:13px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--gold);margin-top:6px">
                ${esc(t.league)} &nbsp;&middot;&nbsp; ${esc(t.season || '')}
              </p>
            </div>
            <div class="team-grid">${cards || '<p style="color:#888">Noch keine Spieler eingetragen.</p>'}</div>
          </div>
        </section>
      </div>`;
    }).join('');
    if (typeof window.initAriaTabs === 'function') window.initAriaTabs();
  }

  /* ════════════════════════════════════════════════════════
     INIT – alles parallel laden, Fehler still schlucken
     (statisches HTML bleibt dann als Fallback stehen)
  ════════════════════════════════════════════════════════ */
  document.addEventListener('DOMContentLoaded', () => {
    const safe = fn => fn().catch(() => { /* Fallback: statischer Inhalt */ });

    safe(applyContent);
    safe(renderStats);
    safe(renderGames);
    safe(renderBoard);
    safe(renderSponsors);
    safe(renderTimeline);
    safe(renderAchievements);
    safe(renderGallery);

    /* Teams werden auf Startseite UND Team-Seite gebraucht */
    safe(async () => {
      const needTeams = document.querySelector('[data-cms-teams],[data-cms-contacts],[data-cms-team-tabs]');
      if (!needTeams) return;
      const teams = await getJson('/api/collections/teams');
      renderTeamCards(teams);
      renderTeamContacts(teams);
      renderTeamPage(teams);
    });
  });
})();
