#!/usr/bin/env bash
set -e
cd /home/chatc/projects/video-pipeline
for n in 3 4 5 6; do
  node scripts/gen-video.mjs shot-lists/sparx-legendary-treasure.json "$n"
done
