import { mkdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { chromium } from '@playwright/test';
import { resolveRenderPort } from './render-port-helper.mjs';

const host = '127.0.0.1';
let port = Number(process.env.MMIR_TRUTHFUL_STATE_PORT || 8812);
let baseUrl = `http://${host}:${port}`;
const screenshotDir = process.env.MMIR_TRUTHFUL_STATE_SCREENSHOTS || 'test-results/p0-truthful-chat-state';
const failures = [];
const chatRequests = [];
let chatMode = 'slow-success';
let modelsMode = 'ready';

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function calculatorResponse() {
  return {
    object: 'chat.completion', model: 'supergeni', provider: 'mmir-tools',
    provider_called: false, provider_calls_started: 0, upstream_call_count: 0,
    choices: [{ message: { role: 'assistant', content: '19 * 37 = 703' }, finish_reason: 'stop' }],
    mmir: {
      ordinary_chat: true, answer_source: 'deterministic_tool', tool_used: 'calculator',
      provider_called: false, provider_calls_started: 0, no_paid_routes_started: true,
      enhanced: false, live_e2e_verified: false, quality_verified: false,
      tool_execution: {
        expression: '19 * 37', exact: true, result_kind: 'integer',
        numerator_text: '703', denominator_text: '1', result_text: '703'
      }
    }
  };
}

function ordinaryModelResponse() {
  return {
    object: 'chat.completion', model: 'mistral-small-latest',
    choices: [{ message: { role: 'assistant', content: 'Et vanlig modellsvar.' }, finish_reason: 'stop' }],
    mmir: {
      provider_called: true, no_paid_routes_started: true,
      answer_writer: { object: 'mmir.answer_writer', type: 'llm', provider: 'mistral', model_id: 'mistral-small-latest', model_display_name: 'Mistral Small' }
    }
  };
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

async function installFixtures(page, { resetStorage = true, directWriter = false } = {}) {
  if (resetStorage) {
    await page.addInitScript(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  }
  await page.route('https://api.mmir.ai/status', route => route.fulfill(
    modelsMode === 'ready'
      ? {
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ok: true,
            no_paid_routes_started: true,
            live_verified_intelligence_route_count: 1,
            operator_readiness: {
              readiness_state: 'swarm_preview_ready',
              default_writer_readiness: { classification: 'release_ready', authenticated_release_ready: true, blocker_codes: [] },
              journeys: { first_chat_ready: true, compare_ready: true, swarm_preview_ready: true }
            }
          })
        }
      : { status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'release blocked fixture' }) }
  ));
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
              live_e2e_verified: true,
              live_e2e_proof: { verified: true, stable_verified: true, no_paid_routes_started: true },
              cost_class: 'free'
            }, ...(directWriter ? [{
              id: 'mistral-small-latest', model: 'mistral-small-latest', provider: 'mistral',
              name: 'Mistral Small', display_name: 'Mistral Small',
              executable: true, selectable: true, availability: 'available',
              route_state: 'managed_provider_available', route_type: 'managed_provider',
              route_class: 'free', trust_level: 'public-free', cost_class: 'free',
              live_e2e_verified: true,
              live_e2e_proof: { verified: true, stable_verified: true, no_paid_routes_started: true }
            }] : [])]
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
    const request = route.request().postDataJSON() || {};
    chatRequests.push(request);
    if (chatMode === 'calculator-success' || chatMode === 'calculator-conflict') {
      // Model the known server fixture, not another arithmetic parser. A system
      // message, prior context or another input must never fabricate a tool reply.
      const calculatorRequest = ['supergeni', 'mmir-supergenius'].includes(request.model) &&
        request.messages?.length === 1 && request.messages[0].role === 'user' &&
        request.messages[0].content === '19 * 37';
      const body = calculatorRequest ? calculatorResponse() : ordinaryModelResponse();
      if (calculatorRequest && chatMode === 'calculator-conflict') body.provider_called = true;
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
      return;
    }
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

    const calculatorPage = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });
    await installFixtures(calculatorPage, { resetStorage: false });
    chatMode = 'calculator-success';
    await calculatorPage.goto(`${baseUrl}/mmir.html?mmir_qa_session=calculator-attribution#mimir-chat-runtime`, { waitUntil: 'networkidle' });
    await calculatorPage.waitForSelector('#p0-input');
    const benchmarksBefore = await calculatorPage.evaluate(() => localStorage.getItem('mmir-p0-route-benchmarks-v1'));
    await calculatorPage.locator('#p0-input').fill('19 * 37');
    assert(await calculatorPage.locator('#p0-send').isEnabled(), 'calculator attribution must not gate Send');
    await calculatorPage.locator('#p0-send').click();
    await calculatorPage.waitForSelector('.p0-message-assistant .p0-receipt-model:text-is("Kalkulator")');
    const firstCalculatorRequest = chatRequests.at(-1);
    assert(firstCalculatorRequest.model === 'mmir-supergenius' && firstCalculatorRequest.messages?.length === 1 &&
      firstCalculatorRequest.messages[0].role === 'user' && firstCalculatorRequest.messages[0].content === '19 * 37',
    'real first-turn POST must contain exactly the unmodified user expression and no generated system message');
    let calculatorMessage = calculatorPage.locator('.p0-message-assistant').last();
    assert((await calculatorMessage.locator('.p0-message-body').innerText()).trim() === '19 * 37 = 703', 'calculator answer must retain the exact gateway output');
    let calculatorSummary = await calculatorMessage.locator('summary').getAttribute('aria-label');
    assert(calculatorSummary.startsWith('Kalkulator · verktøysvar'), 'calculator receipt must identify a tool result');
    assert(!/\bLive\b|KI-svar|verifisert|signert/i.test(calculatorSummary), 'calculator receipt must not claim live LLM generation or writer verification');
    assert(await calculatorPage.evaluate(() => localStorage.getItem('mmir-p0-route-benchmarks-v1')) === benchmarksBefore, 'calculator latency must not count as a model benchmark');

    const identities = await calculatorPage.evaluate((base) => {
      const identity = (payload) => window.MimirP0RouteAdapters.truthfulWriterIdentity(payload);
      const cases = [
        ['provider-called', payload => { payload.provider_called = true; }],
        ['nested-provider-called', payload => { payload.mmir.provider_called = true; }],
        ['missing-provider-flag', payload => { delete payload.mmir.provider_called; }],
        ['provider-count', payload => { payload.provider_calls_started = 1; }],
        ['upstream-count', payload => { payload.upstream_call_count = 1; }],
        ['provider-identity', payload => { payload.provider = 'mistral'; }],
        ['not-exact', payload => { payload.mmir.tool_execution.exact = false; }],
        ['result-mismatch', payload => { payload.mmir.tool_execution.result_text = '704'; }],
        ['answer-mismatch', payload => { payload.choices[0].message.content = 'Another answer'; }],
        ['writer-conflict', payload => { payload.mmir.answer_writer = { object: 'mmir.answer_writer', type: 'llm', provider: 'mistral', model_id: 'mistral-small-latest', model_display_name: 'Mistral Small' }; }]
      ].map(([name, mutate]) => {
        const payload = structuredClone(base);
        mutate(payload);
        return { name, writer: identity(payload) };
      });
      const sse = { choices: [{ delta: base.choices[0].message }], mmir: base.mmir };
      const decimal = structuredClone(base);
      decimal.choices[0].message.content = '0.1 + 0.2 = 0.3';
      decimal.mmir.tool_execution = { expression: '0.1 + 0.2', exact: true, result_kind: 'terminating_decimal', numerator_text: '3', denominator_text: '10', result_text: '0.3' };
      const fraction = structuredClone(base);
      fraction.choices[0].message.content = '1 / 3 = 1/3';
      fraction.mmir.tool_execution = { expression: '1 / 3', exact: true, result_kind: 'fraction', numerator_text: '1', denominator_text: '3', result_text: '1/3' };
      const ordinary = { mmir: { answer_writer: { object: 'mmir.answer_writer', type: 'llm', provider: 'mistral', model_id: 'mistral-small-latest', model_display_name: 'Mistral Small' } } };
      return { cases, tools: [base, sse, decimal, fraction].map(identity), ordinary: identity(ordinary) };
    }, calculatorResponse());
    for (const writer of identities.tools) {
      assert(writer.type === 'capability' && writer.model_display_name === 'Kalkulator' && writer.identity_verified === false, 'JSON, SSE-shaped, decimal and fraction metadata must identify only the calculator, without LLM verification');
    }
    for (const { name, writer } of identities.cases) {
      assert(writer.type === 'unknown' && writer.identity_verified === false, `${name} must reject conflicting calculator attribution`);
    }
    assert(identities.ordinary.type === 'llm' && identities.ordinary.model_display_name === 'Mistral Small', 'ordinary model identity must remain unchanged');

    await calculatorPage.reload({ waitUntil: 'networkidle' });
    await calculatorPage.waitForSelector('.p0-message-assistant .p0-receipt-model:text-is("Kalkulator")');
    calculatorMessage = calculatorPage.locator('.p0-message-assistant').last();
    calculatorSummary = await calculatorMessage.locator('summary').getAttribute('aria-label');
    assert(calculatorSummary.startsWith('Kalkulator · verktøysvar') && !/KI-svar|\bLive\b/i.test(calculatorSummary), 'history reload must preserve truthful tool attribution');

    chatMode = 'calculator-success';
    await calculatorPage.locator('#p0-input').fill('19 * 37');
    assert(await calculatorPage.locator('#p0-send').isEnabled(), 'Send must remain available after calculator history reload');
    await calculatorPage.locator('#p0-send').click();
    await calculatorPage.waitForSelector('.p0-message-assistant .p0-receipt-model:text-is("Mistral Small")');
    const repeatedRequest = chatRequests.at(-1);
    assert(repeatedRequest.messages?.[0]?.role === 'system' && repeatedRequest.messages.length > 2 &&
      repeatedRequest.messages.some(message => message.role === 'assistant' && message.content === '19 * 37 = 703'),
    'arithmetic after a prior turn must retain the generated system and conversation history');
    const repeatedSummary = await calculatorPage.locator('.p0-message-assistant').last().locator('summary').getAttribute('aria-label');
    assert(!/Kalkulator|verktøysvar/i.test(repeatedSummary) && /KI-svar · kan ta feil/i.test(repeatedSummary), 'contextual arithmetic must use the unchanged model answer labeling');

    chatMode = 'slow-success';
    await calculatorPage.locator('#p0-input').fill('Forklar hvorfor himmelen er blå');
    await calculatorPage.locator('#p0-send').click();
    await calculatorPage.waitForSelector('text=Et ferdig svar.');
    const ordinarySummary = await calculatorPage.locator('.p0-message-assistant').last().locator('summary').getAttribute('aria-label');
    assert(/KI-svar · kan ta feil/i.test(ordinarySummary) && !/Kalkulator|verktøysvar/i.test(ordinarySummary), 'ordinary follow-up answers must keep their existing AI labeling');
    await calculatorPage.close();

    const controls = [
      { name: 'prose', prompt: 'Forklar hvorfor himmelen er blå' },
      { name: 'invalid-shape', prompt: '19 * 37; forklar svaret' },
      { name: 'grounding', prompt: '19 * 37, vis kilder', system: /explicitly asked for the answer basis/ },
      { name: 'role', preferences: { 'mmir-p0-role-profile-v1': 'coach' }, system: /friendly coach presence/ },
      { name: 'style', preferences: { 'mmir-p0-answer-style-v1': 'detailed' }, system: /Give a complete answer/ },
      { name: 'explicit-default-style', preferences: { 'mmir-p0-answer-style-v1': 'short' } },
      { name: 'fact-guard', preferences: { 'mmir-p0-fact-guard-v1': 'off' }, absentSystem: /If current facts are uncertain/ },
      { name: 'direct-model', directWriter: true, system: /language model selected by the user/ },
      { name: 'local-history', history: [
        { role: 'user', content: 'Behold mine tidligere instruksjoner.', routeProvenance: 'local-model', hostedLineage: false },
        { role: 'assistant', content: 'Tidligere lokalt svar.', routeProvenance: 'local-model', hostedLineage: false }
      ] },
      { name: 'server-rejected-arithmetic', prompt: '1 / 0', userOnly: true }
    ];
    for (const control of controls) {
      const controlPage = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });
      await installFixtures(controlPage, { resetStorage: false, directWriter: control.directWriter === true });
      await controlPage.addInitScript(({ preferences, history, name }) => {
        localStorage.clear();
        sessionStorage.clear();
        for (const [key, value] of Object.entries(preferences || {})) localStorage.setItem(key, value);
        if (history) {
          const scope = `mmir_qa_session-calculator-${name}`;
          sessionStorage.setItem(`mmir-p0-chat-history-qa-session-schema:${scope}`, '20260603-clean-first-chat-v40');
          sessionStorage.setItem(`mmir-p0-chat-history-qa-session-v1:${scope}`, JSON.stringify(history));
        }
      }, { preferences: control.preferences, history: control.history, name: control.name });
      chatMode = 'calculator-success';
      await controlPage.goto(`${baseUrl}/mmir.html?mmir_qa_session=calculator-${control.name}#mimir-chat-runtime`, { waitUntil: 'networkidle' });
      await controlPage.waitForSelector('#p0-input');
      if (control.directWriter) {
        await controlPage.locator('#p0-model').click();
        await controlPage.locator('button[data-model-id="mistral-small-latest"]').click();
      }
      const controlPrompt = control.prompt || '19 * 37';
      await controlPage.locator('#p0-input').fill(controlPrompt);
      assert(await controlPage.locator('#p0-send').isEnabled(), `${control.name}: Send must remain available`);
      await controlPage.locator('#p0-send').click();
      await controlPage.waitForSelector('.p0-message-assistant .p0-receipt-model:text-is("Mistral Small")');
      const body = chatRequests.at(-1);
      assert(body.messages?.at(-1)?.content === controlPrompt, `${control.name}: real POST must preserve the complete user text`);
      if (control.userOnly) {
        assert(body.messages.length === 1 && body.messages[0].role === 'user', 'server rejection stays authoritative; the browser must not evaluate arithmetic');
      } else {
        assert(body.messages?.[0]?.role === 'system', `${control.name}: real POST must preserve the generated system instruction`);
        if (control.system) assert(control.system.test(body.messages[0].content), `${control.name}: explicit instructions must remain in the system message`);
        if (control.absentSystem) assert(!control.absentSystem.test(body.messages[0].content), `${control.name}: disabled preference must remain disabled`);
      }
      if (control.directWriter) assert(body.model === 'mistral-small-latest', 'explicit direct-model selection must not be rewritten to Supergeni');
      const summary = await controlPage.locator('.p0-message-assistant').last().locator('summary').getAttribute('aria-label');
      assert(/KI-svar · kan ta feil/i.test(summary) && !/Kalkulator|verktøysvar/i.test(summary), `${control.name}: only an actual calculator result may show tool attribution`);
      await controlPage.close();
    }
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
