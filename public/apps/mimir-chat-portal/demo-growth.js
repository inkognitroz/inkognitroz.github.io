(function(){
  const DEMO_KEY='mimir-demo-mode-v1';
  const ACTIVE_BACKEND_KEY='mimir-chat-active-backend';
  const promptEl=document.getElementById('mimir-prompt');
  const formEl=document.querySelector('.mimir-composer');
  const primaryLink=document.getElementById('primary-chat-link');
  const demoBtn=document.getElementById('try-demo-mode');
  const activeBadge=document.getElementById('active-badge');
  const activeTitle=document.getElementById('active-chat-title');
  const activeDesc=document.getElementById('active-chat-description');
  let demoActivatedThisPage=false;

  const demoModels=[
    {id:'mmir-demo-strategist',label:'MMIR Demo Strategist'},
    {id:'mmir-demo-architect',label:'MMIR Demo Architect'},
    {id:'mmir-demo-growth',label:'MMIR Demo Growth Lead'}
  ];

  function demoActive(){return localStorage.getItem(DEMO_KEY)==='true';}
  function hasActiveBackend(){return Boolean(localStorage.getItem(ACTIVE_BACKEND_KEY)||'');}
  function statusEl(){return document.getElementById('runtime-state');}
  function modelSelect(){return document.getElementById('runtime-model');}
  function transcript(){return document.getElementById('runtime-transcript');}
  function setStatus(text,state){const el=statusEl();if(el){el.textContent=text;el.dataset.state=state||'idle';}}
  function escapeText(value){return String(value||'');}

  function renderDemoModels(){
    const select=modelSelect();
    if(!select)return;
    select.innerHTML='';
    for(const model of demoModels){
      const option=document.createElement('option');
      option.value=model.id;
      option.textContent=model.label;
      select.appendChild(option);
    }
    select.disabled=false;
  }

  function renderMessage(role,content,meta){
    const root=transcript();
    if(!root)return;
    const bubble=document.createElement('article');
    bubble.className='runtime-message runtime-message-'+role;
    bubble.setAttribute('aria-label',(role==='user'?'User':'Assistant')+' demo message');
    const label=document.createElement('span');
    label.className='runtime-message-label';
    label.textContent=role==='user'?'You':'MMIR demo';
    const body=document.createElement('div');
    body.className='runtime-message-body';
    for(const block of escapeText(content).split(/\n{2,}/).filter(Boolean)){
      const p=document.createElement('p');
      p.textContent=block;
      body.appendChild(p);
    }
    bubble.append(label,body);
    if(meta){const small=document.createElement('small');small.textContent=meta;bubble.appendChild(small);}
    root.appendChild(bubble);
    bubble.scrollIntoView({block:'nearest'});
  }

  function demoReply(prompt){
    const text=String(prompt||'').toLowerCase();
    if(/price|pricing|money|revenue|paid|monetiz/.test(text)){
      return 'Demo answer: MMIR should monetize in three steps. Free proves the local-first workflow. Pro sells saved workspaces, memory, workflow automation and exports. Managed sells protected api.mmir.ai routing, hosted provider keys, team access and premium runtime capacity. The first revenue experiment should be beta access plus a clear managed-access request path.';
    }
    if(/install|local|ollama|node|model/.test(text)){
      return 'Demo answer: The fastest activation path is Local Node first. The user opens mmir.ai, starts MMIR Local Node on 127.0.0.1, pairs once, loads models, then sends the first prompt. The product must keep raw Ollama private and make every failure state explain the next action.';
    }
    if(/security|privacy|secret|safe|trust/.test(text)){
      return 'Demo answer: The trust promise is simple: no provider keys in the public frontend, no raw Ollama exposed to the internet, local-first by default, opt-in logging only, and managed providers behind protected backend services. That should be visible before users connect anything.';
    }
    if(/workflow|agent|team|memory|knowledge/.test(text)){
      return 'Demo answer: The sticky product layer is workflows plus memory. A user should save a workspace, add local knowledge, choose roles, compare model answers, and turn repeated work into reusable flows. That is where Pro and team plans become natural.';
    }
    return 'Demo answer: MMIR.ai is a local-first AI workspace. The product should let users try value immediately, then graduate to local models, trusted backends and managed routing. Next best action: ship demo mode, beta capture, and the first reliable local-node chat loop.';
  }

  function activateDemo(options={}){
    localStorage.setItem(DEMO_KEY,'true');
    demoActivatedThisPage=true;
    renderDemoModels();
    if(primaryLink){
      primaryLink.classList.remove('disabled');
      primaryLink.setAttribute('aria-disabled','false');
      primaryLink.textContent='Send';
      primaryLink.href='#mimir-chat-runtime';
      primaryLink.removeAttribute('target');
    }
    if(activeBadge)activeBadge.textContent='Demo mode';
    if(activeTitle)activeTitle.textContent='Demo mode active';
    if(activeDesc)activeDesc.textContent='Try MMIR with safe static responses, then connect a local node or request managed access.';
    setStatus('Demo mode ready. Ask about local AI, privacy, workflows or revenue.','ready');
    if(options.welcome!==false&&!document.querySelector('[data-demo-welcome="true"]')){
      const root=transcript();
      if(root){
        const marker=document.createElement('div');
        marker.dataset.demoWelcome='true';
        marker.hidden=true;
        root.appendChild(marker);
      }
      renderMessage('assistant','Demo mode is live. No backend, provider key or private data is used. Ask a question or choose Local Node / Managed Access when you are ready.','safe static demo');
    }
  }

  function sendDemoMessage(){
    if(!demoActive())return false;
    const prompt=String(promptEl?.value||'').trim();
    if(!prompt){setStatus('Write a message or ask how MMIR makes money.','error');return true;}
    const select=modelSelect();
    const model=select&&!select.disabled?select.value:'mmir-demo-strategist';
    renderMessage('user',prompt,'demo');
    if(promptEl)promptEl.value='';
    setStatus('Demo response generated locally in this page.','ready');
    renderMessage('assistant',demoReply(prompt),model);
    return true;
  }

  function intercept(event){
    if(!demoActive())return;
    event.preventDefault();
    event.stopImmediatePropagation();
    sendDemoMessage();
  }

  function onKeydown(event){
    if(event.key==='Enter'&&!event.shiftKey&&demoActive()){
      event.preventDefault();
      event.stopImmediatePropagation();
      sendDemoMessage();
    }
  }

  function init(){
    if(demoBtn){demoBtn.addEventListener('click',()=>activateDemo());}
    if(primaryLink){primaryLink.addEventListener('click',intercept,true);}
    if(formEl){formEl.addEventListener('submit',intercept,true);}
    if(promptEl){promptEl.addEventListener('keydown',onKeydown,true);}
    if(demoActive()&&!hasActiveBackend()){
      setTimeout(()=>activateDemo({welcome:false}),0);
    }
    window.addEventListener('storage',()=>{
      if(demoActive()&&!hasActiveBackend()&&!demoActivatedThisPage)activateDemo({welcome:false});
    });
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
