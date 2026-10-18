import { Freeze, Img, OffthreadVideo, staticFile, useCurrentFrame } from "remotion";
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

/** Plays a capture from `inSec`; when `holdAt` is given, switches to a still of that source time once reached.
 *  The still is a PNG (public/holds/<src>_<holdAt>.png, made with ffmpeg): <Freeze> on an OffthreadVideo
 *  near the clip's end returned the wrong frame. */
export const MontageScreen: React.FC<{ src: string; inSec: number; holdAt?: number }> = ({ src, inSec, holdAt }) => {
  const f = useCurrentFrame();
  if (holdAt !== undefined && f >= Math.round((holdAt - inSec) * FPS))
    return <Img src={staticFile(`holds/${src}_${holdAt}.png`)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />;
  return <Screen src={src} inSec={inSec} />;
};
