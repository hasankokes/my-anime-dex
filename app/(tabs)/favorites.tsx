import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Modal,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { AnimeListItem } from '../../types';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { AnimeCard } from '../../components/AnimeCard';

const FILTERS = ['All', 'Watching', 'Completed', 'Plan to Watch'];
const SORT_OPTIONS = [
  { label: 'Date Added (Newest)', value: 'updated_at', ascending: false },
  { label: 'Date Added (Oldest)', value: 'updated_at', ascending: true },
  { label: 'Title (A-Z)', value: 'anime_title', ascending: true },
  { label: 'Title (Z-A)', value: 'anime_title', ascending: false },
  { label: 'Score (Highest)', value: 'score', ascending: false }, // Assuming score exists in DB or we add it later
];

export default function FavoritesScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [activeFilter, setActiveFilter] = useState('All');
  const [favorites, setFavorites] = useState<AnimeListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Sorting State
  const [modalVisible, setModalVisible] = useState(false);
  const [sortBy, setSortBy] = useState('updated_at');
  const [sortAscending, setSortAscending] = useState(false);

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

      // Apply Sorting
      query = query.order(sortBy, { ascending: sortAscending });

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
    }, [activeFilter, sortBy, sortAscending])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchFavorites();
  };

  const handleCardPress = (id: string) => {
    router.push(`/anime/${id}`);
  };

  const applySort = (field: string, ascending: boolean) => {
    setSortBy(field);
    setSortAscending(ascending);
    setModalVisible(false);
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

  const renderCard = ({ item }: { item: AnimeListItem }) => {
    // Adapter to match AnimeCard's expected Anime interface
    const animeAdapter: any = {
      mal_id: item.anime_id,
      title: item.anime_title,
      title_english: item.anime_title,
      images: {
        jpg: {
          large_image_url: item.anime_image
        }
      },
      episodes: item.total_episodes,
      score: item.score,
      type: 'TV'
    };

    return (
      <AnimeCard
        anime={animeAdapter as any}
        onPress={() => handleCardPress(item.anime_id)}
      />
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Your Favorites</Text>
        <TouchableOpacity
          style={[styles.filterButton, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => setModalVisible(true)}
        >
          <Feather name="filter" size={18} color={colors.text} />
          <Text style={[styles.filterButtonText, { color: colors.text }]}>Sort</Text>
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

      {/* Sorting Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Sort By</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {SORT_OPTIONS.map((option, index) => {
              const isActive = sortBy === option.value && sortAscending === option.ascending;
              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.sortOption,
                    isActive && { backgroundColor: '#FEF9C3' }
                  ]}
                  onPress={() => applySort(option.value, option.ascending)}
                >
                  <Text style={[
                    styles.sortOptionText,
                    { color: isActive ? '#000' : colors.text }
                  ]}>
                    {option.label}
                  </Text>
                  {isActive && <Ionicons name="checkmark" size={20} color="#CA8A04" />}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>

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
    paddingBottom: 120, // Increased to clear floating tab bar
    minHeight: 300,
  },
  columnWrapper: {
    justifyContent: 'space-between',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '50%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
  },
  sortOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  sortOptionText: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
  },
});
