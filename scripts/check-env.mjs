// เช็คว่า .env มี key ครบและอ่านได้ — แสดงแบบ mask ไม่เผยค่าเต็ม
import { requireEnv } from "./config.mjs";

const mask = (s) => `set (len=${s.length}, ${s.slice(0, 3)}…${s.slice(-2)})`;

try {
  const fal = requireEnv("FAL_KEY");
  const el = requireEnv("ELEVENLABS_API_KEY");
  console.log("FAL_KEY:           ", mask(fal), "| has ':' =", fal.includes(":"));
  console.log("ELEVENLABS_API_KEY:", mask(el));
  console.log("\n✅ อ่าน key ทั้งสองเจอแล้ว พร้อมทดสอบ");
} catch (e) {
  console.error("❌", e.message);
  process.exit(1);
}
