import { readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import vm from 'node:vm';

const root = process.cwd();
const publicDir = resolve(root, 'public');
const files = {
  activeStrip: join(publicDir, 'apps', 'mimir-chat-portal', 'active-node-strip.js'),
  manifest: join(publicDir, 'active-chat-nodes.json'),
  catalog: join(publicDir, 'free-model-starters.json'),
  backlog: join(root, 'docs', 'MMIR_SEQUENTIAL_DELIVERY_BACKLOG.md'),
  log: join(root, 'docs', 'MMIR_IMPLEMENTATION_LOG.md'),
  buildDashboard: join(root, 'scripts', 'build-progress-dashboard.js'),
  visualQa: join(publicDir, 'visual-qa-report.json'),
  qualityWorkflow: join(root, '.github', 'workflows', 'quality.yml'),
  pagesWorkflow: join(root, '.github', 'workflows', 'pages.yml')
};

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function text(file) {
  try {
    return readFileSync(file, 'utf8');
  } catch (error) {
    fail(`Missing D299 startup free LLM click fixture file: ${relative(root, file)}`);
    return '';
  }
}

function requireIncludes(source, needle, message) {
  if (!source.includes(needle)) fail(message);
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

function dataName(attribute) {
  return attribute.replace(/^data-/, '').replace(/-([a-z])/g, (_, char) => char.toUpperCase());
}

class FakeElement {
  constructor(document, tagName, id = '') {
    this.document = document;
    this.tagName = String(tagName || 'div').toUpperCase();
    this.attributes = new Map();
    this.children = [];
    this.listeners = {};
    this.dataset = {};
    this.hidden = false;
    this.disabled = false;
    this.value = '';
    this.textContent = '';
    this.selectedOptions = [];
    this.options = [];
    this.parentNode = null;
    this.parentElement = null;
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
    if (key.startsWith('data-')) this.dataset[dataName(key)] = stringValue;
  }

  getAttribute(name) {
    return this.attributes.get(String(name)) || null;
  }

  removeAttribute(name) {
    this.attributes.delete(String(name));
  }

  appendChild(child) {
    child.parentNode = this;
    child.parentElement = this;
    if (this.children.length) this.children[this.children.length - 1].nextSibling = child;
    this.children.push(child);
    return child;
  }

  insertBefore(child, before = null) {
    child.parentNode = this;
    child.parentElement = this;
    const index = before ? this.children.indexOf(before) : -1;
    if (index >= 0) this.children.splice(index, 0, child);
    else this.children.push(child);
    for (let i = 0; i < this.children.length; i += 1) {
      this.children[i].nextSibling = this.children[i + 1] || null;
    }
    return child;
  }

  addEventListener(type, handler) {
    this.listeners[type] = this.listeners[type] || [];
    this.listeners[type].push(handler);
  }

  dispatchEvent(event) {
    const handlers = this.listeners[event.type] || [];
    for (const handler of handlers) handler(event);
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
    return this.document.querySelector(selector);
  }

  querySelectorAll(selector) {
    if (this._queryCache.has(selector)) return this._queryCache.get(selector);
    const attribute = selector === '[data-active-starter-id]' ? 'data-active-starter-id'
      : selector === '[data-active-node-action]' ? 'data-active-node-action'
      : '';
    if (!attribute) return [];
    const buttons = [];
    const regex = /<button\b([^>]*)>([\s\S]*?)<\/button>/g;
    let match;
    while ((match = regex.exec(this.innerHTML)) !== null) {
      const attrs = match[1] || '';
      if (!attrs.includes(attribute)) continue;
      const button = new FakeElement(this.document, 'button');
      const attrRegex = /([a-zA-Z0-9_-]+)="([^"]*)"/g;
      let attr;
      while ((attr = attrRegex.exec(attrs)) !== null) {
        button.setAttribute(attr[1], attr[2]);
      }
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
    this.head = new FakeElement(this, 'head');
    this.body = new FakeElement(this, 'body');
  }

  register(element) {
    if (element.id) this.elements.set(`#${element.id}`, element);
  }

  querySelector(selector) {
    if (this.elements.has(selector)) return this.elements.get(selector);
    return null;
  }

  createElement(tagName) {
    return new FakeElement(this, tagName);
  }

  addEventListener() {}
}

function makeStorage() {
  const storage = new Map();
  return {
    storage,
    getItem(key) {
      return storage.get(String(key)) || null;
    },
    setItem(key, value) {
      storage.set(String(key), String(value));
    },
    removeItem(key) {
      storage.delete(String(key));
    }
  };
}

function response(body) {
  return {
    ok: true,
    async json() {
      return JSON.parse(JSON.stringify(body));
    }
  };
}

async function setupContext({ webgpu = true } = {}) {
  const document = new FakeDocument();
  const shell = new FakeElement(document, 'main');
  const composer = new FakeElement(document, 'form');
  document.elements.set('.mimir-composer', composer);
  shell.appendChild(composer);

  const prompt = new FakeElement(document, 'textarea', 'mimir-prompt');
  const primary = new FakeElement(document, 'button', 'primary-chat-link');
  const select = new FakeElement(document, 'select', 'runtime-model');
  const option = new FakeElement(document, 'option');
  option.textContent = 'MMIR Guide - ready now';
  option.dataset.runtime = 'browser-guide';
  select.value = 'starter:mmir-guide';
  select.selectedOptions = [option];
  select.options = [option];

  for (const element of [prompt, primary, select]) composer.appendChild(element);

  const catalog = JSON.parse(text(files.catalog));
  const manifest = JSON.parse(text(files.manifest));
  const events = [];
  const localStorage = makeStorage();
  const location = { href: 'http://127.0.0.1:4173/mmir.html' };
  const navigator = webgpu ? { gpu: {} } : {};
  let deferredLoads = 0;
  const window = {
    document,
    isSecureContext: true,
    navigator,
    location,
    MimirBackendProfiles: {
      ensureFreeLocalProfile() {
        window.freeLocalProfileEnsured = true;
      }
    },
    MimirLoadDeferred() {
      deferredLoads += 1;
      window.MimirBackendProfiles.ensureFreeOpenAiLocalProfile = (profile) => {
        window.freeOpenAiLocalProfile = profile;
        return profile;
      };
      return Promise.resolve();
    },
    get deferredLoads() {
      return deferredLoads;
    },
    dispatchEvent(event) {
      events.push({ type: event.type, detail: event.detail || {} });
    },
    addEventListener() {}
  };
  const context = {
    window,
    document,
    navigator,
    localStorage,
    Event: FakeEvent,
    CustomEvent: FakeCustomEvent,
    URLSearchParams,
    Date,
    setInterval() {
      return 1;
    },
    clearInterval() {},
    fetch(url) {
      const value = String(url || '');
      if (value.includes('active-chat-nodes.json')) return Promise.resolve(response(manifest));
      if (value.includes('free-model-starters.json')) return Promise.resolve(response(catalog));
      return Promise.reject(new Error(`Unexpected fixture fetch: ${value}`));
    }
  };

  vm.createContext(context);
  vm.runInContext(text(files.activeStrip), context, { filename: files.activeStrip });
  for (let i = 0; i < 8; i += 1) await Promise.resolve();
  const bar = document.querySelector('#mmir-active-nodes-bar');
  if (!bar) fail('Startup active-node strip must render below the composer.');
  return { window, document, bar, prompt, primary, events, localStorage, catalog };
}

function starterButton(bar, starterId) {
  const button = bar.querySelectorAll('[data-active-starter-id]').find((item) => item.getAttribute('data-active-starter-id') === starterId);
  if (!button) fail(`Startup rail missing clickable starter: ${starterId}`);
  return button;
}

function nodeButton(bar, nodeId) {
  const button = bar.querySelectorAll('[data-active-node-action]').find((item) => item.getAttribute('data-active-node-action') === nodeId);
  if (!button) fail(`Active node rail missing clickable node: ${nodeId}`);
  return button;
}

function hasHandoff(events, starterId, action) {
  return events.some((event) => event.type === 'mmir-runtime-starter-handoff'
    && event.detail.starter_id === starterId
    && event.detail.action === action
    && event.detail.source === 'active-node-starter-rail'
    && event.detail.no_paid_routes_started === true);
}

const base = await setupContext();
const visibleStarterIds = (base.bar.innerHTML.match(/data-active-starter-id="/g) || []).length;
const expectedStartup = base.catalog.models.filter((model) => ['browser-guide', 'webllm', 'ollama'].includes(model.runtime)).length;
if (visibleStarterIds !== expectedStartup) {
  fail(`Startup rail should render every free starter button. Expected ${expectedStartup}, saw ${visibleStarterIds}.`);
}
if (!base.bar.innerHTML.includes(`data-free-starter-count="${expectedStartup}"`)) {
  fail('Startup rail should expose the free starter count for runtime/UI verification.');
}

const guide = await setupContext();
starterButton(guide.bar, 'mmir-guide')?.click();
if (!hasHandoff(guide.events, 'mmir-guide', 'select')) fail('MMIR Guide startup starter must dispatch a select handoff.');
if (!guide.prompt.value.includes('Start a free chat with')) fail('MMIR Guide startup starter must seed a useful first prompt.');
if (guide.primary.clicked !== 1) fail('MMIR Guide startup starter must click Send once.');

const webgpu = await setupContext();
starterButton(webgpu.bar, 'webllm-qwen25-05b')?.click();
if (!hasHandoff(webgpu.events, 'webllm-qwen25-05b', 'select')) fail('WebGPU startup starter must dispatch a select handoff.');
if (!webgpu.prompt.value.includes('Qwen2.5 0.5B')) fail('WebGPU startup starter must seed the selected model prompt.');
if (webgpu.primary.clicked !== 1) fail('WebGPU startup starter must click Send once.');

const noGpu = await setupContext({ webgpu: false });
if (!noGpu.bar.innerHTML.includes('data-route-state="setup"') || !noGpu.bar.innerHTML.includes('Needs WebGPU Qwen2.5 0.5B')) {
  fail('No-WebGPU startup rail must label browser LLM starters as setup, not ready.');
}
starterButton(noGpu.bar, 'webllm-qwen25-05b')?.click();
if (!noGpu.events.some((event) => event.type === 'mmir-runtime-starter-handoff'
  && event.detail.starter_id === 'mmir-guide'
  && event.detail.action === 'select'
  && event.detail.fallback_for === 'webllm-qwen25-05b'
  && event.detail.no_paid_routes_started === true)) {
  fail('No-WebGPU startup starter must fall back to MMIR Guide with selected WebGPU model preserved as context.');
}
if (!noGpu.prompt.value.includes('needs WebGPU here') || !noGpu.prompt.value.includes('Local Node')) {
  fail('No-WebGPU startup fallback must seed a useful no-cost guide prompt.');
}
if (noGpu.primary.clicked !== 1) fail('No-WebGPU startup fallback must still send one useful guide chat.');

const localAdapter = await setupContext();
nodeButton(localAdapter.bar, 'local-lm-studio')?.click();
for (let i = 0; i < 4; i += 1) await Promise.resolve();
if (localAdapter.window.deferredLoads !== 1) fail('Local adapter click must load the deferred backend module before chat.');
if (localAdapter.window.freeOpenAiLocalProfile?.url !== 'http://127.0.0.1:1234') fail('Local adapter click must activate the selected free local OpenAI-compatible profile.');
if (!localAdapter.events.some((event) => event.type === 'mmir-free-local-adapter-selected'
  && event.detail.node_id === 'local-lm-studio'
  && event.detail.no_paid_routes_started === true)) {
  fail('Local adapter click must emit a no-spend adapter selection event.');
}
if (!localAdapter.prompt.value.includes('free local /v1 node')) fail('Local adapter click must seed a useful /v1 prompt.');
if (localAdapter.primary.clicked !== 1) fail('Local adapter click must send chat after the profile handoff is ready.');

const local = await setupContext();
starterButton(local.bar, 'ollama-qwen3-06b')?.click();
if (!hasHandoff(local.events, 'ollama-qwen3-06b', 'install')) fail('Ollama startup starter must dispatch an install handoff.');
if (!local.window.freeLocalProfileEnsured) fail('Ollama startup starter must prepare a free local profile before installer handoff.');
if (!local.window.location.href.includes('mmir-local-connector-install.html?source=active-node-starter-rail')) {
  fail('Ollama startup starter must open the universal no-spend installer.');
}
if (!local.window.location.href.includes('starter=ollama-qwen3-06b') || !local.window.location.href.includes('model=qwen3%3A0.6b')) {
  fail('Ollama startup starter must preserve selected starter/model in the installer URL.');
}
const resumeEntry = Array.from(local.localStorage.storage.entries()).find(([key]) => key.startsWith('mimir-repair-resume-v1:'));
if (!resumeEntry) fail('Ollama startup starter must write a browser-local repair resume.');
const resume = resumeEntry ? JSON.parse(resumeEntry[1]) : {};
if (resume.starter_id !== 'ollama-qwen3-06b' || resume.model !== 'qwen3:0.6b' || resume.next_action !== 'installer-download') {
  fail('Ollama startup repair resume must preserve selected starter/model and installer action.');
}
if (resume.no_paid_routes_started !== true || resume.provider_secrets_stored !== false || resume.raw_prompt_stored !== false || resume.raw_response_stored !== false) {
  fail('Ollama startup repair resume must preserve no-spend/no-secret/no-raw-data boundaries.');
}
if (local.primary.clicked) fail('Ollama startup installer path must not pretend to send chat before the local model is installed.');

const workflows = `${text(files.qualityWorkflow)}\n${text(files.pagesWorkflow)}`;
requireIncludes(text(files.backlog), '| D299 | Chat QA / Free Models | P0 | Startup free LLM click fixture |', 'Backlog must include D299 startup free LLM click fixture.');
requireIncludes(text(files.backlog), '| D300 | Chat UX / Free Models | P0 | Startup WebGPU fallback clarity |', 'Backlog must include D300 startup WebGPU fallback clarity.');
requireIncludes(text(files.log), 'D299 is now beta', 'Implementation log must include D299.');
requireIncludes(text(files.log), 'D300 is now beta', 'Implementation log must include D300.');
requireIncludes(text(files.buildDashboard), "['D299'", 'Progress dashboard build must mark D299 status.');
requireIncludes(text(files.buildDashboard), "['D300'", 'Progress dashboard build must mark D300 status.');
requireIncludes(text(files.visualQa), 'D299 startup free LLM click fixture', 'Visual QA report must mention D299.');
requireIncludes(text(files.visualQa), 'D300 startup WebGPU fallback clarity', 'Visual QA report must mention D300.');
requireIncludes(workflows, 'smoke-check-startup-free-llm-click-fixture.js', 'GitHub workflows must run D299 startup free LLM click fixture.');

if (!process.exitCode) {
  console.log(`Startup free LLM click fixture passed with ${expectedStartup} clickable startup choices.`);
}
