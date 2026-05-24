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
    const target=event.target?.closest?.('#runtime-refresh,#refresh-node-dashboard,#refresh-platform-status,#progress-activation-autopilot,#primary-chat-link,[data-local-action="refresh"],[data-local-action="tunnel"],[data-local-action="stop-tunnel"],[data-proof-action="retry"]');
    if(target)allow('user-click',30000);
  },true);
  if(returnIntent())allow('installer-return',60000);
})();