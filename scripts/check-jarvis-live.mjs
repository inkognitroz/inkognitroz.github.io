/** Opt-in transport smoke against MMIR's existing gateway, NOT a voice certification.
 * No credentials, environment keys, user history or provider SDKs are read.
 * Default: two public GET requests. --chat: one synthetic no-paid request too.
 * Run manually: node scripts/check-jarvis-live.mjs [--chat]
 */
const origin = 'https://api.mmir.ai';
const report = { at: new Date().toISOString(), scope: 'live-http-only-no-microphone', checks: [], chatRequested: process.argv.includes('--chat') };
async function request(path, body) {
 const started = performance.now();
 try {
  const response = await fetch(origin + path, {
   method: body ? 'POST' : 'GET', redirect: 'error', signal: AbortSignal.timeout(25000),
   headers: body ? { 'content-type': 'application/json', accept: 'application/json' } : { accept: 'application/json' },
   ...(body ? { body: JSON.stringify(body) } : {})
  });
  // Public /v1/models is currently larger than 1 MB. Bound the actual stream,
  // not just JSON parsing after an unbounded read, and disclose size failures.
  const reader = response.body?.getReader(), chunks = []; let bytes = 0;
  if (reader) while (true) {
   const part = await reader.read(); if (part.done) break;
   bytes += part.value.byteLength;
   if (bytes > 4000000) { await reader.cancel(); return { ok: false, status: response.status, elapsedMs: Math.round(performance.now() - started), bytes, error: 'body_too_large', data: null }; }
   chunks.push(part.value);
  }
  let data = null, error = null;
  // Never log a raw upstream body: it can contain identifiers or debug details.
  try { data = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch (_) { error = 'invalid_json'; }
  return { ok: response.ok && !error, status: response.status, elapsedMs: Math.round(performance.now() - started), bytes, error, data };
 } catch (error) {
  const code = String(error.cause?.code || error.name || 'network_error');
  return { ok: false, status: null, elapsedMs: Math.round(performance.now() - started), error: /^[A-Za-z0-9_-]{1,50}$/.test(code) ? code : 'network_error', data: null };
 }
}
for (const path of ['/status', '/v1/models']) {
 const result = await request(path);
 const shapeOk = path === '/v1/models' ? Array.isArray(result.data?.data) : result.data !== null && typeof result.data === 'object' && !Array.isArray(result.data);
 report.checks.push({ path, ok: result.ok && shapeOk, status: result.status, elapsedMs: result.elapsedMs, bytes: result.bytes ?? null, error: result.error || (!shapeOk ? 'unexpected_shape' : null) });
}
if (report.chatRequested) {
 const result = await request('/v1/chat/completions', {
  model: 'mmir-supergenius', stream: false, max_tokens: 64,
  messages: [{ role: 'user', content: 'Svar kort med teksten: MMIR JARVIS forbindelsestest.' }],
  policy: { paid_routes_allowed: false }
 });
 const text = result.data?.choices?.[0]?.message?.content;
 report.checks.push({ path: '/v1/chat/completions', status: result.status, elapsedMs: Math.round(result.elapsedMs), error: result.error || null,
  ok: result.ok && typeof text === 'string' && text.length > 0,
  answerReceived: typeof text === 'string' && text.length > 0,
  identityVerified: false, identityNote: 'This transport probe does not verify signed MMIR writer receipts.',
  paymentPolicy: 'paid_routes_allowed=false; no provider credentials supplied'
 });
}
report.transportPassed = report.checks.every(check => check.ok);
report.voiceCertified = false;
console.log(JSON.stringify(report, null, 2));
if (!report.transportPassed) process.exitCode = 1;
