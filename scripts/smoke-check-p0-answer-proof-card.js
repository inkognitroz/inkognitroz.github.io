#!/usr/bin/env node
// The proof card under an answer is built only from fields the answer already carried
// (mmir.route_receipt). This proves both halves of that: a card when the receipt is
// there, and NO card when it is not. A card that appears without a receipt would be
// worse than no card at all — the absence of proof is the thing the user needs to see.
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';

const root = resolve(process.cwd());
const failures = [];
const fail = (message) => failures.push(message);

const MODEL = 'mmir-supergenius';
const ANSWER = 'Synthetic answer for the proof card smoke.';

async function browserProof() {
  const port = 8803;
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
      const timer = setTimeout(() => reject(new Error(`proof-card fixture server timed out; stdout=${output}; stderr=${errorOutput}`)), 20000);
      const settle = () => { if (output.includes(startupLine)) { clearTimeout(timer); server.stdout.off('data', settle); ready(); } };
      server.stdout.on('data', settle); settle();
    });
    browser = await chromium.launch({ headless: true });

    // One fresh context per case: a shared one would carry the previous answer's
    // stored transcript into the next case's DOM.
    async function ask({ receipt }) {
      context = await browser.newContext({ serviceWorkers: 'block' });
      const page = await context.newPage();
      page.setDefaultTimeout(8000);
      await page.route('**/*', async (route) => {
        const url = route.request().url();
        if (url.startsWith(`http://127.0.0.1:${port}/`)) return route.continue();
        const { origin, pathname } = new URL(url);
        const json = (body) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
        if (origin !== 'https://api.mmir.ai') return route.abort();
        if (pathname === '/v1/chat/completions') {
          return json({
            id: 'chatcmpl-proof-card', model: MODEL,
            choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content: ANSWER } }],
            ...(receipt ? { mmir: { route_receipt: receipt } } : {})
          });
        }
        if (pathname === '/v1/models') {
          return json({ object: 'list', data: [{ id: MODEL, name: 'Supergeni', display_name: 'Supergeni', provider: 'mmir', executable: true, selectable: true, recommended: true, availability: 'available', route_state: 'managed_provider_available', route_type: 'managed_provider', route_class: 'free', trust_level: 'public-free', live_e2e_verified: true, live_e2e_proof: { verified: true, stable_verified: true, no_paid_routes_started: true }, cost_class: 'free' }] });
        }
        if (pathname === '/status') {
          return json({ ok: true, no_paid_routes_started: true, live_verified_intelligence_route_count: 1, operator_readiness: { readiness_state: 'swarm_preview_ready', default_writer_readiness: { classification: 'release_ready', authenticated_release_ready: true, blocker_codes: [] }, journeys: { first_chat_ready: true, compare_ready: true, swarm_preview_ready: true } } });
        }
        return json({ object: 'list', data: [] });
      });
      await page.goto(`http://127.0.0.1:${port}/mmir.html`, { waitUntil: 'domcontentloaded' });
      await page.locator('#p0-input').waitFor();
      await page.locator('#p0-input').fill('Si noe kort.');
      await page.locator('#p0-send').click();
      await page.waitForFunction((text) => document.body.innerText.includes(text), ANSWER, { timeout: 15000 }).catch(() => {});
      const cards = page.locator('.p0-proof-card');
      const count = await cards.count();
      const text = count ? (await cards.first().innerText()) : '';
      const answered = (await page.locator('#p0-transcript').innerText()).includes(ANSWER);
      await page.close();
      await context.close(); context = null;
      return { count, text, answered };
    }

    // With a receipt: the card states what answered, whether a paid route started, and
    // which sources were used — each one a field from the receipt itself.
    const withReceipt = await ask({
      receipt: {
        object: 'mmir.route_receipt', model_id: MODEL, no_paid_routes_started: true,
        sources_used: ['snl.no', 'lovdata.no']
      }
    });
    if (!withReceipt.answered) fail('The fixture answer must render before the card can be judged.');
    if (withReceipt.count !== 1) fail(`An answer with a receipt must show exactly one proof card (saw ${withReceipt.count}).`);
    // Exactly as the receipt wrote it, once. The prettified route label prefixes
    // "mmir-" onto an id that already starts with it, and "mmir-mmir-supergenius" in
    // the card meant to earn trust would undercut the whole point.
    if (!withReceipt.text.includes(`Svarte: ${MODEL}`)) fail(`The card must name the model exactly as the receipt did: ${JSON.stringify(withReceipt.text)}`);
    if (withReceipt.text.split(MODEL).length - 1 !== 1) fail(`The model id must appear once, not doubled: ${JSON.stringify(withReceipt.text)}`);
    if (!withReceipt.text.includes('Ingen betalt rute startet')) fail(`The card must carry the receipt's own money claim: ${JSON.stringify(withReceipt.text)}`);
    if (!withReceipt.text.includes('snl.no') || !withReceipt.text.includes('lovdata.no')) fail(`The card must list the sources the receipt named: ${JSON.stringify(withReceipt.text)}`);

    // Without a receipt: no card. Fail-closed.
    const withoutReceipt = await ask({ receipt: null });
    if (!withoutReceipt.answered) fail('The fixture answer must render in the no-receipt case too.');
    if (withoutReceipt.count !== 0) fail(`An answer without a receipt must show NO proof card (saw ${withoutReceipt.count}: ${JSON.stringify(withoutReceipt.text)}).`);

    // A receipt that names no model is not a receipt this card can stand on.
    const emptyReceipt = await ask({ receipt: { object: 'mmir.route_receipt', no_paid_routes_started: true } });
    if (emptyReceipt.count !== 0) fail('A receipt without a model id must not produce a card.');

    // A receipt that does not say anything about paid routes must not be read as "no".
    const silentOnMoney = await ask({ receipt: { object: 'mmir.route_receipt', model_id: MODEL } });
    if (silentOnMoney.count !== 1) fail('A receipt with a model id must still produce a card.');
    if (silentOnMoney.text.includes('Ingen betalt rute startet')) {
      fail(`A silent receipt must not be rendered as a no-paid claim: ${JSON.stringify(silentOnMoney.text)}`);
    }
    if (!silentOnMoney.text.includes('ikke oppgitt')) fail(`A silent receipt must say the claim is missing: ${JSON.stringify(silentOnMoney.text)}`);

    await browser.close(); browser = null;
  } finally {
    if (context) await context.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
    if (server.exitCode === null && !server.killed) try { server.kill('SIGTERM'); } catch { /* already gone */ }
  }
}

await browserProof();
if (failures.length) {
  console.error('P0 answer proof card smoke failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('P0 answer proof card smoke passed.');
