import { spawn } from 'node:child_process';
import { createServer as createNetServer } from 'node:net';
import { chromium } from '@playwright/test';

const host='127.0.0.1';
const preferredPort=Number(process.env.MMIR_ORDINARY_CHAT_PORT||8850);
let port=preferredPort;
let baseUrl='';

function assert(condition,message){
  if(!condition)throw new Error(message);
}

function canListen(candidate){
  return new Promise((resolve,reject)=>{
    const server=createNetServer();
    server.once('error',error=>error?.code==='EADDRINUSE'?resolve(false):reject(error));
    server.listen(candidate,host,()=>server.close(()=>resolve(true)));
  });
}

async function resolvePort(){
  for(let offset=0;offset<30;offset+=1){
    const candidate=preferredPort+offset;
    if(await canListen(candidate))return candidate;
  }
  throw new Error('No free ordinary-chat test port');
}

function startServer(){
  return spawn(process.execPath,['scripts/serve-public.mjs'],{
    cwd:process.cwd(),
    env:{...process.env,HOST:host,PORT:String(port)},
    stdio:['ignore','pipe','pipe']
  });
}

async function waitForServer(){
  const deadline=Date.now()+10000;
  while(Date.now()<deadline){
    try{
      const response=await fetch(baseUrl+'/mmir.html');
      if(response.ok)return;
    }catch(error){}
    await new Promise(resolve=>setTimeout(resolve,80));
  }
  throw new Error('Ordinary-chat test server did not become ready');
}

const readyStatus={
  ok:true,
  no_paid_routes_started:true,
  live_verified_intelligence_route_count:2,
  operator_readiness:{
    readiness_state:'swarm_preview_ready',
    default_writer_readiness:{
      classification:'release_ready',
      authenticated_release_ready:true,
      blocker_codes:[]
    },
    journeys:{first_chat_ready:true,compare_ready:true,swarm_preview_ready:true}
  }
};

const blockedStatus={
  ok:true,
  no_paid_routes_started:true,
  live_verified_intelligence_route_count:0,
  operator_readiness:{
    readiness_state:'blocked',
    default_writer_readiness:{
      classification:'blocked',
      authenticated_release_ready:false,
      blocker_codes:['authenticated_evaluation_failed']
    },
    journeys:{first_chat_ready:false,compare_ready:false,swarm_preview_ready:false}
  }
};

const canonicalInventory={
  object:'list',
  inventory_view:'compact',
  default_model:'supergeni',
  no_paid_routes_started:true,
  live_verified_intelligence_route_count:0,
  data:[{
    id:'supergeni',
    model:'supergeni',
    display_name:'Supergeni',
    provider:'mmir',
    route_id:'supergeni/connected',
    route_state:'connected_meta_route_available',
    route_type:'connected_meta_route',
    executable:false,
    selectable:false,
    candidate:false,
    live_e2e_verified:false,
    live_e2e_proof:null,
    cost_class:null,
    cost_state:null,
    no_paid_routes_started:true
  }]
};

async function checkBasicChatWithoutProof(browser,fixture){
  const page=await browser.newPage({viewport:{width:390,height:844}});
  let statusCalls=0;
  let modelCalls=0;
  let compareCalls=0;
  const chatRequests=[];

  await page.route('https://api.mmir.ai/status',route=>{
    statusCalls+=1;
    return fixture.failStatus
      ? route.fulfill({status:503,contentType:'application/json',body:'{"error":"status unavailable"}'})
      : route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(fixture.readyStatus?readyStatus:blockedStatus)});
  });
  await page.route(/https:\/\/api\.mmir\.ai\/v1\/models(?:\?.*)?$/,route=>{
    modelCalls+=1;
    return fixture.failModels
      ? route.fulfill({status:503,contentType:'application/json',body:'{"error":"inventory unavailable"}'})
      : route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(canonicalInventory)});
  });
  await page.route(/https:\/\/api\.mmir\.ai\/v1\/(?:chat\/compare|swarm\/preview)/,route=>{
    compareCalls+=1;
    return route.fulfill({status:503,contentType:'application/json',body:'{}'});
  });
  await page.route('https://api.mmir.ai/v1/chat/completions',route=>{
    chatRequests.push(route.request().postDataJSON());
    return route.fulfill({
      status:200,
      contentType:'application/json',
      body:JSON.stringify({
        choices:[{
          message:{role:'assistant',content:chatRequests.length===1?'Grunnchat svarte.':'Oppfølgingen beholdt samtalen.'},
          finish_reason:'stop'
        }]
      })
    });
  });

  await page.goto(baseUrl+'/mmir.html',{waitUntil:'domcontentloaded'});
  await page.waitForSelector('#p0-release-warning[data-state="blocked"]');
  await page.waitForFunction(()=>document.getElementById('p0-send')?.disabled===false);
  const warning=(await page.locator('#p0-release-warning').innerText()).replace(/\s+/g,' ').trim();
  assert(/Grunnchat kan prøves/i.test(warning),fixture.name+' must distinguish basic attemptability from advanced proof');
  assert(/ikke bekreftet/i.test(warning)&&/sensitiv info/i.test(warning),fixture.name+' must keep unverified-status and privacy truth visible');
  assert((await page.locator('#p0-model .p0-model-name').innerText()).trim()==='Supergeni',fixture.name+' must retain only the canonical default model');
  const routeText=await page.locator('#p0-route').innerText();
  assert(/Grunnchat kan prøves/i.test(routeText)&&/live-status ikke bekreftet/i.test(routeText),fixture.name+' must show basic capability without a live claim');
  assert(await page.locator('#p0-release-warning').isVisible(),fixture.name+' must not hide the unavailable advanced-proof warning');
  if(await page.locator('#p0-superboost').count()){
    assert(await page.locator('#p0-superboost').isDisabled(),fixture.name+' must keep compare disabled');
  }
  if(await page.locator('#p0-council').count()){
    assert(await page.locator('#p0-council').isDisabled(),fixture.name+' must keep swarm disabled');
  }

  const preflightCounts={statusCalls,modelCalls};
  await page.locator('#p0-input').fill('Kan grunnchat svare uten statusbevis?');
  await page.locator('#p0-send').click();
  await page.waitForFunction(()=>Array.from(document.querySelectorAll('.p0-message-assistant')).some(message=>message.textContent.includes('Grunnchat svarte.')));
  await page.waitForSelector('#p0-send[data-state="send"]');
  assert(chatRequests.length===1,fixture.name+' must make exactly one public chat attempt');
  assert(statusCalls===preflightCounts.statusCalls&&modelCalls===preflightCounts.modelCalls,fixture.name+' must not await a status or inventory preflight on each ordinary prompt');
  const first=chatRequests[0];
  assert(first?.model==='mmir-supergenius',fixture.name+' must force the known canonical model id');
  assert(first?.stream===false,fixture.name+' must retain the canonical nonstreaming chat contract');
  assert(first?.policy?.paid_routes_allowed===false,fixture.name+' must explicitly forbid paid routes');
  assert(!Object.hasOwn(first?.policy||{},'require_no_paid_receipt'),fixture.name+' must not require a signed quality receipt for ordinary chat');

  if(fixture.followUp){
    await page.locator('#p0-input').fill('Fortsett samtalen.');
    await page.locator('#p0-send').click();
    await page.waitForFunction(()=>Array.from(document.querySelectorAll('.p0-message-assistant')).some(message=>message.textContent.includes('Oppfølgingen beholdt samtalen.')));
    await page.waitForSelector('#p0-send[data-state="send"]');
    assert(chatRequests.length===2,fixture.name+' follow-up must make one additional public chat attempt');
    assert(statusCalls===preflightCounts.statusCalls&&modelCalls===preflightCounts.modelCalls,fixture.name+' follow-up must not add proof preflights');
    assert(chatRequests[1]?.messages.some(message=>message.role==='user'&&message.content.includes('Kan grunnchat svare')),fixture.name+' follow-up must retain the prior user turn');
    assert(chatRequests[1]?.messages.some(message=>message.role==='assistant'&&message.content.includes('Grunnchat svarte.')),fixture.name+' follow-up must retain the prior assistant turn');
  }

  const beforeAdvanced=chatRequests.length;
  await page.locator('#p0-input').fill('Use both models to answer.');
  await page.locator('#p0-send').click();
  await page.waitForTimeout(120);
  assert(chatRequests.length===beforeAdvanced,fixture.name+' must not downgrade explicit compare into ordinary basic chat');
  assert(compareCalls===0,fixture.name+' must stop explicit compare before an advanced endpoint call');
  await page.close();
}

port=await resolvePort();
baseUrl=`http://${host}:${port}`;
const server=startServer();
let browser;
try{
  await waitForServer();
  browser=await chromium.launch({headless:true});
  for(const fixture of [
    {name:'status unavailable',failStatus:true,failModels:false,followUp:true},
    {name:'inventory unavailable',failStatus:false,readyStatus:true,failModels:true},
    {name:'status and inventory unavailable',failStatus:true,failModels:true}
  ]){
    await checkBasicChatWithoutProof(browser,fixture);
  }
}finally{
  if(browser)await browser.close();
  server.kill('SIGTERM');
}

console.log('P0 ordinary chat availability render checks passed.');
