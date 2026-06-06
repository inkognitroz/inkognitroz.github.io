(function(){
  function text(value){
    return String(value||'')
      .replaceAll('&','&amp;')
      .replaceAll('<','&lt;')
      .replaceAll('>','&gt;');
  }

  function attr(value){
    return text(value).replaceAll('"','&quot;');
  }

  function title(value){
    return '<div class="p0-menu-title">'+text(value)+'</div>';
  }

  function section(value){
    return '<div class="p0-menu-section">'+text(value)+'</div>';
  }

  function separator(){
    return '<div class="p0-menu-separator"></div>';
  }

  function button(action,label,detail='',options={}){
    const className=options.className?' class="'+attr(options.className)+'"':'';
    const badge=options.badge?'<span class="p0-badge">'+text(options.badge)+'</span>':'';
    const row='<span class="p0-menu-row"><strong>'+text(label)+'</strong>'+badge+'</span>';
    const small=detail?'<small>'+text(detail)+'</small>':'';
    return '<button'+className+' type="button" data-p0-action="'+attr(action)+'">'+row+small+'</button>';
  }

  window.MimirP0Menu={
    title,
    section,
    separator,
    button
  };
})();
