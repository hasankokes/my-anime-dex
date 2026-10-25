import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Linking,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthProvider';
import { useAppConfig } from '../../context/AppConfigProvider';
import { useFeature } from '../../hooks/usePremium';
import { PremiumGate } from '../../components/Premium/PremiumGate';
import { getDateFnsLocale } from '../../lib/dateUtils';
import { backfillListMetadata } from '../../lib/animeMetadata';
import { analytics } from '../../lib/analytics';
import {
    fetchAniListList,
    ImportEntry,
    ImportError,
    importEntries,
    ImportResult,
    parseMalXml,
    readMalExport,
    resolveMalEntries,
} from '../../services/importService';
import { exportList, ExportFormat } from '../../services/exportService';
import { BackupError, BackupInfo, backupService } from '../../services/backupService';

import { ThemedSwitch } from '../../components/ThemedSwitch';
const MAL_EXPORT_URL = 'https://myanimelist.net/panel.php?go=export';

// Loaded on demand: builds made before expo-document-picker was added have no native module,
// and importing it at startup would crash them
type DocumentPickerModule = typeof import('expo-document-picker');
const loadDocumentPicker = (): DocumentPickerModule | null => {
    try {
        return require('expo-document-picker');
    } catch {
        return null;
    }
};

export default function DataScreen() {
    const router = useRouter();
    const { colors } = useTheme();
    const { t, language } = useLanguage();
    const { user } = useAuth();
    const { config } = useAppConfig();
    const backup = useFeature('premium_backup');

    // --- Import ---
    const [overwrite, setOverwrite] = useState(false);
    const [aniListName, setAniListName] = useState('');
    const [importing, setImporting] = useState(false);
    const [progress, setProgress] = useState<string | null>(null);

    // --- Export / backup ---
    const [exporting, setExporting] = useState<ExportFormat | null>(null);
    const [backups, setBackups] = useState<BackupInfo[] | null>(null);
    const [backupBusy, setBackupBusy] = useState<string | null>(null);

    const loadBackups = useCallback(async () => {
        if (!user || !backup.enabled || backup.locked) return;
        try {
            setBackups(await backupService.list(user.id));
        } catch (e) {
            console.warn('Backups failed to load:', e);
            setBackups([]);
        }
    }, [user, backup.enabled, backup.locked]);

    useEffect(() => {
        loadBackups();
    }, [loadBackups]);

    const importErrorText = (e: unknown) => {
        if (e instanceof ImportError) return t(`dataTools.errors.${e.code}`);
        return t('dataTools.errors.network');
    };

    const showImportResult = (result: ImportResult) => {
        Alert.alert(
            t('dataTools.importDoneTitle'),
            t('dataTools.importDoneBody', { added: result.added, updated: result.updated, skipped: result.skipped, ratings: result.ratings }),
        );
    };

    const runImport = async (source: 'mal' | 'anilist', entries: ImportEntry[]) => {
        if (!user) return;
        setProgress(t('dataTools.saving', { done: 0, total: entries.length }));
        const result = await importEntries(user.id, entries, { overwrite }, (done, total) =>
            setProgress(t('dataTools.saving', { done, total })));
        analytics.track('list_imported', { source, entries: entries.length, added: result.added, updated: result.updated, ratings: result.ratings, overwrite });
        showImportResult(result);
        // Entries AniList couldn't resolve during the import get their genres/studios later
        backfillListMetadata(user.id).catch(() => { });
    };

    const importMal = async () => {
        if (!user || importing) return;
        const DocumentPicker = loadDocumentPicker();
        if (!DocumentPicker) {
            Alert.alert(t('common.error'), t('dataTools.updateApp'));
            return;
        }
        let picked: Awaited<ReturnType<DocumentPickerModule['getDocumentAsync']>>;
        try {
            picked = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
        } catch {
            Alert.alert(t('common.error'), t('dataTools.updateApp'));
            return;
        }
        if (picked.canceled || !picked.assets?.[0]) return;
        const asset = picked.assets[0];
        setImporting(true);
        try {
            setProgress(t('dataTools.reading'));
            const xml = await readMalExport(asset.uri, asset.name, (asset as any).file);
            const parsed = parseMalXml(xml);
            if (!parsed.length) throw new ImportError('invalid_file');
            const entries = await resolveMalEntries(parsed, (done, total) =>
                setProgress(t('dataTools.resolving', { done, total })));
            await runImport('mal', entries);
        } catch (e) {
            console.error('[Import] MAL failed:', e);
            analytics.track('list_import_failed', { source: 'mal', error: e instanceof ImportError ? e.code : 'unknown' });
            Alert.alert(t('common.error'), e instanceof ImportError ? importErrorText(e) : t('dataTools.errors.invalid_file'));
        } finally {
            setImporting(false);
            setProgress(null);
        }
    };

    const importAniList = async () => {
        if (!user || importing || !aniListName.trim()) return;
        setImporting(true);
        try {
            setProgress(t('dataTools.fetchingAniList'));
            const entries = await fetchAniListList(aniListName);
            await runImport('anilist', entries);
        } catch (e) {
            console.error('[Import] AniList failed:', e);
            analytics.track('list_import_failed', { source: 'anilist', error: e instanceof ImportError ? e.code : 'unknown' });
            Alert.alert(t('common.error'), importErrorText(e));
        } finally {
            setImporting(false);
            setProgress(null);
        }
    };

    const runExport = async (fmt: ExportFormat) => {
        if (!user || exporting) return;
        setExporting(fmt);
        try {
            const count = await exportList(user.id, fmt);
            analytics.track('list_exported', { format: fmt, entries: count });
        } catch (e) {
            console.error('[Export] failed:', e);
            Alert.alert(t('common.error'), t('dataTools.exportError'));
        } finally {
            setExporting(null);
        }
    };

    const backupErrorText = (e: unknown) =>
        e instanceof BackupError ? t(`dataTools.backupErrors.${e.code}`) : t('dataTools.backupErrors.failed');

    const createBackup = async () => {
        setBackupBusy('create');
        try {
            await backupService.create();
            analytics.track('backup_created');
            await loadBackups();
        } catch (e) {
            Alert.alert(t('common.error'), backupErrorText(e));
        } finally {
            setBackupBusy(null);
        }
    };

    const confirmRestore = (item: BackupInfo) => {
        Alert.alert(
            t('dataTools.restoreTitle'),
            t('dataTools.restoreBody', { date: formatDate(item.created_at), count: item.item_count }),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('dataTools.restore'),
                    style: 'destructive',
                    onPress: async () => {
                        setBackupBusy(item.id);
                        try {
                            const count = await backupService.restore(item.id);
                            analytics.track('backup_restored', { entries: count, kind: item.kind });
                            Alert.alert(t('dataTools.restoreDoneTitle'), t('dataTools.restoreDoneBody', { count }));
                            await loadBackups();
                        } catch (e) {
                            Alert.alert(t('common.error'), backupErrorText(e));
                        } finally {
                            setBackupBusy(null);
                        }
                    },
                },
            ],
        );
    };

    const formatDate = (iso: string) => format(new Date(iso), 'd MMM yyyy, HH:mm', { locale: getDateFnsLocale(language) });

    const sectionCard = { backgroundColor: colors.card, borderColor: colors.border };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton} accessibilityLabel={t('common.back')}>
                    <Ionicons name="chevron-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>{t('dataTools.title')}</Text>
                <View style={{ width: 36 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                {config.import && (
                    <View style={[styles.section, sectionCard]}>
                        <View style={styles.titleRow}>
                            <Ionicons name="cloud-download-outline" size={18} color={colors.primary} />
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('dataTools.importTitle')}</Text>
                        </View>
                        <Text style={[styles.muted, { color: colors.subtext }]}>{t('dataTools.importBody')}</Text>

                        <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={importMal} disabled={importing}>
                            <Ionicons name="document-outline" size={16} color="#111827" />
                            <Text style={styles.buttonText}>{t('dataTools.importMal')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => Linking.openURL(MAL_EXPORT_URL)}>
                            <Text style={[styles.link, { color: colors.primary }]}>{t('dataTools.malHelp')}</Text>
                        </TouchableOpacity>

                        <View style={[styles.inputRow, { backgroundColor: colors.inputBg }]}>
                            <TextInput
                                value={aniListName}
                                onChangeText={setAniListName}
                                placeholder={t('dataTools.aniListPlaceholder')}
                                placeholderTextColor={colors.subtext}
                                autoCapitalize="none"
                                autoCorrect={false}
                                style={[styles.input, { color: colors.text }]}
                                onSubmitEditing={importAniList}
                                returnKeyType="go"
                            />
                            <TouchableOpacity onPress={importAniList} disabled={importing || !aniListName.trim()}>
                                <Ionicons name="arrow-forward-circle" size={28} color={aniListName.trim() ? colors.primary : colors.border} />
                            </TouchableOpacity>
                        </View>
                        <Text style={[styles.hint, { color: colors.subtext }]}>{t('dataTools.aniListHint')}</Text>

                        <View style={styles.switchRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.switchLabel, { color: colors.text }]}>{t('dataTools.overwrite')}</Text>
                                <Text style={[styles.hint, { color: colors.subtext, marginTop: 2 }]}>{t('dataTools.overwriteHint')}</Text>
                            </View>
                            <ThemedSwitch
                                value={overwrite}
                                onValueChange={setOverwrite}
                            />
                        </View>

                        {progress && (
                            <View style={styles.progress}>
                                <ActivityIndicator size="small" color={colors.primary} />
                                <Text style={[styles.muted, { color: colors.subtext }]}>{progress}</Text>
                            </View>
                        )}
                    </View>
                )}

                {backup.enabled && (
                    <PremiumGate feature="premium_backup" source="data_screen" description={t('dataTools.locked')}>
                        <View style={styles.premiumSections}>
                            <View style={[styles.section, sectionCard]}>
                                <View style={styles.titleRow}>
                                    <Ionicons name="share-outline" size={18} color={colors.primary} />
                                    <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('dataTools.exportTitle')}</Text>
                                </View>
                                <Text style={[styles.muted, { color: colors.subtext }]}>{t('dataTools.exportBody')}</Text>
                                <View style={styles.buttonRow}>
                                    {(['csv', 'json'] as const).map(fmt => (
                                        <TouchableOpacity
                                            key={fmt}
                                            style={[styles.secondaryButton, { borderColor: colors.border }]}
                                            onPress={() => runExport(fmt)}
                                            disabled={!!exporting}
                                        >
                                            {exporting === fmt
                                                ? <ActivityIndicator size="small" color={colors.primary} />
                                                : <Text style={[styles.secondaryText, { color: colors.text }]}>{fmt.toUpperCase()}</Text>}
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            <View style={[styles.section, sectionCard]}>
                                <View style={styles.titleRow}>
                                    <Ionicons name="cloud-upload-outline" size={18} color={colors.primary} />
                                    <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('dataTools.backupTitle')}</Text>
                                </View>
                                <Text style={[styles.muted, { color: colors.subtext }]}>{t('dataTools.backupBody')}</Text>

                                <TouchableOpacity
                                    style={[styles.button, { backgroundColor: colors.primary }]}
                                    onPress={createBackup}
                                    disabled={!!backupBusy}
                                >
                                    {backupBusy === 'create'
                                        ? <ActivityIndicator size="small" color="#111827" />
                                        : <Text style={styles.buttonText}>{t('dataTools.backupNow')}</Text>}
                                </TouchableOpacity>

                                {backups === null ? (
                                    <ActivityIndicator color={colors.primary} style={{ marginTop: 12 }} />
                                ) : backups.length === 0 ? (
                                    <Text style={[styles.hint, { color: colors.subtext }]}>{t('dataTools.noBackups')}</Text>
                                ) : (
                                    backups.map(item => (
                                        <View key={item.id} style={[styles.backupRow, { borderTopColor: colors.border }]}>
                                            <View style={{ flex: 1 }}>
                                                <Text style={[styles.backupDate, { color: colors.text }]}>{formatDate(item.created_at)}</Text>
                                                <Text style={[styles.hint, { color: colors.subtext, marginTop: 0 }]}>
                                                    {t(`dataTools.kinds.${item.kind}`)} · {t('dataTools.entries', { count: item.item_count })}
                                                </Text>
                                            </View>
                                            <TouchableOpacity onPress={() => confirmRestore(item)} disabled={!!backupBusy} style={[styles.restoreButton, { borderColor: colors.border }]}>
                                                {backupBusy === item.id
                                                    ? <ActivityIndicator size="small" color={colors.primary} />
                                                    : <Text style={[styles.restoreText, { color: colors.text }]}>{t('dataTools.restore')}</Text>}
                                            </TouchableOpacity>
                                        </View>
                                    ))
                                )}
                            </View>
                        </View>
                    </PremiumGate>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1,
    },
    backButton: { width: 36 },
    headerTitle: { fontSize: 18, fontFamily: 'Poppins_700Bold' },
    content: { padding: 20, paddingBottom: 48, gap: 16 },
    premiumSections: { gap: 16 },
    section: { borderRadius: 16, borderWidth: 1, padding: 16 },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
    sectionTitle: { fontFamily: 'Poppins_700Bold', fontSize: 16 },
    muted: { fontFamily: 'Poppins_500Medium', fontSize: 13, lineHeight: 19 },
    hint: { fontFamily: 'Poppins_500Medium', fontSize: 12, marginTop: 8 },
    link: { fontFamily: 'Poppins_600SemiBold', fontSize: 12, marginTop: 8 },
    button: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        borderRadius: 12, paddingVertical: 12, marginTop: 14,
    },
    buttonText: { fontFamily: 'Poppins_700Bold', fontSize: 14, color: '#111827' },
    buttonRow: { flexDirection: 'row', gap: 12, marginTop: 14 },
    secondaryButton: { flex: 1, borderWidth: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
    secondaryText: { fontFamily: 'Poppins_700Bold', fontSize: 14 },
    inputRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 12, marginTop: 16 },
    input: { flex: 1, paddingVertical: 11, fontFamily: 'Poppins_500Medium', fontSize: 14 },
    switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16 },
    switchLabel: { fontFamily: 'Poppins_600SemiBold', fontSize: 14 },
    progress: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 },
    backupRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: 1, paddingTop: 12, marginTop: 12 },
    backupDate: { fontFamily: 'Poppins_600SemiBold', fontSize: 14 },
    restoreButton: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, minWidth: 90, alignItems: 'center' },
    restoreText: { fontFamily: 'Poppins_600SemiBold', fontSize: 13 },
});
