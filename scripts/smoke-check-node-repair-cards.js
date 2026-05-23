import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = process.cwd();
const publicDir = resolve(root, 'public');
const dashboardPath = join(publicDir, 'apps', 'mimir-chat-portal', 'node-dashboard.js');
const cssPath = join(publicDir, 'apps', 'mimir-chat-portal', 'node-dashboard.css');
const coveragePath = join(publicDir, 'ui-action-coverage.json');
const source = readFileSync(dashboardPath, 'utf8');
const css = readFileSync(cssPath, 'utf8');
const coverage = readFileSync(coveragePath, 'utf8');

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function requireSource(needle, message) {
  if (!source.includes(needle)) fail(message);
}

const repairFixtures = [
  {
    id: 'offline-connector',
    check: "first.id==='connector'",
    title: 'Install connector for ',
    target: './downloads/mmir-local-connector-install.html'
  },
  {
    id: 'pairing-required',
    check: "first.id==='pairing'",
    title: 'Pair this browser',
    target: '#node-dashboard'
  },
  {
    id: 'offline-ollama',
    check: "first.id==='ollama'",
    title: 'Start Ollama on ',
    target: './downloads/mmir-local-connector-install.html'
  },
  {
    id: 'failed-model-pull',
    check: "first.id==='model-pull'||first.id==='model_pull'",
    title: 'Repair model install',
    target: '#model-library'
  },
  {
    id: 'no-model',
    check: "first.id==='model'",
    title: 'Install ',
    target: '#model-library'
  }
];

const deviceFixtures = [
  { id: 'windows', label: 'Windows', installer: './downloads/mmir-local-connector-windows.cmd', model: 'llama3.2:1b' },
  { id: 'macos', label: 'macOS', installer: './downloads/mmir-local-connector-mac.command', model: 'llama3.2:1b' },
  { id: 'linux-vm', label: 'Linux / VM', installer: './downloads/mmir-local-connector-linux.sh', model: 'qwen3:0.6b' },
  { id: 'raspberry-pi', label: 'Raspberry Pi / Linux ARM', installer: './downloads/mmir-local-connector-install.html', model: 'qwen3:0.6b' }
];

for (const fixture of repairFixtures) {
  requireSource(fixture.check, `Repair fixture ${fixture.id} is not mapped from doctor state.`);
  requireSource(fixture.title, `Repair fixture ${fixture.id} is missing title fragment.`);
  requireSource(fixture.target, `Repair fixture ${fixture.id} is missing target ${fixture.target}.`);
}

for (const fixture of deviceFixtures) {
  requireSource(fixture.label, `Device fixture ${fixture.id} is missing label ${fixture.label}.`);
  requireSource(fixture.installer, `Device fixture ${fixture.id} is missing installer ${fixture.installer}.`);
  requireSource(fixture.model, `Device fixture ${fixture.id} is missing starter model ${fixture.model}.`);
}

if (!source.includes('guidedDeviceRepair') || !source.includes('renderDeviceRepair')) {
  fail('Node dashboard must keep guidedDeviceRepair and renderDeviceRepair as the repair-card contract.');
}
if (!source.includes('data-device-repair-action') || !source.includes('device-repair-action')) {
  fail('Guided repair cards must expose action attributes and record selected paths.');
}
if (!source.includes('MimirActivationTelemetry') || !source.includes('Repair card selected: ')) {
  fail('Guided repair-card choices must be recorded in activation telemetry.');
}
if (!css.includes('.node-repair-card')) {
  fail('Guided repair card must have visible CSS styling.');
}
if (!coverage.includes('node-repair-card')) {
  fail('UI action coverage must include the guided repair card selector.');
}

if (!process.exitCode) {
  console.log('Node repair card fixture smoke check passed.');
}
