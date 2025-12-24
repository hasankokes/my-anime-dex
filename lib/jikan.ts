
import { Alert } from 'react-native';

const BASE_URL = 'https://api.jikan.moe/v4';

export interface Anime {
    mal_id: number;
    url: string;
    images: {
        jpg: {
            image_url: string;
            large_image_url: string;
        };
        webp: {
            image_url: string;
            large_image_url: string;
        }
    };
    title: string;
    title_english: string;
    title_japanese: string;
    type: string;
    source: string;
    episodes: number;
    status: string;
    airing: boolean;
    duration: string;
    rating: string;
    score: number;
    scored_by: number;
    rank: number;
    popularity: number;
    synopsis: string;
    season: string;
    year: number;
    genres: { name: string }[];
}

export interface JikanResponse<T> {
    data: T;
    pagination: {
        last_visible_page: number;
        has_next_page: boolean;
        current_page: number;
        items: {
            count: number;
            total: number;
            per_page: number;
        };
    };
}

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Simple rate limiter handling: Jikan is generous but has limits
const fetchWithRetry = async (url: string, retries = 3): Promise<any> => {
    try {
        const response = await fetch(url);

        if (response.status === 429) { // Too Many Requests
            if (retries > 0) {
                await wait(1000); // Wait 1s and retry
                return fetchWithRetry(url, retries - 1);
            } else {
                throw new Error('Rate limit exceeded. Please try again later.');
            }
        }

        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        throw error;
    }
};

export const jikanApi = {
    getTopAnime: async (page = 1): Promise<JikanResponse<Anime[]>> => {
        return fetchWithRetry(`${BASE_URL}/top/anime?page=${page}`);
    },

    getAnimeDetails: async (id: string | number): Promise<{ data: Anime }> => {
        return fetchWithRetry(`${BASE_URL}/anime/${id}`);
    },

    searchAnime: async (query: string, page = 1, genres?: string): Promise<JikanResponse<Anime[]>> => {
        let url = `${BASE_URL}/anime?page=${page}`;
        if (query) url += `&q=${encodeURIComponent(query)}`;
        if (genres) url += `&genres=${genres}`;
        return fetchWithRetry(url);
    },

    getSeasonNow: async (page = 1): Promise<JikanResponse<Anime[]>> => {
        return fetchWithRetry(`${BASE_URL}/seasons/now?page=${page}`);
    },

    getTopAiringAnime: async (page = 1): Promise<JikanResponse<Anime[]>> => {
        return fetchWithRetry(`${BASE_URL}/top/anime?filter=airing&page=${page}`);
    }
};
