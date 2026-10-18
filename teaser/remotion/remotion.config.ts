import { Config } from "@remotion/cli/config";

// Remotion's bundled chrome-headless-shell crashes on this macOS (Target closed); use installed Chrome.
Config.setBrowserExecutable("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome");
Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
// GPU compositing in Chrome dropped 3D layers (die faces, rows) on random frames, even at concurrency 1.
// Software GL matches `remotion still` on every frame (verified: PSNR ≥ 39 dB on f452–478). Slower, but correct.
Config.setChromiumOpenGlRenderer("swiftshader");
Config.setConcurrency(1);
