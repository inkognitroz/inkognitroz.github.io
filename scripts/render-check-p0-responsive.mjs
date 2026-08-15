import { mkdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { createServer as createNetServer } from 'node:net';
import { chromium } from '@playwright/test';

const host = '127.0.0.1';
const preferredPort = Number(process.env.MMIR_RESPONSIVE_PORT || 8796);
let port = preferredPort;
let baseUrl = `http://${host}:${port}`;
const screenshotDir = process.env.MMIR_RESPONSIVE_SCREENSHOTS || 'test-results/p0-responsive';
const responsiveWriterLabel = 'Mistral Small';
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

async function resolveResponsivePort() {
  const maxAttempts = Number(process.env.MMIR_RESPONSIVE_PORT_ATTEMPTS || 50);
  for (let offset = 0; offset < maxAttempts; offset += 1) {
    const candidate = preferredPort + offset;
    if (await canListen(candidate)) return candidate;
  }
  throw new Error(`No available responsive QA port found from ${preferredPort} across ${maxAttempts} attempts`);
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
      label: 'Supergeni',
      receipt: 'Supergeni ready · hosted · Norsk språkguard · Verifisert med norsk språkguard'
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
  await page.route('https://api.mmir.ai/status', async route => {
    await route.fulfill({
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
    });
  });
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
            live_e2e_verified: true,
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
        model_display_name: 'Supergeni',
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
          answer_writer: {
            object: 'mmir.answer_writer',
            type: 'llm',
            provider: 'mistral',
            model_id: 'mistral-small-latest',
            model_display_name: responsiveWriterLabel
          },
          scaled_intelligence_label: `Søk · 1 kilde · ${responsiveWriterLabel}`,
          answer_proof_line: 'Verifisert med live-kilde',
          sources: [{
            title: 'Norges Bank',
            url: 'https://data.norges-bank.no/api/data/IR/B.KPRA.SD.R?lastNObservations=1&format=sdmx-json'
          }],
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
  await page.addInitScript(({ history, viewportName }) => {
    localStorage.clear();
    sessionStorage.clear();
    const scope = `responsive_guard-${String(viewportName || '').toLowerCase()}`;
    sessionStorage.setItem(`mmir-p0-chat-history-qa-session-schema:${scope}`, '20260603-clean-first-chat-v40');
    sessionStorage.setItem(`mmir-p0-chat-history-qa-session-v1:${scope}`, JSON.stringify(history));
  }, { history: seededHistory(), viewportName: page.viewportSize()?.width === 390 ? 'mobile' : page.viewportSize()?.width === 768 ? 'tablet' : 'desktop' });
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
  const firstSessionPage = await browser.newPage({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1,
    isMobile: viewport.width <= 430
  });
  await installApiFixtures(firstSessionPage);
  await firstSessionPage.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await firstSessionPage.goto(`${baseUrl}/mmir.html?first_session_truth=${viewport.name}#mimir-chat-runtime`, {
    waitUntil: 'networkidle'
  });
  await firstSessionPage.waitForSelector('.p0-first-session[data-answer-state="live"]');
  const firstSession = await firstSessionPage.evaluate(() => {
    const disclosure = document.querySelector('.p0-first-session');
    const badge = document.querySelector('.p0-ai-badge');
    const input = document.getElementById('p0-input');
    const disclosureRect = disclosure?.getBoundingClientRect();
    const badgeRect = badge?.getBoundingClientRect();
    return {
      lang: document.documentElement.lang,
      disclosureText: disclosure?.textContent || '',
      disclosureState: disclosure?.getAttribute('data-answer-state') || '',
      disclosureRect: disclosureRect ? disclosureRect.toJSON() : null,
      badgeText: badge?.textContent || '',
      badgeAria: badge?.getAttribute('aria-label') || '',
      badgeRect: badgeRect ? badgeRect.toJSON() : null,
      inputPlaceholder: input?.getAttribute('placeholder') || '',
      inputAria: input?.getAttribute('aria-label') || '',
      scrollWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
      clientWidth: document.documentElement.clientWidth
    };
  });
  assert(firstSession.lang === 'no', `${viewport.name}: first-session document language must be Norwegian`);
  assert(firstSession.disclosureState === 'live', `${viewport.name}: confirmed route must expose the live answer state`);
  assert(/Supergeni, en kunstig intelligens/i.test(firstSession.disclosureText), `${viewport.name}: first session must disclose the AI interaction before the first prompt`);
  assert(/Ikke del sensitiv info/i.test(firstSession.disclosureText), `${viewport.name}: ready first session must keep one concise sensitive-data warning`);
  assert(/ikke av en demosimulering/i.test(firstSession.disclosureText), `${viewport.name}: live state must not be confused with demo/sample content`);
  assert(firstSession.badgeText.trim() === 'KI-chat' && /kunstig intelligens/i.test(firstSession.badgeAria), `${viewport.name}: persistent AI badge must be visible and accessible`);
  assert(/Supergeni \(KI\)/i.test(firstSession.inputPlaceholder) && /kunstig intelligens/i.test(firstSession.inputAria), `${viewport.name}: composer must identify the AI accessibly`);
  assert((firstSession.disclosureRect?.left || 0) >= -1 && (firstSession.disclosureRect?.right || 0) <= viewport.width + 1, `${viewport.name}: first-session disclosure must stay inside viewport`);
  assert((firstSession.badgeRect?.left || 0) >= -1 && (firstSession.badgeRect?.right || 0) <= viewport.width + 1, `${viewport.name}: AI badge must stay inside viewport`);
  assert(firstSession.scrollWidth <= firstSession.clientWidth + 1, `${viewport.name}: first-session truth UI must not create horizontal overflow`);
  await firstSessionPage.close();

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

  const controls = Object.entries(layout.rects).filter(([id]) => ['p0-attach', 'p0-add', 'p0-model', 'p0-mic', 'p0-send'].includes(id));
  const launchHidden = Object.entries(layout.rects).filter(([id]) => ['p0-privacy'].includes(id));
  for (const [id, rect] of controls) {
    assert(rect?.visible, `${viewport.name}: ${id} should be visible`);
    assert(rect.left >= -1 && rect.right <= viewport.width + 1, `${viewport.name}: ${id} should stay inside viewport`);
    assert(rect.height >= (id === 'p0-send' ? 44 : 34), `${viewport.name}: ${id} should keep a tappable height`);
    if (id === 'p0-send') assert(rect.width >= 44, `${viewport.name}: ${id} should keep a 44px tap width`);
  }
  for (let outer = 0; outer < controls.length; outer += 1) {
    for (let inner = outer + 1; inner < controls.length; inner += 1) {
      assert(!overlap(controls[outer][1], controls[inner][1]), `${viewport.name}: ${controls[outer][0]} overlaps ${controls[inner][0]}`);
    }
  }
  for (const [id, rect] of launchHidden) {
    assert(rect && rect.visible === false, `${viewport.name}: ${id} should stay behind the Tools menu in launch shell`);
  }

  await page.locator('#p0-add').click();
  await page.waitForSelector('#p0-add-menu:not([hidden])');
  layout = await collectLayout(page);
  assertMenuInViewport(layout.addMenu, viewport, `${viewport.name} add`);
  const addMenuText = await page.locator('#p0-add-menu').innerText();
  assert(addMenuText.includes('Ta bilde'), `${viewport.name}: add menu should expose camera input`);
  assert(addMenuText.includes('Velg bilde'), `${viewport.name}: add menu should expose image upload`);
  assert(addMenuText.includes('Personvern'), `${viewport.name}: add menu should expose privacy settings`);
  assert(addMenuText.includes('Svarstil:'), `${viewport.name}: add menu should expose concise answer style`);
  assert(addMenuText.includes('Ny chat'), `${viewport.name}: add menu should expose new chat`);
  assert(!/Koble til lokal AI|Oppdater AI|Superboost|Debatt|Tilbakemelding|Modell/i.test(addMenuText), `${viewport.name}: default add menu must stay free of internal model and process controls`);
  await page.locator('[data-p0-action="privacy-menu"]').click();
  await page.waitForSelector('#p0-privacy-menu:not([hidden])');
  const privacyText = await page.locator('#p0-privacy-menu').innerText();
  assert(/Personvern/i.test(privacyText) && /Offentlig/.test(privacyText) && /Privat/.test(privacyText) && /Superprivat/.test(privacyText), `${viewport.name}: privacy menu must use visible Norwegian labels, got ${JSON.stringify(privacyText)}`);
  const privacyAria = await page.locator('#p0-privacy').getAttribute('aria-label');
  assert(/Sikkerhet og personvern/i.test(privacyAria || ''), `${viewport.name}: privacy control must have a Norwegian accessible label`);
  await page.locator('#p0-add').click();
  await page.waitForSelector('#p0-privacy-menu', { state: 'hidden' });

  await page.locator('#p0-input').fill('Ping responsive guard');
  await page.locator('#p0-send').click();
  await page.waitForSelector('text=Responsive guard answer.');
  const answer = page.locator('.p0-message-assistant').last();
  const receipt = answer.locator(':scope > .p0-message-receipt');
  const receiptSummary = receipt.locator('summary');
  await receiptSummary.waitFor();
  const responseChrome = await answer.evaluate(element => {
    const children = Array.from(element.children);
    const body = element.querySelector(':scope > .p0-message-body');
    const receipts = element.querySelectorAll(':scope > .p0-message-receipt');
    const receipt = receipts[0];
    const summary = receipt?.querySelector('summary');
    const model = summary?.querySelector('.p0-receipt-model');
    const status = summary?.querySelector('.p0-receipt-summary-main');
    const summaryRect = summary?.getBoundingClientRect();
    return {
      childClasses: children.map(child => child.className),
      bodyIndex: children.indexOf(body),
      receiptIndex: children.indexOf(receipt),
      receiptCount: receipts.length,
      directLabelCount: element.querySelectorAll(':scope > .p0-message-label').length,
      directModeCount: element.querySelectorAll(':scope > .p0-connected-intelligence-label').length,
      directProofCount: element.querySelectorAll(':scope > .p0-proof-line').length,
      open: Boolean(receipt?.open),
      summaryText: String(summary?.textContent || '').replace(/\s+/g, ' ').trim(),
      summaryAria: summary?.getAttribute('aria-label') || '',
      summaryRect: summaryRect ? {
        left: summaryRect.left,
        right: summaryRect.right,
        height: summaryRect.height
      } : null,
      modelText: String(model?.textContent || '').trim(),
      statusText: String(status?.textContent || '').trim(),
      bodyText: String(body?.textContent || '').trim()
    };
  });
  assert(responseChrome.bodyIndex >= 0 && responseChrome.bodyIndex < responseChrome.receiptIndex, `${viewport.name}: answer content must render before receipt chrome`);
  assert(responseChrome.receiptCount === 1, `${viewport.name}: each answer must render exactly one receipt/status line`);
  assert(responseChrome.directLabelCount === 0, `${viewport.name}: separate model-label chrome must be removed`);
  assert(responseChrome.directModeCount === 0, `${viewport.name}: answer mode must not render as a second default line`);
  assert(responseChrome.directProofCount === 0, `${viewport.name}: proof must not render as a second default line`);
  assert(!responseChrome.open, `${viewport.name}: receipt details must be closed by default`);
  assert(responseChrome.bodyText.includes('Responsive guard answer.'), `${viewport.name}: answer content must remain first and visible`);
  assert(responseChrome.modelText === responsiveWriterLabel, `${viewport.name}: answer-writer model must remain visible`);
  assert(/Live/i.test(responseChrome.statusText), `${viewport.name}: successful hosted answer must be labelled live`);
  assert(/KI-svar/i.test(responseChrome.statusText) && /kan ta feil/i.test(responseChrome.statusText), `${viewport.name}: generated answer must carry the visible AI warning`);
  assert((responseChrome.statusText.match(/Verifisert/g) || []).length === 1, `${viewport.name}: verification status must appear exactly once in the quiet line`);
  assert(!/spr[aå]k\s*guard|language\s*guard|bevis\s*:/i.test(responseChrome.summaryText), `${viewport.name}: quiet line must not repeat guard or proof labels`);
  assert(responseChrome.summaryAria.includes(responsiveWriterLabel) && responseChrome.summaryAria.includes('Vis kvitteringsdetaljer'), `${viewport.name}: receipt control must expose model and purpose accessibly`);
  assert((responseChrome.summaryRect?.height || 0) <= 26, `${viewport.name}: receipt line should remain compact`);
  assert((responseChrome.summaryRect?.left || 0) >= -1 && (responseChrome.summaryRect?.right || 0) <= viewport.width + 1, `${viewport.name}: receipt line must stay inside the viewport`);
  const allReceiptSummaries = await page.locator('.p0-message-assistant > .p0-message-receipt > summary').allInnerTexts();
  assert(allReceiptSummaries.every(text => !/spr[aå]k\s*guard|language\s*guard|bevis\s*:/i.test(text)), `${viewport.name}: historical answers must also dedupe legacy guard/proof chrome`);

  const expanded = receipt.locator('.p0-receipt-expanded');
  const modeDetail = expanded.locator('.p0-connected-intelligence-label');
  const proofDetail = expanded.locator('.p0-proof-line');
  const sourceDetail = expanded.locator('.p0-proof-source');
  assert(!(await expanded.isVisible()), `${viewport.name}: technical details must be hidden until requested`);
  assert(await modeDetail.count() === 1 && await proofDetail.count() === 1 && await sourceDetail.count() === 1, `${viewport.name}: mode, proof and source details must remain available`);
  const deferredBefore = await page.locator('script[src*="/chat-runtime.js"]').count();
  await receiptSummary.click();
  await expanded.waitFor({ state: 'visible' });
  assert(await modeDetail.isVisible(), `${viewport.name}: answer mode must be visible on demand`);
  assert(await proofDetail.isVisible(), `${viewport.name}: proof must be visible on demand`);
  assert(await sourceDetail.isVisible(), `${viewport.name}: source link must be visible on demand`);
  assert((await sourceDetail.innerText()).includes('Norges Bank'), `${viewport.name}: source link must retain its accessible name`);
  assert((await sourceDetail.getAttribute('rel')) === 'noopener noreferrer', `${viewport.name}: source link must retain safe external-link semantics`);
  assert(await page.locator('script[src*="/chat-runtime.js"]').count() === deferredBefore, `${viewport.name}: opening a receipt must not wake deferred panel runtimes`);
  await receiptSummary.click();
  await page.locator('#p0-input').focus();
  await page.mouse.move(1, 1);
  await page.waitForTimeout(220);

  const lastActions = page.locator('.p0-message-actions').last();
  assert(await lastActions.count() === 1, `${viewport.name}: answer action group should render`);
  assert(await page.locator('[data-p0-message-action="copy"]').last().isVisible(), `${viewport.name}: answer copy action should remain accessible`);
  assert(await page.locator('[data-p0-message-action="retry"]').last().isVisible(), `${viewport.name}: answer retry action should remain accessible`);
  assert(await page.locator('[data-p0-message-action="share-safe"]').last().isVisible(), `${viewport.name}: answer share-safe action should remain accessible`);
  assert((await page.locator('[data-p0-message-action="copy"]').last().innerText()).trim() === 'Kopier', `${viewport.name}: copy action must be Norwegian`);
  assert(/Prøv igjen/i.test(await page.locator('[data-p0-message-action="retry"]').last().innerText()), `${viewport.name}: retry action must be Norwegian`);
  assert(/Del trygt/i.test(await page.locator('[data-p0-message-action="share-safe"]').last().innerText()), `${viewport.name}: share action must be Norwegian`);
  assert(/Kopier svar/i.test(await page.locator('[data-p0-message-action="copy"]').last().getAttribute('aria-label') || ''), `${viewport.name}: copy action must have a Norwegian accessible label`);
  const hiddenOpacity = Number(await lastActions.evaluate((el) => getComputedStyle(el).opacity));
  assert(hiddenOpacity < 0.2, `${viewport.name}: answer actions should be visually subtle before focus, opacity=${hiddenOpacity}`);
  await page.locator('.p0-message-assistant').last().focus();
  await page.waitForTimeout(220);
  const focusOpacity = Number(await lastActions.evaluate((el) => getComputedStyle(el).opacity));
  assert(focusOpacity > 0.6, `${viewport.name}: answer actions should reveal on keyboard/touch focus, opacity=${focusOpacity}`);
  const qaHistoryState = await page.evaluate(() => {
    const sessionKey = window.__MimirP0HistorySessionKey || 'mmir-p0-chat-history-qa-session-v1';
    const sessionHistory = JSON.parse(sessionStorage.getItem(sessionKey) || '[]');
    return {
      sessionKey,
      localHistoryExists: localStorage.getItem('mmir-p0-chat-history-v1') !== null,
      sessionCount: sessionHistory.length,
      sessionHasAnswer: sessionHistory.some(message => /Responsive guard answer/.test(String(message.content || '')))
    };
  });
  assert(!qaHistoryState.localHistoryExists, `${viewport.name}: QA prompt must not persist into normal local history`);
  assert(qaHistoryState.sessionKey.includes(`responsive_guard-${viewport.name}`), `${viewport.name}: responsive QA should use a URL-scoped session history key`);
  assert(qaHistoryState.sessionCount > 0 && qaHistoryState.sessionHasAnswer, `${viewport.name}: QA session history should keep test flow state inside sessionStorage`);

  layout = await collectLayout(page);
  assert(layout.docScrollWidth <= viewport.width + 1, `${viewport.name}: answer actions must not create horizontal overflow`);
  const relevantLogs = messages.filter(message => !/favicon|Failed to load resource/i.test(message));
  assert(relevantLogs.length === 0, `${viewport.name}: console should stay clean, got ${relevantLogs.join(' | ')}`);

  await mkdir(screenshotDir, { recursive: true });
  await page.screenshot({ path: `${screenshotDir}/${viewport.name}.png`, fullPage: false });
  await page.close();
}

port = await resolveResponsivePort();
baseUrl = `http://${host}:${port}`;
if (port !== preferredPort) {
  console.log(`Responsive QA port ${preferredPort} busy; using ${port}.`);
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
