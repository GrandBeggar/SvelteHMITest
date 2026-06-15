import { spawn } from 'child_process';
import { once } from 'events';
import { describe, expect, test } from 'vitest';

function pickPort() {
  return 3100 + Number(process.env.VITEST_POOL_ID ?? 0) * 100 + Math.floor(Math.random() * 50);
}

async function waitForHealth(port) {
  const deadline = Date.now() + 5000;
  let lastError;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/health`);
      if (response.ok) {
        return response.json();
      }
    } catch (error) {
      lastError = error;
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw lastError ?? new Error('Timed out waiting for health endpoint');
}

describe('server health endpoint', () => {
  test('reports mock mode and ADS status', async () => {
    const port = pickPort();
    const server = spawn(process.execPath, ['server.js'], {
      cwd: process.cwd(),
      env: { ...process.env, PORT: String(port), HMI_MODE: 'mock' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    try {
      const health = await waitForHealth(port);

      expect(health).toMatchObject({
        ok: true,
        port,
        mode: 'mock',
        ads: false,
      });
    } finally {
      server.kill();
      await once(server, 'exit');
    }
  });
});
