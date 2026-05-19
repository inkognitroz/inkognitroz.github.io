(function(){
  const grid=document.getElementById('local-connector-grid');
  if(!grid)return;

  function safe(value){return String(value||'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');}
  function label(status){return String(status||'planned').replaceAll('-',' ');}

  function render(steps){
    if(!Array.isArray(steps)||!steps.length){
      grid.innerHTML='<p class="empty-backends">Local connector guide is not available yet.</p>';
      return;
    }
    grid.innerHTML=steps.map(step=>'<article class="provider-card"><div class="provider-card-header"><h3>'+safe(step.title||step.id)+'</h3><span class="provider-status status-planned">'+safe(label(step.status))+'</span></div><p>'+safe(step.description||'Connector step')+'</p></article>').join('');
  }

  async function init(){
    try{
      const response=await fetch('./local-connector-guide.json',{cache:'default'});
      if(!response.ok)throw new Error('local connector guide unavailable');
      const data=await response.json();
      render(data.steps||[]);
    }catch(error){
      render([
        {id:'install',title:'Install local connector',status:'planned',description:'Download and run the MMIR local connector when backend track ships it.'},
        {id:'detect',title:'Detect local models',status:'planned',description:'Connector discovers local models and exposes safe /models metadata.'},
        {id:'connect',title:'Connect to MMIR.ai',status:'planned',description:'Frontend stores only a local connector URL and non-sensitive profile metadata.'}
      ]);
    }
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
  else init();
})();
