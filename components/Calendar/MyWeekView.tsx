import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, SectionList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { format } from 'date-fns';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { supabase } from '../../lib/supabase';
import { getUpcomingEpisodes, NextEpisode } from '../../services/anilistApi';
import { getDateFnsLocale, getUtcOffsetString, toLocalDateKey } from '../../lib/dateUtils';
import { useAddToCalendar } from '../../hooks/useAddToCalendar';

const WEEKDAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const WINDOW_SECONDS = 7 * 24 * 60 * 60;

/**
 * Premium weekly schedule of the user's own anime (favorites, watching, plan to watch):
 * the next 7 days grouped by local day, in the device time zone.
 * Uses one batched AniList request per 50 list entries (cached 15 min), not the daily schedule.
 */
export const MyWeekView: React.FC<{ userId: string; bottomInset: number }> = ({ userId, bottomInset }) => {
    const { colors } = useTheme();
    const { t, language } = useLanguage();
    const router = useRouter();
    const calendar = useAddToCalendar('my_week');
    const [episodes, setEpisodes] = useState<NextEpisode[] | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(false);

    const load = useCallback(async () => {
        setError(false);
        try {
            const { data, error: listError } = await supabase
                .from('user_anime_list')
                .select('anime_id')
                .eq('user_id', userId)
                .or('is_favorite.eq.true,status.in.(watching,plan_to_watch)');
            if (listError) throw listError;
            const ids = [...new Set((data ?? []).map(r => Number(r.anime_id)).filter(Boolean))];
            setEpisodes(ids.length ? await getUpcomingEpisodes(ids, 3) : []);
        } catch (e) {
            console.warn('My week failed to load:', e);
            setError(true);
        }
    }, [userId]);

    useEffect(() => {
        load();
    }, [load]);

    const sections = useMemo(() => {
        const now = Math.floor(Date.now() / 1000);
        const byDay = new Map<string, NextEpisode[]>();
        for (const ep of (episodes ?? [])
            .filter(e => e.airingAt > now - 60 * 60 && e.airingAt < now + WINDOW_SECONDS)
            .sort((a, b) => a.airingAt - b.airingAt)) {
            const key = toLocalDateKey(new Date(ep.airingAt * 1000));
            byDay.set(key, [...(byDay.get(key) ?? []), ep]);
        }
        const todayKey = toLocalDateKey(new Date());
        const tomorrowKey = toLocalDateKey(new Date(Date.now() + 24 * 60 * 60 * 1000));
        return [...byDay.entries()].map(([key, data]) => {
            const date = new Date(data[0].airingAt * 1000);
            const name = key === todayKey ? t('calendar.today')
                : key === tomorrowKey ? t('calendar.tomorrow')
                    : t(`calendar.days.${WEEKDAY_KEYS[date.getDay()]}`);
            return { key, title: `${name} · ${format(date, 'd MMM', { locale: getDateFnsLocale(language) })}`, data };
        });
    }, [episodes, t, language]);

    const onRefresh = async () => {
        setRefreshing(true);
        await load();
        setRefreshing(false);
    };

    if (episodes === null && !error) {
        return <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 80 }} />;
    }

    return (
        <SectionList
            sections={sections}
            keyExtractor={item => `${item.animeId}-${item.episode}`}
            stickySectionHeadersEnabled={false}
            contentContainerStyle={[styles.content, { paddingBottom: bottomInset + 80 }]}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
            ListHeaderComponent={
                <Text style={[styles.tz, { color: colors.subtext }]}>
                    {t('calendarExport.myWeekHint', { tz: getUtcOffsetString() })}
                </Text>
            }
            renderSectionHeader={({ section }) => (
                <Text style={[styles.dayTitle, { color: colors.text }]}>{section.title}</Text>
            )}
            renderItem={({ item }) => (
                <TouchableOpacity
                    style={[styles.row, { backgroundColor: colors.card }]}
                    onPress={() => router.push(`/anime/${item.animeId}`)}
                >
                    <Text style={[styles.time, { color: colors.primary }]}>{format(new Date(item.airingAt * 1000), 'HH:mm')}</Text>
                    <Image source={item.image ? { uri: item.image } : undefined} style={[styles.poster, { backgroundColor: colors.inputBg }]} contentFit="cover" />
                    <View style={styles.info}>
                        <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>{item.title}</Text>
                        <Text style={[styles.ep, { color: colors.subtext }]}>
                            {`${t('calendar.ep')} ${item.episode}${item.totalEpisodes ? ` / ${item.totalEpisodes}` : ''}`}
                        </Text>
                    </View>
                    {calendar.available && (
                        <TouchableOpacity
                            onPress={() => calendar.add({ title: item.title, episode: item.episode, airingAt: item.airingAt, totalEpisodes: item.totalEpisodes })}
                            style={styles.calButton}
                            accessibilityLabel={t('calendarExport.addToCalendar')}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                            <Ionicons name="calendar-outline" size={20} color={colors.text} />
                        </TouchableOpacity>
                    )}
                </TouchableOpacity>
            )}
            ListEmptyComponent={
                <View style={styles.empty}>
                    <Ionicons name={error ? 'alert-circle-outline' : 'calendar-clear-outline'} size={48} color={colors.subtext} />
                    <Text style={[styles.emptyText, { color: colors.subtext }]}>
                        {error ? t('calendar.timeoutError') : t('calendarExport.myWeekEmpty')}
                    </Text>
                    {error && (
                        <TouchableOpacity onPress={load} style={[styles.retry, { backgroundColor: colors.card }]}>
                            <Text style={{ color: colors.primary, fontFamily: 'Poppins_600SemiBold' }}>{t('calendar.tryAgain')}</Text>
                        </TouchableOpacity>
                    )}
                </View>
            }
        />
    );
};

const styles = StyleSheet.create({
    content: { paddingHorizontal: 20, paddingTop: 8 },
    tz: { fontFamily: 'Poppins_500Medium', fontSize: 12, marginBottom: 4 },
    dayTitle: { fontFamily: 'Poppins_700Bold', fontSize: 16, marginTop: 16, marginBottom: 8 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 18, padding: 8, marginBottom: 10 },
    time: { width: 46, fontFamily: 'Poppins_700Bold', fontSize: 14, textAlign: 'center' },
    poster: { width: 44, height: 60, borderRadius: 10 },
    info: { flex: 1 },
    title: { fontFamily: 'Poppins_600SemiBold', fontSize: 14 },
    ep: { fontFamily: 'Poppins_500Medium', fontSize: 12, marginTop: 2 },
    calButton: { padding: 6 },
    empty: { alignItems: 'center', marginTop: 60, gap: 12, paddingHorizontal: 24 },
    emptyText: { fontFamily: 'Poppins_500Medium', fontSize: 14, textAlign: 'center' },
    retry: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
});
