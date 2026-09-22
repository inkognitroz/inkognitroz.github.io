(function(){
  'use strict';
  // The backend owns what a mission is and what it may do next (product-api.yaml,
  // /missions). This panel shows what the API returns and sends the transitions the
  // user picks. It decides nothing: no state machine, no local mission store, and no
  // wording of its own for a refusal — the API's message is what the user reads.
  const MAX_TITLE=200;
  const MAX_BRIEF=4000;
  const MAX_LIST=30;
  const WORKSPACE_KEY='mimir-active-workspace-v1';
  const DEFAULT_WORKSPACE_ID='personal';
  // Used only until an envelope carries its own action list. The API validates every
  // action anyway (400 with its own sentence naming the allowed ones), so a name that
  // stops being legal is refused by the backend, not hidden by this constant. When the
  // envelope starts carrying allowed_actions, the list below is never read again and a
  // new action appears here without a frontend change.
  const FALLBACK_ACTIONS=['pause','resume','complete','cancel'];
  let dialog=null;
  let selectedId='';
  let gate=0;
  let canUseRemote=()=>false;
  let writes=Promise.resolve();

  function api(){return window.MimirApiClient;}
  function text(value,max=MAX_TITLE){return String(value||'').trim().slice(0,max);}
  function clear(node){while(node?.firstChild)node.removeChild(node.firstChild);}
  function status(message,error=false){
    const node=dialog?.querySelector('[data-missions-status]');
    if(node){node.textContent=message;node.dataset.state=error?'error':'ready';}
  }
  function detail(message,error=false){
    const node=dialog?.querySelector('[data-missions-detail-status]');
    if(node){node.textContent=message;node.dataset.state=error?'error':'ready';}
  }
  function activeWorkspaceId(){
    try{return localStorage.getItem(WORKSPACE_KEY)||DEFAULT_WORKSPACE_ID;}
    catch(error){return DEFAULT_WORKSPACE_ID;}
  }
  async function request(path,options={}){
    const client=api();
    if(!canUseRemote())throw new Error('Missions are unavailable in private or superprivate mode.');
    if(!client?.personalMemoryRequest)throw new Error('Missions are unavailable in this public chat.');
    return client.personalMemoryRequest(path,{...options,identityFetch:window.fetch});
  }
  async function consent(){
    const body=await request('/consent',{method:'GET',headers:{Accept:'application/json'}});
    if(body?.object!=='consent'||typeof body.memory!=='boolean')throw new Error('Missions storage returned an invalid consent response.');
    return body.memory;
  }
  function write(task){const next=writes.then(task,task);writes=next.catch(()=>{});return next;}
  function controls(enabled){
    dialog?.querySelectorAll('[data-missions-requires-consent]').forEach(node=>{node.disabled=!enabled;});
    const label=dialog?.querySelector('[data-missions-state]');
    if(label)label.textContent=enabled
      ?'Remote storage is on, so missions can be created and moved.'
      :'Remote storage is off. Missions stay readable; creating or moving one needs storage on.';
  }
  function missionButton(summary){
    const button=document.createElement('button');
    button.type='button'; button.className='p0-menu-button'; button.dataset.missionId=summary.id;
    const count=Number(summary.transition_count);
    button.textContent=text(summary.title,120)+' — '+text(summary.state,40)
      +(Number.isFinite(count)?' · '+count+' '+(count===1?'transition':'transitions'):'');
    button.addEventListener('click',()=>{open_(summary.id);});
    return button;
  }
  function actionButton(action){
    const button=document.createElement('button');
    button.type='button'; button.textContent=text(action,40);
    button.dataset.missionAction=action; button.dataset.missionsRequiresConsent='';
    button.addEventListener('click',()=>{transition(action);});
    return button;
  }
  // The envelope decides which buttons exist; the fallback only applies until it says.
  function actionsFor(envelope){
    const advertised=envelope?.data?.allowed_actions||envelope?.allowed_actions;
    const list=Array.isArray(advertised)?advertised.map(item=>text(item,40)).filter(Boolean):[];
    return list.length?list:FALLBACK_ACTIONS;
  }
  function chainBadge(envelope){
    const node=dialog?.querySelector('[data-missions-chain]');
    if(!node)return;
    const chain=envelope?.chain;
    if(!chain||typeof chain.verified!=='boolean'){
      node.textContent='Receipt chain: not reported';
      node.dataset.state='unknown';
      return;
    }
    node.textContent=chain.verified?'Receipt chain: verified':'Receipt chain: broken — '+text(chain.reason||'no reason given',120);
    node.dataset.state=chain.verified?'verified':'broken';
  }
  function renderMission(envelope){
    const data=envelope?.data||{};
    const heading=dialog.querySelector('[data-missions-detail-title]');
    if(heading)heading.textContent=text(data.title,120)+' — '+text(data.state,40);
    chainBadge(envelope);
    const brief=dialog.querySelector('[data-missions-brief]');
    if(brief)brief.textContent=text(data.brief,MAX_BRIEF);
    const steps=dialog.querySelector('[data-missions-steps]');
    clear(steps);
    (Array.isArray(data.steps)?data.steps:[]).slice(0,MAX_LIST).forEach(step=>{
      const item=document.createElement('li');
      item.textContent=typeof step==='string'?text(step,500):text(step?.text||step?.title||JSON.stringify(step),500);
      steps?.appendChild(item);
    });
    const history=dialog.querySelector('[data-missions-transitions]');
    clear(history);
    (Array.isArray(data.transitions)?data.transitions:[]).slice(-MAX_LIST).forEach(receipt=>{
      const item=document.createElement('li');
      item.textContent=text(receipt?.action,40)+': '+text(receipt?.from,40)+' → '+text(receipt?.to,40)+' · '+text(receipt?.at,40);
      history?.appendChild(item);
    });
    const actions=dialog.querySelector('[data-missions-actions]');
    clear(actions);
    actionsFor(envelope).forEach(action=>actions?.appendChild(actionButton(action)));
  }
  async function refresh(){
    const token=++gate;
    status('Reading missions…');
    try{
      const enabled=await consent();
      if(token!==gate)return;
      controls(enabled);
      const body=await request('/missions?workspace_id='+encodeURIComponent(activeWorkspaceId()),{method:'GET',headers:{Accept:'application/json'}});
      if(token!==gate)return;
      if(!Array.isArray(body?.data))throw new Error('Missions storage returned an invalid list.');
      const list=dialog.querySelector('[data-missions-list]');
      clear(list);
      const missions=body.data.filter(item=>item?.id&&item?.state).slice(-MAX_LIST);
      missions.forEach(item=>list.appendChild(missionButton(item)));
      status(missions.length?missions.length+' '+(missions.length===1?'mission':'missions')+'.':'No missions for this session yet.');
    }catch(error){if(token===gate){controls(false);status(error.message||'Missions are unavailable.',true);}}
  }
  async function open_(id){
    const token=++gate;
    selectedId=id;
    detail('Reading mission…');
    try{
      const envelope=await request('/missions/'+encodeURIComponent(id),{method:'GET',headers:{Accept:'application/json'}});
      if(token!==gate||selectedId!==id)return;
      if(!envelope?.data?.id)throw new Error('Missions storage returned an invalid mission.');
      renderMission(envelope);
      detail('');
    }catch(error){if(token===gate)detail(error.message||'The mission could not be read.',true);}
  }
  async function create(){
    const titleInput=dialog.querySelector('[data-missions-title]');
    const briefInput=dialog.querySelector('[data-missions-new-brief]');
    const title=text(titleInput?.value,MAX_TITLE);
    const brief=text(briefInput?.value,MAX_BRIEF);
    if(!title){status('Give the mission a title first.',true);return;}
    return write(async()=>{
    try{
      status('Creating mission…');
      const body={workspace_id:activeWorkspaceId(),title};
      if(brief)body.brief=brief;
      const envelope=await request('/missions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      if(!envelope?.data?.id)throw new Error('Missions storage returned an invalid created mission.');
      if(text(titleInput?.value,MAX_TITLE)===title)titleInput.value='';
      if(text(briefInput?.value,MAX_BRIEF)===brief&&briefInput)briefInput.value='';
      status('Mission created.');
      await refresh();
      await open_(envelope.data.id);
    }catch(error){status(error.message||'The mission was not created.',true);}
    });
  }
  // Whether an action is allowed from the mission's current state is the backend's
  // decision, so this sends it and shows whatever comes back.
  async function transition(action){
    const id=selectedId;
    if(!id){detail('Open a mission first.',true);return;}
    return write(async()=>{
    detail('Sending '+text(action,40)+'…');
    try{
      const envelope=await request('/missions/'+encodeURIComponent(id)+'/transitions',{
        method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action})
      });
      if(!envelope?.data?.id)throw new Error('Missions storage returned an invalid transition result.');
      renderMission(envelope);
      detail('');
      await refresh();
    }catch(error){detail(error.message||'The mission did not move.',true);}
    });
  }
  function build(){
    dialog=document.createElement('dialog'); dialog.className='p0-menu'; dialog.setAttribute('aria-label','Missions');
    dialog.innerHTML='<h2>Missions</h2><p>A mission is work that survives being interrupted. Its state and its transition receipts are stored at MMIR for this anonymous tab session.</p>'
      +'<p data-missions-state></p>'
      +'<label>Title <input type="text" data-missions-title maxlength="'+MAX_TITLE+'"></label>'
      +'<label>Brief <textarea data-missions-new-brief maxlength="'+MAX_BRIEF+'" rows="2"></textarea></label>'
      +'<div data-missions-create></div>'
      +'<div data-missions-list></div>'
      +'<p data-missions-status aria-live="polite"></p>'
      +'<h3 data-missions-detail-title>No mission opened</h3>'
      +'<p data-missions-chain></p>'
      +'<p data-missions-brief></p>'
      +'<ul data-missions-steps></ul>'
      +'<div data-missions-actions></div>'
      +'<ul data-missions-transitions></ul>'
      +'<p data-missions-detail-status aria-live="polite"></p>'
      +'<div data-missions-footer></div>';
    const create_=document.createElement('button');
    create_.type='button'; create_.textContent='Create mission';
    create_.dataset.missionsAction='create'; create_.dataset.missionsRequiresConsent='';
    create_.addEventListener('click',()=>{create();});
    dialog.querySelector('[data-missions-create]').appendChild(create_);
    const refreshButton=document.createElement('button');
    refreshButton.type='button'; refreshButton.textContent='Refresh';
    refreshButton.addEventListener('click',()=>{refresh();});
    const close=document.createElement('button');
    close.type='button'; close.textContent='Close';
    close.addEventListener('click',()=>{dialog.close();});
    dialog.querySelector('[data-missions-footer]').append(refreshButton,close);
    (document.getElementById('mmir-p0-app')||document.body).appendChild(dialog);
    const invalidate=()=>{++gate;selectedId='';};
    dialog.addEventListener('close',invalidate);
    dialog.addEventListener('cancel',invalidate);
  }
  async function open(options={}){
    if(!dialog)build();
    canUseRemote=typeof options.canUseRemote==='function'?options.canUseRemote:()=>false;
    dialog.showModal();
    controls(false);
    if(!canUseRemote()){status('Missions are unavailable in private or superprivate mode.',true);return;}
    await refresh();
  }
  window.MmirP0Missions=Object.freeze({open});
})();
