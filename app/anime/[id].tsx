import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions, Modal, Alert, Platform } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Anime, jikanApi } from '../../lib/jikan';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../context/ThemeContext';

const { width, height } = Dimensions.get('window');

// Status options for the modal
const STATUS_OPTIONS = [
  { label: 'Watching', value: 'watching', icon: 'play-circle-outline' },
  { label: 'Completed', value: 'completed', icon: 'checkmark-circle-outline' },
  { label: 'Plan to Watch', value: 'plan_to_watch', icon: 'calendar-outline' },
  { label: 'Dropped', value: 'dropped', icon: 'close-circle-outline' },
  { label: 'Paused', value: 'paused', icon: 'pause-circle-outline' },
  { label: 'Remove from List', value: 'remove', icon: 'trash-outline', color: '#EF4444' },
];

export default function AnimeDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  const [anime, setAnime] = useState<Anime | null>(null);
  const [loading, setLoading] = useState(true);
  const [userEntry, setUserEntry] = useState<any>(null); // Status from DB
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      try {
        setLoading(true);
        // 1. Fetch Anime Details from Jikan
        const { data: animeData } = await jikanApi.getAnimeDetails(id as string);
        setAnime(animeData);

        // 2. Fetch User Entry from Supabase
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { data: entry, error } = await supabase
            .from('user_anime_list')
            .select('*')
            .eq('user_id', session.user.id)
            .eq('anime_id', id)
            .single();

          if (entry) setUserEntry(entry);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const toggleFavorite = async () => {
    if (!anime) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        Alert.alert('Login Required', 'Please log in to add favorites.');
        return;
      }

      const newIsFavorite = !userEntry?.is_favorite;
      const optimisticEntry = { ...userEntry, is_favorite: newIsFavorite };
      setUserEntry(optimisticEntry); // Optimistic update

      const payload = {
        user_id: session.user.id,
        anime_id: anime.mal_id.toString(),
        anime_title: anime.title_english || anime.title,
        anime_image: anime.images.jpg.large_image_url,
        is_favorite: newIsFavorite,
        score: anime.score,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('user_anime_list')
        .upsert({
          ...userEntry,
          ...payload
        }, { onConflict: 'user_id, anime_id' })
        .select()
        .single();

      if (error) throw error;

    } catch (error) {
      console.error('Error toggling favorite:', error);
      setUserEntry(userEntry); // Revert on error
      Alert.alert('Error', 'Failed to update favorite.');
    }
  };

  const updateStatus = async (status: string) => {
    if (!anime) return;
    setShowStatusModal(false);

    try {
      setActionLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        Alert.alert('Login Required', 'Please log in to manage your list.');
        return;
      }

      const payload = {
        user_id: session.user.id,
        anime_id: anime.mal_id.toString(),
        anime_title: anime.title_english || anime.title,
        anime_image: anime.images.jpg.large_image_url,
        status: status === 'remove' ? null : status,
        total_episodes: anime.episodes || 0,
        score: anime.score,
        updated_at: new Date().toISOString(),
      };

      if (status === 'remove' && !userEntry?.is_favorite) {
        const { error } = await supabase
          .from('user_anime_list')
          .delete()
          .eq('user_id', session.user.id)
          .eq('anime_id', anime.mal_id.toString());
        if (error) throw error;
        setUserEntry(null);
      } else {
        const { data: newEntry, error } = await supabase
          .from('user_anime_list')
          .upsert({
            ...userEntry,
            ...payload
          }, { onConflict: 'user_id, anime_id' })
          .select()
          .single();

        if (error) throw error;
        setUserEntry(newEntry);
      }
    } catch (error) {
      console.error('Error updating status:', error);
      Alert.alert('Error', 'Failed to update list.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || !anime) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color="#FACC15" />
      </View>
    );
  }

  const getStatusLabel = (value: string) => {
    return STATUS_OPTIONS.find(o => o.value === value)?.label || 'Add to List';
  };

  const currentStatus = userEntry?.status;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Hero Image Section */}
        <View style={styles.heroContainer}>
          <Image
            source={{ uri: anime.images.jpg.large_image_url }}
            style={styles.heroImage}
            resizeMode="cover"
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.4)', colors.background]}
            style={styles.heroGradient}
          />

          {/* Back Button */}
          <TouchableOpacity
            style={[styles.backButton, { top: insets.top + 10 }]}
            onPress={() => router.back()}
          >
            <BlurView intensity={30} tint={isDark ? "light" : "dark"} style={styles.blurButton}>
              <Ionicons name="arrow-back" size={24} color={isDark ? "#000" : "#FFF"} />
            </BlurView>
          </TouchableOpacity>

          {/* Favorite Button */}
          <TouchableOpacity
            style={[styles.favButton, { top: insets.top + 10 }]}
            onPress={toggleFavorite}
          >
            <BlurView intensity={30} tint={isDark ? "light" : "dark"} style={styles.blurButton}>
              <Ionicons
                name={userEntry?.is_favorite ? "heart" : "heart-outline"}
                size={24}
                color={userEntry?.is_favorite ? "#EF4444" : (isDark ? "#000" : "#FFF")}
              />
            </BlurView>
          </TouchableOpacity>
        </View>

        {/* Content Section */}
        <View style={[styles.contentContainer, { backgroundColor: colors.background }]}>
          <View style={styles.headerRow}>
            <View style={styles.titleColumn}>
              <Text style={[styles.title, { color: colors.text }]}>{anime.title_english || anime.title}</Text>
              {anime.title_japanese && (
                <Text style={[styles.jpTitle, { color: colors.subtext }]}>{anime.title_japanese}</Text>
              )}
            </View>
            <View style={[styles.scoreBox, { backgroundColor: anime.score && anime.score >= 8 ? '#10B981' : '#F59E0B' }]}>
              <Text style={styles.scoreText}>{anime.score || 'N/A'}</Text>
            </View>
          </View>

          {/* Meta Tags */}
          <View style={styles.tagsContainer}>
            <View style={[styles.tag, { backgroundColor: isDark ? '#1F2937' : '#F3F4F6' }]}>
              <Text style={[styles.tagText, { color: colors.subtext }]}>{anime.type}</Text>
            </View>
            {anime.season && (
              <View style={[styles.tag, { backgroundColor: isDark ? '#1F2937' : '#F3F4F6' }]}>
                <Text style={[styles.tagText, { color: colors.subtext }]}>{anime.season} {anime.year}</Text>
              </View>
            )}
            <View style={[styles.tag, { backgroundColor: isDark ? '#1F2937' : '#F3F4F6' }]}>
              <Text style={[styles.tagText, { color: colors.subtext }]}>{anime.status}</Text>
            </View>
            <View style={[styles.tag, { backgroundColor: isDark ? '#1F2937' : '#F3F4F6' }]}>
              <Text style={[styles.tagText, { color: colors.subtext }]}>{anime.episodes ? `${anime.episodes} Eps` : 'Unknown Eps'}</Text>
            </View>
          </View>

          {/* Genres */}
          <View style={styles.genresContainer}>
            {anime.genres.map((genre) => (
              <Text key={genre.name} style={styles.genreText}>#{genre.name}</Text>
            ))}
          </View>

          {/* Synopsis */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Synopsis</Text>
            <Text
              style={[styles.synopsisText, { color: colors.subtext }]}
              numberOfLines={isExpanded ? undefined : 4}
            >
              {anime.synopsis || 'No synopsis available.'}
            </Text>
            {anime.synopsis && anime.synopsis.length > 200 && (
              <TouchableOpacity onPress={() => setIsExpanded(!isExpanded)} style={{ marginTop: 8 }}>
                <Text style={{ color: colors.primary, fontFamily: 'Inter_600SemiBold' }}>
                  {isExpanded ? 'Read Less' : 'Read More'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Info Grid */}
          <View style={[styles.infoGrid, { backgroundColor: colors.card }]}>
            <View style={styles.infoItem}>
              <Text style={[styles.infoLabel, { color: colors.subtext }]}>Rank</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>#{anime.rank}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={[styles.infoLabel, { color: colors.subtext }]}>Popularity</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>#{anime.popularity}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={[styles.infoLabel, { color: colors.subtext }]}>Members</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{anime.scored_by?.toLocaleString()}</Text>
            </View>
          </View>

          {/* Action Button */}
          <TouchableOpacity
            style={[
              styles.actionButton,
              currentStatus ? styles.actionButtonActive : null
            ]}
            onPress={() => setShowStatusModal(true)}
            disabled={actionLoading}
          >
            {actionLoading ? (
              <ActivityIndicator color={currentStatus ? "#FFF" : "#000"} />
            ) : (
              <>
                <Ionicons
                  name={currentStatus ? "checkmark-circle" : "add"}
                  size={24}
                  color={currentStatus ? "#FFF" : "#000"}
                />
                <Text style={[
                  styles.actionButtonText,
                  currentStatus ? { color: '#FFF' } : null
                ]}>
                  {currentStatus ? getStatusLabel(currentStatus) : 'Add to List'}
                </Text>
              </>
            )}
          </TouchableOpacity>

        </View>
      </ScrollView>

      {/* Status Selection Modal */}
      <Modal
        visible={showStatusModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowStatusModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowStatusModal(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Update List Status</Text>
            {STATUS_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[styles.modalOption, { borderBottomColor: colors.border }]}
                onPress={() => updateStatus(option.value)}
              >
                <Ionicons
                  name={option.icon as any}
                  size={22}
                  color={option.color || colors.subtext}
                  style={{ marginRight: 12 }}
                />
                <Text style={[
                  styles.modalOptionText,
                  { color: option.color || colors.text }
                ]}>{option.label}</Text>

                {currentStatus === option.value && (
                  <Ionicons name="checkmark" size={20} color="#FACC15" style={{ marginLeft: 'auto' }} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  heroContainer: {
    height: height * 0.45,
    width: '100%',
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '100%',
    justifyContent: 'flex-end',
  },
  backButton: {
    position: 'absolute',
    left: 20,
    borderRadius: 20,
    overflow: 'hidden',
    zIndex: 10,
  },
  favButton: {
    position: 'absolute',
    right: 20,
    borderRadius: 20,
    overflow: 'hidden',
    zIndex: 10,
  },
  blurButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    marginTop: -40,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 32,
    minHeight: 500,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  titleColumn: {
    flex: 1,
    marginRight: 16,
  },
  title: {
    fontSize: 22,
    fontFamily: 'Poppins_700Bold',
    lineHeight: 28,
  },
  jpTitle: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    marginTop: 4,
  },
  scoreBox: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreText: {
    color: '#FFFFFF',
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
  },
  genresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  genreText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: '#FACC15',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    marginBottom: 8,
  },
  synopsisText: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    lineHeight: 24,
  },
  infoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderRadius: 16,
    padding: 16,
    marginBottom: 32,
  },
  infoItem: {
    alignItems: 'center',
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  actionButton: {
    flexDirection: 'row',
    backgroundColor: '#FACC15',
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#FACC15",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  actionButtonActive: {
    backgroundColor: '#111827',
    shadowColor: "#000",
  },
  actionButtonText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    color: '#000000',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    marginBottom: 16,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalOptionText: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
  },
});
