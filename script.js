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

/* ── HAMBURGER (inner pages) ──────────────────── */
const hamburger = document.getElementById('navHamburger');
const mobileMenu = document.getElementById('navMobile');

function closeMobileMenu() {
  if (!hamburger || !mobileMenu) return;
  hamburger.classList.remove('open');
  mobileMenu.classList.remove('open');
  hamburger.setAttribute('aria-expanded', 'false');
  document.body.style.overflow = '';
}
window.closeMobileMenu = closeMobileMenu;

if (hamburger && mobileMenu) {
  hamburger.addEventListener('click', () => {
    const isOpen = hamburger.classList.toggle('open');
    mobileMenu.classList.toggle('open', isOpen);
    hamburger.setAttribute('aria-expanded', String(isOpen));
    document.body.style.overflow = isOpen ? 'hidden' : '';
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && hamburger.classList.contains('open')) closeMobileMenu();
  });
}

/* ── TAB SWITCH (matches / team pages) ───────── */
function switchTab(group, id) {
  document.querySelectorAll('[id^="' + group + '-"]').forEach(el => {
    if (el.classList.contains('tab-panel')) el.classList.remove('active');
  });
  const tabsEl = document.getElementById(group + '-tabs');
  if (tabsEl) tabsEl.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  const target = document.getElementById(group + '-' + id);
  if (target) target.classList.add('active');
  if (event && event.currentTarget) event.currentTarget.classList.add('active');
}
window.switchTab = switchTab;

/* ── TEAM SELECTOR (team page) ───────────────── */
function switchTeam(id) {
  document.querySelectorAll('.team-panel').forEach(p => p.style.display = 'none');
  document.querySelectorAll('.team-tab-btn').forEach(b => b.classList.remove('active'));
  const target = document.getElementById('team-' + id);
  if (target) target.style.display = 'block';
  if (event && event.currentTarget) event.currentTarget.classList.add('active');
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
