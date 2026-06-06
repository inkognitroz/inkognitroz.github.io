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

  function detectOs(){
    const platform=String(navigator.userAgentData?.platform||navigator.platform||'').toLowerCase();
    const agent=String(navigator.userAgent||'').toLowerCase();
    const probe=platform+' '+agent;
    if(/iphone|ipad|android|mobile/.test(probe))return 'mobile';
    if(/mac|darwin/.test(probe))return 'mac';
    if(/win/.test(probe))return 'windows';
    if(/linux|x11|ubuntu|debian|raspbian|arm/.test(probe))return 'linux';
    return 'unknown';
  }

  function introFor(os){
    const normalized=normalizeOs(os);
    if(normalized==='mac'){
      return 'I detected macOS. Do you have a Mac computer? Copy and paste this in Terminal to connect a local node. It installs MMIR Local Connector, downloads a small starter model when needed, and keeps the node on 127.0.0.1.';
    }
    if(normalized==='linux'){
      return 'I detected Linux. Copy and paste this in the terminal on the computer that will host your local model. It installs MMIR Local Connector and keeps the node private on localhost.';
    }
    if(normalized==='windows'){
      return 'I detected Windows. Copy and paste this in PowerShell on the PC that will host your local model. It installs MMIR Local Connector and keeps the node private on localhost.';
    }
    return 'Which computer will host your local model? Choose Mac, Windows or Linux, and I will give you the exact command here in chat.';
  }

  function returnInstruction(){
    return 'After it says "MMIR Local Connector is ready", return here and press + -> Refresh models. If the browser asks, allow Local Network Access for mmir.ai.';
  }

  window.MimirLocalInstallCommands={
    version:'20260606-b1-06-local-install-commands-v2',
    macLinux:MAC_LINUX,
    windows:WINDOWS,
    normalizeOs,
    commandFor,
    detectOs,
    introFor,
    returnInstruction
  };
  window.dispatchEvent(new CustomEvent('mimir-local-install-commands-ready',{detail:{ready:true,no_paid_routes_started:true}}));
})();
