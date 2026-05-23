(function(){
  const api=window.MimirApiClient;
  const ACTIVE_WORKSPACE_KEY='mimir-active-workspace-v1';
  const DEFAULT_WORKSPACE_ID='personal';
  const KNOWLEDGE_PREFIX='mimir-knowledge-v1:';
  const COLLECTIONS_PREFIX='mimir-knowledge-collections-v1:';
  const MAX_LOCAL_KNOWLEDGE=10;
  const host=document.querySelector('#multi-model-workspace .mimir-dashboard');
  let queryEl=null;
  let providerEl=null;
  let consentEl=null;
  let resultEl=null;
  let statusEl=null;
  let titleEl=null;
  let urlEl=null;
  let snippetEl=null;
  let currentResults=[];

  if(!host)return;

  function workspaceId(){return localStorage.getItem(ACTIVE_WORKSPACE_KEY)||DEFAULT_WORKSPACE_ID;}
  function knowledgeKey(){return KNOWLEDGE_PREFIX+workspaceId();}
  function collectionKey(){return COLLECTIONS_PREFIX+workspaceId();}
  function clean(value,max=2000){return String(value||'').replace(/\s+/g,' ').trim().slice(0,max);}
  function setStatus(message,state){if(statusEl){statusEl.textContent=message||'';statusEl.dataset.state=state||'idle';}}
  function activeConnection(){
    if(!api)return null;
    const profile=api.activeProfile();
    const url=api.cleanUrl(profile?.url);
    if(!profile||!url)return null;
    return {profile,url};
  }
  function safeUrl(value){
    try{
      const url=new URL(String(value||''));
      if(url.protocol!=='http:'&&url.protocol!=='https:')return '';
      url.username='';
      url.password='';
      return url.toString();
    }catch(error){return '';}
  }
  function manualSearchUrls(query){
    const encoded=encodeURIComponent(query);
    return [
      {provider:'duckduckgo',label:'DuckDuckGo',url:'https://duckduckgo.com/?q='+encoded},
      {provider:'brave',label:'Brave Search',url:'https://search.brave.com/search?q='+encoded},
      {provider:'startpage',label:'Startpage',url:'https://www.startpage.com/sp/search?query='+encoded}
    ];
  }
  async function request(path,options={}){
    const connection=activeConnection();
    if(!connection)throw new Error('Activate a backend profile first.');
    const token=await api.pairIfNeeded(connection.profile,connection.url);
    return api.fetchJson(api.joinUrl(connection.url,path),{
      ...options,
      headers:{...api.authHeaders(token),...(options.headers||{})}
    });
  }
  function ensureCollection(){
    const id='web-search';
    const name='Web search';
    let items=[];
    try{
      const value=JSON.parse(localStorage.getItem(collectionKey())||'[]');
      items=Array.isArray(value)?value:[];
    }catch(error){items=[];}
    if(!items.some(item=>item?.id===id)){
      items.push({id,name,enabled:true,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});
      localStorage.setItem(collectionKey(),JSON.stringify(items));
      window.dispatchEvent(new CustomEvent('mmir-knowledge-collections-updated',{detail:{workspaceId:workspaceId()}}));
    }
    return {id,name};
  }
  function readKnowledge(){
    try{
      const value=JSON.parse(localStorage.getItem(knowledgeKey())||'[]');
      return Array.isArray(value)?value:[];
    }catch(error){return [];}
  }
  function saveLocalSources(sources){
    const collection=ensureCollection();
    const current=readKnowledge();
    const now=new Date().toISOString();
    sources.forEach(source=>{
      const text=[
        source.title,
        source.url,
        source.snippet
      ].filter(Boolean).join('\n\n');
      current.push({
        id:String(Date.now())+'-'+Math.random().toString(16).slice(2),
        name:source.title||source.url||'Web source',
        type:'text/markdown',
        size:text.length,
        collection_id:collection.id,
        collection:collection.name,
        source_type:'web-search',
        url:source.url,
        text,
        preview:clean(source.snippet||source.url,240),
        sync:'local',
        createdAt:now
      });
    });
    localStorage.setItem(knowledgeKey(),JSON.stringify(current.slice(-MAX_LOCAL_KNOWLEDGE)));
    window.dispatchEvent(new CustomEvent('mmir-knowledge-updated',{detail:{workspaceId:workspaceId()}}));
  }
  async function syncSourcesToBackend(sources){
    if(!activeConnection()||!api)return {synced:0,error:''};
    try{
      const payload={
        provider:'docs',
        consent:true,
        workspace_id:workspaceId(),
        connector:{id:'web-search-selected',permission_scope:'user-selected sourced search results'},
        documents:sources.map(source=>({
          title:source.title||source.url,
          content_type:'page',
          url:source.url,
          type:'text/markdown',
          text:[source.title,source.url,source.snippet].filter(Boolean).join('\n\n')
        }))
      };
      const data=await request('/connectors/ingestions',{method:'POST',timeoutMs:12000,body:JSON.stringify(payload)});
      return {synced:Array.isArray(data?.data)?data.data.length:0,error:''};
    }catch(error){
      return {synced:0,error:api?.friendlyError?api.friendlyError(error):'Backend source sync unavailable.'};
    }
  }
  function normalizeResult(item,index){
    const url=safeUrl(item?.url);
    if(!url)return null;
    return {
      id:String(item?.id||('result-'+String(index+1))),
      title:clean(item?.title||url,180),
      url,
      snippet:clean(item?.snippet||item?.content||'',1200),
      provider:clean(item?.provider||'web',80),
      rank:Number(item?.rank||index+1)
    };
  }
  function renderSearchUrls(urls){
    const links=document.createElement('div');
    links.className='web-search-links';
    (urls||[]).forEach(item=>{
      const url=safeUrl(item?.url);
      if(!url)return;
      const anchor=document.createElement('a');
      anchor.href=url;
      anchor.target='_blank';
      anchor.rel='noopener noreferrer';
      anchor.textContent=item.label||item.provider||'Open search';
      links.appendChild(anchor);
    });
    resultEl.appendChild(links);
  }
  function renderResults(response){
    if(!resultEl)return;
    resultEl.innerHTML='';
    const warnings=Array.isArray(response?.warnings)?response.warnings.filter(Boolean):[];
    if(warnings.length){
      const note=document.createElement('p');
      note.className='dashboard-note';
      note.dataset.state='idle';
      note.textContent=warnings.join(' ');
      resultEl.appendChild(note);
    }
    renderSearchUrls(response?.search_urls||[]);
    currentResults=(Array.isArray(response?.results)?response.results:[]).map(normalizeResult).filter(Boolean);
    if(!currentResults.length){
      const empty=document.createElement('p');
      empty.className='empty-backends';
      empty.textContent='No automatic sources returned. Use the links, then paste a trusted source below.';
      resultEl.appendChild(empty);
      return;
    }
    const list=document.createElement('div');
    list.className='web-search-result-list';
    currentResults.forEach((source,index)=>{
      const label=document.createElement('label');
      label.className='web-search-result';
      const input=document.createElement('input');
      input.type='checkbox';
      input.value=source.id;
      input.checked=index<Math.min(3,currentResults.length);
      const body=document.createElement('span');
      const title=document.createElement('strong');
      title.textContent=source.title;
      const meta=document.createElement('small');
      meta.textContent=source.provider+' - '+source.url;
      const snippet=document.createElement('em');
      snippet.textContent=source.snippet||'Source returned no snippet.';
      body.append(title,meta,snippet);
      label.append(input,body);
      list.appendChild(label);
    });
    resultEl.appendChild(list);
  }
  async function runSearch(){
    const query=clean(queryEl?.value,500);
    const provider=providerEl?.value||'manual';
    if(!query){setStatus('Write a search query first.','error');return;}
    if(consentEl?.checked!==true){setStatus('Confirm consent before search.','error');return;}
    setStatus('Preparing sourced search...','loading');
    try{
      if(provider!=='manual'&&activeConnection()){
        const data=await request('/web/search',{method:'POST',timeoutMs:15000,body:JSON.stringify({
          workspace_id:workspaceId(),
          query,
          provider,
          consent:true,
          max_results:5
        })});
        renderResults(data);
        setStatus(data.mode==='automatic'?'Search returned sourced results.':'Manual search links are ready.','ready');
        return;
      }
      renderResults({
        object:'web.search',
        mode:'manual',
        provider,
        query,
        results:[],
        search_urls:manualSearchUrls(query),
        warnings:['Manual free search: MMIR did not browse in the background or use a paid API.']
      });
      setStatus('Manual search links are ready.','ready');
    }catch(error){
      renderResults({
        results:[],
        search_urls:manualSearchUrls(query),
        warnings:[api?.friendlyError?api.friendlyError(error):'Protected search unavailable. Manual links are ready.']
      });
      setStatus('Protected search unavailable. Use manual links.','error');
    }
  }
  function selectedSources(){
    const selected=new Set(Array.from(resultEl?.querySelectorAll('input[type="checkbox"]:checked')||[]).map(input=>input.value));
    return currentResults.filter(source=>selected.has(source.id));
  }
  function manualSource(){
    const title=clean(titleEl?.value,180);
    const url=safeUrl(urlEl?.value);
    const snippet=clean(snippetEl?.value,1200);
    if(!title&&!url&&!snippet)return null;
    if(!url)return {error:'Source URL must be http(s).'};
    return {title:title||url,url,snippet};
  }
  async function saveSources(){
    const manual=manualSource();
    if(manual?.error){setStatus(manual.error,'error');return;}
    const sources=selectedSources().concat(manual?[manual]:[]);
    if(!sources.length){setStatus('Select or paste a source first.','error');return;}
    saveLocalSources(sources);
    const sync=await syncSourcesToBackend(sources);
    if(titleEl)titleEl.value='';
    if(urlEl)urlEl.value='';
    if(snippetEl)snippetEl.value='';
    if(sync.synced)setStatus('Sources saved locally and indexed in backend.','ready');
    else setStatus(sync.error?'Sources saved locally. '+sync.error:'Sources saved locally.','ready');
  }
  async function loadProviders(){
    if(!activeConnection()){setStatus('Manual free search is available. Activate backend for SearXNG/BYOK provider status.','ready');return;}
    setStatus('Checking web search providers...','loading');
    try{
      const data=await request('/web/search/providers',{method:'GET',timeoutMs:8000});
      const providers=(Array.isArray(data?.providers)?data.providers:[]).map(item=>item.provider+': '+item.status).join(', ');
      setStatus(providers||'No provider status returned.','ready');
    }catch(error){
      setStatus(api?.friendlyError?api.friendlyError(error):'Provider check unavailable.','error');
    }
  }
  function install(){
    if(document.getElementById('web-search-panel'))return;
    const details=document.createElement('details');
    details.id='web-search-panel';
    details.className='model-catalog-hint web-search-panel';
    details.innerHTML=''+
      '<summary>+ Search</summary>'+
      '<div class="web-search-body">'+
        '<div class="workflow-builder-row">'+
          '<label for="web-search-query">Query<input id="web-search-query" type="search" maxlength="500" placeholder="Find recent sources about..." /></label>'+
          '<label for="web-search-provider">Route<select id="web-search-provider"><option value="manual">Manual free links</option><option value="searxng">Protected SearXNG</option><option value="brave">Protected BYOK search</option></select></label>'+
        '</div>'+
        '<label class="memory-consent"><input id="web-search-consent" type="checkbox" /> I consent to send this query to the selected search route.</label>'+
        '<div class="workflow-builder-actions">'+
          '<button id="web-search-run" type="button">Search</button>'+
          '<button id="web-search-providers" type="button">Check providers</button>'+
        '</div>'+
        '<div id="web-search-results" class="web-search-results" aria-live="polite"></div>'+
        '<div class="web-search-source-form">'+
          '<label for="web-search-source-title">Source title<input id="web-search-source-title" type="text" maxlength="180" /></label>'+
          '<label for="web-search-source-url">Source URL<input id="web-search-source-url" type="url" maxlength="500" /></label>'+
          '<label for="web-search-source-snippet">Source note<textarea id="web-search-source-snippet" rows="3" maxlength="1200"></textarea></label>'+
        '</div>'+
        '<div class="workflow-builder-actions">'+
          '<button id="web-search-save-sources" type="button">Save sources</button>'+
        '</div>'+
        '<p id="web-search-status" class="dashboard-note" data-state="idle" aria-live="polite"></p>'+
      '</div>';
    host.appendChild(details);
    queryEl=document.getElementById('web-search-query');
    providerEl=document.getElementById('web-search-provider');
    consentEl=document.getElementById('web-search-consent');
    resultEl=document.getElementById('web-search-results');
    statusEl=document.getElementById('web-search-status');
    titleEl=document.getElementById('web-search-source-title');
    urlEl=document.getElementById('web-search-source-url');
    snippetEl=document.getElementById('web-search-source-snippet');
    document.getElementById('web-search-run')?.addEventListener('click',runSearch);
    document.getElementById('web-search-providers')?.addEventListener('click',loadProviders);
    document.getElementById('web-search-save-sources')?.addEventListener('click',saveSources);
    renderResults({results:[],search_urls:[],warnings:['Search is explicit. Manual mode is free and does not browse until you open a link.']});
  }

  window.addEventListener('mmir-workspace-changed',()=>setStatus(''));
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
