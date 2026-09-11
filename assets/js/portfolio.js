(() => {
  'use strict';

  const root = document.documentElement;
  const body = document.body;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(pointer: fine)');
  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

  // Theme
  const themeToggle = document.getElementById('themeToggle');
  const applyTheme = (theme) => {
    root.dataset.theme = theme;
    if (themeToggle) {
      const dark = theme === 'dark';
      themeToggle.setAttribute('aria-pressed', String(dark));
      themeToggle.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
    }
    const themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta) themeMeta.setAttribute('content', theme === 'dark' ? '#101114' : '#f7f8fb');
  };

  applyTheme(root.dataset.theme === 'dark' ? 'dark' : 'light');
  themeToggle?.addEventListener('click', () => {
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    try { localStorage.setItem('gowtham-theme', next); } catch (e) {}
  });

  // Navigation
  const header = document.getElementById('siteHeader');
  const navLinks = document.getElementById('navLinks');
  const menuToggle = document.getElementById('menuToggle');
  const scrollProgress = document.getElementById('scrollProgress');

  const closeMenu = () => {
    navLinks?.classList.remove('is-open');
    menuToggle?.setAttribute('aria-expanded', 'false');
    menuToggle?.setAttribute('aria-label', 'Open navigation');
    body.classList.remove('menu-open');
  };

  menuToggle?.addEventListener('click', () => {
    const open = menuToggle.getAttribute('aria-expanded') !== 'true';
    navLinks?.classList.toggle('is-open', open);
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    body.classList.toggle('menu-open', open);
  });
  navLinks?.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeMenu(); });

  // Reveal
  const revealNodes = [...document.querySelectorAll('.reveal')];
  if (reducedMotion.matches || !('IntersectionObserver' in window)) {
    revealNodes.forEach(node => node.classList.add('is-visible'));
  } else {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    revealNodes.forEach(node => revealObserver.observe(node));
  }

  // Active nav and timeline state
  const navAnchors = [...document.querySelectorAll('.nav-links a[href^="#"]')];
  const sections = navAnchors.map(a => document.querySelector(a.getAttribute('href'))).filter(Boolean);
  if ('IntersectionObserver' in window) {
    const navObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        navAnchors.forEach(a => a.classList.toggle('is-active', a.getAttribute('href') === `#${entry.target.id}`));
      });
    }, { rootMargin: '-30% 0px -60% 0px', threshold: 0 });
    sections.forEach(section => navObserver.observe(section));

    const timelineObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => entry.target.classList.toggle('is-current', entry.isIntersecting));
    }, { rootMargin: '-34% 0px -46% 0px', threshold: 0 });
    document.querySelectorAll('[data-timeline]').forEach(item => timelineObserver.observe(item));
  }

  // Cursor
  const cursor = document.getElementById('cursor');
  const cursorDot = cursor?.querySelector('.cursor-dot');
  const cursorRing = cursor?.querySelector('.cursor-ring');
  const cursorLabel = document.getElementById('cursorLabel');
  let pointerX = window.innerWidth / 2;
  let pointerY = window.innerHeight / 2;
  let ringX = pointerX;
  let ringY = pointerY;

  const cursorMove = (event) => {
    pointerX = event.clientX;
    pointerY = event.clientY;
    if (cursorDot) cursorDot.style.transform = `translate(${pointerX}px, ${pointerY}px) translate(-50%, -50%)`;
  };

  const cursorFrame = () => {
    ringX += (pointerX - ringX) * 0.16;
    ringY += (pointerY - ringY) * 0.16;
    if (cursorRing) cursorRing.style.transform = `translate(${ringX}px, ${ringY}px) translate(-50%, -50%)`;
    requestAnimationFrame(cursorFrame);
  };

  if (finePointer.matches && !reducedMotion.matches && cursor) {
    window.addEventListener('pointermove', cursorMove, { passive: true });
    requestAnimationFrame(cursorFrame);
    document.querySelectorAll('a, button, [data-cursor]').forEach(node => {
      node.addEventListener('pointerenter', () => {
        const label = node.dataset.cursor || (node.tagName === 'A' ? 'Open' : 'Select');
        cursor.classList.add('is-interactive');
        if (cursorLabel) cursorLabel.textContent = label;
      });
      node.addEventListener('pointerleave', () => {
        cursor.classList.remove('is-interactive');
        if (cursorLabel) cursorLabel.textContent = '';
      });
    });
  }

  // 3D hero and depth cards
  const visualStage = document.getElementById('visualStage');
  const orbitSystem = document.getElementById('orbitSystem');
  const depthCards = [...document.querySelectorAll('[data-depth-card]')];
  if (visualStage && orbitSystem && finePointer.matches && !reducedMotion.matches) {
    visualStage.addEventListener('pointermove', (event) => {
      const rect = visualStage.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      orbitSystem.style.setProperty('--hero-rx', `${clamp(-y * 7, -4, 4)}deg`);
      orbitSystem.style.setProperty('--hero-ry', `${clamp(x * 7, -4, 4)}deg`);
      depthCards.forEach((card, index) => {
        const depth = Number(card.dataset.depthCard || index + 1);
        const tx = x * (10 + depth * 3);
        const ty = y * (8 + depth * 2);
        const baseZ = 44 + depth * 16;
        card.style.transform = `translate3d(${tx}px, ${ty}px, ${baseZ}px)`;
      });
    });
    visualStage.addEventListener('pointerleave', () => {
      orbitSystem.style.setProperty('--hero-rx', '0deg');
      orbitSystem.style.setProperty('--hero-ry', '0deg');
      depthCards.forEach(card => card.style.removeProperty('transform'));
    });
  }

  // About paper stack: drag/swipe one sheet at a time
  const aboutDepth = document.getElementById('aboutDepth');
  const depthStack = document.getElementById('depthStack');
  const stackCounter = document.getElementById('stackCounter');
  const stackSheets = depthStack ? [...depthStack.querySelectorAll('[data-stack-index]')] : [];
  const stackLabels = stackSheets.map(sheet => sheet.querySelector('b')?.textContent?.trim() || 'SEO system');
  let stackIndex = 0;
  let stackDrag = null;
  let stackAnimating = false;

  const paintPaperStack = (dragX = 0, dragY = 0) => {
    if (!depthStack || !stackSheets.length) return;
    const total = stackSheets.length;
    const peel = clamp(Math.abs(dragX) / 125, 0, 1);

    stackSheets.forEach((sheet, sheetIndex) => {
      const order = (sheetIndex - stackIndex + total) % total;
      sheet.classList.toggle('is-active', order === 0);
      sheet.style.zIndex = String(total - order);

      if (order === 0) {
        const rotate = clamp(dragX * 0.035, -7, 7);
        const lift = Math.min(Math.abs(dragX) * 0.025, 5);
        sheet.style.transform = `translate3d(${dragX}px, ${dragY - lift}px, 24px) rotateZ(${rotate}deg) scale(${1 + peel * 0.008})`;
        sheet.style.opacity = String(1 - peel * 0.12);
        return;
      }

      const effectiveOrder = Math.max(0, order - peel);
      const x = effectiveOrder * 6;
      const y = effectiveOrder * 10;
      const z = -effectiveOrder * 18;
      const scale = Math.max(0.88, 1 - effectiveOrder * 0.032);
      const rotate = effectiveOrder * (order % 2 ? -0.8 : 0.65);
      sheet.style.transform = `translate3d(${x}px, ${y}px, ${z}px) rotateZ(${rotate}deg) scale(${scale})`;
      sheet.style.opacity = String(Math.max(0.62, 1 - effectiveOrder * 0.08));
    });

    if (stackCounter) stackCounter.textContent = `${String(stackIndex + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`;
    const current = stackLabels[stackIndex] || 'SEO system';
    depthStack.setAttribute('aria-label', `${current}, card ${stackIndex + 1} of ${total}. Drag or swipe the paper stack to move through the system. Use arrow keys, Enter or Space on a keyboard.`);
  };

  const advancePaperStack = (direction = -1) => {
    if (!depthStack || !stackSheets.length || stackAnimating) return;
    stackAnimating = true;
    const currentSheet = stackSheets[stackIndex];
    const exitX = direction < 0 ? -Math.max(depthStack.offsetWidth * 1.25, 270) : Math.max(depthStack.offsetWidth * 1.25, 270);
    const exitRotate = direction < 0 ? -10 : 10;
    currentSheet.style.transform = `translate3d(${exitX}px, -14px, 70px) rotateZ(${exitRotate}deg) scale(1.015)`;
    currentSheet.style.opacity = '0';

    const finish = () => {
      stackIndex = (stackIndex + 1) % stackSheets.length;
      currentSheet.style.opacity = '';
      stackAnimating = false;
      paintPaperStack();
    };

    window.setTimeout(finish, reducedMotion.matches ? 20 : 360);
  };

  if (depthStack && stackSheets.length) {
    paintPaperStack();

    depthStack.addEventListener('pointerdown', (event) => {
      if (stackAnimating || event.button > 0) return;
      stackDrag = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, dx: 0, dy: 0 };
      depthStack.classList.add('is-dragging');
      depthStack.setPointerCapture?.(event.pointerId);
    });

    depthStack.addEventListener('pointermove', (event) => {
      if (!stackDrag || stackDrag.pointerId !== event.pointerId || stackAnimating) return;
      stackDrag.dx = clamp(event.clientX - stackDrag.startX, -180, 180);
      stackDrag.dy = clamp((event.clientY - stackDrag.startY) * 0.18, -14, 14);
      paintPaperStack(stackDrag.dx, stackDrag.dy);
    });

    const releasePaperStack = (event) => {
      if (!stackDrag || (event.pointerId != null && stackDrag.pointerId !== event.pointerId)) return;
      const dx = stackDrag.dx;
      depthStack.classList.remove('is-dragging');
      if (event.pointerId != null && depthStack.hasPointerCapture?.(event.pointerId)) depthStack.releasePointerCapture(event.pointerId);
      stackDrag = null;

      if (Math.abs(dx) >= 56) {
        advancePaperStack(dx < 0 ? -1 : 1);
      } else {
        paintPaperStack();
      }
    };

    depthStack.addEventListener('pointerup', releasePaperStack);
    depthStack.addEventListener('pointercancel', releasePaperStack);

    depthStack.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight' || event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        advancePaperStack(event.key === 'ArrowRight' ? 1 : -1);
      } else if (event.key === 'Home') {
        event.preventDefault();
        stackIndex = 0;
        paintPaperStack();
      }
    });
  }

  // Tilt surfaces
  if (finePointer.matches && !reducedMotion.matches) {
    document.querySelectorAll('.tilt-surface').forEach(surface => {
      surface.addEventListener('pointermove', (event) => {
        const rect = surface.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;
        surface.style.transform = `perspective(1100px) rotateX(${clamp(-y * 4.5, -3.3, 3.3)}deg) rotateY(${clamp(x * 5.5, -4, 4)}deg) translateY(-2px)`;
      });
      surface.addEventListener('pointerleave', () => { surface.style.transform = ''; });
    });
  }

  // Magnetic interactions
  if (finePointer.matches && !reducedMotion.matches) {
    document.querySelectorAll('.magnetic').forEach(node => {
      node.addEventListener('pointermove', (event) => {
        const rect = node.getBoundingClientRect();
        const x = event.clientX - (rect.left + rect.width / 2);
        const y = event.clientY - (rect.top + rect.height / 2);
        node.style.transform = `translate(${clamp(x * 0.13, -7, 7)}px, ${clamp(y * 0.13, -6, 6)}px)`;
      });
      node.addEventListener('pointerleave', () => { node.style.transform = ''; });
    });
  }

  // Skills interaction
  const skillName = document.getElementById('skillName');
  const skillNote = document.getElementById('skillNote');
  const skillTools = document.getElementById('skillTools');
  const skillChips = [...document.querySelectorAll('.skill-chip')];
  const selectSkill = (chip) => {
    skillChips.forEach(item => item.classList.toggle('is-active', item === chip));
    if (skillName) skillName.textContent = chip.dataset.skill || chip.textContent.trim();
    if (skillNote) skillNote.textContent = chip.dataset.note || '';
    if (skillTools) skillTools.textContent = chip.dataset.tools || '';
  };
  skillChips.forEach(chip => {
    chip.addEventListener('mouseenter', () => selectSkill(chip));
    chip.addEventListener('focus', () => selectSkill(chip));
    chip.addEventListener('click', () => selectSkill(chip));
  });

  // Testimonials
  const testimonialSlides = [...document.querySelectorAll('[data-testimonial]')];
  const testimonialPrev = document.getElementById('testimonialPrev');
  const testimonialNext = document.getElementById('testimonialNext');
  const testimonialCount = document.getElementById('testimonialCount');
  let testimonialIndex = 0;
  const showTestimonial = (index) => {
    if (!testimonialSlides.length) return;
    testimonialIndex = (index + testimonialSlides.length) % testimonialSlides.length;
    testimonialSlides.forEach((slide, i) => {
      const active = i === testimonialIndex;
      slide.hidden = !active;
      slide.classList.toggle('is-active', active);
    });
    if (testimonialCount) testimonialCount.textContent = `${String(testimonialIndex + 1).padStart(2, '0')} / ${String(testimonialSlides.length).padStart(2, '0')}`;
  };
  testimonialPrev?.addEventListener('click', () => showTestimonial(testimonialIndex - 1));
  testimonialNext?.addEventListener('click', () => showTestimonial(testimonialIndex + 1));

  // Contact form with accessible validation and FormSubmit AJAX
  const contactForm = document.getElementById('contactForm');
  const formSubmit = document.getElementById('formSubmit');
  const formStatus = document.getElementById('formStatus');

  const setFieldValidity = (input) => {
    const field = input.closest('.field');
    if (!field) return true;
    const error = field.querySelector('.field-error');
    let message = '';
    if (input.required && !input.value.trim()) message = 'Please complete this field.';
    else if (input.type === 'email' && input.value && !input.validity.valid) message = 'Please enter a valid email address.';
    field.classList.toggle('is-invalid', Boolean(message));
    if (error) error.textContent = message;
    input.setAttribute('aria-invalid', String(Boolean(message)));
    return !message;
  };

  contactForm?.querySelectorAll('input:not([type="hidden"]), textarea, select').forEach(input => {
    input.addEventListener('blur', () => setFieldValidity(input));
    input.addEventListener('input', () => {
      if (input.closest('.field')?.classList.contains('is-invalid')) setFieldValidity(input);
    });
  });

  contactForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const fields = [...contactForm.querySelectorAll('input:not([type="hidden"]):not(.honeypot), textarea, select')];
    const valid = fields.map(setFieldValidity).every(Boolean);
    if (!valid) {
      const firstInvalid = contactForm.querySelector('[aria-invalid="true"]');
      firstInvalid?.focus();
      return;
    }

    if (formSubmit) {
      formSubmit.disabled = true;
      formSubmit.innerHTML = 'Sending… <span>↗</span>';
    }
    if (formStatus) {
      formStatus.textContent = '';
      formStatus.className = 'form-status';
    }

    try {
      const response = await fetch(contactForm.action, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: new FormData(contactForm)
      });
      if (!response.ok) throw new Error('Form submission failed');
      contactForm.reset();
      if (formStatus) {
        formStatus.textContent = "Thanks — your project details are in. I'll reply as soon as possible.";
        formStatus.className = 'form-status is-success';
      }
    } catch (error) {
      if (formStatus) {
        formStatus.textContent = 'The form could not send right now. Please email gowthamhariharan42643@gmail.com directly.';
        formStatus.className = 'form-status is-error';
      }
    } finally {
      if (formSubmit) {
        formSubmit.disabled = false;
        formSubmit.innerHTML = 'Send project details <span>↗</span>';
      }
    }
  });

  // Scroll effects in one rAF loop
  const parallaxNodes = [...document.querySelectorAll('[data-parallax]')];
  const statementLines = [...document.querySelectorAll('[data-statement] > *')];
  const timeline = document.getElementById('timeline');
  let ticking = false;

  const updateScrollEffects = () => {
    const scrollY = window.scrollY;
    const viewportH = window.innerHeight;
    const doc = document.documentElement;
    const scrollable = Math.max(doc.scrollHeight - viewportH, 1);
    const progress = clamp(scrollY / scrollable, 0, 1);

    header?.classList.toggle('is-scrolled', scrollY > 48);
    if (scrollProgress) scrollProgress.style.width = `${progress * 100}%`;

    if (!reducedMotion.matches) {
      if (orbitSystem && window.innerWidth > 700) orbitSystem.style.setProperty('--hero-scroll-y', `${clamp(scrollY * 0.006, 0, 5)}px`);

      if (aboutDepth && depthStack && window.innerWidth > 700) {
        const aboutRect = aboutDepth.getBoundingClientRect();
        if (aboutRect.bottom > -100 && aboutRect.top < viewportH + 100) {
          const aboutOffset = (aboutRect.top + aboutRect.height / 2 - viewportH / 2) * 0.018;
          depthStack.style.setProperty('--depth-y', `${clamp(aboutOffset, -8, 8)}px`);
        }
      }

      if (window.innerWidth > 700) parallaxNodes.forEach(node => {
        const rect = node.getBoundingClientRect();
        if (rect.bottom < -100 || rect.top > viewportH + 100) return;
        const depth = Number(node.dataset.parallax || 0);
        const distance = (rect.top + rect.height / 2 - viewportH / 2) * depth;
        node.style.transform = `translate3d(0, ${clamp(distance, -80, 80)}px, 0)`;
      });

      statementLines.forEach((line, index) => {
        const rect = line.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > viewportH) return;
        const offset = (rect.top - viewportH * 0.55) * (index % 2 === 0 ? -0.035 : 0.035);
        line.style.transform = `translate3d(${clamp(offset, -24, 24)}px, 0, 0)`;
      });
    }

    if (timeline) {
      const rect = timeline.getBoundingClientRect();
      const total = rect.height - viewportH * 0.35;
      const visible = clamp(viewportH * 0.42 - rect.top, 0, total);
      const pct = total > 0 ? (visible / total) * 100 : 0;
      timeline.style.setProperty('--timeline-progress', `${clamp(pct, 0, 100)}%`);
    }

    ticking = false;
  };

  const requestScrollUpdate = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(updateScrollEffects);
  };

  window.addEventListener('scroll', requestScrollUpdate, { passive: true });
  window.addEventListener('resize', requestScrollUpdate, { passive: true });
  reducedMotion.addEventListener?.('change', requestScrollUpdate);
  requestScrollUpdate();
})();
