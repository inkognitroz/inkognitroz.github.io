(function(){
  const api=window.MimirApiClient;
  const ACTIVE_WORKSPACE_KEY='mimir-active-workspace-v1';
  const DEFAULT_WORKSPACE_ID='personal';
  const RESEARCH_PREFIX='mimir-research-plans-v1:';
  const host=document.querySelector('#multi-model-workspace .mimir-dashboard');
  let questionEl=null;
  let depthEl=null;
  let sourceTitleEl=null;
  let sourceUrlEl=null;
  let sourceNoteEl=null;
  let consentEl=null;
  let autonomousEl=null;
  let statusEl=null;
  let sourceListEl=null;
  let outputEl=null;
  let savedEl=null;
  let sources=[];
  let lastPlan=null;

  if(!host)return;

  function workspaceId(){return localStorage.getItem(ACTIVE_WORKSPACE_KEY)||DEFAULT_WORKSPACE_ID;}
  function storageKey(){return RESEARCH_PREFIX+workspaceId();}
  function clean(value,max=1000){return String(value||'').replace(/\s+/g,' ').trim().slice(0,max);}
  function safe(value){return String(value||'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));}
  function setStatus(message,state){if(statusEl){statusEl.textContent=message||'';statusEl.dataset.state=state||'idle';}}
  function activeConnection(){
    if(!api)return null;
    const profile=api.activeProfile();
    const url=api.cleanUrl(profile?.url);
    if(!profile||!url)return null;
    return {profile,url};
  }
  function safeUrl(value){
    try{
      const url=new URL(String(value||''));
      if(url.protocol!=='http:'&&url.protocol!=='https:')return '';
      url.username='';
      url.password='';
      return url.toString();
    }catch(error){return '';}
  }
  function manualSearchUrls(query){
    const encoded=encodeURIComponent(query);
    return [
      {provider:'duckduckgo',label:'DuckDuckGo',url:'https://duckduckgo.com/?q='+encoded},
      {provider:'brave',label:'Brave Search',url:'https://search.brave.com/search?q='+encoded},
      {provider:'startpage',label:'Startpage',url:'https://www.startpage.com/sp/search?query='+encoded}
    ];
  }
  function readPlans(){
    try{
      const value=JSON.parse(localStorage.getItem(storageKey())||'[]');
      return Array.isArray(value)?value:[];
    }catch(error){return [];}
  }
  function writePlans(plans){
    localStorage.setItem(storageKey(),JSON.stringify(plans.slice(-12)));
    window.dispatchEvent(new CustomEvent('mmir-research-plans-updated',{detail:{workspaceId:workspaceId(),count:plans.length}}));
  }
  async function request(path,options={}){
    const connection=activeConnection();
    if(!connection)throw new Error('Activate a backend profile first.');
    const token=await api.pairIfNeeded(connection.profile,connection.url);
    return api.fetchJson(api.joinUrl(connection.url,path),{
      ...options,
      headers:{...api.authHeaders(token),...(options.headers||{})}
    });
  }
  function normalizeSources(items){
    return (Array.isArray(items)?items:[]).map((source,index)=>{
      const url=safeUrl(source?.url);
      const note=clean(source?.note||source?.snippet,600);
      if(!url&&!note)return null;
      return {
        id:clean(source?.id,80)||'source-'+String(index+1),
        title:clean(source?.title||url||('Source '+String(index+1)),180),
        url,
        note,
        status:url?'candidate':'needs-url',
        citation_label:'[S'+String(index+1)+']'
      };
    }).filter(Boolean).slice(0,8);
  }
  function gate(id,status,label,detail){
    return {id,status,label,detail};
  }
  function localPlan(payload){
    const query=clean(payload.query,500);
    const depth=payload.depth||'standard';
    const normalized=normalizeSources(payload.sources);
    const hasSources=normalized.length>0;
    const steps=[
      {order:1,id:'scope',title:'Frame the research question',action:'Rewrite the question into objective, assumptions and decision criteria.',tool:'none',approval_required:false},
      {order:2,id:'collect-sources',title:hasSources?'Review selected sources':'Collect candidate sources',action:hasSources?'Use selected sources until browsing is approved.':'Open manual free search links or a protected route only after approval.',tool:hasSources?'knowledge.search':'web.search',approval_required:!hasSources},
      {order:3,id:'source-quality',title:'Score source quality',action:'Rank by recency, primary-source quality, relevance and bias.',tool:'none',approval_required:false},
      {order:4,id:'synthesize',title:'Synthesize answer',action:'Separate verified facts, uncertainty and recommended next actions.',tool:'model',approval_required:false},
      {order:5,id:'cite-claims',title:'Attach citations',action:'Every factual claim cites a source label or is marked as inference.',tool:'none',approval_required:false}
    ];
    if(depth==='deep')steps.splice(3,0,{order:4,id:'counter-evidence',title:'Look for counter-evidence',action:'Search for disagreement and contrary primary sources before synthesis.',tool:'web.search',approval_required:true});
    steps.forEach((step,index)=>{step.order=index+1;});
    return {
      object:'research.plan',
      id:'local-research-'+String(Date.now()),
      workspace_id:workspaceId(),
      query,
      depth,
      status:'planned',
      mode:'planning-only',
      execution_allowed:false,
      autonomous_browsing_requested:payload.allow_autonomous_browsing===true,
      autonomous_browsing_allowed:false,
      approval_required:true,
      revocation_supported:true,
      public_frontend_secrets_allowed:false,
      sources:normalized,
      citations:normalized.map(source=>({label:source.citation_label,source_id:source.id,title:source.title,url:source.url,status:source.status})),
      search_urls:manualSearchUrls(query),
      steps,
      approval_gates:[
        gate('consent','passed','Explicit planning consent','The user approved creating this research plan.'),
        gate('cost','passed','Free-first route','No paid provider or cloud compute is started.'),
        gate('frontend-secrets','passed','No public frontend secrets','Provider keys and private tokens stay outside GitHub Pages.'),
        gate('browsing-approval','pending','Autonomous browsing approval','Autonomous browsing remains blocked until this specific plan is approved in a protected worker.'),
        gate('citation-policy',hasSources?'passed':'pending','Citation requirement',hasSources?'Candidate citation labels are ready.':'Add or collect sources before factual synthesis.')
      ],
      policy:{
        hidden_browsing:false,
        automatic_execution:false,
        paid_routes_allowed:false,
        public_frontend_secrets_allowed:false,
        citation_rule:'Every factual claim must cite a source label or be marked as inference.'
      },
      next_actions:['Review the plan.','Add trusted sources or run explicit search.','Approve a protected worker before autonomous browsing.'],
      created_at:new Date().toISOString()
    };
  }
  function addSource(){
    const title=clean(sourceTitleEl?.value,180);
    const url=safeUrl(sourceUrlEl?.value);
    const note=clean(sourceNoteEl?.value,600);
    if(!title&&!url&&!note){setStatus('Add a source title, URL or note first.','error');return;}
    if(sourceUrlEl?.value&&!url){setStatus('Source URL must be http(s).','error');return;}
    sources=normalizeSources(sources.concat({title:title||url||'Manual source',url,note}));
    if(sourceTitleEl)sourceTitleEl.value='';
    if(sourceUrlEl)sourceUrlEl.value='';
    if(sourceNoteEl)sourceNoteEl.value='';
    renderSources();
    setStatus('Source added to the plan.','ready');
  }
  function clearSources(){
    sources=[];
    renderSources();
    setStatus('Sources cleared.','ready');
  }
  function renderSources(){
    if(!sourceListEl)return;
    if(!sources.length){
      sourceListEl.innerHTML='<p class="dashboard-note">No sources yet. Research can still create manual free search links.</p>';
      return;
    }
    sourceListEl.innerHTML=sources.map((source,index)=>''+
      '<article class="research-source">'+
        '<strong>'+safe(source.citation_label)+' '+safe(source.title)+'</strong>'+
        '<span>'+safe(source.url||'Source note only')+'</span>'+
        '<small>'+safe(source.note||'No note')+'</small>'+
        '<button type="button" data-research-source-remove="'+String(index)+'">Remove</button>'+
      '</article>').join('');
    sourceListEl.querySelectorAll('[data-research-source-remove]').forEach(button=>{
      button.addEventListener('click',()=>{
        const index=Number(button.dataset.researchSourceRemove);
        sources=sources.filter((item,itemIndex)=>itemIndex!==index);
        renderSources();
      });
    });
  }
  function statusClass(status){return status==='passed'?'is-passed':(status==='blocked'?'is-blocked':'is-pending');}
  function renderLinks(urls){
    return '<div class="research-link-grid">'+(urls||[]).map(item=>'<a href="'+safe(item.url)+'" target="_blank" rel="noopener noreferrer">'+safe(item.label||item.provider||'Open source search')+'</a>').join('')+'</div>';
  }
  function renderPlan(plan){
    if(!outputEl)return;
    lastPlan=plan;
    const gates=(plan.approval_gates||[]).map(gateItem=>''+
      '<article class="research-gate '+statusClass(gateItem.status)+'">'+
        '<strong>'+safe(gateItem.label)+'</strong>'+
        '<span>'+safe(gateItem.status)+'</span>'+
        '<small>'+safe(gateItem.detail)+'</small>'+
      '</article>').join('');
    const steps=(plan.steps||[]).map(step=>''+
      '<li><strong>'+safe(String(step.order))+'. '+safe(step.title)+'</strong><span>'+safe(step.action)+'</span><small>'+safe(step.tool)+(step.approval_required?' · approval required':'')+'</small></li>').join('');
    const citations=(plan.citations||[]).length?(plan.citations||[]).map(citation=>''+
      '<li><strong>'+safe(citation.label)+'</strong><span>'+safe(citation.title)+'</span><small>'+safe(citation.url||citation.status)+'</small></li>').join(''):'<li><span>No citations yet. Add sources or run explicit search first.</span></li>';
    outputEl.innerHTML=''+
      '<article class="research-plan-card">'+
        '<header><div><strong>'+safe(plan.query)+'</strong><span>'+safe(plan.depth)+' · '+safe(plan.mode)+'</span></div><span>'+safe(plan.status)+'</span></header>'+
        '<div class="research-gate-grid">'+gates+'</div>'+
        '<div class="research-plan-columns">'+
          '<section><h3>Steps</h3><ol class="research-step-list">'+steps+'</ol></section>'+
          '<section><h3>Citations</h3><ul class="research-citation-list">'+citations+'</ul>'+renderLinks(plan.search_urls||[])+'</section>'+
        '</div>'+
        '<div class="workflow-builder-actions">'+
          '<button id="research-send-chat" type="button">Send plan to chat</button>'+
          '<button id="research-save-plan" type="button">Save plan</button>'+
        '</div>'+
      '</article>';
    document.getElementById('research-send-chat')?.addEventListener('click',sendPlanToChat);
    document.getElementById('research-save-plan')?.addEventListener('click',savePlan);
  }
  function renderSaved(){
    if(!savedEl)return;
    const plans=readPlans().slice(-4).reverse();
    if(!plans.length){
      savedEl.innerHTML='<p class="dashboard-note">No saved research plans yet.</p>';
      return;
    }
    savedEl.innerHTML=plans.map(plan=>''+
      '<article class="research-saved-plan">'+
        '<strong>'+safe(plan.query)+'</strong>'+
        '<span>'+safe(plan.depth)+' · '+safe(plan.created_at||'saved')+'</span>'+
      '</article>').join('');
  }
  function savePlan(){
    if(!lastPlan){setStatus('Create a plan first.','error');return;}
    const plans=readPlans().filter(plan=>plan.id!==lastPlan.id);
    plans.push(lastPlan);
    writePlans(plans);
    renderSaved();
    setStatus('Research plan saved locally.','ready');
  }
  function sendPlanToChat(){
    if(!lastPlan){setStatus('Create a plan first.','error');return;}
    const prompt=document.getElementById('mimir-prompt');
    if(!prompt){setStatus('Chat composer is not ready.','error');return;}
    const steps=(lastPlan.steps||[]).map(step=>String(step.order)+'. '+step.title+': '+step.action).join('\n');
    const citations=(lastPlan.citations||[]).map(citation=>citation.label+' '+citation.title+' '+(citation.url||'')).join('\n');
    prompt.value='Use this MMIR research plan. Do not browse unless I approve the plan gates. Answer with citations or mark inference.\n\nQuestion: '+lastPlan.query+'\n\nSteps:\n'+steps+'\n\nCandidate citations:\n'+(citations||'No sources yet.');
    prompt.dispatchEvent(new Event('input',{bubbles:true}));
    prompt.focus();
    setStatus('Research plan sent to chat composer.','ready');
  }
  async function createPlan(){
    const query=clean(questionEl?.value,500);
    if(!query){setStatus('Write a research question first.','error');return;}
    if(consentEl?.checked!==true){setStatus('Confirm research planning consent first.','error');return;}
    const payload={
      workspace_id:workspaceId(),
      query,
      depth:depthEl?.value||'standard',
      consent:true,
      allow_autonomous_browsing:autonomousEl?.checked===true,
      sources
    };
    setStatus('Creating research plan...','loading');
    try{
      const plan=activeConnection()?await request('/research/plans',{method:'POST',timeoutMs:12000,body:JSON.stringify(payload)}):localPlan(payload);
      renderPlan(plan);
      setStatus(activeConnection()?'Protected research plan ready.':'Local research plan ready.','ready');
    }catch(error){
      const plan=localPlan(payload);
      renderPlan(plan);
      setStatus((api?.friendlyError?api.friendlyError(error):'Backend unavailable.')+' Local plan is ready.','ready');
    }
  }
  function install(){
    if(document.getElementById('research-planner-panel'))return;
    const details=document.createElement('details');
    details.id='research-planner-panel';
    details.className='model-catalog-hint research-planner-panel';
    details.innerHTML=''+
      '<summary>+ Research</summary>'+
      '<div class="research-planner-body">'+
        '<div class="research-planner-head"><strong>Agentic research plan</strong><span>Planning only. No hidden browsing, no paid route, no public frontend secrets.</span></div>'+
        '<label for="research-question">Question<textarea id="research-question" rows="3" maxlength="500" placeholder="What should we verify, compare or decide?"></textarea></label>'+
        '<div class="workflow-builder-row">'+
          '<label for="research-depth">Depth<select id="research-depth"><option value="quick">Quick</option><option value="standard" selected>Standard</option><option value="deep">Deep</option></select></label>'+
          '<label class="memory-consent"><input id="research-autonomous" type="checkbox" /> Request autonomous browsing later</label>'+
        '</div>'+
        '<div class="research-source-form">'+
          '<label for="research-source-title">Source title<input id="research-source-title" type="text" maxlength="180" /></label>'+
          '<label for="research-source-url">Source URL<input id="research-source-url" type="url" maxlength="500" /></label>'+
          '<label for="research-source-note">Source note<textarea id="research-source-note" rows="2" maxlength="600"></textarea></label>'+
        '</div>'+
        '<div class="workflow-builder-actions">'+
          '<button id="research-add-source" type="button">Add source</button>'+
          '<button id="research-clear-sources" type="button">Clear sources</button>'+
        '</div>'+
        '<div id="research-source-list" class="research-source-list" aria-live="polite"></div>'+
        '<label class="memory-consent"><input id="research-consent" type="checkbox" /> I approve creating this research plan for the active workspace.</label>'+
        '<div class="workflow-builder-actions">'+
          '<button id="research-create-plan" type="button">Create plan</button>'+
        '</div>'+
        '<div id="research-plan-output" class="research-plan-output" aria-live="polite"></div>'+
        '<div class="research-saved-head"><strong>Saved plans</strong><span>Browser-local per workspace</span></div>'+
        '<div id="research-saved-list" class="research-saved-list" aria-live="polite"></div>'+
        '<p id="research-status" class="dashboard-note" data-state="idle" aria-live="polite"></p>'+
      '</div>';
    host.appendChild(details);
    questionEl=document.getElementById('research-question');
    depthEl=document.getElementById('research-depth');
    sourceTitleEl=document.getElementById('research-source-title');
    sourceUrlEl=document.getElementById('research-source-url');
    sourceNoteEl=document.getElementById('research-source-note');
    consentEl=document.getElementById('research-consent');
    autonomousEl=document.getElementById('research-autonomous');
    statusEl=document.getElementById('research-status');
    sourceListEl=document.getElementById('research-source-list');
    outputEl=document.getElementById('research-plan-output');
    savedEl=document.getElementById('research-saved-list');
    document.getElementById('research-add-source')?.addEventListener('click',addSource);
    document.getElementById('research-clear-sources')?.addEventListener('click',clearSources);
    document.getElementById('research-create-plan')?.addEventListener('click',createPlan);
    renderSources();
    renderSaved();
  }

  window.addEventListener('mmir-workspace-changed',()=>{sources=[];lastPlan=null;renderSources();renderSaved();setStatus('');});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
