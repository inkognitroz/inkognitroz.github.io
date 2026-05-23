(function(){
  const api=window.MimirApiClient;
  const main=document.querySelector('.mimir-chat-main');
  let statusEl=null;
  let rootEl=null;
  let orgSelectEl=null;
  let currentOrgs=[];

  if(!main)return;

  function clean(value,max=200){return String(value||'').replace(/\s+/g,' ').trim().slice(0,max);}
  function slug(value){return clean(value,80).toLowerCase().replace(/[^a-z0-9._-]+/g,'-').replace(/^-+|-+$/g,'')||'mmir-org';}
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
      headers:{'Content-Type':'application/json',...api.authHeaders(token),...(options.headers||{})}
    });
  }
  function fallbackIdentity(){
    return {
      object:'identity.principal',
      principal:{id:'local-browser-preview',type:'browser-local',auth_source:'browser-local-fallback'},
      organizations:[],
      policy:{
        accounts_are_free_first:true,
        provider_keys_browser_allowed:false,
        paid_routes_allowed_by_default:false,
        session_tokens_planned:true,
        server_side_enforcement_required:true
      }
    };
  }
  function policyRows(policy){
    return Object.entries(policy||{}).map(([key,value])=>'<div><span>'+escapeHtml(key.replace(/_/g,' '))+'</span><strong>'+escapeHtml(String(value))+'</strong></div>').join('');
  }
  function memberRows(org){
    const members=Array.isArray(org.members)?org.members:[];
    if(!members.length)return '<li><strong>'+escapeHtml(org.current_role||'member')+'</strong><span>Member details load on direct org view.</span></li>';
    return members.map(member=>'<li><strong>'+escapeHtml(member.principal_id)+'</strong><span>'+escapeHtml(member.role)+' / '+escapeHtml(member.status)+'</span></li>').join('');
  }
  function orgCard(org){
    const flags=[
      'plan '+(org.plan?.tier||'free'),
      'role '+(org.current_role||'visible'),
      'members '+String(org.member_count||org.members?.length||0),
      'status '+(org.status||'active')
    ];
    return '<article class="identity-org-card" data-org-id="'+escapeHtml(org.id||'')+'">'+
      '<div class="identity-card-head"><div><h3>'+escapeHtml(org.name||'MMIR organization')+'</h3><span>'+escapeHtml(org.slug||org.id||'org')+'</span></div><strong>'+escapeHtml(org.current_role||'member')+'</strong></div>'+
      '<div class="identity-chip-row">'+flags.map(flag=>'<span>'+escapeHtml(flag)+'</span>').join('')+'</div>'+
      '<ul class="identity-member-list">'+memberRows(org)+'</ul>'+
      '<div class="identity-policy-mini">'+policyRows({public_frontend_secrets_allowed:org.policy?.public_frontend_secrets_allowed===true,server_side_enforcement_required:org.policy?.server_side_enforcement_required!==false,paid_routes_allowed:org.plan?.paid_routes_allowed===true})+'</div>'+
    '</article>';
  }
  function updateOrgSelect(){
    if(!orgSelectEl)return;
    orgSelectEl.innerHTML=currentOrgs.length?currentOrgs.map(org=>'<option value="'+escapeHtml(org.id)+'">'+escapeHtml(org.name||org.id)+'</option>').join(''):'<option value="">No backend org yet</option>';
  }
  function render(identity,orgs){
    if(!rootEl)return;
    currentOrgs=Array.isArray(orgs)?orgs:[];
    const principal=identity.principal||{};
    const policy=identity.policy||{};
    const orgCards=currentOrgs.length?currentOrgs.map(orgCard).join(''):'<article class="identity-empty"><strong>No backend organization yet</strong><span>Create a free organization on the active protected backend when ready.</span></article>';
    rootEl.innerHTML=''+
      '<div class="identity-summary-row">'+
        '<article><span>Principal</span><strong>'+escapeHtml(principal.id||'unknown')+'</strong><small>'+escapeHtml(principal.auth_source||principal.type||'unknown')+'</small></article>'+
        '<article><span>Organizations</span><strong>'+String(currentOrgs.length)+'</strong><small>free-first workspace ownership</small></article>'+
        '<article><span>Browser keys</span><strong>'+escapeHtml(String(policy.provider_keys_browser_allowed===true))+'</strong><small>provider secrets stay backend-side</small></article>'+
        '<article><span>Runtime authority</span><strong>'+escapeHtml(String(policy.server_side_enforcement_required!==false))+'</strong><small>policy enforced behind backend</small></article>'+
      '</div>'+
      '<div class="identity-controls-grid">'+
        '<label for="identity-org-name">Organization<input id="identity-org-name" type="text" value="MMIR Launch Team" autocomplete="organization" /></label>'+
        '<label for="identity-org-slug">Slug<input id="identity-org-slug" type="text" value="mmir-launch-team" autocomplete="off" /></label>'+
        '<label for="identity-org-select">Active org<select id="identity-org-select"></select></label>'+
        '<label for="identity-member-principal">Member id<input id="identity-member-principal" type="text" placeholder="user-or-key-fingerprint" autocomplete="off" /></label>'+
        '<label for="identity-member-role">Role<select id="identity-member-role"><option value="member">member</option><option value="viewer">viewer</option><option value="admin">admin</option><option value="owner">owner</option></select></label>'+
      '</div>'+
      '<div class="workflow-builder-actions">'+
        '<button id="identity-refresh" type="button">Refresh identity</button>'+
        '<button id="identity-create-org" type="button">Create free org</button>'+
        '<button id="identity-add-member" type="button">Save member</button>'+
        '<button id="identity-remove-member" type="button">Remove member</button>'+
        '<button id="identity-disable-org" type="button" class="danger">Disable org</button>'+
        '<button id="identity-open-share" type="button">Open sharing</button>'+
      '</div>'+
      '<div class="identity-policy-panel"><h3>Identity policy</h3><p>owner/admin role changes are enforced by protected backend policy.</p>'+policyRows(policy)+'</div>'+
      '<div class="identity-org-grid">'+orgCards+'</div>';
    orgSelectEl=document.getElementById('identity-org-select');
    updateOrgSelect();
    bindControls();
  }
  async function loadOrgDetails(orgs){
    const details=[];
    for(const org of orgs.slice(0,20)){
      try{
        const data=await request('/identity/orgs/'+encodeURIComponent(org.id),{method:'GET',timeoutMs:10000});
        details.push(data.data||org);
      }catch(error){
        details.push(org);
      }
    }
    return details;
  }
  async function refreshIdentity(){
    setStatus('Loading identity...','loading');
    try{
      if(activeConnection()){
        const identity=await request('/identity/me',{method:'GET',timeoutMs:10000});
        const orgList=await request('/identity/orgs',{method:'GET',timeoutMs:10000});
        const orgs=await loadOrgDetails(orgList.data||identity.organizations||[]);
        render(identity,orgs);
        setStatus('Protected identity and organization state loaded.','ready');
        return;
      }
      render(fallbackIdentity(),[]);
      setStatus('Showing browser-local identity fallback. Activate a protected backend to create teams.','ready');
    }catch(error){
      render(fallbackIdentity(),[]);
      setStatus(api?.friendlyError?api.friendlyError(error):error.message,'error');
    }
  }
  async function createOrg(){
    setStatus('Creating organization...','loading');
    try{
      const name=clean(document.getElementById('identity-org-name')?.value||'MMIR Launch Team',160);
      const data=await request('/identity/orgs',{
        method:'POST',
        body:JSON.stringify({name,slug:slug(document.getElementById('identity-org-slug')?.value||name)}),
        timeoutMs:10000
      });
      setStatus('Free-first organization created: '+(data.data?.name||name),'ready');
      await refreshIdentity();
    }catch(error){
      setStatus(api?.friendlyError?api.friendlyError(error):error.message,'error');
    }
  }
  async function saveMember(){
    const orgId=orgSelectEl?.value||'';
    const principalId=clean(document.getElementById('identity-member-principal')?.value||'',160);
    const role=document.getElementById('identity-member-role')?.value||'member';
    if(!orgId||!principalId){setStatus('Choose an organization and member id first.','error');return;}
    setStatus('Saving member...','loading');
    try{
      await request('/identity/orgs/'+encodeURIComponent(orgId)+'/'+'members',{
        method:'POST',
        body:JSON.stringify({principal_id:principalId,role}),
        timeoutMs:10000
      });
      setStatus('Member saved with role '+role+'.','ready');
      await refreshIdentity();
    }catch(error){
      setStatus(api?.friendlyError?api.friendlyError(error):error.message,'error');
    }
  }
  async function removeMember(){
    const orgId=orgSelectEl?.value||'';
    const principalId=clean(document.getElementById('identity-member-principal')?.value||'',160);
    if(!orgId||!principalId){setStatus('Choose an organization and member id first.','error');return;}
    setStatus('Removing member...','loading');
    try{
      await request('/identity/orgs/'+encodeURIComponent(orgId)+'/'+'members/'+encodeURIComponent(principalId),{method:'DELETE',timeoutMs:10000});
      setStatus('Member removed.','ready');
      await refreshIdentity();
    }catch(error){
      setStatus(api?.friendlyError?api.friendlyError(error):error.message,'error');
    }
  }
  async function disableOrg(){
    const orgId=orgSelectEl?.value||'';
    if(!orgId){setStatus('Choose an organization first.','error');return;}
    setStatus('Disabling organization...','loading');
    try{
      await request('/identity/orgs/'+encodeURIComponent(orgId),{method:'DELETE',timeoutMs:10000});
      setStatus('Organization disabled.','ready');
      await refreshIdentity();
    }catch(error){
      setStatus(api?.friendlyError?api.friendlyError(error):error.message,'error');
    }
  }
  function openSharing(){
    const target=document.getElementById('sharing-center')||document.getElementById('progress-dashboard');
    if(target)target.open=true;
    location.hash=target?.id||'progress-dashboard';
    setStatus('Opened sharing panel.','ready');
  }
  function bindControls(){
    document.getElementById('identity-refresh')?.addEventListener('click',refreshIdentity);
    document.getElementById('identity-create-org')?.addEventListener('click',createOrg);
    document.getElementById('identity-add-member')?.addEventListener('click',saveMember);
    document.getElementById('identity-remove-member')?.addEventListener('click',removeMember);
    document.getElementById('identity-disable-org')?.addEventListener('click',disableOrg);
    document.getElementById('identity-open-share')?.addEventListener('click',openSharing);
  }
  function install(){
    if(document.getElementById('identity-orgs'))return;
    const details=document.createElement('details');
    details.id='identity-orgs';
    details.className='mimir-provider-drawer identity-orgs';
    details.innerHTML=''+
      '<summary>+ Identity / Organizations</summary>'+
      '<section class="mimir-dashboard" aria-labelledby="identity-orgs-title">'+
        '<div class="dashboard-heading"><div><p class="eyebrow">Free-first teams</p><h2 id="identity-orgs-title">Accounts, organizations and roles</h2></div></div>'+
        '<p id="identity-orgs-status" class="dashboard-note" data-state="idle" aria-live="polite"></p>'+
        '<div id="identity-orgs-root" class="identity-orgs-root" aria-live="polite"></div>'+
      '</section>';
    const admin=document.getElementById('admin-governance');
    const access=document.getElementById('access-control');
    const settings=document.getElementById('backend-settings');
    main.insertBefore(details,admin||access||settings||null);
    statusEl=document.getElementById('identity-orgs-status');
    rootEl=document.getElementById('identity-orgs-root');
    render(fallbackIdentity(),[]);
    refreshIdentity();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
