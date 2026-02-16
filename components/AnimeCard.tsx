import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { Anime } from '../lib/jikan';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

interface AnimeCardProps {
    anime: Anime;
    onPress: () => void;
    numColumns?: number;
}

export const AnimeCard: React.FC<AnimeCardProps> = React.memo(({ anime, onPress, numColumns }) => {
    const { width } = useWindowDimensions();
    const { colors, isDark } = useTheme();

    // Determine columns: use prop if provided, otherwise auto-detect
    const columns = numColumns ?? (width >= 768 ? 3 : 2);
    // Calculate card width dynamically based on column count
    // 40 = horizontal padding (20*2), gaps = 16 * (columns - 1)
    const cardWidth = (width - 40 - 16 * (columns - 1)) / columns;

    return (
        <TouchableOpacity
            style={[styles.container, { width: cardWidth }]}
            activeOpacity={0.7}
            onPress={onPress}
        >
            <View style={[styles.imageContainer, { height: cardWidth * 1.5, backgroundColor: isDark ? '#374151' : '#f0f0f0' }]}>
                <Image
                    source={{ uri: anime.images.jpg.large_image_url }}
                    style={styles.image}
                    contentFit="cover"
                    transition={500}
                />
                <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.8)']}
                    style={styles.gradient}
                />
                <View style={styles.scoreBadge}>
                    <Ionicons name="star" size={12} color="#FACC15" />
                    <Text style={styles.scoreText}>{anime.score || 'N/A'}</Text>
                </View>
            </View>

            <View style={styles.info}>
                <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
                    {anime.title_english || anime.title}
                </Text>
                <Text style={[styles.subtitle, { color: colors.subtext }]} numberOfLines={1}>
                    {anime.episodes ? `${anime.episodes} eps` : '? eps'} • {anime.type}
                </Text>
            </View>
        </TouchableOpacity>
    );
});

const styles = StyleSheet.create({
    container: {
        marginBottom: 24,
        borderRadius: 12,
        backgroundColor: 'transparent',
    },
    imageContainer: {
        width: '100%',
        borderRadius: 16,
        overflow: 'hidden',
        position: 'relative',
        marginBottom: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
        elevation: 5,
    },
    image: {
        width: '100%',
        height: '100%',
    },
    gradient: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: '40%',
    },
    scoreBadge: {
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: 'rgba(0,0,0,0.6)',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        gap: 4,
    },
    scoreText: {
        color: '#FFF',
        fontSize: 12,
        fontFamily: 'Poppins_600SemiBold',
    },
    info: {
        paddingHorizontal: 4,
    },
    title: {
        fontSize: 14,
        fontFamily: 'Poppins_600SemiBold',
        marginBottom: 4,
        lineHeight: 20,
    },
    subtitle: {
        fontSize: 12,
        fontFamily: 'Poppins_500Medium',
    }
});
