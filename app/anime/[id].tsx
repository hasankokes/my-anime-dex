import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  ScrollView, 
  TouchableOpacity, 
  Dimensions,
  ActivityIndicator,
  Modal,
  Alert
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import { AnimeListItem } from '../../types';
import { useTheme } from '../../context/ThemeContext';

const { width, height } = Dimensions.get('window');

// Mock Data for Episodes
const MOCK_EPISODES = [
  { id: 1, title: "Let You Down", duration: "24m", image: "https://images.unsplash.com/photo-1541562232579-512a21360020?q=80&w=300&auto=format&fit=crop" },
  { id: 2, title: "Like A Boy", duration: "23m", image: "https://images.unsplash.com/photo-1620336655055-088d06e36bf0?q=80&w=300&auto=format&fit=crop" },
  { id: 3, title: "Smooth Criminal", duration: "24m", image: "https://images.unsplash.com/photo-1601850494422-3cf395d5251e?q=80&w=300&auto=format&fit=crop" },
  { id: 4, title: "Lucky You", duration: "24m", image: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=300&auto=format&fit=crop" },
  { id: 5, title: "All Eyez On Me", duration: "23m", image: "https://images.unsplash.com/photo-1493246507139-91e8fad9978e?q=80&w=300&auto=format&fit=crop" },
];

const STATUS_OPTIONS = [
  { label: 'Watching', value: 'watching', icon: 'play-circle' },
  { label: 'Completed', value: 'completed', icon: 'checkmark-circle' },
  { label: 'Plan to Watch', value: 'plan_to_watch', icon: 'calendar' },
  { label: 'Dropped', value: 'dropped', icon: 'close-circle' },
];

export default function AnimeDetailsScreen() {
  const { id, title, image, totalEpisodes: paramTotalEpisodes } = useLocalSearchParams();
  const router = useRouter();
  const { colors, isDark } = useTheme();
  
  const [loading, setLoading] = useState(true);
  const [userEntry, setUserEntry] = useState<AnimeListItem | null>(null);
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  const animeTitle = (title as string) || 'Unknown Anime';
  const animeImage = (image as string) || 'https://via.placeholder.com/400';
  const totalEps = parseInt(paramTotalEpisodes as string) || 12;

  useEffect(() => {
    fetchUserEntry();
  }, [id]);

  const fetchUserEntry = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from('user_anime_list')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('anime_id', id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching entry:', error);
      }

      if (data) {
        setUserEntry(data);
      } else {
        setUserEntry({
          id: 'temp',
          user_id: session.user.id,
          anime_id: id as string,
          anime_title: animeTitle,
          anime_image: animeImage,
          status: 'plan_to_watch',
          is_favorite: false,
          current_episode: 0,
          total_episodes: totalEps
        } as any);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateEntry = async (updates: Partial<AnimeListItem>) => {
    try {
      setSaving(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        Alert.alert('Error', 'Please log in to track anime.');
        return;
      }

      const newEntry = { ...userEntry, ...updates } as AnimeListItem;
      setUserEntry(newEntry);

      const payload = {
        user_id: session.user.id,
        anime_id: id,
        anime_title: animeTitle,
        anime_image: animeImage,
        total_episodes: totalEps,
        status: newEntry.status,
        is_favorite: newEntry.is_favorite,
        current_episode: newEntry.current_episode,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('user_anime_list')
        .upsert(payload, { onConflict: 'user_id, anime_id' });

      if (error) throw error;
    } catch (error) {
      console.error('Error updating entry:', error);
      Alert.alert('Error', 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = (newStatus: string) => {
    updateEntry({ status: newStatus as any });
    setStatusModalVisible(false);
  };

  const handleProgressChange = (increment: number) => {
    if (!userEntry) return;
    const newEp = Math.max(0, Math.min(totalEps, userEntry.current_episode + increment));
    updateEntry({ current_episode: newEp });
  };

  const toggleFavorite = () => {
    if (!userEntry) return;
    updateEntry({ is_favorite: !userEntry.is_favorite });
  };

  const getStatusLabel = (status: string) => {
    const option = STATUS_OPTIONS.find(o => o.value === status);
    return option ? option.label : 'Add to List';
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color="#FACC15" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Hero Image */}
        <View style={styles.heroContainer}>
          <Image source={{ uri: animeImage }} style={styles.heroImage} />
          <LinearGradient
            colors={['transparent', isDark ? '#0F0F0F' : '#F9FAFB']}
            style={styles.heroGradient}
          />
          
          {/* Back Button */}
          <SafeAreaView style={styles.safeHeader}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </SafeAreaView>
        </View>

        {/* Content Body */}
        <View style={styles.contentBody}>
          {/* Title Section */}
          <Text style={[styles.title, { color: colors.text }]}>{animeTitle}</Text>
          
          <View style={styles.metaRow}>
            <View style={[styles.tag, { backgroundColor: colors.border }]}>
              <Text style={[styles.tagText, { color: colors.subtext }]}>TV-MA</Text>
            </View>
            <Text style={[styles.metaText, { color: colors.subtext }]}>•  1 Season  •  {totalEps} Episodes  •</Text>
          </View>
          
          <Text style={styles.studioText}>Studio Trigger</Text>

          {/* Action Bar */}
          <View style={styles.actionBar}>
            <TouchableOpacity 
              style={styles.statusButton} 
              activeOpacity={0.8}
              onPress={() => setStatusModalVisible(true)}
            >
              <Ionicons name="play-circle" size={24} color="#111827" style={{ marginRight: 8 }} />
              <Text style={styles.statusButtonText}>
                {getStatusLabel(userEntry?.status || 'plan_to_watch')}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#111827" style={{ marginLeft: 'auto' }} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.favoriteButton, { backgroundColor: colors.card, borderColor: colors.border }]} 
              activeOpacity={0.8}
              onPress={toggleFavorite}
            >
              <Ionicons 
                name={userEntry?.is_favorite ? "star" : "star-outline"} 
                size={24} 
                color={userEntry?.is_favorite ? "#FACC15" : colors.subtext} 
              />
            </TouchableOpacity>
          </View>

          {/* Progress Card */}
          {userEntry?.status === 'watching' && (
            <View style={[styles.progressCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.progressHeader}>
                <Text style={[styles.progressTitle, { color: colors.text }]}>PROGRESS</Text>
                <Text style={[styles.progressCount, { color: colors.subtext }]}>
                  {userEntry.current_episode} of {totalEps} watched
                </Text>
              </View>

              <View style={[styles.progressBarBg, { backgroundColor: colors.border }]}>
                <View 
                  style={[
                    styles.progressBarFill, 
                    { width: `${(userEntry.current_episode / totalEps) * 100}%` }
                  ]} 
                />
              </View>

              <View style={styles.stepperContainer}>
                <Text style={[styles.editWatchedText, { color: colors.subtext }]}>Edit Watched</Text>
                <View style={[styles.stepperControls, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <TouchableOpacity 
                    style={[styles.stepperBtn, { backgroundColor: colors.inputBg }]} 
                    onPress={() => handleProgressChange(-1)}
                  >
                    <Ionicons name="remove" size={20} color={colors.text} />
                  </TouchableOpacity>
                  
                  <View style={[styles.stepperValueContainer, { borderColor: colors.border }]}>
                    <Text style={[styles.stepperValue, { color: colors.text }]}>{userEntry.current_episode}</Text>
                  </View>

                  <TouchableOpacity 
                    style={[styles.stepperBtn, { backgroundColor: colors.inputBg }]}
                    onPress={() => handleProgressChange(1)}
                  >
                    <Ionicons name="add" size={20} color={colors.text} />
                  </TouchableOpacity>
                </View>
                <Text style={[styles.totalEpsText, { color: colors.subtext }]}>/ {totalEps}</Text>
              </View>
            </View>
          )}

          {/* Episodes List */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Episodes</Text>
          
          <View style={styles.episodesList}>
            {MOCK_EPISODES.map((ep) => {
              const isWatched = (userEntry?.current_episode || 0) >= ep.id;
              const isCurrent = (userEntry?.current_episode || 0) + 1 === ep.id;

              return (
                <TouchableOpacity 
                  key={ep.id} 
                  style={[styles.episodeItem]}
                  onPress={() => updateEntry({ current_episode: ep.id })}
                >
                  <View style={styles.epImageContainer}>
                    <Image source={{ uri: ep.image }} style={styles.epImage} />
                    <View style={styles.durationBadge}>
                      <Text style={styles.durationText}>{ep.duration}</Text>
                    </View>
                    {isCurrent && (
                      <View style={styles.playingOverlay}>
                        <Ionicons name="play" size={24} color="#FFFFFF" />
                      </View>
                    )}
                  </View>

                  <View style={styles.epInfo}>
                    <Text style={[styles.epNumber, { color: colors.subtext }]}>
                      {isCurrent && userEntry?.status === 'watching' ? 'WATCHING' : `Episode ${ep.id}`}
                    </Text>
                    <Text style={[styles.epTitle, { color: colors.text }]} numberOfLines={1}>{ep.title}</Text>
                  </View>

                  <View style={styles.epStatus}>
                    {isWatched ? (
                      <View style={styles.checkCircle}>
                        <Ionicons name="checkmark" size={16} color="#111827" />
                      </View>
                    ) : (
                      <View style={[styles.uncheckedCircle, { borderColor: colors.border }]} />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* Status Selection Modal */}
      <Modal
        visible={statusModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setStatusModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setStatusModalVisible(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Update Status</Text>
            {STATUS_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.modalOption,
                  { borderBottomColor: colors.border },
                  userEntry?.status === option.value && { backgroundColor: isDark ? '#374151' : '#FEFCE8' }
                ]}
                onPress={() => handleStatusChange(option.value)}
              >
                <Ionicons 
                  name={option.icon as any} 
                  size={24} 
                  color={userEntry?.status === option.value ? '#FACC15' : colors.subtext} 
                />
                <Text style={[
                  styles.modalOptionText,
                  { color: userEntry?.status === option.value ? (isDark ? '#FACC15' : '#111827') : colors.subtext }
                ]}>
                  {option.label}
                </Text>
                {userEntry?.status === option.value && (
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroContainer: {
    height: height * 0.45,
    width: '100%',
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  heroGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '60%',
  },
  safeHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  contentBody: {
    marginTop: -40,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 32,
    fontFamily: 'Poppins_700Bold',
    lineHeight: 38,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  tag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  tagText: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
  },
  metaText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
  studioText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#D97706',
    marginBottom: 24,
  },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 12,
  },
  statusButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FACC15',
    height: 56,
    borderRadius: 28,
    paddingHorizontal: 20,
    shadowColor: '#FACC15',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  statusButtonText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#111827',
  },
  favoriteButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  progressCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1,
  },
  progressCount: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    width: '100%',
    marginBottom: 20,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#FACC15',
    borderRadius: 4,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editWatchedText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    marginRight: 12,
  },
  stepperControls: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 24,
    height: 44,
    flex: 1,
  },
  stepperBtn: {
    width: 44,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
  },
  stepperValueContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    height: '100%',
  },
  stepperValue: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
  },
  totalEpsText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    marginLeft: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Poppins_700Bold',
    marginBottom: 16,
  },
  episodesList: {
    gap: 16,
  },
  episodeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  epImageContainer: {
    width: 120,
    height: 68,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    marginRight: 16,
  },
  epImage: {
    width: '100%',
    height: '100%',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  durationText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
  },
  playingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FACC15',
    borderRadius: 12,
  },
  epInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  epNumber: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  epTitle: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
  },
  epStatus: {
    width: 40,
    alignItems: 'center',
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FACC15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uncheckedCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
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
    fontSize: 20,
    fontFamily: 'Poppins_700Bold',
    marginBottom: 20,
    textAlign: 'center',
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
    marginLeft: 12,
  },
});
