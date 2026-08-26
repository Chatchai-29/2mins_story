#!/usr/bin/env bash
FF=/home/chatc/.local/bin/ffmpeg
OUT=/mnt/c/Users/chatc/AppData/Local/Temp/claude/C--Users-chatc-Downloads-Ai-Video/8664fd55-eb35-4b97-9ce3-833885ed4aa9/scratchpad
SRC=/home/chatc/projects/video-pipeline/output/sparx-wants-to-fly-standard/clips/scene-4.mp4
for t in 1 5 8; do
  "$FF" -y -nostdin -loglevel error -ss "$t" -i "$SRC" -vframes 1 -vf scale=400:-1 "$OUT/new_s4_t$t.png"
done
echo DONE
