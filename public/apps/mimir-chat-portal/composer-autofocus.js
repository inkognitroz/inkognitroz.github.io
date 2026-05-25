(function(){
  const d=document,w=window;
  const q=(selector)=>d.querySelector(selector);
  let userInteracted=false;
  function markInteraction(){userInteracted=true;}
  ['pointerdown','touchstart','keydown'].forEach((type)=>d.addEventListener(type,markInteraction,{once:true,capture:true}));
  function eligible(){
    const prompt=q('#mimir-prompt');
    if(!prompt||prompt.value.trim()||userInteracted)return false;
    if(location.hash&&location.hash!=='#mimir-prompt')return false;
    if(d.activeElement&&d.activeElement!==d.body&&d.activeElement!==d.documentElement)return false;
    if(w.innerWidth<900)return false;
    if(w.matchMedia&&w.matchMedia('(pointer: coarse)').matches)return false;
    return true;
  }
  function focusPrompt(){
    const prompt=q('#mimir-prompt');
    if(!eligible()||!prompt)return false;
    prompt.focus({preventScroll:true});
    prompt.dataset.autofocused='true';
    window.MimirAutosizeComposer?.();
    w.dispatchEvent(new CustomEvent('mmir-composer-autofocused',{detail:{source:'deferred-autofocus',no_paid_routes_started:true}}));
    return true;
  }
  function schedule(delay){setTimeout(focusPrompt,delay);}
  if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',()=>schedule(180),{once:true});else schedule(180);
  w.addEventListener('load',()=>schedule(420),{once:true});
})();
