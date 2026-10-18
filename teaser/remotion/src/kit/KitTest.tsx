import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Grain, Stage } from "../lib/Stage";
import { C } from "../theme";
import { Dice3D } from "./Dice3D";
import { BurstRays, Halftone } from "./fx";
import { Layer3D, Space3D } from "./Space";
import { CalendarCard, Chip, CountdownBadge, LevelBlock, ListRow, MyScoreBadge, Stat, WatchingCard } from "./ui";

/** Visual check of every kit element (not part of the film). */
export const KitTest: React.FC = () => {
  const f = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  return (
    <Stage>
      <Halftone cx={W * 0.1} cy={H * 0.9} p={0.25} />
      <BurstRays cx={W * 0.85} cy={H * 0.25} p={1} inner={80} outer={260} />
      <Space3D>
        <Layer3D x={W * 0.22} y={H * 0.2} z={60} rotY={14} rotX={6}>
          <WatchingCard title="Frieren: Beyond Journey's End Season 2" thumb="frieren2" ep={8} total={10} plusPressed={1} />
        </Layer3D>
        <Layer3D x={W * 0.22} y={H * 0.5} z={0} rotY={10}>
          <CalendarCard title="Magical Sisters LuluttoLilly Part 2" thumb="oshinoko" time="16:30 UTC+3" countdown="2h 37m" ep={3} />
        </Layer3D>
        <Layer3D x={W * 0.22} y={H * 0.8} z={120} rotY={-8} rotX={8}>
          <ListRow rank={1} title="Gintama Season 2" thumb="steinsgate" star="9.02" my={10} comment="Laughed, then cried." lifted={1} />
        </Layer3D>
        <Layer3D x={W * 0.6} y={H * 0.3} z={40} rotY={-12}>
          <div style={{ background: C.bg, padding: 30, borderRadius: 30 }}>
            <LevelBlock rank="PLATINUM" color={C.platinum} level={8} xp={12} xpMax={30} />
            <div style={{ display: "flex", gap: 60, marginTop: 30, justifyContent: "center" }}>
              <Stat n={16} label="Watching" />
              <Stat n={42} label="Watched" />
              <Stat n={59} label="Favs" />
            </div>
          </div>
        </Layer3D>
        <Layer3D x={W * 0.6} y={H * 0.7} z={80} rotX={-10}>
          <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
            <Chip label="Sunday" active />
            <Chip label="Monday" />
            <CountdownBadge text="3h 7m" scale={1.6} />
            <MyScoreBadge score={10} scale={1.6} />
          </div>
        </Layer3D>
        <Layer3D x={W * 0.85} y={H * 0.6} z={150} shadow={0}>
          <Dice3D size={200} rotX={-25 + f * 3} rotY={35 + f * 5} />
        </Layer3D>
      </Space3D>
      <Grain />
      <AbsoluteFill />
    </Stage>
  );
};
