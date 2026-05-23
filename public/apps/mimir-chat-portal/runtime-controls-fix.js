(function(){
  const READY_COPY='Free guide works now; connect local node for live models.';
  const FIRST_CHAT_RECEIPT_KEY='mimir-first-chat-receipt-v1';
  let verifiedProof=null;
  let receipt=null;

  function safe(value){
    return String(value||'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
  }

  function readReceipt(){
    try{
      const data=JSON.parse(localStorage.getItem(FIRST_CHAT_RECEIPT_KEY)||'null');
      return data&&data.privacy==='no_prompt_content'?data:null;
    }catch(error){
      return null;
    }
  }

  function writeReceipt(status,error){
    if(receipt?.status==='succeeded')return receipt;
    receipt={
      status:status==='succeeded'?'succeeded':'failed',
      model:String(verifiedProof?.model||'verified model').slice(0,160),
      backend:String(verifiedProof?.url||'active backend').replace(/^https?:\/\//,'').slice(0,120),
      at:new Date().toISOString(),
      privacy:'no_prompt_content'
    };
    if(error)receipt.error=String(error).slice(0,160);
    try{localStorage.setItem(FIRST_CHAT_RECEIPT_KEY,JSON.stringify(receipt));}
    catch(storageError){}
    window.dispatchEvent(new CustomEvent('mmir-first-chat-receipt-updated',{detail:receipt}));
    return receipt;
  }

  function renderFirstChatReceipt(){
    const proof=document.getElementById('runtime-live-proof');
    if(!proof)return;
    receipt=receipt||readReceipt();
    let box=document.getElementById('runtime-first-chat-receipt');
    if(!receipt){
      if(box)box.remove();
      return;
    }
    if(!box){
      box=document.createElement('div');
      box.id='runtime-first-chat-receipt';
      box.className='runtime-model-install-status';
      proof.appendChild(box);
    }
    const ready=receipt.status==='succeeded';
    box.dataset.state=ready?'ready':'error';
    box.innerHTML='<strong>'+(ready?'First chat succeeded':'First chat needs recovery')+'</strong><br><span>'+safe([receipt.model,receipt.backend,receipt.at].filter(Boolean).join(' - '))+'</span><br><small>privacy: no_prompt_content</small>'+(receipt.error?'<br><small>'+safe(receipt.error)+'</small>':'')+(ready?'':'<br><button type="button" data-first-chat-recovery="retry-proof">Retry proof</button> <button type="button" data-first-chat-recovery="connect-settings">Connect settings</button>');
    box.querySelector('[data-first-chat-recovery="retry-proof"]')?.addEventListener('click',()=>document.getElementById('runtime-refresh')?.click());
    box.querySelector('[data-first-chat-recovery="connect-settings"]')?.addEventListener('click',()=>openTarget('#backend-settings'));
  }

  function syncFirstChatReceipt(){
    const state=document.getElementById('runtime-state');
    if(!state||!verifiedProof||receipt?.status==='succeeded'){
      renderFirstChatReceipt();
      return;
    }
    const text=String(state.textContent||'');
    if(state.dataset.state==='ready'&&/Response received|First verified chat succeeded/i.test(text)){
      writeReceipt('succeeded');
    }else if(state.dataset.state==='error'&&!/Write a message first|No live model|Activate a backend/i.test(text)){
      writeReceipt('failed',text);
    }
    renderFirstChatReceipt();
  }

  function syncPrimaryLink(){
    const link=document.getElementById('primary-chat-link');
    if(!link)return;
    const href=link.getAttribute('href')||'';
    const label=String(link.textContent||'').trim().toLowerCase();
    if(href!=='#mimir-chat-runtime'&&label!=='send')return;
    const disabled=link.getAttribute('aria-disabled')==='true';
    if(link.classList.contains('disabled')!==disabled)link.classList.toggle('disabled',disabled);
    if(!disabled&&link.getAttribute('aria-disabled')!=='false')link.setAttribute('aria-disabled','false');
  }

  function openTarget(target){
    if(target==='#local-connector'||target==='#backend-settings'){
      window.MimirBackendProfiles?.ensureFreeLocalProfile?.();
    }
    const targetEl=document.querySelector(target);
    if(targetEl&&'open' in targetEl)targetEl.open=true;
    if(targetEl)targetEl.scrollIntoView({behavior:'smooth',block:'start'});
    window.dispatchEvent(new CustomEvent('mmir-connect-option-opened',{detail:{target}}));
  }

  function bindConnectOptions(){
    document.querySelectorAll('#connect-options .button-link[href]').forEach(link=>{
      if(link.dataset.runtimeControlBound==='true')return;
      link.dataset.runtimeControlBound='true';
      link.addEventListener('click',event=>{
        const target=link.getAttribute('href')||'#backend-settings';
        if(!target.startsWith('#'))return;
        event.preventDefault();
        openTarget(target);
      });
    });
  }

  function updateOnboardingCopy(){
    document.querySelectorAll('#first-run-onboarding .onboarding-step').forEach(step=>{
      const title=String(step.querySelector('strong')?.textContent||'').trim();
      const detail=step.querySelector('small');
      if(title!=='Send first prompt'||!detail)return;
      if(detail.textContent==='Finish backend setup, then send the first prompt.'){
        detail.textContent=READY_COPY;
        const aria=step.getAttribute('aria-label')||'';
        step.setAttribute('aria-label',aria.replace('Finish backend setup, then send the first prompt.',READY_COPY));
      }
    });
  }

  function rewriteLegacyInstallerUi(){
    const helper=document.getElementById('runtime-model-helper');
    if(!helper||helper.hidden)return;
    const legacyGrid=helper.querySelector('.runtime-install-grid');
    const hasLegacyText=helper.textContent.includes('mmir-local-node-windows.ps1')||helper.textContent.includes('DryRun');
    if(!legacyGrid&&!hasLegacyText)return;
    const replacement=document.createElement('div');
    replacement.className='runtime-helper-actions';
    replacement.dataset.connectorRewrite='true';
    replacement.innerHTML=''+
      '<a class="button-link" href="./downloads/mmir-local-connector-install.html">Open universal installer</a>'+
      '<a class="button-link" href="./downloads/mmir-local-connector-mac.zip.html">Mac installer</a>'+
      '<a class="button-link" href="./downloads/mmir-local-connector-windows.cmd" download>Windows installer</a>'+
      '<a class="button-link" href="./downloads/mmir-local-connector-linux.sh" download>Linux / Raspberry Pi</a>';
    if(legacyGrid){
      const note=document.createElement('p');
      note.textContent='Install the universal MMIR Local Connector once. It detects Mac, Windows, Linux, Raspberry Pi/Linux ARM or mobile client mode, keeps the node on localhost by default and then MMIR can pull models through the paired local API.';
      legacyGrid.replaceWith(note,replacement);
    }
    helper.querySelectorAll('a[href*="mmir-local-node-"]').forEach(link=>{
      link.setAttribute('href','./downloads/mmir-local-connector-install.html');
      link.removeAttribute('download');
      link.textContent='Open universal installer';
    });
  }

  function run(){
    syncPrimaryLink();
    bindConnectOptions();
    updateOnboardingCopy();
    rewriteLegacyInstallerUi();
    syncFirstChatReceipt();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
  new MutationObserver(run).observe(document.documentElement,{
    childList:true,
    subtree:true,
    attributes:true,
    attributeFilter:['aria-disabled','href','class']
  });
  window.addEventListener('mmir-backend-profiles-updated',run);
  window.addEventListener('mmir-live-model-proof-updated',event=>{
    if(event.detail?.status==='verified'&&event.detail?.first_chat_ready===true)verifiedProof=event.detail;
    run();
  });
  window.addEventListener('mmir-chat-history-updated',run);
  window.addEventListener('storage',run);
  window.addEventListener('focus',run);
})();
