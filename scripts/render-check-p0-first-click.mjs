import { mkdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { chromium } from '@playwright/test';

const port = Number(process.env.MMIR_FIRST_CLICK_PORT || 8797);
const host = '127.0.0.1';
const baseUrl = `http://${host}:${port}`;
const screenshotDir = process.env.MMIR_FIRST_CLICK_SCREENSHOTS || 'test-results/p0-first-click';
const failures = [];

const viewports = [
  { name: 'desktop', width: 1440, height: 900, mobile: false },
  { name: 'mobile', width: 390, height: 844, mobile: true }
];

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
            name: 'Supergeni',
            display_name: 'Supergeni',
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
        id: 'chatcmpl_first_click_guard',
        object: 'chat.completion',
        model: 'mmir-supergenius',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'First-click guard answer.'
            },
            finish_reason: 'stop'
          }
        ],
        usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
        mmir: {
          no_paid_routes_started: true,
          route: {
            id: 'browser-guide/free',
            route_id: 'browser-guide/free',
            route_class: 'free',
            cost_class: 'free',
            score: 100
          }
        }
      })
    });
  });

  await page.route('https://api.mmir.ai/feedback/intake', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        accepted: true,
        target: 'inkognitroz',
        draft: {
          classification: {
            lane: 'L1 Frontend UX',
            repo: 'inkognitroz.github.io'
          }
        },
        inbox_item: {
          id: 'fb_synced_render_guard',
          created_at: new Date().toISOString(),
          target: 'inkognitroz',
          source: 'mmir-chat-feedback',
          status: 'submitted',
          priority: 'p3-ux',
          title: 'Feedback synced to intake',
          suggestion: 'Keep route truth visible while feedback drafts exist.',
          classification: {
            lane: 'L1 Frontend UX',
            repo: 'inkognitroz.github.io',
            backlog_hint: 'feedback-intake-synced'
          },
          no_paid_routes_started: true,
          provider_called: false,
          server_state: 'synced'
        }
      })
    });
  });
}

async function installVoiceFixture(page) {
  await page.addInitScript(() => {
    class FakeSpeechRecognition {
      constructor() {
        this.lang = '';
        this.interimResults = false;
        this.maxAlternatives = 1;
        this.onstart = null;
        this.onresult = null;
        this.onend = null;
        this.onerror = null;
      }
      start() {
        setTimeout(() => {
          this.onstart?.();
          this.onresult?.({ results: [[{ transcript: 'voice first click' }]] });
          this.onend?.();
        }, 0);
      }
    }
    window.SpeechRecognition = FakeSpeechRecognition;
    window.webkitSpeechRecognition = FakeSpeechRecognition;
  });
}

async function clearBrowserState(page) {
  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}

async function pageLayout(page) {
  return page.evaluate(() => {
    const controls = ['p0-add', 'p0-privacy', 'p0-model', 'p0-mic', 'p0-send'];
    const rects = {};
    for (const id of controls) {
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
    const addMenu = document.getElementById('p0-add-menu');
    const modelMenu = document.getElementById('p0-model-menu');
    const privacyMenu = document.getElementById('p0-privacy-menu');
    const route = document.getElementById('p0-route');
    const feedback = document.getElementById('p0-feedback-capture');
    return {
      title: document.title,
      text: document.body.innerText,
      html: document.documentElement.outerHTML.slice(0, 5000),
      scrollWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
      clientWidth: document.documentElement.clientWidth,
      addMenu: addMenu && !addMenu.hidden ? addMenu.getBoundingClientRect().toJSON() : null,
      modelMenu: modelMenu && !modelMenu.hidden ? modelMenu.getBoundingClientRect().toJSON() : null,
      privacyMenu: privacyMenu && !privacyMenu.hidden ? privacyMenu.getBoundingClientRect().toJSON() : null,
      route: route ? {
        text: route.textContent || '',
        hidden: route.offsetParent === null,
        rect: route.getBoundingClientRect().toJSON()
      } : null,
      feedback: feedback ? {
        text: feedback.textContent || '',
        hidden: feedback.hidden || feedback.offsetParent === null,
        rect: feedback.hidden ? null : feedback.getBoundingClientRect().toJSON()
      } : null,
      rects
    };
  });
}

function assertNoOverlay(layout, label) {
  assert(!/vite|webpack|next\.js|runtime error|uncaught error/i.test(layout.text), `${label}: framework/error overlay must not render`);
  assert(!/Selected browser LLM is not loaded|System prompt should always be the first message/i.test(layout.text), `${label}: stale browser-model failure must not render`);
}

function assertMenuBounds(menu, viewport, label) {
  assert(Boolean(menu), `${label}: menu should be visible`);
  if (!menu) return;
  assert(menu.left >= -1, `${label}: menu must not overflow left`);
  assert(menu.right <= viewport.width + 1, `${label}: menu must not overflow right`);
  assert(menu.bottom <= viewport.height + 1, `${label}: menu must not overflow bottom`);
  assert(menu.width >= Math.min(260, viewport.width - 32), `${label}: menu should keep a useful tap width`);
}

function rectOverlap(a, b) {
  if (!a || !b) return false;
  return !(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top);
}

function assertControls(layout, viewport, label) {
  assert(layout.scrollWidth <= viewport.width + 1, `${label}: page must not have horizontal overflow`);
  const entries = Object.entries(layout.rects);
  for (const [id, rect] of entries) {
    assert(Boolean(rect?.visible), `${label}: ${id} should be visible`);
    if (!rect) continue;
    assert(rect.left >= -1 && rect.right <= viewport.width + 1, `${label}: ${id} must stay inside viewport`);
    assert(rect.height >= 34, `${label}: ${id} should keep a tappable height`);
  }
  for (let outer = 0; outer < entries.length; outer += 1) {
    for (let inner = outer + 1; inner < entries.length; inner += 1) {
      assert(!rectOverlap(entries[outer][1], entries[inner][1]), `${label}: ${entries[outer][0]} overlaps ${entries[inner][0]}`);
    }
  }
}

function assertFeedbackRail(layout, viewport, label) {
  assert(Boolean(layout.route), `${label}: route line should exist`);
  assert(Boolean(layout.feedback), `${label}: feedback capture pill should exist`);
  assert(layout.route?.hidden === false, `${label}: route line must stay visible when feedback is captured`);
  assert(layout.feedback?.hidden === false, `${label}: feedback pill must stay visible when drafts exist`);
  assert(Boolean(String(layout.route?.text || '').trim()), `${label}: route line must keep status copy`);
  assert(/Feedback Inbox/i.test(layout.feedback?.text || ''), `${label}: feedback pill should keep inbox summary`);
  assert(layout.scrollWidth <= viewport.width + 1, `${label}: feedback rail must not create horizontal overflow`);
  assert(!rectOverlap(layout.route?.rect, layout.feedback?.rect), `${label}: route line and feedback pill must not overlap`);
}

async function screenshot(page, name) {
  await mkdir(screenshotDir, { recursive: true });
  await page.screenshot({ path: `${screenshotDir}/${name}.png`, fullPage: false });
}

async function checkViewport(browser, viewport) {
  const page = await browser.newPage({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1,
    isMobile: viewport.mobile
  });
  const logs = [];
  page.on('console', message => {
    if (['warning', 'error'].includes(message.type())) logs.push(`${message.type()}: ${message.text()}`);
  });
  page.on('pageerror', error => logs.push(`pageerror: ${error.message}`));

  await installApiFixtures(page);
  await installVoiceFixture(page);
  await clearBrowserState(page);
  await page.goto(`${baseUrl}/mmir.html?first_click_guard=${viewport.name}#mimir-chat-runtime`, {
    waitUntil: 'networkidle'
  });
  await page.waitForSelector('#mmir-p0-app');
  await page.waitForSelector('#p0-input');
  const qaHistoryMode = await page.evaluate(() => window.__MimirP0HistorySessionMode === true);
  assert(qaHistoryMode, `${viewport.name}: first-click QA must use session-scoped history`);

  let layout = await pageLayout(page);
  assert(layout.title.includes('MMIR'), `${viewport.name}: page title should identify MMIR`);
  assert(layout.text.includes('MMIR.ai'), `${viewport.name}: body should render MMIR`);
  assertNoOverlay(layout, viewport.name);
  assertControls(layout, viewport, viewport.name);
  await screenshot(page, `${viewport.name}-loaded`);

  await page.locator('#p0-add').click();
  await page.waitForSelector('#p0-add-menu:not([hidden])');
  layout = await pageLayout(page);
  assertMenuBounds(layout.addMenu, viewport, `${viewport.name} add`);
  assert(layout.text.includes('TOOLS'), `${viewport.name}: add menu title should be Tools`);
  assert(layout.text.includes('Connect local model'), `${viewport.name}: add menu should expose Connect local model`);
  assert(!/Intelligence pool|Smart routing/i.test(layout.text), `${viewport.name}: add menu must not show strategy cards`);
  await screenshot(page, `${viewport.name}-add-menu`);

  await page.locator('[data-p0-action="connect-local"]').click();
  if (await page.locator('[data-p0-os-command="mac"]').isVisible().catch(() => false)) {
    await page.locator('[data-p0-os-command="mac"]').click();
  }
  await page.waitForSelector('.p0-command-card code');
  const commandText = await page.locator('.p0-command-card code').last().innerText();
  assert(commandText.trim() === 'curl -fsSL https://mmir.ai/downloads/mmir-local-node-macos-linux.sh | bash', `${viewport.name}: Connect local model should write the canonical Mac/Linux install command into chat`);
  layout = await pageLayout(page);
  assertControls(layout, viewport, `${viewport.name} command`);
  await screenshot(page, `${viewport.name}-install-command`);

  await page.locator('#p0-privacy').click();
  await page.waitForSelector('#p0-privacy-menu:not([hidden])');
  layout = await pageLayout(page);
  assertMenuBounds(layout.privacyMenu, viewport, `${viewport.name} privacy`);
  assert(/Shield mode/i.test(layout.text), `${viewport.name}: shield mode menu should open`);
  assert(/Public/i.test(layout.text), `${viewport.name}: shield menu should expose public mode`);
  assert(/Private/i.test(layout.text), `${viewport.name}: shield menu should expose private mode`);
  assert(/Superprivate/i.test(layout.text), `${viewport.name}: shield menu should expose superprivate mode`);
  assert(/Fact guard/i.test(layout.text), `${viewport.name}: privacy menu should expose hallucination-prevention guard`);
  assert(/No paid route started/i.test(layout.text), `${viewport.name}: privacy menu should keep cost boundary visible`);
  await page.locator('[data-p0-action="set-privacy-mode:superprivate"]').click();
  await page.waitForFunction(() => /Superprivate needs local node/i.test(document.getElementById('p0-route')?.textContent || ''));
  if (!(await page.locator('#p0-privacy-menu:not([hidden])').isVisible().catch(() => false))) {
    await page.locator('#p0-privacy').click();
    await page.waitForSelector('#p0-privacy-menu:not([hidden])');
  }
  await page.locator('[data-p0-action="set-privacy-mode:public"]').click();
  await page.waitForFunction(() => !/Superprivate needs local node/i.test(document.getElementById('p0-route')?.textContent || ''));

  await page.locator('#p0-model').click();
  await page.waitForSelector('#p0-model-menu:not([hidden])');
  layout = await pageLayout(page);
  assertMenuBounds(layout.modelMenu, viewport, `${viewport.name} model`);
  assert(layout.text.includes('MODELS'), `${viewport.name}: model menu should open`);
  assert(layout.text.includes('Supergeni'), `${viewport.name}: model menu should show active route`);
  assert(!/Active route/i.test(layout.text), `${viewport.name}: simple model menu must not show active route detail card`);
  assert(layout.text.includes('Route controls'), `${viewport.name}: route details should stay behind Route controls`);
  await screenshot(page, `${viewport.name}-model-menu`);

  await page.locator('[data-p0-action="model-route-controls"]').click();
  await page.waitForSelector('text=Route details');
  layout = await pageLayout(page);
  assert(layout.text.includes('Route details'), `${viewport.name}: route controls should expose receipt details`);

  await page.locator('#p0-mic').click();
  await page.waitForFunction(() => document.getElementById('p0-input')?.value?.includes('voice first click'));
  await page.locator('#p0-input').fill('First click guard prompt');
  await page.locator('#p0-send').click();
  await page.waitForSelector('text=First-click guard answer.');
  layout = await pageLayout(page);
  assertControls(layout, viewport, `${viewport.name} answer`);
  assert(layout.text.includes('First-click guard answer.'), `${viewport.name}: send control should produce a rendered answer`);
  const historyState = await page.evaluate(() => {
    const sessionKey = window.__MimirP0HistorySessionKey || 'mmir-p0-chat-history-qa-session-v1';
    const sessionHistory = JSON.parse(sessionStorage.getItem(sessionKey) || '[]');
    return {
      sessionKey,
      localHistoryExists: localStorage.getItem('mmir-p0-chat-history-v1') !== null,
      sessionCount: sessionHistory.length,
      sessionHasPrompt: sessionHistory.some(message => /First click guard prompt/.test(String(message.content || ''))),
      sessionHasAnswer: sessionHistory.some(message => /First-click guard answer/.test(String(message.content || '')))
    };
  });
  assert(!historyState.localHistoryExists, `${viewport.name}: first-click QA prompt must not persist into normal local history`);
  assert(historyState.sessionKey.includes(`first_click_guard-${viewport.name}`), `${viewport.name}: first-click QA should use a URL-scoped session history key`);
  assert(historyState.sessionCount > 0 && historyState.sessionHasPrompt && historyState.sessionHasAnswer, `${viewport.name}: first-click QA should keep prompt/answer in session history only`);
  await screenshot(page, `${viewport.name}-answer`);

  await page.locator('#p0-input').fill('@inkognitroz Keep route truth visible while feedback drafts exist.');
  await page.locator('#p0-send').click();
  await page.waitForFunction(() => /Feedback Inbox/i.test(document.getElementById('p0-feedback-capture')?.textContent || ''));
  layout = await pageLayout(page);
  assertFeedbackRail(layout, viewport, `${viewport.name} feedback rail`);
  await screenshot(page, `${viewport.name}-feedback-rail`);

  const relevantLogs = logs.filter(message => !/favicon|Failed to load resource/i.test(message));
  assert(relevantLogs.length === 0, `${viewport.name}: console/page errors should stay clean, got ${relevantLogs.join(' | ')}`);
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
  console.error('P0 first-click render check failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`P0 first-click render check passed for ${viewports.map(viewport => viewport.name).join(', ')}. Screenshots: ${screenshotDir}`);
