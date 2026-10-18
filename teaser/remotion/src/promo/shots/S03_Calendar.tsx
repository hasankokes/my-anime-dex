import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import { Caption } from "../../lib/Caption";
import { Cam, Phone } from "../../lib/Phone";
import { SpeedLines, whipIn } from "../../lib/Transitions";
import { Screen } from "../../kit/screen";
import { useLayout } from "../../kit/layout";
import { drift, easeIn, easeInOut, lerp, pop, prog } from "../../kit/motion";
import { Chip } from "../../kit/ui";
import { Glow } from "../../kit/fx";
import { clamp01, framePt, Hole, Lifted, mix, onPhoneScale, PhoneSpace, phoneRect, screenPt } from "../../kit/S01_extra";
import { BadgePlate, CaptureThumb, LiveCalendarCard, LiveCountdown } from "../../kit/S03_extra";

export const S03_LEN = 90;

// c03_calendar @1.0s, screen fractions (660×1434 reference frame).
const DAY_Y = 0.226;
const DAYS = [
  { label: "Saturday", sx: 0.227 },
  { label: "Sunday", sx: 0.5, active: true },
  { label: "Monday", sx: 0.773 },
];
const HERO = { sy: 0.432, title: "Magical Sisters LuluttoLilly Part 2", time: "16:30 UTC+3", cd: "2h 37m", cdTo: "2h 36m", ep: 3 };
const BADGES = [
  { sx: 0.497, sy: 0.346, cd: "2h 7m", cdTo: "2h 6m" },
  { sx: 0.494, sy: 0.58, cd: "3h 7m", cdTo: "3h 6m" },
];

/**
 * S03 Calendar — side A, 90f.
 * f0–7   whip in from the left + speed lines.
 * f6–18  day chips (Saturday / Sunday / Monday) lift into a floating row; f15 beat Sunday pops.
 * f16–28 the "Magical Sisters" card lifts out (×2, z 230); f20–32 the 2h 7m / 3h 7m badges break out of
 *        their cards to flank it; f30 beat everything has landed. The capture keeps scrolling underneath.
 * f45    beat: every countdown ticks one minute down (roll + yellow flash) — the app's live behaviour.
 * f87–90 accelerates left into S04.
 */
export const S03: React.FC = () => {
  const f = useCurrentFrame();
  const { fps, width: W, height: H } = useVideoConfig();
  const L = useLayout("A");
  const land = L.landscape;
  const u = L.u;

  const w = whipIn(f, -1);
  const ex = lerp(f, 87, 90, 0, 1, easeIn);
  const cam: Cam = {
    x: L.phone.x / W + w.dx,
    y: L.phone.y / H,
    h: L.phone.h / H,
    rotY: lerp(f, 0, 90, land ? -14 : -9, land ? -6 : -3, drift),
    rotX: lerp(f, 0, 90, 3, 6, drift),
    scale: lerp(f, 0, 90, 1, 1.04, drift),
    blurPx: w.blur,
  };
  const r = phoneRect(cam, W, H);
  const s0 = onPhoneScale(r, u);
  const sCard = s0 * (400 / 360);

  // ── day chips ──
  const chipScale = land ? 1.05 : 1.15;
  const chipW = (lab: string) => (lab.length * 7.6 + 36) * 2.2 * u * chipScale;
  const gap = 16 * u;
  const rowW = DAYS.reduce((a, d) => a + chipW(d.label), 0) + gap * 2;
  const rowCx = r.left + r.pw / 2;
  const rowY = land ? H * 0.14 : r.top + r.ph * 0.13;
  let acc = rowCx - rowW / 2;
  const dayTargets = DAYS.map((d) => {
    const cx = acc + chipW(d.label) / 2;
    acc += chipW(d.label) + gap;
    return { fx: cx / W, fy: rowY / H };
  });
  const sunPop = f >= 15 ? lerp(f, 15, 24, 1, 0) : 0;

  // ── hero card ──
  const hp = prog(f, 16, 28);
  const hpop = Math.max(hp, pop(f, 16, fps, { damping: 15, stiffness: 170 }));
  const heroAt = screenPt(cam, r, 0.5, HERO.sy);
  const heroTo = framePt(cam, r, W, H, land ? 0.655 : 0.5, land ? 0.5 : 0.52);
  const heroScale = land ? 1.05 : 1.08;

  // ── badges ──
  const badgeTargets = land
    ? [
        { fx: 0.865, fy: 0.27, z: 140, rz: 5 },
        { fx: 0.86, fy: 0.75, z: 110, rz: -4 },
      ]
    : [
        { fx: 0.22, fy: 0.415, z: 140, rz: -5 },
        { fx: 0.78, fy: 0.64, z: 110, rz: 4 },
      ];

  // ── tick on beat 45 ──
  const tick = prog(f, 45, 49, easeInOut);
  const flash = f >= 45 ? lerp(f, 45, 60, 1, 0) : 0;
  const settled = clamp01((f - 30) / 12);

  const heroFrame = { x: mix(r.left + heroAt.x, r.left + heroTo.x, hp), y: mix(r.top + heroAt.y, r.top + heroTo.y, hp) };

  return (
    <AbsoluteFill style={{ transform: `translateX(${-ex * ex * W * 0.18}px)` }}>
      <Glow x={heroFrame.x} y={heroFrame.y} r={L.phone.h * 0.45} opacity={0.1 + 0.12 * hp + 0.22 * flash} />

      <Phone cam={cam}>
        <Screen src="c03_calendar" inSec={1.0} />
      </Phone>

      <PhoneSpace cam={cam}>
        {DAYS.map((d, i) => {
          const at = screenPt(cam, r, d.sx, DAY_Y);
          return <Hole key={`h${i}`} x={at.x} y={at.y} w={r.pw * 0.25} h={r.pw * 0.082} r={999} o={0.6 * prog(f, 6 + i * 2, 18 + i * 2)} />;
        })}

        {DAYS.map((d, i) => {
          const a = 6 + i * 2;
          const p = prog(f, a, a + 12);
          if (p <= 0) return null;
          const sp = Math.max(p, pop(f, a, fps));
          const at = screenPt(cam, r, d.sx, DAY_Y);
          const to = framePt(cam, r, W, H, dayTargets[i].fx, dayTargets[i].fy);
          const flo = Math.sin((f + i * 8) / 10) * 5 * u * clamp01((f - a - 10) / 10);
          return (
            <Lifted
              key={d.label}
              x={mix(at.x, to.x, p)}
              y={mix(at.y, to.y, p) + flo}
              z={(d.active ? 200 : 120) * u * p}
              rotY={-(cam.rotY ?? 0) * 0.7 * p}
              rotX={-8 * p}
              rotZ={(i - 1) * 2.5 * p}
              scale={mix(s0, chipScale, sp) * (d.active ? 1 + 0.12 * sunPop : 1)}
              shadow={p}
              glow={d.active ? 0.6 * p + 0.6 * sunPop : 0}
              opacity={d.active ? 1 : 0.92}
            >
              <Chip label={d.label} active={d.active} />
            </Lifted>
          );
        })}

        {BADGES.map((b, i) => {
          const a = 20 + i * 3;
          const p = prog(f, a, a + 12);
          if (p <= 0) return null;
          const sp = Math.max(p, pop(f, a, fps));
          const at = screenPt(cam, r, b.sx, b.sy);
          const t = badgeTargets[i];
          const to = framePt(cam, r, W, H, t.fx, t.fy);
          const flo = Math.cos((f + i * 13) / 11) * 7 * u * settled;
          return (
            <Lifted
              key={b.cd}
              x={mix(at.x, to.x, p)}
              y={mix(at.y, to.y, p) + flo}
              z={t.z * u * p}
              rotY={-(cam.rotY ?? 0) * 0.8 * p}
              rotZ={t.rz * p}
              scale={mix(s0, 1.7, sp) * (1 + 0.08 * flash)}
              shadow={p}
              glow={0.3 * p + 0.5 * flash}
            >
              <BadgePlate>
                <LiveCountdown from={b.cd} to={b.cdTo} p={tick} glow={flash} />
              </BadgePlate>
            </Lifted>
          );
        })}

        {hp > 0 && (
          <Lifted
            x={mix(heroAt.x, heroTo.x, hp)}
            y={mix(heroAt.y, heroTo.y, hp) + Math.sin(f / 12) * 6 * u * settled}
            z={230 * u * hp}
            rotY={-(cam.rotY ?? 0) * 0.75 * hp + Math.sin(f / 19) * 2 * settled}
            rotX={-4 * hp + Math.cos(f / 15) * 1.5 * settled}
            rotZ={1.2 * hp}
            scale={mix(sCard, heroScale, hpop) * (1 + 0.025 * flash)}
            shadow={hp}
            glow={0.2 * hp + 0.5 * flash}
          >
            <LiveCalendarCard
              title={HERO.title}
              thumb={<CaptureThumb src="c03_calendar" atSec={1.0} x0={0.0636} y0={0.392} w={0.147} wPt={56} hPt={72} />}
              time={HERO.time}
              countdown={HERO.cd}
              countdownTo={HERO.cdTo}
              roll={tick}
              ep={HERO.ep}
              lit={0.35 * hp + 0.6 * flash}
              glow={flash}
            />
          </Lifted>
        )}
      </PhoneSpace>

      <SpeedLines dir={1} seed="s03" />
      <Sequence from={6} layout="none">
        <Caption side="A" lines={["Never miss", "a drop."]} highlight="a drop." />
      </Sequence>
    </AbsoluteFill>
  );
};
