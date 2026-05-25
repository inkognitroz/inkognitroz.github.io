import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import vm from 'node:vm';

const root = process.cwd();
const quickActionsPath = join(root, 'public', 'apps', 'mimir-chat-portal', 'composer-quick-actions.js');

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
  stopImmediatePropagation() {}
  stopPropagation() {}
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
    this.tagName = tagName;
    this.attributes = new Map();
    this.children = [];
    this.listeners = {};
    this.dataset = {};
    this.hidden = false;
    this.disabled = false;
    this.value = '';
    this.textContent = '';
    this.innerHTML = '';
    this.parentElement = null;
    this.nextSibling = null;
    this.selectedOptions = [];
    this.options = [];
    if (id) this.id = id;
  }

  set id(value) {
    this._id = value;
    this.document.register(this);
  }

  get id() {
    return this._id || '';
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  getAttribute(name) {
    return this.attributes.get(name) || null;
  }

  appendChild(child) {
    child.parentElement = this;
    this.children.push(child);
    return child;
  }

  insertBefore(child) {
    return this.appendChild(child);
  }

  addEventListener(type, handler) {
    this.listeners[type] = handler;
  }

  dispatchEvent(event) {
    this.dispatched = this.dispatched || [];
    this.dispatched.push(event.type);
    const handler = this.listeners[event.type];
    if (handler) handler(event);
    return true;
  }

  click() {
    this.clicked = (this.clicked || 0) + 1;
    this.dispatchEvent(new FakeEvent('click', { bubbles: true }));
  }

  focus() {
    this.focused = true;
  }

  scrollIntoView() {}

  querySelector(selector) {
    if (selector === '[data-composer-quick-action]') return new FakeElement(this.document, 'button');
    return this.document.querySelector(selector);
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
    if (this.elements.has(selector)) return this.elements.get(selector);
    if (selector === '.mimir-composer') return this.elements.get('.mimir-composer') || null;
    return null;
  }

  createElement(tagName) {
    return new FakeElement(this, tagName);
  }

  addEventListener(type, handler) {
    this.listeners[type] = handler;
  }
}

function routeClickEvent(route) {
  return {
    target: {
      closest(selector) {
        if (selector === '[data-composer-quick-action]') return null;
        if (selector === '[data-composer-quick-route]') {
          return { getAttribute: () => route };
        }
        return null;
      }
    }
  };
}

function setupContext({ webgpu = true } = {}) {
  const document = new FakeDocument();
  const composer = new FakeElement(document, 'form');
  document.elements.set('.mimir-composer', composer);

  const plus = new FakeElement(document, 'button', 'composer-add-model');
  const dock = new FakeElement(document, 'div', 'composer-mode-dock');
  const prompt = new FakeElement(document, 'textarea', 'mimir-prompt');
  const primary = new FakeElement(document, 'a', 'primary-chat-link');
  const feedback = new FakeElement(document, 'p', 'composer-action-feedback');
  const select = new FakeElement(document, 'select', 'runtime-model');
  const option = new FakeElement(document, 'option');
  option.textContent = 'MMIR Guide - ready now';
  select.selectedOptions = [option];
  const resource = new FakeElement(document, 'span', 'runtime-resource-chip');
  resource.textContent = 'Free browser route';

  for (const element of [plus, dock, prompt, primary, feedback, select, resource]) {
    composer.appendChild(element);
  }

  const storage = new Map();
  const events = [];
  const location = { href: 'http://127.0.0.1:4173/mmir.html#chat' };
  const window = {
    document,
    isSecureContext: true,
    navigator: webgpu ? { gpu: {} } : {},
    location,
    MimirComposerModelPicker: { close() {} },
    MimirAutosizeComposer() {},
    matchMedia: () => ({ matches: false }),
    dispatchEvent(event) {
      events.push({ type: event.type, detail: event.detail || {} });
    },
    addEventListener() {}
  };
  const localStorage = {
    getItem(key) {
      return storage.get(key) || null;
    },
    setItem(key, value) {
      storage.set(key, value);
    }
  };

  const context = {
    window,
    document,
    localStorage,
    Event: FakeEvent,
    CustomEvent: FakeCustomEvent,
    URLSearchParams,
    setTimeout(handler) {
      handler();
      return 1;
    },
    setInterval() {
      return 1;
    },
    clearInterval() {}
  };
  vm.createContext(context);
  vm.runInContext(readFileSync(quickActionsPath, 'utf8'), context, { filename: quickActionsPath });
  return { window, document, composer, plus, prompt, primary, feedback, storage, events, location };
}

function menuFrom(document, window) {
  window.MimirComposerQuickActions.open();
  const menu = document.querySelector('#composer-quick-actions');
  if (!menu || menu.hidden) fail('Quick actions menu should open in the fixture.');
  if (!String(menu.innerHTML || '').includes('composer-quick-route-strip')) fail('Fixture menu must render the quick route strip.');
  return menu;
}

function clickRoute(route) {
  const harness = setupContext();
  const menu = menuFrom(harness.document, harness.window);
  menu.listeners.click(routeClickEvent(route));
  return harness;
}

const guide = clickRoute('guide');
if (guide.prompt.value !== 'Start free chat with MMIR Guide. Tell me what is active and what I can do next.') {
  fail('Guide route must seed the free guide prompt.');
}
if (guide.primary.clicked !== 1) fail('Guide route must click primary chat once.');
if (!guide.events.some((event) => event.type === 'mmir-runtime-starter-handoff' && event.detail.starter_id === 'mmir-guide' && event.detail.source === 'composer-quick-route-strip' && event.detail.no_paid_routes_started === true)) {
  fail('Guide route must dispatch public-safe mmir-guide starter handoff.');
}

const webgpu = clickRoute('webgpu');
if (!webgpu.prompt.value.includes('Qwen2.5 0.5B')) fail('WebGPU route must seed a Qwen browser LLM prompt.');
if (webgpu.primary.clicked !== 1) fail('WebGPU route must click primary chat once.');
if (!webgpu.events.some((event) => event.type === 'mmir-runtime-starter-handoff' && event.detail.starter_id === 'webllm-qwen25-05b' && event.detail.source === 'composer-quick-route-strip' && event.detail.no_paid_routes_started === true)) {
  fail('WebGPU route must dispatch public-safe webllm starter handoff.');
}

const local = clickRoute('local');
if (!local.location.href.includes('mmir-local-connector-install.html?source=composer-quick-route-strip')) {
  fail('Local route must open the no-spend local connector installer.');
}
if (!local.location.href.includes('starter=ollama-qwen3-06b') || !local.location.href.includes('model=qwen3%3A0.6b')) {
  fail('Local route must preserve selected Qwen3 starter and Ollama model in installer handoff.');
}
const resumeEntry = Array.from(local.storage.entries()).find(([key]) => key.startsWith('mimir-repair-resume-v1:'));
if (!resumeEntry) fail('Local route must write a browser-local repair resume.');
const resume = resumeEntry ? JSON.parse(resumeEntry[1]) : {};
if (resume.starter_id !== 'ollama-qwen3-06b' || resume.model !== 'qwen3:0.6b') fail('Repair resume must preserve the local starter/model.');
if (resume.no_paid_routes_started !== true || resume.provider_secrets_stored !== false || resume.raw_prompt_stored !== false || resume.raw_response_stored !== false) {
  fail('Repair resume must preserve no-spend/no-secret/no-raw-data boundaries.');
}

const noGpu = setupContext({ webgpu: false });
const noGpuMenu = menuFrom(noGpu.document, noGpu.window);
if (!String(noGpuMenu.innerHTML || '').includes('Browser LLM option')) fail('No-WebGPU fixture should label Browser LLM as an option, not ready.');
if (!String(noGpuMenu.innerHTML || '').includes('data-route-state="setup"')) fail('No-WebGPU fixture should mark WebGPU route as setup.');

if (!process.exitCode) {
  console.log('Composer quick route fixture smoke check passed.');
}
