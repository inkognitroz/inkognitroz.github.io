(function(){
  window.__MimirP0SimpleChat=true;
  const PROD_API_URL='https://api.mmir.ai';
  const STAGING_API_URL='https://api-staging.mmir.ai';
  const API_URL=apiUrlForCurrentHost();
  const API_LABEL=apiHostLabel(API_URL);
  const LOCAL_URL='http://127.0.0.1:3000';
  const CHAT_PATH='/v1/chat/completions';
  const ROUTE_SCORE_PATH='/routing/score';
  const TOKEN_KEY='mmir-p0-local-token';
  const HISTORY_KEY='mmir-p0-chat-history-v1';
  const HISTORY_SCHEMA_KEY='mmir-p0-chat-history-schema';
  const HISTORY_SCHEMA='20260603-clean-first-chat-v40';
  const MODELS_KEY='mmir-p0-active-models-v1';
  const MAC_LINUX_INSTALL_COMMAND='curl -fsSL https://mmir.ai/downloads/mmir-local-node-macos-linux.sh | bash';
  const WINDOWS_INSTALL_COMMAND='powershell -NoProfile -ExecutionPolicy Bypass -Command "$i=Join-Path $env:TEMP \'mmir-local-node-windows.ps1\'; Invoke-WebRequest \'https://mmir.ai/downloads/mmir-local-node-windows.ps1\' -OutFile $i -UseBasicParsing; powershell -NoProfile -ExecutionPolicy Bypass -File $i"';
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

  function apiUrlForCurrentHost(){
    try{
      return String(location.hostname||'').toLowerCase()==='staging.mmir.ai'?STAGING_API_URL:PROD_API_URL;
    }catch(error){
      return PROD_API_URL;
    }
  }

  function apiHostLabel(url){
    try{
      return new URL(url).host;
    }catch(error){
      return 'api.mmir.ai';
    }
  }

  function hostedRouteLabel(){
    return 'Supergenious · Free · '+API_LABEL;
  }

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
        model:'mmir-supergenius',
        executable:true,
        routeState:'managed_provider_available',
        routeType:'managed_provider',
        availability:'available',
        costState:'free'
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
    const clean=raw
      .filter(validMessage)
      .filter(message=>!staleFailureMessage(message))
      .filter(message=>!transientInstallMessage(message))
      .slice(-MAX_HISTORY);
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

  function transientInstallMessage(message){
    return Boolean(message?.command||message?.showOsChoices||message?.variant==='install');
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

  function safeAttr(value){
    return safeText(value);
  }

  function paragraphs(text){
    return String(text||'')
      .split(/\n{2,}/)
      .map(part=>part.trim())
      .filter(Boolean)
      .map(part=>'<p>'+safeText(part)+'</p>')
      .join('')||'<p></p>';
  }

  function detectInstallOs(){
    const platform=String(navigator.userAgentData?.platform||navigator.platform||'').toLowerCase();
    const agent=String(navigator.userAgent||'').toLowerCase();
    const probe=platform+' '+agent;
    if(/iphone|ipad|android|mobile/.test(probe))return 'mobile';
    if(/mac|darwin/.test(probe))return 'mac';
    if(/win/.test(probe))return 'windows';
    if(/linux|x11|ubuntu|debian|raspbian|arm/.test(probe))return 'linux';
    return 'unknown';
  }

  function localInstallCommand(os){
    if(os==='windows')return WINDOWS_INSTALL_COMMAND;
    if(os==='mac'||os==='linux')return MAC_LINUX_INSTALL_COMMAND;
    return '';
  }

  function localInstallIntro(os){
    if(os==='mac'){
      return 'I detected macOS. Do you have a Mac computer? Copy and paste this in Terminal to connect a local node. It installs MMIR Local Connector, downloads a small starter model when needed, and keeps the node on 127.0.0.1.';
    }
    if(os==='linux'){
      return 'I detected Linux. Copy and paste this in the terminal on the computer that will host your local model. It installs MMIR Local Connector and keeps the node private on localhost.';
    }
    if(os==='windows'){
      return 'I detected Windows. Copy and paste this in PowerShell on the PC that will host your local model. It installs MMIR Local Connector and keeps the node private on localhost.';
    }
    return 'Which computer will host your local model? Choose Mac, Windows or Linux, and I will give you the exact command here in chat.';
  }

  function startLocalInstallAssistant(forcedOs=''){
    closeMenus();
    const detected=forcedOs||detectInstallOs();
    const os=['mac','windows','linux'].includes(detected)?detected:'unknown';
    const command=localInstallCommand(os);
    if(command){
      append(
        'assistant',
        localInstallIntro(os)+'\n\nAfter it says "MMIR Local Connector is ready", return here and press + -> Find local models. If the browser asks, allow Local Network Access for mmir.ai.',
        'Supergenious',
        'Local connector setup · no paid route',
        {
          variant:'install',
          command,
          commandLabel:'Copy command',
          installOs:os
        }
      );
      status('Local connector command ready.','ready');
      routeStatus('Copy install command · local setup','hosted');
      return;
    }
    append(
      'assistant',
      localInstallIntro(detected),
      'Supergenious',
      'Local connector setup · no paid route',
      {
        variant:'install',
        showOsChoices:true
      }
    );
    status('Choose host OS for local model.','ready');
    routeStatus('Local connector setup · choose OS','hosted');
  }

  function selectCommandText(trigger){
    const code=trigger?.closest?.('.p0-command-card')?.querySelector?.('code');
    if(!code)return false;
    const selection=window.getSelection();
    const range=document.createRange();
    range.selectNodeContents(code);
    selection.removeAllRanges();
    selection.addRange(range);
    return true;
  }

  async function copyCommand(command,trigger=null){
    if(!command){
      status('No command found to copy.','error');
      return;
    }
    try{
      await navigator.clipboard.writeText(command);
      status('Command copied. Paste it into Terminal or PowerShell.','ready');
    }catch(error){
      const textarea=document.createElement('textarea');
      textarea.value=command;
      textarea.setAttribute('readonly','');
      textarea.style.position='fixed';
      textarea.style.left='-9999px';
      textarea.style.top='0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      try{
        const copied=document.execCommand('copy');
        if(copied){
          status('Command copied. Paste it into Terminal or PowerShell.','ready');
        }else if(selectCommandText(trigger)){
          status('Command selected. Press Cmd+C, then paste it into Terminal or PowerShell.','ready');
        }else{
          status('Copy failed. Select the command manually.','error');
        }
      }catch(fallbackError){
        if(selectCommandText(trigger)){
          status('Command selected. Press Cmd+C, then paste it into Terminal or PowerShell.','ready');
        }else{
          status('Copy failed. Select the command manually.','error');
        }
      }finally{
        textarea.remove();
      }
    }
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
      text:hostedRouteLabel(),
      detail:'Hosted MMIR free route. No provider key is stored in the browser. No paid route started.',
      state:'hosted'
    };
  }

  function routeDisplayName(model){
    return String(model?.display_name||model?.name||model?.label||model?.id||'Supergenious').trim();
  }

  function executableHostedModel(model){
    const routeState=String(model?.route_state||'managed_provider_available');
    const availability=String(model?.availability||model?.status||'available').toLowerCase();
    const blockedStates=['cost_denied','route_not_executable','provider_disabled_missing_key','node_stale'];
    if(model?.executable===false)return false;
    if(blockedStates.includes(routeState))return false;
    if(['blocked','disabled','offline','unavailable'].includes(availability))return false;
    return true;
  }

  function normalizeHostedModels(payload){
    const raw=Array.isArray(payload?.data)?payload.data:Array.isArray(payload?.models)?payload.models:[];
    return raw
      .filter(executableHostedModel)
      .filter(model=>String(model?.id||model?.model||'').trim())
      .slice(0,4)
      .map((model,index)=>({
        id:String(model.id||model.model).trim(),
        label:routeDisplayName(model),
        route:'hosted',
        detail:model.availability==='available'?'Ready now':(model.route_state||'Ready'),
        tags:index===0?['Fast','Free','Best default']:['Free','Hosted'],
        score:model.recommended?100:(90-index),
        model:String(model.id||model.model).trim(),
        executable:model.executable!==false,
        routeState:model.route_state||'managed_provider_available',
        routeType:model.route_type||'managed_provider',
        availability:model.availability||'available',
        costState:model.cost_state||model.cost_class||'free',
        nextAction:model.next_action||null
      }));
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

  async function refreshHostedModels(){
    try{
      const models=normalizeHostedModels(await fetchJson(API_URL+'/v1/models',{timeoutMs:9000}));
      if(!models.length)return;
      const activeLocal=state.models.find(model=>model.id===state.activeModelId&&model.route==='local');
      state.models=models.concat(state.models.filter(model=>model.route==='local'));
      if(!activeLocal&&!state.models.some(model=>model.id===state.activeModelId))state.activeModelId=models[0].id;
      writeJson(MODELS_KEY,state.models);
      renderToolbar();
      window.dispatchEvent(new CustomEvent('mmir-p0-hosted-models-refreshed',{detail:{status:'ready',models}}));
    }catch(error){
      window.dispatchEvent(new CustomEvent('mmir-p0-hosted-models-refreshed',{detail:{status:'deferred',models:[]}}));
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

  function localReadinessSummary(models,hardware){
    const count=Array.isArray(models)?models.length:0;
    if(!count)return 'Local node connected, but no local models were reported.';
    return 'Private local ready: '+count+' model'+(count===1?'':'s')+(hardware?' · '+hardware.summary:'')+'.';
  }

  function emitLocalReadiness(models,hardware){
    const count=Array.isArray(models)?models.length:0;
    const detail={
      status:count?'ready':'online',
      health:count?'ready':'online',
      url:LOCAL_URL,
      models:(models||[]).map(model=>({id:model.model||model.label||model.id,name:model.label||model.model||model.id})),
      hardware_summary:hardware?.summary||'',
      readiness:{
        paired:true,
        models_available:count>0,
        model_count:count,
        runtime_chat_ready:count>0,
        chat_ready:count>0,
        model_metadata_visible:true
      },
      no_paid_routes_started:true
    };
    window.dispatchEvent(new CustomEvent('mmir-local-private-readiness-updated',{detail}));
    window.dispatchEvent(new CustomEvent('mmir-local-connector-refreshed',{detail}));
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

  function clampScore(value){
    return Math.max(0,Math.min(100,Math.round(Number(value)||0)));
  }

  function routeScore(model,prompt,answer,elapsedMs,failed=false){
    const route=model?.route||'hosted';
    const text=String(answer||'').trim();
    const publicFact=wantsPublicFactRoute(prompt);
    const privateIntent=wantsPrivateRoute(prompt);
    const reasons=[];
    let score=50;
    if(failed||!text){
      return {score:0,elapsedMs,reason:'no answer',reasons:['no answer']};
    }
    if(text.length>24){
      score+=8;
      reasons.push('complete answer');
    }else{
      score-=8;
      reasons.push('thin answer');
    }
    if(route==='hosted'){
      score+=16;
      reasons.push('default route');
      if(publicFact){
        score+=22;
        reasons.push('public facts');
      }
      if(privateIntent){
        score-=8;
        reasons.push('not private');
      }
    }else{
      score+=12;
      reasons.push('private local');
      if(privateIntent){
        score+=24;
        reasons.push('privacy fit');
      }
      if(publicFact){
        score-=18;
        reasons.push('local facts may be stale');
      }
      if(model?.quality==='best-local-starter')score+=8;
      if(model?.quality==='local-general')score+=5;
      if(model?.quality==='small')score-=4;
      if(model?.quality==='weak-facts')score-=16;
    }
    if(elapsedMs<700){
      score+=10;
      reasons.push('fast');
    }else if(elapsedMs<2000){
      score+=7;
      reasons.push('responsive');
    }else if(elapsedMs<6000){
      score+=3;
      reasons.push('acceptable latency');
    }else{
      score-=7;
      reasons.push('slow');
    }
    return {score:clampScore(score),elapsedMs,reason:reasons.slice(0,3).join(' · '),reasons};
  }

  function scoreSummary(score){
    if(!score)return 'Score pending';
    const prefix=score.source==='api'?'API score ':'Score ';
    return prefix+score.score+' · '+formatDuration(score.elapsedMs)+' · '+score.reason;
  }

  function compactReceipt(receipt){
    const full=String(receipt||'').trim();
    const parts=full.split('·').map(part=>part.trim()).filter(Boolean);
    if(parts.length<=4)return full;
    const winner=parts.find(part=>/^Winner:/i.test(part));
    const score=parts.find(part=>/^(API score|Score)\s+\d+/i.test(part));
    const timing=[...parts].reverse().find(part=>/^\d+(?:\.\d+)?(?:ms|s)$/i.test(part));
    const noPaid=parts.find(part=>/No paid route/i.test(part));
    const compare=parts.find(part=>/^Compare answer \d\/\d/i.test(part));
    if(parts.some(part=>/Best answer synthesis/i.test(part))){
      return ['Best answer',winner,score,timing,noPaid].filter(Boolean).join(' · ');
    }
    if(compare){
      return [compare.replace('Compare answer','Compare'),score,timing,parts[0]].filter(Boolean).join(' · ');
    }
    return [parts.slice(0,3).join(' · '),score,timing].filter(Boolean).join(' · ');
  }

  function renderReceipt(receipt){
    const full=String(receipt||'').trim();
    if(!full)return '';
    const compact=compactReceipt(full);
    if(compact===full){
      return '<div class="p0-message-receipt">'+safeText(full)+'</div>';
    }
    return '<details class="p0-message-receipt" title="'+safeAttr(full)+'">'+
      '<summary>'+safeText(compact)+'</summary>'+
      '<div class="p0-receipt-full">'+safeText(full)+'</div>'+
    '</details>';
  }

  function winningRoute(hostedModel,hostedScore,localModel,localScore){
    const hostedValue=hostedScore?.score??0;
    const localValue=localScore?.score??0;
    if(localValue>hostedValue){
      return {model:localModel,score:localScore,loser:hostedScore,summary:'Winner: '+localModel.label+' · Score '+localValue+' · '+localScore.reason};
    }
    return {model:hostedModel,score:hostedScore,loser:localScore,summary:'Winner: '+hostedModel.label+' · Score '+hostedValue+' · '+(hostedScore?.reason||'default route')};
  }

  function routeScoreCandidate(model,answer,elapsedMs,failed=false){
    const isLocal=model?.route==='local';
    return {
      id:isLocal?'local/'+(model.model||model.id):'browser-guide/free',
      route_id:isLocal?'local/'+(model.model||model.id):'browser-guide/free',
      route_class:isLocal?'local':'free',
      cost_class:isLocal?'free-local':'free',
      node_id:isLocal?'local-node':'browser-guide',
      node_display_name:isLocal?'This Mac':'Supergenious',
      model_id:isLocal?(model.model||model.id):'mmir-supergenius',
      model_display_name:model?.label||model?.model||'Supergenious',
      trust_level:isLocal?'operator-local':'public-free',
      provider:isLocal?'local-ollama':'mmir',
      quality:model?.quality||'',
      answer:String(answer||'').slice(0,8000),
      latency_ms:Math.max(0,Math.round(Number(elapsedMs)||0)),
      failed:Boolean(failed)
    };
  }

  function apiScoreForModel(scoring,model,fallback){
    const isLocal=model?.route==='local';
    const modelId=isLocal?(model.model||model.id):'mmir-supergenius';
    const found=(Array.isArray(scoring?.scores)?scoring.scores:[]).find(score=>
      String(score?.model_id||'')===String(modelId) ||
      (isLocal&&String(score?.route_class||'')==='local') ||
      (!isLocal&&String(score?.node_id||'')==='browser-guide')
    );
    if(!found)return fallback;
    const reasons=Array.isArray(found.reasons)?found.reasons:[];
    return {
      score:clampScore(found.score),
      elapsedMs:Number(found.latency_ms)||fallback?.elapsedMs||0,
      reason:reasons.slice(0,3).join(' · ')||found.summary||fallback?.reason||'api route policy',
      reasons,
      source:'api'
    };
  }

  function apiWinner(scoring,hostedModel,hostedScore,localModel,localScore){
    const winner=scoring?.winner;
    if(!winner)return winningRoute(hostedModel,hostedScore,localModel,localScore);
    const localId=String(localModel?.model||localModel?.id||'');
    const winnerModelId=String(winner.model_id||'');
    const isLocal=winner.route_class==='local'||winnerModelId===localId;
    const model=isLocal?localModel:hostedModel;
    const score=isLocal?localScore:hostedScore;
    const loser=isLocal?hostedScore:localScore;
    return {
      model,
      score,
      loser,
      summary:'Winner: '+model.label+' · API score '+(score?.score??winner.score??0)+' · '+(score?.reason||winner.reason||'api route policy')
    };
  }

  async function scoreRoutesWithApi(prompt,hostedModel,hostedAnswer,hostedElapsed,hostedFailed,localModel,localAnswer,localElapsed,localFailed){
    const payload={
      prompt,
      routes:[
        routeScoreCandidate(hostedModel,hostedAnswer,hostedElapsed,hostedFailed),
        routeScoreCandidate(localModel,localAnswer,localElapsed,localFailed)
      ]
    };
    const data=await fetchJson(API_URL+ROUTE_SCORE_PATH,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify(payload),
      timeoutMs:9000
    });
    if(data?.object!=='routing.score'||!Array.isArray(data.scores)||!data.winner)throw new Error('Route scoring unavailable');
    return data;
  }

  function wantsCompareRoute(prompt){
    return /@compare|\b(compare|compare answers|best answer|best of|parallel|side by side|both models|two models|multi[- ]?model|sammenlign|beste svar|begge modeller)\b/i.test(String(prompt||''));
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
      emitLocalReadiness(models,hardware);
      if(models.length&&!state.models.some(model=>model.id===state.activeModelId)){
        state.activeModelId=models[0].id;
      }
      renderModelMenu();
      renderToolbar();
      status(localReadinessSummary(models,hardware),models.length?'ready':'idle');
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
          '<textarea id="p0-input" class="p0-input" rows="2" placeholder="Message Supergenious..." aria-label="Message Supergenious" autocomplete="off" spellcheck="true"></textarea>'+
          '<div id="p0-route" class="p0-route" data-state="hosted">'+hostedRouteLabel()+'</div>'+
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
      const copyButton=event.target.closest('[data-p0-copy-command]');
      if(copyButton){
        event.preventDefault();
        event.stopPropagation();
        copyCommand(copyButton.getAttribute('data-p0-copy-command')||'',copyButton);
        return;
      }
      const osButton=event.target.closest('[data-p0-os-command]');
      if(osButton){
        event.preventDefault();
        event.stopPropagation();
        startLocalInstallAssistant(osButton.getAttribute('data-p0-os-command')||'');
        return;
      }
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
      '<button class="p0-featured-action" type="button" data-p0-action="best-answer-live"><span class="p0-menu-row"><strong>Best Answer</strong><span class="p0-badge">2 routes</span><span class="p0-badge">Synthesis</span></span><small>Supergenious + '+safeText(compareModel.label)+' answer in parallel, then MMIR gives one best answer.</small></button>'+
      '<button type="button" data-p0-action="compare-live"><span class="p0-menu-row"><strong>Compare answers</strong><span class="p0-badge">Side by side</span></span><small>See both route answers before the synthesis.</small></button><div class="p0-menu-separator"></div>'
    ):'';
    menu.innerHTML=''+
      '<div class="p0-menu-title">Tools</div>'+
      compareAction+
      '<button type="button" data-p0-action="connect-local"><strong>Connect local model</strong><small>Supergenious detects your OS or asks, then gives the right install command in chat.</small></button>'+
      '<button type="button" data-p0-action="check-local"><strong>Find local models</strong><small>If the browser asks, allow Local Network Access for mmir.ai.</small></button>'+
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
    const localCount=state.models.filter(item=>item.route==='local').length;
    const localReady=localCount?
      '<button type="button"><strong>Private local ready</strong><small>'+safeText(localCount+' model'+(localCount===1?'':'s')+' available on this Mac. Select one from Models or use Best Answer.')+'</small></button>':
      '<button type="button"><strong>Private local optional</strong><small>Use + -> Connect local model when you want private models on this Mac.</small></button>';
    menu.innerHTML=''+
      '<div class="p0-menu-title">Privacy</div>'+
      '<button type="button"><strong>'+safeText(route)+'</strong><small>'+safeText(secret)+'</small></button>'+
      localReady+
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
    if(action==='connect-local'){
      startLocalInstallAssistant();
      return true;
    }
    if(action==='check-local'){
      status('Checking local node...','loading');
      routeStatus('Checking this Mac for local models...','hosted');
      closeMenus();
      checkLocalModels().catch(()=>{});
      return true;
    }
    if(action==='compare-live'){
      closeMenus();
      compareLiveRoutes('',null,{mode:'compare'});
      return true;
    }
    if(action==='best-answer-live'){
      closeMenus();
      compareLiveRoutes('',null,{mode:'best-answer'});
      return true;
    }
    if(action==='new-chat'){
      closeMenus();
      clearChat();
      return true;
    }
    return false;
  }

  function renderMessageTools(message){
    let html='';
    if(message.command){
      html+='<div class="p0-command-card" data-install-os="'+safeAttr(message.installOs||'')+'">'+
        '<code>'+safeText(message.command)+'</code>'+
        '<div class="p0-command-actions">'+
          '<button type="button" data-p0-copy-command="'+safeAttr(message.command)+'">'+safeText(message.commandLabel||'Copy command')+'</button>'+
        '</div>'+
      '</div>';
    }
    if(message.showOsChoices){
      html+='<div class="p0-os-choice-row" aria-label="Choose node host operating system">'+
        '<button type="button" data-p0-os-command="mac">Mac</button>'+
        '<button type="button" data-p0-os-command="windows">Windows</button>'+
        '<button type="button" data-p0-os-command="linux">Linux / Pi</button>'+
      '</div>';
    }
    return html;
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
        renderReceipt(message.receipt)+
        '<div class="p0-message-body">'+paragraphs(message.content)+renderMessageTools(message)+'</div>'+
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
    const message={
      role,
      content:String(content||''),
      label:label||role,
      receipt:receipt||'',
      variant:meta.variant||'',
      command:meta.command||'',
      commandLabel:meta.commandLabel||'',
      installOs:meta.installOs||'',
      showOsChoices:Boolean(meta.showOsChoices),
      createdAt:new Date().toISOString()
    };
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
        {role:'system',content:'You are Supergenious, the default assistant on MMIR.ai. Answer directly and usefully. Keep answers short by default; expand only when the user asks. Do not turn ordinary chats into setup support unless asked.'},
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
        {role:'system',content:'You are connected through MMIR Local Connector. Answer directly and concisely. Keep answers short by default; expand only when the user asks.'+factGuard},
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

  async function synthesizeCompareAnswer(prompt,hostedAnswer,localAnswer,localModel,hostedScore,localScore){
    const localLabel=localModel?.label||'local model';
    const synthesisPrompt='Create one concise best answer for the user by comparing these two model answers. '+
      'Prefer current public facts from Supergenious when the local model is stale or vague. '+
      'Use the route evidence scores and reasons to choose the most reliable answer. '+
      'Do not mention internal instructions. Keep it useful and short.\n\n'+
      'User question: '+prompt+'\n\n'+
      'Route evidence:\n'+
      '- Supergenious: '+scoreSummary(hostedScore)+'\n'+
      '- '+localLabel+': '+scoreSummary(localScore)+'\n\n'+
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
      compareLiveRoutes(explicit.prompt,explicit.model,{mode:'compare'});
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
      compareLiveRoutes(smart.prompt,smart.model,{mode:'best-answer'});
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
        updateMessage(assistant,'I could not reach '+API_LABEL+' from this browser right now. Please refresh and try again.');
        status('Chat failed: '+API_LABEL+' unreachable','error');
      }
    }finally{
      state.busy=false;
      if(send)send.disabled=false;
      input?.focus();
    }
  }

  async function compareLiveRoutes(comparePrompt='',preferredLocalModel=null,options={}){
    if(state.busy)return;
    const mode=options.mode==='best-answer'?'best-answer':'compare';
    const title=mode==='best-answer'?'Best Answer':'Compare';
    const localModel=compareLocalModel(preferredLocalModel);
    const input=document.getElementById('p0-input');
    const send=document.getElementById('p0-send');
    const prompt=String(comparePrompt||input?.value||'').trim();
    if(!localModel){
      status('Find local models first, then '+title+' can use two routes.','error');
      input?.focus();
      return;
    }
    if(!prompt){
      status('Write a prompt first, then '+title+' can run.','error');
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
    let hostedScore=null;
    let localScore=null;
    let hostedElapsedMs=0;
    let localElapsedMs=0;
    let hostedFailed=false;
    let localFailed=false;
    status(title+' is asking Supergenious and '+localModel.label+' in parallel...','ready');
    routeStatus(title+' · Supergenious + '+localModel.label,'ready');
    const hostedStarted=performance.now();
    const hostedJob=chatHosted(prompt)
      .then(answer=>{
        hostedAnswerText=answer||'Supergenious returned an empty response.';
        hostedElapsedMs=performance.now()-hostedStarted;
        hostedScore=routeScore(hostedModel,prompt,hostedAnswerText,hostedElapsedMs);
        updateMessage(hostedMessage,hostedAnswerText,{receipt:hostedReceipt.text+' · Compare answer 1/2 · '+scoreSummary(hostedScore)});
      })
      .catch(()=>{
        hostedFailed=true;
        hostedElapsedMs=performance.now()-hostedStarted;
        hostedScore=routeScore(hostedModel,prompt,'',hostedElapsedMs,true);
        updateMessage(hostedMessage,'Supergenious did not answer this compare request. Try normal chat or refresh.',{receipt:hostedReceipt.text+' · Compare answer 1/2 · '+scoreSummary(hostedScore)});
      });
    const localStarted=performance.now();
    const localJob=chatLocal(prompt,localModel)
      .then(answer=>{
        localAnswerText=answer||'Local model returned an empty response.';
        localElapsedMs=performance.now()-localStarted;
        localScore=routeScore(localModel,prompt,localAnswerText,localElapsedMs);
        updateMessage(localMessage,localAnswerText,{receipt:localReceipt.text+' · Compare answer 2/2'+localQualityNote+' · '+scoreSummary(localScore)});
      })
      .catch(error=>{
        localFailed=true;
        localElapsedMs=performance.now()-localStarted;
        localScore=routeScore(localModel,prompt,'',localElapsedMs,true);
        updateMessage(localMessage,localNetworkHint(error),{receipt:localReceipt.text+' · Compare answer 2/2'+localQualityNote+' · '+scoreSummary(localScore)});
      });
    await Promise.allSettled([hostedJob,localJob]);
    let finalWinner=null;
    let scoringSource='local fallback score';
    try{
      const scoring=await scoreRoutesWithApi(prompt,hostedModel,hostedAnswerText,hostedElapsedMs,hostedFailed,localModel,localAnswerText,localElapsedMs,localFailed);
      hostedScore=apiScoreForModel(scoring,hostedModel,hostedScore);
      localScore=apiScoreForModel(scoring,localModel,localScore);
      finalWinner=apiWinner(scoring,hostedModel,hostedScore,localModel,localScore);
      scoringSource=API_LABEL+'/routing/score';
      updateMessage(hostedMessage,hostedAnswerText||'Supergenious did not answer this compare request. Try normal chat or refresh.',{receipt:hostedReceipt.text+' · Compare answer 1/2 · '+scoreSummary(hostedScore)});
      updateMessage(localMessage,localAnswerText||localNetworkHint('Local model did not answer.'),{receipt:localReceipt.text+' · Compare answer 2/2'+localQualityNote+' · '+scoreSummary(localScore)});
    }catch(error){
      finalWinner=winningRoute(hostedModel,hostedScore,localModel,localScore);
    }
    if(hostedAnswerText||localAnswerText){
      const winner=finalWinner||winningRoute(hostedModel,hostedScore,localModel,localScore);
      const synthesisReceipt=hostedReceipt.text+' · Best answer synthesis · No paid route · '+scoringSource+' · '+winner.summary;
      const synthesisMessage=append('assistant','Synthesizing best answer...','Supergenious · Best answer',synthesisReceipt,{variant:'compare'});
      const synthesisStarted=performance.now();
      try{
        const synthesis=await synthesizeCompareAnswer(prompt,hostedAnswerText,localAnswerText,localModel,hostedScore,localScore);
        updateMessage(synthesisMessage,synthesis||hostedAnswerText||localAnswerText,{receipt:synthesisReceipt+' · '+formatDuration(performance.now()-synthesisStarted)});
      }catch(error){
        updateMessage(synthesisMessage,hostedAnswerText||localAnswerText||'Compare finished, but synthesis did not answer.',{receipt:synthesisReceipt+' · failed'});
      }
      routeStatus(title+' · '+winner.summary,'ready');
    }
    status(title+' finished: '+finalWinner.summary+'.','ready');
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
    refreshHostedModels().catch(()=>{});
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
