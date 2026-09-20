/**
 * AniList API — Drop-in replacement for jikanApi
 *
 * Every public function matches the existing jikanApi signature exactly,
 * so the rest of the codebase requires zero import changes.
 *
 * Additionally exports `fetchCharacterImages()` for the profile avatar picker
 * (previously a direct Jikan REST call in profile.tsx).
 */

import { fetchGraphQL } from './client';
import {
  ANIME_PAGE_QUERY,
  ANIME_DETAIL_QUERY,
  ANIME_DETAIL_BY_ID_QUERY,
  CHARACTER_PAGE_QUERY,
} from './queries';
import {
  normalizeMedia,
  normalizeMediaPage,
  JIKAN_GENRE_ID_TO_NAME,
} from './normalizer';

const PER_PAGE = 25;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert a comma-separated string of Jikan genre IDs to AniList genre names */
function genreIdsToNames(genreIdStr: string): string[] {
  return genreIdStr
    .split(',')
    .map((id) => JIKAN_GENRE_ID_TO_NAME[id.trim()])
    .filter(Boolean);
}

/** Determine the current anime season and year */
function getCurrentSeason(): { season: string; year: number } {
  const now = new Date();
  const month = now.getMonth() + 1; // 1-12
  const year = now.getFullYear();
  let season: string;
  if (month <= 3) season = 'WINTER';
  else if (month <= 6) season = 'SPRING';
  else if (month <= 9) season = 'SUMMER';
  else season = 'FALL';
  return { season, year };
}

// ---------------------------------------------------------------------------
// Public API — same interface as the old jikanApi
// ---------------------------------------------------------------------------

export const anilistApi = {
  /**
   * Top-rated anime (sorted by score descending).
   * Replaces: Jikan `/top/anime?page={page}`
   */
  getTopAnime: async (page = 1) => {
    const data = await fetchGraphQL(ANIME_PAGE_QUERY, {
      page,
      perPage: PER_PAGE,
      sort: ['SCORE_DESC'],
      isAdult: false,
    }, {
      cacheKey: `top_anime_${page}`,
    });
    return normalizeMediaPage(data, page);
  },

  /**
   * Full anime details by MAL ID (with AniList ID fallback).
   * Replaces: Jikan `/anime/{id}`
   */
  getAnimeDetails: async (id: string | number) => {
    const numericId = parseInt(String(id), 10);
    if (isNaN(numericId)) throw new Error(`Invalid anime ID: ${id}`);

    let result: { Media: any } | null = null;

    // 1. Try by MAL ID first
    try {
      result = await fetchGraphQL<{ Media: any }>(
        ANIME_DETAIL_QUERY,
        { idMal: numericId },
        { cacheKey: `detail_mal_${numericId}`, cacheDuration: 1000 * 60 * 15 }
      );
    } catch (err) {
      console.log(`[AniList] MAL ID ${numericId} lookup failed/not found, trying AniList ID fallback…`);
    }

    // 2. Fallback: try by AniList ID if MAL ID lookup failed or returned no Media
    if (!result?.Media) {
      try {
        result = await fetchGraphQL<{ Media: any }>(
          ANIME_DETAIL_BY_ID_QUERY,
          { id: numericId },
          { cacheKey: `detail_al_${numericId}`, cacheDuration: 1000 * 60 * 15 }
        );
      } catch (err) {
        console.warn(`[AniList] AniList ID ${numericId} fallback lookup failed as well:`, err);
      }
    }

    if (result?.Media) {
      return { data: normalizeMedia(result.Media) };
    }

    // 3. Ultimate Fallback: Fetch directly from Jikan REST API if AniList returns nothing or rate limits
    try {
      console.log(`[AniList] Falling back to Jikan REST API for anime ID ${numericId}…`);
      const res = await fetch(`https://api.jikan.moe/v4/anime/${numericId}`);
      if (res.ok) {
        const jikanJson = await res.json();
        if (jikanJson?.data) {
          return { data: jikanJson.data };
        }
      }
    } catch (jikanErr) {
      console.warn(`[AniList] Jikan REST fallback failed for anime ID ${numericId}:`, jikanErr);
    }

    throw new Error(`Anime not found: ${id}`);
  },

  /**
   * Search anime by query and/or genre filter.
   * Replaces: Jikan `/anime?q=...&genres=...&page=...`
   *
   * @param query   - search text (can be empty for genre-only browsing)
   * @param page    - pagination page number
   * @param genres  - comma-separated Jikan genre IDs, e.g. "1,4,10"
   */
  searchAnime: async (query: string, page = 1, genres?: string) => {
    const variables: Record<string, any> = {
      page,
      perPage: PER_PAGE,
      isAdult: false,
    };

    if (query && query.trim().length > 0) {
      variables.search = query.trim();
      variables.sort = ['SEARCH_MATCH'];
    } else {
      variables.sort = ['POPULARITY_DESC'];
    }

    if (genres) {
      const names = genreIdsToNames(genres);
      if (names.length > 0) {
        variables.genre_in = names;
        // When filtering by genre only (no search text), sort by score
        if (!variables.search) {
          variables.sort = ['SCORE_DESC'];
        }
      }
    }

    const cacheKey = `search_${query || ''}_${genres || ''}_${page}`;
    const data = await fetchGraphQL(ANIME_PAGE_QUERY, variables, { cacheKey });
    return normalizeMediaPage(data, page);
  },

  /**
   * Currently airing anime for this season.
   * Replaces: Jikan `/seasons/now?page={page}`
   */
  getSeasonNow: async (page = 1) => {
    const { season, year } = getCurrentSeason();
    const data = await fetchGraphQL(ANIME_PAGE_QUERY, {
      page,
      perPage: PER_PAGE,
      season,
      seasonYear: year,
      sort: ['POPULARITY_DESC'],
      isAdult: false,
    }, {
      cacheKey: `season_now_${page}`,
    });
    return normalizeMediaPage(data, page);
  },

  /**
   * Top currently-airing anime (sorted by trending).
   * Replaces: Jikan `/top/anime?filter=airing&page={page}`
   */
  getTopAiringAnime: async (page = 1) => {
    const data = await fetchGraphQL(ANIME_PAGE_QUERY, {
      page,
      perPage: PER_PAGE,
      status: 'RELEASING',
      sort: ['TRENDING_DESC'],
      isAdult: false,
    }, {
      cacheKey: `top_airing_${page}`,
    });
    return normalizeMediaPage(data, page);
  },

  /**
   * Most popular anime (sorted by popularity).
   * Replaces: Jikan `/top/anime?filter=bypopularity&page={page}`
   */
  getPopularAnime: async (page = 1) => {
    const data = await fetchGraphQL(ANIME_PAGE_QUERY, {
      page,
      perPage: PER_PAGE,
      sort: ['POPULARITY_DESC'],
      isAdult: false,
    }, {
      cacheKey: `popular_${page}`,
    });
    return normalizeMediaPage(data, page);
  },

  /**
   * Anime filtered by genre with optional minimum score.
   * Replaces: Jikan `/anime?genres=...&order_by=score&sort=desc&page=...`
   *
   * @param genres   - comma-separated Jikan genre IDs ("1,4,10")
   * @param page     - pagination page
   * @param minScore - minimum score on 0-10 scale (converted to 0-100 for AniList)
   */
  getAnimeByGenres: async (genres: string, page = 1, minScore?: number) => {
    const genreNames = genreIdsToNames(genres);
    if (genreNames.length === 0) {
      // Fallback when genre IDs can't be mapped
      return anilistApi.getPopularAnime(page);
    }

    const variables: Record<string, any> = {
      page,
      perPage: PER_PAGE,
      genre_in: genreNames,
      sort: ['SCORE_DESC'],
      isAdult: false,
    };

    if (minScore != null && minScore > 0) {
      // Jikan uses 0-10, AniList uses 0-100
      variables.averageScore_greater = Math.round(minScore * 10);
    }

    const cacheKey = `genre_${genres}_${page}_${minScore ?? ''}`;
    const data = await fetchGraphQL(ANIME_PAGE_QUERY, variables, { cacheKey });
    return normalizeMediaPage(data, page);
  },

  /**
   * Anime for a specific season.
   * Replaces: Jikan `/seasons/{year}/{season}?page={page}`
   *
   * @param year   - e.g. 2024
   * @param season - lowercase: "winter", "spring", "summer", "fall"
   */
  getSeasonAnime: async (year: number, season: string, page = 1) => {
    const data = await fetchGraphQL(ANIME_PAGE_QUERY, {
      page,
      perPage: PER_PAGE,
      season: season.toUpperCase(),
      seasonYear: year,
      sort: ['POPULARITY_DESC'],
      isAdult: false,
    }, {
      cacheKey: `season_${year}_${season}_${page}`,
    });
    return normalizeMediaPage(data, page);
  },

  /**
   * Upcoming anime (not yet released, sorted by popularity).
   * Replaces: Jikan `/seasons/upcoming?page={page}`
   */
  getUpcomingAnime: async (page = 1) => {
    const data = await fetchGraphQL(ANIME_PAGE_QUERY, {
      page,
      perPage: PER_PAGE,
      status: 'NOT_YET_RELEASED',
      sort: ['POPULARITY_DESC'],
      isAdult: false,
    }, {
      cacheKey: `upcoming_${page}`,
    });
    return normalizeMediaPage(data, page);
  },
};

// ---------------------------------------------------------------------------
// Additional utilities (not part of the old jikanApi interface)
// ---------------------------------------------------------------------------

/**
 * Fetch popular character image URLs for the profile avatar picker.
 * Replaces the direct Jikan `/characters?page=...` call in profile.tsx.
 *
 * @param page  - page number (each page has `limit` characters)
 * @param limit - number of characters per page
 * @returns array of character image URLs
 */
export async function fetchCharacterImages(
  page: number,
  limit: number = 20
): Promise<string[]> {
  const data = await fetchGraphQL<{ Page: { characters: any[] } }>(
    CHARACTER_PAGE_QUERY,
    { page, perPage: limit },
    { cacheKey: `characters_${page}_${limit}` }
  );

  return (data?.Page?.characters || [])
    .map((c: any) => c.image?.large || c.image?.medium)
    .filter(Boolean);
}
