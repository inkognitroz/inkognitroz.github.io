(function(){
  const d=document;
  const w=window;
  const WORKSPACE_KEY='mimir-active-workspace-v1';
  const REPAIR_RESUME_PREFIX='mimir-repair-resume-v1:';
  let menu=null;
  let localState={status:'checking',models:[]};

  function q(selector){return d.querySelector(selector);}
  function escapeHtml(value){return String(value||'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');}
  function workspaceId(){return localStorage.getItem(WORKSPACE_KEY)||'personal';}
  function setFeedback(message,state){
    const feedback=q('#composer-action-feedback');
    if(feedback){
      feedback.dataset.state=state||'idle';
      feedback.textContent=message;
    }
  }
  function focusPrompt(clear){
    const prompt=q('#mimir-prompt');
    if(!prompt)return;
    if(clear){
      prompt.value='';
      prompt.dispatchEvent(new Event('input',{bubbles:true}));
    }
    prompt.focus({preventScroll:true});
    w.MimirAutosizeComposer?.();
  }
  function openPanel(target){
    const targetEl=q(target);
    if(targetEl){
      let details=targetEl;
      while(details){
        if('open' in details)details.open=true;
        details=details.parentElement?.closest?.('details')||null;
      }
      targetEl.scrollIntoView({block:'start',behavior:'smooth'});
    }
  }
  function openDeferredPanel(target){
    if(q(target)){
      openPanel(target);
      return;
    }
    if(w.MimirLoadDeferred){
      w.MimirLoadDeferred().then(()=>openPanel(target));
      return;
    }
    openPanel(target);
  }
  function writeRepairResume(overrides={}){
    const source=String(overrides.source||'composer-quick-actions');
    const params=new URLSearchParams({source});
    if(overrides.starter_id)params.set('starter',overrides.starter_id);
    if(overrides.model)params.set('model',overrides.model);
    const defaultTarget='./downloads/mmir-local-connector-install.html?source=composer-quick-actions';
    const target=source==='composer-quick-actions'&&!overrides.starter_id&&!overrides.model?defaultTarget:'./downloads/mmir-local-connector-install.html?'+params.toString();
    const resume={
      source,
      action:overrides.action||'install-local-node',
      status:'pending',
      target,
      starter_id:overrides.starter_id||'',
      model:overrides.model||'',
      next_action:overrides.next_action||'installer-download',
      at:new Date().toISOString(),
      no_paid_routes_started:true,
      provider_secrets_stored:false,
      raw_prompt_stored:false,
      raw_response_stored:false
    };
    try{localStorage.setItem(REPAIR_RESUME_PREFIX+workspaceId(),JSON.stringify(resume));}catch(error){}
    w.dispatchEvent(new CustomEvent('mmir-repair-resume-started',{detail:resume}));
    return target;
  }
  function selectedModelLabel(){
    const select=q('#runtime-model');
    const label=String(select?.selectedOptions?.[0]?.textContent||q('#runtime-model-chip')?.textContent||'Supergenious').trim();
    return label.replace(/\s+-\s+(live|ready now|browser helper|active in browser|hosted free model).*$/i,'').replace(/MMIR Guide|MMIR Supergenius|Supergeni(?:us|ous)/gi,'Supergenious').slice(0,52)||'Supergenious';
  }
  function resourceSummary(){
    const value=String(q('#runtime-resource-chip')?.textContent||'Free browser route').trim();
    return value.replace(/\s+/g,' ').slice(0,48)||'Free browser route';
  }
  function webGpuReady(){return Boolean(w.isSecureContext&&w.navigator?.gpu);}
  function webGpuLabel(){
    return webGpuReady()?'Browser LLM ready':'Browser LLM option';
  }
  function localModel(){return (localState.models||[]).map(model=>String(model?.id||model?.name||model?.model||'').trim()).find(Boolean)||'';}
  function localReady(){return Boolean(localModel())&&!/^(off|err|block)/i.test(localState.status||'');}
  function renderRouteStrip(){
    const lm=localModel();
    return '<div class="composer-quick-route-strip" aria-label="Free chat routes">'+
      '<button type="button" class="composer-quick-route" data-composer-quick-route="guide" data-route-state="ready"><span>Supergenious</span><small>Free now</small></button>'+
      '<button type="button" class="composer-quick-route" data-composer-quick-route="webgpu" data-route-state="'+(webGpuReady()?'ready':'setup')+'"><span>'+webGpuLabel()+'</span><small>Qwen WebGPU</small></button>'+
      '<button type="button" class="composer-quick-route" data-composer-quick-route="local" data-route-state="'+(localReady()?'ready':'install')+'"><span>'+(localReady()?'Local ready':'Install local')+'</span><small>'+escapeHtml(lm||'Qwen3 0.6B')+'</small></button>'+
    '</div>';
  }
  function renderMenuContent(){
    const model=selectedModelLabel();
    const resource=resourceSummary();
    return ''+
      '<div class="composer-quick-status" role="status" aria-live="polite">'+
        '<strong>Ready now</strong><span>'+escapeHtml(model)+' / '+escapeHtml(resource)+' / no paid route</span>'+
      '</div>'+
      renderRouteStrip()+
      '<button type="button" role="menuitem" class="composer-quick-primary" data-composer-quick-action="chat-now"><span>Chat now</span><small>Start with the safest free route</small></button>'+
      '<button type="button" role="menuitem" data-composer-quick-action="models"><span>Models</span><small>Free, live and local routes</small></button>'+
      '<button type="button" role="menuitem" data-composer-quick-action="install-node"><span>Install node</span><small>Mac, Windows, Linux or Pi</small></button>'+
      '<button type="button" role="menuitem" data-composer-quick-action="knowledge"><span>Knowledge</span><small>Add files or sources locally</small></button>'+
      '<button type="button" role="menuitem" data-composer-quick-action="new-chat"><span>New chat</span><small>Reset local conversation</small></button>'+
      '<button type="button" role="menuitem" data-composer-quick-action="voice"><span>Voice</span><small>Browser-local speech tools</small></button>'+
      '<button type="button" role="menuitem" data-composer-quick-action="settings"><span>Settings</span><small>Temperature and context</small></button>';
  }
  function ensureMenu(){
    if(menu)return menu;
    const form=q('.mimir-composer');
    if(!form)return null;
    menu=d.createElement('div');
    menu.id='composer-quick-actions';
    menu.className='composer-quick-actions';
    menu.hidden=true;
    menu.setAttribute('role','menu');
    menu.setAttribute('aria-label','Composer quick actions');
    menu.innerHTML=renderMenuContent();
    const dock=q('#composer-mode-dock');
    if(dock&&dock.nextSibling)form.insertBefore(menu,dock.nextSibling);
    else if(dock)form.appendChild(menu);
    else form.insertBefore(menu,form.querySelector('.composer-bar')||null);
    menu.addEventListener('click',(event)=>{
      const action=event.target?.closest?.('[data-composer-quick-action]')?.getAttribute('data-composer-quick-action');
      const route=event.target?.closest?.('[data-composer-quick-route]')?.getAttribute('data-composer-quick-route');
      if(action)runQuickAction(action);
      else if(route)runQuickRoute(route);
    });
    return menu;
  }
  function setExpanded(open){
    const plus=q('#composer-add-model');
    if(!plus)return;
    plus.setAttribute('aria-expanded',String(open));
    plus.setAttribute('aria-controls','composer-quick-actions composer-model-picker');
    plus.setAttribute('aria-label','Open chat tools');
    plus.setAttribute('title','Open chat tools');
  }
  function closeMenu(refocus){
    const el=ensureMenu();
    if(!el)return;
    el.hidden=true;
    setExpanded(false);
    if(refocus)focusPrompt(false);
  }
  function toggleMenu(force){
    const el=ensureMenu();
    if(!el)return;
    const open=typeof force==='boolean'?force:el.hidden;
    el.hidden=!open;
    setExpanded(open);
    if(open){
      el.innerHTML=renderMenuContent();
      w.MimirComposerModelPicker?.close?.();
      setFeedback('Tools opened. Chat now uses the safest free route; setup stays optional.','ready');
      if(!(w.matchMedia&&w.matchMedia('(pointer: coarse)').matches)){
        setTimeout(()=>el.querySelector('[data-composer-quick-action]')?.focus({preventScroll:true}),0);
      }
    }
  }
  function openModels(){
    closeMenu(false);
    if(w.MimirComposerModelPicker?.open){w.MimirComposerModelPicker.open();}
    else if(w.MimirChatRuntimeBridge?.openModelPicker){w.MimirChatRuntimeBridge.openModelPicker();}
    else openDeferredPanel('#model-library');
    setFeedback('Model picker opened from tools. Free/browser/local routes stay first.','ready');
  }
  function newChat(){
    closeMenu(false);
    const busy=q('#runtime-stop')&&!q('#runtime-stop').disabled;
    if(busy){
      setFeedback('Stop the current answer before starting a new chat.','error');
      return;
    }
    const composerNew=q('#composer-new-chat');
    if(composerNew){composerNew.click();return;}
    q('#runtime-clear')?.click();
    focusPrompt(true);
    setFeedback('New local chat ready. Free guide/model routes stay available.','ready');
  }
  function chatNow(){
    closeMenu(false);
    const prompt=q('#mimir-prompt');
    if(prompt&&!String(prompt.value||'').trim()){
      prompt.value='Start the safest free MMIR chat now. Explain what is active and one useful next action.';
      prompt.dispatchEvent(new Event('input',{bubbles:true}));
      prompt.dispatchEvent(new Event('change',{bubbles:true}));
    }
    setFeedback('Starting chat with the safest free route.','ready');
    setTimeout(()=>q('#primary-chat-link')?.click(),80);
  }
  function startStarterRoute(starterId,promptText,feedback){
    closeMenu(false);
    const prompt=q('#mimir-prompt');
    if(prompt&&!String(prompt.value||'').trim()){
      prompt.value=promptText;
      prompt.dispatchEvent(new Event('input',{bubbles:true}));
      prompt.dispatchEvent(new Event('change',{bubbles:true}));
    }
    w.dispatchEvent(new CustomEvent('mmir-runtime-starter-handoff',{detail:{starter_id:starterId,action:'select',source:'composer-quick-route-strip',free:true,no_paid_routes_started:true}}));
    setFeedback(feedback,'ready');
    setTimeout(()=>q('#primary-chat-link')?.click(),140);
  }
  function startLocalRoute(){
    if(localReady()){
      closeMenu(false);
      const model=localModel();
      const prompt=q('#mimir-prompt');
      if(prompt&&!String(prompt.value||'').trim()){
        prompt.value='Answer from '+model+'.';
        prompt.dispatchEvent(new Event('input',{bubbles:true}));
        prompt.dispatchEvent(new Event('change',{bubbles:true}));
      }
      const bridge=w.MimirChatRuntimeBridge;
      setFeedback('Starting private local chat with '+model+'.','ready');
      if(bridge?.refresh&&bridge?.send){bridge.setStatus?.('Starting '+model+'...','loading');bridge.refresh().then(()=>bridge.send());}
      else setTimeout(()=>q('#primary-chat-link')?.click(),80);
      return;
    }
    closeMenu(false);
    const target=writeRepairResume({
      source:'composer-quick-route-strip',
      action:'starter-install-repair',
      starter_id:'ollama-qwen3-06b',
      model:'qwen3:0.6b',
      next_action:'installer-download'
    });
    setFeedback('Opening free Local Node installer for Qwen3 0.6B. No paid route starts.','ready');
    w.location.href=target;
  }
  function runQuickRoute(route){
    if(route==='guide'){
      startStarterRoute('mmir-supergenius','Start free chat with Supergenious. Tell me what is active and one useful next action.','Starting Supergenious chat.');
      return;
    }
    if(route==='webgpu'){
      startStarterRoute('webllm-qwen25-05b','Start a free browser WebGPU chat with Qwen2.5 0.5B. If WebGPU is unavailable, explain the safest fallback.','Starting free Browser LLM route.');
      return;
    }
    if(route==='local')startLocalRoute();
  }
  function runQuickAction(action){
    if(action==='chat-now'){
      chatNow();
      return;
    }
    if(action==='models'){
      openModels();
      return;
    }
    if(action==='install-node'){
      closeMenu(false);
      const target=writeRepairResume();
      setFeedback('Opening free local node installer. No paid route starts.','ready');
      w.location.href=target;
      return;
    }
    if(action==='knowledge'){
      closeMenu(false);
      openDeferredPanel('#knowledge-panel');
      setFeedback('Knowledge opened. Files stay local unless a protected backend is selected.','ready');
      return;
    }
    if(action==='new-chat'){
      newChat();
      return;
    }
    if(action==='voice'){
      closeMenu(false);
      const voice=q('#composer-voice-input');
      if(voice)voice.click();else openDeferredPanel('#voice-controls');
      return;
    }
    if(action==='settings'){
      closeMenu(false);
      openDeferredPanel('#runtime-settings-panel');
      setFeedback('Runtime settings opened. Changes apply locally to the next message.','ready');
    }
  }
  function bind(){
    const plus=q('#composer-add-model');
    if(!plus)return false;
    setExpanded(false);
    ensureMenu();
    return true;
  }

  d.addEventListener('click',(event)=>{
    const trigger=event.target?.closest?.('#composer-add-model');
    if(!trigger)return;
    event.preventDefault();
    event.stopImmediatePropagation();
    event.stopPropagation();
    toggleMenu();
  },true);
  d.addEventListener('pointerdown',(event)=>{
    if(!menu||menu.hidden)return;
    if(menu.contains(event.target)||event.target?.closest?.('#composer-add-model'))return;
    closeMenu(false);
  },true);
  d.addEventListener('keydown',(event)=>{
    if(event.key!=='Escape'||!menu||menu.hidden)return;
    event.preventDefault();
    closeMenu(true);
  },true);

  if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
  let tries=0;
  const timer=setInterval(()=>{if(bind()||++tries>24)clearInterval(timer);},250);
  w.addEventListener('mmir-local-connector-refreshed',(event)=>{
    const detail=event?.detail||{};
    const models=Array.isArray(detail.models)?detail.models:[];
    localState={status:detail.status||detail.health||(models.length?'ready':localState.status),models};
    if(menu&&!menu.hidden)menu.innerHTML=renderMenuContent();
  });
  w.MimirComposerQuickActions={open:()=>toggleMenu(true),close:()=>closeMenu(false),toggle:()=>toggleMenu(),run:runQuickAction};
})();
