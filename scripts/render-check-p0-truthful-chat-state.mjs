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
  await page.route('https://api.mmir.ai/v1/models', route => route.fulfill({
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
  }));
  await page.route('https://api.mmir.ai/v1/chat/completions', async route => {
    if (chatMode === 'slow-success') {
      await new Promise(resolve => setTimeout(resolve, 1200));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          object: 'chat.completion',
          model: 'mmir-supergenius',
          choices: [{ message: { role: 'assistant', content: 'Et ferdig svar.' }, finish_reason: 'stop' }],
          mmir: { no_paid_routes_started: true }
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

    await page.locator('#p0-input').fill('Test ventetilstanden');
    await page.locator('#p0-send').click();
    await page.waitForFunction(() => /tenker\s+…/i.test(document.getElementById('p0-transcript')?.innerText || ''));
    let state = await visibleState(page);
    assert(/Supergeni tenker\s+…/i.test(state.transcript), 'pending answer should use truthful Norwegian copy');
    assert(state.state === 'loading', 'pending status should expose loading state');
    assert(!/rgb\(0, 0, 0\)/.test(`${state.bodyBackground} ${state.appBackground}`), 'pending state must keep the light chat background');
    assert(state.scrollWidth <= state.clientWidth + 1, 'pending state must not create mobile overflow');
    await screenshot(page, 'mobile-pending');
    await page.waitForSelector('text=Et ferdig svar.');

    chatMode = 'error';
    await page.locator('#p0-input').fill('Test feiltilstanden');
    await page.locator('#p0-send').click();
    await page.waitForFunction(() => /Supergeni svarer ikke akkurat nå/i.test(document.getElementById('p0-transcript')?.innerText || ''));
    state = await visibleState(page);
    assert(/Supergeni svarer ikke akkurat nå\. Prøv igjen om et øyeblikk\./i.test(state.transcript), '503 should render a safe actionable Norwegian error');
    assert(!/provider_secret|stack_trace|Request failed with 503/i.test(state.body), 'raw provider or transport detail must not render');
    assert(state.state === 'error', 'failed request should expose error state');
    assert(!/rgb\(0, 0, 0\)/.test(`${state.bodyBackground} ${state.appBackground}`), 'error state must keep the light chat background');
    assert(state.scrollWidth <= state.clientWidth + 1, 'error state must not create mobile overflow');
    await screenshot(page, 'mobile-error');

    const relevantLogs = logs.filter(message => !/favicon|Failed to load resource/i.test(message));
    assert(relevantLogs.length === 0, `console/page errors should stay clean, got ${relevantLogs.join(' | ')}`);
    await page.close();
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
