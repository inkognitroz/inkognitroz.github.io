import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = process.cwd();
const shell = readFileSync(join(resolve(root, 'public'), 'apps', 'mimir-chat-portal', 'p0-chat-shell.js'), 'utf8');
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
requireIncludes(renderAddMenu, "menuButton('boost-answer-live','Boost answer'", '+ menu must expose Boost answer without adding a visible toolbar button.');
requireIncludes(renderAddMenu, "menuButton('ask-all-active','Ask all active'", '+ menu must expose Ask all active without adding a visible toolbar button.');
requireIncludes(renderAddMenu, 'p0-intelligence-map', '+ menu must show one subtle green intelligence map line without adding toolbar buttons.');
requireIncludes(renderAddMenu, "menuSection('Local memory')", '+ menu must group local memory under a secondary section.');
requireIncludes(renderAddMenu, "menuButton('local-memory-guide','Memory guide'", '+ menu must explain memory through chat-native commands.');
requireIncludes(renderAddMenu, "menuButton('show-local-memory','Show memory'", '+ menu must let users inspect browser-local memory.');
requireIncludes(renderAddMenu, "menuButton('add-document-note','Add document note'", '+ menu must prepare browser-only document notes.');
requireIncludes(handleMenuAction, "action==='boost-answer-live'", 'Menu actions must handle Boost answer.');
requireIncludes(handleMenuAction, "action==='ask-all-active'", 'Menu actions must handle Ask all active.');
requireIncludes(handleMenuAction, "action==='local-memory-guide'", 'Menu actions must handle local memory guide.');
requireIncludes(handleMenuAction, "action==='show-local-memory'", 'Menu actions must handle local memory display.');
requireIncludes(handleMenuAction, "action==='add-document-note'", 'Menu actions must handle document note template.');
requireIncludes(sendMessage, 'handleLocalKnowledgeCommand(prompt,input)', 'Local memory commands must be handled before provider calls.');
requireIncludes(compareGatewayRoutes, "options.mode==='boost'", 'Gateway compare must have a dedicated Boost answer mode.');
requireIncludes(compareGatewayRoutes, "options.mode==='all'", 'Gateway compare must have a dedicated Ask all active mode.');
requireIncludes(shell, "const SWARM_PREVIEW_PATH=ROUTE_ADAPTER_CONFIG.swarmPreviewPath||'/chat/swarm/preview'", 'P0 runtime must know the swarm preview endpoint.');
requireIncludes(shell, 'function fetchGatewayFanout(prompt,mode,signal)', 'Boost/Ask all must use the gateway fanout adapter.');
requireIncludes(shell, 'function modelInventorySummary(payload,models=[])', 'P0 runtime must turn /v1/models into a visible intelligence map.');
requireIncludes(shell, 'normalizeSwarmPreviewResponse(await fetchJson(API_URL+SWARM_PREVIEW_PATH', 'Boost/Ask all must try swarm preview before legacy compare.');
requireIncludes(shell, 'function swarmReceiptLabel(data)', 'Swarm status must stay in subtle route receipts.');
requireIncludes(shell, "queuedRouteCount?String(queuedRouteCount)+' queued'", 'Swarm/compare receipts must surface queued intelligence without noisy errors.');
requireIncludes(shell, "visibleRouteCount?String(visibleRouteCount)+' visible total'", 'Swarm/compare receipts must surface total visible intelligence.');
requireIncludes(shell, 'function gatewayCompareAllAnswer(data)', 'Ask all active must render each active route answer, not only the winning synthesis.');
requireIncludes(shell, 'function localAllActiveRoutes(prompt,signal)', 'Ask all active must include paired browser-local models when available.');
requireIncludes(compareGatewayRoutes, "'Intelligence Boost'", 'Boost answer must use demo-friendly Intelligence Boost status text.');
requireIncludes(shell, "Memory saved · browser only · no API call", 'Remember command must not call provider routes.');
requireIncludes(shell, "Document note · browser only · no API call", 'Document notes must be browser-only.');
requireIncludes(shell, "Storage: browser only. No cloud storage, no provider call, no owner cost.", 'Local memory recall must state storage/cost truth.');
requireIncludes(html, 'p0-chat-shell.js?v=20260616-live-intelligence-status-v1', 'mmir.html must cache-bust the P0 runtime after swarm WOW changes.');
requireIncludes(manifest, '"p0-chat-shell.js": "20260616-live-intelligence-status-v1"', 'Asset manifest must track the swarm WOW runtime version.');

if (failures.length) {
  console.error('P0 WOW demo memory/boost smoke failed:');
  failures.forEach(failure => console.error('- ' + failure));
  process.exit(1);
}

console.log('P0 WOW demo memory/boost smoke passed.');
