(function(){
  const WORKSPACES_KEY='mimir-workspaces-v1';
  const ACTIVE_WORKSPACE_KEY='mimir-active-workspace-v1';
  const DEFAULT_WORKSPACE_ID='personal';
  const CHAT_PREFIX='mimir-chat-current-session-v1:';
  const LEGACY_CHAT_KEY='mimir-chat-current-session-v1';
  const CONVERSATION_PREFIX='mimir-conversations-v1:';
  const ACTIVE_CONVERSATION_PREFIX='mimir-active-conversation-v1:';
  const MEMORY_PREFIX='mimir-memory-v1:';
  const MEMORY_USE_PREFIX='mimir-memory-use-v1:';
  const KNOWLEDGE_PREFIX='mimir-knowledge-v1:';
  const COLLECTIONS_PREFIX='mimir-knowledge-collections-v1:';
  const ARTIFACT_PREFIX='mimir-artifacts-v1:';
  const PROMPT_PREFIX='mimir-prompts-v1:';
  const ASSISTANT_PREFIX='mimir-assistants-v1:';
  const ACTIVE_ASSISTANT_PREFIX='mimir-active-assistant-v1:';
  const TOOL_GALLERY_PREFIX='mimir-tool-gallery-v1:';
  const RESEARCH_PREFIX='mimir-research-plans-v1:';
  const DATA_ANALYSIS_PREFIX='mimir-data-analysis-v1:';
  const SCHEDULED_TASKS_PREFIX='mimir-scheduled-tasks-v1:';
  const CONNECTOR_PLANS_PREFIX='mimir-connector-plans-v1:';
  const SHARE_PREFIX='mimir-share-bundles-v1:';
  const PROFILE_KEY='mimir-chat-backend-profiles';
  const ACTIVE_BACKEND_KEY='mimir-chat-active-backend';
  const MODE_KEY='mimir-chat-mode-controls-v1';
  const ROLE_KEY='mimir-chat-active-role';
  const SELECTED_MODEL_KEY='mimir-chat-selected-model';
  const LIVE_MODELS_KEY='mimir-chat-live-models';
  const RUNTIME_SETTINGS_KEY='mimir-runtime-settings-v1';
  const FIRST_CHAT_RECEIPT_PREFIX='mimir-first-chat-receipt-v1:';
  const ACTIVATION_EVENTS_PREFIX='mimir-activation-events-v1:';
  const AUTOPILOT_PREFIX='mimir-activation-autopilot-v1:';
  const DEMO_KEY='mimir-demo-mode-v1';
  const WELCOME_KEY='mimir-demo-welcome-shown-v1';
  const GROWTH_EVENTS_KEY='mimir-growth-events-v1';
  const GROWTH_SESSION_KEY='mimir-growth-session-v1';
  const VOICE_SETTINGS_KEY='mimir-voice-settings-v1';
  const TOKEN_PREFIX='mimir-local-node-token:';
  const PAIRING_CODE_PREFIX='mimir-local-node-pairing-code:';
  const api=window.MimirApiClient;
  const host=document.querySelector('#multi-model-workspace .mimir-dashboard');
  let statusEl=null;
  let summaryEl=null;
  let inventoryEl=null;
  let deleteWorkspaceArmed=false;
  let deleteAllArmed=false;
  let deleteTimer=null;

  if(!host)return;

  const LOCAL_EXACT_KEYS=[
    WORKSPACES_KEY,
    ACTIVE_WORKSPACE_KEY,
    LEGACY_CHAT_KEY,
    PROFILE_KEY,
    ACTIVE_BACKEND_KEY,
    MODE_KEY,
    ROLE_KEY,
    SELECTED_MODEL_KEY,
    RUNTIME_SETTINGS_KEY,
    LIVE_MODELS_KEY,
    DEMO_KEY,
    WELCOME_KEY,
    GROWTH_EVENTS_KEY,
    VOICE_SETTINGS_KEY
  ];
  const LOCAL_PREFIXES=[CHAT_PREFIX,CONVERSATION_PREFIX,ACTIVE_CONVERSATION_PREFIX,MEMORY_PREFIX,MEMORY_USE_PREFIX,KNOWLEDGE_PREFIX,COLLECTIONS_PREFIX,ARTIFACT_PREFIX,PROMPT_PREFIX,ASSISTANT_PREFIX,ACTIVE_ASSISTANT_PREFIX,TOOL_GALLERY_PREFIX,RESEARCH_PREFIX,DATA_ANALYSIS_PREFIX,SCHEDULED_TASKS_PREFIX,CONNECTOR_PLANS_PREFIX,SHARE_PREFIX,FIRST_CHAT_RECEIPT_PREFIX,ACTIVATION_EVENTS_PREFIX,AUTOPILOT_PREFIX];
  const SESSION_EXACT_KEYS=[GROWTH_SESSION_KEY];
  const SESSION_PREFIXES=[TOKEN_PREFIX,PAIRING_CODE_PREFIX];

  function workspaceId(){return localStorage.getItem(ACTIVE_WORKSPACE_KEY)||DEFAULT_WORKSPACE_ID;}

  function safe(value){
    return String(value||'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  }

  function workspaceName(id=workspaceId()){
    try{
      const workspaces=JSON.parse(localStorage.getItem(WORKSPACES_KEY)||'[]');
      if(Array.isArray(workspaces)){
        const active=workspaces.find(item=>item?.id===id);
        if(active?.name)return String(active.name);
      }
    }catch(error){}
    return id===DEFAULT_WORKSPACE_ID?'Personal':id;
  }

  function readJson(key,fallback){
    try{
      const value=JSON.parse(localStorage.getItem(key)||'null');
      return value ?? fallback;
    }catch(error){
      return fallback;
    }
  }

  function readSessionJson(key,fallback){
    try{
      const value=JSON.parse(sessionStorage.getItem(key)||'null');
      return value ?? fallback;
    }catch(error){
      return fallback;
    }
  }

  function storageKeys(storage){
    const keys=[];
    try{
      for(let index=0;index<storage.length;index+=1){
        const key=storage.key(index);
        if(key)keys.push(key);
      }
    }catch(error){}
    return keys;
  }

  function localKeys(){
    return storageKeys(localStorage);
  }

  function sessionKeys(){
    return storageKeys(sessionStorage);
  }

  function keysByPrefix(keys,prefix){
    return keys.filter(key=>key.startsWith(prefix));
  }

  function keysByExact(keys,exact){
    return exact.filter(key=>keys.includes(key));
  }

  function valueFor(storage,key){
    try{return storage.getItem(key)||'';}
    catch(error){return '';}
  }

  function storageSize(storage,keys){
    return keys.reduce((total,key)=>total+key.length+valueFor(storage,key).length,0);
  }

  function formatBytes(chars){
    const bytes=chars*2;
    if(bytes<1024)return bytes+' B';
    if(bytes<1024*1024)return (bytes/1024).toFixed(bytes<10240?1:0)+' KB';
    return (bytes/(1024*1024)).toFixed(1)+' MB';
  }

  function countArrayKeys(storage,keys){
    return keys.reduce((total,key)=>{
      try{
        const value=JSON.parse(storage.getItem(key)||'null');
        return total+(Array.isArray(value)?value.length:(value?1:0));
      }catch(error){
        return total+(storage.getItem(key)?1:0);
      }
    },0);
  }

  function chatKey(id=workspaceId()){
    return CHAT_PREFIX+id;
  }

  function workspaceSnapshot(id=workspaceId()){
    const chat=readJson(chatKey(id),id===DEFAULT_WORKSPACE_ID?readJson(LEGACY_CHAT_KEY,[]):[]);
    const memory=readJson(MEMORY_PREFIX+id,[]);
    const memoryUse=readJson(MEMORY_USE_PREFIX+id,[]);
    const knowledge=readJson(KNOWLEDGE_PREFIX+id,[]);
    const knowledgeCollections=readJson(COLLECTIONS_PREFIX+id,[]);
    const conversations=readJson(CONVERSATION_PREFIX+id,[]);
    const artifacts=readJson(ARTIFACT_PREFIX+id,[]);
    const prompts=readJson(PROMPT_PREFIX+id,[]);
    const assistants=readJson(ASSISTANT_PREFIX+id,[]);
    const activeAssistant=readJson(ACTIVE_ASSISTANT_PREFIX+id,null);
    const toolGallery=readJson(TOOL_GALLERY_PREFIX+id,{});
    const researchPlans=readJson(RESEARCH_PREFIX+id,[]);
    const dataAnalyses=readJson(DATA_ANALYSIS_PREFIX+id,[]);
    const scheduledTasks=readJson(SCHEDULED_TASKS_PREFIX+id,[]);
    const connectorPlans=readJson(CONNECTOR_PLANS_PREFIX+id,[]);
    const shareBundles=readJson(SHARE_PREFIX+id,[]);
    const firstChatReceipt=readJson(FIRST_CHAT_RECEIPT_PREFIX+id,null);

    return {
      exported_at:new Date().toISOString(),
      workspace:{id,name:workspaceName(id)},
      local_only:true,
      excludes:['pairing tokens','MMIR session tokens','invite codes','provider keys','managed backend data'],
      chat:Array.isArray(chat)?chat:[],
      conversations:Array.isArray(conversations)?conversations:[],
      artifacts:Array.isArray(artifacts)?artifacts:[],
      prompts:Array.isArray(prompts)?prompts:[],
      assistants:Array.isArray(assistants)?assistants:[],
      active_assistant:activeAssistant&&typeof activeAssistant==='object'?activeAssistant:null,
      tool_gallery:toolGallery&&typeof toolGallery==='object'&&!Array.isArray(toolGallery)?toolGallery:{},
      research_plans:Array.isArray(researchPlans)?researchPlans:[],
      data_analyses:Array.isArray(dataAnalyses)?dataAnalyses:[],
      scheduled_tasks:Array.isArray(scheduledTasks)?scheduledTasks:[],
      connector_plans:Array.isArray(connectorPlans)?connectorPlans:[],
      share_bundles:Array.isArray(shareBundles)?shareBundles:[],
      first_chat_receipt:firstChatReceipt&&typeof firstChatReceipt==='object'?firstChatReceipt:null,
      memory:Array.isArray(memory)?memory:[],
      memory_use:Array.isArray(memoryUse)?memoryUse:[],
      knowledge:Array.isArray(knowledge)?knowledge:[],
      knowledge_collections:Array.isArray(knowledgeCollections)?knowledgeCollections:[]
    };
  }

  function counts(snapshot=workspaceSnapshot()){
    return {
      chat:snapshot.chat.length,
      artifacts:snapshot.artifacts.length,
      prompts:snapshot.prompts.length,
      assistants:snapshot.assistants.length,
      active_assistant:snapshot.active_assistant?1:0,
      tool_gallery:Object.keys(snapshot.tool_gallery).length,
      research_plans:snapshot.research_plans.length,
      data_analyses:snapshot.data_analyses.length,
      scheduled_tasks:snapshot.scheduled_tasks.length,
      connector_plans:snapshot.connector_plans.length,
      share_bundles:snapshot.share_bundles.length,
      first_chat_receipt:snapshot.first_chat_receipt?1:0,
      memory:snapshot.memory.length,
      memory_use:snapshot.memory_use.length,
      knowledge:snapshot.knowledge.length,
      knowledge_collections:snapshot.knowledge_collections.length
    };
  }

  function setStatus(message,state){
    if(statusEl){
      statusEl.textContent=message||'';
      statusEl.dataset.state=state||'idle';
    }
  }

  function activeBackendCount(){
    const profiles=readJson(PROFILE_KEY,[]);
    const activeId=localStorage.getItem(ACTIVE_BACKEND_KEY)||'';
    return Array.isArray(profiles)&&activeId&&profiles.some(profile=>profile?.id===activeId)?1:0;
  }

  function inventory(){
    const local=localKeys();
    const session=sessionKeys();
    const chatKeys=[
      ...keysByPrefix(local,CHAT_PREFIX),
      ...(local.includes(LEGACY_CHAT_KEY)?[LEGACY_CHAT_KEY]:[])
    ];
    const memoryKeys=keysByPrefix(local,MEMORY_PREFIX);
    const memoryUseKeys=keysByPrefix(local,MEMORY_USE_PREFIX);
    const knowledgeKeys=keysByPrefix(local,KNOWLEDGE_PREFIX);
    const knowledgeCollectionKeys=keysByPrefix(local,COLLECTIONS_PREFIX);
    const artifactKeys=keysByPrefix(local,ARTIFACT_PREFIX);
    const promptKeys=keysByPrefix(local,PROMPT_PREFIX);
    const assistantKeys=[
      ...keysByPrefix(local,ASSISTANT_PREFIX),
      ...keysByPrefix(local,ACTIVE_ASSISTANT_PREFIX)
    ];
    const toolGalleryKeys=keysByPrefix(local,TOOL_GALLERY_PREFIX);
    const researchKeys=keysByPrefix(local,RESEARCH_PREFIX);
    const dataAnalysisKeys=keysByPrefix(local,DATA_ANALYSIS_PREFIX);
    const scheduledTaskKeys=keysByPrefix(local,SCHEDULED_TASKS_PREFIX);
    const connectorPlanKeys=keysByPrefix(local,CONNECTOR_PLANS_PREFIX);
    const shareBundleKeys=keysByPrefix(local,SHARE_PREFIX);
    const firstChatReceiptKeys=keysByPrefix(local,FIRST_CHAT_RECEIPT_PREFIX);
    const activationEventKeys=keysByPrefix(local,ACTIVATION_EVENTS_PREFIX);
    const autopilotKeys=keysByPrefix(local,AUTOPILOT_PREFIX);
    const conversationKeys=[
      ...keysByPrefix(local,CONVERSATION_PREFIX),
      ...keysByPrefix(local,ACTIVE_CONVERSATION_PREFIX)
    ];
    const workspaceKeys=keysByExact(local,[WORKSPACES_KEY,ACTIVE_WORKSPACE_KEY]);
    const backendProfileKeys=keysByExact(local,[PROFILE_KEY,ACTIVE_BACKEND_KEY]);
    const preferenceKeys=keysByExact(local,[MODE_KEY,ROLE_KEY,SELECTED_MODEL_KEY,RUNTIME_SETTINGS_KEY,VOICE_SETTINGS_KEY]);
    const modelCacheKeys=keysByExact(local,[LIVE_MODELS_KEY]);
    const growthKeys=keysByExact(local,[DEMO_KEY,WELCOME_KEY,GROWTH_EVENTS_KEY]);
    const pairingKeys=[
      ...keysByPrefix(session,TOKEN_PREFIX),
      ...keysByPrefix(session,PAIRING_CODE_PREFIX)
    ];
    const transientSessionKeys=keysByExact(session,[GROWTH_SESSION_KEY]);
    const managedSession=api?.activeManagedSession?.();

    return [
      {
        id:'workspace-chat',
        label:'Workspace chat',
        location:'Browser localStorage',
        count:countArrayKeys(localStorage,chatKeys),
        size:formatBytes(storageSize(localStorage,chatKeys)),
        retention:'Until the user exports or deletes it.',
        action:'Export/delete active workspace or clear all MMIR local data.',
        keys:chatKeys
      },
      {
        id:'conversation-library',
        label:'Conversation library',
        location:'Browser localStorage',
        count:countArrayKeys(localStorage,conversationKeys),
        size:formatBytes(storageSize(localStorage,conversationKeys)),
        retention:'Until exported, archived, deleted by browser reset or cleared with all MMIR data.',
        action:'Manage saved chats in Conversations or clear all MMIR local data.',
        keys:conversationKeys
      },
      {
        id:'artifact-workspace',
        label:'Artifact workspace',
        location:'Browser localStorage',
        count:countArrayKeys(localStorage,artifactKeys),
        size:formatBytes(storageSize(localStorage,artifactKeys)),
        retention:'Until exported, deleted by workspace reset or cleared with all MMIR data.',
        action:'Manage artifacts in Canvas or export/delete active workspace data.',
        keys:artifactKeys
      },
      {
        id:'prompt-library',
        label:'Prompt library',
        location:'Browser localStorage',
        count:countArrayKeys(localStorage,promptKeys),
        size:formatBytes(storageSize(localStorage,promptKeys)),
        retention:'Until exported, deleted by workspace reset or cleared with all MMIR data.',
        action:'Manage prompts in the Prompts panel or export/delete active workspace data.',
        keys:promptKeys
      },
      {
        id:'assistant-library',
        label:'Assistant library',
        location:'Browser localStorage',
        count:countArrayKeys(localStorage,assistantKeys),
        size:formatBytes(storageSize(localStorage,assistantKeys)),
        retention:'Reusable assistant definitions stay local unless synced to a protected backend.',
        action:'Manage assistants in Assistants or export/delete active workspace data.',
        keys:assistantKeys
      },
      {
        id:'tool-gallery',
        label:'Tool/plugin gallery',
        location:'Browser localStorage',
        count:countArrayKeys(localStorage,toolGalleryKeys),
        size:formatBytes(storageSize(localStorage,toolGalleryKeys)),
        retention:'Workspace-level enable/disable preferences for approved tools and connectors.',
        action:'Use Tools gallery or clear workspace/all local data.',
        keys:toolGalleryKeys
      },
      {
        id:'research-plans',
        label:'Research plans',
        location:'Browser localStorage',
        count:countArrayKeys(localStorage,researchKeys),
        size:formatBytes(storageSize(localStorage,researchKeys)),
        retention:'Planning-only research steps, gates and citation labels stay local until exported or cleared.',
        action:'Use Research planning or export/delete active workspace data.',
        keys:researchKeys
      },
      {
        id:'data-analysis',
        label:'Data analysis snapshots',
        location:'Browser localStorage',
        count:countArrayKeys(localStorage,dataAnalysisKeys),
        size:formatBytes(storageSize(localStorage,dataAnalysisKeys)),
        retention:'Browser-only summaries and sampled rows stay local until exported or cleared.',
        action:'Manage snapshots in Data Analysis or export/delete active workspace data.',
        keys:dataAnalysisKeys
      },
      {
        id:'scheduled-tasks',
        label:'Scheduled tasks',
        location:'Browser localStorage',
        count:countArrayKeys(localStorage,scheduledTaskKeys),
        size:formatBytes(storageSize(localStorage,scheduledTaskKeys)),
        retention:'Visible reminders, schedules and run logs stay local until cancelled, exported or cleared.',
        action:'Manage reminders in Scheduled Tasks or export/delete active workspace data.',
        keys:scheduledTaskKeys
      },
      {
        id:'connector-plans',
        label:'Connector sync plans',
        location:'Browser localStorage',
        count:countArrayKeys(localStorage,connectorPlanKeys),
        size:formatBytes(storageSize(localStorage,connectorPlanKeys)),
        retention:'Connector catalog plans and revocation records stay local until exported, revoked or cleared.',
        action:'Use Connectors to plan/revoke local connector metadata or export/delete active workspace data.',
        keys:connectorPlanKeys
      },
      {
        id:'share-bundles',
        label:'Safe share bundles',
        location:'Browser localStorage',
        count:countArrayKeys(localStorage,shareBundleKeys),
        size:formatBytes(storageSize(localStorage,shareBundleKeys)),
        retention:'Redacted share previews stay local until exported, copied, deleted or cleared.',
        action:'Use Safe Sharing or export/delete active workspace data.',
        keys:shareBundleKeys
      },
      {
        id:'first-chat-receipt',
        label:'First chat receipt',
        location:'Browser localStorage',
        count:countArrayKeys(localStorage,firstChatReceiptKeys),
        size:formatBytes(storageSize(localStorage,firstChatReceiptKeys)),
        retention:'Until workspace reset/delete or all MMIR browser data is cleared.',
        action:'Stores status, model, route and character counts only; raw_prompt_stored:false and raw_response_stored:false.',
        keys:firstChatReceiptKeys
      },
      {
        id:'activation-telemetry',
        label:'Activation telemetry',
        location:'Browser localStorage',
        count:countArrayKeys(localStorage,activationEventKeys),
        size:formatBytes(storageSize(localStorage,activationEventKeys)),
        retention:'Bounded local timeline per workspace until cleared with workspace/all MMIR browser data.',
        action:'Stores activation event type, status, model label, route label and character counts only; raw_prompt_stored:false, raw_response_stored:false, secrets_stored:false.',
        keys:activationEventKeys
      },
      {
        id:'activation-autopilot',
        label:'Activation autopilot',
        location:'Browser localStorage',
        count:countArrayKeys(localStorage,autopilotKeys),
        size:formatBytes(storageSize(localStorage,autopilotKeys)),
        retention:'Latest safe automatic activation repair state per workspace until cleared.',
        action:'Stores run counts and safe action names only; no paid routes, provider secrets, raw prompts or raw responses.',
        keys:autopilotKeys
      },
      {
        id:'workspace-memory',
        label:'Workspace memory',
        location:'Browser localStorage',
        count:countArrayKeys(localStorage,memoryKeys),
        size:formatBytes(storageSize(localStorage,memoryKeys)),
        retention:'Until disabled, scoped, expired, edited, exported or deleted.',
        action:'Manage memory review, scope, expiration and notes from Memory.',
        keys:memoryKeys
      },
      {
        id:'memory-use-review',
        label:'Memory use review',
        location:'Browser localStorage',
        count:countArrayKeys(localStorage,memoryUseKeys),
        size:formatBytes(storageSize(localStorage,memoryUseKeys)),
        retention:'Last-message transparency only; overwritten by the next chat context build.',
        action:'Review why memory was used in Memory or delete workspace/all local data.',
        keys:memoryUseKeys
      },
      {
        id:'workspace-knowledge',
        label:'Workspace knowledge',
        location:'Browser localStorage',
        count:countArrayKeys(localStorage,knowledgeKeys),
        size:formatBytes(storageSize(localStorage,knowledgeKeys)),
        retention:'Text extracts stay local unless synced to a protected backend.',
        action:'Export/delete active workspace or clear all MMIR local data.',
        keys:knowledgeKeys
      },
      {
        id:'knowledge-collections',
        label:'Knowledge collections',
        location:'Browser localStorage',
        count:countArrayKeys(localStorage,knowledgeCollectionKeys),
        size:formatBytes(storageSize(localStorage,knowledgeCollectionKeys)),
        retention:'Collection names and enable/disable scope stay local with the workspace.',
        action:'Use Knowledge collection toggles or export/delete active workspace data.',
        keys:knowledgeCollectionKeys
      },
      {
        id:'workspaces',
        label:'Workspaces',
        location:'Browser localStorage',
        count:countArrayKeys(localStorage,workspaceKeys),
        size:formatBytes(storageSize(localStorage,workspaceKeys)),
        retention:'Until the browser data is cleared.',
        action:'Clear all MMIR local data to reset workspace state.',
        keys:workspaceKeys
      },
      {
        id:'backend-profiles',
        label:'Backend profiles',
        location:'Browser localStorage',
        count:countArrayKeys(localStorage,backendProfileKeys),
        size:formatBytes(storageSize(localStorage,backendProfileKeys)),
        retention:'Endpoint metadata only. Provider secrets must stay outside the public site.',
        action:activeBackendCount()?'Active profile can be refreshed or removed from Connect Model.':'Create or remove profiles from Connect Model.',
        keys:backendProfileKeys
      },
      {
        id:'preferences',
        label:'Modes, role, selected model, runtime settings and voice settings',
        location:'Browser localStorage',
        count:countArrayKeys(localStorage,preferenceKeys),
        size:formatBytes(storageSize(localStorage,preferenceKeys)),
        retention:'Until changed or reset.',
        action:'Clear all MMIR local data to reset preferences.',
        keys:preferenceKeys
      },
      {
        id:'model-cache',
        label:'Live model cache',
        location:'Browser localStorage',
        count:countArrayKeys(localStorage,modelCacheKeys),
        size:formatBytes(storageSize(localStorage,modelCacheKeys)),
        retention:'Refreshes when the active backend exposes models.',
        action:'Refresh local node/backend model discovery.',
        keys:modelCacheKeys
      },
      {
        id:'demo-analytics',
        label:'Demo and growth events',
        location:'Browser localStorage',
        count:countArrayKeys(localStorage,growthKeys),
        size:formatBytes(storageSize(localStorage,growthKeys)),
        retention:'Bounded local event buffer for product analytics demos.',
        action:'Clear all MMIR local data to remove local event history.',
        keys:growthKeys
      },
      {
        id:'pairing-tokens',
        label:'Pairing tokens',
        location:'Browser sessionStorage',
        count:pairingKeys.length,
        size:formatBytes(storageSize(sessionStorage,pairingKeys)),
        retention:'Temporary for this browser tab/session.',
        action:'Use Clear pairing tokens after changing trusted node access.',
        keys:pairingKeys
      },
      {
        id:'managed-session-token',
        label:'MMIR managed session token',
        location:'Current tab memory only',
        count:managedSession?.token_available?1:0,
        size:'Not persisted',
        retention:'Only until page refresh, tab close or explicit clear.',
        action:'Activate from Identity or Safe Sharing when needed; clear from Safe Sharing. It is never exported.',
        keys:[]
      },
      {
        id:'session-state',
        label:'Transient session state',
        location:'Browser sessionStorage',
        count:transientSessionKeys.length,
        size:formatBytes(storageSize(sessionStorage,transientSessionKeys)),
        retention:'Temporary for this browser tab/session.',
        action:'Cleared automatically with the tab or through all-data reset.',
        keys:transientSessionKeys
      },
      {
        id:'managed-backend',
        label:'Managed backend data',
        location:'Protected backend only',
        count:activeBackendCount(),
        size:'Not stored here',
        retention:'Owned by protected API policy, export/delete via backend data routes.',
        action:'Public frontend never owns backend secrets, raw provider credentials or organization authority.',
        keys:[]
      },
      {
        id:'organization-identity',
        label:'Organization identity, sessions and invites',
        location:'Protected backend only',
        count:activeBackendCount(),
        size:'Not stored here',
        retention:'Organization membership, roles, hashed session tokens and hashed invite codes stay behind /identity/*.',
        action:'Manage Identity / Organizations through a protected backend profile; one-time tokens/codes are shown only in memory and are not exported from local workspace JSON.',
        keys:[]
      },
      {
        id:'provider-keys',
        label:'Provider keys and cloud credentials',
        location:'Never in public frontend',
        count:0,
        size:'0 B',
        retention:'Must live in protected backend, local OS vault or user-owned runtime.',
        action:'Do not paste provider keys into GitHub Pages or browser localStorage.',
        keys:[]
      }
    ];
  }

  function renderSummary(){
    if(!summaryEl)return;
    const activeCounts=counts();
    summaryEl.innerHTML='';
    [
      ['Chat messages',activeCounts.chat],
      ['Prompts',activeCounts.prompts],
      ['Assistants',activeCounts.assistants+activeCounts.active_assistant],
      ['Tool toggles',activeCounts.tool_gallery],
      ['Research plans',activeCounts.research_plans],
      ['Data analyses',activeCounts.data_analyses],
      ['Tasks',activeCounts.scheduled_tasks],
      ['Connector plans',activeCounts.connector_plans],
      ['Share bundles',activeCounts.share_bundles],
      ['First chat receipt',activeCounts.first_chat_receipt],
      ['Memory items',activeCounts.memory],
      ['Memory use',activeCounts.memory_use],
      ['Knowledge files',activeCounts.knowledge],
      ['Collections',activeCounts.knowledge_collections]
    ].forEach(([label,value])=>{
      const item=document.createElement('span');
      const strong=document.createElement('strong');
      strong.textContent=String(value);
      const small=document.createElement('small');
      small.textContent=label;
      item.append(strong,small);
      summaryEl.appendChild(item);
    });
  }

  function renderInventory(){
    if(!inventoryEl)return;
    inventoryEl.innerHTML=inventory().map(item=>''+
      '<article class="privacy-inventory-card" data-inventory-item="'+safe(item.id)+'">'+
        '<header>'+
          '<strong>'+safe(item.label)+'</strong>'+
          '<span>'+safe(item.location)+'</span>'+
        '</header>'+
        '<dl>'+
          '<div><dt>Items</dt><dd>'+safe(item.count)+'</dd></div>'+
          '<div><dt>Size</dt><dd>'+safe(item.size)+'</dd></div>'+
          '<div><dt>Retention</dt><dd>'+safe(item.retention)+'</dd></div>'+
          '<div><dt>Control</dt><dd>'+safe(item.action)+'</dd></div>'+
        '</dl>'+
      '</article>').join('');
  }

  function refresh(){
    renderSummary();
    renderInventory();
  }

  function downloadJson(){
    const snapshot=workspaceSnapshot();
    const blob=new Blob([JSON.stringify(snapshot,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const link=document.createElement('a');
    link.href=url;
    link.download='mmir-'+snapshot.workspace.id+'-workspace-export.json';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setStatus('Workspace data exported. Pairing tokens and provider keys are excluded.','ready');
  }

  async function copyJson(){
    try{
      await navigator.clipboard.writeText(JSON.stringify(workspaceSnapshot(),null,2));
      setStatus('Workspace data copied. Pairing tokens and provider keys are excluded.','ready');
    }catch(error){
      setStatus('Clipboard access was blocked. Use export instead.','error');
    }
  }

  function clearDeleteArm(){
    deleteWorkspaceArmed=false;
    deleteAllArmed=false;
    clearTimeout(deleteTimer);
  }

  function arm(button,kind,message,timeoutMessage){
    clearDeleteArm();
    if(kind==='workspace')deleteWorkspaceArmed=true;
    if(kind==='all')deleteAllArmed=true;
    button.dataset.originalLabel=button.dataset.originalLabel||button.textContent;
    button.textContent=kind==='workspace'?'Confirm delete':'Confirm reset';
    setStatus(message,'warning');
    deleteTimer=setTimeout(()=>{
      clearDeleteArm();
      button.textContent=button.dataset.originalLabel;
      setStatus(timeoutMessage,'idle');
    },8000);
  }

  function notifyDataChanged(){
    const id=workspaceId();
    window.dispatchEvent(new CustomEvent('mmir-chat-history-updated',{detail:{workspaceId:id}}));
    window.dispatchEvent(new CustomEvent('mmir-memory-updated',{detail:{workspaceId:id}}));
    window.dispatchEvent(new CustomEvent('mmir-memory-use-updated',{detail:{workspaceId:id,count:0}}));
    window.dispatchEvent(new CustomEvent('mmir-tool-gallery-updated',{detail:{workspaceId:id}}));
    window.dispatchEvent(new CustomEvent('mmir-assistants-updated',{detail:{workspaceId:id,count:0}}));
    window.dispatchEvent(new CustomEvent('mmir-research-plans-updated',{detail:{workspaceId:id,count:0}}));
    window.dispatchEvent(new CustomEvent('mmir-data-analysis-updated',{detail:{workspaceId:id,count:0}}));
    window.dispatchEvent(new CustomEvent('mmir-scheduled-tasks-updated',{detail:{workspaceId:id,count:0}}));
    window.dispatchEvent(new CustomEvent('mmir-connector-plans-updated',{detail:{workspaceId:id,count:0}}));
    window.dispatchEvent(new CustomEvent('mmir-share-bundles-updated',{detail:{workspaceId:id,count:0}}));
    window.dispatchEvent(new CustomEvent('mmir-first-chat-receipt-updated',{detail:{workspaceId:id,status:'cleared'}}));
    window.dispatchEvent(new CustomEvent('mmir-knowledge-updated',{detail:{workspaceId:id}}));
    window.dispatchEvent(new CustomEvent('mmir-knowledge-collections-updated',{detail:{workspaceId:id}}));
    window.dispatchEvent(new CustomEvent('mmir-workspace-changed',{detail:{id,name:workspaceName(id)}}));
    window.dispatchEvent(new CustomEvent('mmir-backend-profiles-updated'));
    window.dispatchEvent(new CustomEvent('mmir-active-model-changed',{detail:{id:'',label:''}}));
  }

  function deleteWorkspaceData(button){
    if(!deleteWorkspaceArmed){
      arm(button,'workspace','Click again to delete local chat, memory, knowledge and collections for this workspace.','Workspace delete cancelled.');
      return;
    }

    clearDeleteArm();
    localStorage.removeItem(chatKey());
    if(workspaceId()===DEFAULT_WORKSPACE_ID)localStorage.removeItem(LEGACY_CHAT_KEY);
    localStorage.removeItem(CONVERSATION_PREFIX+workspaceId());
    localStorage.removeItem(ACTIVE_CONVERSATION_PREFIX+workspaceId());
    localStorage.removeItem(ARTIFACT_PREFIX+workspaceId());
    localStorage.removeItem(PROMPT_PREFIX+workspaceId());
    localStorage.removeItem(ASSISTANT_PREFIX+workspaceId());
    localStorage.removeItem(ACTIVE_ASSISTANT_PREFIX+workspaceId());
    localStorage.removeItem(TOOL_GALLERY_PREFIX+workspaceId());
    localStorage.removeItem(DATA_ANALYSIS_PREFIX+workspaceId());
    localStorage.removeItem(SCHEDULED_TASKS_PREFIX+workspaceId());
    localStorage.removeItem(CONNECTOR_PLANS_PREFIX+workspaceId());
    localStorage.removeItem(SHARE_PREFIX+workspaceId());
    localStorage.removeItem(FIRST_CHAT_RECEIPT_PREFIX+workspaceId());
    localStorage.removeItem(ACTIVATION_EVENTS_PREFIX+workspaceId());
    localStorage.removeItem(AUTOPILOT_PREFIX+workspaceId());
    localStorage.removeItem(MEMORY_PREFIX+workspaceId());
    localStorage.removeItem(MEMORY_USE_PREFIX+workspaceId());
    localStorage.removeItem(KNOWLEDGE_PREFIX+workspaceId());
    localStorage.removeItem(COLLECTIONS_PREFIX+workspaceId());
    button.textContent=button.dataset.originalLabel||'Delete workspace data';
    refresh();
    notifyDataChanged();
    setStatus('Local workspace data deleted.','ready');
  }

  function clearPairingTokens(){
    const removed=SESSION_PREFIXES.reduce((total,prefix)=>{
      const keys=keysByPrefix(sessionKeys(),prefix);
      keys.forEach(key=>sessionStorage.removeItem(key));
      return total+keys.length;
    },0);
    refresh();
    notifyDataChanged();
    setStatus(removed?('Cleared '+removed+' temporary pairing token(s).'):'No pairing tokens were stored.','ready');
  }

  function clearAllLocalData(button){
    if(!deleteAllArmed){
      arm(button,'all','Click again to reset only MMIR data stored by this browser.','Full local reset cancelled.');
      return;
    }

    clearDeleteArm();
    const localSet=new Set([
      ...keysByExact(localKeys(),LOCAL_EXACT_KEYS),
      ...LOCAL_PREFIXES.flatMap(prefix=>keysByPrefix(localKeys(),prefix))
    ]);
    const sessionSet=new Set([
      ...keysByExact(sessionKeys(),SESSION_EXACT_KEYS),
      ...SESSION_PREFIXES.flatMap(prefix=>keysByPrefix(sessionKeys(),prefix))
    ]);
    localSet.forEach(key=>localStorage.removeItem(key));
    sessionSet.forEach(key=>sessionStorage.removeItem(key));
    button.textContent=button.dataset.originalLabel||'Delete all local MMIR data';
    refresh();
    notifyDataChanged();
    setStatus('All browser-stored MMIR data for this site was removed.','ready');
  }

  function install(){
    if(document.getElementById('privacy-controls-panel'))return;
    const details=document.createElement('details');
    details.id='privacy-controls-panel';
    details.className='model-catalog-hint privacy-controls-panel';
    details.innerHTML=''+
      '<summary>+ Privacy / Local Data</summary>'+
      '<div class="privacy-controls-body">'+
        '<div id="privacy-summary" class="privacy-summary" aria-live="polite"></div>'+
        '<div class="privacy-inventory-head">'+
          '<strong>Data inventory</strong>'+
          '<span>Public frontend shows only browser data. Provider keys stay outside GitHub Pages.</span>'+
        '</div>'+
        '<div id="privacy-data-inventory" class="privacy-inventory-grid" aria-live="polite"></div>'+
        '<div class="privacy-actions">'+
          '<button id="privacy-refresh-inventory" type="button">Refresh inventory</button>'+
          '<button id="privacy-export" type="button">Export workspace JSON</button>'+
          '<button id="privacy-copy" type="button">Copy workspace JSON</button>'+
          '<button id="privacy-clear-pairing" type="button">Clear pairing tokens</button>'+
          '<button id="privacy-delete" type="button" class="danger">Delete workspace data</button>'+
          '<button id="privacy-delete-all" type="button" class="danger">Delete all local MMIR data</button>'+
        '</div>'+
        '<p id="privacy-status" class="dashboard-note" data-state="idle" aria-live="polite"></p>'+
      '</div>';
    host.appendChild(details);
    summaryEl=document.getElementById('privacy-summary');
    inventoryEl=document.getElementById('privacy-data-inventory');
    statusEl=document.getElementById('privacy-status');
    document.getElementById('privacy-refresh-inventory')?.addEventListener('click',()=>{refresh();setStatus('Data inventory refreshed.','ready');});
    document.getElementById('privacy-export')?.addEventListener('click',downloadJson);
    document.getElementById('privacy-copy')?.addEventListener('click',copyJson);
    document.getElementById('privacy-clear-pairing')?.addEventListener('click',clearPairingTokens);
    document.getElementById('privacy-delete')?.addEventListener('click',(event)=>deleteWorkspaceData(event.currentTarget));
    document.getElementById('privacy-delete-all')?.addEventListener('click',(event)=>clearAllLocalData(event.currentTarget));
    refresh();
  }

  window.addEventListener('mmir-workspace-changed',()=>{clearDeleteArm();refresh();setStatus('');});
  window.addEventListener('mmir-chat-history-updated',refresh);
  window.addEventListener('mmir-memory-updated',refresh);
  window.addEventListener('mmir-knowledge-updated',refresh);
  window.addEventListener('mmir-knowledge-collections-updated',refresh);
  window.addEventListener('mmir-connector-plans-updated',refresh);
  window.addEventListener('mmir-backend-profiles-updated',refresh);
  window.addEventListener('mmir-managed-session-updated',refresh);
  window.addEventListener('mmir-first-chat-receipt-updated',refresh);
  window.addEventListener('mmir-active-model-changed',refresh);
  window.addEventListener('mimir-growth-event',refresh);
  window.addEventListener('storage',refresh);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
