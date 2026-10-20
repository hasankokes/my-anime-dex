// MyAnimeDex landing: hero loop, scroll story, trailer modal, store links.
// No dependencies. Scroll is never intercepted: everything reads scroll position.
(() => {
  // Paste the YouTube video id here when the trailer is uploaded (e.g. 'dQw4w9WgXcQ').
  // While empty, the modal plays the self-hosted promo with sound.
  const TRAILER_YOUTUBE_ID = '';

  const root = document.documentElement;
  const mq = (q) => window.matchMedia(q);
  const reduceMotion = mq('(prefers-reduced-motion: reduce)').matches;
  const conn = navigator.connection || {};
  const lowEnd =
    conn.saveData === true ||
    /(^|-)2g$/.test(conn.effectiveType || '') ||
    (navigator.deviceMemory && navigator.deviceMemory <= 2) ||
    (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2);
  const allowVideo = !reduceMotion && !lowEnd;
  const canWebm = document.createElement('video').canPlayType('video/webm; codecs="vp9"') !== '';
  const ext = canWebm ? 'webm' : 'mp4';

  const loadVideo = (v, base, type = ext) => {
    if (v.dataset.loaded) return;
    v.dataset.loaded = '1';
    v.src = `${base}.${type}`;
    v.addEventListener('playing', () => v.classList.add('is-playing'), { once: true });
  };
  const play = (v) => { const p = v.play(); if (p) p.catch(() => {}); };

  // ---- Store links: send phones straight to their store ----
  const ua = navigator.userAgent;
  const isIOS = /iPhone|iPad|iPod/.test(ua) || (ua.includes('Mac') && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/.test(ua);
  const storeHref = isIOS
    ? 'https://apps.apple.com/app/id6758043488'
    : isAndroid
      ? 'https://play.google.com/store/apps/details?id=com.myanimedex.app'
      : null;
  if (storeHref) document.querySelectorAll('[data-store-link]').forEach((a) => (a.href = storeHref));

  // ---- Hero loop: starts after first paint so it never competes with the poster ----
  const hero = document.querySelector('.hero-video');
  if (hero && allowVideo) {
    const start = () => {
      const wide = mq('(min-width: 900px)').matches;
      loadVideo(hero, wide ? hero.dataset.wide : hero.dataset.tall);
      play(hero);
    };
    const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 200));
    if (document.readyState === 'complete') idle(start);
    else window.addEventListener('load', () => idle(start), { once: true });
    // pause when off screen
    new IntersectionObserver(([e]) => {
      if (!hero.dataset.loaded) return;
      e.isIntersecting ? play(hero) : hero.pause();
    }).observe(hero);
  }

  // ---- Scroll story ----
  const story = document.querySelector('.story-body');
  const steps = [...document.querySelectorAll('.step')];
  const desktop = mq('(min-width: 900px) and (min-height: 560px)');
  const use3d = () => desktop.matches && !reduceMotion && !lowEnd;

  // Mobile / fallback: each step's clip plays while it is on screen
  const miniVideos = [...document.querySelectorAll('.step-media video')];
  const miniObserver = new IntersectionObserver(
    (entries) => {
      for (const { target: v, isIntersecting, intersectionRatio } of entries) {
        if (root.classList.contains('has-3d') || !allowVideo) continue;
        if (isIntersecting && intersectionRatio >= 0.5) {
          loadVideo(v, `assets/clips/${v.dataset.clip}`, 'mp4');
          play(v);
        } else if (v.dataset.loaded) v.pause();
      }
    },
    { threshold: [0, 0.5] }
  );
  miniVideos.forEach((v) => miniObserver.observe(v));

  // Desktop: pinned phone (CSS sticky), screen + cards follow scroll position
  const rig = document.querySelector('.rig');
  const layers = [...document.querySelectorAll('.layer')];
  const pops = [...document.querySelectorAll('.pop')];
  const dots = [...document.querySelectorAll('.dots li')];
  let active = -1;
  let ticking = false;

  const ensureLayerVideo = (i) => {
    const layer = layers[i];
    if (!layer || !allowVideo || !layer.dataset.clip) return null;
    let v = layer.querySelector('video');
    if (!v) {
      v = document.createElement('video');
      v.muted = true; v.loop = true; v.playsInline = true;
      v.setAttribute('muted', ''); v.setAttribute('playsinline', '');
      v.style.opacity = '0';
      v.addEventListener('playing', () => (v.style.opacity = '1'), { once: true });
      layer.appendChild(v);
      loadVideo(v, `assets/clips/${layer.dataset.clip}`, 'mp4');
    }
    return v;
  };

  const setActive = (i) => {
    if (i === active) return;
    active = i;
    layers.forEach((l, j) => {
      l.classList.toggle('is-active', j === i);
      const v = l.querySelector('video');
      if (v && j !== i) v.pause();
    });
    pops.forEach((p, j) => p.classList.toggle('on', j === i));
    dots.forEach((d, j) => d.classList.toggle('on', j === i));
    steps.forEach((s, j) => s.classList.toggle('on', j === i));
    const v = ensureLayerVideo(i);
    if (v) { v.currentTime = 0; play(v); }
    ensureLayerVideo(i + 1); // preload the next screen
  };

  const update = () => {
    ticking = false;
    if (!root.classList.contains('has-3d')) return;
    const vh = window.innerHeight;
    const box = story.getBoundingClientRect();
    const total = box.height - vh;
    const p = Math.min(1, Math.max(0, -box.top / total)); // 0..1 through the story

    const n = steps.length;
    const best = Math.min(n - 1, Math.floor(p * n));
    const local = p * n - best; // 0..1 inside the current step
    pops.forEach((pop, i) => pop.style.setProperty('--par', (i === best ? local - 0.5 : 0).toFixed(3)));
    setActive(best);

    // phone turns slowly across the whole story, with a gentle float
    const ry = -16 + p * 26 + Math.sin(p * Math.PI * 6) * 3;
    const rx = 7 - p * 3;
    rig.style.setProperty('--ry', `${ry.toFixed(2)}deg`);
    rig.style.setProperty('--rx', `${rx.toFixed(2)}deg`);
    rig.style.setProperty('--fy', `${(Math.sin(p * Math.PI * 4) * 8).toFixed(1)}px`);
  };
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };

  const applyMode = () => {
    const on = use3d();
    root.classList.toggle('has-3d', on);
    if (on) {
      miniVideos.forEach((v) => v.dataset.loaded && v.pause());
      active = -1;
      update();
    } else {
      steps.forEach((s) => s.classList.remove('on'));
      layers.forEach((l) => l.querySelector('video')?.pause());
    }
  };
  if (story && rig) {
    applyMode();
    desktop.addEventListener('change', applyMode);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
  }

  // ---- Trailer modal ----
  const dialog = document.querySelector('dialog.trailer');
  const box = dialog?.querySelector('.trailer-box');
  const openTrailer = () => {
    if (!dialog) return;
    if (TRAILER_YOUTUBE_ID) {
      box.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${TRAILER_YOUTUBE_ID}?autoplay=1&rel=0&playsinline=1" title="${dialog.getAttribute('aria-label')}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`;
    } else {
      const tall = mq('(orientation: portrait) and (max-width: 899px)').matches;
      box.innerHTML = `<video controls autoplay playsinline src="assets/video/trailer-${tall ? '9x16' : '16x9'}.mp4"></video>`;
    }
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
    hero?.pause();
  };
  const closeTrailer = () => {
    box.innerHTML = '';
    if (dialog.open) dialog.close();
  };
  document.querySelectorAll('[data-trailer]').forEach((b) => b.addEventListener('click', openTrailer));
  dialog?.querySelector('.close').addEventListener('click', closeTrailer);
  dialog?.addEventListener('click', (e) => { if (e.target === dialog) closeTrailer(); });
  dialog?.addEventListener('close', () => { box.innerHTML = ''; if (hero?.dataset.loaded) play(hero); });

  // close the language menu when clicking elsewhere
  const lang = document.querySelector('details.lang');
  document.addEventListener('click', (e) => { if (lang?.open && !lang.contains(e.target)) lang.open = false; });
})();
