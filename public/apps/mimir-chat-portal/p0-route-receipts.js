(function(){
  const version='20260606-b1-06-p0-route-receipts-v1';

  function hostedRouteLabel(apiLabel='api.mmir.ai'){
    return 'Supergenious · Free · '+String(apiLabel||'api.mmir.ai');
  }

  function displayName(model){
    return String(model?.display_name||model?.name||model?.label||model?.id||'Supergenious').trim();
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
      detail:'Hosted MMIR free route. No provider key is stored in the browser. No paid route started. Choose Private local to keep prompts on this device.',
      state:'hosted'
    };
  }

  function p0TrustUxReady(){
    return typeof document!=='undefined'&&document.getElementById('mmir-p0-app');
  }

  function trustLineText(){
    return 'Free hosted route active. Your prompt is sent to MMIR’s hosted free route. No provider key or paid route is used. Choose Private local to keep prompts on this device.';
  }

  function ensureTrustLine(){
    if(!p0TrustUxReady())return false;
    const form=document.getElementById('p0-composer');
    const route=document.getElementById('p0-route');
    if(!form||!route||form.querySelector('[data-mmir-p0-trust-line]'))return true;
    const line=document.createElement('div');
    line.setAttribute('data-mmir-p0-trust-line','true');
    line.className='p0-trust-line';
    line.textContent=trustLineText();
    line.style.cssText='font-size:12px;line-height:1.35;color:rgba(226,232,240,.76);padding:0 4px 6px 4px;';
    route.insertAdjacentElement('afterend',line);
    return true;
  }

  function ensureOnboardingCards(){
    if(!p0TrustUxReady())return false;
    const empty=document.querySelector('#p0-transcript .p0-empty');
    if(!empty||empty.querySelector('[data-mmir-p0-onboarding]'))return true;
    const cards=document.createElement('div');
    cards.setAttribute('data-mmir-p0-onboarding','true');
    cards.className='p0-onboarding-cards';
    cards.style.cssText='display:grid;gap:8px;margin-top:18px;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));';
    cards.innerHTML=[
      ['start-now','Start now','Ask with Supergenious.'],
      ['go-private','Go private','Connect this computer as a local model node.'],
      ['trust-check','Trust check','See what leaves the browser and what stays local.']
    ].map(card=>'<button type="button" data-mmir-p0-ux-action="'+card[0]+'" style="text-align:left;border:1px solid rgba(148,163,184,.24);border-radius:14px;background:rgba(15,23,42,.72);color:inherit;padding:12px;cursor:pointer;"><strong style="display:block;margin-bottom:4px;">'+card[1]+'</strong><span style="font-size:12px;color:rgba(226,232,240,.72);">'+card[2]+'</span></button>').join('');
    empty.appendChild(cards);
    return true;
  }

  function ensureInstallChecklist(){
    if(!p0TrustUxReady())return false;
    document.querySelectorAll('.p0-command-card:not([data-mmir-p0-install-checklist])').forEach(card=>{
      card.setAttribute('data-mmir-p0-install-checklist','true');
      const checklist=document.createElement('div');
      checklist.className='p0-install-checklist';
      checklist.style.cssText='margin-top:10px;font-size:12px;line-height:1.45;color:rgba(226,232,240,.78);';
      checklist.innerHTML='<ol style="margin:0 0 8px 18px;padding:0;"><li>Command copied or selected.</li><li>Run it in Terminal or PowerShell.</li><li>Wait for “MMIR Local Connector is ready”.</li><li>Return here and press Check this device.</li></ol><button type="button" data-mmir-p0-ux-action="check-device" style="border:1px solid rgba(148,163,184,.32);border-radius:999px;background:rgba(30,41,59,.82);color:inherit;padding:6px 10px;cursor:pointer;">I installed it — check this device</button>';
      card.appendChild(checklist);
    });
    return true;
  }

  function ensureAddMenuCta(){
    if(!p0TrustUxReady())return false;
    const menu=document.getElementById('p0-add-menu');
    if(!menu||menu.hidden||menu.querySelector('[data-mmir-p0-updates-cta]'))return true;
    const cta=document.createElement('div');
    cta.setAttribute('data-mmir-p0-updates-cta','true');
    cta.className='p0-menu-note';
    cta.innerHTML='<strong>Get local model updates</strong><small>Leave email for Local Node, private model routing and team beta access.</small><a href="mailto:hello@mmir.ai?subject=MMIR.ai%20local%20model%20updates" style="display:block;margin-top:8px;color:inherit;text-decoration:underline;">Email hello@mmir.ai</a>';
    menu.appendChild(cta);
    return true;
  }

  function setComposerPrompt(prompt,send=false){
    const input=document.getElementById('p0-input');
    if(!input)return;
    input.value=prompt;
    input.dispatchEvent(new Event('input',{bubbles:true}));
    input.focus();
    if(send)document.getElementById('p0-send')?.click();
  }

  function openCheckLocal(){
    const add=document.getElementById('p0-add');
    add?.click();
    setTimeout(()=>{
      const check=document.querySelector('#p0-add-menu [data-p0-action="check-local"]');
      check?.click();
    },50);
  }

  function bindTrustUxActions(){
    if(typeof document==='undefined'||document.documentElement.dataset.mmirP0TrustUxBound==='true')return;
    document.documentElement.dataset.mmirP0TrustUxBound='true';
    document.addEventListener('submit',event=>{
      if(event.target?.id!=='p0-composer')return;
      const input=document.getElementById('p0-input');
      if(input&&!String(input.value||'').trim())input.value='What can MMIR do for me?';
    },true);
    document.addEventListener('keydown',event=>{
      if(event.target?.id!=='p0-input'||event.key!=='Enter'||event.shiftKey)return;
      const input=event.target;
      if(!String(input.value||'').trim())input.value='What can MMIR do for me?';
    },true);
    document.addEventListener('click',event=>{
      const action=event.target?.closest?.('[data-mmir-p0-ux-action]')?.getAttribute('data-mmir-p0-ux-action');
      if(!action)return;
      event.preventDefault();
      if(action==='start-now')setComposerPrompt('Start with Supergenious. Tell me what is active now and what I can connect next.',true);
      if(action==='go-private')setComposerPrompt('Show the easiest way to connect a private local model to MMIR on this device.',false);
      if(action==='trust-check')setComposerPrompt('Explain what leaves the browser, what stays local, and whether any paid route is used in MMIR right now.',false);
      if(action==='check-device')openCheckLocal();
    },true);
  }

  function enhanceP0TrustUx(){
    bindTrustUxActions();
    const ok=ensureTrustLine();
    ensureOnboardingCards();
    ensureInstallChecklist();
    ensureAddMenuCta();
    return ok;
  }

  function scheduleP0TrustUx(){
    if(typeof document==='undefined')return;
    let passes=0;
    const tick=()=>{
      enhanceP0TrustUx();
      passes+=1;
      if(passes<80)setTimeout(tick,250);
    };
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',tick,{once:true});
    else tick();
    if(typeof MutationObserver!=='undefined'){
      const observer=new MutationObserver(()=>enhanceP0TrustUx());
      observer.observe(document.documentElement,{childList:true,subtree:true});
      setTimeout(()=>observer.disconnect(),60000);
    }
  }

  window.MimirP0RouteReceipts={
    version,
    hostedRouteLabel,
    displayName,
    receipt,
    trustLineText,
    enhanceP0TrustUx
  };

  scheduleP0TrustUx();
  window.dispatchEvent?.(new CustomEvent('mimir-p0-route-receipts-ready',{detail:{version}}));
})();
