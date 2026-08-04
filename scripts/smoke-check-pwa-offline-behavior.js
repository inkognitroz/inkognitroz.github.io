#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import vm from 'node:vm';

function createEventTarget(){
  const listeners=new Map();
  const target={
    addEventListener(type,listener,options){
      const entries=listeners.get(type)||[];
      entries.push({listener,once:Boolean(options&&typeof options==='object'&&options.once)});
      listeners.set(type,entries);
    },
    dispatchEvent(event){
      for(const entry of [...(listeners.get(event.type)||[])]){
        entry.listener.call(target,event);
        if(entry.once)listeners.set(event.type,(listeners.get(event.type)||[]).filter((candidate)=>candidate!==entry));
      }
      return true;
    }
  };
  return target;
}

class FakeElement{
  constructor(id,onHtml){
    this.id=id;
    this.dataset={};
    this.listeners=new Map();
    this.onHtml=onHtml;
    this._innerHTML='';
    this.textContent='';
  }
  addEventListener(type,listener){
    const entries=this.listeners.get(type)||[];
    entries.push(listener);
    this.listeners.set(type,entries);
  }
  async emit(type){
    const event={type,target:this,preventDefault(){}};
    for(const listener of this.listeners.get(type)||[])await listener.call(this,event);
  }
  set innerHTML(value){
    this._innerHTML=String(value||'');
    if(this.onHtml)this.onHtml(this._innerHTML);
  }
  get innerHTML(){return this._innerHTML;}
  setAttribute(name,value){this[name]=value;}
  focus(){this.focused=true;}
}

class FakeHeaders{
  constructor(values={}){this.values=new Map(Object.entries(values).map(([key,value])=>[key.toLowerCase(),String(value)]));}
  get(name){return this.values.get(String(name).toLowerCase())||null;}
}

class FakeResponse{
  constructor(body='',options={}){
    this.body=String(body);
    this.status=options.status===undefined?200:options.status;
    this.ok=this.status>=200&&this.status<300;
    this.type=options.type||'basic';
    this.headers=new FakeHeaders(options.headers);
  }
  clone(){return new FakeResponse(this.body,{status:this.status,type:this.type,headers:Object.fromEntries(this.headers.values)});}
  async text(){return this.body;}
  static error(){return new FakeResponse('',{status:0,type:'error'});}
}

async function checkEarlyInstallPrompt(root,fail){
  const publicDir=join(root,'public');
  const html=readFileSync(join(publicDir,'mmir.html'),'utf8');
  const pwa=readFileSync(join(publicDir,'apps','mimir-chat-portal','pwa.js'),'utf8');
  const bridgeMatch=html.match(/<script\s+id=["']mimir-pwa-install-bridge["'][^>]*>([\s\S]*?)<\/script>/i);
  if(!bridgeMatch){
    fail('PWA timing: early install-prompt bridge is missing.');
    return;
  }
  if(html.indexOf('id="mimir-pwa-install-bridge"')>html.indexOf('rel="manifest"')){
    fail('PWA timing: install-prompt bridge must run before the manifest can make the page installable.');
  }

  const elements=new Map();
  const registerHtml=(source)=>{
    for(const match of source.matchAll(/\bid=["']([^"']+)["']/g)){
      if(!elements.has(match[1]))elements.set(match[1],new FakeElement(match[1]));
    }
  };
  elements.set('pwa-install-root',new FakeElement('pwa-install-root',registerHtml));
  const window=createEventTarget();
  const document={
    readyState:'complete',
    getElementById(id){return elements.get(id)||null;},
    addEventListener(){}
  };
  const navigator={
    userAgent:'Chromium',
    standalone:false,
    serviceWorker:{register:async()=>({waiting:null})}
  };
  const location={protocol:'https:',hostname:'example.test',hash:'',href:'https://example.test/mmir.html'};
  const caches={match:async()=>null};
  Object.assign(window,{window,document,navigator,location,caches,matchMedia:()=>({matches:false})});
  class BrowserEvent{constructor(type){this.type=type;}}
  const context=vm.createContext({window,document,navigator,location,caches,fetch:async()=>new FakeResponse(),Event:BrowserEvent,console,setTimeout,clearTimeout,Promise,URL});

  vm.runInContext(bridgeMatch[1],context,{filename:'mimir-pwa-install-bridge'});
  let prevented=false;
  let promptCalls=0;
  const promptEvent={
    type:'beforeinstallprompt',
    preventDefault(){prevented=true;},
    prompt(){promptCalls+=1;return Promise.resolve();},
    userChoice:Promise.resolve({outcome:'accepted'})
  };
  window.dispatchEvent(promptEvent);
  if(!prevented)fail('PWA timing: the early bridge did not prevent and retain the browser install prompt.');
  if(window.__MimirPwaInstallPrompt?.event!==promptEvent)fail('PWA timing: the early prompt was not retained before pwa.js loaded.');

  vm.runInContext(pwa,context,{filename:'pwa.js'});
  const installButton=elements.get('pwa-install-button');
  if(!installButton){
    fail('PWA timing: deferred PWA UI did not render its install control.');
    return;
  }
  await installButton.emit('click');
  if(promptCalls!==1)fail(`PWA timing: deferred install control prompted ${promptCalls} times instead of consuming the early event once.`);
  if(window.__MimirPwaInstallPrompt?.event!==null)fail('PWA timing: consumed install prompt remained reusable in the shared bridge state.');
}

async function checkOfflineFetchBehavior(root,fail){
  const source=readFileSync(join(root,'public','sw.js'),'utf8');
  const cacheName=source.match(/const CACHE_NAME='([^']+)'/)?.[1]||'';
  const priorCacheName='mmir-pwa-d354-20260804-release-0-2-beta-v2';
  const origin='https://example.test';
  const listeners=new Map();
  const matchCalls=[];
  const deletedCaches=[];
  const stored=new Map([
    [origin+'/apps/mimir-chat-portal/p0-chat-shell.css',new FakeResponse('.mimir-chat-main{display:block}',{headers:{'content-type':'text/css'}})],
    [origin+'/apps/mimir-chat-portal/p0-chat-shell.js',new FakeResponse('window.__offlineShell=true',{headers:{'content-type':'text/javascript'}})],
    [origin+'/offline.html',new FakeResponse('<!doctype html><title>Offline</title>',{headers:{'content-type':'text/html'}})]
  ]);
  const absolute=(input)=>new URL(typeof input==='string'?input:input.url,origin+'/').href;
  const withoutSearch=(value)=>{const url=new URL(value);url.search='';return url.href;};
  const caches={
    async match(input,options={}){
      const requested=absolute(input);
      matchCalls.push({requested,ignoreSearch:Boolean(options.ignoreSearch)});
      if(!options.ignoreSearch)return stored.get(requested)?.clone();
      const normalized=withoutSearch(requested);
      for(const [key,response] of stored.entries())if(withoutSearch(key)===normalized)return response.clone();
      return undefined;
    },
    async open(){return {put:async()=>{},addAll:async()=>{}};},
    async keys(){return [priorCacheName,cacheName,'unrelated-cache'];},
    async delete(key){deletedCaches.push(key);return true;}
  };
  const self={
    location:new URL(origin+'/sw.js'),
    clients:{claim:async()=>{}},
    skipWaiting:async()=>{},
    addEventListener(type,listener){listeners.set(type,listener);}
  };
  const context=vm.createContext({self,caches,fetch:async()=>{throw new Error('offline');},Response:FakeResponse,URL,Set,Promise,console});
  vm.runInContext(source,context,{filename:'sw.js'});
  const activateHandler=listeners.get('activate');
  if(!activateHandler){
    fail('PWA update: service worker did not install an activate handler.');
  }else{
    let activation=null;
    activateHandler({waitUntil(value){activation=Promise.resolve(value);}});
    if(!activation)fail('PWA update: activate handler did not bind cache cleanup.');
    else await activation;
    if(cacheName===priorCacheName)fail('PWA update: release-readiness hotfix reused the prior cache identity.');
    if(!deletedCaches.includes(priorCacheName))fail('PWA update: prior release cache was not deleted during activation.');
    if(deletedCaches.includes(cacheName))fail('PWA update: current release cache was deleted during activation.');
    if(deletedCaches.includes('unrelated-cache'))fail('PWA update: unrelated cache was deleted during activation.');
  }
  const fetchHandler=listeners.get('fetch');
  if(!fetchHandler){
    fail('PWA offline: service worker did not install a fetch handler.');
    return;
  }
  async function request(path,{mode='cors',destination='' }={}){
    let responsePromise=null;
    fetchHandler({
      request:{method:'GET',url:new URL(path,origin+'/').href,mode,destination},
      respondWith(value){responsePromise=Promise.resolve(value);}
    });
    if(!responsePromise)throw new Error('fetch handler ignored same-origin GET request');
    return responsePromise;
  }

  const css=await request('/apps/mimir-chat-portal/p0-chat-shell.css?v=20260715-truthful-proof-line-v1',{destination:'style'});
  if(css.headers.get('content-type')!=='text/css')fail('PWA offline: versioned cached CSS did not retain a CSS MIME type.');
  if(!(await css.text()).includes('mimir-chat-main'))fail('PWA offline: versioned CSS did not resolve to its unversioned precache entry.');

  const script=await request('/apps/mimir-chat-portal/p0-chat-shell.js?v=20260715-truthful-proof-line-v1',{destination:'script'});
  if(script.headers.get('content-type')!=='text/javascript')fail('PWA offline: versioned cached JavaScript did not retain a script MIME type.');
  if(!(await script.text()).includes('__offlineShell'))fail('PWA offline: versioned JavaScript did not resolve to its unversioned precache entry.');

  const missingCss=await request('/apps/mimir-chat-portal/not-precached.css?v=1',{destination:'style'});
  if(missingCss.type!=='error'||missingCss.headers.get('content-type')==='text/html')fail('PWA offline: uncached CSS received an HTML fallback instead of a network error.');

  const missingModule=await request('/apps/mimir-chat-portal/module-entry?v=1',{destination:'script'});
  if(missingModule.type!=='error'||missingModule.headers.get('content-type')==='text/html')fail('PWA offline: uncached module request received an HTML fallback instead of a network error.');
  if(matchCalls.some((call)=>call.ignoreSearch&&call.requested.includes('/module-entry?')))fail('PWA offline: cache lookup ignored query parameters for a path outside the known shell precache.');

  const navigation=await request('/missing-page',{mode:'navigate',destination:'document'});
  if(navigation.headers.get('content-type')!=='text/html'||!(await navigation.text()).includes('<title>Offline</title>'))fail('PWA offline: failed document navigation did not receive offline.html.');
}

export async function collectPwaOfflineBehaviorFailures(root=process.cwd()){
  const failures=[];
  const fail=(message)=>failures.push(message);
  try{await checkEarlyInstallPrompt(resolve(root),fail);}catch(error){fail('PWA timing harness failed: '+error.message);}
  try{await checkOfflineFetchBehavior(resolve(root),fail);}catch(error){fail('PWA offline harness failed: '+error.message);}
  return failures;
}

const invokedPath=process.argv[1]?pathToFileURL(resolve(process.argv[1])).href:'';
if(import.meta.url===invokedPath){
  const failures=await collectPwaOfflineBehaviorFailures();
  if(failures.length){
    console.error('PWA install/offline behavior smoke failed:');
    failures.forEach((failure)=>console.error('- '+failure));
    process.exit(1);
  }
  console.log('PWA install/offline behavior smoke passed.');
}
