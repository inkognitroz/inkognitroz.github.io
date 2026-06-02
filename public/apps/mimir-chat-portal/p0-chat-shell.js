(function(){
  window.__MimirP0SimpleChat=true;
  const API_URL='https://api.mmir.ai';
  const LOCAL_URL='http://127.0.0.1:3000';
  const CHAT_PATH='/v1/chat/completions';
  const TOKEN_KEY='mmir-p0-local-token';
  const HISTORY_KEY='mmir-p0-chat-history-v1';
  const HISTORY_SCHEMA_KEY='mmir-p0-chat-history-schema';
  const HISTORY_SCHEMA='20260602-explicit-route-tags-v17';
  const MODELS_KEY='mmir-p0-active-models-v1';
  const MAC_INSTALL_URL='./downloads/mmir-local-connector-install.html#terminal-install';
  const INSTALL_HELP_URL='./downloads/mmir-local-connector-install.html';
  const MAX_HISTORY=40;
  const ICON_SHIELD='<svg class="p0-icon p0-icon-shield" aria-hidden="true" viewBox="0 0 24 24"><path d="M12 3 19 6v5c0 5-3.1 8.2-7 10-3.9-1.8-7-5-7-10V6l7-3Z"></path><path d="m9.5 12 1.7 1.7 3.5-4"></path></svg>';
  const ICON_MIC='<svg class="p0-icon p0-icon-mic" aria-hidden="true" viewBox="0 0 24 24"><path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z"></path><path d="M19 11v1a7 7 0 0 1-14 0v-1"></path><path d="M12 19v3"></path><path d="M8 22h8"></path></svg>';
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
        tags:['Fast','Free','Best default'],
        score:100,
        model:'mmir-supergenius'
      }
    ],
    activeModelId:'mmir-supergenius',
    localChecked:false,
    localError:'',
    localHardware:null
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

  function routeReceipt(model=activeModel()){
    if(model.route==='local'){
      return {
        text:model.label+' · Private · This Mac',
        detail:'Local connector on 127.0.0.1. Pairing token stays in this browser session.',
        state:'local'
      };
    }
    return {
      text:'Supergenious · Free · api.mmir.ai',
      detail:'Hosted MMIR free route. No provider key is stored in the browser. No paid route started.',
      state:'hosted'
    };
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
      return 'Browser blocked access to this Mac. Allow Local Network Access for mmir.ai, then press Find local models again. The connector stays on 127.0.0.1.';
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
      .map(id=>{
        const profile=localModelProfile(id);
        return {
          id:'local:'+id,
          label:id,
          route:'local',
          detail:profile.detail,
          tags:profile.tags,
          quality:profile.quality,
          score:profile.score,
          model:id
        };
      })
      .sort((a,b)=>(b.score||0)-(a.score||0)||a.label.localeCompare(b.label));
  }

  function normalizeLocalHardware(payload){
    if(!payload||typeof payload!=='object')return null;
    const cpu=Number(payload.cpu_count||0);
    const memory=Number(payload.memory_gb||0);
    const tier=String(payload.memory_tier||'').trim();
    const recommended=String(payload.recommended_model||'').trim();
    const parts=[];
    if(cpu)parts.push(cpu+' CPU');
    if(memory)parts.push(memory+' GB RAM');
    if(tier)parts.push(tier+' fit');
    if(recommended)parts.push('best local: '+recommended);
    return parts.length?{
      summary:'This Mac · '+parts.join(' · '),
      recommended
    }:null;
  }

  function localModelDetail(id){
    return localModelProfile(id).detail;
  }

  function localModelProfile(id){
    const value=String(id||'').toLowerCase();
    if(/gemma3:270m/.test(value)){
      return {detail:'Fast private demo · best local starter · weak factual recall',tags:['Fast','Private','Local'],quality:'best-local-starter',score:82};
    }
    if(/llama3\.2:3b|qwen2\.5:3b|3b|4b/.test(value)){
      return {detail:'Private local model · stronger but slower',tags:['Private','Local','Stronger','Slow'],quality:'local-general',score:72};
    }
    if(/llama3\.2:1b|1b/.test(value)){
      return {detail:'Small private model · quick local tests',tags:['Private','Local','Small'],quality:'small',score:64};
    }
    if(/qwen2\.5:0\.5b|0\.5b|0\.6b/.test(value)){
      return {detail:'Tiny private model · slower/weak fallback',tags:['Private','Local','Weak'],quality:'weak-facts',score:45};
    }
    return {detail:'Private local model',tags:['Private','Local'],quality:'local-general',score:60};
  }

  function modelBadges(model){
    const tags=Array.isArray(model?.tags)?model.tags:[];
    return tags.slice(0,4).map(tag=>'<span class="p0-badge">'+safeText(tag)+'</span>').join('');
  }

  function modelChoiceBadges(model,bestLocal){
    const tags=[];
    if(model?.route==='hosted')tags.push('Best default');
    if(bestLocal&&model?.id===bestLocal.id)tags.push('Best local');
    if(model?.quality==='weak-facts')tags.push('Weak facts');
    if(model?.quality==='best-local-starter')tags.push('Starter');
    return tags
      .concat(Array.isArray(model?.tags)?model.tags:[])
      .filter((tag,index,list)=>tag&&list.indexOf(tag)===index)
      .slice(0,5)
      .map(tag=>'<span class="p0-badge">'+safeText(tag)+'</span>')
      .join('');
  }

  function bestLocalModel(){
    return state.models
      .filter(model=>model.route==='local')
      .sort((a,b)=>(b.score||0)-(a.score||0)||a.label.localeCompare(b.label))[0]||null;
  }

  function compareLocalModel(preferredLocalModel=null){
    if(preferredLocalModel)return preferredLocalModel;
    const best=bestLocalModel();
    if(best)return best;
    const active=activeModel();
    return active.route==='local'?active:null;
  }

  function formatDuration(ms){
    const value=Math.max(0,Number(ms)||0);
    if(value<1000)return Math.round(value)+'ms';
    return (value/1000).toFixed(value<10000?1:0)+'s';
  }

  function defaultHostedModel(){
    return state.models.find(model=>model.route==='hosted')||state.models[0];
  }

  function wantsCompareRoute(prompt){
    return /@compare|\b(compare|compare answers|side by side|both models|two models|sammenlign|begge modeller)\b/i.test(String(prompt||''));
  }

  function wantsPrivateRoute(prompt){
    return /\b(private|privacy|local|locally|offline|this mac|my mac|no cloud|privat|lokal|lokalt|denne macen|uten sky)\b/i.test(String(prompt||''));
  }

  function wantsPublicFactRoute(prompt){
    return /\b(current|today|now|latest|president|prime minister|minister|capital|population|weather|news|stock|price|law|regulation|election|who is|what is|when is|where is|hvem er|hva er|presidenten|statsminister)\b/i.test(String(prompt||''));
  }

  function cleanSmartPrompt(prompt){
    return String(prompt||'')
      .replace(/@compare/gi,'')
      .replace(/\s+/g,' ')
      .trim();
  }

  function routeReason(reason,prompt,model){
    if(model?.route==='local'&&wantsPublicFactRoute(prompt)){
      return 'Local-only: public facts may be outdated';
    }
    return reason||'';
  }

  function smartDecision(prompt){
    const local=bestLocalModel();
    const active=activeModel();
    if(local&&wantsCompareRoute(prompt)){
      return {mode:'compare',model:local,prompt:cleanSmartPrompt(prompt)||prompt};
    }
    if(active.route==='local'&&wantsPublicFactRoute(prompt)&&!wantsPrivateRoute(prompt)){
      return {mode:'single',model:defaultHostedModel(),reason:'Quality guard: public facts'};
    }
    if(local&&active.route==='hosted'&&wantsPrivateRoute(prompt)){
      return {mode:'single',model:local,reason:routeReason('Smart route: private local',prompt,local),prompt:cleanSmartPrompt(prompt)||prompt};
    }
    return {mode:'single',model:active,reason:routeReason('',prompt,active),prompt};
  }

  async function checkLocalModels({quiet=false}={}){
    try{
      allowLocalProbes('p0-find-local-models',60000);
      status('Checking local node...','loading');
      const token=await pairLocal();
      const health=await fetchJson(LOCAL_URL+'/health',{headers:localHeaders(token),timeoutMs:7000});
      if(!health||health.status==='offline')throw new Error('Local connector reports offline.');
      const models=normalizeLocalModels(await fetchJson(LOCAL_URL+'/v1/models',{headers:localHeaders(token),timeoutMs:10000}));
      let hardware=null;
      try{
        hardware=normalizeLocalHardware(await fetchJson(LOCAL_URL+'/hardware',{headers:localHeaders(token),timeoutMs:7000}));
      }catch(error){
        hardware=null;
      }
      const hosted=state.models.filter(model=>model.route==='hosted');
      state.models=hosted.concat(models);
      state.localHardware=hardware;
      state.localChecked=true;
      state.localError='';
      writeJson(MODELS_KEY,state.models);
      if(models.length&&!state.models.some(model=>model.id===state.activeModelId)){
        state.activeModelId=models[0].id;
      }
      renderModelMenu();
      renderToolbar();
      status(models.length?'Local node connected: '+models.length+' model'+(models.length===1?'':'s')+(hardware?' · '+hardware.summary:'')+'.':'Local node connected, but no local models were reported.',models.length?'ready':'idle');
      return models;
    }catch(error){
      state.localChecked=true;
      state.localError=localNetworkHint(error);
      state.localHardware=null;
      state.models=state.models.filter(model=>model.route!=='local');
      if(!state.models.some(model=>model.id===state.activeModelId))state.activeModelId='mmir-supergenius';
      renderModelMenu();
      renderToolbar();
      if(!quiet){
        status(state.localError,'error');
        routeStatus('Local access blocked · Allow Local Network Access, then Find local models','error');
      }
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
          '<div id="p0-route" class="p0-route" data-state="hosted">Supergenious · Free · api.mmir.ai</div>'+
          '<div class="p0-toolbar">'+
            '<div class="p0-left">'+
              '<button id="p0-add" class="p0-btn p0-btn-icon" type="button" aria-label="Add or connect model" aria-expanded="false">+</button>'+
              '<button id="p0-privacy" class="p0-btn p0-btn-icon p0-shield" type="button" aria-label="Security and privacy status" title="Security and privacy">'+ICON_SHIELD+'</button>'+
            '</div>'+
            '<div class="p0-right">'+
              '<button id="p0-model" class="p0-model-button" type="button" aria-label="Choose model" aria-expanded="false"><span class="p0-model-name">Supergenious</span><span class="p0-chevron" aria-hidden="true"></span></button>'+
              '<button id="p0-mic" class="p0-btn p0-btn-icon p0-mic" type="button" aria-label="Voice input" title="Voice input">'+ICON_MIC+'</button>'+
              '<button id="p0-send" class="p0-btn p0-btn-icon p0-send" type="submit" aria-label="Send message">↑</button>'+
            '</div>'+
          '</div>'+
        '</form>'+
      '</footer>'+
      '<div id="p0-add-menu" class="p0-menu" hidden></div>'+
      '<div id="p0-model-menu" class="p0-menu" hidden></div>'+
      '<div id="p0-privacy-menu" class="p0-menu" hidden></div>';
    document.body.appendChild(app);
    document.body.classList.remove('mimir-p0-ready');
    document.body.classList.add('mmir-p0-ready');
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
      const actionButton=event.target.closest('[data-p0-action]');
      if(actionButton&&actionButton.closest('.p0-menu')){
        event.preventDefault();
        event.stopPropagation();
        handleMenuAction(actionButton.getAttribute('data-p0-action'));
        return;
      }
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
    const restoreRouteLater=(delay=1800)=>setTimeout(()=>renderToolbar(),delay);
    if(!speechSupported()){
      status('Voice input is not available in this browser.','error');
      routeStatus('Voice input is not available in this browser.','error');
      restoreRouteLater(2200);
      return;
    }
    const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
    const recognition=new Recognition();
    recognition.lang=document.documentElement.lang||navigator.language||'en-US';
    recognition.interimResults=false;
    recognition.maxAlternatives=1;
    let heardVoice=false;
    status('Listening...','ready');
    routeStatus('Listening...','hosted');
    recognition.onstart=()=>{
      status('Listening...','ready');
      routeStatus('Listening...','hosted');
    };
    recognition.onerror=()=>{
      status('Voice input failed or was cancelled.','error');
      routeStatus('Voice input failed or was cancelled.','error');
      restoreRouteLater(2200);
    };
    recognition.onend=()=>{
      if(!heardVoice){
        status('Voice input stopped.','idle');
        routeStatus('Voice input stopped.','hosted');
        restoreRouteLater();
      }
    };
    recognition.onresult=(event)=>{
      const text=String(event.results?.[0]?.[0]?.transcript||'').trim();
      const input=document.getElementById('p0-input');
      if(text&&input){
        heardVoice=true;
        input.value=(input.value?input.value+' ':'')+text;
        autosizeInput();
        input.focus();
        status('Voice text added.','ready');
        routeStatus('Voice text added.','hosted');
        restoreRouteLater();
      }
    };
    try{
      recognition.start();
    }catch(error){
      status('Voice input failed or was cancelled.','error');
      routeStatus('Voice input failed or was cancelled.','error');
      restoreRouteLater(2200);
    }
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
    const compareModel=bestLocalModel();
    const compareAction=compareModel?(
      '<button class="p0-featured-action" type="button" data-p0-action="compare-live"><span class="p0-menu-row"><strong>Compare answers</strong><span class="p0-badge">2 routes</span><span class="p0-badge">Side by side</span></span><small>Supergenious + '+safeText(compareModel.label)+' on the same prompt.</small></button><div class="p0-menu-separator"></div>'
    ):'';
    menu.innerHTML=''+
      '<div class="p0-menu-title">Tools</div>'+
      compareAction+
      '<a href="'+MAC_INSTALL_URL+'"><strong>Connect local model</strong><small>Open the Mac install command that avoids the blocked .command warning. MMIR returns here and finds models automatically.</small></a>'+
      '<button type="button" data-p0-action="check-local"><strong>Find local models</strong><small>If the browser asks, allow Local Network Access for mmir.ai.</small></button>'+
      '<a href="'+INSTALL_HELP_URL+'"><strong>Install help</strong><small>Open the guided installer page if the download is blocked.</small></a>'+
      '<div class="p0-menu-separator"></div>'+
      '<button type="button" data-p0-action="new-chat"><strong>New chat</strong><small>Clear this browser chat only.</small></button>';
  }

  function renderModelMenu(){
    const menu=menuEl('model');
    if(!menu)return;
    const local=bestLocalModel();
    const smartHint=local?(
      '<div class="p0-routing-hint"><span class="p0-menu-row"><strong>Smart routing</strong><span class="p0-badge">Auto</span></span><small>Public facts use Supergenious. Private/local prompts use '+safeText(local.label)+'. Compare prompts use two routes.</small></div>'
    ):(
      '<div class="p0-routing-hint"><span class="p0-menu-row"><strong>Smart routing</strong><span class="p0-badge">Ready</span></span><small>Supergenious is the default. Connect local models to add private routing.</small></div>'
    );
    const capacityHint=local&&state.localHardware?(
      '<div class="p0-routing-hint p0-capacity-hint"><span class="p0-menu-row"><strong>Local capacity</strong><span class="p0-badge">Live</span></span><small>'+safeText(state.localHardware.summary)+'</small></div>'
    ):'';
    const hostedModels=state.models.filter(model=>model.route==='hosted').sort((a,b)=>(b.score||0)-(a.score||0)||a.label.localeCompare(b.label));
    const localModels=state.models.filter(model=>model.route==='local').sort((a,b)=>(b.score||0)-(a.score||0)||a.label.localeCompare(b.label));
    const renderButtons=(models)=>models.map(model=>{
      const selected=model.id===state.activeModelId?'Selected':'';
      return '<button type="button" data-model-id="'+safeText(model.id)+'"><span class="p0-menu-row"><strong>'+safeText(model.label)+'</strong>'+modelChoiceBadges(model,local)+'</span><small>'+safeText([selected,model.detail].filter(Boolean).join(' · '))+'</small></button>';
    }).join('');
    const buttons=''+
      '<div class="p0-menu-section">Recommended</div>'+renderButtons(hostedModels)+
      (localModels.length?'<div class="p0-menu-section">Private local models</div>'+renderButtons(localModels):'');
    const localHint=state.models.some(model=>model.route==='local')?'':
      '<div class="p0-menu-separator"></div><button type="button" data-p0-action="check-local"><strong>Find local models</strong><small>If the browser asks, allow Local Network Access for mmir.ai.</small></button>';
    menu.innerHTML='<div class="p0-menu-title">Models</div>'+smartHint+capacityHint+'<div class="p0-menu-separator"></div>'+buttons+localHint;
    menu.querySelectorAll('[data-model-id]').forEach(button=>{
      button.addEventListener('click',()=>{
        state.activeModelId=button.getAttribute('data-model-id');
        closeMenus();
        renderToolbar();
        status(activeModel().label+' selected.','ready');
      });
    });
  }

  function renderPrivacyMenu(){
    const model=activeModel();
    const menu=menuEl('privacy');
    const route=model.route==='local'?'Private local model':'Supergenious hosted route';
    const secret=model.route==='local'?'This browser talks only to the paired connector on this device.':'No provider key is stored in the browser.';
    const receipt=routeReceipt(model);
    menu.innerHTML=''+
      '<div class="p0-menu-title">Privacy</div>'+
      '<button type="button"><strong>'+safeText(route)+'</strong><small>'+safeText(secret)+'</small></button>'+
      '<button type="button"><strong>Route receipt</strong><small>'+safeText(receipt.text)+' · '+safeText(receipt.detail)+'</small></button>'+
      '<button type="button"><strong>No paid route started</strong><small>MMIR uses free routes here unless a protected backend is added later.</small></button>';
  }

  function renderToolbar(){
    const model=activeModel();
    const label=document.querySelector('#p0-model .p0-model-name');
    const input=document.getElementById('p0-input');
    if(label)label.textContent=model.label;
    if(input)input.placeholder='Message '+model.label+'...';
    routeStatus(routeReceipt(model).text,routeReceipt(model).state);
  }

  function handleMenuAction(action){
    if(action==='check-local'){
      status('Checking local node...','loading');
      routeStatus('Checking this Mac for local models...','hosted');
      closeMenus();
      checkLocalModels().catch(()=>{});
      return true;
    }
    if(action==='compare-live'){
      closeMenus();
      compareLiveRoutes();
      return true;
    }
    if(action==='new-chat'){
      closeMenus();
      clearChat();
      return true;
    }
    return false;
  }

  function renderTranscript(){
    const root=document.getElementById('p0-transcript');
    if(!root)return;
    if(!state.messages.length){
      root.innerHTML='<div class="p0-empty"><h1>Ask anything.</h1><p>Supergenious answers now. Use + later when you want private local models.</p></div>';
      return;
    }
    root.innerHTML=state.messages.map(message=>(
      '<article class="p0-message p0-message-'+safeText(message.role)+(message.variant?' p0-message-'+safeText(message.variant):'')+'">'+
        '<div class="p0-message-label">'+safeText(message.label||message.role)+'</div>'+
        (message.receipt?'<div class="p0-message-receipt">'+safeText(message.receipt)+'</div>':'')+
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

  function routeStatus(message,stateValue='hosted'){
    const el=document.getElementById('p0-route');
    if(!el)return;
    el.textContent=message||routeReceipt().text;
    el.dataset.state=stateValue;
  }

  function saveHistory(){
    try{localStorage.setItem(HISTORY_SCHEMA_KEY,HISTORY_SCHEMA);}catch(error){}
    writeJson(HISTORY_KEY,state.messages.slice(-MAX_HISTORY));
  }

  function append(role,content,label,receipt,meta={}){
    const message={role,content:String(content||''),label:label||role,receipt:receipt||'',variant:meta.variant||'',createdAt:new Date().toISOString()};
    state.messages.push(message);
    state.messages=state.messages.slice(-MAX_HISTORY);
    saveHistory();
    renderTranscript();
    return message;
  }

  function updateMessage(message,content,updates={}){
    message.content=String(content||'');
    Object.assign(message,updates);
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
    const factGuard=wantsPublicFactRoute(prompt)?
      ' Current or public factual questions may be stale in local models; say that you may be outdated instead of guessing if you are not certain.':'';
    return {
      model:model.model,
      messages:[
        {role:'system',content:'You are connected through MMIR Local Connector. Answer directly and concisely.'+factGuard},
        {role:'user',content:prompt}
      ],
      stream:false,
      temperature:0.7,
      max_tokens:900
    };
  }

  function localMentionModel(prompt){
    const text=String(prompt||'').toLowerCase();
    const localModels=state.models.filter(model=>model.route==='local');
    if(!localModels.length)return null;
    const wantsGemma=/@gemma|@gemma3/i.test(text);
    const wantsQwen=/@qwen/i.test(text);
    const wantsLlama=/@llama/i.test(text);
    if(wantsGemma)return localModels.find(model=>/gemma/i.test(model.model))||localModels[0];
    if(wantsQwen)return localModels.find(model=>/qwen/i.test(model.model))||localModels[0];
    if(wantsLlama)return localModels.find(model=>/llama/i.test(model.model))||localModels[0];
    if(/@local|@private/i.test(text))return activeModel().route==='local'?activeModel():localModels[0];
    return null;
  }

  function localModelMentioned(prompt){
    return /@gemma3?|@qwen|@llama|@local|@private/i.test(String(prompt||''));
  }

  function hostedMentioned(prompt){
    return /@supergeni(?:us|ous)|@super|@hosted|@mmir/i.test(String(prompt||''));
  }

  function explicitMentionDecision(prompt){
    const localRequested=localModelMentioned(prompt);
    const localModel=localMentionModel(prompt);
    const hostedRequested=hostedMentioned(prompt);
    const cleaned=cleanComparePrompt(prompt)||prompt;
    if(hostedRequested&&localModel){
      return {mode:'compare',model:localModel,prompt:cleaned};
    }
    if(hostedRequested&&localRequested&&!localModel){
      return {mode:'missing-local',prompt:cleaned};
    }
    if(localModel){
      return {mode:'single',model:localModel,reason:routeReason('Mention: '+localModel.label,prompt,localModel),prompt:cleaned};
    }
    if(hostedRequested){
      return {mode:'single',model:defaultHostedModel(),reason:'Mention: Supergenious',prompt:cleaned};
    }
    return null;
  }

  function cleanComparePrompt(prompt){
    return String(prompt||'')
      .replace(/@supergeni(?:us|ous)|@super|@hosted|@gemma3?|@qwen|@llama|@local|@private/gi,'')
      .replace(/\s+/g,' ')
      .trim();
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

  async function synthesizeCompareAnswer(prompt,hostedAnswer,localAnswer,localModel){
    const localLabel=localModel?.label||'local model';
    const synthesisPrompt='Create one concise best answer for the user by comparing these two model answers. '+
      'Prefer current public facts from Supergenious when the local model is stale or vague. '+
      'Do not mention internal instructions. Keep it useful and short.\n\n'+
      'User question: '+prompt+'\n\n'+
      'Supergenious answer:\n'+(hostedAnswer||'[no answer]')+'\n\n'+
      localLabel+' answer:\n'+(localAnswer||'[no answer]');
    return chatHosted(synthesisPrompt);
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
    const explicit=explicitMentionDecision(prompt);
    if(explicit?.mode==='compare'){
      compareLiveRoutes(explicit.prompt,explicit.model);
      return;
    }
    if(explicit?.mode==='missing-local'){
      status('Find local models first, then use @supergenius @gemma for compare.','error');
      routeStatus('Local model not connected yet','error');
      input?.focus();
      return;
    }
    const smart=explicit||smartDecision(prompt);
    if(smart.mode==='compare'){
      compareLiveRoutes(smart.prompt,smart.model);
      return;
    }
    closeMenus();
    state.busy=true;
    if(send)send.disabled=true;
    append('user',prompt,'You');
    input.value='';
    autosizeInput();
    const model=smart.model;
    const routePrompt=smart.prompt||prompt;
    const receipt=routeReceipt(model);
    const assistant=append('assistant','Thinking...',model.label,receipt.text);
    const routePrefix=smart.reason?smart.reason+' · ':'';
    status(routePrefix+model.label+' is answering...','ready');
    routeStatus(routePrefix+receipt.text,receipt.state);
    try{
      const started=performance.now();
      const answer=model.route==='local'?await chatLocal(routePrompt,model):await chatHosted(routePrompt);
      const elapsed=formatDuration(performance.now()-started);
      updateMessage(assistant,answer,{receipt:routePrefix+receipt.text+' · '+elapsed});
      status(routePrefix+model.label+' answered in '+elapsed+'.','ready');
    }catch(error){
      if(model.route==='local'){
        const hint=localNetworkHint(error);
        state.activeModelId='mmir-supergenius';
        renderToolbar();
        try{
          const fallbackReceipt=routeReceipt(activeModel());
          const fallbackStarted=performance.now();
          const fallbackAnswer=await chatHosted(routePrompt);
          const fallbackElapsed=formatDuration(performance.now()-fallbackStarted);
          updateMessage(
            assistant,
            fallbackAnswer+'\n\nLocal model note: '+hint,
            {label:activeModel().label,receipt:fallbackReceipt.text+' · Local fallback · '+fallbackElapsed}
          );
          status('Supergenious answered in '+fallbackElapsed+' while local access waits for permission.','ready');
          routeStatus(fallbackReceipt.text,fallbackReceipt.state);
        }catch(fallbackError){
          updateMessage(assistant,hint+'\n\nSupergenious is still available from the model picker.');
          status('Chat failed: local node blocked/unavailable','error');
        }
      }else{
        updateMessage(assistant,'I could not reach api.mmir.ai from this browser right now. Please refresh and try again.');
        status('Chat failed: api.mmir.ai unreachable','error');
      }
    }finally{
      state.busy=false;
      if(send)send.disabled=false;
      input?.focus();
    }
  }

  async function compareLiveRoutes(comparePrompt='',preferredLocalModel=null){
    if(state.busy)return;
    const localModel=compareLocalModel(preferredLocalModel);
    const input=document.getElementById('p0-input');
    const send=document.getElementById('p0-send');
    const prompt=String(comparePrompt||input?.value||'').trim();
    if(!localModel){
      status('Find local models first, then Compare routes.','error');
      input?.focus();
      return;
    }
    if(!prompt){
      status('Write a prompt first, then Compare routes.','error');
      input?.focus();
      return;
    }
    state.busy=true;
    if(send)send.disabled=true;
    append('user',prompt,'You');
    input.value='';
    autosizeInput();
    const hostedModel=defaultHostedModel();
    const hostedReceipt=routeReceipt(hostedModel);
    const localReceipt=routeReceipt(localModel);
    const localQualityNote=wantsPublicFactRoute(prompt)?' · Local facts may be stale':'';
    const hostedMessage=append('assistant','Thinking...',hostedModel.label+' · Compare',hostedReceipt.text+' · Compare answer 1/2',{variant:'compare'});
    const localMessage=append('assistant','Thinking...',localModel.label+' · Compare',localReceipt.text+' · Compare answer 2/2'+localQualityNote,{variant:'compare'});
    let hostedAnswerText='';
    let localAnswerText='';
    status('Comparing Supergenious and '+localModel.label+'...','ready');
    routeStatus('Compare · Supergenious + '+localModel.label,'ready');
    const hostedStarted=performance.now();
    const hostedJob=chatHosted(prompt)
      .then(answer=>{
        hostedAnswerText=answer||'Supergenious returned an empty response.';
        updateMessage(hostedMessage,hostedAnswerText,{receipt:hostedReceipt.text+' · Compare answer 1/2 · '+formatDuration(performance.now()-hostedStarted)});
      })
      .catch(()=>updateMessage(hostedMessage,'Supergenious did not answer this compare request. Try normal chat or refresh.',{receipt:hostedReceipt.text+' · Compare answer 1/2 · failed'}));
    const localStarted=performance.now();
    const localJob=chatLocal(prompt,localModel)
      .then(answer=>{
        localAnswerText=answer||'Local model returned an empty response.';
        updateMessage(localMessage,localAnswerText,{receipt:localReceipt.text+' · Compare answer 2/2'+localQualityNote+' · '+formatDuration(performance.now()-localStarted)});
      })
      .catch(error=>updateMessage(localMessage,localNetworkHint(error),{receipt:localReceipt.text+' · Compare answer 2/2'+localQualityNote+' · failed'}));
    await Promise.allSettled([hostedJob,localJob]);
    if(hostedAnswerText||localAnswerText){
      const synthesisReceipt=hostedReceipt.text+' · Best answer synthesis · No paid route';
      const synthesisMessage=append('assistant','Synthesizing best answer...','Supergenious · Best answer',synthesisReceipt,{variant:'compare'});
      const synthesisStarted=performance.now();
      try{
        const synthesis=await synthesizeCompareAnswer(prompt,hostedAnswerText,localAnswerText,localModel);
        updateMessage(synthesisMessage,synthesis||hostedAnswerText||localAnswerText,{receipt:synthesisReceipt+' · '+formatDuration(performance.now()-synthesisStarted)});
      }catch(error){
        updateMessage(synthesisMessage,hostedAnswerText||localAnswerText||'Compare finished, but synthesis did not answer.',{receipt:synthesisReceipt+' · failed'});
      }
    }
    status('Compare finished: Supergenious + '+localModel.label+'.','ready');
    state.busy=false;
    if(send)send.disabled=false;
    input?.focus();
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
