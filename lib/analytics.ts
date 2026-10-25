import AsyncStorage from '@react-native-async-storage/async-storage';
import PostHog from 'posthog-react-native';
import type { User } from '@supabase/supabase-js';

// Product analytics (PostHog). One place for the client, the event catalog and the
// app-wide properties, so screens only call `analytics.track('event', {...})`.
//
// - Guests get an anonymous id; identify() on sign-in merges their guest journey into the user.
// - Lifecycle events (Application Installed / Opened / Backgrounded) come from the SDK and carry
//   `$screen_name`, so "where did they leave" is the screen on Application Backgrounded.
// - Disabled when EXPO_PUBLIC_POSTHOG_KEY is missing, and in dev unless EXPO_PUBLIC_POSTHOG_DEV=1.
// - Never send emails, names or free text (search queries are reduced to their length).

const API_KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY;
const HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com';
const ENABLED = !!API_KEY && (!__DEV__ || process.env.EXPO_PUBLIC_POSTHOG_DEV === '1');

export const posthog: PostHog | null = API_KEY
    ? new PostHog(API_KEY, {
        host: HOST,
        disabled: !ENABLED,
        captureAppLifecycleEvents: true,
        personProfiles: 'always',
        flushAt: 20,
        flushInterval: 10000,
    })
    : null;

export type AnalyticsEvent =
    // Journey
    | 'first_open'
    | 'session_summary'
    // Onboarding walkthrough
    | 'walkthrough_started'
    | 'walkthrough_step_viewed'
    | 'walkthrough_completed'
    | 'walkthrough_skipped'
    // Auth funnel
    | 'auth_wall_hit'
    | 'login_viewed'
    | 'login_method_selected'
    | 'signup_submitted'
    | 'login_failed'
    | 'login_dismissed'
    | 'signup_completed'
    | 'login_completed'
    | 'logout'
    | 'password_reset_requested'
    // Core anime actions
    | 'anime_viewed'
    | 'anime_load_failed'
    | 'anime_list_status_changed'
    | 'anime_favorited'
    | 'anime_unfavorited'
    | 'anime_episode_progress'
    | 'anime_trailer_played'
    | 'review_submitted'
    | 'review_deleted'
    // Discovery
    | 'search_performed'
    | 'search_result_clicked'
    | 'home_section_clicked'
    | 'dice_rolled'
    | 'discover_loaded'
    | 'discover_item_clicked'
    | 'discover_item_saved'
    | 'discover_item_hidden'
    | 'discover_filter_changed'
    | 'discover_genres_saved'
    | 'discover_tab_changed'
    | 'smart_recs_loaded'
    | 'smart_rec_rejected'
    | 'season_picks_loaded'
    | 'calendar_day_changed'
    | 'calendar_reminders_toggled'
    | 'calendar_reminder_opened'
    | 'calendar_view_changed'
    | 'calendar_event_added'
    | 'reminder_settings_saved'
    // Lists
    | 'list_created'
    | 'list_deleted'
    | 'list_item_added'
    | 'list_item_removed'
    | 'list_shared'
    | 'list_collaborator_added'
    | 'list_tags_updated'
    | 'list_note_updated'
    | 'list_filters_applied'
    | 'list_imported'
    | 'list_import_failed'
    | 'list_exported'
    | 'backup_created'
    | 'backup_restored'
    // Arena
    | 'arena_setup_started'
    | 'arena_game_started'
    | 'arena_game_completed'
    | 'arena_game_abandoned'
    | 'arena_result_shared'
    // Profile / account
    | 'profile_edited'
    | 'stats_viewed'
    | 'stats_card_updated'
    | 'progress_reset'
    | 'rank_ladder_viewed'
    | 'level_up_shown'
    | 'account_deleted'
    // Settings
    | 'language_changed'
    | 'theme_changed'
    | 'appearance_viewed'
    | 'cosmetic_selected'
    | 'top10_saved'
    // Monetization
    | 'paywall_viewed'
    | 'paywall_dismissed'
    | 'paywall_plan_selected'
    | 'premium_gate_viewed'
    | 'premium_gate_tapped'
    | 'trial_reminder_scheduled'
    | 'purchase_started'
    | 'purchase_completed'
    | 'purchase_cancelled'
    | 'purchase_failed'
    | 'restore_completed'
    | 'restore_failed'
    | 'ad_shown'
    | 'ad_failed'
    | 'review_requested'
    | 'review_store_opened'
    // Content cards
    | 'content_card_viewed'
    | 'content_card_dismissed'
    | 'content_card_cta'
    | 'poll_voted'
    | 'beta_signed_up';

type Props = Record<string, string | number | boolean | null | undefined | string[]>;

const FIRST_OPEN_KEY = 'analytics_first_open_at';
const OPEN_COUNT_KEY = 'analytics_open_count';

const DAY_MS = 24 * 60 * 60 * 1000;

let firstOpenAt: number | null = null;
let identifiedUserId: string | null = null;
let lastScreenKey: string | null = null;

// In-memory session stats, flushed as `session_summary` when the app goes to background
const session = {
    startedAt: Date.now(),
    screens: 0,
    uniqueScreens: new Set<string>(),
    animeViewed: 0,
    actions: 0,
    lastScreen: null as string | null,
    previousScreen: null as string | null,
};

// The reason of the last auth wall a guest hit, attached to the sign-up/login that follows it
let pendingAuthReason: string | null = null;

const clean = (props?: Props) => {
    if (!props) return undefined;
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(props)) {
        if (v !== undefined) out[k] = v;
    }
    return out;
};

// Events that are pure navigation/system noise do not count as "actions" in session_summary
const PASSIVE_EVENTS = new Set<AnalyticsEvent>([
    'first_open', 'session_summary', 'walkthrough_step_viewed', 'login_viewed',
    'paywall_viewed', 'ad_shown', 'ad_failed', 'review_requested', 'anime_viewed', 'anime_load_failed',
]);

export const analytics = {
    enabled: ENABLED,

    track(event: AnalyticsEvent, props?: Props) {
        if (!PASSIVE_EVENTS.has(event)) session.actions += 1;
        if (event === 'anime_viewed') session.animeViewed += 1;
        if (__DEV__ && !ENABLED) console.log('[analytics]', event, props ?? '');
        posthog?.capture(event, clean(props));
    },

    screen(name: string, props?: Props) {
        // The same path twice in a row is a re-render or redirect, not a new screen view
        const key = `${name}|${props?.path ?? ''}`;
        if (key === lastScreenKey) return;
        lastScreenKey = key;
        session.screens += 1;
        session.uniqueScreens.add(name);
        if (session.lastScreen !== name) session.previousScreen = session.lastScreen;
        session.lastScreen = name;
        if (__DEV__ && !ENABLED) console.log('[analytics] screen', name, props ?? '');
        posthog?.screen(name, clean(props));
    },

    /** Called once at startup: first-open detection and the per-device super properties. */
    async init() {
        try {
            const [storedFirst, storedCount] = await Promise.all([
                AsyncStorage.getItem(FIRST_OPEN_KEY),
                AsyncStorage.getItem(OPEN_COUNT_KEY),
            ]);
            const now = Date.now();
            const isFirstOpen = !storedFirst;
            firstOpenAt = storedFirst ? Number(storedFirst) : now;
            const openCount = (Number(storedCount) || 0) + 1;

            await AsyncStorage.multiSet([
                [FIRST_OPEN_KEY, String(firstOpenAt)],
                [OPEN_COUNT_KEY, String(openCount)],
            ]);

            await registerDeviceProps(openCount);

            if (isFirstOpen) {
                analytics.track('first_open');
                posthog?.setPersonProperties(undefined, { first_open_at: new Date(firstOpenAt).toISOString() }, false);
            }
        } catch {
            // analytics must never break the app
        }
    },

    /** App-wide properties that change at runtime (sent with every event). */
    setContext(props: Props) {
        const cleaned = clean(props);
        if (!cleaned) return;
        posthog?.register(cleaned);
        posthog?.setPersonProperties(cleaned, undefined, false);
    },

    /** Links the current (guest) device id to the Supabase user, merging the guest journey. */
    identify(user: User) {
        if (identifiedUserId === user.id) return;
        identifiedUserId = user.id;
        posthog?.identify(user.id, {
            $set: {
                auth_provider: user.app_metadata?.provider ?? 'email',
            },
            $set_once: {
                signed_up_at: user.created_at,
            },
        });
    },

    /** Sign-out: forget the user and start a fresh anonymous id, keeping device properties. */
    async reset() {
        if (!identifiedUserId) return;
        identifiedUserId = null;
        posthog?.reset();
        const count = Number(await AsyncStorage.getItem(OPEN_COUNT_KEY).catch(() => null)) || 1;
        await registerDeviceProps(count);
    },

    /** The screen the user came from, e.g. to see which screen leads to anime detail views. */
    previousScreen() {
        return session.previousScreen;
    },

    setPendingAuthReason(reason: string | null) {
        pendingAuthReason = reason;
    },

    takePendingAuthReason() {
        const r = pendingAuthReason;
        pendingAuthReason = null;
        return r;
    },

    /** Summary of the foreground session that just ended (app went to background). */
    endSession() {
        const durationS = Math.round((Date.now() - session.startedAt) / 1000);
        if (durationS >= 1) {
            analytics.track('session_summary', {
                duration_s: durationS,
                screens_viewed: session.screens,
                unique_screens: session.uniqueScreens.size,
                anime_viewed: session.animeViewed,
                actions: session.actions,
                exit_screen: session.lastScreen,
                bounced: session.actions === 0 && session.uniqueScreens.size <= 1,
            });
        }
        posthog?.flush();
    },

    /** Sends queued events now (before sign-out or anything that may end the app session). */
    async flushNow() {
        try {
            await posthog?.flush();
        } catch {
            // ignore
        }
    },

    startSession() {
        session.startedAt = Date.now();
        session.screens = 0;
        session.uniqueScreens = new Set();
        session.animeViewed = 0;
        session.actions = 0;
        // keep lastScreen: the app resumes on it
        if (firstOpenAt) {
            posthog?.register({ days_since_first_open: Math.floor((Date.now() - firstOpenAt) / DAY_MS) });
        }
    },
};

async function registerDeviceProps(openCount: number) {
    if (!firstOpenAt) return;
    await posthog?.register({
        app_open_number: openCount,
        days_since_first_open: Math.floor((Date.now() - firstOpenAt) / DAY_MS),
        first_open_date: new Date(firstOpenAt).toISOString().slice(0, 10),
    });
}

/** Search queries are never sent as text, only their shape. */
export const queryShape = (q: string) => ({ query_length: q.trim().length });
