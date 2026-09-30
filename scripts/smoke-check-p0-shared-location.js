import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// Execute the shipped shell functions, not a reimplementation. All browser I/O
// is replaced: no real geolocation, telemetry, map service or model requests.
const shell = readFileSync(new URL('../public/apps/mimir-chat-portal/p0-chat-shell.js', import.meta.url), 'utf8');
const start = shell.indexOf('  function readSharedLocation(){');
const end = shell.indexOf('  function readFileAsDataUrl(file){', start);
assert(start >= 0 && end > start, 'Shared-location runtime functions must exist');
const source = shell.slice(start, end);
const coordinates = { latitude: 61.1234567, longitude: 11.2345678, accuracy: 120 };

function harness(code = source, { supported = true, lookup = 'ok' } = {}) {
  const stored = new Map(), events = [], statuses = [], replies = [], requests = [];
  let success, denied, options, noticeAtPermission;
  const api = vm.runInNewContext(code + '\n({requestSharedLocation, sharedLocationContextForPrompt, readSharedLocation})', {
    SHARED_LOCATION_KEY: 'fixture-location',
    readJson: (key, fallback) => stored.has(key) ? JSON.parse(stored.get(key)) : fallback,
    localStorage: { setItem: (key, value) => stored.set(key, value) },
    navigator: supported ? { geolocation: { getCurrentPosition(ok, no, opts) {
      success = ok; denied = no; options = opts; noticeAtPermission = statuses.join(' ');
    } } } : {},
    fetch: async (url, opts) => {
      requests.push({ url, opts });
      if (lookup === 'reject') throw new Error('Synthetic lookup failure');
      return { ok: lookup !== 'http-error', json: async () => ({ display_name: 'Teststed, Testkommune, Testland' }) };
    },
    closeMenus: () => {}, status: (text) => statuses.push(text), routeStatus: () => {},
    captureInteraction: (name, metadata) => events.push({ name, metadata }),
    append: (...args) => replies.push(args),
    document: { getElementById: () => ({ focus: () => {} }) }
  });
  return {
    api, stored, events, statuses, replies, requests,
    allow: (coords = coordinates) => success({ coords }), deny: () => denied(),
    get noticeAtPermission() { return noticeAtPermission; }, get options() { return options; }
  };
}

async function accepted(code = source, lookup = 'ok') {
  const h = harness(code, { lookup });
  assert.equal(h.api.requestSharedLocation(), true);
  assert.equal(h.requests.length, 0, 'No map lookup before browser permission');
  assert.equal(h.stored.size, 0, 'No location stored before permission');
  assert.match(h.noticeAtPermission, /koordinatene.*OpenStreetMap.*Nominatim/, 'Explain coordinates and recipient before browser permission');
  assert(!('stored_local_only' in h.events[0].metadata), 'Start event must not claim local-only sharing');
  await h.allow();
  assert.equal(h.requests.length, 1, 'Retain one useful map lookup, no retry');
  const url = new URL(h.requests[0].url);
  assert.equal(url.origin, 'https://nominatim.openstreetmap.org');
  assert.equal(url.pathname, '/reverse');
  assert.equal(url.searchParams.get('lat'), String(coordinates.latitude));
  assert.equal(url.searchParams.get('lon'), String(coordinates.longitude));
  assert.equal(url.searchParams.get('zoom'), '10');
  assert.equal(h.options.enableHighAccuracy, false);
  assert.equal(h.options.timeout, 10000);
  assert.equal(h.options.maximumAge, 300000);
  assert.equal(h.api.readSharedLocation().lat, coordinates.latitude);
  assert.equal(h.api.readSharedLocation().label, lookup === 'ok' ? 'Teststed,  Testkommune' : 'delt posisjon');
  const metadata = h.events.find(event => event.name === 'location_shared').metadata;
  assert.equal(metadata.stored_in_browser, true);
  assert.equal(metadata.reverse_geocoding_service, 'openstreetmap_nominatim');
  assert(!('stored_local_only' in metadata), 'Success event must not claim local-only sharing');
  assert(!('lat' in metadata) && !('lon' in metadata), 'Do not add coordinates to telemetry');
  const reply = h.replies[0][1];
  assert.match(reply, /lagret i denne nettleseren/);
  assert.match(reply, /koordinatene.*OpenStreetMap.*Nominatim/);
  assert.match(reply, /sendes med relevante spørsmål til modellen/);
  assert.match(h.api.sharedLocationContextForPrompt('weather near me'), /origin_lat:61\.12346; origin_lon:11\.23457;/);
  assert.equal(h.api.sharedLocationContextForPrompt('Skriv et dikt om katter'), '', 'Unrelated question must not acquire location');
}

await accepted();
await accepted(source, 'http-error');
await accepted(source, 'reject');
const denied = harness();
denied.api.requestSharedLocation();
denied.deny();
assert.equal(denied.requests.length, 0);
assert.equal(denied.stored.size, 0);
assert.equal(denied.replies.length, 0);
assert.equal(denied.events.at(-1).name, 'location_share_denied');
const invalid = harness();
invalid.api.requestSharedLocation();
await invalid.allow({ latitude: NaN, longitude: 11 });
assert.equal(invalid.requests.length, 0);
assert.equal(invalid.stored.size, 0);
const unsupported = harness(source, { supported: false });
assert.equal(unsupported.api.requestSharedLocation(), false);
assert.equal(unsupported.requests.length, 0);
assert.equal(unsupported.events.length, 0);
const empty = harness();
assert.equal(empty.api.sharedLocationContextForPrompt('weather near me'), '');

// Prove these checks reject four concrete broken variants of this exact runtime.
const mutations = [
  ['local-only metadata', 'stored_in_browser:true,', 'stored_local_only:true,'],
  ['hidden recipient', 'koordinatene til OpenStreetMap (Nominatim)', 'data til karttjenesten'],
  ['removed useful lookup', 'await reverseGeocodeSharedLocation(lat,lon)', "''"],
  ['location on unrelated prompts', '!location||!promptNeedsSharedLocation(prompt)', '!location']
];
for (const [name, before, after] of mutations) {
  assert(source.includes(before), 'Mutation anchor missing: ' + name);
  const mutant = source.replace(before, after);
  await assert.rejects(() => accepted(mutant), { name: 'AssertionError' }, 'Must kill mutant: ' + name);
}
console.log('Shared location: 7 mocked paths PASS; 4 runtime mutants killed; 0 real external calls.');
