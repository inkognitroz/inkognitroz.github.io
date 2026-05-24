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
  const COMMIT_PREFIX='mimir-context-correction-remediation-commit-v1:';
  const EXECUTION_PREFIX='mimir-context-correction-remediation-execution-v1:';
  const ROLLBACK_PREFIX='mimir-context-correction-remediation-rollback-v1:';
  const KNOWLEDGE_SOURCE_PREFIX='mimir-context-correction-knowledge-source-model-v1:';
  const KNOWLEDGE_EXECUTION_PREFIX='mimir-context-correction-knowledge-execution-v1:';
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
  function commitKey(){return COMMIT_PREFIX+workspaceId();}
  function executionKey(){return EXECUTION_PREFIX+workspaceId();}
  function rollbackKey(){return ROLLBACK_PREFIX+workspaceId();}
  function knowledgeSourceKey(){return KNOWLEDGE_SOURCE_PREFIX+workspaceId();}
  function knowledgeExecutionKey(){return KNOWLEDGE_EXECUTION_PREFIX+workspaceId();}
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
  function writeCommitState(value){
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
      source_mutation_allowed:false,
      ...value
    };
    try{localStorage.setItem(commitKey(),JSON.stringify(state));}catch(error){}
    window.dispatchEvent(new CustomEvent('mmir-context-correction-commit-updated',{detail:state}));
    return state;
  }
  function readCommitState(){
    const value=readJson(commitKey(),null);
    return value&&typeof value==='object'?value:null;
  }
  function writeExecutionState(value){
    const state={
      workspace_id:workspaceId(),
      updated_at:new Date().toISOString(),
      provider_secrets_stored:false,
      raw_prompt_stored:false,
      raw_response_stored:false,
      no_paid_routes_started:true,
      public_frontend_authority:false,
      automatic_mutation_allowed:false,
      backend_only_execution:true,
      ...value
    };
    try{localStorage.setItem(executionKey(),JSON.stringify(state));}catch(error){}
    window.dispatchEvent(new CustomEvent('mmir-context-correction-execution-updated',{detail:state}));
    return state;
  }
  function readExecutionState(){
    const value=readJson(executionKey(),null);
    return value&&typeof value==='object'?value:null;
  }
  function writeRollbackState(value){
    const state={
      workspace_id:workspaceId(),
      updated_at:new Date().toISOString(),
      provider_secrets_stored:false,
      raw_prompt_stored:false,
      raw_response_stored:false,
      no_paid_routes_started:true,
      public_frontend_authority:false,
      automatic_mutation_allowed:false,
      backend_only_rollback:true,
      ...value
    };
    try{localStorage.setItem(rollbackKey(),JSON.stringify(state));}catch(error){}
    window.dispatchEvent(new CustomEvent('mmir-context-correction-rollback-updated',{detail:state}));
    return state;
  }
  function readRollbackState(){
    const value=readJson(rollbackKey(),null);
    return value&&typeof value==='object'?value:null;
  }
  function writeKnowledgeSourceState(value){
    const state={
      workspace_id:workspaceId(),
      updated_at:new Date().toISOString(),
      provider_secrets_stored:false,
      raw_prompt_stored:false,
      raw_response_stored:false,
      document_text_stored:false,
      no_paid_routes_started:true,
      public_frontend_authority:false,
      automatic_mutation_allowed:false,
      source_mutation_allowed:false,
      source_mutation_executed:false,
      knowledge_execution_supported:false,
      ...value
    };
    try{localStorage.setItem(knowledgeSourceKey(),JSON.stringify(state));}catch(error){}
    window.dispatchEvent(new CustomEvent('mmir-context-correction-knowledge-source-model-updated',{detail:state}));
    return state;
  }
  function readKnowledgeSourceState(){
    const value=readJson(knowledgeSourceKey(),null);
    return value&&typeof value==='object'?value:null;
  }
  function writeKnowledgeExecutionState(value){
    const state={
      workspace_id:workspaceId(),
      updated_at:new Date().toISOString(),
      provider_secrets_stored:false,
      raw_prompt_stored:false,
      raw_response_stored:false,
      document_text_stored:false,
      no_paid_routes_started:true,
      public_frontend_authority:false,
      automatic_mutation_allowed:false,
      backend_only_execution:true,
      source_mutation_allowed:false,
      source_mutation_executed:false,
      knowledge_execution_supported:false,
      ...value
    };
    try{localStorage.setItem(knowledgeExecutionKey(),JSON.stringify(state));}catch(error){}
    window.dispatchEvent(new CustomEvent('mmir-context-correction-knowledge-execution-updated',{detail:state}));
    return state;
  }
  function readKnowledgeExecutionState(){
    const value=readJson(knowledgeExecutionKey(),null);
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
      if(draft?.application_id)await previewRemediationCommit(draft.application_id,draft.correction_id,draft.step_id);
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
  async function commitPolicyRequest(mode='preview',applicationId='',correctionId='',stepId=''){
    const adapterState=readAdapterState();
    const applyState=readApplyState();
    const commitState=readCommitState();
    const draft=adapterState?.draft&&typeof adapterState.draft==='object'?adapterState.draft:null;
    const application=applyState?.application&&typeof applyState.application==='object'?applyState.application:null;
    const cleanApplicationId=cleanString(applicationId||draft?.application_id||application?.id,120);
    const cleanCorrectionId=cleanString(correctionId||draft?.correction_id||application?.correction_id,120);
    const cleanStepId=cleanString(stepId||draft?.step_id||application?.step_id,180);
    const isCommit=mode==='commit';
    if(!cleanApplicationId){
      const state=writeCommitState({status:'needs-application',message:'Prepare a protected adapter draft before previewing commit policy.',application_id:'',correction_id:cleanCorrectionId,step_id:cleanStepId});
      render();
      return state;
    }
    const {profile,url}=currentBackend();
    if(!profile||!url){
      const state=writeCommitState({status:'needs-backend',message:'Choose an active protected backend before previewing remediation commit policy.',application_id:cleanApplicationId,correction_id:cleanCorrectionId,step_id:cleanStepId});
      render();
      return state;
    }
    const body={
      workspace_id:workspaceId(),
      application_id:cleanApplicationId,
      preview:!isCommit,
      confirm:isCommit,
      raw_prompt_stored:false,
      raw_response_stored:false,
      provider_secrets_stored:false
    };
    if(cleanCorrectionId)body.correction_id=cleanCorrectionId;
    if(cleanStepId)body.step_id=cleanStepId;
    if(isCommit){
      const previewId=cleanString(commitState?.preview?.id,120);
      if(!previewId){
        const state=writeCommitState({status:'needs-preview',message:'Preview the protected commit policy before recording a commit receipt.',application_id:cleanApplicationId,correction_id:cleanCorrectionId,step_id:cleanStepId});
        render();
        return state;
      }
      body.preview_id=previewId;
    }
    try{
      const token=await tokenFor(profile,url);
      const response=await api.fetchJson(api.joinUrl(url,'/context/corrections/remediation-adapters/commit'),{
        method:'POST',
        headers:api.authHeaders(token),
        body:JSON.stringify(body),
        timeoutMs:10000
      });
      const data=response?.data||null;
      const state=isCommit?writeCommitState({
        status:data?.status||'committed',
        backend_url:url,
        backend_provider:profile.provider||'backend',
        application_id:cleanApplicationId,
        correction_id:cleanCorrectionId,
        step_id:cleanStepId,
        preview:commitState?.preview||null,
        commit:data,
        message:data?'Protected remediation commit receipt recorded. Source mutation remains disabled until a backend-only execution policy exists.':'Protected remediation commit receipt recorded.'
      }):writeCommitState({
        status:data?.status||'preview',
        backend_url:url,
        backend_provider:profile.provider||'backend',
        application_id:cleanApplicationId,
        correction_id:cleanCorrectionId,
        step_id:cleanStepId,
        preview:data,
        commit:null,
        message:data?'Protected commit preview ready. Confirming records policy and rollback metadata only.':'Protected commit preview ready.'
      });
      if(isCommit&&data?.id){
        if(data?.target==='knowledge')await previewKnowledgeSourceModel(data.id);
        else await previewRemediationExecution(data.id);
      }
      render();
      return state;
    }catch(error){
      const state=writeCommitState({
        status:'error',
        backend_url:url,
        backend_provider:profile.provider||'backend',
        application_id:cleanApplicationId,
        correction_id:cleanCorrectionId,
        step_id:cleanStepId,
        message:api.friendlyError?.(error)||error.message||'Could not preview or commit remediation policy.'
      });
      render();
      return state;
    }
  }
  function previewRemediationCommit(applicationId='',correctionId='',stepId=''){
    return commitPolicyRequest('preview',applicationId,correctionId,stepId);
  }
  function commitRemediationAdapter(applicationId='',correctionId='',stepId=''){
    return commitPolicyRequest('commit',applicationId,correctionId,stepId);
  }
  async function knowledgeSourceModelRequest(mode='preview',commitId=''){
    const commitState=readCommitState();
    const sourceState=readKnowledgeSourceState();
    const commit=commitState?.commit&&typeof commitState.commit==='object'?commitState.commit:null;
    const cleanCommitId=cleanString(commitId||commit?.id,120);
    const isRecord=mode==='record';
    const decision=commit?.adapter==='knowledge-collection-split-adapter'?'split-collection':'review-source';
    if(!cleanCommitId||commit?.target!=='knowledge'){
      const state=writeKnowledgeSourceState({status:'needs-knowledge-commit',message:'Record a protected knowledge commit before preparing a source model.',commit_id:cleanCommitId});
      render();
      return state;
    }
    const {profile,url}=currentBackend();
    if(!profile||!url){
      const state=writeKnowledgeSourceState({status:'needs-backend',message:'Choose an active protected backend before preparing knowledge source models.',commit_id:cleanCommitId});
      render();
      return state;
    }
    const body={
      workspace_id:workspaceId(),
      commit_id:cleanCommitId,
      decision,
      preview:!isRecord,
      confirm:isRecord,
      raw_prompt_stored:false,
      raw_response_stored:false,
      document_text_stored:false,
      provider_secrets_stored:false
    };
    if(isRecord){
      const previewId=cleanString(sourceState?.preview?.id,120);
      if(!previewId){
        const state=writeKnowledgeSourceState({status:'needs-preview',message:'Preview the knowledge source model before recording it.',commit_id:cleanCommitId});
        render();
        return state;
      }
      body.knowledge_source_preview_id=previewId;
      body.review_note='Public UI recorded a metadata-only knowledge source model. Knowledge execution requires a separate backend-only preview and confirmation.';
    }
    try{
      const token=await tokenFor(profile,url);
      const response=await api.fetchJson(api.joinUrl(url,'/context/corrections/remediation-knowledge-sources/model'),{
        method:'POST',
        headers:api.authHeaders(token),
        body:JSON.stringify(body),
        timeoutMs:10000
      });
      const data=response?.data||null;
      const state=isRecord?writeKnowledgeSourceState({
        status:data?.status||'recorded',
        backend_url:url,
        backend_provider:profile.provider||'backend',
        commit_id:cleanCommitId,
        preview:sourceState?.preview||null,
        model:data,
        source_mutation_executed:false,
        message:'Knowledge source model recorded. Preview the backend-only knowledge execution gate before any source metadata mutation.'
      }):writeKnowledgeSourceState({
        status:data?.status||'preview',
        backend_url:url,
        backend_provider:profile.provider||'backend',
        commit_id:cleanCommitId,
        preview:data,
        model:null,
        source_mutation_allowed:false,
        message:data?.supported?'Knowledge source model preview ready with metadata-only source status and rollback plan.':'Knowledge source model preview is blocked: '+(data?.blocked_reason||'missing knowledge source metadata.')
      });
      if(isRecord&&data?.id)await previewKnowledgeExecution(data.id);
      render();
      return state;
    }catch(error){
      const state=writeKnowledgeSourceState({
        status:'error',
        backend_url:url,
        backend_provider:profile.provider||'backend',
        commit_id:cleanCommitId,
        message:api.friendlyError?.(error)||error.message||'Could not preview or record knowledge source model.'
      });
      render();
      return state;
    }
  }
  function previewKnowledgeSourceModel(commitId=''){
    return knowledgeSourceModelRequest('preview',commitId);
  }
  function recordKnowledgeSourceModel(commitId=''){
    return knowledgeSourceModelRequest('record',commitId);
  }
  async function knowledgeExecutionRequest(mode='preview',modelId=''){
    const sourceState=readKnowledgeSourceState();
    const executionState=readKnowledgeExecutionState();
    const model=sourceState?.model&&typeof sourceState.model==='object'?sourceState.model:null;
    const cleanModelId=cleanString(modelId||model?.id,120);
    const isExecute=mode==='execute';
    if(!cleanModelId){
      const state=writeKnowledgeExecutionState({status:'needs-source-model',message:'Record a protected knowledge source model before previewing execution.',model_id:''});
      render();
      return state;
    }
    const {profile,url}=currentBackend();
    if(!profile||!url){
      const state=writeKnowledgeExecutionState({status:'needs-backend',message:'Choose an active protected backend before executing knowledge source metadata changes.',model_id:cleanModelId});
      render();
      return state;
    }
    const body={
      workspace_id:workspaceId(),
      model_id:cleanModelId,
      preview:!isExecute,
      confirm:isExecute,
      execute_source_mutation:isExecute,
      raw_prompt_stored:false,
      raw_response_stored:false,
      document_text_stored:false,
      provider_secrets_stored:false
    };
    if(isExecute){
      const previewId=cleanString(executionState?.preview?.id,120);
      if(!previewId){
        const state=writeKnowledgeExecutionState({status:'needs-preview',message:'Preview backend-only knowledge execution before applying source metadata updates.',model_id:cleanModelId});
        render();
        return state;
      }
      body.execution_preview_id=previewId;
    }
    try{
      const token=await tokenFor(profile,url);
      const response=await api.fetchJson(api.joinUrl(url,'/context/corrections/remediation-knowledge-executions/apply'),{
        method:'POST',
        headers:api.authHeaders(token),
        body:JSON.stringify(body),
        timeoutMs:10000
      });
      const data=response?.data||null;
      const state=isExecute?writeKnowledgeExecutionState({
        status:data?.status||'applied',
        backend_url:url,
        backend_provider:profile.provider||'backend',
        model_id:cleanModelId,
        preview:executionState?.preview||null,
        execution:data,
        source_mutation_executed:Boolean(data?.source_mutation_executed),
        knowledge_execution_supported:true,
        message:data?.source_mutation_executed?'Backend-only knowledge metadata repair applied with rollback metadata captured.':'Knowledge execution recorded without source mutation.'
      }):writeKnowledgeExecutionState({
        status:data?.status||'preview',
        backend_url:url,
        backend_provider:profile.provider||'backend',
        model_id:cleanModelId,
        preview:data,
        execution:null,
        source_mutation_allowed:Boolean(data?.policy?.source_mutation_allowed),
        knowledge_execution_supported:Boolean(data?.supported),
        message:data?.supported?'Backend-only knowledge execution preview ready for owned source status and collection metadata.':'Knowledge execution preview is blocked: '+(data?.blocked_reason||'unsupported source model.')
      });
      if(isExecute)await loadReviewQueue({limit:10,include_undone:true});
      render();
      return state;
    }catch(error){
      const state=writeKnowledgeExecutionState({
        status:'error',
        backend_url:url,
        backend_provider:profile.provider||'backend',
        model_id:cleanModelId,
        message:api.friendlyError?.(error)||error.message||'Could not preview or execute knowledge source metadata gate.'
      });
      render();
      return state;
    }
  }
  function previewKnowledgeExecution(modelId=''){
    return knowledgeExecutionRequest('preview',modelId);
  }
  function executeKnowledgeExecution(modelId=''){
    return knowledgeExecutionRequest('execute',modelId);
  }
  async function executionPolicyRequest(mode='preview',commitId=''){
    const commitState=readCommitState();
    const executionState=readExecutionState();
    const commit=commitState?.commit&&typeof commitState.commit==='object'?commitState.commit:null;
    const cleanCommitId=cleanString(commitId||commit?.id,120);
    const isExecute=mode==='execute';
    if(!cleanCommitId){
      const state=writeExecutionState({status:'needs-commit',message:'Record a protected commit receipt before previewing source execution.',commit_id:''});
      render();
      return state;
    }
    const {profile,url}=currentBackend();
    if(!profile||!url){
      const state=writeExecutionState({status:'needs-backend',message:'Choose an active protected backend before executing remediation commits.',commit_id:cleanCommitId});
      render();
      return state;
    }
    const body={
      workspace_id:workspaceId(),
      commit_id:cleanCommitId,
      preview:!isExecute,
      confirm:isExecute,
      execute_source_mutation:isExecute,
      raw_prompt_stored:false,
      raw_response_stored:false,
      provider_secrets_stored:false
    };
    if(isExecute){
      const previewId=cleanString(executionState?.preview?.id,120);
      if(!previewId){
        const state=writeExecutionState({status:'needs-preview',message:'Preview backend-only execution before applying memory repair.',commit_id:cleanCommitId});
        render();
        return state;
      }
      body.execution_preview_id=previewId;
    }
    try{
      const token=await tokenFor(profile,url);
      const response=await api.fetchJson(api.joinUrl(url,'/context/corrections/remediation-executions/apply'),{
        method:'POST',
        headers:api.authHeaders(token),
        body:JSON.stringify(body),
        timeoutMs:10000
      });
      const data=response?.data||null;
      const state=isExecute?writeExecutionState({
        status:data?.status||'applied',
        backend_url:url,
        backend_provider:profile.provider||'backend',
        commit_id:cleanCommitId,
        preview:executionState?.preview||null,
        execution:data,
        source_mutation_executed:Boolean(data?.source_mutation_executed),
        message:data?.source_mutation_executed?'Backend-only memory repair applied with rollback metadata captured.':'Execution recorded without source mutation.'
      }):writeExecutionState({
        status:data?.status||'preview',
        backend_url:url,
        backend_provider:profile.provider||'backend',
        commit_id:cleanCommitId,
        preview:data,
        execution:null,
        source_mutation_allowed:Boolean(data?.policy?.source_mutation_allowed),
        message:data?.supported?'Backend-only execution preview ready for supported memory repair.':'Execution preview is blocked: '+(data?.blocked_reason||'unsupported repair target.')
      });
      if(isExecute)await loadReviewQueue({limit:10,include_undone:true});
      if(isExecute&&data?.id)await previewRemediationRollback(data.id);
      render();
      return state;
    }catch(error){
      const state=writeExecutionState({
        status:'error',
        backend_url:url,
        backend_provider:profile.provider||'backend',
        commit_id:cleanCommitId,
        message:api.friendlyError?.(error)||error.message||'Could not preview or execute remediation source gate.'
      });
      render();
      return state;
    }
  }
  function previewRemediationExecution(commitId=''){
    return executionPolicyRequest('preview',commitId);
  }
  function executeRemediationCommit(commitId=''){
    return executionPolicyRequest('execute',commitId);
  }
  async function rollbackPolicyRequest(mode='preview',executionId=''){
    const executionState=readExecutionState();
    const rollbackState=readRollbackState();
    const execution=executionState?.execution&&typeof executionState.execution==='object'?executionState.execution:null;
    const cleanExecutionId=cleanString(executionId||execution?.id,120);
    const isApply=mode==='apply';
    if(!cleanExecutionId){
      const state=writeRollbackState({status:'needs-execution',message:'Apply a supported remediation execution before previewing rollback.',execution_id:''});
      render();
      return state;
    }
    const {profile,url}=currentBackend();
    if(!profile||!url){
      const state=writeRollbackState({status:'needs-backend',message:'Choose an active protected backend before rolling back remediation execution.',execution_id:cleanExecutionId});
      render();
      return state;
    }
    const body={
      workspace_id:workspaceId(),
      execution_id:cleanExecutionId,
      preview:!isApply,
      confirm:isApply,
      execute_rollback:isApply,
      raw_prompt_stored:false,
      raw_response_stored:false,
      provider_secrets_stored:false
    };
    if(isApply){
      const previewId=cleanString(rollbackState?.preview?.id,120);
      if(!previewId){
        const state=writeRollbackState({status:'needs-preview',message:'Preview backend-only rollback before restoring memory metadata.',execution_id:cleanExecutionId});
        render();
        return state;
      }
      body.rollback_preview_id=previewId;
    }
    try{
      const token=await tokenFor(profile,url);
      const response=await api.fetchJson(api.joinUrl(url,'/context/corrections/remediation-rollbacks/apply'),{
        method:'POST',
        headers:api.authHeaders(token),
        body:JSON.stringify(body),
        timeoutMs:10000
      });
      const data=response?.data||null;
      const state=isApply?writeRollbackState({
        status:data?.status||'rolled-back',
        backend_url:url,
        backend_provider:profile.provider||'backend',
        execution_id:cleanExecutionId,
        preview:rollbackState?.preview||null,
        rollback:data,
        source_mutation_executed:Boolean(data?.source_mutation_executed),
        message:data?.source_mutation_executed?'Rollback applied by protected backend and memory metadata restored.':'Rollback recorded without source mutation.'
      }):writeRollbackState({
        status:data?.status||'preview',
        backend_url:url,
        backend_provider:profile.provider||'backend',
        execution_id:cleanExecutionId,
        preview:data,
        rollback:null,
        source_mutation_allowed:Boolean(data?.supported),
        message:data?.supported?'Backend-only rollback preview ready for supported memory restore.':'Rollback preview is blocked: '+(data?.blocked_reason||'unsupported rollback target.')
      });
      if(isApply)await loadReviewQueue({limit:10,include_undone:true});
      render();
      return state;
    }catch(error){
      const state=writeRollbackState({
        status:'error',
        backend_url:url,
        backend_provider:profile.provider||'backend',
        execution_id:cleanExecutionId,
        message:api.friendlyError?.(error)||error.message||'Could not preview or apply remediation rollback gate.'
      });
      render();
      return state;
    }
  }
  function previewRemediationRollback(executionId=''){
    return rollbackPolicyRequest('preview',executionId);
  }
  function applyRemediationRollback(executionId=''){
    return rollbackPolicyRequest('apply',executionId);
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
  function commitPolicyHtml(){
    const state=readCommitState();
    const adapterState=readAdapterState();
    const draft=adapterState?.draft&&typeof adapterState.draft==='object'?adapterState.draft:null;
    const preview=state?.preview&&typeof state.preview==='object'?state.preview:null;
    const commit=state?.commit&&typeof state.commit==='object'?state.commit:null;
    const checks=Array.isArray(preview?.checks)?preview.checks.slice(0,5):[];
    const changes=Array.isArray(commit?.committed_changes)?commit.committed_changes.slice(0,3):(Array.isArray(preview?.proposed_changes)?preview.proposed_changes.slice(0,3):[]);
    const status=state?.status||'idle';
    return '<div class="context-correction-commit-status" data-state="'+safe(status)+'">'+
      '<div><strong>Commit policy: '+safe(commit?.status||preview?.status||status)+'</strong><small>'+safe(state?.message||'Preview protected commit policy before recording a backend-owned remediation receipt.')+'</small></div>'+
      '<div class="context-correction-plan-actions"><button type="button" data-correction-commit="preview" '+(!draft?'disabled':'')+'>Preview commit</button><button type="button" data-correction-commit="commit" '+(!preview?'disabled':'')+'>Record commit</button></div>'+
      '<div class="context-correction-commit-checks">'+(checks.length?checks.map((check)=>
        '<article data-check-status="'+safe(check.status||'pending')+'"><strong>'+safe(check.id||'check')+'</strong><p>'+safe(check.label||'Policy check')+'</p></article>'
      ).join(''):'<article><strong>No commit preview yet</strong><p>Prepare an adapter draft, then preview the commit policy. This stores no source text and performs no source mutation.</p></article>')+'</div>'+
      '<div class="context-correction-commit-changes">'+(changes.length?changes.map((change)=>
        '<article><strong>'+safe(change.type||'commit-policy')+'</strong><small>commit_record_only:'+safe(Boolean(change.commit_record_only))+' / source_mutation_executed:'+safe(Boolean(change.source_mutation_executed))+'</small></article>'
      ).join(''):'')+'</div>'+
      (commit?'<small>receipt:'+safe(commit.id||'recorded')+' / rollback:'+safe(commit.rollback?.rollback_action||'compensating commit required')+'</small>':'')+
      '<small class="context-correction-review-policy">preview_required:true / commit_record_allowed:true / source_mutation_allowed:false / public_frontend_authority:false</small>'+
    '</div>';
  }
  function executionGateHtml(){
    const commitState=readCommitState();
    const state=readExecutionState();
    const commit=commitState?.commit&&typeof commitState.commit==='object'?commitState.commit:null;
    const preview=state?.preview&&typeof state.preview==='object'?state.preview:null;
    const execution=state?.execution&&typeof state.execution==='object'?state.execution:null;
    const checks=Array.isArray(preview?.checks)?preview.checks.slice(0,5):[];
    const results=Array.isArray(execution?.results)?execution.results.slice(0,4):[];
    const status=state?.status||'idle';
    const canExecute=Boolean(preview?.supported);
    return '<div class="context-correction-execution-status" data-state="'+safe(status)+'">'+
      '<div><strong>Source execution: '+safe(execution?.status||preview?.status||status)+'</strong><small>'+safe(state?.message||'Preview backend-only execution before applying a supported memory repair.')+'</small></div>'+
      '<div class="context-correction-plan-actions"><button type="button" data-correction-execution="preview" '+(!commit?'disabled':'')+'>Preview execution</button><button type="button" data-correction-execution="execute" '+(!canExecute?'disabled':'')+'>Apply memory repair</button></div>'+
      '<div class="context-correction-execution-checks">'+(checks.length?checks.map((check)=>
        '<article data-check-status="'+safe(check.status||'pending')+'"><strong>'+safe(check.id||'check')+'</strong><p>'+safe(check.label||'Execution check')+'</p></article>'
      ).join(''):'<article><strong>No execution preview yet</strong><p>Record a commit receipt, then preview backend-only execution. Knowledge repairs stay blocked until source models exist.</p></article>')+'</div>'+
      '<div class="context-correction-execution-results">'+(results.length?results.map((result)=>
        '<article><strong>'+safe(result.source_id||'source')+' '+safe(result.status||'result')+'</strong><small>source_mutation_executed:'+safe(Boolean(result.source_mutation_executed))+' / rollback:'+safe(result.rollback_hint||'captured metadata')+'</small></article>'
      ).join(''):'')+'</div>'+
      (preview&&!preview.supported?'<small>Blocked: '+safe(preview.blocked_reason||'unsupported execution target')+'</small>':'')+
      '<small class="context-correction-review-policy">backend_only_execution:true / preview_required:true / public_frontend_authority:false / no_paid_routes_started:true</small>'+
    '</div>';
  }
  function rollbackGateHtml(){
    const executionState=readExecutionState();
    const state=readRollbackState();
    const execution=executionState?.execution&&typeof executionState.execution==='object'?executionState.execution:null;
    const preview=state?.preview&&typeof state.preview==='object'?state.preview:null;
    const rollback=state?.rollback&&typeof state.rollback==='object'?state.rollback:null;
    const checks=Array.isArray(preview?.checks)?preview.checks.slice(0,5):[];
    const results=Array.isArray(rollback?.results)?rollback.results.slice(0,4):[];
    const status=state?.status||'idle';
    const canApply=Boolean(preview?.supported);
    return '<div class="context-correction-rollback-status" data-state="'+safe(status)+'">'+
      '<div><strong>Rollback gate: '+safe(rollback?.status||preview?.status||status)+'</strong><small>'+safe(state?.message||'Preview backend-only rollback before restoring captured memory metadata.')+'</small></div>'+
      '<div class="context-correction-plan-actions"><button type="button" data-correction-rollback="preview" '+(!execution?'disabled':'')+'>Preview rollback</button><button type="button" data-correction-rollback="apply" '+(!canApply?'disabled':'')+'>Apply rollback</button></div>'+
      '<div class="context-correction-rollback-checks">'+(checks.length?checks.map((check)=>
        '<article data-check-status="'+safe(check.status||'pending')+'"><strong>'+safe(check.id||'check')+'</strong><p>'+safe(check.label||'Rollback check')+'</p></article>'
      ).join(''):'<article><strong>No rollback preview yet</strong><p>Apply a supported memory execution, then preview backend-only rollback. Raw text remains untouched.</p></article>')+'</div>'+
      '<div class="context-correction-rollback-results">'+(results.length?results.map((result)=>
        '<article><strong>'+safe(result.source_id||'source')+' '+safe(result.status||'result')+'</strong><small>source_mutation_executed:'+safe(Boolean(result.source_mutation_executed))+' / rollback:'+safe(result.rollback_hint||'restored metadata')+'</small></article>'
      ).join(''):'')+'</div>'+
      (preview&&!preview.supported?'<small>Blocked: '+safe(preview.blocked_reason||'unsupported rollback target')+'</small>':'')+
      '<small class="context-correction-review-policy">backend_only_rollback:true / preview_required:true / execute_rollback_required:true / public_frontend_authority:false / no_paid_routes_started:true</small>'+
    '</div>';
  }
  function knowledgeSourceModelHtml(){
    const commitState=readCommitState();
    const state=readKnowledgeSourceState();
    const commit=commitState?.commit&&typeof commitState.commit==='object'?commitState.commit:null;
    const preview=state?.preview&&typeof state.preview==='object'?state.preview:null;
    const model=state?.model&&typeof state.model==='object'?state.model:null;
    const sources=Array.isArray(model?.sources)?model.sources.slice(0,4):(Array.isArray(preview?.sources)?preview.sources.slice(0,4):[]);
    const checks=Array.isArray(preview?.checks)?preview.checks.slice(0,5):[];
    const status=state?.status||'idle';
    const canPreview=Boolean(commit&&commit.target==='knowledge');
    const canRecord=Boolean(preview?.supported);
    return '<div class="context-correction-knowledge-source-status" data-state="'+safe(status)+'">'+
      '<div><strong>Knowledge source model: '+safe(model?.status||preview?.status||status)+'</strong><small>'+safe(state?.message||'Prepare metadata-only knowledge source decisions before any knowledge mutation can be enabled.')+'</small></div>'+
      '<div class="context-correction-plan-actions"><button type="button" data-correction-knowledge-source="preview" '+(!canPreview?'disabled':'')+'>Preview source model</button><button type="button" data-correction-knowledge-source="record" '+(!canRecord?'disabled':'')+'>Record source model</button></div>'+
      '<div class="context-correction-knowledge-source-checks">'+(checks.length?checks.map((check)=>
        '<article data-check-status="'+safe(check.status||'pending')+'"><strong>'+safe(check.id||'check')+'</strong><p>'+safe(check.label||'Knowledge source check')+'</p></article>'
      ).join(''):'<article><strong>No knowledge source model yet</strong><p>Record a knowledge commit, then preview owned source metadata, split decisions and rollback status before execution.</p></article>')+'</div>'+
      '<div class="context-correction-knowledge-source-results">'+(sources.length?sources.map((source)=>
        '<article><strong>'+safe(source.name||source.source_id||'source')+'</strong><small>known:'+safe(Boolean(source.known))+' / status:'+safe(source.current_status||source.status||'review')+' / raw_text_included:'+safe(Boolean(source.raw_text_included))+'</small></article>'
      ).join(''):'')+'</div>'+
      (preview?.collection_split?'<small>split:'+safe(preview.collection_split.proposed_collection_id||'planned')+' / mutation_allowed:'+safe(Boolean(preview.collection_split.mutation_allowed))+'</small>':'')+
      '<small class="context-correction-review-policy">knowledge_execution_supported:false / source_mutation_allowed:false / source_mutation_executed:false / document_text_stored:false / public_frontend_authority:false</small>'+
    '</div>';
  }
  function knowledgeExecutionGateHtml(){
    const sourceState=readKnowledgeSourceState();
    const state=readKnowledgeExecutionState();
    const model=sourceState?.model&&typeof sourceState.model==='object'?sourceState.model:null;
    const preview=state?.preview&&typeof state.preview==='object'?state.preview:null;
    const execution=state?.execution&&typeof state.execution==='object'?state.execution:null;
    const checks=Array.isArray(preview?.checks)?preview.checks.slice(0,5):[];
    const results=Array.isArray(execution?.results)?execution.results.slice(0,4):[];
    const updates=Array.isArray(preview?.execution_plan?.source_status_updates)?preview.execution_plan.source_status_updates.slice(0,4):[];
    const status=state?.status||'idle';
    const canPreview=Boolean(model?.id);
    const canExecute=Boolean(preview?.supported);
    return '<div class="context-correction-knowledge-execution-status" data-state="'+safe(status)+'">'+
      '<div><strong>Knowledge execution: '+safe(execution?.status||preview?.status||status)+'</strong><small>'+safe(state?.message||'Preview backend-only knowledge metadata execution before applying source status or collection changes.')+'</small></div>'+
      '<div class="context-correction-plan-actions"><button type="button" data-correction-knowledge-execution="preview" '+(!canPreview?'disabled':'')+'>Preview knowledge execution</button><button type="button" data-correction-knowledge-execution="execute" '+(!canExecute?'disabled':'')+'>Apply metadata repair</button></div>'+
      '<div class="context-correction-knowledge-execution-checks">'+(checks.length?checks.map((check)=>
        '<article data-check-status="'+safe(check.status||'pending')+'"><strong>'+safe(check.id||'check')+'</strong><p>'+safe(check.label||'Knowledge execution check')+'</p></article>'
      ).join(''):'<article><strong>No knowledge execution preview yet</strong><p>Record a knowledge source model, then preview backend-only metadata execution. Document text remains private.</p></article>')+'</div>'+
      '<div class="context-correction-knowledge-execution-results">'+(results.length?results.map((result)=>
        '<article><strong>'+safe(result.source_id||'source')+' '+safe(result.status||'result')+'</strong><small>source_mutation_executed:'+safe(Boolean(result.source_mutation_executed))+' / raw_text_included:'+safe(Boolean(result.raw_text_included))+' / rollback:'+safe(result.rollback_hint||'captured metadata')+'</small></article>'
      ).join(''):updates.length?updates.map((update)=>
        '<article><strong>'+safe(update.source_id||'source')+'</strong><small>status:'+safe(update.proposed_status||'review-required')+' / collection:'+safe(update.proposed_collection_id||'unchanged')+' / raw_text_included:'+safe(Boolean(update.raw_text_included))+'</small></article>'
      ).join(''):'')+'</div>'+
      (preview&&!preview.supported?'<small>Blocked: '+safe(preview.blocked_reason||'unsupported knowledge execution target')+'</small>':'')+
      '<small class="context-correction-review-policy">backend_only_execution:true / preview_required:true / execute_source_mutation_required:true / document_text_stored:false / public_frontend_authority:false / no_paid_routes_started:true</small>'+
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
      commitPolicyHtml()+
      executionGateHtml()+
      rollbackGateHtml()+
      knowledgeSourceModelHtml()+
      knowledgeExecutionGateHtml()+
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
  document.addEventListener('click',(event)=>{
    const button=event.target.closest('[data-correction-commit]');
    if(!button)return;
    const action=button.dataset.correctionCommit;
    if(action==='preview')previewRemediationCommit();
    if(action==='commit')commitRemediationAdapter();
  });
  document.addEventListener('click',(event)=>{
    const button=event.target.closest('[data-correction-execution]');
    if(!button)return;
    const action=button.dataset.correctionExecution;
    if(action==='preview')previewRemediationExecution();
    if(action==='execute')executeRemediationCommit();
  });
  document.addEventListener('click',(event)=>{
    const button=event.target.closest('[data-correction-rollback]');
    if(!button)return;
    const action=button.dataset.correctionRollback;
    if(action==='preview')previewRemediationRollback();
    if(action==='apply')applyRemediationRollback();
  });
  document.addEventListener('click',(event)=>{
    const button=event.target.closest('[data-correction-knowledge-source]');
    if(!button)return;
    const action=button.dataset.correctionKnowledgeSource;
    if(action==='preview')previewKnowledgeSourceModel();
    if(action==='record')recordKnowledgeSourceModel();
  });
  document.addEventListener('click',(event)=>{
    const button=event.target.closest('[data-correction-knowledge-execution]');
    if(!button)return;
    const action=button.dataset.correctionKnowledgeExecution;
    if(action==='preview')previewKnowledgeExecution();
    if(action==='execute')executeKnowledgeExecution();
  });
  ['mmir-context-corrections-updated','mmir-context-correction-sync-updated','mmir-context-correction-review-updated','mmir-context-correction-plan-updated','mmir-context-correction-apply-updated','mmir-context-correction-adapter-updated','mmir-context-correction-commit-updated','mmir-context-correction-execution-updated','mmir-context-correction-rollback-updated','mmir-context-correction-knowledge-source-model-updated','mmir-context-correction-knowledge-execution-updated','mmir-backend-profiles-updated','mmir-managed-session-updated','mmir-progress-dashboard-rendered','toggle'].forEach((eventName)=>{
    window.addEventListener(eventName,()=>window.setTimeout(render,0));
  });
  document.addEventListener('DOMContentLoaded',()=>window.setTimeout(render,0));
  window.setTimeout(render,800);
  window.MimirContextCorrectionSync={syncPreview,checkRoute,syncNow,deferSync,loadReviewQueue,createRemediationPlan,approvePlan,deferPlan,applyRemediationStep,prepareRemediationAdapter,previewRemediationCommit,commitRemediationAdapter,previewKnowledgeSourceModel,recordKnowledgeSourceModel,previewKnowledgeExecution,executeKnowledgeExecution,previewRemediationExecution,executeRemediationCommit,previewRemediationRollback,applyRemediationRollback,readSyncState,readReviewState,readPlanState,readApplyState,readAdapterState,readCommitState,readKnowledgeSourceState,readKnowledgeExecutionState,readExecutionState,readRollbackState};
})();
