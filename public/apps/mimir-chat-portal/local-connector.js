(function(){
  const api=window.MimirApiClient;
  const grid=document.getElementById('local-connector-grid');
  const main=document.querySelector('.mimir-chat-main');
  const DEFAULT_LOCAL_URL='http://127.0.0.1:3000';
  const WORKSPACE_KEY='mimir-active-workspace-v1';
  const DEFAULT_WORKSPACE_ID='personal';
  const REPAIR_RESUME_PREFIX='mimir-repair-resume-v1:';
  let guideSteps=[];
  let liveState={status:'idle',message:'Checking local node...',models:[],tunnel:null,url:DEFAULT_LOCAL_URL};

  function safe(value){return String(value||'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');}
  function normalizeStatus(value, feature){
    const raw=String(value||'').toLowerCase().trim();
    if(['live','beta','planned','premium-planned'].includes(raw))return raw;
    if(raw.includes('premium')||raw.includes('provider')||raw.includes('backend required'))return 'premium-planned';
    if(raw.includes('free first')||raw.includes('first pipeline'))return 'beta';
    if(raw.includes('self-managed'))return 'beta';
    if(feature&&['connect-model'].includes(feature.id))return 'beta';
    return 'planned';
  }
  function label(status){return normalizeStatus(status).replaceAll('-',' ');}
  function statusClass(status){return 'status-'+normalizeStatus(status).replace(/[^a-z0-9-]/g,'-');}
  function featureStatus(feature){return normalizeStatus(feature.status||feature.badge,feature);}
  function isDownloadPage(target){return /\.zip\.html(?:[?#].*)?$/i.test(String(target||''));}
  function isDownloadTarget(target, option){
    const action=String((option&&option.action)||'').toLowerCase().trim();
    return action==='download'||/\.(command|pkg|dmg|zip)(?:[?#].*)?$/i.test(String(target||''))||isDownloadPage(target);
  }
  function statusText(status){return String(status||'unknown').replaceAll('-',' ');}
  function modelSummary(models){
    if(!Array.isArray(models)||!models.length)return 'Free browser route ready; local models appear after node install.';
    const ids=models.map(model=>model.id||model.name||model.model).filter(Boolean);
    return ids.slice(0,4).join(', ')+(ids.length>4?' +'+String(ids.length-4):'');
  }
  function tunnelSummary(tunnel){
    if(!tunnel)return statusText('unknown');
    return statusText(tunnel.status||'unknown')+
      (tunnel.public_url?' - '+String(tunnel.public_url):'')+
      (tunnel.error?' - '+String(tunnel.error):'');
  }
  function tunnelNotice(tunnel){
    if(!tunnel)return '';
    if(tunnel.error)return ' Tunnel: '+String(tunnel.error);
    if(tunnel.public_url)return ' Tunnel is online at '+String(tunnel.public_url);
    if(tunnel.status==='starting')return ' Tunnel is starting; status will update automatically.';
    return '';
  }
  function delay(ms){return new Promise(resolve=>setTimeout(resolve,ms));}
  function activeWorkspaceId(){try{return localStorage.getItem(WORKSPACE_KEY)||DEFAULT_WORKSPACE_ID;}catch(error){return DEFAULT_WORKSPACE_ID;}}
  function repairResumeKey(){return REPAIR_RESUME_PREFIX+activeWorkspaceId();}
  function readRepairResume(){
    try{
      const value=JSON.parse(localStorage.getItem(repairResumeKey())||'null');
      return value&&typeof value==='object'?value:null;
    }catch(error){
      return null;
    }
  }
  function writeRepairResume(patch){
    const current=readRepairResume()||{};
    const next={...current,...patch,updated_at:new Date().toISOString()};
    try{localStorage.setItem(repairResumeKey(),JSON.stringify(next));}catch(error){}
    return next;
  }
  function updateRepairResumeAfterCheck(state){
    const resume=readRepairResume();
    if(!resume||!['pending','checking'].includes(String(resume.status||'')))return;
    const status=state.status==='online'?'verified':(state.status==='degraded'?'needs-model':'needs-action');
    const next=writeRepairResume({
      status,
      checked_at:new Date().toISOString(),
      node_status:state.status,
      model_count:Array.isArray(state.models)?state.models.length:0,
      note:status==='verified'?'Repair succeeded; local live models are available.':(status==='needs-model'?'Connector is back; install or expose one free local model next.':'Repair still needs attention.')
    });
    window.dispatchEvent(new CustomEvent('mmir-repair-resume-checked',{detail:next}));
  }
  function openPanel(target){
    const targetEl=document.querySelector(target);
    if(targetEl&&'open' in targetEl)targetEl.open=true;
    if(targetEl)targetEl.scrollIntoView({behavior:'smooth',block:'start'});
  }
  function isPostInstallReturn(){
    const params=new URLSearchParams(window.location.search||'');
    const hash=String(window.location.hash||'').toLowerCase();
    return params.get('mmir_local_return')==='1'||
      params.get('local_node_ready')==='1'||
      hash.includes('local-connector-ready')||
      hash.includes('mmir-local-ready');
  }
  function schedulePostInstallRefresh(){
    [250,1800,5000,10000].forEach((ms,index)=>{
      setTimeout(()=>{
        refreshLocalNode();
        document.getElementById('runtime-refresh')?.click();
        window.dispatchEvent(new CustomEvent('mmir-local-install-returned',{detail:{url:DEFAULT_LOCAL_URL,attempt:index+1}}));
      },ms);
    });
  }
  function activatePostInstallReturn(){
    if(!isPostInstallReturn())return false;
    window.MimirBackendProfiles?.ensureFreeLocalProfile?.();
    const panel=document.getElementById('local-connector');
    if(panel&&'open' in panel)panel.open=true;
    if(panel)setTimeout(()=>panel.scrollIntoView({behavior:'smooth',block:'start'}),50);
    const resume=writeRepairResume({
      ...(readRepairResume()||{action:'installer-return',target:window.location.href}),
      status:'checking',
      returned_at:new Date().toISOString(),
      note:'Returned from installer or repair-card path. MMIR is verifying connector, models and proof automatically.'
    });
    window.dispatchEvent(new CustomEvent('mmir-repair-resume-started',{detail:resume}));
    liveState={
      status:'checking',
      message:'Installer returned to MMIR. Checking the local node and refreshing live models automatically...',
      models:[],
      tunnel:null,
      url:DEFAULT_LOCAL_URL
    };
    render(guideSteps);
    schedulePostInstallRefresh();
    return true;
  }

  function render(steps){
    if(!grid)return;
    guideSteps=Array.isArray(steps)?steps:[];
    const liveStatus=liveState.status==='online'?'live':(liveState.status==='error'?'planned':'beta');
    const tunnel=liveState.tunnel||{};
    const liveCard=''+
      '<article class="provider-card provider-card-local-live">'+
        '<div class="provider-card-header"><h3>+ Live Local Node</h3><span class="provider-status '+safe(statusClass(liveStatus))+'">'+safe(statusText(liveState.status))+'</span></div>'+
        '<p>'+safe(liveState.message||'Local node status is not checked yet.')+'</p>'+
        '<div class="provider-capabilities">'+
          '<span>URL: '+safe(liveState.url||DEFAULT_LOCAL_URL)+'</span>'+
          '<span>Models: '+safe(modelSummary(liveState.models))+'</span>'+
          '<span>Tunnel: '+safe(tunnelSummary(tunnel))+'</span>'+
        '</div>'+
        '<div class="runtime-helper-actions local-connector-actions">'+
          '<button type="button" data-local-action="refresh">Refresh live models</button>'+
          '<button type="button" data-local-action="settings">Connect / settings</button>'+
          '<button type="button" data-local-action="tunnel">Start free tunnel</button>'+
          '<button type="button" data-local-action="stop-tunnel">Stop tunnel</button>'+
        '</div>'+
      '</article>';
    const guideCards=guideSteps.length?guideSteps.map(step=>{
      const status=normalizeStatus(step.status);
      return '<article class="provider-card"><div class="provider-card-header"><h3>+ '+safe(step.title||step.id)+'</h3><span class="provider-status '+safe(statusClass(status))+'">'+safe(label(status))+'</span></div><p>'+safe(step.description||'Connector step')+'</p></article>';
    }).join(''):'<p class="empty-backends">Local connector guide is not available yet.</p>';
    grid.innerHTML=liveCard+guideCards;
    bindLocalActions();
  }

  async function pairedLocalConnection(){
    if(!api)throw new Error('MMIR API client is not loaded.');
    const profile=api.activeProfile?.()||null;
    const url=api.cleanUrl(profile?.url)||DEFAULT_LOCAL_URL;
    const token=await api.pairIfNeeded(profile||{provider:'local-node'},url);
    return {url,headers:api.authHeaders(token),profile};
  }

  async function refreshLocalNode(){
    try{
      liveState={...liveState,status:'checking',message:'Checking local node...',url:DEFAULT_LOCAL_URL};
      render(guideSteps);
      const {url,headers}=await pairedLocalConnection();
      const [status,models,tunnel]=await Promise.all([
        api.fetchJson(api.joinUrl(url,'/status'),{timeoutMs:5000}),
        api.fetchJson(api.joinUrl(url,'/models'),{headers,timeoutMs:8000}),
        api.fetchJson(api.joinUrl(url,'/tunnels/status'),{headers,timeoutMs:5000}).catch(error=>({status:'not-available',error:api.friendlyError(error)}))
      ]);
      const liveModels=Array.isArray(models?.data)?models.data:Array.isArray(models?.models)?models.models:[];
      const baseMessage=liveModels.length?'Local node is online and exposes live models.':'Local node is online; install one free Ollama model to make local chat live.';
      liveState={
        status:liveModels.length?'online':'degraded',
        message:baseMessage+tunnelNotice(tunnel),
        models:liveModels,
        tunnel,
        url
      };
    }catch(error){
      liveState={
        status:'error',
        message:api?.friendlyError?api.friendlyError(error):(error?.message||'Local node check failed.'),
        models:[],
        tunnel:null,
        url:DEFAULT_LOCAL_URL
      };
    }
    render(guideSteps);
    window.dispatchEvent(new CustomEvent('mmir-local-connector-refreshed',{detail:liveState}));
    updateRepairResumeAfterCheck(liveState);
  }

  async function startTunnel(){
    try{
      liveState={...liveState,message:'Requesting local tunnel start...'};
      render(guideSteps);
      const {url,headers}=await pairedLocalConnection();
      const tunnel=await api.fetchJson(api.joinUrl(url,'/tunnels/trycloudflare/start'),{
        method:'POST',
        headers:{...headers,'Content-Type':'application/json'},
        body:'{}',
        timeoutMs:8000
      });
      liveState={...liveState,tunnel,url,message:tunnel.public_url?'Tunnel is online.':'Tunnel request sent. Refresh shortly for public URL.'};
      render(guideSteps);
      if(!tunnel.public_url){
        await delay(2500);
        const nextTunnel=await api.fetchJson(api.joinUrl(url,'/tunnels/status'),{headers,timeoutMs:5000}).catch(error=>({status:'unavailable',error:api.friendlyError(error)}));
        liveState={...liveState,tunnel:nextTunnel,url,message:(nextTunnel.public_url?'Tunnel is online.':'Tunnel status updated.')+tunnelNotice(nextTunnel)};
      }
    }catch(error){
      liveState={...liveState,tunnel:{status:'blocked'},message:api?.friendlyError?api.friendlyError(error):(error?.message||'Tunnel start failed.')};
    }
    render(guideSteps);
  }

  async function stopTunnel(){
    try{
      const {url,headers}=await pairedLocalConnection();
      const tunnel=await api.fetchJson(api.joinUrl(url,'/tunnels/stop'),{
        method:'POST',
        headers:{...headers,'Content-Type':'application/json'},
        body:'{}',
        timeoutMs:8000
      });
      liveState={...liveState,tunnel,url,message:'Tunnel stopped.'};
    }catch(error){
      liveState={...liveState,message:api?.friendlyError?api.friendlyError(error):(error?.message||'Tunnel stop failed.')};
    }
    render(guideSteps);
  }

  function bindLocalActions(){
    grid?.querySelectorAll('[data-local-action]').forEach(button=>{
      button.addEventListener('click',()=>{
        const action=button.getAttribute('data-local-action');
        if(action==='refresh')refreshLocalNode();
        if(action==='settings'){
          window.MimirBackendProfiles?.ensureFreeLocalProfile?.();
          openPanel('#backend-settings');
        }
        if(action==='tunnel')startTunnel();
        if(action==='stop-tunnel')stopTunnel();
      });
    });
  }

  function renderConnectOptions(options){
    if(!main||document.getElementById('connect-options'))return;
    const section=document.createElement('details');
    section.id='connect-options';
    section.className='mimir-provider-drawer';
    section.open=true;
    const cards=(Array.isArray(options)?options:[]).map(option=>{
      const status=normalizeStatus(option.status);
      const target=option.target||'#backend-settings';
      const download=isDownloadTarget(target,option);
      const action=option.action||(download?'Download':'Open');
      const downloadAttr=download&&!isDownloadPage(target)?' download':'';
      return '<article class="provider-card"><div class="provider-card-header"><h3>+ '+safe(option.title||option.id)+'</h3><span class="provider-status '+safe(statusClass(status))+'">'+safe(label(status))+'</span></div><p>'+safe(option.description||'Connection option')+'</p><a class="button-link" href="'+safe(target)+'"'+downloadAttr+'>'+safe(action)+'</a></article>';
    }).join('');
    section.innerHTML='<summary>+ Connect local AI</summary><section class="mimir-dashboard" aria-labelledby="connect-options-title"><div class="dashboard-heading"><div><p class="eyebrow">Ground zero</p><h2 id="connect-options-title">Open MMIR, connect local AI, install, ready</h2></div></div><div class="provider-status-grid">'+cards+'</div></section>';
    const anchor=document.getElementById('local-connector');
    if(anchor)main.insertBefore(section,anchor); else main.appendChild(section);
  }

  function renderFeatureCatalog(features){
    if(!main||document.getElementById('plus-feature-catalog'))return;
    const section=document.createElement('details');
    section.id='plus-feature-catalog';
    section.className='mimir-provider-drawer';
    const cards=(Array.isArray(features)?features:[]).map(feature=>{
      const bullets=Array.isArray(feature.bullets)?feature.bullets:[];
      const status=featureStatus(feature);
      return '<details class="model-catalog-hint"><summary>+ '+safe(feature.title)+' <span class="provider-status '+safe(statusClass(status))+'">'+safe(label(status))+'</span></summary><p class="dashboard-note"><strong>'+safe(feature.headline||'')+'</strong></p><p class="dashboard-note">'+safe(feature.description||'')+'</p><div class="provider-capabilities">'+bullets.map(item=>'<span>'+safe(item)+'</span>').join('')+'</div></details>';
    }).join('');
    section.innerHTML='<summary>+ All MMIR.ai Features</summary><section class="mimir-dashboard"><div class="dashboard-heading"><div><p class="eyebrow">Live, beta, planned</p><h2>Feature roadmap with truthful status labels</h2></div></div>'+cards+'</section>';
    const anchor=document.getElementById('model-library');
    if(anchor)main.insertBefore(section,anchor); else main.appendChild(section);
  }

  async function loadConnectOptions(){
    try{
      const response=await fetch('./connect-options.json',{cache:'default'});
      if(!response.ok)throw new Error('connect options unavailable');
      const data=await response.json();
      renderConnectOptions(data.options||[]);
    }catch(error){
      renderConnectOptions([
        {id:'mac-local-connector-download',title:'Install Mac Connector',status:'beta',description:'Download the MMIR Local Connector for Mac and start the private local AI path.',target:'./downloads/mmir-local-connector-mac.zip.html',action:'Download'},
        {id:'local-connector',title:'Connect local LLM',status:'beta',description:'Connect a local PC or VM through the MMIR local connector.',target:'#local-connector'},
        {id:'bring-backend',title:'Add compatible backend',status:'beta',description:'Add a trusted backend URL when the connector API is ready.',target:'#backend-settings'},
        {id:'provider-api',title:'Use SaaS model/API',status:'premium-planned',description:'Provider keys must stay behind a protected backend.',target:'#provider-status'}
      ]);
    }
  }

  async function loadFeatureCatalog(){
    try{
      const response=await fetch('./feature-catalog.json',{cache:'default'});
      if(!response.ok)throw new Error('feature catalog unavailable');
      const data=await response.json();
      renderFeatureCatalog(data.features||[]);
    }catch(error){
      renderFeatureCatalog([]);
    }
  }

  async function init(){
    loadConnectOptions();
    loadFeatureCatalog();
    try{
      const response=await fetch('./local-connector-guide.json',{cache:'default'});
      if(!response.ok)throw new Error('local connector guide unavailable');
      const data=await response.json();
      render(data.steps||[]);
    }catch(error){
      render([
        {id:'install',title:'Install local connector',status:'planned',description:'Download and run the MMIR local connector when backend track ships it.'},
        {id:'detect',title:'Detect local models',status:'planned',description:'Connector discovers local models and exposes safe /models metadata.'},
        {id:'connect',title:'Connect to MMIR.ai',status:'planned',description:'Frontend stores only a local connector URL and non-sensitive profile metadata.'}
      ]);
    }
    if(!activatePostInstallReturn())refreshLocalNode();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init); else init();
})();
