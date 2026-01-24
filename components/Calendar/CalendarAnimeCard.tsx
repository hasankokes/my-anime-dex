
import React, { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { useRouter } from 'expo-router';
// Import type locally since we didn't export it from service yet or create a types file.
// Ideally, we should move types to a shared file, but for now I'll redefine or import if I can.
// Actually, I didn't export the interface in jikanApi.ts? Let me check.
// I defined interfaces but didn't export them individually, only used in return type. 
// I should probably move types to a `types/jikan.ts` or just simple 'any' for now to avoid refactor overhead in this step, 
// BUT better practice is to export them. I will assume I can modify jikanApi.ts later or just use 'any' for speed and refine if needed.
// Wait, I can just copy the interface here or update the service file to export them.
// Let's use `any` for the prop to avoid build errors if I forgot to export, but I should check.
// Checking jikanApi.ts content again in my mind... I used `export const getAnimeSchedule...`. Pass.
// I'll define a subset interface here for what I need.

import { format } from 'date-fns';
import { getNextBroadcastDate, getCurrentJSTDate, getBroadcastDateObj, getUtcOffsetString } from '../../lib/dateUtils';

interface CalendarAnimeCardProps {
    anime: any; // Using any to avoid tight coupling with full API response for now
}

export const CalendarAnimeCard: React.FC<CalendarAnimeCardProps> = ({ anime }) => {
    const { colors, isDark } = useTheme();
    const { t } = useLanguage();
    const router = useRouter();

    const [timeLeft, setTimeLeft] = useState<string>('');

    const targetDate = getNextBroadcastDate(anime);

    useEffect(() => {
        if (!targetDate) {
            setTimeLeft('');
            return;
        }

        const calculateTimeLeft = () => {
            // We need current JST time to compare with targetJST
            // effectively we just compare timestamps because both are constructed to represent specific moments
            // But wait, targetJST is a "Face Value" date object. jstNow is Face Value.
            // Subtraction works fine for delta.

            const jstNow = getCurrentJSTDate();

            const diffMs = targetDate.getTime() - jstNow.getTime();

            if (diffMs <= 0) {
                setTimeLeft('Airing now / Just aired');
                return;
            }

            const h = Math.floor((diffMs / (1000 * 60 * 60)));
            const m = Math.floor((diffMs / (1000 * 60)) % 60);

            if (h > 24) {
                const d = Math.floor(h / 24);
                setTimeLeft(`${d}d ${h % 24}h`);
            } else {
                setTimeLeft(`${h}h ${m}m`);
            }
        };

        calculateTimeLeft();
        const timer = setInterval(calculateTimeLeft, 60000);
        return () => clearInterval(timer);
    }, [anime, targetDate]); // Added targetDate dependency

    const handlePress = () => {
        router.push(`/anime/${anime.mal_id}`);
    };

    const getEpisodeDisplay = () => {
        if (!anime.aired || !anime.aired.from || !targetDate) {
            return anime.episodes ? `EP: ${anime.episodes}` : '';
        }

        const startDate = new Date(anime.aired.from);

        // If start date is in future
        if (startDate > new Date()) {
            return 'EP: 1';
        }

        // Calculate weeks between Start Date and Next Broadcast Date
        // We use targetDate (Next Broadcast JST Face Value) and startDate (UTC Face Value?) 
        // aired.from is usually UTC ISO string. "2023-10-01T00:00:00+00:00".
        // new Date(aired.from) gives local time.

        // This mixing of JST Face Value vs Local Time might cause slight jitter (9 hours).
        // A week is 168 hours. 9 hours error is < 6% of a week.
        // Rounding should be safe.

        const diffTime = targetDate.getTime() - startDate.getTime();
        // We used NEXT broadcast. 
        // If Ep 1 is next, diff is 0 (approx). 
        // If Ep 2 is next, diff is 1 week.

        if (diffTime < 0) return 'EP: 1'; // Should not happen if start date is past

        const diffWeeks = Math.round(diffTime / (1000 * 60 * 60 * 24 * 7));
        const currentEp = diffWeeks + 1;

        if (anime.episodes && currentEp > anime.episodes) {
            return `EP: ${anime.episodes}`;
        }

        return `EP: ${currentEp}`;
    };

    return (
        <TouchableOpacity
            style={[styles.container, { backgroundColor: colors.card }]}
            onPress={handlePress}
        >
            <Image
                source={{ uri: anime.images.webp.large_image_url || anime.images.jpg.large_image_url }}
                style={styles.image}
            />
            <View style={styles.content}>
                <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
                    {anime.title_english || anime.title}
                </Text>

                <View style={styles.bottomInfoContainer}>
                    <View style={styles.timeLeftContainer}>
                        <Text style={[styles.timeText, { color: colors.primary }]}>
                            {(() => {
                                const localDate = getBroadcastDateObj(anime);
                                if (localDate) {
                                    return `${format(localDate, 'HH:mm')} ${getUtcOffsetString(localDate)}`;
                                }
                                return (anime.broadcast?.time || '??:??') + ' JST';
                            })()}
                        </Text>
                        {timeLeft ? (
                            <View style={[styles.countdownBadge, { backgroundColor: colors.primary + '20' }]}>
                                <Text style={[styles.countdownText, { color: colors.primary }]}>
                                    {timeLeft}
                                </Text>
                            </View>
                        ) : null}
                    </View>

                    <Text style={[styles.epText, { color: colors.subtext }]}>
                        {getEpisodeDisplay()}
                    </Text>
                </View>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
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
        resizeMode: 'cover',
        borderRadius: 16,
    },
    content: {
        flex: 1,
        paddingHorizontal: 12,
        paddingVertical: 2, // Small padding to account for font line-height vs image edge
        justifyContent: 'space-between',
    },
    title: {
        fontFamily: 'Poppins_600SemiBold',
        fontSize: 14,
        lineHeight: 20,
        marginTop: 4, // Pushed down slightly
    },
    bottomInfoContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: 2, // Align with image bottom visually
    },
    timeLeftContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    timeText: {
        fontFamily: 'Poppins_600SemiBold', // Creating more visual weight
        fontSize: 13, // Increased from 12
    },
    epText: {
        fontFamily: 'Poppins_500Medium',
        fontSize: 12,
    },
    countdownBadge: {
        paddingHorizontal: 8, // Slightly more padding
        paddingVertical: 3,
        borderRadius: 6,
    },
    countdownText: {
        fontFamily: 'Poppins_700Bold', // Bold for emphasis
        fontSize: 12, // Increased from 11
    },
});
