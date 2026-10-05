// quest-flyer v3 — 404 Game Quest
// HUD: параллакс-наклон цифр, живые координаты курсора, «загрузка уровня» с консолью, кнопка «назад».
// Flyers (только ПК): 12 белых Quest-логотипов — дрейф, разная «глубина», расталкивание,
// линии-связи, линии к курсору, шлейфы и ударная волна по клику.
(function () {
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ================= HUD ================= */
  function initHud() {
    const mark = document.getElementById('mark-404');
    const text = mark && mark.querySelector('.mark-404__text');
    const coord = document.getElementById('hud-coord');
    const back = document.getElementById('back-btn');

    if (back && window.history.length > 1) {
      back.hidden = false;
      back.addEventListener('click', () => window.history.back());
    }

    if (mark && !reduceMotion) {
      const pad = (n) => String(Math.round(n)).padStart(4, '0');
      let px = 0, py = 0, tx = 0, ty = 0, mx = 0, my = 0, ticking = false;

      window.addEventListener('pointermove', (e) => {
        mx = e.clientX; my = e.clientY;
        tx = (e.clientX / window.innerWidth - 0.5) * 2;
        ty = (e.clientY / window.innerHeight - 0.5) * 2;
        if (!ticking) {
          ticking = true;
          requestAnimationFrame(() => {
            ticking = false;
            if (coord) coord.textContent = `X:${pad(mx)} Y:${pad(my)}`;
          });
        }
      }, { passive: true });

      (function loop() {
        px += (tx - px) * 0.08;
        py += (ty - py) * 0.08;
        mark.style.setProperty('--px', px.toFixed(3));
        mark.style.setProperty('--py', py.toFixed(3));
        if (text) {
          text.style.setProperty('--ry', (px * 7).toFixed(2) + 'deg');
          text.style.setProperty('--rx', (py * -6).toFixed(2) + 'deg');
        }
        requestAnimationFrame(loop);
      })();
    }

    initStatus();
  }

  /* ============ «Загрузка уровня» ============ */
  function initStatus() {
    const box = document.getElementById('quest-status');
    const pct = document.getElementById('qs-pct');
    const bar = document.getElementById('qs-bar');
    if (!box || !pct || !bar) return;

    if (reduceMotion) {
      box.classList.add('is-failed');
      return;
    }

    bar.style.width = '0%';
    pct.textContent = '0%';
    const t0 = performance.now();
    (function fill(now) {
      const k = Math.min((now - t0) / 2400, 1);
      const v = Math.round(87 * (1 - Math.pow(1 - k, 3)));
      bar.style.width = v + '%';
      pct.textContent = v + '%';
      if (k < 1) return requestAnimationFrame(fill);
      box.classList.add('is-failed');
      pct.textContent = 'ERR';
    })(t0);
  }

  /* ================= Flyers ================= */
  function initFlyers() {
    const field = document.getElementById('quest-flyer');
    if (!field) return;
    // Только на ПК (см. @media в quest-flyer.css)
    if (!window.matchMedia('(min-width: 1025px)').matches) return;

    const SRC = field.dataset.src || 'assets/icons/Quest.svg';
    const SIZES = [28, 34, 40, 46, 52, 58, 64, 70, 76, 82, 88, 96]; // 12 штук
    const MAXS = SIZES[SIZES.length - 1];
    const ACCENT = '209, 240, 93';
    const BASE_SPEED = 1.0;
    const EDGE_ZONE = 150;
    const LINK_DIST = 230;
    const MOUSE_R = 170;
    const MOUSE_LINK = 210;
    const BLAST_R = 440;
    const TAU = Math.PI * 2;

    const canvas = document.createElement('canvas');
    field.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    let W = 0, H = 0;
    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();

    const mouse = { x: -9999, y: -9999 };
    window.addEventListener('pointermove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });
    document.documentElement.addEventListener('mouseleave', () => { mouse.x = mouse.y = -9999; });

    const flyers = SIZES.map((size, i) => {
      const d = size / MAXS; // «глубина»: маленькие — дальше, медленнее и тусклее
      const el = document.createElement('div');
      el.className = 'qf';
      el.style.width = el.style.height = size + 'px';
      el.style.opacity = (0.4 + 0.6 * d).toFixed(2);

      const img = new Image();
      img.className = 'qf__logo';
      img.src = SRC;
      img.alt = '';
      img.style.animationDelay = (-i * 0.31) + 's';
      el.appendChild(img);
      field.appendChild(el);

      return {
        el, size, d,
        x: Math.random() * Math.max(1, W - size),
        y: Math.random() * Math.max(1, H - size),
        vx: 0, vy: 0,
        heading: Math.random() * TAU,
        turn: 0,
        bank: 0,
        phase: Math.random() * 100,
        trail: []
      };
    });

    if (reduceMotion) {
      flyers.forEach((f) => { f.el.style.transform = `translate(${f.x}px, ${f.y}px)`; });
      return;
    }

    // Ударная волна по клику: логотипы отлетают, по холсту идёт кольцо
    const ripples = [];
    window.addEventListener('pointerdown', (e) => {
      ripples.push({ x: e.clientX, y: e.clientY, t: 0 });
      flyers.forEach((f) => {
        const dx = f.x + f.size / 2 - e.clientX;
        const dy = f.y + f.size / 2 - e.clientY;
        const dist = Math.hypot(dx, dy) || 1;
        if (dist < BLAST_R) {
          const force = (1 - dist / BLAST_R) * 11 * (0.6 + 0.4 * (1 - f.d));
          f.vx += (dx / dist) * force;
          f.vy += (dy / dist) * force;
        }
      });
    }, { passive: true });

    let last = performance.now();

    function step(now) {
      const dt = Math.min((now - last) / 16.667, 3);
      last = now;
      ctx.clearRect(0, 0, W, H);

      flyers.forEach((f, i) => {
        f.phase += dt;
        const cx = f.x + f.size / 2;
        const cy = f.y + f.size / 2;

        // 1. Плавное блуждание курса
        f.turn += (Math.random() - 0.5) * 0.006 * dt;
        f.turn *= Math.pow(0.97, dt);
        f.turn = clamp(f.turn, -0.022, 0.022);

        let steer = 0;

        // 2. Мягкий разворот у краёв
        const nearest = Math.min(cx, W - cx, cy, H - cy);
        if (nearest < EDGE_ZONE) {
          const k = 1 - nearest / EDGE_ZONE;
          const toCenter = wrap(Math.atan2(H / 2 - cy, W / 2 - cx) - f.heading);
          steer += clamp(toCenter * 0.05 * k * k, -0.05, 0.05);
        }

        // 3. Расталкивание: соседи и курсор
        const away = (px, py, radius, power) => {
          const dx = cx - px, dy = cy - py;
          const dist = Math.hypot(dx, dy);
          if (dist < radius && dist > 0.001) {
            const k = 1 - dist / radius;
            const diff = wrap(Math.atan2(dy, dx) - f.heading);
            steer += clamp(diff * power * k, -0.06, 0.06);
          }
        };
        flyers.forEach((g, j) => {
          if (j !== i) away(g.x + g.size / 2, g.y + g.size / 2, (f.size + g.size) / 2 + 60, 0.04);
        });
        away(mouse.x, mouse.y, MOUSE_R, 0.09);

        steer = clamp(steer, -0.08, 0.08);
        f.heading = wrap(f.heading + (f.turn + steer) * dt);

        // 4. Скорость «дышит» и зависит от глубины
        const speed = BASE_SPEED * (0.6 + 0.7 * f.d) *
          (1 + 0.26 * Math.sin(f.phase * 0.02) + 0.1 * Math.sin(f.phase * 0.047));
        f.x += (Math.cos(f.heading) * speed + f.vx) * dt;
        f.y += (Math.sin(f.heading) * speed + f.vy) * dt;
        const damp = Math.pow(0.93, dt);
        f.vx *= damp; f.vy *= damp;

        // Страховка у границ
        const maxX = W - f.size, maxY = H - f.size;
        if (f.x <= 0) { f.x = 0; f.vx = Math.abs(f.vx); f.heading = wrap(Math.PI - f.heading); }
        else if (f.x >= maxX) { f.x = maxX; f.vx = -Math.abs(f.vx); f.heading = wrap(Math.PI - f.heading); }
        if (f.y <= 0) { f.y = 0; f.vy = Math.abs(f.vy); f.heading = wrap(-f.heading); }
        else if (f.y >= maxY) { f.y = maxY; f.vy = -Math.abs(f.vy); f.heading = wrap(-f.heading); }

        // 5. Наклон в виражах (+ от импульса)
        const targetBank = clamp((f.turn + steer) * 600 + f.vx * 3, -22, 22);
        f.bank += (targetBank - f.bank) * Math.min(1, 0.08 * dt);
        f.el.style.transform = `translate(${f.x}px, ${f.y}px) rotate(${f.bank.toFixed(2)}deg)`;

        // 6. Шлейф: точка пути каждые ~3px
        const ncx = f.x + f.size / 2, ncy = f.y + f.size / 2;
        const lp = f.trail[0];
        if (!lp || Math.hypot(ncx - lp.x, ncy - lp.y) > 3) {
          f.trail.unshift({ x: ncx, y: ncy });
          if (f.trail.length > 24) f.trail.pop();
        }
      });

      // Шлейфы акцентным цветом, сужаются и гаснут
      ctx.lineCap = 'round';
      flyers.forEach((f) => {
        const n = f.trail.length;
        for (let j = 1; j < n; j++) {
          const t = 1 - j / n;
          ctx.strokeStyle = `rgba(${ACCENT}, ${(0.4 * f.d * t * t).toFixed(3)})`;
          ctx.lineWidth = 0.6 + f.d * 2.4 * t;
          ctx.beginPath();
          ctx.moveTo(f.trail[j - 1].x, f.trail[j - 1].y);
          ctx.lineTo(f.trail[j].x, f.trail[j].y);
          ctx.stroke();
        }
      });

      // Линии-связи между близкими логотипами и от логотипов к курсору
      ctx.lineWidth = 1;
      for (let a = 0; a < flyers.length; a++) {
        const A = flyers[a];
        const ax = A.x + A.size / 2, ay = A.y + A.size / 2;
        for (let b = a + 1; b < flyers.length; b++) {
          const B = flyers[b];
          const bx = B.x + B.size / 2, by = B.y + B.size / 2;
          const dist = Math.hypot(ax - bx, ay - by);
          if (dist < LINK_DIST) {
            ctx.strokeStyle = `rgba(${ACCENT}, ${((1 - dist / LINK_DIST) * 0.3).toFixed(3)})`;
            ctx.beginPath();
            ctx.moveTo(ax, ay);
            ctx.lineTo(bx, by);
            ctx.stroke();
          }
        }
        const md = Math.hypot(ax - mouse.x, ay - mouse.y);
        if (md < MOUSE_LINK) {
          ctx.strokeStyle = `rgba(255, 255, 255, ${((1 - md / MOUSE_LINK) * 0.28).toFixed(3)})`;
          ctx.beginPath();
          ctx.moveTo(ax, ay);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.stroke();
        }
      }

      // Кольца ударной волны
      for (let r = ripples.length - 1; r >= 0; r--) {
        const rp = ripples[r];
        rp.t += dt;
        if (rp.t > 55) { ripples.splice(r, 1); continue; }
        const k = rp.t / 55;
        ctx.strokeStyle = `rgba(${ACCENT}, ${((1 - k) * 0.55).toFixed(3)})`;
        ctx.lineWidth = 2 * (1 - k) + 0.5;
        ctx.beginPath();
        ctx.arc(rp.x, rp.y, 12 + k * BLAST_R * 0.55, 0, TAU);
        ctx.stroke();
      }

      requestAnimationFrame(step);
    }

    requestAnimationFrame(step);

    window.addEventListener('resize', () => {
      resize();
      flyers.forEach((f) => {
        f.x = Math.min(f.x, Math.max(0, W - f.size));
        f.y = Math.min(f.y, Math.max(0, H - f.size));
      });
    });
  }

  function init() {
    initHud();
    initFlyers();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
