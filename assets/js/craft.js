/* Craft motion: scroll- and touch-driven typography. No dependencies. */
(() => {
  'use strict';
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const io = (cb, opt) => new IntersectionObserver(cb, opt);

  /* 1. word-by-word reveal ------------------------------------------------ */
  function wrapWords(el, cls, masked) {
    let n = 0;
    const walk = (node) => {
      [...node.childNodes].forEach((c) => {
        if (c.nodeType === 3) {
          if (!c.nodeValue.trim()) return;
          const frag = document.createDocumentFragment();
          c.nodeValue.split(/(\s+)/).forEach((t) => {
            if (!t) return;
            if (/^\s+$/.test(t)) { frag.append(' '); return; }
            const inner = document.createElement('span');
            inner.className = cls; inner.style.setProperty('--i', n++); inner.textContent = t;
            if (masked) { const w = document.createElement('span'); w.className = 'w'; w.append(inner); frag.append(w); }
            else frag.append(inner);
          });
          c.replaceWith(frag);
        } else if (c.nodeType === 1 && c.tagName !== 'BR' && !c.classList.contains('w')) walk(c);
      });
    };
    walk(el);
    return n;
  }

  const splitSel = 'main h1, main h2, h1, .prose h2, .case-copy h3, .timeline-content h3, .writing-item h3, .proof-card strong, .testimonial-slide blockquote, .hero-intro, .case-summary';
  const readSel = '.lead-copy, .statement-copy';
  const readEls = [];

  $$(readSel).forEach((el) => { wrapWords(el, 'rw', false); el.classList.add('read'); readEls.push(el); });
  const splitEls = $$(splitSel).filter((el) => !el.classList.contains('read') && !el.closest('.read'));
  splitEls.forEach((el) => { el.classList.remove('reveal'); el.style.opacity = 1; el.style.transform = 'none'; wrapWords(el, 'wi', true); el.classList.add('split'); });

  const splitIO = io((entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); splitIO.unobserve(e.target); } }), { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });
  splitEls.forEach((el) => splitIO.observe(el));

  /* 2. staggered rise for everything else -------------------------------- */
  const riseSel = '.prose > p, .prose li, .prose blockquote, .featured-card, .about-copy p:not(.lead-copy), .text-links, .case-details > div, .tag-row, .case-link, .timeline-content > p, .achievement-list li, .service-card, .proof-card, .skill-group, .stat-line > div, .hero-proof > div, .contact-copy > p, .availability, .contact-direct > *, .field, .footer-grid > *, .tool-rail, .section-header > p, .section-header > a, .proof-heading > p, .statement-note, .portrait-frame, .about-depth';
  const riseEls = $$(riseSel).filter((el) => !el.classList.contains('reveal') && !el.closest('.hero-visual'));
  const byParent = new Map();
  riseEls.forEach((el) => { const l = byParent.get(el.parentElement) || []; l.push(el); byParent.set(el.parentElement, l); });
  byParent.forEach((list) => list.forEach((el, i) => { el.style.setProperty('--d', Math.min(i, 6) * 70 + 'ms'); el.classList.add('rise'); }));
  const riseIO = io((entries) => entries.forEach((e) => {
    if (!e.isIntersecting) return;
    const el = e.target; el.classList.add('in'); riseIO.unobserve(el);
    el.addEventListener('animationend', () => { el.classList.remove('rise', 'in'); el.style.removeProperty('--d'); }, { once: true });
  }), { threshold: 0.12, rootMargin: '0px 0px -5% 0px' });
  riseEls.forEach((el) => riseIO.observe(el));

  /* 3. scroll-linked drift ------------------------------------------------ */
  const drift = [
    ['.section-header h2, .about-heading h2, .proof-heading h2, .testimonial-top h2, .contact-copy h2', 54, 0],
    ['.section-kicker', 34, 0],
    ['.section-header > p, .proof-heading > p, .statement-note', 0, 26],
    ['.about-copy', 0, 22],
    ['.timeline-content h3', 30, 0],
    ['.case-copy h3', 26, 0],
    ['.stat-line strong, .hero-proof strong', 0, 14],
    ['.writing-item h3', 18, 0],
    ['.proof-card strong', 22, 0],
    ['.hero-copy', 0, -30],
    ['.hero-visual', 0, 34]
  ];
  const items = [];
  drift.forEach(([sel, x, y]) => $$(sel).forEach((el) => items.push({ el, x, y, free: /hero-/.test(sel), cy: 0, h: 0, on: false, lx: 0, ly: 0 })));
  const visIO = io((entries) => entries.forEach((e) => { const it = items.find((i) => i.el === e.target); if (it) it.on = e.isIntersecting; }), { rootMargin: '25% 0px 25% 0px' });
  items.forEach((it) => visIO.observe(it.el));

  const bands = $$('.band').map((el, i) => ({ el, track: el.querySelector('.band-track'), dir: el.dataset.dir === 'right' ? 1 : -1, on: false, pos: 0, W: 0, i }));
  bands.forEach((b) => {
    const g = b.track.querySelector('.band-group');
    b.group = g;
    io((en) => en.forEach((e) => { b.on = e.isIntersecting; }), { rootMargin: '10% 0px' }).observe(b.el);
  });
  const sizeBands = () => bands.forEach((b) => {
    b.track.querySelectorAll('.band-group.clone').forEach((n) => n.remove());
    b.W = b.group.getBoundingClientRect().width || 1;
    const need = Math.ceil((innerWidth * 2) / b.W) + 1;
    for (let k = 0; k < need; k++) { const c = b.group.cloneNode(true); c.classList.add('clone'); c.setAttribute('aria-hidden', 'true'); b.track.append(c); }
  });

  /* highlight-as-you-read -------------------------------------------------- */
  const readData = readEls.map((el) => ({ el, words: $$('.rw', el) }));
  const updateRead = () => {
    const vh = innerHeight;
    readData.forEach(({ el, words }) => {
      const r = el.getBoundingClientRect();
      if (r.bottom < -50 || r.top > vh + 50) return;
      const p = clamp((vh * 0.88 - r.top) / (r.height + vh * 0.42));
      const lit = p * (words.length + 4);
      words.forEach((w, i) => { w.style.opacity = (0.18 + 0.82 * clamp(lit - i)).toFixed(2); });
    });
  };

  const measure = () => {
    const sy = scrollY;
    items.forEach((it) => { const r = it.el.getBoundingClientRect(); it.cy = r.top + sy + r.height / 2 - it.ly; });
    sizeBands();
  };

  let vel = 0, skew = 0, lastY = scrollY, lastT = performance.now();
  const frame = (t) => {
    const sy = scrollY, vh = innerHeight, dt = Math.min(48, t - lastT); lastT = t;
    vel += ((sy - lastY) - vel) * 0.18; lastY = sy;
    items.forEach((it) => {
      if (!it.on) return;
      const p = clamp((it.cy - sy - vh / 2) / vh, -1, 1);
      const k = innerWidth < 760 ? 0.3 : 1, r = it.free ? p : Math.pow(clamp((p - 0.12) / 0.88), 1.6), x = Math.round(r * it.x * k * 10) / 10, y = Math.round(r * it.y * k * 10) / 10;
      if (x !== it.lx || y !== it.ly) { it.lx = x; it.ly = y; it.el.style.translate = x + 'px ' + y + 'px'; }
    });
    skew += (clamp(vel * 0.12, -7, 7) - skew) * 0.2;
    bands.forEach((b) => {
      if (!b.on || !b.W) return;
      b.pos += dt * 0.045 + Math.abs(vel) * 0.9;
      const off = (b.pos * 0.7 + sy * 0.25) % b.W;
      const x = b.dir < 0 ? -off : off - b.W;
      b.track.style.transform = 'translate3d(' + x.toFixed(1) + 'px,0,0) skewX(' + (-skew * b.dir * -1).toFixed(2) + 'deg)';
    });
    updateRead();
    requestAnimationFrame(frame);
  };

  const start = () => { measure(); requestAnimationFrame(frame); };
  if (document.readyState === 'complete') start(); else addEventListener('load', start);
  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(measure, 150); }, { passive: true });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
  if ('ResizeObserver' in window) { let h = document.body.scrollHeight; new ResizeObserver(() => { const n = document.body.scrollHeight; if (Math.abs(n - h) > 20) { h = n; measure(); } }).observe(document.body); }
})();
