// script_construction.js — мини-игра «Дракончик Game Quest»
(function () {
  // Бегущие статусы «сборки» раздела
  function status() {
    var el = document.getElementById('build-text');
    if (!el) return;
    var msgs = ['Собираем новости', 'Подключаем трейлеры', 'Полируем обзоры', 'Настраиваем подборки', 'Готовим сюрприз'];
    var i = 0;
    setInterval(function () {
      el.classList.add('is-out');
      setTimeout(function () { i = (i + 1) % msgs.length; el.textContent = msgs[i]; el.classList.remove('is-out'); }, 350);
    }, 2600);
  }

  function init() {
    status();
    var field = document.getElementById('game-field');
    var canvas = document.getElementById('game-canvas');
    var scoreEl = document.getElementById('game-score');
    var bestEl = document.getElementById('game-best');
    if (!field || !canvas) return;

    var ctx = canvas.getContext('2d');
    var AC = '#d1f05d', AC2 = '#b9e03f', DK = '#7fa317', RGB = '209,240,93';
    var FONT = getComputedStyle(document.body).fontFamily;
    var W, H, K, G, state = 'idle', score = 0, best = 0, speed = 60, t = 0, last = 0, raf = 0;
    var deadAt = 0, shake = 0, newRec = false, emit = 0, scroll = 0;
    var d = { y: 0, vy: 0, jumps: 0, run: 0 };
    var obs = [], parts = [], stars = [];

    try { best = Number(localStorage.getItem('gq_dragon_best')) || 0; } catch (e) {}
    bestEl.textContent = best;

    function resize() {
      var dpr = window.devicePixelRatio || 1;
      W = canvas.clientWidth; H = canvas.clientHeight; K = Math.min(1.5, H / 190); G = H - 12;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      stars = [];
      for (var i = 0; i < Math.round(W / 16); i++) {
        stars.push({ x: Math.random() * W, y: Math.random() * H * 0.6, r: Math.random() * 1.3 + 0.3, p: Math.random() * 6 });
      }
    }

    function reset() {
      score = 0; speed = 290; obs = []; parts = []; d.y = 0; d.vy = 0; d.jumps = 0;
      newRec = false; scoreEl.textContent = 0;
    }

    function burst(x, y, n, spread, up) {
      for (var i = 0; i < n; i++) {
        var a = Math.random() * Math.PI * 2, v = (0.4 + Math.random()) * spread;
        parts.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - up, life: 1, r: (1 + Math.random() * 2.2) * K });
      }
    }

    function action() {
      var now = performance.now();
      if (state === 'idle' || (state === 'dead' && now - deadAt > 400)) {
        reset(); state = 'run'; return;
      }
      if (state === 'paused') { state = 'run'; return; }
      if (state !== 'run') return;
      if (d.jumps < 2) {
        d.vy = d.jumps === 0 ? -640 * K : -560 * K;
        if (d.jumps === 0) burst(DX() - 6 * K, G, 8, 60 * K, 20); else burst(DX(), G + d.y - 18 * K, 14, 90 * K, 0);
        d.jumps++;
      }
    }

    function DX() { return 84 * K; }

    function update(dt) {
      t += dt;
      if (state === 'run') {
        speed = Math.min(620, speed + 7 * dt);
        score += dt * speed * 0.03;
        scoreEl.textContent = Math.floor(score);
        d.run += dt;
        var air = d.y < 0 || d.vy < 0;
        d.vy += 1900 * K * dt; d.y += d.vy * dt;
        if (d.y >= 0) { if (air && d.jumps) burst(DX(), G, 6, 50 * K, 10); d.y = 0; d.vy = 0; d.jumps = 0; }
        var lo = obs[obs.length - 1];
        if (!lo || lo.x + lo.w < W - (speed * 0.7 + 150 * K + Math.random() * 200 * K)) {
          var n = Math.random() < 0.35 ? 2 : 1, w = (22 + Math.random() * 8) * K * n;
          obs.push({ x: W + 30, w: w, h: (34 + Math.random() * 24) * K, n: n });
        }
        obs.forEach(function (o) { o.x -= speed * dt; });
        obs = obs.filter(function (o) { return o.x + o.w > -20; });
        emit -= dt;
        if (emit <= 0 && d.y === 0) { emit = 0.07; parts.push({ x: DX() - 16 * K, y: G - 2, vx: -speed * 0.2, vy: -15, life: 0.7, r: 1.8 * K }); }
        for (var i = 0; i < obs.length; i++) {
          var o = obs[i];
          if (o.x + o.w * 0.15 < DX() + 24 * K && o.x + o.w * 0.85 > DX() - 16 * K && -d.y < o.h * 0.78) { return die(); }
        }
      } else if (state === 'idle' || state === 'paused') {
        speed = 60;
      }
      scroll += (state === 'dead' ? 0 : speed) * dt;
      parts.forEach(function (p) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 220 * dt; p.life -= dt * 1.6; });
      parts = parts.filter(function (p) { return p.life > 0; });
      shake = Math.max(0, shake - dt * 30);
    }

    function die() {
      state = 'dead'; deadAt = performance.now(); shake = 10;
      burst(DX(), G + d.y - 22 * K, 30, 150 * K, 40);
      var s = Math.floor(score);
      if (s > best) {
        best = s; newRec = true; bestEl.textContent = best;
        try { localStorage.setItem('gq_dragon_best', best); } catch (e) {}
      }
    }

    // ---------- Отрисовка ----------
    function mountains(par, amp, alpha) {
      ctx.beginPath(); ctx.moveTo(0, G);
      for (var x = 0; x <= W + 8; x += 8) {
        var s = (x + scroll * par);
        var h = (Math.sin(s * 0.011) + Math.sin(s * 0.027 + 1.7) * 0.6 + 1.6) / 3.2;
        ctx.lineTo(x, G - 14 * K - h * amp * K);
      }
      ctx.lineTo(W, G); ctx.closePath();
      ctx.fillStyle = 'rgba(' + RGB + ',' + alpha + ')'; ctx.fill();
    }

    function crystal(x, w, h) {
      var g = ctx.createLinearGradient(0, G - h, 0, G);
      g.addColorStop(0, 'rgba(' + RGB + ',.95)'); g.addColorStop(1, 'rgba(' + RGB + ',.15)');
      ctx.beginPath();
      ctx.moveTo(x, G); ctx.lineTo(x + w * 0.12, G - h * 0.55); ctx.lineTo(x + w / 2, G - h);
      ctx.lineTo(x + w * 0.88, G - h * 0.55); ctx.lineTo(x + w, G); ctx.closePath();
      ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = AC; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + w / 2, G - h); ctx.lineTo(x + w * 0.38, G); ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.stroke();
    }

    function wing(a, alpha) {
      ctx.save(); ctx.translate(-2, -34); ctx.rotate(a);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-34, -14);
      ctx.quadraticCurveTo(-24, -12, -22, -28); ctx.quadraticCurveTo(-12, -22, -6, -42);
      ctx.quadraticCurveTo(-2, -20, 0, 0); ctx.closePath();
      ctx.fillStyle = 'rgba(' + RGB + ',' + alpha + ')'; ctx.fill();
      ctx.strokeStyle = AC; ctx.lineWidth = 1.4; ctx.stroke();
      ctx.restore();
    }

    function leg(lx, off, lift) {
      ctx.beginPath(); ctx.moveTo(lx, -14); ctx.lineTo(lx + off, -3 - lift);
      ctx.strokeStyle = DK; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.stroke();
    }

    function dragon() {
      var air = d.y < -1, dead = state === 'dead';
      var x = DX(), yb = G + d.y;
      // тень на земле
      var sh = Math.max(0.25, 1 + d.y / (120 * K));
      ctx.fillStyle = 'rgba(0,0,0,.35)';
      ctx.beginPath(); ctx.ellipse(x, G + 2, 22 * K * sh, 3.5 * K * sh, 0, 0, 7); ctx.fill();

      ctx.save(); ctx.translate(x, yb); ctx.scale(K, K);
      if (dead) ctx.rotate(0.3);
      var bob = air || state !== 'run' ? Math.sin(t * 3) * 1.2 : -Math.abs(Math.sin(d.run * 14)) * 2.5;
      ctx.translate(0, bob);
      ctx.shadowColor = 'rgba(' + RGB + ',.5)'; ctx.shadowBlur = 14;

      var flap = air ? Math.sin(t * 20) * 0.75 - 0.15 : Math.sin(t * (state === 'run' ? 11 : 4)) * 0.22;
      wing(flap * 0.8 - 0.35, 0.28);

      var p = Math.sin(d.run * 14);
      if (air || state !== 'run') { leg(-7, -7, 2); leg(10, -4, 4); }
      else { leg(-7, p * 8, Math.max(0, -p) * 5); leg(10, -p * 8, Math.max(0, p) * 5); }

      var wag = Math.sin(t * 9) * 5;
      ctx.fillStyle = AC2;
      ctx.beginPath(); ctx.moveTo(-14, -26); ctx.quadraticCurveTo(-34, -26 + wag * 0.5, -52, -36 + wag);
      ctx.quadraticCurveTo(-34, -13, -12, -13); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-50, -34 + wag); ctx.lineTo(-62, -41 + wag); ctx.lineTo(-56, -29 + wag); ctx.closePath(); ctx.fill();

      var bg = ctx.createLinearGradient(0, -38, 0, -10);
      bg.addColorStop(0, AC); bg.addColorStop(1, AC2);
      ctx.fillStyle = bg;
      ctx.beginPath(); ctx.ellipse(0, -24, 22, 13, 0, 0, 7); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255,255,255,.22)';
      ctx.beginPath(); ctx.ellipse(4, -18, 15, 5.5, 0, 0, 7); ctx.fill();

      ctx.beginPath(); ctx.moveTo(10, -28); ctx.lineTo(25, -43);
      ctx.strokeStyle = AC; ctx.lineWidth = 12; ctx.lineCap = 'round'; ctx.stroke();
      ctx.fillStyle = AC2;
      [-14, -6, 2, 10].forEach(function (sx, i) {
        ctx.beginPath(); ctx.moveTo(sx - 3, -35.5); ctx.lineTo(sx, -42 - (i % 2) * 2); ctx.lineTo(sx + 3, -36.5); ctx.fill();
      });
      ctx.beginPath(); ctx.moveTo(18, -51); ctx.lineTo(8, -59); ctx.lineTo(24, -54); ctx.fill();
      ctx.beginPath(); ctx.moveTo(24, -52); ctx.lineTo(16, -63); ctx.lineTo(30, -55); ctx.fill();
      ctx.fillStyle = AC;
      ctx.beginPath(); ctx.ellipse(29, -45, 11, 8, -0.15, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.ellipse(39, -42, 9, 5.2, 0.1, 0, 7); ctx.fill();
      ctx.fillStyle = DK; ctx.beginPath(); ctx.arc(44, -44, 1.2, 0, 7); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(30, -48, 3, 0, 7); ctx.fill();
      ctx.fillStyle = '#0d0f08';
      if (dead) { ctx.fillRect(28.5, -49, 3, 1.2); } else { ctx.beginPath(); ctx.arc(31, -48, 1.5, 0, 7); ctx.fill(); }

      ctx.shadowColor = 'rgba(' + RGB + ',.5)'; ctx.shadowBlur = 10;
      wing(flap - 0.1, 0.5);
      ctx.restore();
    }

    function overlay() {
      if (state === 'run') return;
      ctx.fillStyle = 'rgba(10,11,7,.5)'; ctx.fillRect(0, 0, W, H);
      ctx.textAlign = 'center'; ctx.fillStyle = AC;
      var big = Math.max(14, Math.min(24, Math.round(H / 9))), small = Math.round(big * 0.7);
      var title = state === 'dead' ? 'Игра окончена' : state === 'paused' ? 'Пауза' : 'Тапни, чтобы начать';
      ctx.font = '800 ' + big + 'px ' + FONT; ctx.fillText(title, W / 2, H * 0.38);
      ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.font = '700 ' + small + 'px ' + FONT;
      var sub = state === 'dead' ? (newRec ? 'Новый рекорд: ' + Math.floor(score) : 'Счёт: ' + Math.floor(score) + ' · тапни ещё раз')
        : 'Двойной тап в воздухе — двойной прыжок';
      ctx.fillText(sub, W / 2, H * 0.38 + big * 1.2);
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      ctx.save();
      if (shake > 0) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
      stars.forEach(function (s) {
        ctx.globalAlpha = 0.25 + 0.5 * Math.abs(Math.sin(t * 1.5 + s.p));
        ctx.fillStyle = '#fff'; ctx.fillRect(s.x, s.y, s.r, s.r);
      });
      ctx.globalAlpha = 1;
      mountains(0.12, 46, 0.05); mountains(0.3, 28, 0.09);
      ctx.strokeStyle = 'rgba(' + RGB + ',.2)'; ctx.lineWidth = 1.5;
      for (var i = 0; i < 8; i++) {
        var px = (i * 120 - scroll) % (W + 120); if (px < 0) px += W + 120;
        ctx.beginPath(); ctx.moveTo(px, G + 5); ctx.lineTo(px + 34, G + 5); ctx.stroke();
      }
      ctx.shadowColor = 'rgba(' + RGB + ',.6)'; ctx.shadowBlur = 12;
      obs.forEach(function (o) {
        var cw = o.w / o.n;
        for (var k = 0; k < o.n; k++) crystal(o.x + k * cw, cw, o.h * (k ? 0.72 : 1));
      });
      ctx.shadowBlur = 0;
      parts.forEach(function (p) {
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = AC; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill();
      });
      ctx.globalAlpha = 1;
      dragon();
      ctx.restore();
      overlay();
    }

    function loop(now) {
      var dt = Math.min((now - last) / 1000, 0.04); last = now;
      if (W > 0 && H > 0) { update(dt); draw(); }
      raf = requestAnimationFrame(loop);
    }
    function start() { cancelAnimationFrame(raf); last = performance.now(); raf = requestAnimationFrame(loop); }

    field.addEventListener('pointerdown', function (e) { e.preventDefault(); action(); });
    document.addEventListener('keydown', function (e) {
      if ((e.code === 'Space' || e.code === 'ArrowUp') && document.activeElement === document.body) {
        e.preventDefault(); action();
      }
    });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { cancelAnimationFrame(raf); if (state === 'run') state = 'paused'; }
      else start();
    });
    if (window.ResizeObserver) { new ResizeObserver(resize).observe(field); } else { window.addEventListener('resize', resize); }

    resize(); reset(); start();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
