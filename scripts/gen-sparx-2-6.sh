#!/usr/bin/env bash
set -e
cd /home/chatc/projects/video-pipeline
for n in 2 3 4 5 6; do
  node scripts/gen-video.mjs shot-lists/sparx-wants-to-fly.json "$n"
done
