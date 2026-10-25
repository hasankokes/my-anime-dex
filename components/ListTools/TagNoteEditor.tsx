import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { supabase } from '../../lib/supabase';
import { analytics } from '../../lib/analytics';
import { distinctValues, MAX_NOTE_LENGTH, MAX_TAG_LENGTH, MAX_TAGS, normalizeTag } from '../../lib/listFilters';

interface Entry {
    id: string;
    user_id: string;
    anime_id: string;
    tags?: string[] | null;
    notes?: string | null;
}

interface TagNoteEditorProps {
    entry: Entry;
    onSaved: (entry: any) => void;
}

const MAX_SUGGESTIONS = 10;

/** Premium: personal tags and a private note on a list entry (anime detail screen). */
export const TagNoteEditor: React.FC<TagNoteEditorProps> = ({ entry, onSaved }) => {
    const { colors } = useTheme();
    const { t } = useLanguage();
    const tags = useMemo(() => entry.tags ?? [], [entry.tags]);
    const [tagInput, setTagInput] = useState('');
    const [note, setNote] = useState(entry.notes ?? '');
    const [savingTags, setSavingTags] = useState(false);
    const [savingNote, setSavingNote] = useState(false);
    const [knownTags, setKnownTags] = useState<string[]>([]);

    useEffect(() => setNote(entry.notes ?? ''), [entry.notes]);

    // The user's other tags, offered as one-tap suggestions
    useEffect(() => {
        supabase
            .from('user_anime_list')
            .select('tags')
            .eq('user_id', entry.user_id)
            .not('tags', 'eq', '{}')
            .then(({ data }) => setKnownTags(distinctValues((data ?? []).map(r => r.tags))));
    }, [entry.user_id]);

    const suggestions = knownTags.filter(tag => !tags.includes(tag)).slice(0, MAX_SUGGESTIONS);

    const save = async (patch: { tags?: string[]; notes?: string | null }) => {
        const { data, error } = await supabase
            .from('user_anime_list')
            .update(patch)
            .eq('id', entry.id)
            .select()
            .single();
        if (error) {
            console.error('List tools save failed:', error);
            Alert.alert(t('common.error'), t(error.code === '42501' ? 'listTools.premiumRequired' : 'listTools.saveError'));
            return false;
        }
        onSaved(data);
        return true;
    };

    const setTags = async (next: string[]) => {
        setSavingTags(true);
        const ok = await save({ tags: next });
        setSavingTags(false);
        if (ok) {
            analytics.track('list_tags_updated', { anime_id: entry.anime_id, tag_count: next.length });
            setKnownTags(prev => distinctValues([prev, next]));
        }
    };

    const addTag = (raw: string) => {
        const tag = normalizeTag(raw);
        setTagInput('');
        if (!tag || tags.includes(tag)) return;
        if (tags.length >= MAX_TAGS) {
            Alert.alert(t('listTools.title'), t('listTools.tagLimit', { max: MAX_TAGS }));
            return;
        }
        setTags([...tags, tag]);
    };

    const saveNote = async () => {
        setSavingNote(true);
        const trimmed = note.trim();
        const ok = await save({ notes: trimmed ? trimmed : null });
        setSavingNote(false);
        if (ok) analytics.track('list_note_updated', { anime_id: entry.anime_id, has_note: !!trimmed });
    };

    const noteDirty = note.trim() !== (entry.notes ?? '').trim();

    return (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.titleRow}>
                <Ionicons name="pricetags" size={16} color={colors.primary} />
                <Text style={[styles.title, { color: colors.text }]}>{t('listTools.title')}</Text>
                {savingTags && <ActivityIndicator size="small" color={colors.primary} />}
            </View>

            <View style={styles.chips}>
                {tags.map(tag => (
                    <TouchableOpacity
                        key={tag}
                        style={[styles.chip, { backgroundColor: colors.primary, borderColor: colors.primary }]}
                        onPress={() => setTags(tags.filter(x => x !== tag))}
                        disabled={savingTags}
                        accessibilityLabel={t('listTools.removeTag', { tag })}
                    >
                        <Text style={styles.chipTextActive}>{tag}</Text>
                        <Ionicons name="close" size={14} color="#111827" />
                    </TouchableOpacity>
                ))}
            </View>

            <View style={[styles.inputRow, { backgroundColor: colors.inputBg }]}>
                <TextInput
                    value={tagInput}
                    onChangeText={setTagInput}
                    onSubmitEditing={() => addTag(tagInput)}
                    placeholder={t('listTools.addTagPlaceholder')}
                    placeholderTextColor={colors.subtext}
                    maxLength={MAX_TAG_LENGTH}
                    returnKeyType="done"
                    style={[styles.input, { color: colors.text }]}
                />
                <TouchableOpacity onPress={() => addTag(tagInput)} disabled={!normalizeTag(tagInput) || savingTags}>
                    <Ionicons name="add-circle" size={26} color={normalizeTag(tagInput) ? colors.primary : colors.border} />
                </TouchableOpacity>
            </View>

            {suggestions.length > 0 && (
                <View style={[styles.chips, { marginTop: 10 }]}>
                    {suggestions.map(tag => (
                        <TouchableOpacity
                            key={tag}
                            style={[styles.chip, { borderColor: colors.border }]}
                            onPress={() => addTag(tag)}
                            disabled={savingTags}
                        >
                            <Ionicons name="add" size={14} color={colors.subtext} />
                            <Text style={[styles.chipText, { color: colors.text }]}>{tag}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            )}

            <Text style={[styles.label, { color: colors.subtext }]}>{t('listTools.noteLabel')}</Text>
            <TextInput
                value={note}
                onChangeText={setNote}
                placeholder={t('listTools.notePlaceholder')}
                placeholderTextColor={colors.subtext}
                multiline
                maxLength={MAX_NOTE_LENGTH}
                style={[styles.noteInput, { color: colors.text, backgroundColor: colors.inputBg }]}
                textAlignVertical="top"
            />
            <View style={styles.noteFooter}>
                <Text style={[styles.counter, { color: colors.subtext }]}>{note.length}/{MAX_NOTE_LENGTH}</Text>
                {noteDirty && (
                    <TouchableOpacity
                        style={[styles.saveButton, { backgroundColor: colors.primary }]}
                        onPress={saveNote}
                        disabled={savingNote}
                    >
                        {savingNote
                            ? <ActivityIndicator size="small" color="#111827" />
                            : <Text style={styles.saveText}>{t('common.save')}</Text>}
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        borderRadius: 16,
        borderWidth: 1,
        padding: 16,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    title: {
        flex: 1,
        fontFamily: 'Poppins_600SemiBold',
        fontSize: 16,
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
        paddingHorizontal: 10,
        paddingVertical: 5,
    },
    chipText: {
        fontFamily: 'Poppins_500Medium',
        fontSize: 12,
    },
    chipTextActive: {
        fontFamily: 'Poppins_600SemiBold',
        fontSize: 12,
        color: '#111827',
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        paddingHorizontal: 12,
        marginTop: 10,
    },
    input: {
        flex: 1,
        fontFamily: 'Poppins_500Medium',
        fontSize: 14,
        paddingVertical: 10,
    },
    label: {
        fontFamily: 'Poppins_600SemiBold',
        fontSize: 13,
        marginTop: 16,
        marginBottom: 8,
    },
    noteInput: {
        minHeight: 90,
        borderRadius: 12,
        padding: 12,
        fontFamily: 'Poppins_500Medium',
        fontSize: 14,
    },
    noteFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 8,
    },
    counter: {
        fontFamily: 'Poppins_500Medium',
        fontSize: 11,
    },
    saveButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 10,
        minWidth: 70,
        alignItems: 'center',
    },
    saveText: {
        fontFamily: 'Poppins_700Bold',
        fontSize: 13,
        color: '#111827',
    },
});
