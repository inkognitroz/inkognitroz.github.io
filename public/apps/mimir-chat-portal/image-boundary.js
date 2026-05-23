(function(){
  const main=document.querySelector('.mimir-chat-main');
  let actionEl=null;
  let routeEl=null;
  let promptEl=null;
  let consentEl=null;
  let outputEl=null;
  let statusEl=null;

  if(!main)return;

  function clean(value,max=1000){return String(value||'').replace(/\s+/g,' ').trim().slice(0,max);}
  function setStatus(message,state){if(statusEl){statusEl.textContent=message||'';statusEl.dataset.state=state||'idle';}}
  function gate(id,label,status,detail){return {id,label,status,detail};}
  function currentPlan(){
    const prompt=clean(promptEl?.value,1000);
    const action=actionEl?.value||'generate';
    const route=routeEl?.value||'local-planned';
    const consent=consentEl?.checked===true;
    const gates=[
      gate('consent','Explicit consent',consent?'passed':'blocked',consent?'User approved planning.':'Consent is required before planning.'),
      gate('public-secrets','No public secrets','passed','No provider keys or image-provider secrets are accepted in GitHub Pages.'),
      gate('cost','No spend by default',route==='paid-provider'?'blocked':'passed',route==='paid-provider'?'Paid image providers require protected backend policy and cost approval.':'Route stays free/local by default.'),
      gate('execution','No public image execution','blocked','Image generation/editing is blocked until a trusted local or protected provider route exists.'),
      gate('privacy','Private media boundary','passed','Uploaded source images must stay local or move only through protected backend routes with consent.')
    ];
    const blocked=gates.some(item=>item.status==='blocked');
    return {
      object:'image.boundary_plan',
      status:blocked?'blocked_until_safe_route':'ready_for_local_provider',
      action,
      route,
      prompt,
      generation_enabled:false,
      editing_enabled:false,
      estimated_cost_usd:0,
      gates,
      routes:[
        {id:'local-comfyui',label:'Local ComfyUI / Stable Diffusion node',status:'planned-free-local'},
        {id:'local-open-webui-image',label:'Self-hosted Open WebUI image backend',status:'planned-free-local'},
        {id:'protected-provider',label:'Protected paid/provider route',status:'blocked-until-policy-cost-auth'},
        {id:'manual-design-brief',label:'Manual design brief to chat/artifacts',status:'available-now'}
      ],
      next_actions:route==='paid-provider'?[
        'Keep paid image providers disabled until identity, server-side keys, policy and cost caps exist.',
        'Use the manual design brief or a local image node for zero-cost work.'
      ]:[
        'Use this as a design brief in chat or artifacts today.',
        'Connect a local image node later through MMIR Local Node or a protected backend adapter.',
        'Keep generated media, source images and prompts out of public logs.'
      ]
    };
  }
  function renderPlan(plan){
    if(!outputEl)return;
    outputEl.innerHTML='';
    const article=document.createElement('article');
    article.className='image-boundary-result';
    const title=document.createElement('h3');
    title.textContent='Image route - '+plan.status;
    article.appendChild(title);
    const summary=document.createElement('p');
    summary.textContent='Action: '+plan.action+'. Route: '+plan.route+'. Generation enabled: '+String(plan.generation_enabled)+'. Cost: '+plan.estimated_cost_usd+' USD.';
    article.appendChild(summary);
    const gates=document.createElement('div');
    gates.className='image-gate-grid';
    plan.gates.forEach(item=>{
      const cell=document.createElement('div');
      cell.className='image-gate';
      cell.dataset.state=item.status;
      cell.innerHTML='<span>'+clean(item.label,80)+'</span><strong>'+clean(item.status,40)+'</strong><small>'+clean(item.detail,220)+'</small>';
      gates.appendChild(cell);
    });
    article.appendChild(gates);
    const routes=document.createElement('div');
    routes.className='image-route-grid';
    plan.routes.forEach(route=>{
      const cell=document.createElement('div');
      cell.innerHTML='<strong>'+clean(route.label,120)+'</strong><span>'+clean(route.status,80)+'</span>';
      routes.appendChild(cell);
    });
    article.appendChild(routes);
    const actions=document.createElement('ol');
    actions.className='image-next-actions';
    plan.next_actions.forEach(action=>{
      const li=document.createElement('li');
      li.textContent=action;
      actions.appendChild(li);
    });
    article.appendChild(actions);
    outputEl.appendChild(article);
  }
  function planImageRoute(){
    const plan=currentPlan();
    if(!plan.prompt){setStatus('Describe the image or edit first.','error');return;}
    if(consentEl?.checked!==true){setStatus('Confirm image planning consent first.','error');return;}
    renderPlan(plan);
    setStatus('Image route plan ready. No image was generated.','ready');
  }
  function sendToArtifact(){
    const plan=currentPlan();
    const prompt=document.getElementById('mimir-prompt');
    if(!prompt)return;
    prompt.value='Turn this into a safe MMIR image/design brief. Do not imply paid generation is available. Brief: '+plan.prompt;
    prompt.dispatchEvent(new Event('input',{bubbles:true}));
    prompt.focus();
    setStatus('Image brief sent to chat composer.','ready');
  }
  function openConnector(){
    const target=document.getElementById('local-connector');
    if(target)target.open=true;
    location.hash='local-connector';
    setStatus('Local connector opened for future local image node setup.','ready');
  }
  function install(){
    if(document.getElementById('image-boundary'))return;
    const details=document.createElement('details');
    details.id='image-boundary';
    details.className='mimir-provider-drawer image-boundary';
    details.innerHTML=''+
      '<summary>+ Images / Media</summary>'+
      '<section class="mimir-dashboard" aria-labelledby="image-boundary-title">'+
        '<div class="dashboard-heading"><div><p class="eyebrow">Local/protected media routes</p><h2 id="image-boundary-title">Image generation and editing boundary</h2></div></div>'+
        '<div class="image-boundary-body">'+
          '<div class="workflow-builder-row">'+
            '<label for="image-boundary-action">Action<select id="image-boundary-action"><option value="generate">Generate image</option><option value="edit">Edit image</option><option value="analyze">Analyze image</option><option value="brief">Design brief only</option></select></label>'+
            '<label for="image-boundary-route">Route<select id="image-boundary-route"><option value="local-planned">Free local image node</option><option value="manual-brief">Manual brief to chat/artifacts</option><option value="paid-provider">Protected paid provider</option></select></label>'+
          '</div>'+
          '<label for="image-boundary-prompt">Image request<textarea id="image-boundary-prompt" rows="4" maxlength="1000" placeholder="Describe the image, edit, style, constraints and privacy requirements"></textarea></label>'+
          '<label class="memory-consent"><input id="image-boundary-consent" type="checkbox" /> I approve planning this media route without running image generation.</label>'+
          '<div class="workflow-builder-actions">'+
            '<button id="image-boundary-plan" type="button">Plan image route</button>'+
            '<button id="image-boundary-send" type="button">Send brief to chat</button>'+
            '<button id="image-boundary-connector" type="button">Local connector</button>'+
          '</div>'+
          '<p id="image-boundary-status" class="dashboard-note" data-state="idle" aria-live="polite"></p>'+
          '<div id="image-boundary-output" class="image-boundary-output" aria-live="polite"></div>'+
        '</div>'+
      '</section>';
    const settings=document.getElementById('backend-settings');
    main.insertBefore(details,settings||null);
    actionEl=document.getElementById('image-boundary-action');
    routeEl=document.getElementById('image-boundary-route');
    promptEl=document.getElementById('image-boundary-prompt');
    consentEl=document.getElementById('image-boundary-consent');
    outputEl=document.getElementById('image-boundary-output');
    statusEl=document.getElementById('image-boundary-status');
    document.getElementById('image-boundary-plan')?.addEventListener('click',planImageRoute);
    document.getElementById('image-boundary-send')?.addEventListener('click',sendToArtifact);
    document.getElementById('image-boundary-connector')?.addEventListener('click',openConnector);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
