#!/usr/bin/env bash
D=/home/chatc/projects/video-pipeline/output/sparx-wants-to-fly-standard/clips
for n in 1 2 3 4 5 6; do
  printf 'scene-%s: ' "$n"
  /home/chatc/.local/bin/ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "$D/scene-$n.mp4"
done
echo '--- files in clips dir ---'
ls "$D"
