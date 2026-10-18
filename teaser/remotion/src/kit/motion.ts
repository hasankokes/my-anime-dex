import { Easing, interpolate, spring } from "remotion";
import { BEAT, EASE_IN, EASE_OUT } from "../theme";

export const easeOut = Easing.bezier(...EASE_OUT);
export const easeIn = Easing.bezier(...EASE_IN);
export const easeInOut = Easing.bezier(0.65, 0, 0.35, 1);
export const drift = Easing.bezier(0.33, 0, 0.2, 1);

/** Clamped interpolate with easing (default expo-out). */
export const lerp = (f: number, a: number, b: number, from: number, to: number, e = easeOut) =>
  interpolate(f, [a, b], [from, to], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: e });

/** 0→1 progress between frames a and b. */
export const prog = (f: number, a: number, b: number, e = easeOut) => lerp(f, a, b, 0, 1, e);

/** UI pop (matches the app's own overshoot on the Dice result card). */
export const pop = (f: number, at: number, fps: number, cfg = { damping: 14, stiffness: 180 }) =>
  spring({ frame: f - at, fps, config: cfg });

/** Softer settle for large layers. */
export const settle = (f: number, at: number, fps: number) =>
  spring({ frame: f - at, fps, config: { damping: 20, stiffness: 120, mass: 1 } });

/** Beat n (0-based) in shot-local frames; grid = 15f at 120 BPM. */
export const beat = (n: number) => n * BEAT;
