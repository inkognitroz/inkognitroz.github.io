(function(){
  const main=document.querySelector('.mimir-chat-main');
  if(!main)return;

  function safe(value){return String(value||'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');}
  function statusClass(value){return String(value||'planned').replace(/[^a-z0-9-]/gi,'-').toLowerCase();}

  function render(items){
    if(document.getElementById('mmir-value-props'))return;
    const anchor=document.getElementById('model-library');
    const section=document.createElement('details');
    section.id='mmir-value-props';
    section.className='mimir-provider-drawer';
    section.open=true;
    const cards=(items||[]).map(item=>'<article class="provider-card"><div class="provider-card-header"><h3>'+safe(item.title)+'</h3><span class="provider-status status-'+safe(statusClass(item.status))+'">'+safe(item.status)+'</span></div><p>'+safe(item.description)+'</p></article>').join('');
    section.innerHTML='<summary>Why MMIR.ai</summary><section class="mimir-dashboard" aria-labelledby="value-props-title"><div class="dashboard-heading"><div><p class="eyebrow">Multi-model control plane</p><h2 id="value-props-title">Built for flexible AI adoption</h2></div></div><div class="provider-status-grid">'+cards+'</div></section>';
    if(anchor)main.insertBefore(section,anchor);
    else main.appendChild(section);
  }

  async function init(){
    try{
      const response=await fetch('./value-props.json',{cache:'default'});
      if(!response.ok)throw new Error('value props unavailable');
      const data=await response.json();
      render(data.items||[]);
    }catch(error){
      render([
        {title:'Low-friction start',status:'free first',description:'Start with local or self-managed models, then add stronger backends later.'},
        {title:'Bring any model',status:'open',description:'Use open-source, on-prem, private-cloud and SaaS models through one controlled interface.'},
        {title:'Role-based reasoning',status:'MMIR',description:'Assign roles to models, compare answers, and synthesize the best response.'},
        {title:'Safe control layer',status:'safe',description:'Keep sensitive configuration behind controlled backend services.'}
      ]);
    }
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
  else init();
})();
