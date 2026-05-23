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
      setText(statusEl,kind.webgpu?'Free browser model is ready.':'Open. Connect local AI. Ready.');
      setText(detailEl,kind.webgpu?'Runs in this browser when WebGPU is available. No paid provider or account required.':'Ask now, or click Connect local AI to install one file, see your own models and chat through MMIR.');
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

    setText(statusEl,state&&state!=='Select a backend to start.'?state:'Open. Connect local AI. Ready.');
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
    rail.innerHTML='';
    rail.append(
      readinessPill('Free start',browser?'Guide ready':webgpu?'Browser model':'Guide available','ready','#mimir-prompt'),
      readinessPill('Privacy',modes.private?'Private on':'Turn on','ready','#composer-mode-dock'),
      readinessPill('Node',nodeReady?(profile.name||'Local node'):'Auto-checking',nodeReady?'ready':'watch','#node-dashboard'),
      readinessPill('Model',live?modelLabel:modelLabel||'Installable free',live?'ready':'watch','#model-library')
    );
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
  window.addEventListener('mmir-chat-modes-updated',run);
  window.addEventListener('storage',run);
  window.addEventListener('focus',run);
})();
