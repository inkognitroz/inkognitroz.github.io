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
const groqModel='groq/openai/gpt-oss-120b';
const mistralRoute='mistral/mistral-small-latest';

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

function writerReceipt(prefixCount,sequence,routeModel=model){
  const issuedAt=new Date(Date.now()-60_000);
  const expiresAt=new Date(issuedAt.getTime()+60*60*1000);
  const suffix=String(sequence).padStart(12,'0');
  const groq=routeModel.startsWith('groq/');
  const mistral=routeModel===mistralRoute;
  return {
    object:'mmir.writer_continuity_receipt',
    schema_version:'2026-07-18-writer-continuity-v1',
    purpose:'writer-continuity',
    id:`writer-continuity-11111111-1111-4111-8111-${suffix}`,
    issued_at:issuedAt.toISOString(),
    expires_at:expiresAt.toISOString(),
    writer_type:'llm',
    provider:groq?'groq':mistral?'mistral':'nvidia',
    model_id:mistral?'mistral-small-latest':routeModel,
    model_display_name:groq?'Groq: openai/gpt-oss-120b':mistral?'Mistral Small':'Mistral Small 4',
    writer_request_model_id:groq?routeModel:'mistral-small-latest',
    writer_route_id:groq||mistral?routeModel:`nvidia/${routeModel}`,
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

async function installFixtures(page,{selectedModelId=''}={}){
  await page.addInitScript((activeModelId)=>{
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('mmir-p0-chat-history-schema','20260603-clean-first-chat-v40');
    localStorage.setItem('mmir-p0-chat-history-v1',JSON.stringify([
      {role:'user',content:'LOCAL-MODEL-SENTINEL',routeProvenance:'local-model',hostedLineage:false},
      {role:'assistant',content:'LOCAL-ONLY-ANSWER',routeProvenance:'local-model',hostedLineage:false}
    ]));
    if(activeModelId)localStorage.setItem('mmir-p0-active-model-id-v1',activeModelId);
  },selectedModelId);
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
          live_e2e_proof:{verified:true,stable_verified:true,no_paid_routes_started:true},
          cost_class:'free'
        },{
          id:'mistral-small-latest',
          name:'mistral-small-latest',
          display_name:'Mistral Small',
          provider:'mistral',
          route_id:mistralRoute,
          executable:true,
          selectable:true,
          availability:'available',
          route_state:'public_untrusted_free_available',
          route_type:'external_untrusted_free',
          route_class:'free',
          candidate:false,
          trust_level:'public-free',
          live_e2e_verified:true,
          live_e2e_proof:{verified:true,stable_verified:true,no_paid_routes_started:true},
          cost_class:'free-quota',
          cost_state:'free_guarded',
          no_paid_routes_started:true
        },{
          id:groqModel,
          name:groqModel,
          display_name:'Groq: openai/gpt-oss-120b',
          provider:'groq',
          route_id:groqModel,
          executable:true,
          selectable:true,
          availability:'available',
          route_state:'managed_provider_available',
          route_type:'managed_provider',
          route_class:'free',
          trust_level:'public-free',
          live_e2e_verified:true,
          live_e2e_proof:{verified:true,stable_verified:true,no_paid_routes_started:true},
          cost_class:'free',
          cost_state:'free',
          cost:{mode:'free-quota',requires_approval:false},
          paid_routes_allowed:false,
          no_paid_routes_started:true
        }]
      });
      return;
    }
    if(url.pathname==='/status'){
      await fulfillJson(route,{
        ok:true,
        no_paid_routes_started:true,
        live_verified_intelligence_route_count:1,
        operator_readiness:{
          readiness_state:'swarm_preview_ready',
          default_writer_readiness:{classification:'release_ready',authenticated_release_ready:true,blocker_codes:[]},
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
    const groqRequest=String(body.model||'')===groqModel;
    const mistralRequest=String(body.model||'')===mistralRoute;
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
      choices:[{message:{role:'assistant',content:groqRequest?( /Fix sum/.test(current)?'const sum = (a, b) => a + b':'Result for 19 and 37 is 56'):mistralRequest?'Mistral continuation answer.':`Hosted svar ${answerCount}`},finish_reason:'stop'}],
      mmir:{
        ...(groqRequest||mistralRequest||answerCount!==1?{answer_writer:{object:'mmir.answer_writer',type:'llm',provider:groqRequest?'groq':mistralRequest?'mistral':'nvidia',model_id:groqRequest?groqModel:mistralRequest?'mistral-small-latest':model,model_display_name:groqRequest?'Groq: openai/gpt-oss-120b':mistralRequest?'Mistral Small':'Mistral Small 4'}}:{}),
        writer_continuity_receipt:groqRequest||mistralRequest?writerReceipt((body.messages?.length||0)+1,answerCount,groqRequest?groqModel:mistralRoute):responseReceipt,
        no_paid_routes_started:true,
        provider_secrets_in_browser:false
      }
    });
  });
}

async function sendAndWait(page,prompt,answerPattern){
  await page.locator('#p0-input').fill(prompt);
  await page.locator('#p0-send').click();
  try{
    await page.waitForFunction(
      pattern=>new RegExp(pattern.source,pattern.flags).test(document.getElementById('p0-transcript')?.innerText||''),
      {source:answerPattern.source,flags:answerPattern.flags}
    );
  }catch(error){
    const tail=(await page.locator('#p0-transcript').innerText().catch(()=>'' )).slice(-500);
    throw new Error(`Timed out waiting for ${answerPattern}: last model=${chatRequests.at(-1)?.model||'none'}; transcript=${tail}`,{cause:error});
  }
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
    assert(chatRequests.at(-1)?.model==='mmir-supergenius','Default auto first turn must keep the canonical hosted model.');

    const requestsBeforePrivate=chatRequests.length;
    await sendAndWait(page,'/remember PRIVATE-BROWSER-SENTINEL',/Saved locally in this browser/);
    await sendAndWait(page,'/doc Secret note: PRIVATE-DOCUMENT-SENTINEL',/Document note saved locally/);
    assert(chatRequests.length===requestsBeforePrivate,'/remember and /doc must not call api.mmir.ai.');

    await sendAndWait(page,'HOSTED-TURN-2',/Hosted svar 2/);
    assert(chatRequests.at(-1)?.model==='mmir-supergenius','Default auto follow-up must not be overridden by selected-route preservation.');
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

    const groqPage=await browser.newPage({viewport:{width:1280,height:800}});
    await installFixtures(groqPage);
    await groqPage.goto(`${baseUrl}/mmir.html?writer_continuity_groq_e2e=1#mimir-chat-runtime`,{waitUntil:'networkidle'});
    await groqPage.waitForSelector('#p0-input');
    await groqPage.locator('#p0-model').click();
    await groqPage.locator(`button[data-model-id="hosted-route:${groqModel}"]`).click();
    await sendAndWait(groqPage,'Fix sum=(a,b)=>a-b to add.',/const sum/);
    const groqFirst=chatRequests.at(-1);
    const groqFirstAnswer='const sum = (a, b) => a + b';
    const groqReceipt=(await groqPage.locator('.p0-message-assistant').last().locator('.p0-receipt-model').innerText()).trim();
    await sendAndWait(groqPage,'What is the result for 19 and 37?',/Result for 19 and 37 is 56/);
    const groqSecond=chatRequests.at(-1);
    const groqSecondAnswer='Result for 19 and 37 is 56';
    const groqSecondReceipt=(await groqPage.locator('.p0-message-assistant').last().locator('.p0-receipt-model').innerText()).trim();
    assert(groqSecond?.model===groqModel,'Explicit Groq follow-up must keep the selected Groq route.');
    assert(groqSecond?.messages?.some(message=>message.role==='user'&&message.content==='Fix sum=(a,b)=>a-b to add.'),'Groq follow-up must retain the first user turn.');
    assert(groqSecond?.messages?.some(message=>message.role==='assistant'&&message.content===groqFirstAnswer),'Groq follow-up must retain the first assistant answer.');
    await groqPage.locator('#p0-model').click();
    await groqPage.locator(`button[data-model-id="hosted-route:${mistralRoute}"]`).click();
    await sendAndWait(groqPage,'Continue from the previous answer and name the selected model.',/Mistral continuation answer/);
    const mistralThird=chatRequests.at(-1);
    const mistralReceipt=(await groqPage.locator('.p0-message-assistant').last().locator('.p0-receipt-model').innerText()).trim();
    assert(groqFirst?.model===groqModel,'Explicit Groq first turn must use the selected Groq route.');
    assert(mistralThird?.model===mistralRoute,'Third turn must use the distinct selected Mistral route.');
    assert(mistralThird?.messages?.some(message=>message.role==='user'&&message.content==='Fix sum=(a,b)=>a-b to add.'),'Cross-route turn must retain the first user turn.');
    assert(mistralThird?.messages?.some(message=>message.role==='assistant'&&message.content===groqFirstAnswer),'Cross-route turn must retain the first Groq answer.');
    assert(mistralThird?.messages?.some(message=>message.role==='user'&&message.content==='What is the result for 19 and 37?'),'Cross-route turn must retain the second user turn.');
    assert(mistralThird?.messages?.some(message=>message.role==='assistant'&&message.content===groqSecondAnswer),'Cross-route turn must retain the second Groq answer.');
    assert(groqReceipt==='Groq: openai/gpt-oss-120b','First selected Groq answer must render its actual writer identity.');
    assert(groqSecondReceipt==='Groq: openai/gpt-oss-120b','Second Groq answer must render its actual writer identity.');
    assert(mistralReceipt==='Mistral Small','Switched Mistral answer must render its distinct writer identity.');
    await groqPage.close();
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
