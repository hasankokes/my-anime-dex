# Teaser toolchain setup

Tested 2026-10-18 on macOS (Apple Silicon), node v25.8.0, Python 3.14.3.

| Tool | Version | Install |
|------|---------|---------|
| ffmpeg / ffprobe | 9.0.2 (libx264, libvpx-vp9, aac, libopus) | `brew install ffmpeg` |
| Remotion | 4.0.536 (remotion, @remotion/cli, @remotion/google-fonts, @remotion/media-utils) | `cd teaser/remotion && npm install` |
| React | 19.0.0 | (with the above) |
| librosa | 1.0.0 (numpy 2.5.4, soundfile) | `cd teaser && python3 -m venv .venv && .venv/bin/pip install numpy librosa soundfile` |

## Browser
Remotion's downloaded `chrome-headless-shell` crashes on this macOS ("Target closed").
`remotion.config.ts` points Remotion at the installed Google Chrome instead
(`/Applications/Google Chrome.app`). Keep Chrome installed.

## Smoke test
```bash
cd teaser/remotion
npm run smoke          # renders ../out/smoke.mp4 (960x540, 30fps, h264)
npm run studio         # live preview
```

## Beat detection
```bash
cd teaser
.venv/bin/python audio/beats.py audio/music.mp3 --out audio/beats.json
```
Output: tempo, beats, downbeats (every 4th beat, phase picked by onset energy; override with
`--phase`), onsets, and the same as frame indices at 30fps. Verified on a 120 BPM click track:
120.19 BPM, beat frames 15, 30, 45, …, downbeats 60, 120, 180.
