(function(){
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
  let statusEl=null;
  let currentBundle=null;

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
          '<div><dt>Access</dt><dd>Preview link holder</dd></div>'+
        '</dl>'+
        '<pre><code>'+safe(payload)+'</code></pre>'+
      '</article>';
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
      '<div class="sharing-actions">'+
        '<button id="sharing-build" type="button">Build safe preview</button>'+
        '<button id="sharing-copy-text" type="button">Copy text</button>'+
        '<button id="sharing-copy-link" type="button">Copy preview link</button>'+
        '<button id="sharing-export" type="button">Export JSON</button>'+
        '<button id="sharing-clear-hash" type="button">Clear URL payload</button>'+
      '</div>'+
      '<div class="sharing-policy-grid">'+
        '<article><strong>Redacted first</strong><span>Token-like strings, private-key blocks and sensitive fields are removed before output.</span></article>'+
        '<article><strong>Free/local</strong><span>Preview links are generated in the browser and do not require a backend.</span></article>'+
        '<article><strong>Backend later</strong><span>Real team permissions require authenticated protected sharing before production use.</span></article>'+
      '</div>'+
      '<div id="sharing-preview" class="sharing-preview" aria-live="polite"></div>'+
      '<p id="sharing-status" class="dashboard-note" data-state="idle" aria-live="polite"></p>';
    typeEl=document.getElementById('sharing-type');
    itemEl=document.getElementById('sharing-item');
    previewEl=document.getElementById('sharing-preview');
    statusEl=document.getElementById('sharing-status');
    typeEl?.addEventListener('change',()=>{currentBundle=null;renderOptions();renderPreview();});
    document.getElementById('sharing-refresh')?.addEventListener('click',()=>{renderOptions();setStatus('Shareable items refreshed.','ready');});
    document.getElementById('sharing-build')?.addEventListener('click',buildBundle);
    document.getElementById('sharing-copy-text')?.addEventListener('click',copyText);
    document.getElementById('sharing-copy-link')?.addEventListener('click',copyLink);
    document.getElementById('sharing-export')?.addEventListener('click',exportJson);
    document.getElementById('sharing-clear-hash')?.addEventListener('click',clearHash);
    renderOptions();
    if(!loadSharedHash())renderPreview();
  }

  window.addEventListener('hashchange',loadSharedHash);
  window.addEventListener('mmir-conversations-updated',renderOptions);
  window.addEventListener('mmir-artifacts-updated',renderOptions);
  window.addEventListener('mmir-knowledge-collections-updated',renderOptions);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
