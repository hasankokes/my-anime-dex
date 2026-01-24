// Helper to get current date as JST "Face Value" date object (safe for iOS)
export const getCurrentJSTDate = () => {
    const now = new Date();
    const utcMs = now.getTime(); // UTC Timestamp
    const jstOffsetMs = 9 * 60 * 60 * 1000;
    const jstTimeVirtual = new Date(utcMs + jstOffsetMs);

    // Construct "Face Value" date in Local System Time
    // safe for comparison with other "Face Value" dates
    return new Date(
        jstTimeVirtual.getUTCFullYear(),
        jstTimeVirtual.getUTCMonth(),
        jstTimeVirtual.getUTCDate(),
        jstTimeVirtual.getUTCHours(),
        jstTimeVirtual.getUTCMinutes(),
        jstTimeVirtual.getUTCSeconds()
    );
};

// Helper to calculate next broadcast date
export const getNextBroadcastDate = (anime: any) => {
    if (!anime.broadcast || !anime.broadcast.time || !anime.broadcast.day) return null;

    const [hours, minutes] = anime.broadcast.time.split(':').map(Number);

    const dayMap: { [key: string]: number } = {
        'Sundays': 0, 'Mondays': 1, 'Tuesdays': 2, 'Wednesdays': 3,
        'Thursdays': 4, 'Fridays': 5, 'Saturdays': 6,
        'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
        'Thursday': 4, 'Friday': 5, 'Saturday': 6
    };

    const broadcastDayStr = anime.broadcast.day;
    let broadcastDay = dayMap[broadcastDayStr];
    if (broadcastDay === undefined) {
        return null;
    }

    // Logic from CalendarAnimeCard.tsx:
    const jstNow = getCurrentJSTDate();

    // We need jstHours/Minutes for the "has it aired today?" check
    const jstHours = jstNow.getHours();
    const jstMinutes = jstNow.getMinutes();

    const currentDayJST = jstNow.getDay();

    let dayDiff = broadcastDay - currentDayJST;
    if (dayDiff < 0) dayDiff += 7;

    // If today is the day, check if time has passed
    if (dayDiff === 0) {
        if (jstHours > hours || (jstHours === hours && jstMinutes >= minutes)) {
            dayDiff = 7; // Next week
        }
    }

    // Construct the target date (JST Face Value)
    const targetJST = new Date(jstNow);
    targetJST.setDate(jstNow.getDate() + dayDiff);
    targetJST.setHours(hours, minutes, 0, 0);

    return targetJST;
};

/**
 * Converts the anime broadcast time (JST) to the user's local Date object.
 * Adjusts for the JST (UTC+9) offset.
 */
export const getBroadcastDateObj = (anime: any): Date | null => {
    const targetJST = getNextBroadcastDate(anime);
    if (!targetJST) return null;

    // Formula: RealUTC = TimestampOfFaceValue + LocalOffset - JSTOffset
    // targetJST.getTime() is UTC timestamp of the Face Value date (interpreted in Local Time)
    // LocalOffset converts FaceValue-as-Local to True-UTC
    // JSTOffset shifts the True-UTC (which was actually JST-FaceValue) back to the actual Event-UTC.

    const jstOffsetMs = 9 * 60 * 60 * 1000;
    const localOffsetMs = -targetJST.getTimezoneOffset() * 60 * 1000;

    const realUtcTime = targetJST.getTime() + localOffsetMs - jstOffsetMs;

    return new Date(realUtcTime);
};

export const getUtcOffsetString = (date: Date = new Date()): string => {
    const offset = date.getTimezoneOffset();
    if (offset === 0) return 'UTC';

    const sign = offset < 0 ? '+' : '-';
    const absOffset = Math.abs(offset);
    const hours = Math.floor(absOffset / 60);
    const minutes = absOffset % 60;

    if (minutes === 0) {
        return `UTC${sign}${hours}`;
    }
    return `UTC${sign}${hours}:${minutes}`;
};
