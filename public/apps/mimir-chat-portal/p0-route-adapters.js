(function(){
  const version='20260718-writer-continuity-v1';
  const PROD_API_URL='https://api.mmir.ai';
  const STAGING_API_URL='https://api-staging.mmir.ai';
  const LOCAL_URL='http://127.0.0.1:3000';
  const CHAT_PATH='/v1/chat/completions';
  const ROUTE_SCORE_PATH='/routing/score';
  const TOKEN_KEY='mmir-p0-local-token';
  const SYNTHETIC_DEMO_ASSISTANT_RE=/^\s*DEMO:\s*MMIR\s+(?:samler inn samtalen|kan samle inn samtalen|collects the conversation)\b/i;
  const PREVIOUS_USER_QUESTION_RE=/^Previous user question:\s*/i;
  const PREVIOUS_ASSISTANT_ANSWER_RE=/^Previous assistant answer:\s*/i;
  const MISLEADING_TRUST_LABEL_RE=/Verifisert\s*·\s*privat/gi;
  const TRUTHFUL_TRUST_LABEL='Rute og personvern verifisert';
  const WRITER_CONTINUITY_OBJECT='mmir.writer_continuity_receipt';
  const WRITER_CONTINUITY_SCHEMA_VERSION='2026-07-18-writer-continuity-v1';
  const WRITER_CONTINUITY_PURPOSE='writer-continuity';
  const WRITER_CONTINUITY_MAX_TTL_MS=24*60*60*1000;
  const WRITER_CONTINUITY_MAX_MESSAGES=4096;
  const WRITER_CONTINUITY_MAX_BYTES=96*1024;
  const WRITER_CONTINUITY_MAX_RECEIPT_BYTES=12*1024;
  const WRITER_CONTINUITY_ID_RE=/^writer-continuity-[a-f0-9-]{32,36}$/;
  const SHA256_RE=/^sha256:[a-f0-9]{64}$/;
  const HMAC_SHA256_RE=/^hmac-sha256:[a-f0-9]{64}$/;
  const CONTROL_CHARACTER_RE=/[\u0000-\u001f\u007f]/;
  const CHAT_ROLES=new Set(['system','user','assistant']);
  const HOSTED_LINEAGE_PROVENANCE=new Set(['hosted-chat','hosted-fallback','hosted-capability']);
  const WRITER_CONTINUITY_FIELDS=new Set([
    'object','schema_version','purpose','id','issued_at','expires_at','writer_type',
    'provider','model_id','model_display_name','writer_request_model_id','writer_route_id','writer_node_id',
    'source_receipt_id','source_receipt_hash','conversation_prefix_version',
    'conversation_prefix_count','conversation_prefix_hash','no_paid_routes_started',
    'provider_secrets_in_browser','receipt_hash','receipt_signature','signature_algorithm',
    'signature_authority','signature_key_id','signature_key_state','signature_rotation_policy',
    'signed_receipt_schema_version'
  ]);

  function apiUrlForCurrentHost(){
    try{
      return String(location.hostname||'').toLowerCase()==='staging.mmir.ai'?STAGING_API_URL:PROD_API_URL;
    }catch(error){
      return PROD_API_URL;
    }
  }

  function apiHostLabel(url){
    try{
      return new URL(url).host;
    }catch(error){
      return 'api.mmir.ai';
    }
  }

  function fetchOptions(url,options){
    const init={...options};
    try{
      const parsed=new URL(url,location.href);
      if(['127.0.0.1','localhost','::1'].includes(parsed.hostname)){
        init.targetAddressSpace='loopback';
      }
    }catch(error){}
    return init;
  }

  function messageText(message){
    const content=message?.content;
    if(typeof content==='string')return content;
    if(!Array.isArray(content))return '';
    return content
      .filter(part=>part&&typeof part==='object'&&part.type==='text')
      .map(part=>String(part.text||''))
      .join('\n');
  }

  function normalizedText(value){
    return String(value||'').replace(/\s+/g,' ').trim();
  }

  function jsonByteLength(value){
    let serialized='';
    try{serialized=JSON.stringify(value);}catch(error){return Number.POSITIVE_INFINITY;}
    try{return new TextEncoder().encode(serialized).byteLength;}catch(error){return serialized.length;}
  }

  function publicIdentity(value,maxLength){
    if(typeof value!=='string')return '';
    const normalized=value.trim();
    if(!normalized||normalized.length>maxLength||CONTROL_CHARACTER_RE.test(normalized))return '';
    return normalized;
  }

  function isSupergeniIdentity(value){
    const normalized=String(value||'').trim().toLowerCase().replace(/\s+/g,'-');
    if(!normalized)return false;
    return ['mmir','mimir','supergeni','supergenius','mmir-supergenius','supergeni-free','supergenius-free'].includes(normalized)
      || /(^|[/:_.-])(?:mmir[/:_.-]*)?supergeni(?:us|ous)?(?:[/:_.-]*free)?($|[/:_.-])/.test(normalized);
  }

  function concreteWriterIdentity(candidate,source,verified=false){
    const modelId=publicIdentity(candidate?.model_id||candidate?.model,200);
    const displayName=publicIdentity(candidate?.model_display_name||modelId,200);
    const provider=publicIdentity(candidate?.provider,80);
    if(!modelId||!displayName||isSupergeniIdentity(modelId)||isSupergeniIdentity(displayName))return null;
    return {
      type:'llm',
      provider,
      model_id:modelId,
      model_display_name:displayName,
      identity_source:source,
      identity_verified:verified
    };
  }

  function plainChatMessages(messages,{maxMessages=WRITER_CONTINUITY_MAX_MESSAGES,maxBytes=WRITER_CONTINUITY_MAX_BYTES}={}){
    if(!Array.isArray(messages)||!messages.length||messages.length>maxMessages)return null;
    const normalized=[];
    for(const message of messages){
      if(!message||typeof message!=='object'||Array.isArray(message))return null;
      if(!CHAT_ROLES.has(message.role)||typeof message.content!=='string')return null;
      normalized.push({role:message.role,content:message.content});
    }
    return jsonByteLength(normalized)<=maxBytes?normalized:null;
  }

  function boundedChatMessageTail(messages,{maxMessages=40,maxBytes=72*1024}={}){
    if(!Array.isArray(messages))return [];
    const normalized=messages
      .filter(message=>message&&CHAT_ROLES.has(message.role)&&typeof message.content==='string')
      .map(message=>({role:message.role,content:message.content}))
      .slice(-Math.max(1,Math.min(Number(maxMessages)||40,WRITER_CONTINUITY_MAX_MESSAGES)));
    while(normalized.length&&jsonByteLength(normalized)>maxBytes)normalized.shift();
    return normalized;
  }

  function hostedLineageEligible(message){
    return Boolean(
      message&&
      message.hostedLineage===true&&
      HOSTED_LINEAGE_PROVENANCE.has(String(message.routeProvenance||''))&&
      (message.role==='user'||message.role==='assistant')&&
      typeof message.content==='string'
    );
  }

  function sanitizedChatPayload(payload){
    if(!payload||typeof payload!=='object'||Array.isArray(payload)||!Array.isArray(payload.messages))return payload;
    const sanitized=sanitizeChatMessages(payload.messages);
    return sanitized.changed?{...payload,messages:sanitized.messages}:payload;
  }

  function normalizedWriterContinuityReceipt(receipt,{now=Date.now()}={}){
    if(!receipt||typeof receipt!=='object'||Array.isArray(receipt))return null;
    if(Object.keys(receipt).some(field=>!WRITER_CONTINUITY_FIELDS.has(field)))return null;
    if(jsonByteLength(receipt)>WRITER_CONTINUITY_MAX_RECEIPT_BYTES)return null;
    if(receipt.object!==WRITER_CONTINUITY_OBJECT||receipt.schema_version!==WRITER_CONTINUITY_SCHEMA_VERSION)return null;
    if(receipt.purpose!==WRITER_CONTINUITY_PURPOSE||receipt.writer_type!=='llm')return null;
    if(!WRITER_CONTINUITY_ID_RE.test(String(receipt.id||'')))return null;
    if(publicIdentity(receipt.provider,80)!==receipt.provider)return null;
    if(publicIdentity(receipt.model_id,200)!==receipt.model_id)return null;
    if(publicIdentity(receipt.model_display_name,200)!==receipt.model_display_name)return null;
    if([receipt.provider,receipt.model_id,receipt.model_display_name].some(isSupergeniIdentity))return null;
    if(receipt.writer_request_model_id!==undefined&&publicIdentity(receipt.writer_request_model_id,200)!==receipt.writer_request_model_id)return null;
    if(receipt.writer_route_id!==undefined&&publicIdentity(receipt.writer_route_id,240)!==receipt.writer_route_id)return null;
    if(receipt.writer_node_id!==undefined&&publicIdentity(receipt.writer_node_id,120)!==receipt.writer_node_id)return null;
    if(receipt.source_receipt_id!==undefined&&publicIdentity(receipt.source_receipt_id,160)!==receipt.source_receipt_id)return null;
    if(receipt.source_receipt_hash!==undefined&&!SHA256_RE.test(String(receipt.source_receipt_hash)))return null;
    if(receipt.conversation_prefix_version!=='2026-07-18-conversation-prefix-v1')return null;
    if(!Number.isInteger(receipt.conversation_prefix_count)||receipt.conversation_prefix_count<1||receipt.conversation_prefix_count>WRITER_CONTINUITY_MAX_MESSAGES)return null;
    if(!HMAC_SHA256_RE.test(String(receipt.conversation_prefix_hash||'')))return null;
    if(receipt.no_paid_routes_started!==true||receipt.provider_secrets_in_browser!==false)return null;
    if(receipt.signature_authority!=='mmir-keyed-hmac'||receipt.signature_algorithm!=='hmac-sha256-canonical-json-v1')return null;
    if(!SHA256_RE.test(String(receipt.receipt_hash||''))||!HMAC_SHA256_RE.test(String(receipt.receipt_signature||'')))return null;
    if(!publicIdentity(receipt.signature_key_id,160))return null;
    const issuedAt=Date.parse(String(receipt.issued_at||''));
    const expiresAt=Date.parse(String(receipt.expires_at||''));
    const nowMs=Number(now);
    if(!Number.isFinite(issuedAt)||!Number.isFinite(expiresAt)||!Number.isFinite(nowMs))return null;
    if(issuedAt>nowMs||expiresAt<=nowMs||expiresAt<=issuedAt||expiresAt-issuedAt>WRITER_CONTINUITY_MAX_TTL_MS)return null;
    return JSON.parse(JSON.stringify(receipt));
  }

  function unknownWriterIdentity(source='missing'){
    return {
      type:'unknown',
      provider:'',
      model_id:'',
      model_display_name:'Ukjent svarforfatter · ikke verifisert',
      identity_source:source,
      identity_verified:false
    };
  }

  function sameWriterIdentity(left,right){
    return Boolean(
      left&&right&&
      left.type===right.type&&
      left.provider===right.provider&&
      left.model_id===right.model_id&&
      left.model_display_name===right.model_display_name
    );
  }

  function signedBestAnswerWriter(payload){
    const best=payload?.mmir?.best_answer||payload?.best_answer||payload?.mmir?.compare_best_answer;
    if(!best||typeof best!=='object'||Array.isArray(best))return null;
    const writer=best.answer_writer;
    const proof=best.answer_proof_line;
    const proofReceipt=proof?.receipt;
    const routeReceipt=best.receipt;
    if(!writer||typeof writer!=='object'||Array.isArray(writer)||writer.object!=='mmir.answer_writer')return null;
    if(proof?.object!=='mmir.answer_proof_line'||proofReceipt?.signed!==true||proofReceipt?.keyed!==true)return null;
    if(proofReceipt.signature_authority!=='mmir-keyed-hmac'||proof.provider_secrets_in_browser!==false||proof.no_paid_routes_started!==true)return null;
    if(!publicIdentity(proofReceipt.id,160)||!publicIdentity(proofReceipt.signature_key_id,160))return null;
    const provider=publicIdentity(writer.provider,80);
    const modelId=publicIdentity(writer.model_id,200);
    if(!provider||!modelId||routeReceipt?.provider!==provider||routeReceipt?.model_id!==modelId)return null;
    if(routeReceipt.no_paid_routes_started!==true)return null;
    return writer;
  }

  function truthfulWriterIdentity(payload,_fallbackModel=null,{now=Date.now()}={}){
    const topWriter=payload?.mmir?.answer_writer;
    const canonicalWriter=topWriter&&typeof topWriter==='object'&&!Array.isArray(topWriter)&&topWriter.object==='mmir.answer_writer'
      ? topWriter
      : null;
    const writerType=String(canonicalWriter?.type||'').trim().toLowerCase();
    const receipt=normalizedWriterContinuityReceipt(payload?.mmir?.writer_continuity_receipt,{now});
    const receiptIdentity=concreteWriterIdentity(receipt,'writer-continuity-receipt',true);
    if(writerType==='capability'){
      if(receiptIdentity)return unknownWriterIdentity('conflicting-writer-attestations');
      const capabilityName=publicIdentity(canonicalWriter?.model_display_name||canonicalWriter?.display_name||canonicalWriter?.name,200);
      return {
        type:'capability',
        provider:publicIdentity(canonicalWriter?.provider,80),
        model_id:publicIdentity(canonicalWriter?.model_id,200),
        model_display_name:capabilityName&&!isSupergeniIdentity(capabilityName)?capabilityName:'Eksakt verktøy',
        identity_source:'answer-writer-capability',
        identity_verified:Boolean(capabilityName&&!isSupergeniIdentity(capabilityName))
      };
    }

    const topIdentity=writerType==='llm'?concreteWriterIdentity(canonicalWriter,'answer-writer',true):null;
    const bestIdentity=concreteWriterIdentity(signedBestAnswerWriter(payload),'signed-best-answer-writer',true);
    const trustedTop=topIdentity?.provider?topIdentity:null;
    const trustedBest=bestIdentity?.provider?bestIdentity:null;
    if(trustedTop&&trustedBest&&!sameWriterIdentity(trustedTop,trustedBest)){
      return unknownWriterIdentity('conflicting-writer-attestations');
    }
    const trustedCanonical=trustedTop||trustedBest;
    if(trustedCanonical&&receiptIdentity&&!sameWriterIdentity(trustedCanonical,receiptIdentity)){
      return unknownWriterIdentity('conflicting-writer-attestations');
    }
    if(trustedCanonical)return trustedCanonical;
    if(receiptIdentity)return receiptIdentity;
    return unknownWriterIdentity(canonicalWriter||payload?.best_answer?.answer_writer?'invalid-answer-writer':'missing');
  }

  function writerContinuityStateCandidate(state,{now=Date.now(),maxBytes=WRITER_CONTINUITY_MAX_BYTES}={}){
    if(!state||typeof state!=='object'||Array.isArray(state))return null;
    const receipt=normalizedWriterContinuityReceipt(state.receipt,{now});
    const messages=plainChatMessages(state.messages,{maxBytes});
    const model=publicIdentity(state.model,200);
    if(!receipt||!messages||!model||messages.length<receipt.conversation_prefix_count)return null;
    return {model,receipt,messages};
  }

  function normalizedWriterContinuityState(state,{now=Date.now()}={}){
    return writerContinuityStateCandidate(state,{now,maxBytes:WRITER_CONTINUITY_MAX_BYTES});
  }

  function stableClientSystemMessage(message){
    if(message?.role!=='system'||typeof message.content!=='string')return null;
    const memoryMarker='\n\nConversation memory: The user may ask short follow-up questions.';
    const markerIndex=message.content.indexOf(memoryMarker);
    const content=markerIndex>=0?message.content.slice(0,markerIndex):message.content;
    return content.trim()?{role:'system',content}:null;
  }

  function newClientSystemMessages(messages,continuityMessages){
    const currentSystems=messages
      .slice(0,-1)
      .map(stableClientSystemMessage)
      .filter(Boolean);
    const previousSystems=continuityMessages
      .map(stableClientSystemMessage)
      .filter(Boolean);
    let previousContent=previousSystems.at(-1)?.content||'';
    const additions=[];
    for(const system of currentSystems){
      if(system.content===previousContent)continue;
      additions.push(system);
      previousContent=system.content;
    }
    return additions;
  }

  function writerContinuityRequestPlan(payload,state,{now=Date.now()}={}){
    const result=(nextPayload=payload,reason='invalid-request',extra={})=>({
      payload:nextPayload,
      applied:false,
      reason,
      limit_bytes:WRITER_CONTINUITY_MAX_BYTES,
      ...extra
    });
    if(!payload||typeof payload!=='object'||Array.isArray(payload))return result();
    if(!state)return result(payload,'no-state');
    const continuity=writerContinuityStateCandidate(state,{now,maxBytes:Number.POSITIVE_INFINITY});
    if(!continuity)return result(payload,'invalid-state');
    if(jsonByteLength(continuity.messages)>WRITER_CONTINUITY_MAX_BYTES){
      return result(payload,'continuity-payload-limit-exceeded');
    }
    const model=publicIdentity(payload.model,200);
    const messages=plainChatMessages(payload.messages,{maxBytes:Number.POSITIVE_INFINITY});
    const current=messages?.[messages.length-1];
    if(!model||!messages||!current||current.role!=='user')return result();
    if(model!==continuity.model)return result(payload,'model-changed');
    const systemUpdates=newClientSystemMessages(messages,continuity.messages);
    const unboundedMessages=[...continuity.messages,...systemUpdates,current];
    if(unboundedMessages.length>WRITER_CONTINUITY_MAX_MESSAGES){
      return result(payload,'continuity-message-limit-exceeded');
    }
    if(jsonByteLength(unboundedMessages)>WRITER_CONTINUITY_MAX_BYTES){
      return result(payload,'continuity-payload-limit-exceeded');
    }
    const nextMessages=plainChatMessages(unboundedMessages);
    if(!nextMessages)return result();
    return {
      applied:true,
      reason:'applied',
      limit_bytes:WRITER_CONTINUITY_MAX_BYTES,
      system_updates:systemUpdates.length,
      payload:{
        ...payload,
        messages:nextMessages,
        writer_continuity_receipt:continuity.receipt
      }
    };
  }

  function writerContinuityRequest(payload,state,{now=Date.now()}={}){
    return writerContinuityRequestPlan(payload,state,{now}).payload;
  }

  function sameContinuityReceipt(left,right){
    return Boolean(
      left&&right&&
      left.id===right.id&&
      left.receipt_hash===right.receipt_hash&&
      left.receipt_signature===right.receipt_signature
    );
  }

  function sameChatMessages(left,right){
    if(!Array.isArray(left)||!Array.isArray(right)||left.length!==right.length)return false;
    return left.every((message,index)=>message.role===right[index]?.role&&message.content===right[index]?.content);
  }

  function requestExtendsContinuityState(requestMessages,previousMessages){
    if(!Array.isArray(requestMessages)||!Array.isArray(previousMessages)||requestMessages.length<=previousMessages.length)return false;
    if(!sameChatMessages(requestMessages.slice(0,previousMessages.length),previousMessages))return false;
    const additions=requestMessages.slice(previousMessages.length);
    return additions.at(-1)?.role==='user'&&additions.slice(0,-1).every(message=>message.role==='system');
  }

  function responseAssistantMessage(payload){
    const message=payload?.choices?.[0]?.message;
    if(!message||message.role!=='assistant'||typeof message.content!=='string'||!message.content)return null;
    return {role:'assistant',content:message.content};
  }

  function writerContinuityStatePlanFromResponse(requestPayload,responsePayload,previousState=null,{now=Date.now()}={}){
    const result=(state=null,reason='invalid-response')=>({
      state,
      reason,
      limit_bytes:WRITER_CONTINUITY_MAX_BYTES
    });
    const requestMessages=plainChatMessages(requestPayload?.messages,{maxBytes:Number.POSITIVE_INFINITY});
    const assistant=responseAssistantMessage(responsePayload);
    const model=publicIdentity(requestPayload?.model,200);
    if(!requestMessages||!assistant||!model)return result();
    const completedMessages=plainChatMessages([...requestMessages,assistant],{maxBytes:Number.POSITIVE_INFINITY});
    if(!completedMessages)return result();

    const responseReceipt=responsePayload?.mmir?.writer_continuity_receipt;
    if(responseReceipt!==undefined){
      const receipt=normalizedWriterContinuityReceipt(responseReceipt,{now});
      const writerIdentity=truthfulWriterIdentity(responsePayload,null,{now});
      if(!receipt||receipt.conversation_prefix_count!==completedMessages.length)return result();
      if(writerIdentity.type!=='llm'||writerIdentity.identity_verified!==true)return result();
      if(jsonByteLength(completedMessages)>WRITER_CONTINUITY_MAX_BYTES){
        return result(null,'continuity-payload-limit-exceeded');
      }
      return result({model,receipt,messages:completedMessages},'captured');
    }

    const previous=normalizedWriterContinuityState(previousState,{now});
    const echoed=normalizedWriterContinuityReceipt(requestPayload?.writer_continuity_receipt,{now});
    const answerWriter=truthfulWriterIdentity(responsePayload,null,{now});
    if(!previous||!echoed||answerWriter.type!=='capability'||answerWriter.identity_verified!==true||model!==previous.model)return result();
    if(!sameContinuityReceipt(echoed,previous.receipt))return result();
    if(!requestExtendsContinuityState(requestMessages,previous.messages))return result();
    if(jsonByteLength(completedMessages)>WRITER_CONTINUITY_MAX_BYTES){
      return result(null,'continuity-payload-limit-exceeded');
    }
    return result({model,receipt:previous.receipt,messages:completedMessages},'captured');
  }

  function writerContinuityStateFromResponse(requestPayload,responsePayload,previousState=null,{now=Date.now()}={}){
    return writerContinuityStatePlanFromResponse(requestPayload,responsePayload,previousState,{now}).state;
  }

  function normalizedMessageText(message){
    return normalizedText(messageText(message));
  }

  function isSyntheticDemoAssistant(message){
    return String(message?.role||'').toLowerCase()==='assistant'&&SYNTHETIC_DEMO_ASSISTANT_RE.test(messageText(message));
  }

  function markedSection(lines,startIndex,endIndex,markerRe){
    if(startIndex<0)return '';
    const first=String(lines[startIndex]||'').replace(markerRe,'');
    return [first,...lines.slice(startIndex+1,endIndex)].join('\n').trim();
  }

  function sanitizeSystemMemoryContent(content,currentPrompt){
    if(typeof content!=='string'||!normalizedText(currentPrompt)){
      return {content,changed:false,removed_previous_user_question:0,removed_demo_previous_assistant:0};
    }
    const lines=content.split('\n');
    const userIndex=lines.findIndex(line=>PREVIOUS_USER_QUESTION_RE.test(String(line||'')));
    const assistantIndex=lines.findIndex(line=>PREVIOUS_ASSISTANT_ANSWER_RE.test(String(line||'')));
    const userEnd=assistantIndex>userIndex?assistantIndex:lines.length;
    const assistantEnd=lines.length;
    const previousUser=markedSection(lines,userIndex,userEnd,PREVIOUS_USER_QUESTION_RE);
    const previousAssistant=markedSection(lines,assistantIndex,assistantEnd,PREVIOUS_ASSISTANT_ANSWER_RE);
    const removeUser=userIndex>=0&&normalizedText(previousUser)===normalizedText(currentPrompt);
    const removeAssistant=assistantIndex>=0&&SYNTHETIC_DEMO_ASSISTANT_RE.test(previousAssistant);
    if(!removeUser&&!removeAssistant){
      return {content,changed:false,removed_previous_user_question:0,removed_demo_previous_assistant:0};
    }
    const kept=lines.filter((line,index)=>{
      if(removeUser&&index>=userIndex&&index<userEnd)return false;
      if(removeAssistant&&index>=assistantIndex&&index<assistantEnd)return false;
      return true;
    });
    return {
      content:kept.join('\n').replace(/\n{3,}/g,'\n\n').trim(),
      changed:true,
      removed_previous_user_question:removeUser?1:0,
      removed_demo_previous_assistant:removeAssistant?1:0
    };
  }

  function sanitizeChatMessages(messages){
    if(!Array.isArray(messages)){
      return {
        messages,
        changed:false,
        removed_demo_turns:0,
        removed_duplicate_prompts:0,
        removed_system_prompt_echoes:0,
        removed_system_demo_answers:0
      };
    }
    const filtered=[];
    let removedDemoTurns=0;
    messages.forEach(message=>{
      if(isSyntheticDemoAssistant(message)){
        removedDemoTurns+=1;
        return;
      }
      filtered.push(message);
    });

    let removedDuplicatePrompts=0;
    let lastUserIndex=-1;
    for(let index=filtered.length-1;index>=0;index-=1){
      if(String(filtered[index]?.role||'').toLowerCase()==='user'){
        lastUserIndex=index;
        break;
      }
    }
    if(lastUserIndex>0){
      const currentText=normalizedMessageText(filtered[lastUserIndex]);
      let previousIndex=lastUserIndex-1;
      while(
        currentText&&
        previousIndex>=0&&
        String(filtered[previousIndex]?.role||'').toLowerCase()==='user'&&
        normalizedMessageText(filtered[previousIndex])===currentText
      ){
        filtered.splice(previousIndex,1);
        removedDuplicatePrompts+=1;
        lastUserIndex-=1;
        previousIndex-=1;
      }
    }

    const currentPrompt=lastUserIndex>=0?messageText(filtered[lastUserIndex]):'';
    let removedSystemPromptEchoes=0;
    let removedSystemDemoAnswers=0;
    const sanitizedMessages=filtered.map(message=>{
      if(String(message?.role||'').toLowerCase()!=='system'||typeof message?.content!=='string')return message;
      const sanitized=sanitizeSystemMemoryContent(message.content,currentPrompt);
      removedSystemPromptEchoes+=sanitized.removed_previous_user_question;
      removedSystemDemoAnswers+=sanitized.removed_demo_previous_assistant;
      return sanitized.changed?{...message,content:sanitized.content}:message;
    });

    return {
      messages:sanitizedMessages,
      changed:Boolean(
        removedDemoTurns||
        removedDuplicatePrompts||
        removedSystemPromptEchoes||
        removedSystemDemoAnswers
      ),
      removed_demo_turns:removedDemoTurns,
      removed_duplicate_prompts:removedDuplicatePrompts,
      removed_system_prompt_echoes:removedSystemPromptEchoes,
      removed_system_demo_answers:removedSystemDemoAnswers
    };
  }

  function isChatCompletionsUrl(url){
    try{
      const parsed=new URL(url,location.href);
      return parsed.pathname.replace(/\/+$/,'')===CHAT_PATH;
    }catch(error){
      return false;
    }
  }

  function sanitizeChatRequestOptions(url,options={}){
    if(!isChatCompletionsUrl(url))return options;
    if(String(options?.method||'GET').toUpperCase()!=='POST')return options;
    if(typeof options?.body!=='string')return options;
    let payload=null;
    try{payload=JSON.parse(options.body);}catch(error){return options;}
    if(!payload||!Array.isArray(payload.messages))return options;
    // A continuity payload is assembled from an already-sanitized request
    // prefix. Mutating that prefix here would invalidate the keyed binding.
    if(normalizedWriterContinuityReceipt(payload.writer_continuity_receipt))return options;
    const sanitized=sanitizeChatMessages(payload.messages);
    if(!sanitized.changed)return options;
    return {
      ...options,
      body:JSON.stringify({...payload,messages:sanitized.messages})
    };
  }

  function truthfulTrustLabel(value){
    return String(value||'').replace(MISLEADING_TRUST_LABEL_RE,TRUTHFUL_TRUST_LABEL);
  }

  function rewriteTrustTextNode(node){
    if(!node||node.nodeType!==3)return false;
    const current=String(node.nodeValue||'');
    const next=truthfulTrustLabel(current);
    if(next===current)return false;
    node.nodeValue=next;
    return true;
  }

  function rewriteTrustLabels(root){
    if(typeof document==='undefined'||!root)return 0;
    let changed=0;
    if(rewriteTrustTextNode(root))changed+=1;
    if(typeof document.createTreeWalker!=='function'||typeof NodeFilter==='undefined')return changed;
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    let node=walker.nextNode();
    while(node){
      if(rewriteTrustTextNode(node))changed+=1;
      node=walker.nextNode();
    }
    return changed;
  }

  function installTruthLabelGuard(){
    if(typeof document==='undefined')return false;
    const rewrite=()=>rewriteTrustLabels(document.body||document.documentElement||document);
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',rewrite,{once:true});
    else rewrite();
    if(typeof MutationObserver==='function'&&document.documentElement){
      const observer=new MutationObserver(records=>{
        records.forEach(record=>{
          if(record.type==='characterData')rewriteTrustTextNode(record.target);
          record.addedNodes?.forEach(node=>rewriteTrustLabels(node));
        });
      });
      observer.observe(document.documentElement,{subtree:true,childList:true,characterData:true});
      window.__MimirP0TruthLabelObserver=observer;
    }
    return true;
  }

  async function fetchJson(url,options={}){
    const requestOptions=sanitizeChatRequestOptions(url,options);
    const controller=new AbortController();
    const timeoutMs=requestOptions.timeoutMs||45000;
    const timeout=setTimeout(()=>controller.abort(),timeoutMs);
    const externalSignal=requestOptions.signal;
    const abortFromExternal=()=>controller.abort();
    if(externalSignal){
      if(externalSignal.aborted)controller.abort();
      else externalSignal.addEventListener('abort',abortFromExternal,{once:true});
    }
    const {timeoutMs:ignored,signal:ignoredSignal,...rest}=requestOptions;
    try{
      const response=await fetch(url,fetchOptions(url,{...rest,signal:controller.signal}));
      let data=null;
      try{data=await response.json();}catch(error){data=null;}
      if(!response.ok){
        const err=new Error(data?.error?.message||('Request failed with '+response.status));
        err.status=response.status;
        err.payload=data;
        throw err;
      }
      return data;
    }finally{
      clearTimeout(timeout);
      if(externalSignal)externalSignal.removeEventListener('abort',abortFromExternal);
    }
  }

  function localNetworkHint(error){
    const message=String(error?.message||error||'');
    if(/local_probe_deferred/i.test(message)){
      return 'Local connector check was deferred. Press Oppdater AI again to allow this browser to check this Mac.';
    }
    if(error?.name==='AbortError')return 'Local connector timed out. Check that MMIR Local Connector and Ollama are running.';
    if(/Failed to fetch|NetworkError|Load failed|blocked|CORS/i.test(message)){
      return 'Browser blocked access to this Mac. Allow Local Network Access for mmir.ai, then press Oppdater AI again. The connector stays on 127.0.0.1.';
    }
    return message||'Local connector is not reachable yet.';
  }

  function allowLocalProbes(reason='p0-local-action',durationMs=60000){
    try{window.MimirAllowLocalProbes?.(reason,durationMs);}catch(error){}
  }

  async function pairLocal(){
    const existing=sessionStorage.getItem(TOKEN_KEY);
    try{
      const data=await fetchJson(LOCAL_URL+'/pair',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:'{}',
        timeoutMs:7000
      });
      if(data?.token){
        sessionStorage.setItem(TOKEN_KEY,data.token);
        return data.token;
      }
    }catch(error){
      if(existing)return existing;
      throw error;
    }
    return existing||'';
  }

  function localHeaders(token){
    const headers={'Content-Type':'application/json'};
    if(token)headers['x-mmir-local-token']=token;
    return headers;
  }

  function hasLocalPairingToken(){
    try{
      return Boolean(sessionStorage.getItem(TOKEN_KEY));
    }catch(error){
      return false;
    }
  }

  function config(){
    const apiUrl=apiUrlForCurrentHost();
    return {
      apiUrl,
      apiLabel:apiHostLabel(apiUrl),
      localUrl:LOCAL_URL,
      chatPath:CHAT_PATH,
      routeScorePath:ROUTE_SCORE_PATH
    };
  }

  window.MimirP0RouteAdapters={
    version,
    PROD_API_URL,
    STAGING_API_URL,
    LOCAL_URL,
    CHAT_PATH,
    ROUTE_SCORE_PATH,
    TOKEN_KEY,
    config,
    apiUrlForCurrentHost,
    apiHostLabel,
    fetchOptions,
    fetchJson,
    messageText,
    isSyntheticDemoAssistant,
    sanitizeSystemMemoryContent,
    sanitizeChatMessages,
    sanitizedChatPayload,
    sanitizeChatRequestOptions,
    jsonByteLength,
    plainChatMessages,
    boundedChatMessageTail,
    hostedLineageEligible,
    normalizedWriterContinuityReceipt,
    truthfulWriterIdentity,
    normalizedWriterContinuityState,
    writerContinuityRequestPlan,
    writerContinuityRequest,
    writerContinuityStatePlanFromResponse,
    writerContinuityStateFromResponse,
    truthfulTrustLabel,
    rewriteTrustLabels,
    installTruthLabelGuard,
    localNetworkHint,
    allowLocalProbes,
    pairLocal,
    hasLocalPairingToken,
    localHeaders
  };
  installTruthLabelGuard();
  window.dispatchEvent(new CustomEvent('mimir-p0-route-adapters-ready',{
    detail:{
      version,
      no_paid_routes_started:true,
      provider_secrets_in_browser:false,
      request_truth_guard:true,
      system_memory_truth_guard:true,
      factual_verification_claimed:false
    }
  }));
})();
