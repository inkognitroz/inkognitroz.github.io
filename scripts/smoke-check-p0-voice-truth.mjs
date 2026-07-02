import { spawn } from 'node:child_process';

const port = Number(process.env.MMIR_VOICE_TRUTH_PORT || 8798);
const host = '127.0.0.1';
const baseUrl = `http://${host}:${port}`;
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
  await page.route('https://api.mmir.ai/v1/models**', async route => {
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
}

async function loadChromium() {
  try {
    const playwright = await import('@playwright/test');
    return playwright.chromium;
  } catch (error) {
    throw new Error(
      'P0 voice truth smoke requires @playwright/test. Run `npm install` in this repo before this smoke. ' +
        `Original error: ${error.message}`
    );
  }
}

async function preparePage(page, suffix) {
  await installApiFixtures(page);
  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
    window.__mmirVoiceEvents = [];
    window.addEventListener('mmir-p0-voice-state-updated', event => {
      window.__mmirVoiceEvents.push(event.detail);
    });
  });
  await page.goto(`${baseUrl}/mmir.html?voice_truth=${suffix}#mimir-chat-runtime`, {
    waitUntil: 'networkidle'
  });
  await page.waitForSelector('#mmir-p0-app');
  await page.waitForSelector('#p0-mic');
}

async function checkUnsupported(browser) {
  const page = await browser.newPage();
  await page.addInitScript(() => {
    try { delete window.SpeechRecognition; } catch (error) { window.SpeechRecognition = undefined; }
    try { delete window.webkitSpeechRecognition; } catch (error) { window.webkitSpeechRecognition = undefined; }
  });
  await preparePage(page, 'unsupported');
  await page.locator('#p0-mic').click();
  await page.waitForFunction(() => document.getElementById('p0-status')?.textContent?.includes('Voice input unavailable'));
  const state = await page.evaluate(() => ({
    buttonState: document.getElementById('p0-mic')?.dataset.voiceState,
    status: document.getElementById('p0-status')?.textContent,
    route: document.getElementById('p0-route')?.getAttribute('aria-label'),
    events: window.__mmirVoiceEvents
  }));
  assert(state.buttonState === 'unavailable', 'Unsupported browser must mark mic as unavailable, not hidden or fake-ready.');
  assert(/Type instead/.test(state.status || ''), 'Unsupported browser must tell the user to type instead.');
  assert(/Voice unavailable/.test(state.route || ''), 'Unsupported browser must show voice unavailable in the compact route line.');
  assert(state.events.some(event => event.state === 'unavailable' && event.no_server_audio === true), 'Unsupported browser must emit no-server-audio unavailable evidence.');
  await page.close();
}

async function checkSupported(browser) {
  const page = await browser.newPage();
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
          this.onresult?.({ results: [[{ transcript: 'hello voice route' }]] });
          this.onend?.();
        }, 0);
      }
    }
    window.SpeechRecognition = FakeSpeechRecognition;
    window.webkitSpeechRecognition = FakeSpeechRecognition;
  });
  await preparePage(page, 'supported');
  await page.locator('#p0-mic').click();
  await page.waitForFunction(() => document.getElementById('p0-input')?.value?.includes('hello voice route'));
  const state = await page.evaluate(() => ({
    buttonState: document.getElementById('p0-mic')?.dataset.voiceState,
    input: document.getElementById('p0-input')?.value,
    status: document.getElementById('p0-status')?.textContent,
    route: document.getElementById('p0-route')?.getAttribute('aria-label'),
    events: window.__mmirVoiceEvents
  }));
  assert(state.buttonState === 'available', 'Supported browser must mark mic as available.');
  assert(state.input === 'hello voice route', 'Supported browser must add recognized voice text to the prompt.');
  assert(/Voice text added/.test(state.status || ''), 'Supported browser must confirm voice text was added.');
  assert(state.events.some(event => event.state === 'transcribed' && event.no_server_audio === true && event.no_paid_route === true), 'Supported browser must emit transcribed no-server-audio evidence.');
  await page.close();
}

async function main() {
  const server = startServer();
  try {
    await waitForServer(`${baseUrl}/mmir.html`);
    const chromium = await loadChromium();
    const browser = await chromium.launch();
    try {
      await checkUnsupported(browser);
      await checkSupported(browser);
    } finally {
      await browser.close();
    }
  } finally {
    server.kill('SIGTERM');
  }

  if (failures.length) {
    console.error('P0 voice truth smoke failed:');
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }
  console.log('P0 voice truth smoke passed.');
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
