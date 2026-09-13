/* ==========================================================================
   NEXUS — main.js
   All behavior is guarded by element existence checks so this single file
   can be shared across every page without throwing on missing markup.
   ========================================================================== */

(function () {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasFinePointer = window.matchMedia('(pointer: fine)').matches;
  if (hasFinePointer) document.documentElement.classList.add('has-fine-pointer');

  /* ------------------------------------------------------------------ */
  /* Ambient particle field                                             */
  /* ------------------------------------------------------------------ */
  function buildParticles() {
    const host = document.querySelector('.field__particles');
    if (!host || reduceMotion) return;
    const count = window.innerWidth < 700 ? 16 : 34;
    for (let i = 0; i < count; i++) {
      const p = document.createElement('span');
      p.className = 'particle';
      const size = Math.random() * 2 + 1;
      p.style.width = size + 'px';
      p.style.height = size + 'px';
      p.style.left = Math.random() * 100 + 'vw';
      p.style.top = Math.random() * 100 + 'vh';
      const duration = Math.random() * 14 + 10;
      p.style.animationDuration = duration + 's';
      p.style.animationDelay = -(Math.random() * duration) + 's';
      host.appendChild(p);
    }
  }

  /* ------------------------------------------------------------------ */
  /* Cursor-follow glow (desktop only)                                   */
  /* ------------------------------------------------------------------ */
  function initCursorGlow() {
    const glow = document.querySelector('.field__cursor');
    if (!glow || !hasFinePointer || reduceMotion) return;
    let tx = 0, ty = 0, cx = 0, cy = 0;
    window.addEventListener('mousemove', (e) => {
      tx = e.clientX;
      ty = e.clientY;
    });
    (function loop() {
      cx += (tx - cx) * 0.12;
      cy += (ty - cy) * 0.12;
      glow.style.transform = `translate(${cx}px, ${cy}px)`;
      requestAnimationFrame(loop);
    })();
  }

  /* ------------------------------------------------------------------ */
  /* Navigation: scroll state, active link, mobile menu                 */
  /* ------------------------------------------------------------------ */
  function initNav() {
    const nav = document.querySelector('.nav');
    if (!nav) return;

    const onScroll = () => {
      nav.classList.toggle('is-scrolled', window.scrollY > 12);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    // Active link based on current file name
    const current = (location.pathname.split('/').pop() || 'index.html');
    document.querySelectorAll('.nav__links a, .nav__mobile a').forEach((a) => {
      const href = a.getAttribute('href');
      if (href === current || (current === '' && href === 'index.html')) {
        a.classList.add('is-active');
        a.setAttribute('aria-current', 'page');
      }
    });

    const toggle = document.querySelector('.nav__toggle');
    const mobile = document.querySelector('.nav__mobile');
    if (toggle && mobile) {
      const closeMenu = () => {
        toggle.classList.remove('is-open');
        mobile.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      };
      const openMenu = () => {
        toggle.classList.add('is-open');
        mobile.classList.add('is-open');
        toggle.setAttribute('aria-expanded', 'true');
        document.body.style.overflow = 'hidden';
      };
      toggle.addEventListener('click', () => {
        toggle.classList.contains('is-open') ? closeMenu() : openMenu();
      });
      mobile.querySelectorAll('a').forEach((a) => a.addEventListener('click', closeMenu));
      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeMenu();
      });
    }
  }

  /* ------------------------------------------------------------------ */
  /* Scroll-triggered reveal animations                                 */
  /* ------------------------------------------------------------------ */
  function initReveal() {
    const targets = document.querySelectorAll('.reveal');
    if (!targets.length) return;

    if (reduceMotion || !('IntersectionObserver' in window)) {
      targets.forEach((t) => t.classList.add('is-visible'));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.16, rootMargin: '0px 0px -8% 0px' }
    );
    targets.forEach((t) => io.observe(t));
  }

  /* ------------------------------------------------------------------ */
  /* Animated number counters                                           */
  /* ------------------------------------------------------------------ */
  function initCounters() {
    const counters = document.querySelectorAll('[data-count-to]');
    if (!counters.length) return;

    const animate = (el) => {
      const target = parseFloat(el.getAttribute('data-count-to'));
      const decimals = (el.getAttribute('data-count-to').split('.')[1] || '').length;
      const suffix = el.getAttribute('data-suffix') || '';
      const duration = 1400;
      const start = performance.now();

      const step = (now) => {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const value = target * eased;
        el.textContent = value.toFixed(decimals) + suffix;
        if (progress < 1) requestAnimationFrame(step);
      };
      if (reduceMotion) {
        el.textContent = target.toFixed(decimals) + suffix;
      } else {
        requestAnimationFrame(step);
      }
    };

    if (!('IntersectionObserver' in window)) {
      counters.forEach(animate);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animate(entry.target);
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.6 }
    );
    counters.forEach((c) => io.observe(c));
  }

  /* ------------------------------------------------------------------ */
  /* Explore page: expandable cards + filter + search                   */
  /* ------------------------------------------------------------------ */
  function initExplore() {
    const grid = document.querySelector('[data-explore-grid]');
    if (!grid) return;

    const cards = Array.from(grid.querySelectorAll('.explore-card'));
    const filters = document.querySelectorAll('[data-filter]');
    const search = document.querySelector('[data-explore-search]');

    cards.forEach((card) => {
      const toggleBtn = card.querySelector('.explore-card__toggle');
      const open = () => card.classList.toggle('is-open');
      if (toggleBtn) toggleBtn.addEventListener('click', open);
      card.addEventListener('click', (e) => {
        if (e.target.closest('.explore-card__toggle')) return;
        card.classList.toggle('is-open');
      });
      card.setAttribute('tabindex', '0');
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          card.classList.toggle('is-open');
        }
      });
    });

    let activeFilter = 'all';
    let query = '';

    function applyFilters() {
      cards.forEach((card) => {
        const cat = card.getAttribute('data-category');
        const text = card.textContent.toLowerCase();
        const matchesFilter = activeFilter === 'all' || cat === activeFilter;
        const matchesQuery = query === '' || text.includes(query);
        card.classList.toggle('is-hidden', !(matchesFilter && matchesQuery));
      });
    }

    filters.forEach((btn) => {
      btn.addEventListener('click', () => {
        filters.forEach((b) => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        activeFilter = btn.getAttribute('data-filter');
        applyFilters();
      });
    });

    if (search) {
      search.addEventListener('input', (e) => {
        query = e.target.value.trim().toLowerCase();
        applyFilters();
      });
    }
  }

  /* ------------------------------------------------------------------ */
  /* Projects page: data + modal                                        */
  /* ------------------------------------------------------------------ */
  const PROJECTS = [
    {
      id: 'aurora-grid',
      title: 'Aurora Grid',
      desc: 'A distributed rendering mesh that lets independent GPUs collaborate on a single frame in real time.',
      tags: ['Distributed Systems', 'Rendering', 'Rust'],
      stats: [{ n: '4.2x', l: 'Render throughput' }, { n: '12ms', l: 'Sync latency' }, { n: '3', l: 'Data centers' }],
      body: [
        'Aurora Grid splits a single render frame across a mesh of independent machines, then reassembles the tiles before the next refresh is due.',
        'The scheduler predicts which machine will finish first and rebalances outstanding tiles mid-frame, which is what keeps latency flat as the mesh grows.'
      ]
    },
    {
      id: 'signal-atlas',
      title: 'Signal Atlas',
      desc: 'Mapping software-defined radio activity across a city into a single navigable layer.',
      tags: ['SDR', 'Mapping', 'Data Viz'],
      stats: [{ n: '92%', l: 'Coverage accuracy' }, { n: '1.8M', l: 'Signals indexed' }, { n: '40', l: 'Sensor nodes' }],
      body: [
        'Signal Atlas ingests raw spectrum captures from a rooftop sensor network and classifies them into a live map layer anyone can query.',
        'Because the classification runs at the edge, the central service only ever handles compact event summaries rather than raw IQ data.'
      ]
    },
    {
      id: 'hollow-type',
      title: 'Hollow Type',
      desc: 'A variable font engine that reshapes letterforms based on the reader\u2019s scroll velocity.',
      tags: ['Typography', 'WebGL', 'Type Design'],
      stats: [{ n: '9', l: 'Axis parameters' }, { n: '60fps', l: 'Redraw target' }, { n: '0', l: 'External fonts loaded' }],
      body: [
        'Hollow Type treats every glyph as a small physics object: weight and width respond to how fast a reader is moving through the page.',
        'The whole system runs on a single variable font file, so the visual range comes from interpolation rather than swapping assets.'
      ]
    },
    {
      id: 'quiet-mesh',
      title: 'Quiet Mesh',
      desc: 'Peer-to-peer messaging that keeps working when the network in the room disappears.',
      tags: ['Networking', 'Offline-first', 'Security'],
      stats: [{ n: '150m', l: 'Mesh radius' }, { n: '0', l: 'Central servers' }, { n: '256-bit', l: 'Encryption' }],
      body: [
        'Quiet Mesh routes messages device-to-device over local radio when internet access drops, then reconciles with the cloud once it returns.',
        'Every hop re-encrypts independently, so no single relay in the mesh ever holds a readable copy of a message.'
      ]
    },
    {
      id: 'glass-ledger',
      title: 'Glass Ledger',
      desc: 'An audit trail for machine-generated decisions that regulators can actually read.',
      tags: ['Explainability', 'Compliance', 'Systems'],
      stats: [{ n: '100%', l: 'Decisions logged' }, { n: '6ms', l: 'Logging overhead' }, { n: '14', l: 'Institutions piloting' }],
      body: [
        'Glass Ledger captures the inputs, weights, and thresholds behind an automated decision at the moment it is made, not after the fact.',
        'The output reads like a short explanation rather than a raw log, which is what let early pilots use it directly in audits.'
      ]
    },
    {
      id: 'nightfall-os',
      title: 'Nightfall OS',
      desc: 'A minimal operating layer purpose-built for instruments that only wake up to sense and sleep.',
      tags: ['Embedded', 'Power Systems', 'C'],
      stats: [{ n: '11\u03bcA', l: 'Sleep draw' }, { n: '380', l: 'KB footprint' }, { n: '4yr', l: 'Battery target' }],
      body: [
        'Nightfall OS assumes a device spends 99.9% of its life asleep, so every subsystem is designed around waking cleanly rather than running continuously.',
        'The scheduler batches sensor reads into short bursts, which is where most of the power budget ends up being saved.'
      ]
    }
  ];

  function renderProjects() {
    const list = document.querySelector('[data-projects-list]');
    if (!list) return;
    list.innerHTML = PROJECTS.map((p, i) => `
      <div class="project-row reveal" data-project-id="${p.id}" role="button" tabindex="0" aria-haspopup="dialog">
        <span class="project-row__index">${String(i + 1).padStart(2, '0')}</span>
        <span class="project-row__title">${p.title}</span>
        <span class="project-row__tags">${p.tags.map((t) => `<span class="tag">${t}</span>`).join('')}</span>
        <span class="project-row__cta">View project <span class="btn__arrow">&rarr;</span></span>
      </div>
    `).join('');
  }

  function initProjectModal() {
    const overlay = document.querySelector('[data-modal-overlay]');
    if (!overlay) return;
    const modal = overlay.querySelector('.modal');
    const closeBtn = overlay.querySelector('.modal__close');
    let lastFocused = null;

    function fill(project) {
      modal.innerHTML = `
        <button class="modal__close" data-modal-close aria-label="Close project detail">&times;</button>
        <p class="modal__eyebrow">Project detail</p>
        <h3 class="modal__title">${project.title}</h3>
        <div class="modal__meta">${project.tags.map((t) => `<span class="tag">${t}</span>`).join('')}</div>
        <div class="modal__body">
          <p>${project.desc}</p>
          ${project.body.map((b) => `<p>${b}</p>`).join('')}
        </div>
        <div class="modal__stats">
          ${project.stats.map((s) => `<div><div class="modal__stat-num">${s.n}</div><div class="modal__stat-label">${s.l}</div></div>`).join('')}
        </div>
      `;
      modal.querySelector('[data-modal-close]').addEventListener('click', close);
    }

    function open(project) {
      lastFocused = document.activeElement;
      fill(project);
      overlay.classList.add('is-open');
      overlay.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      const closeEl = modal.querySelector('.modal__close');
      if (closeEl) closeEl.focus();
    }

    function close() {
      overlay.classList.remove('is-open');
      overlay.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      if (lastFocused) lastFocused.focus();
    }

    document.addEventListener('click', (e) => {
      const row = e.target.closest('[data-project-id]');
      if (row) {
        const project = PROJECTS.find((p) => p.id === row.getAttribute('data-project-id'));
        if (project) open(project);
      }
    });

    document.addEventListener('keydown', (e) => {
      const row = document.activeElement && document.activeElement.closest && document.activeElement.closest('[data-project-id]');
      if (row && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        const project = PROJECTS.find((p) => p.id === row.getAttribute('data-project-id'));
        if (project) open(project);
      }
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });
    if (closeBtn) closeBtn.addEventListener('click', close);
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && overlay.classList.contains('is-open')) close();
    });
  }

  /* ------------------------------------------------------------------ */
  /* Contact form validation                                            */
  /* ------------------------------------------------------------------ */
  function initContactForm() {
    const form = document.querySelector('[data-contact-form]');
    if (!form) return;
    const status = form.querySelector('[data-form-status]');

    const validators = {
      name: (v) => v.trim().length >= 2 || 'Enter your full name.',
      email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || 'Enter a valid email address.',
      message: (v) => v.trim().length >= 12 || 'Say a little more \u2014 at least 12 characters.'
    };

    function validateField(input) {
      const group = input.closest('.field-group');
      const rule = validators[input.name];
      if (!rule) return true;
      const result = rule(input.value);
      const errorEl = group.querySelector('.field-error');
      if (result === true) {
        group.classList.remove('has-error');
        if (errorEl) errorEl.textContent = '';
        return true;
      }
      group.classList.add('has-error');
      if (errorEl) errorEl.textContent = result;
      return false;
    }

    form.querySelectorAll('.field-input').forEach((input) => {
      input.addEventListener('blur', () => validateField(input));
      input.addEventListener('input', () => {
        if (input.closest('.field-group').classList.contains('has-error')) validateField(input);
      });
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const inputs = Array.from(form.querySelectorAll('.field-input'));
      const valid = inputs.map(validateField).every(Boolean);
      if (!valid) {
        if (status) status.textContent = 'Please fix the highlighted fields.';
        return;
      }
      const submitBtn = form.querySelector('[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending\u2026';
      }
      setTimeout(() => {
        if (status) status.textContent = 'Message sent. NEXUS will respond within two business days.';
        form.reset();
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = 'Send message <span class="btn__arrow">&rarr;</span>';
        }
      }, 900);
    });
  }

  /* ------------------------------------------------------------------ */
  /* Lab: cursor-reactive glow panel                                    */
  /* ------------------------------------------------------------------ */
  function initGlowStage() {
    const stage = document.querySelector('[data-glow-stage]');
    if (!stage) return;
    const dot = stage.querySelector('.glow-stage__dot');
    stage.addEventListener('pointermove', (e) => {
      const rect = stage.getBoundingClientRect();
      dot.style.left = (e.clientX - rect.left) + 'px';
      dot.style.top = (e.clientY - rect.top) + 'px';
    });
  }

  /* ------------------------------------------------------------------ */
  /* Lab: canvas particle field                                         */
  /* ------------------------------------------------------------------ */
  function initParticleStage() {
    const canvas = document.querySelector('[data-particle-canvas]');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let particles = [];
    let raf;

    function resize() {
      const rect = canvas.parentElement.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    }

    function seed() {
      const count = 60;
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        r: Math.random() * 1.6 + 0.6
      }));
    }

    function tick() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(73, 232, 255, 0.7)';
        ctx.fill();
      });
      // connective lines
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 90) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(156, 107, 255, ${0.14 * (1 - dist / 90)})`;
            ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(tick);
    }

    resize();
    seed();
    if (!reduceMotion) tick();
    else { ctx.clearRect(0,0,canvas.width,canvas.height); particles.forEach(p=>{ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fillStyle='rgba(73,232,255,0.7)';ctx.fill();}); }
    window.addEventListener('resize', () => {
      cancelAnimationFrame(raf);
      resize();
      seed();
      if (!reduceMotion) tick();
    });
  }

  /* ------------------------------------------------------------------ */
  /* Lab: magnetic buttons                                              */
  /* ------------------------------------------------------------------ */
  function initMagnetic() {
    const items = document.querySelectorAll('.magnetic');
    if (!items.length || !hasFinePointer || reduceMotion) return;
    items.forEach((el) => {
      el.addEventListener('mousemove', (e) => {
        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        el.style.transform = `translate(${x * 0.35}px, ${y * 0.35}px)`;
      });
      el.addEventListener('mouseleave', () => {
        el.style.transform = 'translate(0, 0)';
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /* Lab: tilt card                                                     */
  /* ------------------------------------------------------------------ */
  function initTilt() {
    const card = document.querySelector('[data-tilt-card]');
    if (!card || !hasFinePointer || reduceMotion) return;
    const stage = card.parentElement;
    stage.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width - 0.5;
      const py = (e.clientY - rect.top) / rect.height - 0.5;
      card.style.transform = `rotateY(${px * 22}deg) rotateX(${py * -22}deg)`;
    });
    stage.addEventListener('mouseleave', () => {
      card.style.transform = 'rotateY(0) rotateX(0)';
    });
  }

  /* ------------------------------------------------------------------ */
  /* Lab: color / lighting controls                                     */
  /* ------------------------------------------------------------------ */
  function initControls() {
    const hue = document.querySelector('[data-control-hue]');
    const glow = document.querySelector('[data-control-glow]');
    const preview = document.querySelector('[data-control-preview]');
    if (!hue || !glow || !preview) return;

    function update() {
      const h = hue.value;
      const g = glow.value;
      preview.style.background = `hsl(${h}, 90%, 60%)`;
      preview.style.boxShadow = `0 0 ${g * 2}px ${g}px hsla(${h}, 90%, 60%, 0.35)`;
    }
    hue.addEventListener('input', update);
    glow.addEventListener('input', update);
    update();
  }

  /* ------------------------------------------------------------------ */
  /* Lab: live clock                                                    */
  /* ------------------------------------------------------------------ */
  function initClock() {
    const timeEl = document.querySelector('[data-clock-time]');
    const dateEl = document.querySelector('[data-clock-date]');
    if (!timeEl) return;
    function tick() {
      const now = new Date();
      timeEl.textContent = now.toLocaleTimeString([], { hour12: false });
      if (dateEl) {
        dateEl.textContent = now.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      }
    }
    tick();
    setInterval(tick, 1000);
  }

  /* ------------------------------------------------------------------ */
  /* Boot                                                                */
  /* ------------------------------------------------------------------ */
  document.addEventListener('DOMContentLoaded', () => {
    document.body.classList.add('is-ready');
    buildParticles();
    initCursorGlow();
    initNav();
    initReveal();
    initCounters();
    initExplore();
    renderProjects();
    initProjectModal();
    initContactForm();
    initGlowStage();
    initParticleStage();
    initMagnetic();
    initTilt();
    initControls();
    initClock();
  });
})();
