import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    ScrollView,
    ActivityIndicator,
    FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { Profile, UserAnimeStats } from '../../types';
import { List } from '../../types/lists';
import { useTheme } from '../../context/ThemeContext';
import { getRank, getLevelProgress } from '../../lib/levelSystem';

export default function PublicProfileScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { colors } = useTheme();

    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [stats, setStats] = useState<UserAnimeStats>({
        watched_count: 0,
        watching_count: 0,
        favorites_count: 0,
        days_watched: 0
    });
    const [publicLists, setPublicLists] = useState<List[]>([]);

    useEffect(() => {
        if (id) {
            fetchUserProfile();
        }
    }, [id]);

    const fetchUserProfile = async () => {
        try {
            setLoading(true);

            // 1. Fetch Profile Info
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', id)
                .single();

            if (profileError) throw profileError;
            setProfile(profileData);

            // 2. Fetch Stats
            const { count: watchedCount } = await supabase
                .from('user_anime_list')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', id)
                .eq('status', 'completed');

            const { count: watchingCount } = await supabase
                .from('user_anime_list')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', id)
                .eq('status', 'watching');

            const { count: favCount } = await supabase
                .from('user_anime_list')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', id)
                .eq('is_favorite', true);

            setStats({
                watched_count: watchedCount || 0,
                watching_count: watchingCount || 0,
                favorites_count: favCount || 0,
                days_watched: 0 // Calculation requires fetching all durations, skipping for now
            });

            // 3. Fetch Public Lists
            const { data: listsData, error: listsError } = await supabase
                .from('lists')
                .select('*')
                .eq('user_id', id)
                .eq('is_public', true)
                .order('created_at', { ascending: false });

            if (listsError) throw listsError;
            setPublicLists(listsData || []);

        } catch (error) {
            console.error('Error fetching user profile:', error);
        } finally {
            setLoading(false);
        }
    };

    const renderListCard = ({ item }: { item: List }) => (
        <TouchableOpacity
            style={[styles.listCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push(`/lists/${item.id}`)}
        >
            <View style={styles.listIconContainer}>
                <Ionicons name="list" size={24} color="#FACC15" />
            </View>
            <View style={styles.listInfo}>
                <Text style={[styles.listTitle, { color: colors.text }]} numberOfLines={1}>{item.title}</Text>
                <Text style={[styles.listDesc, { color: colors.subtext }]} numberOfLines={2}>
                    {item.description || 'No description'}
                </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.subtext} />
        </TouchableOpacity>
    );

    if (loading) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color="#FACC15" />
            </View>
        );
    }

    if (!profile) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ color: colors.text }}>User not found</Text>
                <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
                    <Text style={{ color: '#FACC15' }}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const rank = getRank(profile.level || 1);
    const progress = getLevelProgress(profile.xp || 0, profile.level || 1);

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
                    <Ionicons name="chevron-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>{profile.username}</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Profile Header */}
                <View style={styles.profileInfoContainer}>
                    <View style={[
                        styles.avatarContainer,
                        {
                            backgroundColor: colors.card,
                            borderColor: rank.colorHex,
                            borderWidth: rank.borderWidth,
                        }
                    ]}>
                        <Image
                            source={{ uri: profile.avatar_url || 'https://via.placeholder.com/150' }}
                            style={styles.avatar}
                        />
                    </View>

                    <View style={{ marginTop: 12, alignItems: 'center' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Ionicons name="trophy" size={20} color={rank.colorHex} />
                            <Text style={[styles.rankText, { color: rank.colorHex }]}>{rank.name}</Text>
                        </View>
                        <Text style={[styles.levelText, { color: colors.subtext }]}>
                            Level {profile.level || 1} • {progress.current}/{progress.total} XP
                        </Text>
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
                        <Text style={[styles.statValue, { color: colors.text }]}>{stats.watched_count}</Text>
                        <Text style={[styles.statLabel, { color: colors.subtext }]}>Watched</Text>
                    </View>
                    <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                    <View style={styles.statItem}>
                        <Text style={[styles.statValue, { color: colors.text }]}>{stats.favorites_count}</Text>
                        <Text style={[styles.statLabel, { color: colors.subtext }]}>Favs</Text>
                    </View>
                </View>

                {/* Public Lists Section */}
                <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Public Lists</Text>
                    <Text style={[styles.sectionCount, { color: colors.subtext }]}>{publicLists.length}</Text>
                </View>

                {publicLists.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Text style={[styles.emptyText, { color: colors.subtext }]}>This user hasn't created any public lists yet.</Text>
                    </View>
                ) : (
                    <View style={styles.listsContainer}>
                        {publicLists.map(list => (
                            <View key={list.id} style={{ marginBottom: 12 }}>
                                {renderListCard({ item: list })}
                            </View>
                        ))}
                    </View>
                )}
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
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    headerTitle: {
        fontSize: 18,
        fontFamily: 'Poppins_700Bold',
    },
    iconButton: {
        padding: 4,
    },
    scrollContent: {
        paddingBottom: 40,
    },
    profileInfoContainer: {
        alignItems: 'center',
        paddingVertical: 24,
    },
    avatarContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        padding: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
    },
    avatar: {
        width: '100%',
        height: '100%',
        borderRadius: 50,
    },
    rankText: {
        fontSize: 16,
        fontFamily: 'Poppins_700Bold',
    },
    levelText: {
        fontSize: 13,
        fontFamily: 'Poppins_500Medium',
        marginTop: 4,
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingVertical: 16,
        marginHorizontal: 20,
        marginBottom: 24,
    },
    statItem: {
        alignItems: 'center',
        flex: 1,
    },
    statValue: {
        fontSize: 18,
        fontFamily: 'Poppins_700Bold',
    },
    statLabel: {
        fontSize: 12,
        fontFamily: 'Poppins_500Medium',
    },
    statDivider: {
        width: 1,
        height: 30,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 12,
        gap: 8,
    },
    sectionTitle: {
        fontSize: 18,
        fontFamily: 'Poppins_700Bold',
    },
    sectionCount: {
        fontSize: 14,
        fontFamily: 'Poppins_500Medium',
    },
    listsContainer: {
        paddingHorizontal: 20,
    },
    listCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
    },
    listIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 8,
        backgroundColor: 'rgba(250, 204, 21, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    listInfo: {
        flex: 1,
        marginRight: 8,
    },
    listTitle: {
        fontSize: 15,
        fontFamily: 'Poppins_600SemiBold',
        marginBottom: 2,
    },
    listDesc: {
        fontSize: 12,
        fontFamily: 'Poppins_400Regular',
    },
    emptyContainer: {
        padding: 30,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 14,
        fontFamily: 'Poppins_500Medium',
        textAlign: 'center',
    },
});
