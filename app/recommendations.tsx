import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Modal,
  Pressable,
  RefreshControl,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { upperCase } from '../lib/textCase';
import { useAuth } from '../context/AuthProvider';
import { useRequireAuth } from '../hooks/useRequireAuth';
import { supabase } from '../lib/supabase';
import { analytics } from '../lib/analytics';
import {
  recommendationService,
  DiscoverItem,
  DiscoverResult,
  isHiddenGem,
  countSmartFilters,
  EMPTY_SMART_FILTERS,
  RejectedItem,
  SmartFilters,
} from '../services/recommendationService';
import { smartRecsService } from '../services/smartRecsService';
import { useFeature } from '../hooks/usePremium';
import { useAppConfig } from '../context/AppConfigProvider';
import { PremiumGate } from '../components/Premium/PremiumGate';
import { SmartFilterSheet } from '../components/Discover/SmartFilterSheet';
import { ContentCardSlot } from '../components/ContentCard/ContentCardSlot';
import { DiscoverCard } from '../components/Discover/DiscoverCard';
import { GenrePicker } from '../components/Discover/GenrePicker';
import { genreLabel, reasonText } from '../components/Discover/discoverText';

type Filter = 'all' | 'airing' | 'movie' | 'short' | 'gems' | 'new';
/** Discover is free; "For you+" and the season selection are the premium layer (Module 3) */
type Tab = 'discover' | 'smart' | 'season';
const TABS: Tab[] = ['discover', 'smart', 'season'];
const FILTERS: Filter[] = ['all', 'airing', 'movie', 'short', 'gems', 'new'];
const PAGE_SIZE = 15;

const matchesFilter = (item: DiscoverItem, filter: Filter) => {
  switch (filter) {
    case 'airing':
      return item.status === 'RELEASING';
    case 'movie':
      return item.format === 'MOVIE';
    case 'short':
      return item.format !== 'MOVIE' && item.episodes != null && item.episodes <= 13;
    case 'gems':
      return isHiddenGem(item);
    case 'new':
      return (item.seasonYear ?? 0) >= new Date().getFullYear() - 2;
    default:
      return true;
  }
};

export default function DiscoverScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { t, language } = useLanguage();
  const { session } = useAuth();
  const requireAuth = useRequireAuth();
  const userId = session?.user.id ?? null;

  const [result, setResult] = useState<DiscoverResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [hiddenCount, setHiddenCount] = useState(0);
  const [showTip, setShowTip] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [draftGenres, setDraftGenres] = useState<string[]>([]);
  const loadedRef = useRef(false);

  // --- Premium layer ---------------------------------------------------------
  const smartFeature = useFeature('premium_smart_recs');
  const { config } = useAppConfig();
  const [tab, setTab] = useState<Tab>('discover');
  const [smartResult, setSmartResult] = useState<DiscoverResult | null>(null);
  const [smartLoading, setSmartLoading] = useState(false);
  const [smartError, setSmartError] = useState(false);
  const [smartFilters, setSmartFilters] = useState<SmartFilters>(EMPTY_SMART_FILTERS);
  const [rejected, setRejected] = useState<RejectedItem[]>([]);
  const [seasonItems, setSeasonItems] = useState<DiscoverItem[] | null>(null);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const premiumActive = smartFeature.enabled && !smartFeature.locked && !!userId;

  const load = useCallback(async (force = false) => {
    try {
      setError(null);
      if (!force) setLoading(true);
      const [res, hidden] = await Promise.all([
        recommendationService.getDiscover({ userId, force }),
        recommendationService.getHidden(userId),
      ]);
      setResult(res);
      setHiddenCount(hidden.length);
      setVisible(PAGE_SIZE);
      if (!loadedRef.current || force) {
        loadedRef.current = true;
        analytics.track('discover_loaded', {
          mode: res.mode,
          items: res.items.length,
          continue_items: res.continueItems.length,
          seeds: res.profile.seedCount,
        });
      }
    } catch (e: any) {
      console.error('[Discover] load failed:', e);
      setError(e?.message || 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const loadSmart = useCallback(async (force = false, filters: SmartFilters = smartFilters) => {
    if (!userId) return;
    setSmartLoading(true);
    setSmartError(false);
    try {
      const rej = await smartRecsService.getRejected(userId);
      setRejected(rej);
      const res = await recommendationService.getDiscover({ userId, force, smart: { filters, rejected: rej } });
      setSmartResult(res);
      analytics.track('smart_recs_loaded', { items: res.items.length, rated: res.ratedCount, filters: countSmartFilters(filters) });
    } catch (e) {
      console.error('[Discover] smart load failed:', e);
      setSmartError(true);
    } finally {
      setSmartLoading(false);
    }
  }, [userId, smartFilters]);

  const loadSeason = useCallback(async () => {
    if (!userId) return;
    setSmartLoading(true);
    setSmartError(false);
    try {
      const rej = await smartRecsService.getRejected(userId);
      setRejected(rej);
      const items = await smartRecsService.getSeasonPicks(userId, rej);
      setSeasonItems(items);
      analytics.track('season_picks_loaded', { items: items.length });
    } catch (e) {
      console.error('[Discover] season picks failed:', e);
      setSmartError(true);
    } finally {
      setSmartLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!premiumActive) return;
    if (tab === 'smart' && !smartResult) loadSmart();
    if (tab === 'season' && !seasonItems) loadSeason();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, premiumActive]);

  const changeTab = (next: Tab) => {
    setTab(next);
    analytics.track('discover_tab_changed', { tab: next, locked: smartFeature.locked });
  };

  const applySmartFilters = (filters: SmartFilters) => {
    setSmartFilters(filters);
    loadSmart(false, filters);
  };

  const reject = async (item: DiscoverItem, position: number) => {
    if (!userId) return;
    setSmartResult(prev => (prev ? { ...prev, items: prev.items.filter(i => i.key !== item.key) } : prev));
    setSeasonItems(prev => (prev ? prev.filter(i => i.key !== item.key) : prev));
    try {
      const added = await smartRecsService.reject(userId, item);
      setRejected(prev => [added, ...prev.filter(r => r.key !== added.key)]);
      analytics.track('smart_rec_rejected', { position, tab });
    } catch (e) {
      console.error('[Discover] reject failed:', e);
      Alert.alert(t('common.error', { defaultValue: 'Error' }), t('listTools.saveError'));
    }
  };

  const clearRejected = async () => {
    if (!userId) return;
    try {
      await smartRecsService.clearRejected(userId);
      setRejected([]);
      if (tab === 'smart') loadSmart(true);
      else loadSeason();
    } catch (e) {
      console.error('[Discover] clear rejected failed:', e);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    load(true);
  };

  const filtered = useMemo(
    () => (result?.items || []).filter(i => matchesFilter(i, filter)),
    [result, filter]
  );

  // --- Actions -------------------------------------------------------------

  const openAnime = (item: DiscoverItem, position: number, section: 'list' | 'continue') => {
    analytics.track('discover_item_clicked', {
      position,
      section,
      reason: item.reasons[0]?.type,
      match: item.match,
      filter,
    });
    router.push(`/anime/${item.key}`);
  };

  const saveToPlan = (item: DiscoverItem, position: number) => {
    requireAuth('list', async () => {
      const { data: { session: current } } = await supabase.auth.getSession();
      if (!current) return;
      setSaved(prev => new Set(prev).add(item.key));
      const { anime } = item;
      const { error: saveError } = await supabase.from('user_anime_list').upsert(
        {
          user_id: current.user.id,
          anime_id: item.key,
          anime_title: anime.title_english || anime.title,
          anime_image: anime.images?.jpg?.large_image_url,
          status: 'plan_to_watch',
          is_favorite: true,
          total_episodes: anime.episodes || 0,
          current_episode: 0,
          score: anime.score,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id, anime_id', ignoreDuplicates: true }
      );
      if (saveError) {
        console.error('[Discover] save failed:', saveError);
        setSaved(prev => {
          const next = new Set(prev);
          next.delete(item.key);
          return next;
        });
        Alert.alert(t('common.error', { defaultValue: 'Error' }), t('discover.saveError'));
        return;
      }
      recommendationService.clearCache();
      analytics.track('discover_item_saved', { position, reason: item.reasons[0]?.type, match: item.match });
      analytics.track('anime_list_status_changed', { anime_id: item.key, from: null, to: 'plan_to_watch' });
    });
  };

  const hide = async (item: DiscoverItem, position: number) => {
    setResult(prev => (prev ? { ...prev, items: prev.items.filter(i => i.key !== item.key) } : prev));
    const hidden = await recommendationService.hide(userId, item.key);
    setHiddenCount(hidden.length);
    analytics.track('discover_item_hidden', { position, reason: item.reasons[0]?.type });
  };

  const restoreHidden = async () => {
    await recommendationService.clearHidden(userId);
    setHiddenCount(0);
    load(true);
  };

  const openPicker = () => {
    setDraftGenres(result?.profile.pickedGenres || []);
    setPickerOpen(true);
  };

  const saveGenres = async (genres: string[]) => {
    setPickerOpen(false);
    await recommendationService.setPickedGenres(userId, genres);
    analytics.track('discover_genres_saved', { count: genres.length });
    load(true);
  };

  const changeFilter = (f: Filter) => {
    setFilter(f);
    setVisible(PAGE_SIZE);
    analytics.track('discover_filter_changed', { filter: f });
  };

  // --- Header sections -----------------------------------------------------

  const renderTasteCard = () => {
    if (!result) return null;
    const { profile, mode } = result;

    // Nothing to go on yet: ask for genres right on the page
    if (mode === 'popular') {
      return (
        <View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.panelHeader}>
            <Ionicons name="sparkles" size={18} color="#FACC15" />
            <Text style={[styles.panelTitle, { color: colors.text }]}>{t('discover.pickTitle')}</Text>
          </View>
          <Text style={[styles.panelSub, { color: colors.subtext }]}>{t('discover.pickSubtitle')}</Text>
          <GenrePicker selected={draftGenres} onChange={setDraftGenres} />
          <TouchableOpacity
            style={[styles.primaryButton, { opacity: draftGenres.length === 0 ? 0.5 : 1 }]}
            disabled={draftGenres.length === 0}
            onPress={() => saveGenres(draftGenres)}
          >
            <Text style={styles.primaryButtonText}>{t('discover.pickSave')}</Text>
          </TouchableOpacity>
          <Text style={[styles.hint, { color: colors.subtext }]}>{t('discover.pickHint')}</Text>
        </View>
      );
    }

    const basedOn =
      mode === 'picks'
        ? t('discover.tasteBasedOnPicks')
        : t('discover.tasteBasedOn', { count: profile.seedCount });

    return (
      <View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.panelHeader}>
          <Ionicons name="finger-print" size={18} color="#FACC15" />
          <Text style={[styles.panelTitle, { color: colors.text, flex: 1 }]}>{t('discover.tasteTitle')}</Text>
          <TouchableOpacity onPress={() => setShowTip(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="information-circle-outline" size={20} color={colors.subtext} />
          </TouchableOpacity>
        </View>
        <Text style={[styles.panelSub, { color: colors.subtext }]}>{basedOn}</Text>

        {profile.genres.slice(0, 5).map(g => (
          <View key={g.name} style={styles.barRow}>
            <Text style={[styles.barLabel, { color: colors.text }]} numberOfLines={1}>{genreLabel(t, g.name)}</Text>
            <View style={[styles.barTrack, { backgroundColor: isDark ? '#374151' : '#F3F4F6' }]}>
              <View style={[styles.barFill, { width: `${Math.max(6, Math.round(g.share * 100))}%` }]} />
            </View>
          </View>
        ))}

        {profile.tags.length > 0 && (
          <>
            <Text style={[styles.themesLabel, { color: colors.subtext }]}>{upperCase(t('discover.tasteThemes'), language)}</Text>
            <View style={styles.themeRow}>
              {profile.tags.slice(0, 6).map(tag => (
                <View key={tag.name} style={[styles.themeChip, { borderColor: colors.border }]}>
                  <Text style={[styles.themeText, { color: colors.text }]}>{tag.name}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        <TouchableOpacity style={[styles.editButton, { borderColor: colors.border }]} onPress={openPicker}>
          <Ionicons name="options-outline" size={15} color={colors.text} />
          <Text style={[styles.editText, { color: colors.text }]}>
            {profile.pickedGenres.length > 0 ? t('discover.editGenres') : t('discover.addGenres')}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderContinue = () => {
    if (!result || result.continueItems.length === 0) return null;
    return (
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('discover.continueTitle')}</Text>
        <Text style={[styles.sectionSub, { color: colors.subtext }]}>{t('discover.continueSub')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.continueRow}>
          {result.continueItems.map((item, i) => (
            <TouchableOpacity key={item.key} style={styles.continueCard} onPress={() => openAnime(item, i, 'continue')} activeOpacity={0.85}>
              <Image
                source={{ uri: item.anime.images?.jpg?.large_image_url }}
                style={[styles.continuePoster, { backgroundColor: colors.card }]}
                contentFit="cover"
                transition={200}
              />
              {item.status === 'NOT_YET_RELEASED' && (
                <View style={styles.soonBadge}>
                  <Text style={styles.soonText}>{t('discover.comingSoon')}</Text>
                </View>
              )}
              <Text style={[styles.continueTitle, { color: colors.text }]} numberOfLines={2}>
                {item.anime.title_english || item.anime.title}
              </Text>
              <Text style={[styles.continueSub, { color: colors.subtext }]} numberOfLines={1}>
                {item.reasons[0] ? reasonText(t, item.reasons[0]) : ''}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderHeader = () => (
    <View>
      <ContentCardSlot placement="discover" style={{ marginBottom: 18 }} />
      {renderTasteCard()}
      {renderContinue()}
      <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 4 }]}>
        {result?.mode === 'popular' ? t('discover.popularHeader') : t('discover.forYouHeader')}
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {FILTERS.map(f => {
          const active = f === filter;
          return (
            <TouchableOpacity
              key={f}
              onPress={() => changeFilter(f)}
              style={[
                styles.filterChip,
                active
                  ? { backgroundColor: '#FACC15', borderColor: '#FACC15' }
                  : { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.filterText, { color: active ? '#000' : colors.text }]}>{t(`discover.filters.${f}`)}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  const renderFooter = () => (
    <View style={styles.footer}>
      {visible < filtered.length && (
        <TouchableOpacity
          style={[styles.moreButton, { borderColor: colors.border, backgroundColor: colors.card }]}
          onPress={() => setVisible(v => v + PAGE_SIZE)}
        >
          <Text style={[styles.moreText, { color: colors.text }]}>{t('discover.showMore')}</Text>
        </TouchableOpacity>
      )}
      {hiddenCount > 0 && (
        <TouchableOpacity onPress={restoreHidden} style={styles.restore}>
          <Ionicons name="eye-outline" size={14} color={colors.subtext} />
          <Text style={[styles.restoreText, { color: colors.subtext }]}>
            {t('discover.hiddenCount', { count: hiddenCount })} · {t('discover.restoreHidden')}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // --- Premium tabs ----------------------------------------------------------

  const renderPremiumTab = () => {
    // Not premium (or a guest): blurred preview of what the tab offers
    if (!premiumActive) {
      const preview = (result?.items || []).slice(0, 3);
      return (
        <ScrollView contentContainerStyle={styles.listContent}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t(`smartRecs.titles.${tab}`)}</Text>
          <Text style={[styles.sectionSub, { color: colors.subtext }]}>{t(`smartRecs.subtitles.${tab}`)}</Text>
          <PremiumGate feature="premium_smart_recs" source={`discover_${tab}`} description={t('smartRecs.locked')}>
            {preview.length ? preview.map(item => (
              <DiscoverCard key={item.key} item={item} saved={false} onPress={() => { }} onSave={() => { }} onHide={() => { }} />
            )) : <View style={{ height: 320 }} />}
          </PremiumGate>
        </ScrollView>
      );
    }

    if (smartLoading && !(tab === 'smart' ? smartResult : seasonItems)) {
      return (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.centerText, { color: colors.subtext }]}>{t('discover.loading')}</Text>
        </View>
      );
    }
    if (smartError && !(tab === 'smart' ? smartResult : seasonItems)) {
      return (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={52} color={colors.subtext} />
          <Text style={[styles.centerText, { color: colors.text }]}>{t('discover.error')}</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={() => (tab === 'smart' ? loadSmart(true) : loadSeason())}>
            <Text style={styles.primaryButtonText}>{t('discover.retry')}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    const minRated = config.smart_recs_min_rated;
    // Not enough ratings to personalise: explain and offer the unrated finished shows
    if (tab === 'smart' && smartResult && smartResult.ratedCount < minRated) {
      return (
        <ScrollView contentContainerStyle={styles.listContent}>
          <View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.panelHeader}>
              <Ionicons name="star-half-outline" size={18} color={colors.primary} />
              <Text style={[styles.panelTitle, { color: colors.text, flex: 1 }]}>{t('smartRecs.needRatingsTitle')}</Text>
            </View>
            <Text style={[styles.panelSub, { color: colors.subtext }]}>
              {t('smartRecs.needRatingsBody', { min: minRated, count: smartResult.ratedCount })}
            </Text>
            <View style={[styles.barTrack, { backgroundColor: colors.inputBg, marginBottom: 12 }]}>
              <View style={[styles.barFill, { backgroundColor: colors.primary, width: `${Math.min(100, (smartResult.ratedCount / Math.max(1, minRated)) * 100)}%` }]} />
            </View>
            {smartResult.unratedCompleted.length > 0 && (
              <>
                <Text style={[styles.themesLabel, { color: colors.subtext }]}>{upperCase(t('smartRecs.rateThese'), language)}</Text>
                {smartResult.unratedCompleted.map(entry => (
                  <TouchableOpacity key={entry.key} style={styles.rateRow} onPress={() => router.push(`/anime/${entry.key}`)}>
                    <Ionicons name="star-outline" size={16} color={colors.primary} />
                    <Text style={[styles.rateTitle, { color: colors.text }]} numberOfLines={1}>{entry.title}</Text>
                    <Ionicons name="chevron-forward" size={16} color={colors.subtext} />
                  </TouchableOpacity>
                ))}
              </>
            )}
            <TouchableOpacity style={[styles.editButton, { borderColor: colors.border }]} onPress={() => loadSmart(true)}>
              <Ionicons name="refresh" size={15} color={colors.text} />
              <Text style={[styles.editText, { color: colors.text }]}>{t('discover.retry')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      );
    }

    const items = (tab === 'smart' ? smartResult?.items : seasonItems) ?? [];
    const activeFilters = countSmartFilters(smartFilters);
    return (
      <FlatList
        data={items}
        keyExtractor={item => item.key}
        renderItem={({ item, index }) => (
          <DiscoverCard
            item={item}
            saved={saved.has(item.key)}
            onPress={() => openAnime(item, index, 'list')}
            onSave={() => saveToPlan(item, index)}
            onHide={() => reject(item, index)}
            showContributors={tab === 'smart'}
            hideLabel={t('smartRecs.dontRecommend')}
          />
        )}
        ListHeaderComponent={
          <View style={styles.smartHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{t(`smartRecs.titles.${tab}`)}</Text>
              <Text style={[styles.sectionSub, { color: colors.subtext }]}>{t(`smartRecs.subtitles.${tab}`)}</Text>
            </View>
            {tab === 'smart' && (
              <TouchableOpacity
                style={[styles.filterChip, activeFilters
                  ? { backgroundColor: colors.primary, borderColor: colors.primary }
                  : { backgroundColor: colors.card, borderColor: colors.border }, styles.smartFilterButton]}
                onPress={() => setFilterSheetOpen(true)}
              >
                <Ionicons name="options-outline" size={14} color={activeFilters ? '#111827' : colors.text} />
                <Text style={[styles.filterText, { color: activeFilters ? '#111827' : colors.text }]}>
                  {activeFilters ? t('smartRecs.filtersCount', { count: activeFilters }) : t('listTools.filtersTitle')}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        }
        ListFooterComponent={
          rejected.length > 0 ? (
            <TouchableOpacity onPress={clearRejected} style={styles.restore}>
              <Ionicons name="refresh-outline" size={14} color={colors.subtext} />
              <Text style={[styles.restoreText, { color: colors.subtext }]}>
                {t('smartRecs.rejectedCount', { count: rejected.length })} · {t('smartRecs.resetRejected')}
              </Text>
            </TouchableOpacity>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyFilter}>
            <Ionicons name="search-outline" size={36} color={colors.subtext} />
            <Text style={[styles.centerText, { color: colors.subtext }]}>
              {activeFilters && tab === 'smart' ? t('discover.emptyFilter') : t('discover.empty')}
            </Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={smartLoading}
            onRefresh={() => (tab === 'smart' ? loadSmart(true) : loadSeason())}
            tintColor={colors.primary}
          />
        }
      />
    );
  };

  // --- Render --------------------------------------------------------------

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('discover.title')}</Text>
        <TouchableOpacity onPress={onRefresh} style={styles.headerButton} disabled={loading || refreshing}>
          <Ionicons name="refresh" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      {smartFeature.enabled && (
        <View style={[styles.tabs, { borderBottomColor: colors.border }]}>
          {TABS.map(key => {
            const active = key === tab;
            return (
              <TouchableOpacity
                key={key}
                onPress={() => changeTab(key)}
                style={[styles.tab, active && { borderBottomColor: colors.primary }]}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
              >
                <Text style={[styles.tabText, { color: active ? colors.text : colors.subtext }]}>{t(`smartRecs.tabs.${key}`)}</Text>
                {key !== 'discover' && smartFeature.locked && <Ionicons name="lock-closed" size={11} color={colors.subtext} />}
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {tab !== 'discover' && smartFeature.enabled ? (
        renderPremiumTab()
      ) : loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#FACC15" />
          <Text style={[styles.centerText, { color: colors.subtext }]}>{t('discover.loading')}</Text>
        </View>
      ) : error && !result ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={52} color={colors.subtext} />
          <Text style={[styles.centerText, { color: colors.text }]}>{t('discover.error')}</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={() => load()}>
            <Text style={styles.primaryButtonText}>{t('discover.retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filtered.slice(0, visible)}
          keyExtractor={item => item.key}
          renderItem={({ item, index }) => (
            <DiscoverCard
              item={item}
              saved={saved.has(item.key)}
              onPress={() => openAnime(item, index, 'list')}
              onSave={() => saveToPlan(item, index)}
              onHide={() => hide(item, index)}
            />
          )}
          ListHeaderComponent={renderHeader()}
          ListFooterComponent={renderFooter()}
          ListEmptyComponent={
            <View style={styles.emptyFilter}>
              <Ionicons name="search-outline" size={36} color={colors.subtext} />
              <Text style={[styles.centerText, { color: colors.subtext }]}>
                {filter === 'all' ? t('discover.empty') : t('discover.emptyFilter')}
              </Text>
            </View>
          }
          onEndReached={() => setVisible(v => (v < filtered.length ? v + PAGE_SIZE : v))}
          onEndReachedThreshold={0.4}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FACC15" />}
        />
      )}

      <SmartFilterSheet
        visible={filterSheetOpen}
        value={smartFilters}
        onApply={applySmartFilters}
        onClose={() => setFilterSheetOpen(false)}
      />

      {/* Genre picker */}
      <Modal visible={pickerOpen} transparent animationType="fade" onRequestClose={() => setPickerOpen(false)}>
        <BlurView intensity={20} tint="dark" style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setPickerOpen(false)} />
          <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.panelTitle, { color: colors.text }]}>{t('discover.pickTitle')}</Text>
            <Text style={[styles.panelSub, { color: colors.subtext }]}>{t('discover.pickSubtitle')}</Text>
            <GenrePicker selected={draftGenres} onChange={setDraftGenres} />
            <View style={styles.sheetActions}>
              <TouchableOpacity style={[styles.secondaryButton, { borderColor: colors.border }]} onPress={() => setDraftGenres([])}>
                <Text style={[styles.secondaryButtonText, { color: colors.text }]}>{t('discover.pickClear')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.primaryButton, { flex: 1, marginTop: 0 }]} onPress={() => saveGenres(draftGenres)}>
                <Text style={styles.primaryButtonText}>{t('discover.pickApply')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </BlurView>
      </Modal>

      {/* How it works */}
      <Modal visible={showTip} transparent animationType="fade" onRequestClose={() => setShowTip(false)}>
        <BlurView intensity={20} tint="dark" style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowTip(false)} />
          <LinearGradient colors={['#F59E0B', '#FACC15']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.tipCard}>
            <View style={styles.tipIcon}>
              <Ionicons name="bulb" size={30} color="#FFF" />
            </View>
            <Text style={styles.tipTitle}>{t('discover.tipTitle')}</Text>
            <Text style={styles.tipBody}>{t('discover.tipContent')}</Text>
            <TouchableOpacity style={styles.tipButton} onPress={() => setShowTip(false)}>
              <Text style={styles.tipButtonText}>{t('common.confirm', { defaultValue: 'OK' })}</Text>
            </TouchableOpacity>
          </LinearGradient>
        </BlurView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, paddingHorizontal: 8 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabText: { fontFamily: 'Poppins_600SemiBold', fontSize: 13 },
  smartHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 6 },
  smartFilterButton: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rateRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  rateTitle: { flex: 1, fontFamily: 'Poppins_500Medium', fontSize: 13 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  headerButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 18 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30, gap: 14 },
  centerText: { fontFamily: 'Poppins_500Medium', fontSize: 13, textAlign: 'center' },
  listContent: { padding: 16, paddingBottom: 48 },

  panel: { borderRadius: 18, borderWidth: 1, padding: 16, marginBottom: 18 },
  panelHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  panelTitle: { fontFamily: 'Poppins_700Bold', fontSize: 16 },
  panelSub: { fontFamily: 'Poppins_500Medium', fontSize: 12, marginBottom: 12 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 7 },
  barLabel: { width: 96, fontFamily: 'Poppins_500Medium', fontSize: 12 },
  barTrack: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4, backgroundColor: '#FACC15' },
  themesLabel: { fontFamily: 'Poppins_600SemiBold', fontSize: 11, marginTop: 8, marginBottom: 6, letterSpacing: 0.5 },
  themeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  themeChip: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 4 },
  themeText: { fontFamily: 'Poppins_500Medium', fontSize: 11 },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 9,
    marginTop: 14,
  },
  editText: { fontFamily: 'Poppins_600SemiBold', fontSize: 12.5 },
  hint: { fontFamily: 'Poppins_500Medium', fontSize: 11, marginTop: 10, textAlign: 'center' },

  primaryButton: {
    backgroundColor: '#FACC15',
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginTop: 14,
  },
  primaryButtonText: { fontFamily: 'Poppins_700Bold', fontSize: 14, color: '#000' },
  secondaryButton: { borderWidth: 1, borderRadius: 12, paddingVertical: 11, paddingHorizontal: 18, alignItems: 'center' },
  secondaryButtonText: { fontFamily: 'Poppins_600SemiBold', fontSize: 14 },

  section: { marginBottom: 18 },
  sectionTitle: { fontFamily: 'Poppins_700Bold', fontSize: 17 },
  sectionSub: { fontFamily: 'Poppins_500Medium', fontSize: 12, marginBottom: 10 },
  continueRow: { gap: 12, paddingRight: 8 },
  continueCard: { width: 112 },
  continuePoster: { width: 112, height: 160, borderRadius: 12 },
  continueTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 12, marginTop: 6, lineHeight: 16 },
  continueSub: { fontFamily: 'Poppins_500Medium', fontSize: 10.5 },
  soonBadge: { position: 'absolute', top: 6, left: 6, backgroundColor: '#FACC15', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  soonText: { fontFamily: 'Poppins_700Bold', fontSize: 9.5, color: '#000' },

  filterRow: { gap: 8, paddingVertical: 12 },
  filterChip: { borderWidth: 1, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 7 },
  filterText: { fontFamily: 'Poppins_600SemiBold', fontSize: 12.5 },

  footer: { alignItems: 'center', gap: 12, paddingTop: 4 },
  moreButton: { borderWidth: 1, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 28 },
  moreText: { fontFamily: 'Poppins_600SemiBold', fontSize: 13 },
  restore: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 6 },
  restoreText: { fontFamily: 'Poppins_500Medium', fontSize: 12 },
  emptyFilter: { alignItems: 'center', paddingVertical: 40, gap: 10 },

  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  sheet: { width: '100%', maxWidth: 440, borderRadius: 22, borderWidth: 1, padding: 18 },
  sheetActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  tipCard: { width: '100%', maxWidth: 400, padding: 24, borderRadius: 28, alignItems: 'center' },
  tipIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  tipTitle: { fontFamily: 'Poppins_700Bold', fontSize: 20, color: '#FFF', marginBottom: 10, textAlign: 'center' },
  tipBody: { fontFamily: 'Poppins_500Medium', fontSize: 13.5, color: '#FFF', lineHeight: 21, textAlign: 'center', marginBottom: 20 },
  tipButton: { backgroundColor: '#FFF', paddingHorizontal: 32, paddingVertical: 11, borderRadius: 16 },
  tipButtonText: { fontFamily: 'Poppins_700Bold', fontSize: 14, color: '#F59E0B' },
});
