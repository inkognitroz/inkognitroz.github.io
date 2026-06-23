import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';

const root = process.cwd();
const source = readFileSync(
  join(root, 'public', 'apps', 'mimir-chat-portal', 'composer-stop-handoff.js'),
  'utf8'
);

class FakeEvent {
  constructor(type, options = {}) {
    this.type = type;
    this.defaultPrevented = false;
    this.propagationStopped = false;
    this.target = options.target || null;
  }
  preventDefault() {
    this.defaultPrevented = true;
  }
  stopImmediatePropagation() {
    this.propagationStopped = true;
  }
}

class FakeClassList {
  constructor() {
    this.values = new Set();
  }
  toggle(name, force) {
    if (force) this.values.add(name);
    else this.values.delete(name);
  }
  contains(name) {
    return this.values.has(name);
  }
}

class FakeElement {
  constructor(document, id) {
    this.document = document;
    this.id = id;
    this.dataset = {};
    this.attributes = new Map();
    this.listeners = {};
    this.classList = new FakeClassList();
    this.disabled = false;
    this.textContent = '';
    this.clickCount = 0;
    document.register(this);
  }
  addEventListener(type, handler) {
    this.listeners[type] = this.listeners[type] || [];
    this.listeners[type].push(handler);
  }
  dispatchEvent(event) {
    event.target = event.target || this;
    for (const handler of this.listeners[event.type] || []) handler(event);
    return !event.defaultPrevented;
  }
  setAttribute(name, value) {
    this.attributes.set(String(name), String(value));
  }
  getAttribute(name) {
    return this.attributes.get(String(name)) || null;
  }
  click() {
    this.clickCount += 1;
    this.dispatchEvent(new FakeEvent('click', { target: this }));
  }
  closest(selector) {
    return selector.split(',').some((part) => part.trim() === `#${this.id}`) ? this : null;
  }
}

class FakeDocument {
  constructor() {
    this.readyState = 'complete';
    this.listeners = {};
    this.elements = new Map();
  }
  register(element) {
    this.elements.set(`#${element.id}`, element);
  }
  querySelector(selector) {
    return this.elements.get(selector) || null;
  }
  addEventListener(type, handler) {
    this.listeners[type] = this.listeners[type] || [];
    this.listeners[type].push(handler);
  }
  dispatchEvent(event) {
    for (const handler of this.listeners[event.type] || []) handler(event);
  }
}

class FakeMutationObserver {
  constructor(callback) {
    this.callback = callback;
  }
  observe(target) {
    target.__observerCallback = this.callback;
  }
}

const document = new FakeDocument();
const primary = new FakeElement(document, 'primary-chat-link');
const stop = new FakeElement(document, 'runtime-stop');
stop.disabled = true;

const timers = [];
const intervals = [];
const window = {};

const context = vm.createContext({
  window,
  document,
  MutationObserver: FakeMutationObserver,
  setInterval(handler) {
    intervals.push(handler);
    return intervals.length;
  },
  clearInterval() {},
  setTimeout(handler) {
    timers.push(handler);
    return timers.length;
  }
});

vm.runInContext(source, context, { filename: 'composer-stop-handoff.js' });

assert.equal(primary.textContent, '\u2191', 'primary action must default to send arrow');
assert.equal(primary.dataset.composerStopReady, 'false', 'default state must expose send readiness');
assert.equal(primary.getAttribute('aria-label'), 'Send prompt to the active MMIR route', 'default aria label must stay send-focused');
assert.equal(primary.getAttribute('title'), 'Send', 'default title must stay send');
assert.equal(primary.getAttribute('aria-disabled'), 'false', 'primary action must remain keyboard reachable');
assert.equal(primary.dataset.mimirStopHandoff, '1', 'primary action must bind stop handoff once');
assert.equal(stop.dataset.mimirStopHandoff, '1', 'stop button must bind stop observer once');

stop.disabled = false;
stop.__observerCallback?.();

assert.equal(primary.textContent, '\u25a0', 'busy state must swap send arrow for stop glyph');
assert.equal(primary.dataset.composerStopReady, 'true', 'busy state must expose stop readiness');
assert.equal(primary.getAttribute('aria-label'), 'Stop current response', 'busy aria label must announce stop');
assert.equal(primary.getAttribute('title'), 'Stop', 'busy title must switch to stop');
assert.equal(primary.classList.contains('is-stopping'), true, 'busy state must mark the primary action as stopping');

const busyClick = new FakeEvent('click', { target: primary });
primary.dispatchEvent(busyClick);

assert.equal(busyClick.defaultPrevented, true, 'busy click must prevent the default send action');
assert.equal(busyClick.propagationStopped, true, 'busy click must stop duplicate send handlers');
assert.equal(stop.clickCount, 1, 'busy click must forward to the real stop button');

stop.disabled = true;
stop.__observerCallback?.();

assert.equal(primary.textContent, '\u2191', 'idle state must restore send arrow after stop');
assert.equal(primary.dataset.composerStopReady, 'false', 'idle state must restore send readiness');
assert.equal(primary.classList.contains('is-stopping'), false, 'idle state must clear stopping class');

const idleClick = new FakeEvent('click', { target: primary });
primary.dispatchEvent(idleClick);

assert.equal(idleClick.defaultPrevented, false, 'idle click must leave send behavior untouched');
assert.equal(stop.clickCount, 1, 'idle click must not trigger stop');

document.dispatchEvent(new FakeEvent('click', { target: primary }));
for (const handler of timers.splice(0)) handler();

assert.equal(primary.textContent, '\u2191', 'document click refresh must preserve the idle send state');

console.log('Composer stop handoff smoke passed.');
