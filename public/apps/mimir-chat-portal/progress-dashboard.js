(function(){
  const root=document.getElementById('progress-dashboard-root');
  const refreshButton=document.getElementById('refresh-progress-dashboard');
  const summary=document.getElementById('progress-dashboard-summary');
  const DATA_URL='./progress-dashboard.json';
  const WORKSPACE_KEY='mimir-active-workspace-v1';
  const DEFAULT_WORKSPACE_ID='personal';
  const FIRST_CHAT_RECEIPT_PREFIX='mimir-first-chat-receipt-v1:';
  const ACTIVATION_EVENTS_PREFIX='mimir-activation-events-v1:';
  const AUTOPILOT_PREFIX='mimir-activation-autopilot-v1:';
  let dashboard=null;
  let filterStatus='all';
  let filterText='';

  if(!root)return;

  function safe(value){return String(value||'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');}
  function label(value){return String(value||'unknown').replaceAll('-', ' ');}
  function activeWorkspaceId(){return localStorage.getItem(WORKSPACE_KEY)||DEFAULT_WORKSPACE_ID;}
  function firstChatReceiptStorageKey(){return FIRST_CHAT_RECEIPT_PREFIX+activeWorkspaceId();}
  function activationEventsStorageKey(){return ACTIVATION_EVENTS_PREFIX+activeWorkspaceId();}
  function autopilotStorageKey(){return AUTOPILOT_PREFIX+activeWorkspaceId();}
  function readFirstChatReceipt(){
    try{
      const value=JSON.parse(localStorage.getItem(firstChatReceiptStorageKey())||'null');
      return value&&typeof value==='object'?value:null;
    }catch(error){
      return null;
    }
  }
  function firstChatReceiptState(){
    const receipt=readFirstChatReceipt();
    if(receipt?.status==='success'){
      return {
        status:'ready',
        label:'Verified',
        detail:(receipt.model||'model')+' answered at '+new Date(receipt.first_success_at||receipt.at||Date.now()).toLocaleString()+'. No raw prompt or response is stored.',
        action:'Open chat'
      };
    }
    if(receipt?.status==='failed'){
      return {
        status:'error',
        label:'Needs repair',
        detail:'Last verified chat failed. Recovery actions are ready, and no raw prompt or response was stored.',
        action:'Repair first chat'
      };
    }
    return {
      status:'idle',
      label:'Not proven yet',
      detail:'No verified live-model first-chat receipt exists for this browser workspace yet.',
      action:'Start free path'
    };
  }
  function readActivationEvents(){
    try{
      const value=JSON.parse(localStorage.getItem(activationEventsStorageKey())||'[]');
      return Array.isArray(value)?value:[];
    }catch(error){
      return [];
    }
  }
  function readAutopilotState(){
    try{
      const value=JSON.parse(localStorage.getItem(autopilotStorageKey())||'null');
      return value&&typeof value==='object'?value:null;
    }catch(error){
      return null;
    }
  }
  function activationSummary(){
    const events=readActivationEvents();
    const autopilot=readAutopilotState();
    const latest=events[events.length-1]||null;
    const verified=events.filter((event)=>event.status==='verified'||event.first_chat_ready||event.status==='ready').length;
    const failed=events.filter((event)=>event.status==='failed'||event.status==='error').length;
    return {
      events,
      latest,
      state:failed&&latest?.status!=='ready'&&latest?.status!=='verified'?'error':(verified?'ready':'idle'),
      label:latest?label(latest.type):'No local events yet',
      detail:latest?latest.note:'Activation telemetry starts when MMIR checks defaults, proof, installs, doctor state or first chat.',
      verified,
      failed,
      autopilot
    };
  }
  function pct(done,beta,total){
    if(!total)return 0;
    return Math.round(((done||0)+(beta||0)*0.55)/total*100);
  }
  function setSummary(message,state){
    if(!summary)return;
    summary.textContent=message||'';
    summary.dataset.state=state||'idle';
  }

  async function fetchDashboard(){
    const response=await fetch(DATA_URL,{cache:'no-store'});
    if(!response.ok)throw new Error('Progress data unavailable');
    return response.json();
  }

  function chip(status){
    return '<span class="progress-status-chip status-'+safe(status||'planned')+'">'+safe(label(status||'planned'))+'</span>';
  }

  function metric(labelText,value,note){
    return '<article class="progress-tile"><span>'+safe(labelText)+'</span><strong>'+safe(value)+'</strong><small>'+safe(note||'')+'</small></article>';
  }

  function renderFirstChatReceipt(){
    const state=firstChatReceiptState();
    return '<section class="progress-receipt-card" data-state="'+safe(state.status)+'">'+
      '<div><p class="eyebrow">Activation receipt</p><h2>First chat receipt: '+safe(state.label)+'</h2><small>'+safe(state.detail)+'</small></div>'+
      '<button id="progress-first-chat-recovery" type="button">'+safe(state.action)+'</button>'+
    '</section>';
  }

  function renderActivationTelemetry(){
    const state=activationSummary();
    const events=state.events.slice(-6).reverse();
    return '<section class="progress-activation-card" data-state="'+safe(state.state)+'">'+
      '<div class="progress-activation-head"><div><p class="eyebrow">Activation telemetry</p><h2>Latest activation: '+safe(state.label)+'</h2><small>'+safe(state.detail)+'</small></div>'+
      '<div class="progress-activation-counts">'+
        '<span>'+safe(state.events.length)+' events</span>'+
        '<span>'+safe(state.verified)+' ready</span>'+
        '<span>'+safe(state.failed)+' repair</span>'+
        '<span>'+safe(state.autopilot?.runs||0)+' autopilot</span>'+
      '</div></div>'+
      '<div class="progress-activation-list">'+(events.length?events.map((event)=>
        '<article class="progress-activation-event" data-state="'+safe(event.status||'idle')+'">'+
          '<span>'+safe(label(event.type))+'</span>'+
          '<strong>'+safe(label(event.status))+'</strong>'+
          '<small>'+safe(new Date(event.at||Date.now()).toLocaleString())+' / '+safe(event.route||'local-first')+(event.model?' / '+safe(event.model):'')+'</small>'+
          '<p>'+safe(event.note||'Activation event recorded.')+'</p>'+
        '</article>'
      ).join(''):'<p class="dashboard-note">No activation events have been recorded in this browser workspace yet.</p>')+'</div>'+
      '<div class="progress-activation-actions"><button id="progress-activation-autopilot" type="button">Run autopilot</button><button id="progress-activation-refresh" type="button">Refresh activation</button><button id="progress-activation-clear" type="button">Clear local events</button></div>'+
      '<small class="progress-activation-privacy">Local only: raw_prompt_stored:false, raw_response_stored:false, secrets_stored:false.</small>'+
    '</section>';
  }

  function renderSummary(data){
    const summaryData=data.summary||{};
    return '<div class="progress-summary-grid">'+
      metric('Backlog items',summaryData.total||0,'Sequential delivery queue')+
      metric('Shipped',summaryData.done||0,'Verified for current scope')+
      metric('Beta foundations',summaryData.beta||0,'Usable, still improving')+
      metric('Next now',summaryData.next||0,'Ready for Codex work')+
      metric('Watch / blocked',(summaryData.watch||0)+(summaryData.blocked||0),'Needs external check or decision')+
    '</div>';
  }

  function renderPhases(data){
    const phases=(data.summary&&Array.isArray(data.summary.by_phase))?data.summary.by_phase:[];
    return '<section><div class="dashboard-heading"><div><p class="eyebrow">Progress by area</p><h2>Phase and workstream progress</h2></div></div>'+
      '<div class="progress-phase-grid">'+phases.map((phase)=>{
        const percent=pct(phase.done,phase.beta,phase.total);
        return '<article class="progress-phase-card"><span>'+safe(phase.phase)+'</span><h3>'+safe(percent)+'% effective progress</h3>'+
          '<div class="progress-bar" aria-label="'+safe(phase.phase)+' progress"><span class="progress-bar-fill" style="width:'+safe(percent)+'%"></span></div>'+
          '<small>'+safe(phase.done||0)+' shipped, '+safe(phase.beta||0)+' beta, '+safe(phase.next||0)+' next, '+safe(phase.planned||0)+' planned</small></article>';
      }).join('')+'</div></section>';
  }

  function renderRepos(data){
    const repos=Array.isArray(data.repos)?data.repos:[];
    const decisions=Array.isArray(data.repo_decisions)?data.repo_decisions:[];
    return '<section><div class="dashboard-heading"><div><p class="eyebrow">Repositories</p><h2>Where work lives</h2></div></div>'+
      '<div class="progress-repo-grid">'+repos.map((repo)=>
        '<article class="progress-repo-card"><span>'+safe(repo.name)+'</span><h3>'+safe(label(repo.status))+'</h3><p class="dashboard-note">'+safe(repo.purpose)+'</p><small>'+safe(repo.spend)+'</small></article>'
      ).join('')+'</div>'+
      '<div class="progress-status-row">'+decisions.map((repo)=>
        '<article class="progress-decision-card"><span>'+safe(repo.name)+'</span><h3>'+safe(repo.decision)+'</h3><small>'+safe(repo.trigger)+'</small></article>'
      ).join('')+'</div></section>';
  }

  function taskById(data,id){
    return (data.tasks||[]).find((task)=>task.seq===id);
  }

  function taskCard(task,compact){
    if(!task)return '';
    return '<article class="'+(compact?'progress-next-card':'progress-task')+'">'+
      '<div class="progress-task-head"><div><h3>'+safe(task.seq+' - '+task.work_package)+'</h3><small>'+safe(task.phase)+' / '+safe(task.priority)+' / '+safe(task.estimate)+'</small></div>'+chip(task.status)+'</div>'+
      (compact?'<small>'+safe(task.evidence)+'</small>':'<p>'+safe(task.concrete_work)+'</p><p>'+safe(task.evidence)+'</p><div class="progress-meta"><span>'+safe(task.repos)+'</span><span>'+safe(task.done_when)+'</span></div>')+
    '</article>';
  }

  function filteredTasks(data){
    const text=filterText.toLowerCase();
    return (data.tasks||[]).filter((task)=>{
      const statusOk=filterStatus==='all'||task.status===filterStatus;
      const textOk=!text||[task.seq,task.phase,task.priority,task.work_package,task.repos,task.concrete_work,task.evidence].join(' ').toLowerCase().includes(text);
      return statusOk&&textOk;
    });
  }

  function renderQueue(data){
    const next=(data.next_queue||[]).map((id)=>taskById(data,id)).filter(Boolean);
    const watch=(data.watchlist||[]).map((id)=>taskById(data,id)).filter(Boolean);
    return '<div class="progress-columns">'+
      '<section><div class="dashboard-heading"><div><p class="eyebrow">Next work</p><h2>Codex queue</h2></div></div><div class="progress-next-list">'+next.map((task)=>taskCard(task,true)).join('')+'</div></section>'+
      '<section><div class="dashboard-heading"><div><p class="eyebrow">Needs attention</p><h2>Watchlist</h2></div></div><div class="progress-next-list">'+watch.map((task)=>taskCard(task,true)).join('')+'</div></section>'+
    '</div>';
  }

  function renderTasks(data){
    const tasks=filteredTasks(data);
    return '<section><div class="dashboard-heading"><div><p class="eyebrow">Full backlog</p><h2>All delivery tasks</h2></div></div>'+
      '<div class="progress-toolbar"><input id="progress-search" type="search" placeholder="Search tasks, repos, phase..." value="'+safe(filterText)+'" />'+
      '<select id="progress-status-filter" aria-label="Filter by status">'+
        ['all','done','beta','next','watch','blocked','planned'].map((status)=>'<option value="'+status+'" '+(status===filterStatus?'selected':'')+'>'+label(status)+'</option>').join('')+
      '</select></div>'+
      '<div class="progress-list" aria-live="polite">'+(tasks.length?tasks.map((task)=>taskCard(task,false)).join(''):'<p class="dashboard-note">No tasks match this filter.</p>')+'</div></section>';
  }

  function bindFilters(){
    const search=document.getElementById('progress-search');
    const status=document.getElementById('progress-status-filter');
    if(search)search.addEventListener('input',()=>{filterText=search.value;render();});
    if(status)status.addEventListener('change',()=>{filterStatus=status.value;render();});
  }

  function openTarget(target){
    const el=document.querySelector(target);
    if(el&&'open' in el)el.open=true;
    if(el)el.scrollIntoView({block:'start',behavior:'smooth'});
  }

  function runFirstChatRecovery(){
    const state=firstChatReceiptState();
    if(state.status==='ready'){
      openTarget('#mimir-chat-runtime');
      return;
    }
    if(state.status==='error'){
      const retry=document.querySelector('#runtime-live-proof [data-proof-action="retry"]');
      if(retry){
        retry.click();
        openTarget('#mimir-chat-runtime');
        return;
      }
      window.MimirBackendProfiles?.ensureFreeLocalProfile?.();
      openTarget('#local-connector');
      return;
    }
    const start=document.getElementById('start-free-chat');
    if(start){
      start.click();
      return;
    }
    openTarget('#mimir-prompt');
  }

  function bindFirstChatReceipt(){
    document.getElementById('progress-first-chat-recovery')?.addEventListener('click',runFirstChatRecovery);
  }

  function bindActivationTelemetry(){
    document.getElementById('progress-activation-autopilot')?.addEventListener('click',()=>{
      window.MimirActivationAutopilot?.run?.('manual');
      render();
    });
    document.getElementById('progress-activation-refresh')?.addEventListener('click',render);
    document.getElementById('progress-activation-clear')?.addEventListener('click',()=>{
      window.MimirActivationTelemetry?.clear?.();
      try{localStorage.removeItem(activationEventsStorageKey());}catch(error){}
      render();
    });
  }

  function openHashDetails(){
    const id=window.location.hash?window.location.hash.slice(1):'';
    if(!id)return;
    const target=document.getElementById(id);
    if(target&&target.tagName.toLowerCase()==='details')target.open=true;
  }

  function render(){
    if(!dashboard)return;
    root.innerHTML=renderFirstChatReceipt()+renderActivationTelemetry()+renderSummary(dashboard)+renderPhases(dashboard)+renderQueue(dashboard)+renderRepos(dashboard)+renderTasks(dashboard);
    bindFirstChatReceipt();
    bindActivationTelemetry();
    bindFilters();
    openHashDetails();
  }

  async function init(){
    if(refreshButton)refreshButton.disabled=true;
    setSummary('Loading progress dashboard...','loading');
    try{
      dashboard=await fetchDashboard();
      render();
      const time=dashboard.updated_at?new Date(dashboard.updated_at).toLocaleString():'unknown time';
      setSummary('Progress data loaded. Last built '+time+'.','ready');
    }catch(error){
      root.innerHTML='<p class="dashboard-note">Progress dashboard data could not be loaded.</p>';
      setSummary('Progress data unavailable. Run the dashboard build script and deploy again.','error');
    }finally{
      if(refreshButton)refreshButton.disabled=false;
    }
  }

  if(refreshButton)refreshButton.addEventListener('click',init);
  window.addEventListener('hashchange',openHashDetails);
  window.addEventListener('mmir-first-chat-receipt-updated',render);
  window.addEventListener('mmir-activation-telemetry-updated',render);
  window.addEventListener('mmir-activation-autopilot-updated',render);
  window.addEventListener('mmir-chat-history-updated',render);
  window.addEventListener('storage',render);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
