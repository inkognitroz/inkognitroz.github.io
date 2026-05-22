import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, extname, join, normalize, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const publicDir = resolve(root, 'public');
const indexPath = join(publicDir, 'index.html');

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(dir, entry.name);
    return entry.isDirectory() ? walk(fullPath) : [fullPath];
  });
}

function localAssetPath(fromFile, asset) {
  if (!asset || asset.startsWith('http:') || asset.startsWith('https:') || asset.startsWith('#')) {
    return null;
  }

  const cleanAsset = asset.split(/[?#]/)[0];
  if (!cleanAsset || cleanAsset.startsWith('//')) {
    return null;
  }

  const base = cleanAsset.startsWith('/') ? publicDir : dirname(fromFile);
  return normalize(resolve(base, cleanAsset.replace(/^\//, '')));
}

if (!existsSync(indexPath)) {
  fail('Missing public/index.html');
} else {
  const html = readFileSync(indexPath, 'utf8');
  const assetRefs = Array.from(html.matchAll(/\b(?:src|href)=["']([^"']+)["']/g)).map((match) => match[1]);

  for (const ref of assetRefs) {
    const assetPath = localAssetPath(indexPath, ref);
    if (!assetPath || extname(assetPath) === '.html') {
      continue;
    }

    if (!assetPath.startsWith(publicDir) || !existsSync(assetPath)) {
      fail(`Missing referenced asset from index.html: ${ref}`);
    }
  }
}

for (const file of walk(publicDir)) {
  const rel = relative(root, file);
  const ext = extname(file);

  if (ext === '.json') {
    try {
      JSON.parse(readFileSync(file, 'utf8'));
    } catch (error) {
      fail(`Invalid JSON: ${rel}`);
    }
  }

  if (ext === '.js') {
    const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
    if (result.status !== 0) {
      fail(`Invalid JavaScript syntax: ${rel}\n${result.stderr || result.stdout}`);
    }
  }
}

if (!process.exitCode) {
  console.log('Static Pages smoke check passed.');
}
