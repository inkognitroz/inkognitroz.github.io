import { existsSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = process.cwd();
const publicDir = resolve(root, 'public');
const files = {
  fixture: join(publicDir, 'correction-remediation-autopilot-timeline-receipts-browser-fixture.json'),
  report: join(publicDir, 'correction-remediation-autopilot-timeline-receipts-browser-qa-report.json'),
  progressData: join(publicDir, 'progress-dashboard.json'),
  module: join(publicDir, 'apps', 'mimir-chat-portal', 'context-correction-sync.js'),
  memoryCss: join(publicDir, 'apps', 'mimir-chat-portal', 'memory.css'),
  progressDashboard: join(publicDir, 'apps', 'mimir-chat-portal', 'progress-dashboard.js'),
  qualityWorkflow: join(root, '.github', 'workflows', 'quality.yml'),
  pagesWorkflow: join(root, '.github', 'workflows', 'pages.yml'),
  backlog: join(root, 'docs', 'MMIR_SEQUENTIAL_DELIVERY_BACKLOG.md'),
  implementationLog: join(root, 'docs', 'MMIR_IMPLEMENTATION_LOG.md')
};

const failures = [];

function fail(message) {
  failures.push(message);
  console.error(message);
}

function requireTrue(condition, message) {
  if (!condition) fail(message);
}

function raw(file) {
  if (!existsSync(file)) {
    fail(`Missing D251 file: ${relative(root, file)}`);
    return '';
  }
  return readFileSync(file, 'utf8');
}

function compact(file) {
  return raw(file).replace(/\s+/g, ' ');
}

function json(file) {
  try {
    return JSON.parse(raw(file));
  } catch (error) {
    fail(`Invalid JSON in ${relative(root, file)}: ${error.message}`);
    return {};
  }
}

function requireIncludes(file, needle, message) {
  if (!compact(file).includes(String(needle).replace(/\s+/g, ' '))) fail(message);
}

const fixture = json(files.fixture);
const report = json(files.report);
requireTrue(fixture.title === 'Autopilot Timeline Receipt Browser Fixture', 'D251 fixture must name receipt browser fixture.');
requireTrue(report.title === 'Autopilot Timeline Receipt Browser QA', 'D251 report must name receipt browser QA.');
requireTrue(report.task === 'D251', 'D251 report must be tied to task D251.');
requireTrue(report.fixture === './correction-remediation-autopilot-timeline-receipts-browser-fixture.json', 'D251 report must point to receipt browser fixture.');
requireTrue(fixture.privacy?.raw_prompt_stored === false, 'D251 fixture must not store raw prompts.');
requireTrue(fixture.privacy?.raw_response_stored === false, 'D251 fixture must not store raw responses.');
requireTrue(fixture.privacy?.document_text_stored === false, 'D251 fixture must not store document text.');
requireTrue(fixture.privacy?.provider_secrets_stored === false, 'D251 fixture must not store provider secrets.');
requireTrue(fixture.privacy?.no_paid_routes_started === true, 'D251 fixture must be no-spend.');
requireTrue(fixture.privacy?.public_frontend_authority === false, 'D251 fixture must deny public frontend authority.');
requireTrue(fixture.privacy?.automatic_mutation_allowed === false, 'D251 fixture must deny automatic mutation.');
requireTrue(report.qa_policy?.deterministic_fixture === true, 'D251 report must require deterministic fixtures.');
requireTrue(report.qa_policy?.desktop_mobile_coverage === true, 'D251 report must require desktop/mobile coverage.');
requireTrue(report.qa_policy?.receipt_state_coverage === true, 'D251 report must require receipt state coverage.');
requireTrue(report.qa_policy?.action_selector_coverage === true, 'D251 report must require action selector coverage.');
requireTrue(report.qa_policy?.visual_overlap_guard === true, 'D251 report must guard visual overlap.');
requireTrue(report.qa_policy?.protected_backend_route_required === true, 'D251 report must require protected backend routes.');
requireTrue(report.qa_policy?.public_frontend_authority === false, 'D251 report must deny public frontend authority.');
requireTrue(report.qa_policy?.automatic_mutation_allowed === false, 'D251 report must deny automatic mutation.');
requireTrue(report.qa_policy?.no_paid_routes_started === true, 'D251 report must be no-spend.');

for (const viewport of ['desktop', 'mobile']) {
  const item = (fixture.viewports || []).find((candidate) => candidate.id === viewport);
  const reportItem = (report.viewports || []).find((candidate) => candidate.id === viewport);
  requireTrue(Boolean(item?.width && item?.height), `D251 fixture must include ${viewport} viewport dimensions.`);
  requireTrue(reportItem?.status === 'ready', `D251 report viewport ${viewport} must be ready.`);
}

for (const stateId of ['running-confirm-source', 'ready-confirm-source', 'ready-refresh-readiness', 'ready-apply-rollback', 'error-backend']) {
  const state = (fixture.states || []).find((item) => item.id === stateId);
  const scenario = (report.scenarios || []).find((item) => item.id === stateId);
  requireTrue(Boolean(state?.expected_receipt_state), `D251 fixture state ${stateId} must define expected receipt state.`);
  requireTrue(Boolean(state?.expected_action), `D251 fixture state ${stateId} must define expected action.`);
  requireTrue(Boolean(state?.expected_route), `D251 fixture state ${stateId} must define expected protected route.`);
  requireTrue(Boolean(state?.expected_next_action), `D251 fixture state ${stateId} must define expected next action.`);
  requireTrue(scenario?.status === 'ready', `D251 report scenario ${stateId} must be ready.`);
}

const expectedStates = new Set((fixture.states || []).map((item) => item.expected_receipt_state));
for (const receiptState of ['running', 'ready', 'error']) {
  requireTrue(expectedStates.has(receiptState), `D251 fixture must cover ${receiptState} receipt state.`);
}

const expectedActions = new Set((fixture.states || []).map((item) => item.expected_action));
for (const action of ['confirm-source', 'refresh-readiness', 'apply-rollback']) {
  requireTrue(expectedActions.has(action), `D251 fixture must cover ${action} action.`);
}

const selectors = fixture.selectors || {};
for (const selectorKey of ['receipt_panel', 'receipt_ready', 'receipt_running', 'receipt_error', 'confirm_source', 'refresh_readiness', 'apply_rollback']) {
  requireTrue(Boolean(selectors[selectorKey]), `D251 fixture must include selector ${selectorKey}.`);
}

for (const needle of [
  'context-correction-trust-receipt',
  "trustReceiptState.status||'idle'",
  "trustReceiptState.result_status||'pending'",
  "trustReceiptState.next_action||'review timeline'",
  "writeTrustReceiptState({status:'running'",
  "writeTrustReceiptState({status:resultStatus==='error'?'error':'ready'"
]) {
  requireIncludes(files.module, needle, `D251 module missing receipt selector/state ${needle}.`);
}

for (const needle of [
  '.context-correction-trust-receipt',
  'min-height: 68px',
  'overflow-wrap: anywhere',
  '[data-state="ready"]',
  '[data-state="running"]',
  '[data-state="error"]'
]) {
  requireIncludes(files.memoryCss, needle, `D251 CSS missing receipt browser QA contract ${needle}.`);
}

for (const needle of [
  'renderCorrectionRemediationAutopilotTimelineReceiptBrowserQaReport',
  'correction_remediation_autopilot_timeline_receipts_browser_fixture',
  'correction_remediation_autopilot_timeline_receipts_browser_qa_report',
  'progress-correction-remediation-autopilot-timeline-receipts-browser-qa'
]) {
  requireIncludes(files.progressDashboard, needle, `D251 Progress Dashboard missing ${needle}.`);
}

requireIncludes(files.qualityWorkflow, 'smoke-check-correction-remediation-autopilot-timeline-receipts-browser-qa.js', 'Quality workflow must run D251 receipt browser QA.');
requireIncludes(files.pagesWorkflow, 'smoke-check-correction-remediation-autopilot-timeline-receipts-browser-qa.js', 'Pages workflow must run D251 receipt browser QA.');
requireIncludes(files.backlog, '| D253 |', 'Backlog must add D253 after D251.');
requireIncludes(files.implementationLog, 'D251 is now beta', 'Implementation log must mark D251 beta.');
requireIncludes(files.implementationLog, 'D254 is now next', 'Implementation log must mark D254 next.');

const progress = json(files.progressData);
requireTrue(progress.correction_remediation_autopilot_timeline_receipts_browser_fixture?.title === fixture.title, 'Progress dashboard data must embed D251 receipt browser fixture.');
requireTrue(progress.correction_remediation_autopilot_timeline_receipts_browser_qa_report?.title === report.title, 'Progress dashboard data must embed D251 receipt browser QA report.');
const tasks = Array.isArray(progress.tasks) ? progress.tasks : [];
const d251 = tasks.find((task) => task.seq === 'D251');
const d252 = tasks.find((task) => task.seq === 'D254');
requireTrue(d251?.status === 'beta', 'Progress dashboard task D251 must be beta after receipt browser QA ships.');
requireTrue(d252?.status === 'next', 'Progress dashboard task D254 must become next after D251 ships.');
requireTrue(Array.isArray(progress.next_queue) && progress.next_queue[0] === 'D254', 'Progress dashboard next queue must prioritize D254 after D251 ships.');

if (failures.length) {
  process.exitCode = 1;
} else {
  console.log('Correction remediation autopilot timeline receipts browser QA smoke check passed.');
}
