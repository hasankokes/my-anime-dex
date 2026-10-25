import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { upperCase } from '../../lib/textCase';
import { useAuth } from '../../context/AuthProvider';
import { useCosmetics } from '../../context/CosmeticsProvider';
import { useFeature } from '../../hooks/usePremium';
import { supabase } from '../../lib/supabase';
import { TOP10_MAX, Top10Entry } from '../../lib/cosmetics';
import { PremiumGate } from '../../components/Premium/PremiumGate';

type ListRow = { anime_id: string; anime_title: string | null; anime_image: string | null };

/** Pick and order the profile "Top 10" from the user's own list. */
export default function Top10EditorScreen() {
    const router = useRouter();
    const { colors } = useTheme();
    const { t, language } = useLanguage();
    const { user } = useAuth();
    const { top10, saveTop10 } = useCosmetics();
    const { locked } = useFeature('premium_cosmetics');

    const [draft, setDraft] = useState<Top10Entry[]>(top10);
    const [rows, setRows] = useState<ListRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [query, setQuery] = useState('');

    useEffect(() => setDraft(top10), [top10]);

    useEffect(() => {
        if (!user) return;
        supabase
            .from('user_anime_list')
            .select('anime_id, anime_title, anime_image')
            .eq('user_id', user.id)
            .not('status', 'is', null)
            .order('anime_title')
            .then(({ data }) => {
                setRows((data ?? []) as ListRow[]);
                setLoading(false);
            });
    }, [user]);

    const picked = useMemo(() => new Set(draft.map(e => e.anime_id)), [draft]);
    const candidates = useMemo(() => {
        const q = query.trim().toLowerCase();
        return rows.filter(r => !picked.has(r.anime_id) && (!q || (r.anime_title ?? '').toLowerCase().includes(q)));
    }, [rows, picked, query]);

    const add = (row: ListRow) => {
        if (draft.length >= TOP10_MAX) {
            Alert.alert(t('cosmetics.top10Title'), t('cosmetics.top10Full', { max: TOP10_MAX }));
            return;
        }
        setDraft(d => [...d, { anime_id: row.anime_id, title: row.anime_title ?? '', image: row.anime_image }]);
    };

    const move = (index: number, delta: number) => {
        setDraft(d => {
            const next = [...d];
            const target = index + delta;
            if (target < 0 || target >= next.length) return d;
            [next[index], next[target]] = [next[target], next[index]];
            return next;
        });
    };

    const remove = (index: number) => setDraft(d => d.filter((_, i) => i !== index));

    const save = async () => {
        setSaving(true);
        const ok = await saveTop10(draft);
        setSaving(false);
        if (ok) router.back();
        else Alert.alert(t('common.error'), t('listTools.saveError'));
    };

    const dirty = JSON.stringify(draft) !== JSON.stringify(top10);

    const renderPicked = () => (
        <View style={styles.pickedList}>
            {draft.length === 0 && (
                <Text style={[styles.hint, { color: colors.subtext }]}>{t('cosmetics.top10Hint')}</Text>
            )}
            {draft.map((entry, index) => (
                <View key={entry.anime_id} style={[styles.pickedRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.rank, { color: colors.primary }]}>{index + 1}</Text>
                    <Image source={{ uri: entry.image || undefined }} style={[styles.thumb, { backgroundColor: colors.inputBg }]} />
                    <Text style={[styles.rowTitle, { color: colors.text }]} numberOfLines={2}>{entry.title}</Text>
                    <TouchableOpacity onPress={() => move(index, -1)} disabled={index === 0} style={styles.iconButton} accessibilityLabel={t('cosmetics.moveUp')}>
                        <Ionicons name="chevron-up" size={20} color={index === 0 ? colors.border : colors.text} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => move(index, 1)} disabled={index === draft.length - 1} style={styles.iconButton} accessibilityLabel={t('cosmetics.moveDown')}>
                        <Ionicons name="chevron-down" size={20} color={index === draft.length - 1 ? colors.border : colors.text} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => remove(index)} style={styles.iconButton} accessibilityLabel={t('cosmetics.remove')}>
                        <Ionicons name="close" size={20} color={colors.subtext} />
                    </TouchableOpacity>
                </View>
            ))}
        </View>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton} accessibilityLabel={t('common.back')}>
                    <Ionicons name="chevron-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>{t('cosmetics.top10Title')}</Text>
                <TouchableOpacity onPress={save} disabled={!dirty || saving || locked} style={styles.saveButton}>
                    {saving
                        ? <ActivityIndicator size="small" color={colors.primary} />
                        : <Text style={[styles.saveText, { color: dirty && !locked ? colors.primary : colors.subtext }]}>{t('common.save')}</Text>}
                </TouchableOpacity>
            </View>

            <PremiumGate feature="premium_cosmetics" source="top10" description={t('cosmetics.locked')} style={{ flex: 1 }}>
                <FlatList
                    data={candidates}
                    keyExtractor={item => item.anime_id}
                    contentContainerStyle={styles.content}
                    keyboardShouldPersistTaps="handled"
                    ListHeaderComponent={
                        <>
                            {renderPicked()}
                            <Text style={[styles.sectionTitle, { color: colors.subtext }]}>{upperCase(t('cosmetics.top10FromList'), language)}</Text>
                            <View style={[styles.search, { backgroundColor: colors.inputBg }]}>
                                <Ionicons name="search-outline" size={18} color={colors.subtext} />
                                <TextInput
                                    value={query}
                                    onChangeText={setQuery}
                                    placeholder={t('favorites.searchPlaceholder')}
                                    placeholderTextColor={colors.subtext}
                                    style={[styles.searchInput, { color: colors.text }]}
                                />
                            </View>
                            {loading && <ActivityIndicator color={colors.primary} style={{ marginTop: 16 }} />}
                        </>
                    }
                    renderItem={({ item }) => (
                        <TouchableOpacity style={styles.candidate} onPress={() => add(item)}>
                            <Image source={{ uri: item.anime_image || undefined }} style={[styles.thumb, { backgroundColor: colors.inputBg }]} />
                            <Text style={[styles.rowTitle, { color: colors.text }]} numberOfLines={2}>{item.anime_title}</Text>
                            <Ionicons name="add-circle" size={24} color={draft.length >= TOP10_MAX ? colors.border : colors.primary} />
                        </TouchableOpacity>
                    )}
                />
            </PremiumGate>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderBottomWidth: 1,
    },
    backButton: {
        width: 56,
    },
    headerTitle: {
        fontSize: 18,
        fontFamily: 'Poppins_700Bold',
    },
    saveButton: {
        width: 56,
        alignItems: 'flex-end',
    },
    saveText: {
        fontFamily: 'Poppins_700Bold',
        fontSize: 15,
    },
    content: {
        padding: 20,
        paddingBottom: 48,
    },
    pickedList: {
        gap: 8,
    },
    hint: {
        fontFamily: 'Poppins_500Medium',
        fontSize: 13,
    },
    pickedRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        borderWidth: 1,
        borderRadius: 14,
        padding: 8,
    },
    rank: {
        width: 22,
        textAlign: 'center',
        fontFamily: 'Poppins_700Bold',
        fontSize: 16,
    },
    thumb: {
        width: 36,
        height: 50,
        borderRadius: 6,
    },
    rowTitle: {
        flex: 1,
        fontFamily: 'Poppins_600SemiBold',
        fontSize: 13,
    },
    iconButton: {
        padding: 4,
    },
    sectionTitle: {
        fontFamily: 'Poppins_700Bold',
        fontSize: 12,
        letterSpacing: 1,
        marginTop: 24,
        marginBottom: 10,
    },
    search: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        borderRadius: 12,
        paddingHorizontal: 12,
        marginBottom: 8,
    },
    searchInput: {
        flex: 1,
        paddingVertical: 10,
        fontFamily: 'Poppins_500Medium',
        fontSize: 14,
    },
    candidate: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 8,
    },
});
