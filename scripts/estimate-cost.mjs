// ประมาณการต้นทุนเจนวิดีโอก่อนรันเต็มชุด (ตาม CLAUDE.md: แจ้งงบก่อนเสมอ)
// วิธีใช้: node scripts/estimate-cost.mjs shot-lists/<file>.json
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { PRICING, UPSCALE_MODE, FAL_KLING_MODEL, FAL_KLING_MODELS } from "./config.mjs";

const DEFAULT_MODEL_KEY = Object.keys(FAL_KLING_MODELS).find(
  (k) => FAL_KLING_MODELS[k] === FAL_KLING_MODEL
);

const file = process.argv[2];
if (!file) {
  console.error("ใช้: node scripts/estimate-cost.mjs shot-lists/<file>.json");
  process.exit(1);
}

const shotList = JSON.parse(await readFile(resolve(file), "utf8"));
const scenes = shotList.scenes ?? [];

// ไม่ระบุ model ในชอตลิสต์ = ใช้ default ของไปป์ไลน์ (FAL_KLING_MODEL) — resolve ผ่านตัวแปรเดียวกัน
// กับ gen-video.mjs เสมอ (ไม่ hardcode ชื่อ tier ตรงๆ) กันประมาณการหลุด sync ตอนสลับ default
const modelKeyFor = (scene) =>
  scene.model && PRICING.klingPerSecondUSDByModel[scene.model]
    ? scene.model
    : DEFAULT_MODEL_KEY;
const rateFor = (scene) => PRICING.klingPerSecondUSDByModel[modelKeyFor(scene)];
// คิดค่า upscale เฉพาะโหมด api เท่านั้น — โหมด local ใช้ ffmpeg ในเครื่อง ไม่มีค่าใช้จ่าย
const needsUpscale = (scene) => {
  const mode = scene.upscale_mode ?? UPSCALE_MODE;
  const enabled = scene.upscale ?? PRICING.tiersNeedingUpscale.includes(modelKeyFor(scene));
  return enabled && mode === "api";
};

const totalSec = scenes.reduce((s, sc) => s + (sc.duration_sec ?? 0), 0);
const klingCost = scenes.reduce((s, sc) => s + (sc.duration_sec ?? 0) * rateFor(sc), 0);
const upscaleCost = scenes.reduce(
  (s, sc) => s + (needsUpscale(sc) ? (sc.duration_sec ?? 0) * PRICING.upscalePerSecondUSD : 0),
  0
);
const base = klingCost + upscaleCost;
const withBuffer = base * (1 + PRICING.rerollBuffer);

console.log(`\nวิดีโอ: ${shotList.title ?? shotList.video_id ?? "(ไม่ระบุ)"}`);
console.log(`จำนวน scene: ${scenes.length}`);
console.log(`ความยาวรวม: ${totalSec} วินาที`);
for (const sc of scenes) {
  const key = modelKeyFor(sc);
  const up = needsUpscale(sc) ? " + upscale(api)" : "";
  console.log(`  scene ${sc.scene}: ${sc.duration_sec}วิ × $${rateFor(sc)}/วิ (${key}${up})`);
}
console.log(`\nโหมดอัปสเกล: ${UPSCALE_MODE}${UPSCALE_MODE === "local" ? " (ฟรี)" : ""}`);
console.log(`\nbuffer reroll: ${PRICING.rerollBuffer * 100}%`);
console.log("-".repeat(40));
console.log(`ค่า Kling:                  $${klingCost.toFixed(3)}`);
if (upscaleCost > 0) console.log(`ค่า upscale:                $${upscaleCost.toFixed(3)}`);
console.log(`ต้นทุนวิดีโอ (base):        $${base.toFixed(3)}`);
console.log(`รวม buffer reroll:          $${withBuffer.toFixed(3)}`);
console.log(
  "\nหมายเหตุ: ยังไม่รวมค่า ElevenLabs (คิดตามโควตาแผน Creator ไม่ใช่ต่อวินาที)\n"
);
