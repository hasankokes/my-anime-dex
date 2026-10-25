// Web / fallback: local notifications are native-only (see episodeReminders.native.ts).

export const remindersSupported = false;

export const getRemindersEnabled = async (): Promise<boolean> => false;

export const syncEpisodeReminders = async (_userId: string | null | undefined, _premium = false): Promise<void> => {};

export const enableEpisodeReminders = async (_userId: string, _premium = false): Promise<'enabled' | 'denied'> => 'denied';

export const disableEpisodeReminders = async (): Promise<void> => {};

export const addReminderOpenListener = (_onOpen: (animeId: number) => void) => () => {};
