(function(){
  const ACTIVE_WORKSPACE_KEY='mimir-active-workspace-v1';
  const DEFAULT_WORKSPACE_ID='personal';
  const MEMORY_PREFIX='mimir-memory-v1:';
  const host=document.querySelector('#multi-model-workspace .mimir-dashboard');
  let listEl=null;
  let inputEl=null;
  let statusEl=null;

  if(!host)return;

  function workspaceId(){return localStorage.getItem(ACTIVE_WORKSPACE_KEY)||DEFAULT_WORKSPACE_ID;}
  function key(){return MEMORY_PREFIX+workspaceId();}
  function clean(value){return String(value||'').trim().slice(0,280);}

  function readMemory(){
    try{
      const value=JSON.parse(localStorage.getItem(key())||'[]');
      return Array.isArray(value)?value.filter(item=>item&&item.id&&item.text).slice(-20):[];
    }catch(error){return [];}
  }

  function saveMemory(items){
    localStorage.setItem(key(),JSON.stringify(items.slice(-20)));
    window.dispatchEvent(new CustomEvent('mmir-memory-updated',{detail:{workspaceId:workspaceId()}}));
  }

  function setStatus(message){if(statusEl)statusEl.textContent=message||'';}

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
      const text=document.createElement('p');
      text.textContent=item.text;
      const button=document.createElement('button');
      button.type='button';
      button.textContent='Remove';
      button.addEventListener('click',()=>{
        saveMemory(readMemory().filter(entry=>entry.id!==item.id));
        render();
        setStatus('Memory removed.');
      });
      article.append(text,button);
      listEl.appendChild(article);
    }
  }

  function addMemory(){
    const text=clean(inputEl?.value);
    if(!text){setStatus('Write a memory first.');return;}
    const items=readMemory();
    items.push({id:String(Date.now())+'-'+Math.random().toString(16).slice(2),text,createdAt:new Date().toISOString()});
    saveMemory(items);
    inputEl.value='';
    render();
    setStatus('Memory saved for this workspace.');
  }

  function install(){
    if(document.getElementById('memory-panel'))return;
    const details=document.createElement('details');
    details.id='memory-panel';
    details.className='model-catalog-hint memory-panel';
    details.innerHTML=''+
      '<summary>+ Memory</summary>'+
      '<div class="memory-body">'+
        '<label for="memory-input">Memory<textarea id="memory-input" rows="2" maxlength="280" placeholder="Preference, project fact or reusable context"></textarea></label>'+
        '<button id="memory-save" type="button">Save memory</button>'+
        '<p id="memory-status" class="dashboard-note" aria-live="polite"></p>'+
        '<div id="memory-list" class="memory-list" aria-live="polite"></div>'+
      '</div>';
    host.appendChild(details);
    inputEl=document.getElementById('memory-input');
    listEl=document.getElementById('memory-list');
    statusEl=document.getElementById('memory-status');
    document.getElementById('memory-save')?.addEventListener('click',addMemory);
    render();
  }

  window.addEventListener('mmir-workspace-changed',()=>{render();setStatus('');});
  window.addEventListener('storage',render);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
