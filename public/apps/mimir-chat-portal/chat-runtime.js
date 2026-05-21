(function(){
  const PROFILE_KEY='mimir-chat-backend-profiles';
  const ACTIVE_KEY='mimir-chat-active-backend';
  const ROLE_KEY='mimir-chat-active-role';
  const WORKSPACE_KEY='mimir-active-workspace-v1';
  const DEFAULT_WORKSPACE_ID='personal';
  const MEMORY_PREFIX='mimir-memory-v1:';
  const KNOWLEDGE_PREFIX='mimir-knowledge-v1:';
  const TOKEN_PREFIX='mimir-local-node-token:';
  const CHAT_KEY='mimir-chat-current-session-v1';
  const MAX_STORED_MESSAGES=80;
  const MAX_CONTEXT_MESSAGES=24;
  const promptEl=document.getElementById('mimir-prompt');
  const formEl=document.querySelector('.mimir-composer');
  const primaryLink=document.getElementById('primary-chat-link');
  const chatCenter=document.querySelector('.mimir-chat-center');
  let modelSelect=null;
  let statusEl=null;
  let transcriptEl=null;
  let refreshBtn=null;
  let stopBtn=null;
  let clearBtn=null;
  let currentAbortController=null;
  let stopRequested=false;
  let lastActiveId='';
  let currentChatKey='';
  let pendingWorkspaceSwitch=false;
  let busy=false;
  let messages=[];

  function readProfiles(){try{const value=JSON.parse(localStorage.getItem(PROFILE_KEY)||'[]');return Array.isArray(value)?value:[];}catch(error){return [];}}
  function activeId(){return localStorage.getItem(ACTIVE_KEY)||'';}
  function activeProfile(){const id=activeId();return readProfiles().find(profile=>profile.id===id)||null;}
  function cleanUrl(value){return String(value||'').trim().replace(/\/$/,'');}
  function isLocal(profile){return profile?.provider==='local-node'||profile?.provider==='ollama-direct';}
  function joinUrl(base,path){return cleanUrl(base)+path;}
  function tokenKey(url){return TOKEN_PREFIX+cleanUrl(url);}
  function activeWorkspaceId(){return localStorage.getItem(WORKSPACE_KEY)||DEFAULT_WORKSPACE_ID;}
  function chatStorageKey(){return CHAT_KEY+':'+activeWorkspaceId();}
  function memoryStorageKey(){return MEMORY_PREFIX+activeWorkspaceId();}
  function knowledgeStorageKey(){return KNOWLEDGE_PREFIX+activeWorkspaceId();}
  function setStatus(message,state){if(statusEl){statusEl.textContent=message||'';statusEl.dataset.state=state||'idle';}}

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
      const items=value.map(item=>String(item?.text||'').trim()).filter(Boolean).slice(-8);
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

  function setBusy(value){
    busy=value;
    if(stopBtn)stopBtn.disabled=!value;
    if(refreshBtn)refreshBtn.disabled=value;
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
    primaryLink.textContent='Send';
    primaryLink.setAttribute('href','#mimir-chat-runtime');
    primaryLink.setAttribute('role','button');
    primaryLink.setAttribute('aria-label','Send prompt to the active backend');
    primaryLink.removeAttribute('target');
  }

  function installRuntimeUi(){
    if(!chatCenter||document.getElementById('mimir-chat-runtime'))return;
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
        '<button id="runtime-clear" type="button" aria-label="Clear local chat history">Clear</button>'+
      '</div>'+
      '<div id="runtime-transcript" class="runtime-transcript" aria-live="polite" aria-relevant="additions text" aria-busy="false"></div>';
    if(formEl&&formEl.nextSibling){chatCenter.insertBefore(runtime,formEl.nextSibling);}else{chatCenter.appendChild(runtime);}
    modelSelect=document.getElementById('runtime-model');
    statusEl=document.getElementById('runtime-state');
    transcriptEl=document.getElementById('runtime-transcript');
    refreshBtn=document.getElementById('runtime-refresh');
    stopBtn=document.getElementById('runtime-stop');
    clearBtn=document.getElementById('runtime-clear');
    if(modelSelect)modelSelect.setAttribute('aria-label','Active chat model');
    refreshBtn.addEventListener('click',()=>refreshState(true));
    stopBtn.addEventListener('click',stopCurrentResponse);
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

  function contextMessages(prompt){
    const history=messages
      .filter(message=>message.role==='user'||message.role==='assistant')
      .filter(message=>message.content&&message.content!=='Thinking...')
      .slice(-MAX_CONTEXT_MESSAGES)
      .map(message=>({role:message.role,content:message.content}));
    const role=activeRole();
    const memory=activeMemoryInstruction();
    const knowledge=relevantKnowledgeInstruction(prompt);
    const next=history.concat([{role:'user',content:prompt}]);
    const system=[];
    if(role)system.push({role:'system',content:role.instruction});
    if(memory)system.push({role:'system',content:memory});
    if(knowledge)system.push({role:'system',content:knowledge});
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

  function renderModels(models){
    if(!modelSelect)return;
    const previous=modelSelect.value;
    modelSelect.innerHTML='';
    if(!models.length){
      const option=document.createElement('option');
      option.value='';
      option.textContent='No live models';
      modelSelect.appendChild(option);
      modelSelect.disabled=true;
      return;
    }
    for(const model of models){
      const option=document.createElement('option');
      option.value=model.id;
      option.textContent=model.label||model.id;
      modelSelect.appendChild(option);
    }
    if(previous&&models.some(model=>model.id===previous))modelSelect.value=previous;
    modelSelect.disabled=false;
  }

  async function fetchJson(url,options={}){
    const controller=new AbortController();
    const timeoutMs=options.timeoutMs||15000;
    const timeout=setTimeout(()=>controller.abort(),timeoutMs);
    const externalSignal=options.signal;
    const abortFromExternal=()=>controller.abort();
    if(externalSignal){
      if(externalSignal.aborted)controller.abort();
      else externalSignal.addEventListener('abort',abortFromExternal,{once:true});
    }
    const {timeoutMs:ignoredTimeout,signal:ignoredSignal,...fetchOptions}=options;
    try{
      const response=await fetch(url,{...fetchOptions,signal:controller.signal});
      let data=null;
      try{data=await response.json();}catch(error){data=null;}
      if(!response.ok){
        const message=data?.error?.message||('Request failed with '+response.status);
        const err=new Error(message);
        err.status=response.status;
        err.payload=data;
        throw err;
      }
      return data;
    }finally{
      clearTimeout(timeout);
      if(externalSignal)externalSignal.removeEventListener('abort',abortFromExternal);
    }
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
    if(!isLocal(profile))return '';
    const existing=sessionStorage.getItem(tokenKey(url));
    if(existing)return existing;
    const data=await fetchJson(joinUrl(url,'/pair'),{method:'POST',timeoutMs:5000});
    if(data?.token){sessionStorage.setItem(tokenKey(url),data.token);return data.token;}
    return '';
  }

  function authHeaders(token){
    const headers={'Content-Type':'application/json'};
    if(token)headers['x-mmir-local-token']=token;
    return headers;
  }

  function friendlyError(error){
    if(error?.name==='AbortError')return 'Backend timed out. Check that the local node or API is running.';
    if(error?.status===401)return 'Backend requires pairing. Refresh the connection and try again.';
    if(error?.status===403)return 'This page origin is not allowed by the backend CORS policy.';
    if(error?.status===404)return 'Backend does not expose the expected MMIR route yet.';
    if(error?.status===413)return 'Prompt is too large for this backend.';
    if(error?.status===503)return 'Runtime is unavailable. Check Ollama or the selected provider.';
    if(String(error?.message||'').includes('Failed to fetch'))return 'Backend is unreachable or blocked by CORS. Check the URL and local node.';
    return error?.message||'Chat request failed.';
  }

  async function refreshState(force){
    ensureSendControl();
    const profile=activeProfile();
    const currentId=activeId();
    if(!force&&currentId===lastActiveId)return;
    lastActiveId=currentId;
    if(!profile||!cleanUrl(profile.url)){
      renderModels([]);
      setStatus('Add and activate a backend profile first.','idle');
      return;
    }
    const url=cleanUrl(profile.url);
    try{
      setStatus('Checking backend...','loading');
      await fetchJson(joinUrl(url,'/health'),{timeoutMs:5000});
      const token=await pairIfNeeded(profile,url);
      const models=await fetchJson(joinUrl(url,'/models'),{headers:authHeaders(token),timeoutMs:8000});
      const normalized=normalizeModels(models);
      renderModels(normalized);
      writeActiveProfilePatch({health:normalized.length?'ready':'degraded',models:summarizeModels(normalized)});
      setStatus(normalized.length?'Backend ready.':'Backend online, no live models reported.',normalized.length?'ready':'idle');
    }catch(error){
      renderModels([]);
      writeActiveProfilePatch({health:error?.status===401?'testing':'offline'});
      setStatus(friendlyError(error),'error');
    }
  }

  async function sendMessage(){
    if(busy)return;
    const profile=activeProfile();
    const url=cleanUrl(profile?.url);
    const prompt=String(promptEl?.value||'').trim();
    let model=modelSelect&&!modelSelect.disabled?modelSelect.value:'';
    if(!profile||!url){setStatus('Activate a backend profile before sending.','error');return;}
    if(!prompt){setStatus('Write a message first.','error');return;}
    if(!model){await refreshState(true);model=modelSelect&&!modelSelect.disabled?modelSelect.value:'';if(!model){setStatus('No live model is available from this backend.','error');return;}}

    stopRequested=false;
    currentAbortController=new AbortController();
    setBusy(true);
    const selectedModel=model;
    const role=activeRole();
    const roleName=role?.label||'';
    const messageMeta=[selectedModel,roleName].filter(Boolean).join(' - ');
    const payloadMessages=contextMessages(prompt);
    appendMessage('user',prompt,profile.name||profile.provider||'backend');
    promptEl.value='';
    const assistant=appendMessage('assistant','Thinking...',messageMeta,{retryPrompt:prompt,model:selectedModel,rolePreset:roleName});
    setStatus(roleName?'Sending to '+roleName+' role...':'Sending to backend...','loading');
    try{
      const token=await pairIfNeeded(profile,url);
      const payload={model:selectedModel,messages:payloadMessages};
      const content=await chatWithBackend(url,authHeaders(token),payload,currentAbortController.signal,(partial)=>{
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
    refreshState(true);
    setInterval(()=>refreshState(false),3000);
    window.addEventListener('focus',()=>refreshState(true));
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
