import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import Purchases, { CustomerInfo, PACKAGE_TYPE, PurchasesPackage } from 'react-native-purchases';
import { REVENUECAT_ANDROID_API_KEY, REVENUECAT_IOS_API_KEY } from '../constants/Config';
import { useAuth } from './AuthProvider';
import { analytics } from '../lib/analytics';
import { supabase } from '../lib/supabase';
import { syncTrialReminder } from '../lib/trialReminder';

/** RevenueCat entitlement that unlocks premium */
export const PREMIUM_ENTITLEMENT_ID = 'animedex_premium_monthly';

export const hasPremiumEntitlement = (info: CustomerInfo) =>
    typeof info.entitlements.active[PREMIUM_ENTITLEMENT_ID] !== 'undefined';

/**
 * Asks the premium-sync edge function to re-read this user's entitlement from RevenueCat and
 * write profiles.is_pro (clients can't write it). The webhook does the same on every store
 * event; this covers the moments right after sign-in / purchase without waiting for it.
 */
const syncServerPremium = async () => {
    const { error } = await supabase.functions.invoke('premium-sync', { method: 'POST' });
    if (error) console.warn('premium-sync failed:', error.message);
};

export interface PremiumPackages {
    monthly: PurchasesPackage | null;
    annual: PurchasesPackage | null;
}

interface RevenueCatContextType {
    isPro: boolean;
    /** False until RevenueCat has reported the initial entitlement state */
    isReady: boolean;
    /** True while the active entitlement is in its free-trial period */
    isTrial: boolean;
    /** ISO date the current entitlement period ends (trial end while trialing) */
    expirationDate: string | null;
    packages: PremiumPackages;
    /** Monthly package (or the first available one); kept for older call sites */
    currentOffering: PurchasesPackage | null;
    customerInfo: CustomerInfo | null;
    purchasePackage: (pkg: PurchasesPackage) => Promise<void>;
    restorePermissions: () => Promise<CustomerInfo>;
    /** Re-fetches the current offering (e.g. after a network failure); resolves to the default package or null */
    reloadOfferings: () => Promise<PurchasesPackage | null>;
}

const RevenueCatContext = createContext<RevenueCatContextType | undefined>(undefined);

const EMPTY_PACKAGES: PremiumPackages = { monthly: null, annual: null };

export const RevenueCatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, refreshProfile, serverIsPro } = useAuth();
    const [packages, setPackages] = useState<PremiumPackages>(EMPTY_PACKAGES);
    const [fallbackPackage, setFallbackPackage] = useState<PurchasesPackage | null>(null);
    const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
    const [initializing, setInitializing] = useState(true); // Add initializing state to prevent early checks
    const [configured, setConfigured] = useState(false);
    const configuredRef = useRef(false);
    const loggedInUserRef = useRef<string | null>(null);
    // The Supabase user RevenueCat has finished identifying (null = anonymous)
    const [identifiedUserId, setIdentifiedUserId] = useState<string | null>(null);
    const refreshProfileRef = useRef(refreshProfile);
    refreshProfileRef.current = refreshProfile;

    const entitlement = customerInfo?.entitlements.active[PREMIUM_ENTITLEMENT_ID];
    const isPro = !!entitlement;

    const reloadOfferings = useCallback(async () => {
        if (!configuredRef.current) return null;
        try {
            const offerings = await Purchases.getOfferings();
            const current = offerings.current;
            const available = current?.availablePackages ?? [];
            const next: PremiumPackages = {
                monthly: current?.monthly ?? available.find(p => p.packageType === PACKAGE_TYPE.MONTHLY) ?? null,
                annual: current?.annual ?? available.find(p => p.packageType === PACKAGE_TYPE.ANNUAL) ?? null,
            };
            setPackages(next);
            setFallbackPackage(available[0] ?? null);
            return next.monthly ?? next.annual ?? available[0] ?? null;
        } catch (e) {
            console.error('RevenueCat offerings error:', e);
            return null;
        }
    }, []);

    useEffect(() => {
        const init = async () => {
            try {
                // Skip RevenueCat in Expo Go
                const isExpoGo = Constants.appOwnership === 'expo';
                if (isExpoGo) {
                    console.log('Expo Go detected: Skipping RevenueCat initialization');
                    return;
                }

                if (Platform.OS === 'android') {
                    await Purchases.configure({ apiKey: REVENUECAT_ANDROID_API_KEY });
                } else if (Platform.OS === 'ios') {
                    await Purchases.configure({ apiKey: REVENUECAT_IOS_API_KEY });
                } else {
                    return; // No store on web
                }
                configuredRef.current = true;
                setConfigured(true);

                // Offerings load independently so a customer-info failure doesn't leave the paywall empty
                const offeringsPromise = reloadOfferings();

                setCustomerInfo(await Purchases.getCustomerInfo());

                await offeringsPromise;
            } catch (e) {
                console.error('RevenueCat init error:', e);
            } finally {
                setInitializing(false);
            }
        };

        init();
    }, [reloadOfferings]);

    // Renewals, expirations and purchases made elsewhere arrive here while the app is open
    useEffect(() => {
        if (!configured) return;
        const listener = (info: CustomerInfo) => setCustomerInfo(info);
        Purchases.addCustomerInfoUpdateListener(listener);
        return () => {
            Purchases.removeCustomerInfoUpdateListener(listener);
        };
    }, [configured]);

    // Tie the store purchase to the Supabase account (so it follows the user across devices and
    // the webhook can find the profile), and detach it again on sign-out.
    const userId = user?.id ?? null;
    useEffect(() => {
        if (!configured || loggedInUserRef.current === userId) return;
        const previous = loggedInUserRef.current;
        loggedInUserRef.current = userId;
        (async () => {
            try {
                if (userId) {
                    const { customerInfo: info } = await Purchases.logIn(userId);
                    setCustomerInfo(info);
                } else if (previous && !(await Purchases.isAnonymous())) {
                    setCustomerInfo(await Purchases.logOut());
                }
            } catch (e) {
                console.error('RevenueCat identity error:', e);
            } finally {
                setIdentifiedUserId(userId);
            }
        })();
    }, [configured, userId]);

    useEffect(() => {
        if (customerInfo) syncTrialReminder(userId ? entitlement : null);
    }, [customerInfo, userId]);

    // Once RevenueCat knows this user, make the server flag match the store. Only called when they
    // disagree (a purchase, expiry or restore the webhook hasn't delivered yet), once per state.
    const identified = configured && !!userId && identifiedUserId === userId;
    const lastSyncKeyRef = useRef<string | null>(null);
    useEffect(() => {
        if (!identified || !customerInfo || isPro === serverIsPro) return;
        const key = `${userId}:${isPro}`;
        if (lastSyncKeyRef.current === key) return;
        lastSyncKeyRef.current = key;
        syncServerPremium().then(() => refreshProfileRef.current());
    }, [identified, customerInfo, isPro, serverIsPro, userId]);

    const purchasePackage = async (pkg: PurchasesPackage) => {
        const productProps = {
            product_id: pkg.product.identifier,
            package_type: pkg.packageType,
            price: pkg.product.price,
            currency: pkg.product.currencyCode,
            has_intro_offer: !!pkg.product.introPrice,
        };
        analytics.track('purchase_started', productProps);
        try {
            const { customerInfo: info } = await Purchases.purchasePackage(pkg);
            setCustomerInfo(info);
            analytics.track('purchase_completed', { ...productProps, entitlement_active: hasPremiumEntitlement(info) });
        } catch (e: any) {
            if (e.userCancelled) {
                analytics.track('purchase_cancelled', productProps);
            } else {
                analytics.track('purchase_failed', { ...productProps, error: e.code ?? e.message });
                console.error('Purchase error:', e);
                throw e;
            }
        }
    };

    const restorePermissions = async () => {
        try {
            const info = await Purchases.restorePurchases();
            setCustomerInfo(info);
            analytics.track('restore_completed', { entitlement_active: hasPremiumEntitlement(info) });
            return info;
        } catch (e: any) {
            analytics.track('restore_failed', { error: e?.code ?? e?.message });
            console.error('Restore error:', e);
            throw e;
        }
    };

    return (
        <RevenueCatContext.Provider
            value={{
                isPro,
                // Not ready while a signed-in user's entitlements are still being fetched under their id,
                // so ads/gates never act on the anonymous customer's state
                isReady: !initializing && (!configured || identifiedUserId === userId),
                isTrial: entitlement?.periodType === 'TRIAL',
                expirationDate: entitlement?.expirationDate ?? null,
                packages,
                currentOffering: packages.monthly ?? fallbackPackage,
                customerInfo,
                purchasePackage,
                restorePermissions,
                reloadOfferings,
            }}
        >
            {children}
        </RevenueCatContext.Provider>
    );
};

export const useRevenueCat = () => {
    const context = useContext(RevenueCatContext);
    if (!context) {
        throw new Error('useRevenueCat must be used within a RevenueCatProvider');
    }
    return context;
};
