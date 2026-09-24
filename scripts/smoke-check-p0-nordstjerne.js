#!/usr/bin/env node
// One user number on the front page, read from the loop's own public observation.
// What this pins: exactly one call per page load (no polling), the UTC date key the
// loop actually writes, and — the part that matters — that the percentage only
// appears once the loop separates the probes' failures from the users'. Until then
// the count is shown and the share is not, because a share computed from a mixed
// failure count is a floor, not the number.
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';

const root = resolve(process.cwd());
const failures = [];
const fail = (message) => failures.push(message);
const OBSERVATION = 'https://mmir-north-star-sloyfe.halvord-vinger.workers.dev/status/observasjon';

const idag = new Date().toISOString().slice(0, 10);
const igaar = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

async function browserProof() {
  const port = 8804;
  const server = spawn(process.execPath, ['scripts/serve-public.mjs'], {
    cwd: root, env: { ...process.env, HOST: '127.0.0.1', PORT: String(port) }, stdio: ['ignore', 'pipe', 'pipe']
  });
  const startupLine = `Serving public at http://127.0.0.1:${port}/mmir.html`;
  let output = ''; let errorOutput = '';
  server.stdout.on('data', (chunk) => { output = (output + chunk.toString()).slice(-4096); });
  server.stderr.on('data', (chunk) => { errorOutput = (errorOutput + chunk.toString()).slice(-4096); });
  let browser = null; let context = null;
  try {
    await new Promise((ready, reject) => {
      const timer = setTimeout(() => reject(new Error(`nordstjerne fixture server timed out; stdout=${output}; stderr=${errorOutput}`)), 20000);
      const settle = () => { if (output.includes(startupLine)) { clearTimeout(timer); server.stdout.off('data', settle); ready(); } };
      server.stdout.on('data', settle); settle();
    });
    browser = await chromium.launch({ headless: true });

    async function load({ observation, status = 200, timezoneId }) {
      context = await browser.newContext({ serviceWorkers: 'block', ...(timezoneId ? { timezoneId } : {}) });
      const page = await context.newPage();
      page.setDefaultTimeout(8000);
      const observationCalls = [];
      // The page is loaded AS https://mmir.ai, because that is the only origin the
      // loop allows this read from — and because the shell refuses to ask from any
      // other origin rather than leaving a CORS error in a clean console. Requests to
      // mmir.ai are served from the local fixture build.
      await page.route('**/*', async (route) => {
        const url = route.request().url();
        if (url.startsWith('https://mmir.ai/')) {
          const local = url.replace('https://mmir.ai/', `http://127.0.0.1:${port}/`);
          const fetched = await fetch(local);
          return route.fulfill({
            status: fetched.status,
            headers: { 'content-type': fetched.headers.get('content-type') || 'text/html' },
            body: Buffer.from(await fetched.arrayBuffer())
          });
        }
        if (url.startsWith(`http://127.0.0.1:${port}/`)) return route.continue();
        if (url === OBSERVATION) {
          observationCalls.push(url);
          // The deployed worker allows exactly this read from mmir.ai (north-star#96).
          // The fixture serves the same header, or the browser would block the read
          // and the test would pass for the wrong reason.
          const headers = { 'content-type': 'application/json', 'access-control-allow-origin': '*' };
          if (status !== 200) return route.fulfill({ status, headers, body: '{}' });
          return route.fulfill({ status: 200, headers, body: JSON.stringify(observation) });
        }
        if (new URL(url).origin === 'https://api.mmir.ai') {
          return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ object: 'list', data: [] }) });
        }
        return route.abort();
      });
      await page.goto('https://mmir.ai/mmir.html', { waitUntil: 'domcontentloaded' });
      const line = page.locator('#mmir-nordstjerne');
      await line.waitFor({ state: 'attached' });
      await page.waitForFunction(() => {
        const el = document.getElementById('mmir-nordstjerne');
        return el && (!el.hidden || el.dataset.state === 'idle');
      }, null, { timeout: 8000 }).catch(() => {});
      // Give a refresh a chance to re-run init(): the number must not be fetched again.
      await page.locator('#refresh-platform-status').click().catch(() => {});
      await page.waitForTimeout(400);
      const hidden = await line.isHidden();
      const text = hidden ? '' : (await line.innerText());
      await page.close();
      await context.close(); context = null;
      return { text, hidden, observationCalls };
    }

    // The loop separates the audiences (syntetiske_feilede present): show the share.
    const clean = await load({
      observation: { per_dag: { [idag]: { ekte: 616, syntetiske: 84, feilede: 4, syntetiske_feilede: 29 } } }
    });
    if (!clean.text.includes('616 ekte spørsmål')) fail(`The front page must show the real question count: ${JSON.stringify(clean.text)}`);
    if (!clean.text.includes('99.4 % svart uten feil')) fail(`The share must be computed from the real failures only: ${JSON.stringify(clean.text)}`);
    if (clean.observationCalls.length !== 1) fail(`Exactly one observation call per page load, also across a Refresh (saw ${clean.observationCalls.length}).`);

    // The loop has not separated them yet: count, but no share. This is the state the
    // live endpoint was in at 05:28Z today, before the first run on the new code.
    const mixed = await load({
      observation: { per_dag: { [idag]: { ekte: 616, syntetiske: 84, feilede: 33 } } }
    });
    if (!mixed.text.includes('616 ekte spørsmål')) fail(`The count must still be shown without the split: ${JSON.stringify(mixed.text)}`);
    if (/%/.test(mixed.text)) fail(`No share may be shown while the failure count can include probes: ${JSON.stringify(mixed.text)}`);

    // No row for today yet (early UTC morning): fall back to yesterday, and say so.
    const yesterday = await load({
      observation: { per_dag: { [igaar]: { ekte: 46, syntetiske: 154, feilede: 0, syntetiske_feilede: 0 } } }
    });
    if (!yesterday.text.includes('46 ekte spørsmål i går')) fail(`Without a row for today the line must fall back to yesterday: ${JSON.stringify(yesterday.text)}`);
    if (!yesterday.text.includes('100 % svart uten feil')) fail(`Yesterday's share must be shown too: ${JSON.stringify(yesterday.text)}`);

    // The date key must be the loop's: UTC, not the browser's local date. One
    // timezone is not enough to prove that: a fixed offset only disagrees with UTC
    // for part of the day, so a single case lets the local-date mutant survive
    // whenever the two happen to agree — which is exactly what it did here at 05:50Z
    // with Sydney. These two are ten hours either side of UTC, so at every hour of
    // the day at least one of them is on a different calendar date than UTC.
    for (const timezoneId of ['Pacific/Honolulu', 'Pacific/Kiritimati']) {
      const langtUnna = await load({
        timezoneId,
        observation: { per_dag: { [idag]: { ekte: 616, syntetiske: 84, feilede: 4, syntetiske_feilede: 29 } } }
      });
      if (!langtUnna.text.includes('616 ekte spørsmål')) {
        fail(`In ${timezoneId} the date key must still be UTC, the key the loop writes: ${JSON.stringify(langtUnna.text)}`);
      }
    }

    // Nothing to say: the line stays empty rather than showing a placeholder that
    // looks like a measurement.
    const empty = await load({ observation: { per_dag: {} } });
    if (!empty.hidden) fail(`With no rows the line must stay hidden: ${JSON.stringify(empty.text)}`);
    const down = await load({ observation: null, status: 503 });
    if (!down.hidden) fail('A loop that is down must leave the line hidden, not show an error the user cannot act on.');

    await browser.close(); browser = null;
  } finally {
    if (context) await context.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
    if (server.exitCode === null && !server.killed) try { server.kill('SIGTERM'); } catch { /* already gone */ }
  }
}

await browserProof();
if (failures.length) {
  console.error('P0 nordstjerne smoke failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('P0 nordstjerne smoke passed.');
