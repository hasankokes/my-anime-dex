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
  Modal,
  TextInput,
  ActivityIndicator,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { Profile, UserAnimeStats } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { getRank, getLevelProgress } from '../../lib/levelSystem';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthProvider';

export default function ProfileScreen() {
  const router = useRouter();
  const { colors, isDark, toggleTheme } = useTheme();
  const { t, language } = useLanguage();
  const { signOut, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<UserAnimeStats>({
    watched_count: 0,
    watching_count: 0,
    favorites_count: 0,
    days_watched: 0
  });

  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [isAvatarModalVisible, setIsAvatarModalVisible] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [uploading, setUploading] = useState(false);
  const [randomAvatars, setRandomAvatars] = useState<string[]>([]);
  const [loadingAvatars, setLoadingAvatars] = useState(false);

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
          xp: 1870, // Mock XP
          member_since: new Date().toISOString(),
          is_pro: false // Default to false for mock
        });
        setStats({
          watched_count: 1240,
          watching_count: 5,
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

      const { count: watchingCount } = await supabase
        .from('user_anime_list')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session.user.id)
        .eq('status', 'watching');

      const { count: favCount } = await supabase
        .from('user_anime_list')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session.user.id)
        .eq('is_favorite', true);

      if (profileData) {
        setProfile(profileData);
        setStats({
          watched_count: watchedCount || 0,
          watching_count: watchingCount || 0,
          favorites_count: favCount || 0,
          days_watched: 12
        });
      }
    } catch (error) {
      if (error instanceof Error) {

      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(); // Use the context signOut which clears local state immediately
      router.replace('/login'); // Explicitly redirect to login page
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert('Error', error.message);
      }
    }
  };

  const startEditing = () => {
    setNewUsername(profile?.username || '');
    setIsEditing(true);
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        setIsAvatarModalVisible(false); // Close modal if open
        uploadAvatar(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Error picking image');
    }
  };

  const takePhoto = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

      if (permissionResult.granted === false) {
        Alert.alert('Permission Required', 'You need to allow access to your camera to take photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        setIsAvatarModalVisible(false);
        uploadAvatar(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Error taking photo');
    }
  };

  const fetchRandomCharacters = async () => {
    try {
      setLoadingAvatars(true);
      // Random page between 1 and 100 (top 2000 characters) to ensure quality
      const randomPage = Math.floor(Math.random() * 100) + 1;

      const response = await fetch(`https://api.jikan.moe/v4/characters?page=${randomPage}&limit=20&order_by=favorites&sort=desc`);
      const data = await response.json();

      if (data.data) {
        const characters = data.data
          .map((char: any) => char.images?.jpg?.image_url)
          .filter((url: string) => url)
          .slice(0, 9);
        setRandomAvatars(characters);
      }
    } catch (error) {

    } finally {
      setLoadingAvatars(false);
    }
  };

  const openAvatarModal = () => {
    setIsAvatarModalVisible(true);
    fetchRandomCharacters();
  };

  const selectPredefinedAvatar = async (url: string) => {
    try {
      setUploading(true);
      setIsAvatarModalVisible(false);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No user on the session!');

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: url })
        .eq('id', session.user.id);

      if (updateError) throw updateError;

      setProfile(prev => prev ? { ...prev, avatar_url: url } : null);
      await refreshProfile(); // Refresh global state
      Alert.alert('Success', 'Profile picture updated!');

    } catch (error) {
      Alert.alert('Error', (error as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const uploadAvatar = async (uri: string) => {
    try {
      setUploading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No user on the session!');

      const response = await fetch(uri);
      const blob = await response.blob();
      const arrayBuffer = await new Response(blob).arrayBuffer();

      const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${session.user.id}/${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, arrayBuffer, {
          contentType: blob.type,
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: data.publicUrl })
        .eq('id', session.user.id);

      if (updateError) throw updateError;

      setProfile(prev => prev ? { ...prev, avatar_url: data.publicUrl } : null);
      await refreshProfile(); // Refresh global state
      Alert.alert('Success', 'Profile picture updated!');

    } catch (error) {
      Alert.alert('Error', (error as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const saveProfile = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No user!');

      if (newUsername.length < 3) {
        Alert.alert('Error', 'Username must be at least 3 characters');
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .update({ username: newUsername })
        .eq('id', session.user.id);

      if (error) throw error;

      setProfile(prev => prev ? { ...prev, username: newUsername } : null);
      setIsEditing(false);
      Alert.alert('Success', 'Profile updated!');

    } catch (error) {
      Alert.alert('Error', (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    const performDelete = async () => {
      try {
        setLoading(true);
        const { error } = await supabase.rpc('delete_user_account');

        if (error) throw error;

        // Force sign out locally to clear session
        await supabase.auth.signOut();

        if (Platform.OS === 'web') {
          window.alert('Account deleted successfully. We are sorry to see you go.');
        } else {
          Alert.alert('Account Deleted', 'Your account has been permanently deleted.');
        }
        // Router will auto-redirect to login due to AuthGuard
      } catch (error) {
        if (Platform.OS === 'web') {
          window.alert(`Error: ${(error as Error).message}`);
        } else {
          Alert.alert('Error', (error as Error).message);
        }
        setLoading(false);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('CRITICAL: Are you sure you want to delete your account? This action is PERMANENT and CANNOT be undone. All your data will be lost forever.')) {
        performDelete();
      }
    } else {
      Alert.alert(
        'Delete Account',
        'CRITICAL: Are you sure you want to delete your account? This action is PERMANENT and CANNOT be undone. All your data will be lost forever.',
        [
          {
            text: 'Cancel',
            style: 'cancel'
          },
          {
            text: 'Delete Account',
            style: 'destructive',
            onPress: performDelete
          }
        ]
      );
    }
  };

  const handleResetProgress = async () => {


    const performReset = async () => {
      try {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const { error } = await supabase
          .from('user_anime_list')
          .delete()
          .eq('user_id', session.user.id);

        if (error) throw error;

        if (Platform.OS === 'web') {
          window.alert('Success: Your progress has been reset.');
        } else {
          Alert.alert('Success', 'Your progress has been reset.');
        }
        fetchProfile(); // Refresh stats
      } catch (error) {
        if (Platform.OS === 'web') {
          window.alert(`Error: ${(error as Error).message}`);
        } else {
          Alert.alert('Error', (error as Error).message);
        }
      } finally {
        setLoading(false);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to delete all your progress? This will remove all anime from your list, including scores and status. This action cannot be undone.')) {
        performReset();
      }
    } else {
      Alert.alert(
        'Reset Progress',
        'Are you sure you want to delete all your progress? This will remove all anime from your list, including scores and status. This action cannot be undone.',
        [
          {
            text: 'Cancel',
            style: 'cancel'
          },
          {
            text: 'Reset',
            style: 'destructive',
            onPress: performReset
          }
        ]
      );
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

        </View>

        {/* Profile Info */}
        {/* Profile Info */}
        <View style={styles.profileInfoContainer}>
          <TouchableOpacity onPress={openAvatarModal} disabled={uploading} style={styles.avatarWrapper}>
            {profile?.is_pro ? (
              <LinearGradient
                colors={['#c084fc', '#a855f7', '#7e22ce']} // Purple gradient
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  borderRadius: 60,
                  padding: 4, // Thickness of the gradient border
                }}
              >
                <View style={[
                  styles.avatarContainer,
                  {
                    backgroundColor: colors.card,
                    borderColor: getRank(profile?.level || 1).colorHex,
                    borderWidth: getRank(profile?.level || 1).borderWidth,
                    width: 100,
                    height: 100,
                  }
                ]}>
                  {uploading ? (
                    <ActivityIndicator size="small" color="#FACC15" style={{ flex: 1 }} />
                  ) : (
                    <Image
                      source={{ uri: profile?.avatar_url || 'https://via.placeholder.com/150' }}
                      style={styles.avatar}
                    />
                  )}
                </View>
              </LinearGradient>
            ) : (
              <View style={[
                styles.avatarContainer,
                {
                  backgroundColor: colors.card,
                  borderColor: getRank(profile?.level || 1).colorHex,
                  borderWidth: getRank(profile?.level || 1).borderWidth,
                }
              ]}>
                {uploading ? (
                  <ActivityIndicator size="small" color="#FACC15" style={{ flex: 1 }} />
                ) : (
                  <Image
                    source={{ uri: profile?.avatar_url || 'https://via.placeholder.com/150' }}
                    style={styles.avatar}
                  />
                )}
              </View>
            )}
            <View style={[styles.editBadge, { backgroundColor: colors.border, borderColor: colors.card }]}>
              <MaterialIcons name="camera-alt" size={14} color="#FFFFFF" />
            </View>
          </TouchableOpacity>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={[styles.username, { color: colors.text }]}>{profile?.username || 'User'}</Text>
            <TouchableOpacity onPress={startEditing}>
              <MaterialIcons name="edit" size={18} color={colors.subtext} />
            </TouchableOpacity>
          </View>

          <View style={{ alignItems: 'center', width: '100%', paddingHorizontal: 40, marginTop: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
              <Text style={[
                styles.rankTitle,
                { color: getRank(profile?.level || 1).colorHex, marginRight: 8 }
              ]}>
                {getRank(profile?.level || 1).name}
              </Text>
              <TouchableOpacity onPress={() => router.push('/leaderboard')}>
                <Ionicons name="trophy" size={20} color={getRank(profile?.level || 1).colorHex} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.memberInfo, { marginBottom: 8, color: getRank(profile?.level || 1).colorHex }]}>
              Level {profile?.level || 1} • {getLevelProgress(profile?.xp || 0, profile?.level || 1).current}/{getLevelProgress(profile?.xp || 0, profile?.level || 1).total} XP
            </Text>

            <View style={{
              width: '100%',
              height: 12,
              backgroundColor: colors.border,
              borderRadius: 6,
              overflow: 'hidden'
            }}>
              <View style={{
                width: `${getLevelProgress(profile?.xp || 0, profile?.level || 1).percent * 100}%`,
                height: '100%',
                backgroundColor: getRank(profile?.level || 1).colorHex,
                borderRadius: 6
              }} />
            </View>
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.text }]}>{stats.watching_count}</Text>
            <Text style={[styles.statLabel, { color: colors.subtext }]}>Watching</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.text }]}>{stats.watched_count.toLocaleString()}</Text>
            <Text style={[styles.statLabel, { color: colors.subtext }]}>Watched</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.text }]}>{stats.favorites_count}</Text>
            <Text style={[styles.statLabel, { color: colors.subtext }]}>Favs</Text>
          </View>

        </View>



        {/* Subscription Card */}
        {!profile?.is_pro && (
          <View style={[styles.subscriptionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.subHeader}>
              <Ionicons name="star" size={20} color="#FACC15" style={{ marginRight: 8 }} />
              <Text style={[styles.subTitle, { color: colors.text }]}>Upgrade to AnimeDex Premium</Text>
            </View>

            <Text style={[styles.subDescription, { color: colors.subtext }]}>
              Ad-free. Upgrade to unlock offline viewing and exclusive themes.
            </Text>

            <TouchableOpacity
              style={styles.upgradeButton}
              onPress={() => router.push('/subscription')}
            >
              <Ionicons name="diamond-outline" size={18} color="#111827" style={{ marginRight: 8 }} />
              <Text style={styles.upgradeButtonText}>Start monthly plan</Text>
            </TouchableOpacity>

            <View style={styles.decorativeCircle} />
          </View>
        )}

        {/* My Library */}
        <Text style={[styles.sectionHeader, { color: colors.text }]}>{t('profile.myLibrary')}</Text>

        <View style={[styles.settingsContainer, { backgroundColor: colors.card }]}>
          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => router.push('/lists')}
          >
            <View style={styles.settingLeft}>
              <View style={[styles.settingIconContainer, { backgroundColor: colors.border }]}>
                <Ionicons name="list" size={20} color={colors.text} />
              </View>
              <Text style={[styles.settingLabel, { color: colors.text }]}>{t('profile.myLists')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.subtext} />
          </TouchableOpacity>
        </View>

        {/* App Settings */}
        <Text style={[styles.sectionHeader, { color: colors.text }]}>{t('settings.title')}</Text>

        <View style={[styles.settingsContainer, { backgroundColor: colors.card }]}>
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIconContainer, { backgroundColor: colors.border }]}>
                <Ionicons name={isDark ? "sunny" : "moon"} size={20} color={colors.text} />
              </View>
              <Text style={[styles.settingLabel, { color: colors.text }]}>{t('settings.theme')}</Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: '#374151', true: '#FACC15' }}
              thumbColor={'#FFFFFF'}
            />
          </View>

          <View style={[styles.settingDivider, { backgroundColor: colors.border }]} />

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => router.push('/settings/language')}
          >
            <View style={styles.settingLeft}>
              <View style={[styles.settingIconContainer, { backgroundColor: colors.border }]}>
                <MaterialIcons name="translate" size={20} color={colors.text} />
              </View>
              <View>
                <Text style={[styles.settingLabel, { color: colors.text }]}>{t('settings.language')}</Text>
                <Text style={styles.settingSubLabel}>
                  {
                    {
                      'en': 'English (US)',
                      'tr': 'Türkçe',
                      'ja': '日本語',
                      'ru': 'Русский',
                      'de': 'Deutsch',
                      'es': 'Español',
                      'pt': 'Português',
                      'id': 'Bahasa Indonesia',
                      'ar': 'العربية'
                    }[language] || 'English (US)'
                  }
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.subtext} />
          </TouchableOpacity>
        </View>

        {/* Support & Legal */}
        <Text style={[styles.sectionHeader, { color: colors.text }]}>Support & Legal</Text>

        <View style={[styles.settingsContainer, { backgroundColor: colors.card }]}>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => router.push('/settings/help')}
          >
            <View style={styles.settingLeft}>
              <View style={[styles.settingIconContainer, { backgroundColor: colors.border }]}>
                <Ionicons name="help-buoy-outline" size={20} color={colors.text} />
              </View>
              <Text style={[styles.settingLabel, { color: colors.text }]}>{t('settings.support')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.subtext} />
          </TouchableOpacity>

          <View style={[styles.settingDivider, { backgroundColor: colors.border }]} />

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => router.push('/settings/privacy')}
          >
            <View style={styles.settingLeft}>
              <View style={[styles.settingIconContainer, { backgroundColor: colors.border }]}>
                <Ionicons name="lock-closed-outline" size={20} color={colors.text} />
              </View>
              <Text style={[styles.settingLabel, { color: colors.text }]}>{t('settings.privacy')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.subtext} />
          </TouchableOpacity>

          <View style={[styles.settingDivider, { backgroundColor: colors.border }]} />

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => router.push('/settings/terms')}
          >
            <View style={styles.settingLeft}>
              <View style={[styles.settingIconContainer, { backgroundColor: colors.border }]}>
                <Ionicons name="document-text-outline" size={20} color={colors.text} />
              </View>
              <Text style={[styles.settingLabel, { color: colors.text }]}>{t('settings.terms')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.subtext} />
          </TouchableOpacity>
        </View>

        <Text style={[styles.sectionHeader, { marginTop: 24, color: '#EF4444' }]}>Danger Zone</Text>
        <View style={[styles.settingsContainer, { backgroundColor: colors.card, borderColor: '#EF4444', borderWidth: 1 }]}>
          <TouchableOpacity
            style={styles.settingItem}
            onPress={handleResetProgress}
          >
            <View style={styles.settingLeft}>
              <View style={[styles.settingIconContainer, { backgroundColor: '#FEE2E2' }]}>
                <Ionicons name="refresh-outline" size={20} color="#EF4444" />
              </View>
              <Text style={[styles.settingLabel, { color: '#EF4444' }]}>Reset Progress</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.subtext} />
          </TouchableOpacity>

          <View style={[styles.settingDivider, { backgroundColor: '#FEE2E2' }]} />

          <TouchableOpacity
            style={styles.settingItem}
            onPress={handleDeleteAccount}
          >
            <View style={styles.settingLeft}>
              <View style={[styles.settingIconContainer, { backgroundColor: '#FEE2E2' }]}>
                <Ionicons name="trash-outline" size={20} color="#EF4444" />
              </View>
              <Text style={[styles.settingLabel, { color: '#EF4444' }]}>Delete Account</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.subtext} />
          </TouchableOpacity>
        </View>

        {/* Log Out */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={20} color="#EF4444" style={{ marginRight: 8 }} />
          <Text style={styles.logoutText}>{t('settings.logout')}</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>{t('settings.appVersion')} 1.0.1</Text>
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Edit Modal */}
      <Modal
        visible={isEditing}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsEditing(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Edit Profile</Text>

            <Text style={[styles.inputLabel, { color: colors.subtext }]}>Username</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.inputBg,
                  color: colors.text,
                  borderColor: colors.border
                }
              ]}
              value={newUsername}
              onChangeText={setNewUsername}
              placeholder="Enter username"
              placeholderTextColor={colors.subtext}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.border }]}
                onPress={() => setIsEditing(false)}
              >
                <Text style={{ color: colors.text }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: '#FACC15' }]}
                onPress={saveProfile}
              >
                <Text style={{ color: '#000', fontWeight: 'bold' }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Avatar Selection Modal */}
      <Modal
        visible={isAvatarModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsAvatarModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card, maxHeight: '80%' }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={[styles.modalTitle, { color: colors.text, marginBottom: 0 }]}>Choose Avatar</Text>
              <TouchableOpacity onPress={() => setIsAvatarModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
                <TouchableOpacity
                  style={[styles.webOptionButton, { borderColor: colors.border, flex: 1, marginBottom: 0 }]}
                  onPress={pickImage}
                >
                  <Ionicons name="images-outline" size={24} color={colors.text} style={{ marginRight: 10 }} />
                  <Text style={{ color: colors.text, fontFamily: 'Poppins_600SemiBold', fontSize: 12 }}>Gallery</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.webOptionButton, { borderColor: colors.border, flex: 1, marginBottom: 0 }]}
                  onPress={takePhoto}
                >
                  <Ionicons name="camera-outline" size={24} color={colors.text} style={{ marginRight: 10 }} />
                  <Text style={{ color: colors.text, fontFamily: 'Poppins_600SemiBold', fontSize: 12 }}>Camera</Text>
                </TouchableOpacity>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={[styles.sectionHeader, { marginLeft: 0, fontSize: 16, marginBottom: 0, color: colors.text }]}>
                  Random Characters
                </Text>
                <TouchableOpacity onPress={fetchRandomCharacters} disabled={loadingAvatars}>
                  <Ionicons name="refresh" size={20} color={colors.text} />
                </TouchableOpacity>
              </View>

              {loadingAvatars ? (
                <View style={{ height: 200, justifyContent: 'center', alignItems: 'center' }}>
                  <ActivityIndicator size="large" color="#FACC15" />
                </View>
              ) : (
                <View style={styles.avatarGrid}>
                  {randomAvatars.map((url, index) => (
                    <TouchableOpacity
                      key={index}
                      onPress={() => selectPredefinedAvatar(url)}
                      style={styles.gridAvatarContainer}
                    >
                      <Image source={{ uri: url }} style={styles.gridAvatar} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
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
  scrollContent: {
    paddingBottom: 120, // Increased to clear floating tab bar
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
  rankTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    letterSpacing: 1,
  },
  memberInfo: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
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
    fontFamily: 'Poppins_500Medium',
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
    fontFamily: 'Poppins_600SemiBold',
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
    fontFamily: 'Poppins_500Medium',
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
    fontFamily: 'Poppins_600SemiBold',
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
    fontFamily: 'Poppins_600SemiBold',
  },
  settingSubLabel: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
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
    fontFamily: 'Poppins_600SemiBold',
    color: '#EF4444',
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    color: '#6B7280',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Poppins_700Bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    fontFamily: 'Poppins_500Medium',
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  webOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  gridAvatarContainer: {
    width: '30%',
    aspectRatio: 0.7,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  gridAvatar: {
    width: '100%',
    height: '100%',
  },
});
