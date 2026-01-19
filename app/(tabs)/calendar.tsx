
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Image, TextInput, Keyboard } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { Ionicons } from '@expo/vector-icons';
import { getAnimeSchedule } from '../../services/jikanApi';
import { DayTabs } from '../../components/Calendar/DayTabs';
import { CalendarAnimeCard } from '../../components/Calendar/CalendarAnimeCard';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthProvider';
import { useRouter, useFocusEffect } from 'expo-router';
import { getNextBroadcastDate } from '../../lib/dateUtils';

// Days mapping for Jikan API
const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export default function CalendarScreen() {
    const { colors, isDark, toggleTheme } = useTheme();
    const { t } = useLanguage();
    const insets = useSafeAreaInsets();
    const { session, avatarUrl } = useAuth();
    const router = useRouter();
    const flatListRef = useRef<FlatList>(null);
    const searchInputRef = useRef<TextInput>(null);

    // Determine today's day
    const getToday = () => {
        const dayIndex = new Date().getDay(); // 0 is Sunday
        const map = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        return map[dayIndex];
    };

    const [selectedDay, setSelectedDay] = useState(getToday());
    const [schedule, setSchedule] = useState<any[]>([]);
    const [allSchedules, setAllSchedules] = useState<Record<string, any[]>>({}); // Cache for loaded days
    const [loading, setLoading] = useState(true);
    const [favoritesOnly, setFavoritesOnly] = useState(false);
    const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set());

    // Search State
    const [isSearchVisible, setIsSearchVisible] = useState(false);
    const [inputText, setInputText] = useState(''); // What the user types
    const [searchQuery, setSearchQuery] = useState(''); // What filters the list

    const fetchSchedule = useCallback(async () => {
        // If we already have data for this day, use it and don't show loading
        if (allSchedules[selectedDay]) {
            setSchedule(allSchedules[selectedDay]);
            return;
        }

        setLoading(true);
        try {
            const data = await getAnimeSchedule(selectedDay);
            setSchedule(data);
            setAllSchedules(prev => ({
                ...prev,
                [selectedDay]: data
            }));
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [selectedDay, allSchedules]);

    const fetchFavorites = useCallback(async () => {
        if (!session?.user?.id) return;
        try {
            const { data, error } = await supabase
                .from('user_anime_list')
                .select('anime_id')
                .eq('user_id', session.user.id)
                .eq('is_favorite', true);

            if (data) {
                const ids = new Set(data.map(item => Number(item.anime_id)));
                setFavoriteIds(ids);
            }
        } catch (e) {
            console.error('Error fetching favorites:', e);
        }
    }, [session]);

    useEffect(() => {
        fetchSchedule();
    }, [fetchSchedule]);

    // Refetch favorites when tab gains focus to ensure sync
    useFocusEffect(
        useCallback(() => {
            fetchFavorites();
        }, [fetchFavorites])
    );

    // Filter Logic
    const filteredSchedule = schedule.filter(anime => {
        // 1. Strict Day Check
        // Jikan returns days like "Mondays", "Tuesdays".
        // selectedDay is "monday", "tuesday".
        // We want to ensure we only show shows regarding the selected day.
        // Also handle "Unknown" or null?

        let matchesDay = true;
        if (anime.broadcast && anime.broadcast.day) {
            // "Mondays" -> "monday"
            // Some might be null, usually we trust the API filter, but user reported issues.
            const apiDay = anime.broadcast.day.toLowerCase();
            // specific check: does "mondays" contain "monday"? Yes.
            // selectedDay: "monday". apiDay: "mondays".
            // match if apiDay includes selectedDay?
            // Or strictly: apiDay.startsWith(selectedDay) because "Mondays" starts with "Monday" (case-insensitive)?
            // Let's safe check:
            if (!apiDay.includes(selectedDay.toLowerCase())) {
                matchesDay = false;
            }
        }

        // 2. Favorites Check
        const matchesFav = favoritesOnly ? favoriteIds.has(anime.mal_id) : true;

        // 3. Search Check
        const title = anime.title_english || anime.title || '';
        const matchesSearch = searchQuery
            ? title.toLowerCase().includes(searchQuery.toLowerCase())
            : true;

        return matchesDay && matchesFav && matchesSearch;
    }).filter((anime, index, self) =>
        index === self.findIndex((t) => (
            t.mal_id === anime.mal_id
        ))
    ).sort((a, b) => {
        const dateA = getNextBroadcastDate(a);
        const dateB = getNextBroadcastDate(b);

        if (dateA && !dateB) return -1;
        if (!dateA && dateB) return 1;
        if (!dateA && !dateB) return 0;

        return dateA!.getTime() - dateB!.getTime();
    });

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
        setSearchQuery(inputText.trim());
        Keyboard.dismiss();
    };

    // --- Fixed Header Component moved outside to prevent re-renders on state change ---
    // But since it depends on many local variables, we can memoize it or use props.
    // Memoizing inside component:

    // We will use the existing FixedHeader implementation but since it is defined inside the render function scope (essentially), 
    // it gets recreated.
    // Let's refactor to return the JSX directly or use useMemo, but the cleanest is to keep it inline in return 
    // or properly extract it. 
    // Given the props usage, I'll extract it and pass props.

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <CalendarHeader
                insets={insets}
                colors={colors}
                isSearchVisible={isSearchVisible}
                inputText={inputText}
                setInputText={setInputText}
                handleSearchSubmit={handleSearchSubmit}
                toggleSearch={toggleSearch}
                scrollToTop={scrollToTop}
                isDark={isDark}
                toggleTheme={toggleTheme}
                avatarUrl={avatarUrl}
                router={router}
                searchInputRef={searchInputRef}
            />

            <FlatList
                ref={flatListRef}
                data={loading ? [] : filteredSchedule}
                keyExtractor={(item) => item.mal_id.toString()}
                renderItem={({ item }) => <CalendarAnimeCard anime={item} />}
                contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 80 }]}
                ListHeaderComponent={
                    <CalendarListHeader
                        colors={colors}
                        t={t}
                        favoritesOnly={favoritesOnly}
                        setFavoritesOnly={setFavoritesOnly}
                        selectedDay={selectedDay}
                        setSelectedDay={setSelectedDay}
                    />
                }
                ListEmptyComponent={
                    loading ? (
                        <View style={{ flex: 1, justifyContent: 'center', marginTop: 100 }}>
                            <ActivityIndicator size="large" color={colors.primary} />
                        </View>
                    ) : (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="calendar-clear-outline" size={48} color={colors.subtext} />
                            <Text style={[styles.emptyText, { color: colors.subtext }]}>
                                {searchQuery
                                    ? "No matches found."
                                    : favoritesOnly
                                        ? "No favorites airing on this day."
                                        : "No anime scheduled for this day."}
                            </Text>
                        </View>
                    )
                }
            />
        </View>
    );
}

// Extracted Header Component
const CalendarHeader = ({
    insets,
    colors,
    isSearchVisible,
    inputText,
    setInputText,
    handleSearchSubmit,
    toggleSearch,
    scrollToTop,
    isDark,
    toggleTheme,
    avatarUrl,
    router,
    searchInputRef
}: any) => (
    <View style={[styles.fixedHeader, { paddingTop: insets.top + 2, backgroundColor: colors.background, paddingBottom: 0 }]}>
        {isSearchVisible ? (
            <View style={styles.searchHeaderContainer}>
                <Ionicons name="search-outline" size={20} color={colors.subtext} style={{ marginRight: 8 }} />
                <TextInput
                    ref={searchInputRef}
                    style={[styles.searchInput, { color: colors.text }]}
                    placeholder="Search daily schedule..."
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
                    <TouchableOpacity style={styles.profileButton} onPress={() => router.push('/(tabs)/profile')}>
                        <Image
                            source={{ uri: avatarUrl || 'https://via.placeholder.com/150' }}
                            style={styles.headerProfileImage}
                        />
                    </TouchableOpacity>
                </View>
            </>
        )}
    </View>
);

// Extracted List Header Component
const CalendarListHeader = ({
    colors,
    t,
    favoritesOnly,
    setFavoritesOnly,
    selectedDay,
    setSelectedDay
}: any) => (
    <View>
        {/* Original Header Content: Title + Actions */}
        <View style={styles.pageHeader}>
            <View style={styles.titleContainer}>
                <Text style={[styles.headerTitle, { color: colors.text }]}>{t('calendar.title')}</Text>
                <Ionicons name="calendar-outline" size={20} color={colors.primary} style={{ marginLeft: 8 }} />
            </View>

            <TouchableOpacity
                style={[
                    styles.favButton,
                    {
                        backgroundColor: favoritesOnly ? colors.primary : colors.card,
                        borderColor: colors.border,
                        borderWidth: 1
                    }
                ]}
                onPress={() => setFavoritesOnly(!favoritesOnly)}
            >
                <Ionicons
                    name={favoritesOnly ? "heart" : "heart-outline"}
                    size={16}
                    color={favoritesOnly ? '#fff' : colors.text}
                />
                <Text style={[
                    styles.favButtonText,
                    { color: favoritesOnly ? '#fff' : colors.text }
                ]}>
                    {t('calendar.favoritesOnly')}
                </Text>
            </TouchableOpacity>
        </View>

        {/* Day Tabs */}
        <DayTabs selectedDay={selectedDay} onSelectDay={setSelectedDay} />
    </View>
);

const styles = StyleSheet.create({
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
    headerProfileImage: {
        width: '100%',
        height: '100%',
    },
    searchHeaderContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        height: '100%',
        paddingVertical: 10, // Add some padding for search input vertical alignment if needed
    },
    searchInput: {
        flex: 1,
        fontFamily: 'Poppins_500Medium',
        fontSize: 16,
        height: 40,
    },
    pageHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 0,
        paddingBottom: 15,
        paddingTop: 10,
    },
    titleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontFamily: 'Poppins_700Bold',
    },
    favButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
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
    centerContainer: {
        flex: 1,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 50,
    },
    emptyText: {
        fontFamily: 'Poppins_500Medium',
        marginTop: 10,
        fontSize: 14,
    }
});
