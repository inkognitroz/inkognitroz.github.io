(function(){
  const tabs=Array.from(document.querySelectorAll('[data-preview-tab]'));
  const panels=Array.from(document.querySelectorAll('[data-preview-panel]'));
  const copyButton=document.getElementById('copy-preview-command');
  const copyStatus=document.getElementById('copy-preview-status');
  const installCommand='curl -fsSL https://mmir.ai/downloads/mmir-local-node-macos-linux.sh | bash';

  function show(name){
    tabs.forEach(tab=>{
      const active=tab.dataset.previewTab===name;
      tab.classList.toggle('is-active',active);
      tab.setAttribute('aria-selected',active?'true':'false');
      tab.tabIndex=active?0:-1;
    });
    panels.forEach(panel=>{
      const active=panel.dataset.previewPanel===name;
      panel.classList.toggle('is-hidden',!active);
      panel.hidden=!active;
      panel.setAttribute('aria-hidden',active?'false':'true');
    });
  }

  tabs.forEach(tab=>{
    tab.addEventListener('click',()=>show(tab.dataset.previewTab));
  });

  copyButton?.addEventListener('click',async()=>{
    try{
      await navigator.clipboard.writeText(installCommand);
      if(copyStatus)copyStatus.textContent='Command copied. Paste it into Terminal.';
    }catch(error){
      if(copyStatus)copyStatus.textContent=installCommand;
    }
  });

  window.MimirDesignPreview={
    version:'20260606-b1-05-preview-lane-v1',
    previewOnly:true,
    show
  };
})();
