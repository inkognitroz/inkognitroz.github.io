(function(){
  const modelSelect=document.getElementById('backend-model-catalog');
  const capacitySelect=document.getElementById('backend-capacity-profile');
  const modelNotes=document.getElementById('backend-models');
  const capacityNotes=document.getElementById('backend-cost');
  const description=document.getElementById('model-catalog-description');
  const libraryGrid=document.getElementById('model-library-grid');
  const backendSettings=document.getElementById('backend-settings');
  let catalog={models:[],capacity_profiles:[]};

  function safe(value){return String(value||'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');}
  function selectedModel(){return catalog.models.find(item=>item.id===modelSelect.value)||catalog.models[0]||null;}
  function selectedCapacity(){return catalog.capacity_profiles.find(item=>item.id===capacitySelect.value)||null;}
  function statusClass(status){return 'model-status-'+String(status||'unknown').replace(/[^a-z0-9-]/gi,'-').toLowerCase();}
  function statusLabel(status){return String(status||'unknown').replaceAll('-',' ');}
  function isUnavailable(model){return ['planned','future','requires-backend-router','requires-paid-capacity'].includes(String(model.status||''));}

  function renderDescription(){
    if(!description||!modelSelect||!capacitySelect)return;
    const model=selectedModel();
    const capacity=selectedCapacity();
    const parts=[];
    if(model){
      parts.push((model.label||model.id)+': '+(model.best_for||model.notes||'Model guidance.'));
      if(model.status)parts.push('Status: '+statusLabel(model.status)+'.');
      if(model.access)parts.push('Access: '+model.access+'.');
      if(model.license)parts.push('License: '+model.license+'.');
      if(model.capacity_hint)parts.push('Suggested capacity: '+model.capacity_hint+'.');
    }
    if(capacity)parts.push('Capacity: '+(capacity.description||capacity.label||capacity.id)+'.');
    parts.push('Guidance only. The selected backend must actually provide the model. API keys and provider secrets belong server-side.');
    description.textContent=parts.join(' ');
  }

  function applySuggestion(){
    if(!modelSelect)return;
    const model=selectedModel();
    if(model&&model.id!=='custom'){
      if(modelNotes)modelNotes.value=model.label||model.id;
      if(capacityNotes){
        const note=[model.status?('Status: '+statusLabel(model.status)):'',model.access?('Access: '+model.access):'',model.license?('License: '+model.license):'',model.capacity_hint?('Capacity: '+model.capacity_hint):''].filter(Boolean).join(' · ');
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
        '<dl><div><dt>Category</dt><dd>'+safe(model.category||'general')+'</dd></div><div><dt>Capacity</dt><dd>'+safe(model.capacity_hint||'backend')+'</dd></div><div><dt>License</dt><dd>'+safe(model.license||'check required')+'</dd></div></dl>'+
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
      catalog={models:Array.isArray(data.models)?data.models:[],capacity_profiles:Array.isArray(data.capacity_profiles)?data.capacity_profiles:[]};
    }catch(error){
      catalog={models:[{id:'custom',label:'Custom / user supplied',best_for:'Use whatever the backend provides.'}],capacity_profiles:[]};
    }
    populate();
    if(modelSelect)modelSelect.addEventListener('change',applySuggestion);
    if(capacitySelect)capacitySelect.addEventListener('change',renderDescription);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
  else init();
})();
