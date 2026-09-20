const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('watch_activity').insert({
    user_id: '00000000-0000-0000-0000-000000000000', // mock uuid
    username: 'TestUser',
    anime_id: 21,
    anime_title: 'One Piece',
    anime_image: 'https://cdn.myanimelist.net/images/anime/6/73245l.jpg',
    action_type: 'watching'
  });
  console.log("Insert result:", { data, error });
}
run();
