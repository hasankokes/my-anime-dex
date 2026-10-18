import { Easing, Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import { Caption } from "../../lib/Caption";
import { Phone } from "../../lib/Phone";
import { SpeedLines, whipIn } from "../../lib/Transitions";
import { useLayout } from "../../kit/layout";
import { drift, easeIn, easeOut, lerp, prog, settle } from "../../kit/motion";
import { FrozenScreen } from "../../kit/screen";
import { Dice3D } from "../../kit/Dice3D";
import { DockIcon, Float3D, PreloadIcons } from "../../kit/S07_extra";
import { AiringFrag, Halo, LevelFrag, ListFrag, StatPill, WatchFrag } from "../../kit/S08_extra";
import { C } from "../../theme";

export const S08_LEN = 90;

/** Beats (15f): f15 line 1 lands · f30 first cards home · f45 line 2 + halo flash · f60/75 hold · f81–89 clear. */
const EXIT = 81;

type Slot = { dx: number; dy: number; z: number; rotY: number; rotX?: number; s: number; at: number };
type El = { key: string; node: React.ReactNode; L: Slot; P: Slot; flat?: boolean };

export const S08: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { width: W, height: H, u, landscape } = useLayout();

  // ── phone: start close on the Favorites grid, pull back to reveal the whole phone
  const w = whipIn(f, 1, 6);
  const ph = landscape ? { x: 0.5, y: 0.5, h: 0.65 } : { x: 0.5, y: 0.5, h: 0.48 };
  const pull = prog(f, 0, 26, Easing.bezier(0.4, 0, 0.1, 1));
  const exitP = prog(f, EXIT + 1, 90, easeIn);
  const phoneScale = lerp(pull, 0, 1, 2.5, 1, (t) => t) * lerp(f, 30, 80, 1, 1.03, drift) * (1 - 0.8 * exitP);
  const cam = {
    x: ph.x + w.dx,
    y: ph.y,
    h: ph.h,
    scale: phoneScale,
    zoom: lerp(f, 0, 30, 1.3, 1),
    focusY: 0.42,
    rotY: lerp(f, 18, 80, -7, 6, drift),
    rotX: lerp(f, 0, 40, 9, 3),
    opacity: 1 - prog(f, EXIT + 4, 90),
    blurPx: w.blur,
  };
  const cx = W * ph.x;
  const cy = H * ph.y;
  const camDx = lerp(f, 20, 90, -40, 40, drift) * u;

  // ── the collection: fragments of every feature we just saw (values from the captures)
  const els: El[] = [
    {
      key: "watch",
      node: <WatchFrag title="Frieren: Beyond Journey's End Season 2" thumb="frieren2" ep={8} total={10} />,
      L: { dx: -500, dy: -165, z: 150, rotY: 16, s: 0.95, at: 14 },
      P: { dx: -300, dy: -420, z: 150, rotY: 12, s: 0.86, at: 14 },
    },
    {
      key: "level",
      node: <LevelFrag rank="PLATINUM" color={C.platinum} level={8} xp={12} xpMax={30} />,
      L: { dx: 495, dy: -170, z: 130, rotY: -16, s: 0.95, at: 17 },
      P: { dx: 300, dy: -230, z: 130, rotY: -12, s: 0.86, at: 17 },
    },
    {
      key: "list",
      node: <ListFrag rank={1} title="Steins;Gate" thumb="steinsgate" star="9.07" my={10} />,
      L: { dx: -490, dy: 165, z: 95, rotY: 13, s: 0.95, at: 20 },
      P: { dx: -300, dy: 190, z: 95, rotY: 11, s: 0.86, at: 20 },
    },
    {
      key: "airing",
      node: <AiringFrag title="TANK CHAIR" time="17:00" countdown="3h 7m" ep={3} />,
      L: { dx: 500, dy: 165, z: 85, rotY: -13, s: 0.95, at: 23 },
      P: { dx: 300, dy: 400, z: 85, rotY: -11, s: 0.86, at: 23 },
    },
    {
      key: "favs",
      node: <StatPill icon="heart" n={59} label="Favs" />,
      L: { dx: -255, dy: -345, z: 60, rotY: 8, s: 0.9, at: 26 },
      P: { dx: -240, dy: -600, z: 60, rotY: 6, s: 0.9, at: 26 },
    },
    {
      key: "watched",
      node: <StatPill icon="checkmark-circle" n={42} label="Watched" />,
      L: { dx: 270, dy: -345, z: 60, rotY: -8, s: 0.9, at: 28 },
      P: { dx: 240, dy: 600, z: 60, rotY: -6, s: 0.9, at: 28 },
    },
  ];
  // small montage tiles in the back plane (one depth plane behind the cards)
  const icons: { icon: string; L: [number, number]; P: [number, number] }[] = [
    { icon: "bookmarks", L: [-790, -320], P: [-440, -190] },
    { icon: "pulse", L: [-560, 420], P: [440, 20] },
    { icon: "people", L: [-770, 330], P: [-440, 400] },
    { icon: "trophy", L: [780, -330], P: [440, -420] },
    { icon: "globe-outline", L: [790, 335], P: [-440, 620] },
    { icon: "flame", L: [-860, 10], P: [440, 230] },
  ];

  const exitT = prog(f, EXIT, EXIT + 7, easeIn);
  const place = (sl: Slot, i: number) => {
    const k = settle(f, sl.at, fps);
    const kk = Math.min(1, k);
    const fl = Math.sin((f + i * 11) * 0.09) * 7 * u * kk;
    const tx = cx + sl.dx * u + camDx * (sl.z / 300);
    const ty = cy + sl.dy * u + fl;
    // fly in from beyond the slot, from behind the camera
    const sx = cx + sl.dx * u * 2.3;
    const sy = cy + sl.dy * u * 2.3;
    let x = sx + (tx - sx) * k;
    let y = sy + (ty - sy) * k;
    let z = 900 + (sl.z - 900) * k;
    let s = sl.s;
    // exit: everything is pulled back into the phone
    x += (cx - x) * exitT;
    y += (cy - y) * exitT;
    z = z * (1 - exitT);
    s = s * (1 - 0.85 * exitT);
    return {
      x,
      y,
      z,
      s,
      rotY: sl.rotY + (1 - kk) * Math.sign(sl.dx || 1) * 35,
      rotX: (sl.rotX ?? 4) + (1 - kk) * 20,
      opacity: f < sl.at ? 0 : Math.min(1, (f - sl.at) / 3) * (1 - exitT),
    };
  };

  const haloP = prog(f, 26, 46) * (1 - 0.5 * exitT);
  const flash = f >= 45 ? 1 - prog(f, 45, 53) : 0;
  const endFlash = prog(f, EXIT + 3, 89, easeOut);
  const phoneH = H * ph.h * phoneScale;

  const dieSlot = landscape ? { dx: 705, dy: 5 } : { dx: 330, dy: -610 };
  const dieK = settle(f, 25, fps);
  const dieX = cx + dieSlot.dx * u * (2.3 - 1.3 * dieK) + camDx * 0.7;
  const dieY = cy + dieSlot.dy * u * (2.3 - 1.3 * dieK);

  return (
    <>
      <PreloadIcons names={[...icons.map((i) => i.icon), "heart", "checkmark-circle", "calendar", "trophy", "star"]} />
      <Halo x={cx} y={cy} r={Math.max(phoneH, H * ph.h) * 0.62} p={haloP} flash={flash} />
      {/* end state: a warm core at centre for the logo card */}
      <div
        style={{
          position: "absolute",
          left: cx - H * 0.4,
          top: cy - H * 0.4,
          width: H * 0.8,
          height: H * 0.8,
          borderRadius: "50%",
          background: `radial-gradient(circle, rgba(250,204,21,0.45) 0%, rgba(250,204,21,0) 62%)`,
          opacity: endFlash * (landscape ? 1 : 0.85),
        }}
      />
      <>
        {icons.map((it, i) => {
          const [dx, dy] = landscape ? it.L : it.P;
          const at = 32 + i * 2;
          const k = Math.min(1, settle(f, at, fps));
          const x = cx + dx * u * (1 + 0.6 * (1 - k)) + camDx * -0.4;
          const y = cy + dy * u * (1 + 0.6 * (1 - k)) + Math.sin((f + i * 9) * 0.1) * 5 * u;
          return (
            <Float3D
              key={it.icon}
              x={x + (cx - x) * exitT}
              y={y + (cy - y) * exitT}
              z={-120}
              rotY={dx > 0 ? -18 : 18}
              scale={0.95 * (1 - 0.8 * exitT)}
              opacity={(f < at ? 0 : Math.min(1, (f - at) / 4)) * 0.9 * (1 - exitT)}
              shadow={0.4}
            >
              <DockIcon icon={it.icon} size={60 * u} on={1} />
            </Float3D>
          );
        })}
      </>
      <Phone cam={cam}>
        <FrozenScreen src="c08_favorites" atSec={2.5} />
      </Phone>
      <SpeedLines dir={-1} seed="payoff" len={7} />
      <>
        {els.map((e, i) => {
          const p = place(landscape ? e.L : e.P, i);
          return (
            <Float3D key={e.key} x={p.x} y={p.y} z={p.z} rotY={p.rotY} rotX={p.rotX} scale={p.s} opacity={p.opacity} shadow={0.8}>
              {e.node}
            </Float3D>
          );
        })}
        {f >= 25 && (
          <Float3D
            x={dieX + (cx - dieX) * exitT}
            y={dieY + (cy - dieY) * exitT}
            z={(landscape ? 120 : 200) * (1 - exitT)}
            scale={1 - 0.85 * exitT}
            opacity={Math.min(1, (f - 25) / 3) * (1 - exitT)}
            shadow={0}
          >
            <Dice3D size={(landscape ? 96 : 92) * u} rotX={-28 + f * 2.2} rotY={38 + f * 3.1} glow={0.8} />
          </Float3D>
        )}
      </>
      <Sequence from={15} layout="none">
        <Caption lines={["Your whole dex."]} x={0.5} y={landscape ? 0.095 : 0.1} align="center" size={landscape ? 0.09 : 0.097 * (W / H)} maxWidth={0.94} outAt={EXIT - 16} />
      </Sequence>
      <Sequence from={37} layout="none">
        <Caption lines={["In your pocket."]} highlight="In your pocket." x={0.5} y={landscape ? 0.905 : 0.9} align="center" size={landscape ? 0.09 : 0.097 * (W / H)} maxWidth={0.94} outAt={EXIT - 38} />
      </Sequence>
    </>
  );
};
