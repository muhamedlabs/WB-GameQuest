// script_construction.js — мини-игра «Дракончик Game Quest»
(function () {
  // Вступительная заставка: загрузка -> шторки -> появление страницы
  function preloader() {
    var root = document.documentElement;
    var pre = document.getElementById('preloader');
    if (!pre) { root.classList.add('ready'); return; }
    var pct = document.getElementById('pre-pct');
    var line = pre.querySelector('.pre__line span');
    var calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var MIN = calm ? 700 : 2400, MAX = 6500, t0 = Date.now(), loaded = document.readyState === 'complete';
    window.addEventListener('load', function () { loaded = true; });
    var timer = setInterval(function () {
      var el = Date.now() - t0, x = Math.min(1, el / MIN), p = x * x * (3 - 2 * x) * 100;
      if (!loaded && el < MAX) p = Math.min(p, 96);
      pct.textContent = Math.floor(p) + '%';
      line.style.setProperty('--pp', (p / 100).toFixed(3));
      if (p >= 100) {
        clearInterval(timer);
        pre.classList.add('is-done');
        setTimeout(function () { root.classList.add('ready'); }, calm ? 0 : 380);
        setTimeout(function () { pre.remove(); }, 1600);
      }
    }, 40);
  }

  // Бесконечная «загрузка» раздела: быстро растёт, потом ползёт и никогда не доходит до 100%
  function progress() {
    var textEl = document.getElementById('build-text');
    var pctEl = document.getElementById('build-pct');
    var bar = document.querySelector('.build__track span');
    if (!textEl || !bar) return;
    var steps = [[0, 'Собираем новости'], [18, 'Подключаем трейлеры'], [38, 'Полируем обзоры'],
      [58, 'Настраиваем подборки'], [78, 'Проверяем всё на прочность']];
    var tail = ['Финальные штрихи', 'Шлифуем детали', 'Ещё чуть-чуть', 'Почти готово'];
    var start = Date.now(), cur = '';
    function setText(msg) {
      if (msg === cur) return;
      var first = cur === ''; cur = msg;
      if (first) { textEl.textContent = msg; return; }
      textEl.classList.add('is-out');
      setTimeout(function () { textEl.textContent = msg; textEl.classList.remove('is-out'); }, 300);
    }
    setInterval(function () {
      var el = Date.now() - start;
      var p = 99.4 * (1 - Math.exp(-el / 14000));
      bar.style.setProperty('--p', (p / 100).toFixed(4));
      pctEl.textContent = Math.min(99, Math.floor(p)) + '%';
      if (p < 90) {
        var m = steps[0][1];
        steps.forEach(function (s) { if (p >= s[0]) m = s[1]; });
        setText(m);
      } else {
        setText(tail[Math.floor((el - 30000) / 3500) % tail.length]);
      }
    }, 120);
  }

  // Музыка для игры: бит и мелодия синтезируются прямо в браузере (Web Audio), файлы не нужны
  function music(btn) {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!btn) return;
    if (!AC) { btn.hidden = true; return; }
    var ac, master, noiseBuf, timer = null, step = 0, next = 0, on = false;
    var BPM = 112, S = 60 / BPM / 4;
    var BASS = [55, 43.65, 65.41, 49];
    var CH = [[220, 261.63, 329.63], [174.61, 220, 261.63], [261.63, 329.63, 392], [196, 246.94, 293.66]];
    var ARP = [0, 1, 2, 1, 2, 1, 0, 1];

    function setup() {
      ac = new AC();
      var comp = ac.createDynamicsCompressor();
      var lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 5200;
      master = ac.createGain(); master.gain.value = 0;
      master.connect(lp); lp.connect(comp); comp.connect(ac.destination);
      noiseBuf = ac.createBuffer(1, ac.sampleRate * 0.5, ac.sampleRate);
      var data = noiseBuf.getChannelData(0);
      for (var i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    function tone(t, f, dur, type, vol) {
      var o = ac.createOscillator(), g = ac.createGain();
      o.type = type; o.frequency.setValueAtTime(f, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
    }
    function kick(t) {
      var o = ac.createOscillator(), g = ac.createGain();
      o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.13);
      g.gain.setValueAtTime(0.9, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
      o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.3);
    }
    function hit(t, dur, hp, vol) {
      var s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
      s.buffer = noiseBuf; f.type = 'highpass'; f.frequency.value = hp;
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + dur + 0.02);
    }
    function play(s, t) {
      var bar = (s >> 4) & 3, i = s & 15;
      if (i % 4 === 0) kick(t);
      if (i === 4 || i === 12) { hit(t, 0.16, 1800, 0.38); tone(t, 190, 0.1, 'triangle', 0.22); }
      if (i % 2 === 0) hit(t, 0.04, 7000, i % 4 === 2 ? 0.2 : 0.1);
      if (i % 2 === 0) tone(t, BASS[bar] * (i % 8 === 6 ? 2 : 1), S * 1.7, 'sawtooth', 0.2);
      if (i % 2 === 0) tone(t, CH[bar][ARP[(i >> 1) % 8]] * (i >= 8 ? 2 : 1), S * 1.6, 'square', 0.045);
    }
    function schedule() {
      while (next < ac.currentTime + 0.12) { play(step, next); next += S; step = (step + 1) % 64; }
    }
    function start() {
      if (!ac) setup();
      ac.resume();
      var n = ac.currentTime;
      next = n + 0.05; step = 0;
      clearInterval(timer); timer = setInterval(schedule, 25);
      master.gain.cancelScheduledValues(n); master.gain.setValueAtTime(master.gain.value, n);
      master.gain.linearRampToValueAtTime(0.5, n + 0.3);
    }
    function stop() {
      var n = ac.currentTime;
      master.gain.cancelScheduledValues(n); master.gain.setValueAtTime(master.gain.value, n);
      master.gain.linearRampToValueAtTime(0, n + 0.25);
      setTimeout(function () { if (!on) { clearInterval(timer); timer = null; } }, 320);
    }
    // Кнопка музыки — только для мыши/тапа: фокус на ней не остаётся, пробел и стрелки управляют игрой
    btn.addEventListener('mousedown', function (e) { e.preventDefault(); });
    btn.addEventListener('click', function () {
      on = !on;
      if (on) start(); else stop();
      btn.classList.toggle('is-on', on);
      btn.setAttribute('aria-pressed', String(on));
      btn.setAttribute('aria-label', on ? 'Выключить музыку' : 'Включить музыку');
      btn.title = on ? 'Выключить музыку' : 'Включить музыку';
      btn.blur();
    });
    document.addEventListener('visibilitychange', function () {
      if (!ac || !on) return;
      if (document.hidden) ac.suspend(); else ac.resume();
    });
  }

  function init() {
    preloader();
    progress();
    var field = document.getElementById('game-field');
    var canvas = document.getElementById('game-canvas');
    var scoreEl = document.getElementById('game-score');
    var bestEl = document.getElementById('game-best');
    if (!field || !canvas) return;
    music(document.getElementById('game-music'));

    var ctx = canvas.getContext('2d');
    var AC = '#d1f05d', AC2 = '#b9e03f', DK = '#7fa317', RGB = '209,240,93';
    var FONT = getComputedStyle(document.body).fontFamily;
    var W, H, K, G, state = 'idle', score = 0, best = 0, speed = 60, t = 0, last = 0, raf = 0;
    var deadAt = 0, shake = 0, newRec = false, emit = 0, scroll = 0;
    var d = { y: 0, vy: 0, jumps: 0, run: 0, duck: false }, nextGap = 0;
    var obs = [], gems = [], pows = [], parts = [], stars = [], sstars = [];
    var slow = 0, mag = 0, lastMs = 0, toast = null;

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
      score = 0; speed = 290; obs = []; gems = []; parts = []; d.y = 0; d.vy = 0; d.jumps = 0; d.duck = false; d.shield = false; nextGap = 200 * K;
      pows = []; slow = 0; mag = 0; lastMs = 0; toast = null;
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

    function dragonBox() {
      var ch = (d.duck ? 34 : 50) * K, db = G + d.y;
      return { x1: DX() - 16 * K, x2: DX() + (d.duck ? 32 : 24) * K, t: db - ch, b: db };
    }

    function spawn() {
      var list = [['crystal', 4]];
      if (score > 35) list.push(['bat', 3]);
      if (score > 50) list.push(['spire', 2]);
      if (score > 90) list.push(['ridge', 2]);
      if (score > 150) list.push(['rock', 2]);
      var sum = 0, type = 'crystal', q, i;
      list.forEach(function (l) { sum += l[1]; });
      q = Math.random() * sum;
      for (i = 0; i < list.length; i++) { q -= list[i][1]; if (q <= 0) { type = list[i][0]; break; } }
      var lo = obs[obs.length - 1];
      if (type === 'rock' && lo && lo.x + lo.w > W * 0.4) type = 'crystal';
      if (type === 'bat' && lo && lo.type === 'bat') type = 'crystal';
      var o = { x: W + 30, type: type, v: 1, ph: Math.random() * 6, bot: 0, f: [1], n: 1 };
      if (type === 'crystal') { o.n = Math.random() < 0.35 ? 2 : 1; o.w = (22 + Math.random() * 8) * K * o.n; o.h = (34 + Math.random() * 24) * K; o.f = [1, 0.72]; o.top = o.h * 0.78; }
      else if (type === 'spire') { o.w = 20 * K; o.h = (66 + Math.random() * 14) * K; o.top = o.h * 0.8; }
      else if (type === 'ridge') { o.n = 4; o.w = 80 * K; o.h = (26 + Math.random() * 8) * K; o.f = [0.8, 1, 0.65, 0.9]; o.top = o.h * 0.85; }
      else if (type === 'rock') { var rr = (15 + Math.random() * 6) * K; o.w = 2 * rr; o.h = 2 * rr; o.v = 1.35; o.rot = 0; o.top = o.h * 0.8; }
      else { o.w = 36 * K; o.h = 22 * K; o.bot = 40 * K; o.top = o.bot + o.h; }
      if ((type === 'crystal' || type === 'ridge') && Math.random() < 0.5) {
        for (i = 0; i < 3; i++) gems.push({ x: o.x + o.w / 2 + (i - 1) * 26 * K, y: Math.min(o.top + 28 * K, 100 * K), ph: Math.random() * 6 });
      }
      nextGap = speed * 0.7 + 150 * K + Math.random() * 200 * K + (type === 'rock' ? speed * 0.3 : 0);
      if (score > 25 && type !== 'rock' && Math.random() < 0.14) {
        var kinds = ['shield', 'shield', 'slow', 'slow', 'mag'];
        pows.push({ type: kinds[Math.floor(Math.random() * kinds.length)], x: o.x + o.w + nextGap * 0.5, y: 42 * K, ph: Math.random() * 6 });
      }
      obs.push(o);
    }

    function update(dt) {
      t += dt;
      if (state === 'run') {
        speed = Math.min(620, speed + 7 * dt);
        score += dt * speed * 0.03;
        d.run += dt;
        slow = Math.max(0, slow - dt); mag = Math.max(0, mag - dt);
        var mv = speed * (slow > 0 ? 0.62 : 1);
        var air = d.y < 0 || d.vy < 0;
        d.vy += 1900 * K * (d.duck && air ? 2.4 : 1) * dt; d.y += d.vy * dt;
        if (d.y >= 0) { if (air && d.jumps) burst(DX(), G, 6, 50 * K, 10); d.y = 0; d.vy = 0; d.jumps = 0; }
        var lo = obs[obs.length - 1];
        if (!lo || lo.x + lo.w < W - nextGap) spawn();
        obs.forEach(function (o) {
          o.x -= mv * o.v * dt;
          if (o.type === 'rock') o.rot -= mv * o.v * dt / (o.w / 2);
        });
        gems.forEach(function (g) {
          g.x -= mv * dt;
          if (mag > 0 && Math.abs(DX() - g.x) < 240 * K) {
            g.x += Math.sign(DX() - g.x) * 420 * K * dt;
            g.y += ((-d.y + 24 * K) - g.y) * Math.min(1, 6 * dt);
          }
        });
        pows.forEach(function (q) { q.x -= mv * dt; });
        obs = obs.filter(function (o) { return o.x + o.w > -20; });
        gems = gems.filter(function (g) { return g.x > -20; });
        pows = pows.filter(function (q) { return q.x > -30; });
        emit -= dt;
        if (emit <= 0 && d.y === 0) { emit = d.duck ? 0.035 : 0.07; parts.push({ x: DX() - 16 * K, y: G - 2, vx: -speed * 0.2, vy: -15, life: 0.7, r: 1.8 * K }); }
        var b = dragonBox(), i;
        for (i = 0; i < obs.length; i++) {
          var o = obs[i];
          if (o.x + o.w * 0.15 < b.x2 && o.x + o.w * 0.85 > b.x1 && b.t < G - o.bot && b.b > G - o.top) {
            if (d.shield) { d.shield = false; shake = 8; burst(o.x + o.w / 2, G - o.top / 2, 18, 140 * K, 20); obs.splice(i, 1); i--; continue; }
            return die();
          }
        }
        for (i = gems.length - 1; i >= 0; i--) {
          var g = gems[i], gy = G - g.y, r = 9 * K;
          if (g.x > b.x1 - r && g.x < b.x2 + r && gy > b.t - r && gy < b.b + r) {
            gems.splice(i, 1); score += 5; burst(g.x, gy, 8, 80 * K, 10);
          }
        }
        for (i = pows.length - 1; i >= 0; i--) {
          var q = pows[i], qy = G - q.y, rq = 12 * K;
          if (q.x > b.x1 - rq && q.x < b.x2 + rq && qy > b.t - rq && qy < b.b + rq) {
            pows.splice(i, 1); burst(q.x, qy, 14, 110 * K, 10);
            if (q.type === 'shield') d.shield = true; else if (q.type === 'slow') slow = 6; else mag = 7;
          }
        }
        var ms = Math.floor(score / 100);
        if (ms > lastMs) { lastMs = ms; toast = { text: String(ms * 100), life: 1.2 }; burst(W / 2, H * 0.3, 16, 120 * K, 20); }
        scoreEl.textContent = Math.floor(score);
      } else if (state === 'idle' || state === 'paused') {
        speed = 60;
      }
      scroll += (state === 'dead' ? 0 : speed * (slow > 0 ? 0.62 : 1)) * dt;
      if (toast) { toast.life -= dt; if (toast.life <= 0) toast = null; }
      if (Math.random() < dt * 0.25) sstars.push({ x: Math.random() * W * 0.8, y: Math.random() * H * 0.3, life: 1 });
      sstars.forEach(function (s) { s.x += 300 * dt; s.y += 110 * dt; s.life -= dt * 1.5; });
      sstars = sstars.filter(function (s) { return s.life > 0; });
      parts.forEach(function (p) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 220 * dt; p.life -= dt * 1.6; });
      parts = parts.filter(function (p) { return p.life > 0; });
      shake = Math.max(0, shake - dt * 30);
    }

    function die() {
      state = 'dead'; deadAt = performance.now(); shake = 10; d.duck = false;
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

    function bubble(x, yb, D) {
      if (!d.shield || state === 'dead') return;
      ctx.strokeStyle = 'rgba(' + RGB + ',' + (0.55 + 0.3 * Math.sin(t * 6)) + ')'; ctx.lineWidth = 2;
      ctx.fillStyle = 'rgba(' + RGB + ',.1)';
      ctx.beginPath(); ctx.arc(x + (D ? 6 * K : 0), yb - (D ? 15 : 24) * K, (D ? 36 : 42) * K, 0, 7); ctx.fill(); ctx.stroke();
    }

    function paw(px, py, c) {
      ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(px, py, 7, 3.2, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#f4ffc4';
      for (var k = 0; k < 3; k++) {
        ctx.beginPath(); ctx.moveTo(px + 5.5, py - 1.8 + k * 1.6); ctx.lineTo(px + 9, py - 0.8 + k * 1.6); ctx.lineTo(px + 5.5, py + k * 1.6); ctx.closePath(); ctx.fill();
      }
    }

    // Подробная поза «прижался к земле»: ползёт, голова опущена, взгляд сосредоточенный
    function crouch(running) {
      var ph = d.run * 22, w1 = Math.sin(t * 7) * 2, w2 = Math.sin(t * 7 + 1) * 3;
      var br = 10.5 + Math.sin(t * 9) * 0.5, i;
      var offA = running ? Math.sin(ph) * 3 : 0, offB = running ? -Math.sin(ph) * 3 : 0;
      ctx.shadowColor = 'rgba(' + RGB + ',.45)'; ctx.shadowBlur = 12;
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';

      // линии скорости позади
      if (running) {
        ctx.save(); ctx.shadowBlur = 0; ctx.lineWidth = 1.6;
        for (i = 0; i < 3; i++) {
          var lx = -58 - ((t * 260 + i * 17) % 34);
          ctx.strokeStyle = 'rgba(' + RGB + ',' + (0.4 - i * 0.1) + ')';
          ctx.beginPath(); ctx.moveTo(lx, -6 - i * 6); ctx.lineTo(lx - 14, -6 - i * 6); ctx.stroke();
        }
        ctx.restore();
      }

      // хвост с шипами и «лопаткой»
      ctx.fillStyle = AC2;
      ctx.beginPath(); ctx.moveTo(-14, -18); ctx.quadraticCurveTo(-32, -14 + w1, -50, -9 + w2);
      ctx.quadraticCurveTo(-32, -4 + w1 * 0.5, -14, -6); ctx.closePath(); ctx.fill();
      ctx.fillStyle = DK;
      [[-24, -15.7 + w1 * 0.4], [-34, -13.2 + w1 * 0.49 + w2 * 0.31], [-43, -10.9 + w1 * 0.31 + w2 * 0.65]].forEach(function (s) {
        ctx.beginPath(); ctx.moveTo(s[0] - 3, s[1] + 2); ctx.lineTo(s[0], s[1] - 4.5); ctx.lineTo(s[0] + 3, s[1] + 2); ctx.closePath(); ctx.fill();
      });
      ctx.beginPath(); ctx.moveTo(-49, -9 + w2); ctx.lineTo(-58, -14 + w2); ctx.lineTo(-57, -3.5 + w2); ctx.closePath(); ctx.fill();

      // дальние лапы
      paw(-2 + offA, -3, DK);
      ctx.strokeStyle = DK; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(15, -11); ctx.lineTo(22 + offB, -4); ctx.stroke();
      paw(23 + offB, -3, DK);

      // тело
      var bg = ctx.createLinearGradient(0, -26, 0, -4);
      bg.addColorStop(0, AC); bg.addColorStop(1, AC2);
      ctx.fillStyle = bg; ctx.beginPath(); ctx.ellipse(3, -14, 21, br, 0, 0, 7); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(244,255,196,.6)'; ctx.beginPath(); ctx.ellipse(7, -9.5, 13, 5, 0, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(127,163,23,.45)'; ctx.lineWidth = 1;
      for (i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(7 + i * 5, -13.5); ctx.lineTo(7 + i * 5 + 0.5, -5.5); ctx.stroke(); }
      ctx.fillStyle = DK;
      [[-14, -20.2], [-8, -22.9], [-2, -24.2], [4, -24.5], [10, -23.9]].forEach(function (s) {
        ctx.beginPath(); ctx.moveTo(s[0] - 3, s[1] + 1.5); ctx.lineTo(s[0], s[1] - 5); ctx.lineTo(s[0] + 3, s[1] + 1.5); ctx.closePath(); ctx.fill();
      });

      // сложенное крыло с «пальцами»
      var fl = Math.sin(t * 9) * 0.8;
      ctx.beginPath(); ctx.moveTo(6, -22); ctx.lineTo(-5, -28.5 + fl); ctx.lineTo(-22, -24 + fl * 0.5);
      ctx.quadraticCurveTo(-15, -22, -17, -19.5); ctx.quadraticCurveTo(-10, -20, -11, -17.5); ctx.quadraticCurveTo(-5, -19.5, 3, -17.5); ctx.closePath();
      ctx.fillStyle = 'rgba(244,255,196,.93)'; ctx.fill();
      ctx.strokeStyle = AC2; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.lineWidth = 0.9; ctx.beginPath();
      ctx.moveTo(-5, -28.5 + fl); ctx.lineTo(-17, -19.5); ctx.moveTo(-5, -28.5 + fl); ctx.lineTo(-11, -17.5); ctx.stroke();

      // ближние лапы: бедро + стопа сзади, передняя лапа вперёд
      ctx.fillStyle = AC2; ctx.beginPath(); ctx.ellipse(-7, -9, 9, 7.5, 0, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.14)'; ctx.beginPath(); ctx.ellipse(-8.5, -11.5, 4.5, 2.6, -0.3, 0, 7); ctx.fill();
      paw(2 + offB, -3, DK);
      ctx.strokeStyle = AC2; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(14, -11); ctx.lineTo(26 + offA, -4.5); ctx.stroke();
      paw(27 + offA, -3, DK);

      // шея и голова, опущенная вперёд
      ctx.strokeStyle = AC; ctx.lineWidth = 14; ctx.beginPath(); ctx.moveTo(13, -16); ctx.lineTo(28, -17); ctx.stroke();
      ctx.fillStyle = '#f4ffc4';
      ctx.beginPath(); ctx.moveTo(25, -28); ctx.lineTo(14, -31); ctx.lineTo(29, -30.5); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(30, -28.5); ctx.lineTo(22, -33.5); ctx.lineTo(34, -29); ctx.closePath(); ctx.fill();
      ctx.fillStyle = AC;
      ctx.beginPath(); ctx.arc(31, -17, 12.5, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.ellipse(41, -14.5, 8, 5.8, 0, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(255,150,130,.38)'; ctx.beginPath(); ctx.ellipse(31, -11.5, 3, 1.8, 0, 0, 7); ctx.fill();

      // сосредоточенный взгляд: приспущенное веко
      var blink = (t % 3.4) < 0.12;
      if (!blink) {
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(34.5, -19, 4.2, 3.6, 0, 0, 7); ctx.fill();
        ctx.fillStyle = '#0d0f08'; ctx.beginPath(); ctx.arc(35.8, -18.6, 2.3, 0, 7); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(36.6, -19.8, 0.8, 0, 7); ctx.fill();
      }
      ctx.fillStyle = AC;
      ctx.beginPath(); ctx.moveTo(29.5, -24); ctx.lineTo(39.8, -24); ctx.lineTo(39.8, -20.4); ctx.lineTo(29.5, -22.4); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#0d0f08'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(29.8, -22.4); ctx.lineTo(39.4, -20.6); ctx.stroke();
      ctx.fillStyle = '#0d0f08'; ctx.beginPath(); ctx.arc(46.5, -16, 0.9, 0, 7); ctx.fill();
      ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(38, -10.5); ctx.quadraticCurveTo(42.5, -8.5, 46.5, -11.5); ctx.stroke();

      // дымок из ноздри
      for (i = 0; i < 2; i++) {
        var q = (t * 1.6 + i * 0.5) % 1;
        ctx.fillStyle = 'rgba(255,255,255,' + ((1 - q) * 0.45) + ')';
        ctx.beginPath(); ctx.arc(48 + q * 8, -18 - q * 9, 1.2 + q * 2.2, 0, 7); ctx.fill();
      }
    }

    function dragon() {
      var air = d.y < -1, dead = state === 'dead';
      var D = d.duck && !dead, by = D ? 5 : 0;
      var x = DX(), yb = G + d.y;
      var sh = Math.max(0.25, 1 + d.y / (120 * K));
      ctx.fillStyle = 'rgba(0,0,0,.35)';
      ctx.beginPath(); ctx.ellipse(x + (D ? 8 * K : 0), G + 2, (D ? 32 : 22) * K * sh, 3.5 * K * sh, 0, 0, 7); ctx.fill();

      ctx.save(); ctx.translate(x, yb); ctx.scale(K, K);
      if (dead) ctx.rotate(0.3);
      var running = state === 'run' && !air;
      ctx.translate(0, running && !D ? -Math.abs(Math.sin(d.run * 14)) * 2 : (D ? -Math.abs(Math.sin(d.run * 20)) * 0.8 : Math.sin(t * 3)));
      ctx.shadowColor = 'rgba(' + RGB + ',.45)'; ctx.shadowBlur = 12;
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';

      if (D) { crouch(running); ctx.restore(); bubble(x, yb, D); return; }
      // хвост (в приседе прижат к земле)
      var wag = Math.sin(t * 8) * (D ? 2.5 : 4);
      ctx.save(); ctx.translate(0, by + (D ? 2 : 0));
      ctx.fillStyle = AC2;
      ctx.beginPath(); ctx.moveTo(-12, -24); ctx.quadraticCurveTo(-30, -20, -42, -25 + wag);
      ctx.quadraticCurveTo(-30, -9, -12, -11); ctx.closePath(); ctx.fill();
      ctx.fillStyle = DK;
      ctx.beginPath(); ctx.moveTo(-40, -25 + wag); ctx.lineTo(-49, -31 + wag); ctx.lineTo(-48, -20 + wag); ctx.closePath(); ctx.fill();
      ctx.restore();

      // лапки
      var p = Math.sin(d.run * (D ? 22 : 14)), sy = D ? -8 : -12;
      [[-7, 1], [9, -1]].forEach(function (L) {
        var off = running ? p * (D ? 4 : 6) * L[1] : -3, lift = running ? Math.max(0, p * L[1]) * (D ? 2.5 : 4) : (D ? 1 : 4);
        ctx.strokeStyle = AC2; ctx.lineWidth = 7;
        ctx.beginPath(); ctx.moveTo(L[0], sy); ctx.lineTo(L[0] + off, -5 - lift); ctx.stroke();
        ctx.fillStyle = DK; ctx.beginPath(); ctx.ellipse(L[0] + off + 1.5, -3 - lift, 6, 3.4, 0, 0, 7); ctx.fill();
      });

      // тело, пузико, шипы и сложенное крыло
      ctx.save(); ctx.translate(0, by);
      var bg = ctx.createLinearGradient(0, -36, 0, -6);
      bg.addColorStop(0, AC); bg.addColorStop(1, AC2);
      ctx.fillStyle = bg; ctx.beginPath(); ctx.ellipse(0, -21, D ? 19 : 18, D ? 12 : 15, 0, 0, 7); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(244,255,196,.6)'; ctx.beginPath(); ctx.ellipse(5, -17, 10.5, D ? 7 : 10, 0, 0, 7); ctx.fill();
      ctx.fillStyle = DK;
      (D ? [[-12, -29], [-6, -32], [0, -33]] : [[-12, -32], [-6, -35], [0, -36]]).forEach(function (s) {
        ctx.beginPath(); ctx.moveTo(s[0] - 3.5, s[1] + 1.5); ctx.lineTo(s[0], s[1] - (D ? 4.5 : 5.5)); ctx.lineTo(s[0] + 3.5, s[1] + 1.5); ctx.closePath(); ctx.fill();
      });
      var flap = air ? Math.sin(t * 20) * 0.6 : Math.sin(t * (state === 'run' ? 10 : 4)) * 0.2;
      ctx.save(); ctx.translate(-3, D ? -27 : -29);
      if (D) { ctx.rotate(-1.0 + flap * 0.1); ctx.scale(0.85, 0.85); } else { ctx.rotate(flap - 0.2); }
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-4, -20, -19, -24);
      ctx.quadraticCurveTo(-17, -14, -13, -10); ctx.quadraticCurveTo(-10, -5, -3, -2); ctx.closePath();
      ctx.fillStyle = 'rgba(244,255,196,.92)'; ctx.fill();
      ctx.strokeStyle = AC2; ctx.lineWidth = 1.3; ctx.stroke();
      ctx.restore();
      ctx.restore();

      // голова (в приседе опущена вперёд, рожки не торчат)
      ctx.save();
      if (D) ctx.translate(7, 17);
      if (!D) {
        ctx.fillStyle = '#f4ffc4';
        ctx.beginPath(); ctx.moveTo(8, -47); ctx.lineTo(4, -57); ctx.lineTo(14, -49.5); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(17, -50); ctx.lineTo(18, -60); ctx.lineTo(23, -48.5); ctx.closePath(); ctx.fill();
      }
      ctx.fillStyle = AC;
      ctx.beginPath(); ctx.arc(17, -37, 14, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.ellipse(28, -33, 8.5, 6.5, 0, 0, 7); ctx.fill();
      if (D) {
        ctx.fillStyle = '#f4ffc4';
        ctx.beginPath(); ctx.moveTo(8, -47); ctx.lineTo(5, -52); ctx.lineTo(13, -49); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(15, -50); ctx.lineTo(16, -55); ctx.lineTo(21, -48.5); ctx.closePath(); ctx.fill();
      }
      ctx.fillStyle = 'rgba(255,150,130,.38)'; ctx.beginPath(); ctx.ellipse(17.5, -31.5, 3.2, 2, 0, 0, 7); ctx.fill();
      var blink = (t % 3.4) < 0.12;
      if (dead) {
        ctx.strokeStyle = '#0d0f08'; ctx.lineWidth = 1.8;
        ctx.beginPath(); ctx.moveTo(18.5, -42); ctx.lineTo(24, -37); ctx.moveTo(24, -42); ctx.lineTo(18.5, -37); ctx.stroke();
      } else {
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(21, -39.5, 4.4, blink ? 0.7 : (D ? 4 : 5), 0, 0, 7); ctx.fill();
        if (!blink) {
          ctx.fillStyle = '#0d0f08'; ctx.beginPath(); ctx.arc(22.6, -39.3, 2.8, 0, 7); ctx.fill();
          ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(23.6, -40.8, 1, 0, 7); ctx.fill();
        }
      }
      ctx.fillStyle = '#0d0f08'; ctx.beginPath(); ctx.arc(33.5, -35, 0.9, 0, 7); ctx.fill();
      ctx.strokeStyle = '#0d0f08'; ctx.lineWidth = 1.3;
      ctx.beginPath(); ctx.moveTo(24, -30); ctx.quadraticCurveTo(28.5, -27, 33, -30.5); ctx.stroke();
      ctx.restore();
      ctx.restore();

      bubble(x, yb, D);
    }

    function bat(o) {
      var k = K, cx = o.x + o.w / 2, cy = G - o.bot - o.h / 2 + Math.sin(t * 5 + o.ph) * 3 * k;
      var fl = Math.sin(t * 16 + o.ph);
      ctx.save(); ctx.translate(cx, cy);
      ctx.fillStyle = 'rgba(' + RGB + ',.5)'; ctx.strokeStyle = AC; ctx.lineWidth = 1.3;
      [-1, 1].forEach(function (sd) {
        ctx.beginPath(); ctx.moveTo(sd * 4 * k, -2 * k);
        ctx.quadraticCurveTo(sd * 12 * k, (-14 - fl * 9) * k, sd * 18 * k, (-8 - fl * 9) * k);
        ctx.quadraticCurveTo(sd * 13 * k, 0, sd * 10 * k, 5 * k);
        ctx.quadraticCurveTo(sd * 7 * k, 1 * k, sd * 4 * k, 4 * k);
        ctx.closePath(); ctx.fill(); ctx.stroke();
      });
      ctx.fillStyle = AC2;
      ctx.beginPath(); ctx.ellipse(0, 0, 6 * k, 8 * k, 0, 0, 7); ctx.fill();
      [-1, 1].forEach(function (sd) {
        ctx.beginPath(); ctx.moveTo(sd * 5 * k, -6 * k); ctx.lineTo(sd * 3 * k, -12 * k); ctx.lineTo(sd * 1 * k, -7 * k); ctx.fill();
      });
      ctx.shadowBlur = 0; ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(-2.3 * k, -2 * k, 1.2 * k, 0, 7); ctx.arc(2.3 * k, -2 * k, 1.2 * k, 0, 7); ctx.fill();
      ctx.restore();
    }

    function rock(o) {
      var r = o.w / 2;
      ctx.save(); ctx.translate(o.x + r, G - r); ctx.rotate(o.rot);
      ctx.beginPath();
      for (var i = 0; i < 8; i++) {
        var a = i / 8 * Math.PI * 2, rr = r * (0.82 + 0.18 * Math.sin(i * 2.7 + o.ph));
        if (i) ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); else ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      ctx.closePath(); ctx.fillStyle = 'rgba(24,28,12,.95)'; ctx.fill();
      ctx.strokeStyle = AC; ctx.lineWidth = 1.6; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-r * 0.45, -r * 0.2); ctx.lineTo(r * 0.1, r * 0.25); ctx.lineTo(r * 0.4, r * 0.1);
      ctx.strokeStyle = 'rgba(' + RGB + ',.55)'; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.restore();
    }

    function gem(g) {
      var k = K, gy = G - g.y + Math.sin(t * 4 + g.ph) * 3 * k;
      ctx.fillStyle = AC; ctx.beginPath();
      ctx.moveTo(g.x, gy - 8 * k); ctx.lineTo(g.x + 5.5 * k, gy); ctx.lineTo(g.x, gy + 8 * k); ctx.lineTo(g.x - 5.5 * k, gy);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath();
      ctx.moveTo(g.x - k, gy - 5 * k); ctx.lineTo(g.x + 2 * k, gy - k); ctx.lineTo(g.x - k, gy); ctx.fill();
    }

    function pow(q) {
      var k = K, y = G - q.y + Math.sin(t * 3 + q.ph) * 3 * k;
      ctx.save(); ctx.translate(q.x, y);
      ctx.fillStyle = 'rgba(12,14,8,.9)'; ctx.beginPath(); ctx.arc(0, 0, 12 * k, 0, 7); ctx.fill();
      ctx.strokeStyle = AC; ctx.lineWidth = 1.6; ctx.stroke();
      ctx.scale(k * 1.3, k * 1.3); ctx.lineWidth = 1.3; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath();
      if (q.type === 'shield') { ctx.moveTo(0, -5.5); ctx.lineTo(4.5, -3.5); ctx.lineTo(4, 1.5); ctx.quadraticCurveTo(0, 6.5, -4, 1.5); ctx.lineTo(-4.5, -3.5); ctx.closePath(); }
      else if (q.type === 'slow') { ctx.arc(0, 0, 5, 0, 7); ctx.moveTo(0, -3.2); ctx.lineTo(0, 0); ctx.lineTo(2.6, 0); }
      else { ctx.moveTo(-4, 5); ctx.lineTo(-4, 0); ctx.arc(0, 0, 4, Math.PI, 0); ctx.lineTo(4, 5); }
      ctx.stroke(); ctx.restore();
    }

    function hud() {
      var fs = Math.max(10, Math.min(13, Math.round(H / 22))), items = [];
      if (d.shield) items.push('Щит');
      if (slow > 0) items.push('Замедление ' + Math.ceil(slow) + ' с');
      if (mag > 0) items.push('Магнит ' + Math.ceil(mag) + ' с');
      ctx.font = '800 ' + fs + 'px ' + FONT; ctx.textAlign = 'left'; ctx.fillStyle = AC;
      ctx.textBaseline = 'alphabetic';
      items.forEach(function (s, i) { ctx.fillText(s, 12, fs + 16 + i * (fs + 7)); });
      if (toast) {
        ctx.globalAlpha = Math.min(1, toast.life); ctx.textAlign = 'center';
        ctx.font = '800 ' + Math.max(18, Math.min(32, Math.round(H / 9))) + 'px ' + FONT;
        ctx.fillText(toast.text, W / 2, H * 0.3 - (1.2 - toast.life) * 14);
        ctx.globalAlpha = 1;
      }
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
        : (state === 'paused' ? 'Тапни, чтобы продолжить' : 'Собирай кристаллы — рекорд ждёт тебя');
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
      sstars.forEach(function (s) {
        var g = ctx.createLinearGradient(s.x, s.y, s.x - 40, s.y - 15);
        g.addColorStop(0, 'rgba(255,255,255,' + Math.max(0, s.life) + ')'); g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.strokeStyle = g; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x - 40, s.y - 15); ctx.stroke();
      });
      mountains(0.12, 46, 0.05); mountains(0.3, 28, 0.09);
      ctx.strokeStyle = 'rgba(' + RGB + ',.2)'; ctx.lineWidth = 1.5;
      for (var i = 0; i < 8; i++) {
        var px = (i * 120 - scroll) % (W + 120); if (px < 0) px += W + 120;
        ctx.beginPath(); ctx.moveTo(px, G + 5); ctx.lineTo(px + 34, G + 5); ctx.stroke();
      }
      ctx.shadowColor = 'rgba(' + RGB + ',.6)'; ctx.shadowBlur = 12;
      obs.forEach(function (o) {
        if (o.type === 'rock') return rock(o);
        if (o.type === 'bat') return bat(o);
        var cw = o.w / o.n;
        for (var k = 0; k < o.n; k++) crystal(o.x + k * cw, cw * (o.type === 'ridge' ? 1.15 : 1), o.h * o.f[k % o.f.length]);
      });
      gems.forEach(gem);
      pows.forEach(pow);
      ctx.shadowBlur = 0;
      parts.forEach(function (p) {
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = AC; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill();
      });
      ctx.globalAlpha = 1;
      dragon();
      if (state !== 'idle') hud();
      ctx.restore();
      overlay();
    }

    function loop(now) {
      var dt = Math.min((now - last) / 1000, 0.04); last = now;
      if (W > 0 && H > 0) { update(dt); draw(); }
      raf = requestAnimationFrame(loop);
    }
    function start() { cancelAnimationFrame(raf); last = performance.now(); raf = requestAnimationFrame(loop); }

    function setDuck(v) { d.duck = v && state === 'run'; }
    field.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      var r = field.getBoundingClientRect();
      if (state === 'run' && e.clientY - r.top > r.height * 0.62) {
        setDuck(true);
        try { field.setPointerCapture(e.pointerId); } catch (err) {}
      } else { action(); }
    });
    ['pointerup', 'pointercancel'].forEach(function (n) { field.addEventListener(n, function () { setDuck(false); }); });
    function typing(e) { var n = e.target && e.target.tagName; return n === 'INPUT' || n === 'TEXTAREA' || n === 'SELECT'; }
    document.addEventListener('keydown', function (e) {
      if (typing(e)) return;
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') { e.preventDefault(); action(); }
      else if (e.code === 'ArrowDown' || e.code === 'KeyS') { e.preventDefault(); setDuck(true); }
    });
    document.addEventListener('keyup', function (e) {
      if (typing(e)) return;
      if (e.code === 'Space') e.preventDefault();
      if (e.code === 'ArrowDown' || e.code === 'KeyS') setDuck(false);
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
