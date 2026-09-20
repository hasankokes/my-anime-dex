const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  // Can we fetch current watch_activity to see if there are any rows?
  const { data, error } = await supabase.from('watch_activity').select('*').limit(5);
  console.log("Current rows in watch_activity:", data);
  if (error) console.error("Error:", error);
}
run();
