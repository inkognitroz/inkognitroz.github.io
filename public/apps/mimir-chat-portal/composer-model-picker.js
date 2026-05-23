(function(){
  const STARTER_PREFIX='starter:';
  let picker=null;
  let starterModels=fallbackStarterModels();
  let starterCatalogLoaded=false;

  function escapeHtml(value){return String(value||'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');}
  function modelSelect(){return document.getElementById('runtime-model');}
  function promptEl(){return document.getElementById('mimir-prompt');}
  function selectedLabel(){const select=modelSelect();return String(select?.selectedOptions?.[0]?.textContent||select?.value||'auto').replace(/\s+-\s+live$/i,'').trim();}
  function starterId(value){return String(value||'').startsWith(STARTER_PREFIX)?String(value).slice(STARTER_PREFIX.length):'';}
  function starterValue(model){return STARTER_PREFIX+model.id;}
  function cleanTitle(text,value){return String(text||value||'Model').replace(/\s+-\s+(live|ready now.*|install to activate.*)$/i,'').trim();}
  function fallbackStarterModels(){
    return [
      {id:'mmir-guide',label:'MMIR Guide - free browser helper',runtime:'browser-guide',status:'live-browser',model:'',install_note:'Works immediately with no backend or API key.'},
      {id:'mmir-model-picker',label:'MMIR Model Picker - live helper',runtime:'browser-guide',status:'live-browser',model:'',install_note:'Helps choose the right free model and route.'},
      {id:'webllm-qwen25-05b',label:'Qwen2.5 0.5B - active in browser',runtime:'webllm',status:'active-browser-webgpu',model:'Qwen2.5-0.5B-Instruct-q4f16_1-MLC',install_note:'Runs locally in a WebGPU-capable browser.'},
      {id:'ollama-gemma3-270m',label:'Gemma 3 270M - tiny free local',runtime:'ollama',status:'installable-free',model:'gemma3:270m',install_note:'Fastest useful local starter through MMIR Local Node.'},
      {id:'ollama-qwen3-06b',label:'Qwen3 0.6B - tiny reasoning local',runtime:'ollama',status:'installable-free',model:'qwen3:0.6b',install_note:'Small reasoning-capable local starter.'}
    ];
  }
  function starterGroupLabel(model){
    if(model.runtime==='browser-guide')return 'Ready now: free browser helpers';
    if(model.runtime==='webllm')return 'Ready now: free browser WebGPU LLMs';
    return 'Install to activate: free local Ollama models';
  }
  function starterToOption(model){
    return {
      value:starterValue(model),
      textContent:(model.label||model.id)+' - '+(model.runtime==='ollama'?'install to activate - free local':(model.runtime==='webllm'?'ready now - browser WebGPU':'ready now - browser helper')),
      dataset:{runtime:model.runtime||'starter'},
      parentElement:{label:starterGroupLabel(model)},
      __starterFloor:true
    };
  }
  function freeRouteFloor(options){
    const existing=new Set((options||[]).map(option=>String(option.value||'')));
    const floor=[];
    for(const model of starterModels){
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
    if(runtime==='browser-guide')return {state:'ready',label:'Browser helper',action:'Use now',detail:'Works immediately with no backend or API key.'};
    if(runtime==='webllm')return {state:'ready',label:'Browser WebGPU',action:'Use now',detail:'Runs locally in a WebGPU-capable browser.'};
    if(runtime==='ollama'||starterId(value))return {state:'install',label:'Free local install',action:'Install / prove',detail:'Installs through MMIR Local Node and Ollama.'};
    return {state:'planned',label:'Model option',action:'Use',detail:'Select without starting paid compute.'};
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
  function card(option){
    const select=modelSelect();
    const value=String(option.value||'');
    const kind=optionKind(option);
    const selected=select?.value===value;
    const group=String(option.parentElement?.label||'Model route');
    const title=cleanTitle(option.textContent,value);
    const cost=/live/i.test(group)?'active backend':kind.state==='install'?'free local':'free browser';
    const action=kind.state==='install'?'install':kind.state==='live'?'select-live':'select';
    return '<article class="composer-model-card '+(selected?'is-selected':'')+'" data-picker-state="'+escapeHtml(kind.state)+'">'+
      '<div><strong>'+escapeHtml(title)+'</strong><span>'+escapeHtml(kind.label)+' - '+escapeHtml(cost)+'</span></div>'+
      '<p>'+escapeHtml(kind.detail)+'</p>'+
      '<small>'+escapeHtml(group)+'</small>'+
      '<button type="button" data-picker-model-value="'+escapeHtml(value)+'" data-picker-action="'+escapeHtml(action)+'">'+escapeHtml(kind.action)+'</button>'+
    '</article>';
  }
  function render(){
    const el=ensurePicker();
    if(!el)return;
    const select=modelSelect();
    const rawOptions=Array.from(select?.options||[]).filter(option=>String(option.value||'').trim());
    const options=freeRouteFloor(rawOptions);
    const floorActive=options.length>rawOptions.length;
    if(!options.length){
      el.innerHTML='<div class="composer-model-picker-head"><div><strong>Choose a model</strong><p>MMIR is loading free browser and local model routes. No paid route starts here.</p></div><a href="#model-library">Full library</a></div>';
      return;
    }
    el.innerHTML='<div class="composer-model-picker-head"><div><strong>Choose model</strong><p>Current: '+escapeHtml(selectedLabel())+'. Free/browser/local paths first; provider keys stay outside this public page.</p>'+(floorActive?'<small class="composer-route-floor">Free route floor active: ready-now and installable choices stay visible while live backend discovery catches up.</small>':'')+'</div><a href="#model-library">Full library</a></div><div class="composer-model-picker-grid">'+options.map(card).join('')+'</div>';
    el.querySelector('.composer-model-picker-head a')?.addEventListener('click',()=>toggle(false));
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
    if(open)render();
  }
  function selectModel(value,action){
    const select=modelSelect();
    if(!select||!value)return;
    const id=starterId(value);
    const optionExists=Array.from(select.options||[]).some(option=>option.value===value);
    if(optionExists){
      select.value=value;
      select.dispatchEvent(new Event('change',{bubbles:true}));
    }
    window.MimirActivationTelemetry?.record?.('composer-model-picker',{status:action,model:id||value,route:'composer model picker',free:true,note:'Composer model picker selected '+(id||value)+'. no_paid_routes_started:true.'});
    if(id){
      window.dispatchEvent(new CustomEvent('mmir-runtime-starter-handoff',{detail:{starter_id:id,action:action==='install'?'install':'select',source:'composer-model-picker',route_floor:'composer-model-picker-free-route-floor',free:true,no_paid_routes_started:true}}));
    }
    toggle(false);
    promptEl()?.focus();
  }

  window.MimirComposerModelPicker={render,toggle,open:()=>toggle(true),close:()=>toggle(false),freeRouteFloor:()=>freeRouteFloor(Array.from(modelSelect()?.options||[])),starterCatalogLoaded:()=>starterCatalogLoaded};
  document.addEventListener('change',(event)=>{if(event.target?.id==='runtime-model')render();});
  window.addEventListener('mmir-backend-profiles-updated',render);
  window.addEventListener('mmir-live-model-proof-updated',render);
  loadStarterModels();
  render();
})();
