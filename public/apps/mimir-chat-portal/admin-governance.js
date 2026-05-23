(function(){
  const api=window.MimirApiClient;
  const main=document.querySelector('.mimir-chat-main');
  let statusEl=null;
  let rootEl=null;

  if(!main)return;

  function clean(value,max=1000){return String(value||'').replace(/\s+/g,' ').trim().slice(0,max);}
  function escapeHtml(value){return String(value||'').replace(/[&<>"']/g,(char)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));}
  function setStatus(message,state){if(statusEl){statusEl.textContent=message||'';statusEl.dataset.state=state||'idle';}}
  function activeConnection(){
    if(!api)return null;
    const profile=api.activeProfile();
    const url=api.cleanUrl(profile?.url);
    if(!profile||!url)return null;
    return {profile,url};
  }
  async function request(path,options={}){
    const connection=activeConnection();
    if(!connection)throw new Error('No protected backend profile is active.');
    const token=await api.pairIfNeeded(connection.profile,connection.url);
    return api.fetchJson(api.joinUrl(connection.url,path),{
      ...options,
      headers:{...api.authHeaders(token),...(options.headers||{})}
    });
  }
  function fallbackOverview(){
    return {
      object:'admin.overview',
      mode:'browser-local-fallback',
      users:[{id:'local-browser-owner',role:'owner',status:'active',auth_mode:'browser-local'}],
      roles:[
        {id:'owner',label:'Owner',status:'active-single-user',permissions:['admin.read','policy.read']},
        {id:'admin',label:'Admin',status:'planned',permissions:['admin.read','models.manage','tools.manage']},
        {id:'member',label:'Member',status:'planned',permissions:['chat.use','models.use','knowledge.use']},
        {id:'viewer',label:'Viewer',status:'planned',permissions:['admin.read','audit.read']}
      ],
      models:{active_provider:'no backend active',provider_status:'unknown',provider_role:'activate a protected backend for live admin data'},
      tools:{runtime_status:'unknown',permission_model:'deny-unless-allowlisted-and-consented'},
      policies:{
        frontend_secrets_allowed:false,
        provider_keys_browser_allowed:false,
        paid_routes_require_approval:true,
        raw_runtime_public_endpoint_allowed:false,
        audit_raw_prompts_allowed:false,
        multi_user_write_access:'planned-fail-closed'
      },
      audit:{retained_events:0,max_retained_events:0,raw_prompt_logging:false},
      warnings:['Activate a protected backend profile to read live admin/audit metadata.']
    };
  }
  function card(title,body){
    return '<article class="admin-card"><h3>'+escapeHtml(title)+'</h3>'+body+'</article>';
  }
  function renderOverview(data){
    if(!rootEl)return;
    const users=(data.users||[]).map(user=>'<li><strong>'+escapeHtml(user.id)+'</strong><span>'+escapeHtml(user.role)+' · '+escapeHtml(user.status)+' · '+escapeHtml(user.auth_mode||'')+'</span></li>').join('');
    const roles=(data.roles||[]).map(role=>'<li><strong>'+escapeHtml(role.label||role.id)+'</strong><span>'+escapeHtml(role.status)+' · '+escapeHtml((role.permissions||[]).join(', '))+'</span></li>').join('');
    const policyRows=Object.entries(data.policies||{}).map(([key,value])=>'<div><span>'+escapeHtml(key.replace(/_/g,' '))+'</span><strong>'+escapeHtml(String(value))+'</strong></div>').join('');
    const warnings=(data.warnings||[]).map(item=>'<li>'+escapeHtml(item)+'</li>').join('');
    rootEl.innerHTML=''+
      '<div class="admin-summary-row">'+
        card('Mode','<strong>'+escapeHtml(data.mode||'unknown')+'</strong><span>'+escapeHtml(data.service||'MMIR admin')+'</span>')+
        card('Provider','<strong>'+escapeHtml(data.models?.active_provider||'unknown')+'</strong><span>'+escapeHtml(data.models?.provider_status||'unknown')+'</span>')+
        card('Tools','<strong>'+escapeHtml(data.tools?.runtime_status||'unknown')+'</strong><span>'+escapeHtml(data.tools?.permission_model||'deny by default')+'</span>')+
        card('Audit','<strong>'+escapeHtml(String(data.audit?.retained_events||0))+'</strong><span>retained events · raw prompts '+escapeHtml(String(data.audit?.raw_prompt_logging||false))+'</span>')+
      '</div>'+
      '<div class="admin-grid">'+
        card('Users','<ul>'+users+'</ul>')+
        card('Roles','<ul>'+roles+'</ul>')+
        card('Policies','<div class="admin-policy-grid">'+policyRows+'</div>')+
        card('Warnings','<ol>'+warnings+'</ol>')+
      '</div>';
  }
  async function refreshAdmin(){
    setStatus('Loading admin overview...','loading');
    try{
      if(activeConnection()){
        const data=await request('/admin/overview',{method:'GET',timeoutMs:10000});
        renderOverview(data);
        setStatus('Protected admin overview loaded.','ready');
        return;
      }
      renderOverview(fallbackOverview());
      setStatus('Showing browser-local admin fallback.','ready');
    }catch(error){
      renderOverview(fallbackOverview());
      setStatus(api?.friendlyError?api.friendlyError(error):error.message,'error');
    }
  }
  async function loadAudit(){
    setStatus('Loading audit metadata...','loading');
    try{
      const data=await request('/audit',{method:'GET',timeoutMs:10000});
      const overview=fallbackOverview();
      overview.mode='audit-metadata';
      overview.audit={retained_events:Array.isArray(data.events)?data.events.length:0,max_retained_events:data.max_retained_events||0,raw_prompt_logging:false};
      overview.warnings=['Audit panel shows counts and sanitized metadata only. Raw prompts, documents and secrets must not be logged.'];
      renderOverview(overview);
      setStatus('Audit metadata loaded.','ready');
    }catch(error){
      setStatus(api?.friendlyError?api.friendlyError(error):error.message,'error');
    }
  }
  function openPolicies(){
    const target=document.getElementById('privacy-controls-panel')||document.getElementById('progress-dashboard');
    if(target)target.open=true;
    location.hash=target?.id||'progress-dashboard';
    setStatus('Opened public policy/progress panel.','ready');
  }
  function install(){
    if(document.getElementById('admin-governance'))return;
    const details=document.createElement('details');
    details.id='admin-governance';
    details.className='mimir-provider-drawer admin-governance';
    details.innerHTML=''+
      '<summary>+ Admin / Governance</summary>'+
      '<section class="mimir-dashboard" aria-labelledby="admin-governance-title">'+
        '<div class="dashboard-heading"><div><p class="eyebrow">Fail-closed administration</p><h2 id="admin-governance-title">Users, roles, policies and audit state</h2></div></div>'+
        '<div class="workflow-builder-actions">'+
          '<button id="admin-refresh" type="button">Refresh admin</button>'+
          '<button id="admin-load-audit" type="button">Load audit</button>'+
          '<button id="admin-open-policies" type="button">Open policy view</button>'+
        '</div>'+
        '<p id="admin-status" class="dashboard-note" data-state="idle" aria-live="polite"></p>'+
        '<div id="admin-root" class="admin-root" aria-live="polite"></div>'+
      '</section>';
    const settings=document.getElementById('backend-settings');
    main.insertBefore(details,settings||null);
    statusEl=document.getElementById('admin-status');
    rootEl=document.getElementById('admin-root');
    document.getElementById('admin-refresh')?.addEventListener('click',refreshAdmin);
    document.getElementById('admin-load-audit')?.addEventListener('click',loadAudit);
    document.getElementById('admin-open-policies')?.addEventListener('click',openPolicies);
    renderOverview(fallbackOverview());
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
