// ทดสอบ 1 scene ก่อนรันเต็มชุด (ตาม CLAUDE.md): ยิงภาพเดียวเข้า Kling ดูว่าคลิปกลับมาถูกต้อง
// วิธีใช้: node scripts/test-scene.mjs shot-lists/<file>.json [sceneNumber=1]
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { generateScene } from "./gen-video.mjs";

const file = process.argv[2];
const sceneNum = process.argv[3] ? Number(process.argv[3]) : 1;
if (!file) {
  console.error("ใช้: node scripts/test-scene.mjs shot-lists/<file>.json [sceneNumber]");
  process.exit(1);
}

const shotList = JSON.parse(await readFile(resolve(file), "utf8"));
const scene = shotList.scenes.find((s) => s.scene === sceneNum);
if (!scene) {
  console.error(`ไม่พบ scene ${sceneNum} ใน shot list`);
  process.exit(1);
}

console.log(`🧪 ทดสอบ scene ${sceneNum} ของ "${shotList.video_id}"`);
const out = await generateScene(shotList.video_id, scene);
console.log(`\n✅ คลิปทดสอบพร้อมแล้ว: ${out}`);
console.log("ตรวจ motion/artifact + ความสวยงามก่อน แล้วค่อยขยายเป็นเต็มชุด");
