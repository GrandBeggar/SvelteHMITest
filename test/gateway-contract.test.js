// @vitest-environment node
import { spawn } from 'child_process';
import { once } from 'events';
import WebSocket from 'ws';
import { describe, expect, test } from 'vitest';

function pickPort() {
  return 3300 + Number(process.env.VITEST_POOL_ID ?? 0) * 100 + Math.floor(Math.random() * 50);
}

function startServer(port, mode) {
  return spawn(process.execPath, ['server.js'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(port),
      HMI_MODE: mode,
      ADS_TIMEOUT_MS: '200',
      ADS_RECONNECT_MS: '1000',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

async function waitForHealth(port) {
  const deadline = Date.now() + 5000;
  let lastError;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/health`);
      if (response.ok) return;
    } catch (error) {
      lastError = error;
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw lastError ?? new Error('Timed out waiting for health endpoint');
}

function connectWs(port) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/api/ws`);
    ws.once('open', () => resolve(ws));
    ws.once('error', reject);
  });
}

function send(ws, payload) {
  ws.send(JSON.stringify(payload));
}

function nextMessage(ws, predicate, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      ws.off('message', onMessage);
      reject(new Error('Timed out waiting for gateway message'));
    }, timeoutMs);

    function onMessage(raw) {
      const message = JSON.parse(String(raw));
      if (!predicate(message)) return;
      clearTimeout(timeout);
      ws.off('message', onMessage);
      resolve(message);
    }

    ws.on('message', onMessage);
  });
}

async function stopServer(server) {
  server.kill();
  await once(server, 'exit');
}

describe('gateway contract enforcement', () => {
  test('blocks unknown keys, read-only writes, malformed values, and allows valid mock writes', async () => {
    const port = pickPort();
    const server = startServer(port, 'mock');

    try {
      await waitForHealth(port);
      const ws = await connectWs(port);
      await nextMessage(ws, (message) => message.type === 'status');

      send(ws, { type: 'read', key: 'not.in.contract' });
      await expect(nextMessage(ws, (message) => message.type === 'error')).resolves.toMatchObject({
        key: 'not.in.contract',
        message: 'Unknown contract key: not.in.contract',
      });

      send(ws, { type: 'write', key: 'safety.controlPower', value: false });
      await expect(nextMessage(ws, (message) => message.type === 'error')).resolves.toMatchObject({
        key: 'safety.controlPower',
        message: 'safety.controlPower is not writable',
      });

      send(ws, { type: 'write', key: 'pattern.index', value: 'bad' });
      await expect(nextMessage(ws, (message) => message.type === 'error')).resolves.toMatchObject({
        key: 'pattern.index',
        message: 'MF.HMI.nPatternIndex expects an integer',
      });

      send(ws, { type: 'write', key: 'mode.dryCycleEnable', value: true });
      await expect(
        nextMessage(
          ws,
          (message) => message.type === 'value' && message.key === 'mode.dryCycleEnable',
        ),
      ).resolves.toMatchObject({
        key: 'mode.dryCycleEnable',
        symbol: 'MF.HMI.bDryCycleEnable',
        value: true,
      });

      send(ws, { type: 'read', key: 'mode.dryCycleEnable' });
      await expect(
        nextMessage(
          ws,
          (message) => message.type === 'value' && message.key === 'mode.dryCycleEnable',
        ),
      ).resolves.toMatchObject({ value: true });

      ws.close();
    } finally {
      await stopServer(server);
    }
  });

  test('reports an error when ADS mode cannot connect before a read', async () => {
    const port = pickPort();
    const server = startServer(port, 'ads');

    try {
      await waitForHealth(port);
      const ws = await connectWs(port);
      await nextMessage(ws, (message) => message.type === 'status');

      send(ws, { type: 'read', key: 'runtime.initialized' });

      await expect(
        nextMessage(
          ws,
          (message) => message.type === 'error' && message.key === 'runtime.initialized',
          8000,
        ),
      ).resolves.toMatchObject({
        key: 'runtime.initialized',
      });

      ws.close();
    } finally {
      await stopServer(server);
    }
  });
});
