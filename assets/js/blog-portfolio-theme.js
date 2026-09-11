(() => {
  'use strict';
  const root = document.documentElement;
  const toggle = document.getElementById('themeToggle');
  const header = document.getElementById('hdr');

  const applyTheme = (theme) => {
    const dark = theme === 'dark';
    root.dataset.theme = dark ? 'dark' : 'light';
    if (toggle) {
      toggle.setAttribute('aria-pressed', String(dark));
      toggle.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
    }
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', dark ? '#101114' : '#f7f8fb');
  };

  applyTheme(root.dataset.theme === 'dark' ? 'dark' : 'light');
  const syncHeader = () => header?.classList.toggle('scrolled', window.scrollY > 60);
  syncHeader();
  window.addEventListener('scroll', syncHeader, { passive: true });

  toggle?.addEventListener('click', () => {
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    try { localStorage.setItem('gowtham-theme', next); } catch (e) {}
  });
})();
