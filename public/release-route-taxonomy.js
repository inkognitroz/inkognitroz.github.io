(function(root){
  'use strict';

  const LABELS=Object.freeze({
    orchestrator:'Orkestrator · ikke modell',
    free_now:'Gratis å prøve nå',
    configured_unavailable:'Konfigurert · utilgjengelig nå',
    local_ready:'Lokal · paret node',
    local_setup:'Lokal · krever paret node',
    byok_unavailable:'BYOK · ikke støttet i 0.2',
    degraded:'Midlertidig degradert',
    planned:'Planlagt · ikke tilgjengelig',
    catalogued:'Katalogført · ikke koblet'
  });

  function text(value){
    return String(value||'').trim().toLowerCase();
  }

  function modelText(model){
    return [
      model?.status,
      model?.route_state,
      model?.availability,
      model?.readiness_status,
      model?.next_action
    ].map(text).filter(Boolean).join(' ');
  }

  function modelLiveVerified(model){
    return model?.live_e2e_verified===true||model?.liveE2EVerified===true;
  }

  function isLocal(model){
    const route=text(model?.route);
    const routeType=text(model?.route_type||model?.routeType);
    const boundary=text(model?.trust_boundary||model?.trustBoundary);
    return route==='local'||routeType==='local'||routeType.startsWith('local_')||boundary==='local_machine';
  }

  function isByok(model){
    const access=[model?.route_type,model?.routeType,model?.credential_mode,model?.auth_mode,model?.access].map(text).join(' ');
    return model?.requires_api_key===true||model?.byok===true||/\bbyok\b|bring[_ -]?your[_ -]?own|user[_ -]?api[_ -]?key/.test(access);
  }

  function isPlanned(model){
    const combined=modelText(model);
    return model?.candidate===true||text(model?.route_type||model?.routeType)==='external_candidate'||/\bplanned\b|\bcatalog(?:ued)?\b|future|candidate_ready|setup_needed/.test(combined);
  }

  function isDegraded(model){
    const combined=modelText(model);
    return model?.executable===false||/degrad|blocked|disabled|offline|unavailable|capacity_exhausted|rate_limit|hard_hold/.test(combined);
  }

  function isFreeRoute(model){
    const cost=[model?.cost_class,model?.cost_state,model?.costState,model?.pricing,model?.route_class,model?.routeClass,model?.trust_level,model?.trustLevel,model?.route_type,model?.routeType].map(text).join(' ');
    return /(^|[^a-z])(free|no[_ -]?paid|zero[_ -]?cost)([^a-z]|$)/.test(cost);
  }

  function releaseReadiness(payload){
    const operator=payload?.operator_readiness;
    const writer=operator?.default_writer_readiness;
    const journeys=operator?.journeys;
    const verifiedRoutes=Math.max(0,Number(payload?.live_verified_intelligence_route_count)||0);
    const hostedReady=Boolean(
      operator?.readiness_state==='ready'&&
      writer?.classification==='ready'&&
      writer?.authenticated_release_ready===true&&
      journeys?.first_chat_ready===true&&
      verifiedRoutes>=1
    );
    const blockerCodes=Array.isArray(writer?.blocker_codes)?writer.blocker_codes.filter(Boolean):[];
    return Object.freeze({
      state:hostedReady?'ready':'blocked',
      hostedReady,
      compareReady:Boolean(hostedReady&&journeys?.compare_ready===true),
      swarmPreviewReady:Boolean(hostedReady&&journeys?.swarm_preview_ready===true),
      verifiedRoutes,
      checkedAt:Date.now(),
      reason:hostedReady
        ? 'Offentlig svarbane er live-verifisert.'
        : (blockerCodes.length?blockerCodes.join(', '):'Offentlig svarbane mangler ferskt produksjonsbevis.')
    });
  }

  function blockedReadiness(reason='Kunne ikke verifisere offentlig svarbane.'){
    return Object.freeze({
      state:'blocked',
      hostedReady:false,
      compareReady:false,
      swarmPreviewReady:false,
      verifiedRoutes:0,
      checkedAt:Date.now(),
      reason
    });
  }

  function normalizedReadiness(value){
    if(value&&typeof value.hostedReady==='boolean')return value;
    return releaseReadiness(value||{});
  }

  function localPairedNow(model,localReadiness={}){
    if(!isLocal(model)||model?.executable===false||model?.selectable===false)return false;
    const modelId=String(model?.model||model?.id||'').trim();
    const modelIds=Array.isArray(localReadiness?.modelIds)?localReadiness.modelIds.map(String):[];
    return Boolean(
      localReadiness?.paired===true&&
      localReadiness?.runtimeChatReady===true&&
      localReadiness?.chatReady===true&&
      modelId&&modelIds.includes(modelId)
    );
  }

  function hostedTryableNow(model,readiness){
    const release=normalizedReadiness(readiness);
    return Boolean(
      !isLocal(model)&&
      !isByok(model)&&
      !isPlanned(model)&&
      !isDegraded(model)&&
      model?.selectable!==false&&
      modelLiveVerified(model)&&
      isFreeRoute(model)&&
      release.hostedReady===true
    );
  }

  function result(key,extra={}){
    return Object.freeze({
      key,
      label:LABELS[key]||key,
      tryable:false,
      selectable:false,
      freeToTry:false,
      ...extra
    });
  }

  function classifyModel(model,context={}){
    const readiness=normalizedReadiness(context.releaseReadiness||context.status||{});
    const liveE2EVerified=modelLiveVerified(model);
    const supergeni=text(model?.id)==='supergeni'||text(model?.kind)==='orchestrator';

    if(supergeni&&context.surface!=='chat'){
      if(isDegraded(model))return result('degraded',{liveE2EVerified,access:'MMIR-orkestrator · midlertidig utilgjengelig',reason:'Orkestratoren er degradert og er ikke en språkmodell.'});
      return result('orchestrator',{liveE2EVerified,access:'MMIR-orkestrator · ikke en språkmodell',reason:'Supergeni velger og kontrollerer ruter; den er ikke selv en modell.'});
    }
    if(isByok(model))return result('byok_unavailable',{liveE2EVerified,access:'Krever egen API-nøkkel · offentlig BYOK-flyt støttes ikke i 0.2',reason:'Nøkkelen kan ikke limes inn eller brukes i den offentlige 0.2-flaten.'});
    if(isPlanned(model))return result('planned',{liveE2EVerified,access:'Katalogført eller planlagt · kan ikke prøves nå',reason:'Ruten er ikke en aktiv offentlig svarrute.'});
    if(isDegraded(model))return result('degraded',{liveE2EVerified,access:'Midlertidig utilgjengelig · holdes ute av chat',reason:'Ruten er degradert eller ikke kjørbar.'});
    if(isLocal(model)){
      if(localPairedNow(model,context.localReadiness))return result('local_ready',{tryable:true,selectable:true,liveE2EVerified,access:'Lokal maskin · paret node · brukerens compute',reason:'Den lokale modellen er funnet på en paret, chat-klar node.'});
      return result('local_setup',{liveE2EVerified,access:'Lokal maskin · krever installert og paret node',reason:'Lokal modell er ikke testklar før noden er paret og modellen er funnet.'});
    }
    if(hostedTryableNow(model,readiness))return result('free_now',{tryable:true,selectable:true,freeToTry:true,liveE2EVerified,access:'Gratis offentlig MMIR-rute · ingen egen API-nøkkel',reason:'Modellen og den autentiserte first-chat-releaseporten er live-verifisert.'});

    let reason='Ruten finnes i inventory, men kan ikke prøves i den offentlige 0.2-flaten nå.';
    if(liveE2EVerified&&readiness.hostedReady!==true)reason='Modellen har E2E-bevis, men autentisert release og first-chat er ikke klare.';
    else if(!liveE2EVerified)reason='Ruten mangler ferskt ende-til-ende-bevis.';
    else if(!isFreeRoute(model))reason='Gratis offentlig tilgang er ikke bekreftet.';
    return result('configured_unavailable',{liveE2EVerified,access:'Konfigurert i MMIR · kan ikke prøves nå',reason});
  }

  root.MmirReleaseRouteTaxonomy=Object.freeze({
    labels:LABELS,
    releaseReadiness,
    blockedReadiness,
    modelLiveVerified,
    localPairedNow,
    hostedTryableNow,
    classifyModel
  });
})(window);
