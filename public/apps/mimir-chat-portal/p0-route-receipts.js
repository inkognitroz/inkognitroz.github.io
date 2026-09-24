(function(){
  const version='20260924-answer-proof-card-v1';

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

  // Beviskortet under svaret: bygget KUN av felter svaret allerede bærer
  // (mmir.route_receipt). Ingen nytt kall, ingen utledning, ingen pynt.
  //
  // Fail-closed: uten en brukbar kvittering returneres null, og kortet vises ikke.
  // Et kort som dukker opp uten kvittering ville vært verre enn ingen kort — det er
  // nettopp fraværet av bevis brukeren skal kunne se.
  function proofCard(envelope){
    if(!envelope||typeof envelope!=='object'||Array.isArray(envelope))return null;
    const modelId=String(envelope.model_id||envelope.model||'').replace(/\s+/g,' ').trim();
    if(!modelId||hasUnsafeDisplayValue(modelId))return null;
    // `no_paid_routes_started` er en påstand om penger. Den vises bare når den faktisk
    // står i kvitteringen som en boolsk verdi; «mangler» er ikke det samme som «nei».
    const noPaid=typeof envelope.no_paid_routes_started==='boolean'
      ? envelope.no_paid_routes_started
      : null;
    const raaKilder=Array.isArray(envelope.sources_used)?envelope.sources_used
      :Array.isArray(envelope.sources)?envelope.sources
      :Array.isArray(envelope.knowledge_sources)?envelope.knowledge_sources
      :[];
    const sources=raaKilder
      .map(kilde=>String(kilde&&typeof kilde==='object'?(kilde.name||kilde.title||kilde.id||''):kilde||'').replace(/\s+/g,' ').trim())
      .filter(kilde=>kilde&&!hasUnsafeDisplayValue(kilde))
      .slice(0,6);
    return {
      // Modell-id-en vises som kvitteringen skrev den. Den pyntede visningsetiketten
      // (`safeRouteDisplayName`) setter «mmir-» foran en id som alt starter med det, og
      // «mmir-mmir-supergenius» i nettopp dette kortet ville undergravd hele poenget.
      // Kortet gjengir feltet, det tolker det ikke.
      model:modelId,
      model_id:modelId,
      no_paid:noPaid,
      sources,
      // Hva kortet IKKE påstår, sagt i kortet selv.
      caveat:noPaid===null?'Kvitteringen sier ikke om en betalt rute ble startet.':''
    };
  }

  window.MimirP0RouteReceipts={
    version,
    hostedRouteLabel,
    displayName,
    receipt,
    proofCard
  };

  window.dispatchEvent?.(new CustomEvent('mimir-p0-route-receipts-ready',{detail:{version}}));
})();
