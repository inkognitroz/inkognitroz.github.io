(function(){
  const PROFILE_KEY='mimir-chat-backend-profiles';
  const ACTIVE_KEY='mimir-chat-active-backend';
  const TOKEN_PREFIX='mimir-local-node-token:';
  const promptEl=document.getElementById('mimir-prompt');
  const formEl=document.querySelector('.mimir-composer');
  const primaryLink=document.getElementById('primary-chat-link');
  const chatCenter=document.querySelector('.mimir-chat-center');
  let modelSelect=null;
  let statusEl=null;
  let transcriptEl=null;
  let refreshBtn=null;
  let lastActiveId='';
  let busy=false;

  function readProfiles(){try{const value=JSON.parse(localStorage.getItem(PROFILE_KEY)||'[]');return Array.isArray(value)?value:[];}catch(error){return [];}}
  function activeId(){return localStorage.getItem(ACTIVE_KEY)||'';}
  function activeProfile(){const id=activeId();return readProfiles().find(profile=>profile.id===id)||null;}
  function cleanUrl(value){return String(value||'').trim().replace(/\/$/,'');}
  function isLocal(profile,url){return profile?.provider==='local-node'||/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(url);}
  function joinUrl(base,path){return cleanUrl(base)+path;}
  function tokenKey(url){return TOKEN_PREFIX+cleanUrl(url);}
  function setStatus(message,state){if(statusEl){statusEl.textContent=message||'';statusEl.dataset.state=state||'idle';}}

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
      '</div>'+
      '<div id="runtime-transcript" class="runtime-transcript" aria-live="polite"></div>';
    if(formEl&&formEl.nextSibling){chatCenter.insertBefore(runtime,formEl.nextSibling);}else{chatCenter.appendChild(runtime);}
    modelSelect=document.getElementById('runtime-model');
    statusEl=document.getElementById('runtime-state');
    transcriptEl=document.getElementById('runtime-transcript');
    refreshBtn=document.getElementById('runtime-refresh');
    refreshBtn.addEventListener('click',()=>refreshState(true));
  }

  function addMessage(role,content,meta){
    if(!transcriptEl)return null;
    const bubble=document.createElement('article');
    bubble.className='runtime-message runtime-message-'+role;
    const label=document.createElement('span');
    label.className='runtime-message-label';
    label.textContent=role==='user'?'You':'MMIR';
    const body=document.createElement('p');
    body.textContent=content;
    bubble.append(label,body);
    if(meta){const small=document.createElement('small');small.textContent=meta;bubble.appendChild(small);}
    transcriptEl.appendChild(bubble);
    bubble.scrollIntoView({block:'nearest'});
    return body;
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
    if(!models.length){
      modelSelect.innerHTML='<option value="">No live models</option>';
      modelSelect.disabled=true;
      return;
    }
    modelSelect.innerHTML=models.map(model=>'<option value="'+model.id.replaceAll('"','&quot;')+'">'+(model.label||model.id).replaceAll('<','&lt;').replaceAll('>','&gt;')+'</option>').join('');
    modelSelect.disabled=false;
  }

  async function fetchJson(url,options={}){
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),options.timeoutMs||15000);
    try{
      const response=await fetch(url,{...options,signal:controller.signal});
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
    }
  }

  async function pairIfNeeded(profile,url){
    if(!isLocal(profile,url))return '';
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
      setStatus(normalized.length?'Backend ready.':'Backend online, no live models reported.',normalized.length?'ready':'idle');
    }catch(error){
      renderModels([]);
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

    busy=true;
    const selectedModel=modelSelect.value;
    addMessage('user',prompt,profile.name||profile.provider||'backend');
    promptEl.value='';
    const assistantBody=addMessage('assistant','Thinking...',selectedModel);
    setStatus('Sending to backend...','loading');
    try{
      const token=await pairIfNeeded(profile,url);
      const payload={model:selectedModel,messages:[{role:'user',content:prompt}],stream:false};
      let data;
      try{
        data=await fetchJson(joinUrl(url,'/chat/completions'),{method:'POST',headers:authHeaders(token),body:JSON.stringify(payload),timeoutMs:60000});
      }catch(error){
        if(error.status!==404)throw error;
        data=await fetchJson(joinUrl(url,'/chat'),{method:'POST',headers:authHeaders(token),body:JSON.stringify(payload),timeoutMs:60000});
      }
      const content=data?.choices?.[0]?.message?.content||data?.content||'';
      assistantBody.textContent=content||'Backend returned an empty response.';
      setStatus('Response received.','ready');
    }catch(error){
      assistantBody.textContent=friendlyError(error);
      setStatus(friendlyError(error),'error');
    }finally{
      busy=false;
    }
  }

  function init(){
    if(!promptEl||!formEl)return;
    installRuntimeUi();
    if(primaryLink){
      primaryLink.textContent='Send';
      primaryLink.removeAttribute('target');
      primaryLink.addEventListener('click',(event)=>{event.preventDefault();sendMessage();});
    }
    formEl.addEventListener('submit',(event)=>{event.preventDefault();sendMessage();});
    promptEl.addEventListener('keydown',(event)=>{if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();sendMessage();}});
    refreshState(true);
    setInterval(()=>refreshState(false),3000);
    window.addEventListener('focus',()=>refreshState(true));
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
