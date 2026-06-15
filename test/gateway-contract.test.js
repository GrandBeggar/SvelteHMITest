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

      send(ws, { type: 'write', key: 'manual.coils.vacuum.out', value: true });
      await expect(nextMessage(ws, (message) => message.type === 'error')).resolves.toMatchObject({
        key: 'manual.coils.vacuum.out',
        message: 'manual.coils.vacuum.out is not writable',
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

  test('subscribes and unsubscribes diagnostic keys explicitly', async () => {
    const port = pickPort();
    const server = startServer(port, 'mock');

    try {
      await waitForHealth(port);
      const ws = await connectWs(port);
      await nextMessage(ws, (message) => message.type === 'status');

      send(ws, { type: 'subscribe', key: 'manual.coils.vacuum.out', cycleTime: 250 });
      await expect(
        nextMessage(
          ws,
          (message) => message.type === 'value' && message.key === 'manual.coils.vacuum.out',
        ),
      ).resolves.toMatchObject({
        key: 'manual.coils.vacuum.out',
        symbol: 'MF.Coils.Vacuum.bOut',
      });

      send(ws, { type: 'unsubscribe', key: 'manual.coils.vacuum.out' });
      await expect(
        nextMessage(
          ws,
          (message) => message.type === 'unsubscribed' && message.key === 'manual.coils.vacuum.out',
        ),
      ).resolves.toMatchObject({
        key: 'manual.coils.vacuum.out',
      });

      ws.close();
    } finally {
      await stopServer(server);
    }
  });

  test('models coil force on, off, and auto through eForce readbacks in mock mode', async () => {
    const port = pickPort();
    const server = startServer(port, 'mock');

    try {
      await waitForHealth(port);
      const ws = await connectWs(port);
      await nextMessage(ws, (message) => message.type === 'status');

      send(ws, { type: 'write', key: 'manual.coils.vacuum.force', value: 'On', requestId: 'on' });
      await expect(
        nextMessage(ws, (message) => message.type === 'written' && message.requestId === 'on'),
      ).resolves.toMatchObject({
        key: 'manual.coils.vacuum.force',
        symbol: 'MF.Coils.Vacuum.eForce',
      });

      send(ws, { type: 'read', key: 'manual.coils.vacuum.out' });
      await expect(
        nextMessage(
          ws,
          (message) => message.type === 'value' && message.key === 'manual.coils.vacuum.out',
        ),
      ).resolves.toMatchObject({ value: true });

      send(ws, { type: 'read', key: 'manual.coils.vacuum.status' });
      await expect(
        nextMessage(
          ws,
          (message) => message.type === 'value' && message.key === 'manual.coils.vacuum.status',
        ),
      ).resolves.toMatchObject({ value: 2 });

      send(ws, { type: 'write', key: 'manual.coils.vacuum.force', value: 'Off', requestId: 'off' });
      await expect(
        nextMessage(ws, (message) => message.type === 'written' && message.requestId === 'off'),
      ).resolves.toMatchObject({ key: 'manual.coils.vacuum.force' });

      send(ws, { type: 'read', key: 'manual.coils.vacuum.out' });
      await expect(
        nextMessage(
          ws,
          (message) => message.type === 'value' && message.key === 'manual.coils.vacuum.out',
        ),
      ).resolves.toMatchObject({ value: false });

      send(ws, { type: 'read', key: 'manual.coils.vacuum.status' });
      await expect(
        nextMessage(
          ws,
          (message) => message.type === 'value' && message.key === 'manual.coils.vacuum.status',
        ),
      ).resolves.toMatchObject({ value: 3 });

      send(ws, {
        type: 'write',
        key: 'manual.coils.vacuum.force',
        value: 'Auto',
        requestId: 'auto',
      });
      await expect(
        nextMessage(ws, (message) => message.type === 'written' && message.requestId === 'auto'),
      ).resolves.toMatchObject({ key: 'manual.coils.vacuum.force' });

      send(ws, { type: 'read', key: 'manual.coils.vacuum.status' });
      await expect(
        nextMessage(
          ws,
          (message) => message.type === 'value' && message.key === 'manual.coils.vacuum.status',
        ),
      ).resolves.toMatchObject({ value: 0 });

      ws.close();
    } finally {
      await stopServer(server);
    }
  });

  test('models recipe load as selected index plus command readback in mock mode', async () => {
    const port = pickPort();
    const server = startServer(port, 'mock');

    try {
      await waitForHealth(port);
      const ws = await connectWs(port);
      await nextMessage(ws, (message) => message.type === 'status');

      send(ws, {
        type: 'write',
        key: 'recipe.selectedIndex',
        value: 3,
        requestId: 'select-recipe',
      });
      await expect(
        nextMessage(
          ws,
          (message) => message.type === 'written' && message.requestId === 'select-recipe',
        ),
      ).resolves.toMatchObject({
        key: 'recipe.selectedIndex',
      });

      send(ws, { type: 'read', key: 'recipe.activeIndex' });
      await expect(
        nextMessage(
          ws,
          (message) => message.type === 'value' && message.key === 'recipe.activeIndex',
        ),
      ).resolves.toMatchObject({ value: 1 });

      send(ws, { type: 'write', key: 'recipe.command', value: 'Load', requestId: 'load-recipe' });
      await expect(
        nextMessage(
          ws,
          (message) => message.type === 'written' && message.requestId === 'load-recipe',
        ),
      ).resolves.toMatchObject({
        key: 'recipe.command',
      });

      send(ws, { type: 'read', key: 'recipe.activeIndex' });
      await expect(
        nextMessage(
          ws,
          (message) => message.type === 'value' && message.key === 'recipe.activeIndex',
        ),
      ).resolves.toMatchObject({ value: 3 });

      send(ws, { type: 'read', key: 'recipe.hasUnsavedChanges' });
      await expect(
        nextMessage(
          ws,
          (message) => message.type === 'value' && message.key === 'recipe.hasUnsavedChanges',
        ),
      ).resolves.toMatchObject({ value: false });

      ws.close();
    } finally {
      await stopServer(server);
    }
  });

  test('rejects recipe values outside contract bounds and malformed commands', async () => {
    const port = pickPort();
    const server = startServer(port, 'mock');

    try {
      await waitForHealth(port);
      const ws = await connectWs(port);
      await nextMessage(ws, (message) => message.type === 'status');

      send(ws, { type: 'write', key: 'recipe.selectedIndex', value: 21, requestId: 'bad-index' });
      await expect(
        nextMessage(ws, (message) => message.type === 'error' && message.requestId === 'bad-index'),
      ).resolves.toMatchObject({
        key: 'recipe.selectedIndex',
        message: 'MF.HMI.Recipe.nSelectedIndex value 21 is above maximum 20',
      });

      send(ws, { type: 'write', key: 'recipe.command', value: 'Reset', requestId: 'bad-command' });
      await expect(
        nextMessage(
          ws,
          (message) => message.type === 'error' && message.requestId === 'bad-command',
        ),
      ).resolves.toMatchObject({
        key: 'recipe.command',
        message: 'MF.HMI.Recipe.eCommand expects E_RecipeCommand',
      });

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

  test('reports an error when ADS mode rejects a recipe command write', async () => {
    const port = pickPort();
    const server = startServer(port, 'ads');

    try {
      await waitForHealth(port);
      const ws = await connectWs(port);
      await nextMessage(ws, (message) => message.type === 'status');

      send(ws, { type: 'write', key: 'recipe.command', value: 'Load', requestId: 'ads-load' });

      await expect(
        nextMessage(
          ws,
          (message) => message.type === 'error' && message.key === 'recipe.command',
          8000,
        ),
      ).resolves.toMatchObject({
        key: 'recipe.command',
        requestId: 'ads-load',
      });

      ws.close();
    } finally {
      await stopServer(server);
    }
  });

  test('reports an error when ADS mode rejects a coil force write', async () => {
    const port = pickPort();
    const server = startServer(port, 'ads');

    try {
      await waitForHealth(port);
      const ws = await connectWs(port);
      await nextMessage(ws, (message) => message.type === 'status');

      send(ws, {
        type: 'write',
        key: 'manual.coils.vacuum.force',
        value: 'On',
        requestId: 'ads-force',
      });

      await expect(
        nextMessage(
          ws,
          (message) => message.type === 'error' && message.key === 'manual.coils.vacuum.force',
          8000,
        ),
      ).resolves.toMatchObject({
        key: 'manual.coils.vacuum.force',
        requestId: 'ads-force',
      });

      ws.close();
    } finally {
      await stopServer(server);
    }
  });
});
