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

  function renderDescription(){
    if(!description||!modelSelect||!capacitySelect)return;
    const model=selectedModel();
    const capacity=selectedCapacity();
    const parts=[];
    if(model){
      parts.push((model.label||model.id)+': '+(model.best_for||model.notes||'Model guidance.'));
      if(model.access)parts.push('Access: '+model.access+'.');
      if(model.capacity_hint)parts.push('Suggested capacity: '+model.capacity_hint+'.');
    }
    if(capacity)parts.push('Capacity: '+(capacity.description||capacity.label||capacity.id)+'.');
    parts.push('Guidance only. The selected backend must actually provide the model.');
    description.textContent=parts.join(' ');
  }

  function applySuggestion(){
    if(!modelSelect)return;
    const model=selectedModel();
    if(model&&model.id!=='custom'){
      if(modelNotes)modelNotes.value=model.label||model.id;
      if(capacityNotes){
        const note=[model.access?('Access: '+model.access):'',model.capacity_hint?('Capacity: '+model.capacity_hint):''].filter(Boolean).join(' · ');
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
    libraryGrid.innerHTML=models.map(model=>'<article class="model-card"><div class="model-card-header"><h3>'+safe(model.label||model.id)+'</h3><span>'+safe(model.access||'model')+'</span></div><p>'+safe(model.best_for||model.notes||'Model option for a compatible backend.')+'</p><dl><div><dt>Category</dt><dd>'+safe(model.category||'general')+'</dd></div><div><dt>Capacity</dt><dd>'+safe(model.capacity_hint||'backend')+'</dd></div><div><dt>Size</dt><dd>'+safe(model.size_hint||'varies')+'</dd></div></dl><button type="button" data-id="'+safe(model.id)+'">Use as suggestion</button></article>').join('');
    libraryGrid.querySelectorAll('button[data-id]').forEach(button=>button.addEventListener('click',()=>chooseModel(button.getAttribute('data-id'))));
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
