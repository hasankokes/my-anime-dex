import { useCallback } from 'react';
import { Alert, Linking } from 'react-native';
import { useLanguage } from '../context/LanguageContext';
import { useFeature } from './usePremium';
import { addEpisodeToCalendar, CalendarEpisode, phoneCalendarSupported } from '../lib/phoneCalendar';
import { analytics } from '../lib/analytics';

/**
 * "Add to phone calendar" (premium, Module 4): asks single episode vs. remaining weekly episodes,
 * handles the permission prompt and reports the result. Non-premium users get the paywall.
 * `available` is false when the module is off or the platform has no calendar (web).
 */
export const useAddToCalendar = (source: string) => {
    const { t } = useLanguage();
    const feature = useFeature('premium_notifications');

    const add = useCallback((ep: CalendarEpisode) => {
        if (feature.locked) {
            feature.unlock(source);
            return;
        }
        const run = async (mode: 'single' | 'remaining') => {
            const result = await addEpisodeToCalendar(ep, mode);
            analytics.track('calendar_event_added', { mode, result, source });
            if (result === 'added') {
                Alert.alert(t('calendarExport.addedTitle'), t('calendarExport.addedBody'));
            } else if (result === 'denied') {
                Alert.alert(t('calendarExport.deniedTitle'), t('calendarExport.deniedBody'), [
                    { text: t('common.cancel'), style: 'cancel' },
                    { text: t('calendar.openSettings'), onPress: () => Linking.openSettings() },
                ]);
            } else {
                Alert.alert(t('common.error'), t('calendarExport.error'));
            }
        };
        Alert.alert(t('calendarExport.chooseTitle'), ep.title, [
            { text: t('calendarExport.thisEpisode', { ep: ep.episode }), onPress: () => run('single') },
            { text: t('calendarExport.remaining'), onPress: () => run('remaining') },
            { text: t('common.cancel'), style: 'cancel' },
        ]);
    }, [feature, source, t]);

    return { available: feature.enabled && phoneCalendarSupported, add };
};
