(function(){
  const SELECTED_MODEL_KEY='mimir-chat-selected-model';
  const LIVE_MODELS_KEY='mimir-chat-live-models';
  let bound=false;

  function optionsOf(select){
    return Array.from(select.options||[]).map(option=>({
      id:String(option.value||''),
      label:String(option.textContent||option.value||'')
    })).filter(model=>model.id);
  }

  function rememberLiveModels(select){
    try{localStorage.setItem(LIVE_MODELS_KEY,JSON.stringify(optionsOf(select)));}catch(error){}
  }

  function applySavedModel(select){
    const saved=localStorage.getItem(SELECTED_MODEL_KEY)||'';
    if(!saved)return;
    const exists=Array.from(select.options||[]).some(option=>option.value===saved);
    if(exists)select.value=saved;
  }

  function emit(select){
    const model={id:String(select.value||''),label:String(select.selectedOptions?.[0]?.textContent||select.value||'')};
    window.dispatchEvent(new CustomEvent('mmir-active-model-changed',{detail:model}));
  }

  function bind(){
    if(bound)return true;
    const select=document.getElementById('runtime-model');
    if(!select)return false;
    bound=true;
    applySavedModel(select);
    rememberLiveModels(select);
    select.addEventListener('change',()=>{
      if(select.value)localStorage.setItem(SELECTED_MODEL_KEY,select.value);
      rememberLiveModels(select);
      emit(select);
    });
    const observer=new MutationObserver(()=>{
      applySavedModel(select);
      rememberLiveModels(select);
      emit(select);
    });
    observer.observe(select,{childList:true});
    emit(select);
    return true;
  }

  function init(){
    if(bind())return;
    const observer=new MutationObserver(()=>{if(bind())observer.disconnect();});
    observer.observe(document.body,{childList:true,subtree:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
