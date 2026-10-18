import { Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import { Caption } from "../../lib/Caption";
import { Phone } from "../../lib/Phone";
import { SpeedLines, whipIn } from "../../lib/Transitions";
import { useLayout } from "../../kit/layout";
import { drift, easeInOut, easeOut, lerp, pop, prog } from "../../kit/motion";
import { Screen } from "../../kit/screen";
import { DockIcon, FeatureChip, Float3D, PreloadIcons, TagPill } from "../../kit/S07_extra";

export const S07_LEN = 120; // 8 features × 15f (one beat each). Was 75 (~9f each): too fast to follow.

type Item = { src: string; inSec: number; len: number; tag: string; icon: string; backIcon?: string; zoom?: number; focusY?: number };

/** In-points = Animatic MONTAGE. One beat (15f) per feature so each screen can be read.
 *  Pulse/Leaderboard only from the *_blur clips (blur windows: Pulse 1.7s, Leaderboard 2.9s → in + 0.5s fits). */
const ITEMS: Item[] = [
  { src: "c07a_detail", inSec: 12.35, len: 15, tag: "Add to List", icon: "bookmarks", zoom: 1.15, focusY: 1 },
  { src: "c07b_pulse_blur", inSec: 0.3, len: 15, tag: "Community Pulse", icon: "pulse", zoom: 1.15, focusY: 0.2 },
  { src: "c07x_chill_list_collab", inSec: 3.6, len: 15, tag: "Shared lists", icon: "people", zoom: 1.12, focusY: 0.15 },
  { src: "c07d_fav_filters", inSec: 4.1, len: 15, tag: "Smart filters", icon: "list", zoom: 1.1, focusY: 0.9 },
  { src: "c07e_leaderboard_blur", inSec: 0.5, len: 15, tag: "Leaderboard", icon: "trophy" },
  // tiles only: the banner above them has character art
  { src: "c07f_arena_tiles", inSec: 3.25, len: 15, tag: "Anime Arena", icon: "flame", zoom: 1.45, focusY: 0.95 },
  { src: "c07g_language", inSec: 3.2, len: 15, tag: "10 languages", icon: "globe-outline", zoom: 1.1, focusY: 0.25 },
  // screen flips dark → light at local ≈ 4.5f
  { src: "c07h_theme", inSec: 2.55, len: 15, tag: "Light & dark", icon: "moon-outline", backIcon: "sunny-outline" },
];

const STARTS = ITEMS.reduce<number[]>((a, it, i) => [...a, i === 0 ? 0 : a[i - 1] + ITEMS[i - 1].len], []);
const N = ITEMS.length;
const LAST_DOCK = 112; // the last chip docks 112 → 116 so the row is complete before the cut

/** Hero slots for the lifted chip (fractions of the frame): always on the phone's far side, away from the
 *  caption / tag / dock, alternating high-low so consecutive chips never collide. */
const SLOTS_L: [number, number][] = [
  [0.9, 0.3], [0.9, 0.68], [0.9, 0.3], [0.9, 0.68], [0.9, 0.3], [0.9, 0.68], [0.9, 0.3], [0.9, 0.68],
];
const SLOTS_P: [number, number][] = [
  [0.865, 0.5], [0.865, 0.78], [0.865, 0.5], [0.865, 0.78], [0.865, 0.5], [0.865, 0.78], [0.865, 0.5], [0.865, 0.78],
];

export const S07: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const L = useLayout("A");
  const { width: W, height: H, u, landscape } = L;

  const idx = Math.max(0, STARTS.findIndex((s, i) => f >= s && f < s + ITEMS[i].len));
  const cur = ITEMS[idx];
  const local = f - STARTS[idx];

  // ── phone: whip in, then a punch + alternating tilt on every cut
  const w = whipIn(f, -1, 6);
  const ph = landscape ? { x: L.phone.x / W, y: 0.5, h: 0.8 } : { x: 0.5, y: 0.65, h: 0.56 };
  const punch = lerp(local, 0, 5, 1.065, 1);
  const tilt = idx % 2 === 0 ? -11 : -4;
  const cam = {
    x: ph.x + w.dx,
    y: ph.y,
    h: ph.h,
    rotY: (landscape ? tilt : tilt * 0.6) + lerp(local, 0, 6, idx % 2 === 0 ? 3 : -3, 0),
    rotX: 3,
    rotZ: (idx % 2 === 0 ? -1 : 1) * lerp(local, 0, 6, 2.2, 1),
    scale: punch * lerp(f, 0, S07_LEN, 0.98, 1.03, drift),
    zoom: cur.zoom ?? 1,
    focusY: cur.focusY ?? 0.5,
    blurPx: w.blur,
  };

  // ── caption / tag / dock positions
  const capY = landscape ? 0.35 : 0.115;
  const tagFs = (landscape ? 56 : 52) * u;
  const tagY = landscape ? H * 0.555 : H * 0.215;
  const dockSize = (landscape ? 66 : 62) * u;
  const dockGap = (landscape ? 80 : 76) * u;
  const dockY = landscape ? H * 0.68 : H * 0.278;
  const dockX = (i: number) => (landscape ? W * 0.07 + dockSize / 2 + i * dockGap : W / 2 + (i - (N - 1) / 2) * dockGap);

  const slots = landscape ? SLOTS_L : SLOTS_P;
  const chipSize = (landscape ? 150 : 140) * u;
  const origin = { x: W * ph.x + w.dx * W, y: H * ph.y };

  const chips: React.ReactNode[] = [];
  const docked: React.ReactNode[] = [];
  ITEMS.forEach((it, i) => {
    const s = STARTS[i];
    if (f < s) return;
    const dockAt = i === N - 1 ? LAST_DOCK : s + it.len;
    const d = prog(f, dockAt, dockAt + 4, easeInOut);
    if (d >= 1) {
      const land = 1 - prog(f, dockAt + 4, dockAt + 8);
      docked.push(
        <div key={i} style={{ position: "absolute", left: dockX(i) - dockSize / 2, top: dockY - dockSize / 2, transform: `scale(${1 + 0.18 * land})` }}>
          <DockIcon icon={it.backIcon ?? it.icon} size={dockSize} on={1} />
        </div>,
      );
      return;
    }
    const lift = prog(f, s, s + 7, easeOut);
    const sp = pop(f, s, fps);
    const [sx, sy] = slots[i];
    const side = sx < 0.5 ? -1 : 1;
    const hx = lerp(lift, 0, 1, origin.x, W * sx, (t) => t);
    const hy = lerp(lift, 0, 1, origin.y, H * sy, (t) => t);
    // exit in place (shrink + fade) instead of flying across the caption/phone to the dock;
    // the dock icon pops in at its own slot when d reaches 1
    const x = hx;
    const y = hy;
    const z = (40 + 200 * lift) * (1 - d);
    const scale = (0.45 + 0.55 * sp) * (1 - 0.7 * d);
    const flip = it.backIcon ? prog(f, s + 2, s + 6, easeInOut) : 0;
    const wob = Math.sin((f - s) * 0.45) * 4 * (1 - d);
    chips.push(
      <Float3D key={i} x={x} y={y} z={z} opacity={1 - d} rotY={side * -(22 - 14 * lift) * (1 - d) + wob} rotX={(8 - 4 * lift) * (1 - d)} rotZ={side * 6 * (1 - lift) * (1 - d)} scale={scale}>
        <FeatureChip icon={it.icon} backIcon={it.backIcon} size={chipSize} flip={flip} glow={1 - d} />
      </Float3D>,
    );
  });

  // empty dock slots (outline only) so the row reads as a collection filling up
  const empty = ITEMS.map((it, i) => (
    <div key={`e${i}`} style={{ position: "absolute", left: dockX(i) - dockSize / 2, top: dockY - dockSize / 2, width: dockSize, height: dockSize, borderRadius: dockSize * 0.26, border: `${Math.max(2, dockSize * 0.035)}px dashed rgba(55,65,81,0.9)`, boxSizing: "border-box", opacity: lerp(f, 4, 12, 0, 1) }} />
  ));

  const tagIn = lerp(f, 6, 14, 0, 1);
  return (
    <>
      <PreloadIcons names={ITEMS.flatMap((it) => (it.backIcon ? [it.icon, it.backIcon] : [it.icon]))} />
      {ITEMS.map((it, i) => (
        <Sequence key={i} from={STARTS[i]} durationInFrames={it.len} layout="none">
          <Phone cam={cam}>
            <Screen src={it.src} inSec={it.inSec} />
          </Phone>
        </Sequence>
      ))}
      <SpeedLines dir={1} seed="montage" len={7} />
      <Sequence from={3} layout="none">
        <Caption side="A" lines={["And so much", "more."]} highlight="more." y={capY} stagger={9} />
      </Sequence>
      <div
        style={{
          position: "absolute",
          left: landscape ? W * 0.07 : W / 2,
          top: tagY,
          transform: `translate(${landscape ? 0 : -50}%, ${landscape ? 0 : -50}%) translateY(${(1 - tagIn) * 30 * u}px)`,
          opacity: tagIn,
        }}
      >
        <TagPill key={idx} icon={cur.icon} label={cur.tag} fs={tagFs} roll={prog(local, 0, 5)} />
      </div>
      {empty}
      {docked}
      {chips}
    </>
  );
};
