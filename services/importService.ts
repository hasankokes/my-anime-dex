/**
 * Free list import (Module 6): MyAnimeList XML export or an AniList username.
 *
 * - Statuses, episode progress and start/finish dates are kept.
 * - Scores (1-10) become the user's rating on the app's 1-5 scale (ceil(score / 2)), saved as a
 *   review without a comment (hidden from the public review list).
 * - Existing list entries and ratings are kept unless `overwrite` is set.
 * - MAL files carry no artwork or metadata: they are resolved against AniList in batches of 50.
 */
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { inflate } from 'pako';
import { supabase } from '../lib/supabase';
import { fetchGraphQL } from './anilist/client';
import { FORMAT_MAP } from './anilist/normalizer';
import { IMPORT_ANILIST_USER_QUERY, IMPORT_MEDIA_BY_MAL_QUERY } from './anilist/queries';
import { recommendationService } from './recommendationService';

export type ListStatus = 'watching' | 'completed' | 'plan_to_watch' | 'dropped' | 'paused';

export interface ImportEntry {
    /** The app-wide anime id (MAL id when known, else AniList id) */
    key: string;
    title: string;
    image: string | null;
    status: ListStatus;
    progress: number;
    totalEpisodes: number | null;
    /** The user's score, 1-10 (0 / null = not scored) */
    score10: number | null;
    startedAt: string | null;
    finishedAt: string | null;
    communityScore: number | null;
    genres: string[] | null;
    studios: string[] | null;
    seasonYear: number | null;
    format: string | null;
}

export interface ImportResult {
    added: number;
    updated: number;
    skipped: number;
    ratings: number;
}

export type ImportProgress = (done: number, total: number) => void;

const UPSERT_BATCH = 200;

// --- MAL XML ----------------------------------------------------------------

const MAL_STATUS: Record<string, ListStatus> = {
    'watching': 'watching',
    'completed': 'completed',
    'on-hold': 'paused',
    'dropped': 'dropped',
    'plan to watch': 'plan_to_watch',
    // Numeric codes used by some exporters
    '1': 'watching', '2': 'completed', '3': 'paused', '4': 'dropped', '6': 'plan_to_watch',
};

const decodeEntities = (s: string) =>
    s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
        .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n))).replace(/&amp;/g, '&');

const tagValue = (block: string, tag: string): string | null => {
    const m = block.match(new RegExp(`<${tag}>\\s*(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([\\s\\S]*?))\\s*</${tag}>`));
    if (!m) return null;
    return (m[1] ?? decodeEntities(m[2] ?? '')).trim();
};

/** "2021-04-10" -> same, "0000-00-00" / partial unknowns -> null */
const malDate = (value: string | null): string | null => {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000')) return null;
    const [y, m, d] = value.split('-');
    return `${y}-${m === '00' ? '01' : m}-${d === '00' ? '01' : d}`;
};

/** Parses a MyAnimeList anime list export (Profile > Export, then unzip or pick the .gz). */
export const parseMalXml = (xml: string): Omit<ImportEntry, 'image' | 'communityScore' | 'genres' | 'studios' | 'seasonYear' | 'format'>[] => {
    const entries: Omit<ImportEntry, 'image' | 'communityScore' | 'genres' | 'studios' | 'seasonYear' | 'format'>[] = [];
    const blocks = xml.match(/<anime>[\s\S]*?<\/anime>/g) ?? [];
    for (const block of blocks) {
        const id = Number(tagValue(block, 'series_animedb_id'));
        const status = MAL_STATUS[(tagValue(block, 'my_status') ?? '').toLowerCase()];
        if (!id || !status) continue;
        const total = Number(tagValue(block, 'series_episodes')) || null;
        const score = Number(tagValue(block, 'my_score')) || null;
        entries.push({
            key: String(id),
            title: tagValue(block, 'series_title') ?? '',
            status,
            progress: Number(tagValue(block, 'my_watched_episodes')) || 0,
            totalEpisodes: total,
            score10: score,
            startedAt: malDate(tagValue(block, 'my_start_date')),
            finishedAt: malDate(tagValue(block, 'my_finish_date')),
        });
    }
    return entries;
};

/** UTF-8 bytes -> string without relying on TextDecoder (not available on every RN runtime) */
const utf8Decode = (bytes: Uint8Array): string => {
    let out = '';
    const chunk: number[] = [];
    const flush = () => {
        out += String.fromCharCode(...chunk);
        chunk.length = 0;
    };
    for (let i = 0; i < bytes.length;) {
        const b = bytes[i++];
        let cp: number;
        if (b < 0x80) cp = b;
        else if (b < 0xe0) cp = ((b & 0x1f) << 6) | (bytes[i++] & 0x3f);
        else if (b < 0xf0) cp = ((b & 0x0f) << 12) | ((bytes[i++] & 0x3f) << 6) | (bytes[i++] & 0x3f);
        else {
            cp = ((b & 0x07) << 18) | ((bytes[i++] & 0x3f) << 12) | ((bytes[i++] & 0x3f) << 6) | (bytes[i++] & 0x3f);
            cp -= 0x10000;
            chunk.push(0xd800 + (cp >> 10), 0xdc00 + (cp & 0x3ff));
            if (chunk.length > 8000) flush();
            continue;
        }
        chunk.push(cp);
        if (chunk.length > 8000) flush();
    }
    flush();
    return out;
};

const base64ToBytes = (b64: string): Uint8Array => {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
};

/** Reads a picked MAL export (.xml or .xml.gz) as text. `webFile` is the File on web. */
export const readMalExport = async (uri: string, name: string, webFile?: File): Promise<string> => {
    const gz = /\.gz$/i.test(name);
    let bytes: Uint8Array;
    if (Platform.OS === 'web' && webFile) {
        bytes = new Uint8Array(await webFile.arrayBuffer());
    } else {
        bytes = base64ToBytes(await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 }));
    }
    // gzip magic bytes: also handles a .gz renamed to .xml
    if (gz || (bytes[0] === 0x1f && bytes[1] === 0x8b)) bytes = inflate(bytes);
    return utf8Decode(bytes);
};

// --- AniList ----------------------------------------------------------------

const ANILIST_STATUS: Record<string, ListStatus> = {
    CURRENT: 'watching',
    REPEATING: 'watching',
    COMPLETED: 'completed',
    PLANNING: 'plan_to_watch',
    DROPPED: 'dropped',
    PAUSED: 'paused',
};

const fuzzyDate = (d: { year?: number | null; month?: number | null; day?: number | null } | null): string | null =>
    d?.year ? `${d.year}-${String(d.month || 1).padStart(2, '0')}-${String(d.day || 1).padStart(2, '0')}` : null;

const mediaFields = (m: any) => ({
    title: m.title?.english || m.title?.userPreferred || m.title?.romaji || '',
    image: m.coverImage?.extraLarge || m.coverImage?.large || null,
    totalEpisodes: m.episodes ?? null,
    communityScore: m.averageScore != null ? Math.round(m.averageScore) / 10 : null,
    genres: m.genres ?? [],
    studios: (m.studios?.nodes ?? []).map((n: any) => n.name),
    seasonYear: m.seasonYear ?? null,
    format: m.format ? FORMAT_MAP[m.format] ?? m.format : null,
});

export class ImportError extends Error {
    constructor(public code: 'not_found' | 'private' | 'empty' | 'invalid_file' | 'network') {
        super(code);
    }
}

/** A public AniList user's anime list. */
export const fetchAniListList = async (userName: string): Promise<ImportEntry[]> => {
    let data: any;
    try {
        data = await fetchGraphQL<any>(IMPORT_ANILIST_USER_QUERY, { userName: userName.trim() }, { retries: 2 });
    } catch (e: any) {
        const msg = String(e?.message ?? '').toLowerCase();
        if (msg.includes('private')) throw new ImportError('private');
        if (msg.includes('not found') || msg.includes('404')) throw new ImportError('not_found');
        throw new ImportError('network');
    }
    const lists = data?.MediaListCollection?.lists;
    if (!lists) throw new ImportError('not_found');

    const seen = new Set<string>();
    const entries: ImportEntry[] = [];
    for (const list of lists) {
        for (const e of list.entries ?? []) {
            const m = e.media;
            const status = ANILIST_STATUS[e.status];
            if (!m || !status) continue;
            const key = String(m.idMal || m.id);
            if (seen.has(key)) continue; // custom lists repeat entries
            seen.add(key);
            entries.push({
                key,
                status,
                progress: e.progress ?? 0,
                score10: e.score || null,
                startedAt: fuzzyDate(e.startedAt),
                finishedAt: fuzzyDate(e.completedAt),
                ...mediaFields(m),
            });
        }
    }
    if (!entries.length) throw new ImportError('empty');
    return entries;
};

/** Adds artwork + metadata to MAL entries from AniList (50 per request). */
export const resolveMalEntries = async (
    entries: ReturnType<typeof parseMalXml>,
    onProgress?: ImportProgress,
): Promise<ImportEntry[]> => {
    const resolved = new Map<number, any>();
    for (let i = 0; i < entries.length; i += 50) {
        const ids = entries.slice(i, i + 50).map(e => Number(e.key));
        try {
            const data = await fetchGraphQL<any>(IMPORT_MEDIA_BY_MAL_QUERY, { ids }, { retries: 3 });
            for (const m of data?.Page?.media ?? []) if (m.idMal) resolved.set(m.idMal, m);
        } catch (e) {
            // Keep going: unresolved entries are imported with their MAL title only
            console.warn('[Import] AniList lookup failed for a batch:', e);
        }
        onProgress?.(Math.min(i + 50, entries.length), entries.length);
    }
    return entries.map(e => {
        const m = resolved.get(Number(e.key));
        const fields = m ? mediaFields(m) : null;
        return {
            ...e,
            title: fields?.title || e.title,
            image: fields?.image ?? null,
            totalEpisodes: e.totalEpisodes ?? fields?.totalEpisodes ?? null,
            communityScore: fields?.communityScore ?? null,
            // null = metadata still to be fetched (lib/animeMetadata backfill)
            genres: fields?.genres ?? null,
            studios: fields?.studios ?? null,
            seasonYear: fields?.seasonYear ?? null,
            format: fields?.format ?? null,
        };
    });
};

// --- Write ------------------------------------------------------------------

export const importEntries = async (
    userId: string,
    entries: ImportEntry[],
    opts: { overwrite: boolean },
    onProgress?: ImportProgress,
): Promise<ImportResult> => {
    const [{ data: existingRows, error: listError }, { data: existingReviews, error: reviewError }] = await Promise.all([
        supabase.from('user_anime_list').select('anime_id').eq('user_id', userId),
        supabase.from('reviews').select('anime_id').eq('user_id', userId),
    ]);
    if (listError) throw listError;
    if (reviewError) throw reviewError;
    const existing = new Set((existingRows ?? []).map(r => String(r.anime_id)));
    const rated = new Set((existingReviews ?? []).map(r => String(r.anime_id)));

    const toWrite = entries.filter(e => opts.overwrite || !existing.has(e.key));
    const now = new Date().toISOString();
    const result: ImportResult = { added: 0, updated: 0, skipped: entries.length - toWrite.length, ratings: 0 };

    for (let i = 0; i < toWrite.length; i += UPSERT_BATCH) {
        const batch = toWrite.slice(i, i + UPSERT_BATCH);
        const rows = batch.map(e => ({
            user_id: userId,
            anime_id: e.key,
            anime_title: e.title,
            anime_image: e.image,
            status: e.status,
            // The list tab shows favorites; everything added from the app is favorited too
            is_favorite: true,
            current_episode: e.status === 'completed' && e.totalEpisodes ? e.totalEpisodes : e.progress,
            total_episodes: e.totalEpisodes ?? 0,
            score: e.communityScore,
            genres: e.genres,
            studios: e.studios,
            season_year: e.seasonYear,
            format: e.format,
            started_at: e.startedAt,
            finished_at: e.finishedAt,
            updated_at: now,
        }));
        const { error } = await supabase.from('user_anime_list').upsert(rows, { onConflict: 'user_id,anime_id' });
        if (error) throw error;
        batch.forEach(e => (existing.has(e.key) ? result.updated++ : result.added++));

        const reviews = batch
            .filter(e => e.score10 && e.score10 > 0 && (opts.overwrite || !rated.has(e.key)))
            .map(e => ({
                user_id: userId,
                anime_id: e.key,
                rating: Math.min(5, Math.max(1, Math.ceil(e.score10! / 2))),
                // NULL (not '') marks an imported rating without a written review
                comment: null,
                updated_at: now,
            }));
        if (reviews.length) {
            const { error: rError } = await supabase.from('reviews').upsert(reviews, { onConflict: 'user_id,anime_id' });
            if (rError) throw rError;
            result.ratings += reviews.length;
        }
        onProgress?.(Math.min(i + UPSERT_BATCH, toWrite.length), toWrite.length);
    }

    recommendationService.clearCache();
    return result;
};
