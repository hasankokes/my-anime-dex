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
  ScrollView,
  Image,
  TextInput,
  Keyboard
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { AnimeListItem } from '../../types';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthProvider'; // Added useAuth import
import { AnimeCard } from '../../components/AnimeCard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNetwork } from '../../context/NetworkContext';

const FILTERS = ['All', 'Watching', 'Completed', 'Plan to Watch'];
const SORT_OPTIONS = [
  { label: 'Date Added (Newest)', value: 'updated_at', ascending: false },
  { label: 'Date Added (Oldest)', value: 'updated_at', ascending: true },
  { label: 'Title (A-Z)', value: 'anime_title', ascending: true },
  { label: 'Title (Z-A)', value: 'anime_title', ascending: false },
  { label: 'Score (Highest)', value: 'score', ascending: false },
];

export default function FavoritesScreen() {
  const router = useRouter();
  const { colors, toggleTheme, isDark } = useTheme();
  const { avatarUrl } = useAuth(); // Added avatarUrl from auth context
  const insets = useSafeAreaInsets();
  const { isConnected, isInternetReachable } = useNetwork();

  const [activeFilter, setActiveFilter] = useState('All');
  const [favorites, setFavorites] = useState<AnimeListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Search State
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = React.useRef<TextInput>(null);

  // Sorting State
  const [modalVisible, setModalVisible] = useState(false);
  const [sortBy, setSortBy] = useState('updated_at');
  const [sortAscending, setSortAscending] = useState(false);
  const flatListRef = React.useRef<FlatList>(null);

  const fetchFavorites = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const isOnline = isConnected && isInternetReachable !== false;

      if (!session) {
        setLoading(false);
        return;
      }

      const CACHE_KEY = `favorites_cache_${session.user.id}`;

      if (!isOnline) {
        const cached = await AsyncStorage.getItem(CACHE_KEY);
        if (cached) {
          setFavorites(JSON.parse(cached));
        }
        setLoading(false);
        setRefreshing(false);
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

      query = query.order(sortBy, { ascending: sortAscending });

      const { data, error } = await query;
      if (error) throw error;

      setFavorites(data || []);

      if (activeFilter === 'All' && data) {
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data));
      }
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

  const filteredFavorites = favorites.filter(item =>
    item.anime_title.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
            backgroundColor: isActive ? '#FACC15' : colors.card,
            borderColor: isActive ? '#FACC15' : colors.border
          }
        ]}
        onPress={() => {
          setLoading(true);
          setActiveFilter(item);
        }}
      >
        <Text style={[
          styles.filterText,
          { color: isActive ? '#000000' : colors.subtext, fontWeight: isActive ? '700' : '500' }
        ]}>
          {item}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderCard = ({ item }: { item: AnimeListItem }) => {
    const animeAdapter: any = {
      mal_id: item.anime_id,
      title: item.anime_title,
      title_english: item.anime_title,
      images: { jpg: { large_image_url: item.anime_image } },
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

  // --- Fixed Header Logic ---
  const toggleSearch = () => {
    if (isSearchVisible) {
      setIsSearchVisible(false);
      setSearchQuery('');
      Keyboard.dismiss();
    } else {
      setIsSearchVisible(true);
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  };

  const scrollToTop = () => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  };

  const FixedHeader = () => (
    <View style={[styles.fixedHeader, { paddingTop: insets.top + 2, backgroundColor: colors.background, paddingBottom: 0 }]}>
      {isSearchVisible ? (
        <View style={styles.searchHeaderContainer}>
          <Ionicons name="search-outline" size={20} color={colors.subtext} style={{ marginRight: 8 }} />
          <TextInput
            ref={searchInputRef}
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search favorites..."
            placeholderTextColor={colors.subtext}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <TouchableOpacity onPress={toggleSearch} style={{ padding: 4 }}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <TouchableOpacity style={styles.headerLeft} onPress={scrollToTop}>
            <Image
              source={require('../../assets/images/header-logo.png')}
              style={styles.headerLogo}
              resizeMode="contain"
            />
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={[styles.headerBrandText, { color: colors.text, marginLeft: 0 }]}>FAVORI</Text>
              <Text style={[styles.headerBrandText, { color: '#FACC15', marginLeft: 0 }]}>TES</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.iconButton} onPress={toggleSearch}>
              <Ionicons name="search-outline" size={24} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton} onPress={toggleTheme}>
              <Ionicons name={isDark ? "moon-outline" : "sunny-outline"} size={24} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.profileButton} onPress={() => router.push('/(tabs)/profile')}>
              <Image
                source={{ uri: avatarUrl || 'https://via.placeholder.com/150' }}
                style={styles.headerProfileImage}
              />
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );

  const getSortLabel = () => {
    const opt = SORT_OPTIONS.find(o => o.value === sortBy && o.ascending === sortAscending);
    return opt ? opt.label : 'Sort By';
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FixedHeader />

      {/* Sort & Filter Section (Above Tabs) */}
      <View style={{ paddingTop: 10 }}>
        {/* Sort Row */}
        <View style={styles.sortRowContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Lists</Text>
          <TouchableOpacity
            style={[styles.sortButton, { borderColor: colors.border, backgroundColor: colors.card }]}
            onPress={() => setModalVisible(true)}
          >
            <Feather name="filter" size={14} color={colors.subtext} />
            <Text style={[styles.sortButtonText, { color: colors.subtext }]}>{getSortLabel()}</Text>
            <Feather name="chevron-down" size={14} color={colors.subtext} />
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
      </View>

      {/* Grid Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FACC15" />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={filteredFavorites}
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
              <Ionicons name={searchQuery ? "search" : "heart-dislike-outline"} size={48} color={colors.subtext} />
              <Text style={[styles.emptyText, { color: colors.subtext }]}>
                {searchQuery ? 'No favorites found' : 'No favorites yet'}
              </Text>
              {!searchQuery && (
                <Text style={[styles.emptySubText, { color: colors.subtext }]}>Add anime to your favorites to see them here.</Text>
              )}
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
  fixedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingLeft: 4,
    paddingRight: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    zIndex: 10,
    // Removed fixed height to match index.tsx mechanics
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 0,
  },
  headerLogo: {
    width: 110,
    height: 70,
    marginRight: -20,
    marginLeft: -10, // Reverted to match Home exactly
  },
  headerBrandText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 20,
    letterSpacing: 0.5,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    padding: 4,
  },
  profileButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  headerProfileImage: {
    width: '100%',
    height: '100%',
  },
  searchHeaderContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: '100%',
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Poppins_500Medium',
    fontSize: 16,
    height: '100%',
  },

  // Sort & Filter Styles
  sortRowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  sortButtonText: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
  },
  filterContainer: {
    marginBottom: 8,
    height: 40,
  },
  filterPill: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
  },
  filterText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 13,
  },

  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
    minHeight: 300,
    paddingTop: 10,
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
    fontFamily: 'Poppins_500Medium',
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
    fontFamily: 'Poppins_500Medium',
  },
});
