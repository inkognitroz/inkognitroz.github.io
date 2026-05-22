(function(){
  const api=window.MimirApiClient;
  const root=document.getElementById('node-dashboard-root');
  const summary=document.getElementById('node-dashboard-summary');
  const refreshButton=document.getElementById('refresh-node-dashboard');
  const DEFAULT_LOCAL_URL='http://127.0.0.1:3000';
  let remotePairingCode=null;

  if(!root||!api)return;

  function safe(value){return String(value||'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');}
  function setSummary(message,state){if(summary){summary.textContent=message||'';summary.dataset.state=state||'idle';}}
  function activeProfile(){return api.activeProfile?.()||null;}
  function cleanUrl(value){return api.cleanUrl(value);}
  function joinUrl(base,path){return api.joinUrl(base,path);}
  function statusText(value){return String(value||'unknown').replaceAll('-',' ');}
  function arrayData(value){return Array.isArray(value?.data)?value.data:(Array.isArray(value?.models)?value.models:[]);}
  function modelSummary(models){
    if(!Array.isArray(models)||!models.length)return 'No live model discovered';
    const ids=models.map(model=>model.id||model.name||model.model).filter(Boolean);
    return ids.slice(0,4).join(', ')+(ids.length>4?' +'+String(ids.length-4):'');
  }
  function hardwareSummary(hardware){
    if(!hardware)return 'Hardware not checked';
    const cpu=hardware.cpu_count||hardware.cpus||hardware.cpu||'CPU';
    const ram=hardware.memory_total_gb||hardware.ram_gb||hardware.memory_gb||'RAM';
    const tier=hardware.memory_tier||hardware.device_class||hardware.capacity_class||'local';
    return String(cpu)+' CPU / '+String(ram)+' GB RAM / '+String(tier);
  }
  function tunnelSummary(tunnel){
    if(!tunnel)return 'Tunnel not checked';
    if(tunnel.public_url)return 'online at '+String(tunnel.public_url);
    if(tunnel.control_enabled===false)return 'control disabled by local policy';
    return statusText(tunnel.status||'unknown');
  }
  function nodeLabel(identity,status){
    return identity?.name||status?.node?.name||activeProfile()?.name||'MMIR Local Node';
  }
  function nodeType(identity,status,hardware){
    return identity?.type||status?.node?.type||hardware?.device_class||hardware?.platform||'local';
  }

  async function pairedConnection(){
    const profile=activeProfile()||{provider:'local-node',url:DEFAULT_LOCAL_URL,name:'MMIR Local Node'};
    const url=cleanUrl(profile.url)||DEFAULT_LOCAL_URL;
    const token=await api.pairIfNeeded(profile,url);
    return {profile,url,headers:api.authHeaders(token)};
  }

  async function fetchSafe(url,options){
    try{return {ok:true,data:await api.fetchJson(url,options)};}
    catch(error){return {ok:false,error};}
  }

  function setPairingCodeStatus(message,state){
    const el=root.querySelector('#node-pairing-code-status');
    if(el){
      el.textContent=message||'';
      el.dataset.state=state||'idle';
    }
  }

  function card(label,value,note){
    return '<article class="node-card"><span>'+safe(label)+'</span><strong>'+safe(value)+'</strong><small>'+safe(note||'')+'</small></article>';
  }

  function doctor(label,state,detail){
    return '<article class="node-doctor-card" data-state="'+safe(state)+'"><span>'+safe(statusText(state))+'</span><strong>'+safe(label)+'</strong><small>'+safe(detail)+'</small></article>';
  }

  function nextAction(checks){
    const first=checks.find(check=>check.state!=='ready');
    if(!first){
      return {
        title:'Node path is ready',
        detail:'You can chat with the live model or add another trusted node when needed.',
        primary:'Chat now',
        target:'#mimir-prompt'
      };
    }
    if(first.id==='connector'){
      return {title:'Install or start MMIR Local Node',detail:'Use the free installer, then return here and refresh. The node should stay on 127.0.0.1 by default.',primary:'Open installer',target:'./downloads/mmir-local-connector-install.html'};
    }
    if(first.id==='pairing'){
      return {title:'Pair this browser with the local node',detail:'MMIR can request a local pairing token automatically. Refresh nodes to retry pairing.',primary:'Refresh nodes',target:'#node-dashboard'};
    }
    if(first.id==='ollama'){
      return {title:'Start Ollama or reinstall local connector',detail:'The node is reachable, but the local model runtime needs attention.',primary:'Local connector',target:'#local-connector'};
    }
    if(first.id==='model'){
      return {title:'Install a free local model',detail:'Pick an installable-free Ollama model, run the installer path, then refresh until it becomes live.',primary:'Model library',target:'#model-library'};
    }
    return {title:'Review node health',detail:first.detail,primary:'Local connector',target:'#local-connector'};
  }

  function bindActions(connection){
    root.querySelector('#node-use-free-local')?.addEventListener('click',()=>{
      window.MimirBackendProfiles?.ensureFreeLocalProfile?.();
      load();
    });
    root.querySelector('#node-refresh-inline')?.addEventListener('click',load);
    root.querySelector('#node-start-tunnel')?.addEventListener('click',async()=>{
      if(!connection)return;
      setSummary('Requesting free local tunnel...','loading');
      await fetchSafe(joinUrl(connection.url,'/tunnels/trycloudflare/start'),{
        method:'POST',
        headers:{...connection.headers,'Content-Type':'application/json'},
        body:'{}',
        timeoutMs:8000
      });
      load();
    });
    root.querySelector('#node-create-pairing-code')?.addEventListener('click',async()=>{
      if(!connection)return;
      setPairingCodeStatus('Creating short-lived pairing code on this device...','loading');
      const result=await fetchSafe(joinUrl(connection.url,'/pairing/sessions'),{
        method:'POST',
        headers:{...connection.headers,'Content-Type':'application/json'},
        body:'{}',
        timeoutMs:6000
      });
      if(!result.ok){
        setPairingCodeStatus(api.friendlyError(result.error),'error');
        return;
      }
      remotePairingCode=result.data;
      setPairingCodeStatus('Pairing code '+String(result.data.code||'')+' expires at '+String(result.data.expires_at||'soon')+'. Enter it on the other device when MMIR asks for a code.','ready');
    });
    root.querySelectorAll('[data-open-target]').forEach(link=>{
      link.addEventListener('click',()=>{
        const target=document.querySelector(link.getAttribute('href'));
        if(target&&target.tagName==='DETAILS')target.open=true;
      });
    });
  }

  function renderError(error){
    const checks=[
      {id:'connector',state:'error',label:'Connector install',detail:api.friendlyError(error)||'MMIR Local Node is not reachable on localhost.'},
      {id:'pairing',state:'warn',label:'Pairing',detail:'Pairing starts after the connector is reachable.'},
      {id:'ollama',state:'warn',label:'Ollama runtime',detail:'Runtime status is checked through the local node.'},
      {id:'model',state:'warn',label:'Model availability',detail:'Live models appear after Ollama/local runtime is online.'}
    ];
    const action=nextAction(checks);
    root.innerHTML=
      '<div class="node-dashboard-grid">'+
        card('Browser client','ready','This page is loaded and can prepare the free local profile.')+
        card('Active node','offline',DEFAULT_LOCAL_URL)+
        card('Models','none','No live models until the local node is running.')+
      '</div>'+
      '<div class="node-doctor-grid">'+checks.map(check=>doctor(check.label,check.state,check.detail)).join('')+'</div>'+
      renderAction(action,false,false);
    bindActions(null);
    setSummary('Install Health Doctor found the local node offline.','error');
  }

  function renderAction(action,canStartTunnel,canCreatePairingCode){
    const target=action.target||'#local-connector';
    const isHash=target.startsWith('#');
    const codeMessage=remotePairingCode?.code
      ? 'Pairing code '+safe(remotePairingCode.code)+' expires at '+safe(remotePairingCode.expires_at||'soon')+'.'
      : 'Create a short-lived code before pairing another device through a tunnel or future control-plane URL.';
    return '<article class="node-next-action"><div><span>Next best action</span><p><strong>'+safe(action.title)+'</strong><br>'+safe(action.detail)+'</p></div>'+
      '<div class="node-dashboard-actions">'+
        (isHash?'<a href="'+safe(target)+'" data-open-target>'+safe(action.primary||'Open')+'</a>':'<a id="node-install-link" href="'+safe(target)+'">'+safe(action.primary||'Open')+'</a>')+
        '<button id="node-use-free-local" type="button">Use free local</button>'+
        '<button id="node-refresh-inline" type="button">Refresh</button>'+
        (canStartTunnel?'<button id="node-start-tunnel" type="button">Start free tunnel</button>':'')+
        (canCreatePairingCode?'<button id="node-create-pairing-code" type="button">Pair another device</button>':'')+
      '</div><p id="node-pairing-code-status" class="node-pairing-code-status" data-state="idle" aria-live="polite">'+codeMessage+'</p></article>';
  }

  function renderReady(connection,status,identity,hardware,models,tunnel){
    const modelCount=Array.isArray(models)?models.length:0;
    const runtimeStatus=status?.runtime?.status||status?.status||'unknown';
    const pairingRequired=status?.pairing?.required!==false;
    const tunnelReady=Boolean(tunnel?.public_url);
    const checks=[
      {id:'connector',state:'ready',label:'Connector install',detail:'MMIR Local Node answered on '+connection.url+'.'},
      {id:'pairing',state:'ready',label:'Pairing',detail:pairingRequired?'This browser has a local pairing token for protected routes.':'Pairing is disabled for this local dev node.'},
      {id:'ollama',state:runtimeStatus==='online'?'ready':'warn',label:'Ollama runtime',detail:runtimeStatus==='online'?'Ollama/local runtime is online.':'Node is up, but local model runtime is '+statusText(runtimeStatus)+'.'},
      {id:'model',state:modelCount?'ready':'warn',label:'Model availability',detail:modelCount?modelSummary(models):'No live model is installed yet. Use a free installable Ollama model.'},
      {id:'hardware',state:hardware?'ready':'warn',label:'Hardware profile',detail:hardware?hardwareSummary(hardware):'Hardware route did not return a profile.'},
      {id:'tunnel',state:tunnelReady?'ready':(tunnel?.control_enabled?'warn':'warn'),label:'Tunnel support',detail:tunnelSummary(tunnel)}
    ];
    const action=nextAction(checks);
    const canStartTunnel=Boolean(tunnel&&tunnel.control_enabled!==false&&!tunnel.public_url);
    root.innerHTML=
      '<div class="node-dashboard-grid">'+
        card('Browser client','ready','Public frontend with local-first controls.')+
        card('Active node',nodeLabel(identity,status),nodeType(identity,status,hardware)+' / '+statusText(status?.status))+
        card('Runtime',statusText(runtimeStatus),status?.runtime?.version?'Ollama '+status.runtime.version:'Local runtime status')+
        card('Models',String(modelCount),modelSummary(models))+
        card('Hardware',hardwareSummary(hardware),hardware?.recommended_model?'Recommended: '+hardware.recommended_model:'Capacity checked locally')+
        card('Tunnel',statusText(tunnel?.status),tunnelSummary(tunnel))+
      '</div>'+
      '<div class="node-doctor-grid">'+checks.map(check=>doctor(check.label,check.state,check.detail)).join('')+'</div>'+
      renderAction(action,canStartTunnel,true);
    bindActions(connection);
    setSummary('Install Health Doctor checked connector, pairing, runtime, models, hardware and tunnel.','ready');
  }

  async function load(){
    if(refreshButton)refreshButton.disabled=true;
    setSummary('Checking node health...','loading');
    try{
      const connection=await pairedConnection();
      const [statusRes,identityRes,hardwareRes,modelsRes,tunnelRes]=await Promise.all([
        fetchSafe(joinUrl(connection.url,'/status'),{timeoutMs:6000}),
        fetchSafe(joinUrl(connection.url,'/node/identity'),{timeoutMs:6000}),
        fetchSafe(joinUrl(connection.url,'/hardware'),{headers:connection.headers,timeoutMs:6000}),
        fetchSafe(joinUrl(connection.url,'/models'),{headers:connection.headers,timeoutMs:9000}),
        fetchSafe(joinUrl(connection.url,'/tunnels/status'),{headers:connection.headers,timeoutMs:6000})
      ]);
      if(!statusRes.ok)throw statusRes.error;
      renderReady(
        connection,
        statusRes.data,
        identityRes.data,
        hardwareRes.ok?hardwareRes.data:null,
        modelsRes.ok?arrayData(modelsRes.data):[],
        tunnelRes.ok?tunnelRes.data:null
      );
    }catch(error){
      renderError(error);
    }finally{
      if(refreshButton)refreshButton.disabled=false;
    }
  }

  if(refreshButton)refreshButton.addEventListener('click',load);
  window.addEventListener('mmir-backend-profiles-updated',load);
  window.addEventListener('mmir-local-connector-refreshed',load);
  window.addEventListener('focus',load);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load);else load();
})();
