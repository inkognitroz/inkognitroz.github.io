import { mkdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { chromium } from '@playwright/test';
import { resolveRenderPort } from './render-port-helper.mjs';

const host = '127.0.0.1';
let port = Number(process.env.MMIR_CONNECTED_LABEL_RENDER_PORT || 8804);
let baseUrl = `http://${host}:${port}`;
const screenshotDir = process.env.MMIR_CONNECTED_LABEL_SCREENSHOTS || 'test-results/p0-connected-intelligence-label';
const failures = [];

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

async function installFixtures(page) {
  await page.route('https://api.mmir.ai/**', async route => {
    const url = new URL(route.request().url());
    let body;
    if (url.pathname === '/v1/chat/completions' || url.pathname === '/chat/completions') {
      body = {
        id: 'chatcmpl_connected_label',
        object: 'chat.completion',
        model: 'mistral-small-latest',
        model_display_name: 'Mistral Small',
        choices: [{ index: 0, message: { role: 'assistant', content: 'Her er et kort og vennlig forslag til naboen.' }, finish_reason: 'stop' }],
        mmir: {
          scaled_intelligence_label: 'Søk · 1 kilde · Mistral Small',
          answer_writer: {
            object: 'mmir.answer_writer',
            type: 'llm',
            provider: 'mistral',
            model_id: 'mistral-small-latest',
            model_display_name: 'Mistral Small'
          },
          sources: [{ title: 'Eksempelkilde', url: 'https://example.no/kilde' }],
          no_paid_routes_started: true,
          provider_secrets_in_browser: false
        }
      };
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
      body = { ok: true, no_paid_routes_started: true };
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
}

async function check(browser, viewport) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1, isMobile: true });
  await installFixtures(page);
  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.goto(`${baseUrl}/mmir.html?mmir_qa_session=connected-label`, { waitUntil: 'networkidle' });
  await page.locator('#p0-input').fill('Skriv en kort e-post til naboen.');
  await page.locator('#p0-send').click();
  const answer = page.locator('.p0-message-assistant').last();
  const receipt = answer.locator(':scope > .p0-message-receipt');
  const summary = receipt.locator('summary');
  await summary.waitFor();

  const label = receipt.locator('.p0-connected-intelligence-label');
  assert(await label.count() === 1, 'Exactly one connected-intelligence label should render for the assistant answer.');
  assert(!(await label.isVisible()), 'The connected-intelligence label should stay inside closed receipt details by default.');
  assert(!(await summary.innerText()).includes('Søk · 1 kilde'), 'The quiet receipt line must not repeat answer-mode detail.');
  assert((await receipt.locator('.p0-receipt-model').innerText()).includes('Mistral Small'), 'The actual answer-writer model must stay visible in the receipt line.');
  assert(await answer.locator(':scope > .p0-message-label').count() === 0, 'The answer must not render a separate model-label row before content.');
  const deferredBefore = await page.locator('script[src*="/chat-runtime.js"]').count();
  await summary.click();
  await label.waitFor({ state: 'visible' });
  assert((await label.innerText()).includes('Søk · 1 kilde · Mistral Small'), 'The API-provided answer mode should remain visible and intact.');
  assert(!(await label.innerText()).includes('⚡'), 'The answer mode must not use a decorative lightning badge.');
  assert(await page.locator('script[src*="/chat-runtime.js"]').count() === deferredBefore, 'Opening an answer receipt must not load deferred panel runtimes.');
  assert(!(await page.locator('#p0-transcript').innerText()).includes('Spør 3 AI - beste vinner'), 'Internal swarm marketing copy must not enter the answer surface.');
  assert(await page.locator('.p0-message-user .p0-connected-intelligence-label').count() === 0, 'User messages must not render a connected-intelligence label.');
  assert((await page.locator('#p0-transcript').innerText()).includes('Her er et kort og vennlig forslag'), 'The answer should remain visible beside the label.');

  await summary.click();
  assert(!(await label.isVisible()), 'Closing receipt details must restore the single quiet default line.');

  const layout = await page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    bodyWidth: document.body.scrollWidth
  }));
  assert(layout.documentWidth <= viewport.width + 1, 'Connected-intelligence label must not cause document overflow.');
  assert(layout.bodyWidth <= viewport.width + 1, 'Connected-intelligence label must not cause body overflow.');

  await mkdir(screenshotDir, { recursive: true });
  await page.screenshot({ path: `${screenshotDir}/mobile.png`, fullPage: false });
  await page.close();
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
    await check(browser, { width: 390, height: 844 });
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

console.log(`P0 connected-intelligence label render check passed. Screenshot: ${screenshotDir}/mobile.png`);
