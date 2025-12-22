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
  ScrollView // Added for category tabs
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Anime, jikanApi } from '../../lib/jikan';
import { AnimeCard } from '../../components/AnimeCard';
import { useTheme } from '../../context/ThemeContext';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

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
  const [loading, setLoading] = useState(true);
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

  // Initial load
  useEffect(() => {
    fetchAnimes(1);
  }, []);

  const onRefresh = useCallback(() => {
    fetchAnimes(1, true, activeQuery, selectedCategory);
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

      {/* Categories */}
      <View style={styles.categoriesContainer}>
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
    </View>
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
    paddingBottom: 20,
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
    fontFamily: 'Inter_500Medium',
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
    fontFamily: 'Inter_400Regular',
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
    gap: 12,
  },
  categoryTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  categoryText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
});
