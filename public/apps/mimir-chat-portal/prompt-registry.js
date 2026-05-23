(function(){
  const api=window.MimirApiClient;
  const ACTIVE_WORKSPACE_KEY='mimir-active-workspace-v1';
  const DEFAULT_WORKSPACE_ID='personal';
  const LOCAL_PROMPT_PREFIX='mimir-prompts-v1:';
  const host=document.querySelector('#multi-model-workspace .mimir-dashboard');
  const promptEl=document.getElementById('mimir-prompt');
  let listEl=null;
  let starterEl=null;
  let statusEl=null;
  let nameEl=null;
  let typeEl=null;
  let descriptionEl=null;
  let tagsEl=null;
  let variablesEl=null;
  let modelHintEl=null;
  let contentEl=null;
  let searchEl=null;
  let selectedPromptId='';
  let selectedSource='local';
  let prompts=[];

  if(!host||!api)return;

  function workspaceId(){return localStorage.getItem(ACTIVE_WORKSPACE_KEY)||DEFAULT_WORKSPACE_ID;}
  function localKey(){return LOCAL_PROMPT_PREFIX+workspaceId();}
  function now(){return new Date().toISOString();}
  function safe(value){return String(value||'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));}
  function clean(value,fallback='',max=240){
    if(typeof fallback==='number'){
      max=fallback;
      fallback='';
    }
    const cleaned=String(value||'').replace(/\s+/g,' ').trim().slice(0,max);
    return cleaned||fallback;
  }
  function cleanContent(value){return String(value||'').trim().slice(0,8000);}
  function splitList(value,max=16){return String(value||'').split(',').map(item=>clean(item,64)).filter(Boolean).slice(0,max);}
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
  function readLocalPrompts(){
    try{
      const value=JSON.parse(localStorage.getItem(localKey())||'[]');
      return Array.isArray(value)?value:[];
    }catch(error){
      return [];
    }
  }
  function writeLocalPrompts(items){
    localStorage.setItem(localKey(),JSON.stringify(items.slice(0,100)));
    window.dispatchEvent(new CustomEvent('mmir-prompts-updated',{detail:{workspace_id:workspaceId(),count:items.length}}));
  }
  function latestVersion(prompt){
    return Array.isArray(prompt?.versions)&&prompt.versions.length?prompt.versions[prompt.versions.length-1]:null;
  }
  function starterPrompts(){
    return [
      {
        id:'starter-repo-review',
        name:'Repo review',
        type:'chat',
        description:'Review code with security, architecture and user-value lenses.',
        tags:['code','security','architecture'],
        variables:['input','goal'],
        model_hint:'coder or architect',
        content:'Review this repository or change set for {{goal}}. Use MMIR principles: free-first, zero-trust, clear frontend/backend boundaries, useful user journey and maintainable architecture. Context: {{input}}\n\nReturn prioritized findings, concrete fixes and test suggestions.'
      },
      {
        id:'starter-growth-plan',
        name:'Growth plan',
        type:'chat',
        description:'Turn a product idea into a user/revenue plan.',
        tags:['growth','product','revenue'],
        variables:['input'],
        model_hint:'strategist',
        content:'Create a MMIR growth plan for {{input}}. Prioritize users, free activation, premium boundaries, marketplace opportunities and what should be built next. Keep it concrete and ordered.'
      },
      {
        id:'starter-security-review',
        name:'Security review',
        type:'chat',
        description:'Check trust boundaries before exposing functionality.',
        tags:['security','zero-trust'],
        variables:['input'],
        model_hint:'security reviewer',
        content:'Run a zero-trust security review for {{input}}. Check secrets, public/private repo boundaries, browser storage, auth, CORS, pairing, audit logs, paid routes and data retention. Give concrete fixes.'
      },
      {
        id:'starter-workflow',
        name:'Workflow builder',
        type:'workflow',
        description:'Draft a useful automatable workflow.',
        tags:['workflow','automation'],
        variables:['input'],
        model_hint:'workflow architect',
        content:'Design a MMIR workflow for {{input}}. Include steps, role/model fit, inputs, outputs, tools, safety gates, free/local route and what can run automatically now.'
      },
      {
        id:'starter-prompt-refiner',
        name:'Prompt refiner',
        type:'template',
        description:'Improve a rough prompt into a reusable pattern.',
        tags:['prompt','template'],
        variables:['input'],
        model_hint:'prompt engineer',
        content:'Improve this prompt into a reusable MMIR prompt pattern: {{input}}\n\nReturn: name, tags, variables, final prompt, and when to use it.'
      }
    ];
  }
  function normalizePrompt(prompt,source){
    const version=latestVersion(prompt)||{};
    return {
      id:String(prompt.id||''),
      source,
      workspace_id:prompt.workspace_id||workspaceId(),
      type:prompt.type||'chat',
      name:prompt.name||'Prompt',
      description:prompt.description||'',
      tags:Array.isArray(prompt.tags)?prompt.tags:[],
      variables:Array.isArray(prompt.variables)?prompt.variables:(Array.isArray(version.variables)?version.variables:[]),
      model_hint:prompt.model_hint||version.model_hint||'',
      active_version:prompt.active_version||version.version||1,
      version_count:prompt.version_count||((prompt.versions||[]).length||1),
      versions:Array.isArray(prompt.versions)&&prompt.versions.length?prompt.versions:[version],
      updated_at:prompt.updated_at||version.created_at||''
    };
  }
  function collectForm(){
    return {
      workspace_id:workspaceId(),
      name:clean(nameEl?.value,'Prompt',160),
      type:clean(typeEl?.value,'chat',40),
      description:clean(descriptionEl?.value,'',1000),
      tags:splitList(tagsEl?.value,16),
      variables:splitList(variablesEl?.value,24),
      model_hint:clean(modelHintEl?.value,'',160),
      content:cleanContent(contentEl?.value||promptEl?.value)
    };
  }
  function fillForm(prompt,content){
    if(nameEl)nameEl.value=prompt?.name||'';
    if(typeEl)typeEl.value=prompt?.type||'chat';
    if(descriptionEl)descriptionEl.value=prompt?.description||'';
    if(tagsEl)tagsEl.value=(prompt?.tags||[]).join(', ');
    if(variablesEl)variablesEl.value=(prompt?.variables||latestVersion(prompt)?.variables||[]).join(', ');
    if(modelHintEl)modelHintEl.value=prompt?.model_hint||latestVersion(prompt)?.model_hint||'';
    if(contentEl)contentEl.value=content||latestVersion(prompt)?.content||'';
  }
  function saveLocalPrompt(data,existingId=''){
    const items=readLocalPrompts();
    const createdAt=now();
    if(existingId){
      const index=items.findIndex(item=>item.id===existingId);
      if(index>=0){
        const current=items[index];
        const versions=Array.isArray(current.versions)?current.versions:[];
        const version={id:'local_version_'+Date.now(),version:versions.length+1,content:data.content,change_note:'Saved from MMIR web UI',variables:data.variables,model_hint:data.model_hint,created_at:createdAt};
        items[index]={...current,...data,active_version:version.version,versions:versions.concat(version),updated_at:createdAt};
        writeLocalPrompts(items);
        return items[index];
      }
    }
    const firstVersion={id:'local_version_'+Date.now(),version:1,content:data.content,change_note:'Initial local version',variables:data.variables,model_hint:data.model_hint,created_at:createdAt};
    const prompt={id:'local_prompt_'+Date.now(),...data,active_version:1,versions:[firstVersion],created_at:createdAt,updated_at:createdAt};
    writeLocalPrompts([prompt].concat(items));
    return prompt;
  }
  function matchPrompt(prompt,query){
    if(!query)return true;
    const haystack=[prompt.name,prompt.description,prompt.type,(prompt.tags||[]).join(' '),(prompt.variables||[]).join(' '),latestVersion(prompt)?.content].join(' ').toLowerCase();
    return haystack.includes(query.toLowerCase());
  }
  function renderStarters(){
    if(!starterEl)return;
    starterEl.innerHTML=starterPrompts().map(starter=>''+
      '<button type="button" class="prompt-starter-card" data-action="starter" data-id="'+safe(starter.id)+'">'+
        '<strong>'+safe(starter.name)+'</strong>'+
        '<span>'+safe(starter.description)+'</span>'+
        '<small>'+safe(starter.tags.join(', '))+'</small>'+
      '</button>').join('');
    starterEl.querySelectorAll('[data-action="starter"]').forEach(button=>button.addEventListener('click',()=>useStarter(button.dataset.id)));
  }
  function promptCard(prompt){
    const version=latestVersion(prompt)||{};
    const tagHtml=(prompt.tags||[]).map(tag=>'<span>'+safe(tag)+'</span>').join('');
    const vars=(prompt.variables||version.variables||[]).join(', ');
    return ''+
      '<article class="prompt-card" data-source="'+safe(prompt.source||'local')+'">'+
        '<header><div><strong>'+safe(prompt.name)+'</strong><small>'+safe(prompt.type)+' - '+safe(prompt.source||'local')+' - v'+String(prompt.active_version)+' / '+String(prompt.version_count)+'</small></div></header>'+
        '<p>'+safe(prompt.description||String(version.content||'').slice(0,180))+'</p>'+
        '<div class="prompt-tags">'+tagHtml+'</div>'+
        '<small class="prompt-meta">Variables: '+safe(vars||'none')+' - Model hint: '+safe(prompt.model_hint||version.model_hint||'auto')+'</small>'+
        '<div class="runtime-message-actions">'+
          '<button type="button" data-action="insert" data-id="'+safe(prompt.id)+'">Insert</button>'+
          '<button type="button" data-action="edit" data-id="'+safe(prompt.id)+'">Edit</button>'+
          '<button type="button" data-action="version" data-id="'+safe(prompt.id)+'">New version</button>'+
          '<button type="button" data-action="copy" data-id="'+safe(prompt.id)+'">Copy</button>'+
        '</div>'+
      '</article>';
  }
  function render(){
    if(!listEl)return;
    const query=String(searchEl?.value||'').trim();
    const visible=prompts.filter(prompt=>matchPrompt(prompt,query));
    if(!visible.length){
      listEl.innerHTML='<p class="empty-backends">No matching prompts yet. Use a starter or save the current chat prompt.</p>';
      return;
    }
    listEl.innerHTML=visible.map(promptCard).join('');
    listEl.querySelectorAll('[data-action="insert"]').forEach(button=>button.addEventListener('click',()=>insertPrompt(button.dataset.id)));
    listEl.querySelectorAll('[data-action="edit"]').forEach(button=>button.addEventListener('click',()=>editPrompt(button.dataset.id,false)));
    listEl.querySelectorAll('[data-action="version"]').forEach(button=>button.addEventListener('click',()=>editPrompt(button.dataset.id,true)));
    listEl.querySelectorAll('[data-action="copy"]').forEach(button=>button.addEventListener('click',()=>copyPrompt(button.dataset.id)));
  }
  function loadLocal(){
    prompts=readLocalPrompts().map(prompt=>normalizePrompt(prompt,'local'));
    render();
    setStatus(prompts.length?'Local prompt library loaded.':'Local prompt library ready.','ready');
  }
  async function resolvePrompt(id){
    const prompt=prompts.find(item=>item.id===id);
    if(!prompt)return null;
    const version=latestVersion(prompt);
    if(prompt.source!=='backend'||version?.content)return prompt;
    const data=await request('/prompts/'+encodeURIComponent(id),{method:'GET',timeoutMs:8000});
    const loaded=normalizePrompt(data?.data||prompt,'backend');
    prompts=prompts.map(item=>item.id===id&&item.source==='backend'?loaded:item);
    return loaded;
  }
  async function loadPrompts(){
    setStatus('Loading prompts...','loading');
    try{
      if(activeConnection()){
        const data=await request('/prompts?workspace_id='+encodeURIComponent(workspaceId()),{method:'GET',timeoutMs:8000});
        const backendPrompts=(Array.isArray(data?.data)?data.data:[]).map(prompt=>normalizePrompt(prompt,'backend'));
        const localPrompts=readLocalPrompts().map(prompt=>normalizePrompt(prompt,'local'));
        prompts=backendPrompts.concat(localPrompts);
        render();
        setStatus('Backend and local prompts loaded.','ready');
        return;
      }
      loadLocal();
    }catch(error){
      loadLocal();
      setStatus('Backend prompt library unavailable. Showing local prompts.','ready');
    }
  }
  async function editPrompt(id,forVersion){
    let loaded=null;
    try{
      loaded=await resolvePrompt(id);
    }catch(error){
      setStatus(api.friendlyError(error),'error');
      return;
    }
    if(!loaded)return;
    fillForm(loaded,latestVersion(loaded)?.content||'');
    selectedPromptId=forVersion?String(loaded.id||''):'';
    selectedSource=loaded.source||'local';
    if(promptEl)promptEl.value=latestVersion(loaded)?.content||'';
    setStatus(forVersion?'Editing a new prompt version.':'Prompt loaded for editing and chat insert.','ready');
  }
  function applyVariables(content,variables){
    const current=String(promptEl?.value||'').trim();
    let output=String(content||'');
    const replacements={input:current||'[input]',task:current||'[task]',goal:'[goal]',context:current||'[context]'};
    (variables||[]).forEach(variable=>{
      const key=String(variable||'').trim();
      if(!key)return;
      const value=replacements[key]||('['+key+']');
      output=output.replace(new RegExp('{{\\s*'+key.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\s*}}','gi'),value);
    });
    return output;
  }
  async function insertPrompt(id){
    let prompt=null;
    try{
      prompt=await resolvePrompt(id);
    }catch(error){
      setStatus(api.friendlyError(error),'error');
      return;
    }
    const version=latestVersion(prompt);
    if(!prompt||!version)return;
    const content=applyVariables(version.content,prompt.variables||version.variables);
    if(promptEl){
      promptEl.value=content;
      promptEl.dispatchEvent(new Event('input',{bubbles:true}));
      promptEl.focus();
    }
    setStatus('Prompt inserted into chat.','ready');
  }
  async function copyPrompt(id){
    let prompt=null;
    try{
      prompt=await resolvePrompt(id);
    }catch(error){
      setStatus(api.friendlyError(error),'error');
      return;
    }
    const content=latestVersion(prompt)?.content||'';
    if(!content)return;
    try{
      await navigator.clipboard.writeText(content);
      setStatus('Prompt copied.','ready');
    }catch(error){
      setStatus('Clipboard is unavailable in this browser.','error');
    }
  }
  function useStarter(id){
    const starter=starterPrompts().find(item=>item.id===id);
    if(!starter)return;
    fillForm(starter,starter.content);
    selectedPromptId='';
    selectedSource='local';
    if(promptEl){
      promptEl.value=applyVariables(starter.content,starter.variables);
      promptEl.focus();
    }
    setStatus('Starter prompt loaded. Save it or use it directly in chat.','ready');
  }
  async function savePrompt(){
    const data=collectForm();
    if(!data.content){setStatus('Write a prompt first.','error');return;}
    setStatus('Saving prompt...','loading');
    try{
      if(activeConnection()&&selectedSource!=='local'){
        if(selectedPromptId){
          await request('/prompts/'+encodeURIComponent(selectedPromptId)+'/versions',{
            method:'POST',
            timeoutMs:10000,
            body:JSON.stringify({content:data.content,change_note:'Saved from MMIR web UI',variables:data.variables,model_hint:data.model_hint})
          });
        }else{
          await request('/prompts',{
            method:'POST',
            timeoutMs:10000,
            body:JSON.stringify(data)
          });
        }
      }else{
        saveLocalPrompt(data,selectedPromptId&&selectedSource==='local'?selectedPromptId:'');
      }
      selectedPromptId='';
      selectedSource='local';
      await loadPrompts();
      setStatus('Prompt saved.','ready');
    }catch(error){
      saveLocalPrompt(data,selectedPromptId&&selectedSource==='local'?selectedPromptId:'');
      await loadPrompts();
      setStatus('Saved locally because backend save failed.','ready');
    }
  }
  function install(){
    if(document.getElementById('prompt-registry-panel'))return;
    const details=document.createElement('details');
    details.id='prompt-registry-panel';
    details.className='model-catalog-hint memory-panel prompt-registry-panel';
    details.innerHTML=''+
      '<summary>+ Prompts</summary>'+
      '<div class="memory-body prompt-registry-body">'+
        '<div id="prompt-starter-grid" class="prompt-starter-grid" aria-label="Prompt starters"></div>'+
        '<div class="workflow-builder-row">'+
          '<label for="prompt-registry-name">Name<input id="prompt-registry-name" type="text" maxlength="80" placeholder="Reusable prompt name" /></label>'+
          '<label for="prompt-registry-type">Type<select id="prompt-registry-type"><option value="chat">Chat</option><option value="role">Role</option><option value="workflow">Workflow</option><option value="agent">Agent</option><option value="system">System</option><option value="template">Template</option></select></label>'+
        '</div>'+
        '<label for="prompt-registry-description">Description<input id="prompt-registry-description" type="text" maxlength="240" placeholder="What this prompt is good for" /></label>'+
        '<div class="workflow-builder-row">'+
          '<label for="prompt-registry-tags">Tags<input id="prompt-registry-tags" type="text" maxlength="200" placeholder="security, growth, workflow" /></label>'+
          '<label for="prompt-registry-variables">Variables<input id="prompt-registry-variables" type="text" maxlength="240" placeholder="input, goal, context" /></label>'+
        '</div>'+
        '<label for="prompt-registry-model-hint">Model hint<input id="prompt-registry-model-hint" type="text" maxlength="120" placeholder="auto, coder, strategist, local small model" /></label>'+
        '<label for="prompt-registry-content">Prompt<textarea id="prompt-registry-content" rows="5" maxlength="8000" placeholder="Use {{input}}, {{goal}} or custom variables for quick reuse."></textarea></label>'+
        '<div class="workflow-builder-actions">'+
          '<button id="prompt-registry-save" type="button">Save prompt</button>'+
          '<button id="prompt-registry-refresh" type="button">Refresh</button>'+
          '<button id="prompt-registry-load-local" type="button">Local library</button>'+
        '</div>'+
        '<label for="prompt-registry-search">Search prompts<input id="prompt-registry-search" type="search" placeholder="Search by name, tag, variable or text" /></label>'+
        '<p id="prompt-registry-status" class="dashboard-note" aria-live="polite"></p>'+
        '<div id="prompt-registry-list" class="prompt-list" aria-live="polite"></div>'+
      '</div>';
    host.appendChild(details);
    listEl=document.getElementById('prompt-registry-list');
    starterEl=document.getElementById('prompt-starter-grid');
    statusEl=document.getElementById('prompt-registry-status');
    nameEl=document.getElementById('prompt-registry-name');
    typeEl=document.getElementById('prompt-registry-type');
    descriptionEl=document.getElementById('prompt-registry-description');
    tagsEl=document.getElementById('prompt-registry-tags');
    variablesEl=document.getElementById('prompt-registry-variables');
    modelHintEl=document.getElementById('prompt-registry-model-hint');
    contentEl=document.getElementById('prompt-registry-content');
    searchEl=document.getElementById('prompt-registry-search');
    document.getElementById('prompt-registry-save')?.addEventListener('click',savePrompt);
    document.getElementById('prompt-registry-refresh')?.addEventListener('click',loadPrompts);
    document.getElementById('prompt-registry-load-local')?.addEventListener('click',loadLocal);
    searchEl?.addEventListener('input',render);
    renderStarters();
    loadLocal();
  }

  window.addEventListener('mmir-workspace-changed',()=>{prompts=[];selectedPromptId='';selectedSource='local';loadLocal();});
  window.addEventListener('mmir-backend-profiles-updated',loadPrompts);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
