(function(){
  const d=document,w=window,max=220;
  function prompt(){return d.getElementById('mimir-prompt');}
  function resize(){
    const el=prompt();
    if(!el)return false;
    el.style.resize='none';
    el.style.overflowY='hidden';
    el.style.height='auto';
    const limit=Number(el.dataset.autosizeMax||max);
    const next=Math.min(el.scrollHeight||0,limit);
    if(next)el.style.height=next+'px';
    el.style.overflowY=el.scrollHeight>limit?'auto':'hidden';
    return true;
  }
  function bind(){
    const el=prompt();
    if(!el||el.dataset.mimirAutosize==='1')return;
    el.dataset.mimirAutosize='1';
    ['input','change','focus'].forEach((name)=>el.addEventListener(name,resize));
    resize();
  }
  d.addEventListener('submit',(event)=>{
    if(event.target&&event.target.id==='mimir-chat-form')setTimeout(resize,80);
  },true);
  d.addEventListener('click',(event)=>{
    if(event.target?.closest?.('#primary-chat-link,[data-prompt-action],.composer-model-card button,.model-card button'))setTimeout(resize,140);
  },true);
  w.addEventListener('mmir-composer-autosize',resize);
  window.MimirAutosizeComposer=resize;
  if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
  let checks=0;
  const timer=setInterval(()=>{bind();resize();if(prompt()||++checks>12)clearInterval(timer);},250);
})();
