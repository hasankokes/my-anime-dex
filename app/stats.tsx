import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { upperCase } from '../lib/textCase';
import { useAuth } from '../context/AuthProvider';
import { useFeature } from '../hooks/usePremium';
import { supabase } from '../lib/supabase';
import { backfillListMetadata } from '../lib/animeMetadata';
import { analytics } from '../lib/analytics';
import {
    DEFAULT_STATS_CARD,
    loadUserStats,
    parseStatsCard,
    STATS_CARD_ITEMS,
    StatsCardItem,
    StatsCardSettings,
    UserStats,
} from '../services/statsService';
import { PremiumGate } from '../components/Premium/PremiumGate';
import { ShareBars } from '../components/Stats/ShareBars';
import { ProfileStatsCard } from '../components/Stats/ProfileStatsCard';
import { genreLabel } from '../components/Discover/discoverText';

import { ThemedSwitch } from '../components/ThemedSwitch';
const CARD_ITEM_LABEL: Record<StatsCardItem, string> = {
    completed: 'stats.completed',
    watching: 'stats.watching',
    top_genre: 'stats.topGenre',
    favorite_studio: 'stats.favoriteStudio',
    avg_rating: 'stats.avgRating',
};

export default function StatsScreen() {
    const router = useRouter();
    const { colors } = useTheme();
    const { t, language } = useLanguage();
    const { user } = useAuth();
    const { enabled, locked } = useFeature('premium_stats');

    const [stats, setStats] = useState<UserStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [backfilling, setBackfilling] = useState(false);
    const [error, setError] = useState(false);
    const [card, setCard] = useState<StatsCardSettings>(DEFAULT_STATS_CARD);

    const load = useCallback(async () => {
        if (!user) {
            setLoading(false);
            setError(true);
            return;
        }
        setError(false);
        try {
            const [nextStats, profile] = await Promise.all([
                loadUserStats(user.id),
                supabase.from('profiles').select('stats_card').eq('id', user.id).single(),
            ]);
            setStats(nextStats);
            setCard(parseStatsCard(profile.data?.stats_card));
            return nextStats;
        } catch (e) {
            console.error('Stats load failed:', e);
            setError(true);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        analytics.track('stats_viewed', { locked });
        load().then(loaded => {
            // Older list entries don't have genre/studio data yet: fetch it once, then recompute
            if (user && loaded && loaded.missingMetadata > 0) {
                setBackfilling(true);
                backfillListMetadata(user.id)
                    .then(count => (count > 0 ? load() : undefined))
                    .catch(e => console.warn('Metadata backfill failed:', e))
                    .finally(() => setBackfilling(false));
            }
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id]);

    const onRefresh = async () => {
        setRefreshing(true);
        await load();
        setRefreshing(false);
    };

    const saveCard = async (next: StatsCardSettings) => {
        if (!user) return;
        const previous = card;
        setCard(next);
        const { error: saveError } = await supabase.from('profiles').update({ stats_card: next }).eq('id', user.id);
        if (saveError) {
            console.error('Stats card save failed:', saveError);
            setCard(previous);
            return;
        }
        analytics.track('stats_card_updated', { enabled: next.enabled, items: next.items });
    };

    const toggleCardItem = (item: StatsCardItem) => {
        const items = card.items.includes(item) ? card.items.filter(i => i !== item) : [...card.items, item];
        saveCard({ ...card, items });
    };

    const renderSummaryTile = (label: string, value: number, icon: keyof typeof Ionicons.glyphMap) => (
        <View key={label} style={[styles.tile, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name={icon} size={18} color={colors.primary} />
            <Text style={[styles.tileValue, { color: colors.text }]}>{value.toLocaleString()}</Text>
            <Text style={[styles.tileLabel, { color: colors.subtext }]} numberOfLines={1}>{label}</Text>
        </View>
    );

    const renderRatingComparison = (s: UserStats) => {
        const { average, communityAverage, count, comparedCount } = s.rating;
        if (average == null) {
            return <Text style={[styles.muted, { color: colors.subtext }]}>{t('stats.noRatings')}</Text>;
        }
        const diff = communityAverage != null ? average - communityAverage : null;
        const verdict = diff == null || Math.abs(diff) < 0.15
            ? t('stats.ratingSimilar')
            : diff > 0 ? t('stats.ratingGenerous') : t('stats.ratingStrict');
        return (
            <>
                <View style={styles.compareRow}>
                    <View style={styles.compareCol}>
                        <Text style={[styles.compareValue, { color: colors.text }]}>★ {average.toFixed(2)}</Text>
                        <Text style={[styles.tileLabel, { color: colors.subtext }]}>{t('stats.yourAverage', { count })}</Text>
                    </View>
                    <View style={[styles.compareDivider, { backgroundColor: colors.border }]} />
                    <View style={styles.compareCol}>
                        <Text style={[styles.compareValue, { color: colors.text }]}>
                            {communityAverage != null ? `★ ${communityAverage.toFixed(2)}` : '—'}
                        </Text>
                        <Text style={[styles.tileLabel, { color: colors.subtext }]}>{t('stats.communityAverage')}</Text>
                    </View>
                </View>
                {comparedCount > 0 && (
                    <Text style={[styles.muted, { color: colors.subtext }]}>{verdict}</Text>
                )}
            </>
        );
    };

    const renderPremiumSections = (s: UserStats) => (
        <PremiumGate feature="premium_stats" source="stats" description={t('stats.lockedDescription')}>
            <View style={styles.premiumSections}>
                {backfilling && (
                    <View style={styles.preparing}>
                        <ActivityIndicator size="small" color={colors.primary} />
                        <Text style={[styles.muted, { color: colors.subtext }]}>{t('stats.preparing')}</Text>
                    </View>
                )}

                <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.sectionTitle, { color: colors.subtext }]}>{upperCase(t('stats.favoriteStudio'), language)}</Text>
                    {s.favoriteStudio ? (
                        <>
                            <Text style={[styles.highlight, { color: colors.text }]}>{s.favoriteStudio.name}</Text>
                            <Text style={[styles.muted, { color: colors.subtext }]}>
                                {s.favoriteStudio.avgRating != null
                                    ? t('stats.studioDetailRated', { count: s.favoriteStudio.count, rating: s.favoriteStudio.avgRating.toFixed(1) })
                                    : t('stats.studioDetail', { count: s.favoriteStudio.count })}
                            </Text>
                        </>
                    ) : (
                        <Text style={[styles.muted, { color: colors.subtext }]}>{t('stats.noData')}</Text>
                    )}
                </View>

                <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.sectionTitle, { color: colors.subtext }]}>{upperCase(t('stats.ratingTitle'), language)}</Text>
                    {renderRatingComparison(s)}
                </View>

                <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.sectionTitle, { color: colors.subtext }]}>{upperCase(t('stats.genresTitle'), language)}</Text>
                    {s.genres.length
                        ? <ShareBars items={s.genres} translateName={name => genreLabel(t, name)} />
                        : <Text style={[styles.muted, { color: colors.subtext }]}>{t('stats.noData')}</Text>}
                </View>

                <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.sectionTitle, { color: colors.subtext }]}>{upperCase(t('stats.studiosTitle'), language)}</Text>
                    {s.studios.length
                        ? <ShareBars items={s.studios} />
                        : <Text style={[styles.muted, { color: colors.subtext }]}>{t('stats.noData')}</Text>}
                </View>

                {/* Profile card settings: off by default, the user picks what (if anything) is shown */}
                <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.switchRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.settingTitle, { color: colors.text }]}>{t('stats.showOnProfile')}</Text>
                            <Text style={[styles.muted, { color: colors.subtext }]}>{t('stats.showOnProfileHint')}</Text>
                        </View>
                        <ThemedSwitch
                            value={card.enabled}
                            onValueChange={value => saveCard({
                                enabled: value,
                                // Turning it on for the first time starts with a sensible selection
                                items: value && !card.items.length ? ['completed', 'top_genre', 'favorite_studio'] : card.items,
                            })}
                        />
                    </View>
                    {card.enabled && (
                        <>
                            <View style={styles.chips}>
                                {STATS_CARD_ITEMS.map(item => {
                                    const active = card.items.includes(item);
                                    return (
                                        <TouchableOpacity
                                            key={item}
                                            onPress={() => toggleCardItem(item)}
                                            style={[
                                                styles.chip,
                                                { borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.primary : 'transparent' },
                                            ]}
                                            accessibilityRole="checkbox"
                                            accessibilityState={{ checked: active }}
                                        >
                                            <Text style={[styles.chipText, { color: active ? '#111827' : colors.text }]}>
                                                {t(CARD_ITEM_LABEL[item])}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                            <Text style={[styles.sectionTitle, { color: colors.subtext, marginTop: 16 }]}>{upperCase(t('stats.preview'), language)}</Text>
                        </>
                    )}
                </View>
                {card.enabled && <ProfileStatsCard stats={s} items={card.items} style={styles.cardPreview} />}
            </View>
        </PremiumGate>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton} accessibilityLabel={t('common.back')}>
                    <Ionicons name="chevron-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>{t('stats.title')}</Text>
                <View style={{ width: 36 }} />
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : error || !stats ? (
                <View style={styles.center}>
                    <Text style={[styles.muted, { color: colors.subtext }]}>{t('stats.loadError')}</Text>
                    <TouchableOpacity onPress={() => { setLoading(true); load(); }} style={[styles.retry, { backgroundColor: colors.primary }]}>
                        <Text style={styles.retryText}>{t('calendar.tryAgain')}</Text>
                    </TouchableOpacity>
                </View>
            ) : stats.total === 0 ? (
                <View style={styles.center}>
                    <Ionicons name="stats-chart-outline" size={64} color={colors.border} />
                    <Text style={[styles.muted, { color: colors.subtext, textAlign: 'center' }]}>{t('stats.empty')}</Text>
                </View>
            ) : (
                <ScrollView
                    contentContainerStyle={styles.content}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
                >
                    {/* Free summary */}
                    <View style={styles.tiles}>
                        {renderSummaryTile(t('stats.completed'), stats.completed, 'checkmark-done')}
                        {renderSummaryTile(t('stats.watching'), stats.watching, 'play')}
                        {renderSummaryTile(t('stats.planToWatch'), stats.planToWatch, 'bookmark')}
                        {renderSummaryTile(t('stats.favorites'), stats.favorites, 'heart')}
                        {renderSummaryTile(t('stats.paused'), stats.paused, 'pause')}
                        {renderSummaryTile(t('stats.dropped'), stats.dropped, 'close-circle')}
                    </View>

                    {enabled && renderPremiumSections(stats)}
                </ScrollView>
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
        width: 36,
    },
    headerTitle: {
        fontSize: 18,
        fontFamily: 'Poppins_700Bold',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 16,
        paddingHorizontal: 32,
    },
    content: {
        padding: 20,
        paddingBottom: 48,
        gap: 16,
    },
    tiles: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        rowGap: 12,
    },
    tile: {
        width: '31.5%',
        borderRadius: 16,
        borderWidth: 1,
        paddingVertical: 14,
        paddingHorizontal: 10,
        alignItems: 'center',
        gap: 4,
    },
    tileValue: {
        fontFamily: 'Poppins_700Bold',
        fontSize: 20,
    },
    tileLabel: {
        fontFamily: 'Poppins_500Medium',
        fontSize: 11,
        textAlign: 'center',
    },
    cardPreview: {
        marginHorizontal: 0,
        marginBottom: 0,
    },
    premiumSections: {
        gap: 16,
    },
    preparing: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    section: {
        borderRadius: 16,
        borderWidth: 1,
        padding: 16,
    },
    sectionTitle: {
        fontFamily: 'Poppins_700Bold',
        fontSize: 12,
        letterSpacing: 1,
        marginBottom: 12,
    },
    highlight: {
        fontFamily: 'Poppins_700Bold',
        fontSize: 22,
    },
    muted: {
        fontFamily: 'Poppins_500Medium',
        fontSize: 13,
        lineHeight: 19,
    },
    compareRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    compareCol: {
        flex: 1,
        alignItems: 'center',
        gap: 2,
    },
    compareValue: {
        fontFamily: 'Poppins_700Bold',
        fontSize: 22,
    },
    compareDivider: {
        width: 1,
        height: 36,
    },
    switchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    settingTitle: {
        fontFamily: 'Poppins_600SemiBold',
        fontSize: 15,
        marginBottom: 2,
    },
    chips: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 16,
    },
    chip: {
        borderWidth: 1,
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    chipText: {
        fontFamily: 'Poppins_600SemiBold',
        fontSize: 12,
    },
    retry: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 12,
    },
    retryText: {
        fontFamily: 'Poppins_700Bold',
        color: '#111827',
    },
});
