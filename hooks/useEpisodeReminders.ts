import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthProvider';
import { analytics } from '../lib/analytics';
import { addReminderOpenListener, syncEpisodeReminders } from '../lib/episodeReminders';
import { useFeature } from './usePremium';

const FOREGROUND_SYNC_INTERVAL = 15 * 60 * 1000;

/**
 * Keeps episode reminders in sync with the user's favorites (sign-in/out and app foreground)
 * and opens the anime page when a reminder is tapped. Mount once inside the navigator.
 */
export function useEpisodeReminders() {
    const { user } = useAuth();
    const router = useRouter();
    const lastSyncRef = useRef(0);
    const userId = user?.id;
    const notifications = useFeature('premium_notifications');
    // Premium reminder settings apply only once the entitlement is known
    const premium = notifications.enabled && !notifications.locked;

    useEffect(() => {
        if (!notifications.isReady) return;
        lastSyncRef.current = Date.now();
        syncEpisodeReminders(userId, premium);

        const sub = AppState.addEventListener('change', state => {
            if (state !== 'active' || Date.now() - lastSyncRef.current < FOREGROUND_SYNC_INTERVAL) return;
            lastSyncRef.current = Date.now();
            syncEpisodeReminders(userId, premium);
        });
        return () => sub.remove();
    }, [userId, premium, notifications.isReady]);

    useEffect(() => addReminderOpenListener(animeId => {
        analytics.track('calendar_reminder_opened');
        router.push(`/anime/${animeId}`);
    }), [router]);
}
