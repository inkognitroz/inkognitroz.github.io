(function(){
  const api=window.MimirApiClient;
  const ACTIVE_WORKSPACE_KEY='mimir-active-workspace-v1';
  const DEFAULT_WORKSPACE_ID='personal';
  const root=document.getElementById('training-automation-root');
  const JOB_TYPES=['lora','fine-tuning','full-training','adapter-eval'];
  const ROUTES=['local','owned-node','managed-provider','cloud','unknown'];
  let datasets=[];
  let jobs=[];

  if(!root||!api)return;

  function workspaceId(){return localStorage.getItem(ACTIVE_WORKSPACE_KEY)||DEFAULT_WORKSPACE_ID;}
  function escapeHtml(value){return String(value||'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));}
  function setStatus(message,state){const el=document.getElementById('training-status');if(el){el.textContent=message||'';el.dataset.state=state||'idle';}}

  function activeConnection(){
    const profile=api.activeProfile();
    const url=api.cleanUrl(profile?.url);
    if(!profile||!url)return null;
    return {profile,url};
  }

  async function request(path,options={}){
    const connection=activeConnection();
    if(!connection)throw new Error('Activate a backend API profile first.');
    const token=await api.pairIfNeeded(connection.profile,connection.url);
    return api.fetchJson(api.joinUrl(connection.url,path),{
      ...options,
      headers:{...api.authHeaders(token),...(options.headers||{})}
    });
  }

  function options(items,selected){
    return items.map(item=>'<option value="'+escapeHtml(item)+'" '+(selected===item?'selected':'')+'>'+escapeHtml(item)+'</option>').join('');
  }

  function datasetOptions(){
    if(!datasets.length)return '<option value="">No dataset</option>';
    return datasets.map(dataset=>'<option value="'+escapeHtml(dataset.id)+'">'+escapeHtml(dataset.name)+' - '+escapeHtml(dataset.purpose)+' - '+String(dataset.record_count)+' records</option>').join('');
  }

  function gateHtml(gate){
    return '<span class="comparison-status" data-state="'+escapeHtml(gate.status)+'">'+escapeHtml(gate.id)+': '+escapeHtml(gate.status)+'</span>';
  }

  function jobsHtml(){
    if(!jobs.length)return '<p class="empty-backends">No training automation plans.</p>';
    return jobs.map(job=>''+
      '<article class="workflow-list-item">'+
        '<div><strong>'+escapeHtml(job.name)+'</strong><small>'+escapeHtml(job.type)+' - '+escapeHtml(job.status)+' - '+escapeHtml(job.compute_route)+' - $'+String(job.estimated_cost_usd||0)+'</small>'+
        '<div class="comparison-meta">'+(job.gates||[]).map(gateHtml).join('')+'</div></div>'+
        '<div class="runtime-message-actions"><button type="button" data-action="delete-training-job" data-id="'+escapeHtml(job.id)+'">Delete</button></div>'+
      '</article>').join('');
  }

  function render(){
    root.innerHTML=''+
      '<div class="workflow-builder-form">'+
        '<div class="workflow-builder-row">'+
          '<label>Name<input id="training-name" value="Local LoRA plan" maxlength="120" /></label>'+
          '<label>Dataset<select id="training-dataset">'+datasetOptions()+'</select></label>'+
        '</div>'+
        '<div class="workflow-builder-row">'+
          '<label>Type<select id="training-type">'+options(JOB_TYPES,'lora')+'</select></label>'+
          '<label>Compute<select id="training-compute">'+options(ROUTES,'local')+'</select></label>'+
        '</div>'+
        '<div class="workflow-builder-row">'+
          '<label>Base model<input id="training-base-model" maxlength="120" /></label>'+
          '<label>Output model<input id="training-output-model" maxlength="120" /></label>'+
        '</div>'+
        '<div class="workflow-builder-row">'+
          '<label>Estimated cost<input id="training-estimated-cost" type="number" min="0" step="0.000001" value="0" /></label>'+
          '<label>Max cost<input id="training-max-cost" type="number" min="0" step="0.000001" value="0" /></label>'+
        '</div>'+
        '<div class="workflow-builder-row">'+
          '<label><input id="training-allow-paid" type="checkbox" /> Allow paid compute</label>'+
          '<label><input id="training-allow-pii" type="checkbox" /> Allow PII</label>'+
          '<label><input id="training-allow-unverified" type="checkbox" /> Allow unverified rights</label>'+
        '</div>'+
        '<div class="workflow-builder-actions">'+
          '<button id="plan-training-job" type="button">Plan job</button>'+
          '<button id="refresh-training" type="button">Refresh</button>'+
        '</div>'+
        '<p id="training-status" class="workflow-status" data-state="idle" aria-live="polite"></p>'+
      '</div>'+
      '<div id="training-job-list" class="workflow-list">'+jobsHtml()+'</div>';
    bind();
  }

  function bind(){
    document.getElementById('plan-training-job')?.addEventListener('click',planJob);
    document.getElementById('refresh-training')?.addEventListener('click',loadAll);
    root.querySelectorAll('[data-action="delete-training-job"]').forEach(button=>button.addEventListener('click',()=>deleteJob(button.dataset.id)));
  }

  async function loadAll(){
    setStatus('Loading training automation...','loading');
    try{
      const workspace=encodeURIComponent(workspaceId());
      const datasetData=await request('/datasets?workspace_id='+workspace,{method:'GET',timeoutMs:8000});
      const jobData=await request('/training/jobs?workspace_id='+workspace,{method:'GET',timeoutMs:8000});
      datasets=Array.isArray(datasetData?.data)?datasetData.data:[];
      jobs=Array.isArray(jobData?.data)?jobData.data:[];
      render();
      setStatus('Training automation loaded.','ready');
    }catch(error){
      datasets=[];
      jobs=[];
      render();
      setStatus(api.friendlyError(error),'error');
    }
  }

  function payload(){
    return {
      workspace_id:workspaceId(),
      name:String(document.getElementById('training-name')?.value||'Training plan').trim()||'Training plan',
      dataset_id:String(document.getElementById('training-dataset')?.value||''),
      type:String(document.getElementById('training-type')?.value||'lora'),
      compute_route:String(document.getElementById('training-compute')?.value||'local'),
      base_model:String(document.getElementById('training-base-model')?.value||'').trim(),
      output_model:String(document.getElementById('training-output-model')?.value||'').trim(),
      estimated_cost_usd:Number(document.getElementById('training-estimated-cost')?.value||0),
      policy:{
        max_cost_usd:Number(document.getElementById('training-max-cost')?.value||0),
        allow_paid_compute:document.getElementById('training-allow-paid')?.checked===true,
        allow_pii:document.getElementById('training-allow-pii')?.checked===true,
        allow_unverified_rights:document.getElementById('training-allow-unverified')?.checked===true
      }
    };
  }

  async function planJob(){
    const body=payload();
    if(!body.dataset_id){setStatus('Select a dataset first.','error');return;}
    setStatus('Planning job...','loading');
    try{
      await request('/training/jobs',{method:'POST',timeoutMs:10000,body:JSON.stringify(body)});
      await loadAll();
      setStatus('Training job planned.','ready');
    }catch(error){
      setStatus(api.friendlyError(error),'error');
    }
  }

  async function deleteJob(id){
    setStatus('Deleting job...','loading');
    try{
      await request('/training/jobs/'+encodeURIComponent(id),{method:'DELETE',timeoutMs:8000});
      await loadAll();
      setStatus('Training job deleted.','ready');
    }catch(error){
      setStatus(api.friendlyError(error),'error');
    }
  }

  window.addEventListener('mmir-workspace-changed',()=>{datasets=[];jobs=[];render();});
  window.addEventListener('mmir-backend-profiles-updated',loadAll);
  render();
})();
