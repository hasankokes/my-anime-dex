/**
 * S02 helper: Watching card with the live behaviour the breakout needs (episode roll, % tick,
 * + press ripple, bar glow pulse). Same structure and sizes as kit/ui.tsx WatchingCard.
 */
import { C } from "../theme";
import { poppins } from "../lib/fonts";
import { usePt } from "./layout";
import { Card, Icon, Thumb } from "./ui";
import { Roll } from "./S01_extra";

const T: React.FC<{ s: number; w?: 500 | 600 | 700; c?: string; children: React.ReactNode; style?: React.CSSProperties }> = ({
  s,
  w = 600,
  c = C.text,
  children,
  style,
}) => <div style={{ fontFamily: poppins, fontWeight: w, fontSize: s, color: c, lineHeight: 1.2, whiteSpace: "nowrap", ...style }}>{children}</div>;

export const LiveWatchingCard: React.FC<{
  title: string;
  thumb: string;
  ep: number;
  epTo?: number;
  /** episode roll progress 0..1 (ep → epTo) */
  roll?: number;
  total: number;
  /** bar value 0..1 (also drives the % label) */
  value: number;
  /** + button press 0..1..0 and ripple 0..1 */
  press?: number;
  ripple?: number;
  /** extra glow on the bar 0..1 */
  barGlow?: number;
  /** card border highlight 0..1 */
  lit?: number;
}> = ({ title, thumb, ep, epTo, roll = 0, total, value, press = 0, ripple = 0, barGlow = 0, lit = 0 }) => {
  const pt = usePt();
  const to = epTo ?? ep;
  const pct = Math.round(value * 100);
  return (
    <Card
      w={360}
      pad={10}
      style={{
        border: lit > 0.01 ? `${Math.max(1, pt(0.8))}px solid rgba(250,204,21,${0.25 + 0.55 * lit})` : undefined,
      }}
    >
      <div style={{ display: "flex", gap: pt(12) }}>
        <Thumb src={thumb} w={84} h={84} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", minWidth: 0 }}>
          <T s={pt(13)} w={600} style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
            {title}
          </T>
          <T s={pt(11)} w={600} c={C.primary}>
            Ep <Roll from={String(ep)} to={String(to)} p={roll} /> / {total}
          </T>
          <div style={{ display: "flex", alignItems: "center", gap: pt(8) }}>
            <Icon name="remove-circle-outline" size={pt(18)} color={C.text} />
            <T s={pt(11)} w={600}>
              Episode <Roll from={String(ep)} to={String(to)} p={roll} />
            </T>
            <div style={{ position: "relative", width: pt(18), height: pt(18) }}>
              {ripple > 0 && ripple < 1 && (
                <div
                  style={{
                    position: "absolute",
                    left: "50%",
                    top: "50%",
                    width: pt(18),
                    height: pt(18),
                    borderRadius: "50%",
                    border: `${pt(1.6)}px solid ${C.primary}`,
                    transform: `translate(-50%,-50%) scale(${1 + ripple * 1.8})`,
                    opacity: 1 - ripple,
                  }}
                />
              )}
              <Icon
                name="add-circle-outline"
                size={pt(18)}
                color={press > 0.05 ? C.primary : C.text}
                style={{ transform: `scale(${1 - press * 0.22})`, filter: press > 0.05 ? `drop-shadow(0 0 ${pt(5)}px ${C.primary})` : undefined }}
              />
            </div>
            <div style={{ flex: 1 }} />
            <T s={pt(10)} w={500} c={barGlow > 0.05 ? C.text : C.subtext}>
              {pct}%
            </T>
          </div>
          <div style={{ width: pt(250), height: pt(6), borderRadius: pt(6), background: C.border, position: "relative" }}>
            <div
              style={{
                width: `${Math.max(0, Math.min(1, value)) * 100}%`,
                height: "100%",
                borderRadius: pt(6),
                background: C.primary,
                boxShadow: `0 0 ${pt(8 + 14 * barGlow)}px rgba(250,204,21,${0.6 + 0.4 * barGlow})`,
              }}
            />
          </div>
        </div>
      </div>
    </Card>
  );
};
