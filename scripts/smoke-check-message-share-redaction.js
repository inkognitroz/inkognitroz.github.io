import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import vm from 'node:vm';

const root = resolve(process.cwd());
const source = readFileSync(join(root, 'public/apps/mimir-chat-portal/message-actions.js'), 'utf8');
const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

function fail(message) {
  console.error(message);
  process.exit(1);
}

const context = {
  window: {},
  localStorage: { getItem: () => null, setItem: () => {} },
  document: {},
  navigator: { clipboard: { writeText: async () => {} } },
  CustomEvent: class CustomEvent {
    constructor(name, init = {}) {
      this.type = name;
      this.detail = init.detail;
    }
  }
};
context.window.dispatchEvent = () => {};

vm.runInNewContext(source, context, { filename: 'message-actions.js' });

const redact = context.window.MimirMessageActions?.redactShareText;
if (typeof redact !== 'function') fail('MimirMessageActions.redactShareText must stay exported for safe-share checks.');

const sample = [
  'Email user@example.com',
  'Authorization: Bearer abcdefghijklmnop.1234567890+/=',
  'token=super-secret-demo-token',
  'api_key=1234567890abcdef',
  'sk-demo1234567890abcdef',
  'pk-demo1234567890abcdef',
  'or-demo1234567890abcdef',
  'cf-demo1234567890abcdef',
  'ghp_1234567890abcdefghijklmnop',
  'github_pat_1234567890abcdefghijklmnop',
  'xoxb-1234567890abcdefghijklmnop',
  'AKIA1234567890ABCDEF',
  '-----BEGIN OPENSSH PRIVATE KEY-----\nabc123\n-----END OPENSSH PRIVATE KEY-----'
].join('\n');

const redacted = redact(sample);

[
  'user@example.com',
  'Bearer abcdefghijklmnop.1234567890+/=',
  'super-secret-demo-token',
  '1234567890abcdef',
  'sk-demo1234567890abcdef',
  'pk-demo1234567890abcdef',
  'or-demo1234567890abcdef',
  'cf-demo1234567890abcdef',
  'ghp_1234567890abcdefghijklmnop',
  'github_pat_1234567890abcdefghijklmnop',
  'xoxb-1234567890abcdefghijklmnop',
  'AKIA1234567890ABCDEF',
  'BEGIN OPENSSH PRIVATE KEY'
].forEach((needle) => {
  if (redacted.includes(needle)) fail(`Safe-share redaction leaked ${needle}`);
});

[
  '[redacted email]',
  'Bearer [redacted]',
  '[redacted token]',
  '[redacted private key]',
  'token: [redacted]',
  'api_key: [redacted]'
].forEach((needle) => {
  if (!redacted.includes(needle)) fail(`Safe-share redaction must include ${needle}`);
});

if (!String(packageJson.scripts?.check || '').includes('smoke-check-message-share-redaction.js')) {
  fail('npm run check must include smoke-check-message-share-redaction.js.');
}

console.log('Message share redaction smoke passed.');
