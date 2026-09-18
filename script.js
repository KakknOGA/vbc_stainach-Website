/* =============================================
   VBC STAINACH/IRDNING – Main Script
   ============================================= */

/* ── PAGE LOADER + SEITENÜBERGÄNGE ────────────── */
/* <html class="is-loading"> wird im Head-Inline-Script auf jeder Seite
   gesetzt. Eintritt: kurz zeigen, dann ausblenden (erster Besuch pro
   Session etwas länger). Austritt: interne .html-Links blenden den
   Loader ein, bevor navigiert wird. */
(function () {
  const loader  = document.getElementById('pageLoader');
  const root    = document.documentElement;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── Eintritt ── */
  if (loader && root.classList.contains('is-loading')) {
    let first = true;
    try {
      first = !sessionStorage.getItem('vbcVisited');
      sessionStorage.setItem('vbcVisited', '1');
    } catch (e) { /* private mode */ }

    const MIN_SHOW = reduced ? 250 : (first ? 900 : 420);
    const started  = performance.now();
    let finished = false;

    function finish() {
      if (finished) return;
      finished = true;
      const wait = Math.max(0, MIN_SHOW - (performance.now() - started));
      setTimeout(() => root.classList.remove('is-loading'), wait); // gibt Scroll frei, Loader fadet aus
    }

    if (document.readyState === 'complete') finish();
    else window.addEventListener('load', finish, { once: true });
    setTimeout(finish, 4000); // Sicherheitsnetz: nie länger blockieren
  } else {
    root.classList.remove('is-loading');
  }

  /* ── bfcache / Zurück-Button: Loader darf nie hängen bleiben ── */
  window.addEventListener('pageshow', e => {
    if (e.persisted) {
      root.classList.remove('is-loading');
      if (loader) loader.classList.remove('is-exit');
    }
  });

  /* ── Austritt: nur echte interne Seitenwechsel abfangen ── */
  if (!loader) return;
  document.addEventListener('click', e => {
    if (e.defaultPrevented || e.button !== 0) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest ? e.target.closest('a[href]') : null;
    if (!a) return;
    if (a.target && a.target !== '_self') return;          // target="_blank" etc.
    if (a.hasAttribute('download')) return;
    const raw = a.getAttribute('href') || '';
    if (/^(mailto:|tel:|#|javascript:)/i.test(raw)) return; // mailto / tel / Hash-only

    let url;
    try { url = new URL(a.href, location.href); } catch (err) { return; }
    if (url.origin !== location.origin) return;             // extern

    /* „/" und „/index.html" als dieselbe Seite behandeln */
    const norm = p => p.replace(/index\.html?$/i, '');
    const samePage = norm(url.pathname) === norm(location.pathname);

    /* Anker auf derselben Seite → sanft scrollen statt neu laden */
    if (samePage && url.hash) {
      const target = document.querySelector(url.hash);
      if (target) {
        e.preventDefault();
        history.pushState(null, '', url.hash);
        target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
      }
      return;
    }
    if (samePage && !url.hash) return; // Link auf dieselbe Seite ohne Anker
    if (!/\.html?$/i.test(url.pathname) && url.pathname !== '/') return;

    e.preventDefault();
    loader.classList.add('is-exit');
    setTimeout(() => { location.href = url.href; }, reduced ? 150 : 420);
  });
})();

/* ── NAVBAR scroll effect ─────────────────────── */
const navbar = document.getElementById('navbar');
if (navbar) {
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 40);
  }, { passive: true });
}

/* ── SCROLL-SPY (aktive Navigation, One-Pager) ── */
(function () {
  const links = document.querySelectorAll('.nav-links .nav-link[href^="#"]');
  if (!links.length) return;
  const map = new Map();
  links.forEach(l => {
    const sec = document.querySelector(l.getAttribute('href'));
    if (sec) map.set(sec, l);
  });
  if (!map.size) return;

  const spy = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      links.forEach(l => l.classList.remove('active'));
      map.get(e.target).classList.add('active');
    });
  }, { rootMargin: '-40% 0px -55% 0px', threshold: 0 });
  map.forEach((_, sec) => spy.observe(sec));
})();

/* ── HERO PARALLAX (Scroll + Maus) + Scroll-Hint-Fade ── */
(function () {
  const hero = document.querySelector('.hero');
  const heroImg = document.querySelector('.hero-bg img');
  if (!hero || !heroImg) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(pointer: fine)').matches;
  const glow = document.querySelector('.hero-glow');

  let scrollY = window.scrollY;
  let mx = 0, my = 0;   // aktueller Maus-Versatz (geglättet)
  let tx = 0, ty = 0;   // Ziel-Versatz
  let rafId = null;

  function render() {
    heroImg.style.transform =
      `translate3d(${mx.toFixed(2)}px, ${Math.round(scrollY * 0.22) + my}px, 0) scale(1.08)`;
    if (glow) glow.style.transform =
      `translate(calc(-50% + ${(mx * 2.4).toFixed(1)}px), calc(-55% + ${(my * 2.4).toFixed(1)}px))`;
  }

  function step() {
    // Maus-Versatz weich nachziehen (Lerp); Loop endet, sobald Ziel erreicht
    mx += (tx - mx) * 0.08;
    my += (ty - my) * 0.08;
    render();
    if (Math.abs(tx - mx) > 0.1 || Math.abs(ty - my) > 0.1) {
      rafId = requestAnimationFrame(step);
    } else {
      rafId = null;
    }
  }
  function schedule() { if (!rafId) rafId = requestAnimationFrame(step); }

  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    hero.classList.toggle('is-scrolled', y > 60);
    if (reduced || y > window.innerHeight) return;
    scrollY = y;
    schedule();
  }, { passive: true });

  // Sehr leichte Maus-Parallax — nur Desktop (pointer: fine), max. ±7 px
  if (!reduced && finePointer) {
    hero.addEventListener('pointermove', e => {
      tx = (e.clientX / window.innerWidth - 0.5) * 14;
      ty = (e.clientY / window.innerHeight - 0.5) * 10;
      schedule();
    }, { passive: true });
    hero.addEventListener('pointerleave', () => {
      tx = 0; ty = 0;
      schedule();
    }, { passive: true });
  }

  hero.classList.toggle('is-scrolled', scrollY > 60);
  if (!reduced) { schedule(); }
})();

/* ── STATS COUNT-UP (Statistik-Leiste) ────────── */
(function () {
  const grid = document.querySelector('.stats-grid');
  if (!grid || !('IntersectionObserver' in window)) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const obs = new IntersectionObserver(entries => {
    if (!entries.some(e => e.isIntersecting)) return;
    obs.disconnect();
    grid.querySelectorAll('.stat-num').forEach(el => {
      const raw = el.textContent.trim();
      if (!/^\d{1,4}$/.test(raw)) return; // nur reine Zahlen animieren (CMS-sicher)
      const end = parseInt(raw, 10);
      const dur = 1100;
      const t0 = performance.now();
      (function tick(t) {
        const p = Math.min(1, (t - t0) / dur);
        el.textContent = String(Math.round(end * (1 - Math.pow(1 - p, 3))));
        if (p < 1) requestAnimationFrame(tick);
      })(t0);
    });
  }, { threshold: 0.4 });
  obs.observe(grid);
})();

/* ── SCROLL REVEAL ────────────────────────────── */
const revealEls = document.querySelectorAll('.reveal');
if (revealEls.length) {
  const revealObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('on');
        revealObs.unobserve(e.target);
      }
    });
  }, { threshold: 0.07 });
  revealEls.forEach(el => revealObs.observe(el));
}

/* ── GESCHICHTE: ZEITLEISTE ────────────────────
   Einträge erscheinen einzeln beim Hineinscrollen, die
   Verbindungslinie wächst mit. Die Einträge werden von cms.js
   nachgeladen — deshalb ist init() erneut aufrufbar
   (window.refreshTimelineReveal).                              */
(function timelineReveal() {
  const timeline = document.querySelector('.timeline');
  if (!timeline) return;

  const calmMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let itemObs = null;
  let painting = false;

  /* Die Linie folgt einer gedachten Lesemarke im unteren Bildschirmdrittel —
     genau dort, wo die Einträge eingeblendet werden. */
  function paint() {
    painting = false;
    const rect = timeline.getBoundingClientRect();
    const marker = window.innerHeight * 0.8;
    const filled = Math.min(Math.max(marker - rect.top, 0), rect.height);
    timeline.style.setProperty('--tl-fill', filled.toFixed(1) + 'px');
  }

  function requestPaint() {
    if (painting) return;
    painting = true;
    requestAnimationFrame(paint);
  }

  function init() {
    if (itemObs) itemObs.disconnect();
    const items = timeline.querySelectorAll('.timeline-item');
    if (!items.length) return;

    if (calmMotion.matches || !('IntersectionObserver' in window)) {
      items.forEach(el => el.classList.add('tl-in'));
      return;
    }

    itemObs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        e.target.classList.add('tl-in');
        itemObs.unobserve(e.target);
      });
    }, { threshold: 0.2, rootMargin: '0px 0px -15% 0px' });

    items.forEach(el => itemObs.observe(el));
    requestPaint();
  }

  window.refreshTimelineReveal = init;
  init();

  window.addEventListener('scroll', requestPaint, { passive: true });
  window.addEventListener('resize', requestPaint);
})();

/* ── MOBILE MENU / HAMBURGER ───────────────────── */
const hamburger = document.getElementById('navHamburger');
const mobileMenu = document.getElementById('navMobile');

function setMobileMenu(open) {
  if (!hamburger || !mobileMenu) return;
  hamburger.classList.toggle('open', open);
  mobileMenu.classList.toggle('open', open);
  hamburger.setAttribute('aria-expanded', String(open));
  mobileMenu.setAttribute('aria-hidden', String(!open));
  document.body.style.overflow = open ? 'hidden' : '';
}
function closeMobileMenu() { setMobileMenu(false); }
window.closeMobileMenu = closeMobileMenu;

if (hamburger && mobileMenu) {
  mobileMenu.setAttribute('aria-hidden', 'true');
  hamburger.addEventListener('click', () => {
    setMobileMenu(!hamburger.classList.contains('open'));
  });
  /* Schließen bei Klick auf einen Link, den CTA oder die Scrim-Fläche */
  mobileMenu.addEventListener('click', e => {
    if (e.target.closest('.nav-mobile-link, .nav-mobile-cta') ||
        e.target.classList.contains('nav-mobile-scrim')) {
      closeMobileMenu();
    }
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && hamburger.classList.contains('open')) closeMobileMenu();
  });
}

/* ── TAB SWITCH (matches / team pages) ───────── */
function switchTab(group, id) {
  document.querySelectorAll('[id^="' + group + '-"]').forEach(el => {
    if (el.classList.contains('tab-panel')) { el.classList.remove('active'); el.hidden = true; }
  });
  const tabsEl = document.getElementById(group + '-tabs');
  if (tabsEl) tabsEl.querySelectorAll('.tab-btn').forEach(b => {
    b.classList.remove('active');
    b.setAttribute('aria-selected', 'false');
    b.setAttribute('tabindex', '-1');
  });
  const target = document.getElementById(group + '-' + id);
  if (target) { target.classList.add('active'); target.hidden = false; }
  const btn = (typeof event !== 'undefined' && event && event.currentTarget) ||
              (tabsEl && tabsEl.querySelector('[aria-controls="' + group + '-' + id + '"]'));
  if (btn) {
    btn.classList.add('active');
    btn.setAttribute('aria-selected', 'true');
    btn.setAttribute('tabindex', '0');
  }
}
window.switchTab = switchTab;

/* ── TAB-ARIA: Rollen + Pfeiltasten-Navigation (WAI-ARIA Tabs Pattern) ── */
function initAriaTabs() {
  document.querySelectorAll('.tab-nav, [data-cms-team-tabs]').forEach(list => {
    if (list.dataset.ariaReady) return;
    list.dataset.ariaReady = '1';
    list.setAttribute('role', 'tablist');
    const tabs = [...list.querySelectorAll('.tab-btn, .team-tab-btn')];
    tabs.forEach(tab => {
      tab.setAttribute('role', 'tab');
      const active = tab.classList.contains('active');
      tab.setAttribute('aria-selected', String(active));
      tab.setAttribute('tabindex', active ? '0' : '-1');
      /* Panel-ID aus dem onclick-Aufruf ableiten: switchTab('h1','rel') → h1-rel, switchTeam('damen') → team-damen */
      const oc = tab.getAttribute('onclick') || '';
      let m = oc.match(/switchTab\('([^']+)'\s*,\s*'([^']+)'\)/);
      let panelId = m ? m[1] + '-' + m[2] : null;
      if (!panelId) { m = oc.match(/switchTeam\('([^']+)'\)/); panelId = m ? 'team-' + m[1] : null; }
      if (panelId) {
        tab.setAttribute('aria-controls', panelId);
        if (!tab.id) tab.id = panelId + '-tab';
        const panel = document.getElementById(panelId);
        if (panel) {
          panel.setAttribute('role', 'tabpanel');
          panel.setAttribute('aria-labelledby', tab.id);
          if (!panel.hasAttribute('tabindex')) panel.setAttribute('tabindex', '0');
        }
      }
    });
    list.addEventListener('keydown', e => {
      const idx = tabs.indexOf(document.activeElement);
      if (idx < 0) return;
      let next = null;
      if (e.key === 'ArrowRight') next = tabs[(idx + 1) % tabs.length];
      if (e.key === 'ArrowLeft')  next = tabs[(idx - 1 + tabs.length) % tabs.length];
      if (e.key === 'Home')       next = tabs[0];
      if (e.key === 'End')        next = tabs[tabs.length - 1];
      if (next) { e.preventDefault(); next.focus(); next.click(); }
    });
  });
}
window.initAriaTabs = initAriaTabs;
document.addEventListener('DOMContentLoaded', initAriaTabs);

/* ── TEAM SELECTOR (team page) ───────────────── */
function switchTeam(id) {
  document.querySelectorAll('.team-panel').forEach(p => p.style.display = 'none');
  document.querySelectorAll('.team-tab-btn').forEach(b => {
    b.classList.remove('active');
    b.setAttribute('aria-selected', 'false');
    b.setAttribute('tabindex', '-1');
  });
  const target = document.getElementById('team-' + id);
  if (target) target.style.display = 'block';
  const btn = (typeof event !== 'undefined' && event && event.currentTarget) ||
              document.querySelector('.team-tab-btn[aria-controls="team-' + id + '"]');
  if (btn) {
    btn.classList.add('active');
    btn.setAttribute('aria-selected', 'true');
    btn.setAttribute('tabindex', '0');
  }
}
window.switchTeam = switchTeam;

/* ── ACCORDION (for legal accordion on inner pages if needed) ─── */
function toggleAccordion(btn) {
  const body = btn.nextElementSibling;
  const isOpen = btn.classList.toggle('open');
  body.classList.toggle('open', isOpen);
  btn.setAttribute('aria-expanded', String(isOpen));
}
window.toggleAccordion = toggleAccordion;

/* ── HERO CHAR ANIMATION ─────────────────────── */
(function () {
  const title = document.querySelector('.hero-title');
  if (!title) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function splitChars(t) {
    let idx = 0;
    t.querySelectorAll('.hero-title-line').forEach(line => {
      const text = line.textContent;
      line.textContent = '';
      for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (ch === ' ') {
          line.appendChild(document.createTextNode(' '));
        } else {
          const wrap = document.createElement('span');
          wrap.className = 'char-wrap';
          const inner = document.createElement('span');
          inner.className = 'char';
          inner.style.setProperty('--i', idx++);
          inner.textContent = ch;
          wrap.appendChild(inner);
          line.appendChild(wrap);
        }
      }
    });
  }

  function run() {
    if (reducedMotion) {
      title.classList.add('is-ready');
      return;
    }
    const fontPromise = (document.fonts && document.fonts.load)
      ? document.fonts.load('400 1em Anton').catch(() => Promise.resolve())
      : Promise.resolve();

    fontPromise.then(() => {
      splitChars(title);
      // One rAF ensures char CSS (opacity:0) is committed before visibility:visible
      requestAnimationFrame(() => title.classList.add('is-ready'));
    });
  }

  /* CMS: cms.js setzt den Hero-Titel ggf. neu aus der Datenbank
     und startet die Animation über diesen Hook erneut. */
  window.refreshHeroTitle = function () {
    title.classList.remove('is-ready');
    run();
  };

  run();
}());

/* ── POST-SCROLL MOMENTUM (desktop only) ────── */
(function () {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  if (prefersReduced || isTouch) return;

  let lastDelta    = 0;
  let momentumRaf  = null;
  let momentumTimer = null;

  function stopMomentum() {
    if (momentumRaf)   { cancelAnimationFrame(momentumRaf); momentumRaf = null; }
    if (momentumTimer) { clearTimeout(momentumTimer);       momentumTimer = null; }
  }

  function startMomentum(delta) {
    // Scale starting velocity; cap so fast scrolls don't over-shoot
    const strength = Math.min(Math.abs(delta) * 0.10, 18);
    if (strength < 1) return; // skip tiny trackpad trailing events

    let velocity = Math.sign(delta) * strength;

    function animate() {
      velocity *= 0.78; // strong damping → quick stop (~200–280 ms)
      if (Math.abs(velocity) < 0.5) { momentumRaf = null; return; }

      // Respect scroll boundaries
      const scrollTop = window.scrollY;
      const maxY = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollTop <= 0 && velocity < 0) { momentumRaf = null; return; }
      if (scrollTop >= maxY && velocity > 0) { momentumRaf = null; return; }

      window.scrollBy({ top: velocity, behavior: 'instant' });
      momentumRaf = requestAnimationFrame(animate);
    }

    momentumRaf = requestAnimationFrame(animate);
  }

  // Native scroll is untouched — we only observe the wheel event
  window.addEventListener('wheel', e => {
    lastDelta = e.deltaY;
    stopMomentum();
    momentumTimer = setTimeout(() => startMomentum(lastDelta), 80);
  }, { passive: true }); // passive:true → no preventDefault, native scroll preserved

  // Cancel momentum on keyboard navigation
  document.addEventListener('keydown', e => {
    const nav = ['PageUp', 'PageDown', 'Home', 'End', 'ArrowUp', 'ArrowDown', ' '];
    if (nav.includes(e.key)) stopMomentum();
  }, { passive: true });

  // Cancel momentum when an anchor link starts a smooth scroll
  document.addEventListener('click', e => {
    if (e.target.closest && e.target.closest('a[href*="#"]')) stopMomentum();
  }, { passive: true });
}());

/* ── HERO ORBS: interaktive Deko-Partikel ─────────
   Kleine Elemente im Hero, die der Maus wie ein umgekehrter Magnet
   ausweichen. Man kann sie auch greifen, verschieben und werfen —
   danach federn sie langsam an ihren Platz zurück. */
(function () {
  const hero  = document.querySelector('.hero');
  const layer = document.getElementById('heroOrbs');
  if (!hero || !layer) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const BALL_SVG =
    '<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">' +
    '<circle cx="16" cy="16" r="14.8" fill="rgba(13,16,24,0.88)" stroke="rgba(255,255,255,0.75)" stroke-width="1.6"/>' +
    '<path d="M16 1.2 C 10.5 9, 10.5 23, 16 30.8" stroke="rgba(255,255,255,0.55)" stroke-width="1.2"/>' +
    '<path d="M2 11 C 9.5 15.5, 22.5 15.5, 30 11" stroke="rgba(255,255,255,0.55)" stroke-width="1.2"/>' +
    '<path d="M2 21 C 9.5 16.5, 22.5 16.5, 30 21" stroke="rgba(30,107,255,0.85)" stroke-width="1.2"/>' +
    '</svg>';

  /* t: Typ, s: Größe px, x/y: Heimposition in % des Heros, v: Stil-Variante */
  const SPECS = [
    { t: 'ball', s: 34, x: 8,  y: 24 },
    { t: 'ball', s: 26, x: 88, y: 18 },
    { t: 'ball', s: 22, x: 81, y: 74 },
    { t: 'ball', s: 28, x: 15, y: 78 },
    { t: 'ring', s: 18, x: 22, y: 13 },
    { t: 'ring', s: 26, x: 93, y: 48, v: 'accent' },
    { t: 'ring', s: 14, x: 70, y: 9  },
    { t: 'ring', s: 20, x: 5,  y: 55, v: 'accent' },
    { t: 'dot',  s: 8,  x: 30, y: 32 },
    { t: 'dot',  s: 6,  x: 77, y: 33 },
    { t: 'dot',  s: 10, x: 90, y: 87 },
    { t: 'dot',  s: 7,  x: 12, y: 91, v: 'soft' },
    { t: 'plus', s: 14, x: 33, y: 84 },
    { t: 'plus', s: 12, x: 67, y: 89 },
    { t: 'plus', s: 16, x: 5,  y: 8  }
  ];

  const REPEL_R = 150;   // Radius, in dem die Maus abstößt (px)
  const REPEL_F = 1.5;   // Stärke der Abstoßung
  const SPRING  = 0.0016; // Rückzugskraft zur Heimposition
  const DAMP    = 0.94;  // Reibung pro Frame

  let W = 0, H = 0;
  function measure() {
    const r = hero.getBoundingClientRect();
    W = r.width; H = r.height;
  }
  measure();
  window.addEventListener('resize', measure, { passive: true });

  const orbs = SPECS.map((spec, i) => {
    const el = document.createElement('div');
    el.className = 'hero-orb orb-' + spec.t + (spec.v ? ' orb-' + spec.t + '--' + spec.v : '');
    if (spec.t === 'ball') el.innerHTML = BALL_SVG;
    el.style.width = el.style.height = spec.s + 'px';
    layer.appendChild(el);
    return {
      el, s: spec.s,
      hx: spec.x, hy: spec.y,
      x: spec.x / 100 * W, y: spec.y / 100 * H,
      vx: 0, vy: 0,
      rot: Math.random() * 360,
      spin: (Math.random() * 2 - 1) * 0.2,
      ph: i * 1.7, fq: 0.5 + Math.random() * 0.7, // Idle-Drift
      drag: false, px: 0, py: 0, ox: 0, oy: 0
    };
  });

  /* Mausposition relativ zum Hero (bubbelt auch von Kind-Elementen) */
  let mx = -9999, my = -9999, mouseIn = false;
  hero.addEventListener('pointermove', e => {
    const r = hero.getBoundingClientRect();
    mx = e.clientX - r.left;
    my = e.clientY - r.top;
    mouseIn = e.pointerType !== 'touch';
    schedule();
  }, { passive: true });
  hero.addEventListener('pointerleave', () => { mouseIn = false; }, { passive: true });

  /* Greifen, Ziehen, Werfen */
  orbs.forEach(o => {
    o.el.addEventListener('pointerdown', e => {
      e.preventDefault();
      o.drag = true;
      o.el.classList.add('is-drag');
      o.el.setPointerCapture(e.pointerId);
      const r = hero.getBoundingClientRect();
      o.ox = (e.clientX - r.left) - o.x;
      o.oy = (e.clientY - r.top) - o.y;
      o.px = o.x; o.py = o.y;
      schedule();
    });
    o.el.addEventListener('pointermove', e => {
      if (!o.drag) return;
      const r = hero.getBoundingClientRect();
      o.x = (e.clientX - r.left) - o.ox;
      o.y = (e.clientY - r.top) - o.oy;
    });
    const end = () => {
      if (!o.drag) return;
      o.drag = false;
      o.el.classList.remove('is-drag'); // Wurf-Geschwindigkeit bleibt aus dem letzten Frame erhalten
    };
    o.el.addEventListener('pointerup', end);
    o.el.addEventListener('pointercancel', end);
  });

  let rafId = null;
  let last = performance.now();
  let idleFrames = 0;
  let visible = true;

  function step(now) {
    const dt = Math.min(2.5, (now - last) / 16.7); // auf 60 fps normiert
    last = now;
    const damp = Math.pow(DAMP, dt);
    let moving = false;

    orbs.forEach(o => {
      if (o.drag) {
        // Geschwindigkeit fürs Werfen aus der Zieh-Bewegung ableiten
        o.vx = Math.max(-30, Math.min(30, (o.x - o.px) / dt));
        o.vy = Math.max(-30, Math.min(30, (o.y - o.py) / dt));
        o.px = o.x; o.py = o.y;
        moving = true;
      } else {
        // Feder zur Heimposition + sanftes Eigenleben
        o.vx += (o.hx / 100 * W - o.x) * SPRING * dt;
        o.vy += (o.hy / 100 * H - o.y) * SPRING * dt;
        o.vx += Math.cos(now / 1000 * o.fq + o.ph) * 0.012 * dt;
        o.vy += Math.sin(now / 1300 * o.fq + o.ph) * 0.012 * dt;

        // Umgekehrter Magnet: von der Maus wegdrücken
        if (mouseIn) {
          const dx = o.x - mx, dy = o.y - my;
          const d = Math.hypot(dx, dy);
          if (d < REPEL_R && d > 0.5) {
            const f = REPEL_F * Math.pow(1 - d / REPEL_R, 2) * dt;
            o.vx += dx / d * f;
            o.vy += dy / d * f;
          }
        }

        o.vx *= damp; o.vy *= damp;
        o.x += o.vx * dt;
        o.y += o.vy * dt;

        // Weich an den Hero-Rändern abprallen
        const m = o.s / 2 + 4;
        if (o.x < m)     { o.x = m;     o.vx *= -0.55; }
        if (o.x > W - m) { o.x = W - m; o.vx *= -0.55; }
        if (o.y < m)     { o.y = m;     o.vy *= -0.55; }
        if (o.y > H - m) { o.y = H - m; o.vy *= -0.55; }

        if (Math.abs(o.vx) > 0.03 || Math.abs(o.vy) > 0.03) moving = true;
      }

      o.rot += o.spin * (1 + Math.hypot(o.vx, o.vy) * 0.35) * dt;
      o.el.style.transform =
        'translate3d(' + (o.x - o.s / 2).toFixed(1) + 'px,' + (o.y - o.s / 2).toFixed(1) + 'px,0)' +
        ' rotate(' + o.rot.toFixed(1) + 'deg)';
    });

    // Loop schlafen legen, wenn längere Zeit nichts passiert (spart Akku)
    idleFrames = moving ? 0 : idleFrames + 1;
    if (visible && idleFrames < 90) {
      rafId = requestAnimationFrame(step);
    } else {
      rafId = null;
    }
  }
  function schedule() {
    if (!rafId && visible) {
      last = performance.now();
      idleFrames = 0;
      rafId = requestAnimationFrame(step);
    }
  }

  /* Pausieren, sobald der Hero aus dem Viewport gescrollt ist */
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      visible = entries.some(e => e.isIntersecting);
      if (visible) { measure(); schedule(); }
    }, { threshold: 0 }).observe(hero);
  }

  schedule();
}());

