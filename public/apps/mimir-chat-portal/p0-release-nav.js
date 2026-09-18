(function(){
  'use strict';
  const scriptUrl=document.currentScript?.src||new URL('./apps/mimir-chat-portal/p0-release-nav.js',document.baseURI).href;
  let skinModule=null;
  let intent=0;
  let forwarding=false;
  let notice=null;
  let toggle=null;
  const parse=value=>String(value||'').match(/^\s*@(jarvis|chat)(?=\s|$)\s*([\s\S]*)$/i);
  function inform(text){if(notice)notice.textContent=text;}
  function loadSkin(){
    if(window.MmirJarvisSkin)return Promise.resolve(window.MmirJarvisSkin);
    if(skinModule)return skinModule;
    skinModule=new Promise((resolve,reject)=>{
      const script=document.createElement('script');
      script.src=new URL('p0-jarvis-skin.js?v=20260918-jarvis-v1',scriptUrl).href;
      script.async=true;
      const timeout=setTimeout(()=>{script.remove();reject(new Error('Jarvis tok for lang tid å laste.'));},10000);
      script.onload=()=>{
        clearTimeout(timeout);
        if(window.MmirJarvisSkin)resolve(window.MmirJarvisSkin);
        else reject(new Error('Jarvis-modulen svarte ikke.'));
      };
      script.onerror=()=>{clearTimeout(timeout);script.remove();reject(new Error('Jarvis kunne ikke lastes. Vanlig chat er beholdt.'));};
      document.head.appendChild(script);
    }).catch(error=>{skinModule=null;throw error;});
    return skinModule;
  }
  async function choose(skin,draft=null,tail=''){
    const ticket=++intent;
    const input=document.getElementById('p0-input');
    inform(skin==='jarvis'?'Åpner Jarvis …':'Bytter til chat …');
    try{
      if(skin==='jarvis'||window.MmirJarvisSkin){
        const module=await loadSkin();
        if(ticket!==intent)return;
        await module.setSkin(skin);
      }
      if(ticket!==intent)return;
      inform(skin==='jarvis'?'Jarvis · samme MMIR-samtale':'Vanlig chat · samtalen er beholdt');
      if(toggle){toggle.textContent=skin==='jarvis'?'Chat':'Jarvis';toggle.setAttribute('aria-pressed',skin==='jarvis'?'true':'false');}
      if(draft!==null&&input&&input.value===draft){
        input.value=tail;
        input.dispatchEvent(new Event('input',{bubbles:true}));
        const form=document.getElementById('p0-composer');
        const send=document.getElementById('p0-send');
        if(tail&&form?.getAttribute('aria-busy')!=='true'&&send&&!send.disabled){
          forwarding=true;
          try{form.requestSubmit();}finally{forwarding=false;}
        }else if(tail)inform('Visningen er byttet. Spørsmålet er bevart i feltet; send når chatten er klar.');
      }else if(draft!==null)inform('Visningen er byttet. Det redigerte utkastet er ikke sendt.');
    }catch(error){if(ticket===intent)inform(error.message||'Visningen kunne ikke byttes. Utkastet er beholdt.');}
  }
  function intercept(event){
    if(forwarding)return;
    const input=document.getElementById('p0-input');
    if(event.type==='submit'){
      if(event.target!==document.getElementById('p0-composer'))return;
    }else if(event.target!==input||event.key!=='Enter'||event.shiftKey||event.isComposing||event.keyCode===229)return;
    const match=parse(input?.value);
    if(!match)return;
    // Capture before the P0 form handler: UI-only commands never reach a model.
    event.preventDefault();event.stopImmediatePropagation();
    choose(match[1].toLowerCase(),input.value,match[2].trim());
  }
  function install(){
    const topbar=document.querySelector('#mmir-p0-app .p0-topbar');
    if(!topbar||topbar.querySelector('.p0-release-nav'))return Boolean(topbar);
    const nav=document.createElement('nav');
    nav.className='p0-release-nav';
    nav.setAttribute('aria-label','MMIR 0.2');
    const links=[
      ['./mmir.html','Prøv','page'],
      ['./modeller/','Modeller',''],
      ['./kapabiliteter/','Kapabiliteter',''],
      ['./tillit/','Tillit','']
    ];
    links.forEach(function(item){
      const link=document.createElement('a');
      link.href=item[0];
      link.textContent=item[1];
      if(item[2])link.setAttribute('aria-current',item[2]);
      nav.appendChild(link);
    });
    toggle=document.createElement('button');toggle.type='button';toggle.textContent='Jarvis';
    toggle.id='mmir-jarvis-toggle';toggle.setAttribute('aria-label','Bytt mellom Jarvis og vanlig chat');
    toggle.setAttribute('aria-pressed','false');
    toggle.addEventListener('click',()=>choose(document.getElementById('mmir-p0-app')?.dataset.mmirSkin==='jarvis'?'chat':'jarvis'));
    nav.appendChild(toggle);
    const tag=document.createElement('span');
    tag.className='p0-release-tag';
    tag.textContent='0.2 Beta';
    nav.appendChild(tag);
    notice=document.createElement('span');notice.id='mmir-jarvis-switch-status';
    notice.setAttribute('role','status');notice.setAttribute('aria-live','polite');
    topbar.appendChild(notice);
    const truth=topbar.querySelector('.p0-topbar-truth');
    topbar.insertBefore(nav,truth||null);
    document.addEventListener('submit',intercept,true);
    document.addEventListener('keydown',intercept,true);
    window.addEventListener('mmir-skin-changed',event=>{
      const jarvis=event.detail?.skin==='jarvis';
      toggle.textContent=jarvis?'Chat':'Jarvis';toggle.setAttribute('aria-pressed',jarvis?'true':'false');
    });
    return true;
  }
  if(!install())window.addEventListener('DOMContentLoaded',install,{once:true});
})();
