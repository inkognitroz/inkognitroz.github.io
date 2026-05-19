(function(){
  const grid=document.getElementById('provider-status-grid');
  if(!grid)return;

  function safe(value){return String(value||'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');}
  function statusLabel(status){return String(status||'unknown').replaceAll('-',' ');}

  function render(providers){
    if(!Array.isArray(providers)||!providers.length){
      grid.innerHTML='<p class="empty-backends">Provider registry is not available yet.</p>';
      return;
    }
    grid.innerHTML=providers.map(provider=>{
      const capabilities=Array.isArray(provider.capabilities)?provider.capabilities:[];
      return '<article class="provider-card">'+
        '<div class="provider-card-header"><h3>'+safe(provider.label||provider.id)+'</h3><span class="provider-status status-'+safe(provider.status||'unknown')+'">'+safe(statusLabel(provider.status))+'</span></div>'+
        '<p>'+safe(provider.role||'Provider track')+'</p>'+
        '<dl><div><dt>Route</dt><dd>'+safe(provider.route||'api.mmir.ai')+'</dd></div></dl>'+
        '<div class="provider-capabilities">'+capabilities.map(item=>'<span>'+safe(item)+'</span>').join('')+'</div>'+
        '<small>'+safe(provider.notes||'Status will later come from the controlled backend API.')+'</small>'+
      '</article>';
    }).join('');
  }

  async function init(){
    try{
      const response=await fetch('./provider-registry.json',{cache:'default'});
      if(!response.ok)throw new Error('provider registry unavailable');
      const data=await response.json();
      render(data.providers||[]);
    }catch(error){
      render([
        {id:'github-fallback',label:'GitHub Fallback',status:'planned',role:'Lightweight fallback intelligence',capabilities:['health','status','models','chat-mock','evals'],route:'api.mmir.ai -> mimir-backend-template',notes:'Static fallback provider entry.'}
      ]);
    }
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
  else init();
})();
