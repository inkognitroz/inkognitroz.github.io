(function(){
  const STARTER_PREFIX='starter:';
  const WORKSPACE_KEY='mimir-active-workspace-v1';
  const REPAIR_RESUME_PREFIX='mimir-repair-resume-v1:';
  const SUPERGENIUS_LABEL='Supergenious';
  let picker=null;
  let starterModels=fallbackStarterModels();
  let starterCatalogLoaded=false;
  let pickerSearchQuery='';
  let pickerRouteFilter='all';
  let localState={status:'checking',models:[]};
  let browserNodeSupport={status:'checking',supported:false,secure:false,wasm:false,webgpu:false,reason:'Checking Browser Node support...',detail:'Checking WebGPU/WASM before marking Browser Node ready.'};

  function escapeHtml(value){return String(value||'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');}
  function modelSelect(){return document.getElementById('runtime-model');}
  function promptEl(){return document.getElementById('mimir-prompt');}
  function displayLabel(value){
    return String(value||'')
      .replace(/\bmmir[-_\s]+supergeni(?:us|ous)\b/gi,SUPERGENIUS_LABEL)
      .replace(/MMIR Browser Guide|MMIR Guide|free browser guide/gi,SUPERGENIUS_LABEL)
      .replace(/(^|[^A-Za-z])supergeni(?:us|ous)(?:\s+free)?/gi,(match,prefix)=>prefix+SUPERGENIUS_LABEL)
      .replace(/(?:MMIR\s+){2,}Supergenius/gi,SUPERGENIUS_LABEL)
      .trim();
  }
  function selectedLabel(){const select=modelSelect();return displayLabel(String(select?.selectedOptions?.[0]?.textContent||select?.value||'auto').replace(/\s+-\s+live$/i,'').trim());}
  function selectedValue(){return String(modelSelect()?.value||'');}
  function starterId(value){return String(value||'').startsWith(STARTER_PREFIX)?String(value).slice(STARTER_PREFIX.length):'';}
  function starterValue(model){return STARTER_PREFIX+model.id;}
  function cleanTitle(text,value){return displayLabel(String(text||value||'Model').replace(/\s+-\s+(live|ready now.*|hosted free model|install to activate.*)$/i,'').trim());}
  function fallbackStarterModels(){
    return [
      {id:'mmir-supergenius',label:SUPERGENIUS_LABEL,runtime:'auto',status:'hosted-free',model:'mmir-supergenius',install_note:'Works immediately with no install, key or paid route.'},
      {id:'webllm-qwen25-05b',label:'Browser Model - experimental',runtime:'webllm',status:'lab_proof_required',visibility:'advanced',public_headline:false,model:'Qwen2.5-0.5B-Instruct-q4f16_1-MLC',install_note:'Runs locally only when this browser supports WebGPU/WASM and after supported-browser proof is green.'},
      {id:'ollama-gemma3-270m',label:'Gemma 3 270M - tiny free local',runtime:'ollama',status:'installable-free',model:'gemma3:270m',install_note:'Fastest useful local starter through MMIR Local Node.'},
      {id:'ollama-qwen3-06b',label:'Qwen3 0.6B - tiny reasoning local',runtime:'ollama',status:'installable-free',model:'qwen3:0.6b',install_note:'Small reasoning-capable local starter.'}
    ];
  }
  function starterGroupLabel(model){
    if(model.runtime==='auto')return 'Ready now: instant free chat';
    if(model.runtime==='browser-guide')return 'Advanced: internal helpers';
    if(model.runtime==='webllm')return 'Advanced: browser model experiments';
    return 'Install to activate: local models';
  }
  function starterToOption(model){
    return {
      value:starterValue(model),
      textContent:displayLabel(model.label||model.id)+' - '+(model.runtime==='auto'?'ready now - hosted free model':(model.runtime==='ollama'?'install to activate - local':(model.runtime==='webllm'?'experimental - browser model':'advanced helper'))),
      dataset:{runtime:model.runtime||'starter'},
      parentElement:{label:starterGroupLabel(model)},
      __starterFloor:true
    };
  }
  function starterByValue(value){
    const id=starterId(value);
    return id?starterModels.find(model=>model.id===id)||null:null;
  }
  function secureContextAvailable(){
    const protocol=String(window.location?.protocol||'');
    const host=String(window.location?.hostname||'');
    return Boolean(window.isSecureContext||protocol==='https:'||host==='localhost'||host==='127.0.0.1'||host==='::1');
  }
  function wasmAvailable(){
    return typeof WebAssembly==='object'&&typeof WebAssembly.instantiate==='function';
  }
  function baseBrowserNodeSupport(){
    const secure=secureContextAvailable();
    const wasm=wasmAvailable();
    const webgpu=Boolean(window.navigator?.gpu);
    const missing=[];
    if(!secure)missing.push('secure context');
    if(!wasm)missing.push('WASM');
    if(!webgpu)missing.push('WebGPU');
    return {secure,wasm,webgpu,missing};
  }
  function webLlmModelsNeedShaderF16(){
    return starterModels.some(model=>model?.runtime==='webllm'&&/f16/i.test(String(model.model||'')));
  }
  function browserNodeDetail(){
    const s=browserNodeSupport;
    const caveats='Free, browser-local/private, starter quality, no provider key, no Cloudflare, no install. First use downloads model weights into the browser cache.';
    if(s.status==='ready')return 'Browser Node ready here. '+caveats;
    if(s.status==='checking')return 'Checking Browser Node support. '+caveats;
    if(s.status==='failed')return 'Browser Node runtime check failed: '+(s.reason||'runtime failed')+'. '+caveats;
    return 'Browser Node unsupported here: '+(s.reason||'WebGPU/WASM unavailable')+'. '+caveats;
  }
  function browserNodeKind(){
    const ready=browserNodeSupport.status==='ready';
    const checking=browserNodeSupport.status==='checking';
    const failed=browserNodeSupport.status==='failed';
    return {
      state:ready?'ready':(checking?'loading':(failed?'failed':'blocked')),
      label:ready?'Browser Model':(checking?'Browser Model checking':(failed?'Browser Model failed':'Browser Model unavailable')),
      action:ready?'Try browser model':(checking?'Checking support':'Unavailable here'),
      detail:browserNodeDetail(),
      disabled:!ready,
      meta:['free','browser-local/private','starter quality','no provider key','no Cloudflare','no install']
    };
  }
  function emitBrowserNodeSupport(){
    const detail={...browserNodeSupport,node_type:'browser',trust_class:'device-local',cost_class:'free-user-device',quality_tier:'starter',execution_boundary:'current-browser-session'};
    window.__MimirBrowserNodeSupport=detail;
    window.dispatchEvent(new CustomEvent('mmir-browser-node-support-updated',{detail}));
  }
  async function detectBrowserNodeSupport(){
    const base=baseBrowserNodeSupport();
    browserNodeSupport={status:base.missing.length?'unsupported':'checking',supported:false,...base,reason:base.missing.length?('Missing '+base.missing.join(', ')):'Checking WebGPU adapter...',detail:''};
    emitBrowserNodeSupport();
    render();
    if(base.missing.length)return browserNodeSupport;
    try{
      const adapter=typeof window.navigator?.gpu?.requestAdapter==='function'?await window.navigator.gpu.requestAdapter():true;
      const shaderF16=Boolean(adapter?.features?.has?.('shader-f16'));
      const needsShaderF16=webLlmModelsNeedShaderF16();
      const supported=Boolean(adapter)&&(!needsShaderF16||shaderF16);
      const reason=!adapter?'No WebGPU adapter returned':(!supported?'WebGPU adapter missing shader-f16 for the current browser model':'WebGPU, WASM and shader-f16 requirements available');
      const detail=supported?'Browser Node can load an approved WebGPU model after user selection.':(!adapter?'Browser exposed WebGPU but no adapter was available.':'The current browser model build needs shader-f16; MMIR keeps Browser Model disabled instead of failing after download.');
      browserNodeSupport={...browserNodeSupport,status:supported?'ready':'unsupported',supported,shader_f16:shaderF16,requires_shader_f16:needsShaderF16,reason,detail};
    }catch(error){
      browserNodeSupport={...browserNodeSupport,status:'failed',supported:false,reason:String(error?.message||error||'WebGPU adapter check failed'),detail:'Browser Node failed closed before loading any model.'};
    }
    emitBrowserNodeSupport();
    render();
    return browserNodeSupport;
  }
  function freeRouteFloor(options){
    const existing=new Set((options||[]).map(option=>String(option.value||'')));
    const floor=[];
    for(const model of starterModels){
      if(model.visibility==='internal')continue;
      const value=starterValue(model);
      if(!model?.id||existing.has(value))continue;
      floor.push(starterToOption(model));
    }
    return (options||[]).concat(floor);
  }
  async function loadStarterModels(){
    try{
      const response=await fetch('./free-model-starters.json',{cache:'default'});
      if(!response.ok)throw new Error('starter catalog unavailable');
      const data=await response.json();
      const models=Array.isArray(data.models)?data.models.filter(model=>model?.id&&model?.label):[];
      if(models.length)starterModels=models;
    }catch(error){
      starterModels=fallbackStarterModels();
    }
    starterCatalogLoaded=true;
    render();
  }
  function optionKind(option){
    const value=String(option?.value||'');
    const runtime=String(option?.dataset?.runtime||'');
    if(runtime==='live')return {state:'live',label:'Live',action:'Use live',detail:'Active backend route. Proof stays cost-guarded.'};
    if(runtime==='auto')return {state:'ready',label:'Instant chat',action:'Use now',detail:'Works immediately with no install, key or paid route.'};
    if(runtime==='browser-guide')return {state:'ready',label:'Internal helper',action:'Use advanced',detail:'Internal guidance route; hidden from first-time model choice.'};
    if(runtime==='webllm')return browserNodeKind();
    if(runtime==='ollama'||starterId(value))return {state:'install',label:'Free local install',action:'Install / prove',detail:'Installs through MMIR Local Node and Ollama.'};
    return {state:'planned',label:'Model option',action:'Use',detail:'Select without starting paid compute.'};
  }
  function activeWorkspaceId(){return localStorage.getItem(WORKSPACE_KEY)||'personal';}
  function writeRepairResume(payload){
    const resume={...payload,status:payload?.status||'pending',at:new Date().toISOString(),no_paid_routes_started:true,provider_secrets_stored:false,raw_prompt_stored:false,raw_response_stored:false};
    try{localStorage.setItem(REPAIR_RESUME_PREFIX+activeWorkspaceId(),JSON.stringify(resume));}catch(error){}
    window.dispatchEvent(new CustomEvent('mmir-repair-resume-started',{detail:resume}));
    return resume;
  }
  function openStarterInstaller(model,source){
    const params=new URLSearchParams({source:source||'composer-model-picker'});
    if(model?.id)params.set('starter',model.id);
    if(model?.model)params.set('model',model.model);
    const target='./downloads/mmir-local-connector-install.html?'+params;
    const resume=writeRepairResume({action:'starter-install-repair',target,model:model?.model||'',starter_id:model?.id||'',note:'Opening no-spend local installer for '+(model?.model||model?.label||'selected starter')+'.',next_action:'installer-download'});
    window.MimirActivationTelemetry?.record?.('starter-install-installer-opened',{status:'installer',model:model?.model||model?.id||'',route:target,free:true,note:'Composer install opened universal installer. no_paid_routes_started:true.'});
    window.dispatchEvent(new CustomEvent('mmir-starter-install-repair-opened',{detail:resume}));
    window.location.href=target;
  }
  function starterByRuntime(runtime){
    return starterModels.find(model=>model.runtime===runtime)||null;
  }
  function firstInstallableStarter(){
    return starterModels.find(model=>model.runtime==='ollama'&&String(model.status||'').includes('installable'))||
      starterModels.find(model=>model.runtime==='ollama')||
      null;
  }
  function localModel(){return (localState.models||[]).map(model=>String(model?.id||model?.name||model?.model||'').trim()).find(Boolean)||'';}
  function localReady(){return Boolean(localModel())&&!/^(off|err|block)/i.test(localState.status||'');}
  function isInternalStarter(model){return model?.visibility==='internal'||['mmir-guide','mmir-model-picker','mmir-setup-coach','mmir-security-coach','mmir-growth-coach'].includes(String(model?.id||''));}
  function pickerOptionVisible(option){
    const value=String(option?.value||'');
    const id=starterId(value);
    const starter=id?starterModels.find(model=>model.id===id):null;
    if(starter&&isInternalStarter(starter))return false;
    const title=String(option?.textContent||'');
    return !/MMIR Guide|Model Picker|Setup Coach|Security Coach|Growth Coach/i.test(title);
  }
  function liveLocalValue(){
    const model=localModel();
    if(!model)return '';
    const options=Array.from(modelSelect()?.options||[]);
    return options.find(option=>option.value===model)?.value||model;
  }
  function recommendedWebGpuIds(){
    return ['webllm-qwen25-05b','webllm-gemma3-1b','webllm-llama32-1b','webllm-phi35-mini'];
  }
  function webGpuStarterModels(){
    const order=recommendedWebGpuIds();
    return starterModels
      .filter(model=>model.runtime==='webllm')
      .sort((a,b)=>(order.indexOf(a.id)<0?99:order.indexOf(a.id))-(order.indexOf(b.id)<0?99:order.indexOf(b.id)))
      .slice(0,4);
  }
  function webGpuLabel(model,index){
    const title=cleanTitle(model.label,model.id).replace(/\s+-\s+active in browser$/i,'');
    return index===0?'Browser Model':title.replace(/^(.+?)\s+\d.*$/,'$1 Browser');
  }
  function compareModelsAction(){
    const prompt=promptEl();
    if(prompt&&!String(prompt.value||'').trim()){
      prompt.value='Compare the best available MMIR model routes for this question.';
      prompt.dispatchEvent(new Event('input',{bubbles:true}));
      prompt.dispatchEvent(new Event('change',{bubbles:true}));
    }
    closePicker(false);
    const openComparison=()=>{const panel=document.getElementById('model-comparison-panel');if(panel&&'open' in panel)panel.open=true;(document.getElementById('multi-model-workspace')||panel||prompt)?.scrollIntoView?.({block:'start',behavior:'smooth'});};
    if(window.MimirLoadDeferred)window.MimirLoadDeferred().then(openComparison);else openComparison();
    window.setTimeout(()=>document.getElementById('compare-models')?.focus({preventScroll:true}),160);
  }
  function recommendationCards(){
    const current=selectedValue();
    const supergenius=starterModels.find(model=>model.id==='mmir-supergenius')||starterModels.find(model=>model.runtime==='auto')||starterModels.find(model=>model.id==='mmir-guide')||starterByRuntime('browser-guide');
    const local=firstInstallableStarter();
    const liveLocal=localReady()&&{id:'live-local',label:'Local ready',detail:'Private Local Node model. No installer needed.',model:{id:'live-local',label:localModel(),runtime:'live-local'},value:liveLocalValue(),action:'chat-local',state:'live'};
    const items=[
      supergenius&&{id:'supergenius-free',label:SUPERGENIUS_LABEL,detail:'Ask immediately. No setup, no key, no paid route.',model:supergenius,action:'chat',state:'ready'},
      liveLocal||(local&&{id:'local-model',label:'Local Model',detail:localReady()?'Private Local Node model ready.':'Install a small local model when you want private/on-device chat.',model:local,action:'install',state:'install'})
    ].filter(Boolean);
    return '<div class="composer-model-recommendations" aria-label="Recommended free model paths">'+items.map(item=>{
      const value=item.value||starterValue(item.model);
      const selected=current===value;
      return '<button type="button" data-picker-recommend="'+escapeHtml(item.id)+'" data-picker-model-value="'+escapeHtml(value)+'" data-picker-action="'+escapeHtml(item.action)+'" data-picker-state="'+escapeHtml(item.state)+'" data-picker-runtime="'+escapeHtml(item.model.runtime||'starter')+'" data-picker-selected="'+String(selected)+'" aria-pressed="'+String(selected)+'" '+(item.disabled?'disabled aria-disabled="true"':'')+'>'+
        '<strong>'+escapeHtml(item.label)+'</strong><span>'+escapeHtml(cleanTitle(item.model.label,item.model.id))+'</span>'+(selected?'<em>Selected</em>':'')+'<small>'+escapeHtml(item.detail)+'</small>'+
      '</button>';
    }).join('')+'</div>';
  }
  function ensurePicker(){
    if(picker)return picker;
    const form=document.querySelector('.mimir-composer');
    if(!form)return null;
    picker=document.createElement('div');
    picker.id='composer-model-picker';
    picker.className='composer-model-picker';
    picker.setAttribute('aria-label','Composer model picker');
    picker.hidden=true;
    const bar=form.querySelector('.composer-bar');
    if(bar)form.insertBefore(picker,bar);else form.appendChild(picker);
    return picker;
  }
  function setExpanded(open){
    document.getElementById('composer-add-model')?.setAttribute('aria-expanded',String(open));
    document.getElementById('runtime-model-chip')?.setAttribute('aria-expanded',String(open));
  }
  function closePicker(refocus){
    const el=ensurePicker();
    if(!el)return;
    el.hidden=true;
    setExpanded(false);
    if(refocus)promptEl()?.focus({preventScroll:true});
  }
  function searchText(option){
    const kind=optionKind(option);
    return [
      cleanTitle(option?.textContent,option?.value),
      option?.value,
      option?.parentElement?.label,
      option?.dataset?.runtime,
      kind.label,
      kind.detail,
      kind.action
    ].join(' ').toLowerCase();
  }
  function applySearchFilter(el){
    const query=String(pickerSearchQuery||'').trim().toLowerCase();
    const cards=Array.from(el?.querySelectorAll?.('.composer-model-card')||[]);
    let visible=0;
    for(const card of cards){
      const route=pickerRouteFilter==='all'||card.getAttribute('data-picker-state')===pickerRouteFilter||card.getAttribute('data-picker-runtime')===pickerRouteFilter;
      const match=route&&(!query||String(card.getAttribute('data-picker-search-text')||'').includes(query));
      card.hidden=!match;
      if(match)visible+=1;
    }
    const count=el?.querySelector?.('[data-picker-search-count]');
    if(count)count.textContent=(query||pickerRouteFilter!=='all')?(visible+' of '+cards.length+' routes'):(cards.length+' routes');
    const empty=el?.querySelector?.('[data-picker-search-empty]');
    if(empty)empty.hidden=visible>0;
  }
  function resetPickerFilters(el,focusSearch){
    pickerSearchQuery='';
    pickerRouteFilter='all';
    const search=el?.querySelector?.('[data-picker-search]');
    if(search)search.value='';
    el?.querySelectorAll?.('[data-picker-filter]').forEach(button=>button.setAttribute('aria-pressed',String(button.getAttribute('data-picker-filter')==='all')));
    applySearchFilter(el);
    if(focusSearch)search?.focus({preventScroll:true});
  }
  function routeFilterControls(){
    const filters=[
      {id:'all',label:'All'},
      {id:'ready',label:'Ready'},
      {id:'blocked',label:'Unsupported'},
      {id:'webllm',label:'Browser'},
      {id:'ollama',label:'Local'},
      {id:'live',label:'Live'}
    ];
    return '<div class="composer-model-filters" aria-label="Filter model routes">'+filters.map(filter=>
      '<button type="button" data-picker-filter="'+escapeHtml(filter.id)+'" aria-pressed="'+String(pickerRouteFilter===filter.id)+'">'+escapeHtml(filter.label)+'</button>'
    ).join('')+'<button type="button" data-picker-filter-reset aria-label="Reset model filters">Reset</button></div>';
  }
  function wireFilters(el){
    el?.querySelectorAll?.('[data-picker-filter]').forEach(button=>{
      button.addEventListener('click',()=>{
        pickerRouteFilter=button.getAttribute('data-picker-filter')||'all';
        el.querySelectorAll('[data-picker-filter]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));
        applySearchFilter(el);
      });
    });
    el?.querySelector?.('[data-picker-filter-reset]')?.addEventListener('click',()=>resetPickerFilters(el,true));
    el?.querySelector?.('[data-picker-empty-reset]')?.addEventListener('click',()=>resetPickerFilters(el,true));
  }
  function wireSearch(el){
    const search=el?.querySelector?.('[data-picker-search]');
    if(!search)return;
    search.value=pickerSearchQuery;
    search.addEventListener('input',()=>{
      pickerSearchQuery=search.value;
      applySearchFilter(el);
    });
    search.addEventListener('keydown',(event)=>{
      if(event.key==='Enter'){
        event.preventDefault();
        el.querySelector('.composer-model-card:not([hidden]) [data-picker-model-value]')?.focus({preventScroll:true});
      }
    });
    applySearchFilter(el);
  }
  function focusPickerSearchOnOpen(el){
    if(window.matchMedia&&window.matchMedia('(pointer: coarse)').matches)return;
    window.setTimeout(()=>el?.querySelector?.('[data-picker-search]')?.focus({preventScroll:true}),0);
  }
  function card(option){
    const select=modelSelect();
    const value=String(option.value||'');
    const kind=optionKind(option);
    const selected=select?.value===value;
    const group=String(option.parentElement?.label||'Model route');
    const title=cleanTitle(option.textContent,value);
    const cost=/live/i.test(group)?'active backend':kind.state==='install'?'free local':(option?.dataset?.runtime==='webllm'?'free browser-local':'free browser');
    const action=kind.state==='install'?'install':kind.state==='live'?'select-live':'select';
    const meta=Array.isArray(kind.meta)&&kind.meta.length?'<div class="composer-model-badges">'+kind.meta.map(item=>'<span>'+escapeHtml(item)+'</span>').join('')+'</div>':'';
    return '<article class="composer-model-card '+(selected?'is-selected':'')+'" data-picker-state="'+escapeHtml(kind.state)+'" data-picker-runtime="'+escapeHtml(option?.dataset?.runtime||'')+'" data-picker-search-text="'+escapeHtml(searchText(option))+'" data-picker-selected="'+String(selected)+'" aria-current="'+(selected?'true':'false')+'">'+
      '<div><strong>'+escapeHtml(title)+'</strong><span>'+escapeHtml(kind.label)+' - '+escapeHtml(cost)+'</span></div>'+
      (selected?'<em class="composer-model-selected-badge">Selected route</em>':'')+'<p>'+escapeHtml(kind.detail)+'</p>'+
      meta+
      '<small>'+escapeHtml(group)+'</small>'+
      '<button type="button" data-picker-model-value="'+escapeHtml(value)+'" data-picker-action="'+escapeHtml(action)+'" '+(kind.disabled?'disabled aria-disabled="true"':'')+'>'+escapeHtml(kind.action)+'</button>'+
    '</article>';
  }
  function render(){
    const el=ensurePicker();
    if(!el)return;
    const select=modelSelect();
    const rawOptions=Array.from(select?.options||[]).filter(option=>String(option.value||'').trim());
    const options=freeRouteFloor(rawOptions).filter(pickerOptionVisible);
    const floorActive=options.length>rawOptions.length;
    if(!options.length){
      el.innerHTML='<div class="composer-model-picker-head"><div><strong>Choose a model</strong><p>MMIR is loading free browser and local model routes. No paid route starts here.</p></div><div class="composer-model-picker-head-actions"><button type="button" data-picker-close aria-label="Close model picker">Close</button><a href="#model-library">Full library</a></div></div>';
      el.querySelector('[data-picker-close]')?.addEventListener('click',()=>closePicker(true));
      el.querySelector('.composer-model-picker-head a')?.addEventListener('click',()=>closePicker(false));
      return;
    }
    el.innerHTML='<div class="composer-model-picker-head"><div><strong>Choose model</strong><p>Current: '+escapeHtml(selectedLabel())+'. Start simple; advanced routes stay folded until you need them.</p>'+(floorActive?'<small class="composer-route-floor">Free starter choices stay available while live backend discovery catches up.</small>':'')+'</div><div class="composer-model-picker-head-actions"><button type="button" data-picker-close aria-label="Close model picker">Close</button><a href="#model-library">Full library</a></div></div>'+recommendationCards()+'<details class="composer-model-advanced"><summary>Advanced routes</summary><label class="composer-model-search"><span>Find model</span><input type="search" data-picker-search autocomplete="off" inputmode="search" placeholder="Search free, local, browser or live routes" aria-label="Search model routes" /><small data-picker-search-count>'+options.length+' routes</small></label>'+routeFilterControls()+'<div class="composer-model-picker-grid">'+options.map(card).join('')+'</div><div class="composer-model-empty" data-picker-search-empty hidden><span>No matching route. Try all routes, qwen, gemma, browser, local or live.</span><button type="button" data-picker-empty-reset>Show all routes</button></div></details>';
    el.querySelector('[data-picker-close]')?.addEventListener('click',()=>closePicker(true));
    el.querySelector('.composer-model-picker-head a')?.addEventListener('click',()=>closePicker(false));
    wireFilters(el);
    wireSearch(el);
    el.querySelectorAll('[data-picker-model-value]').forEach(button=>{
      button.addEventListener('click',()=>selectModel(button.getAttribute('data-picker-model-value')||'',button.getAttribute('data-picker-action')||'select'));
    });
  }
  function toggle(force){
    const el=ensurePicker();
    if(!el)return;
    const open=typeof force==='boolean'?force:el.hidden;
    el.hidden=!open;
    setExpanded(open);
    if(open){
      render();
      focusPickerSearchOnOpen(el);
    }
  }
  function autoStartComposerRecommendation(model,action){
    if(action!=='chat'||!model)return;
    const prompt=promptEl();
    if(prompt&&!String(prompt.value||'').trim()){
      prompt.value=model.runtime==='webllm'
        ?'Start a free browser WebGPU chat with '+cleanTitle(model.label,model.id)+'. Tell me what model is active and what I can connect next.'
        :'Start the safest free MMIR chat now. Explain what is active and one useful next action.';
      prompt.dispatchEvent(new Event('input',{bubbles:true}));
      prompt.dispatchEvent(new Event('change',{bubbles:true}));
    }
    window.setTimeout(()=>document.getElementById('primary-chat-link')?.click(),120);
  }
  function selectModel(value,action){
    if(action==='compare'){
      compareModelsAction();
      return;
    }
    const select=modelSelect();
    if(!select||!value)return;
    const id=starterId(value);
    const starter=starterByValue(value);
    const optionExists=Array.from(select.options||[]).some(option=>option.value===value);
    if(optionExists){
      select.value=value;
      select.dispatchEvent(new Event('change',{bubbles:true}));
    }
    window.MimirActivationTelemetry?.record?.('composer-model-picker',{status:action,model:id||value,route:'composer model picker',free:true,note:'Composer model picker selected '+(id||value)+'. no_paid_routes_started:true.'});
    if(action==='chat-local'&&localReady()){
      const model=value||localModel();
      const prompt=promptEl();
      if(prompt&&!String(prompt.value||'').trim()){
        prompt.value='Answer from '+model+'.';
        prompt.dispatchEvent(new Event('input',{bubbles:true}));
        prompt.dispatchEvent(new Event('change',{bubbles:true}));
      }
      toggle(false);
      const bridge=window.MimirChatRuntimeBridge;
      if(bridge?.refresh&&bridge?.send){bridge.setStatus?.('Starting '+model+'...','loading');bridge.refresh().then(()=>bridge.send());}
      else window.setTimeout(()=>document.getElementById('primary-chat-link')?.click(),80);
      return;
    }
    if(id){
      if(action==='install'&&starter?.runtime==='ollama'){
        openStarterInstaller(starter,'composer-model-picker');
        return;
      }
      window.dispatchEvent(new CustomEvent('mmir-runtime-starter-handoff',{detail:{starter_id:id,action:action==='install'?'install':'select',source:'composer-model-picker',route_floor:'composer-model-picker-free-route-floor',free:true,no_paid_routes_started:true}}));
    }
    toggle(false);
    promptEl()?.focus({preventScroll:true});
    autoStartComposerRecommendation(starter,action);
  }

  document.addEventListener('keydown',(event)=>{
    if(event.key!=='Escape'||!picker||picker.hidden)return;
    event.preventDefault();
    closePicker(true);
  },true);
  document.addEventListener('pointerdown',(event)=>{
    if(!picker||picker.hidden)return;
    if(picker.contains(event.target)||event.target?.closest?.('#composer-add-model,#runtime-model-chip'))return;
    closePicker(false);
  },true);

  window.MimirComposerModelPicker={render,toggle,open:()=>toggle(true),close:()=>closePicker(false),freeRouteFloor:()=>freeRouteFloor(Array.from(modelSelect()?.options||[])),starterCatalogLoaded:()=>starterCatalogLoaded};
  document.addEventListener('change',(event)=>{if(event.target?.id==='runtime-model')render();});
  window.addEventListener('mmir-backend-profiles-updated',render);
  window.addEventListener('mmir-live-model-proof-updated',render);
  window.addEventListener('mmir-local-connector-refreshed',(event)=>{
    const detail=event?.detail||{};
    const models=Array.isArray(detail.models)?detail.models:[];
    localState={status:detail.status||detail.health||(models.length?'ready':localState.status),models};
    render();
  });
  loadStarterModels();
  detectBrowserNodeSupport();
  render();
})();
