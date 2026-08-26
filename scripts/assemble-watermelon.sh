#!/usr/bin/env bash
set -e
FF=/home/chatc/.local/bin/ffmpeg
DIR=/home/chatc/projects/video-pipeline/output/reveal-watermelon-001
C="$DIR/clips"
A="$DIR/audio"
"$FF" -y -nostdin -loglevel error \
  -i "$C/scene-1.mp4" -i "$C/scene-2.mp4" -i "$C/scene-3.mp4" -i "$C/scene-4.mp4" \
  -i "$A/sfx-1.mp3" -i "$A/sfx-2.mp3" -i "$A/sfx-3.mp3" -i "$A/sfx-4.mp3" \
  -filter_complex "[0:v][1:v]xfade=transition=fade:duration=0.7:offset=4.3[v01];[v01][2:v]xfade=transition=fade:duration=0.7:offset=8.6[v012];[v012][3:v]xfade=transition=fade:duration=0.7:offset=12.9[v];[4:a]volume=0.8[a1];[5:a]adelay=4300:all=1,volume=0.8[a2];[6:a]adelay=8600:all=1,volume=0.8[a3];[7:a]adelay=12900:all=1,volume=0.8[a4];[a1][a2][a3][a4]amix=inputs=4:normalize=0[a]" \
  -map "[v]" -map "[a]" -c:v libx264 -pix_fmt yuv420p -c:a aac -shortest \
  "$DIR/final-sfx.mp4"
echo DONE
ls -la "$DIR/final-sfx.mp4"
