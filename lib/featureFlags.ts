// Server-controlled switches and tunables, read from the Supabase `app_config` table
// (key -> jsonb value) by AppConfigProvider. The defaults below apply until the table
// has been fetched once, when it is unreachable, or when a key is missing there.

export type FeatureFlag =
    | 'premium_stats'
    | 'premium_cosmetics'
    | 'premium_smart_recs'
    | 'premium_notifications'
    | 'premium_list_tools'
    | 'premium_backup'
    | 'content_cards'
    | 'import';

export type AppConfig = Record<FeatureFlag, boolean> & {
    /** Rated anime (reviews) needed before the premium "For you" layer is shown */
    smart_recs_min_rated: number;
};

// Every premium module starts switched off so a build never exposes a half-shipped module;
// flip them on from the app_config table as each module is released.
export const DEFAULT_APP_CONFIG: AppConfig = {
    premium_stats: false,
    premium_cosmetics: false,
    premium_smart_recs: false,
    premium_notifications: false,
    premium_list_tools: false,
    premium_backup: false,
    content_cards: false,
    import: false,
    smart_recs_min_rated: 5,
};

/** Merges raw `app_config` rows over the defaults, ignoring unknown keys and wrongly typed values. */
export const parseAppConfig = (rows: { key: string; value: unknown }[]): AppConfig => {
    const config: AppConfig = { ...DEFAULT_APP_CONFIG };
    for (const { key, value } of rows) {
        if (!(key in DEFAULT_APP_CONFIG)) continue;
        const k = key as keyof AppConfig;
        if (typeof value === typeof DEFAULT_APP_CONFIG[k]) {
            (config as Record<string, unknown>)[k] = value;
        }
    }
    return config;
};
