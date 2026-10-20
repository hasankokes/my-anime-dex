/**
 * S06 helper: glossy true-3D die (variant of kit Dice3D). Differences: tighter corner radius, a solid
 * inner core that closes the corner gaps, a specular sheen per face, and `size` is the only scale
 * input (CSS scale() would not scale translateZ, which distorts the cube).
 */
import { C } from "../theme";

const PIPS: Record<number, [number, number][]> = {
  1: [[0.5, 0.5]],
  2: [
    [0.28, 0.28],
    [0.72, 0.72],
  ],
  3: [
    [0.26, 0.26],
    [0.5, 0.5],
    [0.74, 0.74],
  ],
  4: [
    [0.28, 0.28],
    [0.72, 0.28],
    [0.28, 0.72],
    [0.72, 0.72],
  ],
  5: [
    [0.26, 0.26],
    [0.74, 0.26],
    [0.5, 0.5],
    [0.26, 0.74],
    [0.74, 0.74],
  ],
  6: [
    [0.28, 0.24],
    [0.72, 0.24],
    [0.28, 0.5],
    [0.72, 0.5],
    [0.28, 0.76],
    [0.72, 0.76],
  ],
};

const FACES: { n: number; t: string; shade: number }[] = [
  { n: 1, t: "", shade: 1.06 },
  { n: 6, t: "rotateY(180deg)", shade: 0.78 },
  { n: 3, t: "rotateY(90deg)", shade: 0.9 },
  { n: 4, t: "rotateY(-90deg)", shade: 0.92 },
  { n: 5, t: "rotateX(90deg)", shade: 1.12 },
  { n: 2, t: "rotateX(-90deg)", shade: 0.8 },
];

export const GlossyDie: React.FC<{ size: number; rotX: number; rotY: number; rotZ?: number; glow?: number; sheen?: number }> = ({
  size,
  rotX,
  rotY,
  rotZ = 0,
  glow = 1,
  sheen = 0,
}) => {
  const h = size / 2;
  const r = size * 0.13;
  return (
    <div style={{ position: "relative", width: 0, height: 0, transformStyle: "preserve-3d" }}>
      <div
        style={{
          position: "absolute",
          width: size * 2.4,
          height: size * 2.4,
          left: -size * 1.2,
          top: -size * 1.2,
          borderRadius: "50%",
          background: `radial-gradient(circle, rgba(250,204,21,${0.5 * glow}) 0%, rgba(245,158,11,${0.18 * glow}) 38%, rgba(250,204,21,0) 66%)`,
        }}
      />
      <div style={{ position: "absolute", transformStyle: "preserve-3d", transform: `rotateX(${rotX}deg) rotateY(${rotY}deg) rotateZ(${rotZ}deg)` }}>
        {/* inner core closes the rounded-corner gaps */}
        {FACES.map((fc, i) => (
          <div
            key={`c${i}`}
            style={{
              position: "absolute",
              width: size * 0.97,
              height: size * 0.97,
              left: -size * 0.485,
              top: -size * 0.485,
              background: C.amber,
              transform: `${fc.t} translateZ(${h * 0.975}px)`,
            }}
          />
        ))}
        {FACES.map((fc) => (
          <div
            key={fc.n}
            style={{
              position: "absolute",
              width: size,
              height: size,
              left: -h,
              top: -h,
              borderRadius: r,
              transform: `${fc.t} translateZ(${h}px)`,
              backfaceVisibility: "hidden",
              background: `linear-gradient(150deg, #FDE047 0%, ${C.primary} 42%, ${C.amber} 100%)`,
              boxShadow: `inset 0 0 ${size * 0.05}px rgba(255,255,255,0.55), inset 0 ${-size * 0.05}px ${size * 0.1}px rgba(0,0,0,0.22)`,
            }}
          >
            {/* face shading (no CSS filter: filters on 3D faces were dropped by the compositor in renders) */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: r,
                background: fc.shade < 1 ? `rgba(0,0,0,${(1 - fc.shade) * 1.1})` : `rgba(255,255,255,${(fc.shade - 1) * 1.6})`,
              }}
            />
            {/* specular sheen sweeping diagonally (sheen 0..1) */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: r,
                background: `linear-gradient(120deg, rgba(255,255,255,0) ${-30 + sheen * 130}%, rgba(255,255,255,0.55) ${-15 + sheen * 130}%, rgba(255,255,255,0) ${0 + sheen * 130}%)`,
              }}
            />
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: r,
                background: "radial-gradient(circle at 28% 22%, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0) 45%)",
              }}
            />
            {PIPS[fc.n].map(([px, py], i) => (
              <div
                key={i}
                style={{
                  position: "absolute",
                  width: size * 0.15,
                  height: size * 0.15,
                  left: px * size - size * 0.075,
                  top: py * size - size * 0.075,
                  borderRadius: "50%",
                  background: "radial-gradient(circle at 40% 35%, #374151 0%, #111827 60%)",
                  boxShadow: `inset 0 ${size * 0.018}px ${size * 0.025}px rgba(0,0,0,0.7), 0 ${size * 0.006}px 0 rgba(255,255,255,0.35)`,
                }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};
