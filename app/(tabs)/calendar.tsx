import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Image, TextInput, Keyboard,
    RefreshControl, AppState, Alert, Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { HeaderAvatar } from '../../components/HeaderAvatar';
import { useLanguage } from '../../context/LanguageContext';
import { getAiringSchedule, AiringScheduleAnime } from '../../services/anilistApi';
import { DayTabs } from '../../components/Calendar/DayTabs';
import { CalendarAnimeCard } from '../../components/Calendar/CalendarAnimeCard';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthProvider';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import { toLocalDateKey, getLocalDayBounds } from '../../lib/dateUtils';
import { useWalkthroughTargets, useWalkthroughAutoStart } from '../../context/WalkthroughContext';
import { analytics, queryShape } from '../../lib/analytics';
import {
    remindersSupported, getRemindersEnabled, enableEpisodeReminders, disableEpisodeReminders,
} from '../../lib/episodeReminders';
import { useFeature } from '../../hooks/usePremium';
import { useAddToCalendar } from '../../hooks/useAddToCalendar';
import { PremiumGate } from '../../components/Premium/PremiumGate';
import { MyWeekView } from '../../components/Calendar/MyWeekView';
import { ReminderSettingsSheet } from '../../components/Calendar/ReminderSettingsSheet';

const DAYS_SHOWN = 7;
const WEEKDAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
// Below this AniList popularity a show is folded behind "show more" unless it is in the user's list
const MIN_POPULARITY = 500;

type ListState = 'favorite' | 'listed';

const buildDays = (todayKey: string) => {
    const [y, m, d] = todayKey.split('-').map(Number);
    return Array.from({ length: DAYS_SHOWN }, (_, i) => new Date(y, m - 1, d + i));
};

export default function CalendarScreen() {
    const { colors, isDark, toggleTheme } = useTheme();
    const { t } = useLanguage();
    const insets = useSafeAreaInsets();
    const { session, avatarUrl } = useAuth();
    const requireAuth = useRequireAuth();
    const router = useRouter();
    const flatListRef = useRef<FlatList>(null);
    const searchInputRef = useRef<TextInput>(null);
    const userId = session?.user?.id;

    // Premium (Module 4): "My week" view, reminder settings, add to phone calendar
    const notifications = useFeature('premium_notifications');
    const calendarExport = useAddToCalendar('calendar_day');
    const [viewMode, setViewMode] = useState<'day' | 'mine'>('day');
    const [reminderSheetOpen, setReminderSheetOpen] = useState(false);
    const changeViewMode = (mode: 'day' | 'mine') => {
        if (mode === 'mine' && !userId) {
            requireAuth('calendar', () => setViewMode('mine'));
            return;
        }
        setViewMode(mode);
        analytics.track('calendar_view_changed', { view: mode, locked: notifications.locked });
    };

    // Walkthrough refs
    const remindersRef = useRef<View>(null);
    const favoritesToggleRef = useRef<View>(null);
    const viewToggleRef = useRef<View>(null);
    const dayTabsRef = useRef<View>(null);
    const firstCardRef = useRef<View>(null);
    useWalkthroughTargets('calendar', {
        reminders: remindersRef,
        favoritesToggle: favoritesToggleRef,
        viewToggle: viewToggleRef,
        dayTabs: dayTabsRef,
        broadcastTime: firstCardRef,
    });

    // --- Days: today + the next 6, re-derived when the local date changes ---
    const [todayKey, setTodayKey] = useState(() => toLocalDateKey(new Date()));
    const days = useMemo(() => buildDays(todayKey), [todayKey]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const selectedDate = days[selectedIndex];
    const selectedKey = toLocalDateKey(selectedDate);

    const todayKeyRef = useRef(todayKey);
    const refreshToday = useCallback(() => {
        const key = toLocalDateKey(new Date());
        if (key === todayKeyRef.current) return;
        todayKeyRef.current = key;
        setTodayKey(key);
        setSelectedIndex(0);
        setShowAll(false);
    }, []);

    useEffect(() => {
        const sub = AppState.addEventListener('change', state => {
            if (state === 'active') refreshToday();
        });
        return () => sub.remove();
    }, [refreshToday]);

    const selectDay = (index: number) => {
        if (index === selectedIndex) return;
        setSelectedIndex(index);
        setShowAll(false);
        flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
        analytics.track('calendar_day_changed', { day: WEEKDAY_KEYS[days[index].getDay()], day_offset: index });
    };

    // --- Schedule loading (cached per local date) ---
    const cacheRef = useRef<Record<string, AiringScheduleAnime[]>>({});
    const latestKeyRef = useRef(selectedKey);
    const [schedule, setSchedule] = useState<AiringScheduleAnime[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(false);

    const loadDay = useCallback(async (date: Date, force = false) => {
        const key = toLocalDateKey(date);
        latestKeyRef.current = key;
        const cached = cacheRef.current[key];

        if (cached && !force) {
            setSchedule(cached);
            setError(false);
            setLoading(false);
            return;
        }
        if (!cached) {
            setSchedule([]);
            setLoading(true);
        }
        setError(false);

        try {
            const { start, end } = getLocalDayBounds(date);
            const data = await getAiringSchedule(start, end, force);
            cacheRef.current[key] = data;
            // Ignore responses for a day the user has already switched away from
            if (latestKeyRef.current !== key) return;
            setSchedule(data);
        } catch (e) {
            console.warn('Calendar schedule failed to load:', e);
            if (latestKeyRef.current !== key) return;
            // On a failed refresh keep showing what we already have
            if (!cacheRef.current[key]) setError(true);
        } finally {
            if (latestKeyRef.current === key) {
                setLoading(false);
                setRefreshing(false);
            }
        }
    }, []);

    // Drop days that are no longer in the 7-day window when the date rolls over
    useEffect(() => {
        const validKeys = new Set(days.map(toLocalDateKey));
        Object.keys(cacheRef.current).forEach(key => {
            if (!validKeys.has(key)) delete cacheRef.current[key];
        });
    }, [days]);

    useEffect(() => {
        loadDay(selectedDate);
    }, [selectedKey]);

    // --- The user's list (favorite / listed badges and the favorites filter) ---
    const [listStates, setListStates] = useState<Map<number, ListState>>(new Map());
    const [favoritesOnly, setFavoritesOnly] = useState(false);

    const fetchListStates = useCallback(async () => {
        if (!userId) {
            setListStates(new Map());
            return;
        }
        try {
            const { data, error } = await supabase
                .from('user_anime_list')
                .select('anime_id, is_favorite')
                .eq('user_id', userId);
            if (error) throw error;
            setListStates(new Map((data || []).map(row => [
                Number(row.anime_id),
                row.is_favorite ? 'favorite' : 'listed',
            ] as [number, ListState])));
        } catch (e) {
            console.error('Error fetching list states:', e);
        }
    }, [userId]);

    useEffect(() => {
        if (!userId) setFavoritesOnly(false);
    }, [userId]);

    const toggleFavoritesOnly = () => {
        if (favoritesOnly) {
            setFavoritesOnly(false);
            return;
        }
        requireAuth('calendar', () => setFavoritesOnly(true));
    };

    // --- Episode reminders ---
    const [remindersOn, setRemindersOn] = useState(false);
    const [remindersBusy, setRemindersBusy] = useState(false);

    const toggleReminders = () => {
        if (remindersBusy) return;
        requireAuth('calendar', async () => {
            setRemindersBusy(true);
            try {
                if (await getRemindersEnabled()) {
                    await disableEpisodeReminders();
                    setRemindersOn(false);
                    analytics.track('calendar_reminders_toggled', { enabled: false, result: 'disabled' });
                    Alert.alert(t('calendar.remindersOffTitle'), t('calendar.remindersOffBody'));
                    return;
                }
                // After a resumed sign-in `userId` from this render is still empty
                const { data } = await supabase.auth.getSession();
                const uid = data.session?.user?.id;
                if (!uid) return;
                const result = await enableEpisodeReminders(uid, notifications.enabled && !notifications.locked);
                analytics.track('calendar_reminders_toggled', { enabled: result === 'enabled', result });
                if (result === 'enabled') {
                    setRemindersOn(true);
                    Alert.alert(t('calendar.remindersOnTitle'), t('calendar.remindersOnBody'));
                } else {
                    Alert.alert(t('calendar.remindersDeniedTitle'), t('calendar.remindersDeniedBody'), [
                        { text: t('common.cancel'), style: 'cancel' },
                        { text: t('calendar.openSettings'), onPress: () => Linking.openSettings() },
                    ]);
                }
            } finally {
                setRemindersBusy(false);
            }
        });
    };

    // --- Search ---
    const [isSearchVisible, setIsSearchVisible] = useState(false);
    const [inputText, setInputText] = useState(''); // What the user types
    const [searchQuery, setSearchQuery] = useState(''); // What filters the list
    const [showAll, setShowAll] = useState(false);

    useFocusEffect(
        useCallback(() => {
            refreshToday();
            fetchListStates();
            if (remindersSupported) getRemindersEnabled().then(setRemindersOn);

            return () => {
                setIsSearchVisible(false);
                setInputText('');
                setSearchQuery('');
                Keyboard.dismiss();
            };
        }, [refreshToday, fetchListStates])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchListStates();
        loadDay(selectedDate, true);
    };

    // --- Filtering ---
    const { visible, lessPopularCount } = useMemo(() => {
        const query = searchQuery.toLowerCase();
        const matches = schedule
            .filter(anime => {
                if (favoritesOnly && listStates.get(anime.mal_id) !== 'favorite') return false;
                if (!query) return true;
                return [anime.title_english, anime.title, anime.title_japanese]
                    .some(title => title?.toLowerCase().includes(query));
            })
            .sort((a, b) => a.airingAt - b.airingAt);

        // Filters the user chose override the popularity fold
        if (favoritesOnly || query) return { visible: matches, lessPopularCount: 0 };

        const isNotable = (anime: AiringScheduleAnime) =>
            listStates.has(anime.mal_id) || (anime.popularity >= MIN_POPULARITY && anime.format !== 'MUSIC');
        const notable = matches.filter(isNotable);
        return {
            visible: showAll ? matches : notable,
            lessPopularCount: matches.length - notable.length,
        };
    }, [schedule, favoritesOnly, searchQuery, listStates, showAll]);

    const scrollToTop = () => {
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    };

    const toggleSearch = () => {
        if (isSearchVisible) {
            setIsSearchVisible(false);
            setSearchQuery('');
            setInputText('');
            Keyboard.dismiss();
        } else {
            setIsSearchVisible(true);
            setTimeout(() => searchInputRef.current?.focus(), 100);
        }
    };

    const handleSearchSubmit = () => {
        if (inputText.trim()) analytics.track('search_performed', { source: 'calendar', ...queryShape(inputText) });
        setSearchQuery(inputText.trim());
        Keyboard.dismiss();
    };

    const renderEmpty = () => {
        if (loading) {
            return (
                <View style={{ flex: 1, justifyContent: 'center', marginTop: 100 }}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            );
        }
        if (error) {
            return (
                <View style={styles.emptyContainer}>
                    <Ionicons name="alert-circle-outline" size={48} color={colors.primary} />
                    <Text style={[styles.emptyText, { color: colors.text, textAlign: 'center', marginBottom: 8 }]}>
                        {t('calendar.timeoutError')}
                    </Text>
                    <TouchableOpacity
                        onPress={() => loadDay(selectedDate, true)}
                        style={[styles.retryButton, { backgroundColor: colors.card }]}
                    >
                        <Text style={[styles.retryText, { color: colors.primary }]}>{t('calendar.tryAgain')}</Text>
                    </TouchableOpacity>
                </View>
            );
        }
        return (
            <View style={styles.emptyContainer}>
                <Ionicons name="calendar-clear-outline" size={48} color={colors.subtext} />
                <Text style={[styles.emptyText, { color: colors.subtext, textAlign: 'center' }]}>
                    {searchQuery
                        ? t('calendar.noMatches')
                        : favoritesOnly
                            ? t('calendar.noFavorites')
                            : t('calendar.noSchedule')}
                </Text>
            </View>
        );
    };

    const renderFooter = () => {
        if (loading || error || lessPopularCount === 0) return null;
        return (
            <TouchableOpacity
                onPress={() => setShowAll(prev => !prev)}
                style={[styles.showMoreButton, { borderColor: colors.border }]}
            >
                <Text style={[styles.showMoreText, { color: colors.subtext }]}>
                    {showAll ? t('calendar.showLess') : t('calendar.showMore', { count: lessPopularCount })}
                </Text>
                <Ionicons name={showAll ? 'chevron-up' : 'chevron-down'} size={16} color={colors.subtext} />
            </TouchableOpacity>
        );
    };

    useWalkthroughAutoStart('calendar', !loading);

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <CalendarHeader
                insets={insets}
                colors={colors}
                t={t}
                isSearchVisible={isSearchVisible}
                inputText={inputText}
                setInputText={setInputText}
                handleSearchSubmit={handleSearchSubmit}
                toggleSearch={toggleSearch}
                scrollToTop={scrollToTop}
                isDark={isDark}
                toggleTheme={toggleTheme}
                avatarUrl={avatarUrl}
                onProfilePress={() => requireAuth('profile', () => router.push('/(tabs)/profile'))}
                searchInputRef={searchInputRef}
            />

            <View style={{ paddingHorizontal: 20 }}>
                <View style={styles.pageHeader}>
                    <View style={styles.titleContainer}>
                        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('calendar.title')}</Text>
                        <Ionicons name="calendar-outline" size={20} color={colors.primary} style={{ marginLeft: 8 }} />
                    </View>

                    <View style={styles.pageActions}>
                        {remindersSupported && notifications.enabled ? (
                            <TouchableOpacity
                                onPress={() => requireAuth('calendar', () => setReminderSheetOpen(true))}
                                accessibilityLabel={t('calendarExport.reminderSettings')}
                                style={[styles.bellButton, { backgroundColor: colors.card, borderColor: colors.border }]}
                            >
                                <Ionicons name="options-outline" size={16} color={colors.text} />
                            </TouchableOpacity>
                        ) : null}
                        {remindersSupported ? (
                            <TouchableOpacity
                                ref={remindersRef as any}
                                {...({ collapsable: false } as any)}
                                onPress={toggleReminders}
                                disabled={remindersBusy}
                                accessibilityLabel={t('calendar.remindersLabel')}
                                accessibilityState={{ checked: remindersOn }}
                                style={[
                                    styles.bellButton,
                                    {
                                        backgroundColor: remindersOn ? colors.primary : colors.card,
                                        borderColor: remindersOn ? colors.primary : colors.border,
                                    },
                                ]}
                            >
                                <Ionicons
                                    name={remindersOn ? 'notifications' : 'notifications-outline'}
                                    size={16}
                                    color={remindersOn ? '#000' : colors.text}
                                />
                            </TouchableOpacity>
                        ) : null}

                        <View ref={favoritesToggleRef} collapsable={false}>
                            <TouchableOpacity
                                style={[
                                    styles.favButton,
                                    {
                                        backgroundColor: favoritesOnly ? colors.primary : colors.card,
                                        borderColor: favoritesOnly ? colors.primary : colors.border,
                                    },
                                ]}
                                onPress={toggleFavoritesOnly}
                            >
                                <Ionicons
                                    name={favoritesOnly ? 'heart' : 'heart-outline'}
                                    size={16}
                                    color={favoritesOnly ? '#000' : colors.text}
                                />
                                <Text style={[styles.favButtonText, { color: favoritesOnly ? '#000' : colors.text }]}>
                                    {t('calendar.favoritesOnly')}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {notifications.enabled && (
                    <View ref={viewToggleRef} collapsable={false} style={[styles.viewToggle, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        {(['day', 'mine'] as const).map(mode => {
                            const active = viewMode === mode;
                            return (
                                <TouchableOpacity
                                    key={mode}
                                    onPress={() => changeViewMode(mode)}
                                    style={[styles.viewToggleItem, active && { backgroundColor: colors.primary }]}
                                    accessibilityRole="tab"
                                    accessibilityState={{ selected: active }}
                                >
                                    {mode === 'mine' && notifications.locked && (
                                        <Ionicons name="lock-closed" size={11} color={active ? '#111827' : colors.subtext} />
                                    )}
                                    <Text style={[styles.viewToggleText, { color: active ? '#111827' : colors.text }]}>
                                        {t(mode === 'day' ? 'calendarExport.viewDay' : 'calendarExport.viewMine')}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                )}

                {viewMode === 'day' && (
                    <View ref={dayTabsRef} collapsable={false}>
                        <DayTabs days={days} selectedIndex={selectedIndex} onSelect={selectDay} />
                    </View>
                )}
            </View>

            <ReminderSettingsSheet visible={reminderSheetOpen} onClose={() => setReminderSheetOpen(false)} />

            {viewMode === 'mine' && userId ? (
                notifications.locked ? (
                    <View style={{ paddingHorizontal: 20, paddingTop: 12 }}>
                        <PremiumGate feature="premium_notifications" source="calendar_my_week" description={t('calendarExport.locked')}>
                            {(visible.length ? visible.slice(0, 4) : []).map(item => (
                                <CalendarAnimeCard key={`${item.mal_id}-${item.airing_episode}`} anime={item} listState={listStates.get(item.mal_id)} />
                            ))}
                            {visible.length === 0 && <View style={{ height: 360 }} />}
                        </PremiumGate>
                    </View>
                ) : (
                    <MyWeekView userId={userId} bottomInset={insets.bottom} />
                )
            ) : (
            <FlatList
                ref={flatListRef}
                data={loading || error ? [] : visible}
                keyExtractor={(item) => `${item.mal_id}-${item.airing_episode}`}
                renderItem={({ item, index }) => (
                    <View ref={index === 0 ? firstCardRef : undefined} collapsable={false}>
                        <CalendarAnimeCard
                            anime={item}
                            listState={listStates.get(item.mal_id)}
                            onAddToCalendar={calendarExport.available ? () => calendarExport.add({
                                title: item.title_english || item.title,
                                episode: item.airing_episode,
                                airingAt: item.airingAt,
                                totalEpisodes: item.episodes,
                            }) : undefined}
                        />
                    </View>
                )}
                contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 80 }]}
                ListEmptyComponent={renderEmpty}
                ListFooterComponent={renderFooter}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={colors.primary}
                        colors={[colors.primary]}
                    />
                }
            />
            )}
        </View>
    );
}

interface CalendarHeaderProps {
    insets: { top: number };
    colors: ReturnType<typeof useTheme>['colors'];
    t: (key: string, options?: any) => string;
    isSearchVisible: boolean;
    inputText: string;
    setInputText: (text: string) => void;
    handleSearchSubmit: () => void;
    toggleSearch: () => void;
    scrollToTop: () => void;
    isDark: boolean;
    toggleTheme: () => void;
    avatarUrl: string | null | undefined;
    onProfilePress: () => void;
    searchInputRef: React.RefObject<TextInput | null>;
}

const CalendarHeader = ({
    insets,
    colors,
    t,
    isSearchVisible,
    inputText,
    setInputText,
    handleSearchSubmit,
    toggleSearch,
    scrollToTop,
    isDark,
    toggleTheme,
    avatarUrl,
    onProfilePress,
    searchInputRef,
}: CalendarHeaderProps) => (
    <View style={[styles.fixedHeader, { paddingTop: insets.top + 2, backgroundColor: colors.background, paddingBottom: 0 }]}>
        {isSearchVisible ? (
            <View style={styles.searchHeaderContainer}>
                <View style={[styles.searchBar, { backgroundColor: colors.card, shadowColor: '#000' }]}>
                    <Ionicons name="search-outline" size={20} color={colors.subtext} style={{ marginRight: 8 }} />
                    <TextInput
                        ref={searchInputRef}
                        style={[styles.searchInput, { color: colors.text }]}
                        placeholder={t('calendar.searchPlaceholder')}
                        placeholderTextColor={colors.subtext}
                        value={inputText}
                        onChangeText={setInputText}
                        onSubmitEditing={handleSearchSubmit}
                        returnKeyType="search"
                        autoFocus={true}
                    />
                    <TouchableOpacity onPress={toggleSearch} style={{ padding: 4 }}>
                        <Ionicons name="close" size={24} color={colors.text} />
                    </TouchableOpacity>
                </View>
            </View>
        ) : (
            <>
                <TouchableOpacity style={styles.headerLeft} onPress={scrollToTop}>
                    <Image
                        source={require('../../assets/images/header-logo.png')}
                        style={styles.headerLogo}
                        resizeMode="contain"
                    />
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={[styles.headerBrandText, { color: colors.text }]}>CALEN</Text>
                        <Text style={[styles.headerBrandText, { color: '#FACC15' }]}>DAR</Text>
                    </View>
                </TouchableOpacity>

                <View style={styles.headerRight}>
                    <TouchableOpacity style={styles.iconButton} onPress={toggleSearch}>
                        <Ionicons name="search-outline" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.iconButton} onPress={toggleTheme}>
                        <Ionicons name={isDark ? "sunny-outline" : "moon-outline"} size={24} color={colors.text} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.profileButton} onPress={onProfilePress}>
                        <HeaderAvatar uri={avatarUrl} />
                    </TouchableOpacity>
                </View>
            </>
        )}
    </View>
);

const styles = StyleSheet.create({
    viewToggle: {
        flexDirection: 'row',
        borderWidth: 1,
        borderRadius: 14,
        padding: 3,
        marginBottom: 12,
    },
    viewToggleItem: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        borderRadius: 11,
        paddingVertical: 7,
    },
    viewToggleText: {
        fontFamily: 'Poppins_600SemiBold',
        fontSize: 13,
    },
    container: {
        flex: 1,
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
        marginLeft: -10,
    },
    headerBrandText: {
        fontFamily: 'Poppins_700Bold',
        fontSize: 20,
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
    searchHeaderContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        height: '100%',
        paddingVertical: 10,
        paddingLeft: 12, // Align with content
    },
    searchBar: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        height: 44,
        borderRadius: 12,
        paddingHorizontal: 12,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    searchInput: {
        flex: 1,
        fontFamily: 'Poppins_500Medium',
        fontSize: 14,
        height: '100%',
    },
    pageHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: 15,
        paddingTop: 10,
    },
    titleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flexShrink: 1,
    },
    headerTitle: {
        fontSize: 18,
        fontFamily: 'Poppins_700Bold',
    },
    pageActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    bellButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    favButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        gap: 6,
    },
    favButtonText: {
        fontFamily: 'Poppins_500Medium',
        fontSize: 12,
    },
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 50,
        paddingHorizontal: 20,
    },
    emptyText: {
        fontFamily: 'Poppins_500Medium',
        marginTop: 10,
        fontSize: 14,
    },
    retryButton: {
        padding: 10,
        borderRadius: 8,
        marginTop: 8,
    },
    retryText: {
        fontFamily: 'Poppins_600SemiBold',
    },
    showMoreButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 12,
        marginTop: 4,
        borderRadius: 16,
        borderWidth: 1,
        borderStyle: 'dashed',
    },
    showMoreText: {
        fontFamily: 'Poppins_500Medium',
        fontSize: 13,
    },
});
