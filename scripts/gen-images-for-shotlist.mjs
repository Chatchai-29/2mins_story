// เจนภาพต้นทางทั้งหมดของ shot list ผ่าน EvoLink (ใช้ตอนที่ยังไม่มีภาพเตรียมไว้จาก SeaArt เลย)
// อ่าน scene.image_prompt → เจนภาพลง assets/<scene.source_image> (gen-image-evolink.mjs mirror ไป
// Windows staging ให้อัตโนมัติอยู่แล้ว) — ข้าม scene ที่ไม่มี image_prompt (เช่น scene แบบ reuse_video_of)
// และข้าม scene ที่มีไฟล์ภาพอยู่แล้ว (กันเจนซ้ำโดยไม่ตั้งใจ)
//
// วิธีใช้: node scripts/gen-images-for-shotlist.mjs shot-lists/<file>.json [--scene <N>] [--all]
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { DIRS } from "./config.mjs";
import { generateImageEvoLink } from "./gen-image-evolink.mjs";

const file = process.argv[2];
const sceneFlagIdx = process.argv.indexOf("--scene");
const onlyScene = sceneFlagIdx !== -1 ? Number(process.argv[sceneFlagIdx + 1]) : null;
const all = process.argv.includes("--all");

if (!file || (!onlyScene && !all)) {
  console.error(
    "ใช้: node scripts/gen-images-for-shotlist.mjs shot-lists/<file>.json --scene <N>\n" +
      "   หรือ: node scripts/gen-images-for-shotlist.mjs shot-lists/<file>.json --all"
  );
  process.exit(1);
}

const shotList = JSON.parse(await readFile(resolve(file), "utf8"));
let scenes = onlyScene ? shotList.scenes.filter((s) => s.scene === onlyScene) : shotList.scenes;

const withoutPrompt = scenes.filter((s) => !s.image_prompt);
if (withoutPrompt.length) {
  console.log(
    `ข้าม scene ${withoutPrompt.map((s) => s.scene).join(", ")} — ไม่มี image_prompt (เช่น scene แบบ reuse)`
  );
  scenes = scenes.filter((s) => s.image_prompt);
}

const alreadyExists = scenes.filter((s) => existsSync(join(DIRS.assets, s.source_image)));
if (alreadyExists.length) {
  console.log(
    `ข้าม scene ${alreadyExists.map((s) => s.scene).join(", ")} — มีไฟล์ภาพอยู่แล้ว (ลบไฟล์ก่อนถ้าต้องการเจนซ้ำจริงๆ)`
  );
  scenes = scenes.filter((s) => !existsSync(join(DIRS.assets, s.source_image)));
}

const totalCost = scenes.length * 0.0067; // krea-2-turbo default
console.log(`\nจะเจน ${scenes.length} ภาพ — ประมาณรวม $${totalCost.toFixed(4)} USD (krea-2-turbo)\n`);

for (const scene of scenes) {
  const outPath = join(DIRS.assets, scene.source_image);
  console.log(`[scene ${scene.scene}] เจนภาพ → ${outPath}`);
  await generateImageEvoLink(scene.image_prompt, outPath);
}

console.log(`\n✅ เจนภาพครบ ${scenes.length} รูป — ไปดูที่ Windows staging folder เพื่ออนุมัติก่อน generate วิดีโอต่อ`);
