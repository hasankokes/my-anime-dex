const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env if present
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

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

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
    console.warn("AniList Rate Limit! Waiting 5s...");
    await delay(5000);
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
query ($page: Int, $perPage: Int, $genre_in: [String], $tag_in: [String], $format_in: [MediaFormat], $sort: [MediaSort], $search: String, $id_in: [Int]) {
  Page (page: $page, perPage: $perPage) {
    pageInfo {
      hasNextPage
    }
    media (
      genre_in: $genre_in,
      tag_in: $tag_in,
      format_in: $format_in,
      sort: $sort,
      search: $search,
      id_in: $id_in,
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
      popularity
      format
      genres
    }
  }
}
`;

const CHARACTER_QUERY = `
query ($page: Int, $perPage: Int, $sort: [CharacterSort], $search: String) {
  Page (page: $page, perPage: $perPage) {
    characters (sort: $sort, search: $search) {
      id
      name {
        full
        native
      }
      image {
        large
        medium
      }
      favourites
      gender
    }
  }
}
`;

/**
 * Intelligent franchise deduplication key extractor
 */
function getFranchiseKey(title) {
  if (!title) return '';
  let clean = title.toLowerCase();

  // Normalize common franchise names
  if (clean.includes('attack on titan') || clean.includes('shingeki no kyojin')) return 'attack on titan';
  if (clean.includes('gintama')) return 'gintama';
  if (clean.includes('kaguya-sama')) return 'kaguya-sama';
  if (clean.includes('mob psycho')) return 'mob psycho 100';
  if (clean.includes('jujutsu kaisen')) return 'jujutsu kaisen';
  if (clean.includes('demon slayer') || clean.includes('kimetsu no yaiba')) return 'demon slayer';
  if (clean.includes('bleach')) return 'bleach';
  if (clean.includes('fullmetal alchemist') || clean.includes('hagane no renkinjutsushi')) return 'fullmetal alchemist';
  if (clean.includes('vinland saga')) return 'vinland saga';
  if (clean.includes('hunter x hunter')) return 'hunter x hunter';
  if (clean.includes('steins;gate')) return 'steins;gate';
  if (clean.includes('code geass')) return 'code geass';
  if (clean.includes('monogatari') || clean.includes('bakemonogatari') || clean.includes('kizumonogatari') || clean.includes('owarimonogatari')) return 'monogatari series';
  if (clean.includes('haikyuu') || clean.includes('haikyu!!')) return 'haikyuu!!';
  if (clean.includes('jojo')) return 'jojo bizarre adventure';
  if (clean.includes('kingdom')) return 'kingdom';
  if (clean.includes('fate/')) return 'fate series';
  if (clean.includes('one piece')) return 'one piece';
  if (clean.includes('naruto')) return 'naruto';
  if (clean.includes('dragon ball')) return 'dragon ball';
  if (clean.includes('spy x family')) return 'spy x family';
  if (clean.includes('made in abyss')) return 'made in abyss';
  if (clean.includes('re:zero')) return 're:zero';
  if (clean.includes('mushoku tensei')) return 'mushoku tensei';
  if (clean.includes('sword art online')) return 'sword art online';
  if (clean.includes('konosuba')) return 'konosuba';
  if (clean.includes('bocchi the rock')) return 'bocchi the rock';
  if (clean.includes('frieren') || clean.includes('sousou no frieren')) return 'frieren';
  if (clean.includes('death note')) return 'death note';
  if (clean.includes('monster')) return 'monster';
  if (clean.includes('cowboy bebop')) return 'cowboy bebop';
  if (clean.includes('evangelion')) return 'evangelion';
  if (clean.includes('violet evergarden')) return 'violet evergarden';
  if (clean.includes('oshi no ko')) return 'oshi no ko';
  if (clean.includes('my hero academia') || clean.includes('boku no hero')) return 'my hero academia';
  if (clean.includes('clannad')) return 'clannad';
  if (clean.includes('chainsaw man')) return 'chainsaw man';
  if (clean.includes('psycho-pass')) return 'psycho-pass';
  if (clean.includes('bungo stray dogs') || clean.includes('bungou stray dogs')) return 'bungo stray dogs';
  if (clean.includes('fruits basket')) return 'fruits basket';
  if (clean.includes('overlord')) return 'overlord';
  if (clean.includes('slime datta ken') || clean.includes('reincarnated as a slime')) return 'that time i got reincarnated as a slime';
  if (clean.includes('the promised neverland') || clean.includes('yakusoku no neverland')) return 'the promised neverland';
  if (clean.includes('seven deadly sins') || clean.includes('nanatsu no taizai')) return 'the seven deadly sins';
  if (clean.includes('one punch man') || clean.includes('one-punch man')) return 'one punch man';
  if (clean.includes('classroom of the elite') || clean.includes('youkoso jitsuryoku')) return 'classroom of the elite';
  if (clean.includes('shield hero') || clean.includes('tate no yuusha')) return 'shield hero';
  if (clean.includes('dr. stone') || clean.includes('dr stone')) return 'dr stone';
  if (clean.includes('saiki k')) return 'the disastrous life of saiki k';
  if (clean.includes('grand blue')) return 'grand blue';
  if (clean.includes('nichijou')) return 'nichijou';
  if (clean.includes('dorohedoro')) return 'dorohedoro';
  if (clean.includes('golden kamuy')) return 'golden kamuy';
  if (clean.includes('gurren lagann') || clean.includes('tengen toppa')) return 'gurren lagann';
  if (clean.includes('kill la kill')) return 'kill la kill';
  if (clean.includes('chihayafuru')) return 'chihayafuru';
  if (clean.includes('march comes in like a lion') || clean.includes('3-gatsu no lion')) return '3-gatsu no lion';
  if (clean.includes('horimiya')) return 'horimiya';
  if (clean.includes('toradora')) return 'toradora';
  if (clean.includes('your lie in april') || clean.includes('shigatsu wa kimi no uso')) return 'your lie in april';
  if (clean.includes('anohana')) return 'anohana';
  if (clean.includes('noragami')) return 'noragami';
  if (clean.includes('erased') || clean.includes('boku dake ga inai machi')) return 'erased';
  if (clean.includes('black clover')) return 'black clover';
  if (clean.includes('blue lock')) return 'blue lock';
  if (clean.includes('hellsing')) return 'hellsing';
  if (clean.includes('berserk')) return 'berserk';
  if (clean.includes('dororo')) return 'dororo';
  if (clean.includes('parasyte') || clean.includes('kiseijuu')) return 'parasyte';
  if (clean.includes('tokyo ghoul')) return 'tokyo ghoul';

  // Fallback: strip season numbers, parts, suffixes
  clean = clean.replace(/season\s*\d+/gi, '')
               .replace(/\d+(st|nd|rd|th)\s*season/gi, '')
               .replace(/part\s*\d+/gi, '')
               .replace(/the\s*final\s*season/gi, '')
               .replace(/[:\-–].*$/, '')
               .trim();

  return clean || title.toLowerCase();
}

/**
 * Fetch and seed anime list with franchise deduplication (except for movies where each movie is distinct)
 */
async function fetchAndSeedAnimeCategory(category, { genre_in, tag_in, format_in, sort = ['SCORE_DESC'], limit = 75, isMovie = false }) {
  console.log(`\n======================================================`);
  console.log(`Fetching Anime Category: [${category}] (Target: ${limit} items)...`);
  
  const items = [];
  const seenFranchises = new Set();
  const seenIds = new Set();

  let page = 1;
  while (items.length < limit && page <= 6) {
    const data = await fetchGraphQL(MEDIA_QUERY, {
      page,
      perPage: 50,
      genre_in,
      tag_in,
      format_in,
      sort,
    });

    const mediaList = data?.Page?.media || [];
    if (mediaList.length === 0) break;

    for (const m of mediaList) {
      if (items.length >= limit) break;
      const malId = m.idMal || m.id;
      if (seenIds.has(malId)) continue;

      const title = m.title?.english || m.title?.romaji;
      const imageUrl = m.coverImage?.extraLarge || m.coverImage?.large;
      if (!title || !imageUrl) continue;

      const franchiseKey = isMovie ? `${title.toLowerCase()}_${m.id}` : getFranchiseKey(title);
      if (seenFranchises.has(franchiseKey)) continue;

      seenFranchises.add(franchiseKey);
      seenIds.add(malId);

      items.push({
        category,
        item_id: malId,
        name: title,
        image_url: imageUrl,
      });
    }

    page++;
    await delay(800);
  }

  console.log(`Fetched ${items.length} items for [${category}]. Upserting into Supabase...`);
  
  // Upsert in batches of 50
  for (let i = 0; i < items.length; i += 50) {
    const batch = items.slice(i, i + 50);
    const { error } = await supabase.from('arena_pools').upsert(batch, { onConflict: 'category,item_id' });
    if (error) {
      console.error(`Supabase upsert error in [${category}]:`, error.message);
    } else {
      console.log(`Upserted ${batch.length} items (${i + batch.length}/${items.length})`);
    }
  }
}

/**
 * Curated & Researched Infamous Worst Sequels & Disappointments
 */
const WORST_SEQUELS_SEARCH_LIST = [
  { title: "The Promised Neverland Season 2", search: "The Promised Neverland Season 2" },
  { title: "Berserk (2016)", search: "Berserk 2016" },
  { title: "Tokyo Ghoul Root A", search: "Tokyo Ghoul Root A" },
  { title: "Tokyo Ghoul:re", search: "Tokyo Ghoul:re" },
  { title: "The Seven Deadly Sins: Wrath of the Gods", search: "The Seven Deadly Sins: Wrath of the Gods" },
  { title: "The Seven Deadly Sins: Dragon's Judgement", search: "The Seven Deadly Sins: Dragon's Judgement" },
  { title: "The Rising of the Shield Hero Season 2", search: "The Rising of the Shield Hero Season 2" },
  { title: "One Punch Man Season 2", search: "One Punch Man Season 2" },
  { title: "The Devil Is a Part-Timer! Season 2", search: "The Devil Is a Part-Timer! Season 2" },
  { title: "Psycho-Pass 2", search: "Psycho-Pass 2" },
  { title: "Aldnoah.Zero Season 2", search: "Aldnoah.Zero Part 2" },
  { title: "Terra Formars Revenge", search: "Terra Formars Revenge" },
  { title: "FLCL Progressive", search: "FLCL Progressive" },
  { title: "FLCL Alternative", search: "FLCL Alternative" },
  { title: "FLCL: Grunge", search: "FLCL: Grunge" },
  { title: "FLCL: Shoegaze", search: "FLCL: Shoegaze" },
  { title: "Boruto: Naruto Next Generations", search: "Boruto" },
  { title: "Dragon Ball GT", search: "Dragon Ball GT" },
  { title: "Eureka Seven AO", search: "Eureka Seven AO" },
  { title: "Gundam Reconguista in G", search: "Gundam Reconguista in G" },
  { title: "Mobile Suit Gundam SEED Destiny", search: "Gundam SEED Destiny" },
  { title: "Kemono Friends 2", search: "Kemono Friends 2" },
  { title: "Tower of God Season 2", search: "Tower of God Season 2" },
  { title: "Goblin Slayer II", search: "Goblin Slayer II" },
  { title: "High School DxD Hero", search: "High School DxD Hero" },
  { title: "Date A Live III", search: "Date A Live III" },
  { title: "Sword Art Online II", search: "Sword Art Online II" },
  { title: "Sword Art Online: Alicization", search: "Sword Art Online Alicization" },
  { title: "Ex-Arm", search: "Ex-Arm" },
  { title: "Gibiate", search: "Gibiate" },
  { title: "Lucifer and the Biscuit Hammer", search: "Lucifer and the Biscuit Hammer" },
  { title: "Rurouni Kenshin: Reflection", search: "Rurouni Kenshin Reflection" },
  { title: "Chaos;Child", search: "Chaos;Child" },
  { title: "Umineko: When They Cry", search: "Umineko" },
  { title: "Higurashi: When They Cry - Gou", search: "Higurashi no Naku Koro ni Gou" },
  { title: "Higurashi: When They Cry - Sotsu", search: "Higurashi no Naku Koro ni Sotsu" },
  { title: "Fate/Extra Last Encore", search: "Fate/Extra Last Encore" },
  { title: "Fate/Apocrypha", search: "Fate/Apocrypha" },
  { title: "Yashahime: Princess Half-Demon", search: "Yashahime: Princess Half-Demon" },
  { title: "Black Butler II", search: "Black Butler II" },
  { title: "Darling in the Franxx", search: "Darling in the Franxx" },
  { title: "Shokugeki no Souma: Shin no Sara (Season 4)", search: "Shokugeki no Souma Season 4" },
  { title: "Shokugeki no Souma: Gou no Sara (Season 5)", search: "Shokugeki no Souma Season 5" },
  { title: "Kabaneri of the Iron Fortress", search: "Kabaneri of the Iron Fortress" },
  { title: "Guilty Crown", search: "Guilty Crown" },
  { title: "Big Order", search: "Big Order" },
  { title: "Mayoiga (The Lost Village)", search: "Mayoiga" },
  { title: "Taboo Tattoo", search: "Taboo Tattoo" },
  { title: "Platinum End", search: "Platinum End" },
  { title: "Deadman Wonderland", search: "Deadman Wonderland" },
  { title: "School Days", search: "School Days" },
  { title: "Pupa", search: "Pupa" },
  { title: "King's Game (Ousama Game)", search: "Ousama Game The Animation" },
  { title: "Chainsaw Man", search: "Chainsaw Man" },
  { title: "Masamune-kun's Revenge R", search: "Masamune-kun's Revenge R" },
  { title: "Classroom of the Elite Season 2", search: "Classroom of the Elite Season 2" },
  { title: "Classroom of the Elite Season 3", search: "Classroom of the Elite Season 3" },
  { title: "Overlord III", search: "Overlord III" },
  { title: "Arifureta: From Commonplace to World's Strongest", search: "Arifureta" },
  { title: "Bloodivores", search: "Bloodivores" },
  { title: "Record of Ragnarok", search: "Record of Ragnarok" },
  { title: "Inuyashiki", search: "Inuyashiki" },
  { title: "Devilman Lady", search: "Devilman Lady" },
  { title: "Gundam 0083: Stardust Memory", search: "Gundam 0083" },
  { title: "Hand Shakers", search: "Hand Shakers" },
  { title: "Ninja Collection", search: "Ninja Collection" },
  { title: "Vampire Holmes", search: "Vampire Holmes" },
  { title: "Forest Fairy Five", search: "Forest Fairy Five" },
  { title: "Mahouka Koukou no Rettousei: Raihousha-hen", search: "Mahouka Visitor Arc" },
  { title: "Megalo Box 2: Nomad", search: "Megalo Box 2" }
];

async function seedWorstSequels() {
  console.log(`\n======================================================`);
  console.log(`Seeding Category: [worst_sequels] (Curated + Researched Famous Disappointments)...`);
  
  const items = [];
  const seenIds = new Set();

  for (const item of WORST_SEQUELS_SEARCH_LIST) {
    try {
      const data = await fetchGraphQL(MEDIA_QUERY, {
        search: item.search,
        perPage: 3,
      });

      const media = data?.Page?.media?.[0];
      if (media) {
        const malId = media.idMal || media.id;
        if (!seenIds.has(malId)) {
          seenIds.add(malId);
          items.push({
            category: 'worst_sequels',
            item_id: malId,
            name: item.title || media.title.english || media.title.romaji,
            image_url: media.coverImage?.extraLarge || media.coverImage?.large,
          });
        }
      }
      await delay(400);
    } catch (err) {
      console.warn(`Could not find worst sequel: ${item.search}`, err.message);
    }
  }

  console.log(`Found ${items.length} notorious sequels/disappointments. Upserting into Supabase...`);
  for (let i = 0; i < items.length; i += 50) {
    const batch = items.slice(i, i + 50);
    const { error } = await supabase.from('arena_pools').upsert(batch, { onConflict: 'category,item_id' });
    if (error) {
      console.error(`Error upserting worst_sequels:`, error.message);
    } else {
      console.log(`Upserted ${batch.length} worst_sequels items`);
    }
  }
}

/**
 * Top Waifus & Husbandos Seeding (Characters)
 */
async function seedCharacters() {
  console.log(`\n======================================================`);
  console.log(`Seeding Waifu & Husbando Categories...`);

  // Fetch top characters from AniList
  let page = 1;
  const waifus = [];
  const husbandos = [];
  const seenIds = new Set();

  while ((waifus.length < 75 || husbandos.length < 75) && page <= 10) {
    const data = await fetchGraphQL(CHARACTER_QUERY, {
      page,
      perPage: 50,
      sort: ['FAVOURITES_DESC'],
    });

    const chars = data?.Page?.characters || [];
    if (chars.length === 0) break;

    for (const c of chars) {
      if (seenIds.has(c.id)) continue;
      seenIds.add(c.id);

      const name = c.name?.full;
      const imageUrl = c.image?.large || c.image?.medium;
      if (!name || !imageUrl) continue;

      const gender = (c.gender || '').toLowerCase();
      const isFemale = gender === 'female' || gender.includes('female') || gender === 'woman';
      const isMale = gender === 'male' || gender.includes('male') || gender === 'man';

      if (isFemale && waifus.length < 75) {
        waifus.push({
          category: 'waifu',
          item_id: c.id,
          name: name,
          image_url: imageUrl,
        });
      } else if (isMale && husbandos.length < 75) {
        husbandos.push({
          category: 'husbando',
          item_id: c.id,
          name: name,
          image_url: imageUrl,
        });
      }
    }

    page++;
    await delay(700);
  }

  console.log(`Collected ${waifus.length} Waifus and ${husbandos.length} Husbandos. Upserting into Supabase...`);

  if (waifus.length > 0) {
    for (let i = 0; i < waifus.length; i += 50) {
      const batch = waifus.slice(i, i + 50);
      const { error } = await supabase.from('arena_pools').upsert(batch, { onConflict: 'category,item_id' });
      if (error) console.error(`Error inserting waifus:`, error.message);
      else console.log(`Upserted ${batch.length} waifus`);
    }
  }

  if (husbandos.length > 0) {
    for (let i = 0; i < husbandos.length; i += 50) {
      const batch = husbandos.slice(i, i + 50);
      const { error } = await supabase.from('arena_pools').upsert(batch, { onConflict: 'category,item_id' });
      if (error) console.error(`Error inserting husbandos:`, error.message);
      else console.log(`Upserted ${batch.length} husbandos`);
    }
  }
}

async function runFullSeed() {
  console.log("=== STARTING FULL ANIME ARENA SEEDING ===");

  // 1. All-Time Best (Franchise deduplicated)
  await fetchAndSeedAnimeCategory('all_time_anime', {
    format_in: ['TV', 'MOVIE'],
    sort: ['SCORE_DESC'],
    limit: 75,
  });

  // 2. Best Anime Movies (Distinct movie entries)
  await fetchAndSeedAnimeCategory('movie_anime', {
    format_in: ['MOVIE'],
    sort: ['SCORE_DESC'],
    limit: 75,
    isMovie: true,
  });

  // 3. Shounen Anime (Franchise deduplicated)
  await fetchAndSeedAnimeCategory('shounen_anime', {
    genre_in: ['Action', 'Adventure'],
    tag_in: ['Shounen'],
    sort: ['SCORE_DESC'],
    limit: 75,
  });

  // 4. Action & Fights (Franchise deduplicated)
  await fetchAndSeedAnimeCategory('action_anime', {
    genre_in: ['Action'],
    sort: ['SCORE_DESC'],
    limit: 75,
  });

  // 5. Isekai (Franchise deduplicated)
  await fetchAndSeedAnimeCategory('isekai', {
    tag_in: ['Isekai'],
    sort: ['SCORE_DESC'],
    limit: 75,
  });

  // 6. Romance (Franchise deduplicated)
  await fetchAndSeedAnimeCategory('romance', {
    genre_in: ['Romance'],
    sort: ['SCORE_DESC'],
    limit: 75,
  });

  // 7. Comedy (Franchise deduplicated)
  await fetchAndSeedAnimeCategory('comedy_anime', {
    genre_in: ['Comedy'],
    sort: ['SCORE_DESC'],
    limit: 75,
  });

  // 8. Horror & Thriller (Franchise deduplicated)
  await fetchAndSeedAnimeCategory('horror_anime', {
    genre_in: ['Horror', 'Psychological', 'Thriller'],
    sort: ['SCORE_DESC'],
    limit: 75,
  });

  // 9. Drama & Tearjerkers (Franchise deduplicated)
  await fetchAndSeedAnimeCategory('drama_anime', {
    genre_in: ['Drama'],
    sort: ['SCORE_DESC'],
    limit: 75,
  });

  // 10. Seinen & Dark Fantasy (Franchise deduplicated)
  await fetchAndSeedAnimeCategory('seinen_anime', {
    tag_in: ['Seinen', 'Dark Fantasy'],
    sort: ['SCORE_DESC'],
    limit: 75,
  });

  // 11. Worst Sequels & Disappointments (Curated)
  await seedWorstSequels();

  // 12. Waifu & Husbando Characters
  await seedCharacters();

  console.log("\n=== ALL ANIME ARENA CATEGORIES SEEDED SUCCESSFULLY! ===");
}

runFullSeed().catch(err => {
  console.error("FATAL SEED ERROR:", err);
  process.exit(1);
});
