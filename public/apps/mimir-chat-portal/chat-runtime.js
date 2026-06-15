(function(){
  const api=window.MimirApiClient;
  const PROFILE_KEY='mimir-chat-backend-profiles';
  const ROLE_KEY='mimir-chat-active-role';
  const WORKSPACE_KEY='mimir-active-workspace-v1';
  const DEFAULT_WORKSPACE_ID='personal';
  const MEMORY_PREFIX='mimir-memory-v1:';
  const MEMORY_USE_PREFIX='mimir-memory-use-v1:';
  const KNOWLEDGE_PREFIX='mimir-knowledge-v1:';
  const COLLECTIONS_PREFIX='mimir-knowledge-collections-v1:';
  const CONTEXT_CONTROLS_PREFIX='mimir-context-controls-v1:';
  const CHAT_KEY='mimir-chat-current-session-v1';
  const MODE_KEY='mimir-chat-mode-controls-v1';
  const RUNTIME_SETTINGS_KEY='mimir-runtime-settings-v1';
  const FIRST_CHAT_RECEIPT_PREFIX='mimir-first-chat-receipt-v1:';
  const ACTIVATION_REPLAY_PREFIX='mimir-activation-replay-v1:';
  const REPAIR_RESUME_PREFIX='mimir-repair-resume-v1:';
  const STARTER_MODEL_CATALOG='./free-model-starters.json?v=20260531-atlas-ux-v1';
  const STARTER_PREFIX='starter:';
  const SUPERGENIUS_LABEL='Supergeni';
  const MAX_STORED_MESSAGES=80;
  const MAX_CONTEXT_MESSAGES=24;
  const promptEl=document.getElementById('mimir-prompt');
  const formEl=document.querySelector('.mimir-composer');
  const primaryLink=document.getElementById('primary-chat-link');
  const chatCenter=document.querySelector('.mimir-chat-center');
  let modelSelect=null;
  let statusEl=null;
  let transcriptEl=null;
  let modelHelperEl=null;
  let replayEl=null;
  let modelChipEl=null;
  let nodeChipEl=null;
  let privacyChipEl=null;
  let tunnelChipEl=null;
  let resourceChipEl=null;
  let proofEl=null;
  let refreshBtn=null;
  let stopBtn=null;
  let clearBtn=null;
  let deleteModelBtn=null;
  const speechApiSupported=()=>Boolean(window.SpeechRecognition||window.webkitSpeechRecognition);
  let currentModelInstall=null;
  let modelInstallPollTimer=null;
  let currentAbortController=null;
  let stopRequested=false;
  let lastActiveId='';
  let currentChatKey='';
  let pendingWorkspaceSwitch=false;
  let busy=false;
  let messages=[];
  let starterModels=fallbackStarterModels();
  let webllmModule=null;
  let webllmEngine=null;
  let webllmModelId='';
  let lastBackendMemoryUses=[];
  let lastBackendKnowledgeUses=[];
  let lastKnowledgeUses=[];
  let lastProofSignature='';
  let verifiedLiveModel=null;
  let lastRenderedModels=[];
  let preferredProofModel='';
  let pendingStarterHandoff=null;
  let pendingAutoFirstAnswer=false;

  function p0ReadyShell(){
    return Boolean(document.body?.classList.contains('mmir-p0-ready')||document.getElementById('mmir-p0-app'));
  }

  function readProfiles(){return api.readProfiles();}
  function activeId(){return api.activeId();}
  function activeProfile(){return api.activeProfile();}
  function cleanUrl(value){return api.cleanUrl(value);}
  function joinUrl(base,path){return api.joinUrl(base,path);}
  function activeWorkspaceId(){return localStorage.getItem(WORKSPACE_KEY)||DEFAULT_WORKSPACE_ID;}
  function repairResumeKey(){return REPAIR_RESUME_PREFIX+activeWorkspaceId();}
  function readRepairResume(){
    try{
      const value=JSON.parse(localStorage.getItem(repairResumeKey())||'null');
      return value&&typeof value==='object'?value:null;
    }catch(error){
      return null;
    }
  }
  function writeRepairResume(payload){
    const resume={...payload,status:payload?.status||'pending',at:new Date().toISOString(),no_paid_routes_started:true,provider_secrets_stored:false,raw_prompt_stored:false,raw_response_stored:false};
    try{localStorage.setItem(repairResumeKey(),JSON.stringify(resume));}catch(error){}
    window.dispatchEvent(new CustomEvent('mmir-repair-resume-started',{detail:resume}));
    return resume;
  }
  function chatStorageKey(){return CHAT_KEY+':'+activeWorkspaceId();}
  function memoryStorageKey(){return MEMORY_PREFIX+activeWorkspaceId();}
  function memoryUseStorageKey(){return MEMORY_USE_PREFIX+activeWorkspaceId();}
  function knowledgeStorageKey(){return KNOWLEDGE_PREFIX+activeWorkspaceId();}
  function knowledgeCollectionsStorageKey(){return COLLECTIONS_PREFIX+activeWorkspaceId();}
  function contextControlsKey(){return CONTEXT_CONTROLS_PREFIX+activeWorkspaceId();}
  function contextControls(){try{return JSON.parse(localStorage.getItem(contextControlsKey())||'{}')||{};}catch(error){return {};}}
  function firstChatReceiptStorageKey(){return FIRST_CHAT_RECEIPT_PREFIX+activeWorkspaceId();}
  function activationReplayStorageKey(){return ACTIVATION_REPLAY_PREFIX+activeWorkspaceId();}
  function setStatus(message,state){if(statusEl){statusEl.textContent=message||'';statusEl.dataset.state=state||'idle';}}
  function scrollTranscriptToBottom(){if(transcriptEl)requestAnimationFrame(()=>transcriptEl.scrollTop=transcriptEl.scrollHeight);}
  function updateChatSurfaceState(){const hasChat=messages.some(m=>m.content&&(m.role==='user'||m.role==='assistant'));document.body.classList.toggle('mimir-has-chat',hasChat);if(transcriptEl)transcriptEl.dataset.empty=String(!hasChat);}
  function chatEmpty(){return !messages.some(m=>m.role==='user'||m.role==='assistant');}
  function escapeHtml(value){return String(value||'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');}
  function readActivationReplay(){
    try{
      const value=JSON.parse(localStorage.getItem(activationReplayStorageKey())||'null');
      return value&&typeof value==='object'?value:null;
    }catch(error){
      return null;
    }
  }
  function renderActivationReplayGate(){
    if(!replayEl)return;
    const replay=readActivationReplay();
    if(!replay){
      replayEl.hidden=true;
      replayEl.innerHTML='';
      return;
    }
    replayEl.hidden=false;
    replayEl.dataset.state=String(replay.state||'demo');
    replayEl.innerHTML='<div><strong>Demo replay: '+escapeHtml(replay.label||'Activation replay')+'</strong><p>'+escapeHtml(replay.expected_next_action||'Review simulated activation.')+'</p><small>demo_only:true / no_paid_routes_started:true / real live proof unchanged</small></div><a href="#platform-status" data-runtime-replay-open>Simulator</a>';
    replayEl.querySelector('[data-runtime-replay-open]')?.addEventListener('click',(event)=>{
      event.preventDefault();
      openPanel('#platform-status');
    });
  }
  function readModes(){
    try{
      const saved=JSON.parse(localStorage.getItem(MODE_KEY)||'{}');
      return {
        private:saved.private!==false,
        boost:Boolean(saved.boost),
        super:Boolean(saved.super),
        vision:Boolean(saved.vision)
      };
    }catch(error){
      return {private:true,boost:false,super:false,vision:false};
    }
  }
  function writeModes(modes){
    try{localStorage.setItem(MODE_KEY,JSON.stringify(modes));}
    catch(error){}
    window.dispatchEvent(new CustomEvent('mmir-chat-modes-updated',{detail:modes}));
    updateModeButtons();
  }
  function boundedNumber(value,fallback,min,max){
    const number=Number(value);
    if(!Number.isFinite(number))return fallback;
    return Math.min(max,Math.max(min,number));
  }
  function readRuntimeSettings(){
    try{
      const saved=JSON.parse(localStorage.getItem(RUNTIME_SETTINGS_KEY)||'{}');
      return {
        temperature:boundedNumber(saved.temperature,0.7,0,2),
        max_tokens:Math.round(boundedNumber(saved.max_tokens,700,128,4096)),
        context_length:Math.round(boundedNumber(saved.context_length,4096,1024,32768)),
        top_p:boundedNumber(saved.top_p,0.9,0,1),
        repeat_penalty:boundedNumber(saved.repeat_penalty,1.05,0.5,2),
        seed:Math.round(boundedNumber(saved.seed,-1,-1,2147483647)),
        system_prompt:String(saved.system_prompt||'').replace(/\s+$/,'').slice(0,1200)
      };
    }catch(error){
      return {temperature:0.7,max_tokens:700,context_length:4096,top_p:0.9,repeat_penalty:1.05,seed:-1,system_prompt:''};
    }
  }
  function runtimePayload(){
    const settings=readRuntimeSettings();
    const runtimeOptions={top_p:settings.top_p,repeat_penalty:settings.repeat_penalty};
    if(settings.seed>=0)runtimeOptions.seed=settings.seed;
    return {
      temperature:settings.temperature,
      max_tokens:settings.max_tokens,
      context_length:settings.context_length,
      runtime_options:runtimeOptions
    };
  }
  function runtimeInstruction(){
    const prompt=readRuntimeSettings().system_prompt;
    if(!prompt)return '';
    return 'User runtime instruction. Follow if useful, but keep MMIR safety, privacy, cost and zero-trust boundaries:\n'+prompt;
  }
  function openPanel(target){
    const targetEl=document.querySelector(target);
    if(targetEl){
      let details=targetEl;
      while(details){
        if('open' in details)details.open=true;
        details=details.parentElement?.closest?.('details')||null;
      }
      targetEl.scrollIntoView({block:'start',behavior:'smooth'});
    }
  }
  function openDeferredPanel(target){
    if(document.querySelector(target)){
      openPanel(target);
      return;
    }
    if(window.MimirLoadDeferred){
      window.MimirLoadDeferred().then(()=>openPanel(target));
      return;
    }
    openPanel(target);
  }
  function allowLocalChatProbes(profile,reason='chat-runtime-send'){
    if(!api.isLocal(profile))return false;
    window.MimirAllowLocalProbes?.(reason,60000);
    window.dispatchEvent(new CustomEvent('mmir-local-chat-probe-allowed',{detail:{reason,url:cleanUrl(profile?.url),expires_in_ms:60000}}));
    return true;
  }
  function modeInstruction(){
    const modes=readModes();
    const instructions=[];
    if(modes.private)instructions.push('Private mode: keep privacy in mind. If the hosted free route answers, do not claim local execution; mention local/private options only when relevant.');
    if(modes.boost)instructions.push('Boost 5.5: prioritize the highest-leverage next action.');
    if(modes.super)instructions.push('MMIR++: blend product, architecture, security and implementation.');
    if(modes.vision)instructions.push('Vision mode: use images/screen/uploads when present; ask if missing.');
    return instructions.join('\n');
  }
  function activeModelLabel(){
    const option=modelSelect?.selectedOptions?.[0];
    return String(option?.textContent||modelSelect?.value||'No model').split(/\s+[-–]\s+/)[0].trim()||'No model';
  }
  function updateRuntimeChips(){
    if(window.MimirRouteChips?.updateRuntime){window.MimirRouteChips.updateRuntime({modelSelect,profile:activeProfile(),webGpu:webGpuAvailable()});return;}
    if(modelChipEl)modelChipEl.textContent=(activeModelLabel()||'No model selected');
    if(nodeChipEl&&!nodeChipEl.textContent)nodeChipEl.textContent='Node: Browser route';
    if(privacyChipEl&&!privacyChipEl.textContent)privacyChipEl.textContent='Privacy: browser/no secret';
    if(tunnelChipEl&&!tunnelChipEl.textContent)tunnelChipEl.textContent='Tunnel: checking';
    if(resourceChipEl&&!resourceChipEl.textContent)resourceChipEl.textContent='Resources: checking';
  }
  function updateRouteChips(state={}){
    window.__MimirRouteChipState=state;
    if(window.MimirRouteChips?.updateRoute)window.MimirRouteChips.updateRoute(state);else updateRuntimeChips();
  }

  function openComposerModelPicker(){
    setComposerActionFeedback('Model picker opened. Free/browser/local routes stay first.','ready');
    if(window.MimirComposerModelPicker?.toggle){window.MimirComposerModelPicker.toggle();return;}
    if(window.MimirLoadDeferred){
      window.MimirLoadDeferred().then(()=>{if(window.MimirComposerModelPicker?.toggle)window.MimirComposerModelPicker.toggle();else openPanel('#model-library');});
      return;
    }
    openPanel('#model-library');
  }

  function setComposerActionFeedback(message,state='idle'){
    const feedback=document.getElementById('composer-action-feedback');
    if(!feedback)return;
    feedback.dataset.state=state;
    feedback.textContent=message;
  }

  function defaultFirstPrompt(){
    return 'Start MMIR automatically. Tell me the active route/model, my best free next step and how to connect a local model.';
  }

  function composerModeLabel(mode){
    if(mode==='private')return 'Private';
    if(mode==='boost')return 'Boost 5.5';
    if(mode==='super')return 'MMIR++';
    if(mode==='vision')return 'Vision';
    return mode;
  }

  function afterComposerModeToggle(mode,enabled){
    if(mode==='vision'&&enabled){
      openPanel('#vision-input');
      setComposerActionFeedback('Vision mode on. Image metadata waits for a trusted local/protected route.','ready');
      return;
    }
    if(mode==='private'&&enabled){
      setComposerActionFeedback('Private mode on. MMIR prefers local/private routes; provider keys stay out of this page.','ready');
      return;
    }
    if(mode==='boost'&&enabled){
      setComposerActionFeedback('Boost 5.5 on. Next answer prioritizes high-leverage action without paid routes.','ready');
      return;
    }
    if(mode==='super'&&enabled){
      setComposerActionFeedback('MMIR++ on. Next answer blends product, architecture, security and build steps.','ready');
      return;
    }
    setComposerActionFeedback(composerModeLabel(mode)+' off. Settings are stored locally in this browser.','idle');
  }

  function readFirstChatReceipt(){
    try{
      const value=JSON.parse(localStorage.getItem(firstChatReceiptStorageKey())||'null');
      return value&&typeof value==='object'?value:null;
    }catch(error){
      return null;
    }
  }

  function writeFirstChatReceipt(receipt){
    try{
      localStorage.setItem(firstChatReceiptStorageKey(),JSON.stringify(receipt));
      window.dispatchEvent(new CustomEvent('mmir-first-chat-receipt-updated',{detail:receipt}));
    }catch(error){}
  }

  function browserNodeReceiptMetadata(extra={}){
    return {
      node_type:'browser',
      trust_class:'device-local',
      cost_class:'free-user-device',
      quality_tier:'starter',
      execution_boundary:'current-browser-session',
      privacy_boundary:'current browser session',
      prompt_left_device:false,
      provider_key_required:false,
      cloudflare_required:false,
      install_required:false,
      route_kind:'browser-node',
      ...extra
    };
  }

  function routeReceiptMetadata(route,details={}){
    const routeText=String(route||details.route||'').toLowerCase();
    if(details.node_type==='browser'||/browser-webgpu|browser-node|webllm/.test(routeText)){
      return browserNodeReceiptMetadata(details);
    }
    if(/browser-helper/.test(routeText)){
      return {
        node_type:'browser-helper',
        trust_class:'device-local',
        cost_class:'free-user-device',
        quality_tier:'starter-guide',
        execution_boundary:'current-browser-session',
        privacy_boundary:'current browser session',
        prompt_left_device:false,
        provider_key_required:false,
        cloudflare_required:false,
        install_required:false,
        route_kind:'browser-helper',
        ...details
      };
    }
    return {
      node_type:details.node_type||'backend',
      trust_class:details.trust_class||'configured-route',
      cost_class:details.cost_class||'free/local/default',
      quality_tier:details.quality_tier||'route-dependent',
      execution_boundary:details.execution_boundary||'configured-backend',
      privacy_boundary:details.privacy_boundary||'configured route',
      prompt_left_device:details.prompt_left_device!==undefined?Boolean(details.prompt_left_device):true,
      provider_key_required:Boolean(details.provider_key_required),
      cloudflare_required:Boolean(details.cloudflare_required),
      install_required:Boolean(details.install_required),
      route_kind:details.route_kind||route||'backend'
    };
  }

  function recordFirstChatReceipt(status,details={}){
    const existing=readFirstChatReceipt();
    const now=new Date().toISOString();
    const ok=status==='success';
    const metadata=routeReceiptMetadata(details.route,details);
    const receipt={
      object:'mmir.first_chat_receipt',
      version:1,
      workspace_id:activeWorkspaceId(),
      status:ok?'success':'failed',
      model:String(details.model||'').slice(0,160),
      route:String(details.route||'backend').slice(0,120),
      node_type:String(metadata.node_type||'').slice(0,60),
      trust_class:String(metadata.trust_class||'').slice(0,80),
      cost_class:String(metadata.cost_class||'').slice(0,80),
      quality_tier:String(metadata.quality_tier||'').slice(0,80),
      execution_boundary:String(metadata.execution_boundary||'').slice(0,120),
      privacy_boundary:String(metadata.privacy_boundary||'').slice(0,120),
      prompt_left_device:Boolean(metadata.prompt_left_device),
      provider_key_required:Boolean(metadata.provider_key_required),
      cloudflare_required:Boolean(metadata.cloudflare_required),
      install_required:Boolean(metadata.install_required),
      route_kind:String(metadata.route_kind||'').slice(0,80),
      at:now,
      first_success_at:ok?(existing?.first_success_at||now):(existing?.first_success_at||''),
      prompt_chars:Math.max(0,Math.round(Number(details.prompt_chars)||0)),
      response_chars:Math.max(0,Math.round(Number(details.response_chars)||0)),
      error_status:ok?'':String(details.error_status||'unknown').slice(0,40),
      raw_prompt_stored:false,
      raw_response_stored:false,
      recovery:ok?[]:['retry proof','use free local profile','open installer','connect settings']
    };
    writeFirstChatReceipt(receipt);
    return receipt;
  }
  function uReceipt(model,route,prompt,response,details={}){
    const metadata=routeReceiptMetadata(route,details);
    window.__MimirLastAnswerContext={...(window.__MimirLastAnswerContext||{}),...metadata};
    recordFirstChatReceipt('success',{model,route,prompt_chars:(prompt||'').length,response_chars:(response||'').length,...metadata});
  }

  function contextState(local,backend,off){return off?'off':local&&backend?'local+backend':local?'local':backend?'backend':'none';}

  function firstChatReceiptItem(){
    const receipt=readFirstChatReceipt();
    if(receipt?.status==='success'){
      return {label:'First chat',state:'ready',detail:(receipt.model||'model')+' answered; no raw prompt stored'};
    }
    if(receipt?.status==='failed'){
      return {label:'First chat',state:'error',detail:'recovery ready; no raw prompt stored'};
    }
    return {label:'First chat',state:'idle',detail:'waiting for first useful answer'};
  }

  function proofStateClass(state){
    return ['ready','loading','error','blocked','idle'].includes(state)?state:'idle';
  }

  function proofRepairActions(kind){
    const retry={id:'retry',label:'Retry proof'};
    if(kind==='offline')return [
      {id:'local-profile',label:'Use free local profile'},
      {id:'installer',label:'Open installer'},
      retry
    ];
    if(kind==='no-model')return [
      {id:'model-library',label:'Install free model'},
      {id:'connect-settings',label:'Connect settings'},
      retry
    ];
    if(kind==='cost-guard')return [
      {id:'local-profile',label:'Use local/free route'},
      {id:'connect-settings',label:'Edit route'},
      retry
    ];
    if(kind==='verified')return [
      {id:'chat-now',label:'Send first answer'},
      retry
    ];
    if(kind==='answered')return [
      {id:'save-chat',label:'Save chat'},
      retry
    ];
    return [
      {id:'repair',label:'Repair free route'},
      retry
    ];
  }

  function handleProofAction(action){
    if(action==='retry'){
      lastProofSignature='';
      refreshState(true);
      return;
    }
    if(action==='repair'){
      openPanel('#node-dashboard');
      openPanel('#model-library');
      return;
    }
    if(action==='local-profile'){
      window.MimirBackendProfiles?.ensureFreeLocalProfile?.();
      lastProofSignature='';
      refreshState(true);
      return;
    }
    if(action==='installer'){
      window.location.href='./downloads/mmir-local-connector-install.html';
      return;
    }
    if(action==='model-library'){
      openPanel('#model-library');
      return;
    }
    if(action==='connect-settings'){
      openPanel('#backend-settings');
      return;
    }
    if(action==='save-chat'){
      openPanel('#conversation-manager-panel');
      return;
    }
    if(action==='chat-now'){
      if(verifiedLiveModel?.id&&modelSelect){
        modelSelect.value=verifiedLiveModel.id;
        updateRuntimeChips();
        updateRuntimeModelActions();
      }
      if(promptEl&&!String(promptEl.value||'').trim()){
        promptEl.value='Give me a short, useful first answer with this verified MMIR model.';
        promptEl.dispatchEvent(new Event('input',{bubbles:true}));
      }
      promptEl?.focus();
      setStatus('Sending first verified answer...','loading');
      window.setTimeout(()=>primaryLink?.click(),40);
    }
  }

  function renderLiveProof(message,state='idle',items=[],actions=[]){
    if(!proofEl)return;
    const rows=(Array.isArray(items)?items:[]).map(item=>
      '<span data-state="'+escapeHtml(proofStateClass(item.state))+'"><strong>'+escapeHtml(item.label||'Check')+'</strong>'+escapeHtml(item.detail?(' - '+item.detail):'')+'</span>'
    ).join('');
    const proofActions=(Array.isArray(actions)&&actions.length?actions:proofRepairActions(state==='ready'?'verified':'default'));
    proofEl.dataset.state=proofStateClass(state);
    proofEl.innerHTML=''+
      '<div><strong>Live model proof</strong><p>'+escapeHtml(message||'Browser helper ready. Backend proof runs when a free route is reachable.')+'</p></div>'+
      '<div class="runtime-proof-rail">'+rows+'</div>'+
      '<div class="runtime-proof-actions">'+proofActions.map(action=>'<button type="button" data-proof-action="'+escapeHtml(action.id)+'">'+escapeHtml(action.label)+'</button>').join('')+'</div>';
    proofEl.querySelectorAll('[data-proof-action]').forEach(button=>{
      button.addEventListener('click',()=>handleProofAction(button.getAttribute('data-proof-action')||''));
    });
  }

  function routeLooksFree(profile,url){
    const text=[profile?.provider,profile?.name,profile?.cost,url].join(' ');
    return api.isLocal(profile)||/\b(free|gratis|local|localhost|127\.0\.0\.1|self-hosted|self hosted|mock|dev)\b/i.test(text);
  }

  function baseProofItems(url){
    return [
      {label:'Browser helper',state:'ready',detail:'verified free route'},
      {label:'WebGPU',state:navigator.gpu?'ready':'idle',detail:navigator.gpu?'available for browser LLMs':'not available; browser guide still works'},
      {label:'Backend health',state:url?'ready':'idle',detail:url||'not connected'},
      firstChatReceiptItem()
    ];
  }
  function selectedOptionRuntime(){
    return modelSelect?.selectedOptions?.[0]?.dataset?.runtime||'';
  }
  function selectedLiveModel(){
    return selectedOptionRuntime()==='live'?String(modelSelect?.value||''):'';
  }
  function canManageSelectedLiveModel(){
    const profile=activeProfile();
    return Boolean(selectedLiveModel()&&api.isLocal(profile));
  }
  function updateRuntimeModelActions(){
    if(deleteModelBtn)deleteModelBtn.disabled=busy||!canManageSelectedLiveModel();
  }
  function preferProofModel(model){
    const value=String(model||'').trim();
    if(!value)return;
    preferredProofModel=value;
    lastProofSignature='';
  }
  function updateModeButtons(){
    const modes=readModes();
    document.querySelectorAll('[data-chat-mode]').forEach(button=>{
      const mode=button.getAttribute('data-chat-mode');
      const active=Boolean(modes[mode]);
      button.classList.toggle('is-active',active);
      button.setAttribute('aria-pressed',String(active));
    });
  }

  function activeRole(){
    try{
      const value=JSON.parse(localStorage.getItem(ROLE_KEY)||'null');
      if(!value||typeof value!=='object')return null;
      const instruction=String(value.instruction||'').trim();
      if(!instruction)return null;
      return {
        id:String(value.id||'custom').trim()||'custom',
        label:String(value.label||value.id||'Role').trim()||'Role',
        instruction
      };
    }catch(error){
      return null;
    }
  }

  function cleanMemoryType(value){
    const type=String(value||'note').trim().toLowerCase();
    return ['preference','project','workflow','identity','instruction','note'].includes(type)?type:'note';
  }

  function cleanMemoryScope(value){
    const scope=String(value||'workspace').trim().toLowerCase();
    return ['workspace','project','chat','session','private'].includes(scope)?scope:'workspace';
  }

  function memoryExpiresAt(item){
    const raw=String(item?.expiresAt||item?.expires_at||'').trim();
    if(!raw)return '';
    const date=new Date(raw);
    return Number.isNaN(date.getTime())?'':date.toISOString();
  }

  function memoryExpired(item){
    const expiresAt=memoryExpiresAt(item);
    return Boolean(expiresAt&&Date.parse(expiresAt)<=Date.now());
  }

  function normalizedMemoryUse(item,source,extra={}){
    return {
      memoryId:String(item?.id||item?.backendId||item?.backend_id||''),
      source,
      type:cleanMemoryType(item?.type),
      scope:cleanMemoryScope(item?.scope),
      text:String(item?.text||'').trim().slice(0,220),
      reason:String(extra.reason||item?.reason||'selected for this message').trim().slice(0,220),
      matched_terms:Array.isArray(extra.matched_terms||item?.matched_terms)?(extra.matched_terms||item.matched_terms).slice(0,8):[],
      used_at:new Date().toISOString()
    };
  }

  function writeMemoryUse(items){
    const payload=items.map(item=>normalizedMemoryUse(item.item||item,item.source||'local',item)).filter(item=>item.text).slice(0,8);
    try{
      localStorage.setItem(memoryUseStorageKey(),JSON.stringify(payload));
      window.dispatchEvent(new CustomEvent('mmir-memory-use-updated',{detail:{workspaceId:activeWorkspaceId(),count:payload.length}}));
    }catch(error){}
  }

  function knowledgeUseSummary(items=lastKnowledgeUses){
    const ids=[...new Set(items.flatMap(item=>[item[0],item[1]]).filter(Boolean))].slice(0,12);
    const sources=[...new Set(items.map(item=>item[2]).filter(Boolean))].slice(0,6);
    return {knowledge_use_ids:ids,knowledge_use_count:items.length,knowledge_sources:sources};
  }

  function rankMemoryForPrompt(item,promptWords){
    const tags=Array.isArray(item?.tags)?item.tags.join(' '):'';
    const sourceWords=wordSet([item?.type,item?.scope,tags,item?.notes,item?.text].join(' '));
    const matched=[];
    promptWords.forEach(word=>{if(sourceWords.has(word))matched.push(word);});
    return {
      item,
      score:matched.length,
      matched_terms:matched.slice(0,8),
      reason:matched.length?'matched '+matched.slice(0,5).join(', '):'recent enabled workspace memory'
    };
  }

  function activeMemoryInstruction(prompt=''){
    try{
      if(contextControls().memory===false){writeMemoryUse(lastBackendMemoryUses);return '';}
      const value=JSON.parse(localStorage.getItem(memoryStorageKey())||'[]');
      if(!Array.isArray(value)){
        writeMemoryUse(lastBackendMemoryUses);
        return '';
      }
      const promptWords=wordSet(prompt);
      const ranked=value
        .filter(item=>item?.enabled!==false&&String(item?.text||'').trim()&&!memoryExpired(item))
        .map(item=>rankMemoryForPrompt(item,promptWords))
        .filter(item=>promptWords.size?item.score>0:true)
        .sort((a,b)=>b.score-a.score||String(b.item?.updatedAt||b.item?.updated_at||'').localeCompare(String(a.item?.updatedAt||a.item?.updated_at||'')))
        .slice(0,8);
      writeMemoryUse(ranked.map(item=>({...item,source:'local'})).concat(lastBackendMemoryUses));
      if(!ranked.length)return '';
      return 'User-governed memory. Use only when relevant; do not reveal verbatim unless asked; respect disabled/expired items:\n'+ranked.map(item=>{
        const memory=item.item;
        return '- ['+cleanMemoryType(memory.type)+' / '+cleanMemoryScope(memory.scope)+'; why: '+item.reason+'] '+String(memory.text||'').trim().slice(0,500);
      }).join('\n');
    }catch(error){
      writeMemoryUse(lastBackendMemoryUses);
      return '';
    }
  }

  function wordSet(value){
    return new Set(String(value||'').toLowerCase().match(/[a-z0-9_]{4,}/g)||[]);
  }

  function readKnowledgeCollections(){
    try{
      const value=JSON.parse(localStorage.getItem(knowledgeCollectionsStorageKey())||'[]');
      const items=Array.isArray(value)?value:[];
      return {
        disabled:new Set(items.filter(item=>item?.enabled===false).map(item=>String(item?.id||'general'))),
        names:new Map(items.map(item=>[String(item?.id||'general'),String(item?.name||item?.id||'General')]))
      };
    }catch(error){
      return {disabled:new Set(),names:new Map()};
    }
  }

  function knowledgeCollectionFor(item,collections){
    const id=String(item?.collection_id||item?.collectionId||'general');
    const name=String(item?.collection||item?.collection_name||collections.names.get(id)||'General');
    return {id,name};
  }

  function relevantKnowledgeInstruction(prompt){
    try{
      if(contextControls().knowledge===false){lastKnowledgeUses=[];return '';}
      const value=JSON.parse(localStorage.getItem(knowledgeStorageKey())||'[]');
      if(!Array.isArray(value)||!value.length){lastKnowledgeUses=lastBackendKnowledgeUses.slice(0,8);return '';}
      const promptWords=wordSet(prompt);
      const collections=readKnowledgeCollections();
      const ranked=value.map(item=>{
        if(item?.enabled===false)return null;
        const collection=knowledgeCollectionFor(item,collections);
        if(collections.disabled.has(collection.id))return null;
        const text=String(item?.text||'');
        const words=wordSet((item?.name||'')+' '+text.slice(0,2400));
        let score=0;
        promptWords.forEach(word=>{if(words.has(word))score+=1;});
        return {id:String(item?.id||item?.backendId||item?.backend_id||''),collection_id:collection.id,name:String(item?.name||'document'),collection:collection.name,text,score};
      }).filter(item=>item&&item.text&&item.score>0).sort((a,b)=>b.score-a.score).slice(0,3);
      lastKnowledgeUses=ranked.map(item=>[item.id,item.collection_id,item.collection]).concat(lastBackendKnowledgeUses).slice(0,8);
      if(!ranked.length)return '';
      return 'Relevant local knowledge. Treat as user-provided; cite collection/file names when useful:\n'+ranked.map(item=>'['+item.collection+' / '+item.name+']\n'+item.text.slice(0,1200)).join('\n\n');
    }catch(error){
      lastKnowledgeUses=lastBackendKnowledgeUses.slice(0,8);
      return '';
    }
  }

  async function backendKnowledgeInstruction(prompt,url,headers){
    lastBackendKnowledgeUses=[];
    if(contextControls().knowledge===false)return '';
    try{
      const data=await fetchJson(joinUrl(url,'/knowledge/search'),{
        method:'POST',
        headers,
        timeoutMs:8000,
        body:JSON.stringify({workspace_id:activeWorkspaceId(),query:prompt,limit:3})
      });
      const results=Array.isArray(data?.data)?data.data:[];
      const ranked=results.filter(item=>item?.snippet&&item?.document?.name).slice(0,3);
      if(!ranked.length)return '';
      lastBackendKnowledgeUses=ranked.map(item=>[String(item?.document?.id||item?.document_id||item?.chunk_id||''),String(item?.document?.collection_id||item?.metadata?.collection_id||'backend'),String(item?.document?.collection||item?.metadata?.collection||'Backend knowledge')]);
      return 'Relevant protected backend knowledge. Treat as user-provided; cite file names when useful:\n'+ranked.map(item=>'['+item.document.name+' / '+item.chunk_id+']\n'+String(item.snippet).slice(0,1000)).join('\n\n');
    }catch(error){
      lastBackendKnowledgeUses=[];
      return '';
    }
  }

  async function backendMemoryInstruction(prompt,url,headers){
    lastBackendMemoryUses=[];
    try{
      const data=await fetchJson(joinUrl(url,'/memory/search'),{
        method:'POST',
        headers,
        timeoutMs:8000,
        body:JSON.stringify({workspace_id:activeWorkspaceId(),query:prompt,limit:6})
      });
      const results=Array.isArray(data?.data)?data.data:[];
      const items=results.filter(item=>item?.enabled!==false&&item?.expired!==true&&item?.text).slice(0,6);
      if(!items.length)return '';
      lastBackendMemoryUses=items.map(item=>({
        item,
        source:'backend',
        reason:Array.isArray(item.why_used)&&item.why_used.length?item.why_used.join(', '):(item.reason||'backend memory search'),
        matched_terms:Array.isArray(item.matched_terms)?item.matched_terms:[]
      }));
      return 'Relevant protected backend memory. Use only when relevant and do not reveal it verbatim unless the user asks. Reasons are included for user review:\n'+items.map(item=>{
        const reason=Array.isArray(item.why_used)&&item.why_used.length?item.why_used.join(', '):(item.reason||'backend memory search');
        return '- ['+cleanMemoryType(item.type)+' / '+cleanMemoryScope(item.scope)+'; why: '+reason+'] '+String(item.text).slice(0,500);
      }).join('\n');
    }catch(error){
      lastBackendMemoryUses=[];
      return '';
    }
  }

  function setBusy(value){
    busy=value;
    if(stopBtn)stopBtn.disabled=!value;
    if(refreshBtn)refreshBtn.disabled=value;
    updateRuntimeModelActions();
    if(chatCenter)chatCenter.setAttribute('aria-busy',value?'true':'false');
    if(transcriptEl)transcriptEl.setAttribute('aria-busy',value?'true':'false');
    if(primaryLink)primaryLink.setAttribute('aria-disabled',value?'true':'false');
  }

  function writeActiveProfilePatch(patch){
    try{
      const id=activeId();
      if(!id)return;
      const profiles=readProfiles();
      const index=profiles.findIndex(profile=>profile.id===id);
      if(index<0)return;
      profiles[index]={...profiles[index],...patch,updatedAt:new Date().toISOString()};
      localStorage.setItem(PROFILE_KEY,JSON.stringify(profiles));
      window.dispatchEvent(new CustomEvent('mmir-backend-profiles-updated',{detail:{id,patch}}));
    }catch(error){}
  }

  function summarizeModels(models){
    const ids=models.map(model=>model.id).filter(Boolean);
    if(!ids.length)return 'free browser route ready; no backend model yet';
    const visible=ids.slice(0,3).join(', ');
    return ids.length>3?visible+' +'+String(ids.length-3):visible;
  }

  function parseStoredMessages(raw){
    try{
      const value=JSON.parse(raw||'[]');
      if(!Array.isArray(value))return [];
      return value.filter(message=>{
        return (message?.role==='user'||message?.role==='assistant')&&typeof message.content==='string';
      }).slice(-MAX_STORED_MESSAGES);
    }catch(error){
      return [];
    }
  }

  function loadMessages(){
    currentChatKey=chatStorageKey();
    const raw=localStorage.getItem(currentChatKey)||(
      activeWorkspaceId()===DEFAULT_WORKSPACE_ID?localStorage.getItem(CHAT_KEY):null
    );
    return parseStoredMessages(raw);
  }

  function saveMessages(){
    try{
      localStorage.setItem(currentChatKey||chatStorageKey(),JSON.stringify(messages.slice(-MAX_STORED_MESSAGES)));
      window.dispatchEvent(new CustomEvent('mmir-chat-history-updated',{detail:{workspaceId:activeWorkspaceId()}}));
    }catch(error){}
  }

  function setMessageActionStatus(messageId,text,state){
    const bubble=transcriptEl?.querySelector('[data-message-id="'+CSS.escape(messageId)+'"]');
    const note=bubble?.querySelector('.runtime-message-action-status');
    if(note){note.dataset.state=state||'idle';note.textContent=text||'';}
  }
  function recordMessageAction(action,message,detail={}){
    window.dispatchEvent(new CustomEvent('mmir-chat-message-action',{detail:{action,message_id:message?.id||'',workspace_id:activeWorkspaceId(),no_paid_routes_started:true,provider_secrets_stored:false,raw_prompt_stored_in_public_repo:false,raw_response_stored_in_public_repo:false,...detail}}));
  }
  async function copyMessage(message){
    try{
      await navigator.clipboard.writeText(message.content);
      setMessageActionStatus(message.id,'Copied locally. Review before sharing.','ready');
      setStatus('Answer copied.','ready');
      recordMessageAction('copy',message);
    }catch(error){
      setMessageActionStatus(message.id,'Copy failed. Select manually.','error');
      setStatus('Copy failed in this browser.','error');
    }
  }
  function publicMessage(message){
    return {id:String(message?.id||''),role:message?.role==='user'?'user':'assistant',content:String(message?.content||''),meta:String(message?.meta||''),createdAt:String(message?.createdAt||new Date().toISOString()),retryPrompt:typeof message?.retryPrompt==='string'?message.retryPrompt:'',model:typeof message?.model==='string'?message.model:''};
  }
  function runtimeMessageSnapshot(){
    return messages.filter(message=>(message.role==='user'||message.role==='assistant')&&message.content&&message.content!=='Thinking...').map(publicMessage);
  }
  function replaceRuntimeMessages(nextMessages){
    messages=parseStoredMessages(JSON.stringify(Array.isArray(nextMessages)?nextMessages:[]));
    currentChatKey=chatStorageKey();
    saveMessages();
    renderStoredMessages();
  }
  function hasUsableLiveModel(){
    return Boolean(verifiedLiveModel)||/\b(webgpu|browser|local|ollama|live)\b/i.test(activeModelLabel());
  }
  function runtimeBridge(){
    return {workspaceId:activeWorkspaceId,messages:runtimeMessageSnapshot,setMessages:replaceRuntimeMessages,setStatus,setMessageActionStatus,recordAction:recordMessageAction,openPanel:openDeferredPanel,openModelPicker:openComposerModelPicker,hasUsableLiveModel,refresh:()=>refreshState(true),send:sendMessage};
  }
  window.MimirChatRuntimeBridge=runtimeBridge();
  function runDeferredMessageAction(action,message){
    const run=()=>window.MimirMessageActions?.run?.(action,publicMessage(message),runtimeBridge());
    if(window.MimirMessageActions?.run){run();return;}
    if(window.MimirLoadDeferred){
      setMessageActionStatus(message.id,'Loading actions...','loading');
      window.MimirLoadDeferred().then(()=>{if(window.MimirMessageActions?.run)run();else setMessageActionStatus(message.id,'Actions unavailable.','error');});
      return;
    }
    setMessageActionStatus(message.id,'Actions unavailable.','error');
  }

  function createMessage(role,content,meta,extra={}){
    return {
      id:String(Date.now())+'-'+Math.random().toString(16).slice(2),
      role,
      content:String(content||''),
      meta:String(meta||''),
      createdAt:new Date().toISOString(),
      retryPrompt:typeof extra.retryPrompt==='string'?extra.retryPrompt:'',
      model:typeof extra.model==='string'?extra.model:'',
      rolePreset:typeof extra.rolePreset==='string'?extra.rolePreset:''
    };
  }

  function ensureSendControl(){
    if(!primaryLink)return;
    primaryLink.textContent='\u2191';
    if(primaryLink.tagName==='BUTTON'){
      primaryLink.type='submit';
    }else{
      primaryLink.setAttribute('href','#mimir-chat-runtime');
      primaryLink.setAttribute('role','button');
      primaryLink.removeAttribute('target');
    }
    primaryLink.classList.remove('disabled');
    primaryLink.setAttribute('aria-disabled','false');
    primaryLink.setAttribute('aria-label','Send prompt to the active MMIR route');
    primaryLink.setAttribute('title','Send');
    primaryLink.removeAttribute('rel');
  }

  function installComposerDock(){
    if(!formEl||document.getElementById('composer-mode-dock'))return;
    const dock=document.createElement('div');
    dock.id='composer-mode-dock';
    dock.className='composer-mode-dock';
    document.body.classList.add('mimir-composer-dock-ready');
    dock.innerHTML=''+
      '<div class="composer-tool-cluster" aria-label="Chat tools">'+
        '<button id="composer-add-model" type="button" class="composer-icon-button composer-core-control composer-core-control--menu" aria-label="Add or connect model" aria-controls="composer-model-picker" aria-expanded="false" title="Add model">+</button>'+
        '<button type="button" class="composer-mode-button composer-core-control composer-core-control--privacy" data-chat-mode="private" aria-pressed="true" aria-label="Toggle private route review mode" title="Security and privacy mode">Privacy</button>'+
      '</div>'+
      '<div class="composer-live-cluster" aria-label="Live model and machine status">'+
        '<button id="runtime-model-chip" type="button" class="composer-live-chip composer-chip-button composer-core-control composer-core-control--model" aria-label="Open model picker" aria-controls="composer-model-picker" aria-expanded="false">Model checking</button>'+
        '<button id="runtime-node-chip" type="button" class="composer-live-chip composer-chip-button composer-core-control composer-core-control--node" aria-label="Open selected node and route status">Node checking</button>'+
        '<button id="runtime-privacy-chip" type="button" class="composer-live-chip composer-core-control composer-core-control--privacy-readout" aria-label="Security and privacy state">Privacy checking</button>'+
        '<button id="runtime-tunnel-chip" type="button" class="composer-live-chip composer-chip-button composer-core-control composer-core-control--tunnel" aria-label="Open secure tunnel status">Tunnel checking</button>'+
        '<button id="runtime-resource-chip" type="button" class="composer-live-chip composer-chip-button composer-core-control composer-core-control--resources" aria-label="Open node resource status">Resources checking</button>'+
        '<button id="composer-voice-input" type="button" class="composer-icon-button composer-core-control composer-core-control--voice" aria-label="Voice input" title="Voice input">Mic</button>'+
      '</div>'+
      '<small id="composer-action-feedback" class="composer-action-feedback" data-state="idle" aria-live="polite">Ready: Supergeni first, local model when connected.</small>';
    const bar=formEl.querySelector('.composer-bar');
    if(bar)formEl.insertBefore(dock,bar); else formEl.appendChild(dock);
    modelChipEl=document.getElementById('runtime-model-chip');
    nodeChipEl=document.getElementById('runtime-node-chip');
    privacyChipEl=document.getElementById('runtime-privacy-chip');
    tunnelChipEl=document.getElementById('runtime-tunnel-chip');
    resourceChipEl=document.getElementById('runtime-resource-chip');
    document.getElementById('composer-add-model')?.addEventListener('click',openComposerModelPicker);
    modelChipEl?.addEventListener?.('click',openComposerModelPicker);
    [nodeChipEl,tunnelChipEl,resourceChipEl].forEach(el=>el?.addEventListener?.('click',()=>{
      openPanel('#node-dashboard');
      setComposerActionFeedback('Node dashboard opened. CPU/RAM and model health come only from a paired local node. Tunnel state comes only from reachable MMIR routes.','ready');
    }));
    document.querySelectorAll('[data-chat-mode]').forEach(button=>{
      button.addEventListener('click',()=>{
        const mode=button.getAttribute('data-chat-mode');
        const modes=readModes();
        modes[mode]=!modes[mode];
        writeModes(modes);
        setStatus(mode+' mode '+(modes[mode]?'enabled.':'disabled.'),'idle');
        afterComposerModeToggle(mode,modes[mode]);
      });
    });
    const voiceButton=document.getElementById('composer-voice-input');
    if(speechApiSupported())voiceButton?.addEventListener('click',startVoiceInput);
    else if(voiceButton){
      voiceButton.hidden=true;
      voiceButton.setAttribute('aria-hidden','true');
    }
    updateModeButtons();
    updateRuntimeChips();
  }

  function startVoiceInput(){
    const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SpeechRecognition){
      openPanel('#voice-controls');
      setComposerActionFeedback('Voice input is not available here. Voice settings opened with browser-local fallback controls.','error');
      setStatus('Voice input is not available in this browser.','error');
      return;
    }
    const recognition=new SpeechRecognition();
    recognition.lang=document.documentElement.lang||navigator.language||'en-US';
    recognition.interimResults=false;
    recognition.maxAlternatives=1;
    recognition.onstart=()=>{
      setComposerActionFeedback('Listening locally through browser speech recognition.','ready');
      setStatus('Listening...','loading');
    };
    recognition.onerror=()=>{
      setComposerActionFeedback('Voice input failed or was cancelled. Use typing or voice settings.','error');
      setStatus('Voice input failed or was cancelled.','error');
    };
    recognition.onresult=(event)=>{
      const text=String(event.results?.[0]?.[0]?.transcript||'').trim();
      if(text&&promptEl){
        promptEl.value=(promptEl.value?promptEl.value+' ':'')+text;
        promptEl.focus();
        setComposerActionFeedback('Voice text added to the prompt. Review before sending.','ready');
        setStatus('Voice added to prompt.','ready');
      }
    };
    recognition.start();
  }

  function installRuntimeUi(){
    if(!chatCenter||document.getElementById('mimir-chat-runtime'))return;
    installComposerDock();
    const runtime=document.createElement('section');
    runtime.id='mimir-chat-runtime';
    runtime.className='mimir-chat-runtime';
    runtime.setAttribute('role','region');
    runtime.setAttribute('aria-label','MMIR live chat');
    runtime.innerHTML=''+
      '<div class="runtime-toolbar">'+
        '<span id="runtime-state" data-state="idle" role="status" aria-live="polite">Loading free model routes...</span>'+
        '<label for="runtime-model">Model<select id="runtime-model" disabled><option value="">Loading free routes...</option></select></label>'+
        '<button id="runtime-refresh" type="button" aria-label="Refresh backend models">Refresh</button>'+
        '<button id="runtime-stop" type="button" aria-label="Stop current response" disabled>Stop</button>'+
        '<button id="runtime-delete-model" type="button" aria-label="Remove selected local model" disabled>Remove model</button>'+
        '<button id="runtime-clear" type="button" aria-label="Clear local chat history">Clear</button>'+
      '</div>'+
      '<div id="runtime-activation-replay" class="runtime-activation-replay" data-state="idle" aria-live="polite" hidden></div>'+
      '<div id="runtime-live-proof" class="runtime-live-proof" data-state="idle" aria-live="polite"></div>'+
      '<div id="runtime-model-helper" class="runtime-model-helper" hidden></div>'+
      '<div id="runtime-transcript" class="runtime-transcript" aria-live="polite" aria-relevant="additions text" aria-busy="false"></div>';
    if(formEl&&formEl.nextSibling){chatCenter.insertBefore(runtime,formEl.nextSibling);}else{chatCenter.appendChild(runtime);}
    modelSelect=document.getElementById('runtime-model');
    statusEl=document.getElementById('runtime-state');
    modelHelperEl=document.getElementById('runtime-model-helper');
    replayEl=document.getElementById('runtime-activation-replay');
    proofEl=document.getElementById('runtime-live-proof');
    transcriptEl=document.getElementById('runtime-transcript');
    refreshBtn=document.getElementById('runtime-refresh');
    stopBtn=document.getElementById('runtime-stop');
    deleteModelBtn=document.getElementById('runtime-delete-model');
    clearBtn=document.getElementById('runtime-clear');
    if(modelSelect)modelSelect.setAttribute('aria-label','Active chat model');
    if(modelSelect)modelSelect.addEventListener('change',()=>{renderModelHelper();updateRuntimeChips();updateRuntimeModelActions();window.MimirComposerModelPicker?.render?.();});
    refreshBtn.addEventListener('click',()=>refreshState(true));
    stopBtn.addEventListener('click',stopCurrentResponse);
    deleteModelBtn.addEventListener('click',deleteSelectedLiveModel);
    clearBtn.addEventListener('click',clearConversation);
    renderActivationReplayGate();
    renderLiveProof('Browser helper is ready. Backend proof starts when a free backend or local node is reachable.','idle',baseProofItems(''));
  }

  function renderMessageActions(bubble,message){
    bubble.querySelector('.runtime-message-actions')?.remove();
    if(message.role!=='assistant'||!message.content||message.content==='Thinking...')return;
    const actions=document.createElement('div');
    actions.className='runtime-message-actions';
    actions.setAttribute('role','group');
    actions.setAttribute('aria-label','Message actions');
    const addAction=(id,label,aria,handler)=>{
      const button=document.createElement('button');
      button.type='button';
      button.textContent=label;
      button.dataset.messageAction=id;
      button.setAttribute('aria-label',aria);
      button.addEventListener('click',handler);
      actions.appendChild(button);
    };
    addAction('copy','Copy','Copy assistant answer',()=>copyMessage(message));
    if(message.retryPrompt){
      addAction('retry','Retry','Retry this prompt',()=>retryMessage(message));
    }
    addAction('save','Save','Save this chat locally',()=>runDeferredMessageAction('save',message));
    addAction('fork','Fork','Fork the conversation at this answer',()=>runDeferredMessageAction('fork',message));
    addAction('share-safe','Share safe','Copy a redacted safe share for this answer',()=>runDeferredMessageAction('share-safe',message));
    addAction('next-step','Next','Open the best safe next step for this answer',()=>runDeferredMessageAction('next-step',message));
    const note=document.createElement('small');
    note.id='runtime-message-action-status-'+message.id.replace(/[^a-zA-Z0-9_-]/g,'-');
    note.className='runtime-message-action-status';
    note.dataset.state='idle';
    note.setAttribute('role','status');
    note.setAttribute('aria-live','polite');
    actions.setAttribute('aria-describedby',note.id);
    note.textContent='Local actions: copy, retry, save, fork, share, next.';
    bubble.append(actions,note);
  }

  function appendTextBlock(target,text){
    if(!text)return;
    const blocks=String(text).split(/\n{2,}/);
    for(const block of blocks){
      if(!block)continue;
      const p=document.createElement('p');
      p.textContent=block;
      target.appendChild(p);
    }
  }

  function appendCodeBlock(target,code,language){
    const wrapper=document.createElement('div');
    wrapper.className='runtime-code-block';
    const header=document.createElement('div');
    header.className='runtime-code-header';
    const label=document.createElement('span');
    label.textContent=language||'code';
    const copy=document.createElement('button');
    copy.type='button';
    copy.textContent='Copy code';
    copy.setAttribute('aria-label','Copy code block');
    copy.addEventListener('click',async()=>{
      try{await navigator.clipboard.writeText(code);setStatus('Code copied.','ready');}
      catch(error){setStatus('Copy failed in this browser.','error');}
    });
    header.append(label,copy);
    const pre=document.createElement('pre');
    const codeEl=document.createElement('code');
    codeEl.textContent=code;
    pre.appendChild(codeEl);
    wrapper.append(header,pre);
    target.appendChild(wrapper);
  }

  function renderMessageContent(target,content,role){
    target.innerHTML='';
    const value=String(content||'');
    if(role!=='assistant'||!value.includes('```')){
      appendTextBlock(target,value);
      return;
    }

    const fence=/```([^\n`]*)\n?([\s\S]*?)```/g;
    let lastIndex=0;
    let match;
    while((match=fence.exec(value))!==null){
      appendTextBlock(target,value.slice(lastIndex,match.index));
      appendCodeBlock(target,match[2]||'',String(match[1]||'').trim());
      lastIndex=fence.lastIndex;
    }
    appendTextBlock(target,value.slice(lastIndex));
  }

  function cleanMessageMeta(value){
    const raw=String(value||'').trim();
    if(!raw)return '';
    if(/MMIR Free Control Plane|MMIR Browser Guide|MMIR Guide|mmir[-_\s]+guide|mmir[-_\s]+supergeni(?:us|ous)|supergeni(?:us|ous)/i.test(raw)){
      return SUPERGENIUS_LABEL;
    }
    return raw;
  }

  function renderMessage(message){
    if(!transcriptEl)return null;
    const bubble=document.createElement('article');
    bubble.className='runtime-message runtime-message-'+message.role;
    bubble.dataset.messageId=message.id;
    bubble.setAttribute('aria-label',(message.role==='user'?'User':'Assistant')+' message');
    const label=document.createElement('span');
    label.className='runtime-message-label';
    const cleanMeta=cleanMessageMeta(message.meta);
    label.textContent=message.role==='user'?'You':(cleanMeta||SUPERGENIUS_LABEL);
    const body=document.createElement('div');
    body.className='runtime-message-body';
    renderMessageContent(body,message.content,message.role);
    bubble.append(label,body);
    renderMessageActions(bubble,message);
    transcriptEl.appendChild(bubble);
    scrollTranscriptToBottom();
    return body;
  }

  function renderStoredMessages(){
    if(!transcriptEl)return;
    transcriptEl.innerHTML='';
    for(const message of messages){renderMessage(message);}
    updateChatSurfaceState();
  }

  function appendMessage(role,content,meta,extra){
    const message=createMessage(role,content,meta,extra);
    messages.push(message);
    messages=messages.slice(-MAX_STORED_MESSAGES);
    saveMessages();
    const body=renderMessage(message);
    updateChatSurfaceState();
    return {message,body};
  }

  function updateMessage(id,content,meta){
    const message=messages.find(item=>item.id===id);
    if(message){
      message.content=String(content||'');
      if(meta!==undefined)message.meta=String(meta||'');
      saveMessages();
    }
    const bubble=transcriptEl?.querySelector('[data-message-id="'+CSS.escape(id)+'"]');
    const body=bubble?.querySelector('.runtime-message-body');
    if(body&&message)renderMessageContent(body,message.content,message.role);
    let small=bubble?.querySelector('small');
    if(bubble&&meta!==undefined&&!small&&meta){small=document.createElement('small');bubble.appendChild(small);}
    if(small&&meta!==undefined)small.textContent=String(meta||'');
    if(bubble&&message)renderMessageActions(bubble,message);
    scrollTranscriptToBottom();
    updateChatSurfaceState();
  }

  function clearConversation(){
    if(busy){setStatus('Wait for the current response before clearing.','loading');return;}
    messages=[];
    saveMessages();
    if(transcriptEl)transcriptEl.innerHTML='';
    updateChatSurfaceState();
    setStatus('Conversation cleared for this workspace.','idle');
    if(promptEl)promptEl.focus();
  }

  function switchWorkspace(){
    if(busy){
      pendingWorkspaceSwitch=true;
      setStatus('Workspace will switch after the current response.','loading');
      return;
    }
    pendingWorkspaceSwitch=false;
    messages=loadMessages();
    renderStoredMessages();
    setStatus('Workspace loaded.','idle');
  }

  function stopCurrentResponse(){
    if(!currentAbortController)return;
    stopRequested=true;
    currentAbortController.abort();
    setStatus('Stopping response...','loading');
  }

  function retryMessage(message){
    if(busy||!promptEl)return;
    if(!message.retryPrompt)return;
    promptEl.value=message.retryPrompt;
    promptEl.focus();
    setMessageActionStatus(message.id,'Retrying with the same local/private routing rules.','loading');
    recordMessageAction('retry',message);
    sendMessage();
  }

  function defaultMmirInstruction(){
    return [
      'You are Supergeni, the default assistant on MMIR.ai.',
      'Answer the user question first with useful, direct substance.',
      'Do not turn ordinary chats into setup/support flows.',
      'MMIR is the orchestration layer for trusted AI; explain that only when relevant.',
      'No frontend secrets; label privacy and local-node options honestly when relevant.'
    ].join('\n');
  }

  function hardwareSummary(hardware){
    if(!hardware||typeof hardware!=='object')return '';
    const cpu=hardware.cpu_count?String(hardware.cpu_count)+'c':'CPU';
    const ram=hardware.memory_gb?String(hardware.memory_gb)+'GB RAM':'RAM';
    const tier=hardware.memory_tier?String(hardware.memory_tier):'local';
    return cpu+' / '+ram+' / '+tier;
  }

  function contextMessages(prompt,backendMemory='',backendKnowledge=''){
    const history=messages
      .filter(message=>message.role==='user'||message.role==='assistant')
      .filter(message=>message.content&&message.content!=='Thinking...')
      .slice(-MAX_CONTEXT_MESSAGES);
    if(history.length&&history[history.length-1].role==='user'&&history[history.length-1].content===prompt){
      history.pop();
    }
    const historyMessages=history.map(message=>({role:message.role,content:message.content}));
    const role=activeRole();
    if(!backendMemory)lastBackendMemoryUses=[];
    if(!backendKnowledge)lastBackendKnowledgeUses=[];
    const memory=activeMemoryInstruction(prompt);
    const knowledge=relevantKnowledgeInstruction(prompt);
    const runtime=runtimeInstruction();
    const knowledgeUse=knowledgeUseSummary();
    const next=historyMessages.concat([{role:'user',content:prompt}]);
    const system=[{role:'system',content:defaultMmirInstruction()}];
    const modes=modeInstruction();
    const controls=contextControls();
    window.__MimirLastAnswerContext={memory:contextState(Boolean(memory),Boolean(backendMemory),controls.memory===false),knowledge:contextState(Boolean(knowledge),Boolean(backendKnowledge),controls.knowledge===false),history_messages:historyMessages.length,runtime_settings_used:Boolean(runtime),mode_summary:modes.split('\n').filter(Boolean).map(item=>item.split(':')[0]).join(', '),role_preset:role?.label||'',...knowledgeUse};
    if(modes)system.push({role:'system',content:modes});
    if(role)system.push({role:'system',content:role.instruction});
    if(runtime)system.push({role:'system',content:runtime});
    if(memory)system.push({role:'system',content:memory});
    if(backendMemory)system.push({role:'system',content:backendMemory});
    if(knowledge)system.push({role:'system',content:knowledge});
    if(backendKnowledge)system.push({role:'system',content:backendKnowledge});
    return system.concat(next);
  }
  function webLlmContextMessages(prompt){
    const raw=contextMessages(prompt).filter(message=>message&&message.content&&(message.role==='system'||message.role==='user'||message.role==='assistant'));
    const systemContent=raw.filter(message=>message.role==='system').map(message=>message.content).join('\n\n').trim();
    const rest=raw.filter(message=>message.role!=='system');
    return systemContent?[{role:'system',content:systemContent}].concat(rest):rest;
  }

  function normalizeModels(payload){
    const models=Array.isArray(payload?.data)?payload.data:Array.isArray(payload?.models)?payload.models:[];
    return models.map(model=>({
      id:String(model.id||model.name||model.model||'').trim(),
      label:polishedModelLabel(model),
      status:String(model.status||'available'),
      recommended:Boolean(model.recommended),
      resources:model.resources||{}
    })).filter(model=>model.id&&model.status!=='planned'&&model.status!=='premium_planned')
      .sort((a,b)=>launchModelRank(a)-launchModelRank(b)||a.id.localeCompare(b.id));
  }

  function launchModelRank(model){
    const id=String(model?.id||'').toLowerCase();
    if(id==='mmir-supergenius'||id==='mmir-guide')return 0;
    if(/qwen2\.5:0\.5b|qwen3:0\.6b|gemma3:270m|smollm2:135m/.test(id))return 10;
    if(/llama3\.2:1b|qwen2\.5:1\.5b/.test(id))return 20;
    const ram=Number(model?.resources?.estimated_ram_gb||0);
    if(ram>0)return 30+ram;
    return model?.recommended?80:90;
  }

  function polishedModelLabel(model){
    const id=String(model?.id||model?.model||'').trim();
    const raw=String(model?.display_name||model?.name||model?.label||model?.id||model?.model||'').trim();
    if(id==='mmir-guide'||id==='mmir-supergenius'||/supergenious|supergenius/i.test(raw)){
      return SUPERGENIUS_LABEL;
    }
    return raw;
  }

  function fallbackStarterModels(){
    return [
      {id:'mmir-supergenius',label:SUPERGENIUS_LABEL,runtime:'auto',status:'hosted-free',cost:'free hosted',model:'mmir-supergenius',best_for:'Immediate hosted chat. No setup, no local model and no paid route required.'},
      {id:'mmir-guide',label:'MMIR Guide',runtime:'browser-guide',status:'live-browser',cost:'free',best_for:'Setup help.',visibility:'internal'},
      {id:'mmir-model-picker',label:'MMIR Model Picker',runtime:'browser-guide',status:'live-browser',cost:'free',best_for:'Choose model.',visibility:'internal'},
      {id:'mmir-setup-coach',label:'MMIR Setup Coach',runtime:'browser-guide',status:'live-browser',cost:'free',best_for:'Local setup.',visibility:'internal'},
      {id:'mmir-security-coach',label:'MMIR Security Coach',runtime:'browser-guide',status:'live-browser',cost:'free',best_for:'Security.',visibility:'internal'},
      {id:'mmir-growth-coach',label:'MMIR Growth Coach',runtime:'browser-guide',status:'live-browser',cost:'free',best_for:'Growth.',visibility:'internal'},
      {id:'webllm-qwen25-05b',label:'Browser Model - experimental',runtime:'webllm',status:'lab_proof_required',trust_level:'unverified',promotion_state:'hidden_candidate',visibility:'advanced',public_headline:false,promotion_allowed:false,proof_status:'pending_supported_browser_live_answer',license_review_status:'pending',integrity_review_status:'pending',fallback_status:'fallback_to_supergeni_until_model_answers',runtime_package:'@mlc-ai/web-llm',public_surface:'advanced_only_until_proven',cost:'free browser',model:'Qwen2.5-0.5B-Instruct-q4f16_1-MLC',best_for:'Advanced browser candidate kept as untrusted until live proof and policy review complete.'},
      {id:'ollama-gemma3-270m',label:'Gemma 3 270M',runtime:'ollama',status:'installable-free',cost:'free local',model:'gemma3:270m',size:'292 MB',best_for:'Tiny local.'},
      {id:'ollama-llama32-1b',label:'Llama 3.2 1B',runtime:'ollama',status:'installable-free',cost:'free local',model:'llama3.2:1b',size:'1.3 GB',best_for:'Laptop local.'}
    ];
  }

  async function loadStarterModels(){
    try{
      const response=await fetch(STARTER_MODEL_CATALOG,{cache:'default'});
      if(!response.ok)throw new Error('starter model catalog unavailable');
      const data=await response.json();
      starterModels=(Array.isArray(data.models)?data.models:[]).filter(model=>model?.id&&model?.label);
    }catch(error){
      starterModels=fallbackStarterModels();
    }
    if(!starterModels.length)starterModels=fallbackStarterModels();
    renderModels([]);
    renderLiveProof('Browser helper routes verified. Backend/model proof starts when a free live route is reachable.','ready',baseProofItems(''));
    setStatus('Free browser/installable models ready. Local node checks in background.','ready');
  }

  function starterValue(model){
    return STARTER_PREFIX+model.id;
  }

  function starterFromValue(value){
    const id=String(value||'').startsWith(STARTER_PREFIX)?String(value).slice(STARTER_PREFIX.length):'';
    return starterModels.find(model=>model.id===id)||null;
  }

  function selectedStarterModel(){
    return modelSelect?starterFromValue(modelSelect.value):null;
  }

  function selectStarterModelById(starterId){
    const id=String(starterId||'').trim();
    const starter=starterModels.find(model=>model.id===id)||null;
    const value=starter?starterValue(starter):STARTER_PREFIX+id;
    const optionReady=Boolean(modelSelect&&Array.from(modelSelect.options||[]).some(option=>option.value===value));
    if(!starter||!optionReady){
      pendingStarterHandoff={...(pendingStarterHandoff||{}),starter_id:id};
      return null;
    }
    modelSelect.value=value;
    modelSelect.dispatchEvent(new Event('change',{bubbles:true}));
    if(starter.model&&starter.runtime!=='auto')preferProofModel(starter.model);
    renderModelHelper();
    updateRuntimeChips();
    updateRuntimeModelActions();
    window.MimirComposerModelPicker?.render?.();
    setStatus('Prepared '+(starter.model||starter.label)+' for install/proof. No paid route.','ready');
    return starter;
  }

  function runStarterHandoff(detail){
    const starterId=String(detail?.starter_id||detail?.id||'').trim();
    if(!starterId)return;
    pendingStarterHandoff={...detail,starter_id:starterId};
    const starter=selectStarterModelById(starterId);
    openPanel('#mimir-chat-runtime');
    if(!starter)return;
    pendingStarterHandoff=null;
    window.MimirActivationTelemetry?.record?.('runtime-starter-handoff',{status:detail?.action||'select',model:starter.model||starter.id,route:'chat runtime',free:true,note:'Runtime selected '+(starter.model||starter.id)+'. no_paid_routes_started:true.'});
    if(detail?.action==='install'&&starter.runtime==='ollama'){
      window.setTimeout(()=>installSelectedStarterModel(),120);
    }else if(detail?.action==='proof'){
      window.setTimeout(()=>refreshState(true),120);
    }
  }

  function starterInstallRepairTarget(error){
    if(error?.status===401)return '#node-dashboard';
    if(error?.status===404)return '#local-connector';
    return '#node-dashboard';
  }

  function starterInstallRepairFallback(starter,model,error){
    const target=starterInstallRepairTarget(error);
    const existing=readRepairResume();
    const message=error?.status===401?'Pair browser with local node.':
      error?.status===404?'Update/restart Local Node for model install.':
      'Start Local Node/Ollama, then retry starter.';
    pendingStarterHandoff={starter_id:starter?.id||'',action:'install',model};
    const resume=writeRepairResume({action:'starter-install-repair',target,model,starter_id:starter?.id||'',note:'Install failed for '+model+'. '+message,retry_count:Number(existing?.retry_count||0)});
    window.MimirActivationTelemetry?.record?.('starter-install-repair',{status:'needs-action',model,route:target,free:true,note:'Starter install repair opened '+target+'. no_paid_routes_started:true.'});
    window.dispatchEvent(new CustomEvent('mmir-starter-install-repair-opened',{detail:resume}));
    openPanel('#node-dashboard');
    if(target==='#local-connector')openPanel('#local-connector');
    return message+' MMIR opened repair and kept '+model+' selected.';
  }

  function handleRepairResumeChecked(event){
    const resume=event?.detail||readRepairResume();
    if(!resume||resume.action!=='starter-install-repair')return;
    if(resume.status!=='needs-model'||!resume.starter_id)return;
    if(Number(resume.retry_count||0)>=1||resume.status==='retrying')return;
    const next=writeRepairResume({...resume,status:'retrying',retry_count:Number(resume.retry_count||0)+1,retry_at:new Date().toISOString(),note:'Retrying preserved starter install once after repair.'});
    pendingStarterHandoff={starter_id:next.starter_id,action:'install',model:next.model||''};
    window.MimirActivationTelemetry?.record?.('starter-install-retry',{status:'retrying',model:next.model||'',route:'chat runtime',free:true,note:'Retrying starter install once. no_paid_routes_started:true.'});
    runStarterHandoff({starter_id:next.starter_id,model:next.model||'',action:'install',source:'repair-resume',free:true,no_paid_routes_started:true});
  }

  function closeStarterRetrySuccess(readyModel){
    const resume=readRepairResume();
    if(!resume||resume.action!=='starter-install-repair')return null;
    const model=String(readyModel||resume.model||'').trim();
    const next=writeRepairResume({...resume,status:'verified',model,model_count:1,target:'#mimir-prompt',note:'Starter retry installed '+(model||'the selected model')+'; preparing proof and first chat.'});
    window.dispatchEvent(new CustomEvent('mmir-repair-resume-checked',{detail:next}));
    window.MimirActivationTelemetry?.record?.('starter-retry-success',{status:'verified',model,route:'chat runtime',free:true,first_chat_ready:true,note:'Starter retry verified first-chat readiness. no_paid_routes_started:true.'});
    if(promptEl&&!String(promptEl.value||'').trim()){
      promptEl.value='Give me my first useful MMIR answer with '+(model||'this verified local model')+'.';
      promptEl.dispatchEvent(new Event('input',{bubbles:true}));
    }
    return next;
  }

  function starterAvailabilityLabel(model){
    if(model?.runtime==='auto')return 'ready now - instant free chat';
    if(model?.runtime==='browser-guide')return 'advanced helper';
    if(model?.runtime==='webllm'){
      const support=browserNodeSupport();
      if(webGpuAvailable())return 'Browser Node ready - free/private/starter';
      if(support.webgpu&&support.requires_shader_f16&&support.shader_f16===false)return 'Browser Node unsupported - shader-f16 needed';
      return 'Browser Node unsupported - WebGPU/WASM needed';
    }
    if(model?.status==='installable-free')return 'install to activate - free local';
    return String(model?.status||'free').replaceAll('-',' ');
  }

  function preferredStarterModel(){
    const supergenius=starterModels.find(model=>model.id==='mmir-supergenius')||
      starterModels.find(model=>model.runtime==='auto');
    if(supergenius)return supergenius;
    const guide=starterModels.find(model=>model.id==='mmir-guide')||
      starterModels.find(model=>model.runtime==='browser-guide');
    if(guide)return guide;
    const webGpu=starterModels.find(model=>model.runtime==='webllm');
    if(webGpu&&webGpuAvailable())return webGpu;
    return starterModels[0]||null;
  }
  function noModelFallbackStarter(){
    const fallback=preferredStarterModel();
    if(!fallback||!modelSelect)return null;
    const value=starterValue(fallback);
    if(!Array.from(modelSelect.options||[]).some(option=>option.value===value))return null;
    modelSelect.value=value;
    modelSelect.disabled=false;
    modelSelect.dispatchEvent(new Event('change',{bubbles:true}));
    setStatus('No live backend model yet. MMIR selected a free starter route instead.','ready');
    return fallback;
  }

  function commandLines(model){
    const ollamaModel=String(model?.model||'').trim();
    const envValue=ollamaModel||'gemma3:270m';
    return {
      windows:[
        'iwr -UseBasicParsing https://mmir.ai/downloads/mmir-local-connector-windows.ps1 -OutFile mmir-local-connector-windows.ps1',
        '$env:MMIR_MODEL="'+envValue+'"',
        '.\\mmir-local-connector-windows.ps1'
      ],
      unix:[
        'curl -fsSL https://mmir.ai/downloads/mmir-local-node-macos-linux.sh | MMIR_MODEL='+envValue+' bash'
      ],
    };
  }

  function safeExternalUrl(value){
    try{
      const url=new URL(String(value||''));
      return ['https:','http:'].includes(url.protocol)?url.href:'';
    }catch(error){
      return '';
    }
  }

  function modelComplianceNote(model){
    const parts=[];
    if(model?.commercial_use)parts.push('Commercial use: '+model.commercial_use);
    if(model?.source_url)parts.push('Source/model card: verify before production use');
    return parts.join(' - ');
  }

  function renderModelHelper(){
    if(!modelHelperEl||!modelSelect)return;
    const model=selectedStarterModel();
    if(!model){
      modelHelperEl.hidden=true;
      modelHelperEl.innerHTML='';
      return;
    }
    const isAuto=model.runtime==='auto';
    const isGuide=model.runtime==='browser-guide';
    const isWebLlm=model.runtime==='webllm';
    const commands=commandLines(model);
    const sourceUrl=safeExternalUrl(model.source_url);
    const complianceNote=modelComplianceNote(model);
    modelHelperEl.hidden=false;
    modelHelperEl.innerHTML=''+
      '<div class="runtime-model-helper-head">'+
        '<div><strong>'+escapeHtml(model.label)+'</strong><span>'+escapeHtml(starterAvailabilityLabel(model))+' - '+escapeHtml(model.cost||'free')+'</span></div>'+
        '<a class="button-link" href="#backend-settings">Connect local profile</a>'+
      '</div>'+
      '<p>'+escapeHtml(model.best_for||model.install_note||'Free model option.')+'</p>'+
      (isAuto?'<p>Ready now. MMIR routes this prompt to the hosted free Supergeni path first, then local/private routes can take over after they are verified live.</p>':
      isGuide?'<p>This helper works immediately in the browser. Choose Browser Node/WebGPU or Ollama when you want a real local LLM.</p>':
      isWebLlm?'<p>'+escapeHtml(browserNodeStatusCopy())+'</p><p>Route receipt shape: node_type=browser, trust_class=device-local, cost_class=free-user-device, quality_tier=starter, execution_boundary=current-browser-session, prompt_left_device=false.</p>':
        '<div class="runtime-install-grid">'+
          '<div><strong>Windows</strong><pre><code>'+escapeHtml(commands.windows.join('\n'))+'</code></pre></div>'+
          '<div><strong>Mac</strong><pre><code>'+escapeHtml(commands.unix.join('\n'))+'</code></pre><p>Recommended Mac path: paste this in Terminal. ZIP, .command and DMG remain advanced fallbacks.</p></div>'+
          '<div><strong>Linux / Raspberry Pi</strong><pre><code>'+escapeHtml(commands.unix.join('\n'))+'</code></pre></div>'+
        '</div>'+
        '<div class="runtime-helper-actions">'+
          '<a class="button-link" href="./downloads/mmir-local-connector-install.html#terminal-install">Mac Terminal command</a>'+
          '<a class="button-link" href="./downloads/mmir-local-connector-windows.cmd" download>Download Windows installer</a>'+
          '<a class="button-link" href="./downloads/mmir-local-connector-linux.sh" download>Download Linux installer</a>'+
          '<button id="install-selected-model" type="button">Install in Local Node</button>'+
          '<button id="refresh-model-pulls" type="button">Check install progress</button>'+
        '</div>')+
      '<p id="model-install-status" class="runtime-model-install-status" data-state="idle" aria-live="polite">'+escapeHtml(currentModelInstall?.message||'Local install runs through MMIR Local Node when available.')+'</p>'+
      '<small>'+escapeHtml(model.install_note||'Installer keeps MMIR Local Node bound to localhost and pairs before chat/model control.')+'</small>'+
      (complianceNote?'<small>'+escapeHtml(complianceNote)+(sourceUrl?' <a href="'+escapeHtml(sourceUrl)+'" target="_blank" rel="noopener noreferrer">Open source</a>':'')+'</small>':'');
    modelHelperEl.querySelector('#install-selected-model')?.addEventListener('click',installSelectedStarterModel);
    modelHelperEl.querySelector('#refresh-model-pulls')?.addEventListener('click',()=>pollModelInstall(true));
  }

  function setModelInstallStatus(message,state){
    currentModelInstall={...(currentModelInstall||{}),message:String(message||''),state:state||'idle'};
    const el=document.getElementById('model-install-status');
    if(el){
      el.textContent=currentModelInstall.message;
      el.dataset.state=currentModelInstall.state;
    }
  }

  async function activeLocalConnection(){
    let profile=activeProfile();
    if(!profile||!cleanUrl(profile.url)||!api.isLocal(profile)){
      profile=window.MimirBackendProfiles?.ensureFreeLocalProfile?.()||profile;
    }
    const url=cleanUrl(profile?.url);
    if(!profile||!url)throw new Error('Create the free local profile first.');
    const token=await pairIfNeeded(profile,url);
    return {profile,url,headers:authHeaders(token)};
  }

  async function installSelectedStarterModel(){
    const starter=selectedStarterModel();
    const model=String(starter?.model||'').trim();
    if(!starter||starter.runtime!=='ollama'||!model){
      setModelInstallStatus('Choose an installable Ollama model first.','error');
      return;
    }
    try{
      setModelInstallStatus('Starting local model install for '+model+'...','loading');
      const connection=await activeLocalConnection();
      const job=await fetchJson(joinUrl(connection.url,'/models/pull'),{
        method:'POST',
        headers:connection.headers,
        body:JSON.stringify({model}),
        timeoutMs:10000
      });
      currentModelInstall={id:job.id,model,connection,message:'Install queued for '+model+'.',state:'loading'};
      setModelInstallStatus('Install queued for '+model+'.','loading');
      pollModelInstall(true);
    }catch(error){
      const repairMessage=starterInstallRepairFallback(starter,model,error)||friendlyError(error);
      setModelInstallStatus(repairMessage,'error');
      setStatus(repairMessage,'error');
    }
  }

  async function pollModelInstall(force){
    if(!currentModelInstall?.id||!currentModelInstall?.connection){
      if(force)setModelInstallStatus('No model install job is active yet.','idle');
      return;
    }
    window.clearTimeout(modelInstallPollTimer);
    try{
      const {url,headers}=currentModelInstall.connection;
      const job=await fetchJson(joinUrl(url,'/models/pulls/'+encodeURIComponent(currentModelInstall.id)),{
        headers,
        timeoutMs:8000
      });
      const percent=typeof job.percent==='number'?' '+String(job.percent)+'%':'';
      if(job.status==='ready'){
        const readyModel=String(job.model||currentModelInstall.model||'').trim();
        if(readyModel)preferProofModel(readyModel);
        setModelInstallStatus((readyModel||'Model')+' installed. Preparing verified chat...','ready');
        closeStarterRetrySuccess(readyModel);
        window.dispatchEvent(new CustomEvent('mmir-model-install-ready',{detail:{model:readyModel,first_chat_bridge:true}}));
        await refreshState(true);
        return;
      }
      if(job.status==='failed'){
        setModelInstallStatus('Install failed: '+(job.error||'unknown error'),'error');
        return;
      }
      setModelInstallStatus((job.model||currentModelInstall.model)+' '+(job.phase||job.status||'installing')+percent,'loading');
      modelInstallPollTimer=window.setTimeout(()=>pollModelInstall(false),2500);
    }catch(error){
      setModelInstallStatus(friendlyError(error),'error');
    }
  }

  async function deleteSelectedLiveModel(){
    const model=selectedLiveModel();
    if(!model)return;
    if(!window.confirm('Remove '+model+' from the local Ollama runtime?'))return;
    try{
      setStatus('Removing local model '+model+'...','loading');
      const connection=await activeLocalConnection();
      await fetchJson(joinUrl(connection.url,'/models/delete'),{
        method:'POST',
        headers:connection.headers,
        body:JSON.stringify({model}),
        timeoutMs:30000
      });
      setStatus('Model removed. Refreshing model list...','ready');
      await refreshState(true);
    }catch(error){
      setStatus(friendlyError(error),'error');
    }
  }

  function renderModels(models){
    if(!modelSelect)return;
    lastRenderedModels=Array.isArray(models)?models.slice():[];
    const previous=modelSelect.value;
    modelSelect.innerHTML='';
    if(models.length){
      const liveGroup=document.createElement('optgroup');
      liveGroup.label='Live from active backend - real chat';
      for(const model of models){
        const option=document.createElement('option');
        option.value=model.id;
        option.textContent=(model.label||model.id)+' - live';
        option.dataset.runtime='live';
        liveGroup.appendChild(option);
      }
      modelSelect.appendChild(liveGroup);
    }

    if(starterModels.length){
      const autoGroup=document.createElement('optgroup');
      autoGroup.label='Ready now: instant free chat';
      const browserGroup=document.createElement('optgroup');
      browserGroup.label='Advanced helpers';
      const webGpuGroup=document.createElement('optgroup');
      webGpuGroup.label='Advanced: browser model experiments';
      const installGroup=document.createElement('optgroup');
      installGroup.label='Install to activate: local models';
      for(const model of starterModels){
        if(internalStarter(model))continue;
        const option=document.createElement('option');
        option.value=starterValue(model);
        option.textContent=model.label+' - '+starterAvailabilityLabel(model);
        option.dataset.runtime=model.runtime||'starter';
        if(model.runtime==='auto')autoGroup.appendChild(option);
        else if(model.runtime==='browser-guide')browserGroup.appendChild(option);
        else if(model.runtime==='webllm')webGpuGroup.appendChild(option);
        else installGroup.appendChild(option);
      }
      if(autoGroup.children.length)modelSelect.appendChild(autoGroup);
      if(browserGroup.children.length)modelSelect.appendChild(browserGroup);
      if(webGpuGroup.children.length)modelSelect.appendChild(webGpuGroup);
      if(installGroup.children.length)modelSelect.appendChild(installGroup);
    }

    const values=Array.from(modelSelect.options||[]).map(option=>option.value);
    const liveValues=(models||[]).map(model=>model.id).filter(Boolean);
    const preferredLive=preferredProofModel&&liveValues.includes(preferredProofModel)?preferredProofModel:'';
    if(preferredLive){
      modelSelect.value=preferredLive;
    }
    else if(liveValues.length&&(String(previous||'').startsWith(STARTER_PREFIX)||!liveValues.includes(previous))){
      modelSelect.value=liveValues[0];
    }
    else if(previous&&values.includes(previous)&&!(starterFromValue(previous)?.runtime==='webllm'&&!webGpuAvailable()))modelSelect.value=previous;
    else if(liveValues.length)modelSelect.value=liveValues[0];
    else if(!models.length){
      const preferred=preferredStarterModel();
      if(preferred)modelSelect.value=starterValue(preferred);
    }
    modelSelect.disabled=!values.length;
    renderModelHelper();
    updateRuntimeChips();
    updateRuntimeModelActions();
    if(pendingStarterHandoff){
      const handoff=pendingStarterHandoff;
      pendingStarterHandoff=null;
      window.setTimeout(()=>runStarterHandoff(handoff),0);
    }
  }

  async function fetchJson(url,options={}){
    return api.fetchJson(url,options);
  }

  function chunkContent(payload){
    return payload?.choices?.[0]?.delta?.content||payload?.choices?.[0]?.message?.content||payload?.content||'';
  }

  async function readSse(response,onText){
    const reader=response.body.getReader();
    const decoder=new TextDecoder();
    let buffer='';
    let content='';

    while(true){
      const {value,done}=await reader.read();
      if(done)break;
      buffer+=decoder.decode(value,{stream:true});
      const events=buffer.split('\n\n');
      buffer=events.pop()||'';
      for(const event of events){
        const dataLines=event.split('\n').filter(line=>line.startsWith('data:')).map(line=>line.slice(5).trim());
        for(const data of dataLines){
          if(!data)continue;
          if(data==='[DONE]')return content;
          let parsed=null;
          try{parsed=JSON.parse(data);}catch(error){continue;}
          const delta=chunkContent(parsed);
          if(delta){
            content+=delta;
            onText(content);
          }
        }
      }
    }

    return content;
  }

  async function streamPath(url,path,headers,payload,signal,onText){
    const targetAddressSpace=api.loopbackUrl?.(url)?'loopback':undefined;
    const response=await fetch(joinUrl(url,path),{
      method:'POST',
      headers:{...headers,Accept:'text/event-stream'},
      body:JSON.stringify({...payload,stream:true}),
      signal,
      ...(targetAddressSpace?{targetAddressSpace}:null)
    });

    if(!response.ok){
      let data=null;
      try{data=await response.json();}catch(error){data=null;}
      const err=new Error(data?.error?.message||('Request failed with '+response.status));
      err.status=response.status;
      err.payload=data;
      throw err;
    }

    const contentType=response.headers.get('content-type')||'';
    if(response.body&&contentType.includes('text/event-stream')){
      return readSse(response,onText);
    }

    const data=await response.json();
    const content=data?.choices?.[0]?.message?.content||data?.content||'';
    if(content)onText(content);
    return content;
  }

  const CHAT_PATHS=['/chat/completions','/v1/chat/completions','/chat'];
  function canonicalChatUrl(url){return joinUrl(url,'/chat/completions');}

  async function streamChat(url,headers,payload,signal,onText){
    let lastError=null;
    for(const path of CHAT_PATHS){
      try{return await streamPath(url,path,headers,payload,signal,onText);}
      catch(error){
        lastError=error;
        if(error.status!==404)throw error;
      }
    }
    throw lastError;
  }

  async function jsonChat(url,headers,payload,signal){
    let data=null,lastError=null;
    for(const path of CHAT_PATHS){
      try{
        data=await fetchJson(joinUrl(url,path),{method:'POST',headers,body:JSON.stringify({...payload,stream:false}),timeoutMs:60000,signal});
        break;
      }catch(error){
        lastError=error;
        if(error.status!==404)throw error;
      }
    }
    if(!data&&lastError)throw lastError;
    return data?.choices?.[0]?.message?.content||data?.content||'';
  }

  async function chatWithBackend(url,headers,payload,signal,onText){
    try{
      return await streamChat(url,headers,payload,signal,onText);
    }catch(error){
      if(![400,406,501].includes(error.status))throw error;
      const content=await jsonChat(url,headers,payload,signal);
      if(content)onText(content);
      return content;
    }
  }

  async function pairIfNeeded(profile,url){
    return api.pairIfNeeded(profile,url);
  }

  function authHeaders(token){
    return api.authHeaders(token);
  }

  function friendlyError(error){
    return api.friendlyError(error);
  }

  function secureContextAvailable(){
    const protocol=String(window.location?.protocol||'');
    const host=String(window.location?.hostname||'');
    return Boolean(window.isSecureContext||protocol==='https:'||host==='localhost'||host==='127.0.0.1'||host==='::1');
  }

  function wasmAvailable(){
    return typeof WebAssembly==='object'&&typeof WebAssembly.instantiate==='function';
  }

  function browserNodeSupport(){
    const shared=window.__MimirBrowserNodeSupport;
    if(shared&&typeof shared==='object'){
      return {...shared,metadata:browserNodeReceiptMetadata()};
    }
    const secure=secureContextAvailable();
    const wasm=wasmAvailable();
    const webgpu=Boolean(window.navigator?.gpu);
    const missing=[];
    if(!secure)missing.push('secure context');
    if(!wasm)missing.push('WASM');
    if(!webgpu)missing.push('WebGPU');
    return {
      status:missing.length?'unsupported':'checking',
      supported:false,
      secure,
      wasm,
      webgpu,
      reason:missing.length?('Missing '+missing.join(', ')):'Checking WebGPU adapter...',
      metadata:browserNodeReceiptMetadata()
    };
  }

  function webGpuAvailable(){
    const support=browserNodeSupport();
    return support.status==='ready'&&support.supported===true;
  }

  function browserNodeStatusCopy(){
    const support=browserNodeSupport();
    if(support.supported)return 'Browser Node supported: free browser-local/private starter, no provider key, no Cloudflare, no install. First use downloads model weights into this browser cache.';
    return 'Browser Model is unavailable here: '+support.reason+'. Use '+SUPERGENIUS_LABEL+' now or install Local Node/Ollama for a private model path.';
  }

  function modelNeedsShaderF16(modelId){
    return /f16/i.test(String(modelId||''));
  }

  function internalStarter(model){
    return model?.visibility==='internal'||['mmir-guide','mmir-model-picker','mmir-setup-coach','mmir-security-coach','mmir-growth-coach'].includes(String(model?.id||''));
  }

  async function ensureWebLlmEngine(starter,onProgress){
    const modelId=String(starter?.model||'').trim();
    if(!modelId)throw new Error('Browser model id is missing.');
    const support=browserNodeSupport();
    if(!support.secure||!support.wasm||!support.webgpu)throw new Error('WebGPU is unavailable. Use Supergeni now or install the Ollama local-node path.');
    if(webGpuAvailable()&&modelNeedsShaderF16(modelId)&&support.shader_f16===false)throw new Error('WebGPU adapter missing shader-f16 for this browser model. Use Supergeni now or install the Ollama local-node path.');
    if(!webGpuAvailable()){
      onProgress('Checking browser WebGPU adapter...');
      let adapter=null;
      try{
        adapter=typeof window.navigator?.gpu?.requestAdapter==='function'?await window.navigator.gpu.requestAdapter():null;
      }catch(error){
        const detail={
          ...support,
          status:'failed',
          supported:false,
          reason:String(error?.message||error||'WebGPU adapter check failed'),
          detail:'Browser Node failed closed before loading any model.',
          node_type:'browser',
          trust_class:'device-local',
          cost_class:'free-user-device',
          quality_tier:'starter',
          execution_boundary:'current-browser-session'
        };
        window.__MimirBrowserNodeSupport=detail;
        window.dispatchEvent(new CustomEvent('mmir-browser-node-support-updated',{detail}));
        throw new Error('WebGPU adapter check failed. Use Supergeni now or install the Ollama local-node path.');
      }
      const shaderF16=Boolean(adapter?.features?.has?.('shader-f16'));
      const shaderBlocked=Boolean(adapter)&&modelNeedsShaderF16(modelId)&&!shaderF16;
      const supported=Boolean(adapter)&&!shaderBlocked;
      const detail={
        ...support,
        status:supported?'ready':'unsupported',
        supported,
        shader_f16:shaderF16,
        requires_shader_f16:modelNeedsShaderF16(modelId),
        reason:!adapter?'No WebGPU adapter returned':(shaderBlocked?'WebGPU adapter missing shader-f16 for this browser model':'WebGPU, WASM and shader-f16 requirements available'),
        detail:supported?'Browser Node can load an approved WebGPU model after user selection.':(!adapter?'Browser exposed WebGPU but no adapter was available.':'This browser model build needs shader-f16; MMIR keeps Browser Model disabled instead of failing after download.'),
        node_type:'browser',
        trust_class:'device-local',
        cost_class:'free-user-device',
        quality_tier:'starter',
        execution_boundary:'current-browser-session'
      };
      window.__MimirBrowserNodeSupport=detail;
      window.dispatchEvent(new CustomEvent('mmir-browser-node-support-updated',{detail}));
      if(!supported)throw new Error(detail.reason+'. Use Supergeni now or install the Ollama local-node path.');
    }
    if(!webllmModule){
      onProgress('Loading browser model runtime...');
      webllmModule=await import('https://esm.run/@mlc-ai/web-llm');
    }
    if(webllmEngine&&webllmModelId===modelId)return webllmEngine;
    if(webllmEngine&&typeof webllmEngine.unload==='function'){
      try{await webllmEngine.unload();}catch(error){}
    }
    onProgress('Downloading/loading '+(starter.label||modelId)+'...');
    webllmEngine=await webllmModule.CreateMLCEngine(modelId,{
      initProgressCallback:(progress)=>{
        const percent=typeof progress?.progress==='number'?Math.round(progress.progress*100):null;
        const text=progress?.text||'Loading browser model';
        onProgress(percent!==null?text+' '+percent+'%':text);
      }
    });
    webllmModelId=modelId;
    return webllmEngine;
  }

  async function managedSupergeniusContent(prompt,onText,signal){
    const profile=window.MimirBackendProfiles?.ensureManagedApiProfile?.()||activeProfile();
    const url=cleanUrl(profile?.url)||'https://api.mmir.ai';
    const token=await pairIfNeeded(profile,url);
    const headers=authHeaders(token);
    const payload={
      model:'mmir-supergenius',
      messages:contextMessages(prompt),
      ...runtimePayload()
    };
    return chatWithBackend(url,headers,payload,signal,onText);
  }

  async function sendManagedSupergeniusMessage(starter,prompt){
    stopRequested=false;
    currentAbortController=new AbortController();
    setBusy(true);
    appendMessage('user',prompt,SUPERGENIUS_LABEL);
    promptEl.value='';
    const meta=starter?.label||SUPERGENIUS_LABEL;
    const assistant=appendMessage('assistant','Thinking...',meta,{retryPrompt:prompt,model:SUPERGENIUS_LABEL});
    setStatus(SUPERGENIUS_LABEL+' is answering...','loading');
    try{
      const content=await managedSupergeniusContent(prompt,(partial)=>{
        updateMessage(assistant.message.id,partial||'Thinking...',meta);
        setStatus('Streaming from '+SUPERGENIUS_LABEL+'...','loading');
      },currentAbortController.signal);
      updateMessage(assistant.message.id,content||SUPERGENIUS_LABEL+' returned an empty response.',meta);
      writeActiveProfilePatch({health:'ready',liveness:'chat-probed',lastProofAt:new Date().toISOString(),lastProofModel:'mmir-supergenius'});
      uReceipt('mmir-supergenius','api.mmir.ai/free',prompt,content,{route_class:'free',cost_class:'free',provider_called:false,no_paid_routes_started:true});
      renderLiveProof(SUPERGENIUS_LABEL+' answered on the hosted free route. Local/private nodes can still take over after proof.', 'ready', baseProofItems('https://api.mmir.ai').concat([{label:'Chat response',state:'ready',detail:SUPERGENIUS_LABEL}]), proofRepairActions('answered'));
      setStatus(SUPERGENIUS_LABEL+' answered.','ready');
    }catch(error){
      const message=stopRequested?'Response stopped.':friendlyError(error);
      updateMessage(assistant.message.id,message,stopRequested?'stopped':'error');
      writeActiveProfilePatch({health:stopRequested?'ready':'degraded'});
      setStatus(message,stopRequested?'idle':'error');
    }finally{
      currentAbortController=null;
      setBusy(false);
    }
  }

  async function sendWebLlmMessage(starter,prompt){
    stopRequested=false;
    currentAbortController=new AbortController();
    setBusy(true);
    appendMessage('user',prompt,'browser WebGPU');
    promptEl.value='';
    const assistant=appendMessage('assistant','Loading browser model...',starter.label,{retryPrompt:prompt,model:starter.label});
    try{
      const engine=await ensureWebLlmEngine(starter,(message)=>{
        updateMessage(assistant.message.id,message,starter.label);
        setStatus(message,'loading');
      });
      const payloadMessages=webLlmContextMessages(prompt);
      const settings=readRuntimeSettings();
      const chunks=await engine.chat.completions.create({
        messages:payloadMessages,
        temperature:settings.temperature,
        max_tokens:settings.max_tokens,
        top_p:settings.top_p,
        stream:true
      });
      let content='';
      for await(const chunk of chunks){
        if(currentAbortController.signal.aborted){
          if(typeof engine.interruptGenerate==='function')engine.interruptGenerate();
          break;
        }
        const delta=chunk?.choices?.[0]?.delta?.content||'';
        if(delta){
          content+=delta;
          updateMessage(assistant.message.id,content,starter.label);
          setStatus('Streaming from browser model...','loading');
        }
      }
      updateMessage(assistant.message.id,content||'Browser model returned an empty response.',starter.label);
      uReceipt(starter.label||starter.model||'browser WebGPU','browser-webgpu',prompt,content,browserNodeReceiptMetadata({model_id:String(starter?.model||''),starter_id:String(starter?.id||'')}));
      setStatus(stopRequested?'Browser generation stopped.':'Browser model response received.','ready');
    }catch(error){
      const support=browserNodeSupport();
      const metadata=browserNodeReceiptMetadata({model_id:String(starter?.model||''),starter_id:String(starter?.id||''),runtime_status:support.status,error_status:support.supported?'runtime_failed':'unsupported'});
      window.__MimirLastAnswerContext={...(window.__MimirLastAnswerContext||{}),...metadata};
      recordFirstChatReceipt('failed',{
        model:starter.label||starter.model||'browser WebGPU',
        route:'browser-webgpu',
        prompt_chars:prompt.length,
        response_chars:0,
        error_status:support.supported?'runtime_failed':'unsupported',
        ...metadata
      });
      try{
        setStatus('Browser Model unavailable. Switching to '+SUPERGENIUS_LABEL+'...','loading');
        const content=await managedSupergeniusContent(prompt,(partial)=>{
          updateMessage(assistant.message.id,partial||'Thinking...', SUPERGENIUS_LABEL);
        },currentAbortController.signal);
        updateMessage(assistant.message.id,content||SUPERGENIUS_LABEL+' returned an empty response.',SUPERGENIUS_LABEL);
        uReceipt('mmir-supergenius','api.mmir.ai/free',prompt,content,{fallback_from:'browser-webgpu',route_class:'free',cost_class:'free',provider_called:false,no_paid_routes_started:true});
        setStatus('Browser Model was unavailable. '+SUPERGENIUS_LABEL+' answered instead.','ready');
      }catch(fallbackError){
        const fallback=[
          'Browser Node could not start: '+String(error?.message||support.reason||'runtime failed')+'.',
          SUPERGENIUS_LABEL+' fallback also failed: '+friendlyError(fallbackError)+'.',
          'No provider key, Cloudflare setup, paid API or local install was used by the browser route.',
          guideResponse(prompt,{id:'mmir-guide',label:'Setup helper'})
        ].join('\n\n');
        updateMessage(assistant.message.id,fallback,'browser node unavailable');
        setStatus('Browser Model unavailable. Setup helper answered without a paid route.','ready');
      }
    }finally{
      currentAbortController=null;
      setBusy(false);
    }
  }

  function guideResponseText(starter,helperId,wantsModel,wantsConnect,wantsBusiness,emptyPrompt){
    const guideName=starter.label||'Setup helper';
    const parts=[
      guideName+' is active: free browser guidance, not a remote LLM. No provider keys or billing data enter MMIR cloud.',
      'Useful now: chat, pick a free route, install local AI and prove a live model.'
    ];
    if(helperId==='mmir-model-picker'||wantsModel||emptyPrompt){
      parts.push('Best free model path: Gemma 3 270M or SmolLM2 on weak devices; Llama 3.2 1B/3B or Phi-4 Mini on laptops.');
    }
    if(helperId==='mmir-setup-coach'||wantsConnect||emptyPrompt){
      parts.push('Setup path: + Add model, pick free Ollama, run Local Node for Mac/Windows/Linux/Pi/VM, then verify health, models and chat on 127.0.0.1:3000.');
    }
    if(helperId==='mmir-security-coach'){
      parts.push('Security rule: public frontend stays secret-free. Local models use 127.0.0.1 plus pairing; paid routes need backend auth, limits, audit and cost policy.');
    }
    if(helperId==='mmir-growth-coach'||wantsBusiness){
      parts.push('Growth ladder: free useful chat first; later sell managed nodes, premium routing, team governance, marketplace and evals.');
    }
    const primary=wantsBusiness?'Open progress; keep free local chat green before premium routes.':(wantsConnect||emptyPrompt?'Press + Add model and run the free Local Node installer.':'Choose a free starter model.');
    parts.push('Primary next action: '+primary);
    parts.push('No paid route starts here. SaaS/provider keys belong behind a protected backend, never in this public page.');
    return parts.join('\n\n');
  }

  function installResponseText(model,commands){
    return [
      model.label+' is selected as a free local model.',
      'It becomes live when Local Node and Ollama expose it in /models.',
      'Windows:',
      '```powershell\n'+commands.windows.join('\n')+'\n```',
      'Mac / Linux:',
      '```bash\n'+commands.unix.join('\n')+'\n```',
      'After install: keep the local profile active and press Refresh. The model should move from installable-free to live.'
    ].join('\n\n');
  }

  function guideResponse(prompt,starter={}){
    const text=String(prompt||'').toLowerCase();
    const helperId=starter.id||'mmir-guide';
    const wantsModel=/model|modell|llm|ollama|bitnet|1 bit|1-bit|gratis|free/.test(text);
    const wantsConnect=/connect|koble|install|installer|local|lokal|backend|node/.test(text);
    const wantsBusiness=/premium|betalt|marked|market|users|brukere|money|penger|inntekt/.test(text);
    return guideResponseText(starter,helperId,wantsModel,wantsConnect,wantsBusiness,!text);
  }

  function installResponse(model){
    const commands=commandLines(model);
    return installResponseText(model,commands);
  }

  async function sendStarterMessage(starter,prompt){
    if(starter.runtime==='auto'){
      await sendManagedSupergeniusMessage(starter,prompt);
      return;
    }
    if(starter.runtime==='webllm'){
      await sendWebLlmMessage(starter,prompt);
      return;
    }
    setBusy(true);
    const meta=starter.runtime==='browser-guide'?'free browser helper':'installable free local';
    appendMessage('user',prompt,'browser');
    promptEl.value='';
    const answer=starter.runtime==='browser-guide'?guideResponse(prompt,starter):installResponse(starter);
    appendMessage('assistant',answer,meta,{retryPrompt:prompt,model:starter.label});
    uReceipt(starter.label||starter.model||'MMIR starter',starter.runtime==='browser-guide'?'browser-helper':'installable-local',prompt,answer);
    setStatus(starter.runtime==='browser-guide'?'Guide answered locally. Choose + Add model to activate a real model.':'Install path generated.','ready');
    setBusy(false);
  }

  async function tinyChatProbe(url,headers,model){
    const payload={
      model,
      stream:false,
      temperature:0,
      max_tokens:8,
      context_length:512,
      messages:[
        {role:'system',content:'MMIR live-model readiness probe. Reply with OK only.'},
        {role:'user',content:'Reply OK.'}
      ]
    };
    let data=null,lastError=null;
    for(const path of CHAT_PATHS){
      try{
        data=await fetchJson(joinUrl(url,path),{
          method:'POST',
          headers,
          body:JSON.stringify(payload),
          timeoutMs:25000
        });
        break;
      }catch(error){
        lastError=error;
        if(error.status!==404)throw error;
      }
    }
    if(!data&&lastError)throw lastError;
    const content=String(data?.choices?.[0]?.message?.content||data?.content||'').trim();
    return content||'ok';
  }

  async function proveLiveRoute(profile,url,headers,models){
    const candidates=Array.isArray(models)?models:[];
    const firstModel=(preferredProofModel?candidates.find(model=>model.id===preferredProofModel):null)||candidates[0]||null;
    const bridgeModel=Boolean(preferredProofModel&&firstModel?.id===preferredProofModel);
    if(preferredProofModel&&!bridgeModel&&candidates.length)preferredProofModel='';
    const items=baseProofItems(url);
    if(!firstModel?.id){
      lastProofSignature='';
      verifiedLiveModel=null;
      renderLiveProof('No backend model is live yet. Browser helper works; connect a free local model to prove chat.', 'idle', items.concat([{label:'Model list',state:'idle',detail:'no live model'}]), proofRepairActions('no-model'));
      window.dispatchEvent(new CustomEvent('mmir-live-model-proof-updated',{detail:{status:'no-live-model',free:true}}));
      return;
    }
    if(!routeLooksFree(profile,url)){
      verifiedLiveModel=null;
      renderLiveProof('Model list verified, but proof is skipped to avoid hidden provider cost. Use Local Node or mark route free/local.', 'blocked', items.concat([{label:'Chat probe',state:'blocked',detail:'cost guard'}]), proofRepairActions('cost-guard'));
      window.dispatchEvent(new CustomEvent('mmir-live-model-proof-updated',{detail:{status:'skipped-cost-guard',model:firstModel.id,free:false}}));
      return;
    }
    const signature=[url,firstModel.id].join('|');
    if(signature===lastProofSignature){
      verifiedLiveModel=firstModel;
      renderLiveProof('Live model proof is already verified for '+firstModel.id+'.', 'ready', items.concat([{label:'Chat probe',state:'ready',detail:firstModel.id}]));
      return;
    }
    renderLiveProof('Proving '+firstModel.id+' with a tiny free chat probe...', 'loading', items.concat([{label:'Chat probe',state:'loading',detail:'max 8 tokens'}]));
    try{
      await tinyChatProbe(url,headers,firstModel.id);
      lastProofSignature=signature;
      verifiedLiveModel=firstModel;
      if(modelSelect&&Array.from(modelSelect.options||[]).some(option=>option.value===firstModel.id)){
        modelSelect.value=firstModel.id;
        updateRuntimeChips();
        updateRuntimeModelActions();
      }
      const shouldAutoFirstAnswer=pendingAutoFirstAnswer&&bridgeModel&&promptEl&&!String(promptEl.value||'').trim()&&chatEmpty();
      if(promptEl&&!String(promptEl.value||'').trim()){
        promptEl.placeholder='Ask '+(firstModel.label||polishedModelLabel(firstModel)||SUPERGENIUS_LABEL)+' anything. This verified free route is selected.';
        if(bridgeModel)promptEl.value='Give first answer from '+firstModel.id+'.';
      }
      writeActiveProfilePatch({health:'ready',liveness:'chat-probed',lastProofAt:new Date().toISOString(),lastProofModel:firstModel.id});
      renderLiveProof(firstModel.id+' answered a tiny free readiness probe. This route is live.', 'ready', items.concat([{label:'Chat probe',state:'ready',detail:firstModel.id}]), proofRepairActions('verified'));
      window.dispatchEvent(new CustomEvent('mmir-live-model-proof-updated',{detail:{status:'verified',model:firstModel.id,free:true,url,first_chat_ready:true}}));
      if(bridgeModel){
        preferredProofModel='';
        window.dispatchEvent(new CustomEvent('mmir-install-to-first-chat-ready',{detail:{model:firstModel.id,first_chat_ready:true}}));
        if(shouldAutoFirstAnswer){
          pendingAutoFirstAnswer=false;
          promptEl.dispatchEvent(new Event('input',{bubbles:true}));
          window.setTimeout(()=>primaryLink?.click(),80);
        }
      }
    }catch(error){
      lastProofSignature='';
      verifiedLiveModel=null;
      writeActiveProfilePatch({health:error?.status===401?'testing':'degraded',liveness:'probe-failed',lastProofError:friendlyError(error)});
      renderLiveProof('Model list loaded, but the tiny chat proof failed: '+friendlyError(error), 'error', items.concat([{label:'Chat probe',state:'error',detail:firstModel.id}]), proofRepairActions('no-model'));
      window.dispatchEvent(new CustomEvent('mmir-live-model-proof-updated',{detail:{status:'failed',model:firstModel.id,error:friendlyError(error)}}));
    }
  }

  async function optionalHealthCheck(profile,url){
    try{return await fetchJson(joinUrl(url,'/health'),{timeoutMs:5000});}
    catch(error){if(profile?.provider==='openai-compatible'&&error.status===404)return {status:'unknown',optional:true};throw error;}
  }

  async function fetchModelInventory(profile,url,headers){
    const paths=['/models','/v1/models'];
    let lastError=null;
    for(const path of paths){
      try{return await fetchJson(joinUrl(url,path),{headers,timeoutMs:8000});}
      catch(error){
        lastError=error;
        if(error.status!==404)throw error;
      }
    }
    throw lastError||new Error('No model inventory route responded.');
  }

  async function refreshState(force){
    ensureSendControl();
    const profile=activeProfile();
    const currentId=activeId();
    if(!force&&currentId===lastActiveId)return;
    lastActiveId=currentId;
    if(!profile||!cleanUrl(profile.url)){
      renderModels([]);
      updateRouteChips({profile:null,models:[],hardware:null,tunnel:null,proof:'idle'});
      renderLiveProof('No backend is active yet. Browser helper works now; use Connect model to prepare a free local profile automatically.','idle',baseProofItems(''),proofRepairActions('offline'));
      setStatus('Free guide and installable local models are ready. Connect a backend to make models live.','ready');
      return [];
    }
    const url=cleanUrl(profile.url);
    try{
      setStatus('Free browser models ready. Checking local node...','loading');
      renderLiveProof('Checking backend health and models before chat proof...','loading',baseProofItems(url));
      await optionalHealthCheck(profile,url);
      const token=await pairIfNeeded(profile,url);
      const headers=authHeaders(token);
      const [models,hardware,tunnel]=await Promise.all([
        fetchModelInventory(profile,url,headers),
        fetchJson(joinUrl(url,'/hardware'),{headers,timeoutMs:5000}).catch(()=>null),
        fetchJson(joinUrl(url,'/tunnels/status'),{headers,timeoutMs:5000}).catch(()=>null)
      ]);
      const normalized=normalizeModels(models);
      renderModels(normalized);
      updateRouteChips({profile,models:normalized,hardware,tunnel,proof:normalized.length?'ready':'idle'});
      writeActiveProfilePatch({health:normalized.length?'ready':'degraded',models:summarizeModels(normalized)});
      setStatus(normalized.length?'Backend ready.':'Backend online. Free installable models are still available below.',normalized.length?'ready':'idle');
      proveLiveRoute(profile,url,headers,normalized);
      return normalized;
    }catch(error){
      renderModels([]);
      updateRouteChips({profile,models:[],hardware:null,tunnel:null,error});
      writeActiveProfilePatch({health:error?.status===401?'testing':'offline'});
      lastProofSignature='';
      verifiedLiveModel=null;
      const s=selectedStarterModel()||preferredStarterModel();
      const sr=s&&(s.runtime==='browser-guide'||s.runtime==='webllm');
      const ok=sr&&(s.runtime!=='webllm'||webGpuAvailable());
      renderLiveProof(sr?(ok?'Free '+s.label+' ready. Local node optional.':'WebGPU unavailable; guide/install ready.'):('Backend proof could not start: '+friendlyError(error)),ok?'ready':'error',baseProofItems(url).concat([{label:'Backend route',state:sr?'idle':'error',detail:sr?'optional':'repair local node'}]),proofRepairActions(ok?'verified':'offline'));
      if(starterModels.length){
        setStatus('Free browser/installable models ready. Local node not running yet.','ready');
      }else{
        setStatus(friendlyError(error),'error');
      }
      return [];
    }
  }

  function modelIdFromConnector(item){
    return String(item?.id||item?.name||item?.model||'').trim();
  }

  function handleLocalConnectorRefreshed(event){
    const detail=event?.detail||{};
    const models=Array.isArray(detail.models)?detail.models:[];
    const rankedModels=normalizeModels({data:models});
    const firstModel=rankedModels[0]?.id||modelIdFromConnector(models[0]);
    const resume=readRepairResume();
    if(resume?.starter_id&&!firstModel)pendingStarterHandoff={starter_id:resume.starter_id,action:'install',model:resume.model||''};
    if(resume?.model)preferProofModel(resume.model);
    if(firstModel&&!/^(off|err|block)/i.test(detail.status||detail.health||'')){window.MimirBackendProfiles?.ensureFreeLocalProfile?.();preferProofModel(firstModel);if(promptEl&&!String(promptEl.value||'').trim()&&chatEmpty())pendingAutoFirstAnswer=true;}
    refreshState(true);
  }

  function handleLocalInstallReturned(){
    window.MimirBackendProfiles?.ensureFreeLocalProfile?.();
    const resume=readRepairResume();
    if(resume?.starter_id)pendingStarterHandoff={starter_id:resume.starter_id,action:'install',model:resume.model||''};
    if(resume?.model)preferProofModel(resume.model);
    if(chatEmpty())pendingAutoFirstAnswer=true;
    lastProofSignature='';
    refreshState(true);
  }

  async function sendMessage(){
    if(busy)return;
    const profile=activeProfile();
    const url=cleanUrl(profile?.url);
    let prompt=String(promptEl?.value||'').trim();
    let model=modelSelect&&!modelSelect.disabled?modelSelect.value:'';
    if(!prompt){
      prompt=defaultFirstPrompt();
      if(promptEl){
        promptEl.value=prompt;
        promptEl.dispatchEvent(new Event('input',{bubbles:true}));
      }
      setStatus('Starting the safest free chat automatically...','loading');
      setComposerActionFeedback('No setup needed. MMIR is starting a free browser chat automatically.','ready');
    }
    const starter=starterFromValue(model);
    if(starter){
      await sendStarterMessage(starter,prompt);
      return;
    }
    if(!model){
      allowLocalChatProbes(profile);
      await refreshState(true);
      model=modelSelect&&!modelSelect.disabled?modelSelect.value:'';
      const refreshedStarter=starterFromValue(model);
      if(refreshedStarter){
        await sendStarterMessage(refreshedStarter,prompt);
        return;
      }
      if(!model){
        const fallback=noModelFallbackStarter();
        if(fallback){
          await sendStarterMessage(fallback,prompt);
          return;
        }
        setStatus('No model route is visible yet. Open + Add model for free browser and local install choices.','error');
        return;
      }
    }
    if(!profile||!url){
      const fallback=noModelFallbackStarter()||preferredStarterModel();
      if(fallback){
        await sendStarterMessage(fallback,prompt);
        return;
      }
      setStatus('Activate a backend profile or choose a free guide/installable model.','error');
      return;
    }
    allowLocalChatProbes(profile);

    stopRequested=false;
    currentAbortController=new AbortController();
    setBusy(true);
    const selectedModel=model;
    const role=activeRole();
    const roleName=role?.label||'';
    const messageMeta=[selectedModel,roleName].filter(Boolean).join(' - ');
    appendMessage('user',prompt,profile.name||profile.provider||'backend');
    promptEl.value='';
    const assistant=appendMessage('assistant','Thinking...',messageMeta,{retryPrompt:prompt,model:selectedModel,rolePreset:roleName});
    setStatus(roleName?'Sending to '+roleName+' role...':'Sending to backend...','loading');
    try{
      const token=await pairIfNeeded(profile,url);
      const headers=authHeaders(token);
      const controls=contextControls();
      const [backendMemory,backendKnowledge]=await Promise.all([
        controls.memory===false?Promise.resolve(''):backendMemoryInstruction(prompt,url,headers),
        controls.knowledge===false?Promise.resolve(''):backendKnowledgeInstruction(prompt,url,headers)
      ]);
      const payloadMessages=contextMessages(prompt,backendMemory,backendKnowledge);
      const payload={model:selectedModel,messages:payloadMessages,...runtimePayload()};
      const content=await chatWithBackend(url,headers,payload,currentAbortController.signal,(partial)=>{
        updateMessage(assistant.message.id,partial||'Thinking...',messageMeta);
        setStatus('Streaming response...','loading');
      });
      updateMessage(assistant.message.id,content||'Backend returned an empty response.',messageMeta);
      writeActiveProfilePatch({health:'ready'});
      uReceipt(selectedModel,profile.provider||profile.name||'backend',prompt,content);
      renderLiveProof('First verified chat answered. Save it or keep building.', 'ready', baseProofItems(url).concat([{label:'Chat response',state:'ready',detail:selectedModel}]), proofRepairActions('answered'));
      setStatus('First answer received.','ready');
    }catch(error){
      const message=stopRequested?'Response stopped.':friendlyError(error);
      updateMessage(assistant.message.id,message,stopRequested?'stopped':'error');
      writeActiveProfilePatch({health:stopRequested?'ready':(error?.status===401?'testing':'degraded')});
      if(!stopRequested){
        recordFirstChatReceipt('failed',{
          model:selectedModel,
          route:profile.provider||profile.name||'backend',
          prompt_chars:prompt.length,
          response_chars:0,
          error_status:error?.status||'network'
        });
        renderLiveProof('First verified chat failed. Recovery is ready; no raw prompt/response stored.', 'error', baseProofItems(url).concat([{label:'Chat response',state:'error',detail:selectedModel}]), proofRepairActions('no-model'));
      }
      setStatus(message,stopRequested?'idle':'error');
    }finally{
      currentAbortController=null;
      setBusy(false);
      if(pendingWorkspaceSwitch)switchWorkspace();
    }
  }

  function init(){
    if(p0ReadyShell()){
      window.__MimirLegacyRuntimeSkippedForP0=true;
      document.body.dataset.mimirLegacyRuntime='skipped-p0';
      window.dispatchEvent(new CustomEvent('mmir-legacy-runtime-skipped',{detail:{reason:'p0-ready-shell'}}));
      return;
    }
    if(!promptEl||!formEl)return;
    installRuntimeUi();
    ensureSendControl();
    messages=loadMessages();
    renderStoredMessages();
    if(primaryLink){primaryLink.addEventListener('click',(event)=>{event.preventDefault();window.__MimirEarlySend=false;sendMessage();});}
    formEl.addEventListener('submit',(event)=>{event.preventDefault();sendMessage();});
    promptEl.addEventListener('keydown',(event)=>{if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();sendMessage();}});
    window.addEventListener('mmir-active-role-changed',()=>{const role=activeRole();setStatus(role?'Role set: '+role.label+'.':'Role preset cleared.','idle');});
    window.addEventListener('mmir-memory-updated',()=>setStatus('Workspace memory updated.','idle'));
    window.addEventListener('mmir-knowledge-updated',()=>setStatus('Workspace knowledge updated.','idle'));
    window.addEventListener('mmir-runtime-settings-updated',()=>setStatus('Runtime settings updated for the next message.','idle'));
    window.addEventListener('mmir-workspace-changed',switchWorkspace);
    window.addEventListener('mmir-local-connector-refreshed',handleLocalConnectorRefreshed);
    window.addEventListener('mmir-local-install-returned',handleLocalInstallReturned);
    window.addEventListener('mmir-repair-resume-checked',handleRepairResumeChecked);
    window.addEventListener('mmir-browser-node-support-updated',()=>{renderModels(lastRenderedModels);updateRuntimeChips();renderModelHelper();updateRuntimeModelActions();});
    window.addEventListener('mimir-route-chips-ready',()=>updateRouteChips(window.__MimirRouteChipState||{}));
    window.addEventListener('mmir-activation-replay-updated',renderActivationReplayGate);
    window.addEventListener('mmir-runtime-starter-handoff',(event)=>runStarterHandoff(event.detail||{}));
    window.addEventListener('storage',()=>{renderActivationReplayGate();refreshState(true);});
    if(window.__MimirEarlySend){window.__MimirEarlySend=false;setComposerActionFeedback('Starting from your first click. Free route stays automatic.','ready');window.setTimeout(()=>sendMessage(),40);}
    loadStarterModels().then(()=>{refreshState(true);handleRepairResumeChecked({detail:readRepairResume()});});
    setInterval(()=>refreshState(false),3000);
    window.addEventListener('focus',()=>refreshState(true));
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
