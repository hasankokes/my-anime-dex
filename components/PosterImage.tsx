import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Image, ImageProps } from 'expo-image';
import { useTheme } from '../context/ThemeContext';

interface PosterImageProps {
    uri?: string | null;
    style?: StyleProp<ViewStyle>;
    /** Inset applied to the sharp poster only (e.g. to keep it clear of an overlaid title). */
    posterInset?: { top?: number; bottom?: number; left?: number; right?: number };
    priority?: ImageProps['priority'];
    cachePolicy?: ImageProps['cachePolicy'];
    transition?: number;
}

/**
 * Shows a portrait anime poster uncropped inside a box of any aspect ratio:
 * a blurred, dimmed copy fills the box and the full poster sits on top with `contain`.
 */
export const PosterImage: React.FC<PosterImageProps> = React.memo(({
    uri,
    style,
    posterInset,
    priority,
    cachePolicy = 'memory-disk',
    transition = 200,
}) => {
    const { colors } = useTheme();
    const source = uri ? { uri } : undefined;

    return (
        <View style={[styles.container, { backgroundColor: colors.card }, style]}>
            <Image
                source={source}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                blurRadius={25}
                priority={priority}
                cachePolicy={cachePolicy}
                transition={transition}
            />
            <View style={[StyleSheet.absoluteFill, styles.dim]} />
            <Image
                source={source}
                style={[
                    StyleSheet.absoluteFill,
                    {
                        top: posterInset?.top ?? 0,
                        bottom: posterInset?.bottom ?? 0,
                        left: posterInset?.left ?? 0,
                        right: posterInset?.right ?? 0,
                    },
                ]}
                contentFit="contain"
                priority={priority}
                cachePolicy={cachePolicy}
                transition={transition}
            />
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        overflow: 'hidden',
    },
    dim: {
        backgroundColor: 'rgba(0,0,0,0.35)',
    },
});

PosterImage.displayName = 'PosterImage';
