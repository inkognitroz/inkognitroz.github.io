(function(){
  const api=window.MimirApiClient;
  const ACTIVE_WORKSPACE_KEY='mimir-active-workspace-v1';
  const DEFAULT_WORKSPACE_ID='personal';
  const KNOWLEDGE_PREFIX='mimir-knowledge-v1:';
  const MAX_DOCUMENTS=10;
  const MAX_CHARS_PER_DOC=6000;
  const MAX_FILE_BYTES=1024*1024;
  const ACCEPTED_EXTENSIONS=['.txt','.md','.json','.csv','.log'];
  const host=document.querySelector('#multi-model-workspace .mimir-dashboard');
  let fileInput=null;
  let dropzoneEl=null;
  let previewEl=null;
  let listEl=null;
  let statusEl=null;
  let selectedFiles=[];

  if(!host)return;

  function workspaceId(){return localStorage.getItem(ACTIVE_WORKSPACE_KEY)||DEFAULT_WORKSPACE_ID;}
  function key(){return KNOWLEDGE_PREFIX+workspaceId();}
  function setStatus(message){if(statusEl)statusEl.textContent=message||'';}
  function formatSize(bytes){
    const value=Number(bytes)||0;
    if(value<1024)return value+' B';
    if(value<1024*1024)return Math.round(value/1024)+' KB';
    return (value/(1024*1024)).toFixed(1)+' MB';
  }
  function extension(name){
    const value=String(name||'').toLowerCase();
    const index=value.lastIndexOf('.');
    return index>=0?value.slice(index):'';
  }
  function isAcceptedFile(file){
    const type=String(file?.type||'').toLowerCase();
    const ext=extension(file?.name);
    return type.startsWith('text/')||type==='application/json'||ACCEPTED_EXTENSIONS.includes(ext);
  }
  function fileIssue(file){
    if(!isAcceptedFile(file))return 'Unsupported type';
    if(Number(file?.size||0)>MAX_FILE_BYTES)return 'Too large';
    return '';
  }
  function usableFiles(){
    return selectedFiles.filter(file=>!fileIssue(file)).slice(0,MAX_DOCUMENTS);
  }
  function activeConnection(){
    if(!api)return null;
    const profile=api.activeProfile();
    const url=api.cleanUrl(profile?.url);
    if(!profile||!url)return null;
    return {profile,url};
  }

  function readKnowledge(){
    try{
      const value=JSON.parse(localStorage.getItem(key())||'[]');
      return Array.isArray(value)?value.filter(item=>item&&item.id&&item.name&&item.text).slice(-MAX_DOCUMENTS):[];
    }catch(error){return [];}
  }

  function saveKnowledge(items){
    localStorage.setItem(key(),JSON.stringify(items.slice(-MAX_DOCUMENTS)));
    window.dispatchEvent(new CustomEvent('mmir-knowledge-updated',{detail:{workspaceId:workspaceId()}}));
  }

  function render(){
    if(!listEl)return;
    const items=readKnowledge();
    listEl.innerHTML='';
    if(!items.length){
      listEl.innerHTML='<p class="empty-backends">No local knowledge in this workspace.</p>';
      return;
    }
    for(const item of items.slice().reverse()){
      const article=document.createElement('article');
      article.className='knowledge-item';
      const body=document.createElement('div');
      const title=document.createElement('strong');
      title.textContent=item.name;
      const meta=document.createElement('small');
      const sync=item.sync==='backend'?'backend indexed':(item.sync==='local-only'?'local only':'stored locally');
      const chunks=item.chunkCount?(' - '+String(item.chunkCount)+' chunk(s)'):'';
      meta.textContent=String(Math.round((item.size||item.text.length)/1024))+' KB - '+sync+chunks;
      body.append(title,meta);
      if(item.preview){
        const preview=document.createElement('p');
        preview.className='knowledge-preview';
        preview.textContent=item.preview;
        body.appendChild(preview);
      }
      const button=document.createElement('button');
      button.type='button';
      button.textContent='Remove';
      button.addEventListener('click',()=>{
        saveKnowledge(readKnowledge().filter(entry=>entry.id!==item.id));
        render();
        setStatus('Knowledge removed.');
      });
      article.append(body,button);
      listEl.appendChild(article);
    }
  }

  async function syncToBackend(item){
    const connection=activeConnection();
    if(!connection)return null;
    const token=await api.pairIfNeeded(connection.profile,connection.url);
    const response=await api.fetchJson(api.joinUrl(connection.url,'/knowledge/documents'),{
      method:'POST',
      headers:api.authHeaders(token),
      timeoutMs:12000,
      body:JSON.stringify({
        workspace_id:workspaceId(),
        name:item.name,
        type:item.type||'text/plain',
        source_type:'upload',
        text:item.text,
        metadata:{
          local_id:item.id,
          size:String(item.size||item.text.length)
        }
      })
    });
    return response?.data||null;
  }

  async function addFiles(){
    const files=usableFiles();
    if(!files.length){setStatus('Choose one or more files first.');return;}
    const current=readKnowledge();
    let synced=0;
    let localOnly=0;
    for(const file of files){
      const text=String(await file.text()).slice(0,MAX_CHARS_PER_DOC);
      if(!text.trim())continue;
      const item={
        id:String(Date.now())+'-'+Math.random().toString(16).slice(2),
        name:file.name,
        type:file.type||'text/plain',
        size:file.size,
        text,
        preview:text.replace(/\s+/g,' ').trim().slice(0,240),
        sync:'local',
        createdAt:new Date().toISOString()
      };
      try{
        const backendDocument=await syncToBackend(item);
        if(backendDocument){
          item.backendId=backendDocument.id;
          item.chunkCount=backendDocument.chunk_count||0;
          item.sync='backend';
          item.syncedAt=new Date().toISOString();
          synced+=1;
        }else{
          localOnly+=1;
        }
      }catch(error){
        item.sync='local-only';
        item.syncError=api?.friendlyError?api.friendlyError(error):'Backend sync unavailable.';
        localOnly+=1;
      }
      current.push(item);
    }
    saveKnowledge(current);
    fileInput.value='';
    selectedFiles=[];
    renderPreviews();
    render();
    if(synced)setStatus('Knowledge saved locally and indexed in the active backend.');
    else if(localOnly)setStatus('Knowledge saved locally. Backend indexing is unavailable for this profile.');
    else setStatus('No readable text found in the selected files.');
  }

  function setSelectedFiles(files){
    selectedFiles=Array.from(files||[]).slice(0,MAX_DOCUMENTS);
    renderPreviews();
  }

  function renderPreviews(){
    if(!previewEl)return;
    previewEl.innerHTML='';
    if(!selectedFiles.length){
      previewEl.innerHTML='<p class="empty-backends">No files staged.</p>';
      return;
    }
    selectedFiles.forEach(file=>{
      const issue=fileIssue(file);
      const article=document.createElement('article');
      article.className='knowledge-file-preview '+(issue?'is-blocked':'is-ready');
      const body=document.createElement('div');
      const title=document.createElement('strong');
      title.textContent=file.name||'file';
      const meta=document.createElement('small');
      meta.textContent=formatSize(file.size)+' - '+(file.type||extension(file.name)||'unknown')+' - '+(issue||'ready');
      body.append(title,meta);
      article.appendChild(body);
      previewEl.appendChild(article);
    });
  }

  function handleDrag(event){
    event.preventDefault();
    event.stopPropagation();
    if(dropzoneEl)dropzoneEl.classList.toggle('is-dragging',event.type==='dragover');
  }

  function handleDrop(event){
    handleDrag(event);
    setSelectedFiles(event.dataTransfer?.files||[]);
    const blocked=selectedFiles.filter(file=>fileIssue(file)).length;
    setStatus(blocked?blocked+' file(s) need a supported text type under 1 MB.':'Files staged for local knowledge.');
  }

  function install(){
    if(document.getElementById('knowledge-panel'))return;
    const details=document.createElement('details');
    details.id='knowledge-panel';
    details.className='model-catalog-hint knowledge-panel';
    details.innerHTML=''+
      '<summary>+ Knowledge</summary>'+
      '<div class="knowledge-body">'+
        '<div id="knowledge-dropzone" class="knowledge-dropzone" tabindex="0" role="button" aria-label="Drop text files for local knowledge">'+
          '<strong>Drop files here</strong><span>Text, Markdown, JSON, CSV and logs under 1 MB. Stored locally first.</span>'+
        '</div>'+
        '<label for="knowledge-files">Files<input id="knowledge-files" type="file" multiple accept=".txt,.md,.json,.csv,.log,text/*,application/json" /></label>'+
        '<div id="knowledge-preview-list" class="knowledge-preview-list" aria-live="polite"></div>'+
        '<button id="knowledge-save" type="button">Add knowledge</button>'+
        '<p id="knowledge-status" class="dashboard-note" aria-live="polite"></p>'+
        '<div id="knowledge-list" class="knowledge-list" aria-live="polite"></div>'+
      '</div>';
    host.appendChild(details);
    fileInput=document.getElementById('knowledge-files');
    dropzoneEl=document.getElementById('knowledge-dropzone');
    previewEl=document.getElementById('knowledge-preview-list');
    listEl=document.getElementById('knowledge-list');
    statusEl=document.getElementById('knowledge-status');
    fileInput?.addEventListener('change',()=>setSelectedFiles(fileInput.files||[]));
    ['dragenter','dragover'].forEach(type=>dropzoneEl?.addEventListener(type,handleDrag));
    ['dragleave','drop'].forEach(type=>dropzoneEl?.addEventListener(type,type==='drop'?handleDrop:handleDrag));
    dropzoneEl?.addEventListener('keydown',(event)=>{
      if(event.key==='Enter'||event.key===' '){
        event.preventDefault();
        fileInput?.click();
      }
    });
    dropzoneEl?.addEventListener('click',()=>fileInput?.click());
    document.getElementById('knowledge-save')?.addEventListener('click',addFiles);
    renderPreviews();
    render();
  }

  window.addEventListener('mmir-workspace-changed',()=>{render();setStatus('');});
  window.addEventListener('storage',render);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
