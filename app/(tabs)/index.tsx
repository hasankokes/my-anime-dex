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
  Alert,
  useWindowDimensions
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Anime, jikanApi } from '../../lib/jikan';
import { AnimeCard } from '../../components/AnimeCard';
import { ForYouHeroCard } from '../../components/Home/ForYouHeroCard';
import { AnimePulse } from '../../components/Home/AnimePulse';
import { DiceRollModal } from '../../components/Home/DiceRollModal';
import { useTheme } from '../../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useNetwork } from '../../context/NetworkContext';
import { useAuth } from '../../context/AuthProvider';
import { supabase } from '../../lib/supabase';
import { useLanguage } from '../../context/LanguageContext';
import { useWalkthrough } from '../../context/WalkthroughContext';
import { recommendationService } from '../../services/recommendationService';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark, toggleTheme } = useTheme();
  const { isConnected, isInternetReachable } = useNetwork();
  const { session, avatarUrl } = useAuth();
  const { t } = useLanguage();
  const { registerStepLayout, startWalkthrough, checkFirstLaunch, isActive: walkthroughActive, resetKey } = useWalkthrough();
  const flatListRef = useRef<FlatList>(null);

  // Responsive columns: 2 for phones, 3 for tablets, 4 for large tablets
  const { width: screenWidth } = useWindowDimensions();
  const numColumns = screenWidth >= 1024 ? 4 : screenWidth >= 768 ? 3 : 2;

  // Walkthrough refs
  const logoRef = useRef<View>(null);
  const pulseRef = useRef<View>(null);
  const myListsRef = useRef<View>(null);
  const discoverRef = useRef<View>(null);
  const rollDiceRef = useRef<View>(null);
  const trendingRef = useRef<View>(null);
  const themeToggleRef = useRef<View>(null);
  const profileRef = useRef<View>(null);

  // Measure element positions for walkthrough
  const measureRef = useCallback((ref: React.RefObject<View | null>, stepIndex: number) => {
    if (ref.current) {
      ref.current.measureInWindow((x, y, width, height) => {
        if (width > 0 && height > 0) {
          registerStepLayout(stepIndex, { x, y, width, height });
        }
      });
    }
  }, [registerStepLayout]);

  // Auto-trigger walkthrough on first launch
  useEffect(() => {
    const timer = setTimeout(async () => {
      const isFirst = await checkFirstLaunch('home');
      if (isFirst && !walkthroughActive) {
        measureRef(logoRef, 0);
        measureRef(pulseRef, 1);
        measureRef(discoverRef, 2);
        measureRef(rollDiceRef, 3);
        measureRef(myListsRef, 4);
        measureRef(trendingRef, 5);
        measureRef(themeToggleRef, 6);
        measureRef(profileRef, 7);
        setTimeout(() => startWalkthrough('home'), 300);
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [resetKey]);




  // Categories
  const CATEGORIES = [
    { id: null, name: t('home.cats.all') },
    { id: 1, name: t('home.cats.action') },
    { id: 2, name: t('home.cats.adventure') },
    { id: 4, name: t('home.cats.comedy') },
    { id: 8, name: t('home.cats.drama') },
    { id: 10, name: t('home.cats.fantasy') },
    { id: 24, name: t('home.cats.scifi') },
    { id: 14, name: t('home.cats.horror') },
    { id: 22, name: t('home.cats.romance') },
    { id: 36, name: t('home.cats.sliceOfLife') },
  ];

  const [animes, setAnimes] = useState<Anime[]>([]);
  const [trendingAnimes, setTrendingAnimes] = useState<Anime[]>([]); // Trending State
  const [trendingMode, setTrendingMode] = useState<'trending' | 'spring' | 'upcoming'>('trending');
  const [springAnimes, setSpringAnimes] = useState<Anime[]>([]);
  const [infiniteSpring, setInfiniteSpring] = useState<Anime[]>([]);
  const [springLoading, setSpringLoading] = useState(false);
  const [upcomingAnimes, setUpcomingAnimes] = useState<Anime[]>([]);
  const [infiniteUpcoming, setInfiniteUpcoming] = useState<Anime[]>([]);
  const [upcomingLoading, setUpcomingLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [trendingLoading, setTrendingLoading] = useState(true); // Trending Loading
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // States for Recommendations
  const [isDiceModalVisible, setIsDiceModalVisible] = useState(false);
  const [userListCount, setUserListCount] = useState(0);
  const [topGenre, setTopGenre] = useState<string | undefined>(undefined);

  // Focus effect to reset search when navigating away and check user lists
  useFocusEffect(
    useCallback(() => {
      // Reset search state when navigating away from home screen
      return () => {
        setSearchText('');
        setActiveQuery('');
        setIsSearching(false);
        setIsSearchVisible(false);
        setSelectedCategory(null);
      };
    }, [])
  );

  // Search State
  const [searchText, setSearchText] = useState(''); // Text in input
  const [activeQuery, setActiveQuery] = useState(''); // Text actually searched
  const [isSearching, setIsSearching] = useState(false); // UI mode
  const [isSearchVisible, setIsSearchVisible] = useState(false); // Visibility of search bar
  const [isPulseVisible, setIsPulseVisible] = useState(false); // Visibility of community pulse
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

  const [infiniteTrending, setInfiniteTrending] = useState<Anime[]>([]);

  // Fisher-Yates Shuffle
  const shuffleArray = (array: Anime[]) => {
    const newArr = [...array];
    for (let i = newArr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
    }
    return newArr;
  };

  // Helper to process infinite logic
  const processInfiniteData = (data: Anime[]) => {
    const top20 = (data || []).slice(0, 20);
    const shuffled = shuffleArray(top20);
    const repeated = Array(50).fill(shuffled).flat();
    return { shuffled, repeated };
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
      const { shuffled, repeated } = processInfiniteData(response.data);
      setTrendingAnimes(shuffled);
      setInfiniteTrending(repeated);
    } catch (error) {
      console.error('Error fetching trending:', error);
    } finally {
      setTrendingLoading(false);
    }
  };

  // Fetch Spring 2026 Logic
  const fetchSpring2026 = async () => {
    try {
      setSpringLoading(true);
      const response = await jikanApi.getSeasonAnime(2026, 'spring', 1);
      const { shuffled, repeated } = processInfiniteData(response.data);
      setSpringAnimes(shuffled);
      setInfiniteSpring(repeated);
    } catch (error) {
      console.error('Error fetching spring anime:', error);
    } finally {
      setSpringLoading(false);
    }
  };

  // Fetch Upcoming Logic
  const fetchUpcoming = async () => {
    try {
      setUpcomingLoading(true);
      const response = await jikanApi.getUpcomingAnime(1);
      const { shuffled, repeated } = processInfiniteData(response.data);
      setUpcomingAnimes(shuffled);
      setInfiniteUpcoming(repeated);
    } catch (error) {
      console.error('Error fetching upcoming anime:', error);
    } finally {
      setUpcomingLoading(false);
    }
  };

  const toggleTrendingMode = () => {
    if (trendingMode === 'trending') {
      setTrendingMode('spring');
      if (springAnimes.length === 0) fetchSpring2026();
    } else if (trendingMode === 'spring') {
      setTrendingMode('upcoming');
      if (upcomingAnimes.length === 0) fetchUpcoming();
    } else {
      setTrendingMode('trending');
    }
  };

  // Initial load
  useEffect(() => {
    checkInitialData();
  }, [session, isConnected]); // added session dependency

  useEffect(() => {
    const fetchUserListCountAndProfile = async () => {
      if (!session) return;
      try {
        const { count } = await supabase
          .from('user_anime_list')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', session.user.id);
        setUserListCount(count || 0);

        if (count && count > 0) {
          const { profile } = await recommendationService.getUserProfile(session.user.id);
          if (profile.topGenres.length > 0) {
            setTopGenre(profile.topGenres[0].name);
          }
        }
      } catch (error) {
        // ignore
      }
    };
    fetchUserListCountAndProfile();
  }, [session]);

  const checkInitialData = async () => {
    fetchAnimes(1);
    fetchTrending();
  };

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
    setIsSearchVisible(false);
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
      <TouchableOpacity
        ref={logoRef as any}
        {...({ collapsable: false } as any)}
        style={styles.headerLeft}
        onPress={scrollToTop}
        onLayout={() => measureRef(logoRef, 0)}
      >
        <Image
          source={require('../../assets/images/header-logo.png')}
          style={styles.headerLogo}
          contentFit="contain"
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
          setIsSearchVisible(prev => {
            const next = !prev;
            if (next) {
              scrollToTop();
              setTimeout(() => {
                if (searchInputRef.current) {
                  searchInputRef.current.focus();
                }
              }, 300);
            } else {
              cancelSearch();
            }
            return next;
          });
        }}>
          <Ionicons name={isSearchVisible ? "close-outline" : "search-outline"} size={24} color={colors.text} />
        </TouchableOpacity>

        {/* Theme Toggle */}
        <TouchableOpacity
          ref={themeToggleRef as any}
          {...({ collapsable: false } as any)}
          style={styles.iconButton}
          onPress={toggleTheme}
          onLayout={() => measureRef(themeToggleRef, 6)}
        >
          {/* Changed to nicer outline icons based on user feedback */}
          <Ionicons name={isDark ? "sunny-outline" : "moon-outline"} size={24} color={colors.text} />
        </TouchableOpacity>

        {/* Profile */}
        <TouchableOpacity
          ref={profileRef as any}
          {...({ collapsable: false } as any)}
          style={styles.profileButton}
          onPress={() => router.push('/(tabs)/profile')}
          onLayout={() => measureRef(profileRef, 7)}
        >
          <Image
            source={{ uri: avatarUrl || 'https://via.placeholder.com/150' }}
            style={styles.headerProfileImage}
            contentFit="cover"
          />
        </TouchableOpacity>
      </View>
    </View>
  );


  const renderHeader = () => (
    <View style={styles.headerContainer} collapsable={false}>

      {/* Search Bar */}
      {isSearchVisible && (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <View
          
          collapsable={false}
          style={[styles.searchBar, { backgroundColor: colors.inputBg, flex: 1 }]}
          
        >
          <TouchableOpacity onPress={performSearch}>
            <Ionicons name="search" size={20} color={colors.subtext} style={{ marginRight: 8 }} />
          </TouchableOpacity>

          <TextInput
            ref={searchInputRef}
            placeholder={t('home.searchPlaceholder')}
            placeholderTextColor={colors.subtext}
            style={[styles.searchInput, { color: colors.text }]}
            value={searchText}
            onChangeText={handleTextChange}
            onSubmitEditing={performSearch}
            returnKeyType="search"
            autoCapitalize="none"
          />

          {(searchText.length > 0 || isSearching) && (
            <TouchableOpacity onPress={() => {
              if (isSearching) {
                cancelSearch();
              } else {
                setSearchText('');
              }
            }}>
              <Ionicons name="close-circle" size={20} color={colors.subtext} />
            </TouchableOpacity>
          )}
        </View>
      </View>
      )}

      {/* Pulse & My Lists Row */}
      {!isSearching && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 0, zIndex: 10 }}>
          {/* Community Pulse Button */}
          <TouchableOpacity
            style={{
              flex: 1,
              height: 50,
              borderRadius: 16,
              backgroundColor: isPulseVisible ? 'rgba(239, 68, 68, 0.1)' : colors.card,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: isPulseVisible ? '#EF4444' : colors.border,
              gap: 8
            }}
            onPress={() => setIsPulseVisible(!isPulseVisible)}
            ref={pulseRef as any}
            {...({ collapsable: false } as any)}
            onLayout={() => measureRef(pulseRef, 1)}
          >
            <Ionicons name="pulse" size={20} color="#EF4444" />
            <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: isPulseVisible ? '#EF4444' : colors.text }}>
              {t('pulse.title') || 'Community Pulse'}
            </Text>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#EF4444', marginLeft: 4 }} />
            <Ionicons name={isPulseVisible ? "chevron-up" : "chevron-down"} size={16} color={isPulseVisible ? '#EF4444' : colors.subtext} />
          </TouchableOpacity>

          {/* My Lists Button */}
          <TouchableOpacity
            ref={myListsRef as any}
            {...({ collapsable: false } as any)}
            style={{
              height: 50,
              width: 135,
              borderRadius: 16,
              backgroundColor: colors.card,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'flex-start',
              paddingLeft: 14,
              borderWidth: 1,
              borderColor: colors.border,
              gap: 12
            }}
            onPress={() => router.push('/lists')}
            onLayout={() => measureRef(myListsRef, 4)}
          >
            <Ionicons name="bookmarks" size={20} color="#FACC15" />
            <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: colors.text }}>
              {t('profile.myLists')}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {!isSearching && isPulseVisible && (
        <AnimePulse />
      )}

      {!isSearching && (
        <View style={{ zIndex: 50, elevation: 50 }}>
          <ForYouHeroCard
            userListCount={userListCount}
            topGenre={topGenre}
            onPress={() => {
              router.push('/recommendations');
            }}
            onDicePress={() => {
              setIsDiceModalVisible(true);
            }}
            discoverRef={discoverRef}
            rollDiceRef={rollDiceRef}
            measureRef={measureRef}
          />
        </View>
      )}

      {isSearching && (
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Results for "{activeQuery}"
        </Text>
      )}

      {/* Trending Now Section */}
      {!isSearching && (
        <View
          ref={trendingRef as any}
          collapsable={false}
          style={styles.trendingContainer}
          onLayout={() => measureRef(trendingRef, 5)}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, marginTop: 4, gap: 10 }}>
            <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 0 }]}>
              {trendingMode === 'trending' ? t('home.trending') :
                trendingMode === 'spring' ? t('home.spring2026') :
                  t('home.upcoming')}
            </Text>
            <TouchableOpacity
              onPress={toggleTrendingMode}
              style={{ padding: 4 }}
            >
              <Ionicons name="swap-horizontal" size={20} color="#FACC15" />
            </TouchableOpacity>
          </View>

          {(trendingLoading || springLoading || upcomingLoading) ? (
            <ActivityIndicator size="small" color="#FACC15" style={{ height: 200 }} />
          ) : (
            <FlatList
              data={trendingMode === 'trending' ? infiniteTrending :
                trendingMode === 'spring' ? infiniteSpring :
                  infiniteUpcoming}
              keyExtractor={(item, index) => `trending-${item.mal_id}-${index}-${trendingMode}`}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 12, paddingRight: 20 }}
              initialNumToRender={5}
              maxToRenderPerBatch={10}
              windowSize={5}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.trendingCard, { backgroundColor: colors.card }]}
                  onPress={() => router.push(`/anime/${item.mal_id}`)}
                >
                  <Image
                    source={{ uri: item.images.jpg.large_image_url }}
                    style={styles.trendingImage}
                    contentFit="cover"
                    transition={500}
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
          {t('home.categories')}
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
        key={`grid-${numColumns}`}
        data={animes}
        renderItem={({ item }) => (
          <AnimeCard
            anime={item}
            onPress={() => router.push(`/anime/${item.mal_id}`)}
            numColumns={numColumns}
          />
        )}
        keyExtractor={(item) => item.mal_id.toString()}
        numColumns={numColumns}
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
      <DiceRollModal
        visible={isDiceModalVisible}
        onClose={() => setIsDiceModalVisible(false)}
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
    width: 110,
    height: 70,
    marginRight: -20,
    marginLeft: -10,
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
    zIndex: 20,
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
    gap: 8,
  },
  categoryTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  categoryText: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
  },
  trendingContainer: {
    marginTop: 8,
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
