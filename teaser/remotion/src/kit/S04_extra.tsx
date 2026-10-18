/**
 * Helpers for PROMO shots S04 Lists, S05 Profile, S06 Dice (owner: S04–S06 agent).
 * Built only from kit tokens/components; no shared kit file is modified.
 */
import { AbsoluteFill } from "remotion";
import { C, SCREEN_ASPECT } from "../theme";
import { poppins } from "../lib/fonts";
import { useLayout, usePt } from "./layout";
import { Card, Icon, MyScoreBadge, StarScore, Thumb } from "./ui";
import { easeIn, prog } from "./motion";
import { L3 } from "./Space";

/** Poppins text (kit `T` is private to ui.tsx). */
export const Txt: React.FC<{ s: number; w?: 500 | 600 | 700; c?: string; children: React.ReactNode; style?: React.CSSProperties }> = ({
  s,
  w = 600,
  c = C.text,
  children,
  style,
}) => <div style={{ fontFamily: poppins, fontWeight: w, fontSize: s, color: c, lineHeight: 1.2, whiteSpace: "nowrap", ...style }}>{children}</div>;

/** A point on the captured screen (fractions sx, sy) → frame px, for a Phone at (px, py) with height ph and scale. */
export const screenPt = (px: number, py: number, ph: number, scale: number, sx: number, sy: number) => ({
  x: px + (sx - 0.5) * ph * SCREEN_ASPECT * scale,
  y: py + (sy - 0.5) * ph * scale,
});

/** Beat accent: rises over the 2f before `at`, peaks exactly on `at` (the beat), decays by `at + len - 2`. */
export const punch = (f: number, at: number, len = 9) => {
  const k = f - at + 2;
  if (k < 0) return 0;
  if (k < 2) return k / 2;
  return Math.max(0, 1 - (k - 2) / (len - 2)) ** 2;
};

/** Exit acceleration over the last `n` frames (0 → 1, easeIn). */
export const exitP = (f: number, len: number, n = 4) => prog(f, len - n, len, easeIn);

/** Rolling rank number "#a" → "#b" (p 0..1). */
const RankNum: React.FC<{ from: number; to: number; p: number }> = ({ from, to, p }) => {
  const pt = usePt();
  const h = pt(22);
  const col = (n: number) => (n === 1 ? C.primary : C.subtext);
  const cell = (n: number, off: number, o: number) => (
    <div style={{ position: "absolute", left: 0, right: 0, top: off, height: h, opacity: o, display: "flex", justifyContent: "center", alignItems: "center" }}>
      <Txt s={pt(16)} w={700} c={col(n)}>
        #{n}
      </Txt>
    </div>
  );
  return (
    <div style={{ position: "relative", width: pt(26), height: h, overflow: "hidden", flexShrink: 0 }}>
      {from === to ? (
        cell(to, 0, 1)
      ) : (
        <>
          {cell(from, -p * h, 1 - p)}
          {cell(to, (1 - p) * h, p)}
        </>
      )}
    </div>
  );
};

/** Custom-list row (wider variant of kit ListRow so long titles fit; animatable rank + badge punch). */
export const RankRow: React.FC<{
  rankFrom: number;
  rankTo: number;
  rankP: number;
  title: string;
  thumb: string;
  star: string;
  my: number;
  comment: string;
  lifted?: number;
  badge?: number;
  w?: number;
}> = ({ rankFrom, rankTo, rankP, title, thumb, star, my, comment, lifted = 0, badge = 0, w = 356 }) => {
  const pt = usePt();
  return (
    <Card
      w={w}
      pad={8}
      glow={lifted}
      style={{
        border: lifted > 0.02 ? `${pt(1.2)}px solid rgba(250,204,21,${Math.min(1, lifted * 1.4)})` : undefined,
        overflow: "visible",
        boxShadow: `0 ${pt(12)}px ${pt(26)}px rgba(0,0,0,0.5)${lifted > 0.01 ? `, 0 0 ${pt(40)}px rgba(250,204,21,${0.35 * lifted})` : ""}`,
      }}
    >
      <div style={{ display: "flex", gap: pt(9), alignItems: "center" }}>
        <RankNum from={rankFrom} to={rankTo} p={rankP} />
        <Thumb src={thumb} w={50} h={68} r={8} />
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: pt(5) }}>
          <Txt s={pt(13)} w={600}>
            {title}
          </Txt>
          <div style={{ display: "flex", gap: pt(6), alignItems: "center" }}>
            <StarScore value={star} />
            <div
              style={{
                transform: `scale(${1 + 0.5 * badge})`,
                transformOrigin: "0% 50%",
                borderRadius: pt(5),
                boxShadow: badge > 0.01 ? `0 0 ${pt(18) * badge}px rgba(250,204,21,${0.9 * badge})` : undefined,
              }}
            >
              <MyScoreBadge score={my} />
            </div>
          </div>
          <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: pt(6), padding: `${pt(3)}px ${pt(6)}px` }}>
            <Txt s={pt(10)} w={500} c={C.subtext}>
              “{comment}”
            </Txt>
          </div>
        </div>
        <Icon name="reorder-two" size={pt(18)} color={lifted > 0.5 ? C.primary : C.subtext} />
      </div>
    </Card>
  );
};

/** Small grey genre pill (Dice result card). */
export const GenrePill: React.FC<{ label: string }> = ({ label }) => {
  const pt = usePt();
  return (
    <div style={{ padding: `${pt(3)}px ${pt(9)}px`, borderRadius: 999, background: C.border }}>
      <Txt s={pt(10.5)} w={500} c={C.text}>
        {label}
      </Txt>
    </div>
  );
};

/** Yellow "★ 8.4" score pill (Dice result card). */
export const ScorePill: React.FC<{ value: string }> = ({ value }) => {
  const pt = usePt();
  return (
    <div style={{ display: "flex", alignItems: "center", gap: pt(3), padding: `${pt(3)}px ${pt(8)}px`, borderRadius: pt(6), background: C.primary }}>
      <Icon name="star" size={pt(12)} color="#111827" />
      <Txt s={pt(12)} w={700} c="#111827">
        {value}
      </Txt>
    </div>
  );
};

/** Camera orbit without a shared 3D context: rotate a layer centre (x, y, z[u]) around pivot (px, py, 0)
 *  by rotX/rotY (same convention as CSS `rotateX() rotateY()`). Give the layer the same rotX/rotY. */
export const orbit = (px: number, py: number, rotX: number, rotY: number, u: number, x: number, y: number, z: number) => {
  const ay = (rotY * Math.PI) / 180;
  const ax = (rotX * Math.PI) / 180;
  const dx = x - px;
  const dy = y - py;
  const dz = z * u;
  // rotateY
  const x1 = dx * Math.cos(ay) + dz * Math.sin(ay);
  const z1 = -dx * Math.sin(ay) + dz * Math.cos(ay);
  // rotateX
  const y2 = dy * Math.cos(ax) - z1 * Math.sin(ax);
  const z2 = dy * Math.sin(ax) + z1 * Math.cos(ax);
  return { x: px + x1, y: py + y2, z: z2 / u };
};

/**
 * Breakout layer for flat UI (cards, chips, badges). Built like lib/Phone: its own perspective root
 * (origin = frame centre, same projection as Space3D) and ONE real-sized element carrying the whole
 * transform. Paint order = DOM order, so render layers sorted back→front. Lighter on the compositor
 * than Layer3D (no shared preserve-3d context); use Layer3D only for true-3D content (the die).
 */
export const Card3D: React.FC<L3 & { perspective: number; children: React.ReactNode }> = ({
  perspective,
  x,
  y,
  z = 0,
  rotX = 0,
  rotY = 0,
  rotZ = 0,
  scale = 1,
  opacity = 1,
  blur = 0,
  shadow = 0,
  children,
}) => {
  const { u } = useLayout();
  const sh = shadow * Math.max(0.25, Math.min(1.5, 0.6 + z / 400));
  const filter =
    [blur ? `blur(${blur}px)` : "", sh ? `drop-shadow(0 ${30 * u * sh}px ${50 * u * sh}px rgba(0,0,0,${0.55 * Math.min(1, sh)}))` : ""].join(" ").trim() ||
    undefined;
  return (
    <AbsoluteFill style={{ perspective, perspectiveOrigin: "50% 50%", pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          left: x,
          top: y,
          transform: `translate(-50%, -50%) translateZ(${z * u}px) rotateX(${rotX}deg) rotateY(${rotY}deg) rotateZ(${rotZ}deg) scale(${scale})`,
          opacity,
          filter,
        }}
      >
        {children}
      </div>
    </AbsoluteFill>
  );
};

/** fx.Glow without the CSS blur filter (the radial gradient is already soft; filters cost GPU memory). */
export const SoftGlow: React.FC<{ x: number; y: number; r: number; color?: string; opacity?: number }> = ({ x, y, r, color = C.primary, opacity = 0.35 }) => (
  <div
    style={{
      position: "absolute",
      left: x - r,
      top: y - r,
      width: r * 2,
      height: r * 2,
      borderRadius: "50%",
      background: `radial-gradient(circle, ${color} 0%, transparent 68%)`,
      opacity,
      pointerEvents: "none",
    }}
  />
);

/** Card drop shadow as box-shadow (painted inside the layer, no filter surface). */
export const cardShadow = (u: number, k = 1) => `0 ${28 * u * k}px ${56 * u * k}px rgba(0,0,0,${0.5 * Math.min(1, k)})`;
