import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../lib/supabase';
import { useTheme } from '../context/ThemeContext';
import { getRank } from '../lib/levelSystem';
import { RankBadge } from '../components/Level/LevelComponents';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthProvider';
import { useDecorFor } from '../context/CosmeticsProvider';
import { DecoratedName } from '../components/Profile/ProfileDecorations';

const LIMIT = 50;
const PROFILE_FIELDS = 'id, username, avatar_url, level, xp, is_pro, pro_expires_at, cosmetics';
const MEDALS = ['#F5B400', '#9CA3AF', '#C2703D'] as const;

type LeaderboardUser = {
    id: string;
    username: string | null;
    avatar_url: string | null;
    level: number | null;
    xp: number | null;
    is_pro?: boolean | null;
    pro_expires_at?: string | null;
    cosmetics?: unknown;
};

type RankedUser = LeaderboardUser & { position: number };

/** Users with the same XP share a position (1, 1, 3 …). */
const withPositions = (users: LeaderboardUser[]): RankedUser[] => {
    let position = 0;
    return users.map((user, i) => {
        if (i === 0 || (user.xp || 0) !== (users[i - 1].xp || 0)) position = i + 1;
        return { ...user, position };
    });
};

const Avatar: React.FC<{ uri: string | null; size: number; borderColor: string; borderWidth?: number }> = ({
    uri, size, borderColor, borderWidth = 2,
}) => {
    const { colors } = useTheme();
    const [failed, setFailed] = useState(false);
    return (
        <View style={{ width: size, height: size, borderRadius: size / 2, borderWidth, borderColor, padding: 2 }}>
            {uri && !failed ? (
                <Image source={{ uri }} style={styles.avatarImage} onError={() => setFailed(true)} />
            ) : (
                <View style={[styles.avatarImage, styles.avatarFallback, { backgroundColor: colors.border }]}>
                    <Ionicons name="person" size={size * 0.45} color={colors.subtext} />
                </View>
            )}
        </View>
    );
};

export default function LeaderboardScreen() {
    const router = useRouter();
    const { colors } = useTheme();
    const { t } = useLanguage();
    const { user } = useAuth();
    const decorFor = useDecorFor();
    const [users, setUsers] = useState<RankedUser[]>([]);
    const [me, setMe] = useState<RankedUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [failed, setFailed] = useState(false);

    const fetchLeaderboard = useCallback(async () => {
        setFailed(false);
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select(PROFILE_FIELDS)
                .gt('xp', 0)
                .order('xp', { ascending: false })
                .order('id', { ascending: true })
                .limit(LIMIT);
            if (error) throw error;
            const ranked = withPositions(data ?? []);
            setUsers(ranked);

            // The signed-in user's own position when they are outside the list
            if (user && !ranked.some(u => u.id === user.id)) {
                const { data: own } = await supabase.from('profiles').select(PROFILE_FIELDS).eq('id', user.id).maybeSingle();
                if (own && (own.xp || 0) > 0) {
                    const { count } = await supabase
                        .from('profiles')
                        .select('id', { count: 'exact', head: true })
                        .gt('xp', own.xp || 0);
                    setMe({ ...own, position: (count ?? 0) + 1 });
                } else {
                    setMe(own ? { ...own, position: 0 } : null);
                }
            } else {
                setMe(null);
            }
        } catch {
            setFailed(true);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user]);

    useEffect(() => {
        fetchLeaderboard();
    }, [fetchLeaderboard]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchLeaderboard();
    };

    const openProfile = (id: string) => {
        if (id === user?.id) router.push('/(tabs)/profile');
        else router.push(`/users/${id}`);
    };

    // Podium only when there is a full top 3
    const podium = users.length >= 3 ? users.slice(0, 3) : [];
    const rest = useMemo(() => (podium.length ? users.slice(3) : users), [users, podium.length]);

    const renderPodiumSpot = (item: RankedUser, place: 0 | 1 | 2) => {
        const isFirst = place === 0;
        const medal = MEDALS[Math.min(item.position, 3) - 1];
        const isMe = item.id === user?.id;
        return (
            <TouchableOpacity
                key={item.id}
                style={styles.podiumSpot}
                onPress={() => openProfile(item.id)}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={`#${item.position} ${item.username || ''}, ${item.xp || 0} XP`}
            >
                {isFirst && <Ionicons name="trophy" size={22} color={medal} style={{ marginBottom: 4 }} />}
                <View>
                    <Avatar uri={item.avatar_url} size={isFirst ? 84 : 64} borderColor={medal} borderWidth={3} />
                    <View style={[styles.podiumNumber, { backgroundColor: medal, borderColor: colors.background }]}>
                        <Text style={styles.podiumNumberText}>{item.position}</Text>
                    </View>
                </View>
                <DecoratedName
                    name={item.username || 'User'}
                    decor={decorFor(item)}
                    defaultColor={isMe ? '#FACC15' : colors.text}
                    style={styles.podiumName}
                    numberOfLines={1}
                />
                <RankBadge level={item.level || 1} size="sm" />
                <LinearGradient
                    colors={[`${medal}55`, `${medal}10`]}
                    style={[styles.podiumBase, { height: isFirst ? 64 : place === 1 ? 44 : 32 }]}
                >
                    <Text style={[styles.podiumXp, { color: colors.text }]}>{item.xp || 0} XP</Text>
                </LinearGradient>
            </TouchableOpacity>
        );
    };

    const renderRow = (item: RankedUser, pinned = false) => {
        const isMe = item.id === user?.id;
        const medal = item.position <= 3 ? MEDALS[item.position - 1] : null;
        return (
            <TouchableOpacity
                style={[
                    styles.userItem,
                    { backgroundColor: colors.card, borderColor: isMe ? '#FACC15' : colors.border },
                    pinned && styles.pinnedItem,
                ]}
                onPress={() => openProfile(item.id)}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={`#${item.position || '-'} ${item.username || ''}, ${item.xp || 0} XP`}
            >
                <View style={styles.positionContainer}>
                    {medal && <Ionicons name="medal" size={14} color={medal} />}
                    <Text style={[styles.positionText, { color: medal ?? colors.subtext }]} numberOfLines={1} adjustsFontSizeToFit>
                        {item.position ? `#${item.position}` : '–'}
                    </Text>
                </View>

                <Avatar uri={item.avatar_url} size={48} borderColor={getRank(item.level || 1).colorHex} />

                <View style={styles.userInfo}>
                    <View style={styles.nameRow}>
                        <View style={{ flexShrink: 1 }}>
                            <DecoratedName
                                name={item.username || 'User'}
                                decor={decorFor(item)}
                                defaultColor={colors.text}
                                style={styles.username}
                                numberOfLines={1}
                            />
                        </View>
                        {isMe && (
                            <View style={styles.youTag}>
                                <Text style={styles.youTagText}>{t('leaderboard.you')}</Text>
                            </View>
                        )}
                    </View>
                    <View style={styles.userRank}>
                        <RankBadge level={item.level || 1} size="sm" showLevel />
                    </View>
                </View>

                <Text style={[styles.xpText, { color: colors.text }]}>
                    {item.xp || 0}
                    <Text style={{ color: colors.subtext, fontSize: 11 }}> XP</Text>
                </Text>
            </TouchableOpacity>
        );
    };

    const header = (
        <View style={styles.header}>
            <TouchableOpacity
                onPress={() => router.back()}
                style={styles.iconButton}
                accessibilityRole="button"
                accessibilityLabel={t('common.back')}
            >
                <Ionicons name="chevron-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <View style={{ alignItems: 'center' }}>
                <Text style={[styles.headerTitle, { color: colors.text }]}>{t('leaderboard.title')}</Text>
                <Text style={[styles.headerSubtitle, { color: colors.subtext }]}>{t('leaderboard.subtitle', { count: LIMIT })}</Text>
            </View>
            <View style={{ width: 40 }} />
        </View>
    );

    let body: React.ReactNode;
    if (loading) {
        body = (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#FACC15" />
            </View>
        );
    } else if (failed && users.length === 0) {
        body = (
            <View style={styles.centered}>
                <Ionicons name="cloud-offline-outline" size={56} color={colors.subtext} />
                <Text style={[styles.emptyText, { color: colors.subtext }]}>{t('leaderboard.error')}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={() => { setLoading(true); fetchLeaderboard(); }}>
                    <Text style={styles.retryText}>{t('leaderboard.retry')}</Text>
                </TouchableOpacity>
            </View>
        );
    } else {
        body = (
            <FlatList
                data={rest}
                renderItem={({ item }) => renderRow(item)}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FACC15" colors={['#FACC15']} />}
                ListHeaderComponent={
                    podium.length ? (
                        <View style={styles.podium}>
                            {renderPodiumSpot(podium[1], 1)}
                            {renderPodiumSpot(podium[0], 0)}
                            {renderPodiumSpot(podium[2], 2)}
                        </View>
                    ) : null
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="podium-outline" size={64} color={colors.subtext} />
                        <Text style={[styles.emptyText, { color: colors.subtext }]}>{t('leaderboard.noUsers')}</Text>
                    </View>
                }
            />
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
            {header}
            {body}
            {!loading && me && (
                <View style={[styles.mePanel, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
                    {me.position > 0 ? (
                        <>
                            <Text style={[styles.mePanelLabel, { color: colors.subtext }]}>{t('leaderboard.yourPosition')}</Text>
                            {renderRow(me, true)}
                        </>
                    ) : (
                        <Text style={[styles.mePanelLabel, { color: colors.subtext, textAlign: 'center' }]}>
                            {t('leaderboard.notRanked')}
                        </Text>
                    )}
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontFamily: 'Poppins_700Bold',
    },
    headerSubtitle: {
        fontSize: 12,
        fontFamily: 'Poppins_500Medium',
    },
    iconButton: {
        padding: 8,
        width: 40,
    },
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 24,
        flexGrow: 1,
    },
    podium: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'center',
        marginTop: 8,
        marginBottom: 20,
        gap: 8,
    },
    podiumSpot: {
        flex: 1,
        alignItems: 'center',
        gap: 6,
    },
    podiumNumber: {
        position: 'absolute',
        bottom: -6,
        alignSelf: 'center',
        minWidth: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    podiumNumberText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontFamily: 'Poppins_700Bold',
    },
    podiumName: {
        fontSize: 13,
        fontFamily: 'Poppins_600SemiBold',
        marginTop: 6,
        maxWidth: 100,
    },
    podiumBase: {
        alignSelf: 'stretch',
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    podiumXp: {
        fontSize: 13,
        fontFamily: 'Poppins_700Bold',
    },
    userItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 14,
        marginBottom: 10,
        borderWidth: 1,
        gap: 12,
    },
    pinnedItem: {
        marginBottom: 0,
    },
    positionContainer: {
        width: 36,
        alignItems: 'center',
    },
    positionText: {
        fontFamily: 'Poppins_700Bold',
        fontSize: 14,
    },
    avatarImage: {
        width: '100%',
        height: '100%',
        borderRadius: 999,
    },
    avatarFallback: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    userInfo: {
        flex: 1,
        minWidth: 0,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    username: {
        fontSize: 15,
        fontFamily: 'Poppins_600SemiBold',
    },
    youTag: {
        backgroundColor: '#FACC15',
        borderRadius: 6,
        paddingHorizontal: 6,
        paddingVertical: 1,
    },
    youTagText: {
        color: '#000000',
        fontSize: 10,
        fontFamily: 'Poppins_700Bold',
    },
    userRank: {
        alignItems: 'flex-start',
        marginTop: 4,
    },
    xpText: {
        fontSize: 15,
        fontFamily: 'Poppins_700Bold',
    },
    mePanel: {
        borderTopWidth: StyleSheet.hairlineWidth,
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 8,
    },
    mePanelLabel: {
        fontSize: 12,
        fontFamily: 'Poppins_600SemiBold',
        marginBottom: 6,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 100,
    },
    emptyText: {
        marginTop: 12,
        fontFamily: 'Poppins_500Medium',
        fontSize: 14,
        textAlign: 'center',
    },
    retryButton: {
        marginTop: 16,
        backgroundColor: '#FACC15',
        borderRadius: 12,
        paddingHorizontal: 24,
        paddingVertical: 10,
    },
    retryText: {
        color: '#000000',
        fontFamily: 'Poppins_700Bold',
        fontSize: 14,
    },
});
