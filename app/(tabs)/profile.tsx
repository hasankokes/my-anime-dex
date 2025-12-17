import React, { useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Image, 
  ScrollView, 
  Switch, 
  Alert,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { Profile, UserAnimeStats } from '../../types';
import { useTheme } from '../../context/ThemeContext';

export default function ProfileScreen() {
  const router = useRouter();
  const { colors, isDark, toggleTheme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<UserAnimeStats>({
    watched_count: 0,
    favorites_count: 0,
    days_watched: 0
  });

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
    }, [])
  );

  const fetchProfile = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setProfile({
          id: 'mock-id',
          username: 'Otaku_King_99',
          avatar_url: 'https://images.unsplash.com/photo-1565588383637-643334c4d9fa?q=80&w=400&auto=format&fit=crop',
          level: 42,
          member_since: new Date().toISOString()
        });
        setStats({
          watched_count: 1240,
          favorites_count: 35,
          days_watched: 12
        });
        setLoading(false);
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') throw profileError;

      const { count: watchedCount } = await supabase
        .from('user_anime_list')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session.user.id)
        .eq('status', 'completed');

      const { count: favCount } = await supabase
        .from('user_anime_list')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session.user.id)
        .eq('is_favorite', true);

      if (profileData) {
        setProfile(profileData);
        setStats({
          watched_count: watchedCount || 0,
          favorites_count: favCount || 0,
          days_watched: 12 
        });
      }
    } catch (error) {
      if (error instanceof Error) {
        console.log('Error fetching profile:', error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      router.replace('/');
    }
  };

  const seedSampleData = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        Alert.alert('Error', 'You must be logged in to seed data.');
        return;
      }

      const { count } = await supabase
        .from('user_anime_list')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session.user.id);

      if (count && count > 0) {
        Alert.alert('Info', 'You already have data in your list.');
        setLoading(false);
        return;
      }

      const sampleData = [
        {
          user_id: session.user.id,
          anime_id: '1',
          anime_title: 'Jujutsu Kaisen',
          anime_image: 'https://images.unsplash.com/photo-1519074069444-1ba4fff66d16?q=80&w=600&auto=format&fit=crop',
          status: 'watching',
          is_favorite: true,
          current_episode: 14,
          total_episodes: 23
        },
        {
          user_id: session.user.id,
          anime_id: '2',
          anime_title: 'Demon Slayer',
          anime_image: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?q=80&w=600&auto=format&fit=crop',
          status: 'watching',
          is_favorite: false,
          current_episode: 5,
          total_episodes: 12
        },
        {
          user_id: session.user.id,
          anime_id: '3',
          anime_title: 'Spy x Family',
          anime_image: 'https://images.unsplash.com/photo-1559583109-3e7968136c99?q=80&w=600&auto=format&fit=crop',
          status: 'watching',
          is_favorite: true,
          current_episode: 22,
          total_episodes: 25
        },
        {
          user_id: session.user.id,
          anime_id: '4',
          anime_title: 'Attack on Titan',
          anime_image: 'https://images.unsplash.com/photo-1541562232579-512a21360020?q=80&w=600&auto=format&fit=crop',
          status: 'completed',
          is_favorite: true,
          current_episode: 89,
          total_episodes: 89
        },
        {
          user_id: session.user.id,
          anime_id: '5',
          anime_title: 'Chainsaw Man',
          anime_image: 'https://images.unsplash.com/photo-1620336655052-b57972f3a260?q=80&w=600&auto=format&fit=crop',
          status: 'plan_to_watch',
          is_favorite: false,
          current_episode: 0,
          total_episodes: 12
        }
      ];

      const { error } = await supabase.from('user_anime_list').insert(sampleData);
      if (error) throw error;
      Alert.alert('Success', 'Sample data added! Check your Favorites and Watching tabs.');
      fetchProfile();
    } catch (error) {
      Alert.alert('Error', (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color="#FACC15" />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Profile</Text>
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="ellipsis-horizontal" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Profile Info */}
        <View style={styles.profileInfoContainer}>
          <View style={styles.avatarWrapper}>
            <View style={[styles.avatarContainer, { backgroundColor: colors.card }]}>
              <Image 
                source={{ uri: profile?.avatar_url || 'https://via.placeholder.com/150' }} 
                style={styles.avatar} 
              />
            </View>
            <TouchableOpacity style={[styles.editBadge, { backgroundColor: colors.border, borderColor: colors.card }]}>
              <MaterialIcons name="edit" size={14} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <Text style={[styles.username, { color: colors.text }]}>{profile?.username || 'User'}</Text>
          <Text style={styles.memberInfo}>
            Member since {new Date(profile?.member_since || Date.now()).getFullYear()} • Lvl {profile?.level || 1}
          </Text>
        </View>

        {/* Stats Row */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.text }]}>{stats.watched_count.toLocaleString()}</Text>
            <Text style={[styles.statLabel, { color: colors.subtext }]}>Watched</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.text }]}>{stats.favorites_count}</Text>
            <Text style={[styles.statLabel, { color: colors.subtext }]}>Favs</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.text }]}>{stats.days_watched}d</Text>
            <Text style={[styles.statLabel, { color: colors.subtext }]}>Time</Text>
          </View>
        </View>

        {/* Dev Tool: Seed Data */}
        <TouchableOpacity 
          style={[styles.seedButton, { backgroundColor: colors.card, borderColor: colors.border }]} 
          onPress={seedSampleData}
        >
          <Ionicons name="database-outline" size={20} color={colors.text} style={{ marginRight: 8 }} />
          <Text style={[styles.seedButtonText, { color: colors.text }]}>Seed Sample Data (Dev)</Text>
        </TouchableOpacity>

        {/* Subscription Card */}
        <View style={[styles.subscriptionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.subHeader}>
            <Ionicons name="star" size={20} color="#FACC15" style={{ marginRight: 8 }} />
            <Text style={[styles.subTitle, { color: colors.text }]}>Ad-supported Free</Text>
          </View>
          
          <Text style={[styles.subDescription, { color: colors.subtext }]}>
            Ad-supported. Upgrade to unlock offline viewing and exclusive themes.
          </Text>

          <TouchableOpacity 
            style={styles.upgradeButton}
            onPress={() => router.push('/subscription')}
          >
            <Ionicons name="diamond-outline" size={18} color="#111827" style={{ marginRight: 8 }} />
            <Text style={styles.upgradeButtonText}>Purchase Annual Subscription</Text>
          </TouchableOpacity>

          <View style={styles.decorativeCircle} />
        </View>

        {/* App Settings */}
        <Text style={[styles.sectionHeader, { color: colors.text }]}>App Settings</Text>
        
        <View style={[styles.settingsContainer, { backgroundColor: colors.card }]}>
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIconContainer, { backgroundColor: colors.border }]}>
                <Ionicons name={isDark ? "moon" : "sunny"} size={20} color={colors.text} />
              </View>
              <Text style={[styles.settingLabel, { color: colors.text }]}>Dark Mode</Text>
            </View>
            <Switch 
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: '#374151', true: '#FACC15' }}
              thumbColor={'#FFFFFF'}
            />
          </View>

          <View style={[styles.settingDivider, { backgroundColor: colors.border }]} />

          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIconContainer, { backgroundColor: colors.border }]}>
                <MaterialIcons name="translate" size={20} color={colors.text} />
              </View>
              <View>
                <Text style={[styles.settingLabel, { color: colors.text }]}>Language</Text>
                <Text style={styles.settingSubLabel}>English (US)</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.subtext} />
          </TouchableOpacity>
        </View>

        {/* Log Out */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={20} color="#EF4444" style={{ marginRight: 8 }} />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>App Version 2.4.0 (Build 391)</Text>
        <View style={{ height: 40 }} />
      </ScrollView>
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
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
  },
  iconButton: {
    padding: 8,
  },
  profileInfoContainer: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 24,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 16,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    padding: 3,
    borderWidth: 2,
    borderColor: '#FACC15',
    shadowColor: '#FACC15',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 5,
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  username: {
    fontSize: 22,
    fontFamily: 'Poppins_700Bold',
    marginBottom: 4,
  },
  memberInfo: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#FACC15',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 40,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontFamily: 'Poppins_700Bold',
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
  },
  seedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginBottom: 24,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  seedButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
  subscriptionCard: {
    marginHorizontal: 20,
    borderRadius: 24,
    padding: 24,
    marginBottom: 32,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 2,
    borderWidth: 1,
  },
  decorativeCircle: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FACC15',
    opacity: 0.1,
  },
  subHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  subTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
  },
  subDescription: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    lineHeight: 20,
    marginBottom: 20,
    paddingRight: 20,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FACC15',
    paddingVertical: 14,
    borderRadius: 16,
  },
  upgradeButtonText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#111827',
  },
  sectionHeader: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    marginLeft: 20,
    marginBottom: 16,
  },
  settingsContainer: {
    marginHorizontal: 20,
    borderRadius: 24,
    padding: 8,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 1,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  settingDivider: {
    height: 1,
    marginLeft: 56,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
  },
  settingSubLabel: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: '#FACC15',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logoutText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#EF4444',
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: '#6B7280',
  },
});
