#!/usr/bin/env bash
set -e
cd /home/chatc/projects/video-pipeline
for n in 7 8 9 10 11; do
  node scripts/gen-video.mjs shot-lists/sparx-legendary-treasure.json "$n"
done
