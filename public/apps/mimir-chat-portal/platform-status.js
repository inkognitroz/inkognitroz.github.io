(function(){
  const PROFILE_KEY='mimir-chat-backend-profiles';
  const ACTIVE_KEY='mimir-chat-active-backend';
  const grid=document.getElementById('platform-status-grid');
  const summary=document.getElementById('platform-status-summary');
  if(!grid)return;

  function safe(value){return String(value||'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');}
  function cleanUrl(value){return String(value||'').trim().replace(/\/$/,'');}
  function joinUrl(base,path){return cleanUrl(base)+path;}
  function statusLabel(status){return String(status||'unknown').replaceAll('-',' ');}
  function readProfiles(){try{const value=JSON.parse(localStorage.getItem(PROFILE_KEY)||'[]');return Array.isArray(value)?value:[];}catch(error){return [];}}
  function activeProfile(){const id=localStorage.getItem(ACTIVE_KEY)||'';return readProfiles().find(profile=>profile.id===id)||null;}

  function setSummary(message,state){
    if(!summary)return;
    summary.textContent=message||'';
    summary.dataset.state=state||'idle';
  }

  async function fetchJson(url,timeoutMs=5000){
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),timeoutMs);
    try{
      const response=await fetch(url,{cache:'no-store',signal:controller.signal});
      let data=null;
      try{data=await response.json();}catch(error){data=null;}
      if(!response.ok){
        const err=new Error(data?.error?.message||('Request failed with '+response.status));
        err.status=response.status;
        throw err;
      }
      return data;
    }finally{
      clearTimeout(timeout);
    }
  }

  function card(component){
    return '<article class="platform-status-card">'+
      '<div class="platform-status-card-header"><h3>'+safe(component.label||component.id)+'</h3><span class="provider-status status-'+safe(component.status||'unknown')+'">'+safe(statusLabel(component.status))+'</span></div>'+
      '<dl><div><dt>Route</dt><dd>'+safe(component.route||'not configured')+'</dd></div></dl>'+
      '<small>'+safe(component.notes||'No status note available.')+'</small>'+
    '</article>';
  }

  function render(components){
    grid.innerHTML=components.map(card).join('');
  }

  function activeBackendComponent(profile,status,notes){
    return {
      id:'active-backend',
      label:profile?.name||'Active backend',
      status,
      route:profile?.url||'not configured',
      notes
    };
  }

  async function activeBackendStatus(){
    const profile=activeProfile();
    const url=cleanUrl(profile?.url);
    if(!profile||!url){
      return activeBackendComponent(null,'not-configured','No active backend profile is selected in this browser.');
    }

    try{
      const health=await fetchJson(joinUrl(url,'/health'),5000);
      let details='Health reachable: '+(health?.status||'online')+'.';
      try{
        const status=await fetchJson(joinUrl(url,'/status'),5000);
        const capabilities=Array.isArray(status?.capabilities)?status.capabilities.slice(0,5).join(', '):'status available';
        details+=' Status reachable with capabilities: '+capabilities+'.';
      }catch(error){
        if(error.status===401||error.status===503){
          details+=' Status is protected or not configured yet.';
        }else{
          details+=' Status details unavailable.';
        }
      }
      return activeBackendComponent(profile,'online',details);
    }catch(error){
      const message=error?.name==='AbortError'?'Health check timed out.':'Health check failed. Check URL, local node, CORS or network.';
      return activeBackendComponent(profile,'offline',message);
    }
  }

  async function init(){
    setSummary('Checking public status manifest...','loading');
    let components=[];
    try{
      const manifest=await fetchJson('./platform-status.json',5000);
      components=Array.isArray(manifest.components)?manifest.components:[];
      setSummary('Status manifest loaded. Active backend checks are browser-local.','ready');
    }catch(error){
      components=[{id:'status-manifest',label:'Status manifest',status:'degraded',route:'./platform-status.json',notes:'The public status manifest could not be loaded.'}];
      setSummary('Status manifest unavailable.','error');
    }
    components.push(await activeBackendStatus());
    render(components);
  }

  window.addEventListener('storage',init);
  window.addEventListener('mmir-backend-profiles-updated',init);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
