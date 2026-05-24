(function(){
  const d=document,w=window,q=s=>d.querySelector(s),safe=v=>String(v||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const API_NODES_URL='https://api.mmir.ai/nodes';
  let apiNodes=[];
  let apiStatus='checking';
  let lastFetch=0;
  let fetching=false;

  function selectedModel(){const select=q('#runtime-model'),option=select?.selectedOptions?.[0];return {value:select?.value||'',label:String(option?.textContent||select?.value||'MMIR Guide').replace(/\s+-\s+live$/i,'').trim(),runtime:option?.dataset?.runtime||''};}
  function firstApiNode(){return apiNodes.find(node=>node&&['online','ready','available'].includes(String(node.status||'').toLowerCase()))||apiNodes[0]||null;}
  function modelFromNode(node){const model=Array.isArray(node?.models)?node.models.find(item=>item&&['available','online','ready'].includes(String(item.status||'').toLowerCase()))||node.models[0]:null;return model||null;}
  function nodeState(node){
    const model=modelFromNode(node);
    const cost=node?.cost?.mode||model?.cost?.mode||'free';
    const trust=node?.trust_level||model?.trust_level||'public-free';
    const status=String(node?.status||'online');
    return {
      kind:'api-node',
      title:node?.name||'MMIR Browser Guide',
      status:status.charAt(0).toUpperCase()+status.slice(1),
      detail:node?.detail||'Active node from api.mmir.ai. It can answer now without paid provider calls.',
      trust:trust.replace(/-/g,' '),
      model:model?.name||model?.id||'MMIR Guide',
      source:node?.type==='free'?'Free active node':(node?.type||'Active node'),
      cost:cost==='free'?'Free / no approval':String(cost),
      node
    };
  }
  function fallbackState(){
    const model=selectedModel(),text=String(q('#runtime-state')?.textContent||'')+' '+String(q('#runtime-resource-chip')?.textContent||'');
    const localReady=/backend ready|local node|ollama|live model|response received/i.test(text)&&!/offline|not running|unreachable|not connected/i.test(text);
    const webGpu=model.runtime==='webllm'||/webgpu/i.test(model.label);
    if(localReady&&/live/i.test(model.label+model.runtime))return {kind:'local',title:'MMIR Local Node',status:'Ready',detail:'Local model connected. Prompts route to the paired local node.',trust:'Private local route',model:model.label||'Live local model',source:'Local node',cost:'Free local'};
    if(webGpu&&navigator.gpu)return {kind:'webgpu',title:'Browser WebGPU',status:'Ready',detail:'Runs locally in this browser when the model is loaded.',trust:'Browser-local route',model:model.label||'Browser model',source:'Browser runtime',cost:'Free local'};
    return {kind:'guide',title:'Browser Guide',status:apiStatus==='offline'?'Fallback ready':'Ready now',detail:'Works immediately. No setup, no paid route, no provider key.',trust:'Free browser route',model:model.label&&model.label!=='No model'?model.label:'MMIR Guide',source:'Free fallback',cost:'Free'};
  }
  function state(){return firstApiNode()?nodeState(firstApiNode()):fallbackState();}
  async function fetchNodes(force){
    const now=Date.now();
    if(fetching||(!force&&now-lastFetch<15000))return;
    fetching=true;lastFetch=now;apiStatus='checking';
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),2600);
    try{
      const res=await fetch(API_NODES_URL,{headers:{Accept:'application/json'},cache:'no-store',signal:controller.signal});
      if(!res.ok)throw new Error('nodes_'+res.status);
      const body=await res.json();
      apiNodes=Array.isArray(body?.data)?body.data.filter(Boolean):[];
      apiStatus=apiNodes.length?'ready':'empty';
    }catch(error){
      apiStatus='offline';
    }finally{
      clearTimeout(timeout);
      fetching=false;
    }
  }
  function style(){
    if(q('#mmir-active-node-strip-style'))return;
    const el=d.createElement('style');el.id='mmir-active-node-strip-style';el.textContent='#mmir-active-nodes-bar{border:1px solid rgba(16,163,127,.28);background:linear-gradient(145deg,rgba(236,253,245,.98),rgba(255,255,255,.96));border-radius:22px;padding:.9rem 1rem;margin:.9rem 0 .75rem;display:grid;gap:.75rem;box-shadow:0 14px 42px rgba(15,23,42,.08)}.mmir-active-node-head{display:flex;align-items:flex-start;justify-content:space-between;gap:.8rem;flex-wrap:wrap}.mmir-active-node-title{display:grid;gap:.2rem}.mmir-active-node-title span{font-size:.72rem;font-weight:850;letter-spacing:.1em;text-transform:uppercase;color:#047857}.mmir-active-node-title strong{font-size:1.02rem;color:#0f172a}.mmir-active-node-title small{color:#64748b;line-height:1.35}.mmir-active-node-pill{display:inline-flex;align-items:center;gap:.42rem;border:1px solid rgba(16,163,127,.34);background:#ecfdf5;color:#047857;border-radius:999px;padding:.32rem .62rem;font-size:.8rem;font-weight:800;white-space:nowrap}.mmir-active-node-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:.55rem}.mmir-active-node-chip{border:1px solid rgba(148,163,184,.22);background:#fff;border-radius:16px;padding:.58rem .68rem;display:grid;gap:.18rem;min-width:0}.mmir-active-node-chip span{font-size:.7rem;text-transform:uppercase;letter-spacing:.07em;color:#64748b;font-weight:800}.mmir-active-node-chip strong{font-size:.85rem;color:#0f172a;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.mmir-active-node-actions{display:flex;gap:.5rem;flex-wrap:wrap}.mmir-active-node-actions button,.mmir-active-node-actions a{border:1px solid rgba(15,23,42,.12);background:#fff;color:#0f172a;border-radius:999px;padding:.48rem .76rem;font-weight:750;text-decoration:none;cursor:pointer}.mmir-active-node-actions .primary{background:#0f172a;color:#fff;border-color:#0f172a}@media(max-width:760px){.mmir-active-node-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:640px){#mmir-active-nodes-bar{margin:.65rem 0;padding:.78rem}.mmir-active-node-grid{grid-template-columns:1fr}.mmir-active-node-actions>*{flex:1;text-align:center}}';
    d.head.appendChild(el);
  }
  function sendPrompt(value){const prompt=q('#mimir-prompt');if(!prompt)return;prompt.value=value;prompt.dispatchEvent(new Event('input',{bubbles:true}));prompt.dispatchEvent(new Event('change',{bubbles:true}));q('#primary-chat-link')?.click();}
  function openLocal(event){event?.preventDefault?.();if(w.MimirBackendProfiles?.ensureFreeLocalProfile)w.MimirBackendProfiles.ensureFreeLocalProfile();const target=q('#local-connector')||q('#connect-options');if(target){for(let x=target;x;x=x.parentElement?.closest?.('details'))if('open'in x)x.open=true;target.scrollIntoView({behavior:'smooth',block:'start'});}}
  function render(){
    const composer=q('.mimir-composer');if(!composer)return;style();
    let bar=q('#mmir-active-nodes-bar');if(!bar){bar=d.createElement('section');bar.id='mmir-active-nodes-bar';bar.setAttribute('aria-label','Active chat nodes');composer.parentNode.insertBefore(bar,composer);}
    const s=state();bar.dataset.state=s.kind;bar.innerHTML='<div class="mmir-active-node-head"><div class="mmir-active-node-title"><span>Active route</span><strong>'+safe(s.title)+' is connected to chat</strong><small>'+safe(s.detail)+'</small></div><div class="mmir-active-node-pill">'+safe(s.status)+'</div></div><div class="mmir-active-node-grid"><div class="mmir-active-node-chip"><span>Node</span><strong>'+safe(s.title)+'</strong></div><div class="mmir-active-node-chip"><span>Model</span><strong>'+safe(s.model)+'</strong></div><div class="mmir-active-node-chip"><span>Trust</span><strong>'+safe(s.trust)+'</strong></div><div class="mmir-active-node-chip"><span>Cost</span><strong>'+safe(s.cost)+'</strong></div></div><div class="mmir-active-node-actions"><button type="button" class="primary" data-active-node-send>Send first message</button><button type="button" data-active-node-refresh>Refresh nodes</button><a href="#local-connector" data-active-node-open-local>Install local node</a></div>';
    q('#active-badge')&&(q('#active-badge').textContent='Active: '+s.title);
    q('#active-chat-title')&&(q('#active-chat-title').textContent=s.title+' active - chat now.');
    q('#active-chat-description')&&(q('#active-chat-description').textContent='Chat is ready immediately through '+s.trust+'. Local and hosted nodes can be added when available.');
    bar.querySelector('[data-active-node-send]')?.addEventListener('click',()=>sendPrompt('Start free chat. Tell me what active node and model are answering, and what I can connect next.'));
    bar.querySelector('[data-active-node-refresh]')?.addEventListener('click',()=>{q('#runtime-refresh')?.click();fetchNodes(true).then(render);setTimeout(render,200);});
    bar.querySelector('[data-active-node-open-local]')?.addEventListener('click',openLocal);
    fetchNodes(false).then(render);
  }
  d.readyState==='loading'?d.addEventListener('DOMContentLoaded',()=>{render();fetchNodes(true).then(render);}):(render(),fetchNodes(true).then(render));
  ['load','mmir-backend-profiles-updated','mmir-local-connector-refreshed','mmir-chat-history-updated'].forEach(name=>w.addEventListener(name,render));
  let n=0,t=setInterval(()=>{render();if(++n>10)clearInterval(t)},750);
})();
