const CACHE_NAME="mogu-browser-v64-visible-bg-tool";
const APP_SHELL=[
  "./","./index.html","./manifest.webmanifest?v=madoni-brand-v3-20261117",
  "./styles.css?v=madoni-edge-v58",
  "./splash-fit-fix.css?v=1",
  "./responsive.css?v=madoni-brand-v3-20261117",
  "./mini-games.css?v=madoni-stability-v54",
  "./arcade-games.css?v=madoni-stability-v54",
  "./scene-editor.css?v=scene-editor-v1",
  "./app.js?v=madoni-brand-v3-20261117",
  "./arcade-games.js?v=madoni-stability-v54",
  "./scene-editor.js?v=scene-editor-v3",
  "./scene-background-remover.js?v=bg-remove-v1",
  "./assets/fonts/DynaPuff[wdth,wght].ttf",
  "./assets/madoni-logo.webp?v=madoni-brand-v3-20261117","./assets/madoni-icon.svg?v=madoni-brand-v3-20261117","./assets/madoni-icon-maskable.svg?v=madoni-brand-v3-20261117","./assets/mogu-icon.svg",
  "./assets/mimi.svg","./assets/tiko.svg","./assets/luna.svg",
  "./assets/madina-home-character.webp","./assets/start/madoni-start.webp","./assets/madina-guide.webp",
  "./assets/madina-guide-3d.svg","./assets/madina-cutout.svg",
  "./assets/hub-play.svg","./assets/hub-learn.svg","./assets/hub-world.svg",
  "./assets/hub-feel.svg","./assets/hub-talk.svg",
  "./assets/learn-icons.svg","./assets/learn-colors.svg","./assets/learn-math.svg",
  "./assets/learn-reading.svg","./assets/learn-thinking.svg",
  "./assets/learn-language.svg","./assets/learn-daily.svg",
  "./assets/talk-icons.svg",
  "./assets/audio/bouncy-adventure.mp3","./assets/audio/button-pop.mp3"
];
self.addEventListener("install",event=>event.waitUntil(
  caches.open(CACHE_NAME)
    .then(cache=>cache.addAll(APP_SHELL))
    .then(()=>self.skipWaiting())
));
self.addEventListener("activate",event=>event.waitUntil(
  caches.keys()
    .then(keys=>Promise.all(keys.filter(key=>key.startsWith("mogu-browser-")&&key!==CACHE_NAME).map(key=>caches.delete(key))))
    .then(()=>self.clients.claim())
));
self.addEventListener("fetch",event=>{
  const request=event.request;
  if(request.method!=="GET")return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;
  if(request.mode==="navigate"){
    event.respondWith(fetch(request).then(response=>{
      if(response.ok)caches.open(CACHE_NAME).then(cache=>cache.put("./index.html",response.clone()));
      return response;
    }).catch(async()=>{
      return await caches.match(request)||await caches.match("./index.html")||Response.error();
    }));
    return;
  }
  event.respondWith(caches.match(request).then(cached=>{
    if(cached)return cached;
    return fetch(request).then(response=>{
      if(response.ok&&response.type==="basic"){
        const copy=response.clone();
        caches.open(CACHE_NAME).then(cache=>cache.put(request,copy));
      }
      return response;
    });
  }));
});
