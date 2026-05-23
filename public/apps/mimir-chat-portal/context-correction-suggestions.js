(function(){
  const WORKSPACE_KEY='mimir-active-workspace-v1';
  const DEFAULT_WORKSPACE_ID='personal';
  const CORRECTION_PREFIX='mimir-context-corrections-v1:';

  function workspaceId(){return localStorage.getItem(WORKSPACE_KEY)||DEFAULT_WORKSPACE_ID;}
  function key(){return CORRECTION_PREFIX+workspaceId();}
  function readCorrections(){
    try{
      const value=JSON.parse(localStorage.getItem(key())||'[]');
      return Array.isArray(value)?value.filter(item=>item?.id&&!item.undone_at).slice(0,40):[];
    }catch(error){return [];}
  }
  function suggestionSet(target){
    const items=readCorrections().filter(item=>item.target===target);
    const disabled=items.filter(item=>item.action==='disable-source');
    const cleared=items.filter(item=>item.action==='clear-focus');
    const sourceTotal=disabled.reduce((sum,item)=>sum+Math.max(0,Math.round(Number(item.source_count)||0)),0);
    const suggestions=[];
    if(target==='memory'&&disabled.length){
      suggestions.push({id:'memory-scope-expiry',label:'Narrow memory scope',detail:'Review disabled memory and add project/chat scope, expiry or review notes before re-enabling.',target:'#memory-panel'});
    }
    if(target==='memory'&&disabled.length>=2){
      suggestions.push({id:'memory-import-review',label:'Review memory imports',detail:'Repeated memory corrections usually mean imported notes need cleanup before they influence answers.',target:'#memory-panel'});
    }
    if(target==='knowledge'&&disabled.length){
      suggestions.push({id:'knowledge-source-review',label:'Review source collection',detail:'Check the disabled knowledge source, then split stale files or keep the collection off for chat.',target:'#knowledge-panel'});
    }
    if(target==='knowledge'&&sourceTotal>=3){
      suggestions.push({id:'knowledge-collection-split',label:'Split broad collection',detail:'Several corrected sources point to a broad collection. Split project docs from drafts or old notes.',target:'#knowledge-panel'});
    }
    if(cleared.length>=3){
      suggestions.push({id:target+'-focus-friction',label:'Reduce focus noise',detail:'Frequent clear-focus actions mean source receipts may need tighter filters before correction.',target:target==='memory'?'#memory-panel':'#knowledge-panel'});
    }
    return suggestions.slice(0,3);
  }
  function renderTarget(target){
    const anchor=document.getElementById(target+'-correction-trail');
    if(!anchor)return;
    let panel=document.getElementById(target+'-correction-suggestions');
    if(!panel){
      panel=document.createElement('div');
      panel.id=target+'-correction-suggestions';
      panel.className='context-correction-suggestions';
      panel.setAttribute('aria-live','polite');
      anchor.after(panel);
    }
    const suggestions=suggestionSet(target);
    panel.hidden=!suggestions.length;
    panel.innerHTML='';
    suggestions.forEach(suggestion=>{
      const article=document.createElement('article');
      article.dataset.contextSuggestion=suggestion.id;
      const strong=document.createElement('strong');
      strong.textContent=suggestion.label;
      const detail=document.createElement('small');
      detail.textContent=suggestion.detail;
      const button=document.createElement('button');
      button.type='button';
      button.textContent='Review';
      button.addEventListener('click',()=>{
        const targetEl=document.querySelector(suggestion.target);
        if(targetEl?.tagName==='DETAILS')targetEl.open=true;
        targetEl?.scrollIntoView({behavior:'smooth',block:'start'});
        (targetEl?.querySelector('summary,button,input,textarea,select')||targetEl)?.focus?.({preventScroll:true});
        window.dispatchEvent(new CustomEvent('mmir-context-correction-suggestion-opened',{detail:{workspace_id:workspaceId(),target, suggestion_id:suggestion.id,no_paid_routes_started:true,raw_prompt_stored:false,raw_response_stored:false}}));
      });
      article.append(strong,detail,button);
      panel.appendChild(article);
    });
  }
  function render(){renderTarget('memory');renderTarget('knowledge');}

  window.MimirContextCorrectionSuggestions={readCorrections,suggestionSet,render};
  window.addEventListener('mmir-context-corrections-updated',render);
  window.addEventListener('mmir-workspace-changed',render);
  window.addEventListener('storage',render);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',render);else render();
})();
