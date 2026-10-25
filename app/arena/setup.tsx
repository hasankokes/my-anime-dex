import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Pressable, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthProvider';
import { supabase } from '../../lib/supabase';
import { analytics } from '../../lib/analytics';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import { VsMark } from '../../components/Arena/VsMark';
import { ARENA_CATEGORIES, ARENA_SIZES, ARENA_GOLD, ARENA_GOLD_DEEP, getArenaCategory } from '../../components/Arena/arenaTheme';

interface HistoryItem {
  id: string;
  category: string;
  size: number;
  winner_name: string;
  winner_image: string;
  rating: number;
  created_at: string;
}

interface CommunityWinner {
  winner_name: string;
  winner_image: string;
  count: number;
}

const PODIUM_COLORS = ['#FACC15', '#CBD5E1', '#D97706'];

export default function ArenaSetupScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const { session } = useAuth();
  const insets = useSafeAreaInsets();
  const requireAuth = useRequireAuth();
  const { width } = useWindowDimensions();

  const [selectedCategory, setSelectedCategory] = useState('all_time_anime');
  const [selectedSize, setSelectedSize] = useState(16);
  const [totalPlayed, setTotalPlayed] = useState(0);
  const [userHistory, setUserHistory] = useState<HistoryItem[]>([]);
  const [communityWinners, setCommunityWinners] = useState<CommunityWinner[]>([]);

  const tileWidth = (width - 32 - 10) / 2;
  const selected = getArenaCategory(selectedCategory);

  useFocusEffect(
    useCallback(() => {
      fetchStats();
    }, [session]) // eslint-disable-line react-hooks/exhaustive-deps
  );

  const fetchStats = async () => {
    try {
      const { count } = await supabase
        .from('arena_results')
        .select('*', { count: 'exact', head: true });
      setTotalPlayed(count || 0);

      if (session?.user) {
        const { data: history } = await supabase
          .from('arena_results')
          .select('id, category, size, winner_name, winner_image, rating, created_at')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false })
          .limit(10);
        setUserHistory((history as HistoryItem[]) || []);
      } else {
        setUserHistory([]);
      }

      const { data: community } = await supabase
        .from('arena_results')
        .select('winner_name, winner_image')
        .order('created_at', { ascending: false })
        .limit(200);

      if (community) {
        const winnerMap = new Map<string, CommunityWinner>();
        community.forEach((r: any) => {
          const existing = winnerMap.get(r.winner_name);
          if (existing) existing.count++;
          else winnerMap.set(r.winner_name, { winner_name: r.winner_name, winner_image: r.winner_image, count: 1 });
        });
        setCommunityWinners(Array.from(winnerMap.values()).sort((a, b) => b.count - a.count).slice(0, 10));
      }
    } catch (err) {
      console.log('Arena stats fetch error:', err);
    }
  };

  const handleStart = () => {
    analytics.track('arena_setup_started', { category: selectedCategory, bracket_size: selectedSize });
    router.push({ pathname: '/arena/game', params: { category: selectedCategory, size: selectedSize } });
  };

  const subtleBg = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.headerBtn, { backgroundColor: subtleBg }]}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleRow}>
          <VsMark size={26} />
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('arena.title')}</Text>
        </View>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 + insets.bottom }}
      >
        {/* Hero */}
        <Animated.View entering={FadeInDown.duration(500)} style={styles.hero}>
          <Image source={require('../../assets/images/arena-hero-bg.jpg')} style={StyleSheet.absoluteFill} contentFit="cover" />
          <LinearGradient
            colors={['rgba(8,8,12,0.55)', 'rgba(8,8,12,0.85)', 'rgba(8,8,12,0.97)']}
            style={StyleSheet.absoluteFill}
          />
          {/* Accent glow follows the selected category */}
          <LinearGradient
            colors={[`${selected.color}55`, 'transparent']}
            start={{ x: 1, y: 0 }}
            end={{ x: 0.2, y: 0.9 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.heroContent}>
            <View style={styles.heroTag}>
              <Text style={styles.heroTagText}>{t('arena.hero_tag')}</Text>
            </View>
            <Text style={styles.heroTitle}>
              {t('arena.hero_title_1')}{'\n'}
              <Text style={{ color: ARENA_GOLD }}>{t('arena.hero_title_2')}</Text>
            </Text>
            <Text style={styles.heroDesc} numberOfLines={2}>{t('arena.hero_desc')}</Text>
            <View style={styles.heroStats}>
              <View style={styles.statChip}>
                <Ionicons name="flash" size={13} color={ARENA_GOLD} />
                <Text style={styles.statChipText}>
                  {(t('arena.people_played') || '{count}').replace('{count}', totalPlayed.toLocaleString())}
                </Text>
              </View>
              <View style={styles.statChip}>
                <Ionicons name="grid" size={12} color={ARENA_GOLD} />
                <Text style={styles.statChipText}>{t('arena.categories_count')}</Text>
              </View>
            </View>
          </View>
          <View style={styles.heroVs} pointerEvents="none">
            <VsMark size={74} />
          </View>
        </Animated.View>

        {/* Bracket size: compact segmented control, above the long category grid so it stays visible */}
        <Animated.View entering={FadeInDown.duration(500).delay(80)}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('arena.choose_size')}</Text>
          <View style={[styles.sizeTrack, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {ARENA_SIZES.map(({ size, labelKey }) => {
              const isSelected = selectedSize === size;
              return (
                <Pressable
                  key={size}
                  onPress={() => setSelectedSize(size)}
                  style={[styles.sizeSegment, isSelected && { backgroundColor: ARENA_GOLD }]}
                >
                  <View style={styles.sizeTop}>
                    <Text style={[styles.sizeNumber, { color: isSelected ? '#000' : colors.text }]}>{size}</Text>
                    <Text style={[styles.sizeLabel, { color: isSelected ? '#000' : colors.subtext }]} numberOfLines={1}>
                      {t(labelKey)}
                    </Text>
                  </View>
                  <Text style={[styles.sizeMeta, { color: isSelected ? 'rgba(0,0,0,0.6)' : colors.subtext }]} numberOfLines={1}>
                    {(t('arena.matches_count') || '{count}').replace('{count}', String(size - 1))}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>

        {/* Categories */}
        <Animated.View entering={FadeInDown.duration(500).delay(160)}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('arena.choose_category')}</Text>
          <View style={styles.grid}>
            {ARENA_CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <Pressable
                  key={cat.id}
                  onPress={() => setSelectedCategory(cat.id)}
                  style={({ pressed }) => [
                    styles.tile,
                    {
                      width: tileWidth,
                      borderColor: isSelected ? cat.color : colors.border,
                      backgroundColor: colors.card,
                      transform: [{ scale: pressed ? 0.97 : 1 }],
                    },
                  ]}
                >
                  {isSelected && (
                    <LinearGradient
                      colors={cat.gradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={StyleSheet.absoluteFill}
                    />
                  )}
                  <Ionicons
                    name={cat.icon as any}
                    size={58}
                    color={isSelected ? 'rgba(255,255,255,0.22)' : `${cat.color}22`}
                    style={styles.tileWatermark}
                  />
                  <View style={[styles.tileIcon, { backgroundColor: isSelected ? 'rgba(0,0,0,0.18)' : `${cat.color}1F` }]}>
                    <Ionicons name={cat.icon as any} size={16} color={isSelected ? '#FFF' : cat.color} />
                  </View>
                  <Text
                    style={[styles.tileLabel, { color: isSelected ? '#FFF' : colors.text }]}
                    numberOfLines={2}
                  >
                    {t(cat.labelKey)}
                  </Text>
                  {isSelected && (
                    <View style={styles.tileCheck}>
                      <Ionicons name="checkmark" size={12} color={cat.color} />
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </Animated.View>

        {/* Community podium */}
        {communityWinners.length > 0 && (
          <Animated.View entering={FadeInDown.duration(500).delay(240)}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('arena.community_winners')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
              {communityWinners.map((w, i) => (
                <View key={`${w.winner_name}-${i}`} style={styles.championItem}>
                  <View style={[styles.championPoster, { borderColor: i < 3 ? PODIUM_COLORS[i] : colors.border }]}>
                    <Image source={{ uri: w.winner_image }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" />
                    <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.championShade} />
                    <View style={styles.championWins}>
                      <Ionicons name="trophy" size={10} color={ARENA_GOLD} />
                      <Text style={styles.championWinsText}>{w.count}</Text>
                    </View>
                    {i < 3 && (
                      <View style={[styles.rankBadge, { backgroundColor: PODIUM_COLORS[i] }]}>
                        <Text style={styles.rankText}>{i + 1}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.championName, { color: colors.text }]} numberOfLines={1}>{w.winner_name}</Text>
                </View>
              ))}
            </ScrollView>
          </Animated.View>
        )}

        {/* Your results */}
        <Animated.View entering={FadeInDown.duration(500).delay(300)}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('arena.your_history')}</Text>
          {userHistory.length === 0 ? (
            <Pressable
              disabled={!!session?.user}
              onPress={() => requireAuth('arena')}
              style={({ pressed }) => [
                styles.emptyCard,
                {
                  backgroundColor: colors.card,
                  borderColor: session?.user ? colors.border : (isDark ? 'rgba(250,204,21,0.35)' : 'rgba(202,138,4,0.35)'),
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Ionicons
                name={session?.user ? 'sparkles-outline' : 'log-in-outline'}
                size={20}
                color={session?.user ? colors.subtext : (isDark ? ARENA_GOLD : '#A16207')}
              />
              <Text style={[styles.emptyText, { color: session?.user ? colors.subtext : colors.text }]}>
                {session?.user ? t('arena.no_results_yet') : t('arena.login_to_save')}
              </Text>
              {!session?.user && <Ionicons name="chevron-forward" size={16} color={isDark ? ARENA_GOLD : '#A16207'} />}
            </Pressable>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
              {userHistory.map((item) => {
                const cat = getArenaCategory(item.category);
                return (
                  <View key={item.id} style={[styles.historyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Image source={{ uri: item.winner_image }} style={styles.historyImage} contentFit="cover" cachePolicy="memory-disk" />
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={[styles.historyName, { color: colors.text }]} numberOfLines={2}>{item.winner_name}</Text>
                      <View style={[styles.historyCat, { backgroundColor: `${cat.color}22` }]}>
                        <Ionicons name={cat.icon as any} size={10} color={cat.color} />
                        <Text style={[styles.historyCatText, { color: cat.color }]} numberOfLines={1}>{t(cat.labelKey)}</Text>
                      </View>
                      {item.rating > 0 && (
                        <View style={styles.historyStars}>
                          {Array.from({ length: item.rating }).map((_, i) => (
                            <Ionicons key={i} name="star" size={10} color={ARENA_GOLD} />
                          ))}
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </Animated.View>
      </ScrollView>

      {/* Sticky start */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 14) }]} pointerEvents="box-none">
        <LinearGradient
          colors={[`${colors.background}00`, colors.background, colors.background]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <TouchableOpacity activeOpacity={0.88} onPress={handleStart} style={styles.startButton}>
          <LinearGradient colors={[ARENA_GOLD, ARENA_GOLD_DEEP]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.startGradient}>
            <View style={styles.startTextCol}>
              <Text style={styles.startText}>{t('arena.start_button')}</Text>
              <Text style={styles.startSub} numberOfLines={1}>
                {t(selected.labelKey)} · {selectedSize}
              </Text>
            </View>
            <View style={styles.startArrow}>
              <Ionicons name="flash" size={18} color={ARENA_GOLD} />
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontFamily: 'Poppins_700Bold', fontSize: 17, letterSpacing: 0.3 },

  hero: {
    borderRadius: 24,
    overflow: 'hidden',
    marginTop: 4,
    marginBottom: 22,
    minHeight: 190,
    backgroundColor: '#0B0B10',
  },
  heroContent: { padding: 18, paddingRight: 96 },
  heroTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(250,204,21,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(250,204,21,0.35)',
    marginBottom: 10,
  },
  heroTagText: { color: ARENA_GOLD, fontFamily: 'Poppins_600SemiBold', fontSize: 10, letterSpacing: 0.6 },
  heroTitle: { color: '#FFF', fontFamily: 'Poppins_700Bold', fontSize: 26, lineHeight: 30, letterSpacing: 0.5 },
  heroDesc: { color: 'rgba(255,255,255,0.72)', fontFamily: 'Poppins_500Medium', fontSize: 12, lineHeight: 17, marginTop: 6 },
  heroStats: { flexDirection: 'row', gap: 8, marginTop: 14, flexWrap: 'wrap' },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  statChipText: { color: '#FFF', fontFamily: 'Poppins_600SemiBold', fontSize: 11 },
  heroVs: { position: 'absolute', right: 14, top: 0, bottom: 0, justifyContent: 'center' },

  sectionTitle: { fontFamily: 'Poppins_700Bold', fontSize: 16, marginBottom: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 22 },
  tile: {
    height: 78,
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 12,
    overflow: 'hidden',
    justifyContent: 'space-between',
  },
  tileWatermark: { position: 'absolute', right: -8, bottom: -10, transform: [{ rotate: '-12deg' }] },
  tileIcon: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  tileLabel: { fontFamily: 'Poppins_700Bold', fontSize: 12, lineHeight: 15, paddingRight: 18 },
  tileCheck: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  sizeTrack: { flexDirection: 'row', borderRadius: 16, borderWidth: 1, padding: 4, gap: 4, marginBottom: 22 },
  sizeSegment: { flex: 1, borderRadius: 12, paddingVertical: 7, alignItems: 'center' },
  sizeTop: { flexDirection: 'row', alignItems: 'baseline', gap: 5 },
  sizeNumber: { fontFamily: 'Poppins_700Bold', fontSize: 18, lineHeight: 22 },
  sizeLabel: { fontFamily: 'Poppins_600SemiBold', fontSize: 11, flexShrink: 1 },
  sizeMeta: { fontFamily: 'Poppins_500Medium', fontSize: 10, marginTop: -1 },

  hScroll: { gap: 10, paddingBottom: 22, paddingRight: 16 },
  championItem: { width: 92 },
  championPoster: {
    width: 92,
    height: 128,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 2,
  },
  championShade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 48 },
  championWins: { position: 'absolute', bottom: 6, left: 8, flexDirection: 'row', alignItems: 'center', gap: 3 },
  championWinsText: { color: '#FFF', fontFamily: 'Poppins_700Bold', fontSize: 11 },
  rankBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: { color: '#000', fontFamily: 'Poppins_700Bold', fontSize: 11 },
  championName: { fontFamily: 'Poppins_600SemiBold', fontSize: 11, marginTop: 6 },

  emptyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 22,
  },
  emptyText: { flex: 1, fontFamily: 'Poppins_500Medium', fontSize: 12 },
  historyCard: {
    width: 210,
    flexDirection: 'row',
    gap: 10,
    padding: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  historyImage: { width: 52, height: 72, borderRadius: 10 },
  historyName: { fontFamily: 'Poppins_600SemiBold', fontSize: 12, lineHeight: 16 },
  historyCat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    maxWidth: '100%',
  },
  historyCatText: { fontFamily: 'Poppins_600SemiBold', fontSize: 9, flexShrink: 1 },
  historyStars: { flexDirection: 'row', gap: 1 },

  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 28 },
  startButton: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: ARENA_GOLD_DEEP,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 10,
  },
  startGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingLeft: 20,
    paddingRight: 10,
  },
  startTextCol: { flex: 1 },
  startText: { color: '#000', fontFamily: 'Poppins_700Bold', fontSize: 17, letterSpacing: 0.3 },
  startSub: { color: 'rgba(0,0,0,0.6)', fontFamily: 'Poppins_600SemiBold', fontSize: 11, marginTop: -2 },
  startArrow: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#0B0B0B',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
