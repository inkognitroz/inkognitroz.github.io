(function(){
  window.__MimirP0SimpleChat=true;
  const P0_ROUTE_ADAPTERS=window.MimirP0RouteAdapters||{};
  const CHAT_STATE=window.MimirChatStateCopy||{};
  const ROUTE_ADAPTER_CONFIG=typeof P0_ROUTE_ADAPTERS.config==='function'?P0_ROUTE_ADAPTERS.config():{};
  const API_URL=ROUTE_ADAPTER_CONFIG.apiUrl||'https://api.mmir.ai';
  const API_LABEL=ROUTE_ADAPTER_CONFIG.apiLabel||'api.mmir.ai';
  const LOCAL_URL=ROUTE_ADAPTER_CONFIG.localUrl||'http://127.0.0.1:3000';
  const CHAT_PATH=ROUTE_ADAPTER_CONFIG.chatPath||'/v1/chat/completions';
  const ROUTE_SCORE_PATH=ROUTE_ADAPTER_CONFIG.routeScorePath||'/routing/score';
  const COMPARE_PATH=ROUTE_ADAPTER_CONFIG.comparePath||'/chat/compare';
  const SWARM_PREVIEW_PATH=ROUTE_ADAPTER_CONFIG.swarmPreviewPath||'/chat/swarm/preview';
  const SUPERBOOST_PREVIEW_PATH=ROUTE_ADAPTER_CONFIG.superboostPreviewPath||'/chat/superboost/preview';
  const NO_KEY_TOOL_PREVIEW_PATH=ROUTE_ADAPTER_CONFIG.noKeyToolPreviewPath||'/tools/no-key/preview';
  const fetchJson=P0_ROUTE_ADAPTERS.fetchJson;
  const sanitizedChatPayload=P0_ROUTE_ADAPTERS.sanitizedChatPayload||((payload)=>payload);
  const boundedChatMessageTail=P0_ROUTE_ADAPTERS.boundedChatMessageTail||(()=>[]);
  const hostedLineageEligible=P0_ROUTE_ADAPTERS.hostedLineageEligible||(()=>false);
  const normalizedWriterContinuityState=P0_ROUTE_ADAPTERS.normalizedWriterContinuityState||(()=>null);
  const writerContinuityRequest=P0_ROUTE_ADAPTERS.writerContinuityRequest||((payload)=>payload);
  const writerContinuityRequestPlan=P0_ROUTE_ADAPTERS.writerContinuityRequestPlan||((payload,state)=>({payload:writerContinuityRequest(payload,state),applied:false,reason:'adapter-unavailable',limit_bytes:96*1024}));
  const writerContinuityStateFromResponse=P0_ROUTE_ADAPTERS.writerContinuityStateFromResponse||(()=>null);
  const writerContinuityStatePlanFromResponse=P0_ROUTE_ADAPTERS.writerContinuityStatePlanFromResponse||((requestPayload,responsePayload,previousState)=>({state:writerContinuityStateFromResponse(requestPayload,responsePayload,previousState),reason:'legacy-adapter',limit_bytes:96*1024}));
  const truthfulWriterIdentity=P0_ROUTE_ADAPTERS.truthfulWriterIdentity||(()=>({type:'unknown',provider:'',model_id:'',model_display_name:'Ukjent svarforfatter · ikke verifisert',identity_source:'missing',identity_verified:false}));
  const localNetworkHint=P0_ROUTE_ADAPTERS.localNetworkHint;
  const allowLocalProbes=P0_ROUTE_ADAPTERS.allowLocalProbes;
  const pairLocal=P0_ROUTE_ADAPTERS.pairLocal;
  const hasLocalPairingToken=P0_ROUTE_ADAPTERS.hasLocalPairingToken||(()=>false);
  const localHeaders=P0_ROUTE_ADAPTERS.localHeaders;
  const HISTORY_KEY='mmir-p0-chat-history-v1';
  const HISTORY_SCHEMA_KEY='mmir-p0-chat-history-schema';
  const HISTORY_SESSION_KEY='mmir-p0-chat-history-qa-session-v1';
  const HISTORY_SESSION_SCHEMA_KEY='mmir-p0-chat-history-qa-session-schema';
  const WRITER_CONTINUITY_SESSION_KEY='mmir-p0-writer-continuity-v1';
  const HISTORY_SCHEMA='20260603-clean-first-chat-v40';
  const MODELS_KEY='mmir-p0-active-models-v1';
  const ACTIVE_MODEL_KEY='mmir-p0-active-model-id-v1';
  const PINNED_ROUTES_KEY='mmir-p0-pinned-routes-v1';
  const MODEL_FILTER_KEY='mmir-p0-model-filter-v1';
  const PRIVACY_MODE_KEY='mmir-p0-privacy-mode-v1';
  const LEGACY_PRIVATE_MODE_KEY='mmir-p0-private-mode-v1';
  const FACT_GUARD_KEY='mmir-p0-fact-guard-v1';
  const ROUTE_BENCHMARK_KEY='mmir-p0-route-benchmarks-v1';
  const SHARE_DRAFT_KEY='mmir-p0-share-safe-draft-v1';
  const PROMPT_PRESETS_KEY='mmir-p0-prompt-presets-v1';
  const PROMPT_CATALOG_KEY='mmir-p0-prompt-catalog-v1';
  const TOOLBAR_TOOLS_KEY='mmir-p0-toolbar-tools-v1';
  const ANSWER_STYLE_KEY='mmir-p0-answer-style-v1';
  const ROLE_PROFILE_KEY='mmir-p0-role-profile-v1';
  const MEMORY_SNAPSHOT_KEY='mmir-p0-memory-snapshot-v1';
  const LOCAL_MEMORY_ITEMS_KEY='mmir-p0-local-memory-items-v1';
  const LOCAL_DOCUMENT_NOTES_KEY='mmir-p0-local-document-notes-v1';
  const SHARED_LOCATION_KEY='mmir-p0-shared-location-v1';
  const TOOL_CONTEXT_KEY='mmir-p0-last-tool-context-v1';
  const PROMPT_PRESETS_PATH='/prompts/presets';
  const PROMPT_SAVE_PLAN_PATH='/prompts/save/plan';
  const OWNER_SUGGESTION_PLAN_PATH='/control-plane/owner/suggestions/plan';
  const FEEDBACK_INTAKE_PATH='/feedback/intake';
  const FEEDBACK_INBOX_PLAN_PATH='/feedback/inbox/plan';
  const TELEMETRY_EVENTS_PATH='/telemetry/events';
  const DEMO_TRANSCRIPT_PATH='/telemetry/demo-transcript';
  const VISION_PREVIEW_PATH='/chat/vision/preview';
  const OWNER_INTELLIGENCE_PING_PATH='/owner/intelligence/ping';
  const INTELLIGENCE_SCORECARD_PATH='/intelligence/fabric/scorecard';
  const SUPERGENI_QUALITY_PATH='/intelligence/supergeni/quality';
  const FEEDBACK_INBOX_KEY='mmir-p0-feedback-inbox-v1';
  const INTERACTION_EVENTS_KEY='mmir-p0-interaction-events-v1';
  const INTERACTION_SESSION_KEY='mmir-p0-interaction-session-v1';
  const DEMO_GROWTH_MODE_KEY='mimir-demo-mode-v1';
  const DEMO_TRANSCRIPT_CONSENT_KEY='mmir-p0-demo-transcript-consent-v1';
  const DEMO_TRANSCRIPT_NOTICE_KEY='mmir-p0-demo-transcript-notice-v1';
  const P0_RUNTIME_VERSION='20260804-release-readiness-truth-v1';
  const RELEASE_PREFLIGHT_REUSE_MS=2000;
  const RELEASE_BACKGROUND_REFRESH_MS=30000;
  const CANONICAL_HOSTED_MODEL_ID='mmir-supergenius';
  const CANONICAL_HOSTED_MODEL_ALIASES=new Set([
    CANONICAL_HOSTED_MODEL_ID,
    'supergeni',
    'supergeni-free',
    'supergenius-free',
    'supergenious-free',
    'mmir-github-fallback'
  ]);
  const TELEMETRY_DENIED_FIELD_RE=/(prompt|answer|message|content|completion|suggestion|text|input|secret|token|password|api[_-]?key|authorization|cookie)/i;
  const OWNER_SECRETISH_RE=/\b[A-Za-z0-9_.-]*(?:api[_-]?key|secret|password|token|bearer)[A-Za-z0-9_.-]*\b(?:\s*[:=]\s*|\s+)[A-Za-z0-9._~+/=-]{8,}/gi;
  const OWNER_PROVIDER_KEY_RE=/\b(?:sk-or-v1-|sk-proj-|sk-ant-|sk-[A-Za-z0-9]|gsk_|nvapi-)[A-Za-z0-9._~+/=-]{12,}/gi;
  const DEMO_EMAIL_RE=/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
  const DEMO_NORWEGIAN_FNR_RE=/\b\d{6}[ .-]?\d{5}\b/g;
  const DEMO_NORWEGIAN_ACCOUNT_RE=/\b\d{4}[ .]?\d{2}[ .]?\d{5}\b/g;
  const DEMO_PHONE_RE=/\b(?:\+?47[\s.-]?)?(?:\d[\s.-]?){8}\b/g;
  const LOCAL_INSTALL_COMMANDS=window.MimirLocalInstallCommands||{};
  const P0_TEXT=window.MimirP0Text||{};
  const P0_CLIPBOARD=window.MimirP0Clipboard||{};
  const P0_ICONS=window.MimirP0Icons||{};
  const P0_STORAGE=window.MimirP0Storage||{};
  const P0_ROUTE_RECEIPTS=window.MimirP0RouteReceipts||{};
  const P0_ROUTE_BENCHMARKS=window.MimirP0RouteBenchmarks||{};
  const P0_HISTORY=window.MimirP0History||{};
  const MAX_HISTORY=40;
  const ICON_SHIELD=P0_ICONS.shield||'';
  const ICON_MIC=P0_ICONS.mic||'';
  const ICON_FLAME=P0_ICONS.flame||'';
  let demoTranscriptTimer=null;
  let lastDemoTranscriptHash='';
  const ICON_BUBBLES=P0_ICONS.bubbles||'';
  const ICON_BRAIN=P0_ICONS.brain||'';
  const ICON_STOP=P0_ICONS.stop||'';
  const ICON_LIGHTNING=P0_ICONS.lightning||'';
  const ICON_ATTACH=P0_ICONS.attach||'<span aria-hidden="true">+</span>';
  const ICON_TOOLS=P0_ICONS.tools||'<span aria-hidden="true">Tools</span>';
  const readJson=P0_STORAGE.readJson;
  const writeJson=P0_STORAGE.writeJson;
  const readStorageString=P0_STORAGE.readString;
  const writeStorageString=P0_STORAGE.writeString;
  const ensureStorageSchema=P0_STORAGE.ensureSchema;
  const historySessionMode=Boolean(typeof P0_HISTORY.qaSessionEnabled==='function'&&P0_HISTORY.qaSessionEnabled(window.location?.search||''));
  const historySessionKeys=historySessionMode&&typeof P0_HISTORY.qaSessionStorageKeys==='function'
    ? P0_HISTORY.qaSessionStorageKeys(window.location?.search||'',HISTORY_SESSION_KEY,HISTORY_SESSION_SCHEMA_KEY)
    : {historyKey:HISTORY_SESSION_KEY,schemaKey:HISTORY_SESSION_SCHEMA_KEY,scope:''};
  const activeHistorySessionKey=historySessionKeys.historyKey||HISTORY_SESSION_KEY;
  const activeHistorySessionSchemaKey=historySessionKeys.schemaKey||HISTORY_SESSION_SCHEMA_KEY;
  const activeWriterContinuitySessionKey=historySessionMode&&historySessionKeys.scope
    ? WRITER_CONTINUITY_SESSION_KEY+':'+historySessionKeys.scope
    : WRITER_CONTINUITY_SESSION_KEY;
  window.__MimirP0HistorySessionMode=historySessionMode;
  window.__MimirP0HistorySessionKey=historySessionMode?activeHistorySessionKey:'';
  window.__MimirP0HistorySessionScope=historySessionMode?(historySessionKeys.scope||''):'';
  let legacyPromptBridgeBound=false;
  let legacyPromptSyncing=false;
  const DEFAULT_PROMPT_PRESETS=[
    {
      id:'quick-answer',
      title:'Quick answer',
      detail:'Short, direct answer.',
      prompt_template:'Answer directly and briefly: '
    },
    {
      id:'compare-best-answer',
      title:'Best Answer',
      detail:'Use parallel active routes when available.',
      prompt_template:'@compare '
    },
    {
      id:'private-local',
      title:'Private local',
      detail:'Prefer this Mac when connected.',
      prompt_template:'Use my private local model if available: '
    },
    {
      id:'research-plan',
      title:'Research plan',
      detail:'Turn a topic into a focused plan.',
      prompt_template:'Make a concise research plan for: '
    }
  ];
  const ROLE_PROFILES=[
    {
      id:'default',
      label:'Default',
      detail:'Balanced Supergeni presence.',
      instruction:'Use the standard Supergeni presence: helpful, calm, direct and honest.'
    },
    {
      id:'concise',
      label:'Concise operator',
      detail:'Short, concrete and action-oriented.',
      instruction:'Use a concise operator presence: cut filler, lead with the answer and keep next steps practical.'
    },
    {
      id:'fact',
      label:'Fact analyst',
      detail:'Careful, factual and uncertainty-aware.',
      instruction:'Use a fact analyst presence: separate facts from uncertainty, avoid overclaiming and flag when verification is needed.'
    },
    {
      id:'coach',
      label:'Friendly coach',
      detail:'Supportive, simple and practical.',
      instruction:'Use a friendly coach presence: explain simply, make the user feel capable and keep advice actionable.'
    },
    {
      id:'creative',
      label:'Creative partner',
      detail:'Original ideas without losing usefulness.',
      instruction:'Use a creative partner presence: offer fresh angles and useful options while staying grounded.'
    },
    {
      id:'playful',
      label:'Playful',
      detail:'Light, witty and still useful.',
      instruction:'Use a playful presence: be light and witty, but keep the answer useful and avoid derailing the task.'
    }
  ];

  function hostedRouteLabel(){
    return P0_ROUTE_RECEIPTS.hostedRouteLabel(API_LABEL);
  }

  function readBooleanPreference(key,fallback){
    const value=String(readStorageString(key,'')).trim().toLowerCase();
    if(value==='on'||value==='true'||value==='1')return true;
    if(value==='off'||value==='false'||value==='0')return false;
    return fallback;
  }

  function writeBooleanPreference(key,value){
    writeStorageString(key,value?'on':'off');
  }

  function normalizeAnswerStyle(value){
    const style=String(value||'').trim().toLowerCase();
    return style==='precise'||style==='detailed'||style==='short'?style:'short';
  }

  function readAnswerStyle(){
    return normalizeAnswerStyle(readStorageString(ANSWER_STYLE_KEY,'short'));
  }

  function writeAnswerStyle(style){
    writeStorageString(ANSWER_STYLE_KEY,normalizeAnswerStyle(style));
  }

  function answerStyle(){
    return normalizeAnswerStyle(state.answerStyle);
  }

  function answerStyleLabel(style=answerStyle()){
    const value=normalizeAnswerStyle(style);
    if(value==='precise')return 'Presis';
    if(value==='detailed')return 'Detaljert';
    return 'Kort';
  }

	  function answerStyleDetail(style=answerStyle()){
	    const value=normalizeAnswerStyle(style);
	    if(value==='precise')return 'Only necessary facts, compact wording, no technical proof boilerplate in the answer.';
	    if(value==='detailed')return 'More complete answers when useful, with source proof kept in quiet receipts.';
	    return '1-3 useful sentences by default. Source and privacy proof stays in the quiet receipt.';
	  }

  function answerStyleInstruction(style=answerStyle()){
    const value=normalizeAnswerStyle(style);
    const metadataRule=' Keep route, source, privacy and no-paid-route proof in metadata, receipts or subtle status text instead of the main answer unless the user explicitly asks for it.';
    if(value==='precise')return 'Answer precisely with only the necessary facts. Avoid filler and avoid long setup explanations.'+metadataRule;
    if(value==='detailed')return 'Give a complete answer when the task needs it, but stay organized and avoid unnecessary boilerplate.'+metadataRule;
    return 'Answer in 1-3 concise sentences by default. Expand only when the user asks for detail.'+metadataRule;
  }

  function answerTokenBudget(style=answerStyle()){
    const value=normalizeAnswerStyle(style);
    if(value==='detailed')return 1200;
    if(value==='precise')return 650;
    return 450;
  }

  function normalizeRoleProfileId(value){
    const id=String(value||'').trim().toLowerCase().replace(/[^a-z0-9_-]+/g,'-');
    return ROLE_PROFILES.some(profile=>profile.id===id)?id:'default';
  }

  function roleProfileById(id){
    const normalized=normalizeRoleProfileId(id);
    return ROLE_PROFILES.find(profile=>profile.id===normalized)||ROLE_PROFILES[0];
  }

  function readRoleProfileId(){
    return normalizeRoleProfileId(readStorageString(ROLE_PROFILE_KEY,'default'));
  }

  function writeRoleProfileId(id){
    writeStorageString(ROLE_PROFILE_KEY,normalizeRoleProfileId(id));
  }

  function roleProfile(){
    return roleProfileById(state.roleProfileId);
  }

  function roleProfileLabel(id=state.roleProfileId){
    return roleProfileById(id).label;
  }

  function roleProfileDetail(id=state.roleProfileId){
    return roleProfileById(id).detail;
  }

  function roleProfileInstruction(){
    return roleProfile().instruction;
  }

  function normalizePrivacyMode(mode){
    const value=String(mode||'').trim().toLowerCase();
    return value==='private'||value==='superprivate'||value==='public'?value:'public';
  }

  function readPrivacyMode(){
    const value=normalizePrivacyMode(readStorageString(PRIVACY_MODE_KEY,''));
    if(value!=='public')return value;
    return readBooleanPreference(LEGACY_PRIVATE_MODE_KEY,false)?'private':'public';
  }

  function writePrivacyMode(mode){
    const value=normalizePrivacyMode(mode);
    writeStorageString(PRIVACY_MODE_KEY,value);
    writeBooleanPreference(LEGACY_PRIVATE_MODE_KEY,value!=='public');
  }

  function privacyMode(){
    return normalizePrivacyMode(state.privacyMode);
  }

  function privateModeActive(){
    return privacyMode()==='private'||privacyMode()==='superprivate';
  }

  function superPrivateModeActive(){
    return privacyMode()==='superprivate';
  }

  function factGuardActive(){
    return state.factGuard!==false;
  }

  function normalizePromptPreset(item){
    const id=String(item?.id||item?.name||'').trim().toLowerCase().replace(/[^a-z0-9:_-]+/g,'-').slice(0,64);
    const title=String(item?.title||item?.name||id||'Prompt').trim().slice(0,80);
    const prompt=String(item?.prompt_template||item?.template||item?.prompt||'').trimEnd().slice(0,4000);
    const detail=String(item?.detail||item?.description||'').trim().slice(0,140);
    if(!id||!title||!prompt)return null;
    return {
      id,
      title,
      detail,
      prompt_template:prompt,
      source:item?.source==='browser-local'?'browser-local':'mmir'
    };
  }

  const state={
    busy:false,
    fastAnswerOnce:false,
    messages:initialMessages(),
    models:[
      {
        id:'mmir-supergenius',
        label:'Supergeni',
        route:'hosted',
        detail:'Hosted orchestrator · release verification pending',
        tags:['Beta','Hosted','Not verified'],
        score:100,
        model:'mmir-supergenius',
        executable:false,
        selectable:false,
        liveE2EVerified:false,
        routeState:'release_verification_pending',
        routeType:'managed_provider',
        availability:'temporarily_degraded',
        costState:'free'
      }
    ],
    activeModelId:readActiveModelId(),
    localChecked:false,
    localError:'',
    localHardware:null,
    privacyMode:readPrivacyMode(),
    factGuard:readBooleanPreference(FACT_GUARD_KEY,true),
    answerStyle:readAnswerStyle(),
    roleProfileId:readRoleProfileId(),
    pendingMedia:null,
    routeBenchmarks:readJson(ROUTE_BENCHMARK_KEY,{}),
    routeInventory:{
      activeRoutes:1,
      futureRoutes:0,
      totalRoutes:1,
      activePublicProviderRoutes:0,
      activeExternalNodeRoutes:0,
      visibleCandidateCount:0,
      providerReadiness:{
        activeLabels:[],
        deployNeededLabels:[],
        probeQueuedLabels:[]
      }
    },
    hostedRouteState:'checking',
    releaseReadiness:{
      state:'checking',
      hostedReady:false,
      compareReady:false,
      swarmPreviewReady:false,
      verifiedRoutes:0,
      checkedAt:0,
      reason:'Sjekker offentlig svarbane.'
    },
    localReadiness:{
      paired:false,
      runtimeChatReady:false,
      chatReady:false,
      modelIds:[]
    },
    tokenCounter:{
      total:0,
      last:0,
      events:0,
      source:''
    }
  };
  let writerContinuityState=normalizedWriterContinuityState(readSessionJson(activeWriterContinuitySessionKey,null));
  let activeChatController=null;
  let hostedReadinessTimer=null;
  let hostedReadinessRefreshGeneration=0;
  let stopRequested=false;
  if(privateModeActive())clearWriterContinuityState();
  const SLOW_RESPONSE_NOTICE_MS=12000;
  const TOOLBAR_TOOL_DEFINITIONS=[
    {
      id:'fast-answer',
      label:'Fast answer',
      detail:'One-tap short answer mode for the next prompt.',
      title:'Fast answer',
      icon:ICON_LIGHTNING||'<span aria-hidden="true">L</span>'
    },
    {
      id:'stop',
      label:'Stop',
      detail:'Adds an explicit stop button while an answer is running.',
      title:'Stop current response',
      icon:ICON_STOP||'<span aria-hidden="true">■</span>'
    },
    {
      id:'fresh-start',
      label:'Fresh start',
      detail:'Clears this browser chat and composer. Pairing stays intact.',
      title:'Fresh start',
      icon:ICON_FLAME||'<span aria-hidden="true">F</span>'
    },
    {
      id:'discuss',
      label:'Supergeni Council',
      detail:'Lets approved models challenge each other, then converge.',
      title:'Supergeni Council',
      icon:ICON_BUBBLES||'<span aria-hidden="true">D</span>'
    },
    {
      id:'memory',
      label:'Memory',
      detail:'Saves this chat/setup locally in this browser.',
      title:'Save memory',
      icon:ICON_BRAIN||'<span aria-hidden="true">M</span>'
    }
  ];

  function readSessionJson(key,fallback){
    try{
      const value=JSON.parse(sessionStorage.getItem(key)||'null');
      return value==null?fallback:value;
    }catch(error){
      return fallback;
    }
  }

  function writeSessionJson(key,value){
    try{
      sessionStorage.setItem(key,JSON.stringify(value));
      return true;
    }catch(error){
      return false;
    }
  }

  function writeSessionString(key,value){
    try{
      sessionStorage.setItem(key,String(value));
      return true;
    }catch(error){
      return false;
    }
  }

  function removeSessionKey(key){
    try{
      sessionStorage.removeItem(key);
      return true;
    }catch(error){
      return false;
    }
  }

  function clearWriterContinuityState(){
    writerContinuityState=null;
    removeSessionKey(activeWriterContinuitySessionKey);
  }

  function setWriterContinuityState(next){
    const normalized=normalizedWriterContinuityState(next);
    if(!normalized||privateModeActive()){
      clearWriterContinuityState();
      return null;
    }
    writerContinuityState=normalized;
    writeSessionJson(activeWriterContinuitySessionKey,normalized);
    return normalized;
  }

  function captureWriterContinuity(requestPayload,responsePayload,previousState){
    const plan=writerContinuityStatePlanFromResponse(requestPayload,responsePayload,previousState);
    if(plan.state){
      setWriterContinuityState(plan.state);
      return plan;
    }
    if(requestPayload?.writer_continuity_receipt||responsePayload?.mmir?.writer_continuity_receipt!==undefined){
      clearWriterContinuityState();
    }
    return plan;
  }

  function ensureHistorySchema(){
    if(!historySessionMode)return ensureStorageSchema(HISTORY_SCHEMA_KEY,HISTORY_SCHEMA,[HISTORY_KEY]);
    try{
      if(sessionStorage.getItem(activeHistorySessionSchemaKey)===HISTORY_SCHEMA)return true;
      removeSessionKey(activeHistorySessionKey);
      writeSessionString(activeHistorySessionSchemaKey,HISTORY_SCHEMA);
      return false;
    }catch(error){
      return false;
    }
  }

  function readHistoryJson(){
    return historySessionMode?readSessionJson(activeHistorySessionKey,[]):readJson(HISTORY_KEY,[]);
  }

  function writeHistoryJson(messages){
    return historySessionMode?writeSessionJson(activeHistorySessionKey,messages):writeJson(HISTORY_KEY,messages);
  }

  function writeHistorySchema(){
    return historySessionMode
      ? writeSessionString(activeHistorySessionSchemaKey,HISTORY_SCHEMA)
      : writeStorageString(HISTORY_SCHEMA_KEY,HISTORY_SCHEMA);
  }

  function initialMessages(){
    if(!ensureHistorySchema())return [];
    const raw=readHistoryJson();
    const clean=raw
      .filter(validMessage)
      .filter(message=>!staleFailureMessage(message))
      .filter(message=>!transientInstallMessage(message))
      .slice(-MAX_HISTORY)
      .map(message=>normalizeAnswerTruth({
        ...message,
        id:message.id||makeMessageId()
      }));
    if(clean.length!==raw.length||clean.some((message,index)=>message.id!==raw[index]?.id))writeHistoryJson(clean);
    return clean;
  }

  function readActiveModelId(){
    return canonicalHostedModelId(readStorageString(ACTIVE_MODEL_KEY,CANONICAL_HOSTED_MODEL_ID));
  }

  function persistActiveModelId(){
    writeStorageString(ACTIVE_MODEL_KEY,canonicalHostedModelId(state.activeModelId||CANONICAL_HOSTED_MODEL_ID));
  }

  function canonicalHostedModelId(value){
    const id=String(value||'').trim();
    return CANONICAL_HOSTED_MODEL_ALIASES.has(id.toLowerCase())?CANONICAL_HOSTED_MODEL_ID:id;
  }

  function isCanonicalHostedModel(model){
    return model?.route==='hosted'&&(
      canonicalHostedModelId(model?.id)===CANONICAL_HOSTED_MODEL_ID||
      canonicalHostedModelId(model?.model)===CANONICAL_HOSTED_MODEL_ID
    );
  }

  function pinnedRouteIds(){
    return readJson(PINNED_ROUTES_KEY,[])
      .map(id=>String(id||'').trim())
      .filter(Boolean)
      .slice(0,8);
  }

  function routePinned(model){
    return pinnedRouteIds().includes(String(model?.id||''));
  }

  function setRoutePinned(id,pinned){
    const value=String(id||'').trim();
    if(!value)return [];
    const next=pinned
      ? [value].concat(pinnedRouteIds().filter(item=>item!==value)).slice(0,8)
      : pinnedRouteIds().filter(item=>item!==value);
    writeJson(PINNED_ROUTES_KEY,next);
    return next;
  }

  function toolbarToolById(id){
    const value=String(id||'').trim();
    return TOOLBAR_TOOL_DEFINITIONS.find(tool=>tool.id===value)||null;
  }

  function pinnedToolbarToolIds(){
    const seen=new Set();
    return readJson(TOOLBAR_TOOLS_KEY,[])
      .map(id=>String(id||'').trim())
      .filter(id=>toolbarToolById(id))
      .filter(id=>{
        if(seen.has(id))return false;
        seen.add(id);
        return true;
      })
      .slice(0,4);
  }

  function toolbarToolPinned(id){
    return pinnedToolbarToolIds().includes(String(id||''));
  }

  function setToolbarToolPinned(id,pinned){
    const value=String(id||'').trim();
    if(!toolbarToolById(value))return [];
    const current=pinnedToolbarToolIds();
    const next=pinned
      ? current.concat([value]).filter((item,index,all)=>all.indexOf(item)===index).slice(0,4)
      : current.filter(item=>item!==value);
    writeJson(TOOLBAR_TOOLS_KEY,next);
    return next;
  }

  function modelFilter(){
    const value=readStorageString(MODEL_FILTER_KEY,'all');
    return ['all','hosted','local','pinned'].includes(value)?value:'all';
  }

  function modelFilterLabel(value=modelFilter()){
    return {
      all:'Alle',
      hosted:'Hostede',
      local:'Lokale',
      pinned:'Festede'
    }[value]||'Alle';
  }

  function modelFilterDetail(value=modelFilter()){
    return {
      all:'Vis alle tilgjengelige ruter.',
      hosted:'Vis bare hostede ruter.',
      local:'Vis bare private lokale ruter.',
      pinned:'Vis ruter som er festet i denne nettleseren.'
    }[value]||'Vis alle tilgjengelige ruter.';
  }

  function nextModelFilter(){
    const order=['all','hosted','local','pinned'];
    return order[(order.indexOf(modelFilter())+1)%order.length]||'all';
  }

  function setModelFilter(value){
    const next=['all','hosted','local','pinned'].includes(value)?value:'all';
    writeStorageString(MODEL_FILTER_KEY,next);
    return next;
  }

  function modelVisibleInFilter(model,value=modelFilter()){
    if(value==='hosted')return model?.route==='hosted';
    if(value==='local')return model?.route==='local';
    if(value==='pinned')return routePinned(model);
    return true;
  }

  function promptPresetCatalog(){
    const seen=new Set();
    const cached=readJson(PROMPT_CATALOG_KEY,{});
    const apiPresets=Array.isArray(cached?.presets)?cached.presets:[];
    return DEFAULT_PROMPT_PRESETS
      .concat(apiPresets)
      .map(normalizePromptPreset)
      .filter(Boolean)
      .filter(preset=>{
        if(seen.has(preset.id))return false;
        seen.add(preset.id);
        return true;
      })
      .slice(0,8);
  }

  function savedPromptPresets(){
    return readJson(PROMPT_PRESETS_KEY,[])
      .map(normalizePromptPreset)
      .filter(Boolean)
      .slice(-8)
      .reverse();
  }

  function writeSavedPromptPresets(presets){
    writeJson(PROMPT_PRESETS_KEY,(presets||[]).map(normalizePromptPreset).filter(Boolean).slice(-12));
  }

  function promptPresetById(id){
    const value=String(id||'');
    return savedPromptPresets().concat(promptPresetCatalog()).find(preset=>preset.id===value)||null;
  }

  function promptPresetTitle(prompt){
    return String(prompt||'')
      .replace(/\s+/g,' ')
      .trim()
      .slice(0,48)||'Saved prompt';
  }

  function promptPresetApiFetchAllowed(){
    const host=String(location.hostname||'').toLowerCase();
    return host==='mmir.ai'||host==='staging.mmir.ai';
  }

  async function refreshPromptPresets(){
    if(!promptPresetApiFetchAllowed())return false;
    try{
      const data=await fetchJson(API_URL+PROMPT_PRESETS_PATH,{timeoutMs:7000});
      const presets=(Array.isArray(data?.presets)?data.presets:Array.isArray(data?.data)?data.data:[])
        .map(normalizePromptPreset)
        .filter(Boolean);
      if(presets.length){
        writeJson(PROMPT_CATALOG_KEY,{fetchedAt:new Date().toISOString(),presets});
      }
    }catch(error){}
  }

  async function verifyPromptSavePlan(){
    if(!promptPresetApiFetchAllowed())return false;
    try{
      await fetchJson(API_URL+PROMPT_SAVE_PLAN_PATH,{timeoutMs:5000});
      return true;
    }catch(error){
      return false;
    }
  }

  function ownerSuggestionCommand(prompt){
    const match=String(prompt||'').trim().match(/^\/admin\s+([^\s]+)\s+([\s\S]+)$/i);
    if(!match)return null;
    const suggestion=redactOwnerSuggestionText(match[2]);
    if(!suggestion)return null;
    return {code:String(match[1]||'').trim(),suggestion};
  }

  function feedbackMentionCommand(prompt){
    const match=String(prompt||'').trim().match(/^@([a-z0-9][a-z0-9_.-]{1,39})\b\s+([\s\S]+)$/i);
    if(!match)return null;
    const suggestion=redactOwnerSuggestionText(match[2]);
    if(!suggestion)return null;
    return {
      target:String(match[1]||'feedback').toLowerCase(),
      suggestion
    };
  }

  function promptFrictionSignal(prompt){
    const raw=String(prompt||'').trim();
    const text=raw.toLowerCase();
    if(!raw||raw.length<8)return null;
    const productRelated=/\b(mmir|supergeni|boost|swarm|ask all|best answer|compare|debate|model health|model|models|modell|modeller|node|noder|local|lokal|connector|connect|koblet|koble|setup|install|knapp|meny|menu|toolbar|feedback|app|chatten|nettsiden|ui|ux|privacy|privat|route|rute)\b/i.test(raw);
    const answerQualityComplaint=/\b(dette\s+er\s+for\s+dårlig|for\s+dårlig|dårlig\s+svar|ikke\s+bra\s+nok|helt\s+feil|bommet|latterlig|unyttig|svaret\s+er\s+feil|bad\s+answer|poor\s+answer|wrong\s+answer|not\s+good\s+enough)\b/i.test(raw);
    const frictionLike=/\b(funker ikke|virker ikke|feil|bug|crash|trøbbel|stuck|skjønner ikke|forvirr|vanskelig|treg|slow|truncat|avkutt|mangler|missing|finner ikke|kan ikke|hvor er|hvordan|hjelp|guide|savner|ønsker|burde|bør|må være|skulle hatt|not working|confusing|hard to|where is|how do i|i miss|wish|should)\b/i.test(raw)||answerQualityComplaint;
    if(!productRelated&&!frictionLike)return null;
    let surface='general_chat';
    if(/\b(boost|ask all|swarm|compare|best answer|debate|diskusjon|debatt)\b/i.test(raw))surface='multi_model_tools';
    else if(/\b(node|noder|local|lokal|connector|connect|koblet|koble|setup|install|ollama)\b/i.test(raw))surface='node_setup';
    else if(/\b(model|models|modell|modeller|model health|picker|velg)\b/i.test(raw))surface='model_choice';
    else if(/\b(knapp|meny|menu|toolbar|\+|button)\b/i.test(raw))surface='composer_tools';
    else if(/\b(feedback|tilbakemelding|forslag|issue)\b/i.test(raw))surface='feedback_flow';
    else if(/\b(truncat|avkutt|kortet|stoppet|dårlig|feil svar|ikke bra nok|bommet|latterlig|bad answer|wrong answer|poor answer)\b/i.test(raw))surface='answer_quality';
    else if(/\b(privat|privacy|secret|token|api key|sikkerhet)\b/i.test(raw))surface='trust_privacy';
    let kind='question_or_guidance';
    if(/\b(savner|ønsker|burde|bør|må være|skulle hatt|i miss|wish|should)\b/i.test(raw))kind='feature_or_ux_request';
    if(/\b(funker ikke|virker ikke|feil|bug|crash|trøbbel|stuck|treg|slow|truncat|avkutt|dårlig|ikke bra nok|bommet|latterlig|not working|broken|failed|bad answer|wrong answer|poor answer)\b/i.test(raw))kind='bug_or_failure';
    if(/\b(skjønner ikke|forvirr|vanskelig|confusing|hard to|hvor er|hvordan|where is|how do i)\b/i.test(raw))kind=kind==='question_or_guidance'?'confusion_or_guidance':kind;
    const severity=kind==='bug_or_failure'?'p2-bug':(kind==='feature_or_ux_request'?'p3-ux':'p5-guidance');
    const autoDraft=(productRelated||answerQualityComplaint)&&kind!=='question_or_guidance';
    return {
      kind,
      surface,
      severity,
      auto_draft:autoDraft,
      lang:/[æøå]|\b(ikke|jeg|hvor|hvordan|knapp|meny|noder|virker)\b/i.test(raw)?'no':'en',
      chars:raw.length,
      words:raw.split(/\s+/).filter(Boolean).length
    };
  }

  function redactOwnerSuggestionText(value){
    return String(value||'')
      .replace(/\s+/g,' ')
      .trim()
      .slice(0,1600)
      .replace(OWNER_SECRETISH_RE,'[redacted-secret-like-value]')
      .replace(OWNER_PROVIDER_KEY_RE,'[redacted-provider-key]');
  }

  function feedbackPreviousTurnContext(){
    const messages=Array.isArray(state.messages)?state.messages:[];
    const prior=[...messages].reverse();
    const previousAssistant=prior.find(message=>message&&message.role==='assistant'&&String(message.content||'').trim()&&!CHAT_STATE.transient?.(message.content))||null;
    const previousUser=prior.find(message=>message&&message.role==='user'&&String(message.content||'').trim())||null;
    if(!previousAssistant&&!previousUser)return null;
    return {
      previous_user: previousUser ? redactOwnerSuggestionText(previousUser.content).slice(0,700) : '',
      previous_assistant: previousAssistant ? redactOwnerSuggestionText(previousAssistant.content).slice(0,900) : '',
      previous_assistant_label: previousAssistant ? String(previousAssistant.label||'').slice(0,80) : '',
      previous_receipt: previousAssistant ? redactOwnerSuggestionText(previousAssistant.receipt||'').slice(0,500) : ''
    };
  }

  function feedbackSuggestionWithContext(suggestion,context=feedbackPreviousTurnContext()){
    const base=redactOwnerSuggestionText(suggestion);
    if(!base||!context)return base;
    const lines=[
      base,
      '',
      '[linked previous turn]',
      context.previous_user?('previous_user: '+context.previous_user):'',
      context.previous_assistant?('previous_assistant: '+context.previous_assistant):'',
      context.previous_assistant_label?('previous_assistant_label: '+context.previous_assistant_label):'',
      context.previous_receipt?('previous_receipt: '+context.previous_receipt):''
    ].filter(Boolean);
    return redactOwnerSuggestionText(lines.join('\n'));
  }

  function cleanTelemetryKey(key){
    return String(key||'')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_.:-]+/g,'_')
      .replace(/_+/g,'_')
      .replace(/^_+|_+$/g,'')
      .slice(0,48);
  }

  function cleanTelemetryValue(value){
    if(typeof value==='boolean')return value;
    if(typeof value==='number'&&Number.isFinite(value))return Math.round(value*1000)/1000;
    if(typeof value==='string'){
      return redactOwnerSuggestionText(value).slice(0,180);
    }
    return null;
  }

  function sanitizeTelemetryMetadata(metadata){
    const source=metadata&&typeof metadata==='object'?metadata:{};
    const clean={};
    Object.entries(source).forEach(([rawKey,rawValue])=>{
      const key=cleanTelemetryKey(rawKey);
      if(!key||TELEMETRY_DENIED_FIELD_RE.test(key))return;
      if(Array.isArray(rawValue)){
        const values=rawValue.map(cleanTelemetryValue).filter(value=>value!==null).slice(0,8);
        if(values.length)clean[key]=values;
        return;
      }
      const value=cleanTelemetryValue(rawValue);
      if(value!==null)clean[key]=value;
    });
    return clean;
  }

  function interactionSessionId(){
    let id=readStorageString(INTERACTION_SESSION_KEY,'');
    if(!id){
      id='sess_'+(window.crypto?.randomUUID?window.crypto.randomUUID():String(Date.now()).replace(/[^0-9]/g,''));
      writeStorageString(INTERACTION_SESSION_KEY,id);
    }
    return id;
  }

  function telemetryEventId(){
    if(window.crypto?.randomUUID)return 'evt_'+window.crypto.randomUUID();
    const bytes=new Uint32Array(2);
    if(window.crypto?.getRandomValues){
      window.crypto.getRandomValues(bytes);
      return 'evt_'+Date.now().toString(36)+'_'+Array.from(bytes).map(value=>value.toString(36)).join('');
    }
    return 'evt_'+Date.now().toString(36);
  }

  function stableLocalFingerprint(value){
    value=String(value||'');
    let hash=2166136261;
    for(let index=0;index<value.length;index+=1){
      hash^=value.charCodeAt(index);
      hash=Math.imul(hash,16777619);
    }
    return (hash>>>0).toString(36).padStart(7,'0').slice(0,7);
  }

  function interactionEventQueue(){
    const events=readJson(INTERACTION_EVENTS_KEY,[]);
    return Array.isArray(events)?events.filter(event=>event&&event.event_name).slice(-100):[];
  }

  function writeInteractionEventQueue(events){
    writeJson(INTERACTION_EVENTS_KEY,(Array.isArray(events)?events:[])
      .filter(event=>event&&event.event_name)
      .slice(-100));
  }

  function interactionBaseMetadata(metadata){
    const model=typeof activeModel==='function'?activeModel():null;
    const pool=typeof intelligencePoolSummary==='function'?intelligencePoolSummary():{};
    const base={
      privacy_mode:typeof privacyMode==='function'?privacyMode():'public',
      active_model_id:model?.id||'',
      active_model_route:model?.route||'',
      active_route_count:Number(state?.routeInventory?.activeRoutes)||0,
      visible_model_count:Number(state?.routeInventory?.totalRoutes)||0,
      future_route_count:Number(state?.routeInventory?.futureRoutes)||0,
      active_provider_route_count:Number(state?.routeInventory?.activePublicProviderRoutes)||0,
      active_external_node_count:Number(state?.routeInventory?.activeExternalNodeRoutes)||0,
      compare_ready:Boolean(pool?.compareReady),
      viewport_width:Number(window.innerWidth)||0,
      viewport_height:Number(window.innerHeight)||0,
      online:navigator.onLine!==false
    };
    return sanitizeTelemetryMetadata({...base,...metadata});
  }

  function telemetryCaptureAllowed(){
    const origin=String(window.location?.origin||'');
    return origin==='https://mmir.ai'||
      origin==='https://www.mmir.ai'||
      origin==='https://staging.mmir.ai'||
      origin==='https://inkognitroz.github.io';
  }

  function sendInteractionEvents(events){
    const cleanEvents=(Array.isArray(events)?events:[]).filter(event=>event&&event.event_name).slice(0,10);
    if(!cleanEvents.length)return;
    if(!telemetryCaptureAllowed())return;
    const body=JSON.stringify({
      source:'mmir-p0-chat',
      page:'mmir.ai/mmir.html',
      runtime_version:P0_RUNTIME_VERSION,
      events:cleanEvents
    });
    const url=API_URL+TELEMETRY_EVENTS_PATH;
    try{
      fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body,keepalive:true,credentials:'omit'}).catch(()=>{});
    }catch(error){}
  }

  function captureInteraction(eventName,metadata={}){
    const event={
      id:telemetryEventId(),
      event_name:cleanTelemetryKey(eventName)||'interaction',
      created_at:new Date().toISOString(),
      session_id:interactionSessionId(),
      source:'mmir-p0-chat',
      page:'mmir.ai/mmir.html',
      runtime_version:P0_RUNTIME_VERSION,
      metadata:interactionBaseMetadata(metadata)
    };
    writeInteractionEventQueue(interactionEventQueue().concat(event));
    sendInteractionEvents([event]);
    return event;
  }

  function demoTranscriptParams(){
    try{return new URLSearchParams(window.location?.search||'');}
    catch(error){return new URLSearchParams('');}
  }

  function hostedDemoOrigin(){
    const host=String(window.location?.hostname||'').toLowerCase();
    return host==='mmir.ai'||host==='www.mmir.ai'||host==='staging.mmir.ai';
  }

  function localPreviewDemoOrigin(){
    const host=String(window.location?.hostname||'').toLowerCase();
    return host==='127.0.0.1'||host==='localhost'||host==='::1';
  }

  function demoTranscriptOptOut(params=demoTranscriptParams()){
    return params.get('demo_capture')==='0'||params.has('no_demo_capture')||readStorageString(DEMO_TRANSCRIPT_CONSENT_KEY,'')==='declined';
  }

  function demoTranscriptModeRequested(params=demoTranscriptParams()){
    if(demoTranscriptOptOut(params))return false;
    if(readStorageString(DEMO_TRANSCRIPT_CONSENT_KEY,'')==='accepted')return true;
    if(readStorageString(DEMO_GROWTH_MODE_KEY,'')==='true')return true;
    if(params.has('demo_capture')||
      params.has('mmir_demo')||
      params.has('user_test')||
      params.has('mmir_qa_session'))return true;
    if([...params.keys()].some(key=>/^codex_|^b0_|^first_click_guard|^responsive_guard/i.test(key)))return true;
    return hostedDemoOrigin();
  }

  function demoTranscriptConsentActive(params=demoTranscriptParams()){
    if(demoTranscriptOptOut(params)||!demoTranscriptModeRequested(params))return false;
    if(readStorageString(DEMO_TRANSCRIPT_CONSENT_KEY,'')==='accepted')return true;
    if(readStorageString(DEMO_GROWTH_MODE_KEY,'')==='true')return true;
    if(params.get('demo_capture')==='1'||params.has('user_test')||params.has('mmir_qa_session'))return true;
    return false;
  }

  function ensureDemoTranscriptConsentNotice(source='conversation_update'){
    if(superPrivateModeActive())return false;
    const params=demoTranscriptParams();
    if(!demoTranscriptModeRequested(params))return false;
    if(readStorageString(DEMO_TRANSCRIPT_CONSENT_KEY,'')==='accepted')return true;
    if(readStorageString(DEMO_TRANSCRIPT_CONSENT_KEY,'')==='declined')return false;
    if(readStorageString(DEMO_TRANSCRIPT_NOTICE_KEY,'')==='shown')return demoTranscriptConsentActive(params);
    writeStorageString(DEMO_TRANSCRIPT_NOTICE_KEY,'shown');
    if(!state.busy){
      status('Demo-læring av. Rå testdialog lagres ikke uten opt-in.','ready');
    }
    routeStatus('Demo-læring av · rå dialog lagres ikke · slå på i Personvern','hosted');
    captureInteraction('demo_transcript_consent_visible',{
      source,
      demo_capture:false,
      hosted_demo:hostedDemoOrigin(),
      raw_transcript_enabled:false
    });
    return false;
  }

  function setDemoTranscriptConsent(enabled){
    const accepted=Boolean(enabled);
    writeStorageString(DEMO_TRANSCRIPT_CONSENT_KEY,accepted?'accepted':'declined');
    writeStorageString(DEMO_TRANSCRIPT_NOTICE_KEY,'shown');
    clearTimeout(demoTranscriptTimer);
    renderPrivacyMenu();
    const label=accepted?'Demo-læring på':'Demo-læring av';
    status(label+'.','ready');
    routeStatus(accepted?'Demo-læring · rå testdialog kan lagres':'Demo-læring av · rå dialog lagres ikke','hosted');
    captureInteraction('demo_transcript_consent_changed',{
      demo_capture:accepted,
      hosted_demo:hostedDemoOrigin()
    });
    if(accepted){
      scheduleDemoTranscriptCapture('demo_transcript_consent_enabled',{explicit_choice:true});
    }
  }

  function demoTranscriptCaptureEnabled(){
    if(superPrivateModeActive())return false;
    const params=demoTranscriptParams();
    return demoTranscriptConsentActive(params);
  }

  function demoTranscriptUploadAllowed(){
    return (hostedDemoOrigin()||localPreviewDemoOrigin())&&demoTranscriptCaptureEnabled();
  }

  function redactDemoTranscriptText(value,limit=4000){
    return String(value||'')
      .replace(/\r/g,'')
      .replace(/\n{5,}/g,'\n\n\n\n')
      .trim()
      .slice(0,limit)
      .replace(OWNER_SECRETISH_RE,'[redacted-secret-like-value]')
      .replace(OWNER_PROVIDER_KEY_RE,'[redacted-provider-key]')
      .replace(DEMO_NORWEGIAN_FNR_RE,'[redacted-fnr]')
      .replace(DEMO_EMAIL_RE,'[redacted-epost]')
      .replace(DEMO_NORWEGIAN_ACCOUNT_RE,'[redacted-kontonr]')
      .replace(DEMO_PHONE_RE,'[redacted-tlf]');
  }

  function demoTranscriptMessages(){
    return state.messages
      .filter(message=>message&&(message.role==='user'||message.role==='assistant'))
      .slice(-40)
      .map(message=>{
        const content=redactDemoTranscriptText(message.content||'');
        const receipt=redactDemoTranscriptText(message.receipt||'',1200);
        const item={
          id:String(message.id||'').slice(0,96),
          role:message.role,
          label:String(message.label||'').slice(0,80),
          variant:String(message.variant||'').slice(0,80),
          created_at:String(message.createdAt||'').slice(0,80),
          content,
          truncated:Boolean(message.truncated),
          continuation_needed:Boolean(message.truncated||message.continuationLabel||message.continuationSuggestedMessage),
          actions_available:message.actions!==false
        };
        if(receipt)item.receipt=receipt;
        if(message.command)item.command=String(message.command||'').slice(0,80);
        if(message.commandLabel)item.command_label=String(message.commandLabel||'').slice(0,120);
        return item;
      })
      .filter(message=>message.content);
  }

  function demoLearningClientContext(){
    const params=demoTranscriptParams();
    const resolvedTimezone=(()=>{try{return Intl.DateTimeFormat().resolvedOptions().timeZone||'';}catch(error){return '';}})();
    const storageWritable=(()=>{try{window.sessionStorage.setItem('mmir-demo-storage-probe','1');window.sessionStorage.removeItem('mmir-demo-storage-probe');return true;}catch(error){return false;}})();
    return {
      demo_learning_scope:'wide_visible_demo',
      capture_scope:['conversation','feedback','clicks','route_receipts','sources','latency','browser_context','device_context'],
      notice_visible:readStorageString(DEMO_TRANSCRIPT_NOTICE_KEY,'')==='shown',
      hosted_demo:hostedDemoOrigin(),
      browser_language:String(navigator.language||'').slice(0,32),
      browser_languages:Array.isArray(navigator.languages)?navigator.languages.slice(0,5).join(','):'',
      timezone:resolvedTimezone,
      user_agent_family:String(navigator.userAgent||'').slice(0,180),
      platform:String(navigator.platform||'').slice(0,80),
      viewport_width:Number(window.innerWidth)||0,
      viewport_height:Number(window.innerHeight)||0,
      screen_width:Number(window.screen?.width)||0,
      screen_height:Number(window.screen?.height)||0,
      color_depth:Number(window.screen?.colorDepth)||0,
      device_pixel_ratio:Number(window.devicePixelRatio)||1,
      online:navigator.onLine!==false,
      browser_storage_available:storageWritable,
      query_flags:[...params.keys()].slice(0,12)
    };
  }

  function demoTranscriptHash(messages){
    return messages.map(message=>[
      message.id,
      message.role,
      message.content.length,
      message.content.slice(0,80),
      message.content.slice(-80)
    ].join(':')).join('|');
  }

  function sendDemoTranscript(reason='conversation_update',metadata={}){
    if(!demoTranscriptUploadAllowed())return;
    const messages=demoTranscriptMessages();
    if(!messages.length)return;
    const hash=demoTranscriptHash(messages);
    if(hash===lastDemoTranscriptHash)return;
    lastDemoTranscriptHash=hash;
    const body=JSON.stringify({
      demo_mode:true,
      consent:true,
      capture_consent:'demo_transcript',
      source:'mmir-chat-demo',
      page:'mmir.ai/mmir.html',
      runtime_version:P0_RUNTIME_VERSION,
      session_id:interactionSessionId(),
      metadata:sanitizeTelemetryMetadata({
        ...demoLearningClientContext(),
        reason,
        message_count:messages.length,
        privacy_mode:privacyMode(),
        ...metadata
      }),
      messages
    });
    try{
      fetch(API_URL+DEMO_TRANSCRIPT_PATH,{method:'POST',headers:{'Content-Type':'application/json'},body,keepalive:true,credentials:'omit'})
        .then(async response=>{
          let result={};
          try{result=await response.json();}catch(error){}
          const persisted=Boolean(result?.durable_transcript_persisted);
          captureInteraction(persisted?'demo_transcript_persisted':'demo_transcript_not_persisted',{
            reason,
            message_count:messages.length,
            demo_capture:true,
            transcript_status:response.ok?'server_response':'http_error',
            transcript_persisted:persisted,
            store_reason:String(result?.durable_feedback_store?.reason||result?.durable_feedback_store?.persistence_reason||result?.reason||'').slice(0,80)
          });
        })
        .catch(()=>{
          captureInteraction('demo_transcript_failed',{
            reason,
            message_count:messages.length,
            demo_capture:true,
            transcript_status:'network_error',
            transcript_persisted:false
          });
        });
    }catch(error){}
  }

  function scheduleDemoTranscriptCapture(reason='conversation_update',metadata={}){
    if(superPrivateModeActive())return;
    ensureDemoTranscriptConsentNotice(reason);
    if(!demoTranscriptCaptureEnabled())return;
    clearTimeout(demoTranscriptTimer);
    demoTranscriptTimer=setTimeout(()=>sendDemoTranscript(reason,metadata),700);
  }

  function ownerSuggestionRouteText(plan){
    if(plan?.accepted&&plan?.submission?.issue_number){
      return 'Owner intake · issue #'+plan.submission.issue_number+' · Project Control';
    }
    if(plan?.submission?.reason==='owner_code_invalid'){
      return 'Owner intake · code not accepted · no issue created';
    }
    if(plan?.owner_auth_configured===false){
      return 'Owner intake · draft ready · server setup needed';
    }
    return 'Owner intake · draft ready · no paid route';
  }

  function ownerSuggestionAnswer(plan){
    if(plan?.accepted){
      const issue=plan?.submission?.issue_url?'\n\n'+plan.submission.issue_url:'';
      return 'Development issue created in Project Control.'+issue;
    }
    if(plan?.submission?.reason==='owner_code_invalid'){
      return 'Owner code was not accepted. I did not create an issue.';
    }
    if(plan?.owner_auth_configured===false){
      return 'Improvement draft ready. Owner intake needs server-side setup before chat can auto-create issues.';
    }
    return 'Improvement draft ready for Project Control.';
  }

  function feedbackIntakeRouteText(plan){
    const target=plan?.target?('@'+plan.target):'@feedback';
    const id=plan?.feedback_event_id?(' · '+plan.feedback_event_id):'';
    return 'Feedback intake · '+target+' · '+feedbackIntakeStorageLabel(plan)+id+' · no paid route';
  }

  function feedbackIntakeStorageLabel(plan){
    const store=plan?.durable_feedback_store||{};
    if(store.persisted)return 'owner-readable store';
    if(store.durable_binding_configured)return 'local + store retry needed';
    return 'local + Worker log fallback';
  }

  function feedbackIntakeStorageLine(plan){
    const store=plan?.durable_feedback_store||{};
    if(store.persisted){
      return 'Storage: the owner-readable corpus is connected and this draft was saved centrally.';
    }
    if(store.durable_binding_configured){
      return 'Storage: the local Feedback Inbox is safe; the owner store exists, but server persistence still needs verification.';
    }
    return 'Storage: local Feedback Inbox + sanitized Worker log fallback. Central owner-readable storage is still not configured.';
  }

  function feedbackOwnerStoreReady(plan){
    return Boolean(
      (plan?.durable_binding_configured||plan?.kv_binding_configured) &&
      plan?.durable_store_readable &&
      plan?.durable_store_writable
    );
  }

  function feedbackIntakeAnswer(plan){
    const target=plan?.target?('@'+plan.target):'@feedback';
    const lane=plan?.draft?.classification?.lane||'product triage';
    return 'Thanks - feedback was captured as a safe improvement draft for '+target+'.\n\nCurrent lane: '+lane+'.\n'+feedbackIntakeStorageLine(plan)+'\n\nWe do not store admin codes or provider keys in chat, and this does not start any paid routes.';
  }

  function feedbackInboxItems(){
    return readJson(FEEDBACK_INBOX_KEY,[])
      .filter(item=>item&&typeof item==='object'&&item.suggestion)
      .slice(-50)
      .reverse();
  }

  function feedbackCaptureServerState(item){
    const explicit=String(item?.server_state||'').trim().toLowerCase();
    if(explicit==='pending'||explicit==='local_only'||explicit==='synced')return explicit;
    const status=String(item?.status||'').trim().toLowerCase();
    if(status==='pending_server_intake')return 'pending';
    if(status==='local_fallback')return 'local_only';
    if(status==='submitted'||status==='accepted'||status==='draft_synced')return 'synced';
    return 'local_only';
  }

  function feedbackCaptureCounts(items=feedbackInboxItems()){
    const source=Array.isArray(items)?items:[];
    const counts={total:0,synced:0,pending:0,local_only:0,state:'idle'};
    source.forEach(item=>{
      const key=feedbackCaptureServerState(item);
      counts.total+=1;
      if(key==='synced')counts.synced+=1;
      else if(key==='pending')counts.pending+=1;
      else counts.local_only+=1;
    });
    if(!counts.total)return counts;
    if((counts.synced&&counts.pending)||(counts.synced&&counts.local_only)||(counts.pending&&counts.local_only))counts.state='mixed';
    else if(counts.pending)counts.state='pending';
    else if(counts.synced)counts.state='synced';
    else counts.state='local_only';
    return counts;
  }

  function feedbackCaptureSummary(counts=feedbackCaptureCounts()){
    const total=Number(counts?.total)||0;
    if(total<=0)return '';
    if(counts.state==='synced')return 'Feedback Inbox · '+total+' synced';
    if(counts.state==='pending')return 'Feedback Inbox · '+total+' pending sync';
    if(counts.state==='local_only')return 'Feedback Inbox · '+total+' local-only';
    return 'Feedback Inbox · '+total+' mixed sync';
  }

  function feedbackCaptureDetail(counts=feedbackCaptureCounts()){
    const total=Number(counts?.total)||0;
    if(total<=0)return '';
    const parts=[];
    if(counts.synced)parts.push(String(counts.synced)+' synced');
    if(counts.pending)parts.push(String(counts.pending)+' pending sync');
    if(counts.local_only)parts.push(String(counts.local_only)+' local-only');
    return parts.join(' · ');
  }

  function renderFeedbackCaptureStatus(){
    const el=document.getElementById('p0-feedback-capture');
    if(!el)return;
    const counts=feedbackCaptureCounts();
    const summary=feedbackCaptureSummary(counts);
    const detail=feedbackCaptureDetail(counts);
    const label=summary||'Feedback Inbox';
    const composer=document.getElementById('p0-composer');
    if(composer)composer.dataset.feedbackCaptured=summary?'true':'false';
    if(composer)composer.dataset.feedbackCaptureState=counts.state||'idle';
    el.hidden=false;
    el.textContent=label;
    el.title=summary
      ? ('Open Feedback Inbox. '+detail+'. No paid route.')
      : 'Open Feedback Inbox. No local drafts yet. No paid route.';
    el.setAttribute('aria-label',label);
    el.dataset.count=String(counts.total||0);
    el.dataset.state=counts.state||'idle';
  }

  function markFeedbackCaptured(source='feedback_capture'){
    renderFeedbackCaptureStatus();
    const counts=feedbackCaptureCounts();
    const summary=feedbackCaptureSummary(counts);
    const detail=feedbackCaptureDetail(counts);
    if(!summary)return;
    status(summary,'ready');
    routeStatus(summary+(detail?(' · '+detail):'')+' · no paid route','ready');
    captureInteraction('feedback_capture_visible',{
      source,
      local_feedback_count:counts.total,
      feedback_capture_state:counts.state,
      feedback_synced_count:counts.synced,
      feedback_pending_count:counts.pending,
      feedback_local_only_count:counts.local_only
    });
  }

  function writeFeedbackInboxItems(items){
    writeJson(FEEDBACK_INBOX_KEY,(items||[])
      .filter(item=>item&&typeof item==='object'&&item.suggestion)
      .slice(-80));
    renderFeedbackCaptureStatus();
  }

  function saveFeedbackInboxItem(item){
    if(!item||!item.suggestion)return false;
    const current=readJson(FEEDBACK_INBOX_KEY,[]);
    const next=current.filter(existing=>String(existing?.id||'')!==String(item.id||''));
    next.push({
      id:item.id||('fb_local_'+Date.now().toString(36)),
      created_at:item.created_at||new Date().toISOString(),
      target:item.target||'',
      source:item.source||'mmir-chat-feedback',
      status:item.status||'draft_ready',
      priority:item.priority||'p5-triage',
      title:item.title||'Feedback draft',
      suggestion:redactOwnerSuggestionText(item.suggestion||''),
      classification:item.classification||{},
      no_paid_routes_started:true,
      provider_called:false,
      server_state:item.server_state||''
    });
    writeFeedbackInboxItems(next);
    renderFeedbackCaptureStatus();
    return true;
  }

  function saveFeedbackDraft(suggestion,options={}){
    const cleaned=redactOwnerSuggestionText(suggestion);
    if(!cleaned)return false;
    const source=String(options.source||'feedback_draft').trim()||'feedback_draft';
    const target=String(options.target||'feedback').trim().replace(/^@+/,'')||'feedback';
    const priority=String(options.priority||'p3-ux').trim()||'p3-ux';
    const lane=String(options.lane||'L1 Frontend UX').trim()||'L1 Frontend UX';
    const repo=String(options.repo||'inkognitroz.github.io').trim()||'inkognitroz.github.io';
    const title=String(options.title||'Feedback local draft').trim()||'Feedback local draft';
    const backlogHint=String(options.backlogHint||'feedback-local-draft').trim()||'feedback-local-draft';
    saveFeedbackInboxItem({
      id:'fb_local_'+telemetryEventId().replace(/^evt_/,''),
      created_at:new Date().toISOString(),
      target,
      source,
      status:'draft_ready',
      priority,
      title,
      suggestion:cleaned,
      classification:{lane,repo,backlog_hint:backlogHint},
      no_paid_routes_started:true,
      provider_called:false,
      server_state:'local_only'
    });
    markFeedbackCaptured(source);
    captureInteraction('feedback_local_draft_saved',{
      source,
      target,
      priority,
      lane,
      local_feedback_count:feedbackInboxItems().length
    });
    if(options.openInbox)openFeedbackInbox(source);
    return true;
  }

  function removeFeedbackInboxItem(id){
    const value=String(id||'');
    if(!value)return false;
    const current=readJson(FEEDBACK_INBOX_KEY,[]);
    writeFeedbackInboxItems(current.filter(item=>String(item?.id||'')!==value));
    renderFeedbackCaptureStatus();
    return true;
  }

  function feedbackPriorityLabel(priority){
    const value=String(priority||'p5-triage');
    if(value==='p1-risk')return 'Risk';
    if(value==='p2-bug')return 'Bug';
    if(value==='p3-ux')return 'UX';
    if(value==='p4-feature')return 'Feature';
    return 'Triage';
  }

  function feedbackSourceLabel(source){
    const value=String(source||'feedback_draft').trim();
    if(!value)return 'Feedback draft';
    return value
      .replace(/^mmir-/,'')
      .replace(/^p0-/,'P0 ')
      .replace(/[-_]+/g,' ')
      .replace(/\b[a-z]/g,(match)=>match.toUpperCase())
      .slice(0,60);
  }

  function feedbackItemIdLabel(item){
    const value=String(item?.id||item?.feedback_event_id||'').trim();
    return value?('ID '+value.replace(/\s+/g,'').slice(0,48)):'ID local-draft';
  }

  function feedbackStorageStatusLines(plan){
    const durable=Boolean(plan?.durable_binding_configured||plan?.kv_binding_configured);
    const readable=Boolean(plan?.durable_store_readable);
    const writable=Boolean(plan?.durable_store_writable);
    if(durable&&readable&&writable){
      return [
        'Owner store: the owner-readable learning corpus is connected and ready for authorized analysis.',
        'Server: sanitized feedback events are stored durably and can be grouped into product learning.'
      ];
    }
    if(durable){
      return [
        'Owner store: a durable binding exists, but it is not fully readable and writable yet.',
        'Fallback: local drafts in this browser + sanitized Worker logs.'
      ];
    }
    return [
      'Owner store: not connected yet.',
      'Fallback: local drafts in this browser + sanitized Cloudflare Worker logs.',
      'Missing for central analysis: an MMIR_FEEDBACK_STORE binding with owner-gated read access.'
    ];
  }

  function feedbackInboxAnswer(plan){
    const items=Array.isArray(plan?.top_items)?plan.top_items:[];
    const localItems=feedbackInboxItems();
    const counts=feedbackCaptureCounts(localItems);
    const visibleCount=items.length;
    const totalCount=Math.max(Number(plan?.item_count)||0,localItems.length,visibleCount);
    const lines=[
      'Feedback Inbox',
      '',
      totalCount?String(totalCount)+' local drafts ready for triage.':'No local drafts in this browser yet.',
      counts.total?('Capture truth: '+feedbackCaptureDetail(counts)+'.'):'Capture truth: no local drafts yet.',
      totalCount&&visibleCount&&visibleCount<totalCount?('Showing the top '+String(visibleCount)+' of '+String(totalCount)+' drafts for triage first.'):'',
      ...feedbackStorageStatusLines(plan),
      'Rule: public feedback does not become a GitHub issue automatically.',
      ''
    ];
    if(items.length){
      lines.push('Top priority:');
      items.slice(0,8).forEach((item,index)=>{
        const target=item.target?('@'+item.target):'@feedback';
        const lane=item.classification?.lane||'triage';
        const source=feedbackSourceLabel(item.source);
        lines.push(String(index+1)+'. '+feedbackPriorityLabel(item.priority)+' · '+feedbackItemIdLabel(item)+' · '+target+' · '+lane+' · via '+source+' · '+String(item.suggestion||'').replace(/\s+/g,' ').slice(0,140));
      });
    }
    lines.push('', 'Next step: promote only owner-approved items to an issue with acceptance proof.');
    return lines.join('\n');
  }

  function feedbackTriagePack(plan={}){
    const localItems=feedbackInboxItems();
    const counts=feedbackCaptureCounts(localItems);
    const planItems=Array.isArray(plan?.top_items)?plan.top_items:[];
    const items=(planItems.length?planItems:localItems).slice(0,50);
    const lines=[
      '# MMIR feedback triage pack',
      '',
      '- Generated: '+new Date().toISOString(),
      '- Runtime: '+P0_RUNTIME_VERSION,
      '- Local drafts: '+String(localItems.length),
      '- Capture truth: '+(counts.total?feedbackCaptureDetail(counts):'no local drafts yet'),
      '- Durable owner store: '+(feedbackOwnerStoreReady(plan)?'owner-readable learning corpus ready':(plan?.durable_binding_configured?'configured, not fully readable/writable':'not configured')),
      '- Provider calls: none',
      '- Paid routes: none',
      ''
    ];
    if(plan?.summary?.by_priority){
      lines.push('## Summary','','Priority: '+Object.entries(plan.summary.by_priority).map(([key,value])=>key+'='+value).join(', '),'');
    }
    if(!items.length){
      lines.push('## Items','','No local feedback drafts in this browser yet.');
      return redactShareText(lines.join('\n'));
    }
    lines.push('## Items','');
    items.forEach((item,index)=>{
      const target=item.target?('@'+item.target):'@feedback';
      const lane=item.classification?.lane||'triage';
      const repo=item.classification?.repo||'';
      lines.push(
        String(index+1)+'. ['+feedbackPriorityLabel(item.priority)+'] '+target,
        '   - Feedback ID: '+feedbackItemIdLabel(item),
        '   - Status: '+(item.status||'draft_ready'),
        '   - Lane: '+lane+(repo?' · '+repo:''),
        '   - Source: '+feedbackSourceLabel(item.source)+(item.source?' · '+String(item.source):''),
        '   - Suggestion: '+String(item.suggestion||'').replace(/\s+/g,' ').trim(),
        ''
      );
    });
    lines.push('## Control gates','','Promote only owner-approved items to GitHub issues with goal -> user story -> requirement -> acceptance proof.');
    return redactShareText(lines.join('\n'));
  }

  function modelHealthAnswer(){
    const models=Array.isArray(state.models)?state.models:[];
    const active=models.filter(model=>model&&model.executable!==false&&model.selectable!==false);
    const hosted=active.filter(model=>model.route==='hosted');
    const local=active.filter(model=>model.route==='local');
    const future=models.filter(model=>model?.executable===false||model?.selectable===false||model?.candidate);
    const providers=[...new Set(active.map(model=>model.provider||model.routeClass||model.route).filter(Boolean))]
      .slice(0,8)
      .map(providerLabel);
    const top=rankedModels()
      .filter(model=>model.executable!==false&&model.selectable!==false)
      .slice(0,8)
      .map((model,index)=>String(index+1)+'. '+model.label+' · '+(model.route==='local'?'Private local':'Hosted/free')+' · score '+effectiveModelScore(model));
    return [
      'Model Health',
      '',
      'Aktivt nå: '+active.length+' modeller · '+hosted.length+' hosted/free · '+local.length+' lokale/private.',
      future.length?('Kandidater/fremtidige ruter: '+future.length+'.'):'',
      providers.length?('Live providers: '+providers.join(', ')+'.'):'',
      '',
      'Beste ruter akkurat nå:',
      ...(top.length?top:['Ingen modelliste lastet ennå. Trykk Oppdater AI.']),
      '',
      'Status betyr tilgjengelig rute, ikke garanti for sannhet. Viktige fakta bør fortsatt verifiseres.'
    ].filter(Boolean).join('\n');
  }

  async function feedbackInboxPlan(){
    return fetchJson(API_URL+FEEDBACK_INBOX_PLAN_PATH,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({items:feedbackInboxItems()}),
      timeoutMs:10000
    });
  }

  function feedbackInboxReceipt(plan){
    if(feedbackOwnerStoreReady(plan))return 'Feedback Inbox · owner-readable learning corpus · no paid route';
    if(plan?.durable_binding_configured||plan?.kv_binding_configured)return 'Feedback Inbox · local drafts + durable store needs check · no paid route';
    return 'Feedback Inbox · local drafts + sanitized Worker logs · no paid route';
  }

  function openFeedbackInbox(source='feedback_inbox'){
    closeMenus();
    captureInteraction('feedback_inbox_opened',{surface:source,local_feedback_count:feedbackInboxItems().length});
    const assistant=append('assistant','Opening Feedback Inbox...','MMIR Feedback','Feedback Inbox · checking owner-readable learning rail',{actions:false});
    status('Loading Feedback Inbox.','loading');
    routeStatus('Feedback Inbox · no provider call · no paid route','hosted');
    feedbackInboxPlan().then(plan=>{
      captureInteraction('feedback_inbox_ready',{surface:source,local_feedback_count:Number(plan?.item_count)||0});
      updateMessage(assistant,feedbackInboxAnswer(plan),{receipt:feedbackInboxReceipt(plan),actions:false});
      status('Feedback Inbox ready.','ready');
      routeStatus(feedbackOwnerStoreReady(plan)?'Feedback Inbox · owner learning rail ready':'Feedback Inbox · review and promote intentionally','ready');
      renderFeedbackCaptureStatus();
    }).catch(()=>{
      captureInteraction('feedback_inbox_fallback',{surface:source,local_feedback_count:feedbackInboxItems().length});
      updateMessage(assistant,feedbackInboxAnswer({item_count:feedbackInboxItems().length,top_items:feedbackInboxItems()}),{receipt:'Feedback Inbox · local fallback · no provider call',actions:false});
      status('Feedback Inbox server plan unavailable; showing local drafts.','ready');
      routeStatus('Feedback Inbox · local fallback','hosted');
      renderFeedbackCaptureStatus();
    });
    document.getElementById('p0-input')?.focus();
    return true;
  }

  async function copyFeedbackTriagePack(source='feedback_triage_pack'){
    closeMenus();
    captureInteraction('feedback_triage_pack_copy_started',{surface:source,local_feedback_count:feedbackInboxItems().length});
    let plan=null;
    try{
      plan=await feedbackInboxPlan();
    }catch(error){
      plan={item_count:feedbackInboxItems().length,top_items:feedbackInboxItems(),summary:{}};
    }
    const copied=await writeClipboard(feedbackTriagePack(plan));
    captureInteraction(copied?'feedback_triage_pack_copied':'feedback_triage_pack_copy_blocked',{
      surface:source,
      local_feedback_count:feedbackInboxItems().length
    });
    status(copied?'Feedback triage pack copied.':'Copy blocked. Feedback drafts remain in Feedback Inbox.',copied?'ready':'error');
    routeStatus(copied?'Feedback triage pack · sanitized copy · no paid route':'Feedback triage pack · copy blocked · local drafts safe',copied?'ready':'error');
    document.getElementById('p0-input')?.focus();
    return true;
  }

  async function submitOwnerSuggestionCommand(parsed){
    return fetchJson(API_URL+OWNER_SUGGESTION_PLAN_PATH,{
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        'x-mmir-owner-command-code':parsed.code
      },
      body:JSON.stringify({
        suggestion:parsed.suggestion,
        source:'mmir-chat',
        submit:true
      }),
      timeoutMs:12000
    });
  }

  async function submitFeedbackMentionCommand(parsed){
    const explicitFeedback=!parsed.implicit_feedback;
    const demoConsent=explicitFeedback&&ensureDemoTranscriptConsentNotice('feedback_intake');
    return fetchJson(API_URL+FEEDBACK_INTAKE_PATH,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        command:'@'+parsed.target+' '+parsed.suggestion,
        target:parsed.target,
        suggestion:parsed.suggestion,
        source:parsed.source||'mmir-chat-feedback',
        public_feedback:true,
        implicit_feedback:Boolean(parsed.implicit_feedback),
        submit:Boolean(explicitFeedback&&demoConsent),
        demo_mode:demoTranscriptModeRequested(),
        demo_feedback_consent:Boolean(demoConsent),
        capture_consent:demoConsent?'demo_transcript':''
      }),
      timeoutMs:12000
    });
  }

  function localImplicitFeedbackItem(prompt,signal){
    const context=feedbackPreviousTurnContext();
    const suggestion=feedbackSuggestionWithContext(prompt,context);
    if(!suggestion)return null;
    return {
      id:'fb_implicit_'+telemetryEventId().replace(/^evt_/,''),
      created_at:new Date().toISOString(),
      target:'feedback',
      source:'mmir-chat-implicit-feedback',
      status:'draft_ready',
      priority:signal.severity||'p5-guidance',
      title:'Implicit chat feedback · '+(signal.surface||'general_chat'),
      suggestion,
      linked_previous_turn:Boolean(context),
      previous_turn:context||undefined,
      classification:{lane:signal.surface||'general_chat',repo:'inkognitroz.github.io',backlog_hint:'user-test-friction'},
      no_paid_routes_started:true,
      provider_called:false,
      server_state:signal.auto_draft?'pending':'local_only'
    };
  }

  function queueImplicitFeedbackFromChat(prompt,signal){
    const context=feedbackPreviousTurnContext();
    const item=localImplicitFeedbackItem(prompt,signal);
    const localId=item?.id||'';
    if(item)saveFeedbackInboxItem(item);
    markFeedbackCaptured('implicit_feedback_detected');
    captureInteraction('implicit_feedback_detected',{
      feedback_kind:signal.kind,
      surface:signal.surface,
      severity:signal.severity,
      auto_draft:Boolean(signal.auto_draft),
      utterance_chars:signal.chars,
      word_count:signal.words,
      lang:signal.lang,
      linked_previous_turn:Boolean(context),
      local_feedback_count:feedbackInboxItems().length
    });
    if(!signal.auto_draft)return;
    submitFeedbackMentionCommand({
      target:'feedback',
      suggestion:feedbackSuggestionWithContext(prompt,context),
      source:'mmir-chat-implicit-feedback',
      implicit_feedback:true
    }).then(plan=>{
      if(localId)removeFeedbackInboxItem(localId);
      saveFeedbackInboxItem(plan?.inbox_item||{
        id:localId||('fb_implicit_'+telemetryEventId().replace(/^evt_/,'')),
        created_at:new Date().toISOString(),
        target:'feedback',
        source:'mmir-chat-implicit-feedback',
        status:'submitted',
        priority:signal.severity||'p5-guidance',
        title:'Implicit feedback synced to intake',
        suggestion:feedbackSuggestionWithContext(prompt,context),
        linked_previous_turn:Boolean(context),
        previous_turn:context||undefined,
        classification:{lane:plan?.draft?.classification?.lane||signal.surface||'general_chat',repo:'inkognitroz.github.io',backlog_hint:'user-test-friction'},
        no_paid_routes_started:true,
        provider_called:false,
        server_state:'synced'
      });
      markFeedbackCaptured('implicit_feedback_submitted');
      captureInteraction('implicit_feedback_submitted',{
        feedback_kind:signal.kind,
        surface:signal.surface,
        severity:plan?.inbox_item?.priority||signal.severity,
        lane:plan?.draft?.classification?.lane||signal.surface,
        local_feedback_count:feedbackInboxItems().length
      });
    }).catch(()=>{
      if(localId)saveFeedbackInboxItem({...item,id:localId,server_state:'local_only'});
      markFeedbackCaptured('implicit_feedback_failed');
      captureInteraction('implicit_feedback_failed',{
        feedback_kind:signal.kind,
        surface:signal.surface,
        reason:'endpoint_unreachable',
        local_feedback_count:feedbackInboxItems().length
      });
    });
  }

  function queueMediaCapabilityFeedback(media){
    if(!media)return false;
    const source=mediaSourceLabel(media.source);
    const type=String(media.type||'image/*').slice(0,80);
    const size=String(media.size_label||formatFileSize(media.size_bytes)).slice(0,40);
    const suggestion=[
      'Image/media usage signal from public chat.',
      'A tester selected an image from '+source+' ('+type+', '+size+') and expects MMIR to analyze it.',
      'Expected product behavior: camera/library image is analyzed through the protected vision route with consent, size limits, log redaction, signed receipt and rollback.',
      'Raw image should only be sent to /chat/vision/preview after the user explicitly sends the message; never log or echo raw bytes.'
    ].join('\n');
    const item={
      id:'fb_media_'+telemetryEventId().replace(/^evt_/,''),
      created_at:new Date().toISOString(),
      target:'feedback',
      source:'mmir-chat-media-boundary',
      status:'draft_ready',
      priority:'p1-demo-vision',
      title:'Image selected for protected vision analysis',
      suggestion,
      classification:{lane:'L1 Frontend UX / L2 protected media node',repo:'inkognitroz.github.io + mmir-api-gateway',backlog_hint:'protected-vision-route'},
      no_paid_routes_started:true,
      provider_called:false,
      server_state:'pending'
    };
    saveFeedbackInboxItem(item);
    markFeedbackCaptured('media_vision_usage');
    captureInteraction('media_vision_usage_captured',{
      source:media.source||'',
      type,
      size_bytes:Number(media.size_bytes)||0,
      raw_image_sent_to_gateway:false,
      provider_called:false,
      local_feedback_count:feedbackInboxItems().length
    });
    submitFeedbackMentionCommand({
      target:'feedback',
      suggestion,
      source:'mmir-chat-media-boundary',
      implicit_feedback:true
    }).then(plan=>{
      removeFeedbackInboxItem(item.id);
      saveFeedbackInboxItem(plan?.inbox_item||{
        ...item,
        status:'submitted',
        server_state:'synced'
      });
      markFeedbackCaptured('media_vision_usage_synced');
      captureInteraction('media_vision_usage_synced',{
        source:media.source||'',
        local_feedback_count:feedbackInboxItems().length
      });
    }).catch(()=>{
      saveFeedbackInboxItem({...item,server_state:'local_only'});
      markFeedbackCaptured('media_vision_usage_local_only');
      captureInteraction('media_vision_usage_sync_failed',{
        source:media.source||'',
        reason:'endpoint_unreachable',
        local_feedback_count:feedbackInboxItems().length
      });
    });
    return true;
  }

  async function handleOwnerSuggestionCommand(prompt,input){
    const parsed=ownerSuggestionCommand(prompt);
    if(!parsed)return false;
    closeMenus();
    append('user','Owner improvement: '+parsed.suggestion,'You','',{actions:false});
    if(input){
      input.value='';
      autosizeInput();
    }
    const assistant=append('assistant','Capturing improvement suggestion...','MMIR Project Control','Owner intake · secure draft',{actions:false});
    status('Owner suggestion captured.','ready');
    routeStatus('Owner intake · code not stored · no paid route','ready');
    try{
      const plan=await submitOwnerSuggestionCommand(parsed);
      const routeText=ownerSuggestionRouteText(plan);
      updateMessage(assistant,ownerSuggestionAnswer(plan),{receipt:routeText,actions:false});
      status(plan?.accepted?'Owner suggestion filed.':'Owner suggestion drafted.','ready');
      routeStatus(routeText,'ready');
    }catch(error){
      updateMessage(assistant,'Owner intake is unreachable right now. The suggestion stayed local in this chat.',{receipt:'MMIR Project Control · not filed',actions:false});
      status('Owner intake unreachable.','error');
      routeStatus('Owner intake unavailable · no issue created','error');
    }
    input?.focus();
    return true;
  }

  async function handleFeedbackMentionCommand(prompt,input){
    const parsed=feedbackMentionCommand(prompt);
    if(!parsed)return false;
    const context=feedbackPreviousTurnContext();
    const intakeSuggestion=feedbackSuggestionWithContext(parsed.suggestion,context);
    const intakeParsed={...parsed,suggestion:intakeSuggestion};
    closeMenus();
    append('user','Feedback '+('@'+parsed.target)+': '+parsed.suggestion,'You','',{actions:false});
    if(input){
      input.value='';
      autosizeInput();
    }
    const assistant=append('assistant','Registrerer feedback...','MMIR Feedback','Feedback intake · sanitized draft',{actions:false});
    status('Feedback captured.','ready');
    routeStatus('Feedback intake · no secrets · no paid route','ready');
    const localDraftId='fb_local_'+telemetryEventId().replace(/^evt_/,'');
    saveFeedbackInboxItem({
      id:localDraftId,
      created_at:new Date().toISOString(),
      target:parsed.target,
      source:parsed.source||'mmir-chat-feedback',
      status:'pending_server_intake',
      priority:'p3-ux',
      title:'Feedback pending server intake',
      suggestion:intakeSuggestion,
      linked_previous_turn:Boolean(context),
      previous_turn:context||undefined,
      classification:{lane:'L1 Frontend UX',repo:'inkognitroz.github.io',backlog_hint:'feedback-intake-pending'},
      no_paid_routes_started:true,
      provider_called:false,
      server_state:'pending'
    });
    markFeedbackCaptured('feedback_local_draft');
    try{
      const plan=await submitFeedbackMentionCommand(intakeParsed);
      removeFeedbackInboxItem(localDraftId);
      saveFeedbackInboxItem(plan?.inbox_item||{
        id:'fb_synced_'+telemetryEventId().replace(/^evt_/,''),
        created_at:new Date().toISOString(),
        target:parsed.target,
        source:parsed.source||'mmir-chat-feedback',
        status:'submitted',
        priority:'p3-ux',
        title:'Feedback synced to intake',
        suggestion:intakeSuggestion,
        linked_previous_turn:Boolean(context),
        previous_turn:context||undefined,
        classification:{lane:plan?.draft?.classification?.lane||'L1 Frontend UX',repo:'inkognitroz.github.io',backlog_hint:'feedback-intake-synced'},
        no_paid_routes_started:true,
        provider_called:false,
        server_state:'synced'
      });
      markFeedbackCaptured('feedback_submitted');
      captureInteraction('feedback_submitted',{
        target:parsed.target,
        priority:plan?.inbox_item?.priority||'',
        lane:plan?.draft?.classification?.lane||'',
        accepted:Boolean(plan?.accepted),
        local_feedback_count:feedbackInboxItems().length
      });
      const routeText=feedbackIntakeRouteText(plan);
      updateMessage(assistant,feedbackIntakeAnswer(plan),{receipt:routeText,actions:false});
      status('Feedback registered.','ready');
      routeStatus(routeText,'ready');
    }catch(error){
      saveFeedbackInboxItem({
        id:localDraftId,
        created_at:new Date().toISOString(),
        target:parsed.target,
        source:parsed.source||'mmir-chat-feedback',
        status:'local_fallback',
        priority:'p3-ux',
        title:'Feedback local fallback',
        suggestion:intakeSuggestion,
        linked_previous_turn:Boolean(context),
        previous_turn:context||undefined,
        classification:{lane:'L1 Frontend UX',repo:'inkognitroz.github.io',backlog_hint:'feedback-intake-offline'},
        no_paid_routes_started:true,
        provider_called:false,
        server_state:'local_only'
      });
      markFeedbackCaptured('feedback_failed_local_fallback');
      captureInteraction('feedback_failed',{target:parsed.target,reason:'endpoint_unreachable',local_feedback_count:feedbackInboxItems().length});
      updateMessage(assistant,'The feedback endpoint is unavailable right now. I saved a local draft in Feedback Inbox so it is not lost.',{receipt:'Feedback intake · local fallback draft · no provider call',actions:false});
      status('Feedback saved locally.','ready');
      routeStatus('Feedback Inbox · local fallback · no issue created','ready');
    }
    input?.focus();
    return true;
  }

  function ownerPingCommand(prompt){
    const text=String(prompt||'').trim();
    const owner=text.match(/^\/admin\s+([^\s]+)\s+\/?(?:ping|all)(?:\s+([\s\S]+))?$/i);
    if(owner){
      const pingPrompt=String(owner[2]||'hei').replace(/\s+/g,' ').trim().slice(0,2000)||'hei';
      return {mode:'owner',code:String(owner[1]||'').trim(),prompt:pingPrompt};
    }
    const publicAll=text.match(/^\/all(?:\s+([\s\S]+))?$/i);
    if(publicAll){
      const allPrompt=String(publicAll[1]||'hei').replace(/\s+/g,' ').trim().slice(0,2000)||'hei';
      return {mode:'all',code:'',prompt:allPrompt};
    }
    const publicPing=text.match(/^\/ping(?:\s+([\s\S]+))?$/i);
    if(publicPing){
      const pingPrompt=String(publicPing[1]||'hei').replace(/\s+/g,' ').trim().slice(0,2000)||'hei';
      return {mode:'public',code:'',prompt:pingPrompt};
    }
    return null;
  }

  function responseReceiptEnvelope(response){
    return response?.mmir?.receipt||response?.mmir?.route_receipt||{};
  }

  function usageTokenTotal(usage){
    if(!usage||typeof usage!=='object')return 0;
    const direct=Number(usage.total_tokens ?? usage.totalTokens ?? usage.tokens);
    if(Number.isFinite(direct)&&direct>0)return Math.round(direct);
    const prompt=Number(usage.prompt_tokens ?? usage.promptTokens ?? usage.input_tokens ?? usage.inputTokens)||0;
    const completion=Number(usage.completion_tokens ?? usage.completionTokens ?? usage.output_tokens ?? usage.outputTokens)||0;
    const total=prompt+completion;
    return total>0?Math.round(total):0;
  }

  function responseTokenUsage(payload){
    const direct=usageTokenTotal(payload?.usage)||usageTokenTotal(payload?.token_usage)||usageTokenTotal(payload?.best_answer?.usage);
    if(direct>0)return direct;
    const responses=Array.isArray(payload?.data)?payload.data:[];
    const responseTotal=responses.reduce((sum,response)=>sum+usageTokenTotal(response?.usage),0);
    if(responseTotal>0)return responseTotal;
    const attempts=Array.isArray(payload?.route_attempts)?payload.route_attempts:[];
    return attempts.reduce((sum,attempt)=>sum+usageTokenTotal(attempt?.usage||attempt?.receipt?.usage),0);
  }

  function recordTokenUsage(payload,source=''){
    const tokens=responseTokenUsage(payload);
    state.tokenCounter.last=tokens;
    state.tokenCounter.source=String(source||'').slice(0,40);
    if(tokens>0){
      state.tokenCounter.total+=tokens;
      state.tokenCounter.events+=1;
    }
    renderTokenCounter();
    return tokens;
  }

  function renderTokenCounter(){
    const el=document.getElementById('p0-token-counter');
    if(!el)return;
    const total=Number(state.tokenCounter.total)||0;
    const last=Number(state.tokenCounter.last)||0;
    el.textContent=total.toLocaleString('no-NO')+' tokens';
    el.title=last>0
      ? '+'+last.toLocaleString('no-NO')+' tokens siste svar'
      : '0 tokens siste svar - nyttig helsesignal mot stub/regresjon';
    el.dataset.state=last>0?'active':'quiet';
    el.setAttribute('aria-label',el.title);
  }

  function ownerPingLine(response){
    const receipt=responseReceiptEnvelope(response);
    const label=attemptProviderLabel({
      provider:receipt.provider||response?.provider,
      model_display_name:receipt.model_display_name||response?.model_display_name,
      model_id:receipt.model_id||response?.model
    });
    const latency=Number(response?.latency_ms)||Number(receipt.latency_ms)||0;
    const answer=responseText(response).replace(/\s+/g,' ').trim();
    return '- '+label+(latency?' in '+formatDuration(latency):'')+': '+(answer.slice(0,140)||'answered')+(answer.length>140?'...':'');
  }

  function ownerPingAnswer(data){
    const first=data?.first_answer||{};
    const firstLabel=attemptProviderLabel(first);
    const firstLatency=Number(first.latency_ms)||Number(first.receipt?.latency_ms)||0;
    const responses=(Array.isArray(data?.data)?data.data:[]).map(ownerPingLine).slice(0,10);
    const blocked=(Array.isArray(data?.blocked_candidates)?data.blocked_candidates:[])
      .slice(0,3)
      .map(item=>'- '+attemptProviderLabel({provider:item.provider,model_display_name:item.model_display_name,model_id:item.model_id})+': '+String(item.reason||item.route_state||'blocked'));
    const header='First: '+(firstLabel||'route')+(firstLatency?' in '+formatDuration(firstLatency):'')+'.';
    const lines=[header];
    if(responses.length)lines.push('', 'Responses:', ...responses);
    if(blocked.length)lines.push('', 'Not active for this ping:', ...blocked);
    return lines.join('\n');
  }

  function ownerPingReceipt(data){
    const pool=data?.intelligence_pool||data?.pool||{};
    const first=data?.first_answer||{};
    const firstLabel=attemptProviderLabel(first);
    const firstLatency=Number(first.latency_ms)||Number(first.receipt?.latency_ms)||0;
    const routes=gatewayRouteCount(data);
    const providers=gatewayAnswerCount(data);
    const quiet=gatewayQuietCount(data);
    return [
      'Owner ping',
      routes?String(routes)+' routes checked':'routes checked',
      providers?String(providers)+' provider candidates answered':'',
      quiet?String(quiet)+' quiet':'',
      firstLabel?'First: '+firstLabel+(firstLatency?' '+formatDuration(firstLatency):''):'',
      'signed receipts',
      'no paid route'
    ].filter(Boolean).join(' · ');
  }

  async function submitOwnerPingCommand(parsed,signal){
    return fetchJson(API_URL+OWNER_INTELLIGENCE_PING_PATH,{
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        'x-mmir-owner-command-code':parsed.code
      },
      body:JSON.stringify(compareApiPayload(parsed.prompt)),
      timeoutMs:70000,
      signal
    });
  }

  async function handleOwnerPingCommand(prompt,input){
    const parsed=ownerPingCommand(prompt);
    if(!parsed)return false;
    if(parsed.mode==='all'){
      if(input){
        input.value=parsed.prompt;
        autosizeInput();
      }
      compareGatewayRoutes(parsed.prompt,{mode:'all'});
      return true;
    }
    if(parsed.mode==='public'){
      if(input){
        input.value=parsed.prompt;
        autosizeInput();
      }
      compareGatewayRoutes(parsed.prompt,{mode:'boost'});
      return true;
    }
    closeMenus();
    const signal=beginResponse();
    append('user','/ping '+parsed.prompt,'You','',{actions:false});
    if(input){
      input.value='';
      autosizeInput();
    }
    const assistant=append('assistant','Pinging connected intelligence...','MMIR Intelligence Well','Owner ping · asking all owner routes · no paid route',{variant:'compare',retryPrompt:'/ping '+parsed.prompt,answerState:'pending',aiGenerated:false});
    status('Owner ping is asking available intelligence routes...','ready');
    routeStatus('Owner ping · Supergeni + configured free candidates · no paid route','ready');
    try{
      const data=await submitOwnerPingCommand(parsed,signal);
      if(data?.object!=='owner.intelligence.ping')throw new Error('Owner ping unavailable');
      const receipt=ownerPingReceipt(data);
      updateMessage(assistant,ownerPingAnswer(data),{receipt,actions:true,answerState:'live',aiGenerated:true});
      recordGatewayCompareBenchmarks(data);
      renderModelMenu();
      renderToolbar();
      status('Owner ping ready: '+String(data.route_attempts?.length||0)+' routes checked.','ready');
      routeStatus(receipt,'ready');
    }catch(error){
      if(stopRequested||error?.name==='AbortError'){
        updateMessage(assistant,'Owner ping stopped.',{receipt:'Owner ping · stopped',actions:false,answerState:'degraded',aiGenerated:false});
        status('Owner ping stopped.','idle');
        routeStatus('Stopped · owner ping cancelled','hosted');
      }else{
        updateMessage(assistant,'Owner ping needs active owner identity on api.mmir.ai. Use /ping for public Boost, or check owner auth/server config.',{receipt:'Owner ping · owner auth/config needed',actions:false,answerState:'degraded',aiGenerated:false});
        status('Eierkontrollen er ikke tilgjengelig akkurat nå. Prøv igjen.','error');
        routeStatus('Owner ping unavailable · owner auth/config needed','error');
      }
    }finally{
      finishResponse();
      input?.focus();
    }
    return true;
  }

  const routeBenchmarks=P0_ROUTE_BENCHMARKS.create?.({
    getBenchmarks:()=>state.routeBenchmarks||{},
    setBenchmarks:(next)=>{state.routeBenchmarks=next&&typeof next==='object'?next:{};},
    writeBenchmarks:(next)=>writeJson(ROUTE_BENCHMARK_KEY,next||state.routeBenchmarks||{}),
    routePinned,
    formatDuration,
    latencyClass
  });

  function routeKey(model){return routeBenchmarks?.routeKey(model)||'hosted:mmir-supergenius';}
  function routeBenchmark(model){return routeBenchmarks?.routeBenchmark(model)||null;}
  function recordRouteBenchmark(model,score){routeBenchmarks?.recordRouteBenchmark(model,score);}
  function effectiveModelScore(model){return routeBenchmarks?.effectiveModelScore(model)||clampScore(model?.score||50);}
  function rankedModels(models){return routeBenchmarks?.rankedModels(models)||((models||[]).slice());}
  function routeRankMap(models=state.models){return routeBenchmarks?.routeRankMap(models)||{};}
  function routeBenchmarkSummary(model){return routeBenchmarks?.routeBenchmarkSummary(model)||'';}
  function routeRankSummary(model){return routeBenchmarks?.routeRankSummary(model)||'';}

  function activeIntelligenceModels(){
    return state.models.filter(model=>
      model &&
      model.candidate!==true &&
      model.executable!==false &&
      model.selectable!==false &&
      String(model.availability||'available').toLowerCase()!=='blocked'
    );
  }

  function intelligencePoolLine(){
    const inventory=state.routeInventory||{};
    const count=Math.max(Number(inventory.activeRoutes)||0,activeIntelligenceModels().length);
    if(count<2)return '';
    const future=Number(inventory.futureRoutes)||0;
    const total=Number(inventory.totalRoutes)||0;
    const parts=[
      count+' live routes',
      future?future+' queued':'',
      total&&total!==count?total+' visible total':''
    ];
    return parts.filter(Boolean).join(' · ');
  }

  function providerReadinessLine(){
    const readiness=state.routeInventory?.providerReadiness||providerReadinessSummary(state.models);
    const activeLabels=Array.isArray(readiness.activeLabels)?readiness.activeLabels:[];
    const deployLabels=Array.isArray(readiness.deployNeededLabels)?readiness.deployNeededLabels:[];
    const probeLabels=Array.isArray(readiness.probeQueuedLabels)?readiness.probeQueuedLabels:[];
    const live=activeLabels.slice(0,4).map(label=>label+' live');
    if(activeLabels.length>4)live.push('+'+(activeLabels.length-4)+' live');
    const deploy=deployLabels.slice(0,2).map(label=>label+' deploy needed');
    const probe=probeLabels
      .filter(label=>!activeLabels.includes(label)&&!deployLabels.includes(label))
      .slice(0,1)
      .map(label=>label+' probe queued');
    return [...live,...deploy,...probe].join(' + ');
  }

  function routeMicroStatus(model=activeModel()){
    const receipt=routeReceipt(model);
    const rankSummary=routeRankSummary(model);
    const benchmark=routeBenchmarkSummary(model)
      .split(' · ')
      .filter(part=>part&&!/^Score\s+/i.test(part))
      .slice(0,2);
    const parts=[
      receipt.text,
      routePinned(model)?'Pinned':'',
      intelligencePoolLine(),
      providerReadinessLine(),
      'Score '+effectiveModelScore(model),
      rankSummary,
      ...benchmark,
      localTelemetrySummary(model?.routeTelemetry)
    ].filter(Boolean);
    return parts.join(' · ');
  }

  function routeScoreExplainer(){
    return 'Route score is fit for this request: latency, answer completeness, privacy mode, cost class and trust signals. It is not a truth percentage.';
  }

  function routeFreshnessLabel(score){
    const shared=window.MimirRouteDisplay&&typeof window.MimirRouteDisplay.freshnessLabel==='function'
      ?window.MimirRouteDisplay.freshnessLabel(score)
      :'';
    if(shared)return shared;
    const state=String(score?.freshness_state||'').replace(/[_-]+/g,' ').trim().toLowerCase();
    const action=String(score?.factuality_guardrail_action||'').replace(/[_-]+/g,' ').trim().toLowerCase();
    const text=(state+' '+action).trim();
    if(!text||text==='unknown')return '';
    if(/stale/.test(text))return 'stale fact demoted';
    if(/verified|fresh|current/.test(text))return 'verified fact';
    if(/uncertain|check|required|refresh|needs/.test(text))return 'needs fact check';
    return '';
  }

  function microKind(part,stateValue){
    const text=String(part||'').toLowerCase();
    if(/answered/.test(text)&&/demoted/.test(text)&&/no paid route/.test(text))return 'good';
    if(stateValue==='error'||/blocked|failed|unavailable|error|demoted|stale/.test(text))return 'error';
    if(/private|this mac|local/.test(text))return 'local';
    if(/free|ready|strong|best|winner|verified|fresh|connected|intelligences|swarm|council|quiet|score\s+(8[0-9]|9[0-9]|100)/.test(text))return 'good';
    if(/needs fact check|uncertain|score\s+[0-5][0-9]|slow|queued|acceptable|failure/.test(text))return 'warn';
    if(/\b\d+(?:\.\d+)?(?:ms|s)\b|avg\s+/.test(text))return 'time';
    if(/api\.mmir\.ai|routing\/score|route/.test(text))return 'route';
    return 'neutral';
  }

  function gatewayProviderSummary(parts){
    const providers=parts
      .map(part=>String(part||'').trim())
      .filter(part=>/^(OpenRouter|Google|NVIDIA|Groq)\b/i.test(part))
      .map(part=>part
        .replace(/\s+\d+(?:\.\d+)?(?:ms|s)\b.*$/i,'')
        .replace(/\s+blocked.*$/i,' blocked')
        .trim())
      .filter(Boolean)
      .filter((part,index,list)=>list.indexOf(part)===index)
      .slice(0,3);
    return providers.join(' + ');
  }

  function receiptParts(receipt){
    return String(receipt||'')
      .split('·')
      .map(part=>part.trim())
      .filter(Boolean);
  }

  function receiptRouteCount(full,parts=receiptParts(full)){
    const text=String(full||'');
    const matchers=[
      /(\d+)\s+routes?\s+compared/i,
      /(\d+)\s+active\s+hosted\s+routes/i,
      /(\d+)\s+active\s+routes/i
    ];
    for(const matcher of matchers){
      const match=text.match(matcher);
      if(match&&Number(match[1])>1)return Number(match[1]);
    }
    const routePart=parts.find(part=>/^\d+\s+routes?$/i.test(part));
    if(routePart)return Number(routePart.match(/\d+/)?.[0])||0;
    return 0;
  }

  function receiptPrivacyLabel(full=''){
    const text=String(full||'');
    if(/superprivate/i.test(text)||superPrivateModeActive())return 'superprivat';
    if(/\b(?:local\/private|browser-local\/private|private local|local node|this mac|private mode)\b/i.test(text))return 'privat';
    if(/\b(?:hosted|api\.mmir\.ai|free\/protected|no paid route|hosted free|supergeni ready)\b/i.test(text))return demoTranscriptCaptureEnabled()?'demo':'beskyttet';
    return privacyMode()==='public'?'beskyttet':'privat';
  }

  function routeEvidenceReceipt(full){
    const text=String(full||'');
    const evidence=[
      /\b(?:API score|Score)\s+\d+/i,
      /\d+\s+routes?\s+compared/i,
      /\d+\s+active\s+hosted\s+routes/i,
      /\bWinner:/i,
      /\bWhy:/i,
      /\bCompare answer\s+\d\/\d/i,
      /\bsigned receipts?\b/i,
      /\b(?:hosted route|private local|This Mac)\b/i,
      /\b(?:Best answer|Intelligence boost|Ask all active|Model Debate|Supergeni Council)\b/i,
      /\b\d+(?:\.\d+)?(?:ms|s)\b/i
    ];
    return evidence.some(test=>test.test(text))&&!/^Local connector setup\b/i.test(text);
  }

  let lastAnswerProof=null;

  function proofSourceRecords(payload,contract){
    const rawSources=Array.isArray(payload?.mmir?.sources)?payload.mmir.sources:(Array.isArray(payload?.sources)?payload.sources:[]);
    const trustRecords=Array.isArray(contract?.verification?.source_trust)?contract.verification.source_trust:[];
    const records=[];
    const seen=new Set();
    for(const source of rawSources){
      if(records.length>=3)break;
      const rawUrl=String(source?.url||source?.href||'').trim();
      const url=/^https?:\/\//i.test(rawUrl)?rawUrl:'';
      let host='';
      if(url){
        try{host=new URL(url).hostname.replace(/^www\./i,'');}catch(error){host='';}
      }
      const name=String(source?.title||source?.topic||host||'').replace(/\s+/g,' ').trim().slice(0,80);
      if(!name)continue;
      const key=(url||name).toLowerCase();
      if(seen.has(key))continue;
      seen.add(key);
      const trust=trustRecords.find(record=>record?.host&&host&&(host===record.host||host.endsWith('.'+record.host)))||null;
      records.push({
        name,
        url,
        host,
        tier:Number.isFinite(Number(trust?.tier))?Number(trust.tier):null,
        tierLabel:String(trust?.label||'').replace(/\s+/g,' ').trim().slice(0,80)
      });
    }
    if(!records.length){
      for(const trust of trustRecords){
        if(records.length>=3)break;
        const host=String(trust?.host||'').replace(/\s+/g,' ').trim().slice(0,80);
        if(!host||seen.has(host.toLowerCase()))continue;
        seen.add(host.toLowerCase());
        records.push({
          name:host,
          url:'',
          host,
          tier:Number.isFinite(Number(trust?.tier))?Number(trust.tier):null,
          tierLabel:String(trust?.label||'').replace(/\s+/g,' ').trim().slice(0,80)
        });
      }
    }
    return records;
  }

  function answerProofLine(payload){
    const raw=payload?.mmir?.answer_proof_line??payload?.answer_proof_line??null;
    if(typeof raw==='string'){
      const label=raw.replace(/\s+/g,' ').trim().slice(0,160);
      if(!label)return null;
      return {
        status:/^verifisert\b/i.test(label)?'verified':'stated',
        label,
        consensusLabel:'',
        sources:proofSourceRecords(payload,null)
      };
    }
    if(!raw||typeof raw!=='object'||Array.isArray(raw))return null;
    const status=String(raw.status||'').trim().toLowerCase();
    return {
      status:['verified','consensus_signed','signed'].includes(status)?status:'unverified',
      label:String(raw.label||'').replace(/\s+/g,' ').trim().slice(0,160),
      consensusLabel:String(raw.consensus?.public_ui_label||'').replace(/\s+/g,' ').trim().slice(0,120),
      sources:proofSourceRecords(payload,raw)
    };
  }

  function proofTrustLabel(proof){
    if(!proof)return '';
    if(proof.status==='verified')return 'Verifisert';
    if(proof.status==='consensus_signed'||proof.status==='signed')return 'Signert kvittering';
    if(proof.status==='unverified')return 'Ubekreftet';
    return '';
  }

  function noteAnswerProof(proof){
    lastAnswerProof=proof||null;
    return lastAnswerProof;
  }

  function trustValueSummary(full,proof,options={}){
    const text=canonicalBrandText(full).trim();
    if(!routeEvidenceReceipt(text))return '';
    const privacy=receiptPrivacyLabel(text);
    const trust=proofTrustLabel(proof)||(options.explicitUnverified?'Ubekreftet':'');
    if(!trust)return '';
    return [trust,privacy].filter(Boolean).join(' · ');
  }

  function receiptConsensusState(full){
    const text=String(full||'');
    if(/\bContested\b/i.test(text))return 'split';
    if(/\bHigh confidence\b/i.test(text))return 'high';
    if(/\bMedium confidence\b/i.test(text))return 'medium';
    if(/\bConfidence pending\b/i.test(text))return 'pending';
    return '';
  }

  function routeActionButtonMarkup(full,stateValue='hosted'){
    if(stateValue==='error'||state.busy||privateModeActive())return '';
    if(/\b(?:copy install command|local connector setup)\b/i.test(String(full||''))){
      const label='Oppdater AI';
      const title='Sjekk om den lokale AI-koblingen er klar';
      return '<button class="p0-route-cta" type="button" data-p0-route-action="check-local" aria-label="'+safeAttr(title)+'" title="'+safeAttr(title)+'">'+safeText(label)+'</button>';
    }
    const parts=receiptParts(full);
    const receiptCount=receiptRouteCount(full,parts);
    const summary=intelligencePoolSummary();
    const routeCount=Math.max(receiptCount,summary.compareRouteTotal||0,summary.activeRouteTotal||0);
    if(routeCount>=2&&summary.compareReady){
      if(typeof document!=='undefined'&&document.getElementById&&document.getElementById('p0-superboost'))return '';
      const label='Spør '+routeCount+' AI';
      const title=label+' og la beste svar vinne';
      return '<button class="p0-route-cta" type="button" data-p0-route-action="boost-answer-live" aria-label="'+safeAttr(title)+'" title="'+safeAttr(title)+'">'+safeText(label)+'</button>';
    }
    if(stateValue==='local'||summary.localRoutes>0||activeModel()?.route==='local'){
      const label='Model health';
      const title='Open model health and route status';
      return '<button class="p0-route-cta" type="button" data-p0-route-action="model-health" aria-label="'+safeAttr(title)+'" title="'+safeAttr(title)+'">'+safeText(label)+'</button>';
    }
    const label='Connect local';
    const title='Connect a private local node from chat';
    return '<button class="p0-route-cta" type="button" data-p0-route-action="connect-local" aria-label="'+safeAttr(title)+'" title="'+safeAttr(title)+'">'+safeText(label)+'</button>';
  }

  function renderMicroStatus(el,message,stateValue='hosted'){
    if(!el)return;
    const full=String(message||routeReceipt().text).trim();
    const parts=full.split('·').map(part=>part.trim()).filter(Boolean);
    const compactLocalReady=/^(local node attached|local node ready|private local ready:|local node connected)/i.test(full)
      ? 'Local node ready'
      : '';
    const localSummary=compactLocalReady?[compactLocalReady,receiptPrivacyLabel(full)].filter(Boolean).join(' · '):'';
    const trustSummary=stateValue==='error'?'':(localSummary||trustValueSummary(full,lastAnswerProof));
    const primary=compactLocalReady||parts[0]||'Ready';
    const candidates=parts.filter(part=>
      part!==primary &&
      !/^samples?$/i.test(part) &&
      !/^Winner:/i.test(part)
    );
    const pick=(test)=>candidates.find(part=>test.test(part))||'';
    const providers=gatewayProviderSummary(parts);
    const priority=[
      pick(/^Swarm\s+\d+|^Swarm preview$/i),
      pick(/\d+\s+(?:model routes visible|live routes)/i),
      pick(/^\d+\s+routes? compared$/i),
      pick(/^\d+\s+routes?$/i),
      pick(/^\d+\s+answered$/i),
      pick(/^\d+\s+demoted$/i),
      pick(/^\d+\s+quiet$/i),
      pick(/^council ready$/i),
      pick(/^signed receipts$/i),
      pick(/no paid route/i),
      pick(/^Why:/i),
      pick(/^\d+\s+queued$/i),
      pick(/^\d+\s+visible total$/i),
      pick(/^target\s+\d+/i),
      pick(/^sync\s+\d+/i),
      pick(/^\d+\s+(?:active|live) provider routes$/i),
      pick(/^\d+\s+(?:external nodes|live external nodes)$/i),
      providers,
      pick(/^\d+\s+models?\.?$/i),
      pick(/^free$|^private$/i),
      pick(/^this mac$/i),
      pick(/^api\.mmir\.ai$/i),
      pick(/^api score\s+\d+|^score\s+\d+/i),
      pick(/^avg\s+|\b\d+(?:\.\d+)?(?:ms|s)\b/i),
      pick(/best answer|synthesis/i),
      pick(/verified fact|needs fact check|complete answer|responsive|acceptable|fast|slow|private local|public facts/i)
    ].filter(Boolean);
    const fallback=candidates
      .filter(part=>!priority.includes(part)&&!/api\.mmir\.ai|routing\/score/i.test(part))
      .slice(0,1);
    const text=[primary,...priority,...fallback]
      .filter((part,index,all)=>part&&all.indexOf(part)===index)
      .slice(0,8)
      .join(' · ');
    const visible=trustSummary||text;
    el.setAttribute('aria-label',full);
    el.title=full;
    el.dataset.kind=microKind(visible,stateValue);
    const action=routeActionButtonMarkup(full,stateValue);
    el.dataset.hasRouteAction=action?'true':'false';
    el.innerHTML='<span class="p0-route-line">'+safeText(visible)+'</span>'+action;
  }

  function compactStatusText(message,maxParts=5){
    const parts=String(message||'')
      .split('·')
      .map(part=>part.trim())
      .filter(Boolean)
      .filter(part=>!/^target\s+/i.test(part));
    return parts
      .filter((part,index,all)=>all.indexOf(part)===index)
      .slice(0,maxParts)
      .join(' · ');
  }

  function answerStatus(model,score,prefix='',proof=lastAnswerProof){
    const privacy=model?.route==='local'
      ? 'privat'
      : (superPrivateModeActive()?'superprivat':(demoTranscriptCaptureEnabled()?'demo':'beskyttet'));
    const parts=[
      prefix,
      proofTrustLabel(proof),
      privacy
    ];
    return parts.filter(Boolean).join(' · ');
  }

  function routeRankState(model){
    if(model?.candidate||model?.executable===false)return 'setup';
    return routeBenchmarks?.routeRankState(model)||'measured';
  }

  function validMessage(message){
    return P0_HISTORY.validMessage(message);
  }

  function staleFailureMessage(message){
    return P0_HISTORY.staleFailureMessage(message);
  }

  function transientInstallMessage(message){
    return P0_HISTORY.transientInstallMessage(message);
  }

  function safeText(value){
    return P0_TEXT.safeText?.(value)||String(value||'').replace(/[&<>"']/g,(char)=>({
      '&':'&amp;',
      '<':'&lt;',
      '>':'&gt;',
      '"':'&quot;',
      "'":'&#39;'
    }[char]));
  }

  function safeAttr(value){
    return P0_TEXT.safeAttr?.(value)||safeText(value);
  }

  function makeMessageId(){
    return P0_HISTORY.makeMessageId();
  }

  function messageById(id){
    return state.messages.find(message=>String(message.id||'')===String(id||''))||null;
  }

  function previousUserMessageFor(message){
    const index=state.messages.indexOf(message);
    if(index<0)return null;
    for(let i=index-1;i>=0;i-=1){
      if(state.messages[i]?.role==='user')return state.messages[i];
    }
    return null;
  }

  function redactShareText(value){
    return String(value||'')
      .replace(/-----BEGIN [^-]+-----[\s\S]*?-----END [^-]+-----/g,'[redacted private key]')
      .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]{12,}\b/gi,'Bearer [redacted]')
      .replace(/\b(?:sk|or|ghp|github_pat|cf|xoxb)[A-Za-z0-9_:\-]{16,}\b/g,'[redacted token]')
      .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,'[redacted email]')
      .replace(/\b(password|token|secret|api[_-]?key)\s*[:=]\s*[^,\s)]+/gi,'$1=[redacted]')
      .slice(0,8000);
  }

  async function writeClipboard(text){
    return P0_CLIPBOARD.writeText?.(text)||false;
  }

  function paragraphs(text){
    return P0_TEXT.paragraphs?.(text)||String(text||'')
      .split(/\n{2,}/)
      .map(part=>part.trim())
      .filter(Boolean)
      .map(part=>'<p>'+safeText(part)+'</p>')
      .join('')||'<p></p>';
  }

  function generatedImageUrlFromContent(content){
    const text=String(content||'');
    const match=text.match(/https:\/\/image\.pollinations\.ai\/[^\s)]+/i);
    if(!match)return '';
    try{
      const url=new URL(match[0]);
      if(url.protocol!=='https:'||url.hostname!=='image.pollinations.ai')return '';
      return url.toString();
    }catch(_err){
      return '';
    }
  }

  function generatedImageAltFromContent(content){
    const match=String(content||'').match(/!\[([^\]]{1,160})\]\(https:\/\/image\.pollinations\.ai\/[^)]+\)/i);
    return (match&&match[1]?match[1]:'MMIR-generert bilde').replace(/\s+/g,' ').trim().slice(0,160);
  }

  function generatedImageTextContent(content){
    const url=generatedImageUrlFromContent(content);
    if(!url)return String(content||'');
    return String(content||'')
      .replace(/!\[[^\]]*\]\(https:\/\/image\.pollinations\.ai\/[^)]+\)/ig,'')
      .replace(new RegExp(url.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'g'),'')
      .replace(/Her er bildet:\s*$/gim,'Her er bildet:')
      .replace(/\n{3,}/g,'\n\n')
      .trim();
  }

  function renderGeneratedImageCard(content){
    const url=generatedImageUrlFromContent(content);
    if(!url)return '';
    const alt=generatedImageAltFromContent(content);
    return '<figure class="p0-generated-image-card" data-node-id="mmir-node-bilde" data-provider="pollinations" aria-label="Generert bilde">'+
      '<a href="'+safeAttr(url)+'" target="_blank" rel="noopener noreferrer">'+
        '<img src="'+safeAttr(url)+'" alt="'+safeAttr(alt)+'" loading="lazy" referrerpolicy="no-referrer" />'+
      '</a>'+
      '<figcaption><span class="p0-generated-image-status">Generert via MMIR Bilde · gratis/no-key</span> · <a href="'+safeAttr(url)+'" target="_blank" rel="noopener noreferrer">Åpne bilde</a></figcaption>'+
    '</figure>';
  }

  function handleGeneratedImageError(event){
    const image=event.target;
    if(!(image instanceof HTMLImageElement)||!image.closest('.p0-generated-image-card'))return;
    const card=image.closest('.p0-generated-image-card');
    image.hidden=true;
    const previewLink=image.closest('a');
    if(previewLink)previewLink.hidden=true;
    card.classList.add('is-preview-unavailable');
    card.setAttribute('aria-label','Generert bilde – forhåndsvisning utilgjengelig');
    const statusText=card.querySelector('.p0-generated-image-status');
    if(statusText)statusText.textContent='Forhåndsvisning utilgjengelig';
  }

  function renderMessageBody(message,content){
    const imageCard=message?.role==='assistant'?renderGeneratedImageCard(content):'';
    const text=imageCard?generatedImageTextContent(content):content;
    return paragraphs(text)+imageCard+renderMessageTools(message);
  }

  function detectInstallOs(){
    return LOCAL_INSTALL_COMMANDS.detectOs?.()||'unknown';
  }

  function localInstallCommand(os){
    return LOCAL_INSTALL_COMMANDS.commandFor?.(os)||'';
  }

  function localInstallIntro(os){
    return LOCAL_INSTALL_COMMANDS.introFor?.(os)||'Which computer will host your local model? Choose Mac, Windows or Linux, and I will give you the exact command here in chat.';
  }

  function localInstallReturnInstruction(){
    return LOCAL_INSTALL_COMMANDS.returnInstruction?.()||'Når terminalen sier at MMIR Local Connector er klar, velg Oppdater AI i statuslinjen. Tillat lokal nettverkstilgang hvis nettleseren spør.';
  }

  function startLocalInstallAssistant(forcedOs=''){
    closeMenus();
    const detected=forcedOs||detectInstallOs();
    const os=['mac','windows','linux'].includes(detected)?detected:'unknown';
    const command=localInstallCommand(os);
    if(command){
      append(
        'assistant',
        localInstallIntro(os)+'\n\n'+localInstallReturnInstruction(),
        'Supergeni',
        'Local connector setup · no paid route',
        {
          variant:'install',
          command,
          commandLabel:'Copy command',
          installOs:os,
          actions:false
        }
      );
      status('Local connector command ready.','ready');
      routeStatus('Copy install command · local setup','hosted');
      return;
    }
    append(
      'assistant',
      localInstallIntro(detected),
      'Supergeni',
      'Local connector setup · no paid route',
      {
        variant:'install',
        showOsChoices:true,
        actions:false
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
    const copied=await writeClipboard(command);
    if(copied){
      status('Command copied. Paste it into Terminal or PowerShell.','ready');
    }else if(selectCommandText(trigger)){
      status('Command selected. Press Cmd+C, then paste it into Terminal or PowerShell.','ready');
    }else{
      status('Copy failed. Select the command manually.','error');
    }
  }

  function activeModel(){
    const selected=state.models.find(model=>model.id===state.activeModelId);
    if(selected&&selected.executable!==false&&selected.selectable!==false)return selected;
    return state.models.find(model=>model.executable!==false&&model.selectable!==false)||state.models[0];
  }

  function routeReceipt(model=activeModel()){
    return P0_ROUTE_RECEIPTS.receipt(model,{apiLabel:API_LABEL});
  }

  function routeDisplayName(model){
    return P0_ROUTE_RECEIPTS.displayName(model);
  }

  function canonicalBrandText(value){
    const text=String(value||'');
    if(window.MimirRuntimeLabels?.canon)return window.MimirRuntimeLabels.canon(text);
    return text
      .replace(/\bmmir[-_\s]+supergeni(?:us|ous)?(?:\s+free)?\b/gi,'Supergeni')
      .replace(/(^|[^A-Za-z/])supergeni(?:us|ous)?(?:\s+free)?/gi,(match,prefix)=>prefix+'Supergeni')
      .replace(/(?:MMIR\s+){2,}Supergeni(?:us|ous)?/gi,'Supergeni');
  }

  function executableHostedModel(model){
    const routeState=String(model?.route_state||'managed_provider_available');
    const availability=String(model?.availability||model?.status||'available').toLowerCase();
    const blockedStates=['cost_denied','route_not_executable','provider_disabled_missing_key','node_stale','candidate_setup_needed','candidate_internal_probe_ready'];
    if(model?.executable===false)return false;
    if(blockedStates.includes(routeState))return false;
    if(['blocked','disabled','offline','unavailable','setup_needed','candidate_ready'].includes(availability))return false;
    return true;
  }

  function releaseReadinessFromStatus(payload){
    const operator=payload?.operator_readiness;
    const writer=operator?.default_writer_readiness;
    const journeys=operator?.journeys;
    const verifiedRoutes=Math.max(0,Number(payload?.live_verified_intelligence_route_count)||0);
    const hostedReady=Boolean(
      operator?.readiness_state==='ready'&&
      writer?.classification==='ready'&&
      writer?.authenticated_release_ready===true&&
      journeys?.first_chat_ready===true&&
      verifiedRoutes>=1
    );
    const blockerCodes=Array.isArray(writer?.blocker_codes)?writer.blocker_codes.filter(Boolean):[];
    return {
      state:hostedReady?'ready':'blocked',
      hostedReady,
      compareReady:Boolean(hostedReady&&journeys?.compare_ready===true),
      swarmPreviewReady:Boolean(hostedReady&&journeys?.swarm_preview_ready===true),
      verifiedRoutes,
      checkedAt:Date.now(),
      reason:hostedReady
        ? 'Offentlig svarbane er live-verifisert.'
        : (blockerCodes.length?blockerCodes.join(', '):'Offentlig svarbane mangler ferskt produksjonsbevis.')
    };
  }

  function blockedReleaseReadiness(reason='Kunne ikke verifisere offentlig svarbane.'){
    return {
      state:'blocked',
      hostedReady:false,
      compareReady:false,
      swarmPreviewReady:false,
      verifiedRoutes:0,
      checkedAt:Date.now(),
      reason
    };
  }

  function releaseReadinessFresh(maxAgeMs=RELEASE_PREFLIGHT_REUSE_MS){
    const checkedAt=Number(state.releaseReadiness?.checkedAt)||0;
    return checkedAt>0&&Date.now()-checkedAt<=Math.max(0,Number(maxAgeMs)||0);
  }

  function hostedJourneyReady(journey='first_chat'){
    if(state.releaseReadiness?.hostedReady!==true)return false;
    if(journey==='compare')return state.releaseReadiness.compareReady===true;
    if(journey==='swarm_preview')return state.releaseReadiness.swarmPreviewReady===true;
    return true;
  }

  function hostedModelLiveVerified(model){
    return model?.liveE2EVerified===true||model?.live_e2e_verified===true;
  }

  function matchingLiveHostedModel(model){
    if(!model||model.route!=='hosted')return null;
    const wantedId=canonicalHostedModelId(model.id||model.model||'');
    const wantedModel=String(model.model||model.id||'').trim();
    return state.models.find(item=>
      item?.route==='hosted'&&
      liveHostedModel(item)&&
      (
        canonicalHostedModelId(item.id||item.model||'')===wantedId||
        String(item.model||item.id||'').trim()===wantedModel
      )
    )||null;
  }

  function localModelReady(model){
    if(model?.route!=='local'||model?.executable===false||model?.selectable===false)return false;
    const readiness=state.localReadiness||{};
    const modelId=String(model?.model||model?.id||'');
    return Boolean(
      readiness.paired===true&&
      readiness.runtimeChatReady===true&&
      readiness.chatReady===true&&
      Array.isArray(readiness.modelIds)&&
      readiness.modelIds.includes(modelId)
    );
  }

  function liveHostedModel(model){
    return Boolean(
      model &&
      model.route!=='local' &&
      hostedJourneyReady('first_chat') &&
      hostedModelLiveVerified(model) &&
      executableHostedModel(model) &&
      !hostedCandidateModel(model) &&
      model.selectable!==false
    );
  }

  function visibleHostedModel(model){
    return executableHostedModel(model)||
      model?.candidate===true||
      model?.visible_to_public_ui===true||
      String(model?.route_type||'')==='external_candidate';
  }

  function providerLabel(provider){
    const value=String(provider||'').trim().toLowerCase();
    if(value==='openrouter')return 'OpenRouter';
    if(value==='nvidia')return 'NVIDIA';
    if(value==='google')return 'Google';
    if(value==='groq')return 'Groq';
    return value?value.charAt(0).toUpperCase()+value.slice(1):'Provider';
  }

  function hostedCandidateModel(model){
    return model?.candidate===true||
      String(model?.route_type||'')==='external_candidate'||
      model?.executable===false||
      model?.selectable===false;
  }

  function providerSortKey(label){
    const value=String(label||'').toLowerCase();
    const order=['openrouter','nvidia','google','groq'];
    const index=order.indexOf(value);
    return index===-1?order.length:index;
  }

  function uniqueProviderLabels(map){
    return Array.from(map.entries())
      .sort((left,right)=>providerSortKey(left[0])-providerSortKey(right[0])||left[1].localeCompare(right[1]))
      .map(entry=>entry[1]);
  }

  function modelReadinessText(model){
    return [
      model?.route_state,
      model?.availability,
      model?.readiness_status,
      model?.status,
      model?.readiness?.status,
      model?.readiness?.blocking_reason,
      model?.readiness?.standard_integration_status,
      model?.readiness?.preferred_integration_mode,
      model?.next_action,
      model?.readiness?.next_action,
      Array.isArray(model?.missing_gates)?model.missing_gates.join(' '):'',
      Array.isArray(model?.readiness?.missing)?model.readiness.missing.join(' '):'',
      Array.isArray(model?.readiness?.standard_public_route_blockers)?model.readiness.standard_public_route_blockers.join(' '):''
    ].filter(Boolean).join(' ').toLowerCase();
  }

  function providerReadinessSummary(models=[]){
    const active=new Map();
    const deployNeeded=new Map();
    const probeQueued=new Map();
    (models||[]).forEach(model=>{
      const rawProvider=String(model?.provider||model?.owned_by||'').trim().toLowerCase();
      if(!rawProvider||rawProvider==='mmir')return;
      const label=providerLabel(rawProvider);
      const key=rawProvider;
      const isActive=liveHostedModel(model);
      if(isActive){
        active.set(key,label);
        return;
      }
      if(!hostedCandidateModel(model)&&model?.visible_to_public_ui!==true)return;
      const readiness=modelReadinessText(model);
      if(/autonomous_node_handoff_required|owner_active_route_handoff_required|deploy|handoff|\/connect llm|node path|setup_needed|requires_server_config|gateway_provider_secret/.test(readiness)){
        deployNeeded.set(key,label);
        return;
      }
      if(/probe|benchmark|promote|candidate_ready|candidate_internal_probe_ready/.test(readiness)){
        probeQueued.set(key,label);
      }
    });
    active.forEach((label,key)=>{
      deployNeeded.delete(key);
      probeQueued.delete(key);
    });
    deployNeeded.forEach((label,key)=>probeQueued.delete(key));
    return {
      activeLabels:uniqueProviderLabels(active),
      deployNeededLabels:uniqueProviderLabels(deployNeeded),
      probeQueuedLabels:uniqueProviderLabels(probeQueued)
    };
  }

  function candidateDetail(model,provider){
    const readiness=modelReadinessText(model);
    if(/autonomous_node_handoff_required|owner_active_route_handoff_required|deploy|handoff|\/connect llm|node path/.test(readiness)){
      return 'Deploy node endpoint';
    }
    if(/gateway_provider_secret|setup_needed|requires_server_config/.test(readiness)){
      return provider==='Groq'?'Deploy node endpoint':'Deploy handoff needed';
    }
    if(/probe|benchmark|promote|candidate_ready|candidate_internal_probe_ready/.test(readiness)){
      return 'Probe and promote';
    }
    return 'Future capacity';
  }

  function modelInventorySummary(payload,models=[]){
    const raw=Array.isArray(payload?.data)?payload.data:Array.isArray(payload?.models)?payload.models:[];
    const active=raw.filter(liveHostedModel).length;
    const future=raw.filter(hostedCandidateModel).length;
    const fallbackActive=(models||[]).filter(liveHostedModel).length;
    const fallbackFuture=(models||[]).filter(model=>model?.candidate||model?.executable===false||model?.selectable===false).length;
    return {
      activeRoutes:active||fallbackActive||0,
      futureRoutes:future||fallbackFuture||0,
      totalRoutes:raw.length||((models||[]).length)||0,
      activePublicProviderRoutes:Number(payload?.active_public_provider_route_count)||0,
      activeExternalNodeRoutes:Number(payload?.active_external_node_route_count)||0,
      visibleCandidateCount:Number(payload?.visible_candidate_count)||future||fallbackFuture||0,
      providerReadiness:providerReadinessSummary(raw.length?raw:models)
    };
  }

  function normalizeHostedModels(payload){
    const raw=Array.isArray(payload?.data)?payload.data:Array.isArray(payload?.models)?payload.models:[];
    const normalized=raw
      .filter(visibleHostedModel)
      .filter(model=>String(model?.id||model?.model||'').trim())
      .map((model,index)=>{
        const rawModelId=String(model.id||model.model).trim();
        const id=canonicalHostedModelId(rawModelId);
        const executable=executableHostedModel(model);
        const candidate=hostedCandidateModel(model);
        const routeClass=String(model.route_class||'').trim();
        const trustLevel=String(model.trust_level||'').trim();
        const externalUntrustedFree=routeClass==='external-untrusted-free'||trustLevel==='external-untrusted-free'||String(model.route_type||'')==='external_untrusted_free';
        const provider=providerLabel(model.provider);
        const liveE2EVerified=model.live_e2e_verified===true;
        const releaseReady=hostedJourneyReady('first_chat');
        const selectable=Boolean(executable&&!candidate&&model.selectable!==false&&liveE2EVerified&&releaseReady);
        const detail=candidate
          ? candidateDetail(model,provider)
          : (!liveE2EVerified
            ? 'Konfigurert · mangler ferskt live-bevis'
            : (!releaseReady
              ? 'Live-bevis finnes · releaseport blokkert'
              : (externalUntrustedFree?'Verifisert ekstern rute':'Verifisert hostet rute')));
        return {
          id,
          label:routeDisplayName(model),
          route:'hosted',
          detail,
          tags:candidate?[provider,'Kandidat','Fremtidig']:(selectable?[provider,externalUntrustedFree?'Ekstern':'Hostet','Verifisert']:[provider,'Konfigurert','Ikke live']),
          score:candidate?25:(externalUntrustedFree?86:(model.recommended?100:(90-index))),
          model:rawModelId,
          executable,
          candidate,
          provider,
          routeClass,
          trustLevel,
          routeId:model.route_id||model.routeId||id,
          routeState:model.route_state||'managed_provider_available',
          routeType:model.route_type||'managed_provider',
          availability:model.availability||'available',
          costState:model.cost_state||model.cost_class||'free',
          nextAction:model.next_action||null,
          liveE2EVerified,
          configuredSelectable:model.selectable!==false,
          selectable
        };
      });
    const active=normalized
      .filter(model=>model.executable!==false&&model.selectable!==false&&!model.candidate)
      .slice(0,24);
    const future=normalized
      .filter(model=>model.candidate||model.executable===false||model.selectable===false)
      .slice(0,4);
    return active.concat(future);
  }

  function hostedModelsPath(){
    const host=String(window.location?.hostname||'').toLowerCase();
    return host==='mmir.ai'||host==='www.mmir.ai'?'/v1/models?view=compact':'/v1/models';
  }

  async function refreshHostedModels(){
    const refreshGeneration=++hostedReadinessRefreshGeneration;
    const [modelsResult,statusResult]=await Promise.allSettled([
      fetchJson(API_URL+hostedModelsPath(),{timeoutMs:9000}),
      fetchJson(API_URL+'/status',{timeoutMs:9000})
    ]);
    if(refreshGeneration!==hostedReadinessRefreshGeneration){
      return {ready:false,models:[],stale:true};
    }
    state.releaseReadiness=statusResult.status==='fulfilled'
      ? releaseReadinessFromStatus(statusResult.value)
      : blockedReleaseReadiness('Status for offentlig svarbane kunne ikke verifiseres.');
    if(modelsResult.status==='fulfilled'){
      const payload=modelsResult.value;
      const models=normalizeHostedModels(payload);
      const liveModels=models.filter(liveHostedModel);
      if(!liveModels.length){
        state.releaseReadiness=blockedReleaseReadiness(
          state.releaseReadiness.hostedReady===true
            ? 'Modellinventaret mangler en fersk live-verifisert rute.'
            : state.releaseReadiness.reason
        );
        state.routeInventory=modelInventorySummary(payload,models);
        state.models=models.concat(state.models.filter(model=>model.route==='local'));
        state.hostedRouteState='degraded';
        renderReleaseReadiness();
        status('Offentlig svarbane er ikke produksjonsklar.','error');
        renderToolbar();
        renderTranscript();
        updateSendControl();
        window.dispatchEvent(new CustomEvent('mmir-p0-hosted-models-refreshed',{detail:{status:'degraded',models,release_readiness:state.releaseReadiness}}));
        return {ready:false,models};
      }
      const activeLocal=state.models.find(model=>model.id===state.activeModelId&&model.route==='local');
      state.routeInventory=modelInventorySummary(payload,models);
      state.models=models.concat(state.models.filter(model=>model.route==='local'));
      state.activeModelId=canonicalHostedModelId(state.activeModelId);
      const selected=state.models.find(model=>model.id===state.activeModelId);
      if(!activeLocal&&(!selected||selected.executable===false||selected.selectable===false)){
        state.activeModelId=(state.models.find(model=>model.executable!==false&&model.selectable!==false)||models[0]).id;
      }
      persistActiveModelId();
      writeJson(MODELS_KEY,state.models);
      state.hostedRouteState=liveModels.length?'ready':'degraded';
      renderReleaseReadiness();
      status('Offentlig svarbane er live-verifisert.','ready');
      renderToolbar();
      renderTranscript();
      updateSendControl();
      window.dispatchEvent(new CustomEvent('mmir-p0-hosted-models-refreshed',{detail:{status:'ready',models,release_readiness:state.releaseReadiness}}));
      return {ready:true,models};
    }else{
      state.releaseReadiness=blockedReleaseReadiness('Modellinventaret for offentlig svarbane kunne ikke verifiseres.');
      state.hostedRouteState='degraded';
      state.models=state.models.map(model=>model?.route==='hosted'
        ? {...model,selectable:false,liveE2EVerified:false,detail:'Konfigurert · modellinventaret kunne ikke verifiseres'}
        : model
      );
      renderReleaseReadiness();
      status('Offentlig svarbane er ikke produksjonsklar.','error');
      renderToolbar();
      renderTranscript();
      updateSendControl();
      window.dispatchEvent(new CustomEvent('mmir-p0-hosted-models-refreshed',{detail:{status:'deferred',models:[],release_readiness:state.releaseReadiness}}));
      return {ready:false,models:[]};
    }
  }

  function localTelemetryByModel(payload){
    const map=new Map();
    const rows=Array.isArray(payload?.data)?payload.data:[];
    rows.forEach(item=>{
      const id=String(item?.model_id||'').trim();
      if(id)map.set(id,item);
    });
    return map;
  }

  function localTelemetrySummary(item){
    const signals=item?.ranking_signals||{};
    const parts=[];
    if(typeof signals.score==='number')parts.push('route score '+clampScore(signals.score));
    if(signals.latency_status&&signals.latency_status!=='unknown')parts.push(String(signals.latency_status).replace(/[_-]+/g,' '));
    const latency=signals.avg_latency_ms??signals.last_latency_ms;
    if(typeof latency==='number')parts.push(formatDuration(latency));
    if(item?.status&&item.status!=='available')parts.push(String(item.status).replace(/[_-]+/g,' '));
    return parts.slice(0,3).join(' · ');
  }

  function normalizeLocalModels(payload,routeTelemetryPayload=null){
    const raw=Array.isArray(payload?.data)?payload.data:Array.isArray(payload?.models)?payload.models:[];
    const telemetry=localTelemetryByModel(routeTelemetryPayload);
    return raw
      .map(item=>String(item.id||item.name||item.model||'').trim())
      .filter(Boolean)
      .slice(0,12)
      .map(id=>{
        const profile=localModelProfile(id);
        const routeTelemetry=telemetry.get(id)||null;
        const telemetrySummary=localTelemetrySummary(routeTelemetry);
        return {
          id:'local:'+id,
          label:id,
          route:'local',
          detail:[profile.detail,telemetrySummary].filter(Boolean).join(' · '),
          tags:profile.tags,
          quality:profile.quality,
          score:typeof routeTelemetry?.ranking_signals?.score==='number'
            ? Math.round((profile.score+clampScore(routeTelemetry.ranking_signals.score))/2)
            : profile.score,
          routeTelemetry,
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
      source:'paired-local-status',
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

  function bestLocalModel(){
    return rankedModels(state.models.filter(model=>model.route==='local'))[0]||null;
  }

  function intelligencePoolSummary(){
    const active=activeIntelligenceModels();
    const hosted=active.filter(model=>model.route==='hosted');
    const local=active.filter(model=>model.route==='local');
    const inventory=state.routeInventory||{};
    const primary=defaultHostedModel();
    const bestLocal=bestLocalModel();
    const partner=comparePartnerModel();
    const liveRoutes=active.length;
    const activeRouteTotal=Math.max(Number(inventory.activeRoutes)||0,liveRoutes);
    const futureRoutes=Number(inventory.futureRoutes)||state.models.filter(model=>model.candidate||model.executable===false||model.selectable===false).length;
    const visibleRoutes=Number(inventory.totalRoutes)||state.models.length||activeRouteTotal;
    const activeProviderRoutes=Number(inventory.activePublicProviderRoutes)||Math.max(0,hosted.length-1);
    const activeExternalNodeRoutes=Number(inventory.activeExternalNodeRoutes)||0;
    const compareRouteTotal=activeHostedCompareModels().length;
	    const compareRouteLabel=compareRouteTotal===activeRouteTotal
	      ? String(compareRouteTotal)+' AI-kilder'
	      : String(compareRouteTotal)+' AI-kilder nå ('+String(activeRouteTotal)+' live totalt)';
	    const boostRouteLabel=compareRouteTotal===activeRouteTotal
	      ? String(compareRouteTotal)+' gratis AI-kilder'
	      : String(compareRouteTotal)+' gratis AI-kilder nå ('+String(activeRouteTotal)+' live totalt)';
    const compareReady=Boolean(primary&&partner&&primary.id!==partner.id);
    const localHardware=state.localHardware?.summary||'';
	    const scaleLine=[
	      activeRouteTotal+(hostedJourneyReady('first_chat')?' live AI':' verifiserte/lokale AI'),
	      futureRoutes?futureRoutes+' i kø':'',
	      visibleRoutes&&visibleRoutes!==activeRouteTotal?visibleRoutes+' synlige':'',
	      activeExternalNodeRoutes?activeExternalNodeRoutes+' eksterne':''
	    ].filter(Boolean).join(' / ');
	    const details=compareReady&&hostedJourneyReady('compare')
	      ? 'Beste svar kan spørre '+(activeProviderRoutes?String(activeProviderRoutes)+' leverandører':(hosted.length>1?String(hosted.length)+' hostede AI-er':(primary.label+' og '+partner.label)))+' parallelt og samle ett svar.'
	      : (hostedJourneyReady('first_chat')?'Koble til en ny verifisert AI-kilde for å låse opp parallelt beste svar.':'Hostet Supergeni er blokkert til produksjonsbeviset er grønt.');
    return {
      liveRoutes,
      hostedRoutes:hosted.length,
      localRoutes:local.length,
      activeRouteTotal,
      futureRoutes,
      visibleRoutes,
      activeProviderRoutes,
      activeExternalNodeRoutes,
      compareRouteTotal,
      compareRouteLabel,
      boostRouteLabel,
      scaleLine,
      compareReady,
	      stateLabel:compareReady?'Best Answer ready':'Single AI source now',
      primaryLabel:primary?.label||'Supergeni',
      partnerLabel:partner?.label||'',
      partnerModel:partner||null,
      bestLocalLabel:bestLocal?.label||'',
      localHardware,
      details
    };
  }

  function compareLocalModel(preferredLocalModel=null){
    if(preferredLocalModel)return localModelReady(preferredLocalModel)?preferredLocalModel:null;
    const best=bestLocalModel();
    if(best&&localModelReady(best))return best;
    const active=activeModel();
    return active.route==='local'&&localModelReady(active)?active:null;
  }

  function comparePartnerModel(preferredModel=null){
    if(preferredModel){
      if(preferredModel.route==='local')return localModelReady(preferredModel)?preferredModel:null;
      return liveHostedModel(preferredModel)?preferredModel:null;
    }
    const primary=defaultHostedModel();
    const local=compareLocalModel();
    if(local)return local;
    const active=activeModel();
    if(active&&active.route==='hosted'&&primary&&active.id!==primary.id)return active;
    return activeIntelligenceModels().find(model=>liveHostedModel(model)&&(!primary||model.id!==primary.id))||null;
  }

  function activeHostedCompareModels(){
    return state.models.filter(liveHostedModel);
  }

  function gatewayCompareAvailable(){
    return activeHostedCompareModels().length>1;
  }

  function gatewayComparePreferred(preferredModel=null){
    if(privateModeActive()||!gatewayCompareAvailable())return false;
    const active=activeModel();
    return !(preferredModel?.route==='local'||active?.route==='local');
  }

  function formatDuration(ms){
    if(P0_TEXT.formatDuration)return P0_TEXT.formatDuration(ms);
    const value=Math.max(0,Number(ms)||0);
    if(value<1000)return Math.round(value)+'ms';
    return (value/1000).toFixed(value<10000?1:0)+'s';
  }

  function defaultHostedModel(){
    return state.models.find(model=>isCanonicalHostedModel(model)&&model.executable!==false&&model.selectable!==false)||
      state.models.find(model=>model.route==='hosted'&&model.executable!==false&&model.selectable!==false)||
      state.models.find(model=>model.executable!==false&&model.selectable!==false)||
      state.models[0];
  }

  function clampScore(value){
    return Math.max(0,Math.min(100,Math.round(Number(value)||0)));
  }

  function answerClass(answer,failed=false){
    const text=String(answer||'').trim();
    if(failed||!text)return 'failed';
    return text.length>24?'complete':'thin';
  }

  function latencyClass(elapsedMs){
    const value=Number(elapsedMs)||0;
    if(value<700)return 'fast';
    if(value<2000)return 'responsive';
    if(value<6000)return 'acceptable';
    return 'slow';
  }

  function latencyTargetMs(model,mode='single'){
    if(mode==='synthesis')return 3500;
    if(model?.route==='local')return mode==='compare'?9000:8000;
    return mode==='compare'?3000:2500;
  }

  function latencyTargetState(elapsedMs,targetMs,failed=false){
    if(failed)return 'failed';
    return (Number(elapsedMs)||0)<=targetMs?'met':'missed';
  }

  function latencyTargetReceipt(model,elapsedMs,mode='single',failed=false){
    const targetMs=latencyTargetMs(model,mode);
    const targetState=latencyTargetState(elapsedMs,targetMs,failed);
    if(targetState==='met')return 'target '+formatDuration(targetMs)+' met';
    if(targetState==='missed')return 'over '+formatDuration(targetMs)+' target';
    return '';
  }

  function latencyTargetSummary(score){
    return String(score?.latency_target_label||'').trim();
  }

  function routeScore(model,prompt,answer,elapsedMs,failed=false,mode='single'){
    const route=model?.route||'hosted';
    const text=String(answer||'').trim();
    const publicFact=factGuardActive()&&wantsPublicFactRoute(prompt);
    const privateIntent=privateModeActive()||wantsPrivateRoute(prompt);
    const reasons=[];
    let score=50;
    const latency_target_ms=latencyTargetMs(model,mode);
    const latency_target_state=latencyTargetState(elapsedMs,latency_target_ms,failed||!text);
    const latency_target_label=latencyTargetReceipt(model,elapsedMs,mode,failed||!text);
    if(failed||!text){
      return {score:0,elapsedMs,answer_class:'failed',latency_class:latencyClass(elapsedMs),latency_target_ms,latency_target_state,latency_target_label,reason:'no answer',reasons:['no answer']};
    }
    if(text.length>24){
      score+=8;
      reasons.push('complete answer');
    }else{
      score-=8;
      reasons.push('thin answer');
    }
    if(route==='hosted'){
      const external=model?.routeClass==='external-untrusted-free'||model?.trustLevel==='external-untrusted-free';
      score+=external?12:16;
      reasons.push(external?((model?.provider||'external')+' route'):'default route');
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
    return {score:clampScore(score),elapsedMs,answer_class:answerClass(text),latency_class:latencyClass(elapsedMs),latency_target_ms,latency_target_state,latency_target_label,reason:reasons.slice(0,3).join(' · '),reasons};
  }

  function scoreClassSummary(score){
    if(!score)return '';
    const reason=String(score.reason||'').toLowerCase();
    const parts=[];
    const answer=String(score.answer_class||'').replace(/_/g,' ').trim();
    const latency=String(score.latency_class||'').replace(/_/g,' ').trim();
    const freshness=routeFreshnessLabel(score);
    if(answer&&answer!=='unknown'&&!reason.includes(answer.toLowerCase()))parts.push(answer==='complete'?'complete answer':answer);
    if(latency&&latency!=='unknown'&&!reason.includes(latency.toLowerCase()))parts.push(latency);
    if(freshness&&!reason.includes(freshness.toLowerCase()))parts.push(freshness);
    return parts.join(' · ');
  }

  function scoreSummary(score){
    if(!score)return 'Score pending';
    const prefix=score.source==='api'?'API score ':'Score ';
    return [prefix+score.score,scoreClassSummary(score),formatDuration(score.elapsedMs),latencyTargetSummary(score),score.reason].filter(Boolean).join(' · ');
  }

  function routeOperationalState(model){
    const stats=routeBenchmark(model);
    if(model?.candidate||model?.executable===false){
      return {
        label:'Future node',
        detail:model?.nextAction||'Needs deployed node endpoint, route proof and owner promotion before chat.',
        state:'setup'
      };
    }
    if(model?.route==='hosted'){
      if(!hostedJourneyReady('first_chat')){
        return {
          label:'Ikke produksjonsklar',
          detail:'Offentlig svarbane er blokkert til ferskt, uavhengig produksjonsbevis er grønt.',
          state:'setup'
        };
      }
      if(!hostedModelLiveVerified(model)){
        return {
          label:'Konfigurert · ikke live-bevist',
          detail:'Ruten er synlig i inventaret, men mangler ferskt ende-til-ende-bevis.',
          state:'setup'
        };
      }
      return {
        label:'Live-verifisert',
        detail:'Ruten har ferskt ende-til-ende-bevis gjennom '+API_LABEL+'.',
        state:'warm'
      };
    }
    if(model?.route==='local'&&stats?.samples){
      return {
        label:(Number(stats.avgLatencyMs)||0)>3000?'Measured local slow':'Measured local',
        detail:'This route has answered in this browser.',
        state:'measured'
      };
    }
    if(model?.route==='local'&&model?.routeTelemetry?.status==='available'){
      return {
        label:'Active local',
        detail:'Paired local connector reports this route as available.',
        state:'active'
      };
    }
    if(model?.route==='local'){
      return {
        label:'Cold local',
        detail:'Installed on this Mac; first answer may load the model.',
        state:'cold'
      };
    }
    return {
      label:'Route ready',
      detail:'Route is available.',
      state:'ready'
    };
  }

  function routeOperationalHint(model){
    return routeOperationalState(model).label;
  }

  function routeDetailReceipt(model){
    const operational=routeOperationalState(model);
    const stats=routeBenchmark(model);
    const telemetry=localTelemetrySummary(model?.routeTelemetry);
    const privacy=model?.route==='local'?'Private · This Mac':(model?.routeClass==='external-untrusted-free'?'External free · '+API_LABEL:'Hosted free · '+API_LABEL);
    const score='Score '+effectiveModelScore(model);
    const rankSummary=routeRankSummary(model);
    const samples=stats?.samples
      ? (stats.samples+' sample'+(stats.samples===1?'':'s'))
      : (model?.route==='local'?'not measured yet':'managed route');
    const pinned=routePinned(model)?'Pinned in this browser':'';
    const safe=model?.route==='local'?'no public Ollama port':'no browser secrets';
    return [operational.label,privacy,score,rankSummary,telemetry,samples,pinned,safe].filter(Boolean).join(' · ');
  }

  function modelUseCase(model){
    if(model?.candidate||model?.executable===false)return 'Future capacity; not active yet.';
    if(model?.route==='local'){
      if(model.quality==='best-local-starter')return 'Good for: fast private demo and local setup proof. Limit: weak factual recall.';
      if(model.quality==='weak-facts')return 'Good for: tiny private tests. Limit: not recommended for factual answers.';
      if(model.quality==='small')return 'Good for: quick private drafts. Limit: small-model quality.';
      return 'Good for: private/local work. Limit: may be slower or stale on public facts.';
    }
    if(model?.routeClass==='external-untrusted-free'||model?.trustLevel==='external-untrusted-free'){
      return 'Good for: extra perspective in Boost/Best Answer. Limit: external route; verify important facts.';
    }
    return 'Good for: general chat and public facts. Limit: hosted, not private local.';
  }

  function compactModelBadges(model,bestLocal){
    const badges=[];
    if(model?.id===state.activeModelId)badges.push('Selected');
    if(routePinned(model))badges.push('Pinned');
    if(model?.candidate)badges.push('Candidate');
    if(model?.executable===false)badges.push('Future');
    if(model?.route==='hosted'&&!model?.candidate&&(model?.id==='supergeni'||model?.id==='mmir-supergenius'))badges.push('Default');
    else if(model?.route==='hosted'&&!model?.candidate&&model?.routeClass==='external-untrusted-free')badges.push('External');
    if(model?.route==='local')badges.push('Private');
    if(bestLocal&&model?.id===bestLocal.id)badges.push('Best local');
    const rankState=routeRankState(model);
    if(rankState==='demoted')badges.push('Demoted');
    else if(rankState==='slow')badges.push('Slow');
    return badges
      .filter((tag,index,list)=>tag&&list.indexOf(tag)===index)
      .slice(0,3)
      .map(tag=>'<span class="p0-badge p0-badge-'+safeAttr(String(tag).toLowerCase().replace(/[^a-z0-9]+/g,'-'))+'">'+safeText(tag)+'</span>')
      .join('');
  }

  function receiptChromeKey(value){
    return String(value||'')
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g,'')
      .replace(/[^a-z0-9]+/g,' ')
      .trim();
  }

  function receiptHasPendingOrError(value){
    return /\b(?:awaiting|blocked|checking|connecting|error|failed|loading|pending|reset|retrying|sending|stopped|thinking|unavailable|working|avbrutt|feil|kobler|laster|mislyktes|sender|sjekker|tenker|tilbakestilt|utilgjengelig|venter)\b/i.test(String(value||''));
  }

  function quietReceiptPart(part,modelLabel=''){
    let value=canonicalBrandText(part).replace(/\s+/g,' ').trim();
    const model=canonicalBrandText(modelLabel).replace(/\s+/g,' ').trim();
    if(model&&value.toLowerCase().startsWith(model.toLowerCase())){
      value=value.slice(model.length).replace(/^[\s:|/-]+/,'').trim();
    }
    value=value.replace(/^Supergeni(?:us)?\s+/i,'').trim();
    if(!value||/^(?:MMIR(?:\.ai)?|AI-modell)$/i.test(value))return '';
    if(/\b(?:language|spr[aå]k)\s*guard\b/i.test(value))return '';
    if(/^(?:bevis|proof)\s*:/i.test(value))return '';
    if(/^(?:verified|verifisert|signed receipts?|signert kvittering)\b/i.test(value))return '';
    if(/^(?:no browser secrets?|no paid routes?(?: started)?|provider secrets? in browser)\b/i.test(value))return '';
    if(/^(?:ready|hosted|hosted route|managed route|free route)$/i.test(value))return 'Klar';
    if(/^(?:private local|local\/private|browser-local\/private|this mac)$/i.test(value))return 'Privat';
    return value;
  }

  function quietReceiptStatus(receipt,modelLabel='',proof=null){
    const full=canonicalBrandText(receipt).trim();
    const parts=receiptParts(full);
    const urgent=parts.filter(receiptHasPendingOrError);
    let candidates=[];
    if(urgent.length){
      candidates=urgent.map(part=>quietReceiptPart(part,modelLabel));
    }else{
      const trustSummary=trustValueSummary(full,proof,{explicitUnverified:true});
      const trustLabel=proofTrustLabel(proof);
      if(trustSummary)candidates=receiptParts(trustSummary);
      else if(trustLabel)candidates=[trustLabel,receiptPrivacyLabel(full)];
      else candidates=parts.map(part=>quietReceiptPart(part,modelLabel));
    }
    const seen=new Set();
    const quiet=[];
    for(const candidate of candidates){
      const value=String(candidate||'').trim();
      const key=receiptChromeKey(value);
      if(!key||seen.has(key))continue;
      seen.add(key);
      quiet.push(value);
      if(quiet.length===2)break;
    }
    return quiet.join(' · ')||'Klar';
  }

  function answerDeliveryLabel(stateValue){
    if(stateValue==='live')return 'Live';
    if(stateValue==='local')return 'Lokalt';
    if(stateValue==='demo')return 'Demo';
    if(stateValue==='degraded')return 'Degradert';
    if(stateValue==='pending')return 'Pågår';
    return '';
  }

  function normalizeAnswerTruth(message={}){
    const next={...message};
    if(next.role!=='assistant'){
      next.answerState='';
      next.aiGenerated=false;
      return next;
    }
    const provenance=String(next.routeProvenance||'').toLowerCase();
    const variant=String(next.variant||'').toLowerCase();
    const receipt=String(next.receipt||'').toLowerCase();
    const content=String(next.content||'').toLowerCase();
    const explicitState=['live','demo','local','degraded','pending'].includes(String(next.answerState||'').toLowerCase())
      ? String(next.answerState).toLowerCase()
      : '';
    const failed=/failed|unavailable|stopped|blocked|result unknown|privacy fail-closed/.test(receipt+' '+provenance)||
      /svarer ikke akkurat nå|svaret ble stoppet|noe gikk galt/.test(content);
    const modelGenerated=next.answerWriter?.type==='llm';
    const capabilityAnswer=next.answerWriter?.type==='capability';
    const inFlight=explicitState==='pending'||(!explicitState&&(
      Boolean(next.slowNotice)||
      /(?:\btenker\b|\bsammenligner\b|\bvelger beste svar\b|\bcomparing\b|\bsynthesizing\b|\bis running\b|\bstill working\b|\bpinging connected intelligence\b)/.test(content)
    ));
    let answerState=explicitState;
    if(!answerState){
      if(inFlight)answerState='pending';
      else if(provenance.includes('demo')||variant==='demo')answerState='demo';
      else if(failed||provenance.includes('fallback')||provenance.includes('failed'))answerState='degraded';
      else if(provenance.includes('local-model'))answerState='local';
      else if(next.hostedLineage===true||provenance.includes('hosted-chat')||provenance.includes('hosted-vision'))answerState='live';
      else if(variant==='compare')answerState=failed?'degraded':'live';
    }
    const explicitGenerated=Object.prototype.hasOwnProperty.call(next,'aiGenerated')
      ? Boolean(next.aiGenerated)
      : null;
    const aiGenerated=capabilityAnswer||inFlight
      ? false
      : (explicitGenerated===true
        ? true
        : (!failed&&(modelGenerated||answerState==='local'||answerState==='demo'||
          (answerState==='live'&&(variant==='compare'||next.hostedLineage===true)))));
    next.answerState=answerState;
    next.aiGenerated=Boolean(aiGenerated);
    return next;
  }

  function renderReceipt(receipt,proof,modelLabel='',intelligenceLabel='',answerState='',aiGenerated=false){
    const full=canonicalBrandText(receipt).trim();
    const model=canonicalBrandText(modelLabel).replace(/\s+/g,' ').trim()||'AI-modell';
    const quietStatus=quietReceiptStatus(full,model,proof);
    const conciseGeneratedStatus=aiGenerated
      ? (receiptParts(quietStatus).find(part=>/^(?:Verifisert|Signert kvittering|Ubekreftet)$/i.test(part))||receiptParts(quietStatus)[0]||'')
      : quietStatus;
    const statusParts=[
      answerDeliveryLabel(answerState),
      conciseGeneratedStatus,
      aiGenerated?'KI-svar · kan ta feil':''
    ].filter(Boolean);
    const statusText=statusParts
      .filter((part,index,all)=>all.indexOf(part)===index)
      .join(' · ');
    const trustLabel=proofTrustLabel(proof);
    const trustShown=Boolean(trustLabel&&receiptChromeKey(statusText).includes(receiptChromeKey(trustLabel)));
    const intelligence=String(intelligenceLabel||'').replace(/\s+/g,' ').trim();
    const hasDetails=Boolean(full||proof||intelligence);
    const summary='<span class="p0-receipt-model">'+safeText(model)+'</span>'+
      '<span class="p0-receipt-summary-main">'+safeText(statusText)+'</span>';
    const ariaLabel=[model,statusText,hasDetails?'Vis kvitteringsdetaljer':''].filter(Boolean).join(' · ');
    if(!hasDetails){
      return '<div class="p0-message-receipt p0-message-receipt-static" aria-label="'+safeAttr(ariaLabel)+'">'+summary+'</div>';
    }
    const consensusState=receiptConsensusState(full);
    const unverifiedClass=routeEvidenceReceipt(full)&&(!trustLabel||trustLabel==='Ubekreftet')?' p0-message-receipt-proof-unverified':'';
    const consensusClass=consensusState?' p0-message-receipt-consensus-'+safeAttr(consensusState):'';
    const trustClass=trustLabel||routeEvidenceReceipt(full)?' p0-message-receipt-trust':'';
    const expanded=[
      full?'<div class="p0-receipt-full">'+safeText(full)+'</div>':'',
      renderConnectedIntelligenceLabel({role:'assistant',intelligenceLabel:intelligence}),
      renderProofLine({role:'assistant',proofLine:proof},trustShown)
    ].filter(Boolean).join('');
    return '<details class="p0-message-receipt'+trustClass+consensusClass+unverifiedClass+'">'+
      '<summary aria-label="'+safeAttr(ariaLabel)+'">'+summary+'<span class="p0-receipt-details">Detaljer</span></summary>'+
      '<div class="p0-receipt-expanded">'+expanded+'</div>'+
    '</details>';
  }

  function answerWriterProfile(payload,fallbackModel=null){
    return truthfulWriterIdentity(payload,fallbackModel);
  }

  function writerContinuityResetMetadata(payload){
    const reset=payload?.mmir?.client_writer_continuity;
    if(!reset||reset.object!=='mmir.client_writer_continuity'||reset.status!=='reset')return null;
    return reset;
  }

  function writerContinuityResetReceipt(payload){
    const reset=writerContinuityResetMetadata(payload);
    if(!reset)return '';
    const kib=Math.max(1,Math.round((Number(reset.limit_bytes)||96*1024)/1024));
    return ' · Writer continuity reset ('+kib+' KiB browser boundary)';
  }

  function connectedIntelligenceLabel(payload){
    const explicit=String(
      payload?.mmir?.scaled_intelligence_label||
      payload?.scaled_intelligence_label||
      ''
    ).replace(/\s+/g,' ').trim().slice(0,120);
    if(/^(?:Rask|Søk)\s*·/i.test(explicit))return explicit;
    const writer=answerWriterProfile(payload);
    const sources=Array.isArray(payload?.mmir?.sources)
      ? payload.mmir.sources
      : (Array.isArray(payload?.sources)?payload.sources:[]);
    if(writer.type==='llm'&&sources.length){
      return 'Søk · '+sources.length+' '+(sources.length===1?'kilde':'kilder');
    }
    return '';
  }

  function renderConnectedIntelligenceLabel(message){
    const label=String(message?.intelligenceLabel||'').replace(/\s+/g,' ').trim().slice(0,120);
    if(message?.role!=='assistant'||!label)return '';
    return '<div class="p0-connected-intelligence-label" aria-label="Svarmodus: '+safeAttr(label)+'">'+safeText(label)+'</div>';
  }

  function renderProofLine(message,trustShownInReceipt=false){
    const proof=message?.role==='assistant'?message?.proofLine:null;
    if(!proof)return '';
    const trust=trustShownInReceipt?'':proofTrustLabel(proof);
    const badge=trust&&(!proof.label||!proof.label.toLowerCase().startsWith(trust.toLowerCase()))?trust:'';
    const badges=(Array.isArray(proof.sources)?proof.sources:[]).slice(0,3).map(source=>{
      const hint=source.tierLabel?source.name+' · '+source.tierLabel:source.name;
      if(source.url){
        return '<a class="p0-proof-source" href="'+safeAttr(source.url)+'" target="_blank" rel="noopener noreferrer" title="'+safeAttr(hint)+'">'+safeText(source.name)+'</a>';
      }
      return '<span class="p0-proof-source" title="'+safeAttr(hint)+'">'+safeText(source.name)+'</span>';
    }).join('');
    if(!badge&&!proof.label&&!badges)return '';
    return '<div class="p0-proof-line p0-proof-status-'+safeAttr(String(proof.status||'unverified').replace(/[^a-z0-9_-]/gi,''))+'" aria-label="'+safeAttr('Bevislinje: '+(proof.label||proofTrustLabel(proof)||'ingen'))+'">'+
      (badge?'<span class="p0-proof-badge">'+safeText(badge)+'</span>':'')+
      (proof.label?'<span class="p0-proof-text">'+safeText(proof.label)+'</span>':'')+
      badges+
    '</div>';
  }

  function winningRoute(hostedModel,hostedScore,localModel,localScore){
    const hostedValue=hostedScore?.score??0;
    const localValue=localScore?.score??0;
    if(localValue>hostedValue){
      return {model:localModel,score:localScore,loser:hostedScore,summary:'Winner: '+localModel.label+' · Score '+localValue+' · '+localScore.reason};
    }
    return {model:hostedModel,score:hostedScore,loser:localScore,summary:'Winner: '+hostedModel.label+' · Score '+hostedValue+' · '+(hostedScore?.reason||'default route')};
  }

  function routeIdentity(model){
    const isLocal=model?.route==='local';
    const modelId=String(model?.model||model?.id||(isLocal?'local':'mmir-supergenius')).trim()||(isLocal?'local':'mmir-supergenius');
    if(isLocal){
      const routeId='local/'+modelId;
      return {
        id:routeId,
        route_id:routeId,
        route_class:'local',
        cost_class:'free-local',
        node_id:'local-node',
        node_display_name:'This Mac',
        model_id:modelId,
        model_display_name:model?.label||modelId,
        trust_level:'operator-local',
        provider:'local-ollama'
      };
    }
    const provider=String(model?.provider||'mmir').trim().toLowerCase()||'mmir';
    const routeClass=String(model?.routeClass||model?.route_class||'free').trim()||'free';
    const routeId=String(model?.routeId||model?.route_id||(routeClass==='external-untrusted-free'?'external/'+provider+'/'+modelId:'browser-guide/free')).trim();
    return {
      id:routeId,
      route_id:routeId,
      route_class:routeClass,
      cost_class:String(model?.costState||model?.cost_class||'free').trim()||'free',
      node_id:provider==='mmir'?'browser-guide':provider+'-provider',
      node_display_name:model?.provider||model?.label||'Supergeni',
      model_id:modelId,
      model_display_name:model?.label||modelId,
      trust_level:String(model?.trustLevel||model?.trust_level||'public-free').trim()||'public-free',
      provider
    };
  }

  function routeScoreCandidate(model,answer,elapsedMs,failed=false){
    const identity=routeIdentity(model);
    const latency_target_ms=latencyTargetMs(model,'compare');
    const latency_target_state=latencyTargetState(elapsedMs,latency_target_ms,failed);
    const latency_target_label=latencyTargetReceipt(model,elapsedMs,'compare',failed);
    return {
      ...identity,
      quality:model?.quality||'',
      answer:String(answer||'').slice(0,8000),
      latency_ms:Math.max(0,Math.round(Number(elapsedMs)||0)),
      latency_class:latencyClass(elapsedMs),
      latency_target_ms,
      latency_target_state,
      latency_target_label,
      answer_class:answerClass(answer,failed),
      failed:Boolean(failed)
    };
  }

  function apiScoreForModel(scoring,model,fallback){
    const identity=routeIdentity(model);
    const found=(Array.isArray(scoring?.scores)?scoring.scores:[]).find(score=>
      String(score?.model_id||'')===String(identity.model_id) ||
      String(score?.route_id||'')===String(identity.route_id) ||
      String(score?.id||'')===String(identity.id) ||
      (model?.route==='local'&&String(score?.route_class||'')==='local') ||
      (identity.provider==='mmir'&&String(score?.node_id||'')==='browser-guide')
    );
    if(!found)return fallback;
    const reasons=Array.isArray(found.reasons)?found.reasons:[];
    return {
      score:clampScore(found.score),
      elapsedMs:Number(found.latency_ms)||fallback?.elapsedMs||0,
      answer_class:found.answer_class||fallback?.answer_class||'unknown',
      latency_class:found.latency_class||fallback?.latency_class||'unknown',
      latency_target_ms:Number(found.latency_target_ms)||fallback?.latency_target_ms||0,
      latency_target_state:found.latency_target_state||fallback?.latency_target_state||'',
      latency_target_label:found.latency_target_label||fallback?.latency_target_label||'',
      freshness_state:found.freshness_state||fallback?.freshness_state||'',
      factuality_guardrail_action:found.factuality_guardrail_action||fallback?.factuality_guardrail_action||'',
      requires_freshness_check:Boolean(found.requires_freshness_check||fallback?.requires_freshness_check),
      reason:reasons.slice(0,3).join(' · ')||found.summary||fallback?.reason||'api route policy',
      reasons,
      source:'api'
    };
  }

  function apiWinner(scoring,hostedModel,hostedScore,localModel,localScore){
    const winner=scoring?.winner;
    if(!winner)return winningRoute(hostedModel,hostedScore,localModel,localScore);
    const hostedIdentity=routeIdentity(hostedModel);
    const localIdentity=routeIdentity(localModel);
    const winnerModelId=String(winner.model_id||'');
    const winnerRouteId=String(winner.route_id||winner.id||'');
    const isSecond=winner.route_class==='local'||
      winnerModelId===String(localIdentity.model_id)||
      winnerRouteId===String(localIdentity.route_id)||
      winnerRouteId===String(localIdentity.id);
    const isHosted=winnerModelId===String(hostedIdentity.model_id)||
      winnerRouteId===String(hostedIdentity.route_id)||
      winnerRouteId===String(hostedIdentity.id);
    const useSecond=isSecond&&!isHosted;
    const model=useSecond?localModel:hostedModel;
    const score=useSecond?localScore:hostedScore;
    const loser=useSecond?hostedScore:localScore;
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
    if(factGuardActive()&&model?.route==='local'&&wantsPublicFactRoute(prompt)){
      return 'Local-only: public facts may be outdated';
    }
    return reason||'';
  }

  function smartDecision(prompt){
    const local=bestLocalModel();
    const partner=comparePartnerModel();
    const active=activeModel();
    if(privateModeActive()){
      if(local||active.route==='local'){
        const model=local||active;
        return {mode:'single',model,reason:routeReason(privacyModeLabel(),prompt,model),prompt:cleanSmartPrompt(prompt)||prompt};
      }
      return {mode:'private-unavailable',prompt:cleanSmartPrompt(prompt)||prompt};
    }
    if(partner&&wantsCompareRoute(prompt)){
      return {mode:'compare',model:partner,prompt:cleanSmartPrompt(prompt)||prompt};
    }
    if(factGuardActive()&&!isCanonicalHostedModel(active)&&wantsPublicFactRoute(prompt)&&!wantsPrivateRoute(prompt)){
      return {mode:'single',model:defaultHostedModel(),reason:'Kvalitetssikret fakta · nettsøk ved behov',prompt:cleanSmartPrompt(prompt)||prompt};
    }
    if(local&&active.route==='hosted'&&wantsPrivateRoute(prompt)){
      return {mode:'single',model:local,reason:routeReason('Smart route: private local',prompt,local),prompt:cleanSmartPrompt(prompt)||prompt};
    }
    return {mode:'single',model:active,reason:routeReason('',prompt,active),prompt};
  }

  async function checkLocalModels({quiet=false}={}){
    try{
      allowLocalProbes('p0-find-local-models',60000);
      if(!quiet)status('Checking local node...','loading');
      const token=await pairLocal();
      const connectorStatus=await fetchJson(LOCAL_URL+'/status',{headers:localHeaders(token),timeoutMs:9000});
      if(!connectorStatus||connectorStatus.status==='offline')throw new Error('Local connector reports offline.');
      const localRuntimeReadiness=connectorStatus.readiness||{};
      if(
        localRuntimeReadiness.paired!==true||
        localRuntimeReadiness.runtime_chat_ready!==true||
        localRuntimeReadiness.chat_ready!==true||
        connectorStatus.model_summary?.visibility==='public-safe'
      ){
        throw new Error('Local connector must prove paired and chat-ready before a local route can run.');
      }
      let modelPayload=connectorStatus.model_summary;
      if(!Array.isArray(modelPayload?.data)||!modelPayload.data.length){
        modelPayload=await fetchJson(LOCAL_URL+'/v1/models',{headers:localHeaders(token),timeoutMs:10000});
      }
      const routeTelemetry=connectorStatus.route_telemetry?.object==='mmir.local.route_telemetry.list'
        ? connectorStatus.route_telemetry
        : null;
      const models=normalizeLocalModels(modelPayload,routeTelemetry);
      const localModelIds=models.map(model=>String(model.model||model.id||'')).filter(Boolean);
      if(!localModelIds.length)throw new Error('Local connector is chat-ready but returned no private model inventory.');
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
      state.localReadiness={
        paired:true,
        runtimeChatReady:true,
        chatReady:true,
        modelIds:localModelIds
      };
      writeJson(MODELS_KEY,state.models);
      emitLocalReadiness(models,hardware);
      if(models.length&&!state.models.some(model=>model.id===state.activeModelId)){
        state.activeModelId=models[0].id;
        persistActiveModelId();
      }
      renderModelMenu();
      renderToolbar();
      if(!quiet){
        status(models.length?'Ready':'No local models yet',models.length?'ready':'idle');
        routeStatus(localReadinessSummary(models,hardware),models.length?'local':'hosted');
      }
      return models;
    }catch(error){
      state.localChecked=true;
      state.localError=localNetworkHint(error);
      state.localHardware=null;
      state.localReadiness={paired:false,runtimeChatReady:false,chatReady:false,modelIds:[]};
      state.models=state.models.filter(model=>model.route!=='local');
      if(!state.models.some(model=>model.id===state.activeModelId)){
        state.activeModelId='mmir-supergenius';
        persistActiveModelId();
      }
      renderModelMenu();
      renderToolbar();
      if(!quiet){
        status(state.localError,'error');
	        routeStatus('Local access blocked · Allow Local Network Access, then Oppdater AI','error');
      }
      throw error;
    }
  }

  function installShell(){
    if(document.getElementById('mmir-p0-app'))return;
    const app=document.createElement('section');
    app.id='mmir-p0-app';
    app.className='p0-launch-shell';
    app.setAttribute('aria-label','MMIR chat');
    app.innerHTML=''+
      '<aside class="p0-sidebar" aria-label="MMIR navigation">'+
        '<a class="p0-sidebar-brand" href="./mmir.html" aria-label="MMIR.ai chat">'+
          '<span class="p0-mark" aria-hidden="true">MM</span>'+
          '<span class="p0-brand-text"><strong>MMIR.ai</strong><span>Intelligence. Connected.</span></span>'+
        '</a>'+
        '<nav class="p0-sidebar-nav" aria-label="Chat actions">'+
          '<button type="button" data-p0-sidebar-action="new-chat">'+ICON_TOOLS+'<span>Ny chat</span></button>'+
          '<button type="button" data-p0-sidebar-action="voice-input">'+ICON_MIC+'<span>Ny talechat</span></button>'+
          '<button type="button" data-p0-sidebar-action="choose-photo-local">'+ICON_ATTACH+'<span>Nytt bilde</span></button>'+
        '</nav>'+
        '<button id="p0-sidebar-settings" class="p0-sidebar-settings" type="button" data-p0-sidebar-action="privacy-menu">'+ICON_SHIELD+'<span>Innstillinger</span></button>'+
      '</aside>'+
      '<div class="p0-main-shell">'+
        '<header class="p0-topbar">'+
          '<a class="p0-brand" href="./mmir.html" aria-label="MMIR.ai chat">'+
            '<span class="p0-mark" aria-hidden="true">MM</span>'+
            '<span class="p0-brand-text"><strong>MMIR.ai</strong><span>Intelligence. Connected.</span></span>'+
          '</a>'+
          '<div class="p0-topbar-truth">'+
            '<span class="p0-ai-badge" role="note" aria-label="KI-chat. Supergeni er kunstig intelligens. Svarforfatter, rute og kilder vises i kvitteringen etter hvert svar." title="Supergeni er kunstig intelligens. Svarforfatter, rute og kilder vises i kvitteringen etter hvert svar.">KI-chat</span>'+
            '<div id="p0-status" class="p0-status" data-state="loading">Sjekker svarbanen</div>'+
          '</div>'+
        '</header>'+
        '<section id="p0-release-warning" class="p0-release-warning" data-state="checking" role="status" aria-live="polite">'+
          '<div><strong>Sjekker offentlig svarbane …</strong><span>Ingen hosted-rute regnes som klar før produksjonsbeviset er verifisert.</span></div>'+
          '<a href="./tillit/">Se tillit og driftsbevis</a>'+
        '</section>'+
        '<main class="p0-chat">'+
          '<div id="p0-transcript" class="p0-transcript" aria-live="polite" aria-relevant="additions text"></div>'+
        '</main>'+
        '<footer class="p0-composer-wrap">'+
          '<form id="p0-composer" class="p0-composer" aria-label="MMIR chat composer">'+
            '<textarea id="p0-input" class="p0-input" rows="2" aria-label="Spør Supergeni, en kunstig intelligens" placeholder="Spør Supergeni (KI) om hva som helst …" autocomplete="off" spellcheck="true"></textarea>'+
            '<input id="p0-photo-camera" class="p0-file-input-hidden" type="file" accept="image/*" capture="environment" aria-hidden="true" tabindex="-1" />'+
            '<input id="p0-photo-library" class="p0-file-input-hidden" type="file" accept="image/*" aria-hidden="true" tabindex="-1" />'+
            '<div class="p0-status-rail">'+
              '<div id="p0-route" class="p0-route" data-state="hosted">'+hostedRouteLabel()+'</div>'+
              '<div id="p0-token-counter" class="p0-token-counter" data-state="quiet" aria-label="0 tokens siste svar">0 tokens</div>'+
            '</div>'+
            '<div class="p0-toolbar">'+
              '<div class="p0-left">'+
                '<button id="p0-attach" class="p0-btn p0-btn-icon" type="button" aria-label="Legg ved bilde" title="Legg ved bilde">'+ICON_ATTACH+'</button>'+
                '<button id="p0-add" class="p0-btn p0-tools-button" type="button" aria-label="Verktøy" title="Verktøy" aria-expanded="false">'+ICON_TOOLS+'<span>Verktøy</span></button>'+
                '<button id="p0-privacy" class="p0-btn p0-btn-icon p0-shield" type="button" aria-label="Sikkerhet og personvern: offentlig modus" title="Sikkerhet og personvern · Offentlig modus" data-state="public">'+ICON_SHIELD+'</button>'+
              '</div>'+
              '<div class="p0-right">'+
                '<span class="p0-speed-chip" title="Fast default route">Fast</span>'+
                '<button id="p0-model" class="p0-model-button" type="button" aria-label="Velg modell" aria-haspopup="dialog" aria-controls="p0-model-menu" aria-expanded="false"><span class="p0-model-name">Supergeni</span><span class="p0-chevron" aria-hidden="true"></span></button>'+
                '<button id="p0-mic" class="p0-btn p0-btn-icon p0-mic" type="button" aria-label="Taleinndata" title="Taleinndata">'+ICON_MIC+'</button>'+
                '<button id="p0-send" class="p0-btn p0-send" type="submit" aria-label="Send melding">Spør</button>'+
              '</div>'+
            '</div>'+
          '</form>'+
        '</footer>'+
      '</div>'+
      '<div id="p0-add-menu" class="p0-menu" role="menu" hidden></div>'+
      '<div id="p0-model-menu" class="p0-menu" role="dialog" aria-label="Velg modell" hidden></div>'+
      '<div id="p0-privacy-menu" class="p0-menu" role="menu" hidden></div>';
    document.body.appendChild(app);
    document.body.classList.remove('mimir-p0-ready');
    document.body.classList.add('mmir-p0-ready');
	    enforceShellStyles();
	    bindShell();
	    renderAll();
	    requestAnimationFrame(()=>document.getElementById('p0-input')?.focus({preventScroll:true}));
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

  function updateDraftState(){
    const app=document.getElementById('mmir-p0-app');
    const input=document.getElementById('p0-input');
    if(!app||!input)return;
    app.classList.toggle('p0-has-draft',Boolean(String(input.value||'').trim()));
  }

  function bindShell(){
    const form=document.getElementById('p0-composer');
    const input=document.getElementById('p0-input');
    form.addEventListener('submit',(event)=>{
      event.preventDefault();
      event.stopImmediatePropagation();
      if(state.busy){
        stopActiveResponse();
        return;
      }
      sendMessage();
    },true);
    form.addEventListener('keydown',(event)=>{
      if(event.target!==input)return;
      if(event.key==='Escape'&&state.busy){
        event.preventDefault();
        stopActiveResponse();
        return;
      }
      if(event.key==='Enter'&&!event.shiftKey){
        event.preventDefault();
        if(state.busy)return;
        sendMessage();
      }
    },true);
    input.addEventListener('input',()=>{
      autosizeInput();
      syncLegacyPromptFromP0();
    });
    bindLegacyPromptBridge();
    document.getElementById('p0-add').addEventListener('click',(event)=>toggleMenu('add',event.currentTarget));
    document.getElementById('p0-attach')?.addEventListener('click',(event)=>{
      event.preventDefault();
      triggerPhotoPicker('library');
    });
    document.getElementById('p0-model').addEventListener('click',(event)=>toggleMenu('model',event.currentTarget));
    document.getElementById('p0-privacy').addEventListener('click',(event)=>toggleMenu('privacy',event.currentTarget));
    document.getElementById('p0-photo-camera')?.addEventListener('change',(event)=>handlePhotoPicked(event,'camera'));
    document.getElementById('p0-photo-library')?.addEventListener('change',(event)=>handlePhotoPicked(event,'library'));
    const mic=document.getElementById('p0-mic');
    updateVoiceButtonState(mic);
    updateVoiceButtonState(document.querySelector('[data-p0-sidebar-action="voice-input"]'));
    mic.addEventListener('click',startVoice);
    document.addEventListener('keydown',(event)=>{
      if(event.key!=='Escape')return;
      const expanded=document.querySelector('#p0-add[aria-expanded="true"],#p0-model[aria-expanded="true"],#p0-privacy[aria-expanded="true"]');
      if(!expanded)return;
      event.preventDefault();
      closeMenus();
      expanded.focus({preventScroll:true});
    });
    document.addEventListener('focusin',(event)=>{
      const message=event.target.closest?.('.p0-message');
      if(message)message.dataset.actionsOpen='true';
    });
    document.addEventListener('focusout',(event)=>{
      const message=event.target.closest?.('.p0-message');
      if(!message)return;
      const next=event.relatedTarget;
      if(next&&message.contains(next))return;
      window.setTimeout(()=>{
        if(document.activeElement&&message.contains(document.activeElement))return;
        const actions=message.querySelector('.p0-message-actions');
        if(actions?.dataset.hasStatus==='true')return;
        delete message.dataset.actionsOpen;
      },0);
    });
    document.addEventListener('pointerover',(event)=>{
      const message=event.target.closest?.('.p0-message');
      if(message)message.dataset.actionsOpen='true';
    });
    document.addEventListener('pointerout',(event)=>{
      const message=event.target.closest?.('.p0-message');
      if(!message)return;
      const next=event.relatedTarget;
      if(next&&message.contains(next))return;
      const actions=message.querySelector('.p0-message-actions');
      if(actions?.dataset.hasStatus==='true'||message.contains(document.activeElement))return;
      delete message.dataset.actionsOpen;
    });
    document.addEventListener('error',handleGeneratedImageError,true);
    document.addEventListener('click',(event)=>{
      const copyButton=event.target.closest('[data-p0-copy-command]');
      if(copyButton){
        event.preventDefault();
        event.stopPropagation();
        copyCommand(copyButton.getAttribute('data-p0-copy-command')||'',copyButton);
        return;
      }
      const messageAction=event.target.closest('[data-p0-message-action]');
      if(messageAction){
        event.preventDefault();
        event.stopPropagation();
        handleMessageAction(
          messageAction.getAttribute('data-p0-message-action')||'',
          messageAction.getAttribute('data-p0-message-id')||''
        );
        return;
      }
      const osButton=event.target.closest('[data-p0-os-command]');
      if(osButton){
        event.preventDefault();
        event.stopPropagation();
        startLocalInstallAssistant(osButton.getAttribute('data-p0-os-command')||'');
        return;
      }
      const toolbarTool=event.target.closest('[data-p0-toolbar-tool]');
      if(toolbarTool){
        event.preventDefault();
        event.stopPropagation();
        handleToolbarTool(toolbarTool.getAttribute('data-p0-toolbar-tool')||'');
        return;
      }
      const routeAction=event.target.closest('[data-p0-route-action]');
      if(routeAction){
        event.preventDefault();
        event.stopPropagation();
        handleRouteAction(routeAction.getAttribute('data-p0-route-action')||'');
        return;
      }
      const actionButton=event.target.closest('[data-p0-action]');
      if(actionButton&&(actionButton.closest('.p0-menu')||actionButton.closest('.p0-sidebar'))){
        event.preventDefault();
        event.stopPropagation();
        handleMenuAction(actionButton.getAttribute('data-p0-action'));
        return;
      }
      const sidebarActionButton=event.target.closest('[data-p0-sidebar-action]');
      if(sidebarActionButton&&sidebarActionButton.closest('.p0-sidebar')){
        event.preventDefault();
        event.stopPropagation();
        handleMenuAction(sidebarActionButton.getAttribute('data-p0-sidebar-action'));
        return;
      }
      if(event.target.closest('#p0-add,#p0-model,#p0-privacy,.p0-menu'))return;
      closeMenus();
    });
  }

  function autosizeInput(){
    const input=document.getElementById('p0-input');
    if(!input)return;
    input.style.height='auto';
    input.style.height=Math.min(180,Math.max(58,input.scrollHeight))+'px';
    updateDraftState();
    syncLegacyPromptFromP0();
  }

  function setPromptDraft(value,statusText,routeText){
    const input=document.getElementById('p0-input');
    if(input){
      input.value=String(value||'');
      autosizeInput();
      input.focus();
    }
    closeMenus();
    if(statusText)status(statusText,'ready');
    if(routeText)routeStatus(routeText,'hosted');
    return true;
  }

  function feedbackDraftContextSummary(){
    const model=activeModel();
    const pool=intelligencePoolSummary();
    const parts=[
      model?.label||'Supergeni',
      model?.route==='local'?'Private local route':'Hosted route',
      pool?.compareReady?'Best Answer ready':'Single route now'
    ];
    if(model?.route==='local'&&pool?.localHardware)parts.push(pool.localHardware);
    return parts.join(' · ');
  }

  function feedbackDraftPrefill(){
    return '@inkognitroz Feedback:\nWhat I tried:\nWhat felt wrong or confusing:\nWhat I expected instead:\nContext: '+feedbackDraftContextSummary();
  }

  function mediaSourceLabel(source){
    return source==='camera'?'kamera':'bibliotek';
  }

  function formatFileSize(bytes){
    const size=Number(bytes)||0;
    if(size>=1048576)return (size/1048576).toFixed(size>=10485760?0:1)+' MB';
    if(size>=1024)return Math.max(1,Math.round(size/1024))+' KB';
    return size+' B';
  }

  function readSharedLocation(){
    const value=readJson(SHARED_LOCATION_KEY,null);
    const lat=Number(value?.lat);
    const lon=Number(value?.lon);
    if(!Number.isFinite(lat)||!Number.isFinite(lon))return null;
    if(lat<-90||lat>90||lon<-180||lon>180)return null;
    return {
      lat,
      lon,
      accuracy_m:Number(value?.accuracy_m)||0,
      label:String(value?.label||'delt posisjon').slice(0,80),
      shared_at:String(value?.shared_at||'').slice(0,40)
    };
  }

  function writeSharedLocation(location){
    localStorage.setItem(SHARED_LOCATION_KEY,JSON.stringify(location));
  }

  function promptNeedsSharedLocation(prompt=''){
    const text=String(prompt||'').toLowerCase();
    return /\b(veien\s+til|vei\s+til|rute\s+til|kjøre\s+til|reise\s+til|dra\s+til|hvor\s+lang\s+tid\s+tar|hvor\s+langt|avstand|nær\s+meg|i\s+nærheten|været|vær|weather|directions?|route\s+to|travel\s+time)\b/i.test(text);
  }

  function sharedLocationContextForPrompt(prompt=''){
    const location=readSharedLocation();
    if(!location||!promptNeedsSharedLocation(prompt))return '';
    const lat=location.lat.toFixed(5);
    const lon=location.lon.toFixed(5);
    const accuracy=location.accuracy_m?Math.round(location.accuracy_m):0;
    return [
      'MMIR location context:',
      'user_shared_location:true;',
      'origin_label:'+location.label+';',
      'origin_lat:'+lat+';',
      'origin_lon:'+lon+';',
      accuracy?('origin_accuracy_m:'+String(accuracy)+';'):'',
      'Use this only as approximate origin for travel/weather/near-me questions. Do not expose precise coordinates unless needed for the answer.'
    ].filter(Boolean).join(' ');
  }

  async function reverseGeocodeSharedLocation(lat,lon){
    try{
      const url='https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=10&addressdetails=0&accept-language=no&lat='+encodeURIComponent(String(lat))+'&lon='+encodeURIComponent(String(lon));
      const response=await fetch(url,{headers:{accept:'application/json'},redirect:'follow'});
      if(!response.ok)return '';
      const data=await response.json();
      return String(data?.display_name||'').split(',').slice(0,2).join(', ').trim();
    }catch{
      return '';
    }
  }

  function requestSharedLocation(){
    if(!navigator.geolocation){
      status('Posisjon er ikke tilgjengelig i denne nettleseren.','error');
      routeStatus('Posisjon utilgjengelig','error');
      return false;
    }
    closeMenus();
    status('Ber nettleseren om posisjon...','ready');
    routeStatus('Del posisjon · venter på nettlesersamtykke','hosted');
    captureInteraction('location_share_started',{browser_prompt:true,stored_local_only:true});
    navigator.geolocation.getCurrentPosition(async(position)=>{
      const coords=position.coords||{};
      const lat=Number(coords.latitude);
      const lon=Number(coords.longitude);
      if(!Number.isFinite(lat)||!Number.isFinite(lon)){
        status('Kunne ikke lese posisjonen.','error');
        routeStatus('Posisjon feilet · ingen data lagret','error');
        return;
      }
      const label=await reverseGeocodeSharedLocation(lat,lon)||'delt posisjon';
      const location={
        lat,
        lon,
        accuracy_m:Number(coords.accuracy)||0,
        label,
        shared_at:new Date().toISOString()
      };
      writeSharedLocation(location);
      captureInteraction('location_shared',{
        accuracy_m:Math.round(location.accuracy_m||0),
        label,
        stored_local_only:true
      });
	      append('assistant','Posisjon er delt for denne nettleseren: '+label+'. Jeg bruker den bare som omtrentlig startsted når spørsmålet trenger sted, for eksempel avstand, vær eller nær meg.','MMIR posisjon','Posisjon delt · browser opt-in · brukes kun ved behov',{actions:false});
      status('Posisjon delt.','ready');
      routeStatus('Posisjon klar · brukes ved relevante spørsmål','ready');
      document.getElementById('p0-input')?.focus();
    },()=>{
      captureInteraction('location_share_denied',{browser_prompt:true});
      status('Posisjon ble ikke delt.','error');
      routeStatus('Posisjon ikke delt · spør med startsted','error');
    },{enableHighAccuracy:false,timeout:10000,maximumAge:300000});
    return true;
  }

  function readFileAsDataUrl(file){
    return new Promise((resolve,reject)=>{
      const reader=new FileReader();
      reader.onload=()=>resolve(String(reader.result||''));
      reader.onerror=()=>reject(reader.error||new Error('file_read_failed'));
      reader.readAsDataURL(file);
    });
  }

  function triggerPhotoPicker(source){
    const input=document.getElementById(source==='camera'?'p0-photo-camera':'p0-photo-library');
    if(!input){
      status('Bildevalg er ikke tilgjengelig i denne nettleseren.','error');
      routeStatus('Bildevalg utilgjengelig · ingen opplasting startet','error');
      return false;
    }
    captureInteraction('media_picker_started',{source,raw_image_sent_to_gateway:false,provider_called:false});
    input.value='';
    closeMenus();
    input.click();
    status(source==='camera'?'Kamera åpnes...':'Bildefiler åpnes...','ready');
    routeStatus('Bildevalg · lokalt i nettleseren · ikke sendt','hosted');
    return true;
  }

  async function handlePhotoPicked(event,source){
    const input=event?.target;
    const file=input?.files?.[0];
    if(!file)return false;
    if(!/^image\//i.test(file.type||'')){
      status('Velg et bilde.','error');
      routeStatus('Bilde avvist · feil filtype','error');
      return false;
    }
    const maxBytes=4*1024*1024;
    if(file.size>maxBytes){
      status('Bildet er for stort for trygg demo. Velg et mindre bilde.','error');
      routeStatus('Bilde avvist · maks 4 MB · ikke sendt','error');
      return false;
    }
    let dataUrl='';
    try{
      dataUrl=await readFileAsDataUrl(file);
    }catch{
      status('Kunne ikke lese bildet i nettleseren. Prøv et annet bilde.','error');
      routeStatus('Bilde avvist · lesing feilet · ikke sendt','error');
      return false;
    }
    if(!/^data:image\//i.test(dataUrl)){
      status('Kunne ikke klargjøre bildet trygt. Prøv et annet bilde.','error');
      routeStatus('Bilde avvist · ugyldig data-url','error');
      return false;
    }
    const media={
      source,
      name:String(file.name||'bilde').slice(0,120),
      type:String(file.type||'image/*').slice(0,80),
      size_bytes:file.size,
      size_label:formatFileSize(file.size),
      data_url:dataUrl,
      raw_image_sent_to_gateway:false,
      no_provider_upload:true,
      selected_at:new Date().toISOString()
    };
    state.pendingMedia=media;
    closeMenus();
    captureInteraction('media_attachment_selected',{
      source,
      type:media.type,
      size_bytes:media.size_bytes,
      raw_image_sent_to_gateway:false,
      provider_called:false
    });
    queueMediaCapabilityFeedback(media);
    const inputEl=document.getElementById('p0-input');
    if(inputEl&&!String(inputEl.value||'').trim()){
      inputEl.value='Hva kan du se i bildet?';
      autosizeInput();
    }
    append(
      'assistant',
	      'Bildet er valgt fra '+mediaSourceLabel(source)+': '+media.name+' ('+media.size_label+').\n\nTrykk send for å analysere bildet via MMIRs beskyttede bildeanalyse. Råbildet skal ikke logges eller vises tilbake; kvitteringen viser hvilken vision-modell som ble brukt.',
      'MMIR bildevalg',
	      'Bilde valgt · klart for beskyttet bildeanalyse',
      {variant:'media',actions:false}
    );
    status('Bilde valgt lokalt.','ready');
	    routeStatus('Bilde klart · sendes til beskyttet bildeanalyse ved neste melding','hosted');
    inputEl?.focus();
    return true;
  }

  function legacyPromptInput(){
    return document.getElementById('mimir-prompt');
  }

  function p0Input(){
    return document.getElementById('p0-input');
  }

  function syncLegacyPromptFromP0(){
    if(legacyPromptSyncing)return;
    const legacy=legacyPromptInput();
    const input=p0Input();
    if(!legacy||!input)return;
    legacyPromptSyncing=true;
    try{
      if(legacy.value!==input.value)legacy.value=input.value;
    }finally{
      legacyPromptSyncing=false;
    }
  }

  function syncP0InputFromLegacy(){
    if(legacyPromptSyncing)return;
    const legacy=legacyPromptInput();
    const input=p0Input();
    if(!legacy||!input)return;
    legacyPromptSyncing=true;
    try{
      if(input.value!==legacy.value){
        input.value=legacy.value;
        autosizeInput();
      }
    }finally{
      legacyPromptSyncing=false;
    }
  }

  function bindLegacyPromptBridge(){
    if(legacyPromptBridgeBound)return;
    legacyPromptBridgeBound=true;
    const legacy=legacyPromptInput();
    if(legacy){
      legacy.addEventListener('input',syncP0InputFromLegacy);
      legacy.addEventListener('change',syncP0InputFromLegacy);
      legacy.addEventListener('keydown',(event)=>{
        if(event.key!=='Enter'||event.shiftKey||event.isComposing)return;
        event.preventDefault();
        event.stopImmediatePropagation();
        syncP0InputFromLegacy();
        if(state.busy)return;
        sendMessage();
      },true);
    }
    document.getElementById('primary-chat-link')?.addEventListener('click',(event)=>{
      if(!document.getElementById('mmir-p0-app'))return;
      event.preventDefault();
      event.stopImmediatePropagation();
      syncP0InputFromLegacy();
      if(state.busy)stopActiveResponse();
      else sendMessage();
    },true);
    document.getElementById('new-backend')?.addEventListener('click',(event)=>{
      if(!document.getElementById('mmir-p0-app'))return;
      event.preventDefault();
      event.stopImmediatePropagation();
      document.getElementById('p0-add')?.click();
    },true);
    syncLegacyPromptFromP0();
  }

  function speechSupported(){
    return Boolean(window.SpeechRecognition||window.webkitSpeechRecognition);
  }

  function updateVoiceButtonState(mic=document.getElementById('p0-mic')){
    if(!mic)return;
    const supported=speechSupported();
    mic.dataset.voiceState=supported?'available':'unavailable';
    mic.disabled=false;
    mic.setAttribute('aria-disabled',supported?'false':'true');
    mic.title=supported?'Taleinndata: lokal talegjenkjenning i nettleseren':'Taleinndata er ikke tilgjengelig i denne nettleseren. Skriv i feltet i stedet.';
    mic.setAttribute(
      'aria-label',
      supported?'Taleinndata: lokal talegjenkjenning i nettleseren':'Taleinndata er ikke tilgjengelig. Aktiver for mer informasjon.'
    );
    const text=mic.querySelector?.('span');
    if(text)text.textContent=supported?'Ny talechat':'Talechat (ikke støttet)';
  }

  function emitVoiceState(stateValue,detail={}){
    window.dispatchEvent(new CustomEvent('mmir-p0-voice-state-updated',{
      detail:{
        state:stateValue,
        supported:speechSupported(),
        no_server_audio:true,
        no_paid_route:true,
        ...detail
      }
    }));
  }

  function startVoice(){
    const restoreRouteLater=(delay=1800)=>setTimeout(()=>renderToolbar(),delay);
    updateVoiceButtonState();
    if(!speechSupported()){
      status('Taleinndata er ikke tilgjengelig. Skriv i feltet i stedet.','error');
      routeStatus('Tale utilgjengelig · kun lokalt i nettleseren','error');
      emitVoiceState('unavailable');
      restoreRouteLater(2200);
      return;
    }
    const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
    const recognition=new Recognition();
    recognition.lang=document.documentElement.lang||navigator.language||'en-US';
    recognition.interimResults=false;
    recognition.maxAlternatives=1;
    let heardVoice=false;
    emitVoiceState('starting');
        status('Lytter …','ready');
        routeStatus('Lytter …','hosted');
    recognition.onstart=()=>{
      emitVoiceState('listening');
      status('Listening...','ready');
      routeStatus('Listening...','hosted');
    };
    recognition.onerror=(event)=>{
      emitVoiceState('failed',{error:event?.error||'unknown'});
      status('Taleinndata feilet eller ble avbrutt.','error');
      routeStatus('Taleinndata feilet eller ble avbrutt.','error');
      restoreRouteLater(2200);
    };
    recognition.onend=()=>{
      if(!heardVoice){
        emitVoiceState('stopped');
        status('Taleinndata stoppet.','idle');
        routeStatus('Taleinndata stoppet.','hosted');
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
        emitVoiceState('transcribed',{text_length:text.length});
        status('Taletekst lagt til.','ready');
        routeStatus('Taletekst lagt til.','hosted');
        restoreRouteLater();
      }
    };
    try{
      recognition.start();
    }catch(error){
      emitVoiceState('failed',{error:error?.message||'start failed'});
      status('Taleinndata feilet eller ble avbrutt.','error');
      routeStatus('Taleinndata feilet eller ble avbrutt.','error');
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
    if(name==='model')menu.querySelector('button')?.focus({preventScroll:true});
  }

  function menuTitle(text){
    return window.MimirP0Menu.title(text);
  }

  function menuSection(text){
    return window.MimirP0Menu.section(text);
  }

  function menuSeparator(){
    return window.MimirP0Menu.separator();
  }

  function menuButton(action,title,detail='',options={}){
    return window.MimirP0Menu.button(action,title,detail,options);
  }

  function renderAddMenu(){
    const menu=menuEl('add');
    if(!menu)return;
    menu.innerHTML=''+
      menuTitle('Legg til')+
      menuButton('take-photo-local','Ta bilde')+
      menuButton('choose-photo-local','Velg bilde')+
      menuSeparator()+
      menuButton('privacy-menu','Personvern')+
      menuButton('cycle-answer-style','Svarstil: '+answerStyleLabel())+
      menuSeparator()+
      menuButton('new-chat','Ny chat');
  }

  function renderPromptPresetMenu(){
    const menu=menuEl('add');
    if(!menu)return;
    const catalog=promptPresetCatalog();
    const saved=savedPromptPresets();
    const presetButtons=catalog.map(preset=>
      menuButton('load-preset:'+preset.id,preset.title,preset.detail||'Load into composer.')
    ).join('');
    const savedButtons=saved.map(preset=>
      menuButton('load-preset:'+preset.id,preset.title,'Saved locally in this browser.')
    ).join('');
    menu.innerHTML=''+
      menuTitle('Prompt presets')+
      menuButton('add-menu-main','Back','Return to Add.')+
      menuButton('save-prompt-local','Save current prompt','Stores only in this browser, not on MMIR servers.')+
      menuSeparator()+
      menuSection('Starters')+
      presetButtons+
      (savedButtons?menuSection('Saved in this browser')+savedButtons:'');
  }

  function renderRoleProfileMenu(){
    const menu=menuEl('add');
    if(!menu)return;
    const selected=normalizeRoleProfileId(state.roleProfileId);
    const buttons=ROLE_PROFILES.map(profile=>
      menuButton('set-role-profile:'+profile.id,profile.label,profile.detail,{badge:profile.id===selected?'Selected':''})
    ).join('');
    menu.innerHTML=''+
      menuTitle('Role profile')+
      menuButton('add-menu-main','Back','Return to Add.')+
      '<div class="p0-menu-note">Role profiles are personal presence instructions sent with the prompt. They stay in this browser.</div>'+
      menuSeparator()+
      buttons;
  }

  function renderModelMenu(){
    const menu=menuEl('model');
    if(!menu)return;
    const local=bestLocalModel();
    const active=activeModel();
    const filter=modelFilter();
    const rankMap=routeRankMap();
    const hostedActiveModels=rankedModels(state.models.filter(model=>
      model.route==='hosted'&&
      modelVisibleInFilter(model,filter)&&
      model.executable!==false&&
      model.selectable!==false&&
      !model.candidate
    ));
    const hostedFutureModels=rankedModels(state.models.filter(model=>
      model.route==='hosted'&&
      modelVisibleInFilter(model,filter)&&
      (model.candidate||model.executable===false||model.selectable===false)
    ));
    const localModels=rankedModels(state.models.filter(model=>model.route==='local'&&modelVisibleInFilter(model,filter)));
    const renderButtons=(models)=>models.map(model=>{
      const benchmark=routeBenchmarkSummary(model);
      const rankSummary=routeRankSummary(model);
      const shortDetail=model.route==='local'
        ? [routeOperationalHint(model),modelUseCase(model),rankSummary,'Privat · Denne maskinen',benchmark].filter(Boolean).join(' · ')
        : model.candidate
          ? [routeOperationalHint(model),modelUseCase(model),model.provider,'node-overlevering kreves'].filter(Boolean).join(' · ')
          : [routeOperationalHint(model),modelUseCase(model),rankSummary,(model.routeClass==='external-untrusted-free'||model.trustLevel==='external-untrusted-free')?'Ekstern':'Hostet',benchmark].filter(Boolean).join(' · ');
      const selectable=model.executable!==false&&model.selectable!==false;
      const title=selectable?('Velg '+model.label):(model.nextAction||'Kandidaten er synlig, men kan ikke velges ennå.');
      return '<button type="button" data-model-id="'+safeAttr(model.id)+'" data-route-rank-state="'+safeAttr(routeRankState(model))+'" data-model-selectable="'+(selectable?'true':'false')+'" aria-disabled="'+(selectable?'false':'true')+'" title="'+safeAttr(title)+'"><span class="p0-menu-row"><strong>'+safeText(model.label)+'</strong>'+compactModelBadges(model,local,rankMap[model.id])+'</span><small>'+safeText(shortDetail)+'</small></button>';
    }).join('');
    const buttons=''+
      (hostedActiveModels.length?menuSection('Live-verifiserte hostede ruter')+renderButtons(hostedActiveModels):'<div class="p0-menu-note">Ingen hostet rute er produksjonsverifisert nå.</div>')+
      (hostedFutureModels.length?menuSection('Konfigurerte eller fremtidige ruter')+renderButtons(hostedFutureModels):'')+
      (localModels.length?menuSection('Private lokale modeller')+renderButtons(localModels):'');
    const filterHint=(hostedActiveModels.length||hostedFutureModels.length||localModels.length)?'':
      '<div class="p0-menu-note">Ingen '+safeText(modelFilterLabel(filter).toLowerCase())+' ruter ennå.</div>';
    const activeFilterHint=filter==='all'?'':'<div class="p0-menu-note">Viser '+safeText(modelFilterLabel(filter).toLowerCase())+' ruter.</div>';
    const scoreHint='<div class="p0-menu-note">Poeng betyr rutetilpasning for forespørselen, ikke sannhetsprosent.</div>';
    const routeControls=menuSeparator()+menuButton('model-route-controls','Rutestyring','Fest og filtrer modeller, og se rute- og poengdetaljer.');
    menu.innerHTML=menuTitle('Modeller')+buttons+filterHint+activeFilterHint+scoreHint+routeControls;
    menu.querySelectorAll('[data-model-id]').forEach(button=>{
      button.addEventListener('click',()=>{
        const model=state.models.find(item=>item.id===button.getAttribute('data-model-id'));
        if(!model||model.executable===false||model.selectable===false){
          const label=model?.label||'Leverandørkandidat';
          status(label+' er synlig, men ikke live-verifisert for chat.','error');
          routeStatus('Konfigurert/fremtidig rute · produksjonsbevis kreves','error');
          return;
        }
        state.activeModelId=model.id;
        persistActiveModelId();
        closeMenus();
        renderToolbar();
        status(model.label+' er valgt.','ready');
      });
    });
  }

  function renderRouteControlsMenu(){
    const menu=menuEl('model');
    if(!menu)return;
    const active=activeModel();
    const activePinned=routePinned(active);
    const filter=modelFilter();
    const pinControl=menuButton(
      activePinned?'unpin-active-route':'pin-active-route',
      activePinned?'Løsne valgt rute':'Fest valgt rute',
      activePinned?'Bruk vanlig poengrangering for '+active.label+'.':'Hold '+active.label+' øverst i modellvelgeren i denne nettleseren.'
    );
    const filterControl=menuButton('cycle-model-filter','Filter: '+modelFilterLabel(filter),modelFilterDetail(filter));
    const detailReceipt='<div class="p0-menu-note p0-route-detail"><strong>Rutedetaljer</strong><span>'+safeText(routeDetailReceipt(active))+'</span></div>';
    menu.innerHTML=''+
      menuTitle('Rutestyring')+
      menuButton('model-menu-main','Tilbake til modeller','Gå tilbake til den enkle modellisten.')+
      menuSeparator()+
      pinControl+
      filterControl+
      detailReceipt+
      '<div class="p0-menu-note">'+safeText(routeScoreExplainer())+'</div>'+
      '<div class="p0-menu-note">Festede ruter lagres i denne nettleseren. Rutepoeng viser fortsatt kvalitet.</div>';
  }

  function privacyModeLabel(mode=privacyMode()){
    if(mode==='superprivate')return 'Superprivat modus';
    if(mode==='private')return 'Privat modus';
    return 'Offentlig modus';
  }

  function privacyModeDetail(mode){
    const value=normalizePrivacyMode(mode);
    if(value==='superprivate'){
      return bestLocalModel()||activeModel().route==='local'
        ? 'Bare lokalt. Hostede ruter er blokkert, og chatteloggen lagres ikke i nettleseren.'
        : 'Krever en lokal modell. Hostede ruter forblir blokkert, og chatteloggen lagres ikke i nettleseren.';
    }
    if(value==='private'){
      return bestLocalModel()||activeModel().route==='local'
        ? 'Bruker den lokale modellen. Hosted reservebane er blokkert.'
        : 'Krever en lokal modell før private meldinger kan sendes.';
    }
    return 'Standardmodus. Supergenis hostede rute er tillatt. Ikke lim inn hemmeligheter eller sensitive filer.';
  }

  function privacyModeRouteStatus(){
    if(superPrivateModeActive()){
      return bestLocalModel()||activeModel().route==='local'
        ? {text:'Superprivat modus',state:'local'}
        : {text:'Superprivat krever lokal node',state:'error'};
    }
    if(privateModeActive()){
      return bestLocalModel()||activeModel().route==='local'
        ? {text:'Privat modus',state:'local'}
        : {text:'Privat modus krever lokal node',state:'error'};
    }
    return {text:'Offentlig modus',state:'hosted'};
  }

  function factGuardDetail(){
    return factGuardActive()
      ? 'On. Current facts prefer verified/fresher routes and stale local facts are demoted.'
      : 'Off. MMIR follows the selected route with fewer factuality checks.';
  }

  function demoTranscriptConsentLabel(){
    const params=demoTranscriptParams();
    if(demoTranscriptConsentActive(params))return 'På';
    if(readStorageString(DEMO_TRANSCRIPT_CONSENT_KEY,'')==='declined')return 'Av';
    return 'Av';
  }

  function demoTranscriptConsentDetail(){
    if(demoTranscriptConsentActive())return 'Rå demo- og testsamtaler kan lagres for produktlæring. Ikke lim inn hemmeligheter.';
    return 'Lagring av rå samtaler er av. Avgrenset telemetri kan fortsatt registrere tilbakemeldinger, klikk og rutemetadata.';
  }

  function clearPersistedHistory(){
    writeHistorySchema();
    writeHistoryJson([]);
  }

  function setPrivacyMode(mode){
    state.privacyMode=normalizePrivacyMode(mode);
    writePrivacyMode(state.privacyMode);
    if(privateModeActive())clearWriterContinuityState();
    if(superPrivateModeActive())clearPersistedHistory();
    renderToolbar();
    renderPrivacyMenu();
    const next=privacyModeRouteStatus();
    status(privacyModeLabel()+' selected.','ready');
    routeStatus(next.text,next.state);
  }

  function setFactGuard(enabled){
    state.factGuard=Boolean(enabled);
    writeBooleanPreference(FACT_GUARD_KEY,state.factGuard);
    renderToolbar();
    renderPrivacyMenu();
    status(state.factGuard?'Fact guard on.':'Fact guard off.','ready');
  }

  function renderPrivacyMenu(){
    const menu=menuEl('privacy');
    if(!menu)return;
    const selected=privacyMode();
    const demoControls=demoTranscriptModeRequested(demoTranscriptParams())
      ? menuSeparator()+
        menuButton('set-demo-transcript-consent:on','Demo-læring på','Lagre redigert testdialog for produktlæring.',{badge:demoTranscriptConsentLabel()==='På'?'På':''})+
        menuButton('set-demo-transcript-consent:off','Demo-læring av',demoTranscriptConsentDetail(),{badge:demoTranscriptConsentLabel()==='Av'?'Av':''})
      : '';
    menu.innerHTML=''+
      menuTitle('Personvern')+
      menuButton('set-privacy-mode:public','Offentlig',privacyModeDetail('public'),{badge:selected==='public'?'Valgt':''})+
      menuButton('set-privacy-mode:private','Privat',privacyModeDetail('private'),{badge:selected==='private'?'Valgt':''})+
      menuButton('set-privacy-mode:superprivate','Superprivat',privacyModeDetail('superprivate'),{badge:selected==='superprivate'?'Valgt':''})+
      demoControls;
  }

  function shieldStateFor(model,local){
    if(superPrivateModeActive()){
      return local||model?.route==='local'
        ? {state:'superprivate',label:'Superprivat modus · lokal tilkobling aktiv'}
        : {state:'error',label:'Superprivat modus krever lokal node'};
    }
    if(privateModeActive()){
      return local||model?.route==='local'
        ? {state:'private',label:'Privat modus · lokal tilkobling aktiv'}
        : {state:'error',label:'Privat modus krever lokal node'};
    }
    if(model?.route==='local')return {state:'local',label:'Lokal tilkobling aktiv'};
    if(local)return {state:'local',label:'Lokal tilkobling klar · offentlig modus'};
    return hostedJourneyReady('first_chat')
      ? {state:'public',label:'Offentlig modus · Supergenis hostede rute er live-verifisert'}
      : {state:'error',label:'Offentlig modus · hostet rute blokkert til produksjonsbeviset er grønt'};
  }

  function renderShieldState(model=activeModel(),local=bestLocalModel()){
    const shield=document.getElementById('p0-privacy');
    if(!shield)return;
    const next=shieldStateFor(model,local);
    shield.dataset.state=next.state;
    shield.setAttribute('aria-label','Sikkerhet og personvern: '+next.label);
    shield.setAttribute('title','Sikkerhet og personvern · '+next.label);
  }

  function renderPinnedToolbarTools(){
    const target=document.getElementById('p0-toolbar-tools');
    if(!target)return;
	    target.innerHTML=pinnedToolbarToolIds()
	      .map(id=>toolbarToolById(id))
	      .filter(Boolean)
	      .map(tool=>
	        '<button class="p0-btn p0-btn-icon p0-toolbar-tool" type="button" data-p0-toolbar-tool="'+safeAttr(tool.id)+'" aria-label="'+safeAttr(tool.title)+'" title="'+safeAttr(tool.title)+'">'+tool.icon+'</button>'
	      )
	      .join('');
	    document.getElementById('mmir-p0-app')?.classList.toggle('p0-has-toolbar-tools',Boolean(target.children.length));
	    updatePinnedToolbarToolStates();
	  }

  function renderSuperboostCta(){
    const button=document.getElementById('p0-superboost');
    if(!button)return;
    const pool=intelligencePoolSummary();
    const routeCount=Math.max(Number(pool.compareRouteTotal)||0,Number(pool.activeRouteTotal)||0,activeHostedCompareModels().length);
    const ready=Boolean(hostedJourneyReady('compare')&&!privateModeActive()&&(gatewayCompareAvailable()||comparePartnerModel()||routeCount>1));
    const visibleCount=ready&&routeCount>1?routeCount:0;
    const label=visibleCount?'Superboost · '+String(visibleCount)+' AI':'Superboost';
    const title=ready
      ? 'Superboost: spør '+String(visibleCount)+' live-verifiserte AI-ruter, ranger svarene og returner det beste'
      : 'Superboost er blokkert til sammenligningsporten har ferskt produksjonsbevis';
    button.textContent=label;
    button.dataset.state=ready?'ready':'setup';
    button.toggleAttribute('disabled',Boolean(state.busy||privateModeActive()||!ready));
    button.setAttribute('aria-label',title);
    button.setAttribute('title',title);
  }

  function renderCouncilCta(){
    const button=document.getElementById('p0-council');
    if(!button)return;
    const pool=intelligencePoolSummary();
    const routeCount=Math.max(Number(pool.compareRouteTotal)||0,Number(pool.activeRouteTotal)||0,activeHostedCompareModels().length);
    const ready=Boolean(hostedJourneyReady('swarm_preview')&&!privateModeActive()&&(gatewayCompareAvailable()||comparePartnerModel()||routeCount>1));
    const visibleCount=ready&&routeCount>1?routeCount:0;
    const label=visibleCount?'Debate · '+String(visibleCount)+' AI':'Debate';
    const title=ready
      ? 'Supergeni-råd: spør '+String(visibleCount)+' live-verifiserte AI-ruter, utfordre svake antakelser og samle konklusjonen'
      : 'Supergeni-råd er blokkert til svermporten har ferskt produksjonsbevis';
    button.textContent=label;
    button.dataset.state=ready?'ready':'setup';
    button.toggleAttribute('disabled',Boolean(state.busy||privateModeActive()||!ready));
    button.setAttribute('aria-label',title);
    button.setAttribute('title',title);
  }

  function updatePinnedToolbarToolStates(){
    document.querySelectorAll('[data-p0-toolbar-tool="stop"]').forEach(button=>{
      const enabled=Boolean(state.busy);
      button.toggleAttribute('disabled',!enabled);
      button.dataset.busy=enabled?'true':'false';
      button.setAttribute('aria-label',enabled?'Stop current response':'No active response to stop');
      button.setAttribute('title',enabled?'Stop current response':'No active response');
    });
  }

  function syncAiDisclosureComposer(){
    const input=document.getElementById('p0-input');
    if(!input)return;
    input.setAttribute('placeholder','Spør Supergeni (KI) om hva som helst …');
    input.setAttribute('aria-label','Spør Supergeni, en kunstig intelligens');
  }

  function renderToolbar(){
    const model=activeModel();
    const local=bestLocalModel();
    const displayModel=privateModeActive()&&local?local:model;
    const label=document.querySelector('#p0-model .p0-model-name');
    if(label)label.textContent=displayModel.label;
    syncAiDisclosureComposer();
    renderShieldState(displayModel,local);
    renderSuperboostCta();
    renderCouncilCta();
    renderPinnedToolbarTools();
    if(privateModeActive()){
      const next=privacyModeRouteStatus();
      routeStatus(next.text,next.state);
    }else{
      routeStatus(routeMicroStatus(model),routeReceipt(model).state);
    }
    updateSendControl();
  }

  function runTwoModelTool(action){
    const primary=defaultHostedModel();
    const partner=comparePartnerModel();
    const input=document.getElementById('p0-input');
    const prompt=String(input?.value||'').trim();
    if(!primary||!partner||primary.id===partner.id){
      captureInteraction('tool_blocked',{tool:action,reason:'needs_second_model'});
      status('Oppdater AI først, så kan to AI-kilder brukes sammen.','error');
      routeStatus('Two-model tools need another active model','error');
      input?.focus();
      return true;
    }
    if(!prompt){
      if(action==='discuss-topic'&&input){
        captureInteraction('supergeni_council_prefill',{tool:'supergeni-council'});
        input.value='Council topic: ';
        autosizeInput();
        closeMenus();
        status('Add a topic, then send or choose Supergeni Council again.','ready');
        routeStatus('Supergeni Council ready · active models challenge each other','ready');
        input.focus();
        return true;
      }
      status('Write a prompt first, then choose this two-model tool.','error');
      captureInteraction('tool_blocked',{tool:action,reason:'missing_prompt'});
      routeStatus('Two-model tool needs a prompt','error');
      input?.focus();
      return true;
    }
    closeMenus();
    if(gatewayComparePreferred()){
      if(action==='compare-live'){
        captureInteraction('tool_used',{tool:'compare-answers',path:'gateway'});
        compareGatewayRoutes(prompt,{mode:'compare'});
        return true;
      }
      if(action==='best-answer-live'){
        captureInteraction('tool_used',{tool:'best-answer-benchmark',path:'gateway'});
        compareGatewayRoutes(prompt,{mode:'best-answer'});
        return true;
      }
      if(action==='discuss-topic'){
        captureInteraction('tool_used',{tool:'supergeni-council',path:'gateway'});
        compareGatewayRoutes(
          'Supergeni Council: Let approved active models answer, challenge weak assumptions, then converge on one practical conclusion. Topic: '+prompt,
          {mode:'council'}
        );
        return true;
      }
    }
    if(action==='compare-live'){
      captureInteraction('tool_used',{tool:'compare-answers',path:'two-model'});
      compareLiveRoutes(prompt,partner,{mode:'compare'});
      return true;
    }
    if(action==='boost-answer-live'){
      captureInteraction('tool_used',{tool:'boost-answer',path:'two-model'});
      compareLiveRoutes(prompt,partner,{mode:'boost'});
      return true;
    }
    if(action==='best-answer-live'){
      captureInteraction('tool_used',{tool:'best-answer-benchmark',path:'two-model'});
      compareLiveRoutes(prompt,partner,{mode:'best-answer'});
      return true;
    }
    if(action==='discuss-topic'){
      captureInteraction('tool_used',{tool:'supergeni-council',path:'two-model'});
      compareLiveRoutes(
        'Supergeni Council: compare two model perspectives, challenge weak assumptions, then converge on one practical conclusion: '+prompt,
        partner,
        {mode:'best-answer'}
      );
      return true;
    }
    return false;
  }

  function freshStart(){
    const input=document.getElementById('p0-input');
    state.fastAnswerOnce=false;
    state.messages=[];
    clearWriterContinuityState();
    clearPersistedHistory();
    if(input){
      input.value='';
      autosizeInput();
    }
    renderTranscript();
    closeMenus();
    status('Fresh start ready.','ready');
    routeStatus('Chat cleared · pairing kept','hosted');
    input?.focus();
  }

  function saveMemorySnapshot(){
    const model=activeModel();
    const input=document.getElementById('p0-input');
    const saveContent=!superPrivateModeActive();
    const snapshot={
      savedAt:new Date().toISOString(),
      activeModelId:model.id,
      activeModelLabel:model.label,
      privacyMode:privacyMode(),
      factGuard:factGuardActive(),
      answerStyle:answerStyle(),
      roleProfileId:normalizeRoleProfileId(state.roleProfileId),
      pinnedTools:pinnedToolbarToolIds(),
      messageCount:state.messages.length,
      messages:saveContent?state.messages.slice(-MAX_HISTORY).map(message=>({
        role:message.role,
        label:message.label||'',
        content:message.content||'',
        variant:message.variant||''
      })):[],
      inputDraft:saveContent?String(input?.value||''):'',
      browserLocalOnly:true,
      secretsStored:false
    };
    writeJson(MEMORY_SNAPSHOT_KEY,snapshot);
    closeMenus();
    status('Memory saved locally.','ready');
    routeStatus(saveContent?'Memory saved · browser only':'Memory saved · superprivate metadata only','hosted');
  }

  function localMemoryItems(){
    const items=readJson(LOCAL_MEMORY_ITEMS_KEY,[]);
    return Array.isArray(items)?items.filter(item=>item&&String(item.text||'').trim()).slice(-30):[];
  }

  function localDocumentNotes(){
    const notes=readJson(LOCAL_DOCUMENT_NOTES_KEY,[]);
    return Array.isArray(notes)?notes.filter(note=>note&&String(note.title||note.text||'').trim()).slice(-20):[];
  }

  function cleanLocalNoteText(text){
    return String(text||'').replace(/\s+/g,' ').trim().slice(0,1200);
  }

  function addLocalMemory(text){
    const value=cleanLocalNoteText(text);
    if(!value)return null;
    const item={id:'mem-'+Date.now(),text:value,savedAt:new Date().toISOString(),browserLocalOnly:true,secretsStored:false};
    writeJson(LOCAL_MEMORY_ITEMS_KEY,localMemoryItems().concat(item).slice(-30));
    return item;
  }

  function addLocalDocumentNote(title,text){
    const noteTitle=cleanLocalNoteText(title)||'Untitled note';
    const noteText=cleanLocalNoteText(text);
    if(!noteText)return null;
    const note={id:'doc-'+Date.now(),title:noteTitle.slice(0,80),text:noteText,savedAt:new Date().toISOString(),browserLocalOnly:true,secretsStored:false};
    writeJson(LOCAL_DOCUMENT_NOTES_KEY,localDocumentNotes().concat(note).slice(-20));
    return note;
  }

  function localMemoryAnswer(){
    const memories=localMemoryItems();
    const notes=localDocumentNotes();
    const memoryLines=memories.length
      ? memories.slice(-8).map(item=>'- '+item.text).join('\n')
      : '- No saved memory yet. Use /remember followed by what MMIR should keep in this browser.';
    const noteLines=notes.length
      ? notes.slice(-5).map(note=>'- '+note.title+': '+note.text).join('\n')
      : '- No document notes yet. Use /doc Title: short note.';
    return 'Local memory in this browser:\n'+memoryLines+'\n\nLocal document notes:\n'+noteLines+'\n\nStorage: browser only. No cloud storage, no provider call, no owner cost.';
  }

  function isLocalMemoryQuestion(prompt){
    const value=String(prompt||'').trim().toLowerCase();
    return /^\/memory\b/.test(value)||
      /^\/docs\b/.test(value)||
      /^(what|hva|vis|show).*(remember|memory|husker|minne|docs|documents|dokument)/.test(value);
  }

  function handleLocalKnowledgeCommand(prompt,input){
    const value=String(prompt||'').trim();
    const remember=value.match(/^\/remember\s+([\s\S]+)/i);
    const doc=value.match(/^\/doc(?:ument)?\s+([^:\n]{1,100})(?::|\n)\s*([\s\S]+)/i);
    const forget=/^\/forget(?:-|\s+)?(?:memory|local|docs?)\b/i.test(value);
    const guide=/^\/memory-help\b/i.test(value);
    if(remember){
      const item=addLocalMemory(remember[1]);
      closeMenus();
      append('user',value,'You','',{routeProvenance:'browser-local',hostedLineage:false});
      if(input){input.value='';autosizeInput();}
      append('assistant',item?('Saved locally in this browser:\n- '+item.text):'Nothing was saved. Add text after /remember.','MMIR local memory','Memory saved · browser only · no API call',{routeProvenance:'browser-local',hostedLineage:false});
      status(item?'Memory saved locally.':'Memory was empty.','ready');
      routeStatus(item?'Memory saved · browser only · no owner cost':'Memory not saved · empty input','hosted');
      input?.focus();
      return true;
    }
    if(doc){
      const note=addLocalDocumentNote(doc[1],doc[2]);
      closeMenus();
      append('user',value,'You','',{routeProvenance:'browser-local',hostedLineage:false});
      if(input){input.value='';autosizeInput();}
      append('assistant',note?('Document note saved locally:\n- '+note.title+': '+note.text):'Nothing was saved. Use /doc Title: short note.','MMIR local documents','Document note · browser only · no API call',{routeProvenance:'browser-local',hostedLineage:false});
      status(note?'Document note saved locally.':'Document note was empty.','ready');
      routeStatus(note?'Document note · browser only · no owner cost':'Document note not saved · empty input','hosted');
      input?.focus();
      return true;
    }
    if(forget){
      writeJson(LOCAL_MEMORY_ITEMS_KEY,[]);
      writeJson(LOCAL_DOCUMENT_NOTES_KEY,[]);
      closeMenus();
      append('user',value,'You','',{routeProvenance:'browser-local',hostedLineage:false});
      if(input){input.value='';autosizeInput();}
      append('assistant','Local memory and local document notes were cleared in this browser.','MMIR local memory','Memory cleared · browser only · no API call',{routeProvenance:'browser-local',hostedLineage:false});
      status('Local memory cleared.','ready');
      routeStatus('Memory cleared · browser only','hosted');
      input?.focus();
      return true;
    }
    if(guide||isLocalMemoryQuestion(value)){
      closeMenus();
      append('user',value,'You','',{routeProvenance:'browser-local',hostedLineage:false});
      if(input){input.value='';autosizeInput();}
      append('assistant',guide?'Use /remember something important, /memory to show it, /doc Title: note to save a document note, and /forget memory to clear local memory.\n\nEverything stays in this browser unless you explicitly send it in a later prompt.':localMemoryAnswer(),'MMIR local memory','Memory recall · browser only · no API call',{routeProvenance:'browser-local',hostedLineage:false});
      status('Local memory shown.','ready');
      routeStatus('Memory recall · browser only · no owner cost','hosted');
      input?.focus();
      return true;
    }
    return false;
  }

  function fastAnswerPrompt(prompt){
    return 'Answer fast. Give the shortest useful answer, usually 1-3 concise sentences. If steps are needed, use a compact list. User request: '+String(prompt||'').trim();
  }

  function fastAnswer(){
    const input=document.getElementById('p0-input');
    const prompt=String(input?.value||'').trim();
    state.fastAnswerOnce=true;
    closeMenus();
    if(!prompt){
      status('Fast answer ready.','ready');
      routeStatus('Lightning · next answer short','hosted');
      input?.focus();
      return true;
    }
    status('Fast answer...','ready');
    routeStatus('Lightning · short answer','hosted');
    sendMessage();
    return true;
  }

  function extractCalculatorExpression(prompt){
    const raw=String(prompt||'').trim();
    const compact=raw.replace(/\s+/g,' ');
    if(/^[0-9\s.+\-*/()]+$/.test(compact)&&/\d/.test(compact))return compact.slice(0,180);
    const matches=[...raw.matchAll(/-?\d[\d\s.+\-*/()]{1,140}\d/g)]
      .map(match=>String(match[0]||'').replace(/\s+/g,' ').trim())
      .filter(value=>/\d/.test(value)&&/[+\-*/]/.test(value));
    return (matches[0]||'').slice(0,180);
  }

  function noKeyToolLabel(tool){
    const value=String(tool||'').toLowerCase();
    if(value==='calculator')return 'Verified calculator';
    if(value==='current-date-time')return 'Current time';
    if(value==='manual-source')return 'Verified source';
    return 'Verified tool';
  }

  function noKeyToolResultText(data){
    return String(
      data?.result?.result_text||
      data?.result_text||
      data?.preview?.result_text||
      ''
    ).replace(/\s+/g,' ').trim().slice(0,120);
  }

  function noKeyToolContext(data){
    return String(data?.system_context||data?.context||'').trim().slice(0,8000);
  }

  function noKeyToolReceipt(data){
    const tool=data?.tool||data?.result?.tool||'tool';
    const result=noKeyToolResultText(data);
    return [noKeyToolLabel(tool),result?'Result '+result:'context ready','no paid route'].filter(Boolean).join(' · ');
  }

  function scorecardArray(value){
    return Array.isArray(value)?value:[];
  }

  function scorecardNumber(value,digits=0){
    const number=Number(value);
    if(!Number.isFinite(number))return 0;
    const factor=10**digits;
    return Math.round(number*factor)/factor;
  }

  function scorecardSourceLabel(source){
    const id=String(source?.source_id||source?.node_id||'source').trim();
    return id
      .replace(/^external-/,'')
      .replace(/-candidate$/,'')
      .replace(/-/g,' ')
      .replace(/\b\w/g,char=>char.toUpperCase());
  }

  function intelligenceStatusAnswer(scorecard){
    const summary=scorecard?.summary||{};
    const measurement=scorecard?.measurement||{};
    const quality=scorecard?.supergeni_quality||{};
    const qualityGuards=quality.live_quality_guards||{};
    const connectionLiftGuard=qualityGuards.connection_lift||{};
    const chatQualityGuard=qualityGuards.chat_quality||{};
    const raw=measurement.raw_model_capacity||{};
    const formula=measurement.score_formula||{};
    const sources=scorecardArray(scorecard?.connected_intelligence_by_source?.sources)
      .slice()
      .sort((a,b)=>scorecardNumber(b.executable_route_count)-scorecardNumber(a.executable_route_count))
      .slice(0,8);
    const callable=scorecardNumber(summary.currently_callable_routes||measurement.live_capacity?.currently_callable_route_count);
    const visible=scorecardNumber(summary.visible_routes||measurement.live_capacity?.visible_route_count);
    const target=scorecardNumber(summary.target_routes||measurement.live_capacity?.target_route_count);
    const progress=target?scorecardNumber((callable/target)*100,1):0;
    const knownParams=scorecardNumber(summary.executable_known_parameter_billion_sum||raw.executable_known_parameter_billion_sum,1);
    const visibleParams=scorecardNumber(raw.visible_known_parameter_billion_sum||scorecard?.capacity_plan?.now?.visible_known_parameter_billion_lower_bound,1);
    const unknownCallable=scorecardNumber(summary.executable_unknown_parameter_route_count||raw.executable_unknown_parameter_route_count);
    const sourceLines=sources.length
      ? sources.map(source=>'- '+scorecardSourceLabel(source)+': '+scorecardNumber(source.executable_route_count)+' callable / '+scorecardNumber(source.visible_route_count)+' visible · '+scorecardNumber(source.executable_known_parameter_billion_sum,1)+'B known parameters').join('\n')
      : '- No source breakdown returned yet.';
    const next24=scorecard?.capacity_plan?.growth_targets?.next_24h?.callable_route_goal||scorecard?.owner_summary?.next_24h_target||'not set';
    const next7=scorecard?.capacity_plan?.growth_targets?.next_7d?.callable_route_goal||scorecard?.owner_summary?.next_7d_target||'not set';
    return [
      'Intelligence. Connected.',
      '',
      'Live connected intelligence now:',
      '- '+callable+' callable routes / '+target+' target ('+progress+'%).',
      '- '+visible+' visible routes in the pool.',
      '- Known executable parameter lower bound: '+knownParams+'B, plus '+unknownCallable+' callable routes with unknown public parameter counts.',
      '- Known visible parameter lower bound: '+visibleParams+'B.',
      '- '+scorecardNumber(summary.live_connected_sources||scorecard?.connected_intelligence_by_source?.live_source_count)+' connected sources.',
      '',
      'Connected sources:',
      sourceLines,
      '',
      'How MMIR measures intelligence:',
      '- Primary score: '+(formula.primary||'verified_connection_lift_per_prompt')+'.',
      '- Parameters are capacity metadata, not the final quality score.',
      '- A route only counts as useful when it improves correctness, ranking, grounding, calibration or answer quality.',
      '',
      'Supergeni quality guard:',
      '- '+(quality.status||'quality guard available through live scorecard')+'.',
      '- Connection-lift: '+(connectionLiftGuard.probe_set_version||measurement.connection_lift_harness?.probe_set_version||'not reported')+'; catches weak connected-intelligence synthesis.',
      '- Chat quality: '+(chatQualityGuard.probe_set_version||measurement.chat_quality_harness?.probe_set_version||'not reported')+'.',
      '- Quality endpoint: '+SUPERGENI_QUALITY_PATH+'.',
      '- Cheap quality row: no GitHub Actions, no KV writes, no paid routes.',
      '',
      'Next capacity targets:',
      '- Next 24h: '+next24+' callable routes without paid-provider enablement or Actions burn.',
      '- Next 7d: '+next7+' callable routes plus measured connection-lift.',
      '',
      scorecard?.no_paid_routes_started===false?'Cost guard: paid routes may be active.':'Cost guard: no paid routes started.'
    ].join('\n');
  }

  async function showIntelligenceStatus(){
    if(state.busy){
      status('Wait for the current answer first.','error');
      return true;
    }
    closeMenus();
    status('Checking connected intelligence...','loading');
    routeStatus('Intelligence status · read-only · no provider call','hosted');
    captureInteraction('intelligence_status_started',{path:INTELLIGENCE_SCORECARD_PATH});
    try{
      const scorecard=await fetchJson(API_URL+INTELLIGENCE_SCORECARD_PATH,{timeoutMs:9000});
      const summary=scorecard?.summary||{};
      append(
        'assistant',
        intelligenceStatusAnswer(scorecard),
        'MMIR Intelligence Status',
        [
          'Intelligence status',
          scorecardNumber(summary.currently_callable_routes||scorecard?.measurement?.live_capacity?.currently_callable_route_count)+' callable routes',
          scorecardNumber(summary.executable_known_parameter_billion_sum||scorecard?.measurement?.raw_model_capacity?.executable_known_parameter_billion_sum,1)+'B known capacity',
          'read-only',
          'no provider call'
        ].filter(Boolean).join(' · '),
        {variant:'status',actions:false}
      );
      captureInteraction('intelligence_status_ready',{
        callable_routes:scorecardNumber(summary.currently_callable_routes||scorecard?.measurement?.live_capacity?.currently_callable_route_count),
        visible_routes:scorecardNumber(summary.visible_routes||scorecard?.measurement?.live_capacity?.visible_route_count),
        connected_sources:scorecardNumber(summary.live_connected_sources||scorecard?.connected_intelligence_by_source?.live_source_count),
        no_paid_routes_started:scorecard?.no_paid_routes_started!==false
      });
      status('Intelligence status ready.','ready');
      routeStatus('Intelligence status · live fabric · no provider call','ready');
    }catch(error){
      captureInteraction('intelligence_status_failed',{reason:'scorecard_unavailable'});
      append('assistant','I could not read the live intelligence scorecard right now. Chat and Superboost can still work; try again in a moment.','MMIR Intelligence Status','Scorecard unavailable · no provider call',{variant:'status',actions:false});
      status('Intelligence status unavailable.','error');
      routeStatus('Scorecard unavailable · no provider call','error');
    }
    document.getElementById('p0-input')?.focus();
    return true;
  }

  async function previewNoKeyTool(payload,signal){
    return fetchJson(API_URL+NO_KEY_TOOL_PREVIEW_PATH,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify(payload),
      timeoutMs:12000,
      signal
    });
  }

  async function runVerifiedTool(tool){
    if(state.busy){
      status('Wait for the current answer first.','error');
      return true;
    }
    const input=document.getElementById('p0-input');
    const prompt=String(input?.value||'').trim();
    const toolId=String(tool||'').trim();
    const label=noKeyToolLabel(toolId);
    if(!prompt){
      if(toolId==='calculator'&&input){
        input.value='What is 19*37?';
        autosizeInput();
      }else if(toolId==='manual-source'&&input){
        input.value='Use this source to answer: ';
        autosizeInput();
      }else if(input){
        input.value='Use the current date and time to answer: ';
        autosizeInput();
      }
      closeMenus();
      status(label+' ready. Edit the prompt, then choose it again.','ready');
      routeStatus(label+' · needs a prompt first','hosted');
      input?.focus();
      captureInteraction('tool_context_prefill',{tool:toolId,reason:'missing_prompt'});
      return true;
    }
    let payload={tool:toolId};
    if(toolId==='calculator'){
      const expression=extractCalculatorExpression(prompt);
      if(!expression){
        status('Calculator needs a visible expression like 19*37.','error');
        routeStatus('Verified calculator · no expression found','error');
        captureInteraction('tool_context_blocked',{tool:toolId,reason:'missing_expression'});
        input?.focus();
        return true;
      }
      payload={tool:'calculator',expression};
    }else if(toolId==='current-date-time'){
      payload={tool:'current-date-time',now:new Date().toISOString()};
    }else if(toolId==='manual-source'){
      const sourceText=prompt.slice(0,4000);
      if(sourceText.length<12){
        status('Verified source needs pasted facts or a source excerpt.','error');
        routeStatus('Verified source · source text too short','error');
        captureInteraction('tool_context_blocked',{tool:toolId,reason:'source_text_too_short'});
        input?.focus();
        return true;
      }
      payload={
        tool:'manual-source',
        source_label:'composer-paste',
        source_text:sourceText
      };
    }
    closeMenus();
    status(label+' is preparing verified context...','loading');
    routeStatus(label+' · no provider call · no paid route','hosted');
    captureInteraction('tool_context_preview_started',{tool:toolId});
    try{
      const data=await previewNoKeyTool(payload);
      const systemContext=noKeyToolContext(data);
      if(!systemContext)throw new Error('empty tool context');
      writeJson(TOOL_CONTEXT_KEY,{
        savedAt:new Date().toISOString(),
        tool:toolId,
        receipt:noKeyToolReceipt(data),
        no_paid_routes_started:true,
        provider_called:false,
        context_path:SUPERBOOST_PREVIEW_PATH
      });
      captureInteraction('tool_context_preview_ready',{
        tool:toolId,
        result:noKeyToolResultText(data),
        context_path:SUPERBOOST_PREVIEW_PATH,
        no_paid_routes_started:true
      });
      status(label+' ready. Asking active routes with verified context...','ready');
      routeStatus(noKeyToolReceipt(data)+' · injected into swarm','ready');
      compareGatewayRoutes(prompt,{mode:'boost',systemContext,toolContext:data});
    }catch(error){
      status(label+' unavailable right now. Try normal chat.','error');
      routeStatus(label+' failed · no provider route started','error');
      captureInteraction('tool_context_preview_failed',{tool:toolId,reason:'preview_unavailable'});
      input?.focus();
    }
    return true;
  }

  function boostAnswer(){
    const input=document.getElementById('p0-input');
    const prompt=String(input?.value||'').trim();
    closeMenus();
    if(!prompt){
      status('Write a prompt first, then Superboost can run.','error');
      routeStatus('Boost needs a prompt','error');
      captureInteraction('tool_blocked',{tool:'boost-answer',reason:'missing_prompt'});
      input?.focus();
      return true;
    }
    if(gatewayCompareAvailable()||comparePartnerModel()){
      captureInteraction('tool_used',{tool:'boost-answer',path:gatewayCompareAvailable()?'gateway':'two-model'});
      compareLiveRoutes(prompt,comparePartnerModel(),{mode:'boost'});
      return true;
    }
    status('Checking active free routes for Boost...','loading');
    routeStatus('Boost checks route inventory · no paid route','hosted');
    refreshHostedModels().then(()=>{
      if(gatewayCompareAvailable()||comparePartnerModel()){
        captureInteraction('tool_used',{tool:'boost-answer',path:gatewayCompareAvailable()?'gateway':'two-model',after_refresh:true});
        compareLiveRoutes(prompt,comparePartnerModel(),{mode:'boost'});
        return;
      }
      status('Boost needs at least two active routes.','ready');
      routeStatus('Boost waiting for another active route · connect local or provider node','hosted');
      captureInteraction('tool_blocked',{tool:'boost-answer',reason:'needs_second_route'});
      input?.focus();
    }).catch(()=>{
      status('Boost route refresh failed.','error');
      routeStatus('Boost unavailable · route inventory unreachable','error');
      captureInteraction('tool_failed',{tool:'boost-answer',reason:'route_inventory_unreachable'});
      input?.focus();
    });
    return true;
  }

  function askAllActive(){
    const input=document.getElementById('p0-input');
    const prompt=String(input?.value||'').trim();
    closeMenus();
    if(!prompt){
      status('Write a prompt first, then Ask all active can run.','error');
      routeStatus('Ask all needs a prompt','error');
      captureInteraction('tool_blocked',{tool:'ask-all-active',reason:'missing_prompt'});
      input?.focus();
      return true;
    }
    if(gatewayCompareAvailable()||comparePartnerModel()){
      captureInteraction('tool_used',{tool:'ask-all-active',path:gatewayCompareAvailable()?'gateway':'two-model'});
      compareGatewayRoutes(prompt,{mode:'all'});
      return true;
    }
    status('Checking active routes for Ask all...','loading');
    routeStatus('Ask all checks route inventory · no paid route','hosted');
    refreshHostedModels().then(()=>{
      if(gatewayCompareAvailable()||comparePartnerModel()){
        captureInteraction('tool_used',{tool:'ask-all-active',path:gatewayCompareAvailable()?'gateway':'two-model',after_refresh:true});
        compareGatewayRoutes(prompt,{mode:'all'});
        return;
      }
      status('Ask all needs at least two active routes.','ready');
      routeStatus('Ask all waiting for another active route · connect local or provider node','hosted');
      captureInteraction('tool_blocked',{tool:'ask-all-active',reason:'needs_second_route'});
      input?.focus();
    }).catch(()=>{
      status('Ask all route refresh failed.','error');
      routeStatus('Ask all unavailable · route inventory unreachable','error');
      captureInteraction('tool_failed',{tool:'ask-all-active',reason:'route_inventory_unreachable'});
      input?.focus();
    });
    return true;
  }

  function supergeniCouncil(){
    const input=document.getElementById('p0-input');
    const prompt=String(input?.value||'').trim();
    closeMenus();
    if(!prompt){
      captureInteraction('supergeni_council_prefill',{tool:'visible-council-cta'});
      if(input){
        input.value='Council topic: ';
        autosizeInput();
      }
      status('Add a topic, then press Debate again.','ready');
      routeStatus('Supergeni Council ready · active AI routes challenge each other','ready');
      input?.focus();
      return true;
    }
    if(gatewayCompareAvailable()||comparePartnerModel()){
      captureInteraction('tool_used',{tool:'visible-supergeni-council',path:gatewayCompareAvailable()?'gateway':'two-model'});
      compareGatewayRoutes(
        'Supergeni Council: Let approved active models answer, challenge weak assumptions, then converge on one practical conclusion. Topic: '+prompt,
        {mode:'council'}
      );
      return true;
    }
    status('Checking active routes for Debate...','loading');
    routeStatus('Debate checks route inventory · no paid route','hosted');
    refreshHostedModels().then(()=>{
      if(gatewayCompareAvailable()||comparePartnerModel()){
        captureInteraction('tool_used',{tool:'visible-supergeni-council',path:gatewayCompareAvailable()?'gateway':'two-model',after_refresh:true});
        compareGatewayRoutes(
          'Supergeni Council: Let approved active models answer, challenge weak assumptions, then converge on one practical conclusion. Topic: '+prompt,
          {mode:'council'}
        );
        return;
      }
      status('Debate needs at least two active routes.','ready');
      routeStatus('Debate waiting for another active route · connect a node or provider route','hosted');
      captureInteraction('tool_blocked',{tool:'visible-supergeni-council',reason:'needs_second_route'});
      input?.focus();
    }).catch(()=>{
      status('Debate route refresh failed.','error');
      routeStatus('Debate unavailable · route inventory unreachable','error');
      captureInteraction('tool_failed',{tool:'visible-supergeni-council',reason:'route_inventory_unreachable'});
      input?.focus();
    });
    return true;
  }

  function handleToolbarTool(id){
    const tool=toolbarToolById(id);
    if(!tool)return false;
    if(tool.id==='fast-answer'){
      fastAnswer();
      return true;
    }
    if(tool.id==='stop'){
      if(state.busy)stopActiveResponse();
      else status('No active response to stop.','idle');
      return true;
    }
    if(tool.id==='fresh-start'){
      freshStart();
      return true;
    }
    if(tool.id==='discuss'){
      return runTwoModelTool('discuss-topic');
    }
    if(tool.id==='memory'){
      saveMemorySnapshot();
      return true;
    }
    return false;
  }

  function handleRouteAction(action){
    if(action==='boost-answer-live'){
      captureInteraction('tool_used',{tool:'route-ask-ai-cta',path:'composer'});
      return boostAnswer();
    }
    if(action==='supergeni-council-live'){
      captureInteraction('tool_used',{tool:'route-council-cta',path:'composer'});
      return supergeniCouncil();
    }
    if(action==='connect-local'){
      captureInteraction('tool_used',{tool:'route-connect-local-cta',path:'composer'});
      startLocalInstallAssistant();
      return true;
    }
    if(action==='check-local'){
      captureInteraction('tool_used',{tool:'route-check-local-cta',path:'composer'});
      checkLocalModels().catch(()=>{});
      return true;
    }
    if(action==='model-health'){
      captureInteraction('tool_used',{tool:'route-model-health-cta',path:'composer'});
      append('assistant',modelHealthAnswer(),'MMIR Model Health','Model health · route inventory · no provider call',{actions:false});
      status('Model health ready.','ready');
      routeStatus('Model health · active routes summarized','ready');
      document.getElementById('p0-input')?.focus();
      return true;
    }
    return false;
  }

  function handleMenuAction(action){
    const actionId=String(action||'');
    if(actionId.startsWith('pin-toolbar-tool:')||actionId.startsWith('unpin-toolbar-tool:')){
      const pinned=actionId.startsWith('pin-toolbar-tool:');
      const id=actionId.split(':')[1];
      const tool=toolbarToolById(id);
      if(!tool)return false;
      setToolbarToolPinned(id,pinned);
      renderToolbar();
      renderAddMenu();
      closeMenus();
      status((pinned?'Added ':'Removed ')+tool.label.toLowerCase()+'.','ready');
      routeStatus((pinned?'Toolbar added':'Toolbar removed')+' · browser local','hosted');
      return true;
    }
	    if(actionId.startsWith('set-privacy-mode:')){
	      setPrivacyMode(actionId.split(':')[1]);
	      return true;
	    }
	    if(actionId.startsWith('set-demo-transcript-consent:')){
	      setDemoTranscriptConsent(actionId.split(':')[1]==='on');
	      return true;
	    }
	    if(action==='model-menu'){
	      toggleMenu('model',document.getElementById('p0-add')||document.getElementById('p0-model'));
	      return true;
	    }
	    if(action==='privacy-menu'){
	      toggleMenu('privacy',document.getElementById('p0-add')||document.getElementById('p0-privacy'));
	      return true;
	    }
	    if(action==='toggle-fact-guard'){
	      setFactGuard(!factGuardActive());
	      return true;
    }
    if(action==='cycle-answer-style'){
      cycleAnswerStyle();
      return true;
    }
    if(action==='role-profile-menu'){
      renderRoleProfileMenu();
      return true;
    }
    if(action==='take-photo-local'){
      return triggerPhotoPicker('camera');
    }
    if(action==='choose-photo-local'){
      return triggerPhotoPicker('library');
    }
	    if(action==='share-location'){
	      return requestSharedLocation();
	    }
	    if(action==='voice-input'){
	      return startVoice();
	    }
    if(actionId.startsWith('set-role-profile:')){
      setRoleProfile(actionId.slice('set-role-profile:'.length));
      return true;
    }
    if(action==='cycle-model-filter'){
      cycleModelFilter();
      return true;
    }
    if(action==='model-route-controls'){
      renderRouteControlsMenu();
      return true;
    }
    if(action==='model-menu-main'){
      renderModelMenu();
      return true;
    }
    if(action==='pin-active-route'){
      setActiveRoutePinned(true);
      return true;
    }
    if(action==='unpin-active-route'){
      setActiveRoutePinned(false);
      return true;
    }
    if(action==='add-menu-main'){
      renderAddMenu();
      return true;
    }
    if(action==='intelligence-status'){
      return showIntelligenceStatus();
    }
    if(action==='prompt-presets'){
      renderPromptPresetMenu();
      refreshPromptPresets().then(()=>{
        const menu=menuEl('add');
        if(menu&&!menu.hidden)renderPromptPresetMenu();
      });
      return true;
    }
    if(action==='save-prompt-local'){
      saveCurrentPromptPreset();
      return true;
    }
    if(action==='local-memory-guide'){
      closeMenus();
      append('assistant','Use /remember something important, /memory to show it, /doc Title: note to save a local document note, and /forget memory to clear it.\n\nThis stays in this browser and does not call MMIR servers.','MMIR local memory','Memory guide · browser only · no API call');
      status('Local memory guide ready.','ready');
      routeStatus('Memory guide · browser only','hosted');
      document.getElementById('p0-input')?.focus();
      return true;
    }
    if(action==='show-local-memory'){
      closeMenus();
      append('assistant',localMemoryAnswer(),'MMIR local memory','Memory recall · browser only · no API call');
      status('Local memory shown.','ready');
      routeStatus('Memory recall · browser only · no owner cost','hosted');
      document.getElementById('p0-input')?.focus();
      return true;
    }
    if(action==='add-document-note'){
      const input=document.getElementById('p0-input');
      if(input){
        input.value='/doc Demo note: ';
        autosizeInput();
      }
      closeMenus();
      status('Document note ready.','ready');
      routeStatus('Document note · browser only until sent','hosted');
      input?.focus();
      return true;
    }
    if(action==='draft-feedback'){
      captureInteraction('feedback_draft_started',{surface:'add_menu'});
      return setPromptDraft(
        feedbackDraftPrefill(),
        'Feedback draft ready with route context.',
        'Feedback intake · edit and send · active route context included · no paid route'
      );
    }
    if(action==='feedback-inbox'){
      return openFeedbackInbox('add_menu');
    }
    if(action==='copy-feedback-triage'){
      return copyFeedbackTriagePack('add_menu');
    }
    if(String(action||'').startsWith('load-preset:')){
      loadPromptPreset(String(action).slice('load-preset:'.length));
      return true;
    }
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
    if(action==='model-health'){
      closeMenus();
      captureInteraction('tool_used',{tool:'model-health',path:'local-summary'});
      append('assistant',modelHealthAnswer(),'MMIR Model Health','Model health · route inventory · no provider call',{actions:false});
      status('Model health ready.','ready');
      routeStatus('Model health · active routes summarized','ready');
      document.getElementById('p0-input')?.focus();
      return true;
    }
    if(action==='verified-calculator'){
      return runVerifiedTool('calculator');
    }
    if(action==='verified-time'){
      return runVerifiedTool('current-date-time');
    }
    if(action==='verified-source'){
      return runVerifiedTool('manual-source');
    }
    if(action==='boost-answer-live'){
      return boostAnswer();
    }
    if(action==='ask-all-active'){
      return askAllActive();
    }
    if(action==='supergeni-council-live'){
      return supergeniCouncil();
    }
    if(action==='compare-live'||action==='best-answer-live'||action==='discuss-topic'){
      return runTwoModelTool(action);
    }
    if(action==='new-chat'){
      closeMenus();
      clearChat();
      return true;
    }
    return false;
  }

  function setActiveRoutePinned(pinned){
    const model=activeModel();
    setRoutePinned(model.id,pinned);
    renderRouteControlsMenu();
    renderToolbar();
    status((pinned?'Pinned ':'Unpinned ')+model.label+'.','ready');
    routeStatus((pinned?'Pinned route':'Route unpinned')+' · '+routeReceipt(model).text,routeReceipt(model).state);
  }

  function cycleModelFilter(){
    const value=setModelFilter(nextModelFilter());
    renderRouteControlsMenu();
    status('Model filter: '+modelFilterLabel(value)+'.','ready');
    routeStatus('Model filter · '+modelFilterLabel(value)+' · browser local','hosted');
  }

  function cycleAnswerStyle(){
    const current=answerStyle();
    const next=current==='short'?'precise':current==='precise'?'detailed':'short';
    state.answerStyle=next;
    writeAnswerStyle(next);
    renderAddMenu();
    status('Svarstil: '+answerStyleLabel(next)+'.','ready');
    routeStatus(answerStyleLabel(next)+' answers · browser local preference','hosted');
  }

  function setRoleProfile(id){
    const next=normalizeRoleProfileId(id);
    state.roleProfileId=next;
    writeRoleProfileId(next);
    renderRoleProfileMenu();
    status('Rolleprofil: '+roleProfileLabel(next)+'.','ready');
    routeStatus('Role profile · '+roleProfileLabel(next)+' · browser local preference','hosted');
  }

  async function saveCurrentPromptPreset(){
    const input=document.getElementById('p0-input');
    const prompt=String(input?.value||'').trim();
    if(!prompt){
      status('Write a prompt first, then save it.','error');
      routeStatus('Prompt preset not saved · composer empty','error');
      input?.focus();
      return;
    }
    const preset={
      id:'local-'+Date.now().toString(36),
      title:promptPresetTitle(prompt),
      detail:'Saved locally in this browser.',
      prompt_template:prompt,
      source:'browser-local'
    };
    writeSavedPromptPresets(savedPromptPresets().reverse().concat([preset]));
    status('Prompt saved locally.','ready');
    routeStatus('Prompt saved · browser only · no server persistence','hosted');
    verifyPromptSavePlan().catch(()=>{});
    renderPromptPresetMenu();
  }

  function loadPromptPreset(id){
    const preset=promptPresetById(id);
    const input=document.getElementById('p0-input');
    if(!preset||!input){
      status('Prompt preset unavailable.','error');
      routeStatus('Prompt preset unavailable','error');
      return;
    }
    input.value=preset.prompt_template;
    autosizeInput();
    closeMenus();
    status(preset.title+' loaded.','ready');
    routeStatus('Prompt preset loaded · edit and send','hosted');
    input.focus();
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

  function answerActionsAllowed(message){
    const content=String(message?.content||'').trim();
    if(message?.role!=='assistant')return false;
    if(message?.actions===false)return false;
    if(message?.command||message?.showOsChoices||message?.variant==='install')return false;
    if(!content)return false;
    if(CHAT_STATE.transient?.(content)||/^(Thinking|Synthesizing best answer)\.\.\.$/i.test(content))return false;
    return true;
  }

  function renderMessageActions(message){
    if(!answerActionsAllowed(message))return '';
    const id=safeAttr(message.id||'');
    const continuationLabel=safeText(String(message.continuationLabel||'Fortsett svaret').replace(/\s+/g,' ').trim().slice(0,44)||'Fortsett svaret');
    const compareUsefulCaptured=Boolean(message.compareUsefulCaptured);
    const compareUsefulEvidence=String(message.compareUsefulEvidenceId||'').replace(/\s+/g,' ').trim();
    const compareUsefulTitle=compareUsefulCaptured&&compareUsefulEvidence?('Useful signal saved. Evidence ID: '+compareUsefulEvidence+'. Raw prompt and answer not stored.'):'';
    return '<div class="p0-message-actions" aria-label="Svarhandlinger" data-has-status="false">'+
      (message.variant==='compare'?'<button type="button" data-p0-message-action="useful-compare" data-p0-message-id="'+id+'" aria-label="'+(compareUsefulCaptured?'Nyttig-signal er allerede lagret':'Merk sammenligningssvaret som nyttig')+'"'+(compareUsefulCaptured?' disabled data-captured="true" data-evidence-id="'+safeAttr(compareUsefulEvidence)+'" title="'+safeAttr(compareUsefulTitle)+'"':'')+'>'+(compareUsefulCaptured?'Nyttig lagret':'Nyttig')+'</button>':'')+
      (message.truncated?'<button type="button" data-p0-message-action="continue" data-p0-message-id="'+id+'" aria-label="Fortsett avkortet svar">'+continuationLabel+'</button>':'')+
      '<button type="button" data-p0-message-action="copy" data-p0-message-id="'+id+'" aria-label="Kopier svar">Kopier</button>'+
      '<button type="button" data-p0-message-action="retry" data-p0-message-id="'+id+'" aria-label="Prøv spørsmålet på nytt">Prøv igjen</button>'+
      '<button type="button" data-p0-message-action="share-safe" data-p0-message-id="'+id+'" aria-label="Kopier trygg delingskladd">Del trygt</button>'+
      '<span id="p0-action-status-'+id+'" class="p0-message-action-status" aria-live="polite"></span>'+
    '</div>';
  }

  function setMessageActionStatus(id,message,stateValue='ready'){
    const el=document.getElementById('p0-action-status-'+String(id||''));
    if(el){
      el.textContent=message||'';
      el.dataset.state=stateValue;
      const actions=el.closest('.p0-message-actions');
      if(actions)actions.dataset.hasStatus=message?'true':'false';
    }
    if(message)status(message,stateValue==='error'?'error':'ready');
  }

  async function copyMessage(message){
    const ok=await writeClipboard(message.content||'');
    setMessageActionStatus(message.id,ok?'Copied.':'Copy blocked. Select the answer manually.',ok?'ready':'error');
  }

  function retryMessage(message){
    if(state.busy){
      setMessageActionStatus(message.id,'Wait for the current answer first.','error');
      return;
    }
    const prompt=String(message.retryPrompt||previousUserMessageFor(message)?.content||'').trim();
    const input=document.getElementById('p0-input');
    if(!prompt||!input){
      setMessageActionStatus(message.id,'No original prompt to retry.','error');
      return;
    }
    input.value=prompt;
    autosizeInput();
    setMessageActionStatus(message.id,'Retrying...','ready');
    sendMessage();
  }

  function cleanContinuationPartialAnswer(content){
    return String(content||'')
      .replace(/\n\nSvarvakt:[\s\S]*$/,'')
      .trim()
      .slice(-3600);
  }

  function continueTruncatedMessage(message){
    if(state.busy){
      setMessageActionStatus(message.id,'Wait for the current answer first.','error');
      return;
    }
    const original=String(message.retryPrompt||previousUserMessageFor(message)?.content||'').trim();
    const input=document.getElementById('p0-input');
    if(!original||!input){
      setMessageActionStatus(message.id,'No prompt to continue.','error');
      return;
    }
    const suggested=String(message.continuationSuggestedMessage||'Fortsett svaret fra der det stoppet. Ikke start på nytt; fullfør med samme kontekst.').trim();
    const partial=cleanContinuationPartialAnswer(message.content);
    input.value=[
      suggested,
      'Original prompt: '+original,
      partial?'Previous partial answer to continue from:\n'+partial:''
    ].filter(Boolean).join('\n\n').slice(0,12000);
    autosizeInput();
    setMessageActionStatus(message.id,'Continuing...','ready');
    captureInteraction('continuation_requested',{
      source:message.continuationSource||'message-action',
      has_partial_answer:Boolean(partial),
      suggested_message:Boolean(message.continuationSuggestedMessage)
    });
    sendMessage();
  }

  async function shareSafeMessage(message){
    const user=previousUserMessageFor(message);
    const draft=[
      'MMIR answer draft',
      '',
      user?'Prompt: '+redactShareText(user.content):'Prompt: [not available]',
      '',
      'Answer: '+redactShareText(message.content),
      '',
      'Route: '+redactShareText(message.receipt||'MMIR')
    ].join('\n');
    writeJson(SHARE_DRAFT_KEY,{
      createdAt:new Date().toISOString(),
      messageId:message.id,
      draft
    });
    const ok=await writeClipboard(draft);
    setMessageActionStatus(message.id,ok?'Safe draft copied.':'Safe draft saved locally.',ok?'ready':'error');
  }

  function compareUsefulFeedbackSummary(receipt){
    const parts=receiptParts(receipt);
    const pick=(test)=>parts.find(part=>test.test(part))||'';
    const picks=(test)=>parts.filter(part=>test.test(part));
    const coverage=[
      pick(/^\d+\s+routes? compared$/i),
      pick(/^\d+\s+answered$/i),
      pick(/^\d+\s+quiet$/i),
      pick(/^\d+\s+live provider routes$/i),
      pick(/^\d+\s+live external nodes$/i),
      pick(/^\d+\s+queued$/i),
      pick(/^\d+\s+visible total$/i)
    ].filter(Boolean);
    return [
      pick(/^Winner:/i),
      pick(/^Score\s+\d+/i),
      pick(/^(High confidence|Medium confidence|Contested|Confidence pending)\b/i),
      coverage.length?('Coverage: '+coverage.join(' / ')):'',
      ...picks(/^(OpenRouter|NVIDIA|Google|Groq|MMIR|Supergeni)\s+live$/i).slice(0,4),
      pick(/^Why:/i)
    ].filter(Boolean).join(' · ');
  }

  function compareUsefulFeedbackTextMetadata(label,value,privacyNote){
    const text=String(value||'').trim();
    const words=(text.match(/\S+/g)||[]).length;
    return label+' metadata: '+(text?'present':'missing')+'; '+String(words)+' word(s); '+String(text.length)+' character(s); '+privacyNote;
  }

  function compareUsefulEvidenceId(prompt,answer,receipt){
    const snapshot=[
      'prompt:'+stableLocalFingerprint(prompt),
      'prompt_words:'+String((String(prompt||'').match(/\S+/g)||[]).length),
      'answer:'+stableLocalFingerprint(answer),
      'answer_chars:'+String(String(answer||'').length),
      'route:'+stableLocalFingerprint(receipt)
    ].join(';');
    return 'cmp-useful-'+stableLocalFingerprint(snapshot);
  }

  function captureCompareUsefulFeedback(message){
    if(message.compareUsefulCaptured){
      setMessageActionStatus(message.id,'Useful signal already saved.','ready');
      return true;
    }
    const user=previousUserMessageFor(message);
    const route=String(message.receipt||message.label||'compare route').replace(/\s+/g,' ').slice(0,420);
    const answer=String(message.content||'');
    const prompt=String(user?.content||'');
    const summary=compareUsefulFeedbackSummary(message.receipt);
    const evidenceId=compareUsefulEvidenceId(prompt,answer,message.receipt);
    const saved=saveFeedbackDraft(
      [
        'Compare answer marked useful.',
        'Evidence ID: '+evidenceId+'; local fingerprint only, raw prompt, answer and route payload not stored.',
        compareUsefulFeedbackTextMetadata('Prompt',prompt,'raw prompt not stored in feedback draft.'),
        summary?('Decision context: '+summary):'Decision context: [not available]',
        'Route evidence: '+route,
        compareUsefulFeedbackTextMetadata('Useful answer',answer,'raw useful answer not stored in feedback draft.'),
        'Privacy: raw prompt and useful answer content are not stored in this feedback draft.'
      ].join('\n'),
      {
        source:'p0-compare-useful-action',
        target:'compare',
        priority:'p2-demo-learning',
        lane:'L1 Frontend UX',
        title:'Compare answer useful signal',
        backlogHint:'compare-feedback-capture'
      }
    );
    if(saved){
      message.compareUsefulCaptured=true;
      message.compareUsefulEvidenceId=evidenceId;
      saveHistory();
      renderTranscript();
      requestAnimationFrame(()=>setMessageActionStatus(message.id,'Useful signal saved to Feedback Inbox. Evidence ID: '+evidenceId+'.','ready'));
    }else{
      setMessageActionStatus(message.id,'Could not save useful signal.','error');
    }
    return saved;
  }

  function handleMessageAction(action,id){
    const message=messageById(id);
    if(!message||!answerActionsAllowed(message)){
      status('Answer action is not available for this message.','error');
      return;
    }
    if(action==='copy'){
      copyMessage(message);
      return true;
    }
    if(action==='retry'){
      retryMessage(message);
      return true;
    }
    if(action==='continue'){
      continueTruncatedMessage(message);
      return true;
    }
    if(action==='share-safe'){
      shareSafeMessage(message);
      return true;
    }
    if(action==='useful-compare'&&message.variant==='compare'){
      captureCompareUsefulFeedback(message);
      return true;
    }
    return false;
  }

  function renderTranscript(){
    const root=document.getElementById('p0-transcript');
    if(!root)return;
    if(!state.messages.length){
      const local=privateModeActive()&&Boolean(bestLocalModel());
      const degraded=state.hostedRouteState==='degraded'||(privateModeActive()&&!local);
      const checking=!local&&!degraded&&state.hostedRouteState==='checking';
      const answerState=local?'local':(degraded?'degraded':(checking?'checking':'live'));
      const stateLabel=local?'Lokalt KI-svar':(degraded?'Degradert':(checking?'Sjekker live-rute':'Live KI-svar'));
      const stateDetail=local
        ? 'Svaret lages av den valgte lokale modellen.'
        : (degraded
          ? 'Live-ruten er ikke bekreftet. MMIR viser ikke et simulert svar som om det var live.'
          : (checking
            ? 'MMIR bekrefter nå den ekte modellruten. Ingen demosimulering vises som et live-svar.'
            : 'Svaret lages av en ekte modellrute, ikke av en demosimulering.'));
      root.innerHTML=''+
        '<section class="p0-first-session" data-answer-state="'+answerState+'" aria-labelledby="p0-first-session-title">'+
          '<span class="p0-first-session-state">'+safeText(stateLabel)+'</span>'+
          '<h1 id="p0-first-session-title">Hva vil du vite?</h1>'+
          '<p>Du snakker med <strong>Supergeni, en kunstig intelligens</strong> fra MMIR. Svar kan inneholde feil. Ikke lim inn sensitive personopplysninger.</p>'+
          '<small>'+safeText(stateDetail)+' Faktisk svarforfatter og eventuelle kilder vises under svaret.</small>'+
        '</section>';
      return;
    }
    root.innerHTML=state.messages.map(message=>{
      const focusAttr=answerActionsAllowed(message)?' tabindex="0"':'';
      const visibleLabel=message.role==='assistant'?canonicalBrandText(routeDisplayName({label:message.label||message.role})):'';
      const visibleContent=message.role==='assistant'?canonicalBrandText(message.content):message.content;
      const receiptHtml=message.role==='assistant'
        ? renderReceipt(message.receipt,message.proofLine,visibleLabel,message.intelligenceLabel,message.answerState,message.aiGenerated)
        : '';
      return '<article class="p0-message p0-message-'+safeText(message.role)+(message.variant?' p0-message-'+safeText(message.variant):'')+'" data-p0-message-id="'+safeAttr(message.id||'')+'"'+focusAttr+'>'+
        '<div class="p0-message-body">'+renderMessageBody(message,visibleContent)+'</div>'+
        receiptHtml+
        renderMessageActions(message)+
      '</article>';
    }).join('');
    requestAnimationFrame(()=>{root.scrollTop=root.scrollHeight;});
  }

  function renderAll(){
    renderToolbar();
    renderTranscript();
    renderModelMenu();
    renderTokenCounter();
    renderFeedbackCaptureStatus();
    updateDraftState();
  }

  function status(message,stateValue='idle'){
    const el=document.getElementById('p0-status');
    if(!el)return;
    const full=String(message||'').trim();
    el.textContent=compactStatusText(full)||full;
    el.title=full;
    el.setAttribute('aria-label',full);
    el.dataset.state=stateValue;
  }

  function routeStatus(message,stateValue='hosted'){
    const el=document.getElementById('p0-route');
    if(!el)return;
    el.dataset.state=stateValue;
    renderMicroStatus(el,message||routeMicroStatus(),stateValue);
  }

  function saveHistory(){
    if(superPrivateModeActive())return;
    writeHistorySchema();
    writeHistoryJson(state.messages.slice(-MAX_HISTORY));
  }

  function append(role,content,label,receipt,meta={}){
    const message=normalizeAnswerTruth({
      id:meta.id||makeMessageId(),
      role,
      content:String(content||''),
      label:role==='assistant'?routeDisplayName({label:label||role}):(label||role),
      receipt:receipt||'',
      proofLine:meta.proofLine||null,
      intelligenceLabel:meta.intelligenceLabel||'',
      answerWriter:meta.answerWriter||null,
      answerState:meta.answerState||'',
      ...(Object.prototype.hasOwnProperty.call(meta,'aiGenerated')?{aiGenerated:Boolean(meta.aiGenerated)}:{}),
      variant:meta.variant||'',
      command:meta.command||'',
      commandLabel:meta.commandLabel||'',
      installOs:meta.installOs||'',
      showOsChoices:Boolean(meta.showOsChoices),
      actions:meta.actions===false?false:true,
      retryPrompt:meta.retryPrompt||'',
      continuationLabel:meta.continuationLabel||'',
      continuationSuggestedMessage:meta.continuationSuggestedMessage||'',
      continuationSource:meta.continuationSource||'',
      routeProvenance:String(meta.routeProvenance||'ui-local'),
      hostedLineage:meta.hostedLineage===true,
      ...(meta.hostedDeliveryState?{hostedDeliveryState:String(meta.hostedDeliveryState)}:{}),
      createdAt:new Date().toISOString()
    });
    state.messages.push(message);
    state.messages=state.messages.slice(-MAX_HISTORY);
    saveHistory();
    renderTranscript();
    scheduleDemoTranscriptCapture('message_appended',{
      role:message.role,
      variant:message.variant||''
    });
    return message;
  }

  function updateMessage(message,content,updates={}){
    message.content=String(content||'');
    Object.assign(message,updates);
    Object.assign(message,normalizeAnswerTruth(message));
    saveHistory();
    renderTranscript();
    scheduleDemoTranscriptCapture('message_updated',{
      role:message.role,
      variant:message.variant||'',
      truncated:Boolean(message.truncated)
    });
  }

  function startSlowResponseNotice(message,{content=CHAT_STATE.slow?.()||'Jobber fortsatt. Dette tar litt lengre tid enn vanlig.',statusText='Supergeni jobber fortsatt …',routeText='Jobber fortsatt · forespørselen er aktiv'}={}){
    let shown=false;
    const timer=window.setTimeout(()=>{
      if(shown||!state.busy||stopRequested)return;
      if(!state.messages.includes(message))return;
      shown=true;
      updateMessage(message,content,{slowNotice:true});
      status(statusText,'ready');
      routeStatus(routeText,'ready');
    },SLOW_RESPONSE_NOTICE_MS);
    return ()=>{
      window.clearTimeout(timer);
    };
  }

  function clearChat(){
    state.messages=[];
    clearWriterContinuityState();
    lastDemoTranscriptHash='';
    clearTimeout(demoTranscriptTimer);
    saveHistory();
    renderTranscript();
    status('New chat ready.','ready');
    document.getElementById('p0-input')?.focus();
  }

  function renderReleaseReadiness(){
    const warning=document.getElementById('p0-release-warning');
    if(!warning)return;
    const readiness=state.releaseReadiness||blockedReleaseReadiness();
    if(readiness.hostedReady===true){
      warning.hidden=true;
      warning.dataset.state='ready';
      return;
    }
    warning.hidden=false;
    warning.dataset.state=readiness.state==='checking'?'checking':'blocked';
    warning.innerHTML=''+
      '<div><strong>Offentlig svarbane er ikke produksjonsgrønn.</strong><span>Svar kan feile eller være feil. Ikke bruk sensitiv informasjon eller høyrisikoformål i denne testversjonen.</span></div>'+
      '<a href="./tillit/">Se tillit og driftsbevis</a>';
  }

  function selectedRouteReady(){
    const model=activeModel();
    if(model?.route==='local')return localModelReady(model);
    return Boolean(model&&model.executable!==false&&model.selectable!==false&&hostedModelLiveVerified(model)&&hostedJourneyReady('first_chat'));
  }

  async function revalidateHostedBoundary(journey='first_chat',model=null,{force=false}={}){
    if(force||!releaseReadinessFresh()){
      const refreshResult=await refreshHostedModels();
      // A newer readiness request owns the truth now. Never reuse an older
      // green snapshot while that newer request is still unresolved.
      if(refreshResult?.stale===true)return null;
    }
    if(!hostedJourneyReady(journey))return null;
    return model?matchingLiveHostedModel(model):true;
  }

  async function ensureHostedJourneyReady(journey='first_chat',model=null){
    if(await revalidateHostedBoundary(journey,model,{force:true}))return true;
    const label=journey==='compare'?'Sammenligning':(journey==='swarm_preview'?'Sverm':'Offentlig chat');
    status(label+' er blokkert til ferskt produksjonsbevis er grønt.','error');
    routeStatus('Ikke produksjonsklar · ingen hosted-rute startet','error');
    captureInteraction('chat_blocked',{reason:'hosted_release_not_ready',journey,provider_called:false});
    renderReleaseReadiness();
    updateSendControl();
    return false;
  }

  function updateSendControl(){
    const send=document.getElementById('p0-send');
    if(!send)return;
    const canSend=selectedRouteReady();
    send.disabled=Boolean(!state.busy&&!canSend);
    send.classList.toggle('is-stopping',state.busy);
    send.dataset.state=state.busy?'stopping':(canSend?'send':'blocked');
    send.textContent=state.busy?'■':'↑';
    const blockedLabel=activeModel()?.route==='local'?'Lokal modell er ikke verifisert klar':'Offentlig svarbane er ikke produksjonsklar';
    send.setAttribute('aria-label',state.busy?'Stopp gjeldende svar':(canSend?'Send melding':blockedLabel));
    send.setAttribute('title',state.busy?'Stopp':(canSend?'Send':blockedLabel));
    renderSuperboostCta();
    updatePinnedToolbarToolStates();
  }

  function beginResponse(){
    stopRequested=false;
    noteAnswerProof(null);
    activeChatController=new AbortController();
    state.busy=true;
    updateSendControl();
    return activeChatController.signal;
  }

  function finishResponse(){
    state.busy=false;
    activeChatController=null;
    updateSendControl();
    const route=document.getElementById('p0-route');
    if(route)renderMicroStatus(route,route.getAttribute('aria-label')||route.title||route.textContent,route.dataset.state||'hosted');
  }

  function stopActiveResponse(){
    if(!state.busy||!activeChatController)return;
    stopRequested=true;
    activeChatController.abort();
    status('Stopping response...','loading');
    routeStatus('Stopping · current route cancelled','hosted');
    updateSendControl();
  }

  function responseText(payload){
    return String(payload?.choices?.[0]?.message?.content||payload?.content||payload?.message||'').trim();
  }

  function responseFinishReason(payload){
    return String(
      payload?.choices?.[0]?.finish_reason||
      payload?.finish_reason||
      payload?.mmir?.receipt?.finish_reason||
      payload?.mmir?.route_receipt?.finish_reason||
      payload?.route_receipt?.finish_reason||
      payload?.receipt?.finish_reason||
      ''
    );
  }

  function responseIsTruncated(payload){
    const receipt=responseReceiptEnvelope(payload);
    return Boolean(
      payload?.continuation?.needed||
      payload?.continuation?.display||
      payload?.answer_truncated||
      payload?.completion_truncated||
      payload?.mmir?.receipt?.completion_truncated||
      payload?.mmir?.route_receipt?.completion_truncated||
      payload?.route_receipt?.completion_truncated||
      payload?.receipt?.completion_truncated||
      receipt.completion_truncated||
      /length|max[_-]?tokens?|token_limit|output_limit|truncated/i.test(responseFinishReason(payload))
    );
  }

  function truncationGuardNote(){
    return '\n\nSvarvakt: dette svaret stoppet ved token-/lengdegrensen. Trykk Fortsett svaret for å fortsette uten å gjenta starten.';
  }

  function withTruncationGuard(answer,payload){
    const text=String(answer||'').trim();
    if(!responseIsTruncated(payload)||text.includes('Svarvakt:'))return text;
    return text+truncationGuardNote();
  }

  function gatewayContinuationContract(data){
    const continuation=data?.continuation||data?.superboost?.continuation||data?.best_answer?.continuation||null;
    if(!continuation||continuation.object!=='mmir.answer_continuation')return null;
    return continuation;
  }

  function gatewayContinuationNeeded(data){
    const continuation=gatewayContinuationContract(data);
    return Boolean(continuation&&(continuation.needed===true||continuation.display===true));
  }

  function gatewayContinuationActionLabel(data){
    const label=String(gatewayContinuationContract(data)?.user_action_label||'').replace(/\s+/g,' ').trim();
    return (label||'Fortsett svaret').slice(0,44);
  }

  function gatewayContinuationSuggestedMessage(data){
    const message=String(gatewayContinuationContract(data)?.suggested_user_message||'').trim();
    return message.slice(0,500);
  }

  function gatewayDataTruncated(data){
    if(gatewayContinuationNeeded(data))return true;
    if(responseIsTruncated(data?.best_answer))return true;
    if((Array.isArray(data?.data)?data.data:[]).some(responseIsTruncated))return true;
    return (Array.isArray(data?.route_attempts)?data.route_attempts:[]).some(responseIsTruncated);
  }

  function chatPayloadContent(value,max=1800){
    return String(value||'')
      .replace(/\r/g,'')
      .replace(/\n{4,}/g,'\n\n\n')
      .trim()
      .slice(0,max);
  }

  function hostedConversationHistory(){
    const lineage=(Array.isArray(state.messages)?state.messages:[])
      .filter(hostedLineageEligible)
      .filter(message=>!message.command&&!message.showOsChoices&&message.variant!=='install')
      .filter(message=>{
        const content=String(message.content||'').trim();
        if(!content)return false;
        if(message.role==='assistant'&&(CHAT_STATE.transient?.(content)||/^(Thinking|Comparing active routes|Synthesizing best answer|Opening Feedback Inbox|Registrerer feedback|Response stopped)/i.test(content)))return false;
        return true;
      })
      .map(message=>({
        role:message.role,
        content:chatPayloadContent(message.content,message.role==='assistant'?1600:1100)
      }));
    return boundedChatMessageTail(lineage,{maxMessages:MAX_HISTORY,maxBytes:72*1024});
  }

  function hostedConversationMemoryContext(history){
    const prior=[...history].reverse();
    const previousUser=prior.find(message=>message.role==='user'&&String(message.content||'').trim())||null;
    const previousAssistant=prior.find(message=>message.role==='assistant'&&String(message.content||'').trim())||null;
    if(!previousUser&&!previousAssistant)return '';
    return [
      'Conversation memory: The user may ask short follow-up questions. Resolve pronouns and phrases like "det", "den", "dette", "hva med", "hvor lang tid", "hvor langt", "tilbake" and "samme" from the previous turn when safe. If context is ambiguous, say what you are using as context before answering.',
      previousUser?('Previous user question: '+chatPayloadContent(previousUser.content,800)):'',
      previousAssistant?('Previous assistant answer: '+chatPayloadContent(previousAssistant.content,1000)):''
    ].filter(Boolean).join('\n');
  }

  function mediaChatContent(prompt,media){
    const text=chatPayloadContent(prompt,1800)||'Hva kan du se i bildet?';
    if(!media?.data_url)return text;
    return [
      {type:'text',text},
      {type:'image_url',image_url:{url:media.data_url}}
    ];
  }

  function hostedConversationMessages(prompt,systemPrompt,media=null,displayPrompt=''){
    const currentUserContent=chatPayloadContent(prompt,1800);
    const displayUserContent=chatPayloadContent(displayPrompt,1800);
    const history=hostedConversationHistory();
    if(history.length&&history[history.length-1].role==='user'&&(history[history.length-1].content===currentUserContent||history[history.length-1].content===displayUserContent))history.pop();
    if(history.length&&history[history.length-1].role==='user'){
      const previousUserContent=String(history[history.length-1].content||'').trim();
      if(currentUserContent.startsWith('Answer fast. ')&&currentUserContent.endsWith('User request: '+previousUserContent))history.pop();
    }
    const memoryContext=hostedConversationMemoryContext(history);
    return [
      {role:'system',content:[systemPrompt,memoryContext].filter(Boolean).join('\n\n')},
      ...history,
      {role:'user',content:mediaChatContent(currentUserContent,media)}
    ];
  }

  function hostedPayload(prompt,model=defaultHostedModel(),media=null,displayPrompt=''){
    const factGuard=factGuardActive()
      ? ' If current facts are uncertain, say you need verification instead of guessing.'
      : '';
    const modelId=String(model?.model||model?.id||'mmir-supergenius').trim()||'mmir-supergenius';
    const directWriter=!isCanonicalHostedModel(model);
    const systemPrompt=(directWriter
      ? 'You are the language model selected by the user inside MMIR. Answer directly and usefully. '+roleProfileInstruction()+' '+answerStyleInstruction()+factGuard+' Do not claim to be Supergeni or MMIR unless asked about the route.'
      : 'You are Supergeni, the default assistant on MMIR.ai. Answer directly and usefully. '+roleProfileInstruction()+' '+answerStyleInstruction()+factGuard+' Do not turn ordinary chats into setup support unless asked.')+explicitGroundingInstruction(prompt);
    return {
      model:modelId,
      messages:hostedConversationMessages(prompt,systemPrompt,media,displayPrompt),
      stream:false,
      temperature:0.7,
      max_tokens:answerTokenBudget()
    };
  }

  function localPayload(prompt,model){
    const factGuard=factGuardActive()&&wantsPublicFactRoute(prompt)?
      ' Current or public factual questions may be stale in local models; say that you may be outdated instead of guessing if you are not certain.':'';
    return {
      model:model.model,
      messages:[
        {role:'system',content:'You are connected through MMIR Local Connector. Answer directly. '+roleProfileInstruction()+' '+answerStyleInstruction()+factGuard+explicitGroundingInstruction(prompt)},
        {role:'user',content:prompt}
      ],
      stream:false,
      temperature:0.7,
      max_tokens:answerTokenBudget()
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

  function hostedFallbackAllowedForLocalFailure(originalPrompt,routePrompt){
    return !(
      privateModeActive()||
      wantsPrivateRoute(originalPrompt)||
      wantsPrivateRoute(routePrompt)||
      localModelMentioned(originalPrompt)
    );
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
      return {mode:'single',model:defaultHostedModel(),reason:'Mention: Supergeni',prompt:cleaned};
    }
    return null;
  }

  function cleanComparePrompt(prompt){
    return String(prompt||'')
      .replace(/@supergeni(?:us|ous)|@super|@hosted|@gemma3?|@qwen|@llama|@local|@private/gi,'')
      .replace(/\s+/g,' ')
      .trim();
  }

  async function chatHostedData(prompt,signal,model=defaultHostedModel(),media=null,displayPrompt='',options={}){
    const verifiedModel=await revalidateHostedBoundary('first_chat',model);
    if(!verifiedModel){
      const error=new Error('Hosted release is not production-ready.');
      error.code='hosted_release_not_ready';
      throw error;
    }
    model=verifiedModel;
    const continuityEnabled=options.writerContinuity===true&&!media&&!privateModeActive();
    const previousState=continuityEnabled?normalizedWriterContinuityState(writerContinuityState):null;
    let payload=sanitizedChatPayload(hostedPayload(prompt,model,media,displayPrompt));
    const continuityPlan=continuityEnabled
      ? writerContinuityRequestPlan(payload,writerContinuityState)
      : {payload,applied:false,reason:'disabled',limit_bytes:96*1024};
    payload=continuityPlan.payload;
    const continuityApplied=continuityPlan.applied===true;
    const requestContinuityReset=continuityEnabled&&continuityPlan.reason==='continuity-payload-limit-exceeded';
    if(continuityEnabled&&writerContinuityState&&!continuityApplied)clearWriterContinuityState();
    const response=await fetchJson(API_URL+CHAT_PATH,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify(payload),
      timeoutMs:45000,
      signal
    });
    const capturePlan=continuityEnabled
      ? captureWriterContinuity(payload,response,continuityApplied?previousState:null)
      : null;
    const responseContinuityReset=capturePlan?.reason==='continuity-payload-limit-exceeded';
    const continuityReset=requestContinuityReset||responseContinuityReset;
    const continuityResetReason=requestContinuityReset?continuityPlan.reason:capturePlan?.reason;
    const continuityResetLimit=requestContinuityReset?continuityPlan.limit_bytes:capturePlan?.limit_bytes;
    const data=continuityReset&&response&&typeof response==='object'&&!Array.isArray(response)
      ? {
          ...response,
          mmir:{
            ...(response.mmir&&typeof response.mmir==='object'&&!Array.isArray(response.mmir)?response.mmir:{}),
            client_writer_continuity:{
              object:'mmir.client_writer_continuity',
              status:'reset',
              reason:continuityResetReason,
              phase:requestContinuityReset?'request':'response',
              limit_bytes:continuityResetLimit,
              receipt_echoed:continuityApplied
            }
          }
        }
      : response;
    return data;
  }

  async function chatVisionPreviewData(prompt,signal,media){
    if(!await revalidateHostedBoundary('first_chat')){
      const error=new Error('Hosted release is not production-ready.');
      error.code='hosted_release_not_ready';
      throw error;
    }
    const systemPrompt='You are Supergeni using MMIR protected vision. Answer in Norwegian. Be concrete about what the image shows, but say when visual details are uncertain. Never reveal raw image bytes.';
    const payload={
      vision_consent:true,
      messages:hostedConversationMessages(prompt,systemPrompt,media),
      max_tokens:answerTokenBudget(),
      temperature:0.2
    };
    return fetchJson(API_URL+VISION_PREVIEW_PATH,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify(payload),
      timeoutMs:80000,
      signal
    });
  }

  async function chatHosted(prompt,signal,model=defaultHostedModel()){
    const data=await chatHostedData(prompt,signal,model);
    return responseText(data)||((model?.label||'Hosted route')+' returned an empty response.');
  }

  function responseConnectGuide(data){
    const guide=data?.mmir?.connect_guide||data?.connect_guide||null;
    return guide&&guide.object==='mmir.connect_guide'?guide:null;
  }

  function connectGuideMessageUpdates(guide){
    if(!guide)return {};
    if(guide.intent==='connect_node'){
      const command=String(guide.commands?.[0]?.command||'').trim();
      return command?{
        variant:'install',
        command,
        commandLabel:'Copy install command',
        installOs:detectInstallOs(),
        actions:false
      }:{actions:false};
    }
    return {actions:false};
  }

  function connectGuideStatusText(guide){
    if(guide?.intent==='connect_node')return 'Local connector command ready.';
    if(guide?.intent==='connect_llm')return 'Provider-node setup ready.';
    return '';
  }

  function connectGuideRouteText(guide){
    if(guide?.intent==='connect_node')return 'Copy install command · local setup';
    if(guide?.intent==='connect_llm')return 'Provider node setup · mmir-node-[name] · no browser secrets';
    return '';
  }

  async function chatLocal(prompt,model,signal){
    allowLocalProbes('p0-local-chat',120000);
    const token=await pairLocal();
    const data=await fetchJson(LOCAL_URL+CHAT_PATH,{
      method:'POST',
      headers:localHeaders(token),
      body:JSON.stringify(localPayload(prompt,model)),
      timeoutMs:60000,
      signal
    });
    return responseText(data)||'Local model returned an empty response.';
  }

  async function chatRoute(prompt,model,signal){
    return model?.route==='local'
      ? chatLocal(prompt,model,signal)
      : chatHosted(prompt,signal,model);
  }

  function explicitGroundingInstruction(prompt){
    const normalizedPrompt=String(prompt||'');
    const groundingPrompt=normalizedPrompt.replace(/\b(?:open[- ]source (?:models?|software|licenses?)|source code)\b/gi,'');
    const asksForBasis=/\b(source|sources|citation|citations|evidence|basis|based on|grounded|what (?:is|are) your sources?|what (?:are|is) you basing (?:this|that|(?:your )?answer) on|what supports (?:this|that|it)|what makes you say (?:this|that)|why (?:do you think (?:this|that|so)|should i believe you)|prove (?:this|that|it)|(?:can|could) you verify (?:this|that|it|the claim)|how can i verify (?:this|that|it|the claim)|is (?:this|that|it) true|are you (?:really )?sure(?: about (?:this|that|it))?(?=[?.!,;:]|$)|how (?:certain|confident|sure) are you(?: about (?:this|that|it))?(?=[?.!,;:]|$)|kilde|kilder|kilden(?: din)?|kildene(?: dine)?|henvisning|henvisninger|belegg|grunnlag|hva er (?:kilden din|kildene dine)|hva baserer du (?:det(?:te)?|svaret(?: ditt)?) på|hva støtter (?:det(?:te)?|(?:denne )?påstanden)|hva får deg til å si (?:det(?:te)?|dette her)|hvorfor (?:mener du (?:det(?:te)?|det er slik)|skal jeg tro på deg)|bevis (?:det(?:te)?|påstanden)|kan du verifisere (?:det(?:te)?|påstanden)|hvordan kan jeg verifisere (?:det(?:te)?|påstanden)|stemmer (?:det(?:te)?)|er (?:det(?:te)?) sant|er du (?:helt )?sikker(?: på det(?:te)?)?(?=[?.!,;:]|$)|hvor (?:sikker|trygg) er du(?: på det(?:te)?)?(?=[?.!,;:]|$)|bygger du (?:svaret(?: ditt)? )?på|basert på|hvor (?:har du (?:det(?:te)?|informasjonen) fra|kommer (?:det(?:te)?|informasjonen) fra|fant du (?:det(?:te)?|informasjonen))|hvordan vet du (?:det(?:te)?|dette her)|kan du dokumentere (?:det(?:te)?|dette her)|where (?:(?:is|was) (?:this|that|the information)|did you get (?:this|that|the information)|does (?:this|that|the information) come) from|how do you know (?:this|that)|can you back (?:this|that|it) up)(?=\s|[?.!,;:]|$)/i.test(groundingPrompt);
    if(!asksForBasis)return '';
    return ' The user explicitly asked for the answer basis. Name the available sources or evidence. If no sources are attached, say that plainly and distinguish product knowledge from verified live evidence; never imply source grounding that is absent.';
  }

  function compareApiPayload(prompt){
    const factGuard=factGuardActive()
      ? ' If current facts are uncertain, prefer the verified/fresher route and say when verification is needed.'
      : '';
    const systemPrompt='You are Supergeni inside MMIR Best Answer. '+roleProfileInstruction()+' '+answerStyleInstruction()+factGuard+explicitGroundingInstruction(prompt)+' Keep route/source/privacy proof in receipts/status, not in the main answer unless asked.';
    return {
      model:'supergeni',
      messages:hostedConversationMessages(prompt,systemPrompt),
      stream:false,
      temperature:0.4,
      max_tokens:answerTokenBudget()
    };
  }

  function attemptProviderLabel(attempt){
    const receipt=attempt?.receipt||{};
    const model=String(
      attempt?.model_display_name||
      receipt.model_display_name||
      attempt?.model_id||
      receipt.model_id||
      ''
    ).trim();
    if(model&&!/^supergeni$/i.test(model)){
      return routeDisplayName({display_name:model,id:model});
    }
    const provider=String(attempt?.provider||receipt.provider||'').trim();
    if(provider&&provider!=='mmir')return providerLabel(provider);
    return routeDisplayName({display_name:model||'Supergeni',id:model||'supergeni'});
  }

  function compareAttemptSummary(attempt){
    const latency=Number(attempt?.latency_ms)||Number(attempt?.receipt?.latency_ms)||0;
    const truncated=attempt?.answer_truncated===true||attempt?.receipt?.completion_truncated===true;
    return [
      attemptProviderLabel(attempt),
      latency?formatDuration(latency):'',
      typeof attempt?.score==='number'?'Score '+attempt.score:'',
      compareAttemptReason(attempt),
      truncated?'truncated':''
    ].filter(Boolean).join(' ');
  }

  function compareAttemptReason(attempt){
    const rawReason=String(attempt?.reason||attempt?.receipt?.reason||attempt?.ranking_reason||attempt?.score_reason||'')
      .replace(/[_-]+/g,' ')
      .trim();
    const parts=[];
    if(rawReason&&!/^(succeeded|ok|complete)$/i.test(rawReason))parts.push(rawReason);
    const answerClass=String(attempt?.answer_class||attempt?.receipt?.answer_class||'').replace(/[_-]+/g,' ').trim();
    if(answerClass&&answerClass!=='unknown'&&!parts.some(part=>part.toLowerCase().includes(answerClass.toLowerCase()))){
      parts.push(answerClass==='complete'?'complete answer':answerClass);
    }
    const latencyClass=String(attempt?.latency_class||attempt?.receipt?.latency_class||'').replace(/[_-]+/g,' ').trim();
    if(latencyClass&&latencyClass!=='unknown'&&!parts.some(part=>part.toLowerCase().includes(latencyClass.toLowerCase()))){
      parts.push(latencyClass);
    }
    return parts.slice(0,2).join(', ');
  }

  function gatewayWinnerAttempt(data,best){
    const attempts=(Array.isArray(data?.route_attempts)?data.route_attempts:[]).filter(attempt=>attempt?.status==='succeeded');
    if(!attempts.length)return null;
    const bestModel=String(best?.model_id||best?.receipt?.model_id||'').trim().toLowerCase();
    const bestProvider=String(best?.receipt?.provider||best?.provider||'').trim().toLowerCase();
    const matched=attempts.find(attempt=>{
      const model=String(attempt?.model_id||attempt?.receipt?.model_id||'').trim().toLowerCase();
      const provider=String(attempt?.provider||attempt?.receipt?.provider||'').trim().toLowerCase();
      return (bestModel&&model===bestModel)||(bestProvider&&provider===bestProvider&&(!bestModel||model.includes(bestModel)||bestModel.includes(model)));
    });
    if(matched)return matched;
    return attempts.slice().sort((a,b)=>(Number(b?.score)||0)-(Number(a?.score)||0))[0]||null;
  }

  function gatewayWinnerReason(data,best){
    const attempt=gatewayWinnerAttempt(data,best);
    return compareAttemptReason(attempt);
  }

  function compareAttemptIssueSummary(attempt){
    const reason=String(attempt?.blocker||attempt?.route_state||attempt?.reason||attempt?.status||'blocked')
      .replace(/[_-]+/g,' ')
      .trim();
    return [
      attemptProviderLabel(attempt),
      'blocked',
      reason&&!/^blocked$/i.test(reason)?reason:''
    ].filter(Boolean).join(' ');
  }

  function allAnswerRouteLabel(response){
    const receipt=responseReceiptEnvelope(response);
    const provider=String(receipt.provider||response?.provider||'').trim().toLowerCase();
    const model=String(receipt.model_display_name||receipt.model_id||response?.model_display_name||response?.model||'').trim();
    if(provider==='mmir')return model&&/supergeni/i.test(model)?'Supergeni':'Supergeni'+(model?' · '+model:'');
    if(provider)return providerLabel(provider)+(model?' · '+model:'');
    return model||'Route';
  }

  function allAnswerText(text,limit=900){
    const clean=String(text||'').replace(/\s+/g,' ').trim();
    if(!clean)return 'answered';
    return clean.length>limit?clean.slice(0,limit-3).trim()+'...':clean;
  }

  function gatewayCompareResponseLine(response,index){
    const receipt=responseReceiptEnvelope(response);
    const latency=Number(response?.latency_ms)||Number(receipt.latency_ms)||0;
    const answer=allAnswerText(responseText(response));
    const truncated=receipt.completion_truncated===true||/length|max[_-]?tokens?|token_limit|output_limit/i.test(String(response?.choices?.[0]?.finish_reason||receipt.finish_reason||''));
    return String(index+1)+'. '+allAnswerRouteLabel(response)+(latency?' in '+formatDuration(latency):'')+(truncated?' · truncated':'')+': '+answer;
  }

  function gatewayCompareBlockedLine(item){
    const label=attemptProviderLabel({
      provider:item?.provider||item?.receipt?.provider,
      model_display_name:item?.model_display_name||item?.receipt?.model_display_name,
      model_id:item?.model_id||item?.receipt?.model_id
    });
    const reason=String(item?.reason||item?.blocker||item?.route_state||item?.status||'not active').replace(/[_-]+/g,' ').trim();
    return '- '+label+': '+reason;
  }

  function gatewayPool(data){
    return data?.intelligence_pool||data?.pool||{};
  }

  function gatewayRouteCount(data){
    const pool=gatewayPool(data);
    const attempts=Array.isArray(data?.route_attempts)?data.route_attempts:[];
    return Math.max(
      Number(pool.active_public_provider_route_count)||0,
      Number(data?.active_public_provider_route_count)||0,
      Number(pool.route_attempt_count)||0,
      Number(data?.candidate_count)||0,
      attempts.length
    );
  }

  function gatewayAnswerCount(data){
    const pool=gatewayPool(data);
    const attempts=Array.isArray(data?.route_attempts)?data.route_attempts:[];
    const responses=Array.isArray(data?.data)?data.data.filter(response=>responseText(response)).length:0;
    return Math.max(
      Number(pool.successful_public_provider_route_count)||0,
      Number(data?.successful_public_provider_route_count)||0,
      Number(pool.active_answer_route_count)||0,
      attempts.filter(attempt=>attempt?.status==='succeeded').length,
      responses
    );
  }

  function gatewayVisibleBlockedCount(data){
    const pool=gatewayPool(data);
    const attempts=Array.isArray(data?.route_attempts)?data.route_attempts:[];
    return Math.max(
      attempts.filter(attempt=>attempt?.status&&attempt.status!=='succeeded').length,
      Array.isArray(data?.blocked_candidates)?data.blocked_candidates.length:0,
      Number(pool.blocked_candidate_count)||0,
      Number(data?.blocked_candidate_count)||0
    );
  }

  function gatewayQuietCount(data){
    const pool=gatewayPool(data);
    const quiet=Number(pool.quiet_blocked_candidate_count)||Number(data?.quiet_blocked_candidate_count)||0;
    const total=Number(pool.total_blocked_candidate_count)||Number(data?.total_blocked_candidate_count)||0;
    const visible=gatewayVisibleBlockedCount(data);
    return Math.max(quiet,total-visible,0);
  }

  function gatewayConsensusConfidence(data){
    const best=data?.best_answer||{};
    const consensus=data?.consensus_confidence||best?.consensus_confidence||data?.scoring?.consensus_confidence||null;
    if(!consensus||consensus.object!=='mmir.consensus_confidence')return null;
    const status=String(consensus.status||'').trim().toLowerCase();
    const agreement=consensus.agreement||{};
    const agree=Number(agreement.agree_count)||0;
    const total=Number(agreement.total)||0;
    const ratioText=agree&&total?(' - '+String(agree)+'/'+String(total)+' routes agree'):'';
    const fallback=status==='high'
      ? 'High confidence'+ratioText
      : (status==='medium'
        ? 'Medium confidence'+ratioText
        : (status==='split'||consensus.contested===true
          ? 'Contested - models disagree'
          : 'Confidence pending'));
    const label=String(consensus.public_ui_label||fallback)
      .replace(/\s+/g,' ')
      .trim()
      .slice(0,90);
    return {
      status,
      contested:status==='split'||consensus.contested===true,
      label:label||fallback
    };
  }

  function gatewayConsensusAnswerNotice(data){
    const consensus=gatewayConsensusConfidence(data);
    if(!consensus?.contested)return '';
    return 'Models disagree on this. Treat the answer as provisional and open Details for the route evidence.';
  }

  function gatewayFusionAnalysis(data){
    const analysis=data?.fusion_analysis||data?.best_answer?.fusion_analysis||data?.mmir?.fusion_analysis||null;
    return analysis&&analysis.object==='mmir.supergeni_fusion_analysis'?analysis:null;
  }

  function gatewayFusionReceiptLine(data){
    const analysis=gatewayFusionAnalysis(data);
    if(!analysis||analysis.status!=='analysis_ready')return '';
    const pool=gatewayPool(data);
    const lift=pool?.connection_lift||data?.connection_lift||null;
    const support=Number(analysis?.consensus?.supporting_route_count)||0;
    const independent=Number(analysis.independent_answer_count)||gatewayAnswerCount(data)||0;
    const providers=Number(analysis.independent_provider_or_node_count)||0;
    const unique=Array.isArray(analysis.unique_insight_routes)?analysis.unique_insight_routes.length:0;
    const blind=Array.isArray(analysis.blind_spots)?analysis.blind_spots.length:0;
    const blocked=Number(analysis?.partial_coverage?.blocked_candidate_count)||0;
    const judge=String(analysis.judge||'').replace(/\s+/g,' ').trim();
    const parts=[
      'Fusion analysis',
      support&&independent?('support '+String(support)+'/'+String(independent)):'',
      providers?String(providers)+' sources':'',
      lift?.measured&&typeof lift.lift_score==='number'?('connection lift '+(lift.lift_score>0?'+':'')+String(lift.lift_score)):'',
      unique?String(unique)+' unique insight routes':'',
      blind?String(blind)+' blind spots':'',
      blocked?String(blocked)+' partial routes':'',
      judge?('judge '+judge):''
    ];
    return parts.filter(Boolean).join(' ');
  }

  function withConsensusAnswerNotice(content,data){
    const notice=gatewayConsensusAnswerNotice(data);
    const text=String(content||'').trim();
    if(!notice)return text;
    if(text.startsWith(notice))return text;
    return notice+'\n\n'+text;
  }

  function gatewayPrimaryAnswerText(data){
    const values=[
      data?.answer,
      data?.best_answer_text,
      data?.best_answer?.content,
      data?.synthesis
    ];
    for(const value of values){
      if(typeof value!=='string')continue;
      const text=value.trim();
      if(text)return text;
    }
    return '';
  }

  function gatewayAvailableAnswerText(data){
    const responses=Array.isArray(data?.data)?data.data:[];
    const winnerId=String(data?.best_answer?.model_id||data?.best_answer?.receipt?.model_id||'').trim();
    const ordered=winnerId
      ? [...responses].sort((left,right)=>{
          const modelId=response=>String(response?.model||response?.model_id||response?.mmir?.receipt?.model_id||'').trim();
          return Number(modelId(right)===winnerId)-Number(modelId(left)===winnerId);
        })
      : responses;
    for(const response of ordered){
      const text=responseText(response).trim();
      if(text)return 'Best-answer synthesis was unavailable. Showing an available route answer:\n\n'+text;
    }
    return '';
  }

  function swarmReceiptLabel(data){
    if(!data?.swarm_preview&&data?.object!=='chat.swarm.preview'&&data?.object!=='chat.superboost.preview')return '';
    if(data?.object==='chat.superboost.preview'||data?.superboost)return 'Superboost';
    const target=Number(data?.target_route_count)||Number(data?.intelligence_pool?.target_route_count)||Number(data?.pool?.target_route_count)||0;
    return target?'Swarm '+String(target):'Swarm preview';
  }

  function swarmRoundLabel(data){
    const current=Number(data?.current_round)||0;
    const planned=Math.max(
      Number(data?.planned_debate_rounds)||0,
      Array.isArray(data?.debate_plan?.planned_rounds)?data.debate_plan.planned_rounds.length:0
    );
    if(current&&planned)return 'round '+String(current)+'/'+String(planned);
    if(current)return 'round '+String(current);
    if(planned)return 'planned '+String(planned)+' rounds';
    return '';
  }

  function normalizeSwarmPreviewResponse(data){
    if(data?.object!=='chat.swarm.preview'&&data?.object!=='chat.superboost.preview')return data;
    const first=data.first_round||{};
    const routeAttempts=Array.isArray(data.route_attempts)?data.route_attempts:[];
    const responses=Array.isArray(data.data)?data.data:[];
    const blocked=Array.isArray(data.blocked_candidates)?data.blocked_candidates:[];
    const pool={
      ...(data.intelligence_pool||data.pool||{}),
      route_attempt_count: Number(first.route_attempt_count)||routeAttempts.length,
      active_answer_route_count: responses.length||Number(data.intelligence_pool?.active_answer_route_count)||routeAttempts.filter(attempt=>attempt?.status==='succeeded').length,
      active_public_provider_route_count: Number(first.active_public_provider_route_count)||Number(data.intelligence_pool?.active_public_provider_route_count)||0,
      successful_public_provider_route_count: Number(first.successful_public_provider_route_count)||Number(data.intelligence_pool?.successful_public_provider_route_count)||0,
      active_external_node_route_count: Number(first.active_external_node_route_count)||Number(data.intelligence_pool?.active_external_node_route_count)||0,
      successful_external_node_route_count: Number(first.successful_external_node_route_count)||Number(data.intelligence_pool?.successful_external_node_route_count)||0,
      blocked_candidate_count: blocked.length||Number(data.intelligence_pool?.blocked_candidate_count)||0,
      quiet_blocked_candidate_count: Number(first.quiet_blocked_candidate_count)||Number(data.intelligence_pool?.quiet_blocked_candidate_count)||0,
      total_blocked_candidate_count: Number(first.total_blocked_candidate_count)||Number(data.intelligence_pool?.total_blocked_candidate_count)||0,
      no_paid_routes_started: true,
      provider_secrets_in_browser: false
    };
    return {
      ...data,
      object:'chat.compare',
      compare_status:first.compare_status||data.status||'first_round_ready',
      candidate_count:Number(first.candidate_count)||Number(data.candidate_count)||responses.length+blocked.length,
      active_public_provider_route_count:pool.active_public_provider_route_count,
      successful_public_provider_route_count:pool.successful_public_provider_route_count,
      active_external_node_route_count:pool.active_external_node_route_count,
      successful_external_node_route_count:pool.successful_external_node_route_count,
      quiet_blocked_candidate_count:pool.quiet_blocked_candidate_count,
      total_blocked_candidate_count:pool.total_blocked_candidate_count,
      data:responses,
      scores:Array.isArray(data.ranking)?data.ranking:[],
      route_attempts:routeAttempts,
      blocked_candidates:blocked,
      intelligence_pool:pool,
      pool,
      swarm_preview:true,
      swarm_status:data.status||'first_round_ready',
      superboost_preview:data?.object==='chat.superboost.preview'||Boolean(data?.superboost),
      superboost:data?.superboost,
      continuation:data?.continuation||data?.superboost?.continuation||null,
      target_route_count:Number(data.target_route_count)||Number(pool.target_route_count)||0,
      sync_route_limit:Number(data.sync_route_limit)||Number(pool.sync_route_limit)||0,
      current_round:Number(data.current_round)||1,
      planned_debate_rounds:Number(data.planned_debate_rounds)||0
    };
  }

  function attachSwarmMetadata(compareData,swarmData){
    if(!swarmData?.swarm_preview)return compareData;
    const pool={
      ...(compareData?.intelligence_pool||compareData?.pool||{}),
      target_route_count:swarmData.target_route_count,
      sync_route_limit:swarmData.sync_route_limit,
      swarm_ready:true,
      arena_ready:swarmData?.debate_plan?.consensus_ready===true
    };
    return {
      ...compareData,
      swarm_preview:true,
      swarm_status:swarmData.swarm_status,
      target_route_count:swarmData.target_route_count,
      sync_route_limit:swarmData.sync_route_limit,
      current_round:swarmData.current_round,
      planned_debate_rounds:swarmData.planned_debate_rounds,
      debate_plan:swarmData.debate_plan,
      fusion_analysis:swarmData.fusion_analysis,
      measurement:swarmData.measurement,
      intelligence_pool:pool,
      pool
    };
  }

  async function fetchGatewayFanout(prompt,mode,signal,options={}){
    const journey=mode==='compare'||mode==='best-answer'?'compare':'swarm_preview';
    if(!await revalidateHostedBoundary(journey)){
      const error=new Error('Hosted '+journey+' journey is not production-ready.');
      error.code='hosted_release_not_ready';
      throw error;
    }
    const payload=compareApiPayload(prompt);
    const systemContext=String(options.systemContext||'').trim().slice(0,8000);
    if(systemContext){
      payload.system_context=systemContext;
      payload.system_context_source='p0-no-key-tool-preview';
    }
    if(mode==='boost'||mode==='all'||mode==='council'){
      payload.swarm_mode=mode;
    }
    if(mode==='council'){
      payload.mmir_mode='council';
    }
    const request={
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify(payload),
      timeoutMs:70000,
      signal
    };
    let swarmData=null;
    if(mode==='boost'||mode==='all'||mode==='council'){
      try{
        const previewPath=mode==='boost'?SUPERBOOST_PREVIEW_PATH:SWARM_PREVIEW_PATH;
        swarmData=normalizeSwarmPreviewResponse(await fetchJson(API_URL+previewPath,request));
        if(swarmData?.object==='chat.compare'&&(mode!=='all'||Array.isArray(swarmData.data)&&swarmData.data.length)){
          return swarmData;
        }
      }catch(error){
        if(error?.name==='AbortError')throw error;
      }
    }
    const compareData=await fetchJson(API_URL+COMPARE_PATH,request);
    return attachSwarmMetadata(compareData,swarmData);
  }

  function gatewayCompareAllAnswer(data){
    const responses=(Array.isArray(data?.data)?data.data:[]).filter(response=>responseText(response));
    const blockedCandidates=(Array.isArray(data?.blocked_candidates)?data.blocked_candidates:[]);
    const blockedAttempts=(Array.isArray(data?.route_attempts)?data.route_attempts:[])
      .filter(attempt=>attempt?.status&&attempt.status!=='succeeded');
    const blocked=[...blockedCandidates,...blockedAttempts]
      .filter((item,index,items)=>{
        const key=String(item?.provider||'')+'|'+String(item?.model_id||item?.receipt?.model_id||'')+'|'+String(item?.reason||item?.blocker||item?.route_state||item?.status||'');
        return items.findIndex(other=>String(other?.provider||'')+'|'+String(other?.model_id||other?.receipt?.model_id||'')+'|'+String(other?.reason||other?.blocker||other?.route_state||other?.status||'')===key)===index;
      })
      .slice(0,6)
      .map(gatewayCompareBlockedLine);
    const best=data?.best_answer||{};
    const winner=attemptProviderLabel({provider:best?.receipt?.provider,model_display_name:best?.model_display_name,model_id:best?.model_id});
    const winnerReason=gatewayWinnerReason(data,best);
    const quiet=gatewayQuietCount(data);
    const header=[
      winner?'Best live score: '+winner:'',
      typeof best?.score==='number'?'Score '+best.score:'',
      winnerReason?'Why: '+winnerReason:'',
      responses.length?String(responses.length)+' active answer'+(responses.length===1?'':'s'):'No active answers',
      quiet?String(quiet)+' quiet':''
    ].filter(Boolean).join(' · ');
    const lines=[header||'All active route check complete.'];
    if(responses.length)lines.push('', 'All active answers:', ...responses.slice(0,10).map(gatewayCompareResponseLine));
    if(blocked.length)lines.push('', 'Not active in this run:', ...blocked);
    return lines.join('\n');
  }

  function gatewayCompareReceipt(data,label='Best answer'){
    const attempts=Array.isArray(data?.route_attempts)?data.route_attempts:[];
    const pool=gatewayPool(data);
    const best=data?.best_answer||{};
    const winner=attemptProviderLabel({provider:best?.receipt?.provider,model_display_name:best?.model_display_name,model_id:best?.model_id});
    const winnerReason=gatewayWinnerReason(data,best);
    const poolRouteCount=gatewayRouteCount(data);
    const activeProviderCount=Number(pool.active_public_provider_route_count)||Number(data?.active_public_provider_route_count)||0;
    const activeExternalNodeCount=Number(pool.active_external_node_route_count)||Number(data?.active_external_node_route_count)||Number(state.routeInventory?.activeExternalNodeRoutes)||0;
    const queuedRouteCount=Number(pool.visible_candidate_count)||Number(data?.visible_candidate_count)||Number(state.routeInventory?.futureRoutes)||0;
    const visibleRouteCount=Number(state.routeInventory?.totalRoutes)||0;
    const succeededAttempts=attempts.filter(attempt=>attempt?.status==='succeeded');
    const demotedCount=gatewayVisibleBlockedCount(data);
    const quietCount=gatewayQuietCount(data);
    const answeredCount=gatewayAnswerCount(data);
    const answeredLabel=answeredCount?String(answeredCount)+' answered':'';
    const demotedLabel=demotedCount?String(demotedCount)+' demoted':'';
    const quietLabel=quietCount?String(quietCount)+' quiet':'';
    const swarmLabel=swarmReceiptLabel(data);
    const roundLabel=swarmRoundLabel(data);
    const syncLimit=Number(data?.sync_route_limit)||Number(pool.sync_route_limit)||0;
    const arenaReady=data?.debate_plan?.consensus_ready===true||pool.arena_ready===true;
    const councilReady=/(council|debate)/i.test(label)&&arenaReady;
    const signedReceipts=pool?.signals_available?.signed_route_receipts===true||attempts.some(attempt=>attempt?.receipt?.receipt_signature);
    const consensus=gatewayConsensusConfidence(data);
    const fusionLine=gatewayFusionReceiptLine(data);
    const succeeded=succeededAttempts.map(compareAttemptSummary);
    const blocked=attempts.filter(attempt=>attempt?.status!=='succeeded').map(compareAttemptIssueSummary).slice(0,2);
    const providerReadiness=providerReadinessLine();
    const parts=[
      label,
      swarmLabel,
      roundLabel,
      poolRouteCount?String(poolRouteCount)+' routes compared':(attempts.length?String(attempts.length)+' routes':''),
      consensus?.label||'',
      fusionLine,
      answeredLabel,
      demotedLabel,
      quietLabel,
      syncLimit?('sync '+String(syncLimit)):'',
      councilReady?'council ready':'',
      arenaReady?'arena ready':'',
      signedReceipts?'signed receipts':'',
      'No paid route',
      activeProviderCount?String(activeProviderCount)+' live provider routes':'',
      activeExternalNodeCount?String(activeExternalNodeCount)+' live external nodes':'',
      providerReadiness,
      queuedRouteCount?String(queuedRouteCount)+' queued':'',
      visibleRouteCount?String(visibleRouteCount)+' visible total':'',
      winner?'Winner: '+winner:'',
      winnerReason?'Why: '+winnerReason:'',
      typeof best?.score==='number'?'Score '+best.score:'',
      ...succeeded,
      ...blocked,
    ];
    return parts.filter(Boolean).join(' · ');
  }

  function modelForCompareAttempt(attempt){
    const modelId=String(attempt?.model_id||attempt?.receipt?.model_id||'').toLowerCase();
    const routeId=String(attempt?.route_id||attempt?.receipt?.route_id||'').toLowerCase();
    const provider=String(attempt?.provider||attempt?.receipt?.provider||'').toLowerCase();
    return state.models.find(model=>
      String(model.id||'').toLowerCase()===modelId ||
      String(model.model||'').toLowerCase()===modelId ||
      String(model.routeId||'').toLowerCase()===routeId ||
      (provider&&String(model.provider||'').toLowerCase()===provider)
    )||null;
  }

  function recordGatewayCompareBenchmarks(data){
    (Array.isArray(data?.route_attempts)?data.route_attempts:[]).forEach(attempt=>{
      const model=modelForCompareAttempt(attempt);
      if(!model||attempt.status!=='succeeded')return;
      recordRouteBenchmark(model,{
        score:clampScore(attempt.score||model.score||50),
        elapsedMs:Number(attempt.latency_ms)||Number(attempt.receipt?.latency_ms)||0,
        answer_class:attempt.answer_class||'complete',
        latency_class:attempt.latency_class||'unknown',
        reason:attempt.reason||'gateway compare',
        source:'api'
      });
    });
  }

  function localAllResponseEnvelope(model,content,latencyMs,prompt){
    const score=routeScore(model,prompt,content,latencyMs,false,'compare');
    const receipt={
      object:'mmir.route_receipt',
      provider:'local',
      model_id:model.model||model.id,
      model_display_name:model.label,
      latency_ms:Math.round(latencyMs),
      route_visibility:'browser-local',
      provider_called:true,
      provider_secrets_in_browser:false,
      no_paid_routes_started:true
    };
    return {
      model:model.model||model.id,
      provider:'local',
      model_display_name:model.label,
      latency_ms:Math.round(latencyMs),
      score:score.score,
      choices:[{message:{content}}],
      mmir:{receipt,route_receipt:receipt}
    };
  }

  function localAllRouteAttempt(response){
    const receipt=responseReceiptEnvelope(response);
    return {
      provider:'local',
      model_id:receipt.model_id||response.model,
      model_display_name:receipt.model_display_name||response.model_display_name,
      status:'succeeded',
      latency_ms:Number(receipt.latency_ms)||Number(response.latency_ms)||0,
      score:Number(response.score)||0,
      answer_class:'complete',
      receipt
    };
  }

  function localAllBlockedCandidate(model,reason){
    return {
      provider:'local',
      model_id:model?.model||model?.id||'local',
      model_display_name:model?.label||model?.model||'Local model',
      reason,
      route_state:'blocked'
    };
  }

  async function localAllActiveRoutes(prompt,signal){
    const models=state.models.filter(localModelReady).slice(0,8);
    if(!models.length)return {responses:[],attempts:[],blocked:[]};
    try{
      allowLocalProbes('p0-local-all-active',120000);
      const token=await pairLocal();
      const settled=await Promise.allSettled(models.map(async model=>{
        const started=performance.now();
        const data=await fetchJson(LOCAL_URL+CHAT_PATH,{
          method:'POST',
          headers:localHeaders(token),
          body:JSON.stringify(localPayload(prompt,model)),
          timeoutMs:45000,
          signal
        });
        const answer=responseText(data);
        if(!answer)throw new Error('empty local answer');
        return localAllResponseEnvelope(model,answer,performance.now()-started,prompt);
      }));
      const responses=[];
      const blocked=[];
      settled.forEach((result,index)=>{
        if(result.status==='fulfilled')responses.push(result.value);
        else blocked.push(localAllBlockedCandidate(models[index],result.reason?.message||'local route failed'));
      });
      return {responses,attempts:responses.map(localAllRouteAttempt),blocked};
    }catch(error){
      const reason=error?.name==='AbortError'?'stopped':'local pairing unavailable';
      return {responses:[],attempts:[],blocked:models.map(model=>localAllBlockedCandidate(model,reason))};
    }
  }

  function mergeLocalAllRoutes(data,local){
    if(!local||(local.responses.length===0&&local.blocked.length===0))return data;
    const merged={...data};
    merged.data=[...(Array.isArray(data?.data)?data.data:[]),...local.responses];
    merged.route_attempts=[...(Array.isArray(data?.route_attempts)?data.route_attempts:[]),...local.attempts];
    merged.blocked_candidates=[...(Array.isArray(data?.blocked_candidates)?data.blocked_candidates:[]),...local.blocked];
    const pool={...(data?.intelligence_pool||data?.pool||{})};
    pool.route_attempt_count=merged.route_attempts.length;
    pool.active_answer_route_count=merged.data.filter(response=>responseText(response)).length;
    pool.local_browser_answer_route_count=local.responses.length;
    pool.blocked_candidate_count=merged.blocked_candidates.length;
    merged.intelligence_pool=pool;
    merged.pool=pool;
    merged.candidate_count=merged.data.length+merged.blocked_candidates.length;
    return merged;
  }

  function gatewaySwarmProgressStage(mode,elapsedMs){
    const elapsed=Number(elapsedMs)||0;
    if(mode==='council'){
      if(elapsed<4500)return {line:'Independent answers are being collected.',status:'asking active routes'};
      if(elapsed<9500)return {line:'Top routes are challenging weak assumptions.',status:'ranking and cross-checking'};
      if(elapsed<16000)return {line:'Supergeni is synthesizing the strongest shared answer.',status:'synthesizing council answer'};
      return {line:'Still working; final proof and quiet-route checks are being finalized.',status:'finalizing signed proof'};
    }
    if(mode==='all'){
      if(elapsed<4500)return {line:'Active routes are answering in parallel.',status:'asking active routes'};
      if(elapsed<9500)return {line:'Separate answers are being organized for inspection.',status:'organizing answers'};
      return {line:'Signed proof and quiet-route status are being finalized.',status:'finalizing signed proof'};
    }
    if(mode==='boost'){
      if(elapsed<4500)return {line:'Active routes are answering in parallel.',status:'asking active routes'};
      if(elapsed<9500)return {line:'Answer quality, latency and route fit are being scored.',status:'ranking answers'};
      return {line:'Supergeni is compressing the winning route into one clean answer.',status:'synthesizing best answer'};
    }
    if(elapsed<4500)return {line:'Active routes are answering in parallel.',status:'asking active routes'};
    if(elapsed<9500)return {line:'Route fit, answer completeness and latency are being compared.',status:'ranking answers'};
    return {line:'The final answer and signed receipt proof are being prepared.',status:'synthesizing best answer'};
  }

  function gatewaySwarmProgressLines(mode,title,routeCount,elapsed,elapsedMs){
    const count=String(routeCount||activeHostedCompareModels().length||'?');
    const stage=gatewaySwarmProgressStage(mode,elapsedMs);
    if(mode==='council'){
      return [
        title+' is running.',
        'Now: '+stage.line,
        '1. Asking '+count+' active routes for independent answers.',
        '2. Top routes challenge weak assumptions and compare strengths.',
        '3. Supergeni converges on one practical answer with signed proof.',
        'Elapsed: '+elapsed
      ];
    }
    if(mode==='all'){
      return [
        title+' is running.',
        'Now: '+stage.line,
        '1. Asking '+count+' active routes.',
        '2. Keeping each answer separate so you can inspect the range.',
        '3. Signing route proof and marking any quiet or blocked routes.',
        'Elapsed: '+elapsed
      ];
    }
    if(mode==='boost'){
      return [
        title+' is running.',
        'Now: '+stage.line,
        '1. Asking '+count+' active routes.',
        '2. Scoring answer quality, latency and route fit.',
        '3. Supergeni returns one clean answer with ranking proof.',
        'Elapsed: '+elapsed
      ];
    }
    return [
      title+' is running.',
      'Now: '+stage.line,
      '1. Asking '+count+' active routes.',
      '2. Comparing route fit, answer completeness and latency.',
      '3. Returning the best answer with signed receipt proof.',
      'Elapsed: '+elapsed
    ];
  }

  function startGatewaySwarmProgress(assistant,{title,mode,routeCount}){
    const started=performance.now();
    const receiptBase=title+' · '+String(routeCount||'?')+' active hosted routes · live progress · no paid route';
    const tick=()=>{
      if(!state.busy||stopRequested)return;
      const elapsedMs=performance.now()-started;
      const elapsed=formatDuration(elapsedMs);
      const stage=gatewaySwarmProgressStage(mode,elapsedMs);
      if(elapsedMs>=SLOW_RESPONSE_NOTICE_MS){
        updateMessage(assistant,title+' is still working. The request is taking longer than usual, but it is still running.',{receipt:receiptBase,slowNotice:true});
        status(title+' still working...','ready');
        routeStatus(title+' · still working · request still active','ready');
        return;
      }
      updateMessage(assistant,gatewaySwarmProgressLines(mode,title,routeCount,elapsed,elapsedMs).join('\n'),{receipt:receiptBase});
      status(title+' running: '+stage.status+'...','ready');
      routeStatus(title+' · '+stage.status+' · signed proof pending','ready');
    };
    tick();
    const timer=window.setInterval(tick,3800);
    return ()=>window.clearInterval(timer);
  }

  async function compareGatewayRoutes(comparePrompt='',options={}){
    if(state.busy)return;
    const input=document.getElementById('p0-input');
    const prompt=String(comparePrompt||input?.value||'').trim();
    const mode=options.mode==='compare'?'compare':(options.mode==='boost'?'boost':(options.mode==='all'?'all':(options.mode==='council'?'council':'best-answer')));
    const title=mode==='compare'?'Compare':(mode==='boost'?'Intelligence Boost':(mode==='all'?'Ask All Active':(mode==='council'?'Supergeni Council':'Best Answer')));
    if(privateModeActive()){
      status(privacyModeLabel()+' blocks hosted compare. Use local mode or public mode.','error');
      routeStatus(privacyModeLabel()+' · hosted compare blocked','error');
      captureInteraction('tool_blocked',{tool:title,reason:'private_mode'});
      input?.focus();
      return;
    }
    if(!prompt){
      status('Write a prompt first, then '+title+' can run.','error');
      captureInteraction('tool_blocked',{tool:title,reason:'missing_prompt'});
      input?.focus();
      return;
    }
    const hostedJourney=mode==='compare'||mode==='best-answer'?'compare':'swarm_preview';
    if(!await ensureHostedJourneyReady(hostedJourney)){
      input?.focus();
      return;
    }
    const toolContext=options.toolContext||null;
    const systemContext=String(options.systemContext||'').trim().slice(0,8000);
    const toolReceipt=toolContext?noKeyToolReceipt(toolContext):'';
    captureInteraction('swarm_started',{
      tool:title,
      mode,
      hosted_route_count:Number(activeHostedCompareModels().length)||0,
      system_context_injected:Boolean(systemContext),
      tool_context:toolContext?.tool||''
    });
    const signal=beginResponse();
    append('user',prompt,'You');
    if(input){
      input.value='';
      autosizeInput();
    }
    const routeCount=String(activeHostedCompareModels().length);
    const assistantLabel=mode==='boost'?'Supergeni · Intelligence Boost':(mode==='all'?'MMIR · All active routes':(mode==='council'?'Supergeni · Council':'Supergeni · Best answer'));
    const initialReceipt=(mode==='boost'?'Intelligence Boost':(mode==='all'?'Ask all active':(mode==='council'?'Supergeni Council':'Best Answer')))+' · '+routeCount+' active hosted routes · signed receipt check · no paid route'+(toolReceipt?' · '+toolReceipt:'');
    const assistant=append('assistant',CHAT_STATE.comparing?.('Supergeni')||'Supergeni sammenligner svar …',assistantLabel,initialReceipt,{variant:'compare',retryPrompt:prompt,answerState:'pending',aiGenerated:false});
    const stopProgress=startGatewaySwarmProgress(assistant,{title,mode,routeCount});
    status(title+' is asking '+routeCount+' active routes...','ready');
    routeStatus(title+' · '+routeCount+' active routes · no paid route','ready');
    try{
      const gatewayPromise=fetchGatewayFanout(prompt,mode,signal,{systemContext,toolContext});
      const localPromise=mode==='all'?localAllActiveRoutes(prompt,signal):Promise.resolve({responses:[],attempts:[],blocked:[]});
      const [gatewayData,localData]=await Promise.all([gatewayPromise,localPromise]);
      const data=mode==='all'?mergeLocalAllRoutes(gatewayData,localData):gatewayData;
      if(data?.object!=='chat.compare')throw new Error('Gateway compare unavailable');
      recordTokenUsage(data,'gateway-fanout');
      const content=mode==='all'
        ? gatewayCompareAllAnswer(data)
        : (gatewayPrimaryAnswerText(data)||gatewayAvailableAnswerText(data)||'Compare finished, but no route returned an answer.');
      const receipt=gatewayCompareReceipt(data,mode==='boost'?'Intelligence boost':(mode==='all'?'Ask all active':(mode==='council'?'Supergeni Council':'Best answer')))+(toolReceipt?' · '+toolReceipt:'');
      const truncated=gatewayDataTruncated(data);
      const displayContent=withConsensusAnswerNotice(content,data);
      const answerProof=noteAnswerProof(answerProofLine(data?.best_answer)||answerProofLine(data));
      const answerWriter=answerWriterProfile(data,data?.best_answer||{label:assistantLabel});
      updateMessage(assistant,withTruncationGuard(displayContent,{completion_truncated:truncated}),{
        label:answerWriter.model_display_name,
        receipt:receipt+(truncated?' · truncated guard':''),
        proofLine:answerProof,
        intelligenceLabel:connectedIntelligenceLabel(data),
        answerWriter,
        answerState:'live',
        aiGenerated:answerWriter.type!=='capability',
        routeProvenance:'hosted-compare',
        hostedLineage:true,
        truncated,
        continuationLabel:truncated?gatewayContinuationActionLabel(data):'',
        continuationSuggestedMessage:truncated?gatewayContinuationSuggestedMessage(data):'',
        continuationSource:truncated?(gatewayContinuationContract(data)?.policy_version||'gateway-continuation'):''
      });
      captureInteraction(truncated?'truncation_seen':'swarm_completed',{
        tool:title,
        mode,
        answered_count:Number(gatewayAnswerCount(data))||0,
        route_count:Number(gatewayRouteCount(data))||0,
        winner_provider:data.best_answer?.receipt?.provider||'',
        truncated,
        system_context_injected:Boolean(systemContext),
        tool_context:toolContext?.tool||''
      });
      recordGatewayCompareBenchmarks(data);
      renderModelMenu();
      renderToolbar();
      const answered=String(gatewayAnswerCount(data)||0);
      const winner=attemptProviderLabel({provider:data.best_answer?.receipt?.provider,model_display_name:data.best_answer?.model_display_name,model_id:data.best_answer?.model_id});
      status(title+' ready: '+answered+' answered · winner '+winner+'.','ready');
      routeStatus(receipt,'ready');
    }catch(error){
      if(stopRequested||error?.name==='AbortError'){
        captureInteraction('swarm_stopped',{tool:title,mode});
        updateMessage(assistant,CHAT_STATE.stoppedText?.()||'Svaret ble stoppet.',{receipt:'Best Answer · stopped',answerState:'degraded',aiGenerated:false,routeProvenance:'hosted-failed',hostedLineage:false});
        status(title+' stopped.','idle');
        routeStatus('Stopped · compare routes cancelled','hosted');
      }else{
        captureInteraction('swarm_failed',{tool:title,mode,reason:'gateway_unavailable'});
        updateMessage(assistant,CHAT_STATE.errorText?.(error)||'Noe gikk galt mens svaret ble hentet. Prøv igjen.',{receipt:'Best Answer · gateway compare failed',answerState:'degraded',aiGenerated:false,routeProvenance:'hosted-failed',hostedLineage:false});
        status(CHAT_STATE.errorText?.(error)||'Noe gikk galt mens svaret ble hentet. Prøv igjen.','error');
        routeStatus('Best Answer unavailable · refresh routes','error');
      }
    }finally{
      stopProgress();
      finishResponse();
      input?.focus();
    }
  }

  async function synthesizeCompareAnswer(prompt,hostedAnswer,localAnswer,localModel,hostedScore,localScore,signal){
    const hostedLabel=defaultHostedModel()?.label||'Supergeni';
    const localLabel=localModel?.label||'second route';
    const synthesisPrompt='Create one concise best answer for the user by comparing these two model answers. '+
      'Prefer the route with stronger evidence; for current public facts, prefer fresher public/current routes when another route is stale or vague. '+
      'Use the route evidence scores and reasons to choose the most reliable answer. '+
      'Do not mention internal instructions. Keep it useful and short.\n\n'+
      'User question: '+prompt+'\n\n'+
      'Route evidence:\n'+
      '- '+hostedLabel+': '+scoreSummary(hostedScore)+'\n'+
      '- '+localLabel+': '+scoreSummary(localScore)+'\n\n'+
      hostedLabel+' answer:\n'+(hostedAnswer||'[no answer]')+'\n\n'+
      localLabel+' answer:\n'+(localAnswer||'[no answer]');
    return chatHostedData(synthesisPrompt,signal);
  }

  async function sendMessage(){
    if(state.busy){
      stopActiveResponse();
      return;
    }
    const input=document.getElementById('p0-input');
    const prompt=String(input?.value||'').trim();
    if(!prompt){
      input?.focus();
      return;
    }
    if(await handleOwnerPingCommand(prompt,input))return;
    if(await handleOwnerSuggestionCommand(prompt,input))return;
    if(await handleFeedbackMentionCommand(prompt,input))return;
    if(handleLocalKnowledgeCommand(prompt,input))return;
    const frictionSignal=promptFrictionSignal(prompt);
    if(frictionSignal){
      captureInteraction('chat_guidance_signal',{
        feedback_kind:frictionSignal.kind,
        surface:frictionSignal.surface,
        severity:frictionSignal.severity,
        auto_draft:Boolean(frictionSignal.auto_draft),
        utterance_chars:frictionSignal.chars,
        word_count:frictionSignal.words,
        lang:frictionSignal.lang
      });
      if(frictionSignal.auto_draft){
        queueImplicitFeedbackFromChat(prompt,frictionSignal);
        status('Feedback signal captured.','ready');
        routeStatus('Feedback signal captured · sanitized draft · no raw chat log','ready');
      }
    }
    captureInteraction('chat_send',{
      active_model_id:activeModel()?.id||'',
      active_model_route:activeModel()?.route||'',
      has_prompt:true,
      shared_location_available:Boolean(readSharedLocation()),
      shared_location_used:Boolean(sharedLocationContextForPrompt(prompt)),
      answer_style:answerStyle(),
      fast_answer_next:Boolean(state.fastAnswerOnce),
      pending_media_local:Boolean(state.pendingMedia),
      raw_image_sent_to_gateway:false,
      provider_called:false
    });
    const fastAnswer=Boolean(state.fastAnswerOnce);
    state.fastAnswerOnce=false;
    const explicit=explicitMentionDecision(prompt);
    if(explicit?.mode==='compare'&&!privateModeActive()){
      if(!await ensureHostedJourneyReady('compare')){
        input?.focus();
        return;
      }
      compareLiveRoutes(explicit.prompt,explicit.model,{mode:'compare'});
      return;
    }
    if(explicit?.mode==='missing-local'){
      captureInteraction('chat_blocked',{reason:'missing_local_model'});
      status('Oppdater AI først, så kan @supergeni @gemma sammenlignes.','error');
      routeStatus('Local model not connected yet','error');
      input?.focus();
      return;
    }
    let smart=explicit||smartDecision(prompt);
    if(privateModeActive()){
      const local=bestLocalModel()||(smart.model?.route==='local'?smart.model:null);
      smart=local
        ? {mode:'single',model:local,reason:routeReason(privacyModeLabel(),prompt,local),prompt:cleanSmartPrompt(prompt)||prompt}
        : {mode:'private-unavailable',prompt:cleanSmartPrompt(prompt)||prompt};
    }
    if(smart.mode==='private-unavailable'){
      const modeLabel=privacyModeLabel();
      const modeNeed=superPrivateModeActive()?'Superprivate needs local node':'Private mode needs local node';
      closeMenus();
      append('user',prompt,'You','',{routeProvenance:'local-private',hostedLineage:false});
      input.value='';
      autosizeInput();
      append(
        'assistant',
        modeLabel+' er på, men ingen lokal modell er koblet til. Velg Koble til lokal AI i statuslinjen for å starte.',
        'MMIR privacy guard',
        modeLabel+' · hosted route blocked',
        {routeProvenance:'local-private',hostedLineage:false}
      );
      status(modeLabel+' needs a local model.','error');
      routeStatus(modeNeed,'error');
      captureInteraction('chat_blocked',{reason:'private_mode_needs_local',privacy_mode:privacyMode()});
      input?.focus();
      return;
    }
    if(smart.mode==='compare'){
      if(!await ensureHostedJourneyReady('compare')){
        input?.focus();
        return;
      }
      compareLiveRoutes(smart.prompt,smart.model,{mode:'best-answer'});
      return;
    }
    const pendingMedia=state.pendingMedia;
    if(pendingMedia&&smart.mode==='single'&&smart.model?.route==='local'&&!privateModeActive()){
      smart={...smart,model:defaultHostedModel(),reason:'Protected vision boundary'};
    }
    const model=smart.model;
    if(model?.route==='hosted'&&!await ensureHostedJourneyReady('first_chat',model)){
      input?.focus();
      return;
    }
    if(model?.route==='local'&&!localModelReady(model)){
      status('Lokal modell er ikke bekreftet klar. Oppdater lokal AI først.','error');
      routeStatus('Lokal rute blokkert · mangler paired chat-ready bevis','error');
      captureInteraction('chat_blocked',{reason:'local_route_not_ready',provider_called:false});
      input?.focus();
      return;
    }
    const directHostedLineage=Boolean(model?.route==='hosted'&&!pendingMedia);
    const routeProvenance=directHostedLineage
      ? 'hosted-chat'
      : (model?.route==='local'?'local-model':(pendingMedia?'hosted-vision':'ui-local'));
    closeMenus();
    const signal=beginResponse();
    const userMessage=append('user',prompt,'You','',{routeProvenance,hostedLineage:directHostedLineage});
    input.value='';
    autosizeInput();
    if(!model||model.executable===false||model.selectable===false){
      status((model?.label||'Leverandørkandidat')+' er synlig, men ikke live-verifisert for chat.','error');
      routeStatus('Konfigurert/fremtidig rute · produksjonsbevis kreves','error');
      captureInteraction('chat_blocked',{reason:'future_route',selected_model_id:model?.id||''});
      input?.focus();
      return;
    }
    const locationContext=sharedLocationContextForPrompt(prompt);
    const guardedRoutePrompt=locationContext?locationContext+'\n\nUser text:\n'+(smart.prompt||prompt):(smart.prompt||prompt);
    const routePrompt=fastAnswer?fastAnswerPrompt(guardedRoutePrompt):guardedRoutePrompt;
    const receipt=routeReceipt(model);
    const assistant=append('assistant',CHAT_STATE.pending?.(model.label)||'Supergeni tenker …',model.label,receipt.text,{retryPrompt:prompt,routeProvenance,hostedLineage:directHostedLineage,answerState:'pending',aiGenerated:false});
    const rolePart=normalizeRoleProfileId(state.roleProfileId)==='default'?'':'Role '+roleProfileLabel();
    const routeParts=[fastAnswer?'Fast answer':answerStyleLabel()+' answer',rolePart,smart.reason].filter(Boolean);
    const routePrefix=routeParts.length?routeParts.join(' · ')+' · ':'';
    status(CHAT_STATE.pending?.(model.label)||'Supergeni tenker …','loading');
    routeStatus(routePrefix+receipt.text,receipt.state);
    const stopSlowNotice=startSlowResponseNotice(assistant,{
      content:CHAT_STATE.slow?.()||'Jobber fortsatt. Dette tar litt lengre tid enn vanlig.',
      statusText:'Supergeni jobber fortsatt …',
      routeText:routePrefix+'Jobber fortsatt · forespørselen er aktiv'
    });
    try{
      const started=performance.now();
      let hostedData=null;
      const answer=model.route==='local'
        ? await chatLocal(routePrompt,model,signal)
        : pendingMedia
          ? responseText((hostedData=await chatVisionPreviewData(routePrompt,signal,pendingMedia)))||'Vision-ruten svarte tomt. Prøv igjen med et tydeligere bilde eller en kortere forespørsel.'
          : responseText((hostedData=await chatHostedData(routePrompt,signal,model,null,prompt,{writerContinuity:true})))||((model?.label||'Hosted route')+' returned an empty response.');
      if(hostedData)recordTokenUsage(hostedData,pendingMedia?'vision-chat':'hosted-chat');
      const hostedTruncated=model.route!=='local'&&responseIsTruncated(hostedData);
      const elapsedMs=performance.now()-started;
      const measuredScore=routeScore(model,routePrompt,answer,elapsedMs);
      recordRouteBenchmark(model,measuredScore);
      const elapsed=formatDuration(elapsedMs);
      const connectGuide=responseConnectGuide(hostedData);
      const answerProof=noteAnswerProof(answerProofLine(hostedData));
      const answerWriter=answerWriterProfile(hostedData,model);
      const answeredRouteProvenance=directHostedLineage&&answerWriter.type==='capability'?'hosted-capability':routeProvenance;
      state.hostedRouteState='ready';
      updateMessage(assistant,withTruncationGuard(answer,hostedData),{
        label:answerWriter.model_display_name,
        receipt:routePrefix+receipt.text+' · '+elapsed+' · '+latencyTargetReceipt(model,elapsedMs)+' · Score '+effectiveModelScore(model)+(hostedTruncated?' · truncated guard':'')+writerContinuityResetReceipt(hostedData),
        proofLine:answerProof,
        intelligenceLabel:connectedIntelligenceLabel(hostedData),
        answerWriter,
        answerState:model.route==='local'?'local':'live',
        aiGenerated:model.route==='local'||answerWriter.type!=='capability',
        truncated:hostedTruncated,
        routeProvenance:answeredRouteProvenance,
        hostedLineage:directHostedLineage,
        ...connectGuideMessageUpdates(connectGuide)
      });
      if(pendingMedia&&state.pendingMedia===pendingMedia)state.pendingMedia=null;
      captureInteraction(hostedTruncated?'truncation_seen':'chat_answer_ready',{
        active_model_id:model.id,
        active_model_route:model.route,
        latency_ms:Math.round(elapsedMs),
        score:effectiveModelScore(model),
        truncated:hostedTruncated,
        raw_image_sent_to_gateway:Boolean(pendingMedia),
        provider_called:Boolean(hostedData?.mmir?.provider_called||hostedData?.provider_called),
        writer_continuity_reset:Boolean(writerContinuityResetMetadata(hostedData)),
        writer_continuity_reset_reason:writerContinuityResetMetadata(hostedData)?.reason||''
      });
      renderModelMenu();
      if(connectGuide){
        const routeText=connectGuideRouteText(connectGuide);
        status(connectGuideStatusText(connectGuide)||answerStatus(model,measuredScore,routePrefix),'ready');
        routeStatus(routeText||routePrefix+routeMicroStatus(model),receipt.state);
      }else{
        routeStatus(routePrefix+routeMicroStatus(model),receipt.state);
        status(answerStatus(model,measuredScore,routePrefix),'ready');
      }
    }catch(error){
      if(stopRequested||error?.name==='AbortError'){
        captureInteraction('chat_stopped',{active_model_id:model?.id||'',active_model_route:model?.route||''});
        updateMessage(userMessage,userMessage.content,{routeProvenance:'hosted-failed',hostedLineage:false});
        updateMessage(assistant,CHAT_STATE.stoppedText?.()||'Svaret ble stoppet.',{receipt:receipt.text+' · stopped by user',answerState:'degraded',aiGenerated:false,routeProvenance:'hosted-failed',hostedLineage:false});
        status(CHAT_STATE.stoppedText?.()||'Svaret ble stoppet.','idle');
        routeStatus('Stopped · no failed first request','hosted');
        return;
      }
      if(model.route==='local'){
        recordRouteBenchmark(model,routeScore(model,routePrompt,'',0,true));
        const hint=localNetworkHint(error);
        if(!hostedFallbackAllowedForLocalFailure(prompt,routePrompt)){
          captureInteraction('chat_failed_closed',{reason:'local_private_guard',active_model_id:model?.id||''});
          updateMessage(
            assistant,
            hint+'\n\nPrivacy guard: I did not send this local/private prompt to hosted Supergeni. Fix local access or choose Supergeni explicitly if you want a hosted answer.',
            {receipt:receipt.text+' · Local privacy fail-closed',answerState:'degraded',aiGenerated:false,routeProvenance:'local-failed',hostedLineage:false}
          );
          status('Local route unavailable. Private prompt was not sent to hosted route.','error');
          routeStatus('Local privacy guard · hosted fallback blocked','error');
          return;
        }
        if(!await revalidateHostedBoundary('first_chat',defaultHostedModel(),{force:true})){
          captureInteraction('chat_failed_closed',{reason:'local_failed_hosted_release_blocked',active_model_id:model?.id||'',provider_called:false});
          updateMessage(
            assistant,
            hint+'\n\nDen offentlige svarbanen er ikke produksjonsklar, så MMIR sendte ikke forespørselen videre som hosted fallback.',
            {receipt:receipt.text+' · Hosted fallback blocked by release gate',answerState:'degraded',aiGenerated:false,routeProvenance:'local-failed',hostedLineage:false}
          );
          status('Lokal rute feilet. Hosted fallback ble blokkert.','error');
          routeStatus('Fail-closed · ingen hosted-rute startet','error');
          return;
        }
        state.activeModelId='mmir-supergenius';
        persistActiveModelId();
        renderToolbar();
        try{
          const fallbackReceipt=routeReceipt(activeModel());
          const fallbackStarted=performance.now();
          updateMessage(userMessage,userMessage.content,{routeProvenance:'hosted-fallback-attempted',hostedLineage:false,hostedDeliveryState:'attempted-result-unknown'});
          updateMessage(assistant,assistant.content,{receipt:receipt.text+' · Hosted fallback attempted · result unknown',routeProvenance:'hosted-fallback-attempted',hostedLineage:false,hostedDeliveryState:'attempted-result-unknown'});
          captureInteraction('chat_fallback_started',{original_route:'local',active_model_id:activeModel()?.id||'',hosted_delivery_state:'attempted-result-unknown'});
          const fallbackData=await chatHostedData(routePrompt,signal,defaultHostedModel(),null,prompt,{writerContinuity:true});
          const fallbackAnswer=responseText(fallbackData)||((activeModel()?.label||'Hosted route')+' returned an empty response.');
          const fallbackTruncated=responseIsTruncated(fallbackData);
          const fallbackElapsedMs=performance.now()-fallbackStarted;
          recordRouteBenchmark(activeModel(),routeScore(activeModel(),routePrompt,fallbackAnswer,fallbackElapsedMs));
          const fallbackElapsed=formatDuration(fallbackElapsedMs);
          const fallbackProof=noteAnswerProof(answerProofLine(fallbackData));
          const fallbackWriter=answerWriterProfile(fallbackData,activeModel());
          state.hostedRouteState='ready';
          updateMessage(userMessage,userMessage.content,{routeProvenance:'hosted-fallback',hostedLineage:true,hostedDeliveryState:'succeeded'});
          updateMessage(
            assistant,
            withTruncationGuard(fallbackAnswer,fallbackData)+'\n\nLocal model note: '+hint,
            {label:fallbackWriter.model_display_name,receipt:fallbackReceipt.text+' · Local fallback · '+fallbackElapsed+' · '+latencyTargetReceipt(activeModel(),fallbackElapsedMs)+(fallbackTruncated?' · truncated guard':'')+writerContinuityResetReceipt(fallbackData),proofLine:fallbackProof,intelligenceLabel:connectedIntelligenceLabel(fallbackData),answerWriter:fallbackWriter,answerState:'degraded',aiGenerated:fallbackWriter.type==='llm',truncated:fallbackTruncated,routeProvenance:'hosted-fallback',hostedLineage:true,hostedDeliveryState:'succeeded'}
          );
          captureInteraction(fallbackTruncated?'truncation_seen':'chat_fallback_ready',{
            active_model_id:activeModel()?.id||'',
            active_model_route:activeModel()?.route||'',
            original_route:'local',
            latency_ms:Math.round(fallbackElapsedMs),
            truncated:fallbackTruncated,
            hosted_delivery_state:'succeeded',
            writer_continuity_reset:Boolean(writerContinuityResetMetadata(fallbackData)),
            writer_continuity_reset_reason:writerContinuityResetMetadata(fallbackData)?.reason||''
          });
          status(answerStatus(activeModel(),routeScore(activeModel(),routePrompt,fallbackAnswer,fallbackElapsedMs),'Local fallback')+' · while local access waits for permission','ready');
          routeStatus(routeMicroStatus(activeModel()),fallbackReceipt.state);
        }catch(fallbackError){
          if(stopRequested||fallbackError?.name==='AbortError'){
            captureInteraction('chat_stopped',{active_model_id:model?.id||'',active_model_route:model?.route||'',phase:'fallback',hosted_delivery_state:'attempted-result-unknown'});
            updateMessage(userMessage,userMessage.content,{routeProvenance:'hosted-fallback-attempted',hostedLineage:false,hostedDeliveryState:'attempted-result-unknown'});
            updateMessage(assistant,CHAT_STATE.stoppedText?.()||'Svaret ble stoppet.',{receipt:receipt.text+' · Hosted fallback attempted · result unknown · stopped by user',answerState:'degraded',aiGenerated:false,routeProvenance:'hosted-fallback-attempted',hostedLineage:false,hostedDeliveryState:'attempted-result-unknown'});
            status(CHAT_STATE.stoppedText?.()||'Svaret ble stoppet.','idle');
            routeStatus('Hosted fallback attempted · result unknown · stopped','hosted');
            return;
          }
          updateMessage(userMessage,userMessage.content,{routeProvenance:'hosted-fallback-attempted',hostedLineage:false,hostedDeliveryState:'attempted-result-unknown'});
          updateMessage(assistant,hint+'\n\nSupergeni is still available from the model picker.',{receipt:receipt.text+' · Hosted fallback attempted · result unknown',answerState:'degraded',aiGenerated:false,routeProvenance:'hosted-fallback-attempted',hostedLineage:false,hostedDeliveryState:'attempted-result-unknown'});
          status('Chat failed: local node blocked/unavailable','error');
          captureInteraction('chat_failed',{reason:'local_and_fallback_unavailable',active_model_id:model?.id||'',hosted_delivery_state:'attempted-result-unknown'});
        }
      }else{
        state.hostedRouteState='degraded';
        recordRouteBenchmark(model,routeScore(model,routePrompt,'',0,true));
        updateMessage(userMessage,userMessage.content,{routeProvenance:'hosted-failed',hostedLineage:false});
        updateMessage(assistant,CHAT_STATE.errorText?.(error)||'Noe gikk galt mens svaret ble hentet. Prøv igjen.',{answerState:'degraded',aiGenerated:false,routeProvenance:'hosted-failed',hostedLineage:false});
        status(CHAT_STATE.errorText?.(error)||'Noe gikk galt mens svaret ble hentet. Prøv igjen.','error');
        captureInteraction('chat_failed',{reason:'api_unreachable',active_model_id:model?.id||''});
      }
    }finally{
      stopSlowNotice();
      finishResponse();
      input?.focus();
    }
  }

  async function compareLiveRoutes(comparePrompt='',preferredLocalModel=null,options={}){
    if(state.busy)return;
    if(gatewayComparePreferred(preferredLocalModel)){
      await compareGatewayRoutes(comparePrompt,options);
      return;
    }
    const mode=options.mode==='best-answer'?'best-answer':'compare';
    const title=mode==='best-answer'?'Best Answer':'Compare';
    const localModel=comparePartnerModel(preferredLocalModel);
    const input=document.getElementById('p0-input');
    const prompt=String(comparePrompt||input?.value||'').trim();
    if(!localModel){
      status('Oppdater AI først, så kan '+title+' bruke to AI-kilder.','error');
      input?.focus();
      return;
    }
    if(!prompt){
      status('Write a prompt first, then '+title+' can run.','error');
      input?.focus();
      return;
    }
    if(!await ensureHostedJourneyReady('compare')){
      input?.focus();
      return;
    }
    const signal=beginResponse();
    append('user',prompt,'You');
    input.value='';
    autosizeInput();
    const hostedModel=defaultHostedModel();
    if(hostedModel&&localModel&&hostedModel.id===localModel.id){
      status('Oppdater AI først, så kan '+title+' bruke to AI-kilder.','error');
      routeStatus('Two-model tools need another active model','error');
      finishResponse();
      input?.focus();
      return;
    }
    const hostedReceipt=routeReceipt(hostedModel);
    const localReceipt=routeReceipt(localModel);
    const localQualityNote=localModel.route==='local'&&wantsPublicFactRoute(prompt)?' · Local facts may be stale':'';
    const hostedMessage=append('assistant',CHAT_STATE.pending?.(hostedModel.label)||'Supergeni tenker …',hostedModel.label+' · Compare',hostedReceipt.text+' · Compare answer 1/2',{variant:'compare',retryPrompt:prompt,answerState:'pending',aiGenerated:false});
    const localMessage=append('assistant',CHAT_STATE.pending?.(localModel.label)||'Supergeni tenker …',localModel.label+' · Compare',localReceipt.text+' · Compare answer 2/2'+localQualityNote,{variant:'compare',retryPrompt:prompt,answerState:'pending',aiGenerated:false});
    let hostedAnswerText='';
    let localAnswerText='';
    let hostedScore=null;
    let localScore=null;
    let hostedElapsedMs=0;
    let localElapsedMs=0;
    let hostedFailed=false;
    let localFailed=false;
    let hostedProof=null;
    status(title+' is asking '+hostedModel.label+' and '+localModel.label+' in parallel...','ready');
    routeStatus(title+' · '+hostedModel.label+' + '+localModel.label,'ready');
    const hostedStarted=performance.now();
    const hostedJob=chatHostedData(prompt,signal,hostedModel)
      .then(data=>{
        hostedAnswerText=responseText(data)||'Supergeni returned an empty response.';
        hostedProof=answerProofLine(data);
        const hostedWriter=answerWriterProfile(data,hostedModel);
        hostedElapsedMs=performance.now()-hostedStarted;
        hostedScore=routeScore(hostedModel,prompt,hostedAnswerText,hostedElapsedMs,false,'compare');
        updateMessage(hostedMessage,hostedAnswerText,{label:hostedWriter.model_display_name,receipt:hostedReceipt.text+' · Compare answer 1/2 · '+scoreSummary(hostedScore),proofLine:hostedProof,answerWriter:hostedWriter,answerState:'live',aiGenerated:hostedWriter.type!=='capability',routeProvenance:'hosted-compare',hostedLineage:true});
      })
      .catch((error)=>{
        hostedFailed=true;
        hostedElapsedMs=performance.now()-hostedStarted;
        hostedScore=routeScore(hostedModel,prompt,'',hostedElapsedMs,true,'compare');
        updateMessage(hostedMessage,(stopRequested||error?.name==='AbortError')?(CHAT_STATE.stoppedText?.()||'Svaret ble stoppet.'):(CHAT_STATE.errorText?.(error)||'Noe gikk galt mens svaret ble hentet. Prøv igjen.'),{receipt:hostedReceipt.text+' · Compare answer 1/2 · '+scoreSummary(hostedScore),answerState:'degraded',aiGenerated:false,routeProvenance:'hosted-failed',hostedLineage:false});
      });
    const localStarted=performance.now();
    const localJob=chatRoute(prompt,localModel,signal)
      .then(answer=>{
        localAnswerText=answer||(localModel.route==='local'?'Local model returned an empty response.':localModel.label+' returned an empty response.');
        localElapsedMs=performance.now()-localStarted;
        localScore=routeScore(localModel,prompt,localAnswerText,localElapsedMs,false,'compare');
        updateMessage(localMessage,localAnswerText,{receipt:localReceipt.text+' · Compare answer 2/2'+localQualityNote+' · '+scoreSummary(localScore),answerState:localModel.route==='local'?'local':'live',aiGenerated:true,routeProvenance:localModel.route==='local'?'local-model':'hosted-compare',hostedLineage:localModel.route!=='local'});
      })
      .catch(error=>{
        localFailed=true;
        localElapsedMs=performance.now()-localStarted;
        localScore=routeScore(localModel,prompt,'',localElapsedMs,true,'compare');
        const errorText=localModel.route==='local'?localNetworkHint(error):(localModel.label+' did not answer this compare request. Try normal chat or refresh.');
        updateMessage(localMessage,(stopRequested||error?.name==='AbortError')?(CHAT_STATE.stoppedText?.()||'Svaret ble stoppet.'):errorText,{receipt:localReceipt.text+' · Compare answer 2/2'+localQualityNote+' · '+scoreSummary(localScore),answerState:'degraded',aiGenerated:false,routeProvenance:localModel.route==='local'?'local-failed':'hosted-failed',hostedLineage:false});
      });
    await Promise.allSettled([hostedJob,localJob]);
    if(stopRequested){
      status(title+' stopped.','idle');
      routeStatus('Stopped · compare routes cancelled','hosted');
      finishResponse();
      input?.focus();
      return;
    }
    let finalWinner=null;
    let scoringSource='local fallback score';
    try{
      const scoring=await scoreRoutesWithApi(prompt,hostedModel,hostedAnswerText,hostedElapsedMs,hostedFailed,localModel,localAnswerText,localElapsedMs,localFailed);
      hostedScore=apiScoreForModel(scoring,hostedModel,hostedScore);
      localScore=apiScoreForModel(scoring,localModel,localScore);
      recordRouteBenchmark(hostedModel,hostedScore);
      recordRouteBenchmark(localModel,localScore);
      finalWinner=apiWinner(scoring,hostedModel,hostedScore,localModel,localScore);
      scoringSource=API_LABEL+'/routing/score';
      updateMessage(hostedMessage,hostedAnswerText||'Supergeni did not answer this compare request. Try normal chat or refresh.',{receipt:hostedReceipt.text+' · Compare answer 1/2 · '+scoreSummary(hostedScore),proofLine:hostedProof,answerState:hostedAnswerText?'live':'degraded',aiGenerated:Boolean(hostedAnswerText),routeProvenance:hostedAnswerText?'hosted-compare':'hosted-failed',hostedLineage:Boolean(hostedAnswerText)});
      updateMessage(localMessage,localAnswerText||(localModel.route==='local'?localNetworkHint('Local model did not answer.'):localModel.label+' did not answer this compare request. Try normal chat or refresh.'),{receipt:localReceipt.text+' · Compare answer 2/2'+localQualityNote+' · '+scoreSummary(localScore),answerState:localAnswerText?(localModel.route==='local'?'local':'live'):'degraded',aiGenerated:Boolean(localAnswerText),routeProvenance:localAnswerText?(localModel.route==='local'?'local-model':'hosted-compare'):(localModel.route==='local'?'local-failed':'hosted-failed'),hostedLineage:Boolean(localAnswerText&&localModel.route!=='local')});
    }catch(error){
      recordRouteBenchmark(hostedModel,hostedScore);
      recordRouteBenchmark(localModel,localScore);
      finalWinner=winningRoute(hostedModel,hostedScore,localModel,localScore);
    }
    if(hostedAnswerText||localAnswerText){
      const winner=finalWinner||winningRoute(hostedModel,hostedScore,localModel,localScore);
      const synthesisReceipt=hostedReceipt.text+' · Best answer synthesis · No paid route · '+scoringSource+' · '+winner.summary;
      const synthesisMessage=append('assistant',CHAT_STATE.synthesizing?.()||'Supergeni velger beste svar …','Supergeni · Best answer',synthesisReceipt,{variant:'compare',retryPrompt:prompt,answerState:'pending',aiGenerated:false});
      const synthesisStarted=performance.now();
      try{
        const synthesisData=await synthesizeCompareAnswer(prompt,hostedAnswerText,localAnswerText,localModel,hostedScore,localScore,signal);
        const synthesis=responseText(synthesisData);
        const synthesisProof=noteAnswerProof(answerProofLine(synthesisData));
        const synthesisWriter=answerWriterProfile(synthesisData,hostedModel);
        const synthesisElapsedMs=performance.now()-synthesisStarted;
        updateMessage(synthesisMessage,synthesis||hostedAnswerText||localAnswerText,{label:synthesisWriter.model_display_name,receipt:synthesisReceipt+' · '+formatDuration(synthesisElapsedMs)+' · '+latencyTargetReceipt(hostedModel,synthesisElapsedMs,'synthesis'),proofLine:synthesisProof,answerWriter:synthesisWriter,answerState:synthesis?'live':'degraded',aiGenerated:synthesis?synthesisWriter.type!=='capability':Boolean(hostedAnswerText||localAnswerText),routeProvenance:synthesis?'hosted-synthesis':'synthesis-fallback',hostedLineage:Boolean(synthesis)});
      }catch(error){
        const fallbackAnswer=(stopRequested||error?.name==='AbortError')?'':(hostedAnswerText||localAnswerText);
        updateMessage(synthesisMessage,(stopRequested||error?.name==='AbortError')?(CHAT_STATE.stoppedText?.()||'Svaret ble stoppet.'):(fallbackAnswer||(CHAT_STATE.errorText?.(error)||'Noe gikk galt mens svaret ble hentet. Prøv igjen.')),{receipt:synthesisReceipt+' · '+((stopRequested||error?.name==='AbortError')?'stopped':'failed'),answerState:'degraded',aiGenerated:Boolean(fallbackAnswer),routeProvenance:'synthesis-fallback',hostedLineage:false});
      }
      if(stopRequested){
        status(title+' stopped.','idle');
        routeStatus('Stopped · compare routes cancelled','hosted');
        finishResponse();
        input?.focus();
        return;
      }
      routeStatus(title+' · '+winner.summary,'ready');
    }
    status(title+' finished: '+(finalWinner?.summary||'two-route check complete')+'.','ready');
    finishResponse();
    input?.focus();
  }

  function maybeAutoCheckLocal(){
    const params=new URLSearchParams(location.search);
    const hash=String(location.hash||'').toLowerCase();
    const shouldCheck=params.get('mmir_local_return')==='1'||params.get('local_node_ready')==='1'||hash.includes('local');
    if(!shouldCheck)return false;
    window.MimirAllowLocalProbes?.('p0-local-return',60000);
    checkLocalModels({quiet:false}).catch(()=>{});
    return true;
  }

  function maybeAutoAttachPairedLocal(){
    if(!hasLocalPairingToken())return;
    window.MimirAllowLocalProbes?.('p0-paired-local-resume',30000);
    checkLocalModels({quiet:true}).then(models=>{
      if(!Array.isArray(models)||!models.length)return;
      routeStatus('Local node ready · '+models.length+' model'+(models.length===1?'':'s')+' · Private · This Mac','local');
    }).catch(()=>{});
  }

  function boot(){
    if(window.MimirChatRuntimeBridge){
      window.MimirChatRuntimeBridge.openFeedbackInbox=openFeedbackInbox;
      window.MimirChatRuntimeBridge.saveFeedbackDraft=saveFeedbackDraft;
    }
    installShell();
    enforceShellStyles();
    window.addEventListener('mimir-brand-config-applied',syncAiDisclosureComposer);
    status('Sjekker offentlig svarbane …','loading');
    renderReleaseReadiness();
    updateSendControl();
    refreshHostedModels().catch(()=>{});
    if(!hostedReadinessTimer){
      hostedReadinessTimer=window.setInterval(()=>{
        if(document.visibilityState&&document.visibilityState!=='visible')return;
        refreshHostedModels().catch(()=>{});
      },RELEASE_BACKGROUND_REFRESH_MS);
    }
    refreshPromptPresets().catch(()=>{});
    if(!maybeAutoCheckLocal())maybeAutoAttachPairedLocal();
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
