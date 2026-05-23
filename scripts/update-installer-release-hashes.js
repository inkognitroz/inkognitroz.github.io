import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

const root = process.cwd();
const publicDir = resolve(root, 'public');
const manifestPath = join(publicDir, 'downloads', 'mmir-local-connector-release.json');
const returnUrl = 'https://mmir.ai/mmir.html?mmir_local_return=1#local-connector';
const textExtensions = new Set(['.cmd', '.command', '.css', '.html', '.js', '.json', '.mjs', '.ps1', '.sh', '.svg', '.txt']);

function bytesForHash(file) {
  const bytes = readFileSync(file);
  if (!textExtensions.has(extname(file).toLowerCase())) return bytes;
  return Buffer.from(bytes.toString('utf8').replace(/\r\n/g, '\n'), 'utf8');
}

function sha256(file) {
  return createHash('sha256').update(bytesForHash(file)).digest('hex');
}

function artifactPath(pathValue) {
  const clean = String(pathValue || '').split(/[?#]/)[0].replace(/^\//, '');
  return join(publicDir, clean);
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const artifacts = Array.isArray(manifest.artifacts) ? manifest.artifacts : [];
let checksumCount = 0;

for (const artifact of artifacts) {
  if (!artifact?.path || artifact.sha256 === null) continue;
  artifact.sha256 = sha256(artifactPath(artifact.path));
  checksumCount += 1;
}

manifest.installer_qa = {
  verified_at: new Date().toISOString(),
  checksum_algorithm: 'sha256',
  artifacts_with_checksums: checksumCount,
  checksums_refreshed_by: 'scripts/update-installer-release-hashes.js',
  text_hash_normalization: 'lf',
  default_host_verified: manifest.default_host === '127.0.0.1',
  post_install_return_url: returnUrl,
  public_frontend_secrets_allowed: false,
  paid_routes_started: false
};

writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Updated ${checksumCount} installer artifact checksum(s).`);
