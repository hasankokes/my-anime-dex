import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchGraphQL } from './anilist/client';

export interface AiringScheduleAnime {
    /** MAL id when AniList knows it, otherwise the AniList id (same convention as the rest of the app) */
    mal_id: number;
    images: {
        webp: { image_url: string; large_image_url: string };
        jpg: { image_url: string; large_image_url: string };
    };
    title: string;
    title_english: string;
    title_japanese: string;
    episodes: number | null;
    format: string | null;
    popularity: number;
    /** Unix seconds */
    airingAt: number;
    airing_episode: number;
}

const scheduleCache = new Map<string, { data: AiringScheduleAnime[]; timestamp: number }>();
// Days are kept in memory and on the device, so reopening the app doesn't refetch AniList
const PERSISTED_CACHE_DURATION = 1000 * 60 * 60 * 3; // 3 hours
const PERSIST_PREFIX = 'airing_schedule_v1_';
const persistKey = (cacheKey: string) => `${PERSIST_PREFIX}${cacheKey}`;

// Past days are never asked for again: drop them from the device once per app session
let pruned = false;
const prunePersistedSchedules = async () => {
    if (pruned) return;
    pruned = true;
    try {
        const yesterday = Math.floor(Date.now() / 1000) - 24 * 60 * 60;
        const keys = (await AsyncStorage.getAllKeys()).filter(k => k.startsWith(PERSIST_PREFIX));
        const stale = keys.filter(k => Number(k.slice(PERSIST_PREFIX.length).split('-')[1]) < yesterday);
        if (stale.length) await AsyncStorage.multiRemove(stale);
    } catch { /* not critical */ }
};

const AIRING_SCHEDULE_QUERY = `
query ($start: Int, $end: Int, $page: Int) {
  Page(page: $page, perPage: 50) {
    pageInfo {
      hasNextPage
    }
    airingSchedules(airingAt_greater: $start, airingAt_lesser: $end, sort: TIME) {
      airingAt
      episode
      media {
        id
        idMal
        isAdult
        format
        popularity
        title {
          romaji
          english
          native
          userPreferred
        }
        coverImage {
          extraLarge
          large
          medium
        }
        episodes
      }
    }
  }
}
`;

/**
 * Episodes airing between two unix timestamps (inclusive), adult titles removed.
 * `force` skips the 30-minute cache (pull-to-refresh).
 */
export const getAiringSchedule = async (start: number, end: number, force = false): Promise<AiringScheduleAnime[]> => {
    const cacheKey = `${start}-${end}`;
    let cached = scheduleCache.get(cacheKey);
    if (!cached) {
        try {
            const raw = await AsyncStorage.getItem(persistKey(cacheKey));
            if (raw) {
                cached = JSON.parse(raw);
                if (cached) scheduleCache.set(cacheKey, cached);
            }
        } catch { /* ignore */ }
    }
    if (!force && cached && Date.now() - cached.timestamp < PERSISTED_CACHE_DURATION) {
        return cached.data;
    }

    let allSchedules: any[] = [];
    let currentPage = 1;
    let hasNextPage = true;

    try {
        while (hasNextPage) {
            // airingAt_greater / airingAt_lesser are exclusive, so widen by 1s to include the day's boundaries
            const data = await fetchGraphQL(AIRING_SCHEDULE_QUERY, {
                start: start - 1,
                end: end + 1,
                page: currentPage,
            });

            allSchedules = [...allSchedules, ...(data?.Page?.airingSchedules || [])];
            hasNextPage = data?.Page?.pageInfo?.hasNextPage || false;
            currentPage++;
        }

        const mappedData: AiringScheduleAnime[] = allSchedules
            .filter((item: any) => item.media && !item.media.isAdult)
            .map((item: any) => {
                const media = item.media;
                const largeImg = media.coverImage?.extraLarge || media.coverImage?.large || media.coverImage?.medium || '';
                const smallImg = media.coverImage?.large || media.coverImage?.medium || '';

                return {
                    mal_id: media.idMal || media.id,
                    images: {
                        webp: { image_url: smallImg, large_image_url: largeImg },
                        jpg: { image_url: smallImg, large_image_url: largeImg },
                    },
                    title: media.title?.romaji || media.title?.userPreferred || media.title?.english || '',
                    title_english: media.title?.english || media.title?.userPreferred || media.title?.romaji || '',
                    title_japanese: media.title?.native || '',
                    episodes: media.episodes || null,
                    format: media.format || null,
                    popularity: media.popularity || 0,
                    airingAt: item.airingAt,
                    airing_episode: item.episode,
                };
            });

        const entry = { data: mappedData, timestamp: Date.now() };
        scheduleCache.set(cacheKey, entry);
        AsyncStorage.setItem(persistKey(cacheKey), JSON.stringify(entry)).catch(() => { });
        prunePersistedSchedules();
        return mappedData;
    } catch (error) {
        if (cached) {
            return cached.data; // Fallback to expired cache if fetch fails
        }
        throw error;
    }
};

const NEXT_EPISODES_QUERY = `
query ($ids: [Int], $byMal: Boolean!) {
  byMal: Page(perPage: 50) @include(if: $byMal) {
    media(idMal_in: $ids, type: ANIME, status_in: [RELEASING, NOT_YET_RELEASED]) { ...NextEp }
  }
  byId: Page(perPage: 50) @skip(if: $byMal) {
    media(id_in: $ids, type: ANIME, status_in: [RELEASING, NOT_YET_RELEASED]) { ...NextEp }
  }
}
fragment NextEp on Media {
  id
  idMal
  episodes
  title { romaji english userPreferred }
  coverImage { large }
  airingSchedule(notYetAired: true, perPage: 3) { nodes { airingAt episode } }
}
`;

export interface NextEpisode {
    /** The id the app stores for this anime (MAL id first, AniList id otherwise) */
    animeId: number;
    title: string;
    airingAt: number;
    episode: number;
    /** Total episode count when known */
    totalEpisodes: number | null;
    image: string | null;
}

const UPCOMING_CACHE_MS = 15 * 60 * 1000;
const upcomingCache = new Map<string, { at: number; data: NextEpisode[] }>();

/**
 * Up to `perShow` upcoming episodes (max 3) for each of the given app anime ids
 * (MAL id first, then AniList id). Only airing or upcoming shows with a schedule are returned.
 * One AniList request per 50 ids (plus one per 50 unmatched ids); cached 15 minutes.
 */
export const getUpcomingEpisodes = async (animeIds: number[], perShow = 1): Promise<NextEpisode[]> => {
    const ids = [...new Set(animeIds)].sort((a, b) => a - b);
    const cacheKey = `${perShow}:${ids.join(',')}`;
    const hit = upcomingCache.get(cacheKey);
    if (hit && Date.now() - hit.at < UPCOMING_CACHE_MS) return hit.data;

    const results: NextEpisode[] = [];
    const toEpisodes = (media: any, animeId: number): NextEpisode[] =>
        (media?.airingSchedule?.nodes || []).slice(0, perShow).map((node: any) => ({
            animeId,
            title: media.title?.english || media.title?.userPreferred || media.title?.romaji || '',
            airingAt: node.airingAt,
            episode: node.episode,
            totalEpisodes: media.episodes ?? null,
            image: media.coverImage?.large ?? null,
        }));

    const chunks = (list: number[]) => {
        const out: number[][] = [];
        for (let i = 0; i < list.length; i += 50) out.push(list.slice(i, i + 50));
        return out;
    };

    // Sequential on purpose: fetchGraphQL throttles, but we don't want to queue a burst either
    const matchedByMal = new Set<number>();
    for (const chunk of chunks(ids)) {
        const data = await fetchGraphQL(NEXT_EPISODES_QUERY, { ids: chunk, byMal: true });
        for (const media of data?.byMal?.media || []) {
            if (!media.idMal) continue;
            matchedByMal.add(media.idMal);
            results.push(...toEpisodes(media, media.idMal));
        }
    }

    // Ids with no MAL match may be AniList ids (stored when AniList had no idMal).
    // Only accept AniList entries that themselves lack an idMal, otherwise the id belongs to another show.
    const leftovers = ids.filter(id => !matchedByMal.has(id));
    for (const chunk of chunks(leftovers)) {
        const data = await fetchGraphQL(NEXT_EPISODES_QUERY, { ids: chunk, byMal: false });
        for (const media of data?.byId?.media || []) {
            if (media.idMal) continue;
            results.push(...toEpisodes(media, media.id));
        }
    }

    upcomingCache.set(cacheKey, { at: Date.now(), data: results });
    return results;
};

/**
 * Next airing episode for each of the given app anime ids (MAL id first, then AniList id).
 * Only airing or upcoming shows that have a scheduled next episode are returned.
 */
export const getNextEpisodes = (animeIds: number[]): Promise<NextEpisode[]> => getUpcomingEpisodes(animeIds, 1);
