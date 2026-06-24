import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const worker = readFileSync(join(root, 'cloudflare', 'staging-web.worker.js'), 'utf8');
const config = readFileSync(join(root, 'cloudflare', 'wrangler.staging.jsonc'), 'utf8');
const productionPreviewConfig = readFileSync(join(root, 'cloudflare', 'wrangler.production-preview.jsonc'), 'utf8');

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
requireText(productionPreviewConfig, '"name": "mmir-web-production-preview"', 'production preview Worker must have a separate non-prod name');
requireText(productionPreviewConfig, '"workers_dev": true', 'production preview Worker must publish only to workers.dev by default');
requireText(productionPreviewConfig, '"directory": "../public"', 'production preview Worker must serve the public static asset directory');
requireText(productionPreviewConfig, '"run_worker_first": true', 'production preview Worker must run before asset routing');
requireText(productionPreviewConfig, '"enabled": false', 'production preview Worker must avoid observability noise by default');

if (productionPreviewConfig.includes('"routes"') || productionPreviewConfig.includes('"custom_domain"')) {
  console.error('FAIL production preview Worker must not bind a custom domain or route');
  process.exitCode = 1;
} else {
  console.log('PASS production preview Worker must not bind a custom domain or route');
}

if (process.exitCode) {
  process.exit(process.exitCode);
}
