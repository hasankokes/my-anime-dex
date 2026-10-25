import { useCallback, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { analytics } from '../lib/analytics';
import { getRank, rankIndex } from '../lib/levelSystem';

const key = (userId: string) => `level-seen:${userId}`;

/**
 * Remembers the last level the user saw and reports a level-up once.
 * XP is recomputed server-side, so this is checked whenever the profile is (re)loaded.
 */
export function useLevelUp() {
    const [celebration, setCelebration] = useState<{ level: number; rankUp: boolean } | null>(null);

    const check = useCallback(async (userId: string, level: number) => {
        try {
            const stored = await AsyncStorage.getItem(key(userId));
            await AsyncStorage.setItem(key(userId), String(level));
            // First run on this device: just remember the level, nothing to celebrate
            if (stored === null) return;
            const previous = parseInt(stored, 10) || 1;
            if (level <= previous) return;
            const rankUp = rankIndex(level) > rankIndex(previous);
            setCelebration({ level, rankUp });
            analytics.track('level_up_shown', { level, rank: getRank(level).id, rank_up: rankUp });
        } catch {
            // Storage unavailable: skip the celebration
        }
    }, []);

    const dismiss = useCallback(() => setCelebration(null), []);

    return { celebration, check, dismiss };
}
