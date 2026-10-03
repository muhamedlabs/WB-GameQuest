// script_error.js
(function () {
  function init() {
    const mainElement = document.querySelector('#main-content');

    // ---------- SCROLLBAR (только когда контент не помещается) ----------
    let isScrolling = false;
    let isHovering = false;
    let hideTimeout = null;
    const HIDE_DELAY = 1200;

    function showScrollbar() { mainElement.classList.add('show-scrollbar'); }
    function hideScrollbar() { mainElement.classList.remove('show-scrollbar'); }
    function scheduleHide() {
      clearTimeout(hideTimeout);
      hideTimeout = setTimeout(() => {
        if (!isScrolling && !isHovering) hideScrollbar();
      }, HIDE_DELAY);
    }

    mainElement.addEventListener('scroll', () => {
      isScrolling = true;
      showScrollbar();
      clearTimeout(hideTimeout);
      setTimeout(() => { isScrolling = false; scheduleHide(); }, 250);
    });
    mainElement.addEventListener('mouseenter', () => { isHovering = true; showScrollbar(); });
    mainElement.addEventListener('mouseleave', () => { isHovering = false; scheduleHide(); });
    window.addEventListener('blur', () => hideScrollbar());
    hideScrollbar();

    // ---------- СМЕНА СТАТУС-СТРОКИ ----------
    const statusLine = document.getElementById('status-line');
    const messages = [
      'Пока макет пилится, загляните в наши соцсети — там новости выходят каждый день.',
      'Шлифуем код и собираем интерфейс по кусочкам.',
      'Скоро здесь будет что-то крутое — обещаем.',
      'А пока — трейлеры, обзоры и новости ждут в соцсетях ниже.'
    ];
    let msgIndex = 0;

    if (statusLine && messages.length > 1) {
      setInterval(() => {
        statusLine.classList.add('is-swapping');
        setTimeout(() => {
          msgIndex = (msgIndex + 1) % messages.length;
          statusLine.textContent = messages[msgIndex];
          statusLine.classList.remove('is-swapping');
        }, 350);
      }, 4200);
    }

    // ---------- НАВИГАЦИЯ СТРЕЛКАМИ (удобно для Smart TV / пульта) ----------
    const focusable = Array.from(document.querySelectorAll('.link, .cta-button'));
    if (focusable.length) {
      document.addEventListener('keydown', (event) => {
        const key = event.key;
        if (!['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].includes(key)) return;

        const current = document.activeElement;
        let index = focusable.indexOf(current);
        if (index === -1) index = key === 'ArrowUp' || key === 'ArrowLeft' ? 0 : -1;

        if (key === 'ArrowDown' || key === 'ArrowRight') {
          index = (index + 1) % focusable.length;
        } else {
          index = (index - 1 + focusable.length) % focusable.length;
        }

        focusable[index].focus();
        event.preventDefault();
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
