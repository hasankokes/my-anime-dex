import { supabase } from './supabase';
import type { Anime } from './jikan';
import { fetchGraphQL } from '../services/anilist/client';
import { FORMAT_MAP } from '../services/anilist/normalizer';
import { LIST_METADATA_BY_ID_QUERY, LIST_METADATA_BY_MAL_QUERY } from '../services/anilist/queries';

/**
 * Anime metadata cached on user_anime_list rows (genres, main studios, year, format) so stats
 * and list filters work from Supabase alone. Written with every entry from the anime screen;
 * older rows are back-filled in batches of 50 (one AniList request per batch).
 */

export interface ListMetadata {
    genres: string[];
    studios: string[];
    season_year: number | null;
    format: string | null;
}

/** Metadata columns for a list upsert from the (Jikan-shaped) anime detail object. */
export const metadataFromAnime = (anime: Anime): ListMetadata => ({
    genres: (anime.genres ?? []).map(g => g.name),
    studios: (anime.studios ?? []).map(s => s.name),
    season_year: anime.year || null,
    format: anime.type && anime.type !== 'Unknown' ? anime.type : null,
});

const BATCH_SIZE = 50;
// Upper bound per run; huge lists finish over later runs
const MAX_ROWS_PER_RUN = 1000;

type MetaMedia = {
    id: number;
    idMal: number | null;
    genres: string[] | null;
    seasonYear: number | null;
    format: string | null;
    studios: { nodes: { name: string }[] } | null;
};

const toMetadata = (m: MetaMedia): ListMetadata => ({
    genres: m.genres ?? [],
    studios: (m.studios?.nodes ?? []).map(s => s.name),
    season_year: m.seasonYear ?? null,
    format: m.format ? FORMAT_MAP[m.format] ?? m.format : null,
});

// fetchGraphQL resolves to the GraphQL `data` object itself
const fetchBatch = async (query: string, ids: number[]) => {
    const res = await fetchGraphQL<{ Page: { media: MetaMedia[] } }>(query, { ids }, { retries: 3 });
    return res?.Page?.media ?? [];
};

const runs = new Map<string, Promise<number>>();

/**
 * Fills metadata for the user's rows that don't have it yet. Coalesces concurrent calls and
 * resolves to the number of rows updated. Rows AniList can't resolve get empty arrays so they
 * aren't retried on every run.
 */
export const backfillListMetadata = (userId: string): Promise<number> => {
    const running = runs.get(userId);
    if (running) return running;

    const run = (async () => {
        const { data: rows, error } = await supabase
            .from('user_anime_list')
            .select('*')
            .eq('user_id', userId)
            .is('genres', null)
            .limit(MAX_ROWS_PER_RUN);
        if (error) throw error;
        if (!rows?.length) return 0;

        let updated = 0;
        for (let i = 0; i < rows.length; i += BATCH_SIZE) {
            const batch = rows.slice(i, i + BATCH_SIZE);
            const ids = batch.map(r => Number(r.anime_id)).filter(Number.isFinite);

            // Stored ids are MAL ids when AniList knows one, otherwise AniList ids (see lib/jikan.ts)
            const found = new Map<number, ListMetadata>();
            for (const m of await fetchBatch(LIST_METADATA_BY_MAL_QUERY, ids)) {
                if (m.idMal) found.set(m.idMal, toMetadata(m));
            }
            const missing = ids.filter(id => !found.has(id));
            if (missing.length) {
                for (const m of await fetchBatch(LIST_METADATA_BY_ID_QUERY, missing)) {
                    if (!found.has(m.id)) found.set(m.id, toMetadata(m));
                }
            }

            // Nothing resolved at all usually means AniList had a problem: leave the batch for a later run
            if (found.size === 0) continue;

            const upserts = batch.map(row => ({
                ...row,
                ...(found.get(Number(row.anime_id)) ?? { genres: [], studios: [], season_year: null, format: null }),
            }));
            const { error: upsertError } = await supabase
                .from('user_anime_list')
                .upsert(upserts, { onConflict: 'id' });
            if (upsertError) throw upsertError;
            updated += upserts.length;
        }
        return updated;
    })().finally(() => runs.delete(userId));

    runs.set(userId, run);
    return run;
};
