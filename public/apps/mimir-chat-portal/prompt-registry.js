(function(){
  const api=window.MimirApiClient;
  const ACTIVE_WORKSPACE_KEY='mimir-active-workspace-v1';
  const DEFAULT_WORKSPACE_ID='personal';
  const host=document.querySelector('#multi-model-workspace .mimir-dashboard');
  const promptEl=document.getElementById('mimir-prompt');
  let listEl=null;
  let statusEl=null;
  let nameEl=null;
  let typeEl=null;
  let contentEl=null;
  let selectedPromptId='';
  let prompts=[];

  if(!host||!api)return;

  function workspaceId(){return localStorage.getItem(ACTIVE_WORKSPACE_KEY)||DEFAULT_WORKSPACE_ID;}
  function safe(value){return String(value||'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));}
  function setStatus(message,state){if(statusEl){statusEl.textContent=message||'';statusEl.dataset.state=state||'idle';}}

  function activeConnection(){
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

  function render(){
    if(!listEl)return;
    if(!prompts.length){
      listEl.innerHTML='<p class="empty-backends">No prompts saved for this workspace.</p>';
      return;
    }
    listEl.innerHTML=prompts.map(prompt=>''+
      '<article class="memory-item">'+
        '<p><strong>'+safe(prompt.name)+'</strong><small>'+safe(prompt.type)+' - v'+String(prompt.active_version)+' - '+String(prompt.version_count)+' version(s)</small></p>'+
        '<div class="runtime-message-actions">'+
          '<button type="button" data-action="load" data-id="'+safe(prompt.id)+'">Load</button>'+
          '<button type="button" data-action="version" data-id="'+safe(prompt.id)+'">Version</button>'+
        '</div>'+
      '</article>').join('');
    listEl.querySelectorAll('[data-action="load"]').forEach(button=>button.addEventListener('click',()=>loadPrompt(button.dataset.id,false)));
    listEl.querySelectorAll('[data-action="version"]').forEach(button=>button.addEventListener('click',()=>loadPrompt(button.dataset.id,true)));
  }

  async function loadPrompts(){
    setStatus('Loading prompts...','loading');
    try{
      const data=await request('/prompts?workspace_id='+encodeURIComponent(workspaceId()),{method:'GET',timeoutMs:8000});
      prompts=Array.isArray(data?.data)?data.data:[];
      render();
      setStatus('Prompts loaded.','ready');
    }catch(error){
      prompts=[];
      render();
      setStatus(api.friendlyError(error),'error');
    }
  }

  async function loadPrompt(id,forVersion){
    setStatus('Loading prompt...','loading');
    try{
      const data=await request('/prompts/'+encodeURIComponent(id),{method:'GET',timeoutMs:8000});
      const prompt=data?.data;
      const version=Array.isArray(prompt?.versions)?prompt.versions[prompt.versions.length-1]:null;
      if(promptEl)promptEl.value=version?.content||'';
      if(nameEl)nameEl.value=prompt?.name||'';
      if(typeEl)typeEl.value=prompt?.type||'chat';
      if(contentEl)contentEl.value=version?.content||'';
      selectedPromptId=forVersion?String(prompt?.id||''):'';
      setStatus(forVersion?'Editing new version.':'Prompt loaded into chat.','ready');
    }catch(error){
      setStatus(api.friendlyError(error),'error');
    }
  }

  async function savePrompt(){
    const content=String(contentEl?.value||promptEl?.value||'').trim();
    if(!content){setStatus('Write a prompt first.','error');return;}
    const name=String(nameEl?.value||'Saved prompt').trim()||'Saved prompt';
    const type=String(typeEl?.value||'chat');
    setStatus('Saving prompt...','loading');
    try{
      if(selectedPromptId){
        await request('/prompts/'+encodeURIComponent(selectedPromptId)+'/versions',{
          method:'POST',
          timeoutMs:10000,
          body:JSON.stringify({content,change_note:'Saved from MMIR web UI'})
        });
      }else{
        await request('/prompts',{
          method:'POST',
          timeoutMs:10000,
          body:JSON.stringify({workspace_id:workspaceId(),name,type,content})
        });
      }
      selectedPromptId='';
      if(contentEl)contentEl.value='';
      await loadPrompts();
      setStatus('Prompt saved.','ready');
    }catch(error){
      setStatus(api.friendlyError(error),'error');
    }
  }

  function install(){
    if(document.getElementById('prompt-registry-panel'))return;
    const details=document.createElement('details');
    details.id='prompt-registry-panel';
    details.className='model-catalog-hint memory-panel';
    details.innerHTML=''+
      '<summary>+ Prompts</summary>'+
      '<div class="memory-body">'+
        '<div class="workflow-builder-row">'+
          '<label for="prompt-registry-name">Name<input id="prompt-registry-name" type="text" maxlength="80" /></label>'+
          '<label for="prompt-registry-type">Type<select id="prompt-registry-type"><option value="chat">Chat</option><option value="role">Role</option><option value="workflow">Workflow</option><option value="agent">Agent</option><option value="system">System</option><option value="template">Template</option></select></label>'+
        '</div>'+
        '<label for="prompt-registry-content">Prompt<textarea id="prompt-registry-content" rows="3" maxlength="8000"></textarea></label>'+
        '<div class="workflow-builder-actions">'+
          '<button id="prompt-registry-save" type="button">Save prompt</button>'+
          '<button id="prompt-registry-refresh" type="button">Refresh</button>'+
        '</div>'+
        '<p id="prompt-registry-status" class="dashboard-note" aria-live="polite"></p>'+
        '<div id="prompt-registry-list" class="memory-list" aria-live="polite"></div>'+
      '</div>';
    host.appendChild(details);
    listEl=document.getElementById('prompt-registry-list');
    statusEl=document.getElementById('prompt-registry-status');
    nameEl=document.getElementById('prompt-registry-name');
    typeEl=document.getElementById('prompt-registry-type');
    contentEl=document.getElementById('prompt-registry-content');
    document.getElementById('prompt-registry-save')?.addEventListener('click',savePrompt);
    document.getElementById('prompt-registry-refresh')?.addEventListener('click',loadPrompts);
    render();
  }

  window.addEventListener('mmir-workspace-changed',()=>{prompts=[];selectedPromptId='';render();setStatus('');});
  window.addEventListener('mmir-backend-profiles-updated',loadPrompts);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
