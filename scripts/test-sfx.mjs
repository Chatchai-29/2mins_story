import { generateSfx } from "./gen-audio.mjs";
try {
  const out = await generateSfx("reveal-grape-001", {
    scene: 1,
    duration_sec: 5,
    sfx_prompt: "soft magical shimmer and gentle whoosh as a portal opens, light chimes, faint night breeze",
  });
  console.log("SFX_OK:", out);
} catch (e) {
  console.error("SFX_FAIL:", e.message);
  process.exit(1);
}
