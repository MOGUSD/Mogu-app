"use strict";
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 8080);
const FISH_API_KEY = process.env.FISH_AUDIO_API_KEY || "";
const FISH_TTS_URL = "https://api.fish.audio/v1/tts";
const FISH_MODEL = "s2.1-pro-free";
const FISH_REFERENCE_ID = "33d2eff7a2f449b4b1a2e95d42ebbb33";
const MAX_BODY = 12 * 1024;
const MAX_CACHE_ENTRIES = 180;
const MAX_CACHE_BYTES = 48 * 1024 * 1024;
const cache = new Map();
const { spawn } = require("node:child_process");
const audioBucket = process.env.MADINA_AUDIO_BUCKET || "";
function sha256(value) { return crypto.createHash("sha256").update(value).digest("hex"); }
function hmac(key, value, encoding) { return crypto.createHmac("sha256", key).update(value).digest(encoding); }
function s3Url(key) {
  const endpoint = new URL(process.env.MADINA_AUDIO_ENDPOINT);
  const prefix = endpoint.pathname.replace(/\/$/, "");
  const objectPath = [audioBucket, ...key.split("/")].map(part => encodeURIComponent(part)).join("/");
  endpoint.pathname = prefix + "/" + objectPath;
  return endpoint;
}
async function s3Request(method, key, body = Buffer.alloc(0), contentType = "application/octet-stream") {
  const endpoint = s3Url(key);
  const access = process.env.MADINA_AUDIO_ACCESS_KEY_ID;
  const secret = process.env.MADINA_AUDIO_SECRET_ACCESS_KEY;
  const region = process.env.MADINA_AUDIO_REGION || "sin";
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const date = amzDate.slice(0,8);
  const payloadHash = sha256(body);
  const canonicalHeaders = "host:" + endpoint.host + "\n" +
    "x-amz-content-sha256:" + payloadHash + "\n" +
    "x-amz-date:" + amzDate + "\n";
  const signedHeaders = "host;x-amz-content-sha256;x-amz-date";
  const canonicalRequest = [method, endpoint.pathname, "", canonicalHeaders, signedHeaders, payloadHash].join("\n");
  const scope = date + "/" + region + "/s3/aws4_request";
  const stringToSign = ["AWS4-HMAC-SHA256",amzDate,scope,sha256(canonicalRequest)].join("\n");
  const kDate = hmac("AWS4"+secret,date);
  const kRegion = hmac(kDate,region);
  const kService = hmac(kRegion,"s3");
  const kSigning = hmac(kService,"aws4_request");
  const signature = hmac(kSigning,stringToSign,"hex");
  const response = await fetch(endpoint,{
    method,body:method==="GET"?undefined:body,
    headers:{
      "Authorization":"AWS4-HMAC-SHA256 Credential="+access+"/"+scope+", SignedHeaders="+signedHeaders+", Signature="+signature,
      "x-amz-date":amzDate,"x-amz-content-sha256":payloadHash,
      "Content-Type":contentType
    },
    signal:AbortSignal.timeout(60000)
  });
  return response;
}
async function readAudioObject(key) {
  const response=await s3Request("GET",key);
  if(!response.ok)throw Object.assign(new Error("Object storage HTTP "+response.status),{status:response.status});
  return response;
}
let audioGenerationChild = null;
function audioStorageReady() {
  return Boolean(audioBucket && process.env.MADINA_AUDIO_ENDPOINT &&
    process.env.MADINA_AUDIO_ACCESS_KEY_ID && process.env.MADINA_AUDIO_SECRET_ACCESS_KEY);
}
async function readAudioObject(key) {
  return await s3Request("GET",key);
}
function startAudioGenerator() {
  if (audioGenerationChild && audioGenerationChild.exitCode === null) return false;
  audioGenerationChild = spawn(process.execPath,[path.join(ROOT,"scripts","generate-madina-audio.js")],{
    cwd:ROOT,env:process.env,stdio:"inherit"
  });
  audioGenerationChild.on("exit",(code,signal)=>{
    console.log("[madina-library] generator finished",JSON.stringify({code,signal}));
    audioGenerationChild = null;
  });
  return true;
}
async function maybeStartAudioGenerator() {
  if (process.env.MADINA_GENERATE_LIBRARY_ON_START !== "1" || !audioStorageReady()) return;
  try {
    const response = await s3Request("GET","audio/madina/status.json");
    if (response.ok) {
      const status = await response.json();
      if (status.status === "completed") {
        console.log("[madina-library] full library already generated; skipping");
        return;
      }
    } else if (response.status !== 404) {
      console.error("[madina-library] cannot read generation status; HTTP",response.status);
      return;
    }
    if (startAudioGenerator()) console.log("[madina-library] starting requested one-time generation");
  } catch (error) {
    console.error("[madina-library] startup check failed",String(error.message||error).slice(0,180));
  }
}
function adminAuthorized(url) {
  const expected = process.env.MADINA_GENERATION_TOKEN || "";
  const supplied = url.searchParams.get("token") || "";
  if (!expected || !supplied) return false;
  const a = Buffer.from(expected), b = Buffer.from(supplied);
  return a.length === b.length && crypto.timingSafeEqual(a,b);
}

let cacheBytes = 0;
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
  const key = crypto.createHash("sha256")
    .update(FISH_REFERENCE_ID + "\\0" + language + "\\0" + text)
    .digest("hex");
  if (cache.has(key)) {
    const hit = cache.get(key);
    cache.delete(key);
    cache.set(key, hit);
    return { audio: hit, voice: FISH_REFERENCE_ID, cached: true };
  }
  if (!FISH_API_KEY) throw Object.assign(new Error("Fish Audio is not configured"), { status: 503 });
  const response = await fetch(FISH_TTS_URL, {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + FISH_API_KEY,
      "Content-Type": "application/json",
      "model": FISH_MODEL
    },
    body: JSON.stringify({
      text,
      reference_id: FISH_REFERENCE_ID,
      format: "mp3"
    }),
    signal: AbortSignal.timeout(35000)
  });
  if (!response.ok) {
    let reason = "Fish Audio provider error";
    try {
      const body = await response.json();
      reason = String(body.message || body.error || body.detail || reason).slice(0, 180);
    } catch {}
    const status = response.status === 401 || response.status === 403 ? 503 :
      response.status === 429 ? 429 : response.status >= 500 ? 503 : 502;
    throw Object.assign(new Error(reason), { status, providerStatus: response.status });
  }
  const type = response.headers.get("content-type") || "";
  if (!type.includes("audio")) {
    throw Object.assign(new Error("Fish Audio returned a non-audio response"), { status: 502 });
  }
  const audio = Buffer.from(await response.arrayBuffer());
  if (audio.length < 128 || audio.length > 12 * 1024 * 1024) {
    throw Object.assign(new Error("Invalid audio response"), { status: 502 });
  }
  cachePut(key, audio);
  return { audio, voice: FISH_REFERENCE_ID, cached: false };
}

const server = http.createServer(async (req, res) => {
  setCors(req, res);
  if (req.method === "OPTIONS") return send(res, 204, "");
  const url = new URL(req.url, "http://localhost");
  if (url.pathname.startsWith("/api/madina/")) {
    if (req.method === "GET" && url.pathname === "/api/madina/library/manifest.json") {
      if (!audioStorageReady()) return json(res,503,{error:"Audio library storage is not configured"});
      try {
        const object = await readAudioObject("audio/madina/manifest.json");
        const body = await object.text();
        return send(res,200,body,"application/json; charset=utf-8",{"Cache-Control":"no-cache"});
      } catch (error) {
        if (error.status === 404)
          return json(res,200,{version:1,voiceId:FISH_REFERENCE_ID,entries:{}},{"Cache-Control":"no-cache"});
        console.error("[madina-library] manifest",String(error.message||error).slice(0,160));
        return json(res,503,{error:"Audio library temporarily unavailable"});
      }
    }
    if (req.method === "GET" && url.pathname.startsWith("/api/madina/library/")) {
      if (!audioStorageReady()) return send(res,503,"Audio library storage is not configured","text/plain");
      const relative = url.pathname.slice("/api/madina/library/".length);
      if (!/^(ru|kk|en)\/[a-f0-9]{24}\.mp3$/.test(relative))
        return send(res,400,"Invalid audio path","text/plain");
      try {
        const object = await readAudioObject("audio/madina/"+relative);
        res.writeHead(200,{"Content-Type":"audio/mpeg","Content-Length":object.ContentLength,
          "Cache-Control":"public, max-age=31536000, immutable","X-Content-Type-Options":"nosniff"});
        return require("node:stream").Readable.fromWeb(object.body).pipe(res);
      } catch (error) {
        if (error.name === "NoSuchKey" || error.$metadata?.httpStatusCode === 404)
          return send(res,404,"Audio not found","text/plain");
        console.error("[madina-library] audio",String(error.message||error).slice(0,160));
        return send(res,503,"Audio library temporarily unavailable","text/plain");
      }
    }
    if (req.method === "GET" && url.pathname === "/api/madina/admin/generate") {
      if (!adminAuthorized(url)) return json(res,404,{error:"Not found"});
      if (!audioStorageReady()) return json(res,503,{error:"Audio storage is not configured"});
      const started=startAudioGenerator();
      return json(res,202,{status:started?"started":"already_running"});
    }
    if (req.method === "GET" && url.pathname === "/api/madina/admin/status") {
      if (!adminAuthorized(url)) return json(res,404,{error:"Not found"});
      if (!audioStorageReady()) return json(res,503,{error:"Audio storage is not configured"});
      try {
        const object=await readAudioObject("audio/madina/status.json");
        return send(res,200,await object.Body.transformToString(),"application/json; charset=utf-8",{"Cache-Control":"no-store"});
      } catch (error) {
        if (error.status===404)
          return json(res,200,{status:"not_started",generated:0,total:0});
        return json(res,503,{error:"Status unavailable"});
      }
    }

    if (req.method === "GET" && url.pathname === "/api/madina/status") {
      return json(res, 200, { service:"mogu-madina-tts", configured:Boolean(FISH_API_KEY), provider:"Fish Audio", model:FISH_MODEL, voiceId:FISH_REFERENCE_ID, cacheEntries:cache.size });
    }
    if (req.method === "GET" && url.pathname === "/api/madina/voices") {
      return json(res, 200, [{
        id: FISH_REFERENCE_ID,
        name: "Fish Audio — выбранный голос МОГУ",
        provider: "Fish Audio",
        model: FISH_MODEL
      }]);
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
        "Content-Type":"audio/mpeg",
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
server.listen(PORT, "0.0.0.0", () => {
  void maybeStartAudioGenerator();
  console.log("[mogu] web + Fish Audio TTS server listening on " + PORT);
  console.log("[madina-tts] provider=Fish Audio; configured=" + Boolean(FISH_API_KEY) + "; model=" + FISH_MODEL + "; voice=" + FISH_REFERENCE_ID);
});
