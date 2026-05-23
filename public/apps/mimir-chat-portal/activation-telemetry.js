(function(){
  const WORKSPACE_KEY='mimir-active-workspace-v1';
  const DEFAULT_WORKSPACE_ID='personal';
  const STORAGE_PREFIX='mimir-activation-events-v1:';
  const SESSION_KEY='mimir-activation-session-started-v1';
  const MAX_EVENTS=60;

  function workspaceId(){
    try{return localStorage.getItem(WORKSPACE_KEY)||DEFAULT_WORKSPACE_ID;}catch(error){return DEFAULT_WORKSPACE_ID;}
  }

  function key(){return STORAGE_PREFIX+workspaceId();}

  function clean(value,limit=160){
    return String(value||'').replace(/[\r\n\t]+/g,' ').replace(/[<>]/g,'').slice(0,limit);
  }

  function read(){
    try{
      const value=JSON.parse(localStorage.getItem(key())||'[]');
      return Array.isArray(value)?value:[];
    }catch(error){
      return [];
    }
  }

  function write(events){
    try{localStorage.setItem(key(),JSON.stringify(events.slice(-MAX_EVENTS)));}catch(error){}
  }

  function routeLabel(detail){
    if(detail?.free===false)return 'approval required';
    if(detail?.url&&String(detail.url).includes('127.0.0.1'))return 'paired local node';
    if(detail?.route?.provider)return clean(detail.route.provider,80);
    return detail?.free===true?'free/local':'local-first';
  }

  function eventDetail(type,detail){
    if(type==='live-proof'){
      return {
        status:clean(detail?.status||'unknown',60),
        model:clean(detail?.model||'',120),
        route:routeLabel(detail),
        free:detail?.free!==false,
        first_chat_ready:Boolean(detail?.first_chat_ready),
        note:clean(detail?.error||detail?.status||'Live proof updated.',180)
      };
    }
    if(type==='model-install'){
      return {
        status:'ready',
        model:clean(detail?.model||'',120),
        route:'paired local node',
        free:true,
        first_chat_ready:Boolean(detail?.first_chat_bridge),
        note:'Model install completed and can bridge into first chat.'
      };
    }
    if(type==='first-chat-ready'){
      return {
        status:'ready',
        model:clean(detail?.model||'',120),
        route:'verified route',
        free:true,
        first_chat_ready:true,
        note:'Verified model is prepared for the first useful chat.'
      };
    }
    if(type==='first-chat-receipt'){
      return {
        status:clean(detail?.status||'unknown',60),
        model:clean(detail?.model||'',120),
        route:clean(detail?.route?.status||detail?.route?.provider||'verified route',80),
        free:true,
        first_chat_ready:detail?.status==='success',
        note:detail?.status==='success'?'First chat succeeded without storing raw prompt or response.':'First chat needs repair; raw prompt and response were not stored.',
        request_chars:Number(detail?.request_chars||0),
        response_chars:Number(detail?.response_chars||0)
      };
    }
    if(type==='doctor'){
      return {
        status:clean(detail?.status||'checked',60),
        model:'',
        route:'local health doctor',
        free:true,
        first_chat_ready:false,
        note:clean(detail?.next_action?.title||'Doctor checked local activation gates.',180)
      };
    }
    if(type==='cockpit'){
      return {
        status:'checked',
        model:'',
        route:'first screen',
        free:true,
        first_chat_ready:false,
        note:clean([detail?.answer,detail?.local,detail?.model,detail?.trust].filter(Boolean).join(' / '),220)
      };
    }
    return {
      status:clean(detail?.status||'ready',60),
      model:clean(detail?.model||'',120),
      route:'local-first',
      free:true,
      first_chat_ready:false,
      note:clean(detail?.note||'Activation event recorded.',180)
    };
  }

  function record(type,detail){
    const safeDetail=eventDetail(type,detail||{});
    const events=read();
    const previous=events[events.length-1];
    const signature=[type,safeDetail.status,safeDetail.model,safeDetail.note].join('|');
    if(previous?.signature===signature&&Date.now()-Number(previous.at_ms||0)<15000)return previous;
    const event={
      id:'act_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,7),
      at:new Date().toISOString(),
      at_ms:Date.now(),
      type,
      signature,
      status:safeDetail.status,
      model:safeDetail.model,
      route:safeDetail.route,
      free:safeDetail.free,
      first_chat_ready:safeDetail.first_chat_ready,
      note:safeDetail.note,
      request_chars:safeDetail.request_chars||0,
      response_chars:safeDetail.response_chars||0,
      raw_prompt_stored:false,
      raw_response_stored:false,
      secrets_stored:false
    };
    events.push(event);
    write(events);
    window.dispatchEvent(new CustomEvent('mmir-activation-telemetry-updated',{detail:{event,count:events.length}}));
    return event;
  }

  function clear(){
    try{localStorage.removeItem(key());}catch(error){}
    window.dispatchEvent(new CustomEvent('mmir-activation-telemetry-updated',{detail:{cleared:true,count:0}}));
  }

  window.MimirActivationTelemetry={read,record,clear,key};

  window.addEventListener('mmir-live-model-proof-updated',(event)=>record('live-proof',event.detail));
  window.addEventListener('mmir-model-install-ready',(event)=>record('model-install',event.detail));
  window.addEventListener('mmir-install-to-first-chat-ready',(event)=>record('first-chat-ready',event.detail));
  window.addEventListener('mmir-first-chat-receipt-updated',(event)=>record('first-chat-receipt',event.detail));
  window.addEventListener('mmir-first-screen-cockpit-updated',(event)=>record('cockpit',event.detail));
  window.addEventListener('mmir-local-doctor-updated',(event)=>record('doctor',event.detail));
  window.addEventListener('mmir-local-connector-refreshed',()=>record('connector-refresh',{status:'checked',note:'Local connector refresh completed.'}));

  try{
    if(sessionStorage.getItem(SESSION_KEY)!==workspaceId()){
      sessionStorage.setItem(SESSION_KEY,workspaceId());
      record('automatic-defaults',{status:'ready',note:'MMIR started with free-first defaults. No paid route, provider key, prompt or response was stored.'});
    }
  }catch(error){}
})();
