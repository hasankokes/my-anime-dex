/**
 * Premium export (Module 6): the user's list with ratings, notes, tags and dates as CSV or JSON,
 * shared through the system share sheet (downloaded as a file on web).
 */
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { supabase } from '../lib/supabase';

export type ExportFormat = 'csv' | 'json';

export interface ExportRow {
    anime_id: string;
    title: string;
    status: string | null;
    favorite: boolean;
    episodes_watched: number;
    total_episodes: number | null;
    my_rating: number | null;
    my_review: string | null;
    community_score: number | null;
    tags: string[];
    notes: string | null;
    started_at: string | null;
    finished_at: string | null;
    genres: string[];
    studios: string[];
    year: number | null;
    format: string | null;
    added_at: string | null;
    updated_at: string | null;
}

export const loadExportRows = async (userId: string): Promise<ExportRow[]> => {
    const [list, reviews] = await Promise.all([
        supabase
            .from('user_anime_list')
            .select('anime_id, anime_title, status, is_favorite, current_episode, total_episodes, score, tags, notes, started_at, finished_at, genres, studios, season_year, format, created_at, updated_at')
            .eq('user_id', userId)
            .order('anime_title'),
        supabase.from('reviews').select('anime_id, rating, comment').eq('user_id', userId),
    ]);
    if (list.error) throw list.error;
    if (reviews.error) throw reviews.error;
    const byAnime = new Map((reviews.data ?? []).map(r => [String(r.anime_id), r]));

    return (list.data ?? []).map(r => {
        const review = byAnime.get(String(r.anime_id));
        return {
            anime_id: String(r.anime_id),
            title: r.anime_title ?? '',
            status: r.status,
            favorite: !!r.is_favorite,
            episodes_watched: r.current_episode ?? 0,
            total_episodes: r.total_episodes || null,
            my_rating: review?.rating ?? null,
            my_review: review?.comment || null,
            community_score: r.score,
            tags: r.tags ?? [],
            notes: r.notes,
            started_at: r.started_at,
            finished_at: r.finished_at,
            genres: r.genres ?? [],
            studios: r.studios ?? [],
            year: r.season_year,
            format: r.format,
            added_at: r.created_at,
            updated_at: r.updated_at,
        };
    });
};

const csvCell = (value: unknown): string => {
    if (value == null) return '';
    const text = Array.isArray(value) ? value.join('; ') : String(value);
    // Quote when needed; neutralise spreadsheet formulas (=, +, -, @ at the start)
    const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
    return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

export const toCsv = (rows: ExportRow[]): string => {
    const headers: (keyof ExportRow)[] = [
        'anime_id', 'title', 'status', 'favorite', 'episodes_watched', 'total_episodes', 'my_rating', 'my_review',
        'community_score', 'tags', 'notes', 'started_at', 'finished_at', 'genres', 'studios', 'year', 'format',
        'added_at', 'updated_at',
    ];
    const lines = [headers.join(',')];
    for (const row of rows) lines.push(headers.map(h => csvCell(row[h])).join(','));
    return lines.join('\r\n');
};

export const toJson = (rows: ExportRow[]): string =>
    JSON.stringify({ app: 'MyAnimeDex', version: 1, exported_at: new Date().toISOString(), anime: rows }, null, 2);

// UTF-8 BOM so Excel opens Japanese titles etc. correctly. A leading U+FEFF in a string gets
// dropped by the native UTF-8 write, so CSV files are written as base64 bytes instead.
const UTF8_BOM = [0xef, 0xbb, 0xbf];

const toBase64Utf8 = (text: string, prefix: number[] = []): string => {
    const bytes = new TextEncoder().encode(text);
    let binary = String.fromCharCode(...prefix);
    for (let i = 0; i < bytes.length; i += 0x8000) {
        binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    }
    return btoa(binary);
};

const localDateStamp = (d = new Date()) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Builds the file and opens the share sheet. Returns the number of exported entries. */
export const exportList = async (userId: string, format: ExportFormat): Promise<number> => {
    const rows = await loadExportRows(userId);
    const content = format === 'csv' ? toCsv(rows) : toJson(rows);
    const fileName = `myanimedex-list-${localDateStamp()}.${format}`;
    const mimeType = format === 'csv' ? 'text/csv' : 'application/json';

    if (Platform.OS === 'web') {
        const blob = new Blob(format === 'csv' ? [new Uint8Array(UTF8_BOM), content] : [content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
        return rows.length;
    }

    const uri = `${FileSystem.cacheDirectory}${fileName}`;
    if (format === 'csv') {
        await FileSystem.writeAsStringAsync(uri, toBase64Utf8(content, UTF8_BOM), { encoding: FileSystem.EncodingType.Base64 });
    } else {
        await FileSystem.writeAsStringAsync(uri, content, { encoding: FileSystem.EncodingType.UTF8 });
    }
    await Sharing.shareAsync(uri, { mimeType, dialogTitle: fileName, UTI: format === 'csv' ? 'public.comma-separated-values-text' : 'public.json' });
    return rows.length;
};
