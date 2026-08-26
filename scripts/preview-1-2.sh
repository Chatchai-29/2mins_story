#!/usr/bin/env bash
FF=/home/chatc/.local/bin/ffmpeg
D=/home/chatc/projects/video-pipeline/output/sparx-legendary-treasure/clips
"$FF" -y -nostdin -loglevel error \
  -i "$D/scene-1.mp4" -i "$D/scene-2.mp4" \
  -filter_complex "[0:v][1:v]concat=n=2:v=1:a=0[v]" \
  -map "[v]" -c:v libx264 -pix_fmt yuv420p \
  /mnt/c/Users/chatc/Downloads/Ai\ Video/AI\ VIdeo\ test/legendary-treasure-act1-preview.mp4
echo DONE
