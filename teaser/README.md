# MyAnimeDex — 26.5s teaser

A code-made app teaser. Everything video-related lives in `teaser/`; the app code is untouched.
Real UI captured from the iOS Simulator, edited and animated in Remotion, with music and SFX synthesized in Python.

## Deliverables (`out/`)

| File | Format | Use |
|------|--------|-----|
| `store_preview_886x1920.mp4` | 886×1920, H.264 High L4.0, 30fps, ~11 Mbps, AAC 256k 48kHz stereo, 26.5s | App Store app preview (6.9" and 6.5" iPhone) |
| `promo_1920x1080.mp4` | 1920×1080, H.264, 30fps, AAC 48kHz | YouTube → Google Play listing video |
| `promo_1080x1920.mp4` | 1080×1920, H.264, 30fps, AAC 48kHz | Social / mobile web |
| `web_loop.mp4` (2.0 MB), `web_loop.webm` (3.3 MB) | 1280×720, muted, seamless loop (last→first frame PSNR 46.6 dB) | Website hero (`<video autoplay muted loop playsinline>`) |
| `loop_check.mp4` | the web loop played twice back to back | Check the seam |
| `poster.png` | 1920×1080, promo frame 620 ("Your whole dex. In your pocket.") | `<video poster>` and thumbnail |
| `contact.png` | promo 1920×1080, one frame per second | Review |

The two cuts are the same 26.5s edit (795 frames):
- **STORE** is full-bleed real UI with caption overlays only: no device, badges, pricing or claims. End card is the logo plus "Your Anime Companion."
- **PROMO** adds a 3D phone, UI elements breaking out of the phone as motion graphics built from the app's tokens, and a logo end card with store badges and the URL.

## Re-render

Requirements: macOS, Node 25, ffmpeg 9 (`brew install ffmpeg`), Google Chrome, Python 3 venv (see `remotion/README-setup.md`).

```bash
cd teaser/remotion && npm install
cd .. && python3 -m venv .venv && .venv/bin/pip install numpy scipy librosa soundfile
```

**1. Audio** (deterministic, takes about 2s; 120 BPM, 26.5s):
```bash
cd teaser
.venv/bin/python audio/compose.py                     # → audio/out/{music,sfx,mix}.wav
.venv/bin/python audio/beats.py audio/out/music.wav --out audio/beats.json
ffmpeg -y -i audio/out/mix.wav -af "loudnorm=I=-14:TP=-1.0:LRA=11" -ar 48000 remotion/public/audio/mix.wav
```

**2. Captures → CFR clips.** Only needed if `remotion/public/full` is missing. The raw takes are gitignored.
```bash
for f in captures/raw/*.mov; do captures/make_cfr.sh "$f" "remotion/public/full/$(basename "$f" .mov).mp4" 1320; done
captures/blur_privacy.sh        # Pulse + Leaderboard: blur other users, writes captures/clean/
# then encode captures/clean/*_blur.mov to remotion/public/full/*_blur.mp4 (see review_log.md)
```

**3. Masters (ProRes HQ, deterministic)**
```bash
cd teaser
./render_masters.sh                 # PromoL PromoP WebLoop Store → out/master/*_master.mov (~5 min each)
```
Every frame goes through `renderStill` (a fresh page per frame, software GL `swiftshader`), and the PNG sequence plus
`remotion/public/audio/mix.wav` are muxed into ProRes HQ. **Don't use plain `npx remotion render` for the promo.**
On this machine it silently dropped 3D layers or returned black `<OffthreadVideo>` frames on 5–17% of frames, a
different set each run. `render_verified.py` (render twice, diff, report) is the diagnostic that found this; see
`out/master/verified.log`. The still-based renderer is bit-identical run-to-run and matches the CLI stills.

**4. Deliverable encodes**
```bash
cd teaser/out
# App Store: H.264 High@4.0, 10–12 Mbps, AAC 256k
ffmpeg -y -i master/store_master.mov -c:v libx264 -profile:v high -level:v 4.0 -pix_fmt yuv420p \
  -b:v 11M -maxrate 12M -bufsize 22M -r 30 -c:a aac -b:a 256k -ar 48000 -ac 2 -movflags +faststart store_preview_886x1920.mp4
ffmpeg -y -i master/PromoL_master.mov -c:v libx264 -preset slow -crf 16 -pix_fmt yuv420p -c:a aac -b:a 320k -ar 48000 -movflags +faststart promo_1920x1080.mp4
ffmpeg -y -i master/PromoP_master.mov -c:v libx264 -preset slow -crf 17 -pix_fmt yuv420p -c:a aac -b:a 320k -ar 48000 -movflags +faststart promo_1080x1920.mp4
# Web loop (muted, < 5 MB)
ffmpeg -y -i master/WebLoop_master.mov -an -c:v libx264 -preset slow -crf 28 -maxrate 1.4M -bufsize 2.8M -pix_fmt yuv420p -movflags +faststart web_loop.mp4
ffmpeg -y -i master/WebLoop_master.mov -an -c:v libvpx-vp9 -b:v 1.2M -row-mt 1 -deadline good web_loop.webm
ffmpeg -y -stream_loop 1 -i web_loop.mp4 -c copy loop_check.mp4
```

Per-shot test renders are available: `npx remotion still S04-L ../out/review/x.png --frame=40` (`-L` 1920×1080, `-P` 1080×1920).

## How it's built

- `docs/feature_inventory.md`: every feature, the ranking, and why the hero features were picked.
- `docs/style_guide.md`: tokens (#0F0F0F / #1F2937 / #FACC15, Poppins, Ionicons, radii 12/16).
- `docs/shotlist.md` and `captures/edl.json`: shot timing (120 BPM grid, 15 frames per beat) and in-points.
- `docs/ANIMATION_GUIDE.md`: the contract every shot follows (breakout grammar, motion vocabulary, review loop).
- `docs/review_log.md` and `docs/review/Sxx.md`: critique rounds with scores.
- `remotion/src/kit/`: format-aware layout, 3D layers, recreated UI (cards, badges, bars), 3D die, FX.
- `remotion/src/promo/shots/`: one file per shot. `src/store/StoreCut.tsx`: the store cut.

## Footage and data

- **Source:** real captures of the app (iPhone 17 Pro Max Simulator, 1320×2868, dark theme, English), `xcrun simctl io booted recordVideo`.
- **Demo account:** the team's test account. `seed/demo_seed.sql` tidied it for camera (renamed placeholder lists, added "Top 10 of All Time", fixed junk episode counters). **`seed/demo_cleanup.sql` reverts it.**
- **Privacy:** Community Pulse and Leaderboard show other real users. Their names and avatars are blurred (`captures/blur_privacy.sh`), and only the blurred files are used.
- **Artwork:** posters and character art belong to their rights holders. They appear only small and in context inside the UI; no poster or character is ever the hero of a shot. See the artwork flags in `docs/feature_inventory.md`. The demo profile avatar is a character image; it's small but visible in the Profile shot.
- **Honesty:** the Premium card (which advertises unimplemented "offline viewing" / "exclusive themes") is cropped out of every frame. No paywall, no pricing, no "best/#1" claims.

## Audio provenance and license

- **Music and SFX:** 100% synthesized from scratch by `audio/compose.py` (numpy/scipy oscillators, noise and filters). No samples, loops, presets or third-party recordings. Owned by the project; free for commercial use on every channel.
- ElevenLabs was the plan, but the Music API returned `402 paid_plan_required` on the free plan. The free plan also has no commercial license, so it wasn't used. To swap in an ElevenLabs track later, use a paid plan (commercial license), keep 120 BPM with beat 1 at 0:00, and re-run `audio/beats.py`.
- Loudness: −14 LUFS integrated, true peak ≤ −1 dBTP.

## Upload notes

### App Store Connect (app preview)
- Specs checked 2026-10-18 against developer.apple.com: 886×1920 portrait for the 6.9" and 6.5" iPhone groups; 15–30s; ≤ 30fps; H.264 High Profile Level 4.0 at 10–12 Mbps; AAC 256 kbps stereo at 44.1/48 kHz; ≤ 500 MB. Up to 3 previews per size and language.
- Upload `store_preview_886x1920.mp4` under the 6.9" display. The 6.5" group can use the same file.
- **Poster frame:** the default is 0:05 (S03 Calendar entering). Pick 0:03 (Watching with the bar mid-fill) or 0:09 (ranked list) in the poster-frame picker.
- An iPad preview (1200×1600) wasn't produced. The app supports iPad (`supportsTablet: true`), but the footage is iPhone-only. iPad previews are optional.
- Processing can take up to 24h. Previews are reviewed with the app version.

### YouTube → Google Play Console
1. Upload `promo_1920x1080.mp4` to YouTube as **Public** or **Unlisted** (not Private). Keep monetization/ads off for this video and don't age-restrict it. Check Play Console's current "Preview assets" help page before publishing, because its video rules change.
2. In Play Console → Grow → Store presence → Main store listing → **Video**, paste the YouTube URL (`https://www.youtube.com/watch?v=…`).
3. `promo_1080x1920.mp4` is for Shorts/social. Play only uses the landscape link.

## Open items
- **Store badges in the promo end card are drawn placeholders.** Replace them with the official Apple "Download on the App Store" and Google "Get it on Google Play" artwork (both companies' marketing guidelines require it) before publishing the promo.
- Optional re-capture on a **Release build** with denser touch paths, for smoother in-screen scrolling (see review_log "3 biggest problems" #1).
- Revert the demo account with `seed/demo_cleanup.sql` when finished.
- The ElevenLabs API key was shared in chat: rotate it.
