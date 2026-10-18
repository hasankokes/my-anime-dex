import { AbsoluteFill, interpolate, random, useCurrentFrame, useVideoConfig } from "remotion";
import { C } from "../theme";

/** Anime speed lines for whip transitions only (never over a resting UI). Lasts `len` frames from 0. */
export const SpeedLines: React.FC<{ len?: number; dir?: 1 | -1; color?: string; seed?: string }> = ({
  len = 8,
  dir = 1,
  color = C.primary,
  seed = "s",
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  if (frame < 0 || frame >= len) return null;
  const p = frame / len;
  const opacity = interpolate(p, [0, 0.25, 1], [0, 0.9, 0]);
  const lines = Array.from({ length: 26 }, (_, i) => {
    const yy = random(`${seed}y${i}`) * height;
    const w = width * (0.25 + random(`${seed}w${i}`) * 0.5);
    const th = 1 + random(`${seed}t${i}`) * height * 0.006;
    const start = random(`${seed}x${i}`) * width;
    const xx = ((start + dir * p * width * 1.6) % (width * 1.5)) - width * 0.25;
    return { yy, w, th, xx, white: i % 3 === 0 };
  });
  return (
    <AbsoluteFill style={{ opacity, pointerEvents: "none" }}>
      {lines.map((l, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: l.xx,
            top: l.yy,
            width: l.w,
            height: l.th,
            borderRadius: l.th,
            background: `linear-gradient(${dir > 0 ? 90 : 270}deg, transparent, ${l.white ? "#fff" : color})`,
          }}
        />
      ))}
    </AbsoluteFill>
  );
};

/** Whip offset for a shot entering: returns x offset (fraction of width) and blur in px for frame f. */
export const whipIn = (f: number, dir: 1 | -1 = 1, len = 7) => {
  const p = interpolate(f, [0, len], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const eased = p * p * p;
  // 0.3 (not 0.9): on frame 0 the incoming layer is already half on screen, motion-blurred, so a cut never
  // shows an empty stage between two whips.
  return { dx: dir * eased * 0.3, blur: eased * 28 };
};

export const whipOut = (f: number, at: number, dir: 1 | -1 = -1, len = 6) => {
  const p = interpolate(f, [at, at + len], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const eased = p * p * p;
  return { dx: dir * eased * 0.9, blur: eased * 24 };
};
