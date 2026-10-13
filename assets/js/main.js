/* ==========================================================================
   Game Fieber — Scripts
   ========================================================================== */

/* ---------- Slider ---------- */
document.querySelectorAll('[data-slider]').forEach((slider) => {
  const track = slider.querySelector('[data-slider-track]');
  const prev = slider.querySelector('[data-slider-prev]');
  const next = slider.querySelector('[data-slider-next]');

  // Schrittweite = Breite einer Karte + Abstand
  const getStep = () => {
    const item = track.firstElementChild;
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    return item ? item.getBoundingClientRect().width + gap : track.clientWidth;
  };

  const update = () => {
    const maxScroll = track.scrollWidth - track.clientWidth;
    prev.hidden = track.scrollLeft <= 1;
    next.hidden = track.scrollLeft >= maxScroll - 1;
  };

  prev.addEventListener('click', () => {
    track.scrollBy({ left: -getStep(), behavior: 'smooth' });
  });

  next.addEventListener('click', () => {
    track.scrollBy({ left: getStep(), behavior: 'smooth' });
  });

  track.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();
});

/* ---------- Akkordeon (FAQ) ---------- */
document.querySelectorAll('[data-accordion]').forEach((accordion) => {
  accordion.querySelectorAll('[data-accordion-trigger]').forEach((trigger) => {
    const item = trigger.closest('[data-accordion-item]');

    trigger.addEventListener('click', () => {
      const isOpen = item.classList.toggle('is-open');
      trigger.setAttribute('aria-expanded', String(isOpen));
    });
  });
});

/* ---------- Sternenhimmel (FAQ-Hintergrund) ---------- */
document.querySelectorAll('[data-starfield]').forEach((section) => {
  const canvas = section.querySelector('canvas');
  const ctx = canvas.getContext('2d');

  const COLORS = ['#53D8D9', '#8971FC', '#FF4B00'];
  const SIZE = 2;            // Pixelgröße
  const ALPHA = 0.5;         // Weiß, 50 %
  const HOVER_RADIUS = 15;   // Einfärbe-Radius um den Cursor
  const DENSITY = 1400;      // 1 Pixel pro … px²
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let width = 0;
  let height = 0;
  let cx = 0;
  let cy = 0;
  let maxDist = 1;
  let stars = [];
  let mouse = null;
  let running = false;

  // Neuer Pixel: beim Start überall, danach am Rand
  const spawn = (star, anywhere) => {
    if (anywhere) {
      star.x = Math.random() * width;
      star.y = Math.random() * height;
    } else if (Math.random() < width / (width + height)) {
      star.x = Math.random() * width;
      star.y = Math.random() < 0.5 ? 0 : height;
    } else {
      star.x = Math.random() < 0.5 ? 0 : width;
      star.y = Math.random() * height;
    }
    star.color = null;
    return star;
  };

  const resize = () => {
    const dpr = window.devicePixelRatio || 1;
    width = section.clientWidth;
    height = section.clientHeight;
    cx = width / 2;
    cy = height / 2;
    maxDist = Math.hypot(cx, cy);

    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Bestehende Pixel behalten (z. B. beim Aufklappen des Akkordeons), nur Anzahl anpassen
    const count = Math.round((width * height) / DENSITY);
    while (stars.length < count) stars.push(spawn({}, true));
    stars.length = count;
  };

  const draw = () => {
    ctx.clearRect(0, 0, width, height);

    for (const star of stars) {
      const dx = cx - star.x;
      const dy = cy - star.y;
      const dist = Math.hypot(dx, dy) || 1;

      // Langsamer Sog zur Mitte, leicht spiralförmig, schneller je näher
      if (!reduceMotion) {
        const pull = 1 - dist / maxDist;
        const speed = 0.08 + 0.9 * pull * pull * pull;
        star.x += (dx / dist) * speed - (dy / dist) * speed * 0.25;
        star.y += (dy / dist) * speed + (dx / dist) * speed * 0.25;

        if (dist < 4) {
          spawn(star, false);
          continue;
        }
      }

      // Einfärben im Radius um den Cursor
      if (mouse && !star.color) {
        const mx = star.x - mouse.x;
        const my = star.y - mouse.y;
        if (mx * mx + my * my < HOVER_RADIUS * HOVER_RADIUS) {
          star.color = COLORS[Math.floor(Math.random() * COLORS.length)];
        }
      }

      // Kurz vor der Mitte ausblenden
      const fade = Math.min(1, dist / 80);
      ctx.globalAlpha = star.color ? fade : ALPHA * fade;
      ctx.fillStyle = star.color || '#FFFFFF';
      ctx.fillRect(Math.round(star.x), Math.round(star.y), SIZE, SIZE);
    }

    ctx.globalAlpha = 1;
  };

  const loop = () => {
    if (!running) return;
    draw();
    requestAnimationFrame(loop);
  };

  section.addEventListener('mousemove', (event) => {
    const rect = section.getBoundingClientRect();
    mouse = { x: event.clientX - rect.left, y: event.clientY - rect.top };
  });

  section.addEventListener('mouseleave', () => {
    mouse = null;
  });

  // Nur animieren, wenn die Sektion sichtbar ist
  new IntersectionObserver(([entry]) => {
    const visible = entry.isIntersecting;
    if (visible && !running) {
      running = true;
      requestAnimationFrame(loop);
    } else if (!visible) {
      running = false;
    }
  }).observe(section);

  new ResizeObserver(resize).observe(section);
  resize();
});

/* ---------- Pixel-Rain (Hero-Hintergrund) ---------- */
document.querySelectorAll('[data-pixel-rain]').forEach((root) => {
  const canvas = root.querySelector('canvas');
  const ctx = canvas.getContext('2d');

  const W = 2560;
  const H = 1600;
  const HORIZON = Math.round(H * 2 / 3); // Horizont: Boden nimmt das untere Drittel ein
  const FLOOR_H = H - HORIZON;
  // Boden: Pixel halb so groß, 50 % Deckkraft, halbe Geschwindigkeit
  const FLOOR_SCALE = 0.5;
  const FLOOR_ALPHA = 0.5;
  const FLOOR_SPEED = 0.5;
  const BG = '#00002C';
  const PALETTE = [
    { base: '#53D8D9', head: '#D9FFFF', w: 0.62 },
    { base: '#8971FC', head: '#E4DDFF', w: 0.28 },
    { base: '#FF4B00', head: '#FFC9AE', w: 0.10 },
  ];
  const RAIN_COUNT = 760;
  const FLOOR_COUNT = 520;

  const rand = (a, b) => a + Math.random() * (b - a);
  const randInt = (a, b) => Math.floor(rand(a, b + 1));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const pickColor = () => {
    let r = Math.random();
    for (const c of PALETTE) { if ((r -= c.w) <= 0) return c; }
    return PALETTE[0];
  };
  const hash = (a, b, c) => {
    let h = (a * 374761393 + b * 668265263 + c * 2147483647) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
  };

  /* --- fallende Spalten --- */
  const rain = [];
  function spawnColumn(col, initial) {
    const x = Math.random() < 0.45
      ? W / 2 + (Math.random() + Math.random() + Math.random() - 1.5) * 700
      : rand(0, W);
    const layer = Math.random();
    const size = layer < 0.5 ? randInt(3, 4) : randInt(4, 6);
    const center = Math.exp(-(((x - W / 2) / 800) ** 2));
    col.x = Math.round(x);
    col.layer = layer;
    col.size = size;
    col.step = size + randInt(2, 5);
    col.cells = Math.ceil(HORIZON / col.step);
    col.len = randInt(10, 48);
    col.speed = rand(6, 22) * (0.6 + layer * 0.6);
    col.head = initial ? rand(-col.len, col.cells) : rand(-col.len * 2, -2);
    col.alpha = (0.35 + layer * 0.65) * (0.5 + 0.5 * center);
    col.color = pickColor();
    col.seed = randInt(0, 1e6);
    col.flicker = rand(4, 12);
    return col;
  }
  for (let i = 0; i < RAIN_COUNT; i++) rain.push(spawnColumn({}, true));

  /* --- perspektivischer Boden --- */
  const Z_NEAR = 1;
  const Z_FAR = 30;
  const X_RANGE = (W / 2) * Z_FAR / FLOOR_H + 4;
  const streaks = [];
  function spawnStreak(s, initial) {
    const bx = Math.random() < 0.45
      ? (Math.random() + Math.random() - 1) * W * 0.7
      : rand(-W * 2.2, W * 2.2);
    s.x = bx / FLOOR_H;
    s.len = randInt(8, 26);
    s.gap = randInt(3, 7);
    s.speed = rand(0.35, 0.9);
    s.z = initial ? rand(Z_NEAR, Z_FAR) : Z_FAR + rand(0, 8);
    s.color = pickColor();
    s.seed = randInt(0, 1e6);
    return s;
  }
  for (let i = 0; i < FLOOR_COUNT; i++) streaks.push(spawnStreak({}, true));

  /* --- Leuchten (wird einmal gezeichnet) --- */
  const glow = document.createElement('canvas');
  glow.width = W + 400;
  glow.height = H;
  {
    const g = glow.getContext('2d');
    const cx = glow.width / 2;
    const lg = g.createLinearGradient(cx - 520, 0, cx + 520, 0);
    lg.addColorStop(0, 'rgba(83,216,217,0)');
    lg.addColorStop(0.5, 'rgba(83,216,217,0.10)');
    lg.addColorStop(1, 'rgba(83,216,217,0)');
    g.fillStyle = lg;
    g.fillRect(0, 0, glow.width, HORIZON);
    g.translate(cx, HORIZON);
    g.scale(1.9, 0.6);
    const rg = g.createRadialGradient(0, 0, 0, 0, 0, 900);
    rg.addColorStop(0, 'rgba(83,216,217,0.32)');
    rg.addColorStop(0.35, 'rgba(83,216,217,0.10)');
    rg.addColorStop(0.7, 'rgba(137,113,252,0.05)');
    rg.addColorStop(1, 'rgba(137,113,252,0)');
    g.fillStyle = rg;
    g.fillRect(-1400, -1400, 2800, 2800);
  }

  /* --- Parallaxe per Maus --- */
  let mx = 0;
  let tmx = 0;
  window.addEventListener('pointermove', (e) => {
    tmx = (e.clientX / window.innerWidth - 0.5) * 2;
  }, { passive: true });

  function drawGrid(cx, t) {
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(83,216,217,0.07)';
    ctx.beginPath();
    for (let x = -X_RANGE; x <= X_RANGE; x += 3) {
      ctx.moveTo(cx + (x * FLOOR_H) / Z_FAR, HORIZON);
      ctx.lineTo(cx + x * FLOOR_H / Z_NEAR * 1.2, H + FLOOR_H * 0.2);
    }
    const spacing = 1.2;
    const off = (t * 1.6 * FLOOR_SPEED) % spacing;
    for (let z = Z_NEAR + spacing - off; z < Z_FAR; z += spacing) {
      const y = Math.round(HORIZON + FLOOR_H / z) + 0.5;
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
    }
    ctx.stroke();
    const hg = ctx.createLinearGradient(0, 0, W, 0);
    hg.addColorStop(0, 'rgba(83,216,217,0)');
    hg.addColorStop(0.5, 'rgba(83,216,217,0.55)');
    hg.addColorStop(1, 'rgba(83,216,217,0)');
    ctx.fillStyle = hg;
    ctx.fillRect(0, HORIZON - 1, W, 2);
  }

  function drawRain(dt, cx, now) {
    for (const c of rain) {
      c.head += c.speed * dt;
      if (c.head - c.len > c.cells) spawnColumn(c, false);
      const px = Math.round(c.x + (cx - W / 2) * (0.3 + c.layer * 0.7));
      if (px < -10 || px > W + 10) continue;
      const headCell = Math.floor(c.head);
      const tick = Math.floor(now * c.flicker);
      ctx.fillStyle = c.color.base;
      for (let d = 0; d <= c.len; d++) {
        const k = headCell - d;
        if (k < 0 || k >= c.cells) continue;
        const hv = hash(c.seed, k, d === 0 ? 0 : tick);
        if (d > 0 && hv < 0.22) continue;
        const y = k * c.step;
        if (d === 0) {
          ctx.globalAlpha = Math.min(1, c.alpha * 1.8);
          ctx.fillStyle = c.color.head;
          ctx.fillRect(px, y, c.size, c.size);
          ctx.fillStyle = c.color.base;
        } else {
          const fade = 1 - d / c.len;
          ctx.globalAlpha = c.alpha * fade * fade * (0.75 + 0.25 * hv) *
            clamp((HORIZON - y) / 120, 0.35, 1);
          ctx.fillRect(px, y, c.size, c.size);
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawFloor(dt, cx, now) {
    const tick = Math.floor(now * 8);
    for (const s of streaks) {
      s.z -= s.speed * FLOOR_SPEED * Math.max(s.z, 0.3) * dt;
      if (s.z < 0.45) { spawnStreak(s, false); continue; }
      let z = s.z;
      for (let i = 0; i < s.len; i++) {
        if (i > 0) {
          const n0 = clamp((Z_FAR - z) / (Z_FAR - Z_NEAR), 0, 1);
          z += ((3 + 3 * n0 * n0 + s.gap) * FLOOR_SCALE * z * z) / FLOOR_H;
        }
        if (z > Z_FAR) break;
        const k = FLOOR_H / z;
        const sx = cx + s.x * k;
        const sy = HORIZON + k;
        if (sx < -8 || sx > W + 8 || sy > H + 8) continue;
        const hv = hash(s.seed, i, tick);
        if (i > 0 && hv < 0.18) continue;
        const near = clamp((Z_FAR - z) / (Z_FAR - Z_NEAR), 0, 1);
        const size = Math.max(1, Math.round((3 + 3 * near * near) * FLOOR_SCALE));
        const a = (1 - i / s.len) * clamp((Z_FAR - z) / 5, 0, 1) *
          (0.3 + 0.7 * near) * (0.7 + 0.3 * hv);
        ctx.globalAlpha = (i === 0 ? Math.min(1, a * 1.4) : a) * FLOOR_ALPHA;
        ctx.fillStyle = i === 0 ? s.color.head : s.color.base;
        ctx.fillRect(Math.round(sx - size / 2), Math.round(sy - size / 2), size, size);
      }
    }
    ctx.globalAlpha = 1;
  }

  let last = performance.now();
  let t = 0;
  let rafId = 0;

  function frame(nowMs) {
    const dt = Math.min(0.05, (nowMs - last) / 1000);
    last = nowMs;
    t += dt;
    mx += (tmx - mx) * 0.04;
    const cx = W / 2 + mx * 60;
    const now = nowMs / 1000;

    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(glow, cx - glow.width / 2, 0);
    drawGrid(cx, t);
    drawRain(dt, cx, now);
    drawFloor(dt, cx, now);
    ctx.globalCompositeOperation = 'source-over';
  }

  function loop(nowMs) {
    frame(nowMs);
    rafId = requestAnimationFrame(loop);
  }

  const start = () => {
    if (rafId) return;
    last = performance.now();
    rafId = requestAnimationFrame(loop);
  };

  const stop = () => {
    cancelAnimationFrame(rafId);
    rafId = 0;
  };

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    frame(performance.now()); // statisches Bild
  } else {
    // Nur animieren, solange der Hero sichtbar ist
    new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop()))
      .observe(root);
  }
});

/* ---------- Header: Hintergrund beim Scrollen ---------- */
const header = document.querySelector('.header');

if (header) {
  const updateHeader = () => {
    header.classList.toggle('is-scrolled', window.scrollY > 0);
  };

  window.addEventListener('scroll', updateHeader, { passive: true });
  updateHeader();
}

/* ---------- Tetris-Quadrate (About-Sektion) ---------- */
(() => {
  const CONFIG = {
    fieldHeight: 200,   // Höhe des Feldes mit Quadraten, px
    size: 5,            // Größe eines Quadrats, px
    gap: 4,             // Abstand zwischen Quadraten, px
    maxWidth: 2560,
    maxHeight: 1600,
    colors: ['#FFFFFF', '#53D8D9', '#8971FC', '#FF4B00'],
    gravity: 1400,      // Fallbeschleunigung, px/s²
    fadeTime: 1.6,      // Ausblendzeit eines fallenden Quadrats, s
    hoverRadius: 12,    // Fangradius um den Cursor, px
    respawn: [5, 10],   // nach wie vielen Sekunden ein Quadrat zurückkommt, s
    twinkleMin: 0.2,    // minimale Deckkraft beim Funkeln (20 %)
    twinkleSpeed: [0.1, 0.5], // Funkel-Geschwindigkeit, Zyklen pro Sekunde (pro Quadrat verschieden)
  };

  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[(Math.random() * arr.length) | 0];
  const TAU = Math.PI * 2;
  // Deckkraft beim Funkeln: von twinkleMin bis 100 %
  const twinkle = (cell) => CONFIG.twinkleMin + (1 - CONFIG.twinkleMin) * (0.5 + 0.5 * Math.sin(cell.phase));

  function smoothNoise(length, octaves) {
    const out = new Array(length).fill(0);
    let amp = 1;
    let total = 0;
    for (const period of octaves) {
      const knots = Array.from({ length: Math.ceil(length / period) + 2 }, Math.random);
      for (let i = 0; i < length; i++) {
        const p = i / period;
        const k = Math.floor(p);
        const f = p - k;
        const s = f * f * (3 - 2 * f);
        out[i] += (knots[k] * (1 - s) + knots[k + 1] * s) * amp;
      }
      total += amp;
      amp *= 0.5;
    }
    return out.map((v) => v / total);
  }

  function init(root) {
    const canvas = root.querySelector('canvas');
    const ctx = canvas.getContext('2d');
    const step = CONFIG.size + CONFIG.gap;
    let width = 0;
    let height = 0;
    let cells = [];
    let falling = [];
    let last = performance.now();

    function buildField() {
      const cols = Math.floor((width - CONFIG.gap) / step);
      const rows = Math.floor(CONFIG.fieldHeight / step);
      const offsetX = Math.round((width - (cols * step - CONFIG.gap)) / 2);
      const depth = smoothNoise(cols, [18, 6, 2]);
      cells = [];
      for (let c = 0; c < cols; c++) {
        const d = 0.25 + depth[c];
        for (let r = 0; r < rows; r++) {
          const y = r / rows;
          const p = y < d ? 0.82 - (y / d) * 0.35 : 0.06 * (1 - y);
          if (Math.random() < p) {
            cells.push({
              x: offsetX + c * step, y: r * step, color: pick(CONFIG.colors), state: 'on', t: 0,
              phase: rand(0, TAU), speed: rand(CONFIG.twinkleSpeed[0], CONFIG.twinkleSpeed[1]) * TAU,
            });
          }
        }
      }
    }

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = root.getBoundingClientRect();
      const w = Math.min(rect.width, CONFIG.maxWidth);
      const h = Math.min(rect.height, CONFIG.maxHeight);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      height = h;
      if (w !== width) {
        width = w;
        falling = [];
        buildField();
      }
    }

    function onPointerMove(e) {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const R = CONFIG.hoverRadius;
      if (mx < -R || mx > rect.width + R || my < -R || my > CONFIG.fieldHeight + R) return;

      const half = CONFIG.size / 2;
      let best = null;
      let bestDist = Infinity;
      for (const cell of cells) {
        if (cell.state !== 'on') continue;
        const dx = cell.x + half - mx;
        const dy = cell.y + half - my;
        const dist = dx * dx + dy * dy;
        if (dist < bestDist) { bestDist = dist; best = cell; }
      }
      const reach = half + R;
      if (best && bestDist <= reach * reach) {
        best.state = 'off';
        best.t = rand(CONFIG.respawn[0], CONFIG.respawn[1]);
        falling.push({
          x: best.x, y: best.y,
          vx: rand(-25, 25), vy: rand(0, 40),
          rot: 0, vr: rand(-2, 2),
          life: 1, alpha: twinkle(best), color: best.color,
        });
      }
    }

    function update(dt) {
      for (const cell of cells) {
        cell.phase += cell.speed * dt;
        if (cell.state === 'off') {
          cell.t -= dt;
          if (cell.t <= 0) { cell.state = 'in'; cell.t = 0; }
        } else if (cell.state === 'in') {
          cell.t += dt / 0.6;
          if (cell.t >= 1) cell.state = 'on';
        }
      }
      for (const f of falling) {
        f.vy += CONFIG.gravity * dt;
        f.x += f.vx * dt;
        f.y += f.vy * dt;
        f.rot += f.vr * dt;
        f.life -= dt / CONFIG.fadeTime;
      }
      falling = falling.filter((f) => f.life > 0 && f.y < height + CONFIG.size);
    }

    function draw() {
      const s = CONFIG.size;
      ctx.clearRect(0, 0, width, height);
      for (const cell of cells) {
        if (cell.state === 'off') continue;
        ctx.globalAlpha = twinkle(cell) * (cell.state === 'in' ? cell.t : 1);
        ctx.fillStyle = cell.color;
        ctx.fillRect(cell.x, cell.y, s, s);
      }
      for (const f of falling) {
        ctx.globalAlpha = Math.max(0, f.alpha * f.life * f.life);
        ctx.fillStyle = f.color;
        ctx.save();
        ctx.translate(f.x + s / 2, f.y + s / 2);
        ctx.rotate(f.rot);
        ctx.fillRect(-s / 2, -s / 2, s, s);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    }

    function loop(now) {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      update(dt);
      draw();
      requestAnimationFrame(loop);
    }

    new ResizeObserver(resize).observe(root);
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    resize();
    requestAnimationFrame(loop);
  }

  document.querySelectorAll('.tetris-squares').forEach(init);
})();

/* ---------- Aliens unten in der About-Sektion ---------- */
document.querySelectorAll('[data-alien-peek]').forEach((zone) => {
  const ALIENS = [
    'antenna', 'blob', 'boxy', 'bug', 'crab', 'cyclops', 'diamond', 'dome', 'frog',
    'greys', 'grinner', 'heart', 'helmet', 'jelly', 'kitty', 'medusa', 'octopus',
    'pincher', 'robot', 'slime', 'spider', 'spiky', 'squid', 'trieye', 'ufo',
  ];
  const SIZE = 36;       // Icon-Größe, px
  const GAP = 36;        // Abstand zwischen Icons, px
  const VISIBLE = 2000;  // wie lange ein Alien sichtbar bleibt, ms

  const STEP = SIZE + GAP;
  let slots = [];
  let offset = 0;
  let current = null;

  const randomAlien = () => `icons/alien-${ALIENS[Math.floor(Math.random() * ALIENS.length)]}.svg`;

  // Plätze gleichmäßig über die ganze Breite verteilen
  const build = () => {
    const count = Math.max(1, Math.floor((zone.clientWidth + GAP) / STEP));
    offset = Math.round((zone.clientWidth - (count * STEP - GAP)) / 2);
    zone.innerHTML = '';
    current = null;
    slots = Array.from({ length: count }, (_, i) => {
      const slot = document.createElement('span');
      slot.className = 'alien-peek__slot';
      slot.style.left = `${offset + i * STEP}px`;
      const img = document.createElement('img');
      img.alt = '';
      img.width = SIZE;
      img.height = SIZE;
      slot.append(img);
      zone.append(slot);
      return { el: slot, img, timer: 0 };
    });
  };

  const hide = (slot) => {
    clearTimeout(slot.timer);
    slot.el.classList.remove('is-up');
  };

  // Immer nur ein Alien sichtbar: der vorherige versteckt sich
  const show = (slot) => {
    if (slot === current) return;
    if (current) hide(current);
    current = slot;
    slot.img.src = randomAlien();
    slot.el.classList.add('is-up');
    slot.timer = setTimeout(() => {
      hide(slot);
      if (current === slot) current = null;
    }, VISIBLE);
  };

  zone.addEventListener('pointermove', (event) => {
    const x = event.clientX - zone.getBoundingClientRect().left - offset;
    const index = Math.floor((x + GAP / 2) / STEP);
    if (slots[index]) show(slots[index]);
  });

  let lastWidth = 0;
  new ResizeObserver(() => {
    if (zone.clientWidth === lastWidth) return;
    lastWidth = zone.clientWidth;
    build();
  }).observe(zone);
});

/* ---------- Netz Waves (Parties-Hintergrund) ---------- */
(() => {
  const CONFIG = {
    dotSize: 1,            // Punktgröße, px
    dotColor: '0, 0, 44',  // #00002C
    dotOpacity: 0.7,       // Deckkraft der Punkte
    step: 0.021,           // Rasterabstand — Anteil der Animationshöhe
    amplitude: 6,          // Wellenhöhe in Rasterschritten
    sway: 0.5,             // seitliche Verschiebung an den Hängen
    speed: 1,              // Geschwindigkeit (1 = normal)
  };
  const WAVES = [
    { kx: 0.60, ky: 0.90, a: 0.50, w: -0.35, p: 0.0 },
    { kx: -0.90, ky: 1.20, a: 0.35, w: 0.50, p: 1.3 },
    { kx: 1.40, ky: 0.40, a: 0.25, w: -0.60, p: 2.1 },
    { kx: 0.30, ky: 1.80, a: 0.15, w: 0.45, p: 4.0 },
  ];
  const TAU = Math.PI * 2;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function init(root) {
    // Farbe und Deckkraft pro Sektion möglich:
    // <div class="netz-waves" data-dot-color="0, 0, 44" data-dot-opacity="0.5">
    const dotColor = root.dataset.dotColor || CONFIG.dotColor;
    const dotOpacity = root.dataset.dotOpacity || CONFIG.dotOpacity;

    const canvas = root.querySelector('canvas');
    const ctx = canvas.getContext('2d');
    let height = 0;
    let dpr = 1;
    let stepPx = 0;
    let grid = new Float32Array(0);
    let rafId = null;
    let visible = true;

    function resize() {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      height = rect.height;
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      stepPx = height * CONFIG.step;
      if (stepPx <= 0) return;

      const margin = Math.ceil(CONFIG.amplitude) + 2;
      const cols = Math.ceil(rect.width / stepPx) + margin * 2;
      const rows = Math.ceil(height / stepPx) + margin * 2;
      const offX = (rect.width - (cols - 1) * stepPx) / 2;
      const offY = (height - (rows - 1) * stepPx) / 2;
      grid = new Float32Array(cols * rows * 2);
      let i = 0;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          grid[i++] = (offX + c * stepPx) / height;
          grid[i++] = (offY + r * stepPx) / height;
        }
      }
    }

    function draw(time) {
      const t = (time / 1000) * CONFIG.speed;
      const amp = CONFIG.amplitude * stepPx;
      const size = Math.max(1, Math.round(CONFIG.dotSize * dpr));
      const half = size / 2;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = `rgba(${dotColor}, ${dotOpacity})`;
      const phases = WAVES.map((w) => w.w * t + w.p);

      for (let i = 0; i < grid.length; i += 2) {
        const u = grid[i];
        const v = grid[i + 1];
        let h = 0;
        let hx = 0;
        for (let k = 0; k < WAVES.length; k++) {
          const wv = WAVES[k];
          const arg = TAU * (wv.kx * u + wv.ky * v) + phases[k];
          h += wv.a * Math.sin(arg);
          hx += wv.a * wv.kx * Math.cos(arg);
        }
        const x = u * height + hx * amp * CONFIG.sway;
        const y = v * height - h * amp;
        ctx.fillRect(Math.round(x * dpr - half), Math.round(y * dpr - half), size, size);
      }
    }

    function loop(time) {
      draw(time);
      rafId = requestAnimationFrame(loop);
    }

    function start() {
      if (rafId !== null || reduceMotion.matches || !visible) return;
      rafId = requestAnimationFrame(loop);
    }

    function stop() {
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = null;
    }

    function refresh() {
      resize();
      if (reduceMotion.matches) { stop(); draw(0); } else { start(); }
    }

    new ResizeObserver(refresh).observe(canvas);
    // Nur animieren, solange die Sektion sichtbar ist
    new IntersectionObserver((entries) => {
      visible = entries[0].isIntersecting;
      if (visible) start(); else stop();
    }).observe(canvas);
    reduceMotion.addEventListener('change', refresh);
  }

  document.querySelectorAll('.netz-waves').forEach(init);
})();
