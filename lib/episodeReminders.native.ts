import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import i18n from './i18n';
import { getUpcomingEpisodes } from '../services/anilistApi';
import { FREE_REMINDER_SETTINGS, getReminderSettings } from './reminderSettings';

/**
 * Local "new episode" notifications for the user's favorites.
 * Nothing is stored server-side: on every sync we cancel our scheduled notifications
 * and schedule the next airing episode of each favorite again from AniList data.
 *
 * Premium (Module 4): the user picks which list entries are covered (favorites / watching /
 * plan to watch) and a delay after airing; the next 2 episodes per show are scheduled so a
 * week without opening the app still gets its reminders.
 */

const ENABLED_KEY = 'episode-reminders-enabled';
const CHANNEL_ID = 'episodes';
const NOTIFICATION_TYPE = 'episode';
// iOS keeps at most 64 pending local notifications per app
const MAX_SCHEDULED = 60;
// Only the next ~week is scheduled; later episodes get picked up by later syncs
const HORIZON_SECONDS = 8 * 24 * 60 * 60;

export const remindersSupported = true;

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

let channelReady: Promise<void> | null = null;
const ensureChannel = () => {
    if (Platform.OS !== 'android') return Promise.resolve();
    channelReady ??= Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: 'Episode reminders',
        importance: Notifications.AndroidImportance.DEFAULT,
    }).then(() => undefined);
    return channelReady;
};

export const getRemindersEnabled = async (): Promise<boolean> => {
    try {
        return (await AsyncStorage.getItem(ENABLED_KEY)) === '1';
    } catch {
        return false;
    }
};

const cancelEpisodeReminders = async () => {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
        scheduled
            .filter(n => n.content.data?.type === NOTIFICATION_TYPE)
            .map(n => Notifications.cancelScheduledNotificationAsync(n.identifier))
    );
};

let syncInFlight: Promise<void> | null = null;

/**
 * Re-schedules reminders for the signed-in user's favorites (or clears them when off / signed out).
 * `premium` turns on the user's premium reminder settings.
 */
export const syncEpisodeReminders = (userId: string | null | undefined, premium = false): Promise<void> => {
    // Coalesce overlapping calls (app foreground + calendar focus can fire together)
    syncInFlight ??= (async () => {
        try {
            const enabled = await getRemindersEnabled();
            if (!enabled || !userId) {
                await cancelEpisodeReminders();
                return;
            }
            const { status } = await Notifications.getPermissionsAsync();
            if (status !== 'granted') return;

            const settings = premium ? await getReminderSettings() : FREE_REMINDER_SETTINGS;
            const statuses = settings.scopes.filter(s => s !== 'favorites');
            const filters = [
                ...(settings.scopes.includes('favorites') ? ['is_favorite.eq.true'] : []),
                ...(statuses.length ? [`status.in.(${statuses.join(',')})`] : []),
            ];

            const { data, error } = await supabase
                .from('user_anime_list')
                .select('anime_id')
                .eq('user_id', userId)
                .or(filters.join(','));
            if (error) throw error;

            const ids = [...new Set((data || []).map(row => Number(row.anime_id)).filter(Boolean))];
            const episodes = ids.length ? await getUpcomingEpisodes(ids, premium ? 2 : 1) : [];

            const now = Math.floor(Date.now() / 1000);
            const offset = settings.offsetMinutes * 60;
            const upcoming = episodes
                .map(ep => ({ ...ep, fireAt: ep.airingAt + offset }))
                .filter(ep => ep.fireAt > now + 60 && ep.fireAt < now + HORIZON_SECONDS)
                .sort((a, b) => a.fireAt - b.fireAt)
                .slice(0, MAX_SCHEDULED);

            await ensureChannel();
            await cancelEpisodeReminders();
            for (const ep of upcoming) {
                await Notifications.scheduleNotificationAsync({
                    content: {
                        title: ep.title,
                        body: i18n.t('calendar.reminderBody', { ep: ep.episode }),
                        data: { type: NOTIFICATION_TYPE, animeId: ep.animeId },
                    },
                    trigger: {
                        type: Notifications.SchedulableTriggerInputTypes.DATE,
                        date: new Date(ep.fireAt * 1000),
                        channelId: CHANNEL_ID,
                    },
                });
            }
        } catch (e) {
            console.warn('Episode reminder sync failed:', e);
        } finally {
            syncInFlight = null;
        }
    })();
    return syncInFlight;
};

/** Asks for permission if needed and turns reminders on. */
export const enableEpisodeReminders = async (userId: string, premium = false): Promise<'enabled' | 'denied'> => {
    let { status, canAskAgain } = await Notifications.getPermissionsAsync();
    if (status !== 'granted' && canAskAgain) {
        await ensureChannel(); // Android 13+ only shows the prompt once a channel exists
        ({ status } = await Notifications.requestPermissionsAsync());
    }
    if (status !== 'granted') return 'denied';

    await AsyncStorage.setItem(ENABLED_KEY, '1');
    await syncEpisodeReminders(userId, premium);
    return 'enabled';
};

export const disableEpisodeReminders = async () => {
    await AsyncStorage.removeItem(ENABLED_KEY);
    await cancelEpisodeReminders();
};

/** Calls `onOpen(animeId)` when the user taps an episode reminder (incl. the one that launched the app). */
export const addReminderOpenListener = (onOpen: (animeId: number) => void) => {
    const handle = (response: Notifications.NotificationResponse | null) => {
        const data = response?.notification.request.content.data;
        if (data?.type === NOTIFICATION_TYPE && data.animeId) onOpen(Number(data.animeId));
    };
    const last = Notifications.getLastNotificationResponse();
    if (last) {
        handle(last);
        Notifications.clearLastNotificationResponse();
    }
    const sub = Notifications.addNotificationResponseReceivedListener(handle);
    return () => sub.remove();
};
