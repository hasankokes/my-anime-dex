/**
 * Discover — personal anime recommendations (AniList only).
 *
 * Signals, strongest first:
 *  1. Community recommendations ("people who liked X also liked Y") of the anime
 *     in the user's list — AniList `Media.recommendations`, weighted by vote count.
 *  2. Content similarity to the user's taste profile: genres + AniList tags (themes).
 *  3. Quality (average score) and a little popularity.
 *
 * Seed weights come from what the user actually did: status, episode progress and
 * their own review rating. (`user_anime_list.is_favorite` is set on almost every add
 * and `score` is the community score, so neither says anything about taste.)
 *
 * Users with no or few list entries pick genres once (stored on the device);
 * those picks seed the profile on their own or blend with a small list.
 *
 * Network budget per load: 1 Supabase round-trip + 2 AniList requests
 * (seeds, candidate buckets) and rarely a 3rd for entries saved with an AniList ID.
 *
 * Premium "smart" layer (opts.smart, Module 3) on top of the same engine:
 *  - dropped entries and "don't recommend" picks become negative seeds,
 *  - candidates similar to rejected shows are pushed down,
 *  - filters (genres in/out, episodes, years, airing status) shape the AniList buckets,
 *  - every item carries its contributing list entries (with the user's rating) as the reason.
 * Without opts.smart the free Discover behaves exactly as before.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { Anime } from '../lib/jikan';
import { fetchGraphQL } from './anilist/client';
import { normalizeMedia } from './anilist/normalizer';
import {
  DISCOVER_MEDIA_FIELDS,
  DISCOVER_SEEDS_BY_MAL_QUERY,
  DISCOVER_SEEDS_BY_ID_QUERY,
} from './anilist/queries';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** AniList's genre list (fixed set), in display order for the taste picker */
export const DISCOVER_GENRES = [
  'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Romance',
  'Slice of Life', 'Sci-Fi', 'Mystery', 'Psychological', 'Thriller', 'Horror',
  'Supernatural', 'Sports', 'Mecha', 'Music', 'Mahou Shoujo', 'Ecchi',
] as const;

export type DiscoverReason =
  | { type: 'because'; title: string; extra: number }
  | { type: 'themes'; tags: string[] }
  | { type: 'genres'; genres: string[] }
  | { type: 'gem' }
  | { type: 'trending' }
  | { type: 'topRated' }
  | { type: 'sequel'; title: string }
  /** Premium: list entries the user rated 4-5★ that led to this pick */
  | { type: 'rated'; titles: string[] }
  /** Premium season picks: made by a studio the user likes */
  | { type: 'studio'; name: string };

/** A list entry that contributed to a recommendation (premium detail) */
export interface Contributor {
  key: string;
  title: string;
  /** The user's own rating (1-5), null if not rated */
  rating: number | null;
  /** 0-1 share of this item's collaborative score */
  share: number;
}

/** Premium filters; every set field narrows the results */
export interface SmartFilters {
  includeGenres: string[];
  excludeGenres: string[];
  episodesMin: number | null;
  episodesMax: number | null;
  yearMin: number | null;
  yearMax: number | null;
  status: 'any' | 'finished' | 'releasing';
}

export const EMPTY_SMART_FILTERS: SmartFilters = {
  includeGenres: [],
  excludeGenres: [],
  episodesMin: null,
  episodesMax: null,
  yearMin: null,
  yearMax: null,
  status: 'any',
};

/** A "don't recommend this" pick (premium, stored in Supabase rec_feedback) */
export interface RejectedItem {
  key: string;
  anilistId: number | null;
  title: string | null;
  genres: string[];
  tags: string[];
}

export interface SmartOptions {
  filters: SmartFilters;
  rejected: RejectedItem[];
}

export interface DiscoverItem {
  /** Same ID the rest of the app uses (`mal_id`, i.e. idMal or AniList id) */
  key: string;
  /** AniList media id */
  anilistId: number;
  anime: Anime;
  /** 0-99 taste match, null when there is no taste profile */
  match: number | null;
  reasons: DiscoverReason[];
  format: string | null;
  status: string | null;
  episodes: number | null;
  seasonYear: number | null;
  averageScore: number | null;
  popularity: number;
  /** Premium: what in the user's list led to this item, strongest first */
  contributors?: Contributor[];
  /** Theme tags kept for "don't recommend" similarity */
  tagNames?: string[];
}

export interface TasteProfile {
  /** share = weighted fraction of the user's seeds that have this genre / theme (0-1) */
  genres: { name: string; share: number }[];
  tags: { name: string; share: number }[];
  /** List entries the profile was built from */
  seedCount: number;
  pickedGenres: string[];
}

export type DiscoverMode = 'personal' | 'blend' | 'picks' | 'popular';

export interface DiscoverResult {
  mode: DiscoverMode;
  profile: TasteProfile;
  items: DiscoverItem[];
  /** Sequels of finished anime the user hasn't added yet */
  continueItems: DiscoverItem[];
  /** Number of entries in the user's list */
  listCount: number;
  /** Number of anime the user has rated (reviews) — gate for the premium layer */
  ratedCount: number;
  /** Completed entries without a rating, to suggest rating them (premium empty state) */
  unratedCompleted: { key: string; title: string }[];
}

/** Kept for the home card / older callers */
export interface UserGenreProfile {
  topGenres: { name: string; count: number }[];
  avgScore: number;
  totalRated: number;
}

// ---------------------------------------------------------------------------
// Internal types & constants
// ---------------------------------------------------------------------------

interface ListRow {
  anime_id: string;
  anime_title?: string | null;
  status: string | null;
  is_favorite: boolean | null;
  current_episode: number | null;
  total_episodes: number | null;
  updated_at: string | null;
}

interface Seed {
  key: string;
  weight: number;
  status: string | null;
  /** The user's review rating, if any */
  rating: number | null;
  media: any;
}

interface Candidate {
  media: any;
  cf: number;
  sources: { title: string; value: number; seedKey: string }[];
  buckets: Set<string>;
}

const CANDIDATE_FORMATS = ['TV', 'TV_SHORT', 'MOVIE', 'ONA'];
const MAX_SEEDS = 25;
const MIN_TAG_RANK = 50;
const GEM_MAX_POPULARITY = 60000;
const RESULT_LIMIT = 60;
const RESULT_CACHE_MS = 1000 * 60 * 10;

/** Sequels a user can "continue" after finishing a show */
const CONTINUE_RELATIONS = ['SEQUEL'];

const storageKey = (kind: 'genres' | 'hidden', userId: string | null) =>
  `discover_${kind}_v1_${userId ?? 'guest'}`;

const mediaKey = (m: any): string => String(m?.idMal || m?.id);
const titleOf = (m: any): string => m?.title?.english || m?.title?.userPreferred || m?.title?.romaji || '';
const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

// ---------------------------------------------------------------------------
// Caches
// ---------------------------------------------------------------------------

let seedCache: { userId: string; variant: string; at: number; rows: ListRow[]; seeds: Seed[]; ratings: Map<string, number> } | null = null;
let resultCache: { signature: string; at: number; result: DiscoverResult } | null = null;

// ---------------------------------------------------------------------------
// User signals
// ---------------------------------------------------------------------------

/** How much an entry says about the user's taste. Negative = disliked. */
function seedWeight(row: ListRow, rating: number | undefined, smart = false): number {
  let w: number;
  // Premium: dropping a show is a dislike (stronger the earlier it was dropped); "don't recommend" too
  if (smart && row.status === 'rejected') return -0.8;
  if (smart && row.status === 'dropped') {
    const total = row.total_episodes || 0;
    const progress = total > 0 ? clamp01((row.current_episode || 0) / total) : 0.3;
    w = -(0.4 + 0.4 * (1 - progress));
    // An explicit good rating outweighs the drop
    return rating != null && rating >= 4 ? 0.3 : w;
  }
  switch (row.status) {
    case 'completed':
      w = 1;
      break;
    case 'watching': {
      const total = row.total_episodes || 0;
      const progress = total > 0 ? clamp01((row.current_episode || 0) / total) : 0.3;
      w = 0.55 + 0.4 * progress;
      break;
    }
    case 'plan_to_watch':
      w = 0.3;
      break;
    default:
      // Favorite without a status: added from the favorites button
      w = row.is_favorite ? 0.8 : 0.3;
  }

  // The user's own review (1-5) is the only explicit rating we have
  if (rating != null) {
    if (rating >= 5) w *= 1.6;
    else if (rating === 4) w *= 1.3;
    else if (rating === 2) w = -0.5;
    else if (rating <= 1) w = -1;
  }

  // Recent activity reflects current taste a bit better
  if (w > 0 && row.updated_at && Date.now() - new Date(row.updated_at).getTime() < 1000 * 60 * 60 * 24 * 45) {
    w *= 1.15;
  }
  return w;
}

async function loadSeeds(
  userId: string,
  force = false,
  smart?: { rejected: RejectedItem[] },
): Promise<{ rows: ListRow[]; seeds: Seed[]; ratings: Map<string, number> }> {
  const variant = smart ? `smart:${smart.rejected.map(r => r.key).sort().join(',')}` : 'free';
  if (!force && seedCache && seedCache.userId === userId && seedCache.variant === variant && Date.now() - seedCache.at < RESULT_CACHE_MS) {
    return seedCache;
  }

  const [{ data: rows }, { data: reviews }] = await Promise.all([
    supabase
      .from('user_anime_list')
      .select('anime_id, anime_title, status, is_favorite, current_episode, total_episodes, updated_at')
      .eq('user_id', userId),
    supabase.from('reviews').select('anime_id, rating').eq('user_id', userId),
  ]);

  const listRows = (rows || []) as ListRow[];
  const ratings = new Map<string, number>();
  (reviews || []).forEach((r: any) => ratings.set(String(r.anime_id), r.rating));

  // Premium: rejected anime join as dislike seeds (unless they're in the list anyway)
  const inList = new Set(listRows.map(r => String(r.anime_id)));
  const rejectedRows: ListRow[] = (smart?.rejected ?? [])
    .filter(r => !inList.has(r.key))
    .slice(0, 15)
    .map(r => ({ anime_id: r.key, anime_title: r.title, status: 'rejected', is_favorite: false, current_episode: 0, total_episodes: 0, updated_at: null }));

  const weighted = [...listRows, ...rejectedRows]
    .map(row => ({ row, weight: seedWeight(row, ratings.get(String(row.anime_id)), !!smart) }))
    .filter(x => x.weight !== 0);

  // Strongest signals first; keep a few dislikes so they can push similar shows down
  const positives = weighted.filter(x => x.weight > 0).sort((a, b) => b.weight - a.weight).slice(0, MAX_SEEDS);
  const negatives = weighted.filter(x => x.weight < 0).sort((a, b) => a.weight - b.weight).slice(0, smart ? 12 : 5);
  const chosen = [...positives, ...negatives];

  const seeds: Seed[] = [];
  if (chosen.length > 0) {
    const byKey = new Map(chosen.map(x => [String(x.row.anime_id), x]));
    const ids = chosen.map(x => parseInt(x.row.anime_id, 10)).filter(n => !isNaN(n));

    const addSeeds = (media: any[]) => {
      media.forEach(m => {
        const hit = byKey.get(String(m.idMal)) || byKey.get(String(m.id));
        if (!hit || seeds.some(s => s.key === String(hit.row.anime_id))) return;
        const rating = ratings.get(String(hit.row.anime_id));
        seeds.push({ key: String(hit.row.anime_id), weight: hit.weight, status: hit.row.status, rating: rating ?? null, media: m });
      });
    };

    const byMal = await fetchGraphQL<any>(DISCOVER_SEEDS_BY_MAL_QUERY, { ids }, {
      cacheKey: `discover_seeds_mal_${[...ids].sort((a, b) => a - b).join(',')}`,
      cacheDuration: RESULT_CACHE_MS,
    });
    addSeeds(byMal?.Page?.media || []);

    // Entries without a MAL ID are stored under their AniList ID
    const resolved = new Set(seeds.map(s => s.key));
    const missing = ids.filter(id => !resolved.has(String(id)));
    if (missing.length > 0) {
      try {
        const byId = await fetchGraphQL<any>(DISCOVER_SEEDS_BY_ID_QUERY, { ids: missing }, {
          cacheKey: `discover_seeds_al_${[...missing].sort((a, b) => a - b).join(',')}`,
          cacheDuration: RESULT_CACHE_MS,
        });
        addSeeds(byId?.Page?.media || []);
      } catch (e) {
        console.warn('[Discover] AniList-ID seed lookup failed:', e);
      }
    }
  }

  seedCache = { userId, variant, at: Date.now(), rows: listRows, seeds, ratings };
  return seedCache;
}

// ---------------------------------------------------------------------------
// Taste profile
// ---------------------------------------------------------------------------

// Generic cast/format tags ("Male Protagonist", "Shounen", "Full CGI") say little about taste
const IGNORED_TAG_CATEGORIES = ['Cast-Main Cast', 'Demographic', 'Technical', 'Sexual Content'];

export function usableTags(m: any): { name: string; rank: number }[] {
  return (m?.tags || []).filter((t: any) =>
    t && !t.isMediaSpoiler && !t.isAdult && (t.rank ?? 0) >= MIN_TAG_RANK &&
    !IGNORED_TAG_CATEGORIES.includes(t.category)
  );
}

function buildProfile(seeds: Seed[], pickedGenres: string[]) {
  const genreScore: Record<string, number> = {};
  const tagScore: Record<string, number> = {};
  let totalPositive = 0;

  seeds.forEach(s => {
    if (s.weight > 0) totalPositive += s.weight;
    (s.media.genres || []).forEach((g: string) => {
      genreScore[g] = (genreScore[g] || 0) + s.weight;
    });
    usableTags(s.media).forEach(t => {
      tagScore[t.name] = (tagScore[t.name] || 0) + s.weight * (t.rank / 100);
    });
  });

  // Picked genres count like strong seeds; they dominate when the list is tiny
  const pickWeight = Math.max(1, totalPositive * 0.35);
  pickedGenres.forEach(g => {
    genreScore[g] = (genreScore[g] || 0) + pickWeight;
  });
  totalPositive += pickedGenres.length > 0 ? pickWeight : 0;

  const norm = totalPositive > 0 ? totalPositive : 1;
  const genreShare: Record<string, number> = {};
  Object.entries(genreScore).forEach(([g, v]) => (genreShare[g] = v / norm));
  const tagShare: Record<string, number> = {};
  Object.entries(tagScore).forEach(([t, v]) => (tagShare[t] = v / norm));

  const top = (rec: Record<string, number>, n: number) =>
    Object.entries(rec)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([name, share]) => ({ name, share: clamp01(share) }));

  const profile: TasteProfile = {
    genres: top(genreShare, 6),
    // Themes need at least two seeds' worth of evidence to be shown
    tags: seeds.length >= 2 ? top(tagShare, 8).filter(t => t.share >= 0.2) : top(tagShare, 8),
    seedCount: seeds.filter(s => s.weight > 0).length,
    pickedGenres,
  };
  return { profile, genreShare, tagShare };
}

// ---------------------------------------------------------------------------
// Candidate buckets (one AniList request with aliased Page queries)
// ---------------------------------------------------------------------------

interface Bucket {
  alias: string;
  perPage: number;
  args: Record<string, any>;
}

const ENUM_ARGS = new Set(['sort', 'format_in', 'status']);


function gqlArg(key: string, value: any): string {
  if (ENUM_ARGS.has(key)) {
    return Array.isArray(value) ? `[${value.join(', ')}]` : String(value);
  }
  return JSON.stringify(value);
}

function buildBucketQuery(buckets: Bucket[]): string {
  const parts = buckets.map(b => {
    const args = Object.entries({ type: 'ANIME', isAdult: false, format_in: CANDIDATE_FORMATS, ...b.args })
      .filter(([, v]) => v != null && !(Array.isArray(v) && v.length === 0))
      .map(([k, v]) => `${k}: ${k === 'type' ? v : gqlArg(k, v)}`)
      .join(', ');
    return `${b.alias}: Page(perPage: ${b.perPage}) { media(${args}) { ${DISCOVER_MEDIA_FIELDS} } }`;
  });
  return `query { ${parts.join('\n')} }`;
}

/** AniList Page args for premium filters (merged into every bucket) */
function filterArgs(f: SmartFilters | undefined): Record<string, any> {
  if (!f) return {};
  const args: Record<string, any> = {};
  if (f.excludeGenres.length) args.genre_not_in = f.excludeGenres;
  if (f.episodesMin != null) args.episodes_greater = f.episodesMin - 1;
  if (f.episodesMax != null) args.episodes_lesser = f.episodesMax + 1;
  if (f.yearMin != null) args.startDate_greater = f.yearMin * 10000;
  if (f.yearMax != null) args.startDate_lesser = (f.yearMax + 1) * 10000;
  if (f.status === 'finished') args.status = 'FINISHED';
  if (f.status === 'releasing') args.status = 'RELEASING';
  return args;
}

/** Client-side check of the same filters (collaborative candidates don't go through the buckets) */
export function passesSmartFilters(m: { genres?: string[] | null; episodes?: number | null; seasonYear?: number | null; status?: string | null }, f: SmartFilters): boolean {
  const genres = m.genres || [];
  if (f.includeGenres.length && !f.includeGenres.some(g => genres.includes(g))) return false;
  if (f.excludeGenres.some(g => genres.includes(g))) return false;
  if (f.episodesMin != null && (m.episodes == null || m.episodes < f.episodesMin)) return false;
  if (f.episodesMax != null && (m.episodes == null || m.episodes > f.episodesMax)) return false;
  if (f.yearMin != null && (m.seasonYear == null || m.seasonYear < f.yearMin)) return false;
  if (f.yearMax != null && (m.seasonYear == null || m.seasonYear > f.yearMax)) return false;
  if (f.status === 'finished' && m.status !== 'FINISHED') return false;
  if (f.status === 'releasing' && m.status !== 'RELEASING') return false;
  return true;
}

export const countSmartFilters = (f: SmartFilters) =>
  [f.includeGenres.length > 0, f.excludeGenres.length > 0, f.episodesMin != null || f.episodesMax != null,
    f.yearMin != null || f.yearMax != null, f.status !== 'any'].filter(Boolean).length;

/** Jaccard similarity of two genre+theme sets (for pushing down shows like rejected ones) */
function setSimilarity(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0;
  const A = new Set(a);
  const inter = b.filter(x => A.has(x)).length;
  return inter / new Set([...a, ...b]).size;
}

function planBuckets(mode: DiscoverMode, genres: string[], tags: string[], excludeIds: number[], filters?: SmartFilters): Bucket[] {
  return planBaseBuckets(mode, genres, tags, excludeIds).map(b => {
    const extra = filterArgs(filters);
    // A filter's start year wins over the "fresh" bucket's own floor when it is later
    if (b.args.startDate_greater != null && extra.startDate_greater != null) {
      extra.startDate_greater = Math.max(b.args.startDate_greater, extra.startDate_greater);
    }
    return { ...b, args: { ...b.args, ...extra } };
  });
}

function planBaseBuckets(mode: DiscoverMode, genres: string[], tags: string[], excludeIds: number[]): Bucket[] {
  const notIn = excludeIds.slice(0, 150);
  const freshFrom = (new Date().getFullYear() - 2) * 10000;

  if (mode === 'popular') {
    return [
      { alias: 'trending', perPage: 30, args: { sort: ['TRENDING_DESC'], averageScore_greater: 60 } },
      { alias: 'topRated', perPage: 30, args: { sort: ['SCORE_DESC'], popularity_greater: 20000 } },
      { alias: 'gems', perPage: 20, args: { sort: ['SCORE_DESC'], popularity_lesser: GEM_MAX_POPULARITY, popularity_greater: 3000, averageScore_greater: 76 } },
    ];
  }

  const [g1, g2, g3] = genres;
  const buckets: Bucket[] = [
    { alias: 'match', perPage: 40, args: { genre_in: [g1], tag_in: tags.slice(0, 4), sort: ['POPULARITY_DESC'], averageScore_greater: 65, id_not_in: notIn } },
    { alias: 'gems', perPage: 25, args: { genre_in: [g1], sort: ['SCORE_DESC'], popularity_lesser: GEM_MAX_POPULARITY, popularity_greater: 2000, averageScore_greater: 73, id_not_in: notIn } },
    { alias: 'fresh', perPage: 20, args: { genre_in: [g1], sort: ['POPULARITY_DESC'], startDate_greater: freshFrom, averageScore_greater: 62, id_not_in: notIn } },
  ];
  if (g2) {
    buckets.push({ alias: 'match2', perPage: 25, args: { genre_in: [g2], tag_in: tags.slice(0, 4), sort: ['SCORE_DESC'], averageScore_greater: 70, popularity_greater: 5000, id_not_in: notIn } });
  }
  if (g3 && mode !== 'personal') {
    // Picked genres: give the third pick its own bucket so every pick is represented
    buckets.push({ alias: 'match3', perPage: 20, args: { genre_in: [g3], sort: ['POPULARITY_DESC'], averageScore_greater: 68, id_not_in: notIn } });
  }
  return buckets;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * True for a later season/part/movie whose earlier entry the user hasn't seen.
 * A "prequel" released after the candidate (e.g. Jujutsu Kaisen 0 for Jujutsu Kaisen)
 * is a spin-off, not a reason to skip the show.
 */
function isSequel(m: any): boolean {
  return (m?.relations?.edges || []).some((e: any) =>
    e?.relationType === 'PREQUEL' &&
    e.node?.type === 'ANIME' &&
    e.node.format !== 'MUSIC' &&
    // Unknown years (common for donghua) count as a sequel: safer to skip than to spoil
    (e.node.seasonYear == null || m.seasonYear == null || e.node.seasonYear <= m.seasonYear)
  );
}

export function toItem(m: any, match: number | null, reasons: DiscoverReason[]): DiscoverItem {
  return {
    key: mediaKey(m),
    anilistId: m.id,
    anime: normalizeMedia(m) as Anime,
    match,
    reasons,
    format: m.format ?? null,
    status: m.status ?? null,
    episodes: m.episodes ?? null,
    seasonYear: m.seasonYear ?? null,
    averageScore: m.averageScore ?? null,
    popularity: m.popularity ?? 0,
    tagNames: usableTags(m).slice(0, 8).map(t => t.name),
  };
}

export const isHiddenGem = (item: Pick<DiscoverItem, 'popularity' | 'averageScore'>) =>
  item.popularity > 0 && item.popularity < GEM_MAX_POPULARITY && (item.averageScore ?? 0) >= 76;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const recommendationService = {
  /** Drops per-user caches (called on sign-out and after list changes) */
  clearCache() {
    seedCache = null;
    resultCache = null;
  },

  // --- Device-stored preferences -------------------------------------------

  async getPickedGenres(userId: string | null): Promise<string[]> {
    try {
      const raw = await AsyncStorage.getItem(storageKey('genres', userId));
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.filter((g: any) => (DISCOVER_GENRES as readonly string[]).includes(g)) : [];
    } catch {
      return [];
    }
  },

  async setPickedGenres(userId: string | null, genres: string[]): Promise<void> {
    resultCache = null;
    try {
      await AsyncStorage.setItem(storageKey('genres', userId), JSON.stringify(genres.slice(0, 5)));
    } catch {
      // not critical
    }
  },

  async getHidden(userId: string | null): Promise<string[]> {
    try {
      const raw = await AsyncStorage.getItem(storageKey('hidden', userId));
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  },

  async hide(userId: string | null, key: string): Promise<string[]> {
    const hidden = await this.getHidden(userId);
    const next = [key, ...hidden.filter(k => k !== key)].slice(0, 500);
    try {
      await AsyncStorage.setItem(storageKey('hidden', userId), JSON.stringify(next));
    } catch {
      // not critical
    }
    return next;
  },

  async clearHidden(userId: string | null): Promise<void> {
    resultCache = null;
    try {
      await AsyncStorage.removeItem(storageKey('hidden', userId));
    } catch {
      // not critical
    }
  },

  /**
   * Taste signals for other recommenders (premium season picks): the user's seeds and their
   * genre / theme shares. Same cache as Discover.
   */
  async getTasteContext(userId: string): Promise<{
    rows: { anime_id: string; status: string | null }[];
    seeds: { key: string; weight: number; title: string; rating: number | null; recommendationIds: Map<number, number> }[];
    genreShare: Record<string, number>;
    tagShare: Record<string, number>;
  }> {
    const { rows, seeds } = await loadSeeds(userId);
    const { genreShare, tagShare } = buildProfile(seeds, []);
    return {
      rows,
      seeds: seeds.map(sd => ({
        key: sd.key,
        weight: sd.weight,
        title: titleOf(sd.media),
        rating: sd.rating,
        // AniList id -> community vote count of "people who liked this also liked"
        recommendationIds: new Map(
          (sd.media.recommendations?.nodes || [])
            .filter((n: any) => n?.mediaRecommendation && (n.rating ?? 0) > 0)
            .map((n: any) => [n.mediaRecommendation.id as number, n.rating as number]),
        ),
      })),
      genreShare,
      tagShare,
    };
  },

  // --- Home card -------------------------------------------------------------

  /** Lightweight summary for the home "For You" card */
  async getUserProfile(userId: string): Promise<{ profile: UserGenreProfile; excludedIds: Set<number> }> {
    const { rows, seeds } = await loadSeeds(userId);
    const picks = await this.getPickedGenres(userId);
    const { profile } = buildProfile(seeds, picks);
    return {
      profile: {
        topGenres: profile.genres.slice(0, 3).map(g => ({ name: g.name, count: Math.round(g.share * 100) })),
        avgScore: 0,
        totalRated: profile.seedCount,
      },
      excludedIds: new Set(rows.map(r => parseInt(r.anime_id, 10)).filter(n => !isNaN(n))),
    };
  },

  // --- Discover --------------------------------------------------------------

  async getDiscover(opts: { userId: string | null; force?: boolean; smart?: SmartOptions }): Promise<DiscoverResult> {
    const { userId, force, smart } = opts;
    const [picks, hiddenList] = await Promise.all([this.getPickedGenres(userId), this.getHidden(userId)]);

    const signature = JSON.stringify([userId, picks, smart ? [smart.filters, smart.rejected.map(r => r.key)] : null]);
    if (!force && resultCache && resultCache.signature === signature && Date.now() - resultCache.at < RESULT_CACHE_MS) {
      const hiddenNow = new Set(hiddenList);
      return { ...resultCache.result, items: resultCache.result.items.filter(i => !hiddenNow.has(i.key)) };
    }

    const { rows, seeds, ratings } = userId
      ? await loadSeeds(userId, force, smart ? { rejected: smart.rejected } : undefined)
      : { rows: [] as ListRow[], seeds: [] as Seed[], ratings: new Map<string, number>() };
    const positiveSeeds = seeds.filter(s => s.weight > 0);

    const mode: DiscoverMode =
      positiveSeeds.length >= 3 ? 'personal'
        : positiveSeeds.length > 0 ? 'blend'
          : picks.length > 0 ? 'picks'
            : 'popular';

    const { profile, genreShare, tagShare } = buildProfile(seeds, mode === 'personal' ? [] : picks);

    // Everything already in the list, plus anything the user hid
    const listKeys = new Set(rows.map(r => String(r.anime_id)));
    const hidden = new Set(hiddenList);
    const rejectedKeys = new Set((smart?.rejected ?? []).flatMap(r => [r.key, r.anilistId != null ? `al:${r.anilistId}` : '']));
    const seedAniListIds = seeds.map(s => s.media.id as number);
    const excluded = (m: any) =>
      !m || m.isAdult || listKeys.has(String(m.idMal)) || listKeys.has(String(m.id)) || hidden.has(mediaKey(m))
      || (!!smart && (rejectedKeys.has(mediaKey(m)) || rejectedKeys.has(`al:${m.id}`)));

    // 1. Collaborative candidates from the seeds' community recommendations
    const candidates = new Map<number, Candidate>();
    const touch = (m: any, bucket: string) => {
      let c = candidates.get(m.id);
      if (!c) {
        c = { media: m, cf: 0, sources: [], buckets: new Set() };
        candidates.set(m.id, c);
      }
      c.buckets.add(bucket);
      return c;
    };

    seeds.forEach(seed => {
      const nodes = seed.media.recommendations?.nodes || [];
      nodes.forEach((node: any, position: number) => {
        const m = node?.mediaRecommendation;
        const rating = node?.rating ?? 0;
        if (!m || rating <= 0 || excluded(m) || !CANDIDATE_FORMATS.includes(m.format)) return;
        if (smart && !passesSmartFilters(m, smart.filters)) return;
        // Vote confidence × list position
        const strength = (rating / (rating + 20)) * (1 - position * 0.07);
        const value = seed.weight * strength;
        const c = touch(m, 'cf');
        c.cf += value;
        if (value > 0) c.sources.push({ title: titleOf(seed.media), value, seedKey: seed.key });
      });
    });

    // 2. Content-based buckets
    const genreNames = profile.genres.map(g => g.name);
    // Blend: the small list's main genre leads (with its themes), every pick gets its own bucket
    const baseGenres = mode === 'picks' ? picks
      : mode === 'blend' ? [...new Set([...genreNames.slice(0, 1), ...picks, ...genreNames.slice(1)])]
        : genreNames;
    // Premium genre filter: buckets search inside the chosen genres (taste order first)
    const included = smart?.filters.includeGenres ?? [];
    const bucketGenres = included.length
      ? [...baseGenres.filter(g => included.includes(g)), ...included.filter(g => !baseGenres.includes(g))]
      : baseGenres.filter(g => !(smart?.filters.excludeGenres ?? []).includes(g));
    const bucketTags = profile.tags.map(t => t.name);
    const buckets = planBuckets(mode, bucketGenres, bucketTags, seedAniListIds, smart?.filters);

    try {
      const query = buildBucketQuery(buckets);
      const data = await fetchGraphQL<any>(query, undefined, {
        cacheKey: `discover_buckets_${JSON.stringify(buckets)}`,
        cacheDuration: RESULT_CACHE_MS,
      });
      buckets.forEach(b => {
        (data?.[b.alias]?.media || []).forEach((m: any) => {
          if (!excluded(m) && (!smart || passesSmartFilters(m, smart.filters))) touch(m, b.alias);
        });
      });
    } catch (e) {
      // Collaborative candidates alone are still useful; only fail if there is nothing
      console.warn('[Discover] Candidate buckets failed:', e);
      if (candidates.size === 0) throw e;
    }

    // 3. "Continue the story": sequels of finished/ongoing seeds that aren't in the list
    const continueMap = new Map<number, DiscoverItem>();
    seeds
      .filter(s => s.weight > 0 && (s.status === 'completed' || s.status === 'watching'))
      .forEach(seed => {
        (seed.media.relations?.edges || []).forEach((e: any) => {
          const n = e?.node;
          if (!CONTINUE_RELATIONS.includes(e?.relationType) || n?.type !== 'ANIME') return;
          if (excluded(n) || !CANDIDATE_FORMATS.includes(n.format) || continueMap.has(n.id)) return;
          continueMap.set(n.id, toItem(n, null, [{ type: 'sequel', title: titleOf(seed.media) }]));
        });
      });

    // 4. Score
    const hasProfile = mode !== 'popular';
    const maxCf = Math.max(0, ...[...candidates.values()].map(c => c.cf));
    const scored = [...candidates.values()]
      .filter(c => !continueMap.has(c.media.id) && !isSequel(c.media))
      .map(c => {
        const m = c.media;
        const genres: string[] = m.genres || [];
        const tags = usableTags(m);

        const gSim = genres.length ? genres.reduce((s, g) => s + Math.max(0, genreShare[g] || 0), 0) / Math.sqrt(genres.length * 2) : 0;
        const tSim = tags.reduce((s, t) => s + Math.max(0, tagShare[t.name] || 0) * (t.rank / 100), 0) / 1.5;
        const disliked = genres.some(g => (genreShare[g] || 0) < -0.15);
        const content = clamp01(0.55 * clamp01(gSim) + 0.45 * clamp01(tSim)) - (disliked ? 0.15 : 0);

        const quality = m.averageScore != null ? clamp01((m.averageScore - 55) / 35) : 0.4;
        const pop = clamp01(Math.log10(Math.max(1, m.popularity || 1)) / 6);
        const cfNorm = maxCf > 0 ? c.cf / maxCf : 0;

        let score: number;
        if (!hasProfile) score = 0.6 * quality + 0.4 * pop;
        else if (maxCf > 0) score = 0.45 * cfNorm + 0.35 * content + 0.15 * quality + 0.05 * pop;
        else score = 0.6 * content + 0.3 * quality + 0.1 * pop;
        if (c.cf < 0) score -= 0.25; // recommended from something the user disliked

        // Premium: push down shows that look like the ones the user rejected
        if (smart?.rejected.length) {
          const mine = [...genres, ...tags.map(t => t.name)];
          const maxSim = Math.max(0, ...smart.rejected.map(r => setSimilarity(mine, [...r.genres, ...r.tags])));
          score -= 0.4 * maxSim;
        }

        return { c, score, content };
      })
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score);

    // 5. Diversify: don't let one seed (or one bucket) fill the whole list
    const picked: typeof scored = [];
    const seedUse = new Map<string, number>();
    const pool = [...scored];
    while (pool.length > 0 && picked.length < RESULT_LIMIT) {
      let bestIdx = 0;
      let bestVal = -Infinity;
      for (let i = 0; i < Math.min(pool.length, 80); i++) {
        const top = [...pool[i].c.sources].sort((a, b) => b.value - a.value)[0];
        const uses = top ? seedUse.get(top.seedKey) || 0 : 0;
        const val = pool[i].score * Math.pow(0.85, uses);
        if (val > bestVal) {
          bestVal = val;
          bestIdx = i;
        }
      }
      const [chosen] = pool.splice(bestIdx, 1);
      const top = [...chosen.c.sources].sort((a, b) => b.value - a.value)[0];
      if (top) seedUse.set(top.seedKey, (seedUse.get(top.seedKey) || 0) + 1);
      picked.push(chosen);
    }

    const maxScore = picked.length > 0 ? Math.max(...picked.map(p => p.score)) : 1;
    let lastMatch = 99;
    const items = picked.map(({ c, score }) => {
      const m = c.media;
      const reasons: DiscoverReason[] = [];
      const sources = [...c.sources].sort((a, b) => b.value - a.value);
      const distinctSources = [...new Set(sources.map(s => s.title))];
      if (distinctSources.length > 0) {
        reasons.push({ type: 'because', title: distinctSources[0], extra: distinctSources.length - 1 });
      }
      if (hasProfile) {
        const matchedTags = usableTags(m)
          .filter(t => (tagShare[t.name] || 0) >= 0.2)
          .sort((a, b) => (tagShare[b.name] || 0) - (tagShare[a.name] || 0))
          .slice(0, 2)
          .map(t => t.name);
        const matchedGenres = (m.genres || [])
          .filter((g: string) => (genreShare[g] || 0) > 0)
          .sort((a: string, b: string) => (genreShare[b] || 0) - (genreShare[a] || 0))
          .slice(0, 2);
        if (matchedTags.length > 0) reasons.push({ type: 'themes', tags: matchedTags });
        else if (matchedGenres.length > 0) reasons.push({ type: 'genres', genres: matchedGenres });
      } else if (c.buckets.has('trending')) {
        reasons.push({ type: 'trending' });
      } else if (c.buckets.has('topRated')) {
        reasons.push({ type: 'topRated' });
      }
      // Keep the shown match % in list order after diversification
      lastMatch = Math.min(lastMatch, Math.round(55 + 44 * (score / maxScore)));
      const item = toItem(m, hasProfile ? lastMatch : null, reasons.slice(0, 2));
      if (isHiddenGem(item) && reasons.length < 2) item.reasons.push({ type: 'gem' });

      if (smart) {
        // Which list entries led here, with the user's rating ("because you rated X and Y highly")
        const bySeed = new Map<string, number>();
        c.sources.forEach(src => bySeed.set(src.seedKey, (bySeed.get(src.seedKey) || 0) + src.value));
        const total = [...bySeed.values()].reduce((a, b) => a + b, 0) || 1;
        const seedByKey = new Map(seeds.map(sd => [sd.key, sd]));
        item.contributors = [...bySeed.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([key, value]) => {
            const sd = seedByKey.get(key);
            return { key, title: sd ? titleOf(sd.media) : key, rating: sd?.rating ?? null, share: value / total };
          });
        const highlyRated = item.contributors.filter(ct => (ct.rating ?? 0) >= 4).map(ct => ct.title);
        if (highlyRated.length) {
          const rated: DiscoverReason = { type: 'rated', titles: highlyRated.slice(0, 2) };
          item.reasons = [rated, ...item.reasons.filter(r => r.type !== 'because')].slice(0, 2);
        }
      }
      return item;
    });

    const result: DiscoverResult = {
      mode,
      profile,
      items,
      continueItems: [...continueMap.values()]
        .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
        .slice(0, 12),
      listCount: rows.length,
      ratedCount: ratings.size,
      unratedCompleted: rows
        .filter(r => r.status === 'completed' && !ratings.has(String(r.anime_id)))
        .slice(0, 10)
        .map(r => ({ key: String(r.anime_id), title: r.anime_title || '' })),
    };
    resultCache = { signature, at: Date.now(), result };
    return result;
  },
};
