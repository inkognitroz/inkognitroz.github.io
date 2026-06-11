(function(){
  const version='20260611-b0-06-21-active-local-attach-v1';
  const PROD_API_URL='https://api.mmir.ai';
  const STAGING_API_URL='https://api-staging.mmir.ai';
  const LOCAL_URL='http://127.0.0.1:3000';
  const CHAT_PATH='/v1/chat/completions';
  const ROUTE_SCORE_PATH='/routing/score';
  const TOKEN_KEY='mmir-p0-local-token';

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

  async function fetchJson(url,options={}){
    const controller=new AbortController();
    const timeoutMs=options.timeoutMs||45000;
    const timeout=setTimeout(()=>controller.abort(),timeoutMs);
    const externalSignal=options.signal;
    const abortFromExternal=()=>controller.abort();
    if(externalSignal){
      if(externalSignal.aborted)controller.abort();
      else externalSignal.addEventListener('abort',abortFromExternal,{once:true});
    }
    const {timeoutMs:ignored,signal:ignoredSignal,...rest}=options;
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
      return 'Local connector check was deferred. Press Refresh models again to allow this browser to check this Mac.';
    }
    if(error?.name==='AbortError')return 'Local connector timed out. Check that MMIR Local Connector and Ollama are running.';
    if(/Failed to fetch|NetworkError|Load failed|blocked|CORS/i.test(message)){
      return 'Browser blocked access to this Mac. Allow Local Network Access for mmir.ai, then press Refresh models again. The connector stays on 127.0.0.1.';
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
    localNetworkHint,
    allowLocalProbes,
    pairLocal,
    hasLocalPairingToken,
    localHeaders
  };
  window.dispatchEvent(new CustomEvent('mimir-p0-route-adapters-ready',{
    detail:{
      version,
      no_paid_routes_started:true,
      provider_secrets_in_browser:false
    }
  }));
})();
