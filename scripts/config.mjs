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

// พื้นที่ staging บน Windows ที่ผู้ใช้เก็บภาพต้นทาง/พรีวิวของนิชใหม่ๆ ที่ยังไม่เข้าไปป์ไลน์
// เต็มรูปแบบ (ต่างจาก DIRS.assets ที่เป็น WSL native filesystem) — เข้าถึงผ่าน /mnt/c ได้เพราะเป็น
// การเขียนไฟล์ผลลัพธ์ทีละไฟล์ (สำหรับคนดู) ไม่ใช่การอ่านภาพต้นทางจำนวนมากซ้ำๆ ที่จะช้า
// คลิปพรีวิวของแต่ละ "set"/นิช (เช่น "Horror story") จะไปอยู่ที่ <WINDOWS_STAGING_ROOT>/<set>/Preview/
export const WINDOWS_STAGING_ROOT =
  "/mnt/c/Users/chatc/Downloads/Ai Video/AI VIdeo test";

// --- โมเดล / provider ---
// Kling image-to-video บน fal.ai (ยืนยัน slug จาก fal.ai/models แล้ว 2026-08-24)
// input: start_image_url, prompt, duration (3-15s), generate_audio, negative_prompt, cfg_scale
// หมายเหตุ: ไม่มีพารามิเตอร์ aspect_ratio — สัดส่วนยึดตามภาพต้นทาง
// scene.model ใน shot list เลือก endpoint จาก map นี้ (fallback = pro ถ้าไม่ตรง key ไหนเลย)
export const FAL_KLING_MODELS = {
  "kling-3.0-pro": "fal-ai/kling-video/v3/pro/image-to-video",
  "kling-3.0-standard": "fal-ai/kling-video/v3/standard/image-to-video",
};
// ค่าเริ่มต้นของไปป์ไลน์ (แก้ไข 2026-08-25 รอบ 2): กลับไปใช้ Standard เป็นค่าเริ่มต้น
// ผู้ใช้ตรวจสอบเองอีกครั้งแล้วยืนยันว่า Pro แพงกว่า Standard จริง (ต่างจากที่เคยสรุปไว้
// ก่อนหน้านี้ในวันเดียวกันว่าราคาเท่ากัน — ตัวเลขราคาใน PRICING ด้านล่างยังไม่ได้อัปเดตตาม
// ต้องขอราคาต่อวินาทีของ Standard ที่ยืนยันแล้วจากผู้ใช้มาใส่ให้ตรง ก่อนใช้ประมาณการต้นทุนจริง)
// ใช้ Standard คู่กับ UPSCALE_MODE=local (ฟรี) เพื่อดึงกลับมาเป็น 1080p
export const FAL_KLING_MODEL = FAL_KLING_MODELS["kling-3.0-standard"]; // default

// อัปสเกลวิดีโอ (Bytedance Upscaler) — ใช้แก้ความคมชัดของ Kling Standard (720p) ให้เป็น 1080p จริง
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

// อัปสเกล EvoLink 480p → 720p (ใช้ UPSCALE_MODE เดียวกับ flow Kling ผ่าน .env)
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

// เสียงพากย์เริ่มต้น (Adam — เสียงผู้ชายจริงจัง เหมาะกับ narration แนวเรื่องเล่า/horror)
// override ได้ผ่าน .env: ELEVENLABS_VOICE_ID=<voice id จาก elevenlabs.io/app/voice-library>
export const ELEVENLABS_VOICE_ID =
  process.env.ELEVENLABS_VOICE_ID?.trim() || "pNInz6obpgDQGcFmaJgB";

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
  klingPerSecondUSD: 0.14, // ค่าเริ่มต้น/legacy (ใช้เมื่อไม่รู้ model)
  klingPerSecondUSDByModel: {
    "kling-3.0-pro": 0.14,
    "kling-3.0-standard": 0.105, // ยืนยันจาก dashboard 2026-08-25: $0.84 / 8s
  },
  upscalePerSecondUSD: 0.0072, // Bytedance Upscaler 1080p/30fps — ยืนยันตรงกับ dashboard แล้ว
  tiersNeedingUpscale: ["kling-3.0-standard"],
  rerollBuffer: 0.1, // กันงบ reroll เพิ่ม ~10% (motion ต่ำ)
};

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
