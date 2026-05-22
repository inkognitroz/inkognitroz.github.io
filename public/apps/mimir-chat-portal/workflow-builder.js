(function(){
  const api=window.MimirApiClient;
  const ACTIVE_WORKSPACE_KEY='mimir-active-workspace-v1';
  const DEFAULT_WORKSPACE_ID='personal';
  const root=document.getElementById('workflow-builder-root');
  const promptEl=document.getElementById('mimir-prompt');
  let steps=[newStep()];
  let savedWorkflows=[];
  let selectedWorkflowId='';

  if(!root||!api)return;

  function workspaceId(){return localStorage.getItem(ACTIVE_WORKSPACE_KEY)||DEFAULT_WORKSPACE_ID;}
  function newStep(){return {id:'step-'+String(Date.now()).slice(-6),type:'model_call',name:'Model step',prompt:String(promptEl?.value||'').trim(),model:''};}
  function escapeHtml(value){return String(value||'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));}
  function setStatus(message,state){const el=document.getElementById('workflow-status');if(el){el.textContent=message||'';el.dataset.state=state||'idle';}}

  function activeConnection(){
    const profile=api.activeProfile();
    const url=api.cleanUrl(profile?.url);
    if(!profile||!url)return null;
    return {profile,url};
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

  function stepHtml(step,index){
    return ''+
      '<article class="workflow-step" data-index="'+index+'">'+
        '<header><h3>Step '+String(index+1)+'</h3><button type="button" data-action="remove-step" data-index="'+index+'">Remove</button></header>'+
        '<div class="workflow-builder-row">'+
          '<label>Name<input data-field="name" data-index="'+index+'" value="'+escapeHtml(step.name)+'" /></label>'+
          '<label>Type<select data-field="type" data-index="'+index+'">'+
            ['prompt','model_call','tool','api','agent'].map(type=>'<option value="'+type+'" '+(step.type===type?'selected':'')+'>'+type.replace('_',' ')+'</option>').join('')+
          '</select></label>'+
        '</div>'+
        '<label>Prompt<textarea data-field="prompt" data-index="'+index+'">'+escapeHtml(step.prompt)+'</textarea></label>'+
        '<label>Model<input data-field="model" data-index="'+index+'" value="'+escapeHtml(step.model)+'" /></label>'+
      '</article>';
  }

  function render(){
    root.innerHTML=''+
      '<div class="workflow-builder-form">'+
        '<div class="workflow-builder-row">'+
          '<label>Workflow name<input id="workflow-name" value="Launch workflow" /></label>'+
          '<label>Workspace<input id="workflow-workspace" value="'+escapeHtml(workspaceId())+'" /></label>'+
        '</div>'+
        '<div id="workflow-step-list" class="workflow-step-list">'+steps.map(stepHtml).join('')+'</div>'+
        '<div class="workflow-builder-actions">'+
          '<button id="add-workflow-step" type="button">Add step</button>'+
          '<button id="save-workflow" type="button">Save workflow</button>'+
          '<button id="refresh-workflows" type="button">Refresh</button>'+
          '<button id="plan-workflow-run" type="button" '+(selectedWorkflowId?'':'disabled')+'>Plan run</button>'+
        '</div>'+
        '<p id="workflow-status" class="workflow-status" data-state="idle" aria-live="polite"></p>'+
      '</div>'+
      '<div id="workflow-list" class="workflow-list">'+listHtml()+'</div>';
    bind();
  }

  function listHtml(){
    if(!savedWorkflows.length)return '<p class="empty-backends">No workflows saved for this backend.</p>';
    return savedWorkflows.map(workflow=>''+
      '<article class="workflow-list-item">'+
        '<div><strong>'+escapeHtml(workflow.name)+'</strong><small>'+escapeHtml(workflow.workspace_id)+' · '+String(workflow.steps?.length||0)+' step(s)</small></div>'+
        '<button type="button" data-action="select-workflow" data-id="'+escapeHtml(workflow.id)+'">'+(selectedWorkflowId===workflow.id?'Selected':'Select')+'</button>'+
      '</article>').join('');
  }

  function bind(){
    root.querySelectorAll('[data-field]').forEach(input=>input.addEventListener('input',event=>{
      const index=Number(event.target.dataset.index);
      const field=event.target.dataset.field;
      if(steps[index])steps[index][field]=event.target.value;
    }));
    root.querySelectorAll('[data-action="remove-step"]').forEach(button=>button.addEventListener('click',event=>{
      const index=Number(event.currentTarget.dataset.index);
      steps=steps.filter((_,itemIndex)=>itemIndex!==index);
      if(!steps.length)steps=[newStep()];
      render();
    }));
    root.querySelectorAll('[data-action="select-workflow"]').forEach(button=>button.addEventListener('click',event=>{
      selectedWorkflowId=event.currentTarget.dataset.id||'';
      render();
    }));
    document.getElementById('add-workflow-step')?.addEventListener('click',()=>{steps.push(newStep());render();});
    document.getElementById('save-workflow')?.addEventListener('click',saveWorkflow);
    document.getElementById('refresh-workflows')?.addEventListener('click',loadWorkflows);
    document.getElementById('plan-workflow-run')?.addEventListener('click',planRun);
  }

  function payload(){
    return {
      workspace_id:document.getElementById('workflow-workspace')?.value||workspaceId(),
      name:document.getElementById('workflow-name')?.value||'Workflow',
      steps:steps.map((step,index)=>({
        id:step.id||('step-'+String(index+1)),
        type:step.type||'model_call',
        name:step.name||('Step '+String(index+1)),
        prompt:step.prompt||'',
        model:step.model||''
      }))
    };
  }

  async function saveWorkflow(){
    setStatus('Saving workflow...','loading');
    try{
      const data=await request('/workflows',{method:'POST',body:JSON.stringify(payload())});
      selectedWorkflowId=data?.data?.id||'';
      await loadWorkflows(false);
      setStatus('Workflow saved.','ready');
    }catch(error){
      setStatus(api.friendlyError(error),'error');
    }
  }

  async function loadWorkflows(showStatus=true){
    if(showStatus)setStatus('Loading workflows...','loading');
    try{
      const data=await request('/workflows?workspace_id='+encodeURIComponent(workspaceId()),{method:'GET'});
      savedWorkflows=Array.isArray(data?.data)?data.data:[];
      render();
      if(showStatus)setStatus('Workflows loaded.','ready');
    }catch(error){
      savedWorkflows=[];
      render();
      setStatus(api.friendlyError(error),'error');
    }
  }

  async function planRun(){
    if(!selectedWorkflowId){setStatus('Select a workflow first.','error');return;}
    setStatus('Planning run...','loading');
    try{
      const data=await request('/workflows/'+encodeURIComponent(selectedWorkflowId)+'/runs',{method:'POST',body:JSON.stringify({trigger:'manual'})});
      setStatus('Run planned: '+String(data?.data?.step_results?.length||0)+' step(s).','ready');
    }catch(error){
      setStatus(api.friendlyError(error),'error');
    }
  }

  function init(){
    render();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
