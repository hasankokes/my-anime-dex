import { AbsoluteFill, Img, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Caption } from "../../lib/Caption";
import { SpeedLines, whipIn } from "../../lib/Transitions";
import { useLayout, usePt } from "../../kit/layout";
import { drift, easeOut, lerp, pop, prog } from "../../kit/motion";
import { Screen } from "../../kit/screen";
import { Icon, ProgressBar, Stat } from "../../kit/ui";
import { Card3D, SoftGlow, cardShadow, Txt, exitP, orbit, punch } from "../../kit/S04_extra";
import { C } from "../../theme";

export const S05_LEN = 75;

// Profile header crop of c05_profile @3.05s. The Premium card starts at ~0.47 of the screen and must
// never be in frame (it advertises unimplemented features), so the panel stops at 0.462.
const PANEL_TOP = 0.075;
const PANEL_BOTTOM = 0.462;
const PANEL_ASPECT = 1320 / ((PANEL_BOTTOM - PANEL_TOP) * 2868); // w / h

// Where each element sits on the captured screen (fractions of screen w / h)
const AV = { sx: 0.5, sy: 0.188 };
const RANK = { sx: 0.5, sy: 0.316 };
const BAR = { sx: 0.5, sy: 0.354 };
const STATS = [
  { sx: 0.224, n: 16, label: "Watching" },
  { sx: 0.5, n: 42, label: "Watched" },
  { sx: 0.773, n: 59, label: "Favs" },
];
const STAT_SY = 0.425;

const PLAT = C.platinum;
const platA = (a: number) => `rgba(229,228,226,${a})`;

/**
 * S05 Profile (PROMO, side A). The profile header floats as a cropped panel; its avatar ring, rank,
 * XP bar and stats explode forward onto separate depth planes while the camera orbits. The bar fills
 * 0→12/30 XP (beat 2), the stats count up (beat 3), the Platinum ring pulses (beat 4).
 */
export const S05: React.FC = () => {
  const f = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const L = useLayout("A");
  const pt = usePt();
  const u = L.u;
  const land = L.landscape;

  const w = whipIn(f, -1);
  const ex = exitP(f, S05_LEN);
  const shift = w.dx * width - ex * width * 0.9;
  const blur = w.blur + ex * 24;

  // panel geometry
  const ph = land ? height * 0.6 : (width * 0.9) / PANEL_ASPECT;
  const pw = ph * PANEL_ASPECT;
  const cx = (land ? width * 0.675 : width * 0.5) + shift;
  const cy = land ? height * 0.49 : height * 0.59;
  const sP = pw / (440 * 2.2 * u); // app-pt scale of the panel
  const at = (sx: number, sy: number) => ({ x: cx + (sx - 0.5) * pw, y: cy + ((sy - PANEL_TOP) / (PANEL_BOTTOM - PANEL_TOP) - 0.5) * ph });

  // camera orbit + push
  const rigY = land ? lerp(f, 0, S05_LEN, -30, -12, drift) : lerp(f, 0, S05_LEN, -22, -8, drift);
  const rigX = lerp(f, 0, S05_LEN, 9, 5, drift);
  const zCam = lerp(f, 0, S05_LEN, 0, 70, drift);
  const panelPop = pop(f, 2, fps);

  // lift helper: from panel spot (z 0, panel scale) to target
  const lift = (start: number, sx: number, sy: number, to: { dx?: number; dy?: number; z: number; s: number }) => {
    const p = prog(f, start, start + 11, easeOut);
    const a = at(sx, sy);
    return {
      x: a.x + (to.dx ?? 0) * u * p,
      y: a.y + (to.dy ?? 0) * u * p,
      z: to.z * p + zCam,
      scale: sP * (1 + (to.s - 1) * p),
      p,
    };
  };

  const av = lift(9, AV.sx, AV.sy, { dy: -40, z: 250, s: 1.12 });
  const rk = lift(10, RANK.sx, RANK.sy, { dy: 4, z: 170, s: 1.5 });
  const bar = lift(11, BAR.sx, BAR.sy, { dy: 36, z: 210, s: land ? 1.28 : 1.18 });
  const st = STATS.map((s, i) => lift(26 + i * 2, s.sx, STAT_SY, { dx: (s.sx - 0.5) * 140, dy: 84, z: 70 + i * 25, s: 1.3 }));

  // beats
  const rankFlash = punch(f, 15, 10);
  const fill = prog(f, 17, 30, easeOut) * (12 / 30);
  const xp = Math.round(fill * 30);
  const barFlash = punch(f, 30, 8);
  const statV = (i: number) => Math.round(STATS[i].n * prog(f, 28 + i * 3, 45 + i * 3, easeOut));
  const statPunch = (i: number) => punch(f, 45 + i * 3, 9);
  const ringPulse = punch(f, 60, 12);
  const ringWave = prog(f, 60, 74, easeOut);

  const dim = (p: number) => 0.45 * p;
  const band = (sy0: number, sy1: number, o: number, key: string, sx0 = 0, sx1 = 1) => (
    <div
      key={key}
      style={{
        position: "absolute",
        left: `${sx0 * 100}%`,
        width: `${(sx1 - sx0) * 100}%`,
        top: `${((sy0 - PANEL_TOP) / (PANEL_BOTTOM - PANEL_TOP)) * 100}%`,
        height: `${((sy1 - sy0) / (PANEL_BOTTOM - PANEL_TOP)) * 100}%`,
        background: "#000",
        opacity: o,
      }}
    />
  );

  const screenH = ph / (PANEL_BOTTOM - PANEL_TOP);
  const P3 = height * 2.2;
  const orb = (x: number, y: number, z: number) => orbit(cx, cy, rigX, rigY, u, x, y, z);
  const avD = 92; // avatar photo diameter (pt)

  return (
    <>
      <SoftGlow x={av.x} y={av.y} r={360 * u} color={PLAT} opacity={0.14 + 0.25 * ringPulse} />
      <>
        {/* base plane: the captured header */}
        <Card3D
          perspective={P3}
          {...orb(cx, cy, zCam * 0.5 - 220 * av.p)}
          scale={0.94 + 0.06 * panelPop}
          rotX={rigX}
          rotY={rigY}
          blur={blur + 7 * u * av.p}
          shadow={0}
        >
          <div
            style={{
              width: pw,
              height: ph,
              borderRadius: 40 * u,
              overflow: "hidden",
              position: "relative",
              background: C.bg,
              boxShadow: `0 0 0 ${Math.max(1, u)}px ${C.border}, ${cardShadow(u, 1.2)}`,
            }}
          >
            <div style={{ position: "absolute", left: 0, top: -screenH * PANEL_TOP, width: pw, height: screenH }}>
              <Screen src="c05_profile" inSec={3.05} />
            </div>
            <div style={{ position: "absolute", inset: 0, background: "#000", opacity: 0.35 * av.p }} />
            {band(0.105, 0.262, dim(av.p), "av", 0.3, 0.7)}
            {band(0.3, 0.385, dim(rk.p), "bar", 0.05, 0.95)}
            {band(0.392, 0.458, dim(Math.max(st[0].p, av.p * 0.6)), "st", 0.05, 0.95)}
          </div>
        </Card3D>

        {/* stats: three planes */}
        {STATS.map((s, i) => (
          <Card3D
            key={s.label}
            perspective={P3}
            {...orb(st[i].x, st[i].y, st[i].z)}
            scale={st[i].scale * (1 + 0.18 * statPunch(i))}
            rotX={rigX}
            rotY={rigY}
            opacity={Math.min(1, st[i].p * 2.5)}
            blur={blur}
            shadow={0}
          >
            <div
              style={{
                padding: `${pt(8)}px ${pt(16)}px`,
                borderRadius: pt(14),
                background: `rgba(31,41,55,${0.9 * st[i].p})`,
                border: `${pt(0.6)}px solid rgba(55,65,81,${st[i].p})`,
                boxShadow: `0 ${pt(10)}px ${pt(22)}px rgba(0,0,0,0.5)${statPunch(i) > 0.01 ? `, 0 0 ${pt(22)}px ${platA(0.45 * statPunch(i))}` : ""}`,
                minWidth: pt(64),
                display: "flex",
                justifyContent: "center",
              }}
            >
              <Stat n={statV(i)} label={s.label} />
            </div>
          </Card3D>
        ))}

        {/* level line + XP bar */}
        <Card3D
          perspective={P3}
          {...orb(bar.x, bar.y, bar.z)}
          scale={bar.scale}
          rotX={rigX}
          rotY={rigY}
          opacity={Math.min(1, bar.p * 4)}
          blur={blur}
          shadow={0}
        >
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: pt(7), position: "relative" }}>
            <Txt s={pt(11)} w={500} c={C.subtext}>
              Level 8 • <span style={{ color: C.text }}>{xp}</span>/30 XP
            </Txt>
            <div style={{ position: "relative" }}>
              <div style={{ borderRadius: pt(12), boxShadow: `0 0 ${pt(30)}px ${platA(0.18 + 0.4 * barFlash)}` }}>
                <ProgressBar w={300} h={12} value={fill} color={PLAT} />
              </div>
              <div
                style={{
                  position: "absolute",
                  left: pt(300) * fill - pt(14),
                  top: -pt(8),
                  width: pt(28),
                  height: pt(28),
                  borderRadius: "50%",
                  background: `radial-gradient(circle, ${platA(0.95)} 0%, ${platA(0)} 70%)`,
                  opacity: fill > 0.01 ? 0.5 + 0.5 * barFlash : 0,
                  transform: `scale(${1 + barFlash})`,
                }}
              />
            </div>
          </div>
        </Card3D>

        {/* rank line */}
        <Card3D
          perspective={P3}
          {...orb(rk.x, rk.y, rk.z)}
          scale={rk.scale * (1 + 0.08 * rankFlash)}
          rotX={rigX}
          rotY={rigY}
          opacity={Math.min(1, rk.p * 4)}
          blur={blur}
          shadow={0}
        >
          <div style={{ display: "flex", alignItems: "center", gap: pt(7) }}>
            <Txt s={pt(15)} w={700} c={PLAT} style={{ letterSpacing: "0.1em", textShadow: `0 0 ${pt(14)}px ${platA(0.3 + 0.6 * rankFlash)}` }}>
              PLATINUM
            </Txt>
            <div style={{ transform: `scale(${1 + 0.4 * rankFlash}) rotate(${-12 * rankFlash}deg)` }}>
              <Icon name="trophy" size={pt(17)} color={PLAT} />
            </div>
          </div>
        </Card3D>

        {/* avatar ring */}
        <Card3D perspective={P3} {...orb(av.x, av.y, av.z)} scale={av.scale * (1 + 0.06 * ringPulse)} rotX={rigX} rotY={rigY} blur={blur} shadow={0}>
          <div style={{ position: "relative", width: pt(avD + 16), height: pt(avD + 16) }}>
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                border: `${pt(5)}px solid ${PLAT}`,
                boxShadow: `0 ${pt(12)}px ${pt(26)}px rgba(0,0,0,0.55), 0 0 ${pt(18 + 30 * ringPulse)}px ${platA(0.45 + 0.5 * ringPulse)}, inset 0 0 ${pt(10)}px ${platA(0.3)}`,
                background: C.bg,
              }}
            />
            <div style={{ position: "absolute", inset: pt(8), borderRadius: "50%", overflow: "hidden" }}>
              <Img src={staticFile("thumbs/avatar_profile.png")} style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scale(1.12)" }} />
            </div>
            {ringWave > 0 && ringWave < 1 && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: "50%",
                  border: `${pt(3)}px solid ${PLAT}`,
                  transform: `scale(${1 + 0.7 * ringWave})`,
                  opacity: 1 - ringWave,
                }}
              />
            )}
          </div>
        </Card3D>
      </>

      <SpeedLines dir={1} seed="profile" />
      <AbsoluteFill style={{ transform: `translateX(${-ex * width * 0.9}px)` }}>
        <Sequence from={6} layout="none">
          <Caption side="A" lines={["Level up your", "watchlist."]} highlight="Level up" />
        </Sequence>
      </AbsoluteFill>
    </>
  );
};
