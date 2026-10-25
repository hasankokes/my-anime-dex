import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

const PIECE_COLORS = ['#FACC15', '#F59E0B', '#FFFFFF', '#EC4899', '#3B82F6', '#10B981'];
const PIECE_COUNT = 28;

interface PieceProps {
  x: number;
  delay: number;
  color: string;
  w: number;
  h: number;
  drift: number;
  spin: number;
  fall: number;
  duration: number;
}

const Piece: React.FC<PieceProps> = ({ x, delay, color, w, h, drift, spin, fall, duration }) => {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(delay, withTiming(1, { duration, easing: Easing.out(Easing.quad) }));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const style = useAnimatedStyle(() => ({
    opacity: p.value < 0.85 ? 1 : (1 - p.value) / 0.15,
    transform: [
      { translateX: drift * p.value },
      { translateY: -40 + fall * p.value },
      { rotate: `${spin * p.value}deg` },
    ],
  }));

  return <Animated.View style={[styles.piece, { left: x, width: w, height: h, backgroundColor: color }, style]} />;
};

/** One-shot celebratory confetti burst. Purely decorative, ignores touches. */
export const Confetti: React.FC = () => {
  const { width, height } = useWindowDimensions();
  const pieces = useMemo(
    () =>
      Array.from({ length: PIECE_COUNT }).map((_, i) => ({
        key: i,
        x: Math.random() * width,
        delay: Math.random() * 400,
        color: PIECE_COLORS[i % PIECE_COLORS.length],
        w: 6 + Math.random() * 6,
        h: 8 + Math.random() * 10,
        drift: (Math.random() - 0.5) * 120,
        spin: (Math.random() - 0.5) * 900,
        fall: height * (0.55 + Math.random() * 0.35),
        duration: 1800 + Math.random() * 1200,
      })),
    [width, height]
  );

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map(({ key, ...p }) => (
        <Piece key={key} {...p} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  piece: { position: 'absolute', top: 0, borderRadius: 2 },
});
