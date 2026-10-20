/**
 * S03 helpers: Calendar card + countdown badge with a live minute roll. Same structure/sizes as
 * kit/ui.tsx CalendarCard. No thumbs exist for these titles, so the poster is the captured screen
 * region itself (frozen c03_calendar frame, cropped to the card's poster) — real UI, ≤ 25% of the card.
 */
import { C, SCREEN_ASPECT } from "../theme";
import { poppins } from "../lib/fonts";
import { usePt } from "./layout";
import { Card } from "./ui";
import { FrozenScreen } from "./screen";
import { Roll } from "./S01_extra";

const T: React.FC<{ s: number; w?: 500 | 600 | 700; c?: string; children: React.ReactNode; style?: React.CSSProperties }> = ({
  s,
  w = 600,
  c = C.text,
  children,
  style,
}) => <div style={{ fontFamily: poppins, fontWeight: w, fontSize: s, color: c, lineHeight: 1.2, whiteSpace: "nowrap", ...style }}>{children}</div>;

/** Poster cropped from the captured screen: (x0,y0,w,h) are screen fractions of the poster. */
export const CaptureThumb: React.FC<{ src: string; atSec: number; x0: number; y0: number; w: number; wPt: number; hPt: number; r?: number }> = ({
  src,
  atSec,
  x0,
  y0,
  w,
  wPt,
  hPt,
  r = 8,
}) => {
  const pt = usePt();
  const vw = pt(wPt) / w;
  const vh = vw / SCREEN_ASPECT;
  return (
    <div style={{ width: pt(wPt), height: pt(hPt), borderRadius: pt(r), overflow: "hidden", position: "relative", flexShrink: 0 }}>
      <div style={{ position: "absolute", left: -x0 * vw, top: -y0 * vh, width: vw, height: vh }}>
        <FrozenScreen src={src} atSec={atSec} />
      </div>
    </div>
  );
};

/** Countdown badge (primary @ 20% fill) whose minutes roll from `from` to `to`. */
export const LiveCountdown: React.FC<{ from: string; to?: string; p?: number; scale?: number; glow?: number }> = ({ from, to, p = 0, scale = 1, glow = 0 }) => {
  const pt = usePt();
  return (
    <div
      style={{
        display: "inline-block",
        padding: `${pt(3 * scale)}px ${pt(8 * scale)}px`,
        borderRadius: pt(6 * scale),
        background: `rgba(250,204,21,${0.2 + 0.12 * glow})`,
        boxShadow: glow > 0.01 ? `0 0 ${pt(16 * scale)}px rgba(250,204,21,${0.45 * glow})` : undefined,
      }}
    >
      <T s={pt(12 * scale)} w={600} c={C.primary}>
        {(() => {
          const t = to ?? from;
          let k = 0;
          while (k < from.length && k < t.length && from[k] === t[k]) k++;
          return (
            <>
              {from.slice(0, k)}
              <Roll from={from.slice(k)} to={t.slice(k)} p={p} />
            </>
          );
        })()}
      </T>
    </div>
  );
};

/** Card backdrop for a floating badge so it reads on the dark stage (app card surface). */
export const BadgePlate: React.FC<{ children: React.ReactNode; scale?: number }> = ({ children, scale = 1 }) => {
  const pt = usePt();
  return (
    <div style={{ padding: pt(5 * scale), borderRadius: pt(10 * scale), background: C.card, border: `${Math.max(1, pt(0.6))}px solid ${C.border}` }}>{children}</div>
  );
};

export const LiveCalendarCard: React.FC<{
  title: string;
  thumb: React.ReactNode;
  time: string;
  countdown: string;
  countdownTo?: string;
  roll?: number;
  ep: number;
  lit?: number;
  glow?: number;
}> = ({ title, thumb, time, countdown, countdownTo, roll = 0, ep, lit = 0, glow = 0 }) => {
  const pt = usePt();
  return (
    <Card w={360} pad={10} style={{ border: lit > 0.01 ? `${Math.max(1, pt(0.8))}px solid rgba(250,204,21,${0.25 + 0.55 * lit})` : undefined }}>
      <div style={{ display: "flex", gap: pt(12), alignItems: "center" }}>
        {thumb}
        <div style={{ flex: 1, minWidth: 0 }}>
          <T s={pt(13)} w={600} style={{ marginBottom: pt(10), overflow: "hidden", textOverflow: "ellipsis" }}>
            {title}
          </T>
          <div style={{ display: "flex", alignItems: "center", gap: pt(8) }}>
            <T s={pt(12)} w={600} c={C.primary}>
              {time}
            </T>
            <LiveCountdown from={countdown} to={countdownTo} p={roll} glow={glow} />
            <div style={{ flex: 1 }} />
            <T s={pt(10)} w={500} c={C.subtext}>
              EP: {ep}
            </T>
          </div>
        </div>
      </div>
    </Card>
  );
};
