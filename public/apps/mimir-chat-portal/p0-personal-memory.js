(function(){
  'use strict';
  const TYPES=['note','fact','preference','task'];
  const MAX_TEXT=1000;
  const MAX_LIST=30;
  let dialog=null;
  let selectedId='';
  let gate=0;
  let canUseRemote=()=>false;
  let mutations=Promise.resolve();

  function api(){return window.MimirApiClient;}
  function text(value,max=MAX_TEXT){return String(value||'').replace(/\s+/g,' ').trim().slice(0,max);}
  function clear(node){while(node?.firstChild)node.removeChild(node.firstChild);}
  function status(message,error=false){
    const node=dialog?.querySelector('[data-personal-memory-status]');
    if(node){node.textContent=message;node.dataset.state=error?'error':'ready';}
  }
  async function request(path,options={}){
    const client=api();
    if(!canUseRemote())throw new Error('Personal cloud storage is unavailable in private or superprivate mode.');
    if(!client?.personalMemoryRequest)throw new Error('Personal storage is unavailable in this public chat.');
    return client.personalMemoryRequest(path,{...options,identityFetch:window.fetch});
  }
  async function consent(){
    const body=await request('/consent',{method:'GET',headers:{Accept:'application/json'}});
    if(body?.object!=='consent'||typeof body.memory!=='boolean')throw new Error('Personal storage returned an invalid consent response.');
    return body.memory;
  }
  function mutate(task){const next=mutations.then(task,task);mutations=next.catch(()=>{});return next;}
  function controls(enabled,known=true){
    dialog?.querySelectorAll('[data-personal-memory-requires-consent]').forEach(node=>{node.disabled=!enabled;});
    const label=dialog?.querySelector('[data-personal-memory-state]');
    if(label)label.textContent=enabled?'Remote storage is enabled for this anonymous tab session.':(known?'Remote storage is off. Local /remember stays in this browser.':'Remote storage state is unknown. Nothing will be copied into chat.');
  }
  function itemButton(item){
    const button=document.createElement('button');
    button.type='button'; button.className='p0-menu-button'; button.dataset.personalMemoryId=item.id;
    button.textContent=(item.type||'note')+': '+text(item.text,120);
    button.addEventListener('click',()=>{selectedId=item.id; dialog.querySelectorAll('[data-personal-memory-id]').forEach(node=>node.dataset.selected=String(node.dataset.personalMemoryId===selectedId)); status('Selected note. Choose “Use in next message” to copy it into the composer.');});
    return button;
  }
  async function refresh(){
    const token=++gate;
    status('Checking remote storage…');
    try{
      const enabled=await consent();
      if(token!==gate)return;
      controls(enabled);
      const list=dialog.querySelector('[data-personal-memory-list]'); clear(list);
      const body=await request('/memory',{method:'GET',headers:{Accept:'application/json'}});
      if(token!==gate)return;
      if(body?.object!=='list'||!Array.isArray(body.data))throw new Error('Personal storage returned an invalid memory list.');
      const items=body.data.slice(-MAX_LIST);
      if(!items.length){status(enabled?'No remote personal memory saved for this tab session yet.':'Storage is off. Saved notes remain inspectable and deletable.');return;}
      items.forEach(item=>{if(item?.id&&TYPES.includes(item.type)&&text(item.text))list.appendChild(itemButton(item));});
      status(enabled?'Remote personal memory refreshed.':'Storage is off. Saved notes remain inspectable and deletable.');
    }catch(error){controls(false,false);status(error.message||'Remote storage state is unavailable.',true);}
  }
  function enable(){return mutate(async()=>{
    const token=++gate; status('Enabling remote storage…');
    try{
      await request('/consent',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({memory:true})});
      if(token!==gate||!canUseRemote())return;
      const enabled=await consent();
      if(token!==gate||!canUseRemote())return;
      if(!enabled)throw new Error('Storage enablement was not confirmed.');
      controls(true); status('Remote storage enabled. Save only notes you want this anonymous tab session to use.');
    }catch(error){controls(false,false);status(error.message||'Storage was not enabled.',true);}
  });}
  function disable(){
    ++gate; selectedId=''; controls(false); status('Disabling remote storage…');
    return mutate(async()=>{
    try{
      await request('/consent',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({memory:false})});
      if(await consent())throw new Error('Storage disablement was not confirmed.');
      status('Remote storage disabled. Saved notes were not deleted and nothing will be copied into chat.');
    }catch(error){status(error.message||'Could not confirm disablement; nothing will be copied into chat.',true);}
    });}
  async function save(){
    const input=dialog.querySelector('[data-personal-memory-text]');
    const value=text(input?.value);
    const type=dialog.querySelector('[data-personal-memory-type]')?.value;
    if(!value||!TYPES.includes(type)){status('Enter a note and choose a supported type.',true);return;}
    return mutate(async()=>{
    try{
      if(!await consent()){controls(false);status('Storage is off; note was not sent.',true);return;}
      status('Saving remote note…');
      const created=await request('/memory',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:value,type,tags:[]})});
      if(created?.object!=='memory'||!created?.data?.id||created.data.type!==type||text(created.data.text)!==value)throw new Error('Personal storage returned an invalid saved note.');
      if(!canUseRemote()||!(await consent()))throw new Error('Storage changed; note was not claimed as saved.');
      if(text(input?.value)===value)input.value=''; status('Remote note saved.'); await refresh();
    }catch(error){status(error.message||'Note was not saved.',true);}
    });
  }
  async function remove(){
    const id=selectedId;
    if(!id){status('Select a saved note first.',true);return;}
    return mutate(async()=>{
    status('Deleting selected note…');
    try{const deleted=await request('/memory/'+encodeURIComponent(id),{method:'DELETE'});if(deleted?.object!=='memory.deleted'||deleted.id!==id||deleted.deleted!==true)throw new Error('Personal storage returned an invalid delete response.');if(selectedId===id)selectedId='';status('Selected remote note deleted.');await refresh();}
    catch(error){status(error.message||'Note was not deleted.',true);}
    });
  }
  async function useSelected(){
    const id=selectedId, token=gate;
    if(!id){status('Select a saved note first.',true);return;}
    status('Checking consent before copying…');
    try{
      const initialConsent=await consent();
      if(!initialConsent||token!==gate||!canUseRemote()){controls(false);status('Storage is off; nothing was copied.',true);return;}
      const body=await request('/memory/'+encodeURIComponent(id),{method:'GET',headers:{Accept:'application/json'}});
      const finalConsent=await consent();
      if(token!==gate||!finalConsent||!canUseRemote()){controls(false);status('Storage changed; nothing was copied.',true);return;}
      const note=text(body?.data?.text);
      if(body?.object!=='memory'||body?.data?.id!==id||!TYPES.includes(body?.data?.type)||!note){status('Selected note is unavailable.',true);return;}
      const composer=document.getElementById('p0-input');
      if(!composer){status('Composer is unavailable.',true);return;}
      const labelled='[Personal memory you selected: "'+note.replaceAll('"','\\"')+'"]';
      composer.value=(composer.value?composer.value+'\n\n':'')+labelled;
      composer.dispatchEvent(new Event('input',{bubbles:true})); composer.focus(); dialog.close();
    }catch(error){status(error.message||'Nothing was copied.',true);}
  }
  function button(label,action,requires=false){const node=document.createElement('button');node.type='button';node.textContent=label;node.dataset.personalMemoryAction=action;if(requires)node.dataset.personalMemoryRequiresConsent='';return node;}
  function build(){
    dialog=document.createElement('dialog'); dialog.className='p0-menu'; dialog.setAttribute('aria-label','Personal memory');
    dialog.innerHTML='<h2>Personal memory</h2><p>Remote notes are stored at MMIR for this anonymous tab session. Closing this session can lose access; this is not account or cross-device recovery.</p><p data-personal-memory-state></p><label>Type <select data-personal-memory-type><option value="note">Note</option><option value="fact">Fact</option><option value="preference">Preference</option><option value="task">Task</option></select></label><label>Note <textarea data-personal-memory-text maxlength="1000" rows="3"></textarea></label><div data-personal-memory-actions></div><div data-personal-memory-list></div><p data-personal-memory-status aria-live="polite"></p>';
    const actions=dialog.querySelector('[data-personal-memory-actions]');
    [['Enable remote storage','enable',false],['Save note','save',true],['Refresh','refresh',false],['Use in next message','use',true],['Delete selected','delete',false],['Disable remote storage','disable',false],['Close','close',false]].forEach(([label,action,requires])=>actions.appendChild(button(label,action,requires)));
    actions.addEventListener('click',event=>{const action=event.target?.dataset?.personalMemoryAction;if(action==='enable')enable();if(action==='save')save();if(action==='refresh')refresh();if(action==='use')useSelected();if(action==='delete')remove();if(action==='disable')disable();if(action==='close')dialog.close();});
    (document.getElementById('mmir-p0-app')||document.body).appendChild(dialog);
    dialog.addEventListener('close',()=>{gate+=1;});
    dialog.addEventListener('cancel',()=>{gate+=1;});
  }
  async function open(options={}){if(!dialog)build();canUseRemote=typeof options.canUseRemote==='function'?options.canUseRemote:()=>false;dialog.showModal();controls(false);if(!canUseRemote()){status('Personal cloud storage is unavailable in private or superprivate mode.',true);return;}await refresh();}
  window.MmirP0PersonalMemory=Object.freeze({open});
})();
