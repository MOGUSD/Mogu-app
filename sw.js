const CACHE_NAME="mogu-browser-v19";
const APP_SHELL=[
  "./","./index.html",
  "./styles.css?v=controls-fix19",
  "./app.js?v=controls-fix19",
  "./manifest.webmanifest",
  "./assets/mogu-icon.svg","./assets/mimi.svg","./assets/tiko.svg","./assets/luna.svg","./assets/bobi.svg",
  "./assets/audio/bouncy-adventure.mp3",
  "./assets/audio/button-pop.mp3"
];
self.addEventListener("install",event=>event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(APP_SHELL)).then(()=>self.skipWaiting())));
self.addEventListener("activate",event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE_NAME).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",event=>{
  if(event.request.method!=="GET")return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin)return;
  event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{
    if(response.ok){const copy=response.clone();caches.open(CACHE_NAME).then(cache=>cache.put(event.request,copy));}
    return response;
  }).catch(()=>caches.match("./index.html"))));
});