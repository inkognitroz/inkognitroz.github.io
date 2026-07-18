import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import vm from 'node:vm';

const root=resolve(process.cwd());
const portalDir=join(root,'public','apps','mimir-chat-portal');
const helper=readFileSync(join(portalDir,'p0-route-adapters.js'),'utf8');
const shell=readFileSync(join(portalDir,'p0-chat-shell.js'),'utf8');
const packageJson=JSON.parse(readFileSync(join(root,'package.json'),'utf8'));
const failures=[];

function fail(message){failures.push(message);}
function requireIncludes(source,needle,message){if(!source.includes(needle))fail(message);}

const events=[];
const storage=new Map();
const context={
  window:{
    addEventListener(){},
    dispatchEvent(event){events.push(event);}
  },
  location:{hostname:'mmir.ai',href:'https://mmir.ai/mmir.html'},
  URL,
  Date,
  TextEncoder,
  AbortController,
  setTimeout,
  clearTimeout,
  CustomEvent:function CustomEvent(type,init={}){this.type=type;this.detail=init.detail;},
  sessionStorage:{
    getItem(key){return storage.get(key)||'';},
    setItem(key,value){storage.set(key,String(value));}
  },
  fetch:async()=>({ok:true,status:200,json:async()=>({ok:true})})
};
context.globalThis=context;
vm.createContext(context);
vm.runInContext(helper,context,{filename:'p0-route-adapters.js'});
const api=context.window.MimirP0RouteAdapters;

if(!api)fail('Writer-continuity smoke needs the public route adapter API.');
requireIncludes(shell,'.filter(hostedLineageEligible)','Hosted history must be built only from explicitly trusted hosted lineage.');
if(shell.includes('...history.slice(-10)'))fail('Public chat must not silently discard conversation history after ten messages.');
requireIncludes(shell,'...history,','Public chat must forward the full bounded hosted lineage.');
requireIncludes(shell,"routeProvenance:'browser-local',hostedLineage:false",'Browser-only memory and document turns must be marked non-hosted.');
requireIncludes(shell,"model?.route==='local'?'local-model'",'Local-model turns must carry explicit local provenance.');
requireIncludes(shell,'writerContinuityRequestPlan(payload,writerContinuityState)','Public chat must plan and truthfully report exact-prefix continuity.');
requireIncludes(shell,'writerContinuityStatePlanFromResponse(requestPayload,responsePayload,previousState)','A response that crosses the browser boundary must be reported instead of silently clearing continuity.');
requireIncludes(shell,'captureWriterContinuity(payload,response','Public chat must capture the gateway-issued successor receipt.');
requireIncludes(shell,'clearWriterContinuityState();','Fresh/private boundaries must be able to clear continuity state.');
requireIncludes(shell,"object:'mmir.client_writer_continuity'",'The 96 KiB continuity boundary must produce explicit response metadata.');
requireIncludes(shell,'Writer continuity reset','The 96 KiB continuity boundary must be visible to the user.');
const fallbackAttemptIndex=shell.indexOf("routeProvenance:'hosted-fallback-attempted'");
const fallbackDispatchIndex=shell.indexOf('const fallbackData=await chatHostedData');
if(fallbackAttemptIndex<0||fallbackDispatchIndex<0||fallbackAttemptIndex>fallbackDispatchIndex)fail('Hosted fallback must be marked attempted/result-unknown before network dispatch.');
requireIncludes(String(packageJson.scripts?.check||''),'smoke-check-p0-writer-continuity.js','npm run check must include the public writer-continuity contract.');
requireIncludes(String(packageJson.scripts?.precheck||''),'render-check-p0-writer-continuity.mjs','npm run check must execute the real public browser writer-continuity flow.');

const now=Date.parse('2026-07-18T18:00:00.000Z');
const model='mistralai/mistral-small-4-119b-2603';
function receipt(prefixCount,overrides={}){
  return {
    object:'mmir.writer_continuity_receipt',
    schema_version:'2026-07-18-writer-continuity-v1',
    purpose:'writer-continuity',
    id:'writer-continuity-11111111-1111-4111-8111-111111111111',
    issued_at:'2026-07-18T17:59:00.000Z',
    expires_at:'2026-07-19T17:59:00.000Z',
    writer_type:'llm',
    provider:'nvidia',
    model_id:model,
    model_display_name:'Mistral Small 4',
    writer_request_model_id:'mistral-small-latest',
    writer_route_id:'nvidia/'+model,
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
    signature_rotation_policy:{current_key_id:'mmir-live-route-receipt-key-v1'},
    ...overrides
  };
}

const initialMessages=[{role:'system',content:'Svar direkte og behold samtalekonteksten.'}];
for(let index=1;index<=7;index+=1){
  initialMessages.push({role:'user',content:'Tidlig brukerturn '+index});
  initialMessages.push({role:'assistant',content:'Tidlig svar '+index});
}
initialMessages.push({role:'user',content:'Hva sa jeg i første turn?'});
const initialAnswer={role:'assistant',content:'Du skrev Tidlig brukerturn 1.'};
const initialReceipt=receipt(initialMessages.length+1);
const initialRequest={model,messages:initialMessages};
const initialResponse={
  choices:[{message:initialAnswer,finish_reason:'stop'}],
  mmir:{
    answer_writer:{object:'mmir.answer_writer',type:'llm',provider:'nvidia',model_id:model,model_display_name:'Mistral Small 4'},
    writer_continuity_receipt:initialReceipt
  }
};
const firstState=api.writerContinuityStateFromResponse(initialRequest,initialResponse,null,{now});
if(!firstState)fail('A valid gateway response must create public writer-continuity state.');
if(firstState?.messages.length!==17)fail('Writer continuity must retain every message in a >12-message conversation.');
if(firstState?.messages[1]?.content!=='Tidlig brukerturn 1')fail('Writer continuity must retain the earliest accepted user turn.');

const followUpBase={
  model,
  messages:[
    {role:'system',content:'A newly rebuilt system prompt must not replace the signed prefix.'},
    {role:'user',content:'Og hva med den tredje?'}
  ]
};
const followUp=api.writerContinuityRequest(followUpBase,firstState,{now});
if(followUp.writer_continuity_receipt?.id!==initialReceipt.id)fail('The next same-model request must echo the latest continuity receipt.');
if(followUp.writer_continuity_receipt?.writer_request_model_id!=='mistral-small-latest')fail('Frontend receipt validation must preserve the gateway writer-request model contract.');
if(followUp.messages?.length!==19)fail('The next request must append a changed system instruction and one user turn to the full exact prefix.');
if(followUp.messages?.[0]?.content!==initialMessages[0].content)fail('The next request must preserve the receipt-bound system prefix exactly.');
if(followUp.messages?.[1]?.content!=='Tidlig brukerturn 1')fail('The next request must not truncate early turns after twelve messages.');
if(followUp.messages?.at(-2)?.content!==followUpBase.messages[0].content)fail('A legitimate role/style/grounding system change must survive continuity reconstruction.');
const rebuiltSameSystem=api.writerContinuityRequest({
  model,
  messages:[
    {role:'system',content:initialMessages[0].content+'\n\nConversation memory: The user may ask short follow-up questions. Rebuilt browser history must not rewrite the signed prefix.'},
    {role:'user',content:'Behold samme stil.'}
  ]
},firstState,{now});
if(rebuiltSameSystem.messages?.length!==18||rebuiltSameSystem.messages?.at(-1)?.content!=='Behold samme stil.')fail('A rebuilt conversation-memory suffix must not duplicate or rewrite an unchanged system instruction.');

const toolResponse={
  choices:[{message:{role:'assistant',content:'391'},finish_reason:'stop'}],
  mmir:{answer_writer:{object:'mmir.answer_writer',type:'capability',model_display_name:'Eksakt matematikk'}}
};
const afterTool=api.writerContinuityStateFromResponse(followUp,toolResponse,firstState,{now});
if(!afterTool)fail('An exact-tool intermezzo must preserve the prior verified LLM continuity state.');
if(afterTool?.receipt?.id!==initialReceipt.id)fail('An exact tool must not replace the retained LLM receipt.');
if(afterTool?.messages?.at(-1)?.content!=='391')fail('The exact-tool result must remain in the retained conversation between LLM turns.');
const afterToolFollowUp=api.writerContinuityRequest({model,messages:[{role:'user',content:'Husker du fortsatt starten?'}]},afterTool,{now});
if(afterToolFollowUp.messages?.at(-2)?.content!=='391')fail('The next LLM request must retain the exact-tool intermezzo before the new follow-up.');

const visibleMessages=[
  {role:'user',content:'Hosted question',routeProvenance:'hosted-chat',hostedLineage:true},
  {role:'assistant',content:'Hosted answer',routeProvenance:'hosted-chat',hostedLineage:true},
  {role:'user',content:'/remember PRIVATE-BROWSER-SENTINEL',routeProvenance:'browser-local',hostedLineage:false},
  {role:'assistant',content:'Saved PRIVATE-BROWSER-SENTINEL',routeProvenance:'browser-local',hostedLineage:false},
  {role:'user',content:'LOCAL-MODEL-SENTINEL',routeProvenance:'local-model',hostedLineage:false},
  {role:'assistant',content:'LOCAL-ONLY-ANSWER',routeProvenance:'local-model',hostedLineage:false},
  {role:'assistant',content:'Legacy message without trust marker'}
];
const hostedOnly=visibleMessages.filter(api.hostedLineageEligible).map(({role,content})=>({role,content}));
const outbound=api.boundedChatMessageTail(hostedOnly,{maxMessages:40,maxBytes:72*1024});
const outboundText=JSON.stringify(outbound);
if(outbound.length!==2)fail('Only explicit hosted lineage may enter a later api.mmir.ai request.');
if(/PRIVATE-BROWSER-SENTINEL|LOCAL-MODEL-SENTINEL|LOCAL-ONLY-ANSWER/.test(outboundText))fail('Browser-private and local-model content must never cross into hosted lineage without an explicit new user prompt.');
if(api.hostedLineageEligible({role:'user',content:'attempted only',routeProvenance:'hosted-fallback-attempted',hostedLineage:false}))fail('An attempted fallback with unknown result must never become trusted hosted lineage.');

const receiptOnlyIdentity=api.truthfulWriterIdentity({mmir:{writer_continuity_receipt:initialReceipt}},null,{now});
if(receiptOnlyIdentity.model_id!==model||receiptOnlyIdentity.identity_source!=='writer-continuity-receipt')fail('A valid signed continuity receipt must provide truthful model identity when the top-level model is absent.');
const suspiciousEnvelopeIdentity=api.truthfulWriterIdentity({model:'mmir-supergenius',mmir:{writer_continuity_receipt:initialReceipt}},null,{now});
if(suspiciousEnvelopeIdentity.model_id!==model)fail('A generic Supergeni envelope must not override the concrete signed writer identity.');
const matchingCanonicalIdentity=api.truthfulWriterIdentity(initialResponse,null,{now});
if(matchingCanonicalIdentity.model_id!==model||matchingCanonicalIdentity.identity_verified!==true)fail('Matching canonical answer-writer and receipt identity must remain verified.');
const conflictingIdentity=api.truthfulWriterIdentity({mmir:{
  answer_writer:{object:'mmir.answer_writer',type:'llm',provider:'nvidia',model_id:'other/model',model_display_name:'Other Model'},
  writer_continuity_receipt:initialReceipt
}},null,{now});
if(conflictingIdentity.model_id||conflictingIdentity.identity_source!=='conflicting-writer-attestations'||conflictingIdentity.identity_verified!==false)fail('Conflicting canonical answer-writer and receipt attestations must fail closed as unknown.');
const conflictingContinuityState=api.writerContinuityStateFromResponse(initialRequest,{
  choices:[{message:initialAnswer,finish_reason:'stop'}],
  mmir:{
    answer_writer:{object:'mmir.answer_writer',type:'llm',provider:'nvidia',model_id:'other/model',model_display_name:'Other Model'},
    writer_continuity_receipt:initialReceipt
  }
},null,{now});
if(conflictingContinuityState)fail('A conflicting writer attestation must not advance trusted continuity state.');
const unverifiedBestIdentity=api.truthfulWriterIdentity({best_answer:{provider:'nvidia',model_id:model,model_display_name:'Mistral Small 4'}},null,{now});
if(unverifiedBestIdentity.model_id||unverifiedBestIdentity.identity_verified!==false)fail('Best/selected/response identities must never be presented as the verified actual writer.');
const signedBestIdentity=api.truthfulWriterIdentity({best_answer:{
  answer_writer:{object:'mmir.answer_writer',type:'llm',provider:'nvidia',model_id:model,model_display_name:'Mistral Small 4'},
  answer_proof_line:{
    object:'mmir.answer_proof_line',
    receipt:{signed:true,keyed:true,id:'receipt-signed-best-1',signature_authority:'mmir-keyed-hmac',signature_key_id:'mmir-live-route-receipt-key-v1'},
    provider_secrets_in_browser:false,
    no_paid_routes_started:true
  },
  receipt:{provider:'nvidia',model_id:model,no_paid_routes_started:true}
}},null,{now});
if(signedBestIdentity.model_id!==model||signedBestIdentity.identity_source!=='signed-best-answer-writer'||signedBestIdentity.identity_verified!==true)fail('A canonical best-answer writer may be shown only when its signed proof and route identity agree.');
const selectedRouteIdentity=api.truthfulWriterIdentity({}, {provider:'nvidia',model,id:model,label:'Mistral Small 4'}, {now});
if(selectedRouteIdentity.model_id||selectedRouteIdentity.identity_verified!==false)fail('The selected route is not proof of the actual answer writer.');
const missingIdentity=api.truthfulWriterIdentity({}, {model:'mmir-supergenius',label:'Supergeni'}, {now});
if(missingIdentity.model_display_name!=='Ukjent svarforfatter · ikke verifisert'||missingIdentity.identity_verified!==false)fail('Missing writer identity must be shown as unknown/unverified, never as Supergeni.');

const expired=api.normalizedWriterContinuityReceipt(receipt(3,{expires_at:'2026-07-18T17:00:00.000Z'}),{now});
if(expired)fail('Expired continuity receipts must fail closed in the browser.');
const futureIssued=api.normalizedWriterContinuityReceipt(receipt(3,{issued_at:'2026-07-18T18:01:00.000Z',expires_at:'2026-07-18T19:01:00.000Z'}),{now});
if(futureIssued)fail('Future-issued continuity receipts must fail closed in the browser.');
const malformedRequestedModel=api.normalizedWriterContinuityReceipt(receipt(3,{writer_request_model_id:'bad\nmodel'}),{now});
if(malformedRequestedModel)fail('The cross-contract writer request model id must reject control characters.');
const wrongModel=api.writerContinuityRequest({model:'another/model',messages:[{role:'user',content:'new model'}]},firstState,{now});
if(wrongModel.writer_continuity_receipt)fail('Changing the selected model must not silently reuse another writer receipt.');
const oversizedState={...firstState,messages:firstState.messages.map((message,index)=>index===firstState.messages.length-1?{...message,content:'x'.repeat(97*1024)}:message)};
if(api.normalizedWriterContinuityState(oversizedState,{now}))fail('Continuity state must stay below the bounded browser payload budget.');
const oversizedPlan=api.writerContinuityRequestPlan({model,messages:[{role:'user',content:'Fortsett'}]},oversizedState,{now});
if(oversizedPlan.applied||oversizedPlan.reason!=='continuity-payload-limit-exceeded'||oversizedPlan.limit_bytes!==96*1024)fail('The browser continuity cliff must fail closed with an explicit 96 KiB reason.');
const nearLimitState={...firstState,messages:firstState.messages.map((message,index)=>index===firstState.messages.length-1?{...message,content:'x'.repeat(92*1024)}:message)};
if(!api.normalizedWriterContinuityState(nearLimitState,{now}))fail('The boundary test requires a valid state just below 96 KiB.');
const crossingPlan=api.writerContinuityRequestPlan({model,messages:[{role:'user',content:'y'.repeat(8*1024)}]},nearLimitState,{now});
if(crossingPlan.applied||crossingPlan.reason!=='continuity-payload-limit-exceeded')fail('A new turn that crosses 96 KiB must reset explicitly instead of silently dropping context.');
const oversizedResponsePlan=api.writerContinuityStatePlanFromResponse(initialRequest,{
  choices:[{message:{role:'assistant',content:'z'.repeat(97*1024)},finish_reason:'stop'}],
  mmir:{
    answer_writer:{object:'mmir.answer_writer',type:'llm',provider:'nvidia',model_id:model,model_display_name:'Mistral Small 4'},
    writer_continuity_receipt:initialReceipt
  }
},null,{now});
if(oversizedResponsePlan.state||oversizedResponsePlan.reason!=='continuity-payload-limit-exceeded')fail('A response that first crosses 96 KiB must expose the same explicit reset reason.');

if(failures.length){
  console.error('P0 writer continuity smoke failed:');
  failures.forEach(failure=>console.error('- '+failure));
  process.exit(1);
}

console.log('P0 writer continuity smoke passed.');
