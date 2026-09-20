const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

async function fullHealthCheck() {
  console.log("🔍 Running full 1,000 image health check on arena_pools...\n");

  const { data, error } = await supabase
    .from('arena_pools')
    .select('id, item_id, name, category, image_url');

  if (error) {
    console.error("Error fetching arena_pools:", error);
    return;
  }

  console.log(`Checking ${data.length} items across all categories...`);
  
  let validCount = 0;
  let invalidItems = [];

  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    try {
      const res = await fetch(item.image_url, { method: 'HEAD', headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (res.status === 200) {
        validCount++;
      } else {
        invalidItems.push({ ...item, status: res.status });
      }
    } catch (err) {
      invalidItems.push({ ...item, status: err.message });
    }

    if ((i + 1) % 200 === 0 || i === data.length - 1) {
      console.log(`[${i + 1}/${data.length}] Valid: ${validCount}, Invalid: ${invalidItems.length}`);
    }
  }

  console.log("\n=================================");
  console.log(`🏁 Total Checked: ${data.length}`);
  console.log(`✅ Fully Working Images: ${validCount} (${((validCount / data.length) * 100).toFixed(2)}%)`);
  console.log(`❌ Invalid Images: ${invalidItems.length}`);
  
  if (invalidItems.length > 0) {
    console.log("Invalid items list:", invalidItems);
  } else {
    console.log("✨ ALL 1,000 IMAGES ARE 100% HEALTHY AND ACCESSIBLE!");
  }
}

fullHealthCheck();
