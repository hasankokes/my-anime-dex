import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';
import { Alert, Platform } from 'react-native';
import { useState } from 'react';

const STORAGE_KEY_COUNT = 'rateUs_addCount';
const STORAGE_KEY_HAS_RATED = 'rateUs_hasRated';

export const useRateUs = () => {
    const [showRateSheet, setShowRateSheet] = useState(false);

    const trackAddAnime = async () => {
        try {
            // 1. Check if already rated
            const hasRated = await AsyncStorage.getItem(STORAGE_KEY_HAS_RATED);
            if (hasRated === 'true') return;

            // 2. Increment count
            const countStr = await AsyncStorage.getItem(STORAGE_KEY_COUNT);
            let count = parseInt(countStr || '0', 10);
            count += 1;
            await AsyncStorage.setItem(STORAGE_KEY_COUNT, count.toString());



            // 3. Check condition: every 5 adds
            if (count % 5 === 0) {
                setShowRateSheet(true);
            }
        } catch (error) {

        }
    };

    const handleRate = async () => {
        setShowRateSheet(false);
        try {
            if (await StoreReview.hasAction()) {
                await StoreReview.requestReview();
                await AsyncStorage.setItem(STORAGE_KEY_HAS_RATED, 'true');

            } else {
                if (Platform.OS === 'web') {
                    window.alert('Thank You! We appreciate your feedback.');
                } else {
                    Alert.alert('Thank You!', 'We appreciate your feedback.');
                }
                await AsyncStorage.setItem(STORAGE_KEY_HAS_RATED, 'true');
            }
        } catch (error) {

        }
    };

    const handleLater = () => {
        setShowRateSheet(false);

    };

    return {
        showRateSheet,
        setShowRateSheet,
        trackAddAnime,
        handleRate,
        handleLater
    };
};
