import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  TextInput,
  Keyboard,
  StatusBar,
  ScrollView,
  Image,
  Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Anime, jikanApi } from '../../lib/jikan';
import { AnimeCard } from '../../components/AnimeCard';
import { useTheme } from '../../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useNetwork } from '../../context/NetworkContext';
import { useAuth } from '../../context/AuthProvider';
import { supabase } from '../../lib/supabase';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark, toggleTheme } = useTheme();
  const { isConnected, isInternetReachable } = useNetwork();
  const { session, avatarUrl } = useAuth();
  const flatListRef = useRef<FlatList>(null);




  // Categories
  const CATEGORIES = [
    { id: null, name: 'All' },
    { id: 1, name: 'Action' },
    { id: 2, name: 'Adventure' },
    { id: 4, name: 'Comedy' },
    { id: 8, name: 'Drama' },
    { id: 10, name: 'Fantasy' },
    { id: 24, name: 'Sci-Fi' },
    { id: 14, name: 'Horror' },
    { id: 22, name: 'Romance' },
    { id: 36, name: 'Slice of Life' },
  ];

  const [animes, setAnimes] = useState<Anime[]>([]);
  const [trendingAnimes, setTrendingAnimes] = useState<Anime[]>([]); // Trending State
  const [loading, setLoading] = useState(true);
  const [trendingLoading, setTrendingLoading] = useState(true); // Trending Loading
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Search State
  const [searchText, setSearchText] = useState(''); // Text in input
  const [activeQuery, setActiveQuery] = useState(''); // Text actually searched
  const [isSearching, setIsSearching] = useState(false); // UI mode
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const searchInputRef = useRef<TextInput>(null);

  // Fetch Logic
  const fetchAnimes = async (pageNum: number, shouldRefresh = false, query = activeQuery, currCategory = selectedCategory) => {
    if (!shouldRefresh && !hasNextPage) return;

    // Offline Check
    const isOnline = isConnected && isInternetReachable !== false;
    if (!isOnline) {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
      return;
    }

    try {
      if (shouldRefresh) {
        setRefreshing(true);
      } else if (pageNum > 1) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }


      let response;
      // Priority: Search Query > Category Filter > Top Anime
      if (query.trim().length > 0) {
        const genreParam = currCategory ? currCategory.toString() : undefined;
        response = await jikanApi.searchAnime(query, pageNum, genreParam);
      } else if (currCategory) {
        response = await jikanApi.searchAnime('', pageNum, currCategory.toString());
      } else {
        response = await jikanApi.getTopAnime(pageNum);
      }

      const { data, pagination } = response;

      if (shouldRefresh) {
        setAnimes(data);
      } else {
        setAnimes(prev => {
          const existingIds = new Set(prev.map(a => a.mal_id));
          const newItems = data.filter(a => !existingIds.has(a.mal_id));
          return [...prev, ...newItems];
        });
      }

      setHasNextPage(pagination?.has_next_page || false);
      setPage(pageNum);

    } catch (error) {
      console.error('Error fetching animes:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  // Fetch Trending Logic
  const fetchTrending = async () => {
    try {
      setTrendingLoading(true);
      const isOnline = isConnected && isInternetReachable !== false;


      if (!isOnline) {
        setTrendingLoading(false);

        return;
      }
      const response = await jikanApi.getTopAiringAnime(1);

      setTrendingAnimes(response.data || []);
    } catch (error) {
      console.error('Error fetching trending:', error);
    } finally {
      setTrendingLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchAnimes(1);
    fetchTrending();
  }, []);

  const onRefresh = useCallback(() => {
    fetchAnimes(1, true, activeQuery, selectedCategory);
    fetchTrending(); // Refresh trending too
  }, [activeQuery, selectedCategory]);

  const loadMore = () => {
    if (!loadingMore && !loading && hasNextPage) {
      fetchAnimes(page + 1, false, activeQuery, selectedCategory);
    }
  };

  const handleTextChange = (text: string) => {
    setSearchText(text);
  };

  const performSearch = () => {
    const query = searchText.trim();
    if (query === activeQuery) return;

    Keyboard.dismiss();
    setActiveQuery(query);

    if (query.length > 0) {
      setIsSearching(true);
      setPage(1);
      setHasNextPage(true);
      fetchAnimes(1, true, query, selectedCategory);
    } else {
      cancelSearch();
    }
  };

  const cancelSearch = () => {
    Keyboard.dismiss();
    setSearchText('');
    setActiveQuery('');
    setIsSearching(false);
    setPage(1);
    setHasNextPage(true);
    fetchAnimes(1, true, '', selectedCategory);
  };

  const handleCategorySelect = (categoryId: number | null) => {
    if (selectedCategory === categoryId) return;

    setSelectedCategory(categoryId);
    setPage(1);
    setHasNextPage(true);
    fetchAnimes(1, true, activeQuery, categoryId);
  };

  const scrollToTop = () => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  };

  // --- Fixed Header Component ---
  const FixedHeader = () => (
    <View style={[styles.fixedHeader, { paddingTop: insets.top + 2, backgroundColor: colors.background, paddingBottom: 0 }]}>
      {/* Left: Logo + Brand */}
      <TouchableOpacity style={styles.headerLeft} onPress={scrollToTop}>
        <Image
          source={require('../../assets/images/header-logo.png')}
          style={styles.headerLogo}
          resizeMode="contain"
        />
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={[styles.headerBrandText, { color: colors.text }]}>ANIME</Text>
          <Text style={[styles.headerBrandText, { color: '#FACC15' }]}>DEX</Text>
        </View>
      </TouchableOpacity>

      {/* Right: Controls */}
      <View style={styles.headerRight}>
        {/* Search Icon */}
        <TouchableOpacity style={styles.iconButton} onPress={() => {
          // Logic to focus search or toggle search view
          // If already searching, maybe focus input. If not, focus input.
          if (searchInputRef.current) {
            searchInputRef.current.focus();
          }
        }}>
          <Ionicons name="search-outline" size={24} color={colors.text} />
        </TouchableOpacity>

        {/* Theme Toggle */}
        <TouchableOpacity style={styles.iconButton} onPress={toggleTheme}>
          {/* Changed to nicer outline icons based on user feedback */}
          <Ionicons name={isDark ? "sunny-outline" : "moon-outline"} size={24} color={colors.text} />
        </TouchableOpacity>

        {/* Profile */}
        <TouchableOpacity style={styles.profileButton} onPress={() => router.push('/(tabs)/profile')}>
          <Image
            source={{ uri: avatarUrl || 'https://via.placeholder.com/150' }}
            style={styles.headerProfileImage}
          />
        </TouchableOpacity>
      </View>
    </View>
  );


  const renderHeader = () => (
    <View style={styles.headerContainer}>

      {/* Search Bar (Visible in scrollable area) */}
      <View style={[styles.searchBar, { backgroundColor: colors.inputBg }]}>
        <TouchableOpacity onPress={performSearch}>
          <Ionicons name="search" size={20} color={colors.subtext} style={{ marginRight: 8 }} />
        </TouchableOpacity>

        <TextInput
          ref={searchInputRef}
          placeholder="Search anime..."
          placeholderTextColor={colors.subtext}
          style={[styles.searchInput, { color: colors.text }]}
          value={searchText}
          onChangeText={handleTextChange}
          onSubmitEditing={performSearch}
          returnKeyType="search"
          autoCapitalize="none"
        />

        {(searchText.length > 0 || isSearching) && (
          <TouchableOpacity onPress={cancelSearch}>
            <Ionicons name="close-circle" size={20} color={colors.subtext} />
          </TouchableOpacity>
        )}
      </View>

      {isSearching && (
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Results for "{activeQuery}"
        </Text>
      )}

      {/* Trending Now Section */}
      {!isSearching && (
        <View style={styles.trendingContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 12, marginTop: 4 }]}>
            Trending Now
          </Text>
          {trendingLoading ? (
            <ActivityIndicator size="small" color="#FACC15" style={{ height: 200 }} />
          ) : (
            <FlatList
              data={trendingAnimes.slice(0, 10)}
              keyExtractor={(item) => `trending-${item.mal_id}`}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 12, paddingRight: 20 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.trendingCard, { backgroundColor: colors.card }]}
                  onPress={() => router.push(`/anime/${item.mal_id}`)}
                >
                  <Image
                    source={{ uri: item.images.jpg.large_image_url }}
                    style={styles.trendingImage}
                  />
                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.8)']}
                    style={styles.trendingGradient}
                  />
                  <View style={styles.trendingInfo}>
                    <Text style={styles.trendingTitle} numberOfLines={2}>
                      {item.title_english || item.title}
                    </Text>
                    <View style={styles.trendingMeta}>
                      <Ionicons name="star" size={12} color="#FACC15" />
                      <Text style={styles.trendingScore}>{item.score}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      )}

      {/* Categories */}
      <View style={styles.categoriesContainer}>
        <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 12, marginTop: 0 }]}>
          Categories
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContent}
        >
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.id || 'all'}
              onPress={() => handleCategorySelect(cat.id)}
              style={[
                styles.categoryTab,
                {
                  backgroundColor: selectedCategory === cat.id ? '#FACC15' : colors.card,
                  borderColor: selectedCategory === cat.id ? '#FACC15' : colors.border
                }
              ]}
            >
              <Text
                style={[
                  styles.categoryText,
                  {
                    color: selectedCategory === cat.id ? '#000000' : colors.subtext,
                    fontWeight: selectedCategory === cat.id ? '700' : '400'
                  }
                ]}
              >
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View >
  );

  const renderFooter = () => {
    if (!loadingMore) return <View style={{ height: 20 }} />;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#FACC15" />
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color="#FACC15" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FixedHeader />
      <FlatList
        ref={flatListRef}
        data={animes}
        renderItem={({ item }) => (
          <AnimeCard
            anime={item}
            onPress={() => router.push(`/anime/${item.mal_id}`)}
          />
        )}
        keyExtractor={(item) => item.mal_id.toString()}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={[styles.listContent, { paddingTop: 0 }]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={renderHeader()}
        ListFooterComponent={renderFooter}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FACC15" />
        }
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
      />
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
  fixedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingLeft: 4, // Reduced to near zero (small buffer)
    paddingRight: 20,
    // Removed paddingVertical to rely on specific paddings
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    zIndex: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 0,
  },
  headerLogo: {
    width: 110, // Increased further
    height: 70, // Increased further
    marginRight: -20, // Adjust overlap
    marginLeft: -10, // Pull closer to edge
  },
  headerBrandText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 20,
    letterSpacing: 0.5,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4, // Reduced gap between icons
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
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 120, // Increased to clear floating tab bar
  },
  headerContainer: {
    marginBottom: 20,
    marginTop: 10,
  },
  // branding styles removed (greeting, appName etc) as they are now in FixedHeader
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 50,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontFamily: 'Poppins_500Medium',
    fontSize: 15,
  },
  sectionTitle: {
    marginTop: 16,
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  categoriesContainer: {
    marginTop: 16,
  },
  categoriesContent: {
    paddingRight: 16,
    gap: 8, // Reduced from 12
  },
  categoryTab: {
    paddingHorizontal: 12, // Slightly more compact padding
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 6, // Reduced from 8
  },
  categoryText: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
  },
  trendingContainer: {
    marginTop: 24,
    marginBottom: 8,
  },
  trendingCard: {
    width: 140,
    height: 220,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  trendingImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  trendingGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
  },
  trendingInfo: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
  },
  trendingTitle: {
    color: '#FFF',
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
    marginBottom: 4,
  },
  trendingMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trendingScore: {
    color: '#FFF',
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
  },
});
