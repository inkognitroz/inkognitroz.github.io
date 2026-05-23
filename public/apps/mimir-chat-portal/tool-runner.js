(function(){
  const api=window.MimirApiClient;
  const ACTIVE_WORKSPACE_KEY='mimir-active-workspace-v1';
  const DEFAULT_WORKSPACE_ID='personal';
  const host=document.querySelector('#multi-model-workspace .mimir-dashboard');
  let toolEl=null;
  let queryEl=null;
  let providerEl=null;
  let consentEl=null;
  let statusEl=null;
  let outputEl=null;
  let tools=[];

  if(!host||!api)return;

  function workspaceId(){return localStorage.getItem(ACTIVE_WORKSPACE_KEY)||DEFAULT_WORKSPACE_ID;}
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
      {id:'knowledge.search',label:'Knowledge search',status:'backend required'},
      {id:'memory.search',label:'Memory search',status:'backend required'},
      {id:'web.search',label:'Web search',status:'backend/manual'}
    ];
  }
  function renderToolOptions(){
    if(!toolEl)return;
    const previous=toolEl.value;
    const items=tools.length?tools:defaultTools();
    toolEl.innerHTML='';
    items.forEach(tool=>{
      const option=document.createElement('option');
      option.value=tool.id;
      option.textContent=(tool.label||tool.id)+' - '+(tool.status||'beta');
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
  async function loadTools(){
    setStatus('Checking tool runtime...','loading');
    try{
      const data=await request('/tools',{method:'GET',timeoutMs:8000});
      tools=Array.isArray(data?.data)?data.data:[];
      renderToolOptions();
      setStatus(tools.length?('Tools ready: '+tools.map(tool=>tool.id).join(', ')+'.'):'No tools reported.','ready');
    }catch(error){
      tools=[];
      renderToolOptions();
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
  }

  window.addEventListener('mmir-workspace-changed',()=>setStatus(''));
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
