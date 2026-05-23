(function(){
  const promptEl=document.getElementById('mimir-prompt');
  const primaryLink=document.getElementById('primary-chat-link');
  const statusEl=document.getElementById('first-impression-status');
  const detailEl=document.getElementById('first-impression-detail');
  const backendNode=document.getElementById('instant-node-backend');
  const modelNode=document.getElementById('instant-node-model');
  const instantStart=document.querySelector('.mimir-instant-start');
  ensureActivationCockpitShell();
  const PROFILE_KEY='mimir-chat-backend-profiles';
  const ACTIVE_KEY='mimir-chat-active-backend';
  const MODE_KEY='mimir-chat-mode-controls-v1';
  const WORKSPACE_KEY='mimir-active-workspace-v1';
  const DEFAULT_WORKSPACE_ID='personal';
  const REPAIR_RESUME_PREFIX='mimir-repair-resume-v1:';
  const cockpit=document.getElementById('activation-cockpit');
  const activationCards={
    answer:document.getElementById('activation-answer-card'),
    local:document.getElementById('activation-local-card'),
    model:document.getElementById('activation-model-card'),
    trust:document.getElementById('activation-trust-card')
  };
  const activationStateEls={
    answer:document.getElementById('activation-answer-state'),
    local:document.getElementById('activation-local-state'),
    model:document.getElementById('activation-model-state'),
    trust:document.getElementById('activation-trust-state')
  };
  const activationDetailEls={
    answer:document.getElementById('activation-answer-detail'),
    local:document.getElementById('activation-local-detail'),
    model:document.getElementById('activation-model-detail'),
    trust:document.getElementById('activation-trust-detail')
  };
  const activationButtons={
    chat:document.getElementById('activation-chat-now'),
    connect:document.getElementById('activation-connect-local'),
    models:document.getElementById('activation-open-models'),
    node:document.getElementById('activation-open-node-dashboard')
  };
  let localConnectorState=null;
  let lastCockpitSignature='';
  let lastRailSignature='';
  let lastRepairResumeSignature='';

  function ensureActivationCockpitShell(){
    if(!document.querySelector('link[href*="activation-cockpit.css"]')){
      const link=document.createElement('link');
      link.rel='stylesheet';
      link.href='./apps/mimir-chat-portal/activation-cockpit.css?v=20260522-d115-cockpit';
      document.head.appendChild(link);
    }
    if(document.getElementById('activation-cockpit')||!instantStart)return;
    const section=document.createElement('section');
    section.id='activation-cockpit';
    section.className='activation-cockpit';
    section.setAttribute('aria-label','MMIR activation status');
    section.innerHTML=[
      '<article id="activation-answer-card" class="activation-card is-checking"><div><span class="activation-label">Answer</span><strong id="activation-answer-state">Checking</strong></div><p id="activation-answer-detail">MMIR is finding the safest free route.</p><button id="activation-chat-now" type="button">Chat now</button></article>',
      '<article id="activation-local-card" class="activation-card is-checking"><div><span class="activation-label">Local AI</span><strong id="activation-local-state">Local-first</strong></div><p id="activation-local-detail">Connect one local node to unlock private models.</p><button id="activation-connect-local" type="button">Connect local AI</button></article>',
      '<article id="activation-model-card" class="activation-card is-checking"><div><span class="activation-label">Model</span><strong id="activation-model-state">Selecting</strong></div><p id="activation-model-detail">MMIR is checking live, browser and installable routes.</p><button id="activation-open-models" type="button">Models</button></article>',
      '<article id="activation-trust-card" class="activation-card is-ready"><div><span class="activation-label">Trust</span><strong id="activation-trust-state">Private</strong></div><p id="activation-trust-detail">Local-first routing stays the default boundary.</p><button id="activation-open-node-dashboard" type="button">Node health</button></article>'
    ].join('');
    instantStart.insertAdjacentElement('afterend',section);
  }

  function selectedModel(){
    const select=document.getElementById('runtime-model');
    const option=select?.selectedOptions?.[0];
    return {
      value:select?.value||'',
      text:String(option?.textContent||'').trim(),
      runtime:option?.dataset?.runtime||''
    };
  }

  function runtimeState(){
    return String(document.getElementById('runtime-state')?.textContent||'').trim();
  }

  function readProfiles(){
    try{
      const value=JSON.parse(localStorage.getItem(PROFILE_KEY)||'[]');
      return Array.isArray(value)?value:[];
    }catch(error){
      return [];
    }
  }

  function activeProfile(){
    const id=localStorage.getItem(ACTIVE_KEY)||'';
    return readProfiles().find(profile=>profile.id===id)||null;
  }

  function readModes(){
    try{
      const saved=JSON.parse(localStorage.getItem(MODE_KEY)||'{}');
      return {private:saved.private!==false,boost:Boolean(saved.boost),super:Boolean(saved.super),vision:Boolean(saved.vision)};
    }catch(error){
      return {private:true,boost:false,super:false,vision:false};
    }
  }

  function setNode(el,text,active){
    if(!el)return;
    if(el.textContent!==text)el.textContent=text;
    const nextActive=Boolean(active);
    if(el.classList.contains('is-active')!==nextActive)el.classList.toggle('is-active',nextActive);
  }

  function setText(el,text){
    if(el&&el.textContent!==text)el.textContent=text;
  }

  function safe(value){
    return String(value||'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
  }

  function activeWorkspaceId(){
    try{return localStorage.getItem(WORKSPACE_KEY)||DEFAULT_WORKSPACE_ID;}catch(error){return DEFAULT_WORKSPACE_ID;}
  }

  function readRepairResume(){
    try{
      const value=JSON.parse(localStorage.getItem(REPAIR_RESUME_PREFIX+activeWorkspaceId())||'null');
      return value&&typeof value==='object'?value:null;
    }catch(error){
      return null;
    }
  }

  function repairResumeCopy(resume){
    const status=String(resume?.status||'pending');
    const model=String(resume?.model||'').trim();
    if(status==='verified'){
      const modelCount=Number(resume?.model_count||0);
      return {state:'verified',title:'Repair verified',detail:modelCount?'Local node is back and '+String(modelCount)+' live model'+(modelCount===1?'':'s')+' are visible.':'Connector is back; MMIR can continue the local path.',action:'Chat now',target:'#mimir-prompt'};
    }
    if(status==='needs-model'){
      return {state:'needs-model',title:'Connector is back',detail:'Install or expose one free local model next'+(model?' such as '+model:'')+'. MMIR will verify it automatically.',action:'Open models',target:'#model-library'};
    }
    if(status==='needs-action'){
      return {state:'needs-action',title:'Repair still needs attention',detail:String(resume?.note||'MMIR could not verify the local node yet. Continue with the safest repair path.'),action:'Open node health',target:'#node-dashboard'};
    }
    if(status==='checking'){
      return {state:'checking',title:'Checking repair',detail:'MMIR is verifying connector, runtime and model readiness automatically.',action:'Open local connector',target:'#local-connector'};
    }
    return {state:'pending',title:'Repair started',detail:'Return here after the installer or repair step. MMIR will continue checking automatically.',action:'Resume repair',target:String(resume?.target||'#node-dashboard')};
  }

  function ensureRepairResumeStyles(){
    if(document.querySelector('link[href*="repair-resume.css"]'))return;
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href='./apps/mimir-chat-portal/repair-resume.css?v=20260523-d176';
    document.head.appendChild(link);
  }

  function ensureRepairResumeBanner(){
    let banner=document.getElementById('repair-resume-banner');
    if(banner||!instantStart)return banner;
    ensureRepairResumeStyles();
    banner=document.createElement('aside');
    banner.id='repair-resume-banner';
    banner.className='repair-resume-banner';
    banner.setAttribute('aria-live','polite');
    const rail=document.getElementById('mimir-readiness-rail');
    (rail||instantStart).insertAdjacentElement('afterend',banner);
    return banner;
  }

  function renderRepairResumeBanner(){
    const banner=ensureRepairResumeBanner();
    if(!banner)return;
    const resume=readRepairResume();
    if(!resume){
      if(lastRepairResumeSignature==='hidden')return;
      lastRepairResumeSignature='hidden';
      banner.hidden=true;
      return;
    }
    const copy=repairResumeCopy(resume);
    const signature=[copy.state,copy.title,copy.detail,copy.action,copy.target].join('|');
    if(signature===lastRepairResumeSignature)return;
    lastRepairResumeSignature=signature;
    banner.hidden=false;
    banner.dataset.state=copy.state;
    banner.innerHTML='<div><span>Repair resume</span><strong>'+safe(copy.title)+'</strong><p>'+safe(copy.detail)+'</p></div><a href="'+safe(copy.target)+'" data-repair-resume-action="'+safe(copy.state)+'">'+safe(copy.action)+'</a>';
    banner.querySelector('[data-repair-resume-action]')?.addEventListener('click',(event)=>{
      const target=copy.target||'#node-dashboard';
      window.MimirActivationTelemetry?.record?.('repair-resume-action',{status:copy.state,route:target,free:true,note:'First-screen repair resume action selected.'});
      if(target.startsWith('#')){
        event.preventDefault();
        openPanel(target);
      }
    });
  }

  function setBodyState(add,removeA,removeB){
    if(add&&!document.body.classList.contains(add))document.body.classList.add(add);
    [removeA,removeB].filter(Boolean).forEach(name=>{
      if(document.body.classList.contains(name))document.body.classList.remove(name);
    });
  }

  function setCard(id,state,detail,tone){
    setText(activationStateEls[id],state);
    setText(activationDetailEls[id],detail);
    const card=activationCards[id];
    if(!card)return;
    const tones=['is-ready','is-warning','is-offline','is-checking'];
    const current=tones.find(name=>card.classList.contains(name))||'';
    if(current!==tone){
      tones.forEach(name=>card.classList.remove(name));
      if(tone)card.classList.add(tone);
    }
  }

  function modelKind(model){
    const value=String(model.value||'');
    const text=String(model.text||'');
    return {
      live:Boolean(value&&!value.startsWith('starter:')&&/live/i.test(text)),
      browser:Boolean(value.startsWith('starter:')&&model.runtime==='browser-guide'),
      webgpu:Boolean(model.runtime==='webllm'),
      installable:Boolean(value.startsWith('starter:')&&model.runtime!=='browser-guide'&&model.runtime!=='webllm')
    };
  }

  function cleanModelLabel(model){
    return String(model.text||model.value||'MMIR guide').replace(/\s+-\s+live$/i,'').trim();
  }

  function openPanel(target){
    const targetEl=document.querySelector(target);
    if(targetEl&&'open' in targetEl)targetEl.open=true;
    if(targetEl)targetEl.scrollIntoView({block:'start',behavior:'smooth'});
  }

  function syncActivationCockpit(model,kind){
    if(!cockpit)return;
    const label=cleanModelLabel(model);
    const modes=readModes();
    const localStatus=String(localConnectorState?.status||'').toLowerCase();
    const localModels=Array.isArray(localConnectorState?.models)?localConnectorState.models:[];
    const tunnel=localConnectorState?.tunnel||null;

    if(kind.live){
      setCard('answer','Live','Chat is routed through '+label+'.','is-ready');
      setCard('model','Live',label+' is the active MMIR route.','is-ready');
    }else if(kind.browser||kind.webgpu){
      setCard('answer','Ready',kind.webgpu?'Browser WebGPU route is selected.':'Free browser route is available before setup.','is-ready');
      setCard('model',kind.webgpu?'Browser':'Guide',label+' is active until local models appear.','is-ready');
    }else if(kind.installable){
      setCard('answer','Install','Start with guidance, then install '+label+'.','is-warning');
      setCard('model','Installable',label+' can become a live local model.','is-warning');
    }else{
      setCard('answer','Ready','MMIR can answer with the safest available route.','is-ready');
      setCard('model','Selecting','MMIR is checking live, browser and installable routes.','is-checking');
    }

    if(localStatus==='online'){
      setCard('local','Online',localModels.length?'Local node sees '+String(localModels.length)+' model'+(localModels.length===1?'':'s')+'.':'Local node is online.','is-ready');
    }else if(localStatus==='degraded'){
      setCard('local','Needs model','Connector is online; install or expose a local model.','is-warning');
    }else if(localStatus==='checking'){
      setCard('local','Checking','Local node discovery is running now.','is-checking');
    }else if(localStatus==='error'){
      setCard('local','Offline',String(localConnectorState?.message||'Open Connect to install the local node.'),'is-offline');
    }else{
      setCard('local','Local-first','Connect one local node to unlock private live models.','is-checking');
    }

    if(modes.private){
      setCard('trust',tunnel?.public_url?'Paired tunnel':'Private','Local-first routing stays the default boundary.','is-ready');
    }else{
      setCard('trust','Review','Private mode is off; verify routing before sensitive data.','is-warning');
    }

    const detail={
      answer:activationStateEls.answer?.textContent||'',
      local:activationStateEls.local?.textContent||'',
      model:activationStateEls.model?.textContent||'',
      trust:activationStateEls.trust?.textContent||''
    };
    const signature=JSON.stringify(detail);
    if(signature!==lastCockpitSignature){
      lastCockpitSignature=signature;
      window.dispatchEvent(new CustomEvent('mmir-first-screen-cockpit-updated',{detail}));
    }
  }

  function syncReadyState(){
    const model=selectedModel();
    const state=runtimeState();
    const kind=modelKind(model);

    if(kind.live){
      setText(statusEl,'Your local AI is ready in MMIR.');
      setText(detailEl,model.text.replace(/\s+-\s+live$/i,'')+' is connected through the trusted MMIR control plane. Type anything, or use a smart start below.');
      setNode(backendNode,'Local node',true);
      setNode(modelNode,model.text.replace(/\s+-\s+live$/i,''),true);
      setBodyState('mimir-first-ready','mimir-first-guide','mimir-first-install');
      syncActivationCockpit(model,kind);
      return;
    }

    if(kind.browser||kind.webgpu){
      setText(statusEl,kind.webgpu?'Free browser model is ready.':'Ask now. MMIR will pick the safest route.');
      setText(detailEl,kind.webgpu?'Runs in this browser when WebGPU is available. No paid provider or account required.':'Free browser help is available immediately. Connect local AI only when you want real private local models.');
      setNode(backendNode,'Browser',true);
      setNode(modelNode,model.text||'MMIR guide',true);
      setBodyState('mimir-first-guide','mimir-first-ready','mimir-first-install');
      syncActivationCockpit(model,kind);
      return;
    }

    if(kind.installable){
      setText(statusEl,'Install local AI to finish activation.');
      setText(detailEl,'MMIR can guide the one-file local install and move to live chat when the local node reports the model.');
      setNode(backendNode,'Installer',true);
      setNode(modelNode,model.text||'Free model',true);
      setBodyState('mimir-first-install','mimir-first-ready','mimir-first-guide');
      syncActivationCockpit(model,kind);
      return;
    }

    const loadingDefault=state==='Select a backend to start.'||state==='Loading free model routes...';
    setText(statusEl,state&&!loadingDefault?state:'Open. Connect local AI. Ready.');
    setText(detailEl,'Local node, browser helpers and installable free models are checked automatically through the MMIR control plane.');
    setNode(backendNode,'Checking',false);
    setNode(modelNode,'Model',false);
    syncActivationCockpit(model,kind);
  }

  function ensureReadinessRail(){
    let rail=document.getElementById('mimir-readiness-rail');
    if(rail||!instantStart)return rail;
    rail=document.createElement('nav');
    rail.id='mimir-readiness-rail';
    rail.className='mimir-readiness-rail';
    rail.setAttribute('aria-label','MMIR readiness');
    instantStart.insertAdjacentElement('afterend',rail);
    return rail;
  }

  function readinessPill(label,value,state,target){
    const link=document.createElement('a');
    link.className='readiness-pill readiness-'+state;
    link.href=target||'#mimir-prompt';
    const strong=document.createElement('strong');
    const small=document.createElement('small');
    strong.textContent=label;
    small.textContent=value;
    link.append(strong,small);
    link.addEventListener('click',()=>{
      const el=document.querySelector(link.hash);
      if(el&&el.tagName==='DETAILS')el.open=true;
    });
    return link;
  }

  function renderReadinessRail(){
    const rail=ensureReadinessRail();
    if(!rail)return;
    const model=selectedModel();
    const profile=activeProfile();
    const modes=readModes();
    const live=Boolean(model.value&&!model.value.startsWith('starter:')&&/live/i.test(model.text));
    const browser=Boolean(model.value.startsWith('starter:')&&model.runtime==='browser-guide');
    const webgpu=Boolean(model.runtime==='webllm');
    const health=String(profile?.health||'unknown').toLowerCase();
    const nodeReady=['ready','degraded','testing'].includes(health);
    const modelLabel=(model.text||'MMIR Guide').replace(/\s+-\s+live$/i,'');
    const pills=[
      {label:'Free start',value:browser?'Guide ready':webgpu?'Browser model':'Guide available',state:'ready',target:'#mimir-prompt'},
      {label:'Privacy',value:modes.private?'Private on':'Turn on',state:'ready',target:'#composer-mode-dock'},
      {label:'Node',value:nodeReady?(profile.name||'Local node'):'Auto-checking',state:nodeReady?'ready':'watch',target:'#node-dashboard'},
      {label:'Model',value:live?modelLabel:modelLabel||'Installable free',state:live?'ready':'watch',target:'#model-library'}
    ];
    const signature=JSON.stringify(pills);
    if(signature===lastRailSignature)return;
    lastRailSignature=signature;
    rail.innerHTML='';
    rail.append(...pills.map(pill=>readinessPill(pill.label,pill.value,pill.state,pill.target)));
  }

  function sendPrompt(value){
    if(!promptEl)return;
    promptEl.value=String(value||'').trim();
    promptEl.dispatchEvent(new Event('input',{bubbles:true}));
    promptEl.focus();
    window.setTimeout(()=>primaryLink?.click(),40);
  }

  function bindActivationActions(){
    if(activationButtons.connect&&activationButtons.connect.dataset.firstImpressionBound!=='true'){
      activationButtons.connect.dataset.firstImpressionBound='true';
      activationButtons.connect.addEventListener('click',()=>{
        window.MimirBackendProfiles?.ensureFreeLocalProfile?.();
        openPanel('#connect-options');
      });
    }
    if(activationButtons.models&&activationButtons.models.dataset.firstImpressionBound!=='true'){
      activationButtons.models.dataset.firstImpressionBound='true';
      activationButtons.models.addEventListener('click',()=>openPanel('#model-library'));
    }
    if(activationButtons.node&&activationButtons.node.dataset.firstImpressionBound!=='true'){
      activationButtons.node.dataset.firstImpressionBound='true';
      activationButtons.node.addEventListener('click',()=>openPanel('#node-dashboard'));
    }
  }

  function bindPromptActions(){
    document.querySelectorAll('[data-prompt-action]').forEach(button=>{
      if(button.dataset.firstImpressionBound==='true')return;
      button.dataset.firstImpressionBound='true';
      button.addEventListener('click',()=>{
        const prompt=button.getAttribute('data-prompt')||button.textContent||'Help me get started with MMIR.';
        sendPrompt(prompt);
      });
    });
  }

  function run(){
    bindPromptActions();
    bindActivationActions();
    syncReadyState();
    renderReadinessRail();
    renderRepairResumeBanner();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
  new MutationObserver(run).observe(document.documentElement,{
    childList:true,
    subtree:true,
    characterData:true,
    attributes:true,
    attributeFilter:['disabled','data-state','aria-disabled','class']
  });
  window.addEventListener('mmir-backend-profiles-updated',run);
  window.addEventListener('mmir-local-connector-refreshed',(event)=>{
    localConnectorState=event.detail||null;
    run();
  });
  window.addEventListener('mmir-repair-resume-started',run);
  window.addEventListener('mmir-repair-resume-checked',run);
  window.addEventListener('mmir-chat-modes-updated',run);
  window.addEventListener('storage',run);
  window.addEventListener('focus',run);
})();
