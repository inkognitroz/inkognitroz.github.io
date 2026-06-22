(function(){
  const api=window.MimirApiClient;
  const grid=document.getElementById('platform-status-grid');
  const summary=document.getElementById('platform-status-summary');
  const refreshButton=document.getElementById('refresh-platform-status');
  if(!grid)return;

  function safe(value){return String(value||'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');}
  function statusLabel(status){return String(status||'unknown').replaceAll('-',' ');}
  function clock(){return new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', second:'2-digit'});}
  function formatAgeDays(days){
    if(!Number.isFinite(days)||days<1)return 'today';
    if(days<2)return '1 day ago';
    return Math.floor(days)+' days ago';
  }

  function setSummary(message,state){
    if(!summary)return;
    summary.textContent=message||'';
    summary.dataset.state=state||'idle';
  }

  async function fetchStatusJson(url,timeoutMs=5000){
    return api.fetchJson(url,{cache:'no-store',timeoutMs});
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

  function manifestFreshnessComponent(platformManifest){
    const updatedAt=platformManifest?.updated_at;
    if(!updatedAt){
      return {
        id:'status-manifest-freshness',
        label:'Status manifest freshness',
        status:'watch',
        route:'./platform-status.json',
        notes:'No updated_at field is present, so this browser cannot tell when the public status copy was last reviewed.'
      };
    }
    const parsed=Date.parse(updatedAt);
    if(Number.isNaN(parsed)){
      return {
        id:'status-manifest-freshness',
        label:'Status manifest freshness',
        status:'watch',
        route:'./platform-status.json',
        notes:'The public status manifest has an unreadable updated_at value: '+updatedAt+'.'
      };
    }
    const ageDays=(Date.now()-parsed)/86400000;
    const status=ageDays>21?'degraded':(ageDays>7?'watch':'online');
    const prefix=status==='degraded'
      ? 'Status copy is stale for demo trust.'
      : (status==='watch'?'Status copy is aging and should be refreshed soon.':'Status copy is current.');
    return {
      id:'status-manifest-freshness',
      label:'Status manifest freshness',
      status,
      route:new Date(parsed).toLocaleString(),
      notes:prefix+' Manifest updated '+formatAgeDays(ageDays)+'.'
    };
  }

  function currentSessionComponent(){
    const host=window.location.hostname||'local file';
    const isSecure=window.location.protocol==='https:'||host==='localhost'||host==='127.0.0.1';
    return {
      id:'browser-session',
      label:'This browser session',
      status:isSecure?'online':'watch',
      route:window.location.href.split('#')[0],
      notes:isSecure?'The loaded app shell is running in this browser.':'Loaded over a non-HTTPS context; use https://mmir.ai for launch testing.'
    };
  }

  function runStatus(run){
    if(!run)return 'unknown';
    if(run.status==='completed')return run.conclusion==='success'?'online':'degraded';
    if(run.status==='queued')return 'queued';
    if(run.status==='in_progress'||run.status==='waiting'||run.status==='requested')return 'in-progress';
    return 'watch';
  }

  function runNotes(run){
    if(!run)return 'No public deploy verification run is recorded yet.';
    const url=String(run.url||'');
    const finished=run.updated_at||run.completed_at||run.checked_at;
    const suffix=finished?' at '+new Date(finished).toLocaleString():'';
    if(run.status==='completed'){
      return 'Recorded run completed with '+(run.conclusion||'unknown')+suffix+'.';
    }
    return 'Recorded run is '+(run.status||'unknown')+suffix+'.';
  }

  function componentFromRun(id,label,run){
    return {
      id,
      label,
      status:runStatus(run),
      route:run?.url||run?.html_url||'./deploy-verification.json',
      notes:runNotes(run)
    };
  }

  async function publicDeployComponents(platformManifest){
    const components=Array.isArray(platformManifest?.components)?platformManifest.components:[];
    const commit=platformManifest?.latest_verified_commit||'current public artifact';
    const latest=components.find(component=>component?.id==='latest-deploy-verification');
    const pages=components.find(component=>component?.id==='github-pages');
    return [
      latest||{
        id:'latest-public-artifact',
        label:'Latest public artifact',
        status:'watch',
        route:String(commit),
        notes:'Public-safe manifest loaded. CI details stay in GitHub/control repos, not in this public browser payload.'
      },
      pages||{
        id:'github-pages',
        label:'GitHub Pages origin',
        status:'online',
        route:'inkognitroz.github.io -> mmir.ai',
        notes:'The static Pages artifact is public; internal QA reports stay out of the public repo.'
      }
    ];
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
    const profile=api.activeProfile();
    const url=api.cleanUrl(profile?.url);
    if(!profile||!url){
      return activeBackendComponent(null,'not-configured','No active backend profile is selected in this browser.');
    }

    try{
      const health=await fetchStatusJson(api.joinUrl(url,'/health'),5000);
      let details='Health reachable: '+(health?.status||'online')+'.';
      try{
        const status=await fetchStatusJson(api.joinUrl(url,'/status'),5000);
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
    if(refreshButton)refreshButton.disabled=true;
    setSummary('Checking public site, deploy manifest and active backend...','loading');
    let manifest=null;
    let components=[];
    try{
      manifest=await fetchStatusJson('./platform-status.json',5000);
      components=Array.isArray(manifest.components)?manifest.components:[];
    }catch(error){
      components=[{id:'status-manifest',label:'Status manifest',status:'degraded',route:'./platform-status.json',notes:'The public status manifest could not be loaded.'}];
    }
    components.unshift(currentSessionComponent());
    if(manifest)components.push(manifestFreshnessComponent(manifest));
    components.push(...await publicDeployComponents(manifest));
    components.push(await activeBackendStatus());
    render(components);
    const hasProblem=components.some(component=>['offline','degraded'].includes(component.status));
    setSummary('Checked '+clock()+'. Public deploy checks use static manifests; active backend checks stay local to this browser.',hasProblem?'error':'ready');
    if(refreshButton)refreshButton.disabled=false;
  }

  if(refreshButton)refreshButton.addEventListener('click',init);
  window.addEventListener('storage',init);
  window.addEventListener('mmir-backend-profiles-updated',init);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
