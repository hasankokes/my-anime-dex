import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import type { StatsCardItem, UserStats } from '../../services/statsService';
import { genreLabel } from '../Discover/discoverText';

/** The small stats card a premium user can choose to show on their profile. */
export const ProfileStatsCard: React.FC<{ stats: UserStats; items: StatsCardItem[]; style?: ViewStyle }> = ({ stats, items, style }) => {
    const { colors } = useTheme();
    const { t } = useLanguage();

    const tiles = items
        .map(item => {
            switch (item) {
                case 'completed':
                    return { key: item, label: t('stats.completed'), value: String(stats.completed) };
                case 'watching':
                    return { key: item, label: t('stats.watching'), value: String(stats.watching) };
                case 'top_genre':
                    return stats.genres[0] ? { key: item, label: t('stats.topGenre'), value: genreLabel(t, stats.genres[0].name) } : null;
                case 'favorite_studio':
                    return stats.favoriteStudio ? { key: item, label: t('stats.favoriteStudio'), value: stats.favoriteStudio.name } : null;
                case 'avg_rating':
                    return stats.rating.average != null
                        ? { key: item, label: t('stats.avgRating'), value: `★ ${stats.rating.average.toFixed(1)}` }
                        : null;
            }
        })
        .filter(Boolean) as { key: string; label: string; value: string }[];

    if (!tiles.length) return null;

    return (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, style]}>
            <View style={styles.header}>
                <Ionicons name="stats-chart" size={14} color={colors.primary} />
                <Text style={[styles.title, { color: colors.subtext }]}>{t('stats.cardTitle')}</Text>
            </View>
            <View style={styles.tiles}>
                {tiles.map(tile => (
                    <View key={tile.key} style={styles.tile}>
                        <Text style={[styles.value, { color: colors.text }]} numberOfLines={1}>{tile.value}</Text>
                        <Text style={[styles.label, { color: colors.subtext }]} numberOfLines={1}>{tile.label}</Text>
                    </View>
                ))}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        marginHorizontal: 20,
        marginBottom: 24,
        borderRadius: 16,
        borderWidth: 1,
        padding: 16,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 12,
    },
    title: {
        fontFamily: 'Poppins_700Bold',
        fontSize: 12,
        letterSpacing: 1,
    },
    tiles: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        rowGap: 12,
    },
    tile: {
        width: '33.33%',
        paddingRight: 8,
    },
    value: {
        fontFamily: 'Poppins_700Bold',
        fontSize: 16,
    },
    label: {
        fontFamily: 'Poppins_500Medium',
        fontSize: 11,
        marginTop: 2,
    },
});
