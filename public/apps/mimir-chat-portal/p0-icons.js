(function(){
  const version='20260606-b1-06-p0-icons-v1';
  const shield='<svg class="p0-icon p0-icon-shield" aria-hidden="true" viewBox="0 0 24 24"><path d="M12 3 19 6v5c0 5-3.1 8.2-7 10-3.9-1.8-7-5-7-10V6l7-3Z"></path><path d="m9.5 12 1.7 1.7 3.5-4"></path></svg>';
  const mic='<svg class="p0-icon p0-icon-mic" aria-hidden="true" viewBox="0 0 24 24"><path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z"></path><path d="M19 11v1a7 7 0 0 1-14 0v-1"></path><path d="M12 19v3"></path><path d="M8 22h8"></path></svg>';

  window.MimirP0Icons={
    version,
    shield,
    mic
  };

  window.dispatchEvent?.(new CustomEvent('mimir-p0-icons-ready',{detail:{version}}));
})();
