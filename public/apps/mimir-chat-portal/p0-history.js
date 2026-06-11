(function(){
  const version='20260611-b0-06-24-qa-history-v1';
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

  function qaSessionEnabled(search){
    const source=String(search??window?.location?.search??'');
    return source.split(/[?&]/)
      .map(part=>decodeURIComponent(part.split('=')[0]||'').trim())
      .some(key=>qaSessionParamPattern.test(key));
  }

  window.MimirP0History={
    version,
    staleFailurePatterns,
    validMessage,
    staleFailureMessage,
    transientInstallMessage,
    makeMessageId,
    qaSessionEnabled
  };

  window.dispatchEvent?.(new CustomEvent('mimir-p0-history-ready',{detail:{version}}));
})();
