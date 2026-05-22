(function(){
  const root=document.getElementById('user-journeys-root');
  const summary=document.getElementById('user-journeys-summary');
  const refreshButton=document.getElementById('refresh-user-journeys');
  const DATA_URL='./user-journeys.json';
  let data=null;
  let statusFilter='all';

  if(!root)return;

  function safe(value){return String(value||'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');}
  function label(value){return String(value||'unknown').replaceAll('-', ' ');}
  function setSummary(message,state){
    if(!summary)return;
    summary.textContent=message||'';
    summary.dataset.state=state||'idle';
  }
  function chip(status){
    const cls=String(status||'planned').replace(/\s+/g,'-');
    return '<span class="journey-chip status-'+safe(cls)+'">'+safe(label(status))+'</span>';
  }

  async function fetchJourneys(){
    const response=await fetch(DATA_URL,{cache:'no-store'});
    if(!response.ok)throw new Error('Journey data unavailable');
    return response.json();
  }

  function counts(journeys){
    return journeys.reduce((acc,journey)=>{
      acc[journey.status]=(acc[journey.status]||0)+1;
      return acc;
    },{});
  }

  function renderStatusCards(journeys){
    const count=counts(journeys);
    const statuses=['live','beta','planned','blocked','premium planned'];
    return '<div class="journey-status-grid">'+statuses.map(status=>
      '<article class="journey-status-card"><h3>'+safe(count[status]||0)+' '+safe(label(status))+'</h3><p>'+safe(statusNote(status))+'</p></article>'
    ).join('')+'</div>';
  }

  function statusNote(status){
    if(status==='live')return 'Works now in the public app.';
    if(status==='beta')return 'Usable path exists, but needs hardening.';
    if(status==='blocked')return 'Intentionally blocked until trust/cost/security controls exist.';
    if(status==='premium planned')return 'Future paid/managed path; free product first.';
    return 'Planned after stronger core validation.';
  }

  function renderPrinciples(){
    const principles=Array.isArray(data.principles)?data.principles:[];
    return '<section><div class="dashboard-heading"><div><p class="eyebrow">Operating layer rules</p><h2>Public-safe product contract</h2></div></div>'+
      '<p class="dashboard-note">'+safe(data.public_repo_rule)+'</p>'+
      '<div class="journey-principles">'+principles.map(item=>'<div class="journey-principle">'+safe(item)+'</div>').join('')+'</div></section>';
  }

  function filteredJourneys(){
    const journeys=Array.isArray(data?.journeys)?data.journeys:[];
    return journeys.filter(journey=>statusFilter==='all'||journey.status===statusFilter);
  }

  function journeyCard(journey){
    const steps=Array.isArray(journey.steps)?journey.steps:[];
    return '<article class="journey-card" id="'+safe(journey.id)+'">'+
      '<div class="journey-card-head"><div><h3>'+safe(journey.id+' - '+journey.name)+'</h3><p>'+safe(journey.user_goal)+'</p></div>'+chip(journey.status)+'</div>'+
      '<div class="journey-meta"><span>'+safe(journey.priority)+'</span><span>'+safe(journey.cost)+'</span><span>'+safe((journey.entry_points||[]).join(' / '))+'</span></div>'+
      '<p><strong>Trust boundary:</strong> '+safe(journey.trust_boundary)+'</p>'+
      '<p><strong>Free-first:</strong> '+safe(journey.free_first)+'</p>'+
      '<ol>'+steps.map(step=>'<li>'+safe(step)+'</li>').join('')+'</ol>'+
      '<p><strong>Done when:</strong> '+safe(journey.done_when)+'</p>'+
      '<p><strong>Gap:</strong> '+safe(journey.current_gap)+'</p>'+
    '</article>';
  }

  function bindFilter(){
    const select=document.getElementById('journey-status-filter');
    if(select)select.addEventListener('change',()=>{statusFilter=select.value;render();});
  }

  function render(){
    const all=Array.isArray(data?.journeys)?data.journeys:[];
    const visible=filteredJourneys();
    root.innerHTML=
      '<p class="dashboard-note">'+safe(data.positioning)+'</p>'+
      renderPrinciples()+
      '<section><div class="dashboard-heading"><div><p class="eyebrow">Journey status</p><h2>What works, what is beta, what is blocked</h2></div></div>'+renderStatusCards(all)+'</section>'+
      '<section><div class="dashboard-heading"><div><p class="eyebrow">User journeys</p><h2>End-to-end paths to test</h2></div></div>'+
      '<div class="journey-toolbar"><span class="dashboard-note">'+safe(visible.length)+' of '+safe(all.length)+' journeys shown</span><select id="journey-status-filter" aria-label="Filter journeys">'+
      ['all','live','beta','planned','blocked','premium planned'].map(status=>'<option value="'+safe(status)+'" '+(status===statusFilter?'selected':'')+'>'+safe(label(status))+'</option>').join('')+
      '</select></div><div class="journey-grid">'+visible.map(journeyCard).join('')+'</div></section>';
    bindFilter();
  }

  async function init(){
    if(refreshButton)refreshButton.disabled=true;
    setSummary('Loading user journeys...','loading');
    try{
      data=await fetchJourneys();
      render();
      setSummary('User journeys loaded. Test each path before marking it 100%.','ready');
    }catch(error){
      root.innerHTML='<p class="dashboard-note">User journey data could not be loaded.</p>';
      setSummary('User journey manifest unavailable.','error');
    }finally{
      if(refreshButton)refreshButton.disabled=false;
    }
  }

  if(refreshButton)refreshButton.addEventListener('click',init);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
