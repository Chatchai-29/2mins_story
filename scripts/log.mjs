// บันทึก process การทำงานแบบ tamper-evident (hash-chain แบบเดียวกับ blockchain แบบง่าย)
// ใช้เป็นหลักฐาน "human decision" + "pipeline event" ตลอดการผลิต — ไว้แย้ง platform ที่กล่าวหาว่าเป็น
// mass-produced/inauthentic content: แต่ละบรรทัดมี hash ของบรรทัดก่อนหน้าฝังอยู่ ถ้าย้อนไปแก้ไข
// entry เก่า hash ทั้งสายจะไม่ตรงกันทันที (ตรวจจับได้ว่าถูกแก้ทีหลัง แม้จะยังแก้ไฟล์ในเครื่องได้ก็ตาม)
//
// สองประเภท entry:
//   "pipeline"  = เหตุการณ์อัตโนมัติจากสคริปต์ (เจน scene, TTS, render ฯลฯ)
//   "decision"  = การตัดสินใจ/เหตุผลของมนุษย์ (Claude Code บันทึกให้อัตโนมัติระหว่างทำงานร่วมกับผู้ใช้)
//
// วิธีใช้ (CLI): node scripts/log.mjs <pipeline|decision> "<summary>" ['{"json":"data"}']
// วิธีใช้ (import): import { logEvent } from "./log.mjs"; await logEvent("decision", "...", {...});
import { appendFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { ROOT } from "./config.mjs";

const LOG_PATH = join(ROOT, "production-log.jsonl");

async function lastHash() {
  if (!existsSync(LOG_PATH)) return null;
  const content = await readFile(LOG_PATH, "utf8");
  const lines = content.trim().split("\n").filter(Boolean);
  if (!lines.length) return null;
  return JSON.parse(lines[lines.length - 1]).hash;
}

export async function logEvent(type, summary, data = {}) {
  const prevHash = await lastHash();
  const entry = { timestamp: new Date().toISOString(), type, summary, data, prevHash };
  const hash = createHash("sha256").update(JSON.stringify(entry)).digest("hex");
  await appendFile(LOG_PATH, JSON.stringify({ ...entry, hash }) + "\n");
  return hash;
}

// ตรวจทั้งสาย — คืน true ถ้า hash เรียงต่อกันถูกต้องทุกบรรทัด (ไม่มีใครย้อนไปแก้)
export async function verifyChain() {
  if (!existsSync(LOG_PATH)) return { ok: true, entries: 0 };
  const lines = (await readFile(LOG_PATH, "utf8")).trim().split("\n").filter(Boolean);
  let prevHash = null;
  for (let i = 0; i < lines.length; i++) {
    const { hash, ...entry } = JSON.parse(lines[i]);
    if (entry.prevHash !== prevHash) return { ok: false, brokenAt: i, entries: lines.length };
    const recomputed = createHash("sha256").update(JSON.stringify(entry)).digest("hex");
    if (recomputed !== hash) return { ok: false, brokenAt: i, entries: lines.length };
    prevHash = hash;
  }
  return { ok: true, entries: lines.length };
}

// --- CLI ---
if (import.meta.url === `file://${process.argv[1]}`) {
  const [cmd, ...rest] = process.argv.slice(2);
  if (cmd === "verify") {
    const result = await verifyChain();
    console.log(
      result.ok
        ? `✅ chain ถูกต้องทั้งหมด (${result.entries} entries)`
        : `❌ chain ขาด/ถูกแก้ไข ที่บรรทัด ${result.brokenAt + 1}`
    );
    process.exit(result.ok ? 0 : 1);
  }
  const [type, summary, jsonArg] = [cmd, ...rest];
  if (!type || !summary) {
    console.error(
      'ใช้: node scripts/log.mjs <pipeline|decision> "<summary>" [\'{"json":"data"}\']\n' +
        "   หรือ: node scripts/log.mjs verify"
    );
    process.exit(1);
  }
  const data = jsonArg ? JSON.parse(jsonArg) : {};
  const hash = await logEvent(type, summary, data);
  console.log(`✅ logged [${type}] (${hash.slice(0, 12)}...)`);
}
