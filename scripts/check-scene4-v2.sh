#!/usr/bin/env bash
FF=/home/chatc/.local/bin/ffmpeg
CLIP=/home/chatc/projects/video-pipeline/output/sparx-legendary-treasure/clips/scene-4.mp4
OUT=/mnt/c/Users/chatc/AppData/Local/Temp/claude/C--Users-chatc-Downloads-Ai-Video/8664fd55-eb35-4b97-9ce3-833885ed4aa9/scratchpad/horncheck
dur=$(/home/chatc/.local/bin/ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$CLIP")
mid=$(echo "$dur / 2" | bc -l)
"$FF" -y -nostdin -loglevel error -ss "$mid" -i "$CLIP" -vframes 1 -vf scale=400:-1 "$OUT/scene-4-v2-mid.png"
echo "mid=$mid"
