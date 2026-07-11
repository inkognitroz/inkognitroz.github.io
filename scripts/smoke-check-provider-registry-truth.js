import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(new URL('..', import.meta.url).pathname);
const registryPath = resolve(root, 'public', 'provider-registry.json');
const registry = JSON.parse(readFileSync(registryPath, 'utf8'));
const providers = Array.isArray(registry.providers) ? registry.providers : [];
const errors = [];

function failWhen(condition, message) {
  if (condition) errors.push(message);
}

failWhen(Number(registry.version) < 3, 'Provider registry truth contract must be version 3 or newer.');
failWhen(!providers.length, 'Provider registry must contain public-safe product surfaces.');

const ids = providers.map((provider) => String(provider?.id || ''));
failWhen(ids.some((id) => !id), 'Every provider registry row must have an id.');
failWhen(new Set(ids).size !== ids.length, 'Provider registry ids must be unique.');

const livePublic = providers.filter(
  (provider) => provider?.status === 'live' && provider?.public_surface === true
);
failWhen(livePublic.length !== 1, 'Exactly one public product surface must be marked live.');

const hosted = providers.find((provider) => provider?.id === 'hosted-free');
failWhen(!hosted, 'The live no-key hosted route must be represented as hosted-free.');
failWhen(hosted?.status !== 'live', 'hosted-free must be marked live.');
failWhen(hosted?.public_surface !== true, 'hosted-free must be a public product surface.');
failWhen(hosted?.no_key_required !== true, 'hosted-free must state that no user key is required.');
failWhen(hosted?.no_paid_routes_started !== true, 'hosted-free must preserve the no-paid-route truth flag.');
failWhen(!String(hosted?.route || '').includes('api.mmir.ai'), 'hosted-free must route through api.mmir.ai.');

const managed = providers.find((provider) => provider?.id === 'managed-provider');
failWhen(!managed, 'Owner-gated managed routing must remain represented.');
failWhen(managed?.status === 'live', 'Managed paid routing must not be marked live.');
failWhen(managed?.public_surface !== false, 'Managed paid routing must remain outside the public product surface.');
failWhen(managed?.owner_gate_required !== true, 'Managed paid routing must preserve the owner gate.');
failWhen(managed?.no_paid_routes_started !== true, 'Managed paid routing must preserve no_paid_routes_started truth.');

const serialized = JSON.stringify(registry).toLowerCase();
for (const forbidden of [
  'openrouter',
  'groq',
  'nvidia',
  'cerebras',
  'sambanova',
  'bedrock',
  'workers.dev',
  'api_key',
  'secret_key',
  'access_token'
]) {
  failWhen(serialized.includes(forbidden), `Public provider registry must not expose provider-specific or secret-bearing text: ${forbidden}`);
}

if (errors.length) {
  console.error('Provider registry truth smoke failed:');
  for (const error of errors) console.error('- ' + error);
  process.exit(1);
}

console.log('Provider registry truth smoke passed.');
