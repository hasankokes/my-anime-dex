import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useTheme } from '../context/ThemeContext';
import { getRank } from '../lib/levelSystem';

type LeaderboardUser = {
    id: string;
    username: string;
    avatar_url: string;
    level: number;
    xp: number;
};

export default function LeaderboardScreen() {
    const router = useRouter();
    const { colors } = useTheme();
    const [users, setUsers] = useState<LeaderboardUser[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchLeaderboard();
    }, []);

    const fetchLeaderboard = async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, username, avatar_url, level, xp')
                .order('level', { ascending: false })
                .order('xp', { ascending: false })
                .limit(20);

            if (error) throw error;

            if (data) {
                setUsers(data);
            }
        } catch (error) {

        } finally {
            setLoading(false);
        }
    };

    const renderItem = ({ item, index }: { item: LeaderboardUser; index: number }) => {
        const rank = index + 1;
        const userRank = getRank(item.level || 1);

        // Special styling for top 3
        let rankColor = colors.text;
        let rankBadgeColor = 'transparent';
        let rankTextColor = colors.text;

        if (rank === 1) {
            rankColor = '#FFD700'; // Gold
            rankBadgeColor = 'rgba(255, 215, 0, 0.15)';
            rankTextColor = '#FFD700';
        } else if (rank === 2) {
            rankColor = '#C0C0C0'; // Silver
            rankBadgeColor = 'rgba(192, 192, 192, 0.15)';
            rankTextColor = '#C0C0C0';
        } else if (rank === 3) {
            rankColor = '#CD7F32'; // Bronze
            rankBadgeColor = 'rgba(205, 127, 50, 0.15)';
            rankTextColor = '#CD7F32';
        }

        return (
            <View style={[styles.userItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.rankContainer, { backgroundColor: rankBadgeColor }]}>
                    {rank <= 3 ? (
                        <Ionicons name="trophy" size={16} color={rankColor} style={{ marginBottom: 2 }} />
                    ) : null}
                    <Text style={[styles.rankText, { color: rankTextColor }]}>#{rank}</Text>
                </View>

                <View style={[
                    styles.avatarContainer,
                    {
                        borderColor: userRank.colorHex,
                        borderWidth: 2
                    }
                ]}>
                    <Image
                        source={{ uri: item.avatar_url || 'https://via.placeholder.com/150' }}
                        style={styles.avatar}
                    />
                </View>

                <View style={styles.userInfo}>
                    <Text style={[styles.username, { color: colors.text }]} numberOfLines={1}>
                        {item.username || 'User'}
                    </Text>
                    <Text style={[styles.userRank, { color: userRank.colorHex }]}>
                        {userRank.name} • Lvl {item.level || 1}
                    </Text>
                </View>

                <View style={styles.xpContainer}>
                    <Text style={[styles.xpText, { color: colors.subtext }]}>{item.xp || 0} XP</Text>
                </View>
            </View>
        );
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
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
                    <Ionicons name="chevron-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Top 20 Leaderboard</Text>
                <View style={{ width: 40 }} />
            </View>

            <FlatList
                data={users}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="podium-outline" size={64} color={colors.subtext} />
                        <Text style={[styles.emptyText, { color: colors.subtext }]}>No users found yet.</Text>
                    </View>
                }
            />
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
        paddingHorizontal: 20,
        paddingVertical: 10,
        marginBottom: 10,
    },
    headerTitle: {
        fontSize: 18,
        fontFamily: 'Poppins_700Bold',
    },
    iconButton: {
        padding: 8,
    },
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    userItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 1,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.05,
        shadowRadius: 3.84,
        elevation: 2,
    },
    rankContainer: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 8,
        marginRight: 12,
    },
    rankText: {
        fontFamily: 'Poppins_700Bold',
        fontSize: 14,
    },
    avatarContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        padding: 2,
        marginRight: 12,
    },
    avatar: {
        width: '100%',
        height: '100%',
        borderRadius: 24,
    },
    userInfo: {
        flex: 1,
    },
    username: {
        fontSize: 16,
        fontFamily: 'Poppins_600SemiBold',
        marginBottom: 2,
    },
    userRank: {
        fontSize: 12,
        fontFamily: 'Poppins_500Medium',
    },
    xpContainer: {
        marginLeft: 8,
    },
    xpText: {
        fontSize: 14,
        fontFamily: 'Poppins_500Medium',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 100
    },
    emptyText: {
        marginTop: 12,
        fontFamily: 'Poppins_500Medium',
        fontSize: 14
    }
});
