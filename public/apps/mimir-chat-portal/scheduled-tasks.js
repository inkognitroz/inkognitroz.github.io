(function(){
  const WORKSPACE_KEY='mimir-active-workspace-v1';
  const DEFAULT_WORKSPACE_ID='personal';
  const STORAGE_PREFIX='mimir-scheduled-tasks-v1:';
  const root=document.getElementById('scheduled-tasks-root');
  let timer=null;

  if(!root)return;

  function workspaceId(){return localStorage.getItem(WORKSPACE_KEY)||DEFAULT_WORKSPACE_ID;}
  function storageKey(){return STORAGE_PREFIX+workspaceId();}
  function nowIso(){return new Date().toISOString();}
  function uid(){return 'task-'+String(Date.now())+'-'+String(Math.random()).slice(2,6);}
  function safe(value){return String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));}
  function setStatus(message,state){const el=document.getElementById('scheduled-task-status');if(el){el.textContent=message||'';el.dataset.state=state||'idle';}}
  function readTasks(){
    try{
      const value=JSON.parse(localStorage.getItem(storageKey())||'[]');
      return Array.isArray(value)?value:[];
    }catch(error){
      return [];
    }
  }
  function writeTasks(tasks){
    localStorage.setItem(storageKey(),JSON.stringify(tasks));
    window.dispatchEvent(new CustomEvent('mmir-scheduled-tasks-updated',{detail:{workspaceId:workspaceId(),count:tasks.length}}));
  }
  function localDatetime(date=new Date(Date.now()+60*60*1000)){
    const offset=date.getTimezoneOffset()*60000;
    return new Date(date.getTime()-offset).toISOString().slice(0,16);
  }
  function fromLocalDatetime(value){
    const date=new Date(String(value||''));
    return Number.isNaN(date.getTime())?new Date(Date.now()+60*60*1000):date;
  }
  function nextDue(currentIso,schedule){
    const current=new Date(currentIso||Date.now());
    if(schedule==='once')return '';
    const next=new Date(current);
    if(schedule==='hourly')next.setHours(next.getHours()+1);
    else if(schedule==='daily')next.setDate(next.getDate()+1);
    else if(schedule==='weekly')next.setDate(next.getDate()+7);
    else return '';
    return next.toISOString();
  }
  function formatWhen(value){
    if(!value)return 'not scheduled';
    const date=new Date(value);
    if(Number.isNaN(date.getTime()))return 'invalid date';
    return date.toLocaleString([], { dateStyle:'medium', timeStyle:'short' });
  }
  function defaultPrompt(type){
    if(type==='health-check')return 'Check MMIR local node, model availability, privacy mode and next best repair action. Keep it free and local-first.';
    if(type==='progress-review')return 'Review MMIR progress and tell me the highest-leverage next implementation task. Keep the answer concrete.';
    if(type==='research-plan')return 'Create a safe research plan with sources, approval gates and no autonomous browsing until approved.';
    if(type==='workflow-run')return 'Plan the next MMIR workflow run. Do not execute tools or paid routes without explicit approval.';
    return 'Remind me to continue this MMIR task and suggest the next useful action.';
  }
  function taskFromForm(){
    const type=String(document.getElementById('scheduled-task-type')?.value||'reminder');
    const due=fromLocalDatetime(document.getElementById('scheduled-task-due')?.value).toISOString();
    return {
      id:uid(),
      title:String(document.getElementById('scheduled-task-title')?.value||'MMIR follow-up').trim()||'MMIR follow-up',
      type,
      schedule:String(document.getElementById('scheduled-task-schedule')?.value||'once'),
      next_due_at:due,
      owner:'workspace:'+workspaceId(),
      route:String(document.getElementById('scheduled-task-route')?.value||'chat-summary'),
      prompt:String(document.getElementById('scheduled-task-prompt')?.value||defaultPrompt(type)).trim()||defaultPrompt(type),
      cost_policy:'free/local-only',
      auto_send:document.getElementById('scheduled-task-auto-send')?.checked===true,
      status:'active',
      created_at:nowIso(),
      updated_at:nowIso(),
      last_fired_at:'',
      run_log:[]
    };
  }
  function visibleRun(task,reason){
    const run={
      at:nowIso(),
      reason,
      route:task.route,
      result:task.auto_send?'sent-to-chat':'queued-for-user',
      cost:'0 USD'
    };
    task.run_log=[run].concat(Array.isArray(task.run_log)?task.run_log:[]).slice(0,20);
    task.last_fired_at=run.at;
    const next=nextDue(task.next_due_at,task.schedule);
    task.next_due_at=next;
    if(!next)task.status='done';
    return run;
  }
  function sendTaskToChat(task){
    const prompt=document.getElementById('mimir-prompt');
    const send=document.getElementById('primary-chat-link');
    if(!prompt)return false;
    prompt.value='Scheduled MMIR task: '+task.title+'\n\nOwner: '+task.owner+'\nSchedule: '+task.schedule+'\nCost policy: '+task.cost_policy+'\n\n'+task.prompt;
    prompt.dispatchEvent(new Event('input',{bubbles:true}));
    document.getElementById('mimir-chat-runtime')?.scrollIntoView({block:'start',behavior:'smooth'});
    window.setTimeout(()=>send?.click(),40);
    return true;
  }
  function checkDue(){
    const tasks=readTasks();
    const now=Date.now();
    let changed=false;
    const updated=tasks.map(task=>{
      if(task.status!=='active'||!task.next_due_at)return task;
      const due=Date.parse(task.next_due_at);
      if(!Number.isFinite(due)||due>now)return task;
      const next={...task};
      const run=visibleRun(next,'due');
      if(task.auto_send)sendTaskToChat(task);
      changed=true;
      return {...next,last_result:run.result};
    });
    if(changed){
      writeTasks(updated);
      render();
      setStatus('Scheduled task due. It is visible in the run log and stayed within free/local policy.','ready');
    }
  }
  function taskCard(task){
    const active=task.status==='active';
    const log=Array.isArray(task.run_log)?task.run_log:[];
    const last=log[0];
    return '<article class="scheduled-task-card" data-task-state="'+safe(task.status)+'">'+
      '<header><div><span>'+safe(task.type)+'</span><strong>'+safe(task.title)+'</strong></div><em>'+safe(task.status)+'</em></header>'+
      '<dl>'+
        '<div><dt>Owner</dt><dd>'+safe(task.owner)+'</dd></div>'+
        '<div><dt>Next</dt><dd>'+safe(formatWhen(task.next_due_at))+'</dd></div>'+
        '<div><dt>Schedule</dt><dd>'+safe(task.schedule)+'</dd></div>'+
        '<div><dt>Cost</dt><dd>'+safe(task.cost_policy)+'</dd></div>'+
        '<div><dt>Route</dt><dd>'+safe(task.route)+(task.auto_send?' / auto-send':'')+'</dd></div>'+
        '<div><dt>Last run</dt><dd>'+safe(last?formatWhen(last.at)+' - '+last.result:'none')+'</dd></div>'+
      '</dl>'+
      '<p>'+safe(task.prompt).slice(0,260)+'</p>'+
      '<div class="scheduled-task-actions">'+
        '<button type="button" data-task-run="'+safe(task.id)+'">Run now</button>'+
        '<button type="button" data-task-toggle="'+safe(task.id)+'">'+(active?'Pause':'Resume')+'</button>'+
        '<button type="button" data-task-delete="'+safe(task.id)+'">Cancel</button>'+
      '</div>'+
    '</article>';
  }
  function render(){
    const tasks=readTasks();
    const active=tasks.filter(task=>task.status==='active').length;
    const due=tasks.filter(task=>task.status==='active'&&task.next_due_at&&Date.parse(task.next_due_at)<=Date.now()).length;
    root.innerHTML=''+
      '<div class="scheduled-task-layout">'+
        '<section class="scheduled-task-form">'+
          '<div class="scheduled-task-policy"><strong>Automation boundary</strong><span>Free/local-only. No hidden paid providers, no public secrets, every task has owner, schedule, cost policy and cancel control.</span></div>'+
          '<div class="workflow-builder-row">'+
            '<label>Title<input id="scheduled-task-title" value="MMIR follow-up" maxlength="120" /></label>'+
            '<label>Type<select id="scheduled-task-type"><option value="reminder">Reminder</option><option value="health-check">Health check</option><option value="progress-review">Progress review</option><option value="research-plan">Research plan</option><option value="workflow-run">Workflow plan</option></select></label>'+
          '</div>'+
          '<div class="workflow-builder-row">'+
            '<label>Due<input id="scheduled-task-due" type="datetime-local" value="'+safe(localDatetime())+'" /></label>'+
            '<label>Repeat<select id="scheduled-task-schedule"><option value="once">Once</option><option value="hourly">Hourly</option><option value="daily">Daily</option><option value="weekly">Weekly</option></select></label>'+
          '</div>'+
          '<div class="workflow-builder-row">'+
            '<label>Route<select id="scheduled-task-route"><option value="chat-summary">Chat summary</option><option value="local-health">Local health review</option><option value="protected-backend-planned">Protected backend planned</option></select></label>'+
            '<label class="scheduled-task-check"><input id="scheduled-task-auto-send" type="checkbox" /> Auto-send when this tab is open</label>'+
          '</div>'+
          '<label>Prompt<textarea id="scheduled-task-prompt" rows="4" maxlength="3000">'+safe(defaultPrompt('reminder'))+'</textarea></label>'+
          '<div class="workflow-builder-actions">'+
            '<button id="scheduled-task-save" type="button">Create task</button>'+
            '<button id="scheduled-task-run-due" type="button">Run due now</button>'+
            '<button id="scheduled-task-export" type="button">Export tasks</button>'+
          '</div>'+
          '<p id="scheduled-task-status" class="workflow-status" data-state="idle" aria-live="polite"></p>'+
        '</section>'+
        '<section class="scheduled-task-results">'+
          '<div class="scheduled-task-summary"><article><span>Active</span><strong>'+safe(active)+'</strong></article><article><span>Due</span><strong>'+safe(due)+'</strong></article><article><span>Cost</span><strong>0 USD</strong></article></div>'+
          '<div class="scheduled-task-list">'+(tasks.length?tasks.map(taskCard).join(''):'<p class="empty-backends">No scheduled tasks yet. Create one safe local reminder to start.</p>')+'</div>'+
        '</section>'+
      '</div>';
    bind();
  }
  function bind(){
    document.getElementById('scheduled-task-save')?.addEventListener('click',saveTask);
    document.getElementById('scheduled-task-run-due')?.addEventListener('click',()=>{checkDue();setStatus('Due check completed.','ready');});
    document.getElementById('scheduled-task-export')?.addEventListener('click',exportTasks);
    document.getElementById('scheduled-task-type')?.addEventListener('change',event=>{
      const prompt=document.getElementById('scheduled-task-prompt');
      if(prompt)prompt.value=defaultPrompt(event.target.value);
    });
    root.querySelectorAll('[data-task-run]').forEach(button=>button.addEventListener('click',()=>runTask(button.dataset.taskRun)));
    root.querySelectorAll('[data-task-toggle]').forEach(button=>button.addEventListener('click',()=>toggleTask(button.dataset.taskToggle)));
    root.querySelectorAll('[data-task-delete]').forEach(button=>button.addEventListener('click',()=>deleteTask(button.dataset.taskDelete)));
  }
  function saveTask(){
    const task=taskFromForm();
    if(!task.title||!task.prompt){setStatus('Title and prompt are required.','error');return;}
    writeTasks([task].concat(readTasks()));
    render();
    setStatus('Scheduled task created with free/local-only cost policy.','ready');
  }
  function mutateTask(id,fn){
    const tasks=readTasks();
    writeTasks(tasks.map(task=>task.id===id?fn({...task}):task));
    render();
  }
  function runTask(id){
    const task=readTasks().find(item=>item.id===id);
    if(!task)return;
    mutateTask(id,next=>{
      visibleRun(next,'manual');
      next.status=task.status==='done'?'done':next.status;
      return next;
    });
    sendTaskToChat(task);
    setStatus('Task sent to chat. Cost policy stayed free/local-only.','ready');
  }
  function toggleTask(id){
    mutateTask(id,task=>{
      task.status=task.status==='active'?'paused':'active';
      task.updated_at=nowIso();
      return task;
    });
    setStatus('Task status updated.','ready');
  }
  function deleteTask(id){
    writeTasks(readTasks().filter(task=>task.id!==id));
    render();
    setStatus('Scheduled task cancelled and removed.','ready');
  }
  function exportTasks(){
    const blob=new Blob([JSON.stringify({exported_at:nowIso(),workspace_id:workspaceId(),tasks:readTasks()},null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const link=document.createElement('a');
    link.href=url;
    link.download='mmir-scheduled-tasks-'+workspaceId()+'.json';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setStatus('Scheduled tasks exported.','ready');
  }
  function startTimer(){
    window.clearInterval(timer);
    timer=window.setInterval(checkDue,30000);
  }
  window.addEventListener('mmir-workspace-changed',render);
  window.addEventListener('storage',render);
  render();
  startTimer();
})();
