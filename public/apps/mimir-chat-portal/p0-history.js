(function(){
  const version='20260618-qa-history-scoped-v1';
  const qaSessionParamPattern=/^(mmir_qa_session|first_click_guard|responsive_guard|b0_|codex_)/i;
  const staleFailurePatterns=[
    /Selected browser LLM is not loaded/i,
    /System prompt should always be the first message/i,
    /This browser\/device does not expose WebGPU/i,
    /Browser Model is unavailable/i,
    /WebGPU unavailable/i,
    /local_probe_deferred/i,
    /Activate a backend profile/i,
    /No model route is visible yet/i,
    /Backend is unreachable/i,
    /Runtime is unavailable/i
  ];

  function validMessage(message){
    return Boolean(message&&
      (message.role==='user'||message.role==='assistant')&&
      typeof message.content==='string'&&
      message.content.trim());
  }

  function staleFailureMessage(message){
    const content=String(message?.content||'');
    return staleFailurePatterns.some(pattern=>pattern.test(content));
  }

  function transientInstallMessage(message){
    return Boolean(message?.command||message?.showOsChoices||message?.variant==='install');
  }

  function makeMessageId(){
    return 'p0-'+Date.now().toString(36)+'-'+Math.random().toString(16).slice(2,8);
  }

  function decodePart(value){
    try{
      return decodeURIComponent(String(value||'').replace(/\+/g,' '));
    }catch(error){
      return String(value||'');
    }
  }

  function firstQaSessionMatch(search){
    const source=String(search??window?.location?.search??'');
    const parts=source.split(/[?&]/).map(part=>part.trim()).filter(Boolean);
    for(const part of parts){
      const splitIndex=part.indexOf('=');
      const rawKey=splitIndex<0?part:part.slice(0,splitIndex);
      const rawValue=splitIndex<0?'1':part.slice(splitIndex+1);
      const key=decodePart(rawKey).trim();
      if(qaSessionParamPattern.test(key)){
        return {key,value:decodePart(rawValue).trim()||'1'};
      }
    }
    return null;
  }

  function qaSessionEnabled(search){
    return Boolean(firstQaSessionMatch(search));
  }

  function qaSessionScope(search){
    const match=firstQaSessionMatch(search);
    if(!match)return '';
    const raw=`${match.key}=${match.value}`;
    return raw
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g,'-')
      .replace(/^-+|-+$/g,'')
      .slice(0,96)||'qa-session';
  }

  function qaSessionStorageKeys(search,historyBase='mmir-p0-chat-history-qa-session-v1',schemaBase='mmir-p0-chat-history-qa-session-schema'){
    const scope=qaSessionScope(search);
    return {
      scope,
      historyKey:scope?`${historyBase}:${scope}`:historyBase,
      schemaKey:scope?`${schemaBase}:${scope}`:schemaBase
    };
  }

  window.MimirP0History={
    version,
    staleFailurePatterns,
    validMessage,
    staleFailureMessage,
    transientInstallMessage,
    makeMessageId,
    qaSessionEnabled,
    qaSessionScope,
    qaSessionStorageKeys
  };

  window.dispatchEvent?.(new CustomEvent('mimir-p0-history-ready',{detail:{version}}));
})();
