import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

class MockWebSocket {
  static OPEN = 1;
  static instances = [];

  readyState = MockWebSocket.OPEN;
  sent = [];

  constructor(url) {
    this.url = url;
    MockWebSocket.instances.push(this);
    setTimeout(() => this.onopen?.(), 0);
  }

  send(payload) {
    this.sent.push(JSON.parse(payload));
  }

  receive(payload) {
    this.onmessage?.({ data: JSON.stringify(payload) });
  }

  close() {
    this.readyState = 3;
    this.onclose?.();
  }
}

beforeEach(() => {
  MockWebSocket.instances = [];
  vi.stubGlobal('WebSocket', MockWebSocket);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function sendStatus(ws, status) {
  ws.receive({
    type: 'status',
    ads: true,
    mode: 'ads',
    message: 'ADS connected',
    ...status,
  });
}

function sendValue(ws, key, value) {
  ws.receive({ type: 'value', key, value });
}

function sendOverviewValues(ws, overrides = {}) {
  const values = {
    'runtime.initialized': true,
    'safety.controlPower': true,
    'safety.circuitOk': true,
    'input.cycleSwitch': false,
    'input.startButton': false,
    'input.hopperNotEmpty': true,
    'input.trayPicked': false,
    'input.outfeedSensor': false,
    'recipe.maxCount': 20,
    'recipe.activeIndex': 1,
    'recipe.selectedIndex': 1,
    'pattern.index': 2,
    'mode.dryCycleEnable': false,
    'metrics.trayCount': 42,
    'metrics.lastCycleTimeMs': 1200,
    'metrics.traysPerMinute': 8.5,
    'metrics.traysLastMinute': 9,
    'metrics.traysLastHour': 480,
    'state.machine': 'Ready',
    'state.machine.isIdle': true,
    'state.machine.cycleActive': false,
    'state.machine.cycleOn': false,
    'state.downstream': 'Idle',
    'state.blankPicker': 'Idle',
    'state.gluing': 'GluingIdle',
    'state.backstops': 'Idle',
    'state.forming': 'Idle',
    'state.conveyor': 'Idle',
    'tray.position.picked': false,
    'tray.position.gluing': 0,
    'tray.position.forming': 0,
    'tray.position.firstCycle': false,
    'machine.faulted': false,
    'machine.firstFaultCode': 0,
    'machine.activeFaultCount': 0,
    'parameters.trayDemand.target': 120,
    'parameters.trayDemand.actual': 42,
    'parameters.trayDemand.enabled': true,
    ...overrides,
  };

  for (const [key, value] of Object.entries(values)) {
    sendValue(ws, key, value);
  }
}

function latestSent(ws, predicate) {
  return [...ws.sent].reverse().find(predicate);
}

test('renders the HMI shell and subscribes through contract keys', async () => {
  const { default: App } = await import('./App.svelte');

  render(App);

  expect(screen.getByText('SvelteHMI')).toBeTruthy();
  expect(screen.getByRole('navigation', { name: 'HMI views' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Overview' })).toBeTruthy();
  expect(screen.getByText('Main Page')).toBeTruthy();
  expect(screen.getByText('Machine States')).toBeTruthy();

  await waitFor(() => expect(MockWebSocket.instances.length).toBe(1));
  await waitFor(() => expect(MockWebSocket.instances[0].sent.length).toBeGreaterThan(0));
  const ws = MockWebSocket.instances[0];

  sendStatus(ws, {
    ads: false,
    mode: 'mock',
    message: 'Mock mode active',
  });

  await waitFor(() => expect(screen.getByText('mock')).toBeTruthy());
  sendStatus(ws, {
    ads: false,
    mode: 'ads',
    message: 'ADS disconnected',
  });
  await waitFor(() => expect(screen.getAllByText('ADS offline').length).toBeGreaterThan(0));
  expect(screen.getAllByText('ADS offline').length).toBeGreaterThan(0);
  expect(
    ws.sent.some(
      (payload) => payload.type === 'subscribe' && payload.key === 'runtime.initialized',
    ),
  ).toBe(true);
  expect(
    ws.sent.some((payload) => payload.type === 'subscribe' && payload.key === 'state.machine'),
  ).toBe(true);
  expect(
    ws.sent.some(
      (payload) => payload.type === 'subscribe' && payload.key === 'parameters.trayDemand.target',
    ),
  ).toBe(true);
  expect(
    ws.sent.some(
      (payload) => payload.type === 'subscribe' && payload.key.startsWith('manual.coils.'),
    ),
  ).toBe(false);

  sendStatus(ws, { ads: true, mode: 'ads', message: 'ADS connected' });
  sendOverviewValues(ws);

  await waitFor(() => expect(screen.getAllByText('Machine Ready').length).toBeGreaterThan(0));
  expect(screen.getAllByText('Tray demand 42 / 120').length).toBeGreaterThan(0);
  expect(screen.getByText('Tray target')).toBeTruthy();
  expect(screen.getByText('Tray actual')).toBeTruthy();
  expect(screen.getByText('Demand enabled')).toBeTruthy();
  expect(screen.getByText('Safety')).toBeTruthy();
  expect(screen.getByText('Tray Position')).toBeTruthy();
  expect(screen.getByText('Performance')).toBeTruthy();
  expect(screen.getByText('Trays this min')).toBeTruthy();

  sendValue(ws, 'state.machine', null);

  await waitFor(() => expect(screen.getAllByText('Unknown').length).toBeGreaterThan(0));

  sendValue(ws, 'state.machine', 'Ready');
  sendStatus(ws, { ads: false, mode: 'ads', message: 'ADS disconnected' });

  await waitFor(() => expect(screen.getAllByText('Connection Hold').length).toBeGreaterThan(0));
  expect(screen.getAllByText('Stale').length).toBeGreaterThan(0);

  sendStatus(ws, { ads: true, mode: 'ads', message: 'ADS connected' });
  sendOverviewValues(ws, {
    'recipe.activeIndex': 1,
    'recipe.selectedIndex': 4,
    'recipe.hasUnsavedChanges': true,
  });

  await fireEvent.click(screen.getByRole('button', { name: 'Recipe' }));
  await waitFor(() => expect(screen.getByText('Recipe Controls')).toBeTruthy());

  await fireEvent.click(screen.getByRole('button', { name: 'Load' }));
  await waitFor(() => expect(screen.getByText('Load Recipe')).toBeTruthy());
  await fireEvent.click(screen.getAllByRole('button', { name: 'Load' }).at(-1));

  await waitFor(() =>
    expect(
      ws.sent.some(
        (payload) =>
          payload.type === 'write' && payload.key === 'recipe.selectedIndex' && payload.value === 4,
      ),
    ).toBe(true),
  );
  const selectedWrite = ws.sent.find(
    (payload) => payload.type === 'write' && payload.key === 'recipe.selectedIndex',
  );
  ws.receive({ type: 'written', key: 'recipe.selectedIndex', requestId: selectedWrite.requestId });

  await waitFor(() =>
    expect(
      ws.sent.some(
        (payload) =>
          payload.type === 'write' && payload.key === 'recipe.command' && payload.value === 'Load',
      ),
    ).toBe(true),
  );
  const commandWrite = ws.sent.find(
    (payload) => payload.type === 'write' && payload.key === 'recipe.command',
  );
  ws.receive({ type: 'written', key: 'recipe.command', requestId: commandWrite.requestId });
  sendValue(ws, 'recipe.activeIndex', 4);
  sendValue(ws, 'recipe.hasUnsavedChanges', false);

  await waitFor(() => expect(screen.getAllByText('Recipe 4 loaded').length).toBeGreaterThan(0));

  await fireEvent.click(screen.getByRole('button', { name: 'Save' }));
  await waitFor(() => expect(screen.getByText('Save Recipe')).toBeTruthy());
  await fireEvent.click(screen.getAllByRole('button', { name: 'Save' }).at(-1));

  await waitFor(() =>
    expect(
      ws.sent.some(
        (payload) =>
          payload.type === 'write' && payload.key === 'recipe.command' && payload.value === 'Save',
      ),
    ).toBe(true),
  );

  await fireEvent.click(screen.getByRole('button', { name: 'Diagnostics' }));
  await waitFor(() => expect(screen.getByRole('heading', { name: 'Diagnostics' })).toBeTruthy());
  await waitFor(() =>
    expect(
      ws.sent.some(
        (payload) => payload.type === 'subscribe' && payload.key === 'manual.coils.vacuum.out',
      ),
    ).toBe(true),
  );
  expect(
    ws.sent.some(
      (payload) => payload.type === 'subscribe' && payload.key === 'manual.coils.vacuum.status',
    ),
  ).toBe(true);
  expect(
    ws.sent.some(
      (payload) => payload.type === 'subscribe' && payload.key === 'manual.coils.vacuum.force',
    ),
  ).toBe(false);

  sendValue(ws, 'manual.coils.vacuum.out', false);
  sendValue(ws, 'manual.coils.vacuum.status', 0);

  await waitFor(() => expect(screen.getByText('Vacuum')).toBeTruthy());
  await fireEvent.click(screen.getByLabelText('Service Enable'));
  await fireEvent.click(screen.getByRole('button', { name: 'Force On Vacuum' }));
  await waitFor(() => expect(screen.getByText('Force On Vacuum')).toBeTruthy());
  await fireEvent.click(screen.getByRole('button', { name: 'Force On' }));

  await waitFor(() =>
    expect(
      ws.sent.some(
        (payload) =>
          payload.type === 'write' &&
          payload.key === 'manual.coils.vacuum.force' &&
          payload.value === 'On',
      ),
    ).toBe(true),
  );
  let forceWrite = latestSent(
    ws,
    (payload) =>
      payload.type === 'write' &&
      payload.key === 'manual.coils.vacuum.force' &&
      payload.value === 'On',
  );
  ws.receive({
    type: 'written',
    key: 'manual.coils.vacuum.force',
    requestId: forceWrite.requestId,
  });
  sendValue(ws, 'manual.coils.vacuum.out', true);
  sendValue(ws, 'manual.coils.vacuum.status', 2);
  await waitFor(() => expect(screen.getByText('Vacuum Force On accepted')).toBeTruthy());

  await fireEvent.click(screen.getByRole('button', { name: 'Force Off Vacuum' }));
  await waitFor(() => expect(screen.getByText('Force Off Vacuum')).toBeTruthy());
  await fireEvent.click(screen.getByRole('button', { name: 'Force Off' }));
  await waitFor(() =>
    expect(
      ws.sent.some(
        (payload) =>
          payload.type === 'write' &&
          payload.key === 'manual.coils.vacuum.force' &&
          payload.value === 'Off',
      ),
    ).toBe(true),
  );
  forceWrite = latestSent(
    ws,
    (payload) =>
      payload.type === 'write' &&
      payload.key === 'manual.coils.vacuum.force' &&
      payload.value === 'Off',
  );
  ws.receive({
    type: 'written',
    key: 'manual.coils.vacuum.force',
    requestId: forceWrite.requestId,
  });
  sendValue(ws, 'manual.coils.vacuum.out', false);
  sendValue(ws, 'manual.coils.vacuum.status', 3);
  await waitFor(() => expect(screen.getByText('Vacuum Force Off accepted')).toBeTruthy());

  await fireEvent.click(screen.getByRole('button', { name: 'Return Auto Vacuum' }));
  await waitFor(() => expect(screen.getByText('Auto Vacuum')).toBeTruthy());
  await fireEvent.click(screen.getAllByRole('button', { name: 'Auto' }).at(-1));
  await waitFor(() =>
    expect(
      ws.sent.some(
        (payload) =>
          payload.type === 'write' &&
          payload.key === 'manual.coils.vacuum.force' &&
          payload.value === 'Auto',
      ),
    ).toBe(true),
  );
  forceWrite = latestSent(
    ws,
    (payload) =>
      payload.type === 'write' &&
      payload.key === 'manual.coils.vacuum.force' &&
      payload.value === 'Auto',
  );
  ws.receive({
    type: 'written',
    key: 'manual.coils.vacuum.force',
    requestId: forceWrite.requestId,
  });
  sendValue(ws, 'manual.coils.vacuum.status', 0);
  await waitFor(() => expect(screen.getByText('Vacuum Auto accepted')).toBeTruthy());

  await fireEvent.click(screen.getByRole('button', { name: 'Force On Vacuum' }));
  await waitFor(() => expect(screen.getByText('Force On Vacuum')).toBeTruthy());
  await fireEvent.click(screen.getByRole('button', { name: 'Force On' }));
  await waitFor(() =>
    expect(
      latestSent(
        ws,
        (payload) =>
          payload.type === 'write' &&
          payload.key === 'manual.coils.vacuum.force' &&
          payload.value === 'On',
      ),
    ).toBeTruthy(),
  );
  forceWrite = latestSent(
    ws,
    (payload) =>
      payload.type === 'write' &&
      payload.key === 'manual.coils.vacuum.force' &&
      payload.value === 'On',
  );
  ws.receive({
    type: 'error',
    key: 'manual.coils.vacuum.force',
    message: 'ADS rejected force write',
    requestId: forceWrite.requestId,
  });
  await waitFor(() =>
    expect(screen.getByText('manual.coils.vacuum.force: ADS rejected force write')).toBeTruthy(),
  );

  await fireEvent.click(screen.getByRole('button', { name: 'Recipe' }));
  await waitFor(() =>
    expect(
      ws.sent.some(
        (payload) => payload.type === 'unsubscribe' && payload.key === 'manual.coils.vacuum.out',
      ),
    ).toBe(true),
  );
  expect(
    ws.sent.some(
      (payload) => payload.type === 'unsubscribe' && payload.key === 'manual.coils.vacuum.status',
    ),
  ).toBe(true);

  sendOverviewValues(ws);
  await fireEvent.click(screen.getByRole('button', { name: 'Events' }));
  await waitFor(() => expect(screen.getByRole('heading', { name: 'Event Surface' })).toBeTruthy());
  expect(screen.getByText('PLC Alarm Contract')).toBeTruthy();
  expect(screen.getByText('Not present')).toBeTruthy();
  expect(screen.getByText('Unavailable')).toBeTruthy();
  expect(screen.getByText('No active machine conditions')).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Reset' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Acknowledge' })).toBeNull();

  sendValue(ws, 'safety.circuitOk', false);
  await waitFor(() => expect(screen.getByText('Safety circuit open')).toBeTruthy());

  sendStatus(ws, { ads: false, mode: 'ads', message: 'ADS disconnected' });
  await waitFor(() =>
    expect(screen.getAllByText('Event Source Offline').length).toBeGreaterThan(0),
  );
  expect(screen.getByText('Gateway or ADS offline')).toBeTruthy();

  sendStatus(ws, { ads: true, mode: 'ads', message: 'ADS connected' });
  sendOverviewValues(ws);
  await fireEvent.click(screen.getByRole('button', { name: 'Diagnostics' }));
  await waitFor(() => expect(screen.getByRole('heading', { name: 'Diagnostics' })).toBeTruthy());
  sendValue(ws, 'manual.coils.vacuum.out', false);
  sendValue(ws, 'manual.coils.vacuum.status', 0);
  await fireEvent.click(screen.getByLabelText('Service Enable'));
  await fireEvent.click(screen.getByRole('button', { name: 'Force On Vacuum' }));
  await waitFor(() => expect(screen.getByText('Force On Vacuum')).toBeTruthy());
  await fireEvent.click(screen.getByRole('button', { name: 'Force On' }));
  await waitFor(() =>
    expect(
      latestSent(
        ws,
        (payload) =>
          payload.type === 'write' &&
          payload.key === 'manual.coils.vacuum.force' &&
          payload.value === 'On',
      ),
    ).toBeTruthy(),
  );
  ws.close();

  await waitFor(() => expect(screen.getByText('Gateway disconnected; retrying...')).toBeTruthy());
});
