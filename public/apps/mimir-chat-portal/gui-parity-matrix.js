(function(){
  const root=document.getElementById('gui-parity-root');
  const summary=document.getElementById('gui-parity-summary');
  const refreshButton=document.getElementById('refresh-gui-parity');
  const DATA_URL='./gui-parity-matrix.json';

  if(!root)return;

  function setStatus(message,state){
    if(summary){
      summary.textContent=message||'';
      summary.dataset.state=state||'idle';
    }
  }

  function safe(value){
    return String(value||'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  }

  function statusClass(status){
    return 'status-'+String(status||'planned').toLowerCase().replace(/[^a-z0-9]+/g,'-');
  }

  function render(data){
    const groups=Array.isArray(data?.groups)?data.groups:[];
    root.innerHTML=groups.map(group=>''+
      '<section class="gui-parity-group">'+
        '<h3>'+safe(group.name)+'</h3>'+
        '<div class="gui-parity-grid">'+(Array.isArray(group.items)?group.items:[]).map(item=>''+
          '<article class="gui-parity-card '+safe(statusClass(item.status))+'">'+
            '<header><strong>'+safe(item.feature)+'</strong><span>'+safe(item.status)+'</span></header>'+
            '<p>'+safe(item.mmir)+'</p>'+
            '<dl>'+
              '<div><dt>Benchmark</dt><dd>'+safe(item.benchmark)+'</dd></div>'+
              '<div><dt>Next</dt><dd>'+safe(item.next)+'</dd></div>'+
            '</dl>'+
          '</article>').join('')+
        '</div>'+
      '</section>').join('');
    const total=groups.reduce((sum,group)=>sum+(Array.isArray(group.items)?group.items.length:0),0);
    setStatus('Parity matrix loaded: '+String(total)+' truthful feature states.','ready');
  }

  async function load(){
    setStatus('Loading parity matrix...','loading');
    try{
      const response=await fetch(DATA_URL,{cache:'no-store'});
      if(!response.ok)throw new Error('Parity matrix unavailable.');
      const data=await response.json();
      render(data);
    }catch(error){
      root.innerHTML='<p class="dashboard-note">Parity matrix could not load.</p>';
      setStatus(error?.message||'Parity matrix failed.','error');
    }
  }

  refreshButton?.addEventListener('click',load);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load);else load();
})();
