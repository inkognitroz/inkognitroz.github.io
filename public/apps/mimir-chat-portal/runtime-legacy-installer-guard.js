(function(){
const d=document,q=s=>d.querySelector(s),qa=s=>Array.from(d.querySelectorAll(s));
function rewriteLegacyInstallerUi(){
  const h=q('#runtime-model-helper');
  if(!h||h.hidden)return;
  const g=h.querySelector('.runtime-install-grid');
  if(!g&&!h.textContent.includes('mmir-local-node-windows.ps1'))return;
  const r=d.createElement('div');
  r.className='runtime-helper-actions';
  r.innerHTML='<a href="./downloads/mmir-local-connector-install.html">Installer</a><a href="./downloads/mmir-local-connector-windows.cmd" download>Win</a><a href="./downloads/mmir-local-connector-linux.sh" download>Linux</a>';
  if(g)g.replaceWith(r);
  h.querySelectorAll('a[href*="mmir-local-node-"]').forEach((a)=>{a.href='./downloads/mmir-local-connector-install.html';a.removeAttribute('download');a.textContent='Installer'});
}
rewriteLegacyInstallerUi();
new MutationObserver(rewriteLegacyInstallerUi).observe(d.documentElement,{childList:true,subtree:true});
window.MimirLegacyInstallerGuard={rewriteLegacyInstallerUi};
})();
