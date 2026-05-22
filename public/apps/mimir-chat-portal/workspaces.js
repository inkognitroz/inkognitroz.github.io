(function(){
  const WORKSPACES_KEY='mimir-workspaces-v1';
  const ACTIVE_WORKSPACE_KEY='mimir-active-workspace-v1';
  const DEFAULT_WORKSPACE={id:'personal',name:'Personal'};
  const context=document.querySelector('.composer-context');
  let select=null;
  let form=null;
  let input=null;
  let statusEl=null;

  function cleanName(value){return String(value||'').trim().slice(0,48);}
  function newId(name){return cleanName(name).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||('workspace-'+Date.now());}

  function readWorkspaces(){
    try{
      const value=JSON.parse(localStorage.getItem(WORKSPACES_KEY)||'[]');
      if(Array.isArray(value)&&value.length)return value.filter(item=>item&&item.id&&item.name);
    }catch(error){}
    return [DEFAULT_WORKSPACE];
  }

  function saveWorkspaces(workspaces){
    localStorage.setItem(WORKSPACES_KEY,JSON.stringify(workspaces));
  }

  function activeId(){
    const id=localStorage.getItem(ACTIVE_WORKSPACE_KEY)||DEFAULT_WORKSPACE.id;
    const workspaces=readWorkspaces();
    return workspaces.some(item=>item.id===id)?id:workspaces[0].id;
  }

  function activeWorkspace(){
    const id=activeId();
    return readWorkspaces().find(item=>item.id===id)||DEFAULT_WORKSPACE;
  }

  function emit(){
    window.dispatchEvent(new CustomEvent('mmir-workspace-changed',{detail:activeWorkspace()}));
  }

  function renderOptions(){
    if(!select)return;
    const workspaces=readWorkspaces();
    select.innerHTML='';
    for(const workspace of workspaces){
      const option=document.createElement('option');
      option.value=workspace.id;
      option.textContent=workspace.name;
      select.appendChild(option);
    }
    select.value=activeId();
  }

  function setStatus(message){
    if(statusEl)statusEl.textContent=message||'';
  }

  function showForm(){
    if(!form||!input)return;
    form.hidden=false;
    document.getElementById('workspace-new')?.setAttribute('aria-expanded','true');
    input.value='';
    setStatus('');
    input.focus();
  }

  function hideForm(){
    if(!form)return;
    form.hidden=true;
    document.getElementById('workspace-new')?.setAttribute('aria-expanded','false');
    setStatus('');
  }

  function createWorkspace(name){
    name=cleanName(name);
    if(!name)return;
    const workspaces=readWorkspaces();
    let id=newId(name);
    let suffix=2;
    while(workspaces.some(item=>item.id===id)){id=newId(name)+'-'+suffix;suffix+=1;}
    const workspace={id,name,createdAt:new Date().toISOString()};
    workspaces.push(workspace);
    saveWorkspaces(workspaces);
    localStorage.setItem(ACTIVE_WORKSPACE_KEY,id);
    renderOptions();
    hideForm();
    emit();
  }

  function submitWorkspace(event){
    event.preventDefault();
    const name=cleanName(input?.value);
    if(!name){
      setStatus('Name required.');
      input?.focus();
      return;
    }
    createWorkspace(name);
  }

  function install(){
    if(!context||document.getElementById('workspace-select'))return;
    const wrapper=document.createElement('span');
    wrapper.className='workspace-switcher';
    wrapper.innerHTML=''+
      '<label for="workspace-select">Workspace<select id="workspace-select"></select></label>'+
      '<button id="workspace-new" type="button" aria-label="Create workspace" aria-expanded="false" aria-controls="workspace-create-form">+</button>'+
      '<form id="workspace-create-form" class="workspace-create-form" hidden>'+
        '<label for="workspace-name">New workspace<input id="workspace-name" type="text" maxlength="48" autocomplete="off" /></label>'+
        '<button id="workspace-create" type="submit">Create</button>'+
        '<button id="workspace-cancel" type="button">Cancel</button>'+
        '<small id="workspace-status" aria-live="polite"></small>'+
      '</form>';
    context.appendChild(wrapper);
    select=document.getElementById('workspace-select');
    form=document.getElementById('workspace-create-form');
    input=document.getElementById('workspace-name');
    statusEl=document.getElementById('workspace-status');
    renderOptions();
    select.addEventListener('change',()=>{
      localStorage.setItem(ACTIVE_WORKSPACE_KEY,select.value);
      emit();
    });
    form?.addEventListener('submit',submitWorkspace);
    document.getElementById('workspace-new')?.addEventListener('click',()=>form?.hidden?showForm():hideForm());
    document.getElementById('workspace-cancel')?.addEventListener('click',hideForm);
    emit();
  }

  window.addEventListener('storage',()=>{renderOptions();emit();});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
