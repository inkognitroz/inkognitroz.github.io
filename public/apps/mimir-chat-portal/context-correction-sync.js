(function(){
  const api=window.MimirApiClient;
  const WORKSPACE_KEY='mimir-active-workspace-v1';
  const DEFAULT_WORKSPACE_ID='personal';
  const CORRECTION_PREFIX='mimir-context-corrections-v1:';
  const SYNC_PREFIX='mimir-context-correction-sync-v1:';
  const MAX_SYNC_EVENTS=50;
  if(!api)return;

  function safe(value){return String(value||'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');}
  function workspaceId(){return localStorage.getItem(WORKSPACE_KEY)||DEFAULT_WORKSPACE_ID;}
  function correctionKey(){return CORRECTION_PREFIX+workspaceId();}
  function syncKey(){return SYNC_PREFIX+workspaceId();}
  function cleanString(value,max=160){return String(value||'').trim().slice(0,max);}
  function cleanIds(value,max=24){
    const seen=new Set();
    return (Array.isArray(value)?value:[]).map((item)=>cleanString(item,120)).filter((item)=>{
      if(!item||seen.has(item))return false;
      seen.add(item);
      return true;
    }).slice(0,max);
  }
  function readJson(key,fallback){
    try{
      const value=JSON.parse(localStorage.getItem(key)||'null');
      return value==null?fallback:value;
    }catch(error){
      return fallback;
    }
  }
  function writeSyncState(value){
    const state={
      workspace_id:workspaceId(),
      updated_at:new Date().toISOString(),
      provider_secrets_stored:false,
      raw_prompt_stored:false,
      raw_response_stored:false,
      no_paid_routes_started:true,
      ...value
    };
    try{localStorage.setItem(syncKey(),JSON.stringify(state));}catch(error){}
    window.dispatchEvent(new CustomEvent('mmir-context-correction-sync-updated',{detail:state}));
    return state;
  }
  function readSyncState(){
    const value=readJson(syncKey(),null);
    return value&&typeof value==='object'?value:null;
  }
  function readCorrections(){
    const value=readJson(correctionKey(),[]);
    return Array.isArray(value)?value.filter((item)=>item&&item.id).slice(-MAX_SYNC_EVENTS):[];
  }
  function sanitizeUndo(value){
    return (Array.isArray(value)?value:[]).map((item)=>({
      kind:cleanString(item?.kind||'memory-item',60),
      id:cleanString(item?.id,120),
      enabled:item?.enabled!==false
    })).filter((item)=>item.id).slice(0,24);
  }
  function sanitizeSuggestions(value){
    return (Array.isArray(value)?value:[]).map((item)=>({
      id:cleanString(item?.id,80),
      target:cleanString(item?.target||'context',40),
      label:cleanString(item?.label,120)
    })).filter((item)=>item.id).slice(0,12);
  }
  function syncPreview(){
    return readCorrections().map((item)=>({
      id:cleanString(item.id,120),
      workspace_id:workspaceId(),
      target:cleanString(item.target||'context',40),
      action:cleanString(item.action||'disable-source',60),
      message_id:cleanString(item.message_id||item.source_message_id,120),
      answer_message_id:cleanString(item.answer_message_id,120),
      correction_id:cleanString(item.correction_id,120),
      model:cleanString(item.model,160),
      source_ids:cleanIds(item.source_ids),
      source_count:Math.max(0,Math.round(Number(item.source_count)||0)),
      undo:sanitizeUndo(item.undo),
      suggestions:sanitizeSuggestions(item.suggestions),
      created_at:cleanString(item.created_at||item.at,new Date().toISOString(),64),
      updated_at:new Date().toISOString(),
      undone_at:item.undone_at?cleanString(item.undone_at,64):null,
      provider_secrets_stored:false,
      raw_prompt_stored:false,
      raw_response_stored:false,
      no_paid_routes_started:true
    }));
  }
  function currentBackend(){
    const profile=api.activeProfile?.();
    const url=api.cleanUrl(profile?.url||'');
    return {profile,url};
  }
  async function tokenFor(profile,url){
    if(api.isLocal?.(profile))return api.pairIfNeeded(profile,url);
    return '';
  }
  function capabilitiesFromStatus(status){
    const direct=Array.isArray(status?.capabilities)?status.capabilities:[];
    const nested=Array.isArray(status?.data?.capabilities)?status.data.capabilities:[];
    return [...direct,...nested].map(String);
  }
  async function checkRoute(){
    const {profile,url}=currentBackend();
    if(!profile||!url){
      return writeSyncState({status:'needs-backend',message:'Choose an active protected backend profile before syncing correction trails.',event_count:syncPreview().length});
    }
    try{
      const token=await tokenFor(profile,url);
      const status=await api.fetchJson(api.joinUrl(url,'/status'),{
        method:'GET',
        headers:api.authHeaders(token),
        timeoutMs:6000
      });
      const capabilities=capabilitiesFromStatus(status);
      const supported=capabilities.includes('context.corrections');
      return writeSyncState({
        status:supported?'ready':'unsupported',
        backend_url:url,
        backend_provider:profile.provider||'backend',
        message:supported?'Protected correction sync is available on the active backend.':'Active backend responded, but does not advertise context.corrections yet.',
        event_count:syncPreview().length,
        capabilities
      });
    }catch(error){
      return writeSyncState({
        status:'error',
        backend_url:url,
        backend_provider:profile.provider||'backend',
        message:api.friendlyError?.(error)||error.message||'Could not check protected correction sync.',
        event_count:syncPreview().length
      });
    }
  }
  async function syncNow(){
    const events=syncPreview();
    const {profile,url}=currentBackend();
    if(!events.length){
      writeSyncState({status:'empty',message:'No local correction metadata is waiting to sync.',event_count:0});
      render();
      return;
    }
    if(!profile||!url){
      writeSyncState({status:'needs-backend',message:'Choose an active protected backend profile before syncing.',event_count:events.length});
      render();
      return;
    }
    try{
      const token=await tokenFor(profile,url);
      const response=await api.fetchJson(api.joinUrl(url,'/context/corrections'),{
        method:'POST',
        headers:api.authHeaders(token),
        body:JSON.stringify({workspace_id:workspaceId(),events}),
        timeoutMs:12000
      });
      writeSyncState({
        status:'synced',
        backend_url:url,
        backend_provider:profile.provider||'backend',
        synced_count:Array.isArray(response?.data)?response.data.length:events.length,
        error_count:Array.isArray(response?.errors)?response.errors.length:0,
        event_count:events.length,
        message:'Correction metadata synced to the protected backend. Raw prompts, responses and secrets stayed out of the payload.'
      });
    }catch(error){
      writeSyncState({
        status:'error',
        backend_url:url,
        backend_provider:profile.provider||'backend',
        event_count:events.length,
        message:api.friendlyError?.(error)||error.message||'Could not sync correction metadata.'
      });
    }
    render();
  }
  function deferSync(){
    writeSyncState({status:'deferred',message:'Correction trails remain browser-local. You can sync later when a protected backend is active.',event_count:syncPreview().length});
    render();
  }
  function openBackend(){
    window.MimirBackendProfiles?.ensureFreeLocalProfile?.();
    const target=document.getElementById('backend-settings')||document.getElementById('model-library');
    if(target&&'open' in target)target.open=true;
    target?.scrollIntoView({behavior:'smooth',block:'start'});
  }
  function openIdentity(){
    const target=document.getElementById('identity-orgs')||document.getElementById('backend-settings');
    if(target&&'open' in target)target.open=true;
    target?.scrollIntoView({behavior:'smooth',block:'start'});
  }
  function surfaceHtml(surface){
    const events=syncPreview();
    const state=readSyncState();
    const {profile,url}=currentBackend();
    const latest=state?.message||'Correction sync has not checked the active backend yet.';
    const sample=events.slice(-3).reverse();
    const status=state?.status||(!events.length?'empty':'idle');
    return '<section class="context-correction-sync-panel" data-surface="'+safe(surface)+'" data-state="'+safe(status)+'">'+
      '<div><p class="eyebrow">Protected sync</p><h3>Correction trails: '+safe(events.length)+' metadata event'+(events.length===1?'':'s')+'</h3>'+
      '<p>'+safe(latest)+'</p>'+
      '<small>Active backend: '+safe(profile?.name||'none')+(url?' / '+safe(url):'')+' / raw_prompt_stored:false / raw_response_stored:false / provider_secrets_stored:false</small></div>'+
      '<div class="context-correction-sync-preview">'+(sample.length?sample.map((event)=>
        '<article><strong>'+safe(event.target+' '+event.action)+'</strong><small>'+safe(event.source_count)+' source(s) / '+safe(event.undo.length)+' undo step(s) / '+safe(event.id)+'</small></article>'
      ).join(''):'<article><strong>No local correction metadata</strong><small>Use Memory or Knowledge source correction actions first.</small></article>')+'</div>'+
      '<div class="context-correction-sync-actions">'+
        '<button type="button" data-correction-sync="check">Check backend</button>'+
        '<button type="button" data-correction-sync="sync" '+(!events.length?'disabled':'')+'>Sync metadata</button>'+
        '<button type="button" data-correction-sync="defer">Keep local</button>'+
        '<button type="button" data-correction-sync="backend">Backend</button>'+
        '<button type="button" data-correction-sync="identity">Session</button>'+
      '</div>'+
    '</section>';
  }
  function placePanel(anchor,where,surface){
    if(!anchor)return;
    let slot=anchor.parentElement?.querySelector?.('.context-correction-sync-slot[data-surface="'+surface+'"]');
    if(!slot){
      slot=document.createElement('div');
      slot.className='context-correction-sync-slot';
      slot.dataset.surface=surface;
      if(where==='after')anchor.insertAdjacentElement('afterend',slot);
      else anchor.appendChild(slot);
    }
    slot.innerHTML=surfaceHtml(surface);
  }
  function render(){
    placePanel(document.getElementById('memory-correction-trail'),'after','memory');
    placePanel(document.getElementById('knowledge-correction-trail'),'after','knowledge');
    const progressAnchor=document.getElementById('progress-protected-context-correction-sync')||document.getElementById('progress-context-correction-suggestions-report');
    placePanel(progressAnchor,'after','progress');
  }
  document.addEventListener('click',(event)=>{
    const button=event.target.closest('[data-correction-sync]');
    if(!button)return;
    const action=button.dataset.correctionSync;
    if(action==='check')checkRoute().then(render);
    if(action==='sync')syncNow();
    if(action==='defer')deferSync();
    if(action==='backend')openBackend();
    if(action==='identity')openIdentity();
  });
  ['mmir-context-corrections-updated','mmir-context-correction-sync-updated','mmir-backend-profiles-updated','mmir-managed-session-updated','mmir-progress-dashboard-rendered','toggle'].forEach((eventName)=>{
    window.addEventListener(eventName,()=>window.setTimeout(render,0));
  });
  document.addEventListener('DOMContentLoaded',()=>window.setTimeout(render,0));
  window.setTimeout(render,800);
  window.MimirContextCorrectionSync={syncPreview,checkRoute,syncNow,deferSync,readSyncState};
})();
