import { Client } from 'ads-client';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { extname, join, relative, resolve, sep } from 'path';
import {
  buildContractIndex,
  buildMockValues,
  canRead,
  canWrite,
  coerceContractValue,
} from './src/lib/contractRuntime.js';

const args = new Set(process.argv.slice(2));
const DIST = resolve(import.meta.dirname, 'dist');
const CONTRACT_PATH = resolve(import.meta.dirname, 'src/lib/machine-contract.json');
const PORT = Number(process.env.PORT ?? 3001);
const MODE = (process.env.HMI_MODE ?? 'mock').toLowerCase();
const WS_OPEN = 1;
const machineContract = JSON.parse(readFileSync(CONTRACT_PATH, 'utf8'));
const { symbols: contractSymbols } = buildContractIndex(machineContract);

const ADS_CONFIG = {
  targetAmsNetId: process.env.ADS_TARGET_AMS ?? '127.0.0.1.1.1',
  targetAdsPort: Number(process.env.ADS_TARGET_PORT ?? 851),
  routerAddress: process.env.ADS_ROUTER_ADDRESS,
  routerTcpPort: process.env.ADS_ROUTER_TCP_PORT
    ? Number(process.env.ADS_ROUTER_TCP_PORT)
    : undefined,
  localAddress: process.env.ADS_LOCAL_ADDRESS,
  localAmsNetId: process.env.ADS_LOCAL_AMS,
  localAdsPort: process.env.ADS_LOCAL_PORT ? Number(process.env.ADS_LOCAL_PORT) : undefined,
  timeoutDelay: Number(process.env.ADS_TIMEOUT_MS ?? 5000),
  autoReconnect: true,
  reconnectInterval: Number(process.env.ADS_RECONNECT_MS ?? 3000),
  allowHalfOpen: true,
};

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8',
};

let ads;
let adsConnected = false;
let connectingPromise;
let statusMessage = MODE === 'ads' ? 'ADS not connected yet' : 'Mock mode active';
const subscriptions = new Map();
const activeKeys = new Map();
const mockValues = buildMockValues(contractSymbols);
const staticFiles = loadStaticFiles(DIST);

function cleanConfig(config) {
  return Object.fromEntries(Object.entries(config).filter(([, value]) => value !== undefined));
}

function send(ws, payload) {
  if (ws.readyState === WS_OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function broadcastValue(key, value) {
  const entry = contractSymbols[key];
  mockValues.set(key, value);
  broadcast({ type: 'value', key, symbol: entry.symbol, value });
}

function handleMockRecipeCommand(command) {
  broadcastValue('recipe.command', command);

  if (command === machineContract.enums.E_RecipeCommand.Load) {
    broadcastValue('recipe.activeIndex', mockValues.get('recipe.selectedIndex'));
    broadcastValue('recipe.hasUnsavedChanges', false);
  } else if (command === machineContract.enums.E_RecipeCommand.Save) {
    broadcastValue('recipe.hasUnsavedChanges', false);
  } else if (command === machineContract.enums.E_RecipeCommand.Discard) {
    broadcastValue('recipe.selectedIndex', mockValues.get('recipe.activeIndex'));
    broadcastValue('recipe.hasUnsavedChanges', false);
  }

  if (command !== machineContract.enums.E_RecipeCommand.None) {
    broadcastValue('recipe.command', machineContract.enums.E_RecipeCommand.None);
  }
}

function handleMockCoilForce(key, forceMode) {
  const prefix = key.replace(/\.force$/, '');
  const statusValues = machineContract.enums.E_ForceStatus;
  const forceValues = machineContract.enums.E_ForceMode;

  broadcastValue(key, forceMode);

  if (forceMode === forceValues.On) {
    broadcastValue(`${prefix}.status`, statusValues.ForcedOn);
    broadcastValue(`${prefix}.out`, true);
    return;
  }

  if (forceMode === forceValues.Off) {
    broadcastValue(`${prefix}.status`, statusValues.ForcedOff);
    broadcastValue(`${prefix}.out`, false);
    return;
  }

  broadcastValue(`${prefix}.status`, statusValues.Inactive);
  broadcastValue(`${prefix}.out`, false);
}

function broadcast(payload) {
  const data = JSON.stringify(payload);
  for (const ws of wss.clients) {
    if (ws.readyState === WS_OPEN) {
      ws.send(data);
    }
  }
}

function statusPayload() {
  return {
    type: 'status',
    ads: adsConnected,
    mode: MODE,
    message: statusMessage,
  };
}

function contractEntry(key, operation) {
  if (typeof key !== 'string' || !key) {
    throw new Error('Message requires a contract key');
  }

  const entry = contractSymbols[key];
  if (!entry) {
    throw new Error(`Unknown contract key: ${key}`);
  }

  if ((operation === 'read' || operation === 'subscribe') && !canRead(entry)) {
    throw new Error(`${key} is not readable`);
  }

  if (operation === 'write' && !canWrite(entry)) {
    throw new Error(`${key} is not writable`);
  }

  return entry;
}

function safeStaticKey(pathname) {
  const relativePath = pathname === '/' ? 'index.html' : pathname.slice(1);
  const filePath = resolve(DIST, relativePath);
  return filePath === DIST || filePath.startsWith(`${DIST}${sep}`)
    ? `/${relative(DIST, filePath).replaceAll('\\', '/')}`
    : '/index.html';
}

function loadStaticFiles(root) {
  const files = new Map();

  if (!existsSync(root)) {
    return files;
  }

  function walk(dir) {
    for (const entry of readdirSync(dir)) {
      const filePath = join(dir, entry);
      const stat = statSync(filePath);

      if (stat.isDirectory()) {
        walk(filePath);
        continue;
      }

      const key = `/${relative(root, filePath).replaceAll('\\', '/')}`;
      const ext = extname(filePath);
      files.set(key, {
        body: readFileSync(filePath),
        contentType: mime[ext] ?? 'application/octet-stream',
        immutable: key.startsWith('/assets/'),
      });
    }
  }

  walk(root);
  return files;
}

const httpServer = createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: true, port: PORT, mode: MODE, ads: adsConnected }));
    return;
  }

  let file = staticFiles.get(safeStaticKey(url.pathname));
  if (!file) {
    file = staticFiles.get('/index.html');
  }

  if (!file) {
    res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('SvelteHMI has not been built. Run npm run build first.');
    return;
  }

  res.writeHead(200, {
    'Content-Type': file.contentType,
    'Cache-Control': file.immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
  });
  res.end(file.body);
});

const wss = new WebSocketServer({ server: httpServer, path: '/api/ws' });

async function connectAds() {
  if (MODE !== 'ads' || adsConnected) return;
  if (connectingPromise) return connectingPromise;

  connectingPromise = (async () => {
    ads = new Client(cleanConfig(ADS_CONFIG));
    ads.on('disconnect', () => {
      adsConnected = false;
      subscriptions.clear();
      statusMessage = 'ADS disconnected; retrying...';
      broadcast(statusPayload());
    });
    ads.on('warning', (message) => {
      statusMessage = message;
      broadcast(statusPayload());
    });

    const connection = await ads.connect();
    adsConnected = true;
    subscriptions.clear();
    statusMessage = `ADS connected to ${connection.targetAmsNetId}:${connection.targetAdsPort}`;
    broadcast(statusPayload());

    for (const [key, active] of activeKeys) {
      await subscribeAds(key, active.cycleTime);
    }
  })();

  try {
    await connectingPromise;
  } catch (error) {
    adsConnected = false;
    subscriptions.clear();
    statusMessage = `ADS connect failed: ${error.message}`;
    console.error(statusMessage);
    broadcast(statusPayload());
  } finally {
    connectingPromise = undefined;
  }
}

async function ensureAds() {
  if (MODE !== 'ads') return;
  if (!adsConnected) {
    await connectAds();
  }
  if (!adsConnected) {
    throw new Error(statusMessage);
  }
}

async function subscribeAds(key, cycleTime) {
  if (subscriptions.has(key)) return;
  const entry = contractEntry(key, 'subscribe');

  const subscription = await ads.subscribe({
    target: entry.symbol,
    cycleTime,
    callback: (data) => {
      broadcast({ type: 'value', key, symbol: entry.symbol, value: data.value });
    },
  });

  subscriptions.set(key, subscription);
}

async function unsubscribeAds(key) {
  const subscription = subscriptions.get(key);
  if (!subscription) return;

  await subscription.unsubscribe();
  subscriptions.delete(key);
}

async function handleRead(key, ws) {
  const entry = contractEntry(key, 'read');

  if (MODE === 'mock') {
    send(ws, { type: 'value', key, symbol: entry.symbol, value: mockValues.get(key) ?? null });
    return;
  }

  await ensureAds();
  const result = await ads.readValue(entry.symbol);
  send(ws, { type: 'value', key, symbol: entry.symbol, value: result.value });
}

async function handleWrite(key, value, ws, requestId) {
  const entry = contractEntry(key, 'write');
  const coercedValue = coerceContractValue(machineContract, entry, value);

  if (MODE === 'mock') {
    if (key === 'recipe.command') {
      handleMockRecipeCommand(coercedValue);
    } else if (key.startsWith('manual.coils.') && key.endsWith('.force')) {
      handleMockCoilForce(key, coercedValue);
    } else {
      broadcastValue(key, coercedValue);
      if (key === 'recipe.selectedIndex' && mockValues.get('recipe.activeIndex') !== coercedValue) {
        broadcastValue('recipe.hasUnsavedChanges', true);
      }
    }
    send(ws, { type: 'written', key, symbol: entry.symbol, requestId });
    return;
  }

  await ensureAds();
  await ads.writeValue(entry.symbol, coercedValue);
  send(ws, { type: 'written', key, symbol: entry.symbol, requestId });
}

async function handleSubscribe(key, cycleTime, ws) {
  const entry = contractEntry(key, 'subscribe');
  addActiveKey(key, cycleTime, ws);

  if (MODE === 'mock') {
    send(ws, { type: 'value', key, symbol: entry.symbol, value: mockValues.get(key) ?? null });
    return;
  }

  await ensureAds();
  await subscribeAds(key, cycleTime);
  const current = await ads.readValue(entry.symbol);
  send(ws, { type: 'value', key, symbol: entry.symbol, value: current.value });
}

async function handleUnsubscribe(key, ws) {
  contractEntry(key, 'subscribe');
  await removeActiveKey(key, ws);

  send(ws, { type: 'unsubscribed', key });
}

function addActiveKey(key, cycleTime, ws) {
  let active = activeKeys.get(key);
  if (!active) {
    active = { cycleTime, clients: new Set() };
    activeKeys.set(key, active);
  }

  active.cycleTime = Math.min(active.cycleTime, cycleTime);
  active.clients.add(ws);

  if (!ws.activeKeys) {
    ws.activeKeys = new Set();
  }
  ws.activeKeys.add(key);
}

async function removeActiveKey(key, ws) {
  const active = activeKeys.get(key);
  if (!active) return;

  active.clients.delete(ws);
  ws.activeKeys?.delete(key);

  if (active.clients.size > 0) return;

  activeKeys.delete(key);
  if (MODE === 'ads') {
    await unsubscribeAds(key);
  }
}

async function clearClientActiveKeys(ws) {
  const keys = [...(ws.activeKeys ?? [])];
  for (const key of keys) {
    await removeActiveKey(key, ws);
  }
}

wss.on('connection', (ws) => {
  send(ws, statusPayload());

  ws.on('message', async (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);

      if (msg.type === 'read') {
        await handleRead(msg.key, ws);
      } else if (msg.type === 'write') {
        await handleWrite(msg.key, msg.value, ws, msg.requestId);
      } else if (msg.type === 'subscribe') {
        await handleSubscribe(msg.key, Number(msg.cycleTime ?? 250), ws);
      } else if (msg.type === 'unsubscribe') {
        await handleUnsubscribe(msg.key, ws);
      } else {
        send(ws, { type: 'error', message: `Unknown message type: ${msg.type}` });
      }
    } catch (error) {
      send(ws, { type: 'error', key: msg?.key, message: error.message, requestId: msg?.requestId });
    }
  });

  ws.on('close', () => {
    void clearClientActiveKeys(ws);
  });
});

setInterval(() => {
  if (MODE === 'mock') {
    const next = Number(mockValues.get('metrics.trayCount') ?? 0) + 1;
    mockValues.set('metrics.trayCount', next);
    mockValues.set('metrics.traysPerMinute', Number((next % 12) * 1.5));
    broadcast({
      type: 'value',
      key: 'metrics.trayCount',
      symbol: contractSymbols['metrics.trayCount'].symbol,
      value: next,
    });
    broadcast({
      type: 'value',
      key: 'metrics.traysPerMinute',
      symbol: contractSymbols['metrics.traysPerMinute'].symbol,
      value: mockValues.get('metrics.traysPerMinute'),
    });
  } else if (!adsConnected) {
    connectAds();
  }
}, 3000);

if (args.has('--smoke')) {
  console.log(JSON.stringify({ ok: true, config: cleanConfig(ADS_CONFIG), mode: MODE }));
  process.exit(0);
}

httpServer.listen(PORT, '0.0.0.0', async () => {
  console.log(`SvelteHMI server listening on http://0.0.0.0:${PORT}`);
  console.log(`Mode: ${MODE}`);
  console.log(`Static files cached: ${staticFiles.size}`);
  await connectAds();
});
