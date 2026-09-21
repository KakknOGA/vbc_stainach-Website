'use strict';

/* ════════════════════════════════════════════════════════════════
   STVV-SPIELPLAN – SERVERSEITIGER ABRUF
   ────────────────────────────────────────────────────────────────
   Holt den Ligaspielplan von Volleystation und liefert die Spiele
   der 1. Mannschaft normalisiert zurück (Parser: ./stvv-parse).

   Cloudflare blockt Node am TLS-Fingerprint (403) – auf Railway
   schlägt der Abruf daher voraussichtlich fehl. Das ist eingeplant:
   getTeamFixtures() wirft nie, sondern meldet ok:false, und die
   Startseite holt den Spielplan dann direkt im Browser nach.
════════════════════════════════════════════════════════════════ */

const parser = require('./stvv-parse');

const SCHEDULE_URL = process.env.STVV_SCHEDULE_URL
  || 'https://panel.volleystation.com/website/138/de/schedule/';
const TEAM_NAME   = process.env.STVV_TEAM   || 'VBC Stainach 1';
const LEAGUE_NAME = process.env.STVV_LEAGUE || '2. Landesliga Herren';
const HOME_VENUE  = process.env.STVV_VENUE  || 'Sporthalle Stainach';
const BASE_URL    = new URL(SCHEDULE_URL).origin;

const TTL_OK   = 6 * 60 * 60 * 1000;  /* 6 h – Spielpläne ändern sich selten */
const TTL_FAIL = 15 * 60 * 1000;      /* nach einem Fehler früher neu versuchen */

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
         + '(KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';

const CONFIG = {
  url:    SCHEDULE_URL,
  team:   TEAM_NAME,
  league: LEAGUE_NAME,
  venue:  HOME_VENUE
};

let cache = { at: 0, ttl: 0, ok: false, fixtures: [], error: null };

async function fetchSchedule() {
  const res = await fetch(SCHEDULE_URL, {
    headers: { 'User-Agent': UA, 'Accept-Language': 'de-AT,de;q=0.9' },
    signal: AbortSignal.timeout(12000)
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

/**
 * Liefert { ok, fixtures, error, fetchedAt }.
 * Bei einem Fehler bleibt der letzte erfolgreiche Stand erhalten,
 * damit ein kurzer Ausfall die Startseite nicht leert.
 */
async function getTeamFixtures({ force = false } = {}) {
  if (!force && cache.at && Date.now() - cache.at < cache.ttl) return snapshot();

  try {
    const rows     = parser.parseSchedule(await fetchSchedule());
    const fixtures = parser.toFixtures(rows, {
      team: TEAM_NAME, league: LEAGUE_NAME, venue: HOME_VENUE, baseUrl: BASE_URL
    });
    cache = { at: Date.now(), ttl: TTL_OK, ok: true, fixtures, error: null };
  } catch (e) {
    cache = {
      at: Date.now(), ttl: TTL_FAIL,
      ok: false,
      fixtures: cache.fixtures || [],
      error: e.name === 'TimeoutError' ? 'Zeitüberschreitung' : e.message
    };
  }
  return snapshot();
}

function snapshot() {
  return {
    ok: cache.ok,
    fixtures: cache.fixtures,
    error: cache.error,
    fetchedAt: cache.at ? new Date(cache.at).toISOString() : null
  };
}

module.exports = { getTeamFixtures, config: CONFIG, parser };
