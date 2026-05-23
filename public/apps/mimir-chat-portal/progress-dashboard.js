(function(){
  const root=document.getElementById('progress-dashboard-root');
  const refreshButton=document.getElementById('refresh-progress-dashboard');
  const summary=document.getElementById('progress-dashboard-summary');
  const DATA_URL='./progress-dashboard.json';
  const WORKSPACE_KEY='mimir-active-workspace-v1';
  const DEFAULT_WORKSPACE_ID='personal';
  const FIRST_CHAT_RECEIPT_PREFIX='mimir-first-chat-receipt-v1:';
  let dashboard=null;
  let filterStatus='all';
  let filterText='';

  if(!root)return;

  function safe(value){return String(value||'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');}
  function label(value){return String(value||'unknown').replaceAll('-', ' ');}
  function pct(done,beta,total){
    if(!total)return 0;
    return Math.round(((done||0)+(beta||0)*0.55)/total*100);
  }
  function setSummary(message,state){
    if(!summary)return;
    summary.textContent=message||'';
    summary.dataset.state=state||'idle';
  }
  function activeWorkspaceId(){return localStorage.getItem(WORKSPACE_KEY)||DEFAULT_WORKSPACE_ID;}
  function readFirstChatReceipt(){
    try{
      const value=JSON.parse(localStorage.getItem(FIRST_CHAT_RECEIPT_PREFIX+activeWorkspaceId())||'null');
      return value&&typeof value==='object'?value:null;
    }catch(error){
      return null;
    }
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

  function renderFirstChatEvidence(){
    const receipt=readFirstChatReceipt();
    const ok=receipt?.status==='success';
    const failed=receipt?.status==='failed';
    const value=ok?'Succeeded':failed?'Needs repair':'Missing';
    const note=ok?
      String(receipt.model||'model')+' via '+String(receipt.route||'route')+'; no raw prompt stored.':
      failed?'Last verified chat failed; retry proof or repair the local route.':
      'No verified first-chat receipt in this workspace yet.';
    const status=ok?'done':failed?'blocked':'watch';
    return '<section><div class="dashboard-heading"><div><p class="eyebrow">Activation evidence</p><h2>First-chat recovery</h2></div>'+chip(status)+'</div>'+
      '<div class="progress-summary-grid">'+
        metric('Verified first chat',value,note)+
        metric('Privacy','No raw prompt','Receipt stores model, route, counts and status only')+
        metric('Workspace',activeWorkspaceId(),receipt?.at?('Last update '+receipt.at):'Waiting for first verified answer')+
      '</div>'+
      '<div class="progress-status-row">'+
        '<button type="button" data-first-chat-repair="retry-proof">Retry proof</button>'+
        '<button type="button" data-first-chat-repair="connect-local">Connect local</button>'+
        '<button type="button" data-first-chat-repair="open-chat">Open chat</button>'+
      '</div></section>';
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

  function bindFirstChatRepair(){
    root.querySelectorAll('[data-first-chat-repair]').forEach(button=>{
      button.addEventListener('click',()=>{
        const action=button.getAttribute('data-first-chat-repair')||'open-chat';
        if(action==='connect-local')window.MimirBackendProfiles?.ensureFreeLocalProfile?.();
        const target=action==='connect-local'?'#local-connector':action==='retry-proof'?'#mimir-chat-runtime':'#mimir-prompt';
        const el=document.querySelector(target);
        if(el&&'open' in el)el.open=true;
        if(el)el.scrollIntoView({block:'start',behavior:'smooth'});
        if(action==='retry-proof'){
          (document.querySelector('[data-proof-action="retry"]')||document.getElementById('runtime-refresh'))?.click();
        }
      });
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
    root.innerHTML=renderSummary(dashboard)+renderFirstChatEvidence()+renderPhases(dashboard)+renderQueue(dashboard)+renderRepos(dashboard)+renderTasks(dashboard);
    bindFilters();
    bindFirstChatRepair();
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
  window.addEventListener('storage',render);
  window.addEventListener('focus',render);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
