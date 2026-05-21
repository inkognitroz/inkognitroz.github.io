(function(){
  const grid=document.getElementById('local-connector-grid');
  const main=document.querySelector('.mimir-chat-main');

  function safe(value){return String(value||'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');}
  function label(status){return String(status||'planned').replaceAll('-',' ');}

  function render(steps){
    if(!grid)return;
    if(!Array.isArray(steps)||!steps.length){grid.innerHTML='<p class="empty-backends">Local connector guide is not available yet.</p>';return;}
    grid.innerHTML=steps.map(step=>'<article class="provider-card"><div class="provider-card-header"><h3>+ '+safe(step.title||step.id)+'</h3><span class="provider-status status-planned">'+safe(label(step.status))+'</span></div><p>'+safe(step.description||'Connector step')+'</p></article>').join('');
  }

  function renderConnectOptions(options){
    if(!main||document.getElementById('connect-options'))return;
    const section=document.createElement('details');
    section.id='connect-options';
    section.className='mimir-provider-drawer';
    section.open=true;
    const cards=(Array.isArray(options)?options:[]).map(option=>'<article class="provider-card"><div class="provider-card-header"><h3>+ '+safe(option.title||option.id)+'</h3><span class="provider-status status-planned">'+safe(label(option.status))+'</span></div><p>'+safe(option.description||'Connection option')+'</p><a class="button-link" href="'+safe(option.target||'#backend-settings')+'">Open</a></article>').join('');
    section.innerHTML='<summary>+ Connect Model</summary><section class="mimir-dashboard" aria-labelledby="connect-options-title"><div class="dashboard-heading"><div><p class="eyebrow">First pipeline</p><h2 id="connect-options-title">Connect to local and cloud AI/LLM models</h2></div></div><div class="provider-status-grid">'+cards+'</div></section>';
    const anchor=document.getElementById('local-connector');
    if(anchor)main.insertBefore(section,anchor); else main.appendChild(section);
  }

  function renderFeatureCatalog(features){
    if(!main||document.getElementById('plus-feature-catalog'))return;
    const section=document.createElement('details');
    section.id='plus-feature-catalog';
    section.className='mimir-provider-drawer';
    const cards=(Array.isArray(features)?features:[]).map(feature=>{
      const bullets=Array.isArray(feature.bullets)?feature.bullets:[];
      return '<details class="model-catalog-hint"><summary>+ '+safe(feature.title)+(feature.badge?' ('+safe(feature.badge)+')':'')+'</summary><p class="dashboard-note"><strong>'+safe(feature.headline||'')+'</strong></p><p class="dashboard-note">'+safe(feature.description||'')+'</p><div class="provider-capabilities">'+bullets.map(item=>'<span>'+safe(item)+'</span>').join('')+'</div></details>';
    }).join('');
    section.innerHTML='<summary>+ All MMIR.ai Features</summary><section class="mimir-dashboard"><div class="dashboard-heading"><div><p class="eyebrow">Expand to learn more</p><h2>Everything is organized behind + sections</h2></div></div>'+cards+'</section>';
    const anchor=document.getElementById('model-library');
    if(anchor)main.insertBefore(section,anchor); else main.appendChild(section);
  }

  async function loadConnectOptions(){
    try{
      const response=await fetch('./connect-options.json',{cache:'default'});
      if(!response.ok)throw new Error('connect options unavailable');
      const data=await response.json();
      renderConnectOptions(data.options||[]);
    }catch(error){
      renderConnectOptions([
        {id:'local-connector',title:'Connect local LLM',status:'free first',description:'Connect a local PC or VM through the MMIR local connector.',target:'#local-connector'},
        {id:'bring-backend',title:'Add compatible backend',status:'self-managed',description:'Add a trusted backend URL when the connector API is ready.',target:'#backend-settings'},
        {id:'provider-api',title:'Use SaaS model/API',status:'backend required',description:'Provider keys must stay behind a protected backend.',target:'#provider-status'}
      ]);
    }
  }

  async function loadFeatureCatalog(){
    try{
      const response=await fetch('./feature-catalog.json',{cache:'default'});
      if(!response.ok)throw new Error('feature catalog unavailable');
      const data=await response.json();
      renderFeatureCatalog(data.features||[]);
    }catch(error){
      renderFeatureCatalog([]);
    }
  }

  async function init(){
    loadConnectOptions();
    loadFeatureCatalog();
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

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init); else init();
})();