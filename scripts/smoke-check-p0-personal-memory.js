#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { mkdir, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { chromium } from '@playwright/test';

const root=resolve(process.cwd());
const failures=[];
const PUBLISHED_PAGE='https://mmir.ai/mmir.html';
const BACKEND_ORIGIN='https://backend.mmir.ai';
const GATEWAY_ORIGIN='https://api.mmir.ai';
function publishedBackendAllowed(method,path,documentId=''){
  if(method==='DELETE')return Boolean(documentId)&&path==='/knowledge/documents/'+encodeURIComponent(documentId);
  return ['GET /health','POST /identity/session','GET /identity/session','GET /consent','PUT /consent','GET /memory','GET /knowledge/documents','POST /knowledge/documents','POST /knowledge/search'].includes(method+' '+path);
}
async function interceptPublishedRequest(route,{documentId,onChat,pageOrigin='https://mmir.ai',backendHandler=null,gatewayHandler=null}){
  const request=route.request(),url=new URL(request.url()),json=(status,body)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
  if(url.origin===pageOrigin)return route.continue();
  if(url.origin===GATEWAY_ORIGIN){if(gatewayHandler)return gatewayHandler(route);if(request.method()==='POST')return route.abort();return json(200,url.pathname==='/v1/models'?{object:'list',data:[{id:'mmir-supergenius',executable:true,selectable:true,availability:'available'}]}:{ok:true,object:'list',data:[]});}
  if(url.origin!==BACKEND_ORIGIN)return route.abort();
  if(url.pathname==='/v1/chat/completions'){onChat(request.postDataJSON());return json(200,{id:'synthetic-l4-chat',model:'locally-fulfilled-no-model',choices:[{message:{role:'assistant',content:'Synthetic local receipt.'}}]});}
  if(!publishedBackendAllowed(request.method(),url.pathname,documentId()))return route.abort();
  if(backendHandler)return backendHandler(route);
  return route.continue();
}

function publishedOptions(){
  if(process.env.MMIR_L4_PUBLISHED_MODE!=='1')return null;
  if(process.env.MMIR_L4_PUBLISHED_URL!==PUBLISHED_PAGE)throw new Error('Published mode requires the exact MMIR_L4_PUBLISHED_URL allowlist entry.');
  const receipt=resolve(String(process.env.MMIR_L4_RECEIPT_PATH||''));
  if(!String(process.env.MMIR_L4_RECEIPT_PATH||'')||!receipt.startsWith('/tmp/'))throw new Error('Published mode requires MMIR_L4_RECEIPT_PATH under /tmp/.');
  return {receipt};
}
function receiptBody({runId,documentId='',createdAt,phase,deleted=false,disabled=false,chat='not_started',deleteStage='not_started',deleteStatus=null,disableStage='not_started'}){
  return {object:'mmir.l4.synthetic_receipt',run_id:runId,document_id:documentId,created_at:createdAt,phase,chat,cleanup:{document_deleted:deleted,consent_disabled:disabled,delete_stage:deleteStage,delete_status:deleteStatus,disable_stage:disableStage},raw_document_included:false,bearer_included:false};
}
async function atomicReceipt(path,value){
  const serialized=JSON.stringify(value)+'\n';
  if(/Bearer\s|mmiru1\.|Cleanup fixture document/i.test(serialized))throw new Error('receipt attempted to store forbidden content');
  await mkdir(dirname(path),{recursive:true});
  const pending=path+'.tmp-'+process.pid+'-'+randomUUID();
  await writeFile(pending,serialized,{encoding:'utf8',mode:0o600});
  await rename(pending,path);
}
async function recoverableJourney({runId,createdAt,writeReceipt,createDocument,chat,deleteDocument,disableStorage}){
  let documentId=''; let primary=null; let deleteFailed=false; let disableFailed=false; let receiptFailed=false; const cleanup={deleteStage:'not_started',deleteStatus:null,disableStage:'not_started'};
  try{
    documentId=String(await createDocument()||'');
    if(!documentId)throw new Error('document id missing after create');
    await writeReceipt(receiptBody({runId,documentId,createdAt,phase:'created'}));
    await chat(documentId);
  }catch(error){primary=error;}
  finally{
    if(documentId)try{await deleteDocument(documentId,cleanup);cleanup.deleteStage='deleted';}catch(error){deleteFailed=true;}
    try{cleanup.disableStage='disabling';await disableStorage();cleanup.disableStage='disabled';}catch(error){disableFailed=true;}
    try{await writeReceipt(receiptBody({runId,documentId,createdAt,phase:primary||deleteFailed||disableFailed?'failed':'complete',deleted:!!documentId&&!deleteFailed,disabled:!disableFailed,chat:'locally_fulfilled',...cleanup}));}catch(error){receiptFailed=true;}
  }
  if(primary||deleteFailed||disableFailed||receiptFailed)throw new Error('synthetic journey did not complete with verified cleanup');
}
async function publishedRecoveryProtocolProof(){
  const captured='6aa412ca-94f6-4e5d-9194-9ca5556f8f52';
  const mockRoute=(method,path)=>{let action='';return {action:()=>action,request:()=>({url:()=>BACKEND_ORIGIN+path,method:()=>method,postDataJSON:()=>({})}),continue:async()=>{action='continue';},abort:async()=>{action='abort';},fulfill:async()=>{action='fulfill';}};};
  const allowedDelete=mockRoute('DELETE','/knowledge/documents/'+captured); await interceptPublishedRequest(allowedDelete,{documentId:()=>captured,onChat:()=>{}});
  if(allowedDelete.action()!=='continue')failures.push('Published interceptor must pass the captured document DELETE to the backend.');
  const otherDelete=mockRoute('DELETE','/knowledge/documents/11111111-1111-1111-1111-111111111111'); await interceptPublishedRequest(otherDelete,{documentId:()=>captured,onChat:()=>{}});
  if(otherDelete.action()!=='abort')failures.push('Published interceptor must reject a different document DELETE.');
  for(const [method,path] of [['GET','/knowledge/documents/'+captured],['DELETE','/knowledge/documents/a/b'],['POST','/v1/chat/completions']])if(publishedBackendAllowed(method,path,captured))failures.push(`Published mode must reject ${method} ${path}.`);
  const safe=()=>{};
  const cases=[
    {name:'receipt-after-create',write:async receipt=>{if(receipt.phase==='created')throw new Error('fixture receipt failure');},expect:{deleted:true,disabled:true}},
    {name:'delete',write:async()=>{},delete:async()=>{throw new Error('fixture delete failure');},expect:{deleted:true,disabled:true}},
    {name:'disable',write:async()=>{},disable:async()=>{throw new Error('fixture disable failure');},expect:{deleted:true,disabled:true}}
  ];
  for(const item of cases){
    let deleted=false,disabled=false; const receipts=[];
    try{await recoverableJourney({runId:'run-fixture',createdAt:'2026-09-26T00:00:00.000Z',writeReceipt:async receipt=>{receipts.push(receipt);await item.write(receipt);},createDocument:async()=> 'doc-fixture',chat:async()=>safe(),deleteDocument:item.delete||(async()=>{deleted=true;}),disableStorage:item.disable||(async()=>{disabled=true;})});failures.push('Published recovery fixture '+item.name+' unexpectedly passed.');}catch(error){}
    const text=JSON.stringify(receipts);
    if(item.name==='receipt-after-create'&&(!deleted||!disabled))failures.push('A receipt-write failure after create must still delete and disable.');
    if(item.name==='delete'&&(!disabled||receipts.at(-1)?.cleanup?.document_deleted!==false))failures.push('A delete failure must still disable and record failed cleanup.');
    if(item.name==='disable'&&(!deleted||receipts.at(-1)?.cleanup?.consent_disabled!==false))failures.push('A disable failure must retain its failed cleanup receipt.');
    if(/Bearer\s|mmiru1\.|Cleanup fixture document/i.test(text))failures.push('Published recovery receipts must not contain a bearer or document text.');
  }
}
async function publishedModalRecoveryProof(){
  const port=8800,origin=`http://127.0.0.1:${port}`,documentId='11111111-1111-1111-1111-111111111111';
  const server=spawn(process.execPath,['scripts/serve-public.mjs'],{cwd:root,env:{...process.env,HOST:'127.0.0.1',PORT:String(port)},stdio:['ignore','pipe','pipe']});
  let output='';server.stdout.on('data',chunk=>{output=(output+chunk).slice(-2048);});
  const ready=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('published modal fixture server readiness timed out')),10000);server.stdout.on('data',()=>{if(output.includes(`Serving public at ${origin}/mmir.html`)){clearTimeout(timer);resolve();}});server.once('error',error=>{clearTimeout(timer);reject(error);});server.once('exit',()=>{clearTimeout(timer);reject(new Error('published modal fixture server exited before readiness'));});});
  let browser=null,context=null;
  try{
    browser=await chromium.launch({headless:true});context=await browser.newContext({serviceWorkers:'block'});const page=await context.newPage();page.setDefaultTimeout(5000);await page.addInitScript(()=>{window.MMIR_CHAT_VIA_BACKEND=true;});
    let consent=false,deleted=false,chatPayload=null;const now=()=>new Date().toISOString();
    const json=(route,status,body)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
    await page.route('**/*',route=>interceptPublishedRequest(route,{pageOrigin:origin,documentId:()=>documentId,onChat:payload=>{chatPayload=payload;},backendHandler:async route=>{const request=route.request(),url=new URL(request.url()),method=request.method(),path=url.pathname;if(path==='/health')return json(route,200,{status:'online',service:'mmir-orchestrator',layer:'backend',capabilities:['identity','proxy.chat_completions']});if(path==='/identity/session')return json(route,200,{object:'mmir.identity_session',anonymous:true,token:'synthetic-session-token',identity_id:'usr_fixture',issued_at:now(),expires_at:new Date(Date.now()+86400000).toISOString()});if(path==='/consent'&&method==='PUT'){consent=JSON.parse(request.postData()||'{}').memory===true;return json(route,200,{object:'consent',memory:consent});}if(path==='/consent')return json(route,200,{object:'consent',memory:consent});if(path==='/memory')return json(route,200,{object:'list',data:[]});if(path==='/knowledge/documents'&&method==='POST')return json(route,201,{object:'knowledge.document',data:{id:documentId,workspace_id:'personal',name:'fixture.txt',type:'text/plain',source_type:'upload',size_chars:12,chunk_count:1,metadata:{},created_at:now()}});if(path==='/knowledge/documents'&&method==='GET')return json(route,200,{object:'list',user_id:'usr_fixture',data:deleted?[]:[{id:documentId,workspace_id:'personal',name:'fixture.txt',type:'text/plain',source_type:'upload',size_chars:12,chunk_count:1,metadata:{},created_at:now()}]});if(path==='/knowledge/search')return json(route,200,{data:[{snippet:'fixture marker',chunk_id:'fixture-chunk',document:{id:documentId,name:'fixture.txt'}}]});if(path==='/knowledge/documents/'+documentId&&method==='DELETE'){deleted=true;return route.fulfill({status:204,body:''});}return route.abort();}}));
    await page.goto(origin+'/mmir.html',{waitUntil:'domcontentloaded'});await page.locator('#p0-sidebar-settings').click();await page.getByText('Personlig minne',{exact:true}).click();const dialog=page.locator('#mmir-p0-app dialog[aria-label="Personal memory"]');await dialog.waitFor({state:'visible'});await dialog.getByRole('button',{name:'Enable remote storage',exact:true}).click();await dialog.getByText(/Remote storage enabled/).waitFor();await dialog.locator('[data-personal-memory-text]').fill('fixture marker');await dialog.locator('[data-personal-knowledge-name]').fill('fixture.txt');const created=page.waitForResponse(response=>new URL(response.url()).pathname==='/knowledge/documents'&&response.request().method()==='POST'&&response.status()===201);await dialog.getByRole('button',{name:'Save as knowledge document',exact:true}).click();await created;await dialog.locator('[data-personal-knowledge-id="'+documentId+'"]').waitFor();await dialog.getByRole('button',{name:'Close',exact:true}).click();await page.locator('#p0-input').fill('fixture');await page.locator('#p0-send').click();await page.getByText('Synthetic local receipt.').waitFor();await page.locator('#p0-sidebar-settings').click();await page.getByText('Personlig minne',{exact:true}).click();await dialog.waitFor({state:'visible'});await dialog.locator('[data-personal-knowledge-id="'+documentId+'"]').click();page.once('dialog',prompt=>prompt.accept());const removed=page.waitForResponse(response=>new URL(response.url()).pathname==='/knowledge/documents/'+documentId&&response.request().method()==='DELETE');await dialog.getByRole('button',{name:'Delete selected document',exact:true}).click();if((await removed).status()!==204)throw new Error('published modal recovery delete did not return 204');await dialog.getByRole('button',{name:'Disable remote storage',exact:true}).click();await dialog.getByText(/Remote storage disabled/).waitFor();if(!deleted||consent||!chatPayload)failures.push('Published modal recovery must reopen, select its captured document, delete it, disable storage, and intercept chat locally.');
  }finally{if(context)await context.close().catch(()=>{});if(browser)await browser.close().catch(()=>{});if(server.exitCode===null)server.kill('SIGTERM');}
}
async function publishedBrowserProof(options){
  const runId='l4-'+randomUUID(); const createdAt=new Date().toISOString();
  await atomicReceipt(options.receipt,receiptBody({runId,createdAt,phase:'started'}));
  let browser=null,context=null,page=null,dialog=null,chatPayload=null,cleanupDocumentId='';
  try{
    browser=await chromium.launch({headless:true}); context=await browser.newContext({serviceWorkers:'block'}); page=await context.newPage(); page.setDefaultTimeout(15000);
    await page.addInitScript(()=>{window.MMIR_CHAT_VIA_BACKEND=true;});
    await page.route('**/*',route=>interceptPublishedRequest(route,{documentId:()=>cleanupDocumentId,onChat:payload=>{chatPayload=payload;}}));
    await page.goto(PUBLISHED_PAGE,{waitUntil:'domcontentloaded'}); await page.locator('#p0-sidebar-settings').click(); await page.getByText('Personlig minne',{exact:true}).click(); dialog=page.locator('#mmir-p0-app dialog[aria-label="Personal memory"]'); await dialog.waitFor({state:'visible'});
    await dialog.getByRole('button',{name:'Enable remote storage',exact:true}).click(); await dialog.getByText(/Remote storage enabled/).waitFor();
    const marker='L4 synthetic '+runId; const name=runId+'.txt'; await dialog.locator('[data-personal-memory-text]').fill(marker); await dialog.locator('[data-personal-knowledge-name]').fill(name);
    await recoverableJourney({runId,createdAt,writeReceipt:value=>atomicReceipt(options.receipt,value),createDocument:async()=>{const created=page.waitForResponse(response=>new URL(response.url()).origin===BACKEND_ORIGIN&&new URL(response.url()).pathname==='/knowledge/documents'&&response.request().method()==='POST'&&response.status()===201);await dialog.getByRole('button',{name:'Save as knowledge document',exact:true}).click();const body=await (await created).json();cleanupDocumentId=String(body?.data?.id||'');return cleanupDocumentId;},chat:async()=>{await dialog.getByRole('button',{name:'Close',exact:true}).click();await page.locator('#p0-input').fill(runId);await page.locator('#p0-send').click();await page.getByText('Synthetic local receipt.').waitFor();const contextText=(chatPayload?.messages||[]).filter(message=>message?.role==='system').map(message=>String(message.content||'')).join('\n');if(!contextText.includes(name)||!contextText.includes(marker))throw new Error('grounded document context absent');},deleteDocument:async(id,cleanup)=>{cleanup.deleteStage='reopen_modal';if(!(await dialog.isVisible())){await page.locator('#p0-sidebar-settings').click();await page.getByText('Personlig minne',{exact:true}).click();await dialog.waitFor({state:'visible'});}cleanup.deleteStage='select_document';await dialog.locator('[data-personal-knowledge-id="'+id+'"]').click();page.once('dialog',prompt=>prompt.accept());cleanup.deleteStage='dispatch_delete';const deleted=page.waitForResponse(response=>new URL(response.url()).pathname==='/knowledge/documents/'+encodeURIComponent(id)&&response.request().method()==='DELETE');await dialog.getByRole('button',{name:'Delete selected document',exact:true}).click();cleanup.deleteStage='await_delete_response';const response=await deleted;cleanup.deleteStatus=response.status();if(response.status()!==204)throw new Error('document delete response was not 204');},disableStorage:async()=>{if(!(await dialog.isVisible()))return;await dialog.getByRole('button',{name:'Disable remote storage',exact:true}).click();await dialog.getByText(/Remote storage disabled/).waitFor();}});
  }finally{if(context)await context.close().catch(()=>{});if(browser)await browser.close().catch(()=>{});}
}
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
    let backendCalls=0; let memoryCalls=0; let searchCalls=0; let consentCalls=0; let chatCalls=0; let mode='normal'; const backendPaths=[]; const searchPayloads=[];
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
      if(path==='/identity/session'&&method==='POST')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({object:'mmir.identity_session',anonymous:true,token:'synthetic-session-token',identity_id:'usr_fixture',issued_at:now,expires_at:new Date(Date.now()+86400000).toISOString()})});
      if(path==='/identity/session'&&method==='GET')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({object:'mmir.identity_session',anonymous:true,token:'synthetic-session-token',identity_id:'usr_fixture',issued_at:new Date(Date.now()-1000).toISOString(),expires_at:new Date(Date.now()+86400000).toISOString()})});
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
        const data=[...knowledgeDocuments.entries()].map(([id,name])=>({id,workspace_id:workspace,name,type:'text/plain',source_type:'upload',size_chars:name.length,chunk_count:1,metadata:{},created_at:now}));
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
    const waitForKnowledgeList=()=>page.waitForResponse(response=>{const responseUrl=new URL(response.url());return responseUrl.origin==='https://backend.mmir.ai'&&responseUrl.pathname==='/knowledge/documents'&&response.request().method()==='GET'&&response.status()===200;});
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
    const initialKnowledgeList=waitForKnowledgeList(); await dialog.getByRole('button',{name:'Enable remote storage',exact:true}).click(); await page.getByText(/Remote storage enabled/).waitFor(); const initialKnowledgeListBody=await (await initialKnowledgeList).json(); if(initialKnowledgeListBody?.object!=='list'||!Array.isArray(initialKnowledgeListBody.data)||knowledgeListCalls!==1)failures.push('Enable must await and validate the completed initial document list response.');
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
    await documentStatusLine.getByText('This identity already holds 100 documents.').waitFor();
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
    // A browser journey can fail after a document has been accepted. Keep this
    // recovery proof inside the original page/context: an anonymous identity is
    // bearer-bound, so a later context must never be expected to clean it up.
    let recoveryDocumentId=''; let recoveryFailureObserved=false; let recoveryDeleted=false; let recoveryDisabled=false; let recoveryCleanupError='';
    try{
      await dialog.getByRole('button',{name:'Enable remote storage',exact:true}).click();
      await dialog.locator('[data-personal-memory-status]').getByText(/Remote storage enabled/).waitFor();
      await noteDraft.fill('Cleanup fixture document'); await documentName.fill('cleanup-fixture.txt');
      const createdForCleanup=page.waitForResponse(response=>new URL(response.url()).pathname==='/knowledge/documents'&&response.request().method()==='POST'&&response.status()===201);
      await dialog.getByRole('button',{name:'Save as knowledge document',exact:true}).click();
      await createdForCleanup;
      recoveryDocumentId=[...knowledgeDocuments.keys()].at(-1)||'';
      if(!recoveryDocumentId)throw new Error('cleanup fixture document id was not recorded');
      throw new Error('synthetic journey failure after document write');
    }catch(error){
      recoveryFailureObserved=String(error?.message||'').includes('synthetic journey failure');
    }finally{
      try{
        if(recoveryDocumentId){
          const recoveryButton=dialog.locator('[data-personal-knowledge-id="'+recoveryDocumentId+'"]').first();
          await recoveryButton.click(); page.once('dialog',prompt=>prompt.accept());
          // Register only as the click is issued. Arming it before the journey
          // creates the same unhandled timeout that this recovery path avoids.
          const deletedForCleanup=page.waitForResponse(response=>new URL(response.url()).pathname==='/knowledge/documents/'+encodeURIComponent(recoveryDocumentId)&&response.request().method()==='DELETE'&&response.status()===204);
          await dialog.getByRole('button',{name:'Delete selected document',exact:true}).click();
          await deletedForCleanup;
          recoveryDeleted=!knowledgeDocuments.has(recoveryDocumentId);
        }
      }catch(error){
        recoveryCleanupError=String(error?.message||'cleanup delete failed');
      }finally{
        try{
          await dialog.getByRole('button',{name:'Disable remote storage',exact:true}).click();
          await dialog.locator('[data-personal-memory-status]').getByText(/Remote storage disabled/).waitFor();
          recoveryDisabled=true;
        }catch(error){
          recoveryCleanupError=recoveryCleanupError||String(error?.message||'cleanup disable failed');
        }
      }
    }
    if(!recoveryFailureObserved||!recoveryDeleted||!recoveryDisabled||recoveryCleanupError)failures.push(`A failed document journey must delete its own fixture and disable storage in the original context (failure ${recoveryFailureObserved}, deleted ${recoveryDeleted}, disabled ${recoveryDisabled}, cleanup ${recoveryCleanupError||'ok'}).`);
    const listedDocuments=await page.evaluate(()=>window.MimirApiClient.personalMemoryRequest('/knowledge/documents?workspace_id=personal',{method:'GET'}));
    if(listedDocuments?.object!=='list'||!Array.isArray(listedDocuments.data))failures.push('The explicit workspace document list must return metadata.');
    const beforeDocumentReject=backendCalls; const documentRejected=await page.evaluate(async()=>{for(const [path,method] of [['/knowledge/documents','GET'],['/knowledge/documents?workspace_id=','GET'],['/knowledge/documents','DELETE'],['/knowledge/documents/a/b','DELETE'],['/knowledge/search','GET'],['/knowledge/documents/a','GET']]){try{await window.MimirApiClient.personalMemoryRequest(path,{method});return false;}catch{}}return true;});
    if(!documentRejected||backendCalls!==beforeDocumentReject)failures.push(`Only an explicit workspace document list, exact document delete and document search paths may reach the backend (before ${beforeDocumentReject}, after ${backendCalls}).`);
    mode='malformed'; await dialog.getByRole('button',{name:'Refresh',exact:true}).click(); await page.getByText(/invalid consent response|Personal storage returned an invalid/).waitFor();
    const beforeRejected=backendCalls; const rejected=await page.evaluate(async()=>{for(const [path,method] of [['https://evil.invalid/memory','PATCH'],['/memory/search','GET'],['/memory/search','DELETE'],['/memory/search/item','POST']]){try{await window.MimirApiClient.personalMemoryRequest(path,{method});return false;}catch{}}return true;}); if(!rejected||backendCalls!==beforeRejected)failures.push(`Arbitrary origins and non-POST/invalid search paths must reject before backend access (before ${beforeRejected}, after ${backendCalls}).`);
    await page.evaluate(()=>{const original=Blob.prototype.arrayBuffer;window.__releasePrivateImport=null;Blob.prototype.arrayBuffer=function(){if(this.name==='private.txt')return new Promise(resolve=>{window.__releasePrivateImport=()=>original.call(this).then(resolve);});return original.call(this);};window.__restorePrivateImport=()=>{Blob.prototype.arrayBuffer=original;};});
    await noteDraft.fill(''); const beforePrivateImport=backendCalls; await importInput.setInputFiles({name:'private.txt',mimeType:'text/plain',buffer:Buffer.from('Must not replace')}); await page.waitForFunction(()=>typeof window.__releasePrivateImport==='function'); await page.evaluate(()=>document.getElementById('p0-sidebar-settings')?.click()); await page.waitForFunction(()=>!document.getElementById('p0-privacy-menu')?.hidden); await page.evaluate(()=>document.querySelector('#p0-privacy-menu [data-p0-action="set-privacy-mode:private"]')?.click()); await page.waitForFunction(()=>document.querySelector('#p0-privacy-menu [data-p0-action="set-privacy-mode:private"]')?.textContent?.includes('Valgt')); await page.evaluate(()=>{window.__releasePrivateImport?.();window.__restorePrivateImport?.();}); await page.waitForTimeout(20); if(await noteDraft.inputValue()!==''||backendCalls!==beforePrivateImport)failures.push('Private mode during a pending local file read must prevent replacement and remote requests.');
    await dialog.getByRole('button',{name:'Close',exact:true}).click(); const beforePrivate=backendCalls; await page.locator('#p0-privacy-menu [data-p0-action="personal-memory"]').evaluate(node=>node.click()); await page.getByText(/unavailable in private or superprivate mode/).waitFor(); if(backendCalls!==beforePrivate)failures.push('Private mode panel action must not contact personal cloud storage.');
    check(); await browser.close(); browser=null; context=null; check();
  }finally{if(context)await context.close().catch(()=>{});if(browser)await browser.close().catch(()=>{});if(server.exitCode===null&&!server.killed)try{server.kill('SIGTERM');}catch(error){}}
}

await browserProof();
await publishedRecoveryProtocolProof();
await publishedModalRecoveryProof();
const published=publishedOptions();
if(published)await publishedBrowserProof(published);
if(failures.length){console.error('P0 personal-memory smoke failed:');failures.forEach(item=>console.error('- '+item));process.exit(1);}
