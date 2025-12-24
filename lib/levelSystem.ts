export type Rank = {
    name: string;
    color: string;
    colorHex: string;
    minLevel: number;
    maxLevel: number | null;
    borderWidth: number;
};

export const RANKS: Rank[] = [
    {
        name: 'BRONZE',
        color: 'text-orange-700', // Tailwind class fallback if needed
        colorHex: '#CD7F32',
        minLevel: 1,
        maxLevel: 3,
        borderWidth: 3,
    },
    {
        name: 'SILVER',
        color: 'text-gray-400',
        colorHex: '#C0C0C0',
        minLevel: 3,
        maxLevel: 5,
        borderWidth: 4,
    },
    {
        name: 'GOLD',
        color: 'text-yellow-400',
        colorHex: '#FFD700',
        minLevel: 5,
        maxLevel: 8,
        borderWidth: 5,
    },
    {
        name: 'PLATINUM',
        color: 'text-cyan-400',
        colorHex: '#E5E4E2', // Platinum color
        minLevel: 8,
        maxLevel: 12,
        borderWidth: 6,
    },
    {
        name: 'DIAMOND',
        color: 'text-blue-400',
        colorHex: '#B9F2FF',
        minLevel: 12,
        maxLevel: null, // No max level
        borderWidth: 8,
    },
];

export const getRank = (level: number): Rank => {
    const rank = RANKS.find(
        (r) => level >= r.minLevel && (r.maxLevel === null || level < r.maxLevel)
    );
    return rank || RANKS[0];
};

export const getNextLevelXp = (level: number): number => {
    if (level < 10) {
        // Current logic: Levels 1-9 require 30 XP each?
        // Based on profile.tsx logic:
        // "Levels 1-10: 30 points per level." (Conversation hist)
        // "Levels 10-100: 50 points per level."
        return 30;
    } else {
        return 50;
    }
};

export const calculateLevelFromXp = (totalXp: number): number => {
    // This is a bit complex because the XP curve changes.
    // We need a way to reverse map total XP to Level.
    // Levels 1-10 (exclusive of 10? let's follow getLevelProgress logic from profile.tsx)

    // From profile.tsx:
    // if level < 10: requiredXp = 30. previousLevelXp = (level - 1) * 30.
    // Level 1: 0-30 XP
    // Level 2: 30-60 XP
    // ...
    // Level 9: 240-270 XP
    // Level 10 starts at 270 XP.

    // if level >= 10:
    // previousLevelXp = 270 + (level - 10) * 50

    if (totalXp < 270) {
        // In the 1-9 range (assuming Level 1 starts at 0)
        // totalXp = (level - 1) * 30 + currentProgress
        // We can just divide by 30 and add 1.
        return Math.floor(totalXp / 30) + 1;
    } else {
        // Level 10+
        // totalXp = 270 + (level - 10) * 50 + currentProgress
        // totalXp - 270 = (level - 10) * 50
        const xpAboveLevel10 = totalXp - 270;
        const additionalLevels = Math.floor(xpAboveLevel10 / 50);
        return 10 + additionalLevels;
    }
};

export const getLevelProgress = (xp: number, level: number) => {
    // Use the logic from profile.tsx but standardized
    let requiredXp = 30;
    let previousLevelXp = 0;

    if (level < 10) {
        previousLevelXp = (level - 1) * 30;
        requiredXp = 30;
    } else {
        previousLevelXp = 270 + (level - 10) * 50;
        requiredXp = 50;
    }

    const currentLevelProgress = xp - previousLevelXp;
    // Ensure we don't go below 0 or above 1 (though logic should hold)
    const percent = Math.min(Math.max(currentLevelProgress / requiredXp, 0), 1);

    return {
        current: currentLevelProgress,
        total: requiredXp,
        percent,
    };
};
