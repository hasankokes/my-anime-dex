import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, ScrollView, Modal, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthProvider';
import { recommendationService, UserGenreProfile, ScoredAnime } from '../services/recommendationService';

export default function RecommendationsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t, language } = useLanguage();
  const { session } = useAuth();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserGenreProfile | null>(null);
  const [recommendations, setRecommendations] = useState<ScoredAnime[]>([]);
  const [showTipModal, setShowTipModal] = useState(false);

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const fetchRecommendations = async () => {
    if (!session) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      // 1. Get genre profile
      const { profile: userProfile, excludedIds } = await recommendationService.getUserProfile(session.user.id);
      setProfile(userProfile);

      // 2. Fetch new recommendations matching profile
      const recs = await recommendationService.getRecommendations(userProfile, excludedIds, language);
      setRecommendations(recs);

    } catch (error) {
      console.error('Error fetching recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderCard = ({ item }: { item: ScoredAnime }) => {
    const { anime, reasons } = item;
    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => router.push(`/anime/${anime.mal_id}`)}
      >
        <Image
          source={{ uri: anime.images.jpg.large_image_url }}
          style={styles.cardImage}
          contentFit="cover"
        />
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>
              {anime.title_english || anime.title}
            </Text>
            {anime.score ? (
              <View style={styles.scoreBadge}>
                <Ionicons name="star" size={12} color="#FFF" />
                <Text style={styles.scoreText}>{anime.score}</Text>
              </View>
            ) : null}
          </View>

          {/* Genres */}
          <View style={styles.genreRow}>
            {anime.genres?.slice(0, 3).map(g => (
              <View key={g.name} style={[styles.genreTag, { backgroundColor: colors.border }]}>
                <Text style={[styles.genreText, { color: colors.subtext }]}>{g.name}</Text>
              </View>
            ))}
          </View>

          {/* AI Reasons */}
          {reasons.length > 0 && (
            <View style={[styles.reasonBox, { backgroundColor: colors.background }]}>
              <Ionicons name="sparkles" size={14} color="#FACC15" style={{ marginRight: 6 }} />
              <View style={{ flex: 1 }}>
                {reasons.map((r, i) => (
                  <Text key={i} style={[styles.reasonText, { color: colors.text }]}>• {r}</Text>
                ))}
              </View>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => {
    return (
      <View style={styles.headerContainer}>
        {/* Info Trigger Bar */}
        <TouchableOpacity
          onPress={() => setShowTipModal(true)}
          style={[styles.infoTrigger, { backgroundColor: colors.card, borderColor: colors.border }]}
          activeOpacity={0.7}
        >
          <View style={styles.infoTriggerLeft}>
            <View style={styles.infoIconWrapper}>
              <Ionicons name="information-circle" size={18} color="#FACC15" />
            </View>
            <Text style={[styles.infoTriggerText, { color: colors.text }]}>
              {t('recommendations.tipTrigger', { defaultValue: 'How to get better suggestions?' })}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.subtext} />
        </TouchableOpacity>

        {profile && profile.topGenres.length > 0 && (
          <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.profileTitle, { color: colors.text }]}>
              {t('recommendations.genreProfile', { defaultValue: 'Your Genre Profile' })}
            </Text>
            <Text style={[styles.profileSub, { color: colors.subtext }]}>
              {language === 'tr'
                ? `${profile.totalRated} yüksek puanlı animeye dayanarak, bunları seviyorsunuz:`
                : `Based on ${profile.totalRated} highly rated anime, you seem to love:`}
            </Text>
            <View style={styles.topGenresRow}>
              {profile.topGenres.map((g: { name: string }, i: number) => (
                <View key={g.name} style={styles.topGenreBadge}>
                  <Text style={styles.topGenreBadgeText}>{i + 1}. {g.name}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {t('recommendations.title', { defaultValue: 'Recommended For You' })}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#FACC15" />
          <Text style={[styles.loadingText, { color: colors.subtext }]}>
            Analyzing your taste profile...
          </Text>
        </View>
      ) : recommendations.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="list-outline" size={60} color={colors.subtext} />
          <Text style={[styles.emptyText, { color: colors.text, marginTop: 16 }]}>
            {t('recommendations.noData', { defaultValue: 'Add more anime to your list to get personalized recommendations!' })}
          </Text>
        </View>
      ) : (
        <FlatList
          data={recommendations}
          keyExtractor={item => item.anime.mal_id.toString()}
          renderItem={renderCard}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Recommendation Tip Modal */}
      <Modal
        visible={showTipModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTipModal(false)}
      >
        <BlurView intensity={20} tint="dark" style={styles.modalOverlay}>
          <Pressable style={styles.modalDismiss} onPress={() => setShowTipModal(false)} />
          <View style={styles.modalContentContainer}>
            <LinearGradient
              colors={['#F59E0B', '#FACC15']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.modalTipCard}
            >
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowTipModal(false)}
              >
                <Ionicons name="close" size={20} color="#FFF" />
              </TouchableOpacity>

              <View style={styles.tipIconContainer}>
                <Ionicons name="bulb" size={32} color="#FFF" />
              </View>

              <Text style={styles.tipTitle}>
                {t('recommendations.tipTitle', { defaultValue: 'Get Better Suggestions' })}
              </Text>

              <Text style={styles.tipContentLarge}>
                {t('recommendations.tipContent', { defaultValue: 'For more accurate and precise recommendations, add the anime you like to your favorites and lists, and give them ratings.' })}
              </Text>

              <TouchableOpacity
                style={styles.gotItButton}
                onPress={() => setShowTipModal(false)}
              >
                <Text style={styles.gotItText}>
                  {t('common.confirm', { defaultValue: 'Got it!' })}
                </Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>
          <Pressable style={styles.modalDismiss} onPress={() => setShowTipModal(false)} />
        </BlurView>
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
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  loadingText: {
    fontFamily: 'Poppins_500Medium',
    marginTop: 16,
  },
  emptyText: {
    fontFamily: 'Poppins_500Medium',
    textAlign: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  headerContainer: {
    marginBottom: 10,
  },
  infoTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  infoTriggerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  infoIconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(250, 204, 21, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  infoTriggerText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalDismiss: {
    flex: 1,
    width: '100%',
  },
  modalContentContainer: {
    width: '100%',
    maxWidth: 400,
  },
  modalTipCard: {
    padding: 24,
    borderRadius: 28,
    alignItems: 'center',
    shadowColor: '#FACC15',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },
  modalCloseButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  tipTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 20,
    color: '#FFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  tipContentLarge: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 14,
    color: '#FFF',
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
    opacity: 0.95,
  },
  gotItButton: {
    backgroundColor: '#FFF',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  gotItText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 14,
    color: '#F59E0B',
  },
  profileCard: {
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 20,
    borderStyle: 'dashed',
  },
  profileTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 16,
    marginBottom: 4,
  },
  profileSub: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    marginBottom: 12,
  },
  topGenresRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  topGenreBadge: {
    backgroundColor: '#FACC15',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  topGenreBadgeText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
    color: '#000',
  },
  card: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 16,
    height: 140,
  },
  cardImage: {
    width: 100,
    height: '100%',
  },
  cardContent: {
    flex: 1,
    padding: 12,
    justifyContent: 'flex-start',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardTitle: {
    flex: 1,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    marginRight: 8,
    lineHeight: 20,
  },
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 2,
  },
  scoreText: {
    color: '#FFF',
    fontFamily: 'Poppins_700Bold',
    fontSize: 10,
  },
  genreRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  genreTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  genreText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 9,
  },
  reasonBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    marginTop: 'auto',
  },
  reasonText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 11,
    lineHeight: 16,
  }
});
