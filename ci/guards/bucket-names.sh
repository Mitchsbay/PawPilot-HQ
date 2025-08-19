#!/usr/bin/env bash
set -euo pipefail

echo "🔍 Checking for legacy bucket names in web/src..."

bad=0
legacy_buckets=(
  "pet-photos"
  "post-media" 
  "group-avatars"
  "album-photos"
  "lost-found-photos"
  "reel-videos"
  "cause-images"
  "health-attachments"
)

for bucket in "${legacy_buckets[@]}"; do
  if rg -n --fixed-strings "$bucket" web/src >/dev/null 2>&1; then
    echo "❌ Found legacy bucket name: $bucket"
    echo "   Use BUCKETS.${bucket//-/_} instead"
    bad=1
  fi
done

if [ $bad -eq 0 ]; then
  echo "✅ All bucket names standardized!"
else
  echo ""
  echo "💡 Fix by replacing with BUCKETS constants:"
  echo "   pet-photos → BUCKETS.petPhotos"
  echo "   post-media → BUCKETS.postMedia"
  echo "   group-avatars → BUCKETS.groupAvatars"
  echo "   album-photos → BUCKETS.albumPhotos"
  echo "   lost-found-photos → BUCKETS.lostFoundPhotos"
  echo "   reel-videos → BUCKETS.reelVideos"
  echo "   cause-images → BUCKETS.causeImages"
  echo "   health-attachments → BUCKETS.healthAttachments"
fi

exit $bad