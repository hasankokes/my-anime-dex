#!/bin/zsh
# Deterministic masters: every frame via renderStill (fresh page, software GL), then PNG sequence + mix → ProRes HQ.
# Two runs are bit-identical (verified); `remotion render` was not (see out/master/verified.log).
# usage: ./render_masters.sh [Comp ...]   (default: PromoL PromoP WebLoop Store)
set -e
cd "$(dirname "$0")"
if (( $# )); then comps=("$@"); else comps=(PromoL PromoP WebLoop Store); fi
for c in $comps; do
  dir=out/frames/$c
  rm -rf $dir
  (cd remotion && node render_stills.mjs $c ../$dir 0 749 2)
  out=out/master/${c}_master.mov
  [ $c = Store ] && out=out/master/store_master.mov
  if [ $c = WebLoop ]; then
    ffmpeg -v error -y -framerate 30 -i $dir/f%04d.png -c:v prores_ks -profile:v 3 -pix_fmt yuv422p10le $out
  else
    ffmpeg -v error -y -framerate 30 -i $dir/f%04d.png -i remotion/public/audio/mix.wav -map 0:v -map 1:a \
      -c:v prores_ks -profile:v 3 -pix_fmt yuv422p10le -c:a pcm_s16le -ar 48000 -shortest $out
  fi
  echo "$c → $out"
done
