// Renders the share preview pages: /lists/<id> (a public list from Supabase) and /a/<id> (an anime from AniList).
// Installed apps open these links directly (universal / app links); everyone else lands here.
// The Supabase key is the public anon key the app ships with; row level security only exposes public lists.
(function () {
  var SUPABASE_URL = 'https://aliirarczgxmjrswvysz.supabase.co';
  var SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsaWlyYXJjemd4bWpyc3d2eXN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4ODQxMjksImV4cCI6MjA4MTQ2MDEyOX0.z8uQcyZvMHBat8Tk-3-Bl0jYrGDFpmodBaZvnFIHyNE';
  var PLAY = 'https://play.google.com/store/apps/details?id=com.myanimedex.app';

  var T = {
    en: { loading: 'Loading…', error: "Couldn't load this page. Check your connection and try again.", by: 'by %s', count: '%n anime',
          privateList: 'This list is private or no longer exists.', noAnime: "We couldn't find this anime.", episodes: '%n episodes',
          open: 'Open in MyAnimeDex', listCta: 'Make your own ranked anime lists', animeCta: 'Track it in MyAnimeDex',
          ctaBody: 'Track every episode, get a reminder when new ones air and rank everything you watch. Free on iPhone and Android.',
          source: 'Synopsis from %s', home: 'Home', top: 'Top 100 Anime' },
    tr: { loading: 'Yükleniyor…', error: 'Sayfa yüklenemedi. Bağlantını kontrol edip tekrar dene.', by: '%s tarafından', count: '%n anime',
          privateList: 'Bu liste gizli ya da artık yok.', noAnime: 'Bu anime bulunamadı.', episodes: '%n bölüm',
          open: "MyAnimeDex'te aç", listCta: 'Kendi sıralı anime listelerini oluştur', animeCta: "MyAnimeDex'te takip et",
          ctaBody: "Her bölümü takip et, yeni bölümler çıkınca hatırlatma al, izlediğin her şeyi sırala. iPhone ve Android'de ücretsiz.",
          source: 'Özet: %s', home: 'Ana sayfa', top: 'En İyi 100 Anime' },
    ja: { loading: '読み込み中…', error: 'ページを読み込めませんでした。接続を確認してもう一度お試しください。', by: '作成：%s', count: '%n作品',
          privateList: 'このリストは非公開か、削除されています。', noAnime: 'このアニメが見つかりませんでした。', episodes: '全%n話',
          open: 'MyAnimeDexで開く', listCta: '自分だけのアニメランキングを作ろう', animeCta: 'MyAnimeDexで記録しよう',
          ctaBody: '視聴したエピソードを記録し、新エピソードの放送をお知らせ。見た作品をランキングにできます。iPhone・Androidで無料。',
          source: 'あらすじ：%s', home: 'ホーム', top: 'トップ100アニメ' },
    id: { loading: 'Memuat…', error: 'Halaman tidak bisa dimuat. Periksa koneksimu dan coba lagi.', by: 'oleh %s', count: '%n anime',
          privateList: 'Daftar ini privat atau sudah tidak ada.', noAnime: 'Anime ini tidak ditemukan.', episodes: '%n episode',
          open: 'Buka di MyAnimeDex', listCta: 'Buat daftar peringkat animemu sendiri', animeCta: 'Lacak di MyAnimeDex',
          ctaBody: 'Lacak setiap episode, dapatkan pengingat saat episode baru tayang, dan beri peringkat semua yang kamu tonton. Gratis di iPhone dan Android.',
          source: 'Sinopsis dari %s', home: 'Beranda', top: 'Top 100 Anime' },
  };
  var lang = (navigator.language || 'en').slice(0, 2).toLowerCase();
  var t = T[lang] || T.en;
  var home = { tr: '/tr', ja: '/jp', id: '/id', es: '/es', pt: '/pt', de: '/de', fr: '/fr', ru: '/ru' }[lang] || '/';
  document.documentElement.lang = T[lang] ? lang : 'en';

  var $ = function (s) { return document.querySelector(s); };
  var el = function (tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };
  var main = $('main');
  var kind = document.body.dataset.kind; // 'list' | 'anime'
  var id = decodeURIComponent(location.pathname.split('/').filter(Boolean)[1] || '');

  // Static chrome in the visitor's language
  $('.cta h2').textContent = kind === 'list' ? t.listCta : t.animeCta;
  $('.cta p').textContent = t.ctaBody;
  $('.links .home').textContent = t.home;
  $('.links .home').href = home;
  $('.links .top').textContent = t.top;

  // Android: an intent link opens the app, or Google Play when it isn't installed.
  // iOS: the Smart App Banner in <head> offers "Open" with this page's link.
  var open = $('.open');
  if (/android/i.test(navigator.userAgent) && id) {
    var appPath = (kind === 'list' ? 'lists/' : 'anime/') + encodeURIComponent(id);
    open.href = 'intent://' + appPath + '#Intent;scheme=myanimedex;package=com.myanimedex.app;S.browser_fallback_url=' + encodeURIComponent(PLAY) + ';end';
    open.textContent = t.open;
    open.hidden = false;
  }

  var state = function (text) { main.replaceChildren(el('p', 'state', text)); };
  state(t.loading);

  var supa = function (path) {
    return fetch(SUPABASE_URL + '/rest/v1/' + path, {
      headers: { apikey: SUPABASE_ANON, Authorization: 'Bearer ' + SUPABASE_ANON },
    }).then(function (r) {
      if (!r.ok) throw new Error(r.status);
      return r.json();
    });
  };

  var renderList = function () {
    if (!/^[0-9a-f-]{36}$/i.test(id)) return state(t.privateList);
    var q = encodeURIComponent(id);
    Promise.all([
      supa('lists?id=eq.' + q + '&is_public=eq.true&select=title,description,profiles:user_id(username)'),
      supa('list_items?list_id=eq.' + q + '&select=anime_id,anime_title,anime_image,user_score,user_comment,position,added_at&order=position.asc.nullslast,added_at.desc'),
    ]).then(function (res) {
      var list = res[0][0];
      var items = res[1];
      if (!list) return state(t.privateList);
      document.title = list.title + ' – MyAnimeDex';
      var nodes = [el('h1', null, list.title)];
      var who = list.profiles && list.profiles.username;
      nodes.push(el('p', 'meta', (who ? t.by.replace('%s', '@' + who) + ' · ' : '') + t.count.replace('%n', items.length)));
      if (list.description) nodes.push(el('p', 'desc', list.description));
      var ol = el('ol', 'items');
      items.forEach(function (it, i) {
        var a = el('a');
        a.href = '/a/' + encodeURIComponent(it.anime_id);
        a.append(el('span', 'num', String(i + 1)));
        var img = el('img');
        img.src = it.anime_image || '';
        img.alt = '';
        img.loading = 'lazy';
        img.width = 52;
        img.height = 74;
        a.append(img);
        var body = el('div');
        body.append(el('div', 't', it.anime_title));
        if (it.user_score) body.append(el('div', 's', '★ ' + it.user_score));
        if (it.user_comment) body.append(el('div', 'c', it.user_comment));
        a.append(body);
        var li = el('li', 'item');
        li.append(a);
        ol.append(li);
      });
      nodes.push(ol);
      main.replaceChildren.apply(main, nodes);
    }).catch(function () { state(t.error); });
  };

  var ANIME_Q = 'query($id:Int){Media(%k:$id,type:ANIME){id title{romaji english}coverImage{large}format episodes seasonYear averageScore genres studios(isMain:true){nodes{name}}description(asHtml:false)siteUrl}}';
  var anilist = function (key, n) {
    return fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query: ANIME_Q.replace('%k', key), variables: { id: n } }),
    }).then(function (r) { return r.json(); }).then(function (d) { return d && d.data && d.data.Media; });
  };

  var renderAnime = function () {
    var n = parseInt(id, 10);
    if (!(n > 0)) return state(t.noAnime);
    // Same order the app uses: MyAnimeList id first, then the AniList id.
    anilist('idMal', n).then(function (m) { return m || anilist('id', n); }).then(function (m) {
      if (!m) return state(t.noAnime);
      var title = m.title.english || m.title.romaji;
      document.title = title + ' – MyAnimeDex';
      var wrap = el('div', 'anime');
      var img = el('img', 'cover');
      img.src = m.coverImage.large;
      img.alt = title;
      wrap.append(img);
      var info = el('div');
      info.append(el('h1', null, title));
      var chips = el('div', 'chips');
      if (m.averageScore) chips.append(el('span', 'score', '★ ' + (m.averageScore / 10).toFixed(1)));
      [m.format && m.format.replace('_', ' '), m.seasonYear, m.episodes && t.episodes.replace('%n', m.episodes),
        m.studios.nodes[0] && m.studios.nodes[0].name].concat(m.genres.slice(0, 4))
        .filter(Boolean).forEach(function (c) { chips.append(el('span', null, String(c))); });
      info.append(chips);
      if (m.description) {
        var text = new DOMParser().parseFromString(m.description, 'text/html').body.textContent.trim();
        info.append(el('p', 'desc', text.length > 600 ? text.slice(0, 597).trimEnd() + '…' : text));
        var src = el('p', 'source');
        var link = el('a', null, 'AniList');
        link.href = m.siteUrl;
        link.rel = 'noopener';
        var parts = t.source.split('%s');
        src.append(parts[0], link, parts[1] || '');
        info.append(src);
      }
      wrap.append(info);
      main.replaceChildren(wrap);
    }).catch(function () { state(t.error); });
  };

  if (kind === 'list') renderList(); else renderAnime();
})();
