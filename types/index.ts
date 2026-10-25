export interface Profile {
  id: string;
  username: string | null;
  avatar_url: string | null;
  level: number;
  xp?: number;
  member_since: string;
  is_pro?: boolean;
  /** Premium profile stats card settings: { enabled, items } */
  stats_card?: unknown;
  pro_expires_at?: string | null;
  /** Premium personalization picks and Top 10 (see lib/cosmetics.ts) */
  cosmetics?: unknown;
  top10?: unknown;
}

export interface UserAnimeStats {
  watched_count: number;
  watching_count: number;
  favorites_count: number;
  days_watched: number;
}

export interface AnimeListItem {
  id: string;
  anime_id: string;
  anime_title: string;
  anime_image: string;
  status: 'watching' | 'completed' | 'plan_to_watch' | 'dropped' | 'paused';
  is_favorite: boolean;
  current_episode: number;
  total_episodes: number;
  /** AniList community score, 0-10 */
  score: number | null;
  /** Cached anime metadata (NULL until fetched, see lib/animeMetadata.ts) */
  genres?: string[] | null;
  studios?: string[] | null;
  season_year?: number | null;
  format?: string | null;
  /** Premium: personal tags and note */
  tags?: string[];
  notes?: string | null;
}
