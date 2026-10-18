import { AbsoluteFill } from "remotion";
import { useLayout } from "./layout";

/** Shared 3D space. Put Layer3D children inside. */
export const Space3D: React.FC<{ children: React.ReactNode; perspective?: number }> = ({ children, perspective = 2400 }) => {
  const { u } = useLayout();
  return (
    <AbsoluteFill style={{ perspective: perspective * u, perspectiveOrigin: "50% 50%", transformStyle: "preserve-3d" }}>
      {children}
    </AbsoluteFill>
  );
};

export type L3 = {
  /** centre in px (frame coordinates) */
  x: number;
  y: number;
  /** depth in u; positive = towards camera */
  z?: number;
  rotX?: number;
  rotY?: number;
  rotZ?: number;
  scale?: number;
  opacity?: number;
  blur?: number;
  /** drop shadow strength 0..1 (auto-scaled by z) */
  shadow?: number;
};

/** One element floating in 3D. Its children are laid out from the element's own centre. */
export const Layer3D: React.FC<L3 & { children: React.ReactNode }> = ({
  x,
  y,
  z = 0,
  rotX = 0,
  rotY = 0,
  rotZ = 0,
  scale = 1,
  opacity = 1,
  blur = 0,
  shadow = 0.6,
  children,
}) => {
  const { u } = useLayout();
  const sh = shadow * Math.max(0.25, Math.min(1.5, 0.6 + z / 400));
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: 0,
        height: 0,
        transformStyle: "preserve-3d",
        transform: `translateZ(${z * u}px) rotateX(${rotX}deg) rotateY(${rotY}deg) rotateZ(${rotZ}deg) scale(${scale})`,
        opacity,
      }}
    >
      <div
        style={{
          position: "absolute",
          transform: "translate(-50%, -50%)",
          // a CSS filter flattens 3D children: pass shadow={0} and blur={0} for true-3D content (Dice3D)
          transformStyle: "preserve-3d",
          filter: [blur ? `blur(${blur}px)` : "", sh ? `drop-shadow(0 ${30 * u * sh}px ${50 * u * sh}px rgba(0,0,0,${0.55 * Math.min(1, sh)}))` : ""]
            .join(" ")
            .trim() || undefined,
        }}
      >
        {children}
      </div>
    </div>
  );
};
