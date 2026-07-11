import { mkdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { chromium } from '@playwright/test';
import { resolveRenderPort } from './render-port-helper.mjs';

const host = '127.0.0.1';
let port = Number(process.env.MMIR_COMPARE_RENDER_PORT || 8798);
let baseUrl = `http://${host}:${port}`;
const screenshotDir = process.env.MMIR_COMPARE_SCREENSHOTS || 'test-results/p0-compare';
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

function chatCompletion(content, model = 'mmir-supergenius') {
  return {
    id: `chatcmpl_${Date.now()}`,
    object: 'chat.completion',
    model,
    choices: [{ index: 0, message: { role: 'assistant', content }, finish_reason: 'stop' }],
    usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
    mmir: {
      no_paid_routes_started: true,
      route: { route_id: model === 'mmir-supergenius' ? 'browser-guide/free' : `local/${model}`, route_class: model === 'mmir-supergenius' ? 'free' : 'local', cost_class: 'free' }
    }
  };
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
    const request = route.request();
    const payload = request.postDataJSON();
    const text = String(payload?.messages?.map(message => message.content).join('\n') || '');
    const content = /Create one concise best answer/i.test(text)
      ? 'Best answer: four. Both routes agree, and Supergeni is the selected winner.'
      : 'Supergeni says four.';
    await fulfillJson(route, chatCompletion(content));
  });

  await page.route('https://api.mmir.ai/routing/score', async route => {
    await fulfillJson(route, {
        object: 'routing.score',
        winner: { model_id: 'mmir-supergenius', route_class: 'free', score: 94, reason: 'complete answer' },
        scores: [
          {
            route_id: 'browser-guide/free',
            route_class: 'free',
            node_id: 'browser-guide',
            model_id: 'mmir-supergenius',
            score: 94,
            latency_ms: 420,
            latency_class: 'fast',
            answer_class: 'complete',
            reasons: ['complete answer', 'hosted default route']
          },
          {
            route_id: 'local/gemma3:270m',
            route_class: 'local',
            node_id: 'local-node',
            model_id: 'gemma3:270m',
            score: 72,
            latency_ms: 860,
            latency_class: 'responsive',
            answer_class: 'complete',
            reasons: ['complete answer', 'private local route']
          }
        ],
        no_paid_routes_started: true
    });
  });

  await page.route('http://127.0.0.1:3000/pair', async route => {
    await fulfillJson(route, { ok: true, token: 'qa-local-token' });
  });
  await page.route('http://127.0.0.1:3000/status', async route => {
    await fulfillJson(route, {
        ok: true,
        status: 'online',
        readiness: { paired: true, models_available: true, model_count: 1, runtime_chat_ready: true, chat_ready: true, model_metadata_visible: true },
        model_summary: { object: 'list', data: [{ id: 'gemma3:270m' }] },
        route_telemetry: {
          object: 'mmir.local.route_telemetry.list',
          data: [{
            model_id: 'gemma3:270m',
            status: 'available',
            ranking_signals: { score: 82, latency_status: 'fast', avg_latency_ms: 860 }
          }]
        }
    });
  });
  await page.route('http://127.0.0.1:3000/hardware', async route => {
    await fulfillJson(route, { cpu_count: 8, memory_gb: 16, memory_tier: 'small-model', recommended_model: 'gemma3:270m' });
  });
  await page.route('http://127.0.0.1:3000/v1/models', async route => {
    await fulfillJson(route, { object: 'list', data: [{ id: 'gemma3:270m' }] });
  });
  await page.route('http://127.0.0.1:3000/v1/chat/completions', async route => {
    await fulfillJson(route, chatCompletion('Local Gemma also says four.', 'gemma3:270m'));
  });
}

async function menuText(page) {
  return page.locator('#p0-add-menu').innerText();
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
  await page.goto(`${baseUrl}/mmir.html?b0_06_26_compare=${viewport.name}#mimir-chat-runtime`, { waitUntil: 'networkidle' });
  await page.waitForSelector('#mmir-p0-app');
  await page.waitForSelector('#p0-input');
  const qaHistoryMode = await page.evaluate(() => window.__MimirP0HistorySessionMode === true);
  assert(qaHistoryMode, `${viewport.name}: compare QA must use session-scoped history`);

  await page.locator('#p0-add').click();
  await page.waitForSelector('#p0-add-menu:not([hidden])');
  let addMenu = await menuText(page);
	  assert(addMenu.includes('Koble til lokal AI'), `${viewport.name}: add menu should keep Koble til lokal AI`);
	  assert(addMenu.includes('Oppdater AI'), `${viewport.name}: add menu should keep Oppdater AI`);
  assert(!/Compare answers|Best answer benchmark|Supergeni Council/i.test(addMenu), `${viewport.name}: add menu must not show two-model tools before local discovery`);

  await page.locator('[data-p0-action="check-local"]').click();
  await page.waitForFunction(() => {
    const route = document.getElementById('p0-route');
    const status = document.getElementById('p0-status');
    return /Verifisert/i.test(route?.textContent || '') &&
      /privat/i.test(route?.textContent || '') &&
      /Private local ready:/i.test(route?.getAttribute('aria-label') || '') &&
      !/Private local ready:|\d+\s+models?|Private/i.test(status?.textContent || '');
  });

  await page.locator('#p0-add').click();
  await page.waitForSelector('#p0-add-menu:not([hidden])');
  addMenu = await menuText(page);
  assert(/Two models/i.test(addMenu), `${viewport.name}: add menu must group gated two-model tools after local discovery`);
  assert(/Compare answers/i.test(addMenu), `${viewport.name}: add menu must expose Compare answers after local discovery`);
  assert(/Best answer benchmark/i.test(addMenu), `${viewport.name}: add menu must expose Best answer benchmark after local discovery`);
  assert(/Supergeni Council/i.test(addMenu), `${viewport.name}: add menu must expose Supergeni Council after local discovery`);
  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForSelector('#p0-add-menu[hidden]', { timeout: 2000 }).catch(() => {});

  await page.locator('#p0-input').fill('Give me the best answer: what is 2+2?');
  if ((await page.locator('#p0-add-menu:not([hidden])').count()) === 0) {
    await page.locator('#p0-add').click();
  }
  await page.waitForSelector('#p0-add-menu:not([hidden])');
  await page.locator('[data-p0-action="best-answer-live"]').click();
  await page.waitForSelector('text=Best answer: four.');

  const text = await page.locator('#p0-transcript').innerText();
  assert(text.includes('Supergeni says four.'), `${viewport.name}: hosted compare answer should render`);
  assert(text.includes('Local Gemma also says four.'), `${viewport.name}: local compare answer should render`);
  assert(text.includes('Best answer'), `${viewport.name}: best-answer content should render`);
  assert(text.includes('Verifisert'), `${viewport.name}: compare receipts should show trust value first`);
  assert(text.includes('Detaljer'), `${viewport.name}: compare receipts should keep raw telemetry inspectable`);
  assert(!text.includes('Winner: Supergeni'), `${viewport.name}: winner receipt must stay behind Details`);
  assert(!text.includes('No paid route'), `${viewport.name}: no-paid proof must stay behind Details`);
  assert(!text.includes('target 3.0s met'), `${viewport.name}: hosted compare latency target must stay behind Details`);
  assert(!text.includes('target 9.0s met'), `${viewport.name}: local compare latency target must stay behind Details`);
  assert(!text.includes('target 3.5s met'), `${viewport.name}: synthesis latency target must stay behind Details`);

  const layout = await page.evaluate(() => ({
    docScrollWidth: document.documentElement.scrollWidth,
    bodyScrollWidth: document.body.scrollWidth,
    actionButtons: Array.from(document.querySelectorAll('#p0-add-menu [data-p0-action]')).map(button => button.textContent),
    compareMessages: document.querySelectorAll('.p0-message-compare').length,
    status: document.getElementById('p0-status')?.textContent || '',
    route: document.getElementById('p0-route')?.textContent || '',
    routeFull: document.getElementById('p0-route')?.getAttribute('aria-label') || ''
  }));
  assert(layout.docScrollWidth <= viewport.width + 1, `${viewport.name}: compare flow must not create horizontal overflow`);
  assert(layout.bodyScrollWidth <= viewport.width + 1, `${viewport.name}: compare flow body must not overflow`);
  assert(layout.compareMessages >= 3, `${viewport.name}: compare flow should render hosted, local and synthesis messages`);
  assert(/finished/i.test(layout.status), `${viewport.name}: compare status should finish cleanly`);
  assert(!/Winner:/i.test(layout.route), `${viewport.name}: composer route line should stay subtle and not show winner clutter`);
  assert(/Verifisert/i.test(layout.route), `${viewport.name}: composer route line should show verified value`);
  assert(/Winner:/i.test(layout.routeFull), `${viewport.name}: composer route receipt must preserve winner summary for inspection`);
  if (/Winner:\s*Supergeni/i.test(layout.routeFull)) {
    assert(/beskyttet/i.test(layout.route), `${viewport.name}: composer hosted synthesis route should show protected value`);
    assert(!/Verifisert\s*·\s*privat/i.test(layout.route), `${viewport.name}: composer hosted synthesis route must not claim private mode`);
  } else {
    assert(/privat/i.test(layout.route), `${viewport.name}: composer local synthesis route should show private value when local wins`);
  }

  await mkdir(screenshotDir, { recursive: true });
  await page.screenshot({ path: `${screenshotDir}/${viewport.name}.png`, fullPage: false });

  const relevantLogs = logs.filter(message => !/favicon|Failed to load resource/i.test(message));
  assert(relevantLogs.length === 0, `${viewport.name}: console/page errors should stay clean, got ${relevantLogs.join(' | ')}`);
  await page.close();
}

port = await resolveRenderPort({
  envName: 'MMIR_COMPARE_RENDER_PORT',
  attemptsEnvName: 'MMIR_COMPARE_RENDER_PORT_ATTEMPTS',
  defaultPort: 8798,
  host,
  label: 'compare render check'
});
baseUrl = `http://${host}:${port}`;
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
  console.error('P0 compare/best-answer render check failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`P0 compare/best-answer render check passed. Screenshots: ${screenshotDir}`);
