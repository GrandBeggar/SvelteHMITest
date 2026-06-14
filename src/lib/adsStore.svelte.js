const values = $state({});
const status = $state({
  gateway: false,
  ads: false,
  mode: 'unknown',
  message: 'Connecting to gateway...',
});

let ws;
let reconnectTimer;
const pendingSubscriptions = new Map();

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
      values[msg.symbol] = msg.value;
      return;
    }

    if (msg.type === 'error') {
      status.message = msg.symbol ? `${msg.symbol}: ${msg.message}` : msg.message;
    }
  };

  ws.onclose = () => {
    status.gateway = false;
    status.ads = false;
    status.message = 'Gateway disconnected; retrying...';
    reconnectTimer = setTimeout(connect, 2000);
  };

  ws.onerror = () => {
    status.message = 'Gateway socket error';
  };
}

export function subscribe(symbol, cycleTime = 250) {
  const payload = { type: 'subscribe', symbol, cycleTime };
  pendingSubscriptions.set(symbol, payload);
  send(payload);
}

export function read(symbol) {
  send({ type: 'read', symbol });
}

export function write(symbol, value) {
  send({ type: 'write', symbol, value });
}

export function getValues() {
  return values;
}

export function getStatus() {
  return status;
}

connect();
