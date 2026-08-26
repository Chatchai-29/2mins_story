// ประกอบวิดีโอสุดท้ายด้วย Remotion (รันหลังผ่าน checkpoint approve แล้วเท่านั้น)
// วิธีใช้: node scripts/render.mjs shot-lists/<file>.json
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { readFile, mkdir, rm, cp } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { DIRS, ROOT } from "./config.mjs";
import { logEvent } from "./log.mjs";

async function attachWordTimestamps(shotList, publicDir) {
  for (const scene of shotList.scenes) {
    const wordsPath = join(publicDir, "audio", `narration-${scene.scene}.words.json`);
    if (existsSync(wordsPath)) {
      scene.words = JSON.parse(await readFile(wordsPath, "utf8"));
    }
  }
  return shotList;
}

const file = process.argv[2];
if (!file) {
  console.error("ใช้: node scripts/render.mjs shot-lists/<file>.json");
  process.exit(1);
}

const shotList = JSON.parse(await readFile(resolve(file), "utf8"));
const videoDir = join(DIRS.output, shotList.video_id);

// 1) stage คลิป + เสียงของวิดีโอนี้เข้า remotion/public เพื่อให้ staticFile() หาเจอ
const publicDir = join(ROOT, "remotion", "public");
await rm(publicDir, { recursive: true, force: true });
await mkdir(publicDir, { recursive: true });
for (const sub of ["clips", "audio"]) {
  const src = join(videoDir, sub);
  if (existsSync(src)) await cp(src, join(publicDir, sub), { recursive: true });
}
await attachWordTimestamps(shotList, publicDir);

// 2) bundle + render
console.log("bundling...");
// bundle() ไม่อ่าน remotion.config.ts (ใช้แค่ตอนรันผ่าน remotion CLI เท่านั้น) ต้องส่ง publicDir ตรงๆ
// ไม่งั้น default จะไปหา <project-root>/public ซึ่งไม่มีจริง แล้ว clips/audio ที่ stage ไว้จะหายเงียบๆ
const serveUrl = await bundle({
  entryPoint: join(ROOT, "remotion", "index.ts"),
  publicDir,
});

const composition = await selectComposition({
  serveUrl,
  id: "Video",
  inputProps: shotList,
});

const outPath = join(videoDir, "final.mp4");
console.log(`rendering → ${outPath}`);
await renderMedia({
  composition,
  serveUrl,
  codec: "h264",
  outputLocation: outPath,
  inputProps: shotList,
});

console.log(`\n✅ วิดีโอเสร็จ: ${outPath}`);
await logEvent("pipeline", `render วิดีโอสุดท้าย (${shotList.video_id})`, {
  video_id: shotList.video_id,
  scenes: shotList.scenes.length,
  total_duration_sec: shotList.total_duration_sec,
  output: outPath,
});
