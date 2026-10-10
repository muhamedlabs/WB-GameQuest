// script_footer.js — футер Game Quest одним подключением.
//
// Как использовать: перед </body> любой страницы добавь ОДНУ строку:
//   <script src="assets/js/script_footer.js" defer></script>
//
// Скрипт сам подтянет styles_footer.css + responsive_footer.css, вставит разметку футера
// и прижмёт его к низу страницы, если контента мало.
// Необязательные настройки через data-атрибуты на этой же строке:
//   data-home="multilink.html"     — страница, где собраны все ссылки
//   data-index="index.html"        — адрес главной страницы (пункт «Главная»)
//   data-news="news.html"          — страница новостей
//   data-schedule="schedule.html"  — страница с подробным графиком проекта
//   data-target="#my-footer"       — вставить в конкретный элемент вместо конца <body>
(function () {
  var script = document.currentScript;
  if (!script || document.querySelector('.gq-footer')) return;

  var cfg = script.dataset || {};
  var src = (script.getAttribute('src') || '').split('?')[0];
  var base = src.replace(/js\/script_footer\.js$/, '');   // папка assets/ относительно страницы

  var HOME = cfg.home || 'multilink.html';
  var INDEX = cfg.index || './';
  var SCHEDULE = cfg.schedule || HOME;
  var NEWS = cfg.news || HOME;               // страница новостей

  var LOGO = base + 'icons/Quest.svg';
  var LOGO_FALLBACK = base + 'logo.webp';

  var COLUMNS = [
    {
      title: 'Каталог',
      wide: true,
      links: [
        { label: 'Главная',        href: INDEX },
        { label: 'Новости',        href: NEWS },
        { label: 'Игры',           href: HOME },
        { label: 'Мерч',           href: HOME },
        { label: 'Услуги',         href: HOME },
        { label: 'Сотрудничество', href: HOME }
      ]
    },
    {
      title: 'Проект',
      links: [
        { label: 'О нас',    href: HOME },
        { label: 'Вакансии', href: HOME },
        { label: 'Творцам',  href: HOME }
      ]
    },
    {
      title: 'Информация',
      links: [
        { label: 'Контакты',                    href: HOME },
        { label: 'Редакция',                    href: HOME },
        { label: 'Правила',                     href: HOME },
        { label: 'Политика конфиденциальности', href: HOME }
      ]
    }
  ];

  // Часы работы (МОСКОВСКОЕ время). Если меняешь — поправь и rows (что видно), и days/from/to (для статуса).
  var HOURS = {
    days: [1, 2, 3, 4, 5],   // 0 = вс, 1 = пн … 6 = сб
    from: 10,
    to: 19,
    rows: [
      ['Пн–Пт', '10:00–19:00'],
      ['Сб–Вс', 'выходной']
    ]
  };

  function loadCss(name) {
    return new Promise(function (resolve) {
      var link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = base + 'css/' + name;
      link.onload = link.onerror = function () { resolve(); };
      document.head.appendChild(link);
    });
  }

  // Текущее время в Москве: { day, hour } или null
  function mskNow() {
    var dayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    try {
      var parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Europe/Moscow', weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23'
      }).formatToParts(new Date());
      var o = {};
      parts.forEach(function (p) { o[p.type] = p.value; });
      if (dayMap[o.weekday] === undefined) return null;
      return { day: dayMap[o.weekday], hour: parseInt(o.hour, 10) + parseInt(o.minute, 10) / 60 };
    } catch (e) { return null; }
  }

  // Плашка «Сейчас на связи» видна только в рабочее время
  function updateStatus(footer) {
    var box = footer.querySelector('.gq-status');
    if (!box) return;
    var now = mskNow();
    var online = !!now && HOURS.days.indexOf(now.day) !== -1 && now.hour >= HOURS.from && now.hour < HOURS.to;
    box.hidden = !online;
    box.classList.toggle('is-online', online);
  }

  function build() {
    var year = new Date().getFullYear();

    var columns = COLUMNS.map(function (col) {
      return '<nav class="gq-footer__col' + (col.wide ? ' gq-footer__col--wide' : '') + '" aria-label="' + col.title + '">' +
        '<h3 class="gq-footer__title">' + col.title + '</h3>' +
        '<ul class="gq-footer__list">' +
        col.links.map(function (l) {
          return '<li><a class="gq-footer__link" href="' + l.href + '">' + l.label + '</a></li>';
        }).join('') +
        '</ul></nav>';
    }).join('');

    var hoursRows = HOURS.rows.map(function (r) {
      return '<div><dt>' + r[0] + '</dt><dd>' + r[1] + '</dd></div>';
    }).join('');

    var el = document.createElement('footer');
    el.className = 'gq-footer';
    el.setAttribute('role', 'contentinfo');
    el.innerHTML =
      '<div class="gq-footer__bg" aria-hidden="true">' +
        '<span class="gq-footer__pattern"></span>' +
        '<span class="gq-footer__mark">GAME QUEST</span>' +
      '</div>' +
      '<div class="gq-footer__inner">' +

        '<div class="gq-footer__head">' +
          '<div class="gq-footer__about">' +
            '<a class="gq-footer__brand" href="' + HOME + '">' +
              '<img class="gq-footer__logo" src="' + LOGO + '" alt="" height="38">' +
              '<span class="gq-footer__name">Game Quest</span>' +
            '</a>' +
            '<p class="gq-footer__tag">Игровые новости, обзоры, трейлеры и подборки для PS5, Xbox, ПК и Nintendo — каждый день</p>' +
          '</div>' +
          '<div class="gq-footer__cta-wrap">' +
            '<p class="gq-footer__cta-text">Соцсети, каналы и все ссылки проекта — на одной странице</p>' +
            '<a class="gq-footer__cta" href="' + HOME + '">Все ссылки проекта<span aria-hidden="true">↗</span></a>' +
          '</div>' +
        '</div>' +

        '<div class="gq-footer__cols">' +
          columns +
          '<aside class="gq-footer__hours" aria-label="Часы работы">' +
            '<h3 class="gq-footer__title">Часы работы<span class="gq-footer__tz">МСК</span></h3>' +
            '<dl class="gq-footer__hours-list">' + hoursRows + '</dl>' +
            '<p class="gq-status" hidden><span class="gq-status__dot" aria-hidden="true"></span><span class="gq-status__text">Сейчас на связи</span></p>' +
            '<a class="gq-footer__contact" href="' + SCHEDULE + '"><b>Подробный график проекта</b><span aria-hidden="true">→</span></a>' +
          '</aside>' +
        '</div>' +

        '<div class="gq-footer__bottom">' +
          '<span class="gq-footer__copy">' +
            '<span>© ' + year + ' Game Quest</span>' +
            '<span class="gq-footer__dot" aria-hidden="true"></span>' +
            '<span>Киев, Украина</span>' +
          '</span>' +
          '<p class="gq-footer__note">Материалы сайта защищены авторским правом. Названия игр, платформ и сервисов — товарные знаки их владельцев.</p>' +
        '</div>' +

      '</div>';

    var img = el.querySelector('.gq-footer__logo');
    img.addEventListener('error', function onErr() {
      img.removeEventListener('error', onErr);
      img.src = LOGO_FALLBACK;
    });
    return el;
  }

  var footer = build();
  footer.classList.add('is-pending');

  var target = cfg.target ? document.querySelector(cfg.target) : null;
  (target || document.body).appendChild(footer);

  updateStatus(footer);
  setInterval(function () { updateStatus(footer); }, 60000);

  if (!target) {
    var raf = 0;
    var stick = function () {
      var cs = getComputedStyle(document.body);
      var extra = (parseFloat(cs.paddingBottom) || 0) + (parseFloat(cs.marginBottom) || 0);
      var cur = parseFloat(footer.style.marginTop) || 0;
      var free = window.innerHeight - (footer.getBoundingClientRect().bottom + window.pageYOffset) - extra;
      var next = Math.max(0, Math.round(cur + free));
      if (next === Math.round(cur)) return;
      footer.style.marginTop = next ? next + 'px' : '';
    };
    var schedule = function () {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(stick);
    };
    window.addEventListener('resize', schedule);
    window.addEventListener('load', schedule);
    if (window.ResizeObserver) new ResizeObserver(schedule).observe(document.body);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(schedule);
    schedule();
  }

  Promise.all([loadCss('styles_footer.css'), loadCss('responsive_footer.css')]).then(function () {
    requestAnimationFrame(function () {
      footer.classList.remove('is-pending');
      if (!target) window.dispatchEvent(new Event('resize'));
    });
  });
})();
