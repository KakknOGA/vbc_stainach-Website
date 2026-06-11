/* =============================================
   VBC STAINACH/IRDNING – Main Script
   ============================================= */

/* ── NAVBAR scroll effect ─────────────────────── */
const navbar = document.getElementById('navbar');
if (navbar) {
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 40);
  }, { passive: true });
}

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

if (hamburger && mobileMenu) {
  hamburger.addEventListener('click', () => {
    const isOpen = hamburger.classList.toggle('open');
    mobileMenu.classList.toggle('open', isOpen);
    hamburger.setAttribute('aria-expanded', String(isOpen));
    document.body.style.overflow = isOpen ? 'hidden' : '';
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && hamburger.classList.contains('open')) {
      hamburger.classList.remove('open');
      mobileMenu.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    }
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

  if (reducedMotion) {
    title.classList.add('is-ready');
    return;
  }

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

  const fontPromise = (document.fonts && document.fonts.load)
    ? document.fonts.load('400 1em Anton').catch(() => Promise.resolve())
    : Promise.resolve();

  fontPromise.then(() => {
    splitChars(title);
    // One rAF ensures char CSS (opacity:0) is committed before visibility:visible
    requestAnimationFrame(() => title.classList.add('is-ready'));
  });
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
}());
