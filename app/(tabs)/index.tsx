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
  Image // Added for Trending Card
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Anime, jikanApi } from '../../lib/jikan';
import { AnimeCard } from '../../components/AnimeCard';
import { useTheme } from '../../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useNetwork } from '../../context/NetworkContext';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { isConnected, isInternetReachable } = useNetwork();

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

      console.log(`[Home] Fetching: Page ${pageNum}, Query: "${query}", Category: ${currCategory}`);

      let response;
      // Priority: Search Query > Category Filter > Top Anime
      if (query.trim().length > 0) {
        // Search takes precedence, but we could combine if API Supported it easily. 
        // For now, let's say Search ignores category tabs to avoid confusion or empty results.
        // OR: Pass category if selected. Let's pass if selected for better UX.
        const genreParam = currCategory ? currCategory.toString() : undefined;
        response = await jikanApi.searchAnime(query, pageNum, genreParam);
      } else if (currCategory) {
        // Category selected, no search text
        response = await jikanApi.searchAnime('', pageNum, currCategory.toString());
      } else {
        // Default: Top Anime
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

  // 1. Text Change -> JUST UPDATE STATE, NO FETCH
  const handleTextChange = (text: string) => {
    setSearchText(text);
  };

  // 2. Submit -> TRIGGER FETCH
  const performSearch = () => {
    const query = searchText.trim();
    if (query === activeQuery) return; // Don't research same thing

    Keyboard.dismiss();
    setActiveQuery(query);

    if (query.length > 0) {
      setIsSearching(true);
      setPage(1);
      setHasNextPage(true);
      fetchAnimes(1, true, query, selectedCategory);
    } else {
      // Empty query submitted -> Go back to Top Anime
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

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Welcome Text */}
      {!isSearching && (
        <View style={styles.branding}>
          <Text style={[styles.greeting, { color: colors.subtext }]}>Welcome Back,</Text>
          <Text style={[styles.appName, { color: colors.text }]}>My AnimeDex</Text>
        </View>
      )}

      {/* Search Bar */}
      <View style={[styles.searchBar, { backgroundColor: colors.inputBg }]}>
        <TouchableOpacity onPress={performSearch}>
          <Ionicons name="search" size={20} color={colors.subtext} style={{ marginRight: 8 }} />
        </TouchableOpacity>

        <TextInput
          placeholder="Search anime..."
          placeholderTextColor={colors.subtext}
          style={[styles.searchInput, { color: colors.text }]}
          value={searchText}
          onChangeText={handleTextChange} // Only updates variable
          onSubmitEditing={performSearch} // Triggers API
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
              data={trendingAnimes.slice(0, 10)} // Top 10 for carousel
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
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <FlatList
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
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={renderHeader}
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
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 120, // Increased to clear floating tab bar
  },
  headerContainer: {
    marginBottom: 20,
    marginTop: 10,
  },
  branding: {
    marginBottom: 16,
  },
  greeting: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
  },
  appName: {
    fontSize: 24,
    fontFamily: 'Poppins_700Bold',
  },
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
