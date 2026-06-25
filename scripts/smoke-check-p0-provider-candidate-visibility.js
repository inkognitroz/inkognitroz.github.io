import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(new URL('..', import.meta.url).pathname);
const portalDir = join(root, 'public', 'apps', 'mimir-chat-portal');
const shell = readFileSync(join(portalDir, 'p0-chat-shell.js'), 'utf8');
const css = readFileSync(join(portalDir, 'p0-chat-shell.css'), 'utf8');
const html = readFileSync(join(root, 'public', 'mmir.html'), 'utf8');
const manifest = readFileSync(join(portalDir, 'asset-versions.json'), 'utf8');
const errors = [];

function requireIncludes(source, needle, message) {
  if (!source.includes(needle)) errors.push(message);
}

function requireNotIncludes(source, needle, message) {
  if (source.includes(needle)) errors.push(message);
}

requireIncludes(
  shell,
  'function visibleHostedModel(model)',
  'P0 shell must keep provider candidates visible even when they are not executable.'
);
requireIncludes(
  shell,
  "String(model?.route_type||'')==='external_candidate'",
  'P0 shell must recognize external provider candidate inventory.'
);
requireIncludes(
  shell,
  "tags:candidate?[provider,'Candidate','Future']",
  'Provider candidates must be visibly marked as future capacity in the model picker.'
);
requireIncludes(
  shell,
  'menuSection(\'Active free routes\')',
  'Model picker must lead with active free routes, not future candidates.'
);
requireIncludes(
  shell,
  'menuSection(\'Future node candidates\')',
  'Model picker must group non-active provider candidates separately.'
);
requireIncludes(
  shell,
  '.slice(0,24)',
  'Model normalization must keep enough active free routes visible before future candidates.'
);
requireIncludes(
  shell,
  '.slice(0,4)',
  'Model normalization must keep future candidates compact in the clean picker.'
);
requireIncludes(
  shell,
  "data-model-selectable=\"'+(selectable?'true':'false')+'\"",
  'Model menu must expose a selectable flag for candidate safety.'
);
requireIncludes(
  shell,
  "aria-disabled=\"'+(selectable?'false':'true')+'\"",
  'Provider candidates must be marked non-selectable without hiding them.'
);
requireIncludes(
  shell,
  "Future node · deploy handoff needed",
  'Clicking a provider candidate must explain the deploy handoff gate instead of selecting it.'
);
requireNotIncludes(
  shell,
  'setup/probe needed',
  'Clean demo UI must not lead with setup/probe language for future node candidates.'
);
requireIncludes(
  shell,
  "if(model?.candidate||model?.executable===false)return 'setup';",
  'Provider candidates must use setup rank state, not demoted/slow scoring badges.'
);
requireIncludes(
  shell,
  "model.executable!==false&&model.selectable!==false",
  'Active/default model selection must skip non-executable candidates.'
);
requireIncludes(
  shell,
  'function hostedPayload(prompt,model=defaultHostedModel())',
  'Hosted payload must accept the selected hosted model.'
);
requireIncludes(
  shell,
  "const modelId=String(model?.model||model?.id||'mmir-supergenius')",
  'Hosted payload must send the selected model id to api.mmir.ai.'
);
requireIncludes(
  shell,
  'await chatHostedData(routePrompt,signal,model)',
  'Sending a selected hosted route must call chatHostedData with that model.'
);
requireIncludes(
  shell,
  'responseText((hostedData=await chatHostedData(routePrompt,signal,model)))',
  'Selected hosted route responses must preserve API metadata before extracting answer text.'
);
requireIncludes(
  shell,
  "routeClass==='external-untrusted-free'",
  'P0 shell must treat owner-promoted external untrusted-free routes separately from setup candidates.'
);
requireIncludes(
  css,
  '.p0-menu button[data-model-selectable="false"]',
  'Candidate rows must have a discrete disabled visual state.'
);
requireIncludes(
  css,
  '.p0-badge-candidate',
  'Candidate badge styling must be present.'
);
requireIncludes(
  css,
  '.p0-badge-future',
  'Future badge styling must be present.'
);
requireIncludes(
  html,
  'p0-chat-shell.js?v=20260625-route-cta-separator-v1',
  'Public page must cache-bust the visible provider candidate runtime.'
);
requireIncludes(
  html,
  'p0-chat-shell.css?v=20260625-route-cta-separator-v1',
  'Public page must cache-bust the visible provider candidate CSS.'
);
requireIncludes(
  manifest,
  '"p0-chat-shell.js": "20260625-route-cta-separator-v1"',
  'Asset manifest must track the visible provider candidate runtime.'
);
requireIncludes(
  manifest,
  '"p0-chat-shell.css": "20260625-route-cta-separator-v1"',
  'Asset manifest must track the visible provider candidate CSS.'
);
requireNotIncludes(
  html,
  'OpenRouter Candidate',
  'Provider candidates must be loaded from API inventory, not hardcoded into static HTML.'
);

if (errors.length) {
  console.error('P0 provider candidate visibility smoke failed:');
  for (const error of errors) console.error('- ' + error);
  process.exit(1);
}

console.log('P0 provider candidate visibility smoke passed.');
