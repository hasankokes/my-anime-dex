import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import { Caption } from "../../lib/Caption";
import { Cam, Phone } from "../../lib/Phone";
import { SpeedLines, whipIn } from "../../lib/Transitions";
import { Screen } from "../../kit/screen";
import { useLayout } from "../../kit/layout";
import { drift, easeIn, easeInOut, lerp, pop, prog } from "../../kit/motion";
import { Glow } from "../../kit/fx";
import { clamp01, framePt, Hole, Lifted, mix, onPhoneScale, PhoneSpace, phoneRect, screenPt } from "../../kit/S01_extra";
import { LiveWatchingCard } from "../../kit/S02_extra";

export const S02_LEN = 90;

// c02_watching card centres (screen fractions) and the card box (600×185 of 660×1434).
const CARD_W = 0.909;
const CARD_H = 0.129;
const HERO_SY = 0.216;
const OTHERS = [
  { title: "Jujutsu Kaisen: The Culling Game", thumb: "jjk", ep: 3, total: 12, sy: 0.363 },
  { title: "[Oshi No Ko] Season 3", thumb: "oshinoko", ep: 2, total: 11, sy: 0.509 },
  { title: "Steins;Gate", thumb: "steinsgate", ep: 13, total: 24, sy: 0.656 },
];

/** 0→1→0 bump peaking at `peak`. */
const bump = (f: number, a: number, peak: number, b: number) => (f < peak ? prog(f, a, peak, easeInOut) : 1 - prog(f, peak, b, easeInOut));

/**
 * S02 Watching — side B, 90f.
 * f0–7   whip in from the right + speed lines.
 * f4–16  the Frieren card lifts out of the phone (×2, z 240, turns to camera).
 * f15    beat: + press lands → Ep 6→7, bar 60→70% with a glow pulse (matches the capture's tap).
 * f20–32 JJK / Oshi no Ko / Steins;Gate explode out in depth behind it (z 60–120); f30 beat they settle.
 * f48–56 the secondary cards settle back into the list.
 * f60    beat: second press → Ep 7→8, 70→80%; accent flash. f87–90 accelerates right into S03.
 */
export const S02: React.FC = () => {
  const f = useCurrentFrame();
  const { fps, width: W, height: H } = useVideoConfig();
  const L = useLayout("B");
  const land = L.landscape;
  const u = L.u;

  const w = whipIn(f, 1);
  const ex = lerp(f, 87, 90, 0, 1, easeIn);
  const cam: Cam = {
    x: L.phone.x / W + w.dx,
    y: L.phone.y / H,
    h: L.phone.h / H,
    rotY: lerp(f, 0, 90, land ? 15 : 9, land ? 7 : 3, drift),
    rotX: lerp(f, 0, 90, 6, 3, drift),
    scale: lerp(f, 0, 90, 1, 1.04, drift),
    zoom: lerp(f, 0, 90, 1, 1.05, drift),
    focusY: 0.2,
    blurPx: w.blur,
  };
  const r = phoneRect(cam, W, H);
  const s0 = onPhoneScale(r, u) * (400 / 360); // kit card 360pt ↔ app card 400pt

  // ── hero (Frieren) ──
  const lp = prog(f, 4, 16);
  const lpop = Math.max(lp, pop(f, 4, fps, { damping: 15, stiffness: 170 }));
  const heroAt = screenPt(cam, r, 0.5, HERO_SY);
  const heroTo = framePt(cam, r, W, H, land ? 0.31 : 0.485, land ? 0.36 : 0.395);
  const heroScale = land ? 1.05 : 1.12;
  const flo = Math.sin(f / 11) * 6 * u * clamp01((f - 16) / 12);
  const press1 = bump(f, 11, 15, 20);
  const press2 = bump(f, 56, 60, 65);
  const ripple = f >= 15 && f < 27 ? prog(f, 15, 27) : f >= 60 && f < 72 ? prog(f, 60, 72) : 0;
  const ep = f < 15 ? 6 : f < 60 ? 7 : 8;
  const epFrom = f < 15 ? 6 : f < 60 ? 6 : 7;
  const roll = f < 15 ? 0 : f < 60 ? prog(f, 15, 20) : prog(f, 60, 65);
  const value = f < 60 ? lerp(f, 15, 25, 0.6, 0.7) : lerp(f, 60, 70, 0.7, 0.8);
  const barGlow = Math.max(f >= 15 ? lerp(f, 15, 30, 1, 0) : 0, f >= 60 ? lerp(f, 60, 78, 1, 0) : 0);
  const accent = f >= 60 && f < 66 ? lerp(f, 60, 66, 1, 0) : f >= 15 && f < 20 ? lerp(f, 15, 20, 0.7, 0) : 0;
  // the press also kicks the whole card a touch (tactile)
  const kick = press1 * 0.03 + press2 * 0.04;

  // ── secondary explode (out f20–32, back f48–56) ──
  const sec = OTHERS.map((o, i) => {
    const a = 20 + i * 2;
    const out = prog(f, a, a + 12);
    const back = prog(f, 48 + i * 1.5, 56 + i * 1.5, easeInOut);
    const p = out * (1 - back);
    const at = screenPt(cam, r, 0.5, o.sy);
    const off = land
      ? [
          { dx: -0.16, dy: 0.1, z: 120, rz: -3.5 },
          { dx: 0.0, dy: 0.13, z: 90, rz: 2.5 },
          { dx: -0.22, dy: 0.155, z: 60, rz: -2 },
        ][i]
      : [
          { dx: -0.16, dy: 0.04, z: 120, rz: -3 },
          { dx: 0.18, dy: 0.075, z: 90, rz: 2.5 },
          { dx: -0.1, dy: 0.11, z: 60, rz: -2 },
        ][i];
    return { o, i, p, at, off };
  });
  const secScale = land ? 0.82 : 0.9;

  const heroFrame = { x: mix(r.left + heroAt.x, r.left + heroTo.x, lp), y: mix(r.top + heroAt.y, r.top + heroTo.y, lp) };

  return (
    <AbsoluteFill style={{ transform: `translateX(${ex * ex * W * 0.18}px)` }}>
      <Glow x={heroFrame.x} y={heroFrame.y} r={L.phone.h * 0.45} opacity={0.12 + 0.12 * lp + 0.25 * accent} />

      <Phone cam={cam}>
        <Sequence durationInFrames={45} layout="none">
          <Screen src="c02_watching" inSec={5.29} />
        </Sequence>
        <Sequence from={45} layout="none">
          <Screen src="c02_watching" inSec={8.87} />
        </Sequence>
      </Phone>

      <PhoneSpace cam={cam}>
        <Hole x={heroAt.x} y={heroAt.y} w={r.pw * CARD_W} h={r.ph * CARD_H} r={r.pw * 0.05} o={0.6 * lp} />
        {sec.map(({ i, p, at }) => (
          <Hole key={`h${i}`} x={at.x} y={at.y} w={r.pw * CARD_W} h={r.ph * CARD_H} r={r.pw * 0.05} o={0.5 * p} />
        ))}

        {sec.map(({ o, i, p, at, off }) =>
          p <= 0.001 ? null : (
            <Lifted
              key={o.thumb}
              x={at.x + off.dx * r.pw * p}
              y={at.y + off.dy * r.ph * p + Math.sin((f + i * 9) / 10) * 4 * u * p}
              z={off.z * u * p}
              rotY={-(cam.rotY ?? 0) * 0.5 * p}
              rotZ={off.rz * p}
              scale={mix(s0, secScale, p)}
              shadow={0.8 * p}
            >
              <div style={{ position: "relative" }}>
                <LiveWatchingCard title={o.title} thumb={o.thumb} ep={o.ep} total={o.total} value={o.ep / o.total} />
                {/* recede: secondary layers sit a stop darker than the hero */}
                <div style={{ position: "absolute", inset: 0, borderRadius: 16 * 2.2 * u, background: "#0F0F0F", opacity: 0.3 * p }} />
              </div>
            </Lifted>
          ),
        )}

        {lp > 0 && (
          <Lifted
            x={mix(heroAt.x, heroTo.x, lp)}
            y={mix(heroAt.y, heroTo.y, lp) + flo}
            z={240 * u * lp}
            rotY={-(cam.rotY ?? 0) * 0.75 * lp + Math.sin(f / 17) * 2 * lp}
            rotX={-5 * lp + Math.cos(f / 14) * 1.5 * lp}
            rotZ={-1.5 * lp}
            scale={mix(s0, heroScale, lpop) * (1 + kick)}
            shadow={lp}
            glow={0.25 * lp + 0.6 * accent}
          >
            <LiveWatchingCard
              title="Frieren: Beyond Journey's End Season 2"
              thumb="frieren2"
              ep={epFrom}
              epTo={ep}
              roll={roll}
              total={10}
              value={value}
              press={Math.max(press1, press2)}
              ripple={ripple}
              barGlow={barGlow}
              lit={0.4 * lp + 0.6 * accent}
            />
          </Lifted>
        )}
      </PhoneSpace>

      <SpeedLines dir={-1} seed="s02" />
      <Sequence from={6} layout="none">
        <Caption side="B" lines={["Track every", "episode."]} highlight="every" />
      </Sequence>
    </AbsoluteFill>
  );
};
