/* Simple service worker: lets the app install to the Home Screen and
   open instantly. Network-first so you always get fresh data when online. */
const CACHE = 'familycal-v1';
const SHELL = ['./','./index.html','./styles.css','./app.js','./config.js','./manifest.webmanifest',
               './icons/icon-192.png','./icons/icon-180.png'];

self.addEventListener('install', (e)=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).catch(()=>{}));
  self.skipWaiting();
});
self.addEventListener('activate', (e)=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', (e)=>{
  const url = e.request.url;
  // never cache Supabase / map / library calls
  if(url.includes('supabase') || url.includes('tile.openstreetmap') || url.includes('nominatim') || url.includes('cdn.jsdelivr') || url.includes('unpkg')) return;
  e.respondWith(
    fetch(e.request).then(res=>{
      const copy=res.clone();
      caches.open(CACHE).then(c=>c.put(e.request, copy)).catch(()=>{});
      return res;
    }).catch(()=> caches.match(e.request).then(r=> r || caches.match('./index.html')))
  );
});
