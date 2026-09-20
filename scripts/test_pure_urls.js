const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

async function testPureUrls() {
  const { data, error } = await supabase
    .from('arena_pools')
    .select('id, item_id, name, category, image_url');

  if (error) {
    console.error(error);
    return;
  }

  console.log(`Checking ${data.length} original unmodified URLs...`);
  let ok = 0;
  let broken = [];

  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    try {
      const res = await fetch(item.image_url, { method: 'HEAD' });
      if (res.status === 200) {
        ok++;
      } else {
        broken.push({ id: item.id, name: item.name, url: item.image_url, status: res.status });
      }
    } catch (e) {
      broken.push({ id: item.id, name: item.name, url: item.image_url, status: e.message });
    }
  }

  console.log(`\nResult without URL replacement:`);
  console.log(`✅ OK: ${ok} / ${data.length}`);
  console.log(`❌ Broken: ${broken.length} / ${data.length}`);
  if (broken.length > 0) {
    console.log("Sample broken:", broken.slice(0, 10));
  }
}

testPureUrls();
