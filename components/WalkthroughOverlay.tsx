import React, { useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TouchableWithoutFeedback,
    Dimensions,
    Platform,
} from 'react-native';
import Svg, { Defs, Rect, Mask } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useWalkthrough } from '../context/WalkthroughContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

const dims = Dimensions.get(Platform.OS === 'android' ? 'screen' : 'window');
const SCREEN_WIDTH = dims.width;
const SCREEN_HEIGHT = dims.height;
const PADDING = 8;
const TOOLTIP_MARGIN = 12;
const BORDER_RADIUS = 12;

export const WalkthroughOverlay: React.FC = () => {
    const { isActive, currentStep, totalSteps, stepKeys, getStepLayout, nextStep, skipWalkthrough } = useWalkthrough();
    const { colors } = useTheme();
    const { t } = useLanguage();
    const insets = useSafeAreaInsets();

    const currentLayout = isActive ? getStepLayout(currentStep) : undefined;

    const MIN_EDGE = 10;
    // On Android 15+ (API 35) edge-to-edge is enforced, requiring offset.
    const isAndroidNew = Platform.OS === 'android' && Platform.Version >= 34;

    // Calculate spotlight dimensions and position first, so tooltip can use them
    const spotCoords = useMemo(() => {
        if (!currentLayout) return null;

        const cx = Math.max(currentLayout.x - PADDING, MIN_EDGE);
        const cy = currentLayout.y + (isAndroidNew ? insets.top : 0) - PADDING;
        const cw = Math.min(currentLayout.width + PADDING * 2, SCREEN_WIDTH - cx - MIN_EDGE);
        const ch = currentLayout.height + PADDING * 2;

        return { cx, cy, cw, ch };
    }, [currentLayout, insets.top, isAndroidNew]);

    const tooltipPosition = useMemo(() => {
        if (!spotCoords) return { top: SCREEN_HEIGHT / 2, left: 20 };

        const { cy, ch } = spotCoords;
        const spotBottom = cy + ch;
        const spotTop = cy;
        const spaceBelow = SCREEN_HEIGHT - spotBottom;

        // Add extra margin for safety
        if (spaceBelow > 180) {
            return { top: spotBottom + TOOLTIP_MARGIN, left: 20 };
        } else {
            return { bottom: SCREEN_HEIGHT - spotTop + TOOLTIP_MARGIN, left: 20 };
        }
    }, [spotCoords]);

    if (!isActive || !currentLayout || !spotCoords) return null;

    const stepKey = stepKeys[currentStep];
    const description = t(`walkthrough.steps.${stepKey}` as any);
    const isLastStep = currentStep === totalSteps - 1;

    const { cx, cy, cw, ch } = spotCoords;

    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
            <TouchableWithoutFeedback onPress={skipWalkthrough}>
                <View style={StyleSheet.absoluteFill}>
                    <Svg width={SCREEN_WIDTH} height={SCREEN_HEIGHT} style={StyleSheet.absoluteFill}>
                        <Defs>
                            <Mask id="spotlight-mask">
                                <Rect x="0" y="0" width={SCREEN_WIDTH} height={SCREEN_HEIGHT} fill="white" />
                                <Rect
                                    x={cx}
                                    y={cy}
                                    width={cw}
                                    height={ch}
                                    rx={BORDER_RADIUS}
                                    ry={BORDER_RADIUS}
                                    fill="black"
                                />
                            </Mask>
                        </Defs>
                        <Rect
                            x="0"
                            y="0"
                            width={SCREEN_WIDTH}
                            height={SCREEN_HEIGHT}
                            fill="rgba(0,0,0,0.75)"
                            mask="url(#spotlight-mask)"
                        />
                    </Svg>

                    <View
                        style={[
                            styles.spotlightBorder,
                            {
                                left: cx - 2,
                                top: cy - 2,
                                width: cw + 4,
                                height: ch + 4,
                                borderRadius: BORDER_RADIUS + 2,
                            },
                        ]}
                        pointerEvents="none"
                    />
                </View>
            </TouchableWithoutFeedback>

            <View
                style={[
                    styles.tooltip,
                    { backgroundColor: colors.card, borderColor: colors.border },
                    tooltipPosition,
                ]}
                pointerEvents="auto"
            >
                <Text style={[styles.tooltipText, { color: colors.text }]}>{description}</Text>
                <View style={styles.tooltipFooter}>
                    <Text style={[styles.stepCounter, { color: colors.subtext }]}>
                        {currentStep + 1}/{totalSteps}
                    </Text>

                    <View style={styles.tooltipButtons}>
                        {!isLastStep && (
                            <TouchableOpacity onPress={skipWalkthrough} style={styles.skipButton}>
                                <Text style={[styles.skipText, { color: colors.subtext }]}>
                                    {t('walkthrough.skip' as any)}
                                </Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            onPress={nextStep}
                            style={[styles.nextButton, { backgroundColor: '#FACC15' }]}
                        >
                            <Text style={styles.nextText}>
                                {isLastStep ? t('walkthrough.done' as any) : t('walkthrough.next' as any)}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    spotlightBorder: {
        position: 'absolute',
        borderWidth: 2,
        borderColor: '#FACC15',
    },
    tooltip: {
        position: 'absolute',
        right: 20,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 10,
        maxWidth: SCREEN_WIDTH - 40,
    },
    tooltipText: {
        fontSize: 15,
        fontFamily: 'Poppins_500Medium',
        lineHeight: 22,
        marginBottom: 12,
    },
    tooltipFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    stepCounter: {
        fontSize: 14,
        fontFamily: 'Poppins_600SemiBold',
    },
    tooltipButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    skipButton: {
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    skipText: {
        fontSize: 14,
        fontFamily: 'Poppins_500Medium',
    },
    nextButton: {
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 20,
    },
    nextText: {
        color: '#000',
        fontSize: 14,
        fontFamily: 'Poppins_600SemiBold',
    },
});
