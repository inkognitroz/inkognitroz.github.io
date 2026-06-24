(function(){
  const api=window.MimirApiClient;
  const root=document.getElementById('node-dashboard-root');
  const summary=document.getElementById('node-dashboard-summary');
  const refreshButton=document.getElementById('refresh-node-dashboard');
  const DEFAULT_LOCAL_URL='http://127.0.0.1:3000';
  const WORKSPACE_KEY='mimir-active-workspace-v1';
  const DEFAULT_WORKSPACE_ID='personal';
  const REPAIR_RESUME_PREFIX='mimir-repair-resume-v1:';
  const NODE_HANDOFF_PREFIX='mimir-node-handoff-v1:';
  const NODE_HANDOFF_STALE_MS=15*60*1000;
  let remotePairingCode=null;

  if(!root||!api)return;

  function safe(value){return String(value||'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');}
  function setSummary(message,state){if(summary){summary.textContent=message||'';summary.dataset.state=state||'idle';}}
  function activeProfile(){return api.activeProfile?.()||null;}
  function activeWorkspaceId(){try{return localStorage.getItem(WORKSPACE_KEY)||DEFAULT_WORKSPACE_ID;}catch(error){return DEFAULT_WORKSPACE_ID;}}
  function repairResumeKey(){return REPAIR_RESUME_PREFIX+activeWorkspaceId();}
  function nodeHandoffKey(){return NODE_HANDOFF_PREFIX+activeWorkspaceId();}
  function readRepairResume(){
    try{
      const value=JSON.parse(localStorage.getItem(repairResumeKey())||'null');
      return value&&typeof value==='object'?value:null;
    }catch(error){
      return null;
    }
  }
  function readNodeHandoff(){
    try{
      const value=JSON.parse(localStorage.getItem(nodeHandoffKey())||'null');
      return value&&typeof value==='object'?value:null;
    }catch(error){
      return null;
    }
  }
  function storeRepairResume(payload){
    try{
      localStorage.setItem(repairResumeKey(),JSON.stringify({
        ...payload,
        status:'pending',
        at:new Date().toISOString(),
        no_paid_routes_started:true,
        provider_secrets_stored:false,
        raw_prompt_stored:false,
        raw_response_stored:false
      }));
    }catch(error){}
  }
  function storeNodeHandoff(payload){
    try{
      localStorage.setItem(nodeHandoffKey(),JSON.stringify({
        ...payload,
        at:new Date().toISOString(),
        no_paid_routes_started:true,
        provider_secrets_stored:false,
        raw_prompt_stored:false,
        raw_response_stored:false,
        tunnel_policy:'outbound_only_explicit_start'
      }));
    }catch(error){}
  }
  function repairResumeCopy(resume){
    const status=String(resume?.status||'pending');
    const model=String(resume?.model||'').trim();
    if(status==='verified'){
      const count=Number(resume?.model_count||0);
      if(resume?.action==='starter-install-repair')return {state:'verified',title:'Starter repair verified',detail:(model||'The selected starter')+' is installed. MMIR is preparing proof and first chat.',primary:'Send first answer',target:'#mimir-prompt'};
      return {state:'verified',title:'Last repair verified',detail:count?'Connector is online and '+String(count)+' local model'+(count===1?'':'s')+' are visible.':'Connector is online; continue with local model activation.',primary:'Send first answer',target:'#mimir-prompt'};
    }
    if(status==='needs-model'){
      return {state:'needs-model',title:'Connector is back, model needed',detail:'Install or expose one free local model'+(model?' such as '+model:'')+', then MMIR will verify live chat automatically.',primary:'Open model library',target:'#model-library'};
    }
    if(status==='needs-action'){
      return {state:'needs-action',title:'Repair still needs action',detail:String(resume?.note||'The last repair did not make the local node fully ready yet.'),primary:'Continue repair',target:String(resume?.target||'#local-connector')};
    }
    if(status==='checking'){
      return {state:'checking',title:'Repair check running',detail:'MMIR is checking connector, pairing, runtime and models after the install/repair return.',primary:'Refresh node health',target:'#node-dashboard'};
    }
    if(status==='retrying'){
      return {state:'checking',title:'Retrying starter install',detail:'MMIR is retrying '+(model||'the selected starter')+' once now that the local node is back.',primary:'Open chat runtime',target:'#mimir-chat-runtime'};
    }
    if(resume?.action==='starter-install-repair'){
      return {state:'pending',title:'Starter install needs repair',detail:'MMIR kept '+(model||'the selected starter')+' selected. Fix the local node/Ollama path, then retry install/proof.',primary:'Continue repair',target:String(resume?.target||'#node-dashboard')};
    }
    return {state:'pending',title:'Repair path selected',detail:'Return after the installer or repair action; MMIR will resume this path and verify it automatically.',primary:'Resume repair',target:String(resume?.target||'#node-dashboard')};
  }
  function renderRepairResumeBanner(){
    const resume=readRepairResume();
    if(!resume)return '';
    const copy=repairResumeCopy(resume);
    const target=copy.target||'#node-dashboard';
    const isHash=target.startsWith('#');
    return '<article class="node-resume-banner" data-state="'+safe(copy.state)+'">'+
      '<div><span>Repair resume</span><strong>'+safe(copy.title)+'</strong><p>'+safe(copy.detail)+'</p></div>'+
      '<div class="node-dashboard-actions">'+(isHash?'<a href="'+safe(target)+'" data-open-target data-repair-resume-action="'+safe(copy.state)+'">'+safe(copy.primary)+'</a>':'<a href="'+safe(target)+'" data-repair-resume-action="'+safe(copy.state)+'">'+safe(copy.primary)+'</a>')+'</div>'+
    '</article>';
  }
  function handoffResumeCopy(handoff){
    const action=String(handoff?.action||'refresh');
    const stage=String(handoff?.stage||'unknown');
    const target=String(handoff?.target||'#node-dashboard');
    const device=String(handoff?.device||'device');
    const model=String(handoff?.model||'').trim();
    if(nodeHandoffIsStale(handoff))return {state:'stale',title:'Handoff needs refresh',detail:'Last saved handoff is older than 15 minutes. Recheck node health before using this route.',primary:'Refresh node health',target:'#node-dashboard'};
    if(action==='chat-now')return {state:'verified',title:'Chat handoff selected',detail:'Last action moved '+device+' toward first verified chat'+(model?' with '+model:'')+'.',primary:'Return to chat',target:'#mimir-prompt'};
    if(action==='install-model'||action==='repair-model-install')return {state:'pending',title:'Model install handoff saved',detail:'MMIR kept the '+(model||'free starter')+' path selected for '+device+' after refresh.',primary:'Open model library',target:'#model-library'};
    if(action==='start-tunnel')return {state:'checking',title:'Tunnel handoff selected',detail:'Remote access remains outbound-only and paired; raw local runtimes stay private.',primary:'Refresh node health',target:'#node-dashboard'};
    if(action==='install-connector'||stage==='install-connector')return {state:'pending',title:'Node install handoff saved',detail:'Install path for '+device+' is remembered; no paid routes or secrets were started.',primary:'Continue install',target};
    if(action==='pair-browser')return {state:'checking',title:'Pairing handoff saved',detail:'This browser will retry local pairing before model proof or remote handoff.',primary:'Pair / refresh',target:'#node-dashboard'};
    return {state:'checking',title:'Node handoff saved',detail:'Last selected stage '+stage+' is preserved for this workspace without raw prompts or responses.',primary:'Refresh node health',target:'#node-dashboard'};
  }
  function nodeHandoffIsStale(handoff){
    const at=new Date(String(handoff?.at||''));
    if(!Number.isFinite(at.getTime()))return true;
    return Date.now()-at.getTime()>NODE_HANDOFF_STALE_MS;
  }
  function renderNodeHandoffResumeBanner(){
    const handoff=readNodeHandoff();
    if(!handoff)return '';
    const copy=handoffResumeCopy(handoff);
    const target=copy.target||'#node-dashboard';
    const isHash=target.startsWith('#');
    return '<article class="node-handoff-resume" data-state="'+safe(copy.state)+'">'+
      '<div><span>Handoff resume</span><strong>'+safe(copy.title)+'</strong><p>'+safe(copy.detail)+'</p><small>no_paid_routes_started:true / provider_secrets_stored:false / raw_prompt_stored:false</small></div>'+
      '<div class="node-dashboard-actions">'+(isHash?'<a href="'+safe(target)+'" data-open-target data-node-handoff-resume-action="'+safe(copy.state)+'">'+safe(copy.primary)+'</a>':'<a href="'+safe(target)+'" data-node-handoff-resume-action="'+safe(copy.state)+'">'+safe(copy.primary)+'</a>')+'</div>'+
    '</article>';
  }
  function cleanUrl(value){return api.cleanUrl(value);}
  function joinUrl(base,path){return api.joinUrl(base,path);}
  function statusText(value){return String(value||'unknown').replaceAll('-',' ');}
  function arrayData(value){return Array.isArray(value?.data)?value.data:(Array.isArray(value?.models)?value.models:[]);}
  function modelSummary(models){
    if(!Array.isArray(models)||!models.length)return 'Free browser route ready; install a local model for private live chat';
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
  function modelDisk(model){
    return model?.resources?.disk_label||(
      model?.details?.size?String(Math.round((Number(model.details.size)/1024/1024/1024)*10)/10)+' GB':'unknown'
    );
  }
  function modelRam(model){
    const ram=model?.resources?.estimated_ram_gb;
    if(!ram)return 'unknown';
    return String(ram)+' GB estimated';
  }
  function modelFit(model){
    const fit=model?.resources?.fits_memory;
    if(fit===true)return 'fits this node';
    if(fit===false)return 'may exceed RAM';
    return 'fit unknown';
  }
  function modelModified(model){
    return model?.details?.modified_at?String(model.details.modified_at).slice(0,10):'not reported';
  }
  function detectDevice(hardware){
    const platform=String(hardware?.platform||navigator.platform||navigator.userAgent||'').toLowerCase();
    const arch=String(hardware?.arch||navigator.userAgent||'').toLowerCase();
    if(platform.includes('raspberry')||arch.includes('arm')&&platform.includes('linux'))return {label:'Raspberry Pi / Linux ARM',installer:'./downloads/mmir-local-connector-install.html',model:'qwen3:0.6b',note:'Use the Linux installer; it detects raspberry-pi and keeps starter models small.'};
    if(platform.includes('linux'))return {label:'Linux / VM',installer:'./downloads/mmir-local-connector-linux.sh',model:'qwen3:0.6b',note:'Run the Linux connector on the VM or local device, then refresh this dashboard.'};
    if(platform.includes('mac'))return {label:'macOS',installer:'./downloads/mmir-local-connector-install.html#terminal-install',model:'gemma3:270m',note:'Use the Terminal curl command. ZIP, .command and DMG artifacts are advanced fallbacks until signing/notarization is production-ready.'};
    if(platform.includes('win'))return {label:'Windows',installer:'./downloads/mmir-local-connector-windows.cmd',model:'llama3.2:1b',note:'Use the Windows bootstrap, keep the connector on 127.0.0.1, then refresh.'};
    return {label:'This device',installer:'./downloads/mmir-local-connector-install.html',model:'qwen3:0.6b',note:'Use the universal installer, then return here for pairing and model proof.'};
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

  function remotePairingSummary(){
    if(remotePairingCode?.code)return {label:'Pairing code live',detail:'Code '+String(remotePairingCode.code)+' expires '+String(remotePairingCode.expires_at||'soon')+'.',state:'ready'};
    return {label:'Pairing code idle',detail:'Create a short-lived code only when another trusted device needs this node.',state:'next'};
  }

  function syncPairingSummary(message,state){
    const el=root.querySelector('#node-handoff-pairing-summary');
    if(!el)return;
    const pairing=remotePairingSummary();
    el.dataset.state=state||pairing.state;
    el.innerHTML='<strong>'+safe(pairing.label)+'</strong><small>'+safe(message||pairing.detail)+'</small>';
  }

  function setPairingCodeStatus(message,state){
    const el=root.querySelector('#node-pairing-code-status');
    if(el){
      el.textContent=message||'';
      el.dataset.state=state||'idle';
    }
    syncPairingSummary(message,state);
  }

  function card(label,value,note){
    return '<article class="node-card"><span>'+safe(label)+'</span><strong>'+safe(value)+'</strong><small>'+safe(note||'')+'</small></article>';
  }

  function doctor(label,state,detail){
    return '<article class="node-doctor-card" data-state="'+safe(state)+'"><span>'+safe(statusText(state))+'</span><strong>'+safe(label)+'</strong><small>'+safe(detail)+'</small></article>';
  }

  function guidedDeviceRepair(checks,hardware,tunnel){
    const first=checks.find(check=>check.state!=='ready')||{id:'ready',detail:'Local path is ready.'};
    const device=detectDevice(hardware);
    const base={device,source:'Local Node Doctor',primary:'Open installer',target:device.installer,action:'install-connector'};
    if(first.id==='connector'){
      return {...base,title:'Install connector for '+device.label,detail:device.note,steps:['Install MMIR Local Connector','Keep Ollama/private runtime on localhost','Return and refresh node health']};
    }
    if(first.id==='pairing'){
      return {...base,action:'pair-browser',title:'Pair this browser',detail:'Create or refresh a local pairing token before model, chat or tunnel routes are used.',primary:'Refresh nodes',target:'#node-dashboard',steps:['Refresh nodes','Create short-lived code for another device if needed','Never paste pairing tokens into public places']};
    }
    if(first.id==='ollama'){
      return {...base,action:'start-ollama',title:'Start Ollama on '+device.label,detail:'The connector is reachable, but the local runtime is offline. Start Ollama or rerun the connector installer.',steps:['Start Ollama','Rerun connector installer if Ollama is missing','Refresh and let autopilot retry proof']};
    }
    if(first.id==='model-pull'||first.id==='model_pull'){
      return {...base,action:'repair-model-pull',title:'Repair model install',detail:first.detail||'A model pull needs retry or a smaller starter model.',primary:'Model library',target:'#model-library',steps:['Open Model library','Retry '+device.model+' or another small free model','Wait for install-to-first-chat bridge']};
    }
    if(first.id==='model'){
      return {...base,action:'install-model',title:'Install '+device.model+' for '+device.label,detail:'No local chat model is available yet. Use the free starter that fits this device first.',primary:'Model library',target:'#model-library',steps:['Open Model library','Install '+device.model,'Autopilot will refresh proof after install']};
    }
    if(first.id==='tunnel'&&tunnel?.control_enabled){
      return {...base,action:'start-tunnel',title:'Start optional tunnel only if needed',detail:'Local chat works without a tunnel. Use tunnel only for another trusted device.',primary:'Start free tunnel',target:'#node-start-tunnel',steps:['Keep raw Ollama private','Start tunnel only after pairing','Use short-lived remote pairing code']};
    }
    return {...base,action:'chat-now',title:'Local path ready',detail:'Connector, pairing, runtime and models are ready for this device.',primary:'Chat now',target:'#mimir-prompt',steps:['Use verified chat','Add another node only when needed','Keep paid/provider routes approval-gated']};
  }

  function blockingCheck(checks){
    return checks.find(check=>check.state!=='ready'&&check.id!=='tunnel')||checks.find(check=>check.state!=='ready')||null;
  }

  function handoffStage(checks,tunnel,models){
    const first=blockingCheck(checks);
    if(!first)return {id:tunnel?.public_url?'remote-ready':'chat-ready',check:null};
    if(first.id==='connector')return {id:'install-connector',check:first};
    if(first.id==='pairing')return {id:'pair-browser',check:first};
    if(first.id==='ollama')return {id:'start-runtime',check:first};
    if(first.id==='model-pull'||first.id==='model_pull')return {id:'repair-model-install',check:first};
    if(first.id==='model')return {id:'install-model',check:first};
    if(first.id==='tunnel'&&tunnel?.control_enabled&&!tunnel.public_url)return {id:'optional-tunnel',check:first};
    if(Array.isArray(models)&&models.length)return {id:'chat-ready',check:null};
    return {id:'review-health',check:first};
  }

  function nodeHandoffPlan(checks,hardware,tunnel,models){
    const device=detectDevice(hardware);
    const stage=handoffStage(checks,tunnel,models);
    const tunnelEnabled=Boolean(tunnel&&tunnel.control_enabled!==false);
    const tunnelOnline=Boolean(tunnel?.public_url);
    const base={
      stage:stage.id,
      device,
      model:device.model,
      tunnelEnabled,
      tunnelOnline,
      badges:['Desktop','VM/server','Raspberry Pi/Linux ARM','Phone/tablet client'],
      steps:[
        {id:'install',label:'Install node',ready:!['install-connector'].includes(stage.id)},
        {id:'pair',label:'Pair browser',ready:!['install-connector','pair-browser'].includes(stage.id)},
        {id:'model',label:'Live model',ready:['chat-ready','remote-ready','optional-tunnel'].includes(stage.id)},
        {id:'proof',label:'Proof/chat',ready:['chat-ready','remote-ready','optional-tunnel'].includes(stage.id)}
      ],
      secondary:tunnelEnabled&&!tunnelOnline?{label:'Start free tunnel',action:'start-tunnel',target:'#node-start-tunnel'}:null
    };
    if(stage.id==='install-connector'){
      return {...base,title:'MMIR will set up the free local node path',detail:'Use this device, a Linux VM or Raspberry Pi. The public site only prepares the free profile; the node stays private on localhost until you explicitly pair or start an outbound tunnel.',primary:'Install node',action:'install-connector',target:device.installer};
    }
    if(stage.id==='pair-browser'){
      return {...base,title:'Pair this browser automatically',detail:'The connector is reachable. MMIR will refresh pairing through the local node before model, chat or tunnel routes are used.',primary:'Pair / refresh',action:'pair-browser',target:'#node-dashboard'};
    }
    if(stage.id==='start-runtime'){
      return {...base,title:'Start the local runtime',detail:'The node answered, but Ollama or the local runtime is not online yet. Run the installer repair path and MMIR will resume proof after return.',primary:'Open local connector',action:'start-runtime',target:'#local-connector'};
    }
    if(stage.id==='repair-model-install'){
      return {...base,title:'Repair the model install',detail:stage.check?.detail||'The model pull needs retry or a smaller free starter model for this device.',primary:'Retry free model',action:'repair-model-install',target:'#model-library'};
    }
    if(stage.id==='install-model'){
      return {...base,title:'Install one free starter model',detail:'No live local chat model is visible yet. Start with '+device.model+' for '+device.label+', then MMIR returns to proof and first chat.',primary:'Install free model',action:'install-model',target:'#model-library'};
    }
    if(stage.id==='optional-tunnel'){
      return {...base,title:'Local chat is ready; tunnel is optional',detail:'Use an outbound tunnel only when another trusted device needs this node. Do not expose raw Ollama or inbound ports.',primary:'Chat now',action:'chat-now',target:'#mimir-prompt',secondary:{label:'Start free tunnel',action:'start-tunnel',target:'#node-start-tunnel'}};
    }
    if(stage.id==='remote-ready'){
      return {...base,title:'Trusted node is reachable from another device',detail:'Tunnel is online after pairing. Use it as a temporary trusted route and keep raw runtimes private.',primary:'Chat now',action:'chat-now',target:'#mimir-prompt'};
    }
    if(stage.id==='chat-ready'){
      return {...base,title:'Local model path is ready',detail:'Connector, pairing, runtime and at least one model are available. MMIR can prove and send the first answer now.',primary:'Chat now',action:'chat-now',target:'#mimir-prompt'};
    }
    return {...base,title:'Review node health',detail:stage.check?.detail||'MMIR found a node state that needs attention before proof.',primary:'Refresh nodes',action:'review-health',target:'#node-dashboard'};
  }

  function tunnelAccessSummary(plan,tunnel){
    if(tunnel?.public_url)return {label:'Remote device ready',detail:'Tunnel is online at '+String(tunnel.public_url)+'. Pair the other trusted device with a short-lived code from this node.',state:'ready'};
    if(tunnel?.control_enabled===false)return {label:'Local-only path',detail:'Tunnel control is disabled by local policy. This node stays private to this device unless policy changes locally.',state:'next'};
    if(plan.stage==='optional-tunnel')return {label:'Remote access optional',detail:'Local chat is already ready. Start the outbound tunnel only when another trusted device actually needs this node.',state:'next'};
    return {label:'Remote access pending',detail:'Finish local install, pairing and model proof first. MMIR keeps the remote path closed until the node is ready.',state:'next'};
  }

  function renderNodeHandoff(plan,tunnel){
    const target=plan.target||'#node-dashboard';
    const isHash=target.startsWith('#');
    const actionAttrs=' data-node-handoff-action="'+safe(plan.action)+'" data-node-handoff-stage="'+safe(plan.stage)+'" data-node-handoff-target="'+safe(target)+'" data-node-handoff-device="'+safe(plan.device.label)+'" data-node-handoff-model="'+safe(plan.model)+'"';
    const access=tunnelAccessSummary(plan,tunnel);
    const pairing=remotePairingSummary();
    const primary=isHash
      ? '<a href="'+safe(target)+'" data-open-target'+actionAttrs+'>'+safe(plan.primary)+'</a>'
      : '<a href="'+safe(target)+'"'+actionAttrs+'>'+safe(plan.primary)+'</a>';
    const secondary=plan.secondary
      ? '<button type="button"'+actionAttrs.replace('data-node-handoff-action="'+safe(plan.action)+'"','data-node-handoff-action="'+safe(plan.secondary.action)+'"').replace('data-node-handoff-target="'+safe(target)+'"','data-node-handoff-target="'+safe(plan.secondary.target)+'"')+'>'+safe(plan.secondary.label)+'</button>'
      : '';
    return '<article id="node-tunnel-handoff" class="node-handoff-card" data-stage="'+safe(plan.stage)+'">'+
      '<div class="node-handoff-copy"><span>Automatic node handoff</span><h3>'+safe(plan.title)+'</h3><p>'+safe(plan.detail)+'</p><small>Free-first / outbound tunnel only / no public secrets / no paid routes started</small></div>'+
      '<div class="node-handoff-status" aria-label="Remote handoff state">'+
        '<article data-state="'+safe(access.state)+'"><strong>'+safe(access.label)+'</strong><small>'+safe(access.detail)+'</small></article>'+
        '<article data-state="'+safe(pairing.state)+'" id="node-handoff-pairing-summary"><strong>'+safe(pairing.label)+'</strong><small>'+safe(pairing.detail)+'</small></article>'+
      '</div>'+
      '<div class="node-handoff-rail">'+plan.steps.map(step=>'<em data-state="'+(step.ready?'ready':'next')+'">'+safe(step.label)+'</em>').join('')+'</div>'+
      '<div class="node-handoff-devices">'+plan.badges.map(badge=>'<strong>'+safe(badge)+'</strong>').join('')+'</div>'+
      '<div class="node-dashboard-actions">'+primary+secondary+'<button type="button" data-node-handoff-action="refresh" data-node-handoff-stage="'+safe(plan.stage)+'" data-node-handoff-target="#node-dashboard" data-node-handoff-device="'+safe(plan.device.label)+'" data-node-handoff-model="'+safe(plan.model)+'">Refresh</button></div>'+
    '</article>';
  }

  function renderDeviceRepair(guide){
    const target=guide.target||'#local-connector';
    const isHash=target.startsWith('#');
    return '<article class="node-repair-card" data-device="'+safe(guide.device.label)+'">'+
      '<div><span>Guided device repair</span><h3>'+safe(guide.title)+'</h3><p>'+safe(guide.detail)+'</p><small>'+safe(guide.source)+' / '+safe(guide.device.label)+' / starter '+safe(guide.device.model)+'</small></div>'+
      '<ol>'+guide.steps.map(step=>'<li>'+safe(step)+'</li>').join('')+'</ol>'+
      '<div class="node-model-actions">'+(isHash?'<a href="'+safe(target)+'" data-open-target data-device-repair-action="'+safe(guide.action)+'" data-repair-device="'+safe(guide.device.label)+'" data-repair-model="'+safe(guide.device.model)+'">'+safe(guide.primary)+'</a>':'<a href="'+safe(target)+'" data-device-repair-action="'+safe(guide.action)+'" data-repair-device="'+safe(guide.device.label)+'" data-repair-model="'+safe(guide.device.model)+'">'+safe(guide.primary)+'</a>')+'</div>'+
    '</article>';
  }

  function nextAction(checks,hardware){
    const first=blockingCheck(checks);
    const device=detectDevice(hardware);
    if(!first){
      return {
        title:'Node path is ready',
        detail:'You can chat with the live model or add another trusted node when needed.',
        primary:'Chat now',
        target:'#mimir-prompt'
      };
    }
    if(first.id==='connector'){
      return {title:'Install or start MMIR Local Node',detail:device.note+' The node should stay on 127.0.0.1 by default.',primary:'Install on '+device.label,target:device.installer};
    }
    if(first.id==='pairing'){
      return {title:'Pair this browser with the local node',detail:'MMIR can request a local pairing token automatically. Refresh nodes to retry pairing.',primary:'Refresh nodes',target:'#node-dashboard'};
    }
    if(first.id==='ollama'){
      return {title:'Start Ollama or reinstall local connector',detail:'The node is reachable, but the local model runtime needs attention. '+device.note,primary:'Local connector',target:'#local-connector'};
    }
    if(first.id==='model-pull'||first.id==='model_pull'){
      return {title:'Repair model install',detail:first.detail||('The last model install did not complete. Retry the free '+device.model+' install from the model library.'),primary:'Model library',target:'#model-library'};
    }
    if(first.id==='model'){
      return {title:'Install a free local model',detail:'Pick an installable-free Ollama model such as '+device.model+', run the installer path, then refresh until it becomes live.',primary:'Model library',target:'#model-library'};
    }
    if(first.id==='tunnel'){
      return {title:'Chat locally now; tunnel is optional',detail:'Local chat does not need a tunnel. Start an outbound tunnel only for another trusted device after pairing.',primary:'Chat now',target:'#mimir-prompt'};
    }
    return {title:'Review node health',detail:first.detail,primary:'Local connector',target:'#local-connector'};
  }

  function normalizedDoctor(report,hardware){
    if(!report||!Array.isArray(report.checks)||!report.checks.length)return null;
    const checks=report.checks.map(check=>({
      id:String(check.id||'doctor'),
      state:['ready','warn','error'].includes(String(check.state||''))?String(check.state):'warn',
      label:String(check.label||check.id||'Doctor check'),
      detail:String(check.detail||'Local doctor reported this gate.')
    }));
    const fallbackAction=nextAction(checks,hardware);
    const action=report.next_action&&report.next_action.title&&!['start-ollama','install-model','repair-model-pull','repair-model-install'].includes(String(report.next_action.id||''))?{
      title:String(report.next_action.title),
      detail:String(report.next_action.detail||'Follow the safest next activation step.'),
      primary:String(report.next_action.primary||'Open'),
      target:String(report.next_action.target||'#local-connector')
    }:fallbackAction;
    return {checks,action,status:String(report.status||'unknown')};
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
    root.querySelectorAll('[data-device-repair-action]').forEach(link=>{
      link.addEventListener('click',(event)=>{
        const action=link.getAttribute('data-device-repair-action')||'repair';
        const targetHref=link.getAttribute('href')||'';
        storeRepairResume({
          action,
          target:targetHref,
          device:link.getAttribute('data-repair-device')||'device',
          model:link.getAttribute('data-repair-model')||''
        });
        window.MimirActivationTelemetry?.record?.('device-repair-action',{
          status:'selected',
          model:link.getAttribute('data-repair-model')||'',
          route:link.getAttribute('data-repair-device')||'device',
          free:true,
          note:'Repair card selected: '+action+' -> '+targetHref
        });
        if(targetHref==='#node-start-tunnel'){
          event.preventDefault();
          document.getElementById('node-start-tunnel')?.click();
        }
      });
    });
    root.querySelectorAll('[data-repair-resume-action]').forEach(link=>{
      link.addEventListener('click',()=>{
        window.MimirActivationTelemetry?.record?.('repair-resume-action',{
          status:link.getAttribute('data-repair-resume-action')||'selected',
          route:link.getAttribute('href')||'#node-dashboard',
          free:true,
          note:'Node Dashboard repair resume action selected.'
        });
        if((link.getAttribute('href')||'')==='#mimir-prompt'&&link.getAttribute('data-repair-resume-action')==='verified'){
          document.getElementById('mimir-prompt')?.focus();
          window.setTimeout(()=>document.getElementById('primary-chat-link')?.click(),40);
        }
      });
    });
    root.querySelectorAll('[data-node-handoff-resume-action]').forEach(link=>{
      link.addEventListener('click',()=>{
        window.MimirActivationTelemetry?.record?.('node-handoff-resume-action',{
          status:link.getAttribute('data-node-handoff-resume-action')||'selected',
          route:link.getAttribute('href')||'#node-dashboard',
          free:true,
          note:'Node handoff resume action selected. no_paid_routes_started:true.'
        });
        if((link.getAttribute('href')||'')==='#mimir-prompt'){
          document.getElementById('mimir-prompt')?.focus();
          window.setTimeout(()=>document.getElementById('primary-chat-link')?.click(),40);
        }
      });
    });
    root.querySelectorAll('[data-node-handoff-action]').forEach(control=>{
      control.addEventListener('click',(event)=>{
        const action=control.getAttribute('data-node-handoff-action')||'refresh';
        const target=control.getAttribute('data-node-handoff-target')||control.getAttribute('href')||'#node-dashboard';
        const payload={
          action,
          stage:control.getAttribute('data-node-handoff-stage')||'unknown',
          target,
          device:control.getAttribute('data-node-handoff-device')||'device',
          model:control.getAttribute('data-node-handoff-model')||''
        };
        storeNodeHandoff(payload);
        window.MimirActivationTelemetry?.record?.('node-handoff-action',{
          status:action,
          model:payload.model,
          route:payload.device,
          free:true,
          note:'Node handoff selected: '+action+' -> '+target+'. no_paid_routes_started:true.'
        });
        if(action==='refresh'||action==='pair-browser'||action==='review-health'){
          event.preventDefault();
          window.MimirBackendProfiles?.ensureFreeLocalProfile?.();
          load();
          return;
        }
        if(action==='start-tunnel'){
          event.preventDefault();
          document.getElementById('node-start-tunnel')?.click();
          return;
        }
        if(action==='install-model'||action==='repair-model-install'){
          const library=document.getElementById('model-library');
          if(library&&'open' in library)library.open=true;
          window.dispatchEvent(new CustomEvent('mmir-model-library-focus-recommended',{detail:{source:'node-handoff',no_paid_routes_started:true}}));
        }
        if(action==='chat-now'){
          document.getElementById('mimir-prompt')?.focus();
          window.setTimeout(()=>document.getElementById('primary-chat-link')?.click(),40);
        }
      });
    });
    root.querySelectorAll('[data-delete-model]').forEach(button=>{
      button.addEventListener('click',async()=>{
        if(!connection)return;
        const model=button.getAttribute('data-delete-model')||'';
        if(!model||!window.confirm('Remove '+model+' from this local node?'))return;
        setSummary('Removing local model '+model+'...','loading');
        const result=await fetchSafe(joinUrl(connection.url,'/models/delete'),{
          method:'POST',
          headers:{...connection.headers,'Content-Type':'application/json'},
          body:JSON.stringify({model}),
          timeoutMs:30000
        });
        if(!result.ok){
          setSummary(api.friendlyError(result.error),'error');
          return;
        }
        load();
      });
    });
  }

  function renderError(error){
    const checks=[
      {id:'connector',state:'error',label:'Connector install',detail:api.friendlyError(error)||'MMIR Local Node is not reachable on localhost.'},
      {id:'pairing',state:'warn',label:'Pairing',detail:'Pairing starts after the connector is reachable.'},
      {id:'ollama',state:'warn',label:'Ollama runtime',detail:'Runtime status is checked through the local node.'},
      {id:'model-pull',state:'warn',label:'Model install',detail:'Model install jobs are checked after the connector is reachable.'},
      {id:'model',state:'warn',label:'Model availability',detail:'Live models appear after Ollama/local runtime is online.'}
    ];
    const action=nextAction(checks,null);
    const guide=guidedDeviceRepair(checks,null,null);
    const plan=nodeHandoffPlan(checks,null,null,[]);
    root.innerHTML=
      renderRepairResumeBanner()+
      renderNodeHandoffResumeBanner()+
      '<div class="node-dashboard-grid">'+
        card('Browser client','ready','This page is loaded and can prepare the free local profile.')+
        card('Active node','offline',DEFAULT_LOCAL_URL)+
        card('Models','free route','Install a local model when the node is running.')+
      '</div>'+
      renderNodeHandoff(plan,null)+
      '<div class="node-doctor-grid">'+checks.map(check=>doctor(check.label,check.state,check.detail)).join('')+'</div>'+
      renderDeviceRepair(guide)+
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
  function renderModelManager(models){
    if(!Array.isArray(models)||!models.length){
      return '<section class="node-model-manager"><div class="node-model-manager-head"><div><span>Local model manager</span><h3>No installed model yet</h3></div><p>Install a free Ollama model from the chat model list, then it appears here with disk/RAM impact and safe removal.</p></div></section>';
    }
    const cards=models.map(model=>{
      const id=model.id||model.name||model.model||'model';
      return '<article class="node-model-card">'+
        '<div><h4>'+safe(id)+'</h4><span>'+safe(model.recommended?'recommended':'local model')+'</span></div>'+
        '<dl>'+
          '<div><dt>Disk</dt><dd>'+safe(modelDisk(model))+'</dd></div>'+
          '<div><dt>RAM</dt><dd>'+safe(modelRam(model))+'</dd></div>'+
          '<div><dt>Fit</dt><dd>'+safe(modelFit(model))+'</dd></div>'+
          '<div><dt>Updated</dt><dd>'+safe(modelModified(model))+'</dd></div>'+
        '</dl>'+
        '<div class="node-model-actions"><a href="#mimir-prompt" data-open-target>Chat</a><button type="button" data-delete-model="'+safe(id)+'">Remove</button></div>'+
      '</article>';
    }).join('');
    return '<section class="node-model-manager"><div class="node-model-manager-head"><div><span>Local model manager</span><h3>Installed models</h3></div><p>Manage local models without terminal commands. Deleting only affects this local Ollama runtime.</p></div><div class="node-model-grid">'+cards+'</div></section>';
  }

  function renderReady(connection,status,identity,hardware,models,tunnel,doctorReport){
    const modelCount=Array.isArray(models)?models.length:0;
    const runtimeStatus=status?.runtime?.status||status?.status||'unknown';
    const pairingRequired=status?.pairing?.required!==false;
    const tunnelReady=Boolean(tunnel?.public_url);
    const fallbackChecks=[
      {id:'connector',state:'ready',label:'Connector install',detail:'MMIR Local Node answered on '+connection.url+'.'},
      {id:'pairing',state:'ready',label:'Pairing',detail:pairingRequired?'This browser has a local pairing token for protected routes.':'Pairing is disabled for this local dev node.'},
      {id:'ollama',state:runtimeStatus==='online'?'ready':'warn',label:'Ollama runtime',detail:runtimeStatus==='online'?'Ollama/local runtime is online.':'Node is up, but local model runtime is '+statusText(runtimeStatus)+'.'},
      {id:'model-pull',state:'ready',label:'Model install',detail:'No blocked model pull jobs reported by browser fallback checks.'},
      {id:'model',state:modelCount?'ready':'warn',label:'Model availability',detail:modelCount?modelSummary(models):'Use a free installable Ollama model to activate private live chat.'},
      {id:'hardware',state:hardware?'ready':'warn',label:'Hardware profile',detail:hardware?hardwareSummary(hardware):'Hardware route did not return a profile.'},
      {id:'tunnel',state:tunnelReady?'ready':(tunnel?.control_enabled?'warn':'warn'),label:'Tunnel support',detail:tunnelSummary(tunnel)}
    ];
    const report=normalizedDoctor(doctorReport,hardware);
    const checks=report?.checks||fallbackChecks;
    const action=report?.action||nextAction(checks,hardware);
    const doctorSource=report?'Local Node Doctor':'Browser fallback doctor';
    const guide=guidedDeviceRepair(checks,hardware,tunnel);
    const plan=nodeHandoffPlan(checks,hardware,tunnel,models);
    const canStartTunnel=Boolean(tunnel&&tunnel.control_enabled!==false&&!tunnel.public_url);
    root.innerHTML=
      renderRepairResumeBanner()+
      renderNodeHandoffResumeBanner()+
      '<div class="node-dashboard-grid">'+
        card('Browser client','ready','Public frontend with local-first controls.')+
        card('Active node',nodeLabel(identity,status),nodeType(identity,status,hardware)+' / '+statusText(status?.status))+
        card('Runtime',statusText(runtimeStatus),status?.runtime?.version?'Ollama '+status.runtime.version:'Local runtime status')+
        card('Models',String(modelCount),modelSummary(models))+
        card('Hardware',hardwareSummary(hardware),hardware?.recommended_model?'Recommended: '+hardware.recommended_model:'Capacity checked locally')+
        card('Tunnel',statusText(tunnel?.status),tunnelSummary(tunnel))+
        card('Doctor source',doctorSource,report?'Status: '+statusText(report.status):'Connector does not expose /doctor yet')+
      '</div>'+
      renderNodeHandoff(plan,tunnel)+
      '<div class="node-doctor-grid">'+checks.map(check=>doctor(check.label,check.state,check.detail)).join('')+'</div>'+
      renderDeviceRepair(guide)+
      renderModelManager(models)+
      renderAction(action,canStartTunnel,true);
    bindActions(connection);
    setSummary(doctorSource+' checked connector, pairing, runtime, model pull, models, hardware and tunnel.','ready');
  }

  async function load(){
    if(refreshButton)refreshButton.disabled=true;
    setSummary('Checking node health...','loading');
    try{
      const connection=await pairedConnection();
      const [statusRes,identityRes,hardwareRes,modelsRes,tunnelRes,doctorRes]=await Promise.all([
        fetchSafe(joinUrl(connection.url,'/status'),{timeoutMs:6000}),
        fetchSafe(joinUrl(connection.url,'/node/identity'),{timeoutMs:6000}),
        fetchSafe(joinUrl(connection.url,'/hardware'),{headers:connection.headers,timeoutMs:6000}),
        fetchSafe(joinUrl(connection.url,'/models'),{headers:connection.headers,timeoutMs:9000}),
        fetchSafe(joinUrl(connection.url,'/tunnels/status'),{headers:connection.headers,timeoutMs:6000}),
        fetchSafe(joinUrl(connection.url,'/doctor'),{headers:connection.headers,timeoutMs:7000})
      ]);
      if(!statusRes.ok)throw statusRes.error;
      if(doctorRes.ok)window.dispatchEvent(new CustomEvent('mmir-local-doctor-updated',{detail:doctorRes.data}));
      renderReady(
        connection,
        statusRes.data,
        identityRes.data,
        hardwareRes.ok?hardwareRes.data:null,
        modelsRes.ok?arrayData(modelsRes.data):[],
        tunnelRes.ok?tunnelRes.data:null,
        doctorRes.ok?doctorRes.data:null
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
  window.addEventListener('mmir-repair-resume-started',load);
  window.addEventListener('mmir-starter-install-repair-opened',load);
  window.addEventListener('focus',load);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load);else load();
})();
