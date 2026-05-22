(function(){
  const promptEl=document.getElementById('mimir-prompt');
  const primaryLink=document.getElementById('primary-chat-link');
  const statusEl=document.getElementById('first-impression-status');
  const detailEl=document.getElementById('first-impression-detail');
  const backendNode=document.getElementById('instant-node-backend');
  const modelNode=document.getElementById('instant-node-model');
  const instantStart=document.querySelector('.mimir-instant-start');
  const PROFILE_KEY='mimir-chat-backend-profiles';
  const ACTIVE_KEY='mimir-chat-active-backend';
  const MODE_KEY='mimir-chat-mode-controls-v1';

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
      return {private:saved.private!==false};
    }catch(error){
      return {private:true};
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

  function syncReadyState(){
    const model=selectedModel();
    const state=runtimeState();
    const live=Boolean(model.value&&!model.value.startsWith('starter:')&&/live/i.test(model.text));
    const browser=Boolean(model.value.startsWith('starter:')&&model.runtime==='browser-guide');
    const webgpu=Boolean(model.runtime==='webllm');
    const installable=Boolean(model.value.startsWith('starter:')&&!browser&&!webgpu);

    if(live){
      setText(statusEl,'Your local AI is ready in MMIR.');
      setText(detailEl,model.text.replace(/\s+-\s+live$/i,'')+' is connected through the trusted MMIR control plane. Type anything, or use a smart start below.');
      setNode(backendNode,'Local node',true);
      setNode(modelNode,model.text.replace(/\s+-\s+live$/i,''),true);
      setBodyState('mimir-first-ready','mimir-first-guide','mimir-first-install');
      return;
    }

    if(browser||webgpu){
      setText(statusEl,webgpu?'Free browser model is ready.':'Open. Connect local AI. Ready.');
      setText(detailEl,webgpu?'Runs in this browser when WebGPU is available. No paid provider or account required.':'Ask now, or click Connect local AI to install one file, see your own models and chat through MMIR.');
      setNode(backendNode,'Browser',true);
      setNode(modelNode,model.text||'MMIR guide',true);
      setBodyState('mimir-first-guide','mimir-first-ready','mimir-first-install');
      return;
    }

    if(installable){
      setText(statusEl,'Install local AI to finish activation.');
      setText(detailEl,'MMIR can guide the one-file local install and move to live chat when the local node reports the model.');
      setNode(backendNode,'Installer',true);
      setNode(modelNode,model.text||'Free model',true);
      setBodyState('mimir-first-install','mimir-first-ready','mimir-first-guide');
      return;
    }

    setText(statusEl,state&&state!=='Select a backend to start.'?state:'Open. Connect local AI. Ready.');
    setText(detailEl,'Local node, browser helpers and installable free models are checked automatically through the MMIR control plane.');
    setNode(backendNode,'Checking',false);
    setNode(modelNode,'Model',false);
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
  window.addEventListener('mmir-local-connector-refreshed',run);
  window.addEventListener('storage',run);
  window.addEventListener('focus',run);
})();
