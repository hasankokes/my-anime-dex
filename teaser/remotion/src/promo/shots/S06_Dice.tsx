import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import { Caption } from "../../lib/Caption";
import { Phone } from "../../lib/Phone";
import { SpeedLines, whipIn } from "../../lib/Transitions";
import { GlossyDie } from "../../kit/S06_extra";
import { BurstRays } from "../../kit/fx";
import { useLayout, usePt } from "../../kit/layout";
import { drift, easeIn, easeInOut, easeOut, lerp, pop, prog } from "../../kit/motion";
import { Layer3D, Space3D } from "../../kit/Space";
import { Screen } from "../../kit/screen";
import { Card } from "../../kit/ui";
import { Card3D, SoftGlow, cardShadow, GenrePill, ScorePill, Txt, exitP, punch, screenPt } from "../../kit/S04_extra";
import { SCREEN_ASPECT } from "../../theme";

export const S06_LEN = 90;

// c06_dice: the "Rolling dice…" overlay starts at 3.1s and the result card starts to fade in at
// 5.2s (frame 156). In-point 3.2s puts that card pop exactly on +60f (beat 4).
const IN_SEC = 3.2;
const LAND = 60; // beat 4
const LAUNCH = 6;
const ICON = { sx: 0.5, sy: 0.476 }; // spinning dice icon on the captured screen
const CARD = { sx: 0.5, sy: 0.53 }; // title/score/genres block of the result card
const FINAL = { rx: -24, ry: 36, rz: 6 }; // three faces towards camera

/**
 * S06 Dice (PROMO, side B). The glowing die tumbles out of the phone towards camera, spins along an
 * arc with a comet trail, slams into place on beat 4 with a yellow flash and burst while the captured
 * result card pops; the result (title, ★8.4, genres) then lifts out as its own plate.
 */
export const S06: React.FC = () => {
  const f = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const L = useLayout("B");
  const pt = usePt();
  const u = L.u;
  const land = L.landscape;

  const w = whipIn(f, 1);
  const ex = exitP(f, S06_LEN);
  const exDx = ex * width * 0.9;
  const exBlur = ex * 24;

  // landing shake (beat 4)
  const sk = punch(f, LAND + 2, 9);
  const shakeX = Math.sin((f - LAND) * 2.4) * 10 * u * sk;
  const shakeY = Math.cos((f - LAND) * 3.1) * 8 * u * sk;

  // phone
  const phX = L.phone.x + w.dx * width + exDx + shakeX;
  const phY = L.phone.y + shakeY;
  const phScale = lerp(f, 0, S06_LEN, 1, 1.07, drift);
  const phRotY = lerp(f, 0, S06_LEN, 9, 3, drift);
  const phRotX = 4;
  const pw = L.phone.h * SCREEN_ASPECT * phScale;

  // ── die path ──
  const size = (land ? 210 : 270) * u;
  const icon = screenPt(phX, phY, L.phone.h, phScale, ICON.sx, ICON.sy);
  const s0 = (0.2 * pw) / size;
  const target = land
    ? { x: width * 0.475 + exDx + shakeX, y: height * 0.3 + shakeY, z: 120 }
    : { x: width * 0.72 + exDx + shakeX, y: height * 0.385 + shakeY, z: 120 };
  // apex: big, close to camera, between phone and target
  const apex = land ? { x: width * 0.3 + exDx, y: height * 0.56, z: 470 } : { x: width * 0.5 + exDx, y: height * 0.5, z: 560 };

  const dieAt = (fr: number) => {
    if (fr <= LAUNCH) return { ...icon, z: 0, s: s0 };
    if (fr <= 22) {
      const p = prog(fr, LAUNCH, 22, easeOut);
      return { x: icon.x + (apex.x - icon.x) * p, y: icon.y + (apex.y - icon.y) * p - Math.sin(Math.PI * p) * 120 * u, z: apex.z * p, s: s0 + (1 - s0) * p };
    }
    if (fr <= 48) {
      // hang near camera, drifting along an S-curve
      const p = prog(fr, 22, 48, easeInOut);
      const mid = land ? { x: width * 0.17 + exDx, y: height * 0.42 } : { x: width * 0.22 + exDx, y: height * 0.5 };
      const x = (1 - p) * (1 - p) * apex.x + 2 * (1 - p) * p * mid.x + p * p * (target.x - 40 * u);
      const y = (1 - p) * (1 - p) * apex.y + 2 * (1 - p) * p * mid.y + p * p * (target.y - 60 * u);
      return { x, y, z: apex.z + (300 - apex.z) * p, s: 1 };
    }
    // slam down into place
    const p = prog(fr, 48, LAND, easeIn);
    const from = { x: target.x - 40 * u, y: target.y - 60 * u, z: 300 };
    if (fr <= LAND) return { x: from.x + (target.x - from.x) * p, y: from.y + (target.y - from.y) * p, z: from.z + (target.z - from.z) * p, s: 1 };
    // settle bounce after impact
    const k = fr - LAND;
    const b = Math.exp(-k / 4) * Math.sin(k * 0.9);
    return { x: target.x, y: target.y - 26 * u * Math.abs(b), z: target.z + 30 * b, s: 1 };
  };

  const d = dieAt(f);
  // spin: fast tumble that slows to the final pose on impact, then a small wobble
  const q = Math.min(1, Math.max(0, (f - LAUNCH) / (LAND - LAUNCH)));
  const rem = (1 - q) ** 1.6;
  const wob = f > LAND ? Math.exp(-(f - LAND) / 5) * Math.sin((f - LAND) * 1.1) : 0;
  const rotX = FINAL.rx - 900 * rem + 14 * wob;
  const rotY = FINAL.ry + 1260 * rem - 10 * wob;
  const rotZ = FINAL.rz + 220 * rem;
  const launched = f >= LAUNCH - 1;

  // comet trail (projected screen positions of the last frames)
  const P = height * 2.2;
  const proj = (o: { x: number; y: number; z: number }) => {
    const k = P / (P - o.z * u);
    return { x: width / 2 + (o.x - width / 2) * k, y: height / 2 + (o.y - height / 2) * k, k };
  };
  const trail =
    f > LAUNCH + 1 && f <= LAND + 1
      ? Array.from({ length: 10 }, (_, i) => {
          const fr = f - i * 0.7;
          const o = dieAt(Math.max(LAUNCH, fr));
          const pp = proj(o);
          return { ...pp, r: size * 0.42 * o.s * pp.k * (1 - i / 11), a: 0.75 * (1 - i / 10) };
        })
      : [];

  // beat 4 accents
  const flash = punch(f, LAND, 7);
  const burst = prog(f, LAND - 1, LAND + 8, easeOut);
  const dp = proj(d);
  const energy = lerp(f, LAUNCH, LAND, 0.2, 0.45, easeIn);

  // result plate lifts out of the captured card (after the pop)
  const plateP = prog(f, LAND + 3, LAND + 15, easeOut);
  const plateFrom = screenPt(phX, phY, L.phone.h, phScale, CARD.sx, CARD.sy);
  const plateTo = land ? { x: width * 0.43 + exDx, y: height * 0.71 } : { x: width * 0.5 + exDx, y: height * 0.8 };
  const plateS = land ? 0.9 : 1.08;
  const plateS0 = (0.88 * pw) / pt(340);
  const genreAt = [75, 78, 81];

  return (
    <>
      <Phone cam={{ x: phX / width, y: phY / height, h: L.phone.h / height, rotY: phRotY, rotX: phRotX, scale: phScale, blurPx: w.blur + exBlur }}>
        <Screen src="c06_dice" inSec={IN_SEC} />
        {/* the in-app die dims once its 3D twin has left the phone */}
        <AbsoluteFill
          style={{
            background: `radial-gradient(circle at ${ICON.sx * 100}% ${ICON.sy * 100}%, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 18%)`,
            opacity: prog(f, LAUNCH, LAUNCH + 6) * (1 - prog(f, LAND - 4, LAND)),
          }}
        />
        {/* the captured result plate area dims slightly while lifted */}
        <AbsoluteFill style={{ top: "49%", height: "8%", background: "#000", opacity: 0.45 * plateP }} />
      </Phone>

      {/* trail + glow in screen space */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        {trail.map((t, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: t.x - t.r,
              top: t.y - t.r,
              width: t.r * 2,
              height: t.r * 2,
              borderRadius: "50%",
              background: `radial-gradient(circle, rgba(250,204,21,${t.a}) 0%, rgba(245,158,11,${t.a * 0.5}) 40%, rgba(250,204,21,0) 70%)`,
            }}
          />
        ))}
        {launched && <SoftGlow x={dp.x} y={dp.y} r={size * 1.6 * dp.k} opacity={energy + 0.3 * flash} />}
        {f >= LAND - 1 && f < LAND + 10 && (
          <div style={{ opacity: 1 - prog(f, LAND + 4, LAND + 10) }}>
            <BurstRays cx={dp.x} cy={dp.y} p={burst} inner={(size * 0.75) / u} outer={(size * 1.45) / u} count={20} rot={f * 2} seed="dice" />
          </div>
        )}
      </AbsoluteFill>

      {/* result plate */}
      {f >= LAND + 3 && (
        <Card3D
          perspective={P}
          x={plateFrom.x + (plateTo.x - plateFrom.x) * plateP}
          y={plateFrom.y + (plateTo.y - plateFrom.y) * plateP}
          z={170 * plateP}
          rotY={phRotY + (-8 - phRotY) * plateP}
          rotX={5}
          scale={plateS0 + (plateS - plateS0) * plateP}
          opacity={Math.min(1, (f - LAND - 2) / 3)}
          blur={exBlur}
        >
          <Card w={340} pad={14} style={{ boxShadow: `${cardShadow(u)}, 0 0 ${pt(40)}px rgba(250,204,21,${0.12 + 0.25 * punch(f, 75, 10)})` }}>
            <div style={{ display: "flex", alignItems: "center", gap: pt(10), marginBottom: pt(10) }}>
              <Txt s={pt(14)} w={700} style={{ flex: 1 }}>
                I Want to Eat Your Pancreas
              </Txt>
              <ScorePill value="8.4" />
            </div>
            <div style={{ display: "flex", gap: pt(6) }}>
              {["Drama", "Romance", "Slice of Life"].map((g, i) => {
                const gp = pop(f, genreAt[i], fps);
                return (
                  <div key={g} style={{ transform: `scale(${0.6 + 0.4 * gp}) translateY(${(1 - gp) * pt(8)}px)`, opacity: Math.min(1, gp * 1.5) }}>
                    <GenrePill label={g} />
                  </div>
                );
              })}
            </div>
          </Card>
        </Card3D>
      )}

      <Space3D perspective={P / u}>
        {/* the die (true 3D: no filters) */}
        {launched && (
          <Layer3D x={d.x} y={d.y} z={d.z} shadow={0}>
            <GlossyDie size={size * d.s * (1 + 0.12 * flash)} rotX={rotX} rotY={rotY} rotZ={rotZ} glow={0.8 + 0.8 * flash} sheen={prog(f, LAND, LAND + 12)} />
          </Layer3D>
        )}
      </Space3D>

      <SpeedLines dir={-1} seed="dice" />
      <AbsoluteFill style={{ transform: `translateX(${exDx}px)` }}>
        <Sequence from={6} layout="none">
          <Caption side="B" lines={["Can't decide?", "Roll."]} highlight="Roll." />
        </Sequence>
      </AbsoluteFill>
    </>
  );
};
