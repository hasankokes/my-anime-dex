// Generates the seasonal anime pages web/season/<season>-<year>/index.html from AniList.
//   node scripts/generate-season-pages.js                 the current and the next season
//   node scripts/generate-season-pages.js FALL 2026 ...    specific seasons (pairs)
// Re-run weekly while a season airs: the weekday/time of each show comes from its next airing episode.
// Times are written in UTC; the page's script converts them to the visitor's time zone.
const fs = require('fs');
const path = require('path');

const WEB = path.join(__dirname, '../web');
const OUT = path.join(WEB, 'season');
const SITE = 'https://myanimedex.com';
const PAGES_JSON = path.join(WEB, '_src/anime-pages.json');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const SEASONS = ['WINTER', 'SPRING', 'SUMMER', 'FALL'];
const SEASON_NAME = { WINTER: 'Winter', SPRING: 'Spring', SUMMER: 'Summer', FALL: 'Fall' };
const SEASON_MONTHS = { WINTER: 'January to March', SPRING: 'April to June', SUMMER: 'July to September', FALL: 'October to December' };
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const currentSeason = (d = new Date()) => {
    const m = d.getUTCMonth();
    return { season: SEASONS[Math.floor(m / 3)], year: d.getUTCFullYear() };
};
const nextSeason = ({ season, year }) => {
    const i = SEASONS.indexOf(season);
    return i === 3 ? { season: 'WINTER', year: year + 1 } : { season: SEASONS[i + 1], year };
};

async function anilist(query, variables) {
    for (let attempt = 0; attempt < 5; attempt++) {
        const res = await fetch('https://graphql.anilist.co', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({ query, variables }),
        });
        if (res.status === 429) {
            await sleep(Number(res.headers.get('retry-after') || 60) * 1000);
            continue;
        }
        const json = await res.json();
        await sleep(2500);
        if (json.errors) throw new Error(json.errors.map((e) => e.message).join('; '));
        return json.data;
    }
    throw new Error('AniList kept rate limiting');
}

const Q = `query ($season: MediaSeason, $year: Int, $page: Int) {
  Page(page: $page, perPage: 50) {
    pageInfo { hasNextPage }
    media(season: $season, seasonYear: $year, type: ANIME, isAdult: false, format_in: [TV, TV_SHORT, ONA], sort: POPULARITY_DESC) {
      id idMal title { romaji english } coverImage { large } format episodes status genres averageScore popularity
      startDate { year month day } studios(isMain: true) { nodes { name } }
      nextAiringEpisode { episode airingAt } source
    }
  }
}`;

async function fetchSeason(season, year) {
    const all = [];
    for (let page = 1; page <= 2; page++) {
        const d = await anilist(Q, { season, year, page });
        all.push(...d.Page.media);
        if (!d.Page.pageInfo.hasNextPage) break;
    }
    return all.filter((m) => m.popularity >= 1000); // drop obscure shorts so the page stays useful
}

const esc = (v) => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const titleOf = (m) => m.title.english || m.title.romaji;
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function render(season, year, media, slugById, generated) {
    const name = `${SEASON_NAME[season]} ${year}`;
    const slug = `${season.toLowerCase()}-${year}`;
    const url = `${SITE}/season/${slug}/`;
    // Shows with a broadcast slot (airing, or episode 1 already scheduled) go in the weekly grid.
    const airing = media.filter((m) => m.nextAiringEpisode);
    const upcoming = media.filter((m) => !m.nextAiringEpisode);
    const airingNow = media.filter((m) => m.status === 'RELEASING').length;
    const started = Date.UTC(year, SEASONS.indexOf(season) * 3, 1) <= Date.now();
    const byDay = DAYS.map(() => []);
    airing.forEach((m) => byDay[new Date(m.nextAiringEpisode.airingAt * 1000).getUTCDay()].push(m));
    byDay.forEach((list) => list.sort((a, b) => (a.nextAiringEpisode.airingAt % 86400) - (b.nextAiringEpisode.airingAt % 86400)));

    const link = (m) => (slugById.has(m.id) ? `/anime/${slugById.get(m.id)}/` : `/a/${m.idMal || m.id}`);
    const card = (m) => {
        const studio = m.studios.nodes[0] && m.studios.nodes[0].name;
        const meta = [m.format === 'TV_SHORT' ? 'TV Short' : m.format, m.episodes ? `${m.episodes} eps` : null, studio].filter(Boolean).join(' · ');
        const t = m.nextAiringEpisode
            ? `${m.status === 'NOT_YET_RELEASED' && m.startDate && m.startDate.month ? `Starts ${MONTHS[m.startDate.month - 1].slice(0, 3)} ${m.startDate.day || ''} · `.replace(' ·', ' ·') : ''}<time datetime="${new Date(m.nextAiringEpisode.airingAt * 1000).toISOString()}" data-ts="${m.nextAiringEpisode.airingAt}">${new Date(m.nextAiringEpisode.airingAt * 1000).toISOString().slice(11, 16)} UTC</time> · Ep ${m.nextAiringEpisode.episode}`
            : m.startDate && m.startDate.month ? `Starts ${MONTHS[m.startDate.month - 1]}${m.startDate.day ? ` ${m.startDate.day}` : ''}` : 'Start date to be announced';
        return `<li class="show"><a href="${link(m)}"><img src="${esc(m.coverImage.large)}" alt="" loading="lazy" width="64" height="92"><span class="body"><strong>${esc(titleOf(m))}</strong><span class="when">${t}</span><span class="meta">${esc(meta)}</span><span class="genres">${m.genres.slice(0, 3).map(esc).join(', ')}</span></span>${m.averageScore ? `<span class="score">★ ${(m.averageScore / 10).toFixed(1)}</span>` : ''}</a></li>`;
    };

    const top = [...media].sort((a, b) => b.popularity - a.popularity).slice(0, 5).map(titleOf);
    const lead = started
        ? `The ${name} anime season runs from ${SEASON_MONTHS[season]} ${year}. ${media.length} notable TV and web anime are on this list, ${airingNow} of them airing right now. The most-watched so far: ${top.slice(0, 3).join(', ')}. Times below are shown in your own time zone.`
        : `The ${name} anime season starts in ${SEASON_MONTHS[season].split(' ')[0]} ${year}. ${media.length} TV and web anime have been announced so far, led by ${top.slice(0, 3).join(', ')}.${airing.length ? ` ${airing.length} already have a weekly broadcast slot, shown below in your time zone; the rest are added as times are announced.` : ' Weekly air times are added here as they are announced.'}`;

    const sections = [];
    if (airing.length) {
        DAYS.forEach((d, i) => {
            if (byDay[i].length) sections.push(`<section class="day" data-day="${i}"><h2>${d}<span class="tz-day"></span></h2><ol class="shows">${byDay[i].map(card).join('')}</ol></section>`);
        });
    }
    if (upcoming.length) sections.push(`<section class="day"><h2>${started ? 'Not airing yet or finished' : 'Broadcast time not announced yet'}</h2><ol class="shows">${upcoming.map(card).join('')}</ol></section>`);

    const other = [currentSeason(), nextSeason(currentSeason())].map((s) => `${s.season.toLowerCase()}-${s.year}`).filter((s) => s !== slug);
    const graph = {
        '@context': 'https://schema.org',
        '@graph': [
            { '@type': 'BreadcrumbList', itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'MyAnimeDex', item: `${SITE}/` },
                { '@type': 'ListItem', position: 2, name: `${name} anime`, item: url },
            ] },
            { '@type': 'ItemList', name: `${name} anime`, numberOfItems: media.length,
              itemListElement: media.slice(0, 50).map((m, i) => ({ '@type': 'ListItem', position: i + 1, name: titleOf(m), url: `${SITE}${link(m)}` })) },
        ],
    };

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(`${name} Anime: Airing Schedule & New Shows | MyAnimeDex`)}</title>
<meta name="description" content="${esc(`Every notable ${name} anime with its weekly air time in your time zone, episode count, studio and score. ${media.length} shows, updated ${generated}.`)}">
<link rel="canonical" href="${url}">
<meta name="theme-color" content="#0F0F0F">
<meta name="color-scheme" content="dark">
<meta name="apple-itunes-app" content="app-id=6758043488">
<meta property="og:type" content="website">
<meta property="og:site_name" content="MyAnimeDex">
<meta property="og:title" content="${esc(`${name} Anime: Airing Schedule & New Shows`)}">
<meta property="og:description" content="${esc(`${media.length} ${name} anime with weekly air times in your time zone.`)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="https://myanimedex.com/assets/img/og.jpg">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" type="image/png" sizes="32x32" href="/assets/img/favicon-32.png">
<link rel="apple-touch-icon" href="/assets/img/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:wght@500;600;700;800&display=swap" media="print" onload="this.media='all'">
<link rel="stylesheet" href="/assets/share/share.css">
<link rel="stylesheet" href="/assets/season/season.css">
<script type="application/ld+json">
${JSON.stringify(graph).replace(/</g, '\\u003c')}
</script>
<script src="/assets/analytics.js" defer></script>
<script src="/assets/season/season.js" defer></script>
</head>
<body>
<header class="top"><a class="brand" href="/"><img src="/assets/img/logo-96.png" width="36" height="36" alt=""><span class="wordmark">MYANIME<b>DEX</b></span></a></header>
<main class="wide">
<h1>${esc(name)} anime: airing schedule and new shows</h1>
<p class="updated">Updated ${generated} · Data from <a href="https://anilist.co" rel="noopener">AniList</a> · <span class="tz">Times in UTC</span></p>
<p class="lead">${esc(lead)}</p>
<nav class="days">${sections.length ? DAYS.map((d, i) => (byDay[i].length ? `<a href="#d${i}">${d.slice(0, 3)}</a>` : '')).join('') : ''}${other.map((s) => `<a class="other" href="/season/${s}/">${SEASON_NAME[s.split('-')[0].toUpperCase()]} ${s.split('-')[1]} →</a>`).join('')}</nav>
${sections.map((s) => s.replace(/<section class="day" data-day="(\d)">/, '<section class="day" id="d$1" data-day="$1">')).join('\n')}
</main>
<div class="after">
  <section class="cta">
    <h2>Get a reminder when each episode airs</h2>
    <p>Add ${esc(name)} shows to your list in MyAnimeDex and get notified in your time zone. Free on iPhone, iPad and Android.</p>
    <div class="badges"><a href="https://apps.apple.com/app/id6758043488" rel="noopener"><img src="/assets/badges/app-store.svg" width="150" height="50" alt="Download on the App Store"></a><a href="https://play.google.com/store/apps/details?id=com.myanimedex.app" rel="noopener"><img src="/assets/badges/google-play.png" width="169" height="50" alt="Get it on Google Play"></a></div>
  </section>
  <nav class="links"><a href="/">Home</a><a href="/anime/">Top 100 Anime</a><a href="/myanimelist-alternative">Import from MyAnimeList</a><a href="/contact">Contact</a></nav>
</div>
<footer>&copy; ${year} MyAnimeDex</footer>
</body>
</html>
`;
}

async function main() {
    const args = process.argv.slice(2);
    const seasons = args.length >= 2
        ? Array.from({ length: Math.floor(args.length / 2) }, (_, i) => ({ season: args[i * 2].toUpperCase(), year: Number(args[i * 2 + 1]) }))
        : [currentSeason(), nextSeason(currentSeason())];
    const pages = fs.existsSync(PAGES_JSON) ? JSON.parse(fs.readFileSync(PAGES_JSON, 'utf8')) : [];
    const slugById = new Map(pages.map((p) => [p.anilistId, p.slug]));
    const now = new Date();
    const generated = `${MONTHS[now.getUTCMonth()]} ${now.getUTCDate()}, ${now.getUTCFullYear()}`;
    for (const { season, year } of seasons) {
        const media = await fetchSeason(season, year);
        const dir = path.join(OUT, `${season.toLowerCase()}-${year}`);
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, 'index.html'), render(season, year, media, slugById, generated));
        console.log(`${SEASON_NAME[season]} ${year}: ${media.length} anime`);
    }
    writeHub(generated);
}

// /season/: a hub that links every generated season page, newest first.
function writeHub(generated) {
    const dirs = fs.readdirSync(OUT, { withFileTypes: true })
        .filter((d) => d.isDirectory() && fs.existsSync(path.join(OUT, d.name, 'index.html')))
        .map((d) => { const [s, y] = d.name.split('-'); return { slug: d.name, season: s.toUpperCase(), year: Number(y) }; })
        .sort((a, b) => b.year - a.year || SEASONS.indexOf(b.season) - SEASONS.indexOf(a.season));
    const items = dirs.map((d) => `<li class="show"><a href="/season/${d.slug}/" style="grid-template-columns:1fr"><span class="body"><strong>${SEASON_NAME[d.season]} ${d.year} anime</strong><span class="meta">${SEASON_MONTHS[d.season]} ${d.year} · airing schedule and new shows</span></span></a></li>`).join('');
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Anime Seasons: Airing Schedules by Season | MyAnimeDex</title>
<meta name="description" content="Seasonal anime charts with weekly air times in your time zone, episode counts, studios and scores. Updated ${generated}.">
<link rel="canonical" href="${SITE}/season/">
<meta name="theme-color" content="#0F0F0F">
<meta name="color-scheme" content="dark">
<link rel="icon" type="image/png" sizes="32x32" href="/assets/img/favicon-32.png">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:wght@500;600;700;800&display=swap" media="print" onload="this.media='all'">
<link rel="stylesheet" href="/assets/share/share.css">
<link rel="stylesheet" href="/assets/season/season.css">
<script src="/assets/analytics.js" defer></script>
</head>
<body>
<header class="top"><a class="brand" href="/"><img src="/assets/img/logo-96.png" width="36" height="36" alt=""><span class="wordmark">MYANIME<b>DEX</b></span></a></header>
<main class="wide">
<h1>Anime seasons</h1>
<p class="lead">Every anime season with its weekly airing schedule, shown in your own time zone. Data from AniList, updated ${generated}.</p>
<ol class="shows">${items}</ol>
</main>
<div class="after"><nav class="links"><a href="/">Home</a><a href="/anime/">Top 100 Anime</a><a href="/myanimelist-alternative">Import from MyAnimeList</a></nav></div>
<footer>&copy; MyAnimeDex</footer>
</body>
</html>
`;
    fs.writeFileSync(path.join(OUT, 'index.html'), html);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
