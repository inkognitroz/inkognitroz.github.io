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
requireIncludes(strip, 'function activeRouteLine(best,selected)', 'Active node strip must derive the compact headline from the actual active route.');
requireIncludes(strip, 'function routePolicyLine(node)', 'Active node strip must summarize active route trust, cost and boundary policy.');
requireIncludes(strip, 'function nextStepMarkup(action)', 'Active node strip must render the next-step callout.');
requireIncludes(strip, 'function stripNodes(allNodes,best)', 'Active node strip must be able to keep the selected route visible alongside the public-first cards.');
requireIncludes(strip, "function storageGet(key,fallback='')", 'Active node strip must guard localStorage reads so blocked storage cannot break first paint.');
requireIncludes(strip, 'function storageSet(key,value)', 'Active node strip must guard localStorage writes so install resume persistence remains best-effort.');
requireIncludes(strip, "const active=storageGet(ACTIVE_KEY,'');", 'Active profile lookup must tolerate unavailable localStorage.');
requireIncludes(strip, "return storageGet(WORKSPACE_KEY,'personal')||'personal';", 'Active workspace lookup must fall back when localStorage is unavailable.');
requireIncludes(strip, 'storageSet(repairResumeKey(),JSON.stringify(resume));', 'Local install resume storage must be best-effort rather than render-blocking.');
requireIncludes(strip, "if(storageGet(ACTIVE_KEY,'')==='mmir-api-bootstrap')", 'Active-route selection must not read localStorage directly.');
requireIncludes(strip, 'const best=bestNode(allNodes,selected);', 'Active node strip must derive the active route from the full manifest, not only the compact public-first subset.');
requireIncludes(strip, 'const state=nodeStatus(best),line=activeRouteLine(best,selected),policy=routePolicyLine(best),inventory=visibleInventory(allNodes)', 'Active node strip headline must use the active route helper and policy helper instead of selected-model-only labels.');
requireIncludes(strip, "const costMode=String(node?.cost?.mode||meta.cost_class||'free').replace(/-/g,' ');", 'Active route policy line must expose route cost mode from manifest metadata.');
requireIncludes(strip, "const boundary=meta.execution_boundary?String(meta.execution_boundary).replace(/-/g,' '):(isLocalAdapter(node)||node?.id==='local-node'?'localhost/private node':(needsWebGpu(node)?'current browser session':'public starter route'));", 'Active route policy line must expose execution boundary without inventing backend claims.');
requireIncludes(strip, "const prompt=node?.id==='local-node'||isLocalAdapter(node)||meta.prompt_left_device===false?'prompt stays local':'no private prompt stored in browser';", 'Active route policy line must show whether the prompt stays local.');
requireIncludes(strip, "const keys=meta.provider_key_required===true?'provider key required':'no provider key';", 'Active route policy line must expose provider key requirements.');
requireIncludes(strip, "const approval=node?.cost?.requires_approval===true?'approval required':'no paid route started';", 'Active route policy line must keep paid-route approval status explicit.');
requireIncludes(strip, "class=\"mmir-active-node-policy\" aria-label=\"Active route policy\"", 'Active route strip must render the active route policy line in the headline.');
requireIncludes(strip, 'if(best&&!result.some(node=>node.id===best.id))result.push(best);', 'Active node strip must add the selected active route back into the compact strip when it would otherwise be hidden.');
requireIncludes(strip, 'Chosen because a verified private local model is already live on this device.', 'Local-ready path must explain why MMIR promoted the private route.');
requireIncludes(strip, 'Chosen because it can answer first while local/private routes are still being verified.', 'Hosted fallback path must explain why it stays first.');
requireIncludes(strip, 'browser candidates parked until proof', 'Active node strip must keep browser candidates visible without promoting them.');
requireIncludes(strip, 'function manifestTrustLine(updatedAt,inventory)', 'Active node strip must derive an accessible trust line from manifest timestamp and inventory count.');
requireIncludes(strip, "count+' public route'+(count===1?'':'s')", 'Manifest trust line must expose the public route count.');
requireIncludes(strip, 'function formatFutureAge(days)', 'Active node strip must have explicit copy for future manifest timestamps.');
requireIncludes(strip, "if(ageDays<-0.007)return withRefreshState({state:'watch',label:'Route inventory timestamp ahead'", 'Future route manifest timestamps must not be treated as current.');
requireIncludes(strip, 'recheck clock or manifest before demo trust', 'Future route manifest timestamps must tell the tester how to recover route trust.');
requireIncludes(strip, "return 'Ready now: '+(best?.name||selected?.label||FALLBACK_LABEL);", 'Fallback route headline must prefer the actual active route label.');
requireIncludes(strip, 'Next best step: connect the private local path so MMIR can upgrade from instant fallback to verified device-owned chat.', 'Fallback path must tell the user to connect the private local route next.');
requireIncludes(strip, 'Send first local answer', 'Local-ready path must offer a direct first-answer CTA.');
requireIncludes(strip, 'Install Local Node', 'Active node strip must offer a direct local-install CTA when private chat is not ready.');
requireIncludes(strip, "secondary:{kind:'anchor',href:'#node-dashboard',label:'Open Node Dashboard'}", 'Local-install path must keep the node doctor one tap away.');
requireIncludes(strip, 'mmir-active-node-next-step-actions', 'Next-step callout must support a compact multi-CTA action row.');
requireIncludes(strip, 'function visibilityFooter(displayedCount,inventory)', 'Active node strip must explain when the compact strip is hiding extra visible routes.');
requireIncludes(strip, "Showing '+safe(displayedCount)+' of '+safe(inventory.visible)+' visible routes here.", 'Active node strip must disclose when more visible routes exist than the strip renders.');
requireIncludes(strip, 'Show all routes', 'Active node strip must offer a direct path to the full route library when extra visible routes are hidden.');
requireIncludes(strip, 'function feedbackDraft(best,freshness)', 'Active node strip must be able to draft route feedback from the live strip.');
requireIncludes(strip, 'const policy=routePolicyLine(best);', 'Active route feedback drafts must preserve the visible cost/privacy route policy.');
requireIncludes(strip, "' Policy: '+policy+'. Please review the route strip and next-step guidance.'", 'Active route feedback drafts must carry policy evidence into triage.');
requireIncludes(strip, 'let lastActiveRouteFeedbackKey=\'\';', 'Active route feedback must remember the last captured route state in-session.');
requireIncludes(strip, "const ACTIVE_ROUTE_FEEDBACK_PREFIX='mimir-active-route-feedback-v1:';", 'Active route feedback dedupe must persist per workspace.');
requireIncludes(strip, 'function activeRouteFeedbackKey(best,freshness)', 'Active route feedback must derive an idempotency key from visible route state.');
requireIncludes(strip, 'function activeRouteFeedbackStorageKey()', 'Active route feedback must use a workspace-scoped storage key.');
requireIncludes(strip, 'function readCapturedActiveRouteFeedbackKey()', 'Active route feedback must read persisted capture state before showing another draft action.');
requireIncludes(strip, 'function rememberActiveRouteFeedbackKey(key)', 'Active route feedback must persist captured route state after saving a draft.');
requireIncludes(strip, 'function feedbackFooter(best,freshness)', 'Active node strip must show a direct route-feedback handoff when freshness is not current.');
requireIncludes(strip, 'Capture route friction from this exact surface so owner triage keeps the live demo path honest.', 'Route strip must explain why route feedback is being requested.');
requireIncludes(strip, 'Recheck the public route manifest before escalating so demo trust can recover from this exact surface.', 'Route strip must offer a trust-recovery hint before escalation.');
requireIncludes(strip, 'data-active-route-refresh', 'Route strip must expose a direct route-refresh action when freshness needs review.');
requireIncludes(strip, 'Refresh route inventory', 'Degraded route freshness must expose a clear refresh CTA.');
requireIncludes(strip, 'Refreshing route inventory...', 'Route strip must expose a visible in-progress label while the route manifest is refreshing.');
requireIncludes(strip, 'aria-busy="', 'Route-refresh CTA must expose busy state for assistive tech and clearer demo feedback.');
requireIncludes(strip, 'Report route issue', 'Route strip must offer a direct route-feedback CTA.');
requireIncludes(strip, 'Route issue saved', 'Route strip must show when this route issue has already been captured.');
requireIncludes(strip, "const canReport=freshness.state==='degraded'||manifestRefreshState==='failed';", 'Route strip must gate feedback capture until freshness is degraded or refresh failed.');
requireIncludes(strip, 'data-route-feedback-action="', 'Route feedback footer must expose whether the current state is reportable or refresh-first.');
requireIncludes(strip, 'Recheck route inventory first; create feedback only if refresh fails or the route is degraded.', 'Route watch states must prompt recheck before feedback capture.');
requireIncludes(strip, 'data-route-feedback-captured="', 'Route feedback footer must expose captured state for scoped styling and inspection.');
requireIncludes(strip, 'Saved to Feedback Inbox for this route state. Recheck inventory before creating another route issue.', 'Captured route feedback status must explain how to recover before filing another issue.');
requireIncludes(strip, 'const captured=lastActiveRouteFeedbackKey===key||readCapturedActiveRouteFeedbackKey()===key;', 'Route-feedback UI must stay captured after reload for the same workspace and route state.');
requireIncludes(strip, 'if(lastActiveRouteFeedbackKey===key||readCapturedActiveRouteFeedbackKey()===key)return true;', 'Route-feedback capture must avoid duplicate drafts for the same visible route state across reloads.');
requireIncludes(strip, 'rememberActiveRouteFeedbackKey(key);render();return true;', 'Runtime-bridge route-feedback saves must persist the dedupe key.');
requireIncludes(strip, 'rememberActiveRouteFeedbackKey(key);', 'Fallback route-feedback drafts must persist the dedupe key.');
requireIncludes(strip, '.mmir-active-node-overflow button[data-captured="true"]', 'Captured route feedback buttons must have scoped saved-state styling.');
requireIncludes(strip, "w.MimirChatRuntimeBridge?.saveFeedbackDraft?.(feedbackDraft(best,freshness),{", 'Route-feedback CTA must save a local draft through the runtime bridge when available.');
requireIncludes(strip, "source:'active-route-strip'", 'Route-feedback drafts must record the active-route strip as their source.');
requireIncludes(strip, "openInbox:true", 'Route-feedback CTA must open Feedback Inbox after saving the local route draft.');
requireIncludes(strip, "promptEl.value=feedbackDraft(best,freshness);", 'Route-feedback CTA must prefill a sanitized @feedback draft.');
requireIncludes(strip, "bar.querySelectorAll('[data-active-route-refresh]').forEach(button=>button.addEventListener('click',()=>refreshRouteInventory()));", 'Route-refresh CTA must re-run the route inventory load from the strip.');
requireIncludes(strip, "q('#active-chat-description')&&(q('#active-chat-description').textContent=choiceReason+' '+summary+'. '+policy+'.');", 'Hero description must reflect route-choice reasoning, capacity summary and route policy.');
requireIncludes(strip, "q('#active-chat-title')&&(q('#active-chat-title').textContent=best.name+' active - '+inventory.ready+' ready now.');", 'Hero title must show active-route readiness count.');
requireIncludes(strip, "(state==='online'?'Ready':'Setup')+' · '+inventory.ready+'/'+inventory.visible", 'Active route pill must expose ready vs visible capacity.');

const expectedVersion = '20260704-route-refresh-first-feedback-v1';
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
