import React from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import type { Top10Entry } from '../../lib/cosmetics';

/** "Top 10" poster row on a profile. `onEdit` shows the edit action (own profile). */
export const Top10Showcase: React.FC<{ entries: Top10Entry[]; onEdit?: () => void }> = ({ entries, onEdit }) => {
    const router = useRouter();
    const { colors } = useTheme();
    const { t } = useLanguage();

    if (!entries.length && !onEdit) return null;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: colors.text }]}>{t('cosmetics.top10Title')}</Text>
                {onEdit && (
                    <TouchableOpacity onPress={onEdit} style={styles.editButton}>
                        <Ionicons name="create-outline" size={16} color={colors.primary} />
                        <Text style={[styles.editText, { color: colors.primary }]}>{t('cosmetics.edit')}</Text>
                    </TouchableOpacity>
                )}
            </View>
            {entries.length === 0 ? (
                <TouchableOpacity
                    style={[styles.empty, { borderColor: colors.border }]}
                    onPress={onEdit}
                >
                    <Ionicons name="add-circle-outline" size={22} color={colors.subtext} />
                    <Text style={[styles.emptyText, { color: colors.subtext }]}>{t('cosmetics.top10Empty')}</Text>
                </TouchableOpacity>
            ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
                    {entries.map((entry, index) => (
                        <TouchableOpacity
                            key={entry.anime_id}
                            style={styles.item}
                            onPress={() => router.push(`/anime/${entry.anime_id}`)}
                            accessibilityLabel={`${index + 1}. ${entry.title}`}
                        >
                            <Image
                                source={{ uri: entry.image || undefined }}
                                style={[styles.poster, { backgroundColor: colors.card }]}
                            />
                            <View style={[styles.rank, { backgroundColor: colors.primary }]}>
                                <Text style={styles.rankText}>{index + 1}</Text>
                            </View>
                            <Text style={[styles.itemTitle, { color: colors.text }]} numberOfLines={2}>{entry.title}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 24,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        marginBottom: 12,
    },
    title: {
        fontFamily: 'Poppins_700Bold',
        fontSize: 18,
    },
    editButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    editText: {
        fontFamily: 'Poppins_600SemiBold',
        fontSize: 13,
    },
    row: {
        paddingHorizontal: 20,
        gap: 12,
    },
    item: {
        width: 96,
    },
    poster: {
        width: 96,
        height: 136,
        borderRadius: 12,
    },
    rank: {
        position: 'absolute',
        top: 6,
        left: 6,
        minWidth: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 6,
    },
    rankText: {
        fontFamily: 'Poppins_700Bold',
        fontSize: 12,
        color: '#111827',
    },
    itemTitle: {
        fontFamily: 'Poppins_500Medium',
        fontSize: 12,
        marginTop: 6,
    },
    empty: {
        marginHorizontal: 20,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderRadius: 16,
        paddingVertical: 20,
        alignItems: 'center',
        gap: 6,
    },
    emptyText: {
        fontFamily: 'Poppins_500Medium',
        fontSize: 13,
        textAlign: 'center',
        paddingHorizontal: 20,
    },
});
