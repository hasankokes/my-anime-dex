import React, { useEffect, useState } from 'react';
import { Image, LayoutChangeEvent, StyleSheet, Text, TextProps, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useIsFocused } from '@react-navigation/native';
import Animated, {
    cancelAnimation,
    Easing,
    useAnimatedStyle,
    useReducedMotion,
    useSharedValue,
    withRepeat,
    withTiming,
} from 'react-native-reanimated';
import { PremiumBadge } from '../Premium/PremiumBadge';
import type { BannerPattern as BannerPatternData, FrameAnimation, ProfileDecor } from '../../lib/cosmetics';
import { BannerPattern } from './BannerPattern';

type GradientColors = [string, string, ...string[]];

/**
 * Gradient ring around an avatar (premium frame); renders the avatar unchanged without one.
 * `animate` turns on the frame's motion: only pass it for single, large avatars (profile headers,
 * the appearance preview), never in lists. Motion runs on the UI thread, stops while the screen is
 * not focused and is skipped when the system "Reduce Motion" setting is on.
 */
export const AvatarFrame: React.FC<{
    colors: string[] | null;
    size?: number;
    animation?: FrameAnimation | null;
    animate?: boolean;
    children: React.ReactNode;
}> = ({ colors, size = 4, animation, animate = false, children }) => {
    const focused = useIsFocused();
    const reduceMotion = useReducedMotion();
    if (!colors) return <>{children}</>;

    const motion = animate && focused && !reduceMotion ? animation ?? null : null;
    if (!motion) {
        return (
            <LinearGradient
                colors={colors as GradientColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ borderRadius: 999, padding: size }}
            >
                {children}
            </LinearGradient>
        );
    }
    return (
        <AnimatedFrame colors={colors as GradientColors} size={size} animation={motion}>
            {children}
        </AnimatedFrame>
    );
};

const AnimatedFrame: React.FC<{
    colors: GradientColors;
    size: number;
    animation: FrameAnimation;
    children: React.ReactNode;
}> = ({ colors, size, animation, children }) => {
    const progress = useSharedValue(0);
    const [width, setWidth] = useState(0);
    const { type, durationMs } = animation;

    useEffect(() => {
        progress.value = 0;
        progress.value = type === 'rotate'
            ? withRepeat(withTiming(1, { duration: durationMs, easing: Easing.linear }), -1, false)
            : type === 'pulse'
                ? withRepeat(withTiming(1, { duration: durationMs / 2, easing: Easing.inOut(Easing.quad) }), -1, true)
                : withRepeat(withTiming(1, { duration: durationMs, easing: Easing.inOut(Easing.cubic) }), -1, false);
        return () => cancelAnimation(progress);
    }, [type, durationMs, progress]);

    // The gradient layer is a square behind a circular clip, so rotating it never shows a gap
    const rotateStyle = useAnimatedStyle(() => ({
        transform: [{ rotate: `${progress.value * 360}deg` }],
    }));
    const pulseStyle = useAnimatedStyle(() => ({
        opacity: 1 - progress.value * 0.45,
    }));
    const shimmerStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: (progress.value * 2 - 1) * width }, { rotate: '20deg' }],
    }));

    const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

    return (
        <View style={[styles.frameClip, { padding: size }]} onLayout={onLayout}>
            <Animated.View
                style={[StyleSheet.absoluteFill, type === 'rotate' ? rotateStyle : type === 'pulse' ? pulseStyle : null]}
            >
                <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
            </Animated.View>
            {type === 'shimmer' && width > 0 && (
                <Animated.View pointerEvents="none" style={[styles.shimmer, { width: width * 0.45 }, shimmerStyle]}>
                    <LinearGradient
                        colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.75)', 'rgba(255,255,255,0)']}
                        start={{ x: 0, y: 0.5 }}
                        end={{ x: 1, y: 0.5 }}
                        style={StyleSheet.absoluteFill}
                    />
                </Animated.View>
            )}
            {children}
        </View>
    );
};

export const hasBanner = (decor: ProfileDecor) => !!(decor.bannerColors || decor.bannerImage);

/** Banner gradient + optional pattern, filling its parent. Also used for the picker swatches. */
export const BannerArt: React.FC<{ colors: string[] | null; pattern?: BannerPatternData | null; image?: string | null }> = ({
    colors, pattern, image,
}) => (
    <>
        {colors && (
            <LinearGradient colors={colors as GradientColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        )}
        {image
            ? <Image source={{ uri: image }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            : pattern && <BannerPattern pattern={pattern} />}
    </>
);

/**
 * Profile header banner (premium); nothing without one. `overlap` is how far the avatar below
 * should ride up onto it (half the avatar block, so it sits centered on the bottom edge).
 */
export const ProfileBanner: React.FC<{ decor: ProfileDecor; overlap?: number; style?: ViewStyle }> = ({
    decor, overlap = 56, style,
}) => {
    if (!hasBanner(decor)) return null;
    return (
        <View style={[styles.banner, { marginBottom: -overlap }, style]}>
            <BannerArt colors={decor.bannerColors} pattern={decor.bannerPattern} image={decor.bannerImage} />
            {/* Soft shade at the bottom edge so the avatar reads as sitting in front of the banner */}
            <LinearGradient
                colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.22)']}
                start={{ x: 0, y: 0.45 }}
                end={{ x: 0, y: 1 }}
                style={StyleSheet.absoluteFill}
                pointerEvents="none"
            />
        </View>
    );
};

/** Ring in the page color around an avatar that overlaps a banner, so it looks cut into it. */
export const AvatarCutout: React.FC<{ active: boolean; color: string; children: React.ReactNode }> = ({
    active, color, children,
}) => (active ? <View style={[styles.cutout, { backgroundColor: color }]}>{children}</View> : <>{children}</>);

export const CUTOUT_WIDTH = 5;

/** Username with the premium name color and PRO badge when the owner has them. */
export const DecoratedName: React.FC<{
    name: string;
    decor: ProfileDecor;
    style?: TextProps['style'];
    defaultColor: string;
    badgeSize?: 'sm' | 'md';
    numberOfLines?: number;
}> = ({ name, decor, style, defaultColor, badgeSize = 'sm', numberOfLines }) => (
    <View style={styles.nameRow}>
        <Text style={[style, { color: decor.nameColor ?? defaultColor }]} numberOfLines={numberOfLines}>
            {name}
        </Text>
        {decor.showBadge && <PremiumBadge size={badgeSize} />}
    </View>
);

const styles = StyleSheet.create({
    frameClip: {
        borderRadius: 999,
        overflow: 'hidden',
    },
    shimmer: {
        position: 'absolute',
        top: '-25%',
        bottom: '-25%',
        left: '27.5%',
    },
    banner: {
        height: 150,
        borderRadius: 24,
        overflow: 'hidden',
        marginHorizontal: 16,
    },
    cutout: {
        borderRadius: 999,
        padding: CUTOUT_WIDTH,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        flexShrink: 1,
    },
});
