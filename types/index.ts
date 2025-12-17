export interface Profile {
  id: string;
  username: string | null;
  avatar_url: string | null;
  level: number;
  member_since: string;
}

export interface UserAnimeStats {
  watched_count: number;
  favorites_count: number;
  days_watched: number;
}

export interface AnimeListItem {
  id: string;
  anime_id: string;
  anime_title: string;
  anime_image: string;
  status: 'watching' | 'completed' | 'plan_to_watch' | 'dropped';
  is_favorite: boolean;
  current_episode: number;
  total_episodes: number;
}
