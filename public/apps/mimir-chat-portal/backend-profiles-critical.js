(function(){
  const K='mimir-chat-backend-profiles',A='mimir-chat-active-backend',L='http://127.0.0.1:3000',U='https://api.mmir.ai',w=window;
  const now=()=>new Date().toISOString(),cl=v=>String(v||'').trim().replace(/\/$/,''),id=()=>crypto.randomUUID?crypto.randomUUID():'backend-'+Date.now();
  const ok=v=>{try{const u=new URL(v);return u.protocol==='http:'||u.protocol==='https:'}catch(e){return false}};
  const free=v=>/\b(free|gratis|local|localhost|self-hosted|self hosted|own hardware|no paid|no-cost|no cost)\b/i.test(String(v||''));
  const read=()=>{try{const v=JSON.parse(localStorage.getItem(K)||'[]');return Array.isArray(v)?v:[]}catch(e){return []}};
  function write(p){localStorage.setItem(K,JSON.stringify(p));w.dispatchEvent(new CustomEvent('mmir-backend-profiles-updated'))}
  const active=()=>localStorage.getItem(A)||'',setActive=v=>{localStorage.setItem(A,v);w.dispatchEvent(new CustomEvent('mmir-backend-profiles-updated'))};
  function up(match,make,patch){const p=read();let item=p.find(match);if(!item){item=make();p.unshift(item)}Object.assign(item,patch,{updatedAt:now()});write(p);return item}
  function api(){return up(p=>p.id==='mmir-api-bootstrap'||cl(p.url)===U,()=>({id:'mmir-api-bootstrap',createdAt:now()}),{id:'mmir-api-bootstrap',name:'MMIR Free Control Plane',url:U,provider:'openai-compatible',models:'mmir-guide auto-discovered',keyRef:'no browser secret',cost:'free no paid routes',latency:'edge bootstrap',throughput:'bootstrap guide route',uptime:'cloudflare worker',health:'ready'})}
  function local(){return up(p=>cl(p.url)===L&&p.provider==='local-node',()=>({id:id(),createdAt:now()}),{name:'MMIR Local Node',url:L,provider:'local-node',models:'auto-discovered',keyRef:'local pairing token only',cost:'free local',latency:'local best effort',throughput:'depends on model',uptime:'dev/local',health:'unknown'})}
  const blocked=p=>p&&p.provider!=='local-node'&&!free(p.cost);
  function ensureManagedApiProfile(){const p=api();setActive(p.id);return p}
  function ensureFreeLocalProfile(){const p=local();setActive(p.id);return p}
  function ensureAutomaticDefaults(){const m=api();local();const a=read().find(p=>p.id===active());if(!a||!ok(a.url)||blocked(a)){setActive(m.id);return m}return a}
  w.MimirBackendProfiles={...(w.MimirBackendProfiles||{}),ensureFreeLocalProfile,ensureManagedApiProfile,ensureAutomaticDefaults};
  ensureAutomaticDefaults();
})();
