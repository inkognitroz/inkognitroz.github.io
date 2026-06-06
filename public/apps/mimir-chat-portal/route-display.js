(function(){
  const w=window;
  const DEFAULT_LABEL='Supergenious';

  function text(value){
    return String(value||'').replace(/\s+/g,' ').trim();
  }

  function displayLabel(value,fallback=DEFAULT_LABEL){
    const raw=text(value);
    if(!raw)return fallback;
    return raw
      .replace(/\bmmir[-_\s]+supergeni(?:us|ous)\b/gi,fallback)
      .replace(/MMIR Browser Guide|MMIR Guide/gi,fallback)
      .replace(/supergenious(?:\s+free)?/gi,fallback)
      .replace(/(^|[^A-Za-z])supergenius(?:\s+free)?/gi,(match,prefix)=>prefix+fallback)
      .replace(/(?:MMIR\s+){2,}Supergenius/gi,fallback)
      .trim()||fallback;
  }

  function clip(value,max=34){
    const valueText=text(value);
    return valueText.length<=max?valueText:valueText.slice(0,max-3).trim()+'...';
  }

  function modelLabel(model,fallback=DEFAULT_LABEL){
    if(!model)return fallback;
    if(typeof model==='string')return displayLabel(model,fallback);
    return displayLabel(model.display_name||model.name||model.label||model.id||model.model,fallback);
  }

  function isLocalProfile(profile){
    const api=w.MimirApiClient||{};
    const summary=[profile?.provider,profile?.cost,profile?.url,profile?.name,profile?.id].join(' ').toLowerCase();
    return Boolean(api.isLocal?.(profile)||/127\.0\.0\.1|localhost|local|ollama/.test(summary));
  }

  function routeName(profile,fallback=DEFAULT_LABEL){
    if(!profile)return fallback;
    if(profile.provider==='local-node')return displayLabel(profile.name||'MMIR Local Node',fallback);
    if(profile.provider==='ollama-direct')return displayLabel(profile.name||'Ollama local',fallback);
    if(profile.id==='mmir-api-bootstrap')return 'api.mmir.ai free route';
    return displayLabel(profile.name||profile.provider||'Configured route',fallback);
  }

  function trustLabel(profile){
    const explicitTrust=String(profile?.trust_level||'').toLowerCase();
    const promotion=String(profile?.promotion_state||'').toLowerCase();
    const visibility=String(profile?.visibility||profile?.public_surface||'').toLowerCase();
    if(/active-untrusted-free|untrusted|unverified/.test(explicitTrust)||promotion==='hidden_candidate'||visibility.includes('advanced'))return 'untrusted candidate';
    const summary=[profile?.provider,profile?.cost,profile?.url,profile?.name,profile?.id].join(' ').toLowerCase();
    if(isLocalProfile(profile))return 'local/private';
    if(/free|no paid|self-hosted|self hosted/.test(summary))return 'free/protected';
    return profile?'policy required':'browser/no secret';
  }

  function freshnessLabel(score){
    const state=String(score?.freshness_state||'').replace(/[_-]+/g,' ').trim().toLowerCase();
    const action=String(score?.factuality_guardrail_action||'').replace(/[_-]+/g,' ').trim().toLowerCase();
    const value=(state+' '+action).trim();
    if(!value||value==='unknown')return '';
    if(/stale/.test(value))return 'stale fact demoted';
    if(/verified|fresh|current/.test(value))return 'verified fact';
    if(/uncertain|check|required|refresh|needs/.test(value))return 'needs fact check';
    return '';
  }

  w.MimirRouteDisplay={DEFAULT_LABEL,displayLabel,clip,modelLabel,isLocalProfile,routeName,trustLabel,freshnessLabel};
  w.dispatchEvent(new CustomEvent('mimir-route-display-ready',{detail:{ready:true,default_label:DEFAULT_LABEL,no_paid_routes_started:true}}));
})();
