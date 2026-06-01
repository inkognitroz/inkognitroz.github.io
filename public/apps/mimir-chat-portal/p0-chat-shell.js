(function(){
  window.__MimirP0SimpleChat=true;
  const API_URL='https://api.mmir.ai';
  const LOCAL_URL='http://127.0.0.1:3000';
  const CHAT_PATH='/v1/chat/completions';
  const TOKEN_KEY='mmir-p0-local-token';
  const HISTORY_KEY='mmir-p0-chat-history-v1';
  const HISTORY_SCHEMA_KEY='mmir-p0-chat-history-schema';
  const HISTORY_SCHEMA='20260601-clean-first-chat-v1';
  const MODELS_KEY='mmir-p0-active-models-v1';
  const MAC_INSTALL_URL='./downloads/mmir-local-connector-mac.zip';
  const INSTALL_HELP_URL='./downloads/mmir-local-connector-install.html';
  const MAX_HISTORY=40;
  const STALE_FAILURE_PATTERNS=[
    /Selected browser LLM is not loaded/i,
    /System prompt should always be the first message/i,
    /This browser\/device does not expose WebGPU/i,
    /Browser Model is unavailable/i,
    /WebGPU unavailable/i,
    /local_probe_deferred/i,
    /Activate a backend profile/i,
    /No model route is visible yet/i,
    /Backend is unreachable/i,
    /Runtime is unavailable/i
  ];

  const state={
    busy:false,
    messages:initialMessages(),
    models:[
      {
        id:'mmir-supergenius',
        label:'Supergenious',
        route:'hosted',
        detail:'Ready now',
        model:'mmir-supergenius'
      }
    ],
    activeModelId:'mmir-supergenius',
    localChecked:false,
    localError:''
  };

  function initialMessages(){
    const schema=localStorage.getItem(HISTORY_SCHEMA_KEY);
    if(schema!==HISTORY_SCHEMA){
      try{
        localStorage.removeItem(HISTORY_KEY);
        localStorage.setItem(HISTORY_SCHEMA_KEY,HISTORY_SCHEMA);
      }catch(error){}
      return [];
    }
    const raw=readJson(HISTORY_KEY,[]);
    const clean=raw.filter(validMessage).filter(message=>!staleFailureMessage(message)).slice(-MAX_HISTORY);
    if(clean.length!==raw.length)writeJson(HISTORY_KEY,clean);
    return clean;
  }

  function readJson(key,fallback){
    try{
      const value=JSON.parse(localStorage.getItem(key)||'null');
      return value==null?fallback:value;
    }catch(error){
      return fallback;
    }
  }

  function writeJson(key,value){
    try{localStorage.setItem(key,JSON.stringify(value));}catch(error){}
  }

  function validMessage(message){
    return message&&
      (message.role==='user'||message.role==='assistant')&&
      typeof message.content==='string'&&
      message.content.trim();
  }

  function staleFailureMessage(message){
    const content=String(message?.content||'');
    return STALE_FAILURE_PATTERNS.some(pattern=>pattern.test(content));
  }

  function safeText(value){
    return String(value||'').replace(/[&<>"']/g,(char)=>({
      '&':'&amp;',
      '<':'&lt;',
      '>':'&gt;',
      '"':'&quot;',
      "'":'&#39;'
    }[char]));
  }

  function paragraphs(text){
    return String(text||'')
      .split(/\n{2,}/)
      .map(part=>part.trim())
      .filter(Boolean)
      .map(part=>'<p>'+safeText(part)+'</p>')
      .join('')||'<p></p>';
  }

  function activeModel(){
    return state.models.find(model=>model.id===state.activeModelId)||state.models[0];
  }

  function fetchOptions(url,options){
    const init={...options};
    try{
      const parsed=new URL(url,location.href);
      if(['127.0.0.1','localhost','::1'].includes(parsed.hostname)){
        init.targetAddressSpace='loopback';
      }
    }catch(error){}
    return init;
  }

  async function fetchJson(url,options={}){
    const controller=new AbortController();
    const timeoutMs=options.timeoutMs||45000;
    const timeout=setTimeout(()=>controller.abort(),timeoutMs);
    const {timeoutMs:ignored,...rest}=options;
    try{
      const response=await fetch(url,fetchOptions(url,{...rest,signal:controller.signal}));
      let data=null;
      try{data=await response.json();}catch(error){data=null;}
      if(!response.ok){
        const err=new Error(data?.error?.message||('Request failed with '+response.status));
        err.status=response.status;
        err.payload=data;
        throw err;
      }
      return data;
    }finally{
      clearTimeout(timeout);
    }
  }

  function localNetworkHint(error){
    const message=String(error?.message||error||'');
    if(/local_probe_deferred/i.test(message)){
      return 'Local connector check was deferred. Press Find local models again to allow this browser to check this Mac.';
    }
    if(error?.name==='AbortError')return 'Local connector timed out. Check that MMIR Local Connector and Ollama are running.';
    if(/Failed to fetch|NetworkError|Load failed|blocked|CORS/i.test(message)){
      return 'Browser blocked local connector access. Allow Local Network Access for mmir.ai, then press Check local node again.';
    }
    return message||'Local connector is not reachable yet.';
  }

  function allowLocalProbes(reason='p0-local-action',durationMs=60000){
    try{window.MimirAllowLocalProbes?.(reason,durationMs);}catch(error){}
  }

  async function pairLocal(){
    const existing=sessionStorage.getItem(TOKEN_KEY);
    try{
      const data=await fetchJson(LOCAL_URL+'/pair',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:'{}',
        timeoutMs:7000
      });
      if(data?.token){
        sessionStorage.setItem(TOKEN_KEY,data.token);
        return data.token;
      }
    }catch(error){
      if(existing)return existing;
      throw error;
    }
    return existing||'';
  }

  function localHeaders(token){
    const headers={'Content-Type':'application/json'};
    if(token)headers['x-mmir-local-token']=token;
    return headers;
  }

  function normalizeLocalModels(payload){
    const raw=Array.isArray(payload?.data)?payload.data:Array.isArray(payload?.models)?payload.models:[];
    return raw
      .map(item=>String(item.id||item.name||item.model||'').trim())
      .filter(Boolean)
      .slice(0,12)
      .map(id=>({
        id:'local:'+id,
        label:id,
        route:'local',
        detail:'Local model',
        model:id
      }));
  }

  async function checkLocalModels({quiet=false}={}){
    try{
      allowLocalProbes('p0-find-local-models',60000);
      status('Checking local node...','loading');
      const token=await pairLocal();
      const health=await fetchJson(LOCAL_URL+'/health',{headers:localHeaders(token),timeoutMs:7000});
      if(!health||health.status==='offline')throw new Error('Local connector reports offline.');
      const models=normalizeLocalModels(await fetchJson(LOCAL_URL+'/v1/models',{headers:localHeaders(token),timeoutMs:10000}));
      const hosted=state.models.filter(model=>model.route==='hosted');
      state.models=hosted.concat(models);
      state.localChecked=true;
      state.localError='';
      writeJson(MODELS_KEY,state.models);
      if(models.length&&!state.models.some(model=>model.id===state.activeModelId)){
        state.activeModelId=models[0].id;
      }
      renderModelMenu();
      renderToolbar();
      status(models.length?'Local node connected: '+models.length+' model'+(models.length===1?'':'s')+'.':'Local node connected, but no local models were reported.',models.length?'ready':'idle');
      return models;
    }catch(error){
      state.localChecked=true;
      state.localError=localNetworkHint(error);
      state.models=state.models.filter(model=>model.route!=='local');
      if(activeModel()?.route==='local')state.activeModelId='mmir-supergenius';
      renderModelMenu();
      renderToolbar();
      if(!quiet)status(state.localError,'error');
      throw error;
    }
  }

  function installShell(){
    if(document.getElementById('mmir-p0-app'))return;
    const app=document.createElement('section');
    app.id='mmir-p0-app';
    app.setAttribute('aria-label','MMIR chat');
    app.innerHTML=''+
      '<header class="p0-topbar">'+
        '<a class="p0-brand" href="./mmir.html" aria-label="MMIR.ai chat">'+
          '<span class="p0-mark" aria-hidden="true">MM</span>'+
          '<span class="p0-brand-text"><strong>MMIR.ai</strong><span>One chat. Every AI model you trust.</span></span>'+
        '</a>'+
        '<div id="p0-status" class="p0-status" data-state="ready">Ready</div>'+
      '</header>'+
      '<main class="p0-chat">'+
        '<div id="p0-transcript" class="p0-transcript" aria-live="polite" aria-relevant="additions text"></div>'+
      '</main>'+
      '<footer class="p0-composer-wrap">'+
        '<form id="p0-composer" class="p0-composer" aria-label="MMIR chat composer">'+
          '<textarea id="p0-input" class="p0-input" rows="2" placeholder="Message Supergenious..." autocomplete="off" spellcheck="true"></textarea>'+
          '<div class="p0-toolbar">'+
            '<div class="p0-left">'+
              '<button id="p0-add" class="p0-btn p0-btn-icon" type="button" aria-label="Add or connect model" aria-expanded="false">+</button>'+
              '<button id="p0-privacy" class="p0-btn p0-btn-icon p0-shield" type="button" aria-label="Security and privacy status" title="Security and privacy">⌾</button>'+
            '</div>'+
            '<div class="p0-right">'+
              '<button id="p0-model" class="p0-model-button" type="button" aria-label="Choose model" aria-expanded="false"><span class="p0-model-name">Supergenious</span><span class="p0-chevron" aria-hidden="true"></span></button>'+
              '<button id="p0-mic" class="p0-btn p0-btn-icon p0-mic" type="button" aria-label="Voice input" title="Voice input"></button>'+
              '<button id="p0-send" class="p0-btn p0-btn-icon p0-send" type="submit" aria-label="Send message">↑</button>'+
            '</div>'+
          '</div>'+
        '</form>'+
      '</footer>'+
      '<div id="p0-add-menu" class="p0-menu" hidden></div>'+
      '<div id="p0-model-menu" class="p0-menu" hidden></div>'+
      '<div id="p0-privacy-menu" class="p0-menu" hidden></div>';
    document.body.appendChild(app);
    document.body.classList.add('mimir-p0-ready');
    enforceShellStyles();
    bindShell();
    renderAll();
    maybeAutoCheckLocal();
  }

  function enforceShellStyles(){
    const app=document.getElementById('mmir-p0-app');
    if(!app||!document.body)return;
    document.body.style.setProperty('display','block','important');
    document.body.style.setProperty('grid-template-columns','none','important');
    document.body.style.setProperty('overflow','hidden','important');
    [...document.body.children].forEach(child=>{
      if(child===app)return;
      child.style.setProperty('display','none','important');
      child.setAttribute('aria-hidden','true');
    });
    app.style.removeProperty('display');
    app.removeAttribute('aria-hidden');
  }

  function bindShell(){
    const form=document.getElementById('p0-composer');
    const input=document.getElementById('p0-input');
    form.addEventListener('submit',(event)=>{
      event.preventDefault();
      event.stopImmediatePropagation();
      sendMessage();
    },true);
    input.addEventListener('keydown',(event)=>{
      if(event.key==='Enter'&&!event.shiftKey){
        event.preventDefault();
        sendMessage();
      }
    });
    input.addEventListener('input',autosizeInput);
    document.getElementById('p0-add').addEventListener('click',(event)=>toggleMenu('add',event.currentTarget));
    document.getElementById('p0-model').addEventListener('click',(event)=>toggleMenu('model',event.currentTarget));
    document.getElementById('p0-privacy').addEventListener('click',(event)=>toggleMenu('privacy',event.currentTarget));
    document.getElementById('p0-mic').addEventListener('click',startVoice);
    document.addEventListener('click',(event)=>{
      if(event.target.closest('#p0-add,#p0-model,#p0-privacy,.p0-menu'))return;
      closeMenus();
    });
    if(!speechSupported()){
      const mic=document.getElementById('p0-mic');
      mic.hidden=true;
      mic.setAttribute('aria-hidden','true');
    }
  }

  function autosizeInput(){
    const input=document.getElementById('p0-input');
    if(!input)return;
    input.style.height='auto';
    input.style.height=Math.min(180,Math.max(58,input.scrollHeight))+'px';
  }

  function speechSupported(){
    return Boolean(window.SpeechRecognition||window.webkitSpeechRecognition);
  }

  function startVoice(){
    if(!speechSupported()){
      status('Voice input is not available in this browser.','error');
      return;
    }
    const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
    const recognition=new Recognition();
    recognition.lang=document.documentElement.lang||navigator.language||'en-US';
    recognition.interimResults=false;
    recognition.maxAlternatives=1;
    recognition.onstart=()=>status('Listening...','ready');
    recognition.onerror=()=>status('Voice input failed or was cancelled.','error');
    recognition.onresult=(event)=>{
      const text=String(event.results?.[0]?.[0]?.transcript||'').trim();
      const input=document.getElementById('p0-input');
      if(text&&input){
        input.value=(input.value?input.value+' ':'')+text;
        autosizeInput();
        input.focus();
        status('Voice text added.','ready');
      }
    };
    recognition.start();
  }

  function menuEl(name){
    return document.getElementById('p0-'+name+'-menu');
  }

  function closeMenus(){
    ['add','model','privacy'].forEach(name=>{
      const menu=menuEl(name);
      const button=document.getElementById('p0-'+(name==='add'?'add':name));
      if(menu)menu.hidden=true;
      if(button)button.setAttribute('aria-expanded','false');
    });
  }

  function toggleMenu(name,button){
    const menu=menuEl(name);
    if(!menu)return;
    const willOpen=menu.hidden;
    closeMenus();
    if(!willOpen)return;
    if(name==='add')renderAddMenu();
    if(name==='model')renderModelMenu();
    if(name==='privacy')renderPrivacyMenu();
    const rect=button.getBoundingClientRect();
    const width=Math.min(360,window.innerWidth-28);
    const left=Math.max(14,Math.min(window.innerWidth-width-14,rect.left));
    menu.style.left=left+'px';
    menu.hidden=false;
    button.setAttribute('aria-expanded','true');
  }

  function renderAddMenu(){
    const menu=menuEl('add');
    menu.innerHTML=''+
      '<div class="p0-menu-title">Tools</div>'+
      '<a href="'+MAC_INSTALL_URL+'" download><strong>Connect local model</strong><small>Download the Mac connector. Open it once to make local Ollama models available here.</small></a>'+
      '<button type="button" data-p0-action="check-local"><strong>Find local models</strong><small>Use after the connector is running on this Mac.</small></button>'+
      '<a href="'+INSTALL_HELP_URL+'"><strong>Install help</strong><small>Open the guided installer page if the download is blocked.</small></a>'+
      '<div class="p0-menu-separator"></div>'+
      '<button type="button" data-p0-action="new-chat"><strong>New chat</strong><small>Clear this browser chat only.</small></button>';
    menu.querySelector('[data-p0-action="check-local"]').addEventListener('click',()=>{closeMenus();checkLocalModels();});
    menu.querySelector('[data-p0-action="new-chat"]').addEventListener('click',()=>{closeMenus();clearChat();});
  }

  function renderModelMenu(){
    const menu=menuEl('model');
    if(!menu)return;
    const buttons=state.models.map(model=>{
      const selected=model.id===state.activeModelId?'Selected':'';
      return '<button type="button" data-model-id="'+safeText(model.id)+'"><strong>'+safeText(model.label)+'</strong><small>'+safeText([selected,model.detail].filter(Boolean).join(' · '))+'</small></button>';
    }).join('');
    const localHint=state.models.some(model=>model.route==='local')?'':
      '<div class="p0-menu-separator"></div><button type="button" data-p0-action="check-local"><strong>Find local models</strong><small>Checks this Mac only after you ask.</small></button>';
    menu.innerHTML='<div class="p0-menu-title">Models</div>'+buttons+localHint;
    menu.querySelectorAll('[data-model-id]').forEach(button=>{
      button.addEventListener('click',()=>{
        state.activeModelId=button.getAttribute('data-model-id');
        closeMenus();
        renderToolbar();
        status(activeModel().label+' selected.','ready');
      });
    });
    menu.querySelector('[data-p0-action="check-local"]')?.addEventListener('click',()=>{closeMenus();checkLocalModels();});
  }

  function renderPrivacyMenu(){
    const model=activeModel();
    const menu=menuEl('privacy');
    const route=model.route==='local'?'Private local model':'Supergenious hosted route';
    const secret=model.route==='local'?'This browser talks only to the paired connector on this device.':'No provider key is stored in the browser.';
    menu.innerHTML=''+
      '<div class="p0-menu-title">Privacy</div>'+
      '<button type="button"><strong>'+safeText(route)+'</strong><small>'+safeText(secret)+'</small></button>'+
      '<button type="button"><strong>No paid route started</strong><small>MMIR uses free routes here unless a protected backend is added later.</small></button>';
  }

  function renderToolbar(){
    const model=activeModel();
    const label=document.querySelector('#p0-model .p0-model-name');
    const input=document.getElementById('p0-input');
    if(label)label.textContent=model.label;
    if(input)input.placeholder='Message '+model.label+'...';
  }

  function renderTranscript(){
    const root=document.getElementById('p0-transcript');
    if(!root)return;
    if(!state.messages.length){
      root.innerHTML='<div class="p0-empty"><h1>Ask anything.</h1><p>Supergenious answers now. Use + later when you want private local models.</p></div>';
      return;
    }
    root.innerHTML=state.messages.map(message=>(
      '<article class="p0-message p0-message-'+safeText(message.role)+'">'+
        '<div class="p0-message-label">'+safeText(message.label||message.role)+'</div>'+
        '<div class="p0-message-body">'+paragraphs(message.content)+'</div>'+
      '</article>'
    )).join('');
    requestAnimationFrame(()=>{root.scrollTop=root.scrollHeight;});
  }

  function renderAll(){
    renderToolbar();
    renderTranscript();
    renderModelMenu();
  }

  function status(message,stateValue='idle'){
    const el=document.getElementById('p0-status');
    if(!el)return;
    el.textContent=message||'';
    el.dataset.state=stateValue;
  }

  function saveHistory(){
    try{localStorage.setItem(HISTORY_SCHEMA_KEY,HISTORY_SCHEMA);}catch(error){}
    writeJson(HISTORY_KEY,state.messages.slice(-MAX_HISTORY));
  }

  function append(role,content,label){
    const message={role,content:String(content||''),label:label||role,createdAt:new Date().toISOString()};
    state.messages.push(message);
    state.messages=state.messages.slice(-MAX_HISTORY);
    saveHistory();
    renderTranscript();
    return message;
  }

  function updateMessage(message,content){
    message.content=String(content||'');
    saveHistory();
    renderTranscript();
  }

  function clearChat(){
    state.messages=[];
    saveHistory();
    renderTranscript();
    status('New chat ready.','ready');
    document.getElementById('p0-input')?.focus();
  }

  function responseText(payload){
    return String(payload?.choices?.[0]?.message?.content||payload?.content||payload?.message||'').trim();
  }

  function hostedPayload(prompt){
    return {
      model:'mmir-supergenius',
      messages:[
        {role:'system',content:'You are Supergenious, the default assistant on MMIR.ai. Answer directly and usefully. Do not turn ordinary chats into setup support unless asked.'},
        {role:'user',content:prompt}
      ],
      stream:false,
      temperature:0.7,
      max_tokens:900
    };
  }

  function localPayload(prompt,model){
    return {
      model:model.model,
      messages:[
        {role:'system',content:'You are connected through MMIR Local Connector. Answer directly and concisely.'},
        {role:'user',content:prompt}
      ],
      stream:false,
      temperature:0.7,
      max_tokens:900
    };
  }

  async function chatHosted(prompt){
    const payload=hostedPayload(prompt);
    const data=await fetchJson(API_URL+CHAT_PATH,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify(payload),
      timeoutMs:45000
    });
    return responseText(data)||'Supergenious returned an empty response.';
  }

  async function chatLocal(prompt,model){
    allowLocalProbes('p0-local-chat',120000);
    const token=await pairLocal();
    const data=await fetchJson(LOCAL_URL+CHAT_PATH,{
      method:'POST',
      headers:localHeaders(token),
      body:JSON.stringify(localPayload(prompt,model)),
      timeoutMs:60000
    });
    return responseText(data)||'Local model returned an empty response.';
  }

  async function sendMessage(){
    if(state.busy)return;
    const input=document.getElementById('p0-input');
    const send=document.getElementById('p0-send');
    const prompt=String(input?.value||'').trim();
    if(!prompt){
      input?.focus();
      return;
    }
    closeMenus();
    state.busy=true;
    if(send)send.disabled=true;
    append('user',prompt,'You');
    input.value='';
    autosizeInput();
    const model=activeModel();
    const assistant=append('assistant','Thinking...',model.label);
    status(model.label+' is answering...','ready');
    try{
      const answer=model.route==='local'?await chatLocal(prompt,model):await chatHosted(prompt);
      updateMessage(assistant,answer);
      status(model.label+' answered.','ready');
    }catch(error){
      if(model.route==='local'){
        updateMessage(assistant,localNetworkHint(error)+'\n\nSupergenious is still available from the model picker.');
        state.activeModelId='mmir-supergenius';
        renderToolbar();
      }else{
        updateMessage(assistant,'I could not reach api.mmir.ai from this browser right now. Please refresh and try again.');
      }
      status('Chat failed: '+(model.route==='local'?'local node blocked/unavailable':'api.mmir.ai unreachable'), 'error');
    }finally{
      state.busy=false;
      if(send)send.disabled=false;
      input?.focus();
    }
  }

  function maybeAutoCheckLocal(){
    const params=new URLSearchParams(location.search);
    const hash=String(location.hash||'').toLowerCase();
    const shouldCheck=params.get('mmir_local_return')==='1'||params.get('local_node_ready')==='1'||hash.includes('local');
    if(!shouldCheck)return;
    window.MimirAllowLocalProbes?.('p0-local-return',60000);
    checkLocalModels({quiet:false}).catch(()=>{});
  }

  function boot(){
    installShell();
    enforceShellStyles();
    status('Ready','ready');
    document.getElementById('p0-input')?.focus();
    let passes=0;
    const timer=setInterval(()=>{
      enforceShellStyles();
      passes+=1;
      if(passes>=20)clearInterval(timer);
    },500);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
