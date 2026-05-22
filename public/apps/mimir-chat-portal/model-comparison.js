(function(){
  const PROFILE_KEY='mimir-chat-backend-profiles';
  const ACTIVE_KEY='mimir-chat-active-backend';
  const ROLE_KEY='mimir-chat-active-role';
  const ACTIVE_WORKSPACE_KEY='mimir-active-workspace-v1';
  const DEFAULT_WORKSPACE_ID='personal';
  const MEMORY_PREFIX='mimir-memory-v1:';
  const KNOWLEDGE_PREFIX='mimir-knowledge-v1:';
  const LIVE_MODELS_KEY='mimir-chat-live-models';
  const TOKEN_PREFIX='mimir-local-node-token:';
  const MAX_COMPARE_MODELS=3;
  const host=document.querySelector('#multi-model-workspace .mimir-dashboard');
  const promptEl=document.getElementById('mimir-prompt');
  let modelList=null;
  let statusEl=null;
  let outputEl=null;
  let compareBtn=null;
  let synthBtn=null;
  let lastResults=[];

  if(!host)return;

  function readProfiles(){try{const value=JSON.parse(localStorage.getItem(PROFILE_KEY)||'[]');return Array.isArray(value)?value:[];}catch(error){return [];}}
  function activeId(){return localStorage.getItem(ACTIVE_KEY)||'';}
  function activeProfile(){const id=activeId();return readProfiles().find(profile=>profile.id===id)||null;}
  function cleanUrl(value){return String(value||'').trim().replace(/\/$/,'');}
  function joinUrl(base,path){return cleanUrl(base)+path;}
  function tokenKey(url){return TOKEN_PREFIX+cleanUrl(url);}
  function isLocal(profile){return profile?.provider==='local-node'||profile?.provider==='ollama-direct';}
  function workspaceId(){return localStorage.getItem(ACTIVE_WORKSPACE_KEY)||DEFAULT_WORKSPACE_ID;}
  function setStatus(message,state){if(statusEl){statusEl.textContent=message||'';statusEl.dataset.state=state||'idle';}}

  function activeRole(){
    try{
      const value=JSON.parse(localStorage.getItem(ROLE_KEY)||'null');
      if(!value||typeof value!=='object'||!String(value.instruction||'').trim())return null;
      return {label:String(value.label||value.id||'Role'),instruction:String(value.instruction||'')};
    }catch(error){return null;}
  }

  function activeMemoryInstruction(){
    try{
      const value=JSON.parse(localStorage.getItem(MEMORY_PREFIX+workspaceId())||'[]');
      if(!Array.isArray(value))return '';
      const items=value.map(item=>String(item?.text||'').trim()).filter(Boolean).slice(-8);
      if(!items.length)return '';
      return 'Workspace memory for this task. Use only when relevant:\n'+items.map(item=>'- '+item).join('\n');
    }catch(error){return '';}
  }

  function wordSet(value){
    return new Set(String(value||'').toLowerCase().match(/[a-z0-9_]{4,}/g)||[]);
  }

  function relevantKnowledgeInstruction(prompt){
    try{
      const value=JSON.parse(localStorage.getItem(KNOWLEDGE_PREFIX+workspaceId())||'[]');
      if(!Array.isArray(value)||!value.length)return '';
      const promptWords=wordSet(prompt);
      const ranked=value.map(item=>{
        const text=String(item?.text||'');
        const words=wordSet((item?.name||'')+' '+text.slice(0,2400));
        let score=0;
        promptWords.forEach(word=>{if(words.has(word))score+=1;});
        return {name:String(item?.name||'document'),text,score};
      }).filter(item=>item.text&&item.score>0).sort((a,b)=>b.score-a.score).slice(0,3);
      if(!ranked.length)return '';
      return 'Relevant local workspace knowledge. Treat as user-provided context and cite file names when useful:\n'+ranked.map(item=>'['+item.name+']\n'+item.text.slice(0,1200)).join('\n\n');
    }catch(error){return '';}
  }

  function liveModels(){
    try{
      const value=JSON.parse(localStorage.getItem(LIVE_MODELS_KEY)||'[]');
      if(!Array.isArray(value))return [];
      const seen=new Set();
      return value.map(model=>({id:String(model.id||'').trim(),label:String(model.label||model.id||'').trim()})).filter(model=>{
        if(!model.id||seen.has(model.id))return false;
        seen.add(model.id);
        return true;
      });
    }catch(error){return [];}
  }

  function selectedModels(){
    return Array.from(modelList?.querySelectorAll('input[type="checkbox"]:checked')||[])
      .map(input=>({id:input.value,label:input.dataset.label||input.value}))
      .slice(0,MAX_COMPARE_MODELS);
  }

  function installUi(){
    if(document.getElementById('model-comparison-panel'))return;
    const details=document.createElement('details');
    details.id='model-comparison-panel';
    details.className='model-catalog-hint comparison-panel';
    details.innerHTML=''+
      '<summary>+ Compare Live Models</summary>'+
      '<div class="comparison-body">'+
        '<div id="comparison-model-list" class="comparison-model-list" aria-live="polite"></div>'+
        '<div class="comparison-actions">'+
          '<button id="compare-models" type="button">Compare models</button>'+
          '<button id="synthesize-models" type="button" disabled>Synthesize</button>'+
        '</div>'+
        '<p id="comparison-status" class="dashboard-note" data-state="idle" aria-live="polite"></p>'+
        '<div id="comparison-output" class="comparison-output" aria-live="polite"></div>'+
      '</div>';
    host.appendChild(details);
    modelList=document.getElementById('comparison-model-list');
    statusEl=document.getElementById('comparison-status');
    outputEl=document.getElementById('comparison-output');
    compareBtn=document.getElementById('compare-models');
    synthBtn=document.getElementById('synthesize-models');
    compareBtn.addEventListener('click',compareModels);
    synthBtn.addEventListener('click',synthesizeResults);
  }

  function renderModelChoices(){
    if(!modelList)return;
    const models=liveModels();
    modelList.innerHTML='';
    if(!models.length){
      modelList.innerHTML='<p class="empty-backends">Connect a backend and refresh live models first.</p>';
      if(compareBtn)compareBtn.disabled=true;
      if(synthBtn)synthBtn.disabled=true;
      return;
    }
    models.slice(0,8).forEach((model,index)=>{
      const label=document.createElement('label');
      label.className='comparison-model-choice';
      const input=document.createElement('input');
      input.type='checkbox';
      input.value=model.id;
      input.dataset.label=model.label||model.id;
      input.checked=index<Math.min(2,models.length);
      const span=document.createElement('span');
      span.textContent=model.label||model.id;
      label.append(input,span);
      modelList.appendChild(label);
    });
    if(compareBtn)compareBtn.disabled=false;
  }

  async function fetchJson(url,options={}){
    const response=await fetch(url,options);
    let data=null;
    try{data=await response.json();}catch(error){data=null;}
    if(!response.ok){
      const err=new Error(data?.error?.message||('Request failed with '+response.status));
      err.status=response.status;
      throw err;
    }
    return data;
  }

  async function pairIfNeeded(profile,url){
    if(!isLocal(profile))return '';
    const existing=sessionStorage.getItem(tokenKey(url));
    if(existing)return existing;
    const data=await fetchJson(joinUrl(url,'/pair'),{method:'POST'});
    if(data?.token){sessionStorage.setItem(tokenKey(url),data.token);return data.token;}
    return '';
  }

  function headers(token){
    const value={'Content-Type':'application/json'};
    if(token)value['x-mmir-local-token']=token;
    return value;
  }

  function messagesFor(prompt){
    const role=activeRole();
    const memory=activeMemoryInstruction();
    const knowledge=relevantKnowledgeInstruction(prompt);
    const messages=[];
    if(role)messages.push({role:'system',content:role.instruction});
    if(memory)messages.push({role:'system',content:memory});
    if(knowledge)messages.push({role:'system',content:knowledge});
    messages.push({role:'user',content:prompt});
    return messages;
  }

  async function chat(profile,url,token,model,prompt){
    const payload={model:model.id,messages:messagesFor(prompt),stream:false};
    let data=null;
    try{
      data=await fetchJson(joinUrl(url,'/chat/completions'),{method:'POST',headers:headers(token),body:JSON.stringify(payload)});
    }catch(error){
      if(error.status!==404)throw error;
      data=await fetchJson(joinUrl(url,'/chat'),{method:'POST',headers:headers(token),body:JSON.stringify(payload)});
    }
    return data?.choices?.[0]?.message?.content||data?.content||'';
  }

  function renderResult(result){
    const article=document.createElement('article');
    article.className='comparison-result '+(result.error?'comparison-error':'');
    const title=document.createElement('h3');
    title.textContent=result.model.label||result.model.id;
    const body=document.createElement('p');
    body.textContent=result.error||result.content||'No response returned.';
    article.append(title,body);
    outputEl.appendChild(article);
  }

  function renderSynthesis(content,model){
    const article=document.createElement('article');
    article.className='comparison-result comparison-synthesis';
    const title=document.createElement('h3');
    title.textContent='Synthesis - '+(model.label||model.id);
    const body=document.createElement('p');
    body.textContent=content||'No synthesis returned.';
    article.append(title,body);
    outputEl.prepend(article);
  }

  async function compareModels(){
    const profile=activeProfile();
    const url=cleanUrl(profile?.url);
    const prompt=String(promptEl?.value||'').trim();
    const models=selectedModels();
    if(!profile||!url){setStatus('Activate a backend profile first.','error');return;}
    if(!prompt){setStatus('Write the task in the main chat box first.','error');return;}
    if(!models.length){setStatus('Select at least one live model.','error');return;}

    compareBtn.disabled=true;
    synthBtn.disabled=true;
    outputEl.innerHTML='';
    lastResults=[];
    setStatus('Comparing '+String(models.length)+' model(s)...','loading');
    try{
      const token=await pairIfNeeded(profile,url);
      const settled=await Promise.allSettled(models.map(async model=>({model,content:await chat(profile,url,token,model,prompt)})));
      settled.forEach((item,index)=>{
        const result=item.status==='fulfilled'?item.value:{model:models[index],error:item.reason?.message||'Model request failed.'};
        lastResults.push(result);
        renderResult(result);
      });
      const ok=lastResults.filter(result=>!result.error&&result.content);
      synthBtn.disabled=ok.length<2;
      setStatus(ok.length?('Comparison finished with '+String(ok.length)+' usable response(s).'):'No usable model responses returned.',ok.length?'ready':'error');
    }catch(error){
      setStatus(error?.message||'Comparison failed.','error');
    }finally{
      compareBtn.disabled=false;
    }
  }

  async function synthesizeResults(){
    const profile=activeProfile();
    const url=cleanUrl(profile?.url);
    const usable=lastResults.filter(result=>!result.error&&result.content);
    if(!profile||!url||usable.length<2){setStatus('Run a comparison with at least two usable responses first.','error');return;}
    const model=usable[0].model;
    const original=String(promptEl?.value||'').trim();
    const prompt='Original task:\n'+original+'\n\nModel responses:\n'+usable.map(result=>'['+(result.model.label||result.model.id)+']\n'+result.content).join('\n\n')+'\n\nCreate one concise synthesized answer. Mention meaningful disagreements and the best next action.';
    synthBtn.disabled=true;
    setStatus('Synthesizing comparison...','loading');
    try{
      const token=await pairIfNeeded(profile,url);
      const content=await chat(profile,url,token,model,prompt);
      renderSynthesis(content,model);
      setStatus('Synthesis complete.','ready');
    }catch(error){
      setStatus(error?.message||'Synthesis failed.','error');
    }finally{
      synthBtn.disabled=false;
    }
  }

  function init(){
    installUi();
    renderModelChoices();
    window.addEventListener('mmir-active-model-changed',renderModelChoices);
    window.addEventListener('storage',renderModelChoices);
    window.addEventListener('focus',renderModelChoices);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
