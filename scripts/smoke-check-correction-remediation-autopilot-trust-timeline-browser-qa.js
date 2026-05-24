import { existsSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = process.cwd();
const publicDir = resolve(root, 'public');
const files = {
  fixture: join(publicDir, 'correction-remediation-autopilot-trust-timeline-browser-fixture.json'),
  report: join(publicDir, 'correction-remediation-autopilot-trust-timeline-browser-qa-report.json'),
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
    fail(`Missing D249 file: ${relative(root, file)}`);
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
requireTrue(fixture.title === 'Autopilot Trust Timeline Browser Fixture', 'D249 fixture must name browser fixture.');
requireTrue(report.title === 'Autopilot Trust Timeline Browser QA', 'D249 report must name browser QA.');
requireTrue(report.task === 'D249', 'D249 report must be tied to task D249.');
requireTrue(report.fixture === './correction-remediation-autopilot-trust-timeline-browser-fixture.json', 'D249 report must point to the fixture.');
requireTrue(fixture.privacy?.raw_prompt_stored === false, 'D249 fixture must not store raw prompts.');
requireTrue(fixture.privacy?.raw_response_stored === false, 'D249 fixture must not store raw responses.');
requireTrue(fixture.privacy?.document_text_stored === false, 'D249 fixture must not store document text.');
requireTrue(fixture.privacy?.provider_secrets_stored === false, 'D249 fixture must not store provider secrets.');
requireTrue(fixture.privacy?.no_paid_routes_started === true, 'D249 fixture must be no-spend.');
requireTrue(report.qa_policy?.deterministic_fixture === true, 'D249 report must require deterministic fixtures.');
requireTrue(report.qa_policy?.desktop_mobile_coverage === true, 'D249 report must require desktop/mobile coverage.');
requireTrue(report.qa_policy?.click_handlers_required === true, 'D249 report must require click handlers.');
requireTrue(report.qa_policy?.disabled_until_ready_required === true, 'D249 report must require disabled-until-ready behavior.');
requireTrue(report.qa_policy?.visual_overlap_guard === true, 'D249 report must guard visual overlap.');
requireTrue(report.qa_policy?.public_frontend_authority === false, 'D249 report must deny public frontend authority.');
requireTrue(report.qa_policy?.automatic_mutation_allowed === false, 'D249 report must deny automatic mutation.');
requireTrue(report.qa_policy?.no_paid_routes_started === true, 'D249 report must be no-spend.');

for (const viewport of ['desktop', 'mobile']) {
  const item = (fixture.viewports || []).find((candidate) => candidate.id === viewport);
  const reportItem = (report.viewports || []).find((candidate) => candidate.id === viewport);
  requireTrue(Boolean(item?.width && item?.height), `D249 fixture must include ${viewport} viewport dimensions.`);
  requireTrue(reportItem?.status === 'ready', `D249 report viewport ${viewport} must be ready.`);
}

for (const stateId of ['idle', 'confirm-ready', 'source-confirmed', 'undo-ready']) {
  const state = (fixture.states || []).find((item) => item.id === stateId);
  const scenario = (report.scenarios || []).find((item) => item.id === stateId);
  requireTrue(Boolean(state?.expected_panel_state), `D249 fixture state ${stateId} must define expected panel state.`);
  requireTrue(Array.isArray(state?.expected_enabled_actions), `D249 fixture state ${stateId} must define enabled actions.`);
  requireTrue(scenario?.status === 'ready', `D249 report scenario ${stateId} must be ready.`);
}

const selectors = fixture.selectors || {};
for (const selectorKey of ['panel', 'steps', 'confirm_source', 'refresh_readiness', 'apply_rollback']) {
  requireTrue(Boolean(selectors[selectorKey]), `D249 fixture must include selector ${selectorKey}.`);
}

for (const needle of [
  'context-correction-trust-timeline',
  'data-correction-trust-timeline="confirm-source"',
  'data-correction-trust-timeline="refresh-readiness"',
  'data-correction-trust-timeline="apply-rollback"'
]) {
  requireIncludes(files.module, needle, `D249 module missing timeline selector ${needle}.`);
}

for (const needle of [
  '.context-correction-trust-timeline',
  '.context-correction-trust-steps',
  'minmax(126px, 1fr)',
  'min-height: 78px'
]) {
  requireIncludes(files.memoryCss, needle, `D249 CSS missing visual QA contract ${needle}.`);
}

for (const needle of [
  'renderCorrectionRemediationAutopilotTrustTimelineBrowserQaReport',
  'correction_remediation_autopilot_trust_timeline_browser_fixture',
  'correction_remediation_autopilot_trust_timeline_browser_qa_report',
  'progress-correction-remediation-autopilot-trust-timeline-browser-qa'
]) {
  requireIncludes(files.progressDashboard, needle, `D249 Progress Dashboard missing ${needle}.`);
}

requireIncludes(files.qualityWorkflow, 'smoke-check-correction-remediation-autopilot-trust-timeline-browser-qa.js', 'Quality workflow must run D249 browser QA.');
requireIncludes(files.pagesWorkflow, 'smoke-check-correction-remediation-autopilot-trust-timeline-browser-qa.js', 'Pages workflow must run D249 browser QA.');
requireIncludes(files.backlog, '| D253 |', 'Backlog must add D253 after D249.');
requireIncludes(files.implementationLog, 'D249 is now beta', 'Implementation log must mark D249 beta.');
requireIncludes(files.implementationLog, 'D254 is now next', 'Implementation log must mark D254 next.');

const progress = json(files.progressData);
requireTrue(progress.correction_remediation_autopilot_trust_timeline_browser_fixture?.title === fixture.title, 'Progress dashboard data must embed D249 browser fixture.');
requireTrue(progress.correction_remediation_autopilot_trust_timeline_browser_qa_report?.title === report.title, 'Progress dashboard data must embed D249 browser QA report.');
const tasks = Array.isArray(progress.tasks) ? progress.tasks : [];
const d249 = tasks.find((task) => task.seq === 'D249');
const d250 = tasks.find((task) => task.seq === 'D254');
requireTrue(d249?.status === 'beta', 'Progress dashboard task D249 must be beta after browser QA ships.');
requireTrue(d250?.status === 'next', 'Progress dashboard task D254 must become next after D249 ships.');
requireTrue(Array.isArray(progress.next_queue) && progress.next_queue[0] === 'D254', 'Progress dashboard next queue must prioritize D254 after D249 ships.');

if (failures.length) {
  process.exitCode = 1;
} else {
  console.log('Correction remediation autopilot trust timeline browser QA smoke check passed.');
}
