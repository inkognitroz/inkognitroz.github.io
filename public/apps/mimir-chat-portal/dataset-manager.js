(function(){
  const api=window.MimirApiClient;
  const ACTIVE_WORKSPACE_KEY='mimir-active-workspace-v1';
  const DEFAULT_WORKSPACE_ID='personal';
  const root=document.getElementById('dataset-manager-root');
  const PURPOSES=['training','fine-tuning','evaluation','rag','preference','general'];
  let datasets=[];
  let records=[newRecord()];
  let selectedDatasetId='';

  if(!root||!api)return;

  function workspaceId(){return localStorage.getItem(ACTIVE_WORKSPACE_KEY)||DEFAULT_WORKSPACE_ID;}
  function uniqueId(prefix){return prefix+'-'+String(Date.now()).slice(-6)+'-'+String(Math.random()).slice(2,5);}
  function newRecord(){return {id:uniqueId('record'),type:'instruction',input:'',output:'',tags:''};}
  function escapeHtml(value){return String(value||'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));}
  function setStatus(message,state){const el=document.getElementById('dataset-status');if(el){el.textContent=message||'';el.dataset.state=state||'idle';}}

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

  function purposeOptions(selected){
    return PURPOSES.map(purpose=>'<option value="'+purpose+'" '+(selected===purpose?'selected':'')+'>'+purpose+'</option>').join('');
  }

  function recordHtml(record,index){
    return ''+
      '<article class="workflow-step dataset-record" data-index="'+index+'">'+
        '<header><h3>Record '+String(index+1)+'</h3><button type="button" data-action="remove-record" data-index="'+index+'">Remove</button></header>'+
        '<div class="workflow-builder-row">'+
          '<label>Type<select data-record-field="type" data-index="'+index+'">'+
            ['instruction','prompt-completion','preference','document','classification','general'].map(type=>'<option value="'+type+'" '+(record.type===type?'selected':'')+'>'+type+'</option>').join('')+
          '</select></label>'+
          '<label>Tags<input data-record-field="tags" data-index="'+index+'" value="'+escapeHtml(record.tags)+'" /></label>'+
        '</div>'+
        '<label>Input<textarea data-record-field="input" data-index="'+index+'" rows="3" maxlength="8000">'+escapeHtml(record.input)+'</textarea></label>'+
        '<label>Output<textarea data-record-field="output" data-index="'+index+'" rows="3" maxlength="8000">'+escapeHtml(record.output)+'</textarea></label>'+
      '</article>';
  }

  function listHtml(){
    if(!datasets.length)return '<p class="empty-backends">No datasets saved for this workspace.</p>';
    return datasets.map(dataset=>''+
      '<article class="workflow-list-item">'+
        '<div><strong>'+escapeHtml(dataset.name)+'</strong><small>'+escapeHtml(dataset.purpose)+' - v'+String(dataset.active_version)+' - '+String(dataset.record_count)+' record(s)</small></div>'+
        '<div class="runtime-message-actions">'+
          '<button type="button" data-action="load-dataset" data-id="'+escapeHtml(dataset.id)+'">Load</button>'+
          '<button type="button" data-action="version-dataset" data-id="'+escapeHtml(dataset.id)+'">Version</button>'+
          '<button type="button" data-action="delete-dataset" data-id="'+escapeHtml(dataset.id)+'">Delete</button>'+
        '</div>'+
      '</article>').join('');
  }

  function render(){
    root.innerHTML=''+
      '<div class="workflow-builder-form">'+
        '<div class="workflow-builder-row">'+
          '<label>Name<input id="dataset-name" value="MMIR dataset" maxlength="120" /></label>'+
          '<label>Purpose<select id="dataset-purpose">'+purposeOptions('fine-tuning')+'</select></label>'+
        '</div>'+
        '<div class="workflow-builder-row">'+
          '<label>Source<input id="dataset-source" value="manual" maxlength="120" /></label>'+
          '<label>License<input id="dataset-license" value="unverified" maxlength="120" /></label>'+
        '</div>'+
        '<div class="workflow-builder-row">'+
          '<label>PII<select id="dataset-pii"><option value="unknown">unknown</option><option value="none">none</option><option value="contains-pii">contains-pii</option></select></label>'+
          '<label>Rights<input id="dataset-rights" value="unverified" maxlength="120" /></label>'+
        '</div>'+
        '<div class="workflow-builder-row">'+
          '<label><input id="dataset-user-confirmed" type="checkbox" /> User confirmed</label>'+
          '<label><input id="dataset-commercial-use" type="checkbox" /> Commercial use allowed</label>'+
        '</div>'+
        '<label>Description<textarea id="dataset-description" rows="2" maxlength="1000"></textarea></label>'+
        '<div id="dataset-records" class="workflow-step-list">'+records.map(recordHtml).join('')+'</div>'+
        '<div class="workflow-builder-actions">'+
          '<button id="add-dataset-record" type="button">Add record</button>'+
          '<button id="save-dataset" type="button">'+(selectedDatasetId?'Save version':'Save dataset')+'</button>'+
          '<button id="refresh-datasets" type="button">Refresh</button>'+
          '<button id="clear-dataset-form" type="button">Clear</button>'+
        '</div>'+
        '<p id="dataset-status" class="workflow-status" data-state="idle" aria-live="polite"></p>'+
      '</div>'+
      '<div id="dataset-list" class="workflow-list">'+listHtml()+'</div>';
    bind();
  }

  function bind(){
    root.querySelectorAll('[data-record-field]').forEach(input=>input.addEventListener('input',event=>{
      const index=Number(event.target.dataset.index);
      const field=event.target.dataset.recordField;
      if(records[index])records[index][field]=event.target.value;
    }));
    root.querySelectorAll('[data-action="remove-record"]').forEach(button=>button.addEventListener('click',event=>{
      const index=Number(event.currentTarget.dataset.index);
      records=records.filter((_,itemIndex)=>itemIndex!==index);
      if(!records.length)records=[newRecord()];
      render();
    }));
    root.querySelectorAll('[data-action="load-dataset"]').forEach(button=>button.addEventListener('click',()=>loadDataset(button.dataset.id,false)));
    root.querySelectorAll('[data-action="version-dataset"]').forEach(button=>button.addEventListener('click',()=>loadDataset(button.dataset.id,true)));
    root.querySelectorAll('[data-action="delete-dataset"]').forEach(button=>button.addEventListener('click',()=>deleteDataset(button.dataset.id)));
    document.getElementById('add-dataset-record')?.addEventListener('click',()=>{records.push(newRecord());render();});
    document.getElementById('save-dataset')?.addEventListener('click',saveDataset);
    document.getElementById('refresh-datasets')?.addEventListener('click',loadDatasets);
    document.getElementById('clear-dataset-form')?.addEventListener('click',clearForm);
  }

  function collectRecords(){
    return records.map(record=>({
      id:record.id,
      type:record.type||'instruction',
      input:String(record.input||'').trim(),
      output:String(record.output||'').trim(),
      tags:String(record.tags||'').split(',').map(tag=>tag.trim()).filter(Boolean)
    })).filter(record=>record.input||record.output);
  }

  function basePayload(){
    return {
      workspace_id:workspaceId(),
      name:String(document.getElementById('dataset-name')?.value||'MMIR dataset').trim()||'MMIR dataset',
      purpose:String(document.getElementById('dataset-purpose')?.value||'general'),
      source:String(document.getElementById('dataset-source')?.value||'manual').trim()||'manual',
      license:String(document.getElementById('dataset-license')?.value||'unverified').trim()||'unverified',
      description:String(document.getElementById('dataset-description')?.value||'').trim(),
      consent:{
        user_confirmed:document.getElementById('dataset-user-confirmed')?.checked===true,
        commercial_use_allowed:document.getElementById('dataset-commercial-use')?.checked===true,
        pii_level:String(document.getElementById('dataset-pii')?.value||'unknown'),
        source_rights:String(document.getElementById('dataset-rights')?.value||'unverified').trim()||'unverified'
      },
      records:collectRecords()
    };
  }

  async function loadDatasets(){
    setStatus('Loading datasets...','loading');
    try{
      const data=await request('/datasets?workspace_id='+encodeURIComponent(workspaceId()),{method:'GET',timeoutMs:8000});
      datasets=Array.isArray(data?.data)?data.data:[];
      render();
      setStatus('Datasets loaded.','ready');
    }catch(error){
      datasets=[];
      render();
      setStatus(api.friendlyError(error),'error');
    }
  }

  async function loadDataset(id,forVersion){
    setStatus('Loading dataset...','loading');
    try{
      const data=await request('/datasets/'+encodeURIComponent(id),{method:'GET',timeoutMs:8000});
      const dataset=data?.data;
      const version=Array.isArray(dataset?.versions)?dataset.versions[dataset.versions.length-1]:null;
      selectedDatasetId=forVersion?String(dataset?.id||''):'';
      records=Array.isArray(version?.records)&&version.records.length?version.records.map(record=>({
        id:record.id||newRecord().id,
        type:record.type||'instruction',
        input:record.input||'',
        output:record.output||'',
        tags:Array.isArray(record.tags)?record.tags.join(', '):''
      })):[newRecord()];
      render();
      const name=document.getElementById('dataset-name');
      const purpose=document.getElementById('dataset-purpose');
      const source=document.getElementById('dataset-source');
      const license=document.getElementById('dataset-license');
      const description=document.getElementById('dataset-description');
      const pii=document.getElementById('dataset-pii');
      const rights=document.getElementById('dataset-rights');
      const confirmed=document.getElementById('dataset-user-confirmed');
      const commercial=document.getElementById('dataset-commercial-use');
      if(name)name.value=dataset?.name||'MMIR dataset';
      if(purpose)purpose.value=dataset?.purpose||'general';
      if(source)source.value=dataset?.source||'manual';
      if(license)license.value=dataset?.license||'unverified';
      if(description)description.value=dataset?.description||'';
      if(pii)pii.value=dataset?.consent?.pii_level||'unknown';
      if(rights)rights.value=dataset?.consent?.source_rights||'unverified';
      if(confirmed)confirmed.checked=dataset?.consent?.user_confirmed===true;
      if(commercial)commercial.checked=dataset?.consent?.commercial_use_allowed===true;
      setStatus(forVersion?'Editing new dataset version.':'Dataset loaded.','ready');
    }catch(error){
      setStatus(api.friendlyError(error),'error');
    }
  }

  async function saveDataset(){
    const payload=basePayload();
    if(!payload.records.length){setStatus('Add at least one dataset record.','error');return;}
    setStatus('Saving dataset...','loading');
    try{
      if(selectedDatasetId){
        await request('/datasets/'+encodeURIComponent(selectedDatasetId)+'/versions',{
          method:'POST',
          timeoutMs:10000,
          body:JSON.stringify({schema:'instruction-record-v1',change_note:'Saved from MMIR web UI',records:payload.records})
        });
      }else{
        await request('/datasets',{method:'POST',timeoutMs:10000,body:JSON.stringify(payload)});
      }
      selectedDatasetId='';
      await loadDatasets();
      setStatus('Dataset saved.','ready');
    }catch(error){
      setStatus(api.friendlyError(error),'error');
    }
  }

  async function deleteDataset(id){
    setStatus('Deleting dataset...','loading');
    try{
      await request('/datasets/'+encodeURIComponent(id),{method:'DELETE',timeoutMs:8000});
      if(selectedDatasetId===id)clearForm();
      await loadDatasets();
      setStatus('Dataset deleted.','ready');
    }catch(error){
      setStatus(api.friendlyError(error),'error');
    }
  }

  function clearForm(){
    selectedDatasetId='';
    records=[newRecord()];
    render();
    setStatus('');
  }

  window.addEventListener('mmir-workspace-changed',()=>{datasets=[];clearForm();});
  window.addEventListener('mmir-backend-profiles-updated',loadDatasets);
  render();
})();
