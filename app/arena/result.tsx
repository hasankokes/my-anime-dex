import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ActivityIndicator, Share, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthProvider';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import Animated, { ZoomIn, FadeInDown, FadeInUp, useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { supabase } from '../../lib/supabase';

const { width } = Dimensions.get('window');

export default function ArenaResultScreen() {
  const { winnerId, winnerName, winnerImage, category, size } = useLocalSearchParams();
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const { session } = useAuth();
  const insets = useSafeAreaInsets();
  
  const viewShotRef = useRef<ViewShot>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [userRating, setUserRating] = useState<number>(0);
  const [savedResultId, setSavedResultId] = useState<string | null>(null);
  const [savingResult, setSavingResult] = useState(false);

  // Crown bounce animation
  const crownScale = useSharedValue(1);
  useEffect(() => {
    crownScale.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: 600 }),
        withTiming(1, { duration: 600 })
      ),
      -1,
      true
    );
  }, []);

  const crownAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: crownScale.value }],
  }));

  // Automatically save result to arena_results on mount
  useEffect(() => {
    saveQuizResult();
  }, []);

  const saveQuizResult = async () => {
    if (!winnerId || !winnerName) return;
    try {
      setSavingResult(true);
      const parsedSize = parseInt(size as string, 10) || 16;
      const parsedWinnerId = parseInt(winnerId as string, 10) || 0;
      const categoryName = (category as string) || 'all_time_anime';

      const insertPayload = {
        user_id: session?.user?.id || null,
        category: categoryName,
        size: parsedSize,
        winner_id: parsedWinnerId,
        winner_name: winnerName as string,
        winner_image: (winnerImage as string) || '',
        rating: 0,
      };

      const { data, error } = await supabase
        .from('arena_results')
        .insert(insertPayload)
        .select('id')
        .single();

      if (!error && data) {
        setSavedResultId(data.id);
      }
    } catch (err) {
      console.log('Error saving arena result:', err);
    } finally {
      setSavingResult(false);
    }
  };

  const handleRate = async (stars: number) => {
    setUserRating(stars);
    if (!savedResultId) return;

    try {
      await supabase
        .from('arena_results')
        .update({ rating: stars })
        .eq('id', savedResultId);
    } catch (err) {
      console.log('Error updating rating:', err);
    }
  };

  const handleShare = async () => {
    try {
      setIsSharing(true);
      if (viewShotRef.current && viewShotRef.current.capture) {
        const uri = await viewShotRef.current.capture();
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          const shareTitle = (t('arena.my_champion') || '{name} is my champion!').replace('{name}', (winnerName as string) || '');
          await Sharing.shareAsync(uri, {
            mimeType: 'image/png',
            dialogTitle: shareTitle,
            UTI: 'image/png',
          });
        } else {
          await Share.share({
            message: `${(winnerName as string)} won my Anime Arena championship! 🏆⚔️ #AnimeDex`,
          });
        }
      }
    } catch (error) {
      console.error('Error sharing image:', error);
    } finally {
      setIsSharing(false);
    }
  };

  const handlePlayAgain = () => {
    router.replace({
      pathname: '/arena/game',
      params: {
        category: (category as string) || 'all_time_anime',
        size: (size as string) || '16',
      },
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.replace('/arena/setup')} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {t('arena.result') || 'Result'}
        </Text>
        <TouchableOpacity onPress={() => router.replace('/(tabs)')} style={styles.closeButton}>
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      {/* Captureable Result Card */}
      <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 0.95 }} style={styles.viewShotContainer}>
        <LinearGradient
          colors={isDark ? ['#1e1b4b', '#0f172a'] : ['#fef08a', '#ffffff']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.resultCard, { borderColor: isDark ? 'rgba(250, 204, 21, 0.4)' : 'rgba(250, 204, 21, 0.7)' }]}
        >
          {/* Winner Title with Crown */}
          <View style={styles.titleSection}>
            <Animated.Text style={[styles.crownIcon, crownAnimStyle]}>👑</Animated.Text>
            <Text style={[styles.congratsText, { color: '#FACC15' }]}>
              {t('arena.your_winner') || "YOUR WINNER!"}
            </Text>
          </View>
          
          {/* Champion Image */}
          <Animated.View entering={ZoomIn.duration(650).springify()} style={styles.imageWrapper}>
            <Image 
              source={{ uri: winnerImage as string }} 
              style={styles.image} 
              contentFit="cover"
              priority="high"
              cachePolicy="memory-disk"
              transition={200}
            />
            <LinearGradient colors={['transparent', 'rgba(0,0,0,0.85)']} style={styles.gradient} />
            <Text style={styles.winnerName} numberOfLines={2}>
              {winnerName}
            </Text>
          </Animated.View>

          {/* Branding Badge */}
          <View style={styles.branding}>
            <Image source={require('../../assets/images/header-logo.png')} style={styles.logo} contentFit="contain" />
            <Text style={[styles.brandText, { color: colors.text }]}>Anime<Text style={{ color: '#FACC15' }}>Dex</Text> Arena</Text>
          </View>
        </LinearGradient>
      </ViewShot>

      {/* Interactive Controls & Rating (Not inside screenshot) */}
      <Animated.View entering={FadeInUp.duration(500).delay(200)} style={[styles.controls, { paddingBottom: insets.bottom + 16 }]}>
        {/* Star Rating Section */}
        <View style={[styles.ratingContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
          <Text style={[styles.rateLabel, { color: colors.subtext }]}>
            {t('arena.rate_quiz') || 'Rate this quiz'}
          </Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => handleRate(star)}
                activeOpacity={0.7}
                style={styles.starBtn}
              >
                <Ionicons
                  name={star <= userRating ? 'star' : 'star-outline'}
                  size={26}
                  color="#FACC15"
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonRow}>
          {/* Play Again */}
          <TouchableOpacity 
            style={styles.playAgainButton} 
            onPress={handlePlayAgain}
            activeOpacity={0.8}
          >
            <LinearGradient colors={['#3B82F6', '#2563EB']} style={styles.actionGradient}>
              <Ionicons name="refresh" size={20} color="#FFF" />
              <Text style={styles.actionBtnText}>{t('arena.play_again') || 'Play Again'}</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Share Button */}
          <TouchableOpacity 
            style={styles.shareButton} 
            onPress={handleShare}
            activeOpacity={0.8}
            disabled={isSharing}
          >
            <LinearGradient colors={['#10B981', '#059669']} style={styles.actionGradient}>
              {isSharing ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <>
                  <Ionicons name="share-social" size={20} color="#FFF" />
                  <Text style={styles.actionBtnText}>{t('arena.share') || 'Share'}</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Go Home / Categories */}
        <TouchableOpacity 
          style={[styles.homeButton, { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]} 
          onPress={() => router.replace('/arena/setup')}
          activeOpacity={0.8}
        >
          <Ionicons name="grid-outline" size={18} color={colors.text} />
          <Text style={[styles.homeButtonText, { color: colors.text }]}>{t('arena.choose_category') || 'Categories'}</Text>
        </TouchableOpacity>
      </Animated.View>
      </ScrollView>
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
  closeButton: {
    padding: 8,
    marginRight: -8,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
  },
  viewShotContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    paddingVertical: 8,
  },
  resultCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#FACC15',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
    borderWidth: 1.5,
    flexShrink: 1,
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: 12,
  },
  crownIcon: {
    fontSize: 32,
    marginBottom: 2,
  },
  congratsText: {
    fontFamily: 'Poppins_800ExtraBold',
    fontSize: 20,
    textAlign: 'center',
    letterSpacing: 2,
  },
  imageWrapper: {
    width: '100%',
    aspectRatio: 3.5 / 4,
    borderRadius: 18,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    flexShrink: 1,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 110,
    justifyContent: 'flex-end',
    padding: 16,
  },
  winnerName: {
    position: 'absolute',
    bottom: 14,
    left: 14,
    right: 14,
    color: '#FFF',
    fontSize: 21,
    fontFamily: 'Poppins_700Bold',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 10,
  },
  branding: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  logo: {
    width: 26,
    height: 26,
  },
  brandText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  // Controls
  controls: {
    gap: 10,
    marginTop: 16,
  },
  ratingContainer: {
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 16,
    gap: 6,
  },
  rateLabel: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 12,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  starBtn: {
    padding: 2,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  playAgainButton: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 5,
  },
  shareButton: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 5,
  },
  actionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  actionBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontFamily: 'Poppins_700Bold',
  },
  homeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  homeButtonText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
  },
});
