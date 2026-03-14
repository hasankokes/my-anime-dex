import { supabase } from '../lib/supabase';
import { jikanApi, Anime } from '../lib/jikan';

export interface ScoredAnime {
  anime: Anime;
  score: number;
  reasons: string[];
}

export interface UserGenreProfile {
  topGenres: { name: string, count: number }[];
  avgScore: number;
  totalRated: number;
}

export const recommendationService = {
  
  // 1. Analyze User Profile based on their existing list
  async getUserProfile(userId: string): Promise<{ profile: UserGenreProfile, excludedIds: Set<number> }> {
    const { data: userAnime } = await supabase
      .from('user_anime_list')
      .select('*')
      .eq('user_id', userId);

    const excludedIds = new Set<number>();
    if (!userAnime || userAnime.length === 0) {
      return { 
        profile: { topGenres: [], avgScore: 0, totalRated: 0 }, 
        excludedIds 
      };
    }

    let totalScore = 0;
    let scoredCount = 0;
    // We only have basic info in the DB, so we need to fetch detailed anime data to get genres
    // To avoid rate limits, we'll only analyze the top 15 highest-rated/favorite anime from the user
    
    // Process existing IDs
    userAnime.forEach(item => excludedIds.add(parseInt(item.anime_id)));

    // Sort to prioritize favorites and highest scored
    const prioritizedList = [...userAnime].sort((a, b) => {
      if (a.is_favorite && !b.is_favorite) return -1;
      if (!a.is_favorite && b.is_favorite) return 1;
      return (b.score || 0) - (a.score || 0);
    }).slice(0, 15); // Top 15

    const genreFrequencies: Record<string, number> = {};

    // Note: To get genre data, we would technically need to fetch details for each anime 
    // from Jikan if we don't store them in Supabase. Since we don't store genres in 'user_anime_list',
    // we'll fetch them from Jikan sequentially with a small delay to respect rate limit.
    for (const item of prioritizedList) {
      if (item.score && item.score > 0) {
        totalScore += item.score;
        scoredCount++;
      }

      try {
        const { data: animeDetail } = await jikanApi.getAnimeDetails(item.anime_id);
        if (animeDetail && animeDetail.genres) {
          // Weight favorites double
          const increment = item.is_favorite ? 2 : 1; 
          animeDetail.genres.forEach(g => {
            genreFrequencies[g.name] = (genreFrequencies[g.name] || 0) + increment;
          });
        }
      } catch (err) {
        console.log(`Failed to fetch details for ${item.anime_id} during analysis`);
      }
    }

    const sortedGenres = Object.entries(genreFrequencies)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));

    return {
      profile: {
        topGenres: sortedGenres.slice(0, 3), // Get top 3
        avgScore: scoredCount > 0 ? totalScore / scoredCount : 0,
        totalRated: scoredCount
      },
      excludedIds
    };
  },

  // 2. Fetch and score recommendations based on the profile
  async getRecommendations(profile: UserGenreProfile, excludedIds: Set<number>, targetLanguage: string = 'en'): Promise<ScoredAnime[]> {
    if (profile.topGenres.length === 0) {
      // Fallback to top anime if no profile
      const res = await jikanApi.getPopularAnime(1);
      return (res?.data || [])
        .filter(a => !excludedIds.has(a.mal_id))
        .slice(0, 10)
        .map(anime => ({
          anime,
          score: anime.score || 0,
          reasons: targetLanguage === 'tr' 
            ? ['Popüler ve çok izlenenler arasında'] 
            : ['Highly popular and widely watched']
        }));
    }

    // Map genre names to Jikan IDs (common ones to avoid another query)
    // In a full prod app we might look this up dynamically, but Jikan requires IDs for search
    const genreIdMap: Record<string, string> = {
      'Action': '1', 'Adventure': '2', 'Comedy': '4', 'Drama': '8', 
      'Fantasy': '10', 'Romance': '22', 'Sci-Fi': '24', 'Slice of Life': '36',
      'Sports': '30', 'Supernatural': '37', 'Horror': '14', 'Mystery': '7', 'Suspense': '41'
    };

    // Construct genre filter string
    const genreIds = profile.topGenres
      .map(g => genreIdMap[g.name])
      .filter(id => id)
      .join(',');

    if (!genreIds) {
       // Fallback to top anime if genres didn't map
       const res = await jikanApi.getPopularAnime();
       return (res?.data || []).filter(a => !excludedIds.has(a.mal_id)).slice(0, 10).map(anime => ({ anime, score: 0, reasons: [] }));
    }

    const res = await jikanApi.getAnimeByGenres(genreIds, 1, Math.max(7, profile.avgScore - 1));
    let candidates = res?.data || [];

    // Score and filter
    candidates = candidates.filter(a => !excludedIds.has(a.mal_id));
    
    const scoredCandidates: ScoredAnime[] = candidates.map(anime => {
      let score = 0;
      const reasons: string[] = [];
      
      const animeGenres = anime.genres.map(g => g.name);

      // Score base on matching top genres
      profile.topGenres.forEach((tg, index) => {
        if (animeGenres.includes(tg.name)) {
          // Main genre matches
          if (index === 0) {
            score += 10;
            reasons.push(targetLanguage === 'tr' 
              ? `${tg.name} severlerin ilgisini çekebilir`
              : `Matches your top preference for ${tg.name}`);
          } else {
            score += 5;
          }
        }
      });

      // Score based on rating
      if (anime.score > 8.5) {
        score += 8;
        reasons.push(targetLanguage === 'tr' ? 'MAL üzerinde çok yüksek puanlı' : 'Highly rated on MAL');
      } else if (anime.score > 8.0) {
        score += 4;
      }

      return { anime, score, reasons };
    });

    // Sort by computed score
    return scoredCandidates
      .sort((a, b) => b.score - a.score)
      .slice(0, 10); // Return top 10 recommended
  }
};
