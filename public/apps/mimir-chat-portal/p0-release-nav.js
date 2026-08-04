(function(){
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
    const tag=document.createElement('span');
    tag.className='p0-release-tag';
    tag.textContent='0.2 Beta';
    nav.appendChild(tag);
    const truth=topbar.querySelector('.p0-topbar-truth');
    topbar.insertBefore(nav,truth||null);
    return true;
  }
  if(!install())window.addEventListener('DOMContentLoaded',install,{once:true});
})();
