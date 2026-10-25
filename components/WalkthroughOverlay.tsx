import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, BackHandler, LayoutChangeEvent, Platform } from 'react-native';
import Animated, {
    cancelAnimation,
    Easing,
    useAnimatedProps,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withRepeat,
    withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useWalkthrough, StepLayout, WELCOME_STEP } from '../context/WalkthroughContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

const AnimatedPath = Animated.createAnimatedComponent(Path);

const SPOT_PADDING = 6;
const SPOT_RADIUS = 14;
const SCREEN_INSET = 4;
const EDGE = 16;
const ARROW = 14;
const TOOLTIP_MAX_WIDTH = 380;
const TOOLTIP_EST_HEIGHT = 170;
// Floating tab bar (70 high, 15 from the bottom) plus breathing room
const BOTTOM_CHROME = 100;
const MEASURE_RETRIES = 8;
const MEASURE_RETRY_MS = 150;
const SCROLL_SETTLE_MS = 380;
const MOVE = { duration: 380, easing: Easing.out(Easing.cubic) };

// 15% tint of the theme accent (custom palettes may use any hex)
const tint = (color: string) => (/^#[0-9a-f]{6}$/i.test(color) ? `${color}26` : 'rgba(250, 204, 21, 0.15)');

const haptic = () => {
    if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
};

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const measureNode = (node: View | null) =>
    new Promise<{ x: number; y: number }>(resolve => {
        if (!node) return resolve({ x: 0, y: 0 });
        node.measureInWindow((x, y) => resolve({ x: x || 0, y: y || 0 }));
    });

// Full-screen rect with a rounded hole; even-odd fill punches the spotlight.
const spotlightPath = (W: number, H: number, x: number, y: number, w: number, h: number) => {
    'worklet';
    const r = Math.max(0, Math.min(SPOT_RADIUS, w / 2, h / 2));
    return (
        `M0 0H${W}V${H}H0Z ` +
        `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}` +
        `V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}` +
        `H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}` +
        `V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`
    );
};

export const WalkthroughOverlay: React.FC = () => {
    const {
        isActive, activeWalkthroughId, currentStep, totalSteps, stepKeys,
        nextStep, prevStep, skipWalkthrough, measureTarget, scrollActiveScreen,
    } = useWalkthrough();
    const { colors, isDark } = useTheme();
    const { t } = useLanguage();
    const insets = useSafeAreaInsets();

    const rootRef = useRef<View>(null);
    const directionRef = useRef<1 | -1>(1);
    const [size, setSize] = useState({ width: 0, height: 0 });
    // Spotlight in overlay coordinates; null = centred intro card
    const [spot, setSpot] = useState<StepLayout | null>(null);
    const [ready, setReady] = useState(false);

    const W = useSharedValue(0);
    const H = useSharedValue(0);
    const sx = useSharedValue(0);
    const sy = useSharedValue(0);
    const sw = useSharedValue(0);
    const sh = useSharedValue(0);
    const pulse = useSharedValue(0);
    // Every animated view below stays mounted for the overlay's whole life and is only
    // faded / made untouchable. Unmounting a view that Reanimated still animates (or
    // using entering/exiting layout animations) crashes Fabric on Android with
    // "Unable to find viewState for tag".
    const overlayIn = useSharedValue(0);
    const cardIn = useSharedValue(0);
    const cardShift = useSharedValue(8);
    const cardMode = useSharedValue(0); // 0 none, 1 welcome card, 2 tooltip

    const stepKey = stepKeys[currentStep];
    const isWelcome = stepKey === WELCOME_STEP;
    const isLastStep = currentStep === totalSteps - 1;

    const onLayout = useCallback((e: LayoutChangeEvent) => {
        const { width, height } = e.nativeEvent.layout;
        W.value = width;
        H.value = height;
        setSize(prev => (prev.width === width && prev.height === height ? prev : { width, height }));
    }, [W, H]);

    const moveSpot = useCallback((rect: StepLayout | null, animate: boolean) => {
        // A zero-size hole in the middle reads as a plain dimmed screen
        const target = rect ?? { x: W.value / 2, y: H.value / 2, width: 0, height: 0 };
        const apply = (v: number) => (animate ? withTiming(v, MOVE) : v);
        sx.value = apply(target.x);
        sy.value = apply(target.y);
        sw.value = apply(target.width);
        sh.value = apply(target.height);
    }, [W, H, sx, sy, sw, sh]);

    const revealCard = useCallback((fromY: number, mode: 1 | 2) => {
        cardMode.value = mode;
        cardShift.value = fromY;
        cardIn.value = withDelay(140, withTiming(1, { duration: 260, easing: Easing.out(Easing.cubic) }));
    }, [cardIn, cardShift, cardMode]);

    // Resolve each step against the live layout: measure, scroll into view, skip if absent.
    useEffect(() => {
        if (!isActive || !size.width) return;
        let cancelled = false;
        setReady(false);
        cardIn.value = 0;

        const skipMissing = () => {
            if (directionRef.current === -1 && currentStep > 0) prevStep();
            else nextStep();
        };

        const measure = async () => {
            for (let i = 0; i < MEASURE_RETRIES && !cancelled; i++) {
                const rect = await measureTarget(stepKey);
                if (rect) return rect;
                await wait(MEASURE_RETRY_MS);
            }
            return null;
        };

        (async () => {
            if (isWelcome) {
                setSpot(null);
                moveSpot(null, true);
                revealCard(8, 1);
                setReady(true);
                return;
            }

            let rect = await measure();
            if (cancelled) return;
            if (!rect) return skipMissing();

            const origin = await measureNode(rootRef.current);
            // Padded, but kept inside the safe area (status bar / notch / home indicator)
            // so the ring is never drawn under system bars
            const minY = insets.top + SCREEN_INSET;
            const maxY = size.height - insets.bottom - SCREEN_INSET;
            const toLocal = (r: StepLayout): StepLayout => {
                const x = Math.max(SCREEN_INSET, r.x - origin.x - SPOT_PADDING);
                const y = Math.max(minY, r.y - origin.y - SPOT_PADDING);
                const right = Math.min(size.width - SCREEN_INSET, r.x - origin.x + r.width + SPOT_PADDING);
                const bottom = Math.min(maxY, r.y - origin.y + r.height + SPOT_PADDING);
                return { x, y, width: Math.max(0, right - x), height: Math.max(0, bottom - y) };
            };
            let local = toLocal(rect);

            // Scrollable screens: bring targets hidden under the header / tab bar into view,
            // leaving room for the tooltip underneath.
            const visibleTop = insets.top + 64;
            const visibleBottom = size.height - insets.bottom - BOTTOM_CHROME;
            if (scrollActiveScreen && (local.y < visibleTop || local.y + local.height > visibleBottom)) {
                const desiredY = Math.max(visibleTop + 16, size.height * 0.28);
                if (scrollActiveScreen(local.y - desiredY)) {
                    await wait(SCROLL_SETTLE_MS);
                    if (cancelled) return;
                    rect = await measure();
                    if (cancelled) return;
                    if (!rect) return skipMissing();
                    local = toLocal(rect);
                }
            }

            // First spotlight of a tour grows out of its target instead of a screen corner
            if (sw.value < 1) {
                sx.value = local.x + local.width / 2;
                sy.value = local.y + local.height / 2;
            }
            setSpot(local);
            moveSpot(local, true);
            // Card slides in from the spotlight's side
            const roomBelow = size.height - (local.y + local.height) - insets.bottom;
            revealCard(roomBelow >= TOOLTIP_EST_HEIGHT + ARROW || roomBelow >= local.y - insets.top ? -8 : 8, 2);
            setReady(true);
        })();

        return () => {
            cancelled = true;
        };
    }, [isActive, activeWalkthroughId, currentStep, size.width, size.height]); // eslint-disable-line react-hooks/exhaustive-deps

    // Start each tour from a dimmed, hole-less screen so the first spotlight grows in.
    useEffect(() => {
        if (!isActive) {
            cancelAnimation(pulse);
            overlayIn.value = withTiming(0, { duration: 200 });
            cardIn.value = 0;
            cardMode.value = 0;
            return;
        }
        overlayIn.value = withTiming(1, { duration: 250 });
        directionRef.current = 1;
        moveSpot(null, false);
        pulse.value = 0;
        pulse.value = withRepeat(withTiming(1, { duration: 1400, easing: Easing.out(Easing.quad) }), -1, false);
    }, [isActive, activeWalkthroughId]); // eslint-disable-line react-hooks/exhaustive-deps

    // Android back button closes the tour instead of leaving the screen
    useEffect(() => {
        if (!isActive || Platform.OS !== 'android') return;
        const sub = BackHandler.addEventListener('hardwareBackPress', () => {
            skipWalkthrough();
            return true;
        });
        return () => sub.remove();
    }, [isActive, skipWalkthrough]);

    const goNext = useCallback(() => {
        if (!ready) return;
        directionRef.current = 1;
        haptic();
        nextStep();
    }, [ready, nextStep]);

    const goBack = useCallback(() => {
        if (!ready) return;
        directionRef.current = -1;
        haptic();
        prevStep();
    }, [ready, prevStep]);

    const maskProps = useAnimatedProps(() => ({
        d: spotlightPath(W.value, H.value, sx.value, sy.value, sw.value, sh.value),
    }));

    const rootStyle = useAnimatedStyle(() => ({ opacity: overlayIn.value }));
    const welcomeStyle = useAnimatedStyle(() => ({
        opacity: cardMode.value === 1 ? cardIn.value : 0,
        transform: [{ translateY: (1 - cardIn.value) * cardShift.value }],
    }));
    const tooltipAnimStyle = useAnimatedStyle(() => ({
        opacity: cardMode.value === 2 ? cardIn.value : 0,
        transform: [{ translateY: (1 - cardIn.value) * cardShift.value }],
    }));

    const ringStyle = useAnimatedStyle(() => ({
        left: sx.value - 2,
        top: sy.value - 2,
        width: sw.value + 4,
        height: sh.value + 4,
        opacity: sw.value > 1 ? 1 : 0,
    }));

    const pulseStyle = useAnimatedStyle(() => ({
        left: sx.value - 2,
        top: sy.value - 2,
        width: sw.value + 4,
        height: sh.value + 4,
        opacity: sw.value > 1 ? 0.7 * (1 - pulse.value) : 0,
        transform: [{ scale: 1 + pulse.value * 0.08 }],
    }));

    const showWelcome = isActive && ready && isWelcome;
    const showTooltip = isActive && ready && !!spot && !isWelcome;
    const dim = isDark ? 'rgba(0,0,0,0.78)' : 'rgba(15,23,42,0.6)';
    const tooltipWidth = Math.min(size.width - EDGE * 2, TOOLTIP_MAX_WIDTH);

    // Tooltip goes on the roomier side of the spotlight, horizontally near it.
    let tooltipStyle: object = { top: 0, left: EDGE };
    let arrowLeft = 0;
    let below = true;
    if (spot) {
        const spaceBelow = size.height - (spot.y + spot.height) - insets.bottom;
        const spaceAbove = spot.y - insets.top;
        below = spaceBelow >= TOOLTIP_EST_HEIGHT + ARROW || spaceBelow >= spaceAbove;
        const centerX = spot.x + spot.width / 2;
        const left = Math.min(Math.max(centerX - tooltipWidth / 2, EDGE), size.width - tooltipWidth - EDGE);
        arrowLeft = Math.min(Math.max(centerX - left - ARROW / 2, SPOT_RADIUS + 4), tooltipWidth - ARROW - SPOT_RADIUS - 4);
        tooltipStyle = below
            ? { top: spot.y + spot.height + ARROW, left }
            : { bottom: size.height - spot.y + ARROW, left };
    }

    const dotCount = stepKeys.filter(key => key !== WELCOME_STEP).length;
    const dots = dotCount < 2 ? <View /> : (
        <View style={styles.dots}>
            {stepKeys.map((key, i) =>
                key === WELCOME_STEP ? null : (
                    <View
                        key={key}
                        style={[
                            styles.dot,
                            { backgroundColor: i === currentStep ? colors.primary : colors.border },
                            i === currentStep && styles.dotActive,
                        ]}
                    />
                )
            )}
        </View>
    );

    return (
        <Animated.View
            ref={rootRef as any}
            collapsable={false}
            style={[StyleSheet.absoluteFill, rootStyle]}
            onLayout={onLayout}
            pointerEvents={isActive ? 'auto' : 'none'}
            importantForAccessibility={isActive ? 'auto' : 'no-hide-descendants'}
            accessibilityElementsHidden={!isActive}
        >
            <Pressable style={StyleSheet.absoluteFill} onPress={goNext} accessible={false}>
                {size.width > 0 && (
                    <Svg width={size.width} height={size.height} style={StyleSheet.absoluteFill} pointerEvents="none">
                        <AnimatedPath animatedProps={maskProps} fill={dim} fillRule="evenodd" />
                    </Svg>
                )}
                <Animated.View pointerEvents="none" style={[styles.ring, { borderColor: colors.primary }, pulseStyle]} />
                <Animated.View pointerEvents="none" style={[styles.ring, { borderColor: colors.primary }, ringStyle]} />
            </Pressable>

            <View style={styles.centerWrap} pointerEvents={showWelcome ? 'box-none' : 'none'}>
                <Animated.View
                    style={[styles.welcomeCard, { backgroundColor: colors.card, borderColor: colors.border, width: tooltipWidth }, welcomeStyle]}
                >
                    <View style={[styles.welcomeIcon, { backgroundColor: tint(colors.primary) }]}>
                        <Ionicons name="sparkles" size={28} color={colors.primary} />
                    </View>
                    <Text style={[styles.welcomeTitle, { color: colors.text }]}>{t('walkthrough.welcomeTitle' as any)}</Text>
                    <Text style={[styles.welcomeBody, { color: colors.subtext }]}>{t('walkthrough.steps.welcome' as any)}</Text>
                    <Pressable
                        onPress={goNext}
                        style={({ pressed }) => [styles.primaryButton, styles.welcomeButton, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
                    >
                        <Text style={styles.primaryText}>{t('walkthrough.start' as any)}</Text>
                        <Ionicons name="arrow-forward" size={16} color="#000" />
                    </Pressable>
                    <Pressable onPress={skipWalkthrough} hitSlop={8} style={styles.welcomeSkip}>
                        <Text style={[styles.skipText, { color: colors.subtext }]}>{t('walkthrough.skip' as any)}</Text>
                    </Pressable>
                </Animated.View>
            </View>

            <Animated.View
                pointerEvents={showTooltip ? 'auto' : 'none'}
                style={[styles.tooltip, { backgroundColor: colors.card, borderColor: colors.border, width: tooltipWidth }, tooltipStyle, tooltipAnimStyle]}
                accessibilityLiveRegion="polite"
            >
                <View
                    style={[
                        styles.arrow,
                        { backgroundColor: colors.card, borderColor: colors.border, left: arrowLeft },
                        below ? styles.arrowTop : styles.arrowBottom,
                    ]}
                />
                <View style={styles.tooltipHeader}>
                    {dots}
                    {!isLastStep && (
                        <Pressable onPress={skipWalkthrough} hitSlop={10}>
                            <Text style={[styles.skipText, { color: colors.subtext }]}>{t('walkthrough.skip' as any)}</Text>
                        </Pressable>
                    )}
                </View>
                <Text style={[styles.tooltipText, { color: colors.text }]}>
                    {stepKey ? t(`walkthrough.steps.${stepKey}` as any) : ''}
                </Text>
                <View style={styles.tooltipFooter}>
                    {currentStep > 0 && stepKeys[currentStep - 1] !== WELCOME_STEP ? (
                        <Pressable
                            onPress={goBack}
                            hitSlop={8}
                            style={({ pressed }) => [styles.backButton, { borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
                        >
                            <Ionicons name="chevron-back" size={16} color={colors.text} />
                            <Text style={[styles.backText, { color: colors.text }]}>{t('walkthrough.back' as any)}</Text>
                        </Pressable>
                    ) : <View />}
                    <Pressable
                        onPress={goNext}
                        style={({ pressed }) => [styles.primaryButton, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
                    >
                        <Text style={styles.primaryText}>
                            {isLastStep ? t('walkthrough.done' as any) : t('walkthrough.next' as any)}
                        </Text>
                        {!isLastStep && <Ionicons name="chevron-forward" size={16} color="#000" />}
                    </Pressable>
                </View>
            </Animated.View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    ring: {
        position: 'absolute',
        borderWidth: 2,
        borderRadius: SPOT_RADIUS + 2,
    },
    centerWrap: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
    },
    welcomeCard: {
        borderRadius: 24,
        borderWidth: 1,
        paddingHorizontal: 24,
        paddingTop: 28,
        paddingBottom: 16,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.35,
        shadowRadius: 20,
        elevation: 12,
    },
    welcomeIcon: {
        width: 60,
        height: 60,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    welcomeTitle: {
        fontSize: 20,
        fontFamily: 'Poppins_700Bold',
        textAlign: 'center',
        marginBottom: 8,
    },
    welcomeBody: {
        fontSize: 14,
        fontFamily: 'Poppins_500Medium',
        lineHeight: 21,
        textAlign: 'center',
        marginBottom: 20,
    },
    welcomeButton: {
        alignSelf: 'stretch',
        justifyContent: 'center',
        paddingVertical: 12,
    },
    welcomeSkip: {
        paddingVertical: 12,
    },
    tooltip: {
        position: 'absolute',
        borderRadius: 18,
        borderWidth: 1,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 12,
    },
    arrow: {
        position: 'absolute',
        width: ARROW,
        height: ARROW,
        borderWidth: 1,
        transform: [{ rotate: '45deg' }],
    },
    arrowTop: {
        top: -ARROW / 2,
        borderRightWidth: 0,
        borderBottomWidth: 0,
    },
    arrowBottom: {
        bottom: -ARROW / 2,
        borderLeftWidth: 0,
        borderTopWidth: 0,
    },
    tooltipHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    dots: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    dotActive: {
        width: 18,
    },
    tooltipText: {
        fontSize: 15,
        fontFamily: 'Poppins_500Medium',
        lineHeight: 22,
        marginBottom: 14,
    },
    tooltipFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    skipText: {
        fontSize: 13,
        fontFamily: 'Poppins_500Medium',
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
        paddingLeft: 8,
        paddingRight: 12,
        paddingVertical: 7,
        borderRadius: 20,
        borderWidth: 1,
    },
    backText: {
        fontSize: 13,
        fontFamily: 'Poppins_500Medium',
    },
    primaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 18,
        paddingVertical: 9,
        borderRadius: 22,
    },
    primaryText: {
        color: '#000',
        fontSize: 14,
        fontFamily: 'Poppins_600SemiBold',
    },
});
