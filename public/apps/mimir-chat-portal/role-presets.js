(function(){
  const grid=document.getElementById('role-preset-grid');
  if(!grid)return;

  function safe(value){return String(value||'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');}

  function render(roles){
    if(!Array.isArray(roles)||!roles.length){
      grid.innerHTML='<p class="empty-backends">Role presets are not available yet.</p>';
      return;
    }
    grid.innerHTML=roles.map(role=>{
      const bestFor=Array.isArray(role.best_for)?role.best_for:[];
      return '<article class="provider-card role-card">'+
        '<div class="provider-card-header"><h3>'+safe(role.label||role.id)+'</h3><span class="provider-status status-planned">preset</span></div>'+
        '<p>'+safe(role.short_description||'Instruction preset for multi-model workflows.')+'</p>'+
        '<small>'+safe(role.instruction||'')+'</small>'+
        '<div class="provider-capabilities">'+bestFor.map(item=>'<span>'+safe(item)+'</span>').join('')+'</div>'+
      '</article>';
    }).join('');
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

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
  else init();
})();
