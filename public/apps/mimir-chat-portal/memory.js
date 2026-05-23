(function(){
  const api=window.MimirApiClient;
  const ACTIVE_WORKSPACE_KEY='mimir-active-workspace-v1';
  const DEFAULT_WORKSPACE_ID='personal';
  const MEMORY_PREFIX='mimir-memory-v1:';
  const MEMORY_USE_PREFIX='mimir-memory-use-v1:';
  const HIGHLIGHT_PREFIX='mimir-answer-context-highlight-v1:';
  const CORRECTION_PREFIX='mimir-context-corrections-v1:';
  const MAX_LOCAL_ITEMS=20;
  const MAX_IMPORT_LINES=12;
  const host=document.querySelector('#multi-model-workspace .mimir-dashboard');
  let listEl=null;
  let inputEl=null;
  let typeEl=null;
  let scopeEl=null;
  let tagsEl=null;
  let expiresEl=null;
  let notesEl=null;
  let importEl=null;
  let usedEl=null;
  let statusEl=null;
  let receiptFilterEl=null;
  let receiptActionsEl=null;
  let correctionTrailEl=null;
  let editingId='';
  let receiptEventFilter=null;

  if(!host)return;

  const types=['preference','project','workflow','identity','instruction','note'];
  const scopes=['workspace','project','chat','session','private'];

  function workspaceId(){return localStorage.getItem(ACTIVE_WORKSPACE_KEY)||DEFAULT_WORKSPACE_ID;}
  function key(){return MEMORY_PREFIX+workspaceId();}
  function useKey(){return MEMORY_USE_PREFIX+workspaceId();}
  function highlightKey(){return HIGHLIGHT_PREFIX+workspaceId();}
  function correctionKey(){return CORRECTION_PREFIX+workspaceId();}
  function clean(value,max=1000){return String(value||'').trim().slice(0,max);}
  function cleanType(value){
    const type=clean(value,48).toLowerCase();
    return types.includes(type)?type:'note';
  }
  function cleanScope(value){
    const scope=clean(value,48).toLowerCase();
    return scopes.includes(scope)?scope:'workspace';
  }
  function cleanTags(value){
    const source=Array.isArray(value)?value:String(value||'').split(',');
    const seen=new Set();
    return source.map(item=>clean(item,40).toLowerCase()).filter(item=>{
      if(!item||seen.has(item))return false;
      seen.add(item);
      return true;
    }).slice(0,12);
  }
  function cleanExpiresAt(value){
    const raw=String(value||'').trim();
    if(!raw)return '';
    const date=new Date(/^\d{4}-\d{2}-\d{2}$/.test(raw)?raw+'T23:59:59.999Z':raw);
    return Number.isNaN(date.getTime())?'':date.toISOString();
  }
  function dateInputValue(value){
    const raw=cleanExpiresAt(value);
    return raw?raw.slice(0,10):'';
  }
  function isExpired(item){
    const expiresAt=cleanExpiresAt(item?.expiresAt||item?.expires_at);
    return Boolean(expiresAt&&Date.parse(expiresAt)<=Date.now());
  }

  function normalize(item){
    if(!item||!item.id||!item.text)return null;
    const normalized={
      id:String(item.id),
      backendId:String(item.backendId||item.backend_id||''),
      text:clean(item.text,1000),
      type:cleanType(item.type),
      scope:cleanScope(item.scope),
      tags:cleanTags(item.tags),
      expiresAt:cleanExpiresAt(item.expiresAt||item.expires_at),
      notes:clean(item.notes||item.review_note,1000),
      enabled:item.enabled!==false,
      createdAt:item.createdAt||item.created_at||new Date().toISOString(),
      updatedAt:item.updatedAt||item.updated_at||item.createdAt||item.created_at||new Date().toISOString(),
      syncState:item.syncState||item.sync_state||'local',
      syncError:item.syncError||''
    };
    normalized.expired=Boolean(item.expired)||isExpired(normalized);
    return normalized;
  }

  function readMemory(){
    try{
      const value=JSON.parse(localStorage.getItem(key())||'[]');
      return Array.isArray(value)?value.map(normalize).filter(Boolean).slice(-MAX_LOCAL_ITEMS):[];
    }catch(error){return [];}
  }

  function readMemoryUse(){
    try{
      const value=JSON.parse(localStorage.getItem(useKey())||'[]');
      return Array.isArray(value)?value.map(item=>({
        memoryId:String(item.memoryId||item.memory_id||''),
        source:clean(item.source||'local',40),
        type:cleanType(item.type),
        scope:cleanScope(item.scope),
        text:clean(item.text,240),
        reason:clean(item.reason||'',240),
        matchedTerms:cleanTags(item.matchedTerms||item.matched_terms),
        usedAt:clean(item.usedAt||item.used_at,64)
      })).filter(item=>item.text).slice(0,8):[];
    }catch(error){return [];}
  }

  function cleanIds(value){
    const source=Array.isArray(value)?value:String(value||'').split(',');
    const seen=new Set();
    return source.map(item=>clean(item,120)).filter(item=>{
      if(!item||seen.has(item))return false;
      seen.add(item);
      return true;
    }).slice(0,16);
  }

  function readReceiptHighlight(){
    try{
      const value=JSON.parse(localStorage.getItem(highlightKey())||'null');
      return value&&value.target==='#memory-panel'?value:null;
    }catch(error){return null;}
  }

  function rememberReceiptFilter(detail){
    if(!detail||detail.target!=='#memory-panel')return;
    receiptEventFilter={
      target:'#memory-panel',
      message_id:clean(detail.message_id,120),
      model:clean(detail.model,160),
      memory_use_ids:cleanIds(detail.memory_use_ids),
      memory_use_count:Math.max(0,Math.round(Number(detail.memory_use_count)||0)),
      memory_sources:cleanTags(detail.memory_sources||[])
    };
  }

  function activeReceiptFilter(){
    const panel=document.getElementById('memory-panel');
    const highlight=readReceiptHighlight()||{};
    const source=receiptEventFilter||{};
    const ids=cleanIds(panel?.dataset.receiptFilterMemoryIds||source.memory_use_ids||highlight.memory_use_ids||[]);
    const count=Math.max(ids.length,Math.round(Number(source.memory_use_count||highlight.memory_use_count)||0));
    const messageId=clean(panel?.dataset.receiptFilterMessage||source.message_id||highlight.message_id,120);
    const model=clean(panel?.dataset.receiptFilterModel||source.model||highlight.model,160);
    const sources=cleanTags(source.memory_sources||highlight.memory_sources||[]);
    return {
      active:Boolean(messageId||ids.length||count||highlight.target==='#memory-panel'||source.target==='#memory-panel'),
      messageId,
      model,
      ids,
      idSet:new Set(ids),
      count,
      sources
    };
  }

  function matchesReceiptFilter(item,filter){
    if(!filter?.ids?.length)return false;
    return [item?.id,item?.backendId,item?.memoryId].some(value=>filter.idSet.has(String(value||'')));
  }

  function receiptMatches(items,filter){
    const active=filter||activeReceiptFilter();
    return (Array.isArray(items)?items:readMemory()).filter(item=>matchesReceiptFilter(item,active));
  }

  function saveMemory(items){
    localStorage.setItem(key(),JSON.stringify(items.map(normalize).filter(Boolean).slice(-MAX_LOCAL_ITEMS)));
    window.dispatchEvent(new CustomEvent('mmir-memory-updated',{detail:{workspaceId:workspaceId()}}));
  }

  function setStatus(message,state){
    if(statusEl){
      statusEl.textContent=message||'';
      statusEl.dataset.state=state||'idle';
    }
  }

  function readCorrections(){
    try{
      const value=JSON.parse(localStorage.getItem(correctionKey())||'[]');
      return Array.isArray(value)?value.filter(item=>item?.id).slice(0,40):[];
    }catch(error){return [];}
  }

  function saveCorrections(items){
    try{
      localStorage.setItem(correctionKey(),JSON.stringify((Array.isArray(items)?items:[]).slice(0,40)));
      window.dispatchEvent(new CustomEvent('mmir-context-corrections-updated',{detail:{workspaceId:workspaceId()}}));
    }catch(error){}
  }

  function correctionEntry(filter,action,count,undo=[]){
    return {
      id:String(Date.now())+'-'+Math.random().toString(16).slice(2),
      target:'memory',
      action,
      message_id:clean(filter?.messageId,120),
      model:clean(filter?.model,160),
      source_ids:(filter?.ids||[]).slice(0,16),
      source_count:Math.max(0,Math.round(Number(count)||0)),
      undo:Array.isArray(undo)?undo.slice(0,20):[],
      created_at:new Date().toISOString(),
      local_only:true,
      raw_prompt_stored:false,
      raw_response_stored:false,
      provider_secrets_stored:false,
      no_paid_routes_started:true
    };
  }

  function recordCorrection(entry){
    saveCorrections([entry].concat(readCorrections().filter(item=>item.id!==entry.id)));
    renderCorrectionTrail();
  }

  function latestUndoableCorrection(){
    return readCorrections().find(item=>item.target==='memory'&&!item.undone_at&&Array.isArray(item.undo)&&item.undo.some(change=>change.kind==='memory-item'))||null;
  }

  function markCorrectionUndone(id){
    saveCorrections(readCorrections().map(item=>item.id===id?{...item,undone_at:new Date().toISOString()}:item));
  }

  function undoLatestCorrection(){
    const entry=latestUndoableCorrection();
    if(!entry){setStatus('No memory correction is available to undo.','idle');return;}
    const restore=new Map(entry.undo.filter(change=>change.kind==='memory-item'&&change.id).map(change=>[String(change.id),change]));
    let changed=0;
    const next=readMemory().map(item=>{
      const change=restore.get(String(item.id));
      if(!change)return item;
      changed+=1;
      return {...item,enabled:change.enabled!==false,updatedAt:new Date().toISOString(),syncState:'local',syncError:''};
    });
    saveMemory(next);
    markCorrectionUndone(entry.id);
    render();
    setStatus(changed?('Undid '+String(changed)+' memory correction(s) locally. Sync when ready.'):('Nothing changed; the original memory item is no longer present.'),changed?'ready':'idle');
  }

  function renderCorrectionTrail(){
    if(!correctionTrailEl)return;
    const items=readCorrections().filter(item=>item.target==='memory').slice(0,3);
    correctionTrailEl.hidden=!items.length;
    correctionTrailEl.innerHTML='';
    items.forEach(item=>{
      const row=document.createElement('p');
      row.dataset.state=item.undone_at?'undone':'ready';
      const count=item.source_count?(' - '+String(item.source_count)+' source(s)'):'';
      row.textContent=(item.undone_at?'Undone: ':'Logged: ')+String(item.action||'correction')+count+' - '+new Date(item.created_at||Date.now()).toLocaleString();
      correctionTrailEl.appendChild(row);
    });
  }

  function clearReceiptDataset(){
    const panel=document.getElementById('memory-panel');
    if(!panel)return;
    delete panel.dataset.receiptFilterMessage;
    delete panel.dataset.receiptFilterModel;
    delete panel.dataset.receiptFilterMemoryIds;
  }

  function clearReceiptFilter(){
    const filter=activeReceiptFilter();
    receiptEventFilter=null;
    clearReceiptDataset();
    try{
      const highlight=readReceiptHighlight();
      if(highlight?.target==='#memory-panel')localStorage.removeItem(highlightKey());
    }catch(error){}
    if(filter.active)recordCorrection(correctionEntry(filter,'clear-focus',filter.count,[]));
    document.querySelector('#memory-panel .runtime-answer-context-highlight')?.remove();
    render();
    setStatus('Receipt source focus cleared.','ready');
    window.dispatchEvent(new CustomEvent('mmir-answer-context-source-filter-cleared',{detail:{target:'#memory-panel'}}));
  }

  function focusReceiptMatch(){
    const target=document.querySelector('.memory-item[data-receipt-match="true"], .memory-used-item[data-receipt-match="true"]');
    if(!target){setStatus('No matching memory source is available in this workspace.','error');return;}
    target.scrollIntoView({behavior:'smooth',block:'center'});
    (target.querySelector('button,input,textarea,select')||target).focus?.({preventScroll:true});
    setStatus('Focused the memory source used by the selected answer.','ready');
  }

  function editReceiptMatch(){
    const match=receiptMatches(readMemory(),activeReceiptFilter()).find(item=>item.enabled!==false)||receiptMatches(readMemory(),activeReceiptFilter())[0];
    if(!match){focusReceiptMatch();return;}
    editingId=match.id;
    applyForm(match);
    inputEl?.scrollIntoView({behavior:'smooth',block:'center'});
    inputEl?.focus({preventScroll:true});
    setStatus('Editing the memory source used by the selected answer. Save to update it.','idle');
  }

  function disableReceiptMatches(){
    const filter=activeReceiptFilter();
    const items=readMemory();
    const ids=new Set(receiptMatches(items,filter).map(item=>item.id));
    if(!ids.size){setStatus('No matching memory source can be disabled from this receipt.','error');return;}
    let changed=0;
    const undo=[];
    const next=items.map(item=>{
      if(!ids.has(item.id)||item.enabled===false)return item;
      changed+=1;
      undo.push({kind:'memory-item',id:item.id,enabled:item.enabled!==false});
      return {...item,enabled:false,updatedAt:new Date().toISOString(),syncState:'local',syncError:''};
    });
    saveMemory(next);
    if(changed)recordCorrection(correctionEntry(filter,'disable-source',changed,undo));
    render();
    setStatus(changed?('Disabled '+String(changed)+' receipt-focused memory item(s) locally. Sync when ready.'):('Receipt-focused memory was already disabled.'),changed?'ready':'idle');
  }

  function renderReceiptActions(filter,items){
    if(!receiptActionsEl)return;
    const active=filter||activeReceiptFilter();
    const matches=receiptMatches(Array.isArray(items)?items:readMemory(),active);
    const undoable=latestUndoableCorrection();
    receiptActionsEl.hidden=!active.active&&!undoable;
    receiptActionsEl.innerHTML='';
    if(!active.active&&!undoable){renderCorrectionTrail();return;}
    const actions=active.active?[
      {id:'review',label:'Review source',run:focusReceiptMatch,disabled:!matches.length},
      {id:'edit',label:'Edit memory',run:editReceiptMatch,disabled:!matches.length},
      {id:'disable',label:'Disable match',run:disableReceiptMatches,disabled:!matches.some(item=>item.enabled!==false)},
      {id:'clear',label:'Clear focus',run:clearReceiptFilter,disabled:false}
    ]:[];
    if(undoable)actions.push({id:'undo',label:'Undo last correction',run:undoLatestCorrection,disabled:false});
    actions.forEach(action=>{
      const button=document.createElement('button');
      button.type='button';
      button.dataset.receiptCorrection=action.id;
      button.textContent=action.label;
      button.disabled=Boolean(action.disabled);
      button.addEventListener('click',action.run);
      receiptActionsEl.appendChild(button);
    });
    renderCorrectionTrail();
  }

  function activeConnection(){
    if(!api)return null;
    const profile=api.activeProfile();
    const url=api.cleanUrl(profile?.url);
    if(!profile||!url)return null;
    return {profile,url};
  }

  async function request(path,options={}){
    const connection=activeConnection();
    if(!connection)throw new Error('Activate a backend profile first.');
    const token=await api.pairIfNeeded(connection.profile,connection.url);
    return api.fetchJson(api.joinUrl(connection.url,path),{
      ...options,
      headers:{...api.authHeaders(token),...(options.headers||{})}
    });
  }

  function payload(item){
    return {
      workspace_id:workspaceId(),
      type:cleanType(item.type),
      text:clean(item.text,1000),
      tags:cleanTags(item.tags),
      scope:cleanScope(item.scope),
      expires_at:item.expiresAt||null,
      notes:clean(item.notes,1000),
      source:item.source||'manual',
      enabled:item.enabled!==false
    };
  }

  function memoryFromBackend(memory,item){
    return normalize({
      id:item?.id||('backend-'+memory.id),
      backendId:memory.id||item?.backendId||'',
      text:memory.text||item?.text||'',
      type:memory.type||item?.type,
      scope:memory.scope||item?.scope,
      tags:memory.tags||item?.tags,
      expires_at:Object.hasOwn(memory,'expires_at')?memory.expires_at:item?.expiresAt,
      expired:memory.expired,
      notes:Object.hasOwn(memory,'notes')?memory.notes:item?.notes,
      enabled:memory.enabled,
      created_at:memory.created_at||item?.createdAt,
      updated_at:memory.updated_at||item?.updatedAt,
      syncState:'synced'
    });
  }

  async function syncItem(item){
    if(!api||!activeConnection())return {...item,syncState:'local',syncError:''};
    try{
      const data=item.backendId
        ? await request('/memory/'+encodeURIComponent(item.backendId),{method:'PATCH',timeoutMs:8000,body:JSON.stringify(payload(item))})
        : await request('/memory',{method:'POST',timeoutMs:8000,body:JSON.stringify(payload(item))});
      const memory=data?.data||{};
      return memoryFromBackend(memory,item)||{...item,syncState:'synced',syncError:''};
    }catch(error){
      return {...item,syncState:'error',syncError:api?.friendlyError?api.friendlyError(error):'Backend sync unavailable.'};
    }
  }

  async function syncAll(){
    const items=readMemory();
    if(!items.length)return;
    if(!activeConnection()){
      saveMemory(items.map(item=>({...item,syncState:'local',syncError:''})));
      render();
      setStatus('Saved locally. Activate a backend to sync when ready.','ready');
      return;
    }
    setStatus('Syncing memory...','loading');
    const synced=[];
    for(const item of items) synced.push(await syncItem(item));
    saveMemory(synced);
    render();
    const failed=synced.filter(item=>item.syncState==='error').length;
    setStatus(failed?failed+' memory item(s) need retry.':'Memory synced.',failed?'error':'ready');
  }

  async function loadBackendMemory(){
    setStatus('Loading backend memory...','loading');
    try{
      const data=await request('/memory?workspace_id='+encodeURIComponent(workspaceId())+'&include_disabled=true',{method:'GET',timeoutMs:8000});
      const existing=readMemory();
      const byBackend=new Map(existing.filter(item=>item.backendId).map(item=>[item.backendId,item]));
      const backendItems=(Array.isArray(data?.data)?data.data:[]).map(item=>memoryFromBackend(item,byBackend.get(String(item.id)))).filter(Boolean);
      const backendIds=new Set(backendItems.map(item=>item.backendId));
      const localOnly=existing.filter(item=>!item.backendId||!backendIds.has(item.backendId));
      saveMemory(localOnly.concat(backendItems).slice(-MAX_LOCAL_ITEMS));
      render();
      setStatus('Backend memory loaded.','ready');
    }catch(error){
      setStatus(api?.friendlyError?api.friendlyError(error):'Backend memory unavailable.','error');
    }
  }

  function itemStatus(item){
    if(item.expired)return 'expired';
    if(item.syncState==='synced')return 'synced';
    if(item.syncState==='error')return item.syncError||'sync error';
    return 'local';
  }

  function badge(label,state){
    const span=document.createElement('span');
    span.className='memory-badge';
    if(state)span.dataset.state=state;
    span.textContent=label;
    return span;
  }

  function applyForm(item){
    if(inputEl)inputEl.value=item?.text||'';
    if(typeEl)typeEl.value=cleanType(item?.type);
    if(scopeEl)scopeEl.value=cleanScope(item?.scope);
    if(tagsEl)tagsEl.value=cleanTags(item?.tags).join(', ');
    if(expiresEl)expiresEl.value=dateInputValue(item?.expiresAt);
    if(notesEl)notesEl.value=item?.notes||'';
  }

  function renderReceiptFilter(filter,items){
    if(!receiptFilterEl)return;
    const active=filter||activeReceiptFilter();
    const saved=Array.isArray(items)?items:readMemory();
    const matches=saved.filter(item=>matchesReceiptFilter(item,active)).length;
    receiptFilterEl.hidden=!active.active;
    receiptFilterEl.dataset.state=active.ids.length?(matches?'ready':'watch'):(active.active?'watch':'idle');
    renderReceiptActions(active,saved);
    if(!active.active){
      receiptFilterEl.textContent='';
      return;
    }
    const sourceLabel=active.sources.length?' from '+active.sources.join('/')+'.':'.';
    if(active.ids.length&&matches){
      receiptFilterEl.textContent='Receipt filter active: '+String(matches)+' matching memory item(s) from the selected answer are marked below'+sourceLabel;
    }else if(active.ids.length){
      receiptFilterEl.textContent='Receipt filter active: '+String(active.ids.length)+' source ID(s) are available, but no saved local memory in this workspace matches yet'+sourceLabel;
    }else{
      receiptFilterEl.textContent='Receipt filter active: exact memory IDs were not available for this answer. The current memory-use review remains visible below.';
    }
  }

  function renderMemoryUse(filter){
    if(!usedEl)return;
    const active=filter||activeReceiptFilter();
    const used=readMemoryUse();
    usedEl.innerHTML='';
    if(!used.length){
      usedEl.innerHTML='<p class="empty-backends">No memory was used in the last message.</p>';
      return;
    }
    for(const item of used){
      const article=document.createElement('article');
      article.className='memory-used-item';
      const strong=document.createElement('strong');
      strong.textContent=item.text;
      const meta=document.createElement('small');
      const matched=item.matchedTerms.length?' matched '+item.matchedTerms.join(', '):'';
      meta.textContent=[item.source,item.type,item.scope,item.reason+matched].filter(Boolean).join(' - ');
      article.append(strong,meta);
      if(matchesReceiptFilter(item,active)){
        article.setAttribute('data-receipt-match','true');
        article.appendChild(badge('used in selected answer','ready'));
      }
      usedEl.appendChild(article);
    }
  }

  function render(){
    if(!listEl)return;
    const items=readMemory();
    const filter=activeReceiptFilter();
    renderReceiptFilter(filter,items);
    renderMemoryUse(filter);
    listEl.innerHTML='';
    if(!items.length){
      listEl.innerHTML='<p class="empty-backends">No saved memory in this workspace.</p>';
      return;
    }
    for(const item of items.slice().reverse()){
      const article=document.createElement('article');
      article.className='memory-item';
      if(item.enabled===false)article.dataset.state='disabled';
      if(item.expired)article.dataset.expired='true';
      if(matchesReceiptFilter(item,filter))article.setAttribute('data-receipt-match','true');

      const body=document.createElement('div');
      body.className='memory-copy';
      const text=document.createElement('p');
      const strong=document.createElement('strong');
      strong.textContent=item.text;
      text.appendChild(strong);
      const meta=document.createElement('div');
      meta.className='memory-meta-grid';
      meta.append(
        badge(cleanType(item.type)),
        badge(cleanScope(item.scope)),
        badge(item.enabled===false?'disabled':'enabled',item.enabled===false?'disabled':'ready'),
        badge(itemStatus(item),item.syncState==='error'?'error':(item.expired?'warning':'idle'))
      );
      if(item.tags.length)meta.appendChild(badge('tags: '+item.tags.join(', ')));
      if(item.expiresAt)meta.appendChild(badge('expires '+item.expiresAt.slice(0,10),item.expired?'warning':'idle'));
      if(matchesReceiptFilter(item,filter))meta.appendChild(badge('used in selected answer','ready'));
      body.append(text,meta);
      if(item.notes){
        const notes=document.createElement('small');
        notes.className='memory-notes';
        notes.textContent='Review note: '+item.notes;
        body.appendChild(notes);
      }

      const actions=document.createElement('div');
      actions.className='runtime-message-actions';
      const edit=document.createElement('button');
      edit.type='button';
      edit.textContent='Edit';
      edit.addEventListener('click',()=>{
        editingId=item.id;
        applyForm(item);
        setStatus('Editing memory. Save to update it.','idle');
      });
      const toggle=document.createElement('button');
      toggle.type='button';
      toggle.textContent=item.enabled===false?'Enable':'Disable';
      toggle.addEventListener('click',()=>toggleMemory(item.id));
      const remove=document.createElement('button');
      remove.type='button';
      remove.textContent='Remove';
      remove.addEventListener('click',()=>removeMemory(item.id));
      actions.append(edit,toggle,remove);
      if(item.syncState==='error'){
        const retry=document.createElement('button');
        retry.type='button';
        retry.textContent='Retry sync';
        retry.addEventListener('click',()=>syncOne(item.id));
        actions.appendChild(retry);
      }
      article.append(body,actions);
      listEl.appendChild(article);
    }
  }

  async function syncOne(id){
    const items=readMemory();
    const index=items.findIndex(item=>item.id===id);
    if(index<0)return;
    setStatus('Syncing memory...','loading');
    items[index]=await syncItem(items[index]);
    saveMemory(items);
    render();
    if(items[index].syncState==='error')setStatus(items[index].syncError,'error');
    else if(items[index].syncState==='local')setStatus('Saved locally. Activate a backend to sync when ready.','ready');
    else setStatus('Memory synced.','ready');
  }

  async function toggleMemory(id){
    const items=readMemory();
    const index=items.findIndex(item=>item.id===id);
    if(index<0)return;
    items[index]={...items[index],enabled:items[index].enabled===false,updatedAt:new Date().toISOString(),syncState:'local',syncError:''};
    saveMemory(items);
    render();
    await syncOne(id);
  }

  async function removeMemory(id){
    const items=readMemory();
    const item=items.find(entry=>entry.id===id);
    if(!item)return;
    if(item.backendId&&api&&activeConnection()){
      try{
        await request('/memory/'+encodeURIComponent(item.backendId),{method:'DELETE',timeoutMs:8000});
      }catch(error){
        setStatus(api?.friendlyError?api.friendlyError(error):'Backend delete failed.','error');
        return;
      }
    }
    saveMemory(items.filter(entry=>entry.id!==id));
    render();
    setStatus('Memory removed.','ready');
  }

  async function saveInput(){
    const text=clean(inputEl?.value,1000);
    if(!text){setStatus('Write a memory first.','error');return;}
    const items=readMemory();
    let item=null;
    const base={
      text,
      type:cleanType(typeEl?.value),
      scope:cleanScope(scopeEl?.value),
      tags:cleanTags(tagsEl?.value),
      expiresAt:cleanExpiresAt(expiresEl?.value),
      notes:clean(notesEl?.value,1000),
      source:'manual',
      enabled:true,
      updatedAt:new Date().toISOString(),
      syncState:'local',
      syncError:''
    };
    if(editingId){
      const index=items.findIndex(entry=>entry.id===editingId);
      if(index>=0){
        item={...items[index],...base,enabled:items[index].enabled!==false};
        items[index]=item;
      }
    }
    if(!item){
      item={
        id:String(Date.now())+'-'+Math.random().toString(16).slice(2),
        backendId:'',
        createdAt:new Date().toISOString(),
        ...base
      };
      items.push(item);
    }
    saveMemory(items);
    editingId='';
    applyForm(null);
    render();
    setStatus('Memory saved for this workspace.','ready');
    await syncOne(item.id);
  }

  async function importNotes(){
    const lines=String(importEl?.value||'').split(/\r?\n/).map(line=>clean(line,1000)).filter(Boolean).slice(0,MAX_IMPORT_LINES);
    if(!lines.length){setStatus('Paste one note per line first.','error');return;}
    const now=new Date().toISOString();
    const items=readMemory();
    lines.forEach(line=>{
      items.push({
        id:String(Date.now())+'-'+Math.random().toString(16).slice(2),
        backendId:'',
        text:line,
        type:'note',
        scope:cleanScope(scopeEl?.value),
        tags:['import'],
        expiresAt:'',
        notes:'Imported from pasted notes.',
        source:'import',
        enabled:true,
        createdAt:now,
        updatedAt:now,
        syncState:'local',
        syncError:''
      });
    });
    saveMemory(items);
    if(importEl)importEl.value='';
    render();
    setStatus('Imported '+String(lines.length)+' note(s).','ready');
    await syncAll();
  }

  function install(){
    if(document.getElementById('memory-panel'))return;
    const details=document.createElement('details');
    details.id='memory-panel';
    details.className='model-catalog-hint memory-panel';
    details.innerHTML=''+
      '<summary>+ Memory</summary>'+
      '<div class="memory-body">'+
        '<div class="memory-controls-grid">'+
          '<label for="memory-type">Type<select id="memory-type"><option value="preference">Preference</option><option value="project">Project</option><option value="workflow">Workflow</option><option value="identity">Identity</option><option value="instruction">Instruction</option><option value="note">Note</option></select></label>'+
          '<label for="memory-scope">Scope<select id="memory-scope"><option value="workspace">Workspace</option><option value="project">Project</option><option value="chat">Chat</option><option value="session">Session</option><option value="private">Private</option></select></label>'+
          '<label for="memory-tags">Tags<input id="memory-tags" type="text" maxlength="180" placeholder="launch, ux, local"></label>'+
          '<label for="memory-expires">Expires<input id="memory-expires" type="date"></label>'+
        '</div>'+
        '<label for="memory-input">Memory<textarea id="memory-input" rows="2" maxlength="1000" placeholder="Preference, project fact or reusable context"></textarea></label>'+
        '<label for="memory-notes">Review notes<textarea id="memory-notes" rows="2" maxlength="1000" placeholder="Why this is safe/useful, import source or review note"></textarea></label>'+
        '<div class="workflow-builder-actions">'+
          '<button id="memory-save" type="button">Save memory</button>'+
          '<button id="memory-sync" type="button">Sync</button>'+
          '<button id="memory-refresh" type="button">Refresh</button>'+
        '</div>'+
        '<label for="memory-import-notes">Import notes<textarea id="memory-import-notes" rows="3" maxlength="4000" placeholder="One note per line. Imported as local notes first."></textarea></label>'+
        '<div class="workflow-builder-actions">'+
          '<button id="memory-import" type="button">Import notes</button>'+
        '</div>'+
        '<p id="memory-status" class="dashboard-note" aria-live="polite"></p>'+
        '<p id="memory-receipt-filter-status" class="dashboard-note memory-receipt-filter" aria-live="polite" hidden></p>'+
        '<div id="memory-receipt-filter-actions" class="receipt-correction-actions" role="group" aria-label="Receipt memory correction actions" hidden></div>'+
        '<div id="memory-correction-trail" class="context-correction-trail" aria-live="polite" hidden></div>'+
        '<div class="memory-use-review">'+
          '<strong>Used in last message</strong>'+
          '<div id="memory-use-list" class="memory-use-list" aria-live="polite"></div>'+
        '</div>'+
        '<div id="memory-list" class="memory-list" aria-live="polite"></div>'+
      '</div>';
    host.appendChild(details);
    inputEl=document.getElementById('memory-input');
    typeEl=document.getElementById('memory-type');
    scopeEl=document.getElementById('memory-scope');
    tagsEl=document.getElementById('memory-tags');
    expiresEl=document.getElementById('memory-expires');
    notesEl=document.getElementById('memory-notes');
    importEl=document.getElementById('memory-import-notes');
    listEl=document.getElementById('memory-list');
    usedEl=document.getElementById('memory-use-list');
    statusEl=document.getElementById('memory-status');
    receiptFilterEl=document.getElementById('memory-receipt-filter-status');
    receiptActionsEl=document.getElementById('memory-receipt-filter-actions');
    correctionTrailEl=document.getElementById('memory-correction-trail');
    document.getElementById('memory-save')?.addEventListener('click',saveInput);
    document.getElementById('memory-sync')?.addEventListener('click',syncAll);
    document.getElementById('memory-refresh')?.addEventListener('click',loadBackendMemory);
    document.getElementById('memory-import')?.addEventListener('click',importNotes);
    render();
    renderCorrectionTrail();
  }

  window.addEventListener('mmir-workspace-changed',()=>{receiptEventFilter=null;editingId='';applyForm(null);render();renderCorrectionTrail();setStatus('');});
  window.addEventListener('mmir-memory-updated',render);
  window.addEventListener('mmir-memory-use-updated',()=>render());
  window.addEventListener('mmir-context-corrections-updated',renderCorrectionTrail);
  window.addEventListener('mmir-answer-context-highlight-updated',(event)=>{rememberReceiptFilter(event.detail||{});render();});
  window.addEventListener('mmir-answer-context-source-filter',(event)=>{rememberReceiptFilter(event.detail||{});render();});
  window.addEventListener('mmir-backend-profiles-updated',()=>{if(activeConnection())syncAll();});
  window.addEventListener('storage',render);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
