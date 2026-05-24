(function(){const d=document,w=window,P='#mimir-prompt',R='#mimir-chat-runtime',L='#local-connector',C='#connect-options',AS='a[href="#mimir-prompt"],a[href="#mimir-chat-runtime"],a[href="#local-connector"],a[href="#connect-options"],a[href="#backend-settings"]',q=s=>d.querySelector(s),qa=s=>d.querySelectorAll(s);function setAttr(e,n,v){if(e&&e.getAttribute(n)!==v)e.setAttribute(n,v)}function repairPrimarySend(){const link=q('#primary-chat-link');if(!link)return;link.classList.remove('disabled');setAttr(link,'href',R);setAttr(link,'role','button');setAttr(link,'aria-disabled','false');link.removeAttribute('target');link.removeAttribute('rel')}function normalizeTarget(target){return target===C&&!q(C)?L:target}function openElement(e){if(!e)return false;for(let x=e;x;x=x.parentElement?.closest?.('details'))'open'in x&&(x.open=true);e.scrollIntoView();return true}function openTarget(target){const n=normalizeTarget(target);if((target===L||target===C||n===L)&&w.MimirBackendProfiles?.ensureFreeLocalProfile)w.MimirBackendProfiles.ensureFreeLocalProfile();const f=()=>openElement(q(target)||q(n));if(!f()&&w.MimirLoadDeferred)w.MimirLoadDeferred().then(f)}function focusChatTarget(){const prompt=q(P),runtime=q(R);openElement(runtime||prompt);prompt&&prompt.focus({preventScroll:true});w.dispatchEvent(new CustomEvent('mmir-mobile-chat-target-opened',{detail:{target:runtime?R:P}}))}function sendPrompt(v){const prompt=q(P);if(!prompt)return false;prompt.value=String(v||'').trim();prompt.dispatchEvent(new Event('input',{bubbles:1}));prompt.dispatchEvent(new Event('change',{bubbles:1}));focusChatTarget();repairPrimarySend();setTimeout(()=>q('#primary-chat-link')?.click(),40);return true}function bindPrimaryAnchors(){qa('a[href="#mimir-chat-runtime"]').forEach(link=>{if(link.id!=='primary-chat-link')setAttr(link,'href',P)});qa('a[href="#connect-options"]').forEach(link=>{if(!q(C))setAttr(link,'href',L)});qa(AS).forEach(link=>link.dataset.runtimeAnchorBound='true')}function handleMobileTap(event){const p=event.target.closest?.('[data-prompt-action]');if(p&&p.dataset.firstImpressionBound!=='true'){event.preventDefault();sendPrompt(p.dataset.prompt||p.textContent||'Help me get started with MMIR.');return}const a=event.target.closest?.('#activation-chat-now,#activation-connect-local,#activation-open-models,#activation-open-node-dashboard');if(a&&a.dataset.firstImpressionBound!=='true'){event.preventDefault();if(a.id==='activation-chat-now')sendPrompt('Start free chat.');else openTarget(a.id==='activation-connect-local'?C:a.id==='activation-open-models'?'#model-library':'#node-dashboard');return}const n=event.target.closest?.(AS);if(!n||n.id==='primary-chat-link')return;const t=n.getAttribute('href')||P;if(t[0]!=='#')return;event.preventDefault();if(t===P||t===R)focusChatTarget();else openTarget(t)}function repairMobileFirstChatDom(){const center=q('.mimir-chat-center'),instant=q('#mimir-instant-start'),composer=q('.mimir-composer'),quick=q('.quick-suggestions');if(!center||!instant||!composer)return;if(instant.compareDocumentPosition(composer)&Node.DOCUMENT_POSITION_FOLLOWING)center.insertBefore(composer,instant);if(quick&&(instant.compareDocumentPosition(quick)&Node.DOCUMENT_POSITION_FOLLOWING))center.insertBefore(quick,instant);composer.dataset.mobileFirstChatReady='true'}function run(){repairPrimarySend();repairMobileFirstChatDom();bindPrimaryAnchors()}d.readyState==='loading'?d.addEventListener('DOMContentLoaded',run):run();d.addEventListener('click',handleMobileTap,true);w.addEventListener('load',run,{once:true});let checks=0,timer=setInterval(()=>{run();if(++checks>=30)clearInterval(timer)},500)})();
(function(){
  const w=window,d=document,key='__MimirLocalProbeAllowedUntil';
  function loopback(input){
    try{
      const url=new URL(String(typeof input==='string'?input:input?.url||''),w.location.href);
      return ['127.0.0.1','localhost','::1'].includes(url.hostname);
    }catch(error){
      return false;
    }
  }
  function returnIntent(){
    const params=new URLSearchParams(w.location.search||'');
    const hash=String(w.location.hash||'').toLowerCase();
    return params.get('mmir_local_return')==='1'||params.get('local_node_ready')==='1'||hash.includes('local-connector-ready')||hash.includes('mmir-local-ready');
  }
  function allow(reason='manual',ms=30000){
    w[key]=Math.max(Number(w[key]||0),Date.now()+ms);
    w.dispatchEvent(new CustomEvent('mmir-local-probe-allowed',{detail:{reason,expires_at:new Date(w[key]).toISOString()}}));
  }
  if(!w.MimirAllowLocalProbes)w.MimirAllowLocalProbes=allow;
  const originalFetch=w.fetch;
  if(originalFetch&&!w.__MimirQuietFirstPaintFetchGuard){
    w.__MimirQuietFirstPaintFetchGuard=true;
    w.fetch=function(input,init){
      if(loopback(input)&&Date.now()>Number(w[key]||0)&&!returnIntent()){
        const error=new Error('Local node probe deferred until installer, Refresh, or explicit connect action.');
        error.code='local_probe_deferred';
        return Promise.reject(error);
      }
      return originalFetch.apply(this,arguments);
    };
  }
  d.addEventListener('click',event=>{
    const target=event.target?.closest?.('#runtime-refresh,#refresh-node-dashboard,#refresh-platform-status,#progress-activation-autopilot,#primary-chat-link,[data-local-action="refresh"],[data-local-action="tunnel"],[data-local-action="stop-tunnel"],[data-proof-action="retry"]');
    if(target)allow('user-click',30000);
  },true);
  if(returnIntent())allow('installer-return',60000);
})();