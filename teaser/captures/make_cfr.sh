#!/bin/zsh
# simctl takes are VFR (a frame only when the screen changes). Convert to CFR 30fps,
# holding the last frame to the container duration.
# usage: make_cfr.sh <in.mov> <out.mp4> <width>   (width 660 = proxy, 1320 = full)
set -e
d=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$1")
ffmpeg -v error -y -i "$1" -vf "fps=30,tpad=stop_mode=clone:stop_duration=5,scale=$3:-2" -t "$d" \
  -c:v libx264 -preset veryfast -crf 18 -pix_fmt yuv420p -an "$2"
