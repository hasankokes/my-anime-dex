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
