(function(){
  const WORKSPACE_KEY='mimir-active-workspace-v1';
  const DEFAULT_WORKSPACE_ID='personal';
  const REPAIR_RESUME_PREFIX='mimir-repair-resume-v1:';
  const ACTIVATION_REPLAY_PREFIX='mimir-activation-replay-v1:';
  const instantStart=document.querySelector('.mimir-instant-start');
  let lastRepairResumeSignature='';
  let lastActivationReplaySignature='';

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
      return {state:'verified',title:'Repair verified',detail:modelCount?'Node sees '+String(modelCount)+' live model'+(modelCount===1?'':'s')+'.':'Connector is back.',action:'Chat now',target:'#mimir-prompt'};
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
    const target=String(replay.next_target||'#progress-dashboard');
    banner.innerHTML='<div><span>Demo replay active</span><strong>'+safe(replay.label||'Activation replay')+'</strong><p>'+safe(replay.expected_next_action||'Review simulated activation.')+'</p><small>demo_only:true / mutated_real_connector:false / no_paid_routes_started:true</small></div><div class="activation-replay-actions"><a href="'+safe(target)+'" data-activation-replay-jump>Go to next step</a><button type="button" data-activation-replay-reset>Reset replay</button><a href="#progress-dashboard" data-activation-replay-open>Open replay</a></div>';
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
      openPanel('#progress-dashboard');
    });
  }

  function run(){
    renderRepairResumeBanner();
    renderActivationReplayBanner();
  }

  window.MimirFirstScreenActivationHydration={renderRepairResumeBanner,renderActivationReplayBanner,clearActivationReplay};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
  window.addEventListener('mmir-repair-resume-started',run);
  window.addEventListener('mmir-repair-resume-checked',run);
  window.addEventListener('mmir-activation-replay-updated',run);
  window.addEventListener('storage',run);
  window.addEventListener('focus',run);
})();
