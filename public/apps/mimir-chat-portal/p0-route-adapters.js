(function(){
  const version='20260707-one-window-shell-v1';
  const PROD_API_URL='https://api.mmir.ai';
  const STAGING_API_URL='https://api-staging.mmir.ai';
  const LOCAL_URL='http://127.0.0.1:3000';
  const CHAT_PATH='/v1/chat/completions';
  const ROUTE_SCORE_PATH='/routing/score';
  const TOKEN_KEY='mmir-p0-local-token';
  const SYNTHETIC_DEMO_ASSISTANT_RE=/^\s*DEMO:\s*MMIR\s+(?:samler inn samtalen|collects the conversation)\b/i;
  const MISLEADING_TRUST_LABEL_RE=/Verifisert\s*·\s*privat/gi;
  const TRUTHFUL_TRUST_LABEL='Rute og personvern verifisert';

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

  function messageText(message){
    const content=message?.content;
    if(typeof content==='string')return content;
    if(!Array.isArray(content))return '';
    return content
      .filter(part=>part&&typeof part==='object'&&part.type==='text')
      .map(part=>String(part.text||''))
      .join('\n');
  }

  function normalizedMessageText(message){
    return messageText(message).replace(/\s+/g,' ').trim();
  }

  function isSyntheticDemoAssistant(message){
    return String(message?.role||'').toLowerCase()==='assistant'&&SYNTHETIC_DEMO_ASSISTANT_RE.test(messageText(message));
  }

  function sanitizeChatMessages(messages){
    if(!Array.isArray(messages))return {messages,changed:false,removed_demo_turns:0,removed_duplicate_prompts:0};
    const filtered=[];
    let removedDemoTurns=0;
    messages.forEach(message=>{
      if(isSyntheticDemoAssistant(message)){
        removedDemoTurns+=1;
        return;
      }
      filtered.push(message);
    });

    let removedDuplicatePrompts=0;
    let lastUserIndex=-1;
    for(let index=filtered.length-1;index>=0;index-=1){
      if(String(filtered[index]?.role||'').toLowerCase()==='user'){
        lastUserIndex=index;
        break;
      }
    }
    if(lastUserIndex>0){
      const currentText=normalizedMessageText(filtered[lastUserIndex]);
      let previousIndex=lastUserIndex-1;
      while(
        currentText&&
        previousIndex>=0&&
        String(filtered[previousIndex]?.role||'').toLowerCase()==='user'&&
        normalizedMessageText(filtered[previousIndex])===currentText
      ){
        filtered.splice(previousIndex,1);
        removedDuplicatePrompts+=1;
        lastUserIndex-=1;
        previousIndex-=1;
      }
    }

    return {
      messages:filtered,
      changed:Boolean(removedDemoTurns||removedDuplicatePrompts),
      removed_demo_turns:removedDemoTurns,
      removed_duplicate_prompts:removedDuplicatePrompts
    };
  }

  function isChatCompletionsUrl(url){
    try{
      const parsed=new URL(url,location.href);
      return parsed.pathname.replace(/\/+$/,'')===CHAT_PATH;
    }catch(error){
      return false;
    }
  }

  function sanitizeChatRequestOptions(url,options={}){
    if(!isChatCompletionsUrl(url))return options;
    if(String(options?.method||'GET').toUpperCase()!=='POST')return options;
    if(typeof options?.body!=='string')return options;
    let payload=null;
    try{payload=JSON.parse(options.body);}catch(error){return options;}
    if(!payload||!Array.isArray(payload.messages))return options;
    const sanitized=sanitizeChatMessages(payload.messages);
    if(!sanitized.changed)return options;
    return {
      ...options,
      body:JSON.stringify({...payload,messages:sanitized.messages})
    };
  }

  function truthfulTrustLabel(value){
    return String(value||'').replace(MISLEADING_TRUST_LABEL_RE,TRUTHFUL_TRUST_LABEL);
  }

  function rewriteTrustTextNode(node){
    if(!node||node.nodeType!==3)return false;
    const current=String(node.nodeValue||'');
    const next=truthfulTrustLabel(current);
    if(next===current)return false;
    node.nodeValue=next;
    return true;
  }

  function rewriteTrustLabels(root){
    if(typeof document==='undefined'||!root)return 0;
    let changed=0;
    if(rewriteTrustTextNode(root))changed+=1;
    if(typeof document.createTreeWalker!=='function'||typeof NodeFilter==='undefined')return changed;
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    let node=walker.nextNode();
    while(node){
      if(rewriteTrustTextNode(node))changed+=1;
      node=walker.nextNode();
    }
    return changed;
  }

  function installTruthLabelGuard(){
    if(typeof document==='undefined')return false;
    const rewrite=()=>rewriteTrustLabels(document.body||document.documentElement||document);
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',rewrite,{once:true});
    else rewrite();
    if(typeof MutationObserver==='function'&&document.documentElement){
      const observer=new MutationObserver(records=>{
        records.forEach(record=>{
          if(record.type==='characterData')rewriteTrustTextNode(record.target);
          record.addedNodes?.forEach(node=>rewriteTrustLabels(node));
        });
      });
      observer.observe(document.documentElement,{subtree:true,childList:true,characterData:true});
      window.__MimirP0TruthLabelObserver=observer;
    }
    return true;
  }

  async function fetchJson(url,options={}){
    const requestOptions=sanitizeChatRequestOptions(url,options);
    const controller=new AbortController();
    const timeoutMs=requestOptions.timeoutMs||45000;
    const timeout=setTimeout(()=>controller.abort(),timeoutMs);
    const externalSignal=requestOptions.signal;
    const abortFromExternal=()=>controller.abort();
    if(externalSignal){
      if(externalSignal.aborted)controller.abort();
      else externalSignal.addEventListener('abort',abortFromExternal,{once:true});
    }
    const {timeoutMs:ignored,signal:ignoredSignal,...rest}=requestOptions;
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
      if(externalSignal)externalSignal.removeEventListener('abort',abortFromExternal);
    }
  }

  function localNetworkHint(error){
    const message=String(error?.message||error||'');
    if(/local_probe_deferred/i.test(message)){
      return 'Local connector check was deferred. Press Oppdater AI again to allow this browser to check this Mac.';
    }
    if(error?.name==='AbortError')return 'Local connector timed out. Check that MMIR Local Connector and Ollama are running.';
    if(/Failed to fetch|NetworkError|Load failed|blocked|CORS/i.test(message)){
      return 'Browser blocked access to this Mac. Allow Local Network Access for mmir.ai, then press Oppdater AI again. The connector stays on 127.0.0.1.';
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

  function hasLocalPairingToken(){
    try{
      return Boolean(sessionStorage.getItem(TOKEN_KEY));
    }catch(error){
      return false;
    }
  }

  function config(){
    const apiUrl=apiUrlForCurrentHost();
    return {
      apiUrl,
      apiLabel:apiHostLabel(apiUrl),
      localUrl:LOCAL_URL,
      chatPath:CHAT_PATH,
      routeScorePath:ROUTE_SCORE_PATH
    };
  }

  window.MimirP0RouteAdapters={
    version,
    PROD_API_URL,
    STAGING_API_URL,
    LOCAL_URL,
    CHAT_PATH,
    ROUTE_SCORE_PATH,
    TOKEN_KEY,
    config,
    apiUrlForCurrentHost,
    apiHostLabel,
    fetchOptions,
    fetchJson,
    messageText,
    isSyntheticDemoAssistant,
    sanitizeChatMessages,
    sanitizeChatRequestOptions,
    truthfulTrustLabel,
    rewriteTrustLabels,
    installTruthLabelGuard,
    localNetworkHint,
    allowLocalProbes,
    pairLocal,
    hasLocalPairingToken,
    localHeaders
  };
  installTruthLabelGuard();
  window.dispatchEvent(new CustomEvent('mimir-p0-route-adapters-ready',{
    detail:{
      version,
      no_paid_routes_started:true,
      provider_secrets_in_browser:false,
      request_truth_guard:true,
      factual_verification_claimed:false
    }
  }));
})();
