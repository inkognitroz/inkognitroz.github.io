/** Actual P0 HTML/JS, with in-memory HTTP/model/speech fixtures only.
 * No live providers or hardware. Run from a full checkout.
 */
import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.MMIR_PLAYWRIGHT_MODULE||'@playwright/test');
const root=fileURLToPath(new URL('..',import.meta.url));
const output=resolve(process.env.MMIR_JARVIS_TEST_OUTPUT||'/tmp/mmir-jarvis-proof');
const origin='https://mmir-jarvis-fixture.invalid';
const status={ok:true,no_paid_routes_started:true,live_verified_intelligence_route_count:0,operator_readiness:{readiness_state:'blocked',default_writer_readiness:{classification:'blocked',authenticated_release_ready:false,blocker_codes:['authenticated_evaluation_failed']},journeys:{first_chat_ready:false,compare_ready:false,swarm_preview_ready:false}}};
const inventory={object:'list',inventory_view:'compact',default_model:'supergeni',no_paid_routes_started:true,live_verified_intelligence_route_count:0,data:[{id:'supergeni',model:'supergeni',display_name:'Supergeni',provider:'mmir',route_id:'supergeni/connected',route_state:'connected_meta_route_available',route_type:'connected_meta_route',executable:false,selectable:false,candidate:false,live_e2e_verified:false,live_e2e_proof:null,cost_class:null,cost_state:null,no_paid_routes_started:true}]};
const browser=await chromium.launch({headless:true,...(process.env.MMIR_CHROMIUM_EXECUTABLE?{executablePath:process.env.MMIR_CHROMIUM_EXECUTABLE}:{})});
const context=await browser.newContext({serviceWorkers:'block',viewport:{width:1440,height:1000}});
const page=await context.newPage();page.setDefaultTimeout(8000);
const calls=[],errors=[],assets=[];
page.on('pageerror',error=>errors.push(error.message));
const installSpeechFixture=()=>{
 window.jarvisProof={recognitions:[],spoken:[],cancelled:0};
 class Recognition {constructor(){}start(){window.jarvisProof.recognitions.push(this);this.onstart?.()}abort(){this.aborted=true}}
 window.SpeechRecognition=Recognition;
 window.SpeechSynthesisUtterance=class {constructor(text){this.text=text}};
 Object.defineProperty(window,'speechSynthesis',{value:{getVoices(){return [{name:'Norsk teststemme',lang:'nb-NO',localService:true}]},speak(utterance){window.jarvisProof.spoken.push(utterance.text);setTimeout(()=>utterance.onend?.(),10)},cancel(){window.jarvisProof.cancelled++}}});
};
await context.addInitScript(installSpeechFixture);
await context.route('**/*',async route=>{
 const url=new URL(route.request().url());
 if(url.origin==='https://api.mmir.ai'){
  if(url.pathname==='/status')return route.fulfill({json:status});
  if(url.pathname==='/v1/models')return route.fulfill({json:inventory});
  if(url.pathname==='/v1/chat/completions'){
   calls.push(route.request().postDataJSON());
   return route.fulfill({json:{choices:[{message:{role:'assistant',content:calls.length===1?'Test: Bergen er byen vi planlegger å besøke.':'Test: Ja, Bergen er fortsatt byen i samme samtale.'},finish_reason:'stop'}]}});
  }
  return route.fulfill({status:503,json:{error:'Fixture: endpoint not configured'}});
 }
 if(url.origin!==origin)return route.abort();
 const rel=decodeURIComponent(url.pathname).replace(/^\/+/,''), file=resolve(root,'public',rel);
 if(!file.startsWith(resolve(root,'public')+'/'))return route.abort();
 try {
  const body=await readFile(file);
  const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml'}[extname(file)]||'application/octet-stream';
  assets.push(url.pathname+url.search);
  return route.fulfill({body,contentType:mime});
 }catch(_){return route.fulfill({status:404,body:''})}
});
async function command(text){await page.locator('#p0-input').fill(text);await page.locator('#p0-input').press('Enter')}
async function finishSpeech(text){await page.evaluate(text=>{const r=jarvisProof.recognitions.at(-1);const result=[{transcript:text}];result.isFinal=true;r.onresult?.({resultIndex:0,results:[result]});r.onend?.()},text)}
let checks=0;
function pass(name){checks++;console.log('PASS',name)}
try {
 if(process.env.MMIR_IN_MEMORY_DOM==='1'){
  await page.evaluate(installSpeechFixture);
  await page.evaluate(()=>{
   Object.defineProperty(window,'isSecureContext',{value:true,configurable:true});
   // about:blank has no storage origin. Use ephemeral test-only stores; the
   // default CI navigation retains the browser's real origin-scoped storage.
   for(const name of ['localStorage','sessionStorage']){
    const data=new Map();Object.defineProperty(window,name,{value:{getItem:k=>data.get(String(k))??null,setItem:(k,v)=>data.set(String(k),String(v)),removeItem:k=>data.delete(String(k)),clear:()=>data.clear(),key:i=>Array.from(data.keys())[i]??null,get length(){return data.size}},configurable:true});
   }
  });
  const html=await readFile(resolve(root,'public/mmir.html'),'utf8');
  await page.setContent(html.replace('<head>','<head><base href="'+origin+'/">'),{waitUntil:'domcontentloaded'});
 }else await page.goto(origin+'/mmir.html',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.getElementById('p0-send')?.disabled===false);
 await page.waitForSelector('#mmir-jarvis-toggle');
 assert.ok(assets.some(a=>a.includes('p0-chat-shell.js')));pass('actual P0 shell and new versioned navigation load');
 await page.evaluate(()=>{window.proofTranscript=document.getElementById('p0-transcript');window.proofComposer=document.getElementById('p0-composer')});
 await page.locator('#p0-mic').click();
 assert.equal(await page.locator('#p0-mic').getAttribute('data-voice-state'),'available');
 await command('@jarvis');
 await page.waitForFunction(()=>document.getElementById('mmir-jarvis-switch-status').textContent.includes('mikrofonen'));
 assert.equal(await page.locator('[data-mmir-skin="jarvis"]').count(),0);pass('real core lifecycle blocks duplicate microphone handover');
 await page.locator('#p0-input').fill('');
 await finishSpeech('Testutkast fra vanlig mikrofon');
 assert.equal(await page.locator('#p0-input').inputValue(),'Testutkast fra vanlig mikrofon');pass('ordinary P0 voice still creates its original draft');
 await command('Vi planlegger å besøke Bergen. Husk byen.');
 await page.waitForFunction(()=>document.querySelector('.p0-message-assistant')?.textContent.includes('Test: Bergen'));
 await page.waitForSelector('#p0-send[data-state="send"]');
 assert.equal(calls.length,1);assert.equal(calls[0].model,'mmir-supergenius');assert.equal(calls[0].stream,false);assert.equal(calls[0].policy.paid_routes_allowed,false);pass('real P0 submit uses canonical model and no-paid policy');
 await command('@jarvis');
 await page.waitForSelector('[data-mmir-skin="jarvis"]');
 assert.equal(calls.length,1);assert.deepEqual(await page.evaluate(()=>[proofTranscript===document.getElementById('p0-transcript'),proofComposer===document.getElementById('p0-composer'),jarvisProof.recognitions.length]),[true,true,1]);pass('skin switch preserves actual DOM and makes no model or mic call');
 assert.equal(await page.locator('#p0-release-warning').isVisible(),true);pass('existing unverified-release disclosure remains visible');
 await page.locator('[data-jarvis="consent"]').check();await page.locator('[data-jarvis="tts"]').check();
 await page.locator('[data-jarvis="talk"]').click();
 assert.equal(await page.evaluate(()=>jarvisProof.recognitions.length),2);
 assert.equal(await page.evaluate(()=>jarvisProof.recognitions.at(-1).lang),'nb-NO');
 await finishSpeech('Hvilken by planla vi å besøke?');
 await page.waitForFunction(()=>jarvisProof.spoken.length>0);
 assert.equal(calls.length,2);
 const history=calls[1].messages;
 assert.ok(history.some(m=>m.role==='user'&&m.content.includes('besøke Bergen')));
 assert.ok(history.some(m=>m.role==='assistant'&&m.content.includes('Test: Bergen')));
 assert.ok(history.some(m=>m.role==='user'&&m.content.includes('Hvilken by')));
 assert.ok((await page.evaluate(()=>jarvisProof.spoken.join(' '))).includes('Bergen'));pass('voice follow-up uses real P0 history and reads new answer');
 await command('@chat');await page.waitForSelector('[data-mmir-skin="chat"]');
 assert.equal(calls.length,2);assert.equal(await page.locator('.p0-message-assistant').count(),2);pass('return to chat retains both real-core turns');
 await command('@jarvis Ett siste tekstspørsmål.');
 await page.waitForFunction(()=>document.querySelectorAll('.p0-message-assistant').length===3);
 await page.waitForSelector('#p0-send[data-state="send"]');
 assert.equal(calls.length,3);assert.ok(calls[2].messages.some(m=>m.role==='user'&&m.content==='Ett siste tekstspørsmål.'));
 assert.equal(calls[2].messages.some(m=>m.content.includes('@jarvis')),false);pass('command with prompt reaches real P0 once, without prefix');
 await page.locator('#p0-sidebar-settings').click();await page.locator('[data-p0-action="set-privacy-mode:private"]').click();
 await page.locator('[data-jarvis="consent"]').check();await page.locator('[data-jarvis="tts"]').check();
 await page.locator('[data-jarvis="talk"]').click();
 assert.equal(await page.evaluate(()=>jarvisProof.recognitions.length),2);assert.equal(calls.length,3);pass('real privacy menu stops voice without changing routing policy');
 for(const [name,width,height] of [['desktop',1440,1000],['mobile',390,844],['compact',360,640]]){
  await page.setViewportSize({width,height});
  await page.waitForFunction(()=>Math.abs(document.getElementById('mmir-p0-app').getBoundingClientRect().height-innerHeight)<2);
  await page.evaluate(()=>{document.getElementById('mmir-jarvis-switch-status').textContent='INTEGRASJONSTEST: ekte grensesnitt, simulert modell og tale.'});
  const metrics=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth+1,composer:document.getElementById('p0-composer').getBoundingClientRect().bottom<=innerHeight+1,transcript:document.getElementById('p0-transcript').clientHeight}));
  assert.equal(metrics.overflow,false,name+' overflow');assert.equal(metrics.composer,true,name+' composer');assert.ok(metrics.transcript>70,name+' transcript');
  await mkdir(output,{recursive:true});await page.screenshot({path:resolve(output,'jarvis-full-shell-'+name+'.png'),fullPage:true});pass('actual full-shell layout '+name);
 }
 const contrast=await page.locator('.p0-message-assistant .p0-message-body').first().evaluate(el=>{
  const luminance=rgb=>rgb.match(/\d+/g).slice(0,3).map(Number).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0);
  const fg=luminance(getComputedStyle(el).color),bg=luminance(getComputedStyle(document.getElementById('mmir-p0-app')).backgroundColor);
  return (Math.max(fg,bg)+.05)/(Math.min(fg,bg)+.05);
 });
 assert.ok(contrast>=4.5,'actual assistant foreground contrast');pass('assistant text remains legible on dark skin');
 await page.setViewportSize({width:1440,height:1000});
 await page.locator('#p0-sidebar-settings').click();await page.locator('[data-p0-action="set-privacy-mode:public"]').click();
 const beforeAtomic=calls.length;
 await page.evaluate(()=>{const input=document.getElementById('p0-input');input.value='Ett atomisk spørsmål';input.dispatchEvent(new Event('input',{bubbles:true}));const form=document.getElementById('p0-composer');form.requestSubmit();form.requestSubmit()});
 await page.waitForFunction(()=>document.getElementById('p0-send')?.dataset.state==='send'&&MmirP0Conversation.snapshot().phase==='complete');
 assert.equal(calls.length,beforeAtomic+1);pass('real core single-flight preflight prevents duplicate POST');
 await page.evaluate(()=>{const input=document.getElementById('p0-input');input.value='Gammelt utkast';document.getElementById('p0-composer').requestSubmit();input.value='Nytt viktig utkast'});
 await page.waitForTimeout(100);assert.equal(calls.length,beforeAtomic+1);assert.equal(await page.locator('#p0-input').inputValue(),'Nytt viktig utkast');pass('real core preserves an edited draft during asynchronous preflight');
 const oldConversation=await page.evaluate(()=>MmirP0Conversation.snapshot().conversationId);
 await page.evaluate(()=>{const input=document.getElementById('p0-input');input.value='Avbryt før nettverk';document.getElementById('p0-composer').requestSubmit();document.querySelector('[data-p0-sidebar-action="new-chat"]').click()});
 await page.waitForTimeout(100);assert.equal(calls.length,beforeAtomic+1);assert.notEqual(await page.evaluate(()=>MmirP0Conversation.snapshot().conversationId),oldConversation);assert.equal(await page.locator('.p0-message-assistant').count(),0);pass('real new-chat action invalidates a pending preflight without another POST');
 await page.setViewportSize({width:390,height:844});
 await page.evaluate(()=>{document.querySelector('[data-jarvis="options"]').open=false;document.querySelector('.mmir-jarvis-panel').scrollTop=0});
 await page.screenshot({path:resolve(output,'jarvis-v3-compact-mobile.png'),fullPage:true});
 const emptyContrast=await page.locator('#p0-first-session-title').evaluate(el=>{
  const lum=rgb=>rgb.match(/\d+/g).slice(0,3).map(Number).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0);
  const a=lum(getComputedStyle(el).color),b=lum(getComputedStyle(document.getElementById('mmir-p0-app')).backgroundColor);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
 });
 assert.ok(emptyContrast>=4.5);pass('new-chat heading remains legible on the dark skin');
 // Simulate only the viewport signal; this is not a physical keyboard test.
 await page.evaluate(()=>{window.testViewportHeight=500;Object.defineProperty(visualViewport,'height',{get:()=>window.testViewportHeight,configurable:true});visualViewport.dispatchEvent(new Event('resize'));document.querySelector('.mmir-jarvis-panel').scrollTop=0});
 const keyboard=await page.evaluate(()=>{const b=id=>document.getElementById(id).getBoundingClientRect();const stop=document.querySelector('[data-jarvis="pause"]').getBoundingClientRect();return {app:b('mmir-p0-app').height,composer:b('p0-composer').bottom,stop:stop.bottom,stopHeight:stop.height,warning:document.getElementById('p0-release-warning').getBoundingClientRect().height}});
 assert.equal(keyboard.app,500);assert.ok(keyboard.composer<=501);assert.ok(keyboard.stop<=501);assert.ok(keyboard.stopHeight>=44);assert.ok(keyboard.warning>0);assert.ok(await page.locator('[data-jarvis="pause"]').evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))}),'stop must be hit-testable, not clipped');pass('visualViewport shrink keeps composer, stop and release warning available');
 await page.screenshot({path:resolve(output,'jarvis-v3-keyboard-viewport.png'),fullPage:true});
 await page.evaluate(()=>{window.testViewportHeight=844;visualViewport.dispatchEvent(new Event('resize'))});
 await command('@chat');await page.waitForSelector('[data-mmir-skin="chat"]');
 assert.equal(await page.locator('#mmir-p0-app').evaluate(el=>el.style.getPropertyValue('--jarvis-viewport-height')),'');pass('leaving Jarvis removes its keyboard sizing override');
 assert.deepEqual(errors,[]);pass('no uncaught errors in actual P0 shell');
 console.log(`PASS ${checks} full-shell integration checks. Actual UI/core, mocked HTTP/model/speech; not production or physical microphone proof.`);
}finally{await browser.close()}
