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
