(function(){
  const d=document;
  const w=window;
  const PROMPT='#mimir-prompt';
  const RUNTIME='#mimir-chat-runtime';
  const LOCAL='#local-connector';
  const CONNECT='#connect-options';
  const ACTIVE_BAR_ID='mmir-active-nodes-bar';
  const STYLE_ID='mmir-active-nodes-style';
  const ANCHORS='a[href="#mimir-prompt"],a[href="#mimir-chat-runtime"],a[href="#local-connector"],a[href="#connect-options"],a[href="#backend-settings"]';
  const q=s=>d.querySelector(s);
  const qa=s=>Array.from(d.querySelectorAll(s));

  function setAttr(el,name,value){if(el&&el.getAttribute(name)!==value)el.setAttribute(name,value);}
  function safe(value){return String(value||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

  function runtimeModelSelect(){return q('#runtime-model');}
  function selectedModel(){
    const select=runtimeModelSelect();
    const option=select?.selectedOptions?.[0];
    return {
      value:select?.value||'',
      label:String(option?.textContent||select?.value||'MMIR Guide').replace(/\s+-\s+live$/i,'').trim(),
      runtime:option?.dataset?.runtime||''
    };
  }

  function activeNodeState(){
    const model=selectedModel();
    const localText=String(q('#runtime-resource-chip')?.textContent||'');
    const runtimeText=String(q('#runtime-state')?.textContent||'');
    const localReady=/backend ready|local node|ollama|live model|response received/i.test(runtimeText+' '+localText) && !/offline|not running|unreachable|not connected/i.test(runtimeText+' '+localText);
    const webGpuReady=Boolean(navigator.gpu);
    const isWebGpu=model.runtime==='webllm'||/webgpu/i.test(model.label);
    const isGuide=!model.value||model.value.startsWith('starter:mmir-')||model.runtime==='browser-guide'||/guide|setup coach|model picker|security coach|growth coach/i.test(model.label);

    if(localReady&&/live/i.test(model.label+model.runtime)){
      return {
        kind:'local',
        title:'MMIR Local Node',
        status:'Ready',
        detail:'Local model connected. Prompts route to the paired local node.',
        trust:'Private local route',
        model:model.label||'Live local model'
      };
    }
    if(isWebGpu&&webGpuReady){
      return {
        kind:'webgpu',
        title:'Browser WebGPU',
        status:'Ready',
        detail:'Runs locally in this browser when the model is loaded.',
        trust:'Browser-local route',
        model:model.label||'Browser model'
      };
    }
    return {
      kind:'guide',
      title:'Browser Guide',
      status:'Ready now',
      detail:'Works immediately. No setup, no paid route, no provider key.',
      trust:'Free browser route',
      model:model.label&&model.label!=='No model'?model.label:'MMIR Guide'
    };
  }

  function installStyle(){
    if(q('#'+STYLE_ID))return;
    const style=d.createElement('style');
    style.id=STYLE_ID;
    style.textContent='\
      #mmir-active-nodes-bar{border:1px solid rgba(16,163,127,.28);background:linear-gradient(145deg,rgba(236,253,245,.98),rgba(255,255,255,.96));border-radius:22px;padding:.9rem 1rem;margin:.9rem 0 .75rem;display:grid;gap:.75rem;box-shadow:0 14px 42px rgba(15,23,42,.08)}\
      .mmir-active-node-head{display:flex;align-items:flex-start;justify-content:space-between;gap:.8rem;flex-wrap:wrap}\
      .mmir-active-node-title{display:grid;gap:.2rem}.mmir-active-node-title span{font-size:.72rem;font-weight:850;letter-spacing:.1em;text-transform:uppercase;color:#047857}.mmir-active-node-title strong{font-size:1.02rem;color:#0f172a}.mmir-active-node-title small{color:#64748b;line-height:1.35}\
      .mmir-active-node-pill{display:inline-flex;align-items:center;gap:.42rem;border:1px solid rgba(16,163,127,.34);background:#ecfdf5;color:#047857;border-radius:999px;padding:.32rem .62rem;font-size:.8rem;font-weight:800;white-space:nowrap}.mmir-active-node-pill::before{content:"";width:.55rem;height:.55rem;border-radius:50%;background:#10b981;box-shadow:0 0 0 4px rgba(16,185,129,.14)}\
      .mmir-active-node-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.55rem}.mmir-active-node-chip{border:1px solid rgba(148,163,184,.22);background:#fff;border-radius:16px;padding:.58rem .68rem;display:grid;gap:.18rem}.mmir-active-node-chip span{font-size:.7rem;text-transform:uppercase;letter-spacing:.07em;color:#64748b;font-weight:800}.mmir-active-node-chip strong{font-size:.85rem;color:#0f172a;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}\
      .mmir-active-node-actions{display:flex;gap:.5rem;flex-wrap:wrap}.mmir-active-node-actions button,.mmir-active-node-actions a{border:1px solid rgba(15,23,42,.12);background:#fff;color:#0f172a;border-radius:999px;padding:.48rem .76rem;font-weight:750;text-decoration:none;cursor:pointer}.mmir-active-node-actions .primary{background:#0f172a;color:#fff;border-color:#0f172a}\
      body.mmir-chat-ready #active-badge{color:#047857}\
      @media(max-width:640px){#mmir-active-nodes-bar{margin:.65rem 0;padding:.78rem}.mmir-active-node-grid{grid-template-columns:1fr}.mmir-active-node-actions>*{flex:1;justify-content:center;text-align:center}}\
    ';
    d.head.appendChild(style);
  }

  function ensureActiveNodesBar(){
    const composer=q('.mimir-composer');
    if(!composer)return null;
    let bar=q('#'+ACTIVE_BAR_ID);
    if(!bar){
      bar=d.createElement('section');
      bar.id=ACTIVE_BAR_ID;
      bar.setAttribute('aria-label','Active chat nodes');
      composer.parentNode.insertBefore(bar,composer);
    }
    return bar;
  }

  function repairPrimarySend(){
    const link=q('#primary-chat-link');
    if(!link)return;
    link.classList.remove('disabled');
    link.textContent=link.textContent&&link.textContent.trim()==='↑'?'↑':'Send';
    setAttr(link,'href',RUNTIME);
    setAttr(link,'role','button');
    setAttr(link,'aria-disabled','false');
    setAttr(link,'aria-label','Send prompt with active MMIR route');
    link.removeAttribute('target');
    link.removeAttribute('rel');
  }

  function updateHeroState(state){
    const badge=q('#active-badge');
    const title=q('#active-chat-title');
    const desc=q('#active-chat-description');
    const firstStatus=q('#first-impression-status');
    const firstDetail=q('#first-impression-detail');
    if(badge)badge.textContent='Active: '+state.title;
    if(title)title.textContent=state.title+' active - chat now.';
    if(desc)desc.textContent='Chat is ready immediately through '+state.trust+'. Local node upgrades automatically when available.';
    if(firstStatus)firstStatus.textContent=state.title+' is ready.';
    if(firstDetail)firstDetail.textContent=state.detail+' Selected model: '+state.model+'.';
    d.body.classList.add('mimir-chat-ready');
  }

  function renderActiveNodesBar(){
    installStyle();
    repairPrimarySend();
    const bar=ensureActiveNodesBar();
    if(!bar)return;
    const state=activeNodeState();
    updateHeroState(state);
    bar.dataset.state=state.kind;
    bar.innerHTML=''+
      '<div class="mmir-active-node-head">'+
        '<div class="mmir-active-node-title"><span>Active nodes</span><strong>'+safe(state.title)+' is connected to chat</strong><small>'+safe(state.detail)+'</small></div>'+
        '<div class="mmir-active-node-pill">'+safe(state.status)+'</div>'+
      '</div>'+
      '<div class="mmir-active-node-grid">'+
        '<div class="mmir-active-node-chip"><span>Active source</span><strong>'+safe(state.title)+'</strong></div>'+
        '<div class="mmir-active-node-chip"><span>Model</span><strong>'+safe(state.model)+'</strong></div>'+
        '<div class="mmir-active-node-chip"><span>Trust route</span><strong>'+safe(state.trust)+'</strong></div>'+
      '</div>'+
      '<div class="mmir-active-node-actions">'+
        '<button type="button" class="primary" data-active-node-send>Send first message</button>'+
        '<button type="button" data-active-node-refresh>Refresh nodes</button>'+
        '<a href="#local-connector" data-active-node-open-local>Install local node</a>'+
      '</div>';
    bar.querySelector('[data-active-node-send]')?.addEventListener('click',()=>sendPrompt('Start free chat. Tell me what active node is answering and what I can do next.'));
    bar.querySelector('[data-active-node-refresh]')?.addEventListener('click',()=>{q('#runtime-refresh')?.click();renderActiveNodesBar();});
    bar.querySelector('[data-active-node-open-local]')?.addEventListener('click',event=>{event.preventDefault();openTarget(LOCAL);});
  }

  function normalizeTarget(target){return target===CONNECT&&!q(CONNECT)?LOCAL:target;}
  function openElement(el){if(!el)return false;for(let x=el;x;x=x.parentElement?.closest?.('details'))if('open'in x)x.open=true;el.scrollIntoView({behavior:'smooth',block:'start'});return true;}
  function openTarget(target){
    const normalized=normalizeTarget(target);
    if((target===LOCAL||target===CONNECT||normalized===LOCAL)&&w.MimirBackendProfiles?.ensureFreeLocalProfile)w.MimirBackendProfiles.ensureFreeLocalProfile();
    const run=()=>openElement(q(target)||q(normalized));
    if(!run()&&w.MimirLoadDeferred)w.MimirLoadDeferred().then(run);
  }
  function focusChatTarget(){
    const prompt=q(PROMPT),runtime=q(RUNTIME);
    openElement(runtime||prompt);
    prompt&&prompt.focus({preventScroll:true});
    w.dispatchEvent(new CustomEvent('mmir-mobile-chat-target-opened',{detail:{target:runtime?RUNTIME:PROMPT}}));
  }
  function sendPrompt(value){
    const prompt=q(PROMPT);
    if(!prompt)return false;
    prompt.value=String(value||'').trim();
    prompt.dispatchEvent(new Event('input',{bubbles:true}));
    prompt.dispatchEvent(new Event('change',{bubbles:true}));
    focusChatTarget();
    repairPrimarySend();
    setTimeout(()=>q('#primary-chat-link')?.click(),40);
    return true;
  }

  function bindPrimaryAnchors(){
    qa('a[href="#mimir-chat-runtime"]').forEach(link=>{if(link.id!=='primary-chat-link')setAttr(link,'href',PROMPT);});
    qa('a[href="#connect-options"]').forEach(link=>{if(!q(CONNECT))setAttr(link,'href',LOCAL);});
    qa(ANCHORS).forEach(link=>link.dataset.runtimeAnchorBound='true');
  }
  function handleMobileTap(event){
    const promptAction=event.target.closest?.('[data-prompt-action]');
    if(promptAction&&promptAction.dataset.firstImpressionBound!=='true'){
      event.preventDefault();
      sendPrompt(promptAction.dataset.prompt||promptAction.textContent||'Help me get started with MMIR.');
      return;
    }
    const nodeAction=event.target.closest?.('#activation-chat-now,#activation-connect-local,#activation-open-models,#activation-open-node-dashboard');
    if(nodeAction&&nodeAction.dataset.firstImpressionBound!=='true'){
      event.preventDefault();
      if(nodeAction.id==='activation-chat-now')sendPrompt('Start free chat.');
      else openTarget(nodeAction.id==='activation-connect-local'?CONNECT:nodeAction.id==='activation-open-models'?'#model-library':'#node-dashboard');
      return;
    }
    const anchor=event.target.closest?.(ANCHORS);
    if(!anchor||anchor.id==='primary-chat-link')return;
    const target=anchor.getAttribute('href')||PROMPT;
    if(target[0]!=='#')return;
    event.preventDefault();
    if(target===PROMPT||target===RUNTIME)focusChatTarget();
    else openTarget(target);
  }
  function repairMobileFirstChatDom(){
    const center=q('.mimir-chat-center'),instant=q('#mimir-instant-start'),composer=q('.mimir-composer'),quick=q('.quick-suggestions');
    if(!center||!instant||!composer)return;
    if(instant.compareDocumentPosition(composer)&Node.DOCUMENT_POSITION_FOLLOWING)center.insertBefore(composer,instant);
    if(quick&&(instant.compareDocumentPosition(quick)&Node.DOCUMENT_POSITION_FOLLOWING))center.insertBefore(quick,instant);
    composer.dataset.mobileFirstChatReady='true';
  }
  function run(){
    repairPrimarySend();
    repairMobileFirstChatDom();
    bindPrimaryAnchors();
    renderActiveNodesBar();
  }
  d.readyState==='loading'?d.addEventListener('DOMContentLoaded',run):run();
  d.addEventListener('click',handleMobileTap,true);
  w.addEventListener('load',run,{once:true});
  w.addEventListener('mmir-backend-profiles-updated',run);
  w.addEventListener('mmir-local-connector-refreshed',run);
  w.addEventListener('mmir-chat-history-updated',run);
  w.addEventListener('focus',run);
  let checks=0;
  const timer=setInterval(()=>{run();if(++checks>=30)clearInterval(timer);},500);
})();
