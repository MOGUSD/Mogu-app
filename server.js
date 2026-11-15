"use strict";
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 8080);
const API_KEY = process.env.FREEDOMSPEECH_API_KEY || "";
const TTS_URL = "https://api.freedomspeech.kz/v1/audio/speech";
const VOICES_URL = "https://freedomspeech.kz/api/voices";
const MAX_BODY = 12 * 1024;
const MAX_CACHE_ENTRIES = 180;
const MAX_CACHE_BYTES = 48 * 1024 * 1024;
const cache = new Map();
let cacheBytes = 0;
let voicesCache = { at: 0, voices: [] };
const rates = new Map();
const MIME = {
  ".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",
  ".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",
  ".webmanifest":"application/manifest+json",".svg":"image/svg+xml",
  ".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".webp":"image/webp",
  ".gif":"image/gif",".ico":"image/x-icon",".mp3":"audio/mpeg",".wav":"audio/wav",
  ".woff":"font/woff",".woff2":"font/woff2",".ttf":"font/ttf"
};

function send(res, status, body, type = "application/json; charset=utf-8", extra = {}) {
  res.writeHead(status, { "Content-Type": type, "X-Content-Type-Options":"nosniff", ...extra });
  res.end(body);
}
function json(res, status, value, extra) {
  send(res, status, JSON.stringify(value), "application/json; charset=utf-8", extra);
}
function setCors(req, res) {
  const origin = req.headers.origin || "";
  const allowed = !origin ||
    origin === "https://mogu-web-production.up.railway.app" ||
    origin === "capacitor://localhost" ||
    origin === "http://localhost" ||
    origin === "https://localhost";
  if (allowed && origin) res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}
function rateLimit(req) {
  const ip = String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown").split(",")[0].trim();
  const now = Date.now();
  let item = rates.get(ip);
  if (!item || now - item.start > 60000) item = { start: now, count: 0 };
  item.count++;
  rates.set(ip, item);
  if (rates.size > 2000) for (const [key, value] of rates) if (now - value.start > 120000) rates.delete(key);
  return item.count <= 40;
}
async function readJson(req) {
  let raw = "";
  for await (const chunk of req) {
    raw += chunk.toString("utf8");
    if (Buffer.byteLength(raw) > MAX_BODY) throw Object.assign(new Error("Request too large"), { status: 413 });
  }
  try { return JSON.parse(raw || "{}"); }
  catch { throw Object.assign(new Error("Invalid JSON"), { status: 400 }); }
}
async function getVoices() {
  if (Date.now() - voicesCache.at < 30 * 60 * 1000 && voicesCache.voices.length) return voicesCache.voices;
  const response = await fetch(VOICES_URL, { signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error("Voice catalog unavailable");
  const data = await response.json();
  const voices = Array.isArray(data) ? data : Array.isArray(data.voices) ? data.voices : [];
  voicesCache = { at: Date.now(), voices };
  return voices;
}
function languageVoice(language, voices) {
  const suffix = language === "kk" ? ["_kz", "_kk"] : language === "ru" ? ["_ru"] : ["_en"];
  const catalog = voices.filter(v => {
    const id = String(v.id || "").toLowerCase();
    const scenario = /cartoon|tales|assistant/.test(id + " " + String(v.name || "").toLowerCase());
    return scenario && suffix.some(s => id.endsWith(s));
  });
  catalog.sort((a,b) => {
    const rank = v => /cartoon/.test(String(v.id || "").toLowerCase()) ? 0 : /tales/.test(String(v.id || "").toLowerCase()) ? 1 : 2;
    return rank(a) - rank(b);
  });
  if (catalog.length) return { id: catalog[0].id, emotion: undefined };
  if (language === "ru" || language === "kk") return { id: "tomiris", emotion: "happy" };
  return null;
}
function cachePut(key, audio) {
  if (audio.length > MAX_CACHE_BYTES) return;
  if (cache.has(key)) { cacheBytes -= cache.get(key).length; cache.delete(key); }
  cache.set(key, audio); cacheBytes += audio.length;
  while (cache.size > MAX_CACHE_ENTRIES || cacheBytes > MAX_CACHE_BYTES) {
    const first = cache.keys().next().value;
    cacheBytes -= cache.get(first).length; cache.delete(first);
  }
}
async function synthesize(text, language) {
  let voices = [];
  try { voices = await getVoices(); } catch { /* Built-in Tomiris remains available for Russian and Kazakh. */ }
  const choice = languageVoice(language, voices);
  if (!choice) throw Object.assign(new Error("No suitable English catalog voice is available"), { status: 422 });
  const key = crypto.createHash("sha256").update(language + "\0" + choice.id + "\0" + text).digest("hex");
  if (cache.has(key)) {
    const hit = cache.get(key); cache.delete(key); cache.set(key, hit);
    return { audio: hit, voice: choice.id, cached: true };
  }
  if (!API_KEY) throw Object.assign(new Error("Speech service is not configured"), { status: 503 });
  const payload = { input: text, voice: choice.id, language };
  if (choice.emotion) payload.emotion = choice.emotion;
  const response = await fetch(TTS_URL, {
    method: "POST",
    headers: { "X-API-Key": API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(28000)
  });
  if (!response.ok) {
    let reason = "Speech provider error";
    try { const body = await response.json(); reason = String(body.error || body.message || reason).slice(0, 180); } catch {}
    const status = response.status === 401 || response.status === 403 ? 503 :
      response.status === 429 ? 429 : response.status >= 500 ? 503 : 502;
    throw Object.assign(new Error(reason), { status, providerStatus: response.status });
  }
  const type = response.headers.get("content-type") || "";
  if (!type.includes("audio")) throw Object.assign(new Error("Speech provider returned an unexpected response"), { status: 502 });
  const audio = Buffer.from(await response.arrayBuffer());
  if (audio.length < 44 || audio.length > 12 * 1024 * 1024) throw Object.assign(new Error("Invalid audio response"), { status: 502 });
  cachePut(key, audio);
  return { audio, voice: choice.id, cached: false };
}

const server = http.createServer(async (req, res) => {
  setCors(req, res);
  if (req.method === "OPTIONS") return send(res, 204, "");
  const url = new URL(req.url, "http://localhost");
  if (url.pathname.startsWith("/api/madina/")) {
    if (req.method === "GET" && url.pathname === "/api/madina/status") {
      return json(res, 200, { service:"mogu-madina-tts", configured:Boolean(API_KEY), provider:"FreedomSpeech", cacheEntries:cache.size });
    }
    if (req.method === "GET" && url.pathname === "/api/madina/voices") {
      try {
        const voices = await getVoices();
        return json(res, 200, voices.map(v => ({ id:v.id, name:v.name, type:v.type })).filter(v => v.id));
      } catch {
        return json(res, 503, { error:"Voice catalog is temporarily unavailable" });
      }
    }
    if (req.method !== "POST" || url.pathname !== "/api/madina/speech") {
      return json(res, 404, { error:"Not found" });
    }
    if (!rateLimit(req)) return json(res, 429, { error:"Too many speech requests. Please wait a moment." });
    try {
      const body = await readJson(req);
      const text = String(body.text || "").trim();
      const rawLanguage = String(body.language || "ru").toLowerCase();
      const language = rawLanguage.startsWith("kk") ? "kk" : rawLanguage.startsWith("en") ? "en" : "ru";
      if (!text) return json(res, 400, { error:"Text is required" });
      if (text.length > 2000) return json(res, 400, { error:"Text is too long" });
      const result = await synthesize(text, language);
      res.writeHead(200, {
        "Content-Type":"audio/wav",
        "Content-Length":result.audio.length,
        "Cache-Control":"private, max-age=3600",
        "X-Madina-Voice":result.voice,
        "X-Madina-Cache":result.cached ? "HIT" : "MISS",
        "X-Content-Type-Options":"nosniff"
      });
      return res.end(result.audio);
    } catch (error) {
      const status = error.status || 503;
      console.error("[madina-tts]", status, error.providerStatus || "", String(error.message || "error").slice(0, 180));
      return json(res, status, { error: status === 422 ? "A matching voice is not available for this language" : status === 429 ? "Please wait before trying again" : "Cloud voice is temporarily unavailable" });
    }
  }

  if (req.method !== "GET" && req.method !== "HEAD") return send(res, 405, "Method not allowed", "text/plain; charset=utf-8");
  let pathname;
  try { pathname = decodeURIComponent(url.pathname); } catch { return send(res, 400, "Bad path", "text/plain; charset=utf-8"); }
  let filePath = path.resolve(ROOT, "." + pathname);
  if (!filePath.startsWith(ROOT + path.sep) && filePath !== ROOT) return send(res, 403, "Forbidden", "text/plain; charset=utf-8");
  try {
    let stat = await fs.promises.stat(filePath);
    if (stat.isDirectory()) { filePath = path.join(filePath, "index.html"); stat = await fs.promises.stat(filePath); }
    if (!stat.isFile()) throw new Error("Not a file");
  } catch {
    if (!path.extname(pathname)) filePath = path.join(ROOT, "index.html");
    else return send(res, 404, "Not found", "text/plain; charset=utf-8");
  }
  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, { "Content-Type":MIME[ext] || "application/octet-stream", "Cache-Control":"no-cache", "X-Content-Type-Options":"nosniff" });
  if (req.method === "HEAD") return res.end();
  fs.createReadStream(filePath).on("error", () => { if (!res.headersSent) send(res, 500, "Read error", "text/plain; charset=utf-8"); else res.destroy(); }).pipe(res);
});
server.listen(PORT, "0.0.0.0", () => console.log("[mogu] web + Madina TTS server listening on " + PORT));
