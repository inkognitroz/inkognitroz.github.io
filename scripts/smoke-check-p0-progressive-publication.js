import fs from 'node:fs';

const shell=fs.readFileSync('public/apps/mimir-chat-portal/p0-chat-shell.js','utf8');
const api=fs.readFileSync('public/apps/mimir-chat-portal/api-client.js','utf8');
const consumer=fs.readFileSync('public/apps/mimir-chat-portal/progressive-publication-consumer.mjs','utf8');
const must=(condition,message)=>{if(!condition)throw new Error(message);};

must(shell.includes("window.MMIR_PROGRESSIVE_PUBLICATION_UI_ENABLED===true"),'Progressive UI path stays explicitly disabled by default.');
must(shell.includes("./progressive-publication-consumer.mjs"),'P0 imports the shared progressive consumer.');
must(shell.includes("/l5/progressive-publication/stream"),'P0 calls the mounted user-token stream path.');
must(shell.includes("prepareBackendRequest(endpoint"),'P0 obtains the existing backend user identity before streaming.');
must(shell.includes("execution_scope:'model-routes-only'"),'P0 preserves strict model-route scope in the adapter envelope.');
must(api.includes("parsed.pathname==='/l5/progressive-publication/stream'"),'Backend identity scope admits only the exact progressive path.');
must(!consumer.includes('serviceAuthorization')&&!consumer.includes('api_key'),'Browser consumer contains no service credential path.');
console.log('p0 progressive publication coupling: PASS');
