import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';
import { Linking, Platform } from 'react-native';
import { analytics } from './analytics';

/**
 * Store review prompt. Calls the native in-app review dialog directly (no custom pre-prompt,
 * per App Store 5.6.1 / Google Play in-app review guidelines) at positive moments only.
 * The OS decides whether the dialog actually appears (iOS: max 3 per year), so we keep our
 * own limits loose and simply avoid asking too early or too often.
 */

export type ReviewTrigger = 'list_add' | 'completed' | 'arena_win';

const STORAGE_KEY = 'reviewPrompt_state';
const LEGACY_KEYS = ['rateUs_addCount', 'rateUs_hasRated'];

const DAY_MS = 24 * 60 * 60 * 1000;
const COOLDOWN_MS = 60 * DAY_MS; // between two requests
const MAX_REQUESTS = 3; // lifetime, per device
const MIN_LIST_ADDS = 3; // plain list adds needed before the first ask
const SHOW_DELAY_MS = 1200; // let the UI settle (toast, button state) before the dialog

const IOS_REVIEW_URL = 'https://apps.apple.com/app/id6758043488?action=write-review';
const ANDROID_REVIEW_URL = 'market://details?id=com.myanimedex.app';
const ANDROID_WEB_URL = 'https://play.google.com/store/apps/details?id=com.myanimedex.app';

type State = { positiveActions: number; lastRequestAt: number; requestCount: number };

const readState = async (): Promise<State> => {
    try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) return JSON.parse(raw);
    } catch { }
    return { positiveActions: 0, lastRequestAt: 0, requestCount: 0 };
};

let requesting = false;

/**
 * Records a positive action and asks for a review when it is a good moment.
 * Completing an anime or winning an arena counts as a strong signal and can ask right away;
 * plain list adds need a few repetitions first.
 */
export const maybeRequestReview = async (trigger: ReviewTrigger) => {
    if (Platform.OS === 'web' || requesting) return;
    try {
        const state = await readState();
        state.positiveActions += 1;

        const strong = trigger === 'completed' || trigger === 'arena_win';
        const due =
            state.requestCount < MAX_REQUESTS &&
            Date.now() - state.lastRequestAt >= COOLDOWN_MS &&
            (strong || state.positiveActions >= MIN_LIST_ADDS);

        if (!due || !(await StoreReview.hasAction())) {
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
            return;
        }

        requesting = true;
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
            positiveActions: 0,
            lastRequestAt: Date.now(),
            requestCount: state.requestCount + 1,
        }));
        AsyncStorage.multiRemove(LEGACY_KEYS).catch(() => { });

        setTimeout(async () => {
            try {
                await StoreReview.requestReview();
                analytics.track('review_requested', { trigger, request_count: state.requestCount + 1 });
            } catch { } finally {
                requesting = false;
            }
        }, SHOW_DELAY_MS);
    } catch {
        requesting = false;
    }
};

/** Manual "Rate the app" entry: opens the store's write-a-review page. */
export const openStoreReviewPage = async () => {
    analytics.track('review_store_opened');
    try {
        if (Platform.OS === 'ios') {
            await Linking.openURL(IOS_REVIEW_URL);
        } else if (Platform.OS === 'android') {
            await Linking.openURL(ANDROID_REVIEW_URL).catch(() => Linking.openURL(ANDROID_WEB_URL));
        } else {
            await Linking.openURL(ANDROID_WEB_URL);
        }
    } catch { }
};
