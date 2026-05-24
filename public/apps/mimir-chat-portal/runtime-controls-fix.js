(function(){
  const d=document;
  const q=(selector)=>d.querySelector(selector);
  const qa=(selector)=>Array.from(d.querySelectorAll(selector));
  const P='#mimir-prompt';
  const R='#mimir-chat-runtime';
  const L='#local-connector';
  const C='#connect-options';
  const B='#backend-settings';
  const WORKSPACE_KEY='mimir-active-workspace-v1';
  const DEFAULT_WORKSPACE_ID='personal';
  const EVENTS_PREFIX='mimir-activation-events-v1:';
  const AS='a[href="#mimir-prompt"],a[href="#mimir-chat-runtime"],a[href="#local-connector"],a[href="#connect-options"],a[href="#backend-settings"]';
  const AP='Start free chat.';

  function setAttr(element,name,value){
    if(element&&element.getAttribute(name)!==value)element.setAttribute(name,value);
  }

  function workspaceId(){
    try{return localStorage.getItem(WORKSPACE_KEY)||DEFAULT_WORKSPACE_ID;}catch(error){return DEFAULT_WORKSPACE_ID;}
  }

  function activationEventsKey(){return EVENTS_PREFIX+workspaceId();}

  function readActivationEvents(){
    try{
      const value=JSON.parse(localStorage.getItem(activationEventsKey())||'[]');
      return Array.isArray(value)?value:[];
    }catch(error){
      return [];
    }
  }

  function writeActivationEvents(events){
    try{localStorage.setItem(activationEventsKey(),JSON.stringify(events.slice(-60)));}catch(error){}
  }

  function ensureStarterEvent(){
    const events=readActivationEvents();
    if(events.some((event)=>event&&event.type==='recommended-starter'))return;
    const now=Date.now();
    events.push({
      id:'act_hotfix_'+now.toString(36),
      at:new Date(now).toISOString(),
      at_ms:now,
      type:'recommended-starter',
      signature:'recommended-starter|selected|MMIR browser guide|hotfix',
      status:'selected',
      model:'MMIR browser guide',
      route:'recommended starter',
      free:true,
      first_chat_ready:false,
      note:'Starter selected automatically so the first-screen progress funnel stays interactive. no_paid_routes_started:true.'
    });
    writeActivationEvents(events);
  }

  function repairPrimarySend(){
    const link=q('#primary-chat-link');
    if(!link)return;
    link.classList.remove('disabled');
    link.href=R;
    setAttr(link,'href',R);
    setAttr(link,'role','button');
    setAttr(link,'aria-disabled','false');
    link.removeAttribute('target');
    link.removeAttribute('rel');
  }

  function normalizeTarget(target){
    return target===C&&!q(C)?L:target;
  }

  function openElement(element){
    if(!element)return false;
    for(let current=element;current;current=current.parentElement?.closest?.('details')||null){
      if('open'in current)current.open=true;
    }
    element.scrollIntoView({behavior:'smooth',block:'start'});
    return true;
  }

  function openTarget(target){
    const normalized=normalizeTarget(target);
    if((target===L||target===B||target===C||normalized===L)&&window.MimirBackendProfiles?.ensureFreeLocalProfile){
      window.MimirBackendProfiles.ensureFreeLocalProfile();
    }
    const focus=()=>openElement(q(target)||q(normalized));
    if(!focus()&&window.MimirLoadDeferred)window.MimirLoadDeferred().then(focus);
  }

  function focusChatTarget(){
    const runtime=q(R);
    const prompt=q(P);
    openElement(runtime||prompt);
    if(prompt)setTimeout(()=>prompt.focus({preventScroll:true}),80);
    window.dispatchEvent(new CustomEvent('mmir-mobile-chat-target-opened',{detail:{target:runtime?R:P}}));
  }

  function sendPrompt(value){
    const prompt=q(P);
    if(!prompt)return false;
    prompt.value=String(value||'').trim();
    prompt.dispatchEvent(new Event('input',{bubbles:true}));
    prompt.dispatchEvent(new Event('change',{bubbles:true}));
    focusChatTarget();
    repairPrimarySend();
    setTimeout(()=>q('#primary-chat-link')?.click(),40);
    return true;
  }

  function bindPrimaryAnchors(){
    qa('a[href="#mimir-chat-runtime"]').forEach((link)=>{
      if(link.id!=='primary-chat-link')setAttr(link,'href',P);
    });
    qa('a[href="#connect-options"]').forEach((link)=>{
      if(!q(C))setAttr(link,'href',L);
    });
    qa(AS).forEach((link)=>{link.dataset.runtimeAnchorBound='true';});
  }

  function handleMobileTap(event){
    repairPrimarySend();
    const promptButton=event.target.closest?.('[data-prompt-action]');
    if(promptButton&&promptButton.dataset.firstImpressionBound!=='true'){
      event.preventDefault();
      sendPrompt(promptButton.getAttribute('data-prompt')||promptButton.textContent||'Help me get started with MMIR.');
      return;
    }
    const activation=event.target.closest?.('#activation-chat-now,#activation-connect-local,#activation-open-models,#activation-open-node-dashboard');
    if(activation&&activation.dataset.firstImpressionBound!=='true'){
      event.preventDefault();
      if(activation.id==='activation-chat-now')sendPrompt(AP);
      if(activation.id==='activation-connect-local')openTarget(C);
      if(activation.id==='activation-open-models')openTarget('#model-library');
      if(activation.id==='activation-open-node-dashboard')openTarget('#node-dashboard');
      return;
    }
    const anchor=event.target.closest?.(AS);
    if(!anchor||anchor.id==='primary-chat-link')return;
    const target=anchor.getAttribute('href')||P;
    if(target[0]!=='#')return;
    event.preventDefault();
    if(target===P||target===R)focusChatTarget();
    else openTarget(target);
  }

  function repairMobileFirstChatDom(){
    const center=q('.mimir-chat-center');
    const instant=q('#mimir-instant-start');
    const composer=q('.mimir-composer');
    const quick=q('.quick-suggestions');
    if(!center||!instant||!composer)return;
    if(instant.compareDocumentPosition(composer)&Node.DOCUMENT_POSITION_FOLLOWING)center.insertBefore(composer,instant);
    if(quick&&(instant.compareDocumentPosition(quick)&Node.DOCUMENT_POSITION_FOLLOWING))center.insertBefore(quick,instant);
    composer.dataset.mobileFirstChatReady='true';
    d.body?.setAttribute('data-mobile-buttons-ready','true');
  }

  function run(){
    ensureStarterEvent();
    repairPrimarySend();
    repairMobileFirstChatDom();
    bindPrimaryAnchors();
  }

  if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',run);
  else run();
  d.addEventListener('click',handleMobileTap,true);
  window.addEventListener('load',run,{once:true});
  window.addEventListener('mmir-backend-profiles-updated',repairPrimarySend);
  window.addEventListener('mmir-activation-telemetry-updated',ensureStarterEvent);

  let checks=0;
  const timer=window.setInterval(()=>{
    run();
    checks+=1;
    if(checks>=30)window.clearInterval(timer);
  },500);
})();
