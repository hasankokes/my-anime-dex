
interface JikanImages {
    jpg: {
        image_url: string;
        small_image_url: string;
        large_image_url: string;
    };
    webp: {
        image_url: string;
        small_image_url: string;
        large_image_url: string;
    };
}

interface JikanTitle {
    type: string;
    title: string;
}

interface JikanAnime {
    mal_id: number;
    url: string;
    images: JikanImages;
    trailer: {
        youtube_id: string;
        url: string;
        embed_url: string;
    };
    approved: boolean;
    titles: JikanTitle[];
    title: string;
    title_english: string;
    title_japanese: string;
    title_synonyms: string[];
    type: string;
    source: string;
    episodes: number | null;
    status: string;
    airing: boolean;
    aired: {
        from: string;
        to: string | null;
        prop: {
            from: { day: number; month: number; year: number };
            to: { day: number; month: number; year: number };
        };
        string: string;
    };
    duration: string;
    rating: string;
    score: number | null;
    scored_by: number | null;
    rank: number | null;
    popularity: number;
    members: number;
    favorites: number;
    synopsis: string;
    background: string;
    season: string | null;
    year: number | null;
    broadcast: {
        day: string;
        time: string;
        timezone: string;
        string: string;
    };
    producers: { mal_id: number; type: string; name: string; url: string }[];
    licensors: { mal_id: number; type: string; name: string; url: string }[];
    studios: { mal_id: number; type: string; name: string; url: string }[];
    genres: { mal_id: number; type: string; name: string; url: string }[];
    explicit_genres: { mal_id: number; type: string; name: string; url: string }[];
    themes: { mal_id: number; type: string; name: string; url: string }[];
    demographics: { mal_id: number; type: string; name: string; url: string }[];
}

interface JikanScheduleResponse {
    data: JikanAnime[];
    pagination: {
        last_visible_page: number;
        has_next_page: boolean;
    };
}

const BASE_URL = 'https://api.jikan.moe/v4';

// Simple in-memory cache to prevent hitting rate limits
// Map<day, { data: JikanAnime[], timestamp: number }>
const scheduleCache = new Map<string, { data: JikanAnime[]; timestamp: number }>();
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

export const getAnimeSchedule = async (day: string): Promise<JikanAnime[]> => {
    const normalizedDay = day.toLowerCase();

    // Check cache first
    const cached = scheduleCache.get(normalizedDay);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        return cached.data;
    }

    try {
        const response = await fetch(`${BASE_URL}/schedules?filter=${normalizedDay}`);

        if (!response.ok) {
            if (response.status === 429) {
                // Rate limited, wait a bit or throw specific error
                throw new Error('Rate limit exceeded. Please try again later.');
            }
            throw new Error(`Jikan API Error: ${response.statusText}`);
        }

        const json: JikanScheduleResponse = await response.json();

        // Update cache
        scheduleCache.set(normalizedDay, {
            data: json.data,
            timestamp: Date.now()
        });

        return json.data;
    } catch (error) {
        console.error('Error fetching anime schedule:', error);
        // Return cached data if available even if expired, as fallback
        if (cached) {
            return cached.data;
        }
        throw error;
    }
};
