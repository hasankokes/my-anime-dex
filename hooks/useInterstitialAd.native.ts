import { useEffect, useState, useCallback } from 'react';
import Constants from 'expo-constants';
// import { InterstitialAd, AdEventType, TestIds } from 'react-native-google-mobile-ads';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

import { Platform } from 'react-native';

// User provided IDs
const ANDROID_AD_UNIT_ID = 'ca-app-pub-5358007170177982/5656420192';
const IOS_AD_UNIT_ID = 'ca-app-pub-5358007170177982/8252364184';

const REAL_AD_UNIT_ID = Platform.select({
    ios: IOS_AD_UNIT_ID,
    android: ANDROID_AD_UNIT_ID,
    default: ANDROID_AD_UNIT_ID,
})!;

// const AD_UNIT_ID = __DEV__ ? TestIds.INTERSTITIAL : REAL_AD_UNIT_ID;

const STORAGE_KEY_AD_COUNT = 'ad_action_count';

export const useInterstitialAd = () => {
    const [loaded, setLoaded] = useState(false);
    const [interstitial, setInterstitial] = useState<any | null>(null);

    // Load ad
    useEffect(() => {
        // Skip AdMob in Expo Go to prevent crashes
        if (Constants.appOwnership === 'expo') {
            console.log('Expo Go detected: Skipping AdMob initialization');
            return;
        }

        let ad: InterstitialAd | null = null;
        let unsubscribeLoaded: (() => void) | undefined;
        let unsubscribeClosed: (() => void) | undefined;

        try {
            // Dynamically require the module to avoid crash in Expo Go where the native module is missing
            const { InterstitialAd, AdEventType, TestIds } = require('react-native-google-mobile-ads');

            const AD_UNIT_ID = __DEV__ ? TestIds.INTERSTITIAL : REAL_AD_UNIT_ID;

            ad = InterstitialAd.createForAdRequest(AD_UNIT_ID, {
                requestNonPersonalizedAdsOnly: true,
            });

            unsubscribeLoaded = ad.addAdEventListener(AdEventType.LOADED, () => {
                setLoaded(true);
            });

            unsubscribeClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
                setLoaded(false);
                ad?.load(); // Load next ad
            });

            ad.load();
            setInterstitial(ad);

        } catch (error) {
            console.warn('Failed to initialize AdMob (module missing?):', error);
        }

        return () => {
            if (unsubscribeLoaded) unsubscribeLoaded();
            if (unsubscribeClosed) unsubscribeClosed();
        };
    }, []);

    const showAdIfNeeded = async () => {
        try {
            // 1. Check if user is PRO
            const { data: { session } } = await supabase.auth.getSession();
            let isPro = false;

            if (session) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('is_pro')
                    .eq('id', session.user.id)
                    .single();
                isPro = !!profile?.is_pro;
            }

            if (isPro) return;

            // 2. Increment & Check Count
            const countStr = await AsyncStorage.getItem(STORAGE_KEY_AD_COUNT);
            let count = parseInt(countStr || '0', 10);
            count += 1;
            await AsyncStorage.setItem(STORAGE_KEY_AD_COUNT, count.toString());

            // 3. Show Ad every 3rd action
            if (count % 3 === 0) {
                if (loaded && interstitial) {
                    interstitial.show();
                } else {
                    console.log('Ad not loaded yet');
                }
            }

        } catch (error) {
            console.error('Error in ad logic:', error);
        }
    };

    return {
        showAdIfNeeded,
        isLoaded: loaded
    };
};
