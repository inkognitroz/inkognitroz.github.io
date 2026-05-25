(function(){
  const WORKSPACE_KEY='mimir-active-workspace-v1';
  const DEFAULT_WORKSPACE_ID='personal';
  const REPAIR_RESUME_PREFIX='mimir-repair-resume-v1:';
  const ACTIVATION_REPLAY_PREFIX='mimir-activation-replay-v1:';
  const ACTIVATION_EVENTS_PREFIX='mimir-activation-events-v1:';
  const instantStart=document.querySelector('.mimir-instant-start');
  let lastRepairResumeSignature='';
  let lastActivationReplaySignature='';
  let lastStarterFunnelSignature='';

  function safe(value){
    return String(value||'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
  }

  function activeWorkspaceId(){
    try{return localStorage.getItem(WORKSPACE_KEY)||DEFAULT_WORKSPACE_ID;}catch(error){return DEFAULT_WORKSPACE_ID;}
  }

  function readRepairResume(){
    try{
      const value=JSON.parse(localStorage.getItem(REPAIR_RESUME_PREFIX+activeWorkspaceId())||'null');
      return value&&typeof value==='object'?value:null;
    }catch(error){
      return null;
    }
  }

  function readActivationReplay(){
    try{
      const value=JSON.parse(localStorage.getItem(ACTIVATION_REPLAY_PREFIX+activeWorkspaceId())||'null');
      return value&&typeof value==='object'?value:null;
    }catch(error){
      return null;
    }
  }

  function readActivationEvents(){
    try{
      const value=JSON.parse(localStorage.getItem(ACTIVATION_EVENTS_PREFIX+activeWorkspaceId())||'[]');
      return Array.isArray(value)?value:[];
    }catch(error){
      return [];
    }
  }

  function clearActivationReplay(){
    try{localStorage.removeItem(ACTIVATION_REPLAY_PREFIX+activeWorkspaceId());}catch(error){}
    window.dispatchEvent(new CustomEvent('mmir-activation-replay-updated',{detail:{cleared:true,workspaceId:activeWorkspaceId()}}));
  }

  function openPanel(target){
    const targetEl=document.querySelector(target);
    if(targetEl&&'open' in targetEl)targetEl.open=true;
    if(targetEl)targetEl.scrollIntoView({block:'start',behavior:'smooth'});
  }

  function ensureRepairResumeStyles(){
    if(document.querySelector('link[href*="repair-resume.css"]'))return;
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href='./apps/mimir-chat-portal/repair-resume.css?v=20260523-d187';
    document.head.appendChild(link);
  }

  function repairResumeCopy(resume){
    const status=String(resume?.status||'pending');
    const model=String(resume?.model||'').trim();
    if(status==='verified'){
      const modelCount=Number(resume?.model_count||0);
      if(resume?.action==='starter-install-repair')return {state:'verified',title:'Starter repair verified',detail:(model||'The selected starter')+' is installed. MMIR is preparing proof and first chat.',action:'Send first answer',target:'#mimir-prompt'};
      return {state:'verified',title:'Repair verified',detail:modelCount?'Node sees '+String(modelCount)+' live model'+(modelCount===1?'':'s')+'.':'Connector is back.',action:'Send first answer',target:'#mimir-prompt'};
    }
    if(status==='needs-model'){
      return {state:'needs-model',title:'Connector is back',detail:'Install one free model'+(model?' like '+model:'')+'. MMIR verifies it.',action:'Open models',target:'#model-library'};
    }
    if(status==='needs-action'){
      return {state:'needs-action',title:'Repair still needs attention',detail:String(resume?.note||'MMIR could not verify the node yet.'),action:'Open node health',target:'#node-dashboard'};
    }
    if(status==='checking'){
      return {state:'checking',title:'Checking repair',detail:'Verifying connector, runtime and model.',action:'Open local connector',target:'#local-connector'};
    }
    if(status==='retrying'){
      return {state:'checking',title:'Retrying starter install',detail:'MMIR is retrying '+(model||'the selected starter')+' once now that the node is back.',action:'Open chat runtime',target:'#mimir-chat-runtime'};
    }
    if(resume?.action==='starter-install-repair'){
      return {state:'pending',title:'Starter install needs repair',detail:'MMIR kept '+(model||'the selected starter')+' selected. Fix local node/Ollama, then retry.',action:'Continue repair',target:String(resume?.target||'#node-dashboard')};
    }
    return {state:'pending',title:'Repair started',detail:'Return after install; MMIR keeps checking.',action:'Resume repair',target:String(resume?.target||'#node-dashboard')};
  }

  function ensureRepairResumeBanner(){
    let banner=document.getElementById('repair-resume-banner');
    if(banner||!instantStart)return banner;
    ensureRepairResumeStyles();
    banner=document.createElement('aside');
    banner.id='repair-resume-banner';
    banner.className='repair-resume-banner';
    banner.setAttribute('aria-live','polite');
    const closure=document.getElementById('activation-closure-strip');
    const rail=document.getElementById('mimir-readiness-rail');
    (closure||rail||instantStart).insertAdjacentElement('afterend',banner);
    return banner;
  }

  function renderRepairResumeBanner(){
    const banner=ensureRepairResumeBanner();
    if(!banner)return;
    const resume=readRepairResume();
    if(!resume){
      if(lastRepairResumeSignature==='hidden')return;
      lastRepairResumeSignature='hidden';
      banner.hidden=true;
      return;
    }
    const copy=repairResumeCopy(resume);
    const signature=[copy.state,copy.title,copy.detail,copy.action,copy.target].join('|');
    if(signature===lastRepairResumeSignature)return;
    lastRepairResumeSignature=signature;
    banner.hidden=false;
    banner.dataset.state=copy.state;
    banner.innerHTML='<div><span>Repair resume</span><strong>'+safe(copy.title)+'</strong><p>'+safe(copy.detail)+'</p></div><a href="'+safe(copy.target)+'" data-repair-resume-action="'+safe(copy.state)+'">'+safe(copy.action)+'</a>';
    banner.querySelector('[data-repair-resume-action]')?.addEventListener('click',(event)=>{
      const target=copy.target||'#node-dashboard';
      window.MimirActivationTelemetry?.record?.('repair-resume-action',{status:copy.state,route:target,free:true,note:'First-screen repair resume action selected.'});
      if(target.startsWith('#')){
        event.preventDefault();
        openPanel(target);
        if(copy.state==='verified'&&target==='#mimir-prompt'){
          document.getElementById('mimir-prompt')?.focus();
          window.setTimeout(()=>document.getElementById('primary-chat-link')?.click(),40);
        }
      }
    });
  }

  function ensureActivationReplayBanner(){
    let banner=document.getElementById('activation-replay-banner');
    if(banner||!instantStart)return banner;
    ensureRepairResumeStyles();
    banner=document.createElement('aside');
    banner.id='activation-replay-banner';
    banner.className='activation-replay-banner';
    banner.setAttribute('aria-live','polite');
    const repair=document.getElementById('repair-resume-banner');
    const closure=document.getElementById('activation-closure-strip');
    const rail=document.getElementById('mimir-readiness-rail');
    (repair||closure||rail||instantStart).insertAdjacentElement('afterend',banner);
    return banner;
  }

  function firstScreenStarterFunnelState(){
    const events=readActivationEvents();
    const selected=[...events].reverse().find((event)=>event.type==='recommended-starter')||null;
    if(!selected)return null;
    const after=events.filter((event)=>Number(event.at_ms||0)>=Number(selected.at_ms||0));
    const sameModel=(event)=>!selected.model||!event.model||event.model===selected.model;
    const install=after.find((event)=>event.type==='model-install'&&sameModel(event));
    const proof=after.find((event)=>event.type==='live-proof'&&sameModel(event)&&(event.status==='ready'||event.status==='verified'||event.first_chat_ready));
    const chat=after.find((event)=>event.type==='first-chat-receipt'&&(event.status==='success'||event.first_chat_ready));
    const ready=Boolean(chat);
    const next=!install?'Install model':!proof?'Run free proof':!chat?'First answer':'Ready';
    const action=!install?{kind:'install',label:'Open models',target:'#model-library'}:
      !proof?{kind:'live-proof',label:'Run proof',target:'#mimir-chat-runtime'}:
      !chat?{kind:'first-chat',label:'Send first answer',target:'#mimir-prompt'}:
      {kind:'chat-now',label:'Open chat',target:'#mimir-prompt'};
    const done=[selected,install,proof,chat].filter(Boolean).length;
    return {state:ready?'ready':'watch',model:selected.model||selected.route||'recommended starter',next,done,action};
  }

  function ensureFirstScreenStarterFunnel(){
    let banner=document.getElementById('first-screen-starter-funnel');
    if(banner||!instantStart)return banner;
    ensureRepairResumeStyles();
    banner=document.createElement('aside');
    banner.id='first-screen-starter-funnel';
    banner.className='first-screen-starter-funnel';
    banner.setAttribute('aria-live','polite');
    const closure=document.getElementById('activation-closure-strip');
    const replay=document.getElementById('activation-replay-banner');
    const repair=document.getElementById('repair-resume-banner');
    (replay||repair||closure||instantStart).insertAdjacentElement('afterend',banner);
    return banner;
  }

  function renderFirstScreenStarterFunnel(){
    const banner=ensureFirstScreenStarterFunnel();
    if(!banner)return;
    const state=firstScreenStarterFunnelState();
    if(!state){
      if(lastStarterFunnelSignature==='hidden')return;
      lastStarterFunnelSignature='hidden';
      banner.hidden=true;
      return;
    }
    const signature=[state.state,state.model,state.next,state.done].join('|');
    if(signature===lastStarterFunnelSignature)return;
    lastStarterFunnelSignature=signature;
    banner.hidden=false;
    banner.dataset.state=state.state;
    banner.innerHTML='<div><span>Starter progress</span><strong>'+safe(state.model)+'</strong><p>'+safe(state.done)+'/4 complete - next: '+safe(state.next)+'</p><small>local_only:true / no_paid_routes_started:true / raw_prompt_stored:false / secrets_stored:false</small></div><button type="button" data-first-screen-starter-funnel="'+safe(state.action.kind)+'" data-target="'+safe(state.action.target)+'">'+safe(state.action.label)+'</button>';
    banner.querySelector('[data-first-screen-starter-funnel]')?.addEventListener('click',()=>runFirstScreenStarterFunnelAction(state.action));
  }

  function runFirstScreenStarterFunnelAction(action){
    window.MimirActivationTelemetry?.record?.('first-screen-starter-funnel-action',{status:action.kind,route:action.target,free:true,note:'First-screen starter funnel opened '+action.target+'. no_paid_routes_started:true.'});
    if(action.kind==='live-proof'){
      const retry=document.querySelector('#runtime-live-proof [data-proof-action="retry"]')||document.getElementById('runtime-refresh');
      retry?.click?.();
    }
    if(action.kind==='first-chat'){
      const prompt=document.getElementById('mimir-prompt');
      if(prompt&&!String(prompt.value||'').trim()){
        prompt.value='Give me my first useful MMIR answer and the next safe setup step.';
        prompt.dispatchEvent(new Event('input',{bubbles:true}));
      }
      prompt?.focus();
      window.setTimeout(()=>document.getElementById('primary-chat-link')?.click(),40);
      return;
    }
    if(action.target.startsWith('#'))openPanel(action.target);
    if(action.kind==='install')window.dispatchEvent(new CustomEvent('mmir-model-library-focus-recommended',{detail:{source:'first-screen-starter-funnel',no_paid_routes_started:true}}));
  }

  function renderActivationReplayBanner(){
    const banner=ensureActivationReplayBanner();
    if(!banner)return;
    const replay=readActivationReplay();
    if(!replay){
      if(lastActivationReplaySignature==='hidden')return;
      lastActivationReplaySignature='hidden';
      banner.hidden=true;
      return;
    }
    const signature=[replay.id,replay.state,replay.label,replay.expected_next_action,replay.applied_at].join('|');
    if(signature===lastActivationReplaySignature)return;
    lastActivationReplaySignature=signature;
    banner.hidden=false;
    banner.dataset.state=String(replay.state||'demo');
    const target=String(replay.next_target||'#platform-status');
    banner.innerHTML='<div><span>Demo replay active</span><strong>'+safe(replay.label||'Activation replay')+'</strong><p>'+safe(replay.expected_next_action||'Review simulated activation.')+'</p><small>demo_only:true / mutated_real_connector:false / no_paid_routes_started:true</small></div><div class="activation-replay-actions"><a href="'+safe(target)+'" data-activation-replay-jump>Go to next step</a><button type="button" data-activation-replay-reset>Reset replay</button><a href="#platform-status" data-activation-replay-open>Open replay</a></div>';
    banner.querySelector('[data-activation-replay-jump]')?.addEventListener('click',(event)=>{
      if(target.startsWith('#')){
        event.preventDefault();
        openPanel(target);
        if(target==='#mimir-prompt')document.getElementById('mimir-prompt')?.focus();
      }
    });
    banner.querySelector('[data-activation-replay-reset]')?.addEventListener('click',()=>{
      clearActivationReplay();
      lastActivationReplaySignature='';
      renderActivationReplayBanner();
    });
    banner.querySelector('[data-activation-replay-open]')?.addEventListener('click',(event)=>{
      event.preventDefault();
      openPanel('#platform-status');
    });
  }

  function run(){
    renderRepairResumeBanner();
    renderActivationReplayBanner();
    renderFirstScreenStarterFunnel();
  }

  window.MimirFirstScreenActivationHydration={renderRepairResumeBanner,renderActivationReplayBanner,renderFirstScreenStarterFunnel,clearActivationReplay};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
  window.addEventListener('mmir-repair-resume-started',run);
  window.addEventListener('mmir-repair-resume-checked',run);
  window.addEventListener('mmir-activation-replay-updated',run);
  window.addEventListener('mmir-activation-telemetry-updated',run);
  window.addEventListener('storage',run);
  window.addEventListener('focus',run);
})();
