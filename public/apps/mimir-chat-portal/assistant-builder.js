(function(){
  const api=window.MimirApiClient;
  const ACTIVE_WORKSPACE_KEY='mimir-active-workspace-v1';
  const DEFAULT_WORKSPACE_ID='personal';
  const ASSISTANT_PREFIX='mimir-assistants-v1:';
  const ACTIVE_ASSISTANT_PREFIX='mimir-active-assistant-v1:';
  const RUNTIME_SETTINGS_KEY='mimir-runtime-settings-v1';
  const host=document.querySelector('#multi-model-workspace .mimir-dashboard');
  const promptEl=document.getElementById('mimir-prompt');
  let listEl=null;
  let statusEl=null;
  let nameEl=null;
  let roleEl=null;
  let modelInputEl=null;
  let routeEl=null;
  let toolsEl=null;
  let knowledgeModeEl=null;
  let collectionsEl=null;
  let memoryEl=null;
  let filesEl=null;
  let sharingEl=null;
  let exportEl=null;
  let tagsEl=null;
  let descriptionEl=null;
  let instructionsEl=null;
  let searchEl=null;
  let selectedId='';
  let assistants=[];

  if(!host||!api)return;

  function workspaceId(){return localStorage.getItem(ACTIVE_WORKSPACE_KEY)||DEFAULT_WORKSPACE_ID;}
  function runtimeModelEl(){return document.getElementById('runtime-model');}
  function localKey(){return ASSISTANT_PREFIX+workspaceId();}
  function activeAssistantKey(){return ACTIVE_ASSISTANT_PREFIX+workspaceId();}
  function safe(value){return String(value||'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));}
  function clean(value,fallback='',max=240){
    const cleaned=String(value||'').replace(/\s+/g,' ').trim().slice(0,max);
    return cleaned||fallback;
  }
  function cleanText(value,max=8000){return String(value||'').trim().slice(0,max);}
  function splitList(value,max=20){return String(value||'').split(',').map(item=>clean(item,'',96)).filter(Boolean).slice(0,max);}
  function now(){return new Date().toISOString();}
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
  function readLocalAssistants(){
    try{
      const value=JSON.parse(localStorage.getItem(localKey())||'[]');
      return Array.isArray(value)?value:[];
    }catch(error){
      return [];
    }
  }
  function writeLocalAssistants(items){
    localStorage.setItem(localKey(),JSON.stringify(items.slice(0,100)));
    window.dispatchEvent(new CustomEvent('mmir-assistants-updated',{detail:{workspace_id:workspaceId(),count:items.length}}));
  }
  function hasSecretLikeText(value){
    return /(sk-[A-Za-z0-9_-]{20,}|ghp_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,}|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----|Bearer\s+[A-Za-z0-9._-]{20,})/.test(String(value||''));
  }
  function starterAssistants(){
    return [
      {
        id:'starter-mmir-guide',
        name:'MMIR Guide',
        role:'general',
        model:'mmir-guide',
        model_route:'free-local-first',
        tools:['knowledge.search','memory.search'],
        tags:['onboarding','free-first'],
        description:'Helps a new user get useful value before setup.',
        instructions:'You are MMIR Guide. Help the user get useful value immediately, prefer free local routes, explain one next action at a time, and never ask for provider keys in the public frontend.'
      },
      {
        id:'starter-security-reviewer',
        name:'Zero-trust reviewer',
        role:'critic',
        model:'auto',
        model_route:'free-local-first',
        tools:['knowledge.search','memory.search'],
        tags:['security','architecture'],
        description:'Reviews public/private boundaries, secrets, auth and cost gates.',
        instructions:'Review the request with zero-trust discipline. Check frontend/backend separation, secrets, paid routes, auth, CORS, audit logs, local node exposure and user data retention. Return prioritized fixes.'
      },
      {
        id:'starter-growth-strategist',
        name:'Growth strategist',
        role:'strategist',
        model:'auto',
        model_route:'free-local-first',
        tools:['knowledge.search','web.search'],
        tags:['growth','revenue'],
        description:'Turns product work into user activation and revenue experiments.',
        instructions:'Act as a practical MMIR growth strategist. Prioritize free activation, user trust, simple onboarding, marketplace potential and premium boundaries. Give a concrete ordered plan.'
      },
      {
        id:'starter-code-architect',
        name:'Code architect',
        role:'architect',
        model:'auto',
        model_route:'free-local-first',
        tools:['knowledge.search'],
        tags:['code','architecture'],
        description:'Helps maintain scalable, testable MMIR architecture.',
        instructions:'Act as a senior MMIR code architect. Keep changes small, testable and aligned with the trusted orchestration layer. Preserve public-safe boundaries and document contracts when needed.'
      }
    ];
  }
  function normalizeAssistant(item,source='local'){
    if(!item)return null;
    const knowledge=item.knowledge_scope||{};
    const sharing=item.sharing||{};
    return {
      id:String(item.id||('local_assistant_'+Date.now())),
      backendId:String(item.backendId||item.backend_id||(!String(item.id||'').startsWith('local_')&&source==='backend'?item.id:'')),
      source,
      workspace_id:item.workspace_id||workspaceId(),
      name:clean(item.name,'MMIR assistant',160),
      description:cleanText(item.description,1000),
      role:clean(item.role,'custom',48),
      instructions:cleanText(item.instructions||item.system_prompt,8000),
      model:clean(item.model,'auto',160),
      model_route:clean(item.model_route,'free-local-first',120),
      tools:Array.isArray(item.tools)?item.tools:splitList(item.tools,20),
      knowledge_scope:{
        mode:clean(knowledge.mode,'workspace',48),
        collection_ids:Array.isArray(knowledge.collection_ids)?knowledge.collection_ids:splitList(knowledge.collection_ids||knowledge.collections,12),
        include_memory:knowledge.include_memory!==false,
        include_files:knowledge.include_files!==false
      },
      runtime_settings:item.runtime_settings||{temperature:0.4,max_tokens:1200,context_length:8192,route_preference:'free-local-first'},
      sharing:{
        visibility:clean(sharing.visibility,'private',48),
        export_allowed:sharing.export_allowed!==false,
        marketplace_ready:false,
        public_link_allowed:false,
        secret_boundary:'no provider keys, tokens, private documents or billing data in assistant definitions'
      },
      tags:Array.isArray(item.tags)?item.tags:splitList(item.tags,16),
      version:Number(item.version||1),
      syncState:item.syncState||item.sync_state||(source==='backend'?'synced':'local'),
      syncError:item.syncError||'',
      created_at:item.created_at||item.createdAt||now(),
      updated_at:item.updated_at||item.updatedAt||now()
    };
  }
  function collectForm(){
    const data={
      workspace_id:workspaceId(),
      name:clean(nameEl?.value,'MMIR assistant',160),
      description:cleanText(descriptionEl?.value,1000),
      role:clean(roleEl?.value,'custom',48),
      instructions:cleanText(instructionsEl?.value,8000),
      model:clean(modelInputEl?.value||runtimeModelEl()?.value,'auto',160),
      model_route:clean(routeEl?.value,'free-local-first',120),
      tools:splitList(toolsEl?.value,20),
      knowledge_scope:{
        mode:clean(knowledgeModeEl?.value,'workspace',48),
        collection_ids:splitList(collectionsEl?.value,12),
        include_memory:Boolean(memoryEl?.checked),
        include_files:Boolean(filesEl?.checked)
      },
      runtime_settings:{temperature:0.4,max_tokens:1200,context_length:8192,route_preference:clean(routeEl?.value,'free-local-first',120)},
      sharing:{
        visibility:clean(sharingEl?.value,'private',48),
        export_allowed:Boolean(exportEl?.checked),
        marketplace_ready:false,
        public_link_allowed:false
      },
      tags:splitList(tagsEl?.value,16)
    };
    return data;
  }
  function fillForm(item){
    const assistant=normalizeAssistant(item||{},'local');
    if(nameEl)nameEl.value=assistant.name||'';
    if(roleEl)roleEl.value=assistant.role||'custom';
    if(modelInputEl)modelInputEl.value=assistant.model||'auto';
    if(routeEl)routeEl.value=assistant.model_route||'free-local-first';
    if(toolsEl)toolsEl.value=(assistant.tools||[]).join(', ');
    if(knowledgeModeEl)knowledgeModeEl.value=assistant.knowledge_scope.mode||'workspace';
    if(collectionsEl)collectionsEl.value=(assistant.knowledge_scope.collection_ids||[]).join(', ');
    if(memoryEl)memoryEl.checked=assistant.knowledge_scope.include_memory!==false;
    if(filesEl)filesEl.checked=assistant.knowledge_scope.include_files!==false;
    if(sharingEl)sharingEl.value=assistant.sharing.visibility||'private';
    if(exportEl)exportEl.checked=assistant.sharing.export_allowed!==false;
    if(tagsEl)tagsEl.value=(assistant.tags||[]).join(', ');
    if(descriptionEl)descriptionEl.value=assistant.description||'';
    if(instructionsEl)instructionsEl.value=assistant.instructions||'';
  }
  function saveLocalAssistant(data,existingId=''){
    const items=readLocalAssistants();
    const normalized=normalizeAssistant({...data,id:existingId||('local_assistant_'+Date.now()),updated_at:now()},'local');
    const index=items.findIndex(item=>item.id===existingId);
    if(index>=0){
      const current=normalizeAssistant(items[index],'local');
      items[index]={...current,...normalized,backendId:current.backendId||normalized.backendId,version:(current.version||1)+1,syncState:'local',updated_at:now()};
    }else{
      items.unshift({...normalized,created_at:now(),updated_at:now(),syncState:'local'});
    }
    writeLocalAssistants(items);
    return index>=0?items[index]:items[0];
  }
  function matchAssistant(assistant,query){
    if(!query)return true;
    const haystack=[assistant.name,assistant.description,assistant.role,assistant.model,assistant.model_route,(assistant.tools||[]).join(' '),(assistant.tags||[]).join(' '),assistant.instructions].join(' ').toLowerCase();
    return haystack.includes(query.toLowerCase());
  }
  function assistantCard(assistant){
    const scope=assistant.knowledge_scope||{};
    const share=assistant.sharing||{};
    const tools=(assistant.tools||[]).slice(0,4).join(', ')||'none';
    const tags=(assistant.tags||[]).map(tag=>'<span>'+safe(tag)+'</span>').join('');
    return ''+
      '<article class="assistant-card" data-assistant-source="'+safe(assistant.source||'local')+'">'+
        '<header><div><strong>'+safe(assistant.name)+'</strong><small>'+safe(assistant.role)+' - '+safe(assistant.model)+' - '+safe(assistant.syncState||assistant.source)+'</small></div><em>'+safe(share.visibility||'private')+'</em></header>'+
        '<p>'+safe(assistant.description||assistant.instructions.slice(0,180))+'</p>'+
        '<div class="assistant-tags">'+tags+'</div>'+
        '<small class="assistant-meta">Tools: '+safe(tools)+' - Knowledge: '+safe(scope.mode||'workspace')+' - Route: '+safe(assistant.model_route||'free-local-first')+'</small>'+
        '<div class="runtime-message-actions">'+
          '<button type="button" data-assistant-action="apply" data-id="'+safe(assistant.id)+'">Use</button>'+
          '<button type="button" data-assistant-action="edit" data-id="'+safe(assistant.id)+'">Edit</button>'+
          '<button type="button" data-assistant-action="duplicate" data-id="'+safe(assistant.id)+'">Duplicate</button>'+
          '<button type="button" data-assistant-action="copy" data-id="'+safe(assistant.id)+'">Copy</button>'+
          '<button type="button" data-assistant-action="delete" data-id="'+safe(assistant.id)+'">Delete</button>'+
        '</div>'+
      '</article>';
  }
  function renderStarters(){
    const root=document.getElementById('assistant-starter-grid');
    if(!root)return;
    root.innerHTML=starterAssistants().map(starter=>''+
      '<button type="button" class="assistant-starter-card" data-assistant-starter="'+safe(starter.id)+'">'+
        '<strong>'+safe(starter.name)+'</strong>'+
        '<span>'+safe(starter.description)+'</span>'+
        '<small>'+safe(starter.role)+' - '+safe(starter.model_route)+'</small>'+
      '</button>').join('');
    root.querySelectorAll('[data-assistant-starter]').forEach(button=>button.addEventListener('click',()=>useStarter(button.dataset.assistantStarter)));
  }
  function render(){
    if(!listEl)return;
    const query=String(searchEl?.value||'').trim();
    const visible=assistants.filter(item=>matchAssistant(item,query));
    if(!visible.length){
      listEl.innerHTML='<p class="empty-backends">No assistants yet. Use a starter or save your own assistant.</p>';
      return;
    }
    listEl.innerHTML=visible.map(assistantCard).join('');
    listEl.querySelectorAll('[data-assistant-action="apply"]').forEach(button=>button.addEventListener('click',()=>applyAssistant(button.dataset.id)));
    listEl.querySelectorAll('[data-assistant-action="edit"]').forEach(button=>button.addEventListener('click',()=>editAssistant(button.dataset.id)));
    listEl.querySelectorAll('[data-assistant-action="duplicate"]').forEach(button=>button.addEventListener('click',()=>duplicateAssistant(button.dataset.id)));
    listEl.querySelectorAll('[data-assistant-action="copy"]').forEach(button=>button.addEventListener('click',()=>copyAssistant(button.dataset.id)));
    listEl.querySelectorAll('[data-assistant-action="delete"]').forEach(button=>button.addEventListener('click',()=>deleteAssistant(button.dataset.id)));
  }
  function loadLocal(){
    assistants=readLocalAssistants().map(item=>normalizeAssistant(item,'local')).filter(Boolean);
    render();
    setStatus(assistants.length?'Local assistant library loaded.':'Local assistant library ready.','ready');
  }
  async function loadAssistants(){
    try{
      if(activeConnection()){
        setStatus('Loading assistants...','loading');
        const data=await request('/assistants?workspace_id='+encodeURIComponent(workspaceId()),{method:'GET',timeoutMs:8000});
        const backend=(Array.isArray(data?.data)?data.data:[]).map(item=>normalizeAssistant(item,'backend')).filter(Boolean);
        const local=readLocalAssistants().map(item=>normalizeAssistant(item,'local')).filter(Boolean);
        const backendIds=new Set(backend.map(item=>item.id));
        assistants=backend.concat(local.filter(item=>!item.backendId||!backendIds.has(item.backendId)));
        render();
        setStatus('Backend and local assistants loaded.','ready');
        return;
      }
    }catch(error){
      setStatus('Backend assistant library unavailable. Showing local assistants.','ready');
    }
    loadLocal();
  }
  function currentAssistant(id){return assistants.find(item=>item.id===id)||readLocalAssistants().map(item=>normalizeAssistant(item,'local')).find(item=>item.id===id)||null;}
  async function syncAssistant(localAssistant){
    if(!activeConnection())return localAssistant;
    const body=JSON.stringify(localAssistant);
    const data=localAssistant.backendId
      ? await request('/assistants/'+encodeURIComponent(localAssistant.backendId),{method:'PATCH',timeoutMs:10000,body})
      : await request('/assistants',{method:'POST',timeoutMs:10000,body});
    return normalizeAssistant({...localAssistant,...(data?.data||{}),backendId:data?.data?.id,syncState:'synced',syncError:''},'local');
  }
  async function saveAssistant(){
    const data=collectForm();
    if(!data.instructions){setStatus('Write assistant instructions first.','error');return;}
    if(hasSecretLikeText(JSON.stringify(data))){setStatus('Assistant blocked: remove provider keys, tokens or secrets.','error');return;}
    const saved=saveLocalAssistant(data,selectedId);
    selectedId='';
    loadLocal();
    if(activeConnection()){
      try{
        const synced=await syncAssistant(normalizeAssistant(saved,'local'));
        const items=readLocalAssistants().map(item=>item.id===saved.id?synced:item);
        writeLocalAssistants(items);
        await loadAssistants();
        setStatus('Assistant saved and synced to protected backend.','ready');
      }catch(error){
        setStatus('Assistant saved locally. Backend sync can retry later.','ready');
      }
    }else{
      setStatus('Assistant saved locally. Activate a backend to sync later.','ready');
    }
  }
  function editAssistant(id){
    const assistant=currentAssistant(id);
    if(!assistant)return;
    selectedId=assistant.id;
    fillForm(assistant);
    setStatus('Assistant loaded for editing.','ready');
  }
  function duplicateAssistant(id){
    const assistant=currentAssistant(id);
    if(!assistant)return;
    const copy={...assistant,id:'local_assistant_'+Date.now(),backendId:'',name:assistant.name+' copy',syncState:'local',created_at:now(),updated_at:now()};
    writeLocalAssistants([copy].concat(readLocalAssistants()));
    loadLocal();
    setStatus('Assistant duplicated locally.','ready');
  }
  async function copyAssistant(id){
    const assistant=currentAssistant(id);
    if(!assistant)return;
    try{
      await navigator.clipboard.writeText(JSON.stringify(assistant,null,2));
      setStatus('Assistant JSON copied.','ready');
    }catch(error){
      setStatus('Clipboard is unavailable in this browser.','error');
    }
  }
  async function deleteAssistant(id){
    const assistant=currentAssistant(id);
    if(!assistant)return;
    if(assistant.backendId&&activeConnection()){
      try{
        await request('/assistants/'+encodeURIComponent(assistant.backendId),{method:'DELETE',timeoutMs:8000});
      }catch(error){
        setStatus(api.friendlyError(error),'error');
        return;
      }
    }
    writeLocalAssistants(readLocalAssistants().filter(item=>item.id!==id));
    if(localStorage.getItem(activeAssistantKey())===id)localStorage.removeItem(activeAssistantKey());
    loadLocal();
    setStatus('Assistant deleted.','ready');
  }
  function applyAssistant(id){
    const assistant=currentAssistant(id);
    if(!assistant)return;
    localStorage.setItem(activeAssistantKey(),JSON.stringify(assistant));
    let savedSettings={};
    try{savedSettings=JSON.parse(localStorage.getItem(RUNTIME_SETTINGS_KEY)||'{}');}catch(error){savedSettings={};}
    const runtime=assistant.runtime_settings||{};
    const next={
      ...savedSettings,
      temperature:Number(runtime.temperature||savedSettings.temperature||0.4),
      max_tokens:Number(runtime.max_tokens||savedSettings.max_tokens||1200),
      context_length:Number(runtime.context_length||savedSettings.context_length||8192),
      system_prompt:assistant.instructions.slice(0,1200)
    };
    localStorage.setItem(RUNTIME_SETTINGS_KEY,JSON.stringify(next));
    const modelEl=runtimeModelEl();
    if(modelEl&&assistant.model&&assistant.model!=='auto'){
      const option=Array.from(modelEl.options||[]).find(item=>item.value===assistant.model);
      if(option){
        modelEl.value=assistant.model;
        modelEl.dispatchEvent(new Event('change',{bubbles:true}));
      }
    }
    if(promptEl&&!String(promptEl.value||'').trim()){
      promptEl.value='Use '+assistant.name+' for this task: ';
      promptEl.focus();
    }
    window.dispatchEvent(new CustomEvent('mmir-runtime-settings-updated',{detail:next}));
    window.dispatchEvent(new CustomEvent('mmir-assistant-applied',{detail:{workspace_id:workspaceId(),assistant}}));
    setStatus('Assistant applied to chat, model preference and runtime instructions.','ready');
  }
  function useStarter(id){
    const starter=starterAssistants().find(item=>item.id===id);
    if(!starter)return;
    selectedId='';
    fillForm({
      ...starter,
      knowledge_scope:{mode:'workspace',include_memory:true,include_files:true},
      sharing:{visibility:'private',export_allowed:true},
      runtime_settings:{temperature:0.4,max_tokens:1200,context_length:8192,route_preference:'free-local-first'}
    });
    setStatus('Assistant starter loaded. Save it or use it after saving.','ready');
  }
  function modelOptionsText(){
    const options=Array.from(runtimeModelEl()?.options||[]).map(option=>option.value).filter(Boolean).slice(0,8);
    return options.length?'Live choices: '+options.join(', '):'Use auto until a local/backend model is live.';
  }
  function install(){
    if(document.getElementById('assistant-builder-panel'))return;
    const details=document.createElement('details');
    details.id='assistant-builder-panel';
    details.className='model-catalog-hint assistant-builder-panel';
    details.innerHTML=''+
      '<summary>+ Assistants</summary>'+
      '<div class="assistant-builder-body">'+
        '<div id="assistant-starter-grid" class="assistant-starter-grid" aria-label="Assistant starters"></div>'+
        '<div class="workflow-builder-row">'+
          '<label for="assistant-name">Name<input id="assistant-name" type="text" maxlength="120" placeholder="MMIR guide, coder, security reviewer" /></label>'+
          '<label for="assistant-role">Role<select id="assistant-role"><option value="general">General</option><option value="researcher">Researcher</option><option value="architect">Architect</option><option value="critic">Critic</option><option value="coder">Coder</option><option value="analyst">Analyst</option><option value="strategist">Strategist</option><option value="synthesizer">Synthesizer</option><option value="custom">Custom</option></select></label>'+
        '</div>'+
        '<label for="assistant-description">Description<input id="assistant-description" type="text" maxlength="400" placeholder="What this assistant is good for" /></label>'+
        '<div class="workflow-builder-row">'+
          '<label for="assistant-model">Model preference<input id="assistant-model" type="text" maxlength="160" placeholder="auto, mmir-guide or a live/local model id" /></label>'+
          '<label for="assistant-route">Route<select id="assistant-route"><option value="free-local-first">Free/local first</option><option value="browser-guide">Browser guide</option><option value="local-node">Local node</option><option value="protected-backend">Protected backend</option><option value="blocked-paid">Blocked paid</option></select></label>'+
        '</div>'+
        '<p class="assistant-model-hint">'+safe(modelOptionsText())+'</p>'+
        '<label for="assistant-tools">Allowed tools<input id="assistant-tools" type="text" maxlength="400" placeholder="knowledge.search, memory.search, web.search" /></label>'+
        '<div class="workflow-builder-row">'+
          '<label for="assistant-knowledge-mode">Knowledge<select id="assistant-knowledge-mode"><option value="workspace">Workspace knowledge</option><option value="collections">Selected collections</option><option value="none">No knowledge</option></select></label>'+
          '<label for="assistant-collections">Collection IDs<input id="assistant-collections" type="text" maxlength="400" placeholder="collection-a, collection-b" /></label>'+
        '</div>'+
        '<div class="assistant-toggle-row">'+
          '<label><input id="assistant-include-memory" type="checkbox" checked /> Memory</label>'+
          '<label><input id="assistant-include-files" type="checkbox" checked /> Files</label>'+
          '<label><input id="assistant-export-allowed" type="checkbox" checked /> Exportable</label>'+
        '</div>'+
        '<div class="workflow-builder-row">'+
          '<label for="assistant-sharing">Sharing<select id="assistant-sharing"><option value="private">Private</option><option value="workspace">Workspace</option><option value="unlisted-template">Unlisted template</option></select></label>'+
          '<label for="assistant-tags">Tags<input id="assistant-tags" type="text" maxlength="240" placeholder="security, growth, local" /></label>'+
        '</div>'+
        '<label for="assistant-instructions">Instructions<textarea id="assistant-instructions" rows="5" maxlength="8000" placeholder="Define how this assistant should think, answer and use MMIR safely. Do not paste provider keys or secrets."></textarea></label>'+
        '<div class="workflow-builder-actions">'+
          '<button id="assistant-save" type="button">Save assistant</button>'+
          '<button id="assistant-refresh" type="button">Refresh</button>'+
          '<button id="assistant-load-local" type="button">Local library</button>'+
          '<button id="assistant-apply-form" type="button">Use form</button>'+
        '</div>'+
        '<label for="assistant-search">Search assistants<input id="assistant-search" type="search" placeholder="Search by role, model, tool or instruction" /></label>'+
        '<p id="assistant-status" class="dashboard-note" aria-live="polite"></p>'+
        '<div class="assistant-policy-note">Private by default. Provider keys, tokens, billing approvals and private runtime endpoints stay outside public frontend storage.</div>'+
        '<div id="assistant-list" class="assistant-list" aria-live="polite"></div>'+
      '</div>';
    host.appendChild(details);
    listEl=document.getElementById('assistant-list');
    statusEl=document.getElementById('assistant-status');
    nameEl=document.getElementById('assistant-name');
    roleEl=document.getElementById('assistant-role');
    modelInputEl=document.getElementById('assistant-model');
    routeEl=document.getElementById('assistant-route');
    toolsEl=document.getElementById('assistant-tools');
    knowledgeModeEl=document.getElementById('assistant-knowledge-mode');
    collectionsEl=document.getElementById('assistant-collections');
    memoryEl=document.getElementById('assistant-include-memory');
    filesEl=document.getElementById('assistant-include-files');
    sharingEl=document.getElementById('assistant-sharing');
    exportEl=document.getElementById('assistant-export-allowed');
    tagsEl=document.getElementById('assistant-tags');
    descriptionEl=document.getElementById('assistant-description');
    instructionsEl=document.getElementById('assistant-instructions');
    searchEl=document.getElementById('assistant-search');
    document.getElementById('assistant-save')?.addEventListener('click',saveAssistant);
    document.getElementById('assistant-refresh')?.addEventListener('click',loadAssistants);
    document.getElementById('assistant-load-local')?.addEventListener('click',loadLocal);
    document.getElementById('assistant-apply-form')?.addEventListener('click',()=>{
      const data=collectForm();
      if(!data.instructions){setStatus('Write assistant instructions first.','error');return;}
      const temp=saveLocalAssistant(data,selectedId);
      loadLocal();
      applyAssistant(temp.id);
    });
    searchEl?.addEventListener('input',render);
    renderStarters();
    loadLocal();
  }

  window.addEventListener('mmir-workspace-changed',()=>{selectedId='';assistants=[];loadLocal();});
  window.addEventListener('mmir-backend-profiles-updated',loadAssistants);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
