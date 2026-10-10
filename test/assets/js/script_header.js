// script_header.js — шапка Game Quest одним подключением.
//
// Как использовать: сразу после <body> (или перед </body>) добавь ОДНУ строку:
//   <script src="assets/js/script_header.js" defer></script>
//
// Скрипт сам подтянет styles_header.css + responsive_header.css и вставит шапку.
// Шапка закреплена сверху: при прокрутке остаётся на экране, сжимается и показывает полоску прокрутки.
// Необязательные настройки через data-атрибуты на этой же строке:
//   data-index="index.html"        — главная
//   data-home="multilink.html"     — страница со всеми ссылками
//   data-news="news.html"          — новости
//   data-games="games.html"        — игры
//   data-merch="merch.html"        — мерч
//   data-schedule="schedule.html"  — график работы
//   data-spacer="false"            — не вставлять отступ под шапку (если сам оставляешь место)
(function () {
  var script = document.currentScript;
  if (!script || document.querySelector('.gq-header')) return;

  var cfg = script.dataset || {};
  var src = (script.getAttribute('src') || '').split('?')[0];
  var base = src.replace(/js\/script_header\.js$/, '');

  var HOME = cfg.home || 'multilink.html';
  var INDEX = cfg.index || './';

  var LOGO = base + 'icons/Quest.svg';
  var LOGO_FALLBACK = base + 'logo.webp';

  // 5 пунктов меню. Пока почти все ведут на страницу со всеми ссылками —
  // когда появятся отдельные страницы, укажи их через data-атрибуты.
  var NAV = [
    { label: 'Главная',       href: INDEX },
    { label: 'Новости',       href: cfg.news || HOME },
    { label: 'Игры',          href: cfg.games || HOME },
    { label: 'Мерч',          href: cfg.merch || HOME },
    { label: 'График работы', href: cfg.schedule || HOME, live: true }
  ];

  // Рабочее время (МОСКОВСКОЕ) — для зелёной точки у «График работы». Совпадает с футером.
  var HOURS = { days: [1, 2, 3, 4, 5], from: 10, to: 19 };

  function loadCss(name) {
    return new Promise(function (resolve) {
      var link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = base + 'css/' + name;
      link.onload = link.onerror = function () { resolve(); };
      document.head.appendChild(link);
    });
  }

  // Текущее время в Москве
  function mskInfo() {
    var dayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    try {
      var parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Europe/Moscow', weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23'
      }).formatToParts(new Date());
      var o = {};
      parts.forEach(function (p) { o[p.type] = p.value; });
      if (dayMap[o.weekday] === undefined) return null;
      var h = parseInt(o.hour, 10), m = parseInt(o.minute, 10);
      return { day: dayMap[o.weekday], h: h, m: m, hour: h + m / 60 };
    } catch (e) { return null; }
  }

  function isOnline() {
    var t = mskInfo();
    return !!t && HOURS.days.indexOf(t.day) !== -1 && t.hour >= HOURS.from && t.hour < HOURS.to;
  }

  function samePage(href) {
    try {
      var u = new URL(href, location.href);
      var norm = function (p) { return p.replace(/index\.html?$/, '').replace(/\/+$/, '') || '/'; };
      return u.origin === location.origin && norm(u.pathname) === norm(location.pathname) && !u.hash;
    } catch (e) { return false; }
  }

  // Активный пункт — только если страница однозначно совпала с одним пунктом
  var matches = NAV.filter(function (n) { return samePage(n.href); });
  var activeItem = matches.length === 1 ? matches[0] : null;

  function item(n, cls) {
    return '<li style="--i:' + NAV.indexOf(n) + '"><a class="' + cls + (n === activeItem ? ' is-active' : '') + '" href="' + n.href + '"' +
      (n === activeItem ? ' aria-current="page"' : '') + '>' + n.label +
      (n.live ? '<span class="gq-header__live" hidden></span>' : '') + '</a></li>';
  }

  var header = document.createElement('header');
  header.className = 'gq-header is-pending';
  header.setAttribute('role', 'banner');
  header.innerHTML =
    '<div class="gq-header__wrap">' +
      '<div class="gq-header__bar">' +
        '<a class="gq-header__brand" href="' + INDEX + '" aria-label="Game Quest — на главную">' +
          '<img class="gq-header__logo" src="' + LOGO + '" alt="" height="40">' +
          '<span class="gq-header__name">Game Quest</span>' +
        '</a>' +
        '<nav class="gq-header__nav" aria-label="Основное меню">' +
          '<span class="gq-header__glow" aria-hidden="true"></span>' +
          '<ul class="gq-header__list">' + NAV.map(function (n) { return item(n, 'gq-header__link'); }).join('') + '</ul>' +
        '</nav>' +
        '<div class="gq-header__actions">' +
          '<button class="gq-header__xp" type="button" aria-label="Прогресс чтения страницы. Нажми, чтобы вернуться наверх">' +
            '<span class="gq-header__ring" aria-hidden="true">' +
              '<svg viewBox="0 0 44 44"><circle class="gq-header__trk" cx="22" cy="22" r="19"/><circle class="gq-header__arc" cx="22" cy="22" r="19"/></svg>' +
              '<span class="gq-header__lvl">1</span>' +
            '</span>' +
            '<span class="gq-header__xptxt">' +
              '<span class="gq-header__rank">Новичок</span>' +
              '<span class="gq-header__xpval"><span class="gq-header__xpa">0 XP</span><span class="gq-header__xpb">НАВЕРХ ↑</span></span>' +
            '</span>' +
          '</button>' +
          '<button class="gq-header__burger" type="button" aria-expanded="false" aria-controls="gq-header-panel" aria-label="Открыть меню"><i></i><i></i><i></i></button>' +
        '</div>' +
        '<span class="gq-header__progress" aria-hidden="true"></span>' +
      '</div>' +
      '<div class="gq-header__panel" id="gq-header-panel">' +
        '<ul class="gq-header__plist">' + NAV.map(function (n) { return item(n, 'gq-header__plink'); }).join('') + '</ul>' +
      '</div>' +
      '<div class="gq-header__toast" role="status" aria-live="polite">' +
        '<span class="gq-header__toast-badge">LVL 1</span>' +
        '<span class="gq-header__toast-txt"><b>Новый уровень!</b><em>Игрок</em></span>' +
      '</div>' +
    '</div>';

  var logo = header.querySelector('.gq-header__logo');
  logo.addEventListener('error', function onErr() {
    logo.removeEventListener('error', onErr);
    logo.src = LOGO_FALLBACK;
  });

  // Отступ, чтобы шапка не перекрывала начало страницы
  if (cfg.spacer !== 'false') {
    var spacer = document.createElement('div');
    spacer.className = 'gq-header-spacer';
    spacer.setAttribute('aria-hidden', 'true');
    spacer.style.height = '4.3rem';
    document.body.insertBefore(spacer, document.body.firstChild);
  }
  document.body.insertBefore(header, document.body.firstChild);

  var nav = header.querySelector('.gq-header__nav');
  var glow = header.querySelector('.gq-header__glow');
  var links = header.querySelectorAll('.gq-header__link');
  var burger = header.querySelector('.gq-header__burger');

  // ---- «Живая» подсветка пункта под курсором ----
  function moveGlow(a) {
    if (!a) { glow.classList.remove('is-on'); return; }
    glow.style.width = a.offsetWidth + 'px';
    glow.style.transform = 'translateX(' + a.offsetLeft + 'px)';
    glow.classList.add('is-on');
  }
  function resetGlow() { moveGlow(nav.querySelector('.is-active')); }

  Array.prototype.forEach.call(links, function (a) {
    a.addEventListener('mouseenter', function () { moveGlow(a); });
    a.addEventListener('focus', function () { moveGlow(a); });
  });
  nav.addEventListener('mouseleave', resetGlow);
  nav.addEventListener('focusout', function (e) { if (!nav.contains(e.relatedTarget)) resetGlow(); });
  window.addEventListener('resize', resetGlow);

  // ---- Игровой прогресс: чем дальше листаешь, тем выше уровень ----
  var xp = header.querySelector('.gq-header__xp');
  var xpBar = header.querySelector('.gq-header__arc');
  var xpLvl = header.querySelector('.gq-header__lvl');
  var xpRank = header.querySelector('.gq-header__rank');
  var xpVal = header.querySelector('.gq-header__xpa');
  var toast = header.querySelector('.gq-header__toast');
  var toastBadge = header.querySelector('.gq-header__toast-badge');
  var toastTitle = header.querySelector('.gq-header__toast-txt b');
  var toastSub = header.querySelector('.gq-header__toast-txt em');
  var RANKS = ['Новичок', 'Игрок', 'Герой', 'Легенда', 'Босс'];
  var CIRC = 2 * Math.PI * 19;
  var lastLevel = 0, wasMax = false, toastTimer = 0;

  function showToast(badge, title, sub) {
    toastBadge.textContent = badge;
    toastTitle.textContent = title;
    toastSub.textContent = sub;
    toast.classList.add('is-show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove('is-show'); }, 2800);
  }

  function updateXp(p) {
    var level = Math.min(5, Math.floor(p * 5) + 1);
    var max = p >= 0.985;
    xpBar.style.strokeDashoffset = (CIRC * (1 - p)).toFixed(2);
    xpLvl.textContent = level;
    xpRank.textContent = RANKS[level - 1];
    xpVal.textContent = max ? 'MAX' : Math.round(p * 1000) + ' XP';
    xp.classList.toggle('is-max', max);
    if (lastLevel) {
      if (level === lastLevel + 1) {
        xp.classList.remove('is-bump'); void xp.offsetWidth; xp.classList.add('is-bump');
        showToast('LVL ' + level, 'Новый уровень!', RANKS[level - 1]);
      } else if (max && !wasMax) {
        showToast('MAX', 'Квест пройден!', 'Ты дочитал до конца');
      }
    }
    lastLevel = level;
    wasMax = max;
  }
  xp.addEventListener('click', function () {
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  });

  // ---- Прокрутка: сжатие + полоска прогресса ----
  var ticking = false;
  function onScroll() {
    ticking = false;
    var y = window.pageYOffset || document.documentElement.scrollTop || 0;
    var max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    header.classList.toggle('is-scrolled', y > 24);
    var p = Math.min(1, Math.max(0, y / max));
    header.style.setProperty('--gq-p', p.toFixed(4));
    updateXp(p);
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  // ---- Мобильное меню ----
  function setOpen(open) {
    header.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
  }
  burger.addEventListener('click', function () { setOpen(!header.classList.contains('is-open')); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setOpen(false); });
  document.addEventListener('click', function (e) {
    if (header.classList.contains('is-open') && !header.contains(e.target)) setOpen(false);
  });
  header.querySelector('.gq-header__panel').addEventListener('click', function (e) {
    if (e.target.closest('a')) setOpen(false);
  });
  window.addEventListener('resize', function () { if (window.innerWidth > 860) setOpen(false); });

  // ---- Точка «на связи» у пункта «График работы» (по МСК) ----
  function updateLive() {
    var on = isOnline();
    Array.prototype.forEach.call(header.querySelectorAll('.gq-header__live'), function (d) { d.hidden = !on; });
  }
  updateLive();
  setInterval(updateLive, 30000);

  Promise.all([loadCss('styles_header.css'), loadCss('responsive_header.css')]).then(function () {
    requestAnimationFrame(function () {
      header.classList.remove('is-pending');
      resetGlow();
    });
  });
})();
