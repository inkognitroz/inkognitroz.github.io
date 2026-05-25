(function(){
  const d=document;
  const w=window;
  const P='#mimir-prompt';
  const R='#mimir-chat-runtime';
  const L='#local-connector';
  const C='#connect-options';
  const AS='a[href="#mimir-prompt"],a[href="#mimir-chat-runtime"],a[href="#local-connector"],a[href="#connect-options"],a[href="#backend-settings"]';
  const K='__MimirLocalProbeAllowedUntil';
  const q=(selector)=>d.querySelector(selector);
  const qa=(selector)=>d.querySelectorAll(selector);

  function setAttr(element,name,value){
    if(element&&element.getAttribute(name)!==value)element.setAttribute(name,value);
  }

  function installCleanShellStyle(){
    if(d.getElementById('mmir-clean-chat-shell-hotfix'))return;
    const style=d.createElement('style');
    style.id='mmir-clean-chat-shell-hotfix';
    style.textContent=`
      body.mimir-public-chat{
        background:#fff!important;
        color:#0f172a!important;
      }

      .mimir-topbar{
        position:sticky!important;
        top:0!important;
        z-index:40!important;
        background:rgba(255,255,255,.94)!important;
        border-bottom:1px solid rgba(229,229,232,.78)!important;
        backdrop-filter:blur(14px)!important;
        -webkit-backdrop-filter:blur(14px)!important;
      }

      .mimir-topbar nav>a:nth-of-type(n+5){
        display:none!important;
      }

      .mimir-chat-main{
        width:min(960px,calc(100% - 32px))!important;
        min-height:calc(100vh - 4.75rem)!important;
        align-content:start!important;
        padding:clamp(1rem,4.8vh,4rem) 0 2rem!important;
      }

      .mimir-chat-center{
        gap:.72rem!important;
        overflow:visible!important;
      }

      .mimir-greeting{
        position:absolute!important;
        width:1px!important;
        height:1px!important;
        margin:-1px!important;
        padding:0!important;
        overflow:hidden!important;
        clip:rect(0 0 0 0)!important;
        clip-path:inset(50%)!important;
        white-space:nowrap!important;
      }

      .mimir-composer{
        order:1!important;
        width:min(820px,100%)!important;
        margin:0 auto!important;
        padding:.75rem!important;
        display:grid!important;
        gap:.55rem!important;
        border-radius:18px!important;
        overflow:hidden!important;
      }

      .mimir-composer textarea{
        min-height:6rem!important;
        max-height:16rem!important;
        padding:.7rem .65rem!important;
      }

      #mmir-active-nodes-bar{
        order:2!important;
        width:min(820px,100%)!important;
        margin:.2rem auto 0!important;
        padding:.4rem .55rem!important;
        border-color:rgba(229,229,232,.9)!important;
        background:rgba(255,255,255,.72)!important;
        box-shadow:none!important;
      }

      #mmir-active-nodes-bar .mmir-active-node-head{
        flex-wrap:nowrap!important;
      }

      #mmir-active-nodes-bar .mmir-active-node-title span,
      #mmir-active-nodes-bar .mmir-active-node-title small{
        display:none!important;
      }

      #mmir-active-nodes-bar .mmir-active-node-title strong{
        color:#667085!important;
        font-size:.78rem!important;
        font-weight:650!important;
        overflow:hidden!important;
        text-overflow:ellipsis!important;
        white-space:nowrap!important;
      }

      #mmir-active-nodes-bar .mmir-active-node-pill{
        font-size:.7rem!important;
        padding:.18rem .5rem!important;
      }

      #mmir-active-nodes-bar .mmir-active-starter-rail,
      #mmir-active-nodes-bar .mmir-active-node-grid{
        display:none!important;
      }

      #mimir-chat-runtime{
        order:3!important;
      }

      #mimir-instant-start{
        order:5!important;
      }

      .mimir-chat-center>.quick-suggestions,
      body.mimir-chat-first #runtime-context-controls,
      body.mimir-chat-first .runtime-model-helper,
      body.mimir-chat-first #mimir-readiness-rail,
      body.mimir-chat-first #activation-closure-strip,
      body.mimir-chat-first #first-screen-starter-funnel,
      body.mimir-chat-first #activation-cockpit,
      body.mimir-chat-first #use-case-templates,
      body.mimir-chat-first #free-value-loops,
      body.mimir-chat-first #first-run-onboarding{
        display:none!important;
      }

      body.mimir-chat-first #mimir-instant-start:not(:target),
      body.mimir-chat-first #growth-demo:not(:target){
        display:none!important;
      }

      body.mimir-chat-first:not(.mimir-has-chat) .mimir-chat-main>details:not(:target){
        display:none!important;
      }

      .composer-mode-dock{
        position:static!important;
        width:100%!important;
        align-items:center!important;
        border-top:1px solid rgba(148,163,184,.18)!important;
        display:grid!important;
        grid-template-areas:"tools live"!important;
        grid-template-columns:auto minmax(0,1fr)!important;
        gap:.48rem .65rem!important;
        margin-top:.2rem!important;
        min-width:0!important;
        padding:.55rem .3rem .3rem!important;
      }

      .composer-tool-cluster,
      .composer-live-cluster{
        align-items:center!important;
        flex-wrap:nowrap!important;
        min-width:0!important;
        overflow-x:auto!important;
        scrollbar-width:none!important;
      }

      .composer-tool-cluster::-webkit-scrollbar,
      .composer-live-cluster::-webkit-scrollbar{
        display:none!important;
      }

      .composer-live-cluster{
        justify-content:flex-end!important;
      }

      .composer-mode-button,
      .composer-icon-button,
      .composer-live-chip{
        flex:0 0 auto!important;
        min-height:31px!important;
        padding:0 .62rem!important;
      }

      .composer-icon-button{
        min-width:31px!important;
        padding:0!important;
      }

      #runtime-model-chip{
        max-width:min(230px,28vw)!important;
      }

      body.mimir-chat-first #composer-new-chat,
      body.mimir-chat-first [data-chat-mode="boost"],
      body.mimir-chat-first [data-chat-mode="super"],
      body.mimir-chat-first [data-chat-mode="vision"],
      body.mimir-chat-first #runtime-resource-chip,
      body.mimir-chat-first #composer-action-feedback,
      body.mimir-chat-first .composer-context{
        display:none!important;
      }

      .composer-bar{
        border-top:0!important;
        display:flex!important;
        flex-direction:row!important;
        align-items:center!important;
        justify-content:flex-end!important;
        gap:.75rem!important;
        padding:.2rem .25rem .1rem!important;
      }

      .composer-actions{
        display:flex!important;
        flex-wrap:nowrap!important;
        justify-content:flex-end!important;
        min-width:44px!important;
        width:auto!important;
      }

      .composer-actions .btn,
      .composer-actions #primary-chat-link{
        width:44px!important;
        min-width:44px!important;
        min-height:44px!important;
        padding:0!important;
      }

      .mimir-chat-runtime{
        width:min(820px,100%)!important;
        margin:.2rem auto 0!important;
      }

      .runtime-toolbar,
      .runtime-proof-rail,
      .runtime-proof-actions{
        display:none!important;
      }

      .runtime-live-proof{
        border:0!important;
        background:transparent!important;
        padding:.15rem .3rem!important;
      }

      .runtime-live-proof[data-state="idle"]{
        display:none!important;
      }

      .runtime-transcript{
        padding:.25rem 0 0!important;
      }

      .runtime-message{
        border-radius:18px!important;
        box-shadow:none!important;
      }

      .runtime-message-assistant{
        border-color:transparent!important;
        background:transparent!important;
      }

      .runtime-message-actions{
        opacity:.78!important;
      }

      @media(max-width:720px){
        .mimir-topbar{
          padding:.55rem .75rem .5rem!important;
        }

        .mimir-topbar nav{
          grid-template-columns:repeat(5,minmax(0,1fr))!important;
        }

        .mimir-chat-main{
          width:100%!important;
          padding:.8rem .85rem calc(1rem + env(safe-area-inset-bottom))!important;
        }

        .mimir-composer textarea{
          min-height:4.75rem!important;
        }

        .composer-mode-dock{
          grid-template-areas:"tools live"!important;
          grid-template-columns:auto minmax(0,1fr)!important;
          gap:.4rem!important;
        }

        .composer-live-chip,
        #runtime-model-chip{
          max-width:46vw!important;
        }
      }
    `;
    d.head.appendChild(style);
  }

  function compactComposerLabels(){
    const chip=q('#runtime-model-chip');
    if(chip){
      const label=String(chip.textContent||'').trim();
      if(/MMIR Guide/i.test(label))chip.textContent='MMIR Guide';
      else if(/MMIR Model Picker/i.test(label))chip.textContent='Model Picker';
      else chip.textContent=label.replace(/\s+-\s+(free browser helper|ready now|browser helper|active in browser|live helper|tiny free local|small multilingual|balanced free local|local assistant|tiny local chat|reasoning local|code assistant).*$/i,'').slice(0,42).trim()||'Model';
    }
  }

  function returnIntent(){
    const params=new URLSearchParams(location.search);
    const hash=location.hash.toLowerCase();
    return params.get('mmir_local_return')==='1'||params.get('local_node_ready')==='1'||hash.includes('local-connector-ready')||hash.includes('mmir-local-ready');
  }

  function clearPassiveProbe(){
    if(!returnIntent())w[K]=0;
  }

  function repairPrimarySend(){
    const link=q('#primary-chat-link');
    if(!link)return;
    link.textContent='\u2191';
    link.classList.remove('disabled');
    setAttr(link,'aria-disabled','false');
    setAttr(link,'aria-label','Send prompt to the active MMIR route');
    setAttr(link,'title','Send');
    if(link.tagName==='BUTTON'){
      link.type='submit';
      link.removeAttribute('href');
      link.removeAttribute('target');
      link.removeAttribute('rel');
      return;
    }
    setAttr(link,'href',R);
    setAttr(link,'role','button');
    link.removeAttribute('target');
    link.removeAttribute('rel');
  }

  function normalizeTarget(target){
    return target===C&&!q(C)?L:target;
  }

  function openElement(element){
    if(!element)return false;
    for(let current=element;current;current=current.parentElement?.closest?.('details')){
      if('open' in current)current.open=true;
    }
    element.scrollIntoView();
    return true;
  }

  function openTarget(target){
    const normalized=normalizeTarget(target);
    if((target===L||target===C||normalized===L)&&w.MimirBackendProfiles?.ensureFreeLocalProfile)w.MimirBackendProfiles.ensureFreeLocalProfile();
    const open=()=>openElement(q(target)||q(normalized));
    if(!open()&&w.MimirLoadDeferred)w.MimirLoadDeferred().then(open);
  }

  function focusChatTarget(){
    const prompt=q(P);
    const runtime=q(R);
    openElement(runtime||prompt);
    if(prompt)prompt.focus({preventScroll:true});
    w.dispatchEvent(new CustomEvent('mmir-mobile-chat-target-opened',{detail:{target:runtime?R:P}}));
  }

  function sendPrompt(value){
    const prompt=q(P);
    if(!prompt)return false;
    prompt.value=String(value||'').trim();
    prompt.dispatchEvent(new Event('input',{bubbles:true}));
    prompt.dispatchEvent(new Event('change',{bubbles:true}));
    focusChatTarget();
    repairPrimarySend();
    clearPassiveProbe();
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
    const promptAction=event.target.closest?.('[data-prompt-action]');
    if(promptAction&&promptAction.dataset.firstImpressionBound!=='true'){
      event.preventDefault();
      sendPrompt(promptAction.dataset.prompt||promptAction.textContent||'Help me get started with MMIR.');
      return;
    }
    const activation=event.target.closest?.('#activation-chat-now,#activation-connect-local,#activation-open-models,#activation-open-node-dashboard');
    if(activation&&activation.dataset.firstImpressionBound!=='true'){
      event.preventDefault();
      if(activation.id==='activation-chat-now')sendPrompt('Start free chat.');
      else openTarget(activation.id==='activation-connect-local'?C:activation.id==='activation-open-models'?'#model-library':'#node-dashboard');
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

  function markMobileFirstChatReady(){
    const composer=q('.mimir-composer');
    if(composer)composer.dataset.mobileFirstChatReady='true';
  }

  function run(){
    installCleanShellStyle();
    repairPrimarySend();
    compactComposerLabels();
    markMobileFirstChatReady();
    bindPrimaryAnchors();
  }

  if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',run);
  else run();
  d.addEventListener('click',handleMobileTap,true);
  w.addEventListener('load',run,{once:true});
  ['mmir-backend-profiles-updated','mmir-live-model-proof-updated','mmir-chat-modes-updated'].forEach((name)=>w.addEventListener(name,run));
  let checks=0;
  const timer=setInterval(()=>{
    run();
    checks+=1;
    if(checks>=30)clearInterval(timer);
  },500);
})();
