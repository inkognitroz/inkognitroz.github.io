(function(){
  const d=document;
  const q=(selector)=>d.querySelector(selector);
  function setFeedback(message,state){
    const feedback=q('#composer-action-feedback');
    if(feedback){
      feedback.dataset.state=state||'idle';
      feedback.textContent=message;
    }
  }
  function focusPrompt(){
    const prompt=q('#mimir-prompt');
    if(!prompt)return;
    prompt.value='';
    prompt.dispatchEvent(new Event('input',{bubbles:true}));
    prompt.focus({preventScroll:true});
    window.MimirAutosizeComposer?.();
  }
  function startNewChat(){
    const clear=q('#runtime-clear');
    const busy=q('#runtime-stop')&&!q('#runtime-stop').disabled;
    if(busy){
      setFeedback('Stop the current answer before starting a new chat.','error');
      return;
    }
    if(clear)clear.click();
    focusPrompt();
    setFeedback('New local chat ready. Free guide/model routes stay available.','ready');
  }
  function bind(){
    const tools=q('.composer-tool-cluster');
    if(!tools||q('#composer-new-chat'))return false;
    const button=d.createElement('button');
    button.id='composer-new-chat';
    button.type='button';
    button.className='composer-icon-button composer-new-chat-button';
    button.textContent='New';
    button.setAttribute('aria-label','Start a new local chat');
    button.setAttribute('title','New chat');
    button.addEventListener('click',startNewChat);
    const addModel=q('#composer-add-model');
    if(addModel&&addModel.nextSibling)tools.insertBefore(button,addModel.nextSibling);
    else tools.appendChild(button);
    return true;
  }
  if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
  let checks=0;
  const timer=setInterval(()=>{if(bind()||++checks>24)clearInterval(timer);},250);
})();
