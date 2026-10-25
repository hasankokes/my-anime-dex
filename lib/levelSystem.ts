import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

/*
 * Level curve and XP sources live in Supabase (calculate_level / calculate_user_xp,
 * see supabase/migrations/20261025120000_level_system_v2.sql). The client only
 * mirrors the curve to draw progress; keep XP_PER_LEVEL_STEP in sync with it.
 *
 * Going from level L to L+1 costs XP_PER_LEVEL_STEP * L XP.
 */
export const XP_PER_LEVEL_STEP = 5;

export type RankId = 'rookie' | 'viewer' | 'otaku' | 'senpai' | 'sensei' | 'legend' | 'kami';

export type Rank = {
    id: RankId;
    icon: ComponentProps<typeof Ionicons>['name'];
    /** Main accent: text, icon, progress fill. Readable on both light and dark cards. */
    colorHex: string;
    /** Gradient for badges, avatar rings and the progress bar. */
    gradient: readonly [string, string, ...string[]];
    minLevel: number;
    borderWidth: number;
};

export const RANKS: readonly Rank[] = [
    { id: 'rookie', icon: 'leaf', colorHex: '#22C55E', gradient: ['#86EFAC', '#16A34A'], minLevel: 1, borderWidth: 2 },
    { id: 'viewer', icon: 'eye', colorHex: '#0EA5E9', gradient: ['#7DD3FC', '#0284C7'], minLevel: 3, borderWidth: 3 },
    { id: 'otaku', icon: 'flame', colorHex: '#F97316', gradient: ['#FDBA74', '#EA580C'], minLevel: 6, borderWidth: 3 },
    { id: 'senpai', icon: 'flash', colorHex: '#8B5CF6', gradient: ['#C4B5FD', '#7C3AED'], minLevel: 10, borderWidth: 4 },
    { id: 'sensei', icon: 'shield', colorHex: '#EC4899', gradient: ['#F9A8D4', '#E11D48'], minLevel: 15, borderWidth: 4 },
    { id: 'legend', icon: 'diamond', colorHex: '#06B6D4', gradient: ['#67E8F9', '#8B5CF6', '#A855F7'], minLevel: 25, borderWidth: 5 },
    { id: 'kami', icon: 'sparkles', colorHex: '#EAB308', gradient: ['#FDE047', '#FACC15', '#F97316', '#EC4899'], minLevel: 40, borderWidth: 6 },
];

/** How each action earns XP (display only; the server is the source of truth). */
export const XP_SOURCES: readonly { key: string; icon: Rank['icon']; xp: number }[] = [
    { key: 'completed', icon: 'checkmark-done', xp: 5 },
    { key: 'watching', icon: 'play', xp: 2 },
    { key: 'planned', icon: 'bookmark', xp: 1 },
    { key: 'favorite', icon: 'heart', xp: 1 },
    { key: 'review', icon: 'chatbubble-ellipses', xp: 5 },
    { key: 'arena', icon: 'trophy', xp: 2 },
    { key: 'list', icon: 'list', xp: 3 },
];

export const rankIndex = (level: number): number => {
    for (let i = RANKS.length - 1; i >= 0; i--) {
        if (level >= RANKS[i].minLevel) return i;
    }
    return 0;
};

export const getRank = (level: number): Rank => RANKS[rankIndex(level)];

export const getNextRank = (level: number): Rank | null => RANKS[rankIndex(level) + 1] ?? null;

/** Total XP needed to reach `level`. */
export const xpForLevel = (level: number): number =>
    (XP_PER_LEVEL_STEP * Math.max(level, 1) * (Math.max(level, 1) - 1)) / 2;

export const calculateLevelFromXp = (totalXp: number): number => {
    if (!totalXp || totalXp <= 0) return 1;
    let level = Math.floor((5 + Math.sqrt(25 + 40 * totalXp)) / 10);
    while (level > 1 && xpForLevel(level) > totalXp) level--;
    while (xpForLevel(level + 1) <= totalXp) level++;
    return Math.max(level, 1);
};

export const getLevelProgress = (xp: number, level?: number) => {
    // The level is derived from XP so the bar never disagrees with the curve
    const lvl = level && xpForLevel(level) <= xp && xp < xpForLevel(level + 1) ? level : calculateLevelFromXp(xp);
    const start = xpForLevel(lvl);
    const total = xpForLevel(lvl + 1) - start;
    const current = Math.max(xp - start, 0);
    return {
        level: lvl,
        current,
        total,
        remaining: total - current,
        percent: Math.min(Math.max(current / total, 0), 1),
    };
};

/** XP still needed for the next rank, or null at the top rank. */
export const xpToNextRank = (xp: number, level: number): number | null => {
    const next = getNextRank(level);
    return next ? Math.max(xpForLevel(next.minLevel) - xp, 0) : null;
};
