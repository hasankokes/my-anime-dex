import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { format } from 'date-fns';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { getUtcOffsetString } from '../../lib/dateUtils';
import type { AiringScheduleAnime } from '../../services/anilistApi';

/** How long after airingAt an episode still counts as "airing now" */
const AIRING_WINDOW_MS = 30 * 60 * 1000;

interface CalendarAnimeCardProps {
    anime: AiringScheduleAnime;
    /** The anime is in the user's list; `favorite` additionally marks it as a favorite */
    listState?: 'favorite' | 'listed';
    /** Premium: shows an "add to phone calendar" button */
    onAddToCalendar?: () => void;
}

export const CalendarAnimeCard = React.memo(function CalendarAnimeCard({ anime, listState, onAddToCalendar }: CalendarAnimeCardProps) {
    const { colors } = useTheme();
    const { t } = useLanguage();
    const router = useRouter();
    const [now, setNow] = useState(Date.now());

    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 30000);
        return () => clearInterval(timer);
    }, []);

    const airingMs = anime.airingAt * 1000;
    const airingDate = new Date(airingMs);
    const diffMs = airingMs - now;

    let status: string;
    let isPast = false;
    if (diffMs > 0) {
        const totalMinutes = Math.ceil(diffMs / 60000);
        const d = Math.floor(totalMinutes / 1440);
        const h = Math.floor((totalMinutes % 1440) / 60);
        const m = totalMinutes % 60;
        status = d > 0
            ? t('calendar.countdownDays', { d, h })
            : h > 0
                ? t('calendar.countdownHours', { h, m })
                : t('calendar.countdownMinutes', { m });
    } else if (-diffMs < AIRING_WINDOW_MS) {
        status = t('calendar.airingNow');
    } else {
        status = t('calendar.aired');
        isPast = true;
    }

    const badgeColor = isPast ? colors.subtext : colors.primary;

    return (
        <TouchableOpacity
            style={[styles.container, { backgroundColor: colors.card }]}
            onPress={() => router.push(`/anime/${anime.mal_id}`)}
        >
            <Image
                source={{ uri: anime.images.webp.large_image_url || anime.images.jpg.large_image_url }}
                style={[styles.image, isPast && { opacity: 0.6 }]}
                contentFit="cover"
                cachePolicy="memory-disk"
                transition={150}
            />
            <View style={styles.content}>
                <View style={styles.titleRow}>
                    <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
                        {anime.title_english || anime.title}
                    </Text>
                    {listState ? (
                        <Ionicons
                            name={listState === 'favorite' ? 'heart' : 'bookmark'}
                            size={16}
                            color={colors.primary}
                            style={styles.listIcon}
                            accessibilityLabel={t('calendar.inYourList')}
                        />
                    ) : null}
                </View>

                <View style={styles.bottomInfoContainer}>
                    <View style={styles.timeLeftContainer}>
                        <Text style={[styles.timeText, { color: isPast ? colors.subtext : colors.primary }]}>
                            {`${format(airingDate, 'HH:mm')} ${getUtcOffsetString(airingDate)}`}
                        </Text>
                        <View style={[styles.countdownBadge, { backgroundColor: badgeColor + '20' }]}>
                            <Text style={[styles.countdownText, { color: badgeColor }]} numberOfLines={1} ellipsizeMode="tail">
                                {status}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.epRow}>
                        <Text style={[styles.epText, { color: colors.subtext }]}>
                            {`${t('calendar.ep')} ${anime.airing_episode}`}
                        </Text>
                        {onAddToCalendar && !isPast && (
                            <TouchableOpacity
                                onPress={onAddToCalendar}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                accessibilityLabel={t('calendarExport.addToCalendar')}
                            >
                                <Ionicons name="calendar-outline" size={16} color={colors.subtext} />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );
});

const styles = StyleSheet.create({
    epRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    container: {
        flexDirection: 'row',
        marginBottom: 12,
        borderRadius: 24,
        padding: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 3,
        height: 100,
    },
    image: {
        width: 65,
        height: 84,
        borderRadius: 16,
    },
    content: {
        flex: 1,
        paddingHorizontal: 12,
        paddingVertical: 2,
        justifyContent: 'space-between',
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    title: {
        flex: 1,
        fontFamily: 'Poppins_600SemiBold',
        fontSize: 14,
        lineHeight: 20,
        marginTop: 4,
    },
    listIcon: {
        marginLeft: 6,
        marginTop: 6,
    },
    bottomInfoContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: 2,
    },
    timeLeftContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flexShrink: 1,
        marginRight: 8,
    },
    timeText: {
        fontFamily: 'Poppins_600SemiBold',
        fontSize: 13,
    },
    epText: {
        fontFamily: 'Poppins_500Medium',
        fontSize: 12,
    },
    countdownBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        flexShrink: 1,
    },
    countdownText: {
        fontFamily: 'Poppins_700Bold',
        fontSize: 12,
    },
});
