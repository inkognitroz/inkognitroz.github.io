#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';

const root=resolve(process.cwd());
const failures=[];
async function browserProof(){
  const port=8799;
  const server=spawn(process.execPath,['scripts/serve-public.mjs'],{cwd:root,env:{...process.env,HOST:'127.0.0.1',PORT:String(port)},stdio:'ignore'});
  const deadline=Date.now()+60000;
  let browser=null;
  let context=null;
  try{
    let ready=false;
    while(Date.now()<deadline){try{if((await fetch(`http://127.0.0.1:${port}/mmir.html`)).ok){ready=true;break;}}catch(error){} await new Promise(resolve=>setTimeout(resolve,100));}
    if(!ready)throw new Error('Personal-memory browser fixture server did not start.');
    browser=await chromium.launch({headless:true});
    context=await browser.newContext({serviceWorkers:'block'});
    const page=await context.newPage();
    page.setDefaultTimeout(5000);
    let backendCalls=0; let memoryCalls=0; let consentCalls=0; let chatCalls=0; let mode='normal'; const backendPaths=[];
    const records=new Map(); let consent=false; let nextId=0;
    let deferredReadyResolve=null; let deferredRelease=null; let deferredConsentReads=0;
    const check=()=>{if(Date.now()>=deadline)throw new Error('personal-memory browser proof exceeded 60s');};
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
      const itemId=decodeURIComponent(path.split('/').at(-1)||'');
      if(path==='/memory'&&method==='GET')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({object:'list',data:[...records.values()]})});
      if(path.startsWith('/memory/')){if(!records.has(itemId))return route.fulfill({status:404,contentType:'application/json',body:JSON.stringify({error:{code:'not_found'}})});if(method==='DELETE'){records.delete(itemId);return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({object:'memory.deleted',id:itemId,deleted:true})});}return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({object:'memory.item',data:records.get(itemId)})});}
      return route.fulfill({status:400,contentType:'application/json',body:JSON.stringify({error:{code:'unexpected_fixture_route'}})});
    });
    await page.goto(`http://127.0.0.1:${port}/mmir.html`,{waitUntil:'domcontentloaded'});
    await page.locator('#p0-sidebar-settings').waitFor();
    if(consentCalls!==0)failures.push(`Opening public P0 must not contact personal memory endpoints before a user action (${backendPaths.join(', ')}).`);
    const composer=page.locator('#p0-input'); const beforeLocal=consentCalls; await composer.fill('/remember local sentinel'); await page.locator('#p0-send').click(); await page.getByText(/Saved locally in this browser/).waitFor(); if(consentCalls!==beforeLocal||chatCalls!==0)failures.push('Local /remember must remain browser-local without remote memory or model calls.'); await composer.fill('Keep this draft');
    await page.locator('#p0-sidebar-settings').click();
    await page.getByText('Personlig minne',{exact:true}).click();
    const dialog=page.locator('#mmir-p0-app dialog[aria-label="Personal memory"]');
    if(!(await dialog.isVisible()))failures.push('Personal memory dialog must be reachable and visible inside the P0 app.');
    if(backendCalls===0)failures.push('Explicit panel action must contact only the personal backend.');
    const beforeDisabled=memoryCalls; const disabledSave=dialog.getByRole('button',{name:'Save note',exact:true}); const disabledDraftValue=await composer.inputValue(); if(!(await disabledSave.isDisabled()))failures.push('Save must be disabled before consent.'); if(memoryCalls!==beforeDisabled||await composer.inputValue()!==disabledDraftValue)failures.push(`Disabled save must preserve draft and avoid remote memory write (calls ${memoryCalls-beforeDisabled}, draft ${JSON.stringify(await composer.inputValue())}).`);
    await dialog.getByRole('button',{name:'Enable remote storage',exact:true}).click(); await page.getByText(/Remote storage enabled/).waitFor();
    await dialog.locator('[data-personal-memory-text]').fill('Synthetic note'); await dialog.getByRole('button',{name:'Save note',exact:true}).click(); await dialog.getByRole('button',{name:/note: Synthetic note/}).waitFor();
    const note=dialog.getByRole('button',{name:/note: Synthetic note/}); await note.click(); const beforeUse=await composer.inputValue(); await dialog.getByRole('button',{name:'Use in next message',exact:true}).click(); await page.waitForFunction(()=>document.getElementById('p0-input')?.value.includes('[Personal memory you selected: "Synthetic note"]')); if(chatCalls!==0||!(await composer.inputValue()).startsWith('Keep this draft'))failures.push(`Use must insert labelled memory without auto-send or draft loss (chat ${chatCalls}, before ${JSON.stringify(beforeUse)}, after ${JSON.stringify(await composer.inputValue())}).`);
    await page.locator('#p0-sidebar-settings').click(); await page.getByText('Personlig minne',{exact:true}).click(); mode='fail-save'; await dialog.locator('[data-personal-memory-text]').fill('Rejected note'); await dialog.getByRole('button',{name:'Save note',exact:true}).click(); await page.getByText(/not saved|unavailable|failed/i).waitFor(); if(records.size!==1)failures.push('Failed remote save must not create a memory item.');
    await dialog.locator('[data-personal-memory-text]').fill('Queued note'); mode='defer-save'; const saveReady=new Promise(resolve=>{deferredReadyResolve=resolve;}); await dialog.getByRole('button',{name:'Save note',exact:true}).click(); await Promise.race([saveReady,new Promise((_,reject)=>setTimeout(()=>reject(new Error('Deferred save was not reached.')),5000))]); await dialog.getByRole('button',{name:'Disable remote storage',exact:true}).click(); const refreshResponse=page.waitForResponse(response=>new URL(response.url()).pathname==='/consent'&&response.request().method()==='GET'); await dialog.getByRole('button',{name:'Refresh',exact:true}).click(); await refreshResponse; if(!(await dialog.getByRole('button',{name:'Use in next message',exact:true}).isDisabled()))failures.push('Refresh must not revive consent controls while an earlier Disable intent is queued.'); deferredRelease?.(); await page.getByText(/Remote storage disabled/).waitFor();
    await dialog.getByRole('button',{name:'Enable remote storage',exact:true}).click(); await page.getByText(/Remote storage enabled/).waitFor(); const raceNote=dialog.getByRole('button',{name:/note: Synthetic note/}); await raceNote.click(); await composer.fill('Deferred consent draft'); const beforeDeferredUse=await composer.inputValue(); const beforeDeferredChat=chatCalls; deferredConsentReads=0; mode='defer-final-consent'; const finalConsentReady=new Promise(resolve=>{deferredReadyResolve=resolve;}); await dialog.getByRole('button',{name:'Use in next message',exact:true}).click(); await Promise.race([finalConsentReady,new Promise((_,reject)=>setTimeout(()=>reject(new Error('Deferred final consent read was not reached.')),5000))]); await dialog.getByRole('button',{name:'Disable remote storage',exact:true}).click(); await page.getByText(/Remote storage disabled/).waitFor(); deferredRelease?.(); await page.getByText(/Storage changed; nothing was copied/).waitFor(); if(await composer.inputValue()!==beforeDeferredUse||chatCalls!==beforeDeferredChat)failures.push('Disable during the final consent read must preserve the composer and prevent a chat POST.');
    const selectedNote=dialog.getByRole('button',{name:/note: Synthetic note/}); await selectedNote.click(); await dialog.getByRole('button',{name:'Delete selected',exact:true}).click(); await page.waitForFunction(()=>!document.querySelector('[data-personal-memory-list] button')); if(records.size!==0)failures.push('Delete must remove only the selected synthetic note.');
    await composer.fill('Keep this draft'); const disabledDraft=await composer.inputValue(); await dialog.getByRole('button',{name:'Disable remote storage',exact:true}).click(); await page.getByText(/Remote storage disabled/).waitFor(); if(!(await dialog.getByRole('button',{name:'Use in next message',exact:true}).isDisabled())||await composer.inputValue()!==disabledDraft)failures.push('Disabled use must preserve draft and block insertion.');
    mode='malformed'; await dialog.getByRole('button',{name:'Refresh',exact:true}).click(); await page.getByText(/invalid consent response|Personal storage returned an invalid/).waitFor();
    const rejected=await page.evaluate(async()=>{try{await window.MimirApiClient.personalMemoryRequest('https://evil.invalid/memory',{method:'PATCH'});return false;}catch{return true;}}); if(!rejected)failures.push('Arbitrary origin/method personal-memory request must reject.');
    await dialog.getByRole('button',{name:'Close',exact:true}).click(); await page.locator('#p0-sidebar-settings').click(); await page.getByText('Privat',{exact:true}).click(); const beforePrivate=backendCalls; await page.locator('#p0-privacy-menu [data-p0-action="personal-memory"]').click(); await page.getByText(/unavailable in private or superprivate mode/).waitFor(); if(backendCalls!==beforePrivate)failures.push('Private mode panel action must not contact personal cloud storage.');
    await browser.close(); browser=null; context=null;
  }finally{if(context)await context.close().catch(()=>{});if(browser)await browser.close().catch(()=>{});server.kill('SIGTERM');}
}

await browserProof();
if(failures.length){console.error('P0 personal-memory smoke failed:');failures.forEach(item=>console.error('- '+item));process.exit(1);}
