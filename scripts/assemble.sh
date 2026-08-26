#!/usr/bin/env bash
set -e
FF=/home/chatc/.local/bin/ffmpeg
DIR=/home/chatc/projects/video-pipeline/output/reveal-grape-001
"$FF" -y -nostdin -loglevel error \
  -i "$DIR/clips/scene-1.mp4" -i "$DIR/clips/scene-2.mp4" \
  -i "$DIR/audio/sfx-1.mp3" -i "$DIR/audio/sfx-2.mp3" \
  -filter_complex "[0:v][1:v]xfade=transition=fade:duration=0.7:offset=4.3[v];[2:a]volume=0.8[a1];[3:a]adelay=4300:all=1,volume=0.8[a2];[a1][a2]amix=inputs=2:normalize=0[a]" \
  -map "[v]" -map "[a]" -c:v libx264 -pix_fmt yuv420p -c:a aac -shortest \
  "$DIR/final-sfx.mp4"
echo DONE
ls -la "$DIR/final-sfx.mp4"
