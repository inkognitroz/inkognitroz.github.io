(function(){
  const STORAGE_KEY='mimir-chat-portal-config';
  const backendUrl=document.getElementById('backend-url');
  const workspaceLabel=document.getElementById('workspace-label');
  const saveBtn=document.getElementById('save-config');
  const openBackend=document.getElementById('open-backend');
  const clearBtn=document.getElementById('clear-config');
  const configStatus=document.getElementById('config-status');
  const handoffNote=document.getElementById('handoff-note');
  const copyBtn=document.getElementById('copy-note');
  const copyStatus=document.getElementById('copy-status');
  const surfaceBackend=document.getElementById('surface-backend');
  function cleanUrl(value){return String(value||'').trim().replace(/\/$/,'');}
  function setStatus(text){configStatus.textContent=text||'';}
  function validUrl(value){try{const url=new URL(value);return url.protocol==='http:'||url.protocol==='https:';}catch(e){return false;}}
  function readConfig(){try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}');}catch(e){return {};}}
  function writeConfig(config){localStorage.setItem(STORAGE_KEY,JSON.stringify(config));}
  function render(){
    const url=cleanUrl(backendUrl.value);
    const label=workspaceLabel.value.trim()||'Mimir / SaaS Fabric';
    const ok=validUrl(url);
    openBackend.href=ok?url:'#';
    surfaceBackend.href=ok?url:'#';
    openBackend.classList.toggle('disabled',!ok);
    openBackend.setAttribute('aria-disabled',String(!ok));
    surfaceBackend.classList.toggle('disabled',!ok);
    handoffNote.value='Mimir backend handoff\n\nWorkspace: '+label+'\nOpen WebUI URL: '+(ok?url:'not configured')+'\n\nExpected backend: Open WebUI in front of Ollama on OCI. Frontend stores only this URL locally. Internal tools: /internal.html';
  }
  function load(){const config=readConfig();if(config.backendUrl)backendUrl.value=config.backendUrl;if(config.workspaceLabel)workspaceLabel.value=config.workspaceLabel;render();}
  saveBtn.addEventListener('click',()=>{const url=cleanUrl(backendUrl.value);if(!validUrl(url)){setStatus('Enter a valid http or https URL.');render();return;}writeConfig({backendUrl:url,workspaceLabel:workspaceLabel.value.trim()||'Mimir / SaaS Fabric',updatedAt:new Date().toISOString()});setStatus('Saved locally in this browser.');render();});
  clearBtn.addEventListener('click',()=>{localStorage.removeItem(STORAGE_KEY);backendUrl.value='';setStatus('Cleared.');render();});
  copyBtn.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(handoffNote.value);copyStatus.textContent='Copied.';}catch(e){handoffNote.select();document.execCommand('copy');copyStatus.textContent='Copied.';}});
  backendUrl.addEventListener('input',render);
  workspaceLabel.addEventListener('input',render);
  load();
})();
