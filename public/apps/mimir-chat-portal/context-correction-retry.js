(function(){
  const WORKSPACE_KEY='mimir-active-workspace-v1';
  const DEFAULT_WORKSPACE_ID='personal';
  const CORRECTION_PREFIX='mimir-context-corrections-v1:';
  const RETRY_PREFIX='mimir-context-correction-retry-v1:';

  function bridge(){return window.MimirChatRuntimeBridge||null;}
  function workspaceId(){return bridge()?.workspaceId?.()||localStorage.getItem(WORKSPACE_KEY)||DEFAULT_WORKSPACE_ID;}
  function correctionKey(){return CORRECTION_PREFIX+workspaceId();}
  function retryKey(){return RETRY_PREFIX+workspaceId();}
  function safeId(value){return window.CSS?.escape?CSS.escape(String(value||'')):String(value||'').replace(/[^a-zA-Z0-9_-]/g,'-');}
  function readJson(key,fallback){
    try{
      const value=JSON.parse(localStorage.getItem(key)||'null');
      return value ?? fallback;
    }catch(error){return fallback;}
  }
  function readCorrections(){
    const items=readJson(correctionKey(),[]);
    return Array.isArray(items)?items.filter(item=>item?.id&&!item.undone_at).slice(0,20):[];
  }
  function readRetry(){const value=readJson(retryKey(),null);return value&&value.object==='mmir.corrected_context_retry'?value:null;}
  function writeRetry(value){
    try{
      localStorage.setItem(retryKey(),JSON.stringify(value));
      window.dispatchEvent(new CustomEvent('mmir-context-correction-retry-updated',{detail:value}));
    }catch(error){}
  }
  function messages(){const source=bridge()?.messages?.();return Array.isArray(source)?source:[];}
  function visiblePromptBefore(message){
    const source=messages();
    const index=source.findIndex(item=>item.id===message.id);
    const prior=(index>=0?source.slice(0,index):source).reverse().find(item=>item.role==='user'&&String(item.content||'').trim());
    return String(prior?.content||'').trim();
  }
  function correctionFor(message){
    const created=Date.parse(message.createdAt||'')||0;
    return readCorrections().find(item=>
      (item.action==='disable-source'||(Array.isArray(item.undo)&&item.undo.length))&&
      (item.message_id===message.id||(!item.message_id&&(!created||Date.parse(item.created_at||'')>=created)))
    )||null;
  }
  function retryReceipt(message,correction,prompt){
    return {
      object:'mmir.corrected_context_retry',
      version:1,
      workspace_id:workspaceId(),
      source_message_id:String(message.id||''),
      correction_id:String(correction.id||''),
      correction_target:String(correction.target||'context').slice(0,40),
      correction_action:String(correction.action||'correction').slice(0,60),
      source_count:Math.max(0,Math.round(Number(correction.source_count)||0)),
      prompt_chars:prompt.length,
      started_at:new Date().toISOString(),
      local_only:true,
      no_paid_routes_started:true,
      raw_prompt_stored:false,
      raw_response_stored:false,
      provider_secrets_stored:false
    };
  }
  function setActionStatus(message,text,state){
    bridge()?.setMessageActionStatus?.(message.id,text,state||'idle');
    bridge()?.setStatus?.(text,state||'idle');
  }
  function retry(message,correction){
    const prompt=visiblePromptBefore(message);
    if(!prompt){setActionStatus(message,'No visible user message is available to retry.','error');return;}
    const receipt=retryReceipt(message,correction,prompt);
    writeRetry(receipt);
    const promptEl=document.getElementById('mimir-prompt');
    if(promptEl){
      promptEl.value=prompt;
      promptEl.dispatchEvent(new Event('input',{bubbles:true}));
    }
    bridge()?.recordAction?.('retry-corrected',message,{correction_id:receipt.correction_id,correction_target:receipt.correction_target,prompt_chars:receipt.prompt_chars,raw_prompt_stored:false,raw_response_stored:false});
    setActionStatus(message,'Retrying with corrected context from visible chat state.','loading');
    window.setTimeout(()=>document.getElementById('primary-chat-link')?.click(),40);
  }
  function annotateAnswer(){
    const receipt=readRetry();
    if(!receipt||receipt.answer_message_id)return receipt;
    const started=Date.parse(receipt.started_at||'')||0;
    const answer=messages().filter(item=>item.role==='assistant'&&item.id!==receipt.source_message_id&&item.content&&item.content!=='Thinking...'&&(Date.parse(item.createdAt||'')||0)>=started).pop();
    if(!answer)return receipt;
    const next={...receipt,answer_message_id:answer.id,completed_at:new Date().toISOString()};
    writeRetry(next);
    return next;
  }
  function renderBadge(receipt){
    document.querySelectorAll('.context-correction-retry-badge').forEach(node=>node.remove());
    if(!receipt?.answer_message_id)return;
    const bubble=document.querySelector('[data-message-id="'+safeId(receipt.answer_message_id)+'"]');
    if(!bubble)return;
    const badge=document.createElement('small');
    badge.className='context-correction-retry-badge';
    badge.textContent='Retried after '+(receipt.correction_target||'context')+' correction. No hidden prompt was stored.';
    bubble.appendChild(badge);
  }
  function render(){
    const current=annotateAnswer()||readRetry();
    const source=messages().filter(item=>item.role==='assistant'&&item.content&&item.content!=='Thinking...');
    source.forEach(message=>{
      const bubble=document.querySelector('[data-message-id="'+safeId(message.id)+'"]');
      const actions=bubble?.querySelector('.runtime-message-actions');
      if(!actions)return;
      let button=actions.querySelector('[data-message-action="retry-corrected"]');
      const correction=correctionFor(message);
      if(!correction){
        button?.remove();
        return;
      }
      if(!button){
        button=document.createElement('button');
        button.type='button';
        button.dataset.messageAction='retry-corrected';
        button.textContent='Retry fixed';
        button.setAttribute('aria-label','Retry after context correction');
        actions.insertBefore(button,actions.querySelector('[data-message-action="next-step"]')||null);
      }
      button.onclick=()=>retry(message,correction);
    });
    renderBadge(current);
  }

  window.addEventListener('mmir-chat-history-updated',()=>window.setTimeout(render,0));
  window.addEventListener('mmir-context-corrections-updated',()=>window.setTimeout(render,0));
  window.addEventListener('mmir-context-correction-retry-updated',()=>window.setTimeout(render,0));
  window.addEventListener('storage',()=>window.setTimeout(render,0));
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',render);else render();
})();
