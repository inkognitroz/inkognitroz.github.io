(function(){
  const version='20260606-b1-06-p0-history-v1';
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

  window.MimirP0History={
    version,
    staleFailurePatterns,
    validMessage,
    staleFailureMessage,
    transientInstallMessage,
    makeMessageId
  };

  window.dispatchEvent?.(new CustomEvent('mimir-p0-history-ready',{detail:{version}}));
})();
