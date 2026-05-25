(function(){
  const d=document;
  const q=(selector)=>d.querySelector(selector);
  function canStop(){
    const stop=q('#runtime-stop');
    return Boolean(stop&&!stop.disabled);
  }
  function focusPrompt(){
    const prompt=q('#mimir-prompt');
    if(!prompt)return false;
    prompt.focus({preventScroll:true});
    window.MimirAutosizeComposer?.();
    return true;
  }
  d.addEventListener('keydown',(event)=>{
    if(event.defaultPrevented||event.isComposing)return;
    if(event.key==='Escape'&&canStop()){
      event.preventDefault();
      q('#runtime-stop')?.click();
      return;
    }
    if((event.ctrlKey||event.metaKey)&&!event.altKey&&event.key.toLowerCase()==='k'){
      if(focusPrompt())event.preventDefault();
    }
  },true);
})();
