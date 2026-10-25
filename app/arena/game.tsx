import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform, Alert, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  FadeOut,
  ZoomIn,
  SlideInLeft,
  SlideInRight,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { PosterImage } from '../../components/PosterImage';
import { VsMark } from '../../components/Arena/VsMark';
import { ARENA_GOLD, getArenaCategory, getRoundLabel } from '../../components/Arena/arenaTheme';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { supabase } from '../../lib/supabase';
import { analytics } from '../../lib/analytics';

// AniList covers are roughly 0.7 wide per 1 tall
const POSTER_ASPECT = 0.7;
// Below this side width the name doesn't fit next to the poster; fall back to the stacked layout
const MIN_SIDE_WIDTH = 100;
const NAME_OVERLAY_HEIGHT = 58;
// Long enough to see the pick land, short enough not to feel slow over 31 picks
const PICK_FEEDBACK_MS = 420;
const ROUND_INTRO_MS = 1100;

const shuffleArray = <T,>(array: T[]) => {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
};

type Side = 'top' | 'bottom';

export default function ArenaGameScreen() {
  const { category, size } = useLocalSearchParams();
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentRoundItems, setCurrentRoundItems] = useState<any[]>([]);
  const [nextRoundItems, setNextRoundItems] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [picked, setPicked] = useState<Side | null>(null);
  const [roundIntro, setRoundIntro] = useState<string | null>(null);
  const [matchKey, setMatchKey] = useState(0);
  const [cardSize, setCardSize] = useState<{ width: number; height: number } | null>(null);

  const pickLockRef = useRef(false);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const gameStatsRef = useRef({ startedAt: 0, picks: 0, bracketSize: 0, completed: false });

  const targetSize = parseInt(size as string) || 16;
  const categoryName = (category as string) || 'all_time_anime';
  const cat = getArenaCategory(categoryName);

  const later = (fn: () => void, ms: number) => {
    timeoutsRef.current.push(setTimeout(fn, ms));
  };

  useEffect(() => {
    fetchContestants();
    return () => {
      timeoutsRef.current.forEach(clearTimeout);
      const stats = gameStatsRef.current;
      if (stats.startedAt && !stats.completed) {
        analytics.track('arena_game_abandoned', {
          category: categoryName,
          bracket_size: stats.bracketSize,
          picks: stats.picks,
          total_picks: stats.bracketSize - 1,
          seconds_played: Math.round((Date.now() - stats.startedAt) / 1000),
        });
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Idle VS breathing
  const vsPulse = useSharedValue(1);
  useEffect(() => {
    vsPulse.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 900, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const vsStyle = useAnimatedStyle(() => ({ transform: [{ scale: vsPulse.value }] }));

  // Pick feedback: winner pops, loser sinks
  const topScale = useSharedValue(1);
  const bottomScale = useSharedValue(1);
  const topOpacity = useSharedValue(1);
  const bottomOpacity = useSharedValue(1);
  const topStyle = useAnimatedStyle(() => ({ transform: [{ scale: topScale.value }], opacity: topOpacity.value }));
  const bottomStyle = useAnimatedStyle(() => ({ transform: [{ scale: bottomScale.value }], opacity: bottomOpacity.value }));

  const resetCards = () => {
    topScale.value = 1;
    bottomScale.value = 1;
    topOpacity.value = 1;
    bottomOpacity.value = 1;
  };

  const showRoundIntro = (remaining: number) => {
    setRoundIntro(getRoundLabel(remaining, t));
    later(() => setRoundIntro(null), ROUND_INTRO_MS);
  };

  const fetchContestants = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error: sbError } = await supabase.from('arena_pools').select('*').eq('category', categoryName);
      if (sbError) throw sbError;
      if (!data || data.length < 2) throw new Error('Not enough contestants found for this category.');

      const shuffled = shuffleArray(data);
      let actualSize = targetSize;
      if (shuffled.length < targetSize) actualSize = Math.pow(2, Math.floor(Math.log2(shuffled.length)));

      const contestants = shuffled.slice(0, actualSize);
      gameStatsRef.current = { startedAt: Date.now(), picks: 0, bracketSize: actualSize, completed: false };
      analytics.track('arena_game_started', { category: categoryName, bracket_size: actualSize });
      setCurrentRoundItems(contestants);
      setLoading(false);
      showRoundIntro(actualSize);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred while loading data.');
      setLoading(false);
    }
  };

  const handleQuit = () => {
    const message = t('arena.quit_confirm');
    if (Platform.OS === 'web') {
      if (window.confirm(message)) router.back();
      return;
    }
    Alert.alert(t('arena.quit_title'), message, [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('arena.quit_button'), style: 'destructive', onPress: () => router.back() },
    ]);
  };

  const handlePick = (side: Side) => {
    if (pickLockRef.current || roundIntro) return;
    pickLockRef.current = true;
    setPicked(side);

    const [winScale, loseScale, loseOpacity] = side === 'top'
      ? [topScale, bottomScale, bottomOpacity]
      : [bottomScale, topScale, topOpacity];
    winScale.value = withSequence(withSpring(1.04, { damping: 10, stiffness: 260 }), withTiming(1.02, { duration: 150 }));
    loseScale.value = withTiming(0.94, { duration: 260 });
    loseOpacity.value = withTiming(0.3, { duration: 260 });

    const winner = side === 'top' ? currentRoundItems[currentIndex] : currentRoundItems[currentIndex + 1];
    const updatedNextRound = [...nextRoundItems, winner];
    gameStatsRef.current.picks += 1;

    later(() => {
      if (currentIndex + 2 >= currentRoundItems.length) {
        if (updatedNextRound.length === 1) {
          const stats = gameStatsRef.current;
          stats.completed = true;
          analytics.track('arena_game_completed', {
            category: categoryName,
            bracket_size: stats.bracketSize,
            winner_id: String(winner.item_id),
            winner_name: String(winner.name || ''),
            seconds_played: Math.round((Date.now() - stats.startedAt) / 1000),
          });
          router.replace({
            pathname: '/arena/result',
            params: {
              winnerId: String(winner.item_id),
              winnerName: String(winner.name || ''),
              winnerImage: String(winner.image_url || ''),
              category: categoryName,
              size: String(stats.bracketSize || targetSize),
            },
          });
          return;
        }
        setCurrentRoundItems(updatedNextRound);
        setNextRoundItems([]);
        setCurrentIndex(0);
        showRoundIntro(updatedNextRound.length);
      } else {
        setNextRoundItems(updatedNextRound);
        setCurrentIndex(currentIndex + 2);
      }
      resetCards();
      setPicked(null);
      setMatchKey(k => k + 1);
      pickLockRef.current = false;
    }, PICK_FEEDBACK_MS);
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <VsMark size={64} />
        <ActivityIndicator color={ARENA_GOLD} style={{ marginTop: 20 }} />
        <Text style={[styles.loadingText, { color: colors.subtext }]}>{t('arena.loading_contestants')}</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, padding: 24 }]}>
        <Ionicons name="warning" size={44} color="#EF4444" />
        <Text style={[styles.errorText, { color: colors.text }]}>{error}</Text>
        <TouchableOpacity style={[styles.errorBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => router.back()}>
          <Text style={[styles.errorBtnText, { color: colors.text }]}>{t('arena.go_back')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const item1 = currentRoundItems[currentIndex];
  const item2 = currentRoundItems[currentIndex + 1];
  if (!item1 || !item2) return null;

  const totalMatches = currentRoundItems.length / 2;
  const currentMatch = currentIndex / 2 + 1;
  const roundLabel = getRoundLabel(currentRoundItems.length, t);
  const isFinal = currentRoundItems.length === 2;

  const sideWidth = cardSize ? cardSize.width - Math.min(cardSize.width, cardSize.height * POSTER_ASPECT) : 0;
  const sideLayout = sideWidth >= MIN_SIDE_WIDTH;

  // Shrink the side name so its longest word fits on one line instead of breaking mid-word
  const sideNameFont = (name: string) => {
    const longest = Math.max(...String(name || '').split(/\s+/).map(w => w.length), 1);
    const fontSize = Math.max(11, Math.min(17, Math.floor((sideWidth - 24) / (longest * 0.66))));
    return { fontSize, lineHeight: Math.round(fontSize * 1.35) };
  };

  const renderCard = (item: any, side: Side) => {
    const isWinner = picked === side;
    const posterOnLeft = side === 'top';
    return (
      <>
        {sideLayout ? (
          <>
            <PosterImage
              uri={item.image_url}
              style={StyleSheet.absoluteFill}
              posterInset={posterOnLeft ? { right: sideWidth } : { left: sideWidth }}
              priority="high"
            />
            <LinearGradient
              colors={posterOnLeft ? ['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.6)'] : ['rgba(0,0,0,0.6)', 'rgba(0,0,0,0.1)']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={[styles.sideColumn, { width: sideWidth }, posterOnLeft ? { right: 0 } : { left: 0 }]}
            />
            <View style={[styles.sideColumn, styles.sideName, { width: sideWidth }, posterOnLeft ? { right: 0 } : { left: 0 }]}>
              <Text style={[styles.sideNameText, sideNameFont(item.name)]} numberOfLines={4}>{item.name}</Text>
            </View>
          </>
        ) : (
          <>
            <PosterImage
              uri={item.image_url}
              style={StyleSheet.absoluteFill}
              posterInset={side === 'top' ? { top: NAME_OVERLAY_HEIGHT } : { bottom: NAME_OVERLAY_HEIGHT }}
              priority="high"
            />
            <LinearGradient
              colors={side === 'top' ? ['rgba(0,0,0,0.9)', 'transparent'] : ['transparent', 'rgba(0,0,0,0.9)']}
              style={[styles.nameShade, side === 'top' ? { top: 0 } : { bottom: 0 }]}
            />
            <View style={[styles.stackedName, side === 'top' ? { top: 0 } : { bottom: 0 }]}>
              <Text style={styles.nameText} numberOfLines={2}>{item.name}</Text>
            </View>
          </>
        )}
        {/* Selection ring + badge */}
        <View
          pointerEvents="none"
          style={[styles.ring, { borderColor: isWinner ? ARENA_GOLD : 'rgba(255,255,255,0.08)', borderWidth: isWinner ? 3 : 1 }]}
        />
        {isWinner && (
          <Animated.View entering={ZoomIn.duration(220)} style={styles.winBadge}>
            <Ionicons name="checkmark" size={20} color="#000" />
          </Animated.View>
        )}
      </>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      {/* Category glow behind the stage */}
      <LinearGradient
        colors={[`${cat.color}${isDark ? '33' : '26'}`, 'transparent']}
        style={styles.stageGlow}
        pointerEvents="none"
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleQuit} style={[styles.iconBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}>
          <Ionicons name="close" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={[styles.roundPill, { backgroundColor: isFinal ? ARENA_GOLD : `${cat.color}26` }]}>
            {isFinal && <Ionicons name="trophy" size={12} color="#000" />}
            <Text style={[styles.roundText, { color: isFinal ? '#000' : (isDark ? '#FFF' : colors.text) }]} numberOfLines={1}>
              {roundLabel}
            </Text>
          </View>
          <Text style={[styles.matchText, { color: colors.subtext }]}>
            {t('arena.match')} {currentMatch}/{totalMatches}
          </Text>
        </View>
        <View style={[styles.iconBtn, { backgroundColor: `${cat.color}22` }]}>
          <Ionicons name={cat.icon as any} size={18} color={cat.color} />
        </View>
      </View>

      {/* Match pips: done / current / upcoming in this round */}
      <View style={styles.pipRow}>
        {Array.from({ length: totalMatches }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.pip,
              {
                backgroundColor:
                  i < currentMatch - 1 ? ARENA_GOLD : i === currentMatch - 1 ? cat.color : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'),
                flex: i === currentMatch - 1 ? 2 : 1,
              },
            ]}
          />
        ))}
      </View>

      {/* Stage */}
      <View style={styles.stage} key={matchKey}>
        <Animated.View entering={SlideInLeft.duration(320)} style={[styles.cardWrap, topStyle]}>
          <Pressable
            style={styles.card}
            onPress={() => handlePick('top')}
            onLayout={(e) => {
              const { width: w, height: h } = e.nativeEvent.layout;
              if (!cardSize || cardSize.width !== w || cardSize.height !== h) setCardSize({ width: w, height: h });
            }}
          >
            {renderCard(item1, 'top')}
          </Pressable>
        </Animated.View>

        <View style={styles.vsRow} pointerEvents="none">
          <View style={[styles.vsLine, { backgroundColor: isDark ? 'rgba(250,204,21,0.25)' : 'rgba(0,0,0,0.1)' }]} />
          <Animated.View style={vsStyle}>
            <VsMark size={58} />
          </Animated.View>
          <View style={[styles.vsLine, { backgroundColor: isDark ? 'rgba(250,204,21,0.25)' : 'rgba(0,0,0,0.1)' }]} />
        </View>

        <Animated.View entering={SlideInRight.duration(320)} style={[styles.cardWrap, bottomStyle]}>
          <Pressable style={styles.card} onPress={() => handlePick('bottom')}>
            {renderCard(item2, 'bottom')}
          </Pressable>
        </Animated.View>
      </View>

      {matchKey === 0 && !roundIntro && (
        <Animated.Text entering={FadeIn.delay(200)} style={[styles.hint, { color: colors.subtext }]}>
          {t('arena.tap_to_pick')}
        </Animated.Text>
      )}

      {/* Round intro overlay */}
      {roundIntro && (
        <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(220)} style={styles.introOverlay}>
          <Animated.View entering={ZoomIn.duration(420).springify().damping(12)} style={styles.introInner}>
            <VsMark size={72} />
            <Text style={styles.introText}>{roundIntro}</Text>
            <Text style={[styles.introSub, { color: cat.color }]}>{t(cat.labelKey)}</Text>
          </Animated.View>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontFamily: 'Poppins_500Medium', fontSize: 13, marginTop: 10 },
  errorText: { fontFamily: 'Poppins_500Medium', fontSize: 15, textAlign: 'center', marginVertical: 20, lineHeight: 22 },
  errorBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14, borderWidth: 1 },
  errorBtnText: { fontFamily: 'Poppins_600SemiBold', fontSize: 14 },

  stageGlow: { position: 'absolute', top: 0, left: 0, right: 0, height: 260 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 6,
  },
  iconBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { alignItems: 'center', flex: 1, marginHorizontal: 10 },
  roundPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },
  roundText: { fontFamily: 'Poppins_700Bold', fontSize: 13, letterSpacing: 0.8 },
  matchText: { fontFamily: 'Poppins_500Medium', fontSize: 11, marginTop: 2 },

  pipRow: { flexDirection: 'row', gap: 3, paddingHorizontal: 16, marginTop: 10 },
  pip: { height: 4, borderRadius: 2 },

  stage: { flex: 1, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  cardWrap: { flex: 1 },
  card: { flex: 1, borderRadius: 24, overflow: 'hidden', backgroundColor: '#111' },
  ring: { ...StyleSheet.absoluteFillObject, borderRadius: 24 },
  winBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: ARENA_GOLD,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: ARENA_GOLD,
    shadowOpacity: 0.7,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  nameShade: { position: 'absolute', left: 0, right: 0, height: '45%' },
  stackedName: { position: 'absolute', left: 0, right: 0, paddingHorizontal: 18, paddingVertical: 14 },
  nameText: {
    color: '#FFF',
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  sideColumn: { position: 'absolute', top: 0, bottom: 0 },
  sideName: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  sideNameText: {
    color: '#FFF',
    fontSize: 17,
    lineHeight: 23,
    fontFamily: 'Poppins_700Bold',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },

  vsRow: {
    height: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
    gap: 6,
  },
  vsLine: { flex: 1, height: 1 },

  hint: { textAlign: 'center', fontFamily: 'Poppins_500Medium', fontSize: 12, paddingBottom: 6 },

  introOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5,5,8,0.82)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
  },
  introInner: { alignItems: 'center', paddingHorizontal: 24 },
  introText: {
    color: '#FFF',
    fontFamily: 'Poppins_700Bold',
    fontSize: 34,
    letterSpacing: 1.5,
    textAlign: 'center',
    marginTop: 18,
  },
  introSub: { fontFamily: 'Poppins_700Bold', fontSize: 13, letterSpacing: 1, marginTop: 4, textAlign: 'center' },
});
