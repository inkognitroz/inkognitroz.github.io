import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = process.cwd();
const shell = readFileSync(join(resolve(root, 'public'), 'apps', 'mimir-chat-portal', 'p0-chat-shell.js'), 'utf8');
const css = readFileSync(join(resolve(root, 'public'), 'apps', 'mimir-chat-portal', 'p0-chat-shell.css'), 'utf8');
const html = readFileSync(join(resolve(root, 'public'), 'mmir.html'), 'utf8');
const manifest = readFileSync(join(resolve(root, 'public'), 'apps', 'mimir-chat-portal', 'asset-versions.json'), 'utf8');
const failures = [];

function fail(message) {
  failures.push(message);
}

function requireIncludes(source, needle, message) {
  if (!source.includes(needle)) fail(message);
}

function functionSource(name, nextName) {
  const start = shell.indexOf(`function ${name}(`);
  const next = nextName ? shell.indexOf(`function ${nextName}(`, start + 1) : -1;
  if (start < 0) {
    fail(`Missing P0 function: ${name}`);
    return '';
  }
  return shell.slice(start, next > start ? next : undefined);
}

const renderAddMenu = functionSource('renderAddMenu', 'renderPromptPresetMenu');
const handleMenuAction = functionSource('handleMenuAction', 'setActiveRoutePinned');
const sendMessage = functionSource('sendMessage', 'compareLiveRoutes');
const compareGatewayRoutes = functionSource('compareGatewayRoutes', 'synthesizeCompareAnswer');

requireIncludes(shell, "const LOCAL_MEMORY_ITEMS_KEY='mmir-p0-local-memory-items-v1'", 'Local memory must have a browser-local storage key.');
requireIncludes(shell, "const LOCAL_DOCUMENT_NOTES_KEY='mmir-p0-local-document-notes-v1'", 'Local document notes must have a browser-local storage key.');
requireIncludes(shell, "const TOOL_CONTEXT_KEY='mmir-p0-last-tool-context-v1'", 'Verified tool context must have a browser-local proof key.');
requireIncludes(renderAddMenu, "menuSection('Many AI')", '+ menu must group scaled-intelligence actions before utility tools.');
requireIncludes(renderAddMenu, "menuButton('boost-answer-live','Superboost'", '+ menu must expose Superboost, not old Boost answer wording, behind Tools.');
requireIncludes(renderAddMenu, "menuButton('supergeni-council-live','Debate'", '+ menu must expose Debate as a one-click council action behind Tools.');
requireIncludes(shell, 'id="p0-superboost"', 'Composer must expose Superboost as the visible wow path.');
requireIncludes(shell, 'function renderSuperboostCta()', 'Superboost CTA must update from live route inventory.');
requireIncludes(shell, "label=visibleCount?'Superboost · '+String(visibleCount)+' AI':'Superboost'", 'Superboost CTA must show the live AI route count when available.');
requireIncludes(shell, 'id="p0-token-counter"', 'Status rail must expose a discreet token counter health signal.');
requireIncludes(shell, 'function recordTokenUsage(payload,source', 'Runtime must record token usage after chat and swarm responses.');
requireIncludes(shell, "recordTokenUsage(data,'gateway-fanout')", 'Gateway Superboost/Debate responses must update the token counter.');
requireIncludes(shell, "recordTokenUsage(hostedData,'hosted-chat')", 'Hosted chat responses must update the token counter.');
requireIncludes(shell, 'id="p0-council"', 'Composer must expose Debate/Supergeni Council as a visible scaled-intelligence path.');
requireIncludes(shell, 'function renderCouncilCta()', 'Debate/Supergeni Council CTA must update from live route inventory.');
requireIncludes(shell, "label=visibleCount?'Debate · '+String(visibleCount)+' AI':'Debate'", 'Debate CTA must show the live AI route count when available.');
requireIncludes(shell, "action==='supergeni-council-live'", 'Composer route actions must handle the visible Council CTA.');
requireIncludes(shell, 'function supergeniCouncil()', 'Visible Council CTA must reuse the gateway council flow.');
requireIncludes(shell, 'Supergeni answers now. Use Superboost for many AI routes, ranking and one best answer, or start with demo, source proof, local setup or feedback capture.', 'Empty state must point users to the scaled-intelligence wow path without dropping guided starters.');
requireIncludes(renderAddMenu, "menuButton('ask-all-active','Ask all active'", '+ menu must expose Ask all active without adding a visible toolbar button.');
requireIncludes(renderAddMenu, 'p0-intelligence-map', '+ menu must show one subtle green intelligence map line without adding toolbar buttons.');
requireIncludes(renderAddMenu, "menuSection('Verified tools')", '+ menu must group verified no-key tools separately.');
requireIncludes(renderAddMenu, "menuButton('verified-calculator','Verified calculator'", '+ menu must expose the verified calculator without toolbar clutter.');
requireIncludes(renderAddMenu, "menuButton('verified-time','Current time'", '+ menu must expose current time context without toolbar clutter.');
requireIncludes(renderAddMenu, "menuButton('verified-source','Verified source'", '+ menu must expose manual source grounding without toolbar clutter.');
requireIncludes(renderAddMenu, "menuSection('Local memory')", '+ menu must group local memory under a secondary section.');
requireIncludes(renderAddMenu, "menuButton('local-memory-guide','Memory guide'", '+ menu must explain memory through chat-native commands.');
requireIncludes(renderAddMenu, "menuButton('show-local-memory','Show memory'", '+ menu must let users inspect browser-local memory.');
requireIncludes(renderAddMenu, "menuButton('add-document-note','Add document note'", '+ menu must prepare browser-only document notes.');
requireIncludes(handleMenuAction, "action==='boost-answer-live'", 'Menu actions must handle Superboost.');
requireIncludes(handleMenuAction, "action==='ask-all-active'", 'Menu actions must handle Ask all active.');
requireIncludes(handleMenuAction, "action==='supergeni-council-live'", 'Menu actions must handle Debate/Supergeni Council.');
requireIncludes(handleMenuAction, "action==='verified-calculator'", 'Menu actions must handle verified calculator.');
requireIncludes(handleMenuAction, "action==='verified-time'", 'Menu actions must handle current time context.');
requireIncludes(handleMenuAction, "action==='verified-source'", 'Menu actions must handle verified manual source context.');
requireIncludes(handleMenuAction, "action==='local-memory-guide'", 'Menu actions must handle local memory guide.');
requireIncludes(handleMenuAction, "action==='show-local-memory'", 'Menu actions must handle local memory display.');
requireIncludes(handleMenuAction, "action==='add-document-note'", 'Menu actions must handle document note template.');
requireIncludes(sendMessage, 'handleLocalKnowledgeCommand(prompt,input)', 'Local memory commands must be handled before provider calls.');
requireIncludes(compareGatewayRoutes, "options.mode==='boost'", 'Gateway compare must have a dedicated Superboost mode.');
requireIncludes(compareGatewayRoutes, "options.mode==='all'", 'Gateway compare must have a dedicated Ask all active mode.');
requireIncludes(shell, "const SWARM_PREVIEW_PATH=ROUTE_ADAPTER_CONFIG.swarmPreviewPath||'/chat/swarm/preview'", 'P0 runtime must know the swarm preview endpoint.');
requireIncludes(shell, "const SUPERBOOST_PREVIEW_PATH=ROUTE_ADAPTER_CONFIG.superboostPreviewPath||'/chat/superboost/preview'", 'P0 runtime must know the dedicated Superboost preview endpoint.');
requireIncludes(shell, "const NO_KEY_TOOL_PREVIEW_PATH=ROUTE_ADAPTER_CONFIG.noKeyToolPreviewPath||'/tools/no-key/preview'", 'P0 runtime must know the no-key tool preview endpoint.');
requireIncludes(shell, 'function runVerifiedTool(tool)', 'Verified tools must run through a shared no-key preview flow.');
requireIncludes(shell, "payload={\n        tool:'manual-source'", 'Verified source must send manual-source no-key payload.');
requireIncludes(shell, 'source_text:sourceText', 'Verified source must pass pasted source text to the gateway.');
requireIncludes(shell, 'previewNoKeyTool(payload)', 'Verified tools must call no-key preview before the swarm.');
requireIncludes(shell, 'function fetchGatewayFanout(prompt,mode,signal,options={})', 'Boost/Ask all must use the gateway fanout adapter.');
requireIncludes(shell, 'payload.system_context=systemContext', 'Tool context must be injected into the gateway swarm payload.');
requireIncludes(shell, "payload.system_context_source='p0-no-key-tool-preview'", 'Tool context source must be explicit.');
requireIncludes(shell, "if(mode==='boost'||mode==='all'||mode==='council')", 'Boost/Ask all/Council must tell the gateway which swarm mode to run.');
requireIncludes(shell, 'payload.swarm_mode=mode', 'Boost/Ask all/Council must send swarm_mode so the gateway can choose smart preselection or full fanout.');
requireIncludes(shell, "payload.mmir_mode='council'", 'Council mode must explicitly request the gateway debate/council path.');
requireIncludes(shell, 'data-p0-route-action="boost-answer-live"', 'Composer route status must expose a direct Ask AI action when multiple routes are ready.');
requireIncludes(shell, 'data-p0-route-action="supergeni-council-live"', 'Composer must expose a direct model-debate action when multiple routes are ready.');
requireIncludes(shell, 'data-p0-route-action="connect-local"', 'Composer route status must keep local setup reachable when only one route is active.');
requireIncludes(shell, 'data-p0-route-action="model-health"', 'Composer route status must keep model health reachable when a local route is attached.');
requireIncludes(shell, "captureInteraction('tool_used',{tool:'route-ask-ai-cta'", 'Composer Ask AI action must be captured for UX telemetry.');
requireIncludes(shell, "captureInteraction('tool_used',{tool:'route-council-cta'", 'Composer Debate action must be captured for UX telemetry.');
requireIncludes(shell, "captureInteraction('tool_used',{tool:'route-connect-local-cta'", 'Single-route local setup CTA must be captured for UX telemetry.');
requireIncludes(shell, "captureInteraction('tool_used',{tool:'route-model-health-cta'", 'Single-route model health CTA must be captured for UX telemetry.');
requireIncludes(css, '.p0-route-cta', 'Composer Ask AI action must use a compact route CTA style.');
requireIncludes(css, '.p0-superboost', 'Visible Superboost action must have a dedicated compact composer style.');
requireIncludes(css, '.p0-council', 'Visible Debate action must have a dedicated compact composer style.');
requireIncludes(css, '.p0-token-counter', 'Token counter must have a dedicated discreet green style.');
requireIncludes(css, 'pointer-events: auto;', 'Composer Ask AI CTA must be clickable while the rest of route status stays unobtrusive.');
requireIncludes(shell, 'function modelInventorySummary(payload,models=[])', 'P0 runtime must turn /v1/models into a visible intelligence map.');
requireIncludes(shell, "const previewPath=mode==='boost'?SUPERBOOST_PREVIEW_PATH:SWARM_PREVIEW_PATH", 'Boost must use the dedicated Superboost endpoint while Ask all/Council keep swarm preview.');
requireIncludes(shell, 'normalizeSwarmPreviewResponse(await fetchJson(API_URL+previewPath', 'Boost/Ask all/Council must try a live preview route before legacy compare.');
requireIncludes(shell, 'function swarmReceiptLabel(data)', 'Swarm status must stay in subtle route receipts.');
requireIncludes(shell, "queuedRouteCount?String(queuedRouteCount)+' queued'", 'Swarm/compare receipts must surface queued intelligence without noisy errors.');
requireIncludes(shell, "visibleRouteCount?String(visibleRouteCount)+' visible total'", 'Swarm/compare receipts must surface total visible intelligence.');
requireIncludes(shell, 'function gatewayCompareAllAnswer(data)', 'Ask all active must render each active route answer, not only the winning synthesis.');
requireIncludes(shell, 'function gatewayWinnerReason(data,best)', 'Swarm scorecards must expose a compact winner reason from route evidence.');
requireIncludes(shell, "winnerReason?'Why: '+winnerReason", 'Swarm scorecards must include why the winning route won in green receipt/status proof.');
requireIncludes(shell, 'function startGatewaySwarmProgress(assistant,{title,mode,routeCount})', 'Deep Boost/Council runs must show live progress while routes answer.');
requireIncludes(shell, 'function gatewaySwarmProgressStage(mode,elapsedMs)', 'Swarm progress must advance through visible phases while routes answer.');
requireIncludes(shell, "'Now: '+stage.line", 'Swarm progress must show the current work phase in user-readable terms.');
requireIncludes(shell, 'function localAllActiveRoutes(prompt,signal)', 'Ask all active must include paired browser-local models when available.');
requireIncludes(compareGatewayRoutes, "'Intelligence Boost'", 'Superboost must use demo-friendly Intelligence Boost status text.');
requireIncludes(compareGatewayRoutes, 'system_context_injected:Boolean(systemContext)', 'Swarm telemetry must record injected verified context.');
requireIncludes(shell, "Memory saved · browser only · no API call", 'Remember command must not call provider routes.');
requireIncludes(shell, "Document note · browser only · no API call", 'Document notes must be browser-only.');
requireIncludes(shell, "Storage: browser only. No cloud storage, no provider call, no owner cost.", 'Local memory recall must state storage/cost truth.');
requireIncludes(html, 'p0-chat-shell.js?v=20260625-compact-models-v2', 'mmir.html must cache-bust the P0 runtime after swarm WOW changes.');
requireIncludes(manifest, '"p0-chat-shell.js": "20260625-compact-models-v2"', 'Asset manifest must track the swarm WOW runtime version.');

if (failures.length) {
  console.error('P0 WOW demo memory/boost smoke failed:');
  failures.forEach(failure => console.error('- ' + failure));
  process.exit(1);
}

console.log('P0 WOW demo memory/boost smoke passed.');
