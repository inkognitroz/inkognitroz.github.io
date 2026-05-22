(function(){
  const form=document.getElementById('beta-signup-form');
  if(!form)return;

  const emailEl=document.getElementById('beta-email');
  const useCaseEl=document.getElementById('beta-use-case');
  const consentEl=document.getElementById('beta-consent');
  const statusEl=document.getElementById('beta-signup-status');
  const submitEl=document.getElementById('beta-signup-submit');
  const SESSION_KEY='mimir-growth-session-v1';

  function setStatus(message,state){
    if(!statusEl)return;
    statusEl.textContent=message;
    statusEl.dataset.state=state||'idle';
  }

  function endpointFromPage(){
    const meta=document.querySelector('meta[name="mimir-growth-endpoint"]');
    const growthEndpoint=window.MimirGrowthEvents?.endpoint?.()||'';
    return String(growthEndpoint||window.MIMIR_GROWTH_ENDPOINT||meta?.content||document.body?.dataset?.growthEndpoint||'').trim();
  }

  function waitlistEndpoint(){
    const endpoint=endpointFromPage();
    if(!/^(https?:\/\/|\/)/.test(endpoint))return '';
    try{
      const url=new URL(endpoint,window.location.origin);
      url.pathname=url.pathname.replace(/\/events\/?$/,'/waitlist');
      url.search='';
      url.hash='';
      return url.origin===window.location.origin?url.pathname:url.toString();
    }catch(error){
      return endpoint.replace(/\/events\/?$/,'/waitlist');
    }
  }

  function sessionId(){
    try{
      const current=sessionStorage.getItem(SESSION_KEY);
      if(current)return current;
      const next=window.crypto?.randomUUID?.()||('growth-'+Date.now().toString(36)+'-'+Math.random().toString(16).slice(2));
      sessionStorage.setItem(SESSION_KEY,next);
      return next;
    }catch(error){
      return 'growth-'+Date.now().toString(36)+'-'+Math.random().toString(16).slice(2);
    }
  }

  function referrerHost(){
    try{return document.referrer?new URL(document.referrer).host:'';}
    catch(error){return '';}
  }

  function viewport(){
    return window.innerWidth<640?'mobile':(window.innerWidth<980?'tablet':'desktop');
  }

  function track(eventName,detail){
    try{window.MimirGrowthEvents?.track?.(eventName,detail);}
    catch(error){}
  }

  function emailValid(value){
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value||'').trim());
  }

  async function submitSignup(event){
    event.preventDefault();
    const endpoint=waitlistEndpoint();
    const email=String(emailEl?.value||'').trim();
    const useCase=String(useCaseEl?.value||'').trim();
    const consent=consentEl?.checked===true;

    if(!emailValid(email)){
      setStatus('Enter a valid email address.','error');
      emailEl?.focus();
      track('beta_signup_error',{source:'beta-form',reason:'invalid_email'});
      return;
    }
    if(!consent){
      setStatus('Confirm contact consent to join the beta list.','error');
      consentEl?.focus();
      track('beta_signup_error',{source:'beta-form',reason:'missing_consent'});
      return;
    }
    if(!endpoint){
      setStatus('Beta signup is not available yet. Email hello@mmir.ai instead.','error');
      track('beta_signup_error',{source:'beta-form',reason:'missing_endpoint'});
      return;
    }

    submitEl.disabled=true;
    setStatus('Joining beta list...','loading');
    track('beta_signup_submit',{source:'beta-form',target:'waitlist'});

    try{
      const response=await fetch(endpoint,{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        credentials:'omit',
        mode:'cors',
        body:JSON.stringify({
          email,
          use_case:useCase,
          consent,
          source:'beta-form',
          target:'waitlist',
          path:window.location.pathname,
          hash:window.location.hash,
          referrer_host:referrerHost(),
          viewport:viewport(),
          demo_active:document.body.classList.contains('mimir-demo-active'),
          session_id:sessionId()
        })
      });
      if(!response.ok){
        let code='request_failed';
        try{code=(await response.json())?.error?.code||code;}catch(error){}
        throw new Error(code);
      }
      setStatus('You are on the beta list.','success');
      track('beta_signup_success',{source:'beta-form',target:'waitlist'});
      form.reset();
    }catch(error){
      setStatus('Could not join yet. Email hello@mmir.ai instead.','error');
      track('beta_signup_error',{source:'beta-form',reason:String(error?.message||'request_failed').slice(0,80)});
    }finally{
      submitEl.disabled=false;
    }
  }

  form.addEventListener('submit',submitSignup);
})();
