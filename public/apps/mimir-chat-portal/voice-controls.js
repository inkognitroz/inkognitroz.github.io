(function(){
  const SETTINGS_KEY='mimir-voice-settings-v1';
  const main=document.querySelector('.mimir-chat-main');
  let languageEl=null;
  let voiceEl=null;
  let rateEl=null;
  let pitchEl=null;
  let autoReadEl=null;
  let statusEl=null;
  let devicesEl=null;
  let observer=null;
  let lastSpokenText='';

  if(!main)return;

  function clean(value,max=1000){return String(value||'').replace(/\s+/g,' ').trim().slice(0,max);}
  function escapeHtml(value){return String(value||'').replace(/[&<>"']/g,(char)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));}
  function readSettings(){
    try{return JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}')||{};}
    catch(error){return {};}
  }
  function writeSettings(){
    const settings={
      language:languageEl?.value||navigator.language||'en-US',
      voice:voiceEl?.value||'',
      rate:Number(rateEl?.value||1),
      pitch:Number(pitchEl?.value||1),
      auto_read:autoReadEl?.checked===true
    };
    localStorage.setItem(SETTINGS_KEY,JSON.stringify(settings));
    return settings;
  }
  function setStatus(message,state){if(statusEl){statusEl.textContent=message||'';statusEl.dataset.state=state||'idle';}}
  function speechRecognitionCtor(){return window.SpeechRecognition||window.webkitSpeechRecognition||null;}
  function voiceSupport(){
    return {
      dictation:!!speechRecognitionCtor(),
      read_aloud:'speechSynthesis'in window,
      devices:!!navigator.mediaDevices?.enumerateDevices,
      route:'browser-local'
    };
  }
  function populateVoices(){
    if(!voiceEl||!('speechSynthesis'in window))return;
    const current=voiceEl.value||readSettings().voice||'';
    const voices=window.speechSynthesis.getVoices();
    voiceEl.innerHTML='<option value="">Browser default voice</option>'+voices.map(voice=>'<option value="'+escapeHtml(voice.name)+'">'+escapeHtml(voice.name)+' · '+escapeHtml(voice.lang)+'</option>').join('');
    if(current&&Array.from(voiceEl.options).some(option=>option.value===current))voiceEl.value=current;
  }
  function applySettings(){
    const settings=readSettings();
    if(languageEl)languageEl.value=settings.language||navigator.language||'en-US';
    if(rateEl)rateEl.value=String(settings.rate||1);
    if(pitchEl)pitchEl.value=String(settings.pitch||1);
    if(autoReadEl)autoReadEl.checked=settings.auto_read===true;
    populateVoices();
    if(voiceEl&&settings.voice)voiceEl.value=settings.voice;
  }
  function promptEl(){return document.getElementById('mimir-prompt');}
  function startDictation(){
    const SpeechRecognition=speechRecognitionCtor();
    if(!SpeechRecognition){setStatus('Dictation is not available in this browser.','error');return;}
    const settings=writeSettings();
    const recognition=new SpeechRecognition();
    recognition.lang=settings.language||navigator.language||'en-US';
    recognition.interimResults=true;
    recognition.maxAlternatives=1;
    let interim='';
    recognition.onstart=()=>setStatus('Listening locally through the browser.','loading');
    recognition.onerror=()=>setStatus('Dictation failed or was cancelled.','error');
    recognition.onresult=(event)=>{
      let finalText='';
      interim='';
      for(let index=event.resultIndex;index<event.results.length;index+=1){
        const text=String(event.results[index][0]?.transcript||'').trim();
        if(event.results[index].isFinal)finalText+=(finalText?' ':'')+text;
        else interim=(interim?' ':'')+text;
      }
      if(interim)setStatus('Hearing: '+clean(interim,120),'loading');
      if(finalText){
        const input=promptEl();
        if(input){
          input.value=(input.value?input.value+' ':'')+finalText;
          input.dispatchEvent(new Event('input',{bubbles:true}));
          input.focus();
        }
      }
    };
    recognition.onend=()=>setStatus('Dictation finished.','ready');
    recognition.start();
  }
  function lastAssistantText(){
    const messages=Array.from(document.querySelectorAll('.runtime-message-assistant .runtime-message-body'));
    const last=messages[messages.length-1];
    return clean(last?.textContent||'',3000);
  }
  function speak(text){
    if(!('speechSynthesis'in window)){setStatus('Read-aloud is not available in this browser.','error');return;}
    const value=clean(text||lastAssistantText(),3000);
    if(!value){setStatus('No assistant answer to read yet.','error');return;}
    const settings=writeSettings();
    window.speechSynthesis.cancel();
    const utterance=new SpeechSynthesisUtterance(value);
    utterance.lang=settings.language||navigator.language||'en-US';
    utterance.rate=settings.rate||1;
    utterance.pitch=settings.pitch||1;
    const voice=window.speechSynthesis.getVoices().find(item=>item.name===settings.voice);
    if(voice)utterance.voice=voice;
    utterance.onend=()=>setStatus('Read-aloud finished.','ready');
    utterance.onerror=()=>setStatus('Read-aloud failed.','error');
    lastSpokenText=value;
    window.speechSynthesis.speak(utterance);
    setStatus('Reading answer locally.','loading');
  }
  function stopSpeech(){
    if('speechSynthesis'in window)window.speechSynthesis.cancel();
    setStatus('Voice output stopped.','ready');
  }
  async function checkDevices(){
    const support=voiceSupport();
    const rows=[
      {label:'Dictation',state:support.dictation?'available':'unavailable'},
      {label:'Read aloud',state:support.read_aloud?'available':'unavailable'},
      {label:'Route',state:support.route}
    ];
    if(support.devices){
      try{
        const devices=await navigator.mediaDevices.enumerateDevices();
        const audioInputs=devices.filter(device=>device.kind==='audioinput');
        rows.push({label:'Microphones',state:String(audioInputs.length)});
      }catch(error){
        rows.push({label:'Microphones',state:'permission needed'});
      }
    }
    if(devicesEl){
      devicesEl.innerHTML=rows.map(row=>'<div><span>'+escapeHtml(row.label)+'</span><strong>'+escapeHtml(row.state)+'</strong></div>').join('');
    }
    setStatus('Voice route checked.','ready');
  }
  function watchAutoRead(){
    if(observer)return;
    const target=document.getElementById('runtime-transcript');
    if(!target)return;
    observer=new MutationObserver(()=>{
      if(autoReadEl?.checked!==true)return;
      const text=lastAssistantText();
      if(text&&text!==lastSpokenText)speak(text);
    });
    observer.observe(target,{childList:true,subtree:true});
  }
  function saveAndReport(){
    writeSettings();
    setStatus('Voice settings saved locally.','ready');
  }
  function install(){
    if(document.getElementById('voice-controls'))return;
    const details=document.createElement('details');
    details.id='voice-controls';
    details.className='mimir-provider-drawer voice-controls';
    details.innerHTML=''+
      '<summary>+ Voice</summary>'+
      '<section class="mimir-dashboard" aria-labelledby="voice-controls-title">'+
        '<div class="dashboard-heading"><div><p class="eyebrow">Browser-local speech</p><h2 id="voice-controls-title">Voice input and read-aloud</h2></div></div>'+
        '<div class="voice-controls-body">'+
          '<div class="workflow-builder-row">'+
            '<label for="voice-language">Language<input id="voice-language" type="text" maxlength="24" value="en-US" /></label>'+
            '<label for="voice-select">Voice<select id="voice-select"><option value="">Browser default voice</option></select></label>'+
          '</div>'+
          '<div class="voice-slider-row">'+
            '<label for="voice-rate">Rate<input id="voice-rate" type="range" min="0.7" max="1.4" step="0.1" value="1" /></label>'+
            '<label for="voice-pitch">Pitch<input id="voice-pitch" type="range" min="0.7" max="1.3" step="0.1" value="1" /></label>'+
          '</div>'+
          '<label class="memory-consent"><input id="voice-auto-read" type="checkbox" /> Read new assistant answers aloud.</label>'+
          '<div class="workflow-builder-actions">'+
            '<button id="voice-check-devices" type="button">Check voice route</button>'+
            '<button id="voice-start-dictation" type="button">Push to talk</button>'+
            '<button id="voice-read-last" type="button">Read last answer</button>'+
            '<button id="voice-stop-read" type="button">Stop voice</button>'+
            '<button id="voice-save-settings" type="button">Save voice</button>'+
          '</div>'+
          '<p id="voice-status" class="dashboard-note" data-state="idle" aria-live="polite"></p>'+
          '<div id="voice-device-list" class="voice-device-list" aria-live="polite"></div>'+
        '</div>'+
      '</section>';
    const settings=document.getElementById('backend-settings');
    main.insertBefore(details,settings||null);
    languageEl=document.getElementById('voice-language');
    voiceEl=document.getElementById('voice-select');
    rateEl=document.getElementById('voice-rate');
    pitchEl=document.getElementById('voice-pitch');
    autoReadEl=document.getElementById('voice-auto-read');
    statusEl=document.getElementById('voice-status');
    devicesEl=document.getElementById('voice-device-list');
    applySettings();
    window.speechSynthesis?.addEventListener?.('voiceschanged',populateVoices);
    document.getElementById('voice-check-devices')?.addEventListener('click',checkDevices);
    document.getElementById('voice-start-dictation')?.addEventListener('click',startDictation);
    document.getElementById('voice-read-last')?.addEventListener('click',()=>speak());
    document.getElementById('voice-stop-read')?.addEventListener('click',stopSpeech);
    document.getElementById('voice-save-settings')?.addEventListener('click',saveAndReport);
    [languageEl,voiceEl,rateEl,pitchEl,autoReadEl].forEach(el=>el?.addEventListener('change',writeSettings));
    setTimeout(watchAutoRead,800);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
