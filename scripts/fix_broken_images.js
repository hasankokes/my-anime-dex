const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

async function fixBrokenEntries() {
  console.log("Fixing broken image entries...");

  // 1. Legend of the Galactic Heroes
  const { error: err1 } = await supabase
    .from('arena_pools')
    .update({ image_url: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx820-2XmY3W4G4yD9.png' })
    .eq('id', '60f472b2-9be1-421a-b12d-556d86bd725e');
  
  if (err1) console.error("Error updating LOTGH:", err1);
  else console.log("✅ Fixed Legend of the Galactic Heroes image URL");

  // 2. The Promised Neverland
  const { error: err2 } = await supabase
    .from('arena_pools')
    .update({ image_url: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx101759-NhSwxvANLQtT.jpg' })
    .eq('id', 'ebefc48a-5f34-4e3d-a8b5-b08d628f07f0');

  if (err2) console.error("Error updating TPN:", err2);
  else console.log("✅ Fixed The Promised Neverland image URL");

  console.log("\nAll entries updated!");
}

fixBrokenEntries();
