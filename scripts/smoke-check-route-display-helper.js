import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';

const root = process.cwd();
const source = readFileSync(join(root, 'public', 'apps', 'mimir-chat-portal', 'route-display.js'), 'utf8');
const routeDisplayConsumers = [
  'active-node-strip.js',
  'route-chips.js',
  'composer-model-picker.js',
  'composer-quick-actions.js',
  'first-impression.js'
];

class CustomEvent {
  constructor(type, init = {}) {
    this.type = type;
    this.detail = init.detail || {};
  }
}

const windowTarget = {
  dispatchEvent(event) {
    this.lastEvent = event;
  },
  MimirApiClient: {
    isLocal(profile) {
      return String(profile?.url || '').includes('127.0.0.1');
    }
  }
};

const context = vm.createContext({
  window: windowTarget,
  CustomEvent
});

vm.runInContext(source, context, { filename: 'route-display.js' });

const helper = windowTarget.MimirRouteDisplay;
assert.equal(typeof helper.displayLabel, 'function', 'route display helper must expose displayLabel');
assert.equal(helper.DEFAULT_LABEL, 'Supergenious', 'canonical public model label must stay stable');
assert.equal(helper.displayLabel('MMIR Supergenius Free'), 'Supergenious', 'legacy Supergenius names must normalize');
assert.equal(helper.displayLabel('MMIR Browser Guide'), 'Supergenious', 'bootstrap guide must normalize to public model label');
assert.equal(helper.modelLabel({ display_name: 'MMIR Supergenious Free' }), 'Supergenious', 'object model labels must normalize');
assert.equal(helper.routeName({ id: 'mmir-api-bootstrap' }), 'api.mmir.ai free route', 'hosted bootstrap route name must remain explicit');
assert.equal(helper.routeName({ provider: 'local-node', name: 'MMIR Local Node' }), 'MMIR Local Node', 'local route label must stay human-readable');
assert.equal(helper.trustLabel({ provider: 'local-node', url: 'http://127.0.0.1:3000' }), 'local/private', 'local node trust must stay private');
assert.equal(helper.trustLabel({ provider: 'mmir', cost: 'free' }), 'free/protected', 'free hosted route trust must stay protected');
assert.equal(windowTarget.lastEvent?.type, 'mimir-route-display-ready', 'helper must emit readiness evidence');

for (const file of routeDisplayConsumers) {
  const consumerSource = readFileSync(join(root, 'public', 'apps', 'mimir-chat-portal', file), 'utf8');
  assert.match(consumerSource, /MimirRouteDisplay/, `${file} must use the shared route display helper`);
}

console.log('route display helper smoke: ok');
