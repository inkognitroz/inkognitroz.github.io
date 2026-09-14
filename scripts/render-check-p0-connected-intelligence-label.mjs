import { mkdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { chromium } from '@playwright/test';
import { resolveRenderPort } from './render-port-helper.mjs';

const host = '127.0.0.1';
let port = Number(process.env.MMIR_CONNECTED_LABEL_RENDER_PORT || 8804);
let baseUrl = `http://${host}:${port}`;
const screenshotDir = process.env.MMIR_CONNECTED_LABEL_SCREENSHOTS || 'test-results/p0-connected-intelligence-label';
const failures = [];
const answerText = 'Her er et kort og vennlig forslag til naboen.';
const feed = { title: 'Hentet RSS-feed', url: 'https://example.no/feed', source_kind: 'retrieved_live_feed', retrieval_verified: true };
const cited = [1, 2, 3].map(index => ({ title: `Artikkelreferanse ${index}`, url: `https://example.no/artikkel-${index}`, source_kind: 'model_cited_url', verification_state: 'claimed_not_fetched' }));
const mixed = [feed, ...cited];
const fixtures = [
  { name: 'original-explicit', label: 'Søk · 1 kilde · Mistral Small', sources: [{ title: 'Eksempelkilde', url: 'https://example.no/kilde' }], expected: 'Referanser · 1 oppføring · Mistral Small' },
  { name: 'mixed-explicit', label: 'Søk · 99 kilder · Mistral Small', sources: mixed, expected: 'Referanser · 4 oppføringer · Mistral Small', proof: 'Søk · 4 kilder · Mistral Small', expectedProof: 'Referanser · 4 oppføringer · Mistral Small' },
  { name: 'mixed-fallback', sources: mixed, expected: 'Referanser · 4 oppføringer' },
  { name: 'unknown-title-only', sources: [{ title: 'Oppgitt tittel' }, { title: 'Ukjent opphav', url: 'https://example.no/ukjent' }], expected: 'Referanser · 2 oppføringer' },
  { name: 'cited-only', sources: cited, expected: 'Referanser · 3 oppføringer' },
  { name: 'empty-overrides-stale-label', label: 'Søk · 9 kilder', sources: [], topSources: mixed, expected: '' },
  { name: 'explicit-without-array', label: 'Søk · 3 kilder · Mistral Small', expected: 'Referanser · 3 oppføringer · Mistral Small' },
  { name: 'top-level-sources', topSources: mixed, expected: 'Referanser · 4 oppføringer' },
  { name: 'no-sources', expected: '' },
  { name: 'rask-unchanged', label: 'Rask · Mistral Small', sources: mixed, expected: 'Rask · Mistral Small' },
  { name: 'custom-label-unchanged', label: 'Søk · eget oppsett', expected: 'Søk · eget oppsett' },
  { name: 'verified-proof-unchanged', proof: { status: 'verified', label: 'Verifisert med eksakt verktøy' }, expectedProof: 'Verifisert med eksakt verktøy', proofStatus: 'verified', expected: '' },
  { name: 'signed-proof-unchanged', proof: { status: 'signed', label: 'Signert kvittering · egen etikett' }, expectedProof: 'Signert kvittering · egen etikett', proofStatus: 'signed', expected: '' },
  { name: 'calculator-unchanged', calculator: true, expected: '' },
  { name: 'persisted-legacy', persisted: true, label: 'Søk · 4 kilder · Mistral Small', expected: 'Referanser · 4 oppføringer · Mistral Small', proof: { status: 'unverified', label: 'Søk · 4 kilder · Mistral Small' }, expectedProof: 'Referanser · 4 oppføringer · Mistral Small', proofStatus: 'unverified' }
];

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function startServer() {
  const child = spawn(process.execPath, ['scripts/serve-public.mjs'], {
    cwd: process.cwd(),
    env: { ...process.env, HOST: host, PORT: String(port) },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  child.stdout.on('data', chunk => process.stdout.write(String(chunk)));
  child.stderr.on('data', chunk => process.stderr.write(String(chunk)));
  return child;
}

async function waitForServer(url) {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 150));
  }
  throw new Error(`Server did not become ready at ${url}`);
}

async function installFixtures(page, fixture, requests) {
  // This check must never contact an upstream API, including unknown routes.
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    return url.origin === baseUrl ? route.continue() : route.abort();
  });
  await page.route('https://api.mmir.ai/**', async route => {
    const url = new URL(route.request().url());
    let body;
    if (url.pathname === '/v1/chat/completions' || url.pathname === '/chat/completions') {
      requests.push(route.request().postDataJSON());
      body = {
        id: 'chatcmpl_connected_label',
        object: 'chat.completion',
        model: 'mistral-small-latest',
        model_display_name: 'Mistral Small',
        choices: [{ index: 0, message: { role: 'assistant', content: fixture.calculator ? '19 * 37 = 703' : answerText }, finish_reason: 'stop' }],
        mmir: {
          ...(fixture.label === undefined ? {} : { scaled_intelligence_label: fixture.label }),
          answer_writer: {
            object: 'mmir.answer_writer',
            type: 'llm',
            provider: 'mistral',
            model_id: 'mistral-small-latest',
            model_display_name: 'Mistral Small'
          },
          ...(fixture.sources === undefined ? {} : { sources: fixture.sources }),
          ...(fixture.proof === undefined ? {} : { answer_proof_line: fixture.proof }),
          no_paid_routes_started: true,
          provider_secrets_in_browser: false
        }
      };
      if (fixture.topSources) body.sources = fixture.topSources;
      if (fixture.calculator) {
        body.model = 'supergeni';
        body.provider = 'mmir-tools';
        body.provider_called = false;
        delete body.model_display_name;
        Object.assign(body.mmir, { ordinary_chat: true, answer_source: 'deterministic_tool', tool_used: 'calculator', provider_called: false, provider_calls_started: 0, quality_verified: false, tool_execution: { expression: '19 * 37', exact: true, result_kind: 'integer', numerator_text: '703', denominator_text: '1', result_text: '703' } });
        delete body.mmir.answer_writer;
      }
    } else if (url.pathname === '/v1/models') {
      body = { object: 'list', data: [{ id: 'mmir-supergenius', display_name: 'Supergeni', executable: true, selectable: true, recommended: true, live_e2e_verified: true, live_e2e_proof: { verified: true, stable_verified: true, no_paid_routes_started: true }, cost_class: 'free' }] };
    } else if (url.pathname === '/status') {
      body = {
        ok: true,
        no_paid_routes_started: true,
        live_verified_intelligence_route_count: 1,
        operator_readiness: {
          readiness_state: 'swarm_preview_ready',
          default_writer_readiness: { classification: 'release_ready', authenticated_release_ready: true, blocker_codes: [] },
          journeys: { first_chat_ready: true, compare_ready: true, swarm_preview_ready: true }
        }
      };
    } else {
      return route.abort();
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
}

async function check(browser, viewport, fixture) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1, isMobile: true });
  const requests = [];
  await installFixtures(page, fixture, requests);
  await page.addInitScript(({ fixture, answerText }) => {
    localStorage.clear();
    sessionStorage.clear();
    if (fixture.persisted) {
      sessionStorage.setItem('mmir-p0-chat-history-qa-session-schema:mmir_qa_session-connected-label', '20260603-clean-first-chat-v40');
      sessionStorage.setItem('mmir-p0-chat-history-qa-session-v1:mmir_qa_session-connected-label', JSON.stringify([{ role: 'assistant', content: answerText, label: 'Mistral Small', intelligenceLabel: fixture.label, proofLine: fixture.proof, receipt: 'Hosted route · Ubekreftet', answerState: 'live', aiGenerated: true, hostedLineage: true }]));
    }
  }, { fixture, answerText });
  await page.goto(`${baseUrl}/mmir.html?mmir_qa_session=connected-label`, { waitUntil: 'networkidle' });
  const prompt = fixture.calculator ? '19 * 37' : 'Skriv en kort e-post til naboen.';
  if (!fixture.persisted) {
    await page.locator('#p0-input').fill(prompt);
    await page.locator('#p0-send').click();
  }
  const expectedAnswer = fixture.calculator ? '19 * 37 = 703' : answerText;
  await page.waitForFunction(text => {
    const bodies = document.querySelectorAll('.p0-message-assistant .p0-message-body');
    return bodies[bodies.length - 1]?.innerText.trim() === text;
  }, expectedAnswer, { timeout: 5000 }).catch(error => { throw new Error(`${fixture.name}: completed fixture answer not rendered: ${error.message}`); });
  const answer = page.locator('.p0-message-assistant').last();
  const receipt = answer.locator(':scope > .p0-message-receipt');
  const summary = receipt.locator('summary');
  await summary.waitFor();

  const label = receipt.locator('.p0-connected-intelligence-label');
  assert(await label.count() === Number(Boolean(fixture.expected)), `${fixture.name}: expected label presence`);
  assert(!(await label.isVisible()), 'The connected-intelligence label should stay inside closed receipt details by default.');
  assert(!/Søk ·|Referanser ·/.test(await summary.innerText()), `${fixture.name}: quiet summary must not contain reference counts`);
  assert((await receipt.locator('.p0-receipt-model').innerText()).includes(fixture.calculator ? 'Kalkulator' : 'Mistral Small'), `${fixture.name}: actual answer-writer must remain visible`);
  assert(await answer.locator(':scope > .p0-message-label').count() === 0, 'The answer must not render a separate model-label row before content.');
  const deferredBefore = await page.locator('script[src*="/chat-runtime.js"]').count();
  await summary.click();
  if (fixture.expected) {
    assert(await label.isVisible(), `${fixture.name}: reference label should expand`);
    assert(await label.innerText() === fixture.expected, `${fixture.name}: expected ${fixture.expected}, got ${await label.innerText()}`);
    assert(!(await label.innerText()).includes('⚡'), 'The answer mode must not use a decorative lightning badge.');
  }
  if (fixture.expectedProof) {
    const proof = receipt.locator('.p0-proof-line');
    assert(await proof.locator('.p0-proof-text').innerText() === fixture.expectedProof, `${fixture.name}: proof display wording`);
    assert(await proof.getAttribute('aria-label') === 'Bevislinje: ' + fixture.expectedProof, `${fixture.name}: proof aria wording`);
    assert((await proof.getAttribute('class')).includes('p0-proof-status-' + (fixture.proofStatus || 'stated')), `${fixture.name}: proof status must remain unchanged`);
  }
  assert(await page.locator('script[src*="/chat-runtime.js"]').count() === deferredBefore, 'Opening an answer receipt must not load deferred panel runtimes.');
  assert(!(await page.locator('#p0-transcript').innerText()).includes('Spør 3 AI - beste vinner'), 'Internal swarm marketing copy must not enter the answer surface.');
  assert(await page.locator('.p0-message-user .p0-connected-intelligence-label').count() === 0, 'User messages must not render a connected-intelligence label.');
  assert(await answer.locator('.p0-message-body').innerText() === expectedAnswer, `${fixture.name}: answer content unchanged`);
  assert(requests.length === (fixture.persisted ? 0 : 1), `${fixture.name}: exactly the expected mocked POST count`);
  if (requests.length) assert(requests[0].messages.at(-1).content === prompt, `${fixture.name}: submitted user message unchanged`);
  const stored = await page.evaluate(() => JSON.parse(sessionStorage.getItem(window.__MimirP0HistorySessionKey) || '[]').at(-1));
  if (fixture.persisted) assert(stored.intelligenceLabel === fixture.label, 'Rendering must not mutate a persisted legacy label');
  if (fixture.proof) assert(stored.proofLine.label === (typeof fixture.proof === 'string' ? fixture.proof : fixture.proof.label), `${fixture.name}: original proof label is not rewritten in history`);
  if (fixture.calculator) assert((await summary.innerText()).includes('verktøysvar'), 'Calculator must remain a tool answer');

  if (fixture.name === 'mixed-explicit') {
    await mkdir(screenshotDir, { recursive: true });
    await page.screenshot({ path: `${screenshotDir}/mixed-explicit-expanded.png`, fullPage: false });
  }

  await summary.click();
  assert(!(await label.isVisible()), 'Closing receipt details must restore the single quiet default line.');

  const layout = await page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    bodyWidth: document.body.scrollWidth
  }));
  assert(layout.documentWidth <= viewport.width + 1, 'Connected-intelligence label must not cause document overflow.');
  assert(layout.bodyWidth <= viewport.width + 1, 'Connected-intelligence label must not cause body overflow.');

  await mkdir(screenshotDir, { recursive: true });
  await page.screenshot({ path: `${screenshotDir}/${fixture.name}.png`, fullPage: false });
  await page.close();
  console.log(`Checked reference fixture: ${fixture.name}`);
}

port = await resolveRenderPort({
  envName: 'MMIR_CONNECTED_LABEL_RENDER_PORT',
  attemptsEnvName: 'MMIR_CONNECTED_LABEL_RENDER_PORT_ATTEMPTS',
  defaultPort: 8804,
  host,
  label: 'connected-intelligence label render check'
});
baseUrl = `http://${host}:${port}`;
const server = startServer();
try {
  await waitForServer(`${baseUrl}/mmir.html`);
  const browser = await chromium.launch();
  try {
    for (const fixture of fixtures) await check(browser, { width: 390, height: 844 }, fixture);
  } finally {
    await browser.close();
  }
} finally {
  server.kill('SIGTERM');
}

if (failures.length) {
  console.error('P0 connected-intelligence label render check failed:');
  failures.forEach(failure => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`P0 connected-intelligence label render check passed: ${fixtures.length} fixtures. Screenshots: ${screenshotDir}`);
