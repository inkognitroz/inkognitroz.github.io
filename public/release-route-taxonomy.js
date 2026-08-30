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
  const RELEASE_READY_STATES=Object.freeze(new Set([
    'first_chat_ready',
    'compare_ready',
    'swarm_preview_ready'
  ]));
  const FREE_COST_CLASSES=Object.freeze(new Set([
    'free',
    'free-no-key',
    'free-quota',
    'free-tier',
    'public-free'
  ]));
  const PAID_COST_CONTRADICTION=/(?:^|[-_])(paid|metered|billed|billable)(?:[-_]|$)/;

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
    const verified=model?.live_e2e_verified===true||model?.liveE2EVerified===true;
    if(!verified)return false;
    const proof=model?.live_e2e_proof||model?.liveE2EProof;
    return Boolean(
      proof&&
      typeof proof==='object'&&
      !Array.isArray(proof)&&
      proof.verified===true&&
      proof.no_paid_routes_started===true
    );
  }

  function isConnectedSupergeni(model){
    const id=text(model?.id||model?.model);
    const routeType=text(model?.route_type||model?.routeType);
    const routeState=text(model?.route_state||model?.routeState);
    return Boolean(
      (id==='supergeni'||id==='mmir-supergenius')&&
      routeType==='connected_meta_route'&&
      routeState==='connected_meta_route_available'
    );
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
    const explicitValues=[
      model?.cost_class,
      model?.costClass,
      model?.cost_state,
      model?.costState,
      model?.pricing,
      model?.route_class,
      model?.routeClass
    ].map(text).filter(Boolean);
    if(explicitValues.some(value=>PAID_COST_CONTRADICTION.test(value)))return false;
    const canonicalCosts=[
      model?.cost_class,
      model?.costClass
    ].map(text).filter(Boolean);
    return canonicalCosts.some(value=>FREE_COST_CLASSES.has(value));
  }

  function releaseReadiness(payload){
    const operator=payload?.operator_readiness;
    const writer=operator?.default_writer_readiness;
    const journeys=operator?.journeys;
    const readinessState=operator?.readiness_state;
    const exactRouteCount=Number.isSafeInteger(payload?.live_verified_intelligence_route_count)&&payload.live_verified_intelligence_route_count>=0;
    const verifiedRoutes=exactRouteCount?payload.live_verified_intelligence_route_count:0;
    const noPaidRoutesStarted=payload?.no_paid_routes_started===true;
    const blockerCodesValid=Array.isArray(writer?.blocker_codes);
    const blockerCodes=blockerCodesValid?writer.blocker_codes.filter(Boolean):[];
    const journeyStateConsistent=Boolean(
      (readinessState!=='first_chat_ready'||journeys?.compare_ready!==true)&&
      (!['compare_ready','swarm_preview_ready'].includes(readinessState)||journeys?.compare_ready===true)&&
      (readinessState!=='swarm_preview_ready'||journeys?.swarm_preview_ready===true)
    );
    const hostedReady=Boolean(
      payload?.ok===true&&
      RELEASE_READY_STATES.has(readinessState)&&
      writer?.classification==='release_ready'&&
      writer?.authenticated_release_ready===true&&
      journeys?.first_chat_ready===true&&
      journeyStateConsistent&&
      exactRouteCount&&
      verifiedRoutes>=1&&
      noPaidRoutesStarted&&
      blockerCodesValid&&
      blockerCodes.length===0
    );
    return Object.freeze({
      state:hostedReady?'ready':'blocked',
      hostedReady,
      authenticatedFirstChatReady:hostedReady,
      compareReady:Boolean(
        hostedReady&&
        (readinessState==='compare_ready'||readinessState==='swarm_preview_ready')&&
        journeys?.compare_ready===true
      ),
      swarmPreviewReady:Boolean(
        hostedReady&&
        readinessState==='swarm_preview_ready'&&
        journeys?.swarm_preview_ready===true
      ),
      verifiedRoutes,
      noPaidRoutesStarted,
      readinessState:RELEASE_READY_STATES.has(readinessState)?readinessState:'blocked',
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
      authenticatedFirstChatReady:false,
      compareReady:false,
      swarmPreviewReady:false,
      verifiedRoutes:0,
      noPaidRoutesStarted:false,
      readinessState:'blocked',
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

  function hostedTryableNow(model,readiness,context={}){
    const release=normalizedReadiness(readiness);
    if(isConnectedSupergeni(model)){
      const inventoryVerifiedRoutes=context?.liveVerifiedIntelligenceRouteCount??model?.inventoryLiveVerifiedIntelligenceRouteCount;
      const liveUnderlyingProviders=context?.liveUnderlyingProviderCount??model?.liveUnderlyingProviderCount;
      return Boolean(
        !isDegraded(model)&&
        model?.selectable!==false&&
        model?.executable!==false&&
        (model?.no_paid_routes_started===true||model?.noPaidRoutesStarted===true)&&
        Number.isSafeInteger(inventoryVerifiedRoutes)&&
        inventoryVerifiedRoutes>=1&&
        Number.isSafeInteger(liveUnderlyingProviders)&&
        liveUnderlyingProviders>=1&&
        release.hostedReady===true&&
        release.authenticatedFirstChatReady===true&&
        Number.isSafeInteger(release.verifiedRoutes)&&
        release.verifiedRoutes>=1&&
        release.noPaidRoutesStarted===true
      );
    }
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
    const supergeni=['supergeni','mmir-supergenius'].includes(text(model?.id||model?.model))||text(model?.kind)==='orchestrator';
    const connectedSupergeni=isConnectedSupergeni(model);

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
    if(hostedTryableNow(model,readiness,context))return result('free_now',{
      tryable:true,
      selectable:true,
      freeToTry:true,
      liveE2EVerified,
      access:connectedSupergeni?'Supergeni · koblet til live-verifiserte gratisruter':'Gratis offentlig MMIR-rute · ingen egen API-nøkkel',
      reason:connectedSupergeni
        ? 'Supergeni er klar fordi autentisert first-chat og minst én underliggende gratisrute er live-verifisert.'
        : 'Modellen og den autentiserte first-chat-releaseporten er live-verifisert.'
    });

    let reason='Ruten finnes i inventory, men kan ikke prøves i den offentlige 0.2-flaten nå.';
    if(connectedSupergeni)reason='Supergeni krever autentisert first-chat, minst én live-verifisert underliggende rute og bekreftet gratis-policy.';
    else if(liveE2EVerified&&readiness.hostedReady!==true)reason='Modellen har E2E-bevis, men autentisert release og first-chat er ikke klare.';
    else if(!liveE2EVerified)reason='Ruten mangler ferskt ende-til-ende-bevis.';
    else if(!isFreeRoute(model))reason='Gratis offentlig tilgang er ikke bekreftet.';
    return result('configured_unavailable',{liveE2EVerified,access:'Konfigurert i MMIR · kan ikke prøves nå',reason});
  }

  root.MmirReleaseRouteTaxonomy=Object.freeze({
    labels:LABELS,
    releaseReadiness,
    blockedReadiness,
    modelLiveVerified,
    isConnectedSupergeni,
    localPairedNow,
    hostedTryableNow,
    classifyModel
  });
})(window);
