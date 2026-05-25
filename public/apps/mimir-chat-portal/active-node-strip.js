(function(){
  const d=document,w=window,q=s=>d.querySelector(s),safe=v=>String(v||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const MANIFEST_URL='./active-chat-nodes.json';
  const STARTER_CATALOG='./free-model-starters.json';
  const DEFAULT_LOCAL_URL='http://127.0.0.1:3000';
  const WORKSPACE_KEY='mimir-active-workspace-v1';
  const REPAIR_RESUME_PREFIX='mimir-repair-resume-v1:';
  let manifestNodes=[];
  let starterModels=[];
  let liveModels=[];
  let localState={status:'checking',hardware:'CPU/RAM checking',url:DEFAULT_LOCAL_URL};
  let manifestLoaded=false;
  let catalogLoaded=false;

  function selectedModel(){const select=q('#runtime-model'),option=select?.selectedOptions?.[0];return {value:select?.value||'',label:String(option?.textContent||select?.value||'MMIR Guide').replace(/\s+-\s+live$/i,'').trim(),runtime:option?.dataset?.runtime||''};}
  function webGpuReady(){return Boolean(w.isSecureContext&&navigator.gpu);}
  function costText(node){const mode=node?.cost?.mode||'free';return mode==='free-local'?'Free local':mode==='free'?'Free':String(mode);}
  function modelFromNode(node){const model=Array.isArray(node?.models)?node.models[0]:null;return model?.name||model?.id||'Auto';}
  function starterId(node){return String(node?.route?.starter_id||'');}
  function localReady(){return localState.status==='online'&&liveModels.length>0;}
  function nodeStatus(node){
    if(node.id==='local-node')return localReady()?'online':(localState.status==='offline'?'offline':'setup');
    if(node.id==='browser-webgpu-qwen')return webGpuReady()?'online':'setup';
    return 'online';
  }
  function nodeModel(node){
    if(node.id==='local-node')return liveModels[0]?.id||liveModels[0]?.name||'Install one free model';
    if(node.id==='browser-webgpu-qwen')return webGpuReady()?modelFromNode(node):'Needs WebGPU browser';
    return modelFromNode(node);
  }
  function nodeDetail(node){
    if(node.id==='local-node'){
      if(localReady())return 'Paired local node has live models. Chat can use the local backend now.';
      if(localState.status==='offline')return 'Not running yet. Install or start MMIR Local Node; chat still works through browser routes.';
      return 'Auto-detecting localhost. Local node stays private and pairs before model/chat control.';
    }
    if(node.id==='browser-webgpu-qwen')return webGpuReady()?'Real browser-local LLM route. First use may download model weights.':'Connectable free route; enabled automatically in secure WebGPU-capable browsers.';
    return 'Works immediately in this browser. No setup, no paid route and no provider key.';
  }
  function card(node){
    const status=nodeStatus(node);
    const action=status==='online'?'Chat':(node.id==='local-node'?'Install':'Connect');
    const model=nodeModel(node);
    return '<article class="mmir-active-node-card" data-node-id="'+safe(node.id)+'" data-node-state="'+safe(status)+'">'+
      '<div><span>'+safe(status==='online'?'Live route':'Connectable')+'</span><strong>'+safe(node.name)+'</strong><small>'+safe(nodeDetail(node))+'</small></div>'+
      '<dl><div><dt>Model</dt><dd>'+safe(model)+'</dd></div><div><dt>Trust</dt><dd>'+safe(String(node.trust_level||'public-free').replace(/-/g,' '))+'</dd></div><div><dt>Cost</dt><dd>'+safe(costText(node))+'</dd></div></dl>'+
      '<button type="button" data-active-node-action="'+safe(node.id)+'">'+safe(action)+'</button>'+
    '</article>';
  }
  async function loadManifest(){
    if(manifestLoaded)return;
    try{
      const res=await fetch(MANIFEST_URL,{cache:'default'});
      if(!res.ok)throw new Error('active node manifest unavailable');
      const body=await res.json();
      manifestNodes=Array.isArray(body.nodes)?body.nodes.filter(node=>node?.id):[];
    }catch(error){
      manifestNodes=[
        {id:'browser-guide',name:'MMIR Guide',type:'free',status:'online',trust_level:'public-free',cost:{mode:'free'},route:{kind:'starter',starter_id:'mmir-guide'},models:[{id:'mmir-guide',name:'MMIR Guide'}]},
        {id:'browser-webgpu-qwen',name:'Browser WebGPU',type:'browser',status:'available_if_supported',trust_level:'browser-local',cost:{mode:'free'},route:{kind:'starter',starter_id:'webllm-qwen25-05b'},models:[{id:'Qwen2.5-0.5B-Instruct-q4f16_1-MLC',name:'Qwen2.5 0.5B'}]},
        {id:'local-node',name:'MMIR Local Node',type:'local',status:'auto_detect',trust_level:'paired-local',cost:{mode:'free-local'},route:{kind:'local-node',url:DEFAULT_LOCAL_URL},models:[]}
      ];
    }
    manifestLoaded=true;
  }
  function fallbackStarters(){
    return [
      {id:'mmir-guide',label:'MMIR Guide',runtime:'browser-guide',status:'live-browser',model:''},
      {id:'mmir-model-picker',label:'MMIR Model Picker',runtime:'browser-guide',status:'live-browser',model:''},
      {id:'webllm-qwen25-05b',label:'Qwen2.5 0.5B',runtime:'webllm',status:'active-browser-webgpu',model:'Qwen2.5-0.5B-Instruct-q4f16_1-MLC'},
      {id:'ollama-gemma3-270m',label:'Gemma 3 270M',runtime:'ollama',status:'installable-free',model:'gemma3:270m'},
      {id:'ollama-qwen3-06b',label:'Qwen3 0.6B',runtime:'ollama',status:'installable-free',model:'qwen3:0.6b'}
    ];
  }
  async function loadStarterCatalog(){
    if(catalogLoaded)return;
    try{
      const res=await fetch(STARTER_CATALOG,{cache:'default'});
      if(!res.ok)throw new Error('starter catalog unavailable');
      const body=await res.json();
      starterModels=Array.isArray(body.models)?body.models.filter(model=>model?.id&&model?.label):[];
    }catch(error){
      starterModels=fallbackStarters();
    }
    if(!starterModels.length)starterModels=fallbackStarters();
    catalogLoaded=true;
  }
  function style(){
    if(q('#mmir-active-node-strip-style'))return;
    const el=d.createElement('style');el.id='mmir-active-node-strip-style';el.textContent=`#mmir-active-nodes-bar{border:1px solid rgba(16,163,127,.22);background:rgba(255,255,255,.86);border-radius:18px;padding:.6rem;margin:.35rem 0;display:grid;gap:.46rem;box-shadow:0 10px 28px rgba(15,23,42,.055)}.mmir-active-node-head{display:flex;align-items:center;justify-content:space-between;gap:.65rem;flex-wrap:wrap}.mmir-active-node-title{display:grid;gap:.1rem;min-width:0}.mmir-active-node-title span{font-size:.66rem;font-weight:850;letter-spacing:.08em;text-transform:uppercase;color:#047857}.mmir-active-node-title strong{font-size:.92rem;color:#0f172a;line-height:1.14}.mmir-active-node-title small{color:#64748b;line-height:1.28;font-size:.78rem}.mmir-active-node-pill{border:1px solid rgba(16,163,127,.28);background:#ecfdf5;color:#047857;border-radius:999px;padding:.24rem .52rem;font-size:.72rem;font-weight:800;white-space:nowrap}.mmir-active-starter-rail{display:flex;gap:.36rem;overflow:auto;padding:.04rem .02rem .14rem;scrollbar-width:thin}.mmir-active-starter-rail button{border:1px solid rgba(16,163,127,.22);background:#fff;color:#0f172a;border-radius:999px;padding:.34rem .54rem;font-size:.74rem;font-weight:800;white-space:nowrap;cursor:pointer}.mmir-active-starter-rail button[data-starter-runtime="browser-guide"],.mmir-active-starter-rail button[data-starter-runtime="webllm"]{background:#ecfdf5;color:#047857}.mmir-active-starter-rail button[data-starter-runtime="ollama"]{background:#f8fafc;color:#334155}.mmir-active-node-grid{display:flex;gap:.42rem;overflow:auto;padding:.02rem .02rem .1rem;scrollbar-width:thin}.mmir-active-node-card{align-items:center;border:1px solid rgba(148,163,184,.22);background:#fff;border-radius:999px;display:grid;grid-template-columns:minmax(150px,1fr) auto;gap:.55rem;min-width:min(265px,82vw);padding:.45rem .5rem .45rem .68rem}.mmir-active-node-card[data-node-state="online"]{border-color:rgba(16,163,127,.32);background:#f6fffb}.mmir-active-node-card span{font-size:.62rem;text-transform:uppercase;letter-spacing:.07em;color:#047857;font-weight:850}.mmir-active-node-card strong{display:block;color:#0f172a;font-size:.84rem;line-height:1.15}.mmir-active-node-card small{display:block;color:#64748b;font-size:.72rem;line-height:1.22;margin-top:.08rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.mmir-active-node-card dl{display:none}.mmir-active-node-card button{min-height:30px;border:1px solid rgba(15,23,42,.12);background:#0f172a;color:#fff;border-radius:999px;font-size:.74rem;font-weight:750;padding:0 .72rem;cursor:pointer;white-space:nowrap}.mmir-active-node-card[data-node-state="setup"] button{background:#fff;color:#0f172a}.mmir-active-node-card[data-node-state="offline"] button{background:#fff7ed;color:#92400e;border-color:#fed7aa}@media(max-width:760px){#mmir-active-nodes-bar{border-radius:16px;padding:.52rem}.mmir-active-node-head small{display:none}.mmir-active-node-card{min-width:min(235px,78vw);grid-template-columns:minmax(120px,1fr) auto}.mmir-active-starter-rail button{font-size:.72rem;padding:.32rem .5rem}}`;
    d.head.appendChild(el);
  }
  function selectStarter(node,prompt){
    const id=starterId(node);
    if(id)w.dispatchEvent(new CustomEvent('mmir-runtime-starter-handoff',{detail:{starter_id:id,action:'select',source:'active-node-strip',free:true,no_paid_routes_started:true}}));
    const promptEl=q('#mimir-prompt');
    if(promptEl&&prompt){
      promptEl.value=prompt;
      promptEl.dispatchEvent(new Event('input',{bubbles:true}));
      promptEl.dispatchEvent(new Event('change',{bubbles:true}));
    }
    q('#primary-chat-link')?.click();
  }
  function activeWorkspaceId(){return localStorage.getItem(WORKSPACE_KEY)||'personal';}
  function repairResumeKey(){return REPAIR_RESUME_PREFIX+activeWorkspaceId();}
  function writeLocalInstallResume(source){
    const resume={source:String(source||'active-strip'),status:'pending',target:'#local-connector',starter_id:'ollama-qwen3-06b',model:'qwen3:0.6b',next_action:'installer-return-proof',at:new Date().toISOString(),no_paid_routes_started:true,provider_secrets_stored:false,raw_prompt_stored:false,raw_response_stored:false};
    try{localStorage.setItem(repairResumeKey(),JSON.stringify(resume));}catch(error){}
    w.dispatchEvent(new CustomEvent('mmir-repair-resume-started',{detail:resume}));
    return resume;
  }
  function openInstaller(source){
    w.MimirBackendProfiles?.ensureFreeLocalProfile?.();
    writeLocalInstallResume(source);
    w.location.href='./downloads/mmir-local-connector-install.html';
  }
  function bestNode(nodes,selected){
    const label=String(selected.label||'');
    if(selected.runtime==='browser-guide'||/MMIR Guide|Model Picker|Setup Coach|Security Coach|Growth Coach/i.test(label))return nodes.find(node=>node.id==='browser-guide')||nodes[0];
    if(selected.runtime==='webllm'||/WebGPU|Qwen2.5 0.5B|Gemma 3 1B|Llama 3.2 1B|Phi 3.5/i.test(label))return nodes.find(node=>node.id==='browser-webgpu-qwen')||nodes[0];
    if(localReady()&&(selected.runtime==='live'||/local|ollama|live/i.test(label)))return nodes.find(node=>node.id==='local-node')||nodes[0];
    return localReady()?nodes.find(node=>node.id==='local-node'):(webGpuReady()?nodes.find(node=>node.id==='browser-webgpu-qwen'):nodes.find(node=>node.id==='browser-guide'))||nodes[0];
  }
  function activateNode(node){
    if(!node)return;
    if(node.id==='local-node'){
      if(localReady()){
        const promptEl=q('#mimir-prompt');
        if(promptEl&&!String(promptEl.value||'').trim())promptEl.value='Start a private local chat and tell me which local model is answering.';
        q('#primary-chat-link')?.click();
      }else openInstaller('active-node-local-install');
      return;
    }
    if(node.id==='browser-webgpu-qwen'&&!webGpuReady()){
      openInstaller('active-node-webgpu-fallback');
      return;
    }
    selectStarter(node,'Start free chat. Tell me which active node and model are answering, and what I can connect next.');
  }
  function starterAction(model){
    if(model.runtime==='ollama')return 'install';
    return 'select';
  }
  function starterLabel(model){
    const prefix=model.runtime==='ollama'?'Install':(model.runtime==='webllm'?'WebGPU':'Now');
    return prefix+' '+String(model.label||model.id||'model').replace(/\s+-\s+(active in browser|free browser helper|live helper|tiny free local|tiny reasoning local|small multilingual|balanced free local|local assistant|tiny local chat|reasoning local|long-context business local|compact premium-feel local|code assistant).*$/i,'');
  }
  function starterRail(){
    if(!starterModels.length)return '';
    const visible=starterModels.filter(model=>['browser-guide','webllm','ollama'].includes(model.runtime)).slice(0,14);
    if(!visible.length)return '';
    return '<div class="mmir-active-starter-rail" aria-label="Free model starters">'+visible.map(model=>
      '<button type="button" data-active-starter-id="'+safe(model.id)+'" data-starter-runtime="'+safe(model.runtime)+'" title="'+safe(model.install_note||model.best_for||model.label)+'">'+safe(starterLabel(model))+'</button>'
    ).join('')+'</div>';
  }
  function activateStarter(model){
    if(!model?.id)return;
    const action=starterAction(model);
    w.dispatchEvent(new CustomEvent('mmir-runtime-starter-handoff',{detail:{starter_id:model.id,action,source:'active-node-starter-rail',free:true,no_paid_routes_started:true}}));
    const promptEl=q('#mimir-prompt');
    if(action!=='install'){
      if(promptEl&&!String(promptEl.value||'').trim()){
        promptEl.value='Start a free chat with '+(model.label||model.id)+'. Tell me what is active and what I can connect next.';
        promptEl.dispatchEvent(new Event('input',{bubbles:true}));
        promptEl.dispatchEvent(new Event('change',{bubbles:true}));
      }
      q('#primary-chat-link')?.click();
    }
  }
  function render(){
    const composer=q('.mimir-composer');if(!composer)return;
    style();
    let bar=q('#mmir-active-nodes-bar');if(!bar){bar=d.createElement('section');bar.id='mmir-active-nodes-bar';bar.setAttribute('aria-label','Active chat routes');composer.parentNode.insertBefore(bar,composer.nextSibling);}
    const nodes=manifestNodes.length?manifestNodes:[{id:'browser-guide',name:'MMIR Guide',trust_level:'public-free',cost:{mode:'free'},route:{starter_id:'mmir-guide'},models:[{name:'MMIR Guide'}]}];
    const selected=selectedModel();
    const best=bestNode(nodes,selected);
    bar.dataset.state=nodeStatus(best);
    bar.innerHTML='<div class="mmir-active-node-head"><div class="mmir-active-node-title"><span>Active chat routes</span><strong>'+safe(best.name)+' is ready for chat</strong><small>MMIR shows only free/public-safe routes that the composer can actually use. Selected now: '+safe(selected.label||'MMIR Guide')+'.</small></div><div class="mmir-active-node-pill">'+safe(nodeStatus(best)==='online'?'Ready now':'Setup ready')+'</div></div>'+starterRail()+'<div class="mmir-active-node-grid">'+nodes.map(card).join('')+'</div>';
    q('#active-badge')&&(q('#active-badge').textContent='Active: '+best.name);
    q('#active-chat-title')&&(q('#active-chat-title').textContent=best.name+' active - chat now.');
    q('#active-chat-description')&&(q('#active-chat-description').textContent='Chat is ready immediately through free browser routing. Local and hosted nodes can be added when available.');
    bar.querySelectorAll('[data-active-node-action]').forEach(button=>button.addEventListener('click',()=>activateNode(nodes.find(node=>node.id===button.getAttribute('data-active-node-action')))));
    bar.querySelectorAll('[data-active-starter-id]').forEach(button=>button.addEventListener('click',()=>activateStarter(starterModels.find(model=>model.id===button.getAttribute('data-active-starter-id')))));
  }
  function updateFromConnector(event){
    const detail=event?.detail||{};
    const models=Array.isArray(detail.models)?detail.models:[];
    liveModels=models.map(model=>({id:model.id||model.name||model.model||'',name:model.name||model.label||model.id||model.model||''})).filter(model=>model.id||model.name);
    localState={...localState,status:detail.status||detail.health||localState.status||'checking',url:detail.url||localState.url,hardware:detail.hardware||localState.hardware};
    render();
  }
  function init(){
    Promise.all([loadManifest(),loadStarterCatalog()]).then(render);
    render();
  }
  d.readyState==='loading'?d.addEventListener('DOMContentLoaded',init):init();
  ['load','mmir-backend-profiles-updated','mmir-chat-history-updated','mmir-live-model-proof-updated'].forEach(name=>w.addEventListener(name,render));
  w.addEventListener('mmir-local-connector-refreshed',updateFromConnector);
  let n=0,t=setInterval(()=>{render();if(++n>10)clearInterval(t)},750);
})();
