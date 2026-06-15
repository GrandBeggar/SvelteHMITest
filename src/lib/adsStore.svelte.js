const values = $state({});
const valueMeta = $state({});
const status = $state({
  gateway: false,
  ads: false,
  mode: 'unknown',
  message: 'Connecting to gateway...',
});

let ws;
let reconnectTimer;
let nextRequestId = 1;
const pendingSubscriptions = new Map();
const pendingWrites = new Map();

function wsUrl() {
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${location.host}/api/ws`;
}

function send(payload) {
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
    return true;
  }
  return false;
}

function connect() {
  clearTimeout(reconnectTimer);
  ws = new WebSocket(wsUrl());

  ws.onopen = () => {
    status.gateway = true;
    status.message = 'Gateway connected';
    for (const payload of pendingSubscriptions.values()) {
      send(payload);
    }
  };

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);

    if (msg.type === 'status') {
      status.gateway = true;
      status.ads = Boolean(msg.ads);
      status.mode = msg.mode ?? status.mode;
      status.message = msg.message ?? (status.ads ? 'ADS connected' : 'ADS disconnected');
      return;
    }

    if (msg.type === 'value') {
      values[msg.key] = msg.value;
      valueMeta[msg.key] = { updatedAt: Date.now() };
      return;
    }

    if (msg.type === 'written') {
      settleWrite(msg.requestId, null, msg);
      return;
    }

    if (msg.type === 'error') {
      status.message = msg.key ? `${msg.key}: ${msg.message}` : msg.message;
      settleWrite(msg.requestId, new Error(status.message));
    }
  };

  ws.onclose = () => {
    status.gateway = false;
    status.ads = false;
    status.message = 'Gateway disconnected; retrying...';
    rejectPendingWrites(new Error(status.message));
    reconnectTimer = setTimeout(connect, 2000);
  };

  ws.onerror = () => {
    status.message = 'Gateway socket error';
  };
}

function settleWrite(requestId, error, result) {
  if (!requestId || !pendingWrites.has(requestId)) return;
  const pending = pendingWrites.get(requestId);
  clearTimeout(pending.timeout);
  pendingWrites.delete(requestId);

  if (error) {
    pending.reject(error);
    return;
  }

  pending.resolve(result);
}

function rejectPendingWrites(error) {
  for (const requestId of pendingWrites.keys()) {
    settleWrite(requestId, error);
  }
}

export function subscribe(key, cycleTime = 250) {
  const payload = { type: 'subscribe', key, cycleTime };
  pendingSubscriptions.set(key, payload);
  send(payload);
}

export function unsubscribe(key) {
  pendingSubscriptions.delete(key);
  send({ type: 'unsubscribe', key });
}

export function read(key) {
  send({ type: 'read', key });
}

export function write(key, value, { timeoutMs = 4000 } = {}) {
  const requestId = `write-${nextRequestId++}`;
  const payload = { type: 'write', key, value, requestId };

  if (!send(payload)) {
    return Promise.reject(new Error('Gateway is not connected'));
  }

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      pendingWrites.delete(requestId);
      reject(new Error(`${key} write timed out`));
    }, timeoutMs);

    pendingWrites.set(requestId, { resolve, reject, timeout });
  });
}

export function getValues() {
  return values;
}

export function getValueMeta() {
  return valueMeta;
}

export function getStatus() {
  return status;
}

connect();
