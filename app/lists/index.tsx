import React, { useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { List } from '../../types/lists';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { useWalkthroughTargets, useWalkthroughAutoStart } from '../../context/WalkthroughContext';

// Lists come back with their item count and the first few covers for the mosaic
type ListWithCovers = List & {
    list_items?: { count: number }[];
    covers?: { anime_image: string | null; position: number }[];
};

const LIST_SELECT = '*, list_items(count), covers:list_items(anime_image, position)';
const COVER_LIMIT = 4;

export default function MyListsScreen() {
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const { t } = useLanguage();
    const [lists, setLists] = useState<ListWithCovers[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'my' | 'shared'>('my');
    const [sharedLists, setSharedLists] = useState<ListWithCovers[]>([]);
    const [refreshing, setRefreshing] = useState(false);

    // Walkthrough refs
    const addListButtonRef = useRef<View>(null);
    const tabFilterRef = useRef<View>(null);

    useWalkthroughTargets('lists', { addListButton: addListButtonRef, tabFilter: tabFilterRef });
    useWalkthroughAutoStart('lists', !loading);

    const fetchLists = async () => {
        try {
            setLoading(true);
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                setLists([]);
                setSharedLists([]);
                return;
            }

            // Fetch My Lists
            const { data: myData, error: myError } = await supabase
                .from('lists')
                .select(LIST_SELECT)
                .eq('user_id', session.user.id)
                .order('created_at', { ascending: false })
                .order('position', { referencedTable: 'covers', ascending: true })
                .limit(COVER_LIMIT, { referencedTable: 'covers' });

            if (myError) throw myError;
            setLists((myData as ListWithCovers[]) || []);

            // Fetch Shared Lists
            const { data: sharedData, error: sharedError } = await supabase
                .from('list_collaborators')
                .select(`list:lists(${LIST_SELECT})`)
                .eq('user_id', session.user.id)
                .order('position', { referencedTable: 'list.covers', ascending: true })
                .limit(COVER_LIMIT, { referencedTable: 'list.covers' });

            if (sharedError) throw sharedError;

            // Extract lists from the response
            const formattedSharedLists = sharedData
                .map((item: any) => item.list)
                .filter((list: any) => list !== null)
                .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

            setSharedLists(formattedSharedLists);

        } catch (error) {
            console.error('Error fetching lists:', error);
            Alert.alert('Error', 'Failed to load your lists.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchLists();
        }, [])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchLists();
    };

    const leaveSharedList = (listId: string, listTitle: string) => {
        if (Platform.OS === 'web') {
            if (window.confirm(t('collaborators.confirmLeave'))) {
                performLeave(listId);
            }
        } else {
            Alert.alert(
                t('collaborators.leaveList'),
                t('collaborators.confirmLeave'),
                [
                    { text: t('common.cancel'), style: 'cancel' },
                    {
                        text: t('collaborators.leaveList'),
                        style: 'destructive',
                        onPress: () => performLeave(listId)
                    }
                ]
            );
        }
    };

    const performLeave = async (listId: string) => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const { error } = await supabase
                .from('list_collaborators')
                .delete()
                .eq('list_id', listId)
                .eq('user_id', session.user.id);

            if (error) throw error;

            setSharedLists(prev => prev.filter(l => l.id !== listId));
        } catch (error) {
            console.error('Error leaving list:', error);
            Alert.alert(t('common.error'), t('collaborators.failedToRemove'));
        }
    };

    const renderItem = ({ item }: { item: ListWithCovers }) => {
        const covers = (item.covers || []).map(c => c.anime_image).filter((u): u is string => !!u);
        const count = item.list_items?.[0]?.count ?? 0;
        const isShared = activeTab === 'shared';

        return (
            <TouchableOpacity
                activeOpacity={0.85}
                style={[styles.listCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => router.push(`/lists/${item.id}`)}
            >
                {/* Cover mosaic */}
                <View style={styles.banner}>
                    {covers.length > 0 ? (
                        <View style={styles.mosaic}>
                            {covers.map((uri, i) => (
                                <Image
                                    key={`${uri}-${i}`}
                                    source={{ uri }}
                                    style={[styles.mosaicImage, i > 0 && styles.mosaicDivider]}
                                    contentFit="cover"
                                    transition={200}
                                />
                            ))}
                        </View>
                    ) : (
                        <LinearGradient
                            colors={isDark ? ['#FACC15', '#F97316', '#7C2D12'] : ['#FDE68A', '#FACC15', '#F97316']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.emptyBanner}
                        >
                            <Ionicons name="sparkles" size={64} color="rgba(0,0,0,0.12)" style={styles.emptyBannerIcon} />
                            <Text style={styles.emptyBannerText}>{t('lists.emptyList')}</Text>
                        </LinearGradient>
                    )}

                    <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.85)']}
                        style={styles.bannerShade}
                        pointerEvents="none"
                    />

                    {/* Badges */}
                    <View style={styles.badgeRow}>
                        <View style={styles.badge}>
                            <Ionicons name={item.is_public ? 'globe-outline' : 'lock-closed'} size={11} color="#FFF" />
                            <Text style={styles.badgeText}>{item.is_public ? t('lists.public') : t('lists.private')}</Text>
                        </View>
                        {isShared && (
                            <View style={[styles.badge, styles.badgeAccent]}>
                                <Ionicons name="people" size={11} color="#000" />
                            </View>
                        )}
                    </View>

                    {/* Title over the covers */}
                    <View style={styles.bannerFooter}>
                        <Text style={styles.listTitle} numberOfLines={1}>{item.title}</Text>
                        <View style={styles.countPill}>
                            <Ionicons name="film" size={12} color="#000" />
                            <Text style={styles.countText}>{count}</Text>
                        </View>
                    </View>
                </View>

                {/* Details */}
                <View style={styles.cardBody}>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.listDescription, { color: item.description ? colors.text : colors.subtext }]} numberOfLines={1}>
                            {item.description || t('lists.noDescription')}
                        </Text>
                        <Text style={[styles.metaText, { color: colors.subtext }]}>
                            {count} {t('lists.items')} • {new Date(item.created_at).toLocaleDateString()}
                        </Text>
                    </View>
                    {isShared ? (
                        <TouchableOpacity
                            style={styles.leaveButton}
                            onPress={(e) => {
                                e.stopPropagation();
                                leaveSharedList(item.id, item.title);
                            }}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                            <Ionicons name="exit-outline" size={18} color="#EF4444" />
                        </TouchableOpacity>
                    ) : (
                        <View style={[styles.goButton, { backgroundColor: isDark ? 'rgba(250, 204, 21, 0.12)' : 'rgba(250, 204, 21, 0.2)' }]}>
                            <Ionicons name="arrow-forward" size={16} color={isDark ? '#FACC15' : '#A16207'} />
                        </View>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>{t('profile.myLists')}</Text>
                <TouchableOpacity
                    ref={addListButtonRef as any}
                    style={[styles.addButton, { backgroundColor: '#FACC15' }]}
                    onPress={() => router.push('/lists/create')}
                    {...({ collapsable: false } as any)}
                >
                    <Ionicons name="add" size={24} color="#000" />
                </TouchableOpacity>
            </View>

            {/* Tabs / Filters */}
            <View ref={tabFilterRef as any} collapsable={false} style={styles.tabContainer}>
                <TouchableOpacity
                    style={[
                        styles.filterPill,
                        {
                            backgroundColor: activeTab === 'my' ? '#FACC15' : colors.card,
                            borderColor: activeTab === 'my' ? '#FACC15' : colors.border
                        }
                    ]}
                    onPress={() => setActiveTab('my')}
                >
                    <Text style={[
                        styles.tabText,
                        { color: activeTab === 'my' ? '#000000' : colors.subtext, fontWeight: activeTab === 'my' ? '700' : '500' }
                    ]}>
                        {t('profile.myLists')}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[
                        styles.filterPill,
                        {
                            backgroundColor: activeTab === 'shared' ? '#FACC15' : colors.card,
                            borderColor: activeTab === 'shared' ? '#FACC15' : colors.border
                        }
                    ]}
                    onPress={() => setActiveTab('shared')}
                >
                    <Text style={[
                        styles.tabText,
                        { color: activeTab === 'shared' ? '#000000' : colors.subtext, fontWeight: activeTab === 'shared' ? '700' : '500' }
                    ]}>
                        {t('collaborators.sharedWithMe')}
                    </Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#FACC15" />
                </View>
            ) : (activeTab === 'my' ? lists : sharedLists).length > 0 ? (
                <FlatList
                    data={activeTab === 'my' ? lists : sharedLists}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                />
            ) : (
                <View style={styles.emptyContainer}>
                    <LinearGradient
                        colors={['#FACC15', '#F97316']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.emptyIconContainer}
                    >
                        <Ionicons name={activeTab === 'my' ? 'albums' : 'people'} size={40} color="#000" />
                    </LinearGradient>
                    <Text style={[styles.emptyTitle, { color: colors.text }]}>
                        {activeTab === 'my' ? t('lists.emptyTitle') : t('collaborators.noSharedLists')}
                    </Text>
                    <Text style={[styles.emptyText, { color: colors.subtext }]}>
                        {activeTab === 'my'
                            ? t('lists.emptyDesc')
                            : t('collaborators.sharedListsDesc')}
                    </Text>
                    {activeTab === 'my' && (
                        <TouchableOpacity
                            style={[styles.createButton, { backgroundColor: '#FACC15' }]}
                            onPress={() => router.push('/lists/create')}
                        >
                            <Ionicons name="add" size={20} color="#000" />
                            <Text style={styles.createButtonText}>{t('lists.createNew')}</Text>
                        </TouchableOpacity>
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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderBottomWidth: 1,
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontFamily: 'Poppins_700Bold',
    },
    addButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContainer: {
        padding: 20,
    },
    listCard: {
        borderRadius: 20,
        marginBottom: 16,
        borderWidth: 1,
        overflow: 'hidden',
    },
    banner: {
        height: 130,
        position: 'relative',
    },
    mosaic: {
        flex: 1,
        flexDirection: 'row',
    },
    mosaicImage: {
        flex: 1,
        height: '100%',
    },
    mosaicDivider: {
        borderLeftWidth: 2,
        borderLeftColor: '#000',
    },
    emptyBanner: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyBannerIcon: {
        position: 'absolute',
        right: 16,
        top: 8,
        transform: [{ rotate: '-12deg' }],
    },
    emptyBannerText: {
        fontSize: 12,
        fontFamily: 'Poppins_600SemiBold',
        color: 'rgba(0,0,0,0.45)',
        textTransform: 'uppercase',
        letterSpacing: 1.5,
        marginBottom: 24,
    },
    bannerShade: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: 80,
    },
    badgeRow: {
        position: 'absolute',
        top: 10,
        right: 10,
        flexDirection: 'row',
        gap: 6,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 10,
        backgroundColor: 'rgba(0,0,0,0.55)',
    },
    badgeAccent: {
        backgroundColor: '#FACC15',
    },
    badgeText: {
        fontSize: 11,
        fontFamily: 'Poppins_600SemiBold',
        color: '#FFF',
    },
    bannerFooter: {
        position: 'absolute',
        left: 14,
        right: 14,
        bottom: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    listTitle: {
        flex: 1,
        fontSize: 18,
        fontFamily: 'Poppins_700Bold',
        color: '#FFF',
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
    countPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        backgroundColor: '#FACC15',
    },
    countText: {
        fontSize: 12,
        fontFamily: 'Poppins_700Bold',
        color: '#000',
    },
    cardBody: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 12,
        gap: 12,
    },
    listDescription: {
        fontSize: 13,
        fontFamily: 'Poppins_500Medium',
        marginBottom: 2,
    },
    metaText: {
        fontSize: 12,
        fontFamily: 'Poppins_400Regular',
    },
    goButton: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 40,
    },
    emptyIconContainer: {
        width: 88,
        height: 88,
        borderRadius: 28,
        transform: [{ rotate: '-6deg' }],
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    emptyTitle: {
        fontSize: 20,
        fontFamily: 'Poppins_700Bold',
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 14,
        fontFamily: 'Poppins_400Regular',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 20,
    },
    createButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
    },
    createButtonText: {
        fontSize: 16,
        fontFamily: 'Poppins_600SemiBold',
        color: '#000',
    },
    tabContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        marginBottom: 10,
        marginTop: 20,
    },
    filterPill: {
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 20,
        marginRight: 10,
        borderWidth: 1,
    },
    tabText: {
        fontSize: 14,
        fontFamily: 'Poppins_500Medium',
    },
    leaveButton: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
    },
});
