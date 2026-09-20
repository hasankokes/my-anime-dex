import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ActivityIndicator, Platform, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { supabase } from '../../lib/supabase';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
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
  runOnJS,
  Easing,
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

// Fisher-Yates shuffle
const shuffleArray = (array: any[]) => {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
};

export default function ArenaGameScreen() {
  const { category, size } = useLocalSearchParams();
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentRoundItems, setCurrentRoundItems] = useState<any[]>([]);
  const [nextRoundItems, setNextRoundItems] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [roundName, setRoundName] = useState('');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [matchKey, setMatchKey] = useState(0); // Force re-render on new match

  const targetSize = parseInt(size as string) || 16;
  const categoryName = (category as string) || 'all_time_anime';

  // VS badge pulse animation
  const vsPulse = useSharedValue(1);
  
  useEffect(() => {
    vsPulse.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const vsAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: vsPulse.value }],
  }));

  // Progress bar animation
  const progressWidth = useSharedValue(0);
  const progressAnimStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value * 100}%` as any,
  }));

  useEffect(() => {
    fetchContestants();
  }, []);

  const fetchContestants = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: sbError } = await supabase
        .from('arena_pools')
        .select('*')
        .eq('category', categoryName);

      if (sbError) throw sbError;

      if (!data || data.length < 2) {
        throw new Error('Not enough contestants found for this category.');
      }

      let shuffled = shuffleArray(data);
      let actualSize = targetSize;
      if (shuffled.length < targetSize) {
        const power = Math.floor(Math.log2(shuffled.length));
        actualSize = Math.pow(2, power);
      }

      const contestants = shuffled.slice(0, actualSize);
      setCurrentRoundItems(contestants);
      updateRoundName(actualSize);
      
      // Set initial progress
      progressWidth.value = withTiming(1 / (actualSize / 2), { duration: 500 });
      
      setLoading(false);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred while loading data.');
      setLoading(false);
    }
  };

  const updateRoundName = (remaining: number) => {
    if (remaining === 2) setRoundName(t('arena.final') || 'FINAL');
    else if (remaining === 4) setRoundName(t('arena.semi_final') || 'SEMI FINAL');
    else if (remaining === 8) setRoundName(t('arena.quarter_final') || 'QUARTER FINAL');
    else setRoundName(`${t('arena.round') || 'Round'} (${remaining})`);
  };

  const handleQuit = () => {
    if (Platform.OS === 'web') {
      if (window.confirm(t('arena.quit_confirm') || 'Are you sure you want to quit? Your battle progress will be lost.')) {
        router.back();
      }
    } else {
      Alert.alert(
        t('arena.quit_title') || 'Quit Battle',
        t('arena.quit_confirm') || 'Are you sure you want to quit? Your battle progress will be lost.',
        [
          { text: t('common.cancel') || 'Cancel', style: 'cancel' },
          {
            text: t('arena.quit_button') || 'Quit',
            style: 'destructive',
            onPress: () => router.back()
          }
        ]
      );
    }
  };

  const handlePick = (winner: any, loser: any) => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    
    // Fire and forget stats
    updateStats(winner.item_id, winner.name, true);
    updateStats(loser.item_id, loser.name, false);

    const updatedNextRound = [...nextRoundItems, winner];

    // Delay to allow animation
    setTimeout(() => {
      if (currentIndex + 2 >= currentRoundItems.length) {
        if (updatedNextRound.length === 1) {
          // Tournament over
          router.replace({
            pathname: '/arena/result',
            params: {
              winnerId: String(updatedNextRound[0].item_id),
              winnerName: String(updatedNextRound[0].name || ''),
              winnerImage: String(updatedNextRound[0].image_url || ''),
              category: String(categoryName || ''),
              size: String(targetSize || '16'),
            }
          });
        } else {
          // New round
          setCurrentRoundItems(updatedNextRound);
          setNextRoundItems([]);
          setCurrentIndex(0);
          updateRoundName(updatedNextRound.length);
          progressWidth.value = withTiming(1 / (updatedNextRound.length / 2), { duration: 400 });
          setMatchKey(prev => prev + 1);
        }
      } else {
        // Next match in same round
        setNextRoundItems(updatedNextRound);
        const newIdx = currentIndex + 2;
        setCurrentIndex(newIdx);
        const totalInRound = currentRoundItems.length / 2;
        const matchNum = (newIdx / 2) + 1;
        progressWidth.value = withTiming(matchNum / totalInRound, { duration: 400 });
        setMatchKey(prev => prev + 1);
      }
      setIsTransitioning(false);
    }, 250);
  };

  const updateStats = async (itemId: number, name: string, isWin: boolean) => {
    try {
      const { data, error } = await supabase.rpc('increment_arena_stats', {
        p_item_id: itemId,
        p_name: name,
        p_is_win: isWin,
        p_type: 'anime'
      });
      if (error) {
        const { data: curr } = await supabase.from('arena_stats').select('*').eq('item_id', itemId).single();
        if (curr) {
          await supabase.from('arena_stats').update({
            wins: curr.wins + (isWin ? 1 : 0),
            losses: curr.losses + (!isWin ? 1 : 0),
            total_matches: curr.total_matches + 1
          }).eq('item_id', itemId);
        } else {
          await supabase.from('arena_stats').insert({
            item_id: itemId,
            name: name,
            wins: isWin ? 1 : 0,
            losses: !isWin ? 1 : 0,
            total_matches: 1,
            type: 'anime'
          });
        }
      }
    } catch (e) {
      // Silent fail
    }
  };

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FACC15" />
          <Text style={[styles.loadingText, { color: colors.subtext }]}>
            Loading contestants...
          </Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background, padding: 20 }]}>
        <View style={styles.errorBox}>
          <Ionicons name="warning" size={48} color="#EF4444" style={{ marginBottom: 16 }} />
          <Text style={[styles.errorText, { color: colors.text }]}>{error}</Text>
          <TouchableOpacity style={styles.errorBackButton} onPress={() => router.back()}>
            <Text style={styles.backText}>{t('arena.go_back') || 'Go Back'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const item1 = currentRoundItems[currentIndex];
  const item2 = currentRoundItems[currentIndex + 1];

  if (!item1 || !item2) return null;

  const totalMatchesInRound = currentRoundItems.length / 2;
  const currentMatch = (currentIndex / 2) + 1;

  // Get full resolution image
  const getFullImage = (url: string) => {
    if (!url) return '';
    return url;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={handleQuit} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={[styles.roundText, { color: colors.text }]}>{roundName}</Text>
          <Text style={[styles.matchText, { color: colors.subtext }]}>
            {t('arena.match') || 'Match'} {currentMatch}/{totalMatchesInRound}
          </Text>
        </View>

        <TouchableOpacity
          onPress={handleQuit}
          style={[
            styles.quitPill,
            {
              backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)',
              borderColor: isDark ? 'rgba(239, 68, 68, 0.35)' : 'rgba(239, 68, 68, 0.25)',
            }
          ]}
        >
          <Ionicons name="exit-outline" size={15} color="#EF4444" style={{ marginRight: 4 }} />
          <Text style={styles.quitPillText}>{t('arena.quit_button') || 'Quit'}</Text>
        </TouchableOpacity>
      </View>

      {/* Animated Progress Bar */}
      <View style={[styles.progressContainer, { backgroundColor: isDark ? 'rgba(250,204,21,0.1)' : 'rgba(250,204,21,0.15)' }]}>
        <Animated.View style={[styles.progressBar, progressAnimStyle]}>
          <LinearGradient
            colors={['#FACC15', '#F59E0B']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.progressGradient}
          />
        </Animated.View>
      </View>

      {/* VS Arena */}
      <View style={styles.arena} key={matchKey}>
        {/* Top Card */}
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.85}
          onPress={() => handlePick(item1, item2)}
          disabled={isTransitioning}
        >
          <Animated.View entering={SlideInLeft.duration(450).springify()} style={styles.cardInner}>
            <Image
              source={{ uri: item1.image_url }}
              style={styles.cardImage}
              contentFit="cover"
              priority="high"
              cachePolicy="memory-disk"
              transition={200}
            />
            {/* Top Gradient for text readability */}
            <LinearGradient
              colors={['rgba(0,0,0,0.88)', 'rgba(0,0,0,0.4)', 'transparent']}
              style={styles.cardGradientTop}
            />
            {/* Name overlay at top */}
            <View style={styles.nameContainerTop}>
              <Text style={styles.nameText} numberOfLines={2}>{item1.name}</Text>
            </View>
            {/* Tap hint */}
            <View style={styles.tapHintTop}>
              <Ionicons name="hand-left" size={14} color="rgba(255,255,255,0.7)" />
            </View>
          </Animated.View>
        </TouchableOpacity>

        {/* VS Badge */}
        <View style={styles.vsContainer}>
          <Animated.View style={[styles.vsBadge, vsAnimatedStyle]}>
            <LinearGradient
              colors={['#EF4444', '#DC2626']}
              style={styles.vsGradient}
            >
              <Text style={styles.vsText}>VS</Text>
            </LinearGradient>
          </Animated.View>
          {/* Bottom Line */}
        <View style={[styles.vsLine, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)', top: '75%' }]} />
      </View>

        {/* Bottom Card */}
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.85}
          onPress={() => handlePick(item2, item1)}
          disabled={isTransitioning}
        >
          <Animated.View entering={SlideInRight.duration(450).springify()} style={styles.cardInner}>
            <Image
              source={{ uri: item2.image_url }}
              style={styles.cardImage}
              contentFit="cover"
              priority="high"
              cachePolicy="memory-disk"
              transition={200}
            />
            {/* Bottom Gradient for text readability */}
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.88)']}
              style={styles.cardGradientBottom}
            />
            {/* Name overlay at bottom */}
            <View style={styles.nameContainerBottom}>
              <Text style={styles.nameText} numberOfLines={2}>{item2.name}</Text>
            </View>
            <View style={styles.tapHintBottom}>
              <Ionicons name="hand-left" size={14} color="rgba(255,255,255,0.7)" />
            </View>
          </Animated.View>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 14,
  },
  container: {
    flex: 1,
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerCenter: {
    alignItems: 'center',
  },
  roundText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  matchText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 12,
  },
  quitPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  quitPillText: {
    color: '#EF4444',
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
  },
  // Progress
  progressContainer: {
    height: 3,
    width: '100%',
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    overflow: 'hidden',
  },
  progressGradient: {
    flex: 1,
  },
  // Arena
  arena: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    gap: 0,
    justifyContent: 'center',
  },
  card: {
    flex: 1,
    maxHeight: (height - 200) / 2,
    borderRadius: 20,
    overflow: 'hidden',
  },
  cardInner: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardGradientTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  cardGradientBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  nameContainerTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    padding: 14,
    paddingTop: 12,
  },
  nameContainerBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 14,
    paddingBottom: 12,
  },
  nameText: {
    color: '#FFF',
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  tapHintTop: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tapHintBottom: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // VS Badge
  vsContainer: {
    height: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  vsBadge: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: 26,
    overflow: 'hidden',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 15,
  },
  vsGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(0,0,0,0.3)',
    borderRadius: 26,
  },
  vsText: {
    color: '#FFF',
    fontFamily: 'Poppins_800ExtraBold',
    fontSize: 16,
    letterSpacing: 1,
  },
  vsLine: {
    position: 'absolute',
    height: 1,
    left: 20,
    right: 20,
    zIndex: -1,
  },
  // Error
  errorBox: {
    alignItems: 'center',
  },
  errorText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  errorBackButton: {
    backgroundColor: '#374151',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backText: {
    color: '#FFF',
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
  },
});
