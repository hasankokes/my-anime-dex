const fs = require('fs');
const path = require('path');

const TEMPLATE_PATH = path.join(__dirname, '../web/anime-template.html');
const OUTPUT_DIR = path.join(__dirname, '../web/anime');

// Helper to sleep (to avoid rate limits if needed, though 2 requests is fine)
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchTopAnime() {
    let allAnime = [];

    // Fetch top 4 pages (approx 100 anime)
    for (let i = 1; i <= 4; i++) {
        console.log(`Fetching page ${i}...`);
        try {
            const res = await fetch(`https://api.jikan.moe/v4/top/anime?page=${i}`);
            const data = await res.json();
            if (data.data) {
                allAnime = [...allAnime, ...data.data];
            }
            await sleep(1000); // Rate limit protection
        } catch (e) {
            console.error(`Error fetching page ${i}:`, e);
        }
    }

    return allAnime;
}

function slugify(text) {
    return text.toString().toLowerCase()
        .replace(/\s+/g, '-')           // Replace spaces with -
        .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
        .replace(/\-\-+/g, '-')         // Replace multiple - with single -
        .replace(/^-+/, '')             // Trim - from start of text
        .replace(/-+$/, '');            // Trim - from end of text
}

async function generatePages() {
    try {
        // Read template
        const template = fs.readFileSync(TEMPLATE_PATH, 'utf8');

        // Fetch Data
        const animeList = await fetchTopAnime();
        console.log(`Fetched ${animeList.length} anime.`);

        // Ensure output directory exists
        if (!fs.existsSync(OUTPUT_DIR)) {
            fs.mkdirSync(OUTPUT_DIR, { recursive: true });
        }

        // Generate each page
        for (const anime of animeList) {
            const slug = slugify(anime.title_english || anime.title); // Prefer English title for slug
            const animeDir = path.join(OUTPUT_DIR, slug);

            if (!fs.existsSync(animeDir)) {
                fs.mkdirSync(animeDir, { recursive: true });
            }

            let html = template;

            // Replace placeholders
            html = html.replace(/{{TITLE}}/g, anime.title);
            html = html.replace(/{{SCORE}}/g, anime.score || 'N/A');
            html = html.replace(/{{IMAGE}}/g, anime.images.jpg.large_image_url || anime.images.jpg.image_url);

            // Truncate summary if too long for meta description
            const summary = anime.synopsis || "Track this anime on MyAnimeDex.";
            const summaryShort = summary.length > 150 ? summary.substring(0, 147) + '...' : summary;

            html = html.replace(/{{SUMMARY}}/g, summary.replace(/"/g, '&quot;')); // Basic escaping
            html = html.replace(/{{SUMMARY_SHORT}}/g, summaryShort.replace(/"/g, '&quot;'));
            html = html.replace(/{{SLUG}}/g, slug);

            fs.writeFileSync(path.join(animeDir, 'index.html'), html);
            console.log(`Generated: ${slug}`);
        }

        console.log('Done generating pages!');

    } catch (error) {
        console.error('Error generating pages:', error);
    }
}

generatePages();
