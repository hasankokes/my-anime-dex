#!/bin/bash
# Renders the cover stills and the Play Store review mocks.
# Usage: teaser/cover_render.sh [round-dir]   (from anywhere)
set -euo pipefail
cd "$(dirname "$0")/remotion"
OUT=../out/cover
R=${1:-$OUT/review}
mkdir -p "$OUT" "$R" public/cover
npx remotion still CoverYT          $OUT/youtube_thumbnail_1280x720.png
npx remotion still CoverYTWordmark  $OUT/youtube_thumbnail_wordmark_1280x720.png
npx remotion still FeatureGraphic   $OUT/feature_graphic_1024x500.png
cp $OUT/youtube_thumbnail_1280x720.png $OUT/feature_graphic_1024x500.png public/cover/
for img in youtube_thumbnail_1280x720 feature_graphic_1024x500; do
  npx remotion still PlayMockDesktop "$R/mock_desktop_2560_$img.png" --props="{\"img\":\"cover/$img.png\"}"
  npx remotion still PlayMockMobile  "$R/mock_mobile_390_$img.png"   --props="{\"img\":\"cover/$img.png\"}"
done
ls -la $OUT/*.png
