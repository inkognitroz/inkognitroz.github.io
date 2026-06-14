(function(){
  const version='20260614-first-user-route-receipts-v1';

  function hostedRouteLabel(apiLabel='api.mmir.ai'){
    return 'Supergeni ready · hosted';
  }

  function displayName(model){
    const raw=String(model?.display_name||model?.name||model?.label||model?.id||'Supergeni').trim();
    const display=window.MimirRouteDisplay;
    return display?.displayLabel ? display.displayLabel(raw,'Supergeni') : raw;
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
