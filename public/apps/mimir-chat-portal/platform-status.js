(function(){
  const api=window.MimirApiClient;
  const grid=document.getElementById('platform-status-grid');
  const summary=document.getElementById('platform-status-summary');
  const refreshButton=document.getElementById('refresh-platform-status');
  const GITHUB_RUNS_URL='https://api.github.com/repos/inkognitroz/inkognitroz.github.io/actions/runs?per_page=12';
  if(!grid)return;

  function safe(value){return String(value||'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');}
  function statusLabel(status){return String(status||'unknown').replaceAll('-',' ');}
  function clock(){return new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', second:'2-digit'});}

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
    if(!run)return 'No recent public GitHub Actions run was found.';
    const sha=String(run.head_sha||'').slice(0,7);
    const finished=run.updated_at?new Date(run.updated_at).toLocaleString():'not finished yet';
    if(run.status==='completed'){
      return 'Latest run '+sha+' completed with '+(run.conclusion||'unknown')+' at '+finished+'.';
    }
    return 'Latest run '+sha+' is '+(run.status||'unknown')+' and was updated at '+finished+'.';
  }

  async function githubActionsComponents(){
    try{
      const data=await fetchStatusJson(GITHUB_RUNS_URL,7000);
      const runs=Array.isArray(data?.workflow_runs)?data.workflow_runs:[];
      const deploy=runs.find(run=>run.name==='Deploy GitHub Pages');
      const quality=runs.find(run=>run.name==='Static quality gates');
      return [
        {
          id:'static-quality-gates',
          label:'Static quality gates',
          status:runStatus(quality),
          route:quality?.html_url||'GitHub Actions',
          notes:runNotes(quality)
        },
        {
          id:'pages-deploy-run',
          label:'Pages deploy run',
          status:runStatus(deploy),
          route:deploy?.html_url||'GitHub Actions',
          notes:runNotes(deploy)
        }
      ];
    }catch(error){
      return [{
        id:'github-actions-api',
        label:'GitHub Actions API',
        status:'watch',
        route:'api.github.com',
        notes:'Public deploy checks could not be loaded from this browser. This can be a rate limit, network block or temporary GitHub API issue.'
      }];
    }
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
    setSummary('Checking public site, deploy pipeline and active backend...','loading');
    let components=[];
    try{
      const manifest=await fetchStatusJson('./platform-status.json',5000);
      components=Array.isArray(manifest.components)?manifest.components:[];
    }catch(error){
      components=[{id:'status-manifest',label:'Status manifest',status:'degraded',route:'./platform-status.json',notes:'The public status manifest could not be loaded.'}];
    }
    components.unshift(currentSessionComponent());
    components.push(...await githubActionsComponents());
    components.push(await activeBackendStatus());
    render(components);
    const hasProblem=components.some(component=>['offline','degraded'].includes(component.status));
    setSummary('Checked '+clock()+'. Public deploy checks are automated; active backend checks stay local to this browser.',hasProblem?'error':'ready');
    if(refreshButton)refreshButton.disabled=false;
  }

  if(refreshButton)refreshButton.addEventListener('click',init);
  window.addEventListener('storage',init);
  window.addEventListener('mmir-backend-profiles-updated',init);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
