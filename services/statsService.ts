import { supabase } from '../lib/supabase';

/**
 * "My Stats": pure computation over a user's list rows + reviews.
 * Works for any user (user_anime_list and reviews are publicly readable), so the same code
 * feeds the stats screen and the profile stats card on other people's profiles.
 *
 * - The user's own rating is reviews.rating (1-5).
 * - user_anime_list.score is the AniList community score (0-10); compared on the same 1-5 scale.
 * - Genre/studio breakdowns count anime the user has actually watched (any status but plan to watch).
 */

export interface StatsRow {
    anime_id: string;
    status: string | null;
    is_favorite: boolean | null;
    score: number | null;
    genres: string[] | null;
    studios: string[] | null;
}

export interface Share {
    name: string;
    count: number;
    /** 0..1 of the watched anime that have metadata */
    share: number;
}

export interface FavoriteStudio {
    name: string;
    count: number;
    /** Mean of the user's ratings for this studio's anime, null if none rated */
    avgRating: number | null;
}

export interface UserStats {
    completed: number;
    watching: number;
    planToWatch: number;
    paused: number;
    dropped: number;
    favorites: number;
    /** Entries with any status */
    total: number;
    genres: Share[];
    studios: Share[];
    favoriteStudio: FavoriteStudio | null;
    rating: {
        count: number;
        /** Mean of the user's 1-5 ratings */
        average: number | null;
        /** Mean community score of the same anime, on the 1-5 scale */
        communityAverage: number | null;
        /** Number of rated anime with a community score (basis of the comparison) */
        comparedCount: number;
    };
    /** Watched entries still waiting for their genre/studio metadata */
    missingMetadata: number;
}

export type StatsCardItem = 'completed' | 'watching' | 'top_genre' | 'favorite_studio' | 'avg_rating';

export const STATS_CARD_ITEMS: StatsCardItem[] = ['completed', 'watching', 'top_genre', 'favorite_studio', 'avg_rating'];

export interface StatsCardSettings {
    enabled: boolean;
    items: StatsCardItem[];
}

export const DEFAULT_STATS_CARD: StatsCardSettings = { enabled: false, items: [] };

export const parseStatsCard = (raw: unknown): StatsCardSettings => {
    const value = raw as Partial<StatsCardSettings> | null;
    return {
        enabled: !!value?.enabled,
        items: Array.isArray(value?.items)
            ? value!.items.filter((i): i is StatsCardItem => STATS_CARD_ITEMS.includes(i as StatsCardItem))
            : [],
    };
};

const TOP_N = 8;
const WATCHED = new Set(['completed', 'watching', 'paused', 'dropped']);

const mean = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : null);

const tally = (lists: string[][]): Map<string, number> => {
    const counts = new Map<string, number>();
    for (const list of lists) {
        for (const name of new Set(list)) counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    return counts;
};

const topShares = (counts: Map<string, number>, base: number): Share[] =>
    [...counts.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, TOP_N)
        .map(([name, count]) => ({ name, count, share: base ? count / base : 0 }));

export const computeStats = (rows: StatsRow[], ratings: Map<string, number>): UserStats => {
    const byStatus = (s: string) => rows.filter(r => r.status === s).length;
    const watched = rows.filter(r => r.status && WATCHED.has(r.status));
    const withMeta = watched.filter(r => r.genres != null);

    const genreCounts = tally(withMeta.map(r => r.genres ?? []));
    const studioCounts = tally(withMeta.map(r => r.studios ?? []));

    // Favourite studio: most watched, ties broken by how the user rated that studio's anime
    let favoriteStudio: FavoriteStudio | null = null;
    for (const [name, count] of studioCounts) {
        const rated = withMeta
            .filter(r => r.studios?.includes(name) && ratings.has(r.anime_id))
            .map(r => ratings.get(r.anime_id)!);
        const avgRating = mean(rated);
        const better = !favoriteStudio
            || count > favoriteStudio.count
            || (count === favoriteStudio.count && (avgRating ?? 0) > (favoriteStudio.avgRating ?? 0));
        if (better) favoriteStudio = { name, count, avgRating };
    }

    const userRatings = [...ratings.values()];
    const compared = rows.filter(r => ratings.has(r.anime_id) && r.score != null && r.score > 0);

    return {
        completed: byStatus('completed'),
        watching: byStatus('watching'),
        planToWatch: byStatus('plan_to_watch'),
        paused: byStatus('paused'),
        dropped: byStatus('dropped'),
        favorites: rows.filter(r => r.is_favorite).length,
        total: rows.filter(r => r.status).length,
        genres: topShares(genreCounts, withMeta.length),
        studios: topShares(studioCounts, withMeta.length),
        favoriteStudio,
        rating: {
            count: userRatings.length,
            average: mean(userRatings),
            // community score is 0-10, user ratings 1-5
            communityAverage: mean(compared.map(r => r.score! / 2)),
            comparedCount: compared.length,
        },
        missingMetadata: watched.length - withMeta.length,
    };
};

/** Loads a user's list + ratings and computes their stats. */
export const loadUserStats = async (userId: string): Promise<UserStats> => {
    const [list, reviews] = await Promise.all([
        supabase
            .from('user_anime_list')
            .select('anime_id, status, is_favorite, score, genres, studios')
            .eq('user_id', userId),
        supabase.from('reviews').select('anime_id, rating').eq('user_id', userId),
    ]);
    if (list.error) throw list.error;
    if (reviews.error) throw reviews.error;

    const ratings = new Map<string, number>();
    for (const r of reviews.data ?? []) {
        if (r.rating != null) ratings.set(String(r.anime_id), r.rating);
    }
    return computeStats((list.data ?? []) as StatsRow[], ratings);
};
