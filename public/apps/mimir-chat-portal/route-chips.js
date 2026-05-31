(function(){
  const w=window,d=document,api=w.MimirApiClient||{},q=id=>d.getElementById(id);
  const FALLBACK_LABEL='Supergenious Free';
  function clip(v,m=34){const s=String(v||'').replace(/\s+/g,' ').trim();return s.length<=m?s:s.slice(0,m-3).trim()+'...';}
  function display(v){return String(v||'').replace(/\bmmir[-_\s]+supergeni(?:us|ous)\b|MMIR Browser Guide|MMIR Guide|MMIR Supergenius|Supergenius/gi,FALLBACK_LABEL).replace(/Supergenious(?!\s+Free)/gi,FALLBACK_LABEL).replace(/Supergenious Free(?:\s+Free)+/gi,FALLBACK_LABEL);}
  function chip(id,text,state,title){const e=typeof id==='string'?q(id):id;if(!e)return;const v=display(String(text||'').trim());e.textContent=v;e.dataset.state=state||'idle';if(title||v)e.title=display(title||v);}
  function selectedRuntime(sel=q('runtime-model')){return sel?.selectedOptions?.[0]?.dataset?.runtime||'';}
  function modelLabel(sel=q('runtime-model')){return display(String(sel?.selectedOptions?.[0]?.textContent||sel?.value||'No model').split(/\s+[-–]\s+/)[0].trim()||'No model');}
  function local(profile){const text=[profile?.provider,profile?.cost,profile?.url,profile?.name].join(' ').toLowerCase();return Boolean(api.isLocal?.(profile)||/127\.0\.0\.1|localhost|local|ollama/.test(text));}
  function route(profile){if(!profile)return FALLBACK_LABEL;if(profile.provider==='local-node')return profile.name||'MMIR Local Node';if(profile.provider==='ollama-direct')return profile.name||'Ollama local';if(profile.id==='mmir-api-bootstrap')return 'api.mmir.ai free route';return profile.name||profile.provider||'Configured route';}
  function trust(profile){const text=[profile?.provider,profile?.cost,profile?.url,profile?.name].join(' ').toLowerCase();if(local(profile))return 'local/private';if(/free|no paid|self-hosted|self hosted/.test(text))return 'free/protected';return profile?'policy required':'browser/no secret';}
  function tunnelLabel(tunnel,profile,error){if(tunnel?.public_url)return {text:'Tunnel: secure',state:'ready',title:'Secure tunnel is active: '+tunnel.public_url};if(tunnel?.status)return {text:'Tunnel: '+String(tunnel.status).replace(/[-_]/g,' '),state:'idle',title:'Tunnel reported by node, but no public secure URL is active.'};if(local(profile))return {text:error?'Tunnel: unavailable':'Tunnel: off',state:error?'offline':'idle',title:error?'Local node tunnel state is unavailable.':'Local tunnel is not active.'};return {text:'Tunnel: n/a',state:'idle',title:'Secure tunnel appears only when a paired local/on-prem node exposes it.'};}
  function hardwareSummary(h){if(!h)return '';const cpu=h.cpu?.model||h.cpu_model||h.cpu||'',ram=h.ram_gb||h.memory_gb||h.ram?.gb||'',gpu=h.gpu?.name||h.gpu_name||h.gpu||'';return [cpu&&String(cpu).split(/\s+/).slice(0,3).join(' '),ram&&(ram+'GB RAM'),gpu&&String(gpu).split(/\s+/).slice(0,3).join(' ')].filter(Boolean).join(' / ');}
  function hardwareLabel(h,error){const s=hardwareSummary(h);return s?{text:'Resources: '+s,state:'ready',title:'Resource telemetry from the active node.'}:{text:error?'Resources: unavailable':'Resources: not exposed',state:error?'offline':'idle',title:'CPU/RAM/GPU telemetry appears only when the active node exposes it.'};}
  function modelState(sel,webGpu){const r=selectedRuntime(sel);if(r==='live'||r==='browser-guide'||r==='auto')return 'ready';if(r==='webllm')return webGpu?'setup':'offline';if(r==='ollama')return 'setup';return 'idle';}
  function updateRuntime({modelSelect=q('runtime-model'),profile=null,webGpu=Boolean(navigator.gpu)}={}){
    const m=modelLabel(modelSelect),r=selectedRuntime(modelSelect);
    chip('runtime-model-chip',clip(m,38),modelState(modelSelect,webGpu),r==='auto'||r==='browser-guide'?FALLBACK_LABEL+' is the instant free fallback. MMIR upgrades automatically to WebGPU, api.mmir.ai or Local Node when available.':m);
    const t=trust(profile);
    if(q('runtime-node-chip')&&!q('runtime-node-chip').textContent)chip('runtime-node-chip','Node: '+clip(route(profile),32),profile?.health==='offline'?'offline':'idle','Selected node or route. Proof updates this state when backend checks finish.');
    chip('runtime-privacy-chip',t==='policy required'?'Privacy: policy required':'Privacy: '+t,t==='policy required'?'degraded':'ready','Security/privacy state. No browser provider secrets; prompts are not stored in the public repo.');
    if(q('runtime-tunnel-chip')&&!q('runtime-tunnel-chip').textContent)chip('runtime-tunnel-chip','Tunnel: checking','idle','Secure tunnel state has not been checked yet.');
    if(q('runtime-resource-chip')&&!q('runtime-resource-chip').textContent)chip('runtime-resource-chip','Resources: checking','idle','Node telemetry has not been checked yet.');
  }
  function updateRoute({profile=null,models=[],hardware=null,tunnel=null,error=null,proof='idle'}={}){
    const n=Array.isArray(models)?models.length:0,state=error?'offline':(n||proof==='ready'?'ready':(profile?'degraded':'idle')),detail=error?String(error.message||error):(n?String(n)+' live model'+(n===1?'':'s'):'no live backend model proven');
    chip('runtime-node-chip','Node: '+clip(route(profile),32),state,route(profile)+' - '+detail);
    const t=trust(profile),ps=t==='policy required'?'degraded':(error&&local(profile)?'degraded':'ready');
    chip('runtime-privacy-chip',t==='policy required'?'Privacy: policy required':'Privacy: '+t,ps,'Route trust: '+t+'. No browser provider secrets; prompts are not stored in the public repo.');
    const tl=tunnelLabel(tunnel,profile,error),hl=hardwareLabel(hardware,error);
    chip('runtime-tunnel-chip',tl.text,tl.state,tl.title);chip('runtime-resource-chip',hl.text,hl.state,hl.title);updateRuntime({profile});
  }
  w.MimirRouteChips={updateRuntime,updateRoute};
  updateRoute(w.__MimirRouteChipState||{});
  w.dispatchEvent(new CustomEvent('mimir-route-chips-ready',{detail:{ready:true,no_paid_routes_started:true}}));
})();