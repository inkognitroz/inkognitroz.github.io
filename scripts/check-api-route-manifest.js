import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';

const root = process.cwd();
const publicDir = resolve(root, 'public');
const appDir = join(publicDir, 'apps', 'mimir-chat-portal');
const manifestPath = join(publicDir, 'mmir-api-routes.json');
const routeLiteralPattern = /['"](\/[a-zA-Z0-9_./:{}-]+)['"]/g;

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function read(file) {
  if (!existsSync(file)) {
    fail(`Missing required file: ${relative(root, file)}`);
    return '';
  }
  return readFileSync(file, 'utf8');
}

function appFiles() {
  return readdirSync(appDir)
    .filter((name) => extname(name) === '.js')
    .map((name) => join(appDir, name));
}

function extractRoutes(file) {
  const source = read(file);
  return [...source.matchAll(routeLiteralPattern)]
    .map((match) => match[1])
    .filter((route) => /^\/[a-z]/.test(route));
}

const manifest = JSON.parse(read(manifestPath));
const routes = Array.isArray(manifest.routes) ? manifest.routes : [];
const byPath = new Map(routes.map((route) => [route.path, route]));
const allowedOwners = new Set(manifest.allowed_owners || []);
const allowedAuth = new Set(manifest.allowed_auth || []);
const allowedStatuses = new Set(manifest.allowed_statuses || []);

if (!manifest.version) fail('Route manifest must include version.');
if (!routes.length) fail('Route manifest must include routes.');

for (const route of routes) {
  if (!route.path || byPath.get(route.path) !== route) {
    fail(`Route manifest has missing or duplicate path: ${route.path || '<missing>'}`);
  }
  if (!allowedOwners.has(route.owner)) {
    fail(`Route ${route.path} has unsupported owner: ${route.owner}`);
  }
  if (!allowedAuth.has(route.auth)) {
    fail(`Route ${route.path} has unsupported auth boundary: ${route.auth}`);
  }
  if (!allowedStatuses.has(route.status)) {
    fail(`Route ${route.path} has unsupported status: ${route.status}`);
  }
  if (!route.purpose) {
    fail(`Route ${route.path} must include purpose.`);
  }
  if (route.path === '/chat' && route.legacy !== true) {
    fail('Legacy /chat route must be explicitly marked legacy.');
  }
  if (route.auth === 'protected-backend-auth' && route.owner !== 'managed-api') {
    fail(`Protected backend route ${route.path} must be owned by managed-api.`);
  }
}

const discovered = new Map();
for (const file of appFiles()) {
  for (const route of extractRoutes(file)) {
    if (!discovered.has(route)) discovered.set(route, new Set());
    discovered.get(route).add(relative(root, file));
  }
}

for (const [route, files] of discovered) {
  if (!byPath.has(route)) {
    fail(`Frontend route ${route} is missing from public/mmir-api-routes.json. Seen in ${[...files].join(', ')}`);
  }
}

for (const route of routes) {
  if (route.status === 'legacy' && route.path !== '/chat') {
    fail(`Only /chat may be legacy during the current migration, found ${route.path}.`);
  }
}

if (!process.exitCode) {
  console.log('MMIR API route manifest check passed.');
}
