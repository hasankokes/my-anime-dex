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
import { Ionicons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import { AnimeListItem } from '../../types';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';

const { width } = Dimensions.get('window');
const COLUMN_count = 2;
const GAP = 16;
const PADDING = 20;
const ITEM_WIDTH = (width - (PADDING * 2) - GAP) / COLUMN_count;

const FILTERS = ['All', 'Watching', 'Completed', 'Plan to Watch'];

export default function FavoritesScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const [activeFilter, setActiveFilter] = useState('All');
  const [favorites, setFavorites] = useState<AnimeListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchFavorites = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }

      let query = supabase
        .from('user_anime_list')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('is_favorite', true);

      if (activeFilter !== 'All') {
        const statusMap: Record<string, string> = {
          'Watching': 'watching',
          'Completed': 'completed',
          'Plan to Watch': 'plan_to_watch'
        };
        if (statusMap[activeFilter]) {
          query = query.eq('status', statusMap[activeFilter]);
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      setFavorites(data || []);
    } catch (error) {
      console.error('Error fetching favorites:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchFavorites();
    }, [activeFilter])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchFavorites();
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

  const renderFilter = ({ item }: { item: string }) => {
    const isActive = activeFilter === item;
    return (
      <TouchableOpacity 
        style={[
          styles.filterPill, 
          { 
            backgroundColor: isActive ? colors.primary : colors.card,
            borderColor: isActive ? colors.primary : colors.border
          }
        ]}
        onPress={() => {
          setLoading(true);
          setActiveFilter(item);
        }}
      >
        <Text style={[
          styles.filterText, 
          { color: isActive ? '#111827' : colors.subtext }
        ]}>
          {item}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderCard = ({ item }: { item: AnimeListItem }) => (
    <TouchableOpacity 
      style={[styles.card, { backgroundColor: colors.card }]} 
      activeOpacity={0.9}
      onPress={() => handleCardPress(item)}
    >
      <Image source={{ uri: item.anime_image }} style={styles.cardImage} />
      
      <View style={styles.heartContainer}>
        <Ionicons name="heart" size={18} color="#FACC15" />
      </View>

      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.9)']}
        style={styles.gradient}
      />

      <View style={styles.cardContent}>
        <Text style={styles.cardTitle} numberOfLines={2}>{item.anime_title}</Text>
        <Text style={styles.cardSubtitle}>
          {item.status.replace('_', ' ')} 
          {item.status === 'watching' ? ` • Ep ${item.current_episode}` : ''}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Your Favorites</Text>
        <TouchableOpacity style={[styles.filterButton, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="filter" size={18} color={colors.text} />
          <Text style={[styles.filterButtonText, { color: colors.text }]}>Filter</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <FlatList
          data={FILTERS}
          renderItem={renderFilter}
          keyExtractor={(item) => item}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20 }}
        />
      </View>

      {/* Grid Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FACC15" />
        </View>
      ) : (
        <FlatList
          data={favorites}
          renderItem={renderCard}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FACC15" />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="heart-dislike-outline" size={48} color={colors.subtext} />
              <Text style={[styles.emptyText, { color: colors.subtext }]}>No favorites found</Text>
              <Text style={[styles.emptySubText, { color: colors.subtext }]}>Add anime to your favorites to see them here.</Text>
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
    fontSize: 28,
    fontFamily: 'Poppins_700Bold',
    letterSpacing: -0.5,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 8,
  },
  filterButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
  filterContainer: {
    marginBottom: 20,
    height: 44,
  },
  filterPill: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 24,
    marginRight: 12,
    borderWidth: 1,
  },
  filterText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    minHeight: 300,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  card: {
    width: ITEM_WIDTH,
    height: ITEM_WIDTH * 1.5,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  heartContainer: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '60%',
    zIndex: 5,
  },
  cardContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
    zIndex: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    color: '#FFFFFF',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  cardSubtitle: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: '#E5E7EB',
    opacity: 0.9,
    textTransform: 'capitalize',
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
