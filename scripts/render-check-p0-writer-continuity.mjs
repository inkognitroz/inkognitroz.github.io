import { spawn } from 'node:child_process';
import { chromium } from '@playwright/test';
import { resolveRenderPort } from './render-port-helper.mjs';

const host='127.0.0.1';
let port=Number(process.env.MMIR_WRITER_CONTINUITY_RENDER_PORT||8814);
let baseUrl=`http://${host}:${port}`;
const failures=[];
const chatRequests=[];
const model='mistralai/mistral-small-4-119b-2603';
let answerCount=0;
let latestLlmReceiptId='';

function assert(condition,message){if(!condition)failures.push(message);}

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

async function waitForServer(url){
  const deadline=Date.now()+10000;
  while(Date.now()<deadline){
    try{if((await fetch(url)).ok)return;}catch{}
    await new Promise(resolve=>setTimeout(resolve,150));
  }
  throw new Error(`Server did not become ready at ${url}`);
}

function writerReceipt(prefixCount,sequence){
  const issuedAt=new Date(Date.now()-60_000);
  const expiresAt=new Date(issuedAt.getTime()+60*60*1000);
  const suffix=String(sequence).padStart(12,'0');
  return {
    object:'mmir.writer_continuity_receipt',
    schema_version:'2026-07-18-writer-continuity-v1',
    purpose:'writer-continuity',
    id:`writer-continuity-11111111-1111-4111-8111-${suffix}`,
    issued_at:issuedAt.toISOString(),
    expires_at:expiresAt.toISOString(),
    writer_type:'llm',
    provider:'nvidia',
    model_id:model,
    model_display_name:'Mistral Small 4',
    writer_request_model_id:'mistral-small-latest',
    writer_route_id:`nvidia/${model}`,
    conversation_prefix_version:'2026-07-18-conversation-prefix-v1',
    conversation_prefix_count:prefixCount,
    conversation_prefix_hash:'hmac-sha256:'+'b'.repeat(64),
    no_paid_routes_started:true,
    provider_secrets_in_browser:false,
    signed_receipt_schema_version:'2026-06-06-signed-receipts-v1',
    receipt_hash:'sha256:'+'a'.repeat(64),
    receipt_signature:'hmac-sha256:'+'c'.repeat(64),
    signature_algorithm:'hmac-sha256-canonical-json-v1',
    signature_key_id:'mmir-live-route-receipt-key-v1',
    signature_authority:'mmir-keyed-hmac',
    signature_key_state:'current',
    signature_rotation_policy:{current_key_id:'mmir-live-route-receipt-key-v1'}
  };
}

async function fulfillJson(route,body,status=200){
  await route.fulfill({
    status,
    contentType:'application/json',
    headers:{
      'access-control-allow-origin':'*',
      'access-control-allow-methods':'GET,POST,OPTIONS',
      'access-control-allow-headers':'content-type'
    },
    body:JSON.stringify(body)
  });
}

async function installFixtures(page){
  await page.addInitScript(()=>{
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('mmir-p0-chat-history-schema','20260603-clean-first-chat-v40');
    localStorage.setItem('mmir-p0-chat-history-v1',JSON.stringify([
      {role:'user',content:'LOCAL-MODEL-SENTINEL',routeProvenance:'local-model',hostedLineage:false},
      {role:'assistant',content:'LOCAL-ONLY-ANSWER',routeProvenance:'local-model',hostedLineage:false}
    ]));
  });
  await page.route('https://api.mmir.ai/**',async route=>{
    const request=route.request();
    const url=new URL(request.url());
    if(request.method()==='OPTIONS'){
      await route.fulfill({status:204,headers:{'access-control-allow-origin':'*','access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'content-type'}});
      return;
    }
    if(url.pathname==='/v1/models'){
      await fulfillJson(route,{
        object:'list',
        data:[{
          id:'mmir-supergenius',
          name:'Supergeni',
          display_name:'Supergeni',
          provider:'mmir',
          executable:true,
          selectable:true,
          recommended:true,
          availability:'available',
          route_state:'managed_provider_available',
          route_type:'managed_provider',
          route_class:'free',
          trust_level:'public-free',
          live_e2e_verified:true,
          cost_class:'free'
        }]
      });
      return;
    }
    if(url.pathname==='/status'){
      await fulfillJson(route,{
        live_verified_intelligence_route_count:1,
        operator_readiness:{
          readiness_state:'ready',
          default_writer_readiness:{classification:'ready',authenticated_release_ready:true},
          journeys:{first_chat_ready:true,compare_ready:true,swarm_preview_ready:true}
        }
      });
      return;
    }
    if(url.pathname==='/prompts/presets'){
      await fulfillJson(route,{object:'list',data:[]});
      return;
    }
    if(url.pathname!=='/v1/chat/completions'){
      await fulfillJson(route,{object:'fixture',data:[]});
      return;
    }

    const body=JSON.parse(request.postData()||'{}');
    chatRequests.push(body);
    answerCount+=1;
    const current=String(body.messages?.at(-1)?.content||'');
    if(/17\s*\*\s*23/.test(current)){
      await fulfillJson(route,{
        object:'chat.completion',
        choices:[{message:{role:'assistant',content:'391'},finish_reason:'stop'}],
        mmir:{
          answer_writer:{object:'mmir.answer_writer',type:'capability',model_display_name:'Eksakt matematikk'},
          no_paid_routes_started:true,
          provider_secrets_in_browser:false
        }
      });
      return;
    }
    if(/IDENTITY-UNKNOWN/.test(current)){
      await fulfillJson(route,{
        object:'chat.completion',
        choices:[{message:{role:'assistant',content:'Ukjent-identitet-svar'},finish_reason:'stop'}],
        mmir:{no_paid_routes_started:true,provider_secrets_in_browser:false}
      });
      return;
    }

    if(/IDENTITY-CONFLICT/.test(current)){
      const responseReceipt=writerReceipt((body.messages?.length||0)+1,answerCount);
      await fulfillJson(route,{
        object:'chat.completion',
        choices:[{message:{role:'assistant',content:'Motstridende-identitet-svar'},finish_reason:'stop'}],
        mmir:{
          answer_writer:{object:'mmir.answer_writer',type:'llm',provider:'nvidia',model_id:'other/model',model_display_name:'Other Model'},
          writer_continuity_receipt:responseReceipt,
          no_paid_routes_started:true,
          provider_secrets_in_browser:false
        }
      });
      return;
    }

    if(/OVERSIZE-ANSWER/.test(current)){
      const responseReceipt=writerReceipt((body.messages?.length||0)+1,answerCount);
      latestLlmReceiptId=responseReceipt.id;
      await fulfillJson(route,{
        object:'chat.completion',
        choices:[{message:{role:'assistant',content:'OVERSIZE-BEGIN '+('z'.repeat(97*1024))},finish_reason:'stop'}],
        mmir:{
          answer_writer:{object:'mmir.answer_writer',type:'llm',provider:'nvidia',model_id:model,model_display_name:'Mistral Small 4'},
          writer_continuity_receipt:responseReceipt,
          no_paid_routes_started:true,
          provider_secrets_in_browser:false
        }
      });
      return;
    }

    const responseReceipt=writerReceipt((body.messages?.length||0)+1,answerCount);
    latestLlmReceiptId=responseReceipt.id;
    await fulfillJson(route,{
      object:'chat.completion',
      choices:[{message:{role:'assistant',content:`Hosted svar ${answerCount}`},finish_reason:'stop'}],
      mmir:{
        ...(answerCount===1?{}:{answer_writer:{object:'mmir.answer_writer',type:'llm',provider:'nvidia',model_id:model,model_display_name:'Mistral Small 4'}}),
        writer_continuity_receipt:responseReceipt,
        no_paid_routes_started:true,
        provider_secrets_in_browser:false
      }
    });
  });
}

async function sendAndWait(page,prompt,answerPattern){
  await page.locator('#p0-input').fill(prompt);
  await page.locator('#p0-send').click();
  await page.waitForFunction(
    pattern=>new RegExp(pattern.source,pattern.flags).test(document.getElementById('p0-transcript')?.innerText||''),
    {source:answerPattern.source,flags:answerPattern.flags}
  );
}

port=await resolveRenderPort({
  envName:'MMIR_WRITER_CONTINUITY_RENDER_PORT',
  attemptsEnvName:'MMIR_WRITER_CONTINUITY_RENDER_PORT_ATTEMPTS',
  defaultPort:8814,
  host,
  label:'writer continuity render check'
});
baseUrl=`http://${host}:${port}`;
const server=startServer();

try{
  await waitForServer(`${baseUrl}/mmir.html`);
  const browser=await chromium.launch();
  try{
    const page=await browser.newPage({viewport:{width:1280,height:800}});
    await installFixtures(page);
    await page.goto(`${baseUrl}/mmir.html?writer_continuity_e2e=1#mimir-chat-runtime`,{waitUntil:'networkidle'});
    await page.waitForSelector('#p0-input');

    await sendAndWait(page,'HOSTED-TURN-1',/Hosted svar 1/);
    const firstTranscript=await page.locator('#p0-transcript').innerText();
    assert(/Mistral Small 4/.test(firstTranscript),'Missing top-level model must render the concrete model from the signed writer receipt.');

    const requestsBeforePrivate=chatRequests.length;
    await sendAndWait(page,'/remember PRIVATE-BROWSER-SENTINEL',/Saved locally in this browser/);
    await sendAndWait(page,'/doc Secret note: PRIVATE-DOCUMENT-SENTINEL',/Document note saved locally/);
    assert(chatRequests.length===requestsBeforePrivate,'/remember and /doc must not call api.mmir.ai.');

    await sendAndWait(page,'HOSTED-TURN-2',/Hosted svar 2/);
    await sendAndWait(page,'HOSTED-TURN-3',/Hosted svar 3/);
    const retainedReceiptBeforeTool=latestLlmReceiptId;
    await sendAndWait(page,'Hva er 17 * 23?',/^391$/m);
    const toolRequest=chatRequests.at(-1);
    assert(toolRequest.writer_continuity_receipt?.id===retainedReceiptBeforeTool,'Exact-tool request must carry the retained LLM receipt.');
    await sendAndWait(page,'HOSTED-TURN-4',/Hosted svar 5/);
    const afterToolRequest=chatRequests.at(-1);
    assert(afterToolRequest.writer_continuity_receipt?.id===retainedReceiptBeforeTool,'Exact-tool response must not replace the retained LLM receipt.');
    assert(afterToolRequest.messages?.at(-2)?.content==='391','The next LLM request must retain the exact-tool result in sequence.');
    await sendAndWait(page,'HOSTED-TURN-5',/Hosted svar 6/);
    await sendAndWait(page,'HOSTED-TURN-6',/Hosted svar 7/);
    await sendAndWait(page,'HOSTED-TURN-7',/Hosted svar 8/);

    const longRequest=chatRequests.at(-1);
    const longPayload=JSON.stringify(longRequest);
    assert((longRequest.messages?.length||0)>12,'The actual public adapter must send more than twelve retained messages.');
    assert(longPayload.includes('HOSTED-TURN-1'),'The actual public adapter must retain the earliest hosted turn after twelve messages.');
    assert(!/PRIVATE-BROWSER-SENTINEL|PRIVATE-DOCUMENT-SENTINEL|LOCAL-MODEL-SENTINEL|LOCAL-ONLY-ANSWER/.test(longPayload),'Browser-private and local-model turns must never enter the actual hosted request payload.');
    assert(longRequest.writer_continuity_receipt?.object==='mmir.writer_continuity_receipt','Long public follow-up must echo the signed continuity receipt at top level.');
    assert(longRequest.writer_continuity_receipt?.writer_request_model_id==='mistral-small-latest','The public adapter must accept and echo the gateway writer-request model field.');
    assert(longRequest.messages?.filter(message=>message.role==='system').length===1,'Rebuilt browser memory must not duplicate an unchanged system instruction inside the signed prefix.');

    await sendAndWait(page,'IDENTITY-CONFLICT',/Motstridende-identitet-svar/);
    const conflictTranscript=await page.locator('#p0-transcript').innerText();
    assert(/Ukjent svarforfatter · ikke verifisert/.test(conflictTranscript),'Conflicting answer-writer and receipt identity must render unknown/unverified.');

    await sendAndWait(page,'IDENTITY-UNKNOWN',/Ukjent-identitet-svar/);
    const finalTranscript=await page.locator('#p0-transcript').innerText();
    assert(/Ukjent svarforfatter · ikke verifisert/.test(finalTranscript),'Missing top-level and receipt model identity must render unknown/unverified.');

    await sendAndWait(page,'OVERSIZE-ANSWER',/OVERSIZE-BEGIN/);
    const oversizedTranscript=await page.locator('#p0-transcript').innerText();
    assert(/Writer continuity reset \(96 KiB browser boundary\)/.test(oversizedTranscript),'The real browser must disclose when a response first crosses the 96 KiB continuity boundary.');
    await sendAndWait(page,'AFTER-OVERSIZE-RESET',/Hosted svar 12/);
    const afterOversizeRequest=chatRequests.at(-1);
    assert(!afterOversizeRequest.writer_continuity_receipt,'The first request after an oversized-response reset must not echo the discarded receipt.');
  }finally{
    await browser.close();
  }
}finally{
  server.kill('SIGTERM');
}

if(failures.length){
  console.error('P0 writer continuity render check failed:');
  failures.forEach(failure=>console.error('- '+failure));
  process.exit(1);
}

console.log('P0 writer continuity render check passed.');
