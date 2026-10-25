import { AbsoluteFill, Img, staticFile, useVideoConfig } from "remotion";

/**
 * Review-only mocks of the Google Play listing hero, to check a cover image under Play's own chrome.
 * Approximation (not Google's code): desktop = full-width hero with a black→transparent gradient over
 * the left ~55%, app icon, title, green Install + trailer button; mobile = 16:9 video thumbnail with a
 * centred play button, then icon/title/Install below. No Google branding is reproduced.
 */
const SANS = "Roboto, 'Helvetica Neue', Arial, sans-serif";
const GREEN = "#01875F";

const PlayButton: React.FC<{ size: number }> = ({ size }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: "50%",
      background: "rgba(0,0,0,0.55)",
      border: `${Math.max(2, size * 0.04)}px solid rgba(255,255,255,0.9)`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    <div
      style={{
        width: 0,
        height: 0,
        marginLeft: size * 0.08,
        borderTop: `${size * 0.2}px solid transparent`,
        borderBottom: `${size * 0.2}px solid transparent`,
        borderLeft: `${size * 0.32}px solid #fff`,
      }}
    />
  </div>
);

export const PlayMockDesktop: React.FC<{ img: string }> = ({ img }) => {
  const { width: W, height: H } = useVideoConfig();
  const s = W / 2560;
  return (
    <AbsoluteFill style={{ background: "#000", fontFamily: SANS }}>
      {/* hero image: cover, anchored right like Play's hero */}
      <Img src={staticFile(img)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "right center" }} />
      <AbsoluteFill style={{ background: "linear-gradient(90deg, #000 0%, rgba(0,0,0,0.92) 30%, rgba(0,0,0,0.55) 45%, rgba(0,0,0,0) 58%)" }} />
      <AbsoluteFill style={{ background: "linear-gradient(0deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 22%)" }} />
      <div style={{ position: "absolute", left: 160 * s, top: H * 0.5, transform: "translateY(-50%)", display: "flex", flexDirection: "column", gap: 28 * s }}>
        <div style={{ fontSize: 120 * s, fontWeight: 500, color: "#fff", letterSpacing: "-0.01em" }}>MyAnimeDex</div>
        <div style={{ fontSize: 34 * s, color: "#A8DAB5", fontWeight: 500 }}>Developer name</div>
        <div style={{ fontSize: 28 * s, color: "#C4C7C5" }}>Contains ads · In-app purchases</div>
        <div style={{ display: "flex", gap: 24 * s, marginTop: 24 * s, alignItems: "center" }}>
          <div style={{ background: GREEN, color: "#fff", fontSize: 32 * s, fontWeight: 500, padding: `${22 * s}px ${110 * s}px`, borderRadius: 16 * s }}>Install</div>
          <div style={{ color: "#A8DAB5", fontSize: 30 * s, fontWeight: 500, padding: `${20 * s}px ${36 * s}px`, borderRadius: 16 * s, border: `${2 * s}px solid #444` }}>▶ Trailer</div>
        </div>
      </div>
      <div style={{ position: "absolute", left: 160 * s, top: 70 * s, color: "#C4C7C5", fontSize: 30 * s }}>Google Play listing mock (review only)</div>
    </AbsoluteFill>
  );
};

export const PlayMockMobile: React.FC<{ img: string }> = ({ img }) => {
  const { width: W } = useVideoConfig();
  const s = W / 390;
  const heroH = (W * 9) / 16;
  return (
    <AbsoluteFill style={{ background: "#131314", fontFamily: SANS }}>
      <div style={{ position: "relative", width: W, height: heroH, overflow: "hidden" }}>
        <Img src={staticFile(img)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
          <PlayButton size={52 * s} />
        </AbsoluteFill>
      </div>
      <div style={{ display: "flex", gap: 16 * s, padding: `${20 * s}px ${20 * s}px ${12 * s}px` }}>
        <Img src={staticFile("brand/app_icon.png")} style={{ width: 64 * s, height: 64 * s, borderRadius: 14 * s }} />
        <div>
          <div style={{ fontSize: 22 * s, color: "#fff", fontWeight: 500 }}>MyAnimeDex</div>
          <div style={{ fontSize: 13 * s, color: "#A8DAB5", marginTop: 4 * s }}>Developer name</div>
          <div style={{ fontSize: 11 * s, color: "#C4C7C5", marginTop: 2 * s }}>Contains ads · In-app purchases</div>
        </div>
      </div>
      <div style={{ margin: `${8 * s}px ${20 * s}px`, background: GREEN, color: "#fff", textAlign: "center", fontSize: 14 * s, fontWeight: 500, padding: `${10 * s}px 0`, borderRadius: 20 * s }}>
        Install
      </div>
    </AbsoluteFill>
  );
};
