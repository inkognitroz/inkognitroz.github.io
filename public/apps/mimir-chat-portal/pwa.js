(function(){
  const root=document.getElementById('pwa-install-root');
  let deferredPrompt=null;
  let swRegistration=null;
  let statusEl=null;
  let cardsEl=null;

  if(!root)return;

  function safe(value){return String(value||'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));}
  function setStatus(message,state){if(statusEl){statusEl.textContent=message||'';statusEl.dataset.state=state||'idle';}}
  function isStandalone(){return window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone===true;}
  function canRegisterSw(){return 'serviceWorker' in navigator&&(location.protocol==='https:'||location.hostname==='localhost'||location.hostname==='127.0.0.1');}

  function card(label,state,detail){
    return '<article class="pwa-status-card '+(state?'is-ready':'is-warning')+'"><strong>'+safe(label)+'</strong><span>'+safe(detail)+'</span></article>';
  }

  async function renderStatus(){
    if(!cardsEl)return;
    let offlineReady=false;
    try{
      offlineReady=Boolean(window.caches&&await caches.match('./offline.html'));
    }catch(error){}
    cardsEl.innerHTML=''+
      card('Install mode',isStandalone(),'Standalone: '+(isStandalone()?'yes':'not yet'))+
      card('Service worker',Boolean(swRegistration),'Registered: '+(swRegistration?'yes':'pending'))+
      card('Offline shell',offlineReady,'Offline fallback cached: '+(offlineReady?'yes':'pending'))+
      card('Node handoff',true,'Local node stays localhost/paired; mobile app opens the same setup path.');
  }

  async function registerServiceWorker(){
    if(!canRegisterSw()){
      setStatus('PWA install needs HTTPS or localhost. GitHub Pages/custom domain supports this when the browser trusts the domain.','warning');
      await renderStatus();
      return;
    }
    try{
      swRegistration=await navigator.serviceWorker.register('./sw.js',{scope:'./'});
      if(swRegistration.waiting)swRegistration.waiting.postMessage({type:'SKIP_WAITING'});
      setStatus('PWA shell registered. Offline fallback and install metadata are available.','ready');
    }catch(error){
      setStatus('PWA shell could not register in this browser session. The web app still works online.','error');
    }
    await renderStatus();
  }

  async function installApp(){
    if(deferredPrompt){
      deferredPrompt.prompt();
      const choice=await deferredPrompt.userChoice.catch(()=>({outcome:'dismissed'}));
      deferredPrompt=null;
      setStatus(choice.outcome==='accepted'?'Install accepted. MMIR will open as an app from the device launcher.':'Install dismissed. You can install later from the browser menu.','ready');
      await renderStatus();
      return;
    }
    const shortcut=navigator.userAgent.includes('Safari')?'Share -> Add to Home Screen':'browser menu -> Install app / Add to Home screen';
    setStatus('Install prompt is not available right now. Use '+shortcut+'.','warning');
  }

  async function checkOffline(){
    try{
      const response=await fetch('./offline.html',{cache:'reload'});
      const cached=window.caches?await caches.match('./offline.html'):null;
      setStatus(response.ok||cached?'Offline shell is ready for this browser. Live models still need network or localhost.':'Offline shell was not cached yet. Refresh once and try again.','ready');
    }catch(error){
      setStatus('Network fetch failed; checking cached shell instead.','warning');
    }
    await renderStatus();
  }

  function openNode(){
    document.getElementById('node-dashboard')?.setAttribute('open','');
    document.getElementById('local-connector')?.setAttribute('open','');
    location.hash='node-dashboard';
    setStatus('Node dashboard opened. Mobile MMIR hands off to the same paired local-node flow.','ready');
  }

  function openChat(){
    location.hash='mimir-chat-runtime';
    document.getElementById('mimir-prompt')?.focus();
  }

  function install(){
    root.innerHTML=''+
      '<div class="pwa-toolbar">'+
        '<div><strong>Install MMIR on this device</strong><span>Free app shell, offline fallback, mobile touch targets and safe local-node handoff.</span></div>'+
        '<button id="pwa-refresh-status" type="button">Refresh status</button>'+
      '</div>'+
      '<div id="pwa-status-grid" class="pwa-status-grid" aria-live="polite"></div>'+
      '<div class="pwa-action-row">'+
        '<button id="pwa-install-button" type="button">Install app</button>'+
        '<button id="pwa-check-offline" type="button">Check offline shell</button>'+
        '<button id="pwa-open-node" type="button">Open node handoff</button>'+
        '<button id="pwa-open-chat" type="button">Open chat</button>'+
      '</div>'+
      '<div class="pwa-handoff">'+
        '<article><strong>Phone/tablet</strong><span>Install the shell, chat from the device and connect to local or remote nodes after pairing.</span></article>'+
        '<article><strong>Local-first</strong><span>Offline shell caches public UI only. Models, private files and keys stay in local node or protected backend.</span></article>'+
        '<article><strong>No spend</strong><span>Service worker, manifest and install flow use free browser/GitHub Pages capabilities.</span></article>'+
      '</div>'+
      '<p id="pwa-install-status" class="dashboard-note" data-state="idle" aria-live="polite"></p>';
    cardsEl=document.getElementById('pwa-status-grid');
    statusEl=document.getElementById('pwa-install-status');
    document.getElementById('pwa-install-button')?.addEventListener('click',installApp);
    document.getElementById('pwa-check-offline')?.addEventListener('click',checkOffline);
    document.getElementById('pwa-open-node')?.addEventListener('click',openNode);
    document.getElementById('pwa-open-chat')?.addEventListener('click',openChat);
    document.getElementById('pwa-refresh-status')?.addEventListener('click',()=>{registerServiceWorker();renderStatus();});
    registerServiceWorker();
  }

  window.addEventListener('beforeinstallprompt',(event)=>{
    event.preventDefault();
    deferredPrompt=event;
    setStatus('Install prompt is ready.','ready');
    renderStatus();
  });
  window.addEventListener('appinstalled',()=>{deferredPrompt=null;setStatus('MMIR installed on this device.','ready');renderStatus();});
  window.addEventListener('online',()=>setStatus('Back online. Local nodes and protected backends can be checked again.','ready'));
  window.addEventListener('offline',()=>setStatus('Offline shell active. Cached public UI remains available.','warning'));
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
