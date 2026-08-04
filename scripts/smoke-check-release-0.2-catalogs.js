import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const read=(path)=>readFileSync(path,'utf8');
const failures=[];
const assert=(condition,message)=>{if(!condition)failures.push(message);};

const mmir=read('public/mmir.html');
const models=read('public/modeller/index.html');
const capabilities=read('public/kapabiliteter/index.html');
const trust=read('public/tillit/index.html');
const runtime=read('public/release-0.2.js');
const nav=read('public/apps/mimir-chat-portal/p0-release-nav.js');
const navCss=read('public/apps/mimir-chat-portal/p0-release-nav.css');
const releaseCss=read('public/release-0.2.css');
const sw=read('public/sw.js');
const catalogRaw=read('public/capability-catalog.json');
const catalog=JSON.parse(catalogRaw);
const overlay=JSON.parse(read('public/capability-ui.json'));

assert(mmir.includes('p0-release-nav.css?v=20260804-release-0-2-beta-v1'),'chat must load the release navigation stylesheet');
assert(mmir.includes('p0-release-nav.js?v=20260804-release-0-2-beta-v1'),'chat must load the release navigation script');
assert(nav.includes("'./modeller/'")&&nav.includes("'./kapabiliteter/'")&&nav.includes("'./tillit/'"),'visible P0 shell must link all release information tabs');
assert(nav.includes("tag.textContent='0.2 Beta'"),'visible shell must identify the beta release honestly');
assert(!nav.includes('MutationObserver'),'release navigation must not observe the full document tree');
assert(navCss.includes('.p0-release-nav'),'release navigation styles must stay scoped to the P0 shell');
assert(navCss.includes('outline: 3px')&&releaseCss.includes('.skip-link'),'release navigation and information pages must retain visible keyboard focus');

for(const [name,html] of [['models',models],['capabilities',capabilities],['trust',trust]]){
  assert(html.includes('MMIR.ai 0.2 Beta'),name+' page must show the beta release label');
  assert(html.includes('../mmir.html'),name+' page must link back to the clean test surface');
  assert(html.includes('class="skip-link"'),name+' page must provide a keyboard skip link');
  assert(!/<input[^>]+(?:api.?key|secret|token)/i.test(html),name+' page must not collect provider secrets');
}

assert(models.includes('Valgbar total')&&models.includes('Live-verifisert'),'model page must separate authoritative selectable inventory from live proof');
assert(models.includes('kuratert utvalg'),'model page must not claim comprehensive editorial coverage');
assert(models.includes('Åpne og lokale modellfamilier'),'model page must expose the curated open/local discovery area');
assert(!runtime.includes("'Prøv modellen'")&&!runtime.includes("'Test med forbehold'"),'model cards must not pretend to deep-link an exact route');
assert(runtime.includes("'Route-ID'")&&runtime.includes("'Node'"),'model cards must expose route and node identity');
assert(runtime.includes("if(model?.id==='supergeni'){"),'Supergeni must be classified separately from language models');
assert(runtime.includes("return supergeniState.includes('degrad')||model?.executable===false?'degraded':'orchestrator'"),'Supergeni type must not hide operational degradation');
assert(runtime.includes("routeType.includes('external')")&&runtime.includes('gratis kvote · ingen egen API-nøkkel'),'free external routes must have a truthful no-key access label');
assert(runtime.includes('inventory.live_selectable_model_count'),'selectable metric must come from authoritative inventory');
assert(capabilities.includes('id="roadmap-grid"')&&capabilities.includes('id="capability-revision"'),'capability page must show roadmap separately and expose the canonical revision');
assert(capabilities.includes('48 offentlige rader'),'capability page must describe the canonical public projection');
assert(trust.includes('grønt nettsted betyr ikke automatisk'),'trust page must separate site health from intelligence health');

assert(runtime.includes("fetchJson(API_BASE+'/v1/models')"),'model catalog must use the canonical live inventory');
assert(runtime.includes("fetchJson(API_BASE+'/status')"),'capability catalog must overlay the canonical live status');
assert(runtime.includes("fetchJson('../capability-ui.json')"),'capability editorial copy must load as a separate overlay');
assert(runtime.includes('catalog.semantic_revision===overlay.projection_semantic_revision'),'capability UI must fail closed on semantic revision mismatch');
assert(runtime.includes("overlay.object==='mmir.capability_ui_overlay'")&&runtime.includes('Object.keys(overlayCopy).every(id=>ids.has(id))'),'capability UI must reject malformed overlays and unknown capability ids');
assert(runtime.includes('capabilities.length===48'),'capability UI must validate the reviewed public projection shape at runtime');
assert(runtime.includes("readiness==='ready'&&releaseReady&&verified>0"),'trust green must require operator readiness, authenticated release and live route proof');
assert(runtime.includes('model?.live_e2e_verified===true'),'only an explicit E2E flag may classify a model as verified');
assert(!runtime.includes('.innerHTML'),'release catalog renderer must use DOM text APIs rather than HTML interpolation');
assert(!runtime.includes('2026-08-04'),'runtime must not hardcode a verification date');

assert(catalog.object==='mmir.capability_projection','catalog must be the canonical capability projection');
assert(catalog.projection_kind==='public','catalog must use the public projection');
assert(catalog.join_key==='capability_id','catalog join key must remain capability_id');
assert(catalog.semantic_revision==='sha256:a8b63891b29cc0a3ed0ca9e50810c85640bacae80631d1d950574624d324a1ff','catalog semantic revision must match the reviewed canonical revision');
assert(createHash('sha256').update(catalogRaw).digest('hex')==='c87f7f7d18dfd3e1c9bf0e609a6863a1da4686846310eb2e3c47fd9dd339a14d','catalog bytes must match the reviewed canonical projection');
const rows=Array.isArray(catalog.capabilities)?catalog.capabilities:[];
assert(rows.length===48,'public capability projection must expose exactly 48 reviewed rows');
const ids=new Set(rows.map(row=>row.capability_id));
assert(ids.size===rows.length,'canonical capability ids must be unique');
const availability=new Set(['available','limited','limited_advanced','advanced']);
rows.forEach(row=>{
  assert(/^cap-\d{3}$/.test(row.capability_id),'invalid capability id '+row.capability_id);
  assert(availability.has(row.availability),'capability '+row.capability_id+' has unsupported availability');
  assert(Boolean(row.title_no),'capability '+row.capability_id+' must retain canonical Norwegian title');
});
assert(overlay.projection_semantic_revision===catalog.semantic_revision,'editorial overlay must bind the canonical semantic revision');
Object.keys(overlay.copy||{}).forEach(id=>assert(ids.has(id),'overlay copy must join an existing capability_id: '+id));
const roadmap=Array.isArray(overlay.roadmap)?overlay.roadmap:[];
assert(roadmap.find(row=>row.id==='byok')?.state==='unavailable','public BYOK must remain unavailable');
assert(roadmap.find(row=>row.id==='compute-marketplace')?.state==='planned','compute marketplace must remain planned');
assert(roadmap.find(row=>row.id==='autonomous-evolution')?.state==='planned','autonomous evolution must not be presented as green');

for(const asset of ['./modeller/','./kapabiliteter/','./tillit/','./release-0.2.css','./release-0.2.js','./capability-catalog.json','./capability-ui.json','./apps/mimir-chat-portal/p0-release-nav.js']){
  assert(sw.includes("'"+asset+"'"),'service worker must include '+asset);
}

if(failures.length){
  console.error('MMIR 0.2 catalog checks failed:');
  failures.forEach(failure=>console.error('- '+failure));
  process.exit(1);
}

console.log('MMIR 0.2 catalog checks passed.');
