// script_multilink.js
(function () {
  function init() {
    const mainElement = document.querySelector('#main-content');
    const music = document.getElementById('bg-music');
    const toggleBtn = document.getElementById('music-toggle');

    // scrollbar
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

    // цитата
    const quote = document.querySelector('.tg-quote');
    const quoteBody = document.getElementById('about-text');
    const quoteToggle = quote ? quote.querySelector('.tg-quote__toggle') : null;

    if (quote && quoteBody && quoteToggle) {
      let isOpen = false;

      function setState(open, focusToggle) {
        isOpen = open;
        quote.classList.toggle('is-open', open);
        quoteToggle.setAttribute('aria-expanded', String(open));
        quoteToggle.setAttribute('aria-label', open ? 'Свернуть описание' : 'Развернуть описание');
        quoteBody.style.maxHeight = open ? quoteBody.scrollHeight + 'px' : '';
        if (focusToggle) quoteToggle.focus();
      }

      quote.addEventListener('click', (event) => {
        if (isOpen) return;
        if (event.target.closest('a')) return;
        setState(true, false);
      });

      quoteToggle.addEventListener('click', (event) => {
        event.stopPropagation();
        setState(!isOpen, true);
      });

      window.addEventListener('resize', () => {
        if (isOpen) quoteBody.style.maxHeight = quoteBody.scrollHeight + 'px';
      });
    }

    // музыка
    let isPlaying = false;
    let isVideoPlaying = false;
    let shuffledPlaylist = [];
    let currentTrack = 0;
    const playlist = [
      'assets/music/tunetank.com_431_midnight-club_by_musical-bakery.mp3',
      'assets/music/tunetank.com_5540_motion-energy_by_cloudsystem.mp3',
      'assets/music/tunetank.com_5793_hard-training_by_cloudsystem.mp3',
      'assets/music/tunetank.com_5747_trap-ricochet_by_cloudsystem.mp3',
      'assets/music/tunetank.com_6212_ocean_by_slxsh.mp3',
      'assets/music/tunetank.com_5395_arcade-machine_by_nuclear-wave.mp3',
      'assets/music/tunetank.com_6240_drop-top_by_jointmane.mp3',
      'assets/music/tunetank.com_6155_neon-wave_by_cloudsystem.mp3',
      'assets/music/tunetank.com_6247_justice_by_unfeared.mp3',
      'assets/music/tunetank.com_6231_exodus_by_unfeared.mp3',
      'assets/music/tunetank.com_6683_the-odds_by_boy_.mp3',
      'assets/music/tunetank.com_6921_syndicate_by_eugene-anikin.mp3'
    ];

    if (music) music.volume = 0.05;

    function shuffle(array) {
      const newArray = array.slice();
      for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
      }
      return newArray;
    }

    function loadTrack(index) {
      music.src = shuffledPlaylist[index];
      music.load();
    }

    if (toggleBtn && music) {
      toggleBtn.addEventListener('click', () => {
        if (isPlaying) {
          music.pause();
          toggleBtn.textContent = 'Включить музыку';
          toggleBtn.classList.remove('is-playing');
          toggleBtn.setAttribute('aria-pressed', 'false');
        } else {
          if (isVideoPlaying && player && typeof player.pauseVideo === 'function') {
            player.pauseVideo();
          }

          if (shuffledPlaylist.length === 0) {
            shuffledPlaylist = shuffle(playlist);
            currentTrack = 0;
          }
          loadTrack(currentTrack);
          music.play().catch(() => {});
          toggleBtn.textContent = 'Выключить музыку';
          toggleBtn.classList.add('is-playing');
          toggleBtn.setAttribute('aria-pressed', 'true');
        }
        isPlaying = !isPlaying;
      });

      music.addEventListener('ended', () => {
        currentTrack++;
        if (currentTrack >= shuffledPlaylist.length) {
          shuffledPlaylist = shuffle(playlist);
          currentTrack = 0;
        }
        loadTrack(currentTrack);
        music.play().catch(() => {});
      });
    }

    // youtube
    let player;
    window.onYouTubeIframeAPIReady = function () {
      player = new YT.Player('yt-player', {
        events: { onStateChange: onPlayerStateChange }
      });
    };

    function onPlayerStateChange(event) {
      if (event.data === YT.PlayerState.PLAYING) {
        isVideoPlaying = true;
        if (isPlaying && music) {
          music.pause();
          toggleBtn.textContent = 'Включить музыку';
          toggleBtn.classList.remove('is-playing');
          toggleBtn.setAttribute('aria-pressed', 'false');
          isPlaying = false;
        }
      } else if (
        event.data === YT.PlayerState.PAUSED ||
        event.data === YT.PlayerState.ENDED
      ) {
        isVideoPlaying = false;
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
