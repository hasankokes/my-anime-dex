import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Share, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import Animated, { ZoomIn, FadeInUp, useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming, Easing } from 'react-native-reanimated';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthProvider';
import { supabase } from '../../lib/supabase';
import { pendingArenaResult } from '../../lib/pendingArenaResult';
import { analytics } from '../../lib/analytics';
import { maybeRequestReview } from '../../lib/reviewPrompt';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import { Confetti } from '../../components/Arena/Confetti';
import { ARENA_GOLD, ARENA_GOLD_DEEP, getArenaCategory } from '../../components/Arena/arenaTheme';

export default function ArenaResultScreen() {
  const { winnerId, winnerName, winnerImage, category, size } = useLocalSearchParams();
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const { session } = useAuth();
  const requireAuth = useRequireAuth();
  const insets = useSafeAreaInsets();
  const cat = getArenaCategory(category as string);
  const bracketSize = parseInt(size as string, 10) || 16;

  const viewShotRef = useRef<ViewShot>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [savedResultId, setSavedResultId] = useState<string | null>(null);
  const [savingResult, setSavingResult] = useState(false);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const ratingRef = useRef(0);

  // Soft golden halo behind the champion
  const glow = useSharedValue(0.5);
  useEffect(() => {
    glow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.5, { duration: 1400, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.value, transform: [{ scale: 0.9 + glow.value * 0.15 }] }));

  // Signed in: save on mount. Guest: keep it pending until sign-in.
  useEffect(() => {
    if (session?.user) saveQuizResult();
    else keepPendingResult();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (session?.user && pendingKey && !savedResultId) savePendingResult();
  }, [session?.user?.id, pendingKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const keepPendingResult = async () => {
    if (!winnerId || !winnerName) return;
    const key = await pendingArenaResult.set({
      category: (category as string) || 'all_time_anime',
      size: bracketSize,
      winner_id: parseInt(winnerId as string, 10) || 0,
      winner_name: winnerName as string,
      winner_image: (winnerImage as string) || '',
    });
    setPendingKey(key);
  };

  const savePendingResult = async () => {
    if (!pendingKey || savedResultId) return;
    try {
      setSavingResult(true);
      const id = await pendingArenaResult.flush(pendingKey);
      if (id) {
        setSavedResultId(id);
        if (ratingRef.current > 0) {
          await supabase.from('arena_results').update({ rating: ratingRef.current }).eq('id', id);
        }
      }
    } catch (err) {
      console.log('Error saving pending arena result:', err);
    } finally {
      setSavingResult(false);
    }
  };

  const saveQuizResult = async () => {
    if (!winnerId || !winnerName) return;
    try {
      setSavingResult(true);
      const { data, error } = await supabase
        .from('arena_results')
        .insert({
          user_id: session?.user?.id || null,
          category: (category as string) || 'all_time_anime',
          size: bracketSize,
          winner_id: parseInt(winnerId as string, 10) || 0,
          winner_name: winnerName as string,
          winner_image: (winnerImage as string) || '',
          rating: 0,
        })
        .select('id')
        .single();
      if (!error && data) setSavedResultId(data.id);
    } catch (err) {
      console.log('Error saving arena result:', err);
    } finally {
      setSavingResult(false);
    }
  };

  const handleRate = async (stars: number) => {
    setUserRating(stars);
    // Loving the arena (4-5 stars, first rating only) is a good moment to ask for a store review
    if (stars >= 4 && ratingRef.current === 0) maybeRequestReview('arena_win');
    ratingRef.current = stars;
    if (!savedResultId) {
      if (pendingKey) pendingArenaResult.setRating(pendingKey, stars);
      return;
    }
    try {
      await supabase.from('arena_results').update({ rating: stars }).eq('id', savedResultId);
    } catch (err) {
      console.log('Error updating rating:', err);
    }
  };

  const handleShare = async () => {
    try {
      setIsSharing(true);
      if (!viewShotRef.current?.capture) return;
      const uri = await viewShotRef.current.capture();
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: t('arena.my_champion').replace('{name}', (winnerName as string) || ''),
          UTI: 'image/png',
        });
        analytics.track('arena_result_shared', { category: String(category || ''), method: 'image' });
      } else {
        const result = await Share.share({ message: `${winnerName as string} won my Anime Arena championship! 🏆⚔️ #AnimeDex` });
        if (result.action === Share.sharedAction) {
          analytics.track('arena_result_shared', { category: String(category || ''), method: 'text' });
        }
      }
    } catch (error) {
      console.error('Error sharing image:', error);
    } finally {
      setIsSharing(false);
    }
  };

  const handlePlayAgain = () => {
    router.replace({ pathname: '/arena/game', params: { category: (category as string) || 'all_time_anime', size: String(bracketSize) } });
  };

  const subtleBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <LinearGradient colors={[`${ARENA_GOLD}${isDark ? '26' : '33'}`, 'transparent']} style={styles.topGlow} pointerEvents="none" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/arena/setup')} style={[styles.iconBtn, { backgroundColor: subtleBg }]}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('arena.result')}</Text>
        <TouchableOpacity onPress={() => router.replace('/(tabs)')} style={[styles.iconBtn, { backgroundColor: subtleBg }]}>
          <Ionicons name="close" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 20 }]} showsVerticalScrollIndicator={false}>
        {/* Share card: always dark so the exported image looks the same in both themes */}
        <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 0.95 }} style={styles.shotWrap}>
          <View style={styles.shareCard}>
            <LinearGradient colors={['#17130A', '#0B0B0F', '#0B0B0F']} style={StyleSheet.absoluteFill} />
            <LinearGradient colors={[`${cat.color}40`, 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0.6 }} style={StyleSheet.absoluteFill} />

            <View style={[styles.catChip, { backgroundColor: `${cat.color}2E`, borderColor: `${cat.color}66` }]}>
              <Ionicons name={cat.icon as any} size={12} color={cat.color} />
              <Text style={[styles.catChipText, { color: '#FFF' }]} numberOfLines={1}>{t(cat.labelKey)}</Text>
            </View>

            <Text style={styles.crown}>👑</Text>
            <Text style={styles.championLabel}>{t('arena.champion_label')}</Text>

            <View style={styles.posterStage}>
              <Animated.View style={[styles.halo, glowStyle]}>
                <View style={styles.haloMid} />
                <View style={styles.haloCore} />
              </Animated.View>
              <Animated.View entering={ZoomIn.duration(600).springify().damping(13)}>
                <LinearGradient colors={['#FDE68A', ARENA_GOLD, ARENA_GOLD_DEEP, '#92400E']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.frame}>
                  <Image
                    source={{ uri: winnerImage as string }}
                    style={styles.poster}
                    contentFit="cover"
                    priority="high"
                    cachePolicy="memory-disk"
                    transition={200}
                  />
                </LinearGradient>
              </Animated.View>
            </View>

            <Text style={styles.winnerName} numberOfLines={2}>{winnerName}</Text>
            <Text style={styles.fromText}>
              {t('arena.from_contenders').replace('{count}', String(bracketSize))}
            </Text>

            <View style={styles.brandRow}>
              <Image source={require('../../assets/images/header-logo.png')} style={styles.logo} contentFit="contain" />
              <Text style={styles.brandText}>
                ANIME<Text style={{ color: ARENA_GOLD }}>DEX</Text> ARENA
              </Text>
            </View>
          </View>
        </ViewShot>

        <Animated.View entering={FadeInUp.duration(450).delay(250)} style={styles.controls}>
          <View style={[styles.rateCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.rateLabel, { color: colors.subtext }]}>{t('arena.rate_quiz')}</Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => handleRate(star)} activeOpacity={0.7} style={styles.starBtn}>
                  <Ionicons name={star <= userRating ? 'star' : 'star-outline'} size={28} color={ARENA_GOLD} />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {pendingKey && !savedResultId ? (
            <TouchableOpacity
              style={[styles.secondaryBtn, { borderColor: ARENA_GOLD, backgroundColor: isDark ? 'rgba(250,204,21,0.08)' : 'rgba(250,204,21,0.15)' }]}
              onPress={() => requireAuth('arena', () => savePendingResult())}
              disabled={savingResult}
              activeOpacity={0.8}
            >
              {savingResult ? (
                <ActivityIndicator color={ARENA_GOLD} size="small" />
              ) : (
                <>
                  <Ionicons name="cloud-upload-outline" size={18} color={isDark ? ARENA_GOLD : '#A16207'} />
                  <Text style={[styles.secondaryText, { color: isDark ? ARENA_GOLD : '#A16207' }]}>{t('guest.save_score')}</Text>
                </>
              )}
            </TouchableOpacity>
          ) : pendingKey && savedResultId ? (
            <View style={styles.savedRow}>
              <Ionicons name="checkmark-circle" size={18} color="#10B981" />
              <Text style={[styles.savedText, { color: colors.subtext }]}>{t('guest.score_saved')}</Text>
            </View>
          ) : null}

          <TouchableOpacity onPress={handlePlayAgain} activeOpacity={0.88} style={styles.primaryBtn}>
            <LinearGradient colors={[ARENA_GOLD, ARENA_GOLD_DEEP]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryGradient}>
              <Ionicons name="refresh" size={20} color="#000" />
              <Text style={styles.primaryText}>{t('arena.play_again')}</Text>
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.row}>
            <TouchableOpacity
              style={[styles.secondaryBtn, styles.flex1, { borderColor: colors.border, backgroundColor: colors.card }]}
              onPress={handleShare}
              disabled={isSharing}
              activeOpacity={0.8}
            >
              {isSharing ? (
                <ActivityIndicator color={colors.text} size="small" />
              ) : (
                <>
                  <Ionicons name="share-social" size={18} color={colors.text} />
                  <Text style={[styles.secondaryText, { color: colors.text }]} numberOfLines={1}>{t('arena.share')}</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.secondaryBtn, styles.flex1, { borderColor: colors.border, backgroundColor: colors.card }]}
              onPress={() => router.replace('/arena/setup')}
              activeOpacity={0.8}
            >
              <Ionicons name="grid-outline" size={17} color={colors.text} />
              <Text style={[styles.secondaryText, { color: colors.text }]} numberOfLines={1}>{t('arena.choose_category')}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>

      <Confetti />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topGlow: { position: 'absolute', top: 0, left: 0, right: 0, height: 320 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  iconBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: 'Poppins_700Bold', fontSize: 17 },
  scroll: { paddingHorizontal: 16 },

  shotWrap: { alignItems: 'center', paddingTop: 4 },
  shareCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 28,
    overflow: 'hidden',
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 18,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: 'rgba(250,204,21,0.35)',
    backgroundColor: '#0B0B0F',
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    maxWidth: '80%',
  },
  catChipText: { fontFamily: 'Poppins_600SemiBold', fontSize: 11, letterSpacing: 0.4 },
  crown: { fontSize: 30, marginTop: 10 },
  championLabel: {
    color: ARENA_GOLD,
    fontFamily: 'Poppins_700Bold',
    fontSize: 15,
    letterSpacing: 4,
    marginTop: -2,
  },
  posterStage: { alignItems: 'center', justifyContent: 'center', marginTop: 14, marginBottom: 14 },
  halo: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(250,204,21,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  haloMid: { position: 'absolute', width: 210, height: 210, borderRadius: 105, backgroundColor: 'rgba(250,204,21,0.07)' },
  haloCore: { position: 'absolute', width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(250,204,21,0.1)' },
  frame: { padding: 4, borderRadius: 22 },
  poster: { width: 190, height: 270, borderRadius: 18, backgroundColor: '#1a1a1a' },
  winnerName: {
    color: '#FFF',
    fontFamily: 'Poppins_700Bold',
    fontSize: 22,
    lineHeight: 28,
    textAlign: 'center',
  },
  fromText: { color: 'rgba(255,255,255,0.6)', fontFamily: 'Poppins_500Medium', fontSize: 12, marginTop: 2 },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  logo: { width: 22, height: 22 },
  brandText: { color: '#FFF', fontFamily: 'Poppins_700Bold', fontSize: 12, letterSpacing: 1.5 },

  controls: { gap: 10, marginTop: 16 },
  rateCard: { alignItems: 'center', paddingVertical: 10, borderRadius: 18, borderWidth: 1, gap: 4 },
  rateLabel: { fontFamily: 'Poppins_500Medium', fontSize: 12 },
  starsRow: { flexDirection: 'row', gap: 6 },
  starBtn: { padding: 2 },
  primaryBtn: {
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: ARENA_GOLD_DEEP,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  primaryGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15 },
  primaryText: { color: '#000', fontFamily: 'Poppins_700Bold', fontSize: 16 },
  row: { flexDirection: 'row', gap: 10 },
  flex1: { flex: 1 },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 50,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 10,
  },
  secondaryText: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, flexShrink: 1 },
  savedRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  savedText: { fontFamily: 'Poppins_500Medium', fontSize: 13 },
});
