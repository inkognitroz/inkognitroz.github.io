(function(){
  const WORKSPACE_KEY='mimir-active-workspace-v1';
  const DEFAULT_WORKSPACE_ID='personal';
  const CHAT_KEY='mimir-chat-current-session-v1';
  const MEMORY_PREFIX='mimir-memory-v1:';
  const KNOWLEDGE_PREFIX='mimir-knowledge-v1:';
  const LIVE_MODELS_KEY='mimir-chat-live-models';
  const PROFILE_KEY='mimir-chat-backend-profiles';
  const ACTIVE_BACKEND_KEY='mimir-chat-active-backend';
  const chatCenter=document.querySelector('.mimir-chat-center');
  const promptEl=document.getElementById('mimir-prompt');
  const primaryLink=document.getElementById('primary-chat-link');
  let root=null;

  if(!chatCenter)return;

  function workspaceId(){return localStorage.getItem(WORKSPACE_KEY)||DEFAULT_WORKSPACE_ID;}

  function readJson(key,fallback){
    try{
      const value=JSON.parse(localStorage.getItem(key)||'null');
      return value ?? fallback;
    }catch(error){
      return fallback;
    }
  }

  function chatMessages(){
    const scoped=readJson(CHAT_KEY+':'+workspaceId(),null);
    const legacy=workspaceId()===DEFAULT_WORKSPACE_ID?readJson(CHAT_KEY,[]):[];
    return Array.isArray(scoped)?scoped:(Array.isArray(legacy)?legacy:[]);
  }

  function memoryItems(){
    const items=readJson(MEMORY_PREFIX+workspaceId(),[]);
    return Array.isArray(items)?items:[];
  }

  function knowledgeItems(){
    const items=readJson(KNOWLEDGE_PREFIX+workspaceId(),[]);
    return Array.isArray(items)?items:[];
  }

  function liveModels(){
    const items=readJson(LIVE_MODELS_KEY,[]);
    return Array.isArray(items)?items.filter(model=>model?.id):[];
  }

  function activeProfile(){
    const profiles=readJson(PROFILE_KEY,[]);
    const id=localStorage.getItem(ACTIVE_BACKEND_KEY)||'';
    return Array.isArray(profiles)?profiles.find(profile=>profile?.id===id)||null:null;
  }

  function selectedRuntimeModel(){
    const select=document.getElementById('runtime-model');
    const option=select?.selectedOptions?.[0];
    return {value:select?.value||'',label:String(option?.textContent||'').trim()};
  }

  function hasLiveModel(){
    const selected=selectedRuntimeModel();
    const profile=activeProfile();
    return Boolean(
      selected.value&&!selected.value.startsWith('starter:') ||
      ['ready','degraded','testing'].includes(String(profile?.health||'').toLowerCase()) ||
      liveModels().length
    );
  }

  function loopOptions(){
    const chats=chatMessages();
    const memories=memoryItems();
    const docs=knowledgeItems();
    const models=liveModels();
    return [
      {
        id:'free-chat',
        label:'Useful chat',
        state:chats.some(message=>message?.role==='assistant'&&String(message.content||'').trim()&&message.content!=='Thinking...'),
        value:chats.length?String(chats.length)+' messages':'Ready now',
        target:'#mimir-prompt',
        action:'Start chat',
        prompt:'Give me one useful MMIR answer right now. Keep it free, concrete and tailored to getting value before configuration.'
      },
      {
        id:'local-model',
        label:'Local model',
        state:hasLiveModel(),
        value:hasLiveModel()?'Detected':'One-file path',
        target:'#local-connector',
        action:'Connect',
        prompt:'Help me connect a free local model in MMIR. Pick the simplest route for this machine and explain only the next concrete steps.'
      },
      {
        id:'compare-models',
        label:'Compare models',
        state:models.length>=2,
        value:models.length>=2?String(models.length)+' live':'Guided',
        target:'#multi-model-workspace',
        action:'Compare',
        prompt:'Set up a free model comparison in MMIR. If live models exist, compare them. If not, show the fastest local/free way to get two comparable models.'
      },
      {
        id:'memory-loop',
        label:'Memory',
        state:memories.length>0,
        value:memories.length?String(memories.length)+' saved':'Local only',
        target:'#memory-panel',
        action:'Add memory',
        prompt:'Help me add useful MMIR memory for this workspace. Suggest three privacy-safe memories that make future chats better.'
      },
      {
        id:'knowledge-loop',
        label:'Documents',
        state:docs.length>0,
        value:docs.length?String(docs.length)+' files':'Upload text',
        target:'#knowledge-panel',
        action:'Add docs',
        prompt:'Help me use documents in MMIR for free. Explain what file to upload, how it stays local first, and how to ask questions over it.'
      }
    ];
  }

  function openTarget(selector){
    const el=document.querySelector(selector);
    document.getElementById('multi-model-workspace')?.setAttribute('open','');
    if(selector==='#local-connector')document.getElementById('local-connector')?.setAttribute('open','');
    if(selector==='#multi-model-workspace')document.getElementById('multi-model-workspace')?.setAttribute('open','');
    if(el&&el.tagName==='DETAILS')el.setAttribute('open','');
    if(el)el.scrollIntoView({block:'start',behavior:'smooth'});
  }

  function sendPrompt(value){
    if(!promptEl)return;
    promptEl.value=String(value||'').trim();
    promptEl.dispatchEvent(new Event('input',{bubbles:true}));
    promptEl.focus();
    window.setTimeout(()=>primaryLink?.click(),80);
  }

  function startLoop(loop){
    openTarget(loop.target);
    sendPrompt(loop.prompt);
    window.dispatchEvent(new CustomEvent('mmir-free-value-loop-started',{detail:{id:loop.id,label:loop.label,target:loop.target}}));
  }

  function render(){
    if(!root)return;
    root.innerHTML='';
    loopOptions().forEach(loop=>{
      const article=document.createElement('article');
      article.className='free-value-loop-card '+(loop.state?'is-done':'is-open');
      article.dataset.loopId=loop.id;
      const state=document.createElement('span');
      state.textContent=loop.state?'Ready':'Start';
      const title=document.createElement('strong');
      title.textContent=loop.label;
      const value=document.createElement('small');
      value.textContent=loop.value;
      const button=document.createElement('button');
      button.type='button';
      button.textContent=loop.action;
      button.addEventListener('click',()=>startLoop(loop));
      article.append(state,title,value,button);
      root.appendChild(article);
    });
  }

  function install(){
    if(document.getElementById('free-value-loops'))return;
    const section=document.createElement('section');
    section.id='free-value-loops';
    section.className='free-value-loops';
    section.setAttribute('aria-label','Free MMIR value loops');
    section.innerHTML='<div class="free-value-loop-head"><div><p class="eyebrow">No spend</p><h2>Five useful loops for free</h2></div><small>Chat, local model, compare, memory and documents stay usable before accounts or paid providers.</small></div><div id="free-value-loop-grid" class="free-value-loop-grid" aria-live="polite"></div>';
    const templates=document.getElementById('use-case-templates');
    if(templates&&templates.nextSibling)chatCenter.insertBefore(section,templates.nextSibling);
    else chatCenter.appendChild(section);
    root=document.getElementById('free-value-loop-grid');
    render();
  }

  window.addEventListener('mmir-chat-history-updated',render);
  window.addEventListener('mmir-memory-updated',render);
  window.addEventListener('mmir-knowledge-updated',render);
  window.addEventListener('mmir-backend-profiles-updated',render);
  window.addEventListener('mmir-active-model-changed',render);
  window.addEventListener('storage',render);
  window.addEventListener('focus',render);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
  window.MimirFreeValueLoops={loopOptions};
})();
