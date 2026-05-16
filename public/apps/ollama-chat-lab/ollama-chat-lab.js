(function(){
  const endpointEl=document.getElementById('endpoint');
  const modelEl=document.getElementById('model-select');
  const systemEl=document.getElementById('system-prompt');
  const titleEl=document.getElementById('session-title');
  const messagesEl=document.getElementById('messages');
  const userEl=document.getElementById('user-message');
  const statusEl=document.getElementById('status');
  const importFile=document.getElementById('import-session-file');
  const history=[];
  let sessionId=crypto.randomUUID?crypto.randomUUID():String(Date.now());
  let createdAt=new Date().toISOString();

  function setStatus(text){statusEl.textContent=text||'';}
  function escapeHtml(value){return String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');}
  function render(){
    messagesEl.innerHTML=history.map(m=>`<article class="message"><strong>${escapeHtml(m.role)}</strong><p>${escapeHtml(m.content)}</p></article>`).join('');
    messagesEl.scrollTop=messagesEl.scrollHeight;
  }
  function endpoint(path){return endpointEl.value.replace(/\/$/,'')+path;}
  function downloadFile(content,filename){const blob=new Blob([content],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;a.click();URL.revokeObjectURL(url);}
  function slug(value){return String(value||'chat-session').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,60)||'chat-session';}

  function buildSession(){
    const now=new Date().toISOString();
    return {
      version:1,
      id:sessionId,
      title:titleEl.value.trim()||'Ollama Chat Session',
      provider:'ollama-local',
      endpoint:endpointEl.value.trim(),
      model:modelEl.value||'',
      created_at:createdAt,
      updated_at:now,
      system:systemEl.value.trim(),
      messages:history.map(m=>({role:m.role,content:m.content,created_at:m.created_at||now})),
      metadata:{source:'ollama-chat-lab',tags:['local-ai','ollama']}
    };
  }

  function applySession(session){
    if(!session||typeof session!=='object'||!Array.isArray(session.messages))throw new Error('Invalid session file.');
    sessionId=String(session.id||Date.now());
    createdAt=String(session.created_at||new Date().toISOString());
    titleEl.value=String(session.title||'Imported Ollama Chat Session');
    if(session.endpoint)endpointEl.value=String(session.endpoint);
    if(session.system)systemEl.value=String(session.system);
    if(session.model){modelEl.innerHTML=`<option value="${escapeHtml(session.model)}">${escapeHtml(session.model)}</option>`;}
    history.length=0;
    session.messages.forEach(m=>{
      if(m&&typeof m==='object'&&typeof m.content==='string')history.push({role:m.role==='assistant'?'assistant':'user',content:m.content,created_at:m.created_at||new Date().toISOString()});
    });
    render();
  }

  async function loadModels(){
    setStatus('Loading models from Ollama...');
    try{
      const res=await fetch(endpoint('/api/tags'));
      if(!res.ok)throw new Error('Ollama returned '+res.status);
      const data=await res.json();
      const models=Array.isArray(data.models)?data.models:[];
      modelEl.innerHTML=models.length?models.map(m=>`<option value="${escapeHtml(m.name)}">${escapeHtml(m.name)}</option>`).join(''):'<option value="">No models found</option>';
      setStatus(models.length?`Loaded ${models.length} model(s).`:'No models found. Run: ollama pull llama3.1');
    }catch(error){
      setStatus('Could not reach Ollama. Start Ollama locally and allow browser access/CORS if needed. '+error.message);
    }
  }

  async function send(){
    const model=modelEl.value;
    const content=userEl.value.trim();
    if(!model){setStatus('Choose a model first.');return;}
    if(!content){setStatus('Write a message first.');return;}
    history.push({role:'user',content,created_at:new Date().toISOString()});
    render();
    userEl.value='';
    setStatus('Generating locally...');
    const messages=[{role:'system',content:systemEl.value.trim()},...history.map(m=>({role:m.role==='assistant'?'assistant':'user',content:m.content}))].filter(m=>m.content);
    try{
      const res=await fetch(endpoint('/api/chat'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model,stream:false,messages})});
      if(!res.ok)throw new Error('Ollama returned '+res.status);
      const data=await res.json();
      const answer=data.message&&data.message.content?data.message.content:'No response content.';
      history.push({role:'assistant',content:answer,created_at:new Date().toISOString()});
      render();
      setStatus('Done.');
    }catch(error){
      history.push({role:'assistant',content:'Error: '+error.message,created_at:new Date().toISOString()});
      render();
      setStatus('Generation failed. Check Ollama model, endpoint and CORS.');
    }
  }

  document.getElementById('load-models').addEventListener('click',loadModels);
  document.getElementById('send').addEventListener('click',send);
  document.getElementById('clear').addEventListener('click',()=>{history.length=0;render();setStatus('Cleared.');});
  document.getElementById('export-session').addEventListener('click',()=>{const s=buildSession();downloadFile(JSON.stringify(s,null,2),`${slug(s.title)}.json`);setStatus('Session exported.');});
  document.getElementById('import-session').addEventListener('click',()=>importFile.click());
  importFile.addEventListener('change',async()=>{const file=importFile.files&&importFile.files[0];if(!file)return;try{applySession(JSON.parse(await file.text()));setStatus('Session imported.');}catch(error){setStatus('Import failed: '+error.message);}finally{importFile.value='';}});
  userEl.addEventListener('keydown',e=>{if(e.ctrlKey&&e.key==='Enter')send();});
})();
