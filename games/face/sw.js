const C='fvp-v6',CDN=['cdn.jsdelivr.net','storage.googleapis.com'];
self.addEventListener('install',e=>e.waitUntil(caches.open(C).then(c=>c.addAll(['./','index.html','manifest.json','icon.svg'])).catch(()=>{}).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))).then(()=>clients.claim())));
self.addEventListener('fetch',e=>{
 const u=new URL(e.request.url),same=u.origin===location.origin;
 if(e.request.method!=='GET'||!(same||CDN.includes(u.hostname)))return;
 e.respondWith(caches.open(C).then(async c=>{
  const m=await c.match(e.request);
  if(m&&!same)return m;
  try{const r=await fetch(e.request);if(r.ok)c.put(e.request,r.clone());return r}catch(err){return m||Response.error()}
 }));
});
