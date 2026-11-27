(() => {
  const SCREEN_INTERVAL = 3500;

  const slider = document.getElementById('slider');
  const dotsEl = document.getElementById('dots');
  const prevBtn = document.querySelector('.nav-arrow.prev');
  const nextBtn = document.querySelector('.nav-arrow.next');
  const tpl = document.getElementById('cabinet-tpl');

  let current = 0;
  let total = 0;

  // ---- i18n ----
  const I18N = {
    it: {
      metaDescription: 'Una sala giochi retrò con i giochi indie di cellicom: scegli un cabinato, inserisci la moneta e gioca, dal browser o dal telefono.',
      categories: 'Categorie', comingSoon: 'Presto disponibile', language: 'Lingua',
      prev: 'Gioco precedente', next: 'Gioco successivo',
      genre: 'Genere', players: 'Giocatori', languages: 'Lingue', playNow: 'Gioca ora',
      disclaimer: 'Tutti i marchi, loghi, nomi e contenuti citati appartengono ai rispettivi proprietari e sono usati a solo scopo illustrativo e non commerciale. I giochi sono progetti indipendenti, non affiliati né approvati dai titolari di tali diritti. Per segnalazioni o richieste di rimozione, contattare l\'autore.',
      playAria: (name) => `Gioca a ${name}`, loadError: 'Impossibile caricare i giochi.',
    },
    en: {
      metaDescription: 'A retro arcade of indie games by cellicom: pick a cabinet, insert a coin and play, in your browser or on your phone.',
      categories: 'Categories', comingSoon: 'Coming soon', language: 'Language',
      prev: 'Previous game', next: 'Next game',
      genre: 'Genre', players: 'Players', languages: 'Languages', playNow: 'Play now',
      disclaimer: 'All trademarks, logos, names and content mentioned belong to their respective owners and are used for illustrative, non-commercial purposes only. The games are independent projects, not affiliated with or endorsed by those rights holders. For takedown requests or concerns, please contact the author.',
      playAria: (name) => `Play ${name}`, loadError: 'Unable to load games.',
    },
  };
  const LANG_NAMES = { it: 'Italiano', en: 'English' };
  const LANG_FLAGS = { it: '🇮🇹', en: '🇬🇧' };
  // chip colors: each distinct genre gets the next palette color (same genre = same color everywhere)
  const CHIP_COLORS = ['#ff2bd6', '#22e1ff', '#ffd84a', '#18e07a', '#ff7a3d', '#a66bff', '#ff4d6d', '#4dd2ff'];
  const genreColors = new Map();
  const chipColor = (key) => {
    const k = String(key).toLowerCase();
    if (!genreColors.has(k)) genreColors.set(k, CHIP_COLORS[genreColors.size % CHIP_COLORS.length]);
    return genreColors.get(k);
  };
  const STORAGE_KEY = 'celligames-lang';

  function detectLang() {
    let saved = null;
    try { saved = localStorage.getItem(STORAGE_KEY); } catch (_) { /* storage blocked */ }
    if (saved && I18N[saved]) return saved;
    const prefs = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || 'en'];
    for (const l of prefs) {
      const code = String(l).slice(0, 2).toLowerCase();
      if (I18N[code]) return code;
    }
    return 'en';
  }

  let lang = detectLang();
  const t = (key, ...args) => {
    const v = I18N[lang][key];
    return typeof v === 'function' ? v(...args) : v;
  };
  // a game field can be a plain string or { it, en }
  const loc = (v) => (v && typeof v === 'object' ? v[lang] || v.en || v.it || '' : v || '');

  const slideGames = [];

  function buildCabinet(game) {
    const node = tpl.content.firstElementChild.cloneNode(true);
    const logo = node.querySelector('.logo');
    logo.textContent = game.name;
    if (game.color) logo.style.color = game.color;
    node.querySelector('.info-name').textContent = game.name;
    const link = node.querySelector('.info-link');
    link.href = game.url;
    link.addEventListener('click', (e) => {
      // keep ctrl/cmd/middle click as a normal link (new tab)
      if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      insertCoin(node, game.url);
    });
    const door = node.querySelector('.coin-door');
    door.addEventListener('click', () => insertCoin(node, game.url));

    const screen = node.querySelector('.screen');
    // a video (YouTube link or video file) has priority over the screenshots
    if (game.video && mountVideo(screen, game)) return node;

    const imgs = (game.screens || []).map((src, i) => {
      const img = document.createElement('img');
      img.src = src;
      img.alt = `${game.name} screenshot ${i + 1}`;
      img.loading = i === 0 ? 'eager' : 'lazy';
      if (i === 0) img.classList.add('is-visible');
      screen.appendChild(img);
      return img;
    });

    if (imgs.length > 1) {
      let idx = 0;
      setInterval(() => {
        imgs[idx].classList.remove('is-visible');
        idx = (idx + 1) % imgs.length;
        imgs[idx].classList.add('is-visible');
      }, SCREEN_INTERVAL);
    }
    return node;
  }

  // YouTube id from youtu.be/ID, watch?v=ID, embed/ID, shorts/ID
  function youTubeId(url) {
    const m = String(url).match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/))([\w-]{11})/);
    return m ? m[1] : null;
  }

  // ---- YouTube: show only the picture ----
  // The player is hidden until it is actually playing (no thumbnail / big play button / title),
  // it is 3x taller than the screen so the title bar and the logo fall outside the visible area,
  // it never receives the mouse (no hover controls) and it restarts just before the end
  // (no end screen, no suggested videos).
  let ytApi = null;
  function loadYouTubeApi() {
    if (!ytApi) {
      ytApi = new Promise((resolve) => {
        const prev = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = () => { if (prev) prev(); resolve(window.YT); };
        const s = document.createElement('script');
        s.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(s);
      });
    }
    return ytApi;
  }

  function mountYouTube(screen, ytId, name) {
    const wrap = document.createElement('div');
    wrap.className = 'yt-wrap';
    const target = document.createElement('div');
    wrap.appendChild(target);
    screen.appendChild(wrap);

    loadYouTubeApi().then((YT) => {
      let loopTimer = null;
      const player = new YT.Player(target, {
        host: 'https://www.youtube-nocookie.com',
        videoId: ytId,
        playerVars: {
          autoplay: 1, mute: 1, controls: 0, disablekb: 1, fs: 0, rel: 0,
          playsinline: 1, iv_load_policy: 3, modestbranding: 1, cc_load_policy: 0,
          origin: location.origin,
        },
        events: {
          onReady: (e) => {
            const iframe = e.target.getIframe();
            iframe.title = `${name} video`;
            iframe.tabIndex = -1;
            e.target.mute();
            e.target.playVideo();
          },
          onStateChange: (e) => {
            if (e.data === YT.PlayerState.PLAYING) {
              wrap.classList.add('is-playing');
              clearInterval(loopTimer);
              loopTimer = setInterval(() => {
                const d = player.getDuration();
                if (d && player.getCurrentTime() > d - 0.4) player.seekTo(0, true);
              }, 200);
            } else if (e.data === YT.PlayerState.ENDED) {
              player.seekTo(0, true);
              player.playVideo();
            } else if (e.data === YT.PlayerState.PAUSED) {
              player.playVideo(); // nothing in the page should be able to pause it
            }
          },
        },
      });
    });
  }

  function mountVideo(screen, game) {
    const ytId = youTubeId(game.video);
    const isFile = /\.(mp4|webm|ogv|mov)(\?|#|$)/i.test(game.video);
    if (!ytId && !isFile) return false; // unknown format: fall back to screenshots
    // poster underneath while the video loads: YouTube thumbnail, or the first screenshot
    // maxresdefault is 16:9 (fills the screen); hqdefault always exists but has black bars
    const posterSrc = ytId ? `https://i.ytimg.com/vi/${ytId}/maxresdefault.jpg` : game.screens && game.screens[0];
    if (posterSrc) {
      const poster = document.createElement('img');
      if (ytId) poster.onerror = () => { poster.onerror = null; poster.src = `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`; };
      poster.src = posterSrc;
      poster.alt = '';
      poster.className = 'is-visible';
      screen.appendChild(poster);
    }
    // YouTube refuses to embed in pages opened from disk (file://, "error 153"):
    // there the thumbnail stays as a still frame; the video plays once the site is online
    if (ytId && location.protocol === 'file:') {
      console.info(`[celligames] YouTube video for ${game.name} plays only when the page is served over http(s).`);
      return true;
    }
    if (ytId) {
      mountYouTube(screen, ytId, game.name);
      return true;
    }
    const video = document.createElement('video');
    video.className = 'screen-video screen-video--file';
    Object.assign(video, { src: game.video, autoplay: true, muted: true, loop: true, playsInline: true });
    video.setAttribute('muted', '');
    video.setAttribute('aria-label', `${game.name} video`);
    screen.appendChild(video);
    return true;
  }

  // texts that depend on the current language
  function fillTexts(node, game) {
    const players = Math.max(1, Math.min(4, parseInt(game.players, 10) || 1));
    node.querySelector('.desc').textContent = loc(game.description);
    const genreEl = node.querySelector('.spec-genre');
    genreEl.textContent = '';
    const genres = game.genres || (game.genre ? [game.genre] : []);
    genres.forEach((g) => {
      const chip = document.createElement('span');
      chip.className = 'chip';
      chip.textContent = loc(g);
      chip.style.setProperty('--chip', chipColor(typeof g === 'object' ? g.en || g.it : g));
      genreEl.appendChild(chip);
    });
    if (!genres.length) genreEl.textContent = '—';
    node.querySelector('.spec-players').textContent = players === 1 ? '1' : `1–${players}`;
    const codes = game.languages || [];
    const langsEl = node.querySelector('.spec-langs');
    langsEl.textContent = codes.length ? codes.map((c) => LANG_FLAGS[c] || String(c).toUpperCase()).join(' ') : '—';
    langsEl.title = codes.map((c) => LANG_NAMES[c] || c).join(', ');
    node.querySelector('.info-link').setAttribute('aria-label', t('playAria', game.name));
    node.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  }

  function setLang(next) {
    if (!I18N[next]) return;
    lang = next;
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (_) { /* storage blocked */ }
    document.documentElement.lang = lang;
    document.querySelectorAll('meta[name="description"], meta[property="og:description"]')
      .forEach((m) => m.setAttribute('content', t('metaDescription')));
    document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
    document.querySelectorAll('[data-i18n-aria]').forEach((el) => el.setAttribute('aria-label', t(el.dataset.i18nAria)));
    document.querySelectorAll('[data-i18n-title]').forEach((el) => { el.title = t(el.dataset.i18nTitle); });
    document.querySelectorAll('.lang-btn').forEach((b) => {
      const on = b.dataset.lang === lang;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    [...slider.children].forEach((node, i) => { if (slideGames[i]) fillTexts(node, slideGames[i]); });
  }

  document.querySelectorAll('.lang-btn').forEach((b) => b.addEventListener('click', () => setLang(b.dataset.lang)));

  // ---- looping carousel ----
  // Every slide sits at an offset from the center (0 = visible, -1 = left, +1 = right).
  // Offsets wrap around, so after the last game comes the first one again.
  let offs = [];

  const mod = (k, n) => ((k % n) + n) % n;
  // offset of slide idx when `center` is in the middle; ties (even counts) go to the `tie` side
  function wrapOffset(idx, center, tie) {
    const n = total;
    let m = mod(idx - center, n);
    if (m > n / 2) m -= n;
    else if (m === n / 2) m = tie < 0 ? -m : m;
    return m;
  }

  function place(idx, o) {
    const slide = slider.children[idx];
    const show = slide.firstElementChild;
    const a = Math.min(1, Math.abs(o));
    const c = Math.max(-1.5, Math.min(1.5, o));
    slide.style.transform = `translateX(${o * 100}%)`;
    show.style.transform = `translateX(${c * -22}%) rotateY(${c * -40}deg) scale(${1 - a * 0.3})`;
    show.style.opacity = String(1 - a * 0.75);
    offs[idx] = o;
  }

  // move instantly (no transition) — used to bring a slide around to the entry side
  function placeInstant(idx, o) {
    const slide = slider.children[idx];
    slide.classList.add('no-anim');
    place(idx, o);
    void slide.offsetWidth; // commit the jump before transitions come back
    slide.classList.remove('no-anim');
  }

  function setActive() {
    [...slider.children].forEach((slide, idx) => {
      slide.setAttribute('aria-hidden', idx === current ? 'false' : 'true');
      slide.inert = idx !== current;
    });
    update();
  }

  // dir: +1 = next (slides move left), -1 = previous; steps: how many games to move
  function move(dir, steps = 1) {
    if (total < 2 || coinBusy) return;
    const next = mod(current + dir * steps, total);
    for (let idx = 0; idx < total; idx++) {
      const target = wrapOffset(idx, next, -dir);
      const from = target + dir * steps;
      // a slide that is not already where the movement should start from wraps around first
      if (Math.abs(offs[idx] - from) >= 0.999) placeInstant(idx, from);
    }
    current = next;
    for (let idx = 0; idx < total; idx++) place(idx, wrapOffset(idx, current, -dir));
    setActive();
  }

  function goTo(i) {
    if (total < 2 || i === current) return;
    const diff = wrapOffset(i, current, 1); // shortest way round
    move(Math.sign(diff), Math.abs(diff));
  }

  function update() {
    [...dotsEl.children].forEach((d, i) => {
      d.classList.toggle('is-active', i === current);
      d.setAttribute('aria-current', i === current ? 'true' : 'false');
    });
  }

  function render(games) {
    total = games.length;
    games.forEach((game, i) => {
      slider.appendChild(buildCabinet(game));
      slideGames.push(game);
      const dot = document.createElement('button');
      dot.className = 'dot';
      dot.setAttribute('aria-label', game.name);
      dot.addEventListener('click', () => goTo(i));
      dotsEl.appendChild(dot);
    });
    dotsEl.hidden = total < 2;
    prevBtn.hidden = nextBtn.hidden = total < 2;
    setLang(lang);
    for (let idx = 0; idx < total; idx++) placeInstant(idx, wrapOffset(idx, 0, 1));
    setActive();
  }

  // ---- INSERT COIN: zoom on the coin slot, drop a coin, zoom into the screen, go ----
  const stage = document.querySelector('.stage');
  let coinBusy = false;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  function coinSound() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      const ac = new AC();
      const now = ac.currentTime;
      [[660, 0], [1320, 0.08]].forEach(([f, t0]) => {
        const o = ac.createOscillator();
        const g = ac.createGain();
        o.type = 'square';
        o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, now + t0);
        g.gain.exponentialRampToValueAtTime(0.08, now + t0 + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, now + t0 + (t0 ? 0.35 : 0.08));
        o.connect(g).connect(ac.destination);
        o.start(now + t0);
        o.stop(now + t0 + 0.4);
      });
      setTimeout(() => ac.close(), 800);
    } catch (_) { /* no audio, no problem */ }
  }

  // zoom the stage so that `rect` (measured before any zoom) ends up centered, scaled by k
  function zoomTo(rect, base, k) {
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const tx = window.innerWidth / 2 - base.left - k * (cx - base.left);
    const ty = window.innerHeight / 2 - base.top - k * (cy - base.top);
    stage.style.transform = `translate(${tx}px, ${ty}px) scale(${k})`;
  }

  async function insertCoin(node, url) {
    if (coinBusy || node.inert) return;
    coinBusy = true;
    const slot = node.querySelector('.coin-slot');
    const screen = node.querySelector('.screen');
    const base = stage.getBoundingClientRect();
    const slotRect = slot.getBoundingClientRect();
    const screenRect = screen.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    document.body.classList.add('coin-mode');
    // 1. zoom on the 25¢ slot
    zoomTo(slotRect, base, Math.min(6, (vh * 0.4) / slotRect.height, (vw * 0.5) / slotRect.width));
    await wait(900);
    // 2. drop the coin
    slot.classList.add('inserting');
    coinSound();
    await wait(1000);
    // 3. zoom into the screen until it fills the viewport
    zoomTo(screenRect, base, Math.max(vw / screenRect.width, vh / screenRect.height) * 1.08);
    await wait(1000);
    document.body.classList.add('coin-flash');
    await wait(350);
    window.location.assign(url);
  }

  // coming back with the browser "back" button restores the page from cache: reset it
  window.addEventListener('pageshow', () => {
    coinBusy = false;
    stage.style.transform = '';
    document.body.classList.remove('coin-mode', 'coin-flash');
    document.querySelectorAll('.coin-slot.inserting').forEach((el) => el.classList.remove('inserting'));
  });

  // ---- drag / swipe (mouse + touch) ----
  let startX = 0;
  let dragX = 0;
  let pointerId = null;
  let moved = false;

  slider.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || total < 2 || coinBusy) return;
    pointerId = e.pointerId;
    startX = e.clientX;
    moved = false;
  });
  slider.addEventListener('pointermove', (e) => {
    if (e.pointerId !== pointerId) return;
    const dx = e.clientX - startX;
    if (!moved && Math.abs(dx) < 8) return;
    if (!moved) {
      moved = true;
      try { slider.setPointerCapture(pointerId); } catch (_) { /* pointer already gone */ }
      slider.classList.add('is-dragging');
    }
    dragX = dx;
    const w = slider.clientWidth || 1;
    const revealSide = dx < 0 ? 1 : -1; // dragging left reveals the slide on the right
    for (let idx = 0; idx < total; idx++) place(idx, wrapOffset(idx, current, revealSide) + dx / w);
  });
  const endDrag = (e) => {
    if (e.pointerId !== pointerId) return;
    pointerId = null;
    slider.classList.remove('is-dragging');
    if (!moved) return;
    const threshold = Math.min(120, slider.clientWidth * 0.15);
    const dir = dragX < -threshold ? 1 : dragX > threshold ? -1 : 0;
    if (dir) {
      move(dir);
    } else {
      const back = dragX < 0 ? 1 : -1;
      for (let idx = 0; idx < total; idx++) place(idx, wrapOffset(idx, current, back));
    }
    dragX = 0;
  };
  slider.addEventListener('pointerup', endDrag);
  slider.addEventListener('pointercancel', endDrag);
  // a drag must not trigger the links underneath
  slider.addEventListener('click', (e) => {
    if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; }
  }, true);
  slider.addEventListener('dragstart', (e) => e.preventDefault());

  // ---- trackpad horizontal swipe / shift+wheel ----
  let wheelAcc = 0;
  let wheelLock = false;
  slider.addEventListener('wheel', (e) => {
    const dx = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : (e.shiftKey ? e.deltaY : 0);
    if (!dx) return;
    e.preventDefault();
    if (wheelLock) return;
    wheelAcc += dx;
    if (Math.abs(wheelAcc) > 40) {
      move(Math.sign(wheelAcc));
      wheelAcc = 0;
      wheelLock = true;
      setTimeout(() => { wheelLock = false; }, 700);
    }
  }, { passive: false });

  prevBtn.addEventListener('click', () => move(-1));
  nextBtn.addEventListener('click', () => move(1));
  document.addEventListener('keydown', (e) => {
    if (coinBusy) return;
    if (e.key === 'ArrowLeft') move(-1);
    if (e.key === 'ArrowRight') move(1);
  });

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js');

  if (window.GAMES && Array.isArray(window.GAMES.games)) {
    render(window.GAMES.games);
  } else {
    console.error('games.js mancante o non valido');
    setLang(lang);
    slider.innerHTML = `<p style="margin:auto;color:#a49fc4">${t('loadError')}</p>`;
  }
})();
