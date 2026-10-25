import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { upperCase } from '../../lib/textCase';
import { countSmartFilters, DISCOVER_GENRES, EMPTY_SMART_FILTERS, SmartFilters } from '../../services/recommendationService';
import { genreLabel } from './discoverText';

interface Props {
    visible: boolean;
    value: SmartFilters;
    onApply: (filters: SmartFilters) => void;
    onClose: () => void;
}

const STATUSES: SmartFilters['status'][] = ['any', 'finished', 'releasing'];

const toNumber = (text: string): number | null => {
    const n = parseInt(text.replace(/[^0-9]/g, ''), 10);
    return Number.isFinite(n) && n > 0 ? n : null;
};

/** Premium "For you" filters: genres in/out, episode count, year range, finished/airing. */
export const SmartFilterSheet: React.FC<Props> = ({ visible, value, onApply, onClose }) => {
    const { colors } = useTheme();
    const { t, language } = useLanguage();
    const insets = useSafeAreaInsets();
    const [draft, setDraft] = useState<SmartFilters>(value);

    useEffect(() => {
        if (visible) setDraft(value);
    }, [visible, value]);

    const cycleGenre = (genre: string) => setDraft(d => {
        if (d.includeGenres.includes(genre)) {
            return { ...d, includeGenres: d.includeGenres.filter(g => g !== genre), excludeGenres: [...d.excludeGenres, genre] };
        }
        if (d.excludeGenres.includes(genre)) return { ...d, excludeGenres: d.excludeGenres.filter(g => g !== genre) };
        return { ...d, includeGenres: [...d.includeGenres, genre] };
    });

    const chip = (state: 'off' | 'on' | 'excluded') => [
        styles.chip,
        state === 'on' && { backgroundColor: colors.primary, borderColor: colors.primary },
        state === 'excluded' && { backgroundColor: 'rgba(239,68,68,0.15)', borderColor: '#EF4444' },
        state === 'off' && { borderColor: colors.border },
    ];
    const chipColor = (state: 'off' | 'on' | 'excluded') =>
        state === 'on' ? '#111827' : state === 'excluded' ? '#EF4444' : colors.text;

    const range = (label: string, min: number | null, max: number | null, set: (min: number | null, max: number | null) => void) => (
        <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.subtext }]}>{upperCase(label, language)}</Text>
            <View style={styles.rangeRow}>
                <TextInput
                    value={min?.toString() ?? ''}
                    onChangeText={text => set(toNumber(text), max)}
                    placeholder={t('listTools.min')}
                    placeholderTextColor={colors.subtext}
                    keyboardType="number-pad"
                    maxLength={4}
                    style={[styles.rangeInput, { color: colors.text, backgroundColor: colors.inputBg }]}
                />
                <Text style={{ color: colors.subtext }}>–</Text>
                <TextInput
                    value={max?.toString() ?? ''}
                    onChangeText={text => set(min, toNumber(text))}
                    placeholder={t('listTools.max')}
                    placeholderTextColor={colors.subtext}
                    keyboardType="number-pad"
                    maxLength={4}
                    style={[styles.rangeInput, { color: colors.text, backgroundColor: colors.inputBg }]}
                />
            </View>
        </View>
    );

    const active = countSmartFilters(draft);

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
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: colors.subtext }]}>{upperCase(t('listTools.genres'), language)}</Text>
                        <Text style={[styles.hint, { color: colors.subtext }]}>{t('listTools.genresHint')}</Text>
                        <View style={styles.chips}>
                            {DISCOVER_GENRES.map(genre => {
                                const state = draft.includeGenres.includes(genre) ? 'on' : draft.excludeGenres.includes(genre) ? 'excluded' : 'off';
                                return (
                                    <TouchableOpacity key={genre} style={chip(state)} onPress={() => cycleGenre(genre)}>
                                        {state === 'excluded' && <Ionicons name="remove-circle" size={13} color="#EF4444" />}
                                        <Text style={[styles.chipText, { color: chipColor(state) }]}>{genreLabel(t, genre)}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>

                    {range(t('listTools.episodes'), draft.episodesMin, draft.episodesMax, (episodesMin, episodesMax) => setDraft(d => ({ ...d, episodesMin, episodesMax })))}
                    {range(t('listTools.year'), draft.yearMin, draft.yearMax, (yearMin, yearMax) => setDraft(d => ({ ...d, yearMin, yearMax })))}

                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: colors.subtext }]}>{upperCase(t('smartRecs.statusTitle'), language)}</Text>
                        <View style={styles.chips}>
                            {STATUSES.map(status => {
                                const state = draft.status === status ? 'on' : 'off';
                                return (
                                    <TouchableOpacity key={status} style={chip(state)} onPress={() => setDraft(d => ({ ...d, status }))}>
                                        <Text style={[styles.chipText, { color: chipColor(state) }]}>{t(`smartRecs.status.${status}`)}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>
                </ScrollView>
                <View style={styles.footer}>
                    <TouchableOpacity style={[styles.secondary, { borderColor: colors.border }]} onPress={() => setDraft(EMPTY_SMART_FILTERS)}>
                        <Text style={[styles.secondaryText, { color: colors.text }]}>{t('listTools.clear')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.primary, { backgroundColor: colors.primary }]} onPress={() => { onApply(draft); onClose(); }}>
                        <Text style={styles.primaryText}>{active ? t('listTools.applyCount', { count: active }) : t('listTools.apply')}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
    sheet: { maxHeight: '85%', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 20 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 8 },
    title: { fontFamily: 'Poppins_700Bold', fontSize: 18 },
    scroll: { paddingHorizontal: 20 },
    section: { marginTop: 16 },
    sectionTitle: { fontFamily: 'Poppins_700Bold', fontSize: 12, letterSpacing: 1, marginBottom: 8 },
    hint: { fontFamily: 'Poppins_500Medium', fontSize: 12, marginBottom: 8 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
    chipText: { fontFamily: 'Poppins_600SemiBold', fontSize: 12 },
    rangeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    rangeInput: { flex: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontFamily: 'Poppins_500Medium', fontSize: 14 },
    footer: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingTop: 16 },
    secondary: { flex: 1, borderWidth: 1, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
    secondaryText: { fontFamily: 'Poppins_600SemiBold', fontSize: 15 },
    primary: { flex: 2, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
    primaryText: { fontFamily: 'Poppins_700Bold', fontSize: 15, color: '#111827' },
});
