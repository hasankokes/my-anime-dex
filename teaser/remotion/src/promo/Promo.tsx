import { Audio, Sequence, staticFile, useCurrentFrame } from "remotion";
import { lerp } from "../kit/motion";
import { Grain, Stage } from "../lib/Stage";
import { C } from "../theme";
import { S01, S01_LEN } from "./shots/S01_Hook";
import { S02, S02_LEN } from "./shots/S02_Watching";
import { S03, S03_LEN } from "./shots/S03_Calendar";
import { S04, S04_LEN } from "./shots/S04_Lists";
import { S05, S05_LEN } from "./shots/S05_Profile";
import { S06, S06_LEN } from "./shots/S06_Dice";
import { S07, S07_LEN } from "./shots/S07_Montage";
import { S08, S08_LEN } from "./shots/S08_Payoff";
import { S09, S09_LEN } from "./shots/S09_EndCard";

const SHOTS: [React.FC, number][] = [
  [S01, S01_LEN],
  [S02, S02_LEN],
  [S03, S03_LEN],
  [S04, S04_LEN],
  [S05, S05_LEN],
  [S06, S06_LEN],
  [S07, S07_LEN],
  [S08, S08_LEN],
  [S09, S09_LEN],
];

export const PROMO_LEN = SHOTS.reduce((a, [, l]) => a + l, 0); // 750

/** PROMO cut (1920×1080 YouTube/Play, 1080×1920 social). `muted` for the web loop. */
export const Promo: React.FC<{ audio?: string; muted?: boolean }> = ({ audio = "audio/mix.wav", muted = false }) => {
  const f = useCurrentFrame();
  // global glow: platinum on Profile (330–405), building on Dice (405–495)
  const glow = f >= 330 && f < 405 ? C.platinum : C.primary;
  const glowOpacity = f >= 405 && f < 495 ? lerp(f, 405, 465, 0.25, 0.45) : 0.26;
  let at = 0;
  return (
    <Stage glow={glow} glowOpacity={glowOpacity}>
      <Grain />
      {SHOTS.map(([Shot, len], i) => {
        const from = at;
        at += len;
        return (
          <Sequence key={i} from={from} durationInFrames={len}>
            <Shot />
          </Sequence>
        );
      })}
      {!muted && <Audio src={staticFile(audio)} />}
    </Stage>
  );
};
