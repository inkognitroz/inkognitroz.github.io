import { spawn } from 'node:child_process';
import { createServer as createNetServer } from 'node:net';
import { chromium } from '@playwright/test';

const host='127.0.0.1';
const preferredPort=Number(process.env.MMIR_RELEASE_02_PORT||8820);
let port=preferredPort;
let baseUrl='';
const failures=[];
const assert=(condition,message)=>{if(!condition)failures.push(message);};

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

async function routeApi(page,{fail=false,degradedSupergeni=false}={}){
  await page.route('https://api.mmir.ai/status',route=>route.fulfill({
    status:fail?503:200,
    contentType:'application/json',
    body:fail?JSON.stringify({error:'unavailable'}):JSON.stringify({
      ok:true,
      capabilities:['chat.completions','web.search.execute.safe_live_data_slice'],
      operator_readiness:{readiness_state:'blocked',default_writer_readiness:{authenticated_release_ready:false}}
    })
  }));
  await page.route('https://api.mmir.ai/v1/models',route=>route.fulfill({
    status:fail?503:200,
    contentType:'application/json',
    body:fail?JSON.stringify({error:'unavailable'}):JSON.stringify({
      object:'list',
      total_visible_model_count:4,
      live_selectable_model_count:2,
      live_verified_intelligence_route_count:1,
      degraded_model_count:1,
      data:[
        {id:'supergeni',display_name:'Supergeni',provider:'mmir',status:degradedSupergeni?'temporarily_degraded':'available',route_id:'browser-guide/free',node_id:'browser-guide',route_state:degradedSupergeni?'orchestrator_degraded':'available',route_type:'managed_provider',executable:!degradedSupergeni,selectable:false,live_e2e_verified:false,cost_class:'free',capabilities:['chat.completions'],limitations:['Fixture orchestrator.']},
        {id:'verified-writer',display_name:'Verified Writer',provider:'fixture',status:'available',route_id:'fixture/verified',node_id:'fixture-a',route_state:'available',route_type:'external_untrusted_free',executable:true,selectable:true,live_e2e_verified:true,cost_class:'free-quota',capabilities:['chat.completions'],limitations:['Fixture verified route.']},
        {id:'configured-writer',display_name:'Configured Writer',provider:'fixture',status:'available',route_id:'fixture/configured',node_id:'fixture-b',route_state:'available',route_type:'external_untrusted_free',executable:true,selectable:true,live_e2e_verified:false,cost_class:'free-quota',capabilities:['chat.completions'],limitations:['Fixture without fresh E2E proof.']},
        {id:'degraded-writer',display_name:'Degraded Writer',provider:'fixture',status:'temporarily_degraded',route_id:'fixture/degraded',node_id:'fixture-c',route_state:'provider_temporarily_degraded',route_type:'external_untrusted_free',executable:false,selectable:false,live_e2e_verified:false,cost_class:'free-quota',capabilities:['chat.completions'],limitations:['Fixture degraded route.']}
      ]
    })
  }));
}

async function noHorizontalOverflow(page,label){
  const sizes=await page.evaluate(()=>({viewport:window.innerWidth,document:document.documentElement.scrollWidth,body:document.body.scrollWidth}));
  assert(sizes.document<=sizes.viewport+1,label+' must not overflow the viewport');
  assert(sizes.body<=sizes.viewport+1,label+' body must not overflow the viewport');
}

async function checkChatNav(browser){
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await routeApi(page);
  await page.goto(baseUrl+'/mmir.html',{waitUntil:'domcontentloaded'});
  await page.waitForSelector('#mmir-p0-app .p0-release-nav');
  const labels=await page.locator('.p0-release-nav a').allTextContents();
  assert(labels.join('|')==='Prøv|Modeller|Kapabiliteter|Tillit','visible chat shell must expose exactly the compact 0.2 tabs');
  assert(await page.locator('.p0-composer').isVisible(),'chat composer must remain visible after nav injection');
  assert(!(await page.locator('body').innerText()).includes('Leid compute og intelligensmarkedsplass'),'planned catalog copy must stay off the clean chat surface');
  await noHorizontalOverflow(page,'mobile chat navigation');
  await page.close();
}

async function checkModels(browser){
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await routeApi(page);
  await page.goto(baseUrl+'/modeller/index.html',{waitUntil:'networkidle'});
  assert(await page.locator('#metric-verified').textContent()==='1','model page must count only explicit E2E proof as verified');
  assert(await page.locator('#metric-configured').textContent()==='2','model page must use the authoritative selectable total');
  assert(await page.locator('#models-grid .catalog-card').count()===4,'model page must render all fixture inventory rows');
  assert(await page.locator('#models-grid .state-orchestrator').count()===1,'Supergeni must render as an orchestrator, not a model');
  assert(await page.locator('#models-grid .state-verified').count()===1,'verified fixture needs one verified badge');
  assert(await page.locator('#models-grid .state-configured').count()===1,'configured fixture needs one non-verified badge');
  assert(await page.locator('#models-grid .state-degraded').count()===1,'degraded fixture needs one degraded badge');
  assert(await page.locator('#models-grid .card-action').count()===0,'model cards must not expose a misleading generic deep link');
  assert((await page.locator('#models-grid').innerText()).includes('fixture/configured'),'model cards must expose exact route identity');
  assert((await page.locator('#models-grid').innerText()).includes('gratis kvote · ingen egen API-nøkkel'),'free-quota external routes must expose no-key tester access');
  await noHorizontalOverflow(page,'mobile model catalog');
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
  const cards=page.locator('#capability-grid .catalog-card');
  assert(await cards.count()===48,'capability page must render all canonical public rows');
  assert((await page.locator('#capability-revision').innerText()).includes('a8b63891b29c'),'capability page must expose the canonical semantic revision');
  const roadmap=page.locator('#roadmap-grid .catalog-card');
  assert(await roadmap.count()===4,'roadmap must remain a separate noncanonical section');
  const byok=roadmap.filter({hasText:'Egen API-nøkkel'});
  assert((await byok.innerText()).includes('Utilgjengelig'),'BYOK must stay unavailable');
  assert(await cards.locator('.state-verified').count()===0,'structural availability must never become live verification');
  assert((await page.locator('#capability-truth').innerText()).includes('Ingen kort oppgraderes til live-verifisert'),'status overlay must not upgrade advertised routes');
  await noHorizontalOverflow(page,'tablet capability catalog');
  await page.close();
}

async function checkFailClosed(browser){
  const page=await browser.newPage({viewport:{width:1280,height:800}});
  await routeApi(page,{fail:true});
  await page.goto(baseUrl+'/tillit/index.html',{waitUntil:'networkidle'});
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
  await checkChatNav(browser);
  await checkModels(browser);
  await checkDegradedSupergeni(browser);
  await checkCapabilities(browser);
  await checkCapabilitySchemaFailClosed(browser);
  await checkReleaseReadinessGate(browser);
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
