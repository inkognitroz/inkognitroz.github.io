(function(){
  const PROFILE_KEY='mimir-chat-backend-profiles';
  const ACTIVE_KEY='mimir-chat-active-backend';
  const TOKEN_PREFIX='mimir-local-node-token:';
  const PAIRING_CODE_PREFIX='mimir-local-node-pairing-code:';
  const BACKEND_IDENTITY_ORIGIN='https://backend.mmir.ai';
  const BACKEND_SESSION_PREFIX='mimir-backend-identity-session:';
  const BACKEND_ROTATION_WINDOW_MS=24*60*60*1000;
  const BACKEND_OPERATION_TIMEOUT_MS=5000;
  const managedSessionTokens=new Map();
  const backendSessionFlights=new Map();
  const backendSessionStorageFailures=new Set();

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

  function normalizedOrigin(value){
    if(typeof value!=='string')return '';
    try{
      const url=new URL(value.trim());
      if(url.username||url.password||url.search||url.hash||url.pathname!=='/'||url.protocol!=='https:')return '';
      return url.origin;
    }catch(error){return '';}
  }

  function explicitBackendOptIn(){
    let global='';
    let brand='';
    try{global=normalizedOrigin(window.MMIR_BACKEND_URL);}catch(error){}
    try{brand=normalizedOrigin(window.MimirBrandConfig?.backend_url);}catch(error){}
    const url=global||brand;
    return url===BACKEND_IDENTITY_ORIGIN;
  }

  function backendIdentityScope(url,options={}){
    if(!explicitBackendOptIn())return false;
    let parsed;
    try{parsed=new URL(String(url||''),window.location.href);}catch(error){return false;}
    const method=String(options.method||'GET').toUpperCase();
    if(parsed.origin!==BACKEND_IDENTITY_ORIGIN||parsed.search||parsed.hash)return false;
    return (method==='GET'&&parsed.pathname==='/status')||
      (method==='POST'&&parsed.pathname==='/v1/chat/completions');
  }

  function backendIdentityError(message,code='backend_identity_error',status=0){
    const error=new Error(message);
    error.code=code;
    if(status)error.status=status;
    return error;
  }

  function backendSessionKey(origin=BACKEND_IDENTITY_ORIGIN){
    return BACKEND_SESSION_PREFIX+origin;
  }

  function backendStorage(){
    if(backendSessionStorageFailures.has(BACKEND_IDENTITY_ORIGIN)){
      throw backendIdentityError('Backend identity storage is unavailable.','backend_identity_storage_unavailable');
    }
    try{
      if(!window.sessionStorage||typeof window.sessionStorage.getItem!=='function')throw new Error('missing sessionStorage');
      return window.sessionStorage;
    }catch(error){
      backendSessionStorageFailures.add(BACKEND_IDENTITY_ORIGIN);
      throw backendIdentityError('Backend identity storage is unavailable.','backend_identity_storage_unavailable');
    }
  }

  function validSessionRecord(value,{now=Date.now()}={}){
    if(!value||typeof value!=='object'||Array.isArray(value))return {record:null,reason:'malformed'};
    const token=typeof value.token==='string'?value.token.trim():'';
    const identityId=typeof value.identity_id==='string'?value.identity_id.trim():'';
    const issuedAt=Date.parse(String(value.issued_at||''));
    const expiresAt=Date.parse(String(value.expires_at||''));
    if(!token||token.length>8192||/[\u0000-\u001f\u007f]/.test(token)||!identityId||identityId.length>256||/[\u0000-\u001f\u007f]/.test(identityId)||!Number.isFinite(issuedAt)||!Number.isFinite(expiresAt)||expiresAt<=issuedAt||expiresAt<=0){
      return {record:null,reason:'malformed'};
    }
    const record={token,identity_id:identityId,issued_at:new Date(issuedAt).toISOString(),expires_at:new Date(expiresAt).toISOString()};
    return expiresAt<=now?{record,reason:'expired'}:{record,reason:'valid'};
  }

  function readBackendSession({now=Date.now()}={}){
    const storage=backendStorage();
    let raw;
    try{raw=storage.getItem(backendSessionKey());}
    catch(error){
      backendSessionStorageFailures.add(BACKEND_IDENTITY_ORIGIN);
      throw backendIdentityError('Backend identity storage is unavailable.','backend_identity_storage_unavailable');
    }
    if(raw===null)return {record:null,reason:'missing'};
    let parsed;
    try{parsed=JSON.parse(raw);}catch(error){parsed=null;}
    const result=validSessionRecord(parsed,{now});
    if(result.reason!=='valid')return result;
    return result;
  }

  function writeBackendSession(record){
    const storage=backendStorage();
    try{storage.setItem(backendSessionKey(),JSON.stringify(record));}
    catch(error){
      backendSessionStorageFailures.add(BACKEND_IDENTITY_ORIGIN);
      throw backendIdentityError('Backend identity storage is unavailable.','backend_identity_storage_unavailable');
    }
  }

  function sessionResponse(value,{now=Date.now()}={}){
    if(!value||value.object!=='mmir.identity_session'||value.anonymous!==true){
      throw backendIdentityError('Backend returned an invalid identity session.','backend_identity_invalid_response');
    }
    const result=validSessionRecord(value,{now});
    if(result.reason!=='valid')throw backendIdentityError('Backend returned an invalid identity session.','backend_identity_invalid_response');
    return result.record;
  }

  async function backendJson(url,{method='GET',body,signal,fetchImpl=window.fetch}={}){
    if(typeof fetchImpl!=='function')throw backendIdentityError('Backend identity transport is unavailable.','backend_identity_transport_unavailable');
    let response;
    try{
      response=await fetchImpl(url,{method,headers:{Accept:'application/json','Content-Type':'application/json'},body,signal,credentials:'omit'});
    }catch(error){throw error;}
    if(!response?.ok)throw backendIdentityError('Backend identity request failed.','backend_identity_request_failed',Number(response?.status)||0);
    try{return await response.json();}catch(error){throw backendIdentityError('Backend returned invalid identity JSON.','backend_identity_invalid_response');}
  }

  function abortError(){
    const error=new Error('The backend identity request was aborted.');
    error.name='AbortError';
    return error;
  }

  function awaitFlight(entry,signal){
    entry.waiters+=1;
    let active=true;
    const release=()=>{
      if(!active)return;
      active=false;
      entry.waiters=Math.max(0,entry.waiters-1);
      if(!entry.settled&&entry.waiters===0)entry.controller.abort();
    };
    if(signal?.aborted){
      release();
      return Promise.reject(abortError());
    }
    return new Promise((resolve,reject)=>{
      const onAbort=()=>{
        release();
        reject(abortError());
      };
      if(signal)signal.addEventListener('abort',onAbort,{once:true});
      entry.promise.then(
        value=>{release();if(signal)signal.removeEventListener('abort',onAbort);resolve(value);},
        error=>{release();if(signal)signal.removeEventListener('abort',onAbort);reject(error);}
      );
    });
  }

  async function ensureBackendSession({signal,fetchImpl=window.fetch,now=Date.now()}={}){
    if(signal?.aborted)throw abortError();
    const existingFlight=backendSessionFlights.get(BACKEND_IDENTITY_ORIGIN);
    if(existingFlight)return awaitFlight(existingFlight,signal);
    const operationController=new AbortController();
    const operationTimeout=setTimeout(()=>operationController.abort(),BACKEND_OPERATION_TIMEOUT_MS);
    const flight=(async()=>{
      try{
        const current=readBackendSession({now});
        if(current.reason==='malformed')throw backendIdentityError('Stored backend identity is malformed.','backend_identity_malformed');
        if(current.reason==='expired')throw backendIdentityError('Stored backend identity has expired.','backend_identity_expired');
        if(current.record){
          const expiresAt=Date.parse(current.record.expires_at);
          if(expiresAt-now>BACKEND_ROTATION_WINDOW_MS)return current.record;
          const rotated=await backendJson(BACKEND_IDENTITY_ORIGIN+'/identity/session',{
            method:'POST',body:JSON.stringify({prior_token:current.record.token}),signal:operationController.signal,fetchImpl
          });
          const next=sessionResponse(rotated,{now});
          if(next.identity_id!==current.record.identity_id)throw backendIdentityError('Backend identity rotation changed identity.','backend_identity_rotation_mismatch');
          writeBackendSession(next);
          return next;
        }
        const health=await backendJson(BACKEND_IDENTITY_ORIGIN+'/health',{signal:operationController.signal,fetchImpl});
        const capabilities=Array.isArray(health?.capabilities)?health.capabilities:[];
        if(health?.status!=='online'||health?.service!=='mmir-orchestrator'||health?.layer!=='backend'||!capabilities.includes('identity')||!capabilities.includes('proxy.chat_completions')){
          throw backendIdentityError('Backend health contract is unavailable.','backend_identity_health_unavailable');
        }
        const issued=await backendJson(BACKEND_IDENTITY_ORIGIN+'/identity/session',{
          method:'POST',body:'{}',signal:operationController.signal,fetchImpl
        });
        const next=sessionResponse(issued,{now});
        writeBackendSession(next);
        return next;
      }finally{clearTimeout(operationTimeout);}
    })();
    const entry={promise:flight,controller:operationController,waiters:0,settled:false};
    backendSessionFlights.set(BACKEND_IDENTITY_ORIGIN,entry);
    flight.then(
      ()=>{entry.settled=true;if(backendSessionFlights.get(BACKEND_IDENTITY_ORIGIN)===entry)backendSessionFlights.delete(BACKEND_IDENTITY_ORIGIN);},
      ()=>{entry.settled=true;if(backendSessionFlights.get(BACKEND_IDENTITY_ORIGIN)===entry)backendSessionFlights.delete(BACKEND_IDENTITY_ORIGIN);}
    );
    return awaitFlight(entry,signal);
  }

  function copyHeaders(input){
    const headers={};
    if(Array.isArray(input))input.forEach(pair=>{if(Array.isArray(pair)&&pair.length>1)headers[String(pair[0])]=pair[1];});
    else if(input&&typeof input.forEach==='function')input.forEach((value,key)=>{headers[key]=value;});
    else if(input&&typeof input==='object')Object.assign(headers,input);
    Object.keys(headers).forEach(key=>{if(key.toLowerCase()==='authorization')delete headers[key];});
    return headers;
  }

  async function prepareBackendRequest(url,options={}){
    if(!backendIdentityScope(url,options))return options;
    const {identityFetch,...requestOptions}=options;
    const session=await ensureBackendSession({signal:options.signal,fetchImpl:identityFetch||window.fetch});
    const headers=copyHeaders(requestOptions.headers);
    headers.Authorization='Bearer '+session.token;
    return {...requestOptions,headers};
  }

  function personalMemoryScope(path,method){
    const normalized=String(path||'');
    const item=normalized!=='/memory/search'&&/^\/memory\/[^/?#]+$/.test(normalized);
    // The panel also reaches the identity's own knowledge documents: searching
    // them is how the user finds one, and DELETE is the only way to remove a
    // document that the backend can already feed into an answer.
    const document=/^\/knowledge\/documents\/[^/?#]+$/.test(normalized);
    return (method==='GET'&&(normalized==='/consent'||normalized==='/memory'||item))||
      (method==='PUT'&&normalized==='/consent')||
      (method==='POST'&&(normalized==='/memory'||normalized==='/memory/search'||normalized==='/knowledge/search'))||
      (method==='DELETE'&&(item||document));
  }

  // This is intentionally separate from the public chat route switch. It is
  // callable only from an explicit personal-memory panel action, and cannot
  // send the session bearer to a configured profile or arbitrary origin.
  async function personalMemoryRequest(path,options={}){
    const method=String(options.method||'GET').toUpperCase();
    if(!personalMemoryScope(path,method))throw backendIdentityError('Personal memory endpoint is not allowed.','personal_memory_endpoint_not_allowed');
    const {identityFetch,timeoutMs=5000,signal:externalSignal,...requestOptions}=options;
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),timeoutMs);
    const abortFromExternal=()=>controller.abort();
    if(externalSignal){
      if(externalSignal.aborted)controller.abort();
      else externalSignal.addEventListener('abort',abortFromExternal,{once:true});
    }
    try{
    const session=await ensureBackendSession({signal:controller.signal,fetchImpl:identityFetch||window.fetch});
    const headers=copyHeaders(requestOptions.headers);
    headers.Authorization='Bearer '+session.token;
    let response;
    try{response=await (identityFetch||window.fetch)(BACKEND_IDENTITY_ORIGIN+path,fetchInitFor(BACKEND_IDENTITY_ORIGIN+path,{...requestOptions,method,headers,signal:controller.signal}));}
    catch(error){if(error?.name==='AbortError')throw error;throw backendIdentityError('Personal memory request failed.','personal_memory_request_failed');}
    let data=null;
    try{data=await response.json();}catch(error){}
    if(!response.ok)throw backendIdentityError(data?.error?.message||'Personal memory request failed.','personal_memory_request_failed',Number(response.status)||0);
    return data;
    }finally{
      clearTimeout(timeout);
      if(externalSignal)externalSignal.removeEventListener('abort',abortFromExternal);
    }
  }

  function loopbackUrl(value){
    try{
      const url=new URL(String(value||''),window.location.href);
      return ['127.0.0.1','localhost','::1'].includes(url.hostname);
    }catch(error){
      return false;
    }
  }

  function fetchInitFor(url,options){
    const init={...options};
    if(loopbackUrl(url)&&!init.targetAddressSpace)init.targetAddressSpace='loopback';
    return init;
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
      const response=await fetch(url,fetchInitFor(url,{...fetchOptions,signal:controller.signal}));
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
    if(String(error?.message||'').includes('Failed to fetch'))return 'Backend is unreachable or blocked by CORS/local-network permission. Allow Local Network Access for mmir.ai, then refresh the local node.';
    return error?.message||'Request failed.';
  }

  window.MimirApiClient={
    readProfiles,
    activeId,
    activeProfile,
    cleanUrl,
    loopbackUrl,
    joinUrl,
    isLocal,
    tokenKey,
    pairingCodeKey,
    managedSessionFor,
    activeManagedSession,
    setManagedSessionToken,
    clearManagedSessionToken,
    prepareBackendRequest,
    personalMemoryRequest,
    backendIdentityScope,
    backendSessionKey,
    fetchJson,
    pairIfNeeded,
    authHeaders,
    friendlyError
  };
})();
