import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { upperCase } from '../../lib/textCase';
import { useAuth } from '../../context/AuthProvider';
import { useFeature } from '../../hooks/usePremium';
import { PremiumGate } from '../Premium/PremiumGate';
import {
    getReminderSettings,
    REMINDER_OFFSETS,
    REMINDER_SCOPES,
    ReminderScope,
    ReminderSettings,
    setReminderSettings,
} from '../../lib/reminderSettings';
import { syncEpisodeReminders } from '../../lib/episodeReminders';
import { getUtcOffsetString } from '../../lib/dateUtils';
import { analytics } from '../../lib/analytics';

/** Premium reminder options: which list entries are covered and how long after airing to notify. */
export const ReminderSettingsSheet: React.FC<{ visible: boolean; onClose: () => void }> = ({ visible, onClose }) => {
    const { colors } = useTheme();
    const { t, language } = useLanguage();
    const { user } = useAuth();
    const insets = useSafeAreaInsets();
    const { locked } = useFeature('premium_notifications');
    const [draft, setDraft] = useState<ReminderSettings | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (visible) getReminderSettings().then(setDraft);
    }, [visible]);

    const toggleScope = (scope: ReminderScope) => setDraft(d => {
        if (!d) return d;
        const has = d.scopes.includes(scope);
        // At least one scope stays selected
        if (has && d.scopes.length === 1) return d;
        return { ...d, scopes: has ? d.scopes.filter(s => s !== scope) : [...d.scopes, scope] };
    });

    const save = async () => {
        if (!draft) return;
        setSaving(true);
        await setReminderSettings(draft);
        await syncEpisodeReminders(user?.id, true);
        analytics.track('reminder_settings_saved', { scopes: draft.scopes, offset: draft.offsetMinutes });
        setSaving(false);
        onClose();
    };

    const chip = (active: boolean) => [
        styles.chip,
        active ? { backgroundColor: colors.primary, borderColor: colors.primary } : { borderColor: colors.border },
    ];

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <Pressable style={styles.overlay} onPress={onClose} />
            <View style={[styles.sheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 16 }]}>
                <View style={styles.header}>
                    <Text style={[styles.title, { color: colors.text }]}>{t('calendarExport.reminderSettings')}</Text>
                    <TouchableOpacity onPress={onClose} accessibilityLabel={t('common.close')}>
                        <Ionicons name="close" size={24} color={colors.text} />
                    </TouchableOpacity>
                </View>

                <PremiumGate feature="premium_notifications" source="reminder_settings" description={t('calendarExport.locked')}>
                    {!draft ? (
                        <ActivityIndicator color={colors.primary} style={{ marginVertical: 24 }} />
                    ) : (
                        <View style={styles.body}>
                            <Text style={[styles.sectionTitle, { color: colors.subtext }]}>{upperCase(t('calendarExport.scopeTitle'), language)}</Text>
                            <View style={styles.chips}>
                                {REMINDER_SCOPES.map(scope => {
                                    const active = draft.scopes.includes(scope);
                                    return (
                                        <TouchableOpacity key={scope} style={chip(active)} onPress={() => toggleScope(scope)} accessibilityRole="checkbox" accessibilityState={{ checked: active }}>
                                            <Text style={[styles.chipText, { color: active ? '#111827' : colors.text }]}>{t(`calendarExport.scopes.${scope}`)}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            <Text style={[styles.sectionTitle, { color: colors.subtext }]}>{upperCase(t('calendarExport.offsetTitle'), language)}</Text>
                            <View style={styles.chips}>
                                {REMINDER_OFFSETS.map(offset => {
                                    const active = draft.offsetMinutes === offset;
                                    return (
                                        <TouchableOpacity key={offset} style={chip(active)} onPress={() => setDraft(d => (d ? { ...d, offsetMinutes: offset } : d))} accessibilityRole="radio" accessibilityState={{ selected: active }}>
                                            <Text style={[styles.chipText, { color: active ? '#111827' : colors.text }]}>{t(`calendarExport.offsets.m${offset}`)}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            <Text style={[styles.hint, { color: colors.subtext }]}>
                                {t('calendarExport.timezoneHint', { tz: getUtcOffsetString() })}
                            </Text>
                        </View>
                    )}
                </PremiumGate>

                <TouchableOpacity
                    style={[styles.saveButton, { backgroundColor: colors.primary, opacity: locked || !draft ? 0.5 : 1 }]}
                    onPress={save}
                    disabled={locked || !draft || saving}
                >
                    {saving ? <ActivityIndicator color="#111827" /> : <Text style={styles.saveText}>{t('common.save')}</Text>}
                </TouchableOpacity>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
    sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 20, paddingHorizontal: 20 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
    title: { fontFamily: 'Poppins_700Bold', fontSize: 18 },
    body: { paddingBottom: 8 },
    sectionTitle: { fontFamily: 'Poppins_700Bold', fontSize: 12, letterSpacing: 1, marginTop: 16, marginBottom: 8 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
    chipText: { fontFamily: 'Poppins_600SemiBold', fontSize: 13 },
    hint: { fontFamily: 'Poppins_500Medium', fontSize: 12, marginTop: 16 },
    saveButton: { borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
    saveText: { fontFamily: 'Poppins_700Bold', fontSize: 15, color: '#111827' },
});
