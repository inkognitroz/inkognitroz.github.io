(function(){
  const api=window.MimirApiClient;
  const WORKSPACE_KEY='mimir-active-workspace-v1';
  const DEFAULT_WORKSPACE_ID='personal';
  const CORRECTION_PREFIX='mimir-context-corrections-v1:';
  const SYNC_PREFIX='mimir-context-correction-sync-v1:';
  const REVIEW_PREFIX='mimir-context-correction-review-v1:';
  const MAX_SYNC_EVENTS=50;
  if(!api)return;

  function safe(value){return String(value||'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');}
  function workspaceId(){return localStorage.getItem(WORKSPACE_KEY)||DEFAULT_WORKSPACE_ID;}
  function correctionKey(){return CORRECTION_PREFIX+workspaceId();}
  function syncKey(){return SYNC_PREFIX+workspaceId();}
  function reviewKey(){return REVIEW_PREFIX+workspaceId();}
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
  function writeReviewState(value){
    const state={
      workspace_id:workspaceId(),
      updated_at:new Date().toISOString(),
      provider_secrets_stored:false,
      raw_prompt_stored:false,
      raw_response_stored:false,
      no_paid_routes_started:true,
      public_frontend_authority:false,
      ...value
    };
    try{localStorage.setItem(reviewKey(),JSON.stringify(state));}catch(error){}
    window.dispatchEvent(new CustomEvent('mmir-context-correction-review-updated',{detail:state}));
    return state;
  }
  function readReviewState(){
    const value=readJson(reviewKey(),null);
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
      await loadReviewQueue({limit:10});
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
  async function loadReviewQueue(filters={}){
    const {profile,url}=currentBackend();
    if(!profile||!url){
      const state=writeReviewState({status:'needs-backend',message:'Choose an active protected backend before loading the correction review queue.',queue:null});
      render();
      return state;
    }
    const params=new URLSearchParams();
    params.set('workspace_id',workspaceId());
    params.set('limit',String(filters.limit||10));
    if(filters.target&&filters.target!=='all')params.set('target',filters.target);
    if(filters.action&&filters.action!=='all')params.set('action',filters.action);
    if(filters.include_undone===true)params.set('include_undone','true');
    try{
      const token=await tokenFor(profile,url);
      const queue=await api.fetchJson(api.joinUrl(url,'/context/corrections/review?'+params.toString()),{
        method:'GET',
        headers:api.authHeaders(token),
        timeoutMs:10000
      });
      const count=Array.isArray(queue?.data)?queue.data.length:0;
      const state=writeReviewState({
        status:'ready',
        backend_url:url,
        backend_provider:profile.provider||'backend',
        filters:queue?.filters||Object.fromEntries(params.entries()),
        queue,
        message:'Protected review queue loaded with '+count+' metadata item'+(count===1?'':'s')+'.'
      });
      render();
      return state;
    }catch(error){
      const state=writeReviewState({
        status:'error',
        backend_url:url,
        backend_provider:profile.provider||'backend',
        queue:null,
        message:api.friendlyError?.(error)||error.message||'Could not load protected correction review queue.'
      });
      render();
      return state;
    }
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
  function openReviewTarget(target){
    const selector=target==='knowledge'?'knowledge-panel':(target==='memory'?'memory-panel':'progress-dashboard');
    const element=document.getElementById(selector)||document.getElementById('progress-dashboard');
    if(element&&'open' in element)element.open=true;
    element?.scrollIntoView({behavior:'smooth',block:'start'});
  }
  function reviewQueueHtml(){
    const review=readReviewState();
    const queue=review?.queue&&typeof review.queue==='object'?review.queue:null;
    const summary=queue?.summary||{};
    const items=Array.isArray(queue?.data)?queue.data.slice(0,4):[];
    const status=review?.status||'idle';
    const active=Number(summary.active||0);
    const undone=Number(summary.undone||0);
    const total=Number(summary.total||0);
    return '<div class="context-correction-review-panel" data-state="'+safe(status)+'">'+
      '<div><p class="eyebrow">Owner review</p><h4>Review queue: '+safe(total)+' item'+(total===1?'':'s')+'</h4>'+
      '<small>'+safe(review?.message||'Load the protected review queue after syncing correction metadata. No raw prompt, raw response or provider secret is stored in the public client.')+'</small></div>'+
      '<div class="context-correction-review-filters">'+
        '<button type="button" data-correction-review="load" data-target-filter="all">All</button>'+
        '<button type="button" data-correction-review="load" data-target-filter="memory">Memory</button>'+
        '<button type="button" data-correction-review="load" data-target-filter="knowledge">Knowledge</button>'+
        '<button type="button" data-correction-review="load" data-include-undone="true">Include undone</button>'+
      '</div>'+
      '<div class="context-correction-review-summary"><span>Active '+safe(active)+'</span><span>Undone '+safe(undone)+'</span><span>Sources '+safe(summary.source_count||0)+'</span></div>'+
      '<div class="context-correction-review-list">'+(items.length?items.map((item)=>
        '<article data-review-status="'+safe(item.review_status||'needs-review')+'">'+
          '<div><strong>'+safe((item.target||'context')+' / '+(item.action||'correction'))+'</strong><small>priority '+safe(item.review_priority||0)+' / '+safe(item.id||'metadata')+'</small></div>'+
          '<p>'+safe(item.review_reason||'Correction metadata is ready for review.')+'</p>'+
          '<small>'+safe((Array.isArray(item.next_actions)?item.next_actions:[]).map((action)=>action.label).join(' / ')||'Open the related MMIR panel and review manually.')+'</small>'+
          '<button type="button" data-correction-review="open" data-review-target="'+safe(item.target||'context')+'">Open '+safe(item.target||'context')+'</button>'+
        '</article>'
      ).join(''):'<article><div><strong>No protected review queue loaded</strong><small>Sync metadata, then load review.</small></div><p>The public client only renders backend-owned metadata.</p></article>')+'</div>'+
      '<small class="context-correction-review-policy">public_frontend_authority:false / no_paid_routes_started:true / raw_prompt_stored:false / raw_response_stored:false / provider_secrets_stored:false</small>'+
    '</div>';
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
      reviewQueueHtml()+
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
  document.addEventListener('click',(event)=>{
    const button=event.target.closest('[data-correction-review]');
    if(!button)return;
    const action=button.dataset.correctionReview;
    if(action==='load'){
      loadReviewQueue({
        target:button.dataset.targetFilter||'all',
        include_undone:button.dataset.includeUndone==='true',
        limit:10
      });
    }
    if(action==='open')openReviewTarget(button.dataset.reviewTarget||'context');
  });
  ['mmir-context-corrections-updated','mmir-context-correction-sync-updated','mmir-context-correction-review-updated','mmir-backend-profiles-updated','mmir-managed-session-updated','mmir-progress-dashboard-rendered','toggle'].forEach((eventName)=>{
    window.addEventListener(eventName,()=>window.setTimeout(render,0));
  });
  document.addEventListener('DOMContentLoaded',()=>window.setTimeout(render,0));
  window.setTimeout(render,800);
  window.MimirContextCorrectionSync={syncPreview,checkRoute,syncNow,deferSync,loadReviewQueue,readSyncState,readReviewState};
})();
