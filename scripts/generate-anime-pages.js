// Generates the SEO anime pages web/anime/<slug>/index.html from AniList.
//   node scripts/generate-anime-pages.js            regenerate every page listed in web/_src/anime-pages.json
//   node scripts/generate-anime-pages.js --resolve  rebuild that list from the existing page folders first
// The JSON keeps slug -> AniList id, so the URLs Google already knows never change.
// Each page is built from AniList facts (format, studio, episodes, dates, score, relations) instead of a
// copied synopsis; only a two-sentence synopsis excerpt is quoted, with a link back to AniList.
const fs = require('fs');
const path = require('path');

const WEB = path.join(__dirname, '../web');
const TEMPLATE_PATH = path.join(WEB, 'anime-template.html');
const OUTPUT_DIR = path.join(WEB, 'anime');
const PAGES_JSON = path.join(WEB, '_src/anime-pages.json');
const SITE = 'https://myanimedex.com';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// AniList allows 30-90 requests a minute and caps query complexity: 5 anime with all fields per request,
// requests spaced well apart.
const BATCH = 5;
const SPACING_MS = 2500;
async function anilist(query) {
    for (let attempt = 0; attempt < 5; attempt++) {
        const res = await fetch('https://graphql.anilist.co', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({ query }),
        });
        if (res.status === 429) {
            const wait = Number(res.headers.get('retry-after') || 60);
            console.log(`Rate limited, waiting ${wait}s...`);
            await sleep(wait * 1000);
            continue;
        }
        const json = await res.json();
        await sleep(SPACING_MS);
        if (json.errors) console.warn('AniList:', json.errors.map((e) => e.message).join('; '));
        // A missing media is an error for its alias only; keep the rest of the batch.
        return json.data || {};
    }
    throw new Error('AniList kept rate limiting');
}

const FIELDS = `id idMal siteUrl title { romaji english native } format status episodes duration source
    season seasonYear startDate { year month day } endDate { year month day } averageScore popularity genres
    studios(isMain: true) { nodes { name } } coverImage { extraLarge large } description(asHtml: false)
    relations { edges { relationType node { id type title { romaji english } } } }
    characters(role: MAIN, perPage: 6, sort: [ROLE, RELEVANCE]) { nodes { name { full } } }
    tags { name rank isMediaSpoiler isGeneralSpoiler }
    externalLinks { site url type }`;

const slugify = (text) => text.toString().toLowerCase()
    .replace(/\s+/g, '-').replace(/[^\w-]+/g, '').replace(/--+/g, '-').replace(/^-+/, '').replace(/-+$/, '');
const esc = (v) => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const stripTags = (s) => s.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&')
    .replace(/&#039;/g, "'").replace(/\s+/g, ' ').trim();

// --resolve: match each existing folder to an AniList id by searching its current <h1> title.
async function resolvePages() {
    const dirs = fs.readdirSync(OUTPUT_DIR, { withFileTypes: true })
        .filter((d) => d.isDirectory() && fs.existsSync(path.join(OUTPUT_DIR, d.name, 'index.html')))
        .map((d) => d.name).sort();
    const pages = [];
    for (let i = 0; i < dirs.length; i += BATCH) {
        const chunk = dirs.slice(i, i + BATCH).map((slug) => {
            const html = fs.readFileSync(path.join(OUTPUT_DIR, slug, 'index.html'), 'utf8');
            const h1 = (html.match(/<h1>([^<]+)<\/h1>/) || [])[1];
            return { slug, title: h1 ? h1.trim().replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#039;/g, "'") : slug.replace(/-/g, ' ') };
        });
        const q = chunk.map((c, j) => `a${j}: Page(perPage: 5) { media(search: ${JSON.stringify(c.title)}, type: ANIME, sort: SEARCH_MATCH) { id title { romaji english } } }`).join('\n');
        const data = await anilist(`{ ${q} }`);
        chunk.forEach((c, j) => {
            const hits = (data[`a${j}`] && data[`a${j}`].media) || [];
            const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            const exact = hits.find((m) => slugify(m.title.english || m.title.romaji) === c.slug
                || norm(m.title.romaji) === norm(c.title) || norm(m.title.english) === norm(c.title));
            const pick = exact || hits[0];
            if (!pick) return console.warn(`No AniList match for ${c.slug}`);
            if (!exact) console.warn(`Check ${c.slug}: "${c.title}" -> "${pick.title.english || pick.title.romaji}" (${pick.id})`);
            pages.push({ slug: c.slug, anilistId: pick.id });
        });
        console.log(`Resolved ${Math.min(i + BATCH, dirs.length)}/${dirs.length}`);
    }
    fs.writeFileSync(PAGES_JSON, JSON.stringify(pages, null, 2) + '\n');
    return pages;
}

async function fetchMedia(pages) {
    const byId = new Map();
    for (let i = 0; i < pages.length; i += BATCH) {
        const chunk = pages.slice(i, i + BATCH);
        const q = chunk.map((p, j) => `a${j}: Media(id: ${p.anilistId}, type: ANIME) { ${FIELDS} }`).join('\n');
        const data = await anilist(`{ ${q} }`);
        chunk.forEach((p, j) => data[`a${j}`] && byId.set(p.anilistId, data[`a${j}`]));
        console.log(`Fetched ${Math.min(i + BATCH, pages.length)}/${pages.length}`);
    }
    return byId;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const monthYear = (d) => (d && d.year ? (d.month ? `${MONTHS[d.month - 1]} ${d.year}` : String(d.year)) : null);
const isoDate = (d) => (d && d.year ? [d.year, d.month, d.day].filter(Boolean).map((n, i) => (i ? String(n).padStart(2, '0') : n)).join('-') : null);
const FORMAT = { TV: 'TV anime series', TV_SHORT: 'short-form TV anime', MOVIE: 'anime film', OVA: 'OVA', ONA: 'web anime (ONA)', SPECIAL: 'anime special', MUSIC: 'anime music video' };
const FORMAT_LABEL = { TV: 'TV', TV_SHORT: 'TV Short', MOVIE: 'Movie', OVA: 'OVA', ONA: 'ONA', SPECIAL: 'Special', MUSIC: 'Music' };
const SOURCE = { MANGA: 'manga', LIGHT_NOVEL: 'light novel', NOVEL: 'novel', WEB_NOVEL: 'web novel', VISUAL_NOVEL: 'visual novel', VIDEO_GAME: 'video game', GAME: 'game', WEB_MANGA: 'web manga', ORIGINAL: 'original story', OTHER: 'other source', COMIC: 'comic', LIVE_ACTION: 'live-action work', MULTIMEDIA_PROJECT: 'multimedia project', PICTURE_BOOK: 'picture book' };
const STATUS = { FINISHED: 'Finished', RELEASING: 'Airing', NOT_YET_RELEASED: 'Not yet aired', CANCELLED: 'Cancelled', HIATUS: 'On hiatus' };
// In display order: the story's own seasons first, then everything around it.
const RELATION = { PREQUEL: 'Prequel', SEQUEL: 'Sequel', PARENT: 'Main story', SPIN_OFF: 'Spin-off', SIDE_STORY: 'Side story', ALTERNATIVE: 'Alternative version', SUMMARY: 'Summary' };
const RELATION_ORDER = Object.keys(RELATION);
const an = (word) => (/^[aeiou]/i.test(word) ? 'an' : 'a');
const titleOf = (m) => m.title.english || m.title.romaji;

function introText(m) {
    const t = titleOf(m);
    const studio = m.studios.nodes[0] && m.studios.nodes[0].name;
    const kind = FORMAT[m.format] || 'anime';
    let s = `${t} is ${an(kind)} ${kind}`;
    if (studio) s += ` by ${studio}`;
    const start = monthYear(m.startDate);
    if (start) s += m.status === 'NOT_YET_RELEASED' ? `, scheduled for ${start}` : `, first released in ${start}`;
    if (m.source === 'ORIGINAL') s += ', based on an original story';
    else if (SOURCE[m.source]) s += `, adapted from ${an(SOURCE[m.source])} ${SOURCE[m.source]}`;
    s += '.';
    if (m.format === 'MOVIE') {
        if (m.duration) s += ` It runs about ${m.duration} minutes.`;
    } else if (m.status === 'FINISHED' && m.episodes) {
        const end = monthYear(m.endDate);
        s += ` It ran for ${m.episodes} episode${m.episodes > 1 ? 's' : ''}${m.duration ? ` of about ${m.duration} minutes` : ''}${end && end !== start ? `, ending in ${end}` : ''}.`;
    } else if (m.status === 'RELEASING') {
        s += ' New episodes are still being released.';
    }
    if (m.averageScore) {
        s += ` Viewers on AniList give it an average score of ${(m.averageScore / 10).toFixed(1)}/10`;
        s += m.popularity ? `, and ${m.popularity.toLocaleString('en-US')} members have it on their lists.` : '.';
    }
    return s;
}

// First two sentences of the AniList synopsis, quoted with attribution.
function synopsisExcerpt(m) {
    if (!m.description) return null;
    const text = stripTags(m.description).replace(/\(Source:[^)]*\)/gi, '').replace(/\[Written by[^\]]*\]/gi, '').trim();
    const sentences = text.match(/[^.!?]+[.!?]+["')\]]*/g) || [text];
    let out = sentences.slice(0, 2).join(' ').trim();
    if (out.length > 360) out = out.slice(0, 357).replace(/\s+\S*$/, '') + '…';
    return out;
}

function similar(m, all, slugById) {
    const genres = new Set(m.genres);
    return [...all.values()]
        .filter((o) => o.id !== m.id && slugById.has(o.id) && !m.relations.edges.some((e) => e.node.id === o.id))
        .map((o) => ({ o, overlap: o.genres.filter((g) => genres.has(g)).length }))
        .filter((x) => x.overlap > 0)
        .sort((a, b) => b.overlap - a.overlap || (b.o.averageScore || 0) - (a.o.averageScore || 0))
        .slice(0, 6)
        .map((x) => x.o);
}

function render(template, m, slug, all, slugById) {
    const t = titleOf(m);
    const canonical = `${SITE}/anime/${slug}/`;
    const year = m.seasonYear || (m.startDate && m.startDate.year);
    const studio = m.studios.nodes[0] && m.studios.nodes[0].name;
    const score = m.averageScore ? (m.averageScore / 10).toFixed(1) : null;
    const image = m.coverImage.extraLarge || m.coverImage.large;
    const intro = introText(m);

    const titleTag = `${t}${year ? ` (${year})` : ''} – Episodes, Score & Studio | MyAnimeDex`;
    const formatWord = FORMAT_LABEL[m.format] ? `${FORMAT_LABEL[m.format].toLowerCase()} ` : '';
    const descParts = [`${t} is ${year ? `a ${year} ` : 'an '}${formatWord}anime${studio ? ` by ${studio}` : ''}`];
    if (m.episodes && m.format !== 'MOVIE') descParts[0] += ` with ${m.episodes} episodes`;
    let description = `${descParts[0]}.${score ? ` AniList score ${score}/10.` : ''} Track it and get episode reminders in MyAnimeDex.`;
    if (description.length > 165) description = `${descParts[0]}. Track it and get episode reminders in MyAnimeDex.`;

    const facts = [
        ['Format', FORMAT_LABEL[m.format]],
        ['Episodes', m.format === 'MOVIE' ? null : m.episodes],
        [m.format === 'MOVIE' ? 'Length' : 'Episode length', m.duration ? `${m.duration} min` : null],
        ['Status', STATUS[m.status]],
        ['Aired', (() => {
            const a = monthYear(m.startDate);
            const b = monthYear(m.endDate);
            return a ? (b && b !== a ? `${a} – ${b}` : a) : null;
        })()],
        ['Season', m.season && m.seasonYear ? `${m.season[0]}${m.season.slice(1).toLowerCase()} ${m.seasonYear}` : null],
        ['Studio', studio],
        ['Source', SOURCE[m.source] ? SOURCE[m.source][0].toUpperCase() + SOURCE[m.source].slice(1) : null],
        ['AniList score', score ? `${score} / 10` : null],
        ['AniList members', m.popularity ? m.popularity.toLocaleString('en-US') : null],
    ].filter(([, v]) => v != null && v !== '');

    const related = m.relations.edges
        .filter((e) => e.node.type === 'ANIME' && RELATION[e.relationType])
        .sort((a, b) => RELATION_ORDER.indexOf(a.relationType) - RELATION_ORDER.indexOf(b.relationType)
            || slugById.has(b.node.id) - slugById.has(a.node.id))
        .slice(0, 6)
        .map((e) => {
            const name = esc(e.node.title.english || e.node.title.romaji);
            const target = slugById.get(e.node.id);
            return `<li><span>${RELATION[e.relationType]}</span>${target ? `<a href="../${target}/">${name}</a>` : name}</li>`;
        });

    const excerpt = synopsisExcerpt(m);
    const alt = [m.title.romaji, m.title.native]
        .filter((a, i, all) => a && a.toLowerCase() !== t.toLowerCase() && all.indexOf(a) === i);
    const characters = m.characters.nodes.map((c) => c.name.full).filter(Boolean);
    const themes = m.tags.filter((g) => g.rank >= 60 && !g.isMediaSpoiler && !g.isGeneralSpoiler).slice(0, 8).map((g) => g.name);
    const streaming = m.externalLinks.filter((l) => l.type === 'STREAMING')
        .filter((l, i, all) => all.findIndex((x) => x.site === l.site) === i).slice(0, 8);
    const more = similar(m, all, slugById);

    const content = `    <section class="anime-hero">
        <div class="anime-image-container">
            <img src="${esc(image)}" alt="${esc(t)} poster" class="anime-poster" width="460" height="650">
        </div>
        <div class="anime-info">
            ${score ? `<div class="anime-score"><ion-icon name="star"></ion-icon> ${score} / 10 on AniList</div>` : ''}
            <h1>${esc(t)}</h1>
            ${alt.length ? `<p class="alt-titles">${alt.map(esc).join(' · ')}</p>` : ''}
            <div class="genre-chips">${m.genres.map((g) => `<span>${esc(g)}</span>`).join('')}</div>
            <p class="anime-summary">${esc(intro)}</p>

            <h2>Track ${esc(t)} on <span class="accent">MyAnimeDex</span></h2>
            <p style="color: #aaa; margin-bottom: 30px;">Mark every episode you watch, get a reminder when new episodes air and rank it in your lists.</p>

            <div class="hero-buttons">
                <a class="store-badge" href="https://apps.apple.com/app/id6758043488" rel="noopener"><img src="../../assets/badges/app-store.svg" width="150" height="50" alt="Download on the App Store"></a>
                <a class="store-badge" href="https://play.google.com/store/apps/details?id=com.myanimedex.app" rel="noopener"><img src="../../assets/badges/google-play.png" width="169" height="50" alt="Get it on Google Play"></a>
            </div>
        </div>
    </section>

    <section class="anime-details">
        <div class="details-grid">
            <div>
                <h2>Overview</h2>
                <dl class="facts">
${facts.map(([k, v]) => `                    <dt>${k}</dt><dd>${esc(v)}</dd>`).join('\n')}
                </dl>
            </div>
            <div>
${excerpt ? `                <h2>Synopsis</h2>
                <p class="synopsis">${esc(excerpt)}</p>
                <p class="source">Excerpt from <a href="${esc(m.siteUrl)}" rel="noopener">${esc(t)} on AniList</a>.</p>` : ''}
${characters.length ? `                <h2>Main characters</h2>
                <p class="synopsis">${characters.map(esc).join(', ')}.</p>` : ''}
${themes.length ? `                <h2>Themes</h2>
                <div class="genre-chips" style="justify-content:flex-start">${themes.map((g) => `<span>${esc(g)}</span>`).join('')}</div>` : ''}
${streaming.length ? `                <h2>Where to watch</h2>
                <p class="synopsis">Official streams listed on AniList: ${streaming.map((l) => `<a href="${esc(l.url)}" rel="nofollow noopener">${esc(l.site)}</a>`).join(', ')}. Availability depends on your country.</p>` : ''}
${related.length ? `                <h2>Related anime</h2>
                <ul class="related">
                    ${related.join('\n                    ')}
                </ul>` : ''}
            </div>
        </div>
${more.length ? `        <h2>More like ${esc(t)}</h2>
        <div class="more-grid">
${more.map((o) => `            <a class="more-card" href="../${slugById.get(o.id)}/"><img src="${esc(o.coverImage.large)}" alt="" loading="lazy" width="230" height="345"><strong>${esc(titleOf(o))}</strong>${o.averageScore ? `<small>★ ${(o.averageScore / 10).toFixed(1)}</small>` : ''}</a>`).join('\n')}
        </div>` : ''}
    </section>`;

    const work = {
        '@type': m.format === 'MOVIE' ? 'Movie' : 'TVSeries',
        name: t,
        alternateName: alt.length ? alt : undefined,
        url: canonical,
        image,
        genre: m.genres,
        inLanguage: 'ja',
        numberOfEpisodes: m.format !== 'MOVIE' && m.episodes ? m.episodes : undefined,
        startDate: isoDate(m.startDate) || undefined,
        endDate: m.status === 'FINISHED' && m.format !== 'MOVIE' ? isoDate(m.endDate) || undefined : undefined,
        productionCompany: studio ? { '@type': 'Organization', name: studio } : undefined,
        sameAs: [m.siteUrl, m.idMal ? `https://myanimelist.net/anime/${m.idMal}` : null].filter(Boolean),
    };
    const graph = {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'BreadcrumbList',
                itemListElement: [
                    { '@type': 'ListItem', position: 1, name: 'MyAnimeDex', item: `${SITE}/` },
                    { '@type': 'ListItem', position: 2, name: 'Top 100 Anime', item: `${SITE}/anime/` },
                    { '@type': 'ListItem', position: 3, name: t, item: canonical },
                ],
            },
            work,
        ],
    };
    const jsonld = JSON.stringify(graph, null, 2).replace(/<\//g, '<\\/').split('\n').map((l) => '    ' + l).join('\n');

    return template
        .replace(/{{TITLE_TAG}}/g, esc(titleTag))
        .replace(/{{DESCRIPTION}}/g, esc(description))
        .replace(/{{IMAGE}}/g, esc(image))
        .replace(/{{SLUG}}/g, slug)
        .replace('{{JSONLD}}', jsonld)
        .replace('{{CONTENT}}', content);
}

async function main() {
    const template = fs.readFileSync(TEMPLATE_PATH, 'utf8');
    const pages = process.argv.includes('--resolve') || !fs.existsSync(PAGES_JSON)
        ? await resolvePages()
        : JSON.parse(fs.readFileSync(PAGES_JSON, 'utf8'));
    const all = await fetchMedia(pages);
    const slugById = new Map(pages.map((p) => [p.anilistId, p.slug]));
    for (const { slug, anilistId } of pages) {
        const m = all.get(anilistId);
        if (!m) { console.warn(`Skipped ${slug}: AniList returned nothing for ${anilistId}`); continue; }
        fs.mkdirSync(path.join(OUTPUT_DIR, slug), { recursive: true });
        fs.writeFileSync(path.join(OUTPUT_DIR, slug, 'index.html'), render(template, m, slug, all, slugById));
    }
    console.log(`Done: ${all.size} pages.`);
}

main().catch((error) => {
    console.error('Error generating pages:', error);
    process.exit(1);
});
