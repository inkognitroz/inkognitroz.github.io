(function(){
  const PROFILE_KEY='mimir-chat-backend-profiles';
  const ACTIVE_KEY='mimir-chat-active-backend';
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
  let busy=false;
  let messages=[];

  function readProfiles(){try{const value=JSON.parse(localStorage.getItem(PROFILE_KEY)||'[]');return Array.isArray(value)?value:[];}catch(error){return [];}}
  function activeId(){return localStorage.getItem(ACTIVE_KEY)||'';}
  function activeProfile(){const id=activeId();return readProfiles().find(profile=>profile.id===id)||null;}
  function cleanUrl(value){return String(value||'').trim().replace(/\/$/,'');}
  function isLocal(profile){return profile?.provider==='local-node'||profile?.provider==='ollama-direct';}
  function joinUrl(base,path){return cleanUrl(base)+path;}
  function tokenKey(url){return TOKEN_PREFIX+cleanUrl(url);}
  function setStatus(message,state){if(statusEl){statusEl.textContent=message||'';statusEl.dataset.state=state||'idle';}}

  function setBusy(value){
    busy=value;
    if(stopBtn)stopBtn.disabled=!value;
    if(refreshBtn)refreshBtn.disabled=value;
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

  function loadMessages(){
    try{
      const value=JSON.parse(localStorage.getItem(CHAT_KEY)||'[]');
      if(!Array.isArray(value))return [];
      return value.filter(message=>{
        return (message?.role==='user'||message?.role==='assistant')&&typeof message.content==='string';
      }).slice(-MAX_STORED_MESSAGES);
    }catch(error){
      return [];
    }
  }

  function saveMessages(){
    try{localStorage.setItem(CHAT_KEY,JSON.stringify(messages.slice(-MAX_STORED_MESSAGES)));}catch(error){}
  }

  function createMessage(role,content,meta,extra={}){
    return {
      id:String(Date.now())+'-'+Math.random().toString(16).slice(2),
      role,
      content:String(content||''),
      meta:String(meta||''),
      createdAt:new Date().toISOString(),
      retryPrompt:typeof extra.retryPrompt==='string'?extra.retryPrompt:'',
      model:typeof extra.model==='string'?extra.model:''
    };
  }

  function ensureSendControl(){
    if(!primaryLink)return;
    primaryLink.textContent='Send';
    primaryLink.setAttribute('href','#mimir-chat-runtime');
    primaryLink.removeAttribute('target');
  }

  function installRuntimeUi(){
    if(!chatCenter||document.getElementById('mimir-chat-runtime'))return;
    const runtime=document.createElement('section');
    runtime.id='mimir-chat-runtime';
    runtime.className='mimir-chat-runtime';
    runtime.setAttribute('aria-label','MMIR live chat');
    runtime.innerHTML=''+
      '<div class="runtime-toolbar">'+
        '<span id="runtime-state" data-state="idle">Select a backend to start.</span>'+
        '<label for="runtime-model">Model<select id="runtime-model" disabled><option value="">No live models</option></select></label>'+
        '<button id="runtime-refresh" type="button">Refresh</button>'+
        '<button id="runtime-stop" type="button" disabled>Stop</button>'+
        '<button id="runtime-clear" type="button">Clear</button>'+
      '</div>'+
      '<div id="runtime-transcript" class="runtime-transcript" aria-live="polite"></div>';
    if(formEl&&formEl.nextSibling){chatCenter.insertBefore(runtime,formEl.nextSibling);}else{chatCenter.appendChild(runtime);}
    modelSelect=document.getElementById('runtime-model');
    statusEl=document.getElementById('runtime-state');
    transcriptEl=document.getElementById('runtime-transcript');
    refreshBtn=document.getElementById('runtime-refresh');
    stopBtn=document.getElementById('runtime-stop');
    clearBtn=document.getElementById('runtime-clear');
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
    copy.addEventListener('click',async()=>{
      try{await navigator.clipboard.writeText(message.content);setStatus('Answer copied.','ready');}
      catch(error){setStatus('Copy failed in this browser.','error');}
    });
    actions.appendChild(copy);
    if(message.retryPrompt){
      const retry=document.createElement('button');
      retry.type='button';
      retry.textContent='Retry';
      retry.addEventListener('click',()=>retryMessage(message));
      actions.appendChild(retry);
    }
    bubble.appendChild(actions);
  }

  function renderMessage(message){
    if(!transcriptEl)return null;
    const bubble=document.createElement('article');
    bubble.className='runtime-message runtime-message-'+message.role;
    bubble.dataset.messageId=message.id;
    const label=document.createElement('span');
    label.className='runtime-message-label';
    label.textContent=message.role==='user'?'You':'MMIR';
    const body=document.createElement('p');
    body.textContent=message.content;
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
    const body=bubble?.querySelector('p');
    if(body)body.textContent=String(content||'');
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
    setStatus('Conversation cleared locally.','idle');
  }

  function stopCurrentResponse(){
    if(!currentAbortController)return;
    stopRequested=true;
    currentAbortController.abort();
    setStatus('Stopping response...','loading');
  }

  function retryMessage(message){
    if(busy)return;
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
    return history.concat([{role:'user',content:prompt}]);
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
    const model=modelSelect&&!modelSelect.disabled?modelSelect.value:'';
    if(!profile||!url){setStatus('Activate a backend profile before sending.','error');return;}
    if(!prompt){setStatus('Write a message first.','error');return;}
    if(!model){await refreshState(true);if(!modelSelect||modelSelect.disabled){setStatus('No live model is available from this backend.','error');return;}}

    stopRequested=false;
    currentAbortController=new AbortController();
    setBusy(true);
    const selectedModel=modelSelect.value;
    const payloadMessages=contextMessages(prompt);
    appendMessage('user',prompt,profile.name||profile.provider||'backend');
    promptEl.value='';
    const assistant=appendMessage('assistant','Thinking...',selectedModel,{retryPrompt:prompt,model:selectedModel});
    setStatus('Sending to backend...','loading');
    try{
      const token=await pairIfNeeded(profile,url);
      const payload={model:selectedModel,messages:payloadMessages,stream:false};
      let data;
      try{
        data=await fetchJson(joinUrl(url,'/chat/completions'),{method:'POST',headers:authHeaders(token),body:JSON.stringify(payload),timeoutMs:60000,signal:currentAbortController.signal});
      }catch(error){
        if(error.status!==404)throw error;
        data=await fetchJson(joinUrl(url,'/chat'),{method:'POST',headers:authHeaders(token),body:JSON.stringify(payload),timeoutMs:60000,signal:currentAbortController.signal});
      }
      const content=data?.choices?.[0]?.message?.content||data?.content||'';
      updateMessage(assistant.message.id,content||'Backend returned an empty response.',selectedModel);
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
    refreshState(true);
    setInterval(()=>refreshState(false),3000);
    window.addEventListener('focus',()=>refreshState(true));
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
