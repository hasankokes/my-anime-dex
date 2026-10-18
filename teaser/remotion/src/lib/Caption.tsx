import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { C, EASE_OUT } from "../theme";
import { poppins } from "./fonts";
import { useLayout } from "../kit/layout";

/** Kinetic caption: lines rise in one beat apart, the highlighted phrase is yellow with a soft glow. */
export const Caption: React.FC<{
  lines: string[];
  highlight?: string;
  /** horizontal anchor in fractions of the frame (centre of the text block) */
  x?: number;
  y?: number;
  align?: "left" | "center" | "right";
  /** font size as fraction of frame height */
  size?: number;
  stagger?: number;
  outAt?: number;
  maxWidth?: number;
  /** layout side; when given, x/y/align/size/maxWidth default to useLayout(side).caption (works in portrait) */
  side?: "A" | "B";
}> = (props) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const L = useLayout(props.side ?? "A");
  const auto = props.side !== undefined;
  const {
    lines,
    highlight,
    x = auto ? L.caption.x / width : 0.27,
    y = auto ? L.caption.y / height : 0.5,
    align = auto ? L.caption.align : "left",
    size = auto ? L.caption.size / height : 0.09,
    stagger = 8,
    outAt,
    maxWidth = auto ? L.caption.maxW / width : 0.42,
  } = props;
  const fs = height * size;
  const out = outAt === undefined ? 0 : interpolate(frame, [outAt, outAt + 6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          left: width * x,
          top: height * y,
          width: width * maxWidth,
          transform: `translate(${align === "left" ? 0 : align === "center" ? -50 : -100}%, -50%)`,
          textAlign: align,
          fontFamily: poppins,
          fontWeight: 700,
          fontSize: fs,
          lineHeight: 1.08,
          letterSpacing: "-0.01em",
          color: C.text,
        }}
      >
        {lines.map((line, i) => {
          const t = interpolate(frame, [i * stagger, i * stagger + 10], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(...EASE_OUT),
          });
          const hi = highlight && line.includes(highlight);
          const parts = hi ? line.split(highlight!) : [line];
          return (
            <div
              key={i}
              // generous padding (cancelled by negative margins) so the highlight glow isn't clipped into a box
              style={{ overflow: "hidden", padding: `${fs * 0.35}px ${fs * 0.6}px ${fs * 0.41}px`, margin: `${-fs * 0.35}px ${-fs * 0.6}px ${-fs * 0.35}px` }}
            >
              <div
                style={{
                  transform: `translateY(${(1 - t) * 105 + out * -105}%)`,
                  opacity: Math.min(t, 1 - out),
                }}
              >
                {hi ? (
                  <>
                    {parts[0]}
                    <span style={{ color: C.primary, textShadow: `0 0 ${fs * 0.5}px rgba(250,204,21,0.35)` }}>{highlight}</span>
                    {parts[1]}
                  </>
                ) : (
                  line
                )}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
