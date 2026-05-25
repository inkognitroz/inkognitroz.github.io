(function(){
  const d=document;
  const near=(el)=>el.scrollHeight-el.scrollTop-el.clientHeight<48;
  function bind(){
    const transcript=d.getElementById('runtime-transcript');
    if(!transcript||transcript.dataset.mimirScrollGuard==='1')return false;
    transcript.dataset.mimirScrollGuard='1';
    const button=d.createElement('button');
    button.type='button';
    button.className='runtime-scroll-latest';
    button.textContent='Latest';
    button.setAttribute('aria-label','Jump to latest chat message');
    button.hidden=true;
    transcript.parentNode.insertBefore(button,transcript.nextSibling);
    let pinned=true;
    let restoreTop=0;
    function updateButton(){
      button.hidden=pinned||transcript.dataset.empty==='true';
      transcript.dataset.pinned=String(pinned);
    }
    function toBottom(){
      pinned=true;
      requestAnimationFrame(()=>{
        transcript.scrollTop=transcript.scrollHeight;
        updateButton();
      });
    }
    transcript.addEventListener('scroll',()=>{
      pinned=near(transcript);
      if(!pinned)restoreTop=transcript.scrollTop;
      updateButton();
    },{passive:true});
    button.addEventListener('click',toBottom);
    new MutationObserver(()=>{
      if(pinned){toBottom();return;}
      const top=restoreTop;
      requestAnimationFrame(()=>{
        transcript.scrollTop=top;
        updateButton();
      });
    }).observe(transcript,{childList:true,subtree:true,characterData:true});
    updateButton();
    return true;
  }
  if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
  let checks=0;
  const timer=setInterval(()=>{if(bind()||++checks>24)clearInterval(timer);},250);
})();
