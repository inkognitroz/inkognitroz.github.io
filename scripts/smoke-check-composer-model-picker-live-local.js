import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';

const root = process.cwd();
const pickerPath = join(root, 'public', 'apps', 'mimir-chat-portal', 'composer-model-picker.js');

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

class FakeEvent {
  constructor(type, options = {}) {
    this.type = type;
    this.bubbles = Boolean(options.bubbles);
    this.defaultPrevented = false;
  }
  preventDefault() {
    this.defaultPrevented = true;
  }
}

class FakeCustomEvent extends FakeEvent {
  constructor(type, options = {}) {
    super(type, options);
    this.detail = options.detail || {};
  }
}

class FakeElement {
  constructor(document, tagName, id = '') {
    this.document = document;
    this.tagName = String(tagName || 'div').toUpperCase();
    this.children = [];
    this.listeners = {};
    this.attributes = new Map();
    this.dataset = {};
    this.hidden = false;
    this.value = '';
    this.textContent = '';
    this.options = [];
    this.selectedOptions = [];
    this.parentElement = null;
    this.parentNode = null;
    this.nextSibling = null;
    this._innerHTML = '';
    this._queryCache = new Map();
    if (id) this.id = id;
  }

  set id(value) {
    this._id = String(value || '');
    this.document.register(this);
  }

  get id() {
    return this._id || '';
  }

  set innerHTML(value) {
    this._innerHTML = String(value || '');
    this._queryCache.clear();
  }

  get innerHTML() {
    return this._innerHTML;
  }

  setAttribute(name, value) {
    const key = String(name);
    const stringValue = String(value);
    this.attributes.set(key, stringValue);
    if (key === 'id') this.id = stringValue;
    if (key.startsWith('data-')) this.dataset[key.replace(/^data-/, '').replace(/-([a-z])/g, (_, char) => char.toUpperCase())] = stringValue;
  }

  getAttribute(name) {
    return this.attributes.get(String(name)) || null;
  }

  appendChild(child) {
    child.parentElement = this;
    child.parentNode = this;
    if (this.children.length) this.children[this.children.length - 1].nextSibling = child;
    this.children.push(child);
    return child;
  }

  insertBefore(child) {
    return this.appendChild(child);
  }

  addEventListener(type, handler) {
    this.listeners[type] = this.listeners[type] || [];
    this.listeners[type].push(handler);
  }

  dispatchEvent(event) {
    for (const handler of this.listeners[event.type] || []) handler(event);
    return true;
  }

  click() {
    this.clicked = (this.clicked || 0) + 1;
    this.dispatchEvent(new FakeEvent('click', { bubbles: true }));
  }

  focus() {
    this.focused = true;
  }

  querySelector(selector) {
    if (selector === '.composer-bar') return this.document.querySelector('.composer-bar');
    if (selector === '[data-picker-close]') return new FakeElement(this.document, 'button');
    if (selector === '.composer-model-picker-head a') return new FakeElement(this.document, 'a');
    if (selector === '[data-picker-search]') return new FakeElement(this.document, 'input');
    if (selector === '[data-picker-search-count]') return new FakeElement(this.document, 'small');
    if (selector === '[data-picker-search-empty]') return new FakeElement(this.document, 'div');
    return this.document.querySelector(selector);
  }

  querySelectorAll(selector) {
    if (this._queryCache.has(selector)) return this._queryCache.get(selector);
    if (selector !== '[data-picker-model-value]' && selector !== '[data-picker-filter]') return [];
    const attribute = selector.slice(1, -1);
    const buttons = [];
    const regex = /<button\b([^>]*)>([\s\S]*?)<\/button>/g;
    let match;
    while ((match = regex.exec(this.innerHTML)) !== null) {
      const attrs = match[1] || '';
      if (!attrs.includes(attribute)) continue;
      const button = new FakeElement(this.document, 'button');
      const attrRegex = /([a-zA-Z0-9_-]+)="([^"]*)"/g;
      let attr;
      while ((attr = attrRegex.exec(attrs)) !== null) button.setAttribute(attr[1], attr[2]);
      button.textContent = String(match[2] || '').replace(/<[^>]+>/g, '').trim();
      buttons.push(button);
    }
    this._queryCache.set(selector, buttons);
    return buttons;
  }
}

class FakeDocument {
  constructor() {
    this.readyState = 'complete';
    this.elements = new Map();
    this.listeners = {};
  }

  register(element) {
    if (element.id) this.elements.set(`#${element.id}`, element);
  }

  querySelector(selector) {
    return this.elements.get(selector) || null;
  }

  getElementById(id) {
    return this.elements.get(`#${id}`) || null;
  }

  createElement(tagName) {
    return new FakeElement(this, tagName);
  }

  addEventListener(type, handler) {
    this.listeners[type] = this.listeners[type] || [];
    this.listeners[type].push(handler);
  }
}

const document = new FakeDocument();
const form = new FakeElement(document, 'form');
const bar = new FakeElement(document, 'div');
document.elements.set('.mimir-composer', form);
document.elements.set('.composer-bar', bar);
form.appendChild(bar);

const select = new FakeElement(document, 'select', 'runtime-model');
const liveOption = new FakeElement(document, 'option');
liveOption.value = 'qwen3:0.6b';
liveOption.textContent = 'qwen3:0.6b - live';
liveOption.dataset.runtime = 'live';
liveOption.parentElement = { label: 'Live from active backend - real chat' };
select.options = [liveOption];
select.value = 'qwen3:0.6b';
select.selectedOptions = [liveOption];
const prompt = new FakeElement(document, 'textarea', 'mimir-prompt');
const primary = new FakeElement(document, 'a', 'primary-chat-link');
document.register(select);
document.register(prompt);
document.register(primary);

const listeners = {};
const storage = new Map();
const window = {
  document,
  location: { href: 'http://127.0.0.1:4173/mmir.html#chat' },
  matchMedia: () => ({ matches: false }),
  MimirChatRuntimeBridge: {
    setStatus(message, state) {
      window.bridgeStatus = { message, state };
    },
    refresh() {
      window.bridgeRefreshes = (window.bridgeRefreshes || 0) + 1;
      return Promise.resolve([{ id: 'qwen3:0.6b' }]);
    },
    send() {
      window.bridgeSent = true;
      primary.click();
    }
  },
  addEventListener(type, handler) {
    listeners[type] = listeners[type] || [];
    listeners[type].push(handler);
  },
  dispatchEvent(event) {
    for (const handler of listeners[event.type] || []) handler(event);
  },
  setTimeout(handler) {
    handler();
    return 1;
  }
};

const context = {
  window,
  document,
  localStorage: {
    getItem(key) {
      return storage.get(key) || null;
    },
    setItem(key, value) {
      storage.set(key, String(value));
    }
  },
  Event: FakeEvent,
  CustomEvent: FakeCustomEvent,
  URLSearchParams,
  setTimeout(handler) {
    handler();
    return 1;
  },
  fetch() {
    return Promise.reject(new Error('offline fixture'));
  }
};

vm.createContext(context);
vm.runInContext(readFileSync(pickerPath, 'utf8'), context, { filename: pickerPath });
window.dispatchEvent(new FakeCustomEvent('mmir-local-connector-refreshed', {
  detail: { status: 'online', models: [{ id: 'qwen3:0.6b', name: 'Qwen3 0.6B' }] }
}));
window.MimirComposerModelPicker.open();

const picker = document.querySelector('#composer-model-picker');
if (!picker || picker.hidden) fail('Composer model picker must open in the live local fixture.');
if (!picker.innerHTML.includes('Local ready') || !picker.innerHTML.includes('Private Local Node model. No installer needed.')) {
  fail('Composer model picker must recommend the live local model instead of install when Local Node is ready.');
}
if (picker.innerHTML.includes('data-picker-recommend="local-install"')) {
  fail('Composer model picker must hide the install recommendation when live local model is ready.');
}

const localButton = picker.querySelectorAll('[data-picker-model-value]')
  .find((button) => button.getAttribute('data-picker-recommend') === 'live-local');
if (!localButton) fail('Composer model picker must render a clickable live-local recommendation.');
localButton?.click();
await Promise.resolve();

if (select.value !== 'qwen3:0.6b') fail('Live local recommendation must keep/select the live local model value.');
if (!prompt.value.includes('qwen3:0.6b')) fail('Live local recommendation must seed the private local prompt.');
if (window.bridgeRefreshes !== 1) fail('Live local recommendation must refresh through chat-runtime before sending.');
if (!window.bridgeSent) fail('Live local recommendation must send through chat-runtime.');
if (primary.clicked !== 1) fail('Live local recommendation must start exactly one chat send.');
if (window.location.href.includes('mmir-local-connector-install.html')) fail('Live local recommendation must not reopen the installer.');

if (!process.exitCode) {
  console.log('Composer model picker live-local fixture passed.');
}
