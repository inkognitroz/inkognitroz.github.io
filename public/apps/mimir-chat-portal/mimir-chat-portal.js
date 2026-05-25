(function(){
  const STORAGE_KEY='mimir-chat-backend-profiles';
  const ACTIVE_KEY='mimir-chat-active-backend';
  const DEFAULT_LOCAL_URL='http://127.0.0.1:3000';
  const DEFAULT_API_URL='https://api.mmir.ai';
  const listEl=document.getElementById('backend-list');
  const nameEl=document.getElementById('backend-name');
  const urlEl=document.getElementById('backend-url');
  const providerEl=document.getElementById('backend-provider');
  const modelsEl=document.getElementById('backend-models');
  const keyRefEl=document.getElementById('backend-key-ref');
  const costEl=document.getElementById('backend-cost');
  const latencyEl=document.getElementById('backend-latency');
  const throughputEl=document.getElementById('backend-throughput');
  const uptimeEl=document.getElementById('backend-uptime');
  const healthEl=document.getElementById('backend-health');
  const newBtn=document.getElementById('new-backend');
  const saveBtn=document.getElementById('save-profile');
  const activeBtn=document.getElementById('set-active');
  const deleteBtn=document.getElementById('delete-profile');
  const launchLink=document.getElementById('launch-chat');
  const primaryLink=document.getElementById('primary-chat-link');
  const statusEl=document.getElementById('config-status');
  const activeBadge=document.getElementById('active-badge');
  const activeTitle=document.getElementById('active-chat-title');
  const activeDesc=document.getElementById('active-chat-description');
  const refreshDashboardBtn=document.getElementById('refresh-dashboard');
  const metricProfiles=document.getElementById('metric-profiles');
  const metricActive=document.getElementById('metric-active');
  const metricKeys=document.getElementById('metric-keys');
  const metricProviders=document.getElementById('metric-providers');
  const metricReady=document.getElementById('metric-ready');
  const metricMeasured=document.getElementById('metric-measured');
  const dashboardRows=document.getElementById('dashboard-rows');
  let selectedId=null;

  function uid(){return crypto.randomUUID?crypto.randomUUID():'backend-'+Date.now();}
  function cleanUrl(value){return String(value||'').trim().replace(/\/$/,'');}
  function validUrl(value){try{const url=new URL(value);return url.protocol==='http:'||url.protocol==='https:';}catch(e){return false;}}
  function escapeHtml(value){return String(value||'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');}
  function setStatus(text){statusEl.textContent=text||'';}
  function costLooksFree(value){return /\b(free|gratis|local|localhost|self-hosted|self hosted|own hardware|no paid|no-cost|no cost)\b/i.test(String(value||''));}
  function blockedByFreeMode(profile){return profile&&profile.provider!=='local-node'&&!costLooksFree(profile.cost);}
  function freeModeMessage(){return 'Free-first guard: non-local backends must be marked free, local or self-hosted before they can be used.';}
  function readProfiles(){try{const value=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');return Array.isArray(value)?value:[];}catch(e){return [];}}
  function notifyProfiles(){window.dispatchEvent(new CustomEvent('mmir-backend-profiles-updated'));}
  function writeProfiles(profiles){localStorage.setItem(STORAGE_KEY,JSON.stringify(profiles));notifyProfiles();}
  function readActive(){return localStorage.getItem(ACTIVE_KEY)||'';}
  function writeActive(id){localStorage.setItem(ACTIVE_KEY,id);notifyProfiles();}
  function selectedProfile(){return readProfiles().find(p=>p.id===selectedId)||null;}
  function activeProfile(){const id=readActive();return readProfiles().find(p=>p.id===id)||null;}
  function profileMeasured(p){return Boolean(String(p.latency||'').trim()||String(p.throughput||'').trim()||String(p.uptime||'').trim());}

  function defaultProfile(){return {id:uid(),name:'MMIR Local Node',url:DEFAULT_LOCAL_URL,provider:'local-node',models:'auto-discovered',keyRef:'local pairing token only',cost:'free local',latency:'local best effort',throughput:'depends on model',uptime:'dev/local',health:'unknown',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};}
  function defaultApiProfile(){return {id:'mmir-api-bootstrap',name:'MMIR Free Control Plane',url:DEFAULT_API_URL,provider:'openai-compatible',models:'mmir-guide auto-discovered',keyRef:'no browser secret',cost:'free no paid routes',latency:'edge bootstrap',throughput:'bootstrap guide route',uptime:'cloudflare worker',health:'ready',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};}
  function openModelLibraryFallback(){
    const drawer=document.getElementById('model-library');if(drawer){drawer.open=true;drawer.scrollIntoView({block:'start',behavior:'smooth'});}
  }
  function openBackendSettings(surface){
    if(surface==='model-picker'&&window.MimirChatRuntimeBridge?.openModelPicker){window.MimirChatRuntimeBridge.openModelPicker();return;}
    openModelLibraryFallback();
  }

  function renderList(){
    const profiles=readProfiles();
    const activeId=readActive();
    if(!profiles.length){listEl.innerHTML='<p class="empty-backends">Free browser chat is ready now. Connect Model prepares a private local node when you want your own models.</p>';return;}
    listEl.innerHTML=profiles.map(p=>{
      const active=p.id===activeId;
      const health=p.health||'unknown';
      return `<button type="button" class="backend-item ${p.id===selectedId?'selected':''}" data-id="${escapeHtml(p.id)}"><span><strong>${escapeHtml(p.name||'Unnamed backend')}</strong><small>${escapeHtml(p.provider||'local-node')} \u00b7 ${escapeHtml(p.models||'models not listed')} \u00b7 ${escapeHtml(health)}</small></span>${active?'<em>Active</em>':''}</button>`;
    }).join('');
    listEl.querySelectorAll('[data-id]').forEach(btn=>btn.addEventListener('click',()=>selectProfile(btn.dataset.id)));
  }

  function renderEditor(){
    const p=selectedProfile();
    const active=activeProfile();
    if(!p){
      nameEl.value='MMIR Local Node';urlEl.value=DEFAULT_LOCAL_URL;providerEl.value='local-node';modelsEl.value='auto-discovered';
      if(keyRefEl)keyRefEl.value='local pairing token only';
      if(costEl)costEl.value='free local';
      if(latencyEl)latencyEl.value='local best effort';
      if(throughputEl)throughputEl.value='depends on model';
      if(uptimeEl)uptimeEl.value='dev/local';
      if(healthEl)healthEl.value='unknown';
      launchLink.href='#';launchLink.classList.add('disabled');launchLink.setAttribute('aria-disabled','true');
    }else{
      nameEl.value=p.name||'';urlEl.value=p.url||'';providerEl.value=p.provider||'local-node';modelsEl.value=p.models||'';
      if(keyRefEl)keyRefEl.value=p.keyRef||'';
      if(costEl)costEl.value=p.cost||'';
      if(latencyEl)latencyEl.value=p.latency||'';
      if(throughputEl)throughputEl.value=p.throughput||'';
      if(uptimeEl)uptimeEl.value=p.uptime||'';
      if(healthEl)healthEl.value=p.health||'unknown';
      const ok=validUrl(p.url);
      launchLink.href=ok?p.url:'#';launchLink.classList.toggle('disabled',!ok);launchLink.setAttribute('aria-disabled',String(!ok));
    }
    if(active&&validUrl(active.url)){
      activeBadge.textContent='Active: '+(active.name||'backend');
      activeTitle.textContent=active.name||'Mimir Chat';
      activeDesc.textContent=(active.provider||'local-node')+' \u00b7 '+(active.models||'models selected in backend')+' \u00b7 '+(active.health||'unknown');
      primaryLink.href=active.url;primaryLink.classList.remove('disabled');primaryLink.setAttribute('aria-disabled','false');
    }else{
      activeBadge.textContent='Free browser chat ready';activeTitle.textContent='Ask MMIR now. Add your own model when ready.';activeDesc.textContent='MMIR Guide answers immediately; Connect Model stays optional for private local models and trusted backends.';primaryLink.href='#mimir-chat-runtime';primaryLink.classList.remove('disabled');primaryLink.setAttribute('aria-disabled','false');
    }
  }

  function renderDashboard(){
    const profiles=readProfiles();
    const active=activeProfile();
    const providers=[...new Set(profiles.map(p=>p.provider||'local-node'))];
    const keyCount=profiles.filter(p=>String(p.keyRef||'').trim()).length;
    const readyCount=profiles.filter(p=>(p.health||'unknown')==='ready').length;
    const measuredCount=profiles.filter(profileMeasured).length;
    if(metricProfiles)metricProfiles.textContent=String(profiles.length);
    if(metricActive)metricActive.textContent=active?(active.name||'Active'):'None';
    if(metricKeys)metricKeys.textContent=String(keyCount);
    if(metricProviders)metricProviders.textContent=String(providers.length);
    if(metricReady)metricReady.textContent=String(readyCount);
    if(metricMeasured)metricMeasured.textContent=String(measuredCount);
    if(!dashboardRows)return;
    if(!profiles.length){dashboardRows.innerHTML='<tr><td colspan="9">No backend profiles yet.</td></tr>';return;}
    const activeId=readActive();
    dashboardRows.innerHTML=profiles.map(p=>{
      const ok=validUrl(p.url);
      const state=p.id===activeId?'Active':(ok?'Ready':'Missing URL');
      const health=p.health||'unknown';
      return `<tr><td>${escapeHtml(p.name||'Unnamed')}</td><td>${escapeHtml(p.provider||'local-node')}</td><td>${escapeHtml(p.models||'\u2014')}</td><td>${escapeHtml(p.keyRef||'local/no key')}</td><td>${escapeHtml(p.cost||'\u2014')}</td><td>${escapeHtml(p.latency||'\u2014')}</td><td>${escapeHtml(p.throughput||'\u2014')}</td><td><span class="health-chip health-${escapeHtml(health)}">${escapeHtml(health)}</span></td><td>${escapeHtml(state)}</td></tr>`;
    }).join('');
  }

  function render(){renderList();renderEditor();renderDashboard();}
  function selectProfile(id){selectedId=id;setStatus('');render();}
  function upsertFreeLocalProfile(){
    const profiles=readProfiles();
    let profile=profiles.find(p=>cleanUrl(p.url)===DEFAULT_LOCAL_URL&&p.provider==='local-node');
    if(!profile){
      profile=defaultProfile();
      profiles.push(profile);
    }
    profile.cost='free local';
    profile.keyRef='local pairing token only';
    profile.provider='local-node';
    profile.updatedAt=new Date().toISOString();
    writeProfiles(profiles);
    return profile;
  }
  function upsertManagedApiProfile(){
    const profiles=readProfiles();
    let profile=profiles.find(p=>p.id==='mmir-api-bootstrap'||cleanUrl(p.url)===DEFAULT_API_URL);
    if(!profile){
      profile=defaultApiProfile();
      profiles.unshift(profile);
    }
    profile.id='mmir-api-bootstrap';
    profile.name='MMIR Free Control Plane';
    profile.url=DEFAULT_API_URL;
    profile.provider='openai-compatible';
    profile.models='mmir-guide auto-discovered';
    profile.keyRef='no browser secret';
    profile.cost='free no paid routes';
    profile.latency='edge bootstrap';
    profile.throughput='bootstrap guide route';
    profile.uptime='cloudflare worker';
    profile.health='ready';
    profile.updatedAt=new Date().toISOString();
    writeProfiles(profiles);
    return profile;
  }
  function upsertFreeOpenAiLocalProfile(options={}){
    const url=cleanUrl(options.url||'http://127.0.0.1:1234');
    const profiles=readProfiles();
    let profile=profiles.find(p=>cleanUrl(p.url)===url&&p.provider==='openai-compatible');
    if(!profile){
      profile={id:uid(),createdAt:new Date().toISOString()};
      profiles.push(profile);
    }
    profile.name=String(options.name||'Free local OpenAI-compatible node').slice(0,120);
    profile.url=url;
    profile.provider='openai-compatible';
    profile.models=String(options.models||'auto-discovered via /v1/models').slice(0,160);
    profile.keyRef='local/no browser secret';
    profile.cost='free local self-hosted';
    profile.latency='localhost';
    profile.throughput='depends on local runtime';
    profile.uptime='local';
    profile.health='unknown';
    profile.updatedAt=new Date().toISOString();
    writeProfiles(profiles);
    return profile;
  }
  function createProfile(){const profile=ensureFreeLocalProfile({surface:'model-picker'});setStatus((profile.health==='ready'?'Free local profile is active.':'Free local profile is active. Pick a free route or run the installer, then Refresh models.'));render();}
  function ensureManagedApiProfile(){
    const profile=upsertManagedApiProfile();
    selectedId=profile.id;
    writeActive(profile.id);
    setStatus('Free MMIR API route is active.');
    render();
    return profile;
  }
  function ensureFreeLocalProfile(options={}){
    const profile=upsertFreeLocalProfile();
    selectedId=profile.id;
    writeActive(profile.id);
    setStatus('Free local profile is active.');
    render();
    openBackendSettings(options.surface);
    return profile;
  }
  function ensureFreeOpenAiLocalProfile(options={}){
    const profile=upsertFreeOpenAiLocalProfile(options);
    selectedId=profile.id;
    writeActive(profile.id);
    setStatus((profile.name||'Free local OpenAI-compatible node')+' is active. Refresh checks /v1/models and then chat uses /v1/chat/completions.');
    render();
    return profile;
  }
  function ensureAutomaticDefaults(){
    const managed=upsertManagedApiProfile();
    upsertFreeLocalProfile();
    const profiles=readProfiles();
    const active=profiles.find(p=>p.id===readActive());
    if(!active||!validUrl(active.url)||blockedByFreeMode(active)){
      selectedId=managed.id;
      writeActive(managed.id);
      setStatus('Free MMIR API route is active. Local Node stays ready when you want private models.');
      render();
      return managed;
    }
    selectedId=active.id;
    return active;
  }
  function saveProfile(){
    const url=cleanUrl(urlEl.value);if(url&&!validUrl(url)){setStatus('Enter a valid http or https backend URL.');return;}
    const profiles=readProfiles();let p=selectedProfile();if(!p){p={id:uid(),createdAt:new Date().toISOString()};profiles.push(p);selectedId=p.id;}
    p.name=nameEl.value.trim()||'Unnamed backend';p.url=url;p.provider=providerEl.value;p.models=modelsEl.value.trim();p.keyRef=keyRefEl?keyRefEl.value.trim():'';p.cost=costEl?costEl.value.trim():'';p.latency=latencyEl?latencyEl.value.trim():'';p.throughput=throughputEl?throughputEl.value.trim():'';p.uptime=uptimeEl?uptimeEl.value.trim():'';p.health=healthEl?healthEl.value:'unknown';p.updatedAt=new Date().toISOString();
    if(blockedByFreeMode(p)){setStatus(freeModeMessage());return;}
    writeProfiles(profiles);setStatus('Profile saved locally.');render();
  }
  function setActive(){const p=selectedProfile();if(!p){setStatus('Select a backend first.');return;}if(!validUrl(p.url)){setStatus('Save a valid backend URL before setting active.');return;}if(blockedByFreeMode(p)){setStatus(freeModeMessage());return;}writeActive(p.id);setStatus('Active backend set.');render();}
  function deleteProfile(){const p=selectedProfile();if(!p)return;const profiles=readProfiles().filter(x=>x.id!==p.id);writeProfiles(profiles);if(readActive()===p.id)localStorage.removeItem(ACTIVE_KEY);selectedId=profiles[0]?profiles[0].id:null;setStatus('Backend profile deleted.');render();}

  newBtn.addEventListener('click',createProfile);saveBtn.addEventListener('click',saveProfile);activeBtn.addEventListener('click',setActive);deleteBtn.addEventListener('click',deleteProfile);
  if(refreshDashboardBtn)refreshDashboardBtn.addEventListener('click',()=>{renderDashboard();setStatus('Dashboard refreshed.');});
  window.addEventListener('mmir-backend-profiles-updated',()=>render());
  window.MimirBackendProfiles={ensureFreeLocalProfile,ensureManagedApiProfile,ensureFreeOpenAiLocalProfile,ensureAutomaticDefaults};
  ensureAutomaticDefaults();render();
})();
