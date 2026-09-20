/**
 * AniList → Jikan Format Normalizer
 *
 * Converts AniList GraphQL responses into the Jikan-compatible data shape
 * that every UI component in the app already consumes.
 *
 * Key transformations:
 *  - Score: averageScore (0-100) → score (0-10)
 *  - Images: coverImage → images.jpg.large_image_url
 *  - Status/Season/Format enums → human-readable strings
 *  - Genres: string[] → { name: string }[]
 *  - Pagination: AniList pageInfo → Jikan pagination object
 */

// ---------------------------------------------------------------------------
// Enum mappings
// ---------------------------------------------------------------------------

const FORMAT_MAP: Record<string, string> = {
  TV: 'TV',
  TV_SHORT: 'TV Short',
  MOVIE: 'Movie',
  SPECIAL: 'Special',
  OVA: 'OVA',
  ONA: 'ONA',
  MUSIC: 'Music',
};

const SOURCE_MAP: Record<string, string> = {
  ORIGINAL: 'Original',
  MANGA: 'Manga',
  LIGHT_NOVEL: 'Light novel',
  VISUAL_NOVEL: 'Visual novel',
  VIDEO_GAME: 'Game',
  OTHER: 'Other',
  NOVEL: 'Novel',
  DOUJINSHI: 'Doujinshi',
  ANIME: 'Anime',
  WEB_NOVEL: 'Web novel',
  LIVE_ACTION: 'Other',
  GAME: 'Game',
  COMIC: 'Comic',
  MULTIMEDIA_PROJECT: 'Other',
  PICTURE_BOOK: 'Other',
};

const STATUS_MAP: Record<string, string> = {
  FINISHED: 'Finished Airing',
  RELEASING: 'Currently Airing',
  NOT_YET_RELEASED: 'Not yet aired',
  CANCELLED: 'Cancelled',
  HIATUS: 'On Hiatus',
};

const SEASON_MAP: Record<string, string> = {
  WINTER: 'winter',
  SPRING: 'spring',
  SUMMER: 'summer',
  FALL: 'fall',
};

/**
 * Jikan genre ID → AniList genre name.
 * Used to translate legacy genre-ID-based queries (e.g. from CATEGORIES in
 * the home screen) into the string-based format that AniList expects.
 *
 * Note: Jikan "Suspense" (41) maps to AniList "Thriller".
 */
export const JIKAN_GENRE_ID_TO_NAME: Record<string, string> = {
  '1': 'Action',
  '2': 'Adventure',
  '4': 'Comedy',
  '5': 'Avant Garde',
  '7': 'Mystery',
  '8': 'Drama',
  '10': 'Fantasy',
  '14': 'Horror',
  '22': 'Romance',
  '24': 'Sci-Fi',
  '25': 'Shoujo',
  '27': 'Shounen',
  '30': 'Sports',
  '36': 'Slice of Life',
  '37': 'Supernatural',
  '41': 'Thriller',
  '46': 'Award Winning',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Strip HTML tags and decode common entities */
function stripHtml(html: string | null | undefined): string {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
}

/** Convert episode duration in minutes to Jikan-style display string */
function formatDuration(minutes: number | null | undefined): string {
  if (!minutes) return 'Unknown';
  if (minutes >= 60) {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hrs} hr ${mins} min` : `${hrs} hr`;
  }
  return `${minutes} min per ep`;
}

// ---------------------------------------------------------------------------
// Core normalizer
// ---------------------------------------------------------------------------

/**
 * Convert a single AniList `Media` object into the Jikan `Anime` shape
 * that all UI components expect.
 */
export function normalizeMedia(media: any): any {
  if (!media) return null;

  const cover = media.coverImage || {};
  const largeImg =
    cover.extraLarge || cover.large || cover.medium || '';
  const smallImg = cover.large || cover.medium || '';

  // --- Trailer ---
  let trailer = {
    youtube_id: '',
    url: '',
    embed_url: '',
    images: {
      image_url: '',
      small_image_url: '',
      medium_image_url: '',
      large_image_url: '',
      maximum_image_url: '',
    },
  };

  if (media.trailer) {
    const isYT = media.trailer.site === 'youtube';
    const vid = media.trailer.id || '';
    trailer = {
      youtube_id: isYT ? vid : '',
      url: isYT
        ? `https://www.youtube.com/watch?v=${vid}`
        : '',
      embed_url: isYT
        ? `https://www.youtube.com/embed/${vid}`
        : '',
      images: {
        image_url: media.trailer.thumbnail || '',
        small_image_url: media.trailer.thumbnail || '',
        medium_image_url: media.trailer.thumbnail || '',
        large_image_url: media.trailer.thumbnail || '',
        maximum_image_url: media.trailer.thumbnail || '',
      },
    };
  }

  // --- Ranking ---
  let rank: number | null = null;
  if (media.rankings) {
    const rated = media.rankings.find(
      (r: any) => r.type === 'RATED' && r.allTime
    );
    if (rated) rank = rated.rank;
  }

  // --- Aired dates ---
  const sd = media.startDate;
  const ed = media.endDate;
  let airedFrom = '';
  let airedTo: string | null = null;

  if (sd?.year) {
    const m = String(sd.month || 1).padStart(2, '0');
    const d = String(sd.day || 1).padStart(2, '0');
    airedFrom = `${sd.year}-${m}-${d}T00:00:00+00:00`;
  }
  if (ed?.year) {
    const m = String(ed.month || 1).padStart(2, '0');
    const d = String(ed.day || 1).padStart(2, '0');
    airedTo = `${ed.year}-${m}-${d}T00:00:00+00:00`;
  }

  return {
    // IDs
    mal_id: media.idMal || media.id,
    url: media.idMal
      ? `https://myanimelist.net/anime/${media.idMal}`
      : `https://anilist.co/anime/${media.id}`,

    // Images
    images: {
      jpg: { image_url: smallImg, large_image_url: largeImg },
      webp: { image_url: smallImg, large_image_url: largeImg },
    },

    // Titles
    title:
      media.title?.romaji ||
      media.title?.userPreferred ||
      media.title?.english ||
      '',
    title_english:
      media.title?.english ||
      media.title?.userPreferred ||
      media.title?.romaji ||
      '',
    title_japanese: media.title?.native || '',
    title_synonyms: [],

    // Classification
    type: FORMAT_MAP[media.format] || media.format || 'Unknown',
    source: SOURCE_MAP[media.source] || media.source || 'Unknown',
    episodes: media.episodes || null,
    status: STATUS_MAP[media.status] || media.status || 'Unknown',
    airing: media.status === 'RELEASING',
    aired: {
      from: airedFrom,
      to: airedTo,
      string: airedFrom
        ? `${airedFrom.substring(0, 10)} to ${airedTo ? airedTo.substring(0, 10) : '?'}`
        : 'Not available',
    },
    duration: formatDuration(media.duration),
    rating: media.isAdult ? 'Rx - Hentai' : null,

    // Scores & popularity
    score: media.averageScore != null
      ? Math.round(media.averageScore) / 10
      : null,
    scored_by: media.popularity || null,
    rank,
    popularity: media.popularity || 0,
    members: media.popularity || 0,
    favorites: media.favourites || 0,

    // Content
    synopsis: stripHtml(media.description) || '',
    background: '',
    season: media.season
      ? SEASON_MAP[media.season] || media.season.toLowerCase()
      : null,
    year: media.seasonYear || null,

    // Broadcast (not available from AniList for non-schedule queries)
    broadcast: { day: null, time: null, timezone: null, string: null },

    // Related entities
    producers: [],
    licensors: [],
    studios: (media.studios?.nodes || []).map((s: any) => ({
      mal_id: 0,
      type: 'anime',
      name: s.name,
      url: '',
    })),
    genres: (media.genres || []).map((name: string) => ({ name })),
    explicit_genres: [],
    themes: [],
    demographics: [],
    trailer,
  };
}

// ---------------------------------------------------------------------------
// Page-level normalizer
// ---------------------------------------------------------------------------

/**
 * Normalize an AniList `Page` response into the `JikanResponse<Anime[]>` shape
 * that all list/grid views expect.
 *
 * Entries without a MAL ID (`idMal`) are filtered out to maintain
 * Supabase compatibility (all stored anime_ids are MAL IDs).
 */
export function normalizeMediaPage(
  pageData: any,
  currentPage: number
): any {
  const page = pageData?.Page;
  if (!page) {
    return {
      data: [],
      pagination: {
        last_visible_page: 1,
        has_next_page: false,
        current_page: currentPage,
        items: { count: 0, total: 0, per_page: 25 },
      },
    };
  }

  const mediaList = (page.media || [])
    .filter((m: any) => m != null && m.idMal != null) // keep MAL-mapped only
    .map(normalizeMedia);

  const pi = page.pageInfo || {};

  return {
    data: mediaList,
    pagination: {
      last_visible_page: pi.lastPage || 1,
      has_next_page: pi.hasNextPage ?? false,
      current_page: currentPage,
      items: {
        count: mediaList.length,
        total: pi.total || mediaList.length,
        per_page: pi.perPage || 25,
      },
    },
  };
}
