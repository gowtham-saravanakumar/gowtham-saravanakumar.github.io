/* Systems layer: kinetic + draggable headings, magnetic physics arena, layer slider.
   Standalone, no dependencies. Safe on pages that lack any of these elements. */
(() => {
  'use strict';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(pointer: fine)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const root = document.documentElement;

  /* ---------- 1. kinetic scroll-velocity + draggable headings ---------- */
  const heads = $$('main h1, main h2').filter((h) => !h.closest('.layer-panel'));
  heads.forEach((h) => h.classList.add('kinetic'));

  if (!reduced) {
    const drags = new Map(); // el -> {x,y,vx,vy,held}
    if (fine) {
      heads.forEach((h) => {
        h.classList.add('is-grabbable'); h.setAttribute('data-cursor', 'Drag');
        const s = { x: 0, y: 0, vx: 0, vy: 0, held: false, px: 0, py: 0 };
        drags.set(h, s);
        h.addEventListener('pointerdown', (e) => {
          if (e.button) return;
          s.held = true; s.px = e.clientX; s.py = e.clientY;
          h.classList.add('is-grabbing'); h.setPointerCapture(e.pointerId);
        });
        h.addEventListener('pointermove', (e) => {
          if (!s.held) return;
          s.x = clamp(s.x + (e.clientX - s.px), -180, 180);
          s.y = clamp(s.y + (e.clientY - s.py), -60, 60);
          s.px = e.clientX; s.py = e.clientY;
        });
        const up = () => { s.held = false; h.classList.remove('is-grabbing'); };
        h.addEventListener('pointerup', up);
        h.addEventListener('pointercancel', up);
      });
    }

    let lastY = scrollY, lastT = performance.now(), vel = 0;
    const tracks = $$('.band');
    const tick = (now) => {
      const dt = Math.max(1, now - lastT);
      const raw = ((scrollY - lastY) / dt) * 1000;
      vel += (raw - vel) * 0.12;
      lastY = scrollY; lastT = now;
      const skew = clamp(vel * -0.0035, -8, 8);
      root.style.setProperty('--vel-skew', skew.toFixed(2) + 'deg');
      root.style.setProperty('--vel-scale', (1 + Math.min(0.05, Math.abs(vel) * 0.00002)).toFixed(3));

      // spring-back for dragged headings
      drags.forEach((s, h) => {
        if (!s.held) {
          s.vx += -s.x * 0.12; s.vy += -s.y * 0.12;
          s.vx *= 0.78; s.vy *= 0.78;
          s.x += s.vx; s.y += s.vy;
          if (Math.abs(s.x) < 0.05 && Math.abs(s.y) < 0.05 && Math.abs(s.vx) < 0.05) { s.x = s.y = s.vx = s.vy = 0; }
        }
        h.style.setProperty('--hx', s.x.toFixed(1) + 'px');
        h.style.setProperty('--hy', s.y.toFixed(1) + 'px');
      });

      // velocity-reactive skew on the existing marquee bands (their own animation keeps running)
      tracks.forEach((t, i) => {
        t.style.transform = `skewX(${skew.toFixed(2)}deg)`;
      });
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  /* ---------- 2. magnetic physics arena ---------- */
  const arena = $('#physicsArena');
  const holder = $('#physicsTokens');
  const links = $('#physicsLinks');
  const telemetry = $('#physicsTelemetry');
  if (arena && holder) {
    const cfg = [
      ['TECHNICAL SEO', 'pt-lime', .22, .24], ['ENTITY GRAPHS', 'pt-ink', .74, .22],
      ['CRAWL BUDGET', 'pt-cyan', .26, .52], ['INP < 16MS', 'pt-green', .74, .5],
      ['JSON-LD SCHEMA', 'pt-ember', .3, .78], ['SERP INTENT', 'pt-white', .7, .78],
      ['LOG ANALYSIS', 'pt-cyan', .5, .36], ['HUB & SPOKE', 'pt-ink', .5, .66]
    ];
    const nodes = []; const ptr = { x: -999, y: -999, on: false }; let held = null; let frames = 0, fpsT = performance.now();
    const size = () => { const r = arena.getBoundingClientRect(); return { w: r.width || 600, h: r.height || 400, l: r.left, t: r.top }; };
    const small = () => size().w < 520;

    const build = () => {
      holder.innerHTML = ''; nodes.length = 0;
      const { w, h } = size();
      const list = small() ? cfg.slice(0, 6) : cfg;
      list.forEach((c, i) => {
        const el = document.createElement('div');
        el.className = 'physics-token ' + c[1];
        el.innerHTML = `<em>0${i + 1}</em>${c[0]}`;
        holder.append(el);
        const n = { el, hx: c[2], hy: c[3], x: w * c[2], y: h * c[3], vx: (Math.random() - .5) * 5, vy: (Math.random() - .5) * 5, lx: 0, ly: 0 };
        el.addEventListener('pointerdown', (e) => {
          e.stopPropagation(); el.setPointerCapture(e.pointerId); held = n; el.classList.add('is-dragging');
          const s = size(); n.lx = e.clientX - s.l; n.ly = e.clientY - s.t;
        });
        el.addEventListener('pointermove', (e) => {
          if (held !== n) return;
          const s = size(); const px = e.clientX - s.l, py = e.clientY - s.t;
          n.vx = (px - n.lx) * .85; n.vy = (py - n.ly) * .85; n.x = px; n.y = py; n.lx = px; n.ly = py;
        });
        const rel = () => { if (held === n) { held = null; el.classList.remove('is-dragging'); } };
        el.addEventListener('pointerup', rel); el.addEventListener('pointercancel', rel);
        nodes.push(n);
      });
    };

    arena.addEventListener('pointermove', (e) => { const s = size(); ptr.x = e.clientX - s.l; ptr.y = e.clientY - s.t; ptr.on = true; });
    arena.addEventListener('pointerleave', () => { ptr.on = false; });

    let visible = true;
    new IntersectionObserver((en) => { visible = en[0].isIntersecting; }, { threshold: 0 }).observe(arena);

    const step = () => {
      if (visible && nodes.length) {
        const { w, h } = size();
        const gap = small() ? 96 : 130;
        nodes.forEach((n, i) => {
          if (n === held) return;
          if (!reduced) {
            n.vx += (w * n.hx - n.x) * .018; n.vy += (h * n.hy - n.y) * .018;
            if (ptr.on) {
              const dx = ptr.x - n.x, dy = ptr.y - n.y, d = Math.hypot(dx, dy);
              if (d < 140 && d > 8) { const p = (1 - d / 140) * .55; n.vx += dx / d * p; n.vy += dy / d * p; }
            }
            for (let j = i + 1; j < nodes.length; j++) {
              const m = nodes[j]; const dx = m.x - n.x, dy = m.y - n.y, d = Math.hypot(dx, dy) || 1;
              if (d < gap) { const p = (gap - d) / gap * .65, nx = dx / d, ny = dy / d; n.vx -= nx * p; n.vy -= ny * p; if (m !== held) { m.vx += nx * p; m.vy += ny * p; } }
            }
            n.vx *= .89; n.vy *= .89; n.x += n.vx; n.y += n.vy;
          } else { n.x = w * n.hx; n.y = h * n.hy; }
          const px = Math.min(80, w * .16), py = 24;
          if (n.x < px) { n.x = px; n.vx *= -.7; } if (n.x > w - px) { n.x = w - px; n.vx *= -.7; }
          if (n.y < py) { n.y = py; n.vy *= -.7; } if (n.y > h - py) { n.y = h - py; n.vy *= -.7; }
        });
        let svg = '';
        nodes.forEach((n, i) => {
          n.el.style.transform = `translate3d(${n.x}px,${n.y}px,0) translate(-50%,-50%) rotate(${clamp(n.vx * 1.4, -14, 14).toFixed(1)}deg)`;
          for (let j = i + 1; j < nodes.length; j++) {
            const m = nodes[j], d = Math.hypot(m.x - n.x, m.y - n.y);
            if (d < 220) svg += `<line x1="${n.x.toFixed(1)}" y1="${n.y.toFixed(1)}" x2="${m.x.toFixed(1)}" y2="${m.y.toFixed(1)}" stroke="#d4ff33" stroke-opacity="${((1 - d / 220) * .35).toFixed(2)}" stroke-width="1.2"/>`;
          }
        });
        if (links) links.innerHTML = svg;
        frames++;
        const now = performance.now();
        if (telemetry && now - fpsT > 800) { telemetry.textContent = `${Math.round(frames * 1000 / (now - fpsT))} FPS · SPRING_ON`; frames = 0; fpsT = now; }
      }
      requestAnimationFrame(step);
    };
    $('#impulseBtn')?.addEventListener('click', () => nodes.forEach((n) => { n.vx += (Math.random() - .5) * 30; n.vy += (Math.random() - .5) * 30; }));
    $('#resetBtn')?.addEventListener('click', build);
    let lastSmall = small();
    addEventListener('resize', () => { if (small() !== lastSmall) { lastSmall = small(); build(); } });
    build(); requestAnimationFrame(step);
  }

  /* ---------- 3. layer slider synced with the 3D paper stack ---------- */
  const panel = $('#layerPanel');
  if (panel) {
    const L = [
      { n: 'LAYER 01', tag: 'Crawl budget & rendering', t: 'Technical SEO & Server-Log Crawl Architecture',
        d: 'Before content can rank, search engines must discover, render and canonicalize your URLs without friction. I audit server logs, prune parameter crawl traps, tighten server-side rendering and improve Core Web Vitals (LCP, INP, CLS).',
        k: ['Server log bot-behaviour analysis', 'Faceted parameter & canonical pruning', 'SSR & hydration optimisation', 'Core Web Vitals engineering'] },
      { n: 'LAYER 02', tag: 'Hub-and-spoke topical authority', t: 'Programmatic Content Systems & Internal Link Topology',
        d: 'Isolated blog posts fail to build authority. I architect deterministic hub-and-spoke content ecosystems and programmatic landing page matrices that channel internal PageRank directly into revenue-generating pages.',
        k: ['Hub-and-spoke pillar topology', 'Programmatic landing page systems', 'Internal link graph sculpting', 'Semantic entity & NLP coverage audits'] },
      { n: 'LAYER 03', tag: 'SERP intent & feature capture', t: 'Search Intent Modeling & SERP Feature Engineering',
        d: 'Ranking #1 for the wrong intent brings vanity traffic and no pipeline. I map every query cluster across a four-quadrant intent matrix, aligning templates, comparison tables and structured data to earn the right SERP features.',
        k: ['Query-to-template intent matrix', 'AI Overview citation structuring', 'Comparison & ROI calculators', 'SERP CTR title/meta testing'] },
      { n: 'LAYER 04', tag: 'Revenue attribution', t: 'Organic Pipeline Telemetry & Revenue Attribution',
        d: 'Every SEO initiative is tied to pipeline and acquisition efficiency. I connect GSC, GA4 and CRM data so non-branded click-share, cohort conversions and compounding organic ROI are measured, not guessed.',
        k: ['GSC + GA4 data warehousing', 'Non-branded click-share tracking', 'Multi-touch organic attribution', 'Volatility alert systems'] }
    ];
    const slide = $('#layerSlide'), num = $('#layerNum'), tag = $('#layerTag'), fill = $('#layerFill'), knob = $('#layerKnob'), track = $('#layerTrack');
    const steps = $$('#layerSteps button');
    let cur = -1;

    const render = (i, dir = 1) => {
      if (i === cur) return; const first = cur < 0; cur = i; const m = L[i];
      const paint = () => {
        num.textContent = m.n; tag.textContent = m.tag;
        slide.innerHTML = `<h3>${m.t}</h3><p>${m.d}</p>`;
        $('#layerList').innerHTML = m.k.map((x, j) => `<li style="--i:${j}">${x}</li>`).join('');
        slide.classList.remove('is-out');
      };
      const pct = i / (L.length - 1) * 100;
      fill.style.width = pct + '%'; knob.style.left = pct + '%';
      steps.forEach((b, j) => b.setAttribute('aria-current', String(j === i)));
      if (first || reduced) paint(); else { slide.style.setProperty('--dir', dir > 0 ? '-24px' : '24px'); slide.classList.add('is-out'); setTimeout(paint, 220); }
    };

    const stack = () => window.GowthamStack;
    const go = (i) => { const s = stack(); if (s) s.go(i); else render(i); };
    document.addEventListener('stackchange', (e) => render(e.detail.index, e.detail.direction || 1));
    steps.forEach((b, i) => b.addEventListener('click', () => go(i)));
    $('#prevStackBtn')?.addEventListener('click', () => go((cur + L.length - 1) % L.length));
    $('#nextStackBtn')?.addEventListener('click', () => go((cur + 1) % L.length));
    $('#layerPrev')?.addEventListener('click', () => go((cur + L.length - 1) % L.length));
    $('#layerNext')?.addEventListener('click', () => go((cur + 1) % L.length));

    // draggable slider knob / clickable track
    const fromX = (x) => { const r = track.getBoundingClientRect(); return Math.round(clamp((x - r.left) / r.width, 0, 1) * (L.length - 1)); };
    track.addEventListener('click', (e) => go(fromX(e.clientX)));
    knob.addEventListener('pointerdown', (e) => { e.stopPropagation(); knob.setPointerCapture(e.pointerId); knob.classList.add('is-drag'); });
    knob.addEventListener('pointermove', (e) => {
      if (!knob.classList.contains('is-drag')) return;
      const r = track.getBoundingClientRect(); const p = clamp((e.clientX - r.left) / r.width, 0, 1);
      knob.style.left = p * 100 + '%'; fill.style.width = p * 100 + '%';
      const i = Math.round(p * (L.length - 1)); if (i !== cur) go(i);
    });
    const end = () => { knob.classList.remove('is-drag'); const p = cur / (L.length - 1) * 100; knob.style.left = p + '%'; fill.style.width = p + '%'; };
    knob.addEventListener('pointerup', end); knob.addEventListener('pointercancel', end);

    render(stack() ? stack().index : 0);
  }
})();
