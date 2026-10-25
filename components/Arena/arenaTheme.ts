// Shared data + visual tokens for the Anime Arena screens (app/arena).

export interface ArenaCategory {
  id: string;
  icon: string;
  color: string;
  gradient: readonly [string, string];
  labelKey: string;
}

export const ARENA_CATEGORIES: ArenaCategory[] = [
  { id: 'all_time_anime', icon: 'trophy', color: '#FACC15', gradient: ['#FACC15', '#F59E0B'], labelKey: 'arena.cat_all_time' },
  { id: 'best_opening', icon: 'musical-notes', color: '#14B8A6', gradient: ['#14B8A6', '#0F766E'], labelKey: 'arena.cat_best_opening' },
  { id: 'best_villain', icon: 'eye', color: '#B91C1C', gradient: ['#B91C1C', '#450A0A'], labelKey: 'arena.cat_best_villain' },
  { id: 'strongest_character', icon: 'barbell', color: '#EAB308', gradient: ['#EAB308', '#A16207'], labelKey: 'arena.cat_strongest' },
  { id: 'saddest_anime', icon: 'water', color: '#0EA5E9', gradient: ['#0EA5E9', '#0369A1'], labelKey: 'arena.cat_saddest' },
  { id: 'hidden_gems', icon: 'diamond', color: '#22D3EE', gradient: ['#22D3EE', '#0891B2'], labelKey: 'arena.cat_hidden_gems' },
  { id: 'cutest_mascot', icon: 'paw', color: '#FB923C', gradient: ['#FB923C', '#EA580C'], labelKey: 'arena.cat_mascot' },
  { id: 'sports_anime', icon: 'football', color: '#84CC16', gradient: ['#84CC16', '#4D7C0F'], labelKey: 'arena.cat_sports' },
  { id: 'movie_anime', icon: 'film', color: '#8B5CF6', gradient: ['#8B5CF6', '#6D28D9'], labelKey: 'arena.cat_movie' },
  { id: 'shounen_anime', icon: 'flame', color: '#EF4444', gradient: ['#EF4444', '#B91C1C'], labelKey: 'arena.cat_shounen' },
  { id: 'action_anime', icon: 'flash', color: '#F97316', gradient: ['#F97316', '#C2410C'], labelKey: 'arena.cat_action' },
  { id: 'isekai', icon: 'planet', color: '#10B981', gradient: ['#10B981', '#047857'], labelKey: 'arena.cat_isekai' },
  { id: 'romance', icon: 'heart', color: '#EC4899', gradient: ['#EC4899', '#BE185D'], labelKey: 'arena.cat_romance' },
  { id: 'comedy_anime', icon: 'happy', color: '#F59E0B', gradient: ['#F59E0B', '#B45309'], labelKey: 'arena.cat_comedy' },
  { id: 'horror_anime', icon: 'skull', color: '#6366F1', gradient: ['#6366F1', '#4338CA'], labelKey: 'arena.cat_horror' },
  { id: 'drama_anime', icon: 'rainy', color: '#06B6D4', gradient: ['#06B6D4', '#0E7490'], labelKey: 'arena.cat_drama' },
  { id: 'seinen_anime', icon: 'moon', color: '#A855F7', gradient: ['#A855F7', '#7E22CE'], labelKey: 'arena.cat_seinen' },
  { id: 'worst_sequels', icon: 'thumbs-down', color: '#DC2626', gradient: ['#DC2626', '#991B1B'], labelKey: 'arena.cat_worst_sequels' },
  { id: 'waifu', icon: 'rose', color: '#F43F5E', gradient: ['#F43F5E', '#BE123C'], labelKey: 'arena.cat_waifu' },
  { id: 'husbando', icon: 'sparkles', color: '#3B82F6', gradient: ['#3B82F6', '#1D4ED8'], labelKey: 'arena.cat_husbando' },
];

export const ARENA_SIZES = [
  { size: 8, labelKey: 'arena.size_quick' },
  { size: 16, labelKey: 'arena.size_classic' },
  { size: 32, labelKey: 'arena.size_epic' },
] as const;

export const getArenaCategory = (id?: string | null): ArenaCategory =>
  ARENA_CATEGORIES.find(c => c.id === id) || ARENA_CATEGORIES[0];

// Arena screens are always dark ("stage lights"), but the surrounding chrome follows the theme.
export const ARENA_GOLD = '#FACC15';
export const ARENA_GOLD_DEEP = '#F59E0B';

export const getRoundLabel = (remaining: number, t: (k: string) => string) => {
  if (remaining === 2) return t('arena.final');
  if (remaining === 4) return t('arena.semi_final');
  if (remaining === 8) return t('arena.quarter_final');
  return `${t('arena.round')} ${remaining}`;
};
