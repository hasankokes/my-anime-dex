import {
  AbsoluteFill,
  Audio,
  Easing,
  Freeze,
  Img,
  interpolate,
  OffthreadVideo,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Caption } from "./lib/Caption";
import { poppins } from "./lib/fonts";
import { Cam, Phone } from "./lib/Phone";
import { Grain, Stage } from "./lib/Stage";
import { SpeedLines, whipIn } from "./lib/Transitions";
import { C, EASE_OUT, FPS } from "./theme";

const clip = (name: string) => staticFile(`proxy/${name}.mp4`);

const ease = Easing.bezier(...EASE_OUT);
const lerp = (f: number, a: number, b: number, from: number, to: number, e = ease) =>
  interpolate(f, [a, b], [from, to], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: e });

/** Captured screen, starting `inSec` into the clip. */
const Screen: React.FC<{ src: string; inSec: number }> = ({ src, inSec }) => (
  <OffthreadVideo src={clip(src)} startFrom={Math.round(inSec * FPS)} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
);

const FrozenScreen: React.FC<{ src: string; atSec: number }> = ({ src, atSec }) => (
  <Freeze frame={Math.round(atSec * FPS)}>
    <OffthreadVideo src={clip(src)} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
  </Freeze>
);

// ───────────────────────── S01 Hook ─────────────────────────
const Hook: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: f, fps, config: { damping: 14, stiffness: 180 } });
  const cam: Cam = {
    x: 0.68,
    h: 0.88,
    scale: interpolate(s, [0, 1], [1.35, 1]) * lerp(f, 0, 60, 1, 1.03),
    rotY: lerp(f, 0, 60, -14, -7),
    rotX: 4,
    opacity: Math.min(1, s * 1.6),
  };
  return (
    <>
      <Phone cam={cam}>
        <Screen src="c01_home" inSec={1.0} />
      </Phone>
      <Sequence from={4} layout="none">
        <Caption lines={["Your anime.", "All of it."]} highlight="All of it." x={0.07} stagger={15} />
      </Sequence>
    </>
  );
};

// ───────────────────── generic hero shot ─────────────────────
type HeroProps = {
  len: number;
  dir: 1 | -1;
  caption: string[];
  highlight: string;
  phoneX: number;
  capX: number;
  camFrom: Cam;
  camTo: Cam;
  children: React.ReactNode;
};

const Hero: React.FC<HeroProps> = ({ len, dir, caption, highlight, phoneX, capX, camFrom, camTo, children }) => {
  const f = useCurrentFrame();
  const w = whipIn(f, dir);
  const k = (key: keyof Cam, d: number) =>
    lerp(f, 0, len, (camFrom[key] as number | undefined) ?? d, (camTo[key] as number | undefined) ?? d, Easing.bezier(0.33, 0, 0.2, 1));
  const cam: Cam = {
    x: phoneX + w.dx,
    h: 0.88,
    rotY: k("rotY", 0),
    rotX: k("rotX", 0),
    scale: k("scale", 1),
    zoom: k("zoom", 1),
    focusY: k("focusY", 0.5),
    blurPx: w.blur,
  };
  return (
    <>
      <Phone cam={cam}>{children}</Phone>
      <SpeedLines dir={dir === 1 ? -1 : 1} seed={caption[0]} />
      <Sequence from={6} layout="none">
        <Caption lines={caption} highlight={highlight} x={capX} align={capX > 0.5 ? "right" : "left"} />
      </Sequence>
    </>
  );
};

// ───────────────────────── S05 Profile ─────────────────────────
// Only the profile header (avatar, rank, level bar, stats) is shown, lifted out of the phone as a
// floating UI layer. The Premium card below it advertises unimplemented features, so it must never be in frame.
const PANEL_TOP = 0.075; // fraction of screen height
const PANEL_BOTTOM = 0.462; // Premium card starts at ~0.47

const ProfilePanel: React.FC = () => {
  const f = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const w = whipIn(f, -1);
  const pw = height * 0.62 * (1320 / ((PANEL_BOTTOM - PANEL_TOP) * 2868));
  const ph = height * 0.62;
  const screenH = ph / (PANEL_BOTTOM - PANEL_TOP);
  const pop = spring({ frame: f - 4, fps, config: { damping: 13, stiffness: 170 } });
  const rotY = lerp(f, 0, 75, -16, -6);
  const scale = lerp(f, 0, 75, 0.97, 1.03) * interpolate(pop, [0, 1], [0.96, 1]);
  return (
    <>
      <AbsoluteFill style={{ perspective: height * 2.2 }}>
        <div
          style={{
            position: "absolute",
            left: width * (0.66 + w.dx) - pw / 2,
            top: height * 0.5 - ph / 2,
            width: pw,
            height: ph,
            borderRadius: height * 0.04,
            overflow: "hidden",
            transform: `rotateY(${rotY}deg) rotateX(4deg) scale(${scale})`,
            boxShadow: `0 ${ph * 0.05}px ${ph * 0.12}px rgba(0,0,0,0.6), 0 0 0 1px ${C.border}`,
            filter: w.blur ? `blur(${w.blur}px)` : undefined,
            background: C.bg,
          }}
        >
          <div style={{ position: "absolute", left: 0, top: -screenH * PANEL_TOP, width: pw, height: screenH }}>
            <Screen src="c05_profile" inSec={3.05} />
          </div>
        </div>
      </AbsoluteFill>
      <SpeedLines dir={1} seed="profile" />
      <Sequence from={6} layout="none">
        <Caption lines={["Level up your", "watchlist."]} highlight="Level up" x={0.07} />
      </Sequence>
    </>
  );
};

// ───────────────────────── S07 Montage ─────────────────────────
const MONTAGE: { src: string; inSec: number; len: number; tag: string; zoom?: number; focusY?: number }[] = [
  { src: "c07a_detail", inSec: 12.55, len: 9, tag: "Add to List", zoom: 1.5, focusY: 1 },
  { src: "c07b_pulse_blur", inSec: 0.3, len: 9, tag: "Community Pulse", zoom: 1.6, focusY: 0.22 },
  { src: "c07x_chill_list_collab", inSec: 3.6, len: 9, tag: "Shared lists", zoom: 1.3, focusY: 0.2 },
  { src: "c07d_fav_filters", inSec: 4.2, len: 10, tag: "Smart filters", zoom: 1.2, focusY: 0.9 },
  { src: "c07e_leaderboard_blur", inSec: 0.5, len: 9, tag: "Leaderboard" },
  { src: "c07f_arena_tiles", inSec: 3.4, len: 9, tag: "Anime Arena", zoom: 1.35, focusY: 0.62 },
  { src: "c07g_language", inSec: 3.2, len: 10, tag: "10 languages", zoom: 1.2, focusY: 0.3 },
  { src: "c07h_theme", inSec: 2.55, len: 10, tag: "Light & dark" },
];

const Montage: React.FC = () => {
  const f = useCurrentFrame();
  const { height, width } = useVideoConfig();
  let acc = 0;
  const starts = MONTAGE.map((m) => {
    const s = acc;
    acc += m.len;
    return s;
  });
  const idx = Math.max(0, starts.findIndex((s, i) => f >= s && f < s + MONTAGE[i].len));
  const m = MONTAGE[idx];
  const local = f - starts[idx];
  const punch = lerp(local, 0, 4, 1.04, 1);
  return (
    <>
      {MONTAGE.map((it, i) => (
        <Sequence key={i} from={starts[i]} durationInFrames={it.len} layout="none">
          <Phone cam={{ x: 0.68, h: 0.88, rotY: -6, scale: punch, zoom: it.zoom ?? 1, focusY: it.focusY ?? 0.5 }}>
            <Screen src={it.src} inSec={it.inSec} />
          </Phone>
          <SpeedLines len={2} seed={`m${i}`} dir={i % 2 ? 1 : -1} />
        </Sequence>
      ))}
      <Caption lines={["And so much more."]} highlight="more." x={0.07} y={0.44} stagger={0} />
      <div
        style={{
          position: "absolute",
          left: width * 0.07,
          top: height * 0.6,
          padding: `${height * 0.012}px ${height * 0.03}px`,
          borderRadius: 999,
          background: C.card,
          border: `1px solid ${C.border}`,
          fontFamily: poppins,
          fontWeight: 600,
          fontSize: height * 0.045,
          color: C.text,
        }}
      >
        <span style={{ color: C.primary }}>●</span> {m.tag}
      </div>
    </>
  );
};

// ───────────────────────── S08 Payoff ─────────────────────────
const Payoff: React.FC = () => {
  const f = useCurrentFrame();
  const cam: Cam = {
    x: lerp(f, 0, 60, 0.5, 0.66),
    h: 0.88,
    scale: lerp(f, 0, 70, 1.25, 0.82),
    zoom: lerp(f, 0, 50, 2.0, 1),
    focusY: 0.45,
    rotY: lerp(f, 20, 90, 0, -8),
    rotX: lerp(f, 20, 90, 0, 5),
  };
  return (
    <>
      <Phone cam={cam}>
        <FrozenScreen src="c08_favorites" atSec={2.5} />
      </Phone>
      <Sequence from={22} layout="none">
        <Caption lines={["Your whole dex.", "In your pocket."]} highlight="In your pocket." x={0.07} stagger={15} />
      </Sequence>
    </>
  );
};

// ───────────────────────── S09 End card ─────────────────────────
const Badge: React.FC<{ top: string; main: string }> = ({ top, main }) => {
  const { height } = useVideoConfig();
  return (
    <div
      style={{
        border: `1.5px solid ${C.subtext}`,
        borderRadius: height * 0.018,
        padding: `${height * 0.008}px ${height * 0.028}px`,
        background: "#000",
        fontFamily: poppins,
        color: C.text,
        lineHeight: 1.1,
      }}
    >
      <div style={{ fontSize: height * 0.022, fontWeight: 500 }}>{top}</div>
      <div style={{ fontSize: height * 0.042, fontWeight: 600 }}>{main}</div>
    </div>
  );
};

const EndCard: React.FC<{ store?: boolean }> = ({ store }) => {
  const f = useCurrentFrame();
  const { fps, height } = useVideoConfig();
  const s = spring({ frame: f, fps, config: { damping: 12, stiffness: 160 } });
  const flicker = f > 2 && f < 6 ? (f % 2 ? 0.55 : 1) : 1;
  const sub = lerp(f, 12, 24, 0, 1);
  const fadeOut = lerp(f, 75, 90, 1, 0);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: fadeOut }}>
      <Img
        src={staticFile("brand/logo_neon.png")}
        style={{ height: height * 0.42, transform: `scale(${interpolate(s, [0, 1], [0.6, 1])})`, opacity: Math.min(1, s * 1.5) * flicker }}
      />
      <div style={{ opacity: sub, transform: `translateY(${(1 - sub) * 20}px)`, display: "flex", flexDirection: "column", alignItems: "center", gap: height * 0.025 }}>
        {store ? (
          <div style={{ fontFamily: poppins, fontWeight: 600, fontSize: height * 0.05, color: C.text }}>Your Anime Companion.</div>
        ) : (
          <>
            <div style={{ display: "flex", gap: height * 0.025 }}>
              <Badge top="Download on the" main="App Store" />
              <Badge top="GET IT ON" main="Google Play" />
            </div>
            <div style={{ fontFamily: poppins, fontWeight: 500, fontSize: height * 0.038, color: C.subtext }}>myanimedex.com</div>
          </>
        )}
      </div>
    </AbsoluteFill>
  );
};

// ───────────────────────── Timeline ─────────────────────────
export const Animatic: React.FC<{ store?: boolean }> = ({ store }) => {
  const f = useCurrentFrame();
  // Glow tint follows the shot (Platinum rank colour on the Profile shot).
  const glow = f >= 330 && f < 405 ? C.platinum : C.primary;
  const glowOpacity = f >= 405 && f < 495 ? lerp(f, 405, 465, 0.25, 0.45) : 0.26;
  return (
    <Stage glow={glow} glowOpacity={glowOpacity}>
      <Grain />
      <Sequence from={0} durationInFrames={60}>
        <Hook />
      </Sequence>
      <Sequence from={60} durationInFrames={90}>
        <Hero len={90} dir={1} caption={["Track every", "episode."]} highlight="every" phoneX={0.32} capX={0.93}
          camFrom={{ rotY: 9, scale: 1, zoom: 1, focusY: 0.2 }} camTo={{ rotY: 6, scale: 1.06, zoom: 1.08, focusY: 0.15 }}>
          <Sequence durationInFrames={45} layout="none"><Screen src="c02_watching" inSec={5.29} /></Sequence>
          <Sequence from={45} layout="none"><Screen src="c02_watching" inSec={8.87} /></Sequence>
        </Hero>
      </Sequence>
      <Sequence from={150} durationInFrames={90}>
        <Hero len={90} dir={-1} caption={["Never miss", "a drop."]} highlight="a drop." phoneX={0.68} capX={0.07}
          camFrom={{ rotY: -9, rotX: 3 }} camTo={{ rotY: -6, rotX: 5, scale: 1.05, zoom: 1.06, focusY: 0.35 }}>
          <Screen src="c03_calendar" inSec={1.0} />
        </Hero>
      </Sequence>
      <Sequence from={240} durationInFrames={90}>
        <Hero len={90} dir={1} caption={["Rank it.", "Share it."]} highlight="Rank it." phoneX={0.32} capX={0.93}
          camFrom={{ rotY: 8, rotX: 6, zoom: 1.0, focusY: 0.45 }} camTo={{ rotY: 5, rotX: 4, scale: 1.06, zoom: 1.06, focusY: 0.42 }}>
          <Screen src="c04_list" inSec={2.2} />
        </Hero>
      </Sequence>
      <Sequence from={330} durationInFrames={75}>
        <ProfilePanel />
      </Sequence>
      <Sequence from={405} durationInFrames={90}>
        <Hero len={90} dir={1} caption={["Can't decide?", "Roll."]} highlight="Roll." phoneX={0.32} capX={0.93}
          camFrom={{ rotY: 6, zoom: 1.0, focusY: 0.4 }} camTo={{ rotY: 2, scale: 1.1, zoom: 1.08, focusY: 0.4 }}>
          <Screen src="c06_dice" inSec={3.0} />
        </Hero>
      </Sequence>
      <Sequence from={495} durationInFrames={75}>
        <Montage />
      </Sequence>
      <Sequence from={570} durationInFrames={90}>
        <Payoff />
      </Sequence>
      <Sequence from={660} durationInFrames={90}>
        <EndCard store={store} />
      </Sequence>
      <Audio src={staticFile("audio/placeholder.wav")} />
    </Stage>
  );
};
