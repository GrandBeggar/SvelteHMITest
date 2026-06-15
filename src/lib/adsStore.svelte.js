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
      values[msg.key] = msg.value;
      return;
    }

    if (msg.type === 'error') {
      status.message = msg.key ? `${msg.key}: ${msg.message}` : msg.message;
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

export function subscribe(key, cycleTime = 250) {
  const payload = { type: 'subscribe', key, cycleTime };
  pendingSubscriptions.set(key, payload);
  send(payload);
}

export function read(key) {
  send({ type: 'read', key });
}

export function write(key, value) {
  send({ type: 'write', key, value });
}

export function getValues() {
  return values;
}

export function getStatus() {
  return status;
}

connect();
