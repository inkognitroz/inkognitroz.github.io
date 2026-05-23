(function(){
  const api=window.MimirApiClient;
  const main=document.querySelector('.mimir-chat-main');
  let statusEl=null;
  let rootEl=null;
  let orgSelectEl=null;
  let currentOrgs=[];
  let currentSessions=[];
  let currentInvites=[];
  let lastOneTimeCredential=null;

  if(!main)return;

  function clean(value,max=200){return String(value||'').replace(/\s+/g,' ').trim().slice(0,max);}
  function slug(value){return clean(value,80).toLowerCase().replace(/[^a-z0-9._-]+/g,'-').replace(/^-+|-+$/g,'')||'mmir-org';}
  function escapeHtml(value){return String(value||'').replace(/[&<>"']/g,(char)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));}
  function setStatus(message,state){if(statusEl){statusEl.textContent=message||'';statusEl.dataset.state=state||'idle';}}
  function friendly(error){return api?.friendlyError?api.friendlyError(error):error.message;}
  function numericInput(id,fallback){
    const value=Number(document.getElementById(id)?.value||fallback);
    return Number.isFinite(value)&&value>0?value:fallback;
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
        session_tokens_planned:false,
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
  function relativeTime(value){
    if(!value)return 'not used';
    const parsed=Date.parse(value);
    if(!Number.isFinite(parsed))return value;
    return new Date(parsed).toLocaleString();
  }
  function statusLabel(record){
    const status=record.status||'unknown';
    return '<span class="identity-status-chip" data-state="'+escapeHtml(status)+'">'+escapeHtml(status)+'</span>';
  }
  function sessionCards(){
    if(!currentSessions.length){
      return '<article class="identity-empty"><strong>No active session tokens listed</strong><span>Create a short-lived token only when you need device/API handoff. It is returned once and stored as a hash server-side.</span></article>';
    }
    return currentSessions.map(session=>'<article class="identity-security-card">'+
      '<div class="identity-card-head"><div><h3>'+escapeHtml(session.note||session.id||'MMIR session')+'</h3><span>'+escapeHtml(session.id||'session')+'</span></div>'+statusLabel(session)+'</div>'+
      '<div class="identity-chip-row"><span>principal '+escapeHtml(session.principal_id||'unknown')+'</span><span>role '+escapeHtml(session.role||'member')+'</span><span>org '+escapeHtml(session.org_id||'personal')+'</span></div>'+
      '<div class="identity-policy-mini">'+policyRows({expires_at:relativeTime(session.expires_at),last_used_at:relativeTime(session.last_used_at),public_frontend_secrets_allowed:session.public_frontend_secrets_allowed===true})+'</div>'+
      '<button type="button" data-identity-action="revoke-session" data-session-id="'+escapeHtml(session.id||'')+'" class="danger">Revoke session</button>'+
    '</article>').join('');
  }
  function inviteCards(){
    if(!currentInvites.length){
      return '<article class="identity-empty"><strong>No organization invites listed</strong><span>Create an expiring invite code for a selected organization. Codes are returned once and never stored by the public frontend.</span></article>';
    }
    return currentInvites.map(invite=>'<article class="identity-security-card">'+
      '<div class="identity-card-head"><div><h3>'+escapeHtml(invite.note||invite.id||'Organization invite')+'</h3><span>'+escapeHtml(invite.id||'invite')+'</span></div>'+statusLabel(invite)+'</div>'+
      '<div class="identity-chip-row"><span>org '+escapeHtml(invite.org_id||'unknown')+'</span><span>role '+escapeHtml(invite.role||'member')+'</span><span>uses '+String(invite.use_count||0)+'/'+String(invite.max_uses||1)+'</span></div>'+
      '<div class="identity-policy-mini">'+policyRows({expires_at:relativeTime(invite.expires_at),last_accepted_at:relativeTime(invite.last_accepted_at),public_frontend_secrets_allowed:invite.public_frontend_secrets_allowed===true})+'</div>'+
      '<div class="identity-inline-actions"><button type="button" data-identity-action="use-invite" data-invite-id="'+escapeHtml(invite.id||'')+'">Use id</button><button type="button" data-identity-action="revoke-invite" data-invite-id="'+escapeHtml(invite.id||'')+'" class="danger">Revoke invite</button></div>'+
    '</article>').join('');
  }
  function credentialPanel(){
    if(!lastOneTimeCredential)return '';
    return '<article class="identity-one-time" aria-live="polite">'+
      '<div><span>Shown once</span><strong>'+escapeHtml(lastOneTimeCredential.label)+'</strong><small>'+escapeHtml(lastOneTimeCredential.detail||'Copy now. It is not stored in the browser after refresh.').replace(/\n/g,'<br>')+'</small></div>'+
      '<input id="identity-one-time-value" type="text" readonly value="'+escapeHtml(lastOneTimeCredential.value||'')+'" />'+
      '<div class="identity-inline-actions"><button id="identity-copy-credential" type="button">Copy</button><button id="identity-clear-credential" type="button">Hide</button></div>'+
    '</article>';
  }
  function updateOrgSelect(){
    if(!orgSelectEl)return;
    orgSelectEl.innerHTML=currentOrgs.length?currentOrgs.map(org=>'<option value="'+escapeHtml(org.id)+'">'+escapeHtml(org.name||org.id)+'</option>').join(''):'<option value="">No backend org yet</option>';
  }
  function render(identity,orgs,sessions=[],invites=[],warnings=[]){
    if(!rootEl)return;
    currentOrgs=Array.isArray(orgs)?orgs:[];
    currentSessions=Array.isArray(sessions)?sessions:[];
    currentInvites=Array.isArray(invites)?invites:[];
    const principal=identity.principal||{};
    const policy=identity.policy||{};
    const orgCards=currentOrgs.length?currentOrgs.map(orgCard).join(''):'<article class="identity-empty"><strong>No backend organization yet</strong><span>Create a free organization on the active protected backend when ready.</span></article>';
    const warningPanel=warnings.length?'<div class="identity-warning">'+warnings.map(escapeHtml).join('<br>')+'</div>':'';
    rootEl.innerHTML=''+
      '<div class="identity-summary-row">'+
        '<article><span>Principal</span><strong>'+escapeHtml(principal.id||'unknown')+'</strong><small>'+escapeHtml(principal.auth_source||principal.type||'unknown')+'</small></article>'+
        '<article><span>Organizations</span><strong>'+String(currentOrgs.length)+'</strong><small>free-first workspace ownership</small></article>'+
        '<article><span>Sessions</span><strong>'+String(currentSessions.length)+'</strong><small>short-lived and revocable</small></article>'+
        '<article><span>Invites</span><strong>'+String(currentInvites.length)+'</strong><small>expiring organization handoff</small></article>'+
      '</div>'+
      warningPanel+
      credentialPanel()+
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
      '<div class="identity-security-grid">'+
        '<article class="identity-security-form"><h3>Short-lived session</h3><p>Create a revocable token for device/API handoff. Role is inherited from the selected organization; owner/admin boundaries stay backend-enforced.</p><label for="identity-session-ttl">Minutes<input id="identity-session-ttl" type="number" min="5" max="720" value="120" /></label><label for="identity-session-note">Note<input id="identity-session-note" type="text" placeholder="Laptop handoff" autocomplete="off" /></label><button id="identity-create-session" type="button">Create session token</button></article>'+
        '<article class="identity-security-form"><h3>Invite</h3><p>Create an expiring code for a selected organization. Invites cannot grant owner and are stored as hashes server-side.</p><label for="identity-invite-role">Invite role<select id="identity-invite-role"><option value="member">member</option><option value="viewer">viewer</option><option value="admin">admin</option></select></label><label for="identity-invite-ttl">Minutes<input id="identity-invite-ttl" type="number" min="5" max="10080" value="1440" /></label><label for="identity-invite-uses">Uses<input id="identity-invite-uses" type="number" min="1" max="25" value="1" /></label><label for="identity-invite-note">Note<input id="identity-invite-note" type="text" placeholder="Launch team invite" autocomplete="off" /></label><button id="identity-create-invite" type="button">Create invite code</button></article>'+
        '<article class="identity-security-form"><h3>Accept invite</h3><p>Paste an invite id and one-time code from a trusted owner/admin. The public page does not save the code.</p><label for="identity-accept-invite-id">Invite id<input id="identity-accept-invite-id" type="text" autocomplete="off" /></label><label for="identity-accept-invite-code">Invite code<input id="identity-accept-invite-code" type="password" autocomplete="one-time-code" /></label><button id="identity-accept-invite" type="button">Accept invite</button></article>'+
      '</div>'+
      '<div class="identity-policy-panel"><h3>Identity policy</h3><p>owner/admin role changes, session issuance and invite acceptance are enforced by protected backend policy.</p>'+policyRows(policy)+'</div>'+
      '<div class="identity-split-grid"><section><h3>Organizations</h3><div class="identity-org-grid">'+orgCards+'</div></section><section><h3>Sessions</h3><div class="identity-org-grid">'+sessionCards()+'</div></section><section><h3>Invites</h3><div class="identity-org-grid">'+inviteCards()+'</div></section></div>';
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
  async function optionalList(path,label,warnings){
    try{
      const data=await request(path,{method:'GET',timeoutMs:10000});
      return Array.isArray(data.data)?data.data:[];
    }catch(error){
      warnings.push(label+' unavailable on the active backend yet.');
      return [];
    }
  }
  async function refreshIdentity(){
    setStatus('Loading identity...','loading');
    try{
      if(activeConnection()){
        const warnings=[];
        const identity=await request('/identity/me',{method:'GET',timeoutMs:10000});
        const orgList=await request('/identity/orgs',{method:'GET',timeoutMs:10000});
        const orgs=await loadOrgDetails(orgList.data||identity.organizations||[]);
        const sessions=await optionalList('/identity/sessions','Sessions',warnings);
        const invites=await optionalList('/identity/invites','Invites',warnings);
        render(identity,orgs,sessions,invites,warnings);
        setStatus(warnings.length?'Identity loaded; update backend for every session/invite route.':'Protected identity, sessions and invites loaded.','ready');
        return;
      }
      render(fallbackIdentity(),[],[],[]);
      setStatus('Showing browser-local identity fallback. Activate a protected backend to create teams.','ready');
    }catch(error){
      render(fallbackIdentity(),[],[],[],[friendly(error)]);
      setStatus(friendly(error),'error');
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
      setStatus(friendly(error),'error');
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
      setStatus(friendly(error),'error');
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
      setStatus(friendly(error),'error');
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
      setStatus(friendly(error),'error');
    }
  }
  async function createSession(){
    const orgId=orgSelectEl?.value||'';
    setStatus('Creating short-lived session token...','loading');
    try{
      const data=await request('/identity/sessions',{
        method:'POST',
        body:JSON.stringify({
          org_id:orgId||undefined,
          ttl_minutes:numericInput('identity-session-ttl',120),
          note:clean(document.getElementById('identity-session-note')?.value||'MMIR session handoff',160)
        }),
        timeoutMs:10000
      });
      lastOneTimeCredential={label:'Session token',value:data.token||'',detail:'Use as Bearer mmir_sess... or x-mmir-session-token. It is returned once and not stored in this public page.'};
      setStatus('Session token created. Copy it now if you need it.','ready');
      await refreshIdentity();
    }catch(error){
      setStatus(friendly(error),'error');
    }
  }
  async function revokeSession(id){
    if(!id){setStatus('Choose a session first.','error');return;}
    setStatus('Revoking session...','loading');
    try{
      await request('/identity/sessions/'+encodeURIComponent(id)+'/'+'revoke',{method:'POST',timeoutMs:10000});
      setStatus('Session revoked.','ready');
      await refreshIdentity();
    }catch(error){
      setStatus(friendly(error),'error');
    }
  }
  async function createInvite(){
    const orgId=orgSelectEl?.value||'';
    if(!orgId){setStatus('Create or choose an organization first.','error');return;}
    setStatus('Creating invite code...','loading');
    try{
      const data=await request('/identity/invites',{
        method:'POST',
        body:JSON.stringify({
          org_id:orgId,
          role:document.getElementById('identity-invite-role')?.value||'member',
          ttl_minutes:numericInput('identity-invite-ttl',1440),
          max_uses:numericInput('identity-invite-uses',1),
          note:clean(document.getElementById('identity-invite-note')?.value||'MMIR organization invite',160)
        }),
        timeoutMs:10000
      });
      lastOneTimeCredential={label:'Invite code',value:data.code||'',detail:'Share this code only with the intended user. It is returned once and not stored in this public page.'};
      setStatus('Invite code created. Copy it now if you need it.','ready');
      await refreshIdentity();
    }catch(error){
      setStatus(friendly(error),'error');
    }
  }
  async function acceptInvite(){
    const inviteId=clean(document.getElementById('identity-accept-invite-id')?.value||'',180);
    const code=clean(document.getElementById('identity-accept-invite-code')?.value||'',260);
    if(!inviteId||!code){setStatus('Paste invite id and invite code first.','error');return;}
    setStatus('Accepting invite...','loading');
    try{
      await request('/identity/invites/'+encodeURIComponent(inviteId)+'/'+'accept',{
        method:'POST',
        body:JSON.stringify({code}),
        timeoutMs:10000
      });
      document.getElementById('identity-accept-invite-code').value='';
      setStatus('Invite accepted.','ready');
      await refreshIdentity();
    }catch(error){
      setStatus(friendly(error),'error');
    }
  }
  async function revokeInvite(id){
    if(!id){setStatus('Choose an invite first.','error');return;}
    setStatus('Revoking invite...','loading');
    try{
      await request('/identity/invites/'+encodeURIComponent(id)+'/'+'revoke',{method:'POST',timeoutMs:10000});
      setStatus('Invite revoked.','ready');
      await refreshIdentity();
    }catch(error){
      setStatus(friendly(error),'error');
    }
  }
  async function copyCredential(){
    const value=document.getElementById('identity-one-time-value')?.value||'';
    if(!value){setStatus('No one-time credential is visible.','error');return;}
    try{
      await navigator.clipboard.writeText(value);
      setStatus('Copied one-time credential. Store it securely outside the public page.','ready');
    }catch(error){
      const field=document.getElementById('identity-one-time-value');
      field?.focus();
      field?.select();
      setStatus('Select and copy the visible credential. Browser clipboard access was blocked.','ready');
    }
  }
  function clearCredential(){
    lastOneTimeCredential=null;
    refreshIdentity();
  }
  function useInvite(id){
    const field=document.getElementById('identity-accept-invite-id');
    if(field)field.value=id||'';
    setStatus('Invite id inserted. Paste the one-time code to accept.','ready');
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
    document.getElementById('identity-create-session')?.addEventListener('click',createSession);
    document.getElementById('identity-create-invite')?.addEventListener('click',createInvite);
    document.getElementById('identity-accept-invite')?.addEventListener('click',acceptInvite);
    document.getElementById('identity-open-share')?.addEventListener('click',openSharing);
    document.getElementById('identity-copy-credential')?.addEventListener('click',copyCredential);
    document.getElementById('identity-clear-credential')?.addEventListener('click',clearCredential);
    rootEl?.querySelectorAll('[data-identity-action]').forEach((button)=>{
      button.addEventListener('click',()=>{
        const action=button.dataset.identityAction;
        if(action==='revoke-session')revokeSession(button.dataset.sessionId||'');
        if(action==='revoke-invite')revokeInvite(button.dataset.inviteId||'');
        if(action==='use-invite')useInvite(button.dataset.inviteId||'');
      });
    });
  }
  function install(){
    if(document.getElementById('identity-orgs'))return;
    const details=document.createElement('details');
    details.id='identity-orgs';
    details.className='mimir-provider-drawer identity-orgs';
    details.innerHTML=''+
      '<summary>+ Identity / Organizations</summary>'+
      '<section class="mimir-dashboard" aria-labelledby="identity-orgs-title">'+
        '<div class="dashboard-heading"><div><p class="eyebrow">Free-first teams</p><h2 id="identity-orgs-title">Accounts, organizations, sessions and invites</h2></div></div>'+
        '<p id="identity-orgs-status" class="dashboard-note" data-state="idle" aria-live="polite"></p>'+
        '<div id="identity-orgs-root" class="identity-orgs-root" aria-live="polite"></div>'+
      '</section>';
    const admin=document.getElementById('admin-governance');
    const access=document.getElementById('access-control');
    const settings=document.getElementById('backend-settings');
    main.insertBefore(details,admin||access||settings||null);
    statusEl=document.getElementById('identity-orgs-status');
    rootEl=document.getElementById('identity-orgs-root');
    render(fallbackIdentity(),[],[],[]);
    refreshIdentity();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
