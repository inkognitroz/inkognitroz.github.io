(function(){
  const version='20260606-b1-06-p0-text-v1';

  function safeText(value){
    return String(value||'').replace(/[&<>"']/g,(char)=>({
      '&':'&amp;',
      '<':'&lt;',
      '>':'&gt;',
      '"':'&quot;',
      "'":'&#39;'
    }[char]));
  }

  function safeAttr(value){
    return safeText(value);
  }

  function paragraphs(text){
    return String(text||'')
      .split(/\n{2,}/)
      .map(part=>part.trim())
      .filter(Boolean)
      .map(part=>'<p>'+safeText(part)+'</p>')
      .join('')||'<p></p>';
  }

  function formatDuration(ms){
    const value=Math.max(0,Number(ms)||0);
    if(value<1000)return Math.round(value)+'ms';
    return (value/1000).toFixed(value<10000?1:0)+'s';
  }

  window.MimirP0Text={
    version,
    safeText,
    safeAttr,
    paragraphs,
    formatDuration
  };

  window.dispatchEvent?.(new CustomEvent('mimir-p0-text-ready',{detail:{version}}));
})();
