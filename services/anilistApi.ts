const BASE_URL = 'https://graphql.anilist.co';

export interface AiringScheduleAnime {
    mal_id: number;
    url: string;
    images: {
        webp: {
            image_url: string;
            large_image_url: string;
        };
        jpg: {
            image_url: string;
            large_image_url: string;
        };
    };
    title: string;
    title_english: string;
    title_japanese: string;
    episodes: number | null;
    status: string;
    airing: boolean;
    aired: {
        from: string;
        to: string | null;
    };
    broadcast: {
        day: string;
        time: string;
        timezone: string;
    };
    airingAt: number;
    airing_episode: number;
}

const scheduleCache = new Map<string, { data: AiringScheduleAnime[]; timestamp: number }>();
const CACHE_DURATION = 1000 * 60 * 30; // 30 minutes

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const AIRING_SCHEDULE_QUERY = `
query ($start: Int, $end: Int, $page: Int) {
  Page(page: $page, perPage: 50) {
    pageInfo {
      hasNextPage
    }
    airingSchedules(airingAt_greater: $start, airingAt_lesser: $end, sort: TIME) {
      id
      airingAt
      episode
      media {
        id
        idMal
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
        status
        startDate {
          year
          month
          day
        }
      }
    }
  }
}
`;

import { fetchGraphQL } from './anilist/client';

export const getAiringSchedule = async (start: number, end: number, retries = 3): Promise<AiringScheduleAnime[]> => {
    const cacheKey = `${start}-${end}`;
    const cached = scheduleCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        return cached.data;
    }

    let allSchedules: any[] = [];
    let currentPage = 1;
    let hasNextPage = true;

    try {
        while (hasNextPage) {
            const data = await fetchGraphQL(AIRING_SCHEDULE_QUERY, {
                start,
                end,
                page: currentPage,
            });

            const schedules = data?.Page?.airingSchedules || [];
            allSchedules = [...allSchedules, ...schedules];
            hasNextPage = data?.Page?.pageInfo?.hasNextPage || false;

            if (hasNextPage) {
                currentPage++;
            }
        }

        // Map AniList structure to MAL/Jikan-like format
        const mappedData: AiringScheduleAnime[] = allSchedules
            .filter((item: any) => item.media !== null)
            .map((item: any) => {
                const media = item.media;
                
                // Convert airingAt to JST time and day string
                const date = new Date(item.airingAt * 1000);
                const jstTime = date.getTime() + (9 * 60 * 60 * 1000);
                const jstDate = new Date(jstTime);
                
                const jstHours = jstDate.getUTCHours();
                const jstMinutes = jstDate.getUTCMinutes();
                const jstDayNum = jstDate.getUTCDay();
                
                const daysPlural = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'];
                const broadcastDay = daysPlural[jstDayNum];
                const broadcastTime = `${String(jstHours).padStart(2, '0')}:${String(jstMinutes).padStart(2, '0')}`;

                let startDateStr = '';
                if (media.startDate && media.startDate.year) {
                    const year = media.startDate.year;
                    const month = String(media.startDate.month || 1).padStart(2, '0');
                    const day = String(media.startDate.day || 1).padStart(2, '0');
                    startDateStr = `${year}-${month}-${day}T00:00:00+00:00`;
                }

                const largeImg = media.coverImage?.extraLarge || media.coverImage?.large || media.coverImage?.medium || '';
                const smallImg = media.coverImage?.large || media.coverImage?.medium || '';

                return {
                    mal_id: media.idMal || media.id, // Fallback to AniList ID if MAL ID is missing
                    url: `https://myanimelist.net/anime/${media.idMal || ''}`,
                    images: {
                        webp: {
                            image_url: smallImg,
                            large_image_url: largeImg,
                        },
                        jpg: {
                            image_url: smallImg,
                            large_image_url: largeImg,
                        }
                    },
                    title: media.title?.romaji || media.title?.userPreferred || media.title?.english || '',
                    title_english: media.title?.english || media.title?.userPreferred || media.title?.romaji || '',
                    title_japanese: media.title?.native || '',
                    episodes: media.episodes || null,
                    status: media.status === 'RELEASING' ? 'Currently Airing' : media.status,
                    airing: media.status === 'RELEASING',
                    aired: {
                        from: startDateStr,
                        to: null
                    },
                    broadcast: {
                        day: broadcastDay,
                        time: broadcastTime,
                        timezone: 'Asia/Tokyo'
                    },
                    airingAt: item.airingAt,
                    airing_episode: item.episode
                };
            });

        // Save to cache
        scheduleCache.set(cacheKey, {
            data: mappedData,
            timestamp: Date.now()
        });

        return mappedData;
    } catch (error) {
        if (cached) {
            return cached.data; // Fallback to expired cache if fetch fails
        }
        throw error;
    }
};
