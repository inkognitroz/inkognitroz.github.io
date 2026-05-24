(function(){
  const root=document.getElementById('progress-dashboard-root');
  const refreshButton=document.getElementById('refresh-progress-dashboard');
  const summary=document.getElementById('progress-dashboard-summary');
  const DATA_URL='./progress-dashboard.json';
  const WORKSPACE_KEY='mimir-active-workspace-v1';
  const DEFAULT_WORKSPACE_ID='personal';
  const FIRST_CHAT_RECEIPT_PREFIX='mimir-first-chat-receipt-v1:';
  const ACTIVATION_EVENTS_PREFIX='mimir-activation-events-v1:';
  const AUTOPILOT_PREFIX='mimir-activation-autopilot-v1:';
  const ACTIVATION_REPLAY_PREFIX='mimir-activation-replay-v1:';
  const CONTEXT_CORRECTION_PREFIX='mimir-context-corrections-v1:';
  const PROFILE_KEY='mimir-chat-backend-profiles';
  const ACTIVE_KEY='mimir-chat-active-backend';
  let dashboard=null;
  let filterStatus='all';
  let filterText='';

  if(!root)return;

  function safe(value){return String(value||'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');}
  function label(value){return String(value||'unknown').replaceAll('-', ' ');}
  function activeWorkspaceId(){return localStorage.getItem(WORKSPACE_KEY)||DEFAULT_WORKSPACE_ID;}
  function firstChatReceiptStorageKey(){return FIRST_CHAT_RECEIPT_PREFIX+activeWorkspaceId();}
  function activationEventsStorageKey(){return ACTIVATION_EVENTS_PREFIX+activeWorkspaceId();}
  function autopilotStorageKey(){return AUTOPILOT_PREFIX+activeWorkspaceId();}
  function activationReplayStorageKey(){return ACTIVATION_REPLAY_PREFIX+activeWorkspaceId();}
  function contextCorrectionStorageKey(){return CONTEXT_CORRECTION_PREFIX+activeWorkspaceId();}
  function readProfiles(){
    try{
      const value=JSON.parse(localStorage.getItem(PROFILE_KEY)||'[]');
      return Array.isArray(value)?value:[];
    }catch(error){
      return [];
    }
  }
  function activeProfile(){
    const activeId=localStorage.getItem(ACTIVE_KEY)||'';
    return readProfiles().find((profile)=>profile.id===activeId)||null;
  }
  function runtimeProofState(){
    const proof=document.getElementById('runtime-live-proof');
    return String(proof?.dataset?.state||'idle');
  }
  function readFirstChatReceipt(){
    try{
      const value=JSON.parse(localStorage.getItem(firstChatReceiptStorageKey())||'null');
      return value&&typeof value==='object'?value:null;
    }catch(error){
      return null;
    }
  }
  function firstChatReceiptState(){
    const receipt=readFirstChatReceipt();
    if(receipt?.status==='success'){
      return {
        status:'ready',
        label:'Verified',
        detail:(receipt.model||'model')+' answered at '+new Date(receipt.first_success_at||receipt.at||Date.now()).toLocaleString()+'. No raw prompt or response is stored.',
        action:'Next step'
      };
    }
    if(receipt?.status==='failed'){
      return {
        status:'error',
        label:'Needs repair',
        detail:'Last verified chat failed. Recovery actions are ready, and no raw prompt or response was stored.',
        action:'Repair first chat'
      };
    }
    return {
      status:'idle',
      label:'Not proven yet',
      detail:'No verified live-model first-chat receipt exists for this browser workspace yet.',
      action:'Send first answer'
    };
  }
  function readActivationEvents(){
    try{
      const value=JSON.parse(localStorage.getItem(activationEventsStorageKey())||'[]');
      return Array.isArray(value)?value:[];
    }catch(error){
      return [];
    }
  }
  function readContextCorrections(){
    try{
      const value=JSON.parse(localStorage.getItem(contextCorrectionStorageKey())||'[]');
      return Array.isArray(value)?value.filter((item)=>item?.id).slice(0,5):[];
    }catch(error){
      return [];
    }
  }
  function contextCorrectionSuggestions(){
    const items=readContextCorrections().filter((item)=>!item.undone_at);
    const counts=items.reduce((acc,item)=>{
      const target=String(item.target||'context');
      const action=String(item.action||'correction');
      acc[target] ||= {target,total:0,disabled:0,cleared:0,sources:0};
      acc[target].total += 1;
      if(action==='disable-source')acc[target].disabled += 1;
      if(action==='clear-focus')acc[target].cleared += 1;
      acc[target].sources += Math.max(0,Math.round(Number(item.source_count)||0));
      return acc;
    },{});
    const suggestions=[];
    if(counts.memory?.disabled)suggestions.push({id:'memory-scope-expiry',label:'Narrow memory scope',detail:'Memory corrections suggest expiry, scope or import-review cleanup.',target:'#memory-panel'});
    if(counts.knowledge?.disabled)suggestions.push({id:'knowledge-source-review',label:'Review knowledge sources',detail:'Knowledge corrections suggest collection review or stale-file cleanup.',target:'#knowledge-panel'});
    if((counts.knowledge?.sources||0)>=3)suggestions.push({id:'knowledge-collection-split',label:'Split broad collection',detail:'Several corrected sources point to a broad collection.',target:'#knowledge-panel'});
    if((counts.memory?.cleared||0)+(counts.knowledge?.cleared||0)>=3)suggestions.push({id:'receipt-focus-tuning',label:'Tune source focus',detail:'Frequent clear-focus actions suggest tighter receipt filters.',target:'#progress-answer-context-source-filter'});
    return suggestions.slice(0,4);
  }
  function readAutopilotState(){
    try{
      const value=JSON.parse(localStorage.getItem(autopilotStorageKey())||'null');
      return value&&typeof value==='object'?value:null;
    }catch(error){
      return null;
    }
  }
  function readActivationReplay(){
    try{
      const value=JSON.parse(localStorage.getItem(activationReplayStorageKey())||'null');
      return value&&typeof value==='object'?value:null;
    }catch(error){
      return null;
    }
  }
  function writeActivationReplay(scenario){
    const replay={
      id:String(scenario.id||'scenario'),
      state:String(scenario.state||scenario.id||'scenario'),
      label:String(scenario.label||'Activation replay'),
      simulated_signal:String(scenario.simulated_signal||'Public-safe activation fixture.'),
      expected_next_action:String(scenario.expected_next_action||'Review the next safe action.'),
      next_target:String(scenario.next_target||'#progress-dashboard'),
      applied_at:new Date().toISOString(),
      demo_only:true,
      no_paid_routes_started:true,
      provider_secrets_stored:false,
      raw_prompt_stored:false,
      raw_response_stored:false,
      mutated_real_connector:false,
      mutated_pairing_tokens:false
    };
    try{localStorage.setItem(activationReplayStorageKey(),JSON.stringify(replay));}catch(error){}
    window.dispatchEvent(new CustomEvent('mmir-activation-replay-updated',{detail:replay}));
    return replay;
  }
  function clearActivationReplay(){
    try{localStorage.removeItem(activationReplayStorageKey());}catch(error){}
    window.dispatchEvent(new CustomEvent('mmir-activation-replay-updated',{detail:{cleared:true}}));
  }
  function activationSummary(){
    const events=readActivationEvents();
    const autopilot=readAutopilotState();
    const latest=events[events.length-1]||null;
    const verified=events.filter((event)=>event.status==='verified'||event.first_chat_ready||event.status==='ready').length;
    const failed=events.filter((event)=>event.status==='failed'||event.status==='error').length;
    const starterSelected=events.filter((event)=>event.type==='recommended-starter').length;
    return {
      events,
      latest,
      state:failed&&latest?.status!=='ready'&&latest?.status!=='verified'?'error':(verified?'ready':'idle'),
      label:latest?label(latest.type):'No local events yet',
      detail:latest?latest.note:'Activation telemetry starts when MMIR checks defaults, proof, installs, doctor state or first chat.',
      verified,
      failed,
      starterSelected,
      autopilot
    };
  }
  function pct(done,beta,total){
    if(!total)return 0;
    return Math.round(((done||0)+(beta||0)*0.55)/total*100);
  }
  function setSummary(message,state){
    if(!summary)return;
    summary.textContent=message||'';
    summary.dataset.state=state||'idle';
  }

  async function fetchDashboard(){
    const response=await fetch(DATA_URL,{cache:'no-store'});
    if(!response.ok)throw new Error('Progress data unavailable');
    return response.json();
  }

  function chip(status){
    return '<span class="progress-status-chip status-'+safe(status||'planned')+'">'+safe(label(status||'planned'))+'</span>';
  }

  function metric(labelText,value,note){
    return '<article class="progress-tile"><span>'+safe(labelText)+'</span><strong>'+safe(value)+'</strong><small>'+safe(note||'')+'</small></article>';
  }

  function renderFirstChatReceipt(){
    const state=firstChatReceiptState();
    return '<section class="progress-receipt-card" data-state="'+safe(state.status)+'">'+
      '<div><p class="eyebrow">Activation receipt</p><h2>First chat receipt: '+safe(state.label)+'</h2><small>'+safe(state.detail)+'</small></div>'+
      '<button id="progress-first-chat-recovery" type="button">'+safe(state.action)+'</button>'+
    '</section>';
  }

  function readLocalJson(key,fallback){
    try{
      const value=JSON.parse(localStorage.getItem(key)||'null');
      return value==null?fallback:value;
    }catch(error){
      return fallback;
    }
  }

  function firstAnswerNextStep(){
    const receipt=readFirstChatReceipt();
    if(receipt?.status!=='success')return null;
    const profile=activeProfile();
    if(!profile?.url)return {kind:'connect-node',label:'Connect local node',target:'#local-connector',detail:'Make future answers private and faster on this device.'};
    const conversations=readLocalJson('mimir-conversations-v1:'+activeWorkspaceId(),[]);
    if(!Array.isArray(conversations)||!conversations.length)return {kind:'save-chat',label:'Save chat',target:'#conversation-manager-panel',detail:'Keep the first useful answer in this workspace.'};
    return {kind:'add-memory',label:'Add memory',target:'#memory-panel',detail:'Let MMIR remember what mattered for the next answer.'};
  }

  function renderFirstAnswerNextStep(){
    const step=firstAnswerNextStep();
    if(!step)return '';
    return '<section id="progress-first-answer-next-step" class="progress-receipt-card" data-state="ready">'+
      '<div><p class="eyebrow">After first answer</p><h2>'+safe(step.label)+'</h2><small>'+safe(step.detail)+'</small></div>'+
      '<button id="progress-first-answer-next-step-action" type="button" data-kind="'+safe(step.kind)+'" data-target="'+safe(step.target)+'">'+safe(step.label)+'</button>'+
    '</section>';
  }

  function renderActivationTelemetry(){
    const state=activationSummary();
    const events=state.events.slice(-6).reverse();
    return '<section class="progress-activation-card" data-state="'+safe(state.state)+'">'+
      '<div class="progress-activation-head"><div><p class="eyebrow">Activation telemetry</p><h2>Latest activation: '+safe(state.label)+'</h2><small>'+safe(state.detail)+'</small></div>'+
      '<div class="progress-activation-counts">'+
        '<span>'+safe(state.events.length)+' events</span>'+
        '<span>'+safe(state.verified)+' ready</span>'+
        '<span>'+safe(state.failed)+' repair</span>'+
        '<span>'+safe(state.starterSelected)+' starter selected</span>'+
        '<span>'+safe(state.autopilot?.runs||0)+' autopilot</span>'+
      '</div></div>'+
      '<div class="progress-activation-list">'+(events.length?events.map((event)=>
        '<article class="progress-activation-event" data-state="'+safe(event.status||'idle')+'">'+
          '<span>'+safe(label(event.type))+'</span>'+
          '<strong>'+safe(label(event.status))+'</strong>'+
          '<small>'+safe(new Date(event.at||Date.now()).toLocaleString())+' / '+safe(event.route||'local-first')+(event.model?' / '+safe(event.model):'')+'</small>'+
          '<p>'+safe(event.note||'Activation event recorded.')+'</p>'+
        '</article>'
      ).join(''):'<p class="dashboard-note">No activation events have been recorded in this browser workspace yet.</p>')+'</div>'+
      '<div class="progress-activation-actions"><button id="progress-activation-autopilot" type="button">Run autopilot</button><button id="progress-activation-refresh" type="button">Refresh activation</button><button id="progress-activation-clear" type="button">Clear local events</button></div>'+
      '<small class="progress-activation-privacy">Local only: raw_prompt_stored:false, raw_response_stored:false, secrets_stored:false.</small>'+
    '</section>';
  }

  function starterFunnelState(){
    const events=readActivationEvents();
    const selected=[...events].reverse().find((event)=>event.type==='recommended-starter')||null;
    if(!selected){
      return {state:'idle',selected:null,steps:[]};
    }
    const after=events.filter((event)=>Number(event.at_ms||0)>=Number(selected.at_ms||0));
    const sameModel=(event)=>!selected.model||!event.model||event.model===selected.model;
    const install=after.find((event)=>event.type==='model-install'&&sameModel(event))||null;
    const proof=after.find((event)=>event.type==='live-proof'&&sameModel(event)&&(event.status==='ready'||event.status==='verified'||event.first_chat_ready))||null;
    const chat=after.find((event)=>event.type==='first-chat-receipt'&&(event.status==='success'||event.first_chat_ready))||null;
    const steps=[
      {id:'selected',label:'Starter selected',event:selected,empty:'Choose a recommended free starter.'},
      {id:'installed',label:'Model installed',event:install,empty:'Install or expose the starter model.'},
      {id:'proved',label:'Live proof',event:proof,empty:'Run the tiny free proof.'},
      {id:'answered',label:'First answer',event:chat,empty:'Send the first verified chat.'}
    ];
    const missing=steps.find((step)=>!step.event);
    const nextAction=!selected?{kind:'select-starter',label:'Choose starter',target:'#mimir-instant-start'}:
      missing?.id==='installed'?{kind:'install',label:'Open model library',target:'#model-library'}:
      missing?.id==='proved'?{kind:'live-proof',label:'Run free proof',target:'#mimir-chat-runtime'}:
      missing?.id==='answered'?{kind:'first-chat',label:'Send first answer',target:'#mimir-prompt'}:
      {kind:'chat-now',label:'Open chat',target:'#mimir-prompt'};
    return {state:chat?'ready':'watch',selected,steps,nextAction};
  }

  function renderStarterFunnel(){
    const funnel=starterFunnelState();
    const selected=funnel.selected;
    return '<section id="progress-starter-funnel" class="progress-starter-funnel" data-state="'+safe(funnel.state)+'">'+
      '<div class="progress-activation-head"><div><p class="eyebrow">Starter funnel</p><h2>'+safe(selected?'From '+(selected.model||'recommended starter'):'No starter selected yet')+'</h2><small>'+safe(selected?'Tracks the free path from recommendation to first answer.':'Use the first-screen recommended starter action to begin the free path.')+'</small></div>'+
      '<div class="progress-activation-counts"><span>recommended-starter</span><span>no spend</span><span>local only</span></div></div>'+
      '<div class="progress-starter-steps">'+(funnel.steps.length?funnel.steps.map((step)=>
        '<article class="progress-starter-step" data-state="'+safe(step.event?'ready':'watch')+'">'+
          '<span>'+safe(step.label)+'</span>'+
          '<strong>'+safe(step.event?label(step.event.status||step.event.type):'Pending')+'</strong>'+
          '<small>'+safe(step.event?new Date(step.event.at||Date.now()).toLocaleString()+' / '+(step.event.model||step.event.route||'local-first'):step.empty)+'</small>'+
        '</article>'
      ).join(''):'<p class="dashboard-note">No recommended-starter event exists in this browser workspace yet.</p>')+'</div>'+
      '<div class="progress-activation-actions"><button id="progress-starter-continue" type="button" data-starter-funnel-action="'+safe(funnel.nextAction.kind)+'" data-target="'+safe(funnel.nextAction.target)+'">'+safe(funnel.nextAction.label)+'</button></div>'+
      '<small class="progress-activation-privacy">Local only: raw_prompt_stored:false, raw_response_stored:false, secrets_stored:false, no_paid_routes_started:true.</small>'+
    '</section>';
  }

  function scenarioLiveProofGap(scenario){
    const state=String(scenario?.state||scenario?.id||'');
    if(state==='first_visit')return 'Real browser guide works now; local live proof starts after connector pairing.';
    if(state==='missing_connector')return 'Needs a real local-node /doctor response before this becomes live proof.';
    if(state==='installer_return_checking')return 'Needs post-install /health, /models and proof refresh to verify the repair.';
    if(state==='connector_online_no_model')return 'Needs one pulled local chat model and a tiny free chat proof.';
    if(state==='verified_local_model')return 'Needs an actual first-chat receipt before the route is counted as complete.';
    return 'Needs measured live proof before it can move beyond replay QA.';
  }

  function renderReplayRouteMap(scenarios){
    return '<div id="progress-replay-route-map" class="progress-replay-route-map" aria-label="Activation replay route map">'+
      '<div class="progress-route-map-head"><div><p class="eyebrow">Replay route map</p><h3>What is simulated, what is real, and where the user goes next</h3></div><small>Public-safe report from activation-simulator-fixtures.json. demo_only:true / no_paid_routes_started:true.</small></div>'+
      '<div class="progress-route-map-table">'+scenarios.map((scenario)=>{
        const target=String(scenario.next_target||'#progress-dashboard');
        const surfaceText=Array.isArray(scenario.surfaces)?scenario.surfaces.map((surface)=>surface.surface).join(', '):'not mapped';
        return '<article class="progress-replay-route-row" data-scenario="'+safe(scenario.id)+'">'+
          '<div><span>Scenario</span><strong>'+safe(scenario.label||scenario.id)+'</strong><small>'+safe(scenario.simulated_signal||'Public-safe fixture.')+'</small></div>'+
          '<div><span>Next target</span><a href="'+safe(target)+'" data-replay-route-target="'+safe(scenario.id)+'">'+safe(target)+'</a><small>'+safe(scenario.expected_next_action||'Review next action.')+'</small></div>'+
          '<div><span>Surfaces</span><small>'+safe(surfaceText)+'</small></div>'+
          '<div><span>Live proof gap</span><small>'+safe(scenarioLiveProofGap(scenario))+'</small></div>'+
        '</article>';
      }).join('')+'</div>'+
    '</div>';
  }

  function liveGapItems(){
    const profile=activeProfile();
    const receipt=readFirstChatReceipt();
    const proofState=runtimeProofState();
    const proofReady=proofState==='ready'||profile?.liveness==='chat-probed'||Boolean(profile?.lastProofModel)||receipt?.status==='success';
    const profileReady=Boolean(profile?.url&&profile?.provider==='local-node');
    const nodeHealth=String(profile?.health||'unknown');
    const nodeReady=nodeHealth==='ready'||nodeHealth==='degraded'||proofReady;
    const firstChatReady=receipt?.status==='success';
    const firstChatFailed=receipt?.status==='failed';
    return [
      {id:'browser-guide',label:'Browser guide',state:'ready',detail:'Free browser helper is available before setup.',action:'Open chat',target:'#mimir-prompt'},
      {id:'local-profile',label:'Free local profile',state:profileReady?'ready':'watch',detail:profileReady?'Active local profile points to '+String(profile.url||'127.0.0.1')+'.':'MMIR can create the free local profile automatically.',action:profileReady?'Open settings':'Create local profile',target:'#backend-settings'},
      {id:'local-node',label:'Local node health',state:nodeReady?'ready':(nodeHealth==='offline'?'error':'watch'),detail:nodeReady?'Node state is '+nodeHealth+'.':(nodeHealth==='offline'?'Local node is offline or not paired.':'Node has not been verified in this browser yet.'),action:'Open node health',target:'#node-dashboard'},
      {id:'live-proof',label:'Live model proof',state:proofReady?'ready':'watch',detail:proofReady?'Proof model: '+String(profile?.lastProofModel||receipt?.model||'verified route')+'.':'Run a free proof after node/model setup.',action:proofReady?'Open chat':'Retry free proof',target:'#mimir-chat-runtime'},
      {id:'first-chat',label:'First useful chat',state:firstChatReady?'ready':(firstChatFailed?'error':'watch'),detail:firstChatReady?'Receipt saved without raw prompt/response.':(firstChatFailed?'Last first chat failed; recovery is ready.':'No first-chat receipt yet.'),action:firstChatReady?'Open chat':'Send first answer',target:'#mimir-prompt'}
    ];
  }

  function renderLiveGapChecklist(){
    const items=liveGapItems();
    const remaining=items.filter((item)=>item.state!=='ready').length;
    return '<section id="progress-live-gap-checklist" class="progress-live-gap-checklist" data-state="'+(remaining?'watch':'ready')+'">'+
      '<div class="progress-route-map-head"><div><p class="eyebrow">Live activation closure</p><h2>Close the remaining gaps</h2></div><small>Current browser state only. no_paid_routes_started:true / provider_secrets_stored:false.</small></div>'+
      '<div class="progress-live-gap-grid">'+items.map((item)=>
        '<article class="progress-live-gap-item" data-gap="'+safe(item.id)+'" data-state="'+safe(item.state)+'">'+
          '<div><span>'+safe(label(item.state))+'</span><strong>'+safe(item.label)+'</strong><small>'+safe(item.detail)+'</small></div>'+
          '<button type="button" data-live-gap-action="'+safe(item.id)+'" data-target="'+safe(item.target)+'">'+safe(item.action)+'</button>'+
        '</article>'
      ).join('')+'</div>'+
      '<small class="progress-activation-privacy">This checklist reads local MMIR state and DOM proof only; it does not create paid/provider work or store secrets.</small>'+
    '</section>';
  }

  function renderNoModelDeadEndReport(data){
    const report=data.no_model_dead_end_report||{};
    const scenarios=Array.isArray(report.scenarios)?report.scenarios:[];
    if(!scenarios.length)return '';
    const ready=scenarios.every((scenario)=>scenario.free&&scenario.no_paid_routes_started&&scenario.primary_action&&scenario.target);
    return '<section id="progress-no-model-fixture" class="progress-no-model-fixture" data-state="'+(ready?'ready':'watch')+'">'+
      '<div class="progress-route-map-head"><div><p class="eyebrow">No-model dead-end guard</p><h2>'+safe(report.title||'No-model browser fixture')+'</h2></div><small>'+safe(report.principle||'Free-first route floor.')+'</small></div>'+
      '<div class="progress-no-model-grid">'+scenarios.map((scenario)=>
        '<article class="progress-no-model-scenario" data-scenario="'+safe(scenario.id)+'">'+
          '<span>'+safe(label(scenario.free?'ready':'watch'))+'</span><h3>'+safe(scenario.label)+'</h3>'+
          '<p>'+safe(scenario.simulated_dom_state)+'</p>'+
          '<strong>'+safe(scenario.primary_action)+'</strong>'+
          '<small>'+safe(scenario.secondary_action||'')+' / '+safe(scenario.target||'')+' / no_paid_routes_started:'+safe(Boolean(scenario.no_paid_routes_started))+'</small>'+
        '</article>'
      ).join('')+'</div>'+
      '<small class="progress-activation-privacy">'+safe(report.public_repo_rule||'Public-safe fixture only.')+'</small>'+
    '</section>';
  }

  function renderNoModelPublicDeployVerification(data){
    const report=data.no_model_public_deploy_verification||{};
    const artifacts=Array.isArray(report.public_artifact_contract)?report.public_artifact_contract:[];
    if(!artifacts.length)return '';
    const ci=Array.isArray(report.ci)?report.ci:[];
    const checks=Array.isArray(report.public_url_checks)?report.public_url_checks:[];
    const green=report.result==='green_with_network_watch'&&ci.every((run)=>run.conclusion==='success');
    return '<section id="progress-no-model-public-deploy" class="progress-no-model-fixture" data-state="'+(green?'ready':'watch')+'">'+
      '<div class="progress-route-map-head"><div><p class="eyebrow">Public deploy proof</p><h2>No-model route is deployed</h2></div><small>'+safe(report.verified_commit_short||'verified commit')+' / '+safe(report.result||'watch')+'</small></div>'+
      '<div class="progress-no-model-grid">'+artifacts.map((artifact)=>
        '<article class="progress-no-model-scenario" data-artifact="'+safe(artifact.id)+'">'+
          '<span>'+safe(label('ready'))+'</span><h3>'+safe(artifact.id)+'</h3>'+
          '<p>'+safe(artifact.public_url||artifact.source_path||'')+'</p>'+
          '<strong>'+safe((artifact.required_evidence||[]).slice(0,2).join(' + '))+'</strong>'+
          '<small>blob:'+safe(String(artifact.github_blob_sha||'').slice(0,12))+' / public-safe artifact</small>'+
        '</article>'
      ).join('')+'</div>'+
      '<small class="progress-activation-privacy">'+safe(report.summary||'Public-safe deploy evidence only.')+' '+safe(checks.find((check)=>check.status==='watch')?.evidence||'')+'</small>'+
    '</section>';
  }

  function renderFirstFreeChatResponseReport(data){
    const report=data.first_free_chat_response_report||{};
    const scenarios=Array.isArray(report.scenarios)?report.scenarios:[];
    if(!scenarios.length)return '';
    const ready=scenarios.every((scenario)=>scenario.status==='ready'&&scenario.no_paid_routes_started===true);
    return '<section id="progress-first-free-chat-response" class="progress-no-model-fixture" data-state="'+(ready?'ready':'watch')+'">'+
      '<div class="progress-route-map-head"><div><p class="eyebrow">First free chat</p><h2>'+safe(report.title||'First free chat response')+'</h2></div><small>'+safe(report.principle||'Useful before backend setup.')+'</small></div>'+
      '<div class="progress-no-model-grid">'+scenarios.map((scenario)=>
        '<article class="progress-no-model-scenario" data-scenario="'+safe(scenario.id)+'">'+
          '<span>'+safe(label(scenario.status==='ready'?'ready':'watch'))+'</span><h3>'+safe(scenario.id)+'</h3>'+
          '<p>'+safe(scenario.intent||'')+'</p>'+
          '<strong>'+safe(scenario.next_action||'')+'</strong>'+
          '<small>no_paid_routes_started:'+safe(Boolean(scenario.no_paid_routes_started))+'</small>'+
        '</article>'
      ).join('')+'</div>'+
      '<small class="progress-activation-privacy">'+safe(report.public_repo_rule||'Public-safe response contract only.')+'</small>'+
    '</section>';
  }

  function renderComposerActionBarReport(data){
    const report=data.composer_action_bar_report||{};
    const controls=Array.isArray(report.controls)?report.controls:[];
    if(!controls.length)return '';
    const ready=controls.every((control)=>control.status==='ready'&&control.no_paid_routes_started===true);
    return '<section id="progress-composer-action-bar" class="progress-no-model-fixture" data-state="'+(ready?'ready':'watch')+'">'+
      '<div class="progress-route-map-head"><div><p class="eyebrow">Composer controls</p><h2>'+safe(report.title||'Composer action bar')+'</h2></div><small>'+safe(report.principle||'Every control must be useful or clearly gated.')+'</small></div>'+
      '<div class="progress-no-model-grid">'+controls.map((control)=>
        '<article class="progress-no-model-scenario" data-control="'+safe(control.id)+'">'+
          '<span>'+safe(label(control.status==='ready'?'ready':'watch'))+'</span><h3>'+safe(control.selector||control.id)+'</h3>'+
          '<p>'+safe(control.expected||'')+'</p>'+
          '<strong>'+safe((control.evidence||[]).slice(0,2).join(' + '))+'</strong>'+
          '<small>no_paid_routes_started:'+safe(Boolean(control.no_paid_routes_started))+'</small>'+
        '</article>'
      ).join('')+'</div>'+
      '<small class="progress-activation-privacy">'+safe(report.public_repo_rule||'Public-safe control evidence only.')+'</small>'+
    '</section>';
  }

  function renderComposerActionBarVisualReport(data){
    const report=data.composer_action_bar_visual_report||{};
    const viewports=Array.isArray(report.viewports)?report.viewports:[];
    if(!viewports.length)return '';
    return '<section id="progress-composer-action-bar-visual" class="progress-no-model-fixture" data-state="ready">'+
      '<div class="progress-route-map-head"><div><p class="eyebrow">Composer visual QA</p><h2>'+safe(report.title||'Composer action bar visual QA')+'</h2></div><small>'+safe(report.principle||'Compact and readable across viewports.')+'</small></div>'+
      '<div class="progress-no-model-grid">'+viewports.map((viewport)=>
        '<article class="progress-no-model-scenario" data-viewport="'+safe(viewport.id)+'">'+
          '<span>'+safe(label('ready'))+'</span><h3>'+safe(viewport.id)+'</h3>'+
          '<p>'+safe(String(viewport.width||''))+'x'+safe(String(viewport.height||''))+'</p>'+
          '<strong>'+safe((viewport.expected||[]).slice(0,2).join(' + '))+'</strong>'+
          '<small>selector contracts:'+safe((report.selector_contract||[]).length)+' / css contracts:'+safe((report.css_contract||[]).length)+'</small>'+
        '</article>'
      ).join('')+'</div>'+
      '<small class="progress-activation-privacy">'+safe(report.public_repo_rule||'Public-safe visual contract only.')+'</small>'+
    '</section>';
  }

  function renderMessageActionCompletenessReport(data){
    const report=data.message_action_completeness_report||{};
    const actions=Array.isArray(report.actions)?report.actions:[];
    if(!actions.length)return '';
    const ready=actions.every((action)=>action.status==='ready'&&action.no_paid_routes_started===true);
    return '<section id="progress-message-action-completeness" class="progress-no-model-fixture" data-state="'+(ready?'ready':'watch')+'">'+
      '<div class="progress-route-map-head"><div><p class="eyebrow">Transcript actions</p><h2>'+safe(report.title||'Message action completeness')+'</h2></div><small>'+safe(report.principle||'Every answer needs useful follow-through.')+'</small></div>'+
      '<div class="progress-no-model-grid">'+actions.map((action)=>
        '<article class="progress-no-model-scenario" data-message-action="'+safe(action.id)+'">'+
          '<span>'+safe(label(action.status==='ready'?'ready':'watch'))+'</span><h3>'+safe(action.selector||action.id)+'</h3>'+
          '<p>'+safe(action.expected||'')+'</p>'+
          '<strong>'+safe((action.evidence||[]).slice(0,2).join(' + '))+'</strong>'+
          '<small>no_paid_routes_started:'+safe(Boolean(action.no_paid_routes_started))+' / public raw prompts:false</small>'+
        '</article>'
      ).join('')+'</div>'+
      '<small class="progress-activation-privacy">'+safe(report.public_repo_rule||'Public-safe message action evidence only.')+'</small>'+
    '</section>';
  }

  function renderMessageActionVisualReport(data){
    const report=data.message_action_visual_report||{};
    const viewports=Array.isArray(report.viewports)?report.viewports:[];
    if(!viewports.length)return '';
    return '<section id="progress-message-action-visual" class="progress-no-model-fixture" data-state="ready">'+
      '<div class="progress-route-map-head"><div><p class="eyebrow">Transcript visual QA</p><h2>'+safe(report.title||'Message action visual QA')+'</h2></div><small>'+safe(report.principle||'Transcript controls stay compact and touchable.')+'</small></div>'+
      '<div class="progress-no-model-grid">'+viewports.map((viewport)=>
        '<article class="progress-no-model-scenario" data-viewport="'+safe(viewport.id)+'">'+
          '<span>'+safe(label('ready'))+'</span><h3>'+safe(viewport.id)+'</h3>'+
          '<p>'+safe(String(viewport.width||''))+'x'+safe(String(viewport.height||''))+'</p>'+
          '<strong>'+safe((viewport.expected||[]).slice(0,2).join(' + '))+'</strong>'+
          '<small>selectors:'+safe((report.selector_contract||[]).length)+' / css:'+safe((report.css_contract||[]).length)+'</small>'+
        '</article>'
      ).join('')+'</div>'+
      '<small class="progress-activation-privacy">'+safe(report.public_repo_rule||'Public-safe transcript visual evidence only.')+'</small>'+
    '</section>';
  }

  function renderMessageActionBrowserFixtureReport(data){
    const report=data.message_action_browser_fixture_report||{};
    const scenarios=Array.isArray(report.scenarios)?report.scenarios:[];
    if(!scenarios.length)return '';
    const ready=scenarios.every((scenario)=>scenario.status==='ready'&&scenario.no_paid_routes_started===true);
    return '<section id="progress-message-action-browser-fixture" class="progress-no-model-fixture" data-state="'+(ready?'ready':'watch')+'">'+
      '<div class="progress-route-map-head"><div><p class="eyebrow">Transcript behavior fixture</p><h2>'+safe(report.title||'Message action browser fixture')+'</h2></div><small>'+safe(report.principle||'Critical actions must mutate only local state.')+'</small></div>'+
      '<div class="progress-no-model-grid">'+scenarios.map((scenario)=>
        '<article class="progress-no-model-scenario" data-scenario="'+safe(scenario.id)+'">'+
          '<span>'+safe(label(scenario.status==='ready'?'ready':'watch'))+'</span><h3>'+safe(scenario.action||scenario.id)+'</h3>'+
          '<p>'+safe(scenario.expected||'')+'</p>'+
          '<strong>'+safe(scenario.storage_key||'browser-local fixture')+'</strong>'+
          '<small>no_paid_routes_started:'+safe(Boolean(scenario.no_paid_routes_started))+' / synthetic only</small>'+
        '</article>'
      ).join('')+'</div>'+
      '<small class="progress-activation-privacy">'+safe(report.public_repo_rule||'Public-safe browser fixture evidence only.')+'</small>'+
    '</section>';
  }

  function renderMessageActionAccessibilityReport(data){
    const report=data.message_action_accessibility_report||{};
    const checks=Array.isArray(report.checks)?report.checks:[];
    if(!checks.length)return '';
    const ready=checks.every((check)=>check.status==='ready');
    return '<section id="progress-message-action-accessibility" class="progress-no-model-fixture" data-state="'+(ready?'ready':'watch')+'">'+
      '<div class="progress-route-map-head"><div><p class="eyebrow">Transcript accessibility</p><h2>'+safe(report.title||'Message action accessibility QA')+'</h2></div><small>'+safe(report.principle||'Keyboard and assistive tech paths stay first-class.')+'</small></div>'+
      '<div class="progress-no-model-grid">'+checks.map((check)=>
        '<article class="progress-no-model-scenario" data-check="'+safe(check.id)+'">'+
          '<span>'+safe(label(check.status==='ready'?'ready':'watch'))+'</span><h3>'+safe(check.selector||check.id)+'</h3>'+
          '<p>'+safe(check.expected||'')+'</p>'+
          '<strong>'+safe((check.evidence||[]).slice(0,2).join(' + '))+'</strong>'+
          '<small>accessibility contract / public-safe metadata only</small>'+
        '</article>'
      ).join('')+'</div>'+
      '<small class="progress-activation-privacy">'+safe(report.public_repo_rule||'Public-safe accessibility evidence only.')+'</small>'+
    '</section>';
  }

  function renderConversationHandoffReport(data){
    const report=data.conversation_handoff_report||{};
    const scenarios=Array.isArray(report.scenarios)?report.scenarios:[];
    if(!scenarios.length)return '';
    const ready=scenarios.every((scenario)=>scenario.status==='ready'&&scenario.no_paid_routes_started===true);
    return '<section id="progress-conversation-handoff" class="progress-no-model-fixture" data-state="'+(ready?'ready':'watch')+'">'+
      '<div class="progress-route-map-head"><div><p class="eyebrow">Conversation handoff</p><h2>'+safe(report.title||'Conversation handoff QA')+'</h2></div><small>'+safe(report.principle||'Save and Fork must become visible continuation paths.')+'</small></div>'+
      '<div class="progress-no-model-grid">'+scenarios.map((scenario)=>
        '<article class="progress-no-model-scenario" data-scenario="'+safe(scenario.id)+'">'+
          '<span>'+safe(label(scenario.status==='ready'?'ready':'watch'))+'</span><h3>'+safe(scenario.action||scenario.id)+'</h3>'+
          '<p>'+safe(scenario.expected||'')+'</p>'+
          '<strong>'+safe(scenario.next_action||'continue-chat')+'</strong>'+
          '<small>'+safe(scenario.storage_key||scenario.selector||'metadata-only')+' / no spend</small>'+
        '</article>'
      ).join('')+'</div>'+
      '<small class="progress-activation-privacy">'+safe(report.public_repo_rule||'Public-safe handoff metadata only.')+'</small>'+
    '</section>';
  }

  function renderSavedChatMemoryHandoffReport(data){
    const report=data.saved_chat_memory_handoff_report||{};
    const scenarios=Array.isArray(report.scenarios)?report.scenarios:[];
    if(!scenarios.length)return '';
    const ready=scenarios.every((scenario)=>scenario.status==='ready'&&scenario.no_paid_routes_started===true);
    return '<section id="progress-saved-chat-memory-handoff" class="progress-no-model-fixture" data-state="'+(ready?'ready':'watch')+'">'+
      '<div class="progress-route-map-head"><div><p class="eyebrow">Memory handoff</p><h2>'+safe(report.title||'Saved chat memory handoff QA')+'</h2></div><small>'+safe(report.principle||'Useful saved chats become reusable context with review.')+'</small></div>'+
      '<div class="progress-no-model-grid">'+scenarios.map((scenario)=>
        '<article class="progress-no-model-scenario" data-scenario="'+safe(scenario.id)+'">'+
          '<span>'+safe(label(scenario.status==='ready'?'ready':'watch'))+'</span><h3>'+safe(scenario.target||scenario.id)+'</h3>'+
          '<p>'+safe(scenario.expected||'')+'</p>'+
          '<strong>'+safe(scenario.event||'local event')+'</strong>'+
          '<small>'+safe(scenario.storage_key||scenario.selector||'metadata-only')+' / no spend</small>'+
        '</article>'
      ).join('')+'</div>'+
      '<small class="progress-activation-privacy">'+safe(report.public_repo_rule||'Public-safe promotion metadata only.')+'</small>'+
    '</section>';
  }

  function renderPromotedContextNextAnswerReport(data){
    const report=data.promoted_context_next_answer_report||{};
    const scenarios=Array.isArray(report.scenarios)?report.scenarios:[];
    if(!scenarios.length)return '';
    const ready=scenarios.every((scenario)=>scenario.status==='ready'&&scenario.no_paid_routes_started===true);
    return '<section id="progress-promoted-context-next-answer" class="progress-no-model-fixture" data-state="'+(ready?'ready':'watch')+'">'+
      '<div class="progress-route-map-head"><div><p class="eyebrow">Next-answer context</p><h2>'+safe(report.title||'Promoted context next answer QA')+'</h2></div><small>'+safe(report.principle||'Promoted memory and knowledge must be visible and relevant.')+'</small></div>'+
      '<div class="progress-no-model-grid">'+scenarios.map((scenario)=>
        '<article class="progress-no-model-scenario" data-scenario="'+safe(scenario.id)+'">'+
          '<span>'+safe(label(scenario.status==='ready'?'ready':'watch'))+'</span><h3>'+safe(scenario.target||scenario.id)+'</h3>'+
          '<p>'+safe(scenario.expected||'')+'</p>'+
          '<strong>'+safe(scenario.runtime_function||'context proof')+'</strong>'+
          '<small>'+safe(scenario.visible_review||'visible review')+' / no spend</small>'+
        '</article>'
      ).join('')+'</div>'+
      '<small class="progress-activation-privacy">'+safe(report.public_repo_rule||'Synthetic public-safe context evidence only.')+'</small>'+
    '</section>';
  }

  function renderContextControlsReport(data){
    const report=data.context_controls_report||{};
    const scenarios=Array.isArray(report.scenarios)?report.scenarios:[];
    if(!scenarios.length)return '';
    const ready=scenarios.every((scenario)=>scenario.status==='ready'&&scenario.no_paid_routes_started===true);
    return '<section id="progress-context-controls" class="progress-no-model-fixture" data-state="'+(ready?'ready':'watch')+'">'+
      '<div class="progress-route-map-head"><div><p class="eyebrow">Context controls</p><h2>'+safe(report.title||'Per-message context controls QA')+'</h2></div><small>'+safe(report.principle||'Memory and Knowledge stay visible and optional.')+'</small></div>'+
      '<div class="progress-no-model-grid">'+scenarios.map((scenario)=>
        '<article class="progress-no-model-scenario" data-scenario="'+safe(scenario.id)+'">'+
          '<span>'+safe(label(scenario.status==='ready'?'ready':'watch'))+'</span><h3>'+safe(scenario.control||scenario.id)+'</h3>'+
          '<p>'+safe(scenario.expected||'')+'</p>'+
          '<strong>'+safe(scenario.runtime_guard||'context guard')+'</strong>'+
          '<small>'+safe(scenario.storage_key||scenario.selector||'visible control')+' / no spend</small>'+
        '</article>'
      ).join('')+'</div>'+
      '<small class="progress-activation-privacy">'+safe(report.public_repo_rule||'Synthetic public-safe control evidence only.')+'</small>'+
    '</section>';
  }

  function renderAnswerContextReceiptReport(data){
    const report=data.answer_context_receipt_report||{};
    const scenarios=Array.isArray(report.scenarios)?report.scenarios:[];
    if(!scenarios.length)return '';
    const ready=scenarios.every((scenario)=>scenario.status==='ready'&&scenario.no_paid_routes_started===true);
    return '<section id="progress-answer-context-receipt" class="progress-no-model-fixture" data-state="'+(ready?'ready':'watch')+'">'+
      '<div class="progress-route-map-head"><div><p class="eyebrow">Answer audit</p><h2>'+safe(report.title||'Answer context receipt QA')+'</h2></div><small>'+safe(report.principle||'Answers should show safe context metadata.')+'</small></div>'+
      '<div class="progress-no-model-grid">'+scenarios.map((scenario)=>
        '<article class="progress-no-model-scenario" data-scenario="'+safe(scenario.id)+'">'+
          '<span>'+safe(label(scenario.status==='ready'?'ready':'watch'))+'</span><h3>'+safe(scenario.target||scenario.id)+'</h3>'+
          '<p>'+safe(scenario.expected||'')+'</p>'+
          '<strong>'+safe(scenario.event||'receipt metadata')+'</strong>'+
          '<small>'+safe(scenario.storage_key||scenario.selector||'local receipt')+' / no spend</small>'+
        '</article>'
      ).join('')+'</div>'+
      '<small class="progress-activation-privacy">'+safe(report.public_repo_rule||'Public-safe answer receipt metadata only.')+'</small>'+
    '</section>';
  }

  function renderAnswerContextDrilldownReport(data){
    const report=data.answer_context_drilldown_report||{};
    const scenarios=Array.isArray(report.scenarios)?report.scenarios:[];
    if(!scenarios.length)return '';
    const ready=scenarios.every((scenario)=>scenario.status==='ready'&&scenario.no_paid_routes_started===true);
    return '<section id="progress-answer-context-drilldown" class="progress-no-model-fixture" data-state="'+(ready?'ready':'watch')+'">'+
      '<div class="progress-route-map-head"><div><p class="eyebrow">Answer controls</p><h2>'+safe(report.title||'Answer context drill-down QA')+'</h2></div><small>'+safe(report.principle||'Receipts should open the right controls.')+'</small></div>'+
      '<div class="progress-no-model-grid">'+scenarios.map((scenario)=>
        '<article class="progress-no-model-scenario" data-scenario="'+safe(scenario.id)+'">'+
          '<span>'+safe(label(scenario.status==='ready'?'ready':'watch'))+'</span><h3>'+safe(scenario.label||scenario.id)+'</h3>'+
          '<p>'+safe(scenario.expected||'')+'</p>'+
          '<strong>'+safe(scenario.target||'panel')+'</strong>'+
          '<small>'+safe(scenario.selector||'receipt action')+' / no spend</small>'+
        '</article>'
      ).join('')+'</div>'+
      '<small class="progress-activation-privacy">'+safe(report.public_repo_rule||'Public-safe drill-down actions only.')+'</small>'+
    '</section>';
  }

  function renderAnswerContextHighlightReport(data){
    const report=data.answer_context_highlight_report||{};
    const scenarios=Array.isArray(report.scenarios)?report.scenarios:[];
    if(!scenarios.length)return '';
    const ready=scenarios.every((scenario)=>scenario.status==='ready'&&scenario.no_paid_routes_started===true);
    return '<section id="progress-answer-context-highlight" class="progress-no-model-fixture" data-state="'+(ready?'ready':'watch')+'">'+
      '<div class="progress-route-map-head"><div><p class="eyebrow">Answer highlight</p><h2>'+safe(report.title||'Answer context highlight QA')+'</h2></div><small>'+safe(report.principle||'Receipt actions should highlight the active context.')+'</small></div>'+
      '<div class="progress-no-model-grid">'+scenarios.map((scenario)=>
        '<article class="progress-no-model-scenario" data-scenario="'+safe(scenario.id)+'">'+
          '<span>'+safe(label(scenario.status==='ready'?'ready':'watch'))+'</span><h3>'+safe(scenario.target||scenario.id)+'</h3>'+
          '<p>'+safe(scenario.expected||'')+'</p>'+
          '<strong>'+safe(scenario.event||'highlight event')+'</strong>'+
          '<small>'+safe(scenario.storage_key||'local highlight')+' / no spend</small>'+
        '</article>'
      ).join('')+'</div>'+
      '<small class="progress-activation-privacy">'+safe(report.public_repo_rule||'Public-safe highlight metadata only.')+'</small>'+
    '</section>';
  }

  function renderAnswerContextSourceFilterReport(data){
    const report=data.answer_context_source_filter_report||{};
    const scenarios=Array.isArray(report.scenarios)?report.scenarios:[];
    if(!scenarios.length)return '';
    const ready=scenarios.every((scenario)=>scenario.status==='ready'&&scenario.no_paid_routes_started===true);
    return '<section id="progress-answer-context-source-filter" class="progress-no-model-fixture" data-state="'+(ready?'ready':'watch')+'">'+
      '<div class="progress-route-map-head"><div><p class="eyebrow">Source filters</p><h2>'+safe(report.title||'Answer context source filter QA')+'</h2></div><small>'+safe(report.principle||'Receipt metadata should focus safe source IDs.')+'</small></div>'+
      '<div class="progress-no-model-grid">'+scenarios.map((scenario)=>
        '<article class="progress-no-model-scenario" data-scenario="'+safe(scenario.id)+'">'+
          '<span>'+safe(label(scenario.status==='ready'?'ready':'watch'))+'</span><h3>'+safe(scenario.target||scenario.id)+'</h3>'+
          '<p>'+safe(scenario.expected||'')+'</p>'+
          '<strong>'+safe(scenario.event||'source filter')+'</strong>'+
          '<small>'+safe(scenario.storage_key||'metadata only')+' / no spend</small>'+
        '</article>'
      ).join('')+'</div>'+
      '<small class="progress-activation-privacy">'+safe(report.public_repo_rule||'Public-safe source filter metadata only.')+'</small>'+
    '</section>';
  }

  function renderAnswerContextFilterConsumptionReport(data){
    const report=data.answer_context_filter_consumption_report||{};
    const scenarios=Array.isArray(report.scenarios)?report.scenarios:[];
    if(!scenarios.length)return '';
    const ready=scenarios.every((scenario)=>scenario.status==='ready'&&scenario.no_paid_routes_started===true);
    return '<section id="progress-answer-context-filter-consumption" class="progress-no-model-fixture" data-state="'+(ready?'ready':'watch')+'">'+
      '<div class="progress-route-map-head"><div><p class="eyebrow">Source focus</p><h2>'+safe(report.title||'Answer context filter consumption QA')+'</h2></div><small>'+safe(report.principle||'Receipt filters should become visible source focus.')+'</small></div>'+
      '<div class="progress-no-model-grid">'+scenarios.map((scenario)=>
        '<article class="progress-no-model-scenario" data-scenario="'+safe(scenario.id)+'">'+
          '<span>'+safe(label(scenario.status==='ready'?'ready':'watch'))+'</span><h3>'+safe(scenario.target||scenario.id)+'</h3>'+
          '<p>'+safe(scenario.expected||'')+'</p>'+
          '<strong>'+safe(scenario.selector||'filter consumption')+'</strong>'+
          '<small>no spend / metadata only</small>'+
        '</article>'
      ).join('')+'</div>'+
      '<small class="progress-activation-privacy">'+safe(report.public_repo_rule||'Public-safe source filter consumption only.')+'</small>'+
    '</section>';
  }

  function renderAnswerContextKnowledgeSourceReport(data){
    const report=data.answer_context_knowledge_source_report||{};
    const scenarios=Array.isArray(report.scenarios)?report.scenarios:[];
    if(!scenarios.length)return '';
    const ready=scenarios.every((scenario)=>scenario.status==='ready'&&scenario.no_paid_routes_started===true);
    return '<section id="progress-answer-context-knowledge-source" class="progress-no-model-fixture" data-state="'+(ready?'ready':'watch')+'">'+
      '<div class="progress-route-map-head"><div><p class="eyebrow">Knowledge sources</p><h2>'+safe(report.title||'Answer context knowledge source QA')+'</h2></div><small>'+safe(report.principle||'Knowledge receipts should focus exact source metadata.')+'</small></div>'+
      '<div class="progress-no-model-grid">'+scenarios.map((scenario)=>
        '<article class="progress-no-model-scenario" data-scenario="'+safe(scenario.id)+'">'+
          '<span>'+safe(label(scenario.status==='ready'?'ready':'watch'))+'</span><h3>'+safe(scenario.target||scenario.id)+'</h3>'+
          '<p>'+safe(scenario.expected||'')+'</p>'+
          '<strong>'+safe(scenario.storage_key||'knowledge source metadata')+'</strong>'+
          '<small>no spend / metadata only</small>'+
        '</article>'
      ).join('')+'</div>'+
      '<small class="progress-activation-privacy">'+safe(report.public_repo_rule||'Public-safe knowledge source metadata only.')+'</small>'+
    '</section>';
  }

  function renderAnswerContextSourceCorrectionReport(data){
    const report=data.answer_context_source_correction_report||{};
    const scenarios=Array.isArray(report.scenarios)?report.scenarios:[];
    if(!scenarios.length)return '';
    const ready=scenarios.every((scenario)=>scenario.status==='ready'&&scenario.no_paid_routes_started===true);
    const corrections=readContextCorrections();
    const trail=corrections.length?'<div id="progress-context-correction-trail" class="progress-no-model-grid">'+corrections.map((item)=>
      '<article class="progress-no-model-scenario" data-scenario="'+safe(item.target||'context')+'" data-state="'+safe(item.undone_at?'undone':'ready')+'">'+
        '<span>'+safe(item.undone_at?'undone':'logged')+'</span><h3>'+safe(label(item.target||'context')+' '+label(item.action||'correction'))+'</h3>'+
        '<p>'+safe(String(item.source_count||0)+' source(s), '+(item.undo?.length||0)+' undo step(s).')+'</p>'+
        '<strong>'+safe(item.created_at?new Date(item.created_at).toLocaleString():'local event')+'</strong>'+
        '<small>local only / no prompt or response</small>'+
      '</article>'
    ).join('')+'</div>':'<p id="progress-context-correction-trail" class="dashboard-note">No local context corrections have been logged in this workspace yet.</p>';
    return '<section id="progress-answer-context-source-correction" class="progress-no-model-fixture" data-state="'+(ready?'ready':'watch')+'">'+
      '<div class="progress-route-map-head"><div><p class="eyebrow">Source correction</p><h2>'+safe(report.title||'Answer context source correction QA')+'</h2></div><small>'+safe(report.principle||'Receipt audit should lead to safe correction.')+'</small></div>'+
      '<div class="progress-no-model-grid">'+scenarios.map((scenario)=>
        '<article class="progress-no-model-scenario" data-scenario="'+safe(scenario.id)+'">'+
          '<span>'+safe(label(scenario.status==='ready'?'ready':'watch'))+'</span><h3>'+safe(scenario.target||scenario.id)+'</h3>'+
          '<p>'+safe(scenario.expected||'')+'</p>'+
          '<strong>'+safe(scenario.selector||scenario.storage_key||'correction action')+'</strong>'+
          '<small>no spend / metadata only</small>'+
        '</article>'
      ).join('')+'</div>'+
      trail+
      '<small class="progress-activation-privacy">'+safe(report.public_repo_rule||'Public-safe source correction metadata only.')+'</small>'+
    '</section>';
  }

  function renderContextCorrectionAuditReport(data){
    const report=data.context_correction_audit_report||{};
    const scenarios=Array.isArray(report.scenarios)?report.scenarios:[];
    if(!scenarios.length)return '';
    const ready=scenarios.every((scenario)=>scenario.status==='ready'&&scenario.no_paid_routes_started===true);
    return '<section id="progress-context-correction-audit" class="progress-no-model-fixture" data-state="'+(ready?'ready':'watch')+'">'+
      '<div class="progress-route-map-head"><div><p class="eyebrow">Correction audit</p><h2>'+safe(report.title||'Context correction audit trail QA')+'</h2></div><small>'+safe(report.principle||'Corrections should be visible and reversible.')+'</small></div>'+
      '<div class="progress-no-model-grid">'+scenarios.map((scenario)=>
        '<article class="progress-no-model-scenario" data-scenario="'+safe(scenario.id)+'">'+
          '<span>'+safe(label(scenario.status==='ready'?'ready':'watch'))+'</span><h3>'+safe(scenario.target||scenario.id)+'</h3>'+
          '<p>'+safe(scenario.expected||'')+'</p>'+
          '<strong>'+safe(scenario.selector||report.storage_key||'correction audit')+'</strong>'+
          '<small>no spend / reversible metadata</small>'+
        '</article>'
      ).join('')+'</div>'+
      '<small class="progress-activation-privacy">'+safe(report.public_repo_rule||'Public-safe correction audit metadata only.')+'</small>'+
    '</section>';
  }

  function renderContextCorrectionRetryReport(data){
    const report=data.context_correction_retry_report||{};
    const scenarios=Array.isArray(report.scenarios)?report.scenarios:[];
    if(!scenarios.length)return '';
    const ready=scenarios.every((scenario)=>scenario.status==='ready'&&scenario.no_paid_routes_started===true);
    return '<section id="progress-context-correction-retry" class="progress-no-model-fixture" data-state="'+(ready?'ready':'watch')+'">'+
      '<div class="progress-route-map-head"><div><p class="eyebrow">Correction retry</p><h2>'+safe(report.title||'Context correction retry QA')+'</h2></div><small>'+safe(report.principle||'Fix context, then retry visibly.')+'</small></div>'+
      '<div class="progress-no-model-grid">'+scenarios.map((scenario)=>
        '<article class="progress-no-model-scenario" data-scenario="'+safe(scenario.id)+'">'+
          '<span>'+safe(label(scenario.status==='ready'?'ready':'watch'))+'</span><h3>'+safe(scenario.target||scenario.id)+'</h3>'+
          '<p>'+safe(scenario.expected||'')+'</p>'+
          '<strong>'+safe(scenario.selector||report.storage_key||'retry metadata')+'</strong>'+
          '<small>no hidden prompt / no spend</small>'+
        '</article>'
      ).join('')+'</div>'+
      '<small class="progress-activation-privacy">'+safe(report.public_repo_rule||'Public-safe corrected retry metadata only.')+'</small>'+
    '</section>';
  }

  function renderContextCorrectionSuggestionsReport(data){
    const report=data.context_correction_suggestions_report||{};
    const scenarios=Array.isArray(report.scenarios)?report.scenarios:[];
    if(!scenarios.length)return '';
    const ready=scenarios.every((scenario)=>scenario.status==='ready'&&scenario.no_paid_routes_started===true);
    const suggestions=contextCorrectionSuggestions();
    const current=suggestions.length?'<div id="progress-context-correction-suggestions" class="progress-no-model-grid">'+suggestions.map((suggestion)=>
      '<article class="progress-no-model-scenario" data-scenario="'+safe(suggestion.id)+'">'+
        '<span>suggested</span><h3>'+safe(suggestion.label)+'</h3><p>'+safe(suggestion.detail)+'</p>'+
        '<strong>'+safe(suggestion.target)+'</strong><small>local metadata / manual review only</small>'+
      '</article>'
    ).join('')+'</div>':'<p id="progress-context-correction-suggestions" class="dashboard-note">No correction-learning suggestions yet. They appear after local memory or knowledge corrections.</p>';
    return '<section id="progress-context-correction-suggestions-report" class="progress-no-model-fixture" data-state="'+(ready?'ready':'watch')+'">'+
      '<div class="progress-route-map-head"><div><p class="eyebrow">Correction learning</p><h2>'+safe(report.title||'Context correction suggestions QA')+'</h2></div><small>'+safe(report.principle||'Learn from explicit corrections only.')+'</small></div>'+
      '<div class="progress-no-model-grid">'+scenarios.map((scenario)=>
        '<article class="progress-no-model-scenario" data-scenario="'+safe(scenario.id)+'">'+
          '<span>'+safe(label(scenario.status==='ready'?'ready':'watch'))+'</span><h3>'+safe(scenario.target||scenario.id)+'</h3>'+
          '<p>'+safe(scenario.expected||'')+'</p>'+
          '<strong>'+safe(scenario.selector||report.source_storage_key||'suggestion metadata')+'</strong>'+
          '<small>no mutation / no spend</small>'+
        '</article>'
      ).join('')+'</div>'+
      current+
      '<small class="progress-activation-privacy">'+safe(report.public_repo_rule||'Public-safe correction suggestions only.')+'</small>'+
    '</section>';
  }

  function renderProtectedContextCorrectionSyncReport(data){
    const report=data.protected_context_correction_sync_report||{};
    const routes=Array.isArray(report.routes)?report.routes:[];
    const checks=Array.isArray(report.backend_checks)?report.backend_checks:[];
    const scenarios=Array.isArray(report.scenarios)?report.scenarios:[];
    if(!routes.length&&!scenarios.length)return '';
    const ready=scenarios.every((scenario)=>scenario.status==='ready'&&scenario.no_paid_routes_started===true&&scenario.provider_secrets_stored===false&&scenario.raw_prompt_stored===false&&scenario.raw_response_stored===false);
    const routeCards=routes.map((route)=>
      '<article class="progress-no-model-scenario" data-route="'+safe(route.method+' '+route.path)+'">'+
        '<span>'+safe(label(route.status||'beta'))+'</span><h3>'+safe(route.method+' '+route.path)+'</h3>'+
        '<p>'+safe(route.purpose||'Protected backend route.')+'</p>'+
        '<strong>'+safe(route.auth||'protected-backend-auth')+'</strong>'+
        '<small>backend:'+safe(report.backend_commit||'tracked')+' / public secrets:false</small>'+
      '</article>'
    ).join('');
    const checkCards=checks.map((check)=>
      '<article class="progress-no-model-scenario" data-check="'+safe(check.name)+'">'+
        '<span>'+safe(label(check.result||'watch'))+'</span><h3>'+safe(check.name)+'</h3>'+
        '<p>'+safe(check.evidence||'Backend check recorded.')+'</p>'+
        '<strong>'+safe(check.command||'verified')+'</strong>'+
        '<small>protected contract evidence</small>'+
      '</article>'
    ).join('');
    const scenarioCards=scenarios.map((scenario)=>
      '<article class="progress-no-model-scenario" data-scenario="'+safe(scenario.id)+'">'+
        '<span>'+safe(label(scenario.status==='ready'?'ready':'watch'))+'</span><h3>'+safe(scenario.id)+'</h3>'+
        '<p>'+safe(scenario.expected||'Protected correction sync scenario.')+'</p>'+
        '<strong>'+safe(scenario.route||'metadata-only')+'</strong>'+
        '<small>raw_prompt_stored:'+safe(Boolean(scenario.raw_prompt_stored))+' / raw_response_stored:'+safe(Boolean(scenario.raw_response_stored))+' / provider_secrets_stored:'+safe(Boolean(scenario.provider_secrets_stored))+'</small>'+
      '</article>'
    ).join('');
    return '<section id="progress-protected-context-correction-sync" class="progress-no-model-fixture" data-state="'+(ready?'ready':'watch')+'">'+
      '<div class="progress-route-map-head"><div><p class="eyebrow">Protected sync</p><h2>'+safe(report.title||'Protected Context Correction Sync Contract')+'</h2></div><small>'+safe(report.principle||'Team correction data belongs behind protected auth.')+'</small></div>'+
      '<div class="progress-no-model-grid">'+routeCards+scenarioCards+checkCards+'</div>'+
      '<small class="progress-activation-privacy">'+safe(report.public_repo_rule||'Public-safe protected sync evidence only.')+' Next: '+safe(report.next?.task||'D234')+' '+safe(report.next?.label||'UI handoff')+'.</small>'+
    '</section>';
  }

  function renderProtectedCorrectionSyncUiReport(data){
    const report=data.protected_correction_sync_ui_report||{};
    const surfaces=Array.isArray(report.ui_surfaces)?report.ui_surfaces:[];
    const actions=Array.isArray(report.actions)?report.actions:[];
    const scenarios=Array.isArray(report.scenarios)?report.scenarios:[];
    if(!surfaces.length&&!actions.length)return '';
    const ready=scenarios.every((scenario)=>scenario.status==='ready'&&scenario.no_paid_routes_started===true&&scenario.provider_secrets_stored===false&&scenario.raw_prompt_stored===false&&scenario.raw_response_stored===false);
    return '<section id="progress-protected-correction-sync-ui" class="progress-no-model-fixture" data-state="'+(ready?'ready':'watch')+'">'+
      '<div class="progress-route-map-head"><div><p class="eyebrow">Sync handoff</p><h2>'+safe(report.title||'Protected Correction Sync UI Handoff')+'</h2></div><small>'+safe(report.principle||'Public UI previews metadata and protected backend does the trusted work.')+'</small></div>'+
      '<div class="progress-no-model-grid">'+
        surfaces.map((surface)=>'<article class="progress-no-model-scenario" data-surface="'+safe(surface.id)+'"><span>surface</span><h3>'+safe(surface.anchor||surface.id)+'</h3><p>'+safe(surface.purpose||'Protected sync surface.')+'</p><strong>'+safe(surface.id)+'</strong><small>metadata preview only</small></article>').join('')+
        actions.map((action)=>'<article class="progress-no-model-scenario" data-action="'+safe(action.id)+'"><span>action</span><h3>'+safe(action.selector||action.id)+'</h3><p>'+safe(action.behavior||'Protected sync action.')+'</p><strong>'+safe(action.id)+'</strong><small>no frontend secrets</small></article>').join('')+
      '</div>'+
      '<small class="progress-activation-privacy">'+safe(report.public_repo_rule||'Public-safe sync UI evidence only.')+' Next: '+safe(report.next?.task||'D235')+' '+safe(report.next?.label||'review queue')+'.</small>'+
    '</section>';
  }

  function renderProtectedCorrectionReviewQueueReport(data){
    const report=data.protected_correction_review_queue_report||{};
    const filters=Array.isArray(report.filters)?report.filters:[];
    const scenarios=Array.isArray(report.scenarios)?report.scenarios:[];
    const safeFields=Array.isArray(report.safe_fields)?report.safe_fields:[];
    if(!filters.length&&!scenarios.length)return '';
    const ready=scenarios.every((scenario)=>scenario.status==='ready'&&scenario.no_paid_routes_started===true&&scenario.provider_secrets_stored===false&&scenario.raw_prompt_stored===false&&scenario.raw_response_stored===false);
    return '<section id="progress-protected-correction-review-queue" class="progress-no-model-fixture" data-state="'+(ready?'ready':'watch')+'">'+
      '<div class="progress-route-map-head"><div><p class="eyebrow">Review queue</p><h2>'+safe(report.title||'Protected Correction Review Queue')+'</h2></div><small>'+safe(report.principle||'Protected backend owns correction review state.')+'</small></div>'+
      '<div class="progress-no-model-grid">'+
        (report.backend_route?'<article class="progress-no-model-scenario" data-route="'+safe(report.backend_route.method+' '+report.backend_route.path)+'"><span>'+safe(label(report.backend_route.status||'beta'))+'</span><h3>'+safe(report.backend_route.method+' '+report.backend_route.path)+'</h3><p>'+safe(report.backend_route.purpose||'Protected review queue route.')+'</p><strong>'+safe(report.backend_route.auth||'protected-backend-auth')+'</strong><small>backend:'+safe(report.backend_commit||'tracked')+' / public authority:false</small></article>':'')+
        filters.map((filter)=>'<article class="progress-no-model-scenario" data-filter="'+safe(filter.id)+'"><span>filter</span><h3>'+safe(filter.id)+'</h3><p>'+safe(filter.query||'workspace filter')+'</p><strong>'+safe(filter.selector||'review control')+'</strong><small>metadata-only queue request</small></article>').join('')+
        scenarios.map((scenario)=>'<article class="progress-no-model-scenario" data-scenario="'+safe(scenario.id)+'"><span>'+safe(label(scenario.status==='ready'?'ready':'watch'))+'</span><h3>'+safe(scenario.id)+'</h3><p>'+safe(scenario.expected||'Protected review scenario.')+'</p><strong>'+safe(scenario.route||'metadata-only')+'</strong><small>raw_prompt_stored:'+safe(Boolean(scenario.raw_prompt_stored))+' / raw_response_stored:'+safe(Boolean(scenario.raw_response_stored))+' / provider_secrets_stored:'+safe(Boolean(scenario.provider_secrets_stored))+'</small></article>').join('')+
      '</div>'+
      '<small class="progress-activation-privacy">'+safe(report.public_repo_rule||'Public-safe review queue evidence only.')+' Safe fields: '+safe(safeFields.slice(0,6).join(', '))+'. Next: '+safe(report.next?.task||'D236')+' '+safe(report.next?.label||'remediation plans')+'.</small>'+
    '</section>';
  }

  function renderCorrectionRemediationPlanReport(data){
    const report=data.correction_remediation_plan_report||{};
    const scenarios=Array.isArray(report.scenarios)?report.scenarios:[];
    const steps=Array.isArray(report.safe_steps)?report.safe_steps:[];
    if(!scenarios.length&&!steps.length)return '';
    const ready=scenarios.every((scenario)=>scenario.status==='ready'&&scenario.no_paid_routes_started===true&&scenario.provider_secrets_stored===false&&scenario.raw_prompt_stored===false&&scenario.raw_response_stored===false&&scenario.execution_allowed===false);
    return '<section id="progress-correction-remediation-plan" class="progress-no-model-fixture" data-state="'+(ready?'ready':'watch')+'">'+
      '<div class="progress-route-map-head"><div><p class="eyebrow">Remediation plans</p><h2>'+safe(report.title||'Correction Remediation Plan Handoff')+'</h2></div><small>'+safe(report.principle||'Plans are explicit, approval-gated and non-executing.')+'</small></div>'+
      '<div class="progress-no-model-grid">'+
        (report.backend_route?'<article class="progress-no-model-scenario" data-route="'+safe(report.backend_route.method+' '+report.backend_route.path)+'"><span>'+safe(label(report.backend_route.status||'beta'))+'</span><h3>'+safe(report.backend_route.method+' '+report.backend_route.path)+'</h3><p>'+safe(report.backend_route.purpose||'Protected remediation plan route.')+'</p><strong>'+safe(report.backend_route.auth||'protected-backend-auth')+'</strong><small>backend:'+safe(report.backend_commit||'tracked')+' / execution_allowed:false</small></article>':'')+
        steps.map((step)=>'<article class="progress-no-model-scenario" data-step="'+safe(step)+'"><span>step</span><h3>'+safe(step)+'</h3><p>Explicit repair planning only; no hidden mutation is executed from the public UI.</p><strong>execution_allowed:false</strong><small>approval required</small></article>').join('')+
        scenarios.map((scenario)=>'<article class="progress-no-model-scenario" data-scenario="'+safe(scenario.id)+'"><span>'+safe(label(scenario.status==='ready'?'ready':'watch'))+'</span><h3>'+safe(scenario.id)+'</h3><p>'+safe(scenario.expected||'Remediation plan scenario.')+'</p><strong>'+safe(scenario.selector||'plan control')+'</strong><small>execution_allowed:'+safe(Boolean(scenario.execution_allowed))+' / raw_prompt_stored:'+safe(Boolean(scenario.raw_prompt_stored))+' / provider_secrets_stored:'+safe(Boolean(scenario.provider_secrets_stored))+'</small></article>').join('')+
      '</div>'+
      '<small class="progress-activation-privacy">'+safe(report.public_repo_rule||'Public-safe remediation plan evidence only.')+' Next: '+safe(report.next?.task||'D237')+' '+safe(report.next?.label||'execution gates')+'.</small>'+
    '</section>';
  }

  function renderCorrectionRemediationApplyGatesReport(data){
    const report=data.correction_remediation_apply_gates_report||{};
    const scenarios=Array.isArray(report.scenarios)?report.scenarios:[];
    const outcomes=Array.isArray(report.safe_outcomes)?report.safe_outcomes:[];
    if(!scenarios.length&&!outcomes.length)return '';
    const ready=scenarios.every((scenario)=>scenario.status==='ready'&&(scenario.public_frontend_authority===false||scenario.source_mutation_executed===false||scenario.no_paid_routes_started===true));
    return '<section id="progress-correction-remediation-apply-gates" class="progress-no-model-fixture" data-state="'+(ready?'ready':'watch')+'">'+
      '<div class="progress-route-map-head"><div><p class="eyebrow">Apply gates</p><h2>'+safe(report.title||'Correction Remediation Apply Gates')+'</h2></div><small>'+safe(report.principle||'Confirmed remediation gates are protected and auditable.')+'</small></div>'+
      '<div class="progress-no-model-grid">'+
        (report.backend_route?'<article class="progress-no-model-scenario" data-route="'+safe(report.backend_route.method+' '+report.backend_route.path)+'"><span>'+safe(label(report.backend_route.status||'beta'))+'</span><h3>'+safe(report.backend_route.method+' '+report.backend_route.path)+'</h3><p>'+safe(report.backend_route.purpose||'Protected remediation apply route.')+'</p><strong>'+safe(report.backend_route.auth||'protected-backend-auth')+'</strong><small>backend:'+safe(report.backend_commit||'tracked')+' / confirm_required:true</small></article>':'')+
        outcomes.map((outcome)=>'<article class="progress-no-model-scenario" data-outcome="'+safe(outcome)+'"><span>safe</span><h3>'+safe(outcome)+'</h3><p>Confirmed intent is recorded behind backend auth; source mutation stays out of GitHub Pages.</p><strong>source_mutation_executed:false</strong><small>rollback hint required</small></article>').join('')+
        scenarios.map((scenario)=>'<article class="progress-no-model-scenario" data-scenario="'+safe(scenario.id)+'"><span>'+safe(label(scenario.status==='ready'?'ready':'watch'))+'</span><h3>'+safe(scenario.id)+'</h3><p>'+safe(scenario.expected||'Apply gate scenario.')+'</p><strong>'+safe(scenario.selector||scenario.route||'apply gate')+'</strong><small>public_frontend_authority:'+safe(Boolean(scenario.public_frontend_authority))+' / source_mutation_executed:'+safe(Boolean(scenario.source_mutation_executed))+'</small></article>').join('')+
      '</div>'+
      '<small class="progress-activation-privacy">'+safe(report.public_repo_rule||'Public-safe remediation apply evidence only.')+' Next: '+safe(report.next?.task||'D238')+' '+safe(report.next?.label||'protected adapters')+'.</small>'+
    '</section>';
  }

  function renderCorrectionRemediationAdaptersReport(data){
    const report=data.correction_remediation_adapters_report||{};
    const scenarios=Array.isArray(report.scenarios)?report.scenarios:[];
    const types=Array.isArray(report.adapter_types)?report.adapter_types:[];
    if(!scenarios.length&&!types.length)return '';
    const ready=scenarios.every((scenario)=>scenario.status==='ready'&&(scenario.execution_allowed===false||scenario.source_mutation_executed===false||scenario.public_frontend_authority===false));
    return '<section id="progress-correction-remediation-adapters" class="progress-no-model-fixture" data-state="'+(ready?'ready':'watch')+'">'+
      '<div class="progress-route-map-head"><div><p class="eyebrow">Repair adapters</p><h2>'+safe(report.title||'Correction Remediation Adapters')+'</h2></div><small>'+safe(report.principle||'Confirmed remediation intent becomes backend-owned repair drafts.')+'</small></div>'+
      '<div class="progress-no-model-grid">'+
        (report.backend_route?'<article class="progress-no-model-scenario" data-route="'+safe(report.backend_route.method+' '+report.backend_route.path)+'"><span>'+safe(label(report.backend_route.status||'beta'))+'</span><h3>'+safe(report.backend_route.method+' '+report.backend_route.path)+'</h3><p>'+safe(report.backend_route.purpose||'Protected remediation adapter route.')+'</p><strong>'+safe(report.backend_route.auth||'protected-backend-auth')+'</strong><small>backend:'+safe(report.backend_commit||'tracked')+' / execution_allowed:false</small></article>':'')+
        types.map((type)=>'<article class="progress-no-model-scenario" data-adapter="'+safe(type)+'"><span>adapter</span><h3>'+safe(type)+'</h3><p>Prepares metadata-only repair drafts behind backend auth.</p><strong>source_mutation_executed:false</strong><small>public_frontend_authority:false</small></article>').join('')+
        scenarios.map((scenario)=>'<article class="progress-no-model-scenario" data-scenario="'+safe(scenario.id)+'"><span>'+safe(label(scenario.status==='ready'?'ready':'watch'))+'</span><h3>'+safe(scenario.id)+'</h3><p>'+safe(scenario.expected||'Remediation adapter scenario.')+'</p><strong>'+safe(scenario.selector||scenario.adapter||'adapter draft')+'</strong><small>execution_allowed:'+safe(Boolean(scenario.execution_allowed))+' / public_frontend_authority:'+safe(Boolean(scenario.public_frontend_authority))+'</small></article>').join('')+
      '</div>'+
      '<small class="progress-activation-privacy">'+safe(report.public_repo_rule||'Public-safe remediation adapter evidence only.')+' Next: '+safe(report.next?.task||'D239')+' '+safe(report.next?.label||'commit policy')+'.</small>'+
    '</section>';
  }

  function renderCorrectionRemediationCommitPolicyReport(data){
    const report=data.correction_remediation_commit_policy_report||{};
    const scenarios=Array.isArray(report.scenarios)?report.scenarios:[];
    const checks=Array.isArray(report.checks)?report.checks:[];
    if(!scenarios.length&&!checks.length)return '';
    const policy=report.commit_policy||{};
    const ready=scenarios.every((scenario)=>scenario.status==='ready'&&(scenario.source_mutation_allowed===false||scenario.source_mutation_executed===false||scenario.public_frontend_authority===false||scenario.commit_record_allowed===true));
    return '<section id="progress-correction-remediation-commit-policy" class="progress-no-model-fixture" data-state="'+(ready?'ready':'watch')+'">'+
      '<div class="progress-route-map-head"><div><p class="eyebrow">Commit policy</p><h2>'+safe(report.title||'Correction Remediation Commit Policy')+'</h2></div><small>'+safe(report.principle||'Adapter repair drafts require protected preview and commit receipts.')+'</small></div>'+
      '<div class="progress-no-model-grid">'+
        (report.backend_route?'<article class="progress-no-model-scenario" data-route="'+safe(report.backend_route.method+' '+report.backend_route.path)+'"><span>'+safe(label(report.backend_route.status||'beta'))+'</span><h3>'+safe(report.backend_route.method+' '+report.backend_route.path)+'</h3><p>'+safe(report.backend_route.purpose||'Protected remediation commit route.')+'</p><strong>'+safe(report.backend_route.auth||'protected-backend-auth')+'</strong><small>backend:'+safe(report.backend_commit||'tracked')+' / preview_required:'+safe(Boolean(policy.preview_required))+'</small></article>':'')+
        checks.map((check)=>'<article class="progress-no-model-scenario" data-check="'+safe(check)+'"><span>check</span><h3>'+safe(check)+'</h3><p>Commit policy must pass before a receipt can be recorded.</p><strong>source_mutation_allowed:false</strong><small>public_frontend_authority:false</small></article>').join('')+
        scenarios.map((scenario)=>'<article class="progress-no-model-scenario" data-scenario="'+safe(scenario.id)+'"><span>'+safe(label(scenario.status==='ready'?'ready':'watch'))+'</span><h3>'+safe(scenario.id)+'</h3><p>'+safe(scenario.expected||'Remediation commit policy scenario.')+'</p><strong>'+safe(scenario.selector||'commit policy')+'</strong><small>commit_record_allowed:'+safe(Boolean(scenario.commit_record_allowed))+' / source_mutation_executed:'+safe(Boolean(scenario.source_mutation_executed))+'</small></article>').join('')+
      '</div>'+
      '<small class="progress-activation-privacy">'+safe(report.public_repo_rule||'Public-safe remediation commit evidence only.')+' Next: '+safe(report.next?.task||'D240')+' '+safe(report.next?.label||'source execution')+'.</small>'+
    '</section>';
  }

  function renderCorrectionRemediationExecutionGatesReport(data){
    const report=data.correction_remediation_execution_gates_report||{};
    const scenarios=Array.isArray(report.scenarios)?report.scenarios:[];
    const checks=Array.isArray(report.checks)?report.checks:[];
    if(!scenarios.length&&!checks.length)return '';
    const policy=report.execution_policy||{};
    const supported=report.supported_execution||{};
    const blocked=report.blocked_execution||{};
    const ready=scenarios.every((scenario)=>scenario.status==='ready'&&(scenario.backend_only_execution===true||scenario.public_frontend_authority===false||scenario.knowledge_execution_supported===false||scenario.provider_secrets_stored===false));
    return '<section id="progress-correction-remediation-execution-gates" class="progress-no-model-fixture" data-state="'+(ready?'ready':'watch')+'">'+
      '<div class="progress-route-map-head"><div><p class="eyebrow">Execution gates</p><h2>'+safe(report.title||'Correction Remediation Execution Gates')+'</h2></div><small>'+safe(report.principle||'Source mutation is protected by backend-only preview and confirmation gates.')+'</small></div>'+
      '<div class="progress-no-model-grid">'+
        (report.backend_route?'<article class="progress-no-model-scenario" data-route="'+safe(report.backend_route.method+' '+report.backend_route.path)+'"><span>'+safe(label(report.backend_route.status||'beta'))+'</span><h3>'+safe(report.backend_route.method+' '+report.backend_route.path)+'</h3><p>'+safe(report.backend_route.purpose||'Protected remediation execution route.')+'</p><strong>'+safe(report.backend_route.auth||'protected-backend-auth')+'</strong><small>backend:'+safe(report.backend_commit||'tracked')+' / backend_only:'+safe(Boolean(policy.backend_only_execution))+'</small></article>':'')+
        (supported.adapter?'<article class="progress-no-model-scenario" data-supported="'+safe(supported.adapter)+'"><span>supported</span><h3>'+safe(supported.adapter)+'</h3><p>'+safe(supported.kind||'memory-scope-update')+'</p><strong>'+safe((supported.mutates||[]).join(', ')||'memory metadata')+'</strong><small>rollback metadata captured</small></article>':'')+
        (blocked.targets?'<article class="progress-no-model-scenario" data-blocked="'+safe((blocked.targets||[]).join('-'))+'"><span>blocked</span><h3>Knowledge/context</h3><p>'+safe(blocked.reason||'Unsupported targets remain review-first.')+'</p><strong>source_mutation_executed:false</strong><small>clear blocked state</small></article>':'')+
        checks.map((check)=>'<article class="progress-no-model-scenario" data-check="'+safe(check)+'"><span>check</span><h3>'+safe(check)+'</h3><p>Execution gate must pass before supported memory mutation.</p><strong>public_frontend_authority:false</strong><small>no paid route</small></article>').join('')+
        scenarios.map((scenario)=>'<article class="progress-no-model-scenario" data-scenario="'+safe(scenario.id)+'"><span>'+safe(label(scenario.status==='ready'?'ready':'watch'))+'</span><h3>'+safe(scenario.id)+'</h3><p>'+safe(scenario.expected||'Remediation execution scenario.')+'</p><strong>'+safe(scenario.selector||'execution gate')+'</strong><small>backend_only:'+safe(Boolean(scenario.backend_only_execution))+' / source_mutation_executed:'+safe(Boolean(scenario.source_mutation_executed))+'</small></article>').join('')+
      '</div>'+
      '<small class="progress-activation-privacy">'+safe(report.public_repo_rule||'Public-safe remediation execution evidence only.')+' Next: '+safe(report.next?.task||'D241')+' '+safe(report.next?.label||'rollback gates')+'.</small>'+
    '</section>';
  }

  function renderCorrectionRemediationRollbackGatesReport(data){
    const report=data.correction_remediation_rollback_gates_report||{};
    const scenarios=Array.isArray(report.scenarios)?report.scenarios:[];
    const checks=Array.isArray(report.checks)?report.checks:[];
    if(!scenarios.length&&!checks.length)return '';
    const policy=report.rollback_policy||{};
    const supported=report.supported_rollback||{};
    const blocked=report.blocked_rollback||{};
    const ready=scenarios.every((scenario)=>scenario.status==='ready'&&(scenario.backend_only_rollback===true||scenario.public_frontend_authority===false||scenario.provider_secrets_stored===false||scenario.source_mutation_executed===false||scenario.source_mutation_executed===true));
    return '<section id="progress-correction-remediation-rollback-gates" class="progress-no-model-fixture" data-state="'+(ready?'ready':'watch')+'">'+
      '<div class="progress-route-map-head"><div><p class="eyebrow">Rollback gates</p><h2>'+safe(report.title||'Correction Remediation Rollback Gates')+'</h2></div><small>'+safe(report.principle||'Source mutation needs a visible undo path.')+'</small></div>'+
      '<div class="progress-no-model-grid">'+
        (report.backend_route?'<article class="progress-no-model-scenario" data-route="'+safe(report.backend_route.method+' '+report.backend_route.path)+'"><span>'+safe(label(report.backend_route.status||'beta'))+'</span><h3>'+safe(report.backend_route.method+' '+report.backend_route.path)+'</h3><p>'+safe(report.backend_route.purpose||'Protected remediation rollback route.')+'</p><strong>'+safe(report.backend_route.auth||'protected-backend-auth')+'</strong><small>backend:'+safe(report.backend_commit||'tracked')+' / backend_only:'+safe(Boolean(policy.backend_only_rollback))+'</small></article>':'')+
        (supported.kind?'<article class="progress-no-model-scenario" data-supported="'+safe(supported.kind)+'"><span>supported</span><h3>'+safe(supported.kind)+'</h3><p>Restores captured memory metadata only.</p><strong>'+safe((supported.restores||[]).join(', ')||'memory metadata')+'</strong><small>raw text untouched</small></article>':'')+
        (blocked.targets?'<article class="progress-no-model-scenario" data-blocked="'+safe((blocked.targets||[]).join('-'))+'"><span>blocked</span><h3>Unsupported rollback</h3><p>'+safe(blocked.reason||'Unsupported targets remain review-first.')+'</p><strong>public_frontend_authority:false</strong><small>clear blocked state</small></article>':'')+
        checks.map((check)=>'<article class="progress-no-model-scenario" data-check="'+safe(check)+'"><span>check</span><h3>'+safe(check)+'</h3><p>Rollback gate must pass before protected memory restore.</p><strong>backend_only_rollback:true</strong><small>no paid route</small></article>').join('')+
        scenarios.map((scenario)=>'<article class="progress-no-model-scenario" data-scenario="'+safe(scenario.id)+'"><span>'+safe(label(scenario.status==='ready'?'ready':'watch'))+'</span><h3>'+safe(scenario.id)+'</h3><p>'+safe(scenario.expected||'Remediation rollback scenario.')+'</p><strong>'+safe(scenario.selector||'rollback gate')+'</strong><small>backend_only:'+safe(Boolean(scenario.backend_only_rollback))+' / source_mutation_executed:'+safe(Boolean(scenario.source_mutation_executed))+'</small></article>').join('')+
      '</div>'+
      '<small class="progress-activation-privacy">'+safe(report.public_repo_rule||'Public-safe remediation rollback evidence only.')+' Next: '+safe(report.next?.task||'D242')+' '+safe(report.next?.label||'knowledge source model')+'.</small>'+
    '</section>';
  }

  function renderCorrectionRemediationKnowledgeSourceModelReport(data){
    const report=data.correction_remediation_knowledge_source_model_report||{};
    const scenarios=Array.isArray(report.scenarios)?report.scenarios:[];
    const checks=Array.isArray(report.checks)?report.checks:[];
    if(!scenarios.length&&!checks.length)return '';
    const policy=report.source_model_policy||{};
    const supported=report.supported_model||{};
    const blocked=report.blocked_execution||{};
    const ready=scenarios.every((scenario)=>scenario.status==='ready'&&(scenario.source_mutation_executed===false||scenario.public_frontend_authority===false||scenario.knowledge_execution_supported===false||scenario.document_text_stored===false));
    return '<section id="progress-correction-remediation-knowledge-source-model" class="progress-no-model-fixture" data-state="'+(ready?'ready':'watch')+'">'+
      '<div class="progress-route-map-head"><div><p class="eyebrow">Knowledge source model</p><h2>'+safe(report.title||'Correction Remediation Knowledge Source Model')+'</h2></div><small>'+safe(report.principle||'Knowledge mutation needs a source model first.')+'</small></div>'+
      '<div class="progress-no-model-grid">'+
        (report.backend_route?'<article class="progress-no-model-scenario" data-route="'+safe(report.backend_route.method+' '+report.backend_route.path)+'"><span>'+safe(label(report.backend_route.status||'beta'))+'</span><h3>'+safe(report.backend_route.method+' '+report.backend_route.path)+'</h3><p>'+safe(report.backend_route.purpose||'Protected knowledge source model route.')+'</p><strong>'+safe(report.backend_route.auth||'protected-backend-auth')+'</strong><small>backend:'+safe(report.backend_commit||'tracked')+' / mutation_allowed:'+safe(Boolean(policy.source_mutation_allowed))+'</small></article>':'')+
        (supported.decisions?'<article class="progress-no-model-scenario" data-supported="knowledge-source-model"><span>supported</span><h3>Review/split decisions</h3><p>'+safe((supported.decisions||[]).join(', '))+'</p><strong>raw_text_included:'+safe(Boolean(supported.raw_text_included))+'</strong><small>metadata only</small></article>':'')+
        (blocked.targets?'<article class="progress-no-model-scenario" data-blocked="'+safe((blocked.targets||[]).join('-'))+'"><span>blocked</span><h3>Knowledge execution</h3><p>'+safe(blocked.reason||'Execution remains blocked until the next gate.')+'</p><strong>knowledge_execution_supported:false</strong><small>no paid route</small></article>':'')+
        checks.map((check)=>'<article class="progress-no-model-scenario" data-check="'+safe(check)+'"><span>check</span><h3>'+safe(check)+'</h3><p>Knowledge source model must stay metadata-only before execution.</p><strong>public_frontend_authority:false</strong><small>document_text_stored:false</small></article>').join('')+
        scenarios.map((scenario)=>'<article class="progress-no-model-scenario" data-scenario="'+safe(scenario.id)+'"><span>'+safe(label(scenario.status==='ready'?'ready':'watch'))+'</span><h3>'+safe(scenario.id)+'</h3><p>'+safe(scenario.expected||'Knowledge source model scenario.')+'</p><strong>'+safe(scenario.selector||'knowledge source model')+'</strong><small>knowledge_execution_supported:'+safe(Boolean(scenario.knowledge_execution_supported))+' / source_mutation_executed:'+safe(Boolean(scenario.source_mutation_executed))+'</small></article>').join('')+
      '</div>'+
      '<small class="progress-activation-privacy">'+safe(report.public_repo_rule||'Public-safe knowledge source model evidence only.')+' Next: '+safe(report.next?.task||'D243')+' '+safe(report.next?.label||'knowledge execution gates')+'.</small>'+
    '</section>';
  }

  function renderCorrectionRemediationKnowledgeExecutionGatesReport(data){
    const report=data.correction_remediation_knowledge_execution_gates_report||{};
    const scenarios=Array.isArray(report.scenarios)?report.scenarios:[];
    const checks=Array.isArray(report.checks)?report.checks:[];
    if(!scenarios.length&&!checks.length)return '';
    const policy=report.execution_policy||{};
    const supported=report.supported_execution||{};
    const rollback=report.rollback_metadata||{};
    const ready=scenarios.every((scenario)=>scenario.status==='ready'&&(scenario.backend_only_execution===true||scenario.public_frontend_authority===false||scenario.document_text_stored===false||scenario.provider_secrets_stored===false||scenario.no_paid_routes_started===true||scenario.raw_text_included===false));
    return '<section id="progress-correction-remediation-knowledge-execution-gates" class="progress-no-model-fixture" data-state="'+(ready?'ready':'watch')+'">'+
      '<div class="progress-route-map-head"><div><p class="eyebrow">Knowledge execution</p><h2>'+safe(report.title||'Correction Remediation Knowledge Execution Gates')+'</h2></div><small>'+safe(report.principle||'Knowledge source mutation is backend-only and metadata-only.')+'</small></div>'+
      '<div class="progress-no-model-grid">'+
        (report.backend_route?'<article class="progress-no-model-scenario" data-route="'+safe(report.backend_route.method+' '+report.backend_route.path)+'"><span>'+safe(label(report.backend_route.status||'beta'))+'</span><h3>'+safe(report.backend_route.method+' '+report.backend_route.path)+'</h3><p>'+safe(report.backend_route.purpose||'Protected knowledge execution route.')+'</p><strong>'+safe(report.backend_route.auth||'protected-backend-auth')+'</strong><small>backend:'+safe(report.backend_commit||'tracked')+' / backend_only:'+safe(Boolean(policy.backend_only_execution))+'</small></article>':'')+
        (supported.kind?'<article class="progress-no-model-scenario" data-supported="'+safe(supported.kind)+'"><span>supported</span><h3>'+safe(supported.kind)+'</h3><p>'+safe((supported.mutates||[]).join(', ')||'source metadata')+'</p><strong>raw_text_included:'+safe(Boolean(supported.raw_text_included))+'</strong><small>requires preview + confirm</small></article>':'')+
        (rollback.captured?'<article class="progress-no-model-scenario" data-rollback="knowledge-metadata"><span>rollback</span><h3>Before/after metadata</h3><p>'+safe(rollback.next_gate||'Knowledge rollback gate follows.')+'</p><strong>raw_text_included:'+safe(Boolean(rollback.raw_text_included))+'</strong><small>captured:true</small></article>':'')+
        checks.map((check)=>'<article class="progress-no-model-scenario" data-check="'+safe(check)+'"><span>check</span><h3>'+safe(check)+'</h3><p>Knowledge execution gate must pass before source metadata mutation.</p><strong>backend_only_execution:true</strong><small>document_text_stored:false</small></article>').join('')+
        scenarios.map((scenario)=>'<article class="progress-no-model-scenario" data-scenario="'+safe(scenario.id)+'"><span>'+safe(label(scenario.status==='ready'?'ready':'watch'))+'</span><h3>'+safe(scenario.id)+'</h3><p>'+safe(scenario.expected||'Knowledge execution scenario.')+'</p><strong>'+safe(scenario.selector||'knowledge execution gate')+'</strong><small>source_mutation_allowed:'+safe(Boolean(scenario.source_mutation_allowed))+' / source_mutation_executed:'+safe(Boolean(scenario.source_mutation_executed))+'</small></article>').join('')+
      '</div>'+
      '<small class="progress-activation-privacy">'+safe(report.public_repo_rule||'Public-safe knowledge execution evidence only.')+' Next: '+safe(report.next?.task||'D244')+' '+safe(report.next?.label||'knowledge rollback gates')+'.</small>'+
    '</section>';
  }

  function renderCorrectionRemediationKnowledgeRollbackGatesReport(data){
    const report=data.correction_remediation_knowledge_rollback_gates_report||{};
    const scenarios=Array.isArray(report.scenarios)?report.scenarios:[];
    const checks=Array.isArray(report.checks)?report.checks:[];
    if(!scenarios.length&&!checks.length)return '';
    const policy=report.rollback_policy||{};
    const supported=report.supported_rollback||{};
    const ready=scenarios.every((scenario)=>scenario.status==='ready'&&(scenario.backend_only_rollback===true||scenario.public_frontend_authority===false||scenario.document_text_stored===false||scenario.provider_secrets_stored===false||scenario.no_paid_routes_started===true||scenario.raw_text_included===false));
    return '<section id="progress-correction-remediation-knowledge-rollback-gates" class="progress-no-model-fixture" data-state="'+(ready?'ready':'watch')+'">'+
      '<div class="progress-route-map-head"><div><p class="eyebrow">Knowledge rollback</p><h2>'+safe(report.title||'Correction Remediation Knowledge Rollback Gates')+'</h2></div><small>Knowledge mutation stays reversible, backend-only and metadata-only.</small></div>'+
      '<div class="progress-no-model-grid">'+
        (report.backend_route?'<article class="progress-no-model-scenario" data-route="'+safe(report.backend_route.method+' '+report.backend_route.path)+'"><span>'+safe(label(report.backend_route.status||'beta'))+'</span><h3>'+safe(report.backend_route.method+' '+report.backend_route.path)+'</h3><p>'+safe(report.backend_route.purpose||'Protected knowledge rollback route.')+'</p><strong>'+safe(report.backend_route.auth||'protected-backend-auth')+'</strong><small>backend:'+safe(report.backend_commit||'tracked')+' / backend_only:'+safe(Boolean(policy.backend_only_rollback))+'</small></article>':'')+
        (supported.kind?'<article class="progress-no-model-scenario" data-supported="'+safe(supported.kind)+'"><span>supported</span><h3>'+safe(supported.kind)+'</h3><p>'+safe((supported.restores||[]).join(', ')||'source metadata')+'</p><strong>raw_text_included:'+safe(Boolean(supported.raw_text_included))+'</strong><small>requires execution receipt</small></article>':'')+
        checks.map((check)=>'<article class="progress-no-model-scenario" data-check="'+safe(check)+'"><span>check</span><h3>'+safe(check)+'</h3><p>Knowledge rollback gate must pass before restoring source metadata.</p><strong>backend_only_rollback:true</strong><small>document_text_stored:false</small></article>').join('')+
        scenarios.map((scenario)=>'<article class="progress-no-model-scenario" data-scenario="'+safe(scenario.id)+'"><span>'+safe(label(scenario.status==='ready'?'ready':'watch'))+'</span><h3>'+safe(scenario.id)+'</h3><p>'+safe(scenario.expected||'Knowledge rollback scenario.')+'</p><strong>'+safe(scenario.selector||'knowledge rollback gate')+'</strong><small>source_mutation_executed:'+safe(Boolean(scenario.source_mutation_executed))+' / no_paid_routes_started:'+safe(Boolean(scenario.no_paid_routes_started))+'</small></article>').join('')+
      '</div>'+
      '<small class="progress-activation-privacy">'+safe(report.public_repo_rule||'Public-safe knowledge rollback evidence only.')+' Next: '+safe(report.next?.task||'D245')+' '+safe(report.next?.label||'correction remediation autopilot queue')+'.</small>'+
    '</section>';
  }

  function renderCorrectionRemediationAutopilotQueueReport(data){
    const report=data.correction_remediation_autopilot_queue_report||{};
    const scenarios=Array.isArray(report.scenarios)?report.scenarios:[];
    const steps=Array.isArray(report.safe_queue_steps)?report.safe_queue_steps:[];
    if(!scenarios.length&&!steps.length)return '';
    const policy=report.autopilot_policy||{};
    const manual=report.manual_stop||{};
    const ready=scenarios.every((scenario)=>scenario.status==='ready'&&(scenario.source_mutation_executed===false||scenario.public_frontend_authority===false||scenario.provider_secrets_stored===false||scenario.document_text_stored===false||scenario.no_paid_routes_started===true));
    return '<section id="progress-correction-remediation-autopilot-queue" class="progress-no-model-fixture" data-state="'+(ready?'ready':'watch')+'">'+
      '<div class="progress-route-map-head"><div><p class="eyebrow">Autopilot queue</p><h2>'+safe(report.title||'Correction Remediation Autopilot Queue')+'</h2></div><small>MMIR does the safe obvious work, then stops before source mutation.</small></div>'+
      '<div class="progress-no-model-grid">'+
        (report.backend_route?'<article class="progress-no-model-scenario" data-route="'+safe(report.backend_route.method+' '+report.backend_route.path)+'"><span>'+safe(label(report.backend_route.status||'beta'))+'</span><h3>'+safe(report.backend_route.method+' '+report.backend_route.path)+'</h3><p>'+safe(report.backend_route.purpose||'Protected remediation autopilot route.')+'</p><strong>'+safe(report.backend_route.auth||'protected-backend-auth')+'</strong><small>backend:'+safe(report.backend_commit||'tracked')+' / mutation_allowed:'+safe(Boolean(policy.source_mutation_allowed))+'</small></article>':'')+
        steps.map((step)=>'<article class="progress-no-model-scenario" data-step="'+safe(step)+'"><span>safe</span><h3>'+safe(step)+'</h3><p>Autopilot may prepare or record this metadata-only step when prerequisites are ready.</p><strong>automatic_safe:true</strong><small>source_mutation_executed:false</small></article>').join('')+
        (manual.required?'<article class="progress-no-model-scenario" data-manual-stop="source-mutation"><span>stop</span><h3>Manual source gate</h3><p>'+safe(manual.reason||'Source mutation requires explicit confirmation.')+'</p><strong>'+safe((manual.actions||[]).join(', ')||'execute_source_mutation')+'</strong><small>public_frontend_authority:false</small></article>':'')+
        scenarios.map((scenario)=>'<article class="progress-no-model-scenario" data-scenario="'+safe(scenario.id)+'"><span>'+safe(label(scenario.status==='ready'?'ready':'watch'))+'</span><h3>'+safe(scenario.id)+'</h3><p>'+safe(scenario.expected||'Autopilot scenario.')+'</p><strong>'+safe(scenario.selector||'autopilot queue')+'</strong><small>safe_steps_executed:'+safe(Boolean(scenario.safe_steps_executed))+' / no_paid_routes_started:'+safe(Boolean(scenario.no_paid_routes_started))+'</small></article>').join('')+
      '</div>'+
      '<small class="progress-activation-privacy">'+safe(report.public_repo_rule||'Public-safe autopilot evidence only.')+' Next: '+safe(report.next?.task||'D246')+' '+safe(report.next?.label||'autopilot handoff gates')+'.</small>'+
    '</section>';
  }

  function renderCorrectionRemediationAutopilotHandoffReport(data){
    const report=data.correction_remediation_autopilot_handoff_report||{};
    const scenarios=Array.isArray(report.scenarios)?report.scenarios:[];
    const targets=Array.isArray(report.handoff_targets)?report.handoff_targets:[];
    if(!scenarios.length&&!targets.length)return '';
    const policy=report.handoff_policy||{};
    const ready=scenarios.every((scenario)=>scenario.status==='ready'&&(scenario.source_mutation_executed===false||scenario.public_frontend_authority===false||scenario.provider_secrets_stored===false||scenario.document_text_stored===false||scenario.no_paid_routes_started===true));
    return '<section id="progress-correction-remediation-autopilot-handoff" class="progress-no-model-fixture" data-state="'+(ready?'ready':'watch')+'">'+
      '<div class="progress-route-map-head"><div><p class="eyebrow">Autopilot handoff</p><h2>'+safe(report.title||'Autopilot Source-Mutation Handoff Gates')+'</h2></div><small>Resume the next backend-only confirmation without giving the public app mutation authority.</small></div>'+
      '<div class="progress-no-model-grid">'+
        (report.backend_route?'<article class="progress-no-model-scenario" data-route="'+safe(report.backend_route.method+' '+report.backend_route.path)+'"><span>'+safe(label(report.backend_route.status||'beta'))+'</span><h3>'+safe(report.backend_route.method+' '+report.backend_route.path)+'</h3><p>'+safe(report.backend_route.purpose||'Protected autopilot handoff route.')+'</p><strong>'+safe(report.backend_route.auth||'protected-backend-auth')+'</strong><small>backend:'+safe(report.backend_commit||'tracked')+' / mutation_executed:'+safe(Boolean(policy.source_mutation_executed))+'</small></article>':'')+
        targets.map((target)=>'<article class="progress-no-model-scenario" data-handoff-target="'+safe(target.target)+'"><span>handoff</span><h3>'+safe(target.target)+' source gate</h3><p>'+safe(target.route||'protected execution route')+'</p><strong>'+safe((target.confirmation_body_fields||[]).join(', '))+'</strong><small>rollback:'+safe(target.rollback_route||'required after execution')+'</small></article>').join('')+
        scenarios.map((scenario)=>'<article class="progress-no-model-scenario" data-scenario="'+safe(scenario.id)+'"><span>'+safe(label(scenario.status==='ready'?'ready':'watch'))+'</span><h3>'+safe(scenario.id)+'</h3><p>'+safe(scenario.expected||'Autopilot handoff scenario.')+'</p><strong>'+safe(scenario.selector||'handoff gate')+'</strong><small>document_text_stored:'+safe(Boolean(scenario.document_text_stored))+' / no_paid_routes_started:'+safe(Boolean(scenario.no_paid_routes_started))+'</small></article>').join('')+
      '</div>'+
      '<small class="progress-activation-privacy">'+safe(report.public_repo_rule||'Public-safe handoff evidence only.')+' Next: '+safe(report.next?.task||'D247')+' '+safe(report.next?.label||'autopilot rollback readiness cards')+'.</small>'+
    '</section>';
  }

  function renderActivationSimulator(data){
    const simulator=data.activation_simulator||{};
    const scenarios=Array.isArray(simulator.scenarios)?simulator.scenarios:[];
    if(!scenarios.length)return '';
    const surfaces=Array.isArray(simulator.required_surfaces)?simulator.required_surfaces:[];
    const replay=readActivationReplay();
    return '<section id="progress-activation-simulator" class="progress-simulator-card">'+
      '<div class="progress-activation-head"><div><p class="eyebrow">Activation simulator</p><h2>'+safe(simulator.title||'Activation simulator')+'</h2><small>'+safe(simulator.principle||'Public-safe free-first activation fixtures.')+'</small></div>'+
      '<div class="progress-activation-counts"><span>'+safe(scenarios.length)+' scenarios</span><span>'+safe(surfaces.length)+' surfaces</span><span>no spend</span></div></div>'+
      (replay?'<article id="progress-activation-replay-state" class="progress-replay-state"><div><span>Replay active</span><strong>'+safe(replay.label)+'</strong><p>'+safe(replay.expected_next_action)+'</p><small>demo_only:true / no_paid_routes_started:true / mutated_real_connector:false</small></div><button id="progress-activation-replay-clear" type="button">Reset replay</button></article>':'<p class="dashboard-note">No replay is active. Replay loads only a browser-local demo state and never touches connector tokens, provider keys or paid routes.</p>')+
      '<div class="progress-simulator-grid">'+scenarios.map((scenario)=>
        '<article class="progress-simulator-scenario" data-state="'+safe(scenario.state||scenario.id)+'">'+
          '<span>'+safe(scenario.id)+'</span><h3>'+safe(scenario.label)+'</h3>'+
          '<p>'+safe(scenario.expected_next_action)+'</p>'+
          '<small>'+safe(scenario.user_goal)+' / '+safe(scenario.cost||'free')+'</small>'+
          '<div class="progress-simulator-surfaces">'+(Array.isArray(scenario.surfaces)?scenario.surfaces.map((surface)=>'<em>'+safe(surface.surface)+'</em>').join(''):'')+'</div>'+
          '<button type="button" data-activation-replay="'+safe(scenario.id)+'">Replay safely</button>'+
        '</article>'
      ).join('')+'</div>'+
      renderReplayRouteMap(scenarios)+
      '<small class="progress-activation-privacy">'+safe(simulator.public_repo_rule||'Fixtures store no provider secrets, raw prompts or raw responses.')+'</small>'+
    '</section>';
  }

  function renderSummary(data){
    const summaryData=data.summary||{};
    return '<div class="progress-summary-grid">'+
      metric('Backlog items',summaryData.total||0,'Sequential delivery queue')+
      metric('Shipped',summaryData.done||0,'Verified for current scope')+
      metric('Beta foundations',summaryData.beta||0,'Usable, still improving')+
      metric('Next now',summaryData.next||0,'Ready for Codex work')+
      metric('Watch / blocked',(summaryData.watch||0)+(summaryData.blocked||0),'Needs external check or decision')+
    '</div>';
  }

  function renderPhases(data){
    const phases=(data.summary&&Array.isArray(data.summary.by_phase))?data.summary.by_phase:[];
    return '<section><div class="dashboard-heading"><div><p class="eyebrow">Progress by area</p><h2>Phase and workstream progress</h2></div></div>'+
      '<div class="progress-phase-grid">'+phases.map((phase)=>{
        const percent=pct(phase.done,phase.beta,phase.total);
        return '<article class="progress-phase-card"><span>'+safe(phase.phase)+'</span><h3>'+safe(percent)+'% effective progress</h3>'+
          '<div class="progress-bar" aria-label="'+safe(phase.phase)+' progress"><span class="progress-bar-fill" style="width:'+safe(percent)+'%"></span></div>'+
          '<small>'+safe(phase.done||0)+' shipped, '+safe(phase.beta||0)+' beta, '+safe(phase.next||0)+' next, '+safe(phase.planned||0)+' planned</small></article>';
      }).join('')+'</div></section>';
  }

  function renderRepos(data){
    const repos=Array.isArray(data.repos)?data.repos:[];
    const decisions=Array.isArray(data.repo_decisions)?data.repo_decisions:[];
    return '<section><div class="dashboard-heading"><div><p class="eyebrow">Repositories</p><h2>Where work lives</h2></div></div>'+
      '<div class="progress-repo-grid">'+repos.map((repo)=>
        '<article class="progress-repo-card"><span>'+safe(repo.name)+'</span><h3>'+safe(label(repo.status))+'</h3><p class="dashboard-note">'+safe(repo.purpose)+'</p><small>'+safe(repo.spend)+'</small></article>'
      ).join('')+'</div>'+
      '<div class="progress-status-row">'+decisions.map((repo)=>
        '<article class="progress-decision-card"><span>'+safe(repo.name)+'</span><h3>'+safe(repo.decision)+'</h3><small>'+safe(repo.trigger)+'</small></article>'
      ).join('')+'</div></section>';
  }

  function taskById(data,id){
    return (data.tasks||[]).find((task)=>task.seq===id);
  }

  function taskCard(task,compact){
    if(!task)return '';
    return '<article class="'+(compact?'progress-next-card':'progress-task')+'">'+
      '<div class="progress-task-head"><div><h3>'+safe(task.seq+' - '+task.work_package)+'</h3><small>'+safe(task.phase)+' / '+safe(task.priority)+' / '+safe(task.estimate)+'</small></div>'+chip(task.status)+'</div>'+
      (compact?'<small>'+safe(task.evidence)+'</small>':'<p>'+safe(task.concrete_work)+'</p><p>'+safe(task.evidence)+'</p><div class="progress-meta"><span>'+safe(task.repos)+'</span><span>'+safe(task.done_when)+'</span></div>')+
    '</article>';
  }

  function filteredTasks(data){
    const text=filterText.toLowerCase();
    return (data.tasks||[]).filter((task)=>{
      const statusOk=filterStatus==='all'||task.status===filterStatus;
      const textOk=!text||[task.seq,task.phase,task.priority,task.work_package,task.repos,task.concrete_work,task.evidence].join(' ').toLowerCase().includes(text);
      return statusOk&&textOk;
    });
  }

  function renderQueue(data){
    const next=(data.next_queue||[]).map((id)=>taskById(data,id)).filter(Boolean);
    const watch=(data.watchlist||[]).map((id)=>taskById(data,id)).filter(Boolean);
    return '<div class="progress-columns">'+
      '<section><div class="dashboard-heading"><div><p class="eyebrow">Next work</p><h2>Codex queue</h2></div></div><div class="progress-next-list">'+next.map((task)=>taskCard(task,true)).join('')+'</div></section>'+
      '<section><div class="dashboard-heading"><div><p class="eyebrow">Needs attention</p><h2>Watchlist</h2></div></div><div class="progress-next-list">'+watch.map((task)=>taskCard(task,true)).join('')+'</div></section>'+
    '</div>';
  }

  function renderTasks(data){
    const tasks=filteredTasks(data);
    return '<section><div class="dashboard-heading"><div><p class="eyebrow">Full backlog</p><h2>All delivery tasks</h2></div></div>'+
      '<div class="progress-toolbar"><input id="progress-search" type="search" placeholder="Search tasks, repos, phase..." value="'+safe(filterText)+'" />'+
      '<select id="progress-status-filter" aria-label="Filter by status">'+
        ['all','done','beta','next','watch','blocked','planned'].map((status)=>'<option value="'+status+'" '+(status===filterStatus?'selected':'')+'>'+label(status)+'</option>').join('')+
      '</select></div>'+
      '<div class="progress-list" aria-live="polite">'+(tasks.length?tasks.map((task)=>taskCard(task,false)).join(''):'<p class="dashboard-note">No tasks match this filter.</p>')+'</div></section>';
  }

  function bindFilters(){
    const search=document.getElementById('progress-search');
    const status=document.getElementById('progress-status-filter');
    if(search)search.addEventListener('input',()=>{filterText=search.value;render();});
    if(status)status.addEventListener('change',()=>{filterStatus=status.value;render();});
  }

  function openTarget(target){
    const el=document.querySelector(target);
    if(el&&'open' in el)el.open=true;
    if(el)el.scrollIntoView({block:'start',behavior:'smooth'});
  }

  function runFirstChatRecovery(){
    const state=firstChatReceiptState();
    if(state.status==='ready'){
      openTarget('#mimir-chat-runtime');
      return;
    }
    if(state.status==='error'){
      const retry=document.querySelector('#runtime-live-proof [data-proof-action="retry"]');
      if(retry){
        retry.click();
        openTarget('#mimir-chat-runtime');
        return;
      }
      window.MimirBackendProfiles?.ensureFreeLocalProfile?.();
      openTarget('#local-connector');
      return;
    }
    const prompt=document.getElementById('mimir-prompt');
    if(prompt){
      if(!String(prompt.value||'').trim()){
        prompt.value='Give me my first useful MMIR answer and the next safe setup step.';
        prompt.dispatchEvent(new Event('input',{bubbles:true}));
      }
      prompt.focus();
      window.setTimeout(()=>document.getElementById('primary-chat-link')?.click(),40);
      setSummary('first-answer-send-handoff: sending first verified answer. No paid route, provider key or secret was used.','ready');
      return;
    }
    const start=document.getElementById('start-free-chat');
    if(start){
      start.click();
      return;
    }
    openTarget('#mimir-prompt');
  }

  function bindFirstChatReceipt(){
    document.getElementById('progress-first-chat-recovery')?.addEventListener('click',runFirstChatRecovery);
  }

  function bindFirstAnswerNextStep(){
    document.getElementById('progress-first-answer-next-step-action')?.addEventListener('click',()=>{
      const step=firstAnswerNextStep();
      if(!step)return;
      window.MimirLoadDeferred?.();
      if(step.target.startsWith('#'))openTarget(step.target);
      if(step.kind==='save-chat')window.setTimeout(()=>document.getElementById('conversation-save')?.click(),80);
      if(step.kind==='add-memory')window.setTimeout(()=>document.getElementById('memory-input')?.focus(),80);
      setSummary('first-answer-next-step: '+label(step.kind)+'. No paid route, provider key or raw prompt was stored.','ready');
    });
  }

  function bindActivationTelemetry(){
    document.getElementById('progress-activation-autopilot')?.addEventListener('click',()=>{
      window.MimirActivationAutopilot?.run?.('manual');
      render();
    });
    document.getElementById('progress-activation-refresh')?.addEventListener('click',render);
    document.getElementById('progress-activation-clear')?.addEventListener('click',()=>{
      window.MimirActivationTelemetry?.clear?.();
      try{localStorage.removeItem(activationEventsStorageKey());}catch(error){}
      render();
    });
  }

  function runStarterFunnelContinue(){
    const action=starterFunnelState().nextAction;
    window.MimirActivationTelemetry?.record?.('starter-funnel-action',{status:action.kind,route:action.target,free:true,note:'Starter funnel continue opened '+action.target+'. no_paid_routes_started:true.'});
    if(action.kind==='live-proof'){
      const retry=document.querySelector('#runtime-live-proof [data-proof-action="retry"]')||document.getElementById('runtime-refresh');
      retry?.click?.();
    }
    if(action.kind==='first-chat'){
      runFirstChatRecovery();
      return;
    }
    if(action.target.startsWith('#'))openTarget(action.target);
    if(action.kind==='install')window.dispatchEvent(new CustomEvent('mmir-model-library-focus-recommended',{detail:{source:'progress-starter-funnel',no_paid_routes_started:true}}));
    setSummary('Starter funnel opened '+label(action.kind)+'. No paid route, provider key or secret was used.','ready');
  }

  function bindStarterFunnel(){
    document.getElementById('progress-starter-continue')?.addEventListener('click',runStarterFunnelContinue);
  }

  function bindActivationSimulator(){
    const scenarios=dashboard?.activation_simulator?.scenarios||[];
    root.querySelectorAll('[data-activation-replay]').forEach(button=>{
      button.addEventListener('click',()=>{
        const scenario=scenarios.find(item=>item.id===button.getAttribute('data-activation-replay'));
        if(!scenario)return;
        const replay=writeActivationReplay(scenario);
        setSummary('Activation replay loaded: '+replay.label+'. Demo-only local state; no connector, token or paid route was changed.','ready');
        render();
      });
    });
    document.getElementById('progress-activation-replay-clear')?.addEventListener('click',()=>{
      clearActivationReplay();
      setSummary('Activation replay cleared. Real workspace data was not touched.','ready');
      render();
    });
    root.querySelectorAll('[data-replay-route-target]').forEach(link=>{
      link.addEventListener('click',(event)=>{
        const target=link.getAttribute('href')||'#progress-dashboard';
        if(target.startsWith('#')){
          event.preventDefault();
          openTarget(target);
          setSummary('Opened replay route target '+target+'. This did not mutate connector, token or provider state.','ready');
        }
      });
    });
  }

  function bindLiveGapChecklist(){
    root.querySelectorAll('[data-live-gap-action]').forEach(button=>{
      button.addEventListener('click',()=>{
        const action=button.getAttribute('data-live-gap-action')||'';
        const target=button.getAttribute('data-target')||'#progress-dashboard';
        if(action==='local-profile'){
          window.MimirBackendProfiles?.ensureFreeLocalProfile?.();
        }
        if(action==='live-proof'){
          const retry=document.querySelector('#runtime-live-proof [data-proof-action="retry"]')||document.getElementById('runtime-refresh');
          retry?.click?.();
        }
        if(action==='first-chat'){
          runFirstChatRecovery();
          return;
        }
        if(target.startsWith('#'))openTarget(target);
        setSummary('Activation closure action opened: '+label(action)+'. No paid route, provider key or secret was used.','ready');
      });
    });
  }

  function openHashDetails(){
    const id=window.location.hash?window.location.hash.slice(1):'';
    if(!id)return;
    const target=document.getElementById(id);
    if(target&&target.tagName.toLowerCase()==='details')target.open=true;
  }

  function render(){
    if(!dashboard)return;
    root.innerHTML=renderFirstChatReceipt()+renderFirstAnswerNextStep()+renderActivationTelemetry()+renderStarterFunnel()+renderActivationSimulator(dashboard)+renderNoModelDeadEndReport(dashboard)+renderNoModelPublicDeployVerification(dashboard)+renderFirstFreeChatResponseReport(dashboard)+renderComposerActionBarReport(dashboard)+renderComposerActionBarVisualReport(dashboard)+renderMessageActionCompletenessReport(dashboard)+renderMessageActionVisualReport(dashboard)+renderMessageActionBrowserFixtureReport(dashboard)+renderMessageActionAccessibilityReport(dashboard)+renderConversationHandoffReport(dashboard)+renderSavedChatMemoryHandoffReport(dashboard)+renderPromotedContextNextAnswerReport(dashboard)+renderContextControlsReport(dashboard)+renderAnswerContextReceiptReport(dashboard)+renderAnswerContextDrilldownReport(dashboard)+renderAnswerContextHighlightReport(dashboard)+renderAnswerContextSourceFilterReport(dashboard)+renderAnswerContextFilterConsumptionReport(dashboard)+renderAnswerContextKnowledgeSourceReport(dashboard)+renderAnswerContextSourceCorrectionReport(dashboard)+renderContextCorrectionAuditReport(dashboard)+renderContextCorrectionRetryReport(dashboard)+renderContextCorrectionSuggestionsReport(dashboard)+renderProtectedContextCorrectionSyncReport(dashboard)+renderProtectedCorrectionSyncUiReport(dashboard)+renderProtectedCorrectionReviewQueueReport(dashboard)+renderCorrectionRemediationPlanReport(dashboard)+renderCorrectionRemediationApplyGatesReport(dashboard)+renderCorrectionRemediationAdaptersReport(dashboard)+renderCorrectionRemediationCommitPolicyReport(dashboard)+renderCorrectionRemediationExecutionGatesReport(dashboard)+renderCorrectionRemediationRollbackGatesReport(dashboard)+renderCorrectionRemediationKnowledgeSourceModelReport(dashboard)+renderCorrectionRemediationKnowledgeExecutionGatesReport(dashboard)+renderCorrectionRemediationKnowledgeRollbackGatesReport(dashboard)+renderCorrectionRemediationAutopilotQueueReport(dashboard)+renderCorrectionRemediationAutopilotHandoffReport(dashboard)+renderLiveGapChecklist()+renderSummary(dashboard)+renderPhases(dashboard)+renderQueue(dashboard)+renderRepos(dashboard)+renderTasks(dashboard);
    window.dispatchEvent(new CustomEvent('mmir-progress-dashboard-rendered',{detail:{task_count:Array.isArray(dashboard.tasks)?dashboard.tasks.length:0}}));
    bindFirstChatReceipt();
    bindFirstAnswerNextStep();
    bindActivationTelemetry();
    bindStarterFunnel();
    bindActivationSimulator();
    bindLiveGapChecklist();
    bindFilters();
    openHashDetails();
  }

  async function init(){
    if(refreshButton)refreshButton.disabled=true;
    setSummary('Loading progress dashboard...','loading');
    try{
      dashboard=await fetchDashboard();
      render();
      const time=dashboard.updated_at?new Date(dashboard.updated_at).toLocaleString():'unknown time';
      setSummary('Progress data loaded. Last built '+time+'.','ready');
    }catch(error){
      root.innerHTML='<p class="dashboard-note">Progress dashboard data could not be loaded.</p>';
      setSummary('Progress data unavailable. Run the dashboard build script and deploy again.','error');
    }finally{
      if(refreshButton)refreshButton.disabled=false;
    }
  }

  if(refreshButton)refreshButton.addEventListener('click',init);
  window.addEventListener('hashchange',openHashDetails);
  window.addEventListener('mmir-first-chat-receipt-updated',render);
  window.addEventListener('mmir-context-corrections-updated',render);
  window.addEventListener('mmir-context-correction-knowledge-execution-updated',render);
  window.addEventListener('mmir-context-correction-knowledge-rollback-updated',render);
  window.addEventListener('mmir-activation-telemetry-updated',render);
  window.addEventListener('mmir-activation-autopilot-updated',render);
  window.addEventListener('mmir-activation-replay-updated',render);
  window.addEventListener('mmir-chat-history-updated',render);
  window.addEventListener('storage',render);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
