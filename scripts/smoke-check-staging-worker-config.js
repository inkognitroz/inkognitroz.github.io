import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const worker = readFileSync(join(root, 'cloudflare', 'staging-web.worker.js'), 'utf8');
const config = readFileSync(join(root, 'cloudflare', 'wrangler.staging.jsonc'), 'utf8');

function requireText(text, needle, message) {
  if (!text.includes(needle)) {
    console.error(`FAIL ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`PASS ${message}`);
  }
}

requireText(worker, "CHAT_SHELL_PATHS = new Set(['/', '/mmir', '/mmir.html'])", 'staging Worker must keep /, /mmir and /mmir.html as chat shell entrypoints');
requireText(worker, "env.ASSETS.fetch(withPath(request, '/mmir.html'))", 'staging Worker must serve /mmir.html without relying on asset redirects');
requireText(config, '"name": "mmir-web-staging"', 'staging Worker name must be separate from production');
requireText(config, '"pattern": "staging.mmir.ai"', 'staging Worker must bind only the staging custom domain');
requireText(config, '"directory": "../public"', 'staging Worker must serve the public static asset directory');
requireText(config, '"html_handling": "none"', 'staging Worker must disable asset HTML redirects');
requireText(config, '"run_worker_first": true', 'staging Worker must run before asset routing');

if (process.exitCode) {
  process.exit(process.exitCode);
}
