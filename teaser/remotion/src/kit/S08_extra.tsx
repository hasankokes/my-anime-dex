/**
 * S08 Payoff helpers (owner: S07/S08 agent). Compact fragments of the recreated app UI, sized so
 * every line of text stays ≥ 12pt (≥ 22px at 1080 when drawn at scale ≥ 0.85). Values = S02–S06 captures.
 */
import { C } from "../theme";
import { poppins } from "../lib/fonts";
import { usePt } from "./layout";
import { Card, CountdownBadge, Icon, MyScoreBadge, ProgressBar, StarScore, Thumb } from "./ui";

const Tx: React.FC<{ s: number; w?: 500 | 600 | 700; c?: string; children: React.ReactNode; style?: React.CSSProperties }> = ({ s, w = 600, c = C.text, children, style }) => (
  <div style={{ fontFamily: poppins, fontWeight: w, fontSize: s, color: c, lineHeight: 1.2, whiteSpace: "nowrap", ...style }}>{children}</div>
);

/** Watching fragment: small poster, title, "Ep x / y", %, bar (S02). */
export const WatchFrag: React.FC<{ title: string; thumb: string; ep: number; total: number }> = ({ title, thumb, ep, total }) => {
  const pt = usePt();
  const v = ep / total;
  return (
    <Card w={214} pad={9}>
      <div style={{ display: "flex", gap: pt(9), alignItems: "center" }}>
        <Thumb src={thumb} w={40} h={52} r={7} />
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: pt(4) }}>
          <Tx s={pt(12)} style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{title}</Tx>
          <div style={{ display: "flex", alignItems: "center" }}>
            <Tx s={pt(12)} c={C.primary}>Ep {ep} / {total}</Tx>
            <div style={{ flex: 1 }} />
            <Tx s={pt(11)} w={500} c={C.subtext}>{Math.round(v * 100)}%</Tx>
          </div>
          <ProgressBar w={140} h={5} value={v} />
        </div>
      </div>
    </Card>
  );
};

/** Custom-list fragment (S04). */
export const ListFrag: React.FC<{ rank: number; title: string; thumb: string; star: string; my: number }> = ({ rank, title, thumb, star, my }) => {
  const pt = usePt();
  return (
    <Card w={226} pad={8} style={{ border: `${pt(1)}px solid ${C.primary}`, boxShadow: `0 0 ${pt(22)}px rgba(250,204,21,0.25)` }}>
      <div style={{ display: "flex", gap: pt(8), alignItems: "center" }}>
        <Tx s={pt(16)} w={700} c={C.primary}>#{rank}</Tx>
        <Thumb src={thumb} w={36} h={48} r={6} />
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: pt(5) }}>
          <Tx s={pt(12)}>{title}</Tx>
          <div style={{ display: "flex", gap: pt(6), alignItems: "center" }}>
            <StarScore value={star} scale={1.1} />
            <MyScoreBadge score={my} scale={1.2} />
          </div>
        </div>
      </div>
    </Card>
  );
};

/** Calendar fragment, text only (no thumbs exist for these titles) (S03). */
export const AiringFrag: React.FC<{ title: string; time: string; countdown: string; ep: number }> = ({ title, time, countdown, ep }) => {
  const pt = usePt();
  return (
    <Card w={196} pad={10}>
      <div style={{ display: "flex", alignItems: "center", gap: pt(6), marginBottom: pt(6) }}>
        <Icon name="calendar" size={pt(13)} color={C.subtext} />
        <Tx s={pt(12)}>{title}</Tx>
        <div style={{ flex: 1 }} />
        <Tx s={pt(11)} w={500} c={C.subtext}>EP: {ep}</Tx>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: pt(8) }}>
        <Tx s={pt(12)} c={C.primary}>{time}</Tx>
        <CountdownBadge text={countdown} />
      </div>
    </Card>
  );
};

/** Profile fragment: rank, level, XP bar (S05). */
export const LevelFrag: React.FC<{ rank: string; color: string; level: number; xp: number; xpMax: number }> = ({ rank, color, level, xp, xpMax }) => {
  const pt = usePt();
  return (
    <Card w={184} pad={11}>
      <div style={{ display: "flex", alignItems: "center", gap: pt(6), marginBottom: pt(3) }}>
        <Tx s={pt(13)} w={700} c={color} style={{ letterSpacing: "0.08em" }}>{rank}</Tx>
        <Icon name="trophy" size={pt(14)} color={color} />
      </div>
      <Tx s={pt(11)} w={500} c={C.subtext} style={{ marginBottom: pt(7) }}>Level {level} • {xp}/{xpMax} XP</Tx>
      <ProgressBar w={162} h={7} value={xp / xpMax} color={color} />
    </Card>
  );
};

/** Stat pill with icon (Profile stats row). */
export const StatPill: React.FC<{ icon: string; n: number; label: string }> = ({ icon, n, label }) => {
  const pt = usePt();
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: pt(6), padding: `${pt(6)}px ${pt(12)}px ${pt(6)}px ${pt(8)}px`, borderRadius: 999, background: C.card, border: `${Math.max(1, pt(0.6))}px solid ${C.border}` }}>
      <Icon name={icon} size={pt(15)} color={C.primary} />
      <Tx s={pt(14)} w={700}>{n}</Tx>
      <Tx s={pt(12)} w={500} c={C.subtext}>{label}</Tx>
    </div>
  );
};

/** Soft yellow halo ring behind the phone (no flare: blurred ring + core glow). */
export const Halo: React.FC<{ x: number; y: number; r: number; p: number; flash?: number }> = ({ x, y, r, p, flash = 0 }) => (
  <>
    <div
      style={{
        position: "absolute",
        left: x - r * 1.5,
        top: y - r * 1.5,
        width: r * 3,
        height: r * 3,
        borderRadius: "50%",
        background: `radial-gradient(circle, rgba(250,204,21,${0.34 + 0.2 * flash}) 0%, rgba(250,204,21,0.12) 38%, rgba(250,204,21,0) 66%)`,
        opacity: p,
        pointerEvents: "none",
      }}
    />
    <div
      style={{
        position: "absolute",
        left: x - r,
        top: y - r,
        width: r * 2,
        height: r * 2,
        borderRadius: "50%",
        border: `${r * 0.035}px solid ${C.primary}`,
        filter: `blur(${r * 0.045}px)`,
        opacity: p * (0.45 + 0.35 * flash),
        transform: `scale(${0.85 + 0.15 * p + 0.04 * flash})`,
        pointerEvents: "none",
      }}
    />
  </>
);
