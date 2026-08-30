const API_BASE='https://api.mmir.ai';
const page=document.body.dataset.releasePage||'';
const RELEASE_ROUTE_TAXONOMY=window.MmirReleaseRouteTaxonomy;

function el(tag,className,text){
  const node=document.createElement(tag);
  if(className)node.className=className;
  if(text!==undefined&&text!==null)node.textContent=String(text);
  return node;
}

function setText(id,value){
  const node=document.getElementById(id);
  if(node)node.textContent=String(value);
}

async function fetchJson(url){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),8000);
  try{
    const response=await fetch(url,{cache:'no-store',headers:{accept:'application/json'},signal:controller.signal});
    if(!response.ok)throw new Error('HTTP '+response.status);
    return await response.json();
  }finally{
    clearTimeout(timer);
  }
}

function safeLink(value){
  try{
    const url=new URL(String(value||''),window.location.href);
    return url.protocol==='https:'||url.origin===window.location.origin?url.href:'';
  }catch(error){
    return '';
  }
}

const MODEL_STATE_LABELS=RELEASE_ROUTE_TAXONOMY?.labels||{
  configured_unavailable:'Konfigurert · utilgjengelig nå',
  degraded:'Midlertidig degradert',
  catalogued:'Katalogført · ikke koblet'
};

const CAPABILITY_STATE_LABELS={
  verified:'Live-verifisert',
  configured:'Katalogført · ikke live-bevist',
  limited:'Begrenset i registeret',
  planned:'Planlagt',
  unavailable:'Utilgjengelig'
};

function statePill(state,kind='model'){
  const labels=kind==='capability'?CAPABILITY_STATE_LABELS:MODEL_STATE_LABELS;
  return el('span','state-pill state-'+state,labels[state]||state);
}

function modelDescription(model){
  if(model?.id==='supergeni')return 'MMIR-orkestrator: velger og kontrollerer svarruter. Supergeni er ikke en selvstendig generell språkmodell og teller ikke som live modellrute.';
  const limitations=Array.isArray(model?.limitations)?model.limitations:[];
  return limitations[0]||'Ingen oppgavespesifikk kvalitetsbeskrivelse er publisert for denne ruten.';
}

function appendDefinition(list,label,value){
  const row=el('div');
  row.append(el('dt','',label),el('dd','',value));
  list.append(row);
}

function renderModelCard(model,context){
  const truth=RELEASE_ROUTE_TAXONOMY.classifyModel(model,context);
  const state=truth.key;
  const card=el('article','catalog-card');
  card.dataset.state=state;
  card.dataset.search=[model?.display_name,model?.name,model?.id,model?.provider,model?.route_id,model?.node_id,(model?.capabilities||[]).join(' ')].join(' ').toLowerCase();
  const header=el('div','catalog-card-header');
  header.append(el('h3','',model?.display_name||model?.name||model?.id||'Ukjent modell'),statePill(state));
  card.append(header,el('p','',modelDescription(model)));
  const definitions=el('dl');
  appendDefinition(definitions,'Leverandør',model?.provider||model?.owned_by||'Ukjent');
  appendDefinition(definitions,'Modell-ID',model?.id||'Ukjent');
  appendDefinition(definitions,'Route-ID',model?.route_id||model?.mmir?.route||'Ikke oppgitt');
  appendDefinition(definitions,'Node',model?.node_id||'Ikke oppgitt');
  appendDefinition(definitions,'Tilgang',truth.access);
  appendDefinition(definitions,'Chat i 0.2',truth.tryable?'Kan prøves nå':'Ikke tilgjengelig nå');
  appendDefinition(definitions,'Kvalitet','Ikke målt for denne eksakte ruten');
  appendDefinition(definitions,'Live-bevis',model?.live_e2e_verified===true?'Ja':'Nei / mangler ferskt bevis');
  card.append(definitions);
  const limitations=Array.isArray(model?.limitations)?model.limitations.slice(0,3):[];
  if(limitations.length){
    const details=el('details');
    details.append(el('summary','','Begrensninger'));
    const list=el('ul');
    limitations.forEach(item=>list.append(el('li','',item)));
    details.append(list);
    card.append(details);
  }
  return card;
}

function renderFamilyCard(model){
  const card=el('article','catalog-card');
  card.dataset.state='planned';
  card.dataset.search=[model?.label,model?.family,model?.provider_family,model?.category,model?.best_for].join(' ').toLowerCase();
  const header=el('div','catalog-card-header');
  header.append(el('h3','',model?.label||model?.family||model?.id||'Modellfamilie'),statePill('planned'));
  card.append(header,el('p','',model?.best_for||'Kataloginformasjon. Ikke en påstand om at modellen er koblet til MMIR.'));
  const definitions=el('dl');
  appendDefinition(definitions,'Leverandør/familie',model?.provider_family||'Ukjent');
  appendDefinition(definitions,'Tilgang',model?.access||'Må verifiseres');
  appendDefinition(definitions,'Lisens',model?.license_name||'Må verifiseres');
  appendDefinition(definitions,'Kvalitet','Ikke målt av MMIR');
  card.append(definitions);
  const link=safeLink(model?.model_card_url||model?.license_url);
  if(link){
    const action=el('a','card-action secondary','Åpne modell-/katalogside');
    action.href=link;
    action.target='_blank';
    action.rel='noreferrer';
    card.append(action);
  }
  return card;
}

function applyModelFilters(){
  const query=String(document.getElementById('model-search')?.value||'').trim().toLowerCase();
  const state=document.getElementById('model-state')?.value||'all';
  document.querySelectorAll('#models-grid .catalog-card').forEach(card=>{
    card.hidden=Boolean((state!=='all'&&card.dataset.state!==state)||(query&&!card.dataset.search.includes(query)));
  });
}

async function initModels(){
  const runtime=document.getElementById('runtime-truth');
  const grid=document.getElementById('models-grid');
  const familyGrid=document.getElementById('family-grid');
  const [inventoryResult,statusResult,familyResult]=await Promise.allSettled([
    fetchJson(API_BASE+'/v1/models'),
    fetchJson(API_BASE+'/status'),
    fetchJson('../ai-model-catalog.json')
  ]);

  if(inventoryResult.status==='fulfilled'&&RELEASE_ROUTE_TAXONOMY){
    const inventory=inventoryResult.value||{};
    const models=Array.isArray(inventory.data)?inventory.data:[];
    const releaseReadiness=statusResult.status==='fulfilled'
      ? RELEASE_ROUTE_TAXONOMY.releaseReadiness(statusResult.value)
      : RELEASE_ROUTE_TAXONOMY.blockedReadiness('Status for offentlig svarbane kunne ikke verifiseres.');
    const context={surface:'catalog',releaseReadiness,localReadiness:statusResult.status==='fulfilled'?statusResult.value?.local_readiness:null};
    const truths=models.map(model=>RELEASE_ROUTE_TAXONOMY.classifyModel(model,context));
    const tryable=truths.filter(truth=>truth.key==='free_now').length;
    const configured=truths.filter(truth=>truth.key==='configured_unavailable').length;
    const unavailable=truths.filter(truth=>['degraded','planned','byok_unavailable','local_setup'].includes(truth.key)).length;
    const e2e=truths.filter((truth,index)=>truth.liveE2EVerified===true&&models[index]?.id!=='supergeni').length;
    const orchestrators=models.filter(model=>model?.id==='supergeni').length;
    setText('metric-visible',inventory.total_visible_model_count??models.length);
    setText('metric-tryable',tryable);
    setText('metric-configured',configured);
    setText('metric-unavailable',unavailable);
    const cta=document.getElementById('models-primary-cta');
    if(cta){
      cta.textContent=tryable>0?'Prøv en gratis modell nå':'Åpne testflaten · ingen hostet modell er klar nå';
      cta.setAttribute('aria-label',tryable>0?'Prøv en live-verifisert gratis modell':'Åpne testflaten; ingen hostet modell er testklar akkurat nå');
    }
    runtime.dataset.state=tryable>0?'ready':(statusResult.status==='fulfilled'?'warning':'error');
    runtime.replaceChildren(
      el('strong','',tryable>0?'Minst én gratis modellrute er klar i offentlig chat.':'Ingen hostet modell kan merkes «gratis å prøve nå».'),
      el('p','',(inventory.total_visible_model_count??models.length)+' synlige ruter · '+tryable+' gratis å prøve nå · '+configured+' konfigurerte, men utilgjengelige · '+unavailable+' degraderte/planlagte/oppsettavhengige · '+e2e+' med eksplisitt modell-E2E-bevis. '+orchestrators+' oppføring er en orkestrator, ikke en språkmodell. Gratisstatus krever både modellbevis og autentisert first-chat-release.')
    );
    models.forEach(model=>grid.append(renderModelCard(model,context)));
  }else{
    setText('metric-visible','Ukjent');
    setText('metric-tryable','Ukjent');
    setText('metric-configured','Ukjent');
    setText('metric-unavailable','Ukjent');
    runtime.dataset.state='error';
    runtime.replaceChildren(el('strong','','Live inventory er utilgjengelig.'),el('p','','Ingen rute vises som live. Kataloginformasjon kan fortsatt leses nedenfor.'));
    grid.append(el('p','empty-state','Kunne ikke hente live modellstatus. Prøv igjen senere.'));
  }

  if(familyResult.status==='fulfilled'){
    const families=Array.isArray(familyResult.value?.models)?familyResult.value.models:[];
    families.forEach(model=>familyGrid.append(renderFamilyCard(model)));
  }else{
    familyGrid.append(el('p','empty-state','Modellfamiliekatalogen er utilgjengelig.'));
  }

  document.getElementById('model-search')?.addEventListener('input',applyModelFilters);
  document.getElementById('model-state')?.addEventListener('change',applyModelFilters);
}

function availabilityState(availability){
  return availability==='available'?'configured':'limited';
}

function runtimeScopeLabel(scope){
  if(scope==='production')return 'Registeromfang: production';
  if(scope==='limited_release')return 'Registeromfang: limited release';
  return scope||'Ikke oppgitt';
}

function shortRevision(revision){
  const value=String(revision||'');
  return value.startsWith('sha256:')?value.slice(0,23)+'…':value||'Ukjent';
}

function renderCapabilityCard(capability,ui,stage,advertised,revision){
  const state=availabilityState(capability.availability);
  const card=el('article','catalog-card');
  card.dataset.state=state;
  card.dataset.search=[capability.capability_id,capability.title_no,capability.availability,stage?.name,ui?.description].join(' ').toLowerCase();
  const header=el('div','catalog-card-header');
  header.append(el('h3','',capability.title_no||capability.capability_id),statePill(state,'capability'));
  card.append(header,el('p','',ui?.description||'Offentlig katalograd. Det finnes ingen egen publisert kvalitetsmåling for denne kapabiliteten.'));
  const definitions=el('dl');
  appendDefinition(definitions,'Kapabilitets-ID',capability.capability_id);
  appendDefinition(definitions,'Område',stage?.name||capability.stage_id||'Ukjent');
  appendDefinition(definitions,'Registerstatus',capability.availability||'Ukjent');
  appendDefinition(definitions,'Omfang',runtimeScopeLabel(capability.runtime_scope));
  appendDefinition(definitions,'Kvalitet','Ikke målt');
  appendDefinition(definitions,'Runtime',advertised?'Matchet annonsert rute · ikke E2E-bevis':'Ingen matchet live-kvittering');
  appendDefinition(definitions,'Katalogrevisjon',shortRevision(revision));
  card.append(definitions);
  const details=el('details');
  details.append(el('summary','','Bevis og begrensninger'));
  const body=el('div','');
  body.append(el('p','',state==='configured'?'Registeret viser strukturell tilgjengelighet. Det er ikke en live-kvalitetskvittering.':'Registeret markerer kapabiliteten som begrenset eller avansert; den skal ikke presenteres som fullt tilgjengelig.'));
  const list=el('ul');
  list.append(
    el('li','','Ingen eksplisitt runtime-kvittering oppgraderer dette kortet til live-verifisert.'),
    el('li','','Tilgjengelighet kan avhenge av modell, node, kilde, kvote og aktuell release.')
  );
  body.append(list);
  details.append(body);
  card.append(details);
  return card;
}

function renderRoadmapCard(item){
  const card=el('article','catalog-card');
  card.dataset.state=item.state;
  card.dataset.search=[item.id,item.title,item.description,(item.limitations||[]).join(' ')].join(' ').toLowerCase();
  const header=el('div','catalog-card-header');
  header.append(el('h3','',item.title),statePill(item.state,'capability'));
  card.append(header,el('p','',item.description));
  const definitions=el('dl');
  appendDefinition(definitions,'Område','0.2-etterfølger');
  appendDefinition(definitions,'Kvalitet','Ikke målt / ikke lansert');
  appendDefinition(definitions,'Runtime','Ingen live-kvittering');
  card.append(definitions);
  const details=el('details');
  details.append(el('summary','','Forutsetninger'));
  const list=el('ul');
  (item.limitations||[]).forEach(value=>list.append(el('li','',value)));
  details.append(list);
  card.append(details);
  return card;
}

function applyCapabilityFilters(){
  const query=String(document.getElementById('capability-search')?.value||'').trim().toLowerCase();
  const state=document.getElementById('capability-state')?.value||'all';
  document.querySelectorAll('#capability-grid .catalog-card, #roadmap-grid .catalog-card').forEach(card=>{
    card.hidden=Boolean((state!=='all'&&card.dataset.state!==state)||(query&&!card.dataset.search.includes(query)));
  });
}

async function initCapabilities(){
  const banner=document.getElementById('capability-truth');
  const grid=document.getElementById('capability-grid');
  const roadmapGrid=document.getElementById('roadmap-grid');
  const [catalogResult,uiResult,statusResult]=await Promise.allSettled([
    fetchJson('../capability-catalog.json'),
    fetchJson('../capability-ui.json'),
    fetchJson(API_BASE+'/status')
  ]);
  if(catalogResult.status!=='fulfilled'||uiResult.status!=='fulfilled'){
    banner.dataset.state='error';
    banner.replaceChildren(el('strong','','Kapabilitetsregisteret er utilgjengelig.'),el('p','','Ingen funksjon oppgraderes til tilgjengelig uten kanonisk register og en matchende UI-revisjon.'));
    grid.append(el('p','empty-state','Kunne ikke laste kapabilitetsregisteret.'));
    return;
  }

  const catalog=catalogResult.value||{};
  const overlay=uiResult.value||{};
  const capabilities=Array.isArray(catalog.capabilities)?catalog.capabilities:[];
  const stages=Array.isArray(catalog.stages)?catalog.stages:[];
  const roadmap=Array.isArray(overlay.roadmap)?overlay.roadmap:[];
  const overlayCopy=overlay.copy&&typeof overlay.copy==='object'&&!Array.isArray(overlay.copy)?overlay.copy:{};
  const ids=new Set(capabilities.map(item=>item.capability_id));
  const stageIds=new Set(stages.map(stage=>stage.id));
  const allowedAvailability=new Set(['available','limited','limited_advanced','advanced']);
  const allowedRoadmapStates=new Set(['planned','unavailable']);
  const revisionMatches=catalog.object==='mmir.capability_projection'&&catalog.projection_kind==='public'&&catalog.schema_version===1&&catalog.join_key==='capability_id'&&catalog.semantic_revision===overlay.projection_semantic_revision;
  const overlayValid=overlay.object==='mmir.capability_ui_overlay'&&overlay.schema_version===1&&Object.keys(overlayCopy).every(id=>ids.has(id));
  const rowsValid=capabilities.length===48&&ids.size===capabilities.length&&capabilities.every(item=>/^cap-\d{3}$/.test(item.capability_id)&&Boolean(item.title_no)&&allowedAvailability.has(item.availability)&&stageIds.has(item.stage_id));
  const roadmapIds=new Set(roadmap.map(item=>item.id));
  const roadmapValid=roadmapIds.size===roadmap.length&&roadmap.every(item=>Boolean(item.id)&&Boolean(item.title)&&allowedRoadmapStates.has(item.state));
  if(!revisionMatches||!overlayValid||!rowsValid||!roadmapValid){
    banner.dataset.state='error';
    banner.replaceChildren(el('strong','','Kapabilitetsvisningen er stoppet på revisjonsmismatch.'),el('p','','UI-tekst og kanonisk register peker ikke på samme semantiske revisjon.'));
    grid.append(el('p','empty-state','Kapabiliteter skjules fail-closed til revisjonene samsvarer.'));
    return;
  }

  const stageMap=new Map(stages.map(stage=>[stage.id,stage]));
  const advertised=new Set(statusResult.status==='fulfilled'&&Array.isArray(statusResult.value?.capabilities)?statusResult.value.capabilities:[]);
  let matched=0;
  capabilities.forEach(capability=>{
    const ui=overlayCopy[capability.capability_id]||{};
    const runtimeAdvertised=(ui.runtime_capabilities||[]).some(name=>advertised.has(name));
    if(runtimeAdvertised)matched+=1;
    grid.append(renderCapabilityCard(capability,ui,stageMap.get(capability.stage_id),runtimeAdvertised,catalog.semantic_revision));
  });
  roadmap.forEach(item=>roadmapGrid?.append(renderRoadmapCard(item)));

  const configured=capabilities.filter(item=>availabilityState(item.availability)==='configured').length;
  const limited=capabilities.length-configured;
  setText('cap-metric-verified',0);
  setText('cap-metric-limited',limited);
  setText('cap-metric-configured',configured);
  setText('cap-metric-planned',roadmap.length);
  setText('capability-revision',shortRevision(catalog.semantic_revision));

  if(statusResult.status==='fulfilled'){
    banner.dataset.state='warning';
    banner.replaceChildren(
      el('strong','','Katalog og runtime holdes bevisst adskilt.'),
      el('p','',matched+' av '+capabilities.length+' offentlige katalograder har en matchet annonsert runtime-rute. Ingen kort oppgraderes til live-verifisert uten en eksplisitt kvittering.')
    );
  }else{
    banner.dataset.state='error';
    banner.replaceChildren(el('strong','','Live status kunne ikke hentes.'),el('p','','Kartet viser kun kanonisk katalogstatus og oppgraderer ingenting til live.'));
  }
  document.getElementById('capability-search')?.addEventListener('input',applyCapabilityFilters);
  document.getElementById('capability-state')?.addEventListener('change',applyCapabilityFilters);
}

async function initTrust(){
  const banner=document.getElementById('trust-runtime');
  const [statusResult,modelsResult]=await Promise.allSettled([
    fetchJson(API_BASE+'/status'),
    fetchJson(API_BASE+'/v1/models')
  ]);
  if(statusResult.status==='fulfilled'&&modelsResult.status==='fulfilled'){
    const status=statusResult.value||{};
    const models=modelsResult.value||{};
    const verified=Number(models.live_verified_intelligence_route_count||0);
    const readiness=status.operator_readiness?.readiness_state||'unknown';
    const release=RELEASE_ROUTE_TAXONOMY?.releaseReadiness?.(status)||RELEASE_ROUTE_TAXONOMY?.blockedReadiness?.();
    const releaseReady=release?.hostedReady===true;
    const productionGreen=releaseReady&&verified>0;
    banner.dataset.state=productionGreen?'ready':'warning';
    banner.replaceChildren(
      el('strong','',productionGreen?'Offentlig svarbane har ferskt, autentisert produksjonsbevis.':'API-et svarer, men offentlig svarbane er ikke produksjonsgrønn.'),
      el('p','',(models.total_visible_model_count||0)+' synlige ruter · '+verified+' live-verifiserte · operator readiness: '+readiness+' · autentisert releaseklar: '+(releaseReady?'ja':'nei')+'. En enkelt rute eller HTTP 200 kan ikke grønnmale releasen.')
    );
  }else{
    banner.dataset.state='error';
    banner.replaceChildren(el('strong','','Offentlig status kunne ikke verifiseres.'),el('p','','Dette tolkes som ukjent/rødt, ikke som grønt.'));
  }
}

if(page==='models')void initModels();
if(page==='capabilities')void initCapabilities();
if(page==='trust')void initTrust();
