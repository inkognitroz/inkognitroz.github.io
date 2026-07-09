(function(){
  const version='20260614-first-user-route-receipts-v1';

  const secretValuePatterns=[
    /\bsk-[A-Za-z0-9_-]{12,}\b/i,
    /\bAIza[0-9A-Za-z_-]{20,}\b/,
    /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/,
    /\b(?:token|api[_-]?key|secret|signature|sig)=/i,
    /https?:\/\/[^\s/@]+:[^\s/@]+@/i
  ];

  function hasUnsafeDisplayValue(value){
    const raw=String(value||'');
    if(!raw.trim()) return false;
    if(secretValuePatterns.some(pattern=>pattern.test(raw))) return true;
    if(/^https?:\/\//i.test(raw)){
      try{
        const url=new URL(raw);
        return Boolean(url.username||url.password||url.search||url.hash);
      }catch(_error){
        return true;
      }
    }
    return false;
  }

  function safeRouteDisplayName(raw,fallback='Supergeni'){
    const clean=String(raw||'').replace(/\s+/g,' ').trim();
    if(!clean||hasUnsafeDisplayValue(clean)) return fallback;
    const display=window.MimirRouteDisplay;
    const label=display?.displayLabel ? display.displayLabel(clean,fallback) : clean;
    return hasUnsafeDisplayValue(label) ? fallback : label;
  }

  function hostedRouteLabel(apiLabel='api.mmir.ai'){
    return 'Supergeni ready · hosted';
  }

  function displayName(model){
    const raw=String(model?.display_name||model?.name||model?.label||model?.id||'Supergeni').trim();
    return safeRouteDisplayName(raw,'Supergeni');
  }

  function receipt(model,{apiLabel='api.mmir.ai'}={}){
    if(model?.route==='local'){
      return {
        text:displayName(model)+' · private local',
        detail:'Local connector on 127.0.0.1. Pairing token stays in this browser session.',
        state:'local'
      };
    }
    if(model?.routeClass==='external-untrusted-free'||model?.trustLevel==='external-untrusted-free'){
      return {
        text:displayName(model)+' · external free route',
        detail:'External untrusted-free route through MMIR. No provider key is stored in the browser. No paid route started.',
        state:'hosted'
      };
    }
    return {
      text:hostedRouteLabel(apiLabel),
      detail:'Hosted MMIR free route. No provider key is stored in the browser. No paid route started.',
      state:'hosted'
    };
  }

  window.MimirP0RouteReceipts={
    version,
    hostedRouteLabel,
    displayName,
    receipt
  };

  window.dispatchEvent?.(new CustomEvent('mimir-p0-route-receipts-ready',{detail:{version}}));
})();
