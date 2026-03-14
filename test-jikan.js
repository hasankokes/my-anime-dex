const fetch = require('node-fetch');

const BASE_URL = 'https://api.jikan.moe/v4';

async function testJikan() {
  try {
    console.log('Fetching popular anime...');
    const result = await fetch(`${BASE_URL}/top/anime?filter=bypopularity&page=1`);
    console.log('Status:', result.status);
    if (result.ok) {
        const data = await result.json();
        console.log('Success, received items:', data.data?.length);
    } else {
        const text = await result.text();
        console.log('Error text:', text);
    }
  } catch (e) {
    console.error('Fetch error:', e);
  }
}

testJikan();
