(function(){
  const d=document,w=window,displayApi=w.MimirRouteDisplay||{},q=s=>d.querySelector(s),safe=v=>String(v||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const MANIFEST_URL='./active-chat-nodes.json';
  const STARTER_CATALOG='./free-model-starters.json';
  const DEFAULT_LOCAL_URL='http://127.0.0.1:3000';
  const PROFILE_KEY='mimir-chat-backend-profiles';
  const ACTIVE_KEY='mimir-chat-active-backend';
  const WORKSPACE_KEY='mimir-active-workspace-v1';
  const REPAIR_RESUME_PREFIX='mimir-repair-resume-v1:';
  const FALLBACK_LABEL=displayApi.DEFAULT_LABEL||'Supergeni';
  let manifestNodes=[];
  let starterModels=[];
  let liveModels=[];
  let localState={status:'checking',url:DEFAULT_LOCAL_URL};
  let manifestLoaded=false;
  let catalogLoaded=false;

  function fallbackLabel(value){
    if(displayApi.displayLabel)return displayApi.displayLabel(value,FALLBACK_LABEL);
    return String(value||'').replace(/\s+/g,' ').trim()||FALLBACK_LABEL;
  }
  function normalizeModel(model){if(!model||typeof model!=='object')return model;return {...model,name:fallbackLabel(model.name),label:fallbackLabel(model.label)};}
  function normalizeNode(node){if(!node||typeof node!=='object')return node;return {...node,name:fallbackLabel(node.name),models:Array.isArray(node.models)?node.models.map(normalizeModel):node.models};}
  function normalizeStarter(model){
    if(!model||typeof model!=='object')return model;
    const isFallback=model.id==='mmir-guide'||model.id==='mmir-supergenius'||/MMIR Browser Guide|MMIR Guide|supergeni(?:us|ous)/i.test(String(model.label||''));
    if(!isFallback)return normalizeModel(model);
    return {...model,label:FALLBACK_LABEL,best_for:'Instant first answer while MMIR upgrades to a verified browser, API or local model route.',install_note:'No install required. Supergeni answers immediately. MMIR automatically upgrades to WebGPU, api.mmir.ai or Local Node when available.'};
  }

  function selectedModel(){const select=q('#runtime-model'),option=select?.selectedOptions?.[0];return {value:select?.value||'',label:fallbackLabel(String(option?.textContent||select?.value||FALLBACK_LABEL).replace(/\s+-\s+live$/i,'').trim()),runtime:option?.dataset?.runtime||''};}
  function secure(){const h=String(location.hostname||'');return Boolean(w.isSecureContext||location.protocol==='https:'||h==='localhost'||h==='127.0.0.1'||h==='::1');}
  function wasm(){return typeof WebAssembly==='object'&&typeof WebAssembly.instantiate==='function';}
  function webGpuReady(){const s=w.__MimirBrowserNodeSupport;if(s&&typeof s==='object')return s.status==='ready'&&s.supported===true;return false;}
  function webGpuMissingLabel(){const s=w.__MimirBrowserNodeSupport;if(s&&s.webgpu&&s.requires_shader_f16&&s.shader_f16===false)return 'Needs shader-f16';return 'Needs WebGPU/WASM';}
  function webGpuMissingDetail(){const s=w.__MimirBrowserNodeSupport;if(s&&s.webgpu&&s.requires_shader_f16&&s.shader_f16===false)return 'Browser Node unsupported here: this browser adapter is missing shader-f16.';return 'Browser Node unsupported here: needs WebGPU/WASM in a secure browser.';}
  function needsWebGpu(node){const requires=Array.isArray(node?.route?.requires)?node.route.requires:[];return node?.type==='browser'||requires.includes('webgpu')||String(node?.id||'').startsWith('browser-webgpu');}
  function isLocalAdapter(node){return node?.type==='local-adapter'||['local-openai-compatible','ollama-direct'].includes(String(node?.route?.kind||''));}
  function adapterUrl(node){return String(node?.route?.url||'').replace(/\/$/,'');}
  function modelFromNode(node){const model=Array.isArray(node?.models)?node.models[0]:null;return fallbackLabel(model?.name||model?.id||'Auto');}
  function starterId(node){return String(node?.route?.starter_id||'');}
  function localReady(){return liveModels[0]&&!/^(off|err|block)/i.test(localState.status||'');}
  function activeProfile(){try{const profiles=JSON.parse(localStorage.getItem(PROFILE_KEY)||'[]');const active=localStorage.getItem(ACTIVE_KEY)||'';return Array.isArray(profiles)?profiles.find(profile=>profile?.id===active)||null:null;}catch(error){return null;}}
  function managedReady(){const profile=activeProfile();if(!profile)return false;const url=String(profile.url||''),health=String(profile.health||''),liveness=String(profile.liveness||'');return (profile.id==='mmir-api-bootstrap'||/api\.mmir\.ai/i.test(url))&&health==='ready'&&(!liveness||liveness==='chat-probed');}
  function nodeStatus(node){if(node.id==='local-node')return localReady()?'online':(localState.status==='offline'?'offline':'setup');if(node?.route?.kind==='managed-api')return managedReady()?'online':'setup';if(isLocalAdapter(node))return 'setup';if(needsWebGpu(node))return webGpuReady()?'online':'setup';return 'online';}
  function nodeModel(node){if(node.id==='local-node')return liveModels[0]?.id||liveModels[0]?.name||'Install model';if(node?.route?.kind==='managed-api')return managedReady()?modelFromNode(node):'Verify route first';if(isLocalAdapter(node))return modelFromNode(node)||'Auto when running';if(needsWebGpu(node))return webGpuReady()?modelFromNode(node):webGpuMissingLabel();return modelFromNode(node);}
  function nodeDetail(node){
    if(node?.route?.kind==='managed-api')return managedReady()?'Free API proven.':'Free API; verify first.';
    if(node.id==='local-node'){if(localReady())return 'Private ready.';if(localState.status==='offline')return 'Start Local Node.';return 'Checking localhost.';}
    if(isLocalAdapter(node)){if(node?.route?.kind==='ollama-direct')return 'Use Local Node.';return 'Local /v1; CORS.';}
    if(needsWebGpu(node))return webGpuReady()?'Browser Node: free, browser-local/private, starter quality, no provider key, no Cloudflare, no install.':webGpuMissingDetail();
    return 'Instant fallback; no key.';
  }
  function visibleInventory(nodes){
    const all=Array.isArray(nodes)?nodes.filter(Boolean):[];
    return {
      ready:all.filter(node=>nodeStatus(node)==='online').length,
      visible:all.length,
      local:all.filter(node=>node.id==='local-node'||isLocalAdapter(node)).length,
      browserCandidates:all.filter(needsWebGpu).length
    };
  }
  function routeChoiceReason(node){
    if(!node)return 'MMIR picks the safest route with a live answer first.';
    if(node.id==='local-node'&&localReady())return 'Chosen because a verified private local model is already live on this device.';
    if(node?.route?.kind==='managed-api')return managedReady()?'Chosen because the free hosted route is verified live right now.':'Chosen because it can answer first while local/private routes are still being verified.';
    if(isLocalAdapter(node))return 'Chosen because a free local adapter is available for direct chat.';
    if(needsWebGpu(node))return webGpuReady()?'Chosen because this browser has verified Browser Node support.':'Browser Node is parked until this browser proves WebGPU/WASM support.';
    return 'Chosen because it is the safest instant free route right now.';
  }
  function capacityLine(nodes){
    const inventory=visibleInventory(nodes);
    const parts=[
      inventory.ready+' ready now',
      inventory.visible+' visible routes'
    ];
    if(inventory.local)parts.push(inventory.local+' local/private paths');
    if(inventory.browserCandidates)parts.push(inventory.browserCandidates+' browser candidates parked until proof');
    return parts.join(' · ');
  }
  function trustTag(node){
    const trust=String(node?.trust_level||'public-free').toLowerCase();
    const promotion=String(node?.promotion_state||'').toLowerCase();
    const visibility=String(node?.visibility||node?.public_surface||'').toLowerCase();
    if(promotion==='active-untrusted-free')return 'advanced untrusted free';
    if(trust==='unverified'||promotion==='hidden_candidate'||visibility.includes('advanced'))return 'advanced untrusted candidate';
    return trust.replace(/-/g,' ');
  }
  function card(node){const status=nodeStatus(node),action=status==='online'?'Chat':(node.id==='local-node'?'Install':'Connect'),model=nodeModel(node);return '<article class="mmir-active-node-card" data-node-id="'+safe(node.id)+'" data-node-state="'+safe(status)+'"><div><span>'+safe(status==='online'?'Live':'Connect')+'</span><strong>'+safe(node.name)+'</strong><small>'+safe(model)+' - '+safe(trustTag(node))+' - '+safe(nodeDetail(node))+'</small></div><button type="button" data-active-node-action="'+safe(node.id)+'">'+safe(action)+'</button></article>';}
  async function loadManifest(){if(manifestLoaded)return;try{const res=await fetch(MANIFEST_URL,{cache:'default'});if(!res.ok)throw new Error('manifest unavailable');const body=await res.json();manifestNodes=Array.isArray(body.nodes)?body.nodes.filter(node=>node?.id).map(normalizeNode):[];}catch(error){manifestNodes=[{id:'managed-api-bootstrap',name:FALLBACK_LABEL,route:{kind:'managed-api',starter_id:'mmir-supergenius',url:'https://api.mmir.ai'},models:[{name:FALLBACK_LABEL}]},{id:'local-node',name:'MMIR Local Node',route:{kind:'local-node',url:DEFAULT_LOCAL_URL},models:[]}];}manifestLoaded=true;}
  function fallbackStarters(){return [{id:'mmir-supergenius',label:FALLBACK_LABEL,runtime:'auto',model:'mmir-supergenius'},{id:'ollama-qwen3-06b',label:'Qwen3 0.6B',runtime:'ollama',model:'qwen3:0.6b'}];}
  async function loadStarterCatalog(){if(catalogLoaded)return;try{const res=await fetch(STARTER_CATALOG,{cache:'default'});if(!res.ok)throw new Error('starter catalog unavailable');const body=await res.json();starterModels=Array.isArray(body.models)?body.models.filter(model=>model?.id&&model?.label).map(normalizeStarter):[];}catch(error){starterModels=fallbackStarters();}if(!starterModels.length)starterModels=fallbackStarters();catalogLoaded=true;}
  function style(){if(q('#mmir-active-node-strip-style'))return;const el=d.createElement('style');el.id='mmir-active-node-strip-style';el.textContent=`#mmir-active-nodes-bar{border:1px solid #10a37f38;border-radius:18px;padding:.56rem;margin:.35rem 0;display:grid;gap:.42rem}.mmir-active-node-head,.mmir-active-starter-rail,.mmir-active-node-grid{display:flex;gap:.42rem;overflow:auto}.mmir-active-node-card{min-width:min(260px,82vw);border:1px solid #94a3b838;border-radius:999px;padding:.43rem .5rem}.mmir-active-node-card dl{display:none}.mmir-active-starter-rail button,.mmir-active-node-card button{border-radius:999px}`;d.head.appendChild(el);}
  function handoff(detail){w.dispatchEvent(new CustomEvent('mmir-runtime-starter-handoff',{detail:{free:true,no_paid_routes_started:true,...detail}}));}
  function selectStarter(node,prompt){const id=starterId(node);if(id)handoff({starter_id:id,action:'select',source:'active-node-strip'});const promptEl=q('#mimir-prompt');if(promptEl&&prompt){promptEl.value=String(prompt||'').trim();promptEl.dispatchEvent(new Event('input',{bubbles:true}));promptEl.dispatchEvent(new Event('change',{bubbles:true}));}q('#primary-chat-link')?.click();}
  function activeWorkspaceId(){return localStorage.getItem(WORKSPACE_KEY)||'personal';}
  function repairResumeKey(){return REPAIR_RESUME_PREFIX+activeWorkspaceId();}
  function installerTarget(source,model){const params=new URLSearchParams({source:String(source||'active-strip')});if(model?.id)params.set('starter',model.id);if(model?.model)params.set('model',model.model);return './downloads/mmir-local-connector-install.html?'+params.toString();}
  function writeLocalInstallResume(source,model){const starterId=model?.id||'ollama-qwen3-06b';const modelId=model?.model||'qwen3:0.6b';const resume={source:String(source||'active-strip'),status:'pending',target:installerTarget(source,{id:starterId,model:modelId}),starter_id:starterId,model:modelId,next_action:'installer-download',at:new Date().toISOString(),no_paid_routes_started:true,provider_secrets_stored:false,raw_prompt_stored:false,raw_response_stored:false};try{localStorage.setItem(repairResumeKey(),JSON.stringify(resume));}catch(error){}w.dispatchEvent(new CustomEvent('mmir-repair-resume-started',{detail:resume}));return resume;}
  function openInstaller(source,model){w.MimirBackendProfiles?.ensureFreeLocalProfile?.();const resume=writeLocalInstallResume(source,model);w.location.href=resume.target;}
  function bestNode(nodes,selected){
    const label=String(selected.label||''),selectedStarter=String(selected.value||'').replace(/^starter:/,'');
    if(localReady())return nodes.find(node=>node.id==='local-node')||nodes[0];
    if(localStorage.getItem('mimir-chat-active-backend')==='mmir-api-bootstrap'){const managed=nodes.find(node=>node.id==='managed-api-bootstrap');if(managed)return managed;}
    if(selectedStarter){const byStarter=nodes.find(node=>starterId(node)===selectedStarter);if(byStarter)return byStarter;}
    if((selected.runtime==='live'||selected.value==='mmir-guide')&&/supergeni(?:us|ous)|MMIR Browser Guide|mmir-guide|MMIR Guide/i.test(label))return nodes.find(node=>node.id==='managed-api-bootstrap')||nodes.find(node=>node.id==='browser-guide')||nodes[0];
    if(selected.runtime==='browser-guide'||/supergeni(?:us|ous)|MMIR Guide|Model Picker|Setup Coach|Security Coach|Growth Coach/i.test(label))return nodes.find(node=>node.id==='browser-guide')||nodes[0];
    if(selected.runtime==='webllm'||/WebGPU|Qwen2.5 0.5B|Gemma 3 1B|Llama 3.2 1B|Phi 3.5/i.test(label))return nodes.find(node=>needsWebGpu(node)&&nodeStatus(node)==='online')||nodes.find(needsWebGpu)||nodes[0];
    return nodes.find(node=>node.id==='managed-api-bootstrap')||(webGpuReady()?nodes.find(node=>node.id==='browser-webgpu-qwen'):null)||nodes.find(node=>node.id==='browser-guide')||nodes[0];
  }
  function publicFirstNodes(nodes){
    const result=[];
    const supergenius=nodes.find(node=>node.id==='browser-guide')||nodes.find(node=>node.id==='managed-api-bootstrap')||nodes.find(node=>/supergeni(?:us|ous)/i.test(String(node.name||'')));
    const local=nodes.find(node=>node.id==='local-node');
    if(supergenius)result.push(supergenius);
    if(local&&!result.some(node=>node.id===local.id))result.push(local);
    return result.length?result:nodes.slice(0,1);
  }
  function activateNode(node){
    if(!node)return;
    if(node.id==='local-node'){
      if(localReady()){const promptEl=q('#mimir-prompt'),m=nodeModel(node);if(promptEl&&!String(promptEl.value||'').trim())promptEl.value='Answer from '+m+'.';const b=w.MimirChatRuntimeBridge;if(b?.refresh&&b?.send){b.setStatus?.('Starting '+m+'...','loading');b.refresh().then(()=>b.send());}else q('#primary-chat-link')?.click();}else openInstaller('active-node-local-install');return;
    }
    if(node?.route?.kind==='managed-api'){w.MimirBackendProfiles?.ensureManagedApiProfile?.();const promptEl=q('#mimir-prompt');if(promptEl&&!String(promptEl.value||'').trim())promptEl.value='Start free api.mmir.ai chat.';q('#primary-chat-link')?.click();return;}
    if(isLocalAdapter(node)){if(node?.route?.kind==='ollama-direct'){openInstaller('active-node-ollama-direct',{id:'ollama-qwen3-06b',model:'qwen3:0.6b'});return;}const u=adapterUrl(node);w.dispatchEvent(new CustomEvent('mmir-free-local-adapter-selected',{detail:{node_id:node.id,url:u,free:true,no_paid_routes_started:true}}));const promptEl=q('#mimir-prompt');const profile={name:node.name,url:u,models:modelFromNode(node),source:node.id};const go=()=>{w.MimirBackendProfiles?.ensureFreeOpenAiLocalProfile?.(profile);const b=w.MimirChatRuntimeBridge;if(b?.refresh&&b?.send){b.setStatus?.('Checking '+node.name+'...','loading');b.refresh().then(models=>{const live=Array.isArray(models)&&models.find(model=>model?.id);if(live){if(promptEl&&!String(promptEl.value||'').trim()){promptEl.value='Give me a short response from '+live.id+' through '+node.name+'.';promptEl.dispatchEvent(new Event('input',{bubbles:true}));}b.setStatus?.('Starting '+live.id+'...','loading');b.send();}else b.setStatus?.('Start '+node.name+' at '+u+' and allow CORS, then retry.','error');});return;}if(promptEl&&!String(promptEl.value||'').trim())promptEl.value='Check local /v1.';q('#primary-chat-link')?.click();};if(w.MimirBackendProfiles?.ensureFreeOpenAiLocalProfile)go();else if(w.MimirLoadDeferred)w.MimirLoadDeferred().then(go);return;}
    if(needsWebGpu(node)&&!webGpuReady()){openInstaller('active-node-webgpu-fallback');return;}
    selectStarter(node,'Start Supergeni instant chat.');
  }
  function starterAction(model){return model.runtime==='ollama'?'install':'select';}
  function starterState(model){return model.runtime==='webllm'&&!webGpuReady()?'setup':'ready';}
  function starterLabel(model){const prefix=model.runtime==='ollama'?'Install':(model.runtime==='webllm'?(webGpuReady()?'Browser Node':webGpuMissingLabel()):'Now');return prefix+' '+fallbackLabel(String(model.label||model.id||'model')).replace(/\s+-\s+.*$/,'');}
  function starterRail(){if(!starterModels.length)return '';const visible=starterModels.filter(model=>model.visibility!=='internal'&&['auto','ollama'].includes(model.runtime)).slice(0,3);if(!visible.length)return '';return '<div class="mmir-active-starter-rail" aria-label="Free starters" data-free-starter-count="'+String(visible.length)+'">'+visible.map(model=>'<button type="button" data-active-starter-id="'+safe(model.id)+'" data-starter-runtime="'+safe(model.runtime)+'" data-route-state="'+safe(starterState(model))+'" title="'+safe(model.install_note||model.best_for||model.label)+'">'+safe(starterLabel(model))+'</button>').join('')+'</div>';}
  function activateStarter(model){
    if(!model?.id)return;
    if(model.runtime==='webllm'&&!webGpuReady()){const fallback=starterModels.find(item=>item.id==='mmir-supergenius')||{id:'mmir-supergenius'};handoff({starter_id:fallback.id,action:'select',source:'active-node-starter-rail',fallback_for:model.id});const promptEl=q('#mimir-prompt');if(promptEl&&!String(promptEl.value||'').trim()){promptEl.value='Browser Model '+webGpuMissingLabel().toLowerCase()+' here. Use Supergeni now and show the private Local Model path.';promptEl.dispatchEvent(new Event('input',{bubbles:true}));promptEl.dispatchEvent(new Event('change',{bubbles:true}));}q('#primary-chat-link')?.click();return;}
    const action=starterAction(model);handoff({starter_id:model.id,action,source:'active-node-starter-rail'});const promptEl=q('#mimir-prompt');if(action==='install'&&!localReady()){openInstaller('active-node-starter-rail',model);return;}if(action!=='install'){if(promptEl&&!String(promptEl.value||'').trim()){promptEl.value='Chat with '+(model.label||model.id)+'.';promptEl.dispatchEvent(new Event('input',{bubbles:true}));promptEl.dispatchEvent(new Event('change',{bubbles:true}));}q('#primary-chat-link')?.click();}
  }
  function render(){const composer=q('.mimir-composer');if(!composer)return;style();let bar=q('#mmir-active-nodes-bar');if(!bar){bar=d.createElement('section');bar.id='mmir-active-nodes-bar';bar.setAttribute('aria-label','Active chat routes');composer.parentNode.insertBefore(bar,composer.nextSibling);}const allNodes=manifestNodes.length?manifestNodes:[{id:'browser-guide',name:FALLBACK_LABEL,trust_level:'public-free',cost:{mode:'free'},route:{kind:'starter',starter_id:'mmir-supergenius'},models:[{name:FALLBACK_LABEL}]}];const nodes=publicFirstNodes(allNodes);const selected=selectedModel();const best=bestNode(nodes,selected);const state=nodeStatus(best),line=best.id==='local-node'&&localReady()?'Private local: '+nodeModel(best):'Ready now: '+(selected.label||FALLBACK_LABEL),inventory=visibleInventory(allNodes),choiceReason=routeChoiceReason(best),summary=capacityLine(allNodes);bar.dataset.state=state;bar.innerHTML='<div class="mmir-active-node-head"><div class="mmir-active-node-title"><span>Active route</span><strong>'+safe(best.name)+'</strong><small>'+safe(line)+'</small><small>'+safe(choiceReason)+'</small><small class="mmir-active-node-capacity">'+safe(summary)+'</small></div><div class="mmir-active-node-pill">'+safe((state==='online'?'Ready':'Setup')+' · '+inventory.ready+'/'+inventory.visible)+'</div></div>'+starterRail()+'<div class="mmir-active-node-grid">'+nodes.map(card).join('')+'</div>';q('#active-badge')&&(q('#active-badge').textContent='Active: '+best.name);q('#active-chat-title')&&(q('#active-chat-title').textContent=best.name+' active - '+inventory.ready+' ready now.');q('#active-chat-description')&&(q('#active-chat-description').textContent=choiceReason+' '+summary+'.');bar.querySelectorAll('[data-active-node-action]').forEach(button=>button.addEventListener('click',()=>activateNode(allNodes.find(node=>node.id===button.getAttribute('data-active-node-action'))||nodes.find(node=>node.id===button.getAttribute('data-active-node-action')))));bar.querySelectorAll('[data-active-starter-id]').forEach(button=>button.addEventListener('click',()=>activateStarter(starterModels.find(model=>model.id===button.getAttribute('data-active-starter-id')))));}
  function updateFromConnector(event){const detail=event?.detail||{};const models=Array.isArray(detail.models)?detail.models:[];liveModels=models.map(model=>({id:model.id||model.name||model.model||'',name:model.name||model.label||model.id||model.model||''})).filter(model=>model.id||model.name);localState={...localState,status:detail.status||detail.health||(liveModels[0]?'ready':localState.status||'checking'),url:detail.url||localState.url};render();}
  function init(){Promise.all([loadManifest(),loadStarterCatalog()]).then(render);render();}
  d.readyState==='loading'?d.addEventListener('DOMContentLoaded',init):init();
  ['load','mmir-backend-profiles-updated','mmir-chat-history-updated','mmir-live-model-proof-updated','mmir-browser-node-support-updated'].forEach(name=>w.addEventListener(name,render));
  w.addEventListener('mmir-local-connector-refreshed',updateFromConnector);
  let n=0,t=setInterval(()=>{render();if(++n>10)clearInterval(t)},750);
})();
