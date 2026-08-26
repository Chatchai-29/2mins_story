#!/usr/bin/env bash
FF=/home/chatc/.local/bin/ffmpeg
CLIP=/home/chatc/projects/video-pipeline/output/sparx-legendary-treasure/clips/scene-4.mp4
OUT=/mnt/c/Users/chatc/AppData/Local/Temp/claude/C--Users-chatc-Downloads-Ai-Video/8664fd55-eb35-4b97-9ce3-833885ed4aa9/scratchpad/horncheck
for t in 1 2 3 4 5; do
  "$FF" -y -nostdin -loglevel error -ss "$t" -i "$CLIP" -vframes 1 -vf scale=400:-1 "$OUT/scene-4-v3-t$t.png"
done
echo DONE
