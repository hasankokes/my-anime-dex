# MyAnimeDex Teaser — Shot List (v1, pre-music)

25.0s · 30fps · 750 frames. Grid assumes a **120 BPM** music bed (1 beat = 15f, 1 bar = 60f);
music will be prompted at 120 BPM and every cut re-snapped to the measured `beats.json`.

Capture device: iPhone 17 Pro Max simulator (native 1320×2868), dark theme, English, demo account,
walkthrough flags set to completed, `xcrun simctl io booted recordVideo --codec=h264`.
Status bar normalised before recording: `xcrun simctl status_bar booted override --time 9:41
--batteryState charged --batteryLevel 100 --wifiBars 3 --cellularBars 4`.

Legend — Cam: camera on the phone (promo). Store cut uses the same timing with full-bleed UI and
a 2D push-in instead of 3D rotation. Art: artwork-dominance flag.

| # | Frames (s) | Beat | Screen / capture (`captures/raw/…`) | Scripted action | Cam (promo) | Caption | SFX | Art |
|---|-----------|------|-------------------------------------|-----------------|-------------|---------|-----|-----|
| S01 Hook | 0–60 (0–2.0) | 1 | `c01_home.mov` Home top: header wordmark, search + My Lists, Trending, yellow "All" chip | slow natural scroll 0→120pt | phone snaps in from z-depth on beat 1 (scale 1.25→1, 8f, spring), rotY −10°→−6°, push-in 3% | **Your anime.** *All of it.* (2nd line yellow, on beat 3) | impact thump + soft whoosh | Med — phone ≤70% frame height; carousel posters stay small |
| S02 Watching | 60–150 (2.0–5.0) | 5 | `c02_watching.mov` Watching tab, 3 cards with partial bars | tap "+" twice on top card: Ep 7→8→9, bar + % animate | whip-in from right on beat 5; rotY +8°; push-in to top card (5%) | **Track every episode.** | 2× soft clicks synced to taps, tick on bar fill | Low |
| S03 Calendar | 150–240 (5.0–8.0) | 11 | `c03_calendar.mov` Calendar, today's tab, countdown badges | tap next-day chip, list swaps; hold on countdown badge | whip-up on beat 11; rotY −8°; parallax: countdown badge lifted as a separate cropped layer +40px z | **Never miss a drop.** | whoosh + clock tick ×2 | Low |
| S04 Lists | 240–330 (8.0–11.0) | 17 | `c04_list.mov` custom list "Top 10 of All Time": rank numbers, ★, yellow My Score, collaborator avatars | long-press item #3 and drag to #1 (item scales up) | whip-in left on beat 17; rotX 6°, slight dolly to follow the dragged card | **Rank it. Share it.** | pick-up pop, slide, drop click | Low (thumbnails) |
| S05 Profile | 330–405 (11.0–13.5) | 23 | `c05_profile.mov` Profile: rank-coloured avatar ring, rank + trophy, Level bar, stats row | cold-open Profile so level bar + stats animate in; tap trophy at end → Leaderboard (used in montage) | rotate-in rotY 14°→4°; rank-colour glow behind phone pulses on beat 25 | **Level up your watchlist.** | rising shimmer, chime on bar full | None |
| S06 Dice | 405–495 (13.5–16.5) | 28 | `c06_dice.mov` Home → "Roll Dice": blur overlay, spinning yellow dice, result card pops | tap Roll Dice; hold through spin; result pops; tap "Roll Again" once | push-in hard (8%) during spin; on result pop camera jolts 2f (beat 31); yellow glow peaks | **Can't decide? Roll.** | dice rattle loop → pop + sparkle | Low–Med (result poster ~40% of card) |
| S07 Montage | 495–570 (16.5–19.0) | 34–38 | stills/clips, ~9–10f each, cut on 8th notes: ① detail lower half + Add-to-List status sheet `c07a` ② Community Pulse cards `c07b` ③ Recommendations genre profile `c07c` ④ Favorites sort modal `c07d` ⑤ Leaderboard `c07e` ⑥ Arena **category tiles only** `c07f` ⑦ Language list (10 langs) `c07g` ⑧ theme toggle dark→light→dark `c07h` | each is a 1s capture; best 10f picked | phone locked centre, flat; hard cuts + 2f yellow speed-line flash between | **And so much more.** (stays up across montage) + tiny Ionicon tag per frame | rapid ticks on 8ths, riser | Detail = High → lower half only; Arena = High → tiles only |
| S08 Payoff | 570–660 (19.0–22.0) | 39 | `c08_favorites.mov` Favorites grid, "All" chip | slow upward scroll of full grid | start tight on grid, pull back to reveal whole phone floating, then phone recedes to 55% with soft yellow halo | **Your whole dex.** *In your pocket.* | swell, music drops to pad | Med — pull-back keeps posters small |
| S09 End | 660–750 (22.0–25.0) | 45 | logo crop from `assets/images/splash-dark-cover.png` + "ANIMEDEX" wordmark | — | logo scales in on beat 45 with neon flicker (2f), phone exits down | Promo: badges App Store + Google Play, `myanimedex.com`. Store: logo + "Your Anime Companion." only | "dex" chime | None |
| Loop | 735–750 | — | — | — | final 15f: everything fades to `#0F0F0F` + yellow glow centred = S01 frame 0 | — | music tail cut to bar | — |

## Notes
- Store cut S09: no badges, no pricing, no claims; tagline from the splash ("Your Anime Companion.").
- All captions ≤ 5 words; sound-off read: hook → 5 verbs (track, never miss, rank, level up,
  roll) → more → dex → logo.
- Pulse and Leaderboard show live production data (no seeded fake users). If they look empty or
  contain anything unsuitable on capture day, swap ②/⑤ for Reviews and Search.
- Calendar and Trending are live AniList data → record all captures in one session.
