import { spawn } from 'node:child_process';
import { chromium } from '@playwright/test';
import { resolveRenderPort } from './render-port-helper.mjs';

const host = '127.0.0.1';
let port = Number(process.env.MMIR_IMAGE_CARD_PORT || 8803);
port = await resolveRenderPort({
  envName: 'MMIR_IMAGE_CARD_PORT',
  defaultPort: port,
  host,
  attemptsEnvName: 'MMIR_IMAGE_CARD_PORT_ATTEMPTS',
  label: 'generated-image render check'
});
const baseUrl = `http://${host}:${port}`;
const imageUrl = 'https://image.pollinations.ai/prompt/mmir-render-guard';
const failures = [];

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function startServer() {
  return spawn(process.execPath, ['scripts/serve-public.mjs'], {
    cwd: process.cwd(),
    env: { ...process.env, HOST: host, PORT: String(port) },
    stdio: ['ignore', 'pipe', 'pipe']
  });
}

async function waitForServer() {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    try {
      if ((await fetch(`${baseUrl}/mmir.html`)).ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error('Generated-image render server did not become ready.');
}

async function installFixtures(page, imageStatus) {
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
    body: JSON.stringify({ object: 'list', data: [{ id: 'mmir-supergenius', display_name: 'Supergeni', executable: true, recommended: true, availability: 'available', route_state: 'managed_provider_available', live_e2e_verified: true, cost_class: 'free' }] })
  }));
  await page.route('https://api.mmir.ai/v1/chat/completions', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      object: 'chat.completion',
      model: 'mmir-supergenius',
      choices: [{ index: 0, message: { role: 'assistant', content: `Her er bildet:\n\n![Nordlys over fjorden](${imageUrl})` }, finish_reason: 'stop' }],
      mmir: { no_paid_routes_started: true, route: { id: 'mmir-node-bilde', route_id: 'mmir-node-bilde', cost_class: 'free' } }
    })
  }));
  await page.route(imageUrl, route => imageStatus === 200
    ? route.fulfill({ status: 200, contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="4" height="3"><rect width="4" height="3" fill="#34d399"/></svg>' })
    : route.fulfill({ status: imageStatus, contentType: 'text/plain', body: 'unavailable' }));
}

async function runCase(browser, imageStatus) {
  const page = await browser.newPage();
  await page.addInitScript(() => { localStorage.clear(); sessionStorage.clear(); });
  await installFixtures(page, imageStatus);
  await page.goto(`${baseUrl}/mmir.html`, { waitUntil: 'domcontentloaded' });
  await page.locator('#p0-input').fill('Lag et bilde av nordlys over en fjord.');
  await page.locator('#p0-send').click();
  const card = page.locator('.p0-generated-image-card');
  await card.waitFor({ state: 'visible' });
  await page.waitForTimeout(100);
  const state = await card.evaluate(element => ({
    label: element.getAttribute('aria-label'),
    unavailable: element.classList.contains('is-preview-unavailable'),
    imageHidden: element.querySelector('img')?.hidden,
    previewLinkHidden: element.querySelector(':scope > a')?.hidden,
    imageAlt: element.querySelector('img')?.alt,
    referrerPolicy: element.querySelector('img')?.referrerPolicy,
    linkText: element.querySelector('figcaption a')?.textContent,
    statusText: element.querySelector('.p0-generated-image-status')?.textContent
  }));
  await page.close();
  return state;
}

const server = startServer();
let browser;
try {
  await waitForServer();
  browser = await chromium.launch({ headless: true });
  const rendered = await runCase(browser, 200);
  assert(rendered.label === 'Generert bilde', 'successful image must retain its accessible card label');
  assert(rendered.unavailable === false, 'successful image must not show the unavailable state');
  assert(rendered.imageHidden === false, 'successful image must remain visible');
  assert(rendered.imageAlt === 'Nordlys over fjorden', 'generated image must preserve descriptive alt text');
  assert(rendered.referrerPolicy === 'no-referrer', 'generated image must keep the no-referrer policy');

  const failed = await runCase(browser, 503);
  assert(failed.unavailable === true, 'failed image must activate the unavailable state');
  assert(failed.imageHidden === true, 'failed image preview must be hidden');
  assert(failed.previewLinkHidden === true, 'failed image preview must not leave an empty focusable link');
  assert(failed.statusText === 'Forhåndsvisning utilgjengelig', 'failed image must explain the fallback');
  assert(failed.linkText === 'Åpne bilde', 'failed image must retain the direct image link');
} finally {
  await browser?.close();
  server.kill('SIGTERM');
}

if (failures.length) {
  console.error('P0 generated-image browser render check failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('P0 generated-image browser render check passed.');
