(function(){
  const READY_COPY='Free guide works now; connect local node for live models.';

  function syncPrimaryLink(){
    const link=document.getElementById('primary-chat-link');
    if(!link)return;
    const href=link.getAttribute('href')||'';
    const label=String(link.textContent||'').trim().toLowerCase();
    if(link.id!=='primary-chat-link'&&href!=='#mimir-chat-runtime'&&label!=='send')return;
    const busy=document.querySelector('.mimir-chat-center')?.getAttribute('aria-busy')==='true';
    link.setAttribute('href','#mimir-chat-runtime');
    link.setAttribute('role','button');
    link.removeAttribute('target');
    link.removeAttribute('rel');
    link.setAttribute('aria-disabled',busy?'true':'false');
    const disabled=busy;
    if(link.classList.contains('disabled')!==disabled)link.classList.toggle('disabled',disabled);
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
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
  new MutationObserver(run).observe(document.documentElement,{
    childList:true,
    subtree:true,
    attributes:true,
    attributeFilter:['aria-disabled','href','class']
  });
  window.addEventListener('mmir-backend-profiles-updated',run);
  window.addEventListener('mmir-chat-history-updated',run);
  window.addEventListener('storage',run);
  window.addEventListener('focus',run);
})();
