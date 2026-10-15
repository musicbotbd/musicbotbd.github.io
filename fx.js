// Music-note effects: notes orbit the mouse, a trail follows it, and every click bursts into notes.
// Every visit gets its own random seed, and every orbit, trail note and burst re-rolls its own look,
// so the motion never repeats the same way twice.
(() => {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  // ---- seeded random (mulberry32), a fresh seed each visit
  let seed = (Date.now() ^ (Math.random() * 2 ** 32)) >>> 0;
  const rand = () => {
    seed = (seed + 0x6d2b79f5) >>> 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const range = (a, b) => a + rand() * (b - a);
  const pick = arr => arr[Math.floor(rand() * arr.length)];

  const GLYPHS = ["♪", "♫", "♬", "♩", "♪", "♫"];
  const COLORS = ["#f2b544", "#ffd27a", "#e09a2c", "#fff1c9", "#ff9f6b", "#f6c9de", "#c8b6ff"];

  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  Object.assign(canvas.style, { position: "fixed", inset: "0", width: "100%", height: "100%", pointerEvents: "none", zIndex: "50" });
  const ctx = canvas.getContext("2d");
  let W = 0, H = 0, dpr = 1;
  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const mouse = { x: -999, y: -999, sx: -999, sy: -999, lastMove: 0, lastX: 0, lastY: 0, inside: false };
  const particles = [];   // trail + burst notes
  const orbiters = [];    // notes circling the cursor
  const rings = [];       // click ripples

  // ---- notes that circle the cursor; each one re-rolls its look every few seconds
  function rollOrbiter(o) {
    o.glyph = pick(GLYPHS);
    o.color = pick(COLORS);
    o.size = range(20, 32);
    o.radius = range(28, 60);
    o.speed = range(0.9, 2.4) * (rand() < 0.5 ? -1 : 1);
    o.wobble = range(4, 12);
    o.wobbleSpeed = range(1.5, 4);
    o.tilt = range(-0.5, 0.5);
    o.life = range(2.5, 6);   // seconds until the next re-roll
  }
  function makeOrbiters() {
    orbiters.length = 0;
    const n = 2 + Math.floor(rand() * 3);   // 2 to 4 notes
    for (let i = 0; i < n; i++) {
      const o = { angle: (i / n) * Math.PI * 2 + range(-0.4, 0.4), age: 0, fade: 0 };
      rollOrbiter(o);
      orbiters.push(o);
    }
  }

  // ---- one note that drifts away and fades
  function spawn(x, y, opts = {}) {
    const a = opts.angle ?? range(0, Math.PI * 2);
    const sp = opts.speed ?? range(20, 70);
    particles.push({
      x, y,
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      g: opts.gravity ?? range(-40, -10),      // negative = floats up
      rot: range(-0.6, 0.6), vr: range(-3, 3),
      size: opts.size ?? range(18, 30),
      glyph: pick(GLYPHS), color: opts.color ?? pick(COLORS),
      life: 0, max: opts.max ?? range(0.7, 1.5),
      sway: range(0, Math.PI * 2), swayAmp: range(10, 40),
    });
  }

  // ---- click: a different burst shape each time
  const BURSTS = [
    (x, y) => { // even ring of notes
      const n = 8 + Math.floor(rand() * 7), off = range(0, Math.PI * 2);
      for (let i = 0; i < n; i++) spawn(x, y, { angle: off + (i / n) * Math.PI * 2, speed: range(110, 190), gravity: range(-20, 40) });
    },
    (x, y) => { // fountain up
      const n = 10 + Math.floor(rand() * 8);
      for (let i = 0; i < n; i++) spawn(x, y, { angle: range(-Math.PI * 0.85, -Math.PI * 0.15), speed: range(150, 300), gravity: range(180, 300), max: range(0.9, 1.6) });
    },
    (x, y) => { // spiral
      const n = 12 + Math.floor(rand() * 6), turn = range(0.35, 0.7), off = range(0, Math.PI * 2);
      for (let i = 0; i < n; i++) spawn(x, y, { angle: off + i * turn, speed: 40 + i * range(10, 16), gravity: -15 });
    },
    (x, y) => { // scattered pop, one colour family
      const base = pick(COLORS), n = 8 + Math.floor(rand() * 10);
      for (let i = 0; i < n; i++) spawn(x, y, { speed: range(60, 240), color: rand() < 0.7 ? base : pick(COLORS), size: range(16, 36) });
    },
  ];
  function burst(x, y) {
    pick(BURSTS)(x, y);
    rings.push({ x, y, r: 4, max: range(36, 70), life: 0, color: pick(COLORS) });
    if (rand() < 0.5) rings.push({ x, y, r: 2, max: range(20, 34), life: -0.08, color: pick(COLORS) });
    wake();
  }

  // ---- input
  addEventListener("pointermove", e => {
    if (e.pointerType !== "mouse") return;   // phones: tap bursts only
    const now = performance.now();
    if (!mouse.inside) { mouse.sx = e.clientX; mouse.sy = e.clientY; mouse.inside = true; makeOrbiters(); }
    mouse.x = e.clientX; mouse.y = e.clientY; mouse.lastMove = now;
    const dx = mouse.x - mouse.lastX, dy = mouse.y - mouse.lastY;
    if (dx * dx + dy * dy > range(500, 1400)) {  // a trail note every so often, not every pixel
      mouse.lastX = mouse.x; mouse.lastY = mouse.y;
      if (rand() < 0.75) spawn(mouse.x + range(-8, 8), mouse.y + range(-8, 8), { speed: range(10, 40), size: range(15, 24), max: range(0.7, 1.2) });
    }
    wake();
  }, { passive: true });
  document.addEventListener("mouseleave", () => { mouse.inside = false; });
  addEventListener("pointerdown", e => burst(e.clientX, e.clientY), { passive: true });

  // ---- drawing
  function drawNote(glyph, x, y, size, color, alpha, rot) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.font = `700 ${size}px "Segoe UI Symbol", "Noto Music", "Apple Symbols", sans-serif`;
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = size * 0.6;
    ctx.fillText(glyph, -size * 0.3, size * 0.35);
    ctx.restore();
  }

  let running = false, last = 0;
  function wake() { if (!running) { running = true; last = performance.now(); requestAnimationFrame(frame); } }

  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    ctx.clearRect(0, 0, W, H);

    // cursor smoothing, and orbiters fade out after 3 s without moving
    mouse.sx += (mouse.x - mouse.sx) * Math.min(1, dt * 12);
    mouse.sy += (mouse.y - mouse.sy) * Math.min(1, dt * 12);
    const active = mouse.inside && now - mouse.lastMove < 3000;

    for (const o of orbiters) {
      o.fade += (active ? 1 : -1) * dt * 3;
      o.fade = Math.max(0, Math.min(1, o.fade));
      o.age += dt;
      if (o.age > o.life) { o.age = 0; rollOrbiter(o); }
      o.angle += o.speed * dt;
      const r = o.radius + Math.sin(now / 1000 * o.wobbleSpeed) * o.wobble;
      const x = mouse.sx + Math.cos(o.angle) * r;
      const y = mouse.sy + Math.sin(o.angle) * r * 0.8;
      if (o.fade > 0) drawNote(o.glyph, x, y, o.size, o.color, o.fade * 0.95, o.tilt + Math.sin(o.angle) * 0.3);
    }

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life += dt;
      if (p.life >= p.max) { particles.splice(i, 1); continue; }
      p.vy += p.g * dt;
      p.vx *= 1 - dt * 1.2; p.vy *= 1 - dt * 0.6;
      p.sway += dt * 4;
      p.x += (p.vx + Math.cos(p.sway) * p.swayAmp * 0.3) * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      const t = p.life / p.max;
      const scale = t < 0.15 ? t / 0.15 : 1;
      drawNote(p.glyph, p.x, p.y, p.size * (0.6 + 0.4 * scale), p.color, (1 - t) * 0.95, p.rot);
    }

    for (let i = rings.length - 1; i >= 0; i--) {
      const r = rings[i];
      r.life += dt;
      if (r.life < 0) continue;
      const t = r.life / 0.55;
      if (t >= 1) { rings.splice(i, 1); continue; }
      ctx.save();
      ctx.globalAlpha = (1 - t) * 0.8;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = 2.5 * (1 - t) + 0.5;
      ctx.shadowColor = r.color; ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.arc(r.x, r.y, r.r + (r.max - r.r) * (1 - (1 - t) ** 3), 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }

    const visibleOrbit = orbiters.some(o => o.fade > 0);
    if (particles.length || rings.length || visibleOrbit || active) requestAnimationFrame(frame);
    else { running = false; ctx.clearRect(0, 0, W, H); }
  }

  const start = () => {
    document.body.append(canvas);
    resize();
    addEventListener("resize", resize);
    makeOrbiters();
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
