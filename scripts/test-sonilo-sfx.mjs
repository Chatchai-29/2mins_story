// ทดสอบ Sonilo v1.1 video-to-video sound effects บน fal.ai (one-off test, ไม่ผูกกับ shot list schema)
import { fal } from "@fal-ai/client";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { requireEnv } from "./config.mjs";

fal.config({ credentials: requireEnv("FAL_KEY") });

const inputPath = resolve("output/bobo-test/clips/scene-1.mp4");
console.log(`อัปโหลด: ${inputPath}`);
const buf = await readFile(inputPath);
const videoUrl = await fal.storage.upload(new Blob([buf], { type: "video/mp4" }));
console.log(`อัปโหลดเสร็จ: ${videoUrl}`);

console.log("ส่งเข้า sonilo/v1.1/video-to-video-sound-effects...");
const result = await fal.subscribe("sonilo/v1.1/video-to-video-sound-effects", {
  input: {
    video_url: videoUrl,
    prompt: "cozy late-night room ambience, slurping and chewing instant noodles, chopsticks clinking against the cup, soft steam hiss, faint keyboard/computer hum, quiet city night background",
  },
  logs: true,
  onQueueUpdate: (u) => {
    if (u.status === "IN_PROGRESS") process.stdout.write(".");
  },
});

console.log("\nผลลัพธ์:", JSON.stringify(result.data, null, 2));

const outVideoUrl = result?.data?.video?.url;
if (outVideoUrl) {
  const res = await fetch(outVideoUrl);
  const outPath = resolve("output/bobo-test/clips/scene-1-sonilo-sfx.mp4");
  await writeFile(outPath, Buffer.from(await res.arrayBuffer()));
  console.log(`บันทึกแล้ว: ${outPath}`);
}
