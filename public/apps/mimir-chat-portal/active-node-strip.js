(function(){
  const d=document,w=window,q=s=>d.querySelector(s),safe=v=>String(v||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const MANIFEST_URL='./active-chat-nodes.json';
  const DEFAULT_LOCAL_URL='http://127.0.0.1:3000';
  let manifestNodes=[];
  let liveModels=[];
  let localState={status:'checking',hardware:'CPU/RAM checking',url:DEFAULT_LOCAL_URL};
  let manifestLoaded=false;

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
    const action=status==='online'?'Chat':'Connect';
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
  function style(){
    if(q('#mmir-active-node-strip-style'))return;
    const el=d.createElement('style');el.id='mmir-active-node-strip-style';el.textContent='#mmir-active-nodes-bar{border:1px solid rgba(16,163,127,.24);background:rgba(255,255,255,.88);border-radius:20px;padding:.78rem;margin:.65rem 0;display:grid;gap:.68rem;box-shadow:0 12px 34px rgba(15,23,42,.07)}.mmir-active-node-head{display:flex;align-items:flex-start;justify-content:space-between;gap:.8rem;flex-wrap:wrap}.mmir-active-node-title{display:grid;gap:.16rem}.mmir-active-node-title span{font-size:.7rem;font-weight:850;letter-spacing:.08em;text-transform:uppercase;color:#047857}.mmir-active-node-title strong{font-size:1rem;color:#0f172a}.mmir-active-node-title small{color:#64748b;line-height:1.35}.mmir-active-node-pill{border:1px solid rgba(16,163,127,.28);background:#ecfdf5;color:#047857;border-radius:999px;padding:.28rem .58rem;font-size:.78rem;font-weight:800;white-space:nowrap}.mmir-active-node-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.55rem}.mmir-active-node-card{border:1px solid rgba(148,163,184,.22);background:#fff;border-radius:16px;padding:.7rem;display:grid;gap:.55rem;min-width:0}.mmir-active-node-card[data-node-state="online"]{border-color:rgba(16,163,127,.32);background:#f6fffb}.mmir-active-node-card span{font-size:.66rem;text-transform:uppercase;letter-spacing:.07em;color:#047857;font-weight:850}.mmir-active-node-card strong{display:block;color:#0f172a;font-size:.92rem}.mmir-active-node-card small{display:block;color:#64748b;font-size:.78rem;line-height:1.32;margin-top:.14rem}.mmir-active-node-card dl{display:grid;gap:.24rem;margin:0}.mmir-active-node-card dl div{display:flex;justify-content:space-between;gap:.5rem;border-top:1px solid rgba(148,163,184,.16);padding-top:.24rem}.mmir-active-node-card dt,.mmir-active-node-card dd{font-size:.7rem;color:#64748b;margin:0}.mmir-active-node-card dd{color:#0f172a;text-align:right;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.mmir-active-node-card button{min-height:34px;border:1px solid rgba(15,23,42,.12);background:#0f172a;color:#fff;border-radius:999px;font-weight:750;cursor:pointer}.mmir-active-node-card[data-node-state="setup"] button{background:#fff;color:#0f172a}.mmir-active-node-card[data-node-state="offline"] button{background:#fff7ed;color:#92400e;border-color:#fed7aa}@media(max-width:760px){.mmir-active-node-grid{grid-template-columns:1fr}.mmir-active-node-card{padding:.65rem}}';
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
  function openLocal(){
    w.MimirBackendProfiles?.ensureFreeLocalProfile?.();
    const target=q('#local-connector')||q('#connect-options');
    if(target){for(let x=target;x;x=x.parentElement?.closest?.('details'))if('open'in x)x.open=true;target.scrollIntoView({behavior:'smooth',block:'start'});}
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
      }else openLocal();
      return;
    }
    if(node.id==='browser-webgpu-qwen'&&!webGpuReady()){
      openLocal();
      return;
    }
    selectStarter(node,'Start free chat. Tell me which active node and model are answering, and what I can connect next.');
  }
  function render(){
    const composer=q('.mimir-composer');if(!composer)return;
    style();
    let bar=q('#mmir-active-nodes-bar');if(!bar){bar=d.createElement('section');bar.id='mmir-active-nodes-bar';bar.setAttribute('aria-label','Active chat routes');composer.parentNode.insertBefore(bar,composer);}
    const nodes=manifestNodes.length?manifestNodes:[{id:'browser-guide',name:'MMIR Guide',trust_level:'public-free',cost:{mode:'free'},route:{starter_id:'mmir-guide'},models:[{name:'MMIR Guide'}]}];
    const selected=selectedModel();
    const best=bestNode(nodes,selected);
    bar.dataset.state=nodeStatus(best);
    bar.innerHTML='<div class="mmir-active-node-head"><div class="mmir-active-node-title"><span>Active chat routes</span><strong>'+safe(best.name)+' is ready for chat</strong><small>MMIR shows only free/public-safe routes that the composer can actually use. Selected now: '+safe(selected.label||'MMIR Guide')+'.</small></div><div class="mmir-active-node-pill">'+safe(nodeStatus(best)==='online'?'Ready now':'Setup ready')+'</div></div><div class="mmir-active-node-grid">'+nodes.map(card).join('')+'</div>';
    q('#active-badge')&&(q('#active-badge').textContent='Active: '+best.name);
    q('#active-chat-title')&&(q('#active-chat-title').textContent=best.name+' active - chat now.');
    q('#active-chat-description')&&(q('#active-chat-description').textContent='Chat is ready immediately through free browser routing. Local and hosted nodes can be added when available.');
    bar.querySelectorAll('[data-active-node-action]').forEach(button=>button.addEventListener('click',()=>activateNode(nodes.find(node=>node.id===button.getAttribute('data-active-node-action')))));
  }
  function updateFromConnector(event){
    const detail=event?.detail||{};
    const models=Array.isArray(detail.models)?detail.models:[];
    liveModels=models.map(model=>({id:model.id||model.name||model.model||'',name:model.name||model.label||model.id||model.model||''})).filter(model=>model.id||model.name);
    localState={...localState,status:detail.status||detail.health||localState.status||'checking',url:detail.url||localState.url,hardware:detail.hardware||localState.hardware};
    render();
  }
  function init(){
    loadManifest().then(render);
    render();
  }
  d.readyState==='loading'?d.addEventListener('DOMContentLoaded',init):init();
  ['load','mmir-backend-profiles-updated','mmir-chat-history-updated','mmir-live-model-proof-updated'].forEach(name=>w.addEventListener(name,render));
  w.addEventListener('mmir-local-connector-refreshed',updateFromConnector);
  let n=0,t=setInterval(()=>{render();if(++n>10)clearInterval(t)},750);
})();
