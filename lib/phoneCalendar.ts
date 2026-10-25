// Web / fallback: the phone calendar is native-only (see phoneCalendar.native.ts).

export const phoneCalendarSupported = false;

export interface CalendarEpisode {
    title: string;
    episode: number;
    /** Unix seconds */
    airingAt: number;
    totalEpisodes: number | null;
}

export type AddToCalendarResult = 'added' | 'denied' | 'error';

export const addEpisodeToCalendar = async (
    _ep: CalendarEpisode,
    _mode: 'single' | 'remaining',
): Promise<AddToCalendarResult> => 'error';
