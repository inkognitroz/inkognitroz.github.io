import { mkdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { chromium } from '@playwright/test';

const port = Number(process.env.MMIR_GATEWAY_COMPARE_RENDER_PORT || 8796);
const host = '127.0.0.1';
const baseUrl = `http://${host}:${port}`;
const screenshotDir = process.env.MMIR_GATEWAY_COMPARE_SCREENSHOTS || 'test-results/p0-gateway-compare';
const failures = [];
const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,POST,OPTIONS',
  'access-control-allow-headers': 'content-type,x-mmir-local-token',
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

async function installFixtures(page) {
  await page.route('https://api.mmir.ai/v1/models', async route => {
    await fulfillJson(route, {
      object: 'list',
      data: [
        {
          id: 'supergeni',
          name: 'Supergeni',
          display_name: 'Supergeni',
          provider: 'mmir',
          executable: true,
          selectable: true,
          recommended: true,
          availability: 'available',
          route_state: 'managed_provider_available',
          route_type: 'managed_provider',
          route_class: 'free',
          trust_level: 'public-free',
          cost_class: 'free'
        },
        {
          id: 'poolside/laguna-xs.2:free',
          name: 'OpenRouter Laguna XS',
          display_name: 'Laguna XS',
          provider: 'openrouter',
          executable: true,
          selectable: true,
          availability: 'available',
          route_state: 'managed_provider_available',
          route_type: 'external_untrusted_free',
          route_class: 'external-untrusted-free',
          trust_level: 'external-untrusted-free',
          cost_class: 'free'
        },
        {
          id: 'gemini-2.5-flash',
          name: 'Google Gemini 2.5 Flash',
          display_name: 'Gemini 2.5 Flash',
          provider: 'google',
          executable: true,
          selectable: true,
          availability: 'available',
          route_state: 'managed_provider_available',
          route_type: 'external_untrusted_free',
          route_class: 'external-untrusted-free',
          trust_level: 'external-untrusted-free',
          cost_class: 'free'
        }
      ]
    });
  });

  await page.route('https://api.mmir.ai/prompts/presets', async route => {
    await fulfillJson(route, { object: 'list', data: [] });
  });

  await page.route('https://api.mmir.ai/chat/compare', async route => {
    await fulfillJson(route, {
      object: 'chat.compare',
      compare_status: 'ready',
      candidate_count: 3,
      active_public_provider_route_count: 2,
      best_answer: {
        model_id: 'supergeni',
        model_display_name: 'Supergeni',
        content: '4',
        score: 96,
        receipt: {
          provider: 'mmir',
          model_id: 'supergeni',
          route_id: 'browser-guide/free',
          latency_ms: 420,
          no_paid_routes_started: true
        }
      },
      route_attempts: [
        {
          status: 'succeeded',
          provider: 'mmir',
          model_id: 'supergeni',
          model_display_name: 'Supergeni',
          score: 96,
          latency_ms: 420,
          answer_class: 'complete',
          latency_class: 'fast',
          receipt: { provider: 'mmir', model_id: 'supergeni', route_id: 'browser-guide/free', latency_ms: 420 }
        },
        {
          status: 'succeeded',
          provider: 'openrouter',
          model_id: 'poolside/laguna-xs.2:free',
          model_display_name: 'Laguna XS',
          score: 83,
          latency_ms: 1370,
          answer_class: 'complete',
          latency_class: 'responsive',
          receipt: { provider: 'openrouter', model_id: 'poolside/laguna-xs.2:free', route_id: 'external/openrouter/poolside/laguna-xs.2:free', latency_ms: 1370 }
        },
        {
          status: 'succeeded',
          provider: 'google',
          model_id: 'gemini-2.5-flash',
          model_display_name: 'Gemini 2.5 Flash',
          score: 88,
          latency_ms: 620,
          answer_class: 'complete',
          latency_class: 'fast',
          receipt: { provider: 'google', model_id: 'gemini-2.5-flash', route_id: 'external/google/gemini-2.5-flash', latency_ms: 620 }
        }
      ],
      blocked: [],
      no_paid_routes_started: true
    });
  });
}

async function checkViewport(browser, viewport) {
  const page = await browser.newPage({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1,
    isMobile: viewport.width <= 430
  });
  const logs = [];
  page.on('console', message => {
    if (['warning', 'error'].includes(message.type())) logs.push(`${message.type()}: ${message.text()}`);
  });
  page.on('pageerror', error => logs.push(`pageerror: ${error.message}`));
  await installFixtures(page);
  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.goto(`${baseUrl}/mmir.html?gateway_compare_pool=${viewport.name}#mimir-chat-runtime`, { waitUntil: 'networkidle' });
  await page.waitForSelector('#mmir-p0-app');
  await page.waitForFunction(() => /active intelligences connected|Score 100/i.test(document.getElementById('p0-route')?.textContent || ''));

  await page.locator('#p0-add').click();
  await page.waitForSelector('#p0-add-menu:not([hidden])');
  const addMenu = await page.locator('#p0-add-menu').innerText();
  assert(/Intelligence pool/i.test(addMenu), `${viewport.name}: add menu should expose compact Intelligence pool when hosted routes are active`);
  assert(/Ask 3 active routes through MMIR/i.test(addMenu), `${viewport.name}: add menu should explain active route count subtly`);
  assert(/Best answer benchmark/i.test(addMenu), `${viewport.name}: add menu should expose Best Answer without adding toolbar clutter`);

  await page.locator('#p0-input').fill('What is 2 + 2? Reply with one number.');
  await page.locator('[data-p0-action="best-answer-live"]').click();
  await page.waitForFunction(() => {
    const text = document.getElementById('p0-transcript')?.innerText || '';
    return /\b4\b/.test(text) && /Winner: Supergeni/i.test(text);
  });

  const text = await page.locator('#p0-transcript').innerText();
  assert(text.includes('4'), `${viewport.name}: gateway compare should render the best answer`);
  assert(text.includes('Best answer'), `${viewport.name}: gateway compare receipt should render`);
  assert(text.includes('3 routes'), `${viewport.name}: gateway compare receipt should show route count`);
  assert(text.includes('Winner: Supergeni'), `${viewport.name}: gateway compare receipt should name the winner`);
  assert(text.includes('OpenRouter'), `${viewport.name}: gateway compare receipt should include OpenRouter evidence`);
  assert(text.includes('Google'), `${viewport.name}: gateway compare receipt should include Google evidence`);
  assert(text.includes('No paid route'), `${viewport.name}: gateway compare receipt should preserve no-paid proof`);

  const layout = await page.evaluate(() => ({
    docScrollWidth: document.documentElement.scrollWidth,
    bodyScrollWidth: document.body.scrollWidth,
    status: document.getElementById('p0-status')?.textContent || '',
    route: document.getElementById('p0-route')?.textContent || '',
    routeFull: document.getElementById('p0-route')?.getAttribute('aria-label') || '',
    toolbarButtons: document.querySelectorAll('.p0-toolbar button').length
  }));
  assert(layout.docScrollWidth <= viewport.width + 1, `${viewport.name}: gateway compare must not create horizontal overflow`);
  assert(layout.bodyScrollWidth <= viewport.width + 1, `${viewport.name}: gateway compare body must not overflow`);
  assert(/ready/i.test(layout.status), `${viewport.name}: gateway compare should finish cleanly`);
  assert(!/Winner:/i.test(layout.route), `${viewport.name}: visible green route line should stay subtle`);
  assert(/Winner:/i.test(layout.routeFull), `${viewport.name}: full receipt should preserve winner detail for inspection`);
  assert(layout.toolbarButtons <= 6, `${viewport.name}: gateway compare must not add extra visible toolbar buttons`);

  await mkdir(screenshotDir, { recursive: true });
  await page.screenshot({ path: `${screenshotDir}/${viewport.name}.png`, fullPage: false });

  const relevantLogs = logs.filter(message => !/favicon|Failed to load resource/i.test(message));
  assert(relevantLogs.length === 0, `${viewport.name}: console/page errors should stay clean, got ${relevantLogs.join(' | ')}`);
  await page.close();
}

const server = startServer();
try {
  await waitForServer(`${baseUrl}/mmir.html`);
  const browser = await chromium.launch();
  try {
    for (const viewport of [
      { name: 'desktop', width: 1440, height: 900 },
      { name: 'mobile', width: 390, height: 844 }
    ]) {
      await checkViewport(browser, viewport);
    }
  } finally {
    await browser.close();
  }
} finally {
  server.kill('SIGTERM');
}

if (failures.length) {
  console.error('P0 gateway compare pool render check failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`P0 gateway compare pool render check passed. Screenshots: ${screenshotDir}`);
