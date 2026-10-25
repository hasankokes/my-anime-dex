import React, { useId } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import Svg, { Circle, ClipPath, Defs, G, Path, Pattern, Rect } from 'react-native-svg';
import { ARENA_GOLD } from './arenaTheme';

interface VsMarkProps {
  size?: number;
}

const INK = '#0B0B0B';

// Jagged manga "impact" balloon
const BURST =
  'M34.1 2.1 L37.8 10.3 L47 6 L47.9 16.1 L59 18.8 L53.7 26.2 L62 32 L53.7 37.8 L56.9 48.8 L47.9 47.9 L47 58' +
  ' L37.8 53.7 L29.9 61.9 L26.2 53.7 L17 58 L16.1 47.9 L5 45.2 L10.3 37.8 L2 32 L10.3 26.2 L7.1 15.2 L16.1 16.1' +
  ' L17 6 L26.2 10.3 Z';

// Letters are drawn as shapes (not text) so they look identical on every platform
const V_SHAPE = 'M8 21 L17 21 L21.5 33.5 L26 21 L35 21 L26 43 L17 43 Z';
const S_STROKE = 'M50.5 25.5 C48.5 21 38 20.5 37.5 26.5 C37 32.5 50.5 30.5 50.5 37 C50.5 43.5 38.5 44.5 35.5 39.5';
const BANGS = 'M54 21 L58.5 21 L57 35 L54 35 Z M60.5 21 L65 21 L63.5 35 L60.5 35 Z';
const BANG_DOTS: [number, number][] = [[55, 40.5], [61.5, 40.5]];
// skewX(-12deg) around the badge centre, for the fighting-game italic
const ITALIC = 'matrix(1 0 -0.2126 1 6.8 0)';

/** Arena mark: gold manga impact balloon with halftone dots and a white, ink-outlined "VS!!". */
export const VsMark: React.FC<VsMarkProps> = ({ size = 52 }) => {
  const uid = useId().replace(/:/g, '');
  const clipId = `vs-burst-${uid}`;
  const dotsId = `vs-dots-${uid}`;

  const letters = (fill: string, outline: number) => (
    <>
      <Path d={V_SHAPE} fill={fill} stroke={fill} strokeWidth={outline} strokeLinejoin="round" />
      <Path d={S_STROKE} fill="none" stroke={fill} strokeWidth={6 + outline} strokeLinecap="round" />
      <Path d={BANGS} fill={fill} stroke={fill} strokeWidth={outline} strokeLinejoin="round" />
      {BANG_DOTS.map(([cx, cy]) => (
        <Circle key={cx} cx={cx} cy={cy} r={2 + outline / 2} fill={fill} />
      ))}
    </>
  );

  return (
    <View style={[{ width: size, height: size }, Platform.OS !== 'web' && [styles.glow, { shadowRadius: size * 0.2 }]]}>
      <Svg width={size} height={size} viewBox="0 0 64 64">
        <Defs>
          <ClipPath id={clipId}>
            <Path d={BURST} />
          </ClipPath>
          <Pattern id={dotsId} width={4} height={4} patternUnits="userSpaceOnUse">
            <Circle cx={2} cy={2} r={0.9} fill={INK} />
          </Pattern>
        </Defs>
        <Path d={BURST} fill={ARENA_GOLD} />
        {/* Screentone */}
        <Rect width={64} height={64} fill={`url(#${dotsId})`} clipPath={`url(#${clipId})`} opacity={0.25} />
        <Path d={BURST} fill="none" stroke={INK} strokeWidth={2.5} strokeLinejoin="round" />
        {/* Shrink and tilt "VS!!" so it sits inside the spikes */}
        <G transform="translate(32 32) rotate(-8) scale(0.66) translate(-36.5 -32)">
          <G transform={ITALIC}>
            {letters(INK, 5)}
            {letters('#FFFFFF', 0)}
          </G>
        </G>
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  // Native shadows follow the SVG's shape; web would draw a square box-shadow instead
  glow: {
    shadowColor: ARENA_GOLD,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
  },
});
