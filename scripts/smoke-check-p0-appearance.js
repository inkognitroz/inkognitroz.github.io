import fs from 'node:fs';
import assert from 'node:assert/strict';

const js=fs.readFileSync('public/apps/mimir-chat-portal/p0-appearance.js','utf8');
const css=fs.readFileSync('public/apps/mimir-chat-portal/p0-appearance.css','utf8');
const html=fs.readFileSync('public/mmir.html','utf8');

assert.match(js,/mmir-appearance-v1/);
assert.match(js,/prefers-color-scheme: dark/);
assert.match(js,/data-mmir-appearance/);
assert.match(js,/Utseende/);
assert.match(js,/System/);
assert.match(js,/Lys/);
assert.match(js,/Mørk/);
assert.match(css,/data-mmir-theme="dark"/);
assert.match(css,/prefers-reduced-motion/);
assert.match(html,/p0-appearance\.css/);
assert.match(html,/p0-appearance\.js/);

console.log('PASS: MMIR appearance supports system/light/dark with reduced-motion guard.');
