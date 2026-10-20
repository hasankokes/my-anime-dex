// MyAnimeDex landing v2: playable demos, XP, 3D hero. No dependencies.
// Scroll is never intercepted: everything reads scroll position or reacts to taps.
(() => {
  // Paste the YouTube video id here when the trailer is uploaded (e.g. 'dQw4w9WgXcQ').
  // While empty, the modal plays the self-hosted promo with sound.
  const TRAILER_YOUTUBE_ID = '';

  const S = window.MAD || {};
  const root = document.documentElement;
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
  const mq = (q) => window.matchMedia(q);
  const reduceMotion = mq('(prefers-reduced-motion: reduce)').matches;
  const conn = navigator.connection || {};
  const lowEnd =
    conn.saveData === true ||
    /(^|-)2g$/.test(conn.effectiveType || '') ||
    (navigator.deviceMemory && navigator.deviceMemory <= 2) ||
    (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2);
  const allowVideo = !reduceMotion && !lowEnd;
  const finePointer = mq('(hover: hover) and (pointer: fine)').matches;
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } },
  };
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const play = (v) => { const p = v.play(); if (p) p.catch(() => {}); };
  const loadVideo = (v, src) => {
    if (v.dataset.loaded) return;
    v.dataset.loaded = '1';
    v.src = src;
    v.addEventListener('playing', () => v.classList.add('is-playing'), { once: true });
  };
  const fmt = (tpl, vars) => tpl.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');

  // ---------- AniList (single entry point, light throttling) ----------
  let lastCall = 0;
  const anilist = async (query, variables) => {
    const wait = Math.max(0, lastCall + 400 - Date.now());
    lastCall = Date.now() + wait;
    if (wait) await new Promise((r) => setTimeout(r, wait));
    const res = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query, variables }),
    });
    if (!res.ok) throw new Error(`AniList ${res.status}`);
    const json = await res.json();
    if (json.errors) throw new Error(json.errors[0].message);
    return json.data;
  };
  const titleOf = (m) => m.title.english || m.title.romaji;

  // ---------- Store links ----------
  const ua = navigator.userAgent;
  const isIOS = /iPhone|iPad|iPod/.test(ua) || (ua.includes('Mac') && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/.test(ua);
  const storeHref = isIOS
    ? 'https://apps.apple.com/app/id6758043488'
    : isAndroid ? 'https://play.google.com/store/apps/details?id=com.myanimedex.app' : null;
  if (storeHref) $$('[data-store-link]').forEach((a) => (a.href = storeHref));

  // ---------- Pointer: spotlight, magnetic buttons, hero parallax ----------
  const pointer = { x: innerWidth * 0.7, y: innerHeight * 0.3, nx: 0, ny: 0, moved: false };
  const spot = $('.fx-spot');
  const magnets = finePointer && !reduceMotion ? $$('.magnetic') : [];
  const orbit = $$('.orbit > *');
  const cssPhone = $('.css-phone');
  let pointerQueued = false;
  const onPointerFrame = () => {
    pointerQueued = false;
    spot?.style.setProperty('--sx', `${pointer.x}px`);
    spot?.style.setProperty('--sy', `${pointer.y}px`);
    for (const m of magnets) {
      const r = m.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const dx = pointer.x - cx, dy = pointer.y - cy;
      const near = Math.hypot(dx, dy) < Math.max(r.width, r.height);
      m.style.transform = near ? `translate(${dx * 0.18}px, ${dy * 0.25}px)` : '';
    }
    if (!reduceMotion) {
      cssPhone?.style.setProperty('--ty', `${-12 + pointer.nx * 14}deg`);
      cssPhone?.style.setProperty('--tx', `${6 - pointer.ny * 8}deg`);
      for (const el of orbit) {
        const d = parseFloat(el.dataset.depth || 1);
        el.style.setProperty('--px', `${pointer.nx * 14 * d}px`);
        el.style.setProperty('--py', `${pointer.ny * 10 * d}px`);
        // cards shy away from the cursor
        const r = el.getBoundingClientRect();
        const dx = r.left + r.width / 2 - pointer.x, dy = r.top + r.height / 2 - pointer.y;
        const dist = Math.hypot(dx, dy) || 1;
        const push = Math.max(0, 150 - dist) * 0.35;
        el.style.setProperty('--rx', `${(dx / dist) * push}px`);
        el.style.setProperty('--ry', `${(dy / dist) * push}px`);
      }
    }
  };
  window.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    pointer.x = e.clientX; pointer.y = e.clientY;
    pointer.nx = (e.clientX / innerWidth) * 2 - 1;
    pointer.ny = (e.clientY / innerHeight) * 2 - 1;
    pointer.moved = true;
    if (!pointerQueued) { pointerQueued = true; requestAnimationFrame(onPointerFrame); }
  }, { passive: true });

  // ---------- Hero: CSS phone first, WebGL phone when the visitor engages ----------
  const heroStage = $('.hero-stage');
  const heroScreen = $('.css-screen');
  const startCssVideo = () => {
    if (!allowVideo || !heroScreen || $('video', heroScreen)) return;
    const v = document.createElement('video');
    v.muted = true; v.loop = true; v.playsInline = true; v.setAttribute('playsinline', '');
    v.style.opacity = '0'; v.style.transition = 'opacity .5s';
    v.addEventListener('playing', () => (v.style.opacity = '1'), { once: true });
    heroScreen.appendChild(v);
    v.src = 'assets/clips/hero.mp4';
    play(v);
  };
  let glRequested = false;
  const startGL = () => {
    if (glRequested) return;
    glRequested = true;
    import('./phone3d.js')
      .then((m) => m.mountPhone($('.gl-host'), {
        videoSrc: 'assets/clips/hero.mp4',
        logoSrc: 'assets/img/icon-192.png',
        pointer,
        onReady: () => heroStage.classList.add('gl-ready'),
      }))
      .catch(() => startCssVideo());
  };
  const webgl = (() => { try { return !!document.createElement('canvas').getContext('webgl2'); } catch { return false; } })();
  if (heroStage) {
    if (reduceMotion || lowEnd || !webgl) {
      if (!reduceMotion) startCssVideo();
    } else {
      // never compete with first paint: the 3D phone loads on the first interaction,
      // or after the page settles on desktops
      const kick = () => { ['pointerdown', 'pointermove', 'touchstart', 'scroll', 'keydown'].forEach((t) => removeEventListener(t, kick)); startCssVideo(); setTimeout(startGL, 50); };
      ['pointerdown', 'pointermove', 'touchstart', 'scroll', 'keydown'].forEach((t) => addEventListener(t, kick, { passive: true, once: true }));
      if (finePointer) addEventListener('load', () => setTimeout(kick, 2500), { once: true });
    }
  }

  // ---------- Marquee (speeds up with scroll velocity) ----------
  const track = $('.marquee-track');
  if (track && !reduceMotion) {
    let x = 0, last = performance.now(), lastY = scrollY, boost = 0, running = false;
    const step = (now) => {
      if (!running) return;
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const dy = Math.abs(scrollY - lastY); lastY = scrollY;
      boost = boost * 0.9 + dy * 12;
      x -= (50 + boost) * dt;
      const half = track.scrollWidth / 2;
      if (-x >= half) x += half;
      track.style.transform = `translate3d(${x}px,0,0)`;
      requestAnimationFrame(step);
    };
    new IntersectionObserver(([e]) => {
      running = e.isIntersecting;
      if (running) { last = performance.now(); requestAnimationFrame(step); }
    }).observe(track);
  }

  // ---------- Confetti ----------
  const confettiCanvas = $('.confetti');
  const confetti = (x, y, n = 90) => {
    if (reduceMotion || !confettiCanvas) return;
    const ctx = confettiCanvas.getContext('2d');
    const dpr = Math.min(2, devicePixelRatio || 1);
    confettiCanvas.width = innerWidth * dpr; confettiCanvas.height = innerHeight * dpr;
    ctx.scale(dpr, dpr);
    const colors = ['#FACC15', '#F59E0B', '#FFFFFF', '#FDE68A'];
    const parts = Array.from({ length: n }, () => ({
      x, y, vx: (Math.random() - 0.5) * 12, vy: -Math.random() * 12 - 4,
      r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.4,
      w: 5 + Math.random() * 6, h: 3 + Math.random() * 4, c: colors[(Math.random() * colors.length) | 0],
    }));
    const t0 = performance.now();
    const frame = (now) => {
      const t = now - t0;
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      for (const p of parts) {
        p.vy += 0.35; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r);
        ctx.globalAlpha = Math.max(0, 1 - t / 1800);
        ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore();
      }
      if (t < 1800) requestAnimationFrame(frame); else ctx.clearRect(0, 0, innerWidth, innerHeight);
    };
    requestAnimationFrame(frame);
  };
  const centerOf = (el) => { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };

  // ---------- XP (same curve as the app: 30 XP per level below 10, 50 after) ----------
  const RANKS = [
    { name: 'BRONZE', color: '#CD7F32', min: 1 }, { name: 'SILVER', color: '#C0C0C0', min: 3 },
    { name: 'GOLD', color: '#FFD700', min: 5 }, { name: 'PLATINUM', color: '#E5E4E2', min: 8 },
    { name: 'DIAMOND', color: '#B9F2FF', min: 12 },
  ];
  const levelOf = (xp) => (xp < 270 ? 1 + Math.floor(xp / 30) : 10 + Math.floor((xp - 270) / 50));
  const levelInfo = (xp) => {
    const level = levelOf(xp);
    const base = level < 10 ? (level - 1) * 30 : 270 + (level - 10) * 50;
    const need = level < 10 ? 30 : 50;
    const rank = [...RANKS].reverse().find((r) => level >= r.min);
    return { level, cur: xp - base, need, rank };
  };
  const state = Object.assign({ xp: 0, eps: 0, favs: 0, rolls: 0, trackDone: false, listDone: false, favIds: [] }, store.get('mad-xp', {}));
  const hud = $('.hud');
  const renderXP = () => {
    const { level, cur, need, rank } = levelInfo(state.xp);
    const pct = `${(cur / need) * 100}%`;
    if (hud) {
      hud.hidden = state.xp === 0;
      hud.style.setProperty('--rank', rank.color);
      $('.hud-lvl', hud).textContent = level;
      $('.hud-rank', hud).textContent = rank.name;
      $('.hud-xp', hud).textContent = `${cur}/${need} XP`;
      $('.fill', hud).style.setProperty('--w', pct);
    }
    const prof = $('.demo-prof');
    if (prof) {
      prof.style.setProperty('--rank', rank.color);
      $('.rank-name', prof).textContent = rank.name;
      $('.lvl-label', prof).textContent = `${S.cardLevel || 'Level'} ${level} • ${cur}/${need} XP`;
      $('.fill', prof).style.setProperty('--w', pct);
      for (const k of ['eps', 'favs', 'rolls']) $(`[data-stat="${k}"]`, prof).textContent = state[k];
    }
    const cta = $('.cta-xp');
    if (cta) cta.innerHTML = state.xp > 0 ? fmt(S.ctaXp || '', { xp: state.xp, level, rank: rank.name }) : (S.ctaXpZero || cta.textContent);
  };
  const toast = $('.toast');
  const award = (n, el, label) => {
    const before = levelOf(state.xp);
    state.xp += n;
    store.set('mad-xp', state);
    renderXP();
    if (el) {
      const [x, y] = centerOf(el);
      const pop = document.createElement('div');
      pop.className = 'xp-pop';
      pop.textContent = label || `+${n} XP`;
      pop.style.left = `${x}px`; pop.style.top = `${y - 20}px`;
      document.body.appendChild(pop);
      setTimeout(() => pop.remove(), 1000);
    }
    if (hud) { hud.classList.remove('bump'); void hud.offsetWidth; hud.classList.add('bump'); }
    const after = levelOf(state.xp);
    if (after > before && toast) {
      const { rank } = levelInfo(state.xp);
      $('.toast-v', toast).textContent = `${S.cardLevel || 'Level'} ${after} · ${rank.name}`;
      toast.hidden = false; toast.style.animation = 'none'; void toast.offsetWidth; toast.style.animation = '';
      setTimeout(() => (toast.hidden = true), 2600);
      confetti(innerWidth / 2, innerHeight * 0.25, 140);
    }
  };
  renderXP();

  // ---------- Demo 1: episode tracker ----------
  const trackCard = $('.card-track');
  if (trackCard) {
    const TOTAL = 10;
    let ep = 7;
    const plus = $('.plus', trackCard), minus = $('.minus', trackCard);
    const draw = () => {
      const pct = Math.round((ep / TOTAL) * 100);
      $('.ep', trackCard).textContent = `Ep ${ep} / ${TOTAL}`;
      $('.epn', trackCard).textContent = ep;
      $('.pct', trackCard).textContent = `${pct}%`;
      $('.fill', trackCard).style.setProperty('--w', `${pct}%`);
      trackCard.classList.toggle('done', ep === TOTAL);
      plus.disabled = ep === TOTAL; minus.disabled = ep === 0;
    };
    plus.addEventListener('click', () => {
      if (ep >= TOTAL) return;
      ep += 1; state.eps += 1; draw();
      if (ep === TOTAL) {
        const [x, y] = centerOf(trackCard);
        confetti(x, y);
        award(state.trackDone ? 3 : 13, plus, state.trackDone ? '+3 XP' : '✓ +13 XP');
        state.trackDone = true; store.set('mad-xp', state);
      } else award(3, plus);
    });
    minus.addEventListener('click', () => { if (ep > 0) { ep -= 1; draw(); } });
    draw();
  }

  // ---------- Demo 2: live airing calendar ----------
  const cal = $('.demo-cal');
  let calStarted = false;
  const startCalendar = async () => {
    if (!cal || calStarted) return;
    calStarted = true;
    const list = $('.cal-list', cal), chips = $('.chips', cal);
    const msg = (t) => { list.innerHTML = ''; const li = document.createElement('li'); li.className = 'cal-msg'; li.textContent = t; list.appendChild(li); };
    const Q = `query($from:Int,$to:Int,$page:Int){Page(page:$page,perPage:50){pageInfo{hasNextPage}
      airingSchedules(airingAt_greater:$from,airingAt_lesser:$to,sort:TIME){airingAt episode
      media{id isAdult popularity countryOfOrigin title{romaji english}}}}}`;
    const now = Math.floor(Date.now() / 1000);
    const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
    const to = Math.floor(startOfToday.getTime() / 1000) + 7 * 86400;
    let items = [];
    try {
      for (let page = 1; page <= 4; page++) {
        const d = await anilist(Q, { from: now, to, page });
        items = items.concat(d.Page.airingSchedules);
        if (!d.Page.pageInfo.hasNextPage) break;
      }
    } catch { msg(S.calError || 'Error'); return; }
    items = items.filter((a) => a.media && !a.media.isAdult && a.media.countryOfOrigin === 'JP');
    const dayKey = (ts) => { const d = new Date(ts * 1000); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; };
    const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(startOfToday); d.setDate(d.getDate() + i); return d; });
    const byDay = new Map(days.map((d) => [dayKey(d.getTime() / 1000), []]));
    for (const a of items) byDay.get(dayKey(a.airingAt))?.push(a);
    const wk = new Intl.DateTimeFormat(S.locale, { weekday: 'short' });
    const hm = new Intl.DateTimeFormat(S.locale, { hour: '2-digit', minute: '2-digit' });
    const favs = new Set(state.favIds);
    const renderDay = (key) => {
      $$('button', chips).forEach((b) => b.setAttribute('aria-selected', String(b.dataset.key === key)));
      const top = (byDay.get(key) || []).slice().sort((a, b) => b.media.popularity - a.media.popularity).slice(0, 4).sort((a, b) => a.airingAt - b.airingAt);
      list.innerHTML = '';
      if (!top.length) { msg(S.calNone || ''); return; }
      for (const a of top) {
        const li = document.createElement('li'); li.className = 'row';
        const time = document.createElement('span'); time.className = 'time'; time.textContent = hm.format(new Date(a.airingAt * 1000));
        const title = document.createElement('span'); title.className = 'title'; title.textContent = titleOf(a.media);
        const meta = document.createElement('span'); meta.className = 'meta';
        const ep = document.createElement('span'); ep.textContent = `EP: ${a.episode}`;
        const count = document.createElement('span'); count.className = 'count'; count.dataset.at = a.airingAt;
        meta.append(ep, count);
        const heart = document.createElement('button');
        heart.type = 'button'; heart.className = 'heart'; heart.setAttribute('aria-label', `${S.calFav || ''}: ${titleOf(a.media)}`);
        heart.setAttribute('aria-pressed', String(favs.has(a.media.id))); heart.textContent = '♥';
        heart.addEventListener('click', () => {
          const on = heart.getAttribute('aria-pressed') !== 'true';
          heart.setAttribute('aria-pressed', String(on));
          if (on && !favs.has(a.media.id)) {
            favs.add(a.media.id); state.favIds = [...favs]; state.favs += 1; award(2, heart);
          }
        });
        li.append(time, title, heart, meta);
        list.appendChild(li);
      }
      tick();
    };
    chips.innerHTML = '';
    days.forEach((d, i) => {
      const b = document.createElement('button');
      b.type = 'button'; b.setAttribute('role', 'tab'); b.dataset.key = dayKey(d.getTime() / 1000);
      b.textContent = `${wk.format(d)} ${d.getDate()}`;
      b.addEventListener('click', () => renderDay(b.dataset.key));
      chips.appendChild(b);
      if (i === 0) b.setAttribute('aria-selected', 'true');
    });
    const tick = () => {
      const t = Date.now() / 1000;
      for (const c of $$('.count', list)) {
        let s = Math.round(c.dataset.at - t);
        if (s <= 0) { c.textContent = S.calAiring || 'Live'; c.classList.add('now'); continue; }
        const d = Math.floor(s / 86400); s %= 86400;
        const h = Math.floor(s / 3600); s %= 3600;
        const m = Math.floor(s / 60); s %= 60;
        c.textContent = d ? `${d}d ${h}h ${m}m` : `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
      }
    };
    setInterval(tick, 1000);
    const firstWithShows = days.map((d) => dayKey(d.getTime() / 1000)).find((k) => (byDay.get(k) || []).length) || dayKey(days[0].getTime() / 1000);
    renderDay(firstWithShows);
  };

  // ---------- Demo 3: drag-to-rank list ----------
  const rankList = $('.rank-list');
  if (rankList) {
    const renumber = () => $$('li', rankList).forEach((li, i) => ($('.num', li).textContent = `#${i + 1}`));
    renumber();
    let firstTitle = $('li .t', rankList).textContent;
    const afterChange = () => {
      renumber();
      const top = $('li', rankList);
      const t = $('.t', top).textContent;
      if (t !== firstTitle) {
        firstTitle = t;
        top.classList.remove('flash'); void top.offsetWidth; top.classList.add('flash');
        if (!state.listDone) { state.listDone = true; award(5, top, `${S.listNew1 || '#1'} +5 XP`); }
        else award(0, top, S.listNew1);
      }
    };
    let drag = null;
    rankList.addEventListener('pointerdown', (e) => {
      const li = e.target.closest('li');
      if (!li || e.button > 0) return;
      if (e.pointerType !== 'mouse' && !e.target.closest('.grip')) return; // touch: drag by the handle so the page still scrolls
      e.preventDefault();
      const items = $$('li', rankList);
      const rects = items.map((el) => el.getBoundingClientRect());
      drag = { li, items, rects, from: items.indexOf(li), to: items.indexOf(li), y0: e.clientY, id: e.pointerId };
      li.setPointerCapture(e.pointerId);
      li.classList.add('dragging');
      items.forEach((el) => el !== li && (el.style.transition = 'transform .25s cubic-bezier(.16,1,.3,1)'));
    });
    rankList.addEventListener('pointermove', (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const dy = e.clientY - drag.y0;
      drag.li.style.transform = `translateY(${dy}px)`;
      const { rects, from, items } = drag;
      const center = rects[from].top + rects[from].height / 2 + dy;
      let to = from;
      rects.forEach((r, i) => {
        const mid = r.top + r.height / 2;
        if (i < from && center < mid) to = Math.min(to, i);
        if (i > from && center > mid) to = Math.max(to, i);
      });
      drag.to = to;
      const h = rects[from].height + 8;
      items.forEach((el, i) => {
        if (el === drag.li) return;
        const shift = from < to && i > from && i <= to ? -h : from > to && i < from && i >= to ? h : 0;
        el.style.transform = shift ? `translateY(${shift}px)` : '';
      });
    });
    const endDrag = (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const { li, items, from, to } = drag;
      const before = li.getBoundingClientRect().top;
      items.forEach((el) => { el.style.transition = 'none'; el.style.transform = ''; });
      if (to !== from) rankList.insertBefore(li, to > from ? items[to].nextSibling : items[to]);
      const after = li.getBoundingClientRect().top;
      li.classList.remove('dragging');
      li.animate([{ transform: `translateY(${before - after}px)` }, { transform: 'none' }], { duration: 220, easing: 'cubic-bezier(.16,1,.3,1)' });
      requestAnimationFrame(() => items.forEach((el) => (el.style.transition = '')));
      drag = null;
      if (to !== from) afterChange();
    };
    rankList.addEventListener('pointerup', endDrag);
    rankList.addEventListener('pointercancel', endDrag);
    rankList.addEventListener('keydown', (e) => {
      const li = e.target.closest('li');
      if (!li || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
      e.preventDefault();
      if (e.key === 'ArrowUp' && li.previousElementSibling) rankList.insertBefore(li, li.previousElementSibling);
      else if (e.key === 'ArrowDown' && li.nextElementSibling) rankList.insertBefore(li.nextElementSibling, li);
      else return;
      li.focus();
      afterChange();
    });
  }

  // ---------- Demo 5: dice roll (real anime from AniList) ----------
  const dice = $('.demo-dice');
  if (dice) {
    const cube = $('.cube', dice), result = $('.dice-result', dice), rollBtn = $('.roll', dice);
    const DQ = `query($page:Int){Page(page:$page,perPage:1){media(type:ANIME,sort:POPULARITY_DESC,isAdult:false,format_in:[TV,MOVIE,ONA]){
      title{romaji english} averageScore episodes genres coverImage{medium}}}}`;
    const fetchPick = () => anilist(DQ, { page: 1 + Math.floor(Math.random() * 400) }).then((d) => d.Page.media[0]);
    let next = null, rolling = false, angle = { x: -24, y: 34 };
    const prefetch = () => { if (!next) next = fetchPick().catch(() => null); };
    dice.addEventListener('pointerenter', prefetch, { once: true });
    const roll = async () => {
      if (rolling) return;
      rolling = true;
      prefetch();
      const pending = next; next = null;
      const to = { x: angle.x + 720 + 90 * ((Math.random() * 4) | 0), y: angle.y + 720 + 90 * ((Math.random() * 4) | 0) };
      const anim = reduceMotion ? null : cube.animate(
        [{ transform: `rotateX(${angle.x}deg) rotateY(${angle.y}deg)` }, { transform: `rotateX(${to.x}deg) rotateY(${to.y}deg)` }],
        { duration: 1300, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'forwards' }
      );
      angle = to;
      const [media] = await Promise.all([pending, anim ? anim.finished : null]);
      rolling = false;
      rollBtn.textContent = S.diceAgain || 'Roll again';
      prefetch();
      if (!media) { result.hidden = false; $('.dr-title', result).textContent = S.diceErr || 'Error'; $('.cover', result).removeAttribute('src'); return; }
      $('.dr-title', result).textContent = titleOf(media);
      $('.dr-score', result).textContent = media.averageScore ? `★ ${(media.averageScore / 10).toFixed(1)}` : '';
      $('.dr-eps', result).textContent = media.episodes ? `${media.episodes} eps` : '';
      const g = $('.dr-genres', result); g.innerHTML = '';
      for (const name of (media.genres || []).slice(0, 3)) { const s = document.createElement('span'); s.textContent = name; g.appendChild(s); }
      const cover = $('.cover', result);
      if (media.coverImage?.medium) cover.src = media.coverImage.medium; else cover.removeAttribute('src');
      result.hidden = false;
      if (!reduceMotion) result.animate([{ transform: 'scale(.85)', opacity: 0 }, { transform: 'scale(1.04)', opacity: 1, offset: 0.6 }, { transform: 'none', opacity: 1 }], { duration: 500, easing: 'ease-out' });
      state.rolls += 1;
      award(4, rollBtn);
    };
    rollBtn.addEventListener('click', roll);
    $('.dice-btn', dice).addEventListener('click', roll);
  }

  // Start network demos only when the playground comes close
  const playSection = $('.story');
  if (playSection) {
    new IntersectionObserver((entries, io) => {
      if (entries.some((e) => e.isIntersecting)) { io.disconnect(); startCalendar(); }
    }, { rootMargin: '600px 0px' }).observe(playSection);
  }

  // ---------- Scroll story: pinned phone (desktop) / stacked steps (mobile) ----------
  const story = $('.story-body');
  const steps = $$('.step');
  const desktop = mq('(min-width: 900px) and (min-height: 600px)');
  const use3d = () => desktop.matches && !reduceMotion && !lowEnd;

  const miniVideos = $$('.step-media video');
  const miniObserver = new IntersectionObserver((entries) => {
    for (const { target: v, isIntersecting, intersectionRatio } of entries) {
      if (root.classList.contains('has-3d') || !allowVideo) continue;
      if (isIntersecting && intersectionRatio >= 0.5) { loadVideo(v, `assets/clips/${v.dataset.clip}.mp4`); play(v); }
      else if (v.dataset.loaded) v.pause();
    }
  }, { threshold: [0, 0.5] });
  miniVideos.forEach((v) => miniObserver.observe(v));

  const rig = $('.rig');
  const layers = $$('.layer');
  const dots = $$('.dots li');
  const speed = $('.speed');
  let active = -1, ticking = false;

  const ensureLayerVideo = (i) => {
    const layer = layers[i];
    if (!layer || !allowVideo || !layer.dataset.clip) return null;
    let v = $('video', layer);
    if (!v) {
      v = document.createElement('video');
      v.muted = true; v.loop = true; v.playsInline = true; v.setAttribute('playsinline', '');
      v.style.opacity = '0';
      v.addEventListener('playing', () => (v.style.opacity = '1'), { once: true });
      layer.appendChild(v);
      loadVideo(v, `assets/clips/${layer.dataset.clip}.mp4`);
    }
    return v;
  };
  const setActive = (i) => {
    if (i === active) return;
    const dir = i > active ? 1 : -1;
    const first = active === -1;
    active = i;
    layers.forEach((l, j) => {
      l.classList.toggle('is-active', j === i);
      const v = $('video', l);
      if (v && j !== i) v.pause();
    });
    dots.forEach((d, j) => d.classList.toggle('on', j === i));
    steps.forEach((s, j) => s.classList.toggle('on', j === i));
    const v = ensureLayerVideo(i);
    if (v) { v.currentTime = 0; play(v); }
    ensureLayerVideo(i + 1);
    if (!first && root.classList.contains('has-3d')) {
      speed?.classList.remove('go'); void speed?.offsetWidth; speed?.classList.add('go');
      rig.animate([{ '--kick': `${dir * 38}deg` }, { '--kick': '0deg' }], { duration: 800, easing: 'cubic-bezier(.16,1,.3,1)' });
    }
  };
  const update = () => {
    ticking = false;
    if (!root.classList.contains('has-3d')) return;
    const vh = innerHeight;
    const box = story.getBoundingClientRect();
    const p = clamp(-box.top / (box.height - vh), 0, 1);
    setActive(Math.min(steps.length - 1, Math.floor(p * steps.length)));
    const ry = -16 + p * 26 + Math.sin(p * Math.PI * 6) * 3;
    rig.style.setProperty('--ry', `${ry.toFixed(2)}deg`);
    rig.style.setProperty('--rx', `${(7 - p * 3).toFixed(2)}deg`);
    rig.style.setProperty('--fy', `${(Math.sin(p * Math.PI * 4) * 8).toFixed(1)}px`);
  };
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
  const applyMode = () => {
    const on = use3d();
    root.classList.toggle('has-3d', on);
    if (on) { miniVideos.forEach((v) => v.dataset.loaded && v.pause()); active = -1; update(); }
    else { steps.forEach((s) => s.classList.remove('on')); layers.forEach((l) => $('video', l)?.pause()); }
  };
  if (story && rig) {
    applyMode();
    desktop.addEventListener('change', applyMode);
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', onScroll, { passive: true });
  }

  // ---------- Trailer modal ----------
  const dialog = $('dialog.trailer');
  const box = dialog && $('.trailer-box', dialog);
  const openTrailer = () => {
    if (!dialog) return;
    if (TRAILER_YOUTUBE_ID) {
      box.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${TRAILER_YOUTUBE_ID}?autoplay=1&rel=0&playsinline=1" title="${dialog.getAttribute('aria-label')}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`;
    } else {
      const tall = mq('(orientation: portrait) and (max-width: 899px)').matches;
      box.innerHTML = `<video controls autoplay playsinline src="assets/video/trailer-${tall ? '9x16' : '16x9'}.mp4"></video>`;
    }
    if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open', '');
  };
  const closeTrailer = () => { box.innerHTML = ''; if (dialog.open) dialog.close(); };
  $$('[data-trailer]').forEach((b) => b.addEventListener('click', openTrailer));
  dialog?.querySelector('.close').addEventListener('click', closeTrailer);
  dialog?.addEventListener('click', (e) => { if (e.target === dialog) closeTrailer(); });
  dialog?.addEventListener('close', () => { box.innerHTML = ''; });

  const lang = $('details.lang');
  document.addEventListener('click', (e) => { if (lang?.open && !lang.contains(e.target)) lang.open = false; });
})();
