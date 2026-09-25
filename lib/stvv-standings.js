'use strict';

/* ════════════════════════════════════════════════════════════════
   STVV-LIGATABELLEN – SERVERSEITIGER ABRUF
   ────────────────────────────────────────────────────────────────
   Holt die aktuellen Tabellen unserer drei Mannschaften von
   stvv.at (/levels/<id>/standings). Die Seite zeigt immer die
   gerade laufende Phase (Grunddurchgang, Frühjahr, Platzierung …)
   samt Überschrift „Liga - Phase“ – ein Phasenwechsel braucht
   daher keine Code-Änderung.

   stvv.at liegt nicht hinter Cloudflare, Node-fetch klappt dort
   (anders als bei Volleystation, siehe stvv-schedule.js).
   getStandings() wirft nie; schlägt ein Abruf fehl, bleibt der
   letzte gute Stand erhalten bzw. die Seite zeigt ihren
   statischen HTML-Fallback.
════════════════════════════════════════════════════════════════ */

const BASE_URL = 'https://stvv.at';

/* Neue Saison: Level-IDs aus dem Menü von stvv.at übernehmen. */
const TEAMS = [
  { key: 'h1', level: 58231, team: 'VBC Stainach 1' },  /* 2. Landesliga Herren  */
  { key: 'h2', level: 58229, team: 'VBC Stainach 2' },  /* 2. Gebietsliga Herren */
  { key: 'd1', level: 58228, team: 'VBC Stainach'   }   /* 2. Gebietsliga Damen  */
];

const TTL_OK   = 30 * 60 * 1000;  /* Spieltage sind am Wochenende – 30 min reicht */
const TTL_FAIL =  5 * 60 * 1000;

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
         + '(KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';

let cache = { at: 0, ttl: 0, tables: {} };
let pending = null;

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

function text(html) {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(#x?[0-9a-f]+|\w+);/gi, (m, e) => {
      if (e[0] === '#') {
        const n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
        return Number.isFinite(n) ? String.fromCodePoint(n) : m;
      }
      return ENTITIES[e.toLowerCase()] ?? m;
    })
    .replace(/\s+/g, ' ')
    .trim();
}

function num(s) {
  const n = parseFloat(String(s).replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

/**
 * Liest die (einzige) Tabelle einer stvv.at-Standings-Seite.
 * Spalten: # | Team | S | Punkte | Sp | N | Sets Won | Sets Lost | SV | BV
 */
function parseStandings(html) {
  const start = html.indexOf('<table');
  const end   = html.indexOf('</table>', start);
  if (start < 0 || end < 0) throw new Error('Keine Tabelle gefunden');

  /* Überschrift „Liga - Phase“ steht als letzter Text vor der Tabelle. */
  const before = html.slice(Math.max(0, start - 3000), start);
  const heads  = before.split(/<[^>]*>/).map(s => text(s)).filter(Boolean);
  const title  = heads.length ? heads[heads.length - 1] : '';
  const dash   = title.indexOf(' - ');
  const phase  = dash >= 0 ? title.slice(dash + 3) : '';

  const body = html.slice(html.indexOf('<tbody', start), end);
  const rows = [];
  for (const tr of body.split(/<tr[\s>]/).slice(1)) {
    const cells = tr.split(/<td[\s>]/).slice(1).map(c => '<' + c);
    if (cells.length < 9) continue;
    const name = (cells[1].match(/truncate">([^<]+)</) || [])[1];
    rows.push({
      rank:     parseInt(text(cells[0]), 10) || rows.length + 1,
      team:     name ? text(name) : text(cells[1]),
      won:      num(text(cells[2])),
      points:   num(text(cells[3])),
      played:   num(text(cells[4])),
      lost:     num(text(cells[5])),
      setsWon:  num(text(cells[6])),
      setsLost: num(text(cells[7])),
      ratio:    text(cells[8])
    });
  }
  if (!rows.length) throw new Error('Tabelle ohne Zeilen');
  return { title, phase, rows };
}

async function fetchTable({ key, level, team }) {
  const url = `${BASE_URL}/levels/${level}/standings`;
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, 'Accept-Language': 'de-AT,de;q=0.9' },
    signal: AbortSignal.timeout(12000)
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const parsed = parseStandings(await res.text());
  if (!parsed.rows.some(r => r.team === team)) throw new Error(`${team} nicht in der Tabelle`);
  return { key, ok: true, url, team, ...parsed, error: null };
}

async function refresh() {
  const results = await Promise.allSettled(TEAMS.map(fetchTable));
  const tables = {};
  let allOk = true;
  results.forEach((r, i) => {
    const { key } = TEAMS[i];
    if (r.status === 'fulfilled') {
      tables[key] = { ...r.value, fetchedAt: new Date().toISOString() };
    } else {
      allOk = false;
      const e = r.reason;
      const error = e && e.name === 'TimeoutError' ? 'Zeitüberschreitung' : (e && e.message) || 'Fehler';
      /* letzten guten Stand behalten, nur den Fehler vermerken */
      tables[key] = cache.tables[key] ? { ...cache.tables[key], error } : { key, ok: false, error };
    }
  });
  cache = { at: Date.now(), ttl: allOk ? TTL_OK : TTL_FAIL, tables };
}

async function getStandings({ force = false } = {}) {
  if (force || !cache.at || Date.now() - cache.at >= cache.ttl) {
    /* parallele Anfragen teilen sich einen Abruf */
    pending = pending || refresh().finally(() => { pending = null; });
    await pending;
  }
  return { tables: cache.tables };
}

module.exports = { getStandings, parseStandings, TEAMS };
