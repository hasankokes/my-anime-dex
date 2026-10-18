# Animation Guide (read before touching any shot)

The film is code: Remotion 4.0.536 in `teaser/remotion`. Two cuts share one edit:
- **PROMO** (`src/promo/`): 3D phone **plus breakout motion graphics**. UI elements (cards, badges, progress
  bars, the die) lift out of the phone and animate in 3D space. They are original vector graphics redrawn
  from the app's tokens (`src/kit/ui.tsx`), not cropped video.
- **STORE** (`src/store/`): full-bleed captured UI, overlay captions, no device, no breakouts beyond
  subtle highlights, no badges, no claims. Apple App Preview rules.

Read first: `docs/style_guide.md` (tokens and rules), `docs/feature_inventory.md` (what's real),
`docs/shotlist.md`, `captures/edl.json` (in-points), `docs/review_log.md` (known problems).

## File contract

```
src/theme.ts            tokens (C), FPS=30, BEAT=15
src/kit/layout.ts       useLayout(side) → format-aware positions, u; usePt() app-pt → px
src/kit/motion.ts       lerp, prog, pop (spring 14/180), settle, beat(n), easings
src/kit/Space.tsx       Space3D (perspective root) + Layer3D (x,y,z,rot*,scale,opacity,shadow)
src/kit/ui.tsx          Icon, Card, Thumb, ProgressBar, WatchingCard, CountdownBadge, CalendarCard,
                        Chip, MyScoreBadge, StarScore, ListRow, LevelBlock, Stat
src/kit/Dice3D.tsx      true-3D CSS die (accent yellow)
src/kit/fx.tsx          BurstRays, Halftone, Glow
src/kit/screen.tsx      Screen / FrozenScreen: full-res CFR captures (public/full)
src/lib/Phone.tsx       Phone (3D slab) + FullBleed (store)
src/lib/Caption.tsx     kinetic caption (lines, highlight)
src/lib/Transitions.tsx SpeedLines, whipIn/whipOut
src/promo/shots/Sxx_*.tsx   ONE FILE PER SHOT. Export `Sxx` (component) and `Sxx_LEN` (frames).
src/promo/Promo.tsx     timeline (owner: lead only)
src/Root.tsx            compositions (owner: lead only). Per-shot tests: `Sxx-L` 1920×1080, `Sxx-P` 1080×1920.
```

**Each subagent edits only its own shot files** (+ its own `docs/review/Sxx.md`). If the kit is missing
something, add a new file `src/kit/<yourShot>_extra.tsx`. Don't edit shared kit files; tell the lead instead.

## Shot rules
1. Frames are **shot-local** (`useCurrentFrame()` starts at 0). Lengths are fixed by `edl.json`:
   S01 60 · S02 90 · S03 90 · S04 90 · S05 75 · S06 90 · S07 75 · S08 90 · S09 90.
2. The shot renders **content only**. The stage (background, radial lift, global glow, grain) comes from the
   parent. Local glows via `fx.Glow` are fine.
3. **Must work in both landscape 1920×1080 and portrait 1080×1920.** Use `useLayout()` for every
   position and `u` / `usePt()` for every size. Never hard-code pixels.
4. **Entry:** the first 6–8 frames are the transition in (whipIn from the side opposite the previous shot,
   plus `SpeedLines` ≤ 8f). Shots alternate side A/B: S01 A, S02 B, S03 A, S04 B, S05 A, S06 B, S07 A, S08 centre.
   **Exit:** the last 3 frames may accelerate outwards; never fade to black mid-film.
5. **Cut and accent on beats.** Beats are every 15f. The main payoff of each shot lands on a beat:
   see the "beat" notes in `edl.json`.

## Breakout grammar (PROMO)
- **Lift:** an element starts exactly where it sits on the phone screen (same size and rotation as the
  phone), then rises in z (towards camera, +80…+260u), rotates towards the camera (rot → ±4–10°), scales
  1 → 1.6–2.2 and gets a deeper shadow. Duration 10–14f, `easeOut`. While lifted, the area it left on the
  screen can dim slightly. That's the only alteration allowed on a capture.
- **Animate while lifted:** the element does its real behaviour: the bar fills, the number ticks, the
  badge counts down, the row reorders, the die tumbles. Values must match the capture (see "Data" below).
- **Parallax:** while the camera drifts, layers move proportionally to z (`x += camDx * z/300`).
  Max 3 depth planes per shot: phone (z 0), primary breakout (z 150–260), secondary chips/badges (z 60–120).
- **Return or fly-off:** either settle back into the phone (reverse lift, 8f) or exit with the whip into the next shot.
- **Never:** cover a caption with UI, put UI over posters to hide them, invent stats, or show a feature
  that doesn't exist (no paywall, no "offline", no "unlimited").
- **Artwork:** a breakout card's poster thumb stays ≤ 25% of the card area. Never isolate a poster or
  character as its own floating element.

## Data (must match the captures)
| Shot | Values |
|------|--------|
| S02 Watching | Frieren: Beyond Journey's End Season 2 · Ep 6→7→8 / 10 · 60%→70%→80% (thumb `frieren2`); others: JJK Culling Game 3/12 25% (`jjk`), [Oshi No Ko] S3 2/11 18% (`oshinoko`), Steins;Gate 13/24 54% (`steinsgate`) |
| S03 Calendar | Sunday active; cards: "Uncle's Obsession with Cute Things 16:00 UTC+3 · 2h 7m · EP 3", "Magical Sisters LuluttoLilly Part 2 16:30 UTC+3 · 2h 37m · EP 3", "TANK CHAIR 17:00 · 3h 7m · EP 3" (no thumbs available for these → use the captured screen region, or text-only cards) |
| S04 Lists | "Top 10 of All Time" · #1 Steins;Gate ★9.07 My Score 10 "Time travel done right." · #2 Legend of the Galactic Heroes ★9.02 10 "A space opera masterpiece." · #3 Gintama Season 2 ★9.02 10 "Laughed, then cried." → dragged to #1 |
| S05 Profile | PLATINUM (#E5E4E2) · Level 8 · 12/30 XP · stats 16 Watching / 42 Watched / 59 Favs. **Premium card never visible.** |
| S06 Dice | Roll Dice → spinning die → result card "I Want to Eat Your Pancreas" ★8.4, genres Drama / Romance / Slice of Life |

Thumbs available in `public/thumbs/`: frieren2, jjk, oshinoko, steinsgate. To add one, crop it from
`public/full/*.mp4` with ffmpeg into `public/thumbs/` (≤300px, small).

## Motion vocabulary
| Thing | Spec |
|-------|------|
| Entry ease | `easeOut` (0.16,1,0.3,1), 10–14f |
| Exit ease | `easeIn` (0.7,0,0.84,0), 4–6f |
| UI pop | `pop(f, at, fps)` spring damping 14 / stiffness 180 |
| Big settle | `settle()` damping 20 / stiffness 120 |
| Camera drift | `drift` easing over the whole shot, 3–6% push, rotY change ≤ 8° |
| Whip | `whipIn(f, dir)` 7f, blur ≤ 24px, `SpeedLines` 8f |
| Accent flash | yellow glow 0.25 → 0.45 for ≤ 6f on the beat |
| Transitions FX | SpeedLines / Halftone only between shots, ≤ 8f, never over a resting UI |

## Type
Captions only via `<Caption side="A"|"B" lines highlight />`: Poppins 700, ≤ 5 words, one yellow highlight.
Passing `side` makes position/size come from `useLayout(side).caption` (correct in portrait). The phone:
`<Phone cam={{ x: L.phone.x / width, y: L.phone.y / height, h: L.phone.h / height, ... }}>` (fractions).
Readable at 360px wide: caption ≥ 9% of frame height in landscape and ≥ 9.5% of width in portrait.
Text inside recreated UI follows app sizes via `usePt()` (≥ 10pt → ≥ 22px at 1080).

## Review loop (every shot, ≥ 3 rounds)
1. `cd teaser/remotion && npx tsc --noEmit -p .`
2. Stills: `npx remotion still Sxx-L ../out/review/Sxx_L_f<frame>.png --frame=<f>` at 4–5 key frames,
   and the same for `Sxx-P`. Also check a 360px-wide downscale (`ffmpeg -i in.png -vf scale=360:-1 out.png`).
3. Score 1–10 on: hook, readability@360, motion, composition, depth, sound-sync intent, polish,
   looks-like-the-app. Write scores + the 3 biggest problems in `docs/review/Sxx.md`. Fix. Repeat
   until all ≥ 8 (sound sync: judge whether accents land on beat frames).
4. Final check: render the shot as video (`npx remotion render Sxx-L ../out/review/Sxx_L.mp4`) and scrub it.
