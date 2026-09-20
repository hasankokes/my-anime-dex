const fs = require('fs');

const file = 'app/anime/[id].tsx';
let content = fs.readFileSync(file, 'utf8');

const logActivityFunc = `
  const logPulseActivity = async (actionStatus: string, currentStatus: string | undefined, session: any, animeData: any) => {
    if (actionStatus !== 'watching' && actionStatus !== 'completed') return;
    if (actionStatus === currentStatus) return; // Prevent duplicate logs for same status

    try {
      // Fire and forget, don't await to block UI
      supabase.from('profiles').select('username').eq('id', session.user.id).single().then(({ data: profile }) => {
        const username = profile?.username || session.user.user_metadata?.username || 'Anime Fan';
        supabase.from('watch_activity').insert({
          user_id: session.user.id,
          username: username,
          anime_id: animeData.mal_id,
          anime_title: animeData.title_english || animeData.title,
          anime_image: animeData.images.jpg.large_image_url,
          action_type: actionStatus,
        }).then(({error}) => {
          if(error) console.error("Pulse Insert Error:", error);
        });
      });
    } catch (e) {
      // ignore
    }
  };
`;

if (!content.includes('logPulseActivity')) {
  content = content.replace('const AnimeDetailsScreen = () => {', logActivityFunc + '\nconst AnimeDetailsScreen = () => {');
}

// In handleEpisodeUpdate
if (!content.includes('logPulseActivity(newStatus, userEntry?.status, { user: session.user }, anime)')) {
  content = content.replace(
    'setUserEntry(newEntry);',
    'setUserEntry(newEntry);\n      logPulseActivity(newStatus, userEntry?.status, session, anime);'
  );
}

// In updateStatus
if (!content.includes('logPulseActivity(status, userEntry?.status, session, anime)')) {
  content = content.replace(
    'setUserEntry(newEntry);\n        setEpisodeInput(newEntry.current_episode?.toString() || \'0\');',
    'setUserEntry(newEntry);\n        setEpisodeInput(newEntry.current_episode?.toString() || \'0\');\n        logPulseActivity(status, userEntry?.status, session, anime);'
  );
}

fs.writeFileSync(file, content);
console.log('Done updating anime/[id].tsx');
