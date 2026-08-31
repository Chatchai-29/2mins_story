// ค่าคงที่และตัวโหลด env ที่ทุกสคริปต์ใช้ร่วมกัน
import "dotenv/config";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const ROOT = resolve(__dirname, "..");

export const DIRS = {
  assets: resolve(ROOT, "assets"),
  shotLists: resolve(ROOT, "shot-lists"),
  output: resolve(ROOT, "output"),
};

// โฟลเดอร์ local ของ public repo (github.com/Chatchai-29/2mins_story) ที่ scripts/log.mjs
// sync + commit + push production-log.jsonl เข้าไปอัตโนมัติทุกครั้งที่มี entry ใหม่ — เพื่อให้ log
// มี timestamp จากบุคคลที่สาม (GitHub server) เป็นหลักฐาน ไม่ใช่แค่ timestamp ในเครื่องตัวเอง
export const PRODUCTION_LOG_REPO_DIR =
  process.env.PRODUCTION_LOG_REPO_DIR?.trim() ||
  "/mnt/c/Users/chatc/Downloads/Ai Video/2mins_story";

// พื้นที่ staging บน Windows ที่ผู้ใช้เก็บภาพต้นทาง/พรีวิวของนิชใหม่ๆ ที่ยังไม่เข้าไปป์ไลน์
// เต็มรูปแบบ (ต่างจาก DIRS.assets ที่เป็น WSL native filesystem) — เข้าถึงผ่าน /mnt/c ได้เพราะเป็น
// การเขียนไฟล์ผลลัพธ์ทีละไฟล์ (สำหรับคนดู) ไม่ใช่การอ่านภาพต้นทางจำนวนมากซ้ำๆ ที่จะช้า
// คลิปพรีวิวของแต่ละ "set"/นิช (เช่น "Horror story") จะไปอยู่ที่ <WINDOWS_STAGING_ROOT>/<set>/Preview/
export const WINDOWS_STAGING_ROOT =
  "/mnt/c/Users/chatc/Downloads/Ai Video/AI VIdeo test";

// --- โมเดล / provider ---
// หมายเหตุ (2026-08-29): ถอด Kling/fal.ai video-gen ออกจากไปป์ไลน์แล้ว — ใช้ EvoLink/Seedance
// เป็นตัวเจนวิดีโอหลักตัวเดียวเท่านั้น (ดู scripts/gen-video-evolink.mjs) fal.ai ที่เหลืออยู่ในโปรเจกต์
// นี้คือ Bytedance Upscaler เท่านั้น (ตัวเลือก UPSCALE_MODE=api ด้านล่าง) — ไม่เกี่ยวกับ Kling

// อัปสเกลวิดีโอ (Bytedance Upscaler ผ่าน fal.ai) — ตัวเลือกเสริมเวลาอยากได้คมกว่า local
export const FAL_UPSCALE_MODEL = "fal-ai/bytedance-upscaler/upscale/video";

// --- EvoLink (unified AI API gateway) — นิช mass-produce ที่ไม่ต้องการความสวย/สมจริงมาก ---
// ยืนยันราคาจากตาราง EvoLink จริงที่ผู้ใช้ส่งมา (2026-08-26) — จำกัด allowlist ไว้แค่ 3 โมเดล
// ถูกที่สุดเท่านั้น กันเผลอยิงโมเดลแพงบน EvoLink (Kling/Veo/Sora/Wan ฯลฯ เข้าถึงได้ผ่าน gateway
// เดียวกัน แต่ตั้งใจไม่เปิดให้ใช้ในสคริปต์นี้) จะปลดล็อกโมเดลอื่นต้องแก้ allowlist นี้ตรงๆ เท่านั้น
export const EVOLINK_BASE_URL = "https://api.evolink.ai";
export const EVOLINK_FILES_URL = "https://files-api.evolink.ai/api/v1/files/upload/base64";

// ราคายืนยันจากตาราง EvoLink @480p (seedance-2.0-fast/mini คิดรวม input+output sec,
// seedance-1.0-pro-fast คิดแค่ output sec) — ดู scripts/gen-video-evolink.mjs สำหรับวิธีใช้
export const EVOLINK_MODELS = {
  "seedance-1.0-pro-fast": {
    id: "doubao-seedance-1.0-pro-fast",
    pricePerSecUSD: 0.006,
  },
  "seedance-2.0-mini": {
    id: "seedance-2.0-mini-image-to-video",
    pricePerSecUSD: 0.012,
  },
  "seedance-2.0-fast": {
    id: "seedance-2.0-fast-image-to-video",
    pricePerSecUSD: 0.034,
  },
};
export const EVOLINK_MODEL_KEY = "seedance-1.0-pro-fast"; // default = ถูกสุดในตาราง
// ล็อกไว้ที่ 480p เท่านั้น (resolution ที่ราคายืนยันแล้วในตาราง) — ห้ามขยับสูงกว่านี้ในโค้ด
// โดยไม่เช็คราคาจริงที่ resolution นั้นก่อน เพราะราคาต่อวินาทีของ EvoLink ผูกกับ resolution
export const EVOLINK_QUALITY = "480p";

// --- EvoLink · เจนภาพต้นทาง (เพิ่ม 2026-08-29) — ทางเลือกแทน SeaArt manual สำหรับตอนไม่มีภาพเตรียมไว้ล่วงหน้า ---
// ยืนยัน endpoint/model id จาก docs.evolink.ai จริง (Nano Banana 2 = Gemini 3.1 Flash Image ผ่าน gateway
// เดียวกับวิดีโอ) ล็อกไว้แค่โมเดลเดียวที่ยืนยัน endpoint แล้วก่อน — โมเดลอื่นในแคตตาล็อก (Midjourney,
// Seedream, Z Image Turbo ฯลฯ) ยังไม่เปิดใช้เพราะยังไม่ได้ยืนยัน request shape ตรงๆ จาก docs
export const EVOLINK_IMAGE_MODELS = {
  "nano-banana-2": {
    id: "gemini-3.1-flash-image-preview",
    pricePerImageUSD: 0.036, // ราคา "จาก" ที่ evolink.ai/models — ที่ quality "1K" ต่ำสุด
    supportsQuality: true,
  },
  // ยืนยัน request shape จาก docs.evolink.ai จริง 2026-08-29 — ไม่มีฟิลด์ quality ใน schema เลย
  "z-image-turbo": {
    id: "z-image-turbo",
    pricePerImageUSD: 0.0039,
    supportsQuality: false,
  },
  "krea-2-turbo": {
    id: "krea-2-turbo",
    pricePerImageUSD: 0.0067,
    supportsQuality: true, // 1K/2K, default 1K
  },
};
// default (อัปเดต 2026-08-29: เปลี่ยนจาก nano-banana-2 → krea-2-turbo — ทดสอบเทียบกับ z-image-turbo
// ด้วยพรอมต์เดียวกันแล้ว คุม 4 การ์ดตรงตามพรอมต์ดีกว่าชัดเจน ถูกกว่า nano-banana-2 ~5 เท่า)
export const EVOLINK_IMAGE_MODEL_KEY = "krea-2-turbo";
export const EVOLINK_IMAGE_DEFAULT_QUALITY = "1K"; // ตัวเลือก: 0.5K/1K/2K/4K — ยิ่งสูงยิ่งแพง

// --- EvoLink · tier คุณภาพ (Kling ผ่าน EvoLink แทน fal.ai — 2026-08-29) ---
// ใช้เฉพาะนิชที่ต้องการรายละเอียด/ความสม่ำเสมอของตัวละครสูง เช่น มาสคอต (Bobo/Sparx)
// แพงกว่า allowlist มวลผลิตด้านบนเยอะ (>10 เท่า) จึงแยก allowlist ต่างหากเจตนา — ต้อง
// ระบุ "model" ในชอตลิสต์ตรงกับ key ในนี้เท่านั้นถึงจะ route มาใช้ tier นี้ (ดู gen-video-evolink-kling.mjs)
export const EVOLINK_KLING_MODELS = {
  "kling-v3": {
    id: "kling-v3-image-to-video",
    pricePerSecUSD: 0.08, // ยืนยันจากตาราง EvoLink ที่ผู้ใช้ส่งมา @720p, sound off
    quality: "720p",
  },
};
export const EVOLINK_KLING_MODEL_KEY = "kling-v3"; // default ของ tier นี้ (ยังมีโมเดลเดียว)

// อัปสเกล EvoLink 480p → 720p (ใช้ UPSCALE_MODE เดียวกันผ่าน .env)
//   local: scale ตามความกว้าง 720 แล้วคำนวณความสูงเอง (-2) เพราะไม่ยึดว่า EvoLink คืนพิกเซล
//   ตรงเป๊ะเท่าไหร่ — ต่างจาก UPSCALE_LOCAL_FILTER เดิมที่ fix พิกัดตรงตัวเพราะรู้ขนาด Kling แน่นอน
//   api: scale_ratio 1.5 (480→720 พอดี ตัวเลขเดียวกับที่ Kling ใช้ 720→1080)
export const EVOLINK_UPSCALE_LOCAL_FILTER =
  "scale=720:-2:flags=lanczos,unsharp=5:5:1.2:5:5:0.0";
export const EVOLINK_UPSCALE_SCALE_RATIO = 1.5;

// --- โหมดอัปสเกล ---
//   "local" = ffmpeg lanczos + unsharp ในเครื่อง — ฟรี, ~2 วินาที/คลิป, คมน้อยกว่า API เล็กน้อย
//   "api"   = Bytedance Upscaler ผ่าน fal.ai — $0.0072/วิ, ~2-3 นาที/คลิป, คมที่สุด
//   "none"  = ไม่อัปสเกล (ได้ 720p ตามที่ Standard เจนมา)
// ตั้งค่าได้ที่ .env (UPSCALE_MODE=...) หรือ override รายฉากด้วย scene.upscale_mode
export const UPSCALE_MODE = process.env.UPSCALE_MODE?.trim() || "local";

// ฟิลเตอร์ของโหมด local — lanczos ขยาย แล้ว unsharp ดึงรายละเอียดกลับ
// (ทดสอบแล้วให้ผลใกล้ API มากที่สุดในบรรดาฟิลเตอร์ที่ลอง: cas ล้วนนุ่มเกินไป)
export const UPSCALE_LOCAL_FILTER =
  "scale=1080:1920:flags=lanczos,unsharp=5:5:1.2:5:5:0.0";

// ElevenLabs REST endpoints
export const ELEVEN = {
  music: "https://api.elevenlabs.io/v1/music",
  sfx: "https://api.elevenlabs.io/v1/sound-generation",
  // TTS พร้อม character-level timestamps — ใช้ทำคำบรรยาย (caption) ที่ sync กับเสียงพากย์เป๊ะ
  // โดยไม่ต้องพึ่ง speech-to-text แยกต่างหาก
  ttsBase: "https://api.elevenlabs.io/v1/text-to-speech",
  ttsModel: "eleven_multilingual_v2",
};

// เสียงพากย์เริ่มต้น (Adam — professional voice จาก Voice Lab ของผู้ใช้เอง, ตั้งเป็นพื้นฐานเริ่มต้น 2026-08-31)
// override ได้ผ่าน .env: ELEVENLABS_VOICE_ID=<voice id จาก elevenlabs.io/app/voice-library>
export const ELEVENLABS_VOICE_ID =
  process.env.ELEVENLABS_VOICE_ID?.trim() || "wBXNqKUATyqu0RtYt25i";

// --- ค่าเริ่มต้นของคอนเทนต์ (ตาม CLAUDE.md) ---
export const DEFAULTS = {
  aspectRatio: "9:16",
  resolution: "1080p",
  fps: 30,
};

// --- ราคา/งบ ---
// ยืนยันแล้ว (2026-08-25 รอบ 3): ผู้ใช้ส่ง screenshot คำขอเดียวกัน (scene เดียวกัน, duration
// เท่ากัน = 8 วิ) เทียบสอง tier บน fal.ai dashboard จริง — Standard cost $0.84, Pro cost $1.12
// หาร 8 วิ ได้ Standard = $0.105/วิ, Pro = $0.14/วิ พอดี (Standard ถูกกว่า Pro 25%)
export const PRICING = {
  // Bytedance Upscaler ยืนยันราคาไว้ที่ target 1080p (flow เดิมของ Kling 720→1080) เท่านั้น —
  // ที่ scale_ratio 480→720 ของ EvoLink ราคาจริงยังไม่ได้ยืนยันจาก dashboard ใช้ตัวเลขนี้เป็นค่าประมาณ
  upscalePerSecondUSD: 0.0072,
  rerollBuffer: 0.1, // กันงบ reroll เพิ่ม ~10% (motion ต่ำ)
};

// --- OpenAI — เจนหัวข้อ/สคริปต์ + พรอมต์รูป + เจนรูป (เพิ่ม 2026-08-29) ---
// ราคายืนยันจาก developers.openai.com/api/docs/pricing (เช็ค 2026-08-29) — เป็นราคาจากหน้าเอกสาร
// ทางการ ไม่ใช่ยืนยันจาก dashboard จริงแบบราคา Kling/fal.ai ด้านบน เผื่อ OpenAI ปรับราคาไปแล้วเช็คอีกที
export const OPENAI_TEXT_MODEL = "gpt-4o-mini";
// โมเดลตัวแพงกว่าสำหรับงานเขียนที่ต้องการความคิดสร้างสรรค์/รายละเอียดเฉพาะตัว (เช่นไอเดียคลิป Choice)
// mini มักออกมา generic เกินไปสำหรับงานแนวนี้ — ต้นทุนต่างกันน้อยมากเพราะข้อความสั้น จึงคุ้มใช้ตัวนี้
export const OPENAI_CREATIVE_TEXT_MODEL = "gpt-4o";
// gpt-image-1 เลิกให้บริการ 23 ต.ค. 2026 — ต้องเปลี่ยนเป็น gpt-image-1.5 (หรือรุ่นใหม่กว่า) ก่อนวันนั้น
export const OPENAI_IMAGE_MODEL = "gpt-image-1";
export const OPENAI_IMAGE_QUALITY = "medium"; // low/medium/high — medium คุ้มสุดสำหรับพรอมต์ทดสอบ
export const OPENAI_PRICING = {
  text: {
    "gpt-4o-mini": { inputPer1MUSD: 0.15, outputPer1MUSD: 0.6 },
    "gpt-4o": { inputPer1MUSD: 2.5, outputPer1MUSD: 10 },
  },
  imagePerImageUSD: { low: 0.011, medium: 0.042, high: 0.167 }, // 1024x1024/1536, gpt-image-1
};

// --- Cloudflare Workers AI · ทดสอบเทียบกับ EvoLink สำหรับเจนภาพต้นทาง (เพิ่ม 2026-08-30) ---
// REST API ตรงๆ ไม่ผ่าน Workers script binding — ต้องมี Account ID คู่กับ API Token
// (ต่างจาก EvoLink ที่ใช้แค่ key เดียว) หา Account ID + สร้าง token ได้ที่หน้า Workers AI ใน dashboard
// โควต้าฟรี 10,000 Neurons/วัน รีเซ็ตเที่ยงคืน UTC ยังไม่ยืนยันราคา Neurons/ภาพจริงจาก dashboard —
// ตอนนี้ยังเป็นแค่การทดสอบเทียบคุณภาพกับ EvoLink เท่านั้น ยังไม่ใช่ provider มาตรฐาน (ดู CLAUDE.md
// "Provider มาตรฐาน: EvoLink เท่านั้น" — ห้าม route มาใช้ตัวนี้แทน default โดยไม่ถามผู้ใช้ก่อน)
export const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID?.trim() || "";
export const CLOUDFLARE_BASE_URL = "https://api.cloudflare.com/client/v4/accounts";

// ยืนยัน input schema จาก developers.cloudflare.com/workers-ai/models/ จริง 2026-08-30:
//   flux-1-schnell — ไม่มี width/height ให้ตั้งเอง (fixed ~1024x1024), steps สูงสุด 8
//   sdxl           — ตั้ง width/height เองได้ (256-2048), num_steps สูงสุด 20
// รูปแบบ response ต่างกัน: flux คืน JSON {result:{image: base64}}, sdxl คืนไฟล์ PNG ดิบตรงๆ
export const CLOUDFLARE_IMAGE_MODELS = {
  "flux-1-schnell": {
    id: "@cf/black-forest-labs/flux-1-schnell",
    responseFormat: "json-base64",
    maxSteps: 8,
  },
  sdxl: {
    id: "@cf/stabilityai/stable-diffusion-xl-base-1.0",
    responseFormat: "binary",
    maxSteps: 20,
  },
};

// อัตราแลกเปลี่ยนโดยประมาณไว้โชว์ต้นทุนเป็น AUD คร่าวๆ (ผู้ใช้อยู่ออสเตรเลีย) — ไม่ใช่ค่าเรียลไทม์
// เช็ค rate จริงตอนจะตัดสินใจเรื่องงบจริงจัง
export const USD_TO_AUD_APPROX = 1.4;

// แปลงชื่อไอเดีย/หัวข้อให้ใช้เป็นชื่อโฟลเดอร์ได้ปลอดภัยทั้ง Windows และ WSL (ตัดอักขระต้องห้ามของ NTFS)
export function slugifyTitle(title) {
  return title.replace(/[<>:"/\\|?*]/g, "").trim();
}

// อ่าน env แบบบังคับ — throw ถ้าไม่มี (และไม่ print ค่าออกมาเด็ดขาด)
export function requireEnv(name) {
  const v = process.env[name];
  if (!v || !v.trim()) {
    throw new Error(
      `ขาด environment variable: ${name} — ตั้งค่าใน .env ก่อน (ดู .env.example)`
    );
  }
  return v;
}
