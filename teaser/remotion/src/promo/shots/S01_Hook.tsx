import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import { Caption } from "../../lib/Caption";
import { Cam, Phone } from "../../lib/Phone";
import { Screen } from "../../kit/screen";
import { useLayout } from "../../kit/layout";
import { drift, easeIn, lerp, pop, prog } from "../../kit/motion";
import { Chip } from "../../kit/ui";
import { BurstRays, Glow } from "../../kit/fx";
import { clamp01, framePt, Hole, Lifted, mix, onPhoneScale, PhoneSpace, phoneRect, ScoreBadge, screenPt } from "../../kit/S01_extra";

export const S01_LEN = 60;

// Home capture (c01_home @1.0s), positions as screen fractions.
const CHIP_Y = 0.639;
const CHIPS = [
  { label: "All", sx: 0.094, w: 0.098, active: true },
  { label: "Action", sx: 0.242, w: 0.162 },
  { label: "Adventure", sx: 0.455, w: 0.226 },
  { label: "Comedy", sx: 0.683, w: 0.198 },
  { label: "Drama", sx: 0.886, w: 0.17 },
];
const SCORE_Y = 0.536;
const SCORES = [
  { value: "6.7", sx: 0.111 },
  { value: "7.9", sx: 0.455 },
  { value: "7.6", sx: 0.80 },
];

/**
 * S01 Hook — side A, 60f.
 * f0  stage only (= last frame of the film for the web loop) → phone snaps in by f3, burst flash f1–8.
 * f3–15 the yellow "All" chip lifts out and lands on beat 15 (pulse); the category chips follow in a wave (→ f23).
 * f4  "Your anime."   f19 "All of it."
 * f18–34 the trending ★ scores pop out around the phone; first lands on beat 30 + accent flash.
 * f57–60 everything accelerates left into S02's whip.
 */
export const S01: React.FC = () => {
  const f = useCurrentFrame();
  const { fps, width: W, height: H } = useVideoConfig();
  const L = useLayout("A");
  const land = L.landscape;
  const u = L.u;

  // ── camera ──
  const snap = pop(f, 0, fps, { damping: 16, stiffness: 260 });
  const cam: Cam = {
    x: L.phone.x / W,
    y: L.phone.y / H,
    h: L.phone.h / H,
    scale: mix(1.4, 1, snap) * lerp(f, 0, 60, 1, land ? 1.04 : 1.03, drift),
    rotY: lerp(f, 0, 60, land ? -16 : -10, land ? -8 : -4, drift),
    rotX: lerp(f, 0, 60, 7, 4, drift),
    opacity: prog(f, 0, 3),
  };
  const r = phoneRect(cam, W, H);
  const s0 = onPhoneScale(r, u);
  const pcx = r.left + r.pw / 2;
  const pcy = r.top + r.ph / 2;

  // exit: last 3 frames accelerate left (S02 whips in from the right)
  const ex = lerp(f, 57, 60, 0, 1, easeIn);

  // ── chip wave ──
  // Lifted chips form a floating arc in front of the phone's lower half (widths estimated from the
  // label length in app pt, so the row stays inside the frame in both formats).
  const chipScale = land ? 1.0 : 1.12;
  const pt = 2.2 * u * chipScale;
  const widths = CHIPS.map((c) => (c.label.length * 7.6 + 36) * pt * (c.active ? 1.15 : 1));
  const gap = 14 * pt;
  // landscape: one arc of 5; portrait: 3 + 2 on two staggered rows
  const rows = land ? [[0, 1, 2, 3, 4]] : [[0, 1, 2], [3, 4]];
  const chipTargets: { fx: number; fy: number; z: number }[] = [];
  rows.forEach((row, ri) => {
    const rowW = row.reduce((a2, i) => a2 + widths[i], 0) + gap * (row.length - 1);
    const rowCx = land ? Math.min(W - rowW / 2 - 40 * u, r.left + r.pw * 0.5) : W / 2 + (ri ? 60 : -30) * u;
    const rowY = land ? H * 0.8 : r.top + r.ph * (0.70 + ri * 0.085);
    let acc = rowCx - rowW / 2;
    row.forEach((i, k) => {
      const cx = acc + widths[i] / 2;
      acc += widths[i] + gap;
      const d = (cx - rowCx) / (rowW / 2); // -1..1
      chipTargets[i] = { fx: cx / W, fy: (rowY + d * d * 46 * u - (k % 2) * 10 * u) / H, z: [240, 180, 210, 160, 130][i] };
    });
  });

  // ── score badges ──
  const scoreTargets = land
    ? [
        { fx: 0.535, fy: 0.36, z: 170, rz: -6 },
        { fx: 0.885, fy: 0.16, z: 220, rz: 4 },
        { fx: 0.915, fy: 0.47, z: 130, rz: 7 },
      ]
    : [
        { fx: 0.14, fy: 0.47, z: 170, rz: -6 },
        { fx: 0.80, fy: 0.255, z: 220, rz: 4 },
        { fx: 0.86, fy: 0.55, z: 140, rz: 7 },
      ];

  const allPulse = f >= 15 ? lerp(f, 15, 24, 1, 0) : 0;
  const accent = f >= 30 && f < 37 ? lerp(f, 30, 36, 1, 0) : 0;
  const burstP = prog(f, 1, 8);
  const burstO = f >= 1 && f <= 8 ? lerp(f, 4, 8, 1, 0) : 0;

  return (
    <AbsoluteFill style={{ transform: `translateX(${-ex * ex * W * 0.18}px)` }}>
      {/* transition flash behind the phone (≤ 8f) */}
      {burstO > 0 && (
        <AbsoluteFill style={{ opacity: burstO }}>
          <BurstRays cx={pcx} cy={pcy} p={burstP} inner={180} outer={land ? 900 : 1100} rot={f * 2} seed="s01" />
        </AbsoluteFill>
      )}
      {/* fades in over 4f so frame 0 is the bare stage glow == S09 last frame (web loop seam) */}
      <Glow x={pcx} y={pcy + r.ph * 0.15} r={r.ph * 0.55} opacity={(0.18 + 0.2 * accent) * Math.min(1, f / 4)} />

      <Phone cam={cam}>
        <Screen src="c01_home" inSec={1.0} />
      </Phone>

      <PhoneSpace cam={cam}>
        {/* holes the chips / badges leave behind */}
        {CHIPS.map((c, i) => {
          const p = prog(f, 3 + i * 2, 15 + i * 2);
          const at = screenPt(cam, r, c.sx, CHIP_Y);
          return <Hole key={`h${i}`} x={at.x} y={at.y} w={r.pw * c.w} h={r.pw * 0.08} r={999} o={0.55 * p} />;
        })}
        {SCORES.map((s, i) => {
          const p = prog(f, 18 + i * 2, 30 + i * 2);
          const at = screenPt(cam, r, s.sx, SCORE_Y);
          return <Hole key={`hs${i}`} x={at.x} y={at.y} w={r.pw * 0.13} h={r.pw * 0.06} r={999} o={0.5 * p} />;
        })}

        {CHIPS.map((c, i) => {
          const a = 3 + i * 2;
          const p = prog(f, a, a + 12);
          if (p <= 0) return null;
          const sp = Math.max(p, pop(f, a, fps));
          const at = screenPt(cam, r, c.sx, CHIP_Y);
          const t = chipTargets[i];
          const to = framePt(cam, r, W, H, t.fx, t.fy);
          const flo = Math.sin((f + i * 7) / 9) * 6 * u * clamp01((f - a - 10) / 10);
          return (
            <Lifted
              key={c.label}
              x={mix(at.x, to.x, p)}
              y={mix(at.y, to.y, p) + flo}
              z={t.z * u * p}
              rotY={-(cam.rotY ?? 0) * 0.7 * p}
              rotX={-6 * p}
              rotZ={(i - 2) * 2 * p}
              scale={mix(s0, chipScale * (c.active ? 1.15 : 1), sp) * (c.active ? 1 + 0.12 * allPulse : 1)}
              shadow={p}
              glow={c.active ? p * (0.6 + 0.6 * allPulse + 0.4 * accent) : 0}
            >
              <Chip label={c.label} active={c.active} />
            </Lifted>
          );
        })}

        {SCORES.map((s, i) => {
          const a = 18 + i * 2;
          const p = prog(f, a, a + 12);
          if (p <= 0) return null;
          const sp = Math.max(p, pop(f, a, fps));
          const at = screenPt(cam, r, s.sx, SCORE_Y);
          const t = scoreTargets[i];
          const to = framePt(cam, r, W, H, t.fx, t.fy);
          const flo = Math.cos((f + i * 11) / 10) * 7 * u * clamp01((f - a - 10) / 10);
          return (
            <Lifted
              key={s.value}
              x={mix(at.x, to.x, p)}
              y={mix(at.y, to.y, p) + flo}
              z={t.z * u * p}
              rotY={-(cam.rotY ?? 0) * 0.8 * p}
              rotZ={t.rz * p}
              scale={mix(s0, 1.45, sp)}
              shadow={p}
              glow={0.35 * p + 0.6 * accent}
            >
              <ScoreBadge value={s.value} lit={p} />
            </Lifted>
          );
        })}
      </PhoneSpace>

      <Sequence from={4} layout="none">
        <Caption side="A" lines={["Your anime.", "All of it."]} highlight="All of it." stagger={15} />
      </Sequence>
    </AbsoluteFill>
  );
};

