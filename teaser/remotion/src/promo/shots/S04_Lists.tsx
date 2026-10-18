import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import { Caption } from "../../lib/Caption";
import { Phone } from "../../lib/Phone";
import { SpeedLines, whipIn } from "../../lib/Transitions";
import { useLayout, usePt } from "../../kit/layout";
import { drift, easeInOut, easeOut, lerp, pop, prog } from "../../kit/motion";
import { Screen } from "../../kit/screen";
import { Icon } from "../../kit/ui";
import { Card3D, RankRow, SoftGlow, Txt, exitP, punch, screenPt } from "../../kit/S04_extra";
import { C, SCREEN_ASPECT } from "../../theme";

export const S04_LEN = 90;

/** Rows as they sit in the capture (c04_list @2.2s): screen-y centres, width fraction. */
const ROW_SY = [0.443, 0.598, 0.754];
const ROW_W = 0.907;
const CARD_PT = 356;

const ROWS = [
  { title: "Steins;Gate", thumb: "steinsgate", star: "9.07", comment: "Time travel done right." },
  { title: "Legend of the Galactic Heroes", thumb: "logh", star: "9.02", comment: "A space opera masterpiece." },
  { title: "Gintama Season 2", thumb: "gintama2", star: "9.02", comment: "Laughed, then cried." },
];

// Timeline (shot-local frames, beats every 15f)
const LIFT = 5; // rows leave the phone (staggered 1f), land ≈ beat 1 (f15)
const PICK = 30; // beat 2: Gintama picked up (lifted glow)
const DRAG_A = 37; // capture drag 3.43s → +37f
const DRAG_B = 58; // capture drag ends 4.15s → +58f
const DROP = 60; // beat 4: lands at #1
const COLLAB = 75; // beat 5: "Add Collaborator" chip (Share it.)

/**
 * S04 Lists (PROMO, side B). The three list rows lift out of the phone into a ranked stack floating
 * in 3D; Gintama Season 2 is picked up, arcs over the others to #1 in sync with the captured drag,
 * and the My Score badges punch on the beats.
 */
export const S04: React.FC = () => {
  const f = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const L = useLayout("B");
  const pt = usePt();
  const u = L.u;
  const land = L.landscape;

  // ── camera / phone ──
  const w = whipIn(f, 1);
  const ex = exitP(f, S04_LEN);
  const exDx = ex * width * 0.9;
  const exBlur = ex * 24;
  const phX = (land ? L.phone.x - width * 0.045 : L.phone.x) + w.dx * width + exDx;
  const phY = L.phone.y;
  const phScale = lerp(f, 0, S04_LEN, 1, 1.05, drift);
  const phRotY = lerp(f, 0, S04_LEN, 9, 5, drift);
  const phRotX = lerp(f, 0, S04_LEN, 6, 4, drift);
  const camDx = lerp(f, 0, S04_LEN, 0, -40, drift) * u; // parallax drift

  // ── stack geometry ──
  const sScale = land ? 0.93 : 1.06;
  const rowH = 86 * 2.2 * u * sScale;
  const gap = rowH + 20 * u * sScale;
  const stackX = land ? width * 0.445 : width * 0.47;
  const stackY = land ? height * 0.53 : height * 0.6;
  const slotPose = (k: number) => ({
    x: stackX + k * 22 * u,
    y: stackY + (k - 1) * gap,
    z: 190 - k * 40,
  });
  const stackRotY = lerp(f, 0, S04_LEN, -24, -11, drift);
  const stackRotX = 7;

  // where the row sits on the phone
  const phonePose = (i: number) => {
    const p = screenPt(phX, phY, L.phone.h, phScale, 0.5, ROW_SY[i]);
    return { ...p, scale: (ROW_W * L.phone.h * SCREEN_ASPECT * phScale) / (CARD_PT * 2.2 * u) };
  };

  // slot trajectories (k as float) for each row
  const ginT = prog(f, DRAG_A, DRAG_B, easeInOut);
  const loghT = prog(f, 41, 53, easeInOut);
  const sgT = prog(f, 47, 59, easeInOut);
  const slotOf = [sgT, 1 + loghT, 2 - 2 * ginT];

  const rows = ROWS.map((r, i) => {
    const liftP = prog(f, LIFT + i, LIFT + i + 11, easeOut);
    const from = phonePose(i);
    const k = slotOf[i];
    const k0 = Math.floor(Math.min(k, 1.999));
    const a = slotPose(k0);
    const b = slotPose(k0 + 1);
    const t = k - k0;
    let x = a.x + (b.x - a.x) * t;
    let y = a.y + (b.y - a.y) * t;
    let z = a.z + (b.z - a.z) * t;
    let scale = sScale;
    let rotZ = 0;
    let lifted = 0;
    if (i === 2) {
      const pick = pop(f, PICK, fps);
      const dropS = prog(f, DROP, DROP + 8);
      lifted = Math.min(1, pick) * (1 - 0.55 * dropS);
      const arc = Math.sin(Math.PI * ginT);
      z += 70 * lifted + 90 * arc;
      x += 70 * u * arc;
      scale *= 1 + 0.06 * lifted;
      rotZ = -2.5 * lifted * (1 - ginT) + 1.5 * arc;
    }
    // lift from the phone
    x = from.x + (x - from.x) * liftP + camDx * (z / 300) * liftP;
    y = from.y + (y - from.y) * liftP;
    z = z * liftP;
    scale = from.scale + (scale - from.scale) * liftP;
    const rotY = phRotY + (stackRotY - phRotY) * liftP;
    const rotX = phRotX + (stackRotX - phRotX) * liftP;

    // rank roll-overs as rows pass each other
    const rk =
      i === 0
        ? { from: 1, to: 2, p: prog(f, 53, 58) }
        : i === 1
          ? { from: 2, to: 3, p: prog(f, 45, 50) }
          : f < 51
            ? { from: 3, to: 2, p: prog(f, 45, 50) }
            : { from: 2, to: 1, p: prog(f, 53, 58) };
    // My Score punches: cascade on beat 1, Gintama again on the drop (beat 4)
    const badge = punch(f, 15 + i * 3) + (i === 2 ? punch(f, DROP, 12) : 0);
    return { r, i, x: x + exDx * 0.25 * (z / 200), y, z, scale, rotY, rotX, rotZ, lifted, rk, badge };
  });

  // drop flash (beat 4)
  const flash = punch(f, DROP, 7);
  const top = slotPose(0);

  // "Add Collaborator" chip (beat 5) — real button on this screen; supports "Share it."
  const cp = pop(f, COLLAB, fps);
  const collabFrom = screenPt(phX, phY, L.phone.h, phScale, 0.255, 0.296);
  const collabTo = { x: land ? top.x + 60 * u : width * 0.5 + 120 * u, y: top.y - gap * 0.5 - 60 * u * sScale };
  const cl = prog(f, COLLAB, COLLAB + 10);
  const collabX = collabFrom.x + (collabTo.x - collabFrom.x) * cl;
  const collabY = collabFrom.y + (collabTo.y - collabFrom.y) * cl;
  const collabS0 = (L.phone.h * SCREEN_ASPECT * phScale * 0.38) / pt(170);

  return (
    <>
      <Phone
        cam={{
          x: phX / width,
          y: phY / height,
          h: L.phone.h / height,
          rotY: phRotY,
          rotX: phRotX,
          scale: phScale,
          blurPx: w.blur + exBlur,
        }}
      >
        <Screen src="c04_list" inSec={2.2} />
        {/* the area the rows left dims slightly */}
        <AbsoluteFill
          style={{
            top: `${(ROW_SY[0] - 0.075) * 100}%`,
            height: `${(ROW_SY[2] - ROW_SY[0] + 0.15) * 100}%`,
            background: "#000",
            opacity: 0.62 * prog(f, LIFT, LIFT + 10),
          }}
        />
      </Phone>

      <SoftGlow x={top.x + exDx} y={top.y} r={420 * u * sScale} opacity={0.12 + 0.3 * flash} />

      <>
        {[...rows]
          .sort((a, b) => a.z - b.z)
          .map((o) => (
            <Card3D
              perspective={height * 2.2}
              key={o.i}
              x={o.x}
              y={o.y}
              z={o.z}
              rotX={o.rotX}
              rotY={o.rotY}
              rotZ={o.rotZ}
              scale={o.scale}
              blur={w.blur * 0.6 + exBlur}
              shadow={0}
            >
              <RankRow
                w={CARD_PT}
                rankFrom={o.rk.from}
                rankTo={o.rk.to}
                rankP={o.rk.p}
                title={o.r.title}
                thumb={o.r.thumb}
                star={o.r.star}
                my={10}
                comment={o.r.comment}
                lifted={o.lifted + (o.i === 2 ? flash * 0.6 : 0)}
                badge={o.badge}
              />
            </Card3D>
          ))}
        {f >= COLLAB - 1 && (
          <Card3D
            perspective={height * 2.2}
            x={collabX + exDx}
            y={collabY}
            z={240 * cl}
            rotY={phRotY + (stackRotY - phRotY) * cl}
            rotX={stackRotX}
            scale={(collabS0 + (sScale - collabS0) * cl) * (0.9 + 0.1 * cp)}
            opacity={Math.min(1, (f - COLLAB + 1) / 2)}
            blur={exBlur}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: pt(7),
                padding: `${pt(7)}px ${pt(14)}px`,
                borderRadius: pt(12),
                background: C.card,
                border: `${pt(0.8)}px solid ${C.primary}`,
                boxShadow: `0 ${pt(10)}px ${pt(22)}px rgba(0,0,0,0.5), 0 0 ${pt(24)}px rgba(250,204,21,0.35)`,
              }}
            >
              <Icon name="people" size={pt(16)} color={C.primary} />
              <Txt s={pt(13)} w={600}>
                Add Collaborator
              </Txt>
            </div>
          </Card3D>
        )}
      </>

      <SpeedLines dir={-1} seed="lists" />
      <AbsoluteFill style={{ transform: `translateX(${exDx}px)` }}>
        <Sequence from={6} layout="none">
          <Caption side="B" lines={["Rank it.", "Share it."]} highlight="Rank it." />
        </Sequence>
      </AbsoluteFill>
    </>
  );
};
