const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');

function installedVersion(packagePath) {
  return require(path.join(root, 'node_modules', packagePath, 'package.json')).version;
}

assert.equal(installedVersion('@xmldom/xmldom'), '0.9.12');
assert.equal(installedVersion('brace-expansion'), '5.0.12');
assert.equal(installedVersion('@capacitor/assets/node_modules/brace-expansion'), '2.1.7');
assert.equal(installedVersion('replace/node_modules/brace-expansion'), '1.1.21');
assert.equal(installedVersion('replace/node_modules/minimatch'), '3.1.4');

const plist = require(path.join(root, 'node_modules/plist'));
const plistXml = plist.build({
  CFBundleIdentifier: 'ai.mmir.compatibility-test',
  CFBundleDisplayName: 'MMIR compatibility test'
});
const plistValue = plist.parse(plistXml);
assert.equal(plistValue.CFBundleIdentifier, 'ai.mmir.compatibility-test');
assert.equal(plistValue.CFBundleDisplayName, 'MMIR compatibility test');

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'mmir-store-wrapper-deps-'));
try {
  const matchingFile = path.join(tempRoot, 'nested', 'match.js');
  const nonMatchingFile = path.join(tempRoot, 'nested', 'skip.txt');
  fs.mkdirSync(path.dirname(matchingFile), { recursive: true });
  fs.writeFileSync(matchingFile, 'foo foo\n');
  fs.writeFileSync(nonMatchingFile, 'foo foo\n');

  const replaceBin = path.join(root, 'node_modules/replace/bin/replace.js');
  const result = spawnSync(process.execPath, [
    replaceBin, 'foo', 'bar', tempRoot, '--recursive', '--include=*.js', '--silent'
  ], { encoding: 'utf8', timeout: 10000 });
  assert.equal(result.status, 0, result.error?.message || result.stderr || result.stdout);
  assert.equal(fs.readFileSync(matchingFile, 'utf8'), 'bar bar\n');
  assert.equal(fs.readFileSync(nonMatchingFile, 'utf8'), 'foo foo\n');
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}

console.log('store-wrapper dependency compatibility passed: plist parse/build and scoped replace glob hit/non-hit.');
