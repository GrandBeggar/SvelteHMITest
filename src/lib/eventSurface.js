const monitoredKeys = [
  'runtime.initialized',
  'safety.controlPower',
  'safety.circuitOk',
  'input.hopperNotEmpty',
  'input.outfeedSensor',
];

const monitoredLabels = {
  'runtime.initialized': 'PLC initialized',
  'safety.controlPower': 'Control power',
  'safety.circuitOk': 'Safety circuit',
  'input.hopperNotEmpty': 'Hopper stock',
  'input.outfeedSensor': 'Outfeed sensor',
};

function connectionOnline(status) {
  return Boolean(status.gateway && (status.ads || status.mode === 'mock'));
}

function symbolQuality(key, values, valueMeta, now, online, staleMs) {
  if (values[key] === undefined || values[key] === null) return 'unknown';
  if (!online) return 'stale';

  const updatedAt = valueMeta[key]?.updatedAt;
  if (!updatedAt || now - updatedAt > staleMs) return 'stale';
  return 'live';
}

function pushCondition(rows, condition) {
  rows.push({
    type: 'condition',
    severity: condition.severity,
    title: condition.title,
    detail: condition.detail,
    source: condition.source,
    quality: condition.quality,
  });
}

function deriveEventConditions({
  values,
  status,
  valueMeta = {},
  now = Date.now(),
  staleMs = 2000,
}) {
  const online = connectionOnline(status);
  const rows = [];

  if (!online) {
    rows.push({
      type: 'connection',
      severity: 'offline',
      title: 'Gateway or ADS offline',
      detail: status.message || 'Event source unavailable',
      source: status.mode || 'gateway',
      quality: 'stale',
    });
  }

  for (const key of monitoredKeys) {
    const quality = symbolQuality(key, values, valueMeta, now, online, staleMs);
    if (quality === 'live') continue;

    rows.push({
      type: 'quality',
      severity: quality === 'stale' ? 'paused' : 'waiting',
      title: `${monitoredLabels[key]} ${quality === 'stale' ? 'stale' : 'unknown'}`,
      detail: key,
      source: key,
      quality,
    });
  }

  if (symbolQuality('safety.controlPower', values, valueMeta, now, online, staleMs) !== 'unknown') {
    if (values['safety.controlPower'] === false) {
      pushCondition(rows, {
        severity: 'faulted',
        title: 'Control power off',
        detail: 'Safety controller input is false',
        source: 'safety.controlPower',
        quality: symbolQuality('safety.controlPower', values, valueMeta, now, online, staleMs),
      });
    }
  }

  if (symbolQuality('safety.circuitOk', values, valueMeta, now, online, staleMs) !== 'unknown') {
    if (values['safety.circuitOk'] === false) {
      pushCondition(rows, {
        severity: 'faulted',
        title: 'Safety circuit open',
        detail: 'Safety circuit input is false',
        source: 'safety.circuitOk',
        quality: symbolQuality('safety.circuitOk', values, valueMeta, now, online, staleMs),
      });
    }
  }

  if (symbolQuality('runtime.initialized', values, valueMeta, now, online, staleMs) !== 'unknown') {
    if (values['runtime.initialized'] === false) {
      pushCondition(rows, {
        severity: 'hold',
        title: 'PLC not initialized',
        detail: 'Runtime initialized bit is false',
        source: 'runtime.initialized',
        quality: symbolQuality('runtime.initialized', values, valueMeta, now, online, staleMs),
      });
    }
  }

  if (
    symbolQuality('input.hopperNotEmpty', values, valueMeta, now, online, staleMs) !== 'unknown'
  ) {
    if (values['input.hopperNotEmpty'] === false) {
      pushCondition(rows, {
        severity: 'hold',
        title: 'Hopper empty',
        detail: 'Material input is false',
        source: 'input.hopperNotEmpty',
        quality: symbolQuality('input.hopperNotEmpty', values, valueMeta, now, online, staleMs),
      });
    }
  }

  if (symbolQuality('input.outfeedSensor', values, valueMeta, now, online, staleMs) !== 'unknown') {
    if (values['input.outfeedSensor'] === true) {
      pushCondition(rows, {
        severity: 'hold',
        title: 'Outfeed sensor blocked',
        detail: 'Outfeed sensor input is true',
        source: 'input.outfeedSensor',
        quality: symbolQuality('input.outfeedSensor', values, valueMeta, now, online, staleMs),
      });
    }
  }

  if (rows.length === 0) {
    rows.push({
      type: 'normal',
      severity: 'running',
      title: 'No active machine conditions',
      detail: 'Monitored status inputs are normal',
      source: 'contract status inputs',
      quality: 'live',
    });
  }

  return rows;
}

function eventSummary(rows) {
  if (rows.some((row) => row.severity === 'offline')) return 'Event Source Offline';
  if (rows.some((row) => row.severity === 'faulted')) return 'Active Condition';
  if (rows.some((row) => row.severity === 'paused' || row.severity === 'waiting')) {
    return 'Event Source Stale';
  }
  return 'No Active Conditions';
}

export { deriveEventConditions, eventSummary, monitoredKeys };
