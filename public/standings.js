/* ════════════════════════════════════════════════════════════════
   LIGATABELLEN – LIVE-STAND
   ────────────────────────────────────────────────────────────────
   Ersetzt die statischen 2026/27-Tabellen in matches.html
   (Panels mit data-standings="h1|h2|d1") durch den aktuellen
   Stand von stvv.at, den der Server unter /api/standings liefert.
   Ist die API nicht erreichbar, bleibt das statische HTML stehen.
════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const panels = document.querySelectorAll('[data-standings]');
  if (!panels.length) return;

  function esc(s) {
    return String(s).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[c]);
  }

  function fmtDate(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric' })
      + ', ' + d.toLocaleTimeString('de-AT', { hour: '2-digit', minute: '2-digit' }) + ' Uhr';
  }

  function rowHtml(r, table, started) {
    const own = r.team === table.team;
    const medal = started && r.rank <= 3 ? ['gold', 'silver', 'bronze'][r.rank - 1] : '';
    const rank = medal ? `<span class="rank ${medal}">${r.rank}</span>` : r.rank;
    const ratio = r.setsWon || r.setsLost ? esc(r.ratio) : '&ndash;';
    return `
              <tr${own ? ' class="row-own"' : ''}>
                <td>${rank}</td>
                <td class="td-team">${own ? '<span class="own-dot"></span>' : ''}${esc(r.team)}</td>
                <td>${r.won}</td><td><strong>${r.points}</strong></td><td>${r.played}</td><td>${r.lost}</td><td>${r.setsWon}</td><td>${r.setsLost}</td><td>${ratio}</td>
              </tr>`;
  }

  function render(panel, table) {
    const tbody = panel.querySelector('.standings-table tbody');
    if (!tbody || !table || !table.rows || !table.rows.length) return;

    const started = table.rows.some(r => r.played > 0);
    tbody.innerHTML = table.rows.map(r => rowHtml(r, table, started)).join('') + '\n            ';

    const label = panel.querySelector('.table-label');
    if (label) {
      label.innerHTML = `${esc(table.phase || table.title)} &nbsp;|&nbsp; `
        + (started ? 'Aktueller Stand' : 'Ausgangstabelle vor dem 1. Spieltag');
    }

    const note = panel.querySelector('.table-note');
    if (note) {
      note.innerHTML = 'Wird automatisch aktualisiert. '
        + `Quelle: <a href="${esc(table.url)}" target="_blank" rel="noopener">Steirischer Volleyballverband (stvv.at)</a>`
        + (table.fetchedAt ? `, Stand ${esc(fmtDate(table.fetchedAt))}.` : '.');
    }
  }

  fetch('/api/standings', { headers: { Accept: 'application/json' } })
    .then(r => (r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status))))
    .then(data => {
      panels.forEach(panel => {
        const table = data.tables && data.tables[panel.dataset.standings];
        if (table && table.ok !== false) render(panel, table);
      });
    })
    .catch(() => { /* statischer Fallback bleibt stehen */ });
})();
