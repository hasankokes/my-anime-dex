import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  ActivityIndicator,
  Modal,
  Pressable
} from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthProvider';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import Animated, { FadeInDown, FadeInRight, useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';
import TextTicker from 'react-native-text-ticker';

const { width } = Dimensions.get('window');

const CATEGORIES = [
  { id: 'all_time_anime', icon: 'trophy', color: '#FACC15', gradient: ['#FACC15', '#F59E0B'] as const, labelKey: 'arena.cat_all_time' },
  { id: 'movie_anime', icon: 'film', color: '#8B5CF6', gradient: ['#8B5CF6', '#7C3AED'] as const, labelKey: 'arena.cat_movie' },
  { id: 'shounen_anime', icon: 'flame', color: '#EF4444', gradient: ['#EF4444', '#DC2626'] as const, labelKey: 'arena.cat_shounen' },
  { id: 'action_anime', icon: 'flash', color: '#F97316', gradient: ['#F97316', '#EA580C'] as const, labelKey: 'arena.cat_action' },
  { id: 'isekai', icon: 'planet', color: '#10B981', gradient: ['#10B981', '#059669'] as const, labelKey: 'arena.cat_isekai' },
  { id: 'romance', icon: 'heart', color: '#EC4899', gradient: ['#EC4899', '#DB2777'] as const, labelKey: 'arena.cat_romance' },
  { id: 'comedy_anime', icon: 'happy', color: '#F59E0B', gradient: ['#F59E0B', '#D97706'] as const, labelKey: 'arena.cat_comedy' },
  { id: 'horror_anime', icon: 'skull', color: '#6366F1', gradient: ['#6366F1', '#4F46E5'] as const, labelKey: 'arena.cat_horror' },
  { id: 'drama_anime', icon: 'rainy', color: '#06B6D4', gradient: ['#06B6D4', '#0891B2'] as const, labelKey: 'arena.cat_drama' },
  { id: 'seinen_anime', icon: 'moon', color: '#A855F7', gradient: ['#A855F7', '#9333EA'] as const, labelKey: 'arena.cat_seinen' },
  { id: 'worst_sequels', icon: 'thumbs-down', color: '#DC2626', gradient: ['#DC2626', '#B91C1C'] as const, labelKey: 'arena.cat_worst_sequels' },
  { id: 'waifu', icon: 'rose', color: '#F43F5E', gradient: ['#F43F5E', '#E11D48'] as const, labelKey: 'arena.cat_waifu' },
  { id: 'husbando', icon: 'sparkles', color: '#3B82F6', gradient: ['#3B82F6', '#2563EB'] as const, labelKey: 'arena.cat_husbando' },
];

const HERO_AVATARS = [
  'https://s4.anilist.co/file/anilistcdn/character/large/b127691-9zqh1xpIubn7.png', // Gojou
  'https://s4.anilist.co/file/anilistcdn/character/large/b40-MNypXsxSRb1R.png',     // Luffy
  'https://s4.anilist.co/file/anilistcdn/character/large/b45627-CR68RyZmddGG.png',   // Levi
  'https://s4.anilist.co/file/anilistcdn/character/large/b40882-dsj7IP943WFF.jpg',   // Eren
  'https://s4.anilist.co/file/anilistcdn/character/large/b27-Z5O02kQUydpT.jpg',      // Killua
];

const SIZES = [8, 16, 32];

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
  category: string;
}

export default function ArenaSetupScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const { session } = useAuth();
  const insets = useSafeAreaInsets();

  const [selectedCategory, setSelectedCategory] = useState<string>('all_time_anime');
  const [selectedSize, setSelectedSize] = useState<number>(16);
  const [totalPlayed, setTotalPlayed] = useState(0);
  const [userHistory, setUserHistory] = useState<HistoryItem[]>([]);
  const [communityWinners, setCommunityWinners] = useState<CommunityWinner[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);

  // Modal State
  const [isStatsModalVisible, setIsStatsModalVisible] = useState(false);
  const [statsModalTab, setStatsModalTab] = useState<'community' | 'history'>('community');

  const openStatsModal = (tab: 'community' | 'history') => {
    setStatsModalTab(tab);
    setIsStatsModalVisible(true);
  };

  // Fetch stats on focus
  useFocusEffect(
    useCallback(() => {
      fetchStats();
    }, [session])
  );

  const fetchStats = async () => {
    try {
      setLoadingStats(true);

      // Total played count
      const { count } = await supabase
        .from('arena_results')
        .select('*', { count: 'exact', head: true });
      setTotalPlayed(count || 0);

      // User history (last 10)
      if (session?.user) {
        const { data: history } = await supabase
          .from('arena_results')
          .select('id, category, size, winner_name, winner_image, rating, created_at')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false })
          .limit(10);
        setUserHistory((history as HistoryItem[]) || []);
      }

      // Community top winners per category (most wins overall)
      const { data: community } = await supabase
        .from('arena_results')
        .select('winner_name, winner_image, category')
        .order('created_at', { ascending: false })
        .limit(200);
      
      if (community) {
        const winnerMap = new Map<string, { winner_name: string; winner_image: string; count: number; category: string }>();
        community.forEach((r: any) => {
          const key = r.winner_name;
          if (winnerMap.has(key)) {
            winnerMap.get(key)!.count++;
          } else {
            winnerMap.set(key, { winner_name: r.winner_name, winner_image: r.winner_image, count: 1, category: r.category });
          }
        });
        const sorted = Array.from(winnerMap.values()).sort((a, b) => b.count - a.count).slice(0, 10);
        setCommunityWinners(sorted);
      }
    } catch (err) {
      console.log('Stats fetch error:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleStart = () => {
    router.push({
      pathname: '/arena/game',
      params: { category: selectedCategory, size: selectedSize }
    });
  };

  const getCategoryLabel = (catId: string) => {
    const cat = CATEGORIES.find(c => c.id === catId);
    return cat ? (t(cat.labelKey) || catId) : catId;
  };

  const getCategoryColor = (catId: string) => {
    const cat = CATEGORIES.find(c => c.id === catId);
    return cat?.color || '#FACC15';
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getDate()}/${d.getMonth() + 1}`;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {t('arena.title') || 'Anime Arena'}
        </Text>
        <TouchableOpacity
          onPress={() => openStatsModal('community')}
          style={styles.headerRightBtn}
        >
          <Ionicons name="trophy-outline" size={22} color="#FACC15" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 110 + insets.bottom }]}
      >
        {/* Simplified Hero Banner */}
        <Animated.View entering={FadeInDown.duration(600)} style={styles.heroBanner}>
          <Image
            source={require('../../assets/images/arena-hero-bg.jpg')}
            style={StyleSheet.absoluteFillObject}
            contentFit="cover"
          />
          <LinearGradient
            colors={isDark 
              ? ['rgba(13, 10, 28, 0.85)', 'rgba(15, 23, 42, 0.90)', 'rgba(9, 13, 22, 0.95)'] 
              : ['rgba(67, 56, 202, 0.88)', 'rgba(55, 48, 163, 0.92)', 'rgba(30, 27, 75, 0.95)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroGradient}
          >
            {/* Character Face-off Showcase */}
            <View style={styles.heroShowcase}>
              <View style={styles.avatarOverlapRow}>
                {HERO_AVATARS.map((url, idx) => (
                  <View
                    key={url}
                    style={[
                      styles.heroAvatarWrap,
                      {
                        marginLeft: idx === 0 ? 0 : -12,
                        zIndex: HERO_AVATARS.length - idx,
                        borderColor: idx === 0 ? '#FACC15' : idx === 1 ? '#EC4899' : idx === 2 ? '#10B981' : idx === 3 ? '#EF4444' : '#3B82F6',
                      }
                    ]}
                  >
                    <Image
                      source={{ uri: url }}
                      style={styles.heroAvatarImg}
                      contentFit="cover"
                      priority="high"
                      cachePolicy="memory-disk"
                    />
                  </View>
                ))}
              </View>
            </View>

            {/* Clean Punchy Title */}
            <Text style={styles.heroTitle}>
              {t('arena.hero_title_1') || 'CROWN YOUR'}
              <Text style={styles.heroTitleHighlight}> {t('arena.hero_title_2') || 'CHAMPION'}</Text>
            </Text>

            {/* Sub-slogan */}
            <Text style={styles.heroSubtitle}>
              {t('arena.hero_desc') || 'Vote in tournament brackets and crown the ultimate anime!'}
            </Text>
          </LinearGradient>
        </Animated.View>

        {/* Quick Access: Community & History */}
        <View style={styles.quickActionsRow}>
          <TouchableOpacity
            style={[
              styles.quickActionCard,
              { backgroundColor: colors.card, borderColor: colors.border }
            ]}
            onPress={() => openStatsModal('community')}
            activeOpacity={0.7}
          >
            <View style={[styles.quickActionIconWrap, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)' }]}>
              <Ionicons name="trophy" size={18} color="#10B981" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.quickActionTitle, { color: colors.text }]} numberOfLines={1}>
                {t('arena.community_winners') || 'Community Favorites'}
              </Text>
              <Text style={[styles.quickActionSub, { color: colors.subtext }]} numberOfLines={1}>
                {communityWinners.length > 0 ? `${communityWinners.length} champions` : t('common.loading')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.subtext} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.quickActionCard,
              { backgroundColor: colors.card, borderColor: colors.border }
            ]}
            onPress={() => openStatsModal('history')}
            activeOpacity={0.7}
          >
            <View style={[styles.quickActionIconWrap, { backgroundColor: isDark ? 'rgba(250, 204, 21, 0.15)' : 'rgba(250, 204, 21, 0.1)' }]}>
              <Ionicons name="time" size={18} color="#FACC15" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.quickActionTitle, { color: colors.text }]} numberOfLines={1}>
                {t('arena.your_history') || 'Your Results'}
              </Text>
              <Text style={[styles.quickActionSub, { color: colors.subtext }]} numberOfLines={1}>
                {session?.user ? `${userHistory.length} played` : t('arena.login_to_save')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.subtext} />
          </TouchableOpacity>
        </View>

        {/* Category Selection */}
        <Animated.View entering={FadeInDown.duration(600).delay(150)} style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="grid" size={18} color="#FACC15" />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t('arena.choose_category') || 'Choose Category'}
              </Text>
            </View>
          </View>

          <View style={styles.grid}>
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.card,
                    {
                      backgroundColor: isSelected
                        ? (isDark ? `${cat.color}18` : `${cat.color}12`)
                        : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)'),
                      borderColor: isSelected ? cat.color : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'),
                    },
                  ]}
                  onPress={() => setSelectedCategory(cat.id)}
                  activeOpacity={0.7}
                >
                  {isSelected && (
                    <View style={[styles.selectedGlow, { backgroundColor: cat.color, shadowColor: cat.color }]} />
                  )}
                  <View
                    style={[
                      styles.iconWrap,
                      { backgroundColor: isSelected ? `${cat.color}30` : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)') }
                    ]}
                  >
                    <Ionicons
                      name={cat.icon as any}
                      size={18}
                      color={isSelected ? cat.color : colors.subtext}
                    />
                  </View>
                  <View style={styles.cardTitleWrap}>
                    <TextTicker
                      style={[
                        styles.cardTitle,
                        {
                          color: isSelected ? colors.text : colors.subtext,
                          fontFamily: isSelected ? 'Poppins_700Bold' : 'Poppins_500Medium',
                        }
                      ]}
                      duration={7000}
                      loop
                      bounce={false}
                      repeatSpacer={30}
                      marqueeDelay={1200}
                    >
                      {t(cat.labelKey) || cat.id.replace(/_/g, ' ').toUpperCase()}
                    </TextTicker>
                  </View>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={16} color={cat.color} style={styles.checkIcon} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>

        {/* Size Selection */}
        <Animated.View entering={FadeInDown.duration(600).delay(250)} style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="options" size={18} color="#FACC15" />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t('arena.choose_size') || 'Choose Size'}
              </Text>
            </View>
          </View>

          <View style={styles.sizeContainer}>
            {SIZES.map((size) => {
              const isSelected = selectedSize === size;
              return (
                <TouchableOpacity
                  key={size}
                  style={[
                    styles.sizeButton,
                    {
                      backgroundColor: isSelected ? '#FACC15' : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)'),
                      borderColor: isSelected ? '#FACC15' : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'),
                    }
                  ]}
                  onPress={() => setSelectedSize(size)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.sizeText,
                      {
                        color: isSelected ? '#000' : colors.text,
                        fontFamily: isSelected ? 'Poppins_700Bold' : 'Poppins_600SemiBold',
                      }
                    ]}
                  >
                    {size}
                  </Text>
                  <Text style={[styles.sizeLabel, { color: isSelected ? 'rgba(0,0,0,0.5)' : colors.subtext }]}>
                    {size === 8 ? 'Quick' : size === 16 ? 'Classic' : 'Epic'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>
      </ScrollView>

      {/* Sticky Bottom Start Button */}
      <View style={[styles.footerContainer, { backgroundColor: colors.background, borderTopColor: colors.border, paddingBottom: Math.max(insets.bottom, 14) }]}>
        <TouchableOpacity
          style={styles.startButton}
          activeOpacity={0.85}
          onPress={handleStart}
        >
          <LinearGradient
            colors={['#FACC15', '#F59E0B']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.startGradient}
          >
            <Ionicons name="flash" size={20} color="#000" />
            <Text style={styles.startText}>
              {t('arena.start_button') || 'Start Battle!'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Stats & History Modal */}
      <Modal
        visible={isStatsModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsStatsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalDismiss} onPress={() => setIsStatsModalVisible(false)} />
          <View style={[styles.modalSheet, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
            {/* Sheet Handle */}
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />

            {/* Modal Header & Segmented Tabs */}
            <View style={styles.modalHeader}>
              <View style={[styles.modalTabs, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}>
                <TouchableOpacity
                  style={[
                    styles.modalTab,
                    statsModalTab === 'community' && { backgroundColor: '#FACC15' }
                  ]}
                  onPress={() => setStatsModalTab('community')}
                >
                  <Ionicons
                    name="trophy"
                    size={15}
                    color={statsModalTab === 'community' ? '#000' : colors.subtext}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={[
                      styles.modalTabText,
                      {
                        color: statsModalTab === 'community' ? '#000' : colors.subtext,
                        fontWeight: statsModalTab === 'community' ? '700' : '500',
                      }
                    ]}
                  >
                    {t('arena.community_winners') || 'Favorites'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.modalTab,
                    statsModalTab === 'history' && { backgroundColor: '#FACC15' }
                  ]}
                  onPress={() => setStatsModalTab('history')}
                >
                  <Ionicons
                    name="time"
                    size={15}
                    color={statsModalTab === 'history' ? '#000' : colors.subtext}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={[
                      styles.modalTabText,
                      {
                        color: statsModalTab === 'history' ? '#000' : colors.subtext,
                        fontWeight: statsModalTab === 'history' ? '700' : '500',
                      }
                    ]}
                  >
                    {t('arena.your_history') || 'My Results'}
                    {userHistory.length > 0 ? ` (${userHistory.length})` : ''}
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                onPress={() => setIsStatsModalVisible(false)}
                style={[styles.modalCloseBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}
              >
                <Ionicons name="close" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Modal Body */}
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScrollContent}>
              {statsModalTab === 'community' ? (
                communityWinners.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Ionicons name="trophy-outline" size={48} color={colors.subtext} />
                    <Text style={[styles.emptyText, { color: colors.subtext, marginTop: 12 }]}>
                      {t('arena.no_results_yet') || 'No favorites yet.'}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.communityGrid}>
                    {communityWinners.map((winner, index) => (
                      <View
                        key={`${winner.winner_name}-${index}`}
                        style={[
                          styles.communityModalCard,
                          {
                            backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                            borderColor: colors.border,
                          }
                        ]}
                      >
                        <View style={styles.communityImageWrap}>
                          <Image
                            source={{ uri: winner.winner_image }}
                            style={styles.communityModalImage}
                            contentFit="cover"
                            priority="high"
                            cachePolicy="memory-disk"
                          />
                          {index < 3 && (
                            <View style={[styles.rankBadge, { backgroundColor: index === 0 ? '#FACC15' : index === 1 ? '#94A3B8' : '#CD7F32' }]}>
                              <Text style={styles.rankText}>{index + 1}</Text>
                            </View>
                          )}
                        </View>
                        <Text style={[styles.communityModalName, { color: colors.text }]} numberOfLines={1}>
                          {winner.winner_name}
                        </Text>
                        <View style={styles.communityModalWins}>
                          <Ionicons name="trophy" size={12} color="#FACC15" style={{ marginRight: 4 }} />
                          <Text style={[styles.communityModalCount, { color: colors.subtext }]}>
                            {winner.count} wins
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )
              ) : (
                !session?.user ? (
                  <View style={styles.emptyState}>
                    <Ionicons name="lock-closed-outline" size={48} color={colors.subtext} />
                    <Text style={[styles.emptyText, { color: colors.text, marginTop: 12 }]}>
                      {t('arena.login_to_save') || 'Log in to save your results'}
                    </Text>
                  </View>
                ) : userHistory.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Ionicons name="sparkles-outline" size={48} color={colors.subtext} />
                    <Text style={[styles.emptyText, { color: colors.subtext, marginTop: 12 }]}>
                      {t('arena.no_results_yet') || 'No results yet. Play your first quiz!'}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.historyList}>
                    {userHistory.map((item) => (
                      <View
                        key={item.id}
                        style={[
                          styles.historyModalCard,
                          {
                            backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                            borderColor: colors.border,
                          }
                        ]}
                      >
                        <Image
                          source={{ uri: item.winner_image }}
                          style={styles.historyModalImage}
                          contentFit="cover"
                          priority="high"
                          cachePolicy="memory-disk"
                        />
                        <View style={styles.historyModalInfo}>
                          <Text style={[styles.historyModalName, { color: colors.text }]} numberOfLines={1}>
                            {item.winner_name}
                          </Text>
                          <View style={styles.historyModalMeta}>
                            <View style={[styles.historyCatBadge, { backgroundColor: getCategoryColor(item.category) + '20' }]}>
                              <Text style={[styles.historyCatText, { color: getCategoryColor(item.category) }]} numberOfLines={1}>
                                {getCategoryLabel(item.category)}
                              </Text>
                            </View>
                            <Text style={[styles.historyDateText, { color: colors.subtext }]}>
                              {formatDate(item.created_at)}
                            </Text>
                          </View>
                        </View>
                        {item.rating > 0 && (
                          <View style={styles.historyModalStars}>
                            <Ionicons name="star" size={14} color="#FACC15" style={{ marginRight: 2 }} />
                            <Text style={[styles.historyRatingText, { color: colors.text }]}>{item.rating}</Text>
                          </View>
                        )}
                      </View>
                    ))}
                  </View>
                )
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
  },
  headerRightBtn: {
    padding: 8,
    marginRight: -8,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  // Simplified Hero Banner
  heroBanner: {
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  heroGradient: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  heroShowcase: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarOverlapRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroAvatarWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    overflow: 'hidden',
    backgroundColor: '#1E1B4B',
  },
  heroAvatarImg: {
    width: '100%',
    height: '100%',
  },
  heroTitle: {
    fontFamily: 'Poppins_800ExtraBold',
    fontSize: 22,
    color: '#FFF',
    letterSpacing: 1.2,
    textAlign: 'center',
  },
  heroTitleHighlight: {
    color: '#FACC15',
  },
  heroSubtitle: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 4,
    textAlign: 'center',
    lineHeight: 17,
    paddingHorizontal: 8,
  },
  // Quick Actions Row
  quickActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  quickActionCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  quickActionIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
  },
  quickActionSub: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 10,
    marginTop: 1,
  },
  // Sections
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
  },
  // Category Grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  card: {
    width: (width - 40) / 2,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  selectedGlow: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 60,
    height: 60,
    borderRadius: 30,
    opacity: 0.08,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitleWrap: {
    flex: 1,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 12,
  },
  checkIcon: {
    marginLeft: -4,
  },
  // Size Selection
  sizeContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  sizeButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 1,
  },
  sizeText: {
    fontSize: 20,
  },
  sizeLabel: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 10,
    marginTop: 2,
  },
  // Footer
  footerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  startButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 10,
  },
  startGradient: {
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  startText: {
    color: '#000',
    fontSize: 17,
    fontFamily: 'Poppins_700Bold',
    letterSpacing: 0.5,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalDismiss: {
    flex: 1,
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    maxHeight: '75%',
    paddingBottom: 24,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  modalTabs: {
    flex: 1,
    flexDirection: 'row',
    borderRadius: 12,
    padding: 3,
    marginRight: 10,
  },
  modalTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
  },
  modalTabText: {
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 13,
    textAlign: 'center',
  },
  // Community Modal Grid
  communityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  communityModalCard: {
    width: (width - 42) / 2,
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  communityImageWrap: {
    width: '100%',
    height: 110,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  communityModalImage: {
    width: '100%',
    height: '100%',
  },
  rankBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  rankText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 11,
    color: '#000',
  },
  communityModalName: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
  communityModalWins: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  communityModalCount: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 11,
  },
  // History Modal List
  historyList: {
    gap: 10,
  },
  historyModalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  historyModalImage: {
    width: 50,
    height: 65,
    borderRadius: 8,
  },
  historyModalInfo: {
    flex: 1,
    gap: 4,
  },
  historyModalName: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
  },
  historyModalMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  historyCatBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  historyCatText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 9,
    textTransform: 'uppercase',
  },
  historyDateText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
  },
  historyModalStars: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(250, 204, 21, 0.1)',
  },
  historyRatingText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 13,
  },
});
