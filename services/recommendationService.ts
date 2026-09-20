import { supabase } from '../lib/supabase';
import { jikanApi, Anime } from '../lib/jikan';

export interface RecommendationReason {
  key: 'matchGenre' | 'highScore' | 'popular';
  params?: { genre?: string };
}

export interface ScoredAnime {
  anime: Anime;
  score: number;
  reasonKeys: RecommendationReason[];
  reasons: string[];
}

export interface UserGenreProfile {
  topGenres: { name: string; count: number }[];
  avgScore: number;
  totalRated: number;
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

let cachedProfileResult: { profile: UserGenreProfile; excludedIds: Set<number> } | null = null;
let lastProfileUserId: string | null = null;
let lastProfileFetchTime = 0;

const genreNameToIdMap: Record<string, string> = {
  'Action': '1',
  'Adventure': '2',
  'Comedy': '4',
  'Avant Garde': '5',
  'Mystery': '7',
  'Drama': '8',
  'Fantasy': '10',
  'Horror': '14',
  'Romance': '22',
  'Sci-Fi': '24',
  'Shoujo': '25',
  'Shounen': '27',
  'Sports': '30',
  'Slice of Life': '36',
  'Supernatural': '37',
  'Thriller': '41',
  'Suspense': '41',
  'Award Winning': '46',
};

export const recommendationService = {
  
  // 1. Analyze User Profile based on their existing list
  async getUserProfile(userId: string): Promise<{ profile: UserGenreProfile; excludedIds: Set<number> }> {
    // Return in-memory cache if fetched within 5 minutes for the same user
    if (
      cachedProfileResult &&
      lastProfileUserId === userId &&
      Date.now() - lastProfileFetchTime < 1000 * 60 * 5
    ) {
      return cachedProfileResult;
    }

    const { data: userAnime } = await supabase
      .from('user_anime_list')
      .select('*')
      .eq('user_id', userId);

    const excludedIds = new Set<number>();
    if (!userAnime || userAnime.length === 0) {
      const emptyResult = {
        profile: { topGenres: [], avgScore: 0, totalRated: 0 },
        excludedIds
      };
      cachedProfileResult = emptyResult;
      lastProfileUserId = userId;
      lastProfileFetchTime = Date.now();
      return emptyResult;
    }

    // Populate excluded IDs so already added anime won't be recommended
    userAnime.forEach(item => {
      if (item.anime_id) {
        excludedIds.add(parseInt(item.anime_id, 10));
      }
    });

    // Calculate accurate totalRated and avgScore across ALL rated items in the user's list
    const scoredItems = userAnime.filter(item => typeof item.score === 'number' && item.score > 0);
    const totalScore = scoredItems.reduce((sum, item) => sum + item.score, 0);
    const avgScore = scoredItems.length > 0 ? totalScore / scoredItems.length : 0;
    const totalRated = scoredItems.length;

    // Prioritize top items for genre analysis (favorites first, then highest scored, then watched)
    const prioritizedList = [...userAnime]
      .sort((a, b) => {
        if (a.is_favorite && !b.is_favorite) return -1;
        if (!a.is_favorite && b.is_favorite) return 1;
        return (b.score || 0) - (a.score || 0);
      })
      .slice(0, 10); // Analyze up to 10 anime for broader taste profile

    const genreFrequencies: Record<string, number> = {};

    // Fetch details in parallel with safe error handling
    const detailsResults = await Promise.allSettled(
      prioritizedList.map(item => jikanApi.getAnimeDetails(item.anime_id.toString()))
    );

    detailsResults.forEach((result, idx) => {
      if (result.status === 'fulfilled' && result.value?.data?.genres) {
        const item = prioritizedList[idx];
        // Weight calculation: Favorite +3, high score (>=9) +3, good score (>=7) +2, others +1
        let weight = 1;
        if (item.is_favorite) weight += 2;
        if (item.score && item.score >= 9) weight += 2;
        else if (item.score && item.score >= 7) weight += 1;

        result.value.data.genres.forEach((g: any) => {
          if (g.name) {
            genreFrequencies[g.name] = (genreFrequencies[g.name] || 0) + weight;
          }
        });
      }
    });

    const sortedGenres = Object.entries(genreFrequencies)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));

    const result = {
      profile: {
        topGenres: sortedGenres.slice(0, 3),
        avgScore: Number(avgScore.toFixed(1)),
        totalRated
      },
      excludedIds
    };

    cachedProfileResult = result;
    lastProfileUserId = userId;
    lastProfileFetchTime = Date.now();

    return result;
  },

  // 2. Fetch and score recommendations based on the profile
  async getRecommendations(profile: UserGenreProfile, excludedIds: Set<number>, targetLanguage: string = 'en'): Promise<ScoredAnime[]> {
    
    // Helper to get popular anime with pagination fallback
    const getPopularFallback = async (): Promise<ScoredAnime[]> => {
      let candidates: Anime[] = [];
      let page = 1;
      while (candidates.length < 10 && page <= 5) {
        const res = await jikanApi.getPopularAnime(page);
        if (!res?.data || res.data.length === 0) break;
        
        const newCands = res.data.filter((a: any) => !excludedIds.has(a.mal_id));
        candidates = [...candidates, ...newCands];
        page++;
        if (candidates.length < 10 && page <= 5) await delay(200);
      }
      
      return candidates.slice(0, 10).map(anime => ({
        anime,
        score: anime.score || 0,
        reasonKeys: [{ key: 'popular' }],
        reasons: targetLanguage === 'tr' 
          ? ['Popüler ve çok izlenenler arasında'] 
          : ['Highly popular and widely watched']
      }));
    };

    if (profile.topGenres.length === 0) {
      return getPopularFallback();
    }

    const genreIds = profile.topGenres
      .map(g => genreNameToIdMap[g.name])
      .filter(Boolean)
      .join(',');

    if (!genreIds) {
      return getPopularFallback();
    }

    let candidates: Anime[] = [];
    let page = 1;
    const minScore = profile.avgScore > 0 ? Math.max(6.5, profile.avgScore - 1) : 7.0;
    
    // Fetch pages to get enough un-excluded anime
    while (candidates.length < 15 && page <= 5) {
      const res = await jikanApi.getAnimeByGenres(genreIds, page, minScore);
      if (!res?.data || res.data.length === 0) break;
      
      const newCands = res.data.filter((a: any) => !excludedIds.has(a.mal_id));
      candidates = [...candidates, ...newCands];
      
      page++;
      if (candidates.length < 15 && page <= 5) await delay(200);
    }

    if (candidates.length === 0) {
      return getPopularFallback();
    }

    const scoredCandidates: ScoredAnime[] = candidates.map(anime => {
      let calculatedScore = 0;
      const reasonKeys: RecommendationReason[] = [];
      const reasons: string[] = [];
      
      const animeGenres = (anime.genres || []).map(g => g.name);

      profile.topGenres.forEach((tg, index) => {
        if (animeGenres.includes(tg.name)) {
          if (index === 0) {
            calculatedScore += 10;
            reasonKeys.push({ key: 'matchGenre', params: { genre: tg.name } });
            reasons.push(targetLanguage === 'tr' 
              ? `${tg.name} tercihinle eşleşiyor`
              : `Matches your ${tg.name} preference`);
          } else {
            calculatedScore += 5;
          }
        }
      });

      if (anime.score && anime.score >= 8.5) {
        calculatedScore += 8;
        reasonKeys.push({ key: 'highScore' });
        reasons.push(targetLanguage === 'tr' ? 'MAL skoru yüksek' : 'Highly rated on MAL');
      } else if (anime.score && anime.score >= 8.0) {
        calculatedScore += 4;
      }

      // If no specific reason triggered yet, add popular tag
      if (reasonKeys.length === 0) {
        reasonKeys.push({ key: 'popular' });
        reasons.push(targetLanguage === 'tr' ? 'Popüler ve çok izlenenler arasında' : 'Highly popular and widely watched');
      }

      return { anime, score: calculatedScore, reasonKeys, reasons };
    });

    return scoredCandidates
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }
};

