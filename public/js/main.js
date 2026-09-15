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
