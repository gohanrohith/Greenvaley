// Mobile nav toggle
const navToggle = document.getElementById('navToggle');
const navLinks  = document.getElementById('navLinks');
if (navToggle && navLinks) {
  navToggle.addEventListener('click', () => navLinks.classList.toggle('open'));
  document.addEventListener('click', e => {
    if (!navLinks.contains(e.target) && !navToggle.contains(e.target)) {
      navLinks.classList.remove('open');
    }
  });
}

// Mobile dropdown inside nav
document.querySelectorAll('.nav-drop-btn').forEach(btn => {
  btn.addEventListener('click', e => {
    e.stopPropagation();
    const drop = btn.nextElementSibling;
    const isOpen = drop.style.display === 'block';
    document.querySelectorAll('.nav-dropdown').forEach(d => d.style.display = 'none');
    drop.style.display = isOpen ? 'none' : 'block';
  });
});

// Active nav link
(function () {
  const path = window.location.pathname;
  document.querySelectorAll('.nav-links a').forEach(a => {
    const href = a.getAttribute('href');
    if (href && href !== '/' && path.startsWith(href)) a.classList.add('active');
    if (href === '/' && path === '/') a.classList.add('active');
  });
})();

// Staggered grid children — add data-reveal BEFORE the observer runs
document.querySelectorAll('.tracks-grid, .leadership-grid, .sister-grid, .grid-3, .bento-grid').forEach(grid => {
  Array.from(grid.children).forEach((child, i) => {
    if (!child.hasAttribute('data-reveal')) {
      child.setAttribute('data-reveal', '');
      child.style.setProperty('--delay', (i * 80) + 'ms');
    }
  });
});

// Scroll-reveal via IntersectionObserver
(function () {
  const els = Array.from(document.querySelectorAll('[data-reveal]'));

  if (!('IntersectionObserver' in window)) {
    els.forEach(el => { el.style.opacity = '1'; el.style.transform = 'none'; });
    return;
  }

  const obs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.05, rootMargin: '0px 0px -20px 0px' });

  els.forEach(el => {
    const rect = el.getBoundingClientRect();
    // Already in viewport on page load — reveal immediately (no transition delay)
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      el.style.transitionDelay = '0ms';
      el.classList.add('revealed');
    } else {
      obs.observe(el);
    }
  });
})();

// Linear drag carousel
(function () {
  const wrap = document.querySelector('.lc-track-wrap');
  if (!wrap) return;
  let isDragging = false, startX = 0, scrollLeft = 0;

  wrap.addEventListener('mousedown', e => {
    isDragging = true;
    startX = e.pageX - wrap.offsetLeft;
    scrollLeft = wrap.scrollLeft;
    wrap.style.cursor = 'grabbing';
  });
  wrap.addEventListener('mouseleave', () => { isDragging = false; wrap.style.cursor = 'grab'; });
  wrap.addEventListener('mouseup',    () => { isDragging = false; wrap.style.cursor = 'grab'; });
  wrap.addEventListener('mousemove', e => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - wrap.offsetLeft;
    wrap.scrollLeft = scrollLeft - (x - startX) * 1.4;
  });
  wrap.addEventListener('touchstart', e => { startX = e.touches[0].pageX; scrollLeft = wrap.scrollLeft; }, { passive: true });
  wrap.addEventListener('touchmove',  e => { wrap.scrollLeft = scrollLeft - (e.touches[0].pageX - startX); }, { passive: true });
})();

// Toppers carousel
(function () {
  const track  = document.getElementById('topperTrack');
  const dotsEl = document.getElementById('topperDots');
  if (!track) return;

  const cards      = Array.from(track.children);
  const VISIBLE    = () => window.innerWidth < 600 ? 1 : window.innerWidth < 900 ? 2 : window.innerWidth < 1100 ? 3 : 4;
  let current      = 0;
  let autoTimer;

  function maxIndex() { return Math.max(0, cards.length - VISIBLE()); }

  function buildDots() {
    if (!dotsEl) return;
    dotsEl.innerHTML = '';
    const n = maxIndex() + 1;
    for (let i = 0; i < n; i++) {
      const d = document.createElement('button');
      d.className = 'tc-dot' + (i === current ? ' active' : '');
      d.addEventListener('click', () => goTo(i));
      dotsEl.appendChild(d);
    }
  }

  function goTo(n) {
    current = Math.max(0, Math.min(n, maxIndex()));
    const cardW = cards[0].offsetWidth + 16; // gap 16px
    track.style.transform = `translateX(-${current * cardW}px)`;
    if (dotsEl) {
      Array.from(dotsEl.children).forEach((d, i) => d.classList.toggle('active', i === current));
    }
  }

  function next() { goTo(current >= maxIndex() ? 0 : current + 1); }
  function prev() { goTo(current <= 0 ? maxIndex() : current - 1); }

  function startAuto() { autoTimer = setInterval(next, 3500); }
  function stopAuto()  { clearInterval(autoTimer); }

  const wrapper = track.closest('.tc-wrapper');
  wrapper?.querySelector('.tc-prev')?.addEventListener('click', () => { stopAuto(); prev(); startAuto(); });
  wrapper?.querySelector('.tc-next')?.addEventListener('click', () => { stopAuto(); next(); startAuto(); });
  wrapper?.addEventListener('mouseenter', stopAuto);
  wrapper?.addEventListener('mouseleave', startAuto);

  buildDots();
  startAuto();
  window.addEventListener('resize', () => { buildDots(); goTo(0); });
})();

// Nav shrink on scroll
(function () {
  const nav = document.querySelector('.site-nav');
  if (!nav) return;
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        nav.classList.toggle('nav-scrolled', window.scrollY > 30);
        ticking = false;
      });
      ticking = true;
    }
  });
})();
