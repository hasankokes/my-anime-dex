/**
 * Recreated app UI as original vector motion graphics. Every visual value comes from the app's
 * theme (src/theme.ts ← context/ThemeContext.tsx) and the screen styles observed in captures.
 * Sizes are in app points; pass them through usePt() so they scale with the format.
 * Only represent features that exist in the app (see docs/feature_inventory.md).
 */
import { Img, staticFile } from "remotion";
import { C } from "../theme";
import { poppins } from "../lib/fonts";
import { usePt } from "./layout";

export const Icon: React.FC<{ name: string; size: number; color?: string; style?: React.CSSProperties }> = ({
  name,
  size,
  color = C.primary,
  style,
}) => (
  <div
    style={{
      position: "relative",
      width: size,
      height: size,
      backgroundColor: color,
      WebkitMaskImage: `url(${staticFile(`icons/${name}.svg`)})`,
      WebkitMaskSize: "contain",
      WebkitMaskRepeat: "no-repeat",
      WebkitMaskPosition: "center",
      ...style,
    }}
  >
    {/* CSS masks aren't awaited by Remotion; a hidden <Img> of the same SVG makes the frame wait for it */}
    <Img src={staticFile(`icons/${name}.svg`)} style={{ position: "absolute", width: 1, height: 1, opacity: 0 }} />
  </div>
);

const T: React.FC<{ s: number; w?: 500 | 600 | 700; c?: string; children: React.ReactNode; style?: React.CSSProperties }> = ({
  s,
  w = 600,
  c = C.text,
  children,
  style,
}) => (
  <div style={{ fontFamily: poppins, fontWeight: w, fontSize: s, color: c, lineHeight: 1.2, whiteSpace: "nowrap", ...style }}>{children}</div>
);

/** App card surface: #1F2937, 1px #374151 hairline, radius 16pt. */
export const Card: React.FC<{ w: number; h?: number; pad?: number; glow?: number; children?: React.ReactNode; style?: React.CSSProperties }> = ({
  w,
  h,
  pad = 14,
  glow = 0,
  children,
  style,
}) => {
  const pt = usePt();
  return (
    <div
      style={{
        width: pt(w),
        height: h ? pt(h) : undefined,
        padding: pt(pad),
        boxSizing: "border-box",
        borderRadius: pt(16),
        background: C.card,
        border: `${Math.max(1, pt(0.6))}px solid ${C.border}`,
        boxShadow: glow ? `0 0 ${pt(40)}px rgba(250,204,21,${0.35 * glow})` : undefined,
        position: "relative",
        overflow: "hidden",
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export const Thumb: React.FC<{ src: string; w: number; h: number; r?: number }> = ({ src, w, h, r = 10 }) => {
  const pt = usePt();
  return <Img src={staticFile(`thumbs/${src}.png`)} style={{ width: pt(w), height: pt(h), borderRadius: pt(r), objectFit: "cover", display: "block" }} />;
};

/** Yellow progress bar on a #374151 track (Watching tab, level bar). value 0..1 */
export const ProgressBar: React.FC<{ w: number; h?: number; value: number; color?: string; glow?: boolean }> = ({
  w,
  h = 6,
  value,
  color = C.primary,
  glow = true,
}) => {
  const pt = usePt();
  return (
    <div style={{ width: pt(w), height: pt(h), borderRadius: pt(h), background: C.border, overflow: "hidden" }}>
      <div
        style={{
          width: `${Math.max(0, Math.min(1, value)) * 100}%`,
          height: "100%",
          borderRadius: pt(h),
          background: color,
          boxShadow: glow ? `0 0 ${pt(10)}px ${color}` : undefined,
        }}
      />
    </div>
  );
};

/** Watching tab card: poster, title, "Ep x / y", −/+ controls, %, progress bar. */
export const WatchingCard: React.FC<{ title: string; thumb: string; ep: number; total: number; barValue?: number; plusPressed?: number }> = ({
  title,
  thumb,
  ep,
  total,
  barValue,
  plusPressed = 0,
}) => {
  const pt = usePt();
  const v = barValue ?? ep / total;
  return (
    <Card w={360} pad={10}>
      <div style={{ display: "flex", gap: pt(12) }}>
        <Thumb src={thumb} w={84} h={84} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", minWidth: 0 }}>
          <T s={pt(13)} w={600} style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{title}</T>
          <T s={pt(11)} w={600} c={C.primary}>Ep {ep} / {total}</T>
          <div style={{ display: "flex", alignItems: "center", gap: pt(8) }}>
            <Icon name="remove-circle-outline" size={pt(18)} color={C.text} />
            <T s={pt(11)} w={600}>Episode {ep}</T>
            <Icon name="add-circle-outline" size={pt(18)} color={plusPressed ? C.primary : C.text} style={{ transform: `scale(${1 + plusPressed * 0.25})` }} />
            <div style={{ flex: 1 }} />
            <T s={pt(10)} w={500} c={C.subtext}>{Math.round(v * 100)}%</T>
          </div>
          <ProgressBar w={250} value={v} />
        </div>
      </div>
    </Card>
  );
};

/** Calendar countdown badge: primary @ 20% fill, primary text. */
export const CountdownBadge: React.FC<{ text: string; scale?: number }> = ({ text, scale = 1 }) => {
  const pt = usePt();
  return (
    <div style={{ display: "inline-block", padding: `${pt(3 * scale)}px ${pt(8 * scale)}px`, borderRadius: pt(6 * scale), background: "rgba(250,204,21,0.2)" }}>
      <T s={pt(12 * scale)} w={600} c={C.primary}>{text}</T>
    </div>
  );
};

/** Calendar card: poster, title, local time (yellow) + countdown badge, EP. */
export const CalendarCard: React.FC<{ title: string; thumb: string; time: string; countdown: string; ep: number }> = ({ title, thumb, time, countdown, ep }) => {
  const pt = usePt();
  return (
    <Card w={360} pad={10}>
      <div style={{ display: "flex", gap: pt(12), alignItems: "center" }}>
        <Thumb src={thumb} w={56} h={72} r={8} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <T s={pt(13)} w={600} style={{ marginBottom: pt(10), overflow: "hidden", textOverflow: "ellipsis" }}>{title}</T>
          <div style={{ display: "flex", alignItems: "center", gap: pt(8) }}>
            <T s={pt(12)} w={600} c={C.primary}>{time}</T>
            <CountdownBadge text={countdown} />
            <div style={{ flex: 1 }} />
            <T s={pt(10)} w={500} c={C.subtext}>EP: {ep}</T>
          </div>
        </div>
      </div>
    </Card>
  );
};

/** Day chip (Calendar) / filter chip (Favorites, Home). */
export const Chip: React.FC<{ label: string; active?: boolean; scale?: number }> = ({ label, active, scale = 1 }) => {
  const pt = usePt();
  return (
    <div
      style={{
        display: "inline-block",
        padding: `${pt(7 * scale)}px ${pt(18 * scale)}px`,
        borderRadius: 999,
        background: active ? C.primary : C.card,
        border: active ? "none" : `${Math.max(1, pt(0.6))}px solid ${C.border}`,
      }}
    >
      <T s={pt(13 * scale)} w={500} c={active ? "#111827" : C.subtext}>{label}</T>
    </div>
  );
};

/** Solid yellow "My Score: n" badge from custom lists. */
export const MyScoreBadge: React.FC<{ score: number; scale?: number }> = ({ score, scale = 1 }) => {
  const pt = usePt();
  return (
    <div style={{ display: "inline-block", padding: `${pt(2 * scale)}px ${pt(7 * scale)}px`, borderRadius: pt(5 * scale), background: C.primary }}>
      <T s={pt(10 * scale)} w={700} c="#111827">My Score: {score}</T>
    </div>
  );
};

export const StarScore: React.FC<{ value: string; scale?: number }> = ({ value, scale = 1 }) => {
  const pt = usePt();
  return (
    <div style={{ display: "flex", alignItems: "center", gap: pt(3 * scale) }}>
      <Icon name="star" size={pt(11 * scale)} />
      <T s={pt(11 * scale)} w={600} c={C.subtext}>{value}</T>
    </div>
  );
};

/** Custom-list row: rank number, poster, title, ★, My Score, quoted comment, reorder handle. */
export const ListRow: React.FC<{ rank: number; title: string; thumb: string; star: string; my: number; comment: string; lifted?: number }> = ({
  rank,
  title,
  thumb,
  star,
  my,
  comment,
  lifted = 0,
}) => {
  const pt = usePt();
  return (
    <Card w={360} pad={8} glow={lifted} style={{ border: lifted ? `${pt(1.2)}px solid ${C.primary}` : undefined }}>
      <div style={{ display: "flex", gap: pt(10), alignItems: "center" }}>
        <T s={pt(16)} w={700} c={rank === 1 ? C.primary : C.subtext} style={{ width: pt(26), textAlign: "center" }}>#{rank}</T>
        <Thumb src={thumb} w={52} h={70} r={8} />
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: pt(5) }}>
          <T s={pt(13)} w={600} style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{title}</T>
          <div style={{ display: "flex", gap: pt(6), alignItems: "center" }}>
            <StarScore value={star} />
            <MyScoreBadge score={my} />
          </div>
          <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: pt(6), padding: `${pt(3)}px ${pt(6)}px` }}>
            <T s={pt(10)} w={500} c={C.subtext}>“{comment}”</T>
          </div>
        </div>
        <Icon name="reorder-two" size={pt(20)} color={C.subtext} />
      </div>
    </Card>
  );
};

/** Rank + level line + XP bar (Profile). Rank colours from lib/levelSystem.ts. */
export const LevelBlock: React.FC<{ rank: string; color: string; level: number; xp: number; xpMax: number; barValue?: number }> = ({
  rank,
  color,
  level,
  xp,
  xpMax,
  barValue,
}) => {
  const pt = usePt();
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: pt(6) }}>
      <div style={{ display: "flex", alignItems: "center", gap: pt(6) }}>
        <T s={pt(14)} w={700} c={color} style={{ letterSpacing: "0.08em" }}>{rank}</T>
        <Icon name="trophy" size={pt(15)} color={color} />
      </div>
      <T s={pt(11)} w={500} c={C.subtext}>Level {level} • {xp}/{xpMax} XP</T>
      <ProgressBar w={280} h={12} value={barValue ?? xp / xpMax} color={color} />
    </div>
  );
};

export const Stat: React.FC<{ n: number | string; label: string }> = ({ n, label }) => {
  const pt = usePt();
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <T s={pt(20)} w={700}>{n}</T>
      <T s={pt(10)} w={500} c={C.subtext}>{label}</T>
    </div>
  );
};
