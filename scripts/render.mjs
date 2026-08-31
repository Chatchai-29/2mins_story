// ประกอบวิดีโอสุดท้ายด้วย Remotion (รันหลังผ่าน checkpoint approve แล้วเท่านั้น)
// วิธีใช้: node scripts/render.mjs shot-lists/<file>.json [outputName]
// outputName เอาไว้ render พรีวิวสั้นๆ (เช่น shot list ที่กรองเหลือ scene เดียว) โดยไม่ทับ final.mp4
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { readFile, mkdir, rm, cp } from "node:fs/promises";
import { existsSync } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { resolve, join } from "node:path";
import { homedir } from "node:os";
import { DIRS, ROOT, WINDOWS_STAGING_ROOT } from "./config.mjs";
import { logEvent } from "./log.mjs";

const execFileAsync = promisify(execFile);
const FFMPEG = join(homedir(), ".local/bin/ffmpeg");

// หา path โฟลเดอร์ Preview บน Windows staging — ใช้ windows_preview_dir ถ้าชอตลิสต์ระบุไว้ตรงๆ
// ไม่งั้นเดาจาก source_image ของ scene แรกที่มีภาพ (เช่น "Horror story/X/Image 01.png" ->
// "Horror story/X") ใช้ได้กับเกือบทุกโปรเจกต์เพราะ source_image อยู่ใต้โฟลเดอร์ set/โปรเจกต์เสมอ —
// ตั้งใจให้ mirror ไป Windows เกิดขึ้นเองทุกครั้งโดยไม่ต้องจำใส่ field นี้เอง (2026-08-31)
// โปรเจกต์ที่ใช้คลิปสำเร็จรูป (ไม่มี source_image เลย เช่น Four Elevators/Four Rings) เดาไม่ได้
// ต้องใส่ windows_preview_dir ตรงๆ ใน shot list เอง — ถ้าไม่ใส่จะ warn ชัดเจนตอน render แทนที่จะเงียบ
function derivePreviewDir(shotList) {
  if (shotList.windows_preview_dir) return shotList.windows_preview_dir;
  const withImage = shotList.scenes.find((s) => s.source_image);
  if (!withImage) return null;
  const parts = withImage.source_image.split("/");
  parts.pop();
  return parts.join("/");
}

async function attachWordTimestamps(shotList, publicDir) {
  for (const scene of shotList.scenes) {
    const wordsPath = join(publicDir, "audio", `narration-${scene.scene}.words.json`);
    if (existsSync(wordsPath)) {
      scene.words = JSON.parse(await readFile(wordsPath, "utf8"));
    }
  }
  return shotList;
}

// ความยาว scene จริง (นับรวมส่วนที่ยืดออกถ้าเสียงพากย์ยาวกว่าคลิปวิดีโอต้นฉบับ) — สูตรเดียวกับ
// effectiveDurationSec ใน remotion/VideoComposition.tsx เป๊ะ (คนละภาษา ต้องคงสูตรให้ตรงกันเอง)
function effectiveDurationSec(scene) {
  const narrationEndSec = scene.words?.length
    ? scene.words[scene.words.length - 1].end + 0.3
    : 0;
  return Math.max(scene.duration_sec, narrationEndSec);
}

// รวมไฟล์ narration-N.mp3 ของทุก scene เป็นแทร็กเดียว โดยหน่วงเวลาแต่ละไฟล์ให้เริ่มตรงจุดที่ scene
// นั้นเริ่มจริงในวิดีโอสุดท้าย (cursor เดียวกับที่ Remotion ใช้วาง Sequence) — ได้ไฟล์เสียงพากย์ล้วน
// (ไม่มี SFX ปน) ที่ sync ตรงกับวิดีโอเป๊ะ ไว้เอาไปพากย์ภาษาอื่น/แก้ไขนอกไปป์ไลน์ได้ง่าย
async function exportNarrationTrack(shotList, audioDir, outPath, totalSec) {
  const args = ["-y", "-nostdin", "-loglevel", "error"];
  const narrations = [];
  let cursorSec = 0;
  for (const scene of shotList.scenes) {
    const path = join(audioDir, `narration-${scene.scene}.mp3`);
    if (existsSync(path)) narrations.push({ path, delayMs: Math.round(cursorSec * 1000) });
    cursorSec += effectiveDurationSec(scene);
  }
  if (!narrations.length) return null;

  for (const n of narrations) args.push("-i", n.path);
  const parts = narrations.map((n, i) => {
    const delay = n.delayMs > 0 ? `adelay=${n.delayMs}:all=1,` : "";
    return `[${i}:a]${delay}apad=whole_dur=${totalSec}[a${i}]`;
  });
  const labels = narrations.map((_, i) => `[a${i}]`).join("");
  parts.push(`${labels}amix=inputs=${narrations.length}:normalize=0,atrim=0:${totalSec}[out]`);
  args.push("-filter_complex", parts.join(";"), "-map", "[out]", "-c:a", "libmp3lame", outPath);

  await execFileAsync(FFMPEG, args);
  return outPath;
}

const file = process.argv[2];
const outputName = process.argv[3] ?? "final.mp4";
if (!file) {
  console.error("ใช้: node scripts/render.mjs shot-lists/<file>.json [outputName]");
  process.exit(1);
}

const shotList = JSON.parse(await readFile(resolve(file), "utf8"));
const videoDir = join(DIRS.output, shotList.video_id);

// 1) stage คลิป + เสียงของวิดีโอนี้เข้า remotion/public เพื่อให้ staticFile() หาเจอ
const publicDir = join(ROOT, "remotion", "public");
await rm(publicDir, { recursive: true, force: true });
await mkdir(publicDir, { recursive: true });
for (const sub of ["clips", "audio"]) {
  const src = join(videoDir, sub);
  if (existsSync(src)) await cp(src, join(publicDir, sub), { recursive: true });
}
await attachWordTimestamps(shotList, publicDir);

// 2) bundle + render
console.log("bundling...");
// bundle() ไม่อ่าน remotion.config.ts (ใช้แค่ตอนรันผ่าน remotion CLI เท่านั้น) ต้องส่ง publicDir ตรงๆ
// ไม่งั้น default จะไปหา <project-root>/public ซึ่งไม่มีจริง แล้ว clips/audio ที่ stage ไว้จะหายเงียบๆ
const serveUrl = await bundle({
  entryPoint: join(ROOT, "remotion", "index.ts"),
  publicDir,
});

const composition = await selectComposition({
  serveUrl,
  id: "Video",
  inputProps: shotList,
});

const outPath = join(videoDir, outputName);
console.log(`rendering → ${outPath}`);
await renderMedia({
  composition,
  serveUrl,
  codec: "h264",
  outputLocation: outPath,
  inputProps: shotList,
});

console.log(`\n✅ วิดีโอเสร็จ: ${outPath}`);

// 3) แยกไฟล์เสียงพากย์ล้วน (ไม่มี SFX ปน) ออกมาเป็นแทร็กเดียว sync ตรงกับ timeline ของวิดีโอสุดท้าย —
// ตั้งค่าถาวรของ pipeline (2026-08-31) ทำทุกครั้งที่ render วิดีโอเต็ม ไว้เอาไปพากย์ภาษาอื่น/แก้ไขนอกไปป์ไลน์
const totalSec = shotList.scenes.reduce((s, sc) => s + effectiveDurationSec(sc), 0);
const narrationTrackPath = join(videoDir, "narration-track.mp3");
const narrationTrack = await exportNarrationTrack(
  shotList,
  join(publicDir, "audio"),
  narrationTrackPath,
  totalSec
);
if (narrationTrack) console.log(`✅ แยกเสียงพากย์เสร็จ → ${narrationTrack}`);

// 4) copy final.mp4 + narration-track.mp3 ไปโฟลเดอร์ Preview บน Windows staging ด้วยเสมอ (ตั้งค่าถาวร
// 2026-08-31 — ผู้ใช้เปิดดู/ใช้งานจาก File Explorer ตรงๆ ได้ ไม่ต้องผ่าน \\wsl.localhost\...)
// (บั๊กที่เจอจริง 2026-08-29: final.mp4 อยู่แค่ใน WSL output/ เท่านั้น ไม่เคย mirror มาที่
// AI VIdeo test/<set>/Preview/ ตามที่ตั้งใจไว้เดิม)
const previewDirRel = derivePreviewDir(shotList);
let previewPath = null;
let narrationPreviewPath = null;
if (previewDirRel) {
  const previewDir = join(WINDOWS_STAGING_ROOT, previewDirRel, "Preview");
  await mkdir(previewDir, { recursive: true });
  previewPath = join(previewDir, outputName);
  await cp(outPath, previewPath);
  console.log(`✅ copy พรีวิวไป Windows: ${previewPath}`);
  if (narrationTrack) {
    narrationPreviewPath = join(previewDir, "narration-track.mp3");
    await cp(narrationTrack, narrationPreviewPath);
    console.log(`✅ copy เสียงพากย์ไป Windows: ${narrationPreviewPath}`);
  }
} else {
  console.warn(
    "⚠️  ไม่ได้ mirror ไป Windows — เดา windows_preview_dir จาก source_image ไม่ได้ (โปรเจกต์นี้ใช้คลิปสำเร็จรูป) " +
      "ใส่ \"windows_preview_dir\" ใน shot list ตรงๆ แล้ว render ใหม่ ถ้าต้องการให้ mirror"
  );
}

await logEvent("pipeline", `render วิดีโอสุดท้าย (${shotList.video_id})`, {
  video_id: shotList.video_id,
  scenes: shotList.scenes.length,
  total_duration_sec: shotList.total_duration_sec,
  narrationTrack,
  narrationPreviewPath,
  output: outPath,
  previewPath,
});
