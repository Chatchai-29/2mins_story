import {
  AbsoluteFill,
  Audio,
  OffthreadVideo,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export type Word = { word: string; start: number; end: number; emphasis?: boolean };

export type Scene = {
  scene: number;
  duration_sec: number;
  source_image: string;
  motion_prompt: string;
  sfx_prompt?: string;
  camera?: string;
  transition_out?: string;
  narration?: string;
  // เติมเข้ามาโดย render.mjs จาก audio/narration-{scene}.words.json (ไม่ได้มาจาก shot list เดิม)
  words?: Word[];
};

export type ShotList = {
  video_id: string;
  title: string;
  total_duration_sec: number;
  aspect_ratio: string;
  background_music: string;
  scenes: Scene[];
};

// ความยาว scene จริง (นับรวมส่วนที่ยืดออกถ้าเสียงพากย์ยาวกว่าคลิปวิดีโอต้นฉบับ) — ใช้ทั้งใน
// calculateMetadata (Root.tsx) และตอน render จริง (ด้านล่าง) ต้องเป็นสูตรเดียวกันเป๊ะ ไม่งั้นความยาว
// composition โดยรวมจะไม่ตรงกับความยาวจริงที่แต่ละ scene ใช้ ทำให้ตอนท้ายของ scene ที่ยืดออกโดนตัดทิ้ง
// (บั๊กที่เจอจริง: total_duration_sec เดิมของ shot list ไม่รู้เรื่องการยืด scene เลย เลยตัดท้ายเสียงพากย์
// ของ scene 6, 8, 9, 10 ทิ้งไปเงียบๆ)
export const effectiveDurationSec = (scene: Scene): number => {
  const narrationEndSec = scene.words?.length
    ? scene.words[scene.words.length - 1].end + 0.3
    : 0;
  return Math.max(scene.duration_sec, narrationEndSec);
};

export const totalDurationSec = (scenes: Scene[]): number =>
  scenes.reduce((sum, scene) => sum + effectiveDurationSec(scene), 0);

// pan-zoom ช้าๆ ต่อ scene (ตาม CLAUDE.md: motion ต่ำ ใช้ pan/zoom ช้า)
const SceneClip: React.FC<{ scene: Scene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const frames = scene.duration_sec * fps;
  const scale = interpolate(frame, [0, frames], [1, 1.06], {
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill>
      <OffthreadVideo
        src={staticFile(`clips/scene-${scene.scene}.mp4`)}
        style={{ transform: `scale(${scale})`, width: "100%", height: "100%" }}
      />
    </AbsoluteFill>
  );
};

// ซับไตเติลสไตล์คลิปสั้น: โชว์ทีละกลุ่มคำ ตำแหน่งกลางล่างจอ ไฮไลต์คำที่กำลังพูดอยู่ (เหลือง) +
// ไฮไลต์คำสำคัญถาวร (แดง, มาจาก scene.words[].emphasis ที่ gen-audio.mjs ติดมาให้)
// เวลาของแต่ละคำมาจาก ElevenLabs TTS with-timestamps ตรงๆ (ไม่ผ่าน speech-to-text แยก)
//
// แบ่งกลุ่มคำแบบรู้จักประโยค/วรรค แทนการตัดทุก N คำตรงๆ (ปัญหาเดิม: ตัดคำกลางประโยค หรือรวมคำจาก
// คนละประโยคมาไว้กลุ่มเดียวกันเพราะบางฉากมีมากกว่า 1 ประโยค) — กติกา: ตัดกลุ่มทันทีเมื่อจบประโยค
// (., !, ?, …) เสมอ, ตัดที่คอมม่าได้ถ้ากลุ่มมีอย่างน้อย 3 คำแล้ว (วรรคตอนธรรมชาติ), หรือตัดเมื่อครบ
// MAX_WORDS_PER_CHUNK คำ (กันกลุ่มยาวเกินอ่านทัน)
const MAX_WORDS_PER_CHUNK = 5;
const MIN_WORDS_BEFORE_CLAUSE_BREAK = 3;
const SENTENCE_END_RE = /[.!?…]["')]?$/;
const CLAUSE_BREAK_RE = /[,;:]["')]?$/;

const chunkWords = (words: Word[]): Word[][] => {
  const chunks: Word[][] = [];
  let current: Word[] = [];
  for (const w of words) {
    current.push(w);
    const endsSentence = SENTENCE_END_RE.test(w.word);
    const endsClause = CLAUSE_BREAK_RE.test(w.word) && current.length >= MIN_WORDS_BEFORE_CLAUSE_BREAK;
    if (endsSentence || endsClause || current.length >= MAX_WORDS_PER_CHUNK) {
      chunks.push(current);
      current = [];
    }
  }
  if (current.length) chunks.push(current);
  return chunks;
};

const Captions: React.FC<{ words?: Word[] }> = ({ words }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  if (!words?.length) return null;

  const chunks = chunkWords(words);
  const chunk = chunks.reduce(
    (active, c) => (t >= c[0].start ? c : active),
    chunks[0]
  );

  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center" }}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: "0 19px",
          maxWidth: "88%",
          marginBottom: 266,
        }}
      >
        {chunk.map((w, i) => {
          const active = t >= w.start && t < w.end;
          const wordFrame = frame - Math.round(w.start * fps);
          const pop = active
            ? interpolate(wordFrame, [0, 4], [1.25, 1.08], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              })
            : 1;
          const color = w.emphasis ? "#FF3B30" : active ? "#FFE066" : "#FFFFFF";
          return (
            <span
              key={`${w.word}-${i}`}
              style={{
                fontFamily: "'Arial Black', Arial, sans-serif",
                fontWeight: 900,
                fontSize: 80,
                color,
                WebkitTextStroke: "4px black",
                textShadow: "0 4px 10px rgba(0,0,0,0.65)",
                transform: `scale(${pop})`,
                lineHeight: 1.15,
              }}
            >
              {w.word}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

export const VideoComposition: React.FC<ShotList> = (shotList) => {
  const { fps } = useVideoConfig();
  let cursor = 0;
  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      {shotList.scenes.map((scene) => {
        const from = cursor;
        // ถ้าเสียงพากย์ยาวกว่าคลิปวิดีโอ ให้ยืด scene ออก (วิดีโอค้างเฟรมสุดท้าย) แทนที่จะตัดเสียง/caption ทิ้ง
        const durationInFrames = Math.round(effectiveDurationSec(scene) * fps);
        cursor += durationInFrames;
        return (
          <Sequence key={scene.scene} from={from} durationInFrames={durationInFrames}>
            <SceneClip scene={scene} />
            {scene.sfx_prompt ? (
              <Audio src={staticFile(`audio/sfx-${scene.scene}.mp3`)} />
            ) : null}
            {scene.narration ? (
              <Audio src={staticFile(`audio/narration-${scene.scene}.mp3`)} />
            ) : null}
            <Captions words={scene.words} />
          </Sequence>
        );
      })}
      {shotList.background_music ? (
        <Audio src={staticFile("audio/music.mp3")} volume={0.6} />
      ) : null}
    </AbsoluteFill>
  );
};
