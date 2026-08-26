#!/usr/bin/env bash
set -e
FF=/home/chatc/.local/bin/ffmpeg
DIR=/home/chatc/projects/video-pipeline/output/sparx-wants-to-fly-001
C="$DIR/clips"
A="$DIR/audio"
"$FF" -y -nostdin -loglevel error \
  -i "$C/scene-1.mp4" -i "$C/scene-2.mp4" -i "$C/scene-3.mp4" -i "$C/scene-4.mp4" -i "$C/scene-5.mp4" -i "$C/scene-6.mp4" \
  -i "$A/sfx-1.mp3" -i "$A/sfx-2.mp3" -i "$A/sfx-3.mp3" -i "$A/sfx-4.mp3" -i "$A/sfx-5.mp3" -i "$A/sfx-6.mp3" \
  -filter_complex "\
[0:v][1:v]xfade=transition=fade:duration=0.7:offset=9.3[v01];\
[v01][2:v]xfade=transition=fade:duration=0.7:offset=18.6[v012];\
[v012][3:v]xfade=transition=fade:duration=0.7:offset=27.9[v0123];\
[v0123][4:v]xfade=transition=fade:duration=0.7:offset=37.2[v01234];\
[v01234][5:v]xfade=transition=fade:duration=0.7:offset=46.5[v];\
[6:a]volume=0.9[a1];\
[7:a]adelay=9300:all=1,volume=0.9[a2];\
[8:a]adelay=18600:all=1,volume=0.9[a3];\
[9:a]adelay=27900:all=1,volume=0.9[a4];\
[10:a]adelay=37200:all=1,volume=0.9[a5];\
[11:a]adelay=46500:all=1,volume=0.9[a6];\
[a1][a2][a3][a4][a5][a6]amix=inputs=6:normalize=0[a]" \
  -map "[v]" -map "[a]" -c:v libx264 -pix_fmt yuv420p -c:a aac -shortest \
  "$DIR/final-sfx.mp4"
echo DONE
ls -la "$DIR/final-sfx.mp4"
