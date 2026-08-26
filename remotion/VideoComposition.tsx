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

export type Word = { word: string; start: number; end: number };

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

// ซับไตเติลสไตล์คลิปสั้น: โชว์ทีละกลุ่มคำ (3 คำ) ตำแหน่งกลางล่างจอ ไฮไลต์คำที่กำลังพูดอยู่
// เวลาของแต่ละคำมาจาก ElevenLabs TTS with-timestamps ตรงๆ (ไม่ผ่าน speech-to-text แยก)
const WORDS_PER_CHUNK = 3;

const chunkWords = (words: Word[], size: number): Word[][] => {
  const chunks: Word[][] = [];
  for (let i = 0; i < words.length; i += size) chunks.push(words.slice(i, i + size));
  return chunks;
};

const Captions: React.FC<{ words?: Word[] }> = ({ words }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  if (!words?.length) return null;

  const chunks = chunkWords(words, WORDS_PER_CHUNK);
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
          gap: "0 16px",
          maxWidth: "88%",
          marginBottom: 170,
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
          return (
            <span
              key={`${w.word}-${i}`}
              style={{
                fontFamily: "'Arial Black', Arial, sans-serif",
                fontWeight: 900,
                fontSize: 66,
                color: active ? "#FFE066" : "#FFFFFF",
                WebkitTextStroke: "3px black",
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
        const narrationEndSec = scene.words?.length
          ? scene.words[scene.words.length - 1].end + 0.3
          : 0;
        const effectiveDurationSec = Math.max(scene.duration_sec, narrationEndSec);
        const durationInFrames = Math.round(effectiveDurationSec * fps);
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
