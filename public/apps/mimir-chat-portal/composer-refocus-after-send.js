(function(){
  const d=document,w=window;
  const q=(selector)=>d.querySelector(selector);
  let lastPromptFocusAt=0;
  function prompt(){return q('#mimir-prompt');}
  function desktopLike(){
    if(w.innerWidth<900)return false;
    return !(w.matchMedia&&w.matchMedia('(pointer: coarse)').matches);
  }
  function shouldRefocus(){
    const p=prompt();
    if(!p)return false;
    return desktopLike()||Date.now()-lastPromptFocusAt<4000;
  }
  function refocus(reason,delay){
    setTimeout(()=>{
      const p=prompt();
      if(!p||!shouldRefocus())return;
      p.focus({preventScroll:true});
      window.MimirAutosizeComposer?.();
      w.dispatchEvent(new CustomEvent('mmir-composer-refocused',{detail:{reason,no_paid_routes_started:true}}));
    },delay||90);
  }
  d.addEventListener('focusin',(event)=>{
    if(event.target&&event.target.id==='mimir-prompt')lastPromptFocusAt=Date.now();
  },true);
  d.addEventListener('click',(event)=>{
    if(event.target?.closest?.('#primary-chat-link'))refocus('primary-chat-action',120);
  },true);
  d.addEventListener('submit',(event)=>{
    if(event.target?.classList?.contains('mimir-composer'))refocus('composer-submit',120);
  },true);
  d.addEventListener('keydown',(event)=>{
    if(event.target&&event.target.id==='mimir-prompt'&&event.key==='Enter'&&!event.shiftKey&&!event.isComposing)refocus('enter-send',160);
  },true);
})();
