import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const stripPath = join(root, 'public', 'apps', 'mimir-chat-portal', 'active-node-strip.js');
const htmlPath = join(root, 'public', 'mmir.html');
const manifestPath = join(root, 'public', 'apps', 'mimir-chat-portal', 'asset-versions.json');

const strip = readFileSync(stripPath, 'utf8');
const html = readFileSync(htmlPath, 'utf8');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const failures = [];

function fail(message) {
  failures.push(message);
}

function requireIncludes(source, needle, message) {
  if (!source.includes(needle)) fail(message);
}

requireIncludes(strip, 'function visibleInventory(nodes)', 'Active node strip must summarize visible route inventory.');
requireIncludes(strip, 'function routeChoiceReason(node)', 'Active node strip must explain why the active route was chosen.');
requireIncludes(strip, 'function capacityLine(nodes)', 'Active node strip must summarize ready/visible/local capacity.');
requireIncludes(strip, 'function nextStepAction(best,nodes)', 'Active node strip must derive a single best next step from live route state.');
requireIncludes(strip, 'function nextStepMarkup(action)', 'Active node strip must render the next-step callout.');
requireIncludes(strip, 'function stripNodes(allNodes,best)', 'Active node strip must be able to keep the selected route visible alongside the public-first cards.');
requireIncludes(strip, 'const best=bestNode(allNodes,selected);', 'Active node strip must derive the active route from the full manifest, not only the compact public-first subset.');
requireIncludes(strip, 'if(best&&!result.some(node=>node.id===best.id))result.push(best);', 'Active node strip must add the selected active route back into the compact strip when it would otherwise be hidden.');
requireIncludes(strip, 'Chosen because a verified private local model is already live on this device.', 'Local-ready path must explain why MMIR promoted the private route.');
requireIncludes(strip, 'Chosen because it can answer first while local/private routes are still being verified.', 'Hosted fallback path must explain why it stays first.');
requireIncludes(strip, 'browser candidates parked until proof', 'Active node strip must keep browser candidates visible without promoting them.');
requireIncludes(strip, 'Next best step: connect the private local path so MMIR can upgrade from instant fallback to verified device-owned chat.', 'Fallback path must tell the user to connect the private local route next.');
requireIncludes(strip, 'Send first local answer', 'Local-ready path must offer a direct first-answer CTA.');
requireIncludes(strip, 'Install Local Node', 'Active node strip must offer a direct local-install CTA when private chat is not ready.');
requireIncludes(strip, "secondary:{kind:'anchor',href:'#node-dashboard',label:'Open Node Dashboard'}", 'Local-install path must keep the node doctor one tap away.');
requireIncludes(strip, 'mmir-active-node-next-step-actions', 'Next-step callout must support a compact multi-CTA action row.');
requireIncludes(strip, 'function visibilityFooter(displayedCount,inventory)', 'Active node strip must explain when the compact strip is hiding extra visible routes.');
requireIncludes(strip, "Showing '+safe(displayedCount)+' of '+safe(inventory.visible)+' visible routes here.", 'Active node strip must disclose when more visible routes exist than the strip renders.');
requireIncludes(strip, 'Show all routes', 'Active node strip must offer a direct path to the full route library when extra visible routes are hidden.');
requireIncludes(strip, 'function feedbackDraft(best,freshness)', 'Active node strip must be able to draft route feedback from the live strip.');
requireIncludes(strip, 'function feedbackFooter(best,freshness)', 'Active node strip must show a direct route-feedback handoff when freshness is not current.');
requireIncludes(strip, 'Capture route friction from this exact surface so owner triage keeps the live demo path honest.', 'Route strip must explain why route feedback is being requested.');
requireIncludes(strip, 'Recheck the public route manifest before escalating so demo trust can recover from this exact surface.', 'Route strip must offer a trust-recovery hint before escalation.');
requireIncludes(strip, 'data-active-route-refresh', 'Route strip must expose a direct route-refresh action when freshness needs review.');
requireIncludes(strip, 'Refresh route inventory', 'Degraded route freshness must expose a clear refresh CTA.');
requireIncludes(strip, 'Refreshing route inventory...', 'Route strip must expose a visible in-progress label while the route manifest is refreshing.');
requireIncludes(strip, 'aria-busy="', 'Route-refresh CTA must expose busy state for assistive tech and clearer demo feedback.');
requireIncludes(strip, 'Report route issue', 'Route strip must offer a direct route-feedback CTA.');
requireIncludes(strip, "promptEl.value=feedbackDraft(best,freshness);", 'Route-feedback CTA must prefill a sanitized @feedback draft.');
requireIncludes(strip, "bar.querySelectorAll('[data-active-route-refresh]').forEach(button=>button.addEventListener('click',()=>refreshRouteInventory()));", 'Route-refresh CTA must re-run the route inventory load from the strip.');
requireIncludes(strip, "q('#active-chat-description')&&(q('#active-chat-description').textContent=choiceReason+' '+summary+'.');", 'Hero description must reflect route-choice reasoning plus capacity summary.');
requireIncludes(strip, "q('#active-chat-title')&&(q('#active-chat-title').textContent=best.name+' active - '+inventory.ready+' ready now.');", 'Hero title must show active-route readiness count.');
requireIncludes(strip, "(state==='online'?'Ready':'Setup')+' · '+inventory.ready+'/'+inventory.visible", 'Active route pill must expose ready vs visible capacity.');

const expectedVersion = '20260623-active-route-selected-visibility-v1';
if (manifest.assets?.['active-node-strip.js'] !== expectedVersion) {
  fail('Asset manifest must track the active-node visibility update.');
}
requireIncludes(html, `active-node-strip.js?v=${expectedVersion}`, 'mmir.html must cache-bust the active-node visibility update.');

if (failures.length) {
  console.error('Active node visibility smoke failed:');
  failures.forEach((failure) => console.error('- ' + failure));
  process.exit(1);
}

console.log('Active node visibility smoke passed.');
