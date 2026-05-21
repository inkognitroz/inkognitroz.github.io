(function(){
  const PROFILE_KEY='mimir-chat-backend-profiles';
  const ACTIVE_KEY='mimir-chat-active-backend';
  const chatCenter=document.querySelector('.mimir-chat-center');

  function readProfiles(){try{const value=JSON.parse(localStorage.getItem(PROFILE_KEY)||'[]');return Array.isArray(value)?value:[];}catch(error){return [];}}
  function activeProfile(){const id=localStorage.getItem(ACTIVE_KEY)||'';return readProfiles().find(profile=>profile.id===id)||null;}
  function statusOf(profile){return String(profile?.health||'unknown').toLowerCase();}

  function step(label,done,detail,target){
    const item=document.createElement('a');
    item.className='onboarding-step '+(done?'is-done':'is-open');
    item.href=target||'#backend-settings';
    item.innerHTML='<span>'+(done?'Done':'Next')+'</span><strong></strong><small></small>';
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

    const heading=document.createElement('div');
    heading.className='onboarding-heading';
    heading.innerHTML='<p class="eyebrow">First run</p><h2>Get to your first local answer</h2>';

    const grid=document.createElement('div');
    grid.className='onboarding-grid';
    grid.append(
      step('Create backend profile',hasProfile,hasProfile?'A local or trusted backend profile exists.':'Start with MMIR Local Node on 127.0.0.1.','#backend-settings'),
      step('Set active backend',hasActive,hasActive?(active.name||'Backend is active'):'Select the profile and click Set active.','#backend-settings'),
      step('Discover live model',ready,ready?(active.models||'Model discovered'):(degraded?'Backend reached but needs attention.':'Run local node, refresh, then pair/discover models.'),'#local-connector'),
      step('Send first prompt',false,'When Backend ready appears, type a prompt and press Send.','#mimir-prompt')
    );

    panel.innerHTML='';
    panel.append(heading,grid);
  }

  window.addEventListener('mmir-backend-profiles-updated',render);
  window.addEventListener('storage',render);
  window.addEventListener('focus',render);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',render);else render();
})();
