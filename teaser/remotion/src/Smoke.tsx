import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { loadFont } from "@remotion/google-fonts/Poppins";

const { fontFamily } = loadFont("normal", { weights: ["700"], subsets: ["latin"] });

export const Smoke: React.FC = () => {
  const frame = useCurrentFrame();
  const scale = interpolate(frame, [0, 12], [1.2, 1], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ backgroundColor: "#0F0F0F", justifyContent: "center", alignItems: "center" }}>
      <div style={{ fontFamily, fontWeight: 700, fontSize: 96, letterSpacing: "0.005em", color: "#FFFFFF", transform: `scale(${scale})` }}>
        ANIME<span style={{ color: "#FACC15" }}>DEX</span>
      </div>
    </AbsoluteFill>
  );
};
