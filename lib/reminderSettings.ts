import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Premium episode-reminder options (Module 4). Free reminders always cover favorites and fire
 * when the episode airs; premium users choose which list entries are covered and a delay
 * (e.g. to wait for subs). Stored on the device next to the on/off switch.
 */

export type ReminderScope = 'favorites' | 'watching' | 'plan_to_watch';
export type ReminderOffset = 0 | 15 | 60;

export interface ReminderSettings {
    scopes: ReminderScope[];
    offsetMinutes: ReminderOffset;
}

export const REMINDER_SCOPES: ReminderScope[] = ['favorites', 'watching', 'plan_to_watch'];
export const REMINDER_OFFSETS: ReminderOffset[] = [0, 15, 60];

export const FREE_REMINDER_SETTINGS: ReminderSettings = { scopes: ['favorites'], offsetMinutes: 0 };

const KEY = 'episode-reminder-settings-v1';

export const getReminderSettings = async (): Promise<ReminderSettings> => {
    try {
        const raw = await AsyncStorage.getItem(KEY);
        if (!raw) return FREE_REMINDER_SETTINGS;
        const parsed = JSON.parse(raw);
        const scopes = Array.isArray(parsed?.scopes)
            ? parsed.scopes.filter((s: unknown): s is ReminderScope => REMINDER_SCOPES.includes(s as ReminderScope))
            : [];
        const offset = REMINDER_OFFSETS.includes(parsed?.offsetMinutes) ? parsed.offsetMinutes : 0;
        return { scopes: scopes.length ? scopes : FREE_REMINDER_SETTINGS.scopes, offsetMinutes: offset };
    } catch {
        return FREE_REMINDER_SETTINGS;
    }
};

export const setReminderSettings = async (settings: ReminderSettings) => {
    await AsyncStorage.setItem(KEY, JSON.stringify(settings));
};
