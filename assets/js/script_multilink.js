document.addEventListener('DOMContentLoaded', () => {
  const mainElement = document.querySelector('main');

  let isScrolling = false;
  let isHovering = false;
  let hideTimeout = null;

  const HIDE_DELAY = 1200; // задержка исчезновения

  function showScrollbar() {
    mainElement.classList.add('show-scrollbar');
  }

  function hideScrollbar() {
    mainElement.classList.remove('show-scrollbar');
  }

  function scheduleHide() {
    clearTimeout(hideTimeout);
    hideTimeout = setTimeout(() => {
      if (!isScrolling && !isHovering) {
        hideScrollbar();
      }
    }, HIDE_DELAY);
  }

  // Показ при скролле
  mainElement.addEventListener('scroll', () => {
    isScrolling = true;
    showScrollbar();

    clearTimeout(hideTimeout);

    setTimeout(() => {
      isScrolling = false;
      scheduleHide();
    }, 250);
  });

  // Показ при наведении мыши на контейнер
  mainElement.addEventListener('mouseenter', () => {
    isHovering = true;
    showScrollbar();
  });

  // Прятание при уходе мыши
  mainElement.addEventListener('mouseleave', () => {
    isHovering = false;
    scheduleHide();
  });

  // Если окно теряет фокус — спрятать
  window.addEventListener('blur', () => {
    hideScrollbar();
  });

  // Изначальное скрытие
  hideScrollbar();
});
