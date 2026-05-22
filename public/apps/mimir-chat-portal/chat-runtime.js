(function(){
  const api=window.MimirApiClient;
  const PROFILE_KEY='mimir-chat-backend-profiles';
  const ROLE_KEY='mimir-chat-active-role';
  const WORKSPACE_KEY='mimir-active-workspace-v1';
  const DEFAULT_WORKSPACE_ID='personal';
  const MEMORY_PREFIX='mimir-memory-v1:';
  const KNOWLEDGE_PREFIX='mimir-knowledge-v1:';
  const CHAT_KEY='mimir-chat-current-session-v1';
  const MODE_KEY='mimir-chat-mode-controls-v1';
  const STARTER_MODEL_CATALOG='./free-model-starters.json';
  const STARTER_PREFIX='starter:';
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
  let modelChipEl=null;
  let resourceChipEl=null;
  let refreshBtn=null;
  let stopBtn=null;
  let clearBtn=null;
  let deleteModelBtn=null;
  let currentModelInstall=null;
  let modelInstallPollTimer=null;
  let currentAbortController=null;
  let stopRequested=false;
  let lastActiveId='';
  let currentChatKey='';
  let pendingWorkspaceSwitch=false;
  let busy=false;
  let messages=[];
  let starterModels=[];
  let webllmModule=null;
  let webllmEngine=null;
  let webllmModelId='';

  function readProfiles(){return api.readProfiles();}
  function activeId(){return api.activeId();}
  function activeProfile(){return api.activeProfile();}
  function cleanUrl(value){return api.cleanUrl(value);}
  function joinUrl(base,path){return api.joinUrl(base,path);}
  function activeWorkspaceId(){return localStorage.getItem(WORKSPACE_KEY)||DEFAULT_WORKSPACE_ID;}
  function chatStorageKey(){return CHAT_KEY+':'+activeWorkspaceId();}
  function memoryStorageKey(){return MEMORY_PREFIX+activeWorkspaceId();}
  function knowledgeStorageKey(){return KNOWLEDGE_PREFIX+activeWorkspaceId();}
  function setStatus(message,state){if(statusEl){statusEl.textContent=message||'';statusEl.dataset.state=state||'idle';}}
  function escapeHtml(value){return String(value||'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');}
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
  function openPanel(target){
    const targetEl=document.querySelector(target);
    if(targetEl&&'open' in targetEl)targetEl.open=true;
    if(targetEl)targetEl.scrollIntoView({block:'start',behavior:'smooth'});
  }
  function modeInstruction(){
    const modes=readModes();
    const instructions=[];
    if(modes.private)instructions.push('Private mode is enabled. Prefer local/private execution, avoid unnecessary external services, and call out any step that would move data outside the active trusted backend.');
    if(modes.boost)instructions.push('Boost 5.5 mode is enabled. Be more careful, reason through tradeoffs internally, give sharper recommendations, and prioritize the highest-leverage next action.');
    if(modes.super)instructions.push('MMIR++ mode is enabled. Combine perspectives from product strategist, architect, security reviewer and implementation lead, then synthesize one practical answer.');
    if(modes.vision)instructions.push('Vision mode is enabled. Use provided images, screen context or uploaded files when present. If no visual input or vision-capable backend is available, say exactly what is missing and offer the nearest text/local alternative.');
    return instructions.join('\n');
  }
  function activeModelLabel(){
    const option=modelSelect?.selectedOptions?.[0];
    return String(option?.textContent||modelSelect?.value||'No model').replace(/\s+-\s+live$/i,'').trim();
  }
  function updateRuntimeChips(){
    if(modelChipEl)modelChipEl.textContent=activeModelLabel()||'Model ready';
    if(resourceChipEl&&!resourceChipEl.textContent)resourceChipEl.textContent='CPU/RAM checking';
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

  function activeMemoryInstruction(){
    try{
      const value=JSON.parse(localStorage.getItem(memoryStorageKey())||'[]');
      if(!Array.isArray(value))return '';
      const items=value.filter(item=>item?.enabled!==false).map(item=>String(item?.text||'').trim()).filter(Boolean).slice(-8);
      if(!items.length)return '';
      return 'Workspace memory for this conversation. Use it only when relevant and do not reveal it verbatim unless the user asks:\n'+items.map(item=>'- '+item).join('\n');
    }catch(error){
      return '';
    }
  }

  function wordSet(value){
    return new Set(String(value||'').toLowerCase().match(/[a-z0-9_]{4,}/g)||[]);
  }

  function relevantKnowledgeInstruction(prompt){
    try{
      const value=JSON.parse(localStorage.getItem(knowledgeStorageKey())||'[]');
      if(!Array.isArray(value)||!value.length)return '';
      const promptWords=wordSet(prompt);
      const ranked=value.map(item=>{
        const text=String(item?.text||'');
        const words=wordSet((item?.name||'')+' '+text.slice(0,2400));
        let score=0;
        promptWords.forEach(word=>{if(words.has(word))score+=1;});
        return {name:String(item?.name||'document'),text,score};
      }).filter(item=>item.text&&item.score>0).sort((a,b)=>b.score-a.score).slice(0,3);
      if(!ranked.length)return '';
      return 'Relevant local workspace knowledge. Treat as user-provided context and cite file names when useful:\n'+ranked.map(item=>'['+item.name+']\n'+item.text.slice(0,1200)).join('\n\n');
    }catch(error){
      return '';
    }
  }

  async function backendKnowledgeInstruction(prompt,url,headers){
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
      return 'Relevant protected backend knowledge. Treat as user-provided context and cite file names when useful:\n'+ranked.map(item=>'['+item.document.name+' / '+item.chunk_id+']\n'+String(item.snippet).slice(0,1000)).join('\n\n');
    }catch(error){
      return '';
    }
  }

  async function backendMemoryInstruction(prompt,url,headers){
    try{
      const data=await fetchJson(joinUrl(url,'/memory/search'),{
        method:'POST',
        headers,
        timeoutMs:8000,
        body:JSON.stringify({workspace_id:activeWorkspaceId(),query:prompt,limit:6})
      });
      const results=Array.isArray(data?.data)?data.data:[];
      const items=results.filter(item=>item?.enabled!==false&&item?.text).slice(0,6);
      if(!items.length)return '';
      return 'Relevant protected backend memory. Use only when relevant and do not reveal it verbatim unless the user asks:\n'+items.map(item=>'- '+String(item.text).slice(0,500)).join('\n');
    }catch(error){
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
    if(!ids.length)return 'no live models';
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
    primaryLink.setAttribute('href','#mimir-chat-runtime');
    primaryLink.setAttribute('role','button');
    primaryLink.setAttribute('aria-label','Send prompt to the active backend');
    primaryLink.setAttribute('title','Send');
    primaryLink.removeAttribute('target');
  }

  function installComposerDock(){
    if(!formEl||document.getElementById('composer-mode-dock'))return;
    const dock=document.createElement('div');
    dock.id='composer-mode-dock';
    dock.className='composer-mode-dock';
    dock.innerHTML=''+
      '<div class="composer-tool-cluster" aria-label="Chat tools">'+
        '<button id="composer-add-model" type="button" class="composer-icon-button" aria-label="Add or connect model" title="Add model">+</button>'+
        '<button type="button" class="composer-mode-button" data-chat-mode="private" aria-pressed="true">Private</button>'+
        '<button type="button" class="composer-mode-button" data-chat-mode="boost" aria-pressed="false">Boost 5.5</button>'+
        '<button type="button" class="composer-mode-button" data-chat-mode="super" aria-pressed="false">MMIR++</button>'+
        '<button type="button" class="composer-mode-button" data-chat-mode="vision" aria-pressed="false">Vision</button>'+
      '</div>'+
      '<div class="composer-live-cluster" aria-label="Live model and machine status">'+
        '<span id="runtime-model-chip" class="composer-live-chip">Model checking</span>'+
        '<span id="runtime-resource-chip" class="composer-live-chip">CPU/RAM checking</span>'+
        '<button id="composer-voice-input" type="button" class="composer-icon-button" aria-label="Voice input" title="Voice input">Mic</button>'+
      '</div>';
    const bar=formEl.querySelector('.composer-bar');
    if(bar)formEl.insertBefore(dock,bar); else formEl.appendChild(dock);
    modelChipEl=document.getElementById('runtime-model-chip');
    resourceChipEl=document.getElementById('runtime-resource-chip');
    document.getElementById('composer-add-model')?.addEventListener('click',()=>{
      window.MimirBackendProfiles?.ensureFreeLocalProfile?.();
      openPanel('#connect-options');
    });
    document.querySelectorAll('[data-chat-mode]').forEach(button=>{
      button.addEventListener('click',()=>{
        const mode=button.getAttribute('data-chat-mode');
        const modes=readModes();
        modes[mode]=!modes[mode];
        writeModes(modes);
        setStatus(mode+' mode '+(modes[mode]?'enabled.':'disabled.'),'idle');
      });
    });
    document.getElementById('composer-voice-input')?.addEventListener('click',startVoiceInput);
    updateModeButtons();
    updateRuntimeChips();
  }

  function startVoiceInput(){
    const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SpeechRecognition){
      setStatus('Voice input is not available in this browser.','error');
      return;
    }
    const recognition=new SpeechRecognition();
    recognition.lang=document.documentElement.lang||navigator.language||'en-US';
    recognition.interimResults=false;
    recognition.maxAlternatives=1;
    recognition.onstart=()=>setStatus('Listening...','loading');
    recognition.onerror=()=>setStatus('Voice input failed or was cancelled.','error');
    recognition.onresult=(event)=>{
      const text=String(event.results?.[0]?.[0]?.transcript||'').trim();
      if(text&&promptEl){
        promptEl.value=(promptEl.value?promptEl.value+' ':'')+text;
        promptEl.focus();
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
        '<span id="runtime-state" data-state="idle" role="status" aria-live="polite">Select a backend to start.</span>'+
        '<label for="runtime-model">Model<select id="runtime-model" disabled><option value="">No live models</option></select></label>'+
        '<button id="runtime-refresh" type="button" aria-label="Refresh backend models">Refresh</button>'+
        '<button id="runtime-stop" type="button" aria-label="Stop current response" disabled>Stop</button>'+
        '<button id="runtime-delete-model" type="button" aria-label="Remove selected local model" disabled>Remove model</button>'+
        '<button id="runtime-clear" type="button" aria-label="Clear local chat history">Clear</button>'+
      '</div>'+
      '<div id="runtime-model-helper" class="runtime-model-helper" hidden></div>'+
      '<div id="runtime-transcript" class="runtime-transcript" aria-live="polite" aria-relevant="additions text" aria-busy="false"></div>';
    if(formEl&&formEl.nextSibling){chatCenter.insertBefore(runtime,formEl.nextSibling);}else{chatCenter.appendChild(runtime);}
    modelSelect=document.getElementById('runtime-model');
    statusEl=document.getElementById('runtime-state');
    modelHelperEl=document.getElementById('runtime-model-helper');
    transcriptEl=document.getElementById('runtime-transcript');
    refreshBtn=document.getElementById('runtime-refresh');
    stopBtn=document.getElementById('runtime-stop');
    deleteModelBtn=document.getElementById('runtime-delete-model');
    clearBtn=document.getElementById('runtime-clear');
    if(modelSelect)modelSelect.setAttribute('aria-label','Active chat model');
    if(modelSelect)modelSelect.addEventListener('change',()=>{renderModelHelper();updateRuntimeChips();updateRuntimeModelActions();});
    refreshBtn.addEventListener('click',()=>refreshState(true));
    stopBtn.addEventListener('click',stopCurrentResponse);
    deleteModelBtn.addEventListener('click',deleteSelectedLiveModel);
    clearBtn.addEventListener('click',clearConversation);
  }

  function renderMessageActions(bubble,message){
    bubble.querySelector('.runtime-message-actions')?.remove();
    if(message.role!=='assistant'||!message.content||message.content==='Thinking...')return;
    const actions=document.createElement('div');
    actions.className='runtime-message-actions';
    const copy=document.createElement('button');
    copy.type='button';
    copy.textContent='Copy';
    copy.setAttribute('aria-label','Copy assistant answer');
    copy.addEventListener('click',async()=>{
      try{await navigator.clipboard.writeText(message.content);setStatus('Answer copied.','ready');}
      catch(error){setStatus('Copy failed in this browser.','error');}
    });
    actions.appendChild(copy);
    if(message.retryPrompt){
      const retry=document.createElement('button');
      retry.type='button';
      retry.textContent='Retry';
      retry.setAttribute('aria-label','Retry this prompt');
      retry.addEventListener('click',()=>retryMessage(message));
      actions.appendChild(retry);
    }
    bubble.appendChild(actions);
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

  function renderMessage(message){
    if(!transcriptEl)return null;
    const bubble=document.createElement('article');
    bubble.className='runtime-message runtime-message-'+message.role;
    bubble.dataset.messageId=message.id;
    bubble.setAttribute('aria-label',(message.role==='user'?'User':'Assistant')+' message');
    const label=document.createElement('span');
    label.className='runtime-message-label';
    label.textContent=message.role==='user'?'You':'MMIR';
    const body=document.createElement('div');
    body.className='runtime-message-body';
    renderMessageContent(body,message.content,message.role);
    bubble.append(label,body);
    if(message.meta){const small=document.createElement('small');small.textContent=message.meta;bubble.appendChild(small);}
    renderMessageActions(bubble,message);
    transcriptEl.appendChild(bubble);
    bubble.scrollIntoView({block:'nearest'});
    return body;
  }

  function renderStoredMessages(){
    if(!transcriptEl)return;
    transcriptEl.innerHTML='';
    for(const message of messages){renderMessage(message);}
  }

  function appendMessage(role,content,meta,extra){
    const message=createMessage(role,content,meta,extra);
    messages.push(message);
    messages=messages.slice(-MAX_STORED_MESSAGES);
    saveMessages();
    const body=renderMessage(message);
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
  }

  function clearConversation(){
    if(busy){setStatus('Wait for the current response before clearing.','loading');return;}
    messages=[];
    saveMessages();
    if(transcriptEl)transcriptEl.innerHTML='';
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
    sendMessage();
  }

  function defaultMmirInstruction(){
    return [
      'You are the MMIR platform assistant inside MMIR.ai.',
      'MMIR is the orchestration layer for trusted AI: a trusted AI operating layer focused on local-first chat, model connections, local nodes, secure tunnels, workspaces, memory, workflows and a marketplace over time.',
      'Default goal: make the service useful immediately with free/local options first, then let users configure details later.',
      'When asked about MMIR, answer as MMIR product support. Do not redefine MMIR as an unrelated academic term unless the user explicitly asks for that.',
      'Security rules: no secrets in the public frontend; provider keys belong behind a protected backend; prefer 127.0.0.1 local node with pairing; never expose raw model runtimes publicly.',
      'Match the user language, stay calm and concrete, and name any free local step needed for Ollama, MMIR Local Node or cloudflared.'
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
    const memory=activeMemoryInstruction();
    const knowledge=relevantKnowledgeInstruction(prompt);
    const next=historyMessages.concat([{role:'user',content:prompt}]);
    const system=[{role:'system',content:defaultMmirInstruction()}];
    const modes=modeInstruction();
    if(modes)system.push({role:'system',content:modes});
    if(role)system.push({role:'system',content:role.instruction});
    if(memory)system.push({role:'system',content:memory});
    if(backendMemory)system.push({role:'system',content:backendMemory});
    if(knowledge)system.push({role:'system',content:knowledge});
    if(backendKnowledge)system.push({role:'system',content:backendKnowledge});
    return system.concat(next);
  }

  function normalizeModels(payload){
    const models=Array.isArray(payload?.data)?payload.data:Array.isArray(payload?.models)?payload.models:[];
    return models.map(model=>({
      id:String(model.id||model.name||model.model||'').trim(),
      label:String(model.name||model.label||model.id||model.model||'').trim(),
      status:String(model.status||'available')
    })).filter(model=>model.id&&model.status!=='planned'&&model.status!=='premium_planned');
  }

  function fallbackStarterModels(){
    return [
      {id:'mmir-guide',label:'MMIR Guide - free browser helper',runtime:'browser-guide',status:'live-browser',cost:'free',best_for:'Immediate onboarding and setup help.',install_note:'No install required.'},
      {id:'mmir-model-picker',label:'MMIR Model Picker - live helper',runtime:'browser-guide',status:'live-browser',cost:'free',best_for:'Choosing the right free model and install route.',install_note:'No install required.'},
      {id:'mmir-setup-coach',label:'MMIR Setup Coach - live helper',runtime:'browser-guide',status:'live-browser',cost:'free',best_for:'Getting from first visit to local model running.',install_note:'No install required.'},
      {id:'mmir-security-coach',label:'MMIR Security Coach - live helper',runtime:'browser-guide',status:'live-browser',cost:'free',best_for:'Explaining local-first and zero-trust choices.',install_note:'No install required.'},
      {id:'mmir-growth-coach',label:'MMIR Growth Coach - live helper',runtime:'browser-guide',status:'live-browser',cost:'free',best_for:'Freemium, marketplace and premium feature guidance.',install_note:'No install required.'},
      {id:'webllm-qwen25-05b',label:'Qwen2.5 0.5B - active in browser',runtime:'webllm',status:'active-browser-webgpu',cost:'free browser',model:'Qwen2.5-0.5B-Instruct-q4f16_1-MLC',best_for:'Fastest real browser LLM test without backend or API key.',install_note:'Runs locally in the browser with WebGPU.'},
      {id:'ollama-gemma3-270m',label:'Gemma 3 270M - tiny free local',runtime:'ollama',status:'installable-free',cost:'free local',model:'gemma3:270m',size:'292 MB',best_for:'Smallest useful local starter.',install_note:'Install through Ollama and MMIR Local Node.'},
      {id:'ollama-llama32-1b',label:'Llama 3.2 1B - local assistant',runtime:'ollama',status:'installable-free',cost:'free local',model:'llama3.2:1b',size:'1.3 GB',best_for:'Better local assistant on normal laptops.',install_note:'Install through Ollama and MMIR Local Node.'}
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
    setStatus('Free browser/installable models are ready. Local node check runs in the background.','ready');
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

  function starterAvailabilityLabel(model){
    if(model?.runtime==='browser-guide')return 'ready now - browser helper';
    if(model?.runtime==='webllm')return 'ready now - browser WebGPU';
    if(model?.status==='installable-free')return 'install to activate - free local';
    return String(model?.status||'free').replaceAll('-',' ');
  }

  function preferredStarterModel(){
    return starterModels.find(model=>model.id==='mmir-guide')||
      starterModels.find(model=>model.runtime==='browser-guide')||
      starterModels[0]||
      null;
  }

  function commandLines(model){
    const ollamaModel=String(model?.model||'').trim();
    const envValue=ollamaModel||'gemma3:270m';
    return {
      windows:[
        'iwr -UseBasicParsing https://mmir.ai/downloads/mmir-local-node-windows.ps1 -OutFile mmir-local-node-windows.ps1',
        '$env:MMIR_MODEL="'+envValue+'"',
        '.\\mmir-local-node-windows.ps1 -DryRun',
        '.\\mmir-local-node-windows.ps1'
      ],
      unix:[
        'curl -fsSL https://mmir.ai/downloads/mmir-local-node-macos-linux.sh -o mmir-local-node-macos-linux.sh',
        'chmod +x mmir-local-node-macos-linux.sh',
        'MMIR_MODEL='+envValue+' ./mmir-local-node-macos-linux.sh'
      ],
      ollama:ollamaModel?['ollama pull '+ollamaModel]:[]
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
      (isGuide?'<p>This helper works immediately in the browser. Choose a WebGPU or Ollama model below when you want a real local LLM.</p>':
      isWebLlm?'<p>This is a real browser LLM. It runs on the user machine with WebGPU, no API key and no cloud cost. First message downloads model weights and can take time.</p><p>Works best in a modern Chromium-based browser with WebGPU enabled.</p>':
        '<div class="runtime-install-grid">'+
          '<div><strong>Windows</strong><pre><code>'+escapeHtml(commands.windows.join('\n'))+'</code></pre></div>'+
          '<div><strong>Mac / Linux</strong><pre><code>'+escapeHtml(commands.unix.join('\n'))+'</code></pre></div>'+
        '</div>'+
        '<div class="runtime-helper-actions">'+
          '<a class="button-link" href="./downloads/mmir-local-node-windows.ps1" download>Download Windows installer</a>'+
          '<a class="button-link" href="./downloads/mmir-local-node-macos-linux.sh" download>Download Mac/Linux installer</a>'+
          '<button id="install-selected-model" type="button">Install in Local Node</button>'+
          '<button id="refresh-model-pulls" type="button">Check install progress</button>'+
        '</div>')+
      '<p id="model-install-status" class="runtime-model-install-status" data-state="idle" aria-live="polite">'+escapeHtml(currentModelInstall?.message||'Local install can run through MMIR Local Node when it has the model install API.')+'</p>'+
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
      const message=error.status===404?'Local node needs an update/restart before one-click model install is available. Use the installer links below for now.':friendlyError(error);
      setModelInstallStatus(message,'error');
      setStatus(message,'error');
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
        setModelInstallStatus((job.model||currentModelInstall.model)+' installed. Refreshing live models...','ready');
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
      const browserGroup=document.createElement('optgroup');
      browserGroup.label='Ready now: free browser helpers';
      const webGpuGroup=document.createElement('optgroup');
      webGpuGroup.label='Ready now: free browser WebGPU LLMs';
      const installGroup=document.createElement('optgroup');
      installGroup.label='Install to activate: free local Ollama models';
      for(const model of starterModels){
        const option=document.createElement('option');
        option.value=starterValue(model);
        option.textContent=model.label+' - '+starterAvailabilityLabel(model);
        option.dataset.runtime=model.runtime||'starter';
        if(model.runtime==='browser-guide')browserGroup.appendChild(option);
        else if(model.runtime==='webllm')webGpuGroup.appendChild(option);
        else installGroup.appendChild(option);
      }
      if(browserGroup.children.length)modelSelect.appendChild(browserGroup);
      if(webGpuGroup.children.length)modelSelect.appendChild(webGpuGroup);
      if(installGroup.children.length)modelSelect.appendChild(installGroup);
    }

    const values=Array.from(modelSelect.options||[]).map(option=>option.value);
    const liveValues=(models||[]).map(model=>model.id).filter(Boolean);
    if(liveValues.length&&(String(previous||'').startsWith(STARTER_PREFIX)||!liveValues.includes(previous))){
      modelSelect.value=liveValues[0];
    }
    else if(previous&&values.includes(previous))modelSelect.value=previous;
    else if(liveValues.length)modelSelect.value=liveValues[0];
    else if(!models.length){
      const preferred=preferredStarterModel();
      if(preferred)modelSelect.value=starterValue(preferred);
    }
    modelSelect.disabled=!values.length;
    renderModelHelper();
    updateRuntimeChips();
    updateRuntimeModelActions();
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
    const response=await fetch(joinUrl(url,path),{
      method:'POST',
      headers:{...headers,Accept:'text/event-stream'},
      body:JSON.stringify({...payload,stream:true}),
      signal
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

  async function streamChat(url,headers,payload,signal,onText){
    let lastError=null;
    for(const path of ['/chat/completions','/chat']){
      try{return await streamPath(url,path,headers,payload,signal,onText);}
      catch(error){
        lastError=error;
        if(error.status!==404)throw error;
      }
    }
    throw lastError;
  }

  async function jsonChat(url,headers,payload,signal){
    let data;
    try{
      data=await fetchJson(joinUrl(url,'/chat/completions'),{method:'POST',headers,body:JSON.stringify({...payload,stream:false}),timeoutMs:60000,signal});
    }catch(error){
      if(error.status!==404)throw error;
      data=await fetchJson(joinUrl(url,'/chat'),{method:'POST',headers,body:JSON.stringify({...payload,stream:false}),timeoutMs:60000,signal});
    }
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

  function webGpuAvailable(){
    return Boolean(window.isSecureContext&&navigator.gpu);
  }

  async function ensureWebLlmEngine(starter,onProgress){
    const modelId=String(starter?.model||'').trim();
    if(!modelId)throw new Error('Browser model id is missing.');
    if(!webGpuAvailable())throw new Error('This browser does not expose WebGPU. Use a Chromium-based browser with WebGPU, or install the Ollama local node path.');
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
      const payloadMessages=contextMessages(prompt);
      const chunks=await engine.chat.completions.create({
        messages:payloadMessages,
        temperature:0.7,
        max_tokens:700,
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
      setStatus(stopRequested?'Browser generation stopped.':'Browser model response received.','ready');
    }catch(error){
      const fallback='Browser model could not start: '+(error?.message||'unknown error')+'\n\nYou can still use the free installable Ollama path from the model helper, or choose MMIR Guide for immediate setup help.';
      updateMessage(assistant.message.id,fallback,'browser model unavailable');
      setStatus('Browser model unavailable. Use local install path or guide.','error');
    }finally{
      currentAbortController=null;
      setBusy(false);
    }
  }

  function guideResponse(prompt,starter={}){
    const text=String(prompt||'').toLowerCase();
    const helperId=starter.id||'mmir-guide';
    const wantsModel=/model|modell|llm|ollama|bitnet|1 bit|1-bit|gratis|free/.test(text);
    const wantsConnect=/connect|koble|install|installer|local|lokal|backend|node/.test(text);
    const wantsBusiness=/premium|betalt|marked|market|users|brukere|money|penger|inntekt/.test(text);
    const parts=[
      'Jeg er '+(starter.label||'MMIR Guide')+', en gratis nettleserhjelper som fungerer uten backend. Jeg er ikke en full LLM, men jeg kan hjelpe deg til første ekte lokale modell raskt.'
    ];
    if(helperId==='mmir-model-picker'){
      parts.push('Min anbefaling: start med Qwen2.5 0.5B WebGPU hvis browseren støtter WebGPU. Hvis ikke: Gemma 3 270M eller SmolLM2 135M via Ollama for raskest install, deretter Llama 3.2 1B eller Phi-4 Mini når maskinen tåler mer.');
    }
    if(helperId==='mmir-setup-coach'){
      parts.push('Korteste setup: 1) velg en installable-free modell, 2) last ned Windows eller Mac/Linux installer, 3) kjør DryRun, 4) kjør install, 5) trykk Refresh. Når Local Node rapporterer modellen, flyttes chatten over til ekte live backend.');
    }
    if(helperId==='mmir-security-coach'){
      parts.push('Sikkerhetsregelen er: offentlig frontend lagrer ikke hemmeligheter. Lokale modeller går via 127.0.0.1 og pairing. Provider-nøkler og betalte modeller må gå via beskyttet backend med auth, rate limit, audit og cost-policy.');
    }
    if(helperId==='mmir-growth-coach'){
      parts.push('Smart inntektsstige: gratis browser helpers + gratis lokal chat først, deretter betalt managed VM/GPU, premium provider routing, team/admin, marketplace listing, evals og supportert enterprise governance.');
    }
    if(wantsModel||!text){
      parts.push('Beste gratis start: velg Gemma 3 270M eller SmolLM2 135M for svak maskin, Gemma 3 1B eller Llama 3.2 1B for normal laptop, og DeepSeek-R1 1.5B eller Phi-4 Mini når du vil teste mer reasoning.');
    }
    if(wantsConnect||!text){
      parts.push('Flyt: velg en installable-free modell i listen, last ned installer for Windows eller Mac/Linux, kjør DryRun først, kjør install, og la MMIR aktivere Local Node på http://127.0.0.1:3000. Etterpå vises modellen som live fra aktiv backend.');
    }
    if(wantsBusiness){
      parts.push('Smart freemium: gratis lokal chat og installasjon først; betalte inntektslag senere bør være managed VM/GPU, premium provider routing, team governance, marketplace listing og supportert one-click deployment. Ingen betalt rute skal starte uten eksplisitt kostpolicy.');
    }
    parts.push('Neste handling her: velg en gratis Ollama-modell i modelllisten, eller trykk + Connect Model for å opprette en lokal profil.');
    return parts.join('\n\n');
  }

  function installResponse(model){
    const commands=commandLines(model);
    return [
      model.label+' er valgt som gratis lokal modell.',
      'Den er ikke live i nettleseren ennå. Den blir live når MMIR Local Node og Ollama kjører lokalt og /models rapporterer modellen.',
      'Windows:',
      '```powershell\n'+commands.windows.join('\n')+'\n```',
      'Mac / Linux:',
      '```bash\n'+commands.unix.join('\n')+'\n```',
      'Direkte Ollama-test hvis Ollama allerede er installert:',
      '```bash\n'+commands.ollama.join('\n')+'\n```',
      'Etter install: bruk + Connect Model, sett profilen aktiv, og trykk Refresh i chatten. Da skal modellen flytte seg fra installable-free til live backend-modell.'
    ].join('\n\n');
  }

  async function sendStarterMessage(starter,prompt){
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
    setStatus(starter.runtime==='browser-guide'?'Guide answered locally.':'Install path generated.','ready');
    setBusy(false);
  }

  async function refreshState(force){
    ensureSendControl();
    const profile=activeProfile();
    const currentId=activeId();
    if(!force&&currentId===lastActiveId)return;
    lastActiveId=currentId;
    if(!profile||!cleanUrl(profile.url)){
      renderModels([]);
      setStatus('Free guide and installable local models are ready. Connect a backend to make models live.','ready');
      return;
    }
    const url=cleanUrl(profile.url);
    try{
      setStatus('Free browser models are ready. Checking local node in the background...','loading');
      await fetchJson(joinUrl(url,'/health'),{timeoutMs:5000});
      const token=await pairIfNeeded(profile,url);
      const headers=authHeaders(token);
      const [models,hardware]=await Promise.all([
        fetchJson(joinUrl(url,'/models'),{headers,timeoutMs:8000}),
        fetchJson(joinUrl(url,'/hardware'),{headers,timeoutMs:5000}).catch(()=>null)
      ]);
      const normalized=normalizeModels(models);
      renderModels(normalized);
      if(resourceChipEl)resourceChipEl.textContent=hardwareSummary(hardware)||'CPU/RAM local';
      writeActiveProfilePatch({health:normalized.length?'ready':'degraded',models:summarizeModels(normalized)});
      setStatus(normalized.length?'Backend ready.':'Backend online. Free installable models are still available below.',normalized.length?'ready':'idle');
    }catch(error){
      renderModels([]);
      if(resourceChipEl)resourceChipEl.textContent='CPU/RAM offline';
      writeActiveProfilePatch({health:error?.status===401?'testing':'offline'});
      if(starterModels.length){
        setStatus('Free browser/installable models are ready. Local node is not running yet.','ready');
      }else{
        setStatus(friendlyError(error),'error');
      }
    }
  }

  async function sendMessage(){
    if(busy)return;
    const profile=activeProfile();
    const url=cleanUrl(profile?.url);
    const prompt=String(promptEl?.value||'').trim();
    let model=modelSelect&&!modelSelect.disabled?modelSelect.value:'';
    if(!prompt){setStatus('Write a message first.','error');return;}
    const starter=starterFromValue(model);
    if(starter){
      await sendStarterMessage(starter,prompt);
      return;
    }
    if(!profile||!url){setStatus('Activate a backend profile or choose a free guide/installable model.','error');return;}
    if(!model){await refreshState(true);model=modelSelect&&!modelSelect.disabled?modelSelect.value:'';if(!model){setStatus('No live model is available from this backend.','error');return;}}

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
      const [backendMemory,backendKnowledge]=await Promise.all([
        backendMemoryInstruction(prompt,url,headers),
        backendKnowledgeInstruction(prompt,url,headers)
      ]);
      const payloadMessages=contextMessages(prompt,backendMemory,backendKnowledge);
      const payload={model:selectedModel,messages:payloadMessages};
      const content=await chatWithBackend(url,headers,payload,currentAbortController.signal,(partial)=>{
        updateMessage(assistant.message.id,partial||'Thinking...',messageMeta);
        setStatus('Streaming response...','loading');
      });
      updateMessage(assistant.message.id,content||'Backend returned an empty response.',messageMeta);
      writeActiveProfilePatch({health:'ready'});
      setStatus('Response received.','ready');
    }catch(error){
      const message=stopRequested?'Response stopped.':friendlyError(error);
      updateMessage(assistant.message.id,message,stopRequested?'stopped':'error');
      writeActiveProfilePatch({health:stopRequested?'ready':(error?.status===401?'testing':'degraded')});
      setStatus(message,stopRequested?'idle':'error');
    }finally{
      currentAbortController=null;
      setBusy(false);
      if(pendingWorkspaceSwitch)switchWorkspace();
    }
  }

  function init(){
    if(!promptEl||!formEl)return;
    installRuntimeUi();
    ensureSendControl();
    messages=loadMessages();
    renderStoredMessages();
    if(primaryLink){primaryLink.addEventListener('click',(event)=>{event.preventDefault();sendMessage();});}
    formEl.addEventListener('submit',(event)=>{event.preventDefault();sendMessage();});
    promptEl.addEventListener('keydown',(event)=>{if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();sendMessage();}});
    window.addEventListener('mmir-active-role-changed',()=>{const role=activeRole();setStatus(role?'Role set: '+role.label+'.':'Role preset cleared.','idle');});
    window.addEventListener('mmir-memory-updated',()=>setStatus('Workspace memory updated.','idle'));
    window.addEventListener('mmir-knowledge-updated',()=>setStatus('Workspace knowledge updated.','idle'));
    window.addEventListener('mmir-workspace-changed',switchWorkspace);
    window.addEventListener('storage',()=>refreshState(true));
    loadStarterModels().then(()=>refreshState(true));
    setInterval(()=>refreshState(false),3000);
    window.addEventListener('focus',()=>refreshState(true));
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
