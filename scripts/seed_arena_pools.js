const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const delay = (ms) => new Promise(res => setTimeout(res, ms));

async function fetchFromJikan(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url);
      if (res.status === 429) {
        console.warn(`Rate limited (429). Waiting 5 seconds...`);
        await delay(5000);
        continue;
      }
      if (res.status === 504) {
        console.warn(`Gateway Timeout (504). Waiting 5 seconds...`);
        await delay(5000);
        continue;
      }
      if (!res.ok) throw new Error(`Jikan API Error: ${res.status}`);
      const data = await res.json();
      return data.data || [];
    } catch (error) {
      console.warn(`Fetch Error on attempt ${i + 1}: ${error.message}`);
      await delay(5000);
    }
  }
  console.error(`Failed to fetch ${url} after ${retries} retries.`);
  return [];
}

async function fetchAndSeedCategory(categoryName, url, pages = 4) {
  console.log(`\nFetching data for category: ${categoryName}`);
  let allItems = [];

  for (let page = 1; page <= pages; page++) {
    console.log(`Fetching page ${page}...`);
    const pageUrl = `${url}&page=${page}`;
    const data = await fetchFromJikan(pageUrl);
    
    if (data.length === 0) break;

    for (const anime of data) {
      if (anime.type !== 'TV' && anime.type !== 'Movie') continue;
      
      allItems.push({
        category: categoryName,
        item_id: anime.mal_id,
        name: anime.title_english || anime.title,
        image_url: anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url
      });
    }

    // Increased delay to 3.5 seconds to avoid Jikan 429/504
    await delay(3500); 
  }

  const uniqueItems = [];
  const seenIds = new Set();
  for (const item of allItems) {
    if (!seenIds.has(item.item_id) && item.name && item.image_url) {
      seenIds.add(item.item_id);
      uniqueItems.push(item);
    }
  }

  console.log(`Found ${uniqueItems.length} unique items for ${categoryName}. Inserting to Supabase...`);

  for (let i = 0; i < uniqueItems.length; i += 50) {
    const batch = uniqueItems.slice(i, i + 50);
    const { error } = await supabase
      .from('arena_pools')
      .upsert(batch, { onConflict: 'category,item_id' });

    if (error) {
      console.error(`Error inserting batch:`, error.message);
    } else {
      console.log(`Inserted batch of ${batch.length} items`);
    }
  }
}

async function seed() {
  console.log("Starting Seeding Process...");
  
  // 1. Shounen Anime (Genre ID: 27)
  await fetchAndSeedCategory('shounen_anime', 'https://api.jikan.moe/v4/anime?genres=27&order_by=members&sort=desc', 4);

  // 2. Isekai Anime
  await fetchAndSeedCategory('isekai', 'https://api.jikan.moe/v4/anime?q=isekai&order_by=members&sort=desc', 4);

  // 3. Romance Anime (Genre ID: 22)
  await fetchAndSeedCategory('romance', 'https://api.jikan.moe/v4/anime?genres=22&order_by=members&sort=desc', 4);

  // Top Characters for Waifu/Husbando
  console.log(`\nFetching data for category: waifu/husbando (Characters)`);
  let topCharacters = [];
  for(let page=1; page<=4; page++) {
     const data = await fetchFromJikan(`https://api.jikan.moe/v4/top/characters?page=${page}`);
     for (const char of data) {
         topCharacters.push({
             category: 'waifu',
             item_id: char.mal_id,
             name: char.name,
             image_url: char.images?.jpg?.image_url
         });
     }
     await delay(3500);
  }
  
  if (topCharacters.length > 0) {
      const { error } = await supabase.from('arena_pools').upsert(topCharacters, { onConflict: 'category,item_id' });
      if(!error) console.log(`Inserted ${topCharacters.length} characters.`);
      else console.error(error.message);
  }

  console.log("\nSeeding complete!");
}

seed();
