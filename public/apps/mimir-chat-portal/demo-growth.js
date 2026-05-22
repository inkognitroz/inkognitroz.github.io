(function(){
  const DEMO_KEY='mimir-demo-mode-v1';
  const WELCOME_KEY='mimir-demo-welcome-shown-v1';
  const EVENT_KEY='mimir-growth-events-v1';
  const SESSION_KEY='mimir-growth-session-v1';
  const promptEl=document.getElementById('mimir-prompt');
  const formEl=document.querySelector('.mimir-composer');
  const demoButton=document.getElementById('try-demo-mode');
  const primaryLink=document.getElementById('primary-chat-link');

  function active(){
    try{return localStorage.getItem(DEMO_KEY)==='true';}
    catch(error){return false;}
  }

  function writeActive(value){
    try{localStorage.setItem(DEMO_KEY,value?'true':'false');}
    catch(error){}
  }

  function safeId(){
    try{
      if(window.crypto?.randomUUID)return window.crypto.randomUUID();
    }catch(error){}
    return 'growth-'+Date.now().toString(36)+'-'+Math.random().toString(16).slice(2);
  }

  function sessionId(){
    try{
      const current=sessionStorage.getItem(SESSION_KEY);
      if(current)return current;
      const next=safeId();
      sessionStorage.setItem(SESSION_KEY,next);
      return next;
    }catch(error){return safeId();}
  }

  function configuredEndpoint(){
    const meta=document.querySelector('meta[name="mimir-growth-endpoint"]');
    const value=String(window.MIMIR_GROWTH_ENDPOINT||meta?.content||document.body?.dataset?.growthEndpoint||'').trim();
    return /^(https?:\/\/|\/)/.test(value)?value:'';
  }

  function referrerHost(){
    try{return document.referrer?new URL(document.referrer).host:'';}
    catch(error){return '';}
  }

  function readEvents(){
    try{
      const value=JSON.parse(localStorage.getItem(EVENT_KEY)||'[]');
      return Array.isArray(value)?value:[];
    }catch(error){return [];}
  }

  function writeEvent(payload){
    try{
      const events=readEvents().concat([payload]).slice(-100);
      localStorage.setItem(EVENT_KEY,JSON.stringify(events));
    }catch(error){}
  }

  function cleanValue(value){
    if(typeof value==='number'||typeof value==='boolean')return value;
    return String(value||'').slice(0,140);
  }

  function cleanDetail(detail){
    const output={};
    Object.entries(detail||{}).forEach(([key,value])=>{
      if(value===undefined||value===null)return;
      output[String(key).replace(/[^a-z0-9_:-]/gi,'').slice(0,40)]=cleanValue(value);
    });
    return output;
  }

  function sendEvent(payload){
    const endpoint=configuredEndpoint();
    if(!endpoint)return;
    const body=JSON.stringify(payload);
    try{
      if(navigator.sendBeacon){
        const blob=new Blob([body],{type:'application/json'});
        if(navigator.sendBeacon(endpoint,blob))return;
      }
    }catch(error){}
    try{
      fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body,keepalive:true,credentials:'omit',mode:'cors'}).catch(()=>{});
    }catch(error){}
  }

  function track(eventName,detail){
    const name=String(eventName||'').trim().replace(/[^a-z0-9_:-]/gi,'_').slice(0,80);
    if(!name)return null;
    const payload={
      version:'growth-events-v1',
      event:name,
      at:new Date().toISOString(),
      session_id:sessionId(),
      path:location.pathname,
      hash:location.hash,
      referrer_host:referrerHost(),
      demo_active:active(),
      viewport:window.innerWidth<640?'mobile':(window.innerWidth<980?'tablet':'desktop'),
      detail:cleanDetail(detail)
    };
    writeEvent(payload);
    try{window.dispatchEvent(new CustomEvent('mimir-growth-event',{detail:payload}));}
    catch(error){}
    sendEvent(payload);
    return payload;
  }

  function sourceFor(el){
    if(!el)return '';
    if(el.dataset?.growthSource)return el.dataset.growthSource;
    const section=el.closest('section,details,header,form');
    return section?.id||section?.className||el.id||el.tagName.toLowerCase();
  }

  function targetFor(el){
    if(!el)return '';
    const href=String(el.getAttribute('href')||'');
    if(href.startsWith('mailto:'))return 'mailto:hello@mmir.ai';
    return el.dataset?.growthTarget||el.id||href||String(el.textContent||'').trim().slice(0,80);
  }

  function clickEventName(el){
    if(!el)return '';
    if(el.dataset?.growthEvent)return el.dataset.growthEvent;
    const href=String(el.getAttribute('href')||'');
    if(el.id==='try-demo-mode')return 'demo_start_click';
    if(href.startsWith('mailto:hello@mmir.ai'))return 'beta_access_click';
    if(href==='#growth-demo')return 'demo_anchor_click';
    if(href==='#local-connector')return 'local_connector_click';
    if(href==='#workflow-builder')return 'workflow_builder_click';
    if(href==='#connect-options')return 'connect_options_click';
    return '';
  }

  function trackClick(event){
    const el=event.target?.closest?.('button,a,[data-growth-event]');
    const eventName=clickEventName(el);
    if(!eventName)return;
    track(eventName,{source:sourceFor(el),target:targetFor(el),label:String(el.textContent||'').trim().slice(0,80)});
  }

  function promptBucket(value){
    const length=String(value||'').trim().length;
    if(!length)return 'empty';
    if(length<80)return 'short';
    if(length<260)return 'medium';
    return 'long';
  }

  function trackSubmit(){
    if(!active())return;
    track('demo_prompt_submit',{source:'composer',prompt_bucket:promptBucket(promptEl?.value)});
  }

  window.MimirGrowthEvents={track,recent:readEvents,endpoint:configuredEndpoint};
  document.addEventListener('click',trackClick,true);
  document.addEventListener('submit',trackSubmit,true);

  function setText(id,value){
    const el=document.getElementById(id);
    if(el&&el.textContent!==value)el.textContent=value;
  }

  function setStatus(message,state){
    const status=document.getElementById('runtime-state');
    if(!status)return;
    if(status.textContent!==message)status.textContent=message;
    const nextState=state||'ready';
    if(status.dataset.state!==nextState)status.dataset.state=nextState;
  }

  function shouldReplaceRuntimeStatus(){
    const status=document.getElementById('runtime-state');
    const text=String(status?.textContent||'');
    if(!text)return true;
    return /Select a backend|Add and activate|Activate a backend profile|No live model|No live models|Checking backend|Request failed/i.test(text);
  }

  function applyDemoModels(){
    const select=document.getElementById('runtime-model');
    if(!select)return;
    const desired='demo-strategy-agent';
    if(select.value===desired&&!select.disabled)return;
    select.innerHTML='';
    [
      ['demo-strategy-agent','MMIR demo strategy agent'],
      ['demo-local-node-guide','MMIR local node guide'],
      ['demo-security-reviewer','MMIR security reviewer']
    ].forEach(([value,label])=>{
      const option=document.createElement('option');
      option.value=value;
      option.textContent=label;
      select.appendChild(option);
    });
    select.value=desired;
    select.disabled=false;
  }

  function ensureSendLink(){
    if(!primaryLink)return;
    primaryLink.textContent='Send';
    primaryLink.href='#mimir-chat-runtime';
    primaryLink.setAttribute('role','button');
    primaryLink.setAttribute('aria-label','Send prompt in demo mode');
    if(primaryLink.getAttribute('aria-disabled')!=='false')primaryLink.setAttribute('aria-disabled','false');
    primaryLink.removeAttribute('target');
    primaryLink.classList.remove('disabled');
  }

  function paragraph(target,text){
    String(text||'').split(/\n{2,}/).filter(Boolean).forEach(block=>{
      const p=document.createElement('p');
      p.textContent=block;
      target.appendChild(p);
    });
  }

  function appendMessage(role,content,meta,flags){
    const transcript=document.getElementById('runtime-transcript');
    if(!transcript)return;
    const bubble=document.createElement('article');
    bubble.className='runtime-message runtime-message-'+role;
    bubble.dataset.messageId='demo-'+Date.now()+'-'+Math.random().toString(16).slice(2);
    if(flags&&flags.welcome)bubble.dataset.demoWelcome='true';
    bubble.setAttribute('aria-label',(role==='user'?'User':'Assistant')+' message');
    const label=document.createElement('span');
    label.className='runtime-message-label';
    label.textContent=role==='user'?'You':'MMIR';
    const body=document.createElement('div');
    body.className='runtime-message-body';
    paragraph(body,content);
    bubble.append(label,body);
    if(meta){
      const small=document.createElement('small');
      small.textContent=meta;
      bubble.appendChild(small);
    }
    transcript.appendChild(bubble);
    bubble.scrollIntoView({block:'nearest'});
  }

  function replyFor(prompt){
    const text=String(prompt||'').toLowerCase();
    if(/revenue|money|pricing|users|growth|sales|customer|pay/.test(text)){
      return 'Fastest money path: make the first screen prove value in under 30 seconds, capture beta intent, then convert qualified users into paid privacy and automation pilots. For MMIR.ai the funnel should be: demo mode, beta request, local node setup, paid workspace tier.\n\nNext build priorities: instrument CTA clicks, add one guided local-node install path, publish one clear use case for developers and privacy-focused teams, then ask every beta user for a concrete workflow they would pay to automate.';
    }
    if(/local|ollama|node|install|connector|backend|model/.test(text)){
      return 'The local path is the strongest wedge: users keep their model runtime private while MMIR.ai gives them a cleaner workspace, workflows, memory and governance. The next product step is a one-command local node, then a browser pairing flow that confirms health, models and chat capability.';
    }
    if(/security|privacy|safe|secret|key|risk|review/.test(text)){
      return 'Security posture for this demo: no API keys, no network calls, no hidden backend and no prompt upload. Production should keep secrets server-side or inside the local node, require explicit pairing, and expose status clearly before any live model call is made.';
    }
    if(/workflow|agent|automation|jira|github|review|plan/.test(text)){
      return 'Automation should start with repeatable review loops: repo triage, issue alignment, frontpage conversion review, security review and release readiness. Each loop should search existing work first, update the backlog, then create the smallest useful PR.';
    }
    return 'Demo mode shows the core promise: one clean AI workspace that can later connect to a local node or protected MMIR backend. The product should feel useful before setup, then become powerful when users connect their own models and workflows.';
  }

  function sendDemoMessage(prompt){
    appendMessage('user',prompt,'demo input');
    if(promptEl)promptEl.value='';
    setStatus('Generating demo response...','loading');
    window.setTimeout(()=>{
      appendMessage('assistant',replyFor(prompt),'demo response - connect a backend for live AI');
      track('demo_response_rendered',{source:'demo-mode'});
      setStatus('Demo response ready. Connect a real backend when ready.','ready');
    },220);
  }

  function ensureWelcome(force){
    const transcript=document.getElementById('runtime-transcript');
    if(!transcript||transcript.querySelector('[data-demo-welcome="true"]'))return;
    let shown=false;
    try{shown=localStorage.getItem(WELCOME_KEY)==='true';}
    catch(error){shown=false;}
    if(shown&&!force)return;
    appendMessage('assistant','Demo mode is ready. Try asking how MMIR.ai can get users, make money, connect local models, or stay private. These are deterministic sample responses, not a live model call.','demo mode',{welcome:true});
    track('demo_welcome_rendered',{source:'demo-mode',forced:Boolean(force)});
    try{localStorage.setItem(WELCOME_KEY,'true');}
    catch(error){}
  }

  function applyDemoMode(forceWelcome){
    if(!active())return;
    document.body.classList.add('mimir-demo-active');
    setText('active-badge','Demo mode');
    setText('active-chat-title','Demo mode is ready. Connect a backend when you need live models.');
    setText('active-chat-description','Try the MMIR.ai workflow now with safe sample responses. No account, backend or API key is needed for this demo.');
    ensureSendLink();
    applyDemoModels();
    if(forceWelcome||shouldReplaceRuntimeStatus()){
      setStatus('Demo mode ready. Responses are simulated until a backend is connected.','ready');
    }
    ensureWelcome(forceWelcome);
  }

  function handleSubmit(event){
    if(!active())return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const prompt=String(promptEl?.value||'').trim();
    if(!prompt){setStatus('Write a message first.','error');return;}
    sendDemoMessage(prompt);
  }

  function handleKeydown(event){
    if(!active()||event.key!=='Enter'||event.shiftKey)return;
    trackSubmit();
    handleSubmit(event);
  }

  function init(){
    demoButton?.addEventListener('click',()=>{
      writeActive(true);
      track('demo_mode_activated',{source:'demo-button'});
      applyDemoMode(true);
      promptEl?.focus();
    });
    formEl?.addEventListener('submit',handleSubmit,true);
    primaryLink?.addEventListener('click',handleSubmit,true);
    promptEl?.addEventListener('keydown',handleKeydown,true);

    const observerTarget=document.getElementById('mimir-chat-runtime')||document.body;
    const observer=new MutationObserver(()=>applyDemoMode(false));
    observer.observe(observerTarget,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['disabled','aria-disabled','class','data-state']});

    if(active())applyDemoMode(false);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
