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
const DOCUMENT_ACCEPTANCE_ROUTE='hosted-route:groq/openai/gpt-oss-120b';
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
async function interceptDocumentAcceptanceGatewayRequest(route,forwardChat){
  const request=route.request(),url=new URL(request.url()),method=request.method(),path=url.pathname;
  if(url.origin!==GATEWAY_ORIGIN)return false;
  if(method==='POST'&&path==='/v1/chat/completions'){
    await forwardChat(route);
    return true;
  }
  if(method==='GET'&&['/health','/status','/v1/models'].includes(path)){
    await route.continue();
    return true;
  }
  await route.abort();
  return true;
}

function publishedOptions(){
  if(process.env.MMIR_L4_PUBLISHED_MODE!=='1')return null;
  if(process.env.MMIR_L4_PUBLISHED_URL!==PUBLISHED_PAGE)throw new Error('Published mode requires the exact MMIR_L4_PUBLISHED_URL allowlist entry.');
  const receipt=resolve(String(process.env.MMIR_L4_RECEIPT_PATH||''));
  if(!String(process.env.MMIR_L4_RECEIPT_PATH||'')||!receipt.startsWith('/tmp/'))throw new Error('Published mode requires MMIR_L4_RECEIPT_PATH under /tmp/.');
  return {receipt};
}
function documentAcceptanceOptions(){
  if(process.env.MMIR_L2_DOCUMENT_ACCEPTANCE!=='1')return null;
  if(process.env.MMIR_L2_DOCUMENT_ACCEPTANCE_CONFIRM!=='one-no-spend-document-acceptance')throw new Error('Document acceptance requires the exact one-run confirmation.');
  if(process.env.MMIR_L2_DOCUMENT_ACCEPTANCE_URL!==PUBLISHED_PAGE)throw new Error('Document acceptance requires the exact published-page allowlist entry.');
  if(process.env.MMIR_L2_DOCUMENT_ACCEPTANCE_ROUTE!==DOCUMENT_ACCEPTANCE_ROUTE)throw new Error('Document acceptance requires the exact forced free route.');
  const receipt=resolve(String(process.env.MMIR_L2_DOCUMENT_ACCEPTANCE_RECEIPT_PATH||''));
  if(!String(process.env.MMIR_L2_DOCUMENT_ACCEPTANCE_RECEIPT_PATH||'')||!receipt.startsWith('/tmp/'))throw new Error('Document acceptance requires a receipt path under /tmp/.');
  return {receipt};
}
function safeErrorCategory(error){
  const status=Number(error?.status||0),name=String(error?.name||'');
  if(status>=400&&status<600)return 'http_'+status;
  if(name==='TimeoutError')return 'timeout';
  if(name==='AbortError')return 'aborted';
  if(name==='Error')return 'operation_error';
  return 'unknown_error';
}
function receiptBody({runId,documentId='',createdAt,phase,deleted=false,disabled=false,chatCalled=false,groundingPassed=false,primaryError='',deleteStage='not_started',deleteStatus=null,deleteError='',fallbackStage='not_needed',fallbackStatus=null,fallbackError='',disableStage='not_started',disableError='',responses={},documentDom={}}){
  return {object:'mmir.l4.synthetic_receipt',run_id:runId,document_id:documentId,created_at:createdAt,phase,chat_called:chatCalled,grounding_passed:groundingPassed,primary_error:primaryError,cleanup:{document_deleted:deleted,ui_cleanup_passed:deleted,consent_disabled:disabled,delete_stage:deleteStage,delete_status:deleteStatus,delete_error:deleteError,fallback_stage:fallbackStage,fallback_status:fallbackStatus,fallback_error:fallbackError,disable_stage:disableStage,disable_error:disableError,responses,document_dom:documentDom},raw_document_included:false,bearer_included:false};
}
async function atomicReceipt(path,value){
  const serialized=JSON.stringify(value)+'\n';
  if(/Bearer\s|mmiru1\.|Cleanup fixture document/i.test(serialized))throw new Error('receipt attempted to store forbidden content');
  await mkdir(dirname(path),{recursive:true});
  const pending=path+'.tmp-'+process.pid+'-'+randomUUID();
  await writeFile(pending,serialized,{encoding:'utf8',mode:0o600});
  await rename(pending,path);
}
function documentAcceptanceReceipt({runId,documentId='',phase,backendRequests=0,searchRequests=0,modelRequests=0,modelStatus=null,noPaid=null,answerGrounded=false,cleanupStatus=null,consentDisabled=false,publicProvenance=unknownPublicProvenance(),error=''}){
  return {object:'mmir.l2.document_acceptance_receipt',run_id:runId,document_id:documentId,phase,route:DOCUMENT_ACCEPTANCE_ROUTE,limits:{backend_requests:backendRequests,knowledge_search_requests:searchRequests,model_requests:modelRequests,max_tokens:512,retries:0},model_status:modelStatus,no_paid_receipt:noPaid,answer_grounded:answerGrounded,public_provenance:publicProvenance,cleanup:{delete_status:cleanupStatus,consent_disabled:consentDisabled},error,raw_document_included:false,bearer_included:false};
}
function unknownPublicProvenance(){return {evidence:'public_asset_manifest',availability:'unknown',p0_chat_shell_version:'unknown',p0_personal_memory_version:'unknown',api_client_version:'unknown',deploy_source_sha:'unknown'};}
function safePublicAssetVersion(value){const version=String(value||'').trim();return /^[A-Za-z0-9._-]{1,120}$/.test(version)?version:'unknown';}
async function publicReceiptProvenance(loadManifest){
  try{
    const manifest=await loadManifest(),assets=manifest?.assets;
    if(!assets||typeof assets!=='object')return unknownPublicProvenance();
    return {evidence:'public_asset_manifest',availability:'reported',p0_chat_shell_version:safePublicAssetVersion(assets['p0-chat-shell.js']),p0_personal_memory_version:safePublicAssetVersion(assets['p0-personal-memory.js']),api_client_version:safePublicAssetVersion(assets['api-client.js']),deploy_source_sha:'unknown'};
  }catch(error){return unknownPublicProvenance();}
}
async function safeResponseSummary(response,capturedId=''){
  const summary={status:response.status(),object_list:false,data_array:false,data_count:0,captured_id_present:false};
  try{const body=await response.json();summary.object_list=body?.object==='list';summary.data_array=Array.isArray(body?.data);summary.data_count=summary.data_array?body.data.length:0;summary.captured_id_present=summary.data_array&&Boolean(capturedId)&&body.data.some(item=>String(item?.id||'')===capturedId);}catch(error){summary.body_json=false;}
  return summary;
}
async function safeDocumentDom(dialog,id){
  const status=dialog.locator('[data-personal-knowledge-status]');
  const state=await status.getAttribute('data-state').catch(()=>null);
  const text=await status.textContent().catch(()=>''),category=/Loading stored documents/.test(text)?'loading':/No stored documents/.test(text)?'empty':/invalid document list/.test(text)?'invalid_list':/unavailable|failed|request/i.test(text)?'unavailable':(text?'other':'missing');
  return {status_state:state||'missing',status_category:category,selector_count:await dialog.locator('[data-personal-knowledge-id="'+id+'"]').count().catch(()=>0)};
}
async function dialogIsOpen(dialog){return dialog.evaluate(node=>node.open===true);}
async function recoverableJourney({runId,createdAt,writeReceipt,createDocument,chat,deleteDocument,fallbackDelete,disableStorage,diagnostics={}}){
  let documentId=''; let primary=null; let deleteFailed=false; let disableFailed=false; let receiptFailed=false; const cleanup={deleteStage:'not_started',deleteStatus:null,deleteError:'',fallbackStage:'not_needed',fallbackStatus:null,fallbackError:'',disableStage:'not_started',disableError:'',responses:diagnostics.responses||{},documentDom:diagnostics.documentDom||{}};
  const directFallback=fallbackDelete||diagnostics.fallbackDelete;
  try{
    documentId=String(await createDocument()||'');
    if(!documentId)throw new Error('document id missing after create');
    await writeReceipt(receiptBody({runId,documentId,createdAt,phase:'created'}));
    await chat(documentId);diagnostics.chatCalled=true;diagnostics.groundingPassed=true;
  }catch(error){primary=error;diagnostics.primaryError=safeErrorCategory(error);}
  finally{
    if(documentId)try{await deleteDocument(documentId,cleanup);cleanup.deleteStage='deleted';}catch(error){deleteFailed=true;cleanup.deleteError=safeErrorCategory(error);if(directFallback)try{cleanup.fallbackStage='dispatch';cleanup.fallbackStatus=await directFallback(documentId);cleanup.fallbackStage='deleted';}catch(fallbackError){cleanup.fallbackStage='failed';cleanup.fallbackError=safeErrorCategory(fallbackError);}}
    try{cleanup.disableStage='disabling';await disableStorage();cleanup.disableStage='disabled';}catch(error){disableFailed=true;cleanup.disableError=safeErrorCategory(error);}
    try{await writeReceipt(receiptBody({runId,documentId,createdAt,phase:primary||deleteFailed||disableFailed?'failed':'complete',deleted:!!documentId&&!deleteFailed,disabled:!disableFailed,chatCalled:diagnostics.chatCalled===true,groundingPassed:diagnostics.groundingPassed===true,primaryError:diagnostics.primaryError||'',...cleanup}));}catch(error){receiptFailed=true;}
  }
  if(primary||deleteFailed||disableFailed||receiptFailed)throw new Error('synthetic journey did not complete with verified cleanup');
}
async function publishedRecoveryProtocolProof(){
  const captured='6aa412ca-94f6-4e5d-9194-9ca5556f8f52';
  const mockRoute=(method,path,origin=BACKEND_ORIGIN)=>{let action='';return {action:()=>action,request:()=>({url:()=>origin+path,method:()=>method,postDataJSON:()=>({})}),continue:async()=>{action='continue';},abort:async()=>{action='abort';},fulfill:async()=>{action='fulfill';}};};
  const allowedDelete=mockRoute('DELETE','/knowledge/documents/'+captured); await interceptPublishedRequest(allowedDelete,{documentId:()=>captured,onChat:()=>{}});
  if(allowedDelete.action()!=='continue')failures.push('Published interceptor must pass the captured document DELETE to the backend.');
  const otherDelete=mockRoute('DELETE','/knowledge/documents/11111111-1111-1111-1111-111111111111'); await interceptPublishedRequest(otherDelete,{documentId:()=>captured,onChat:()=>{}});
  if(otherDelete.action()!=='abort')failures.push('Published interceptor must reject a different document DELETE.');
  const gatewayChat=mockRoute('POST','/v1/chat/completions',GATEWAY_ORIGIN);let chatForwarded=false;
  if(!(await interceptDocumentAcceptanceGatewayRequest(gatewayChat,async route=>{chatForwarded=true;await route.fulfill({status:200,body:'{}'});} ))||!chatForwarded||gatewayChat.action()!=='fulfill')failures.push('Document acceptance must reach its guarded gateway chat branch before the non-GET gateway reject.');
  const otherGatewayPost=mockRoute('POST','/v1/other',GATEWAY_ORIGIN);await interceptDocumentAcceptanceGatewayRequest(otherGatewayPost,async()=>{failures.push('Unexpected gateway POST reached the chat branch.');});
  if(otherGatewayPost.action()!=='abort')failures.push('Document acceptance must still reject non-chat gateway POST requests.');
  const knownProvenance=await publicReceiptProvenance(async()=>({assets:{'p0-chat-shell.js':'20260924-nordstjerne-forside-v1','p0-personal-memory.js':'20260924-knowledge-document-list-v1','api-client.js':'20260924-knowledge-document-list-v1'}}));
  const unknownProvenance=await publicReceiptProvenance(async()=>null);
  const provenanceReceipt=documentAcceptanceReceipt({runId:'run-fixture',phase:'started',publicProvenance:knownProvenance});
  if(provenanceReceipt.public_provenance?.availability!=='reported'||provenanceReceipt.public_provenance?.p0_chat_shell_version!=='20260924-nordstjerne-forside-v1'||provenanceReceipt.public_provenance?.deploy_source_sha!=='unknown')failures.push('Document acceptance receipts must retain only public asset versions and an honest unknown deploy source SHA.');
  if(unknownProvenance.availability!=='unknown'||Object.values(unknownProvenance).some(value=>value!=='unknown'&&value!=='public_asset_manifest'))failures.push('Document acceptance receipts must mark unavailable public provenance as unknown.');
  for(const [method,path] of [['GET','/knowledge/documents/'+captured],['DELETE','/knowledge/documents/a/b'],['POST','/v1/chat/completions']])if(publishedBackendAllowed(method,path,captured))failures.push(`Published mode must reject ${method} ${path}.`);
  const safe=()=>{};
  const cases=[
    {name:'receipt-after-create',write:async receipt=>{if(receipt.phase==='created')throw new Error('fixture receipt failure');},expect:{deleted:true,disabled:true}},
    {name:'delete',write:async()=>{},delete:async()=>{throw new Error('fixture delete failure');},expect:{deleted:true,disabled:true}},
    {name:'disable',write:async()=>{},disable:async()=>{throw new Error('fixture disable failure');},expect:{deleted:true,disabled:true}},
    {name:'fallback-204',write:async()=>{},delete:async()=>{throw new Error('fixture ui delete failure');},fallback:async id=>id==='doc-fixture'?204:Promise.reject(new Error('wrong id')),expect:{deleted:false,disabled:true}},
    {name:'fallback-error',write:async()=>{},delete:async()=>{throw new Error('fixture ui delete failure');},fallback:async()=>{throw new Error('fixture fallback failure');},expect:{deleted:false,disabled:true}}
  ];
  for(const item of cases){
    let deleted=false,disabled=false; const receipts=[];
    try{await recoverableJourney({runId:'run-fixture',createdAt:'2026-09-26T00:00:00.000Z',writeReceipt:async receipt=>{receipts.push(receipt);await item.write(receipt);},createDocument:async()=> 'doc-fixture',chat:async()=>safe(),deleteDocument:item.delete||(async()=>{deleted=true;}),fallbackDelete:item.fallback,disableStorage:item.disable||(async()=>{disabled=true;})});failures.push('Published recovery fixture '+item.name+' unexpectedly passed.');}catch(error){}
    const text=JSON.stringify(receipts);
    if(item.name==='receipt-after-create'&&(!deleted||!disabled))failures.push('A receipt-write failure after create must still delete and disable.');
    if(item.name==='delete'&&(!disabled||receipts.at(-1)?.cleanup?.document_deleted!==false))failures.push('A delete failure must still disable and record failed cleanup.');
    if(item.name==='disable'&&(!deleted||receipts.at(-1)?.cleanup?.consent_disabled!==false))failures.push('A disable failure must retain its failed cleanup receipt.');
    if(item.name==='fallback-204'&&(receipts.at(-1)?.phase!=='failed'||receipts.at(-1)?.cleanup?.ui_cleanup_passed!==false||receipts.at(-1)?.cleanup?.fallback_status!==204))failures.push('Fallback 204 must clean only after UI failure without making the journey pass.');
    if(item.name==='fallback-error'&&(receipts.at(-1)?.cleanup?.fallback_stage!=='failed'||receipts.at(-1)?.cleanup?.fallback_error!=='operation_error'))failures.push('Fallback failure must remain separately diagnosable.');
    if(/Bearer\s|mmiru1\.|Cleanup fixture document/i.test(text))failures.push('Published recovery receipts must not contain a bearer or document text.');
  }
}
async function publishedModalRecoveryProof(mode='valid'){
  const port=mode==='valid'?8800:(mode==='delayed'?8801:(mode==='invalid'?8802:8803)),origin=`http://127.0.0.1:${port}`,documentId='11111111-1111-1111-1111-111111111111';
  const server=spawn(process.execPath,['scripts/serve-public.mjs'],{cwd:root,env:{...process.env,HOST:'127.0.0.1',PORT:String(port)},stdio:['ignore','pipe','pipe']});
  let output='';server.stdout.on('data',chunk=>{output=(output+chunk).slice(-2048);});
  const ready=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('published modal fixture server readiness timed out')),10000);server.stdout.on('data',()=>{if(output.includes(`Serving public at ${origin}/mmir.html`)){clearTimeout(timer);resolve();}});server.once('error',error=>{clearTimeout(timer);reject(error);});server.once('exit',()=>{clearTimeout(timer);reject(new Error('published modal fixture server exited before readiness'));});});
  let browser=null,context=null,cancelPendingChat=()=>{};
  try{
    browser=await chromium.launch({headless:true});context=await browser.newContext({serviceWorkers:'block'});const page=await context.newPage();page.setDefaultTimeout(5000);await page.addInitScript(()=>{window.MMIR_CHAT_VIA_BACKEND=true;});
    const ownerId='usr_fixture',workspaceId='personal',documents=new Map();let consent=false,deleted=false;const chatPayloads=[],searchResults=[];let pendingChat=null;const waitForChat=(stage,timeoutMs=2000)=>new Promise((resolve,reject)=>{if(pendingChat)return reject(new Error('backend chat observer already pending'));const finish=payload=>{clearTimeout(timer);if(pendingChat?.finish===finish)pendingChat=null;resolve(payload);};const timer=setTimeout(()=>{if(pendingChat?.finish===finish)pendingChat=null;reject(new Error(stage+' backend chat request timed out'));},timeoutMs);pendingChat={finish,cancel:()=>{clearTimeout(timer);if(pendingChat?.finish===finish)pendingChat=null;reject(new Error(stage+' backend chat wait cancelled'));}};});cancelPendingChat=()=>pendingChat?.cancel();const now=()=>new Date().toISOString();
    const json=(route,status,body)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
    await page.route('**/*',route=>interceptPublishedRequest(route,{pageOrigin:origin,documentId:()=>documentId,onChat:payload=>{chatPayloads.push(payload);pendingChat?.finish(payload);},backendHandler:async route=>{const request=route.request(),url=new URL(request.url()),method=request.method(),path=url.pathname;if(path==='/health')return json(route,200,{status:'online',service:'mmir-orchestrator',layer:'backend',capabilities:['identity','proxy.chat_completions']});if(path==='/identity/session')return json(route,200,{object:'mmir.identity_session',anonymous:true,token:'synthetic-session-token',identity_id:ownerId,issued_at:now(),expires_at:new Date(Date.now()+86400000).toISOString()});if(path==='/consent'&&method==='PUT'){consent=JSON.parse(request.postData()||'{}').memory===true;return json(route,200,{object:'consent',memory:consent});}if(path==='/consent')return json(route,200,{object:'consent',memory:consent});if(path==='/memory')return json(route,200,{object:'list',data:[]});if(path==='/knowledge/documents'&&method==='POST'){const body=JSON.parse(request.postData()||'{}');if(body.workspace_id!==workspaceId)return route.abort();documents.set(documentId,{id:documentId,owner_id:ownerId,workspace_id:workspaceId,name:'fixture.txt'});return json(route,201,{object:'knowledge.document',data:{...documents.get(documentId),type:'text/plain',source_type:'upload',size_chars:12,chunk_count:1,metadata:{},created_at:now()}});}if(path==='/knowledge/documents'&&method==='GET'){const data=url.searchParams.get('workspace_id')===workspaceId?[...documents.values()].filter(item=>item.owner_id===ownerId&&item.workspace_id===workspaceId).map(item=>({id:item.id,workspace_id:item.workspace_id,name:item.name,type:'text/plain',source_type:'upload',size_chars:12,chunk_count:1,metadata:{},created_at:now()})):[];if(chatPayloads.length&&mode==='delayed')await new Promise(resolve=>setTimeout(resolve,60));if(chatPayloads.length&&mode==='invalid')return json(route,200,{object:'unexpected',data:{}});if(chatPayloads.length&&mode==='empty')return json(route,200,{object:'list',user_id:ownerId,data:[]});return json(route,200,{object:'list',user_id:ownerId,data});}if(path==='/knowledge/search'){const data=documents.has(documentId)?[{snippet:'fixture marker',chunk_id:'fixture-chunk',document:{id:documentId,name:'fixture.txt'}}]:[];searchResults.push(data);return json(route,200,{data});}if(path==='/knowledge/documents/'+documentId&&method==='DELETE'){deleted=documents.delete(documentId);return route.fulfill({status:204,body:''});}return route.abort();}}));
    if(mode==='missing-chat'){try{await waitForChat('missing fixture',25);failures.push('Missing backend chat fixture unexpectedly resolved.');}catch(error){if(!String(error?.message||'').includes('timed out'))failures.push('Missing backend chat fixture did not fail with a clear timeout.');}return;}
    await page.goto(origin+'/mmir.html',{waitUntil:'domcontentloaded'});await page.locator('#p0-sidebar-settings').click();await page.getByText('Personlig minne',{exact:true}).click();const dialog=page.locator('#mmir-p0-app dialog[aria-label="Personal memory"]');await dialog.waitFor({state:'visible'});await dialog.getByRole('button',{name:'Enable remote storage',exact:true}).click();await dialog.getByText(/Remote storage enabled/).waitFor();await dialog.locator('[data-personal-memory-text]').fill('fixture marker');await dialog.locator('[data-personal-knowledge-name]').fill('fixture.txt');const created=page.waitForResponse(response=>new URL(response.url()).pathname==='/knowledge/documents'&&response.request().method()==='POST'&&response.status()===201);await dialog.getByRole('button',{name:'Save as knowledge document',exact:true}).click();await created;await dialog.locator('[data-personal-knowledge-id="'+documentId+'"]').waitFor();await dialog.getByRole('button',{name:'Close',exact:true}).click();const firstChat=waitForChat('first');await page.locator('#p0-input').fill('fixture');await page.locator('#p0-send').click();const firstPayload=await firstChat;await page.getByText('Synthetic local receipt.').waitFor();const firstSystem=(firstPayload.messages||[]).filter(message=>message?.role==='system').map(message=>String(message.content||'')).join('\n'),firstRetrieved=(firstPayload.messages||[]).filter(message=>message?.role==='user'&&String(message.content||'').includes('<mmir-untrusted-retrieved-data>')).map(message=>String(message.content||'')).join('\n');if(firstSystem.includes('fixture marker')||!firstRetrieved.includes('fixture marker'))failures.push('A stored document marker must be sent only as lower-trust user data before deletion.');await page.locator('#p0-sidebar-settings').click();await page.getByText('Personlig minne',{exact:true}).click();await dialog.waitFor({state:'visible'});await dialog.locator('[data-personal-knowledge-id="'+documentId+'"]').click();page.once('dialog',prompt=>prompt.accept());const removed=page.waitForResponse(response=>new URL(response.url()).pathname==='/knowledge/documents/'+documentId&&response.request().method()==='DELETE');await dialog.getByRole('button',{name:'Delete selected document',exact:true}).click();if((await removed).status()!==204)throw new Error('published modal recovery delete did not return 204');await dialog.getByRole('button',{name:'Close',exact:true}).click();const postDeleteChat=waitForChat('post-delete');await page.locator('#p0-input').fill('after deletion');await page.locator('#p0-send').click();const postDeletePayload=await postDeleteChat;const postDeleteSystem=(postDeletePayload.messages||[]).filter(message=>message?.role==='system').map(message=>String(message.content||'')).join('\n'),postDeleteUser=String([...(postDeletePayload.messages||[])].reverse().find(message=>message?.role==='user')?.content||''),postDeleteSearch=searchResults.at(-1);if(searchResults.length<2||!Array.isArray(postDeleteSearch)||postDeleteSearch.length!==0||postDeleteSystem.includes('fixture marker')||postDeleteUser.includes('fixture marker'))failures.push('A new turn after UI deletion must issue an empty fresh search and receive no fresh deleted-document context.');await page.locator('#p0-sidebar-settings').click();await page.getByText('Personlig minne',{exact:true}).click();await dialog.waitFor({state:'visible'});await dialog.getByRole('button',{name:'Disable remote storage',exact:true}).click();await dialog.getByText(/Remote storage disabled/).waitFor();if(!deleted||consent||chatPayloads.length!==2)failures.push('Published modal recovery must reopen, select its captured document, delete it, issue two locally intercepted chats, and disable storage.');
  }finally{cancelPendingChat();if(context)await context.close().catch(()=>{});if(browser)await browser.close().catch(()=>{});if(server.exitCode===null)server.kill('SIGTERM');}
}
async function publishedBrowserProof(options){
  const runId='l4-'+randomUUID(); const createdAt=new Date().toISOString();
  await atomicReceipt(options.receipt,receiptBody({runId,createdAt,phase:'started'}));
  let browser=null,context=null,page=null,dialog=null,chatPayload=null,cleanupDocumentId='';const diagnostics={chatCalled:false,groundingPassed:false,primaryError:'',responses:{},documentDom:{}};
  try{
    browser=await chromium.launch({headless:true}); context=await browser.newContext({serviceWorkers:'block'}); page=await context.newPage(); page.setDefaultTimeout(15000);
    await page.addInitScript(()=>{window.MMIR_CHAT_VIA_BACKEND=true;});
    await page.route('**/*',route=>interceptPublishedRequest(route,{documentId:()=>cleanupDocumentId,onChat:payload=>{chatPayload=payload;diagnostics.chatCalled=true;}}));
    await page.goto(PUBLISHED_PAGE,{waitUntil:'domcontentloaded'}); await page.locator('#p0-sidebar-settings').click(); await page.getByText('Personlig minne',{exact:true}).click(); dialog=page.locator('#mmir-p0-app dialog[aria-label="Personal memory"]'); await dialog.waitFor({state:'visible'});
    await dialog.getByRole('button',{name:'Enable remote storage',exact:true}).click(); await dialog.getByText(/Remote storage enabled/).waitFor();
    const marker='L4 synthetic '+runId; const name=runId+'.txt'; await dialog.locator('[data-personal-memory-text]').fill(marker); await dialog.locator('[data-personal-knowledge-name]').fill(name);
    diagnostics.fallbackDelete=async id=>{if(id!==cleanupDocumentId)throw new Error('fallback id mismatch');const result=await page.evaluate(async capturedId=>window.MimirApiClient.personalMemoryRequest('/knowledge/documents/'+encodeURIComponent(capturedId),{method:'DELETE'}),id);if(result!==null)throw new Error('fallback delete response was not 204');return 204;};
    await recoverableJourney({runId,createdAt,diagnostics,writeReceipt:value=>atomicReceipt(options.receipt,value),createDocument:async()=>{const created=page.waitForResponse(response=>new URL(response.url()).origin===BACKEND_ORIGIN&&new URL(response.url()).pathname==='/knowledge/documents'&&response.request().method()==='POST'&&response.status()===201);await dialog.getByRole('button',{name:'Save as knowledge document',exact:true}).click();const body=await (await created).json();cleanupDocumentId=String(body?.data?.id||'');return cleanupDocumentId;},chat:async()=>{await dialog.getByRole('button',{name:'Close',exact:true}).click();await page.locator('#p0-input').fill(runId);await page.locator('#p0-send').click();await page.getByText('Synthetic local receipt.').waitFor();const messages=chatPayload?.messages||[],systemText=messages.filter(message=>message?.role==='system').map(message=>String(message.content||'')).join('\n'),userText=messages.filter(message=>message?.role==='user').map(message=>String(message.content||'')).join('\n');if(systemText.includes(name)||systemText.includes(marker)||!userText.includes(name)||!userText.includes(marker))throw new Error('grounding trust boundary absent');diagnostics.groundingPassed=true;},deleteDocument:async(id,cleanup)=>{cleanup.deleteStage='reopen_modal';if(!(await dialogIsOpen(dialog))){const listed=page.waitForResponse(response=>new URL(response.url()).origin===BACKEND_ORIGIN&&new URL(response.url()).pathname==='/knowledge/documents'&&response.request().method()==='GET');await page.locator('#p0-sidebar-settings').click();await page.getByText('Personlig minne',{exact:true}).click();await dialog.waitFor({state:'visible'});cleanup.deleteStage='await_document_list';diagnostics.responses.document_list=await safeResponseSummary(await listed,id);}diagnostics.documentDom=await safeDocumentDom(dialog,id);cleanup.documentDom=diagnostics.documentDom;cleanup.deleteStage='select_document';await dialog.locator('[data-personal-knowledge-id="'+id+'"]').click();page.once('dialog',prompt=>prompt.accept());cleanup.deleteStage='dispatch_delete';const deleted=page.waitForResponse(response=>new URL(response.url()).pathname==='/knowledge/documents/'+encodeURIComponent(id)&&response.request().method()==='DELETE');await dialog.getByRole('button',{name:'Delete selected document',exact:true}).click();cleanup.deleteStage='await_delete_response';const response=await deleted;cleanup.deleteStatus=response.status();if(response.status()!==204)throw new Error('document delete response was not 204');},disableStorage:async()=>{if(!(await dialogIsOpen(dialog)))return;await dialog.getByRole('button',{name:'Disable remote storage',exact:true}).click();await dialog.getByText(/Remote storage disabled/).waitFor();}});
  }finally{if(context)await context.close().catch(()=>{});if(browser)await browser.close().catch(()=>{});}
}
async function documentAcceptanceProof(options){
  const runId='l2-document-'+randomUUID(),marker='Synthetic document '+runId,documentName=runId+'.txt',deadline=Date.now()+90000;
  let browser=null,context=null,page=null,documentId='',backendRequests=0,searchRequests=0,modelRequests=0,modelStatus=null,noPaid=null,answerGrounded=false,cleanupStatus=null,consentDisabled=false,publicProvenance=unknownPublicProvenance(),primaryError='';
  const remaining=()=>Math.max(1,Math.min(15000,deadline-Date.now()));
  const receipt=(phase)=>atomicReceipt(options.receipt,documentAcceptanceReceipt({runId,documentId,phase,backendRequests,searchRequests,modelRequests,modelStatus,noPaid,answerGrounded,cleanupStatus,consentDisabled,publicProvenance,error:primaryError}));
  await receipt('started');
  try{
    browser=await chromium.launch({headless:true,timeout:10000});context=await browser.newContext({serviceWorkers:'block'});page=await context.newPage();page.setDefaultTimeout(5000);await page.addInitScript(()=>{window.MMIR_CHAT_VIA_BACKEND=true;});
    await page.route('**/*',async route=>{const request=route.request(),url=new URL(request.url()),method=request.method(),path=url.pathname;
      if(Date.now()>=deadline)return route.abort();
      if(url.origin===PUBLISHED_PAGE.replace('/mmir.html',''))return route.continue();
      if(await interceptDocumentAcceptanceGatewayRequest(route,async route=>{
        if(++modelRequests>1)return route.abort();
        const incoming=request.postDataJSON(),messages=Array.isArray(incoming?.messages)?incoming.messages:[],system=messages.filter(item=>item?.role==='system').map(item=>String(item.content||'')).join('\n'),user=messages.filter(item=>item?.role==='user').map(item=>String(item.content||'')).join('\n');
        if(incoming?.model!==DOCUMENT_ACCEPTANCE_ROUTE||system.includes(marker)||!user.includes(marker))throw new Error('document grounding or forced route absent before egress');
        const payload={...incoming,max_tokens:512,stream:false,synthetic_probe:true,persist_feedback_store:false,policy:{...(incoming.policy||{}),paid_routes_allowed:false,require_no_paid_receipt:true}};
        const response=await route.fetch({postData:JSON.stringify(payload),timeout:remaining(),maxRetries:0,maxRedirects:0}),body=await response.text();modelStatus=response.status();let parsed={};try{parsed=JSON.parse(body);}catch{}const metadata=parsed?.mmir||{};noPaid=metadata.no_paid_routes_started??parsed.no_paid_routes_started??null;answerGrounded=response.status()===200&&String(parsed?.choices?.[0]?.message?.content||'').includes(marker);return route.fulfill({response,body});
      }))return;
      if(url.origin!==BACKEND_ORIGIN)return route.abort();
      const allowed=(method==='GET'&&['/health','/consent','/memory','/knowledge/documents','/v1/models'].includes(path))||(method==='POST'&&['/identity/session','/knowledge/documents','/knowledge/search'].includes(path))||(method==='PUT'&&path==='/consent')||(method==='DELETE'&&Boolean(documentId)&&path==='/knowledge/documents/'+encodeURIComponent(documentId));
      if(!allowed||++backendRequests>20)return route.abort();
      if(path==='/knowledge/search')searchRequests+=1;
      return route.fetch({timeout:remaining(),maxRetries:0,maxRedirects:0}).then(response=>response.text().then(body=>route.fulfill({response,body})));
    });
    await page.goto(PUBLISHED_PAGE,{waitUntil:'domcontentloaded',timeout:remaining()});publicProvenance=await publicReceiptProvenance(()=>page.evaluate(async()=>{const response=await fetch('./apps/mimir-chat-portal/asset-versions.json',{cache:'no-store'});return response.ok?response.json():null;}));const catalogue=page.waitForResponse(response=>new URL(response.url()).origin===GATEWAY_ORIGIN&&new URL(response.url()).pathname==='/v1/models',{timeout:remaining()});await catalogue;
    await page.locator('#p0-model').click();await page.locator('button[data-model-id="'+DOCUMENT_ACCEPTANCE_ROUTE+'"][data-model-selectable="true"]').click();await page.locator('#p0-sidebar-settings').click();await page.getByText('Personlig minne',{exact:true}).click();const dialog=page.locator('#mmir-p0-app dialog[aria-label="Personal memory"]');await dialog.waitFor({state:'visible'});await dialog.getByRole('button',{name:'Enable remote storage',exact:true}).click();await dialog.getByText(/Remote storage enabled/).waitFor();await dialog.locator('[data-personal-memory-text]').fill(marker);await dialog.locator('[data-personal-knowledge-name]').fill(documentName);
    const created=page.waitForResponse(response=>new URL(response.url()).origin===BACKEND_ORIGIN&&new URL(response.url()).pathname==='/knowledge/documents'&&response.request().method()==='POST'&&response.status()===201,{timeout:remaining()});await dialog.getByRole('button',{name:'Save as knowledge document',exact:true}).click();const createBody=await (await created).json();documentId=String(createBody?.data?.id||'');if(!documentId)throw new Error('created document id missing');await receipt('created');await dialog.locator('[data-personal-knowledge-id="'+documentId+'"]').waitFor({timeout:remaining()});await dialog.getByRole('button',{name:'Close',exact:true}).click();await page.locator('#p0-input').fill('What exact synthetic document marker was saved?');await page.locator('#p0-send').click();await page.waitForFunction(value=>[...document.querySelectorAll('.p0-message-assistant .p0-message-body')].some(node=>node.textContent.includes(value)),marker,{timeout:remaining()});if(modelRequests!==1||searchRequests<1||modelStatus!==200||noPaid!==true||!answerGrounded)throw new Error('bounded no-spend grounded answer contract failed');
  }catch(error){primaryError=safeErrorCategory(error);}
  finally{
    if(page&&documentId)try{const result=await page.evaluate(async id=>window.MimirApiClient.personalMemoryRequest('/knowledge/documents/'+encodeURIComponent(id),{method:'DELETE'}),documentId);if(result!==null)throw new Error('delete response was not 204');cleanupStatus=204;}catch(error){cleanupStatus=0;primaryError=primaryError||safeErrorCategory(error);}
    if(page)try{await page.evaluate(()=>window.MimirApiClient.personalMemoryRequest('/consent',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({memory:false})}));consentDisabled=true;}catch(error){primaryError=primaryError||safeErrorCategory(error);}
    await receipt(primaryError||cleanupStatus!==204||!consentDisabled?'failed':'complete').catch(()=>{});if(context)await context.close().catch(()=>{});if(browser)await browser.close().catch(()=>{});
  }
  if(primaryError||cleanupStatus!==204||!consentDisabled)throw new Error('document acceptance did not complete with verified cleanup');
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
await publishedModalRecoveryProof('delayed');
await publishedModalRecoveryProof('missing-chat');
for(const mode of ['invalid','empty']){try{await publishedModalRecoveryProof(mode);failures.push('Published modal '+mode+' list unexpectedly selected a document.');}catch(error){if(safeErrorCategory(error)!=='timeout')failures.push('Published modal '+mode+' list did not retain the selector failure category.');}}
const published=publishedOptions();
if(published)await publishedBrowserProof(published);
const documentAcceptance=documentAcceptanceOptions();
if(documentAcceptance)await documentAcceptanceProof(documentAcceptance);
if(failures.length){console.error('P0 personal-memory smoke failed:');failures.forEach(item=>console.error('- '+item));process.exit(1);}
