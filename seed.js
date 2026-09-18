'use strict';
/* ═══════════════════════════════════════════════════════════════
   SEED / MIGRATION – VBC Stainach CMS (Supabase-Version)
   Befüllt nur leere Collections (idempotent – überschreibt nie
   vorhandene Daten). Wird beim Serverstart aufgerufen.
═══════════════════════════════════════════════════════════════ */

module.exports = async function seed(supabase) {

  async function seedIfEmpty(name, records) {
    const { count } = await supabase.from(name).select('*', { count: 'exact', head: true });
    if (count > 0) return false;
    const { error } = await supabase.from(name).insert(records);
    if (error) throw error;
    console.log(`✔  Collection "${name}" mit ${records.length} Einträgen migriert`);
    return true;
  }

  /* ════════════════ STATISTIK-LEISTE ════════════════════════ */
  await seedIfEmpty('stats', [
    { value: '49',  label: 'Aktive Spieler',        sort_order: 1 },
    { value: '3',   label: 'Mannschaften',          sort_order: 2 },
    { value: '1.',   label: 'Platz Damen 2GLD · 2025/26', sort_order: 3 },
    { value: '1985', label: 'Volleyball seit',          sort_order: 4 }
  ]);

  /* ════════════════ TEAMS ════════════════════════════════════ */
  await seedIfEmpty('teams', [
    {
      key: 'herren1', name: 'Herren 1', tab_label: '1. Mannschaft Herren',
      league: '2. Landesliga Herren', season: 'Saison 2026/27',
      claim: 'Erfahrung trifft Neuanfang',
      description: 'Die Herren 1 bestehen aus einer Mischung aus erfahrenen und jungen Spielern. Im Mittelpunkt stehen gemeinsames Training, Teamgeist und der Aufbau einer neuen, motivierten Mannschaft für die kommenden Jahre.',
      image: 'WebsiteAssets/Medien (2).jpg', email: 'herren1@vbcstainach.com', sort_order: 1
    },
    {
      key: 'damen1', name: 'Damen 1', tab_label: '1. Mannschaft Damen',
      league: '2. Gebietsliga Damen NW', season: 'Saison 2026/27',
      claim: 'Mit Freude zum Team',
      description: 'Unsere Damen 1 bestehen aus jungen Spielerinnen, die erste Erfahrungen im Volleyball sammeln. Mit viel Motivation und Freude am Sport wächst hier ein neues Team zusammen.',
      image: 'WebsiteAssets/Medien (1).jpg', email: 'damen1@vbcstainach.com', sort_order: 2
    },
    {
      key: 'herren2', name: 'Herren 2', tab_label: '2. Mannschaft Herren',
      league: '2. Gebietsliga Herren NW', season: 'Saison 2026/27',
      claim: 'Gemeinsam wachsen',
      description: 'Die Herren 2 setzen sich vor allem aus Schülern zusammen, die mit dem Volleyballsport begonnen haben. Das Team sammelt Schritt für Schritt Spielerfahrung und entwickelt sich gemeinsam weiter.',
      image: 'WebsiteAssets/Medien (4).jpg', email: 'herren2@vbcstainach.com', sort_order: 3
    }
  ]);

  /* ════════════════ SPIELER ══════════════════════════════════ */
  const { data: teams } = await supabase.from('teams').select('id, key');
  const tid = key => (teams?.find(t => t.key === key) || {}).id || 0;

  const h1 = [
    ['Manuel Aigner', 'Diagonal', 'Diagonalangreifer'], ['Matthias Buchberger', 'Libero', 'Libero'],
    ['Alexander Egger', 'Mitte', 'Mittelblocker'], ['Elias Gottsbacher', 'Spieler', '—'],
    ['Martin Hehn', 'Außen', 'Außenangreifer'], ['Florian Jäger', 'Mitte', 'Mittelblocker'],
    ['Roberto Klaric', 'Spieler', '—'], ['Stefan Krug', 'Außen', 'Außenangreifer'],
    ['Alexander Lichtenwöhrer', 'Zuspieler', 'Zuspieler'], ['Valentin Marschall', 'Spieler', '—'],
    ['Noah Meinzer', 'Mitte', 'Mittelblocker'], ['Nicklas Melbinger', 'Libero', 'Libero'],
    ['Johannes Neuwersch', 'Libero', 'Libero'], ['Matthias Neuwersch', 'Spieler', '—'],
    ['Wolfgang Neuwersch', 'Außen', 'Außenangreifer'], ['Alexander Oberegger', 'Zuspieler', 'Zuspieler'],
    ['Peter Prodinger', 'Spieler', '—'], ['Johannes Reisinger', 'Spieler', '—'],
    ['Maximilian Tschernitz', 'Spieler', '—'], ['Wilhelm Weiss', 'Außen', 'Außenangreifer']
  ];
  const d1 = [
    ['Stefanie Barth', 'Nr. 5'], ['Summer Berger', 'Nr. 8'], ['Sara Čelina', 'Nr. 11'],
    ['Andriana Drinovac', 'Nr. 4'], ['Isabel Gruber', 'Nr. 16'], ['Julia Gruber', 'Nr. 17'],
    ['Julia Kanzler', 'Nr. 20'], ['Chanel Kernberger', 'Nr. 9'], ['Lena Kühberger', 'Nr. 6'],
    ['Aruna Liebhart', 'Nr. 28'], ['Isabella Marković', 'Nr. 27'], ['Iva Martinovic', 'Nr. 10']
  ];
  const h2 = [
    ['Antonio Crncevic'], ['Michael Erlinger'], ['Xaver Oliver Fehér'], ['Julian Helm'],
    ['Max Peter Hochsteger'], ['Philipp Jaritz'], ['Martin Kral'],
    ['Alex Lichtenwöhrer', 'Zuspieler', 'Zuspieler'], ['Mateo Pocrnja'], ['Lukas Ruhdorfer'],
    ['Robert-Daniel Rusu'], ['Amar Salkanovic'], ['Raphael Schmid'],
    ['Gabriel-Christian Tulea'], ['Maximilian Tschernitz'], ['Rasmus Zaihsenberger'], ['Ilhan Zekan']
  ];

  const playerRecords = [];
  const push = (teamKey, list) => list.forEach(([name, number, position], i) =>
    playerRecords.push({
      team_id: tid(teamKey), name,
      number:   number   || 'Spieler',
      position: position || '—',
      photo: '', sort_order: i + 1
    }));
  push('herren1', h1);
  push('damen1',  d1);
  push('herren2', h2);
  await seedIfEmpty('players', playerRecords);

  /* ════════════════ VORSTAND ═════════════════════════════════ */
  await seedIfEmpty('board', [
    { role: 'Obmann',             name: 'Robert Damm',         initials: 'RD', photo: '', featured: true,  sort_order: 1 },
    { role: 'Stellv. Obmann',     name: 'Wolfgang Neuwersch',  initials: 'WN', photo: '', featured: false, sort_order: 2 },
    { role: 'Kassier',            name: 'Alexander Oberegger', initials: 'AO', photo: '', featured: false, sort_order: 3 },
    { role: 'Stellv. Kassier',    name: 'Alexander Egger',     initials: 'AE', photo: '', featured: false, sort_order: 4 },
    { role: 'Sportliche Leitung', name: 'Johannes Neuwersch',  initials: 'JN', photo: '', featured: false, sort_order: 5 }
  ]);

  /* ════════════════ GALERIE ══════════════════════════════════ */
  await seedIfEmpty('gallery', [
    { image: 'WebsiteAssets/Medien (1).jpg', alt: 'VBC Stainach Volleyball', span: 'wide',   sort_order: 1 },
    { image: 'WebsiteAssets/Medien (2).jpg', alt: 'VBC Stainach Volleyball', span: 'tall',   sort_order: 2 },
    { image: 'WebsiteAssets/Medien (3).jpg', alt: 'VBC Stainach Volleyball', span: 'normal', sort_order: 3 },
    { image: 'WebsiteAssets/Medien (4).jpg', alt: 'VBC Stainach Volleyball', span: 'normal', sort_order: 4 }
  ]);

  /* ════════════════ ZEITLEISTE ═══════════════════════════════ */
  await seedIfEmpty('timeline', [
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
  ]);

  /* ════════════════ ERFOLGE ══════════════════════════════════ */
  await seedIfEmpty('achievements', [
    { num: '1×',       title: 'Sieger 2. Bundesliga Ost',                sub: 'Saison 2003/04 (Frühjahr) · größter Erfolg der Vereinsgeschichte',        icon: 'Icons/trophy.svg',              featured: true,   sort_order: 1 },
    { num: 'Athen',    title: 'Olympische Sommerspiele 2004',            sub: 'Florian Gosch — Eigenbauspieler des VBC Stainach',                        icon: 'Icons/laurel-wreath.svg',       featured: true,   sort_order: 2 },
    { num: '5×',       title: 'Landesmeister 1. Landesliga Herren',      sub: '2010/11 · 2012/13 · 2013/14 · 2015/16 · 2018/19',                         icon: 'Icons/trophy (1).svg',          featured: true,   sort_order: 3 },
    { num: '1×',       title: 'Steirischer Cup',                         sub: 'Saison 2012/13',                                                          icon: 'Icons/award.svg',               featured: false,  sort_order: 4 },
    { num: '1×',       title: 'Meister 2. Gebietsliga Damen NW',         sub: 'Saison 2025/26 (Frühjahr) · erste Damenmannschaft des Vereins',           icon: 'Icons/gold-medal.svg',          featured: false,  sort_order: 5 },
    { num: '2.',       title: 'Vizemeister 2. Bundesliga Ost',           sub: 'Saison 2008/09 · letzte Bundesligasaison',                                icon: 'Icons/podium.svg',              featured: false,  sort_order: 6 },
    { num: '1997/98',  title: '1. Herren-Landesmeistertitel',            sub: 'Erster Aufstieg in die 2. Bundesliga',                                    icon: 'Icons/trophy (1).svg',          featured: false,  sort_order: 7 },
    { num: '18',       title: 'Steirische Nachwuchsmeistertitel',        sub: 'Herausragende Jugendarbeit über Jahrzehnte',                              icon: 'Icons/gold-medal.svg',          featured: false,  sort_order: 8 }
  ]);

  /* ════════════════ SEITENTEXTE ══════════════════════════════ */
  const { count: pCount } = await supabase.from('pages').select('*', { count: 'exact', head: true });
  if (!pCount) {
    const now = new Date().toISOString();
    const texts = {
      startseite: {
        hero_title:       'Volleyballclub\nStainach',
        teams_intro:      'Drei Mannschaften, ein Verein. Entdecke unsere Teams und erfahre mehr über das aktuelle Kader.',
        sponsors_intro:   'Wir danken unseren Partnern für die wertvolle Unterstützung des VBC Stainach.',
        about_title:      'Mehr als Volleyball —\neine Gemeinschaft',
        about_text1:      'Der VBC Stainach ist der Volleyballverein der Region. Seit Jahrzehnten verbinden wir Menschen durch Sport, Teamgeist und gemeinsame Leidenschaft für das Spiel. Mit drei aktiven Mannschaften bieten wir Volleyball auf verschiedenen Leistungsniveaus — von ambitionierten Ligaspielerinnen bis zu aufstrebenden Jugendspielern.',
        about_text2:      'Unser Verein steht für Zusammenhalt auf und neben dem Feld. Wir trainieren hart, feiern Erfolge gemeinsam und wachsen als Team. Egal ob Anfänger oder erfahrener Spieler — bei uns ist jeder willkommen.',
        history_title:    'Jahrzehnte voller Volleyball',
        history_text1:    'Die Geschichte des VBC Stainach reicht bis in die 1960er-Jahre zurück: Was 1968/69 als Schulsport am BG/BRG Stainach begann, wurde 1985 zur eigenen Volleyball-Sektion im SV Stainach und 1997 zum eigenständigen Verein.',
        history_text2:    'Über die Jahrzehnte hat der Verein nicht nur sportliche Erfolge gefeiert — vom ersten Landesmeistertitel 1997/98 über den Sieg in der 2. Bundesliga Ost 2003/04 bis zu fünf Landesmeistertiteln zwischen 2010 und 2019 — sondern auch eine lebendige Gemeinschaft aufgebaut. Spieler, die als Jugendliche begannen, sind heute Trainer, Funktionäre und Eltern der nächsten Generation.',
        history_text3:    'Highlights wie die Teilnahme des Eigenbauspielers Florian Gosch an den Olympischen Spielen 2004 in Athen zeigen, welches Potenzial in diesem Verein steckt. Der VBC Stainach ist mehr als ein Verein — er ist ein Stück Heimat.',
        gallery_intro:    'Momente aus dem Training, Spielen und dem Vereinsleben des VBC Stainach.',
        kontakt_intro:    'Du möchtest mitmachen, hast Fragen zum Verein oder Interesse an einer Mitgliedschaft? Wir freuen uns von dir zu hören.',
        contact_email:    'info@vbcstainach.com',
        contact_venue:    'Sporthalle Stainach',
        contact_address:  'Lange Gasse 30, 8010 Graz',
        contact_training: 'Trainingszeiten auf Anfrage',
        footer_tagline:   'Volleyball, Teamgeist und Leidenschaft seit 1985 in Stainach.',
        news_intro:       ''
      },
      teams: {
        page_title: 'Unsere Teams',
        page_sub:   'Alle aktiven Spielerinnen und Spieler in der Saison 2026/27.'
      },
      neuigkeiten: {
        page_title: 'Neuigkeiten',
        page_sub:   'Aktuelles & Berichte'
      }
    };
    const pageRows = [];
    for (const [page, sections] of Object.entries(texts))
      for (const [section, content] of Object.entries(sections))
        pageRows.push({ page, section, content, updated_at: now });

    const { error } = await supabase.from('pages').insert(pageRows);
    if (error) throw error;
    console.log(`✔  Collection "pages" mit ${pageRows.length} Textbausteinen migriert`);
  }
};
