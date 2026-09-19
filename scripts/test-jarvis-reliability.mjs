/** Deterministic text semantics. No network, speech engine or provider calls. */
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {test} from 'node:test';
const ctx=vm.createContext({window:{}});
vm.runInContext(readFileSync(new URL('../public/apps/mimir-chat-portal/p0-speech-utils.js',import.meta.url),'utf8'),ctx);
const U=ctx.window.MmirSpeechUtils;
const corpus=[
 ['3 < 5 og 8 > 6.','3 < 5 og 8 > 6.'],
 ['3<5 og 8>6.','3<5 og 8>6.'],
 ['x < y && y > z','x < y && y > z'],
 ['a<b>c; x<p>y; A<T>','a<b>c; x<p>y; A<T>'],
 ['2 <= 3; 7 >= 6; x ≠ y; x ≤ y.','2 <= 3; 7 >= 6; x ≠ y; x ≤ y.'],
 ['-5 °C; - 5 °C; + 2 %.','-5 °C; - 5 °C; + 2 %.'],
 ['- 5 °C\n+ 2 °C','- 5 °C\n+ 2 °C'],
 ['2 * 3 * 4 = 24; 2*3*4=24','2 * 3 * 4 = 24; 2*3*4=24'],
 ['mmir_model_id, x_1, 10^3','mmir_model_id, x_1, 10^3'],
 ['12,5 % er ikke 15 %.','12,5 % er ikke 15 %.'],
 ['19.09.2026 kl. 12.30, 1 234,50 kr.','19.09.2026 kl. 12.30, 1 234,50 kr.'],
 ['**Ikke** send _e-posten_.','Ikke send e-posten.'],
 ['### Viktig\n- Ikke slett.\n- Behold utkastet.','Viktig\nIkke slett.\nBehold utkastet.'],
 ['<p>En.</p><p>To.</p>','En.\n\nTo.'],
 ['<div><p><strong>Ikke</strong> slett.</p></div>','Ikke slett.'],
 ['<span title="1 > 0">Trygg tekst</span>','Trygg tekst'],
 ['10<sup>3</sup> og CO<sub>2</sub>','10^3 og CO_2'],
 ['5 &lt; 6 &amp; 8 &gt; 7','5 < 6 & 8 > 7'],
 ['5 &#60; 6 &#x3E; 4; &#248;','5 < 6 > 4; ø'],
 ['`x < y` og `mmir_id`','x < y og mmir_id'],
 ['<script>alert(1)</script><style>.secret{}</style><p>Synlig.</p>','Synlig.'],
 ['<!-- usynlig --><p>Synlig.</p>','Synlig.'],
 ['<a href="https://example.org">Kilde</a>','Kilde'],
 ['<prosjekt> er et plassholdernavn.','<prosjekt> er et plassholdernavn.']
];
for(const [input,expected] of corpus)test('reliability: preserves meaning '+JSON.stringify(input),()=>assert.equal(U.text(input),expected));
test('reliability: streamed sentences retain all comparisons after formatting',()=>{let rest='',out=[];for(const x of ['3 < ','5 og 8 >',' 6. Mer ','tekst.']){const p=U.sentences(rest+x);rest=p.rest;out.push(...p.complete.map(U.text));}out.push(...U.sentences(rest,true).complete.map(U.text));assert.equal(out.join(' '),'3 < 5 og 8 > 6. Mer tekst.');});
test('reliability: incomplete hidden HTML does not become early speech',()=>{const a=U.sentences('<script>Ikke les dette. ');assert.equal(a.complete.length,0);const b=U.sentences(a.rest+'</script><p>Riktig svar.</p>',true);assert.equal(b.complete.map(U.text).join(' ').trim(),'Riktig svar.');});
test('reliability: Norwegian abbreviations retain the following number',()=>assert.equal(U.sentences('Vi møtes kl. 12.30. Neste').complete[0],'Vi møtes kl. 12.30.'));
test('reliability: deterministic corpus never invokes DOM or provider',()=>{assert.equal(ctx.window.document,undefined);assert.equal(ctx.window.fetch,undefined);for(const [input]of corpus)assert.equal(typeof U.text(input),'string');});
