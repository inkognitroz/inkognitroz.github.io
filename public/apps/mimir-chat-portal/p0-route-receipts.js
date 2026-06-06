(function(){
  const version='20260606-b1-06-p0-route-receipts-v1';

  function hostedRouteLabel(apiLabel='api.mmir.ai'){
    return 'Supergenious · Free · '+String(apiLabel||'api.mmir.ai');
  }

  function displayName(model){
    return String(model?.display_name||model?.name||model?.label||model?.id||'Supergenious').trim();
  }

  function receipt(model,{apiLabel='api.mmir.ai'}={}){
    if(model?.route==='local'){
      return {
        text:displayName(model)+' · Private · This Mac',
        detail:'Local connector on 127.0.0.1. Pairing token stays in this browser session.',
        state:'local'
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
