(function(){
const promptEl=document.getElementById('mimir-prompt');
const primaryLink=document.getElementById('primary-chat-link');
const statusEl=document.getElementById('first-impression-status');
const detailEl=document.getElementById('first-impression-detail');
const backendNode=document.getElementById('instant-node-backend');
const modelNode=document.getElementById('instant-node-model');
const instantStart=document.querySelector('.mimir-instant-start');
ensureActivationCockpitShell();
const PROFILE_KEY='mimir-chat-backend-profiles';
const ACTIVE_KEY='mimir-chat-active-backend';
const MODE_KEY='mimir-chat-mode-controls-v1';
const WORKSPACE_KEY='mimir-active-workspace-v1';
const DEFAULT_WORKSPACE_ID='personal';
const FIRST_CHAT_RECEIPT_PREFIX='mimir-first-chat-receipt-v1:';
const cockpit=document.getElementById('activation-cockpit');
const activationCards={
answer:document.getElementById('activation-answer-card'),
local:document.getElementById('activation-local-card'),
model:document.getElementById('activation-model-card'),
trust:document.getElementById('activation-trust-card')
};
const activationStateEls={
answer:document.getElementById('activation-answer-state'),
local:document.getElementById('activation-local-state'),
model:document.getElementById('activation-model-state'),
trust:document.getElementById('activation-trust-state')
};
const activationDetailEls={
answer:document.getElementById('activation-answer-detail'),
local:document.getElementById('activation-local-detail'),
model:document.getElementById('activation-model-detail'),
trust:document.getElementById('activation-trust-detail')
};
const activationButtons={
chat:document.getElementById('activation-chat-now'),
connect:document.getElementById('activation-connect-local'),
models:document.getElementById('activation-open-models'),
node:document.getElementById('activation-open-node-dashboard')
};
let localConnectorState=null;
let lastCockpitSignature='';
let lastRailSignature='';
let lastActivationClosureSignature='';

function ensureActivationCockpitShell(){
if(!document.querySelector('link[href*="activation-cockpit.css"]')){
const link=document.createElement('link');
link.rel='stylesheet';
link.href='./apps/mimir-chat-portal/activation-cockpit.css?v=20260522-d115-cockpit';
document.head.appendChild(link);
}
if(document.getElementById('activation-cockpit')||!instantStart)return;
const section=document.createElement('section');
section.id='activation-cockpit';
section.className='activation-cockpit';
section.setAttribute('aria-label','MMIR activation status');
section.innerHTML=[
'<article id="activation-answer-card" class="activation-card is-checking"><div><span class="activation-label">Answer</span><strong id="activation-answer-state">Checking</strong></div><p id="activation-answer-detail">Finding a safe free route.</p><button id="activation-chat-now" type="button">Chat now</button></article>',
'<article id="activation-local-card" class="activation-card is-checking"><div><span class="activation-label">Local AI</span><strong id="activation-local-state">Local-first</strong></div><p id="activation-local-detail">Connect one private node.</p><button id="activation-connect-local" type="button">Connect local AI</button></article>',
'<article id="activation-model-card" class="activation-card is-checking"><div><span class="activation-label">Model</span><strong id="activation-model-state">Selecting</strong></div><p id="activation-model-detail">Checking free routes.</p><button id="activation-open-models" type="button">Models</button></article>',
'<article id="activation-trust-card" class="activation-card is-ready"><div><span class="activation-label">Trust</span><strong id="activation-trust-state">Private</strong></div><p id="activation-trust-detail">Local-first by default.</p><button id="activation-open-node-dashboard" type="button">Node health</button></article>'
].join('');
instantStart.insertAdjacentElement('afterend',section);
}

function selectedModel(){
const select=document.getElementById('runtime-model');
const option=select?.selectedOptions?.[0];
return {
value:select?.value||'',
text:String(option?.textContent||'').trim(),
runtime:option?.dataset?.runtime||''
};
}

function runtimeState(){
return String(document.getElementById('runtime-state')?.textContent||'').trim();
}

function readProfiles(){
try{
const value=JSON.parse(localStorage.getItem(PROFILE_KEY)||'[]');
return Array.isArray(value)?value:[];
}catch(error){
return [];
}
}

function activeProfile(){
const id=localStorage.getItem(ACTIVE_KEY)||'';
return readProfiles().find(profile=>profile.id===id)||null;
}

function readModes(){
try{
const saved=JSON.parse(localStorage.getItem(MODE_KEY)||'{}');
return {private:saved.private!==false,boost:Boolean(saved.boost),super:Boolean(saved.super),vision:Boolean(saved.vision)};
}catch(error){
return {private:true,boost:false,super:false,vision:false};
}
}

function setNode(el,text,active){
if(!el)return;
if(el.textContent!==text)el.textContent=text;
const nextActive=Boolean(active);
if(el.classList.contains('is-active')!==nextActive)el.classList.toggle('is-active',nextActive);
}

function setText(el,text){
if(el&&el.textContent!==text)el.textContent=text;
}

function safe(value){
return String(value||'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
}

function activeWorkspaceId(){
try{return localStorage.getItem(WORKSPACE_KEY)||DEFAULT_WORKSPACE_ID;}catch(error){return DEFAULT_WORKSPACE_ID;}
}

function readFirstChatReceipt(){
try{
const value=JSON.parse(localStorage.getItem(FIRST_CHAT_RECEIPT_PREFIX+activeWorkspaceId())||'null');
return value&&typeof value==='object'?value:null;
}catch(error){
return null;
}
}

function runtimeProofState(){
const proof=document.getElementById('runtime-live-proof');
return String(proof?.dataset?.state||'idle');
}

function starter(device,id,label,model){
return {device,id,label,model};
}

function deviceStarterRecommendation(){
const p=String(localConnectorState?.platform||navigator.platform||navigator.userAgent||'').toLowerCase();
const a=String(localConnectorState?.arch||navigator.userAgent||'').toLowerCase();
const u=String(navigator.userAgent||'').toLowerCase();
if(/mobile|android|iphone|ipad/.test(u)){
return starter('mobile client','ollama-gemma3-270m','Gemma 3 270M','gemma3:270m');
}
if(p.includes('raspberry')||(a.includes('arm')&&p.includes('linux'))){
return starter('Raspberry Pi / Linux ARM','ollama-qwen3-06b','Qwen3 0.6B','qwen3:0.6b');
}
if(p.includes('linux')){
return starter('Linux / VM','ollama-qwen3-06b','Qwen3 0.6B','qwen3:0.6b');
}
if(p.includes('mac')){
return starter('macOS','ollama-llama32-1b','Llama 3.2 1B','llama3.2:1b');
}
if(p.includes('win')){
return starter('Windows','ollama-llama32-1b','Llama 3.2 1B','llama3.2:1b');
}
return starter('this device','ollama-gemma3-1b','Gemma 3 1B','gemma3:1b');
}

function ensureRepairResumeStyles(){
if(document.querySelector('link[href*="repair-resume.css"]'))return;
const link=document.createElement('link');
link.rel='stylesheet';
link.href='./apps/mimir-chat-portal/repair-resume.css?v=20260523-d176';
document.head.appendChild(link);
}

function firstScreenClosureState(){
const profile=activeProfile();
const receipt=readFirstChatReceipt();
const starter=deviceStarterRecommendation();
const proofState=runtimeProofState();
const proofReady=proofState==='ready'||profile?.liveness==='chat-probed'||Boolean(profile?.lastProofModel)||receipt?.status==='success';
const profileReady=Boolean(profile?.url&&profile?.provider==='local-node');
const nodeHealth=String(profile?.health||'unknown').toLowerCase();
const nodeReady=['ready','degraded','testing'].includes(nodeHealth)||proofReady;
if(!profileReady){
return {state:'watch',title:'Create the free local profile',detail:'Prepares 127.0.0.1. Starter: '+starter.label+' for '+starter.device+'.',action:'Create local profile',target:'#local-connector',kind:'local-profile',starter};
}
if(!nodeReady){
return {state:nodeHealth==='offline'?'error':'watch',title:'Connect this device',detail:'Node not proven. Starter: '+starter.model+'.',action:'Open node health',target:'#node-dashboard',kind:'node-health',starter};
}
if(!proofReady){
return {state:'watch',title:'Install '+starter.label,detail:'Use '+starter.model+' for '+starter.device+'; then free proof.',action:'Use '+starter.label,target:'#model-library',kind:'install-starter',starter};
}
if(receipt?.status!=='success'){
return {state:receipt?.status==='failed'?'error':'watch',title:'Get the first useful answer',detail:'A live model is ready; send the first chat and save a privacy-safe receipt.',action:'Send first answer',target:'#mimir-prompt',kind:'first-chat'};
}
return {state:'ready',title:'First answer worked',detail:'Save the chat, then add memory, knowledge or models when needed.',action:'Save chat',target:'#conversation-manager-panel',kind:'save-chat'};
}

function ensureActivationClosureStrip(){
let strip=document.getElementById('activation-closure-strip');
if(strip||!instantStart)return strip;
ensureRepairResumeStyles();
strip=document.createElement('aside');
strip.id='activation-closure-strip';
strip.className='activation-closure-strip';
strip.setAttribute('aria-live','polite');
const replay=document.getElementById('activation-replay-banner');
const repair=document.getElementById('repair-resume-banner');
const rail=document.getElementById('mimir-readiness-rail');
(replay||repair||rail||instantStart).insertAdjacentElement('afterend',strip);
return strip;
}

function handleActivationClosureAction(copy){
if(copy.kind==='local-profile'){
window.MimirBackendProfiles?.ensureFreeLocalProfile?.();
openPanel('#local-connector');
return;
}
if(copy.kind==='retry-proof'){
const retry=document.querySelector('#runtime-live-proof [data-proof-action="retry"]')||document.getElementById('runtime-refresh');
retry?.click?.();
openPanel('#mimir-chat-runtime');
return;
}
if(copy.kind==='install-starter'){
const select=document.getElementById('runtime-model');
const starterId=copy.starter?.id||'';
window.MimirActivationTelemetry?.record?.('recommended-starter',{...copy.starter,free:true});
if(select&&starterId&&Array.from(select.options||[]).some(option=>option.value==='starter:'+starterId)){
select.value='starter:'+starterId;
select.dispatchEvent(new Event('change',{bubbles:true}));
}
openPanel('#model-library');
openPanel('#mimir-chat-runtime');
window.dispatchEvent(new CustomEvent('mmir-model-library-focus-recommended',{detail:{starter:copy.starter,source:'activation-closure',no_paid_routes_started:true}}));
return;
}
if(copy.kind==='first-chat'){
if(promptEl&&!String(promptEl.value||'').trim()){
promptEl.value='Give me my first useful MMIR answer and the next safe setup step.';
promptEl.dispatchEvent(new Event('input',{bubbles:true}));
}
promptEl?.focus();
window.setTimeout(()=>primaryLink?.click(),40);
return;
}
openPanel(copy.target||'#mimir-prompt');
if(copy.target==='#mimir-prompt')promptEl?.focus();
}

function renderActivationClosureStrip(){
const strip=ensureActivationClosureStrip();
if(!strip)return;
const copy=firstScreenClosureState();
const signature=[copy.state,copy.title,copy.detail,copy.action,copy.target].join('|');
if(signature===lastActivationClosureSignature)return;
lastActivationClosureSignature=signature;
strip.hidden=false;
strip.dataset.state=copy.state;
if(copy.starter?.model)strip.dataset.starterModel=copy.starter.model;
else delete strip.dataset.starterModel;
if(copy.starter?.device)strip.dataset.deviceClass=copy.starter.device;
else delete strip.dataset.deviceClass;
strip.innerHTML='<div><span>Next safe step</span><strong>'+safe(copy.title)+'</strong><p>'+safe(copy.detail)+'</p><small>recommended_starter:'+safe(copy.starter?.model||'none')+' / no_paid_routes_started:true / provider_secrets_stored:false</small></div><button type="button" data-activation-closure-action="'+safe(copy.kind)+'">'+safe(copy.action)+'</button>';
strip.querySelector('[data-activation-closure-action]')?.addEventListener('click',()=>handleActivationClosureAction(copy));
}

function setBodyState(add,removeA,removeB){
if(add&&!document.body.classList.contains(add))document.body.classList.add(add);
[removeA,removeB].filter(Boolean).forEach(name=>{
if(document.body.classList.contains(name))document.body.classList.remove(name);
});
}

function setCard(id,state,detail,tone){
setText(activationStateEls[id],state);
setText(activationDetailEls[id],detail);
const card=activationCards[id];
if(!card)return;
const tones=['is-ready','is-warning','is-offline','is-checking'];
const current=tones.find(name=>card.classList.contains(name))||'';
if(current!==tone){
tones.forEach(name=>card.classList.remove(name));
if(tone)card.classList.add(tone);
}
}

function modelKind(model){
const value=String(model.value||'');
const text=String(model.text||'');
return {
live:Boolean(value&&!value.startsWith('starter:')&&/live/i.test(text)),
browser:Boolean(value.startsWith('starter:')&&model.runtime==='browser-guide'),
webgpu:Boolean(model.runtime==='webllm'),
installable:Boolean(value.startsWith('starter:')&&model.runtime!=='browser-guide'&&model.runtime!=='webllm')
};
}

function cleanModelLabel(model){
return String(model.text||model.value||'MMIR guide').replace(/\s+-\s+live$/i,'').trim();
}

function openPanel(target){
let nextTarget=target;
if(nextTarget==='#connect-options'&&!document.querySelector(nextTarget))nextTarget='#local-connector';
const targetEl=document.querySelector(nextTarget);
if(targetEl&&'open' in targetEl)targetEl.open=true;
if(targetEl){targetEl.scrollIntoView({block:'start',behavior:'smooth'});return;}
if(window.MimirLoadDeferred)window.MimirLoadDeferred().then(()=>openPanel(target));
}

function syncActivationCockpit(model,kind){
if(!cockpit)return;
const label=cleanModelLabel(model);
const modes=readModes();
const localStatus=String(localConnectorState?.status||'').toLowerCase();
const localModels=Array.isArray(localConnectorState?.models)?localConnectorState.models:[];
const tunnel=localConnectorState?.tunnel||null;

if(kind.live){
setCard('answer','Live','Routed through '+label+'.','is-ready');
setCard('model','Live',label+' is active.','is-ready');
}else if(kind.browser||kind.webgpu){
setCard('answer','Ready',kind.webgpu?'Browser WebGPU route selected.':'Free browser route ready.','is-ready');
setCard('model',kind.webgpu?'Browser':'Guide',label+' is active.','is-ready');
}else if(kind.installable){
setCard('answer','Install','Install '+label+' when ready.','is-warning');
setCard('model','Installable',label+' can go live locally.','is-warning');
}else{
setCard('answer','Ready','Safest route is available.','is-ready');
setCard('model','Selecting','Checking free routes.','is-checking');
}

if(/^(off|err|block)/.test(localStatus)){
setCard('local','Offline',String(localConnectorState?.message||'Open Connect.'),'is-offline');
}else if(localStatus==='online'||localModels[0]){
setCard('local','Online',localModels.length?'Node sees '+String(localModels.length)+' model'+(localModels.length===1?'':'s')+'.':'Local node online.','is-ready');
}else if(localStatus==='degraded'){
setCard('local','Needs model','Add a local model.','is-warning');
}else if(localStatus==='checking'){
setCard('local','Checking','Local discovery is running.','is-checking');
}else{
setCard('local','Local-first','Connect a local node.','is-checking');
}

if(modes.private){
setCard('trust',tunnel?.public_url?'Paired tunnel':'Private','Local-first by default.','is-ready');
}else{
setCard('trust','Review','Private mode is off.','is-warning');
}

const detail={
answer:activationStateEls.answer?.textContent||'',
local:activationStateEls.local?.textContent||'',
model:activationStateEls.model?.textContent||'',
trust:activationStateEls.trust?.textContent||''
};
const signature=JSON.stringify(detail);
if(signature!==lastCockpitSignature){
lastCockpitSignature=signature;
window.dispatchEvent(new CustomEvent('mmir-first-screen-cockpit-updated',{detail}));
}
}

function syncReadyState(){
const model=selectedModel();
const state=runtimeState();
const kind=modelKind(model);

if(kind.live){
setText(statusEl,'Your local AI is ready in MMIR.');
setText(detailEl,model.text.replace(/\s+-\s+live$/i,'')+' is connected through MMIR. Type anything or use a smart start.');
setNode(backendNode,'Local node',true);
setNode(modelNode,model.text.replace(/\s+-\s+live$/i,''),true);
setBodyState('mimir-first-ready','mimir-first-guide','mimir-first-install');
syncActivationCockpit(model,kind);
return;
}

if(kind.browser||kind.webgpu){
setText(statusEl,kind.webgpu?'Free browser model is ready.':'Ask now. MMIR will pick the safest route.');
setText(detailEl,kind.webgpu?'Runs in this browser with WebGPU. No paid account.':'Free browser help is ready. Connect local AI for private models.');
setNode(backendNode,'Browser',true);
setNode(modelNode,model.text||'MMIR guide',true);
setBodyState('mimir-first-guide','mimir-first-ready','mimir-first-install');
syncActivationCockpit(model,kind);
return;
}

if(kind.installable){
setText(statusEl,'Install local AI to finish activation.');
setText(detailEl,'MMIR guides install, then moves to live chat when the node reports the model.');
setNode(backendNode,'Installer',true);
setNode(modelNode,model.text||'Free model',true);
setBodyState('mimir-first-install','mimir-first-ready','mimir-first-guide');
syncActivationCockpit(model,kind);
return;
}

const loadingDefault=state==='Select a backend to start.'||state==='Loading free model routes...';
setText(statusEl,state&&!loadingDefault?state:'Open. Connect local AI. Ready.');
setText(detailEl,'Local node, browser help and free model routes are checked automatically.');
setNode(backendNode,'Checking',false);
setNode(modelNode,'Model',false);
syncActivationCockpit(model,kind);
}

function ensureReadinessRail(){
let rail=document.getElementById('mimir-readiness-rail');
if(rail||!instantStart)return rail;
rail=document.createElement('nav');
rail.id='mimir-readiness-rail';
rail.className='mimir-readiness-rail';
rail.setAttribute('aria-label','MMIR readiness');
instantStart.insertAdjacentElement('afterend',rail);
return rail;
}

function readinessPill(label,value,state,target){
const link=document.createElement('a');
link.className='readiness-pill readiness-'+state;
link.href=target||'#mimir-prompt';
const strong=document.createElement('strong');
const small=document.createElement('small');
strong.textContent=label;
small.textContent=value;
link.append(strong,small);
link.addEventListener('click',()=>{
const el=document.querySelector(link.hash);
if(el&&el.tagName==='DETAILS')el.open=true;
});
return link;
}

function renderReadinessRail(){
const rail=ensureReadinessRail();
if(!rail)return;
const model=selectedModel();
const profile=activeProfile();
const modes=readModes();
const live=Boolean(model.value&&!model.value.startsWith('starter:')&&/live/i.test(model.text));
const browser=Boolean(model.value.startsWith('starter:')&&model.runtime==='browser-guide');
const webgpu=Boolean(model.runtime==='webllm');
const health=String(profile?.health||'unknown').toLowerCase();
const nodeReady=['ready','degraded','testing'].includes(health);
const modelLabel=(model.text||'Supergenius Free').replace(/\s+-\s+live$/i,'').replace(/MMIR Guide|MMIR Supergenius|Supergeni(?:us|ous)/gi,'Supergenius Free');
const pills=[
{label:'Free start',value:browser?'Guide ready':webgpu?'Browser model':'Guide available',state:'ready',target:'#mimir-prompt'},
{label:'Privacy',value:modes.private?'Private on':'Turn on',state:'ready',target:'#composer-mode-dock'},
{label:'Node',value:nodeReady?(profile.name||'Local node'):'Auto-checking',state:nodeReady?'ready':'watch',target:'#node-dashboard'},
{label:'Model',value:live?modelLabel:modelLabel||'Installable free',state:live?'ready':'watch',target:'#model-library'}
];
const signature=JSON.stringify(pills);
if(signature===lastRailSignature)return;
lastRailSignature=signature;
rail.innerHTML='';
rail.append(...pills.map(pill=>readinessPill(pill.label,pill.value,pill.state,pill.target)));
}

function sendPrompt(value){
if(!promptEl)return;
promptEl.value=String(value||'').trim();
promptEl.dispatchEvent(new Event('input',{bubbles:true}));
promptEl.focus();
window.setTimeout(()=>primaryLink?.click(),40);
}

function bindActivationActions(){
if(activationButtons.chat&&activationButtons.chat.dataset.firstImpressionBound!=='true'){
activationButtons.chat.dataset.firstImpressionBound='true';
activationButtons.chat.addEventListener('click',()=>{
sendPrompt('Start with the safest free MMIR chat route. Explain what is active now, what is local, and what I can do next without paying or configuring anything first.');
});
}
if(activationButtons.connect&&activationButtons.connect.dataset.firstImpressionBound!=='true'){
activationButtons.connect.dataset.firstImpressionBound='true';
activationButtons.connect.addEventListener('click',()=>{
window.MimirBackendProfiles?.ensureFreeLocalProfile?.();
openPanel('#local-connector');
});
}
if(activationButtons.models&&activationButtons.models.dataset.firstImpressionBound!=='true'){
activationButtons.models.dataset.firstImpressionBound='true';
activationButtons.models.addEventListener('click',()=>openPanel('#model-library'));
}
if(activationButtons.node&&activationButtons.node.dataset.firstImpressionBound!=='true'){
activationButtons.node.dataset.firstImpressionBound='true';
activationButtons.node.addEventListener('click',()=>openPanel('#node-dashboard'));
}
}

function bindPromptActions(){
document.querySelectorAll('[data-prompt-action]').forEach(button=>{
if(button.dataset.firstImpressionBound==='true')return;
button.dataset.firstImpressionBound='true';
button.addEventListener('click',()=>{
const prompt=button.getAttribute('data-prompt')||button.textContent||'Help me get started with MMIR.';
sendPrompt(prompt);
});
});
}

function run(){
bindPromptActions();
bindActivationActions();
syncReadyState();
renderReadinessRail();
renderActivationClosureStrip();
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
new MutationObserver(run).observe(document.documentElement,{
childList:true,
subtree:true,
characterData:true,
attributes:true,
attributeFilter:['disabled','data-state','aria-disabled','class']
});
window.addEventListener('mmir-backend-profiles-updated',run);
window.addEventListener('mmir-local-connector-refreshed',(event)=>{
localConnectorState=event.detail||null;
run();
});
window.addEventListener('mmir-chat-modes-updated',run);
window.addEventListener('mmir-live-model-proof-updated',run);
window.addEventListener('mmir-first-chat-receipt-updated',run);
window.addEventListener('storage',run);
window.addEventListener('focus',run);
})();
