#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';

const root=resolve(process.cwd());
const failures=[];
async function browserProof(){
  const port=8799;
  const server=spawn(process.execPath,['scripts/serve-public.mjs'],{cwd:root,env:{...process.env,HOST:'127.0.0.1',PORT:String(port)},stdio:['ignore','pipe','pipe']});
  const deadline=Date.now()+60000;
  const startupLine=`Serving public at http://127.0.0.1:${port}/mmir.html`;
  let serverOutput=''; let serverErrorOutput=''; let serverExit=null; let serverError=null;
  const captureTail=(current,chunk)=>(current+chunk.toString()).slice(-4096);
  server.stdout.on('data',chunk=>{serverOutput=captureTail(serverOutput,chunk);});
  server.stderr.on('data',chunk=>{serverErrorOutput=captureTail(serverErrorOutput,chunk);});
  server.once('error',error=>{serverError=error;});
  server.once('exit',(code,signal)=>{serverExit={code,signal};});
  let browser=null;
  let context=null;
  try{
    await new Promise((resolve,reject)=>{
      let settled=false;
      const finish=(error)=>{if(settled)return;settled=true;clearTimeout(timer);server.stdout.off('data',onOutput);server.off('error',onError);server.off('exit',onExit);error?reject(error):resolve();};
      const onOutput=()=>{if(serverOutput.includes(startupLine))finish();};
      const onError=error=>finish(new Error(`Personal-memory fixture server failed to start: ${error.message}; stderr=${serverErrorOutput}`));
      const onExit=(code,signal)=>finish(new Error(`Personal-memory fixture server exited before readiness (code ${code}, signal ${signal}); stderr=${serverErrorOutput}`));
      const timer=setTimeout(()=>finish(new Error(`Personal-memory fixture server readiness timed out; stdout=${serverOutput}; stderr=${serverErrorOutput}`)),Math.max(1,Math.min(10000,deadline-Date.now())));
      server.stdout.on('data',onOutput);server.once('error',onError);server.once('exit',onExit);onOutput();
    });
    browser=await chromium.launch({headless:true});
    context=await browser.newContext({serviceWorkers:'block'});
    const page=await context.newPage();
    page.setDefaultTimeout(5000);
    let backendCalls=0; let memoryCalls=0; let searchCalls=0; let consentCalls=0; let chatCalls=0; let identityPosts=0; let forceSecondIdentity=false; let mode='normal'; const backendPaths=[]; const searchPayloads=[];
    const records=new Map(); let consent=false; let nextId=0;
    const knowledgeDocuments=new Map([['doc-fixture-1','Quarterly plan.txt'],['doc-fixture-2','Old draft.txt']]);
    let knowledgeSearchCalls=0; let knowledgeListCalls=0; const knowledgeListPayloads=[]; const knowledgeDeletes=[]; const knowledgeSearchPayloads=[]; const knowledgeWrites=[]; let nextDocumentId=2;
    let deferredReadyResolve=null; let deferredRelease=null; let deferredConsentReads=0;
    const check=()=>{if(Date.now()>=deadline)throw new Error('personal-memory browser proof exceeded 60s');if(serverError||serverExit)throw new Error(`Personal-memory fixture server exited during browser proof: ${JSON.stringify(serverExit||serverError)}; stderr=${serverErrorOutput}`);};
    await page.route('**/*',async route=>{
      check();
      const url=route.request().url();
      if(url.startsWith(`http://127.0.0.1:${port}/`))return route.continue();
      if(url.startsWith('https://api.mmir.ai/')){
        const path=new URL(url).pathname;
        if(path==='/v1/chat/completions'){chatCalls+=1;return route.fulfill({status:500,contentType:'application/json',body:JSON.stringify({error:{code:'blocked_fixture_chat'}})});}
        const body=path==='/status'?{ok:true,no_paid_routes_started:true,live_verified_intelligence_route_count:1,operator_readiness:{readiness_state:'swarm_preview_ready',default_writer_readiness:{classification:'release_ready',authenticated_release_ready:true,blocker_codes:[]},journeys:{first_chat_ready:true,compare_ready:true,swarm_preview_ready:true}}}:path==='/v1/models'?{object:'list',data:[{id:'mmir-supergenius',name:'Supergeni',display_name:'Supergeni',provider:'mmir',executable:true,selectable:true,recommended:true,availability:'available',route_state:'managed_provider_available',route_type:'managed_provider',route_class:'free',trust_level:'public-free',live_e2e_verified:true,live_e2e_proof:{verified:true,stable_verified:true,no_paid_routes_started:true},cost_class:'free'}]}:{object:'list',data:[]};
        return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
      }
      if(!url.startsWith('https://backend.mmir.ai/'))return route.abort();
      backendCalls+=1;
      const path=new URL(url).pathname;
      backendPaths.push(`${route.request().method()} ${path}`);
      if(path==='/consent'||path==='/memory'||path.startsWith('/memory/'))consentCalls+=1;
      const method=route.request().method();
      const now=new Date().toISOString();
      if(path==='/v1/chat/completions'){chatCalls+=1;return route.fulfill({status:500,contentType:'application/json',body:JSON.stringify({error:{code:'blocked_fixture_chat'}})});}
      if(path==='/health')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({status:'online',service:'mmir-orchestrator',layer:'backend',capabilities:['identity','proxy.chat_completions'],ordering_authority:'bound'})});
      if(path==='/identity/session'&&method==='POST'){identityPosts+=1;const identityId=forceSecondIdentity?'usr_fixture_second':'usr_fixture';const token=`synthetic-session-token-${identityId}`;return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({object:'mmir.identity_session',anonymous:true,token,identity_id:identityId,issued_at:now,expires_at:new Date(Date.now()+7*86400000).toISOString()})});}
      if(path==='/identity/session'&&method==='GET'){const identityId=(route.request().headers().authorization||'').endsWith('synthetic-session-token-usr_fixture_second')?'usr_fixture_second':'usr_fixture';return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({object:'mmir.identity_session',anonymous:true,token:`synthetic-session-token-${identityId}`,identity_id:identityId,issued_at:new Date(Date.now()-1000).toISOString(),expires_at:new Date(Date.now()+7*86400000).toISOString()})});}
      if(path==='/consent'&&method==='PUT'){consent=JSON.parse(route.request().postData()||'{}').memory===true;return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({object:'consent',memory:consent})});}
      if(path==='/consent'){
        if(mode==='malformed'){mode='normal';return route.fulfill({status:200,contentType:'application/json',body:'{}'});}
        if(mode==='defer-final-consent'&&++deferredConsentReads===2){const snapshot=consent;deferredReadyResolve?.();await new Promise(resolve=>{deferredRelease=resolve;});mode='normal';return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({object:'consent',memory:snapshot})});}
        return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({object:'consent',memory:consent})});
      }
      if(path==='/memory'&&method==='POST'){
        memoryCalls+=1;
        if(mode==='fail-save'){mode='normal';return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:{code:'storage_unavailable'}})});}
        if(mode==='defer-save'){deferredReadyResolve?.();await new Promise(resolve=>{deferredRelease=resolve;});mode='normal';return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:{code:'storage_unavailable'}})});}
        if(!consent)return route.fulfill({status:403,contentType:'application/json',body:JSON.stringify({error:{code:'consent_required'}})});
        const input=JSON.parse(route.request().postData()||'{}');const id='memory-fixture-'+(++nextId);records.set(id,{id,type:input.type,text:input.text,tags:[],created_at:now,updated_at:now});return route.fulfill({status:201,contentType:'application/json',body:JSON.stringify({object:'memory.item',data:records.get(id)})});
      }
      if(path==='/memory/search'&&method==='POST'){
        searchCalls+=1; const input=JSON.parse(route.request().postData()||'{}'); searchPayloads.push(input);
        if(mode==='fail-search'){mode='normal';return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:{code:'search_unavailable'}})});}
        if(mode==='defer-search'){deferredReadyResolve?.();await new Promise(resolve=>{deferredRelease=resolve;});mode='normal';}
        const terms=String(input.query||'').toLowerCase().split(/\s+/).filter(Boolean);
        const data=[...records.values()].flatMap(item=>{const matched_terms=terms.filter(term=>(item.text+' '+item.tags.join(' ')).toLowerCase().includes(term));return matched_terms.length?[{...item,score:matched_terms.length/terms.length,matched_terms,why_used:['Matched saved-note words.']}]:[];}).slice(0,8);
        return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({object:'list',data})});
      }
      if(path==='/knowledge/documents'&&method==='POST'){
        const input=JSON.parse(route.request().postData()||'{}'); knowledgeWrites.push(input);
        if(mode==='document-limit'){mode='normal';return route.fulfill({status:409,contentType:'application/json',body:JSON.stringify({error:{code:'document_limit_reached',message:'This identity already holds 100 documents.'}})});}
        if(!consent)return route.fulfill({status:403,contentType:'application/json',body:JSON.stringify({error:{code:'consent_required',message:'This identity has not consented to storage. Nothing was written.'}})});
        // The store keeps at most what mode says: 'shortened-document' mimics the
        // store trimming text it will not hold in full.
        const kept=mode==='shortened-document'?(mode='normal',4):String(input.text||'').length;
        const id='doc-fixture-'+(++nextDocumentId);
        knowledgeDocuments.set(id,String(input.name||'document'));
        return route.fulfill({status:201,contentType:'application/json',body:JSON.stringify({object:'knowledge.document',data:{id,workspace_id:input.workspace_id,name:input.name,type:input.type,source_type:input.source_type,size_chars:kept,chunk_count:1,metadata:{},created_at:now}})});
      }
      if(path==='/knowledge/documents'&&method==='GET'){
        const workspace=new URL(url).searchParams.get('workspace_id');
        if(!workspace)return route.fulfill({status:400,contentType:'application/json',body:JSON.stringify({error:{code:'invalid_request'}})});
        const authorization=route.request().headers().authorization||''; const data=authorization.endsWith('synthetic-session-token-usr_fixture_second')?[]:[...knowledgeDocuments.entries()].map(([id,name])=>({id,workspace_id:workspace,name,type:'text/plain',source_type:'upload',size_chars:name.length,chunk_count:1,metadata:{},created_at:now}));
        knowledgeListCalls+=1; knowledgeListPayloads.push({workspace_id:workspace,ids:data.map(item=>item.id),names:data.map(item=>item.name)});
        return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({object:'list',user_id:'usr_fixture',data})});
      }
      if(path==='/knowledge/search'&&method==='POST'){
        knowledgeSearchCalls+=1; const input=JSON.parse(route.request().postData()||'{}'); knowledgeSearchPayloads.push(input);
        const terms=String(input.query||'').toLowerCase().split(/\s+/).filter(Boolean);
        const data=[...knowledgeDocuments.entries()]
          .filter(([,name])=>terms.some(term=>name.toLowerCase().includes(term)))
          .map(([id,name])=>({snippet:'Fixture snippet from '+name,chunk_id:id+'-chunk-1',document:{id,name}}));
        return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({data})});
      }
      if(path.startsWith('/knowledge/documents/')&&method==='DELETE'){
        const documentId=decodeURIComponent(path.split('/').at(-1)||'');
        knowledgeDeletes.push(documentId);
        if(mode==='gone-document'){mode='normal';return route.fulfill({status:404,contentType:'application/json',body:JSON.stringify({error:{code:'not_found'}})});}
        if(!knowledgeDocuments.has(documentId))return route.fulfill({status:404,contentType:'application/json',body:JSON.stringify({error:{code:'not_found'}})});
        knowledgeDocuments.delete(documentId);
        return route.fulfill({status:204,body:''});
      }
      const itemId=decodeURIComponent(path.split('/').at(-1)||'');
      if(path==='/memory'&&method==='GET')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({object:'list',data:[...records.values()]})});
      if(path.startsWith('/memory/')){if(!records.has(itemId))return route.fulfill({status:404,contentType:'application/json',body:JSON.stringify({error:{code:'not_found'}})});if(method==='DELETE'){records.delete(itemId);return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({object:'memory.deleted',id:itemId,deleted:true})});}return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({object:'memory.item',data:records.get(itemId)})});}
      return route.fulfill({status:400,contentType:'application/json',body:JSON.stringify({error:{code:'unexpected_fixture_route'}})});
    });
    const waitForKnowledgeList=()=>page.waitForResponse(response=>{const responseUrl=new URL(response.url());return responseUrl.origin==='https://backend.mmir.ai'&&responseUrl.pathname==='/knowledge/documents'&&response.request().method()==='GET';});
    await page.goto(`http://127.0.0.1:${port}/mmir.html`,{waitUntil:'domcontentloaded'});
    await page.locator('#p0-sidebar-settings').waitFor();
    if(consentCalls!==0)failures.push(`Opening public P0 must not contact personal memory endpoints before a user action (${backendPaths.join(', ')}).`);
    const composer=page.locator('#p0-input'); const beforeLocal=consentCalls; await composer.fill('/remember local sentinel'); await page.locator('#p0-send').click(); await page.getByText(/Saved locally in this browser/).waitFor(); if(consentCalls!==beforeLocal||chatCalls!==0)failures.push('Local /remember must remain browser-local without remote memory or model calls.'); await composer.fill('Keep this draft');
    await page.locator('#p0-sidebar-settings').click();
    await page.getByText('Personlig minne',{exact:true}).click();
    const dialog=page.locator('#mmir-p0-app dialog[aria-label="Personal memory"]');
    if(!(await dialog.isVisible()))failures.push('Personal memory dialog must be reachable and visible inside the P0 app.');
    await dialog.locator('[data-personal-memory-status]').getByText('Storage is off. Saved notes remain inspectable and deletable.').waitFor();
    if(backendCalls===0)failures.push('Explicit panel action must contact only the personal backend.');
    const beforeDisabled=memoryCalls; const disabledSave=dialog.getByRole('button',{name:'Save note',exact:true}); const disabledDraftValue=await composer.inputValue(); if(!(await disabledSave.isDisabled())||!(await dialog.getByRole('button',{name:'Search notes',exact:true}).isDisabled()))failures.push('Save and search must be disabled before consent.'); if(memoryCalls!==beforeDisabled||searchCalls!==0||await composer.inputValue()!==disabledDraftValue)failures.push(`Disabled save/search must preserve draft and avoid remote writes (memory ${memoryCalls-beforeDisabled}, search ${searchCalls}, draft ${JSON.stringify(await composer.inputValue())}).`);
    const noteDraft=dialog.locator('[data-personal-memory-text]'); const importInput=dialog.locator('[data-personal-memory-import]'); const beforeImportCalls=backendCalls;
    if(!(await dialog.getByText('20000 characters / 60000 bytes').count()))failures.push('Text import must disclose its no-truncation limit before file selection.');
    if(!(await dialog.getByText('A note holds up to 1000 characters; a knowledge document holds up to 20000.').count()))failures.push('The panel must state both limits before anything is written.');
    await importInput.setInputFiles({name:'personal-note.txt',mimeType:'text/plain',buffer:Buffer.from('Imported local note')}); await page.waitForFunction(()=>document.querySelector('[data-personal-memory-text]')?.value==='Imported local note');
    if(await noteDraft.inputValue()!=='Imported local note'||backendCalls!==beforeImportCalls||records.size!==0)failures.push('A valid local .txt import must only fill the editable draft, with no remote request or auto-save.');
    await noteDraft.fill('Keep existing draft'); page.once('dialog',prompt=>prompt.dismiss()); await importInput.setInputFiles({name:'replacement.txt',mimeType:'text/plain',buffer:Buffer.from('Replacement')}); await page.getByText(/Import cancelled/).waitFor(); if(await noteDraft.inputValue()!=='Keep existing draft')failures.push('Cancelling replacement must preserve an existing note draft.');
    // Boundaries, from the file that cannot fit down to the note limit. A note
    // holds NOTE_LIMIT characters; a document holds DOCUMENT_LIMIT, which is the
    // knowledge store's own cap (knowledge-store.js maxCharsPerDocument, 20000).
    const NOTE_LIMIT=1000, DOCUMENT_LIMIT=20000, IMPORT_BYTE_LIMIT=DOCUMENT_LIMIT*3;
    await importInput.setInputFiles({name:'too-many-bytes.txt',mimeType:'text/plain',buffer:Buffer.alloc(IMPORT_BYTE_LIMIT+1,65)}); await page.getByText(/too large/i).waitFor(); if(await noteDraft.inputValue()!=='Keep existing draft')failures.push('A file past the byte limit must reject without truncating or replacing the draft.');
    page.once('dialog',prompt=>prompt.accept()); await importInput.setInputFiles({name:'one-over.txt',mimeType:'text/plain',buffer:Buffer.alloc(DOCUMENT_LIMIT+1,66)}); await dialog.locator('[data-personal-memory-status]').getByText(new RegExp(`${DOCUMENT_LIMIT+1} characters, longer than the ${DOCUMENT_LIMIT}-character document limit`)).waitFor(); if(await noteDraft.inputValue()!=='Keep existing draft')failures.push('One character past the document limit must reject the whole import, not trim it.');
    page.once('dialog',prompt=>prompt.accept()); await importInput.setInputFiles({name:'exactly-at.txt',mimeType:'text/plain',buffer:Buffer.alloc(DOCUMENT_LIMIT,67)}); await page.waitForFunction(limit=>document.querySelector('[data-personal-memory-text]')?.value.length===limit,DOCUMENT_LIMIT); if((await noteDraft.inputValue()).length!==DOCUMENT_LIMIT)failures.push('A file exactly at the document limit must import in full.');
    page.once('dialog',prompt=>prompt.accept()); await importInput.setInputFiles({name:'one-under.txt',mimeType:'text/plain',buffer:Buffer.alloc(DOCUMENT_LIMIT-1,68)}); await page.waitForFunction(limit=>document.querySelector('[data-personal-memory-text]')?.value.length===limit-1,DOCUMENT_LIMIT); await dialog.locator('[data-personal-memory-status]').getByText(new RegExp(`longer than the ${NOTE_LIMIT}-character note limit`)).waitFor();
    await noteDraft.fill('Keep existing draft');
    await importInput.setInputFiles({name:'not-text.pdf',mimeType:'application/pdf',buffer:Buffer.from('not a text document')}); await dialog.locator('[data-personal-memory-status]').getByText('Choose a UTF-8 plain-text .txt file.').waitFor(); if(await noteDraft.inputValue()!=='Keep existing draft')failures.push('Non-.txt import must reject without replacing the draft.');
    page.once('dialog',prompt=>prompt.accept()); await importInput.setInputFiles({name:'invalid-utf8.txt',mimeType:'text/plain',buffer:Buffer.from([0xc3,0x28])}); await dialog.locator('[data-personal-memory-status]').getByText('Could not read this UTF-8 plain-text file.').waitFor(); if(await noteDraft.inputValue()!=='Keep existing draft')failures.push('Invalid UTF-8 import must reject without replacing the draft.');
    await page.evaluate(()=>{const original=Blob.prototype.arrayBuffer;window.__releaseSlowTextImport=null;window.__slowTextImportSeen=false;Blob.prototype.arrayBuffer=function(){if(this.name==='slow.txt'){window.__slowTextImportSeen=true;return new Promise(resolve=>{window.__releaseSlowTextImport=()=>original.call(this).then(resolve);});}return original.call(this);};window.__restoreTextArrayBuffer=()=>{Blob.prototype.arrayBuffer=original;};});
    await noteDraft.fill('Draft before close'); page.once('dialog',prompt=>prompt.accept()); await importInput.setInputFiles({name:'slow.txt',mimeType:'text/plain',buffer:Buffer.from('Late replacement')}); await page.waitForFunction(()=>window.__slowTextImportSeen===true); await dialog.getByRole('button',{name:'Close',exact:true}).click(); await page.evaluate(()=>window.__releaseSlowTextImport?.()); await page.waitForTimeout(20); if(await noteDraft.inputValue()!=='Draft before close')failures.push('Closing during a pending local file read must prevent a stale draft replacement.'); await page.evaluate(()=>window.__restoreTextArrayBuffer?.());
    await page.locator('#p0-sidebar-settings').click(); await page.getByText('Personlig minne',{exact:true}).click(); await dialog.waitFor({state:'visible'});
    await dialog.getByRole('button',{name:'Enable remote storage',exact:true}).click(); await page.getByText(/Remote storage enabled/).waitFor();
    await page.evaluate(()=>{const original=Blob.prototype.arrayBuffer;window.__releaseFirstImport=null;Blob.prototype.arrayBuffer=function(){if(this.name==='first.txt')return new Promise(resolve=>{window.__releaseFirstImport=()=>original.call(this).then(resolve);});return original.call(this);};window.__restoreFirstImport=()=>{Blob.prototype.arrayBuffer=original;};});
    await noteDraft.fill(''); await importInput.setInputFiles({name:'first.txt',mimeType:'text/plain',buffer:Buffer.from('Stale first')}); await page.waitForFunction(()=>typeof window.__releaseFirstImport==='function'); await importInput.setInputFiles({name:'second.txt',mimeType:'text/plain',buffer:Buffer.from('Second selection')}); await page.waitForFunction(()=>document.querySelector('[data-personal-memory-text]')?.value==='Second selection'); await page.evaluate(()=>window.__releaseFirstImport?.()); await page.waitForTimeout(20); if(await noteDraft.inputValue()!=='Second selection')failures.push('A second file selection must win over a stale first read.'); await page.evaluate(()=>window.__restoreFirstImport?.());
    await page.evaluate(()=>{const original=Blob.prototype.arrayBuffer;window.__releaseDisableImport=null;Blob.prototype.arrayBuffer=function(){if(this.name==='disable.txt')return new Promise(resolve=>{window.__releaseDisableImport=()=>original.call(this).then(resolve);});return original.call(this);};window.__restoreDisableImport=()=>{Blob.prototype.arrayBuffer=original;};});
    await noteDraft.fill('Draft before disable'); page.once('dialog',prompt=>prompt.accept()); await importInput.setInputFiles({name:'disable.txt',mimeType:'text/plain',buffer:Buffer.from('Late disable replacement')}); await page.waitForFunction(()=>typeof window.__releaseDisableImport==='function'); await dialog.getByRole('button',{name:'Disable remote storage',exact:true}).click(); await page.getByText(/Remote storage disabled/).waitFor(); await page.evaluate(()=>window.__releaseDisableImport?.()); await page.waitForTimeout(20); if(await noteDraft.inputValue()!=='Draft before disable')failures.push('Disable during a pending local file read must prevent a stale draft replacement.'); await page.evaluate(()=>window.__restoreDisableImport?.()); await dialog.getByRole('button',{name:'Enable remote storage',exact:true}).click(); await page.getByText(/Remote storage enabled/).waitFor();
    await dialog.locator('[data-personal-memory-text]').fill('Synthetic note'); await dialog.getByRole('button',{name:'Save note',exact:true}).click(); await dialog.getByRole('button',{name:/note: Synthetic note/}).waitFor();
    // Storing a document reuses the note draft and the .txt import: the same
    // text, a second choice about where it goes.
    // The note limit, from both sides. One character past it must be refused,
    // never saved as its first NOTE_LIMIT characters.
    const beforeNoteBoundary=records.size;
    await noteDraft.fill('E'.repeat(NOTE_LIMIT+1)); await dialog.getByRole('button',{name:'Save note',exact:true}).click();
    await dialog.locator('[data-personal-memory-status]').getByText(new RegExp(`This draft is ${NOTE_LIMIT+1} characters. A note holds ${NOTE_LIMIT}`)).waitFor();
    if(records.size!==beforeNoteBoundary)failures.push('A draft past the note limit must not be written as a truncated note.');
    await noteDraft.fill('F'.repeat(NOTE_LIMIT)); await dialog.getByRole('button',{name:'Save note',exact:true}).click();
    await page.waitForFunction(count=>document.querySelectorAll('[data-personal-memory-list] button').length===count,beforeNoteBoundary+1);
    const atLimitNote=[...records.values()].find(item=>item.text.length===NOTE_LIMIT);
    if(!atLimitNote)failures.push('A draft exactly at the note limit must be saved whole.');
    // Removed from the fixture so the later delete proof still starts from one note.
    if(atLimitNote)records.delete(atLimitNote.id);
    const refreshedKnowledgeList=waitForKnowledgeList(); await dialog.getByRole('button',{name:'Refresh',exact:true}).click(); await refreshedKnowledgeList; await page.waitForFunction(()=>document.querySelectorAll('[data-personal-memory-list] button').length===1);
    const documentName=dialog.locator('[data-personal-knowledge-name]'); const documentStatusLine=dialog.locator('[data-personal-knowledge-status]');
    await noteDraft.fill(''); await documentName.fill('');
    await importInput.setInputFiles({name:'briefing.txt',mimeType:'text/plain',buffer:Buffer.from('Imported document body')});
    await page.waitForFunction(()=>document.querySelector('[data-personal-memory-text]')?.value==='Imported document body');
    if(await documentName.inputValue()!=='briefing.txt')failures.push(`Importing a .txt must offer its file name as the document name (${JSON.stringify(await documentName.inputValue())}).`);
    if(knowledgeWrites.length!==0)failures.push('Importing a file must not store a document by itself.');
    const savedKnowledgeList=waitForKnowledgeList(); await dialog.getByRole('button',{name:'Save as knowledge document',exact:true}).click(); const savedKnowledgeListBody=await (await savedKnowledgeList).json(); const savedDocumentId=[...knowledgeDocuments.keys()].at(-1); if(savedKnowledgeListBody?.object!=='list'||!savedKnowledgeListBody.data?.some(item=>item.id===savedDocumentId))failures.push('Document save must be followed by a completed list response containing the saved document.');
    await documentStatusLine.getByText(/Stored “briefing.txt” as a knowledge document/).waitFor();
    const write=knowledgeWrites.at(-1);
    if(knowledgeWrites.length!==1||write?.text!=='Imported document body'||write?.name!=='briefing.txt'||write?.type!=='text/plain'||write?.source_type!=='upload'||!write?.workspace_id)failures.push(`Saving a document must send the draft text, the name, text/plain and a workspace id (${JSON.stringify(write)}).`);
    if(await noteDraft.inputValue()!==''||await documentName.inputValue()!=='')failures.push('A stored document must clear the draft and the name it consumed.');
    if(records.size!==1)failures.push('Saving a document must not also create a memory note.');
    await noteDraft.fill('G'.repeat(DOCUMENT_LIMIT)); await documentName.fill('full-size.txt');
    await dialog.getByRole('button',{name:'Save as knowledge document',exact:true}).click();
    await documentStatusLine.getByText(/Stored “full-size.txt” as a knowledge document/).waitFor();
    if(knowledgeWrites.at(-1)?.text?.length!==DOCUMENT_LIMIT)failures.push(`A document at the limit must be sent whole (${knowledgeWrites.at(-1)?.text?.length}).`);
    mode='shortened-document'; await noteDraft.fill('Longer than the store keeps'); await documentName.fill('trimmed.txt');
    await dialog.getByRole('button',{name:'Save as knowledge document',exact:true}).click();
    await documentStatusLine.getByText(/only the first 4 of 27 characters were kept/).waitFor();
    mode='document-limit'; await noteDraft.fill('One document too many'); await documentName.fill('overflow.txt');
    await dialog.getByRole('button',{name:'Save as knowledge document',exact:true}).click();
    // The sentence is the backend's own: the client does not carry the limit.
    await documentStatusLine.getByText('This identity already holds 100 documents.').waitFor(); await composer.fill('Keep this draft');
    await noteDraft.fill(''); await documentName.fill('');
    const query=dialog.locator('[data-personal-memory-query]'); await query.fill('Synthetic'); if(searchCalls!==0)failures.push('Typing a query must not search automatically.'); await dialog.getByRole('button',{name:'Search notes',exact:true}).click(); await dialog.locator('[data-personal-memory-search-status]').getByText(/1 lexical match/).waitFor(); if(searchCalls!==1||searchPayloads[0]?.query!=='Synthetic'||searchPayloads[0]?.limit!==8)failures.push('Explicit search must send the exact query with limit 8.');
    const searchResult=dialog.locator('[data-personal-memory-search-results] button'); await searchResult.getByText(/Lexical match/).waitFor(); await searchResult.click(); const beforeUse=await composer.inputValue(); await dialog.getByRole('button',{name:'Use in next message',exact:true}).click(); await page.waitForFunction(()=>document.getElementById('p0-input')?.value.includes('[Personal memory you selected: "Synthetic note"]')); if(chatCalls!==0||!(await composer.inputValue()).startsWith('Keep this draft'))failures.push(`Use must insert selected search result without auto-send or draft loss (chat ${chatCalls}, before ${JSON.stringify(beforeUse)}, after ${JSON.stringify(await composer.inputValue())}).`); await page.waitForFunction(()=>!document.querySelector('#mmir-p0-app dialog[aria-label="Personal memory"]')?.open); await page.locator('#p0-sidebar-settings').click(); await page.getByText('Personlig minne',{exact:true}).click(); await dialog.waitFor({state:'visible'});
    await query.fill('notpresentxyz'); await dialog.getByRole('button',{name:'Search notes',exact:true}).click(); await dialog.locator('[data-personal-memory-search-status]').getByText('No lexical matches.').waitFor(); if(await dialog.locator('[data-personal-memory-search-results] button').count())failures.push('No-match search must not show saved notes.');
    mode='fail-search'; await query.fill('Synthetic'); await dialog.getByRole('button',{name:'Search notes',exact:true}).click(); await dialog.locator('[data-personal-memory-search-status]').getByText(/failed|unavailable/i).waitFor(); if(await dialog.locator('[data-personal-memory-search-results] button').count())failures.push('Failed search must not leave stale results visible.');
    mode='defer-search'; const searchReady=new Promise(resolve=>{deferredReadyResolve=resolve;}); await dialog.getByRole('button',{name:'Search notes',exact:true}).click(); await Promise.race([searchReady,new Promise((_,reject)=>setTimeout(()=>reject(new Error('Deferred search was not reached.')),5000))]); const deferredSearchResponse=page.waitForResponse(response=>new URL(response.url()).pathname==='/memory/search'&&response.request().method()==='POST'); await dialog.getByRole('button',{name:'Clear search',exact:true}).click(); deferredRelease?.(); await deferredSearchResponse; await dialog.locator('[data-personal-memory-search-status]').getByText('Search cleared.').waitFor(); if(await dialog.locator('[data-personal-memory-search-results] button').count()||await query.inputValue()!=='')failures.push('Clearing a pending search must remove query and prevent stale results.');
    await query.fill('Synthetic'); await dialog.getByRole('button',{name:'Search notes',exact:true}).click(); await dialog.locator('[data-personal-memory-search-status]').getByText(/1 lexical match/).waitFor(); await dialog.getByRole('button',{name:'Disable remote storage',exact:true}).click(); await dialog.locator('[data-personal-memory-status]').getByText(/Remote storage disabled/).waitFor(); if(await query.inputValue()!==''||await dialog.locator('[data-personal-memory-search-results] button').count()||!(await dialog.getByRole('button',{name:'Search notes',exact:true}).isDisabled()))failures.push('Disable must clear search query/results and disable further searches.'); await dialog.getByRole('button',{name:'Enable remote storage',exact:true}).click(); await dialog.locator('[data-personal-memory-status]').getByText(/Remote storage enabled/).waitFor();
    mode='fail-save'; await dialog.locator('[data-personal-memory-text]').fill('Rejected note'); await dialog.getByRole('button',{name:'Save note',exact:true}).click(); await page.getByText(/not saved|unavailable|failed/i).waitFor(); if(records.size!==1)failures.push('Failed remote save must not create a memory item.');
    await dialog.locator('[data-personal-memory-text]').fill('Queued note'); mode='defer-save'; const saveReady=new Promise(resolve=>{deferredReadyResolve=resolve;}); await dialog.getByRole('button',{name:'Save note',exact:true}).click(); await Promise.race([saveReady,new Promise((_,reject)=>setTimeout(()=>reject(new Error('Deferred save was not reached.')),5000))]); await dialog.getByRole('button',{name:'Disable remote storage',exact:true}).click(); const refreshResponse=page.waitForResponse(response=>new URL(response.url()).pathname==='/consent'&&response.request().method()==='GET'); await dialog.getByRole('button',{name:'Refresh',exact:true}).click(); await refreshResponse; if(!(await dialog.getByRole('button',{name:'Use in next message',exact:true}).isDisabled()))failures.push('Refresh must not revive consent controls while an earlier Disable intent is queued.'); deferredRelease?.(); await page.getByText(/Remote storage disabled/).waitFor();
    await dialog.getByRole('button',{name:'Enable remote storage',exact:true}).click(); await page.getByText(/Remote storage enabled/).waitFor(); const raceNote=dialog.getByRole('button',{name:/note: Synthetic note/}); await raceNote.click(); await composer.fill('Deferred consent draft'); const beforeDeferredUse=await composer.inputValue(); const beforeDeferredChat=chatCalls; deferredConsentReads=0; mode='defer-final-consent'; const finalConsentReady=new Promise(resolve=>{deferredReadyResolve=resolve;}); await dialog.getByRole('button',{name:'Use in next message',exact:true}).click(); await Promise.race([finalConsentReady,new Promise((_,reject)=>setTimeout(()=>reject(new Error('Deferred final consent read was not reached.')),5000))]); await dialog.getByRole('button',{name:'Disable remote storage',exact:true}).click(); await dialog.locator('[data-personal-memory-status]').getByText(/Remote storage disabled/).waitFor(); deferredRelease?.(); await dialog.locator('[data-personal-memory-status]').getByText(/Remote storage disabled/).waitFor(); if(await composer.inputValue()!==beforeDeferredUse||chatCalls!==beforeDeferredChat)failures.push('Disable during the final consent read must preserve the composer and prevent a chat POST.');
    const selectedNote=dialog.getByRole('button',{name:/note: Synthetic note/}); await selectedNote.click(); await dialog.getByRole('button',{name:'Delete selected',exact:true}).click(); await page.waitForFunction(()=>!document.querySelector('[data-personal-memory-list] button')); if(records.size!==0)failures.push('Delete must remove only the selected synthetic note.');
    await composer.fill('Keep this draft'); const disabledDraft=await composer.inputValue(); await dialog.getByRole('button',{name:'Disable remote storage',exact:true}).click(); await page.getByText(/Remote storage disabled/).waitFor(); if(!(await dialog.getByRole('button',{name:'Use in next message',exact:true}).isDisabled())||await composer.inputValue()!==disabledDraft)failures.push('Disabled use must preserve draft and block insertion.');
    // Deleting a stored document runs here on purpose: remote storage is off at
    // this point in the proof, and removing your own data must work anyway.
    const documentQuery=dialog.locator('[data-personal-knowledge-query]');
    const beforeDisabledWrite=knowledgeWrites.length;
    if(!(await dialog.getByRole('button',{name:'Save as knowledge document',exact:true}).isDisabled()))failures.push('Storing a document must be disabled while remote storage is off.');
    if(knowledgeWrites.length!==beforeDisabledWrite)failures.push('A disabled document save must not write.');
    await documentQuery.fill('Quarterly'); if(knowledgeSearchCalls!==0)failures.push('Typing a document query must not search automatically.');
    await dialog.getByRole('button',{name:'Search documents',exact:true}).click(); await documentStatusLine.getByText(/1 stored document matched/).waitFor();
    if(knowledgeSearchCalls!==1||knowledgeSearchPayloads[0]?.query!=='Quarterly'||knowledgeSearchPayloads[0]?.limit!==8||!knowledgeSearchPayloads[0]?.workspace_id)failures.push(`Document search must send the exact query, limit 8 and a workspace id (${JSON.stringify(knowledgeSearchPayloads[0])}).`);
    if(await dialog.locator('[data-personal-knowledge-results] button').count()!==1)failures.push('Document search must list only matching documents.');
    const beforeCancelledDelete=knowledgeDeletes.length; await dialog.locator('[data-personal-knowledge-results] button').first().click();
    page.once('dialog',prompt=>prompt.dismiss()); await dialog.getByRole('button',{name:'Delete selected document',exact:true}).click(); await documentStatusLine.getByText('Deletion cancelled; the document was kept.').waitFor();
    if(knowledgeDeletes.length!==beforeCancelledDelete||!knowledgeDocuments.has('doc-fixture-1'))failures.push('Cancelling the confirmation must not send a delete.');
    page.once('dialog',prompt=>prompt.accept()); await dialog.getByRole('button',{name:'Delete selected document',exact:true}).click(); await documentStatusLine.getByText(/Deleted “Quarterly plan.txt”/).waitFor();
    if(knowledgeDeletes.at(-1)!=='doc-fixture-1'||knowledgeDocuments.has('doc-fixture-1'))failures.push(`Confirmed delete must remove exactly the selected document (${knowledgeDeletes.join(', ')}).`);
    if(await dialog.locator('[data-personal-knowledge-results] button').count())failures.push('A deleted document must disappear from the result list.');
    if(chatCalls!==0)failures.push('Deleting a stored document must not start a model call.');
    await documentQuery.fill('Quarterly'); await dialog.getByRole('button',{name:'Search documents',exact:true}).click(); await documentStatusLine.getByText('No stored documents matched those words.').waitFor();
    mode='gone-document'; await documentQuery.fill('Old'); await dialog.getByRole('button',{name:'Search documents',exact:true}).click(); await documentStatusLine.getByText(/1 stored document matched/).waitFor();
    await dialog.locator('[data-personal-knowledge-results] button').first().click(); page.once('dialog',prompt=>prompt.accept()); await dialog.getByRole('button',{name:'Delete selected document',exact:true}).click();
    await documentStatusLine.getByText('That document is already gone.').waitFor();
    if(await dialog.locator('[data-personal-knowledge-results] button').count())failures.push('A 404 delete must also clear the stale result.');
    const listedDocuments=await page.evaluate(()=>window.MimirApiClient.personalMemoryRequest('/knowledge/documents?workspace_id=personal',{method:'GET'}));
    if(listedDocuments?.object!=='list'||!Array.isArray(listedDocuments.data))failures.push('The explicit workspace document list must return metadata.');
    const beforeDocumentReject=backendCalls; const documentRejected=await page.evaluate(async()=>{for(const [path,method] of [['/knowledge/documents','GET'],['/knowledge/documents?workspace_id=','GET'],['/knowledge/documents','DELETE'],['/knowledge/documents/a/b','DELETE'],['/knowledge/search','GET'],['/knowledge/documents/a','GET']]){try{await window.MimirApiClient.personalMemoryRequest(path,{method});return false;}catch{}}return true;});
    if(!documentRejected||backendCalls!==beforeDocumentReject)failures.push(`Only an explicit workspace document list, exact document delete and document search paths may reach the backend (before ${beforeDocumentReject}, after ${backendCalls}).`);
    mode='malformed'; await dialog.getByRole('button',{name:'Refresh',exact:true}).click(); await page.getByText(/invalid consent response|Personal storage returned an invalid/).waitFor();
    const beforeRejected=backendCalls; const rejected=await page.evaluate(async()=>{for(const [path,method] of [['https://evil.invalid/memory','PATCH'],['/memory/search','GET'],['/memory/search','DELETE'],['/memory/search/item','POST']]){try{await window.MimirApiClient.personalMemoryRequest(path,{method});return false;}catch{}}return true;}); if(!rejected||backendCalls!==beforeRejected)failures.push(`Arbitrary origins and non-POST/invalid search paths must reject before backend access (before ${beforeRejected}, after ${backendCalls}).`);
    await page.evaluate(()=>{const original=Blob.prototype.arrayBuffer;window.__releasePrivateImport=null;Blob.prototype.arrayBuffer=function(){if(this.name==='private.txt')return new Promise(resolve=>{window.__releasePrivateImport=()=>original.call(this).then(resolve);});return original.call(this);};window.__restorePrivateImport=()=>{Blob.prototype.arrayBuffer=original;};});
    await noteDraft.fill(''); const beforePrivateImport=backendCalls; await importInput.setInputFiles({name:'private.txt',mimeType:'text/plain',buffer:Buffer.from('Must not replace')}); await page.waitForFunction(()=>typeof window.__releasePrivateImport==='function'); await page.evaluate(()=>document.getElementById('p0-sidebar-settings')?.click()); await page.waitForFunction(()=>!document.getElementById('p0-privacy-menu')?.hidden); await page.evaluate(()=>document.querySelector('#p0-privacy-menu [data-p0-action="set-privacy-mode:private"]')?.click()); await page.waitForFunction(()=>document.querySelector('#p0-privacy-menu [data-p0-action="set-privacy-mode:private"]')?.textContent?.includes('Valgt')); await page.evaluate(()=>{window.__releasePrivateImport?.();window.__restorePrivateImport?.();}); await page.waitForTimeout(20); if(await noteDraft.inputValue()!==''||backendCalls!==beforePrivateImport)failures.push('Private mode during a pending local file read must prevent replacement and remote requests.');
    await dialog.getByRole('button',{name:'Close',exact:true}).click(); const beforePrivate=backendCalls; await page.locator('#p0-privacy-menu [data-p0-action="personal-memory"]').evaluate(node=>node.click()); await page.getByText(/unavailable in private or superprivate mode/).waitFor(); if(backendCalls!==beforePrivate)failures.push('Private mode panel action must not contact personal cloud storage.');
    const identityPostsBeforeReload=identityPosts; const firstIdentitySession=await page.evaluate(()=>sessionStorage.getItem('mimir-backend-identity-session:https://backend.mmir.ai'));
    await page.reload({waitUntil:'networkidle'});
    const sameIdentityList=await page.evaluate(()=>window.MimirApiClient.personalMemoryRequest('/knowledge/documents?workspace_id=personal',{method:'GET'}));
    if(identityPosts!==identityPostsBeforeReload||sameIdentityList?.object!=='list'||!sameIdentityList.data?.some(item=>item.id==='doc-fixture-2'))failures.push(`Reload must reuse the same session identity and retain access to its own document list (posts ${identityPostsBeforeReload}->${identityPosts}).`);
    forceSecondIdentity=true; await page.evaluate(()=>sessionStorage.clear());
    await page.reload({waitUntil:'networkidle'});
    const otherIdentityList=await page.evaluate(()=>window.MimirApiClient.personalMemoryRequest('/knowledge/documents?workspace_id=personal',{method:'GET'}));
    if(identityPosts!==identityPostsBeforeReload+1||otherIdentityList?.object!=='list'||otherIdentityList.data?.some(item=>item.id==='doc-fixture-2'))failures.push(`A fresh session identity must not see the first identity’s document (posts ${identityPostsBeforeReload}->${identityPosts}).`);
    forceSecondIdentity=false; await page.evaluate(session=>sessionStorage.setItem('mimir-backend-identity-session:https://backend.mmir.ai',session),firstIdentitySession);
    check(); await browser.close(); browser=null; context=null; check();
  }finally{if(context)await context.close().catch(()=>{});if(browser)await browser.close().catch(()=>{});if(server.exitCode===null&&!server.killed)try{server.kill('SIGTERM');}catch(error){}}
}

await browserProof();
if(failures.length){console.error('P0 personal-memory smoke failed:');failures.forEach(item=>console.error('- '+item));process.exit(1);}
