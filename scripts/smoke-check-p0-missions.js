#!/usr/bin/env node
// Proves the missions panel against a stubbed backend: what it sends, what it shows,
// and that it decides nothing itself. The backend owns the state machine, so the
// refusal text the user reads must be the API's own sentence.
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';

const root = resolve(process.cwd());
const failures = [];
const fail = (message) => failures.push(message);

async function browserProof() {
  const port = 8801;
  const server = spawn(process.execPath, ['scripts/serve-public.mjs'], {
    cwd: root, env: { ...process.env, HOST: '127.0.0.1', PORT: String(port) }, stdio: ['ignore', 'pipe', 'pipe']
  });
  const startupLine = `Serving public at http://127.0.0.1:${port}/mmir.html`;
  let output = ''; let errorOutput = ''; let exited = null;
  server.stdout.on('data', (chunk) => { output = (output + chunk.toString()).slice(-4096); });
  server.stderr.on('data', (chunk) => { errorOutput = (errorOutput + chunk.toString()).slice(-4096); });
  server.once('exit', (code, signal) => { exited = { code, signal }; });
  let browser = null; let context = null;
  try {
    await new Promise((resolveReady, rejectReady) => {
      const timer = setTimeout(() => rejectReady(new Error(`missions fixture server timed out; stdout=${output}; stderr=${errorOutput}`)), 20000);
      const settle = () => { if (output.includes(startupLine)) { clearTimeout(timer); server.stdout.off('data', settle); resolveReady(); } };
      server.stdout.on('data', settle); settle();
    });
    browser = await chromium.launch({ headless: true });
    context = await browser.newContext({ serviceWorkers: 'block' });
    const page = await context.newPage();
    page.setDefaultTimeout(5000);

    const sent = [];
    let consent = true;
    let nextId = 0;
    const missions = new Map();
    // The stub is the state machine's owner here, exactly as the backend is in
    // production: the panel never decides what is allowed.
    const ALLOWED = { pause: ['running'], resume: ['paused'], complete: ['running'], cancel: ['running', 'paused'] };
    const envelopeFor = (mission, chainVerified = true) => ({
      object: 'mission',
      data: mission,
      chain: { verified: chainVerified, reason: chainVerified ? null : 'chain_broken' }
    });

    await page.route('**/*', async (route) => {
      const url = route.request().url();
      if (url.startsWith(`http://127.0.0.1:${port}/`)) return route.continue();
      if (!url.startsWith('https://backend.mmir.ai/')) return route.abort();
      const { pathname, search } = new URL(url);
      const method = route.request().method();
      sent.push(`${method} ${pathname}${search}`);
      const now = new Date().toISOString();
      if (pathname === '/health') {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
          status: 'online', service: 'mmir-orchestrator', layer: 'backend',
          capabilities: ['identity', 'memory', 'consent', 'proxy.chat_completions'], ordering_authority: 'bound'
        }) });
      }
      if (pathname === '/identity/session') {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
          object: 'mmir.identity_session', anonymous: true, token: 'synthetic-session-token',
          identity_id: 'usr_fixture', issued_at: now, expires_at: new Date(Date.now() + 86400000).toISOString()
        }) });
      }
      if (pathname === '/consent') {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ object: 'consent', memory: consent }) });
      }
      if (pathname === '/missions' && method === 'GET') {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
          data: [...missions.values()].map(({ id, title, state, transitions }) => ({ id, title, state, transition_count: transitions.length }))
        }) });
      }
      if (pathname === '/missions' && method === 'POST') {
        if (!consent) {
          return route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({
            error: { code: 'consent_required', message: 'This identity has not consented to storage. Nothing was written.' }
          }) });
        }
        const body = JSON.parse(route.request().postData() || '{}');
        const id = `mission-fixture-${++nextId}`;
        missions.set(id, { id, workspace_id: body.workspace_id, title: body.title, brief: body.brief || '', state: 'running', steps: ['Step one'], transitions: [{ sequence: 1, action: 'create', from: null, to: 'running', at: now }] });
        return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(envelopeFor(missions.get(id))) });
      }
      const item = /^\/missions\/([^/]+)$/.exec(pathname);
      if (item && method === 'GET') {
        const mission = missions.get(item[1]);
        if (!mission) return route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ error: { code: 'not_found', message: 'No such mission for this identity.' } }) });
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(envelopeFor(mission, mission.state !== 'cancelled')) });
      }
      const transition = /^\/missions\/([^/]+)\/transitions$/.exec(pathname);
      if (transition && method === 'POST') {
        const mission = missions.get(transition[1]);
        const action = JSON.parse(route.request().postData() || '{}').action;
        if (!ALLOWED[action]) {
          return route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ error: { code: 'invalid_request', message: `Field "action" must be one of ${Object.keys(ALLOWED).join(', ')}.` } }) });
        }
        if (!ALLOWED[action].includes(mission.state)) {
          return route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ error: { code: 'mission_transition_not_allowed', message: `This mission is ${mission.state} and cannot ${action}.` } }) });
        }
        const to = { pause: 'paused', resume: 'running', complete: 'completed', cancel: 'cancelled' }[action];
        mission.transitions.push({ sequence: mission.transitions.length + 1, action, from: mission.state, to, at: now });
        mission.state = to;
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(envelopeFor(mission)) });
      }
      return route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ error: { code: 'unexpected_fixture_route', message: `${method} ${pathname}` } }) });
    });

    await page.goto(`http://127.0.0.1:${port}/mmir.html`, { waitUntil: 'domcontentloaded' });
    await page.locator('#p0-sidebar-settings').waitFor();
    if (sent.length) fail(`Opening public P0 must not contact the missions backend before a user action (${sent.join(', ')}).`);

    await page.locator('#p0-sidebar-settings').click();
    await page.getByText('Oppdrag', { exact: true }).click();
    const dialog = page.locator('#mmir-p0-app dialog[aria-label="Missions"]');
    await dialog.waitFor({ state: 'visible' });
    await dialog.locator('[data-missions-status]').getByText('No missions for this session yet.').waitFor();

    await dialog.locator('[data-missions-title]').fill('Fixture mission');
    await dialog.getByRole('button', { name: 'Create mission', exact: true }).click();
    await dialog.locator('[data-missions-detail-title]').getByText('Fixture mission — running').waitFor();
    const created = sent.filter((entry) => entry === 'POST /missions');
    if (created.length !== 1) fail(`Creating a mission must send exactly one POST /missions (${sent.join(', ')}).`);
    if (!sent.some((entry) => entry.startsWith('GET /missions?workspace_id='))) fail('The list must be read with the workspace id from the shell.');
    await dialog.locator('[data-missions-chain]').getByText('Receipt chain: verified').waitFor();

    // Buttons come from the envelope, so an action the backend adds later needs no
    // frontend change. The fallback list is what the API validates anyway.
    for (const action of ['pause', 'resume', 'complete', 'cancel']) {
      if (!(await dialog.locator(`[data-mission-action="${action}"]`).count())) fail(`The panel must offer the ${action} transition.`);
    }

    await dialog.locator('[data-mission-action="pause"]').click();
    await dialog.locator('[data-missions-detail-title]').getByText('Fixture mission — paused').waitFor();

    // The refusal the user reads is the API's sentence, not one written here.
    await dialog.locator('[data-mission-action="complete"]').click();
    await dialog.locator('[data-missions-detail-status]').getByText('This mission is paused and cannot complete.').waitFor();
    if ([...missions.values()][0].state !== 'paused') fail('A refused transition must leave the mission where it was.');

    consent = false;
    await dialog.getByRole('button', { name: 'Refresh', exact: true }).click();
    await dialog.locator('[data-missions-state]').getByText(/creating or moving one needs storage on/).waitFor();
    const beforeDisabled = sent.length;
    if (!(await dialog.getByRole('button', { name: 'Create mission', exact: true }).isDisabled())) fail('Creating must be disabled while storage is off.');
    if (!(await dialog.locator('[data-mission-action="resume"]').isDisabled())) fail('Transitions must be disabled while storage is off.');
    if (sent.length !== beforeDisabled) fail('Disabled controls must not send anything.');

    if (sent.some((entry) => entry.startsWith('POST /v1/chat/completions'))) fail('The missions panel must not start a model call.');
    await browser.close(); browser = null; context = null;
  } finally {
    if (context) await context.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
    if (server.exitCode === null && !server.killed) try { server.kill('SIGTERM'); } catch { /* already gone */ }
    if (exited && exited.code) failures.push(`missions fixture server exited: ${JSON.stringify(exited)}; stderr=${errorOutput}`);
  }
}

await browserProof();
if (failures.length) {
  console.error('P0 missions smoke failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('P0 missions smoke passed.');
