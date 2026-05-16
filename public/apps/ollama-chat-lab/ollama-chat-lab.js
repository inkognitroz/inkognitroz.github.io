(function(){
  const endpointEl=document.getElementById('endpoint');
  const modelEl=document.getElementById('model-select');
  const systemEl=document.getElementById('system-prompt');
  const messagesEl=document.getElementById('messages');
  const userEl=document.getElementById('user-message');
  const statusEl=document.getElementById('status');
  const history=[];

  function setStatus(text){statusEl.textContent=text||'';}
  function escapeHtml(value){return String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');}
  function render(){
    messagesEl.innerHTML=history.map(m=>`<article class="message"><strong>${escapeHtml(m.role)}</strong><p>${escapeHtml(m.content)}</p></article>`).join('');
    messagesEl.scrollTop=messagesEl.scrollHeight;
  }
  function endpoint(path){return endpointEl.value.replace(/\/$/,'')+path;}

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
    history.push({role:'user',content});
    render();
    userEl.value='';
    setStatus('Generating locally...');
    const messages=[{role:'system',content:systemEl.value.trim()},...history.map(m=>({role:m.role==='assistant'?'assistant':'user',content:m.content}))].filter(m=>m.content);
    try{
      const res=await fetch(endpoint('/api/chat'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model,stream:false,messages})});
      if(!res.ok)throw new Error('Ollama returned '+res.status);
      const data=await res.json();
      const answer=data.message&&data.message.content?data.message.content:'No response content.';
      history.push({role:'assistant',content:answer});
      render();
      setStatus('Done.');
    }catch(error){
      history.push({role:'assistant',content:'Error: '+error.message});
      render();
      setStatus('Generation failed. Check Ollama model, endpoint and CORS.');
    }
  }

  document.getElementById('load-models').addEventListener('click',loadModels);
  document.getElementById('send').addEventListener('click',send);
  document.getElementById('clear').addEventListener('click',()=>{history.length=0;render();setStatus('Cleared.');});
  userEl.addEventListener('keydown',e=>{if(e.ctrlKey&&e.key==='Enter')send();});
})();
