import { Platform } from 'react-native';
import i18n from './i18n';

type CalendarModule = typeof import('expo-calendar');

// Loaded defensively: a dev build made before expo-calendar was added has no native module,
// and the calendar tab must keep working there (the feature just hides itself).
let Calendar: CalendarModule | null = null;
try {
    Calendar = require('expo-calendar');
} catch {
    Calendar = null;
}

/**
 * Premium (Module 4): add an anime's airing time to the phone calendar.
 * Events use the device time zone; "remaining" adds one weekly recurring event that stops after
 * the show's last episode (when the total is known, otherwise 12 weeks).
 */

export const phoneCalendarSupported = !!Calendar;

export interface CalendarEpisode {
    title: string;
    episode: number;
    /** Unix seconds */
    airingAt: number;
    totalEpisodes: number | null;
}

export type AddToCalendarResult = 'added' | 'denied' | 'error';

const EVENT_MINUTES = 30;
const FALLBACK_WEEKS = 12;
const APP_CALENDAR_TITLE = 'MyAnimeDex';

/** iOS: the user's default calendar. Android: a writable primary calendar, or our own. */
const getWritableCalendarId = async (Calendar: CalendarModule): Promise<string> => {
    if (Platform.OS === 'ios') {
        const cal = await Calendar.getDefaultCalendarAsync();
        return cal.id;
    }
    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    const writable = calendars.filter(c => c.allowsModifications);
    const ours = writable.find(c => c.title === APP_CALENDAR_TITLE);
    const primary = writable.find(c => c.isPrimary);
    if (ours) return ours.id;
    if (primary) return primary.id;
    return Calendar.createCalendarAsync({
        title: APP_CALENDAR_TITLE,
        color: '#FACC15',
        entityType: Calendar.EntityTypes.EVENT,
        name: APP_CALENDAR_TITLE,
        ownerAccount: 'personal',
        accessLevel: Calendar.CalendarAccessLevel.OWNER,
        source: { isLocalAccount: true, name: APP_CALENDAR_TITLE, type: Calendar.SourceType.LOCAL },
    });
};

export const addEpisodeToCalendar = async (
    ep: CalendarEpisode,
    mode: 'single' | 'remaining',
): Promise<AddToCalendarResult> => {
    if (!Calendar) return 'error';
    try {
        const { status } = await Calendar.requestCalendarPermissionsAsync();
        if (status !== 'granted') return 'denied';

        const calendarId = await getWritableCalendarId(Calendar);
        const startDate = new Date(ep.airingAt * 1000);
        const endDate = new Date(startDate.getTime() + EVENT_MINUTES * 60 * 1000);
        const remaining = ep.totalEpisodes ? Math.max(1, ep.totalEpisodes - ep.episode + 1) : FALLBACK_WEEKS;

        await Calendar.createEventAsync(calendarId, {
            title: mode === 'single'
                ? i18n.t('calendarExport.eventTitleEpisode', { title: ep.title, ep: ep.episode })
                : i18n.t('calendarExport.eventTitleSeries', { title: ep.title }),
            startDate,
            endDate,
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            notes: i18n.t('calendarExport.eventNotes'),
            alarms: [{ relativeOffset: 0 }],
            ...(mode === 'remaining'
                ? { recurrenceRule: { frequency: Calendar.Frequency.WEEKLY, occurrence: remaining } }
                : {}),
        });
        return 'added';
    } catch (e) {
        console.warn('Add to calendar failed:', e);
        return 'error';
    }
};
