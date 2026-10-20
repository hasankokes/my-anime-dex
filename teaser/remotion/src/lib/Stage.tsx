import { AbsoluteFill, random, useCurrentFrame, useVideoConfig } from "remotion";
import { C } from "../theme";

/** Near-black stage, radial lift behind the phone, accent glow and film grain. */
export const Stage: React.FC<{ glow?: string; glowOpacity?: number; children?: React.ReactNode }> = ({
  glow = C.primary,
  glowOpacity = 0.28,
  children,
}) => {
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill style={{ backgroundColor: C.bg, overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse ${width * 0.6}px ${height * 0.7}px at 50% 50%, ${C.bgLift} 0%, ${C.bg} 70%)`,
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle ${height * 0.45}px at 50% 55%, ${glow} 0%, transparent 70%)`,
          opacity: glowOpacity,
          filter: `blur(${height * 0.06}px)`,
        }}
      />
      {children}
    </AbsoluteFill>
  );
};

/** Monochrome grain, re-seeded every 2 frames. Put it above the stage but the phone screen stays clean
 *  because Phone renders its own opaque screen on top of nothing grainy (grain sits behind it). */
export const Grain: React.FC<{ opacity?: number }> = ({ opacity = 0.035 }) => {
  const frame = useCurrentFrame();
  const seed = Math.floor(frame / 2);
  const x = Math.floor(random(`gx${seed}`) * 200);
  const y = Math.floor(random(`gy${seed}`) * 200);
  return (
    <AbsoluteFill
      style={{
        opacity,
        pointerEvents: "none",
        backgroundImage:
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='256' height='256'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
        backgroundPosition: `${x}px ${y}px`,
        mixBlendMode: "screen",
      }}
    />
  );
};
