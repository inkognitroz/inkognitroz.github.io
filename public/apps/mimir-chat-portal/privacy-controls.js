(function(){
  const WORKSPACES_KEY='mimir-workspaces-v1';
  const ACTIVE_WORKSPACE_KEY='mimir-active-workspace-v1';
  const DEFAULT_WORKSPACE_ID='personal';
  const CHAT_PREFIX='mimir-chat-current-session-v1:';
  const LEGACY_CHAT_KEY='mimir-chat-current-session-v1';
  const MEMORY_PREFIX='mimir-memory-v1:';
  const KNOWLEDGE_PREFIX='mimir-knowledge-v1:';
  const host=document.querySelector('#multi-model-workspace .mimir-dashboard');
  let statusEl=null;
  let summaryEl=null;
  let deleteArmed=false;
  let deleteTimer=null;

  if(!host)return;

  function workspaceId(){return localStorage.getItem(ACTIVE_WORKSPACE_KEY)||DEFAULT_WORKSPACE_ID;}
  function workspaceName(){
    try{
      const workspaces=JSON.parse(localStorage.getItem(WORKSPACES_KEY)||'[]');
      if(Array.isArray(workspaces)){
        const active=workspaces.find(item=>item?.id===workspaceId());
        if(active?.name)return String(active.name);
      }
    }catch(error){}
    return workspaceId()==='personal'?'Personal':workspaceId();
  }

  function readJson(key,fallback){
    try{
      const value=JSON.parse(localStorage.getItem(key)||'null');
      return value ?? fallback;
    }catch(error){
      return fallback;
    }
  }

  function chatKey(id=workspaceId()){
    return CHAT_PREFIX+id;
  }

  function workspaceSnapshot(id=workspaceId()){
    const chat=readJson(chatKey(id),id===DEFAULT_WORKSPACE_ID?readJson(LEGACY_CHAT_KEY,[]):[]);
    const memory=readJson(MEMORY_PREFIX+id,[]);
    const knowledge=readJson(KNOWLEDGE_PREFIX+id,[]);

    return {
      exported_at:new Date().toISOString(),
      workspace:{id,name:workspaceName()},
      chat:Array.isArray(chat)?chat:[],
      memory:Array.isArray(memory)?memory:[],
      knowledge:Array.isArray(knowledge)?knowledge:[]
    };
  }

  function counts(snapshot=workspaceSnapshot()){
    return {
      chat:snapshot.chat.length,
      memory:snapshot.memory.length,
      knowledge:snapshot.knowledge.length
    };
  }

  function setStatus(message,state){
    if(statusEl){
      statusEl.textContent=message||'';
      statusEl.dataset.state=state||'idle';
    }
  }

  function renderSummary(){
    if(!summaryEl)return;
    const activeCounts=counts();
    summaryEl.innerHTML='';
    [
      ['Chat messages',activeCounts.chat],
      ['Memory items',activeCounts.memory],
      ['Knowledge files',activeCounts.knowledge]
    ].forEach(([label,value])=>{
      const item=document.createElement('span');
      const strong=document.createElement('strong');
      strong.textContent=String(value);
      const small=document.createElement('small');
      small.textContent=label;
      item.append(strong,small);
      summaryEl.appendChild(item);
    });
  }

  function downloadJson(){
    const snapshot=workspaceSnapshot();
    const blob=new Blob([JSON.stringify(snapshot,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const link=document.createElement('a');
    link.href=url;
    link.download='mmir-'+snapshot.workspace.id+'-workspace-export.json';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setStatus('Workspace data exported.','ready');
  }

  async function copyJson(){
    try{
      await navigator.clipboard.writeText(JSON.stringify(workspaceSnapshot(),null,2));
      setStatus('Workspace data copied.','ready');
    }catch(error){
      setStatus('Clipboard access was blocked. Use export instead.','error');
    }
  }

  function clearDeleteArm(){
    deleteArmed=false;
    clearTimeout(deleteTimer);
  }

  function notifyDataChanged(){
    const id=workspaceId();
    window.dispatchEvent(new CustomEvent('mmir-chat-history-updated',{detail:{workspaceId:id}}));
    window.dispatchEvent(new CustomEvent('mmir-memory-updated',{detail:{workspaceId:id}}));
    window.dispatchEvent(new CustomEvent('mmir-knowledge-updated',{detail:{workspaceId:id}}));
    window.dispatchEvent(new CustomEvent('mmir-workspace-changed',{detail:{id,name:workspaceName()}}));
  }

  function deleteWorkspaceData(button){
    if(!deleteArmed){
      deleteArmed=true;
      button.textContent='Confirm delete';
      setStatus('Click again to delete local data for this workspace.','warning');
      deleteTimer=setTimeout(()=>{
        deleteArmed=false;
        button.textContent='Delete workspace data';
        setStatus('Delete cancelled.','idle');
      },8000);
      return;
    }

    clearDeleteArm();
    localStorage.removeItem(chatKey());
    if(workspaceId()===DEFAULT_WORKSPACE_ID)localStorage.removeItem(LEGACY_CHAT_KEY);
    localStorage.removeItem(MEMORY_PREFIX+workspaceId());
    localStorage.removeItem(KNOWLEDGE_PREFIX+workspaceId());
    button.textContent='Delete workspace data';
    renderSummary();
    notifyDataChanged();
    setStatus('Local workspace data deleted.','ready');
  }

  function install(){
    if(document.getElementById('privacy-controls-panel'))return;
    const details=document.createElement('details');
    details.id='privacy-controls-panel';
    details.className='model-catalog-hint privacy-controls-panel';
    details.innerHTML=''+
      '<summary>+ Privacy / Local Data</summary>'+
      '<div class="privacy-controls-body">'+
        '<div id="privacy-summary" class="privacy-summary" aria-live="polite"></div>'+
        '<div class="privacy-actions">'+
          '<button id="privacy-export" type="button">Export JSON</button>'+
          '<button id="privacy-copy" type="button">Copy JSON</button>'+
          '<button id="privacy-delete" type="button" class="danger">Delete workspace data</button>'+
        '</div>'+
        '<p id="privacy-status" class="dashboard-note" data-state="idle" aria-live="polite"></p>'+
      '</div>';
    host.appendChild(details);
    summaryEl=document.getElementById('privacy-summary');
    statusEl=document.getElementById('privacy-status');
    document.getElementById('privacy-export')?.addEventListener('click',downloadJson);
    document.getElementById('privacy-copy')?.addEventListener('click',copyJson);
    document.getElementById('privacy-delete')?.addEventListener('click',(event)=>deleteWorkspaceData(event.currentTarget));
    renderSummary();
  }

  window.addEventListener('mmir-workspace-changed',()=>{clearDeleteArm();renderSummary();setStatus('');});
  window.addEventListener('mmir-chat-history-updated',renderSummary);
  window.addEventListener('mmir-memory-updated',renderSummary);
  window.addEventListener('mmir-knowledge-updated',renderSummary);
  window.addEventListener('storage',renderSummary);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
