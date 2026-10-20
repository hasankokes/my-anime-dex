#!/bin/zsh
# Blurs other users' usernames/avatars in the Pulse and Leaderboard takes
# and trims each to its static window (rects are only valid while nothing scrolls).
# Output: captures/clean/*.mov  (1320x2868, H.264, CFR 30fps — simctl takes are VFR)
set -e
cd "$(dirname "$0")"
mkdir -p clean
ENC=(-c:v libx264 -preset slow -crf 14 -pix_fmt yuv420p -an)

# Pulse feed: static 3.4–5.1s. Two username boxes on the first text line of each card.
ffmpeg -v error -y -i raw/c07b_pulse.mov -filter_complex "
  [0:v]fps=30,trim=start=3.4:end=5.1,setpts=PTS-STARTPTS,split=3[base][a][b];
  [a]crop=250:66:255:666,boxblur=lr=24:lp=3:cr=10:cp=3[ab];
  [b]crop=245:66:1075:666,boxblur=lr=24:lp=3:cr=10:cp=3[bb];
  [base][ab]overlay=255:666[t1];
  [t1][bb]overlay=1075:666" "${ENC[@]}" clean/c07b_pulse_blur.mov

# Leaderboard: static 3.1–6.0s. Avatar + name + level column for every row
# (demo user is rank #26, so every visible row belongs to someone else).
ffmpeg -v error -y -i raw/c07e_leaderboard.mov -filter_complex "
  [0:v]fps=30,trim=start=3.1:end=6.0,setpts=PTS-STARTPTS,split=2[base][a];
  [a]crop=810:2448:250:420,boxblur=lr=28:lp=3:cr=12:cp=3[ab];
  [base][ab]overlay=250:420" "${ENC[@]}" clean/c07e_leaderboard_blur.mov

ls -la clean
