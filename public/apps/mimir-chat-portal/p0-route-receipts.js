(function(){
  const version='20260611-supergeni-vision-v1';

  function hostedRouteLabel(apiLabel='api.mmir.ai'){
    return 'Supergeni · Free · '+String(apiLabel||'api.mmir.ai');
  }

  function displayName(model){
    const raw=String(model?.display_name||model?.name||model?.label||model?.id||'Supergeni').trim();
    const display=window.MimirRouteDisplay;
    return display?.displayLabel ? display.displayLabel(raw,'Supergeni') : raw;
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
