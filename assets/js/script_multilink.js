// script_multilink.js
(function() {
  // Убедимся, что DOM загружен
  function init() {
    const mainElement = document.querySelector('main');
    const music = document.getElementById("bg-music");
    const toggleBtn = document.getElementById("music-toggle");

    // ---------- SCROLLBAR ----------
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

    // ---------- MUSIC ----------
    let isPlaying = false;
    let shuffledPlaylist = [];
    let currentTrack = 0;
    const playlist = [
      "assets/music/tunetank.com_5540_motion-energy_by_cloudsystem.mp3",
      "assets/music/tunetank.com_5747_trap-ricochet_by_cloudsystem.mp3",
      "assets/music/tunetank.com_5395_arcade-machine_by_nuclear-wave.mp3",
      "assets/music/tunetank.com_6155_neon-wave_by_cloudsystem.mp3",
      "assets/music/tunetank.com_6231_exodus_by_unfeared.mp3"
    ];

    music.volume = 0.05;

    function shuffle(array) {
      let newArray = array.slice();
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

    toggleBtn.addEventListener("click", () => {
      if (isPlaying) {
        music.pause();
        toggleBtn.textContent = "Включить музыку";
      } else {
        if (shuffledPlaylist.length === 0) {
          shuffledPlaylist = shuffle(playlist);
          currentTrack = 0;
        }
        loadTrack(currentTrack);
        music.play();
        toggleBtn.textContent = "Выключить музыку";
      }
      isPlaying = !isPlaying;
    });

    music.addEventListener("ended", () => {
      currentTrack++;
      if (currentTrack >= shuffledPlaylist.length) {
        shuffledPlaylist = shuffle(playlist);
        currentTrack = 0;
      }
      loadTrack(currentTrack);
      music.play();
    });

    // ---------- YOUTUBE ----------
    let player;
    window.onYouTubeIframeAPIReady = function () {
      player = new YT.Player('yt-player', {
        events: { 'onStateChange': onPlayerStateChange }
      });
    };

    function onPlayerStateChange(event) {
      if (event.data === YT.PlayerState.PLAYING && isPlaying) {
        music.pause();
        toggleBtn.textContent = "Включить музыку";
        isPlaying = false;
      }
    }
  }

  // Если DOM уже загружен, запускаем сразу, иначе ждём
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

