const CACHE_NAME='mmir-pwa-d355-20260804-model-truth-v1';
const NETWORK_FIRST_EXTENSIONS=new Set(['.css','.html','.js','.json','.webmanifest']);
const SHELL_ASSETS=[
  './',
  './index.html',
  './mmir.html',
  './modeller/',
  './kapabiliteter/',
  './tillit/',
  './offline.html',
  './manifest.webmanifest',
  './assets/styles.css',
  './assets/mmir-icon.svg',
  './assets/mmir-maskable-icon.svg',
  './release-0.2.css',
  './release-0.2.js',
  './release-route-taxonomy.js',
  './capability-catalog.json',
  './capability-ui.json',
  './ai-model-catalog.json',
  './apps/mimir-chat-portal/mimir-chat-portal.css',
  './apps/mimir-chat-portal/chat-runtime.css',
  './apps/mimir-chat-portal/chat-runtime-deferred.css',
  './apps/mimir-chat-portal/p0-chat-shell.css',
  './apps/mimir-chat-portal/p0-release-nav.css',
  './apps/mimir-chat-portal/p0-text.js',
  './apps/mimir-chat-portal/chat-state-copy.js',
  './apps/mimir-chat-portal/p0-route-benchmarks.js',
  './apps/mimir-chat-portal/p0-chat-shell.js',
  './apps/mimir-chat-portal/p0-release-nav.js',
  './apps/mimir-chat-portal/route-chips.js',
  './apps/mimir-chat-portal/backend-profiles-critical.js',
  './apps/mimir-chat-portal/public-launch-guard.js',
  './apps/mimir-chat-portal/active-node-strip.js',
  './apps/mimir-chat-portal/composer-autosize.js',
  './apps/mimir-chat-portal/composer-stop-handoff.js',
  './apps/mimir-chat-portal/transcript-scroll-guard.js',
  './apps/mimir-chat-portal/composer-new-chat.js',
  './apps/mimir-chat-portal/composer-keyboard-shortcuts.js',
  './apps/mimir-chat-portal/composer-autofocus.js',
  './apps/mimir-chat-portal/composer-refocus-after-send.js',
  './apps/mimir-chat-portal/composer-model-picker.css',
  './apps/mimir-chat-portal/composer-model-picker.js',
  './apps/mimir-chat-portal/composer-quick-actions.css',
  './apps/mimir-chat-portal/composer-quick-actions.js',
  './apps/mimir-chat-portal/model-catalog-ui.js',
  './active-chat-nodes.json',
  './free-model-starters.json',
  './apps/mimir-chat-portal/repair-resume.css',
  './apps/mimir-chat-portal/pwa.css',
  './apps/mimir-chat-portal/pwa.js',
  './user-journeys.json'
];
const SHELL_ASSET_PATHS=new Set(SHELL_ASSETS.map((asset)=>new URL(asset,self.location.href).pathname));

function isNavigationRequest(request){
  return request.mode==='navigate'||request.destination==='document';
}

function shouldUseNetworkFirst(request,url){
  if(isNavigationRequest(request))return true;
  if(request.destination==='script'||request.destination==='style'||request.destination==='worker')return true;
  const path=url.pathname.toLowerCase();
  const lastDot=path.lastIndexOf('.');
  const extension=lastDot>=0?path.slice(lastDot):'';
  return NETWORK_FIRST_EXTENSIONS.has(extension);
}

async function matchCachedRequest(request,url){
  const exact=await caches.match(request);
  if(exact||!url.search||!SHELL_ASSET_PATHS.has(url.pathname))return exact;
  return caches.match(request,{ignoreSearch:true});
}

async function networkFirst(request,url){
  try{
    return cacheResponse(request,await fetch(request,{cache:'no-cache'}));
  }catch(error){
    const cached=await matchCachedRequest(request,url);
    if(cached)return cached;
    if(isNavigationRequest(request)){
      const offline=await caches.match('./offline.html');
      if(offline)return offline;
    }
    return Response.error();
  }
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
    event.respondWith(networkFirst(request,url));
    return;
  }

  event.respondWith(matchCachedRequest(request,url).then((cached)=>{
    const network=fetch(request).then((response)=>cacheResponse(request,response)).catch(()=>cached||Response.error());
    return cached||network;
  }));
});
