import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useNetwork } from '../context/NetworkContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { useAniListStatus } from '../hooks/useAniListStatus';
import { checkAniListStatus } from '../services/anilist/client';

/**
 * Shown when the anime data source (AniList) is unavailable, so empty screens
 * get an explanation and a retry instead of silently showing nothing.
 */
export const AniListStatusBanner = () => {
    const status = useAniListStatus();
    const { isConnected, isInternetReachable } = useNetwork();
    const { t } = useLanguage();
    const { colors, isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const [checking, setChecking] = useState(false);
    const [dismissed, setDismissed] = useState(false);

    // A new outage brings the banner back even if the previous one was dismissed
    useEffect(() => {
        if (status === 'ok') setDismissed(false);
    }, [status]);

    // The offline banner already explains this case
    const isOffline = isConnected === false || (isConnected === true && isInternetReachable === false);

    if (status !== 'down' || dismissed || isOffline) return null;

    const retry = async () => {
        setChecking(true);
        await checkAniListStatus();
        setChecking(false);
    };

    return (
        <Animated.View
            entering={FadeInUp.duration(400)}
            exiting={FadeOutUp.duration(400)}
            style={[styles.container, { top: insets.top + 8 }]}
            pointerEvents="box-none"
        >
            <View
                style={[
                    styles.card,
                    {
                        backgroundColor: colors.card,
                        borderColor: isDark ? 'rgba(250, 204, 21, 0.35)' : 'rgba(202, 138, 4, 0.35)',
                    },
                ]}
            >
                <View style={[styles.iconWrap, { backgroundColor: isDark ? 'rgba(250, 204, 21, 0.15)' : 'rgba(250, 204, 21, 0.25)' }]}>
                    <Ionicons name="cloud-offline-outline" size={20} color={isDark ? '#FACC15' : '#A16207'} />
                </View>

                <View style={styles.textContainer}>
                    <Text style={[styles.title, { color: colors.text }]}>{t('serviceStatus.title')}</Text>
                    <Text style={[styles.message, { color: colors.subtext }]}>{t('serviceStatus.message')}</Text>
                </View>

                <TouchableOpacity
                    style={styles.retryButton}
                    onPress={retry}
                    disabled={checking}
                    accessibilityLabel={t('serviceStatus.retry')}
                >
                    {checking ? (
                        <ActivityIndicator size="small" color="#000" />
                    ) : (
                        <Text style={styles.retryText}>{t('serviceStatus.retry')}</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => setDismissed(true)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    style={styles.closeButton}
                >
                    <Ionicons name="close" size={18} color={colors.subtext} />
                </TouchableOpacity>
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        left: 12,
        right: 12,
        zIndex: 9998, // just under the offline banner
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 10,
        paddingLeft: 10,
        paddingRight: 8,
        borderRadius: 16,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 6,
    },
    iconWrap: {
        width: 36,
        height: 36,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    textContainer: {
        flex: 1,
    },
    title: {
        fontFamily: 'Poppins_600SemiBold',
        fontSize: 13,
    },
    message: {
        fontFamily: 'Poppins_400Regular',
        fontSize: 11,
        lineHeight: 15,
    },
    retryButton: {
        backgroundColor: '#FACC15',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 7,
        minWidth: 64,
        alignItems: 'center',
    },
    retryText: {
        fontFamily: 'Poppins_600SemiBold',
        fontSize: 12,
        color: '#000',
    },
    closeButton: {
        padding: 2,
    },
});
