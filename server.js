import { Client } from 'ads-client';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { extname, join, relative, resolve, sep } from 'path';

const args = new Set(process.argv.slice(2));
const DIST = resolve(import.meta.dirname, 'dist');
const PORT = Number(process.env.PORT ?? 3001);
const MODE = (process.env.HMI_MODE ?? 'mock').toLowerCase();
const WS_OPEN = 1;

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
const activeSymbols = new Map();
const mockValues = new Map([
  ['MAIN.bMachineIsInitialized', true],
  ['Inputs.bControlPower', true],
  ['Inputs.bSafetyCircuitOK', true],
  ['Inputs.bCycleSwitch', false],
  ['Inputs.bStartButton', false],
  ['Inputs.bHopperIsNotEmptyPE', true],
  ['Inputs.bTrayPickedPE', false],
  ['Inputs.bOutfeedSensor', false],
  ['MF.Coils.Vacuum.bOut', false],
  ['MF.Coils.OutfeedConveyor.bOut', false],
  ['MF.Coils.BackStops.bOut', false],
  ['C.nRECIPE_MAX_COUNT', 20],
  ['MF.HMI.Recipe.nActiveIndex', 1],
  ['MF.HMI.Recipe.nSelectedIndex', 1],
  ['MF.HMI.nPatternIndex', 1],
  ['MF.HMI.bDryCycleEnable', false],
  ['MF.Metrics.nTrayCount', 0],
  ['MF.Metrics.rTraysPerMinute', 0],
  ['MF.Metrics.nTraysLastMinute', 0],
  ['MF.Metrics.nTraysLastHour', 0],
]);
const staticFiles = loadStaticFiles(DIST);

function cleanConfig(config) {
  return Object.fromEntries(Object.entries(config).filter(([, value]) => value !== undefined));
}

function send(ws, payload) {
  if (ws.readyState === WS_OPEN) {
    ws.send(JSON.stringify(payload));
  }
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

    for (const [symbol, cycleTime] of activeSymbols) {
      await subscribeAds(symbol, cycleTime);
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

async function subscribeAds(symbol, cycleTime) {
  if (subscriptions.has(symbol)) return;

  const subscription = await ads.subscribe({
    target: symbol,
    cycleTime,
    callback: (data) => {
      broadcast({ type: 'value', symbol, value: data.value });
    },
  });

  subscriptions.set(symbol, subscription);
}

async function handleRead(symbol, ws) {
  if (MODE === 'mock') {
    send(ws, { type: 'value', symbol, value: mockValues.get(symbol) ?? null });
    return;
  }

  await ensureAds();
  const result = await ads.readValue(symbol);
  send(ws, { type: 'value', symbol, value: result.value });
}

async function handleWrite(symbol, value, ws) {
  if (MODE === 'mock') {
    mockValues.set(symbol, value);
    broadcast({ type: 'value', symbol, value });
    return;
  }

  await ensureAds();
  await ads.writeValue(symbol, value);
  send(ws, { type: 'written', symbol });
}

async function handleSubscribe(symbol, cycleTime, ws) {
  activeSymbols.set(symbol, cycleTime);

  if (MODE === 'mock') {
    send(ws, { type: 'value', symbol, value: mockValues.get(symbol) ?? null });
    return;
  }

  await ensureAds();
  await subscribeAds(symbol, cycleTime);
  const current = await ads.readValue(symbol);
  send(ws, { type: 'value', symbol, value: current.value });
}

wss.on('connection', (ws) => {
  send(ws, statusPayload());

  ws.on('message', async (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);

      if (msg.type === 'read') {
        await handleRead(msg.symbol, ws);
      } else if (msg.type === 'write') {
        await handleWrite(msg.symbol, msg.value, ws);
      } else if (msg.type === 'subscribe') {
        await handleSubscribe(msg.symbol, Number(msg.cycleTime ?? 250), ws);
      } else {
        send(ws, { type: 'error', message: `Unknown message type: ${msg.type}` });
      }
    } catch (error) {
      send(ws, { type: 'error', symbol: msg?.symbol, message: error.message });
    }
  });
});

setInterval(() => {
  if (MODE === 'mock') {
    const next = Number(mockValues.get('MF.Metrics.nTrayCount') ?? 0) + 1;
    mockValues.set('MF.Metrics.nTrayCount', next);
    mockValues.set('MF.Metrics.rTraysPerMinute', Number((next % 12) * 1.5));
    broadcast({ type: 'value', symbol: 'MF.Metrics.nTrayCount', value: next });
    broadcast({
      type: 'value',
      symbol: 'MF.Metrics.rTraysPerMinute',
      value: mockValues.get('MF.Metrics.rTraysPerMinute'),
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
