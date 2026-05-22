(function(){
  const api=window.MimirApiClient;
  const ACTIVE_WORKSPACE_KEY='mimir-active-workspace-v1';
  const DEFAULT_WORKSPACE_ID='personal';
  const host=document.querySelector('#multi-model-workspace .mimir-dashboard');
  let providerEl=null;
  let typeEl=null;
  let titleEl=null;
  let urlEl=null;
  let textEl=null;
  let consentEl=null;
  let statusEl=null;

  if(!host||!api)return;

  function workspaceId(){return localStorage.getItem(ACTIVE_WORKSPACE_KEY)||DEFAULT_WORKSPACE_ID;}
  function clean(value,max=20000){return String(value||'').trim().slice(0,max);}
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

  function providerContentType(provider){
    const type=typeEl?.value||'document';
    if(provider==='github'&&['readme','file','issue','pull_request','discussion','repository'].includes(type))return type;
    if(provider==='notion'&&['page','document','note'].includes(type))return type;
    if(provider==='docs'&&['page','document','note'].includes(type))return type;
    return provider==='github'?'file':'document';
  }

  async function ingest(){
    const provider=providerEl?.value||'github';
    const text=clean(textEl?.value,20000);
    const consent=consentEl?.checked===true;
    if(!text){setStatus('Paste source text first.','error');return;}
    if(!consent){setStatus('Confirm source permission first.','error');return;}
    setStatus('Ingesting source...','loading');
    try{
      const payload={
        provider,
        consent:true,
        workspace_id:workspaceId(),
        connector:{id:provider+'-manual',permission_scope:'user-approved pasted source'},
        documents:[{
          title:clean(titleEl?.value,160)||provider+' source',
          content_type:providerContentType(provider),
          url:clean(urlEl?.value,500),
          type:'text/markdown',
          text
        }]
      };
      const data=await request('/connectors/ingestions',{method:'POST',timeoutMs:12000,body:JSON.stringify(payload)});
      const stored=Array.isArray(data?.data)?data.data.length:0;
      if(textEl)textEl.value='';
      if(consentEl)consentEl.checked=false;
      window.dispatchEvent(new CustomEvent('mmir-knowledge-updated',{detail:{workspaceId:workspaceId()}}));
      setStatus(stored?('Source indexed: '+String(stored)+' document(s).'):'No source document indexed.','ready');
    }catch(error){
      setStatus(api.friendlyError(error),'error');
    }
  }

  async function loadCapabilities(){
    setStatus('Checking connectors...','loading');
    try{
      const data=await request('/connectors',{method:'GET',timeoutMs:8000});
      const providers=(Array.isArray(data?.data)?data.data:[]).map(item=>item.provider).filter(Boolean);
      setStatus(providers.length?('Available: '+providers.join(', ')+'.'):'No connector capability reported.','ready');
    }catch(error){
      setStatus(api.friendlyError(error),'error');
    }
  }

  function install(){
    if(document.getElementById('knowledge-connectors-panel'))return;
    const details=document.createElement('details');
    details.id='knowledge-connectors-panel';
    details.className='model-catalog-hint memory-panel';
    details.innerHTML=''+
      '<summary>+ Sources</summary>'+
      '<div class="memory-body">'+
        '<div class="workflow-builder-row">'+
          '<label for="connector-provider">Source<select id="connector-provider"><option value="github">GitHub</option><option value="notion">Notion</option><option value="docs">Docs</option></select></label>'+
          '<label for="connector-content-type">Type<select id="connector-content-type"><option value="readme">Readme</option><option value="file">File</option><option value="issue">Issue</option><option value="pull_request">Pull request</option><option value="page">Page</option><option value="document">Document</option><option value="note">Note</option></select></label>'+
        '</div>'+
        '<div class="workflow-builder-row">'+
          '<label for="connector-title">Title<input id="connector-title" type="text" maxlength="160" /></label>'+
          '<label for="connector-url">URL<input id="connector-url" type="url" maxlength="500" /></label>'+
        '</div>'+
        '<label for="connector-text">Content<textarea id="connector-text" rows="4" maxlength="20000"></textarea></label>'+
        '<label class="memory-consent"><input id="connector-consent" type="checkbox" /> I have permission to use this source in this workspace.</label>'+
        '<div class="workflow-builder-actions">'+
          '<button id="connector-ingest" type="button">Index source</button>'+
          '<button id="connector-capabilities" type="button">Check</button>'+
        '</div>'+
        '<p id="connector-status" class="dashboard-note" aria-live="polite"></p>'+
      '</div>';
    host.appendChild(details);
    providerEl=document.getElementById('connector-provider');
    typeEl=document.getElementById('connector-content-type');
    titleEl=document.getElementById('connector-title');
    urlEl=document.getElementById('connector-url');
    textEl=document.getElementById('connector-text');
    consentEl=document.getElementById('connector-consent');
    statusEl=document.getElementById('connector-status');
    document.getElementById('connector-ingest')?.addEventListener('click',ingest);
    document.getElementById('connector-capabilities')?.addEventListener('click',loadCapabilities);
  }

  window.addEventListener('mmir-workspace-changed',()=>setStatus(''));
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
