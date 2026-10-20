#!/usr/bin/env bash
# Builds the landing-page media in web/assets/ from the teaser masters.
# Needs ffmpeg (libx264 + libvpx-vp9) and a Python with Pillow (PY=/path/to/python).
# Run from the repo root: PY=python3 bash web/_src/build-assets.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
FULL="$ROOT/teaser/remotion/public/full"   # 1320x2868 CFR captures of the real app
OUT="$ROOT/teaser/out"
A="$ROOT/web/assets"
PY="${PY:-python3}"
mkdir -p "$A/clips" "$A/video" "$A/img" "$A/badges"

W=540; H=1174   # phone-screen clip size (2x of the largest on-page screen)
# Clips ship as MP4 only: at this size VP9 came out larger than H.264.

clip() { # name src in dur [extra filter before scale]
  local name=$1 src=$2 in=$3 dur=$4 pre=${5:-}
  if [ -z "${FORCE:-}" ] && [ -f "$A/clips/$name.mp4" ]; then return; fi
  local vf="${pre:+$pre,}scale=$W:$H:flags=lanczos,fps=30,format=yuv420p"
  ffmpeg -v error -y -ss "$in" -t "$dur" -i "$FULL/$src.mp4" -an -vf "$vf" \
    -c:v libx264 -preset slow -crf 27 -profile:v high -movflags +faststart "$A/clips/$name.mp4"
  # poster = the clip's first frame
  ffmpeg -v error -y -ss "$in" -i "$FULL/$src.mp4" -frames:v 1 -vf "${pre:+$pre,}scale=$W:$H:flags=lanczos" "$A/clips/$name.png"
}

# Profile (clip_profile): drop the Premium upsell card (y 1340–1950), whose copy promises
# features the app doesn't have; the gap is filled with the screen background.
clip_profile() {
  local name=profile in=3.05 dur=5
  local fc="[0:v]split[t][b];[t]crop=1320:1340:0:0[top];[b]crop=1320:918:0:1950[bot];color=c=0x0F0F11:s=1320x610:r=30[gap];[top][gap][bot]vstack=inputs=3:shortest=1,scale=$W:$H:flags=lanczos,fps=30,format=yuv420p[v]"
  ffmpeg -v error -y -ss $in -t $dur -i "$FULL/c05_profile.mp4" -filter_complex "$fc" -map "[v]" -an -shortest \
    -c:v libx264 -preset slow -crf 27 -profile:v high -movflags +faststart "$A/clips/$name.mp4"
  ffmpeg -v error -y -ss 4.5 -i "$FULL/c05_profile.mp4" -filter_complex "${fc/fps=30,format=yuv420p/format=rgb24}" -map "[v]" -frames:v 1 "$A/clips/$name.png"
}

clip tracker  c02_watching 5.0 7
clip calendar c03_calendar 1.0 5
clip lists    c04_list     2.0 3.4
clip_profile
clip dice     c06_dice     2.8 4.6
# v2 hero: one montage clip for the 3D phone screen (home → tracker → calendar → lists → dice)
if [ -n "${FORCE:-}" ] || [ ! -f "$A/clips/hero.mp4" ]; then
  seg() { echo "[$1:v]trim=$2:$3,setpts=PTS-STARTPTS,scale=${W}:${H}:flags=lanczos,fps=30,format=yuv420p[$4]"; }
  ffmpeg -v error -y -i "$FULL/c01_home.mp4" -i "$FULL/c02_watching.mp4" -i "$FULL/c03_calendar.mp4" -i "$FULL/c04_list.mp4" -i "$FULL/c06_dice.mp4" \
    -filter_complex "$(seg 0 1.0 3.0 a);$(seg 1 5.2 7.2 b);$(seg 2 1.0 3.0 c);$(seg 3 2.3 4.5 d);$(seg 4 3.0 5.6 e);[a][b][c][d][e]concat=n=5:v=1:a=0[v]" \
    -map "[v]" -an -c:v libx264 -preset slow -crf 26 -profile:v high -movflags +faststart "$A/clips/hero.mp4"
fi

# payoff + mobile hero fallback: stills only
ffmpeg -v error -y -ss 2.5 -i "$FULL/c08_favorites.mp4" -frames:v 1 -vf "scale=$W:$H:flags=lanczos" "$A/clips/favorites.png"
ffmpeg -v error -y -ss 4.0 -i "$FULL/c01_home.mp4" -frames:v 1 -vf "scale=$W:$H:flags=lanczos" "$A/clips/home.png"

# Hero loops. Desktop: the 16:9 web loop. Mobile: the vertical promo, muted.
ffmpeg -v error -y -i "$OUT/web_loop.mp4" -an -vf "scale=1280:720,format=yuv420p" -c:v libx264 -preset slow -crf 26 -movflags +faststart "$A/video/loop-16x9.mp4"
ffmpeg -v error -y -i "$OUT/web_loop.mp4" -an -vf "scale=1280:720" -c:v libvpx-vp9 -crf 40 -b:v 0 -row-mt 1 -deadline good -cpu-used 2 "$A/video/loop-16x9.webm"
ffmpeg -v error -y -i "$OUT/promo_1080x1920.mp4" -an -vf "scale=540:960:flags=lanczos,format=yuv420p" -c:v libx264 -preset slow -crf 27 -movflags +faststart "$A/video/loop-9x16.mp4"
ffmpeg -v error -y -i "$OUT/promo_1080x1920.mp4" -an -vf "scale=540:960:flags=lanczos" -c:v libvpx-vp9 -crf 40 -b:v 0 -row-mt 1 -deadline good -cpu-used 2 "$A/video/loop-9x16.webm"
ffmpeg -v error -y -ss 1.2 -i "$OUT/promo_1080x1920.mp4" -frames:v 1 -vf "scale=540:960:flags=lanczos" "$A/video/poster-9x16.png"

# Trailer (with sound) for the "Watch the trailer" modal until a YouTube link exists.
ffmpeg -v error -y -i "$OUT/promo_1920x1080.mp4" -vf "scale=1280:720:flags=lanczos,format=yuv420p" -c:v libx264 -preset slow -crf 24 -c:a aac -b:a 128k -movflags +faststart "$A/video/trailer-16x9.mp4"
ffmpeg -v error -y -i "$OUT/promo_1080x1920.mp4" -vf "scale=720:1280:flags=lanczos,format=yuv420p" -c:v libx264 -preset slow -crf 24 -c:a aac -b:a 128k -movflags +faststart "$A/video/trailer-9x16.mp4"

cp "$ROOT/teaser/remotion/public/badges/app-store-badge.svg" "$A/badges/app-store.svg"
cp "$ROOT/teaser/remotion/public/badges/google-play-badge.png" "$A/badges/google-play.png"

# PNG -> WebP, OG image, favicons
"$PY" - "$A" "$OUT/poster.png" "$ROOT/web/header-logo.png" <<'PYEOF'
import sys, os, glob
from PIL import Image
A, poster, logo = sys.argv[1:4]
for p in glob.glob(f"{A}/clips/*.png") + [f"{A}/video/poster-9x16.png"]:
    im = Image.open(p).convert("RGB")
    im.save(p[:-4] + ".webp", quality=78, method=6); os.remove(p)
    # small variant for phones (mini phones are ~270 CSS px wide, the 9:16 poster ~330)
    w = 360 if "poster" in p else 300
    suffix = "-360" if "poster" in p else "-300"
    im.resize((w, round(w * im.height / im.width)), Image.LANCZOS).save(p[:-4] + suffix + ".webp", quality=78, method=6)
im = Image.open(poster).convert("RGB")
im.resize((1280, 720), Image.LANCZOS).save(f"{A}/video/poster-16x9.webp", quality=78, method=6)
# OG 1200x630: centre crop of the 16:9 poster
w, h = im.size; ch = int(w * 630 / 1200); top = (h - ch) // 2
im.crop((0, top, w, top + ch)).resize((1200, 630), Image.LANCZOS).save(f"{A}/img/og.jpg", quality=85)
lg = Image.open(logo).convert("RGBA")
lg.resize((96, 96), Image.LANCZOS).save(f"{A}/img/logo-96.png", optimize=True)
lg.resize((32, 32), Image.LANCZOS).save(f"{A}/img/favicon-32.png", optimize=True)
lg.resize((192, 192), Image.LANCZOS).save(f"{A}/img/icon-192.png", optimize=True)
lg.resize((512, 512), Image.LANCZOS).save(f"{A}/img/icon-512.png", optimize=True)
bg = Image.new("RGBA", lg.size, (15, 15, 15, 255)); bg.alpha_composite(lg)
bg.convert("RGB").resize((180, 180), Image.LANCZOS).save(f"{A}/img/apple-touch-icon.png", optimize=True)
PYEOF

du -sh "$A"/*
