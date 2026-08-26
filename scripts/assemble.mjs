// ประกอบคลิปทุก scene เป็นวิดีโอเดียว: hard cut (ไม่ crossfade) + มิกซ์ SFX ตามเวลาของแต่ละ scene
//
// ใช้ hard cut เพราะ scene N ใช้ end_image เดียวกับ start_image ของ scene N+1 อยู่แล้ว
// เฟรมรอยต่อจึงตรงกันเอง — ใส่ crossfade กลับทำให้ดูเป็น "fade แบบ PowerPoint" (ทดสอบแล้ว)
//
// วิธีใช้: node scripts/assemble.mjs shot-lists/<file>.json [outputName]
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { resolve, join } from "node:path";
import { homedir } from "node:os";
import { DIRS } from "./config.mjs";

const execFileAsync = promisify(execFile);
const FFMPEG = join(homedir(), ".local/bin/ffmpeg");

const file = process.argv[2];
const outputName = process.argv[3] ?? "final.mp4";
if (!file) {
  console.error("ใช้: node scripts/assemble.mjs shot-lists/<file>.json [outputName]");
  process.exit(1);
}

const shotList = JSON.parse(await readFile(resolve(file), "utf8"));
const videoDir = join(DIRS.output, shotList.video_id);
const clipsDir = join(videoDir, "clips");
const audioDir = join(videoDir, "audio");

const scenes = shotList.scenes ?? [];
const args = ["-y", "-nostdin", "-loglevel", "error"];

// อินพุตวิดีโอเรียงตาม scene
for (const s of scenes) {
  const clip = join(clipsDir, `scene-${s.scene}.mp4`);
  if (!existsSync(clip)) throw new Error(`ไม่พบคลิป: ${clip}`);
  args.push("-i", clip);
}

// อินพุต SFX (เฉพาะ scene ที่มีไฟล์จริง — gen-audio อาจข้ามบางตัว)
const sfx = [];
let cursorMs = 0;
for (const s of scenes) {
  const path = join(audioDir, `sfx-${s.scene}.mp3`);
  if (existsSync(path)) sfx.push({ path, delayMs: cursorMs });
  cursorMs += (s.duration_sec ?? 0) * 1000;
}
for (const s of sfx) args.push("-i", s.path);

// hard cut ต่อกันด้วย concat filter
const vLabels = scenes.map((_, i) => `[${i}:v]`).join("");
const parts = [`${vLabels}concat=n=${scenes.length}:v=1:a=0[v]`];

// หน่วงเวลา SFX แต่ละตัวให้ตรง scene แล้วมิกซ์รวม
if (sfx.length > 0) {
  sfx.forEach((s, i) => {
    const idx = scenes.length + i;
    const delay = s.delayMs > 0 ? `adelay=${s.delayMs}:all=1,` : "";
    parts.push(`[${idx}:a]${delay}volume=0.9[a${i}]`);
  });
  const aLabels = sfx.map((_, i) => `[a${i}]`).join("");
  parts.push(`${aLabels}amix=inputs=${sfx.length}:normalize=0[a]`);
}

args.push("-filter_complex", parts.join(";"), "-map", "[v]");
if (sfx.length > 0) args.push("-map", "[a]", "-c:a", "aac");
// ไม่ใช้ -shortest: SFX สั้นกว่าคลิป ถ้าใส่จะตัดวิดีโอให้สั้นตามเสียง (เคยทำให้ scene สุดท้ายขาด)
args.push("-c:v", "libx264", "-pix_fmt", "yuv420p");

const outPath = join(videoDir, outputName);
args.push(outPath);

console.log(`ประกอบ ${scenes.length} scene (hard cut) + SFX ${sfx.length} ตัว...`);
await execFileAsync(FFMPEG, args);

const { stdout } = await execFileAsync(FFMPEG.replace("ffmpeg", "ffprobe"), [
  "-v", "error", "-show_entries", "format=duration",
  "-of", "default=noprint_wrappers=1:nokey=1", outPath,
]);
const actual = Number(stdout.trim());
const expected = scenes.reduce((s, sc) => s + (sc.duration_sec ?? 0), 0);
console.log(`\n✅ เสร็จ → ${outPath}`);
console.log(`ความยาว: ${actual.toFixed(2)}s (คาดไว้ ~${expected}s)`);
if (Math.abs(actual - expected) > 1.5) {
  console.warn("⚠️  ความยาวคลาดเคลื่อนจากที่คาด — ตรวจสอบว่าคลิปครบทุก scene");
}
