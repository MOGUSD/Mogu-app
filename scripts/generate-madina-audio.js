"use strict";
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
// Manual only: add phrases to audio/phrases.json, then run npm run audio:generate.
// Never runs on app startup or deployment.
const ROOT = path.resolve(__dirname, "..");
const INPUT = path.join(ROOT, "audio", "phrases.json");
const OUTPUT = path.join(ROOT, "assets", "audio", "madina");
const API = "https://api.fish.audio/v1/tts";
const VOICE_ID = "33d2eff7a2f449b4b1a2e95d42ebbb33";
const MODEL = process.env.FISH_AUDIO_MODEL || "s2.1-pro-free";
const API_KEY = process.env.FISH_AUDIO_API_KEY;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const hash = value => crypto.createHash("sha256").update(value).digest("hex").slice(0, 24);
function normalize(text) {
 return String(text || "").replace(/\p{Extended_Pictographic}/gu, "")
 .replace(/[\uFE0E\uFE0F\u200D\u{1F1E6}-\u{1F1FF}]/gu, "")
 .replace(/[\\\/"'«»“”‘’„‟]/g, "").replace(/\s+/g, " ")
 .replace(/\s+([,.!?])/g, "$1").trim();
}
async function main() {
 if (!API_KEY) throw new Error("Set FISH_AUDIO_API_KEY in your shell before generating audio.");
 const catalog = JSON.parse(fs.readFileSync(INPUT, "utf8"));
 fs.mkdirSync(OUTPUT, { recursive: true });
 const manifestPath = path.join(OUTPUT, "manifest.json");
 let manifest = { version: 1, voiceId: VOICE_ID, model: MODEL, entries: {} };
 if (fs.existsSync(manifestPath)) {
  try { manifest = { ...manifest, ...JSON.parse(fs.readFileSync(manifestPath, "utf8")) }; } catch {}
 }
 let created = 0, skipped = 0;
 for (const item of catalog.phrases || []) {
  for (const lang of ["ru", "kk", "en"]) {
   const text = normalize(item[lang]);
   if (!text) continue;
   const key = hash(lang + "\0" + text);
   const relative = lang + "/" + key + ".mp3";
   const target = path.join(OUTPUT, relative);
   if (fs.existsSync(target) && manifest.entries[key]) { skipped++; continue; }
   fs.mkdirSync(path.dirname(target), { recursive: true });
   let response;
   for (let attempt = 1; attempt <= 3; attempt++) {
    response = await fetch(API, {
     method: "POST",
     headers: { "Authorization": "Bearer " + API_KEY, "Content-Type": "application/json", "model": MODEL },
     body: JSON.stringify({ text, reference_id: VOICE_ID, format: "mp3" }),
     signal: AbortSignal.timeout(60000)
    });
    if (response.ok || (response.status !== 429 && response.status < 500)) break;
    await sleep(attempt * 2500);
   }
   if (!response.ok) throw new Error("Fish Audio failed for " + item.id + "/" + lang + ": HTTP " + response.status + " " + (await response.text()).slice(0,300));
   const bytes = Buffer.from(await response.arrayBuffer());
   if (bytes.length < 128 || (response.headers.get("content-type") || "").includes("json")) throw new Error("Invalid audio for " + item.id + "/" + lang);
   fs.writeFileSync(target, bytes);
   manifest.entries[key] = { id:item.id, lang, text, src:"./" + relative, bytes:bytes.length };
   created++;
   console.log("[audio] " + item.id + " (" + lang + ") -> " + relative + " (" + bytes.length + " bytes)");
   await sleep(350);
  }
 }
 manifest.voiceId = VOICE_ID;
 manifest.model = MODEL;
 manifest.generatedAt = new Date().toISOString();
 fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
 console.log("[audio] done: " + created + " generated, " + skipped + " already present.");
}
main().catch(error => { console.error("[audio]", error.message); process.exitCode = 1; });
