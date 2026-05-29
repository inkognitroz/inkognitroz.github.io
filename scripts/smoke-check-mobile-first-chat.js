import { existsSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

// Smoke check: mobile first-chat preconditions (issue #179, #182)
// Validates static DOM and CSS conditions for the mobile first-click chat UX.
// No browser or Playwright required.

const root = process.cwd();
const publicDir = resolve(root, 'public');
const mmirPath = join(publicDir, 'mmir.html');
const workspaceCssPath = join(publicDir, 'apps', 'mimir-chat-portal', 'chat-workspace.css');
const runtimeCssPath = join(publicDir, 'apps', 'mimir-chat-portal', 'chat-runtime.css');
const activeNodesPath = join(publicDir, 'active-chat-nodes.json');

const failures = [];

function fail(message) {
  failures.push(message);
}

function read(file) {
  if (!existsSync(file)) {
    fail(`Missing required file: ${relative(root, file)}`);
    return '';
  }
  return readFileSync(file, 'utf8');
}

function requireText(file, needle, message) {
  if (!read(file).includes(needle)) fail(message);
}

function forbidText(file, needle, message) {
  if (read(file).includes(needle)) fail(message);
}

// 1. Chat composer must be in the DOM
requireText(mmirPath, 'id="mimir-prompt"', 'mmir.html must include the chat prompt textarea (#mimir-prompt).');
requireText(mmirPath, 'id="primary-chat-link"', 'mmir.html must include the send button (#primary-chat-link).');
requireText(mmirPath, 'class="mimir-composer"', 'mmir.html must include the composer wrapper (.mimir-composer).');

// 2. Send button must be a submit button (enabled by default)
requireText(mmirPath, 'type="submit"', 'Send button must be type=submit so it is enabled without JavaScript.');

// 3. Viewport meta must declare mobile-first width
requireText(mmirPath, 'width=device-width', 'mmir.html must have a mobile-first viewport meta tag.');

// 4. No SaaS Fabric copy on the product page
forbidText(mmirPath, 'SaaS Fabric', 'mmir.html must not contain SaaS Fabric branding.');

// 5. No horizontal overflow on mobile: max-width or overflow-x:hidden must be present in mobile CSS
const workspaceCss = read(workspaceCssPath);
if (!workspaceCss.includes('max-width:') && !workspaceCss.includes('overflow-x:hidden') && !workspaceCss.includes('min(')) {
  fail('chat-workspace.css must constrain max-width or horizontal overflow for mobile layouts.');
}

// 6. Mobile breakpoint must be covered in workspace CSS (<=899px or similar)
if (!workspaceCss.includes('max-width:899px') && !workspaceCss.includes('max-width: 899px')) {
  fail('chat-workspace.css must include a mobile breakpoint at max-width:899px.');
}

// 7. Composer must be sticky or at bottom of mobile viewport
if (!workspaceCss.includes('sticky') && !workspaceCss.includes('safe-area-inset-bottom')) {
  fail('chat-workspace.css must keep the composer sticky and respect safe-area-inset-bottom on mobile.');
}

// 8. Active nodes manifest must include a free always-available route
const activeNodes = JSON.parse(read(activeNodesPath) || '{}');
const nodes = Array.isArray(activeNodes.nodes) ? activeNodes.nodes : [];
const freeNode = nodes.find((n) => n && (n.type === 'free' || n.type === 'browser') && n.status !== 'offline');
if (!freeNode) {
  fail('active-chat-nodes.json must include at least one free or browser node that is not offline.');
}

// 9. No passive localhost fetch in static HTML before user action
// The quiet-first-paint guard must be present to prevent passive local probes
requireText(
  mmirPath,
  '__MimirQuietFirstPaintFetchGuard',
  'mmir.html must include the quiet-first-paint fetch guard to prevent passive localhost probes before user action.'
);

// 10. Local connector section must be present for setup (not required before first chat)
requireText(mmirPath, 'id="local-connector"', 'mmir.html must include the local connector section for node setup.');

if (failures.length) {
  console.error('Mobile first-chat smoke check FAILED:');
  failures.forEach((f) => console.error('  - ' + f));
  process.exit(1);
}

console.log('Mobile first-chat smoke check passed.');
