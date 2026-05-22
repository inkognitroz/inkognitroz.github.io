(function(){
  const api=window.MimirApiClient;
  const ACTIVE_WORKSPACE_KEY='mimir-active-workspace-v1';
  const DEFAULT_WORKSPACE_ID='personal';
  const root=document.getElementById('workflow-builder-root');
  const promptEl=document.getElementById('mimir-prompt');
  let steps=[newStep()];
  let agents=[newAgent()];
  let savedWorkflows=[];
  let selectedWorkflowId='';
  const STEP_TYPES=['prompt','model_call','tool','api','agent'];
  const AGENT_ROLES=['researcher','architect','critic','coder','analyst','strategist','operator'];

  if(!root||!api)return;

  function workspaceId(){return localStorage.getItem(ACTIVE_WORKSPACE_KEY)||DEFAULT_WORKSPACE_ID;}
  function uniqueId(prefix){return prefix+'-'+String(Date.now()).slice(-6)+'-'+String(Math.random()).slice(2,5);}
  function newStep(){return {id:uniqueId('step'),type:'model_call',name:'Model step',prompt:String(promptEl?.value||'').trim(),model:'',agent_id:''};}
  function newAgent(){return {id:uniqueId('agent'),role:'researcher',name:'Researcher',instructions:'',model:'',tools:'knowledge.search,routing.decision',max_iterations:3};}
  function escapeHtml(value){return String(value||'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));}
  function setStatus(message,state){const el=document.getElementById('workflow-status');if(el){el.textContent=message||'';el.dataset.state=state||'idle';}}
  function positiveInteger(value,fallback){const parsed=Number.parseInt(value,10);return Number.isFinite(parsed)&&parsed>0?parsed:fallback;}

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

  function agentOptions(selected){
    const options=['<option value="">Auto assign</option>'];
    agents.forEach(agent=>{
      const label=(agent.name||agent.role||agent.id)+' ('+(agent.role||'agent')+')';
      options.push('<option value="'+escapeHtml(agent.id)+'" '+(selected===agent.id?'selected':'')+'>'+escapeHtml(label)+'</option>');
    });
    return options.join('');
  }

  function roleOptions(selected){
    return AGENT_ROLES.map(role=>'<option value="'+role+'" '+(selected===role?'selected':'')+'>'+role+'</option>').join('');
  }

  function stepHtml(step,index){
    return ''+
      '<article class="workflow-step" data-index="'+index+'">'+
        '<header><h3>Step '+String(index+1)+'</h3><button type="button" data-action="remove-step" data-index="'+index+'">Remove</button></header>'+
        '<div class="workflow-builder-row">'+
          '<label>Name<input data-field="name" data-index="'+index+'" value="'+escapeHtml(step.name)+'" /></label>'+
          '<label>Type<select data-field="type" data-index="'+index+'">'+
            STEP_TYPES.map(type=>'<option value="'+type+'" '+(step.type===type?'selected':'')+'>'+type.replace('_',' ')+'</option>').join('')+
          '</select></label>'+
          '<label>Agent<select data-field="agent_id" data-index="'+index+'">'+agentOptions(step.agent_id)+'</select></label>'+
        '</div>'+
        '<label>Prompt<textarea data-field="prompt" data-index="'+index+'">'+escapeHtml(step.prompt)+'</textarea></label>'+
        '<label>Model<input data-field="model" data-index="'+index+'" value="'+escapeHtml(step.model)+'" /></label>'+
      '</article>';
  }

  function agentHtml(agent,index){
    return ''+
      '<article class="workflow-agent" data-index="'+index+'">'+
        '<header><h3>Agent '+String(index+1)+'</h3><button type="button" data-action="remove-agent" data-index="'+index+'">Remove</button></header>'+
        '<div class="workflow-builder-row">'+
          '<label>Name<input data-agent-field="name" data-index="'+index+'" value="'+escapeHtml(agent.name)+'" /></label>'+
          '<label>Role<select data-agent-field="role" data-index="'+index+'">'+roleOptions(agent.role)+'</select></label>'+
        '</div>'+
        '<div class="workflow-builder-row">'+
          '<label>Model<input data-agent-field="model" data-index="'+index+'" value="'+escapeHtml(agent.model)+'" /></label>'+
          '<label>Max runs<input data-agent-field="max_iterations" data-index="'+index+'" type="number" min="1" max="20" value="'+escapeHtml(agent.max_iterations)+'" /></label>'+
        '</div>'+
        '<label>Tools<input data-agent-field="tools" data-index="'+index+'" value="'+escapeHtml(agent.tools)+'" /></label>'+
        '<label>Instructions<textarea data-agent-field="instructions" data-index="'+index+'">'+escapeHtml(agent.instructions)+'</textarea></label>'+
      '</article>';
  }

  function canvasHtml(){
    return ''+
      '<section class="workflow-canvas-section">'+
        '<div class="workflow-builder-subhead"><h3>Canvas</h3><button id="canvas-add-step" type="button">Add step</button></div>'+
        '<div class="workflow-canvas" role="list">'+steps.map(canvasNodeHtml).join('')+'</div>'+
      '</section>';
  }

  function canvasNodeHtml(step,index){
    const agent=agents.find(item=>item.id===step.agent_id);
    const agentName=agent?(agent.name||agent.role||agent.id):'Auto';
    return ''+
      '<article class="workflow-canvas-node" role="listitem" data-index="'+index+'">'+
        '<button class="workflow-canvas-focus" type="button" data-action="focus-step" data-index="'+index+'">'+
          '<strong>'+escapeHtml(step.name||('Step '+String(index+1)))+'</strong>'+
          '<span>'+escapeHtml(step.type||'model_call')+'</span>'+
          '<small>'+escapeHtml(agentName)+'</small>'+
        '</button>'+
        '<div class="workflow-canvas-node-actions">'+
          '<button type="button" title="Move left" data-action="move-step-left" data-index="'+index+'" '+(index===0?'disabled':'')+'>&lt;</button>'+
          '<button type="button" title="Insert after" data-action="insert-step-after" data-index="'+index+'">+</button>'+
          '<button type="button" title="Move right" data-action="move-step-right" data-index="'+index+'" '+(index===steps.length-1?'disabled':'')+'>&gt;</button>'+
        '</div>'+
      '</article>';
  }

  function render(){
    root.innerHTML=''+
      '<div class="workflow-builder-form">'+
        '<div class="workflow-builder-row">'+
          '<label>Workflow name<input id="workflow-name" value="Launch workflow" /></label>'+
          '<label>Workspace<input id="workflow-workspace" value="'+escapeHtml(workspaceId())+'" /></label>'+
        '</div>'+
        '<section class="workflow-agent-section">'+
          '<div class="workflow-builder-subhead"><h3>Agents</h3><button id="add-workflow-agent" type="button">Add agent</button></div>'+
          '<div id="workflow-agent-list" class="workflow-agent-list">'+(agents.length?agents.map(agentHtml).join(''):'')+'</div>'+
        '</section>'+
        canvasHtml()+
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
        '<div><strong>'+escapeHtml(workflow.name)+'</strong><small>'+escapeHtml(workflow.workspace_id)+' - '+String(workflow.steps?.length||0)+' step(s) - '+String(workflow.agents?.length||0)+' agent(s)</small></div>'+
        '<button type="button" data-action="select-workflow" data-id="'+escapeHtml(workflow.id)+'">'+(selectedWorkflowId===workflow.id?'Selected':'Select')+'</button>'+
      '</article>').join('');
  }

  function bind(){
    root.querySelectorAll('[data-field]').forEach(input=>input.addEventListener('input',event=>{
      const index=Number(event.target.dataset.index);
      const field=event.target.dataset.field;
      if(steps[index])steps[index][field]=event.target.value;
    }));
    root.querySelectorAll('[data-agent-field]').forEach(input=>input.addEventListener('input',event=>{
      const index=Number(event.target.dataset.index);
      const field=event.target.dataset.agentField;
      if(agents[index])agents[index][field]=event.target.value;
    }));
    root.querySelectorAll('[data-action="remove-step"]').forEach(button=>button.addEventListener('click',event=>{
      const index=Number(event.currentTarget.dataset.index);
      steps=steps.filter((_,itemIndex)=>itemIndex!==index);
      if(!steps.length)steps=[newStep()];
      render();
    }));
    root.querySelectorAll('[data-action="move-step-left"]').forEach(button=>button.addEventListener('click',event=>{
      const index=Number(event.currentTarget.dataset.index);
      if(index>0){
        [steps[index-1],steps[index]]=[steps[index],steps[index-1]];
        render();
      }
    }));
    root.querySelectorAll('[data-action="move-step-right"]').forEach(button=>button.addEventListener('click',event=>{
      const index=Number(event.currentTarget.dataset.index);
      if(index<steps.length-1){
        [steps[index],steps[index+1]]=[steps[index+1],steps[index]];
        render();
      }
    }));
    root.querySelectorAll('[data-action="insert-step-after"]').forEach(button=>button.addEventListener('click',event=>{
      const index=Number(event.currentTarget.dataset.index);
      steps.splice(index+1,0,newStep());
      render();
    }));
    root.querySelectorAll('[data-action="focus-step"]').forEach(button=>button.addEventListener('click',event=>{
      const index=Number(event.currentTarget.dataset.index);
      root.querySelector('.workflow-step[data-index="'+index+'"]')?.scrollIntoView({behavior:'smooth',block:'center'});
    }));
    root.querySelectorAll('[data-action="remove-agent"]').forEach(button=>button.addEventListener('click',event=>{
      const index=Number(event.currentTarget.dataset.index);
      const removed=agents[index]?.id;
      agents=agents.filter((_,itemIndex)=>itemIndex!==index);
      if(removed)steps=steps.map(step=>step.agent_id===removed?{...step,agent_id:''}:step);
      render();
    }));
    root.querySelectorAll('[data-action="select-workflow"]').forEach(button=>button.addEventListener('click',event=>{
      selectedWorkflowId=event.currentTarget.dataset.id||'';
      const workflow=savedWorkflows.find(item=>item.id===selectedWorkflowId);
      if(workflow){
        steps=normalizeSteps(workflow.steps);
        agents=normalizeAgents(workflow.agents);
      }
      render();
    }));
    document.getElementById('add-workflow-step')?.addEventListener('click',()=>{steps.push(newStep());render();});
    document.getElementById('canvas-add-step')?.addEventListener('click',()=>{steps.push(newStep());render();});
    document.getElementById('add-workflow-agent')?.addEventListener('click',()=>{agents.push(newAgent());render();});
    document.getElementById('save-workflow')?.addEventListener('click',saveWorkflow);
    document.getElementById('refresh-workflows')?.addEventListener('click',loadWorkflows);
    document.getElementById('plan-workflow-run')?.addEventListener('click',planRun);
  }

  function normalizeSteps(items){
    const normalized=Array.isArray(items)?items.map((step,index)=>({
      id:step?.id||('step-'+String(index+1)),
      type:STEP_TYPES.includes(step?.type)?step.type:'model_call',
      name:step?.name||('Step '+String(index+1)),
      prompt:step?.prompt||'',
      model:step?.model||'',
      agent_id:step?.agent_id||''
    })):[];
    return normalized.length?normalized:[newStep()];
  }

  function normalizeAgents(items){
    return Array.isArray(items)?items.map((agent,index)=>({
      id:agent?.id||('agent-'+String(index+1)),
      role:AGENT_ROLES.includes(agent?.role)?agent.role:'researcher',
      name:agent?.name||agent?.role||('Agent '+String(index+1)),
      instructions:agent?.instructions||'',
      model:agent?.model||'',
      tools:Array.isArray(agent?.tools)?agent.tools.join(','):String(agent?.tools||''),
      max_iterations:positiveInteger(agent?.max_iterations,3)
    })):[];
  }

  function payload(){
    return {
      workspace_id:document.getElementById('workflow-workspace')?.value||workspaceId(),
      name:document.getElementById('workflow-name')?.value||'Workflow',
      agents:agents.map((agent,index)=>({
        id:agent.id||('agent-'+String(index+1)),
        role:agent.role||'researcher',
        name:agent.name||('Agent '+String(index+1)),
        instructions:agent.instructions||'',
        model:agent.model||'',
        tools:String(agent.tools||'').split(',').map(tool=>tool.trim()).filter(Boolean),
        max_iterations:positiveInteger(agent.max_iterations,3)
      })),
      steps:steps.map((step,index)=>({
        id:step.id||('step-'+String(index+1)),
        type:step.type||'model_call',
        name:step.name||('Step '+String(index+1)),
        prompt:step.prompt||'',
        model:step.model||'',
        agent_id:step.agent_id||''
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
