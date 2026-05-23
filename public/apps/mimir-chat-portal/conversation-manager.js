(function(){
  const ACTIVE_WORKSPACE_KEY='mimir-active-workspace-v1';
  const DEFAULT_WORKSPACE_ID='personal';
  const CHAT_KEY='mimir-chat-current-session-v1';
  const CONVERSATION_PREFIX='mimir-conversations-v1:';
  const ACTIVE_CONVERSATION_PREFIX='mimir-active-conversation-v1:';
  const CONVERSATION_HANDOFF_PREFIX='mimir-conversation-handoff-v1:';
  const MEMORY_PREFIX='mimir-memory-v1:';
  const KNOWLEDGE_PREFIX='mimir-knowledge-v1:';
  const COLLECTIONS_PREFIX='mimir-knowledge-collections-v1:';
  const SAVED_CHAT_PROMOTION_PREFIX='mimir-saved-chat-promotion-v1:';
  const host=document.querySelector('#multi-model-workspace .mimir-dashboard');
  let titleEl=null;
  let searchEl=null;
  let archivedEl=null;
  let handoffEl=null;
  let listEl=null;
  let statusEl=null;

  if(!host)return;

  function workspaceId(){return localStorage.getItem(ACTIVE_WORKSPACE_KEY)||DEFAULT_WORKSPACE_ID;}
  function conversationKey(){return CONVERSATION_PREFIX+workspaceId();}
  function activeConversationKey(){return ACTIVE_CONVERSATION_PREFIX+workspaceId();}
  function handoffKey(){return CONVERSATION_HANDOFF_PREFIX+workspaceId();}
  function memoryKey(){return MEMORY_PREFIX+workspaceId();}
  function knowledgeKey(){return KNOWLEDGE_PREFIX+workspaceId();}
  function collectionsKey(){return COLLECTIONS_PREFIX+workspaceId();}
  function promotionKey(){return SAVED_CHAT_PROMOTION_PREFIX+workspaceId();}
  function chatStorageKey(){return CHAT_KEY+':'+workspaceId();}
  function safeId(){return 'conversation-'+Date.now().toString(36)+'-'+Math.random().toString(16).slice(2,7);}

  function readJson(key,fallback){
    try{
      const value=JSON.parse(localStorage.getItem(key)||'null');
      return value ?? fallback;
    }catch(error){
      return fallback;
    }
  }

  function writeJson(key,value){
    localStorage.setItem(key,JSON.stringify(value));
  }

  function readMessages(){
    const scoped=readJson(chatStorageKey(),null);
    const legacy=workspaceId()===DEFAULT_WORKSPACE_ID?readJson(CHAT_KEY,[]):[];
    return Array.isArray(scoped)?scoped:(Array.isArray(legacy)?legacy:[]);
  }

  function writeMessages(messages){
    writeJson(chatStorageKey(),Array.isArray(messages)?messages:[]);
    window.dispatchEvent(new CustomEvent('mmir-workspace-changed',{detail:{id:workspaceId()}}));
    window.dispatchEvent(new CustomEvent('mmir-chat-history-updated',{detail:{workspaceId:workspaceId()}}));
  }

  function readConversations(){
    const items=readJson(conversationKey(),[]);
    return Array.isArray(items)?items.filter(item=>item&&item.id&&Array.isArray(item.messages)):[];
  }

  function saveConversations(items){
    writeJson(conversationKey(),items.slice(0,80));
    window.dispatchEvent(new CustomEvent('mmir-conversations-updated',{detail:{workspaceId:workspaceId()}}));
  }

  function setStatus(message,state){
    if(statusEl){
      statusEl.textContent=message||'';
      statusEl.dataset.state=state||'idle';
    }
  }

  function titleFromMessages(messages){
    const first=messages.find(message=>message?.role==='user'&&String(message.content||'').trim())||
      messages.find(message=>String(message?.content||'').trim());
    const value=String(first?.content||'Conversation').replace(/\s+/g,' ').trim();
    return value.slice(0,64)||'Conversation';
  }

  function activeConversationId(){
    return localStorage.getItem(activeConversationKey())||'';
  }

  function openPanel(target){
    const targetEl=document.querySelector(target);
    if(targetEl){
      let details=targetEl;
      while(details){
        if('open' in details)details.open=true;
        details=details.parentElement?.closest?.('details')||null;
      }
      targetEl.scrollIntoView({block:'start',behavior:'smooth'});
      return;
    }
    if(window.MimirLoadDeferred)window.MimirLoadDeferred().then(()=>openPanel(target));
  }

  function readHandoff(){
    const handoff=readJson(handoffKey(),null);
    if(!handoff||handoff.workspace_id!==workspaceId()||!handoff.conversation_id)return null;
    return handoff;
  }

  function activeHandoff(){
    const handoff=readHandoff();
    if(!handoff)return null;
    return readConversations().some(item=>item.id===handoff.conversation_id)?handoff:null;
  }

  function clearHandoff(){
    localStorage.removeItem(handoffKey());
  }

  function handoffLabel(action){
    return action==='forked'?'Fork ready':'Saved locally';
  }

  function button(action,label){
    const element=document.createElement('button');
    element.type='button';
    element.dataset.handoffAction=action;
    element.textContent=label;
    return element;
  }

  function redactedText(value,max=900){
    return String(value||'')
      .replace(/(?:sk|pk|ghp|github_pat|xox[baprs])-?[A-Za-z0-9_=-]{12,}/g,'[redacted token]')
      .replace(/Bearer\s+[A-Za-z0-9._=-]{12,}/gi,'Bearer [redacted]')
      .replace(/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,'[redacted private key]')
      .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,'[redacted email]')
      .replace(/\b(api[_ -]?key|password|secret|token)\s*[:=]\s*["']?[^"'\s]{8,}/gi,'$1: [redacted]')
      .replace(/\s+/g,' ')
      .trim()
      .slice(0,max);
  }

  function readArray(key){
    const value=readJson(key,[]);
    return Array.isArray(value)?value:[];
  }

  function writePromotion(target,item,conversation){
    const promotion={
      object:'mmir.saved_chat_promotion',
      version:1,
      workspace_id:workspaceId(),
      conversation_id:conversation.id,
      target,
      item_id:item.id,
      source:'conversation-handoff',
      message_count:Array.isArray(conversation.messages)?conversation.messages.length:0,
      created_at:new Date().toISOString(),
      local_only:true,
      no_paid_routes_started:true,
      public_frontend_secrets_allowed:false,
      raw_prompt_stored_in_public_repo:false,
      raw_response_stored_in_public_repo:false
    };
    writeJson(promotionKey(),promotion);
    window.dispatchEvent(new CustomEvent('mmir-saved-chat-promoted',{detail:promotion}));
    return promotion;
  }

  function conversationSummary(item){
    const messages=Array.isArray(item?.messages)?item.messages:[];
    const firstUser=messages.find(message=>message.role==='user'&&String(message.content||'').trim());
    const lastAssistant=messages.slice().reverse().find(message=>message.role==='assistant'&&String(message.content||'').trim());
    const title=redactedText(item?.title||'Saved chat',160);
    const useful=redactedText(lastAssistant?.content||firstUser?.content||title,620);
    return {title,useful,messageCount:messages.length};
  }

  function promoteToMemory(id){
    const conversation=readConversations().find(entry=>entry.id===id);
    if(!conversation)return;
    const summary=conversationSummary(conversation);
    const items=readArray(memoryKey());
    const now=new Date().toISOString();
    const item={
      id:String(Date.now())+'-'+Math.random().toString(16).slice(2),
      backendId:'',
      text:'Saved chat: '+summary.title+' - '+summary.useful,
      type:'project',
      scope:'workspace',
      tags:['conversation','handoff'],
      expiresAt:'',
      notes:'Created locally from a saved chat. Review before any backend sync.',
      source:'conversation-handoff',
      enabled:true,
      createdAt:now,
      updatedAt:now,
      syncState:'local',
      syncError:''
    };
    writeJson(memoryKey(),items.concat(item).slice(-20));
    writePromotion('memory',item,conversation);
    window.dispatchEvent(new CustomEvent('mmir-memory-updated',{detail:{workspaceId:workspaceId(),source:'conversation-handoff',id:item.id}}));
    openPanel('#memory-panel');
    setStatus('Saved chat promoted to local memory. Review it in Memory.','ready');
  }

  function collectionId(name){
    return String(name||'General').normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')||'general';
  }

  function ensureSavedChatCollection(){
    const id='saved-chats';
    const items=readArray(collectionsKey());
    const existing=items.find(item=>item.id===id);
    if(existing)return existing;
    const collection={id,name:'Saved chats',enabled:true,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
    writeJson(collectionsKey(),items.concat(collection));
    window.dispatchEvent(new CustomEvent('mmir-knowledge-collections-updated',{detail:{workspaceId:workspaceId()}}));
    return collection;
  }

  function promoteToKnowledge(id){
    const conversation=readConversations().find(entry=>entry.id===id);
    if(!conversation)return;
    const summary=conversationSummary(conversation);
    const collection=ensureSavedChatCollection();
    const text=[
      '# '+summary.title,
      '',
      'Source: saved MMIR conversation',
      'Messages: '+String(summary.messageCount),
      'Stored locally first. Review before backend indexing.',
      '',
      '## Useful context',
      summary.useful
    ].join('\n');
    const item={
      id:String(Date.now())+'-'+Math.random().toString(16).slice(2),
      name:'Saved chat - '+summary.title.slice(0,70),
      type:'text/markdown',
      size:text.length,
      collection_id:collectionId(collection.id),
      collection:collection.name,
      text,
      preview:summary.useful.slice(0,240),
      sync:'local-only',
      source:'conversation-handoff',
      createdAt:new Date().toISOString()
    };
    writeJson(knowledgeKey(),readArray(knowledgeKey()).concat(item).slice(-10));
    writePromotion('knowledge',item,conversation);
    window.dispatchEvent(new CustomEvent('mmir-knowledge-updated',{detail:{workspaceId:workspaceId(),source:'conversation-handoff',id:item.id}}));
    openPanel('#knowledge-panel');
    setStatus('Saved chat promoted to local knowledge. Review it in Knowledge.','ready');
  }

  function saveCurrentConversation(){
    const messages=readMessages();
    if(!messages.length){setStatus('No current chat to save yet.','error');return;}
    const now=new Date().toISOString();
    const id=activeConversationId()||safeId();
    const title=String(titleEl?.value||'').trim()||titleFromMessages(messages);
    const items=readConversations();
    const existing=items.find(item=>item.id===id);
    const next={
      id,
      title,
      messages,
      pinned:Boolean(existing?.pinned),
      archived:Boolean(existing?.archived),
      created_at:existing?.created_at||now,
      updated_at:now
    };
    const updated=existing?items.map(item=>item.id===id?next:item):[next,...items];
    localStorage.setItem(activeConversationKey(),id);
    saveConversations(updated);
    if(titleEl)titleEl.value=title;
    render();
    setStatus('Conversation saved.','ready');
  }

  function clearCurrentChat(){
    localStorage.removeItem(activeConversationKey());
    writeMessages([]);
    if(titleEl)titleEl.value='';
    render();
    setStatus('New local chat started.','ready');
  }

  function loadConversation(id){
    const item=readConversations().find(entry=>entry.id===id);
    if(!item)return;
    localStorage.setItem(activeConversationKey(),id);
    writeMessages(item.messages);
    if(titleEl)titleEl.value=item.title||'Conversation';
    render();
    setStatus('Conversation loaded.','ready');
  }

  function forkConversation(id){
    const item=readConversations().find(entry=>entry.id===id);
    if(!item)return;
    const now=new Date().toISOString();
    const fork={...item,id:safeId(),title:'Fork of '+(item.title||'Conversation'),pinned:false,archived:false,created_at:now,updated_at:now};
    saveConversations([fork,...readConversations()]);
    localStorage.setItem(activeConversationKey(),fork.id);
    writeMessages(fork.messages);
    if(titleEl)titleEl.value=fork.title;
    render();
    setStatus('Conversation forked.','ready');
  }

  function renderHandoff(){
    if(!handoffEl)return;
    const handoff=activeHandoff();
    handoffEl.replaceChildren();
    if(!handoff){
      handoffEl.hidden=true;
      return;
    }
    handoffEl.hidden=false;
    const item=readConversations().find(entry=>entry.id===handoff.conversation_id);
    const body=document.createElement('div');
    const eyebrow=document.createElement('span');
    eyebrow.textContent=handoffLabel(handoff.action);
    const title=document.createElement('strong');
    title.textContent=handoff.title||'Conversation';
    const meta=document.createElement('small');
    meta.textContent=String(handoff.message_count||item?.messages?.length||0)+' messages - next: continue chat';
    body.append(eyebrow,title,meta);
    const actions=document.createElement('div');
    actions.className='conversation-handoff-actions';
    actions.append(
      button('continue','Continue chat'),
      button('memory','Add memory'),
      button('knowledge','Add knowledge'),
      button('rename','Rename'),
      button('share','Safe share'),
      button('dismiss','Dismiss')
    );
    handoffEl.append(body,actions);
  }

  function toggleField(id,field){
    const items=readConversations().map(item=>item.id===id?{...item,[field]:!item[field],updated_at:new Date().toISOString()}:item);
    saveConversations(items);
    render();
    setStatus(field==='pinned'?'Pin state updated.':'Archive state updated.','ready');
  }

  function exportConversation(id){
    const item=readConversations().find(entry=>entry.id===id);
    if(!item)return;
    const blob=new Blob([JSON.stringify({exported_at:new Date().toISOString(),workspace_id:workspaceId(),conversation:item},null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const link=document.createElement('a');
    link.href=url;
    link.download='mmir-conversation-'+id+'.json';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setStatus('Conversation exported.','ready');
  }

  function redact(value){
    return String(value||'')
      .replace(/(?:sk|pk|ghp|github_pat|xox[baprs])-?[A-Za-z0-9_=-]{12,}/g,'[redacted token]')
      .replace(/Bearer\s+[A-Za-z0-9._=-]{12,}/gi,'Bearer [redacted]')
      .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,'[redacted email]');
  }

  async function safeShare(id){
    const item=readConversations().find(entry=>entry.id===id);
    if(!item)return;
    const lines=[
      '# MMIR conversation share',
      '',
      'Workspace: '+workspaceId(),
      'Title: '+redact(item.title||'Conversation'),
      'Shared with local redaction. Review before posting publicly.',
      ''
    ];
    item.messages.slice(-24).forEach(message=>{
      lines.push('## '+(message.role==='user'?'User':'MMIR'));
      lines.push(redact(message.content||''));
      lines.push('');
    });
    try{
      await navigator.clipboard.writeText(lines.join('\n'));
      setStatus('Safe-share text copied. Review before posting.','ready');
    }catch(error){
      setStatus('Clipboard blocked. Export JSON instead.','error');
    }
  }

  function matchesSearch(item,query){
    if(!query)return true;
    const haystack=[item.title].concat(item.messages.map(message=>message.content)).join(' ').toLowerCase();
    return haystack.includes(query.toLowerCase());
  }

  function sortedConversations(){
    const query=String(searchEl?.value||'').trim();
    const showArchived=archivedEl?.checked===true;
    return readConversations()
      .filter(item=>showArchived||!item.archived)
      .filter(item=>matchesSearch(item,query))
      .sort((a,b)=>Number(Boolean(b.pinned))-Number(Boolean(a.pinned))||String(b.updated_at||'').localeCompare(String(a.updated_at||'')));
  }

  function render(){
    if(!listEl)return;
    renderHandoff();
    const items=sortedConversations();
    const activeId=activeConversationId();
    const handoff=activeHandoff();
    if(titleEl&&!titleEl.value){
      const active=readConversations().find(item=>item.id===activeId);
      if(active)titleEl.value=active.title||'';
    }
    listEl.innerHTML='';
    if(!items.length){
      listEl.innerHTML='<p class="empty-backends">No saved conversations match this view.</p>';
      return;
    }
    items.forEach(item=>{
      const article=document.createElement('article');
      article.className='conversation-item '+(item.id===activeId?'is-active ':'')+(handoff?.conversation_id===item.id?'is-handoff':'');
      const body=document.createElement('div');
      const title=document.createElement('strong');
      title.textContent=(item.pinned?'Pinned: ':'')+(item.title||'Conversation');
      const meta=document.createElement('small');
      meta.textContent=String(item.messages.length)+' messages - '+(item.archived?'archived':'active')+' - '+String(item.updated_at||'').slice(0,10);
      body.append(title,meta);
      if(item.id===activeId||handoff?.conversation_id===item.id){
        const badges=document.createElement('span');
        badges.className='conversation-badges';
        if(item.id===activeId){
          const badge=document.createElement('em');
          badge.textContent='Active';
          badges.appendChild(badge);
        }
        if(handoff?.conversation_id===item.id){
          const badge=document.createElement('em');
          badge.textContent=handoff.action==='forked'?'Just forked':'Just saved';
          badges.appendChild(badge);
        }
        body.appendChild(badges);
      }
      const actions=document.createElement('div');
      actions.className='conversation-actions';
      [
        ['load',item.id===activeId?'Continue':'Load'],
        ['pin',item.pinned?'Unpin':'Pin'],
        ['archive',item.archived?'Restore':'Archive'],
        ['fork','Fork'],
        ['export','Export'],
        ['share','Safe share']
      ].forEach(([action,label])=>{
        const button=document.createElement('button');
        button.type='button';
        button.dataset.conversationAction=action;
        button.dataset.id=item.id;
        button.textContent=label;
        actions.appendChild(button);
      });
      article.append(body,actions);
      listEl.appendChild(article);
    });
  }

  function handleAction(event){
    const button=event.target?.closest?.('[data-conversation-action]');
    if(!button)return;
    const id=button.dataset.id||'';
    const action=button.dataset.conversationAction;
    if(action==='load')loadConversation(id);
    if(action==='pin')toggleField(id,'pinned');
    if(action==='archive')toggleField(id,'archived');
    if(action==='fork')forkConversation(id);
    if(action==='export')exportConversation(id);
    if(action==='share')safeShare(id);
  }

  function handleHandoffAction(event){
    const control=event.target?.closest?.('[data-handoff-action]');
    if(!control)return;
    const handoff=activeHandoff();
    const id=handoff?.conversation_id||activeConversationId();
    const action=control.dataset.handoffAction;
    if(action==='continue')loadConversation(id);
    if(action==='memory')promoteToMemory(id);
    if(action==='knowledge')promoteToKnowledge(id);
    if(action==='rename'){
      const item=readConversations().find(entry=>entry.id===id);
      if(titleEl){
        titleEl.value=item?.title||handoff?.title||'Conversation';
        titleEl.focus();
        titleEl.select?.();
      }
      setStatus('Rename the saved chat, then press Save / rename.','ready');
    }
    if(action==='share')safeShare(id);
    if(action==='dismiss'){
      clearHandoff();
      render();
      setStatus('Conversation handoff hidden. Saved chat remains in the list.','idle');
    }
  }

  function receiveHandoff(event){
    const handoff=event.detail||{};
    if(handoff.workspace_id&&handoff.workspace_id!==workspaceId())return;
    if(handoff.conversation_id){
      try{writeJson(handoffKey(),handoff);}catch(error){}
      if(searchEl)searchEl.value='';
      if(archivedEl)archivedEl.checked=false;
      const panel=document.getElementById('conversation-manager-panel');
      if(panel)panel.open=true;
      render();
      setStatus((handoff.action==='forked'?'Fork':'Saved chat')+' is ready to continue.','ready');
    }
  }

  window.MimirConversationManager={
    promoteSavedChat(id,target){
      if(target==='knowledge')return promoteToKnowledge(id);
      return promoteToMemory(id);
    },
    refresh:render
  };

  function install(){
    if(document.getElementById('conversation-manager-panel'))return;
    const details=document.createElement('details');
    details.id='conversation-manager-panel';
    details.className='model-catalog-hint conversation-manager-panel';
    details.innerHTML=''+
      '<summary>+ Conversations</summary>'+
      '<div class="conversation-manager-body">'+
        '<div class="conversation-save-row">'+
          '<label for="conversation-title">Title<input id="conversation-title" type="text" maxlength="80" placeholder="Conversation title" /></label>'+
          '<button id="conversation-save" type="button">Save / rename</button>'+
          '<button id="conversation-new" type="button">New chat</button>'+
        '</div>'+
        '<div class="conversation-filter-row">'+
          '<label for="conversation-search">Search<input id="conversation-search" type="search" placeholder="Search saved chats" /></label>'+
          '<label class="conversation-archive-toggle"><input id="conversation-show-archived" type="checkbox" /> Show archived</label>'+
        '</div>'+
        '<p id="conversation-status" class="dashboard-note" data-state="idle" aria-live="polite"></p>'+
        '<div id="conversation-handoff" class="conversation-handoff" aria-live="polite" hidden></div>'+
        '<div id="conversation-list" class="conversation-list" aria-live="polite"></div>'+
      '</div>';
    host.appendChild(details);
    titleEl=document.getElementById('conversation-title');
    searchEl=document.getElementById('conversation-search');
    archivedEl=document.getElementById('conversation-show-archived');
    handoffEl=document.getElementById('conversation-handoff');
    listEl=document.getElementById('conversation-list');
    statusEl=document.getElementById('conversation-status');
    document.getElementById('conversation-save')?.addEventListener('click',saveCurrentConversation);
    document.getElementById('conversation-new')?.addEventListener('click',clearCurrentChat);
    searchEl?.addEventListener('input',render);
    archivedEl?.addEventListener('change',render);
    listEl?.addEventListener('click',handleAction);
    handoffEl?.addEventListener('click',handleHandoffAction);
    render();
  }

  window.addEventListener('mmir-chat-history-updated',render);
  window.addEventListener('mmir-workspace-changed',()=>{if(titleEl)titleEl.value='';render();});
  window.addEventListener('mmir-conversations-updated',render);
  window.addEventListener('mmir-conversation-handoff',receiveHandoff);
  window.addEventListener('storage',render);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
