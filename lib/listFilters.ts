import type { AnimeListItem } from '../types';

/**
 * Premium combined list filters. Every set field narrows the list (AND); within the genre
 * include list any match counts, the exclude list drops any match, tags match any.
 */
export interface AdvancedFilters {
    yearMin: number | null;
    yearMax: number | null;
    /** Minimum community score, 0-10 */
    minScore: number | null;
    episodesMin: number | null;
    episodesMax: number | null;
    includeGenres: string[];
    excludeGenres: string[];
    tags: string[];
}

export const EMPTY_FILTERS: AdvancedFilters = {
    yearMin: null,
    yearMax: null,
    minScore: null,
    episodesMin: null,
    episodesMax: null,
    includeGenres: [],
    excludeGenres: [],
    tags: [],
};

/** Number of active filter groups (for the badge on the filter button). */
export const countActiveFilters = (f: AdvancedFilters): number =>
    [
        f.yearMin != null || f.yearMax != null,
        f.minScore != null,
        f.episodesMin != null || f.episodesMax != null,
        f.includeGenres.length > 0,
        f.excludeGenres.length > 0,
        f.tags.length > 0,
    ].filter(Boolean).length;

const inRange = (value: number | null | undefined, min: number | null, max: number | null) => {
    if (min == null && max == null) return true;
    if (value == null || value <= 0) return false;
    return (min == null || value >= min) && (max == null || value <= max);
};

export const applyAdvancedFilters = <T extends AnimeListItem>(items: T[], f: AdvancedFilters): T[] => {
    if (!countActiveFilters(f)) return items;
    return items.filter(item => {
        const genres = item.genres ?? [];
        if (!inRange(item.season_year, f.yearMin, f.yearMax)) return false;
        if (f.minScore != null && (item.score ?? 0) < f.minScore) return false;
        if (!inRange(item.total_episodes, f.episodesMin, f.episodesMax)) return false;
        if (f.includeGenres.length && !f.includeGenres.some(g => genres.includes(g))) return false;
        if (f.excludeGenres.some(g => genres.includes(g))) return false;
        if (f.tags.length && !f.tags.some(t => (item.tags ?? []).includes(t))) return false;
        return true;
    });
};

/** Distinct values across the list, most common first (genre / tag pickers). */
export const distinctValues = (lists: (string[] | null | undefined)[]): string[] => {
    const counts = new Map<string, number>();
    for (const list of lists) for (const v of list ?? []) counts.set(v, (counts.get(v) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([v]) => v);
};

export const MAX_TAGS = 20;
export const MAX_TAG_LENGTH = 30;
export const MAX_NOTE_LENGTH = 2000;

/** Trims, collapses spaces and caps length; empty string means "not a valid tag". */
export const normalizeTag = (raw: string) => raw.trim().replace(/\s+/g, ' ').slice(0, MAX_TAG_LENGTH);
