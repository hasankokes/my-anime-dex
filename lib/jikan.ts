/**
 * Anime data types and API accessor.
 *
 * ⚠️  MIGRATION NOTE (August 2026)
 * Previously this module talked directly to the Jikan REST API.
 * It now delegates to the AniList GraphQL service under the hood.
 * All type interfaces are intentionally preserved so that every
 * component that imports { Anime, jikanApi } continues to work
 * without any changes.
 */

import { anilistApi } from '../services/anilist/api';

// ---------------------------------------------------------------------------
// Type interfaces (unchanged — backward compatibility)
// ---------------------------------------------------------------------------

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
    trailer: {
        youtube_id: string;
        url: string;
        embed_url: string;
        images: {
            image_url: string;
            small_image_url: string;
            medium_image_url: string;
            large_image_url: string;
            maximum_image_url: string;
        };
    };
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

// ---------------------------------------------------------------------------
// API — now powered by AniList GraphQL
// ---------------------------------------------------------------------------

export const jikanApi = anilistApi;
