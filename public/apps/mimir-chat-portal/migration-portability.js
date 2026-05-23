(function(){
  const ACTIVE_WORKSPACE_KEY='mimir-active-workspace-v1';
  const DEFAULT_WORKSPACE_ID='personal';
  const CONVERSATION_PREFIX='mimir-conversations-v1:';
  const PROMPT_PREFIX='mimir-prompts-v1:';
  const KNOWLEDGE_PREFIX='mimir-knowledge-v1:';
  const COLLECTIONS_PREFIX='mimir-knowledge-collections-v1:';
  const PROFILE_KEY='mimir-chat-backend-profiles';
  const MAX_FILE_BYTES=2*1024*1024;
  const root=document.getElementById('migration-portability-root');
  let fileEl=null;
  let statusEl=null;
  let previewEl=null;
  let parsedPlan=null;

  if(!root)return;

  function workspaceId(){return localStorage.getItem(ACTIVE_WORKSPACE_KEY)||DEFAULT_WORKSPACE_ID;}
  function safe(value){return String(value||'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));}
  function clean(value,max=4000){return String(value||'').trim().slice(0,max);}
  function setStatus(message,state){if(statusEl){statusEl.textContent=message||'';statusEl.dataset.state=state||'idle';}}
  function readJson(key,fallback){try{const value=JSON.parse(localStorage.getItem(key)||'null');return value??fallback;}catch(error){return fallback;}}
  function writeJson(key,value){localStorage.setItem(key,JSON.stringify(value));}
  function array(value){return Array.isArray(value)?value:[];}
  function now(){return new Date().toISOString();}

  function redactSecretLike(value){
    return String(value||'').replace(/(sk-[A-Za-z0-9_-]{20,}|ghp_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,}|AKIA[0-9A-Z]{16}|Bearer\s+[A-Za-z0-9._-]{20,}|-----BEGIN [A-Z ]*PRIVATE KEY-----)/g,'[redacted-secret]');
  }

  function redactedClone(value){
    try{
      return JSON.parse(JSON.stringify(value,(key,entry)=>typeof entry==='string'?redactSecretLike(entry):entry));
    }catch(error){
      return null;
    }
  }

  function normalizeMessage(message){
    const role=clean(message?.role||message?.author?.role||message?.from||'user',32).toLowerCase();
    const content=message?.content?.parts?.join('\n\n')||message?.content?.text||message?.text||message?.content||message?.message||'';
    const cleanRole=['system','user','assistant','tool'].includes(role)?role:(role.includes('assistant')?'assistant':'user');
    const text=redactSecretLike(clean(content,20000));
    if(!text)return null;
    return {role:cleanRole,content:text,created_at:message?.created_at||message?.timestamp||now()};
  }

  function chatGptMessages(conversation){
    const mapping=conversation?.mapping&&typeof conversation.mapping==='object'?conversation.mapping:{};
    const nodes=Object.values(mapping).filter(Boolean);
    return nodes.map((node)=>normalizeMessage(node.message||node)).filter(Boolean);
  }

  function openWebUiMessages(chat){
    const source=array(chat?.chat?.messages).length?chat.chat.messages:array(chat?.messages);
    return source.map(normalizeMessage).filter(Boolean);
  }

  function mmirMessages(item){
    const source=array(item?.messages).length?item.messages:array(item?.chat);
    return source.map(normalizeMessage).filter(Boolean);
  }

  function conversation(id,title,messages,source){
    return {
      id:'imported-'+source+'-'+id+'-'+Date.now(),
      title:clean(title||'Imported chat',140)||'Imported chat',
      messages:messages.slice(0,200),
      source,
      pinned:false,
      archived:false,
      created_at:now(),
      updated_at:now()
    };
  }

  function detectAndNormalize(data){
    const conversations=[];
    const prompts=[];
    const knowledge=[];
    const collections=[];
    let source='unknown';

    if(data?.object==='mmir.portable_workspace'||data?.source==='mmir-portable-v1'||data?.workspace){
      source='mmir';
      array(data.conversations).forEach((item,index)=>{
        const messages=mmirMessages(item);
        if(messages.length)conversations.push(conversation(index,item.title||item.name,messages,source));
      });
      array(data.prompts).forEach((item,index)=>prompts.push({
        id:'imported-prompt-'+index+'-'+Date.now(),
        title:clean(item.title||item.name||'Imported prompt',140),
        body:redactSecretLike(clean(item.body||item.prompt||item.content||'',12000)),
        tags:array(item.tags).map((tag)=>clean(tag,32)).filter(Boolean),
        created_at:now(),
        updated_at:now(),
        source:'mmir-import'
      }));
      array(data.knowledge).forEach((item,index)=>{
        const text=redactSecretLike(clean(item.text||array(item.chunks).map((chunk)=>chunk.text).join('\n\n'),20000));
        if(text)knowledge.push({id:'imported-knowledge-'+index+'-'+Date.now(),name:clean(item.name||item.title||'Imported knowledge',160),type:clean(item.type||'text/markdown',80),collection_id:clean(item.collection_id||'imported',80),text,created_at:now()});
      });
      array(data.knowledge_collections).forEach((item,index)=>collections.push({id:clean(item.id||'imported-'+index,80),name:clean(item.name||'Imported',80),enabled:item.enabled!==false,created_at:now()}));
    }else if(Array.isArray(data)&&data.some((item)=>item?.mapping)){
      source='chatgpt';
      data.forEach((item,index)=>{
        const messages=chatGptMessages(item);
        if(messages.length)conversations.push(conversation(index,item.title,messages,source));
      });
    }else if(data?.conversations&&Array.isArray(data.conversations)){
      source='chatgpt';
      data.conversations.forEach((item,index)=>{
        const messages=item?.mapping?chatGptMessages(item):mmirMessages(item);
        if(messages.length)conversations.push(conversation(index,item.title,messages,source));
      });
    }else if(Array.isArray(data)&&data.some((item)=>item?.chat?.messages||item?.messages)){
      source='open-webui';
      data.forEach((item,index)=>{
        const messages=openWebUiMessages(item);
        if(messages.length)conversations.push(conversation(index,item.title||item.chat?.title,messages,source));
      });
    }else if(data?.chats&&Array.isArray(data.chats)){
      source='open-webui';
      data.chats.forEach((item,index)=>{
        const messages=openWebUiMessages(item);
        if(messages.length)conversations.push(conversation(index,item.title||item.chat?.title,messages,source));
      });
    }else if(data?.messages&&Array.isArray(data.messages)){
      source='generic-chat-json';
      const messages=openWebUiMessages(data);
      if(messages.length)conversations.push(conversation(0,data.title,messages,source));
    }

    return {source,conversations,prompts,knowledge,collections,detected_at:now()};
  }

  function exportPortable(){
    const id=workspaceId();
    const conversations=readJson(CONVERSATION_PREFIX+id,[]);
    const prompts=readJson(PROMPT_PREFIX+id,[]);
    const knowledge=readJson(KNOWLEDGE_PREFIX+id,[]);
    const collections=readJson(COLLECTIONS_PREFIX+id,[]);
    const profiles=array(readJson(PROFILE_KEY,[])).map((profile)=>({
      id:profile.id,
      name:profile.name,
      provider:profile.provider,
      url:profile.url,
      models:profile.models,
      health:profile.health,
      key_ref:profile.keyRef||profile.key_ref||'server-side/local only'
    }));
    const safeConversations=array(redactedClone(conversations));
    const safePrompts=array(redactedClone(prompts));
    const safeKnowledge=array(redactedClone(knowledge));
    const safeCollections=array(redactedClone(collections));
    const safeProfiles=array(redactedClone(profiles));
    const data={
      object:'mmir.portable_workspace',
      source:'mmir-portable-v1',
      exported_at:now(),
      workspace:{id},
      local_only:true,
      public_frontend_secrets_allowed:false,
      excludes:['pairing tokens','OAuth refresh tokens','provider API keys','billing approval','raw backend secrets'],
      conversations:safeConversations,
      prompts:safePrompts,
      knowledge:safeKnowledge,
      knowledge_collections:safeCollections,
      backend_profiles:safeProfiles,
      open_webui_preview:{
        chats:safeConversations.map((item)=>({
          title:item.title||'MMIR chat',
          chat:{messages:array(item.messages).map((message)=>({role:message.role,content:message.content}))}
        }))
      }
    };
    download('mmir-'+id+'-portable-workspace.json',data);
    setStatus('Portable workspace exported. Secrets, pairing tokens and paid approvals are excluded.','ready');
  }

  function download(name,data){
    const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const link=document.createElement('a');
    link.href=url;
    link.download=name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function analyzeFile(){
    const file=fileEl?.files?.[0];
    if(!file){setStatus('Choose a ChatGPT, Open WebUI or MMIR JSON export first.','error');return;}
    if(file.size>MAX_FILE_BYTES){setStatus('Import file is too large for browser-local migration. Keep it under 2 MB.','error');return;}
    try{
      const text=await file.text();
      const data=JSON.parse(text);
      parsedPlan=detectAndNormalize(data);
      renderPreview();
      setStatus('Import analyzed as '+parsedPlan.source+'. Review counts, then import selected data locally.','ready');
    }catch(error){
      parsedPlan=null;
      renderPreview();
      setStatus('Could not parse JSON export.','error');
    }
  }

  function renderPreview(){
    if(!previewEl)return;
    if(!parsedPlan){
      previewEl.innerHTML='<p class="dashboard-note">No import analyzed yet.</p>';
      return;
    }
    previewEl.innerHTML=''+
      '<article class="migration-preview-card"><strong>'+safe(parsedPlan.source)+'</strong><span>Detected source</span></article>'+
      '<article class="migration-preview-card"><strong>'+safe(parsedPlan.conversations.length)+'</strong><span>Conversations</span></article>'+
      '<article class="migration-preview-card"><strong>'+safe(parsedPlan.prompts.length)+'</strong><span>Prompts</span></article>'+
      '<article class="migration-preview-card"><strong>'+safe(parsedPlan.knowledge.length)+'</strong><span>Knowledge items</span></article>';
  }

  function mergeByTitle(existing,incoming){
    const seen=new Set(existing.map((item)=>String(item.title||item.name||item.id||'').toLowerCase()));
    const merged=existing.slice();
    incoming.forEach((item)=>{
      const key=String(item.title||item.name||item.id||'').toLowerCase();
      if(!seen.has(key)){seen.add(key);merged.push(item);}
    });
    return merged.slice(-200);
  }

  function importSelected(){
    if(!parsedPlan){setStatus('Analyze an export before importing.','error');return;}
    const id=workspaceId();
    const existingConversations=array(readJson(CONVERSATION_PREFIX+id,[]));
    const existingPrompts=array(readJson(PROMPT_PREFIX+id,[]));
    const existingKnowledge=array(readJson(KNOWLEDGE_PREFIX+id,[]));
    const existingCollections=array(readJson(COLLECTIONS_PREFIX+id,[]));
    if(parsedPlan.conversations.length)writeJson(CONVERSATION_PREFIX+id,mergeByTitle(existingConversations,parsedPlan.conversations));
    if(parsedPlan.prompts.length)writeJson(PROMPT_PREFIX+id,mergeByTitle(existingPrompts,parsedPlan.prompts));
    if(parsedPlan.knowledge.length)writeJson(KNOWLEDGE_PREFIX+id,mergeByTitle(existingKnowledge,parsedPlan.knowledge));
    if(parsedPlan.collections.length)writeJson(COLLECTIONS_PREFIX+id,mergeByTitle(existingCollections,parsedPlan.collections));
    window.dispatchEvent(new CustomEvent('mmir-chat-history-updated',{detail:{workspaceId:id}}));
    window.dispatchEvent(new CustomEvent('mmir-knowledge-updated',{detail:{workspaceId:id}}));
    window.dispatchEvent(new CustomEvent('mmir-knowledge-collections-updated',{detail:{workspaceId:id}}));
    window.dispatchEvent(new CustomEvent('mmir-prompts-updated',{detail:{workspaceId:id}}));
    setStatus('Imported locally: '+parsedPlan.conversations.length+' chats, '+parsedPlan.prompts.length+' prompts, '+parsedPlan.knowledge.length+' knowledge items.','ready');
  }

  function sendSummaryToChat(){
    const prompt=document.getElementById('mimir-prompt');
    const send=document.getElementById('primary-chat-link');
    if(!prompt||!send)return;
    const plan=parsedPlan||{source:'none',conversations:[],prompts:[],knowledge:[]};
    prompt.value='Review this migration plan for MMIR: source '+plan.source+', conversations '+plan.conversations.length+', prompts '+plan.prompts.length+', knowledge items '+plan.knowledge.length+'. Suggest safe next steps without asking for API keys or paid services.';
    prompt.dispatchEvent(new Event('input',{bubbles:true}));
    send.click();
  }

  function install(){
    root.innerHTML=''+
      '<div class="migration-toolbar">'+
        '<div><strong>Portable workspace migration</strong><span>Export MMIR data or import ChatGPT/Open WebUI-style JSON into local workspace storage.</span></div>'+
        '<button id="migration-export" type="button">Export MMIR JSON</button>'+
      '</div>'+
      '<div class="migration-import-row">'+
        '<label for="migration-file">Import JSON<input id="migration-file" type="file" accept=".json,application/json" /></label>'+
        '<button id="migration-analyze" type="button">Analyze import</button>'+
        '<button id="migration-import" type="button">Import locally</button>'+
        '<button id="migration-send-chat" type="button">Send plan to chat</button>'+
      '</div>'+
      '<div class="migration-policy-grid">'+
        '<article><strong>Free/local</strong><span>Parsing and conversion happen in this browser.</span></article>'+
        '<article><strong>Secret-aware</strong><span>Token-like strings are redacted before import/export handoff.</span></article>'+
        '<article><strong>No lock-in</strong><span>MMIR exports a portable JSON bundle and an Open WebUI-style chat preview.</span></article>'+
      '</div>'+
      '<div id="migration-preview" class="migration-preview-grid" aria-live="polite"></div>'+
      '<p id="migration-status" class="dashboard-note" data-state="idle" aria-live="polite"></p>';
    fileEl=document.getElementById('migration-file');
    statusEl=document.getElementById('migration-status');
    previewEl=document.getElementById('migration-preview');
    document.getElementById('migration-export')?.addEventListener('click',exportPortable);
    document.getElementById('migration-analyze')?.addEventListener('click',analyzeFile);
    document.getElementById('migration-import')?.addEventListener('click',importSelected);
    document.getElementById('migration-send-chat')?.addEventListener('click',sendSummaryToChat);
    renderPreview();
  }

  window.addEventListener('mmir-workspace-changed',()=>setStatus(''));
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
