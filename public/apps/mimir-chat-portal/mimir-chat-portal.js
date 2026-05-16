(function(){
  const STORAGE_KEY='mimir-chat-backend-profiles';
  const ACTIVE_KEY='mimir-chat-active-backend';
  const listEl=document.getElementById('backend-list');
  const nameEl=document.getElementById('backend-name');
  const urlEl=document.getElementById('backend-url');
  const providerEl=document.getElementById('backend-provider');
  const modelsEl=document.getElementById('backend-models');
  const keyRefEl=document.getElementById('backend-key-ref');
  const costEl=document.getElementById('backend-cost');
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
  const dashboardRows=document.getElementById('dashboard-rows');
  let selectedId=null;

  function uid(){return crypto.randomUUID?crypto.randomUUID():'backend-'+Date.now();}
  function cleanUrl(value){return String(value||'').trim().replace(/\/$/,'');}
  function validUrl(value){try{const url=new URL(value);return url.protocol==='http:'||url.protocol==='https:';}catch(e){return false;}}
  function escapeHtml(value){return String(value||'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');}
  function setStatus(text){statusEl.textContent=text||'';}
  function readProfiles(){try{const value=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');return Array.isArray(value)?value:[];}catch(e){return [];}}
  function writeProfiles(profiles){localStorage.setItem(STORAGE_KEY,JSON.stringify(profiles));}
  function readActive(){return localStorage.getItem(ACTIVE_KEY)||'';}
  function writeActive(id){localStorage.setItem(ACTIVE_KEY,id);}
  function selectedProfile(){return readProfiles().find(p=>p.id===selectedId)||null;}
  function activeProfile(){const id=readActive();return readProfiles().find(p=>p.id===id)||null;}

  function renderList(){
    const profiles=readProfiles();
    const activeId=readActive();
    if(!profiles.length){listEl.innerHTML='<p class="empty-backends">No backends yet. Add your first OCI/Open WebUI endpoint.</p>';return;}
    listEl.innerHTML=profiles.map(p=>{
      const active=p.id===activeId;
      return `<button type="button" class="backend-item ${p.id===selectedId?'selected':''}" data-id="${escapeHtml(p.id)}"><span><strong>${escapeHtml(p.name||'Unnamed backend')}</strong><small>${escapeHtml(p.provider||'open-webui')} · ${escapeHtml(p.models||'models not listed')}</small></span>${active?'<em>Active</em>':''}</button>`;
    }).join('');
    listEl.querySelectorAll('[data-id]').forEach(btn=>btn.addEventListener('click',()=>selectProfile(btn.dataset.id)));
  }

  function renderEditor(){
    const p=selectedProfile();
    const active=activeProfile();
    if(!p){
      nameEl.value='';urlEl.value='';providerEl.value='open-webui';modelsEl.value='';
      if(keyRefEl)keyRefEl.value='';
      if(costEl)costEl.value='';
      launchLink.href='#';launchLink.classList.add('disabled');launchLink.setAttribute('aria-disabled','true');
    }else{
      nameEl.value=p.name||'';urlEl.value=p.url||'';providerEl.value=p.provider||'open-webui';modelsEl.value=p.models||'';
      if(keyRefEl)keyRefEl.value=p.keyRef||'';
      if(costEl)costEl.value=p.cost||'';
      const ok=validUrl(p.url);
      launchLink.href=ok?p.url:'#';launchLink.classList.toggle('disabled',!ok);launchLink.setAttribute('aria-disabled',String(!ok));
    }
    if(active&&validUrl(active.url)){
      activeBadge.textContent='Active: '+(active.name||'backend');
      activeTitle.textContent=active.name||'Mimir Chat';
      activeDesc.textContent=(active.provider||'Open WebUI')+' · '+(active.models||'models selected in backend');
      primaryLink.href=active.url;primaryLink.classList.remove('disabled');primaryLink.setAttribute('aria-disabled','false');
    }else{
      activeBadge.textContent='No backend selected';activeTitle.textContent='Ready when your backend is selected';activeDesc.textContent='Add an OCI/Open WebUI backend above, set it active, then open chat.';primaryLink.href='#';primaryLink.classList.add('disabled');primaryLink.setAttribute('aria-disabled','true');
    }
  }

  function renderDashboard(){
    const profiles=readProfiles();
    const active=activeProfile();
    const providers=[...new Set(profiles.map(p=>p.provider||'open-webui'))];
    const keyCount=profiles.filter(p=>String(p.keyRef||'').trim()).length;
    if(metricProfiles)metricProfiles.textContent=String(profiles.length);
    if(metricActive)metricActive.textContent=active?(active.name||'Active'):'None';
    if(metricKeys)metricKeys.textContent=String(keyCount);
    if(metricProviders)metricProviders.textContent=String(providers.length);
    if(!dashboardRows)return;
    if(!profiles.length){dashboardRows.innerHTML='<tr><td colspan="6">No backend profiles yet.</td></tr>';return;}
    const activeId=readActive();
    dashboardRows.innerHTML=profiles.map(p=>{
      const ok=validUrl(p.url);
      const state=p.id===activeId?'Active':(ok?'Ready':'Missing URL');
      return `<tr><td>${escapeHtml(p.name||'Unnamed')}</td><td>${escapeHtml(p.provider||'open-webui')}</td><td>${escapeHtml(p.models||'—')}</td><td>${escapeHtml(p.keyRef||'local/no key')}</td><td>${escapeHtml(p.cost||'—')}</td><td>${escapeHtml(state)}</td></tr>`;
    }).join('');
  }

  function render(){renderList();renderEditor();renderDashboard();}
  function selectProfile(id){selectedId=id;setStatus('');render();}
  function createProfile(){const profiles=readProfiles();const profile={id:uid(),name:'New backend',url:'',provider:'open-webui',models:'',keyRef:'',cost:'',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};profiles.push(profile);writeProfiles(profiles);selectedId=profile.id;setStatus('New backend profile created.');render();}
  function saveProfile(){
    const url=cleanUrl(urlEl.value);if(url&&!validUrl(url)){setStatus('Enter a valid http or https backend URL.');return;}
    const profiles=readProfiles();let p=selectedProfile();if(!p){p={id:uid(),createdAt:new Date().toISOString()};profiles.push(p);selectedId=p.id;}
    p.name=nameEl.value.trim()||'Unnamed backend';p.url=url;p.provider=providerEl.value;p.models=modelsEl.value.trim();p.keyRef=keyRefEl?keyRefEl.value.trim():'';p.cost=costEl?costEl.value.trim():'';p.updatedAt=new Date().toISOString();
    writeProfiles(profiles);setStatus('Profile saved locally.');render();
  }
  function setActive(){const p=selectedProfile();if(!p){setStatus('Select a backend first.');return;}if(!validUrl(p.url)){setStatus('Save a valid backend URL before setting active.');return;}writeActive(p.id);setStatus('Active backend set.');render();}
  function deleteProfile(){const p=selectedProfile();if(!p)return;const profiles=readProfiles().filter(x=>x.id!==p.id);writeProfiles(profiles);if(readActive()===p.id)localStorage.removeItem(ACTIVE_KEY);selectedId=profiles[0]?profiles[0].id:null;setStatus('Backend profile deleted.');render();}

  newBtn.addEventListener('click',createProfile);saveBtn.addEventListener('click',saveProfile);activeBtn.addEventListener('click',setActive);deleteBtn.addEventListener('click',deleteProfile);
  if(refreshDashboardBtn)refreshDashboardBtn.addEventListener('click',()=>{renderDashboard();setStatus('Dashboard refreshed.');});
  const profiles=readProfiles();selectedId=readActive()||(profiles[0]&&profiles[0].id)||null;render();
})();
