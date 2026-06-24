import { mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const url = process.env.MMIR_STAGING_COUNCIL_URL || 'https://staging.mmir.ai/mmir.html';
const prompt = process.env.MMIR_STAGING_COUNCIL_PROMPT || 'Hva er MMIR sin visjon? Svar konkret og overbevisende pa norsk.';
const screenshotDir = process.env.MMIR_STAGING_COUNCIL_SCREENSHOTS || 'test-results/staging-council-live';
const timeoutMs = Number(process.env.MMIR_STAGING_COUNCIL_TIMEOUT_MS || 90000);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function uniqueUrl(base) {
  const parsed = new URL(base);
  parsed.searchParams.set('codex_staging_council_live', String(Date.now()));
  parsed.hash = parsed.hash || 'mimir-prompt';
  return parsed.toString();
}

await mkdir(screenshotDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
const browserErrors = [];

page.on('console', message => {
  if (['error', 'warning'].includes(message.type())) {
    browserErrors.push(`${message.type()}: ${message.text()}`);
  }
});
page.on('pageerror', error => {
  browserErrors.push(`pageerror: ${error.message}`);
});

try {
  const liveUrl = uniqueUrl(url);
  await page.goto(liveUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('#p0-input', { timeout: 20000 });
  await page.waitForSelector('#p0-council', { timeout: 20000 });

  const initial = await page.evaluate(() => ({
    route: document.querySelector('#p0-route')?.textContent?.trim() || '',
    councilText: document.querySelector('#p0-council')?.textContent?.trim() || '',
    councilState: document.querySelector('#p0-council')?.getAttribute('data-state') || ''
  }));

  assert(/Debate/i.test(initial.councilText), 'Expected visible Debate / Supergeni Council button.');

  await page.fill('#p0-input', prompt);
  await page.click('#p0-council');

  await page.waitForFunction(() => {
    const transcript = document.querySelector('#p0-transcript')?.textContent || '';
    const status = document.querySelector('#p0-status')?.textContent || '';
    const route = document.querySelector('#p0-route')?.textContent || '';
    const text = `${transcript} ${status} ${route}`;
    const stillRunning = /Council is asking|is running|Independent answers|live progress|synthesizing/i.test(text);
    const hasFinal = /Intelligence\. Connected|selvforsterkende|kobler|beste svar|MMIR sin visjon er|Supergeni/i.test(transcript);
    const hasProof = /Sp[øo]r\s+\d+\s+AI|routes compared|Verifisert|privat/i.test(route + transcript);
    return !stillRunning && hasFinal && hasProof;
  }, null, { timeout: timeoutMs });

  const result = await page.evaluate(() => ({
    status: document.querySelector('#p0-status')?.textContent?.trim() || '',
    route: document.querySelector('#p0-route')?.textContent?.trim() || '',
    transcript: (document.querySelector('#p0-transcript')?.textContent || '').replace(/\s+/g, ' ').trim(),
    objectObject: document.body.textContent.includes('[object Object]')
  }));

  await page.screenshot({ path: `${screenshotDir}/council-live.png`, fullPage: true });

  assert(!result.objectObject, 'Council response rendered [object Object].');
  assert(/Sp[øo]r\s+\d+\s+AI|routes compared|Verifisert|privat/i.test(result.route + result.transcript), 'Council proof did not expose route/value receipt.');
  assert(/Intelligence\. Connected|selvforsterkende|kobler|beste svar|MMIR sin visjon er|Supergeni/i.test(result.transcript), 'Council did not render a final answer.');

  console.log(JSON.stringify({
    ok: true,
    url: liveUrl,
    initial,
    status: result.status,
    route: result.route,
    answer_tail: result.transcript.slice(-900),
    screenshot: `${screenshotDir}/council-live.png`,
    browser_errors: browserErrors.slice(0, 10)
  }, null, 2));
} finally {
  await browser.close();
}
