const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

async function checkAllImages() {
  const { data, error } = await supabase
    .from('arena_pools')
    .select('id, item_id, name, category, image_url');

  if (error) {
    console.error(error);
    return;
  }

  console.log(`Checking ${data.length} images...`);
  let okCount = 0;
  let failCount = 0;
  const failedItems = [];

  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    try {
      const res = await fetch(item.image_url, { method: 'HEAD', headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (res.status === 200) {
        okCount++;
      } else {
        failCount++;
        failedItems.push({ ...item, status: res.status });
      }
    } catch (e) {
      failCount++;
      failedItems.push({ ...item, status: e.message });
    }

    if ((i + 1) % 100 === 0 || i === data.length - 1) {
      console.log(`Progress: ${i + 1}/${data.length} - OK: ${okCount}, Failed: ${failCount}`);
    }
  }

  console.log("\nSummary of failed items (first 15):");
  console.log(failedItems.slice(0, 15));
}

checkAllImages();
