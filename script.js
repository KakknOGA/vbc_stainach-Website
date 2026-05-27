/* =============================================
   VBC STAINACH – Main Script
   ============================================= */

/* ── GALLERY ── */
const track      = document.getElementById('galTrack');
const viewport   = document.getElementById('galViewport');
const dotsWrap   = document.getElementById('galDots');
const prevBtn    = document.getElementById('galPrev');
const nextBtn    = document.getElementById('galNext');
const items      = Array.from(track.children);
const VISIBLE    = 3;
const GAP        = 16;
let   current    = 0;
const maxIdx     = items.length - VISIBLE;

/* build dots */
for (let i = 0; i <= maxIdx; i++) {
  const d = document.createElement('button');
  d.className = 'gal-dot' + (i === 0 ? ' active' : '');
  d.setAttribute('aria-label', `Bild ${i + 1}`);
  d.addEventListener('click', () => goTo(i));
  dotsWrap.appendChild(d);
}

function itemWidth() {
  return items[0].getBoundingClientRect().width + GAP;
}

function updateGallery() {
  track.style.transform = `translateX(-${current * itemWidth()}px)`;
  document.querySelectorAll('.gal-dot').forEach((d, i) =>
    d.classList.toggle('active', i === current)
  );
  prevBtn.disabled = current === 0;
  nextBtn.disabled = current >= maxIdx;
}

function goTo(i) {
  current = Math.max(0, Math.min(maxIdx, i));
  updateGallery();
}

prevBtn.addEventListener('click', () => goTo(current - 1));
nextBtn.addEventListener('click', () => goTo(current + 1));
updateGallery();

/* touch / mouse drag on viewport */
let dragStartX = 0;
let isDragging = false;

viewport.addEventListener('mousedown',  e => { dragStartX = e.clientX; isDragging = true; });
viewport.addEventListener('mousemove',  e => { if (isDragging) e.preventDefault(); });
viewport.addEventListener('mouseup',    e => {
  if (!isDragging) return;
  isDragging = false;
  const diff = dragStartX - e.clientX;
  if (Math.abs(diff) > 40) goTo(current + (diff > 0 ? 1 : -1));
});
viewport.addEventListener('mouseleave', () => { isDragging = false; });

viewport.addEventListener('touchstart', e => { dragStartX = e.touches[0].clientX; }, { passive: true });
viewport.addEventListener('touchend',   e => {
  const diff = dragStartX - e.changedTouches[0].clientX;
  if (Math.abs(diff) > 40) goTo(current + (diff > 0 ? 1 : -1));
}, { passive: true });

/* recalculate on resize */
window.addEventListener('resize', updateGallery);

/* ── LIGHTBOX ── */
const lightbox  = document.getElementById('lightbox');
const lbInner   = document.getElementById('lbInner');
let   lbCurrent = 0;

function buildLbSlide(index) {
  const src = items[index].querySelector('.gal-placeholder');
  const clone = src.cloneNode(true);
  clone.style.width  = 'min(760px, 88vw)';
  clone.style.height = 'min(520px, 78vh)';
  clone.style.fontSize = '28px';
  lbInner.innerHTML = '';
  lbInner.appendChild(clone);
}

function openLightbox(index) {
  lbCurrent = index;
  buildLbSlide(lbCurrent);
  lightbox.classList.add('open');
  document.body.style.overflow = 'hidden';
  updateLbNav();
}

function closeLightbox() {
  lightbox.classList.remove('open');
  document.body.style.overflow = '';
}

function lbNav(dir) {
  lbCurrent = Math.max(0, Math.min(items.length - 1, lbCurrent + dir));
  buildLbSlide(lbCurrent);
  updateLbNav();
}

function updateLbNav() {
  document.getElementById('lbPrev').style.opacity = lbCurrent === 0 ? '.3' : '1';
  document.getElementById('lbNext').style.opacity = lbCurrent === items.length - 1 ? '.3' : '1';
}

document.addEventListener('keydown', e => {
  if (!lightbox.classList.contains('open')) return;
  if (e.key === 'Escape')      closeLightbox();
  if (e.key === 'ArrowLeft')   lbNav(-1);
  if (e.key === 'ArrowRight')  lbNav(1);
});

/* expose globals used by onclick in HTML */
window.openLightbox  = openLightbox;
window.closeLightbox = closeLightbox;
window.lbNav         = lbNav;

/* ── NAVBAR – active link on scroll ── */
const navbar   = document.getElementById('navbar');
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav-link');

window.addEventListener('scroll', () => {
  /* subtle shadow on scroll */
  navbar.style.boxShadow = window.scrollY > 20 ? '0 4px 24px rgba(0,0,0,.5)' : '';

  /* highlight active section */
  let active = '';
  sections.forEach(s => {
    if (window.scrollY >= s.offsetTop - 90) active = s.id;
  });
  navLinks.forEach(a =>
    a.classList.toggle('active', a.getAttribute('href') === '#' + active)
  );
}, { passive: true });

/* ── SCROLL REVEAL ── */
const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('revealed');
      revealObserver.unobserve(e.target);
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));
