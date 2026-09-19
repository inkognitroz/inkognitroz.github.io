/** Additional adversarial browser scenarios. All model and speech inputs are fixtures. */
import assert from 'node:assert/strict';
export async function reliabilityScenarios({page,check,jarvis,command,finishSpeech}) {
 const control=n=>page.locator('[data-jarvis="'+n+'"]');
 const review=async()=>{await jarvis();await control('consent').check();await control('input-mode').selectOption('review');};
 const rawClick=async name=>page.evaluate(n=>document.querySelector('[data-jarvis="'+n+'"]').dispatchEvent(new Event('click')),name);
 await check('R01 comparisons survive the complete speech path',async()=>{
  await jarvis();await control('tts').check();await page.evaluate(()=>fixture.answerText='3 < 5 og 8 > 6. 2 * 3 = 6; x_1 er ikke x_2.');
  await command('Les uttrykkene');await page.waitForFunction(()=>fixture.spoken.length>0);
  assert.equal(await page.evaluate(()=>fixture.spoken.join(' ')),'3 < 5 og 8 > 6. 2 * 3 = 6; x_1 er ikke x_2.');
 });
 await check('R02 new recording has no old text or actionable old send button',async()=>{
  await review();await control('talk').click();await finishSpeech('Gammelt utkast');await control('transcript').fill('Redigert gammelt utkast');
  await control('talk').click();assert.equal(await control('transcript').inputValue(),'');assert.equal(await control('send-capture').isDisabled(),true);
  await rawClick('send-capture');await rawClick('draft-capture');await rawClick('restore-capture');
  assert.equal(await page.evaluate(()=>fixture.requests.length),0);assert.equal(await page.locator('#p0-input').inputValue(),'');
  assert.equal(await control('saved-text').inputValue(),'Redigert gammelt utkast');
  await finishSpeech('Nytt riktig spørsmål');await control('send-capture').click();await rawClick('send-capture');
  assert.deepEqual(await page.evaluate(()=>fixture.requests),['Nytt riktig spørsmål']);
  assert.equal(await control('saved-text').inputValue(),'Redigert gammelt utkast');
 });
 await check('R03 empty new capture can restore old reviewed text without sending',async()=>{
  await review();await control('talk').click();await finishSpeech('Behold dette');await control('talk').click();
  await page.evaluate(()=>fixture.recognitions.at(-1).onend());
  await page.locator('[data-jarvis="saved-capture"] summary').click();await control('restore-capture').click();
  assert.equal(await control('transcript').inputValue(),'Behold dette');assert.equal(await page.evaluate(()=>fixture.requests.length),0);
  await control('send-capture').click();assert.deepEqual(await page.evaluate(()=>fixture.requests),['Behold dette']);
 });
 await check('R04 a third recording cannot overwrite two pending drafts',async()=>{
  await review();await control('talk').click();await finishSpeech('Første');await control('talk').click();await finishSpeech('Andre');
  await control('talk').click();assert.equal(await page.evaluate(()=>fixture.recognitions.length),2);
  assert.equal(await control('transcript').inputValue(),'Andre');assert.equal(await control('saved-text').inputValue(),'Første');
  assert.match(await page.locator('.mmir-jarvis-status').textContent(),/to usendte/);
 });
 await check('R05 late callback from old recording cannot rewrite new capture',async()=>{
  await review();await control('talk').click();await page.evaluate(()=>fixture.oldResult=fixture.recognitions.at(-1).onresult);
  await finishSpeech('Første');await control('talk').click();
  await page.evaluate(()=>{const x=[{transcript:'FOR SENT'}];x.isFinal=true;fixture.oldResult({results:[x]});});
  assert.equal(await control('transcript').inputValue(),'');await finishSpeech('Andre');assert.equal(await control('transcript').inputValue(),'Andre');
 });
 await check('R06 during async probe the previous transcript is not sendable',async()=>{
  await review();await control('talk').click();await finishSpeech('Gammelt');
  await page.evaluate(()=>{fixture.localSupport=true;SpeechRecognition.available=()=>new Promise(resolve=>setTimeout(()=>resolve('available'),150));});
  await control('talk').click();await rawClick('send-capture');await page.waitForFunction(()=>fixture.recognitions.length===2);
  assert.equal(await page.evaluate(()=>fixture.requests.length),0);assert.equal(await control('transcript').inputValue(),'');
 });
 await check('R07 moving to composer cannot later resubmit the same capture',async()=>{
  await review();await control('talk').click();await finishSpeech('Kontrollert tekst');await control('draft-capture').click();
  await page.locator('#p0-input').fill('');await rawClick('send-capture');assert.equal(await page.evaluate(()=>fixture.requests.length),0);
  assert.equal(await control('send-capture').isDisabled(),true);
 });
 await check('R08 offline keeps edited draft and online never retries or listens',async()=>{
  await review();await control('talk').click();await finishSpeech('Ikke mist meg');await control('transcript').fill('Viktig redigering');
  await page.evaluate(()=>{Object.defineProperty(navigator,'onLine',{value:false,configurable:true});dispatchEvent(new Event('offline'));});
  await control('send-capture').click();assert.equal(await page.evaluate(()=>fixture.requests.length),0);assert.equal(await control('transcript').inputValue(),'Viktig redigering');
  await page.evaluate(()=>{Object.defineProperty(navigator,'onLine',{value:true,configurable:true});dispatchEvent(new Event('online'));});
  await page.waitForTimeout(80);assert.equal(await page.evaluate(()=>fixture.recognitions.length),1);assert.equal(await page.evaluate(()=>fixture.requests.length),0);
  await control('send-capture').click();assert.deepEqual(await page.evaluate(()=>fixture.requests),['Viktig redigering']);
 });
 await check('R09 interrupted recording retains partial text for manual review only',async()=>{
  await review();await control('talk').click();await page.evaluate(()=>{const x=[{transcript:'Foreløpig tekst'}];x.isFinal=false;fixture.recognitions.at(-1).onresult({results:[x]});dispatchEvent(new Event('offline'));});
  assert.equal(await page.evaluate(()=>fixture.recognitions.at(-1).aborted),true);assert.equal(await control('transcript').inputValue(),'Foreløpig tekst');
  assert.equal(await page.evaluate(()=>fixture.requests.length),0);assert.equal(await control('transcript').getAttribute('readonly'),null);
 });
 await check('R10 Stop speech does not stop the core task or resume late output',async()=>{
  await jarvis();await control('tts').check();await page.evaluate(()=>{fixture.delay=400;fixture.holdSpeech=true;});await command('Fullfør på skjermen');
  await control('pause').click();await page.waitForTimeout(500);
  assert.notEqual(await page.evaluate(()=>fixture.stopped),true);assert.equal(await page.evaluate(()=>fixture.spoken.length),0);
  assert.match(await control('outcome').textContent(),/Ferdig svar/);assert.equal(await page.evaluate(()=>fixture.requests.length),1);
 });
 await check('R11 Stop task requests core cancellation without claiming provider savings',async()=>{
  await jarvis();await control('tts').check();await page.evaluate(()=>fixture.delay=1000);await command('Vent');await control('stop-task').click();
  assert.equal(await page.evaluate(()=>fixture.stopped),true);assert.match(await control('outcome').textContent(),/leverandørstopp ikke bekreftet/);
  await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>fixture.spoken.length),0);assert.equal(await page.evaluate(()=>fixture.requests.length),1);
 });
 await check('R12 dictation test requires consent and does not auto-send to a model',async()=>{
  await jarvis();await control('test-dictation').click();assert.equal(await page.evaluate(()=>fixture.recognitions.length),0);
  await control('consent').check();await control('test-dictation').click();await finishSpeech('MMIR og Jarvis: 12,5 prosent, ikke 15.');
  assert.equal(await page.evaluate(()=>fixture.requests.length),0);assert.equal(await control('transcript').inputValue(),'MMIR og Jarvis: 12,5 prosent, ikke 15.');
  assert.match(await page.locator('.mmir-jarvis-status').textContent(),/Diktatprøven er klar/);
 });
 await check('R13 raw Norwegian names, numbers and negation are never silently corrected',async()=>{
  await review();await control('talk').click();const raw='MMIR, Jarvis og GitHub. Ikke endre 99 550 til 99 500.';await finishSpeech(raw);await control('send-capture').click();
  assert.deepEqual(await page.evaluate(()=>fixture.requests),[raw]);
 });
 await check('R14 diagnostics contain no transcript, route address, model name or credentials',async()=>{
  await jarvis();await control('tts').check();await command('PERSONLIG-HEMMELIG-TEKST');await page.waitForFunction(()=>fixture.spoken.length>0);
  await page.evaluate(()=>{Object.defineProperty(navigator,'clipboard',{value:{writeText:async t=>{fixture.copied=t;}},configurable:true});document.querySelector('.mmir-jarvis-truth').open=true;});
  await control('copy-diagnostics').click();const text=await page.evaluate(()=>fixture.copied),data=JSON.parse(text);
  assert.equal(text.includes('PERSONLIG-HEMMELIG'),false);assert.equal(/Simulert MMIR|https?:|turnId|conversationId|model_id|prompt/.test(text),false);
  assert.equal(data.verification.hardware,'not-certified-by-this-report');assert.equal(data.metrics.tokens,18);assert.equal(data.outcome,'complete');
  assert.equal(await page.evaluate(()=>fixture.requests.length),1);
 });
 await check('R15 blocked clipboard leaves readable safe diagnostics with no request',async()=>{
  await jarvis();await page.evaluate(()=>{Object.defineProperty(navigator,'clipboard',{value:{writeText:async()=>{throw Error('blocked');}},configurable:true});document.querySelector('.mmir-jarvis-truth').open=true;});
  await control('copy-diagnostics').click();assert.equal(await control('diagnostic-copy').isVisible(),true);
  assert.equal(JSON.parse(await control('diagnostic-copy').inputValue()).outcome,'idle');assert.equal(await page.evaluate(()=>fixture.requests.length+fixture.recognitions.length),0);
 });
 await check('R16 speech timing is measured only when events actually occur',async()=>{
  await jarvis();await control('consent').check();await control('tts').check();await control('talk').click();
  await page.evaluate(()=>fixture.recognitions.at(-1).onspeechend());await page.waitForTimeout(20);await finishSpeech('Mål denne runden');
  await page.waitForFunction(()=>fixture.spoken.length>0);assert.match(await control('speech-timing').textContent(),/taleslutt til første lyd/);
  assert.equal(await page.evaluate(()=>fixture.requests.length),1);
 });
 await check('R17 new conversation removes both pending voice drafts',async()=>{
  await review();await control('talk').click();await finishSpeech('Første privat tekst');await control('talk').click();await finishSpeech('Andre privat tekst');
  await page.evaluate(()=>fixture.reset());assert.equal(await control('transcript').inputValue(),'');assert.equal(await control('saved-text').inputValue(),'');
  assert.equal(await page.evaluate(()=>fixture.requests.length),0);
 });
 await check('R18 outcome distinguishes truncation without claiming a complete answer',async()=>{
  await jarvis();await control('tts').check();await page.evaluate(()=>fixture.preflight=true);await command('Langt svar');
  await page.evaluate(()=>{fixture.begin();fixture.message.truncated=true;fixture.answer('Svarvakt: Svaret nådde lengdegrensen.');});
  await page.waitForFunction(()=>fixture.spoken.length>0);await page.waitForTimeout(80);
  assert.match(await control('outcome').textContent(),/Avkortet/);assert.match(await page.locator('.mmir-jarvis-status').textContent(),/avkortet/);
 });
}
