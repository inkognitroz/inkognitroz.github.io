(function(){
  const PROFILE_KEY='mimir-chat-backend-profiles';
  const ACTIVE_KEY='mimir-chat-active-backend';
  const CHAT_PREFIX='mimir-chat-current-session-v1';
  const WORKSPACE_KEY='mimir-active-workspace-v1';
  const MANAGED_ID='mmir-api-bootstrap';
  const MANAGED_URL='https://api.mmir.ai';

  function readJson(key,fallback){
    try{
      const value=JSON.parse(localStorage.getItem(key)||'null');
      return value==null?fallback:value;
    }catch(error){
      return fallback;
    }
  }

  function writeProfiles(profiles){
    localStorage.setItem(PROFILE_KEY,JSON.stringify(profiles));
    window.dispatchEvent(new CustomEvent('mmir-backend-profiles-updated',{detail:{source:'public-launch-guard'}}));
  }

  function returnIntent(){
    const params=new URLSearchParams(location.search);
    const hash=String(location.hash||'').toLowerCase();
    return params.get('mmir_local_return')==='1'||
      params.get('local_node_ready')==='1'||
      params.get('mmir_keep_backend')==='1'||
      hash.includes('local-connector-ready')||
      hash.includes('mmir-local-ready');
  }

  function managedProfile(existing){
    const now=new Date().toISOString();
    return {
      id:MANAGED_ID,
      name:'Supergeni',
      url:MANAGED_URL,
      provider:'openai-compatible',
      models:existing?.health==='ready'?'mmir-supergenius auto-discovered':'checked at runtime',
      keyRef:'no browser secret',
      cost:'free no paid routes',
      latency:'edge bootstrap',
      throughput:'hosted free route',
      uptime:'cloudflare worker',
      health:existing?.health==='ready'?'ready':'unknown',
      createdAt:existing?.createdAt||now,
      updatedAt:now
    };
  }

  function forceManagedRoute(reason){
    if(returnIntent())return false;
    const profiles=Array.isArray(readJson(PROFILE_KEY,[]))?readJson(PROFILE_KEY,[]):[];
    const index=profiles.findIndex((profile)=>profile?.id===MANAGED_ID||String(profile?.url||'').replace(/\/$/,'')===MANAGED_URL);
    const existing=index>=0?profiles[index]:null;
    const managed=managedProfile(existing);
    if(index>=0)profiles[index]=managed;
    else profiles.unshift(managed);
    localStorage.setItem(ACTIVE_KEY,MANAGED_ID);
    writeProfiles(profiles);
    window.__MimirPublicLaunchRoute={id:MANAGED_ID,url:MANAGED_URL,reason:reason||'public-first-chat'};
    return true;
  }

  function brokenChatText(value){
    return /Selected browser LLM is not loaded|System prompt should always be the first message|Browser Model unavailable|WebGPU unavailable|Backend is unreachable|Runtime is unavailable|local_probe_deferred|No model route is visible yet|Activate a backend profile/i.test(String(value||''));
  }

  function sanitizeBrokenChatHistory(){
    if(returnIntent())return;
    const params=new URLSearchParams(location.search);
    if(params.get('mmir_keep_history')==='1')return;
    const workspace=localStorage.getItem(WORKSPACE_KEY)||'personal';
    const keys=new Set([CHAT_PREFIX,CHAT_PREFIX+':'+workspace]);
    for(let i=0;i<localStorage.length;i+=1){
      const key=localStorage.key(i);
      if(key&&key.startsWith(CHAT_PREFIX+':'))keys.add(key);
    }
    keys.forEach((key)=>{
      const raw=localStorage.getItem(key);
      if(!raw||!brokenChatText(raw))return;
      localStorage.removeItem(key);
      window.dispatchEvent(new CustomEvent('mmir-chat-history-updated',{detail:{source:'public-launch-guard',removed:key}}));
    });
  }

  function hideUnprovenCapabilities(){
    document.querySelectorAll('[data-mimir-capability-state]').forEach((node)=>{
      const state=String(node.getAttribute('data-mimir-capability-state')||'').toLowerCase();
      if(!/^(planned|parked|advanced|lab)$/.test(state))return;
      node.hidden=true;
      node.inert=true;
      node.setAttribute('aria-hidden','true');
      node.dataset.mimirHiddenByGuard='true';
    });
  }

  function keepManagedOnSend(event){
    if(event?.target?.closest?.('#primary-chat-link,.mimir-composer,[data-prompt-action]')){
      forceManagedRoute('send');
    }
  }

  function init(){
    document.body?.classList.toggle('mimir-local-return',returnIntent());
    document.body?.classList.toggle('mimir-public-launch-stable',!returnIntent());
    forceManagedRoute('load');
    hideUnprovenCapabilities();
    sanitizeBrokenChatHistory();
    document.addEventListener('submit',()=>forceManagedRoute('submit'),true);
    document.addEventListener('click',keepManagedOnSend,true);
    document.addEventListener('keydown',(event)=>{
      if(event.key==='Enter'&&!event.shiftKey&&event.target?.id==='mimir-prompt')forceManagedRoute('enter');
    },true);
  }

  window.MimirPublicLaunchGuard={forceManagedRoute,sanitizeBrokenChatHistory,hideUnprovenCapabilities,returnIntent};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
