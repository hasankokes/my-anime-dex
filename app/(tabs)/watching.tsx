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
  RefreshControl,
  TextInput,
  Alert,
  Keyboard
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { AnimeListItem } from '../../types';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';

const { width } = Dimensions.get('window');

const WatchingListItem = ({
  item,
  onPress
}: {
  item: AnimeListItem;
  onPress: () => void;
}) => {
  const { colors } = useTheme();

  const percentage = item.total_episodes > 0
    ? Math.round((item.current_episode / item.total_episodes) * 100)
    : 0;

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card }]}
      activeOpacity={0.9}
      onPress={onPress}
    >
      <Image source={{ uri: item.anime_image }} style={styles.cardImage} />

      <View style={styles.cardContent}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{item.anime_title}</Text>
        <Text style={styles.episodeInfo} numberOfLines={1}>
          Ep {item.current_episode} / {item.total_episodes || '?'}
        </Text>

        <View style={styles.progressRow}>
          <Text style={[styles.currentEpisode, { color: colors.text }]}>
            Episode {item.current_episode}
          </Text>
          <Text style={[styles.percentage, { color: colors.subtext }]}>{percentage}%</Text>
        </View>

        <View style={[styles.progressBarBackground, { backgroundColor: colors.border }]}>
          <View style={[styles.progressBarFill, { width: `${percentage}%` }]} />
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default function WatchingScreen() {
  const router = useRouter();
  const { colors, toggleTheme, isDark } = useTheme(); // Added toggleTheme, isDark
  const insets = useSafeAreaInsets(); // Added insets
  const [watchingList, setWatchingList] = useState<AnimeListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const flatListRef = React.useRef<FlatList>(null); // Added ref
  // Search State
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = React.useRef<TextInput>(null);

  // Filtered List
  const filteredList = watchingList.filter(item =>
    item.anime_title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleSearch = () => {
    if (isSearchVisible) {
      // Close search
      setIsSearchVisible(false);
      setSearchQuery('');
      Keyboard.dismiss();
    } else {
      // Open search
      setIsSearchVisible(true);
      // Wait for render then focus
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  };

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
    return (
      <WatchingListItem
        item={item}
        onPress={() => handleCardPress(item)}
      />
    );
  };

  const scrollToTop = () => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  };

  // --- Fixed Header Component ---
  const FixedHeader = () => (
    <View style={[styles.fixedHeader, { paddingTop: insets.top + 2, backgroundColor: colors.background, paddingBottom: 0 }]}>
      {isSearchVisible ? (
        // Search Mode Header
        <View style={styles.searchHeaderContainer}>
          <Ionicons name="search-outline" size={20} color={colors.subtext} style={{ marginRight: 8 }} />
          <TextInput
            ref={searchInputRef}
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search watching..."
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
          {/* Left: Logo + Brand */}
          <TouchableOpacity style={styles.headerLeft} onPress={scrollToTop}>
            <Image
              source={require('../../assets/images/header-logo.png')}
              style={styles.headerLogo}
              resizeMode="contain"
            />
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={[styles.headerBrandText, { color: colors.text, marginLeft: 0 }]}>WATCH</Text>
              <Text style={[styles.headerBrandText, { color: '#FACC15', marginLeft: 0 }]}>ING</Text>
            </View>
          </TouchableOpacity>

          {/* Right: Controls */}
          <View style={styles.headerRight}>
            {/* Search Icon */}
            <TouchableOpacity style={styles.iconButton} onPress={toggleSearch}>
              <Ionicons name="search-outline" size={24} color={colors.text} />
            </TouchableOpacity>

            {/* Theme Toggle */}
            <TouchableOpacity style={styles.iconButton} onPress={toggleTheme}>
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
        </>
      )}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {FixedHeader()}

      {/* List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FACC15" />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={filteredList} // Use filtered list
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FACC15" />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name={searchQuery ? "search" : "play-circle-outline"} size={48} color={colors.subtext} />
              <Text style={[styles.emptyText, { color: colors.subtext }]}>
                {searchQuery ? 'No results found' : 'Nothing being watched'}
              </Text>
              {!searchQuery && (
                <Text style={[styles.emptySubText, { color: colors.subtext }]}>Start watching an anime to track your progress here.</Text>
              )}
            </View>
          }
        />
      )}
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
    // Removed fixed height to match index.tsx mechanics (padding + content)
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 0,
  },
  headerLogo: {
    width: 110,
    height: 70,
    marginRight: -20,
    marginLeft: -10, // Reverted to -10 now that padding is corrected
  },
  headerBrandText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 20, // Matched to Home screen
    letterSpacing: 0.5,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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
    paddingBottom: 120,
    minHeight: 300,
    paddingTop: 10,
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
    fontFamily: 'Poppins_500Medium',
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
    fontFamily: 'Poppins_600SemiBold',
    marginRight: 8,
  },
  percentage: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
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
    fontFamily: 'Poppins_500Medium',
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 250,
  },
});
