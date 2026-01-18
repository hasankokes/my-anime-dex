
// Helper to calculate next broadcast date
export const getNextBroadcastDate = (anime: any) => {
    if (!anime.broadcast || !anime.broadcast.time || !anime.broadcast.day) return null;

    const now = new Date();
    const [hours, minutes] = anime.broadcast.time.split(':').map(Number);

    const dayMap: { [key: string]: number } = {
        'Sundays': 0, 'Mondays': 1, 'Tuesdays': 2, 'Wednesdays': 3,
        'Thursdays': 4, 'Fridays': 5, 'Saturdays': 6,
        'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
        'Thursday': 4, 'Friday': 5, 'Saturday': 6
    };

    // Normalize day string (Jikan v4 usually gives "Mondays")
    // But map handles both "Mondays" and strict "Monday" if we want.
    const broadcastDayStr = anime.broadcast.day;
    // Jikan usually returns "Mondays".

    // Check if day exists in map
    let broadcastDay = dayMap[broadcastDayStr];
    if (broadcastDay === undefined) {
        // Try removing 's' if not found? Or just simple map is enough if we cover Jikan's output.
        return null;
    }

    // JST conversion logic
    // We want the broadcast time in LOCAL equivalent?
    // The previous logic calculated a "Target Date" object that REPRESENTS the moment in time.
    // It used "face value" logic mixed with real time differences.
    // Let's stick to the previous logic which seemed to work for display.

    // Logic from CalendarAnimeCard.tsx:
    const jstNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
    const currentDayJST = jstNow.getDay();

    let dayDiff = broadcastDay - currentDayJST;
    if (dayDiff < 0) dayDiff += 7;

    // If today is the day (`dayDiff === 0`), checking if time has passed
    if (dayDiff === 0) {
        const jstHours = jstNow.getHours();
        const jstMinutes = jstNow.getMinutes();
        if (jstHours > hours || (jstHours === hours && jstMinutes >= minutes)) {
            dayDiff = 7; // Next week
        }
    }

    // Construct the target date (JST Face Value)
    const targetJST = new Date(jstNow);
    targetJST.setDate(jstNow.getDate() + dayDiff);
    targetJST.setHours(hours, minutes, 0, 0);

    // This targetJST is "The date object where .toString() looks like the JST time"
    // Ideally we want a wrapper that returns the true UTC timestamp for correct sorting across boundaries?
    // Wait, `jstNow` is constructed by parsing a string. So `jstNow.getTime()` is actually offset by the timezone shift relative to real UTC if not careful.
    // BUT, both `jstNow` and `targetJST` are in the SAME "fake" reference frame (Browser Local Time pretending to be JST).
    // So the difference `targetJST.getTime() - jstNow.getTime()` is the correct DELTA stats.
    // And `targetJST.getTime()` maintains relative order.
    // So sorting by `targetJST.getTime()` is valid.

    return targetJST;
};
