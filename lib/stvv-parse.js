/* ════════════════════════════════════════════════════════════════
   STVV-SPIELPLAN – PARSER (Browser + Node)
   ────────────────────────────────────────────────────────────────
   Der Steirische Volleyballverband stellt seinen Spielplan über
   Volleystation bereit (iFrame auf stvv.at). Die Seite ist server-
   seitig gerendert, das HTML lässt sich also direkt auswerten.

   Wichtig: Cloudflare erkennt Node/OpenSSL am TLS-Fingerprint und
   antwortet dort mit 403. Aus dem Browser klappt der Abruf dagegen
   (die Seite schickt CORS-Header) – deshalb liegt der Parser hier
   als gemeinsames Modul und wird von beiden Seiten verwendet:
     • server.js  → Abruf mit Cache, sofern die Umgebung darf
     • cms.js     → Fallback direkt im Browser des Besuchers
════════════════════════════════════════════════════════════════ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.StvvParse = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var MONTHS = {
    'jänner': 1, 'janner': 1, 'januar': 1, 'februar': 2, 'märz': 3, 'marz': 3,
    'maerz': 3, 'april': 4, 'mai': 5, 'juni': 6, 'juli': 7, 'august': 8,
    'september': 9, 'oktober': 10, 'november': 11, 'dezember': 12
  };

  function decode(s) {
    return s
      .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'")
      .replace(/&auml;/g, 'ä').replace(/&ouml;/g, 'ö').replace(/&uuml;/g, 'ü')
      .replace(/&Auml;/g, 'Ä').replace(/&Ouml;/g, 'Ö').replace(/&Uuml;/g, 'Ü')
      .replace(/&szlig;/g, 'ß').replace(/&amp;/g, '&');
  }

  function text(html) {
    return decode(String(html).replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
  }

  /* Namensvergleich robust gegen Schreibweisen ("VBC Stainach 1" ↔ "VBC-Stainach1") */
  function norm(s) {
    return String(s || '').toLowerCase().replace(/[\s.\-_]/g, '');
  }

  function pad(n) { return String(n).length < 2 ? '0' + n : String(n); }

  /* "3 Oktober 2026, Samstag" → "2026-10-03" */
  function parseHeadingDate(raw) {
    var m = text(raw).match(/(\d{1,2})\.?\s+([A-Za-zÄÖÜäöüß]+)\.?\s+(\d{4})/);
    if (!m) return null;
    var month = MONTHS[m[2].toLowerCase()];
    if (!month) return null;
    return m[3] + '-' + pad(month) + '-' + pad(parseInt(m[1], 10));
  }

  function parseRow(html) {
    var homeM = html.match(/class="rival home[^"]*"[\s\S]*?class="name"\s*>([\s\S]*?)<\/div>/);
    var awayM = html.match(/class="rival away[^"]*"[\s\S]*?class="name"\s*>([\s\S]*?)<\/div>/);
    if (!homeM || !awayM) return null;

    var statusM = html.match(/class="status[^"]*"\s*>([\s\S]*?)<\/div>/);
    var status  = statusM ? text(statusM[1]) : '';
    /* Nur echte Uhrzeiten übernehmen – gespielte Partien zeigen an
       derselben Stelle das Satzergebnis (z. B. 3:1). */
    var timeM = status.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);

    var roundM = html.match(/class="round"\s*>([\s\S]*?)<\/div>/);
    var hrefM  = html.match(/href="([^"]*\/matches\/\d+\/?)"/);

    return {
      home:  text(homeM[1]),
      away:  text(awayM[1]),
      time:  timeM ? pad(timeM[1]) + ':' + timeM[2] : '',
      round: roundM ? text(roundM[1]) : '',
      href:  hrefM ? hrefM[1] : ''
    };
  }

  /* Komplette Spielplanseite → [{date, time, home, away, round, href}] */
  function parseSchedule(html) {
    var out = [];
    /* Jeder Spieltag liegt in einem eigenen Block mit <h3>Datum</h3>. */
    var blocks = String(html).split(/<div class="table list matches">/).slice(1);

    blocks.forEach(function (block) {
      var headM = block.match(/<h3[^>]*>([\s\S]*?)<\/h3>/);
      var date  = headM ? parseHeadingDate(headM[1]) : null;
      if (!date) return;

      var re = /<a\s+href="([^"]*\/matches\/\d+\/?)"[^>]*>([\s\S]*?)<\/a>/g, m;
      while ((m = re.exec(block)) !== null) {
        var row = parseRow('<a href="' + m[1] + '">' + m[2]);
        if (row) { row.date = date; out.push(row); }
      }
    });
    return out;
  }

  /* Rohzeilen → Termine einer Mannschaft im Format der Startseite */
  function toFixtures(rows, opts) {
    opts = opts || {};
    var team   = opts.team   || 'VBC Stainach 1';
    var league = opts.league || '';
    var venue  = opts.venue  || '';
    var base   = opts.baseUrl || '';

    return rows
      .filter(function (r) { return norm(r.home) === norm(team) || norm(r.away) === norm(team); })
      .map(function (r) {
        var isHome = norm(r.home) === norm(team);
        return {
          source:   'stvv',
          id:       'stvv-' + r.date + '-' + norm(r.home) + '-' + norm(r.away),
          date:     r.date,
          time:     r.time,
          home:     r.home,
          away:     r.away,
          type:     isHome ? 'home' : 'away',
          location: isHome ? venue : r.home,
          league:   league,
          round:    r.round,
          url:      r.href && base ? base.replace(/\/+$/, '') + r.href : r.href
        };
      });
  }

  return {
    parseSchedule: parseSchedule,
    toFixtures: toFixtures,
    parseHeadingDate: parseHeadingDate,
    norm: norm
  };
}));
