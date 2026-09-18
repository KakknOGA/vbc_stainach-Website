'use strict';
/* ═══════════════════════════════════════════════════════════════
   INHALTS-UPDATE 2026 – VBC Stainach

   seed.js befüllt nur leere Collections. Für eine bereits laufende
   Datenbank schreibt dieses Skript die korrigierten Inhalte nach:

     • Vereinsgeschichte (Timeline) auf die definitive Fassung
     • Erfolge-Panel an die Timeline angeglichen
     • Statistik-Leiste ("Volleyball seit 1985", Damen-Platz = Vorsaison)
     • Saison 2026/27, Herren 1 in der 2. Landesliga
     • Nur die tatsächlich geänderten Seitentexte

   Ausführen:  node scripts/update-content-2026.js --yes

   ACHTUNG: timeline, achievements und stats werden vollständig durch
   die Fassung unten ersetzt. Eigene Einträge, die seither im Admin-CMS
   angelegt wurden, gehen dabei verloren. Ohne --yes läuft das Skript als
   Trockenlauf und zeigt nur, was es tun würde.

   Die Inhalte entsprechen 1:1 den Blöcken in seed.js – wird dort etwas
   geändert, gehört es auch hier her.
═══════════════════════════════════════════════════════════════ */

require('dotenv').config();
const supabase = require('../lib/supabase');

const APPLY = process.argv.includes('--yes');

/* ───────────────────────── Inhalte ───────────────────────── */

const TIMELINE = [
  { year: '1968/69',   title: 'Erste Anfänge',                     text: 'Volleyball kommt als Schulsport an das BG/BRG Stainach — der Grundstein für alles Weitere.', sort_order: 1 },
  { year: '1980',      title: 'Erstes Weihnachtsturnier',          text: 'Das erste Weihnachtsturnier wird ausgetragen und entwickelt sich zur festen Tradition.', sort_order: 2 },
  { year: '1985',      title: 'Sektion Volleyball',                text: 'Volleyball wird eigene Sektion im SV Stainach — aufgebaut von Mag. Willibald Damm.', sort_order: 3 },
  { year: '1986/87',   title: 'Erste Jugendmannschaft',            text: 'Die erste Jugendmannschaft tritt an — und wird gleich steirischer Jugendmeister.', sort_order: 4 },
  { year: '1997',      title: 'Vereinsgründung',                   text: 'Am 19. Februar 1997 wird der Volleyballclub Stainach als eigenständiger Verein gegründet.', sort_order: 5 },
  { year: '1997/98',   title: 'Landesmeister & Aufstieg',          text: 'Erster Landesmeistertitel der Herren — und damit der erste Aufstieg in die 2. Bundesliga.', sort_order: 6 },
  { year: '2003/04',   title: 'Sieger 2. Bundesliga Ost',          text: 'Der Sieg in der 2. Bundesliga Ost (Frühjahr) ist der größte Erfolg der Vereinsgeschichte.', sort_order: 7 },
  { year: '2004',      title: 'Olympia — Florian Gosch',           text: 'Eigenbauspieler Florian Gosch vertritt Österreich bei den Olympischen Sommerspielen in Athen.', sort_order: 8 },
  { year: '2007/08',   title: 'Bis ins Aufstiegs-Play-off',        text: 'Eine starke Bundesligasaison führt bis ins Aufstiegs-Play-off — dort scheitert das Team knapp.', sort_order: 9 },
  { year: '2008/09',   title: 'Zweiter 2. Bundesliga Ost',         text: 'Rang zwei in der 2. Bundesliga Ost — es bleibt die letzte Bundesligasaison des Vereins.', sort_order: 10 },
  { year: '2009',      title: 'Rückkehr in die 1. Landesliga',     text: 'Der Verein kehrt in die 1. Landesliga zurück und baut dort neu auf.', sort_order: 11 },
  { year: '2010–2019', title: 'Fünf Landesmeistertitel',           text: '5× Landesmeister der 1. Landesliga Herren (2010/11, 2012/13, 2013/14, 2015/16, 2018/19) — dazu der Steirische Cup 2012/13.', sort_order: 12 },
  { year: '2025/26',   title: 'Erste Damenmannschaft',             text: 'Der Verein stellt erstmals eine Damenmannschaft — und wird im Frühjahr gleich Meister der 2. Gebietsliga.', sort_order: 13 },
  { year: 'Heute',     title: '3 aktive Mannschaften',             text: 'Mit drei Mannschaften schreibt der VBC Stainach seine Geschichte weiter.', sort_order: 14 }
];

const ACHIEVEMENTS = [
  { num: '1×',       title: 'Sieger 2. Bundesliga Ost',                sub: 'Saison 2003/04 (Frühjahr) · größter Erfolg der Vereinsgeschichte',        icon: 'Icons/trophy.svg',              featured: true,   sort_order: 1 },
  { num: 'Athen',    title: 'Olympische Sommerspiele 2004',            sub: 'Florian Gosch — Eigenbauspieler des VBC Stainach',                        icon: 'Icons/laurel-wreath.svg',       featured: true,   sort_order: 2 },
  { num: '5×',       title: 'Landesmeister 1. Landesliga Herren',      sub: '2010/11 · 2012/13 · 2013/14 · 2015/16 · 2018/19',                         icon: 'Icons/trophy (1).svg',          featured: true,   sort_order: 3 },
  { num: '1×',       title: 'Steirischer Cup',                         sub: 'Saison 2012/13',                                                          icon: 'Icons/award.svg',               featured: false,  sort_order: 4 },
  { num: '1×',       title: 'Meister 2. Gebietsliga Damen NW',         sub: 'Saison 2025/26 (Frühjahr) · erste Damenmannschaft des Vereins',           icon: 'Icons/gold-medal.svg',          featured: false,  sort_order: 5 },
  { num: '2.',       title: 'Vizemeister 2. Bundesliga Ost',           sub: 'Saison 2008/09 · letzte Bundesligasaison',                                icon: 'Icons/podium.svg',              featured: false,  sort_order: 6 },
  { num: '1997/98',  title: '1. Herren-Landesmeistertitel',            sub: 'Erster Aufstieg in die 2. Bundesliga',                                    icon: 'Icons/trophy (1).svg',          featured: false,  sort_order: 7 },
  { num: '18',       title: 'Steirische Nachwuchsmeistertitel',        sub: 'Herausragende Jugendarbeit über Jahrzehnte',                              icon: 'Icons/gold-medal.svg',          featured: false,  sort_order: 8 }
];

const STATS = [
  { value: '49',   label: 'Aktive Spieler',            sort_order: 1 },
  { value: '3',    label: 'Mannschaften',              sort_order: 2 },
  { value: '1.',   label: 'Platz Damen 2GLD · 2025/26', sort_order: 3 },
  { value: '1985', label: 'Volleyball seit',           sort_order: 4 }
];

/* Teams: nur Liga, Saison und Kontakt-Adresse – Kader bleibt unberührt. */
const TEAMS = [
  { key: 'herren1', league: '2. Landesliga Herren',    season: 'Saison 2026/27', email: 'herren1@vbcstainach.com' },
  { key: 'damen1',  league: '2. Gebietsliga Damen NW', season: 'Saison 2026/27', email: 'damen1@vbcstainach.com'  },
  { key: 'herren2', league: '2. Gebietsliga Herren NW', season: 'Saison 2026/27', email: 'herren2@vbcstainach.com' }
];

/* Nur diese Seitentexte wurden inhaltlich korrigiert – alles andere
   im CMS gepflegte bleibt unangetastet. */
const PAGES = [
  { page: 'startseite', section: 'contact_email',
    content: 'info@vbcstainach.com' },
  { page: 'startseite', section: 'contact_venue',
    content: 'Sporthalle Stainach' },
  { page: 'startseite', section: 'history_text1',
    content: 'Die Geschichte des VBC Stainach reicht bis in die 1960er-Jahre zurück: Was 1968/69 als Schulsport am BG/BRG Stainach begann, wurde 1985 zur eigenen Volleyball-Sektion im SV Stainach und 1997 zum eigenständigen Verein.' },
  { page: 'startseite', section: 'history_text2',
    content: 'Über die Jahrzehnte hat der Verein nicht nur sportliche Erfolge gefeiert — vom ersten Landesmeistertitel 1997/98 über den Sieg in der 2. Bundesliga Ost 2003/04 bis zu fünf Landesmeistertiteln zwischen 2010 und 2019 — sondern auch eine lebendige Gemeinschaft aufgebaut. Spieler, die als Jugendliche begannen, sind heute Trainer, Funktionäre und Eltern der nächsten Generation.' },
  { page: 'startseite', section: 'history_text3',
    content: 'Highlights wie die Teilnahme des Eigenbauspielers Florian Gosch an den Olympischen Spielen 2004 in Athen zeigen, welches Potenzial in diesem Verein steckt. Der VBC Stainach ist mehr als ein Verein — er ist ein Stück Heimat.' },
  { page: 'teams', section: 'page_sub',
    content: 'Alle aktiven Spielerinnen und Spieler in der Saison 2026/27.' }
];

/* ───────────────────────── Schreibvorgänge ───────────────────────── */

/* Collection komplett ersetzen. Die ID-Vergabe übernimmt Postgres –
   die Reihenfolge steuert sort_order. */
async function replaceCollection(name, rows) {
  if (!APPLY) {
    console.log(`→  ${name}: würde ersetzt werden durch ${rows.length} Einträge`);
    return;
  }
  const { error: delErr } = await supabase.from(name).delete().gte('id', 0);
  if (delErr) throw delErr;

  const { error: insErr } = await supabase.from(name).insert(rows);
  if (insErr) throw insErr;

  console.log(`✔  ${name}: ${rows.length} Einträge neu geschrieben`);
}

/* Teams werden nicht gelöscht (Spieler hängen per team_id daran),
   sondern anhand des Keys aktualisiert. */
async function updateTeams() {
  for (const { key, ...fields } of TEAMS) {
    if (!APPLY) {
      console.log(`→  Team "${key}": ${fields.league} · ${fields.season}`);
      continue;
    }
    const { error } = await supabase.from('teams').update(fields).eq('key', key);
    if (error) throw error;
    console.log(`✔  Team "${key}": ${fields.league} · ${fields.season}`);
  }
}

/* Seitentexte: vorhandene aktualisieren, fehlende (contact_venue) anlegen. */
async function updatePages() {
  const { data: existing, error } = await supabase.from('pages').select('id, page, section');
  if (error) throw error;

  const byKey = {};
  (existing || []).forEach(r => { byKey[r.page + ':' + r.section] = r.id; });

  const now = new Date().toISOString();

  for (const { page, section, content } of PAGES) {
    const id = byKey[page + ':' + section];
    if (!APPLY) {
      console.log(`→  pages ${page}:${section}: ${id ? 'aktualisieren' : 'neu anlegen'}`);
      continue;
    }
    if (id) {
      const { error: e } = await supabase
        .from('pages').update({ content, updated_at: now }).eq('id', id);
      if (e) throw e;
      console.log(`✔  pages ${page}:${section}: aktualisiert`);
    } else {
      const { error: e } = await supabase
        .from('pages').insert({ page, section, content, updated_at: now });
      if (e) throw e;
      console.log(`✔  pages ${page}:${section}: neu angelegt`);
    }
  }
}

(async () => {
  try {
    if (!APPLY) console.log('— TROCKENLAUF — nichts wird geschrieben. Mit --yes ausführen.\n');
    await replaceCollection('timeline',     TIMELINE);
    await replaceCollection('achievements', ACHIEVEMENTS);
    await replaceCollection('stats',        STATS);
    await updateTeams();
    await updatePages();
    console.log(APPLY ? '\n✅  Inhalts-Update abgeschlossen.'
                      : '\n✅  Trockenlauf beendet. Zum Schreiben: node scripts/update-content-2026.js --yes');
  } catch (err) {
    console.error('❌  Update fehlgeschlagen:', err.message || err);
    process.exit(1);
  }
})();
