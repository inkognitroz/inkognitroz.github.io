import { mkdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { chromium } from '@playwright/test';

const port = Number(process.env.MMIR_RESPONSIVE_PORT || 8796);
const host = '127.0.0.1';
const baseUrl = `http://${host}:${port}`;
const screenshotDir = process.env.MMIR_RESPONSIVE_SCREENSHOTS || 'test-results/p0-responsive';
const failures = [];

const viewports = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 }
];

function fail(message) {
  failures.push(message);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function seededHistory() {
  const messages = [];
  for (let index = 0; index < 18; index += 1) {
    messages.push({
      id: `responsive-user-${index}`,
      role: 'user',
      content: `Responsive QA prompt ${index + 1}: keep this line readable on every viewport.`
    });
    messages.push({
      id: `responsive-assistant-${index}`,
      role: 'assistant',
      content: `Responsive QA answer ${index + 1}. This answer is intentionally short, scrollable and safe.`,
      label: 'Supergenious',
      receipt: 'Supergenious · Free · api.mmir.ai'
    });
  }
  return messages;
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

async function installApiFixtures(page) {
  await page.route('https://api.mmir.ai/v1/models', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        object: 'list',
        data: [
          {
            id: 'mmir-supergenius',
            name: 'Supergenious',
            display_name: 'Supergenious',
            executable: true,
            recommended: true,
            availability: 'available',
            route_state: 'managed_provider_available',
            cost_class: 'free'
          }
        ]
      })
    });
  });

  await page.route('https://api.mmir.ai/v1/chat/completions', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'chatcmpl_responsive_guard',
        object: 'chat.completion',
        model: 'mmir-supergenius',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'Responsive guard answer.'
            },
            finish_reason: 'stop'
          }
        ],
        mmir: {
          no_paid_routes_started: true,
          route: {
            route_id: 'browser-guide/free',
            route_class: 'free',
            cost_class: 'free'
          }
        }
      })
    });
  });
}

async function seedBrowserState(page) {
  await page.addInitScript(history => {
    localStorage.clear();
    sessionStorage.clear();
    sessionStorage.setItem('mmir-p0-chat-history-qa-session-schema', '20260603-clean-first-chat-v40');
    sessionStorage.setItem('mmir-p0-chat-history-qa-session-v1', JSON.stringify(history));
  }, seededHistory());
}

function overlap(a, b) {
  if (!a || !b) return false;
  return !(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top);
}

async function collectLayout(page) {
  return page.evaluate(() => {
    const ids = ['p0-add', 'p0-privacy', 'p0-model', 'p0-mic', 'p0-send'];
    const rects = {};
    for (const id of ids) {
      const element = document.getElementById(id);
      const rect = element?.getBoundingClientRect();
      rects[id] = rect ? {
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
        visible: rect.width > 0 && rect.height > 0
      } : null;
    }
    const transcript = document.getElementById('p0-transcript');
    const addMenu = document.getElementById('p0-add-menu');
    const modelMenu = document.getElementById('p0-model-menu');
    const app = document.getElementById('mmir-p0-app');
    return {
      title: document.title,
      text: document.body.innerText,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      docScrollWidth: document.documentElement.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
      app: app ? app.getBoundingClientRect().toJSON() : null,
      transcript: transcript ? {
        clientHeight: transcript.clientHeight,
        scrollHeight: transcript.scrollHeight,
        scrollTop: transcript.scrollTop,
        overflowY: getComputedStyle(transcript).overflowY
      } : null,
      addMenu: addMenu && !addMenu.hidden ? addMenu.getBoundingClientRect().toJSON() : null,
      modelMenu: modelMenu && !modelMenu.hidden ? modelMenu.getBoundingClientRect().toJSON() : null,
      rects
    };
  });
}

function assertMenuInViewport(menu, viewport, label) {
  assert(Boolean(menu), `${label} menu should be visible`);
  if (!menu) return;
  assert(menu.left >= -1, `${label} menu must not overflow left`);
  assert(menu.right <= viewport.width + 1, `${label} menu must not overflow right`);
  assert(menu.bottom <= viewport.height + 1, `${label} menu must not overflow bottom`);
  assert(menu.width >= Math.min(280, viewport.width - 24), `${label} menu should keep a useful tap width`);
}

async function checkViewport(browser, viewport) {
  const page = await browser.newPage({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1,
    isMobile: viewport.width <= 430
  });
  const messages = [];
  page.on('console', message => {
    if (['warning', 'error'].includes(message.type())) messages.push(`${message.type()}: ${message.text()}`);
  });
  page.on('pageerror', error => messages.push(`pageerror: ${error.message}`));
  await installApiFixtures(page);
  await seedBrowserState(page);
  await page.goto(`${baseUrl}/mmir.html?responsive_guard=${viewport.name}#mimir-chat-runtime`, {
    waitUntil: 'networkidle'
  });
  await page.waitForSelector('#mmir-p0-app');
  await page.waitForSelector('#p0-input');
  const qaHistoryMode = await page.evaluate(() => window.__MimirP0HistorySessionMode === true);
  assert(qaHistoryMode, `${viewport.name}: responsive QA must use session-scoped history`);

  await page.locator('#p0-transcript').evaluate(element => {
    element.scrollTop = element.scrollHeight;
  });

  let layout = await collectLayout(page);
  assert(layout.title.includes('MMIR'), `${viewport.name}: page title should identify MMIR`);
  assert(layout.text.includes('MMIR.ai'), `${viewport.name}: body should render MMIR brand`);
  assert(!/SaaS Fabric/i.test(layout.text), `${viewport.name}: retired SaaS Fabric copy must not render`);
  assert(!/Selected browser LLM is not loaded|System prompt should always be the first message/i.test(layout.text), `${viewport.name}: stale browser-model errors must not render`);
  assert(layout.docScrollWidth <= viewport.width + 1, `${viewport.name}: document must not have horizontal overflow`);
  assert(layout.bodyScrollWidth <= viewport.width + 1, `${viewport.name}: body must not have horizontal overflow`);
  assert(layout.transcript?.overflowY === 'auto', `${viewport.name}: transcript must remain scrollable`);
  assert((layout.transcript?.scrollHeight || 0) > (layout.transcript?.clientHeight || 0), `${viewport.name}: seeded transcript must create a scrollable answer pane`);

  const controls = Object.entries(layout.rects);
  for (const [id, rect] of controls) {
    assert(rect?.visible, `${viewport.name}: ${id} should be visible`);
    assert(rect.left >= -1 && rect.right <= viewport.width + 1, `${viewport.name}: ${id} should stay inside viewport`);
    assert(rect.height >= 34, `${viewport.name}: ${id} should keep a tappable height`);
  }
  for (let outer = 0; outer < controls.length; outer += 1) {
    for (let inner = outer + 1; inner < controls.length; inner += 1) {
      assert(!overlap(controls[outer][1], controls[inner][1]), `${viewport.name}: ${controls[outer][0]} overlaps ${controls[inner][0]}`);
    }
  }

  await page.locator('#p0-add').click();
  await page.waitForSelector('#p0-add-menu:not([hidden])');
  layout = await collectLayout(page);
  assertMenuInViewport(layout.addMenu, viewport, `${viewport.name} add`);
  assert(layout.text.includes('Add model'), `${viewport.name}: add menu should expose Add model`);
  assert(layout.text.includes('Refresh models'), `${viewport.name}: add menu should expose Refresh models`);

  await page.locator('[data-p0-action="connect-local"]').click();
  await page.waitForSelector('.p0-command-card code');
  const commandText = await page.locator('.p0-command-card code').last().innerText();
  assert(commandText.includes('https://mmir.ai/downloads/mmir-local-node-macos-linux.sh'), `${viewport.name}: connect local flow should show canonical command in chat`);
  layout = await collectLayout(page);
  assert(layout.docScrollWidth <= viewport.width + 1, `${viewport.name}: connect local card must not create horizontal overflow`);

  await page.locator('#p0-model').click();
  await page.waitForSelector('#p0-model-menu:not([hidden])');
  layout = await collectLayout(page);
  assertMenuInViewport(layout.modelMenu, viewport, `${viewport.name} model`);
  assert(layout.text.includes('Supergenious'), `${viewport.name}: model picker should show active model`);

  await page.locator('#p0-input').fill('Ping responsive guard');
  await page.locator('#p0-send').click();
  await page.waitForSelector('text=Responsive guard answer.');
  const lastActions = page.locator('.p0-message-actions').last();
  assert(await lastActions.count() === 1, `${viewport.name}: answer action group should render`);
  assert(await page.locator('[data-p0-message-action="copy"]').last().isVisible(), `${viewport.name}: answer copy action should remain accessible`);
  assert(await page.locator('[data-p0-message-action="retry"]').last().isVisible(), `${viewport.name}: answer retry action should remain accessible`);
  assert(await page.locator('[data-p0-message-action="share-safe"]').last().isVisible(), `${viewport.name}: answer share-safe action should remain accessible`);
  const hiddenOpacity = Number(await lastActions.evaluate((el) => getComputedStyle(el).opacity));
  assert(hiddenOpacity < 0.2, `${viewport.name}: answer actions should be visually subtle before focus, opacity=${hiddenOpacity}`);
  await page.locator('.p0-message-assistant').last().focus();
  await page.waitForTimeout(220);
  const focusOpacity = Number(await lastActions.evaluate((el) => getComputedStyle(el).opacity));
  assert(focusOpacity > 0.6, `${viewport.name}: answer actions should reveal on keyboard/touch focus, opacity=${focusOpacity}`);
  const qaHistoryState = await page.evaluate(() => {
    const sessionHistory = JSON.parse(sessionStorage.getItem('mmir-p0-chat-history-qa-session-v1') || '[]');
    return {
      localHistoryExists: localStorage.getItem('mmir-p0-chat-history-v1') !== null,
      sessionCount: sessionHistory.length,
      sessionHasAnswer: sessionHistory.some(message => /Responsive guard answer/.test(String(message.content || '')))
    };
  });
  assert(!qaHistoryState.localHistoryExists, `${viewport.name}: QA prompt must not persist into normal local history`);
  assert(qaHistoryState.sessionCount > 0 && qaHistoryState.sessionHasAnswer, `${viewport.name}: QA session history should keep test flow state inside sessionStorage`);

  layout = await collectLayout(page);
  assert(layout.docScrollWidth <= viewport.width + 1, `${viewport.name}: answer actions must not create horizontal overflow`);
  const relevantLogs = messages.filter(message => !/favicon|Failed to load resource/i.test(message));
  assert(relevantLogs.length === 0, `${viewport.name}: console should stay clean, got ${relevantLogs.join(' | ')}`);

  await mkdir(screenshotDir, { recursive: true });
  await page.screenshot({ path: `${screenshotDir}/${viewport.name}.png`, fullPage: false });
  await page.close();
}

const server = startServer();
try {
  await waitForServer(`${baseUrl}/mmir.html`);
  const browser = await chromium.launch();
  try {
    for (const viewport of viewports) {
      await checkViewport(browser, viewport);
    }
  } finally {
    await browser.close();
  }
} finally {
  server.kill('SIGTERM');
}

if (failures.length) {
  console.error('P0 responsive render check failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`P0 responsive render check passed for ${viewports.map(viewport => viewport.name).join(', ')}.`);
