import { spawn } from 'node:child_process';
import { createServer as createNetServer } from 'node:net';
import { webkit } from '@playwright/test';

const host = '127.0.0.1';
const preferredPort = Number(process.env.MMIR_IPHONE_WEBKIT_PORT || 8830);
const viewport = { width: 390, height: 844 };
const failures = [];
let port = preferredPort;
let baseUrl = '';

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function canListen(candidate) {
  return new Promise((resolve, reject) => {
    const server = createNetServer();
    server.once('error', error => error?.code === 'EADDRINUSE' ? resolve(false) : reject(error));
    server.listen(candidate, host, () => server.close(() => resolve(true)));
  });
}

async function resolvePort() {
  for (let offset = 0; offset < 40; offset += 1) {
    const candidate = preferredPort + offset;
    if (await canListen(candidate)) return candidate;
  }
  throw new Error('No free iPhone WebKit test port');
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

async function waitForServer() {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/mmir.html`);
      if (response.ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 120));
  }
  throw new Error('iPhone WebKit test server did not become ready');
}

function corsHeaders() {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': 'authorization, content-type'
  };
}

function statusFixture(releaseReady) {
  return {
    ok: true,
    no_paid_routes_started: true,
    capabilities: ['chat.completions'],
    live_verified_intelligence_route_count: releaseReady ? 1 : 0,
    operator_readiness: {
      readiness_state: releaseReady ? 'swarm_preview_ready' : 'blocked',
      default_writer_readiness: {
        classification: releaseReady ? 'release_ready' : 'blocked',
        authenticated_release_ready: releaseReady,
        blocker_codes: releaseReady ? [] : ['authenticated_evaluation_failed']
      },
      journeys: {
        first_chat_ready: releaseReady,
        compare_ready: releaseReady,
        swarm_preview_ready: releaseReady
      }
    }
  };
}

function modelsFixture() {
  return {
    object: 'list',
    total_visible_model_count: 1,
    live_selectable_model_count: 1,
    live_verified_intelligence_route_count: 1,
    degraded_model_count: 0,
    data: [{
      id: 'mmir-supergenius',
      name: 'Supergeni',
      display_name: 'Supergeni',
      provider: 'mmir',
      status: 'available',
      availability: 'available',
      route_id: 'fixture/verified',
      node_id: 'fixture-webkit',
      route_state: 'available',
      route_type: 'external_untrusted_free',
      executable: true,
      selectable: true,
      recommended: true,
      live_e2e_verified: true,
      live_e2e_proof: { verified: true, stable_verified: true, no_paid_routes_started: true },
      cost_class: 'free',
      capabilities: ['chat.completions'],
      limitations: ['Local WebKit fixture only.']
    }]
  };
}

function chatFixture() {
  return {
    id: 'chatcmpl_iphone_webkit_fixture',
    object: 'chat.completion',
    model: 'mmir-supergenius',
    choices: [{
      index: 0,
      message: { role: 'assistant', content: 'Lokalt WebKit-testsvar.' },
      finish_reason: 'stop'
    }],
    mmir: {
      answer_writer: {
        object: 'mmir.answer_writer',
        type: 'llm',
        provider: 'fixture',
        model_id: 'webkit-fixture',
        model_display_name: 'WebKit-fixture'
      },
      no_paid_routes_started: true,
      route: {
        route_id: 'fixture/verified',
        route_class: 'free',
        cost_class: 'free'
      }
    }
  };
}

async function installNetworkFence(page, { releaseReady }) {
  const state = {
    chatCalls: 0,
    continuedRequests: [],
    pendingChats: [],
    unexpectedExternal: []
  };
  const localOrigin = new URL(baseUrl).origin;

  await page.route('**/*', async route => {
    const request = route.request();
    const url = new URL(request.url());

    if (url.origin === localOrigin) {
      state.continuedRequests.push(request.url());
      await route.continue();
      return;
    }

    // Every non-local request is fulfilled by this process or aborted below.
    // The regression can exercise send/stop without reaching MMIR or a provider.

    if (url.origin === 'https://api.mmir.ai' && request.method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: corsHeaders(), body: '' });
      return;
    }

    if (request.url() === 'https://api.mmir.ai/status' && request.method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: corsHeaders(),
        body: JSON.stringify(statusFixture(releaseReady))
      });
      return;
    }

    if (request.url() === 'https://api.mmir.ai/v1/models' && request.method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: corsHeaders(),
        body: JSON.stringify(modelsFixture())
      });
      return;
    }

    if (request.url() === 'https://api.mmir.ai/v1/chat/completions' && request.method() === 'POST') {
      state.chatCalls += 1;
      await new Promise(resolve => state.pendingChats.push(resolve));
      try {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers: corsHeaders(),
          body: JSON.stringify(chatFixture())
        });
      } catch {}
      return;
    }

    state.unexpectedExternal.push(`${request.method()} ${request.url()}`);
    await route.abort('blockedbyclient');
  });

  state.releaseNextChat = () => state.pendingChats.shift()?.();
  return state;
}

async function newIphonePage(browser, options) {
  const context = await browser.newContext({
    viewport,
    screen: viewport,
    deviceScaleFactor: 3,
    hasTouch: true,
    isMobile: true,
    locale: 'nb-NO',
    serviceWorkers: 'block',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
  });
  const page = await context.newPage();
  const browserErrors = [];
  page.on('console', message => {
    if (message.type() === 'error') browserErrors.push(message.text());
  });
  page.on('pageerror', error => browserErrors.push(error.message));
  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
    try { delete window.SpeechRecognition; } catch { window.SpeechRecognition = undefined; }
    try { delete window.webkitSpeechRecognition; } catch { window.webkitSpeechRecognition = undefined; }
  });
  const network = await installNetworkFence(page, options);
  await page.goto(`${baseUrl}/mmir.html?iphone_webkit_regression=1`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#p0-send');
  return { context, page, network, browserErrors };
}

function relativeLuminance(color) {
  const channels = String(color || '').match(/[\d.]+/g)?.slice(0, 3).map(Number);
  if (!channels || channels.length !== 3) return 0;
  const linear = channels.map(value => {
    const channel = value / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrastRatio(foreground, background) {
  const first = relativeLuminance(foreground);
  const second = relativeLuminance(background);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

async function sendState(page) {
  return page.locator('#p0-send').evaluate(button => {
    const style = getComputedStyle(button);
    const rect = button.getBoundingClientRect();
    return {
      width: rect.width,
      height: rect.height,
      background: style.backgroundColor,
      color: style.color,
      opacity: style.opacity,
      state: button.dataset.state || '',
      ariaLabel: button.getAttribute('aria-label') || '',
      ariaDescribedBy: button.getAttribute('aria-describedby') || ''
    };
  });
}

function assertSendSurface(surface, label) {
  assert(Math.abs(surface.width - 44) <= 0.5, `${label} send control must compute to 44 CSS pixels wide; got ${surface.width}`);
  assert(Math.abs(surface.height - 44) <= 0.5, `${label} send control must compute to 44 CSS pixels high; got ${surface.height}`);
  assert(surface.opacity === '1', `${label} send control must be fully opaque; got ${surface.opacity}`);
  assert(surface.background !== 'rgba(0, 0, 0, 0)' && surface.background !== 'transparent', `${label} send control must have a visible fill`);
  assert(contrastRatio(surface.color, surface.background) >= 4.5, `${label} send icon must keep WCAG contrast; got ${surface.color} on ${surface.background}`);
}

async function touch(page, selector) {
  const box = await page.locator(selector).boundingBox();
  if (!box) throw new Error(`Cannot touch missing control: ${selector}`);
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
}

async function waitForCounter(page, read, expected, label) {
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    if (read() === expected) return;
    await page.waitForTimeout(25);
  }
  throw new Error(`${label} did not reach ${expected}; got ${read()}`);
}

async function assertMenuSafe(page, selector, label) {
  const layout = await page.locator(selector).evaluate(menu => {
    const menuRect = menu.getBoundingClientRect();
    const composerRect = document.querySelector('.p0-composer')?.getBoundingClientRect();
    const toolbarRect = document.querySelector('.p0-toolbar')?.getBoundingClientRect();
    const sendRect = document.getElementById('p0-send')?.getBoundingClientRect();
    return {
      menu: menuRect.toJSON(),
      composer: composerRect?.toJSON() || null,
      toolbar: toolbarRect?.toJSON() || null,
      send: sendRect?.toJSON() || null,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      safeAreaSupported: CSS.supports('padding-bottom: env(safe-area-inset-bottom)'),
      mobileSafeAreaRulePresent: [...document.styleSheets].some(sheet => {
        try {
          return [...sheet.cssRules].some(rule => String(rule.cssText || '').includes('env(safe-area-inset-bottom)'));
        } catch {
          return false;
        }
      })
    };
  });
  assert(layout.safeAreaSupported, `${label} must run in a WebKit engine with safe-area env support`);
  assert(layout.mobileSafeAreaRulePresent, `${label} must retain the production safe-area CSS rule`);
  assert(layout.menu.left >= -0.5 && layout.menu.right <= layout.viewport.width + 0.5, `${label} must stay inside the 390px viewport`);
  assert(
    layout.menu.top >= -0.5 && layout.menu.bottom <= layout.viewport.height + 0.5,
    `${label} must stay inside the 844px viewport; got ${JSON.stringify(layout.menu)}`
  );
  assert(Boolean(layout.toolbar && layout.send), `${label} needs measurable composer controls`);
  if (layout.toolbar && layout.send) assert(
    layout.menu.bottom <= layout.toolbar.top - 0.5 && layout.menu.bottom <= layout.send.top - 0.5,
    `${label} must not overlap the composer controls or their bottom safe area; menu ${JSON.stringify(layout.menu)}, toolbar ${JSON.stringify(layout.toolbar)}, send ${JSON.stringify(layout.send)}`
  );
}

async function checkBlockedIphone(browser) {
  const { context, page, network, browserErrors } = await newIphonePage(browser, { releaseReady: false });
  try {
    await page.waitForSelector('#p0-release-warning[data-state="blocked"]');
    assert(await page.locator('#p0-send').isDisabled(), 'blocked iPhone send control must be disabled');
    const surface = await sendState(page);
    assertSendSurface(surface, 'blocked');
    assert(surface.state === 'blocked', `blocked send control must expose blocked state; got ${surface.state}`);
    assert(surface.ariaDescribedBy === 'p0-release-warning', 'blocked send control must reference the visible explanation');

    const warning = (await page.locator('#p0-release-warning').innerText()).replace(/\s+/g, ' ').trim();
    assert(warning.length <= 140, `blocked privacy copy must stay compact; got ${warning.length} characters`);
    assert(/ikke produksjonsklar/i.test(warning) && /sensitiv info/i.test(warning), `blocked copy must keep concise release and privacy truth; got ${warning}`);
    assert(!/personopplysninger/i.test(warning), 'blocked copy must not repeat the longer personal-data lecture');

    await page.locator('#p0-input').fill('Denne blokkerte teksten skal ikke sendes');
    await page.locator('#p0-input').press('Enter');
    await page.waitForTimeout(100);
    await touch(page, '#p0-send');
    await page.waitForTimeout(100);
    assert(network.chatCalls === 0, `blocked keyboard and touch paths must make zero chat submissions; got ${network.chatCalls}`);

    await touch(page, '#p0-add');
    await page.waitForSelector('#p0-add-menu:not([hidden])');
    await assertMenuSafe(page, '#p0-add-menu', 'tools menu');
    await touch(page, '#p0-add-menu [data-p0-action="privacy-menu"]');
    await page.waitForSelector('#p0-privacy-menu:not([hidden])');
    await assertMenuSafe(page, '#p0-privacy-menu', 'privacy menu');

    assert(network.continuedRequests.length > 0, 'blocked fixture must load the local app through the network fence');
    assert(network.continuedRequests.every(url => new URL(url).origin === new URL(baseUrl).origin), 'blocked fixture must continue only local static requests');
    assert(network.unexpectedExternal.length === 0, `blocked fixture saw unexpected external requests: ${network.unexpectedExternal.join(', ')}`);
    assert(browserErrors.length === 0, `blocked WebKit page must stay free of browser errors: ${browserErrors.join('; ')}`);
  } finally {
    await context.close();
  }
}

async function checkReadyBusyAndStop(browser) {
  const { context, page, network, browserErrors } = await newIphonePage(browser, { releaseReady: true });
  try {
    await page.waitForFunction(() => document.getElementById('p0-release-warning')?.hidden === true);
    assert(!(await page.locator('#p0-send').isDisabled()), 'ready iPhone send control must be enabled');
    const ready = await sendState(page);
    assertSendSurface(ready, 'ready');
    assert(ready.state === 'send', `ready send control must expose send state; got ${ready.state}`);
    assert(ready.background === 'rgb(17, 24, 39)' && ready.color === 'rgb(255, 255, 255)', `ready send control must keep its solid dark fill; got ${ready.color} on ${ready.background}`);
    assert(ready.ariaDescribedBy === '', 'ready send control must not reference the hidden release warning');

    const visibleText = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
    assert((visibleText.match(/Ikke del sensitiv info\./gi) || []).length === 1, 'ready first screen must show the compact privacy reminder exactly once');
    assert(!/personopplysninger/i.test(visibleText), 'ready first screen must not show the longer personal-data lecture');

    await page.locator('#p0-input').fill('Send med tastaturet, stopp med berøring');
    await page.locator('#p0-input').press('Enter');
    await page.waitForSelector('#p0-send[data-state="stopping"]');
    await waitForCounter(page, () => network.chatCalls, 1, 'keyboard chat fixture count');
    const keyboardBusy = await sendState(page);
    assertSendSurface(keyboardBusy, 'keyboard busy');
    assert(keyboardBusy.ariaLabel === 'Stopp gjeldende svar', 'busy button must name its stop action');
    assert(await page.locator('#p0-composer').getAttribute('aria-busy') === 'true', 'busy composer must expose aria-busy=true');
    await touch(page, '#p0-send');
    network.releaseNextChat();
    await page.waitForFunction(() => document.getElementById('p0-send')?.dataset.state === 'send');
    assert(await page.locator('#p0-composer').getAttribute('aria-busy') === 'false', 'touch stop must clear the busy state');

    await page.locator('#p0-input').fill('Send med berøring, stopp med tastaturet');
    await touch(page, '#p0-send');
    await page.waitForSelector('#p0-send[data-state="stopping"]');
    await waitForCounter(page, () => network.chatCalls, 2, 'touch chat fixture count');
    const touchBusy = await sendState(page);
    assertSendSurface(touchBusy, 'touch busy');
    await page.keyboard.press('Escape');
    network.releaseNextChat();
    await page.waitForFunction(() => document.getElementById('p0-send')?.dataset.state === 'send');
    assert(await page.locator('#p0-composer').getAttribute('aria-busy') === 'false', 'keyboard stop must clear the busy state');
    assert(network.chatCalls === 2, `ready keyboard and touch paths must each start one locally intercepted fixture request; got ${network.chatCalls}`);
    assert(network.continuedRequests.length > 0, 'ready fixture must load the local app through the network fence');
    assert(network.continuedRequests.every(url => new URL(url).origin === new URL(baseUrl).origin), 'ready fixture must continue only local static requests');
    assert(network.unexpectedExternal.length === 0, `ready fixture saw unexpected external requests: ${network.unexpectedExternal.join(', ')}`);
    assert(browserErrors.length === 0, `ready WebKit page must stay free of browser errors: ${browserErrors.join('; ')}`);
  } finally {
    while (network.pendingChats.length) network.releaseNextChat();
    await context.close();
  }
}

let server;
let browser;
try {
  port = await resolvePort();
  baseUrl = `http://${host}:${port}`;
  server = startServer();
  await waitForServer();
  browser = await webkit.launch();
  await checkBlockedIphone(browser);
  await checkReadyBusyAndStop(browser);
} catch (error) {
  failures.push(error?.stack || error?.message || String(error));
} finally {
  if (browser) await browser.close();
  if (server) server.kill('SIGTERM');
}

if (failures.length) {
  console.error('P0 iPhone WebKit render check failed:');
  failures.forEach(failure => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('P0 iPhone WebKit render check passed: 390x844 blocked, ready, busy, stop, keyboard, touch, menus and network fence.');
