import { mkdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { chromium } from '@playwright/test';
import { resolveRenderPort } from './render-port-helper.mjs';

const host = '127.0.0.1';
let port = Number(process.env.MMIR_TRUTHFUL_STATE_PORT || 8812);
let baseUrl = `http://${host}:${port}`;
const screenshotDir = process.env.MMIR_TRUTHFUL_STATE_SCREENSHOTS || 'test-results/p0-truthful-chat-state';
const failures = [];
let chatMode = 'slow-success';
let modelsMode = 'ready';

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
      if ((await fetch(url)).ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 150));
  }
  throw new Error(`Server did not become ready at ${url}`);
}

async function installFixtures(page) {
  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.route('https://api.mmir.ai/v1/models', route => route.fulfill(
    modelsMode === 'ready'
      ? {
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            object: 'list',
            data: [{
              id: 'mmir-supergenius',
              name: 'Supergeni',
              display_name: 'Supergeni',
              executable: true,
              recommended: true,
              availability: 'available',
              route_state: 'managed_provider_available',
              cost_class: 'free'
            }]
          })
        }
      : modelsMode === 'candidate-only'
        ? {
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              object: 'list',
              data: [{
                id: 'future-writer',
                name: 'Future writer',
                display_name: 'Future writer',
                candidate: true,
                executable: false,
                selectable: false,
                visible_to_public_ui: true,
                availability: 'candidate_ready',
                route_state: 'candidate_internal_probe_ready',
                route_type: 'external_candidate'
              }]
            })
          }
      : {
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({ error: { message: 'models unavailable' } })
        }
  ));
  await page.route('https://api.mmir.ai/v1/chat/completions', async route => {
    if (chatMode === 'slow-success' || chatMode === 'invalid-writer-success') {
      if (chatMode === 'slow-success') await new Promise(resolve => setTimeout(resolve, 1200));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          object: 'chat.completion',
          model: 'mmir-supergenius',
          choices: [{
            message: {
              role: 'assistant',
              content: chatMode === 'invalid-writer-success'
                ? 'Et svar med ugyldig svarforfatter.'
                : 'Et ferdig svar.'
            },
            finish_reason: 'stop'
          }],
          mmir: chatMode === 'invalid-writer-success'
            ? {
                no_paid_routes_started: true,
                answer_writer: {
                  object: 'mmir.answer_writer',
                  type: 'llm',
                  provider: 'mistral',
                  model_id: 'mmir-supergenius',
                  model_display_name: 'Supergeni'
                }
              }
            : { no_paid_routes_started: true }
        })
      });
      return;
    }
    await route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({
        error: { message: 'provider_secret_internal_stack_trace_should_never_render' }
      })
    });
  });
}

async function visibleState(page) {
  return page.evaluate(() => ({
    body: document.body.innerText,
    status: document.getElementById('p0-status')?.textContent || '',
    transcript: document.getElementById('p0-transcript')?.innerText || '',
    state: document.getElementById('p0-status')?.dataset.state || '',
    bodyBackground: getComputedStyle(document.body).backgroundColor,
    appBackground: getComputedStyle(document.getElementById('mmir-p0-app')).backgroundColor,
    transcriptColor: getComputedStyle(document.getElementById('p0-transcript')).color,
    scrollWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
    clientWidth: document.documentElement.clientWidth
  }));
}

async function screenshot(page, name) {
  await mkdir(screenshotDir, { recursive: true });
  await page.screenshot({ path: `${screenshotDir}/${name}.png`, fullPage: false });
}

port = await resolveRenderPort({
  envName: 'MMIR_TRUTHFUL_STATE_PORT',
  attemptsEnvName: 'MMIR_TRUTHFUL_STATE_PORT_ATTEMPTS',
  defaultPort: 8812,
  host,
  label: 'truthful chat state render check'
});
baseUrl = `http://${host}:${port}`;
const server = startServer();

try {
  await waitForServer(`${baseUrl}/mmir.html`);
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 1,
      isMobile: true
    });
    const logs = [];
    page.on('console', message => {
      if (['warning', 'error'].includes(message.type())) logs.push(`${message.type()}: ${message.text()}`);
    });
    page.on('pageerror', error => logs.push(`pageerror: ${error.message}`));
    await installFixtures(page);
    await page.goto(`${baseUrl}/mmir.html?truthful_chat_state=mobile#mimir-chat-runtime`, { waitUntil: 'networkidle' });
    await page.waitForSelector('#p0-input');
    await page.waitForSelector('.p0-first-session[data-answer-state="live"]');
    let firstSessionText = await page.locator('.p0-first-session').innerText();
    assert(/Supergeni, en kunstig intelligens/i.test(firstSessionText), 'first session must disclose that Supergeni is AI');
    assert(/ikke av en demosimulering/i.test(firstSessionText), 'first session must distinguish live generation from demo/sample content');

    await page.locator('#p0-input').fill('Test ventetilstanden');
    await page.locator('#p0-send').click();
    await page.waitForFunction(() => /tenker\s+…/i.test(document.getElementById('p0-transcript')?.innerText || ''));
    let state = await visibleState(page);
    assert(/Supergeni tenker\s+…/i.test(state.transcript), 'pending answer should use truthful Norwegian copy');
    assert(state.state === 'loading', 'pending status should expose loading state');
    const pendingReceiptText = await page.locator('.p0-message-assistant').last().locator('.p0-message-receipt').innerText();
    assert(/Pågår/i.test(pendingReceiptText), 'pending answer receipt must expose an in-progress state');
    assert(!/\bLive\b/i.test(pendingReceiptText), 'pending answer must never be labelled Live');
    assert(!/KI-svar · kan ta feil/i.test(pendingReceiptText), 'pending progress copy must not be labelled as a generated answer');
    assert(!/rgb\(0, 0, 0\)/.test(`${state.bodyBackground} ${state.appBackground}`), 'pending state must keep the light chat background');
    assert(state.scrollWidth <= state.clientWidth + 1, 'pending state must not create mobile overflow');
    await screenshot(page, 'mobile-pending');
    await page.waitForSelector('text=Et ferdig svar.');
    let completedReceiptText = await page.locator('.p0-message-assistant').last().locator('.p0-message-receipt').innerText();
    assert(/\bLive\b/i.test(completedReceiptText), 'successful hosted completion with missing writer identity must still be labelled Live');
    assert(/KI-svar · kan ta feil/i.test(completedReceiptText), 'successful hosted completion with missing writer identity must retain the AI warning');

    chatMode = 'invalid-writer-success';
    await page.locator('#p0-input').fill('Test ugyldig svarforfatter');
    await page.locator('#p0-send').click();
    await page.waitForSelector('text=Et svar med ugyldig svarforfatter.');
    completedReceiptText = await page.locator('.p0-message-assistant').last().locator('.p0-message-receipt').innerText();
    assert(/\bLive\b/i.test(completedReceiptText), 'successful hosted completion with invalid writer identity must still be labelled Live');
    assert(/KI-svar · kan ta feil/i.test(completedReceiptText), 'successful hosted completion with invalid writer identity must retain the AI warning');

    chatMode = 'error';
    await page.locator('#p0-input').fill('Test feiltilstanden');
    await page.locator('#p0-send').click();
    await page.waitForFunction(() => /Supergeni svarer ikke akkurat nå/i.test(document.getElementById('p0-transcript')?.innerText || ''));
    state = await visibleState(page);
    assert(/Supergeni svarer ikke akkurat nå\. Prøv igjen om et øyeblikk\./i.test(state.transcript), '503 should render a safe actionable Norwegian error');
    assert(!/provider_secret|stack_trace|Request failed with 503/i.test(state.body), 'raw provider or transport detail must not render');
    assert(state.state === 'error', 'failed request should expose error state');
    assert(/Degradert/i.test(await page.locator('.p0-message-assistant').last().locator('.p0-message-receipt').innerText()), 'failed request receipt must expose degraded state');
    assert(!/rgb\(0, 0, 0\)/.test(`${state.bodyBackground} ${state.appBackground}`), 'error state must keep the light chat background');
    assert(state.scrollWidth <= state.clientWidth + 1, 'error state must not create mobile overflow');
    await screenshot(page, 'mobile-error');

    modelsMode = 'error';
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('.p0-first-session[data-answer-state="degraded"]');
    const degradedText = await page.locator('.p0-first-session').innerText();
    assert(/Degradert/i.test(degradedText), 'unconfirmed model inventory must expose a degraded first-session state');
    assert(/viser ikke et simulert svar som om det var live/i.test(degradedText), 'degraded first session must not disguise sample content as live');
    await screenshot(page, 'mobile-first-session-degraded');

    modelsMode = 'candidate-only';
    await page.goto(`${baseUrl}/mmir.html?truthful_chat_state=candidate-only#mimir-chat-runtime`, { waitUntil: 'networkidle' });
    await page.waitForSelector('.p0-first-session[data-answer-state="degraded"]');
    const candidateOnly = await page.locator('.p0-first-session').innerText();
    assert(/Degradert/i.test(candidateOnly), 'candidate-only model inventory must remain degraded');
    assert(!/Live KI-svar/i.test(candidateOnly), 'candidate-only, executable:false, selectable:false inventory must never render Live');
    assert((await page.locator('.p0-first-session').getAttribute('data-answer-state')) === 'degraded', 'candidate-only inventory must expose degraded machine state');
    await screenshot(page, 'mobile-first-session-candidate-only');

    const relevantLogs = logs.filter(message => !/favicon|Failed to load resource/i.test(message));
    assert(relevantLogs.length === 0, `console/page errors should stay clean, got ${relevantLogs.join(' | ')}`);
    await page.close();

    modelsMode = 'ready';
    const matrixPage = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });
    await installFixtures(matrixPage);
    await matrixPage.addInitScript(({ schema, messages }) => {
      localStorage.clear();
      sessionStorage.clear();
      const scope = 'mmir_qa_session-answer-truth-matrix';
      sessionStorage.setItem(`mmir-p0-chat-history-qa-session-schema:${scope}`, schema);
      sessionStorage.setItem(`mmir-p0-chat-history-qa-session-v1:${scope}`, JSON.stringify(messages));
    }, {
      schema: '20260603-clean-first-chat-v40',
      messages: [
        { id: 'truth-live', role: 'assistant', content: 'Normal live answer', label: 'Live Writer', receipt: 'Hosted route', answerState: 'live', aiGenerated: true, routeProvenance: 'hosted-chat', hostedLineage: true },
        { id: 'truth-compare', role: 'assistant', content: 'Compare answer', label: 'Compare Writer', receipt: 'Compare answer 1/2', answerState: 'live', aiGenerated: true, variant: 'compare', routeProvenance: 'hosted-compare', hostedLineage: true },
        { id: 'truth-boost', role: 'assistant', content: 'Boost answer', label: 'Boost Writer', receipt: 'Intelligence Boost', answerState: 'live', aiGenerated: true, variant: 'compare', routeProvenance: 'hosted-compare', hostedLineage: true },
        { id: 'truth-council', role: 'assistant', content: 'Council answer', label: 'Council Writer', receipt: 'Supergeni Council', answerState: 'live', aiGenerated: true, variant: 'compare', routeProvenance: 'hosted-compare', hostedLineage: true },
        { id: 'truth-synthesis', role: 'assistant', content: 'Synthesis answer', label: 'Synthesis Writer', receipt: 'Best answer synthesis', answerState: 'live', aiGenerated: true, variant: 'compare', routeProvenance: 'hosted-synthesis', hostedLineage: true },
        { id: 'truth-demo', role: 'assistant', content: 'Demo answer', label: 'Demo Writer', receipt: 'Demonstrasjon', answerState: 'demo', aiGenerated: true, variant: 'demo', routeProvenance: 'demo' },
        { id: 'truth-local', role: 'assistant', content: 'Local answer', label: 'Local Writer', receipt: 'Lokal modell', answerState: 'local', aiGenerated: true, routeProvenance: 'local-model' },
        { id: 'truth-degraded', role: 'assistant', content: 'Fallback answer', label: 'Fallback Writer', receipt: 'Hosted fallback', answerState: 'degraded', aiGenerated: true, routeProvenance: 'hosted-fallback' },
        { id: 'truth-synthesis-fallback-failed', role: 'assistant', content: 'Existing generated answer reused after synthesis failed', label: 'Fallback Writer', receipt: 'Best answer synthesis · failed', answerState: 'degraded', aiGenerated: true, variant: 'compare', routeProvenance: 'synthesis-fallback' },
        { id: 'truth-pending-compare', role: 'assistant', content: 'Best Answer is still working.', label: 'Pending Writer', receipt: 'Best Answer · live progress', answerState: 'pending', aiGenerated: false, variant: 'compare', routeProvenance: 'ui-local' },
        { id: 'truth-rehydrated', role: 'assistant', content: 'Rehydrated answer', label: 'History Writer', receipt: 'Hosted route', answerWriter: { type: 'llm', model_display_name: 'History Writer' }, routeProvenance: 'hosted-chat', hostedLineage: true }
      ]
    });
    await matrixPage.goto(`${baseUrl}/mmir.html?mmir_qa_session=answer-truth-matrix#mimir-chat-runtime`, { waitUntil: 'networkidle' });
    await matrixPage.waitForSelector('[data-p0-message-id="truth-rehydrated"]');
    const expectedStates = new Map([
      ['truth-live', 'Live'],
      ['truth-compare', 'Live'],
      ['truth-boost', 'Live'],
      ['truth-council', 'Live'],
      ['truth-synthesis', 'Live'],
      ['truth-demo', 'Demo'],
      ['truth-local', 'Lokalt'],
      ['truth-degraded', 'Degradert'],
      ['truth-synthesis-fallback-failed', 'Degradert'],
      ['truth-rehydrated', 'Live']
    ]);
    for (const [id, expected] of expectedStates) {
      const receipt = matrixPage.locator(`[data-p0-message-id="${id}"] .p0-message-receipt`);
      const text = await receipt.innerText();
      assert(text.includes(expected), `${id} must render truthful ${expected} answer state`);
      assert(/KI-svar · kan ta feil/i.test(text), `${id} must preserve the AI-generated warning after rendering or history rehydration`);
    }
    const pendingCompareReceipt = matrixPage.locator('[data-p0-message-id="truth-pending-compare"] .p0-message-receipt');
    const pendingCompareText = await pendingCompareReceipt.innerText();
    assert(/Pågår/i.test(pendingCompareText), 'rehydrated compare progress must remain in progress');
    assert(!/\bLive\b/i.test(pendingCompareText), 'rehydrated compare progress must never become Live');
    assert(!/KI-svar · kan ta feil/i.test(pendingCompareText), 'rehydrated compare progress must not carry the generated-answer warning');
    await matrixPage.close();
  } finally {
    await browser.close();
  }
} finally {
  server.kill('SIGTERM');
}

if (failures.length) {
  console.error('P0 truthful chat state render check failed:');
  failures.forEach(failure => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`P0 truthful chat state render check passed. Screenshots: ${screenshotDir}`);
