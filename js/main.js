/* ============================================================
   LABORATORIO INMERSIVO M01 — motor
   Pregunta gigante → definición dosificada beat a beat →
   escena persistente que se explica sola mientras el texto avanza.
   ============================================================ */

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

const prefersReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const stored = localStorage.getItem('presencia:motion');
const MOTION = stored ? stored === 'on' : !prefersReduced;
document.documentElement.dataset.motion = MOTION ? 'on' : 'off';

const toggle = document.getElementById('motionToggle');
toggle.setAttribute('aria-pressed', String(!MOTION));
/* Con el movimiento apagado el sitio parece roto: el botón lo dice sin rodeos
   y explica cómo volver. La preferencia queda guardada entre visitas. */
toggle.querySelector('.motion-toggle__text').textContent =
  MOTION ? 'Movimiento' : 'Animaciones OFF · activar';
toggle.title = MOTION
  ? 'Desactivar animaciones (modo accesible)'
  : 'Las animaciones están desactivadas. Pulsa para volver a activarlas.';
toggle.addEventListener('click', () => {
  localStorage.setItem('presencia:motion', MOTION ? 'off' : 'on');
  location.reload();
});

const BONE = '#EFE9DE', ACID = '#CBFF3E', DIM = 'rgba(239,233,222,0.10)';

/* ---------- Smooth scroll ---------- */
let lenis = null;
if (MOTION) {
  lenis = new Lenis({
    duration: 1.05,
    easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true, touchMultiplier: 1.6,
  });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(time => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}
const scrollToTarget = t => lenis
  ? lenis.scrollTo(t, { duration: 1.4 })
  : gsap.to(window, { scrollTo: t, duration: .6, ease: 'power2.inOut' });

/* ---------- Cursor ---------- */
(function cursor() {
  if (!MOTION || matchMedia('(pointer: coarse)').matches) return;
  const ring = document.querySelector('.cursor');
  const dot = document.querySelector('.cursor__dot');
  const pos = { x: innerWidth / 2, y: innerHeight / 2 }, target = { ...pos };
  gsap.set([ring, dot], { xPercent: -50, yPercent: -50 });
  addEventListener('pointermove', e => {
    target.x = e.clientX; target.y = e.clientY;
    gsap.set(dot, { x: e.clientX, y: e.clientY });
  }, { passive: true });
  gsap.ticker.add(() => {
    pos.x += (target.x - pos.x) * .16; pos.y += (target.y - pos.y) * .16;
    gsap.set(ring, { x: pos.x, y: pos.y });
  });
  const hot = 'a, button, [data-hot], .chapters__item';
  document.addEventListener('pointerover', e => { if (e.target.closest(hot)) ring.classList.add('is-hot'); });
  document.addEventListener('pointerout', e => { if (e.target.closest(hot)) ring.classList.remove('is-hot'); });
})();

/* ---------- Campo de partículas ---------- */
const veil = (function veilField() {
  const canvas = document.getElementById('veil');
  const ctx = canvas.getContext('2d', { alpha: true });
  let W = 0, H = 0, dpr = 1, particles = [], mode = 'drift', energy = 0;
  const pointer = { x: -9999, y: -9999, active: false };
  const count = () => Math.round(Math.min(650, Math.max(180, (innerWidth * innerHeight) / 3400)));

  function build() {
    particles = new Array(count()).fill(0).map(() => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - .5) * .18, vy: (Math.random() - .5) * .18,
      tx: 0, ty: 0, s: Math.random() < .08 ? 2.1 : 1.1,
      hot: Math.random() < .06, seed: Math.random() * Math.PI * 2,
    }));
  }
  const formations = {
    drift(p) { p.tx = null; },
    scatter(p) { p.tx = Math.random() * W; p.ty = Math.random() * H; },
    grid(p, i, n) {
      const cols = Math.ceil(Math.sqrt(n * (W / H))), rows = Math.ceil(n / cols);
      p.tx = (W / (cols + 1)) * ((i % cols) + 1);
      p.ty = (H / (rows + 1)) * (Math.floor(i / cols) + 1);
    },
    orbit(p, i, n) {
      const rings = 3, ring = i % rings, idx = Math.floor(i / rings), per = Math.ceil(n / rings);
      const a = (idx / per) * Math.PI * 2 + ring * .4;
      const base = Math.min(W, H) * (.16 + ring * .11);
      p.tx = W / 2 + Math.cos(a) * base; p.ty = H / 2 + Math.sin(a) * base;
    },
    axis(p, i, n) {
      const arm = i % 3, t = (Math.floor(i / 3) / Math.ceil(n / 3)) * 2 - 1;
      const L = Math.min(W, H) * .46, cx = W / 2, cy = H / 2;
      if (arm === 0) { p.tx = cx + t * L * 1.4; p.ty = cy; }
      else if (arm === 1) { p.tx = cx; p.ty = cy - t * L; }
      else { p.tx = cx + t * L * .62; p.ty = cy + t * L * .42; }
    },
  };
  const assign = name => {
    const fn = formations[name] || formations.drift, n = particles.length;
    particles.forEach((p, i) => fn(p, i, n));
  };
  function resize() {
    dpr = Math.min(2, devicePixelRatio || 1);
    W = innerWidth; H = innerHeight;
    canvas.width = Math.floor(W * dpr); canvas.height = Math.floor(H * dpr);
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    build(); assign(mode);
  }
  let last = 0;
  function frame(t) {
    const dt = Math.min(32, t - last) / 16.6667 || 1; last = t;
    ctx.clearRect(0, 0, W, H);
    const buckets = [[], [], [], []], hotList = [];
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      if (p.tx === null) {
        p.x += p.vx * dt * (1 + energy * 2); p.y += p.vy * dt * (1 + energy * 2);
        if (p.x < -20) p.x = W + 20; if (p.x > W + 20) p.x = -20;
        if (p.y < -20) p.y = H + 20; if (p.y > H + 20) p.y = -20;
      } else {
        p.x += (p.tx - p.x) * .035 * dt; p.y += (p.ty - p.y) * .035 * dt;
        p.x += Math.sin(t * .0006 + p.seed) * .22; p.y += Math.cos(t * .0005 + p.seed) * .22;
      }
      if (pointer.active) {
        const dx = p.x - pointer.x, dy = p.y - pointer.y, d2 = dx * dx + dy * dy;
        if (d2 < 22000 && d2 > .01) {
          const d = Math.sqrt(d2), f = (1 - d2 / 22000) * 14;
          p.x += (dx / d) * f; p.y += (dy / d) * f;
        }
      }
      if (p.hot) { hotList.push(p); continue; }
      buckets[(i * 7) % 4].push(p);
    }
    const alphas = [.10, .17, .26, .38];
    for (let b = 0; b < 4; b++) {
      ctx.fillStyle = `rgba(239,233,222,${alphas[b] + energy * .16})`;
      for (const p of buckets[b]) ctx.fillRect(p.x, p.y, p.s, p.s);
    }
    ctx.fillStyle = `rgba(203,255,62,${.5 + energy * .3})`;
    for (const p of hotList) ctx.fillRect(p.x, p.y, p.s + .6, p.s + .6);
    energy *= .94;
    requestAnimationFrame(frame);
  }
  resize();
  addEventListener('resize', resize, { passive: true });
  if (MOTION) {
    addEventListener('pointermove', e => { pointer.x = e.clientX; pointer.y = e.clientY; pointer.active = true; }, { passive: true });
    addEventListener('pointerleave', () => { pointer.active = false; });
    requestAnimationFrame(frame);
  } else {
    assign('grid');
    setTimeout(() => {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(239,233,222,.12)';
      particles.forEach(p => ctx.fillRect(p.tx || p.x, p.ty || p.y, p.s, p.s));
    }, 60);
  }
  return {
    setMode(n) { if (n === mode) return; mode = n; assign(n); },
    kick(v) { energy = Math.min(1, energy + v); },
  };
})();

/* ============================================================
   TEXTO: relleno letra a letra y desintegración
   ============================================================ */
function splitLetters(el) {
  if (el.__letters) return el.__letters;
  const out = [];
  (function walk(node) {
    [...node.childNodes].forEach(child => {
      if (child.nodeType === Node.TEXT_NODE) {
        const frag = document.createDocumentFragment();
        [...child.textContent].forEach(ch => {
          if (ch === '\n') return;
          const s = document.createElement('span');
          s.className = 'ltr';
          s.textContent = ch === ' ' ? ' ' : ch;
          frag.appendChild(s);
          out.push(s);
        });
        child.replaceWith(frag);
      } else if (child.nodeType === Node.ELEMENT_NODE && child.tagName !== 'BR') {
        walk(child);
      }
    });
  })(el);
  el.__letters = out;
  return out;
}
const isOutlined = l => !!l.closest('.mega--out');

function fillIn(el, tl, at, span) {
  const ls = splitLetters(el);
  const solid = ls.filter(l => !isOutlined(l));
  const outline = ls.filter(isOutlined);
  const color = el.classList.contains('ax--x') ? '#FF4D4D'
    : el.classList.contains('ax--y') ? '#7CFF7C'
    : el.classList.contains('ax--z') ? '#5AA9FF' : BONE;
  if (solid.length) {
    gsap.set(solid, { color: DIM });
    tl.to(solid, { color, ease: 'none', duration: .08, stagger: { amount: span, from: 'start' } }, at);
  }
  if (outline.length) {
    gsap.set(outline, { webkitTextStrokeColor: DIM });
    tl.to(outline, { webkitTextStrokeColor: ACID, ease: 'none', duration: .08,
      stagger: { amount: span, from: 'start' } }, at);
  }
}
function shatter(el, tl, at, span) {
  const ls = splitLetters(el);
  tl.to(ls, {
    x: () => gsap.utils.random(-300, 300),
    y: () => gsap.utils.random(-220, 220),
    rotation: () => gsap.utils.random(-150, 150),
    scale: .12, opacity: 0,
    ease: 'power2.in', duration: span,
    stagger: { amount: span * .5, from: 'random' },
  }, at);
}
const softIn = (el, tl, at) => tl.fromTo(el, { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: .16, ease: 'power2.out' }, at);
const softOut = (el, tl, at) => tl.to(el, { autoAlpha: 0, y: -16, duration: .14, ease: 'power2.in' }, at);

/* Dibuja un trazo SVG progresivamente */
function drawPath(el, tl, at, dur) {
  const len = el.getTotalLength ? el.getTotalLength() : 1000;
  gsap.set(el, { strokeDasharray: len, strokeDashoffset: len });
  tl.to(el, { strokeDashoffset: 0, ease: 'none', duration: dur }, at);
}

/* ============================================================
   ESCENAS PERSISTENTES — (tl, at, span, root)
   Duran varios beats y avanzan mientras el texto cambia.
   ============================================================ */
const NS = 'http://www.w3.org/2000/svg';
const el = (t, a) => { const n = document.createElementNS(NS, t); for (const k in a) n.setAttribute(k, a[k]); return n; };

/* Etiqueta dentro de un SVG: la caja se calcula a partir del texto, así
   nunca se desborda ni queda holgada. JetBrains Mono ≈ .6em por carácter. */
function svgTag(parent, { x, y, text, size = 18, bg = '#CBFF3E', fg = '#08080A',
  anchor = 'start', pad = 14, id = null, outline = false }) {
  // JetBrains Mono avanza .6em por carácter; se añade holgura por seguridad
  const w = Math.ceil(text.length * size * .63) + pad * 2;
  const h = Math.round(size * 1.95);
  const bx = anchor === 'middle' ? x - w / 2 : anchor === 'end' ? x - w : x;
  const g = el('g', id ? { id } : {});
  g.appendChild(el('rect', {
    x: bx, y: y - h / 2, width: w, height: h, rx: 3,
    fill: outline ? 'rgba(8,8,10,.9)' : bg,
    stroke: outline ? bg : 'none', 'stroke-width': outline ? 2 : 0,
  }));
  const t = el('text', {
    x: bx + w / 2, y: y + size * .35, 'text-anchor': 'middle',
    fill: outline ? bg : fg,
    style: `font-family:"JetBrains Mono",monospace;font-size:${size}px;letter-spacing:0`,
  });
  t.textContent = text;
  g.appendChild(t);
  parent.appendChild(g);
  return g;
}

/* Panel de varias líneas, con la caja ajustada a la línea más larga */
function svgPanel(parent, { x, y, lines, size = 17, accent = '#CBFF3E', id = null, title = null }) {
  const all = title ? [title, ...lines] : lines;
  const longest = all.reduce((m, str) => Math.max(m, str.length), 0);
  const w = Math.ceil(longest * size * .63) + 40;
  const lh = Math.round(size * 1.6);
  const h = 22 + all.length * lh + 12;
  const g = el('g', id ? { id } : {});
  g.appendChild(el('rect', { x, y, width: w, height: h, rx: 5, fill: 'rgba(7,18,10,.94)', stroke: accent, 'stroke-width': 2 }));
  all.forEach((line, i) => {
    const t = el('text', {
      x: x + 20, y: y + 30 + i * lh,
      fill: i === 0 && title ? accent : '#EFE9DE',
      style: `font-family:"JetBrains Mono",monospace;font-size:${size}px;letter-spacing:0`,
    });
    t.textContent = line;
    g.appendChild(t);
  });
  parent.appendChild(g);
  return { g, w, h };
}

/* Textura de fósforo: cada escena recibe encima una trama de puntos,
   ruido y líneas de barrido. Sin esto los dibujos se ven planos. */
function texturize(svg) {
  if (svg.__tex) return;
  svg.__tex = true;
  const vb = (svg.getAttribute('viewBox') || '0 0 1000 1000').split(/\s+/).map(Number);
  const [x, y, w, h] = vb;
  const box = { x: x - w, y: y - h, width: w * 3, height: h * 3 };
  const layer = el('g', { class: 'texlayer', 'pointer-events': 'none' });
  layer.appendChild(el('rect', { ...box, fill: 'url(#pDither)' }));
  layer.appendChild(el('rect', { ...box, fill: 'url(#pGrid)' }));
  layer.appendChild(el('rect', { ...box, filter: 'url(#fNoise)', opacity: '.5' }));
  layer.appendChild(el('rect', { ...box, fill: 'url(#pScan)' }));
  svg.appendChild(layer);
}
document.querySelectorAll('svg.scn').forEach(texturize);

const SCENES = {

  /* ── 02 · La cabeza: el entorno real se apaga, el interior se enciende ── */
  head(tl, at, span, root) {
    /* estímulos con icono reconocible: campana, sobre, reloj, sonido, coche, taza */
    const ICONS = {
      campana: 'M0 8 C0 -2 14 -2 14 8 L16 14 H-2 Z M5 17 a2.4 2.4 0 0 0 4.8 0',
      sobre: 'M-11 -7 H11 V7 H-11 Z M-11 -7 L0 2 L11 -7',
      reloj: 'M0 -11 a11 11 0 1 0 .1 0 Z M0 -6 V0 L5 4',
      sonido: 'M-9 -4 H-4 L2 -10 V10 L-4 4 H-9 Z M6 -5 a7 7 0 0 1 0 10 M10 -9 a12 12 0 0 1 0 18',
      coche: 'M-14 3 L-11 -5 H11 L14 3 V8 H-14 Z M-8 8 a3 3 0 1 0 .1 0 M8 8 a3 3 0 1 0 .1 0',
      taza: 'M-8 -7 H7 L6 8 H-7 Z M7 -3 a5 5 0 0 1 0 8',
    };
    const NOISE = [
      ['campana', 'notificación', 150, 130], ['sobre', 'correo', 830, 150],
      ['reloj', 'la hora', 110, 330], ['sonido', 'ruido de la calle', 866, 330],
      ['coche', 'el tráfico', 176, 526], ['taza', 'un pendiente', 838, 520],
    ];
    const g = root.querySelector('#hdNoise');
    if (!g.children.length) {
      NOISE.forEach(([ico, txt, x, y]) => {
        const wrap = el('g', { class: 'hdN' });
        wrap.appendChild(el('path', { class: 'ico', d: ICONS[ico], transform: `translate(${x} ${y - 26})` }));
        const t = el('text', { x, y: y + 22, 'text-anchor': 'middle' });
        t.textContent = txt; wrap.appendChild(t);
        g.appendChild(wrap);
      });
    }
    const grid = root.querySelector('#hdGrid');
    if (!grid.children.length) {
      for (let i = 0; i <= 9; i++) grid.appendChild(el('line', { x1: 290 - i * 8, y1: 360 + i * i * 3.4, x2: 710 + i * 8, y2: 360 + i * i * 3.4 }));
      for (let i = -5; i <= 5; i++) grid.appendChild(el('line', { x1: 500 + i * 26, y1: 360, x2: 500 + i * 116, y2: 640 }));
    }
    const sparks = root.querySelector('#hdSparkDots');
    if (!sparks.children.length) {
      for (let i = 0; i < 26; i++) {
        sparks.appendChild(el('circle', {
          cx: 400 + Math.random() * 240, cy: 150 + Math.random() * 190,
          r: 2 + Math.random() * 3, fill: '#CBFF3E',
        }));
      }
    }

    const noise = [...g.children];
    const u = span / 4;

    // 1 · aparece la persona
    tl.to('#hdSkin', { opacity: 1, duration: u * .3, ease: 'none' }, at)
      .to('#hdShade', { opacity: .55, duration: u * .3, ease: 'none' }, at + .05)
      .to(['#hdEar', '#hdEye', '#hdBrow'], { opacity: 1, duration: u * .2, ease: 'none' }, at + .12);
    drawPath(root.querySelector('#hdPath'), tl, at, u * .5);

    // 2 · el entorno real reclama su atención
    noise.forEach((n, i) => {
      gsap.set(n, { opacity: 0, scale: .5, transformOrigin: 'center' });
      tl.to(n, { opacity: 1, scale: 1, duration: u * .16, ease: 'back.out(2)' }, at + u * .45 + i * u * .07);
    });

    // 3 · el cerebro se hace visible y se enciende
    tl.to('#hdBrain', { opacity: .95, duration: u * .35, ease: 'none' }, at + u * 1.1)
      .to('#hdSpark', { opacity: 1, duration: u * .2 }, at + u * 1.45);
    [...sparks.children].forEach((d, i) => {
      tl.fromTo(d, { opacity: 0, scale: .2, transformOrigin: 'center' },
        { opacity: .9, scale: 1, duration: u * .12, ease: 'none' }, at + u * 1.5 + i * u * .02);
    });

    // 4 · el ruido exterior se apaga
    noise.forEach((n, i) => {
      tl.to(n, {
        opacity: 0, scale: .35,
        x: () => gsap.utils.random(-140, 140), y: () => gsap.utils.random(-100, 100),
        duration: u * .4, ease: 'power2.in',
      }, at + u * 1.85 + i * u * .07);
    });

    // 5 · dentro crece el entorno; la piel se apaga y queda la ventana
    tl.to('#hdSky', { opacity: 1, duration: u * .4, ease: 'none' }, at + u * 2.15)
      .to(['#hdSkin', '#hdShade', '#hdEar', '#hdEye', '#hdBrow'], { opacity: 0, duration: u * .4, ease: 'none' }, at + u * 2.2)
      .to(['#hdBrain', '#hdSpark'], { opacity: 0, duration: u * .3, ease: 'none' }, at + u * 2.25)
      .fromTo('#hdWorld', { opacity: 0, scale: .5, transformOrigin: '500px 340px' },
        { opacity: 1, scale: 1, duration: u * .9, ease: 'power2.out' }, at + u * 2.3);

    // 6 · desborda
    tl.to('#hdOver', { opacity: 1, duration: u * .5, ease: 'none' }, at + u * 3.1)
      .fromTo('#hdOver', { scale: .5, transformOrigin: '500px 300px' },
        { scale: 1.3, duration: u * .9, ease: 'power1.out' }, at + u * 3.1)
      .to('#hdPath', { stroke: '#CBFF3E', duration: u * .3, ease: 'none' }, at + u * 3.2);
  },

  /* ── 03 · Una sala real que se convierte en otro lugar ── */
  room(tl, at, span, root) {
    const grid = root.querySelector('#rmGrid');
    if (!grid.children.length) {
      for (let i = 0; i <= 8; i++) grid.appendChild(el('line', { x1: -200 - i * 30, y1: 470 + i * i * 5, x2: 1800 + i * 30, y2: 470 + i * i * 5 }));
      for (let i = -8; i <= 8; i++) grid.appendChild(el('line', { x1: 800 + i * 70, y1: 470, x2: 800 + i * 260, y2: 800 }));
    }
    const u = span / 3;

    // te pones el visor
    tl.fromTo('#rmVisor', { opacity: 0 }, { opacity: 1, duration: u * .35, ease: 'power2.in' }, at + u * .35)
      // la sala real se apaga
      .to('#rmReal', { opacity: 0, filter: 'blur(16px)', duration: u * .55, ease: 'power2.inOut' }, at + u * .8)
      // y en su lugar aparece otro sitio
      .to('#rmVirtual', { opacity: 1, duration: u * .55, ease: 'power2.inOut' }, at + u * .95)
      .to('#rmPillars', { opacity: 1, duration: u * .4, ease: 'none' }, at + u * 1.4)
      // el suelo avanza: estás caminando
      .fromTo(grid, { attr: { transform: 'translate(0,0)' } },
        { attr: { transform: 'translate(0,190)' }, ease: 'none', duration: span * .7 }, at + u * 1.1)
      // las manos entran y accionan
      .to('#rmHands', { opacity: 1, duration: u * .3, ease: 'power2.out' }, at + u * 1.7)
      .fromTo('#rmHands', { y: 190 }, { y: 0, duration: u * .5, ease: 'power2.out' }, at + u * 1.7)
      .to('#rmHands', { y: -34, duration: u * .35, ease: 'sine.inOut' }, at + u * 2.35)
      .to('#rmPillars', { scale: 1.12, transformOrigin: '800px 400px', duration: u * .35, ease: 'power2.out' }, at + u * 2.4);
  },

  /* ── 04 · El CAVE: el entorno ES la sala, y responde a dónde estás ── */
  cave(tl, at, span, root) {
    const grid = root.querySelector('#cvFloorGrid');
    if (!grid.children.length) {
      for (let i = 0; i <= 7; i++) {
        const t = i / 7;
        grid.appendChild(el('line', {
          x1: 420 - t * 360, y1: 550 + t * 170, x2: 1180 + t * 360, y2: 550 + t * 170,
        }));
      }
      for (let i = 0; i <= 10; i++) {
        const x = 420 + (760 / 10) * i;
        grid.appendChild(el('line', { x1: x, y1: 550, x2: 60 + (1480 / 10) * i, y2: 720 }));
      }
    }
    const rays = root.querySelector('#cvRays');
    if (!rays.children.length) {
      [[440, 150], [1160, 150], [440, 520], [1160, 520]].forEach(([x, y]) =>
        rays.appendChild(el('line', { x1: x, y1: y, x2: 800, y2: 520 })));
    }
    const info = root.querySelector('#cvInfo');
    if (info && !info.children.length) {
      svgTag(info, { x: 800, y: 756, text: 'SIN VISOR', size: 26, anchor: 'middle', id: 'cvNote' });
      gsap.set(root.querySelector('#cvNote'), { opacity: 0 });
    }

    const u = span / 3;

    // 1 · se encienden los proyectores y cada cara cobra vida
    tl.to('#cvProj', { opacity: 1, duration: u * .25 }, at + u * .1)
      .to('#cvBackImg', { opacity: 1, duration: u * .3 }, at + u * .3)
      .to('#cvLeftImg', { opacity: 1, duration: u * .3 }, at + u * .45)
      .to('#cvRightImg', { opacity: 1, duration: u * .3 }, at + u * .55)
      .to('#cvFloorImg', { opacity: 1, duration: u * .3 }, at + u * .65)
      // 2 · entra la persona: ocupa el lugar, no se lo pone en la cara
      .fromTo('#cvPerson', { opacity: 0, y: 70 },
        { opacity: 1, y: 0, duration: u * .4, ease: 'power2.out' }, at + u * .9)
      // 3 · las cámaras la siguen
      .to('#cvCams', { opacity: 1, duration: u * .2 }, at + u * 1.25)
      .to('#cvRays', { opacity: .7, duration: u * .25 }, at + u * 1.4)
      // 4 · se mueve y el entorno se recalcula desde su nuevo punto de vista
      .to('#cvPerson', { x: -150, duration: u * .55, ease: 'sine.inOut' }, at + u * 1.7)
      .to(rays.children, { attr: { x2: 650 }, duration: u * .55, ease: 'sine.inOut' }, at + u * 1.7)
      .to('#cvBackImg', { x: 46, duration: u * .55, ease: 'sine.inOut' }, at + u * 1.7)
      .to('#cvFloorImg', { x: 30, duration: u * .55, ease: 'sine.inOut' }, at + u * 1.7)
      .to('#cvPerson', { x: 110, duration: u * .55, ease: 'sine.inOut' }, at + u * 2.35)
      .to(rays.children, { attr: { x2: 910 }, duration: u * .55, ease: 'sine.inOut' }, at + u * 2.35)
      .to('#cvBackImg', { x: -34, duration: u * .55, ease: 'sine.inOut' }, at + u * 2.35)
      .to('#cvFloorImg', { x: -22, duration: u * .55, ease: 'sine.inOut' }, at + u * 2.35)
      // 5 · el suelo responde bajo sus pies
      .fromTo('#cvEcho', { opacity: 1, scale: .25, transformOrigin: '800px 700px' },
        { opacity: 0, scale: 1, duration: u * .6, ease: 'power2.out' }, at + u * 2.1)
      .fromTo('#cvNote', { opacity: 0, scale: .7, transformOrigin: '800px 756px' },
        { opacity: 1, scale: 1, duration: u * .2, ease: 'back.out(2)' }, at + u * 2.35)
      .to('#cvNote', { opacity: 0, duration: u * .2 }, at + u * 2.85);
  },

  /* ── 05 · Mano con teléfono: lo digital sobre lo real ── */
  arhand(tl, at, span, root) {
    const u = span / 3;
    const cta = root.querySelector('#arCta');
    if (cta && !cta.children.length) {
      svgTag(cta, { x: 765, y: 646, text: 'COLOCAR', size: 18, anchor: 'middle' });
    }
    const feed = root.querySelector('#arFeed');
    const chair = root.querySelector('#arChair');

    tl.fromTo('#arPhoneGroup', { opacity: 0, y: 220 },
      { opacity: 1, y: 0, duration: u * .5, ease: 'power3.out' }, at + u * .1)
      // se enciende la cámara: por el cristal se ve la habitación
      .to(feed, { opacity: 1, duration: u * .3 }, at + u * .55)
      .to('#arScreenUI', { opacity: 1, duration: u * .25 }, at + u * .8)
      // y sobre esa imagen aparece el objeto digital
      .fromTo(chair, { opacity: 0, scale: .55, transformOrigin: '762px 628px' },
        { opacity: 1, scale: 1, duration: u * .5, ease: 'back.out(1.5)' }, at + u * 1.15)
      // al mover el teléfono la imagen se desplaza, y el objeto viaja con el
      // mundo: sigue anclado al mismo punto del suelo real
      .to('#arPhoneGroup', { x: 210, duration: u * .8, ease: 'sine.inOut' }, at + u * 1.7)
      .to([feed, chair], { x: -80, duration: u * .8, ease: 'sine.inOut' }, at + u * 1.7)
      .to('#arPhoneGroup', { x: -90, duration: u * .7, ease: 'sine.inOut' }, at + u * 2.5)
      .to([feed, chair], { x: 34, duration: u * .7, ease: 'sine.inOut' }, at + u * 2.5);
  },

  /* ── 06 · El cuarto real se sustituye ── */
  vrswap(tl, at, span, root) {
    const grid = root.querySelector('#vsGrid');
    if (!grid.children.length) {
      for (let i = 0; i <= 8; i++) grid.appendChild(el('line', { x1: -200, y1: 470 + i * i * 5, x2: 1800, y2: 470 + i * i * 5 }));
      for (let i = -8; i <= 8; i++) grid.appendChild(el('line', { x1: 800 + i * 70, y1: 470, x2: 800 + i * 250, y2: 800 }));
    }
    const u = span / 3;
    tl.to('#vsGoggles', { opacity: 1, duration: u * .5, ease: 'power2.in' }, at + u * .3)
      .to('#vsReal', { opacity: 0, filter: 'blur(18px)', duration: u * .6, ease: 'power2.inOut' }, at + u * .9)
      .to('#vsDigital', { opacity: 1, duration: u * .6, ease: 'power2.inOut' }, at + u * 1.05)
      .fromTo(grid, { attr: { transform: 'translate(0,0)' } },
        { attr: { transform: 'translate(0,200)' }, ease: 'none', duration: span * .7 }, at + u * 1.1);
  },

  /* ── 07 · MR: una maqueta virtual apoyada en la mesa real ── */
  mixed(tl, at, span, root) {
    const scan = root.querySelector('#mxScan');
    if (!scan.children.length) {
      for (let i = 0; i <= 6; i++) {
        const ry = 52 * (1 - i * .1);
        scan.appendChild(el('ellipse', { cx: 800, cy: 548, rx: 470 - i * 60, ry: Math.max(8, ry), fill: 'none' }));
      }
      for (let a = 0; a < 12; a++) {
        const ang = (a / 12) * Math.PI * 2;
        scan.appendChild(el('line', {
          x1: 800, y1: 548, x2: 800 + Math.cos(ang) * 470, y2: 548 + Math.sin(ang) * 120,
        }));
      }
    }
    const labels = root.querySelector('#mxLabels');
    if (labels && !labels.children.length) {
      svgTag(labels, { x: 724, y: 268, text: '48 m', size: 22, anchor: 'middle', id: 'mxL1' });
      gsap.set(root.querySelector('#mxL1'), { opacity: 0 });
    }
    const u = span / 3;

    // 1 · el visor reconoce la mesa real
    tl.to('#mxScan', { opacity: .8, duration: u * .3 }, at + u * .12)
      // 2 · la maqueta baja y SE APOYA en ella, con su sombra sobre la madera
      .fromTo('#mxModel', { opacity: 0, y: -260 },
        { opacity: 1, y: 0, duration: u * .6, ease: 'bounce.out' }, at + u * .55)
      .to('#mxShadow', { opacity: .55, duration: u * .25 }, at + u * 1.05)
      .to('#mxScan', { opacity: .25, duration: u * .3 }, at + u * 1.1)
      .fromTo('#mxL1', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: u * .2 }, at + u * 1.2)
      .to('#mxL1', { opacity: 0, duration: u * .2 }, at + u * 2.4)
      // 3 · la mano real la gira: lo virtual obedece a lo físico
      .fromTo('#mxHand', { opacity: 0, x: -240 },
        { opacity: 1, x: 0, duration: u * .4, ease: 'power2.out' }, at + u * 1.55)
      .to('#mxCity', { rotationY: 26, transformOrigin: '800px 520px', duration: u * .6, ease: 'sine.inOut' }, at + u * 1.85)
      .to('#mxHand', { x: 300, duration: u * .6, ease: 'sine.inOut' }, at + u * 1.85)
      .to('#mxCity', { rotationY: -14, duration: u * .55, ease: 'sine.inOut' }, at + u * 2.45)
      .to('#mxHand', { x: -60, opacity: .9, duration: u * .55, ease: 'sine.inOut' }, at + u * 2.45)
      // 4 · y la taza real la tapa: la oclusión demuestra que comparten espacio
      .to('#mxModel', { x: 250, duration: u * .5, ease: 'sine.inOut' }, at + u * 2.5)
      .to('#mxModel', { x: 0, duration: u * .4, ease: 'sine.inOut' }, at + u * 2.95);
  },

  /* ── 08 · Espacio 3D: recorrido vivo por los tres ejes ── */
  space(tl, at, span, root) {
    const world = root.querySelector('#spGizmo');
    const read = root.querySelector('#spRead');
    const axes = [...root.querySelectorAll('.gizmo__axis')];
    const cube = root.querySelector('.gizmo__cube');
    const rot = { x: -24, y: 32, z: 0 }, pos = { x: 0, y: 0, z: 0 };
    const drag = { x: 0, y: 0 };
    const render = () => {
      world.style.transform = `rotateX(${rot.x + drag.y}deg) rotateY(${rot.y + drag.x}deg) rotateZ(${rot.z}deg)`;
      if (cube) cube.style.transform =
        `translate3d(${pos.x * 46}px, ${-pos.y * 46}px, ${pos.z * 46}px)`;
      read.textContent = `( ${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)} )`;
    };
    render();
    axes.forEach(a => a.classList.add('is-on'));

    /* arrastrar para girarlo: el usuario manda sobre los tres ejes */
    if (!world.__drag) {
      world.__drag = true;
      let on = false, sx = 0, sy = 0, bx = 0, by = 0;
      world.addEventListener('pointerdown', e => {
        on = true; sx = e.clientX; sy = e.clientY; bx = drag.x; by = drag.y;
        world.classList.add('is-drag'); world.setPointerCapture(e.pointerId);
      });
      world.addEventListener('pointermove', e => {
        if (!on) return;
        drag.x = bx + (e.clientX - sx) * .5;
        drag.y = gsap.utils.clamp(-70, 70, by - (e.clientY - sy) * .4);
        render();
      });
      const stop = () => { on = false; world.classList.remove('is-drag'); };
      world.addEventListener('pointerup', stop);
      world.addEventListener('pointercancel', stop);
    }

    const u = span / 3;
    const hi = k => axes.forEach(a => a.classList.toggle('is-hot', a.classList.contains('gizmo__axis--' + k)));

    tl.fromTo(world, { scale: .4, opacity: 0 }, { scale: 1, opacity: 1, duration: u * .45, ease: 'back.out(1.6)' }, at)
      .to('#spHint', { opacity: 1, duration: u * .25 }, at + u * .5)
      // el cubo recorre X, luego Y, luego Z: se ve qué hace cada eje
      .call(() => hi('x'), null, at + u * .55)
      .to(rot, { y: 12, x: -12, ease: 'sine.inOut', duration: u * .35, onUpdate: render }, at + u * .55)
      .to(pos, { x: 1.8, ease: 'sine.inOut', duration: u * .35, onUpdate: render }, at + u * .55)
      .to(pos, { x: -1.8, ease: 'sine.inOut', duration: u * .4, onUpdate: render }, at + u * .92)
      .to(pos, { x: 0, ease: 'sine.inOut', duration: u * .25, onUpdate: render }, at + u * 1.32)

      .call(() => hi('y'), null, at + u * 1.35)
      .to(rot, { y: 30, x: -34, ease: 'sine.inOut', duration: u * .3, onUpdate: render }, at + u * 1.35)
      .to(pos, { y: 1.7, ease: 'sine.inOut', duration: u * .32, onUpdate: render }, at + u * 1.4)
      .to(pos, { y: -1.2, ease: 'sine.inOut', duration: u * .36, onUpdate: render }, at + u * 1.74)
      .to(pos, { y: 0, ease: 'sine.inOut', duration: u * .22, onUpdate: render }, at + u * 2.1)

      .call(() => hi('z'), null, at + u * 2.12)
      .to(rot, { y: 66, x: -16, ease: 'sine.inOut', duration: u * .3, onUpdate: render }, at + u * 2.12)
      .to(pos, { z: 1.8, ease: 'sine.inOut', duration: u * .32, onUpdate: render }, at + u * 2.16)
      .to(pos, { z: -1.4, ease: 'sine.inOut', duration: u * .34, onUpdate: render }, at + u * 2.5)

      // los tres a la vez
      .call(() => hi(null), null, at + u * 2.82)
      .to(rot, { x: -30, y: 40, z: 18, ease: 'sine.inOut', duration: u * .5, onUpdate: render }, at + u * 2.82)
      .to(pos, { x: .8, y: .6, z: 0, ease: 'sine.inOut', duration: u * .5, onUpdate: render }, at + u * 2.82);
  },
};

/* ============================================================
   ACTOS DE BEAT
   ============================================================ */
const ARTS = {

  market(tl, at, root) {
    const grid = root.querySelector('#mkGrid');
    if (grid && !grid.children.length) {
      for (let x = 0; x <= 1200; x += 120) grid.appendChild(el('line', { x1: x, y1: 0, x2: x, y2: 600 }));
      for (let y = 0; y <= 600; y += 100) grid.appendChild(el('line', { x1: 0, y1: y, x2: 1200, y2: y }));
    }
    const line = root.querySelector('#mkLine'), dots = root.querySelector('#mkDots');
    if (dots && !dots.children.length) {
      line.getAttribute('points').split(' ').forEach(p => {
        const [x, y] = p.split(',');
        dots.appendChild(el('circle', { cx: x, cy: y, r: 6, fill: 'var(--acid)' }));
      });
    }
    gsap.set(grid.children, { opacity: 0 });
    gsap.set(dots.children, { scale: 0, transformOrigin: 'center' });
    drawPath(line, tl, at + .15, .5);
    tl.to(grid.children, { opacity: 1, duration: .2, stagger: { amount: .2, from: 'random' }, ease: 'none' }, at)
      .to(dots.children, { scale: 1, duration: .3, stagger: .04, ease: 'back.out(2)' }, at + .3);
  },

  /* el negocio se decide en una pantalla */
  laptop(tl, at, root) {
    const bars = root.querySelector('#lapBars');
    if (!bars.children.length) {
      const h = [40, 66, 52, 90, 74, 112, 96, 140];
      h.forEach((v, i) => bars.appendChild(el('rect', {
        x: 252 + i * 50, y: 428 - v, width: 30, height: v, rx: 3,
        fill: i === h.length - 1 ? '#FF5B2E' : 'rgba(203,255,62,.45)',
      })));
    }
    const kpi = root.querySelector('#lapKpi');
    if (!kpi.children.length) {
      [['VENTAS', '+18%', 252], ['CARRITO', '$1 240', 402], ['CHURN', '-4%', 552]].forEach(([k, v, x]) => {
        const t1 = el('text', { x, y: 186, class: 'svgmono', fill: '#93b57a' }); t1.textContent = k;
        const t2 = el('text', { x, y: 218, class: 'svgbig', fill: '#EFE9DE' }); t2.textContent = v;
        kpi.appendChild(t1); kpi.appendChild(t2);
      });
    }
    const line = root.querySelector('#lapLine');
    gsap.set(bars.children, { scaleY: 0, transformOrigin: '50% 100%' });
    gsap.set(kpi.children, { opacity: 0 });
    tl.to('#lapUI', { opacity: 1, duration: .16, ease: 'none' }, at + .1)
      .to(bars.children, { scaleY: 1, duration: .3, stagger: .05, ease: 'back.out(1.4)' }, at + .2);
    drawPath(line, tl, at + .42, .4);
    tl.to(kpi.children, { opacity: 1, duration: .18, stagger: .06 }, at + .58);
  },

  /* ── ejemplos de AR ── */
  exEdu(tl, at, root) {
    const lab = root.querySelector('#eduLabels');
    if (lab && !lab.children.length) {
      svgTag(lab, { x: 706, y: 240, text: '82 cm', size: 24 });
    }
    tl.fromTo('#eduChair', { opacity: 0, y: 70, scale: .7, transformOrigin: '500px 350px' },
      { opacity: 1, y: 0, scale: 1, duration: .35, ease: 'back.out(1.5)' }, at + .08)
      .to('#eduChairSpin', { rotationY: 34, transformOrigin: '500px 250px', duration: .5, ease: 'sine.inOut' }, at + .35)
      .to('#eduChairSpin', { rotationY: -20, duration: .5, ease: 'sine.inOut' }, at + .8)
      .to('#eduTags', { opacity: 1, duration: .22 }, at + .5);
  },
  exGame(tl, at, root) {
    const tags = root.querySelector('#gmTags');
    if (tags && !tags.children.length) {
      svgTag(tags, { x: 500, y: 56, text: '12 m', size: 28, anchor: 'middle', outline: true });
    }
    tl.fromTo('#gmCreature', { opacity: 0, scale: .3, y: 60, transformOrigin: '500px 392px' },
      { opacity: 1, scale: 1, y: 0, duration: .32, ease: 'back.out(2)' }, at + .1)
      .to('#gmCreature', { y: -22, duration: .24, yoyo: true, repeat: 4, ease: 'sine.inOut' }, at + .38)
      .to('#gmHud', { opacity: 1, duration: .2 }, at + .3);
  },
  exRetail(tl, at, root) {
    const lab = root.querySelector('#rtLabels');
    if (lab && !lab.children.length) {
      svgTag(lab, { x: 500, y: 472, text: '2.14 m', size: 24, anchor: 'middle' });
    }
    tl.fromTo('#rtSofa', { opacity: 0, y: 90, scale: .82, transformOrigin: '500px 404px' },
      { opacity: 1, y: 0, scale: 1, duration: .38, ease: 'power3.out' }, at + .08)
      .to('#rtTags', { opacity: 1, duration: .25 }, at + .45);
  },
  exMed(tl, at, root) {
    /* Silueta ANATÓMICA, no el corazón simétrico de tarjeta: cono asimétrico
       con el ápice abajo a la izquierda, aurículas arriba y base ancha.
       Sirve de recorte para levantar el volumen con curvas de nivel. */
    // base ancha con escotadura entre aurículas y ápice puntiagudo abajo-izquierda
    const HEART_D = 'M296 442 C250 400, 238 336, 244 264 '
      + 'C250 196, 266 144, 296 118 C326 92, 362 92, 386 118 '
      + 'C402 136, 404 136, 422 116 C450 88, 498 98, 524 138 '
      + 'C554 182, 564 250, 550 314 C534 382, 450 426, 370 442 '
      + 'C336 449, 310 456, 296 442 Z';
    const path = root.querySelector('#mdHeartPath');
    if (path && !path.getAttribute('d')) path.setAttribute('d', HEART_D);

    // detalle anatómico encima del volumen
    const extra = root.querySelector('#mdAnat');
    if (extra && !extra.children.length) {
      // aurícula derecha
      extra.appendChild(el('path', {
        d: 'M292 150 C256 132, 226 156, 234 190 C241 218, 278 226, 296 200',
        fill: 'rgba(203,255,62,.1)', stroke: '#CBFF3E', 'stroke-width': 3,
      }));
      // surco interventricular: de la base al ápice
      extra.appendChild(el('path', {
        d: 'M404 132 C388 214, 356 330, 308 436',
        fill: 'none', stroke: '#CBFF3E', 'stroke-width': 3.2, opacity: .78,
      }));
      // coronarias
      extra.appendChild(el('path', {
        d: 'M294 196 C344 226, 380 288, 392 356',
        fill: 'none', stroke: '#CBFF3E', 'stroke-width': 2, opacity: .5,
      }));
      extra.appendChild(el('path', {
        d: 'M508 214 C476 262, 444 322, 428 386',
        fill: 'none', stroke: '#CBFF3E', 'stroke-width': 2, opacity: .5,
      }));
    }

    // curvas de nivel: horizontales densas + verticales, recortadas por la silueta
    const iso = root.querySelector('#mdIso');
    if (iso && !iso.children.length) {
      for (let y = 60; y <= 430; y += 13) iso.appendChild(el('line', { x1: 170, y1: y, x2: 630, y2: y }));
      for (let x = 200; x <= 600; x += 26) {
        iso.appendChild(el('line', { x1: x, y1: 40, x2: x, y2: 440, opacity: .34 }));
      }
    }
    // nodos del modelo, sobre el contorno
    const nodes = root.querySelector('#mdNodes');
    if (nodes && !nodes.children.length && path.getTotalLength) {
      const L = path.getTotalLength();
      for (let i = 0; i < 16; i++) {
        const pt = path.getPointAtLength((i / 16) * L);
        nodes.appendChild(el('circle', { cx: pt.x.toFixed(1), cy: pt.y.toFixed(1), r: 3.4 }));
      }
    }
    // marcas del anillo y del radar
    const marks = root.querySelector('#mdRingMarks');
    if (marks && !marks.children.length) {
      for (let i = 0; i < 36; i++) {
        const a = (i / 36) * Math.PI * 2, long = i % 3 === 0;
        marks.appendChild(el('line', {
          x1: 400 + Math.cos(a) * 196, y1: 246 + Math.sin(a) * 196,
          x2: 400 + Math.cos(a) * (196 + (long ? 16 : 8)), y2: 246 + Math.sin(a) * (196 + (long ? 16 : 8)),
          opacity: long ? .9 : .45,
        }));
      }
    }
    const ticks = root.querySelector('#mdTicks');
    if (ticks && !ticks.children.length) {
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2;
        ticks.appendChild(el('line', {
          x1: 400 + Math.cos(a) * 204, y1: 246 + Math.sin(a) * 204,
          x2: 400 + Math.cos(a) * 212, y2: 246 + Math.sin(a) * 212,
        }));
      }
    }
    const vt = root.querySelector('#mdVitalTxt');
    if (vt && !vt.children.length) {
      const lbl = el('text', { x: 664, y: 146, fill: '#93b57a',
        style: 'font-family:"JetBrains Mono",monospace;font-size:15px;letter-spacing:.18em' });
      lbl.textContent = 'RITMO';
      vt.appendChild(lbl);
      const t = el('text', { x: 944, y: 148, 'text-anchor': 'end', fill: '#CBFF3E',
        style: 'font-family:Anton,sans-serif;font-size:38px' });
      t.textContent = '78 bpm';
      vt.appendChild(t);
    }

    const isoLines = iso ? [...iso.children] : [];
    const nodeDots = nodes ? [...nodes.children] : [];

    // 1 · se enciende la consola
    tl.to('#mdRadar', { opacity: 1, duration: .16, ease: 'none' }, at + .04)
      .to('#mdRing', { opacity: 1, duration: .16 }, at + .1)
      .to('#mdRing', { rotation: 40, transformOrigin: '400px 246px', ease: 'none', duration: 1 }, at + .1)
      // 2 · el órgano se reconstruye capa por capa
      .to('#mdHolo', { opacity: 1, duration: .12 }, at + .18);
    gsap.set(isoLines, { opacity: 0 });
    tl.to(isoLines, { opacity: .75, duration: .16, stagger: { amount: .34, from: 'start' }, ease: 'none' }, at + .2);
    gsap.set(nodeDots, { scale: 0, transformOrigin: 'center' });
    tl.to(nodeDots, { scale: 1, duration: .14, stagger: .02, ease: 'back.out(2)' }, at + .42);

    // 3 · el barrido lo recorre
    tl.fromTo('#mdScanBand', { opacity: .9, y: -180 },
      { y: 250, duration: .5, ease: 'none' }, at + .3)
      .to('#mdScanBand', { opacity: 0, duration: .1 }, at + .8)
      .to('#mdCross', { opacity: 1, duration: .16 }, at + .52)
      // 4 · late
      .to('#mdHolo', { scale: 1.05, transformOrigin: '360px 300px', duration: .13, yoyo: true, repeat: 5, ease: 'sine.inOut' }, at + .58)
      .to('#mdVitals', { opacity: 1, duration: .18 }, at + .46);
    drawPath(root.querySelector('#mdEcg'), tl, at + .5, .42);
  },

  exNav(tl, at, root) {
    const blocks = root.querySelector('#mpBlocks');
    if (!blocks.children.length) {
      const B = [[40, 40, 170, 130], [250, 40, 200, 130], [480, 40, 140, 130], [660, 40, 300, 60],
      [40, 240, 170, 90], [250, 240, 200, 90], [480, 240, 140, 90], [660, 240, 130, 90],
      [40, 400, 170, 100], [250, 400, 200, 100], [480, 400, 140, 100]];
      B.forEach(([x, y, w, h]) => blocks.appendChild(el('rect', { x, y, width: w, height: h, rx: 3, fill: '#0e2410' })));
    }
    const st = root.querySelector('#mpStreets');
    if (!st.children.length) {
      [[0, 200, 1000, 200], [0, 360, 1000, 360], [230, 0, 230, 520], [640, 0, 640, 520], [980, 0, 980, 520]]
        .forEach(([x1, y1, x2, y2]) => st.appendChild(el('line', { x1, y1, x2, y2 })));
    }
    const cards = root.querySelector('#mpCards');
    if (cards && !cards.children.length) {
      svgTag(cards, { x: 40, y: 56, text: '1.4 km', size: 34, id: 'mpA' });
      svgTag(cards, { x: 960, y: 462, text: 'CENTRO', size: 22, anchor: 'end', outline: true, bg: '#5FE0C0', id: 'mpB' });
      gsap.set([root.querySelector('#mpA'), root.querySelector('#mpB')], { opacity: 0 });
    }
    gsap.set(blocks.children, { opacity: 0, scale: .8, transformOrigin: 'center' });
    gsap.set(st.children, { opacity: 0 });
    const route = root.querySelector('#mpRoute');

    tl.to(st.children, { opacity: 1, duration: .18, stagger: .05, ease: 'none' }, at + .04)
      .to(blocks.children, { opacity: 1, scale: 1, duration: .2, stagger: { amount: .28, from: 'random' }, ease: 'power2.out' }, at + .1);
    drawPath(route, tl, at + .38, .38);
    tl.to('#mpMarks', { opacity: 1, duration: .2 }, at + .5)
      .to('#mpCards', { opacity: 1, duration: .05 }, at + .5)
      .fromTo('#mpA', { opacity: 0, x: -40 }, { opacity: 1, x: 0, duration: .18, ease: 'back.out(2)' }, at + .55)
      .fromTo('#mpB', { opacity: 0, x: 40 }, { opacity: 1, x: 0, duration: .18, ease: 'back.out(2)' }, at + .66)
      // la ruta respira: da la sensación de recorrido en vivo
      .to(route, { attr: { 'stroke-width': 13 }, duration: .18, yoyo: true, repeat: 5, ease: 'sine.inOut' }, at + .6)
      .fromTo(route, { filter: 'drop-shadow(0 0 0px #CBFF3E)' },
        { filter: 'drop-shadow(0 0 16px #CBFF3E)', duration: .3, yoyo: true, repeat: 3, ease: 'sine.inOut' }, at + .6)
      .fromTo('#mpScan', { opacity: .8, attr: { x1: 0, x2: 0 } },
        { attr: { x1: 1000, x2: 1000 }, duration: .55, ease: 'none' }, at + .2)
      .to('#mpScan', { opacity: 0, duration: .1 }, at + .75);
  },

  /* ── ejemplos de VR ── */
  vxGame(tl, at, root) {
    const g = root.querySelector('#vgGrid');
    if (!g.children.length) {
      for (let i = 0; i <= 6; i++) g.appendChild(el('line', { x1: -100, y1: 330 + i * i * 6, x2: 1100, y2: 330 + i * i * 6 }));
      for (let i = -6; i <= 6; i++) g.appendChild(el('line', { x1: 500 + i * 60, y1: 330, x2: 500 + i * 190, y2: 500 }));
    }
    tl.fromTo('#vgTargets', { opacity: 0, scale: 2.4, transformOrigin: '500px 120px' },
      { opacity: 1, scale: 1, duration: .35, ease: 'power3.out' }, at + .12)
      .to('#vgSlash', { opacity: 1, duration: .1 }, at + .5)
      .to('#vgSlash', { opacity: 0, duration: .12 }, at + .66)
      .to('#vgTargets', { opacity: 0, scale: .4, duration: .2, ease: 'power2.in' }, at + .6)
      .to('#vgScore', { opacity: 1, duration: .2 }, at + .68);
  },
  vxTrain(tl, at, root) {
    const steps = root.querySelector('#trSteps');
    if (steps && !steps.children.length) {
      ['1', '2', '3'].forEach((n, i) => {
        const g = el('g', { id: 'trS' + i });
        g.appendChild(el('circle', { cx: 120, cy: 90, r: 46, fill: 'rgba(203,255,62,.16)', stroke: '#CBFF3E', 'stroke-width': 4 }));
        const t = el('text', { x: 120, y: 108, 'text-anchor': 'middle', fill: '#CBFF3E',
          style: 'font-family:Anton,sans-serif;font-size:52px' });
        t.textContent = n;
        g.appendChild(t);
        steps.appendChild(g);
        gsap.set(g, { opacity: 0, scale: .5, transformOrigin: '120px 90px' });
      });
      gsap.set(steps, { opacity: 1 });
    }
    tl.to('#trHands', { opacity: 1, duration: .2 }, at + .08)
      .fromTo('#trPart', { opacity: 0, x: -80 }, { opacity: 1, x: 0, duration: .35, ease: 'power2.out' }, at + .3)
      .to('#trPart', { x: 60, y: -30, duration: .4, ease: 'sine.inOut' }, at + .62);
    // el paso entra grande y se va: nada de listas
    [0, 1, 2].forEach(i => {
      const g = root.querySelector('#trS' + i);
      if (!g) return;
      tl.to(g, { opacity: 1, scale: 1, duration: .12, ease: 'back.out(2.4)' }, at + .18 + i * .22)
        .to(g, { opacity: 0, scale: 1.5, duration: .12, ease: 'power2.in' }, at + .34 + i * .22);
    });
  },
  vxEdu(tl, at, root) {
    tl.fromTo('#edPyr', { opacity: 0, scale: .7, transformOrigin: '500px 360px' },
      { opacity: 1, scale: 1, duration: .45, ease: 'power3.out' }, at + .08)
      .to('#edCard', { opacity: 1, duration: .25 }, at + .45)
      .to('#edStudent', { x: 120, duration: .6, ease: 'sine.inOut' }, at + .5);
  },
  vxBiz(tl, at, root) {
    const g = root.querySelector('#bzGrid');
    if (!g.children.length) {
      for (let i = 0; i <= 5; i++) g.appendChild(el('line', { x1: -60, y1: 300 + i * i * 9, x2: 1060, y2: 300 + i * i * 9 }));
      for (let i = -6; i <= 6; i++) g.appendChild(el('line', { x1: 500 + i * 62, y1: 300, x2: 500 + i * 170, y2: 500 }));
    }
    const av = root.querySelector('#bzAvatars');
    if (!av.children.length) {
      const P = [[230, 372], [340, 320], [500, 300], [660, 320], [770, 372]];
      P.forEach(([x, y], i) => {
        const gg = el('g', { class: 'bzA' });
        /* contraste alto: si el avatar se funde con el fondo no se lee */
        gg.appendChild(el('path', { d: `M${x - 40} ${y + 70} L${x - 34} ${y + 6} Q${x} ${y - 16} ${x + 34} ${y + 6} L${x + 40} ${y + 70} Z`, fill: 'rgba(203,255,62,.34)', stroke: '#CBFF3E', 'stroke-width': 4 }));
        gg.appendChild(el('circle', { cx: x, cy: y - 34, r: 26, fill: 'rgba(203,255,62,.42)', stroke: '#CBFF3E', 'stroke-width': 4 }));
        gg.appendChild(el('rect', { x: x - 20, y: y - 44, width: 40, height: 15, rx: 5, fill: '#07160b', stroke: '#EFE9DE', 'stroke-width': 2 }));
        const t = el('text', { x, y: y + 96, class: 'svgmono svgmid', fill: '#EFE9DE', 'font-size': 16 });
        t.textContent = ['GDL', 'CDMX', 'BOGOTÁ', 'MADRID', 'LIMA'][i];
        gg.appendChild(t);
        av.appendChild(gg);
      });
    }
    [...av.children].forEach((a, i) => {
      gsap.set(a, { opacity: 0, y: 40, scale: .7, transformOrigin: 'center' });
      tl.to(a, { opacity: 1, y: 0, scale: 1, duration: .28, ease: 'back.out(1.8)' }, at + .1 + i * .1);
    });
    tl.to('#bzScreen', { opacity: 1, duration: .25 }, at + .55);
  },
  vxTher(tl, at, root) {
    /* La playa se revela con ~260 granos que crecen en desorden: la
       transición se siente material, no un recorte geométrico. */
    const grains = root.querySelector('#thGrains');
    if (grains && !grains.children.length) {
      const COLS = 26, ROWS = 12;
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const cx = (1000 / COLS) * (c + .5) + (((r * 7 + c * 13) % 11) - 5) * 2.2;
          const cy = (500 / ROWS) * (r + .5) + (((r * 5 + c * 3) % 9) - 4) * 2.4;
          grains.appendChild(el('circle', { cx, cy, r: 0, fill: '#fff' }));
        }
      }
    }
    const meter = root.querySelector('#thMeter');
    if (meter && !meter.children.length) {
      // un solo indicador, pequeño y abajo: no tapa la escena
      meter.appendChild(el('rect', { x: 42, y: 436, width: 336, height: 54, rx: 6, fill: 'rgba(7,18,10,.86)' }));
      const t = el('text', { x: 60, y: 462, fill: '#CBFF3E',
        style: 'font-family:"JetBrains Mono",monospace;font-size:15px;letter-spacing:.16em' });
      t.textContent = 'ANSIEDAD';
      meter.appendChild(t);
      meter.appendChild(el('rect', { x: 60, y: 472, width: 250, height: 9, rx: 4.5, fill: '#22331a' }));
      meter.appendChild(el('rect', { id: 'thBar', x: 60, y: 472, width: 250, height: 9, rx: 4.5, fill: '#FF5B2E' }));
      const v = el('text', { id: 'thVal', x: 322, y: 482, fill: '#FF5B2E',
        style: 'font-family:"JetBrains Mono",monospace;font-size:15px;letter-spacing:.12em' });
      v.textContent = 'alta';
      meter.appendChild(v);
    }
    const bar = root.querySelector('#thBar');
    const val = root.querySelector('#thVal');
    const dots = grains ? [...grains.children] : [];

    // 1 · se pone el visor
    tl.to('#thVisor', { opacity: 1, duration: .1 }, at + .1);
    // 2 · destello suave y los granos se abren en desorden
    tl.fromTo('#thGlow', { opacity: 0 }, { opacity: .5, duration: .12, yoyo: true, repeat: 1 }, at + .16);
    tl.to(dots, {
      attr: { r: 34 }, ease: 'power2.out', duration: .42,
      stagger: { amount: .38, from: 'random' },
    }, at + .2);
    // 3 · el mar respira, despacio
    tl.to('#thWave1', { x: -46, duration: 1.1, yoyo: true, repeat: 1, ease: 'sine.inOut' }, at + .4)
      .to('#thWave2', { x: 40, duration: 1.1, yoyo: true, repeat: 1, ease: 'sine.inOut' }, at + .4)
      .to('#thMeter', { opacity: 1, duration: .16 }, at + .52);
    // 4 · la ansiedad baja despacio, para que se pueda leer
    if (bar) {
      const o = { w: 250 };
      tl.to(o, {
        w: 48, duration: 1.1, ease: 'power1.inOut',
        onUpdate: () => {
          bar.setAttribute('width', o.w.toFixed(0));
          const hi = o.w > 170, mid = o.w > 105;
          const col = hi ? '#FF5B2E' : mid ? '#e8c24a' : '#CBFF3E';
          bar.setAttribute('fill', col);
          val.setAttribute('fill', col);
          val.textContent = hi ? 'alta' : mid ? 'media' : 'baja';
        },
      }, at + .62);
    }
  },

  axRuler(tl, at, root) {
    const bar = root.querySelector('.ruler i');
    const vertical = !!root.querySelector('.ruler--y');
    gsap.set(bar, vertical ? { scaleY: 0, transformOrigin: '50% 100%' } : { scaleX: 0, transformOrigin: '0 50%' });
    tl.to(bar, vertical ? { scaleY: 1, duration: .45, ease: 'power2.out' }
      : { scaleX: 1, duration: .45, ease: 'power2.out' }, at + .08);
    tl.fromTo(root.querySelector('.ruler b'), { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: .2 }, at + .45);
  },

  /* cierre: campo de partículas de colores que converge y estalla */
  finale(tl, at, root) {
    const cv = root.querySelector('#finale');
    if (!cv) return;
    const ctx = cv.getContext('2d');
    const dpr = Math.min(2, devicePixelRatio || 1);
    const size = () => {
      const r = cv.parentElement.getBoundingClientRect();
      cv.width = Math.max(1, Math.floor(r.width * dpr));
      cv.height = Math.max(1, Math.floor(r.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return { w: r.width, h: r.height };
    };
    let { w, h } = size();
    addEventListener('resize', () => { const s = size(); w = s.w; h = s.h; }, { passive: true });

    /* Los puntos terminan formando la silueta de un visor de VR.
       Se muestrea la forma en un lienzo aparte para obtener los destinos. */
    const shapePoints = (W, H, want) => {
      const off = document.createElement('canvas');
      const S = 300, sc = S / 1000;
      off.width = S; off.height = Math.round(S * .5);
      const o = off.getContext('2d');
      o.fillStyle = '#fff';
      const rr = (x, y, ww, hh, r) => {
        o.beginPath(); o.moveTo(x + r, y);
        o.arcTo(x + ww, y, x + ww, y + hh, r); o.arcTo(x + ww, y + hh, x, y + hh, r);
        o.arcTo(x, y + hh, x, y, r); o.arcTo(x, y, x + ww, y, r); o.closePath(); o.fill();
      };
      // cuerpo del visor
      rr(150 * sc, 90 * sc, 700 * sc, 300 * sc, 90 * sc);
      // correa
      o.lineWidth = 46 * sc; o.strokeStyle = '#fff';
      o.beginPath(); o.moveTo(160 * sc, 150 * sc);
      o.bezierCurveTo(20 * sc, 150 * sc, 20 * sc, 380 * sc, 170 * sc, 372 * sc); o.stroke();
      o.beginPath(); o.moveTo(840 * sc, 150 * sc);
      o.bezierCurveTo(980 * sc, 150 * sc, 980 * sc, 380 * sc, 830 * sc, 372 * sc); o.stroke();
      // lentes vacíos
      o.globalCompositeOperation = 'destination-out';
      o.beginPath(); o.ellipse(370 * sc, 236 * sc, 120 * sc, 96 * sc, 0, 0, 7); o.fill();
      o.beginPath(); o.ellipse(630 * sc, 236 * sc, 120 * sc, 96 * sc, 0, 0, 7); o.fill();
      o.globalCompositeOperation = 'source-over';

      const d = o.getImageData(0, 0, off.width, off.height).data;
      const hits = [];
      for (let py = 0; py < off.height; py++) {
        for (let px = 0; px < off.width; px++) {
          if (d[(py * off.width + px) * 4 + 3] > 128) hits.push([px / off.width, py / off.height]);
        }
      }
      // barajado determinista: reparte los puntos por toda la figura
      for (let i = hits.length - 1; i > 0; i--) {
        const j = (i * 1103515245 + 12345) % (i + 1);
        [hits[i], hits[j]] = [hits[j], hits[i]];
      }
      const scale = Math.min(W * .62, H * 1.25);
      const cy = H * .3;                     // arriba: el texto ocupa el resto
      const out = [];
      for (let i = 0; i < want; i++) {
        const [u, v] = hits[i % hits.length] || [.5, .5];
        out.push({
          x: W / 2 + (u - .5) * scale,
          y: cy + (v - .5) * scale * .5,
        });
      }
      return out;
    };

    const COLORS = ['#CBFF3E', '#9EFF6B', '#E6FF8A', '#5FE0C0', '#FF5B2E', '#EFE9DE', '#7CFF7C', '#FFC24A'];
    const N = 2600;
    let P = [];
    const seed = () => {
      const targets = shapePoints(w, h, N);
      P = new Array(N).fill(0).map((_, i) => {
        const a = (i / N) * Math.PI * 2 * 5;
        return {
          a, r0: 300 + (i % 13) * 52, col: COLORS[i % COLORS.length],
          s: .8 + (i % 4) * .35, ph: Math.random() * Math.PI * 2,
          tx: targets[i].x, ty: targets[i].y,
        };
      });
    };
    seed();
    addEventListener('resize', () => { const s2 = size(); w = s2.w; h = s2.h; seed(); }, { passive: true });

    const state = { t: 0 };
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      const cx = w / 2, cy = h * .3, t = state.t;
      const orbit = gsap.utils.clamp(0, 1, t / .45);        // se juntan
      const form = gsap.utils.clamp(0, 1, (t - .42) / .58); // toman la forma del visor
      const ease = form * form * (3 - 2 * form);
      for (const p of P) {
        const r = p.r0 * (1 - orbit * .72);
        const ang = p.a + t * 1.5 + Math.sin(p.ph + t * 4) * .12;
        const ox = cx + Math.cos(ang) * r;
        const oy = cy + Math.sin(ang) * r * .6;
        const x = ox + (p.tx - ox) * ease;
        const y = oy + (p.ty - oy) * ease;
        ctx.globalAlpha = .3 + .7 * Math.max(orbit, ease);
        ctx.fillStyle = p.col;
        const s = p.s * (1 + ease * 1.1);
        ctx.fillRect(x, y, s, s);
      }
      // aliento de las lentes cuando la figura ya está armada
      if (ease > .6) {
        ctx.globalAlpha = (ease - .6) / .4 * .5;
        const scale = Math.min(w * .62, h * 1.25);
        [-0.13, 0.13].forEach(dx => {
          const g2 = ctx.createRadialGradient(cx + dx * scale, cy, 0, cx + dx * scale, cy, scale * .1);
          g2.addColorStop(0, 'rgba(203,255,62,.75)'); g2.addColorStop(1, 'rgba(203,255,62,0)');
          ctx.fillStyle = g2;
          ctx.fillRect(cx + dx * scale - scale * .12, cy - scale * .12, scale * .24, scale * .24);
        });
      }
      ctx.globalAlpha = 1;
    };
    draw();
    tl.to(state, { t: 1, ease: 'none', duration: 1, onUpdate: draw }, at);
  },
};

/* ============================================================
   MOTOR
   ============================================================ */
const CHAPTER_STATE = [];

function buildChapter(sel) {
  const sec = document.querySelector(sel);
  if (!sec) return;
  const stage = sec.querySelector('.stage');
  const beats = [...sec.querySelectorAll('[data-beat]')];
  const scene = stage.querySelector('[data-scene]');
  CHAPTER_STATE.push({ id: sec.id, count: beats.length, current: 0 });
  if (scene) stage.classList.add('stage--scene');
  beats.forEach(b => { if (b.querySelector('.mega--ask')) b.classList.add('beat--ask'); });

  if (!MOTION) return;

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: sec, start: 'top top',
      end: '+=' + (beats.length * 110) + '%',
      scrub: .55, pin: stage, anticipatePin: 1,
      onUpdate: self => {
        const i = Math.min(beats.length - 1, Math.floor(self.progress * beats.length));
        const st = CHAPTER_STATE.find(c => c.id === sec.id);
        if (st) st.current = i;
      },
    },
  });

  /* La escena persistente arranca tras la pregunta y dura `span` beats */
  if (scene) {
    const span = parseInt(scene.dataset.sceneSpan || (beats.length - 1), 10);
    const start = 1, end = 1 + span;
    gsap.set(scene, { autoAlpha: 0 });
    tl.to(scene, { autoAlpha: 1, duration: .22, ease: 'none' }, start - .3);
    const fn = SCENES[scene.dataset.scene];
    if (fn) fn(tl, start, span, scene);
    if (end < beats.length) tl.to(scene, { autoAlpha: 0, duration: .2, ease: 'none' }, end - .1);
  }

  beats.forEach((beat, i) => {
    const at = i;
    const last = i === beats.length - 1;
    if (beat.querySelector('.art--obj')) beat.classList.add('beat--obj');

    gsap.set(beat, { autoAlpha: 0 });
    tl.set(beat, { autoAlpha: 1 }, at);

    if (beat.hasAttribute('data-dark')) {
      tl.to('#blackout', { opacity: .96, duration: .12, ease: 'none' }, at);
      if (last || !beats[i + 1].hasAttribute('data-dark')) {
        tl.to('#blackout', { opacity: 0, duration: .12, ease: 'none' }, at + .92);
      }
    }

    const q = beat.querySelector('.q');
    if (q) { softIn(q, tl, at + .02); if (!last) softOut(q, tl, at + .82); }

    const fill = beat.querySelector('[data-fill]');
    if (fill) {
      fillIn(fill, tl, at + .05, .4);
      if (!last) shatter(fill, tl, at + .84, .16);
    }

    const art = beat.querySelector('[data-art]');
    if (art) {
      const fn = ARTS[art.dataset.art];
      tl.fromTo(art, { autoAlpha: 0 }, { autoAlpha: 1, duration: .12, ease: 'none' }, at);
      if (fn) fn(tl, at, art);
      if (!last) tl.to(art, { autoAlpha: 0, duration: .14, ease: 'none' }, at + .87);
    }

    const sub = beat.querySelector('[data-sub]');
    if (sub) { softIn(sub, tl, at + .42); if (!last) softOut(sub, tl, at + .86); }

    /* Firma del cierre: cada línea con su propio gesto */
    const sign = beat.querySelector('.signoff');
    if (sign) {
      const nm = splitLetters(beat.querySelector('[data-signname]'));
      gsap.set(nm, { opacity: 0, yPercent: 60, rotationX: -80 });
      tl.to(nm, { opacity: 1, yPercent: 0, rotationX: 0, duration: .3, ease: 'back.out(1.7)',
        stagger: { amount: .3, from: 'center' } }, at + .3);

      const car = beat.querySelector('[data-signcareer]');
      gsap.set(car, { clipPath: 'inset(0 100% 0 0)' });
      tl.to(car, { clipPath: 'inset(0 0% 0 0)', duration: .4, ease: 'power2.out' }, at + .55);

      const chips = [...beat.querySelectorAll('[data-signsrc] span')];
      chips.forEach((c, k) => {
        gsap.set(c, { opacity: 0, scale: .6, y: 20 });
        tl.to(c, { opacity: 1, scale: 1, y: 0, duration: .22, ease: 'back.out(2.2)' }, at + .7 + k * .07);
      });
    }

    if (!last) tl.set(beat, { autoAlpha: 0 }, at + 1);
  });

  tl.to({}, { duration: .4 });
}

/* ---------- 00 · Nombre ---------- */
(function nombre() {
  const lines = gsap.utils.toArray('[data-nameline]');
  gsap.set('.name__stack', { visibility: 'visible' });
  if (!MOTION) { gsap.set(['.q--top', '.name__foot'], { opacity: 1 }); return; }

  gsap.set(lines, { yPercent: 110 });
  const tl = gsap.timeline({ defaults: { ease: 'expo.out' }, delay: .2 });
  tl.fromTo('.q--top', { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: .8 }, 0)
    .to(lines, { yPercent: 0, duration: 1.2, stagger: .1 }, .1)
    .fromTo('.name__foot', { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: .8 }, .9);

  /* El apellido se rellena de verde conforme bajas: el trazo pasa de
     apagado a ácido y luego el interior se llena, letra por letra. */
  const scrollFill = document.querySelector('[data-scrollfill]');
  if (scrollFill) {
    const ls = splitLetters(scrollFill);
    gsap.set(ls, { webkitTextStrokeColor: DIM, color: 'rgba(203,255,62,0)' });
    gsap.timeline({
      scrollTrigger: { trigger: '#s-nombre', start: 'top top', end: '+=48%', scrub: .5 },
    })
      .to(ls, { webkitTextStrokeColor: ACID, ease: 'none', duration: .1,
        stagger: { amount: .5, from: 'start' } }, 0)
      .to(ls, { color: ACID, ease: 'none', duration: .12,
        stagger: { amount: .55, from: 'start' } }, .25);
  }

  /* la desintegración arranca cuando el relleno ya terminó */
  const st = gsap.timeline({
    scrollTrigger: { trigger: '#s-nombre', start: 'top -46%', end: 'bottom top', scrub: .6 },
  });
  lines.forEach(line => {
    const ls = splitLetters(line);
    st.to(ls, {
      x: () => gsap.utils.random(-320, 320),
      y: () => gsap.utils.random(-260, 120),
      rotation: () => gsap.utils.random(-160, 160),
      scale: .1, opacity: 0, ease: 'power2.in', duration: .8,
      stagger: { amount: .35, from: 'random' },
    }, 0);
  });
  st.to(['.q--top', '.name__foot'], { opacity: 0, duration: .3 }, 0);
})();

['#s-carrera', '#s-cognitiva', '#s-experiencia', '#s-evi',
  '#s-ar', '#s-vr', '#s-mr', '#s-ejes', '#s-cierre'].forEach(buildChapter);

/* Sin movimiento: cada acto se deja en su estado final */
if (!MOTION) {
  document.querySelectorAll('[data-art]').forEach(art => {
    const fn = ARTS[art.dataset.art];
    if (!fn) return;
    const t = gsap.timeline({ paused: true });
    try { fn(t, 0, art); t.progress(1); } catch (e) { /* no aplica sin scroll */ }
  });
  document.querySelectorAll('[data-scene]').forEach(scene => {
    const fn = SCENES[scene.dataset.scene];
    if (!fn) return;
    const t = gsap.timeline({ paused: true });
    try { fn(t, 0, 3, scene); t.progress(.72); } catch (e) { /* no aplica sin scroll */ }
  });
}

/* ---------- HUD ---------- */
(function hud() {
  const bar = document.querySelector('.progress__bar');
  const items = gsap.utils.toArray('.chapters__item');
  const sections = gsap.utils.toArray('[data-chapter]');

  items.forEach((it, i) => {
    const sec = sections[i];
    const n = sec ? sec.querySelectorAll('[data-beat]').length : 0;
    const box = it.querySelector('.chapters__beats');
    for (let k = 0; k < n; k++) box.appendChild(document.createElement('i'));
  });

  let ranges = [];
  const measure = () => {
    ranges = sections.map(s => {
      const stage = s.querySelector('.stage');
      const box = (stage && stage.parentElement && stage.parentElement.classList.contains('pin-spacer'))
        ? stage.parentElement : s;
      const r = box.getBoundingClientRect();
      return { top: r.top + scrollY, index: parseInt(s.dataset.chapter, 10), veil: s.dataset.veil, id: s.id };
    }).sort((a, b) => a.top - b.top);
  };

  let current = -1;
  const sync = () => {
    if (!ranges.length) return;
    const probe = scrollY + innerHeight * .45;
    let found = ranges[0];
    for (const r of ranges) if (probe >= r.top) found = r;
    if (found.index !== current) {
      current = found.index;
      items.forEach((it, k) => it.classList.toggle('is-active', k === current));
      if (found.veil) veil.setMode(found.veil);
    }
    const st = CHAPTER_STATE.find(c => c.id === found.id);
    if (st && items[current]) {
      const dots = items[current].querySelectorAll('.chapters__beats i');
      dots.forEach((d, k) => d.classList.toggle('is-on', k === st.current));
    }
  };

  ScrollTrigger.addEventListener('refresh', () => { measure(); current = -1; sync(); });
  measure(); sync();

  const halftone = document.getElementById('halftone');
  ScrollTrigger.create({
    start: 0, end: 'max',
    onUpdate: self => {
      gsap.set(bar, { scaleX: self.progress });
      const v = Math.min(1, Math.abs(self.getVelocity()) / 4000);
      veil.kick(v * .35);
      gsap.set(halftone, {
        opacity: .05 + v * .2,
        backgroundSize: (24 - v * 11).toFixed(1) + 'px ' + (24 - v * 11).toFixed(1) + 'px',
      });
      sync();
    },
  });

  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => { e.preventDefault(); scrollToTarget(a.getAttribute('href')); });
  });
})();

if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
addEventListener('load', () => ScrollTrigger.refresh());
