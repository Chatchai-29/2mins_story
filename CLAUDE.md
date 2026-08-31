# CLAUDE.md — AI Video Generation Pipeline

## เป้าหมายโปรเจกต์
Full automation ผ่าน Claude Code: เขียนสคริปต์/shot list → เรียก API เจนวิดีโอ → เรียก API เจนเสียง → ประกอบด้วย Remotion → export
มี human checkpoint แค่จุดเดียว (ดูหัวข้อ "จุดที่ต้องหยุดรอ approve" ด้านล่าง) ที่เหลือรันอัตโนมัติ

## ประเภทคอนเทนต์
- วิดีโอสั้นแนวตั้ง 9:16 ยาวรวม ~90-130 วิ (แปรผันตามจำนวนซีน/ความยาวเสียงพากย์จริง ไม่ตายตัวที่ 60 วิ)
- **(อัปเดต 2026-08-29 จากผลหลายโปรเจกต์)** ซูมกล้องเข้าได้ตามความเหมาะสม + ใช้มุมกล้องหลากหลาย
  (wide/close-up/high-angle/low-angle/over-the-shoulder/pull-back) สลับกันไปในแต่ละซีน ไม่ให้ซ้ำแบบเดียวทั้งคลิป
  + เพิ่ม "แอ็กชัน" คือให้องค์ประกอบในฉากขยับจริง (ไฟ/ควัน/พลังงาน/ผ้า/ตัวละคร ฯลฯ) ไม่ใช่แค่กล้องขยับเฉยๆ
  บนภาพนิ่ง — เดิมเคยกำหนดไว้ว่าให้ใช้แค่ pan-zoom ช้าๆ ไม่มีแอ็กชัน กฎนี้ถูกยกเลิกแล้ว
- ตัวอย่างธีมเดิม (อาจไม่ตรงกับนิชปัจจุบันแล้ว): เตียงตามราศี, สัตว์เลี้ยงตามวันในสัปดาห์, บ้านหลายสไตล์ให้เลือก —
  นิชที่ใช้งานจริงตอนนี้คือ horror/Choice-genre (isekai/reincarnation แบบเลือก 1 ใน N) และมาสคอต (Bobo/Sparx)
- มีเสียงพากย์ (narration) เป็นค่าเริ่มต้นสำหรับนิช Choice-genre — ใช้ ElevenLabs TTS + caption sync คำต่อคำ
  ไม่ใช่แค่ดนตรีคลอ+SFX เหมือนที่เขียนไว้เดิม (กฎเดิมยังใช้ได้กับนิชแบบ ambient ที่ไม่มีบทพูด)

## ภาพต้นทาง
- เจนจาก Seaart.ai (แผน Master รายปี) ความละเอียด 1080p+ อยู่แล้ว ไม่ต้อง upscale เพิ่มในไปป์ไลน์
- วางไฟล์ที่ export แล้วไว้ใน `assets/` ก่อนเริ่ม session
- ต้อง copy เข้ามาอยู่ใน filesystem ของ WSL โดยตรง ห้ามอ่านผ่าน `/mnt/c/...` เพราะช้าเมื่อไฟล์เยอะ

## การเจนวิดีโอ
- Provider: **EvoLink เท่านั้น** (env var `EVOLINK_API_KEY`) — fal.ai ถอดออกจาก video-gen แล้ว (2026-08-29, เหลือใช้แค่ upscaler เสริม)
- 2 tier แยกสคริปต์/allowlist ราคากันเจตนา เลือกด้วยฟิลด์ `"model"` ในชอตลิสต์:
  - **mass-produce** (ค่าเริ่มต้นถ้าไม่ระบุ model) — นิช horror/Choice-genre, **Bobo** (ย้ายมา tier นี้ 2026-08-29 ตามคำสั่งผู้ใช้ แม้เป็นมาสคอต) — `gen-video-evolink.mjs`, seedance-1.0-pro-fast @480p→720p, ~$0.006/วิ
  - **คุณภาพ** (ต้องระบุ `"model":"kling-v3"`) — มาสคอต **Sparx** ที่ต้องคง character ให้เหมือนเดิมทุกซีน — `gen-video-evolink-kling.mjs`, Kling ผ่าน EvoLink @720p→1080p, ~$0.08/วิ
- โหมด image-to-video เสมอ (ไม่ใช่ text-to-video), ไม่ต้องมีเสียงติดมากับคลิปวิดีโอ (เสียงจัดการแยกผ่าน ElevenLabs)
- กันงบ reroll เพิ่มอีก ~10% เพราะเนื้อหาเป็น motion ต่ำ ไม่ต้องกันเผื่อสูงเหมือนฉากแอ็กชัน
- **ความยาวเจนต่อ scene: ฐาน 7 วินาที** (อัปเดต 2026-08-29, เดิม 5 วิ) — จากประสบการณ์หลายโปรเจกต์ 5 วิสั้นไป
  เสียงพากย์ overflow บ่อย เลยเจนยาวขึ้นเผื่อสคริปยาวไว้ก่อนเป็นค่าเริ่มต้น (ยังต่ำกว่า cap ของ
  seedance-1.0-pro-fast ที่ 12 วิ) ปรับสั้น/ยาวกว่านี้ได้ตามจริงถ้าซีนนั้นสคริปสั้น/ยาวผิดปกติ —
  ถ้าสคริปยาวเกิน ~10-11 วิ ให้แยกเป็นหลายซีนแทนที่จะเจนยาวเดี่ยวๆ

## เสียง
- ElevenLabs API (env var `ELEVENLABS_API_KEY`), แผน Creator
- เสียงพากย์เริ่มต้น (base voice ทุกโปรเจกต์ใหม่ ตั้งแต่ 2026-08-31): "Adam" voice_id `wBXNqKUATyqu0RtYt25i`
  (professional voice จาก Voice Lab ของผู้ใช้เอง — คนละตัวกับ "Adam" ใน library เดิม `pNInz6obpgDQGcFmaJgB` ที่เคยใช้)
  override ต่อวิดีโอได้ผ่านฟิลด์ `voice_id` ใน shot list
- Music: ใช้ Eleven Music v2 สร้างเพลงคลอ 1 เพลงต่อวิดีโอ ความยาวเท่าคลิป
- Sound effects: ต่อ scene ความยาวสั้น (≤5 วิ) ให้ตรงกับจังหวะการเคลื่อนไหวในภาพ
- ไม่ต้องเรียก Text-to-Speech เว้นแต่จะระบุไว้ชัดเจนว่าวิดีโอนั้นต้องมีเสียงพากย์

## โครงสร้าง shot list (JSON)
ต่อวิดีโอ: `video_id`, `title`, `total_duration_sec`, `aspect_ratio`, `background_music`, `scenes[]`
ต่อ scene ใน `scenes[]`: `scene`, `duration_sec`, `source_image`, `motion_prompt`, `sfx_prompt`, `model`, `camera`, `transition_out`

## การประกอบวิดีโอ
- ใช้ Remotion รันบนเครื่องเอง (ไม่ใช้ Remotion Lambda/cloud render จนกว่าปริมาณงานจะสูงพอให้คุ้ม)
- ตั้ง canvas/composition เป็น 1080p ให้ตรงกับความละเอียดคลิปต้นฉบับเสมอ ห้ามปล่อยให้ต่ำกว่าแล้วบีบทิ้งความคมชัด
- **ตั้งค่าถาวร (2026-08-31): ทุกครั้งที่ `render.mjs` render วิดีโอเต็ม จะแยกไฟล์เสียงพากย์ล้วน (ไม่มี SFX ปน)
  ออกมาเป็น `narration-track.mp3` โดยอัตโนมัติ** — sync timeline ตรงกับวิดีโอสุดท้ายเป๊ะ (คำนวณจาก cursor/
  effectiveDurationSec เดียวกับที่ใช้วาง Sequence ใน Remotion) ไว้ให้เอาไปพากย์ภาษาอื่น/แก้ไขนอกไปป์ไลน์ได้ง่าย
- **ตั้งค่าถาวร (2026-08-31): ทุกครั้งที่ render วิดีโอเต็ม `final.mp4` + `narration-track.mp3` จะถูก copy ไป
  โฟลเดอร์ `Preview` บน Windows staging ให้อัตโนมัติเสมอ ไม่ต้องใส่ config เพิ่ม** — ระบบเดา path ปลายทางจาก
  `source_image` ของ scene แรกที่มีภาพเอง (เช่น `"Horror story/X/Image 01.png"` → mirror ไปที่
  `Horror story/X/Preview/`) ใส่ `windows_preview_dir` ใน shot list ตรงๆ ได้ถ้าอยากบังคับ path เอง — จำเป็น
  เฉพาะโปรเจกต์ที่ใช้คลิปสำเร็จรูปไม่มี `source_image` เลย (เช่น import คลิปจากที่อื่นมาแทน) เพราะระบบเดา
  ไม่ได้ ถ้าลืมใส่จะเห็น warning ตอน render แทนที่จะเงียบหายไป

## จุดที่ต้องหยุดรอ approve (checkpoint บังคับ)
หยุดหลังเจนคลิปวิดีโอครบทุก scene แล้ว **ก่อน**เข้าสู่ขั้น Remotion assembly
แสดง preview/thumbnail ของทุก scene ให้ตรวจสองเรื่องแยกกัน:
1. เทคนิค — motion เพี้ยนไหม มี artifact ไหม
2. ความสวยงาม — องค์ประกอบ สี มู้ด ตรงตามที่ตั้งใจไหม
ถ้า scene ไหนไม่ผ่าน ให้ regenerate เฉพาะ scene นั้น ไม่ต้องเริ่มใหม่ทั้งวิดีโอ

## เรื่องงบประมาณ
- ก่อนรันเจนวิดีโอเต็มชุด ให้คำนวณและแจ้งประมาณการต้นทุนก่อน (จำนวน scene × ความยาว × ราคาต่อวินาที)
- ใช้ EvoLink seedance-1.0-pro-fast เป็นค่าเริ่มต้นเสมอสำหรับนิช mass-produce (horror/Choice-genre) ไม่ต้องใช้โมเดลแพงกว่านี้เว้นแต่จะสั่งเป็นอย่างอื่น
- มาสคอต Sparx ที่ต้องคง character ให้ใช้ tier คุณภาพ (Kling ผ่าน EvoLink, `"model":"kling-v3"`) เป็นค่าเริ่มต้นแทน แพงกว่า mass-produce ~13 เท่า (~$0.08/วิ) — แจ้งราคานี้ให้ชัดก่อนรันเสมอ
- มาสคอต Bobo ใช้ tier mass-produce (default, seedance) แม้เป็นมาสคอตก็ตาม — คำสั่งชัดเจนจากผู้ใช้ 2026-08-29

## Environment
- รันบน WSL2 Ubuntu, Node.js 22+
- `.env` เก็บ `EVOLINK_API_KEY` และ `ELEVENLABS_API_KEY` (`FAL_KEY` เหลือใช้แค่ตอนเลือก `UPSCALE_MODE=api`) — ห้าม commit เข้า git และห้าม print ค่าออกมาใน log หรือหน้าจอ
- โครงสร้างโฟลเดอร์: `assets/` (ภาพต้นทางจาก Seaart), `scripts/`, `output/`

## แนวทางเริ่มงานใหม่
ก่อนรันทั้งไปป์ไลน์กับวิดีโอจริง ให้ทดสอบ 1 scene ก่อนเสมอ (ยิงภาพเดียวเข้า EvoLink/Seedance image-to-video ดูว่าคลิปกลับมาถูกต้อง) แล้วค่อยขยายเป็นเต็มชุด

## เจนภาพต้นทางด้วย EvoLink (แทน SeaArt manual)
- `scripts/gen-image-evolink.mjs` — ล็อก allowlist ไว้ที่โมเดลที่ยืนยัน endpoint/request shape จริงแล้วเท่านั้น (ดู `EVOLINK_IMAGE_MODELS` ใน config.mjs): **krea-2-turbo ($0.0067, ค่าเริ่มต้น 2026-08-29)**, nano-banana-2 ($0.036), z-image-turbo ($0.0039, prompt-adherence ด้อยกว่าตอนทดสอบ 4-การ์ด)
- **บังคับ: ห้ามเอาภาพที่เจนจาก EvoLink ไปเจนวิดีโอต่อทันทีโดยไม่ถาม** — ต้องส่งภาพให้ผู้ใช้ดู/อนุมัติก่อนทุกครั้ง แล้วค่อยยิงวิดีโอ (2026-08-29) ต่างจากภาพจาก SeaArt ที่ผู้ใช้เตรียม/อนุมัติมาก่อนหน้าอยู่แล้วโดยธรรมชาติของ workflow

## Provider มาตรฐาน: EvoLink เท่านั้น (2026-08-29)
- **EvoLink เป็น provider มาตรฐานของทั้งเจนภาพและเจนวิดีโอ** — ใช้ `gen-image-evolink.mjs`/`gen-video-evolink*.mjs` เป็นค่าเริ่มต้นเสมอ
- **ห้ามเรียก OpenAI API (`gen-image.mjs`, `test-openai.mjs`, `gen-choice-idea.mjs` ฯลฯ) โดยไม่มีคำสั่งชัดเจนจากผู้ใช้** แม้จะมีสคริปต์พร้อมใช้อยู่ในโปรเจกต์ก็ตาม (มาจาก session อื่นที่ทำคู่ขนาน) — ต้องรอให้ผู้ใช้สั่งเฉพาะเจาะจงถึงจะเรียก OpenAI
