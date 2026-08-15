import { mkdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { chromium } from '@playwright/test';
import { resolveRenderPort } from './render-port-helper.mjs';

const host = '127.0.0.1';
let port = Number(process.env.MMIR_TOOLBAR_RENDER_PORT || 8799);
let baseUrl = `http://${host}:${port}`;
const screenshotDir = process.env.MMIR_TOOLBAR_SCREENSHOTS || 'test-results/p0-minimal-composer';
const failures = [];

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
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 150));
  }
  throw new Error(`Server did not become ready at ${url}`);
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
  await page.route('https://api.mmir.ai/status', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      live_verified_intelligence_route_count: 1,
      operator_readiness: {
        readiness_state: 'ready',
        default_writer_readiness: { classification: 'ready', authenticated_release_ready: true },
        journeys: { first_chat_ready: true, compare_ready: true, swarm_preview_ready: true }
      }
    })
  }));
  await page.route('https://api.mmir.ai/v1/models', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    headers: { 'access-control-allow-origin': '*' },
    body: JSON.stringify({
      object: 'list',
      data: [{
        id: 'mmir-supergenius',
        display_name: 'Supergeni',
        executable: true,
        recommended: true,
        availability: 'available',
        route_state: 'managed_provider_available',
        live_e2e_verified: true,
        cost_class: 'free'
      }]
    })
  }));
  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.goto(`${baseUrl}/mmir.html?p0_minimal_composer=${viewport.name}#mimir-chat-runtime`, { waitUntil: 'networkidle' });
  await page.waitForSelector('#p0-input');

  assert(await page.locator('#p0-add').count() === 1, `${viewport.name}: settings button must exist`);
  assert(await page.locator('#p0-privacy').count() === 1, `${viewport.name}: privacy control must exist`);
  assert(await page.locator('#p0-model').count() === 1, `${viewport.name}: model picker must exist`);
  assert(await page.locator('#p0-send').count() === 1, `${viewport.name}: send button must exist`);
  assert(await page.locator('#p0-superboost, #p0-council, #p0-toolbar-tools, #p0-feedback-capture').count() === 0, `${viewport.name}: advanced controls must not be mounted`);
  assert(
    /Spør Supergeni \(KI\)/i.test(await page.locator('#p0-input').getAttribute('placeholder') || ''),
    `${viewport.name}: composer must keep the concise AI disclosure placeholder`
  );

  await page.locator('#p0-add').click();
  await page.waitForSelector('#p0-add-menu:not([hidden])');
  const menuText = await page.locator('#p0-add-menu').innerText();
  assert(/Ta bilde/.test(menuText), `${viewport.name}: camera input must be visible`);
  assert(/Velg bilde/.test(menuText), `${viewport.name}: image library must be visible`);
  assert(/Personvern/.test(menuText), `${viewport.name}: privacy setting must be visible`);
  assert(/Svarstil/.test(menuText), `${viewport.name}: answer style setting must be visible`);
  assert(/Ny chat/.test(menuText), `${viewport.name}: new-chat setting must be visible`);
  assert(!/Superboost|Debate|Council|Feedback Inbox|Intelligence status|Add to toolbar/i.test(menuText), `${viewport.name}: menu must not expose internal product controls`);

  const inputBox = await page.locator('#p0-input').boundingBox();
  const sendBox = await page.locator('#p0-send').boundingBox();
  assert(Boolean(inputBox && sendBox), `${viewport.name}: composer controls must be measurable`);
  if (inputBox && sendBox) {
    assert(inputBox.x + inputBox.width <= viewport.width + 1, `${viewport.name}: input must fit viewport`);
    assert(sendBox.x + sendBox.width <= viewport.width + 1, `${viewport.name}: send control must fit viewport`);
    assert(sendBox.width >= 44 && sendBox.height >= 44, `${viewport.name}: send control must keep a 44 by 44 CSS pixel tap target`);
  }
  const sendVisual = await page.locator('#p0-send').evaluate(button => {
    const style = getComputedStyle(button);
    return { background: style.backgroundColor, color: style.color, opacity: style.opacity };
  });
  assert(sendVisual.background !== 'rgba(0, 0, 0, 0)' && sendVisual.opacity === '1', `${viewport.name}: enabled send control must stay opaque and visible`);

  await page.screenshot({ path: `${screenshotDir}/${viewport.name}.png`, fullPage: false });
  assert(logs.length === 0, `${viewport.name}: console must stay clean (${logs.join('; ')})`);
  await page.close();
}

let server;
let browser;
try {
  await mkdir(screenshotDir, { recursive: true });
  port = await resolveRenderPort({
    envName: 'MMIR_TOOLBAR_RENDER_PORT',
    attemptsEnvName: 'MMIR_TOOLBAR_RENDER_PORT_ATTEMPTS',
    defaultPort: 8799,
    host,
    label: 'minimal composer render check'
  });
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
  console.error('P0 minimalist composer render check failed:');
  failures.forEach(failure => console.error('- ' + failure));
  process.exit(1);
}

console.log(`P0 minimalist composer render check passed. Screenshots: ${screenshotDir}`);
