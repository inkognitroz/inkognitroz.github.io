(function(){
  const READY_COPY='Free guide works now; connect local node for live models.';

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

  function run(){
    syncPrimaryLink();
    bindConnectOptions();
    updateOnboardingCopy();
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
