(function(){
  const d=document;
  const q=(selector)=>d.querySelector(selector);
  function canStop(){
    const stop=q('#runtime-stop');
    return Boolean(stop&&!stop.disabled);
  }
  function update(){
    const primary=q('#primary-chat-link');
    if(!primary)return false;
    const stopping=canStop();
    primary.classList.toggle('is-stopping',stopping);
    primary.dataset.composerStopReady=String(stopping);
    primary.textContent=stopping?'\u25a0':'\u2191';
    primary.setAttribute('aria-disabled','false');
    primary.setAttribute('aria-label',stopping?'Stop current response':'Send prompt to the active MMIR route');
    primary.setAttribute('title',stopping?'Stop':'Send');
    return true;
  }
  function bind(){
    const primary=q('#primary-chat-link');
    if(primary&&primary.dataset.mimirStopHandoff!=='1'){
      primary.dataset.mimirStopHandoff='1';
      primary.addEventListener('click',(event)=>{
        if(!canStop())return;
        event.preventDefault();
        event.stopImmediatePropagation();
        q('#runtime-stop')?.click();
        update();
      },true);
    }
    const stop=q('#runtime-stop');
    if(stop&&stop.dataset.mimirStopHandoff!=='1'){
      stop.dataset.mimirStopHandoff='1';
      new MutationObserver(update).observe(stop,{attributes:true,attributeFilter:['disabled']});
    }
    update();
  }
  d.addEventListener('click',(event)=>{
    if(event.target?.closest?.('#primary-chat-link,#runtime-stop'))setTimeout(update,60);
  },true);
  if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
  let checks=0;
  const timer=setInterval(()=>{bind();if(q('#primary-chat-link')&&q('#runtime-stop')||++checks>24)clearInterval(timer);},250);
})();
