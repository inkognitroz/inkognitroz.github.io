(function(){
  const ROLE_KEY='mimir-chat-active-role';
  const grid=document.getElementById('role-preset-grid');
  let cachedRoles=[];
  if(!grid)return;

  function safe(value){return String(value||'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');}

  function activeRoleId(){
    try{return String(JSON.parse(localStorage.getItem(ROLE_KEY)||'null')?.id||'');}
    catch(error){return '';}
  }

  function writeActiveRole(role){
    if(!role)return;
    const value={
      id:String(role.id||'custom'),
      label:String(role.label||role.id||'Role'),
      instruction:String(role.instruction||''),
      short_description:String(role.short_description||''),
      updatedAt:new Date().toISOString()
    };
    localStorage.setItem(ROLE_KEY,JSON.stringify(value));
    window.dispatchEvent(new CustomEvent('mmir-active-role-changed',{detail:value}));
    render(cachedRoles);
  }

  function clearActiveRole(){
    localStorage.removeItem(ROLE_KEY);
    window.dispatchEvent(new CustomEvent('mmir-active-role-changed',{detail:null}));
    render(cachedRoles);
  }

  function render(roles){
    cachedRoles=Array.isArray(roles)?roles:[];
    if(!cachedRoles.length){
      grid.innerHTML='<p class="empty-backends">Role presets are not available yet.</p>';
      return;
    }
    const selectedId=activeRoleId();
    grid.innerHTML=cachedRoles.map(role=>{
      const bestFor=Array.isArray(role.best_for)?role.best_for:[];
      const selected=String(role.id||'')===selectedId;
      return '<article class="provider-card role-card'+(selected?' is-active':'')+'">'+
        '<div class="provider-card-header"><h3>'+safe(role.label||role.id)+'</h3><span class="provider-status '+(selected?'status-online':'status-planned')+'">'+(selected?'active':'preset')+'</span></div>'+
        '<p>'+safe(role.short_description||'Instruction preset for multi-model workflows.')+'</p>'+
        '<small>'+safe(role.instruction||'')+'</small>'+
        '<div class="provider-capabilities">'+bestFor.map(item=>'<span>'+safe(item)+'</span>').join('')+'</div>'+
        '<button type="button" data-role-id="'+safe(role.id||'')+'">'+(selected?'Use without role':'Use role')+'</button>'+
      '</article>';
    }).join('');

    grid.querySelectorAll('button[data-role-id]').forEach(button=>{
      button.addEventListener('click',()=>{
        const id=button.getAttribute('data-role-id')||'';
        if(id&&id===activeRoleId()){clearActiveRole();return;}
        const role=cachedRoles.find(item=>String(item.id||'')===id);
        writeActiveRole(role);
      });
    });
  }

  async function init(){
    try{
      const response=await fetch('./model-role-presets.json',{cache:'default'});
      if(!response.ok)throw new Error('role presets unavailable');
      const data=await response.json();
      render(data.roles||[]);
    }catch(error){
      render([
        {id:'architect',label:'Architect',short_description:'Designs solution structure and trade-offs.',instruction:'Focus on architecture, interfaces and maintainability.',best_for:['architecture','interfaces','zero trust']},
        {id:'critic',label:'Critic',short_description:'Challenges weak assumptions.',instruction:'Find gaps and propose improvements.',best_for:['review','risk','quality']},
        {id:'synthesizer',label:'Synthesizer',short_description:'Combines answers into one recommendation.',instruction:'Synthesize outputs from several models.',best_for:['final answer','comparison','summary']}
      ]);
    }
  }

  window.addEventListener('storage',()=>render(cachedRoles));
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
  else init();
})();
