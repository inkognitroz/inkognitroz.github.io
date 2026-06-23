(function(){
  const WORKSPACE_KEY='mimir-active-workspace-v1';
  const DEFAULT_WORKSPACE_ID='personal';
  const RECEIPT_PREFIX='mimir-answer-context-receipts-v1:';
  const HIGHLIGHT_PREFIX='mimir-answer-context-highlight-v1:';
  const MEMORY_USE_PREFIX='mimir-memory-use-v1:';

  function workspaceId(){return localStorage.getItem(WORKSPACE_KEY)||DEFAULT_WORKSPACE_ID;}
  function key(){return RECEIPT_PREFIX+workspaceId();}
  function highlightKey(){return HIGHLIGHT_PREFIX+workspaceId();}
  function memoryUseKey(){return MEMORY_USE_PREFIX+workspaceId();}
  function safe(value){return String(value||'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');}
  function selector(value){return window.CSS?.escape?CSS.escape(String(value||'')):String(value||'').replace(/[^a-zA-Z0-9_-]/g,'-');}
  function displayApi(){return window.MimirRouteDisplay||{};}
  function receipts(){
    try{
      const value=JSON.parse(localStorage.getItem(key())||'[]');
      return Array.isArray(value)?value.filter(item=>item?.message_id):[];
    }catch(error){
      return [];
    }
  }
  function normalize(raw){
    const memoryIds=Array.isArray(raw?.memory_use_ids)?raw.memory_use_ids.map(item=>String(item||'').slice(0,120)).filter(Boolean).slice(0,8):[];
    const memorySources=Array.isArray(raw?.memory_sources)?raw.memory_sources.map(item=>String(item||'').slice(0,40)).filter(Boolean).slice(0,4):[];
    const knowledgeIds=Array.isArray(raw?.knowledge_use_ids)?raw.knowledge_use_ids.map(item=>String(item||'').slice(0,120)).filter(Boolean).slice(0,12):[];
    const knowledgeSources=Array.isArray(raw?.knowledge_sources)?raw.knowledge_sources.map(item=>String(item||'').slice(0,80)).filter(Boolean).slice(0,6):[];
    return {
      object:'mmir.answer_context_receipt',
      version:1,
      workspace_id:workspaceId(),
      message_id:String(raw?.message_id||raw?.id||''),
      status:raw?.status==='failed'?'failed':'success',
      model:String(raw?.model||'').slice(0,160),
      route:String(raw?.route||'browser').slice(0,120),
      role_preset:String(raw?.role_preset||raw?.role||'').slice(0,80),
      memory:String(raw?.memory||'none').slice(0,40),
      knowledge:String(raw?.knowledge||'none').slice(0,40),
      history_messages:Math.max(0,Math.round(Number(raw?.history_messages||raw?.history)||0)),
      runtime_settings_used:Boolean(raw?.runtime_settings_used||raw?.runtime),
      mode_summary:String(raw?.mode_summary||raw?.modes||'').slice(0,120),
      cost_guard:String(raw?.cost_guard||raw?.cost||'free/local/default').slice(0,80),
      node_type:String(raw?.node_type||'').slice(0,60),
      trust_class:String(raw?.trust_class||'').slice(0,80),
      cost_class:String(raw?.cost_class||'').slice(0,80),
      quality_tier:String(raw?.quality_tier||'').slice(0,80),
      execution_boundary:String(raw?.execution_boundary||'').slice(0,120),
      privacy_boundary:String(raw?.privacy_boundary||'').slice(0,120),
      prompt_left_device:Boolean(raw?.prompt_left_device),
      provider_key_required:Boolean(raw?.provider_key_required),
      cloudflare_required:Boolean(raw?.cloudflare_required),
      install_required:Boolean(raw?.install_required),
      memory_use_ids:memoryIds,
      memory_use_count:Math.max(memoryIds.length,Math.round(Number(raw?.memory_use_count)||0)),
      memory_sources:memorySources,
      knowledge_use_ids:knowledgeIds,
      knowledge_use_count:Math.max(knowledgeIds.length,Math.round(Number(raw?.knowledge_use_count)||0)),
      knowledge_sources:knowledgeSources,
      created_at:new Date().toISOString(),
      local_only:true,
      no_paid_routes_started:raw?.no_paid_routes_started!==false&&raw?.noPaid!==false,
      provider_secrets_stored:false,
      raw_prompt_stored_in_receipt:false,
      raw_response_stored_in_receipt:false,
      public_frontend_secrets_allowed:false
    };
  }
  function memoryUseSummary(){
    try{
      const items=JSON.parse(localStorage.getItem(memoryUseKey())||'[]');
      const safeItems=Array.isArray(items)?items:[];
      const ids=safeItems.map(item=>String(item?.memoryId||'').slice(0,120)).filter(Boolean).slice(0,8);
      const sources=[...new Set(safeItems.map(item=>String(item?.source||'local')).filter(Boolean))].slice(0,4);
      return {memory_use_ids:ids,memory_use_count:safeItems.length,memory_sources:sources};
    }catch(error){
      return {memory_use_ids:[],memory_use_count:0,memory_sources:[]};
    }
  }
  function write(raw){
    const receipt=normalize(raw);
    if(!receipt.message_id)return null;
    try{
      const items=receipts();
      localStorage.setItem(key(),JSON.stringify([receipt].concat(items.filter(item=>item.message_id!==receipt.message_id)).slice(0,80)));
      window.dispatchEvent(new CustomEvent('mmir-answer-context-receipt-updated',{detail:receipt}));
    }catch(error){}
    renderOne(receipt);
    return receipt;
  }
  function status(value){return String(value||'none').replace('+',' + ');}
  function row(label,value){return '<dt>'+safe(label)+'</dt><dd>'+safe(value||'none')+'</dd>';}
  function routeLabel(receipt){
    const display=displayApi();
    if(display.receiptRouteLabel)return display.receiptRouteLabel(receipt,'Supergeni');
    return String(receipt?.route||'browser');
  }
  function trustLabel(receipt){
    const display=displayApi();
    if(display.receiptTrustLabel)return display.receiptTrustLabel(receipt);
    return 'policy required';
  }
  function summary(receipt){
    return 'Context: '+safe(routeLabel(receipt))+' · '+safe(trustLabel(receipt))+' · memory '+safe(status(receipt.memory))+' / knowledge '+safe(status(receipt.knowledge));
  }
  function writeHighlight(receipt,target){
    const highlight={object:'mmir.answer_context_highlight',version:1,workspace_id:workspaceId(),message_id:receipt.message_id,target,model:receipt.model,route:routeLabel(receipt),memory:receipt.memory,knowledge:receipt.knowledge,history_messages:receipt.history_messages,memory_use_ids:receipt.memory_use_ids||[],memory_use_count:receipt.memory_use_count||0,memory_sources:receipt.memory_sources||[],knowledge_use_ids:receipt.knowledge_use_ids||[],knowledge_use_count:receipt.knowledge_use_count||0,knowledge_sources:receipt.knowledge_sources||[],created_at:new Date().toISOString(),local_only:true,no_paid_routes_started:true,provider_secrets_stored:false,raw_prompt_stored_in_highlight:false,raw_response_stored_in_highlight:false};
    try{localStorage.setItem(highlightKey(),JSON.stringify(highlight));}catch(error){}
    window.dispatchEvent(new CustomEvent('mmir-answer-context-highlight-updated',{detail:highlight}));
    return highlight;
  }
  function renderHighlight(target,receipt){
    const el=document.querySelector(target);
    if(!el)return;
    el.dataset.receiptFilterMessage=receipt.message_id||'';
    el.dataset.receiptFilterModel=receipt.model||'';
    el.dataset.receiptFilterMemoryIds=(receipt.memory_use_ids||[]).join(',');
    el.dataset.receiptFilterKnowledgeIds=(receipt.knowledge_use_ids||[]).join(',');
    window.dispatchEvent(new CustomEvent('mmir-answer-context-source-filter',{detail:{target,message_id:receipt.message_id,model:receipt.model,memory_use_ids:receipt.memory_use_ids||[],memory_use_count:receipt.memory_use_count||0,memory_sources:receipt.memory_sources||[],knowledge:receipt.knowledge,knowledge_use_ids:receipt.knowledge_use_ids||[],knowledge_use_count:receipt.knowledge_use_count||0,knowledge_sources:receipt.knowledge_sources||[],no_paid_routes_started:true}}));
    el.querySelector('.runtime-answer-context-highlight')?.remove();
    const note=document.createElement('p');
    note.className='dashboard-note runtime-answer-context-highlight';
    note.dataset.state='ready';
    note.dataset.receiptHighlight=target;
    const memoryFilter=receipt.memory_use_count?(', memory matches '+receipt.memory_use_count+' '+((receipt.memory_sources||[]).join('/')||'local')):'';
    const knowledgeFilter=receipt.knowledge_use_count?(', knowledge matches '+receipt.knowledge_use_count+' '+((receipt.knowledge_sources||[]).join('/')||'local')):'';
    note.textContent='Receipt context: model '+(receipt.model||'none')+', route '+routeLabel(receipt)+', trust '+trustLabel(receipt)+', memory '+status(receipt.memory)+', knowledge '+status(receipt.knowledge)+memoryFilter+knowledgeFilter+'.';
    const summary=el.matches('details')?el.querySelector('summary'):null;
    if(summary)summary.after(note);
    else el.prepend(note);
  }
  function openReceiptTarget(target,receipt){
    const open=()=>{
      const el=document.querySelector(target);
      if(!el)return;
      let panel=el.closest('details');
      while(panel){panel.open=true;panel=panel.parentElement?.closest?.('details')||null;}
      writeHighlight(receipt,target);
      renderHighlight(target,receipt);
      el.scrollIntoView({behavior:'smooth',block:'start'});
      (el.querySelector?.('summary,button,input,select,textarea,a[href]')||el).focus?.({preventScroll:true});
    };
    if(!document.querySelector(target)&&window.MimirLoadDeferred)Promise.resolve(window.MimirLoadDeferred()).then(open);
    else open();
  }
  function actionButtons(){
    return '<div class="runtime-answer-context-actions" role="group" aria-label="Adjust answer context">'+
      '<button type="button" data-receipt-open="#memory-panel">Memory</button>'+
      '<button type="button" data-receipt-open="#knowledge-panel">Knowledge</button>'+
      '<button type="button" data-receipt-open="#model-library">Model</button>'+
      '<button type="button" data-receipt-open="#privacy-controls-panel">Privacy</button>'+
      '</div>';
  }
  function renderOne(receipt){
    if(!receipt?.message_id)return;
    const bubble=document.querySelector('[data-message-id="'+selector(receipt.message_id)+'"]');
    if(!bubble)return;
    const existing=bubble.querySelector('.runtime-answer-context-receipt');
    if(existing)existing.remove();
    const el=document.createElement('details');
    el.className='runtime-answer-context-receipt';
    el.dataset.messageId=receipt.message_id;
    el.innerHTML=
      '<summary>'+summary(receipt)+'</summary>'+
      '<dl>'+
      row('Model',receipt.model)+
      row('Route',routeLabel(receipt))+
      row('Trust',trustLabel(receipt))+
      row('Node type',receipt.node_type||'route-dependent')+
      row('Boundary',receipt.execution_boundary||receipt.privacy_boundary||'configured route')+
      row('Prompt left device',receipt.prompt_left_device?'yes':'no')+
      row('Role',receipt.role_preset||'none')+
      row('History',String(receipt.history_messages||0)+' messages')+
      row('Knowledge sources',receipt.knowledge_use_count?String(receipt.knowledge_use_count)+' metadata match(es)':'none')+
      row('Modes',receipt.mode_summary||'default')+
      row('Cost',receipt.no_paid_routes_started?'no paid route started':receipt.cost_guard||'user-configured route')+
      '</dl>'+
      actionButtons()+
      '<small>Local receipt only. No prompt, response or provider secret is stored in this receipt.</small>';
    el.querySelectorAll('[data-receipt-open]').forEach((button)=>{
      button.addEventListener('click',(event)=>{event.preventDefault();openReceiptTarget(button.getAttribute('data-receipt-open')||'#privacy-controls-panel',receipt);});
    });
    const note=bubble.querySelector('.runtime-message-action-status');
    if(note)note.before(el);
    else bubble.appendChild(el);
  }
  function renderAll(){receipts().forEach(renderOne);}
  function syncFromRuntime(){
    const bridge=window.MimirChatRuntimeBridge;
    const messages=typeof bridge?.messages==='function'?bridge.messages():[];
    const answers=Array.isArray(messages)?messages.filter(item=>item?.role==='assistant'&&item.content&&item.content!=='Thinking...'):[];
    if(!answers.length)return;
    const known=new Set(receipts().map(item=>item.message_id));
    const latest=answers[answers.length-1];
    answers.forEach((message)=>{
      if(known.has(message.id))return;
      const ctx=message.id===latest.id?(window.__MimirLastAnswerContext||{}):{};
      write({
        id:message.id,
        model:message.model||message.meta||'',
        route:message.meta||'browser',
        role:message.rolePreset||ctx.role_preset||'',
        memory:ctx.memory||'none',
        knowledge:ctx.knowledge||'none',
        history_messages:ctx.history_messages||0,
        runtime_settings_used:Boolean(ctx.runtime_settings_used),
        mode_summary:ctx.mode_summary||'',
        cost_guard:'free/local/default',
        node_type:ctx.node_type||'',
        trust_class:ctx.trust_class||'',
        cost_class:ctx.cost_class||'',
        quality_tier:ctx.quality_tier||'',
        execution_boundary:ctx.execution_boundary||'',
        privacy_boundary:ctx.privacy_boundary||'',
        prompt_left_device:ctx.prompt_left_device,
        provider_key_required:ctx.provider_key_required,
        cloudflare_required:ctx.cloudflare_required,
        install_required:ctx.install_required,
        ...memoryUseSummary(),
        knowledge_use_ids:ctx.knowledge_use_ids||[],
        knowledge_use_count:ctx.knowledge_use_count||0,
        knowledge_sources:ctx.knowledge_sources||[],
        no_paid_routes_started:true
      });
    });
  }
  function flushPending(){
    const pending=Array.isArray(window.__MimirAnswerContextReceipts)?window.__MimirAnswerContextReceipts:[];
    pending.forEach(write);
    window.__MimirAnswerContextReceipts=[];
  }

  window.addEventListener('mmir-answer-context-receipt-ready',(event)=>write(event.detail||{}));
  window.addEventListener('mmir-answer-context-receipt-updated',(event)=>renderOne(event.detail||{}));
  window.addEventListener('mmir-chat-history-updated',()=>window.setTimeout(()=>{syncFromRuntime();renderAll();},0));
  window.addEventListener('mmir-workspace-changed',()=>window.setTimeout(()=>{syncFromRuntime();renderAll();},0));
  window.addEventListener('storage',renderAll);
  window.MimirAnswerContextReceipts={write,renderAll,syncFromRuntime};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{flushPending();syncFromRuntime();renderAll();});
  else {flushPending();syncFromRuntime();renderAll();}
})();
