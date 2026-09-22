(function(){
  'use strict';
  const TYPES=['note','fact','preference','task'];
  // A note stays at 1000 characters: that is the memory contract's own limit.
  const MAX_TEXT=1000;
  // A document may be longer, up to what the knowledge store itself holds:
  // knowledge-store.js caps a document at 20000 characters with trim/slice
  // (mmir-orchestrator main 9d9d640, maxCharsPerDocument). Counted the same way
  // the store counts, in JS string units. The product API exposes no limit
  // field, so this is a documented feature constant, separate from MAX_TEXT,
  // not a second copy of the memory limit (ROOT, control#1299, 2026-09-22).
  const MAX_DOCUMENT_TEXT=20000;
  // A UTF-8 encoding never needs more than 3 bytes per JS string unit, so this
  // rejects a file that cannot fit before it is read, without guessing.
  const MAX_IMPORT_BYTES=MAX_DOCUMENT_TEXT*3;
  const MAX_LIST=30;
  const WORKSPACE_KEY='mimir-active-workspace-v1';
  const DEFAULT_WORKSPACE_ID='personal';
  let dialog=null;
  let selectedId='';
  let selectedDocumentId='';
  let selectedDocumentName='';
  let lastImportedName='';
  let gate=0;
  let consentIntent=0;
  let useSuspended=false;
  let canUseRemote=()=>false;
  let mutations=Promise.resolve();

  function api(){return window.MimirApiClient;}
  function text(value,max=MAX_TEXT){return String(value||'').trim().slice(0,max);}
  function clear(node){while(node?.firstChild)node.removeChild(node.firstChild);}
  function status(message,error=false){
    const node=dialog?.querySelector('[data-personal-memory-status]');
    if(node){node.textContent=message;node.dataset.state=error?'error':'ready';}
  }
  function searchStatus(message,error=false){
    const node=dialog?.querySelector('[data-personal-memory-search-status]');
    if(node){node.textContent=message;node.dataset.state=error?'error':'ready';}
  }
  function clearSearchResults(message=''){
    clear(dialog?.querySelector('[data-personal-memory-search-results]'));
    if(message)searchStatus(message);
  }
  function documentStatus(message,error=false){
    const node=dialog?.querySelector('[data-personal-knowledge-status]');
    if(node){node.textContent=message;node.dataset.state=error?'error':'ready';}
  }
  function clearDocumentResults(message=''){
    clear(dialog?.querySelector('[data-personal-knowledge-results]'));
    selectedDocumentId=''; selectedDocumentName='';
    if(message)documentStatus(message);
  }
  function activeWorkspaceId(){
    try{return localStorage.getItem(WORKSPACE_KEY)||DEFAULT_WORKSPACE_ID;}
    catch(error){return DEFAULT_WORKSPACE_ID;}
  }
  function clearSelection(){
    selectedId='';
    dialog?.querySelectorAll('[data-personal-memory-id]').forEach(node=>delete node.dataset.selected);
  }
  function importStatus(message,error=false){status(message,error);}
  function validTextFile(file){
    return file&&/\.txt$/i.test(String(file.name||''))&&(!file.type||file.type==='text/plain');
  }
  async function importTextFile(file){
    const input=dialog?.querySelector('[data-personal-memory-text]');
    const token=++gate;
    if(!validTextFile(file)){importStatus('Choose a UTF-8 plain-text .txt file.',true);return;}
    if(file.size>MAX_IMPORT_BYTES){importStatus('This file is too large. Import accepts up to '+MAX_DOCUMENT_TEXT+' characters / '+MAX_IMPORT_BYTES+' bytes without truncation.',true);return;}
    const before=String(input?.value||'');
    if(before&&window.confirm&&!window.confirm('Replace the current note draft with this local text file?')){importStatus('Import cancelled; the existing draft was kept.');return;}
    importStatus('Reading local text file…');
    try{
      const bytes=await file.arrayBuffer();
      if(token!==gate||!dialog?.open||!canUseRemote())return;
      const imported=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
      // Refused, never trimmed: an import that does not fit is told so before
      // anything is saved.
      if(imported.length>MAX_DOCUMENT_TEXT)throw new Error('This text is '+imported.length+' characters, longer than the '+MAX_DOCUMENT_TEXT+'-character document limit, and was not imported.');
      if(String(input?.value||'')!==before){importStatus('The note draft changed while the file was read; import was not applied.',true);return;}
      input.value=imported;
      input.dispatchEvent(new Event('input',{bubbles:true}));
      lastImportedName=text(file.name,160);
      const documentName=dialog?.querySelector('[data-personal-knowledge-name]');
      if(documentName&&!text(documentName.value))documentName.value=lastImportedName;
      importStatus(imported.length>MAX_TEXT
        ?'Local text imported into the draft ('+imported.length+' characters). It is longer than the '+MAX_TEXT+'-character note limit, so store it as a knowledge document.'
        :'Local text imported into the draft. Review it, then choose Save note to keep it as a note, or Save as knowledge document to store it as a document.');
    }catch(error){
      if(token===gate&&dialog?.open)importStatus(/was not imported\.$/.test(String(error?.message||''))?error.message:'Could not read this UTF-8 plain-text file.',true);
    }
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
    dialog?.querySelectorAll('[data-personal-memory-requires-consent]').forEach(node=>{node.disabled=!enabled||useSuspended;});
    const label=dialog?.querySelector('[data-personal-memory-state]');
    if(label)label.textContent=enabled&&useSuspended?'Disable requested. Nothing will be copied into chat.':(enabled?'Remote storage is enabled for this anonymous tab session.':(known?'Remote storage is off. Local /remember stays in this browser.':'Remote storage state is unknown. Nothing will be copied into chat.'));
  }
  function itemButton(item,lexical=false){
    const button=document.createElement('button');
    button.type='button'; button.className='p0-menu-button'; button.dataset.personalMemoryId=item.id;
    button.textContent=(item.type||'note')+': '+text(item.text,120);
    if(lexical){const detail=document.createElement('small');detail.textContent='Lexical match · '+(Number.isFinite(item.score)?'score '+item.score+' · ':'')+(Array.isArray(item.matched_terms)?'matched '+item.matched_terms.join(', ')+' · ':'')+text(item.why_used,240);button.appendChild(detail);}
    button.addEventListener('click',()=>{selectedId=item.id; dialog.querySelectorAll('[data-personal-memory-id]').forEach(node=>node.dataset.selected=String(node.dataset.personalMemoryId===selectedId)); status('Selected note. Choose “Use in next message” to copy it into the composer.');});
    return button;
  }
  async function search(){
    const input=dialog.querySelector('[data-personal-memory-query]');
    const query=text(input?.value);
    const token=++gate;
    clearSelection(); clearSearchResults();
    if(!query){searchStatus('Enter words to search saved notes.',true);return;}
    searchStatus('Searching saved notes…');
    try{
      const body=await request('/memory/search',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({query,limit:8})});
      if(token!==gate||!canUseRemote()||useSuspended)return;
      if(body?.object!=='list'||!Array.isArray(body.data))throw new Error('Personal storage returned an invalid search response.');
      const results=body.data.filter(item=>item?.id&&TYPES.includes(item.type)&&text(item.text));
      if(!results.length){searchStatus('No lexical matches.');return;}
      const container=dialog.querySelector('[data-personal-memory-search-results]');
      results.forEach(item=>container.appendChild(itemButton(item,true)));
      searchStatus(results.length+' lexical '+(results.length===1?'match':'matches')+'. This is word matching, not semantic search.');
    }catch(error){if(token===gate)searchStatus(error.message||'Search failed; saved notes were not changed.',true);}
  }
  function clearSearch(){
    ++gate; clearSelection();
    const input=dialog?.querySelector('[data-personal-memory-query]');
    if(input)input.value='';
    clearSearchResults('Search cleared.');
  }
  async function refresh(){
    const token=++gate;
    clearSelection(); clearSearchResults('Search results cleared by refresh.');
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
    }catch(error){if(token===gate){controls(false,false);status(error.message||'Remote storage state is unavailable.',true);}}
  }
  function enable(){
    const intent=++consentIntent;
    ++gate;
    return mutate(async()=>{
    status('Enabling remote storage…');
    try{
      await request('/consent',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({memory:true})});
      if(intent!==consentIntent||!canUseRemote())return;
      const enabled=await consent();
      if(intent!==consentIntent||!canUseRemote())return;
      if(!enabled)throw new Error('Storage enablement was not confirmed.');
      useSuspended=false;
      controls(true); status('Remote storage enabled. Save only notes you want this anonymous tab session to use.');
    }catch(error){controls(false,false);status(error.message||'Storage was not enabled.',true);}
  });}
  function disable(){
    ++gate; ++consentIntent; useSuspended=true; clearSelection(); clearSearchResults('Search cleared because remote storage was disabled.'); const query=dialog?.querySelector('[data-personal-memory-query]'); if(query)query.value=''; controls(false,false); status('Disabling remote storage…');
    return mutate(async()=>{
    try{
      await request('/consent',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({memory:false})});
      if(await consent())throw new Error('Storage disablement was not confirmed.');
      controls(false);
      status('Remote storage disabled. Saved notes were not deleted and nothing will be copied into chat.');
    }catch(error){controls(false,false);status(error.message||'Could not confirm disablement; nothing will be copied into chat.',true);}
    });}
  async function save(){
    const input=dialog.querySelector('[data-personal-memory-text]');
    const drafted=text(input?.value,MAX_DOCUMENT_TEXT);
    const value=text(input?.value);
    const type=dialog.querySelector('[data-personal-memory-type]')?.value;
    if(!value||!TYPES.includes(type)){status('Enter a note and choose a supported type.',true);return;}
    // A draft too long to be a note is refused here. Saving it would have
    // silently turned a document into its first 1000 characters.
    if(drafted.length>MAX_TEXT){status('This draft is '+drafted.length+' characters. A note holds '+MAX_TEXT+'; save it as a knowledge document instead.',true);return;}
    return mutate(async()=>{
    try{
      if(useSuspended){status('Storage disablement was requested; note was not sent.',true);return;}
      if(!await consent()){controls(false);status('Storage is off; note was not sent.',true);return;}
      status('Saving remote note…');
      const created=await request('/memory',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:value,type,tags:[]})});
      if(created?.object!=='memory.item'||!created?.data?.id||created.data.type!==type||text(created.data.text)!==value)throw new Error('Personal storage returned an invalid saved note.');
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
      if(token!==gate)return;
      if(!initialConsent||useSuspended||!canUseRemote()){controls(false);status('Storage is off; nothing was copied.',true);return;}
      const body=await request('/memory/'+encodeURIComponent(id),{method:'GET',headers:{Accept:'application/json'}});
      if(token!==gate)return;
      const finalConsent=await consent();
      if(token!==gate)return;
      if(!finalConsent||useSuspended||!canUseRemote()){controls(false);status('Storage changed; nothing was copied.',true);return;}
      const note=text(body?.data?.text);
      if(body?.object!=='memory.item'||body?.data?.id!==id||!TYPES.includes(body?.data?.type)||!note){status('Selected note is unavailable.',true);return;}
      const composer=document.getElementById('p0-input');
      if(!composer){status('Composer is unavailable.',true);return;}
      const labelled='[Personal memory you selected: "'+note.replaceAll('"','\\"')+'"]';
      composer.value=(composer.value?composer.value+'\n\n':'')+labelled;
      composer.dispatchEvent(new Event('input',{bubbles:true})); composer.focus(); dialog.close();
    }catch(error){if(token===gate)status(error.message||'Nothing was copied.',true);}
  }
  // The same draft the note save uses, read up to the document limit rather
  // than the note limit. The store still has the last word: size_chars below
  // tells the user if it kept less than was sent.
  async function saveDocument(){
    const input=dialog.querySelector('[data-personal-memory-text]');
    const nameInput=dialog.querySelector('[data-personal-knowledge-name]');
    const value=text(input?.value,MAX_DOCUMENT_TEXT);
    const name=text(nameInput?.value)||lastImportedName||'document';
    if(!value){documentStatus('Enter or import text before saving it as a document.',true);return;}
    return mutate(async()=>{
    try{
      if(useSuspended){documentStatus('Storage disablement was requested; document was not sent.',true);return;}
      if(!await consent()){controls(false);documentStatus('Storage is off; document was not sent.',true);return;}
      documentStatus('Saving knowledge document…');
      const created=await request('/knowledge/documents',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({workspace_id:activeWorkspaceId(),name,text:value,type:'text/plain',source_type:'upload'})});
      const stored=created?.data;
      if(created?.object!=='knowledge.document'||!stored?.id)throw new Error('Personal storage returned an invalid stored document.');
      // size_chars is what the store kept. If it kept less than was sent, the
      // document was shortened, and the user is told so from the response
      // rather than from a limit guessed in this client.
      const kept=Number(stored.size_chars);
      const shortened=Number.isFinite(kept)&&kept<value.length;
      if(text(input?.value)===value)input.value='';
      if(nameInput)nameInput.value='';
      lastImportedName='';
      documentStatus(shortened
        ?'Stored “'+text(stored.name||name,120)+'”, but only the first '+kept+' of '+value.length+' characters were kept.'
        :'Stored “'+text(stored.name||name,120)+'” as a knowledge document. Search documents to find it.');
    }catch(error){documentStatus(error.message||'Document was not stored.',true);}
    });
  }
  function documentButton(document_){
    const button=document.createElement('button');
    button.type='button'; button.className='p0-menu-button'; button.dataset.personalKnowledgeId=document_.id;
    button.textContent='Document: '+text(document_.name,120);
    button.addEventListener('click',()=>{
      selectedDocumentId=document_.id; selectedDocumentName=document_.name;
      dialog.querySelectorAll('[data-personal-knowledge-id]').forEach(node=>node.dataset.selected=String(node.dataset.personalKnowledgeId===selectedDocumentId));
      documentStatus('Selected “'+text(document_.name,120)+'”. Choose “Delete selected document” to remove it and its chunks.');
    });
    return button;
  }
  // The backend can feed a stored document into an answer (chat-runtime.js:710
  // searches it on every send), so the user needs a way to find one and remove
  // it. Search is how you find it; the spec has no list operation.
  async function searchDocuments(){
    const input=dialog.querySelector('[data-personal-knowledge-query]');
    const query=text(input?.value);
    const token=++gate;
    clearDocumentResults();
    if(!query){documentStatus('Enter words to search your stored documents.',true);return;}
    documentStatus('Searching stored documents…');
    try{
      const body=await request('/knowledge/search',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({workspace_id:activeWorkspaceId(),query,limit:8})});
      if(token!==gate||!canUseRemote())return;
      if(!Array.isArray(body?.data))throw new Error('Personal storage returned an invalid document search response.');
      const documents=[];
      body.data.forEach(hit=>{
        const id=text(hit?.document?.id,200), name=text(hit?.document?.name,200);
        if(id&&name&&!documents.some(item=>item.id===id))documents.push({id,name});
      });
      if(!documents.length){documentStatus('No stored documents matched those words.');return;}
      const container=dialog.querySelector('[data-personal-knowledge-results]');
      documents.forEach(item=>container.appendChild(documentButton(item)));
      documentStatus(documents.length+' stored '+(documents.length===1?'document':'documents')+' matched. This is word matching, not semantic search.');
    }catch(error){if(token===gate)documentStatus(error.message||'Document search failed; nothing was deleted.',true);}
  }
  // Deleting is deliberately not behind the consent switch: the delete exists so
  // a user can remove their own data, and that must work when storage is off.
  async function removeDocument(){
    const id=selectedDocumentId, name=selectedDocumentName;
    if(!id){documentStatus('Select a stored document first.',true);return;}
    if(window.confirm&&!window.confirm('Delete “'+text(name,120)+'” and its chunks? This cannot be undone.')){documentStatus('Deletion cancelled; the document was kept.');return;}
    return mutate(async()=>{
    documentStatus('Deleting stored document…');
    try{
      await request('/knowledge/documents/'+encodeURIComponent(id),{method:'DELETE'});
      if(selectedDocumentId===id){selectedDocumentId=''; selectedDocumentName='';}
      documentStatus('Deleted “'+text(name,120)+'”. Search again to confirm it is gone.');
      dialog?.querySelectorAll('[data-personal-knowledge-id="'+CSS.escape(id)+'"]').forEach(node=>node.remove());
    }catch(error){
      // 404 is the backend saying this identity has no such document: it is
      // already gone, or it never belonged to this identity. Either way the
      // user's data is not there, so this is not an error to act on.
      if(Number(error?.status)===404){
        if(selectedDocumentId===id){selectedDocumentId=''; selectedDocumentName='';}
        documentStatus('That document is already gone.');
        dialog?.querySelectorAll('[data-personal-knowledge-id="'+CSS.escape(id)+'"]').forEach(node=>node.remove());
        return;
      }
      documentStatus(error.message||'Document was not deleted.',true);
    }
    });
  }
  function button(label,action,requires=false){const node=document.createElement('button');node.type='button';node.textContent=label;node.dataset.personalMemoryAction=action;if(requires)node.dataset.personalMemoryRequiresConsent='';return node;}
  function build(){
    dialog=document.createElement('dialog'); dialog.className='p0-menu'; dialog.setAttribute('aria-label','Personal memory');
    dialog.innerHTML='<h2>Personal memory</h2><p>Remote notes are stored at MMIR for this anonymous tab session. Closing this session can lose access; this is not account or cross-device recovery.</p><p data-personal-memory-state></p><label>Type <select data-personal-memory-type><option value="note">Note</option><option value="fact">Fact</option><option value="preference">Preference</option><option value="task">Task</option></select></label><label>Note or document text <textarea data-personal-memory-text maxlength="'+MAX_DOCUMENT_TEXT+'" rows="3"></textarea></label><p>A note holds up to '+MAX_TEXT+' characters; a knowledge document holds up to '+MAX_DOCUMENT_TEXT+'. Import a local UTF-8 plain-text .txt file of up to '+MAX_DOCUMENT_TEXT+' characters / '+MAX_IMPORT_BYTES+' bytes. It only fills this editable draft. Saving is separate: keep it as a note, or store it as a knowledge document below.</p><input data-personal-memory-import type="file" accept=".txt,text/plain" hidden><button type="button" data-personal-memory-import-button>Import .txt to draft</button><h3>Search saved notes (lexical)</h3><p>Matches words in saved notes; this is not semantic search.</p><label>Search saved notes <input type="search" data-personal-memory-query maxlength="1000"></label><p data-personal-memory-search-status aria-live="polite"></p><div data-personal-memory-search-results aria-live="polite"></div><h3>Your stored documents</h3><p>Documents stored at MMIR for this session can be used to answer you. Store the draft above as a document, search your documents by word, and delete one to remove it and its chunks. Storing needs remote storage on; deleting works even when it is off.</p><label>Document name <input type="text" data-personal-knowledge-name maxlength="160"></label><div data-personal-knowledge-save></div><label>Search stored documents <input type="search" data-personal-knowledge-query maxlength="1000"></label><div data-personal-knowledge-buttons></div><p data-personal-knowledge-status aria-live="polite"></p><div data-personal-knowledge-results aria-live="polite"></div><div data-personal-memory-actions></div><div data-personal-memory-list></div><p data-personal-memory-status aria-live="polite"></p>';
    const actions=dialog.querySelector('[data-personal-memory-actions]');
    [['Enable remote storage','enable',false],['Save note','save',true],['Search notes','search',true],['Clear search','clear-search',false],['Refresh','refresh',false],['Use in next message','use',true],['Delete selected','delete',false],['Disable remote storage','disable',false],['Close','close',false]].forEach(([label,action,requires])=>actions.appendChild(button(label,action,requires)));
    actions.addEventListener('click',event=>{const action=event.target?.dataset?.personalMemoryAction;if(action==='enable')enable();if(action==='save')save();if(action==='search')search();if(action==='clear-search')clearSearch();if(action==='refresh')refresh();if(action==='use')useSelected();if(action==='delete')remove();if(action==='disable')disable();if(action==='close')dialog.close();});
    const documentSave=dialog.querySelector('[data-personal-knowledge-save]');
    documentSave.appendChild(button('Save as knowledge document','save-document',true));
    documentSave.addEventListener('click',event=>{if(event.target?.dataset?.personalMemoryAction==='save-document')saveDocument();});
    const documentButtons=dialog.querySelector('[data-personal-knowledge-buttons]');
    [['Search documents','search-documents'],['Delete selected document','delete-document']].forEach(([label,action])=>documentButtons.appendChild(button(label,action)));
    documentButtons.addEventListener('click',event=>{const action=event.target?.dataset?.personalMemoryAction;if(action==='search-documents')searchDocuments();if(action==='delete-document')removeDocument();});
    const fileInput=dialog.querySelector('[data-personal-memory-import]');
    dialog.querySelector('[data-personal-memory-import-button]')?.addEventListener('click',()=>fileInput?.click());
    fileInput?.addEventListener('change',()=>{const file=fileInput.files?.[0];fileInput.value='';if(file)importTextFile(file);});
    (document.getElementById('mmir-p0-app')||document.body).appendChild(dialog);
    const invalidate=()=>{++gate;clearSelection();clearSearchResults('Search cleared when the panel closed.');clearDocumentResults('Document search cleared when the panel closed.');const documentQuery=dialog?.querySelector('[data-personal-knowledge-query]');if(documentQuery)documentQuery.value='';};
    dialog.addEventListener('close',invalidate);
    dialog.addEventListener('cancel',invalidate);
  }
  async function open(options={}){if(!dialog)build();canUseRemote=typeof options.canUseRemote==='function'?options.canUseRemote:()=>false;dialog.showModal();controls(false);if(!canUseRemote()){status('Personal cloud storage is unavailable in private or superprivate mode.',true);return;}await refresh();}
  window.MmirP0PersonalMemory=Object.freeze({open});
})();
