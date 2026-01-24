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

        let ad: any = null;
        let unsubscribeLoaded: (() => void) | undefined;
        let unsubscribeClosed: (() => void) | undefined;

        try {
            // Dynamically require the module to avoid crash in Expo Go where the native module is missing
            const mobileAds = require('react-native-google-mobile-ads').default;
            const { InterstitialAd, AdEventType, TestIds } = require('react-native-google-mobile-ads');
            const { getTrackingPermissionsAsync } = require('expo-tracking-transparency');

            // Initialize the AdMob SDK
            mobileAds().initialize().then(async () => {
                // Check tracking status for personalized ads
                const { status: trackingStatus } = await getTrackingPermissionsAsync();

                const AD_UNIT_ID = __DEV__ ? TestIds.INTERSTITIAL : REAL_AD_UNIT_ID;

                // Create ad request based on tracking status
                // If granted, we can serve personalized ads (default). 
                // If denied/unknown, we request non-personalized ads.
                const requestOptions = trackingStatus === 'granted'
                    ? {}
                    : { requestNonPersonalizedAdsOnly: true };

                ad = InterstitialAd.createForAdRequest(AD_UNIT_ID, requestOptions);

                unsubscribeLoaded = ad.addAdEventListener(AdEventType.LOADED, () => {
                    setLoaded(true);
                });

                unsubscribeClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
                    setLoaded(false);
                    ad?.load(); // Load next ad
                });

                ad.load();
                setInterstitial(ad);
            });

        } catch (error) {
            console.warn('Failed to initialize AdMob (module missing?):', error);
        }

        return () => {
            if (unsubscribeLoaded) unsubscribeLoaded();
            if (unsubscribeClosed) unsubscribeClosed();
        };
    }, []);

    const showAdIfNeeded = async (actionType: 'general' | 'trailer' | 'create_list' = 'general') => {
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

            const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

            // Trailer Ad Logic: Show on 2nd view of the day
            if (actionType === 'trailer') {
                const storageKey = 'ad_trailer_daily';
                const storedData = await AsyncStorage.getItem(storageKey);
                let data = storedData ? JSON.parse(storedData) : { date: today, count: 0 };

                if (data.date !== today) {
                    data = { date: today, count: 0 };
                }

                data.count += 1;
                await AsyncStorage.setItem(storageKey, JSON.stringify(data));

                if (data.count % 2 === 0) {
                    if (loaded && interstitial) {
                        interstitial.show();
                    }
                }
                return;
            }

            // Create List Ad Logic: Show on 1st creation of the day (keep as once or make recurrent?)
            // User only complained about trailer, but let's make lists robust too if needed. 
            // For now, let's keep list logic as is unless asked, or change to modulo if "3 oge listeye ekle" works. 
            // User said "3 oge listeye ekle calısıyor" (add 3 items works) -> that matches "general" logic (count % 3 === 0).
            // This block is for "create_list". 
            if (actionType === 'create_list') {
                const storageKey = 'ad_create_list_daily';
                const storedData = await AsyncStorage.getItem(storageKey);
                let data = storedData ? JSON.parse(storedData) : { date: today, count: 0 };

                if (data.date !== today) {
                    data = { date: today, count: 0 };
                }

                data.count += 1;
                await AsyncStorage.setItem(storageKey, JSON.stringify(data));

                if (data.count === 1) {
                    if (loaded && interstitial) {
                        interstitial.show();
                    }
                }
                return;
            }

            // General Logic (Existing): Show every 3rd action
            if (actionType === 'general') {
                const countStr = await AsyncStorage.getItem(STORAGE_KEY_AD_COUNT);
                let count = parseInt(countStr || '0', 10);
                count += 1;
                await AsyncStorage.setItem(STORAGE_KEY_AD_COUNT, count.toString());

                if (count % 3 === 0) {
                    if (loaded && interstitial) {
                        interstitial.show();
                    } else {
                        console.log('Ad not loaded yet');
                    }
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
