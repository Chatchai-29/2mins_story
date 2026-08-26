// เจนคลิปวิดีโอต่อ scene ด้วย EvoLink (Seedance image-to-video) — สำหรับนิช mass-produce
// ที่ไม่ต้องการความสวย/สมจริงมาก แค่ให้ตัวหลัก/องค์ประกอบขยับบ้าง ต้นทุนต่ำสุด
//
// ล็อกไว้เฉพาะ 3 โมเดลถูกที่สุด (ดู EVOLINK_MODELS ใน config.mjs) และ quality=480p เสมอ
// กันเผลอยิงโมเดลแพงบน EvoLink โดยไม่ตั้งใจ — ถ้าอยากได้ resolution/โมเดลอื่นต้องแก้ config.mjs ตรงๆ
//
// วิธีใช้:
//   node scripts/gen-video-evolink.mjs shot-lists/<file>.json                (ทุก scene, โมเดล default)
//   node scripts/gen-video-evolink.mjs shot-lists/<file>.json 2              (เฉพาะ scene 2)
//   node scripts/gen-video-evolink.mjs shot-lists/<file>.json 2 seedance-2.0-fast   (ระบุโมเดล)
import { readFile, mkdir, writeFile, rm } from "node:fs/promises";
import { resolve, join } from "node:path";
import {
  DIRS,
  WINDOWS_STAGING_ROOT,
  EVOLINK_BASE_URL,
  EVOLINK_FILES_URL,
  EVOLINK_MODELS,
  EVOLINK_MODEL_KEY,
  EVOLINK_QUALITY,
  EVOLINK_UPSCALE_LOCAL_FILTER,
  EVOLINK_UPSCALE_SCALE_RATIO,
  UPSCALE_MODE,
  requireEnv,
} from "./config.mjs";
import { upscaleVideo } from "./upscale-video.mjs";

const POLL_INTERVAL_MS = 4000;
const POLL_TIMEOUT_MS = 10 * 60 * 1000; // 10 นาที กันค้างไม่รู้จบ

export function authHeaders(apiKey, extra = {}) {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

// resolve modelKey → { id, pricePerSecUSD } พร้อม guard ป้องกันโมเดลนอก allowlist
// ไม่ระบุ modelKey เลย = fallback ไปโมเดล default เงียบๆ (พฤติกรรมที่ตั้งใจ)
// แต่ถ้าระบุมาแล้วไม่ตรง allowlist ต้อง throw ทันที ห้าม fallback เงียบๆ เด็ดขาด
// (ไม่งั้นพิมพ์ชื่อโมเดลผิด/หลุดชื่อโมเดลแพงเข้ามาจะไม่มีทางรู้ตัว)
function resolveModel(modelKey) {
  if (modelKey == null) return { key: EVOLINK_MODEL_KEY, ...EVOLINK_MODELS[EVOLINK_MODEL_KEY] };
  const model = EVOLINK_MODELS[modelKey];
  if (!model) {
    throw new Error(
      `โมเดล "${modelKey}" ไม่อยู่ใน allowlist ที่อนุญาต (${Object.keys(EVOLINK_MODELS).join(", ")}) — แก้ EVOLINK_MODELS ใน config.mjs ถ้าต้องการเพิ่ม`
    );
  }
  return { key: modelKey, ...model };
}

// อัปโหลดภาพต้นทาง (base64) ขึ้น EvoLink files API แล้วคืน file_url
// (export ไว้ให้สคริปต์เทียบโมเดลอื่น เช่น Kling ผ่าน EvoLink ใช้ร่วมกันได้ — logic ไม่ผูกกับ Seedance)
//
// บั๊กที่เจอจริง (2026-08-26): EvoLink files API เก็บไฟล์โดยใช้แค่ "basename" ของ file_name เป็น key
// (ตัด path ทิ้งหมด) ถ้าอัปโหลดชื่อ "Image 01.png" ซ้ำกับที่เคยอัปโหลดไว้ก่อนหน้า (จากคนละโปรเจกต์ก็ตาม
// เพราะทุก shot list ตั้งชื่อภาพว่า "Image 01.png".."Image 10.png" เหมือนกันหมด) มันจะคืน file_url ของ
// ไฟล์เก่าที่แคชไว้กลับมาเงียบๆ โดยไม่อัปเดตเป็นเนื้อหาใหม่เลย (ยืนยันแล้วด้วยการโหลด URL ที่ได้กลับมา
// เทียบ md5 กับภาพต้นทางจริง) — แก้โดยบังคับให้ file_name ที่ส่งไป unique เสมอ (ผูกกับ video_id + scene +
// timestamp) ไม่ใช้ basename ของภาพตรงๆ
export async function uploadSourceEvoLink(apiKey, sourceImage, uniqueFileName) {
  const path = resolve(DIRS.assets, sourceImage);
  const buf = await readFile(path);
  const ext = sourceImage.split(".").pop()?.toLowerCase() ?? "png";
  const mime = ext === "jpg" ? "jpeg" : ext;
  const base64Data = `data:image/${mime};base64,${buf.toString("base64")}`;
  const fileName = uniqueFileName ?? `${Date.now()}-${sourceImage.split("/").pop()}`;

  const res = await fetch(EVOLINK_FILES_URL, {
    method: "POST",
    headers: authHeaders(apiKey),
    body: JSON.stringify({ base64_data: base64Data, file_name: fileName }),
  });
  const json = await res.json();
  if (!res.ok || !json?.data?.file_url) {
    throw new Error(`EvoLink upload ล้มเหลว: ${json?.msg ?? res.statusText}`);
  }
  return json.data.file_url;
}

// ส่ง task เจนวิดีโอ (image-to-video) → คืน task id
async function submitTask(apiKey, { imageUrl, prompt, durationSec, modelId }) {
  const res = await fetch(`${EVOLINK_BASE_URL}/v1/videos/generations`, {
    method: "POST",
    headers: authHeaders(apiKey),
    body: JSON.stringify({
      model: modelId,
      prompt,
      image_urls: [imageUrl],
      duration: durationSec,
      quality: EVOLINK_QUALITY, // ล็อกไว้ที่ 480p เสมอ — ไม่รับ override จากภายนอก
      aspect_ratio: "9:16",
      generate_audio: false,
    }),
  });
  const json = await res.json();
  if (!res.ok || !json?.id) {
    throw new Error(`EvoLink submit ล้มเหลว: ${json?.error?.message ?? json?.msg ?? res.statusText}`);
  }
  return json.id;
}

// poll task จนกว่าจะ completed/failed → คืน video url (export เหตุผลเดียวกับ uploadSourceEvoLink)
export async function pollTask(apiKey, taskId) {
  const start = Date.now();
  while (Date.now() - start < POLL_TIMEOUT_MS) {
    const res = await fetch(`${EVOLINK_BASE_URL}/v1/tasks/${taskId}`, {
      headers: authHeaders(apiKey),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(`EvoLink poll ล้มเหลว: ${json?.error?.message ?? res.statusText}`);

    if (json.status === "completed") {
      const url = json.results?.[0];
      if (!url) throw new Error(`task ${taskId} completed แต่ไม่มี result url`);
      return url;
    }
    if (json.status === "failed") {
      throw new Error(`task ${taskId} ล้มเหลว: ${json.error?.message ?? "ไม่ทราบสาเหตุ"}`);
    }
    process.stdout.write(".");
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
  throw new Error(`task ${taskId} รอเกิน ${POLL_TIMEOUT_MS / 1000}s — timeout`);
}

// เจน 1 scene → ดาวน์โหลด mp4
// ปกติลง output/<video_id>/clips/scene-N.mp4 (คลิปที่ approve แล้วรอ Remotion)
// แต่ถ้าส่ง opts.previewSet มา จะลง <WINDOWS_STAGING_ROOT>/<previewSet>/Preview/<previewName ?? "scene-N">.mp4
// แทน (คลิปทดสอบ/เทียบโมเดล ยังไม่ approve — โฟลเดอร์เดียวกับที่เก็บภาพต้นทางของ set นั้นบน Windows
// เพื่อให้เปิดดูใน File Explorer ง่าย — สร้างโฟลเดอร์ Preview ให้อัตโนมัติถ้ายังไม่มี)
export async function generateSceneEvoLink(videoId, scene, modelKey, opts = {}) {
  const apiKey = requireEnv("EVOLINK_API_KEY");
  const model = resolveModel(modelKey);
  const durationSec = scene.duration_sec ?? 5;
  const estCost = durationSec * model.pricePerSecUSD;

  console.log(
    `[scene ${scene.scene}] EvoLink/${model.key} (${model.id}) @ ${EVOLINK_QUALITY}, ${durationSec}s — ประมาณ $${estCost.toFixed(3)}`
  );

  const clipsDir = opts.previewSet
    ? join(WINDOWS_STAGING_ROOT, opts.previewSet, "Preview")
    : join(DIRS.output, videoId, "clips");
  await mkdir(clipsDir, { recursive: true });

  const startImg = scene.start_image ?? scene.source_image;
  console.log(`[scene ${scene.scene}] อัปโหลด: ${startImg}`);
  const ext = startImg.split(".").pop()?.toLowerCase() ?? "png";
  const uniqueFileName = `${videoId}-scene-${scene.scene}-${Date.now()}.${ext}`;
  const imageUrl = await uploadSourceEvoLink(apiKey, startImg, uniqueFileName);

  const taskId = await submitTask(apiKey, {
    imageUrl,
    prompt: scene.motion_prompt,
    durationSec,
    modelId: model.id,
  });
  console.log(`[scene ${scene.scene}] task ${taskId} ส่งแล้ว รอผล`);

  const videoUrl = await pollTask(apiKey, taskId);
  const res = await fetch(videoUrl);
  const fileBase = opts.previewName ?? `scene-${scene.scene}`;
  const outPath = join(clipsDir, `${fileBase}.mp4`);

  // อัปสเกล 480p → 720p เป็นค่าเริ่มต้นเสมอ (ต้นทาง EvoLink ได้แค่ 480p) — override เป็น "none"
  // รายฉากได้ผ่าน scene.upscale_mode ถ้าอยากเก็บ 480p ดิบไว้ (เช่น ทดสอบ motion เร็วๆ)
  const mode = scene.upscale_mode ?? UPSCALE_MODE;
  if (mode !== "none") {
    const rawPath = join(clipsDir, `${fileBase}.raw.mp4`);
    await writeFile(rawPath, Buffer.from(await res.arrayBuffer()));
    console.log(`\n[scene ${scene.scene}] อัปสเกลเป็น 720p (โหมด: ${mode})...`);
    await upscaleVideo(rawPath, outPath, mode, {
      filter: EVOLINK_UPSCALE_LOCAL_FILTER,
      scaleRatio: EVOLINK_UPSCALE_SCALE_RATIO,
    });
    await rm(rawPath, { force: true });
  } else {
    await writeFile(outPath, Buffer.from(await res.arrayBuffer()));
  }

  console.log(`\n[scene ${scene.scene}] เสร็จ → ${outPath}`);
  return outPath;
}

// --- CLI ---
if (import.meta.url === `file://${process.argv[1]}`) {
  const file = process.argv[2];
  const onlyScene = process.argv[3] ? Number(process.argv[3]) : null;
  const modelKey = process.argv[4];
  if (!file) {
    console.error(
      "ใช้: node scripts/gen-video-evolink.mjs shot-lists/<file>.json [sceneNumber] [modelKey]"
    );
    console.error(`โมเดลที่อนุญาต: ${Object.keys(EVOLINK_MODELS).join(", ")}`);
    process.exit(1);
  }
  const shotList = JSON.parse(await readFile(resolve(file), "utf8"));
  let scenes = onlyScene
    ? shotList.scenes.filter((s) => s.scene === onlyScene)
    : shotList.scenes;

  // scene ที่มี reuse_video_of (เช่น climax ที่นำคลิปเดิมมาใส่ effect) ไม่ต้องเจนวิดีโอใหม่ — ข้ามไปเลย
  const reused = scenes.filter((s) => s.reuse_video_of);
  if (reused.length) {
    console.log(
      `ข้าม scene ${reused.map((s) => s.scene).join(", ")} — reuse_video_of ตั้งไว้ (ใช้ effect ใน Remotion แทนการเจนใหม่)`
    );
    scenes = scenes.filter((s) => !s.reuse_video_of);
  }

  const model = resolveModel(modelKey);
  const totalSec = scenes.reduce((s, sc) => s + (sc.duration_sec ?? 5), 0);
  console.log(
    `\nโมเดล: ${model.key} (${model.id}) @ ${EVOLINK_QUALITY} — ประมาณรวม $${(totalSec * model.pricePerSecUSD).toFixed(3)} สำหรับ ${scenes.length} scene (${totalSec}s)\n`
  );

  for (const scene of scenes) {
    await generateSceneEvoLink(shotList.video_id, scene, modelKey);
  }
  console.log(`\n✅ เจนวิดีโอครบ ${scenes.length} scene ผ่าน EvoLink`);
}
