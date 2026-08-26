// อัปสเกลวิดีโอเป็น 1080p — แก้ความคมชัดของ Kling Standard tier (ที่ render มาแค่ 720p)
//
// มี 2 โหมด (ตั้งที่ UPSCALE_MODE ใน .env หรือ scene.upscale_mode ในชอตลิสต์):
//   local = ffmpeg lanczos + unsharp ในเครื่อง — ฟรี, ~2 วิ/คลิป
//   api   = Bytedance Upscaler ผ่าน fal.ai — $0.0072/วิ, ~2-3 นาที/คลิป, คมกว่าเล็กน้อย
//
// วิธีใช้: node scripts/upscale-video.mjs <inputPath> <outputPath> [local|api]
import { fal } from "@fal-ai/client";
import { readFile, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { resolve, join } from "node:path";
import { homedir } from "node:os";
import {
  requireEnv,
  FAL_UPSCALE_MODEL,
  UPSCALE_MODE,
  UPSCALE_LOCAL_FILTER,
} from "./config.mjs";

const execFileAsync = promisify(execFile);
const FFMPEG = join(homedir(), ".local/bin/ffmpeg");

// อัปสเกลในเครื่องด้วย ffmpeg — ไม่เสียค่า API
// filter รับ override ได้ (default = UPSCALE_LOCAL_FILTER เดิม สำหรับ flow Kling 720→1080)
async function upscaleLocal(inputPath, outputPath, filter = UPSCALE_LOCAL_FILTER) {
  console.log("อัปสเกลในเครื่อง (ffmpeg lanczos + unsharp)...");
  await execFileAsync(FFMPEG, [
    "-y", "-nostdin", "-loglevel", "error",
    "-i", inputPath,
    "-vf", filter,
    "-c:v", "libx264", "-crf", "18", "-pix_fmt", "yuv420p",
    "-c:a", "copy",
    outputPath,
  ]);
  return outputPath;
}

// อัปสเกลผ่าน fal.ai — คมกว่าเพราะ AI เดารายละเอียดกลับมาได้ แต่เสียเงินและช้ากว่า
// scaleRatio override target_resolution ได้ (เช่น 1.5 = 480p→720p) — ราคาที่ยืนยันแล้ว
// ($0.0072/วิ) เป็นของ target 1080p เท่านั้น ที่ scale_ratio อื่นราคาจริงยังไม่ได้ยืนยันจาก dashboard
async function upscaleApi(inputPath, outputPath, { scaleRatio } = {}) {
  fal.config({ credentials: requireEnv("FAL_KEY") });
  const buf = await readFile(inputPath);
  console.log(`อัปโหลดวิดีโอ: ${inputPath}`);
  const videoUrl = await fal.storage.upload(new Blob([buf], { type: "video/mp4" }));

  console.log(`ส่งเข้า Bytedance Upscaler${scaleRatio ? ` (scale_ratio=${scaleRatio})` : ""}...`);
  const result = await fal.subscribe(FAL_UPSCALE_MODEL, {
    input: {
      video_url: videoUrl,
      ...(scaleRatio ? { scale_ratio: scaleRatio } : {}),
    },
    logs: true,
    onQueueUpdate: (u) => {
      if (u.status === "IN_PROGRESS") process.stdout.write(".");
    },
  });

  const outUrl = result?.data?.video?.url;
  if (!outUrl) throw new Error("ไม่พบ video url ในผลลัพธ์ upscale");

  const res = await fetch(outUrl);
  await writeFile(outputPath, Buffer.from(await res.arrayBuffer()));
  return outputPath;
}

// opts.filter = override ตัว ffmpeg filter (โหมด local), opts.scaleRatio = override อัตราส่วน (โหมด api)
export async function upscaleVideo(inputPath, outputPath, mode = UPSCALE_MODE, opts = {}) {
  if (mode === "local") await upscaleLocal(inputPath, outputPath, opts.filter);
  else if (mode === "api") await upscaleApi(inputPath, outputPath, opts);
  else throw new Error(`โหมดอัปสเกลไม่ถูกต้อง: ${mode} (ใช้ได้: local | api)`);

  console.log(`\nเสร็จ → ${outputPath}`);
  return outputPath;
}

// --- CLI ---
if (import.meta.url === `file://${process.argv[1]}`) {
  const [inputPath, outputPath, mode] = process.argv.slice(2);
  if (!inputPath || !outputPath) {
    console.error("ใช้: node scripts/upscale-video.mjs <inputPath> <outputPath> [local|api]");
    process.exit(1);
  }
  await upscaleVideo(resolve(inputPath), resolve(outputPath), mode || UPSCALE_MODE);
}
