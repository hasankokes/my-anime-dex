/**
 * STORE cut — App Store app preview (886×1920, 15–30s, ≤30fps). Apple rules: mostly real captured UI,
 * no device imagery, no hands, no badges/pricing, no "best/#1" claims. Overlays and transitions are allowed.
 * Layout: caption band on top, the real screen recording as a rounded card below (no device frame).
 * Same edit as the promo (captures/edl.json), no breakout graphics.
 */
import { AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { lerp, drift, easeIn, prog } from "../kit/motion";
import { FrozenScreen, Screen } from "../kit/screen";
import { Grain, Stage } from "../lib/Stage";
import { poppins } from "../lib/fonts";
import { S09 } from "../promo/shots/S09_EndCard";
import { C, SCREEN_ASPECT } from "../theme";

const SCREEN_W = 0.8; // fraction of frame width
const PANEL_TOP = 0.075; // S05: profile header only — the Premium card below must never show
const PANEL_BOTTOM = 0.462;

/** Caption band text (two lines max, one yellow phrase). */
const StoreCaption: React.FC<{ lines: string[]; highlight: string; size?: number }> = ({ lines, highlight, size = 0.088 }) => {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const fs = width * size; // 0.088 → 78px at 886w (style guide: ≥72; montage one-liner 64px)
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: height * 0.045,
        textAlign: "center",
        fontFamily: poppins,
        fontWeight: 700,
        fontSize: fs,
        lineHeight: 1.08,
        color: C.text,
        letterSpacing: "-0.01em",
      }}
    >
      {lines.map((l, i) => {
        const t = prog(f, 3 + i * 6, 13 + i * 6);
        const hi = l.includes(highlight);
        const [a, b] = hi ? l.split(highlight) : [l, ""];
        return (
          <div key={i} style={{ overflow: "hidden" }}>
            <div style={{ transform: `translateY(${(1 - t) * 100}%)`, opacity: t }}>
              {hi ? (
                <>
                  {a}
                  <span style={{ color: C.primary }}>{highlight}</span>
                  {b}
                </>
              ) : (
                l
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

/** The real screen as a rounded card. `zoom`/`focusY` push inside the recording; slide-in on entry. */
const ScreenCard: React.FC<{ children: React.ReactNode; len: number; dir?: 1 | -1; zoomTo?: number; focusY?: number; entry?: boolean }> = ({
  children,
  len,
  dir = 1,
  zoomTo = 1.04,
  focusY = 0.3,
  entry = true,
}) => {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const w = width * SCREEN_W;
  const h = w / SCREEN_ASPECT;
  const inP = entry ? prog(f, 0, 8) : 1;
  const outP = prog(f, len - 4, len, easeIn);
  const x = (1 - inP) * dir * width * 0.6 - outP * dir * width * 0.6;
  const zoom = lerp(f, 0, len, 1, zoomTo, drift);
  return (
    <div
      style={{
        position: "absolute",
        left: (width - w) / 2 + x,
        top: height - h - height * 0.025,
        width: w,
        height: h,
        borderRadius: w * 0.075,
        overflow: "hidden",
        boxShadow: `0 ${height * 0.02}px ${height * 0.05}px rgba(0,0,0,0.6), 0 0 0 1px ${C.border}`,
        background: C.bg,
      }}
    >
      <div style={{ position: "absolute", inset: 0, transform: `scale(${zoom})`, transformOrigin: `50% ${focusY * 100}%` }}>{children}</div>
    </div>
  );
};

/** S05: only the profile header region, enlarged — never the Premium card. */
const ProfileCard: React.FC<{ len: number }> = ({ len }) => {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const w = width * 0.92;
  const screenH = w / SCREEN_ASPECT;
  const h = screenH * (PANEL_BOTTOM - PANEL_TOP);
  const inP = prog(f, 0, 8);
  const outP = prog(f, len - 4, len, easeIn);
  return (
    <div
      style={{
        position: "absolute",
        left: (width - w) / 2 + (1 - inP) * -width * 0.6 + outP * width * 0.6,
        top: height * 0.58 - h / 2,
        width: w,
        height: h,
        borderRadius: w * 0.06,
        overflow: "hidden",
        boxShadow: `0 ${height * 0.02}px ${height * 0.05}px rgba(0,0,0,0.6), 0 0 0 1px ${C.border}`,
        transform: `scale(${lerp(f, 0, len, 1, 1.04, drift)})`,
      }}
    >
      <div style={{ position: "absolute", left: 0, top: -screenH * PANEL_TOP, width: w, height: screenH }}>
        <Screen src="c05_profile" inSec={3.05} />
      </div>
    </div>
  );
};

const MONTAGE: { src: string; inSec: number; len: number; tag: string; focusY?: number; zoom?: number }[] = [
  // one beat (15f) per feature — same in-points as the promo (S07)
  { src: "c07a_detail", inSec: 12.35, len: 15, tag: "Add to List", zoom: 1.35, focusY: 1 },
  { src: "c07b_pulse_blur", inSec: 0.3, len: 15, tag: "Community Pulse", zoom: 1.5, focusY: 0.22 },
  { src: "c07x_chill_list_collab", inSec: 3.6, len: 15, tag: "Shared lists" },
  { src: "c07d_fav_filters", inSec: 4.1, len: 15, tag: "Smart filters", zoom: 1.15, focusY: 0.9 },
  { src: "c07e_leaderboard_blur", inSec: 0.5, len: 15, tag: "Leaderboard" },
  { src: "c07f_arena_tiles", inSec: 3.25, len: 15, tag: "Anime Arena", zoom: 1.3, focusY: 0.62 },
  { src: "c07g_language", inSec: 3.2, len: 15, tag: "10 languages", zoom: 1.15, focusY: 0.3 },
  { src: "c07h_theme", inSec: 2.55, len: 15, tag: "Light & dark" },
];

const Montage: React.FC = () => {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  let acc = 0;
  const starts = MONTAGE.map((m) => ((acc += m.len), acc - m.len));
  const idx = Math.max(0, starts.findIndex((s, i) => f >= s && f < s + MONTAGE[i].len));
  return (
    <>
      {MONTAGE.map((m, i) => (
        <Sequence key={i} from={starts[i]} durationInFrames={m.len} layout="none">
          <ScreenCard len={m.len} entry={false} zoomTo={(m.zoom ?? 1) * 1.02} focusY={m.focusY ?? 0.5}>
            <div style={{ position: "absolute", inset: 0, transform: `scale(${m.zoom ?? 1})`, transformOrigin: `50% ${(m.focusY ?? 0.5) * 100}%` }}>
              <Screen src={m.src} inSec={m.inSec} />
            </div>
          </ScreenCard>
        </Sequence>
      ))}
      <StoreCaption lines={["And so much more."]} highlight="more." size={0.072} />
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: height * 0.115,
          transform: "translateX(-50%)",
          padding: `${width * 0.015}px ${width * 0.04}px`,
          borderRadius: 999,
          background: C.card,
          border: `1px solid ${C.border}`,
          fontFamily: poppins,
          fontWeight: 600,
          fontSize: width * 0.05,
          color: C.text,
          whiteSpace: "nowrap",
        }}
      >
        <span style={{ color: C.primary }}>●</span> {MONTAGE[idx].tag}
      </div>
    </>
  );
};

const Shot: React.FC<{ from: number; len: number; children: React.ReactNode }> = ({ from, len, children }) => (
  <Sequence from={from} durationInFrames={len}>
    {children}
  </Sequence>
);

export const StoreCut: React.FC<{ audio?: string }> = ({ audio = "audio/mix.wav" }) => {
  const f = useCurrentFrame();
  const glow = f >= 330 && f < 405 ? C.platinum : C.primary;
  return (
    <Stage glow={glow} glowOpacity={0.22}>
      <Grain />
      <Shot from={0} len={60}>
        <HookCard />
        <StoreCaption lines={["Your anime.", "All of it."]} highlight="All of it." />
      </Shot>
      <Shot from={60} len={90}>
        <ScreenCard len={90} dir={1} zoomTo={1.06} focusY={0.15}>
          <Sequence durationInFrames={45} layout="none"><Screen src="c02_watching" inSec={5.29} /></Sequence>
          <Sequence from={45} layout="none"><Screen src="c02_watching" inSec={8.87} /></Sequence>
        </ScreenCard>
        <StoreCaption lines={["Track every", "episode."]} highlight="every" />
      </Shot>
      <Shot from={150} len={90}>
        <ScreenCard len={90} dir={-1} zoomTo={1.05} focusY={0.3}>
          <Screen src="c03_calendar" inSec={1.0} />
        </ScreenCard>
        <StoreCaption lines={["Never miss", "a drop."]} highlight="a drop." />
      </Shot>
      <Shot from={240} len={90}>
        <ScreenCard len={90} dir={1} zoomTo={1.06} focusY={0.45}>
          <Screen src="c04_list" inSec={2.2} />
        </ScreenCard>
        <StoreCaption lines={["Rank it.", "Share it."]} highlight="Rank it." />
      </Shot>
      <Shot from={330} len={75}>
        <ProfileCard len={75} />
        <StoreCaption lines={["Level up your", "watchlist."]} highlight="Level up" />
      </Shot>
      <Shot from={405} len={90}>
        <ScreenCard len={90} dir={1} zoomTo={1.08} focusY={0.42}>
          <Screen src="c06_dice" inSec={3.0} />
        </ScreenCard>
        <StoreCaption lines={["Can't decide?", "Roll."]} highlight="Roll." />
      </Shot>
      <Shot from={495} len={120}>
        <Montage />
      </Shot>
      <Shot from={615} len={90}>
        <PayoffCard />
        <StoreCaption lines={["Your whole dex.", "In your pocket."]} highlight="In your pocket." />
      </Shot>
      <Shot from={705} len={90}>
        <S09 store />
      </Shot>
      <Audio src={staticFile(audio)} />
    </Stage>
  );
};

/** S01: screen card snaps up from slightly larger (no device), on beat 1. */
const HookCard: React.FC = () => {
  const f = useCurrentFrame();
  const s = interpolate(prog(f, 0, 8), [0, 1], [1.12, 1]);
  return (
    <AbsoluteFill style={{ transform: `scale(${s})`, opacity: prog(f, 0, 4) }}>
      <ScreenCard len={60} entry={false} zoomTo={1.03} focusY={0.2}>
        <Screen src="c01_home" inSec={1.0} />
      </ScreenCard>
    </AbsoluteFill>
  );
};

/** S08: the whole Favorites grid; card pulls back to reveal the collection, then clears for the end card. */
const PayoffCard: React.FC = () => {
  const f = useCurrentFrame();
  const scale = lerp(f, 0, 70, 1.12, 0.94, drift) * (1 - prog(f, 82, 90, easeIn) * 0.6);
  return (
    <AbsoluteFill style={{ transform: `scale(${scale})`, opacity: 1 - prog(f, 84, 90) }}>
      <ScreenCard len={200} entry={false} zoomTo={1} focusY={0.3}>
        <FrozenScreen src="c08_favorites" atSec={2.5} />
      </ScreenCard>
    </AbsoluteFill>
  );
};
