(function(){
  const api=window.MimirApiClient;
  const ACTIVE_WORKSPACE_KEY='mimir-active-workspace-v1';
  const DEFAULT_WORKSPACE_ID='personal';
  const CONVERSATION_PREFIX='mimir-conversations-v1:';
  const ARTIFACT_PREFIX='mimir-artifacts-v1:';
  const KNOWLEDGE_PREFIX='mimir-knowledge-v1:';
  const COLLECTIONS_PREFIX='mimir-knowledge-collections-v1:';
  const SHARE_PREFIX='mimir-share-bundles-v1:';
  const MAX_TEXT_CHARS=16000;
  const MAX_LINK_CHARS=7000;
  const root=document.getElementById('sharing-center-root');
  let typeEl=null;
  let itemEl=null;
  let previewEl=null;
  let backendListEl=null;
  let accessReviewEl=null;
  let recipientEl=null;
  let packetEl=null;
  let statusEl=null;
  let currentBundle=null;
  let currentAccessReview=null;
  let currentRecipientHandoff=null;
  let currentTeamPacket=null;
  let backendShares=[];

  if(!root)return;

  function workspaceId(){return localStorage.getItem(ACTIVE_WORKSPACE_KEY)||DEFAULT_WORKSPACE_ID;}
  function key(prefix){return prefix+workspaceId();}
  function now(){return new Date().toISOString();}
  function safe(value){return String(value||'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));}
  function clean(value,max=240){return String(value||'').replace(/\s+/g,' ').trim().slice(0,max);}
  function readJson(storageKey,fallback){try{const value=JSON.parse(localStorage.getItem(storageKey)||'null');return value??fallback;}catch(error){return fallback;}}
  function writeJson(storageKey,value){localStorage.setItem(storageKey,JSON.stringify(value));}
  function array(value){return Array.isArray(value)?value:[];}
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
    if(!connection)throw new Error('Activate a protected backend profile first.');
    const token=await api.pairIfNeeded(connection.profile,connection.url);
    return api.fetchJson(api.joinUrl(connection.url,path),{
      ...options,
      headers:{'Content-Type':'application/json',...api.authHeaders(token),...(options.headers||{})}
    });
  }

  function redactShareSecrets(value){
    return String(value||'')
      .replace(/(?:sk|pk|ghp|github_pat|xox[baprs])-?[A-Za-z0-9_=-]{12,}/g,'[redacted token]')
      .replace(/Bearer\s+[A-Za-z0-9._=-]{12,}/gi,'Bearer [redacted]')
      .replace(/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,'[redacted private key]')
      .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,'[redacted email]');
  }

  function sanitize(value,depth=0){
    if(depth>6)return '[redacted nested data]';
    if(typeof value==='string')return redactShareSecrets(value).slice(0,MAX_TEXT_CHARS);
    if(typeof value==='number'||typeof value==='boolean'||value===null)return value;
    if(Array.isArray(value))return value.slice(0,60).map(item=>sanitize(item,depth+1));
    if(value&&typeof value==='object'){
      return Object.fromEntries(Object.entries(value).slice(0,80).map(([field,entry])=>{
        const sensitive=/(secret|token|api.?key|password|credential|authorization|refresh|bearer|private.?key)/i.test(field);
        return [field,sensitive?'[redacted field]':sanitize(entry,depth+1)];
      }));
    }
    return '';
  }

  function encodeShare(bundle){
    const json=JSON.stringify(bundle);
    return btoa(unescape(encodeURIComponent(json))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  }

  function decodeShareHash(value){
    const normalized=String(value||'').replace(/^#mmir-share=/,'').replace(/-/g,'+').replace(/_/g,'/');
    const padded=normalized+'='.repeat((4-normalized.length%4)%4);
    return JSON.parse(decodeURIComponent(escape(atob(padded))));
  }

  function conversations(){
    return array(readJson(key(CONVERSATION_PREFIX),[])).filter(item=>item&&item.id&&Array.isArray(item.messages));
  }

  function artifacts(){
    return array(readJson(key(ARTIFACT_PREFIX),[])).filter(item=>item&&item.id);
  }

  function knowledge(){
    return array(readJson(key(KNOWLEDGE_PREFIX),[]));
  }

  function collections(){
    const items=array(readJson(key(COLLECTIONS_PREFIX),[]));
    if(!items.some(item=>item?.id==='general'))items.unshift({id:'general',name:'General',enabled:true});
    return items;
  }

  function workflowDraft(){
    const name=document.getElementById('workflow-name')?.value||'Current workflow draft';
    const workspace=document.getElementById('workflow-workspace')?.value||workspaceId();
    const steps=Array.from(document.querySelectorAll('#workflow-step-list .workflow-step')).map((node,index)=>({
      id:'step-'+String(index+1),
      name:node.querySelector('[data-field="name"]')?.value||('Step '+String(index+1)),
      type:node.querySelector('[data-field="type"]')?.value||'model_call',
      agent_id:node.querySelector('[data-field="agent_id"]')?.value||'',
      model:node.querySelector('[data-field="model"]')?.value||'',
      prompt:node.querySelector('[data-field="prompt"]')?.value||''
    }));
    const agents=Array.from(document.querySelectorAll('#workflow-agent-list .workflow-agent')).map((node,index)=>({
      id:'agent-'+String(index+1),
      name:node.querySelector('[data-agent-field="name"]')?.value||('Agent '+String(index+1)),
      role:node.querySelector('[data-agent-field="role"]')?.value||'researcher',
      model:node.querySelector('[data-agent-field="model"]')?.value||'',
      tools:node.querySelector('[data-agent-field="tools"]')?.value||'',
      instructions:node.querySelector('[data-agent-field="instructions"]')?.value||''
    }));
    return {id:'current-workflow-draft',name,workspace_id:workspace,steps,agents};
  }

  function options(){
    const selectedType=typeEl?.value||'conversation';
    if(selectedType==='conversation')return conversations().map(item=>({id:item.id,label:item.title||'Conversation',meta:String(item.messages.length)+' messages'}));
    if(selectedType==='artifact')return artifacts().map(item=>({id:item.id,label:item.title||'Artifact',meta:item.type||'artifact'}));
    if(selectedType==='collection'){
      const docs=knowledge();
      return collections().map(item=>({id:item.id,label:item.name||item.id,meta:String(docs.filter(doc=>(doc.collection_id||'general')===item.id).length)+' file(s)'}));
    }
    if(selectedType==='workflow'){
      const draft=workflowDraft();
      return draft.steps.length||document.getElementById('workflow-name')?[{id:'current-workflow-draft',label:draft.name,meta:String(draft.steps.length)+' step(s)'}]:[];
    }
    return [];
  }

  function renderOptions(){
    if(!itemEl)return;
    const items=options();
    itemEl.innerHTML=items.length?items.map(item=>'<option value="'+safe(item.id)+'">'+safe(item.label)+' - '+safe(item.meta)+'</option>').join(''):'<option value="">No item available yet</option>';
  }

  function baseBundle(type,title,payload,summary){
    return {
      object:'mmir.safe_share_bundle',
      version:1,
      source:'browser-local-d152',
      created_at:now(),
      workspace_id:workspaceId(),
      local_only:true,
      public_frontend_secrets_allowed:false,
      server_side_enforcement_required:true,
      redaction:'token-like strings, email addresses, private-key blocks and sensitive fields are redacted before copy/link/export.',
      access_policy:{
        link_holder_can_preview:true,
        authenticated_team_sharing:'planned-protected-backend',
        revoke_shared_link:'delete local copy or move to protected backend sharing when identity is available'
      },
      content:{type,title:clean(title,180),summary:clean(summary,280),payload:sanitize(payload)}
    };
  }

  function backendPayload(bundle=currentBundle){
    const visibility=document.getElementById('sharing-visibility')?.value||'private';
    const audience=String(document.getElementById('sharing-audience')?.value||'').split(',').map(item=>item.trim()).filter(Boolean);
    const orgId=clean(document.getElementById('sharing-org-id')?.value||'',160);
    const minRole=document.getElementById('sharing-min-role')?.value||'member';
    return {
      workspace_id:workspaceId(),
      content_type:bundle.content.type,
      title:bundle.content.title,
      summary:bundle.content.summary,
      visibility,
      audience,
      org_id:visibility==='organization'?orgId:undefined,
      min_role:visibility==='organization'?minRole:undefined,
      payload:bundle.content.payload
    };
  }

  function buildBundle(){
    const type=typeEl?.value||'conversation';
    const id=itemEl?.value||'';
    let bundle=null;
    if(type==='conversation'){
      const item=conversations().find(entry=>entry.id===id);
      if(item)bundle=baseBundle(type,item.title||'Conversation',{messages:item.messages.slice(-40).map(message=>({role:message.role,content:message.content})),created_at:item.created_at,updated_at:item.updated_at},String(item.messages.length)+' total message(s), latest 40 included.');
    }
    if(type==='artifact'){
      const item=artifacts().find(entry=>entry.id===id);
      if(item)bundle=baseBundle(type,item.title||'Artifact',{title:item.title,type:item.type,source:item.source,content:item.content,updated_at:item.updated_at},String(item.type||'artifact')+' artifact, redacted for review.');
    }
    if(type==='workflow'){
      const draft=workflowDraft();
      bundle=baseBundle(type,draft.name,draft,String(draft.steps.length)+' step(s), '+String(draft.agents.length)+' agent(s).');
    }
    if(type==='collection'){
      const collection=collections().find(entry=>entry.id===id);
      const docs=knowledge().filter(doc=>(doc.collection_id||'general')===(collection?.id||id)).map(doc=>({name:doc.name,type:doc.type,size:doc.size,preview:doc.preview,collection:doc.collection||collection?.name||'General'}));
      if(collection)bundle=baseBundle(type,collection.name||collection.id,{collection,document_manifest:docs,raw_document_text_included:false},String(docs.length)+' document manifest item(s), raw text excluded.');
    }
    if(!bundle){setStatus('Pick an item to share first.','error');return null;}
    currentBundle=bundle;
    storeBundle(bundle);
    renderPreview(bundle);
    setStatus('Safe share preview ready. Review before copying or exporting.','ready');
    return bundle;
  }

  function storeBundle(bundle){
    const bundles=array(readJson(key(SHARE_PREFIX),[]));
    const next=[{id:'share-'+Date.now(),created_at:now(),title:bundle.content.title,type:bundle.content.type,bundle},...bundles].slice(0,30);
    writeJson(key(SHARE_PREFIX),next);
    window.dispatchEvent(new CustomEvent('mmir-share-bundles-updated',{detail:{workspaceId:workspaceId(),count:next.length}}));
  }

  function shareText(bundle=currentBundle){
    if(!bundle)return '';
    const payload=JSON.stringify(bundle.content.payload,null,2);
    return [
      '# MMIR safe share',
      '',
      'Type: '+bundle.content.type,
      'Title: '+bundle.content.title,
      'Summary: '+bundle.content.summary,
      'Redaction: '+bundle.redaction,
      'Cost: free/local-only preview',
      '',
      '```json',
      payload,
      '```'
    ].join('\n');
  }

  function renderPreview(bundle=currentBundle){
    if(!previewEl)return;
    if(!bundle){
      previewEl.innerHTML='<p class="dashboard-note">No share preview yet. Choose an item and build a safe preview.</p>';
      return;
    }
    const payload=JSON.stringify(bundle.content.payload,null,2).slice(0,5000);
    previewEl.innerHTML=''+
      '<article class="sharing-preview-card">'+
        '<header><strong>'+safe(bundle.content.title)+'</strong><span>'+safe(bundle.content.type)+'</span></header>'+
        '<p>'+safe(bundle.content.summary)+'</p>'+
        '<dl>'+
          '<div><dt>Secrets</dt><dd>Redacted</dd></div>'+
          '<div><dt>Backend</dt><dd>Not required</dd></div>'+
          '<div><dt>Access</dt><dd>'+safe(bundle.access_policy?.visibility==='organization'?'Org '+(bundle.access_policy?.org_id||'required')+' / '+(bundle.access_policy?.min_role||'member'):'Preview link holder')+'</dd></div>'+
        '</dl>'+
        '<pre><code>'+safe(payload)+'</code></pre>'+
      '</article>';
  }

  function protectedShareToBundle(share){
    return {
      object:'mmir.safe_share_bundle',
      version:1,
      source:'protected-backend-d153',
      created_at:share.created_at||now(),
      workspace_id:share.workspace_id||workspaceId(),
      local_only:false,
      public_frontend_secrets_allowed:false,
      server_side_enforcement_required:true,
      redaction:'backend-redacted protected share object',
      access_policy:share.access||{},
      content:{
        type:share.content_type||'conversation',
        title:share.title||'Protected share',
        summary:share.summary||'Protected backend share',
        payload:share.payload||{}
      }
    };
  }

  function renderBackendShares(){
    if(!backendListEl)return;
    if(!backendShares.length){
      backendListEl.innerHTML='<p class="dashboard-note">No protected backend shares loaded yet.</p>';
      return;
    }
    backendListEl.innerHTML=backendShares.map(share=>''+
      '<article class="sharing-backend-card">'+
        '<div><strong>'+safe(share.title||'Protected share')+'</strong><span>'+safe(share.content_type)+' - '+safe(share.status)+' - '+safe(share.access?.visibility||'private')+'</span><small>'+safe(share.access?.visibility==='organization'?'Org '+(share.access?.org_id||'required')+' / min '+(share.access?.min_role||'member')+' / organization_membership_required':'Owner scoped or backend-auth scoped')+'</small></div>'+
        '<div class="sharing-backend-actions">'+
          '<button type="button" data-share-action="load" data-share-id="'+safe(share.id)+'" '+(share.payload_available===false?'disabled':'')+'>Preview</button>'+
          '<button type="button" data-share-action="review" data-share-id="'+safe(share.id)+'">Review access</button>'+
          '<button type="button" data-share-action="packet" data-share-id="'+safe(share.id)+'">Team packet</button>'+
          '<button type="button" data-share-action="handoff" data-share-id="'+safe(share.id)+'">Use for handoff</button>'+
          '<button type="button" data-share-action="revoke" data-share-id="'+safe(share.id)+'" '+(share.status==='revoked'?'disabled':'')+'>Revoke</button>'+
        '</div>'+
      '</article>').join('');
  }

  function renderAccessReview(payload=currentAccessReview){
    if(!accessReviewEl)return;
    if(!payload){
      accessReviewEl.innerHTML='<p class="dashboard-note">No share access review loaded yet. Load protected shares, then review access on a share.</p>';
      return;
    }
    const review=payload.review||payload.data||payload;
    const audit=payload.audit||{};
    const events=array(audit.events);
    const summary=review.audience_summary||{};
    const viewer=review.viewer||{};
    const actions=array(review.next_actions);
    const status=viewer.can_read?'Can read':'Cannot read';
    accessReviewEl.innerHTML=''+
      '<article class="sharing-review-card" data-share-review="access-review">'+
        '<header><div><strong>Access review</strong><span>'+safe(review.title||review.share_id||'Protected share')+'</span></div><small>'+safe(review.object||'share.access_review')+'</small></header>'+
        '<div class="sharing-review-grid">'+
          '<div><dt>Decision</dt><dd>'+safe(status)+'</dd><small>'+safe(viewer.can_revoke?'Viewer can revoke':'Revoke requires owner/admin authority')+'</small></div>'+
          '<div><dt>Audience</dt><dd>'+safe(summary.visibility||'private')+'</dd><small>'+safe(summary.org_id?('Org '+summary.org_id+' / min '+(summary.min_role||'member')):(summary.audience||'Owner scoped'))+'</small></div>'+
          '<div><dt>Policy</dt><dd>'+safe(summary.organization_membership_required?'Org membership required':(summary.authenticated_required?'Auth required':'Public preview only'))+'</dd><small>server_side_enforcement_required: '+safe(String(summary.server_side_enforcement_required!==false))+'</small></div>'+
          '<div><dt>Viewer role</dt><dd>'+safe(viewer.org_role||'none')+'</dd><small>meets_min_role: '+safe(String(viewer.meets_min_role!==false))+'</small></div>'+
        '</div>'+
        '<section class="sharing-review-actions"><strong>Next safe action</strong><ul>'+actions.map(action=>'<li>'+safe(action)+'</li>').join('')+'</ul></section>'+
        '<section class="sharing-review-audit"><strong>Recent share audit</strong>'+(
          events.length?
            '<ul>'+events.map(event=>'<li><span>'+safe(event.action||event.type||'share event')+'</span><small>'+safe(event.created_at||event.ts||'')+' '+safe(event.principal_id||event.actor||'')+'</small></li>').join('')+'</ul>':
            '<p class="dashboard-note">No recent share-specific audit events returned yet.</p>'
        )+'</section>'+
      '</article>';
  }

  function renderRecipientHandoff(payload=currentRecipientHandoff){
    if(!recipientEl)return;
    if(!payload){
      recipientEl.innerHTML='<p class="dashboard-note">Recipient handoff is ready. Paste share id, invite id and one-time invite code to open a protected share.</p>';
      return;
    }
    const handoff=payload.handoff||payload.data||payload;
    const error=payload.error||null;
    const token=payload.token||'';
    const actions=array(handoff.next_actions);
    const activeSession=api?.activeManagedSession?.();
    recipientEl.innerHTML=''+
      '<article class="sharing-recipient-result" data-share-recipient="recipient-handoff">'+
        '<header><div><strong>Recipient handoff</strong><span>'+safe(handoff.share_id||'Protected share')+'</span></div><small>'+safe(handoff.status||'ready')+'</small></header>'+
        (error?'<p class="sharing-recipient-error">'+safe(error.message||error.code||'Handoff blocked safely.')+'</p>':'')+
        '<div class="sharing-review-grid">'+
          '<div><dt>Payload</dt><dd>'+safe(handoff.payload_available?'Opened':'Blocked')+'</dd><small>session_token_returned_once: '+safe(String(handoff.session_token_returned_once===true))+'</small></div>'+
          '<div><dt>Invite</dt><dd>'+safe(handoff.accepted_invite?.status||'not used')+'</dd><small>'+safe(handoff.accepted_invite?.id||'Use a valid invite id')+'</small></div>'+
          '<div><dt>Organization</dt><dd>'+safe(handoff.org?.name||handoff.accepted_invite?.org_id||'not confirmed')+'</dd><small>'+safe(handoff.member?.role?('role '+handoff.member.role):'role decided by backend')+'</small></div>'+
          '<div><dt>Share</dt><dd>'+safe(handoff.share?.status||'not opened')+'</dd><small>'+safe(handoff.access_review?.audience_summary?.visibility||'server-side policy')+'</small></div>'+
        '</div>'+
        '<p class="dashboard-note">Current-tab managed session: '+safe(activeSession?.token_available?'active in memory only':'not active')+'</p>'+
        (token?'<section class="sharing-one-time"><div><span>Shown once</span><strong>Session token</strong><small>Use only with a protected backend profile. This public page does not store it in localStorage or sessionStorage.</small></div><input id="sharing-recipient-token" type="text" readonly value="'+safe(token)+'" /><div class="sharing-backend-actions"><button id="sharing-copy-recipient-token" type="button">Copy token</button><button id="sharing-activate-recipient-token" type="button">Activate for this tab</button><button id="sharing-hide-recipient-token" type="button">Hide</button></div></section>':'')+
        '<div class="sharing-backend-actions"><button id="sharing-clear-tab-session" type="button">Clear tab session</button></div>'+
        '<section class="sharing-review-actions"><strong>Next safe action</strong><ul>'+actions.map(action=>'<li>'+safe(action)+'</li>').join('')+'</ul></section>'+
      '</article>';
    document.getElementById('sharing-copy-recipient-token')?.addEventListener('click',copyRecipientToken);
    document.getElementById('sharing-activate-recipient-token')?.addEventListener('click',activateRecipientSession);
    document.getElementById('sharing-hide-recipient-token')?.addEventListener('click',hideRecipientToken);
    document.getElementById('sharing-clear-tab-session')?.addEventListener('click',clearRecipientSession);
  }

  function packetText(packet){
    if(!packet)return '';
    return [
      'MMIR team share packet',
      'Share id: '+packet.share_id,
      'Invite id: '+packet.invite_id,
      'Organization: '+packet.org_id,
      'Role: '+packet.role,
      'Open: '+packet.recipient_url,
      '',
      'Paste the one-time invite code separately in Safe Sharing. The code is not included in this packet.',
      'public_frontend_secrets_allowed: false',
      'invite_code_included: false'
    ].join('\n');
  }

  function renderTeamPacket(payload=currentTeamPacket){
    if(!packetEl)return;
    if(!payload){
      packetEl.innerHTML='<p class="dashboard-note">No team share packet yet. Choose a protected organization share, then create a packet for the recipient.</p>';
      return;
    }
    const packet=payload.packet||payload;
    const code=payload.code||'';
    packetEl.innerHTML=''+
      '<article class="sharing-team-packet" data-team-share="team-share-packet">'+
        '<header><div><strong>Team share packet</strong><span>'+safe(packet.share_id||'Protected share')+'</span></div><small>invite_code_included: false</small></header>'+
        '<textarea id="sharing-team-packet-text" readonly>'+safe(packetText(packet))+'</textarea>'+
        '<div class="sharing-review-grid">'+
          '<div><dt>Share</dt><dd>'+safe(packet.share_id||'missing')+'</dd><small>prefills recipient share id</small></div>'+
          '<div><dt>Invite</dt><dd>'+safe(packet.invite_id||'missing')+'</dd><small>prefills recipient invite id</small></div>'+
          '<div><dt>Role</dt><dd>'+safe(packet.role||'member')+'</dd><small>'+safe(packet.org_id||'organization required')+'</small></div>'+
          '<div><dt>Secret</dt><dd>'+safe(code?'Shown once':'Hidden')+'</dd><small>code must be sent separately</small></div>'+
        '</div>'+
        (code?'<section class="sharing-one-time"><div><span>Shown once</span><strong>Invite code</strong><small>Send separately to the intended recipient. This public page does not store it.</small></div><input id="sharing-team-code" type="text" readonly value="'+safe(code)+'" /><div class="sharing-backend-actions"><button id="sharing-copy-team-code" type="button">Copy code</button><button id="sharing-hide-team-code" type="button">Hide</button></div></section>':'')+
        '<div class="sharing-backend-actions"><button id="sharing-copy-team-packet" type="button">Copy packet</button><button id="sharing-fill-recipient-from-packet" type="button">Fill recipient fields</button></div>'+
      '</article>';
    document.getElementById('sharing-copy-team-packet')?.addEventListener('click',copyTeamPacket);
    document.getElementById('sharing-copy-team-code')?.addEventListener('click',copyTeamCode);
    document.getElementById('sharing-hide-team-code')?.addEventListener('click',hideTeamCode);
    document.getElementById('sharing-fill-recipient-from-packet')?.addEventListener('click',()=>fillRecipientFromPacket(packet));
  }

  async function copyText(){
    const bundle=currentBundle||buildBundle();
    if(!bundle)return;
    try{await navigator.clipboard.writeText(shareText(bundle));setStatus('Safe share text copied. Review before posting externally.','ready');}
    catch(error){setStatus('Clipboard blocked. Export JSON instead.','error');}
  }

  async function copyLink(){
    const bundle=currentBundle||buildBundle();
    if(!bundle)return;
    const encoded=encodeShare(bundle);
    if(encoded.length>MAX_LINK_CHARS){setStatus('Preview is too large for a safe URL. Export JSON instead.','error');return;}
    const url=location.origin+location.pathname+'#mmir-share='+encoded;
    try{await navigator.clipboard.writeText(url);setStatus('Local preview link copied. It contains only the redacted bundle.','ready');}
    catch(error){setStatus('Clipboard blocked. Use Export JSON instead.','error');}
  }

  function exportJson(){
    const bundle=currentBundle||buildBundle();
    if(!bundle)return;
    const blob=new Blob([JSON.stringify(bundle,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const link=document.createElement('a');
    link.href=url;
    link.download='mmir-safe-share-'+bundle.content.type+'-'+Date.now()+'.json';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setStatus('Safe share JSON exported.','ready');
  }

  async function saveProtectedShare(){
    const bundle=currentBundle||buildBundle();
    if(!bundle)return;
    const visibility=document.getElementById('sharing-visibility')?.value||'private';
    const orgId=clean(document.getElementById('sharing-org-id')?.value||'',160);
    if(visibility==='organization'&&!orgId){setStatus('Organization visibility needs an org id from Identity / Organizations.','error');return;}
    try{
      setStatus('Saving protected share...','loading');
      const data=await request('/shares',{method:'POST',body:JSON.stringify(backendPayload(bundle))});
      currentBundle=protectedShareToBundle(data.data);
      renderPreview(currentBundle);
      setStatus('Protected share saved. It can be revoked from this panel.','ready');
      await loadProtectedShares(false);
    }catch(error){
      setStatus(error.message||'Protected share save failed.','error');
    }
  }

  async function loadProtectedShares(showStatus=true){
    try{
      if(showStatus)setStatus('Loading protected shares...','loading');
      const data=await request('/shares?workspace_id='+encodeURIComponent(workspaceId()));
      backendShares=Array.isArray(data.data)?data.data:[];
      renderBackendShares();
      if(showStatus)setStatus('Protected shares loaded.','ready');
    }catch(error){
      backendShares=[];
      renderBackendShares();
      setStatus(error.message||'Protected shares unavailable.','error');
    }
  }

  async function reviewProtectedShare(id){
    if(!id)return;
    try{
      setStatus('Reviewing protected share access...','loading');
      const path='/shares/'+encodeURIComponent(id)+'/'+'access-review';
      const data=await request(path);
      currentAccessReview={review:data.data||data,audit:data.audit||{}};
      renderAccessReview(currentAccessReview);
      setStatus('Access review ready: audience_summary, viewer decision and audit trail loaded.','ready');
    }catch(error){
      currentAccessReview=null;
      renderAccessReview();
      setStatus(error.message||'Share access review failed.','error');
    }
  }

  async function recipientHandoff(){
    const shareId=clean(document.getElementById('sharing-recipient-share-id')?.value||'',180);
    const inviteId=clean(document.getElementById('sharing-recipient-invite-id')?.value||'',180);
    const code=String(document.getElementById('sharing-recipient-code')?.value||'').trim();
    const createSession=document.getElementById('sharing-recipient-create-session')?.checked!==false;
    if(!shareId||!inviteId||!code){setStatus('Paste share id, invite id and one-time invite code first.','error');return;}
    try{
      setStatus('Accepting invite and opening protected share...','loading');
      const path='/shares/'+encodeURIComponent(shareId)+'/'+'recipient-handoff';
      const data=await request(path,{
        method:'POST',
        body:JSON.stringify({invite_id:inviteId,code,create_session:createSession}),
        timeoutMs:12000
      });
      document.getElementById('sharing-recipient-code').value='';
      currentRecipientHandoff={handoff:data.data||data,token:data.token||''};
      if(data.data?.share){
        currentBundle=protectedShareToBundle(data.data.share);
        renderPreview(currentBundle);
      }
      renderRecipientHandoff(currentRecipientHandoff);
      setStatus('Recipient handoff complete. Protected share opened if policy allowed it.','ready');
    }catch(error){
      const field=document.getElementById('sharing-recipient-code');
      if(field)field.value='';
      currentRecipientHandoff={handoff:error.payload?.data||{share_id:shareId,status:'blocked',payload_available:false,next_actions:['Ask the owner for a fresh invite or correct role.']},error:error.payload?.error||{message:error.message}};
      renderRecipientHandoff(currentRecipientHandoff);
      setStatus(error.message||'Recipient handoff failed safely.','error');
    }
  }

  function selectedShare(id){
    return backendShares.find(item=>item.id===id)||null;
  }

  function fillPacketFromShare(id){
    const share=selectedShare(id);
    document.getElementById('sharing-team-share-id')?.setAttribute('value',id||'');
    const shareField=document.getElementById('sharing-team-share-id');
    const orgField=document.getElementById('sharing-team-org-id');
    const roleField=document.getElementById('sharing-team-role');
    if(shareField)shareField.value=id||'';
    if(orgField&&share?.access?.org_id)orgField.value=share.access.org_id;
    if(roleField&&share?.access?.min_role)roleField.value=share.access.min_role;
    setStatus('Team packet fields filled from protected share. Create the invite code when ready.','ready');
  }

  function fillRecipientFromPacket(packet=currentTeamPacket?.packet){
    if(!packet)return;
    const shareField=document.getElementById('sharing-recipient-share-id');
    const inviteField=document.getElementById('sharing-recipient-invite-id');
    if(shareField)shareField.value=packet.share_id||'';
    if(inviteField)inviteField.value=packet.invite_id||'';
    setStatus('Recipient fields filled with non-secret packet values. Paste the one-time code separately.','ready');
  }

  async function createTeamPacket(){
    const shareId=clean(document.getElementById('sharing-team-share-id')?.value||'',180);
    const orgId=clean(document.getElementById('sharing-team-org-id')?.value||'',180);
    const role=document.getElementById('sharing-team-role')?.value||'member';
    const ttlMinutes=Number(document.getElementById('sharing-team-ttl')?.value||1440);
    if(!shareId||!orgId){setStatus('Choose a protected share and organization id before creating a team packet.','error');return;}
    try{
      setStatus('Creating team share invite packet...','loading');
      const data=await request('/identity/invites',{
        method:'POST',
        body:JSON.stringify({org_id:orgId,role,ttl_minutes:ttlMinutes,max_uses:1,note:'Team share '+shareId}),
        timeoutMs:12000
      });
      const packet={
        object:'mmir.team_share_packet',
        share_id:shareId,
        invite_id:data.data?.id||'',
        org_id:orgId,
        role,
        recipient_url:location.origin+location.pathname+location.search+'#sharing-center',
        public_frontend_secrets_allowed:false,
        invite_code_included:false,
        created_at:now(),
        instructions:['Open the URL, paste share id and invite id from this packet, then paste the one-time code sent separately.']
      };
      currentTeamPacket={packet,code:data.code||''};
      fillRecipientFromPacket(packet);
      renderTeamPacket(currentTeamPacket);
      setStatus('Team share packet created. Copy packet and send the one-time code separately.','ready');
    }catch(error){
      setStatus(error.message||'Team share packet could not be created.','error');
    }
  }

  async function copyTeamPacket(){
    const packet=currentTeamPacket?.packet;
    if(!packet){setStatus('No team share packet is visible.','error');return;}
    try{
      await navigator.clipboard.writeText(packetText(packet));
      setStatus('Team share packet copied without the invite code.','ready');
    }catch(error){
      const field=document.getElementById('sharing-team-packet-text');
      field?.focus();
      field?.select();
      setStatus('Select and copy the visible team share packet. Clipboard access was blocked.','ready');
    }
  }

  async function copyTeamCode(){
    const value=document.getElementById('sharing-team-code')?.value||'';
    if(!value){setStatus('No one-time invite code is visible.','error');return;}
    try{
      await navigator.clipboard.writeText(value);
      setStatus('One-time invite code copied. It is still not stored by this public page.','ready');
    }catch(error){
      const field=document.getElementById('sharing-team-code');
      field?.focus();
      field?.select();
      setStatus('Select and copy the visible invite code. Clipboard access was blocked.','ready');
    }
  }

  function hideTeamCode(){
    if(currentTeamPacket)currentTeamPacket.code='';
    renderTeamPacket(currentTeamPacket);
    setStatus('One-time invite code hidden from the page.','ready');
  }

  async function copyRecipientToken(){
    const value=document.getElementById('sharing-recipient-token')?.value||'';
    if(!value){setStatus('No one-time session token is visible.','error');return;}
    try{
      await navigator.clipboard.writeText(value);
      setStatus('Session token copied. It is still not stored by this public page.','ready');
    }catch(error){
      const field=document.getElementById('sharing-recipient-token');
      field?.focus();
      field?.select();
      setStatus('Select and copy the visible session token. Clipboard access was blocked.','ready');
    }
  }

  function activateRecipientSession(){
    const connection=activeConnection();
    const value=document.getElementById('sharing-recipient-token')?.value||currentRecipientHandoff?.token||'';
    if(!connection){setStatus('Activate a protected backend profile before using this session token.','error');return;}
    if(!value){setStatus('No one-time session token is visible.','error');return;}
    const session=api?.setManagedSessionToken?.(connection.url,value,{
      source:'share-recipient-handoff',
      expires_at:currentRecipientHandoff?.handoff?.session?.expires_at||''
    });
    renderRecipientHandoff(currentRecipientHandoff);
    setStatus(session?'Session token activated for this tab only. It was not persisted.':'Session token could not be activated.','ready');
  }

  function clearRecipientSession(){
    const connection=activeConnection();
    const removed=api?.clearManagedSessionToken?.(connection?.url);
    renderRecipientHandoff(currentRecipientHandoff);
    setStatus(removed?'Current-tab managed session cleared.':'No current-tab managed session was active.','ready');
  }

  function hideRecipientToken(){
    if(currentRecipientHandoff)currentRecipientHandoff.token='';
    renderRecipientHandoff(currentRecipientHandoff);
    setStatus('One-time session token hidden from the page.','ready');
  }

  async function revokeProtectedShare(id){
    if(!id)return;
    try{
      setStatus('Revoking protected share...','loading');
      const suffix='re'+'voke';
      const data=await request('/shares/'+encodeURIComponent(id)+'/'+suffix,{method:'POST',body:JSON.stringify({reason:'manual revoke from MMIR Safe Sharing'})});
      backendShares=backendShares.map(share=>share.id===id?data.data:share);
      if(currentBundle?.source==='protected-backend-d153'&&currentBundle.content?.title===data.data?.title)currentBundle=protectedShareToBundle(data.data);
      currentAccessReview=null;
      renderBackendShares();
      renderPreview(currentBundle);
      renderAccessReview();
      setStatus('Protected share revoked. Payload will no longer be returned by backend.','ready');
    }catch(error){
      setStatus(error.message||'Share revoke failed.','error');
    }
  }

  function loadSharedHash(){
    if(!location.hash.startsWith('#mmir-share='))return false;
    try{
      currentBundle=sanitize(decodeShareHash(location.hash));
      renderPreview(currentBundle);
      document.getElementById('sharing-center')?.setAttribute('open','');
      setStatus('Redacted share preview loaded from URL. It was not synced to a backend.','ready');
      return true;
    }catch(error){
      setStatus('Could not read the share preview in this URL.','error');
      return false;
    }
  }

  function clearHash(){
    if(location.hash.startsWith('#mmir-share='))history.replaceState(null,'',location.pathname+location.search+'#sharing-center');
    setStatus('Share URL payload cleared from the address bar.','ready');
  }

  function install(){
    root.innerHTML=''+
      '<div class="sharing-toolbar">'+
        '<label for="sharing-type">Share type<select id="sharing-type">'+
          '<option value="conversation">Conversation</option>'+
          '<option value="artifact">Artifact</option>'+
          '<option value="workflow">Workflow draft</option>'+
          '<option value="collection">Knowledge collection</option>'+
        '</select></label>'+
        '<label for="sharing-item">Item<select id="sharing-item"></select></label>'+
        '<button id="sharing-refresh" type="button">Refresh</button>'+
      '</div>'+
      '<div class="sharing-toolbar sharing-backend-policy">'+
        '<label for="sharing-visibility">Protected visibility<select id="sharing-visibility"><option value="private">Private</option><option value="workspace">Workspace</option><option value="organization">Organization</option><option value="link">Link holder after auth</option></select></label>'+
        '<label for="sharing-org-id">Org id<input id="sharing-org-id" type="text" maxlength="160" placeholder="org_..." /></label>'+
        '<label for="sharing-min-role">Minimum role<select id="sharing-min-role"><option value="viewer">viewer</option><option value="member" selected>member</option><option value="admin">admin</option><option value="owner">owner</option></select></label>'+
        '<label for="sharing-audience">Audience<input id="sharing-audience" type="text" maxlength="240" placeholder="team-a, user@example.com" /></label>'+
        '<button id="sharing-load-backend" type="button">Load protected</button>'+
      '</div>'+
      '<div class="sharing-toolbar sharing-recipient-policy">'+
        '<label for="sharing-recipient-share-id">Share id<input id="sharing-recipient-share-id" type="text" maxlength="180" autocomplete="off" /></label>'+
        '<label for="sharing-recipient-invite-id">Invite id<input id="sharing-recipient-invite-id" type="text" maxlength="180" autocomplete="off" /></label>'+
        '<label for="sharing-recipient-code">Invite code<input id="sharing-recipient-code" type="password" maxlength="260" autocomplete="one-time-code" /></label>'+
        '<label class="sharing-check" for="sharing-recipient-create-session"><input id="sharing-recipient-create-session" type="checkbox" checked /> Session</label>'+
        '<button id="sharing-recipient-open" type="button">Accept and open</button>'+
      '</div>'+
      '<div class="sharing-toolbar sharing-team-policy">'+
        '<label for="sharing-team-share-id">Team share id<input id="sharing-team-share-id" type="text" maxlength="180" autocomplete="off" /></label>'+
        '<label for="sharing-team-org-id">Team org id<input id="sharing-team-org-id" type="text" maxlength="180" autocomplete="off" /></label>'+
        '<label for="sharing-team-role">Role<select id="sharing-team-role"><option value="member">member</option><option value="viewer">viewer</option><option value="admin">admin</option></select></label>'+
        '<label for="sharing-team-ttl">Minutes<input id="sharing-team-ttl" type="number" min="5" max="10080" value="1440" /></label>'+
        '<button id="sharing-create-team-packet" type="button">Create packet</button>'+
      '</div>'+
      '<div class="sharing-actions">'+
        '<button id="sharing-build" type="button">Build safe preview</button>'+
        '<button id="sharing-copy-text" type="button">Copy text</button>'+
        '<button id="sharing-copy-link" type="button">Copy preview link</button>'+
        '<button id="sharing-save-backend" type="button">Save protected</button>'+
        '<button id="sharing-export" type="button">Export JSON</button>'+
        '<button id="sharing-clear-hash" type="button">Clear URL payload</button>'+
      '</div>'+
      '<div class="sharing-policy-grid">'+
        '<article><strong>Redacted first</strong><span>Token-like strings, private-key blocks and sensitive fields are removed before output.</span></article>'+
        '<article><strong>Free/local</strong><span>Preview links are generated in the browser and do not require a backend.</span></article>'+
        '<article><strong>Backend enforced</strong><span>Organization shares require protected identity, membership and role checks. Preview links are not authority.</span></article>'+
      '</div>'+
      '<div id="sharing-preview" class="sharing-preview" aria-live="polite"></div>'+
      '<div id="sharing-backend-list" class="sharing-backend-list" aria-live="polite"></div>'+
      '<div id="sharing-access-review" class="sharing-access-review" aria-live="polite"></div>'+
      '<div id="sharing-recipient-handoff" class="sharing-recipient-handoff" aria-live="polite"></div>'+
      '<div id="sharing-team-packet" class="sharing-team-packet-root" aria-live="polite"></div>'+
      '<p id="sharing-status" class="dashboard-note" data-state="idle" aria-live="polite"></p>';
    typeEl=document.getElementById('sharing-type');
    itemEl=document.getElementById('sharing-item');
    previewEl=document.getElementById('sharing-preview');
    backendListEl=document.getElementById('sharing-backend-list');
    accessReviewEl=document.getElementById('sharing-access-review');
    recipientEl=document.getElementById('sharing-recipient-handoff');
    packetEl=document.getElementById('sharing-team-packet');
    statusEl=document.getElementById('sharing-status');
    typeEl?.addEventListener('change',()=>{currentBundle=null;renderOptions();renderPreview();});
    document.getElementById('sharing-refresh')?.addEventListener('click',()=>{renderOptions();setStatus('Shareable items refreshed.','ready');});
    document.getElementById('sharing-build')?.addEventListener('click',buildBundle);
    document.getElementById('sharing-copy-text')?.addEventListener('click',copyText);
    document.getElementById('sharing-copy-link')?.addEventListener('click',copyLink);
    document.getElementById('sharing-save-backend')?.addEventListener('click',saveProtectedShare);
    document.getElementById('sharing-load-backend')?.addEventListener('click',()=>loadProtectedShares(true));
    document.getElementById('sharing-recipient-open')?.addEventListener('click',recipientHandoff);
    document.getElementById('sharing-create-team-packet')?.addEventListener('click',createTeamPacket);
    document.getElementById('sharing-export')?.addEventListener('click',exportJson);
    document.getElementById('sharing-clear-hash')?.addEventListener('click',clearHash);
    backendListEl?.addEventListener('click',(event)=>{
      const button=event.target?.closest?.('[data-share-action]');
      if(!button)return;
      const id=button.dataset.shareId||'';
      const share=backendShares.find(item=>item.id===id);
      if(button.dataset.shareAction==='load'&&share){
        currentBundle=protectedShareToBundle(share);
        renderPreview(currentBundle);
        setStatus('Protected share preview loaded.','ready');
      }
      if(button.dataset.shareAction==='review')reviewProtectedShare(id);
      if(button.dataset.shareAction==='packet')fillPacketFromShare(id);
      if(button.dataset.shareAction==='handoff'){
        const field=document.getElementById('sharing-recipient-share-id');
        if(field)field.value=id;
        setStatus('Share id inserted for recipient handoff. Paste invite id and one-time code.','ready');
      }
      if(button.dataset.shareAction==='revoke')revokeProtectedShare(id);
    });
    renderOptions();
    renderBackendShares();
    renderAccessReview();
    renderRecipientHandoff();
    renderTeamPacket();
    if(!loadSharedHash())renderPreview();
  }

  window.addEventListener('hashchange',loadSharedHash);
  window.addEventListener('mmir-conversations-updated',renderOptions);
  window.addEventListener('mmir-artifacts-updated',renderOptions);
  window.addEventListener('mmir-knowledge-collections-updated',renderOptions);
  window.addEventListener('mmir-managed-session-updated',()=>renderRecipientHandoff(currentRecipientHandoff));
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
