(function(){
  const PROFILE_KEY='mimir-chat-backend-profiles';
  const ACTIVE_KEY='mimir-chat-active-backend';
  const WORKSPACE_KEY='mimir-active-workspace-v1';
  const DEFAULT_WORKSPACE_ID='personal';
  const CHAT_KEY='mimir-chat-current-session-v1';
  const MODE_KEY='mimir-chat-mode-controls-v1';
  const chatCenter=document.querySelector('.mimir-chat-center');
  const promptEl=document.getElementById('mimir-prompt');
  const primaryLink=document.getElementById('primary-chat-link');
  let defaultsPrepared=false;

  function readProfiles(){try{const value=JSON.parse(localStorage.getItem(PROFILE_KEY)||'[]');return Array.isArray(value)?value:[];}catch(error){return [];}}
  function activeProfile(){const id=localStorage.getItem(ACTIVE_KEY)||'';return readProfiles().find(profile=>profile.id===id)||null;}
  function statusOf(profile){return String(profile?.health||'unknown').toLowerCase();}
  function activeWorkspaceId(){return localStorage.getItem(WORKSPACE_KEY)||DEFAULT_WORKSPACE_ID;}
  function chatStorageKey(){return CHAT_KEY+':'+activeWorkspaceId();}
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
  function selectedModel(){
    const select=document.getElementById('runtime-model');
    const option=select?.selectedOptions?.[0];
    return {
      value:select?.value||'',
      text:String(option?.textContent||'').trim(),
      runtime:option?.dataset?.runtime||''
    };
  }

  function ensureFirstRunDefaults(){
    if(defaultsPrepared)return;
    defaultsPrepared=true;
    window.MimirBackendProfiles?.ensureAutomaticDefaults?.();
    const modes=readModes();
    if(modes.private===false){
      localStorage.setItem(MODE_KEY,JSON.stringify({...modes,private:true}));
      window.dispatchEvent(new CustomEvent('mmir-chat-modes-updated',{detail:{...modes,private:true}}));
    }
  }

  function chooseGuideModel(){
    const select=document.getElementById('runtime-model');
    if(!select)return false;
    const guide=Array.from(select.options||[]).find(option=>option.value==='starter:mmir-guide')||
      Array.from(select.options||[]).find(option=>option.dataset.runtime==='browser-guide');
    if(!guide)return false;
    select.value=guide.value;
    select.dispatchEvent(new Event('change',{bubbles:true}));
    return true;
  }

  function sendPrompt(value){
    if(!promptEl)return;
    ensureFirstRunDefaults();
    chooseGuideModel();
    promptEl.value=String(value||'Help me get started with MMIR.').trim();
    promptEl.dispatchEvent(new Event('input',{bubbles:true}));
    promptEl.focus();
    window.setTimeout(()=>{
      chooseGuideModel();
      primaryLink?.click();
    },120);
  }
  function hasFirstPrompt(){
    try{
      const raw=localStorage.getItem(chatStorageKey())||(
        activeWorkspaceId()===DEFAULT_WORKSPACE_ID?localStorage.getItem(CHAT_KEY):null
      );
      const value=JSON.parse(raw||'[]');
      if(!Array.isArray(value))return false;
      const hasUser=value.some(message=>message?.role==='user'&&String(message.content||'').trim());
      const hasAnswer=value.some(message=>message?.role==='assistant'&&String(message.content||'').trim()&&message.content!=='Thinking...');
      return hasUser&&hasAnswer;
    }catch(error){
      return false;
    }
  }

  function step(label,done,current,detail,target){
    const item=document.createElement('a');
    item.className='onboarding-step '+(done?'is-done':'is-open')+(current?' is-current':'');
    item.href=target||'#backend-settings';
    item.setAttribute('aria-label',label+': '+(done?'done':current?'next':'pending')+'. '+detail);
    if(current)item.setAttribute('aria-current','step');
    item.innerHTML='<span>'+(done?'Done':current?'Next':'Soon')+'</span><strong></strong><small></small>';
    item.querySelector('strong').textContent=label;
    item.querySelector('small').textContent=detail;
    item.addEventListener('click',()=>openTarget(item.hash));
    return item;
  }

  function openTarget(target){
    const el=document.querySelector(target);
    if(!el)return;
    if(el.tagName==='DETAILS')el.setAttribute('open','');
    el.scrollIntoView({block:'start',behavior:'smooth'});
    if(el.matches('textarea,input,select,button,a'))setTimeout(()=>el.focus(),120);
  }

  function render(){
    if(!chatCenter)return;
    ensureFirstRunDefaults();
    let panel=document.getElementById('first-run-onboarding');
    if(!panel){
      panel=document.createElement('section');
      panel.id='first-run-onboarding';
      panel.className='mimir-onboarding';
      panel.setAttribute('aria-label','First run checklist');
      panel.setAttribute('aria-live','polite');
      const quick=document.querySelector('.quick-suggestions');
      if(quick&&quick.nextSibling)chatCenter.insertBefore(panel,quick.nextSibling);else chatCenter.appendChild(panel);
    }

    const profiles=readProfiles();
    const active=activeProfile();
    const health=statusOf(active);
    const hasProfile=profiles.length>0;
    const hasActive=Boolean(active);
    const ready=health==='ready';
    const localNodeSeen=Boolean(hasActive&&['ready','degraded','testing'].includes(health));
    const localNodeProblem=health==='degraded'||health==='offline'||health==='testing';
    const sent=hasFirstPrompt();
    const modes=readModes();
    const privateOn=modes.private!==false;
    const model=selectedModel();
    const modelLive=Boolean(model.value&&!model.value.startsWith('starter:')&&/live/i.test(model.text));
    const modelLabel=model.text.replace(/\s+-\s+live$/i,'');

    const steps=[
      {label:'Browser ready',done:true,detail:'Free guide and installable model choices load automatically.',target:'#mimir-prompt'},
      {label:'Private mode',done:privateOn,detail:privateOn?'Private-by-default routing instructions are on.':'Turn Private back on in the chat dock.',target:'#composer-mode-dock'},
      {label:'Local node',done:localNodeSeen,detail:localNodeSeen?(active.name||'Local node profile is active.'):(hasProfile?'Local profile exists; start or refresh the node.':'MMIR prepares the free local profile for you.'),target:'#local-connector'},
      {label:'Model live',done:modelLive||ready,detail:(modelLive?modelLabel+' is live.':(ready?(active.models||'Model discovered.'):(localNodeProblem?'Node needs attention before model is live.':'Browser guide works now; local model activates after install.'))),target:'#local-connector'},
      {label:'First chat',done:sent,detail:sent?'First answer is saved in this workspace.':'Type or use a starter prompt to get the first useful answer.',target:'#mimir-prompt'}
    ];
    const firstOpen=steps.findIndex(item=>!item.done);

    const heading=document.createElement('div');
    heading.className='onboarding-heading';
    heading.innerHTML='<div><p class="eyebrow">Automatic launch checklist</p><h2>First-run success gates</h2></div><small>MMIR prepares safe defaults first. The user can configure details later.</small>';

    const grid=document.createElement('div');
    grid.className='onboarding-grid';
    steps.forEach((item,index)=>grid.append(step(item.label,item.done,index===firstOpen,item.detail,item.target)));

    const actions=document.createElement('div');
    actions.className='onboarding-actions';
    const startButton=document.createElement('button');
    startButton.type='button';
    startButton.id='start-free-chat';
    startButton.textContent='Start free chat';
    startButton.addEventListener('click',()=>sendPrompt('Help me get started with MMIR. What is the fastest free and private path to connect a real local model?'));
    const freeButton=document.createElement('button');
    freeButton.type='button';
    freeButton.id='activate-free-local';
    freeButton.textContent='Use free local';
    freeButton.addEventListener('click',()=>{
      const profile=window.MimirBackendProfiles?.ensureFreeLocalProfile?.();
      if(profile){
        render();
        document.getElementById('local-connector')?.setAttribute('open','');
      }
    });
    const privateButton=document.createElement('button');
    privateButton.type='button';
    privateButton.id='activate-private-mode';
    privateButton.textContent='Private mode';
    privateButton.addEventListener('click',()=>{
      const next={...readModes(),private:true};
      localStorage.setItem(MODE_KEY,JSON.stringify(next));
      window.dispatchEvent(new CustomEvent('mmir-chat-modes-updated',{detail:next}));
      render();
    });
    const installLink=document.createElement('a');
    installLink.href='#local-connector';
    installLink.textContent='Local install';
    installLink.addEventListener('click',()=>openTarget('#local-connector'));
    actions.append(startButton,freeButton,privateButton,installLink);

    panel.innerHTML='';
    panel.append(heading,actions,grid);
  }

  window.addEventListener('mmir-backend-profiles-updated',render);
  window.addEventListener('mmir-workspace-changed',render);
  window.addEventListener('mmir-chat-history-updated',render);
  window.addEventListener('mmir-chat-modes-updated',render);
  window.addEventListener('mmir-local-connector-refreshed',render);
  window.addEventListener('storage',render);
  window.addEventListener('focus',render);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',render);else render();
})();
