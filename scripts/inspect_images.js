const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

async function inspectImages() {
  const { data, error } = await supabase
    .from('arena_pools')
    .select('item_id, name, category, image_url')
    .limit(20);

  if (error) {
    console.error(error);
    return;
  }

  console.log("Sample image URLs in arena_pools:");
  for (const item of data) {
    console.log(`[${item.category}] ${item.name} -> ${item.image_url}`);
  }

  // Let's test HTTP status of the first 5 images
  console.log("\nTesting HTTP HEAD on images:");
  for (const item of data.slice(0, 5)) {
    try {
      const res = await fetch(item.image_url, { method: 'HEAD' });
      console.log(`${res.status} ${res.statusText} -> ${item.image_url}`);
    } catch (e) {
      console.log(`FAIL ${e.message} -> ${item.image_url}`);
    }
  }
}

inspectImages();
