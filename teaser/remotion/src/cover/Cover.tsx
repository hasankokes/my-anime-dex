import { AbsoluteFill, Img, staticFile, useVideoConfig } from "remotion";
import { Phone } from "../lib/Phone";
import { poppins } from "../lib/fonts";
import { GlossyDie } from "../kit/S06_extra";
import { Card3D, SoftGlow, cardShadow } from "../kit/S04_extra";
import { Layer3D, Space3D } from "../kit/Space";
import { usePt } from "../kit/layout";
import { Card, LevelBlock, WatchingCard } from "../kit/ui";
import { C, SCREEN_ASPECT } from "../theme";

export type CoverProps = {
  /** which captured screen sits in the phone */
  screen: "dice" | "home";
  /** YouTube variant: logo + ANIME/DEX wordmark on the calm left side */
  wordmark: boolean;
};

const HOLD = { dice: "holds/c06_dice_4.0.png", home: "holds/c01_home_2.0.png" } as const;

/**
 * Cover still for the YouTube thumbnail / Play feature graphic. Google Play lays a dark gradient,
 * the app title and buttons over the LEFT ~55%, so that side stays empty (bg, grain, a faint glow).
 * All visual weight sits on the right: the 3D phone, the die and two UI cards breaking out of it.
 * Everything is sized from the frame height so 1280×720 and 1024×500 share one layout.
 */
export const Cover: React.FC<CoverProps> = ({ screen, wordmark }) => {
  const { width: W, height: H } = useVideoConfig();
  const pt = usePt();
  const k = H / 720;
  const u = H / 1080;

  // phone: right third, turned towards the title side
  // Play's 2560px desktop hero crops a 16:9 image ~12.5% top and bottom: everything that matters stays
  // inside the y 0.15–0.85 band; the phone itself may bleed off the bottom.
  const ph = H * 1.0;
  const pw = ph * SCREEN_ASPECT;
  const phone = { x: W - pw * 0.5 - H * 0.17, y: H * 0.6 };
  const P = H * 2.2;

  // card widths as a fraction of the frame height (pt() sizes come from the shared kit)
  const fit = (cardPt: number, targetPx: number) => targetPx / pt(cardPt);

  // the die has just left the "Roll Dice" button (screen point ≈ 0.79, 0.24) towards the title side
  const btn = { x: phone.x + (0.79 - 0.5) * pw * 0.95, y: phone.y + (0.24 - 0.5) * ph };
  const die = { x: phone.x - pw * 0.92, y: H * 0.28, size: H * 0.17 };
  const ctrl = { x: (btn.x + die.x) / 2 + H * 0.02, y: Math.min(btn.y, die.y) - H * 0.12 };
  const trail = Array.from({ length: 9 }, (_, i) => {
    const t = (i + 1) / 10; // 0 = button, 1 = die
    const x = (1 - t) * (1 - t) * btn.x + 2 * (1 - t) * t * ctrl.x + t * t * die.x;
    const y = (1 - t) * (1 - t) * btn.y + 2 * (1 - t) * t * ctrl.y + t * t * die.y;
    return { x, y, r: die.size * (0.12 + 0.45 * t), a: 0.22 + 0.5 * t };
  });

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg, overflow: "hidden" }}>
      {/* stage: deep bg, radial lift + yellow glow behind the phone only */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse ${H * 0.95}px ${H * 0.8}px at ${phone.x}px ${phone.y}px, ${C.bgLift} 0%, ${C.bg} 75%)`,
        }}
      />
      <SoftGlow x={phone.x - H * 0.1} y={phone.y - H * 0.05} r={H * 0.62} opacity={0.26} />
      <SoftGlow x={W * 0.22} y={H * 0.78} r={H * 0.55} opacity={0.035} />
      <Grain />

      <Phone cam={{ x: phone.x / W, y: phone.y / H, h: ph / H, rotY: -18, rotX: 6, rotZ: 1.5 }}>
        <Img src={staticFile(HOLD[screen])} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </Phone>

      {/* back plane: level card at the right edge, over the third trending poster (not over app controls) */}
      <Card3D perspective={P} x={Math.min(phone.x + pw * 0.45, W - H * 0.25)} y={H * 0.44} z={90} rotY={-14} rotX={6} rotZ={2} scale={fit(316, H * 0.28)}>
        <Card w={316} pad={14} style={{ boxShadow: cardShadow(u) }}>
          <LevelBlock rank="PLATINUM" color={C.platinum} level={8} xp={12} xpMax={30} barValue={0.4} />
        </Card>
      </Card3D>

      {/* front plane: watching card over the phone's lower-left corner */}
      <Card3D perspective={P} x={phone.x - pw * 0.3} y={H * 0.72} z={180} rotY={-10} rotX={8} rotZ={-2} scale={fit(360, H * 0.5)}>
        <div style={{ boxShadow: `${cardShadow(u, 1.2)}, 0 0 ${pt(40)}px rgba(250,204,21,0.18)`, borderRadius: pt(16) }}>
          <WatchingCard title="Frieren: Beyond Journey's End S2" thumb="frieren2" ep={8} total={10} />
        </div>
      </Card3D>

      {/* motion trail from the button to the die */}
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
            background: `radial-gradient(circle, rgba(250,204,21,${t.a}) 0%, rgba(245,158,11,${t.a * 0.4}) 45%, rgba(250,204,21,0) 70%)`,
          }}
        />
      ))}

      <Space3D perspective={P / u}>
        <Layer3D x={die.x} y={die.y} z={220} shadow={0}>
          <GlossyDie size={die.size} rotX={-24} rotY={36} rotZ={6} glow={1.2} sheen={0.55} />
        </Layer3D>
      </Space3D>

      {/* frame-level bottom fade: keeps the poster grid at the phone's foot from competing with the die */}
      <AbsoluteFill style={{ background: "linear-gradient(0deg, rgba(15,15,15,0.7) 0%, rgba(15,15,15,0) 26%)" }} />

      {wordmark && <Wordmark k={k} />}
    </AbsoluteFill>
  );
};

/** Logo + "ANIME" white / "DEX" yellow, Poppins Bold, as in the app header. */
const Wordmark: React.FC<{ k: number }> = ({ k }) => {
  const { height: H, width: W } = useVideoConfig();
  return (
    <div
      style={{
        position: "absolute",
        left: W * 0.065,
        top: H * 0.5,
        transform: "translateY(-50%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: 10 * k,
      }}
    >
      <Img src={staticFile("brand/logo_color.png")} style={{ height: H * 0.34, filter: `drop-shadow(0 ${12 * k}px ${30 * k}px rgba(0,0,0,0.6))` }} />
      <div style={{ fontFamily: poppins, fontWeight: 700, fontSize: 92 * k, lineHeight: 1, letterSpacing: "0.005em", color: C.text }}>
        ANIME<span style={{ color: C.primary }}>DEX</span>
      </div>
    </div>
  );
};

/** Static grain (stills: no re-seeding needed). Kept off the phone by paint order. */
const Grain: React.FC = () => (
  <AbsoluteFill
    style={{
      opacity: 0.035,
      mixBlendMode: "screen",
      backgroundImage:
        "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='256' height='256'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
    }}
  />
);
