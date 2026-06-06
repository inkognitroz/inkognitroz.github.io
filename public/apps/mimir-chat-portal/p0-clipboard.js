(function(){
  const version='20260606-b1-06-p0-clipboard-v1';

  async function writeText(text){
    try{
      if(navigator.clipboard?.writeText){
        await navigator.clipboard.writeText(text);
        return true;
      }
    }catch(error){}
    const textarea=document.createElement('textarea');
    textarea.value=String(text||'');
    textarea.setAttribute('readonly','');
    textarea.style.position='fixed';
    textarea.style.left='-9999px';
    textarea.style.top='0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    try{
      return document.execCommand('copy');
    }catch(error){
      return false;
    }finally{
      textarea.remove();
    }
  }

  window.MimirP0Clipboard={
    version,
    writeText
  };

  window.dispatchEvent?.(new CustomEvent('mimir-p0-clipboard-ready',{detail:{version}}));
})();
