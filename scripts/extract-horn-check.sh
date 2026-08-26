#!/usr/bin/env bash
FF=/home/chatc/.local/bin/ffmpeg
D=/home/chatc/projects/video-pipeline/output/sparx-legendary-treasure/clips
OUT=/mnt/c/Users/chatc/AppData/Local/Temp/claude/C--Users-chatc-Downloads-Ai-Video/8664fd55-eb35-4b97-9ce3-833885ed4aa9/scratchpad/horncheck
mkdir -p "$OUT"
for n in 1 2 3 4 5 6 7 8 9 10 11; do
  dur=$(/home/chatc/.local/bin/ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$D/scene-$n.mp4")
  mid=$(echo "$dur / 2" | bc -l)
  "$FF" -y -nostdin -loglevel error -ss "$mid" -i "$D/scene-$n.mp4" -vframes 1 -vf scale=400:-1 "$OUT/scene-$n-mid.png"
done
echo DONE
ls "$OUT"
