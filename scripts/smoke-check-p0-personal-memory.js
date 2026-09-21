#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { join, resolve } from 'node:path';
import { chromium } from '@playwright/test';

const root=resolve(process.cwd());
const portal=join(root,'public/apps/mimir-chat-portal');
const read=(name)=>readFileSync(join(portal,name),'utf8');
const api=read('api-client.js');
const panel=read('p0-personal-memory.js');
const shell=read('p0-chat-shell.js');
const html=readFileSync(join(root,'public/mmir.html'),'utf8');
const manifest=JSON.parse(read('asset-versions.json'));
const packageJson=JSON.parse(readFileSync(join(root,'package.json'),'utf8'));
const failures=[];
const need=(value,message)=>{if(!value)failures.push(message);};

need(api.includes('async function personalMemoryRequest(path,options={})'),'Personal memory must use the dedicated API-client request path.');
need(api.includes("const normalized=String(path||'');")&&api.includes("BACKEND_IDENTITY_ORIGIN+path"),'Personal memory requests must stay on the hardcoded backend origin.');
need(api.includes("method==='PUT'&&normalized==='/consent'")&&api.includes("method==='POST'&&normalized==='/memory'"),'Personal memory allowlist must cover only reviewed write endpoints.');
need(!api.includes("method==='PATCH'&&"),'Personal memory must not invent unsupported PATCH updates.');
need(panel.includes('async function open(options={})')&&!panel.includes('await refresh();\n  }'), 'Opening the panel must not silently refresh before an explicit action.');
need(panel.includes("if(privateMode)throw new Error('Personal cloud storage is unavailable in private or superprivate mode.')"),'Private modes must reject cloud memory operations.');
need(panel.includes("await request('/consent',{method:'PUT'")&&panel.includes('memory:true'),'Enable must explicitly grant remote storage.');
need(panel.includes('if(!(await consent())||token!==gate)')&&panel.includes('token!==gate||!(await consent())'),'Use-in-next-message must recheck consent and stop a stale in-flight copy.');
need(panel.includes("[Personal memory you selected: \"")&&panel.includes('composer.dispatchEvent(new Event'), 'Use must visibly insert selected context into the composer, not send chat.');
need(shell.includes("menuButton('personal-memory','Personlig minne'")&&shell.includes('open?.({privateMode:privateModeActive()})'),'Public P0 privacy menu must reach the explicit personal-memory panel.');
need(shell.includes("function addLocalMemory(text)")&&shell.includes('browserLocalOnly:true'),'Existing local memory commands must remain browser-local.');
const version=manifest.assets?.['p0-personal-memory.js'];
need(Boolean(version)&&html.includes(`p0-personal-memory.js?v=${version}`),'Public shell must load the pinned personal-memory module.');
need(String(packageJson.scripts?.check||'').includes('smoke-check-p0-personal-memory.js'),'Normal check must include this focused personal-memory smoke.');
async function browserProof(){
  const port=8799;
  const server=spawn(process.execPath,['scripts/serve-public.mjs'],{cwd:root,env:{...process.env,HOST:'127.0.0.1',PORT:String(port)},stdio:'ignore'});
  const deadline=Date.now()+10000;
  try{
    let ready=false;
    while(Date.now()<deadline){try{if((await fetch(`http://127.0.0.1:${port}/mmir.html`)).ok){ready=true;break;}}catch(error){} await new Promise(resolve=>setTimeout(resolve,100));}
    if(!ready)throw new Error('Personal-memory browser fixture server did not start.');
    const browser=await chromium.launch({headless:true});
    const page=await browser.newPage({serviceWorkers:'block'});
    let backendCalls=0;
    await page.route('**/*',async route=>{
      const url=route.request().url();
      if(url.startsWith(`http://127.0.0.1:${port}/`))return route.continue();
      if(!url.startsWith('https://backend.mmir.ai/'))return route.abort();
      backendCalls+=1;
      const path=new URL(url).pathname;
      const now=Date.now();
      const body=path==='/health'?{status:'online',service:'mmir-orchestrator',layer:'backend',capabilities:['identity','proxy.chat_completions']}:
        path==='/identity/session'?{object:'mmir.identity_session',anonymous:true,token:'token',identity_id:'user',issued_at:new Date(now).toISOString(),expires_at:new Date(now+86400000).toISOString()}:
        path==='/consent'?{memory:false}:{};
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
    });
    await page.goto(`http://127.0.0.1:${port}/mmir.html`,{waitUntil:'domcontentloaded'});
    await page.locator('#p0-privacy').waitFor();
    if(backendCalls!==0)failures.push('Opening public P0 must not contact personal backend before a user action.');
    await page.locator('#p0-privacy').click();
    await page.getByText('Personlig minne',{exact:true}).click();
    const dialog=page.locator('#mmir-p0-app dialog[aria-label="Personal memory"]');
    if(!(await dialog.isVisible()))failures.push('Personal memory dialog must be reachable and visible inside the P0 app.');
    if(backendCalls===0)failures.push('Explicit panel action must be able to contact only the personal backend.');
    await dialog.getByText('Close',{exact:true}).click();
    await page.locator('#p0-privacy').click();
    await page.getByText('Privat',{exact:true}).click();
    const beforePrivate=backendCalls;
    await page.locator('#p0-privacy').click();
    await page.getByText('Personlig minne',{exact:true}).click();
    if(backendCalls!==beforePrivate)failures.push('Private mode must not contact personal cloud storage.');
    await browser.close();
  }finally{server.kill('SIGTERM');}
}

await browserProof();
if(failures.length){console.error('P0 personal-memory smoke failed:');failures.forEach(item=>console.error('- '+item));process.exit(1);}
