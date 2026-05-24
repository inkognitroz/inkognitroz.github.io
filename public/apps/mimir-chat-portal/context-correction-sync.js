(function(){
  const api=window.MimirApiClient;
  const WORKSPACE_KEY='mimir-active-workspace-v1';
  const DEFAULT_WORKSPACE_ID='personal';
  const CORRECTION_PREFIX='mimir-context-corrections-v1:';
  const SYNC_PREFIX='mimir-context-correction-sync-v1:';
  const REVIEW_PREFIX='mimir-context-correction-review-v1:';
  const PLAN_PREFIX='mimir-context-correction-remediation-plan-v1:';
  const APPLY_PREFIX='mimir-context-correction-remediation-apply-v1:';
  const ADAPTER_PREFIX='mimir-context-correction-remediation-adapter-v1:';
  const MAX_SYNC_EVENTS=50;
  if(!api)return;

  function safe(value){return String(value||'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');}
  function workspaceId(){return localStorage.getItem(WORKSPACE_KEY)||DEFAULT_WORKSPACE_ID;}
  function correctionKey(){return CORRECTION_PREFIX+workspaceId();}
  function syncKey(){return SYNC_PREFIX+workspaceId();}
  function reviewKey(){return REVIEW_PREFIX+workspaceId();}
  function planKey(){return PLAN_PREFIX+workspaceId();}
  function applyKey(){return APPLY_PREFIX+workspaceId();}
  function adapterKey(){return ADAPTER_PREFIX+workspaceId();}
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
  function writePlanState(value){
    const state={
      workspace_id:workspaceId(),
      updated_at:new Date().toISOString(),
      provider_secrets_stored:false,
      raw_prompt_stored:false,
      raw_response_stored:false,
      no_paid_routes_started:true,
      public_frontend_authority:false,
      execution_allowed:false,
      ...value
    };
    try{localStorage.setItem(planKey(),JSON.stringify(state));}catch(error){}
    window.dispatchEvent(new CustomEvent('mmir-context-correction-plan-updated',{detail:state}));
    return state;
  }
  function readPlanState(){
    const value=readJson(planKey(),null);
    return value&&typeof value==='object'?value:null;
  }
  function writeApplyState(value){
    const state={
      workspace_id:workspaceId(),
      updated_at:new Date().toISOString(),
      provider_secrets_stored:false,
      raw_prompt_stored:false,
      raw_response_stored:false,
      no_paid_routes_started:true,
      public_frontend_authority:false,
      automatic_mutation_allowed:false,
      source_mutation_executed:false,
      ...value
    };
    try{localStorage.setItem(applyKey(),JSON.stringify(state));}catch(error){}
    window.dispatchEvent(new CustomEvent('mmir-context-correction-apply-updated',{detail:state}));
    return state;
  }
  function readApplyState(){
    const value=readJson(applyKey(),null);
    return value&&typeof value==='object'?value:null;
  }
  function writeAdapterState(value){
    const state={
      workspace_id:workspaceId(),
      updated_at:new Date().toISOString(),
      provider_secrets_stored:false,
      raw_prompt_stored:false,
      raw_response_stored:false,
      no_paid_routes_started:true,
      public_frontend_authority:false,
      automatic_mutation_allowed:false,
      source_mutation_executed:false,
      execution_allowed:false,
      ...value
    };
    try{localStorage.setItem(adapterKey(),JSON.stringify(state));}catch(error){}
    window.dispatchEvent(new CustomEvent('mmir-context-correction-adapter-updated',{detail:state}));
    return state;
  }
  function readAdapterState(){
    const value=readJson(adapterKey(),null);
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
  async function createRemediationPlan(filters={}){
    const {profile,url}=currentBackend();
    if(!profile||!url){
      const state=writePlanState({status:'needs-backend',message:'Choose an active protected backend before creating a remediation plan.',plan:null});
      render();
      return state;
    }
    const body={
      workspace_id:workspaceId(),
      limit:filters.limit||5,
      raw_prompt_stored:false,
      raw_response_stored:false,
      provider_secrets_stored:false
    };
    if(filters.correction_id)body.correction_id=cleanString(filters.correction_id,120);
    if(filters.target&&filters.target!=='all')body.target=cleanString(filters.target,40);
    if(filters.action&&filters.action!=='all')body.action=cleanString(filters.action,60);
    if(filters.include_undone===true)body.include_undone=true;
    try{
      const token=await tokenFor(profile,url);
      const response=await api.fetchJson(api.joinUrl(url,'/context/corrections/remediation-plans'),{
        method:'POST',
        headers:api.authHeaders(token),
        body:JSON.stringify(body),
        timeoutMs:10000
      });
      const plan=response?.data||null;
      const stepCount=Array.isArray(plan?.steps)?plan.steps.length:0;
      const state=writePlanState({
        status:'draft',
        backend_url:url,
        backend_provider:profile.provider||'backend',
        plan,
        message:'Draft remediation plan created with '+stepCount+' explicit step'+(stepCount===1?'':'s')+'. Execution remains blocked.'
      });
      render();
      return state;
    }catch(error){
      const state=writePlanState({
        status:'error',
        backend_url:url,
        backend_provider:profile.provider||'backend',
        plan:null,
        message:api.friendlyError?.(error)||error.message||'Could not create remediation plan.'
      });
      render();
      return state;
    }
  }
  function approvePlan(){
    const state=readPlanState();
    if(!state?.plan)return;
    writePlanState({...state,status:'approved-local',message:'Plan approval note stored locally. Use Apply gate on one step to send an explicit protected confirmation.'});
    render();
  }
  function deferPlan(){
    const state=readPlanState();
    writePlanState({...state,status:'deferred',message:'Remediation plan deferred. No backend change or paid route was started.'});
    render();
  }
  function correctionIdForStep(plan,stepId){
    const id=cleanString(stepId,180);
    const ids=Array.isArray(plan?.correction_ids)?plan.correction_ids.map((item)=>cleanString(item,120)).filter(Boolean):[];
    return ids.find((item)=>id===item||id.startsWith(item+':'))||cleanString(id.split(':')[0],120);
  }
  async function prepareRemediationAdapter(applicationId='',correctionId='',stepId=''){
    const applyState=readApplyState();
    const application=applyState?.application&&typeof applyState.application==='object'?applyState.application:null;
    const cleanApplicationId=cleanString(applicationId||application?.id,120);
    const cleanCorrectionId=cleanString(correctionId||application?.correction_id,120);
    const cleanStepId=cleanString(stepId||application?.step_id,180);
    if(!cleanApplicationId){
      const state=writeAdapterState({status:'needs-application',message:'Apply one remediation gate before preparing a protected adapter draft.',application_id:'',correction_id:cleanCorrectionId,step_id:cleanStepId});
      render();
      return state;
    }
    const {profile,url}=currentBackend();
    if(!profile||!url){
      const state=writeAdapterState({status:'needs-backend',message:'Choose an active protected backend before preparing remediation adapters.',application_id:cleanApplicationId,correction_id:cleanCorrectionId,step_id:cleanStepId});
      render();
      return state;
    }
    const body={
      workspace_id:workspaceId(),
      application_id:cleanApplicationId,
      confirm:true,
      raw_prompt_stored:false,
      raw_response_stored:false,
      provider_secrets_stored:false
    };
    if(cleanCorrectionId)body.correction_id=cleanCorrectionId;
    if(cleanStepId)body.step_id=cleanStepId;
    try{
      const token=await tokenFor(profile,url);
      const response=await api.fetchJson(api.joinUrl(url,'/context/corrections/remediation-adapters/prepare'),{
        method:'POST',
        headers:api.authHeaders(token),
        body:JSON.stringify(body),
        timeoutMs:10000
      });
      const draft=response?.data||null;
      const state=writeAdapterState({
        status:draft?.status||'draft',
        backend_url:url,
        backend_provider:profile.provider||'backend',
        application_id:cleanApplicationId,
        correction_id:cleanCorrectionId,
        step_id:cleanStepId,
        draft,
        message:draft?'Protected '+(draft.adapter||'remediation adapter')+' draft prepared. Review proposed changes before any source mutation.':'Protected remediation adapter draft prepared.'
      });
      render();
      return state;
    }catch(error){
      const state=writeAdapterState({
        status:'error',
        backend_url:url,
        backend_provider:profile.provider||'backend',
        application_id:cleanApplicationId,
        correction_id:cleanCorrectionId,
        step_id:cleanStepId,
        message:api.friendlyError?.(error)||error.message||'Could not prepare protected remediation adapter draft.'
      });
      render();
      return state;
    }
  }
  async function applyRemediationStep(stepId,correctionId){
    const planState=readPlanState();
    const plan=planState?.plan&&typeof planState.plan==='object'?planState.plan:null;
    const cleanStepId=cleanString(stepId,180);
    const cleanCorrectionId=cleanString(correctionId||correctionIdForStep(plan,cleanStepId),120);
    if(!plan||!cleanStepId||!cleanCorrectionId){
      const state=writeApplyState({status:'needs-plan',message:'Create a remediation plan before applying a protected step gate.',step_id:cleanStepId,correction_id:cleanCorrectionId});
      render();
      return state;
    }
    const {profile,url}=currentBackend();
    if(!profile||!url){
      const state=writeApplyState({status:'needs-backend',message:'Choose an active protected backend before applying remediation gates.',step_id:cleanStepId,correction_id:cleanCorrectionId});
      render();
      return state;
    }
    const body={
      workspace_id:workspaceId(),
      correction_id:cleanCorrectionId,
      step_id:cleanStepId,
      confirm:true,
      raw_prompt_stored:false,
      raw_response_stored:false,
      provider_secrets_stored:false
    };
    try{
      const token=await tokenFor(profile,url);
      const response=await api.fetchJson(api.joinUrl(url,'/context/corrections/remediation-steps/apply'),{
        method:'POST',
        headers:api.authHeaders(token),
        body:JSON.stringify(body),
        timeoutMs:10000
      });
      const application=response?.data||null;
      const mutation=Boolean(application?.mutation_executed);
      const sourceMutation=Boolean(application?.source_mutation_executed);
      const state=writeApplyState({
        status:application?.status||'recorded',
        backend_url:url,
        backend_provider:profile.provider||'backend',
        application,
        correction_id:cleanCorrectionId,
        step_id:cleanStepId,
        mutation_executed:mutation,
        source_mutation_executed:sourceMutation,
        message:mutation?'Protected correction undo gate applied. Source data was not mutated by the public frontend.':'Protected remediation gate recorded. Review the manual target before any source data is changed.'
      });
      if(application?.id)await prepareRemediationAdapter(application.id,application.correction_id,application.step_id);
      await loadReviewQueue({limit:10,include_undone:true});
      render();
      return state;
    }catch(error){
      const state=writeApplyState({
        status:'error',
        backend_url:url,
        backend_provider:profile.provider||'backend',
        correction_id:cleanCorrectionId,
        step_id:cleanStepId,
        message:api.friendlyError?.(error)||error.message||'Could not apply the protected remediation gate.'
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
          '<div class="context-correction-review-row-actions"><button type="button" data-correction-review="open" data-review-target="'+safe(item.target||'context')+'">Open '+safe(item.target||'context')+'</button><button type="button" data-correction-plan="create" data-correction-id="'+safe(item.id||'')+'">Plan repair</button></div>'+
        '</article>'
      ).join(''):'<article><div><strong>No protected review queue loaded</strong><small>Sync metadata, then load review.</small></div><p>The public client only renders backend-owned metadata.</p></article>')+'</div>'+
      '<small class="context-correction-review-policy">public_frontend_authority:false / no_paid_routes_started:true / raw_prompt_stored:false / raw_response_stored:false / provider_secrets_stored:false</small>'+
    '</div>';
  }
  function adapterDraftHtml(){
    const state=readAdapterState();
    const applyState=readApplyState();
    const application=applyState?.application&&typeof applyState.application==='object'?applyState.application:null;
    const draft=state?.draft&&typeof state.draft==='object'?state.draft:null;
    const changes=Array.isArray(draft?.proposed_changes)?draft.proposed_changes.slice(0,4):[];
    const status=state?.status||'idle';
    return '<div class="context-correction-adapter-status" data-state="'+safe(status)+'">'+
      '<div><strong>Repair draft: '+safe(draft?.adapter||status)+'</strong><small>'+safe(state?.message||'Apply a gate to automatically prepare a protected memory/knowledge repair draft.')+'</small></div>'+
      '<div class="context-correction-plan-actions"><button type="button" data-correction-adapter="prepare" '+(!application?'disabled':'')+'>Prepare adapter</button></div>'+
      '<div class="context-correction-adapter-changes">'+(changes.length?changes.map((change)=>
        '<article><strong>'+safe(change.type||'metadata-draft')+'</strong><p>'+safe(change.note||change.suggested_policy||'Review this backend-owned metadata draft before changing source state.')+'</p><small>source_ids:'+safe((change.source_ids||change.memory_ids||[]).join(', ')||'none')+' / manual_review_required:'+safe(Boolean(change.manual_review_required))+'</small></article>'
      ).join(''):'<article><strong>No adapter draft yet</strong><p>Confirmed apply receipts can be converted into memory scope drafts, knowledge source packets or collection split proposals.</p><small>execution_allowed:false / source_mutation_executed:false</small></article>')+'</div>'+
      '<small class="context-correction-review-policy">execution_allowed:false / source_mutation_executed:false / public_frontend_authority:false / provider_secrets_stored:false</small>'+
    '</div>';
  }
  function remediationPlanHtml(){
    const state=readPlanState();
    const applyState=readApplyState();
    const plan=state?.plan&&typeof state.plan==='object'?state.plan:null;
    const steps=Array.isArray(plan?.steps)?plan.steps.slice(0,6):[];
    const status=state?.status||'idle';
    const application=applyState?.application&&typeof applyState.application==='object'?applyState.application:null;
    const applyStatus=applyState?.status||'idle';
    return '<div class="context-correction-plan-panel" data-state="'+safe(status)+'">'+
      '<div><p class="eyebrow">Remediation plan</p><h4>'+safe(plan?.status?('Plan '+plan.status):'No draft plan yet')+'</h4>'+
      '<small>'+safe(state?.message||'Create an explicit repair plan from the protected review queue. Plans do not execute changes from GitHub Pages.')+'</small></div>'+
      '<div class="context-correction-plan-actions">'+
        '<button type="button" data-correction-plan="create" data-target-filter="all">Plan all</button>'+
        '<button type="button" data-correction-plan="create" data-target-filter="memory">Plan memory</button>'+
        '<button type="button" data-correction-plan="create" data-target-filter="knowledge">Plan knowledge</button>'+
        '<button type="button" data-correction-plan="approve" '+(!plan?'disabled':'')+'>Approve note</button>'+
        '<button type="button" data-correction-plan="defer">Defer</button>'+
      '</div>'+
      '<div class="context-correction-apply-status" data-state="'+safe(applyStatus)+'">'+
        '<strong>Apply gate: '+safe(applyStatus)+'</strong>'+
        '<small>'+safe(applyState?.message||'Each step can be explicitly confirmed against the protected backend. Public frontend authority remains false.')+'</small>'+
        (application?'<small>step:'+safe(application.step_kind||application.step_id||'recorded')+' / mutation_executed:'+safe(Boolean(application.mutation_executed))+' / source_mutation_executed:'+safe(Boolean(application.source_mutation_executed))+' / rollback:'+safe(application.rollback_hint||'manual review')+'</small>':'')+
      '</div>'+
      adapterDraftHtml()+
      '<div class="context-correction-plan-steps">'+(steps.length?steps.map((step)=>
        '<article><strong>'+safe(step.title||step.id)+'</strong><p>'+safe(step.detail||'Review this step manually before any mutation.')+'</p><small>target:'+safe(step.target||'context')+' / execution_allowed:'+safe(Boolean(step.execution_allowed))+' / confirmation:'+safe(Boolean(step.requires_confirmation))+'</small><button type="button" data-correction-apply="apply" data-correction-id="'+safe(correctionIdForStep(plan,step.id||''))+'" data-step-id="'+safe(step.id||'')+'">Apply gate</button></article>'
      ).join(''):'<article><strong>No plan steps</strong><p>Create a draft plan after loading correction review items.</p><small>execution_allowed:false / destructive_execution_allowed:false</small></article>')+'</div>'+
      '<small class="context-correction-review-policy">public_frontend_authority:false / automatic_mutation_allowed:false / source_mutation_executed:false / no_paid_routes_started:true</small>'+
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
      remediationPlanHtml()+
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
  document.addEventListener('click',(event)=>{
    const button=event.target.closest('[data-correction-plan]');
    if(!button)return;
    const action=button.dataset.correctionPlan;
    if(action==='create'){
      createRemediationPlan({
        correction_id:button.dataset.correctionId||'',
        target:button.dataset.targetFilter||'all',
        limit:button.dataset.correctionId?1:5
      });
    }
    if(action==='approve')approvePlan();
    if(action==='defer')deferPlan();
  });
  document.addEventListener('click',(event)=>{
    const button=event.target.closest('[data-correction-apply]');
    if(!button)return;
    const action=button.dataset.correctionApply;
    if(action==='apply')applyRemediationStep(button.dataset.stepId||'',button.dataset.correctionId||'');
  });
  document.addEventListener('click',(event)=>{
    const button=event.target.closest('[data-correction-adapter]');
    if(!button)return;
    const action=button.dataset.correctionAdapter;
    if(action==='prepare')prepareRemediationAdapter();
  });
  ['mmir-context-corrections-updated','mmir-context-correction-sync-updated','mmir-context-correction-review-updated','mmir-context-correction-plan-updated','mmir-context-correction-apply-updated','mmir-context-correction-adapter-updated','mmir-backend-profiles-updated','mmir-managed-session-updated','mmir-progress-dashboard-rendered','toggle'].forEach((eventName)=>{
    window.addEventListener(eventName,()=>window.setTimeout(render,0));
  });
  document.addEventListener('DOMContentLoaded',()=>window.setTimeout(render,0));
  window.setTimeout(render,800);
  window.MimirContextCorrectionSync={syncPreview,checkRoute,syncNow,deferSync,loadReviewQueue,createRemediationPlan,approvePlan,deferPlan,applyRemediationStep,prepareRemediationAdapter,readSyncState,readReviewState,readPlanState,readApplyState,readAdapterState};
})();
