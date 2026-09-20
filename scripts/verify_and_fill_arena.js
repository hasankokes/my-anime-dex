const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      let value = (match[2] || '').trim();
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
      process.env[match[1]] = value;
    }
  });
}

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const delay = (ms) => new Promise(res => setTimeout(res, ms));

async function fetchGraphQL(query, variables = {}) {
  const res = await fetch('https://graphql.anilist.co', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });

  if (res.status === 429) {
    console.warn("AniList Rate Limit (429)! Waiting 6s...");
    await delay(6000);
    return fetchGraphQL(query, variables);
  }

  if (!res.ok) {
    throw new Error(`AniList HTTP ${res.status}: ${res.statusText}`);
  }

  const json = await res.json();
  if (json.errors) {
    throw new Error(`AniList GQL Error: ${JSON.stringify(json.errors)}`);
  }
  return json.data;
}

const MEDIA_QUERY = `
query ($page: Int, $perPage: Int, $genre_in: [String], $tag_in: [String], $format_in: [MediaFormat], $sort: [MediaSort], $search: String) {
  Page (page: $page, perPage: $perPage) {
    media (
      genre_in: $genre_in,
      tag_in: $tag_in,
      format_in: $format_in,
      sort: $sort,
      search: $search,
      isAdult: false
    ) {
      id
      idMal
      title {
        romaji
        english
      }
      coverImage {
        extraLarge
        large
      }
      averageScore
      format
      genres
    }
  }
}
`;

function getFranchiseKey(title) {
  if (!title) return '';
  let clean = title.toLowerCase();
  clean = clean.replace(/season\s*\d+/gi, '')
               .replace(/\d+(st|nd|rd|th)\s*season/gi, '')
               .replace(/part\s*\d+/gi, '')
               .replace(/the\s*final\s*season/gi, '')
               .replace(/[:\-–].*$/, '')
               .trim();
  return clean || title.toLowerCase();
}

async function fillSeinenAnime() {
  console.log("\nFilling Seinen & Dark Fantasy Category...");
  const items = [];
  const seenFranchises = new Set();
  const seenIds = new Set();

  for (let page = 1; page <= 5; page++) {
    const data = await fetchGraphQL(MEDIA_QUERY, {
      page,
      perPage: 50,
      genre_in: ['Psychological', 'Drama', 'Thriller', 'Mystery'],
      sort: ['SCORE_DESC'],
    });

    const mediaList = data?.Page?.media || [];
    for (const m of mediaList) {
      if (items.length >= 75) break;
      const malId = m.idMal || m.id;
      if (seenIds.has(malId)) continue;
      const title = m.title?.english || m.title?.romaji;
      const imageUrl = m.coverImage?.extraLarge || m.coverImage?.large;
      if (!title || !imageUrl) continue;

      const franchiseKey = getFranchiseKey(title);
      if (seenFranchises.has(franchiseKey)) continue;

      seenFranchises.add(franchiseKey);
      seenIds.add(malId);

      items.push({
        category: 'seinen_anime',
        item_id: malId,
        name: title,
        image_url: imageUrl,
      });
    }
    await delay(1000);
  }

  console.log(`Upserting ${items.length} items for [seinen_anime]...`);
  for (let i = 0; i < items.length; i += 50) {
    const batch = items.slice(i, i + 50);
    await supabase.from('arena_pools').upsert(batch, { onConflict: 'category,item_id' });
  }
}

async function verifyCounts() {
  console.log("\n==========================================");
  console.log("ARENA POOLS CATEGORY COUNTS IN SUPABASE:");
  console.log("==========================================");

  const categories = [
    'all_time_anime',
    'movie_anime',
    'shounen_anime',
    'action_anime',
    'isekai',
    'romance',
    'comedy_anime',
    'horror_anime',
    'drama_anime',
    'seinen_anime',
    'worst_sequels',
    'waifu',
    'husbando'
  ];

  for (const cat of categories) {
    const { count, error } = await supabase
      .from('arena_pools')
      .select('*', { count: 'exact', head: true })
      .eq('category', cat);

    if (error) {
      console.error(`Error checking count for ${cat}:`, error.message);
    } else {
      console.log(`- ${cat.padEnd(20)}: ${count} items`);
    }
  }
  console.log("==========================================\n");
}

async function run() {
  await fillSeinenAnime();
  await verifyCounts();
}

run().catch(console.error);
