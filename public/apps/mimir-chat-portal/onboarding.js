(function(){
  const PROFILE_KEY='mimir-chat-backend-profiles';
  const ACTIVE_KEY='mimir-chat-active-backend';
  const CHAT_KEY='mimir-chat-current-session-v1';
  const chatCenter=document.querySelector('.mimir-chat-center');

  function readProfiles(){try{const value=JSON.parse(localStorage.getItem(PROFILE_KEY)||'[]');return Array.isArray(value)?value:[];}catch(error){return [];}}
  function activeProfile(){const id=localStorage.getItem(ACTIVE_KEY)||'';return readProfiles().find(profile=>profile.id===id)||null;}
  function statusOf(profile){return String(profile?.health||'unknown').toLowerCase();}
  function hasFirstPrompt(){
    try{
      const value=JSON.parse(localStorage.getItem(CHAT_KEY)||'[]');
      if(!Array.isArray(value))return false;
      const hasUser=value.some(message=>message?.role==='user'&&String(message.content||'').trim());
      const hasAnswer=value.some(message=>message?.role==='assistant'&&String(message.content||'').trim()&&message.content!=='Thinking...');
      return hasUser&&hasAnswer;
    }catch(error){
      return false;
    }
  }

  function step(label,done,current,detail,target){
    const item=document.createElement('a');
    item.className='onboarding-step '+(done?'is-done':'is-open')+(current?' is-current':'');
    item.href=target||'#backend-settings';
    item.setAttribute('aria-label',label+': '+(done?'done':current?'next':'pending')+'. '+detail);
    if(current)item.setAttribute('aria-current','step');
    item.innerHTML='<span>'+(done?'Done':current?'Next':'Soon')+'</span><strong></strong><small></small>';
    item.querySelector('strong').textContent=label;
    item.querySelector('small').textContent=detail;
    return item;
  }

  function render(){
    if(!chatCenter)return;
    let panel=document.getElementById('first-run-onboarding');
    if(!panel){
      panel=document.createElement('section');
      panel.id='first-run-onboarding';
      panel.className='mimir-onboarding';
      panel.setAttribute('aria-label','First run checklist');
      panel.setAttribute('aria-live','polite');
      const quick=document.querySelector('.quick-suggestions');
      if(quick&&quick.nextSibling)chatCenter.insertBefore(panel,quick.nextSibling);else chatCenter.appendChild(panel);
    }

    const profiles=readProfiles();
    const active=activeProfile();
    const health=statusOf(active);
    const hasProfile=profiles.length>0;
    const hasActive=Boolean(active);
    const ready=health==='ready';
    const degraded=health==='degraded'||health==='offline'||health==='testing';
    const sent=hasFirstPrompt();

    const steps=[
      {label:'Create backend profile',done:hasProfile,detail:hasProfile?'A local or trusted backend profile exists.':'Start with MMIR Local Node on 127.0.0.1.',target:'#backend-settings'},
      {label:'Set active backend',done:hasActive,detail:hasActive?(active.name||'Backend is active'):'Select the profile and click Set active.',target:'#backend-settings'},
      {label:'Discover live model',done:ready,detail:ready?(active.models||'Model discovered'):(degraded?'Backend reached but needs attention.':'Run local node, refresh, then pair/discover models.'),target:'#local-connector'},
      {label:'Send first prompt',done:sent,detail:sent?'First chat is saved locally.':(ready?'Type a prompt and press Send.':'Finish backend setup, then send the first prompt.'),target:'#mimir-prompt'}
    ];
    const firstOpen=steps.findIndex(item=>!item.done);

    const heading=document.createElement('div');
    heading.className='onboarding-heading';
    heading.innerHTML='<p class="eyebrow">First run</p><h2>Get to your first local answer</h2>';

    const grid=document.createElement('div');
    grid.className='onboarding-grid';
    steps.forEach((item,index)=>grid.append(step(item.label,item.done,index===firstOpen,item.detail,item.target)));

    panel.innerHTML='';
    panel.append(heading,grid);
  }

  window.addEventListener('mmir-backend-profiles-updated',render);
  window.addEventListener('storage',render);
  window.addEventListener('focus',render);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',render);else render();
})();
