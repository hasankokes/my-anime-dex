import { Freeze, OffthreadVideo, staticFile } from "remotion";
import { FPS } from "../theme";

/** Full-res CFR captures (public/full, 1320×2868). Only clips in docs/review_log.md marked usable;
 *  Pulse/Leaderboard ONLY via the *_blur files. */
export const clipSrc = (name: string) => staticFile(`full/${name}.mp4`);

export const Screen: React.FC<{ src: string; inSec: number }> = ({ src, inSec }) => (
  <OffthreadVideo src={clipSrc(src)} startFrom={Math.round(inSec * FPS)} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
);

export const FrozenScreen: React.FC<{ src: string; atSec: number }> = ({ src, atSec }) => (
  <Freeze frame={Math.round(atSec * FPS)}>
    <OffthreadVideo src={clipSrc(src)} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
  </Freeze>
);
