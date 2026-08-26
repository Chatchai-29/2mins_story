#!/usr/bin/env bash
# ดึงเฟรมที่เวลาเดียวกันจากเวอร์ชัน Pro และ Standard+upscale มาเทียบ
FF=/home/chatc/.local/bin/ffmpeg
OUT=/mnt/c/Users/chatc/AppData/Local/Temp/claude/C--Users-chatc-Downloads-Ai-Video/8664fd55-eb35-4b97-9ce3-833885ed4aa9/scratchpad
PRO=/home/chatc/projects/video-pipeline/output/sparx-wants-to-fly-001/clips
STD=/home/chatc/projects/video-pipeline/output/sparx-wants-to-fly-standard/clips

# 0:33 = scene 4 ที่ 3 วินาที | 0:43 = scene 5 ที่ 3 วินาที
"$FF" -y -nostdin -loglevel error -ss 3 -i "$PRO/scene-4.mp4" -vframes 1 -vf scale=480:-1 "$OUT/cmp_s4_pro.png"
"$FF" -y -nostdin -loglevel error -ss 3 -i "$STD/scene-4.mp4" -vframes 1 -vf scale=480:-1 "$OUT/cmp_s4_std.png"
"$FF" -y -nostdin -loglevel error -ss 3 -i "$PRO/scene-5.mp4" -vframes 1 -vf scale=480:-1 "$OUT/cmp_s5_pro.png"
"$FF" -y -nostdin -loglevel error -ss 3 -i "$STD/scene-5.mp4" -vframes 1 -vf scale=480:-1 "$OUT/cmp_s5_std.png"
echo DONE
ls "$OUT"/cmp_*.png
