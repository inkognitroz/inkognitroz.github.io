const CACHE_NAME='mmir-pwa-d222-20260524-cache-bust-v2';
const NETWORK_FIRST_EXTENSIONS=new Set(['.css','.html','.js','.json','.webmanifest']);
const SHELL_ASSETS=[
  './',
  './index.html',
  './mmir.html',
  './offline.html',
  './manifest.webmanifest',
  './assets/styles.css',
  './assets/mmir-icon.svg',
  './assets/mmir-maskable-icon.svg',
  './apps/mimir-chat-portal/mimir-chat-portal.css',
  './apps/mimir-chat-portal/chat-runtime.css',
  './apps/mimir-chat-portal/composer-model-picker.css',
  './apps/mimir-chat-portal/composer-model-picker.js',
  './apps/mimir-chat-portal/repair-resume.css',
  './apps/mimir-chat-portal/pwa.css',
  './apps/mimir-chat-portal/pwa.js',
  './apps/mimir-chat-portal/migration-portability.css',
  './apps/mimir-chat-portal/migration-portability.js',
  './apps/mimir-chat-portal/sharing-center.css',
  './apps/mimir-chat-portal/sharing-center.js',
  './apps/mimir-chat-portal/identity-org.css',
  './apps/mimir-chat-portal/identity-org.js',
  './progress-dashboard.json',
  './visual-qa-report.json',
  './activation-simulator-fixtures.json',
  './user-journeys.json',
  './gui-parity-matrix.json',
  './mmir-api-routes.json'
];

function shouldUseNetworkFirst(request,url){
  if(request.mode==='navigate')return true;
  const path=url.pathname.toLowerCase();
  const lastDot=path.lastIndexOf('.');
  const extension=lastDot>=0?path.slice(lastDot):'';
  return NETWORK_FIRST_EXTENSIONS.has(extension);
}

function cacheResponse(request,response){
  if(response&&response.ok){
    const copy=response.clone();
    caches.open(CACHE_NAME).then((cache)=>cache.put(request,copy));
  }
  return response;
}

self.addEventListener('install',(event)=>{
  event.waitUntil(caches.open(CACHE_NAME).then((cache)=>cache.addAll(SHELL_ASSETS)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',(event)=>{
  event.waitUntil(caches.keys().then((keys)=>Promise.all(keys.filter((key)=>key.startsWith('mmir-pwa-')&&key!==CACHE_NAME).map((key)=>caches.delete(key)))).then(()=>self.clients.claim()));
});

self.addEventListener('message',(event)=>{
  if(event.data&&event.data.type==='SKIP_WAITING')self.skipWaiting();
});

self.addEventListener('fetch',(event)=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;

  if(shouldUseNetworkFirst(request,url)){
    event.respondWith(fetch(request,{cache:'no-cache'}).then((response)=>cacheResponse(request,response)).catch(()=>caches.match(request).then((cached)=>cached||caches.match('./offline.html'))));
    return;
  }

  event.respondWith(caches.match(request).then((cached)=>{
    const network=fetch(request).then((response)=>cacheResponse(request,response)).catch(()=>cached);
    return cached||network;
  }));
});
