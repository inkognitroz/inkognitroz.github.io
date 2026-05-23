(function(){
  const main=document.querySelector('.mimir-chat-main');
  const KEY='mimir-runtime-settings-v1';
  const DEFAULTS={temperature:0.7,max_tokens:700,context_length:4096,top_p:0.9,repeat_penalty:1.05,seed:-1,system_prompt:''};
  let statusEl=null;

  if(!main)return;

  function escapeHtml(value){return String(value||'').replace(/[&<>"']/g,(char)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));}
  function boundedNumber(value,fallback,min,max){
    const number=Number(value);
    if(!Number.isFinite(number))return fallback;
    return Math.min(max,Math.max(min,number));
  }
  function readSettings(){
    try{
      const saved=JSON.parse(localStorage.getItem(KEY)||'{}');
      return {
        temperature:boundedNumber(saved.temperature,DEFAULTS.temperature,0,2),
        max_tokens:Math.round(boundedNumber(saved.max_tokens,DEFAULTS.max_tokens,128,4096)),
        context_length:Math.round(boundedNumber(saved.context_length,DEFAULTS.context_length,1024,32768)),
        top_p:boundedNumber(saved.top_p,DEFAULTS.top_p,0,1),
        repeat_penalty:boundedNumber(saved.repeat_penalty,DEFAULTS.repeat_penalty,0.5,2),
        seed:Math.round(boundedNumber(saved.seed,DEFAULTS.seed,-1,2147483647)),
        system_prompt:String(saved.system_prompt||'').replace(/\s+$/,'').slice(0,1200)
      };
    }catch(error){
      return {...DEFAULTS};
    }
  }
  function writeSettings(settings){
    localStorage.setItem(KEY,JSON.stringify(settings));
    window.dispatchEvent(new CustomEvent('mmir-runtime-settings-updated',{detail:settings}));
  }
  function setStatus(message,state){
    if(statusEl){
      statusEl.textContent=message||'';
      statusEl.dataset.state=state||'idle';
    }
  }
  function field(id){return document.getElementById(id);}
  function renderSummary(settings){
    const root=field('runtime-settings-summary');
    if(!root)return;
    const rows=[
      ['Temperature',settings.temperature],
      ['Max tokens',settings.max_tokens],
      ['Context',settings.context_length],
      ['Top p',settings.top_p],
      ['Repeat penalty',settings.repeat_penalty],
      ['Seed',settings.seed>=0?settings.seed:'random']
    ];
    root.innerHTML=rows.map(([label,value])=>'<div><span>'+escapeHtml(label)+'</span><strong>'+escapeHtml(String(value))+'</strong></div>').join('')+
      '<p>Sent with /chat/completions as bounded runtime settings. Provider keys still stay outside the public frontend.</p>';
  }
  function fill(settings){
    field('runtime-temperature').value=String(settings.temperature);
    field('runtime-max-tokens').value=String(settings.max_tokens);
    field('runtime-context-length').value=String(settings.context_length);
    field('runtime-top-p').value=String(settings.top_p);
    field('runtime-repeat-penalty').value=String(settings.repeat_penalty);
    field('runtime-seed').value=String(settings.seed);
    field('runtime-system-prompt').value=settings.system_prompt;
    renderSummary(settings);
  }
  function collect(){
    return {
      temperature:boundedNumber(field('runtime-temperature')?.value,DEFAULTS.temperature,0,2),
      max_tokens:Math.round(boundedNumber(field('runtime-max-tokens')?.value,DEFAULTS.max_tokens,128,4096)),
      context_length:Math.round(boundedNumber(field('runtime-context-length')?.value,DEFAULTS.context_length,1024,32768)),
      top_p:boundedNumber(field('runtime-top-p')?.value,DEFAULTS.top_p,0,1),
      repeat_penalty:boundedNumber(field('runtime-repeat-penalty')?.value,DEFAULTS.repeat_penalty,0.5,2),
      seed:Math.round(boundedNumber(field('runtime-seed')?.value,DEFAULTS.seed,-1,2147483647)),
      system_prompt:String(field('runtime-system-prompt')?.value||'').replace(/\s+$/,'').slice(0,1200)
    };
  }
  function save(){
    const settings=collect();
    writeSettings(settings);
    renderSummary(settings);
    setStatus('Runtime settings saved for the next chat request.','ready');
  }
  function reset(){
    localStorage.removeItem(KEY);
    fill({...DEFAULTS});
    window.dispatchEvent(new CustomEvent('mmir-runtime-settings-updated',{detail:{...DEFAULTS}}));
    setStatus('Runtime settings reset to safe defaults.','ready');
  }
  function openChat(){
    const prompt=field('mimir-prompt');
    if(prompt){
      prompt.focus();
      prompt.scrollIntoView({block:'center',behavior:'smooth'});
    }
    setStatus('Chat composer focused.','ready');
  }
  function input(name,label,type,attrs=''){
    return '<label for="'+escapeHtml(name)+'">'+escapeHtml(label)+'<input id="'+escapeHtml(name)+'" type="'+escapeHtml(type)+'" '+attrs+' /></label>';
  }
  function install(){
    if(field('runtime-settings-panel'))return;
    const details=document.createElement('details');
    details.id='runtime-settings-panel';
    details.className='mimir-provider-drawer runtime-settings-panel';
    details.innerHTML=''+
      '<summary>+ Runtime Settings</summary>'+
      '<section class="mimir-dashboard" aria-labelledby="runtime-settings-title">'+
        '<div class="dashboard-heading"><div><p class="eyebrow">Safe advanced controls</p><h2 id="runtime-settings-title">Model and runtime settings</h2></div></div>'+
        '<div class="runtime-settings-grid">'+
          input('runtime-temperature','Temperature','number','min="0" max="2" step="0.1"')+
          input('runtime-max-tokens','Max tokens','number','min="128" max="4096" step="64"')+
          input('runtime-context-length','Context length','number','min="1024" max="32768" step="512"')+
          input('runtime-top-p','Top p','number','min="0" max="1" step="0.05"')+
          input('runtime-repeat-penalty','Repeat penalty','number','min="0.5" max="2" step="0.05"')+
          input('runtime-seed','Seed (-1 random)','number','min="-1" max="2147483647" step="1"')+
        '</div>'+
        '<label class="runtime-system-label" for="runtime-system-prompt">System prompt override<textarea id="runtime-system-prompt" maxlength="1200" rows="4" placeholder="Optional: tell MMIR how to answer in this workspace. Safety, privacy and cost rules still win."></textarea></label>'+
        '<div class="workflow-builder-actions">'+
          '<button id="runtime-settings-save" type="button">Save settings</button>'+
          '<button id="runtime-settings-reset" type="button">Reset defaults</button>'+
          '<button id="runtime-settings-open-chat" type="button">Open chat</button>'+
        '</div>'+
        '<p id="runtime-settings-status" class="dashboard-note" data-state="idle" aria-live="polite"></p>'+
        '<div id="runtime-settings-summary" class="runtime-settings-summary" aria-live="polite"></div>'+
      '</section>';
    const access=document.getElementById('access-control');
    const settings=document.getElementById('backend-settings');
    main.insertBefore(details,access||settings||null);
    statusEl=field('runtime-settings-status');
    field('runtime-settings-save')?.addEventListener('click',save);
    field('runtime-settings-reset')?.addEventListener('click',reset);
    field('runtime-settings-open-chat')?.addEventListener('click',openChat);
    fill(readSettings());
    setStatus('Safe defaults are active automatically.','ready');
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
