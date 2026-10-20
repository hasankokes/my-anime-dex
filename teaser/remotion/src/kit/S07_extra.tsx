/**
 * S07 Montage helpers (owner: S07/S08 agent). Original motion graphics from the app tokens.
 * FeatureChip: an extruded yellow tile with a dark Ionicon (true 3D: put it in a Layer3D with shadow={0}).
 * DockIcon: the flat "collected" version of the same tile.
 */
import { Img, staticFile } from "remotion";
import { C } from "../theme";
import { poppins } from "../lib/fonts";
import { Icon } from "./ui";
import { useLayout } from "./layout";

/** Extruded yellow chip (flat element: thickness is drawn with stacked shadows so it survives
 *  parallel renders; Layer3D gives it the 3D pose). `flip` 0..1 turns it over to reveal `backIcon`. */
export const FeatureChip: React.FC<{ icon: string; size: number; backIcon?: string; glow?: number; flip?: number }> = ({
  icon,
  size,
  backIcon,
  glow = 1,
  flip = 0,
}) => {
  const r = size * 0.24;
  const depth = size * 0.1;
  const steps = 6;
  const ext = Array.from({ length: steps }, (_, k) => {
    const t = (k + 1) / steps;
    return `${(-depth * t * 0.35).toFixed(1)}px ${(depth * t).toFixed(1)}px 0 ${C.amber}`;
  });
  const showBack = backIcon && flip > 0.5;
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <div
        style={{
          position: "absolute",
          left: -size * 0.75,
          top: -size * 0.75,
          width: size * 2.5,
          height: size * 2.5,
          borderRadius: "50%",
          background: `radial-gradient(circle, rgba(250,204,21,${0.42 * glow}) 0%, rgba(250,204,21,0) 62%)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: r,
          background: `linear-gradient(150deg, ${C.primary} 0%, ${C.primary} 45%, ${C.amber} 100%)`,
          boxShadow: [
            `inset 0 ${size * 0.03}px ${size * 0.05}px rgba(255,255,255,0.45)`,
            `inset 0 ${-size * 0.05}px ${size * 0.1}px rgba(0,0,0,0.18)`,
            ...ext,
            `0 ${depth * 2.5}px ${size * 0.3}px rgba(0,0,0,0.5)`,
          ].join(", "),
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: `rotateY(${flip * 180}deg)`,
        }}
      >
        <Icon name={showBack ? backIcon! : icon} size={size * 0.54} color={C.bg} style={showBack ? { transform: "scaleX(-1)" } : undefined} />
      </div>
    </div>
  );
};

/** Collected (docked) feature tile. `on` 0..1 fades the yellow fill in when it lands. */
export const DockIcon: React.FC<{ icon: string; size: number; on?: number }> = ({ icon, size, on = 1 }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: size * 0.26,
      boxSizing: "border-box",
      background: C.card,
      border: `${Math.max(2, size * 0.04)}px solid ${on > 0.5 ? C.primary : C.border}`,
      boxShadow: on ? `0 0 ${size * 0.5}px rgba(250,204,21,${0.35 * on})` : undefined,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    <Icon name={icon} size={size * 0.55} color={C.primary} />
  </div>
);

/** Feature tag pill: yellow icon + label that rolls up on change. */
export const TagPill: React.FC<{ icon: string; label: string; fs: number; roll: number }> = ({ icon, label, fs, roll }) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: fs * 0.4,
      padding: `${fs * 0.28}px ${fs * 0.65}px ${fs * 0.28}px ${fs * 0.45}px`,
      borderRadius: 999,
      background: C.card,
      border: `${Math.max(1, fs * 0.03)}px solid ${C.border}`,
      overflow: "hidden",
    }}
  >
    <div style={{ width: fs * 1.15, height: fs * 1.15, borderRadius: "50%", background: C.primary, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Icon name={icon} size={fs * 0.68} color={C.bg} />
    </div>
    <div
      style={{
        fontFamily: poppins,
        fontWeight: 600,
        fontSize: fs,
        color: C.text,
        lineHeight: 1.2,
        whiteSpace: "nowrap",
        transform: `translateY(${(1 - roll) * 70}%)`,
        opacity: roll,
      }}
    >
      {label}
    </div>
  </div>
);

/** Kit Icon draws via CSS mask-image, which Remotion doesn't wait for. Mounting the SVGs as <Img>
 *  makes each render tab block until they're loaded (otherwise parallel renders can drop 3D chips). */
export const PreloadIcons: React.FC<{ names: string[] }> = ({ names }) => (
  <div style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", opacity: 0, pointerEvents: "none" }}>
    {names.map((n) => (
      <Img key={n} src={staticFile(`icons/${n}.svg`)} style={{ width: 1, height: 1 }} />
    ))}
  </div>
);

/** Layer3D alternative with no shared preserve-3d context: the z-depth is projected by hand
 *  (same perspective as Space3D, origin = frame centre) and each element gets its own perspective().
 *  Shared 3D contexts dropped whole layers on some frames in parallel renders (fine with --concurrency=1). */
export const Float3D: React.FC<{
  x: number;
  y: number;
  z?: number;
  rotX?: number;
  rotY?: number;
  rotZ?: number;
  scale?: number;
  opacity?: number;
  shadow?: number;
  children: React.ReactNode;
}> = ({ x, y, z = 0, rotX = 0, rotY = 0, rotZ = 0, scale = 1, opacity = 1, shadow = 0, children }) => {
  const { width, height, u } = useLayout();
  const P = 2400 * u;
  const k = P / Math.max(P * 0.2, P - z * u);
  const px = width / 2 + (x - width / 2) * k;
  const py = height / 2 + (y - height / 2) * k;
  const sh = shadow * Math.max(0.25, Math.min(1.5, 0.6 + z / 400));
  return (
    <div style={{ position: "absolute", left: px, top: py, width: 0, height: 0, opacity }}>
      <div
        style={{
          position: "absolute",
          transform: `translate(-50%, -50%) perspective(${P}px) rotateX(${rotX}deg) rotateY(${rotY}deg) rotateZ(${rotZ}deg) scale(${scale * k})`,
          transformStyle: "preserve-3d",
          filter: sh ? `drop-shadow(0 ${30 * u * sh}px ${50 * u * sh}px rgba(0,0,0,${0.55 * Math.min(1, sh)}))` : undefined,
        }}
      >
        {children}
      </div>
    </div>
  );
};
