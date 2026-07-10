import { mkdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { createServer as createNetServer } from 'node:net';
import { chromium } from '@playwright/test';

const host = '127.0.0.1';
const preferredPort = Number(process.env.MMIR_TOOLBAR_RENDER_PORT || 8799);
let port = preferredPort;
let baseUrl = `http://${host}:${port}`;
const screenshotDir = process.env.MMIR_TOOLBAR_SCREENSHOTS || 'test-results/p0-toolbar';
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

function canListen(candidatePort) {
  return new Promise((resolve, reject) => {
    const probe = createNetServer();
    probe.once('error', error => {
      if (error?.code === 'EADDRINUSE') {
        resolve(false);
        return;
      }
      reject(error);
    });
    probe.listen(candidatePort, host, () => {
      probe.close(() => resolve(true));
    });
  });
}

async function resolveToolbarRenderPort() {
  const maxAttempts = Number(process.env.MMIR_TOOLBAR_RENDER_PORT_ATTEMPTS || 50);
  for (let offset = 0; offset < maxAttempts; offset += 1) {
    const candidate = preferredPort + offset;
    if (await canListen(candidate)) return candidate;
  }
  throw new Error(`No available toolbar render QA port found from ${preferredPort} across ${maxAttempts} attempts`);
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

async function checkViewport(browser, viewport) {
  const page = await browser.newPage({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1,
    isMobile: viewport.width <= 430
  });
  const logs = [];
  let fastPayloadSeen = false;
  page.on('console', message => {
    if (['warning', 'error'].includes(message.type())) logs.push(`${message.type()}: ${message.text()}`);
  });
  page.on('pageerror', error => logs.push(`pageerror: ${error.message}`));
  await page.route('https://api.mmir.ai/v1/models', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: corsHeaders,
      body: JSON.stringify({
        object: 'list',
        data: [{
          id: 'mmir-supergenius',
          display_name: 'Supergeni',
          executable: true,
          recommended: true,
          availability: 'available',
          route_state: 'managed_provider_available',
          cost_class: 'free'
        }]
      })
    });
  });
  await page.route('https://api.mmir.ai/v1/chat/completions', async route => {
    const payload = route.request().postDataJSON();
    const content = String(payload?.messages?.find(message => message.role === 'user')?.content || '');
    if (/Answer fast/i.test(content) && /What is MMIR/i.test(content)) fastPayloadSeen = true;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: corsHeaders,
      body: JSON.stringify({
        id: 'chatcmpl_toolbar_fast',
        object: 'chat.completion',
        model: 'mmir-supergenius',
        choices: [{
          index: 0,
          message: { role: 'assistant', content: 'MMIR connects AI models and nodes in one chat.' },
          finish_reason: 'stop'
        }],
        usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
        mmir: { no_paid_routes_started: true }
      })
    });
  });
  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.goto(`${baseUrl}/mmir.html?p0_custom_toolbar=${viewport.name}#mimir-chat-runtime`, { waitUntil: 'networkidle' });
  await page.waitForSelector('#mmir-p0-app');
  await page.waitForSelector('#p0-input');

  assert(await page.locator('[data-p0-toolbar-tool]').count() === 0, `${viewport.name}: optional toolbar tools must be hidden by default`);
  assert(await page.locator('#p0-add').count() === 1, `${viewport.name}: + button must exist`);
  assert(await page.locator('#p0-privacy').count() === 1, `${viewport.name}: privacy shield must exist`);
  assert(await page.locator('#p0-model').count() === 1, `${viewport.name}: model picker must exist`);
  assert(await page.locator('#p0-mic').count() === 1, `${viewport.name}: mic button must exist`);
  assert(await page.locator('#p0-send').count() === 1, `${viewport.name}: send button must exist`);

  await page.locator('#p0-add').click();
  await page.waitForSelector('#p0-add-menu:not([hidden])');
  const menuText = await page.locator('#p0-add-menu').innerText();
  assert(menuText.includes('Add to toolbar'), `${viewport.name}: + menu must expose Add to toolbar`);
  assert(menuText.includes('Add Fast answer'), `${viewport.name}: + menu must expose Fast answer pin`);
  assert(menuText.includes('Add Fresh start'), `${viewport.name}: + menu must expose Fresh start pin`);
  assert(menuText.includes('Add Memory'), `${viewport.name}: + menu must expose Memory pin`);
  assert(menuText.includes('Add Stop'), `${viewport.name}: + menu must expose Stop pin`);
  assert(!/Supergeni Council/i.test(menuText), `${viewport.name}: Supergeni Council must wait for two routes`);

  await page.locator('[data-p0-action="pin-toolbar-tool:fast-answer"]').click();
  await page.waitForTimeout(100);
  assert(await page.locator('[data-p0-toolbar-tool="fast-answer"]').count() === 1, `${viewport.name}: Fast answer must pin to toolbar`);
  await page.locator('[data-p0-toolbar-tool="fast-answer"]').click();
  await page.waitForTimeout(100);
  assert(/Fast answer ready/i.test(await page.locator('#p0-status').innerText()), `${viewport.name}: Fast answer must confirm readiness in subtle status text`);
  assert(/next answer short/i.test(await page.locator('#p0-route').getAttribute('aria-label') || ''), `${viewport.name}: Fast answer must mark next response as short`);
  await page.locator('#p0-input').fill('What is MMIR?');
  await page.locator('#p0-send').click();
  await page.waitForSelector('.p0-message-assistant >> text=MMIR connects AI models and nodes in one chat.');
  assert(fastPayloadSeen, `${viewport.name}: Fast answer must send a short-answer instruction to the route`);
  assert(!(await page.locator('.p0-message-user').innerText()).includes('Answer fast'), `${viewport.name}: user bubble must keep the original prompt clean`);

  await page.locator('#p0-add').click();
  await page.waitForSelector('#p0-add-menu:not([hidden])');
  await page.locator('[data-p0-action="pin-toolbar-tool:fresh-start"]').click();
  await page.waitForTimeout(100);
  assert(await page.locator('[data-p0-toolbar-tool="fresh-start"]').count() === 1, `${viewport.name}: Fresh start must pin to toolbar`);
  assert(await page.locator('[data-p0-toolbar-tool]').count() === 2, `${viewport.name}: pinning two tools must not add unrelated toolbar clutter`);

  await page.locator('[data-p0-toolbar-tool="fresh-start"]').click();
  await page.waitForTimeout(100);
  const statusText = await page.locator('#p0-status').innerText();
  const routeText = await page.locator('#p0-route').innerText();
  const routeLabel = await page.locator('#p0-route').getAttribute('aria-label');
  assert(/Fresh start ready/i.test(statusText), `${viewport.name}: Fresh start must confirm in subtle status text`);
  assert(/Chat cleared/i.test(routeText) && /pairing kept/i.test(routeLabel || ''), `${viewport.name}: Fresh start must avoid deleting pairing silently`);

  await page.locator('#p0-add').click();
  await page.waitForSelector('#p0-add-menu:not([hidden])');
  await page.locator('[data-p0-action="pin-toolbar-tool:memory"]').click();
  await page.waitForTimeout(100);
  assert(await page.locator('[data-p0-toolbar-tool="memory"]').count() === 1, `${viewport.name}: Memory must pin to toolbar`);
  await page.locator('[data-p0-toolbar-tool="memory"]').click();
  await page.waitForTimeout(100);
  assert(/Memory saved locally/i.test(await page.locator('#p0-status').innerText()), `${viewport.name}: Memory must save locally`);

  await page.locator('#p0-add').click();
  await page.waitForSelector('#p0-add-menu:not([hidden])');
  await page.locator('[data-p0-action="privacy-menu"]').click();
  await page.waitForSelector('#p0-privacy-menu:not([hidden])');
  const shieldText = await page.locator('#p0-privacy-menu').innerText();
  assert(/Public/.test(shieldText) && /Private/.test(shieldText) && /Superprivate/.test(shieldText), `${viewport.name}: Shield must expose privacy modes`);
  assert(/Fact guard/.test(shieldText), `${viewport.name}: Shield must expose fact guard`);

  await page.screenshot({ path: `${screenshotDir}/${viewport.name}.png`, fullPage: false });
  assert(logs.length === 0, `${viewport.name}: console must stay clean (${logs.join('; ')})`);
  await page.close();
}

let server;
let browser;
try {
  await mkdir(screenshotDir, { recursive: true });
  port = await resolveToolbarRenderPort();
  baseUrl = `http://${host}:${port}`;
  server = startServer();
  await waitForServer(`${baseUrl}/mmir.html`);
  browser = await chromium.launch();
  await checkViewport(browser, { name: 'desktop', width: 1440, height: 920 });
  await checkViewport(browser, { name: 'mobile', width: 390, height: 844 });
} catch (error) {
  fail(error.message || String(error));
} finally {
  if (browser) await browser.close();
  if (server) server.kill('SIGTERM');
}

if (failures.length) {
  console.error('P0 custom toolbar render check failed:');
  failures.forEach(failure => console.error('- ' + failure));
  process.exit(1);
}

console.log(`P0 custom toolbar render check passed. Screenshots: ${screenshotDir}`);
