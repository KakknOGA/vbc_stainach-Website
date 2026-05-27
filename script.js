/* =============================================
   VBC STAINACH – Main Script
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
  }, { threshold: 0.08 });
  revealEls.forEach(el => revealObs.observe(el));
}

/* ── GALLERY ──────────────────────────────────── */
const galTrack    = document.getElementById('galTrack');
const galViewport = document.getElementById('galViewport');
const galDotsWrap = document.getElementById('galDots');
const galPrevBtn  = document.getElementById('galPrev');
const galNextBtn  = document.getElementById('galNext');

if (galTrack && galViewport) {
  const galItems  = Array.from(galTrack.children);
  const VISIBLE   = 3;
  const GAP       = 2;          /* matches CSS gap: 2px */
  let   galIndex  = 0;
  const maxIndex  = Math.max(0, galItems.length - VISIBLE);

  /* build dots */
  if (galDotsWrap) {
    for (let i = 0; i <= maxIndex; i++) {
      const d = document.createElement('button');
      d.className  = 'gal-dot' + (i === 0 ? ' active' : '');
      d.setAttribute('aria-label', `Folie ${i + 1}`);
      d.addEventListener('click', () => goToSlide(i));
      galDotsWrap.appendChild(d);
    }
  }

  function itemW() {
    return galItems[0].getBoundingClientRect().width + GAP;
  }

  function updateGallery() {
    galTrack.style.transform = `translateX(-${galIndex * itemW()}px)`;
    if (galDotsWrap) {
      galDotsWrap.querySelectorAll('.gal-dot').forEach((d, i) =>
        d.classList.toggle('active', i === galIndex)
      );
    }
    if (galPrevBtn) galPrevBtn.disabled = galIndex === 0;
    if (galNextBtn) galNextBtn.disabled = galIndex >= maxIndex;
  }

  function goToSlide(i) {
    galIndex = Math.max(0, Math.min(maxIndex, i));
    updateGallery();
  }

  if (galPrevBtn) galPrevBtn.addEventListener('click', () => goToSlide(galIndex - 1));
  if (galNextBtn) galNextBtn.addEventListener('click', () => goToSlide(galIndex + 1));
  updateGallery();

  /* drag / swipe */
  let dragX    = 0;
  let dragging = false;

  galViewport.addEventListener('mousedown',  e => { dragX = e.clientX; dragging = true; });
  galViewport.addEventListener('mousemove',  e => { if (dragging) e.preventDefault(); });
  galViewport.addEventListener('mouseup',    e => {
    if (!dragging) return;
    dragging = false;
    const d = dragX - e.clientX;
    if (Math.abs(d) > 40) goToSlide(galIndex + (d > 0 ? 1 : -1));
  });
  galViewport.addEventListener('mouseleave', () => { dragging = false; });

  galViewport.addEventListener('touchstart', e => { dragX = e.touches[0].clientX; }, { passive: true });
  galViewport.addEventListener('touchend',   e => {
    const d = dragX - e.changedTouches[0].clientX;
    if (Math.abs(d) > 40) goToSlide(galIndex + (d > 0 ? 1 : -1));
  }, { passive: true });

  window.addEventListener('resize', updateGallery);
}

/* ── LIGHTBOX ─────────────────────────────────── */
const lightbox = document.getElementById('lightbox');
const lbInner  = document.getElementById('lbInner');
const galItemsAll = galTrack ? Array.from(galTrack.querySelectorAll('.gal-thumb')) : [];
let   lbCurrent   = 0;

function buildLbSlide(i) {
  if (!lbInner || !galItemsAll[i]) return;
  const src   = galItemsAll[i];
  const clone = src.cloneNode(true);
  clone.classList.add('lb-thumb');
  clone.style.width  = '';
  clone.style.height = '';
  lbInner.innerHTML = '';
  lbInner.appendChild(clone);
}

function openLightbox(i) {
  if (!lightbox) return;
  lbCurrent = i;
  buildLbSlide(lbCurrent);
  lightbox.classList.add('open');
  document.body.style.overflow = 'hidden';
  updateLbNavBtns();
}

function closeLightbox() {
  if (!lightbox) return;
  lightbox.classList.remove('open');
  document.body.style.overflow = '';
}

function lbNav(dir) {
  lbCurrent = Math.max(0, Math.min(galItemsAll.length - 1, lbCurrent + dir));
  buildLbSlide(lbCurrent);
  updateLbNavBtns();
}

function updateLbNavBtns() {
  const p = document.getElementById('lbPrev');
  const n = document.getElementById('lbNext');
  if (p) p.style.opacity = lbCurrent === 0 ? '.2' : '1';
  if (n) n.style.opacity = lbCurrent === galItemsAll.length - 1 ? '.2' : '1';
}

/* keyboard nav */
document.addEventListener('keydown', e => {
  if (!lightbox || !lightbox.classList.contains('open')) return;
  if (e.key === 'Escape')      closeLightbox();
  if (e.key === 'ArrowLeft')   lbNav(-1);
  if (e.key === 'ArrowRight')  lbNav(1);
});

/* expose to inline onclick */
window.openLightbox  = openLightbox;
window.closeLightbox = closeLightbox;
window.lbNav         = lbNav;
