// เจนเสียงด้วย ElevenLabs: เพลงคลอ 1 เพลงต่อวิดีโอ (Eleven Music) + sfx ต่อ scene + เสียงพากย์ (narration)
// วิธีใช้: node scripts/gen-audio.mjs shot-lists/<file>.json
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { DIRS, ELEVEN, ELEVENLABS_VOICE_ID, requireEnv } from "./config.mjs";
import { logEvent } from "./log.mjs";

const API_KEY = requireEnv("ELEVENLABS_API_KEY");

async function postAudio(url, body, outPath) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "xi-api-key": API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`ElevenLabs ${res.status}: ${await res.text()}`);
  }
  await writeFile(outPath, Buffer.from(await res.arrayBuffer()));
  return outPath;
}

// เพลงคลอความยาวเท่าคลิป (Eleven Music v2)
export async function generateMusic(videoId, prompt, totalDurationSec) {
  const audioDir = join(DIRS.output, videoId, "audio");
  await mkdir(audioDir, { recursive: true });
  const out = join(audioDir, "music.mp3");
  console.log(`[music] เจนเพลงคลอ ${totalDurationSec}s ...`);
  // NOTE: ยืนยันชื่อ field ของ Eleven Music ปัจจุบันที่ elevenlabs.io/docs
  await postAudio(
    ELEVEN.music,
    { prompt, music_length_ms: totalDurationSec * 1000 },
    out
  );
  console.log(`[music] เสร็จ → ${out}`);
  return out;
}

// sound effect ต่อ scene (≤5 วิ)
export async function generateSfx(videoId, scene) {
  if (!scene.sfx_prompt) return null;
  const audioDir = join(DIRS.output, videoId, "audio");
  await mkdir(audioDir, { recursive: true });
  const out = join(audioDir, `sfx-${scene.scene}.mp3`);
  console.log(`[sfx ${scene.scene}] ${scene.sfx_prompt.slice(0, 40)}...`);
  await postAudio(
    ELEVEN.sfx,
    {
      text: scene.sfx_prompt,
      duration_seconds: Math.min(scene.duration_sec ?? 5, 5),
    },
    out
  );
  return out;
}

// รวมตัวอักษรที่มี timestamp (จาก ElevenLabs) ให้เป็นคำๆ พร้อมเวลาเริ่ม/จบ
// alignment.characters[i] คู่กับ character_start/end_times_seconds[i] ตำแหน่งเดียวกัน
function alignmentToWords(alignment) {
  const chars = alignment.characters ?? [];
  const starts = alignment.character_start_times_seconds ?? [];
  const ends = alignment.character_end_times_seconds ?? [];
  const words = [];
  let cur = null;
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    if (/\s/.test(ch)) {
      if (cur) words.push(cur);
      cur = null;
      continue;
    }
    if (!cur) cur = { word: ch, start: starts[i], end: ends[i] };
    else {
      cur.word += ch;
      cur.end = ends[i];
    }
  }
  if (cur) words.push(cur);
  return words;
}

// ติด emphasis: true บนคำที่ตรงกับ scene.emphasis_words (ไว้ทำไฮไลต์สีแดงถาวรใน caption) —
// จับคู่แบบ case-insensitive ทิ้งเครื่องหมายวรรคตอนท้ายคำก่อนเทียบ (เช่น "danger…" ตรงกับ "danger")
export function annotateEmphasis(words, emphasisWords = []) {
  if (!emphasisWords.length) return words;
  const targets = new Set(emphasisWords.map((w) => w.toLowerCase()));
  return words.map((w) => {
    const clean = w.word.toLowerCase().replace(/[.,!?;:"'…()]/g, "");
    return targets.has(clean) ? { ...w, emphasis: true } : w;
  });
}

// เสียงพากย์ต่อ scene พร้อม word-level timestamp (ไว้ทำ caption ที่ sync เป๊ะ)
export async function generateNarration(videoId, scene, voiceId = ELEVENLABS_VOICE_ID) {
  if (!scene.narration) return null;
  const audioDir = join(DIRS.output, videoId, "audio");
  await mkdir(audioDir, { recursive: true });
  const outAudio = join(audioDir, `narration-${scene.scene}.mp3`);
  const outWords = join(audioDir, `narration-${scene.scene}.words.json`);
  console.log(`[narration ${scene.scene}] "${scene.narration.slice(0, 40)}..."`);
  const res = await fetch(`${ELEVEN.ttsBase}/${voiceId}/with-timestamps`, {
    method: "POST",
    headers: { "xi-api-key": API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ text: scene.narration, model_id: ELEVEN.ttsModel }),
  });
  if (!res.ok) throw new Error(`ElevenLabs TTS ${res.status}: ${await res.text()}`);
  const data = await res.json();
  await writeFile(outAudio, Buffer.from(data.audio_base64, "base64"));
  const words = annotateEmphasis(alignmentToWords(data.alignment), scene.emphasis_words ?? []);
  await writeFile(outWords, JSON.stringify(words, null, 2));
  const duration = words.length ? words[words.length - 1].end : 0;
  const overflow = duration > (scene.duration_sec ?? Infinity);
  console.log(
    `[narration ${scene.scene}] เสร็จ (${duration.toFixed(2)}s ของคลิป ${scene.duration_sec}s)` +
      (overflow ? "  ⚠️ เสียงพากย์ยาวกว่าคลิปวิดีโอ" : "")
  );
  await logEvent("pipeline", `เจนเสียงพากย์ scene ${scene.scene} (${videoId})`, {
    video_id: videoId,
    scene: scene.scene,
    voice_id: voiceId,
    narration_text: scene.narration,
    duration_sec: duration,
    overflow,
  });
  return { audio: outAudio, words: outWords, duration, overflow };
}

// --- CLI ---
if (import.meta.url === `file://${process.argv[1]}`) {
  const file = process.argv[2];
  if (!file) {
    console.error("ใช้: node scripts/gen-audio.mjs shot-lists/<file>.json");
    process.exit(1);
  }
  const s = JSON.parse(await readFile(resolve(file), "utf8"));
  if (!s.background_music) {
    console.warn("⚠️  ข้ามเพลงคลอ: shot list ไม่มี background_music prompt — SFX/narration ทำต่อได้ปกติ");
  } else {
    try {
      await generateMusic(s.video_id, s.background_music, s.total_duration_sec);
    } catch (e) {
      if (/paid_plan_required|402/.test(e.message)) {
        console.warn(
          "⚠️  ข้ามเพลงคลอ: Eleven Music ต้องใช้แผน Creator (ตอนนี้เป็น Free) — SFX ทำต่อได้ปกติ"
        );
      } else throw e;
    }
  }
  const overflowScenes = [];
  for (const scene of s.scenes) {
    await generateSfx(s.video_id, scene);
    const result = await generateNarration(s.video_id, scene);
    if (result?.overflow) overflowScenes.push(scene.scene);
  }
  console.log("\n✅ เจนเสียง (SFX + narration) เสร็จ");
  if (overflowScenes.length) {
    console.warn(
      `⚠️  scene ${overflowScenes.join(", ")} เสียงพากย์ยาวกว่าคลิปวิดีโอ — caption/เสียงจะถูกตัดท้ายถ้า render ตอนนี้`
    );
  }
}
