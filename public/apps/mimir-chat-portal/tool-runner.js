(function(){
  const api=window.MimirApiClient;
  const ACTIVE_WORKSPACE_KEY='mimir-active-workspace-v1';
  const DEFAULT_WORKSPACE_ID='personal';
  const TOOL_GALLERY_PREFIX='mimir-tool-gallery-v1:';
  const host=document.querySelector('#multi-model-workspace .mimir-dashboard');
  let galleryEl=null;
  let toolEl=null;
  let queryEl=null;
  let providerEl=null;
  let consentEl=null;
  let statusEl=null;
  let outputEl=null;
  let tools=[];
  let connectors=[];

  if(!host||!api)return;

  function workspaceId(){return localStorage.getItem(ACTIVE_WORKSPACE_KEY)||DEFAULT_WORKSPACE_ID;}
  function galleryKey(){return TOOL_GALLERY_PREFIX+workspaceId();}
  function clean(value,max=1000){return String(value||'').replace(/\s+/g,' ').trim().slice(0,max);}
  function setStatus(message,state){if(statusEl){statusEl.textContent=message||'';statusEl.dataset.state=state||'idle';}}
  function activeConnection(){
    const profile=api.activeProfile();
    const url=api.cleanUrl(profile?.url);
    if(!profile||!url)return null;
    return {profile,url};
  }
  async function request(path,options={}){
    const connection=activeConnection();
    if(!connection)throw new Error('Activate a protected backend profile first.');
    const token=await api.pairIfNeeded(connection.profile,connection.url);
    return api.fetchJson(api.joinUrl(connection.url,path),{
      ...options,
      headers:{...api.authHeaders(token),...(options.headers||{})}
    });
  }
  function defaultTools(){
    return [
      {id:'knowledge.search',label:'Knowledge search',status:'backend required',category:'tool',trust_label:'protected backend',permissions:['knowledge:read','workspace:read'],install_state:'approved',disable_supported:true,public_frontend_secrets_allowed:false,description:'Search approved workspace knowledge.'},
      {id:'memory.search',label:'Memory search',status:'backend required',category:'tool',trust_label:'protected backend',permissions:['memory:read','workspace:read'],install_state:'approved',disable_supported:true,public_frontend_secrets_allowed:false,description:'Search enabled workspace memory.'},
      {id:'web.search',label:'Web search',status:'backend/manual',category:'tool',trust_label:'manual free or protected backend',permissions:['web:search'],install_state:'approved',disable_supported:true,public_frontend_secrets_allowed:false,description:'Run sourced search with consent.'}
    ];
  }

  function defaultConnectors(){
    return [
      {id:'connector.github',provider:'github',label:'GitHub sources',status:'backend required',category:'connector',trust_label:'user-approved content only',permissions:['repository:read-approved-text','issues:read-approved-text'],install_state:'approved',disable_supported:true,public_frontend_secrets_allowed:false,description:'Index approved GitHub text into protected knowledge.'},
      {id:'connector.notion',provider:'notion',label:'Notion / docs sources',status:'backend required',category:'connector',trust_label:'user-approved content only',permissions:['notion:read-approved-text'],install_state:'approved',disable_supported:true,public_frontend_secrets_allowed:false,description:'Index approved Notion/docs text into protected knowledge.'},
      {id:'connector.docs',provider:'docs',label:'Manual documents',status:'local/manual',category:'connector',trust_label:'local/manual source',permissions:['documents:read-approved-text'],install_state:'approved',disable_supported:true,public_frontend_secrets_allowed:false,description:'Index pasted documents after consent.'}
    ];
  }

  function readGalleryState(){
    try{
      const value=JSON.parse(localStorage.getItem(galleryKey())||'{}');
      return value&&typeof value==='object'&&!Array.isArray(value)?value:{};
    }catch(error){return {};}
  }

  function writeGalleryState(state){
    localStorage.setItem(galleryKey(),JSON.stringify(state));
    window.dispatchEvent(new CustomEvent('mmir-tool-gallery-updated',{detail:{workspaceId:workspaceId()}}));
  }

  function itemId(item){
    return clean(item.id||('connector.'+(item.provider||item.source_type||'unknown')),120);
  }

  function galleryStateFor(id){
    const state=readGalleryState();
    const item=state[id]||{};
    return {enabled:item.enabled!==false,updatedAt:item.updatedAt||''};
  }

  function isGalleryEnabled(id){
    return galleryStateFor(id).enabled;
  }

  function setGalleryEnabled(id,enabled){
    const state=readGalleryState();
    state[id]={enabled:enabled!==false,updatedAt:new Date().toISOString()};
    writeGalleryState(state);
  }

  function normalizeTool(tool){
    return {
      id:itemId(tool),
      kind:'tool',
      label:clean(tool.label||tool.id,120),
      status:clean(tool.status||'beta',80),
      trust_label:clean(tool.trust_label||tool.route||'protected backend',120),
      permissions:Array.isArray(tool.permissions)?tool.permissions.map(item=>clean(item,80)).filter(Boolean):[],
      install_state:clean(tool.install_state||'approved',80),
      disable_supported:tool.disable_supported!==false,
      public_frontend_secrets_allowed:tool.public_frontend_secrets_allowed===true,
      description:clean(tool.description||'',320),
      data_boundary:clean(tool.data_boundary||'',320)
    };
  }

  function normalizeConnector(connector){
    return {
      id:itemId(connector),
      kind:'connector',
      provider:clean(connector.provider||connector.source_type,80),
      label:clean(connector.label||connector.provider||connector.source_type||'Connector',120),
      status:clean(connector.status||'beta',80),
      trust_label:clean(connector.trust_label||'user-approved source',120),
      permissions:Array.isArray(connector.permissions)?connector.permissions.map(item=>clean(item,90)).filter(Boolean):[],
      install_state:clean(connector.install_state||'approved',80),
      disable_supported:connector.disable_supported!==false,
      public_frontend_secrets_allowed:connector.public_frontend_secrets_allowed===true||connector.stores_secrets===true,
      description:clean(connector.description||('Approved '+(connector.provider||'source')+' connector'),320),
      data_boundary:clean(connector.data_boundary||'',320)
    };
  }
  function renderToolOptions(){
    if(!toolEl)return;
    const previous=toolEl.value;
    const items=(tools.length?tools:defaultTools()).map(normalizeTool);
    toolEl.innerHTML='';
    items.forEach(tool=>{
      const option=document.createElement('option');
      option.value=tool.id;
      option.textContent=(tool.label||tool.id)+' - '+(isGalleryEnabled(tool.id)?(tool.status||'beta'):'disabled');
      toolEl.appendChild(option);
    });
    if(previous&&Array.from(toolEl.options).some(option=>option.value===previous))toolEl.value=previous;
    updateProviderVisibility();
  }
  function updateProviderVisibility(){
    const show=toolEl?.value==='web.search';
    const row=document.getElementById('tool-provider-row');
    if(row)row.hidden=!show;
  }

  function badge(label,state){
    const span=document.createElement('span');
    span.className='tool-gallery-badge';
    if(state)span.dataset.state=state;
    span.textContent=label;
    return span;
  }

  function renderPermissions(item){
    const list=document.createElement('ul');
    list.className='tool-permission-list';
    const permissions=item.permissions.length?item.permissions:['no extra permission declared'];
    permissions.slice(0,5).forEach(permission=>{
      const li=document.createElement('li');
      li.textContent=permission;
      list.appendChild(li);
    });
    return list;
  }

  function renderGallery(){
    if(!galleryEl)return;
    const items=[
      ...(tools.length?tools:defaultTools()).map(normalizeTool),
      ...(connectors.length?connectors:defaultConnectors()).map(normalizeConnector)
    ];
    galleryEl.innerHTML='';
    items.forEach(item=>{
      const enabled=isGalleryEnabled(item.id);
      const article=document.createElement('article');
      article.className='tool-gallery-card';
      if(!enabled)article.dataset.state='disabled';
      const header=document.createElement('header');
      const title=document.createElement('strong');
      title.textContent=item.label;
      const meta=document.createElement('div');
      meta.className='tool-gallery-meta';
      meta.append(
        badge(item.kind),
        badge(item.trust_label,item.public_frontend_secrets_allowed?'error':'ready'),
        badge(enabled?'enabled':'disabled',enabled?'ready':'warning'),
        badge(item.install_state||'approved')
      );
      header.append(title,meta);
      const desc=document.createElement('p');
      desc.textContent=item.description||item.data_boundary||'Approved MMIR capability.';
      const boundary=document.createElement('small');
      boundary.textContent=item.public_frontend_secrets_allowed?'Blocked: this must not run from public frontend secrets.':(item.data_boundary||'No public frontend secrets required.');
      const actions=document.createElement('div');
      actions.className='tool-gallery-actions';
      const toggle=document.createElement('button');
      toggle.type='button';
      toggle.textContent=enabled?'Disable':'Enable';
      toggle.addEventListener('click',()=>{
        setGalleryEnabled(item.id,!enabled);
        renderToolOptions();
        renderGallery();
        setStatus((!enabled?'Enabled ':'Disabled ')+item.label+' for this workspace.','ready');
      });
      actions.appendChild(toggle);
      if(item.kind==='tool'){
        const select=document.createElement('button');
        select.type='button';
        select.textContent='Select';
        select.addEventListener('click',()=>{
          if(toolEl)toolEl.value=item.id;
          updateProviderVisibility();
          setStatus(item.label+' selected. Confirm consent before running.','idle');
        });
        actions.appendChild(select);
      }else{
        const sources=document.createElement('button');
        sources.type='button';
        sources.textContent='Open Sources';
        sources.addEventListener('click',()=>{
          const panel=document.getElementById('knowledge-connectors-panel');
          if(panel&&'open' in panel)panel.open=true;
          panel?.scrollIntoView({block:'center',behavior:'smooth'});
          setStatus('Sources opened for '+item.label+'.','idle');
        });
        actions.appendChild(sources);
      }
      article.append(header,desc,renderPermissions(item),boundary,actions);
      galleryEl.appendChild(article);
    });
  }
  async function loadTools(){
    setStatus('Checking tools and connectors...','loading');
    try{
      const [toolData,connectorData]=await Promise.all([
        request('/tools',{method:'GET',timeoutMs:8000}),
        request('/connectors',{method:'GET',timeoutMs:8000}).catch(()=>({data:[]}))
      ]);
      tools=Array.isArray(toolData?.data)?toolData.data:[];
      connectors=Array.isArray(connectorData?.data)?connectorData.data:[];
      renderToolOptions();
      renderGallery();
      setStatus((tools.length||connectors.length)?('Approved ecosystem ready: '+String(tools.length)+' tool(s), '+String(connectors.length)+' connector(s).'):'No tools/connectors reported.','ready');
    }catch(error){
      tools=[];
      connectors=[];
      renderToolOptions();
      renderGallery();
      setStatus(api.friendlyError(error),'error');
    }
  }
  function argsForTool(){
    const query=clean(queryEl?.value,500);
    const args={workspace_id:workspaceId(),query};
    if(toolEl?.value==='web.search')args.provider=providerEl?.value||'manual';
    return args;
  }
  function renderTrace(trace){
    const list=document.createElement('ol');
    list.className='tool-trace-list';
    (Array.isArray(trace)?trace:[]).forEach(item=>{
      const li=document.createElement('li');
      li.textContent=[item.step,item.status,item.detail].filter(Boolean).join(' - ');
      list.appendChild(li);
    });
    return list;
  }
  function renderResult(data){
    if(!outputEl)return;
    outputEl.innerHTML='';
    const article=document.createElement('article');
    article.className='tool-result-card';
    const title=document.createElement('h3');
    title.textContent=data.tool+' - '+data.status;
    article.appendChild(title);
    article.appendChild(renderTrace(data.trace));
    const pre=document.createElement('pre');
    pre.textContent=JSON.stringify(data.data,null,2).slice(0,6000);
    article.appendChild(pre);
    outputEl.appendChild(article);
  }
  async function runTool(){
    const tool=toolEl?.value||'knowledge.search';
    const query=clean(queryEl?.value,500);
    if(!query){setStatus('Write tool input first.','error');return;}
    if(!isGalleryEnabled(tool)){setStatus('This tool is disabled for this workspace. Enable it in the tool gallery first.','error');return;}
    if(consentEl?.checked!==true){setStatus('Confirm tool consent first.','error');return;}
    setStatus('Running tool...','loading');
    try{
      const data=await request('/tools/execute',{method:'POST',timeoutMs:15000,body:JSON.stringify({
        tool,
        consent:true,
        workspace_id:workspaceId(),
        arguments:argsForTool()
      })});
      renderResult(data);
      setStatus('Tool trace ready.','ready');
    }catch(error){
      setStatus(api.friendlyError(error),'error');
    }
  }
  function install(){
    if(document.getElementById('tool-runner-panel'))return;
    const details=document.createElement('details');
    details.id='tool-runner-panel';
    details.className='model-catalog-hint tool-runner-panel';
    details.innerHTML=''+
      '<summary>+ Tools</summary>'+
      '<div class="tool-runner-body">'+
        '<div class="tool-gallery-head">'+
          '<strong>Approved tools and connectors</strong>'+
          '<span>No provider keys in the public frontend. Disable anything per workspace.</span>'+
        '</div>'+
        '<div id="tool-gallery-grid" class="tool-gallery-grid" aria-live="polite"></div>'+
        '<div class="workflow-builder-row">'+
          '<label for="tool-runner-tool">Tool<select id="tool-runner-tool"></select></label>'+
          '<label for="tool-runner-query">Input<input id="tool-runner-query" type="text" maxlength="500" placeholder="Search query or task input" /></label>'+
        '</div>'+
        '<div id="tool-provider-row" class="workflow-builder-row" hidden>'+
          '<label for="tool-runner-provider">Web route<select id="tool-runner-provider"><option value="manual">Manual free links</option><option value="searxng">Protected SearXNG</option><option value="brave">Protected BYOK search</option></select></label>'+
        '</div>'+
        '<label class="memory-consent"><input id="tool-runner-consent" type="checkbox" /> I approve this tool call for the active workspace.</label>'+
        '<div class="workflow-builder-actions">'+
          '<button id="tool-runner-load" type="button">Check tools</button>'+
          '<button id="tool-runner-run" type="button">Run tool</button>'+
        '</div>'+
        '<p id="tool-runner-status" class="dashboard-note" data-state="idle" aria-live="polite"></p>'+
        '<div id="tool-runner-output" class="tool-runner-output" aria-live="polite"></div>'+
      '</div>';
    host.appendChild(details);
    galleryEl=document.getElementById('tool-gallery-grid');
    toolEl=document.getElementById('tool-runner-tool');
    queryEl=document.getElementById('tool-runner-query');
    providerEl=document.getElementById('tool-runner-provider');
    consentEl=document.getElementById('tool-runner-consent');
    statusEl=document.getElementById('tool-runner-status');
    outputEl=document.getElementById('tool-runner-output');
    toolEl?.addEventListener('change',updateProviderVisibility);
    document.getElementById('tool-runner-load')?.addEventListener('click',loadTools);
    document.getElementById('tool-runner-run')?.addEventListener('click',runTool);
    renderToolOptions();
    renderGallery();
  }

  window.addEventListener('mmir-workspace-changed',()=>{renderToolOptions();renderGallery();setStatus('');});
  window.addEventListener('mmir-tool-gallery-updated',()=>{renderToolOptions();renderGallery();});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
