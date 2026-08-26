// เจนคลิปวิดีโอต่อ scene ด้วย Kling image-to-video ผ่าน fal.ai
// วิธีใช้:
//   node scripts/gen-video.mjs shot-lists/<file>.json           (ทุก scene)
//   node scripts/gen-video.mjs shot-lists/<file>.json 2         (เฉพาะ scene 2 — ใช้ตอน reroll)
import { fal } from "@fal-ai/client";
import { readFile, mkdir, writeFile, rm } from "node:fs/promises";
import { resolve, join } from "node:path";
import {
  DIRS,
  FAL_KLING_MODEL,
  FAL_KLING_MODELS,
  UPSCALE_MODE,
  requireEnv,
} from "./config.mjs";
import { upscaleVideo } from "./upscale-video.mjs";
import { logEvent } from "./log.mjs";

// tier ที่ render ต่ำกว่า 1080p (720p) — auto-upscale ให้เป็น 1080p จริงหลังเจนเสร็จ ถ้าเลือกใช้ tier นี้
// หมายเหตุ: Standard ราคาเท่า Pro เป๊ะ (ยืนยันจาก fal.ai dashboard 2026-08-25) จึงไม่ใช่ default
// อีกต่อไป — ใช้ Pro เป็นค่าเริ่มต้นแทน (ราคาเท่ากันแต่ได้ 1080p native ไม่ต้อง upscale)
const TIERS_NEEDING_UPSCALE = new Set(["kling-3.0-standard"]);

fal.config({ credentials: requireEnv("FAL_KEY") });

// อัปโหลดภาพต้นทางขึ้น fal storage แล้วคืน URL
async function uploadSource(sourceImage) {
  const path = resolve(DIRS.assets, sourceImage);
  const buf = await readFile(path);
  const ext = sourceImage.split(".").pop()?.toLowerCase() ?? "png";
  const type = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : `image/${ext}`;
  return fal.storage.upload(new Blob([buf], { type }));
}

// เจน 1 scene → ดาวน์โหลด mp4 ลง output/<video_id>/clips/scene-N.mp4
export async function generateScene(videoId, scene) {
  const clipsDir = join(DIRS.output, videoId, "clips");
  await mkdir(clipsDir, { recursive: true });

  // reveal format รองรับ start + end image (fallback source_image สำหรับ shot list แบบเดิม)
  const startImg = scene.start_image ?? scene.source_image;
  console.log(`[scene ${scene.scene}] อัปโหลด start: ${startImg}`);
  const startUrl = await uploadSource(startImg);
  let endUrl = null;
  if (scene.end_image) {
    console.log(`[scene ${scene.scene}] อัปโหลด end: ${scene.end_image}`);
    endUrl = await uploadSource(scene.end_image);
  }

  // resolve เป็น key เสมอ (ไม่ใช่แค่ endpoint) เพื่อให้เช็ค auto-upscale ถูกต้องแม้ scene ไม่ระบุ model
  // fallback = key ที่ตรงกับ FAL_KLING_MODEL ปัจจุบัน (ไม่ hardcode ชื่อ tier ตรงๆ กันหลุด sync ตอนเปลี่ยน default)
  const defaultModelKey = Object.keys(FAL_KLING_MODELS).find(
    (k) => FAL_KLING_MODELS[k] === FAL_KLING_MODEL
  );
  const modelKey = scene.model && FAL_KLING_MODELS[scene.model] ? scene.model : defaultModelKey;
  const modelEndpoint = FAL_KLING_MODELS[modelKey] ?? FAL_KLING_MODEL;
  console.log(`[scene ${scene.scene}] ส่งเข้า ${modelEndpoint} (${scene.duration_sec}s)...`);
  // Kling v3 schema: start_image_url (+ end_image_url interpolate), duration (3-15s),
  // generate_audio=false (เสียงแยกที่ ElevenLabs), ไม่มี aspect_ratio (ยึดตามภาพต้นทาง)
  const result = await fal.subscribe(modelEndpoint, {
    input: {
      start_image_url: startUrl,
      ...(endUrl ? { end_image_url: endUrl } : {}),
      prompt: scene.motion_prompt,
      duration: String(scene.duration_sec),
      generate_audio: false,
      negative_prompt:
        scene.negative_prompt ??
        "static, frozen, still photograph, motionless, no movement, distorted, morphing artifacts, low quality",
      ...(scene.cfg_scale != null ? { cfg_scale: scene.cfg_scale } : {}),
    },
    logs: true,
    onQueueUpdate: (u) => {
      if (u.status === "IN_PROGRESS") process.stdout.write(".");
    },
  });

  const videoUrl = result?.data?.video?.url;
  if (!videoUrl) throw new Error(`ไม่พบ video url ในผลลัพธ์ scene ${scene.scene}`);

  const res = await fetch(videoUrl);
  const outPath = join(clipsDir, `scene-${scene.scene}.mp4`);

  // scene.upscale_mode override ได้รายฉาก; "none" = ข้ามอัปสเกล (เก็บ 720p ตามที่เจนมา)
  const mode = scene.upscale_mode ?? UPSCALE_MODE;
  const needsUpscale =
    (scene.upscale ?? TIERS_NEEDING_UPSCALE.has(modelKey)) && mode !== "none";

  if (needsUpscale) {
    const rawPath = join(clipsDir, `scene-${scene.scene}.raw.mp4`);
    await writeFile(rawPath, Buffer.from(await res.arrayBuffer()));
    console.log(`\n[scene ${scene.scene}] อัปสเกลเป็น 1080p (โหมด: ${mode})...`);
    await upscaleVideo(rawPath, outPath, mode);
    await rm(rawPath, { force: true });
  } else {
    await writeFile(outPath, Buffer.from(await res.arrayBuffer()));
  }

  console.log(`\n[scene ${scene.scene}] เสร็จ → ${outPath}`);
  await logEvent("pipeline", `เจนวิดีโอ scene ${scene.scene} (${videoId})`, {
    video_id: videoId,
    scene: scene.scene,
    model: modelEndpoint,
    duration_sec: scene.duration_sec,
    motion_prompt: scene.motion_prompt,
    upscaled: needsUpscale,
  });
  return outPath;
}

// --- CLI ---
if (import.meta.url === `file://${process.argv[1]}`) {
  const file = process.argv[2];
  const onlyScene = process.argv[3] ? Number(process.argv[3]) : null;
  if (!file) {
    console.error("ใช้: node scripts/gen-video.mjs shot-lists/<file>.json [sceneNumber]");
    process.exit(1);
  }
  const shotList = JSON.parse(await readFile(resolve(file), "utf8"));
  const scenes = onlyScene
    ? shotList.scenes.filter((s) => s.scene === onlyScene)
    : shotList.scenes;

  for (const scene of scenes) {
    await generateScene(shotList.video_id, scene);
  }
  console.log(
    `\n✅ เจนวิดีโอครบ ${scenes.length} scene — หยุดรอ approve ก่อนขั้น Remotion (ดู CLAUDE.md)`
  );
}
