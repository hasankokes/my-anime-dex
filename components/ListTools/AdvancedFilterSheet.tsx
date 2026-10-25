import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { upperCase } from '../../lib/textCase';
import { useFeature } from '../../hooks/usePremium';
import { AdvancedFilters, countActiveFilters, EMPTY_FILTERS } from '../../lib/listFilters';
import { PremiumGate } from '../Premium/PremiumGate';
import { genreLabel } from '../Discover/discoverText';

interface AdvancedFilterSheetProps {
    visible: boolean;
    value: AdvancedFilters;
    genreOptions: string[];
    tagOptions: string[];
    onApply: (filters: AdvancedFilters) => void;
    onClose: () => void;
}

const SCORE_OPTIONS = [null, 6, 7, 8, 9] as const;

const toNumber = (text: string): number | null => {
    const n = parseInt(text.replace(/[^0-9]/g, ''), 10);
    return Number.isFinite(n) && n > 0 ? n : null;
};

/** Premium combined filters for the list tab (year + score + episodes + genre include/exclude + tags). */
export const AdvancedFilterSheet: React.FC<AdvancedFilterSheetProps> = ({
    visible, value, genreOptions, tagOptions, onApply, onClose,
}) => {
    const { colors } = useTheme();
    const { t, language } = useLanguage();
    const insets = useSafeAreaInsets();
    const { locked } = useFeature('premium_list_tools');
    const [draft, setDraft] = useState<AdvancedFilters>(value);

    useEffect(() => {
        if (visible) setDraft(value);
    }, [visible, value]);

    // Genre chips cycle: off -> include -> exclude -> off
    const cycleGenre = (genre: string) => {
        setDraft(d => {
            if (d.includeGenres.includes(genre)) {
                return { ...d, includeGenres: d.includeGenres.filter(g => g !== genre), excludeGenres: [...d.excludeGenres, genre] };
            }
            if (d.excludeGenres.includes(genre)) {
                return { ...d, excludeGenres: d.excludeGenres.filter(g => g !== genre) };
            }
            return { ...d, includeGenres: [...d.includeGenres, genre] };
        });
    };

    const toggleTag = (tag: string) =>
        setDraft(d => ({ ...d, tags: d.tags.includes(tag) ? d.tags.filter(x => x !== tag) : [...d.tags, tag] }));

    const renderRange = (
        label: string,
        min: number | null,
        max: number | null,
        onChange: (min: number | null, max: number | null) => void,
    ) => (
        <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.subtext }]}>{upperCase(label, language)}</Text>
            <View style={styles.rangeRow}>
                <TextInput
                    value={min?.toString() ?? ''}
                    onChangeText={text => onChange(toNumber(text), max)}
                    placeholder={t('listTools.min')}
                    placeholderTextColor={colors.subtext}
                    keyboardType="number-pad"
                    maxLength={4}
                    style={[styles.rangeInput, { color: colors.text, backgroundColor: colors.inputBg }]}
                />
                <Text style={{ color: colors.subtext }}>–</Text>
                <TextInput
                    value={max?.toString() ?? ''}
                    onChangeText={text => onChange(min, toNumber(text))}
                    placeholder={t('listTools.max')}
                    placeholderTextColor={colors.subtext}
                    keyboardType="number-pad"
                    maxLength={4}
                    style={[styles.rangeInput, { color: colors.text, backgroundColor: colors.inputBg }]}
                />
            </View>
        </View>
    );

    const chipStyle = (state: 'off' | 'on' | 'excluded') => [
        styles.chip,
        state === 'on' && { backgroundColor: colors.primary, borderColor: colors.primary },
        state === 'excluded' && { backgroundColor: 'rgba(239,68,68,0.15)', borderColor: '#EF4444' },
        state === 'off' && { borderColor: colors.border },
    ];
    const chipTextColor = (state: 'off' | 'on' | 'excluded') =>
        state === 'on' ? '#111827' : state === 'excluded' ? '#EF4444' : colors.text;

    const activeCount = countActiveFilters(draft);

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <Pressable style={styles.overlay} onPress={onClose} />
            <View style={[styles.sheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 16 }]}>
                <View style={styles.header}>
                    <Text style={[styles.title, { color: colors.text }]}>{t('listTools.filtersTitle')}</Text>
                    <TouchableOpacity onPress={onClose} accessibilityLabel={t('common.close')}>
                        <Ionicons name="close" size={24} color={colors.text} />
                    </TouchableOpacity>
                </View>

                <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
                    <PremiumGate feature="premium_list_tools" source="list_filters" description={t('listTools.filtersLocked')}>
                        {renderRange(t('listTools.year'), draft.yearMin, draft.yearMax, (yearMin, yearMax) => setDraft(d => ({ ...d, yearMin, yearMax })))}

                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: colors.subtext }]}>{upperCase(t('listTools.minScore'), language)}</Text>
                            <View style={styles.chips}>
                                {SCORE_OPTIONS.map(score => {
                                    const state = draft.minScore === score ? 'on' : 'off';
                                    return (
                                        <TouchableOpacity key={String(score)} style={chipStyle(state)} onPress={() => setDraft(d => ({ ...d, minScore: score }))}>
                                            <Text style={[styles.chipText, { color: chipTextColor(state) }]}>
                                                {score == null ? t('listTools.any') : `★ ${score}+`}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>

                        {renderRange(t('listTools.episodes'), draft.episodesMin, draft.episodesMax, (episodesMin, episodesMax) => setDraft(d => ({ ...d, episodesMin, episodesMax })))}

                        {genreOptions.length > 0 && (
                            <View style={styles.section}>
                                <Text style={[styles.sectionTitle, { color: colors.subtext }]}>{upperCase(t('listTools.genres'), language)}</Text>
                                <Text style={[styles.hint, { color: colors.subtext }]}>{t('listTools.genresHint')}</Text>
                                <View style={styles.chips}>
                                    {genreOptions.map(genre => {
                                        const state = draft.includeGenres.includes(genre) ? 'on' : draft.excludeGenres.includes(genre) ? 'excluded' : 'off';
                                        return (
                                            <TouchableOpacity key={genre} style={chipStyle(state)} onPress={() => cycleGenre(genre)}>
                                                {state === 'excluded' && <Ionicons name="remove-circle" size={13} color="#EF4444" />}
                                                <Text style={[styles.chipText, { color: chipTextColor(state) }]}>{genreLabel(t, genre)}</Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>
                        )}

                        {tagOptions.length > 0 && (
                            <View style={styles.section}>
                                <Text style={[styles.sectionTitle, { color: colors.subtext }]}>{upperCase(t('listTools.tags'), language)}</Text>
                                <View style={styles.chips}>
                                    {tagOptions.map(tag => {
                                        const state = draft.tags.includes(tag) ? 'on' : 'off';
                                        return (
                                            <TouchableOpacity key={tag} style={chipStyle(state)} onPress={() => toggleTag(tag)}>
                                                <Text style={[styles.chipText, { color: chipTextColor(state) }]}>#{tag}</Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>
                        )}
                    </PremiumGate>
                </ScrollView>

                <View style={styles.footer}>
                    <TouchableOpacity
                        style={[styles.secondaryButton, { borderColor: colors.border }]}
                        onPress={() => setDraft(EMPTY_FILTERS)}
                        disabled={locked}
                    >
                        <Text style={[styles.secondaryText, { color: colors.text }]}>{t('listTools.clear')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.primaryButton, { backgroundColor: colors.primary, opacity: locked ? 0.5 : 1 }]}
                        onPress={() => { onApply(draft); onClose(); }}
                        disabled={locked}
                    >
                        <Text style={styles.primaryText}>
                            {activeCount ? t('listTools.applyCount', { count: activeCount }) : t('listTools.apply')}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    sheet: {
        maxHeight: '85%',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingTop: 20,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        marginBottom: 8,
    },
    title: {
        fontFamily: 'Poppins_700Bold',
        fontSize: 18,
    },
    scroll: {
        paddingHorizontal: 20,
    },
    section: {
        marginTop: 16,
    },
    sectionTitle: {
        fontFamily: 'Poppins_700Bold',
        fontSize: 12,
        letterSpacing: 1,
        marginBottom: 8,
    },
    hint: {
        fontFamily: 'Poppins_500Medium',
        fontSize: 12,
        marginBottom: 8,
    },
    rangeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    rangeInput: {
        flex: 1,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 10,
        fontFamily: 'Poppins_500Medium',
        fontSize: 14,
    },
    chips: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        borderWidth: 1,
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    chipText: {
        fontFamily: 'Poppins_600SemiBold',
        fontSize: 12,
    },
    footer: {
        flexDirection: 'row',
        gap: 12,
        paddingHorizontal: 20,
        paddingTop: 16,
    },
    secondaryButton: {
        flex: 1,
        borderWidth: 1,
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: 'center',
    },
    secondaryText: {
        fontFamily: 'Poppins_600SemiBold',
        fontSize: 15,
    },
    primaryButton: {
        flex: 2,
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: 'center',
    },
    primaryText: {
        fontFamily: 'Poppins_700Bold',
        fontSize: 15,
        color: '#111827',
    },
});
