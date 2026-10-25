import React, { useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { useFeature } from '../../hooks/usePremium';
import type { FeatureFlag } from '../../lib/featureFlags';
import { analytics } from '../../lib/analytics';

interface PremiumGateProps {
    feature: FeatureFlag;
    /** Analytics source for the paywall, e.g. 'stats_genres' */
    source: string;
    children: React.ReactNode;
    /** Short line under the button explaining what unlocks */
    description?: string;
    style?: ViewStyle;
    /** Render nothing (instead of the children) when the module's flag is off */
    hideWhenDisabled?: boolean;
}

/**
 * Wraps premium content. Premium users see it as is; everyone else sees a blurred,
 * non-interactive preview with a "Unlock with Premium" button that opens the paywall.
 */
export const PremiumGate: React.FC<PremiumGateProps> = ({
    feature, source, children, description, style, hideWhenDisabled = true,
}) => {
    const { colors, isDark } = useTheme();
    const { t } = useLanguage();
    const { enabled, locked, unlock } = useFeature(feature);

    useEffect(() => {
        if (locked) analytics.track('premium_gate_viewed', { feature, source });
    }, [locked, feature, source]);

    if (!enabled) return hideWhenDisabled ? null : <View style={style}>{children}</View>;
    if (!locked) return <View style={style}>{children}</View>;

    return (
        <View style={[styles.container, style]}>
            <View style={styles.fill} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                {children}
            </View>
            <BlurView
                intensity={isDark ? 28 : 22}
                tint={isDark ? 'dark' : 'light'}
                // Android BlurView needs the experimental method to actually blur
                experimentalBlurMethod="dimezisBlurView"
                style={StyleSheet.absoluteFill}
            />
            <View style={[StyleSheet.absoluteFill, styles.overlay]}>
                <TouchableOpacity
                    style={[styles.button, { backgroundColor: colors.primary }]}
                    onPress={() => unlock(source)}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                >
                    <Ionicons name="lock-closed" size={16} color="#111827" />
                    <Text style={styles.buttonText}>{t('premium.unlock')}</Text>
                </TouchableOpacity>
                {!!description && (
                    <Text style={[styles.description, { color: colors.text }]} numberOfLines={2}>
                        {description}
                    </Text>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        overflow: 'hidden',
        borderRadius: 16,
    },
    // Lets flex children (lists) keep their size inside a flex: 1 gate
    fill: {
        flexGrow: 1,
    },
    overlay: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 999,
    },
    buttonText: {
        fontFamily: 'Poppins_700Bold',
        fontSize: 14,
        color: '#111827',
    },
    description: {
        marginTop: 8,
        fontFamily: 'Poppins_500Medium',
        fontSize: 12,
        textAlign: 'center',
    },
});
