const CHAT_SHELL_PATHS = new Set(['/', '/mmir', '/mmir.html']);

function withPath(request, pathname) {
  const url = new URL(request.url);
  url.pathname = pathname;
  return new Request(url, request);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if ((request.method === 'GET' || request.method === 'HEAD') && CHAT_SHELL_PATHS.has(url.pathname)) {
      return env.ASSETS.fetch(withPath(request, '/mmir.html'));
    }

    return env.ASSETS.fetch(request);
  }
};
