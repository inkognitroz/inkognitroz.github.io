(function(){
  const api=window.MimirApiClient;
  const ACTIVE_WORKSPACE_KEY='mimir-active-workspace-v1';
  const DEFAULT_WORKSPACE_ID='personal';
  const MEMORY_PREFIX='mimir-memory-v1:';
  const MAX_LOCAL_ITEMS=20;
  const host=document.querySelector('#multi-model-workspace .mimir-dashboard');
  let listEl=null;
  let inputEl=null;
  let typeEl=null;
  let statusEl=null;
  let editingId='';

  if(!host)return;

  function workspaceId(){return localStorage.getItem(ACTIVE_WORKSPACE_KEY)||DEFAULT_WORKSPACE_ID;}
  function key(){return MEMORY_PREFIX+workspaceId();}
  function clean(value,max=1000){return String(value||'').trim().slice(0,max);}
  function cleanType(value){
    const type=clean(value,48).toLowerCase();
    return ['preference','project','workflow','identity','instruction','note'].includes(type)?type:'note';
  }

  function normalize(item){
    if(!item||!item.id||!item.text)return null;
    return {
      id:String(item.id),
      backendId:String(item.backendId||item.backend_id||''),
      text:clean(item.text,1000),
      type:cleanType(item.type),
      enabled:item.enabled!==false,
      createdAt:item.createdAt||item.created_at||new Date().toISOString(),
      updatedAt:item.updatedAt||item.updated_at||item.createdAt||item.created_at||new Date().toISOString(),
      syncState:item.syncState||item.sync_state||'local',
      syncError:item.syncError||''
    };
  }

  function readMemory(){
    try{
      const value=JSON.parse(localStorage.getItem(key())||'[]');
      return Array.isArray(value)?value.map(normalize).filter(Boolean).slice(-MAX_LOCAL_ITEMS):[];
    }catch(error){return [];}
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
      source:'manual',
      enabled:item.enabled!==false
    };
  }

  async function syncItem(item){
    if(!api||!activeConnection())return {...item,syncState:'local',syncError:''};
    try{
      const data=item.backendId
        ? await request('/memory/'+encodeURIComponent(item.backendId),{method:'PATCH',timeoutMs:8000,body:JSON.stringify(payload(item))})
        : await request('/memory',{method:'POST',timeoutMs:8000,body:JSON.stringify(payload(item))});
      const memory=data?.data||{};
      return {
        ...item,
        backendId:String(memory.id||item.backendId||''),
        type:cleanType(memory.type||item.type),
        text:clean(memory.text||item.text,1000),
        enabled:memory.enabled!==false,
        updatedAt:memory.updated_at||new Date().toISOString(),
        syncState:'synced',
        syncError:''
      };
    }catch(error){
      return {...item,syncState:'error',syncError:api?.friendlyError?api.friendlyError(error):'Backend sync unavailable.'};
    }
  }

  async function syncAll(){
    const items=readMemory();
    if(!items.length)return;
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
      const backendItems=(Array.isArray(data?.data)?data.data:[]).map(item=>normalize({
        id:byBackend.get(String(item.id))?.id||('backend-'+item.id),
        backendId:item.id,
        text:item.text,
        type:item.type,
        enabled:item.enabled,
        createdAt:item.created_at,
        updatedAt:item.updated_at,
        syncState:'synced'
      })).filter(Boolean);
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
    if(item.syncState==='synced')return 'synced';
    if(item.syncState==='error')return item.syncError||'sync error';
    return 'local';
  }

  function render(){
    if(!listEl)return;
    const items=readMemory();
    listEl.innerHTML='';
    if(!items.length){
      listEl.innerHTML='<p class="empty-backends">No saved memory in this workspace.</p>';
      return;
    }
    for(const item of items.slice().reverse()){
      const article=document.createElement('article');
      article.className='memory-item';
      if(item.enabled===false)article.dataset.state='disabled';
      const text=document.createElement('p');
      const strong=document.createElement('strong');
      strong.textContent=item.text;
      const meta=document.createElement('small');
      meta.textContent=cleanType(item.type)+' - '+(item.enabled===false?'disabled':'enabled')+' - '+itemStatus(item);
      text.append(strong,meta);

      const actions=document.createElement('div');
      actions.className='runtime-message-actions';
      const edit=document.createElement('button');
      edit.type='button';
      edit.textContent='Edit';
      edit.addEventListener('click',()=>{
        editingId=item.id;
        if(inputEl)inputEl.value=item.text;
        if(typeEl)typeEl.value=cleanType(item.type);
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
      article.append(text,actions);
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
    setStatus(items[index].syncState==='error'?items[index].syncError:'Memory synced.',items[index].syncState==='error'?'error':'ready');
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
    if(editingId){
      const index=items.findIndex(entry=>entry.id===editingId);
      if(index>=0){
        item={...items[index],text,type:cleanType(typeEl?.value),updatedAt:new Date().toISOString(),syncState:'local',syncError:''};
        items[index]=item;
      }
    }
    if(!item){
      item={
        id:String(Date.now())+'-'+Math.random().toString(16).slice(2),
        backendId:'',
        text,
        type:cleanType(typeEl?.value),
        enabled:true,
        createdAt:new Date().toISOString(),
        updatedAt:new Date().toISOString(),
        syncState:'local',
        syncError:''
      };
      items.push(item);
    }
    saveMemory(items);
    editingId='';
    if(inputEl)inputEl.value='';
    render();
    setStatus('Memory saved for this workspace.','ready');
    await syncOne(item.id);
  }

  function install(){
    if(document.getElementById('memory-panel'))return;
    const details=document.createElement('details');
    details.id='memory-panel';
    details.className='model-catalog-hint memory-panel';
    details.innerHTML=''+
      '<summary>+ Memory</summary>'+
      '<div class="memory-body">'+
        '<div class="workflow-builder-row">'+
          '<label for="memory-type">Type<select id="memory-type"><option value="preference">Preference</option><option value="project">Project</option><option value="workflow">Workflow</option><option value="identity">Identity</option><option value="instruction">Instruction</option><option value="note">Note</option></select></label>'+
        '</div>'+
        '<label for="memory-input">Memory<textarea id="memory-input" rows="2" maxlength="1000" placeholder="Preference, project fact or reusable context"></textarea></label>'+
        '<div class="workflow-builder-actions">'+
          '<button id="memory-save" type="button">Save memory</button>'+
          '<button id="memory-sync" type="button">Sync</button>'+
          '<button id="memory-refresh" type="button">Refresh</button>'+
        '</div>'+
        '<p id="memory-status" class="dashboard-note" aria-live="polite"></p>'+
        '<div id="memory-list" class="memory-list" aria-live="polite"></div>'+
      '</div>';
    host.appendChild(details);
    inputEl=document.getElementById('memory-input');
    typeEl=document.getElementById('memory-type');
    listEl=document.getElementById('memory-list');
    statusEl=document.getElementById('memory-status');
    document.getElementById('memory-save')?.addEventListener('click',saveInput);
    document.getElementById('memory-sync')?.addEventListener('click',syncAll);
    document.getElementById('memory-refresh')?.addEventListener('click',loadBackendMemory);
    render();
  }

  window.addEventListener('mmir-workspace-changed',()=>{editingId='';render();setStatus('');});
  window.addEventListener('mmir-backend-profiles-updated',()=>{if(activeConnection())syncAll();});
  window.addEventListener('storage',render);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
