import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions, Modal, Alert, Platform, TextInput, FlatList } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Anime, jikanApi } from '../../lib/jikan';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../context/ThemeContext';
import { ReviewSection } from '../../components/ReviewSection';

const { width, height } = Dimensions.get('window');

// Status options for the modal
const STATUS_OPTIONS = [
  { label: 'Watching', value: 'watching', icon: 'play-circle-outline' },
  { label: 'Completed', value: 'completed', icon: 'checkmark-circle-outline' },
  { label: 'Plan to Watch', value: 'plan_to_watch', icon: 'calendar-outline' },
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
  const [episodeInput, setEpisodeInput] = useState('0'); // Local state for modal input
  const [showListModal, setShowListModal] = useState(false);

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

          if (entry) {
            setUserEntry(entry);
            setEpisodeInput(entry.current_episode?.toString() || '0');

            // --- Self-Healing Logic: Check for stale data and update silently ---
            const needsUpdate =
              (animeData.episodes && entry.total_episodes !== animeData.episodes) ||
              (animeData.score && entry.score !== animeData.score) ||
              (animeData.images?.jpg?.large_image_url && entry.anime_image !== animeData.images.jpg.large_image_url);

            if (needsUpdate) {
              console.log('[AnimeDetails] Metadata out of sync, healing...', {
                oldEps: entry.total_episodes,
                newEps: animeData.episodes,
              });

              // Silent update
              supabase
                .from('user_anime_list')
                .update({
                  total_episodes: animeData.episodes || entry.total_episodes,
                  score: animeData.score || entry.score,
                  anime_image: animeData.images?.jpg?.large_image_url || entry.anime_image,
                  anime_title: animeData.title_english || animeData.title || entry.anime_title, // Keep title fresh too
                  updated_at: new Date().toISOString(),
                })
                .eq('id', entry.id)
                .then(({ error: updateError }) => {
                  if (updateError) {
                    console.error('[AnimeDetails] Failed to heal metadata:', updateError);
                  } else {
                    console.log('[AnimeDetails] Metadata healed successfully.');
                  }
                });
            }
          }
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

  const handleEpisodeUpdate = async () => {
    if (!anime) return;
    const newEp = parseInt(episodeInput, 10);
    const totalepisodes = anime.episodes || 0;

    if (isNaN(newEp)) {
      setEpisodeInput(userEntry?.current_episode?.toString() || '0');
      return;
    }

    // Validate
    let validatedEp = newEp;
    if (validatedEp < 0) validatedEp = 0;
    if (totalepisodes > 0 && validatedEp > totalepisodes) validatedEp = totalepisodes;

    // Auto Status Logic
    let newStatus = userEntry?.status || 'watching';
    if (totalepisodes > 0 && validatedEp === totalepisodes) {
      newStatus = 'completed';
    } else if (validatedEp > 0 && validatedEp < totalepisodes && newStatus !== 'watching') {
      newStatus = 'watching';
    }

    setEpisodeInput(validatedEp.toString());

    // Only update if changed
    if (validatedEp === userEntry?.current_episode && newStatus === userEntry?.status) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // Optionally alert user or just revert
        return;
      }

      const payload = {
        user_id: session.user.id,
        anime_id: anime.mal_id.toString(),
        anime_title: anime.title_english || anime.title,
        anime_image: anime.images.jpg.large_image_url,
        status: newStatus,
        total_episodes: anime.episodes || 0,
        current_episode: validatedEp,
        score: anime.score,
        updated_at: new Date().toISOString(),
      };

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

    } catch (error) {
      console.error('Error updating episode:', error);
      setEpisodeInput(userEntry?.current_episode?.toString() || '0');
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
        setEpisodeInput('0');
      } else {
        const { data: newEntry, error } = await supabase
          .from('user_anime_list')
          .upsert({
            ...userEntry,
            ...payload,
            // If manual status update, keep existing episode count unless 'completed' -> max
            current_episode: status === 'completed' ? (anime.episodes || 0) : (userEntry?.current_episode || 0),
          }, { onConflict: 'user_id, anime_id' })
          .select()
          .single();

        if (error) throw error;
        setUserEntry(newEntry);
        setEpisodeInput(newEntry.current_episode?.toString() || '0');
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

          {/* Episode Progress (New Location) */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Episodes Watched</Text>
            <View style={[styles.episodeInputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <TextInput
                style={[styles.episodeInput, { color: colors.text }]}
                value={episodeInput}
                onChangeText={setEpisodeInput}
                onEndEditing={handleEpisodeUpdate}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor={colors.subtext}
                returnKeyType="done"
                onSubmitEditing={handleEpisodeUpdate}
              />
              <Text style={{ color: colors.subtext, fontSize: 16 }}>
                / {anime.episodes || '?'}
              </Text>
            </View>
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
                <Text style={{ color: colors.primary, fontFamily: 'Poppins_600SemiBold' }}>
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

          <TouchableOpacity
            style={[styles.actionButton, { marginTop: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]}
            onPress={() => setShowListModal(true)}
          >
            <Ionicons name="list" size={20} color={colors.text} />
            <Text style={[styles.actionButtonText, { color: colors.text }]}>Save to Custom List</Text>
          </TouchableOpacity>

          <View style={{ height: 24 }} />

          {/* Reviews Section */}
          <ReviewSection animeId={id as string} />

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

      {/* Add to Custom List Modal */}
      <CustomListModal
        visible={showListModal}
        onClose={() => setShowListModal(false)}
        anime={anime}
      />
    </View>
  );
}



// --- Custom List Modal Component ---
function CustomListModal({ visible, onClose, anime }: { visible: boolean, onClose: () => void, anime: Anime }) {
  const { colors } = useTheme();
  const router = useRouter(); // Added router for navigation
  const [lists, setLists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (visible) fetchLists();
  }, [visible]);

  const fetchLists = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from('lists')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLists(data || []);
    } catch (error) {
      console.error('Error fetching lists:', error);
    } finally {
      setLoading(false);
    }
  }

  const addToList = async (listId: string) => {
    try {
      const { error } = await supabase
        .from('list_items')
        .insert({
          list_id: listId,
          anime_id: anime.mal_id.toString(),
          anime_title: anime.title_english || anime.title,
          anime_image: anime.images.jpg.large_image_url,
          score: anime.score, // Save global score
        });

      if (error) {
        if (error.code === '23505') { // Unique violation
          Alert.alert('Info', 'Anime is already in this list');
        } else {
          throw error;
        }
      } else {
        onClose();
        // Slight delay to ensure modal animation doesn't interfere with Alert
        setTimeout(() => {
          Alert.alert('Success', 'Added to list!');
        }, 300);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to add to list');
    }
  }

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={[styles.modalContent, { backgroundColor: colors.card, maxHeight: '60%' }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Add to List</Text>
          {loading ? (
            <ActivityIndicator color="#FACC15" />
          ) : lists.length > 0 ? (
            <FlatList
              data={lists}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.modalOption, { borderBottomColor: colors.border }]}
                  onPress={() => addToList(item.id)}
                >
                  <Ionicons name="list" size={20} color={colors.subtext} style={{ marginRight: 12 }} />
                  <Text style={[styles.modalOptionText, { color: colors.text }]}>{item.title}</Text>
                  <Ionicons name="add-circle-outline" size={20} color={colors.subtext} style={{ marginLeft: 'auto' }} />
                </TouchableOpacity>
              )}
            />
          ) : (
            <View style={{ alignItems: 'center', padding: 20 }}>
              <Text style={{ color: colors.subtext, marginBottom: 10 }}>No lists found.</Text>
              <TouchableOpacity onPress={() => { onClose(); router.push('/lists/create'); }}>
                <Text style={{ color: '#FACC15', fontFamily: 'Poppins_600SemiBold' }}>Create a List</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Modal>
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
    height: height * 0.35, // Reduced from 0.45
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
    marginTop: -30, // Adjusted overlap
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 20, // Reduced padding
    paddingTop: 24, // Reduced padding
    minHeight: 500,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12, // Reduced margin
  },
  titleColumn: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 20, // Slightly smaller
    fontFamily: 'Poppins_700Bold',
    lineHeight: 26,
  },
  jpTitle: {
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
    marginTop: 2,
  },
  scoreBox: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreText: {
    color: '#FFFFFF',
    fontFamily: 'Poppins_700Bold',
    fontSize: 14,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6, // Reduced gap
    marginBottom: 12, // Reduced margin
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 11,
    fontFamily: 'Poppins_500Medium',
  },
  genresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 16, // Reduced margin
  },
  genreText: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    color: '#FACC15',
  },
  section: {
    marginBottom: 16, // Reduced margin
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    marginBottom: 6,
  },
  synopsisText: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    lineHeight: 22,
  },
  infoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderRadius: 16,
    padding: 12, // Reduced padding
    marginBottom: 24, // Reduced margin
  },
  infoItem: {
    alignItems: 'center',
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    fontFamily: 'Poppins_500Medium',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
  },
  actionButton: {
    flexDirection: 'row',
    backgroundColor: '#FACC15',
    height: 50, // Reduced height
    borderRadius: 25,
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
    fontSize: 15,
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
    fontFamily: 'Poppins_500Medium',
  },
  modalInput: {
    // Removed
  },
  episodeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 16,
    height: 44,
    // maxWidth: 200, // Removed to allow full width
    alignSelf: 'flex-start', // Keep it from stretching full width if not needed, but allow growth
    minWidth: 120,
  },
  episodeInput: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    minWidth: 30,
    marginRight: 4,
  }
});
