import { useCallback } from 'react';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthProvider';
import { useRevenueCat } from '../context/RevenueCatProvider';
import { useAppConfig } from '../context/AppConfigProvider';
import type { FeatureFlag } from '../lib/featureFlags';
import { analytics } from '../lib/analytics';

/**
 * The single premium check for the whole app (useIsPremium is the same check without the
 * navigation helpers, for providers).
 * Native: RevenueCat entitlement (instant, works offline). Web has no store, so it uses the
 * webhook-written profiles.is_pro. Every premium feature must go through this hook (or useFeature).
 */
export const useIsPremium = () => {
    const { serverIsPro, user } = useAuth();
    const { isPro, isReady, isTrial, expirationDate } = useRevenueCat();
    return {
        isPremium: Platform.OS === 'web' ? !!user && serverIsPro : isPro,
        isReady: Platform.OS === 'web' ? true : isReady,
        isTrial,
        expirationDate,
    };
};

export const usePremium = () => {
    const router = useRouter();
    const { isPremium, isReady, isTrial, expirationDate } = useIsPremium();

    const openPaywall = useCallback((source: string, feature?: FeatureFlag) => {
        router.push({ pathname: '/subscription', params: { source, ...(feature ? { feature } : {}) } });
    }, [router]);

    return {
        isPremium,
        isReady,
        isTrial,
        expirationDate,
        openPaywall,
    };
};

/**
 * A premium module's state: `enabled` = its flag is on (render the module at all),
 * `locked` = enabled but the user isn't premium (render the blurred preview + unlock button).
 */
export const useFeature = (flag: FeatureFlag) => {
    const { config } = useAppConfig();
    const { isPremium, isReady, openPaywall } = usePremium();
    const enabled = config[flag];

    const unlock = useCallback((source: string) => {
        analytics.track('premium_gate_tapped', { feature: flag, source });
        openPaywall(source, flag);
    }, [flag, openPaywall]);

    return {
        enabled,
        locked: enabled && !isPremium,
        isReady,
        unlock,
    };
};
