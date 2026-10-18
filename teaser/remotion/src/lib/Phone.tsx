import { AbsoluteFill, useVideoConfig } from "remotion";
import { C, SCREEN_ASPECT } from "../theme";

export type Cam = {
  /** centre of the phone in fractions of the frame */
  x?: number;
  y?: number;
  /** phone height as fraction of frame height */
  h?: number;
  rotY?: number;
  rotX?: number;
  rotZ?: number;
  scale?: number;
  /** zoom inside the screen (1 = whole screen) and the vertical focus point 0..1 */
  zoom?: number;
  focusY?: number;
  opacity?: number;
  blurPx?: number;
};

/** Generic slab phone with the captured screen inside. No real-device likeness. */
export const Phone: React.FC<{ cam: Cam; children: React.ReactNode }> = ({ cam, children }) => {
  const { width, height } = useVideoConfig();
  const {
    x = 0.5,
    y = 0.5,
    h = 0.86,
    rotY = 0,
    rotX = 0,
    rotZ = 0,
    scale = 1,
    zoom = 1,
    focusY = 0.5,
    opacity = 1,
    blurPx = 0,
  } = cam;
  const ph = height * h;
  const pw = ph * SCREEN_ASPECT;
  const bezel = ph * 0.012;
  const radius = ph * 0.07;
  return (
    <AbsoluteFill style={{ perspective: height * 2.2, opacity }}>
      <div
        style={{
          position: "absolute",
          left: width * x - pw / 2,
          top: height * y - ph / 2,
          width: pw,
          height: ph,
          transform: `rotateX(${rotX}deg) rotateY(${rotY}deg) rotateZ(${rotZ}deg) scale(${scale})`,
          transformStyle: "preserve-3d",
          filter: blurPx ? `blur(${blurPx}px)` : undefined,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: -bezel,
            borderRadius: radius + bezel,
            background: "#000",
            boxShadow: `0 ${ph * 0.04}px ${ph * 0.09}px rgba(0,0,0,0.55), 0 0 0 1px ${C.border}`,
          }}
        />
        <div style={{ position: "absolute", inset: 0, borderRadius: radius, overflow: "hidden", background: C.bg }}>
          <div
            style={{
              position: "absolute",
              inset: 0,
              transform: `scale(${zoom})`,
              transformOrigin: `50% ${focusY * 100}%`,
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/** Store cut: full-bleed screen, 2D push only. */
export const FullBleed: React.FC<{ cam: Cam; children: React.ReactNode }> = ({ cam, children }) => {
  const { zoom = 1, focusY = 0.5, scale = 1, opacity = 1 } = cam;
  return (
    <AbsoluteFill style={{ opacity, overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `scale(${zoom * scale})`, transformOrigin: `50% ${focusY * 100}%` }}>
        {children}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
