import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const read=(path)=>readFileSync(path,'utf8');
const failures=[];
const assert=(condition,message)=>{if(!condition)failures.push(message);};

const mmir=read('public/mmir.html');
const rootEntry=read('public/index.html');
const models=read('public/modeller/index.html');
const capabilities=read('public/kapabiliteter/index.html');
const trust=read('public/tillit/index.html');
const runtime=read('public/release-0.2.js');
const taxonomy=read('public/release-route-taxonomy.js');
const p0Shell=read('public/apps/mimir-chat-portal/p0-chat-shell.js');
const brandConfig=read('public/apps/mimir-chat-portal/brand-config.js');
const legacyPortal=read('public/apps/mimir-chat-portal/mimir-chat-portal.js');
const nav=read('public/apps/mimir-chat-portal/p0-release-nav.js');
const navCss=read('public/apps/mimir-chat-portal/p0-release-nav.css');
const releaseCss=read('public/release-0.2.css');
const sw=read('public/sw.js');
const catalogRaw=read('public/capability-catalog.json');
const catalog=JSON.parse(catalogRaw);
const overlay=JSON.parse(read('public/capability-ui.json'));
const proofSafeTagline='0.2 Beta · status verifiseres live';
const unprovenTagline='Intelligence. Connected.';

assert(mmir.includes('p0-release-nav.css?v=20260804-release-0-2-beta-v1'),'chat must load the release navigation stylesheet');
assert(mmir.includes('p0-release-nav.js?v=20260804-release-0-2-beta-v1'),'chat must load the release navigation script');
assert(mmir.includes('p0-chat-shell.js?v=20260810-proof-safe-tagline-v1'),'chat must bind the proof-safe shell asset version');
assert(nav.includes("'./modeller/'")&&nav.includes("'./kapabiliteter/'")&&nav.includes("'./tillit/'"),'visible P0 shell must link all release information tabs');
assert(nav.includes("tag.textContent='0.2 Beta'"),'visible shell must identify the beta release honestly');
assert(!nav.includes('MutationObserver'),'release navigation must not observe the full document tree');
assert(navCss.includes('.p0-release-nav'),'release navigation styles must stay scoped to the P0 shell');
assert(navCss.includes('outline: 3px')&&releaseCss.includes('.skip-link'),'release navigation and information pages must retain visible keyboard focus');

for(const [name,html] of [['models',models],['capabilities',capabilities],['trust',trust]]){
  assert(html.includes('MMIR.ai 0.2 Beta'),name+' page must show the beta release label');
  assert(html.includes(proofSafeTagline),name+' page must show the proof-safe live-status tagline');
  assert(!html.includes(unprovenTagline),name+' page must not show an unproven connected-intelligence claim');
  assert(html.includes('../mmir.html'),name+' page must link back to the clean test surface');
  assert(html.includes('class="skip-link"'),name+' page must provide a keyboard skip link');
  assert(!/<input[^>]+(?:api.?key|secret|token)/i.test(html),name+' page must not collect provider secrets');
}

assert(p0Shell.includes(proofSafeTagline),'visible chat shell must show the proof-safe live-status tagline');
assert(!p0Shell.includes(unprovenTagline),'visible chat shell must not show an unproven connected-intelligence claim');

assert(models.includes('Gratis å prøve nå')&&models.includes('Konfigurert, utilgjengelig'),'model page must separate testable-now truth from configured inventory');
assert(models.includes('kuratert utvalg'),'model page must not claim comprehensive editorial coverage');
assert(models.includes('Åpne og lokale modellfamilier'),'model page must expose the curated open/local discovery area');
assert(!runtime.includes("'Prøv modellen'")&&!runtime.includes("'Test med forbehold'"),'model cards must not pretend to deep-link an exact route');
assert(runtime.includes("'Route-ID'")&&runtime.includes("'Node'"),'model cards must expose route and node identity');
assert(taxonomy.includes("free_now:'Gratis å prøve nå'"),'shared taxonomy must expose the exact free-now label');
assert(taxonomy.includes("configured_unavailable:'Konfigurert · utilgjengelig nå'"),'shared taxonomy must distinguish configured but unavailable routes');
assert(taxonomy.includes("local_ready:'Lokal · paret node'")&&taxonomy.includes("local_setup:'Lokal · krever paret node'"),'shared taxonomy must distinguish paired and unpaired local models');
assert(taxonomy.includes("byok_unavailable:'BYOK · ikke støttet i 0.2'")&&taxonomy.includes("planned:'Planlagt · ikke tilgjengelig'"),'shared taxonomy must distinguish BYOK and planned routes');
assert(taxonomy.includes("writer?.authenticated_release_ready===true")&&taxonomy.includes("journeys?.first_chat_ready===true")&&taxonomy.includes("model?.live_e2e_verified===true"),'free-now truth must require authenticated release, first-chat readiness and exact model E2E proof');
assert(runtime.includes('RELEASE_ROUTE_TAXONOMY.classifyModel'),'model catalog must consume the shared taxonomy');
assert(p0Shell.includes('RELEASE_ROUTE_TAXONOMY.releaseReadiness')&&p0Shell.includes('RELEASE_ROUTE_TAXONOMY.hostedTryableNow'),'chat selectability must consume the same shared taxonomy');
assert(!runtime.includes('inventory.live_selectable_model_count'),'public testability must not inherit the configured inventory count');
assert(capabilities.includes('id="roadmap-grid"')&&capabilities.includes('id="capability-revision"'),'capability page must show roadmap separately and expose the canonical revision');
assert(capabilities.includes('48 offentlige rader'),'capability page must describe the canonical public projection');
assert(trust.includes('grønt nettsted betyr ikke automatisk'),'trust page must separate site health from intelligence health');

assert(runtime.includes("fetchJson(API_BASE+'/v1/models')"),'model catalog must use the canonical live inventory');
assert(runtime.includes("fetchJson(API_BASE+'/status')"),'model catalog must bind card testability to canonical release status');
assert(runtime.includes("fetchJson(API_BASE+'/status')"),'capability catalog must overlay the canonical live status');
assert(runtime.includes("fetchJson('../capability-ui.json')"),'capability editorial copy must load as a separate overlay');
assert(runtime.includes('catalog.semantic_revision===overlay.projection_semantic_revision'),'capability UI must fail closed on semantic revision mismatch');
assert(runtime.includes("overlay.object==='mmir.capability_ui_overlay'")&&runtime.includes('Object.keys(overlayCopy).every(id=>ids.has(id))'),'capability UI must reject malformed overlays and unknown capability ids');
assert(runtime.includes('capabilities.length===48'),'capability UI must validate the reviewed public projection shape at runtime');
assert(runtime.includes("readiness==='ready'&&releaseReady&&verified>0"),'trust green must require operator readiness, authenticated release and live route proof');
assert(taxonomy.includes('model?.live_e2e_verified===true'),'only an explicit E2E flag may classify a model as live verified');
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

assert(!mmir.includes('Active: Supergeni')&&!mmir.includes('Supergeni answers now.')&&!mmir.includes('The first answer works without setup')&&!mmir.includes('Supergeni active.'),'no-JS and slow-JS markup must not claim an unverified answer route');
assert(!rootEntry.includes('connected intelligence with private, verifiable answers')&&!rootEntry.includes('Connected intelligence, private answers and source-aware routes are the public first screen.'),'root redirect must not claim intelligence, privacy or answer availability before runtime verification');
assert(rootEntry.includes('Readiness is checked on the chat surface before use.'),'root redirect must state that runtime readiness is checked after redirect');
assert(!brandConfig.includes("text('#active-chat-description',config.chat_description)")&&!brandConfig.includes("text('#active-chat-title',config.active_title)"),'brand identity config must not overwrite the neutral chat readiness fields before runtime truth loads');
assert(!legacyPortal.includes("activeBadge.textContent='Active: '")&&!legacyPortal.includes("activeBadge.textContent='Free chat ready'")&&!legacyPortal.includes('Supergeni answers immediately'),'deferred legacy profile UI must not overwrite canonical chat readiness before live runtime proof');
assert(mmir.indexOf('release-route-taxonomy.js?v=')<mmir.indexOf('p0-chat-shell.js?v='),'shared taxonomy must load before the public chat shell');
assert(models.indexOf('release-route-taxonomy.js?v=')<models.indexOf('release-0.2.js?v='),'shared taxonomy must load before the model catalog runtime');

for(const asset of ['./modeller/','./kapabiliteter/','./tillit/','./release-0.2.css','./release-0.2.js','./release-route-taxonomy.js','./capability-catalog.json','./capability-ui.json','./apps/mimir-chat-portal/p0-release-nav.js']){
  assert(sw.includes("'"+asset+"'"),'service worker must include '+asset);
}

if(failures.length){
  console.error('MMIR 0.2 catalog checks failed:');
  failures.forEach(failure=>console.error('- '+failure));
  process.exit(1);
}

console.log('MMIR 0.2 catalog checks passed.');
