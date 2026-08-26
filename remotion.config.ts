import { Config } from "@remotion/cli/config";

// canvas 1080p ให้ตรงกับความละเอียดคลิปต้นฉบับ (ตาม CLAUDE.md: ห้ามต่ำกว่าแล้วบีบทิ้งความคม)
Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
// โฟลเดอร์ public ที่ render.mjs จะ stage คลิป/เสียงของวิดีโอที่กำลังประกอบ
Config.setPublicDir("remotion/public");
