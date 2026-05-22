(function(){
  const api=window.MimirApiClient;
  const modelSelect=document.getElementById('backend-model-catalog');
  const capacitySelect=document.getElementById('backend-capacity-profile');
  const modelNotes=document.getElementById('backend-models');
  const capacityNotes=document.getElementById('backend-cost');
  const description=document.getElementById('model-catalog-description');
  const libraryGrid=document.getElementById('model-library-grid');
  const backendSettings=document.getElementById('backend-settings');
  let catalog={models:[],capacity_profiles:[],registry_models:[]};

  function safe(value){return String(value||'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');}
  function selectedModel(){return catalog.models.find(item=>item.id===modelSelect.value)||catalog.models[0]||null;}
  function selectedCapacity(){return catalog.capacity_profiles.find(item=>item.id===capacitySelect.value)||null;}
  function statusClass(status){return 'model-status-'+String(status||'unknown').replace(/[^a-z0-9-]/gi,'-').toLowerCase();}
  function statusLabel(status){return String(status||'unknown').replaceAll('-',' ');}
  function modelLicense(model){return model.license_name||model.license||'check required';}
  function commercialUse(model){return model.commercial_use||'check-required';}
  function isUnavailable(model){return ['planned','future','disabled','deprecated','requires-backend-router','requires-paid-provider','requires-paid-capacity'].includes(String(model.status||''));}

  function registryModelToCatalog(model){
    return {
      id:model.id,
      label:model.label||model.id,
      family:model.family||'Registry',
      provider_family:model.provider||'backend',
      category:(model.source==='active-provider'?'active backend':'registry'),
      access:model.source==='active-provider'?'active backend':'custom registry',
      status:model.status||'candidate',
      license_name:model.license||'check-required',
      commercial_use:model.commercial_use||'check-required',
      best_for:model.notes||'Model exposed by the protected backend registry.',
      capacity_hint:model.cost_class||'backend-default',
      size_hint:model.context_window?('context '+String(model.context_window)):'backend reported',
      ram_hint:'backend reported',
      gpu_hint:'backend reported',
      cpu_hint:'backend reported',
      context_hint:model.context_window?String(model.context_window):'backend reported',
      notes:model.notes||'Registry metadata from active backend.',
      registry_source:model.source||'backend'
    };
  }

  function mergeRegistryModels(baseModels,registryModels){
    const seen=new Set((baseModels||[]).map(model=>model.id));
    const mapped=(registryModels||[]).map(registryModelToCatalog).filter(model=>{
      if(!model.id||seen.has(model.id))return false;
      seen.add(model.id);
      return true;
    });
    return (baseModels||[]).concat(mapped);
  }

  async function fetchRegistryModels(){
    if(!api)return [];
    const profile=api.activeProfile();
    const url=api.cleanUrl(profile?.url);
    if(!profile||!url)return [];
    try{
      const token=await api.pairIfNeeded(profile,url);
      const data=await api.fetchJson(api.joinUrl(url,'/registry/models'),{
        method:'GET',
        headers:api.authHeaders(token),
        timeoutMs:5000
      });
      return Array.isArray(data?.data)?data.data:[];
    }catch(error){
      return [];
    }
  }

  function renderDescription(){
    if(!description||!modelSelect||!capacitySelect)return;
    const model=selectedModel();
    const capacity=selectedCapacity();
    const parts=[];
    if(model){
      parts.push((model.label||model.id)+': '+(model.best_for||model.notes||'Model guidance.'));
      if(model.status)parts.push('Status: '+statusLabel(model.status)+'.');
      if(model.access)parts.push('Access: '+model.access+'.');
      parts.push('License: '+modelLicense(model)+'.');
      parts.push('Commercial use: '+commercialUse(model)+'.');
      if(model.capacity_hint)parts.push('Suggested capacity: '+model.capacity_hint+'.');
      if(model.ram_hint)parts.push('RAM: '+model.ram_hint+'.');
      if(model.gpu_hint)parts.push('GPU: '+model.gpu_hint+'.');
    }
    if(capacity)parts.push('Capacity: '+(capacity.description||capacity.label||capacity.id)+'.');
    parts.push('Guidance only. Verify official model cards before production use. API keys and provider secrets belong server-side.');
    description.textContent=parts.join(' ');
  }

  function applySuggestion(){
    if(!modelSelect)return;
    const model=selectedModel();
    if(model&&model.id!=='custom'){
      if(modelNotes)modelNotes.value=model.label||model.id;
      if(capacityNotes){
        const note=[model.status?('Status: '+statusLabel(model.status)):'',model.access?('Access: '+model.access):'',('License: '+modelLicense(model)),('Commercial: '+commercialUse(model)),model.capacity_hint?('Capacity: '+model.capacity_hint):''].filter(Boolean).join(' - ');
        if(note)capacityNotes.value=note;
      }
      if(capacitySelect&&model.capacity_hint){
        const match=(catalog.capacity_profiles||[]).find(item=>item.id===model.capacity_hint);
        if(match)capacitySelect.value=match.id;
      }
    }
    renderDescription();
  }

  function chooseModel(id){
    if(modelSelect)modelSelect.value=id||'custom';
    applySuggestion();
    if(backendSettings)backendSettings.open=true;
  }

  function renderLibrary(){
    if(!libraryGrid)return;
    const models=(catalog.models||[]).filter(item=>item.id!=='custom');
    if(!models.length){libraryGrid.innerHTML='<p class="empty-backends">Model catalog is not available yet.</p>';return;}
    libraryGrid.innerHTML=models.map(model=>{
      const disabled=isUnavailable(model);
      const buttonLabel=disabled?'Requires protected backend':'Use as suggestion';
      return '<article class="model-card '+safe(statusClass(model.status))+'">'+
        '<div class="model-card-header"><h3>'+safe(model.label||model.id)+'</h3><span>'+safe(statusLabel(model.status||model.access||'model'))+'</span></div>'+
        '<p>'+safe(model.best_for||model.notes||'Model option for a compatible backend.')+'</p>'+
        '<dl><div><dt>Category</dt><dd>'+safe(model.category||'general')+'</dd></div><div><dt>Capacity</dt><dd>'+safe(model.capacity_hint||'backend')+'</dd></div><div><dt>License</dt><dd>'+safe(modelLicense(model))+'</dd></div><div><dt>Commercial</dt><dd>'+safe(commercialUse(model))+'</dd></div><div><dt>RAM</dt><dd>'+safe(model.ram_hint||'varies')+'</dd></div><div><dt>GPU</dt><dd>'+safe(model.gpu_hint||'varies')+'</dd></div></dl>'+
        '<button type="button" data-id="'+safe(model.id)+'" '+(disabled?'disabled aria-disabled="true"':'')+'>'+safe(buttonLabel)+'</button>'+
      '</article>';
    }).join('');
    libraryGrid.querySelectorAll('button[data-id]:not([disabled])').forEach(button=>button.addEventListener('click',()=>chooseModel(button.getAttribute('data-id'))));
  }

  function populate(){
    if(modelSelect){
      const models=catalog.models.length?catalog.models:[{id:'custom',label:'Custom / user supplied'}];
      modelSelect.innerHTML=models.map(item=>'<option value="'+safe(item.id)+'">'+safe(item.label||item.id)+'</option>').join('');
    }
    if(capacitySelect){
      const caps=[{id:'backend-default',label:'Backend default',description:'Use the backend default capacity.'}].concat(catalog.capacity_profiles||[]);
      capacitySelect.innerHTML=caps.map(item=>'<option value="'+safe(item.id)+'">'+safe(item.label||item.id)+'</option>').join('');
    }
    renderDescription();
    renderLibrary();
  }

  async function init(){
    try{
      const response=await fetch('./ai-model-catalog.json',{cache:'default'});
      if(!response.ok)throw new Error('catalog unavailable');
      const data=await response.json();
      const registryModels=await fetchRegistryModels();
      const staticModels=Array.isArray(data.models)?data.models:[];
      catalog={
        models:mergeRegistryModels(staticModels,registryModels),
        capacity_profiles:Array.isArray(data.capacity_profiles)?data.capacity_profiles:[],
        registry_models:registryModels
      };
    }catch(error){
      const registryModels=await fetchRegistryModels();
      catalog={
        models:mergeRegistryModels([{id:'custom',label:'Custom / user supplied',best_for:'Use whatever the backend provides.'}],registryModels),
        capacity_profiles:[],
        registry_models:registryModels
      };
    }
    populate();
    if(modelSelect)modelSelect.addEventListener('change',applySuggestion);
    if(capacitySelect)capacitySelect.addEventListener('change',renderDescription);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
  else init();
})();
