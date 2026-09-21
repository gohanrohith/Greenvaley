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
