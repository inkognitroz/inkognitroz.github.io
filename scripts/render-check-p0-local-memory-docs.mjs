import { mkdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { chromium } from '@playwright/test';

const port = Number(process.env.MMIR_LOCAL_MEMORY_RENDER_PORT || 8803);
const host = '127.0.0.1';
const baseUrl = `http://${host}:${port}`;
const screenshotDir = process.env.MMIR_LOCAL_MEMORY_SCREENSHOTS || 'test-results/p0-local-memory';
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
        }
      ]
    });
  });
  await page.route('https://api.mmir.ai/prompts/presets', async route => {
    await fulfillJson(route, { object: 'list', data: [] });
  });
}

async function send(page, prompt) {
  await page.locator('#p0-input').fill(prompt);
  await page.locator('#p0-send').click();
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
  await page.goto(`${baseUrl}/mmir.html?local_memory_docs=${viewport.name}#mimir-chat-runtime`, { waitUntil: 'networkidle' });
  await page.waitForSelector('#mmir-p0-app');

  await page.locator('#p0-add').click();
  await page.waitForSelector('#p0-add-menu:not([hidden])');
  const menu = await page.locator('#p0-add-menu').innerText();
  assert(/Local memory/i.test(menu), `${viewport.name}: + menu should expose local memory section`);
  assert(/Memory guide/i.test(menu), `${viewport.name}: + menu should expose memory guide`);
  assert(/Add document note/i.test(menu), `${viewport.name}: + menu should expose document note template`);
  await page.locator('#p0-add').click();

  await send(page, '/remember demo friends want token boost without owner cloud cost');
  await page.waitForFunction(() => /Saved locally in this browser/i.test(document.getElementById('p0-transcript')?.innerText || ''));
  await send(page, '/doc Demo plan: show Boost answer, local memory and no paid route proof');
  await page.waitForFunction(() => /Document note saved locally/i.test(document.getElementById('p0-transcript')?.innerText || ''));
  await send(page, '/memory');
  await page.waitForFunction(() => /Local memory in this browser/i.test(document.getElementById('p0-transcript')?.innerText || ''));

  const text = await page.locator('#p0-transcript').innerText();
  assert(/token boost without owner cloud cost/i.test(text), `${viewport.name}: memory recall should include saved memory`);
  assert(/Demo plan: show Boost answer/i.test(text), `${viewport.name}: memory recall should include document notes`);
  assert(/Storage: browser only/i.test(text), `${viewport.name}: memory recall should state browser-only storage`);
  assert(/No cloud storage, no provider call, no owner cost/i.test(text), `${viewport.name}: memory recall should state cost/privacy truth`);

  const layout = await page.evaluate(() => ({
    docScrollWidth: document.documentElement.scrollWidth,
    bodyScrollWidth: document.body.scrollWidth,
    status: document.getElementById('p0-status')?.textContent || '',
    route: document.getElementById('p0-route')?.textContent || '',
    toolbarButtons: document.querySelectorAll('.p0-toolbar button').length
  }));
  assert(layout.docScrollWidth <= viewport.width + 1, `${viewport.name}: local memory must not create horizontal overflow`);
  assert(layout.bodyScrollWidth <= viewport.width + 1, `${viewport.name}: local memory body must not overflow`);
  assert(/Local memory shown/i.test(layout.status), `${viewport.name}: local memory should finish cleanly`);
  assert(/browser only/i.test(layout.route), `${viewport.name}: route line should preserve browser-only proof`);
  assert(layout.toolbarButtons <= 7, `${viewport.name}: local memory must not add extra visible toolbar buttons beyond Superboost/Debate`);

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
  console.error('P0 local memory/docs render check failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`P0 local memory/docs render check passed. Screenshots: ${screenshotDir}`);
