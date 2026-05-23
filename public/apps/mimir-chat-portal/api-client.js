(function(){
  const PROFILE_KEY='mimir-chat-backend-profiles';
  const ACTIVE_KEY='mimir-chat-active-backend';
  const TOKEN_PREFIX='mimir-local-node-token:';
  const PAIRING_CODE_PREFIX='mimir-local-node-pairing-code:';
  const managedSessionTokens=new Map();

  function readProfiles(){
    try{
      const value=JSON.parse(localStorage.getItem(PROFILE_KEY)||'[]');
      return Array.isArray(value)?value:[];
    }catch(error){
      return [];
    }
  }

  function activeId(){
    return localStorage.getItem(ACTIVE_KEY)||'';
  }

  function activeProfile(){
    const id=activeId();
    return readProfiles().find(profile=>profile.id===id)||null;
  }

  function cleanUrl(value){
    return String(value||'').trim().replace(/\/$/,'');
  }

  function joinUrl(base,path){
    return cleanUrl(base)+path;
  }

  function isLocal(profile){
    return profile?.provider==='local-node'||profile?.provider==='ollama-direct';
  }

  function tokenKey(url){
    return TOKEN_PREFIX+cleanUrl(url);
  }

  function pairingCodeKey(url){
    return PAIRING_CODE_PREFIX+cleanUrl(url);
  }

  function managedSessionFor(url){
    const key=cleanUrl(url);
    const record=managedSessionTokens.get(key);
    if(!record)return null;
    return {
      url:key,
      source:record.source||'manual',
      created_at:record.created_at,
      expires_at:record.expires_at||'',
      token_available:Boolean(record.token),
      public_frontend_persisted:false
    };
  }

  function activeManagedSession(){
    const profile=activeProfile();
    const url=cleanUrl(profile?.url);
    return url?managedSessionFor(url):null;
  }

  function setManagedSessionToken(url,token,meta={}){
    const key=cleanUrl(url);
    const value=String(token||'').trim();
    if(!key||!value)return null;
    managedSessionTokens.set(key,{
      token:value,
      source:String(meta.source||'manual').slice(0,80),
      created_at:new Date().toISOString(),
      expires_at:String(meta.expires_at||'').slice(0,80)
    });
    window.dispatchEvent(new CustomEvent('mmir-managed-session-updated',{detail:{url:key,active:true,public_frontend_persisted:false}}));
    return managedSessionFor(key);
  }

  function clearManagedSessionToken(url){
    const key=cleanUrl(url||activeProfile()?.url);
    if(!key)return false;
    const removed=managedSessionTokens.delete(key);
    window.dispatchEvent(new CustomEvent('mmir-managed-session-updated',{detail:{url:key,active:false,public_frontend_persisted:false}}));
    return removed;
  }

  function isRemotePairingCodeRequired(error){
    return error?.status===403&&error?.payload?.error?.code==='remote_pairing_code_required';
  }

  function readPairingCode(url){
    const key=pairingCodeKey(url);
    const saved=sessionStorage.getItem(key);
    if(saved)return saved;
    if(typeof window.prompt!=='function')return '';
    const code=window.prompt('Enter the MMIR pairing code shown on the local node device.');
    if(code)sessionStorage.setItem(key,code);
    return code||'';
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
    const key=tokenKey(url);
    const existing=sessionStorage.getItem(key);
    try{
      const data=await fetchJson(joinUrl(url,'/pair'),{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:'{}',
        timeoutMs:5000
      });
      if(data?.token){
        sessionStorage.setItem(key,data.token);
        return data.token;
      }
    }catch(error){
      if(isRemotePairingCodeRequired(error)){
        const code=readPairingCode(url);
        if(code){
          const data=await fetchJson(joinUrl(url,'/pair'),{
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body:JSON.stringify({code}),
            timeoutMs:5000
          });
          if(data?.token){
            sessionStorage.removeItem(pairingCodeKey(url));
            sessionStorage.setItem(key,data.token);
            return data.token;
          }
        }
      }
      if(existing)return existing;
      throw error;
    }
    return existing||'';
  }

  function authHeaders(token){
    const headers={'Content-Type':'application/json'};
    if(token)headers['x-mmir-local-token']=token;
    const session=managedSessionTokens.get(cleanUrl(activeProfile()?.url));
    if(session?.token)headers['x-mmir-session-token']=session.token;
    return headers;
  }

  function friendlyError(error){
    if(error?.name==='AbortError')return 'Backend timed out. Check that the local node or API is running.';
    if(error?.status===401)return 'Backend requires pairing or an API key. Refresh the connection and try again.';
    if(error?.status===403&&error?.payload?.error?.code==='remote_pairing_code_required')return 'Remote node pairing needs a fresh code from the device running MMIR Local Node.';
    if(error?.status===403)return 'This page origin is not allowed by the backend CORS policy.';
    if(error?.status===404)return 'Backend does not expose the expected MMIR route yet.';
    if(error?.status===413)return 'Prompt or document is too large for this backend.';
    if(error?.status===429)return 'Backend rate limit reached. Try again shortly.';
    if(error?.status===503)return 'Runtime is unavailable. Check Ollama, the selected provider or backend auth configuration.';
    if(String(error?.message||'').includes('Failed to fetch'))return 'Backend is unreachable or blocked by CORS. Check the URL and local node.';
    return error?.message||'Request failed.';
  }

  window.MimirApiClient={
    readProfiles,
    activeId,
    activeProfile,
    cleanUrl,
    joinUrl,
    isLocal,
    tokenKey,
    pairingCodeKey,
    managedSessionFor,
    activeManagedSession,
    setManagedSessionToken,
    clearManagedSessionToken,
    fetchJson,
    pairIfNeeded,
    authHeaders,
    friendlyError
  };
})();
