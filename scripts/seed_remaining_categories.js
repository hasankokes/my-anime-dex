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
    console.warn("AniList Rate Limit! Waiting 10s...");
    await delay(10000);
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

const MEDIA_BATCH_QUERY = `
query ($idMal_in: [Int], $page: Int, $perPage: Int, $genre_in: [String], $sort: [MediaSort]) {
  Page (page: $page, perPage: $perPage) {
    media (
      idMal_in: $idMal_in,
      genre_in: $genre_in,
      sort: $sort,
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
    }
  }
}
`;

const CHARACTER_QUERY = `
query ($page: Int, $perPage: Int, $sort: [CharacterSort]) {
  Page (page: $page, perPage: $perPage) {
    characters (sort: $sort) {
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

async function seedSeinen() {
  console.log("\n1. Seeding Seinen & Dark Fantasy Category...");
  const items = [];
  const seenFranchises = new Set();
  const seenIds = new Set();

  for (let page = 1; page <= 5; page++) {
    const data = await fetchGraphQL(MEDIA_BATCH_QUERY, {
      page,
      perPage: 50,
      genre_in: ['Psychological', 'Drama', 'Thriller', 'Mystery'],
      sort: ['SCORE_DESC'],
    });

    const list = data?.Page?.media || [];
    for (const m of list) {
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

  for (let i = 0; i < items.length; i += 50) {
    const batch = items.slice(i, i + 50);
    await supabase.from('arena_pools').upsert(batch, { onConflict: 'category,item_id' });
  }
  console.log(`Upserted ${items.length} items for seinen_anime`);
}

const WORST_SEQUELS_MAL_IDS = [
  40356, // The Promised Neverland Season 2
  32379, // Berserk (2016)
  27899, // Tokyo Ghoul Root A
  36511, // Tokyo Ghoul:re
  37799, // Tokyo Ghoul:re 2nd Season
  39701, // The Seven Deadly Sins: Wrath of the Gods
  41491, // The Seven Deadly Sins: Dragon's Judgement
  40357, // The Rising of the Shield Hero Season 2
  34134, // One Punch Man Season 2
  48413, // The Devil Is a Part-Timer! Season 2
  54637, // The Devil Is a Part-Timer! Season 2 Sequel
  23281, // Psycho-Pass 2
  27989, // Aldnoah.Zero Part 2
  31757, // Terra Formars Revenge
  33010, // FLCL Progressive
  35848, // FLCL Alternative
  34566, // Boruto: Naruto Next Generations
  225,   // Dragon Ball GT
  12471, // Eureka Seven AO
  23259, // Gundam Reconguista in G
  94,    // Mobile Suit Gundam SEED Destiny
  37976, // Kemono Friends 2
  52635, // Tower of God Season 2
  47307, // Goblin Slayer II
  34281, // High School DxD Hero
  36633, // Date A Live III
  21881, // Sword Art Online II
  36474, // Sword Art Online: Alicization
  40698, // Ex-Arm
  40074, // Gibiate
  50891, // Lucifer and the Biscuit Hammer
  449,   // Rurouni Kenshin: Reflection
  30485, // Chaos;Child
  4896,  // Umineko: When They Cry
  41006, // Higurashi: When They Cry - Gou
  48849, // Higurashi: When They Cry - Sotsu
  33047, // Fate/Extra Last Encore
  34662, // Fate/Apocrypha
  41911, // Yashahime: Princess Half-Demon
  6707,  // Black Butler II
  35849, // Darling in the Franxx
  39940, // Shokugeki no Souma Season 4
  41457, // Shokugeki no Souma Season 5
  32901, // Kabaneri of the Iron Fortress
  10793, // Guilty Crown
  32848, // Big Order
  32907, // Mayoiga
  29758, // Taboo Tattoo
  44961, // Platinum End
  9465,  // Deadman Wonderland
  2476,  // School Days
  19315, // Pupa
  36024, // King's Game
  44511, // Chainsaw Man
  51498, // Masamune-kun's Revenge R
  51179, // Classroom of the Elite Season 2
  51180, // Classroom of the Elite Season 3
  37675, // Overlord III
  36882, // Arifureta
  33449, // Bloodivores
  44942, // Record of Ragnarok
  34542, // Inuyashiki
  1626,  // Devilman Lady
  32981, // Hand Shakers
  42260, // Ninja Collection
  28989, // Vampire Holmes
  34223, // Forest Fairy Five
  40497, // Mahouka Koukou no Rettousei: Raihousha-hen
  40704, // Megalo Box 2: Nomad
  34577, // Nanatsu no Taizai: Imashime no Fukkatsu
  16011, // Tokyo Ravens
  27991, // K Project: Return of Kings
  33506  // Blue Exorcist: Kyoto Saga
];

async function seedWorstSequels() {
  console.log("\n2. Seeding Worst Sequels & Disappointments Category (Batch Mode)...");
  
  const data = await fetchGraphQL(MEDIA_BATCH_QUERY, {
    idMal_in: WORST_SEQUELS_MAL_IDS,
    perPage: 50,
    page: 1,
  });

  const data2 = await fetchGraphQL(MEDIA_BATCH_QUERY, {
    idMal_in: WORST_SEQUELS_MAL_IDS,
    perPage: 50,
    page: 2,
  });

  const mediaList = [...(data?.Page?.media || []), ...(data2?.Page?.media || [])];
  const items = [];
  const seenIds = new Set();

  for (const m of mediaList) {
    const malId = m.idMal || m.id;
    if (seenIds.has(malId)) continue;
    seenIds.add(malId);

    const title = m.title?.english || m.title?.romaji;
    const imageUrl = m.coverImage?.extraLarge || m.coverImage?.large;
    if (!title || !imageUrl) continue;

    items.push({
      category: 'worst_sequels',
      item_id: malId,
      name: title,
      image_url: imageUrl,
    });
  }

  for (let i = 0; i < items.length; i += 50) {
    const batch = items.slice(i, i + 50);
    await supabase.from('arena_pools').upsert(batch, { onConflict: 'category,item_id' });
  }
  console.log(`Upserted ${items.length} items for worst_sequels`);
}

async function seedCharacters() {
  console.log("\n3. Seeding Waifu & Husbando Categories...");
  const waifus = [];
  const husbandos = [];
  const seenIds = new Set();

  for (let page = 1; page <= 6; page++) {
    const data = await fetchGraphQL(CHARACTER_QUERY, {
      page,
      perPage: 50,
      sort: ['FAVOURITES_DESC'],
    });

    const chars = data?.Page?.characters || [];
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
    await delay(1000);
  }

  if (waifus.length > 0) {
    for (let i = 0; i < waifus.length; i += 50) {
      const batch = waifus.slice(i, i + 50);
      await supabase.from('arena_pools').upsert(batch, { onConflict: 'category,item_id' });
    }
    console.log(`Upserted ${waifus.length} waifus`);
  }

  if (husbandos.length > 0) {
    for (let i = 0; i < husbandos.length; i += 50) {
      const batch = husbandos.slice(i, i + 50);
      await supabase.from('arena_pools').upsert(batch, { onConflict: 'category,item_id' });
    }
    console.log(`Upserted ${husbandos.length} husbandos`);
  }
}

async function verifyAllCounts() {
  console.log("\n==================================================");
  console.log("🔥 FINAL VERIFICATION: ARENA POOLS IN SUPABASE 🔥");
  console.log("==================================================");

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

  let totalItems = 0;
  for (const cat of categories) {
    const { count, error } = await supabase
      .from('arena_pools')
      .select('*', { count: 'exact', head: true })
      .eq('category', cat);

    if (error) {
      console.error(`Error count for ${cat}:`, error.message);
    } else {
      totalItems += (count || 0);
      console.log(`✅ ${cat.padEnd(20)} : ${count} items`);
    }
  }
  console.log(`\n🎉 TOTAL ITEMS ACROSS ALL CATEGORIES: ${totalItems}`);
  console.log("==================================================\n");
}

async function run() {
  await seedSeinen();
  await seedWorstSequels();
  await seedCharacters();
  await verifyAllCounts();
}

run().catch(console.error);
