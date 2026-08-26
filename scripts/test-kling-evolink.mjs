// สคริปต์ทดสอบ Kling 3.0 image-to-video ผ่าน EvoLink (เทียบราคา/คุณภาพกับ fal.ai)
// ไม่ได้อยู่ใน allowlist ของ gen-video-evolink.mjs (นั่นล็อกไว้เฉพาะโมเดลถูกสำหรับ mass-produce)
// เพราะ Kling บน EvoLink แพงกว่าเยอะ ($0.08/วิ @720p) — ใช้สคริปต์แยกนี้เฉพาะตอนตั้งใจเทียบเท่านั้น
//
// วิธีใช้: node scripts/test-kling-evolink.mjs <sourceImage> <prompt> <outPath> [durationSec]
import { writeFile } from "node:fs/promises";
import {
  EVOLINK_BASE_URL,
  requireEnv,
} from "./config.mjs";
import { uploadSourceEvoLink, pollTask, authHeaders } from "./gen-video-evolink.mjs";

const KLING_PRICE_PER_SEC_USD = 0.08; // 720p, sound off — ยืนยันจากตาราง EvoLink ที่ผู้ใช้ส่งมา

async function submitKlingTask(apiKey, { imageUrl, prompt, durationSec }) {
  const res = await fetch(`${EVOLINK_BASE_URL}/v1/videos/generations`, {
    method: "POST",
    headers: authHeaders(apiKey),
    body: JSON.stringify({
      model: "kling-v3-image-to-video",
      image_start: imageUrl,
      prompt,
      duration: durationSec,
      quality: "720p", // ราคาฐาน — ไม่ขอ 1080p/4k เพื่อคุมต้นทุน
      sound: "off",
    }),
  });
  const json = await res.json();
  if (!res.ok || !json?.id) {
    throw new Error(`EvoLink Kling submit ล้มเหลว: ${json?.error?.message ?? json?.msg ?? res.statusText}`);
  }
  return json.id;
}

const [sourceImage, prompt, outPath, durationArg] = process.argv.slice(2);
if (!sourceImage || !prompt || !outPath) {
  console.error(
    "ใช้: node scripts/test-kling-evolink.mjs <sourceImage> <prompt> <outPath> [durationSec]"
  );
  process.exit(1);
}
const durationSec = durationArg ? Number(durationArg) : 5;
const apiKey = requireEnv("EVOLINK_API_KEY");
const estCost = durationSec * KLING_PRICE_PER_SEC_USD;

console.log(`Kling 3.0 (EvoLink) @ 720p, ${durationSec}s — ประมาณ $${estCost.toFixed(3)}`);
console.log(`อัปโหลด: ${sourceImage}`);
const imageUrl = await uploadSourceEvoLink(apiKey, sourceImage);

const taskId = await submitKlingTask(apiKey, { imageUrl, prompt, durationSec });
console.log(`task ${taskId} ส่งแล้ว รอผล`);

const videoUrl = await pollTask(apiKey, taskId);
const res = await fetch(videoUrl);
await writeFile(outPath, Buffer.from(await res.arrayBuffer()));

console.log(`\nเสร็จ → ${outPath}`);
