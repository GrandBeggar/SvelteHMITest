import WebSocket from 'ws';
import machineContract from '../src/lib/machine-contract.json' with { type: 'json' };

const url = process.env.SVELTEHMI_LIVE_WS ?? 'ws://127.0.0.1:3001/api/ws';
const minPattern = machineContract.symbols['pattern.index'].bounds.min;
const maxPattern = machineContract.constants.patternCount.value;
const timeoutMs = Number(process.env.SVELTEHMI_LIVE_TIMEOUT_MS ?? 8000);

let requestCounter = 1;

function openSocket() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    ws.once('open', () => resolve(ws));
    ws.once('error', reject);
  });
}

function send(ws, payload) {
  ws.send(JSON.stringify(payload));
}

function waitFor(ws, predicate, label) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      ws.off('message', onMessage);
      reject(new Error(`Timed out waiting for ${label}`));
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

async function readValue(ws, key) {
  send(ws, { type: 'read', key });
  const message = await waitFor(
    ws,
    (candidate) =>
      (candidate.type === 'value' && candidate.key === key) ||
      (candidate.type === 'error' && candidate.key === key),
    `${key} read`,
  );

  if (message.type === 'error') {
    throw new Error(`${key}: ${message.message}`);
  }

  return message.value;
}

async function writeValue(ws, key, value) {
  const requestId = `live-${requestCounter++}`;
  send(ws, { type: 'write', key, value, requestId });
  const message = await waitFor(
    ws,
    (candidate) =>
      (candidate.type === 'written' && candidate.requestId === requestId) ||
      (candidate.type === 'error' && candidate.requestId === requestId),
    `${key} write`,
  );

  if (message.type === 'error') {
    throw new Error(`${key}: ${message.message}`);
  }
}

function alternatePattern(original) {
  if (original < minPattern || original > maxPattern) {
    throw new Error(`Original pattern ${original} is outside ${minPattern}-${maxPattern}`);
  }

  return original === minPattern ? minPattern + 1 : minPattern;
}

const ws = await openSocket();
let original;
let alternate;

try {
  const status = await waitFor(ws, (message) => message.type === 'status', 'gateway status');
  if (status.mode !== 'ads' || !status.ads) {
    throw new Error(`Gateway is not live ADS-connected: ${JSON.stringify(status)}`);
  }

  original = await readValue(ws, 'pattern.index');
  alternate = alternatePattern(original);

  await writeValue(ws, 'pattern.index', alternate);
  const changed = await readValue(ws, 'pattern.index');
  if (changed !== alternate) {
    throw new Error(`Pattern write did not confirm: expected ${alternate}, got ${changed}`);
  }

  await writeValue(ws, 'pattern.index', original);
  const restored = await readValue(ws, 'pattern.index');
  if (restored !== original) {
    throw new Error(`Pattern restore did not confirm: expected ${original}, got ${restored}`);
  }

  console.log(
    JSON.stringify({
      ok: true,
      url,
      original,
      alternate,
      restored,
      timestamp: new Date().toISOString(),
    }),
  );
} catch (error) {
  if (original !== undefined && alternate !== undefined) {
    try {
      await writeValue(ws, 'pattern.index', original);
    } catch {
      // Preserve the original validation error while still attempting restore.
    }
  }
  console.error(error.message);
  process.exitCode = 1;
} finally {
  ws.close();
}
