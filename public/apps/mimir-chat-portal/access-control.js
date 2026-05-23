(function(){
  const api=window.MimirApiClient;
  const main=document.querySelector('.mimir-chat-main');
  let statusEl=null;
  let rootEl=null;
  let decisionEl=null;

  if(!main)return;

  const localPolicy={
    object:'access.policy',
    mode:'rbac-beta-fail-closed',
    default_decision:'deny',
    resource_types:['model','tool','knowledge','node','workflow','admin'],
    actions:['read','use','manage','delete','share'],
    roles:[
      {role:'owner',resources:{model:['read','use','manage','delete','share'],tool:['read','use','manage','delete'],knowledge:['read','use','manage','delete','share'],node:['read','use','manage','delete'],workflow:['read','use','manage','delete','share'],admin:['read','manage']}},
      {role:'admin',resources:{model:['read','use','manage'],tool:['read','use','manage'],knowledge:['read','use','manage'],node:['read','use','manage'],workflow:['read','use','manage'],admin:['read']}},
      {role:'member',resources:{model:['read','use'],tool:['read','use'],knowledge:['read','use'],node:['read'],workflow:['read','use'],admin:[]}},
      {role:'viewer',resources:{model:['read'],tool:['read'],knowledge:['read'],node:['read'],workflow:['read'],admin:['read']}}
    ],
    policy:{
      public_frontend_authority:false,
      server_side_enforcement_required:true,
      unknown_role_allowed:false,
      unknown_resource_allowed:false,
      secrets_in_rules_allowed:false
    },
    enforcement:{
      status:'browser-local-advisory',
      role_source:'request-simulation-only',
      note:'Local policy preview only. Runtime actions must be checked by a protected backend.'
    }
  };

  function clean(value,max=200){return String(value||'').replace(/\s+/g,' ').trim().slice(0,max);}
  function token(value,fallback=''){return clean(value,80).toLowerCase().replace(/[^a-z0-9._:-]+/g,'-')||fallback;}
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
    const localToken=await api.pairIfNeeded(connection.profile,connection.url);
    return api.fetchJson(api.joinUrl(connection.url,path),{
      ...options,
      headers:{...api.authHeaders(localToken),...(options.headers||{})}
    });
  }
  function localCheck(input={}){
    const role=token(input.role,'member');
    const resourceType=token(input.resource_type,'model');
    const action=token(input.action,'read');
    const resourceId=clean(input.resource_id||'*',160)||'*';
    const roleRule=localPolicy.roles.find(item=>item.role===role);
    const reasons=[];
    if(!roleRule)reasons.push('unknown role');
    if(!localPolicy.resource_types.includes(resourceType))reasons.push('unknown resource type');
    if(!localPolicy.actions.includes(action))reasons.push('unknown action');
    const allowedActions=roleRule?.resources?.[resourceType]||[];
    const allowed=reasons.length===0&&allowedActions.includes(action);
    if(!allowed&&!reasons.length)reasons.push(role+' cannot '+action+' '+resourceType);
    return {
      object:'access.decision',
      allowed,
      role,
      action,
      resource_type:resourceType,
      resource_id:resourceId,
      decision:allowed?'allow':'deny',
      reasons:allowed?['matched browser-local policy preview']:reasons,
      enforcement:{status:'browser-local-advisory',simulation:true,server_side_recheck_required:true},
      obligations:allowed?['re-check server-side at execution time','audit metadata only','never expose provider secrets to public frontend']:['fail closed','show user a safe explanation','do not execute the requested action'],
      policy_version:'browser-local-rbac-preview'
    };
  }
  function card(title,body){return '<article class="access-card"><h3>'+escapeHtml(title)+'</h3>'+body+'</article>';}
  function renderPolicy(policy){
    if(!rootEl)return;
    const roles=policy.roles||[];
    const resourceTypes=policy.resource_types||[];
    const header='<tr><th>Role</th>'+resourceTypes.map(type=>'<th>'+escapeHtml(type)+'</th>').join('')+'</tr>';
    const rows=roles.map(role=>{
      const cells=resourceTypes.map(type=>'<td>'+escapeHtml((role.resources?.[type]||[]).join(', ')||'deny')+'</td>').join('');
      return '<tr><th>'+escapeHtml(role.role)+'</th>'+cells+'</tr>';
    }).join('');
    const policyRows=Object.entries(policy.policy||{}).map(([key,value])=>'<div><span>'+escapeHtml(key.replace(/_/g,' '))+'</span><strong>'+escapeHtml(String(value))+'</strong></div>').join('');
    rootEl.innerHTML=''+
      '<div class="access-summary-row">'+
        card('Mode','<strong>'+escapeHtml(policy.mode||'unknown')+'</strong><span>'+escapeHtml(policy.enforcement?.status||'advisory')+'</span>')+
        card('Default','<strong>'+escapeHtml(policy.default_decision||'deny')+'</strong><span>fail closed when unknown</span>')+
        card('Frontend authority','<strong>'+escapeHtml(String(policy.policy?.public_frontend_authority===true))+'</strong><span>public Pages can display, not decide</span>')+
        card('Runtime check','<strong>'+escapeHtml(String(policy.policy?.server_side_enforcement_required!==false))+'</strong><span>model/tool actions re-check server-side</span>')+
      '</div>'+
      '<div class="access-grid">'+
        card('Policy flags','<div class="access-policy-grid">'+policyRows+'</div>')+
        card('RBAC matrix','<div class="access-table-wrap"><table class="access-table">'+header+rows+'</table></div>')+
      '</div>';
  }
  function renderDecision(decision){
    if(!decisionEl)return;
    const state=decision.allowed?'allow':'deny';
    const reasons=(decision.reasons||[]).map(reason=>'<li>'+escapeHtml(reason)+'</li>').join('');
    const obligations=(decision.obligations||[]).map(item=>'<li>'+escapeHtml(item)+'</li>').join('');
    decisionEl.innerHTML=''+
      '<article class="access-decision" data-state="'+escapeHtml(state)+'">'+
        '<div><span>Decision</span><strong>'+escapeHtml(decision.decision||state)+'</strong></div>'+
        '<div><span>Request</span><strong>'+escapeHtml(decision.role+' / '+decision.action+' / '+decision.resource_type)+'</strong></div>'+
        '<div><span>Resource</span><strong>'+escapeHtml(decision.resource_id||'*')+'</strong></div>'+
        '<div><span>Enforcement</span><strong>'+escapeHtml(decision.enforcement?.status||'advisory')+'</strong></div>'+
        '<section><h3>Reasons</h3><ul>'+reasons+'</ul></section>'+
        '<section><h3>Obligations</h3><ul>'+obligations+'</ul></section>'+
      '</article>';
  }
  async function loadPolicy(){
    setStatus('Loading access policy...','loading');
    try{
      if(activeConnection()){
        const policy=await request('/access/policies',{method:'GET',timeoutMs:10000});
        renderPolicy(policy);
        setStatus('Protected access policy loaded from backend.','ready');
        return;
      }
      renderPolicy(localPolicy);
      setStatus('Showing browser-local RBAC preview. Activate a backend for live policy.','ready');
    }catch(error){
      renderPolicy(localPolicy);
      setStatus(api?.friendlyError?api.friendlyError(error):error.message,'error');
    }
  }
  async function checkAccess(){
    const input={
      role:document.getElementById('access-role')?.value||'member',
      resource_type:document.getElementById('access-resource-type')?.value||'model',
      action:document.getElementById('access-action')?.value||'read',
      resource_id:document.getElementById('access-resource-id')?.value||'*'
    };
    setStatus('Checking access...','loading');
    try{
      if(activeConnection()){
        const decision=await request('/access/check',{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify(input),
          timeoutMs:10000
        });
        renderDecision(decision);
        setStatus('Backend access decision returned. Runtime actions still re-check server-side.','ready');
        return;
      }
      const decision=localCheck(input);
      renderDecision(decision);
      setStatus('Browser-local decision preview returned. Runtime actions still require backend enforcement.','ready');
    }catch(error){
      renderDecision(localCheck(input));
      setStatus(api?.friendlyError?api.friendlyError(error):error.message,'error');
    }
  }
  function openAdmin(){
    const target=document.getElementById('admin-governance')||document.getElementById('progress-dashboard');
    if(target)target.open=true;
    location.hash=target?.id||'progress-dashboard';
    setStatus('Opened governance panel.','ready');
  }
  function selectOptions(values,current){
    return values.map(value=>'<option value="'+escapeHtml(value)+'"'+(value===current?' selected':'')+'>'+escapeHtml(value)+'</option>').join('');
  }
  function install(){
    if(document.getElementById('access-control'))return;
    const details=document.createElement('details');
    details.id='access-control';
    details.className='mimir-provider-drawer access-control';
    details.innerHTML=''+
      '<summary>+ Access / RBAC</summary>'+
      '<section class="mimir-dashboard" aria-labelledby="access-control-title">'+
        '<div class="dashboard-heading"><div><p class="eyebrow">Zero-trust gates</p><h2 id="access-control-title">Roles, resources and action policy</h2></div></div>'+
        '<div class="access-controls-grid">'+
          '<label for="access-role">Role<select id="access-role">'+selectOptions(['owner','admin','member','viewer','contractor'],'member')+'</select></label>'+
          '<label for="access-resource-type">Resource<select id="access-resource-type">'+selectOptions(localPolicy.resource_types,'model')+'</select></label>'+
          '<label for="access-action">Action<select id="access-action">'+selectOptions(localPolicy.actions,'use')+'</select></label>'+
          '<label for="access-resource-id">Resource id<input id="access-resource-id" type="text" value="default-model" autocomplete="off" /></label>'+
        '</div>'+
        '<div class="workflow-builder-actions">'+
          '<button id="access-load-policy" type="button">Load policy</button>'+
          '<button id="access-check" type="button">Check access</button>'+
          '<button id="access-open-admin" type="button">Open governance</button>'+
        '</div>'+
        '<p id="access-status" class="dashboard-note" data-state="idle" aria-live="polite"></p>'+
        '<div id="access-decision-root" class="access-decision-root" aria-live="polite"></div>'+
        '<div id="access-root" class="access-root" aria-live="polite"></div>'+
      '</section>';
    const admin=document.getElementById('admin-governance');
    const settings=document.getElementById('backend-settings');
    main.insertBefore(details,admin||settings||null);
    statusEl=document.getElementById('access-status');
    rootEl=document.getElementById('access-root');
    decisionEl=document.getElementById('access-decision-root');
    document.getElementById('access-load-policy')?.addEventListener('click',loadPolicy);
    document.getElementById('access-check')?.addEventListener('click',checkAccess);
    document.getElementById('access-open-admin')?.addEventListener('click',openAdmin);
    renderPolicy(localPolicy);
    renderDecision(localCheck({role:'member',resource_type:'model',action:'use',resource_id:'default-model'}));
    setStatus('Access policy preview is ready. Backend routes: /access/policies and /access/check.','ready');
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
