import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';

const root = resolve(process.cwd(), 'public');
const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || '127.0.0.1';

const types = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml'
};

function send(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(body);
}

function publicPath(urlPath) {
  let pathname = decodeURIComponent(urlPath || '/');
  if (pathname === '/') pathname = '/mmir.html';
  const file = normalize(join(root, pathname));
  return file.startsWith(root) ? file : '';
}

const server = createServer((req, res) => {
  const url = new URL(req.url || '/', `http://${host}:${port}`);
  const file = publicPath(url.pathname);
  if (!file) {
    send(res, 403, 'Forbidden');
    return;
  }
  if (!existsSync(file) || !statSync(file).isFile()) {
    send(res, 404, 'Not found');
    return;
  }
  res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream' });
  createReadStream(file).pipe(res);
});

server.listen(port, host, () => {
  console.log(`Serving public at http://${host}:${port}/mmir.html`);
});
