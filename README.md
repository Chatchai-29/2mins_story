# AI Video Pipeline — คู่มือติดตั้ง & เริ่มใช้งาน

ไปป์ไลน์เจนวิดีโอสั้น 9:16 ความยาว 60 วิ อัตโนมัติ:
**shot list → Kling (fal.ai) เจนวิดีโอ → ElevenLabs เจนเสียง → Remotion ประกอบ → export**
(อ่านกติกาการทำงานทั้งหมดใน [CLAUDE.md](./CLAUDE.md))

---

## 1) บัญชี/สมาชิกที่ต้องสมัคร

⚠️ **สมัครที่โดเมนทางการด้านล่างเท่านั้น** — บริการเหล่านี้มีเว็บเลียนแบบเยอะมาก

| บริการ | โดเมนทางการ | ใช้ทำอะไร | แผน | เอาอะไรมาใส่ |
|--------|-------------|-----------|-----|--------------|
| **SeaArt** | **www.seaart.ai** | เจนภาพต้นทาง (1080p+ 9:16) | Master รายปี | ไม่มี key — export ภาพเองแล้ววางใน `assets/` |
| **fal.ai** | **fal.ai** | เจนวิดีโอ Kling image-to-video | จ่ายตามใช้ (~$0.112/วิ) | `FAL_KEY` → https://fal.ai/dashboard/keys |
| **ElevenLabs** | **elevenlabs.io** | เพลงคลอ (Eleven Music) + SFX | Creator | `ELEVENLABS_API_KEY` → https://elevenlabs.io/app/settings/api-keys |

**ลิงก์ทางการ:**
- SeaArt: https://www.seaart.ai/ (สมัคร → ดู Subscription/Pricing ในเมนูบัญชี)
- fal.ai: สมัคร https://fal.ai/ · API key https://fal.ai/dashboard/keys
- ElevenLabs: สมัคร https://elevenlabs.io/sign-up · key https://elevenlabs.io/app/settings/api-keys · แผน https://elevenlabs.io/pricing

> **ระวังเว็บปลอม** (อย่าสมัคร/ใส่รหัส/ใส่บัตร): SeaArt ปลอม `seaartai.org` · ElevenLabs ปลอม `11labs.us`, `elevenlabsai.us`, `en-elevenlabs.com`
> จำง่าย: ตัวจริงคือ `seaart.ai`, `fal.ai`, `elevenlabs.io` เท่านั้น — โดเมน `.us`/`.org`/`.com` ของสองเจ้านี้ปลอมหมด

> fal.ai คิดเงินตามการใช้จริง — เติมเครดิต/ผูกบัตรในแดชบอร์ด fal ก่อนเริ่ม
> ElevenLabs แผน Creator คิดตามโควตา credit ต่อเดือน ไม่ใช่ต่อวินาที

---

## 2) ติดตั้ง WSL2 (ทำครั้งเดียว)

เปิด **PowerShell แบบ Run as Administrator** แล้วรัน:

```bash
wsl --install -d Ubuntu
```

รีสตาร์ตเครื่องถ้าระบบสั่ง จากนั้นเปิด Ubuntu ตั้ง username/password ครั้งแรก แล้วติดตั้ง Node 22:

```bash
sudo apt update && sudo apt install -y curl
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node --version   # ควรได้ v22.x
```

---

## 3) ย้ายโปรเจกต์เข้า WSL แล้วติดตั้ง dependency

**อย่า**รันจาก `/mnt/c/...` (ช้าเมื่อไฟล์เยอะ) — copy เข้า filesystem ของ WSL ก่อน:

```bash
mkdir -p ~/projects
cp -r "/mnt/c/Users/chatc/Downloads/Ai Video/video-pipeline" ~/projects/
cd ~/projects/video-pipeline
npm install
```

ตั้งค่า key:

```bash
cp .env.example .env
# แก้ .env ใส่ FAL_KEY และ ELEVENLABS_API_KEY (ห้าม commit ไฟล์นี้)
```

---

## 4) เตรียมภาพต้นทาง

export ภาพจาก Seaart แล้ววางใน `assets/` ตั้งชื่อให้ตรงกับ `source_image` ใน shot list
(เมื่ออยู่ใน WSL แล้ว copy ภาพเข้า `~/projects/video-pipeline/assets/` โดยตรง)

---

## 5) โมเดลวิดีโอ & ต้นทุน (อัปเดต 2026-08-25)

ไปป์ไลน์ใช้ **Kling 3.0 Standard + auto-upscale เป็น 1080p เป็นค่าเริ่มต้น** (ไม่ต้องระบุ `model` ใน shot list) —
ทดสอบแล้วให้คุณภาพเทียบเท่า Kling 3.0 Pro (คะแนน 90/100 เท่ากัน) ที่ **~32% ของราคา** (Standard render 720p
จริง แล้ว `gen-video.mjs` อัปสเกลให้อัตโนมัติผ่าน Bytedance Upscaler)

| Tier | ราคา Kling | + upscale | รวม/วิ | ต่อคลิป 60วิ (+buffer) |
|------|-----------|-----------|--------|------------------------|
| **Standard** (ค่าเริ่มต้น) | $0.029 | +$0.0072 | $0.0362 | ~$2.39 USD (~$3.33 AUD) |
| Pro (`"model": "kling-3.0-pro"`) | $0.112 | ไม่ต้อง | $0.112 | ~$7.39 USD (~$10.31 AUD) |

ใช้ Pro เฉพาะ scene สำคัญ/hero shot ที่ต้องการความคมชัดสูงสุด — ใส่ `"model": "kling-3.0-pro"` ใน scene นั้นในชอตลิสต์
(scene ที่ใช้ Pro จะไม่ upscale เพิ่มเพราะ Pro render 1080p อยู่แล้ว)

### โหมดอัปสเกล (`UPSCALE_MODE` ใน `.env`)

| โหมด | วิธี | ราคา | เวลา | คุณภาพ |
|------|-----|------|------|--------|
| **`local`** (ค่าเริ่มต้น) | ffmpeg lanczos + unsharp ในเครื่อง | **ฟรี** | ~2 วินาที | คมน้อยกว่า api เล็กน้อย |
| `api` | Bytedance Upscaler (fal.ai) | $0.0072/วิ (~$0.60 AUD ต่อคลิป 60วิ) | ~2-3 นาที | คมที่สุด |
| `none` | ไม่อัปสเกล | ฟรี | – | 720p ตามที่ Standard เจนมา |

ต้นทุนต่อคลิป 60 วิ: **`local` ~$1.91 USD (~$2.67 AUD)** · `api` ~$2.39 USD (~$3.33 AUD)

override รายฉากได้ด้วย `"upscale_mode": "api"` ในชอตลิสต์ (เช่นใช้ api เฉพาะฉากโคลสอัพ)
หรือรันแยกเอง: `npm run upscale <input> <output> [local|api]`

## 6) รันไปป์ไลน์

```bash
# 5.1 ประมาณการต้นทุนก่อนเสมอ
npm run estimate shot-lists/example.json

# 5.2 ทดสอบ 1 scene ก่อน (ตาม CLAUDE.md)
npm run test:scene shot-lists/example.json 1

# 5.3 เจนวิดีโอครบทุก scene
npm run gen:video shot-lists/example.json
#     reroll เฉพาะ scene ที่ไม่ผ่าน:  npm run gen:video shot-lists/example.json 2

# ⛔ CHECKPOINT: หยุดตรวจทุก scene (เทคนิค + ความสวยงาม) ก่อนไปต่อ

# 5.4 เจนเสียง
npm run gen:audio shot-lists/example.json

# 5.5 ประกอบด้วย Remotion → output/<video_id>/final.mp4
npm run render shot-lists/example.json
```

เปิด Remotion Studio เพื่อพรีวิว/จูน layout: `npm run studio`

---

## โครงสร้างโฟลเดอร์

```
video-pipeline/
├── assets/              ภาพต้นทางจาก Seaart (ไม่ commit)
├── shot-lists/          shot list JSON (example.json = ตัวอย่าง schema)
├── scripts/             config, estimate-cost, gen-video, gen-audio, test-scene, render
├── remotion/            โปรเจกต์ Remotion (index, Root, VideoComposition)
├── output/              คลิป/เสียง/final.mp4 ต่อวิดีโอ (ไม่ commit)
├── .env.example         เทมเพลต key
└── CLAUDE.md            กติกาการทำงานของไปป์ไลน์
```

## ต้องยืนยันก่อนรันจริง
- **fal.ai model id** ใน `scripts/config.mjs` (`FAL_KLING_MODEL`) — ตรวจ slug ของ Kling 3.0 Pro image-to-video ให้ตรงเวอร์ชันปัจจุบันที่ https://fal.ai/models
- ชื่อ field ของ **Eleven Music / Sound Generation** ใน `scripts/gen-audio.mjs` — เทียบกับเอกสารล่าสุด
