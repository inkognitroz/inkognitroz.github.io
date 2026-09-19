/** Reproductions through the actual P0 composer/history, mocked speech + HTTP only. */
import assert from 'node:assert/strict';
export async function fullShellReliability({page,command,finishSpeech,calls,pass,setReply}) {
 const control=n=>page.locator('[data-jarvis="'+n+'"]');
 await page.setViewportSize({width:1440,height:1000});
 await page.evaluate(()=>{delete visualViewport.height;visualViewport.dispatchEvent(new Event('resize'));});
 await command('@jarvis');await page.waitForSelector('[data-mmir-skin="jarvis"]');
 await page.evaluate(()=>document.querySelector('[data-jarvis="options"]').open=true);
 await control('tts').check();await page.evaluate(()=>jarvisProof.spoken=[]);
 setReply('3 < 5 og 8 > 6.');await command('Les ulikhetene.');
 await page.waitForFunction(()=>jarvisProof.spoken.length>0&&document.getElementById('p0-send').dataset.state==='send');
 assert.equal(await page.evaluate(()=>jarvisProof.spoken.join(' ')),'3 < 5 og 8 > 6.');pass('R-full-1 real shell mathematical meaning preserved in TTS');
 setReply('Dette svaret stopper midt i','length');await page.evaluate(()=>jarvisProof.spoken=[]);await command('Gi et langt svar.');
 await page.waitForFunction(()=>jarvisProof.spoken.length>0&&document.getElementById('p0-send').dataset.state==='send');await page.waitForTimeout(150);
 assert.match(await page.evaluate(()=>jarvisProof.spoken.join(' ')),/Svarvakt:.*lengdegrensen/);
 assert.match(await control('outcome').textContent(),/Avkortet/);pass('R-full-2 core length warning retained and outcome marked truncated');
 setReply('Et vanlig svar.');await control('tts').uncheck();await control('consent').check();await control('input-mode').selectOption('review');
 await control('talk').click();await finishSpeech('Første usendte tekst.');await control('talk').click();const count=calls.length;
 assert.equal(await control('transcript').inputValue(),'');assert.equal(await control('send-capture').isDisabled(),true);
 await page.evaluate(()=>{for(const n of ['send-capture','draft-capture','restore-capture'])document.querySelector('[data-jarvis="'+n+'"]').dispatchEvent(new Event('click'));});
 await page.waitForTimeout(100);assert.equal(calls.length,count);assert.equal(await page.locator('#p0-input').inputValue(),'');pass('R-full-3 old reviewed text cannot send or move while recording');
 await finishSpeech('Andre korrekte tekst.');await control('send-capture').click();
 await page.waitForFunction(()=>document.getElementById('p0-send').dataset.state==='send'&&MmirP0Conversation.snapshot().phase==='complete');
 assert.equal(calls.length,count+1);assert.ok(calls.at(-1).messages.some(m=>m.role==='user'&&m.content==='Andre korrekte tekst.'));
 assert.equal(calls.at(-1).messages.some(m=>m.role==='user'&&m.content==='Første usendte tekst.'),false);pass('R-full-4 only current recording enters actual MMIR history');
 await page.locator('[data-jarvis="saved-capture"] summary').click();await control('restore-capture').click();
 assert.equal(await control('transcript').inputValue(),'Første usendte tekst.');assert.equal(calls.length,count+1);pass('R-full-5 unsent first recording restored without model call');
 await page.locator('[data-p0-sidebar-action="new-chat"]').click();assert.equal(await control('transcript').inputValue(),'');assert.equal(await control('saved-text').inputValue(),'');
 pass('R-full-6 real new-chat clears both voice drafts');
 await page.evaluate(()=>document.querySelector('[data-jarvis="options"]').open=true);
 await control('test-dictation').click();await finishSpeech('MMIR og Jarvis, 12,5 prosent, ikke 15.');
 assert.equal(calls.length,count+1);assert.equal(await control('transcript').inputValue(),'MMIR og Jarvis, 12,5 prosent, ikke 15.');pass('R-full-7 device dictation practice never reaches the actual chat endpoint');
}
