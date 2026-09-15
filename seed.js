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
    { value: '1.',  label: 'Platz · Damen 2GLD',    sort_order: 3 },
    { value: "'85", label: 'Gegründet',             sort_order: 4 }
  ]);

  /* ════════════════ TEAMS ════════════════════════════════════ */
  await seedIfEmpty('teams', [
    {
      key: 'herren1', name: 'Herren 1', tab_label: '1. Mannschaft Herren',
      league: '1. Landesliga Herren', season: 'Saison 2025/26',
      claim: 'Erfahrung trifft Neuanfang',
      description: 'Die Herren 1 bestehen aus einer Mischung aus erfahrenen und jungen Spielern. Im Mittelpunkt stehen gemeinsames Training, Teamgeist und der Aufbau einer neuen, motivierten Mannschaft für die kommenden Jahre.',
      image: 'WebsiteAssets/Medien (2).jpg', email: 'herren1@vbcstainach.com', sort_order: 1
    },
    {
      key: 'damen1', name: 'Damen 1', tab_label: '1. Mannschaft Damen',
      league: '2. Gebietsliga Damen NW', season: 'Saison 2025/26',
      claim: 'Mit Freude zum Team',
      description: 'Unsere Damen 1 bestehen aus jungen Spielerinnen, die erste Erfahrungen im Volleyball sammeln. Mit viel Motivation und Freude am Sport wächst hier ein neues Team zusammen.',
      image: 'WebsiteAssets/Medien (1).jpg', email: 'damen1@vbcstainach.com', sort_order: 2
    },
    {
      key: 'herren2', name: 'Herren 2', tab_label: '2. Mannschaft Herren',
      league: '2. Gebietsliga Herren NW', season: 'Saison 2025/26',
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
    { year: '1968/69', title: 'Erste Anfänge',            text: 'Die ersten Volleyball-Aktivitäten in der Region Stainach entstehen — der Grundstein für den heutigen Verein wird gelegt.', sort_order: 1 },
    { year: '1985',    title: 'Vereinsgründung',          text: 'Offizielle Gründung des VBC Stainach. Der Verein nimmt seinen Betrieb mit ersten Ligamannschaften auf.', sort_order: 2 },
    { year: '1997',    title: 'Steirische Meistertitel',  text: 'Die Nachwuchsarbeit trägt Früchte: 18 steirische Nachwuchsmeistertitel unterstreichen die Qualität des Vereins.', sort_order: 3 },
    { year: '2004',    title: 'Olympia — Florian Gosch',  text: 'Florian Gosch, aufgewachsen im Verein, nimmt für Österreich an den Olympischen Sommerspielen in Athen teil.', sort_order: 4 },
    { year: '2007/08', title: 'Kreuzspiele & Aufstiege',  text: 'Erfolgreiche Kreuzspiele-Saison. Österreichischer Meister der 2. Liga — ein Meilenstein in der Vereinsgeschichte.', sort_order: 5 },
    { year: 'Heute',   title: '3 aktive Mannschaften',    text: 'Mit 49 aktiven Spielern und drei Mannschaften schreibt der VBC Stainach weiterhin seine Geschichte.', sort_order: 6 }
  ]);

  /* ════════════════ ERFOLGE ══════════════════════════════════ */
  await seedIfEmpty('achievements', [
    { num: '1×',    title: 'Österreichischer Meister',          sub: '2. Liga · Saison 2007/08 · Historischer Aufstieg',                 icon: 'Icons/trophy.svg',        featured: true,  sort_order: 1 },
    { num: '18',    title: 'Steirische Nachwuchsmeistertitel',  sub: 'Herausragende Jugendarbeit über Jahrzehnte',                       icon: 'Icons/gold-medal.svg',    featured: false, sort_order: 2 },
    { num: 'Mehrfach', title: 'Steirischer Meister',           sub: 'Landesmeistertitel in der steirischen Volleyballszene',            icon: 'Icons/trophy (1).svg',    featured: true,  sort_order: 3 },
    { num: '1×',    title: 'Österreichischer Vizemeister',      sub: 'Juniorenteam · 2004',                                              icon: 'Icons/podium.svg',        featured: false, sort_order: 4 },
    { num: 'Athen', title: 'Olympische Sommerspiele 2004',      sub: 'Florian Gosch vertritt Österreich — aufgewachsen im VBC Stainach', icon: 'Icons/laurel-wreath.svg', featured: true,  sort_order: 5 },
    { num: '#1',    title: 'Tabellenführung Damen',             sub: 'Saison 2025/26 · 2. Gebietsliga Damen NW',                        icon: 'Icons/award.svg',         featured: false, sort_order: 6 },
    { num: '07/08', title: 'Kreuzspiele-Saison',               sub: 'Erfolgreiche Kreuzspiele-Saison in der Aufstiegsrunde',            icon: 'Icons/trophy (1).svg',    featured: false, sort_order: 7 }
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
        history_text1:    'Die Geschichte des VBC Stainach reicht weit zurück. Was einst als regionale Sportbegeisterung begann, ist heute ein etablierter Volleyballverein mit Tradition, Nachwuchs und überregionaler Bekanntheit.',
        history_text2:    'Über die Jahrzehnte hat der Verein nicht nur sportliche Erfolge gefeiert, sondern auch eine lebendige Gemeinschaft aufgebaut. Spieler, die als Jugendliche begannen, sind heute Trainer, Funktionäre und Eltern der nächsten Generation.',
        history_text3:    'Highlights wie die Teilnahme von Florian Gosch an den Olympischen Spielen 2004 zeigen, welches Potenzial in diesem Verein steckt. Der VBC Stainach ist mehr als ein Verein — er ist ein Stück Heimat.',
        gallery_intro:    'Momente aus dem Training, Spielen und dem Vereinsleben des VBC Stainach.',
        kontakt_intro:    'Du möchtest mitmachen, hast Fragen zum Verein oder Interesse an einer Mitgliedschaft? Wir freuen uns von dir zu hören.',
        contact_email:    'info@vbc-stainach.at',
        contact_address:  'Lange Gasse 30, 8010 Graz',
        contact_training: 'Trainingszeiten auf Anfrage',
        footer_tagline:   'Volleyball, Teamgeist und Leidenschaft seit 1985 in Stainach.',
        news_intro:       ''
      },
      teams: {
        page_title: 'Unsere Teams',
        page_sub:   'Alle aktiven Spielerinnen und Spieler in der Saison 2025/26.'
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
