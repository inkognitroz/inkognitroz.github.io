(function(){
  const w=window,d=document,key='__MimirLocalProbeAllowedUntil';
  function loopback(input){
    try{
      const url=new URL(String(typeof input==='string'?input:input?.url||''),w.location.href);
      return ['127.0.0.1','localhost','::1'].includes(url.hostname);
    }catch(error){
      return false;
    }
  }
  function returnIntent(){
    const params=new URLSearchParams(w.location.search||'');
    const hash=String(w.location.hash||'').toLowerCase();
    return params.get('mmir_local_return')==='1'||params.get('local_node_ready')==='1'||hash.includes('local-connector-ready')||hash.includes('mmir-local-ready');
  }
  function allow(reason='manual',ms=30000){
    w[key]=Math.max(Number(w[key]||0),Date.now()+ms);
    w.dispatchEvent(new CustomEvent('mmir-local-probe-allowed',{detail:{reason,expires_at:new Date(w[key]).toISOString()}}));
  }
  function shouldLandOnChat(){
    if(returnIntent())return false;
    const hash=String(w.location.hash||'').toLowerCase();
    return !hash||hash==='#mimir-instant-start'||hash==='#app-factory'||hash==='#chat';
  }
  function keepPromptInView(){
    const prompt=d.getElementById('mimir-prompt')||d.querySelector('textarea[placeholder*="Ask MMIR"], textarea');
    if(!prompt)return;
    const rect=prompt.getBoundingClientRect();
    if(rect.top>=96&&rect.bottom<=w.innerHeight-24)return;
    const target=Math.max(0,rect.top+w.scrollY-160);
    w.scrollTo(0,target);
  }
  function landOnChat(){
    if(!shouldLandOnChat())return;
    if(!d.getElementById('mimir-chat-runtime'))return;
    if(String(w.location.hash||'').toLowerCase()!=='#mimir-chat-runtime'){
      w.location.hash='mimir-chat-runtime';
    }
    setTimeout(keepPromptInView,80);
    setTimeout(keepPromptInView,420);
  }
  if(!w.MimirAllowLocalProbes)w.MimirAllowLocalProbes=allow;
  const originalFetch=w.fetch;
  if(originalFetch&&!w.__MimirQuietFirstPaintFetchGuard){
    w.__MimirQuietFirstPaintFetchGuard=true;
    w.fetch=function(input,init){
      if(loopback(input)&&Date.now()>Number(w[key]||0)&&!returnIntent()){
        const error=new Error('Local node probe deferred until installer, Refresh, or explicit connect action.');
        error.code='local_probe_deferred';
        return Promise.reject(error);
      }
      return originalFetch.apply(this,arguments);
    };
  }
  d.addEventListener('click',event=>{
    const target=event.target?.closest?.('#runtime-refresh,#refresh-node-dashboard,#refresh-platform-status,#progress-activation-autopilot,[data-local-action="refresh"],[data-local-action="tunnel"],[data-local-action="stop-tunnel"],[data-proof-action="retry"]');
    if(target)allow('user-click',30000);
  },true);
  if(returnIntent())allow('installer-return',60000);
  if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',()=>setTimeout(landOnChat,120),{once:true});
  else setTimeout(landOnChat,120);
  w.addEventListener('load',()=>setTimeout(landOnChat,300),{once:true});
})();