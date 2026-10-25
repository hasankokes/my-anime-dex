import { useEffect } from 'react';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { analytics } from '../lib/analytics';
import { useAuth } from '../context/AuthProvider';
import { useRevenueCat } from '../context/RevenueCatProvider';

const ANDROID_AD_UNIT_ID = 'ca-app-pub-5358007170177982/5656420192';
const IOS_AD_UNIT_ID = 'ca-app-pub-5358007170177982/8252364184';

const REAL_AD_UNIT_ID = Platform.select({
    ios: IOS_AD_UNIT_ID,
    android: ANDROID_AD_UNIT_ID,
    default: ANDROID_AD_UNIT_ID,
})!;

export type AdActionType = 'general' | 'trailer' | 'create_list';

const STORAGE_KEY_AD_COUNT = 'ad_action_count';
const STORAGE_KEY_TRAILER = 'ad_trailer_daily';
const STORAGE_KEY_CREATE_LIST = 'ad_create_list_daily';

// AdMob interstitials expire after 1 hour; refresh a bit earlier
const AD_MAX_AGE_MS = 55 * 60 * 1000;
// Retry after a failed load with exponential back-off (30s, 60s, 2m, 4m, 8m), then wait for the next trigger
const RETRY_BASE_MS = 30 * 1000;
const MAX_RETRIES = 5;
// Give a closing Modal/Alert time to dismiss: iOS cannot present an ad over another presented view
const SHOW_DELAY_MS = 600;

const isExpoGo = Constants.appOwnership === 'expo';

/**
 * One interstitial for the whole app: preloaded once, shown on the next trigger, reloaded after close.
 * Previously every screen that used the hook created and loaded its own ad (and retried every 5s on
 * no-fill), which produced many requests and very few impressions.
 */
const adManager = (() => {
    let sdk: any = null;
    let initPromise: Promise<boolean> | null = null;
    let eligible = false;
    let ad: any = null;
    let unsubscribers: (() => void)[] = [];
    let loaded = false;
    let loading = false;
    let loadedAt = 0;
    let retries = 0;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let showing = false;
    let onShowEnd: ((shown: boolean) => void) | null = null;

    const getSdk = () => {
        if (!sdk) sdk = require('react-native-google-mobile-ads');
        return sdk;
    };

    const init = () => {
        if (!initPromise) {
            initPromise = getSdk().default().initialize()
                .then(() => true)
                .catch((e: any) => {
                    console.warn('AdMob init failed:', e);
                    initPromise = null;
                    return false;
                });
        }
        return initPromise!;
    };

    const clearRetry = () => {
        if (retryTimer) clearTimeout(retryTimer);
        retryTimer = null;
    };

    const teardown = () => {
        unsubscribers.forEach(u => u());
        unsubscribers = [];
        ad = null;
        loaded = false;
        loading = false;
    };

    const finishShow = (shown: boolean) => {
        showing = false;
        const cb = onShowEnd;
        onShowEnd = null;
        cb?.(shown);
    };

    const load = async () => {
        if (!eligible || isExpoGo || loading || showing) return;
        if (loaded && Date.now() - loadedAt < AD_MAX_AGE_MS) return;
        clearRetry();
        loading = true;

        if (!(await init()) || !eligible) {
            loading = false;
            return;
        }

        try {
            const { InterstitialAd, AdEventType, TestIds } = getSdk();
            const { getTrackingPermissionsAsync } = require('expo-tracking-transparency');
            const { status } = await getTrackingPermissionsAsync();

            teardown();
            loading = true;

            const instance = InterstitialAd.createForAdRequest(
                __DEV__ ? TestIds.INTERSTITIAL : REAL_AD_UNIT_ID,
                status === 'granted' ? {} : { requestNonPersonalizedAdsOnly: true },
            );
            ad = instance;

            unsubscribers = [
                instance.addAdEventListener(AdEventType.LOADED, () => {
                    loaded = true;
                    loading = false;
                    loadedAt = Date.now();
                    retries = 0;
                }),
                instance.addAdEventListener(AdEventType.OPENED, () => {
                    showing = true;
                }),
                instance.addAdEventListener(AdEventType.CLOSED, () => {
                    teardown();
                    finishShow(true);
                    load();
                }),
                instance.addAdEventListener(AdEventType.ERROR, (error: any) => {
                    if (showing) {
                        analytics.track('ad_failed', { trigger: 'show', error: error?.code ?? 'show_error' });
                        teardown();
                        finishShow(false);
                        load();
                        return;
                    }
                    teardown();
                    if (retries < MAX_RETRIES) {
                        const delay = RETRY_BASE_MS * Math.pow(2, retries);
                        retries += 1;
                        retryTimer = setTimeout(load, delay);
                    }
                }),
            ];

            instance.load();
        } catch (e) {
            console.warn('AdMob load failed (module missing?):', e);
            teardown();
        }
    };

    return {
        setEligible(value: boolean) {
            if (eligible === value) return;
            eligible = value;
            if (value) {
                retries = 0;
                load();
            } else {
                clearRetry();
                teardown();
            }
        },

        isEligible: () => eligible,

        isReady: () => eligible && loaded && !showing && Date.now() - loadedAt < AD_MAX_AGE_MS,

        /** Shows the preloaded ad. Resolves when it is closed (true) or could not be shown (false). */
        async show(trigger: AdActionType): Promise<boolean> {
            if (!adManager.isReady()) {
                analytics.track('ad_failed', { trigger, error: loaded ? 'expired' : 'not_loaded' });
                // Expired or missing: start loading so the next trigger has one
                if (retries >= MAX_RETRIES) retries = 0;
                if (loaded) teardown();
                load();
                return false;
            }

            // ATT prompt before the first ad (no-op once the user has answered)
            try {
                const { requestTrackingPermissionsAsync } = require('expo-tracking-transparency');
                await requestTrackingPermissionsAsync();
            } catch { }

            await new Promise(r => setTimeout(r, SHOW_DELAY_MS));
            if (!adManager.isReady() || !ad) return false;

            return new Promise<boolean>(resolve => {
                showing = true;
                onShowEnd = resolve;
                Promise.resolve()
                    .then(() => ad.show())
                    .then(() => analytics.track('ad_shown', { trigger }))
                    .catch((e: any) => {
                        analytics.track('ad_failed', { trigger, error: e?.code ?? 'show_error' });
                        teardown();
                        finishShow(false);
                        load();
                    });
            });
        },
    };
})();

const todayKey = () => new Date().toISOString().split('T')[0]; // YYYY-MM-DD

const readDaily = async (key: string) => {
    const today = todayKey();
    const stored = await AsyncStorage.getItem(key);
    const data = stored ? JSON.parse(stored) : null;
    return data?.date === today ? data : { date: today, count: 0, shown: false };
};

/**
 * Decides whether this action should show an ad. Counters only reset once an ad is actually
 * shown, so a trigger that hits while no ad is ready rolls over to the next action instead of
 * being lost.
 */
const showAdIfNeeded = async (actionType: AdActionType = 'general'): Promise<boolean> => {
    try {
        if (!adManager.isEligible()) return false;

        if (actionType === 'trailer') {
            // From the 2nd trailer of the day, every 2nd one
            const data = await readDaily(STORAGE_KEY_TRAILER);
            data.count += 1;
            const due = data.count >= 2;
            const shown = due && (await adManager.show(actionType));
            if (shown) data.count = 0;
            await AsyncStorage.setItem(STORAGE_KEY_TRAILER, JSON.stringify(data));
            return shown;
        }

        if (actionType === 'create_list') {
            // Once per day
            const data = await readDaily(STORAGE_KEY_CREATE_LIST);
            if (data.shown) return false;
            const shown = await adManager.show(actionType);
            if (shown) await AsyncStorage.setItem(STORAGE_KEY_CREATE_LIST, JSON.stringify({ ...data, shown: true }));
            return shown;
        }

        // General: every 3rd list action
        let count = parseInt((await AsyncStorage.getItem(STORAGE_KEY_AD_COUNT)) || '0', 10) + 1;
        const shown = count >= 3 && (await adManager.show(actionType));
        if (shown) count = 0;
        await AsyncStorage.setItem(STORAGE_KEY_AD_COUNT, count.toString());
        return shown;
    } catch (error) {
        console.error('Error in ad logic:', error);
        return false;
    }
};

/**
 * Mounted once in the root layout: preloads an ad only for signed-in, non-premium users
 * (guests cannot perform the actions that show ads, premium users never see them).
 */
export const useAdsBootstrap = () => {
    const { user } = useAuth();
    const { isPro, isReady } = useRevenueCat();

    useEffect(() => {
        if (isExpoGo) return;
        adManager.setEligible(isReady && !!user && !isPro);
    }, [user?.id, isPro, isReady]);
};

export const useInterstitialAd = () => ({
    showAdIfNeeded,
    isLoaded: adManager.isReady(),
});
