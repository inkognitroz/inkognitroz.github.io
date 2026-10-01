(function(){
  const STORAGE_KEY='mmir-appearance-v1';
  const VALID=new Set(['system','light','dark']);
  const root=document.documentElement;
  let observer=null;

  function readPreference(){
    try{
      const value=localStorage.getItem(STORAGE_KEY)||'system';
      return VALID.has(value)?value:'system';
    }catch(error){
      return 'system';
    }
  }

  function resolvedTheme(preference=readPreference()){
    if(preference==='light'||preference==='dark')return preference;
    return window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';
  }

  function applyTheme(preference=readPreference()){
    const safe=VALID.has(preference)?preference:'system';
    const resolved=resolvedTheme(safe);
    root.dataset.mmirAppearance=safe;
    root.dataset.mmirTheme=resolved;
    root.style.colorScheme=resolved;
    window.dispatchEvent(new CustomEvent('mmir-appearance-changed',{detail:{preference:safe,resolved}}));
    return {preference:safe,resolved};
  }

  function writePreference(preference){
    const safe=VALID.has(preference)?preference:'system';
    try{localStorage.setItem(STORAGE_KEY,safe);}catch(error){}
    return applyTheme(safe);
  }

  function button(preference,label,detail){
    const current=readPreference();
    const selected=current===preference?' <span class="p0-badge">Valgt</span>':'';
    return '<button type="button" data-mmir-appearance="'+preference+'"><span class="p0-menu-row"><strong>'+label+'</strong>'+selected+'</span><small>'+detail+'</small></button>';
  }

  function injectAppearanceControls(){
    const menu=document.getElementById('p0-privacy-menu');
    if(!menu||menu.hidden||menu.querySelector('[data-mmir-appearance-section]'))return;
    const section=document.createElement('div');
    section.setAttribute('data-mmir-appearance-section','');
    section.innerHTML=''+
      '<div class="p0-menu-separator"></div>'+
      '<div class="p0-menu-section">Utseende</div>'+
      button('system','System','Følg lys/mørk innstilling på enheten.')+
      button('light','Lys','Bruk lyst MMIR-grensesnitt.')+
      button('dark','Mørk','Bruk mørkt MMIR-grensesnitt.');
    menu.appendChild(section);
    section.querySelectorAll('[data-mmir-appearance]').forEach(control=>{
      control.addEventListener('click',()=>{
        writePreference(control.getAttribute('data-mmir-appearance'));
        section.remove();
        injectAppearanceControls();
      });
    });
  }

  function bindObserver(){
    if(observer)return;
    observer=new MutationObserver(()=>injectAppearanceControls());
    observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden']});
  }

  const media=window.matchMedia?window.matchMedia('(prefers-color-scheme: dark)'):null;
  if(media){
    const sync=()=>{if(readPreference()==='system')applyTheme('system');};
    if(typeof media.addEventListener==='function')media.addEventListener('change',sync);
    else if(typeof media.addListener==='function')media.addListener(sync);
  }

  window.MimirAppearance={readPreference,writePreference,applyTheme,resolvedTheme};
  applyTheme();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{bindObserver();injectAppearanceControls();},{once:true});
  else{bindObserver();injectAppearanceControls();}
})();