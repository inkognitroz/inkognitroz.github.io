(function(){
  const version='20260611-custom-toolbar-icons-v1';
  const shield='<svg class="p0-icon p0-icon-shield" aria-hidden="true" viewBox="0 0 24 24"><path d="M12 3 19 6v5c0 5-3.1 8.2-7 10-3.9-1.8-7-5-7-10V6l7-3Z"></path><path d="m9.5 12 1.7 1.7 3.5-4"></path></svg>';
  const mic='<svg class="p0-icon p0-icon-mic" aria-hidden="true" viewBox="0 0 24 24"><path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z"></path><path d="M19 11v1a7 7 0 0 1-14 0v-1"></path><path d="M12 19v3"></path><path d="M8 22h8"></path></svg>';
  const flame='<svg class="p0-icon p0-icon-flame" aria-hidden="true" viewBox="0 0 24 24"><path d="M8.5 14.5c0 2 1.6 3.5 3.5 3.5s3.5-1.5 3.5-3.5c0-1.4-.7-2.5-1.8-3.2.1 1.1-.6 1.9-1.7 2.5.2-2.5-1-4.4-3.2-5.8.4 2.2-.8 3.4-1.8 4.8-.7.9-1 1.8-1 2.8C6 19.2 8.7 22 12 22s6-2.8 6-6.4c0-3.4-2.3-5.2-4.4-7.6-1.2-1.4-2.2-3-1.8-5.2C8.1 5.3 6 8.9 6 12.1"></path></svg>';
  const bubbles='<svg class="p0-icon p0-icon-bubbles" aria-hidden="true" viewBox="0 0 24 24"><path d="M7 15.5 4 18v-2.5H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v8.5a2 2 0 0 1-2 2H7Z"></path><path d="M11 11h8a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-1v2l-2.5-2H11a2 2 0 0 1-2-2v-1"></path></svg>';
  const brain='<svg class="p0-icon p0-icon-brain" aria-hidden="true" viewBox="0 0 24 24"><path d="M9 4.5a3 3 0 0 0-4 2.8A3.5 3.5 0 0 0 3.5 14 3.5 3.5 0 0 0 9 18.5V4.5Z"></path><path d="M15 4.5a3 3 0 0 1 4 2.8A3.5 3.5 0 0 1 20.5 14a3.5 3.5 0 0 1-5.5 4.5V4.5Z"></path><path d="M9 8H7.5"></path><path d="M15 8h1.5"></path><path d="M9 13H7"></path><path d="M15 13h2"></path></svg>';
  const stop='<svg class="p0-icon p0-icon-stop" aria-hidden="true" viewBox="0 0 24 24"><rect x="7" y="7" width="10" height="10" rx="2"></rect></svg>';

  window.MimirP0Icons={
    version,
    shield,
    mic,
    flame,
    bubbles,
    brain,
    stop
  };

  window.dispatchEvent?.(new CustomEvent('mimir-p0-icons-ready',{detail:{version}}));
})();
