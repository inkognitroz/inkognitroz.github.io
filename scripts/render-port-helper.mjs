import { createServer as createNetServer } from 'node:net';

function canListen(candidatePort, host) {
  return new Promise((resolve, reject) => {
    const probe = createNetServer();
    probe.once('error', error => {
      if (error?.code === 'EADDRINUSE') {
        resolve(false);
        return;
      }
      reject(error);
    });
    probe.listen(candidatePort, host, () => {
      probe.close(() => resolve(true));
    });
  });
}

export async function resolveRenderPort({
  envName,
  defaultPort,
  host,
  attempts,
  attemptsEnvName,
  label = 'render check'
}) {
  const requestedPort = Number(process.env[envName] || defaultPort);
  const maxAttempts = Number(process.env[attemptsEnvName] || attempts || 50);

  for (let offset = 0; offset < maxAttempts; offset += 1) {
    const candidate = requestedPort + offset;
    if (await canListen(candidate, host)) return candidate;
  }

  throw new Error(`No available ${label} port found from ${requestedPort} across ${maxAttempts} attempts`);
}
