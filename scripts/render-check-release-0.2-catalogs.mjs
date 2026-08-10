import { spawn } from 'node:child_process';
import { createServer as createNetServer } from 'node:net';
import { chromium } from '@playwright/test';

const host='127.0.0.1';
const preferredPort=Number(process.env.MMIR_RELEASE_02_PORT||8820);
let port=preferredPort;
let baseUrl='';
const failures=[];
const assert=(condition,message)=>{if(!condition)failures.push(message);};
const proofSafeTagline='0.2 Beta · status verifiseres live';

function canListen(candidate){
  return new Promise((resolve,reject)=>{
    const server=createNetServer();
    server.once('error',error=>error?.code==='EADDRINUSE'?resolve(false):reject(error));
    server.listen(candidate,host,()=>server.close(()=>resolve(true)));
  });
}

async function resolvePort(){
  for(let offset=0;offset<40;offset+=1){
    const candidate=preferredPort+offset;
    if(await canListen(candidate))return candidate;
  }
  throw new Error('No free release 0.2 test port');
}

function startServer(){
  const child=spawn(process.execPath,['scripts/serve-public.mjs'],{
    cwd:process.cwd(),
    env:{...process.env,HOST:host,PORT:String(port)},
    stdio:['ignore','pipe','pipe']
  });
  child.stdout.on('data',chunk=>process.stdout.write(String(chunk)));
  child.stderr.on('data',chunk=>process.stderr.write(String(chunk)));
  return child;
}

async function waitForServer(){
  const deadline=Date.now()+10000;
  while(Date.now()<deadline){
    try{const response=await fetch(baseUrl+'/modeller/index.html');if(response.ok)return;}catch(error){}
    await new Promise(resolve=>setTimeout(resolve,120));
  }
  throw new Error('Release 0.2 test server did not become ready');
}

async function routeApi(page,{fail=false,failModels=false,zeroLive=false,degradedSupergeni=false,releaseReady=false,replace=false,delayMs=0}={}){
  if(replace){
    await page.unroute('https://api.mmir.ai/status');
    await page.unroute('https://api.mmir.ai/v1/models');
  }
  await page.route('https://api.mmir.ai/status',async route=>{
    if(delayMs)await new Promise(resolve=>setTimeout(resolve,delayMs));
    return route.fulfill({
      status:fail?503:200,
      contentType:'application/json',
      body:fail?JSON.stringify({error:'unavailable'}):JSON.stringify({
        ok:true,
        capabilities:['chat.completions','web.search.execute.safe_live_data_slice'],
        live_verified_intelligence_route_count:releaseReady?1:0,
        operator_readiness:{
          readiness_state:releaseReady?'ready':'blocked',
          default_writer_readiness:{
            classification:releaseReady?'ready':'blocked',
            authenticated_release_ready:releaseReady
          },
          journeys:{
            first_chat_ready:releaseReady,
            compare_ready:releaseReady,
            swarm_preview_ready:releaseReady
          }
        }
      })
    });
  });
  await page.route('https://api.mmir.ai/v1/models',async route=>{
    if(delayMs)await new Promise(resolve=>setTimeout(resolve,delayMs));
    return route.fulfill({
      status:fail||failModels?503:200,
      contentType:'application/json',
      body:fail||failModels?JSON.stringify({error:'unavailable'}):JSON.stringify({
        object:'list',
        total_visible_model_count:4,
        live_selectable_model_count:2,
        live_verified_intelligence_route_count:1,
        degraded_model_count:1,
        data:[
          {id:'supergeni',display_name:'Supergeni',provider:'mmir',status:degradedSupergeni?'temporarily_degraded':'available',route_id:'browser-guide/free',node_id:'browser-guide',route_state:degradedSupergeni?'orchestrator_degraded':'available',route_type:'managed_provider',executable:!degradedSupergeni,selectable:false,live_e2e_verified:false,cost_class:'free',capabilities:['chat.completions'],limitations:['Fixture orchestrator.']},
          {id:'verified-writer',display_name:'Verified Writer',provider:'fixture',status:'available',route_id:'fixture/verified',node_id:'fixture-a',route_state:'available',route_type:'external_untrusted_free',executable:true,selectable:true,live_e2e_verified:!zeroLive,cost_class:'free-quota',capabilities:['chat.completions'],limitations:['Fixture verified route.']},
          {id:'configured-writer',display_name:'Configured Writer',provider:'fixture',status:'available',route_id:'fixture/configured',node_id:'fixture-b',route_state:'available',route_type:'external_untrusted_free',executable:true,selectable:true,live_e2e_verified:false,cost_class:'free-quota',capabilities:['chat.completions'],limitations:['Fixture without fresh E2E proof.']},
          {id:'degraded-writer',display_name:'Degraded Writer',provider:'fixture',status:'temporarily_degraded',route_id:'fixture/degraded',node_id:'fixture-c',route_state:'provider_temporarily_degraded',route_type:'external_untrusted_free',executable:false,selectable:false,live_e2e_verified:false,cost_class:'free-quota',capabilities:['chat.completions'],limitations:['Fixture degraded route.']}
        ]
      })
    });
  });
}

async function noHorizontalOverflow(page,label){
  const sizes=await page.evaluate(()=>({viewport:window.innerWidth,document:document.documentElement.scrollWidth,body:document.body.scrollWidth}));
  assert(sizes.document<=sizes.viewport+1,label+' must not overflow the viewport');
  assert(sizes.body<=sizes.viewport+1,label+' body must not overflow the viewport');
}

async function assertProofSafeBrand(page,selector,label){
  const taglines=await page.locator(selector).allTextContents();
  assert(taglines.length>0,label+' must render a visible release tagline');
  assert(taglines.every(text=>text.trim()===proofSafeTagline),label+' must render only the proof-safe live-status tagline; got '+taglines.join(' | '));
}

async function checkChatNav(browser){
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.addInitScript(()=>{
    try{delete window.SpeechRecognition;}catch(error){window.SpeechRecognition=undefined;}
    try{delete window.webkitSpeechRecognition;}catch(error){window.webkitSpeechRecognition=undefined;}
  });
  let hostedChatCalls=0;
  await page.route('https://api.mmir.ai/v1/chat/completions',route=>{
    hostedChatCalls+=1;
    return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'release blocked fixture'})});
  });
  await routeApi(page);
  await page.goto(baseUrl+'/mmir.html',{waitUntil:'domcontentloaded'});
  await page.waitForSelector('#mmir-p0-app .p0-release-nav');
  await page.waitForSelector('#p0-release-warning[data-state="blocked"]');
  await assertProofSafeBrand(page,'.p0-brand-text > span','chat shell');
  assert((await page.locator('#model-library .eyebrow').textContent())?.trim()===proofSafeTagline,'openable intelligence exchange must render the proof-safe live-status tagline');
  assert(!(await page.locator('body').textContent()).includes('Intelligence. Connected.'),'public chat DOM must not retain the unproven connected-intelligence claim');
  const labels=await page.locator('.p0-release-nav a').allTextContents();
  assert(labels.join('|')==='Prøv|Modeller|Kapabiliteter|Tillit','visible chat shell must expose exactly the compact 0.2 tabs');
  assert(await page.locator('.p0-composer').isVisible(),'chat composer must remain visible after nav injection');
  const warning=await page.locator('#p0-release-warning').innerText();
  assert(/ikke produksjonsgrønn/i.test(warning),'blocked operator release must be disclosed at the chat entry point');
  assert(/sensitive|høyrisiko/i.test(warning),'blocked chat entry must warn against sensitive or high-risk use');
  assert(await page.locator('#p0-send').isDisabled(),'hosted send CTA must fail closed while first chat is blocked');
  const blockedDefaultRouteText=await page.locator('#p0-route').innerText();
  assert(/offentlig svarbane blokkert/i.test(blockedDefaultRouteText),'blocked first chat must make the default route line fail closed; got '+blockedDefaultRouteText);
  assert(!/\bready\b/i.test(blockedDefaultRouteText),'blocked first chat must never label the default route ready; got '+blockedDefaultRouteText);
  assert(await page.locator('#p0-route').getAttribute('data-state')==='error','blocked default route line must expose error state');
  assert(await page.locator('#p0-send').evaluate(button=>getComputedStyle(button).cursor)==='not-allowed','blocked send must look unavailable, not loading');
  if(await page.locator('#p0-superboost').count())assert(await page.locator('#p0-superboost').isDisabled(),'blocked compare gate must disable Superboost');
  if(await page.locator('#p0-council').count())assert(await page.locator('#p0-council').isDisabled(),'blocked swarm gate must disable Council');
  assert(/blokkert/i.test(await page.locator('#p0-privacy').getAttribute('title')||''),'privacy control must not claim the hosted route is allowed while release is blocked');
  assert(await page.locator('#p0-mic').evaluate(button=>button.disabled===false&&button.tabIndex>=0),'unsupported voice control must remain keyboard discoverable');
  assert(await page.locator('#p0-mic').getAttribute('aria-disabled')==='true','unsupported voice control must expose unavailable semantics');
  await page.locator('#p0-input').fill('Dette skal ikke nå hosted chat');
  await page.locator('#p0-input').press('Enter');
  await page.waitForTimeout(100);
  assert(hostedChatCalls===0,'blocked release must not start a hosted chat call from keyboard submit');
  await page.locator('#p0-model').click();
  assert(await page.locator('#p0-model-menu').isVisible(),'model menu must open from the real model button');
  assert(await page.locator('#p0-model').getAttribute('aria-expanded')==='true','open model menu must expose expanded state');
  assert(await page.evaluate(()=>document.getElementById('p0-model-menu')?.contains(document.activeElement)),'model dialog must receive focus when opened');
  const modelMenuText=await page.locator('#p0-model-menu').innerText();
  assert(!modelMenuText.includes('Active free routes'),'blocked model menu must not claim active free routes');
  const verifiedWriterText=await page.locator('#p0-model-menu button').filter({hasText:'Verified Writer'}).innerText();
  assert(/Live-bevis/i.test(verifiedWriterText)&&/Port blokkert/i.test(verifiedWriterText),'live-E2E proof must remain visible when only the release port is blocked');
  assert(!/Ikke live/i.test(verifiedWriterText),'a live-E2E route behind a blocked release port must not be mislabeled non-live');
  await page.locator('#p0-model-menu button').filter({hasText:'Verified Writer'}).evaluate(button=>button.click());
  assert(/har live-bevis.+releaseporten er blokkert/i.test(await page.locator('#p0-status').innerText()),'clicking a verified-but-blocked route must preserve its live proof and name the release block');
  const blockedRouteText=await page.locator('#p0-route').innerText();
  assert(/Live-bevis.+releaseport blokkert/i.test(blockedRouteText),'verified-but-blocked route click must preserve its proof in the route line; got '+blockedRouteText);
  assert(hostedChatCalls===0,'clicking a verified-but-blocked route must never start hosted chat');
  await page.keyboard.press('Escape');
  assert(await page.locator('#p0-model-menu').isHidden(),'Escape must close the model menu');
  assert(await page.locator('#p0-model').getAttribute('aria-expanded')==='false','Escape must reset model menu expanded state');
  assert(await page.evaluate(()=>document.activeElement?.id)==='p0-model','Escape must return focus to the model button');
  assert(await page.locator('#p0-add').getAttribute('aria-controls')==='p0-add-menu','tools trigger must own its generic popover');
  await page.locator('#p0-add').click();
  assert(await page.locator('#p0-add-menu').getAttribute('role')===null,'tools popover must not claim unsupported ARIA menu semantics');
  await page.locator('#p0-add-menu [data-p0-action="privacy-menu"]').click();
  assert(await page.locator('#p0-add').getAttribute('aria-expanded')==='false','tools trigger must collapse when privacy takes ownership');
  assert(await page.locator('#p0-add-menu').isHidden(),'tools popover must hide when privacy opens');
  assert(await page.locator('#p0-privacy').getAttribute('aria-expanded')==='true','privacy trigger must own the visible privacy popover');
  assert(await page.locator('#p0-privacy-menu').isVisible(),'privacy popover must be visible under its matching controller');
  assert(await page.evaluate(()=>document.getElementById('p0-privacy-menu')?.contains(document.activeElement)),'privacy popover must receive focus when opened from tools');
  await page.keyboard.press('Escape');
  assert(await page.evaluate(()=>document.activeElement?.id)==='p0-add','Escape must return focus to the tools trigger');
  assert(await page.locator('#p0-privacy').getAttribute('aria-controls')==='p0-privacy-menu','privacy trigger must own its generic popover');
  assert(await page.locator('#p0-privacy-menu').getAttribute('role')===null,'privacy popover must not claim unsupported ARIA menu semantics');
  assert(!(await page.locator('body').innerText()).includes('Leid compute og intelligensmarkedsplass'),'planned catalog copy must stay off the clean chat surface');
  await noHorizontalOverflow(page,'mobile chat navigation');
  await page.close();
}

async function checkCheckingFirstPaint(browser){
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await routeApi(page,{delayMs:500});
  await page.goto(baseUrl+'/mmir.html',{waitUntil:'domcontentloaded'});
  const checkingRouteText=await page.locator('#p0-route').innerText();
  assert(/sjekker offentlig svarbane/i.test(checkingRouteText),'synchronous first paint must disclose that public readiness is still being checked; got '+checkingRouteText);
  assert(!/\bready\b/i.test(checkingRouteText),'synchronous first paint must never inherit the legacy ready label; got '+checkingRouteText);
  await page.waitForSelector('#p0-release-warning[data-state="blocked"]');
  await page.close();
}

async function checkModels(browser){
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await routeApi(page);
  await page.goto(baseUrl+'/modeller/index.html',{waitUntil:'networkidle'});
  await assertProofSafeBrand(page,'.release-brand-copy small','model page');
  assert(await page.locator('#metric-tryable').textContent()==='0','a blocked release must show zero models as free to try now');
  assert(await page.locator('#metric-configured').textContent()==='2','blocked E2E and configured routes must remain configured but unavailable');
  assert(await page.locator('#models-grid .catalog-card').count()===4,'model page must render all fixture inventory rows');
  assert(await page.locator('#models-grid .state-orchestrator').count()===1,'Supergeni must render as an orchestrator, not a model');
  assert(await page.locator('#models-grid .state-free_now').count()===0,'blocked release must never render a free-now badge');
  assert(await page.locator('#models-grid .state-configured_unavailable').count()===2,'blocked verified and configured fixtures need unavailable badges');
  assert(await page.locator('#models-grid .state-degraded').count()===1,'degraded fixture needs one degraded badge');
  assert(await page.locator('#models-grid .card-action').count()===0,'model cards must not expose a misleading generic deep link');
  assert((await page.locator('#models-grid').innerText()).includes('fixture/configured'),'model cards must expose exact route identity');
  assert(!(await page.locator('#models-grid').innerText()).includes('Gratis offentlig MMIR-rute · ingen egen API-nøkkel'),'blocked routes must not expose free-now access copy');
  await page.locator('#model-search').fill('Configured Writer');
  assert(await page.locator('#models-grid .catalog-card:visible').count()===1,'model search must visually hide nonmatching cards');
  await noHorizontalOverflow(page,'mobile model catalog');
  await page.close();
}

async function checkReadyModels(browser){
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await routeApi(page,{releaseReady:true});
  await page.goto(baseUrl+'/modeller/index.html',{waitUntil:'networkidle'});
  assert(await page.locator('#metric-tryable').textContent()==='1','a complete release gate plus model E2E proof must expose one free-now route');
  assert(await page.locator('#metric-configured').textContent()==='1','a configured route without E2E proof must remain unavailable');
  assert(await page.locator('#models-grid .state-free_now').count()===1,'ready verified fixture needs the exact free-now badge');
  assert((await page.locator('#models-primary-cta').innerText()).includes('Prøv en gratis modell nå'),'ready model page CTA must promise only the proven free-now action');
  assert((await page.locator('#models-grid').innerText()).includes('Gratis offentlig MMIR-rute · ingen egen API-nøkkel'),'only the ready E2E route may expose free-now no-key access copy');
  await page.close();
}

async function checkSharedTaxonomy(browser){
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await routeApi(page);
  await page.goto(baseUrl+'/modeller/index.html',{waitUntil:'networkidle'});
  const states=await page.evaluate(()=>{
    const taxonomy=window.MmirReleaseRouteTaxonomy;
    const local={id:'local-model',route:'local',route_type:'local',executable:true,selectable:true};
    const localReadiness={paired:true,runtimeChatReady:true,chatReady:true,modelIds:['local-model']};
    const hosted={id:'hosted-model',route_type:'external_untrusted_free',cost_class:'free',executable:true,selectable:true,live_e2e_verified:true};
    const status=(authenticated,firstChat)=>({
      live_verified_intelligence_route_count:1,
      operator_readiness:{
        readiness_state:'ready',
        default_writer_readiness:{classification:'ready',authenticated_release_ready:authenticated},
        journeys:{first_chat_ready:firstChat}
      }
    });
    return {
      paired:taxonomy.classifyModel(local,{localReadiness}).key,
      unpaired:taxonomy.classifyModel(local,{localReadiness:{}}).key,
      byok:taxonomy.classifyModel({id:'key-model',route_type:'byok',requires_api_key:true,executable:true,selectable:true}).key,
      planned:taxonomy.classifyModel({id:'future-model',candidate:true,status:'planned',executable:false,selectable:false}).key,
      degraded:taxonomy.classifyModel({id:'down-model',status:'temporarily_degraded',executable:false,selectable:false}).key,
      fullGate:taxonomy.classifyModel(hosted,{surface:'chat',status:status(true,true)}).key,
      noAuth:taxonomy.classifyModel(hosted,{surface:'chat',status:status(false,true)}).key,
      noFirstChat:taxonomy.classifyModel(hosted,{surface:'chat',status:status(true,false)}).key,
      noModelProof:taxonomy.classifyModel({...hosted,live_e2e_verified:false},{surface:'chat',status:status(true,true)}).key
    };
  });
  assert(states.paired==='local_ready','shared taxonomy must identify a genuinely paired local node');
  assert(states.unpaired==='local_setup','shared taxonomy must keep an unpaired local model in setup');
  assert(states.byok==='byok_unavailable','shared taxonomy must keep BYOK unavailable in release 0.2');
  assert(states.planned==='planned','shared taxonomy must distinguish planned routes');
  assert(states.degraded==='degraded','shared taxonomy must distinguish degraded routes');
  assert(states.fullGate==='free_now','free-now needs the complete positive gate');
  assert(states.noAuth==='configured_unavailable','missing authenticated release must fail closed');
  assert(states.noFirstChat==='configured_unavailable','missing first-chat readiness must fail closed');
  assert(states.noModelProof==='configured_unavailable','missing exact model E2E proof must fail closed');
  await page.close();
}

async function checkDegradedSupergeni(browser){
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await routeApi(page,{degradedSupergeni:true});
  await page.goto(baseUrl+'/modeller/index.html',{waitUntil:'networkidle'});
  const supergeni=page.locator('#models-grid .catalog-card').filter({hasText:'Supergeni'}).first();
  assert((await supergeni.innerText()).includes('Midlertidig degradert'),'a degraded Supergeni must expose operational degradation');
  assert((await supergeni.innerText()).includes('orkestrator'),'degraded Supergeni must still disclose its type');
  await page.close();
}

async function checkCapabilities(browser){
  const page=await browser.newPage({viewport:{width:768,height:1024}});
  await routeApi(page);
  await page.goto(baseUrl+'/kapabiliteter/index.html',{waitUntil:'networkidle'});
  await assertProofSafeBrand(page,'.release-brand-copy small','capability page');
  const cards=page.locator('#capability-grid .catalog-card');
  assert(await cards.count()===48,'capability page must render all canonical public rows');
  assert((await page.locator('#capability-revision').innerText()).includes('a8b63891b29c'),'capability page must expose the canonical semantic revision');
  const roadmap=page.locator('#roadmap-grid .catalog-card');
  assert(await roadmap.count()===4,'roadmap must remain a separate noncanonical section');
  const byok=roadmap.filter({hasText:'Egen API-nøkkel'});
  assert((await byok.innerText()).includes('Utilgjengelig'),'BYOK must stay unavailable');
  assert(await cards.locator('.state-verified').count()===0,'structural availability must never become live verification');
  assert((await page.locator('#capability-truth').innerText()).includes('Ingen kort oppgraderes til live-verifisert'),'status overlay must not upgrade advertised routes');
  await page.locator('#capability-search').fill('Samtalekontekst');
  assert(await page.locator('#capability-grid .catalog-card:visible').count()===1,'capability search must visually hide nonmatching cards');
  await noHorizontalOverflow(page,'tablet capability catalog');
  await page.close();
}

async function checkReadyHostedGate(browser){
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await routeApi(page,{releaseReady:true});
  await page.goto(baseUrl+'/mmir.html',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.getElementById('p0-release-warning')?.hidden===true);
  assert(!(await page.locator('#p0-send').isDisabled()),'hosted send must enable only after the complete release-readiness contract is green');
  const readyRouteText=await page.locator('#p0-route').innerText();
  assert(!/blokkert|sjekker offentlig svarbane/i.test(readyRouteText),'green first chat must clear the fail-closed route line; got '+readyRouteText);
  assert(await page.locator('#p0-route').getAttribute('data-state')!=='error','green first chat must clear route error state');
  await page.close();
}

async function checkInventoryMismatchFailsClosed(browser){
  for(const fixture of [
    {name:'failed model inventory',options:{releaseReady:true,failModels:true}},
    {name:'zero live-verified models',options:{releaseReady:true,zeroLive:true}}
  ]){
    const page=await browser.newPage({viewport:{width:390,height:844}});
    await routeApi(page,fixture.options);
    await page.goto(baseUrl+'/mmir.html',{waitUntil:'domcontentloaded'});
    await page.waitForSelector('#p0-release-warning[data-state="blocked"]');
    assert(await page.locator('#p0-release-warning').isVisible(),fixture.name+' must keep the prominent warning visible');
    assert(await page.locator('#p0-send').isDisabled(),fixture.name+' must keep hosted send disabled');
    await page.close();
  }
}

async function checkReadyToBlockedTransition(browser){
  const page=await browser.newPage({viewport:{width:390,height:844}});
  let hostedChatCalls=0;
  await page.route('https://api.mmir.ai/v1/chat/completions',route=>{
    hostedChatCalls+=1;
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({choices:[{message:{content:'must not run'}}]})});
  });
  await routeApi(page,{releaseReady:true});
  await page.goto(baseUrl+'/mmir.html',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.getElementById('p0-release-warning')?.hidden===true);
  assert(!(await page.locator('#p0-send').isDisabled()),'fresh green proof must enable hosted send before degradation');
  await routeApi(page,{releaseReady:false,replace:true});
  await page.locator('#p0-input').fill('Kontroller porten på nytt før du svarer');
  await page.locator('#p0-send').click();
  await page.waitForSelector('#p0-release-warning[data-state="blocked"]');
  assert(hostedChatCalls===0,'green-to-blocked transition must stop before the hosted provider call');
  assert(await page.locator('#p0-send').isDisabled(),'degraded preflight must disable subsequent sends');
  await page.close();
}

async function checkOutOfOrderPreflightFailsClosed(browser){
  const page=await browser.newPage({viewport:{width:390,height:844}});
  let statusCalls=0;
  let modelCalls=0;
  let hostedChatCalls=0;
  const greenStatus={
    ok:true,
    live_verified_intelligence_route_count:1,
    operator_readiness:{
      readiness_state:'ready',
      default_writer_readiness:{classification:'ready',authenticated_release_ready:true},
      journeys:{first_chat_ready:true,compare_ready:true,swarm_preview_ready:true}
    }
  };
  const blockedStatus={
    ok:true,
    live_verified_intelligence_route_count:0,
    operator_readiness:{
      readiness_state:'blocked',
      default_writer_readiness:{classification:'blocked',authenticated_release_ready:false},
      journeys:{first_chat_ready:false,compare_ready:false,swarm_preview_ready:false}
    }
  };
  const models={
    object:'list',
    data:[{id:'verified-writer',display_name:'Verified Writer',provider:'fixture',route_id:'fixture/verified',route_type:'external_untrusted_free',executable:true,selectable:true,live_e2e_verified:true,status:'available'}]
  };
  await page.route('https://api.mmir.ai/status',async route=>{
    const call=++statusCalls;
    if(call===1)await new Promise(resolve=>setTimeout(resolve,450));
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(call===1?greenStatus:blockedStatus)});
  });
  await page.route('https://api.mmir.ai/v1/models',async route=>{
    const call=++modelCalls;
    if(call===1)await new Promise(resolve=>setTimeout(resolve,450));
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(models)});
  });
  await page.route('https://api.mmir.ai/v1/chat/completions',route=>{
    hostedChatCalls+=1;
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({choices:[{message:{content:'must not run'}}]})});
  });
  await page.goto(baseUrl+'/mmir.html',{waitUntil:'domcontentloaded'});
  await page.waitForSelector('#mmir-p0-app');
  await page.locator('#p0-input').fill('Nyere blokkert preflight skal vinne');
  await page.locator('#p0-composer').evaluate(form=>form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
  await page.waitForFunction(()=>document.getElementById('p0-release-warning')?.dataset.state==='blocked');
  await page.waitForTimeout(550);
  assert(statusCalls>=2&&modelCalls>=2,'race fixture must exercise overlapping readiness refreshes');
  assert(await page.locator('#p0-release-warning').isVisible(),'older delayed green proof must not overwrite the newer blocked state');
  assert(await page.locator('#p0-send').isDisabled(),'newer blocked preflight must remain authoritative after the old response settles');
  assert(hostedChatCalls===0,'out-of-order readiness responses must stop before hosted chat');
  await page.close();
}

async function checkSupersededActionPreflightFailsClosed(browser){
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.addInitScript(()=>{
    const nativeSetInterval=window.setInterval.bind(window);
    const nativeSetTimeout=window.setTimeout.bind(window);
    window.setInterval=(handler,delay,...args)=>{
      if(Number(delay)===30000)return nativeSetTimeout(handler,120,...args);
      return nativeSetInterval(handler,delay,...args);
    };
  });
  let statusCalls=0;
  let modelCalls=0;
  let hostedChatCalls=0;
  const greenStatus={
    ok:true,
    live_verified_intelligence_route_count:1,
    operator_readiness:{
      readiness_state:'ready',
      default_writer_readiness:{classification:'ready',authenticated_release_ready:true},
      journeys:{first_chat_ready:true,compare_ready:true,swarm_preview_ready:true}
    }
  };
  const blockedStatus={
    ok:true,
    live_verified_intelligence_route_count:0,
    operator_readiness:{
      readiness_state:'blocked',
      default_writer_readiness:{classification:'blocked',authenticated_release_ready:false},
      journeys:{first_chat_ready:false,compare_ready:false,swarm_preview_ready:false}
    }
  };
  const models={
    object:'list',
    data:[{id:'verified-writer',display_name:'Verified Writer',provider:'fixture',route_id:'fixture/verified',route_type:'external_untrusted_free',executable:true,selectable:true,live_e2e_verified:true,status:'available'}]
  };
  await page.route('https://api.mmir.ai/status',async route=>{
    const call=++statusCalls;
    if(call===2)await new Promise(resolve=>setTimeout(resolve,220));
    if(call===3)await new Promise(resolve=>setTimeout(resolve,500));
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(call===3?blockedStatus:greenStatus)});
  });
  await page.route('https://api.mmir.ai/v1/models',async route=>{
    const call=++modelCalls;
    if(call===2)await new Promise(resolve=>setTimeout(resolve,220));
    if(call===3)await new Promise(resolve=>setTimeout(resolve,500));
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(models)});
  });
  await page.route('https://api.mmir.ai/v1/chat/completions',route=>{
    hostedChatCalls+=1;
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({choices:[{message:{content:'must not run'}}]})});
  });
  await page.goto(baseUrl+'/mmir.html',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.getElementById('p0-release-warning')?.hidden===true);
  await page.locator('#p0-input').fill('En superseded preflight skal aldri bruke gammel grønn status');
  await page.locator('#p0-composer').evaluate(form=>form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
  await page.waitForTimeout(300);
  assert(statusCalls>=3&&modelCalls>=3,'reverse race fixture must supersede the action preflight with a newer refresh');
  assert(hostedChatCalls===0,'a superseded action preflight must fail closed while newer readiness is unresolved');
  await page.waitForFunction(()=>document.getElementById('p0-release-warning')?.dataset.state==='blocked');
  assert(await page.locator('#p0-send').isDisabled(),'newer blocked readiness must remain authoritative after the superseded action returns');
  assert(hostedChatCalls===0,'newer blocked readiness must stop hosted chat throughout the reverse-order race');
  await page.close();
}

async function checkFailClosed(browser){
  const page=await browser.newPage({viewport:{width:1280,height:800}});
  await routeApi(page,{fail:true});
  await page.goto(baseUrl+'/tillit/index.html',{waitUntil:'networkidle'});
  await assertProofSafeBrand(page,'.release-brand-copy small','trust page');
  assert(await page.locator('#trust-runtime').getAttribute('data-state')==='error','failed runtime fetch must render an error state');
  assert((await page.locator('#trust-runtime').innerText()).includes('kunne ikke verifiseres'),'failed runtime fetch must say unknown/error, never live');
  await page.close();
}

async function checkCapabilitySchemaFailClosed(browser){
  const page=await browser.newPage({viewport:{width:768,height:1024}});
  await routeApi(page);
  await page.route('**/capability-ui.json',route=>route.fulfill({
    status:200,
    contentType:'application/json',
    body:JSON.stringify({
      object:'mmir.capability_ui_overlay',
      schema_version:1,
      projection_semantic_revision:'sha256:a8b63891b29cc0a3ed0ca9e50810c85640bacae80631d1d950574624d324a1ff',
      copy:{'cap-999':{description:'Unknown injection',runtime_capabilities:['chat.completions']}},
      roadmap:[]
    })
  }));
  await page.goto(baseUrl+'/kapabiliteter/index.html',{waitUntil:'networkidle'});
  assert(await page.locator('#capability-truth').getAttribute('data-state')==='error','unknown overlay capability id must fail closed');
  assert(await page.locator('#capability-grid .catalog-card').count()===0,'schema failure must hide all capability cards');
  await page.close();
}

async function checkReleaseReadinessGate(browser){
  const page=await browser.newPage({viewport:{width:1280,height:800}});
  await routeApi(page);
  await page.goto(baseUrl+'/tillit/index.html',{waitUntil:'networkidle'});
  assert(await page.locator('#trust-runtime').getAttribute('data-state')==='warning','one verified model must not green a blocked operator release');
  assert((await page.locator('#trust-runtime').innerText()).includes('ikke produksjonsgrønn'),'blocked release must be named explicitly');
  await page.close();
}

port=await resolvePort();
baseUrl=`http://${host}:${port}`;
const server=startServer();
let browser;
try{
  await waitForServer();
  browser=await chromium.launch({headless:true});
  await checkCheckingFirstPaint(browser);
  await checkChatNav(browser);
  await checkModels(browser);
  await checkReadyModels(browser);
  await checkSharedTaxonomy(browser);
  await checkDegradedSupergeni(browser);
  await checkCapabilities(browser);
  await checkCapabilitySchemaFailClosed(browser);
  await checkReleaseReadinessGate(browser);
  await checkReadyHostedGate(browser);
  await checkInventoryMismatchFailsClosed(browser);
  await checkReadyToBlockedTransition(browser);
  await checkOutOfOrderPreflightFailsClosed(browser);
  await checkSupersededActionPreflightFailsClosed(browser);
  await checkFailClosed(browser);
}finally{
  if(browser)await browser.close();
  server.kill('SIGTERM');
}

if(failures.length){
  console.error('MMIR 0.2 render checks failed:');
  failures.forEach(failure=>console.error('- '+failure));
  process.exit(1);
}
console.log('MMIR 0.2 render checks passed.');
