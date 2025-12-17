import React, { useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  Image, 
  TouchableOpacity, 
  Dimensions,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { AnimeListItem } from '../../types';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';

const { width } = Dimensions.get('window');

export default function WatchingScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [watchingList, setWatchingList] = useState<AnimeListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }

      const { data: animeData, error: animeError } = await supabase
        .from('user_anime_list')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('status', 'watching')
        .order('updated_at', { ascending: false });

      if (animeError) throw animeError;
      setWatchingList(animeData || []);

      const { data: profileData } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', session.user.id)
        .single();
      
      if (profileData) {
        setAvatarUrl(profileData.avatar_url);
      }
    } catch (error) {
      console.error('Error fetching watching list:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleCardPress = (item: AnimeListItem) => {
    router.push({
      pathname: '/anime/[id]',
      params: { 
        id: item.anime_id,
        title: item.anime_title,
        image: item.anime_image,
        totalEpisodes: item.total_episodes
      }
    });
  };

  const renderItem = ({ item }: { item: AnimeListItem }) => {
    const percentage = item.total_episodes > 0 
      ? Math.round((item.current_episode / item.total_episodes) * 100) 
      : 0;

    return (
      <TouchableOpacity 
        style={[styles.card, { backgroundColor: colors.card }]} 
        activeOpacity={0.9}
        onPress={() => handleCardPress(item)}
      >
        <Image source={{ uri: item.anime_image }} style={styles.cardImage} />
        
        <View style={styles.cardContent}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{item.anime_title}</Text>
          <Text style={styles.episodeInfo} numberOfLines={1}>
            Ep {item.current_episode} / {item.total_episodes || '?'}
          </Text>
          
          <View style={styles.progressRow}>
            <Text style={[styles.currentEpisode, { color: colors.text }]}>Episode {item.current_episode}</Text>
            <Text style={[styles.percentage, { color: colors.subtext }]}>{percentage}%</Text>
          </View>

          <View style={[styles.progressBarBackground, { backgroundColor: colors.border }]}>
            <View style={[styles.progressBarFill, { width: `${percentage}%` }]} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Watching</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="search" size={24} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.avatarContainer, { backgroundColor: colors.card }]}>
            <Image 
              source={{ uri: avatarUrl || 'https://via.placeholder.com/150' }} 
              style={styles.avatar} 
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FACC15" />
        </View>
      ) : (
        <FlatList
          data={watchingList}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FACC15" />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="play-circle-outline" size={48} color={colors.subtext} />
              <Text style={[styles.emptyText, { color: colors.subtext }]}>Nothing being watched</Text>
              <Text style={[styles.emptySubText, { color: colors.subtext }]}>Start watching an anime to track your progress here.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 32,
    fontFamily: 'Poppins_700Bold',
    letterSpacing: -0.5,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconButton: {
    padding: 4,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#FACC15',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    minHeight: 300,
  },
  card: {
    flexDirection: 'row',
    borderRadius: 24,
    padding: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 3,
    alignItems: 'center',
  },
  cardImage: {
    width: 100,
    height: 100,
    borderRadius: 16,
    backgroundColor: '#374151',
  },
  cardContent: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
    paddingRight: 4,
  },
  title: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    marginBottom: 4,
  },
  episodeInfo: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: '#FACC15',
    marginBottom: 12,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  currentEpisode: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  percentage: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
  },
  progressBarBackground: {
    height: 6,
    borderRadius: 3,
    width: '100%',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#FACC15',
    borderRadius: 3,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    marginTop: 12,
  },
  emptySubText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 250,
  },
});
