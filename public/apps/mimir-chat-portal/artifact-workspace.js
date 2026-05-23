(function(){
  const ACTIVE_WORKSPACE_KEY='mimir-active-workspace-v1';
  const DEFAULT_WORKSPACE_ID='personal';
  const ARTIFACT_PREFIX='mimir-artifacts-v1:';
  const main=document.querySelector('.mimir-chat-main');
  let artifacts=[];
  let activeId='';
  let listEl=null;
  let titleEl=null;
  let typeEl=null;
  let contentEl=null;
  let previewEl=null;
  let statusEl=null;

  if(!main)return;

  function workspaceId(){return localStorage.getItem(ACTIVE_WORKSPACE_KEY)||DEFAULT_WORKSPACE_ID;}
  function key(){return ARTIFACT_PREFIX+workspaceId();}
  function clean(value,fallbackOrMax='',maxMaybe=4000){
    const fallback=typeof fallbackOrMax==='number'?'':String(fallbackOrMax||'');
    const max=typeof fallbackOrMax==='number'?fallbackOrMax:maxMaybe;
    const cleaned=String(value||'').replace(/\s+/g,' ').trim().slice(0,max);
    return cleaned||fallback;
  }
  function text(value,max=24000){return String(value||'').replace(/\u0000/g,'').slice(0,max);}
  function now(){return new Date().toISOString();}
  function escapeHtml(value){
    return String(value||'').replace(/[&<>"']/g,(char)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  }
  function setStatus(message,state){if(statusEl){statusEl.textContent=message||'';statusEl.dataset.state=state||'idle';}}
  function readArtifacts(){
    try{
      const parsed=JSON.parse(localStorage.getItem(key())||'[]');
      return Array.isArray(parsed)?parsed:[];
    }catch(error){
      return [];
    }
  }
  function saveArtifacts(){
    localStorage.setItem(key(),JSON.stringify(artifacts));
  }
  function defaultArtifact(){
    return {
      id:'artifact-'+Date.now(),
      title:'First MMIR launch plan',
      type:'plan',
      source:'automatic',
      content:'Goal: get useful value before setup.\n\n1. Start with the free browser guide.\n2. Connect MMIR Local Node when ready.\n3. Install one small local model.\n4. Add one knowledge collection.\n5. Turn repeated work into a workflow.',
      created_at:now(),
      updated_at:now()
    };
  }
  function normalizeArtifact(input){
    return {
      id:clean(input?.id,'artifact-'+Date.now(),80),
      title:clean(input?.title,'Untitled artifact',120),
      type:['document','code','plan','workflow'].includes(input?.type)?input.type:'document',
      source:clean(input?.source,'manual',80),
      content:text(input?.content,24000),
      created_at:clean(input?.created_at,now(),80),
      updated_at:clean(input?.updated_at,now(),80)
    };
  }
  function loadArtifacts(){
    artifacts=readArtifacts().map(normalizeArtifact);
    if(!artifacts.length){
      artifacts=[defaultArtifact()];
      saveArtifacts();
    }
    activeId=artifacts.some(item=>item.id===activeId)?activeId:artifacts[0].id;
  }
  function activeArtifact(){return artifacts.find(item=>item.id===activeId)||artifacts[0]||null;}
  function renderList(){
    if(!listEl)return;
    listEl.innerHTML='';
    artifacts.forEach(item=>{
      const button=document.createElement('button');
      button.type='button';
      button.className='artifact-list-item'+(item.id===activeId?' is-active':'');
      button.dataset.artifactId=item.id;
      button.innerHTML='<strong>'+escapeHtml(item.title)+'</strong><span>'+escapeHtml(item.type)+' · '+escapeHtml(item.source)+'</span>';
      button.addEventListener('click',()=>{
        activeId=item.id;
        render();
      });
      listEl.appendChild(button);
    });
  }
  function renderEditor(){
    const item=activeArtifact();
    if(!item)return;
    if(titleEl)titleEl.value=item.title;
    if(typeEl)typeEl.value=item.type;
    if(contentEl)contentEl.value=item.content;
    renderPreview(item);
  }
  function renderPreview(item){
    if(!previewEl)return;
    const content=item?.content||'';
    if(item?.type==='code'){
      previewEl.innerHTML='<pre><code>'+escapeHtml(content||'// Empty artifact')+'</code></pre>';
      return;
    }
    if(item?.type==='plan'||item?.type==='workflow'){
      const lines=content.split(/\r?\n/).map(line=>line.trim()).filter(Boolean);
      previewEl.innerHTML='<ol>'+lines.map(line=>'<li>'+escapeHtml(line.replace(/^\d+\.\s*/,''))+'</li>').join('')+'</ol>';
      return;
    }
    const paragraphs=content.split(/\n{2,}/).map(part=>part.trim()).filter(Boolean);
    previewEl.innerHTML=paragraphs.length?paragraphs.map(part=>'<p>'+escapeHtml(part)+'</p>').join(''):'<p>Empty artifact</p>';
  }
  function render(){
    renderList();
    renderEditor();
  }
  function currentDraft(){
    const existing=activeArtifact();
    return normalizeArtifact({
      ...existing,
      title:titleEl?.value||'Untitled artifact',
      type:typeEl?.value||'document',
      source:existing?.source||'manual',
      content:contentEl?.value||'',
      updated_at:now()
    });
  }
  function newArtifact(){
    const prompt=document.getElementById('mimir-prompt');
    const starter=text(prompt?.value||'',4000);
    const item=normalizeArtifact({
      id:'artifact-'+Date.now(),
      title:starter?'Chat draft':'New artifact',
      type:'document',
      source:starter?'chat-composer':'manual',
      content:starter,
      created_at:now(),
      updated_at:now()
    });
    artifacts.unshift(item);
    activeId=item.id;
    saveArtifacts();
    render();
    setStatus('New artifact ready.','ready');
  }
  function saveCurrent(){
    const draft=currentDraft();
    const index=artifacts.findIndex(item=>item.id===draft.id);
    if(index>=0)artifacts[index]=draft;
    else artifacts.unshift(draft);
    activeId=draft.id;
    saveArtifacts();
    render();
    window.dispatchEvent(new CustomEvent('mmir-artifacts-updated',{detail:{workspace_id:workspaceId(),count:artifacts.length}}));
    setStatus('Artifact saved locally for this workspace.','ready');
  }
  function duplicateCurrent(){
    const item=currentDraft();
    const copy=normalizeArtifact({...item,id:'artifact-'+Date.now(),title:item.title+' copy',source:'duplicate',created_at:now(),updated_at:now()});
    artifacts.unshift(copy);
    activeId=copy.id;
    saveArtifacts();
    render();
    setStatus('Artifact duplicated.','ready');
  }
  async function copyCurrent(){
    const item=currentDraft();
    try{
      await navigator.clipboard.writeText(item.content||'');
      setStatus('Artifact copied.','ready');
    }catch(error){
      setStatus('Copy failed in this browser.','error');
    }
  }
  function exportArtifacts(){
    const bundle={object:'mmir.artifact_export',workspace_id:workspaceId(),exported_at:now(),artifacts};
    const blob=new Blob([JSON.stringify(bundle,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const link=document.createElement('a');
    link.href=url;
    link.download='mmir-artifacts-'+workspaceId()+'.json';
    link.click();
    URL.revokeObjectURL(url);
    setStatus('Artifact export prepared.','ready');
  }
  function deleteCurrent(){
    if(artifacts.length<=1){
      artifacts=[defaultArtifact()];
      activeId=artifacts[0].id;
    }else{
      artifacts=artifacts.filter(item=>item.id!==activeId);
      activeId=artifacts[0]?.id||'';
    }
    saveArtifacts();
    render();
    setStatus('Artifact removed locally.','ready');
  }
  function sendToChat(){
    const prompt=document.getElementById('mimir-prompt');
    const item=currentDraft();
    if(!prompt)return;
    prompt.value='Use this '+item.type+' artifact as context and improve it:\n\n'+item.content.slice(0,3000);
    prompt.dispatchEvent(new Event('input',{bubbles:true}));
    prompt.focus();
    setStatus('Artifact sent to chat composer.','ready');
  }
  function install(){
    if(document.getElementById('artifact-workspace'))return;
    const details=document.createElement('details');
    details.id='artifact-workspace';
    details.className='mimir-provider-drawer artifact-workspace';
    details.innerHTML=''+
      '<summary>+ Artifacts / Canvas</summary>'+
      '<section class="mimir-dashboard" aria-labelledby="artifact-workspace-title">'+
        '<div class="dashboard-heading"><div><p class="eyebrow">Canvas workspace</p><h2 id="artifact-workspace-title">Documents, code, plans and workflow drafts</h2></div></div>'+
        '<div class="artifact-shell">'+
          '<aside class="artifact-list" aria-label="Saved artifacts"><div id="artifact-list" class="artifact-list-inner"></div></aside>'+
          '<section class="artifact-editor" aria-label="Artifact editor">'+
            '<div class="workflow-builder-row">'+
              '<label for="artifact-title">Title<input id="artifact-title" type="text" maxlength="120" /></label>'+
              '<label for="artifact-type">Type<select id="artifact-type"><option value="document">Document</option><option value="code">Code</option><option value="plan">Plan</option><option value="workflow">Workflow</option></select></label>'+
            '</div>'+
            '<label for="artifact-content">Content<textarea id="artifact-content" rows="10" maxlength="24000"></textarea></label>'+
            '<div class="workflow-builder-actions">'+
              '<button id="artifact-new" type="button">New</button>'+
              '<button id="artifact-save" type="button">Save</button>'+
              '<button id="artifact-duplicate" type="button">Duplicate</button>'+
              '<button id="artifact-copy" type="button">Copy</button>'+
              '<button id="artifact-export" type="button">Export</button>'+
              '<button id="artifact-send-chat" type="button">Send to chat</button>'+
              '<button id="artifact-delete" type="button" class="danger">Delete</button>'+
            '</div>'+
            '<p id="artifact-status" class="dashboard-note" data-state="idle" aria-live="polite"></p>'+
          '</section>'+
          '<section class="artifact-preview" aria-label="Artifact preview"><div id="artifact-preview"></div></section>'+
        '</div>'+
      '</section>';
    const settings=document.getElementById('backend-settings');
    main.insertBefore(details,settings||null);
    listEl=document.getElementById('artifact-list');
    titleEl=document.getElementById('artifact-title');
    typeEl=document.getElementById('artifact-type');
    contentEl=document.getElementById('artifact-content');
    previewEl=document.getElementById('artifact-preview');
    statusEl=document.getElementById('artifact-status');
    document.getElementById('artifact-new')?.addEventListener('click',newArtifact);
    document.getElementById('artifact-save')?.addEventListener('click',saveCurrent);
    document.getElementById('artifact-duplicate')?.addEventListener('click',duplicateCurrent);
    document.getElementById('artifact-copy')?.addEventListener('click',copyCurrent);
    document.getElementById('artifact-export')?.addEventListener('click',exportArtifacts);
    document.getElementById('artifact-delete')?.addEventListener('click',deleteCurrent);
    document.getElementById('artifact-send-chat')?.addEventListener('click',sendToChat);
    titleEl?.addEventListener('input',()=>renderPreview(currentDraft()));
    typeEl?.addEventListener('change',()=>renderPreview(currentDraft()));
    contentEl?.addEventListener('input',()=>renderPreview(currentDraft()));
    loadArtifacts();
    render();
  }

  window.addEventListener('mmir-workspace-changed',()=>{
    loadArtifacts();
    render();
    setStatus('Artifact workspace switched.','ready');
  });
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
