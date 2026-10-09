// мини-игра Drakeling
(function () {
  // адрес API статистики
  var STATS_ENDPOINT = '/api/score';

  var TXT = null;
  function T(key, vars) {
    if (!TXT) {
      TXT = {};
      [].forEach.call(document.querySelectorAll('#gq-text [data-t]'), function (el) { TXT[el.getAttribute('data-t')] = el.textContent.trim(); });
    }
    var s = TXT[key] || '';
    if (vars) s = s.replace(/\{(\w+)\}/g, function (m, k) { return vars[k] !== undefined ? vars[k] : m; });
    return s;
  }
  function L(name) {
    var ol = document.querySelector('#gq-text [data-list="' + name + '"]');
    return ol ? [].map.call(ol.children, function (li) { return [Number(li.getAttribute('data-at')) || 0, li.textContent.trim()]; }) : [];
  }

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

  function progress() {
    var textEl = document.getElementById('build-text');
    var pctEl = document.getElementById('build-pct');
    var bar = document.querySelector('.build__track span');
    if (!textEl || !bar) return;
    var steps = L('steps');
    var tail = L('tail').map(function (x) { return x[1]; });
    if (!steps.length || !tail.length) return;
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

  function music(btn) {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!btn) return null;
    var vs = document.getElementById('game-vol');
    if (!AC) { btn.hidden = true; if (vs) vs.hidden = true; return null; }
    var ac, master, lpF, pump, drumBus, bassBus, leadBus, sfxBus, echoIn, verbIn, noiseBuf;
    var timer = null, step = 0, next = 0, on = false, mode = 0;
    var VMAX = 0.55, vol = 1;
    try { var sv = parseFloat(localStorage.getItem('gq_vol')); if (sv >= 0 && sv <= 1) vol = sv; } catch (e) { }
    function gainNow() { return VMAX * vol * vol; }
    var ZB = [126, 130, 136], ZT = [1, 1.1225, 1.1892], zone = 0, zPend = 0, tr = 1, dlNode = null;
    var BPM = 126, S = 60 / BPM / 4;
    var lastGem = 0, gemChain = 0;
    var BASSN = [73.42, 73.42, 58.27, 65.41, 73.42, 73.42, 49, 55];
    var DM = [146.83, 174.61, 220], BB = [116.54, 146.83, 174.61], CC = [130.81, 164.81, 196], GM = [98, 116.54, 146.83], AA = [110, 138.59, 164.81];
    var PADS = [DM, DM, BB, CC, DM, DM, GM, AA];
    var ARPP = [0, 1, 2, 3, 2, 1, 0, 1, 2, 3, 2, 1, 0, 1, 2, 3];
    // [шаг, частота, длина]
    var MEL = [
      [[0, 440, 3], [3, 587.33, 3], [6, 523.25, 2], [8, 440, 4], [12, 349.23, 2], [14, 392, 2]],
      [[0, 440, 3], [3, 587.33, 3], [6, 659.25, 2], [8, 587.33, 6], [14, 523.25, 2]],
      [[0, 587.33, 3], [3, 466.16, 3], [6, 587.33, 2], [8, 698.46, 4], [12, 587.33, 2], [14, 523.25, 2]],
      [[0, 659.25, 3], [3, 523.25, 3], [6, 392, 2], [8, 523.25, 4], [12, 587.33, 2], [14, 659.25, 2]],
      [[0, 698.46, 3], [3, 659.25, 3], [6, 587.33, 2], [8, 440, 4], [12, 587.33, 2], [14, 659.25, 2]],
      [[0, 698.46, 3], [3, 587.33, 3], [6, 659.25, 2], [8, 698.46, 6], [14, 659.25, 2]],
      [[0, 587.33, 3], [3, 466.16, 3], [6, 392, 2], [8, 587.33, 4], [12, 466.16, 2], [14, 587.33, 2]],
      [[0, 554.37, 3], [3, 659.25, 3], [6, 440, 2], [8, 554.37, 3], [11, 659.25, 2], [13, 880, 3]]
    ];

    function mkBus(echo, verb) {
      var b = ac.createGain(); b.connect(master);
      if (echo) { var e = ac.createGain(); e.gain.value = echo; b.connect(e); e.connect(echoIn); }
      if (verb) { var v = ac.createGain(); v.gain.value = verb; b.connect(v); v.connect(verbIn); }
      return b;
    }
    function setup() {
      ac = new AC();
      var comp = ac.createDynamicsCompressor();
      comp.threshold.value = -16; comp.knee.value = 12; comp.ratio.value = 4; comp.attack.value = 0.005; comp.release.value = 0.22;
      var sat = ac.createWaveShaper(), cv = new Float32Array(1024);
      for (var q = 0; q < 1024; q++) cv[q] = Math.tanh(1.25 * (q / 512 - 1)) * 0.85;
      sat.curve = cv; sat.oversample = '2x';
      lpF = ac.createBiquadFilter(); lpF.type = 'lowpass'; lpF.frequency.value = mode ? 7000 : 1500;
      master = ac.createGain(); master.gain.value = 0;
      master.connect(lpF); lpF.connect(sat); sat.connect(comp); comp.connect(ac.destination);
      echoIn = ac.createGain();
      var dl = ac.createDelay(1), fb = ac.createGain(), el = ac.createBiquadFilter();
      dlNode = dl; dl.delayTime.value = S * 3; fb.gain.value = 0.36; el.type = 'lowpass'; el.frequency.value = 2600;
      echoIn.connect(dl); dl.connect(el); el.connect(master); el.connect(fb); fb.connect(dl);
      verbIn = ac.createGain();
      var conv = ac.createConvolver(), vo = ac.createGain(), len = Math.floor(ac.sampleRate * 1.8);
      var ir = ac.createBuffer(2, len, ac.sampleRate);
      for (var c = 0; c < 2; c++) {
        var ch = ir.getChannelData(c);
        for (var i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
      }
      conv.buffer = ir; vo.gain.value = 0.5; verbIn.connect(conv); conv.connect(vo); vo.connect(master);
      pump = ac.createGain(); pump.connect(mkBus(0.18, 0.32));
      drumBus = mkBus(0, 0.16); bassBus = mkBus(0, 0); leadBus = mkBus(0.38, 0.28); sfxBus = mkBus(0, 0.1);
      noiseBuf = ac.createBuffer(1, ac.sampleRate * 0.6, ac.sampleRate);
      var nd = noiseBuf.getChannelData(0);
      for (var k = 0; k < nd.length; k++) nd[k] = Math.random() * 2 - 1;
    }

    function voice(t, f, dur, type, vol, dest, o) {
      o = o || {};
      var osc = ac.createOscillator(), g = ac.createGain(), a = o.a || 0.008, r = o.r || 0.05;
      osc.type = type; osc.frequency.setValueAtTime(f, t);
      if (o.det) osc.detune.value = o.det;
      if (o.slide) osc.frequency.exponentialRampToValueAtTime(o.slide, t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + a);
      g.gain.setValueAtTime(vol, t + Math.max(a, dur - r));
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur + r);
      if (o.lp) {
        var fl = ac.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.setValueAtTime(o.lp, t);
        if (o.lpEnd) fl.frequency.exponentialRampToValueAtTime(o.lpEnd, t + dur);
        osc.connect(fl); fl.connect(g);
      } else { osc.connect(g); }
      g.connect(dest);
      if (o.vib) {
        var lfo = ac.createOscillator(), lg = ac.createGain();
        lfo.frequency.value = 5.5; lg.gain.value = o.vib; lfo.connect(lg); lg.connect(osc.detune);
        lfo.start(t); lfo.stop(t + dur + r + 0.02);
      }
      osc.start(t); osc.stop(t + dur + r + 0.02);
    }
    function hit(t, dur, hp, vol, dest) {
      var s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
      s.buffer = noiseBuf; f.type = 'highpass'; f.frequency.value = hp;
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      s.connect(f); f.connect(g); g.connect(dest || drumBus); s.start(t); s.stop(t + dur + 0.02);
    }
    function kick(t) {
      var o = ac.createOscillator(), g = ac.createGain();
      o.frequency.setValueAtTime(155, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.13);
      g.gain.setValueAtTime(0.95, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      o.connect(g); g.connect(drumBus); o.start(t); o.stop(t + 0.32);
    }

    function play(s, t) {
      var bar = (s >> 4) & 7, i = s & 15, m = mode, ch = PADS[bar].map(function (f) { return f * tr; }), root = BASSN[bar] * tr, n;
      if (i % 4 === 0) {
        pump.gain.cancelScheduledValues(t); pump.gain.setValueAtTime(m ? 0.3 : 0.85, t);
        pump.gain.linearRampToValueAtTime(1, t + S * 3.2);
      }
      if (i === 0) {
        for (n = 0; n < 3; n++) {
          voice(t, ch[n], S * 15, 'sawtooth', m ? 0.045 : 0.06, pump, { det: -7, lp: 1100, a: 0.35, r: 0.5 });
          voice(t, ch[n], S * 15, 'sawtooth', m ? 0.045 : 0.06, pump, { det: 7, lp: 1100, a: 0.35, r: 0.5 });
        }
        if (s === 0 && m) hit(t, 1.4, 3500, 0.22);
        if (!m) voice(t, root, S * 14, 'sine', 0.2, bassBus, { a: 0.2, r: 0.4 });
      }
      if (m || i % 2 === 0) {
        var an = [ch[0] * 2, ch[1] * 2, ch[2] * 2, ch[0] * 4];
        voice(t, an[ARPP[i] % 4], S * 0.9, 'square', m ? (m === 2 ? 0.04 : 0.033) : 0.026, pump, { lp: 3500, r: 0.02 });
      }
      if (!m) return;
      if (i % 4 === 0) kick(t);
      if (i === 4 || i === 12) {
        hit(t, 0.05, 1200, 0.3); hit(t + 0.012, 0.18, 1500, 0.32);
        voice(t, 200, 0.09, 'triangle', 0.2, drumBus, { slide: 110, r: 0.04 });
      }
      if (m === 2 && (i === 7 || i === 15)) hit(t, 0.04, 1800, 0.07);
      if (m && i % 8 === 0) hit(t, 0.05, 7500, 0.04);
      if ((bar & 7) === 7 && i >= 12) voice(t, 190 - (i - 12) * 30, 0.12, 'sine', 0.2, drumBus, { slide: 85, r: 0.05 });
      if (m === 2 && i % 4 === 3) voice(t, ch[(i >> 2) % 3] * 4, S * 1.4, 'sine', 0.022, leadBus, { r: 0.15 });
      if (i % 2 === 0 && i % 4 !== 2) hit(t, 0.04, 7500, 0.08);
      if (i % 4 === 2) hit(t, 0.14, 6000, 0.11);
      if (m === 2 && i % 2 === 1) hit(t, 0.03, 8000, 0.04);
      if ((bar & 3) === 3 && i >= 12) hit(t, 0.1, 2000, 0.12 + (i - 12) * 0.06);
      if (i % 2 === 0) voice(t, root * (i % 8 === 6 ? 2 : 1), S * 1.6, 'sawtooth', 0.16, bassBus, { lp: 1400, lpEnd: 260, r: 0.03 });
      if (i % 4 === 0) { voice(t, root, S * 1.9, 'sine', 0.22, bassBus); voice(t, root * 0.5, S * 1.9, 'sine', 0.12, bassBus); }
      MEL[bar].forEach(function (nt) {
        if (nt[0] !== i) return;
        var d = nt[2] * S * 0.95;
        voice(t, nt[1] * tr, d, 'square', 0.05, leadBus, { vib: 10, lp: 3200, a: 0.01, r: 0.06 });
        voice(t, nt[1] * tr, d, 'sawtooth', 0.035, leadBus, { det: 7, vib: 10, lp: 3000, a: 0.01, r: 0.06 });
        if (m === 2) voice(t, nt[1] * 2 * tr, d, 'triangle', 0.03, leadBus, { r: 0.05 });
      });
    }
    function applyZone() {
      zone = zPend; tr = ZT[zone]; BPM = ZB[zone]; S = 60 / BPM / 4;
      if (dlNode) dlNode.delayTime.value = S * 3;
    }
    function schedule() {
      while (next < ac.currentTime + 0.12) {
        if ((step & 15) === 0 && zone !== zPend) { applyZone(); hit(next, 0.9, 2500, 0.16); }
        play(step, next); next += S; step = (step + 1) % 128;
      }
    }
    function start() {
      if (!ac) setup();
      ac.resume();
      var n = ac.currentTime;
      applyZone();
      next = n + 0.05; step = 0;
      clearInterval(timer); timer = setInterval(schedule, 25);
      master.gain.cancelScheduledValues(n); master.gain.setValueAtTime(master.gain.value, n);
      master.gain.linearRampToValueAtTime(gainNow(), n + 0.4);
    }
    function stop() {
      var n = ac.currentTime;
      master.gain.cancelScheduledValues(n); master.gain.setValueAtTime(master.gain.value, n);
      master.gain.linearRampToValueAtTime(0, n + 0.25);
      // движок останавливается после затухания
      setTimeout(function () { if (!on) { clearInterval(timer); timer = null; if (ac && ac.state === 'running') ac.suspend(); } }, 320);
    }
    function setMode(m) {
      if (m === mode) return;
      mode = m;
      if (ac) lpF.frequency.setTargetAtTime(m ? 7000 : 1500, ac.currentTime, 0.15);
    }
    function sfx(name) {
      if (!on || !ac) return;
      var t = ac.currentTime + 0.005;
      if (name === 'jump' || name === 'jump2') {
        var up = name === 'jump2' ? 1.5 : 1;
        voice(t, 330 * up, 0.11, 'square', 0.09, sfxBus, { slide: 700 * up, r: 0.03 });
        voice(t, 165 * up, 0.12, 'triangle', 0.1, sfxBus, { slide: 350 * up, r: 0.03 });
        hit(t, 0.08, 2800, 0.05, sfxBus);
      }
      else if (name === 'land') { voice(t, 110, 0.07, 'sine', 0.14, sfxBus, { slide: 55 }); hit(t, 0.05, 500, 0.05, sfxBus); }
      else if (name === 'duck') { hit(t, 0.12, 1500, 0.07, sfxBus); voice(t, 420, 0.1, 'triangle', 0.05, sfxBus, { slide: 180 }); }
      else if (name === 'gem') {
        var now = performance.now();
        gemChain = now - lastGem < 650 ? Math.min(gemChain + 1, 6) : 0; lastGem = now;
        var gf = 988 * Math.pow(2, [0, 2, 4, 7, 9, 12, 14][gemChain] / 12);
        voice(t, gf, 0.06, 'square', 0.07, sfxBus);
        voice(t + 0.055, gf * 1.3348, 0.12, 'square', 0.07, sfxBus, { r: 0.08 });
        voice(t, gf * 2, 0.1, 'sine', 0.04, sfxBus, { r: 0.1 });
      }
      else if (name === 'power') {
        [523.25, 659.25, 784, 1046.5].forEach(function (f, k) { voice(t + k * 0.06, f, 0.08, 'triangle', 0.14, sfxBus, { r: 0.04 }); });
        voice(t + 0.24, 2093, 0.18, 'sine', 0.05, sfxBus, { r: 0.12 });
      }
      else if (name === 'shield') { hit(t, 0.25, 900, 0.3, sfxBus); voice(t, 880, 0.15, 'triangle', 0.12, sfxBus, { slide: 220 }); }
      else if (name === 'ms') [659.25, 830.61, 987.77, 1318.5].forEach(function (f, k) { voice(t + k * 0.05, f, 0.07, 'triangle', 0.1, sfxBus, { r: 0.05 }); });
      else if (name === 'zone') {
        [293.66, 369.99, 440, 587.33, 739.99].forEach(function (f, k) { voice(t + k * 0.07, f, 0.22, 'sawtooth', 0.05, sfxBus, { lp: 2600, r: 0.15 }); });
        hit(t, 0.7, 2500, 0.1, sfxBus);
      }
      else if (name === 'die') {
        hit(t, 0.35, 300, 0.35, sfxBus);
        voice(t, 320, 0.5, 'sawtooth', 0.16, sfxBus, { slide: 50, lp: 1500 });
        voice(t, 120, 0.4, 'sine', 0.3, sfxBus, { slide: 40 });
      }
    }
    function setZone(z) { zPend = Math.max(0, Math.min(ZB.length - 1, z | 0)); }

    btn.addEventListener('mousedown', function (e) { e.preventDefault(); });
    btn.addEventListener('click', function () {
      on = !on;
      if (on) start(); else stop();
      clearTimeout(btn._offT);
      if (on) { btn.classList.add('is-on'); vs.classList.add('is-open'); }
      else { vs.classList.remove('is-open'); btn._offT = setTimeout(function () { btn.classList.remove('is-on'); }, 380); }
      btn.setAttribute('aria-pressed', String(on));
      btn.setAttribute('aria-label', T(on ? 'music-on' : 'music-off'));
      btn.title = T(on ? 'music-on' : 'music-off');
      btn.blur();
    });
    document.addEventListener('visibilitychange', function () {
      if (!ac || !on) return;
      if (document.hidden) ac.suspend(); else ac.resume();
    });

    if (!vs) return { mode: setMode, sfx: sfx, zone: setZone };
    vs.value = Math.round(vol * 100);
    function paintVol() { vs.style.setProperty('--v', vs.value + '%'); }
    paintVol();
    vs.addEventListener('input', function () {
      vol = vs.value / 100; paintVol();
      try { localStorage.setItem('gq_vol', String(vol)); } catch (e) { }
      if (ac && on) {
        var n = ac.currentTime;
        master.gain.cancelScheduledValues(n); master.gain.setValueAtTime(master.gain.value, n);
        master.gain.setTargetAtTime(gainNow(), n, 0.03);
      } else if (!on && vol > 0) btn.click();
      vs.title = T('vol-title', { n: vs.value });
    });
    ['pointerup', 'touchend'].forEach(function (ev) { vs.addEventListener(ev, function () { vs.blur(); }); });
    vs.addEventListener('keydown', function (e) { if (e.key === 'Escape') vs.blur(); e.stopPropagation(); });

    return { mode: setMode, sfx: sfx, zone: setZone };
  }

  function init() {
    preloader();
    progress();
    var field = document.getElementById('game-field');
    var canvas = document.getElementById('game-canvas');
    var scoreEl = document.getElementById('game-score');
    var bestEl = document.getElementById('game-best');
    if (!field || !canvas) return;
    var mus = music(document.getElementById('game-music')) || { mode: function () { }, sfx: function () { }, zone: function () { } };

    var ctx = canvas.getContext('2d');
    var AC = '#d1f05d', AC2 = '#b9e03f', DK = '#7fa317', RGB = '209,240,93';
    var FONT = getComputedStyle(document.body).fontFamily;
    var W, H, K, G, state = 'idle', score = 0, best = 0, speed = 60, t = 0, last = 0, raf = 0;
    var deadAt = 0, shake = 0, newRec = false, emit = 0, scroll = 0;
    var d = { y: 0, vy: 0, jumps: 0, run: 0, duck: false }, nextGap = 0;
    var obs = [], gems = [], pows = [], parts = [], stars = [], sstars = [];
    var slow = 0, mag = 0, lastMs = 0, toast = null, ov = 0, ovPrev = 'idle';
    var ZONES = [{ at: 0, name: T('zone-0'), c: [70, 170, 150] }, { at: 120, name: T('zone-1'), c: [125, 112, 255] }, { at: 260, name: T('zone-2'), c: [255, 115, 45] }];
    var zc = ZONES[0].c, zlast = 0, ztoast = null;

    try { best = Number(localStorage.getItem('gq_dragon_best')) || 0; } catch (e) { }
    bestEl.textContent = best;

    var gamesEl = document.getElementById('game-games'), totalEl = document.getElementById('game-total'), nickEl = document.getElementById('game-nick');
    var msgEl = document.getElementById('game-msg'), msgTimer = 0;
    function lsGet(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }
    function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }
    function cleanName(s) { return String(s || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 20); }
    function randName() { return T('nick-prefix') + (1000 + Math.floor(Math.random() * 9000)); }
    function setMsg(text, ms) {
      if (!msgEl) return;
      msgEl.textContent = text || '';
      clearTimeout(msgTimer);
      if (text) msgTimer = setTimeout(function () { msgEl.textContent = ''; }, ms || 4000);
    }

    var player = lsGet('gq_player') || {};
    if (!player.name) player.name = randName();
    lsSet('gq_player', player);
    var stats = lsGet('gq_stats') || { games: 0, total: 0, best: 0 };
    if (best > stats.best) stats.best = best;
    best = stats.best;
    var runStart = 0;

    function renderStats() {
      bestEl.textContent = best;
      if (gamesEl) gamesEl.textContent = stats.games;
      if (totalEl) totalEl.textContent = stats.total;
    }

    function post(url, body, keepalive) {
      return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, keepalive: !!keepalive, body: JSON.stringify(body) })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (b) { return { s: r.status, b: b }; }); });
    }

    var codeBox = document.getElementById('game-codebox'), codeInput = document.getElementById('game-code');
    var codeEye = document.getElementById('game-code-eye');
    var loginGo = document.getElementById('game-login-go'), loginX = document.getElementById('game-login-x');
    var loginFor = '';   // ник для входа

    function setEye(show) {
      if (!codeInput || !codeEye) return;
      codeInput.type = show ? 'text' : 'password';
      codeEye.classList.toggle('is-shown', show);
      codeEye.setAttribute('aria-pressed', show ? 'true' : 'false');
    }
    function renderCode() {
      if (!codeBox || !codeInput) return;
      var login = !!loginFor;
      codeBox.hidden = !(login || player.code);
      codeBox.classList.toggle('is-login', login);
      codeInput.readOnly = !login;
      codeInput.value = login ? '' : (player.code || '');
      codeInput.placeholder = login ? '0000' : '';
      if (loginGo) loginGo.hidden = !login;
      if (loginX) loginX.hidden = !login;
      setEye(false);
    }
    function openLogin(name, focus) {
      loginFor = name || (nickEl && cleanName(nickEl.value)) || '';
      if (name && nickEl) nickEl.value = name;
      renderCode();
      if (focus && codeInput) codeInput.focus();
    }
    function closeLogin() { loginFor = ''; renderCode(); }
    function cancelLogin() { if (nickEl) nickEl.value = player.name; closeLogin(); }
    function setStats(p) {
      stats = { games: p.games || 0, total: p.total || 0, best: p.best || 0 };
      best = stats.best; lsSet('gq_stats', stats);
      try { localStorage.setItem('gq_dragon_best', best); } catch (e) { }
      renderStats();
    }

    function doLogin() {
      var nn = cleanName(nickEl && nickEl.value), code = String(codeInput && codeInput.value || '').replace(/\D/g, '');
      if (!nn || code.length !== 4) { setMsg(T('msg-need')); return; }
      setMsg(T('msg-login'));
      post('/api/login', { name: nn, token: code }).then(function (r) {
        if (r.s === 200 && r.b.player) {
          var p = r.b.player;
          player.name = player.reg = p.name; player.code = code; lsSet('gq_player', player);
          if (nickEl) nickEl.value = p.name;
          setStats(p); closeLogin();
          setMsg(T('msg-welcome', { name: p.name }));
        } else if (r.s === 429) {
          setMsg(T('msg-many'), 7000);
        } else if (r.s === 403) {
          setMsg(T('msg-bad'));
        } else {
          setMsg(T('msg-net'));
        }
      }).catch(function () { setMsg(T('msg-net')); });
    }

    if (codeEye) codeEye.addEventListener('click', function () { setEye(codeInput.type === 'password'); codeEye.blur(); });
    if (loginGo) loginGo.addEventListener('click', function () { doLogin(); loginGo.blur(); });
    if (loginX) loginX.addEventListener('click', function () { cancelLogin(); loginX.blur(); });
    if (codeInput) {
      codeInput.addEventListener('input', function () { codeInput.value = codeInput.value.replace(/\D/g, '').slice(0, 4); });
      codeInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && loginFor) doLogin();
        else if (e.key === 'Escape' && loginFor) cancelLogin();
      });
    }

    function register(name, cb) {
      post('/api/register', { name: name }).then(function (r) { cb(r.s, r.b && r.b.token ? String(r.b.token) : ''); }).catch(function () { cb(0, ''); });
    }

    function syncFromServer() {
      if (!player.reg) return;
      post('/api/restore', { name: player.reg }).then(function (r) {
        if (r.s !== 200 || !r.b.player) return;
        var p = r.b.player;
        stats.games = Math.max(stats.games, p.games);
        stats.total = Math.max(stats.total, p.total);
        stats.best = Math.max(stats.best, p.best);
        best = stats.best;
        lsSet('gq_stats', stats);
        try { localStorage.setItem('gq_dragon_best', best); } catch (e) { }
        renderStats();
      }).catch(function () { });
    }

    function ensureRegistered(tries) {
      if (player.reg && player.code) { syncFromServer(); return; }
      var name = player.reg || player.name;
      register(name, function (s, code) {
        if (s === 200 && code) {
          player.name = player.reg = name; player.code = code; lsSet('gq_player', player);
          renderCode(); syncFromServer();
          setMsg(T('msg-code', { code: code }), 9000);
        } else if (s === 409) {
          if (player.reg) {
            setMsg(T('msg-protected', { name: player.reg }), 8000);
            openLogin(player.reg, false);
          } else if (tries > 0) {
            player.name = randName(); if (nickEl) nickEl.value = player.name; lsSet('gq_player', player);
            ensureRegistered(tries - 1);
          }
        }
      });
    }

    if (nickEl) {
      nickEl.value = player.name;
      nickEl.addEventListener('change', function () {
        var nn = cleanName(nickEl.value);
        if (!nn || nn === player.name) { nickEl.value = player.name; closeLogin(); return; }
        if (player.reg && nn.toLowerCase() === player.reg.toLowerCase()) {
          player.name = nn; lsSet('gq_player', player); return;
        }
        loginFor = '';
        setMsg(T('msg-check'));
        register(nn, function (s, code) {
          if (s === 200 && code) {
            player.name = player.reg = nn; player.code = code; lsSet('gq_player', player);
            setStats({}); renderCode();
            setMsg(T('msg-newnick', { name: nn, code: code }), 9000);
          } else if (s === 409) {
            setMsg(T('msg-taken', { name: nn }), 7000);
            openLogin(nn, true);
          } else {
            nickEl.value = player.name; renderCode();
            setMsg(T('msg-net'));
          }
        });
      });
      nickEl.addEventListener('keydown', function (e) { if (e.key === 'Enter') nickEl.blur(); });
    }

    function report(s) {
      if (!STATS_ENDPOINT || s < 1 || !player.reg || !player.code) return;
      var body = { name: player.reg, token: player.code, score: s, duration: Math.round((Date.now() - runStart) / 1000) };
      post(STATS_ENDPOINT, body, true).then(function (r) {
        if (r.s === 200) syncFromServer();
        else if (r.s === 403) { setMsg(T('msg-codebad'), 7000); openLogin(player.reg, false); }
        else if (r.s === 429 && r.b.error === 'locked') setMsg(T('msg-locked'), 7000);
      }).catch(function () { });
    }

    renderCode();
    renderStats();
    ensureRegistered(3);

    function resize() {
      var dpr = window.devicePixelRatio || 1;
      W = canvas.clientWidth; H = canvas.clientHeight; K = Math.min(1.5, H / 190); G = H - 12;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      stars = [];
      for (var i = 0; i < Math.round(W / 26); i++) {
        stars.push({ x: Math.random() * W, y: H * 0.12 + Math.random() * H * 0.68, r: Math.random() * 1.3 + 0.5, p: Math.random() * 6 });
      }
    }

    function reset() {
      score = 0; speed = 290; obs = []; gems = []; parts = []; d.y = 0; d.vy = 0; d.jumps = 0; d.duck = false; d.cr = 0; d.shield = false; nextGap = 200 * K;
      pows = []; slow = 0; mag = 0; lastMs = 0; toast = null; zlast = 0; ztoast = null; mus.zone(0);
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
        reset(); state = 'run'; runStart = Date.now(); return;
      }
      if (state === 'paused') { state = 'run'; return; }
      if (state !== 'run') return;
      if (d.jumps < 2) {
        d.vy = d.jumps === 0 ? -640 * K : -560 * K;
        if (d.jumps === 0) burst(DX() - 6 * K, G, 8, 60 * K, 20); else burst(DX(), G + d.y - 18 * K, 14, 90 * K, 0);
        d.jumps++; mus.sfx(d.jumps === 1 ? 'jump' : 'jump2');
      }
    }

    function DX() { return 84 * K; }

    function dragonBox() {
      var ch = (d.duck ? 34 : 50) * K, db = G + d.y;
      return { x1: DX() - 16 * K, x2: DX() + (d.duck ? 32 : 24) * K, t: db - ch, b: db };
    }

    // crystal — обычный кристалл (прыжок)
    // spire   — высокий шпиль (прыжок, лучше двойной)
    // tower   — очень высокая башня (только двойной прыжок)
    // ridge   — длинный хребет (прыжок)
    // rock    — быстрый катящийся камень (прыжок вовремя)
    // bat     — летучая мышь на уровне головы (пригнуться)
    // swoop   — пикирующая мышь, качается вверх-вниз (угадать момент: пригнуться или перепрыгнуть)
    // hang    — сталактит сверху (только пригнуться, перепрыгнуть нельзя)
    function make(type, x) {
      var o = { x: x, type: type, v: 1, ph: Math.random() * 6, bot: 0, f: [1], n: 1 };
      if (type === 'crystal') { o.n = Math.random() < 0.35 ? 2 : 1; o.w = (22 + Math.random() * 8) * K * o.n; o.h = (34 + Math.random() * 24) * K; o.f = [1, 0.72]; o.top = o.h * 0.78; }
      else if (type === 'spire') { o.w = 20 * K; o.h = (66 + Math.random() * 14) * K; o.top = o.h * 0.8; }
      else if (type === 'tower') { o.w = 26 * K; o.h = 118 * K; o.top = o.h * 0.85; }
      else if (type === 'ridge') { o.n = 4; o.w = 80 * K; o.h = (26 + Math.random() * 8) * K; o.f = [0.8, 1, 0.65, 0.9]; o.top = o.h * 0.85; }
      else if (type === 'rock') { var rr = (15 + Math.random() * 6) * K; o.w = 2 * rr; o.h = 2 * rr; o.v = 1.35; o.rot = 0; o.top = o.h * 0.8; }
      else if (type === 'hang') { o.w = 46 * K; o.bot = 38 * K; o.h = 400 * K; o.top = o.bot + o.h; }
      else if (type === 'swoop') { o.w = 36 * K; o.h = 22 * K; o.base = 38 * K; o.amp = 24 * K; o.bot = o.base; o.top = o.bot + o.h; }
      else { o.w = 36 * K; o.h = 22 * K; o.bot = 40 * K; o.top = o.bot + o.h; }
      return o;
    }

    function spawn() {
      var list = [['crystal', 4]];
      if (score > 20) list.push(['hang', 3]);
      if (score > 35) list.push(['bat', 3]);
      if (score > 50) list.push(['spire', 2]);
      if (score > 70) list.push(['tower', 2]);
      if (score > 90) list.push(['ridge', 2]);
      if (score > 120) list.push(['swoop', 2]);
      if (score > 150) list.push(['rock', 2]);
      var sum = 0, type = 'crystal', q, i;
      list.forEach(function (l) { sum += l[1]; });
      q = Math.random() * sum;
      for (i = 0; i < list.length; i++) { q -= list[i][1]; if (q <= 0) { type = list[i][0]; break; } }
      var lo = obs[obs.length - 1];
      if (type === 'rock' && lo && lo.x + lo.w > W * 0.4) type = 'crystal';
      if ((type === 'bat' || type === 'swoop') && lo && (lo.type === 'bat' || lo.type === 'swoop')) type = 'crystal';

      var chain = [type];
      if (score > 45 && Math.random() < Math.min(0.5, 0.15 + score / 700)) {
        var pats = [['crystal', 'hang'], ['hang', 'spire'], ['crystal', 'crystal', 'crystal']];
        if (score > 100) pats.push(['tower', 'hang'], ['hang', 'hang', 'crystal']);
        if (score > 160) pats.push(['spire', 'hang', 'tower'], ['hang', 'tower', 'hang']);
        chain = pats[Math.floor(Math.random() * pats.length)];
      }

      var x = W + 30, prev = null, o;
      for (i = 0; i < chain.length; i++) {
        if (prev) {
          x = prev.x + prev.w + (prev.type === 'crystal' && chain[i] === 'crystal' ? speed * 0.42 + 40 * K : speed * 0.5 + 50 * K)
            + (prev.type === 'tower' ? speed * 0.12 : 0);
        }
        o = make(chain[i], x);
        var cx = o.x + o.w / 2, j;
        if ((o.type === 'crystal' || o.type === 'ridge') && chain.length === 1 && Math.random() < 0.5) {
          for (j = 0; j < 3; j++) gems.push({ x: cx + (j - 1) * 26 * K, y: Math.min(o.top + 28 * K, 100 * K), ph: Math.random() * 6 });
        } else if (o.type === 'tower') {
          for (j = 0; j < 3; j++) gems.push({ x: cx + (j - 1) * 26 * K, y: o.top + 34 * K, ph: Math.random() * 6 });
        } else if (o.type === 'hang' && Math.random() < 0.6) {
          for (j = 0; j < 3; j++) gems.push({ x: cx + (j - 1) * 20 * K, y: 16 * K, ph: Math.random() * 6 });
        }
        obs.push(o); prev = o;
      }

      nextGap = speed * 0.7 + 150 * K + Math.random() * 200 * K + (o.type === 'rock' ? speed * 0.3 : 0);
      if (score > 25 && o.type !== 'rock' && Math.random() < 0.14) {
        var kinds = ['shield', 'shield', 'slow', 'slow', 'mag'];
        pows.push({ type: kinds[Math.floor(Math.random() * kinds.length)], x: o.x + o.w + nextGap * 0.5, y: 42 * K, ph: Math.random() * 6 });
      }
    }

    function update(dt) {
      t += dt;
      d.cr = (d.cr || 0) + ((d.duck ? 1 : 0) - (d.cr || 0)) * Math.min(1, 22 * dt);
      if (Math.abs((d.duck ? 1 : 0) - d.cr) < 0.01) d.cr = d.duck ? 1 : 0;
      if (state !== ovPrev) { ovPrev = state; ov = 0; }
      ov += dt;
      if (state === 'run') {
        speed = Math.min(620, speed + 7 * dt);
        score += dt * speed * 0.03;
        d.run += dt;
        slow = Math.max(0, slow - dt); mag = Math.max(0, mag - dt);
        var mv = speed * (slow > 0 ? 0.62 : 1);
        var air = d.y < 0 || d.vy < 0;
        d.vy += 1900 * K * (d.duck && air ? 2.4 : 1) * dt; d.y += d.vy * dt;
        if (d.y >= 0) { if (air && d.jumps) { burst(DX(), G, 6, 50 * K, 10); mus.sfx('land'); } d.y = 0; d.vy = 0; d.jumps = 0; }
        var lo = obs[obs.length - 1];
        if (!lo || lo.x + lo.w < W - nextGap) spawn();
        obs.forEach(function (o) {
          o.x -= mv * o.v * dt;
          if (o.amp) { o.bot = o.base + Math.sin(t * 3.2 + o.ph) * o.amp; o.top = o.bot + o.h; }
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
            if (d.shield) { d.shield = false; shake = 8; mus.sfx('shield'); burst(o.x + o.w / 2, G - Math.min(o.top, 120 * K) / 2, 18, 140 * K, 20); obs.splice(i, 1); i--; continue; }
            return die();
          }
        }
        for (i = gems.length - 1; i >= 0; i--) {
          var g = gems[i], gy = G - g.y, r = 9 * K;
          if (g.x > b.x1 - r && g.x < b.x2 + r && gy > b.t - r && gy < b.b + r) {
            gems.splice(i, 1); score += 5; mus.sfx('gem'); burst(g.x, gy, 8, 80 * K, 10);
          }
        }
        for (i = pows.length - 1; i >= 0; i--) {
          var q = pows[i], qy = G - q.y, rq = 12 * K;
          if (q.x > b.x1 - rq && q.x < b.x2 + rq && qy > b.t - rq && qy < b.b + rq) {
            pows.splice(i, 1); burst(q.x, qy, 14, 110 * K, 10); mus.sfx('power');
            if (q.type === 'shield') d.shield = true; else if (q.type === 'slow') slow = 6; else mag = 7;
          }
        }
        var ms = Math.floor(score / 100);
        if (ms > lastMs) { lastMs = ms; mus.sfx('ms'); toast = { text: String(ms * 100), life: 1.2 }; burst(W / 2, H * 0.3, 16, 120 * K, 20); }
        var zn = 0; ZONES.forEach(function (z, n) { if (score >= z.at) zn = n; });
        if (zn > zlast) { zlast = zn; mus.zone(zn); mus.sfx('zone'); ztoast = { text: ZONES[zn].name, life: 2.6 }; burst(W / 2, H * 0.3, 18, 130 * K, 20); }
        scoreEl.textContent = Math.floor(score);
      } else if (state === 'idle' || state === 'paused') {
        speed = 60;
      }
      scroll += (state === 'dead' ? 0 : speed * (slow > 0 ? 0.62 : 1)) * dt;
      if (toast) { toast.life -= dt; if (toast.life <= 0) toast = null; }
      if (ztoast) { ztoast.life -= dt; if (ztoast.life <= 0) ztoast = null; }
      if (Math.random() < dt * 0.7) sstars.push({ x: Math.random() * W, y: H * 0.14 + Math.random() * H * 0.1, vy: 0, life: 1 });
      sstars.forEach(function (s) { s.vy += 520 * dt; s.y += s.vy * dt; if (s.y > G) s.life = 0; });
      sstars = sstars.filter(function (s) { return s.life > 0; });
      parts.forEach(function (p) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 220 * dt; p.life -= dt * 1.6; });
      parts = parts.filter(function (p) { return p.life > 0; });
      shake = Math.max(0, shake - dt * 30);
    }

    function die() {
      state = 'dead'; deadAt = performance.now(); shake = 10; mus.sfx('die'); d.duck = false;
      burst(DX(), G + d.y - 22 * K, 30, 150 * K, 40);
      var s = Math.floor(score);
      if (s > best) {
        best = s; newRec = true; bestEl.textContent = best;
        try { localStorage.setItem('gq_dragon_best', best); } catch (e) { }
      }
      stats.games++; stats.total += s; if (best > stats.best) stats.best = best;
      lsSet('gq_stats', stats); renderStats(); report(s);
    }

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

    function hang(o) {
      var tipY = G - o.bot, cx = o.x + o.w / 2, hw = o.w / 2;
      var g = ctx.createLinearGradient(0, 0, 0, tipY);
      g.addColorStop(0, 'rgba(' + RGB + ',.1)'); g.addColorStop(1, 'rgba(' + RGB + ',.95)');
      ctx.beginPath();
      ctx.moveTo(cx - hw, -4); ctx.lineTo(cx - hw * 0.7, tipY - 26 * K); ctx.lineTo(cx, tipY);
      ctx.lineTo(cx + hw * 0.7, tipY - 26 * K); ctx.lineTo(cx + hw, -4); ctx.closePath();
      ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = AC; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx - hw * 0.15, tipY - 6 * K); ctx.lineTo(cx - hw * 0.3, tipY - 60 * K);
      ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.stroke();
    }

    function bubble(x, yb, D) {
      if (!d.shield || state === 'dead') return;
      ctx.strokeStyle = 'rgba(' + RGB + ',' + (0.55 + 0.3 * Math.sin(t * 6)) + ')'; ctx.lineWidth = 2;
      ctx.fillStyle = 'rgba(' + RGB + ',.1)';
      ctx.beginPath(); ctx.arc(x + 6 * K * D, yb - (24 - 9 * D) * K, (42 - 6 * D) * K, 0, 7); ctx.fill(); ctx.stroke();
    }

    function paw(px, py, c) {
      ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(px, py, 7, 3.2, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#f4ffc4';
      for (var k = 0; k < 3; k++) {
        ctx.beginPath(); ctx.moveTo(px + 5.5, py - 1.8 + k * 1.6); ctx.lineTo(px + 9, py - 0.8 + k * 1.6); ctx.lineTo(px + 5.5, py + k * 1.6); ctx.closePath(); ctx.fill();
      }
    }

    function dragon() {
      var dead = state === 'dead', air = d.y < -1, i;
      var c = dead ? 0 : (d.cr || 0);
      function L(a, b) { return a + (b - a) * c; }
      var running = state === 'run' && !air;
      var x = DX(), yb = G + d.y;
      var sh = Math.max(0.25, 1 + d.y / (120 * K));
      ctx.fillStyle = 'rgba(0,0,0,.35)';
      ctx.beginPath(); ctx.ellipse(x + L(0, 8) * K, G + 2, L(22, 32) * K * sh, 3.5 * K * sh, 0, 0, 7); ctx.fill();

      ctx.save(); ctx.translate(x, yb); ctx.scale(K, K);
      if (dead) ctx.rotate(0.3);
      ctx.translate(0, running ? -Math.abs(Math.sin(d.run * L(14, 20))) * L(2, 0.8) : Math.sin(t * 3) * (1 - c));
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.shadowColor = 'rgba(' + RGB + ',.45)'; ctx.shadowBlur = 12;

      if (running && c > 0.05) {
        ctx.save(); ctx.shadowBlur = 0; ctx.lineWidth = 1.6;
        for (i = 0; i < 3; i++) {
          var lx = -58 - ((t * 260 + i * 17) % 34);
          ctx.strokeStyle = 'rgba(' + RGB + ',' + ((0.4 - i * 0.1) * c) + ')';
          ctx.beginPath(); ctx.moveTo(lx, -6 - i * 6); ctx.lineTo(lx - 14, -6 - i * 6); ctx.stroke();
        }
        ctx.restore();
      }

      var w1 = Math.sin(t * 7) * 2, w2 = Math.sin(t * 7 + 1) * 3, wag = Math.sin(t * 8) * 4;
      var tx0 = L(-12, -14), ty0 = L(-24, -18), tcx = L(-30, -32), tcy = L(-20, -14 + w1);
      var tex = L(-42, -50), tey = L(-25 + wag, -9 + w2), tby = L(-11, -6), tcby = L(-9, -4 + w1 * 0.5);
      ctx.fillStyle = AC2;
      ctx.beginPath(); ctx.moveTo(tx0, ty0); ctx.quadraticCurveTo(tcx, tcy, tex, tey);
      ctx.quadraticCurveTo(tcx, tcby, tx0, tby); ctx.closePath(); ctx.fill();
      ctx.fillStyle = DK;
      [0.38, 0.62, 0.82].forEach(function (u) {
        var px = (1 - u) * (1 - u) * tx0 + 2 * u * (1 - u) * tcx + u * u * tex;
        var py = (1 - u) * (1 - u) * ty0 + 2 * u * (1 - u) * tcy + u * u * tey;
        ctx.beginPath(); ctx.moveTo(px - 3, py + 2); ctx.lineTo(px, py - 4.5); ctx.lineTo(px + 3, py + 2); ctx.closePath(); ctx.fill();
      });
      ctx.beginPath(); ctx.moveTo(tex + 1, tey); ctx.lineTo(tex - 8, tey - 5); ctx.lineTo(tex - 7, tey + 5.5); ctx.closePath(); ctx.fill();

      var ph = Math.sin(d.run * L(14, 22)), amp = L(6, 3), sw = running ? ph * amp : 0;
      var lfA = running ? Math.max(0, ph) * L(4, 1) : 0, lfB = running ? Math.max(0, -ph) * L(4, 1) : 0;
      var tuck = air ? (1 - c) : 0;
      function limb(hx, hy, fx, fy, w, col) {
        ctx.strokeStyle = col; ctx.lineWidth = w;
        ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(fx, fy); ctx.stroke();
        paw(fx + 1, fy + 1.5, DK);
      }
      var fy0 = L(-5, -4) - 4 * tuck, tk = 3 * tuck;
      limb(L(-3, -1), L(-12, -9), L(-3, -2) + sw - tk, fy0 - lfA, L(6, 5), DK);
      limb(L(12, 15), L(-12, -11), L(12, 22) - sw - tk, fy0 - lfB, L(6, 5), DK);

      var bcx = L(0, 3), bcy = L(-21, -14), brx = L(18, 21), bry = L(15, 10.5) + Math.sin(t * (running ? 9 : 3)) * L(0.3, 0.5);
      var bg = ctx.createLinearGradient(0, bcy - bry, 0, bcy + bry);
      bg.addColorStop(0, AC); bg.addColorStop(1, AC2);
      ctx.fillStyle = bg; ctx.beginPath(); ctx.ellipse(bcx, bcy, brx, bry, 0, 0, 7); ctx.fill();
      ctx.shadowBlur = 0;
      var blx = L(5, 7), bly = L(-17, -9.5);
      ctx.fillStyle = 'rgba(244,255,196,.6)'; ctx.beginPath(); ctx.ellipse(blx, bly, L(10.5, 13), L(10, 5), 0, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(127,163,23,.45)'; ctx.lineWidth = 1;
      for (i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(blx + i * 5, bly - L(2.5, 4)); ctx.lineTo(blx + i * 5 + 0.5, bly + L(2.5, 4)); ctx.stroke(); }
      ctx.fillStyle = DK;
      [-13, -7, -1, 5, 11].forEach(function (sx) {
        var k = 1 - Math.pow((sx - bcx) / brx, 2); if (k <= 0) return;
        var sy = bcy - bry * Math.sqrt(k), hh = L(5.5, 5);
        ctx.beginPath(); ctx.moveTo(sx - 3.2, sy + 1.8); ctx.lineTo(sx, sy - hh); ctx.lineTo(sx + 3.2, sy + 1.8); ctx.closePath(); ctx.fill();
      });

      var flap = air ? Math.sin(t * 20) * 0.6 : Math.sin(t * (state === 'run' ? 10 : 4)) * 0.2;
      var kw = 1 - Math.pow((-3 - bcx) / brx, 2), wy = bcy - bry * Math.sqrt(Math.max(0, kw)) + 6.5;
      ctx.save(); ctx.translate(-3, wy);
      ctx.rotate(L(flap - 0.2, -0.95 + flap * 0.1)); ctx.scale(L(1, 0.85), L(1, 0.85));
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-4, -20, -19, -24);
      ctx.quadraticCurveTo(-17, -14, -13, -10); ctx.quadraticCurveTo(-10, -5, -3, -2); ctx.closePath();
      ctx.fillStyle = 'rgba(244,255,196,.93)'; ctx.fill();
      ctx.strokeStyle = AC2; ctx.lineWidth = 1.3; ctx.stroke();
      ctx.lineWidth = 0.9; ctx.beginPath();
      ctx.moveTo(-1, -3); ctx.lineTo(-15, -17); ctx.moveTo(-1, -3); ctx.lineTo(-9, -8); ctx.stroke();
      ctx.restore();

      ctx.fillStyle = AC2; ctx.beginPath(); ctx.ellipse(-7, L(-12, -9), L(7, 9), L(6, 7.5), 0, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.14)'; ctx.beginPath(); ctx.ellipse(-8.5, L(-14, -11.5), L(3.5, 4.5), L(2, 2.6), -0.3, 0, 7); ctx.fill();
      limb(L(-7, -5), L(-12, -9), L(-7, 2) - sw - tk, fy0 - lfB, L(7, 6), AC2);
      limb(L(9, 14), L(-12, -11), L(9, 26) + sw - tk, L(-5, -4.5) - 4 * tuck - lfA, L(7, 6), AC2);

      var hx = L(17, 31), hy = L(-37, -17), hr = L(14, 12.5);
      ctx.strokeStyle = AC; ctx.lineWidth = L(12, 14);
      ctx.beginPath(); ctx.moveTo(L(8, 13), L(-27, -16)); ctx.lineTo(hx - L(1, 3), hy + L(3, 0)); ctx.stroke();
      var HS = [[[-9, -10], [-13, -20], [-3, -12.5]], [[0, -13], [1, -23], [6, -11.5]]];
      var HC = [[[-6, -11], [-17, -14], [-2, -13.5]], [[-1, -11.5], [-9, -16.5], [3, -12]]];
      ctx.fillStyle = '#f4ffc4';
      for (var hn = 0; hn < 2; hn++) {
        ctx.beginPath();
        for (var j = 0; j < 3; j++) {
          var px = hx + L(HS[hn][j][0], HC[hn][j][0]), py = hy + L(HS[hn][j][1], HC[hn][j][1]);
          if (j) ctx.lineTo(px, py); else ctx.moveTo(px, py);
        }
        ctx.closePath(); ctx.fill();
      }
      ctx.fillStyle = AC;
      ctx.beginPath(); ctx.arc(hx, hy, hr, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.ellipse(hx + L(11, 10), hy + L(4, 2.5), L(8.5, 8), L(6.5, 5.8), 0, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(255,150,130,.38)'; ctx.beginPath(); ctx.ellipse(hx + 0.3, hy + 5.5, 3.1, 1.9, 0, 0, 7); ctx.fill();

      var blink = (t % 3.4) < 0.12;
      if (dead) {
        ctx.strokeStyle = '#0d0f08'; ctx.lineWidth = 1.8;
        ctx.beginPath(); ctx.moveTo(hx + 1.5, hy - 5); ctx.lineTo(hx + 7, hy); ctx.moveTo(hx + 7, hy - 5); ctx.lineTo(hx + 1.5, hy); ctx.stroke();
      } else {
        ctx.fillStyle = '#fff'; ctx.beginPath();
        ctx.ellipse(hx + L(4, 3.5), hy + L(-2.5, -2), L(4.4, 4.2), blink ? 0.7 : L(5, 3.6), 0, 0, 7); ctx.fill();
        if (!blink) {
          ctx.fillStyle = '#0d0f08'; ctx.beginPath(); ctx.arc(hx + L(5.6, 4.8), hy + L(-2.3, -1.6), L(2.8, 2.3), 0, 7); ctx.fill();
          ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(hx + L(6.6, 5.6), hy + L(-3.8, -2.8), L(1, 0.8), 0, 7); ctx.fill();
        }
        if (c > 0.02) {
          ctx.save(); ctx.globalAlpha = c;
          ctx.fillStyle = AC;
          ctx.beginPath(); ctx.moveTo(hx - 1.5, hy - 7); ctx.lineTo(hx + 8.8, hy - 7); ctx.lineTo(hx + 8.8, hy - 3.4); ctx.lineTo(hx - 1.5, hy - 5.4); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = '#0d0f08'; ctx.lineWidth = 1.4;
          ctx.beginPath(); ctx.moveTo(hx - 1.2, hy - 5.4); ctx.lineTo(hx + 8.4, hy - 3.6); ctx.stroke();
          ctx.restore();
        }
      }
      var nx = hx + L(16.5, 15.5), ny = hy + L(2, 1);
      ctx.fillStyle = '#0d0f08'; ctx.beginPath(); ctx.arc(nx, ny, 0.9, 0, 7); ctx.fill();
      ctx.strokeStyle = '#0d0f08'; ctx.lineWidth = L(1.3, 1.2);
      ctx.beginPath(); ctx.moveTo(hx + 7, hy + L(7, 6.5)); ctx.quadraticCurveTo(hx + L(11.5, 11.5), hy + L(10, 8.5), nx, hy + L(6.5, 5.5)); ctx.stroke();

      if (!dead) {
        for (i = 0; i < 2; i++) {
          var q = (t * 1.6 + i * 0.5) % 1;
          ctx.fillStyle = 'rgba(255,255,255,' + ((1 - q) * 0.45 * (0.35 + 0.65 * c)) + ')';
          ctx.beginPath(); ctx.arc(nx + 1.5 + q * 8, ny - 2 - q * 9, 1.2 + q * 2.2, 0, 7); ctx.fill();
        }
      }
      ctx.restore();

      bubble(x, yb, c);
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
      if (d.shield) items.push(T('hud-shield'));
      if (slow > 0) items.push(T('hud-slow', { s: Math.ceil(slow) }));
      if (mag > 0) items.push(T('hud-mag', { s: Math.ceil(mag) }));
      ctx.font = '800 ' + fs + 'px ' + FONT; ctx.textAlign = 'left'; ctx.fillStyle = AC;
      ctx.textBaseline = 'alphabetic';
      items.forEach(function (s, i) { ctx.fillText(s, 12, fs + 16 + i * (fs + 7)); });
      if (toast) {
        ctx.globalAlpha = Math.min(1, toast.life); ctx.textAlign = 'center';
        ctx.font = '800 ' + Math.max(18, Math.min(32, Math.round(H / 9))) + 'px ' + FONT;
        ctx.fillText(toast.text, W / 2, H * 0.3 - (1.2 - toast.life) * 14);
        ctx.globalAlpha = 1;
      }
      if (ztoast) {
        ctx.globalAlpha = Math.max(0, Math.min(1, ztoast.life, (2.6 - ztoast.life) * 3)); ctx.textAlign = 'center';
        ctx.font = '800 ' + Math.max(12, Math.min(20, Math.round(H / 12))) + 'px ' + FONT;
        ctx.shadowColor = 'rgba(0,0,0,.8)'; ctx.shadowBlur = 8;
        ctx.fillStyle = 'rgb(' + Math.min(255, zc[0] + 70) + ',' + Math.min(255, zc[1] + 70) + ',' + Math.min(255, zc[2] + 70) + ')';
        ctx.fillText(ztoast.text, W / 2, H * 0.52);
        ctx.shadowBlur = 0; ctx.globalAlpha = 1;
      }
    }

    function tint(k, a) { return 'rgba(' + Math.min(255, Math.round(zc[0] * k)) + ',' + Math.min(255, Math.round(zc[1] * k)) + ',' + Math.min(255, Math.round(zc[2] * k)) + ',' + a + ')'; }
    function rnd(n) { var x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
    function zoneMix(sc) {
      var i = 0; while (i < ZONES.length - 1 && sc >= ZONES[i + 1].at) i++;
      var a = ZONES[i], b = ZONES[i + 1], c = a.c;
      if (b) {
        var f = Math.max(0, Math.min(1, (sc - (b.at - 30)) / 30));
        if (f > 0) c = a.c.map(function (v, k) { return Math.round(v + (b.c[k] - v) * f); });
      }
      zc = c;
    }
    function spikes(par, fromTop, base, amp, wl, fill, edge) {
      var y0 = fromTop ? -10 : H + 10;
      ctx.beginPath(); ctx.moveTo(-8, y0);
      for (var x = -8; x <= W + 8; x += 5) {
        var s = x + scroll * par + 1000, cell = Math.floor(s / wl);
        var tri = 1 - Math.abs((s / wl) % 1 * 2 - 1);
        var h = base + amp * (0.4 + 0.6 * rnd(cell)) * Math.pow(tri, 1.25);
        ctx.lineTo(x, fromTop ? h : G - h);
      }
      ctx.lineTo(W + 8, y0); ctx.closePath();
      ctx.fillStyle = fill; ctx.fill();
      if (edge) { ctx.strokeStyle = edge; ctx.lineWidth = 1.2; ctx.stroke(); }
    }
    function wallCrystals() {
      var cl = 190 * K, off = scroll * 0.45, base = Math.floor(off / cl), i, k;
      for (i = -1; i <= W / cl + 1; i++) {
        var idx = base + i, r1 = rnd(idx), r2 = rnd(idx + 50), r3 = rnd(idx + 99);
        if (r1 < 0.4) continue;
        var px = i * cl - (off % cl) + r2 * cl * 0.6, py = H * (0.2 + r3 * 0.4), n = 3 + Math.floor(r1 * 3);
        var pulse = 0.6 + 0.4 * Math.sin(t * 2 + idx);
        var rg = ctx.createRadialGradient(px, py, 0, px, py, 36 * K);
        rg.addColorStop(0, tint(1, 0.32 * pulse)); rg.addColorStop(1, tint(1, 0));
        ctx.fillStyle = rg; ctx.fillRect(px - 38 * K, py - 38 * K, 76 * K, 76 * K);
        for (k = 0; k < n; k++) {
          var a = (k - (n - 1) / 2) * 0.5 + (rnd(idx + k) - 0.5) * 0.3, len = (9 + rnd(idx * 3 + k) * 11) * K;
          ctx.save(); ctx.translate(px, py); ctx.rotate(a);
          ctx.beginPath(); ctx.moveTo(-3 * K, 0); ctx.lineTo(0, -len); ctx.lineTo(3 * K, 0); ctx.closePath();
          ctx.fillStyle = tint(1.25, 0.5 + 0.3 * pulse); ctx.fill(); ctx.restore();
        }
      }
    }
    function cave() {
      var i;
      zoneMix(score);
      var bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, tint(0.05, 1)); bg.addColorStop(0.6, tint(0.13, 1)); bg.addColorStop(1, tint(0.08, 1));
      ctx.fillStyle = bg; ctx.fillRect(-12, -12, W + 24, H + 24);
      var gl = ctx.createRadialGradient(W * 0.72, H * 0.5, 0, W * 0.72, H * 0.5, Math.max(W, H) * 0.65);
      gl.addColorStop(0, tint(1, 0.2)); gl.addColorStop(1, tint(1, 0));
      ctx.fillStyle = gl; ctx.fillRect(-12, -12, W + 24, H + 24);

      var span = W + 240 * K;
      for (i = 0; i < 3; i++) {
        var sx = (((i * 0.37 * W + 80 * K - scroll * 0.05 * (1 + i * 0.2)) % span) + span) % span - 120 * K;
        var sg = ctx.createLinearGradient(0, 0, 0, G);
        sg.addColorStop(0, tint(1, 0.13)); sg.addColorStop(1, tint(1, 0));
        ctx.fillStyle = sg; ctx.beginPath();
        ctx.moveTo(sx, 0); ctx.lineTo(sx + 26 * K, 0); ctx.lineTo(sx - 64 * K, G); ctx.lineTo(sx - 100 * K, G); ctx.closePath(); ctx.fill();
      }

      spikes(0.08, true, H * 0.05, H * 0.34, 120 * K, tint(0.1, 1), null);
      spikes(0.1, false, 6 * K, H * 0.3, 140 * K, tint(0.085, 1), null);
      wallCrystals();
      spikes(0.28, true, H * 0.04, H * 0.22, 80 * K, tint(0.17, 1), tint(0.9, 0.3));
      spikes(0.3, false, 4 * K, H * 0.17, 90 * K, tint(0.14, 1), tint(0.9, 0.22));

      var fg = ctx.createLinearGradient(0, G - 50 * K, 0, G);
      fg.addColorStop(0, tint(1, 0)); fg.addColorStop(1, tint(1, 0.18));
      ctx.fillStyle = fg; ctx.fillRect(0, G - 50 * K, W, 50 * K);

      ctx.fillStyle = tint(0.12, 1); ctx.fillRect(-12, G, W + 24, H - G + 12);
      ctx.save();
      ctx.shadowColor = tint(1, 0.8); ctx.shadowBlur = 8;
      ctx.strokeStyle = tint(1.1, 0.5); ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(0, G + 0.5); ctx.lineTo(W, G + 0.5); ctx.stroke();
      ctx.restore();
      var pw = 97 * K;
      ctx.fillStyle = 'rgba(0,0,0,.45)';
      for (i = 0; i < W / pw + 2; i++) {
        var pr = rnd(i + Math.floor(scroll / (pw * (W / pw + 2))) * 7);
        var px = ((i * pw - scroll) % (W + 2 * pw) + (W + 2 * pw)) % (W + 2 * pw) - pw;
        ctx.beginPath(); ctx.ellipse(px, G + 6, (3 + pr * 5) * K, (1.2 + pr * 1.2) * K, 0, 0, 7); ctx.fill();
      }

      stars.forEach(function (s) {
        var mx = ((s.x - scroll * 0.18 * (0.5 + s.r * 0.4)) % W + W) % W, my = s.y + Math.sin(t * 0.8 + s.p) * 6;
        ctx.globalAlpha = 0.2 + 0.6 * Math.abs(Math.sin(t * 1.3 + s.p));
        ctx.fillStyle = tint(1.35, 1); ctx.beginPath(); ctx.arc(mx, my, s.r * K * 0.9, 0, 7); ctx.fill();
      });
      ctx.globalAlpha = 1;
      sstars.forEach(function (s) {
        ctx.fillStyle = tint(1.4, 0.8); ctx.beginPath(); ctx.arc(s.x, s.y, 1.5 * K, 0, 7); ctx.fill();
        ctx.strokeStyle = tint(1.4, 0.3); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(s.x, s.y - 1); ctx.lineTo(s.x, s.y - 9 * K); ctx.stroke();
      });
      var tg = ctx.createLinearGradient(0, 0, 0, H * 0.4);
      tg.addColorStop(0, 'rgba(0,0,0,.5)'); tg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = tg; ctx.fillRect(-12, -12, W + 24, H * 0.4 + 12);
    }

    function overlay() {
      if (state === 'run') return;
      var e = Math.min(1, ov / 0.3); e = 1 - Math.pow(1 - e, 3);
      var dead = state === 'dead', paused = state === 'paused', sc = Math.floor(score);
      var big = Math.max(14, Math.min(22, Math.round(H / 10))), small = Math.max(10, Math.round(big * 0.62));
      var title = T(dead ? 'ov-title-dead' : (paused ? 'ov-title-paused' : 'ov-title-idle'));
      var sub = dead ? T(newRec ? 'ov-sub-record' : 'ov-sub-score', { n: sc, best: best }) : T('ov-sub-idle');
      var cta = T(dead ? 'ov-cta-dead' : (paused ? 'ov-cta-paused' : 'ov-cta-idle'));
      var cy = H * 0.4 + (1 - e) * 8, pl = 0.55 + 0.45 * Math.sin(t * 3.2);

      ctx.save();
      ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.globalAlpha = e;
      var vg = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.6);
      vg.addColorStop(0, 'rgba(4,5,3,.55)'); vg.addColorStop(1, 'rgba(4,5,3,.2)');
      ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);

      ctx.shadowColor = 'rgba(0,0,0,.85)'; ctx.shadowBlur = 8;
      ctx.font = '800 ' + big + 'px ' + FONT; ctx.fillStyle = '#fff';
      ctx.fillText(title, W / 2, cy);
      ctx.font = '700 ' + small + 'px ' + FONT;
      ctx.fillStyle = dead && newRec ? AC : 'rgba(255,255,255,.72)';
      ctx.fillText(sub, W / 2, cy + big * 1.05);
      ctx.shadowColor = 'rgba(' + RGB + ',.7)'; ctx.shadowBlur = 6 + 8 * pl;
      ctx.font = '800 ' + small + 'px ' + FONT; ctx.fillStyle = 'rgba(' + RGB + ',' + (0.7 + 0.3 * pl) + ')';
      ctx.fillText(cta, W / 2, cy + big * 2.1);
      ctx.restore();
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      ctx.save();
      if (shake > 0) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
      cave();
      ctx.shadowColor = 'rgba(' + RGB + ',.6)'; ctx.shadowBlur = 12;
      obs.forEach(function (o) {
        if (o.type === 'rock') return rock(o);
        if (o.type === 'hang') return hang(o);
        if (o.type === 'bat' || o.type === 'swoop') return bat(o);
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
      mus.mode(state === 'run' ? (speed > 460 ? 2 : 1) : 0);
      raf = requestAnimationFrame(loop);
    }
    function start() { cancelAnimationFrame(raf); last = performance.now(); raf = requestAnimationFrame(loop); }

    function setDuck(v) { var nv = v && state === 'run'; if (nv && !d.duck) mus.sfx('duck'); d.duck = nv; }
    function typing(e) { var n = e.target && e.target.tagName; return n === 'INPUT' || n === 'TEXTAREA' || n === 'SELECT'; }
    document.addEventListener('keydown', function (e) {
      if (typing(e)) return;
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') { e.preventDefault(); action(); }
      else if (e.code === 'Enter') { if (state !== 'run') action(); }
      else if (e.code === 'ArrowDown' || e.code === 'KeyS') { e.preventDefault(); setDuck(true); }
      else if (e.code === 'Escape') { if (e.repeat) return; if (state === 'run') state = 'paused'; else if (state === 'paused') state = 'run'; }
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
