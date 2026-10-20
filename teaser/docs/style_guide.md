# MyAnimeDex Teaser — Style Guide

Everything here is pulled from the app code (`context/ThemeContext.tsx`, `app/(tabs)/_layout.tsx`,
`app/(tabs)/index.tsx`, `web/style.css`) and brand assets in `assets/images/`. If a value isn't
here, it isn't in the film.

## Colour

| Token | Hex | Role in film |
|-------|-----|--------------|
| `bg` | `#0F0F0F` | stage background, first and last frame |
| `bgDeep` | `#080808` | vignette corners only |
| `tabBar` | `#121212` | secondary surfaces |
| `card` | `#1F2937` | caption chips, end-card plates |
| `border` | `#374151` | hairlines |
| `text` | `#FFFFFF` | caption type |
| `subtext` | `#9CA3AF` | secondary type, URL |
| `primary` | `#FACC15` | the only accent: highlight word, glow, speed lines, cursor rings |
| `amber` | `#F59E0B` | second stop of the app's yellow gradient (`#FACC15 → #F59E0B`) |
| `green` / `red` | `#10B981` / `#EF4444` | never as decoration; only where the captured UI already shows them |
| rank colours | Bronze `#CD7F32` · Silver `#C0C0C0` · Gold `#FFD700` · Platinum `#E5E4E2` · Diamond `#B9F2FF` | Profile shot only: glow tint matches the captured rank ring |

Rules
- Stage is near-black `#0F0F0F` with a radial lift to `#161616` behind the phone. No other
  gradients. **No purple/blue "tech" gradients**, no lens flares.
- Yellow glow: `#FACC15` at 25–35% opacity, blur 40–80px, only behind the phone or under the
  highlighted caption word.
- Logo neon (cyan letters + magenta burst from `splash-dark-cover.png`) appears **only inside the
  logo itself** on the end card; never as an accent elsewhere.

## Type

- Family: **Poppins** (app loads 500 Medium, 600 SemiBold, 700 Bold). Captions use 700, support
  lines 600, URL/small 500. No other families.
- Wordmark echoes the app header: "ANIME" white + "DEX" `#FACC15`, Poppins Bold, tracking +0.5%.
- Caption = max 5 words, one line where possible, one highlighted word in yellow.

Minimum sizes (readable when the frame is shown 360px wide):

| Canvas | Caption | Support line | Fine print (URL) |
|--------|---------|--------------|------------------|
| 1080×1920 / 886×1920 | 84px (≥ 72 on 886w) | 52px | 40px |
| 1920×1080 | 96px | 56px | 40px |
| 960×540 (animatic) | 48px | 28px | 20px |

At 360px wide a 1080-canvas 84px caption renders ≈ 28px — comfortably legible.

## Shape

- Radii: **16** (caption chips, plates), **12** (small chips), pill = height/2 (tab-bar echo, badges).
- Phone mock (promo cut only): generic rounded slab, screen radius 56 at 1080w, bezel `#000`,
  1px `#374151` edge highlight. No real-device photos, no Apple/Google hardware likeness details
  beyond a plain dynamic-island pill (which is in the captured status bar anyway).
- Shadows: black 40–60%, y +30, blur 60 under the phone. Yellow glow per colour rules.

## Icons

Ionicons (as used in the app): `home`, `calendar`, `heart`, `play-circle`, `person`, `dice`,
`sparkles`, `trophy`, `bookmarks`, `pulse`. Used sparingly as caption bullets in the montage, never
redrawn in another style.

## Texture & motion

- Grain: monochrome noise, 3–4% opacity, re-seeded every 2 frames, over the whole frame **except**
  inside the phone screen (UI stays clean).
- Speed lines / halftone: yellow or white, used **only during transitions** (≤ 8 frames), never on
  top of UI.
- Camera: phone floats in 3D (rotateY ±8–14°, rotateX 4–8°), slow push-in 3–6% per shot,
  parallax of 2–3 layers (bg glow, phone, caption). Whip transitions on the beat: 6–8 frames,
  motion blur via frame sampling.
- Easing: entries `cubic-bezier(0.16, 1, 0.3, 1)` (expo-out), exits `(0.7, 0, 0.84, 0)`; springs
  damping 14, stiffness 180 for UI pops (matches the app's own overshoot on the Dice result card).
- Every shot change lands on a beat. One new visual payoff every 3–4s.

## Brand assets

| Use | File |
|-----|------|
| End-card logo (dark) | `assets/images/splash-dark-cover.png` (crop the logo; neon on dark) |
| Small logo (header echo) | `assets/images/icon.png` (comic logo; white bg needs masking) |
| App reference screenshots | `web/ss/*.png` |
| Store badges (promo only) | official Apple "Download on the App Store" + Google "Get it on Google Play" artwork from their marketing sites, unmodified |
| URL | `myanimedex.com` |

## Cuts

- **Store**: full-bleed captured UI (no phone frame), captions as overlay chips, no badges, no
  pricing, no "best/#1". Last 3s: logo + wordmark only.
- **Promo**: same edit, 3D phone, end card with both badges + URL.
- **Web loop**: muted-first; last frame = hook's first frame (bg + yellow glow + phone at hook pose).
