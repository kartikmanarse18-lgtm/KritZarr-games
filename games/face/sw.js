const C='fvp-v1',OK=['cdn.jsdelivr.net','storage.googleapis.com'];
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(clients.claim()));
self.addEventListener('fetch',e=>{
 const u=new URL(e.request.url);
 if(e.request.method!=='GET'||!(u.origin===location.origin||OK.includes(u.hostname)))return;
 e.respondWith(caches.open(C).then(async c=>{
  const m=await c.match(e.request);if(m)return m;
  try{const r=await fetch(e.request);if(r.ok)c.put(e.request,r.clone());return r}catch(err){return Response.error()}
 }));
});
