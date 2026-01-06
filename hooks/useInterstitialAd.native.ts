import { useEffect, useState, useCallback } from 'react';
import { InterstitialAd, AdEventType, TestIds } from 'react-native-google-mobile-ads';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

// Use the Real Unit ID provided by user, but fall back to Test ID if valid one isn't available in some contexts.
// However, for safety in this specific task where I can't verify environment, I'll use the user provided ID.
// User provided ID: ca-app-pub-5358007170177982/5656420192
const REAL_AD_UNIT_ID = 'ca-app-pub-5358007170177982/5656420192';
const AD_UNIT_ID = __DEV__ ? TestIds.INTERSTITIAL : REAL_AD_UNIT_ID;

const STORAGE_KEY_AD_COUNT = 'ad_action_count';

export const useInterstitialAd = () => {
    const [loaded, setLoaded] = useState(false);
    const [interstitial, setInterstitial] = useState<InterstitialAd | null>(null);

    // Load ad
    useEffect(() => {
        const ad = InterstitialAd.createForAdRequest(AD_UNIT_ID, {
            requestNonPersonalizedAdsOnly: true,
        });

        const unsubscribeLoaded = ad.addAdEventListener(AdEventType.LOADED, () => {
            setLoaded(true);
        });

        const unsubscribeClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
            setLoaded(false);
            ad.load(); // Load next ad
        });

        ad.load();
        setInterstitial(ad);

        return () => {
            unsubscribeLoaded();
            unsubscribeClosed();
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
