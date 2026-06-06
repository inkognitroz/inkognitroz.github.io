(function(){
  const MAC_LINUX='curl -fsSL https://mmir.ai/downloads/mmir-local-node-macos-linux.sh | bash';
  const WINDOWS='powershell -NoProfile -ExecutionPolicy Bypass -Command "$i=Join-Path $env:TEMP \'mmir-local-node-windows.ps1\'; Invoke-WebRequest \'https://mmir.ai/downloads/mmir-local-node-windows.ps1\' -OutFile $i -UseBasicParsing; powershell -NoProfile -ExecutionPolicy Bypass -File $i"';

  function normalizeOs(value){
    const os=String(value||'').toLowerCase();
    if(os.includes('win'))return 'windows';
    if(os.includes('mac')||os.includes('darwin'))return 'mac';
    if(os.includes('linux'))return 'linux';
    return 'unknown';
  }

  function commandFor(os){
    const normalized=normalizeOs(os);
    if(normalized==='windows')return WINDOWS;
    if(normalized==='mac'||normalized==='linux')return MAC_LINUX;
    return '';
  }

  window.MimirLocalInstallCommands={
    version:'20260606-b1-06-local-install-commands-v1',
    macLinux:MAC_LINUX,
    windows:WINDOWS,
    normalizeOs,
    commandFor
  };
  window.dispatchEvent(new CustomEvent('mimir-local-install-commands-ready',{detail:{ready:true,no_paid_routes_started:true}}));
})();
