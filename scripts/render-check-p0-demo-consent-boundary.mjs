import { spawn } from 'node:child_process';
import { chromium } from '@playwright/test';
import { resolveRenderPort } from './render-port-helper.mjs';

const host = '127.0.0.1';
let port = Number(process.env.MMIR_DEMO_CONSENT_RENDER_PORT || 8810);
let baseUrl = `http://${host}:${port}`;
const failures = [];

const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,POST,OPTIONS',
  'access-control-allow-headers': 'content-type',
  'access-control-allow-private-network': 'true'
};

function fail(message) {
  failures.push(message);
}

function assert(condition, message) {
  if (!condition) fail(message);
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
  let lastError = null;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch (error) {
      lastError = error;
    }
    await new Promise(resolve => setTimeout(resolve, 150));
  }
  throw new Error(`Server did not become ready at ${url}: ${lastError?.message || 'timeout'}`);
}

async function fulfillJson(route, body, status = 200) {
  await route.fulfill({
    status,
    contentType: 'application/json',
    headers: corsHeaders,
    body: JSON.stringify(body)
  });
}

async function installFixtures(page, transcriptCalls) {
  await page.route('https://api.mmir.ai/v1/models', async route => {
    await fulfillJson(route, {
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
    });
  });

  await page.route('https://api.mmir.ai/v1/chat/completions', async route => {
    await fulfillJson(route, {
      id: 'chatcmpl-demo-consent',
      object: 'chat.completion',
      model: 'mmir-supergenius',
      choices: [{
        index: 0,
        message: { role: 'assistant', content: 'Fire.' },
        finish_reason: 'stop'
      }],
      usage: { prompt_tokens: 0, completion_tokens: 1, total_tokens: 1 },
      mmir: {
        no_paid_routes_started: true,
        receipt: {
          route: 'browser-guide/free',
          route_name: 'api.mmir.ai hosted',
          node_id: 'mmir-tool-verify',
          model_id: 'tool-verify/simple-fact'
        }
      }
    });
  });

  await page.route('https://api.mmir.ai/telemetry/events', async route => {
    await fulfillJson(route, { ok: true });
  });

  await page.route('https://api.mmir.ai/telemetry/demo-transcript', async route => {
    const payload = route.request().postDataJSON();
    transcriptCalls.push(payload);
    await fulfillJson(route, {
      accepted: true,
      durable_transcript_persisted: true,
      durable_feedback_store: { reason: 'test_fixture' }
    });
  });
}

async function sendPrompt(page, prompt) {
  await page.locator('#p0-input').fill(prompt);
  await page.locator('#p0-send').click();
  await page.waitForSelector('text=Fire.');
  await page.waitForTimeout(900);
}

port = await resolveRenderPort({
  envName: 'MMIR_DEMO_CONSENT_RENDER_PORT',
  attemptsEnvName: 'MMIR_DEMO_CONSENT_RENDER_PORT_ATTEMPTS',
  defaultPort: 8810,
  host,
  label: 'demo consent render check'
});
baseUrl = `http://${host}:${port}`;
const server = startServer();

try {
  await waitForServer(`${baseUrl}/mmir.html`);
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });
    const transcriptCalls = [];
    page.on('pageerror', error => fail(`pageerror: ${error.message}`));
    await installFixtures(page, transcriptCalls);
    await page.addInitScript(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.goto(`${baseUrl}/mmir.html?mmir_demo=1#mmir-chat-runtime`, { waitUntil: 'networkidle' });
    await page.waitForSelector('#mmir-p0-app');

    await sendPrompt(page, 'Hva er 2+2?');
    assert(transcriptCalls.length === 0, 'Fresh public session must not persist raw demo transcript before explicit consent.');
    const routeText = await page.locator('#p0-route').innerText();
    assert(/Verifisert/i.test(routeText), 'Hosted answer should still show verified status.');
    assert(/beskyttet/i.test(routeText), 'Hosted answer should show protected status, not private.');
    assert(!/Verifisert\s*·\s*privat/i.test(routeText), 'Hosted answer must not claim private status.');

    await page.locator('#p0-add').click();
    await page.waitForSelector('#p0-add-menu:not([hidden])');
    await page.locator('[data-p0-action="privacy-menu"]').click();
    await page.waitForSelector('#p0-privacy-menu:not([hidden])');
    assert(/Demo-læring på/i.test(await page.locator('#p0-privacy-menu').innerText()), 'Explicit demo mode must expose an informed consent control.');
    await page.locator('[data-p0-action="set-demo-transcript-consent:on"]').click();
    await page.waitForFunction(() => window.localStorage.getItem('mmir-p0-demo-transcript-consent-v1') === 'accepted');
    await page.waitForTimeout(900);
    assert(transcriptCalls.length >= 1, 'Explicit Demo-læring På should allow demo transcript persistence.');
    assert(transcriptCalls.some(call => call?.consent === true && call?.capture_consent === 'demo_transcript'), 'Demo transcript call must carry explicit consent metadata.');
    assert(transcriptCalls.some(call => Array.isArray(call?.messages) && call.messages.some(message => /Hva er 2\+2/.test(String(message?.content || '')))), 'Demo transcript call after consent should include bounded conversation messages.');

    await page.close();
  } finally {
    await browser.close();
  }
} finally {
  server.kill('SIGTERM');
}

if (failures.length) {
  console.error('P0 demo consent boundary render check failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('P0 demo consent boundary render check passed.');
