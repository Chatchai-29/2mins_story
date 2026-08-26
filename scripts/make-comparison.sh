#!/usr/bin/env bash
set -e
FF=/home/chatc/.local/bin/ffmpeg
D=/home/chatc/projects/video-pipeline/output/sparx-standard-test/clips
OUT=/mnt/c/Users/chatc/Downloads/Ai\ Video/AI\ VIdeo\ test

# ทดสอบ CLI โหมด local (ผ่าน upscale-video.mjs จริง ไม่ใช่ ffmpeg ตรงๆ)
cd /home/chatc/projects/video-pipeline
node scripts/upscale-video.mjs "$D/scene-1.mp4" "$D/scene-1-local-cli.mp4" local

# วิดีโอเทียบซ้าย=local ขวา=api พร้อมป้ายกำกับ
# ซ้าย = local (ฟรี) | ขวา = api (เสียเงิน) — คั่นด้วยเส้นแดงกลางจอ
"$FF" -y -nostdin -loglevel error \
  -i "$D/scene-1-local-cli.mp4" -i "$D/scene-1-upscaled.mp4" \
  -filter_complex "\
[0:v]scale=540:960,pad=546:960:0:0:red[l];\
[1:v]scale=540:960[r];\
[l][r]hstack=inputs=2" \
  -c:v libx264 -crf 18 -pix_fmt yuv420p "$OUT/upscale-comparison.mp4"

echo DONE
ls -la "$OUT/upscale-comparison.mp4"
