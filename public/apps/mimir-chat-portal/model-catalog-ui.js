(function(){
  const api=window.MimirApiClient;
  const modelSelect=document.getElementById('backend-model-catalog');
  const capacitySelect=document.getElementById('backend-capacity-profile');
  const modelNotes=document.getElementById('backend-models');
  const capacityNotes=document.getElementById('backend-cost');
  const description=document.getElementById('model-catalog-description');
  const libraryGrid=document.getElementById('model-library-grid');
  const backendSettings=document.getElementById('backend-settings');
  const WORKSPACE_KEY='mimir-active-workspace-v1';
  const DEFAULT_WORKSPACE_ID='personal';
  const ACTIVATION_PREFIX='mimir-activation-events-v1:';
  const REPAIR_RESUME_PREFIX='mimir-repair-resume-v1:';
  const DEFAULT_API_URL='https://api.mmir.ai';
  let catalog={models:[],capacity_profiles:[],registry_models:[],catalog_actions:[]};
  let pendingRecommendedFocus=false;

  function safe(value){return String(value||'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');}
  function selectedModel(){return catalog.models.find(item=>item.id===modelSelect.value)||catalog.models[0]||null;}
  function selectedCapacity(){return catalog.capacity_profiles.find(item=>item.id===capacitySelect.value)||null;}
  function statusClass(status){return 'model-status-'+String(status||'unknown').replace(/[^a-z0-9-]/gi,'-').toLowerCase();}
  function statusLabel(status){return String(status||'unknown').replaceAll('-',' ');}
  function modelLicense(model){return model.license_name||model.license||'check required';}
  function commercialUse(model){return model.commercial_use||'check-required';}
  function compactValue(value,fallback){return String(value||fallback||'').trim()||'unknown';}
  function catalogAction(model){return model?.catalog_action||model?.activation_action||null;}
  function catalogActionLabel(action){
    if(!action)return '';
    return action.label_no||action.label||String(action.action_id||'').replaceAll('_',' ');
  }
  function catalogActionTrust(action){
    if(!action)return '';
    if(action.provider_called===false&&action.no_paid_routes_started===true)return 'safe no-provider-call action';
    if(action.provider_secrets_in_browser===false)return 'server-side secret boundary';
    return action.status||'backend action';
  }
  function actionKey(provider,model){
    return (String(provider||'').trim().toLowerCase()+'::'+String(model||'').trim().toLowerCase()).replace(/\s+/g,' ');
  }
  function actionProvider(model){
    return model?.provider||model?.provider_family||model?.family||'';
  }
  function actionModelName(model){
    return model?.model||model?.route_model||model?.id||'';
  }
  function lifecycleState(model){
    const action=catalogAction(model);
    if(action?.action_id==='use_in_chat')return 'active_in_chat';
    if(action?.action_id==='run_hidden_probe'||action?.action_id==='refresh_public_smoke')return 'verified';
    if(action?.action_id==='complete_node_handoff'||action?.action_id==='verify_free_cost_class'||action?.action_id==='complete_admission_gates'||action?.action_id==='configure_server_credential')return 'connectable';
    const status=String(model?.status||'').toLowerCase();
    if(model?.promoted||status==='promoted')return 'promoted';
    if(model?.eligible_for_supergeni||status==='eligible-for-supergeni')return 'eligible_for_supergeni';
    if(isRegistryLive(model))return 'active_in_chat';
    if(model?.verified||status==='verified')return 'verified';
    if(model?.configured||status==='configured')return 'configured';
    if(['installable-free','candidate','add-yourself'].includes(status))return 'connectable';
    return 'listed';
  }
  function lifecycleLabel(state){
    return ({
      listed:'Listed',
      connectable:'Connectable',
      configured:'Configured',
      verified:'Verified',
      active_in_chat:'Active in chat',
      eligible_for_supergeni:'Supergeni eligible',
      promoted:'Promoted'
    })[state]||'Listed';
  }
  function lifecycleHint(model,state){
    const action=catalogAction(model);
    if(action?.explanation)return action.explanation;
    if(action?.endpoint)return 'Backend action contract is available at '+action.endpoint+'.';
    if(state==='promoted')return 'Promoted for Supergeni routing after proof.';
    if(state==='eligible_for_supergeni')return 'Verified route can be used by Supergeni fanout.';
    if(state==='active_in_chat')return 'Backend reports this model as live; use it directly in chat.';
    if(state==='verified')return 'Health and receipt proof exist; promotion is still explicit.';
    if(state==='configured')return 'Configured but not yet proven end-to-end.';
    if(state==='connectable')return 'Can be connected or installed, then verified before promotion.';
    return 'Visible as potential capacity. Not live until configured and proven.';
  }
  function actionLabelForModel(model,state){
    const action=catalogAction(model);
    const label=catalogActionLabel(action);
    if(label)return label;
    if(state==='active_in_chat'||state==='eligible_for_supergeni'||state==='promoted')return 'Use in chat';
    if(model?.registry_source==='free-starter-catalog'&&model?.runtime==='ollama')return 'Connect';
    if(state==='connectable'||state==='configured')return 'Activate';
    if(state==='verified')return 'Use in chat';
    return 'View requirements';
  }
  function modelTruthMetrics(model,state){
    const live=isRegistryLive(model);
    const action=catalogAction(model);
    const cost=compactValue(model.cost||model.cost_class||model.access,'provider-dependent');
    const latency=compactValue(model.latency_hint||model.throughput_hint||model.capacity_hint,'not measured');
    const norwegian=compactValue(model.norwegian_score||model.language_score||model.locale_score,'not scored');
    const trust=action?catalogActionTrust(action):(live?'backend receipt required':(state==='connectable'?'setup proof required':'not live'));
    const source=action?'live backend action contract':(live?'protected backend registry':compactValue(model.registry_source||model.source||model.access,'static catalog'));
    return [
      ['State',lifecycleLabel(state)],
      ['Action',actionLabelForModel(model,state)],
      ['Cost',cost],
      ['Latency',latency],
      ['Norwegian',norwegian],
      ['Trust',trust],
      ['Source',source]
    ];
  }
  function isUnavailable(model){return ['planned','future','disabled','deprecated','requires-backend-router','requires-paid-provider','requires-paid-capacity'].includes(String(model.status||''));}
  function isHiddenPublicModel(model){
    const visibility=String(model?.visibility||'').toLowerCase();
    const runtime=String(model?.runtime||'').toLowerCase();
    const status=String(model?.status||'').toLowerCase();
    return visibility==='internal'||runtime.includes('rag')||status.includes('rag')||status==='requires-rag-pipeline';
  }
  function isRegistryLive(model){
    const action=catalogAction(model);
    return action?.action_id==='use_in_chat'||model.registry_source==='active-provider'||model.source==='active-provider'||String(model.access||'').includes('active backend');
  }
  function workspaceId(){try{return localStorage.getItem(WORKSPACE_KEY)||DEFAULT_WORKSPACE_ID;}catch(error){return DEFAULT_WORKSPACE_ID;}}
  function readActivationEvents(){try{const events=JSON.parse(localStorage.getItem(ACTIVATION_PREFIX+workspaceId())||'[]');return Array.isArray(events)?events:[];}catch(error){return [];}}
  function writeRepairResume(payload){
    const resume={...payload,status:payload?.status||'pending',at:new Date().toISOString(),no_paid_routes_started:true,provider_secrets_stored:false,raw_prompt_stored:false,raw_response_stored:false};
    try{localStorage.setItem(REPAIR_RESUME_PREFIX+workspaceId(),JSON.stringify(resume));}catch(error){}
    window.dispatchEvent(new CustomEvent('mmir-repair-resume-started',{detail:resume}));
    return resume;
  }
  function openStarterInstaller(model,source){
    const params=new URLSearchParams({source:source||'model-library'});
    if(model?.id)params.set('starter',model.id);
    if(model?.model)params.set('model',model.model);
    const target='./downloads/mmir-local-connector-install.html?'+params;
    const resume=writeRepairResume({action:'starter-install-repair',target,model:model?.model||'',starter_id:model?.id||'',note:'Opening no-spend local installer for '+(model?.model||model?.label||'selected starter')+'.',next_action:'installer-download'});
    window.MimirActivationTelemetry?.record?.('starter-install-installer-opened',{status:'installer',model:model?.model||model?.id||'',route:target,free:true,note:'Model Library install opened universal installer. no_paid_routes_started:true.'});
    window.dispatchEvent(new CustomEvent('mmir-starter-install-repair-opened',{detail:resume}));
    window.location.href=target;
  }
  function latestRecommendedStarter(){return [...readActivationEvents()].reverse().find(event=>event.type==='recommended-starter')||null;}
  function isRecommendedStarter(model){
    const starter=latestRecommendedStarter();
    if(!starter)return false;
    const modelTag=String(model.model||'');
    const id=String(model.id||'');
    const label=String(model.label||'');
    const starterModel=String(starter.model||'');
    return Boolean(starterModel&&(modelTag===starterModel||id.includes(starterModel.replace(/[^a-z0-9]+/gi,'-').toLowerCase())||label.includes(starterModel)));
  }
  function focusRecommendedStarter(detail){
    const starter=detail?.starter||latestRecommendedStarter();
    const model=String(starter?.model||'');
    const card=libraryGrid?.querySelector('[data-recommended-starter="true"]')||Array.from(libraryGrid?.querySelectorAll('.model-card')||[]).find(item=>model&&item.getAttribute('data-model-tag')===model);
    if(!card)return false;
    if(detail?.silent)return true;
    const section=document.getElementById('model-library');
    if(section)section.open=true;
    card.classList.add('is-focus-pulse');
    card.setAttribute('tabindex','-1');
    card.scrollIntoView({behavior:'smooth',block:'center'});
    card.focus({preventScroll:true});
    window.setTimeout(()=>card.classList.remove('is-focus-pulse'),2200);
    return true;
  }
  function modelLibraryGroups(models){
    const groups=[
      {id:'live',title:'Active backend models',hint:'Real models reported by the connected trusted backend.',items:[]},
      {id:'free',title:'Free and installable suggestions',hint:'Free local/browser candidates that still need the matching runtime before they are live.',items:[]},
      {id:'protected',title:'Protected, premium or planned routes',hint:'These stay disabled until a backend, policy or explicit cost approval exists.',items:[]}
    ];
    for(const model of models){
      if(isRegistryLive(model))groups[0].items.push(model);
      else if(isUnavailable(model))groups[2].items.push(model);
      else groups[1].items.push(model);
    }
    return groups.filter(group=>group.items.length);
  }

  function registryModelToCatalog(model){
    return {
      id:model.id,
      label:model.label||model.id,
      family:model.family||'Registry',
      provider_family:model.provider||'backend',
      category:(model.source==='active-provider'?'active backend':'registry'),
      access:model.source==='active-provider'?'active backend':'custom registry',
      status:model.status||'candidate',
      license_name:model.license||'check-required',
      commercial_use:model.commercial_use||'check-required',
      best_for:model.notes||'Model exposed by the protected backend registry.',
      capacity_hint:model.cost_class||'backend-default',
      size_hint:model.context_window?('context '+String(model.context_window)):'backend reported',
      ram_hint:'backend reported',
      gpu_hint:'backend reported',
      cpu_hint:'backend reported',
      context_hint:model.context_window?String(model.context_window):'backend reported',
      notes:model.notes||'Registry metadata from active backend.',
      registry_source:model.source||'backend',
      provider:model.provider||'backend',
      model:model.model||model.id,
      route_id:model.route_id||model.id,
      catalog_action:model.catalog_action||model.activation_action||null
    };
  }

  function actionRowToCatalog(row){
    const action=row.catalog_action||row.activation_action||{};
    const provider=row.provider||action.provider||'provider';
    const model=row.model||action.model||row.route_id||'model';
    const label=row.display_name||row.label||(`${provider}: ${model}`);
    const active=action.action_id==='use_in_chat'||row.live_e2e_verified;
    return {
      id:'action-'+String(provider+'-'+model).replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'').toLowerCase(),
      label,
      family:'Backend contract',
      provider_family:provider,
      provider,
      category:active?'active backend model':'proof-gated backend action',
      access:active?'active backend':'backend action contract',
      status:active?'verified':'candidate',
      license_name:'provider terms',
      commercial_use:'check-required',
      best_for:action.explanation||row.reason||'Backend-reported action for this model.',
      capacity_hint:action.no_paid_routes_started===true?'no paid route started':'proof-gated',
      size_hint:'provider reported',
      ram_hint:'server-side',
      gpu_hint:'server-side',
      cpu_hint:'server-side',
      context_hint:'backend reported',
      notes:action.explanation||'Live catalog action contract from api.mmir.ai.',
      registry_source:'model-catalog-actions',
      source:active?'active-provider':'model-catalog-actions',
      model,
      route_id:row.route_id||action.route_id||model,
      catalog_action:action,
      activation_action:action,
      live_e2e_verified:Boolean(row.live_e2e_verified),
      selectable:Boolean(row.selectable),
      executable:Boolean(row.executable)
    };
  }

  function starterModelToCatalog(model){
    return {
      id:model.id,
      label:model.label||model.model||model.id,
      family:model.runtime==='webllm'?'Browser WebGPU':(model.runtime==='browser-guide'?'MMIR Guide':'Ollama'),
      provider_family:model.runtime||'starter',
      category:model.runtime==='browser-guide'?'ready browser helper':'free starter model',
      access:model.runtime==='browser-guide'?'free browser':(model.runtime==='webllm'?'free browser WebGPU':'Ollama-compatible local'),
      status:model.status||'installable-free',
      runtime:model.runtime||'starter',
      cost:model.cost||'free',
      license_name:model.license||model.commercial_use||'check-required',
      commercial_use:model.commercial_use||'check-required',
      best_for:model.best_for||model.install_note||'Free starter model for MMIR activation.',
      capacity_hint:model.runtime==='browser-guide'?'browser-ready':'low-to-standard',
      size_hint:model.size||'varies',
      ram_hint:model.runtime==='browser-guide'?'browser only':'device dependent',
      gpu_hint:model.runtime==='webllm'?'WebGPU required':'optional for small local starters',
      cpu_hint:model.runtime==='ollama'?'CPU works for small quantized starters':'browser/backend dependent',
      context_hint:model.context||'varies',
      notes:model.install_note||'Install or activate this free starter before production use.',
      model:model.model||'',
      model_card_url:model.source_url||'',
      registry_source:'free-starter-catalog'
    };
  }

  function mergeStarterModels(baseModels,starterModels){
    const seen=new Set((baseModels||[]).map(model=>model.id));
    const mapped=(starterModels||[]).map(starterModelToCatalog).filter(model=>{
      if(!model.id||seen.has(model.id))return false;
      if(isHiddenPublicModel(model))return false;
      seen.add(model.id);
      return true;
    });
    return (baseModels||[]).concat(mapped);
  }

  function mergeRegistryModels(baseModels,registryModels){
    const seen=new Set((baseModels||[]).map(model=>model.id));
    const mapped=(registryModels||[]).map(registryModelToCatalog).filter(model=>{
      if(!model.id||seen.has(model.id))return false;
      seen.add(model.id);
      return true;
    });
    return (baseModels||[]).concat(mapped);
  }

  function mergeCatalogActionModels(baseModels,actionRows){
    const models=(baseModels||[]).map(model=>({...model}));
    const byId=new Map(models.map((model,index)=>[String(model.id||''),index]));
    const byProviderModel=new Map();
    models.forEach((model,index)=>{
      const key=actionKey(actionProvider(model),actionModelName(model));
      if(key!=='::')byProviderModel.set(key,index);
    });
    for(const row of actionRows||[]){
      const mapped=actionRowToCatalog(row);
      if(!mapped.id)continue;
      const key=actionKey(mapped.provider,mapped.model);
      const index=byProviderModel.has(key)?byProviderModel.get(key):byId.get(mapped.id);
      if(typeof index==='number'){
        models[index]={...models[index],...mapped,id:models[index].id||mapped.id,label:models[index].label||mapped.label};
      }else{
        byId.set(mapped.id,models.length);
        byProviderModel.set(key,models.length);
        models.push(mapped);
      }
    }
    return models;
  }

  async function fetchRegistryModels(){
    if(!api)return [];
    const profile=api.activeProfile();
    const url=api.cleanUrl(profile?.url);
    if(!profile||!url)return [];
    try{
      const token=await api.pairIfNeeded(profile,url);
      const data=await api.fetchJson(api.joinUrl(url,'/registry/models'),{
        method:'GET',
        headers:api.authHeaders(token),
        timeoutMs:5000
      });
      return Array.isArray(data?.data)?data.data:[];
    }catch(error){
      return [];
    }
  }

  async function fetchCatalogActions(){
    if(!api)return [];
    const profile=api.activeProfile?.();
    const url=api.cleanUrl(profile?.url)||DEFAULT_API_URL;
    try{
      const token=profile?await api.pairIfNeeded(profile,url):'';
      const data=await api.fetchJson(api.joinUrl(url,'/control-plane/model-catalog/actions'),{
        method:'GET',
        headers:api.authHeaders(token),
        timeoutMs:5000
      });
      return Array.isArray(data?.actions)?data.actions:[];
    }catch(error){
      return [];
    }
  }

  async function fetchStarterModels(){
    try{
      const response=await fetch('./free-model-starters.json',{cache:'no-cache'});
      if(!response.ok)throw new Error('starter catalog unavailable');
      const data=await response.json();
      return Array.isArray(data.models)?data.models:[];
    }catch(error){
      return [];
    }
  }

  function renderDescription(){
    if(!description||!modelSelect||!capacitySelect)return;
    const model=selectedModel();
    const capacity=selectedCapacity();
    const parts=[];
    if(model){
      parts.push((model.label||model.id)+': '+(model.best_for||model.notes||'Model guidance.'));
      if(model.status)parts.push('Status: '+statusLabel(model.status)+'.');
      if(model.access)parts.push('Access: '+model.access+'.');
      parts.push('License: '+modelLicense(model)+'.');
      parts.push('Commercial use: '+commercialUse(model)+'.');
      if(model.capacity_hint)parts.push('Suggested capacity: '+model.capacity_hint+'.');
      if(model.ram_hint)parts.push('RAM: '+model.ram_hint+'.');
      if(model.gpu_hint)parts.push('GPU: '+model.gpu_hint+'.');
    }
    if(capacity)parts.push('Capacity: '+(capacity.description||capacity.label||capacity.id)+'.');
    parts.push('Guidance only. Verify official model cards before production use. API keys and provider secrets belong server-side.');
    description.textContent=parts.join(' ');
  }

  function applySuggestion(){
    if(!modelSelect)return;
    const model=selectedModel();
    if(model&&model.id!=='custom'){
      if(modelNotes)modelNotes.value=model.label||model.id;
      if(capacityNotes){
        const action=catalogAction(model);
        const actionNote=action?('Action: '+catalogActionLabel(action)+' · '+(action.status||action.action_id||'backend contract')):'';
        const endpointNote=action?.endpoint?('Endpoint: '+action.endpoint):'';
        const note=[model.status?('Status: '+statusLabel(model.status)):'',model.access?('Access: '+model.access):'',actionNote,endpointNote,('License: '+modelLicense(model)),('Commercial: '+commercialUse(model)),model.capacity_hint?('Capacity: '+model.capacity_hint):''].filter(Boolean).join(' - ');
        if(note)capacityNotes.value=note;
      }
      if(capacitySelect&&model.capacity_hint){
        const match=(catalog.capacity_profiles||[]).find(item=>item.id===model.capacity_hint);
        if(match)capacitySelect.value=match.id;
      }
    }
    renderDescription();
  }

  function chooseModel(id){
    if(modelSelect)modelSelect.value=id||'custom';
    applySuggestion();
    if(backendSettings)backendSettings.open=true;
  }

  function handoffStarter(id,action){
    const model=(catalog.models||[]).find(item=>item.id===id);
    if(!model)return;
    const target=document.getElementById('mimir-chat-runtime');
    if(target&&'open' in target)target.open=true;
    if(target)target.scrollIntoView({behavior:'smooth',block:'start'});
    window.MimirActivationTelemetry?.record?.('model-library-starter-handoff',{status:action||'select',model:model.model||model.id,route:'model library',free:true,note:'Model Library handed '+(model.model||model.id)+' to chat runtime. no_paid_routes_started:true.'});
    if(action==='install'&&model.runtime==='ollama'){
      openStarterInstaller(model,'model-library');
      return;
    }
    window.dispatchEvent(new CustomEvent('mmir-runtime-starter-handoff',{detail:{starter_id:model.id,model:model.model||'',runtime:model.runtime||'',action:action||'select',source:'model-library',free:true,no_paid_routes_started:true}}));
  }

  function cardForModel(model){
    const action=catalogAction(model);
    const disabled=isUnavailable(model)&&action?.enabled!==true;
    const recommended=isRecommendedStarter(model);
    const starter=model.registry_source==='free-starter-catalog';
    const state=lifecycleState(model);
    const buttonLabel=disabled?'Requires protected backend':actionLabelForModel(model,state);
    const actionId=action?.action_id||'';
    const starterAction=model.runtime==='ollama'?'install':'select';
    const starterLabel=actionLabelForModel(model,state);
    const metrics=modelTruthMetrics(model,state).map(([key,value])=>'<div><dt>'+safe(key)+'</dt><dd>'+safe(value)+'</dd></div>').join('');
    return '<article class="model-card '+safe(statusClass(model.status))+(recommended?' is-recommended-starter':'')+'" data-model-id="'+safe(model.id)+'" data-model-tag="'+safe(model.model||'')+'" data-model-lifecycle-state="'+safe(state)+'" data-model-action="'+safe(buttonLabel)+'" data-model-action-id="'+safe(actionId)+'" data-recommended-starter="'+safe(recommended?'true':'false')+'">'+
      '<div class="model-card-header"><h3>'+safe(model.label||model.id)+'</h3><span class="model-lifecycle-badge" data-lifecycle-state="'+safe(state)+'">'+safe(recommended?'recommended starter':lifecycleLabel(state))+'</span></div>'+
      (recommended?'<small class="model-recommended-note">Recommended for this device. Free/local path; no paid route starts here.</small>':'')+
      '<small class="model-lifecycle-note">'+safe(lifecycleHint(model,state))+'</small>'+
      '<p>'+safe(model.best_for||model.notes||'Model option for a compatible backend.')+'</p>'+
      '<dl class="model-truth-grid">'+metrics+'<div><dt>Category</dt><dd>'+safe(model.category||'general')+'</dd></div><div><dt>Capacity</dt><dd>'+safe(model.capacity_hint||'backend')+'</dd></div><div><dt>License</dt><dd>'+safe(modelLicense(model))+'</dd></div><div><dt>Commercial</dt><dd>'+safe(commercialUse(model))+'</dd></div></dl>'+
      '<div class="model-card-actions">'+
        (starter&&!disabled?'<button type="button" data-starter-id="'+safe(model.id)+'" data-starter-action="'+safe(starterAction)+'">'+safe(starterLabel)+'</button>':'')+
        '<button type="button" data-id="'+safe(model.id)+'" '+(disabled?'disabled aria-disabled="true"':'')+'>'+safe(buttonLabel)+'</button>'+
      '</div>'+
      '<small class="model-proof-note">No browser secrets. Active means proven by backend health, chat and receipt evidence; promotion is reversible.</small>'+
    '</article>';
  }

  function renderLibrary(){
    if(!libraryGrid)return;
    const models=(catalog.models||[]).filter(item=>item.id!=='custom'&&!isHiddenPublicModel(item));
    if(!models.length){libraryGrid.innerHTML='<p class="empty-backends">Model catalog is not available yet.</p>';return;}
    libraryGrid.innerHTML=modelLibraryGroups(models).map(group=>{
      return '<section class="model-library-section" data-model-section="'+safe(group.id)+'">'+
        '<div class="model-library-section-head"><h3>'+safe(group.title)+'</h3><p>'+safe(group.hint)+'</p></div>'+
        '<div class="model-library-section-grid">'+group.items.map(cardForModel).join('')+'</div>'+
      '</section>';
    }).join('');
    libraryGrid.querySelectorAll('button[data-starter-id]:not([disabled])').forEach(button=>button.addEventListener('click',()=>handoffStarter(button.getAttribute('data-starter-id'),button.getAttribute('data-starter-action'))));
    libraryGrid.querySelectorAll('button[data-id]:not([disabled])').forEach(button=>button.addEventListener('click',()=>chooseModel(button.getAttribute('data-id'))));
    if(pendingRecommendedFocus)window.setTimeout(()=>{if(focusRecommendedStarter({}))pendingRecommendedFocus=false;},80);
    else focusRecommendedStarter({silent:true});
  }

  function populate(){
    if(modelSelect){
      const models=catalog.models.length?catalog.models:[{id:'custom',label:'Custom / user supplied'}];
      modelSelect.innerHTML=models.map(item=>'<option value="'+safe(item.id)+'">'+safe(item.label||item.id)+'</option>').join('');
    }
    if(capacitySelect){
      const caps=[{id:'backend-default',label:'Backend default',description:'Use the backend default capacity.'}].concat(catalog.capacity_profiles||[]);
      capacitySelect.innerHTML=caps.map(item=>'<option value="'+safe(item.id)+'">'+safe(item.label||item.id)+'</option>').join('');
    }
    renderDescription();
    renderLibrary();
  }

  async function init(){
    try{
      const response=await fetch('./ai-model-catalog.json',{cache:'no-cache'});
      if(!response.ok)throw new Error('catalog unavailable');
      const data=await response.json();
      const [registryModels,starterModels,catalogActions]=await Promise.all([fetchRegistryModels(),fetchStarterModels(),fetchCatalogActions()]);
      const staticModels=Array.isArray(data.models)?data.models.filter(model=>!isHiddenPublicModel(model)):[];
      catalog={
        models:mergeCatalogActionModels(mergeRegistryModels(mergeStarterModels(staticModels,starterModels),registryModels),catalogActions),
        capacity_profiles:Array.isArray(data.capacity_profiles)?data.capacity_profiles:[],
        registry_models:registryModels,
        catalog_actions:catalogActions
      };
    }catch(error){
      const [registryModels,starterModels,catalogActions]=await Promise.all([fetchRegistryModels(),fetchStarterModels(),fetchCatalogActions()]);
      catalog={
        models:mergeCatalogActionModels(mergeRegistryModels(mergeStarterModels([{id:'custom',label:'Custom / user supplied',best_for:'Use whatever the backend provides.'}],starterModels),registryModels),catalogActions),
        capacity_profiles:[],
        registry_models:registryModels,
        catalog_actions:catalogActions
      };
    }
    populate();
    if(modelSelect)modelSelect.addEventListener('change',applySuggestion);
    if(capacitySelect)capacitySelect.addEventListener('change',renderDescription);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
  else init();
  window.addEventListener('mmir-model-library-focus-recommended',(event)=>{
    pendingRecommendedFocus=true;
    renderLibrary();
    window.setTimeout(()=>{if(focusRecommendedStarter(event.detail||{}))pendingRecommendedFocus=false;},80);
    window.setTimeout(()=>{if(pendingRecommendedFocus&&focusRecommendedStarter(event.detail||{}))pendingRecommendedFocus=false;},420);
  });
  window.addEventListener('mmir-activation-telemetry-updated',()=>renderLibrary());
})();
