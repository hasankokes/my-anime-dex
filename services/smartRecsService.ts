/**
 * Premium smart recommendations (Module 3): "don't recommend" feedback and the season selection.
 * The "For you" list itself is recommendationService.getDiscover({ smart }) — same engine as
 * the free Discover, with the premium signals switched on.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { fetchGraphQL } from './anilist/client';
import { SEASON_PICKS_QUERY } from './anilist/queries';
import { getCurrentSeason } from './anilist/api';
import {
  DiscoverItem,
  DiscoverReason,
  RejectedItem,
  recommendationService,
  toItem,
  usableTags,
} from './recommendationService';

const SEASON_CACHE_MS = 6 * 60 * 60 * 1000;
const SEASON_LIMIT = 20;

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

// --- "Don't recommend this" ---------------------------------------------------

export const smartRecsService = {
  async getRejected(userId: string): Promise<RejectedItem[]> {
    const { data, error } = await supabase
      .from('rec_feedback')
      .select('anime_id, anilist_id, title, genres, tags')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(r => ({
      key: r.anime_id,
      anilistId: r.anilist_id,
      title: r.title,
      genres: r.genres ?? [],
      tags: r.tags ?? [],
    }));
  },

  async reject(userId: string, item: DiscoverItem): Promise<RejectedItem> {
    const rejected: RejectedItem = {
      key: item.key,
      anilistId: item.anilistId,
      title: (item.anime.title_english || item.anime.title || '').slice(0, 300),
      genres: (item.anime.genres ?? []).map(g => g.name).slice(0, 20),
      tags: (item.tagNames ?? []).slice(0, 20),
    };
    const { error } = await supabase.from('rec_feedback').upsert({
      user_id: userId,
      anime_id: rejected.key,
      anilist_id: rejected.anilistId,
      title: rejected.title,
      genres: rejected.genres,
      tags: rejected.tags,
    }, { onConflict: 'user_id,anime_id', ignoreDuplicates: true });
    if (error) throw error;
    recommendationService.clearCache();
    return rejected;
  },

  async clearRejected(userId: string): Promise<void> {
    const { error } = await supabase.from('rec_feedback').delete().eq('user_id', userId);
    if (error) throw error;
    recommendationService.clearCache();
  },

  // --- Season selection --------------------------------------------------------

  /**
   * This season's anime ranked for the user: AniList recommendations from their list,
   * genre/theme taste, and studios they have watched. 1 AniList request, cached 6 h for everyone.
   */
  async getSeasonPicks(userId: string, rejected: RejectedItem[]): Promise<DiscoverItem[]> {
    const { season, year } = getCurrentSeason();
    const cacheKey = `season_picks_media_${season}_${year}`;

    let media: any[] | null = null;
    try {
      const raw = await AsyncStorage.getItem(cacheKey);
      if (raw) {
        const cached = JSON.parse(raw);
        if (Date.now() - cached.at < SEASON_CACHE_MS) media = cached.media;
      }
    } catch { /* ignore */ }
    if (!media) {
      const data = await fetchGraphQL<any>(SEASON_PICKS_QUERY, { season, seasonYear: year }, {
        cacheKey, cacheDuration: SEASON_CACHE_MS,
      });
      media = data?.Page?.media ?? [];
      AsyncStorage.setItem(cacheKey, JSON.stringify({ at: Date.now(), media })).catch(() => { });
    }

    const [taste, studioRows] = await Promise.all([
      recommendationService.getTasteContext(userId),
      supabase
        .from('user_anime_list')
        .select('studios, status')
        .eq('user_id', userId)
        .in('status', ['completed', 'watching']),
    ]);

    // Studio taste: share of the user's watched anime per main studio
    const studioCount = new Map<string, number>();
    let watched = 0;
    for (const row of studioRows.data ?? []) {
      if (!row.studios?.length) continue;
      watched += 1;
      for (const s of new Set<string>(row.studios)) studioCount.set(s, (studioCount.get(s) ?? 0) + 1);
    }

    const listKeys = new Set(taste.rows.map(r => String(r.anime_id)));
    const rejectedKeys = new Set(rejected.map(r => r.key));
    const positiveSeeds = taste.seeds.filter(sd => sd.weight > 0);

    const scored = (media ?? [])
      .filter(m => !listKeys.has(String(m.idMal)) && !listKeys.has(String(m.id)) && !rejectedKeys.has(String(m.idMal || m.id)))
      .map(m => {
        const genres: string[] = m.genres || [];
        const tags = usableTags(m);
        const gSim = genres.length ? genres.reduce((s, g) => s + Math.max(0, taste.genreShare[g] || 0), 0) / Math.sqrt(genres.length * 2) : 0;
        const tSim = tags.reduce((s, t) => s + Math.max(0, taste.tagShare[t.name] || 0) * (t.rank / 100), 0) / 1.5;
        const content = clamp01(0.55 * clamp01(gSim) + 0.45 * clamp01(tSim));

        const studios: string[] = (m.studios?.nodes || []).map((n: any) => n.name);
        const topStudio = studios
          .map(name => ({ name, share: watched ? (studioCount.get(name) ?? 0) / watched : 0 }))
          .sort((a, b) => b.share - a.share)[0];
        const studioSim = clamp01((topStudio?.share ?? 0) * 3);

        // AniList "people who liked X also liked this" from the user's list
        const sources = positiveSeeds
          .map(sd => ({ sd, votes: sd.recommendationIds.get(m.id) ?? 0 }))
          .filter(x => x.votes > 0)
          .sort((a, b) => b.votes * b.sd.weight - a.votes * a.sd.weight);
        const cf = clamp01(sources.reduce((s, x) => s + x.sd.weight * (x.votes / (x.votes + 20)), 0));

        const quality = m.averageScore != null ? clamp01((m.averageScore - 55) / 35) : 0.4;
        const score = 0.4 * content + 0.25 * cf + 0.2 * studioSim + 0.15 * quality;

        const reasons: DiscoverReason[] = [];
        if (sources.length) {
          const rated = sources.filter(x => (x.sd.rating ?? 0) >= 4).map(x => x.sd.title);
          reasons.push(rated.length
            ? { type: 'rated', titles: rated.slice(0, 2) }
            : { type: 'because', title: sources[0].sd.title, extra: sources.length - 1 });
        }
        if (topStudio && topStudio.share >= 0.1) reasons.push({ type: 'studio', name: topStudio.name });
        else if (genres.some(g => (taste.genreShare[g] || 0) > 0)) {
          reasons.push({
            type: 'genres',
            genres: genres.filter(g => (taste.genreShare[g] || 0) > 0)
              .sort((a, b) => (taste.genreShare[b] || 0) - (taste.genreShare[a] || 0))
              .slice(0, 2),
          });
        }
        return { m, score, reasons };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, SEASON_LIMIT);

    const max = scored[0]?.score || 1;
    return scored.map(({ m, score, reasons }) =>
      toItem(m, Math.round(55 + 44 * (score / max)), reasons.slice(0, 2)),
    );
  },
};
