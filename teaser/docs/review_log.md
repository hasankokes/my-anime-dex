# Review Log

## Round 0 — Raw captures (2026-10-18)

Device: iPhone 17 Pro Max simulator, 1320×2868, H.264, dark theme, English, status bar 9:41.
Debug build via Metro. Account: demo user (Level 8, Platinum). Contact sheet: `out/contact_raw.png`
(one frame per take at 70%, so it's not always the best frame).

| Take | Len | Usable | Notes |
|------|-----|--------|-------|
| c01_home | 9.6s | ✅ | Clean. The scroll at the end comes in a bit abrupt; use the first ~5s. Trending is live data (it changed after a later relaunch, so don't mix takes). |
| c02_watching | 13.0s | ✅ | Frieren Ep 6→8 with the bar filling. Hero-quality. |
| c03_calendar | 9.6s | ✅ (trim) | Countdown badges (2h 37m, 3h 7m…) look good. Trim the Favorites-Only toggle at the end (only one aired card shows). |
| c04_list | 5.3s | ✅ (trim 0.5s) | Drag of #3 → #1 with the yellow lifted card. Hero-quality. The first frame has the dev "Refreshing…" banner. |
| c05_profile | 8.1s | ✅ (crop) | Spinner → profile. **Crop below the stats row:** the Premium card promises "offline viewing / exclusive themes", which don't exist (fake-feature ban). The avatar is a third-party character (small). |
| c06_dice | 19.5s | ✅ | Spinning glowing dice → result pop (I Want to Eat Your Pancreas). The second roll at the end is unfinished; use ~1–8s. |
| c07a_detail | 12.9s | ✅ (crop) | Scroll to score box + Add to List → status sheet. Use the lower half only. |
| c07b_pulse | 7.9s | ⚠️ privacy | Shows **real users' names** ("nitin gupta", "CID_KAGENOU"). Blur usernames or drop the shot. |
| c07c_recs | 4.6s | ⚠️ app bug | Mostly "Analyzing your taste profile…". The loaded view shows the raw template text "{count}" / "{genre}" and "Highly rated on MAL". Use only the loader + Genre Profile chips, or fix the app first. |
| c07d_fav_filters | 4.6s | ✅ | Completed chip → Sort modal. |
| c07e_leaderboard | 6.0s | ⚠️ privacy | Real usernames/avatars, some look like real names. Blur rows except the demo user, or drop. |
| c07f_arena_tiles | 3.8s | ✅ | Category tile selection (Action → Comedy). The banner's character avatars are small; keep the crop on the tiles. |
| c07g_language | 6.1s | ✅ | 10-language list. |
| c07h_theme | 8.1s | ✅ | Dark → light → dark. In the dark frames before the first toggle, the header logo/avatar are missing (load glitch after relaunch). Start the cut at the light flip. |
| c07x_chill_list_collab | 11.3s | ✅ bonus | Shared list with collaborator avatar "Asuna". |
| c08_favorites | 8.2s | ✅ | Retake (the first take was 0.96s). Sorted by Score (Highest). Large posters → the pull-back in the payoff must shrink them. |

### Production issues found
1. **Metro Fast Refresh during takes.** Writing recordings inside the repo made Metro refresh, which caused the "Refreshing…" banner and dropped taps. Fixed: `captures/rec.sh` records to `~/Library/Caches/myanimedex-teaser-rec` and `collect` moves the files into `raw/`.
2. **The app froze once** (all taps ignored on Favorites). Relaunching fixed it. Recommendation for the final pass: record from a **Release build** (`npx expo run:ios --configuration Release`) — no dev overlays, smoother animation.
3. **Calendar on Sundays:** most cards read "Airing now / Just aired"; countdowns only appear on today's later slots.

### App bugs seen on camera (not fixed — app code is out of scope for the teaser)
- `app/recommendations.tsx`: `{count}` / `{genre}` placeholders not interpolated; "Highly rated on MAL" copy is outdated (data is AniList).
- Premium card copy promises "offline viewing" and "exclusive themes", which aren't implemented.
- The header logo/avatar sometimes don't render in dark mode right after launch.

### Privacy pass (decision: blur, keep in montage)
`captures/blur_privacy.sh` → `captures/clean/` (CFR 30fps, trimmed to static windows so the fixed blur rects stay valid):
- `c07b_pulse_blur.mov` — 1.7s (raw 3.4–5.1s). Usernames on both visible cards blurred; posters, verbs and anime titles stay readable.
- `c07e_leaderboard_blur.mov` — 2.9s (raw 3.1–6.0s). Avatar + name + level column blurred on every row (the demo user is #26, so it's off-screen); rank badges and XP stay.
- Checked first/middle/last frames: no readable name anywhere. **Montage must use only these clean files, never the raw takes.**
- Note: simctl takes are VFR (frames only on screen change). Any trim must go through `fps=30` first or durations collapse.

## Round 1 — Animatic v1 (960×540, placeholder 120 BPM bed)

File: `out/animatic_960x540.mp4` (25.0s, H.264 + AAC). Pacing sheet: `out/animatic_pacing.png` (one frame every 0.5s).
Timing: `captures/edl.json`. Code: `remotion/src/Animatic.tsx`.

| Axis | Score | Why |
|------|-------|-----|
| Hook | 6 | The phone snaps in on beat 1 and the line is readable, but the first frame is just a phone on dark. There's no "wow" yet. |
| Readability @360px | 8 | Captions are 9% of frame height, ≤5 words, high contrast. The montage tag chip is the smallest text (4.5%) and still reads. |
| Motion | 5 | Camera moves work, but the captured UI is sparse. Scrolls are stepped (my touch paths moved in 250ms steps) and the Watching bar change is a single jump. |
| Composition | 7 | Phone and caption alternate sides on every whip. Every hero shot uses the same layout, so the middle feels repetitive. |
| Depth | 5 | One layer (phone) plus a glow. Only the Profile shot has a separated UI layer, and it's the best-looking shot. |
| Sound sync | 5 | Cuts land on the 15f grid, but the placeholder clicks have no SFX for taps, pops or whips. |
| Polish | 4 | Animatic quality: plain whip blur, no motion-blur sampling. The end-card badges are placeholders, not the official artwork. |
| Looks like the real app | 9 | 100% real captures, real tokens, Poppins, real logo. |

### 3 biggest problems
1. **Captured motion is thin.** Re-record the hero takes on a **Release build** with dense touch paths (16ms steps) so scrolls, drag and taps are smooth. Then the camera doesn't have to fake all the energy.
2. **Same layout for every hero shot.** Vary it: the Watching card lifts out as a layer (like Profile), Calendar countdown badges pop out in z, the Lists drag gets a close-up, and the Dice gets a full-frame glow takeover.
3. **The payoff isn't a payoff yet.** The Favorites freeze plus pull-back reads as just another shot. It needs a stronger reveal: the phone recedes while poster tiles cascade out behind it, kept small. Or end on the full grid with the tab bar visible and a yellow halo.

### Fixed during this round
- S05 started on the Home screen for 0.5s (profile appears at 3.01s in the take) → in-point moved to 3.05s.
- Montage "Shared lists" showed the list still loading → in-point moved to 3.6s.
- S05 showed the Premium card copy → the profile header is now a separate floating panel cropped above the card (`PANEL_BOTTOM = 0.462`).

## Round 2 — Promo breakouts + Store cut (2026-10-18)

The user's direction: the PROMO cut breaks UI out of the phone as 3D motion graphics built from the
design tokens, and the logo end card gets a designed build-up. The STORE cut stays as planned.
- Kit (`src/kit/`) plus `docs/ANIMATION_GUIDE.md`. The shots were split across three subagents
  (S01–S03, S04–S06, S07–S08). The lead built S09, the Store cut and the integration.
- Per-shot reviews: `docs/review/S01.md` … `S09.md`. Each had ≥ 3 rounds; final scores are ≥ 8 on every axis for every shot.

### Integration fixes (lead)
1. **Empty frame at every cut.** `whipIn` started the phone fully off-screen (0.9W), so frames 60/150/240/330/405/495/570 showed a bare stage, a visible blink. The offset is now 0.3W with 28px motion blur, so the incoming shot is half on screen on frame 0.
2. **Loop seam.** S09's collapse now ends at f88, and S01's local glow fades in over 4f. Last frame vs first frame: PSNR 46.6 dB (grain only).
3. **Caption highlight glow** was clipped into a rectangle by the line mask. Fixed with padding and negative margins.
4. **Render reliability.** Parallel Chrome tabs dropped 3D layers on random frames. `Icon` now preloads its SVG via a hidden `<Img>`, and every master is rendered with `--concurrency=1` as ProRes HQ, then encoded.
5. **S08 → S09 hand-off.** The S09 glow starts at frame centre (where S08 leaves it) and drifts up to the logo.

### Store cut (`out/store_preview_886x1920.mp4`)
| hook | read@360 | motion | comp | depth | sync | polish | app |
|---|---|---|---|---|---|---|---|
| 8 | 9 | 7 | 8 | 6 | 8 | 8 | 10 |
By design it has less motion and depth than the promo: real UI only, no device, no breakouts (Apple rules).
Remaining: the S05 profile panel leaves the bottom ~35% of the frame empty, and the dice in-point stays at 3.0s (the promo uses 3.2s).

### Audio
ElevenLabs Music API → `402 paid_plan_required` on the free plan, and the free plan has no commercial license. Music and
SFX are synthesized in `audio/compose.py` instead: 120 BPM, A minor, beat 1 at 0:00. A 30-entry SFX cue sheet is locked to
the shot events (presses, pops, dice rattle, the "dex" chime on the logo slam at f675). The mix is −14 LUFS, TP −1.7 dBTP.
`beats.py` on the result: 119.7 BPM, beats on the 15f grid (±1f).

### Next
- Optional: re-capture hero takes on a Release build with denser touch paths, for smoother in-screen scrolling.
- Stills per shot (Gate 2), then critique round 1 with scores.

## Final — renders (2026-10-18)

| Deliverable | Verified |
|---|---|
| `store_preview_886x1920.mp4` | H.264 High@4.0, 10.5 Mbps, AAC 48 kHz stereo, 25.0s, 33 MB, −14.0 LUFS / −1.2 dBTP |
| `promo_1920x1080.mp4` / `promo_1080x1920.mp4` | H.264 High, 30fps, AAC 48 kHz, 25.0s, 20 / 18 MB |
| `web_loop.mp4` / `.webm` | 1280×720 muted, 2.0 / 3.3 MB; seam last→first frame PSNR 46.6 dB |
| `loop_check.mp4` | the web loop ×2 (50s) |

**Render reliability (the important lesson).** `remotion render` silently corrupted promo frames: missing 3D die faces
and list rows, black `<OffthreadVideo>` screens. It hit 56 frames in PromoL and about 130 in PromoP, different every run. Software GL fixed the die faces but
not the black video frames. **The masters are now rendered frame-by-frame with `renderStill`**
(`render_masters.sh` → `remotion/render_stills.mjs`). Two runs are bit-identical and match the CLI stills
(PSNR ∞). `render_verified.py` stays as the A/B diagnostic.

Notes found on the final contact sheet:
- S08 opens on a 2.5× close-up of the Favorites grid. For about 8 frames the posters fill the frame, but they're
  motion-blurred by the whip. Short, but it's the one moment where artwork is large.
- Whip frames at the cut points are intentionally blurred.
