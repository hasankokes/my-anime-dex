/**
 * AniList GraphQL Query Definitions
 *
 * All queries used by the app are centralised here.
 * Field sets are split into LIST (lightweight) and DETAIL (full) versions
 * to minimise payload for paginated browse/search operations.
 */

// ---------------------------------------------------------------------------
// Field fragments (template-literal interpolation into queries below)
// ---------------------------------------------------------------------------

/** Minimal fields for grid/list views */
const MEDIA_LIST_FIELDS = `
  id
  idMal
  title {
    romaji
    english
    native
    userPreferred
  }
  coverImage {
    extraLarge
    large
    medium
  }
  format
  episodes
  status
  season
  seasonYear
  averageScore
  popularity
  genres
  isAdult
  description(asHtml: false)
  trailer {
    id
    site
    thumbnail
  }
`;

/** Extended fields for the anime detail screen */
const MEDIA_DETAIL_FIELDS = `
  id
  idMal
  title {
    romaji
    english
    native
    userPreferred
  }
  coverImage {
    extraLarge
    large
    medium
  }
  bannerImage
  format
  source
  episodes
  duration
  status
  season
  seasonYear
  averageScore
  meanScore
  popularity
  favourites
  rankings {
    rank
    type
    allTime
  }
  description(asHtml: false)
  genres
  isAdult
  trailer {
    id
    site
    thumbnail
  }
  startDate {
    year
    month
    day
  }
  endDate {
    year
    month
    day
  }
  studios(isMain: true) {
    nodes {
      name
    }
  }
`;

// ---------------------------------------------------------------------------
// Page query — flexible, covers search / browse / season / genre / top / etc.
// ---------------------------------------------------------------------------

export const ANIME_PAGE_QUERY = `
query (
  $page: Int,
  $perPage: Int,
  $search: String,
  $genre_in: [String],
  $status: MediaStatus,
  $season: MediaSeason,
  $seasonYear: Int,
  $sort: [MediaSort],
  $isAdult: Boolean,
  $averageScore_greater: Int
) {
  Page(page: $page, perPage: $perPage) {
    pageInfo {
      hasNextPage
      lastPage
      total
      currentPage
      perPage
    }
    media(
      type: ANIME
      search: $search
      genre_in: $genre_in
      status: $status
      season: $season
      seasonYear: $seasonYear
      sort: $sort
      isAdult: $isAdult
      averageScore_greater: $averageScore_greater
    ) {
      ${MEDIA_LIST_FIELDS}
    }
  }
}
`;

// ---------------------------------------------------------------------------
// Detail queries — single anime by MAL ID or AniList ID
// ---------------------------------------------------------------------------

export const ANIME_DETAIL_QUERY = `
query ($idMal: Int) {
  Media(idMal: $idMal, type: ANIME) {
    ${MEDIA_DETAIL_FIELDS}
  }
}
`;

export const ANIME_DETAIL_BY_ID_QUERY = `
query ($id: Int) {
  Media(id: $id, type: ANIME) {
    ${MEDIA_DETAIL_FIELDS}
  }
}
`;

// ---------------------------------------------------------------------------
// Character query — used for profile avatar picker
// ---------------------------------------------------------------------------

export const CHARACTER_PAGE_QUERY = `
query ($page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    pageInfo {
      hasNextPage
    }
    characters(sort: FAVOURITES_DESC) {
      id
      name {
        full
        native
        userPreferred
      }
      image {
        large
        medium
      }
    }
  }
}
`;

// ---------------------------------------------------------------------------
// Discover (recommendations) — taste seeds + candidate buckets
// ---------------------------------------------------------------------------

/** Fields used to score and display a discovery candidate */
export const DISCOVER_MEDIA_FIELDS = `
  id
  idMal
  title {
    romaji
    english
    userPreferred
  }
  coverImage {
    extraLarge
    large
  }
  format
  status
  episodes
  seasonYear
  averageScore
  popularity
  genres
  isAdult
  tags {
    name
    rank
    category
    isMediaSpoiler
    isAdult
  }
  relations {
    edges {
      relationType
      node {
        id
        type
        format
        seasonYear
      }
    }
  }
`;

/** Fields of a seed's related entries (for "continue the story") */
const DISCOVER_RELATION_NODE_FIELDS = `
  id
  idMal
  type
  title {
    romaji
    english
    userPreferred
  }
  coverImage {
    extraLarge
    large
  }
  format
  status
  episodes
  seasonYear
  averageScore
  popularity
  genres
  isAdult
`;

const DISCOVER_SEED_FIELDS = `
  id
  idMal
  title {
    romaji
    english
    userPreferred
  }
  genres
  tags {
    name
    rank
    category
    isMediaSpoiler
    isAdult
  }
  relations {
    edges {
      relationType
      node {
        ${DISCOVER_RELATION_NODE_FIELDS}
      }
    }
  }
  recommendations(perPage: 8, sort: [RATING_DESC]) {
    nodes {
      rating
      mediaRecommendation {
        ${DISCOVER_MEDIA_FIELDS}
      }
    }
  }
`;

/** The user's list entries (taste seeds) by MAL ID, with community recommendations */
export const DISCOVER_SEEDS_BY_MAL_QUERY = `
query ($ids: [Int]) {
  Page(perPage: 50) {
    media(idMal_in: $ids, type: ANIME) {
      ${DISCOVER_SEED_FIELDS}
    }
  }
}
`;

/** Same as above, for list entries stored with an AniList ID (no MAL ID) */
export const DISCOVER_SEEDS_BY_ID_QUERY = `
query ($ids: [Int]) {
  Page(perPage: 50) {
    media(id_in: $ids, type: ANIME) {
      ${DISCOVER_SEED_FIELDS}
    }
  }
}
`;

/** Stats/filter metadata for a batch of list entries, looked up by MAL id */
export const LIST_METADATA_BY_MAL_QUERY = `
  query ($ids: [Int]) {
    Page(perPage: 50) {
      media(idMal_in: $ids, type: ANIME) {
        id
        idMal
        genres
        seasonYear
        format
        studios(isMain: true) { nodes { name } }
      }
    }
  }
`;

/** Same as LIST_METADATA_BY_MAL_QUERY for entries stored under their AniList id */
export const LIST_METADATA_BY_ID_QUERY = `
  query ($ids: [Int]) {
    Page(perPage: 50) {
      media(id_in: $ids, type: ANIME) {
        id
        idMal
        genres
        seasonYear
        format
        studios(isMain: true) { nodes { name } }
      }
    }
  }
`;

/** Premium season picks: this season's anime with the fields Discover scores on, plus studios */
export const SEASON_PICKS_QUERY = `
  query ($season: MediaSeason, $seasonYear: Int) {
    Page(perPage: 50) {
      media(season: $season, seasonYear: $seasonYear, type: ANIME, isAdult: false, format_in: [TV, TV_SHORT, ONA, MOVIE], sort: [POPULARITY_DESC]) {
        ${DISCOVER_MEDIA_FIELDS}
        studios(isMain: true) { nodes { name } }
      }
    }
  }
`;

/** MAL import: list entries resolved by MAL id (title, cover and the cached list metadata) */
export const IMPORT_MEDIA_BY_MAL_QUERY = `
  query ($ids: [Int]) {
    Page(perPage: 50) {
      media(idMal_in: $ids, type: ANIME) {
        id
        idMal
        title { romaji english userPreferred }
        coverImage { extraLarge large }
        episodes
        averageScore
        genres
        seasonYear
        format
        studios(isMain: true) { nodes { name } }
      }
    }
  }
`;

/** AniList import: a user's whole anime list by username (public lists only) */
export const IMPORT_ANILIST_USER_QUERY = `
  query ($userName: String) {
    MediaListCollection(userName: $userName, type: ANIME) {
      lists {
        entries {
          status
          score(format: POINT_10)
          progress
          startedAt { year month day }
          completedAt { year month day }
          media {
            id
            idMal
            title { romaji english userPreferred }
            coverImage { extraLarge large }
            episodes
            averageScore
            genres
            seasonYear
            format
            studios(isMain: true) { nodes { name } }
          }
        }
      }
    }
  }
`;
