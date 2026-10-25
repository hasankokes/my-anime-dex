import { DiscoverItem, DiscoverReason } from '../../services/recommendationService';

type T = (key: string, options?: any) => string;

/** i18n key for an AniList genre name ("Slice of Life" → "sliceOfLife") */
const genreKey = (name: string) =>
  name
    .replace(/[^A-Za-z ]/g, ' ')
    .trim()
    .split(/\s+/)
    .map((w, i) => (i === 0 ? w.toLowerCase() : w[0].toUpperCase() + w.slice(1).toLowerCase()))
    .join('');

export const genreLabel = (t: T, name: string) =>
  t(`discover.genres.${genreKey(name)}`, { defaultValue: name });

export function reasonText(t: T, r: DiscoverReason): string {
  switch (r.type) {
    case 'because':
      return r.extra > 0
        ? t('discover.reasons.becauseMore', { title: r.title, count: r.extra })
        : t('discover.reasons.because', { title: r.title });
    case 'themes':
      return t('discover.reasons.themes', { tags: r.tags.join(', ') });
    case 'genres':
      return t('discover.reasons.genres', { genres: r.genres.map(g => genreLabel(t, g)).join(', ') });
    case 'gem':
      return t('discover.reasons.gem');
    case 'trending':
      return t('discover.reasons.trending');
    case 'topRated':
      return t('discover.reasons.topRated');
    case 'sequel':
      return t('discover.sequelTo', { title: r.title });
    case 'rated':
      return r.titles.length > 1
        ? t('smartRecs.reasons.ratedTwo', { a: r.titles[0], b: r.titles[1] })
        : t('smartRecs.reasons.ratedOne', { title: r.titles[0] });
    case 'studio':
      return t('smartRecs.reasons.studio', { studio: r.name });
  }
}

export const reasonIcon = (r: DiscoverReason): string => {
  switch (r.type) {
    case 'because': return 'heart';
    case 'themes': return 'pricetags';
    case 'genres': return 'color-palette';
    case 'gem': return 'diamond';
    case 'trending': return 'trending-up';
    case 'topRated': return 'trophy';
    case 'sequel': return 'play-forward';
    case 'rated': return 'star';
    case 'studio': return 'business';
  }
};

/** "TV · 2019 · 24 ep" */
export function metaLine(t: T, item: DiscoverItem): string {
  const parts: string[] = [];
  if (item.format) parts.push(t(`discover.formats.${item.format}`, { defaultValue: item.format }));
  if (item.seasonYear) parts.push(String(item.seasonYear));
  if (item.episodes && item.format !== 'MOVIE') parts.push(t('discover.episodes', { count: item.episodes }));
  if (item.status === 'RELEASING') parts.push(t('discover.filters.airing'));
  return parts.join(' · ');
}
