import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PurchasesEntitlementInfo } from 'react-native-purchases';
import i18n from './i18n';
import { analytics } from './analytics';

/**
 * Local "your free trial ends tomorrow" notification.
 * Re-synced from every CustomerInfo update: scheduled 24h before a trial's expiration,
 * cancelled once the trial converts, is cancelled, or the user signs out.
 */

const NOTIFICATION_TYPE = 'trial-ending';
const CHANNEL_ID = 'account';
const SCHEDULED_FOR_KEY = 'trial-reminder-scheduled-for';
const LEAD_MS = 24 * 60 * 60 * 1000;

const cancelTrialReminder = async () => {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
        scheduled
            .filter(n => n.content.data?.type === NOTIFICATION_TYPE)
            .map(n => Notifications.cancelScheduledNotificationAsync(n.identifier))
    );
    await AsyncStorage.removeItem(SCHEDULED_FOR_KEY);
};

export const syncTrialReminder = async (entitlement: PurchasesEntitlementInfo | null | undefined) => {
    try {
        const trialEnd = entitlement?.isActive && entitlement.periodType === 'TRIAL' && entitlement.willRenew
            ? entitlement.expirationDate
            : null;
        const fireAt = trialEnd ? new Date(trialEnd).getTime() - LEAD_MS : 0;

        if (!trialEnd || fireAt <= Date.now()) {
            await cancelTrialReminder();
            return;
        }
        // Already scheduled for this exact trial
        if ((await AsyncStorage.getItem(SCHEDULED_FOR_KEY)) === trialEnd) return;

        // Asks only if never asked: the user just started a trial, so the prompt has context
        let { status } = await Notifications.getPermissionsAsync();
        if (status === 'undetermined') status = (await Notifications.requestPermissionsAsync()).status;
        if (status !== 'granted') return;

        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
                name: 'Account',
                importance: Notifications.AndroidImportance.DEFAULT,
            });
        }

        await cancelTrialReminder();
        await Notifications.scheduleNotificationAsync({
            content: {
                title: i18n.t('subscription.trialReminderTitle'),
                body: i18n.t('subscription.trialReminderBody'),
                data: { type: NOTIFICATION_TYPE },
            },
            trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DATE,
                date: new Date(fireAt),
                channelId: CHANNEL_ID,
            },
        });
        await AsyncStorage.setItem(SCHEDULED_FOR_KEY, trialEnd);
        analytics.track('trial_reminder_scheduled');
    } catch (e) {
        console.warn('Trial reminder sync failed:', e);
    }
};
