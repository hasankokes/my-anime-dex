/**
 * Helpers for S01–S03 breakouts (owner: S01–S03 agent).
 *
 * PhoneSpace replicates the exact 3D transform of <Phone> so children placed in *screen-local px*
 * sit precisely on top of the captured UI. A breakout then starts at its on-screen spot with the
 * phone's own rotation/size and lifts towards the camera from there (ANIMATION_GUIDE "Lift").
 */
import { AbsoluteFill, useVideoConfig } from "remotion";
import { C, SCREEN_ASPECT } from "../theme";
import { poppins } from "../lib/fonts";
import type { Cam } from "../lib/Phone";
import { Icon } from "./ui";
import { usePt } from "./layout";

export type Rect = { left: number; top: number; pw: number; ph: number };

export const phoneRect = (cam: Cam, W: number, H: number): Rect => {
  const ph = H * (cam.h ?? 0.86);
  const pw = ph * SCREEN_ASPECT;
  return { left: W * (cam.x ?? 0.5) - pw / 2, top: H * (cam.y ?? 0.5) - ph / 2, pw, ph };
};

/** Screen fraction (sx, sy) of the *capture* → screen-local px (accounts for Phone zoom/focusY). */
export const screenPt = (cam: Cam, r: Rect, sx: number, sy: number) => {
  const zoom = cam.zoom ?? 1;
  const fy = cam.focusY ?? 0.5;
  return { x: r.pw * (0.5 + (sx - 0.5) * zoom), y: r.ph * (fy + (sy - fy) * zoom) };
};

/** Frame fraction (fx, fy) → screen-local px (ignores phone rotation; good enough for targets). */
export const framePt = (cam: Cam, r: Rect, W: number, H: number, fx: number, fy: number) => {
  const s = cam.scale ?? 1;
  const cx = r.left + r.pw / 2;
  const cy = r.top + r.ph / 2;
  return { x: r.pw / 2 + (fx * W - cx) / s, y: r.ph / 2 + (fy * H - cy) / s };
};

/** Scale at which a kit element (drawn via usePt) matches its on-phone size. */
export const onPhoneScale = (r: Rect, u: number) => r.pw / 440 / (2.2 * u);

/** A 3D space aligned with <Phone cam>. Render it AFTER the Phone. */
export const PhoneSpace: React.FC<{ cam: Cam; children: React.ReactNode }> = ({ cam, children }) => {
  const { width: W, height: H } = useVideoConfig();
  const r = phoneRect(cam, W, H);
  return (
    <AbsoluteFill style={{ perspective: H * 2.2, pointerEvents: "none", opacity: cam.opacity ?? 1 }}>
      <div
        style={{
          position: "absolute",
          left: r.left,
          top: r.top,
          width: r.pw,
          height: r.ph,
          transformStyle: "preserve-3d",
          transform: `rotateX(${cam.rotX ?? 0}deg) rotateY(${cam.rotY ?? 0}deg) rotateZ(${cam.rotZ ?? 0}deg) scale(${cam.scale ?? 1})`,
          filter: cam.blurPx && cam.blurPx > 0.5 ? `blur(${cam.blurPx}px)` : undefined,
        }}
      >
        {children}
      </div>
    </AbsoluteFill>
  );
};

/** One breakout element in phone-local px. z in px (local), shadow 0..1. */
export const Lifted: React.FC<{
  x: number;
  y: number;
  z?: number;
  rotX?: number;
  rotY?: number;
  rotZ?: number;
  scale?: number;
  opacity?: number;
  shadow?: number;
  glow?: number;
  children: React.ReactNode;
}> = ({ x, y, z = 0, rotX = 0, rotY = 0, rotZ = 0, scale = 1, opacity = 1, shadow = 0, glow = 0, children }) => {
  const { height: H } = useVideoConfig();
  const k = H / 1080;
  const sh = Math.max(0, shadow);
  const filters = [
    sh > 0.01 ? `drop-shadow(0 ${(8 + 34 * sh) * k}px ${(14 + 46 * sh) * k}px rgba(0,0,0,${0.25 + 0.35 * Math.min(1, sh)}))` : "",
    glow > 0.01 ? `drop-shadow(0 0 ${28 * k}px rgba(250,204,21,${0.55 * glow}))` : "",
  ]
    .join(" ")
    .trim();
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: 0,
        height: 0,
        transformStyle: "preserve-3d",
        transform: `translateZ(${z}px) rotateX(${rotX}deg) rotateY(${rotY}deg) rotateZ(${rotZ}deg) scale(${scale})`,
        opacity,
      }}
    >
      <div style={{ position: "absolute", transform: "translate(-50%, -50%)", filter: filters || undefined }}>{children}</div>
    </div>
  );
};

/** Darkens the spot a lifted element left on the captured screen (the only allowed capture alteration). */
export const Hole: React.FC<{ x: number; y: number; w: number; h: number; r: number; o: number }> = ({ x, y, w, h, r, o }) =>
  o <= 0.01 ? null : (
    <div style={{ position: "absolute", left: x - w / 2, top: y - h / 2, width: w, height: h, borderRadius: r, background: C.bg, opacity: o }} />
  );

/** Text that rolls vertically from `from` to `to` (p 0→1), like a slot counter. */
export const Roll: React.FC<{ from: string; to: string; p: number; style?: React.CSSProperties }> = ({ from, to, p, style }) => {
  if (p <= 0) return <span style={style}>{from}</span>;
  if (p >= 1) return <span style={style}>{to}</span>;
  return (
    <span style={{ position: "relative", display: "inline-block", overflow: "hidden", verticalAlign: "bottom", ...style }}>
      <span style={{ visibility: "hidden" }}>{to.length >= from.length ? to : from}</span>
      <span style={{ position: "absolute", left: 0, top: 0, transform: `translateY(${-p * 100}%)`, opacity: 1 - p }}>{from}</span>
      <span style={{ position: "absolute", left: 0, top: 0, transform: `translateY(${(1 - p) * 100}%)`, opacity: p }}>{to}</span>
    </span>
  );
};

/** Home "★ 7.9" score pill (trending row / grid cards), redrawn as a floating badge. */
export const ScoreBadge: React.FC<{ value: string; scale?: number; lit?: number }> = ({ value, scale = 1, lit = 0 }) => {
  const pt = usePt();
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: pt(4 * scale),
        padding: `${pt(4 * scale)}px ${pt(10 * scale)}px`,
        borderRadius: 999,
        background: C.card,
        border: `${Math.max(1, pt(0.7 * scale))}px solid ${lit > 0.01 ? `rgba(250,204,21,${0.35 + 0.5 * lit})` : C.border}`,
      }}
    >
      <Icon name="star" size={pt(13 * scale)} />
      <div style={{ fontFamily: poppins, fontWeight: 700, fontSize: pt(14 * scale), color: C.text, lineHeight: 1.2 }}>{value}</div>
    </div>
  );
};

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
export const mix = (a: number, b: number, t: number) => a + (b - a) * t;
