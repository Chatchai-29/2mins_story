#!/usr/bin/env bash
set -e
FF=/home/chatc/.local/bin/ffmpeg
D=/home/chatc/projects/video-pipeline/output/sparx-standard-test/clips
OUT=/mnt/c/Users/chatc/AppData/Local/Temp/claude/C--Users-chatc-Downloads-Ai-Video/8664fd55-eb35-4b97-9ce3-833885ed4aa9/scratchpad

echo "--- local upscale (lanczos + CAS) ---"
time "$FF" -y -nostdin -loglevel error -i "$D/scene-1.mp4" \
  -vf "scale=1080:1920:flags=lanczos,cas=strength=0.4" \
  -c:v libx264 -crf 18 -pix_fmt yuv420p "$D/scene-1-local.mp4"

echo "--- extract comparison frames at t=4s ---"
"$FF" -y -nostdin -loglevel error -ss 4 -i "$D/scene-1.mp4"          -vframes 1 "$OUT/up_720_orig.png"
"$FF" -y -nostdin -loglevel error -ss 4 -i "$D/scene-1-upscaled.mp4" -vframes 1 "$OUT/up_api.png"
"$FF" -y -nostdin -loglevel error -ss 4 -i "$D/scene-1-local.mp4"    -vframes 1 "$OUT/up_local.png"

echo "--- crop face region (zoom to inspect detail) ---"
"$FF" -y -nostdin -loglevel error -i "$OUT/up_api.png"   -vf "crop=400:400:340:560,scale=600:600:flags=neighbor" "$OUT/zoom_api.png"
"$FF" -y -nostdin -loglevel error -i "$OUT/up_local.png" -vf "crop=400:400:340:560,scale=600:600:flags=neighbor" "$OUT/zoom_local.png"

echo DONE
ls -la "$D"
