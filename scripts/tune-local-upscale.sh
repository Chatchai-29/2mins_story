#!/usr/bin/env bash
set -e
FF=/home/chatc/.local/bin/ffmpeg
D=/home/chatc/projects/video-pipeline/output/sparx-standard-test/clips
OUT=/mnt/c/Users/chatc/AppData/Local/Temp/claude/C--Users-chatc-Downloads-Ai-Video/8664fd55-eb35-4b97-9ce3-833885ed4aa9/scratchpad
CROP="crop=400:400:340:560,scale=600:600:flags=neighbor"

# A: CAS แรงขึ้น
"$FF" -y -nostdin -loglevel error -ss 4 -i "$D/scene-1.mp4" -vframes 1 \
  -vf "scale=1080:1920:flags=lanczos,cas=strength=0.8,$CROP" "$OUT/tune_a.png"

# B: unsharp mask
"$FF" -y -nostdin -loglevel error -ss 4 -i "$D/scene-1.mp4" -vframes 1 \
  -vf "scale=1080:1920:flags=lanczos,unsharp=5:5:1.2:5:5:0.0,$CROP" "$OUT/tune_b.png"

# C: lanczos + unsharp + cas ผสม
"$FF" -y -nostdin -loglevel error -ss 4 -i "$D/scene-1.mp4" -vframes 1 \
  -vf "scale=1080:1920:flags=lanczos,unsharp=3:3:0.8:3:3:0.0,cas=strength=0.5,$CROP" "$OUT/tune_c.png"

echo DONE
