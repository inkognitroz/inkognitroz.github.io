#!/usr/bin/env node
// F1-1: the ordinary chat send may go through the backend layer instead of the
// gateway, behind one flag. This proves both states of that flag against a stubbed
// network, and that a failure on the backend is shown rather than quietly retried
// against api.mmir.ai — a fallback would hide the very thing the flag measures.
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';

const root = resolve(process.cwd());
const failures = [];
const fail = (message) => failures.push(message);

async function browserProof() {
  const port = 8802;
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
      const timer = setTimeout(() => reject(new Error(`chat-via-backend fixture server timed out; stdout=${output}; stderr=${errorOutput}`)), 20000);
      const settle = () => { if (output.includes(startupLine)) { clearTimeout(timer); server.stdout.off('data', settle); ready(); } };
      server.stdout.on('data', settle); settle();
    });
    browser = await chromium.launch({ headless: true });

    // A fresh context per flag state: the flag is read from the page's own window, and
    // a shared context would carry the previous case's stored conversation into the
    // next one's transcript.
    async function chatOnce({ flagOn, flagValue, backendStatus = 200 }) {
      context = await browser.newContext({ serviceWorkers: 'block' });
      const page = await context.newPage();
      page.setDefaultTimeout(8000);
      const chatCalls = [];
      const knowledgeCalls = [];
      const raw = flagOn ? true : flagValue;
      if (raw !== undefined) await page.addInitScript((value) => { window.MMIR_CHAT_VIA_BACKEND = value; }, raw);
      await page.route('**/*', async (route) => {
        const url = route.request().url();
        if (url.startsWith(`http://127.0.0.1:${port}/`)) return route.continue();
        const { origin, pathname } = new URL(url);
        const method = route.request().method();
        const json = (status, body) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
        if (origin === 'https://backend.mmir.ai') {
          if (pathname === '/health') {
            return json(200, { status: 'online', service: 'mmir-orchestrator', layer: 'backend', capabilities: ['identity', 'proxy.chat_completions'], ordering_authority: 'bound' });
          }
          if (pathname === '/identity/session') {
            return json(200, { object: 'mmir.identity_session', anonymous: true, token: 'synthetic-session-token', identity_id: 'usr_fixture', issued_at: new Date().toISOString(), expires_at: new Date(Date.now() + 86400000).toISOString() });
          }
          if (pathname === '/knowledge/search') {
            knowledgeCalls.push({ origin, authorization: route.request().headers().authorization || '', body: route.request().postDataJSON() });
            return json(200, { object: 'list', data: [{ chunk_id: 'chunk-offline-proof', snippet: 'ORBITAL-CEDAR-447 synthetic retrieval proof', document: { id: 'doc-offline-proof', name: 'offline-proof.txt' } }] });
          }
          if (pathname === '/v1/chat/completions') {
            chatCalls.push({ origin, authorization: route.request().headers().authorization || '', body: route.request().postDataJSON() });
            if (backendStatus !== 200) return json(backendStatus, { error: { code: 'backend_chat_unavailable', message: 'The backend chat proxy is unavailable right now.' } });
            return json(200, { id: 'chatcmpl-backend', model: 'mmir-supergenius', choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content: 'Backend answered.' } }] });
          }
        }
        if (origin === 'https://api.mmir.ai') {
          if (pathname === '/v1/chat/completions') {
            chatCalls.push({ origin, authorization: route.request().headers().authorization || '' });
            return json(200, { id: 'chatcmpl-gateway', model: 'mmir-supergenius', choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content: 'Gateway answered.' } }] });
          }
          if (pathname === '/v1/models') {
            return json(200, { object: 'list', data: [{ id: 'mmir-supergenius', name: 'Supergeni', display_name: 'Supergeni', provider: 'mmir', executable: true, selectable: true, recommended: true, availability: 'available', route_state: 'managed_provider_available', route_type: 'managed_provider', route_class: 'free', trust_level: 'public-free', live_e2e_verified: true, live_e2e_proof: { verified: true, stable_verified: true, no_paid_routes_started: true }, cost_class: 'free' }] });
          }
          if (pathname === '/status') {
            return json(200, { ok: true, no_paid_routes_started: true, live_verified_intelligence_route_count: 1, operator_readiness: { readiness_state: 'swarm_preview_ready', default_writer_readiness: { classification: 'release_ready', authenticated_release_ready: true, blocker_codes: [] }, journeys: { first_chat_ready: true, compare_ready: true, swarm_preview_ready: true } } });
          }
          return json(200, { object: 'list', data: [] });
        }
        return route.abort();
      });
      await page.goto(`http://127.0.0.1:${port}/mmir.html`, { waitUntil: 'domcontentloaded' });
      await page.locator('#p0-input').waitFor();
      await page.locator('#p0-input').fill('Si noe kort.');
      await page.locator('#p0-send').click();
      await page.waitForFunction(() => document.body.innerText.includes('Backend answered.')
        || document.body.innerText.includes('Gateway answered.')
        || document.body.innerText.includes('backend chat proxy is unavailable'), null, { timeout: 15000 }).catch(() => {});
      const shown = await page.evaluate(() => document.body.innerText);
      await page.close();
      await context.close(); context = null;
      return { chatCalls, knowledgeCalls, shown };
    }

    // Flag off: unchanged. The send goes to the gateway, and nothing reaches the backend.
    const off = await chatOnce({ flagOn: false });
    const offChat = off.chatCalls.filter((call) => call.origin === 'https://api.mmir.ai');
    if (offChat.length !== 1) fail(`With the flag off the chat send must go to api.mmir.ai exactly once (${JSON.stringify(off.chatCalls)}).`);
    if (off.chatCalls.some((call) => call.origin === 'https://backend.mmir.ai')) fail('With the flag off nothing may be sent to the backend.');
    if (!off.shown.includes('Gateway answered.')) fail('With the flag off the gateway answer must be shown.');

    // Flag on: the same send goes to the backend, carrying the identity bearer.
    const on = await chatOnce({ flagOn: true });
    const onChat = on.chatCalls.filter((call) => call.origin === 'https://backend.mmir.ai');
    if (onChat.length !== 1) fail(`With the flag on the chat send must go to backend.mmir.ai exactly once (${JSON.stringify(on.chatCalls)}).`);
    if (on.chatCalls.some((call) => call.origin === 'https://api.mmir.ai')) fail('With the flag on the chat send must not also reach api.mmir.ai.');
    if (!/^Bearer /.test(onChat[0]?.authorization || '')) fail('The backend chat send must carry the identity bearer the other panels use.');
    if (!on.shown.includes('Backend answered.')) fail('With the flag on the backend answer must be shown.');
    if (on.knowledgeCalls.length !== 1) fail(`With the flag on the backend knowledge search must run exactly once (${JSON.stringify(on.knowledgeCalls)}).`);
    const injectedContext = onChat[0]?.body?.messages?.filter((message) => message?.role === 'system').map((message) => String(message.content || '')).join('\n') || '';
    if (!injectedContext.includes('offline-proof.txt') || !injectedContext.includes('ORBITAL-CEDAR-447 synthetic retrieval proof')) {
      fail('The backend chat payload must contain the retrieved protected-document source and snippet.');
    }

    // Only exactly true turns it on. A truthy string is a configuration mistake, and
    // treating it as consent would move the chat route by accident.
    for (const flagValue of ['true', 1]) {
      const loose = await chatOnce({ flagOn: false, flagValue });
      if (loose.chatCalls.some((call) => call.origin === 'https://backend.mmir.ai')) {
        fail(`A ${typeof flagValue} flag (${JSON.stringify(flagValue)}) must not move the chat send to the backend.`);
      }
      if (!loose.chatCalls.some((call) => call.origin === 'https://api.mmir.ai')) {
        fail(`A ${typeof flagValue} flag (${JSON.stringify(flagValue)}) must leave the send on api.mmir.ai.`);
      }
    }

    // Flag on and the backend failing: the API's own sentence, and no retry elsewhere.
    const failed = await chatOnce({ flagOn: true, backendStatus: 503 });
    if (failed.chatCalls.some((call) => call.origin === 'https://api.mmir.ai')) {
      fail(`A failing backend must not fall back to api.mmir.ai (${JSON.stringify(failed.chatCalls)}).`);
    }
    if (!failed.shown.includes('The backend chat proxy is unavailable right now.')) {
      fail(`A failing backend must show the API's own error text. Shown: ${failed.shown.replace(/\s+/g, ' ').slice(0, 500)}`);
    }
    await browser.close(); browser = null; context = null;
  } finally {
    if (context) await context.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
    if (server.exitCode === null && !server.killed) try { server.kill('SIGTERM'); } catch { /* already gone */ }
  }
}

await browserProof();
if (failures.length) {
  console.error('P0 chat-via-backend smoke failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('P0 chat-via-backend smoke passed.');
