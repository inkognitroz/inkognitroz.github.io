#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const portalDir = join(root, "public", "apps", "mimir-chat-portal");
const hotfixPath = join(portalDir, "runtime-controls-fix.js");
const factGuardPath = join(portalDir, "runtime-fact-answer-guard.js");
const ownershipPath = join(portalDir, "MODULE_OWNERSHIP.md");
const packagePath = join(root, "package.json");
const hotfix = readFileSync(hotfixPath, "utf8");
const factGuard = readFileSync(factGuardPath, "utf8");
const ownership = readFileSync(ownershipPath, "utf8");
const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));
const compact = hotfix.replace(/\s+/g, "");
const factCompact = factGuard.replace(/\s+/g, "");
const failures = [];

function fail(message) {
  failures.push(message);
}

function requireText(source, needle, message) {
  if (!source.includes(needle)) fail(message);
}

function forbid(pattern, message) {
  if (pattern.test(hotfix)) fail(message);
}

function count(pattern) {
  return Array.from(hotfix.matchAll(pattern)).length;
}

[
  "cleanShell",
  "dockPrimarySend",
  "bindPrimaryAnchors",
  "handleMobileTap",
  "patchVisibleNames",
  "label",
  "run",
].forEach((name) =>
  requireText(
    hotfix,
    `function ${name}(`,
    `runtime-controls-fix must keep named ${name}() ownership.`,
  ),
);
["patchFactAnswer", "observeFacts", "run"].forEach((name) =>
  requireText(
    factGuard,
    `function ${name}(`,
    `runtime-fact-answer-guard must keep named ${name}() ownership.`,
  ),
);

requireText(
  ownership,
  "Runtime truth",
  "MODULE_OWNERSHIP.md must keep runtime truth ownership documented.",
);
requireText(
  ownership,
  "runtime-controls-fix.js",
  "MODULE_OWNERSHIP.md must name runtime-controls-fix.js.",
);
requireText(
  ownership,
  "runtime-fact-answer-guard.js",
  "MODULE_OWNERSHIP.md must name runtime-fact-answer-guard.js.",
);
requireText(
  hotfix,
  "function p0ReadyShell()",
  "runtime-controls-fix must keep an explicit P0 ownership guard.",
);
if (
  !compact.includes(
    'if(p0ReadyShell()){d.body?.classList.remove("mimir-clean-chat-shell","mimir-send-in-dock");return;}',
  ) &&
  !compact.includes(
    "if(p0ReadyShell()){d.body?.classList.remove('mimir-clean-chat-shell','mimir-send-in-dock');return;}",
  )
) {
  fail(
    "runtime-controls-fix must return before legacy mutations when P0 shell owns the page.",
  );
}

if (!compact.includes("functionrun(){if(p0ReadyShell()){")) {
  fail(
    "run() must start with the P0 guard before any legacy cleanup/mutation work.",
  );
}

if (count(/new MutationObserver/g) !== 0) {
  fail(
    "runtime-controls-fix must not own MutationObserver work after the fact guard split.",
  );
}

if (
  !factCompact.includes(
    "factObserver.observe(runtime,{childList:true,subtree:true,characterData:true})",
  ) &&
  !factCompact.includes(
    "factObserver.observe(runtime,{childList:true,subtree:true,characterData:true,})",
  )
) {
  fail(
    "runtime-fact-answer-guard MutationObserver must stay scoped to #mimir-chat-runtime, not the full document.",
  );
}
forbid(
  /observe\((?:d\.body|document\.body|d\.documentElement|document\.documentElement)/,
  "runtime-controls-fix must not observe the full document.",
);
if (
  /observe\((?:d\.body|document\.body|d\.documentElement|document\.documentElement)/.test(
    factGuard,
  )
) {
  fail("runtime-fact-answer-guard must not observe the full document.");
}
forbid(
  /querySelectorAll\(['"]\*['"]\)/,
  'runtime-controls-fix must not scan every element with querySelectorAll("*").',
);
forbid(
  /setInterval\([^)]*\)\s*;?\s*$/m,
  "runtime-controls-fix interval must stay capped and self-clearing.",
);
if (!compact.includes("if(++i>=600)clearInterval(t)")) {
  fail(
    "runtime-controls-fix polling must stay capped while the hotfix is being retired.",
  );
}

if (
  !String(packageJson.scripts?.check || "").includes(
    "smoke-check-runtime-controls-ownership.js",
  )
) {
  fail("npm run check must include smoke-check-runtime-controls-ownership.js.");
}

if (failures.length) {
  console.error("Runtime controls ownership smoke failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("runtime controls ownership smoke passed");
