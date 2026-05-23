(function(){
  const api=window.MimirApiClient;
  const ACTIVE_WORKSPACE_KEY='mimir-active-workspace-v1';
  const DEFAULT_WORKSPACE_ID='personal';
  const PLAN_PREFIX='mimir-connector-plans-v1:';
  const host=document.getElementById('connector-catalog-root');
  let connectors=[];
  let statusEl=null;
  let gridEl=null;
  let planEl=null;

  if(!host)return;

  function workspaceId(){return localStorage.getItem(ACTIVE_WORKSPACE_KEY)||DEFAULT_WORKSPACE_ID;}
  function planKey(id=workspaceId()){return PLAN_PREFIX+id;}
  function safe(value){return String(value||'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));}
  function clean(value,max=240){return String(value||'').trim().slice(0,max);}
  function setStatus(message,state){if(statusEl){statusEl.textContent=message||'';statusEl.dataset.state=state||'idle';}}

  function connectorCatalogFallback(){
    return [
      {
        id:'manual.documents',
        provider:'docs',
        label:'Manual documents',
        status:'live_manual',
        auth_model:'none',
        sync_boundary:'browser upload or protected backend ingestion',
        free_path:'Paste or upload approved text/files into MMIR knowledge now.',
        protected_route:'/connectors/ingestions',
        supported_content:['document','page','note','csv','json','markdown'],
        permissions:['documents:read-user-approved-text'],
        requires_consent:true,
        revocation_supported:true,
        public_frontend_secrets_allowed:false,
        stores_secrets:false,
        cost_policy:'free/local-only',
        data_boundary:'Manual content is processed only after consent. Browser-local uploads stay local unless the user sends them to a protected backend.'
      },
      {
        id:'local.folder',
        provider:'local',
        label:'Local folder via node',
        status:'planned_local_node',
        auth_model:'paired-local-node',
        sync_boundary:'paired local node only',
        free_path:'Use the local node and explicit folder selection. No public inbound port or cloud secret is needed.',
        protected_route:'/connectors/sync-plans',
        supported_content:['folder','file','repo','logs'],
        permissions:['local_files:read-user-selected-paths'],
        requires_consent:true,
        revocation_supported:true,
        public_frontend_secrets_allowed:false,
        stores_secrets:false,
        cost_policy:'free/local-only',
        data_boundary:'Local file handles and paths must stay on the user device or local node.'
      },
      {
        id:'github.app',
        provider:'github',
        label:'GitHub repositories',
        status:'protected_oauth_required',
        auth_model:'github-app-or-oauth-in-protected-backend',
        sync_boundary:'protected backend app installation',
        free_path:'Public repositories can be copied or pasted into manual knowledge now. Private repo sync needs a protected GitHub App.',
        protected_route:'/connectors/sync-plans',
        supported_content:['repository','readme','file','issue','pull_request','discussion'],
        permissions:['metadata:read','contents:read','issues:read','pull_requests:read'],
        requires_consent:true,
        revocation_supported:true,
        public_frontend_secrets_allowed:false,
        stores_secrets:false,
        cost_policy:'free-first/no-paid-sync-by-default',
        data_boundary:'GitHub installation tokens and webhooks must stay server-side; the public frontend stores only connector metadata and revocation state.'
      },
      {
        id:'google.drive',
        provider:'google-drive',
        label:'Google Drive / Docs',
        status:'protected_oauth_required',
        auth_model:'oauth-in-protected-backend',
        sync_boundary:'protected backend OAuth worker',
        free_path:'Export selected files and upload them manually now. Background Drive sync needs protected OAuth.',
        protected_route:'/connectors/sync-plans',
        supported_content:['document','sheet','slide','pdf','folder'],
        permissions:['drive.metadata.readonly','drive.readonly-selected','docs.readonly-selected'],
        requires_consent:true,
        revocation_supported:true,
        public_frontend_secrets_allowed:false,
        stores_secrets:false,
        cost_policy:'free-first/no-paid-sync-by-default',
        data_boundary:'OAuth refresh tokens and file export jobs belong only in a protected backend or user-owned connector.'
      },
      {
        id:'gmail.mailbox',
        provider:'gmail',
        label:'Gmail',
        status:'protected_oauth_required',
        auth_model:'oauth-in-protected-backend',
        sync_boundary:'protected backend OAuth worker',
        free_path:'Forward or export selected messages manually now. Mailbox sync must be opt-in and scoped.',
        protected_route:'/connectors/sync-plans',
        supported_content:['thread','message','label'],
        permissions:['gmail.readonly-selected-labels'],
        requires_consent:true,
        revocation_supported:true,
        public_frontend_secrets_allowed:false,
        stores_secrets:false,
        cost_policy:'free-first/no-paid-sync-by-default',
        data_boundary:'Mailbox data is sensitive. Tokens, message fetch jobs and retention rules must stay behind identity, audit and revocation.'
      },
      {
        id:'notion.workspace',
        provider:'notion',
        label:'Notion workspace',
        status:'protected_oauth_required',
        auth_model:'oauth-in-protected-backend',
        sync_boundary:'protected backend integration',
        free_path:'Paste approved Notion pages into manual knowledge now. Workspace sync needs protected OAuth.',
        protected_route:'/connectors/sync-plans',
        supported_content:['page','database','document','note'],
        permissions:['notion:read-selected-pages'],
        requires_consent:true,
        revocation_supported:true,
        public_frontend_secrets_allowed:false,
        stores_secrets:false,
        cost_policy:'free-first/no-paid-sync-by-default',
        data_boundary:'Notion integration secrets and sync cursors must stay in the backend.'
      },
      {
        id:'slack.workspace',
        provider:'slack',
        label:'Slack workspace',
        status:'protected_oauth_required',
        auth_model:'oauth-in-protected-backend',
        sync_boundary:'protected backend app installation',
        free_path:'Paste selected threads manually now. Background Slack sync requires workspace admin approval.',
        protected_route:'/connectors/sync-plans',
        supported_content:['channel','thread','message'],
        permissions:['channels:history-selected','groups:history-selected','users:read'],
        requires_consent:true,
        revocation_supported:true,
        public_frontend_secrets_allowed:false,
        stores_secrets:false,
        cost_policy:'free-first/no-paid-sync-by-default',
        data_boundary:'Workspace messages require explicit approval, retention limits and audit. Bot tokens never reach GitHub Pages.'
      },
      {
        id:'openwebui.instance',
        provider:'open-webui',
        label:'Open WebUI instance',
        status:'protected_backend_required',
        auth_model:'server-side-api-token-or-local-node',
        sync_boundary:'protected backend adapter or paired local node',
        free_path:'Connect a local Open WebUI-compatible endpoint through MMIR Local Node or a protected backend profile.',
        protected_route:'/connectors/sync-plans',
        supported_content:['models','chat-history-reference','runtime-capabilities'],
        permissions:['models:read','chat:route-via-protected-adapter'],
        requires_consent:true,
        revocation_supported:true,
        public_frontend_secrets_allowed:false,
        stores_secrets:false,
        cost_policy:'free/local-or-user-owned',
        data_boundary:'Open WebUI API tokens and runtime URLs must be stored only in local node, OS vault or protected backend.'
      }
    ];
  }

  function activeConnection(){
    if(!api)return null;
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

  function readPlans(){
    try{
      const value=JSON.parse(localStorage.getItem(planKey())||'[]');
      return Array.isArray(value)?value:[];
    }catch(error){
      return [];
    }
  }

  function savePlans(plans){
    localStorage.setItem(planKey(),JSON.stringify(plans.slice(-50)));
    window.dispatchEvent(new CustomEvent('mmir-connector-plans-updated',{detail:{workspaceId:workspaceId(),count:plans.length}}));
  }

  function normalizeConnector(item){
    return {
      ...item,
      id:clean(item.id||item.provider||'connector',96),
      provider:clean(item.provider||'connector',80),
      label:clean(item.label||item.provider||'Connector',120),
      status:clean(item.status||'planned',80),
      auth_model:clean(item.auth_model||'protected-backend',160),
      sync_boundary:clean(item.sync_boundary||item.data_boundary||'protected backend',260),
      free_path:clean(item.free_path||'Use manual upload or a paired local node first.',320),
      protected_route:clean(item.protected_route||'/connectors/sync-plans',120),
      permissions:Array.isArray(item.permissions)?item.permissions.map(scope=>clean(scope,100)).filter(Boolean):[],
      supported_content:Array.isArray(item.supported_content)?item.supported_content.map(kind=>clean(kind,60)).filter(Boolean):[],
      revocation_supported:item.revocation_supported!==false,
      requires_consent:item.requires_consent!==false,
      public_frontend_secrets_allowed:item.public_frontend_secrets_allowed===true,
      stores_secrets:item.stores_secrets===true,
      cost_policy:clean(item.cost_policy||'free-first/no-paid-sync-by-default',120),
      data_boundary:clean(item.data_boundary||item.sync_boundary||'',360)
    };
  }

  function statusLabel(status){
    if(status==='live_manual')return 'Use now';
    if(status==='planned_local_node')return 'Local node';
    if(status==='protected_oauth_required')return 'Protected OAuth';
    if(status==='protected_backend_required')return 'Backend';
    return status.replace(/_/g,' ');
  }

  function statusClass(connector){
    if(connector.status==='live_manual')return 'is-live';
    if(connector.status==='planned_local_node')return 'is-local';
    return 'is-protected';
  }

  function card(connector){
    const permissions=connector.permissions.slice(0,4).map(scope=>'<span>'+safe(scope)+'</span>').join('');
    const content=connector.supported_content.slice(0,5).map(kind=>'<span>'+safe(kind)+'</span>').join('');
    return ''+
      '<article class="connector-card '+safe(statusClass(connector))+'" data-connector-id="'+safe(connector.id)+'">'+
        '<header>'+
          '<div><strong>'+safe(connector.label)+'</strong><small>'+safe(connector.provider)+' - '+safe(connector.cost_policy)+'</small></div>'+
          '<em>'+safe(statusLabel(connector.status))+'</em>'+
        '</header>'+
        '<p>'+safe(connector.free_path)+'</p>'+
        '<dl>'+
          '<div><dt>Boundary</dt><dd>'+safe(connector.sync_boundary)+'</dd></div>'+
          '<div><dt>Auth</dt><dd>'+safe(connector.auth_model)+'</dd></div>'+
          '<div><dt>Secrets</dt><dd>'+(connector.public_frontend_secrets_allowed?'Blocked by policy':'Never in public frontend')+'</dd></div>'+
        '</dl>'+
        '<div class="connector-chip-row">'+content+permissions+'</div>'+
        '<div class="connector-actions">'+
          '<button type="button" data-connector-use="'+safe(connector.id)+'">Use now</button>'+
          '<button type="button" data-connector-plan="'+safe(connector.id)+'">Plan sync</button>'+
          '<button type="button" data-connector-revoke="'+safe(connector.id)+'">Revoke</button>'+
        '</div>'+
      '</article>';
  }

  function localPlan(connector){
    return {
      object:'connector.sync_plan',
      id:'local-sync-plan-'+connector.id+'-'+Date.now(),
      connector_id:connector.id,
      provider:connector.provider,
      label:connector.label,
      workspace_id:workspaceId(),
      status:connector.status==='live_manual'?'manual_ready':'protected_backend_required',
      execution_allowed:false,
      automatic_sync_allowed:false,
      public_frontend_secrets_allowed:false,
      stores_secrets:false,
      requires_consent:true,
      revocation_supported:true,
      selected_scopes:connector.permissions.slice(0,3),
      rejected_scopes:[],
      auth_model:connector.auth_model,
      cost_policy:connector.cost_policy,
      sync_boundary:connector.sync_boundary,
      protected_route:connector.protected_route,
      free_now_actions:[connector.free_path,'Use Knowledge upload for selected content now.','Activate protected backend sync only after identity, audit and revocation are configured.'],
      approval_gates:[
        {id:'consent',status:'passed',label:'User clicked Plan sync'},
        {id:'frontend-secrets',status:'passed',label:'No public frontend secrets allowed'},
        {id:'oauth-worker',status:connector.status==='live_manual'?'not_required':'required',label:'Protected OAuth/app worker'},
        {id:'revocation',status:'required',label:'Revocation supported'}
      ],
      warnings:['Local plan only. No external data was fetched and no paid/background sync was started.'],
      created_at:new Date().toISOString()
    };
  }

  function renderPlans(){
    if(!planEl)return;
    const plans=readPlans().slice(-4).reverse();
    planEl.innerHTML=plans.length?plans.map(plan=>''+
      '<article class="connector-plan-card">'+
        '<strong>'+safe(plan.label||plan.connector_id)+'</strong>'+
        '<span>'+safe(plan.status)+' - '+safe(plan.cost_policy)+'</span>'+
        '<small>'+safe(plan.sync_boundary)+'</small>'+
      '</article>').join(''):'<p class="dashboard-note">No connector plans yet. Use manual documents now, or create a protected sync plan without fetching data.</p>';
  }

  function render(){
    if(!gridEl)return;
    gridEl.innerHTML=connectors.map(card).join('');
    renderPlans();
  }

  function openKnowledge(){
    document.getElementById('multi-model-workspace')?.setAttribute('open','');
    document.getElementById('knowledge-panel')?.setAttribute('open','');
    location.hash='knowledge-panel';
  }

  function sendConnectorPrompt(connector){
    const prompt=document.getElementById('mimir-prompt');
    const send=document.getElementById('primary-chat-link');
    if(!prompt||!send)return;
    prompt.value='Help me connect '+connector.label+' to MMIR safely. Prefer free/manual steps first. Explain protected OAuth/backend requirements, revocation and what must never be stored in the public frontend.';
    prompt.dispatchEvent(new Event('input',{bubbles:true}));
    send.click();
  }

  function useNow(id){
    const connector=connectors.find(item=>item.id===id);
    if(!connector)return;
    if(connector.id==='manual.documents'||connector.id==='google.drive'||connector.id==='notion.workspace'||connector.id==='gmail.mailbox'||connector.id==='slack.workspace'||connector.id==='github.app'){
      openKnowledge();
      setStatus(connector.label+': manual/free path opened. Upload or paste only selected content you are allowed to use.','ready');
      return;
    }
    if(connector.id==='local.folder'){
      document.getElementById('local-connector')?.setAttribute('open','');
      location.hash='local-connector';
      setStatus('Local connector opened. Folder sync must stay on the paired local node.','ready');
      return;
    }
    if(connector.id==='openwebui.instance'){
      document.getElementById('backend-settings')?.setAttribute('open','');
      location.hash='backend-settings';
      setStatus('Backend settings opened. Keep Open WebUI tokens out of the public frontend.','ready');
      return;
    }
    sendConnectorPrompt(connector);
  }

  async function planConnector(id){
    const connector=connectors.find(item=>item.id===id);
    if(!connector)return;
    setStatus('Creating safe connector plan...','loading');
    try{
      let plan;
      if(activeConnection()&&api){
        plan=await request('/connectors/sync-plans',{method:'POST',timeoutMs:10000,body:JSON.stringify({connector_id:id,workspace_id:workspaceId(),consent:true,scopes:connector.permissions.slice(0,3)})});
      }else{
        plan=localPlan(connector);
      }
      const plans=readPlans().filter(item=>item.connector_id!==id||item.status==='revoked');
      plans.push(plan);
      savePlans(plans);
      renderPlans();
      setStatus(connector.label+' plan saved. No external data was fetched and no paid/background sync started.','ready');
    }catch(error){
      setStatus(api?.friendlyError?api.friendlyError(error):'Connector plan unavailable.','error');
    }
  }

  function revokeConnector(id){
    const connector=connectors.find(item=>item.id===id);
    const plans=readPlans();
    plans.push({
      object:'connector.revocation',
      id:'local-revocation-'+id+'-'+Date.now(),
      connector_id:id,
      label:connector?.label||id,
      workspace_id:workspaceId(),
      status:'revoked',
      execution_allowed:false,
      public_frontend_secrets_allowed:false,
      stores_secrets:false,
      cost_policy:'free/local-only',
      sync_boundary:'local plan revoked; protected backend revocation must also run for real OAuth installs',
      created_at:new Date().toISOString()
    });
    savePlans(plans);
    renderPlans();
    setStatus((connector?.label||id)+' local plan revoked. Revoke real OAuth installs in the provider/backend too.','ready');
  }

  async function loadCatalog(){
    setStatus('Loading connector catalog...','loading');
    try{
      if(activeConnection()&&api){
        const data=await request('/connectors/catalog',{method:'GET',timeoutMs:8000});
        connectors=(Array.isArray(data?.data)&&data.data.length?data.data:connectorCatalogFallback()).map(normalizeConnector);
        setStatus('Protected connector catalog loaded. OAuth still stays behind backend routes.','ready');
      }else{
        connectors=connectorCatalogFallback().map(normalizeConnector);
        setStatus('Free/manual connector catalog loaded. Activate a protected backend for OAuth sync plans.','ready');
      }
    }catch(error){
      connectors=connectorCatalogFallback().map(normalizeConnector);
      setStatus('Using local connector catalog. '+(api?.friendlyError?api.friendlyError(error):''),'ready');
    }
    render();
  }

  function install(){
    host.innerHTML=''+
      '<div class="connector-catalog-toolbar">'+
        '<div><strong>External app connectors</strong><span>Free first. Protected OAuth only. No connector secrets in public GitHub Pages.</span></div>'+
        '<button id="connector-catalog-refresh" type="button">Refresh catalog</button>'+
      '</div>'+
      '<div class="connector-boundary-grid">'+
        '<article><strong>Works now</strong><span>Manual documents, pasted repo/docs content, local node profile and selected browser uploads.</span></article>'+
        '<article><strong>Protected sync</strong><span>GitHub, Drive, Gmail, Notion and Slack need backend/local-node OAuth workers, audit and revocation.</span></article>'+
        '<article><strong>Never here</strong><span>API keys, OAuth refresh tokens, webhooks, paid approval and provider secrets.</span></article>'+
      '</div>'+
      '<div id="connector-catalog-grid" class="connector-catalog-grid" aria-live="polite"></div>'+
      '<div class="connector-plan-section"><strong>Recent connector plans</strong><div id="connector-plan-list" class="connector-plan-list" aria-live="polite"></div></div>'+
      '<p id="connector-catalog-status" class="dashboard-note" data-state="idle" aria-live="polite"></p>';
    gridEl=document.getElementById('connector-catalog-grid');
    planEl=document.getElementById('connector-plan-list');
    statusEl=document.getElementById('connector-catalog-status');
    document.getElementById('connector-catalog-refresh')?.addEventListener('click',loadCatalog);
    host.addEventListener('click',(event)=>{
      const plan=event.target.closest('[data-connector-plan]');
      const revoke=event.target.closest('[data-connector-revoke]');
      const use=event.target.closest('[data-connector-use]');
      if(plan)planConnector(plan.dataset.connectorPlan);
      if(revoke)revokeConnector(revoke.dataset.connectorRevoke);
      if(use)useNow(use.dataset.connectorUse);
    });
    loadCatalog();
  }

  window.addEventListener('mmir-workspace-changed',()=>{renderPlans();setStatus('');});
  window.addEventListener('mmir-backend-profiles-updated',loadCatalog);
  window.addEventListener('storage',renderPlans);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
