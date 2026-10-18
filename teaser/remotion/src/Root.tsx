import { Composition } from "remotion";
import { Animatic } from "./Animatic";
import { Smoke } from "./Smoke";
import { KitTest } from "./kit/KitTest";
import { StoreCut } from "./store/StoreCut";
import { Promo } from "./promo/Promo";
import { Grain, Stage } from "./lib/Stage";
import { S01 } from "./promo/shots/S01_Hook";
import { S02 } from "./promo/shots/S02_Watching";
import { S03 } from "./promo/shots/S03_Calendar";
import { S04 } from "./promo/shots/S04_Lists";
import { S05 } from "./promo/shots/S05_Profile";
import { S06 } from "./promo/shots/S06_Dice";
import { S07 } from "./promo/shots/S07_Montage";
import { S08 } from "./promo/shots/S08_Payoff";
import { S09 } from "./promo/shots/S09_EndCard";

/** Wraps a shot in the global stage for isolated per-shot test renders. */
const shotTest = (Shot: React.FC) => {
  const Wrapped: React.FC = () => (
    <Stage>
      <Grain />
      <Shot />
    </Stage>
  );
  return Wrapped;
};

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="Smoke" component={Smoke} durationInFrames={60} fps={30} width={960} height={540} />
    <Composition id="Animatic" component={Animatic} durationInFrames={750} fps={30} width={960} height={540} defaultProps={{ store: false }} />
    <Composition id="PromoL" component={Promo} durationInFrames={750} fps={30} width={1920} height={1080} />
    <Composition id="PromoP" component={Promo} durationInFrames={750} fps={30} width={1080} height={1920} />
    <Composition id="WebLoop" component={Promo} durationInFrames={750} fps={30} width={1280} height={720} defaultProps={{ muted: true }} />
    <Composition id="Store" component={StoreCut} durationInFrames={750} fps={30} width={886} height={1920} />
    <Composition id="KitTest" component={KitTest} durationInFrames={60} fps={30} width={1920} height={1080} />
    <Composition id="S01-L" component={shotTest(S01)} durationInFrames={60} fps={30} width={1920} height={1080} />
    <Composition id="S01-P" component={shotTest(S01)} durationInFrames={60} fps={30} width={1080} height={1920} />
    <Composition id="S02-L" component={shotTest(S02)} durationInFrames={90} fps={30} width={1920} height={1080} />
    <Composition id="S02-P" component={shotTest(S02)} durationInFrames={90} fps={30} width={1080} height={1920} />
    <Composition id="S03-L" component={shotTest(S03)} durationInFrames={90} fps={30} width={1920} height={1080} />
    <Composition id="S03-P" component={shotTest(S03)} durationInFrames={90} fps={30} width={1080} height={1920} />
    <Composition id="S04-L" component={shotTest(S04)} durationInFrames={90} fps={30} width={1920} height={1080} />
    <Composition id="S04-P" component={shotTest(S04)} durationInFrames={90} fps={30} width={1080} height={1920} />
    <Composition id="S05-L" component={shotTest(S05)} durationInFrames={75} fps={30} width={1920} height={1080} />
    <Composition id="S05-P" component={shotTest(S05)} durationInFrames={75} fps={30} width={1080} height={1920} />
    <Composition id="S06-L" component={shotTest(S06)} durationInFrames={90} fps={30} width={1920} height={1080} />
    <Composition id="S06-P" component={shotTest(S06)} durationInFrames={90} fps={30} width={1080} height={1920} />
    <Composition id="S07-L" component={shotTest(S07)} durationInFrames={75} fps={30} width={1920} height={1080} />
    <Composition id="S07-P" component={shotTest(S07)} durationInFrames={75} fps={30} width={1080} height={1920} />
    <Composition id="S08-L" component={shotTest(S08)} durationInFrames={90} fps={30} width={1920} height={1080} />
    <Composition id="S08-P" component={shotTest(S08)} durationInFrames={90} fps={30} width={1080} height={1920} />
    <Composition id="S09-L" component={shotTest(S09)} durationInFrames={90} fps={30} width={1920} height={1080} />
    <Composition id="S09-P" component={shotTest(S09)} durationInFrames={90} fps={30} width={1080} height={1920} />
  </>
);
