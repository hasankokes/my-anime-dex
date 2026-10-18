import { C } from "../theme";

/**
 * Original 3D die in the app's accent (the Roll Dice feature uses a yellow glowing die).
 * Pure CSS cube: yellow faces, #111827 pips, rounded edges, accent glow.
 */
const PIPS: Record<number, [number, number][]> = {
  1: [[0.5, 0.5]],
  2: [[0.27, 0.27], [0.73, 0.73]],
  3: [[0.25, 0.25], [0.5, 0.5], [0.75, 0.75]],
  4: [[0.27, 0.27], [0.73, 0.27], [0.27, 0.73], [0.73, 0.73]],
  5: [[0.25, 0.25], [0.75, 0.25], [0.5, 0.5], [0.25, 0.75], [0.75, 0.75]],
  6: [[0.27, 0.22], [0.73, 0.22], [0.27, 0.5], [0.73, 0.5], [0.27, 0.78], [0.73, 0.78]],
};

const Face: React.FC<{ n: number; size: number; transform: string; shade: number }> = ({ n, size, transform, shade }) => (
  <div
    style={{
      position: "absolute",
      width: size,
      height: size,
      left: -size / 2,
      top: -size / 2,
      borderRadius: size * 0.18,
      background: `linear-gradient(145deg, #FDE047 0%, ${C.primary} 45%, ${C.amber} 100%)`,
      boxShadow: `inset 0 0 ${size * 0.08}px rgba(255,255,255,0.45), inset 0 ${-size * 0.06}px ${size * 0.12}px rgba(0,0,0,0.25)`,
      transform,
      backfaceVisibility: "hidden",
      filter: `brightness(${shade})`,
    }}
  >
    {PIPS[n].map(([px, py], i) => (
      <div
        key={i}
        style={{
          position: "absolute",
          width: size * 0.16,
          height: size * 0.16,
          left: px * size - size * 0.08,
          top: py * size - size * 0.08,
          borderRadius: "50%",
          background: "#111827",
          boxShadow: `inset 0 ${size * 0.015}px ${size * 0.02}px rgba(0,0,0,0.6)`,
        }}
      />
    ))}
  </div>
);

export const Dice3D: React.FC<{ size: number; rotX: number; rotY: number; rotZ?: number; glow?: number }> = ({ size, rotX, rotY, rotZ = 0, glow = 1 }) => {
  const h = size / 2;
  return (
    <div style={{ position: "relative", width: 0, height: 0, transformStyle: "preserve-3d" }}>
      <div
        style={{
          position: "absolute",
          width: size * 2.2,
          height: size * 2.2,
          left: -size * 1.1,
          top: -size * 1.1,
          borderRadius: "50%",
          background: `radial-gradient(circle, rgba(250,204,21,${0.55 * glow}) 0%, rgba(250,204,21,0) 65%)`,
          filter: `blur(${size * 0.12}px)`,
        }}
      />
      <div style={{ position: "absolute", transformStyle: "preserve-3d", transform: `rotateX(${rotX}deg) rotateY(${rotY}deg) rotateZ(${rotZ}deg)` }}>
        {/* solid core fills the gaps between the rounded faces */}
        {["", "rotateY(180deg)", "rotateY(90deg)", "rotateY(-90deg)", "rotateX(90deg)", "rotateX(-90deg)"].map((r, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              width: size * 0.9,
              height: size * 0.9,
              left: -size * 0.45,
              top: -size * 0.45,
              background: C.amber,
              transform: `${r} translateZ(${h * 0.94}px)`,
            }}
          />
        ))}
        <Face n={1} size={size} shade={1.05} transform={`translateZ(${h}px)`} />
        <Face n={6} size={size} shade={0.8} transform={`rotateY(180deg) translateZ(${h}px)`} />
        <Face n={3} size={size} shade={0.92} transform={`rotateY(90deg) translateZ(${h}px)`} />
        <Face n={4} size={size} shade={0.92} transform={`rotateY(-90deg) translateZ(${h}px)`} />
        <Face n={5} size={size} shade={1.0} transform={`rotateX(90deg) translateZ(${h}px)`} />
        <Face n={2} size={size} shade={0.85} transform={`rotateX(-90deg) translateZ(${h}px)`} />
      </div>
    </div>
  );
};
