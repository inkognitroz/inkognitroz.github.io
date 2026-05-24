(function(){
  const WORKSPACE_KEY='mimir-active-workspace-v1';
  const DEFAULT_WORKSPACE_ID='personal';
  const MODE_KEY='mimir-chat-mode-controls-v1';
  const STORAGE_PREFIX='mimir-activation-autopilot-v1:';
  const MIN_INTERVAL_MS=20000;
  let running=false;

  function workspaceId(){
    try{return localStorage.getItem(WORKSPACE_KEY)||DEFAULT_WORKSPACE_ID;}catch(error){return DEFAULT_WORKSPACE_ID;}
  }

  function key(){return STORAGE_PREFIX+workspaceId();}

  function readState(){
    try{
      const value=JSON.parse(localStorage.getItem(key())||'null');
      return value&&typeof value==='object'?value:{runs:0,last_run_ms:0,actions:[]};
    }catch(error){
      return {runs:0,last_run_ms:0,actions:[]};
    }
  }

  function writeState(state){
    try{localStorage.setItem(key(),JSON.stringify(state));}catch(error){}
  }

  function readModes(){
    try{
      const saved=JSON.parse(localStorage.getItem(MODE_KEY)||'{}');
      return {private:saved.private!==false,boost:Boolean(saved.boost),super:Boolean(saved.super),vision:Boolean(saved.vision)};
    }catch(error){
      return {private:true,boost:false,super:false,vision:false};
    }
  }

  function ensurePrivateMode(actions){
    const modes=readModes();
    if(modes.private===false){
      const next={...modes,private:true};
      localStorage.setItem(MODE_KEY,JSON.stringify(next));
      window.dispatchEvent(new CustomEvent('mmir-chat-modes-updated',{detail:next}));
      actions.push('private-mode');
    }
  }

  function clickIfReady(selector,actions,label){
    const el=document.querySelector(selector);
    if(!el||el.disabled)return false;
    el.click();
    actions.push(label);
    return true;
  }

  function safeDefaults(actions){
    if(window.MimirBackendProfiles?.ensureAutomaticDefaults){
      window.MimirBackendProfiles.ensureAutomaticDefaults();
      actions.push('automatic-defaults');
      return;
    }
    if(window.MimirBackendProfiles?.ensureFreeLocalProfile){
      window.MimirBackendProfiles.ensureFreeLocalProfile();
      actions.push('free-local-profile');
    }
  }

  function shouldRetryProof(reason){
    return ['live-proof-failed','first-chat-failed','manual','startup','connector-refresh'].includes(reason);
  }

  function record(reason,actions,state){
    const note=actions.length
      ? 'Autopilot ran safe free repairs: '+actions.join(', ')+'.'
      : 'Autopilot checked activation and found no safe automatic repair to run.';
    window.MimirActivationTelemetry?.record?.('autopilot',{
      status:actions.length?'ready':'checked',
      note,
      route:'free local profile',
      free:true,
      actions
    });
    window.dispatchEvent(new CustomEvent('mmir-activation-autopilot-updated',{detail:{reason,actions,state}}));
  }

  function run(reason='event'){
    if(running)return;
    const state=readState();
    const now=Date.now();
    if(now-Number(state.last_run_ms||0)<MIN_INTERVAL_MS&&reason!=='manual')return;
    running=true;
    const actions=[];
    const canTouchLocalRoutes=['manual','connector-refresh','live-proof-failed','first-chat-failed'].includes(reason);
    try{
      if(!canTouchLocalRoutes&&reason!=='manual'){
        writeState({
          ...state,
          runs:Number(state.runs||0)+1,
          last_run_at:new Date(now).toISOString(),
          last_run_ms:now,
          last_reason:reason,
          actions:[],
          no_paid_routes_started:true,
          provider_secrets_stored:false,
          raw_prompt_stored:false,
          raw_response_stored:false
        });
        return;
      }
      ensurePrivateMode(actions);
      if(canTouchLocalRoutes)safeDefaults(actions);
      if(canTouchLocalRoutes)clickIfReady('#runtime-refresh',actions,'refresh-models');
      if(canTouchLocalRoutes&&shouldRetryProof(reason)){
        clickIfReady('#runtime-live-proof [data-proof-action="retry"]',actions,'retry-live-proof');
      }
      const nextState={
        runs:Number(state.runs||0)+1,
        last_run_at:new Date(now).toISOString(),
        last_run_ms:now,
        last_reason:reason,
        actions:actions.slice(-8),
        no_paid_routes_started:true,
        provider_secrets_stored:false,
        raw_prompt_stored:false,
        raw_response_stored:false
      };
      writeState(nextState);
      record(reason,actions,nextState);
    }finally{
      running=false;
    }
  }

  function handleProof(event){
    const status=String(event.detail?.status||'');
    if(['failed','no-live-model','skipped-cost-guard'].includes(status))run('live-proof-failed');
    if(status==='verified')run('live-proof-verified');
  }

  function handleReceipt(event){
    if(event.detail?.status==='failed')run('first-chat-failed');
  }

  window.MimirActivationAutopilot={run,readState,key};
  window.addEventListener('mmir-live-model-proof-updated',handleProof);
  window.addEventListener('mmir-first-chat-receipt-updated',handleReceipt);
  window.addEventListener('mmir-local-connector-refreshed',()=>run('connector-refresh'));
  window.addEventListener('mmir-activation-telemetry-updated',()=>run('telemetry'));

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>run('startup'),700),{once:true});
  }else{
    setTimeout(()=>run('startup'),700);
  }
})();