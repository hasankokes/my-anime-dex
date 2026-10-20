import { AbsoluteFill, random } from "remotion";
import { C } from "../theme";
import { useLayout } from "./layout";

/** Comic burst rays (echoes the logo's burst) in the accent colour. p: 0→1 grow, fade handled by caller. */
export const BurstRays: React.FC<{ cx: number; cy: number; p: number; count?: number; color?: string; inner?: number; outer?: number; rot?: number; seed?: string }> = ({
  cx,
  cy,
  p,
  count = 22,
  color = C.primary,
  inner = 120,
  outer = 620,
  rot = 0,
  seed = "b",
}) => {
  const { u } = useLayout();
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <svg width="100%" height="100%" style={{ position: "absolute", inset: 0 }}>
        {Array.from({ length: count }, (_, i) => {
          const a = ((i / count) * 360 + rot + random(`${seed}${i}`) * 6) * (Math.PI / 180);
          const len = (inner + (outer - inner) * (0.55 + random(`${seed}l${i}`) * 0.45) * p) * u;
          const w = (0.035 + random(`${seed}w${i}`) * 0.03);
          const r0 = inner * u;
          const p1 = [cx + Math.cos(a - w) * r0, cy + Math.sin(a - w) * r0];
          const p2 = [cx + Math.cos(a) * len, cy + Math.sin(a) * len];
          const p3 = [cx + Math.cos(a + w) * r0, cy + Math.sin(a + w) * r0];
          return <polygon key={i} points={`${p1.join(",")} ${p2.join(",")} ${p3.join(",")}`} fill={i % 4 === 0 ? "#fff" : color} opacity={i % 4 === 0 ? 0.6 : 0.9} />;
        })}
      </svg>
    </AbsoluteFill>
  );
};

/** Halftone dot field radiating from (cx,cy). p: 0→1 expands the wave front. Transitions only. */
export const Halftone: React.FC<{ cx: number; cy: number; p: number; color?: string; spacing?: number; maxR?: number }> = ({
  cx,
  cy,
  p,
  color = C.primary,
  spacing = 34,
  maxR = 11,
}) => {
  const { width, height, u } = useLayout();
  const s = spacing * u;
  const front = p * Math.hypot(width, height);
  const dots: React.ReactElement[] = [];
  for (let y = s / 2; y < height; y += s) {
    for (let x = s / 2; x < width; x += s) {
      const d = Math.hypot(x - cx, y - cy);
      const k = 1 - Math.abs(d - front) / (260 * u);
      if (k <= 0) continue;
      dots.push(<circle key={`${x}-${y}`} cx={x} cy={y} r={k * maxR * u} fill={color} />);
    }
  }
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <svg width="100%" height="100%">{dots}</svg>
    </AbsoluteFill>
  );
};

/** Soft accent glow orb (behind breakout elements). */
export const Glow: React.FC<{ x: number; y: number; r: number; color?: string; opacity?: number }> = ({ x, y, r, color = C.primary, opacity = 0.35 }) => (
  <div
    style={{
      position: "absolute",
      left: x - r,
      top: y - r,
      width: r * 2,
      height: r * 2,
      borderRadius: "50%",
      background: `radial-gradient(circle, ${color} 0%, transparent 65%)`,
      opacity,
      filter: `blur(${r * 0.15}px)`,
      pointerEvents: "none",
    }}
  />
);
