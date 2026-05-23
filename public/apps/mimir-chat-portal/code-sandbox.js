(function(){
  const api=window.MimirApiClient;
  const ACTIVE_WORKSPACE_KEY='mimir-active-workspace-v1';
  const DEFAULT_WORKSPACE_ID='personal';
  const host=document.querySelector('#multi-model-workspace .mimir-dashboard');
  let taskEl=null;
  let languageEl=null;
  let codeEl=null;
  let fileEl=null;
  let consentEl=null;
  let localOnlyEl=null;
  let statusEl=null;
  let outputEl=null;

  if(!host)return;

  const supportedLanguages=['python','javascript','sql','r','markdown'];
  const localLimits={max_runtime_seconds:30,max_memory_mb:512,max_code_chars:20000,max_files:8,max_file_bytes:5242880};
  const riskRules=[
    {id:'network_access_detected',severity:'block',gate:'network',pattern:/(https?:\/\/|fetch\s*\(|XMLHttpRequest|requests\.|urllib|curl\s+|wget\s+|socket|net\.)/i,message:'Network access is blocked for the default sandbox.'},
    {id:'shell_or_process_access_detected',severity:'block',gate:'process',pattern:/(child_process|subprocess|os\.system|spawn\s*\(|Start-Process|powershell|cmd\.exe|bash\s+-c)/i,message:'Shell and process execution are blocked.'},
    {id:'package_install_detected',severity:'block',gate:'packages',pattern:/(pip\s+install|npm\s+install|yarn\s+add|pnpm\s+add|apt-get|brew\s+install|docker\s+run)/i,message:'Package install is blocked during a user run.'},
    {id:'secret_like_value_detected',severity:'block',gate:'secrets',pattern:/(api[_-]?key|secret|password|bearer\s+[a-z0-9._-]{10,})/i,message:'Secret-like values must be removed first.'},
    {id:'broad_filesystem_access_detected',severity:'review',gate:'filesystem',pattern:/(\.\.\/|~\/|[a-z]:\\|\/etc\/|\/var\/|\/home\/|\/users\/|readFile|writeFile|open\s*\([^)]*['"][wa]\b)/i,message:'File access needs a workspace-only mount.'},
    {id:'dynamic_code_execution_detected',severity:'review',gate:'dynamic-code',pattern:/(eval\s*\(|new Function\s*\(|compile\s*\(|exec\s*\()/i,message:'Dynamic evaluation needs stricter review.'}
  ];

  function workspaceId(){return localStorage.getItem(ACTIVE_WORKSPACE_KEY)||DEFAULT_WORKSPACE_ID;}
  function clean(value,max=1000){return String(value||'').replace(/\s+/g,' ').trim().slice(0,max);}
  function text(value,max=20000){return String(value||'').replace(/\u0000/g,'').slice(0,max);}
  function setStatus(message,state){if(statusEl){statusEl.textContent=message||'';statusEl.dataset.state=state||'idle';}}
  function activeConnection(){
    if(!api)return null;
    const profile=api.activeProfile();
    const url=api.cleanUrl(profile?.url);
    if(!profile||!url)return null;
    return {profile,url};
  }
  async function request(path,options={}){
    const connection=activeConnection();
    if(!connection)throw new Error('No protected backend profile is active.');
    const token=await api.pairIfNeeded(connection.profile,connection.url);
    return api.fetchJson(api.joinUrl(connection.url,path),{
      ...options,
      headers:{...api.authHeaders(token),...(options.headers||{})}
    });
  }
  function selectedOutputs(){
    return Array.from(document.querySelectorAll('[data-code-output]:checked')).map(input=>input.value);
  }
  function fileManifest(){
    return Array.from(fileEl?.files||[]).map(file=>({
      name:file.name,
      type:file.type||'application/octet-stream',
      size_bytes:file.size
    }));
  }
  function payload(){
    return {
      workspace_id:workspaceId(),
      task:clean(taskEl?.value,1000),
      language:languageEl?.value||'python',
      code:text(codeEl?.value,localLimits.max_code_chars),
      consent:consentEl?.checked===true,
      allow_network:localOnlyEl?.checked!==true,
      max_runtime_seconds:localLimits.max_runtime_seconds,
      max_memory_mb:localLimits.max_memory_mb,
      requested_outputs:selectedOutputs(),
      files:fileManifest()
    };
  }
  function issueList(input){
    const issues=[];
    if(!supportedLanguages.includes(input.language))issues.push({id:'unsupported_language',severity:'block',gate:'language',message:'Unsupported language for the first sandbox policy.'});
    if(input.allow_network)issues.push({id:'network_requested',severity:'block',gate:'network',message:'Network access requires a separate reviewed policy.'});
    if(input.files.length>localLimits.max_files)issues.push({id:'file_count_limit_exceeded',severity:'block',gate:'files',message:'Too many files for one sandbox plan.'});
    input.files.forEach(file=>{if(file.size_bytes>localLimits.max_file_bytes)issues.push({id:'file_size_limit_exceeded',severity:'block',gate:'files',message:file.name+' is too large.'});});
    riskRules.forEach(rule=>{if(rule.pattern.test(input.code))issues.push({id:rule.id,severity:rule.severity,gate:rule.gate,message:rule.message});});
    return issues;
  }
  function gate(id,label,issues){
    const matches=issues.filter(issue=>issue.gate===id);
    const blocked=matches.some(issue=>issue.severity==='block');
    const review=matches.some(issue=>issue.severity==='review');
    return {id,label,status:blocked?'blocked':review?'needs_review':'passed',detail:matches.length?matches.map(issue=>issue.message).join(' '):(label+' passed.')};
  }
  function localPlan(input){
    if(!input.consent)return {error:'Confirm sandbox planning consent first.'};
    if(!input.task)return {error:'Describe the task first.'};
    const issues=issueList(input);
    const status=issues.some(issue=>issue.severity==='block')?'blocked':issues.some(issue=>issue.severity==='review')?'needs_review':'ready_for_local_sandbox';
    return {
      object:'code.sandbox_plan',
      status,
      execution_allowed:false,
      route:status==='blocked'?'not-approved':'local-node-sandbox-required',
      workspace_id:input.workspace_id,
      language:input.language,
      task:input.task,
      requested_outputs:input.requested_outputs.length?input.requested_outputs:['report'],
      file_manifest:input.files.slice(0,localLimits.max_files),
      limits:{
        max_runtime_seconds:localLimits.max_runtime_seconds,
        requested_runtime_seconds:localLimits.max_runtime_seconds,
        max_memory_mb:localLimits.max_memory_mb,
        requested_memory_mb:localLimits.max_memory_mb,
        max_code_chars:localLimits.max_code_chars,
        received_code_chars:input.code.length,
        max_files:localLimits.max_files,
        max_file_bytes:localLimits.max_file_bytes
      },
      gates:[
        {id:'consent',label:'Explicit consent',status:'passed',detail:'Consent is present for planning.'},
        gate('language','Supported language',issues),
        gate('network','No network access',issues),
        gate('secrets','No secrets',issues),
        gate('process','No shell/process execution',issues),
        gate('packages','No runtime package install',issues),
        gate('filesystem','Workspace-only files',issues),
        gate('dynamic-code','No dynamic code execution',issues),
        gate('files','Bounded files',issues)
      ],
      issues,
      next_actions:status==='blocked'?[
        'Remove blocked operations and plan again.',
        'Keep files local to the selected workspace.',
        'Use a paired local sandbox before execution is enabled.'
      ]:[
        'Route execution to a future MMIR Local Node sandbox.',
        'Keep network disabled and mount only selected files.',
        'Return outputs as tables, charts, reports or files with trace.'
      ],
      policy:{public_frontend_execution_allowed:false,managed_api_execution_allowed:false,sandbox_required:true,network_default:'disabled',estimated_cost_usd:0}
    };
  }
  function renderPolicy(policy,source){
    outputEl.innerHTML='';
    const article=document.createElement('article');
    article.className='code-sandbox-result';
    article.innerHTML='<h3>Sandbox policy</h3><p>'+clean(source,120)+'</p>'+
      '<div class="code-policy-grid">'+
        '<span>Execution</span><strong>'+(policy.execution_enabled?'enabled':'disabled')+'</strong>'+
        '<span>Languages</span><strong>'+((policy.supported_languages||supportedLanguages).join(', '))+'</strong>'+
        '<span>Cost</span><strong>0 USD by default</strong>'+
        '<span>Network</span><strong>off by default</strong>'+
      '</div>';
    outputEl.appendChild(article);
  }
  function renderPlan(plan,source){
    outputEl.innerHTML='';
    const article=document.createElement('article');
    article.className='code-sandbox-result';
    const status=document.createElement('h3');
    status.textContent='Sandbox plan - '+plan.status;
    article.appendChild(status);
    const meta=document.createElement('p');
    meta.textContent=source+' Route: '+plan.route+'. Execution allowed: '+String(plan.execution_allowed)+'.';
    article.appendChild(meta);
    const gates=document.createElement('div');
    gates.className='code-gate-grid';
    (plan.gates||[]).forEach(item=>{
      const cell=document.createElement('div');
      cell.className='code-gate';
      cell.dataset.state=item.status;
      cell.innerHTML='<span>'+clean(item.label,80)+'</span><strong>'+clean(item.status,40)+'</strong><small>'+clean(item.detail,220)+'</small>';
      gates.appendChild(cell);
    });
    article.appendChild(gates);
    const actions=document.createElement('ol');
    actions.className='code-next-actions';
    (plan.next_actions||[]).forEach(action=>{
      const li=document.createElement('li');
      li.textContent=action;
      actions.appendChild(li);
    });
    article.appendChild(actions);
    outputEl.appendChild(article);
  }
  async function loadPolicy(){
    setStatus('Checking sandbox policy...','loading');
    try{
      if(activeConnection()){
        const policy=await request('/code/sandbox/policy',{method:'GET',timeoutMs:8000});
        renderPolicy(policy,'Protected backend policy.');
        setStatus('Sandbox policy loaded from active backend.','ready');
        return;
      }
      renderPolicy({execution_enabled:false,supported_languages:supportedLanguages},'Browser preflight fallback.');
      setStatus('No backend active. Showing local browser preflight policy.','ready');
    }catch(error){
      renderPolicy({execution_enabled:false,supported_languages:supportedLanguages},'Browser preflight fallback.');
      setStatus(api?.friendlyError?api.friendlyError(error):error.message,'error');
    }
  }
  async function planRun(){
    const input=payload();
    setStatus('Planning safe sandbox route...','loading');
    try{
      if(activeConnection()){
        const plan=await request('/code/sandbox/plan',{method:'POST',timeoutMs:12000,body:JSON.stringify(input)});
        renderPlan(plan,'Protected backend preflight.');
        setStatus('Sandbox plan ready. No code was executed.','ready');
        return;
      }
      const plan=localPlan(input);
      if(plan.error){setStatus(plan.error,'error');return;}
      renderPlan(plan,'Browser preflight fallback.');
      setStatus('Local sandbox plan ready. No code was executed.','ready');
    }catch(error){
      setStatus(api?.friendlyError?api.friendlyError(error):error.message,'error');
    }
  }
  function sendPlanToChat(){
    const prompt=document.getElementById('mimir-prompt');
    if(!prompt)return;
    prompt.value='Plan the safest free MMIR code interpreter route for this task: '+clean(taskEl?.value,500);
    prompt.dispatchEvent(new Event('input',{bubbles:true}));
    prompt.focus();
    setStatus('Plan copied into chat composer.','ready');
  }
  function install(){
    if(document.getElementById('code-sandbox-panel'))return;
    const details=document.createElement('details');
    details.id='code-sandbox-panel';
    details.className='model-catalog-hint code-sandbox-panel';
    details.innerHTML=''+
      '<summary>+ Code Interpreter</summary>'+
      '<div class="code-sandbox-body">'+
        '<div class="workflow-builder-row">'+
          '<label for="code-sandbox-language">Language<select id="code-sandbox-language"><option value="python">Python</option><option value="javascript">JavaScript</option><option value="sql">SQL</option><option value="r">R</option><option value="markdown">Markdown</option></select></label>'+
          '<label for="code-sandbox-files">Files<input id="code-sandbox-files" type="file" multiple /></label>'+
        '</div>'+
        '<label for="code-sandbox-task">Task<textarea id="code-sandbox-task" rows="2" maxlength="1000" placeholder="Summarize this CSV, make a chart, or inspect a small script"></textarea></label>'+
        '<label for="code-sandbox-code">Code or notes<textarea id="code-sandbox-code" rows="5" maxlength="20000" placeholder="Optional code. MMIR plans the route but does not execute from the public page."></textarea></label>'+
        '<div class="code-output-row">'+
          '<label><input data-code-output type="checkbox" value="report" checked /> Report</label>'+
          '<label><input data-code-output type="checkbox" value="table" /> Table</label>'+
          '<label><input data-code-output type="checkbox" value="chart" /> Chart</label>'+
          '<label><input data-code-output type="checkbox" value="file" /> File</label>'+
        '</div>'+
        '<label class="memory-consent"><input id="code-sandbox-local-only" type="checkbox" checked /> Local-only: no network, no paid compute, no provider secrets.</label>'+
        '<label class="memory-consent"><input id="code-sandbox-consent" type="checkbox" /> I approve planning this sandbox route for the active workspace.</label>'+
        '<div class="workflow-builder-actions">'+
          '<button id="code-sandbox-policy" type="button">Check policy</button>'+
          '<button id="code-sandbox-plan" type="button">Plan safe run</button>'+
          '<button id="code-sandbox-send" type="button">Send to chat</button>'+
        '</div>'+
        '<p id="code-sandbox-status" class="dashboard-note" data-state="idle" aria-live="polite"></p>'+
        '<div id="code-sandbox-output" class="code-sandbox-output" aria-live="polite"></div>'+
      '</div>';
    host.appendChild(details);
    taskEl=document.getElementById('code-sandbox-task');
    languageEl=document.getElementById('code-sandbox-language');
    codeEl=document.getElementById('code-sandbox-code');
    fileEl=document.getElementById('code-sandbox-files');
    consentEl=document.getElementById('code-sandbox-consent');
    localOnlyEl=document.getElementById('code-sandbox-local-only');
    statusEl=document.getElementById('code-sandbox-status');
    outputEl=document.getElementById('code-sandbox-output');
    document.getElementById('code-sandbox-policy')?.addEventListener('click',loadPolicy);
    document.getElementById('code-sandbox-plan')?.addEventListener('click',planRun);
    document.getElementById('code-sandbox-send')?.addEventListener('click',sendPlanToChat);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
