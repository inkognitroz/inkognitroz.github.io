(function(){
  const ACTIVE_WORKSPACE_KEY='mimir-active-workspace-v1';
  const DEFAULT_WORKSPACE_ID='personal';
  const CONVERSATION_PREFIX='mimir-conversations-v1:';
  const ACTIVE_CONVERSATION_PREFIX='mimir-active-conversation-v1:';
  const CONVERSATION_HANDOFF_PREFIX='mimir-conversation-handoff-v1:';
  const MESSAGE_SHARE_PREFIX='mimir-message-share-draft-v1:';

  function workspaceId(bridge){
    return bridge?.workspaceId?.()||localStorage.getItem(ACTIVE_WORKSPACE_KEY)||DEFAULT_WORKSPACE_ID;
  }
  function key(prefix,bridge){return prefix+workspaceId(bridge);}
  function safeId(){return 'conversation-'+Date.now().toString(36)+'-'+Math.random().toString(16).slice(2,7);}
  function readJson(storageKey,fallback){
    try{
      const value=JSON.parse(localStorage.getItem(storageKey)||'null');
      return value ?? fallback;
    }catch(error){
      return fallback;
    }
  }
  function writeJson(storageKey,value){localStorage.setItem(storageKey,JSON.stringify(value));}
  function conversations(bridge){
    const items=readJson(key(CONVERSATION_PREFIX,bridge),[]);
    return Array.isArray(items)?items.filter(item=>item&&item.id&&Array.isArray(item.messages)):[];
  }
  function setActionStatus(bridge,message,text,state){
    bridge?.setMessageActionStatus?.(message.id,text,state||'idle');
  }
  function setStatus(bridge,text,state){
    bridge?.setStatus?.(text,state||'idle');
  }
  function record(bridge,action,message,detail={}){
    bridge?.recordAction?.(action,message,detail);
  }
  function messageCopy(message){
    return {
      id:String(message?.id||safeId()),
      role:message?.role==='user'?'user':'assistant',
      content:String(message?.content||''),
      meta:String(message?.meta||''),
      createdAt:String(message?.createdAt||new Date().toISOString()),
      retryPrompt:typeof message?.retryPrompt==='string'?message.retryPrompt:'',
      model:typeof message?.model==='string'?message.model:'',
      rolePreset:typeof message?.rolePreset==='string'?message.rolePreset:''
    };
  }
  function snapshot(bridge,untilMessage){
    const source=Array.isArray(bridge?.messages?.())?bridge.messages():[];
    const visible=source.filter(message=>(message.role==='user'||message.role==='assistant')&&message.content&&message.content!=='Thinking...');
    const index=untilMessage?visible.findIndex(message=>message.id===untilMessage.id):-1;
    return visible.slice(0,index>=0?index+1:visible.length).map(messageCopy);
  }
  function titleFrom(messages){
    const first=messages.find(message=>message.role==='user'&&String(message.content||'').trim())||messages.find(message=>String(message.content||'').trim());
    return (String(first?.content||'Conversation').replace(/\s+/g,' ').trim().slice(0,64)||'Conversation');
  }
  function saveSnapshot(bridge,messages,prefix){
    if(!messages.length)return null;
    const now=new Date().toISOString();
    const activeKey=key(ACTIVE_CONVERSATION_PREFIX,bridge);
    const id=prefix==='Fork'?safeId():(localStorage.getItem(activeKey)||safeId());
    const items=conversations(bridge);
    const existing=items.find(item=>item.id===id);
    const title=((prefix?prefix+': ':'')+titleFrom(messages)).slice(0,90);
    const next={id,title,messages,pinned:Boolean(existing?.pinned),archived:Boolean(existing?.archived),created_at:existing?.created_at||now,updated_at:now};
    const updated=existing?items.map(item=>item.id===id?next:item):[next,...items];
    localStorage.setItem(activeKey,id);
    writeJson(key(CONVERSATION_PREFIX,bridge),updated.slice(0,80));
    window.dispatchEvent(new CustomEvent('mmir-conversations-updated',{detail:{workspaceId:workspaceId(bridge)}}));
    return next;
  }
  function redactHandoffTitle(value){
    return String(value||'Conversation')
      .replace(/(?:sk|pk|ghp|github_pat|xox[baprs])-?[A-Za-z0-9_=-]{12,}/g,'[redacted token]')
      .replace(/Bearer\s+[A-Za-z0-9._=-]{12,}/gi,'Bearer [redacted]')
      .replace(/\b(api[_ -]?key|password|secret|token)\s*[:=]\s*["']?[^"'\s]{8,}/gi,'$1: [redacted]')
      .slice(0,90);
  }
  function publishConversationHandoff(bridge,saved,action){
    if(!saved)return null;
    const handoff={
      object:'mmir.conversation_handoff',
      version:1,
      workspace_id:workspaceId(bridge),
      conversation_id:saved.id,
      action,
      title:redactHandoffTitle(saved.title),
      message_count:Array.isArray(saved.messages)?saved.messages.length:0,
      next_action:'continue-chat',
      source:'message-action',
      created_at:new Date().toISOString(),
      local_only:true,
      no_paid_routes_started:true,
      public_frontend_secrets_allowed:false,
      raw_prompt_stored:false,
      raw_response_stored:false
    };
    try{writeJson(key(CONVERSATION_HANDOFF_PREFIX,bridge),handoff);}catch(error){}
    window.dispatchEvent(new CustomEvent('mmir-conversation-handoff',{detail:handoff}));
    return handoff;
  }
  function redactShareText(value){
    return String(value||'')
      .replace(/(?:sk|pk|ghp|github_pat|xox[baprs])-?[A-Za-z0-9_=-]{12,}/g,'[redacted token]')
      .replace(/Bearer\s+[A-Za-z0-9._=-]{12,}/gi,'Bearer [redacted]')
      .replace(/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,'[redacted private key]')
      .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,'[redacted email]')
      .replace(/\b(api[_ -]?key|password|secret|token)\s*[:=]\s*["']?[^"'\s]{8,}/gi,'$1: [redacted]')
      .slice(0,16000);
  }
  function save(message,bridge){
    const saved=saveSnapshot(bridge,snapshot(bridge), '');
    if(!saved){
      setActionStatus(bridge,message,'No chat to save yet.','error');
      setStatus(bridge,'No chat to save yet.','error');
      return;
    }
    publishConversationHandoff(bridge,saved,'saved');
    bridge?.openPanel?.('#conversation-manager-panel');
    setActionStatus(bridge,message,'Saved locally as "'+saved.title+'". Continue in Conversations.','ready');
    setStatus(bridge,'Conversation saved locally. Continue from Conversations.','ready');
    record(bridge,'save',message,{conversation_id:saved.id});
  }
  function fork(message,bridge){
    const forked=saveSnapshot(bridge,snapshot(bridge,message),'Fork');
    if(!forked){
      setActionStatus(bridge,message,'No answer to fork yet.','error');
      return;
    }
    bridge?.setMessages?.(forked.messages);
    publishConversationHandoff(bridge,forked,'forked');
    bridge?.openPanel?.('#conversation-manager-panel');
    setActionStatus(bridge,message,'Fork created from this answer. Continue in Conversations.','ready');
    setStatus(bridge,'Fork created from this answer. Continue from Conversations.','ready');
    record(bridge,'fork',message,{conversation_id:forked.id,message_count:forked.messages.length});
  }
  async function shareSafe(message,bridge){
    const items=snapshot(bridge,message);
    const priorUser=[...items].reverse().find(item=>item.role==='user');
    const text=[
      '# MMIR answer share',
      '',
      'Workspace: '+workspaceId(bridge),
      'Shared with browser-local redaction. Review before posting externally.',
      '',
      '## Context',
      redactShareText(priorUser?.content||'No user prompt included in this share.'),
      '',
      '## MMIR',
      redactShareText(message.content)
    ].join('\n');
    const draft={object:'mmir.message_share_draft',version:1,workspace_id:workspaceId(bridge),created_at:new Date().toISOString(),local_only:true,no_paid_routes_started:true,public_frontend_secrets_allowed:false,raw_prompt_stored_in_public_repo:false,raw_response_stored_in_public_repo:false,redaction:'token-like strings, emails, private keys and obvious secret fields are redacted before copy.',text};
    try{writeJson(key(MESSAGE_SHARE_PREFIX,bridge),draft);}catch(error){}
    window.dispatchEvent(new CustomEvent('mmir-message-share-draft-updated',{detail:{workspaceId:workspaceId(bridge)}}));
    try{
      await navigator.clipboard.writeText(text);
      setActionStatus(bridge,message,'Safe share copied with local redaction.','ready');
      setStatus(bridge,'Safe share copied. Review before posting.','ready');
    }catch(error){
      setActionStatus(bridge,message,'Safe share draft stored locally; clipboard was blocked.','ready');
      setStatus(bridge,'Safe share draft stored locally.','ready');
    }
    bridge?.openPanel?.('#sharing-center');
    record(bridge,'share-safe',message,{redacted:true});
  }
  function nextStep(message,bridge){
    if(!bridge?.hasUsableLiveModel?.()){
      bridge?.openModelPicker?.();
      setActionStatus(bridge,message,'Next step opened: choose a free local/browser model.','ready');
      setStatus(bridge,'Choose a free model route next.','ready');
      record(bridge,'next-step',message,{target:'#model-library'});
      return;
    }
    const saved=saveSnapshot(bridge,snapshot(bridge), '');
    publishConversationHandoff(bridge,saved,'saved');
    bridge?.openPanel?.('#conversation-manager-panel');
    setActionStatus(bridge,message,'Next step opened: saved chat and ready for memory/workspace follow-up.','ready');
    setStatus(bridge,'Chat saved. Add memory, knowledge or a workflow next.','ready');
    record(bridge,'next-step',message,{target:'#conversation-manager-panel',conversation_id:saved?.id||''});
  }
  function run(action,message,bridge){
    if(action==='save')return save(message,bridge);
    if(action==='fork')return fork(message,bridge);
    if(action==='share-safe')return shareSafe(message,bridge);
    if(action==='next-step')return nextStep(message,bridge);
    return null;
  }

  window.MimirMessageActions={run,redactShareText};
})();
