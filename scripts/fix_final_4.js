const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

async function fetchFromAniList(query, variables) {
  const res = await fetch('https://graphql.anilist.co', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ query, variables })
  });
  const json = await res.json();
  return json.data;
}

async function fixFinal4() {
  console.log("Fetching exact AniList URLs for the 4 entries...");

  // 1. LOTGH (idMal: 820)
  const qAnime = `query ($idMal: Int) {
    Media(idMal: $idMal, type: ANIME) {
      id
      title { english romaji }
      coverImage { extraLarge large }
    }
  }`;
  
  const lotgh = await fetchFromAniList(qAnime, { idMal: 820 });
  const lotghUrl = lotgh.Media.coverImage.extraLarge || lotgh.Media.coverImage.large;
  console.log("LOTGH URL:", lotghUrl);

  // 2. Assassination Classroom S2 (idMal: 30654)
  const ac = await fetchFromAniList(qAnime, { idMal: 30654 });
  const acUrl = ac.Media.coverImage.extraLarge || ac.Media.coverImage.large;
  console.log("AC S2 URL:", acUrl);

  // 3. Promised Neverland (idMal: 37779)
  const tpn = await fetchFromAniList(qAnime, { idMal: 37779 });
  const tpnUrl = tpn.Media.coverImage.extraLarge || tpn.Media.coverImage.large;
  console.log("TPN URL:", tpnUrl);

  // 4. Gintoki Sakata Character (search)
  const qChar = `query ($search: String) {
    Character(search: $search) {
      id
      name { full }
      image { large }
    }
  }`;
  const gintoki = await fetchFromAniList(qChar, { search: "Gintoki Sakata" });
  const gintokiUrl = gintoki.Character.image.large;
  console.log("Gintoki URL:", gintokiUrl);

  // Now update database
  await supabase.from('arena_pools').update({ image_url: lotghUrl }).eq('id', '60f472b2-9be1-421a-b12d-556d86bd725e');
  await supabase.from('arena_pools').update({ image_url: acUrl }).eq('id', '52317a85-809a-4fc5-ad54-123f0b8bcd47');
  await supabase.from('arena_pools').update({ image_url: tpnUrl }).eq('id', 'ebefc48a-5f34-4e3d-a8b5-b08d628f07f0');
  await supabase.from('arena_pools').update({ image_url: gintokiUrl }).eq('id', 'ad1e1166-9359-490d-b3a4-535a4e302eaa');

  console.log("✅ Updated all 4 items in Supabase!");

  // Verify them
  const testUrls = [lotghUrl, acUrl, tpnUrl, gintokiUrl];
  for (const u of testUrls) {
    const r = await fetch(u, { method: 'HEAD' });
    console.log(`Verification: ${r.status} ${r.statusText} -> ${u}`);
  }
}

fixFinal4();
