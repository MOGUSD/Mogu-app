(() => {
"use strict";
const $ = id => document.getElementById(id);
const API = "./api/screen/rooms";
const rtcConfig = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun1.l.google.com:19302" }] };
let role = null, code = "", pc = null, localStream = null, pollTimer = null, offerStarted = false, remoteReady = false, pendingIce = [], stopped = false;
const status = message => { $("status").textContent = message; };
const post = async (path, body) => {
  const response = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Не удалось выполнить запрос");
  return data;
};
const sendSignal = message => post(API + "/" + code + "/messages", { role, message }).catch(error => status(error.message));
function makePeer() {
  pc = new RTCPeerConnection(rtcConfig);
  pc.onicecandidate = event => { if (event.candidate) sendSignal({ type: "ice", candidate: event.candidate }); };
  pc.onconnectionstatechange = () => {
    if (!pc) return;
    if (pc.connectionState === "connected") status("Соединение установлено. Изображение передаётся напрямую между устройствами.");
    if (["failed", "disconnected"].includes(pc.connectionState)) status("Связь прервалась. Проверь интернет на обоих устройствах.");
  };
  pc.ontrack = event => {
    $("remote-video").srcObject = event.streams[0];
    $("stage-hint").textContent = "Экран компьютера передаётся в реальном времени.";
    $("remote-video").play().catch(() => {});
  };
  return pc;
}
async function addIce(candidate) {
  if (!pc || !candidate) return;
  if (!remoteReady) { pendingIce.push(candidate); return; }
  try { await pc.addIceCandidate(candidate); } catch (_) {}
}
async function flushIce() {
  remoteReady = true;
  for (const candidate of pendingIce.splice(0)) await addIce(candidate);
}
async function poll() {
  if (stopped || !role || !code) return;
  try {
    const response = await fetch(API + "/" + code + "/messages?role=" + role, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Комната закрыта");
    if (role === "sender" && data.joined.viewer && !offerStarted) await createOffer();
    for (const message of data.messages || []) {
      if (message.type === "offer" && role === "viewer") {
        await pc.setRemoteDescription(message.description);
        await flushIce();
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await sendSignal({ type: "answer", description: pc.localDescription });
        status("Телефон подключается к компьютеру…");
      } else if (message.type === "answer" && role === "sender") {
        await pc.setRemoteDescription(message.description);
        await flushIce();
      } else if (message.type === "ice") await addIce(message.candidate);
      else if (message.type === "close") stop(false);
    }
  } catch (error) {
    status(error.message || "Не удалось получить сигнал от второго устройства.");
    if (role === "viewer") stop(false);
  }
  if (!stopped) pollTimer = setTimeout(poll, 350);
}
async function createOffer() {
  if (offerStarted || !pc) return;
  offerStarted = true;
  try {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await sendSignal({ type: "offer", description: pc.localDescription });
    status("Телефон найден. Устанавливаем соединение…");
  } catch (error) { status("Не удалось начать передачу: " + error.message); }
}
function showStage(title) {
  $("setup").hidden = true; $("stage").hidden = false; $("stage-title").textContent = title;
}
async function startSender() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
    status("Этот браузер не поддерживает захват экрана. Открой страницу в Chrome или Edge на компьютере.");
    return;
  }
  try {
    localStream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: { ideal: 24, max: 30 } }, audio: false });
    const data = await post(API, {});
    code = data.code; role = "sender"; offerStarted = false; stopped = false;
    $("room-code").textContent = code; $("room-wrap").hidden = false;
    $("start-share").disabled = true;
    makePeer();
    localStream.getTracks().forEach(track => { pc.addTrack(track, localStream); track.addEventListener("ended", () => stop(true)); });
    showStage("Передача экрана с компьютера");
    $("stage-hint").textContent = "Ожидаем подключение телефона. Введи код на iPhone.";
    $("remote-video").srcObject = null;
    await post(API + "/" + code + "/join", { role });
    poll();
    status("Трансляция запущена. Код подключения: " + code);
  } catch (error) {
    if (localStream) localStream.getTracks().forEach(track => track.stop());
    localStream = null;
    status(error.name === "NotAllowedError" ? "Доступ к экрану не предоставлен." : error.message);
  }
}
async function joinViewer() {
  const entered = $("join-code").value.replace(/\D/g, "").slice(0, 6);
  if (entered.length !== 6) { status("Введи все 6 цифр кода."); return; }
  code = entered; role = "viewer"; stopped = false; pendingIce = []; remoteReady = false;
  try {
    await post(API + "/" + code + "/join", { role });
    makePeer();
    showStage("Просмотр экрана компьютера");
    $("stage-hint").textContent = "Подключаемся…";
    status("Код принят. Ожидаем компьютер…");
    poll();
  } catch (error) { role = null; status(error.message); }
}
async function stop(notify = true) {
  if (stopped) return;
  stopped = true;
  clearTimeout(pollTimer);
  if (notify && code && role) {
    try { await sendSignal({ type: "close" }); } catch (_) {}
  }
  if (pc) { pc.ontrack = null; pc.close(); pc = null; }
  if (localStream) { localStream.getTracks().forEach(track => track.stop()); localStream = null; }
  $("remote-video").srcObject = null;
  $("stage").hidden = true; $("setup").hidden = false;
  $("start-share").disabled = false; $("room-wrap").hidden = true;
  status("Трансляция завершена.");
  role = null; code = ""; offerStarted = false; remoteReady = false; pendingIce = [];
}
$("start-share").addEventListener("click", startSender);
$("join-share").addEventListener("click", joinViewer);
$("join-code").addEventListener("input", e => { e.target.value = e.target.value.replace(/\D/g, "").slice(0, 6); });
$("stop-share").addEventListener("click", () => stop(true));
$("fullscreen").addEventListener("click", () => { const video = $("remote-video"); if (video.requestFullscreen) video.requestFullscreen(); else if (video.webkitEnterFullscreen) video.webkitEnterFullscreen(); });
window.addEventListener("pagehide", () => { stopped = true; clearTimeout(pollTimer); if (pc) pc.close(); if (localStream) localStream.getTracks().forEach(track => track.stop()); });
})();