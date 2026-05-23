(function(){
  const WORKSPACE_KEY='mimir-active-workspace-v1';
  const DEFAULT_WORKSPACE_ID='personal';
  const CONTEXT_CONTROLS_PREFIX='mimir-context-controls-v1:';
  let root=null;
  let memoryEl=null;
  let knowledgeEl=null;
  let statusEl=null;

  function workspaceId(){return localStorage.getItem(WORKSPACE_KEY)||DEFAULT_WORKSPACE_ID;}
  function key(){return CONTEXT_CONTROLS_PREFIX+workspaceId();}
  function read(){
    try{return JSON.parse(localStorage.getItem(key())||'{}')||{};}catch(error){return {};}
  }
  function write(value){
    localStorage.setItem(key(),JSON.stringify(value));
    window.dispatchEvent(new CustomEvent('mmir-context-controls-updated',{detail:{workspaceId:workspaceId(),...value}}));
  }
  function label(enabled,name){return name+' '+(enabled?'on':'off');}
  function sync(){
    const state=read();
    const memory=state.memory!==false;
    const knowledge=state.knowledge!==false;
    if(memoryEl)memoryEl.checked=memory;
    if(knowledgeEl)knowledgeEl.checked=knowledge;
    if(statusEl)statusEl.textContent=label(memory,'Memory')+' / '+label(knowledge,'Knowledge');
  }
  function save(){
    write({
      memory:memoryEl?.checked!==false,
      knowledge:knowledgeEl?.checked!==false,
      updated_at:new Date().toISOString(),
      local_only:true,
      no_paid_routes_started:true
    });
    sync();
  }
  function install(){
    if(document.getElementById('runtime-context-controls')){sync();return;}
    const composer=document.querySelector('.mimir-composer');
    if(!composer)return;
    root=document.createElement('div');
    root.id='runtime-context-controls';
    root.className='runtime-context-controls';
    root.innerHTML=''+
      '<label><input id="runtime-context-memory" type="checkbox" checked /> Memory</label>'+
      '<label><input id="runtime-context-knowledge" type="checkbox" checked /> Knowledge</label>'+
      '<small id="runtime-context-status" aria-live="polite"></small>';
    composer.insertAdjacentElement('afterend',root);
    memoryEl=document.getElementById('runtime-context-memory');
    knowledgeEl=document.getElementById('runtime-context-knowledge');
    statusEl=document.getElementById('runtime-context-status');
    memoryEl?.addEventListener('change',save);
    knowledgeEl?.addEventListener('change',save);
    sync();
  }

  window.addEventListener('mmir-workspace-changed',sync);
  window.addEventListener('storage',sync);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
