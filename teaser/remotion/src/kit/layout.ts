import { useVideoConfig } from "remotion";

/**
 * Format-aware layout. Everything in the film is sized in `u` (1u = 1px at 1080 on the short side),
 * so the same component renders correctly at 960×540, 1920×1080, 1080×1920 and 886×1920.
 *
 * side "A": phone right, caption left (landscape) / caption top, phone below (portrait)
 * side "B": mirrored (landscape only; portrait keeps caption on top)
 */
export const useLayout = (side: "A" | "B" = "A") => {
  const { width, height } = useVideoConfig();
  const landscape = width >= height;
  const u = Math.min(width, height) / 1080;
  if (landscape) {
    const phoneX = side === "A" ? 0.68 : 0.32;
    return {
      width,
      height,
      landscape,
      u,
      phone: { x: width * phoneX, y: height * 0.5, h: height * 0.88 },
      caption: {
        x: side === "A" ? width * 0.07 : width * 0.93,
        y: height * 0.5,
        align: (side === "A" ? "left" : "right") as "left" | "right" | "center",
        maxW: width * 0.42,
        size: height * 0.09,
      },
      /** free zone for breakout graphics (the side opposite the caption, around the phone) */
      breakout: { x: width * phoneX, y: height * 0.5 },
    };
  }
  return {
    width,
    height,
    landscape,
    u,
    phone: { x: width * 0.5, y: height * 0.6, h: height * 0.66 },
    caption: { x: width * 0.5, y: height * 0.16, align: "center" as const, maxW: width * 0.86, size: width * 0.095 },
    breakout: { x: width * 0.5, y: height * 0.6 },
  };
};

/** App points → film px for recreated UI graphics. The app is designed at 440pt wide; on film a
 *  breakout card is drawn ~2.2× an on-screen card so it reads as "lifted towards camera". */
export const usePt = () => {
  const { u } = useLayout();
  return (pt: number) => pt * 2.2 * u;
};
