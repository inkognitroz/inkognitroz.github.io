(function(){
  const PROFILE_KEY='mimir-chat-backend-profiles';
  const ACTIVE_KEY='mimir-chat-active-backend';
  const WORKSPACE_KEY='mimir-active-workspace-v1';
  const DEFAULT_WORKSPACE_ID='personal';
  const CHAT_KEY='mimir-chat-current-session-v1';
  const MODE_KEY='mimir-chat-mode-controls-v1';
  const INTENT_KEY='mimir-user-intent-v1';
  const FIRST_CHAT_RECEIPT_PREFIX='mimir-first-chat-receipt-v1:';
  const chatCenter=document.querySelector('.mimir-chat-center');
  const promptEl=document.getElementById('mimir-prompt');
  const primaryLink=document.getElementById('primary-chat-link');
  let defaultsPrepared=false;

  function readProfiles(){try{const value=JSON.parse(localStorage.getItem(PROFILE_KEY)||'[]');return Array.isArray(value)?value:[];}catch(error){return [];}}
  function activeProfile(){const id=localStorage.getItem(ACTIVE_KEY)||'';return readProfiles().find(profile=>profile.id===id)||null;}
  function statusOf(profile){return String(profile?.health||'unknown').toLowerCase();}
  function activeWorkspaceId(){return localStorage.getItem(WORKSPACE_KEY)||DEFAULT_WORKSPACE_ID;}
  function chatStorageKey(){return CHAT_KEY+':'+activeWorkspaceId();}
  function firstChatReceiptStorageKey(){return FIRST_CHAT_RECEIPT_PREFIX+activeWorkspaceId();}
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
  function readFirstChatReceipt(){
    try{
      const value=JSON.parse(localStorage.getItem(firstChatReceiptStorageKey())||'null');
      return value&&typeof value==='object'?value:null;
    }catch(error){
      return null;
    }
  }

  function firstChatGate(sent){
    const receipt=readFirstChatReceipt();
    if(receipt?.status==='success'){
      return {
        done:true,
        detail:'Verified receipt saved for '+String(receipt.model||'model')+'; no raw prompt stored.',
        target:'#progress-dashboard'
      };
    }
    if(receipt?.status==='failed'){
      return {
        done:false,
        detail:'Verified chat failed; use recovery to retry proof or repair the local route.',
        target:'#runtime-live-proof'
      };
    }
    return {
      done:false,
      detail:sent?'First answer exists; verified receipt is missing. Run proof recovery.':'Send one verified chat; MMIR will save a private receipt.',
      target:'#runtime-live-proof'
    };
  }

  function intentOptions(){
    return [
      {
        id:'auto',
        label:'Auto',
        short:'Choose for me',
        detail:'MMIR uses the safest free route now and lets you configure later.',
        target:'#mimir-prompt',
        prompt:'Choose the best MMIR path for me automatically. Keep it free-first, private by default and useful in under five minutes.'
      },
      {
        id:'developer',
        label:'Developer',
        short:'Repo, code, tools',
        detail:'Start with local coding models, repo context and workflow automation.',
        target:'#workflow-builder',
        prompt:'Set up MMIR for a developer. Prioritize free local models, repo/document context, code review workflows and a safe path to connect GitHub later.'
      },
      {
        id:'business-owner',
        label:'Business owner',
        short:'Users, growth, ops',
        detail:'Turn business goals into useful workflows before advanced infrastructure.',
        target:'#workflow-builder',
        prompt:'Set up MMIR for a business owner. Create a simple free-first workflow that helps get users, improve sales and automate useful operations.'
      },
      {
        id:'power-user',
        label:'Power user',
        short:'Models, routing, teams',
        detail:'Expose comparison, roles, synthesis and model routing as the main path.',
        target:'#model-library',
        prompt:'Set up MMIR for an AI power user. Show how to compare models, route tasks, use role-based teams and combine answers safely.'
      },
      {
        id:'privacy-local',
        label:'Privacy / local',
        short:'Private node first',
        detail:'Keep Private mode on, connect Local Node and install a free local model.',
        target:'#local-connector',
        prompt:'Set up MMIR for a privacy-first local user. Keep everything local-first, connect the local node, choose a small free model and explain the trust boundary.'
      }
    ];
  }

  function selectedIntent(){
    const value=localStorage.getItem(INTENT_KEY)||'auto';
    return intentOptions().some(intent=>intent.id===value)?value:'auto';
  }

  function writeIntent(id){
    const value=intentOptions().some(intent=>intent.id===id)?id:'auto';
    localStorage.setItem(INTENT_KEY,value);
    window.dispatchEvent(new CustomEvent('mmir-user-intent-updated',{detail:{intent:value}}));
  }

  function applyIntentDefaults(intent){
    ensureFirstRunDefaults();
    if(intent.id==='privacy-local'){
      const next={...readModes(),private:true};
      localStorage.setItem(MODE_KEY,JSON.stringify(next));
      window.dispatchEvent(new CustomEvent('mmir-chat-modes-updated',{detail:next}));
      window.MimirBackendProfiles?.ensureFreeLocalProfile?.();
    }
    if(intent.id==='developer'||intent.id==='business-owner'){
      document.getElementById('workflow-builder')?.setAttribute('open','');
    }
    if(intent.id==='power-user'){
      document.getElementById('model-library')?.setAttribute('open','');
      document.getElementById('multi-model-workspace')?.setAttribute('open','');
    }
  }

  function runIntent(intent){
    writeIntent(intent.id);
    applyIntentDefaults(intent);
    openTarget(intent.target);
    sendPrompt(intent.prompt);
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
  function recoverFirstChat(){
    ensureFirstRunDefaults();
    window.MimirBackendProfiles?.ensureFreeLocalProfile?.();
    openTarget('#mimir-chat-runtime');
    const receipt=readFirstChatReceipt();
    const action=document.querySelector(receipt?.status==='failed'?'[data-proof-action="retry"]':'[data-proof-action="chat-now"]')||
      document.querySelector('[data-proof-action="retry"]')||
      document.getElementById('runtime-refresh');
    if(action){
      action.click();
      return;
    }
    openTarget('#local-connector');
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

    const firstChat=firstChatGate(sent);
    const steps=[
      {label:'Browser ready',done:true,detail:'Free guide and installable model choices load automatically.',target:'#mimir-prompt'},
      {label:'Private mode',done:privateOn,detail:privateOn?'Private-by-default routing instructions are on.':'Turn Private back on in the chat dock.',target:'#composer-mode-dock'},
      {label:'Local node',done:localNodeSeen,detail:localNodeSeen?(active.name||'Local node profile is active.'):(hasProfile?'Local profile exists; start or refresh the node.':'MMIR prepares the free local profile for you.'),target:'#local-connector'},
      {label:'Model live',done:modelLive||ready,detail:(modelLive?modelLabel+' is live.':(ready?(active.models||'Model discovered.'):(localNodeProblem?'Node needs attention before model is live.':'Browser guide works now; local model activates after install.'))),target:'#local-connector'},
      {label:'First chat',done:firstChat.done,detail:firstChat.detail,target:firstChat.target}
    ];
    const firstOpen=steps.findIndex(item=>!item.done);

    const heading=document.createElement('div');
    heading.className='onboarding-heading';
    heading.innerHTML='<div><p class="eyebrow">Automatic launch checklist</p><h2>First-run success gates</h2></div><small>MMIR prepares safe defaults first. The user can configure details later.</small>';

    const intentPanel=document.createElement('div');
    intentPanel.className='onboarding-intents';
    intentPanel.setAttribute('aria-label','Personalized onboarding paths');
    const intentHead=document.createElement('div');
    intentHead.className='onboarding-intent-head';
    intentHead.innerHTML='<strong>Personalize the start</strong><span>Optional. If the user does nothing, Auto keeps the default free private path.</span>';
    const intentGrid=document.createElement('div');
    intentGrid.className='onboarding-intent-grid';
    const activeIntent=selectedIntent();
    intentOptions().forEach(intent=>{
      const button=document.createElement('button');
      button.type='button';
      button.className='onboarding-intent';
      button.dataset.intent=intent.id;
      button.setAttribute('aria-pressed',String(intent.id===activeIntent));
      button.innerHTML='<span></span><strong></strong><small></small>';
      button.querySelector('span').textContent=intent.short;
      button.querySelector('strong').textContent=intent.label;
      button.querySelector('small').textContent=intent.detail;
      button.addEventListener('click',()=>runIntent(intent));
      intentGrid.appendChild(button);
    });
    intentPanel.append(intentHead,intentGrid);

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
    const recoverButton=document.createElement('button');
    recoverButton.type='button';
    recoverButton.id='recover-first-chat';
    recoverButton.textContent='Repair first chat';
    recoverButton.addEventListener('click',recoverFirstChat);
    actions.append(startButton,freeButton,recoverButton,privateButton,installLink);

    panel.innerHTML='';
    panel.append(heading,intentPanel,actions,grid);
  }

  window.addEventListener('mmir-backend-profiles-updated',render);
  window.addEventListener('mmir-workspace-changed',render);
  window.addEventListener('mmir-chat-history-updated',render);
  window.addEventListener('mmir-first-chat-receipt-updated',render);
  window.addEventListener('mmir-chat-modes-updated',render);
  window.addEventListener('mmir-local-connector-refreshed',render);
  window.addEventListener('mmir-user-intent-updated',render);
  window.addEventListener('storage',render);
  window.addEventListener('focus',render);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',render);else render();
})();
