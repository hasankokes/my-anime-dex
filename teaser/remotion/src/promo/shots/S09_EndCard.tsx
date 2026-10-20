import { AbsoluteFill, Img, interpolate, random, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { poppins } from "../../lib/fonts";
import { BurstRays, Glow, Halftone } from "../../kit/fx";
import { useLayout } from "../../kit/layout";
import { easeIn, lerp, pop, prog } from "../../kit/motion";
import { C } from "../../theme";

export const S09_LEN = 90;

/**
 * Logo end card with a designed build-up (beats every 15f):
 *  0–8   handoff: yellow core from S08 + halftone wave (transition FX)
 *  2–15  comic burst rays grow (echo of the logo's own burst)
 *  15    colour app logo slams in (spring overshoot), impact flash + shockwave, 3f camera shake
 *  30/37/45  in-app tagline "Track · Discover · Watch" (login screen copy) word by word
 *  45–60 promo: store badges rise; URL. store: "Your Anime Companion." (splash copy) only
 *  60–75 hold, rays drift, logo breathes
 *  75–90 collapse into the centred yellow glow = S01 frame 0 (seamless web loop)
 */
export const S09: React.FC<{ store?: boolean }> = ({ store = false }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const L = useLayout();
  const { width: W, height: H, u, landscape } = L;
  const cx = W / 2;
  const cy = H * (landscape ? 0.4 : 0.42);
  // S08 hands off a glow at frame centre; drift it up to the logo position over the first 12f
  const glowY = lerp(f, 0, 12, H * 0.5, cy);

  // 75–90 collapse
  const collapse = prog(f, 74, 88, easeIn); // fully gone by f88 → f89 == S01 f0 (stage glow only)
  const keep = 1 - collapse;

  // camera shake on impact
  const shake = f >= 15 && f < 19 ? (random(`sh${f}`) - 0.5) * 14 * u * (19 - f) / 4 : 0;

  // logo
  const logoH = (landscape ? H * 0.46 : W * 0.62) * 1;
  const s = pop(f, 9, fps, { damping: 11, stiffness: 170 });
  const logoScale = interpolate(s, [0, 1], [2.4, 1]) * (1 + Math.sin(f / 9) * 0.008) * (1 - collapse * 0.7);
  const logoRot = interpolate(s, [0, 1], [-8, 0]);
  const logoOpacity = Math.min(1, s * 2) * keep;

  // rays
  const rayP = prog(f, 2, 16) * keep;
  const rayRot = f * 0.35;
  const raySettle = prog(f, 26, 44);

  // impact flash + shockwave
  const flash = f >= 15 ? Math.max(0, 1 - (f - 15) / 6) : 0;
  const ring = prog(f, 15, 33);

  // tagline words
  const words = ["Track", "Discover", "Watch"];
  const wordAt = [30, 37, 45];

  const sub = landscape ? H * 0.052 : W * 0.06;
  const tagY = cy + logoH * 0.58;

  return (
    <AbsoluteFill style={{ transform: `translate(${shake}px, ${shake * 0.6}px)` }}>
      {/* handoff core + halftone wave (transition only) */}
      <Glow x={cx} y={glowY} r={(110 + 380 * prog(f, 0, 18)) * u} opacity={(0.55 - 0.27 * prog(f, 0, 18)) * (1 - collapse)} />
      {f < 14 && <div style={{ opacity: 0.7 * (1 - prog(f, 6, 14)) }}><Halftone cx={cx} cy={cy} p={prog(f, 0, 14) * 0.45} maxR={8} /></div>}

      {/* burst behind logo */}
      {/* rays burst on the slam, then retreat behind the logo so the tagline/badges stay clean */}
      <div style={{ opacity: (0.85 - 0.45 * raySettle) * rayP }}>
        <BurstRays cx={cx} cy={cy} p={rayP * (1 - 0.42 * raySettle)} count={24} inner={logoH * 0.32 / u} outer={landscape ? 640 : 560} rot={rayRot} seed="end" />
      </div>
      {/* dark scrim under the text block */}
      <div
        style={{
          position: "absolute",
          left: cx - W * 0.45,
          top: tagY - sub * 2.2,
          width: W * 0.9,
          height: sub * (store ? 5 : 8.5),
          background: `radial-gradient(closest-side, rgba(15,15,15,0.95) 0%, rgba(15,15,15,0.8) 55%, rgba(15,15,15,0) 100%)`,
          opacity: prog(f, 26, 40) * keep,
        }}
      />

      {/* shockwave */}
      {f >= 15 && f < 36 && (
        <div
          style={{
            position: "absolute",
            left: cx,
            top: cy,
            width: 0,
            height: 0,
          }}
        >
          <div
            style={{
              position: "absolute",
              width: logoH * (0.6 + ring * 1.6),
              height: logoH * (0.6 + ring * 1.6),
              left: -logoH * (0.3 + ring * 0.8),
              top: -logoH * (0.3 + ring * 0.8),
              borderRadius: "50%",
              border: `${(1 - ring) * 10 * u + 1}px solid ${C.primary}`,
              opacity: 1 - ring,
              boxShadow: `0 0 ${30 * u}px rgba(250,204,21,${0.6 * (1 - ring)})`,
            }}
          />
        </div>
      )}

      {/* logo */}
      <Img
        src={staticFile("brand/logo_color.png")} // the app's colour logo (header/light splash), not the dark-splash neon
        style={{
          position: "absolute",
          height: logoH,
          left: cx,
          top: cy,
          transform: `translate(-50%, -50%) rotate(${logoRot}deg) scale(${logoScale})`,
          opacity: logoOpacity,
          // thin light rim keeps the logo's black outline readable on the dark stage, plus the accent glow
          filter: `drop-shadow(0 0 ${2.5 * u}px rgba(255,255,255,0.55)) drop-shadow(0 0 ${22 * u}px rgba(250,204,21,${0.22 + flash * 0.5}))`,
        }}
      />

      {/* impact flash */}
      {flash > 0 && <Glow x={cx} y={cy} r={logoH * 1.1} color="#ffffff" opacity={flash * 0.55} />}

      {/* tagline from the app's login screen */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: tagY,
          display: "flex",
          justifyContent: "center",
          gap: sub * 0.5,
          fontFamily: poppins,
          fontWeight: 700,
          fontSize: sub,
          opacity: keep,
        }}
      >
        {store ? (
          <div style={{ opacity: prog(f, 30, 42), transform: `translateY(${(1 - prog(f, 30, 42)) * 30 * u}px)`, color: C.text, fontWeight: 600 }}>
            Your Anime Companion.
          </div>
        ) : (
          words.map((w, i) => {
            const p = pop(f, wordAt[i], fps);
            return (
              <div key={w} style={{ display: "flex", alignItems: "center", gap: sub * 0.5 }}>
                {i > 0 && <span style={{ color: C.primary, opacity: Math.min(1, p), fontSize: sub * 0.8 }}>•</span>}
                <span
                  style={{
                    color: i === 2 ? C.primary : C.text,
                    opacity: Math.min(1, p),
                    transform: `translateY(${(1 - p) * 40 * u}px) scale(${0.8 + 0.2 * p})`,
                    display: "inline-block",
                  }}
                >
                  {w}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* store badges + URL (promo only) */}
      {!store && (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: tagY + sub * 1.9,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: sub * 0.55,
            opacity: keep,
          }}
        >
          <div style={{ display: "flex", gap: sub * 0.45 }}>
            <StoreBadge kind="apple" p={pop(f, 50, fps)} sub={sub} />
            <StoreBadge kind="google" p={pop(f, 54, fps)} sub={sub} />
          </div>
          <div style={{ fontFamily: poppins, fontWeight: 500, fontSize: sub * 0.8, color: C.subtext, opacity: prog(f, 58, 68) }}>
            myanimedex.com
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};

/** Official store badges, unmodified artwork (public/badges/):
 *  - app-store-badge.svg: developer.apple.com/assets/elements/badges/download-on-the-app-store.svg
 *  - google-play-badge.png: play.google.com/intl/en_us/badges/…/en_badge_web_generic.png (transparent padding trimmed)
 *  Shown at equal visual height, only scaled and faded/slid in (no recolouring, no distortion). */
const StoreBadge: React.FC<{ kind: "apple" | "google"; p: number; sub: number }> = ({ kind, p, sub }) => {
  const h = sub * 1.55;
  return (
    <Img
      src={staticFile(kind === "apple" ? "badges/app-store-badge.svg" : "badges/google-play-badge.png")}
      style={{ height: h, width: "auto", display: "block", opacity: Math.min(1, p), transform: `translateY(${(1 - p) * h * 0.8}px)` }}
    />
  );
};

/** Lerp helper re-export to keep imports tidy for callers. */
export const _endcardLerp = lerp;
