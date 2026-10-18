// Tokens from the app (context/ThemeContext.tsx, app/(tabs)/_layout.tsx). See docs/style_guide.md.
export const C = {
  bg: "#0F0F0F",
  bgLift: "#161616",
  tabBar: "#121212",
  card: "#1F2937",
  border: "#374151",
  text: "#FFFFFF",
  subtext: "#9CA3AF",
  primary: "#FACC15",
  amber: "#F59E0B",
  platinum: "#E5E4E2",
} as const;

export const FPS = 30;
export const BEAT = 15; // frames per beat at 120 BPM (placeholder grid; replace with beats.json)

// Captured screen aspect (iPhone 17 Pro Max, 1320×2868).
export const SCREEN_ASPECT = 1320 / 2868;

export const EASE_OUT = [0.16, 1, 0.3, 1] as const;
export const EASE_IN = [0.7, 0, 0.84, 0] as const;
