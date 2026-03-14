import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  runOnJS,
  Easing,
  withRepeat,
  FadeIn,
  cancelAnimation
} from 'react-native-reanimated';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { supabase } from '../../lib/supabase';
import { Anime, jikanApi } from '../../lib/jikan';

const { width, height } = Dimensions.get('window');

interface Props {
  visible: boolean;
  onClose: () => void;
}

export const DiceRollModal = ({ visible, onClose }: Props) => {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();

  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<Anime | null>(null);
  const [isRolling, setIsRolling] = useState(false);

  // Animation values
  const rotation = useSharedValue(0);
  const scale = useSharedValue(1);
  const diceOpacity = useSharedValue(1);
  const resultOpacity = useSharedValue(0);
  const resultScale = useSharedValue(0.8);

  // Reset state when opened
  useEffect(() => {
    if (visible && !result) {
      rollDice();
    } else if (!visible) {
      // Stop any running animations
      rotation.value = 0;
      scale.value = 1;
      
      // Small delay to ensure exit animation finishes
      setTimeout(() => {
        setResult(null);
        diceOpacity.value = 1;
        resultOpacity.value = 0;
        resultScale.value = 0.8;
      }, 300);
    }
  }, [visible]);

  const rollDice = async () => {
    console.log('[DiceRoll] Starting dice roll...');
    setIsRolling(true);
    setIsLoading(true);
    setResult(null);

    // Initial animation setup
    diceOpacity.value = withTiming(1, { duration: 100 });
    resultOpacity.value = withTiming(0, { duration: 100 });
    resultScale.value = 0.8;
    
    // Start rolling animation
    cancelAnimation(rotation);
    cancelAnimation(scale);
    rotation.value = 0;
    
    rotation.value = withRepeat(
      withTiming(360, { duration: 1000, easing: Easing.bezier(0.4, 0, 0.2, 1) }),
      -1, // infinite
      false
    );
    scale.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 500 }),
        withTiming(1.0, { duration: 500 })
      ),
      -1,
      true
    );

    try {
      console.log('[DiceRoll] Fetching session...');
      // 1. Get user session & current list (to filter out)
      const { data: { session } } = await supabase.auth.getSession();
      let excludedIds = new Set<number>();
      
      if (session) {
        console.log('[DiceRoll] User logged in, fetching their anime list...');
        const { data: userAnime, error } = await supabase
          .from('user_anime_list')
          .select('anime_id')
          .eq('user_id', session.user.id);
          
        if (error) {
          console.error('[DiceRoll] Error fetching user_anime_list:', error);
        }
        if (userAnime) {
          userAnime.forEach(item => excludedIds.add(parseInt(item.anime_id)));
        }
      } else {
        console.log('[DiceRoll] No session, proceeding without filtering user list.');
      }

      console.log(`[DiceRoll] Excluded IDs count: ${excludedIds.size}`);

      // 2. Fetch popular anime pool (randomize page to get varied results)
      const randomPage = Math.floor(Math.random() * 5) + 1; // Top 5 pages (125 anime)
      console.log(`[DiceRoll] Fetching top anime from page ${randomPage}...`);
      const response = await jikanApi.getPopularAnime(randomPage);
      
      console.log(`[DiceRoll] Received popular anime response. Data length: ${response?.data?.length || 0}`);
      if (response && response.data) {
        // 3. Filter out excluded IDs
        const availableAnime = response.data.filter(a => !excludedIds.has(a.mal_id));
        console.log(`[DiceRoll] Available anime after filtering: ${availableAnime.length}`);
        
        if (availableAnime.length > 0) {
          // Select random
          const randomIndex = Math.floor(Math.random() * availableAnime.length);
          const selected = availableAnime[randomIndex];
          console.log(`[DiceRoll] Selected anime: ${selected.title_english || selected.title}`);
          
          // Ensure minimum animation time
          setTimeout(() => {
            finishAction(selected);
          }, 1000);
        } else {
          // Fallback if somehow all 125 are in user list (rare but possible)
          const fallback = response.data[Math.floor(Math.random() * response.data.length)];
          console.log(`[DiceRoll] Fallback anime selected: ${fallback.title_english || fallback.title}`);
          setTimeout(() => {
            finishAction(fallback);
          }, 1000);
        }
      } else {
        throw new Error('No data received from Jikan API');
      }
    } catch (error) {
      console.error('[DiceRoll] Critical Error rolling dice:', error);
      setIsLoading(false);
      setIsRolling(false);
      rotation.value = 0;
    }
  };

  const finishAction = (anime: Anime) => {
    // Stop rolling
    rotation.value = 0;
    scale.value = withTiming(1, { duration: 200 });
    
    // Fade out dice, fade in result
    diceOpacity.value = withTiming(0, { duration: 300 }, () => {
      runOnJS(setActualResult)(anime);
    });
  };

  const setActualResult = (anime: Anime) => {
    setResult(anime);
    setIsLoading(false);
    setIsRolling(false);
    
    // Animate result card in
    resultOpacity.value = withTiming(1, { duration: 400 });
    resultScale.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.back(1.5)) });
  };

  const animatedDiceStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { rotateZ: `${rotation.value}deg` },
        { scale: scale.value }
      ],
      opacity: diceOpacity.value
    };
  });

  const animatedResultStyle = useAnimatedStyle(() => {
    return {
      opacity: resultOpacity.value,
      transform: [
        { scale: resultScale.value }
      ]
    };
  });

  const handleCardPress = () => {
    if (result) {
      onClose();
      router.push(`/anime/${result.mal_id}`);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <BlurView intensity={20} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
        
        {/* Dice Animation View */}
        <Animated.View 
          style={styles.diceContainer}
          pointerEvents={(!result || isRolling) ? 'auto' : 'none'}
        >
          <Animated.View style={animatedDiceStyle}>
            <View style={styles.diceOuterGlow}>
              <View style={[styles.diceInnerCircle, { backgroundColor: isDark ? '#2D3748' : '#FFF' }]}>
                <Ionicons name="dice-outline" size={60} color="#FACC15" />
              </View>
            </View>
          </Animated.View>
          <Text style={[styles.rollingText, { color: '#FFF' }]}>
            {t('home.forYou.rolling')}
          </Text>
        </Animated.View>

        {/* Result Card */}
        {result && (
          <Animated.View 
            style={[styles.resultCardContainer, animatedResultStyle]}
            pointerEvents={(!isRolling) ? 'auto' : 'none'}
          >
            <TouchableOpacity 
              activeOpacity={0.9} 
              onPress={handleCardPress}
              style={[styles.resultCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <Image
                source={{ uri: result.images.jpg.large_image_url }}
                style={styles.cardImage}
                contentFit="cover"
              />
              <View style={styles.cardContent}>
                <View style={styles.cardHeaderRow}>
                  <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>
                    {result.title_english || result.title}
                  </Text>
                  {result.score ? (
                    <View style={styles.scoreBadge}>
                      <Ionicons name="star" size={14} color="#FFF" />
                      <Text style={styles.scoreText}>{result.score}</Text>
                    </View>
                  ) : null}
                </View>
                
                <View style={styles.genreRow}>
                  {result.genres?.slice(0, 3).map(g => (
                    <View key={g.name} style={[styles.genreTag, { backgroundColor: colors.border }]}>
                      <Text style={[styles.genreText, { color: colors.subtext }]}>{g.name}</Text>
                    </View>
                  ))}
                </View>

                {result.synopsis && (
                  <Text style={[styles.synopsisText, { color: colors.subtext }]} numberOfLines={3}>
                    {result.synopsis}
                  </Text>
                )}
              </View>
            </TouchableOpacity>

            {/* Action Buttons */}
            <View style={styles.actionRow}>
              <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]}
                onPress={rollDice}
              >
                <Text style={[styles.actionButtonText, { color: colors.text }]}>
                  {t('home.forYou.rollAgain')}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: '#FACC15' }]}
                onPress={handleCardPress}
              >
                <Text style={[styles.actionButtonText, { color: '#000' }]}>
                  {t('home.forYou.goToDetail')}
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  diceContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  diceOuterGlow: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(250, 204, 21, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FACC15',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  diceInnerCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  rollingText: {
    marginTop: 20,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
    color: '#FFF',
    letterSpacing: 1,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  resultCardContainer: {
    width: width * 0.85,
    alignItems: 'center',
  },
  resultCard: {
    width: '100%',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
    marginBottom: 20,
  },
  cardImage: {
    width: '100%',
    height: 200,
  },
  cardContent: {
    padding: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardTitle: {
    flex: 1,
    fontFamily: 'Poppins_700Bold',
    fontSize: 18,
    marginRight: 10,
    lineHeight: 24,
  },
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  scoreText: {
    color: '#FFF',
    fontFamily: 'Poppins_700Bold',
    fontSize: 12,
  },
  genreRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  genreTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  genreText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 10,
  },
  synopsisText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    lineHeight: 20,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  actionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  actionButtonText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
  }
});
