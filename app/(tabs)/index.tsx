import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TextInput, 
  TouchableOpacity, 
  Image, 
  Dimensions,
  FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';

const { width } = Dimensions.get('window');

// Mock Data
const CATEGORIES = ['All', 'Shounen', 'Romance', 'Isekai', 'Action', 'Fantasy'];

const TRENDING_DATA = [
  {
    id: '1',
    title: 'Chainsaw Man',
    genre: 'Action',
    seasons: '1 Season',
    image: 'https://images.unsplash.com/photo-1620336655052-b57972f3a260?q=80&w=800&auto=format&fit=crop', 
    rank: 1,
    totalEpisodes: 12
  },
  {
    id: '2',
    title: 'Cyberpunk',
    genre: 'Sci-Fi',
    seasons: '1 Season',
    image: 'https://images.unsplash.com/photo-1535295972055-1c762f4483e5?q=80&w=800&auto=format&fit=crop', 
    rank: 2,
    totalEpisodes: 10
  },
];

const RECOMMENDED_DATA = [
  {
    id: '1',
    title: 'Jujutsu Kaisen',
    genre: 'Action',
    seasons: '2 Seasons',
    rating: 4.9,
    image: 'https://images.unsplash.com/photo-1620336655055-088d06e36bf0?q=80&w=600&auto=format&fit=crop',
    tagColor: '#374151',
    tagTextColor: '#FACC15',
    totalEpisodes: 24
  },
  {
    id: '2',
    title: 'One Piece',
    genre: 'Adv.',
    seasons: '21 Seasons',
    isNewEp: true,
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=600&auto=format&fit=crop', 
    tagColor: '#1E3A8A',
    tagTextColor: '#93C5FD',
    totalEpisodes: 1000
  },
  {
    id: '3',
    title: 'Neon Genesis',
    genre: 'Mecha',
    seasons: '1 Season',
    image: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=600&auto=format&fit=crop', 
    tagColor: '#4C1D95',
    tagTextColor: '#D8B4FE',
    totalEpisodes: 26
  },
  {
    id: '4',
    title: 'Violet Evergarden',
    genre: 'Drama',
    seasons: '1 Season',
    rating: 4.5,
    image: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=600&auto=format&fit=crop', 
    tagColor: '#831843',
    tagTextColor: '#FBCFE8',
    totalEpisodes: 13
  },
];

export default function HomeScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const [activeCategory, setActiveCategory] = useState('All');

  const handleAnimePress = (item: any) => {
    router.push({
      pathname: '/anime/[id]',
      params: { 
        id: item.id, 
        title: item.title, 
        image: item.image,
        totalEpisodes: item.totalEpisodes || 12
      }
    });
  };

  const renderCategory = ({ item }: { item: string }) => {
    const isActive = activeCategory === item;
    return (
      <TouchableOpacity 
        style={[
          styles.categoryPill, 
          { 
            backgroundColor: isActive ? colors.primary : colors.card,
            borderColor: isActive ? colors.primary : colors.border
          }
        ]}
        onPress={() => setActiveCategory(item)}
      >
        <Text style={[
          styles.categoryText, 
          { color: isActive ? '#111827' : colors.subtext }
        ]}>
          {item}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderTrendingCard = ({ item }: { item: typeof TRENDING_DATA[0] }) => (
    <TouchableOpacity 
      style={[styles.trendingCard, { backgroundColor: colors.card }]} 
      activeOpacity={0.9}
      onPress={() => handleAnimePress(item)}
    >
      <Image source={{ uri: item.image }} style={styles.trendingImage} />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.9)']}
        style={styles.gradientOverlay}
      />
      
      <View style={styles.trendingBadge}>
        <Text style={styles.trendingBadgeText}>#{item.rank} TRENDING</Text>
      </View>

      <View style={styles.trendingContent}>
        <Text style={styles.trendingTitle}>{item.title}</Text>
        <Text style={styles.trendingSubtitle}>{item.genre} • {item.seasons}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: colors.subtext }]}>Welcome Back,</Text>
            <Text style={[styles.appName, { color: colors.text }]}>My AnimeDex</Text>
          </View>
          <TouchableOpacity style={styles.notificationButton}>
            <Ionicons name="notifications" size={24} color={colors.text} />
            <View style={styles.notificationDot} />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={[styles.searchBar, { backgroundColor: colors.inputBg }]}>
            <Ionicons name="search" size={20} color={colors.subtext} style={styles.searchIcon} />
            <TextInput 
              placeholder="Search anime, characters..."
              placeholderTextColor={colors.subtext}
              style={[styles.searchInput, { color: colors.text }]}
            />
            <TouchableOpacity>
               <Ionicons name="options-outline" size={20} color={colors.subtext} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Categories */}
        <View style={styles.categoriesContainer}>
          <FlatList
            data={CATEGORIES}
            renderItem={renderCategory}
            keyExtractor={(item) => item}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20 }}
          />
        </View>

        {/* Trending Section */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Trending Now</Text>
            <Text style={[styles.sectionSubtitle, { color: colors.subtext }]}>Top hits this week</Text>
          </View>
          <TouchableOpacity style={[styles.seeAllButton, { backgroundColor: colors.card }]}>
            <Text style={styles.seeAllText}>See all</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={TRENDING_DATA}
          renderItem={renderTrendingCard}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20 }}
          style={styles.trendingList}
        />

        {/* Recommended Section */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Recommended for You</Text>
          <TouchableOpacity>
            <Ionicons name="filter" size={20} color={colors.subtext} />
          </TouchableOpacity>
        </View>

        <View style={styles.gridContainer}>
          {RECOMMENDED_DATA.map((item) => (
            <TouchableOpacity 
              key={item.id} 
              style={styles.gridItem} 
              activeOpacity={0.8}
              onPress={() => handleAnimePress(item)}
            >
              <View style={[styles.posterContainer, { backgroundColor: colors.card }]}>
                <Image source={{ uri: item.image }} style={styles.posterImage} />
                
                {item.isNewEp && (
                  <View style={styles.newEpBadge}>
                    <Text style={styles.newEpText}>New Ep</Text>
                  </View>
                )}
                
                {item.rating && (
                  <View style={styles.ratingBadge}>
                    <Ionicons name="star" size={10} color="#FACC15" style={{ marginRight: 2 }} />
                    <Text style={styles.ratingText}>{item.rating}</Text>
                  </View>
                )}
              </View>
              
              <Text style={[styles.animeTitle, { color: colors.text }]} numberOfLines={1}>{item.title}</Text>
              
              <View style={styles.metaRow}>
                <View style={[styles.genreTag, { backgroundColor: isDark ? item.tagColor : colors.inputBg }]}>
                  <Text style={[styles.genreText, { color: isDark ? item.tagTextColor : colors.text }]}>{item.genre}</Text>
                </View>
                <Text style={[styles.seasonsText, { color: colors.subtext }]}>{item.seasons}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    marginBottom: 20,
  },
  greeting: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
  appName: {
    fontSize: 22,
    fontFamily: 'Poppins_700Bold',
  },
  notificationButton: {
    position: 'relative',
    padding: 4,
  },
  notificationDot: {
    position: 'absolute',
    top: 4,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FACC15',
    borderWidth: 1,
    borderColor: '#0F0F0F',
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
  },
  categoriesContainer: {
    marginBottom: 24,
  },
  categoryPill: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 12,
    borderWidth: 1,
  },
  categoryText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
  },
  sectionSubtitle: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
  seeAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  seeAllText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: '#FACC15',
  },
  trendingList: {
    marginBottom: 32,
  },
  trendingCard: {
    width: width * 0.75,
    height: 180,
    marginRight: 16,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  trendingImage: {
    width: '100%',
    height: '100%',
  },
  gradientOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '80%',
  },
  trendingBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: '#FACC15',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  trendingBadgeText: {
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    color: '#111827',
  },
  trendingContent: {
    position: 'absolute',
    bottom: 16,
    left: 16,
  },
  trendingTitle: {
    fontSize: 20,
    fontFamily: 'Poppins_700Bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  trendingSubtitle: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: '#E5E7EB',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    justifyContent: 'space-between',
  },
  gridItem: {
    width: (width - 56) / 2,
    marginBottom: 24,
  },
  posterContainer: {
    width: '100%',
    aspectRatio: 0.7,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 10,
    position: 'relative',
  },
  posterImage: {
    width: '100%',
    height: '100%',
  },
  newEpBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#FACC15',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  newEpText: {
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    color: '#111827',
  },
  ratingBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.8)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  ratingText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
  },
  animeTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  genreTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  genreText: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
  },
  seasonsText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
});
