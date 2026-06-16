import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
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

function sendRecipeParameterValues(ws, overrides = {}) {
  const values = {
    'recipe.pattern.current.leading.start': 10,
    'recipe.pattern.current.leading.stop': 20,
    'recipe.pattern.current.trailing.start': 30,
    'recipe.pattern.current.trailing.stop': 40,
    'recipe.pattern.current.guns.lh1': true,
    'recipe.pattern.current.guns.lh2': false,
    'recipe.pattern.current.guns.lh3': false,
    'recipe.pattern.current.guns.rh1': true,
    'recipe.pattern.current.guns.rh2': false,
    'recipe.pattern.current.guns.rh3': false,
    'parameters.gluing.lh1Offset': 1,
    'parameters.gluing.lh2Offset': 2,
    'parameters.gluing.lh3Offset': 3,
    'parameters.gluing.rh1Offset': 4,
    'parameters.gluing.rh2Offset': 5,
    'parameters.gluing.rh3Offset': 6,
    'recipe.forming.backStop.start': 100,
    'recipe.forming.backStop.stop': 110,
    'recipe.forming.bottomStop.start': 120,
    'recipe.forming.bottomStop.stop': 130,
    'recipe.forming.rotary.start': 140,
    'recipe.forming.rotary.stop': 150,
    'recipe.forming.sideAlign.start': 160,
    'recipe.forming.sideAlign.stop': 170,
    'recipe.forming.compression.start': 180,
    'recipe.forming.compression.stop': 190,
    'recipe.vacuum.vacuumOn.start': 200,
    'recipe.vacuum.vacuumOn.stop': 210,
    'recipe.vacuum.verifyTimer': 220,
    ...overrides,
  };

  for (const [key, value] of Object.entries(values)) {
    sendValue(ws, key, value);
  }
}

function latestSent(ws, predicate) {
  return [...ws.sent].reverse().find(predicate);
}

async function enterNumpadDigits(digits) {
  const dialog = screen.getByRole('dialog');
  for (const digit of digits) {
    await fireEvent.click(within(dialog).getByRole('button', { name: digit }));
  }
  await fireEvent.click(within(dialog).getByRole('button', { name: 'Accept' }));
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
  sendRecipeParameterValues(ws);

  await fireEvent.click(screen.getByRole('button', { name: 'Recipe' }));
  await waitFor(() => expect(screen.getByText('Working Recipe')).toBeTruthy());
  expect(screen.getByLabelText('Recipe parameter editor')).toBeTruthy();
  expect(screen.getByLabelText('Gluing recipe parameters')).toBeTruthy();
  expect(screen.getByText('Leading Pattern ms')).toBeTruthy();
  expect(screen.getByText('Trailing Pattern ms')).toBeTruthy();
  expect(screen.getByText('LH3')).toBeTruthy();
  expect(screen.getByText('RH3')).toBeTruthy();
  expect(
    ws.sent.some(
      (payload) =>
        payload.type === 'subscribe' && payload.key === 'recipe.pattern.current.leading.start',
    ),
  ).toBe(true);
  expect(
    ws.sent.some(
      (payload) => payload.type === 'subscribe' && payload.key === 'recipe.forming.rotary.start',
    ),
  ).toBe(true);
  expect(
    ws.sent.some(
      (payload) => payload.type === 'subscribe' && payload.key === 'parameters.gluing.lh3Offset',
    ),
  ).toBe(true);

  await fireEvent.click(screen.getByRole('button', { name: 'Load Recipe' }));
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

  await fireEvent.click(screen.getByRole('button', { name: 'Save Recipe' }));
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

  await fireEvent.click(screen.getByRole('button', { name: 'Apply Pattern' }));
  await waitFor(() => expect(screen.getByText('Apply Pattern')).toBeTruthy());
  await fireEvent.click(screen.getAllByRole('button', { name: 'Apply' }).at(-1));
  await waitFor(() =>
    expect(
      ws.sent.some(
        (payload) =>
          payload.type === 'write' && payload.key === 'pattern.index' && payload.value === 2,
      ),
    ).toBe(true),
  );

  await fireEvent.click(screen.getByRole('button', { name: 'Forming' }));
  await waitFor(() => expect(screen.getByLabelText('Forming recipe parameters')).toBeTruthy());
  expect(screen.getByText('Rotary ms')).toBeTruthy();
  expect(screen.getByText('Side Align ms')).toBeTruthy();
  expect(screen.getByText('Back Stop ms')).toBeTruthy();
  expect(screen.queryByText('Start Position')).toBeNull();
  expect(screen.queryByText('Counts')).toBeNull();

  await fireEvent.click(screen.getByRole('button', { name: '140 ms' }));
  await waitFor(() =>
    expect(screen.getByRole('dialog').textContent).toContain('Rotary ms - Start'),
  );
  await enterNumpadDigits(['2', '5', '0']);
  await waitFor(() => expect(screen.getByText('Write Rotary start')).toBeTruthy());
  await fireEvent.click(screen.getByRole('button', { name: 'Write' }));

  await waitFor(() =>
    expect(
      ws.sent.some(
        (payload) =>
          payload.type === 'write' &&
          payload.key === 'recipe.forming.rotary.start' &&
          payload.value === 250,
      ),
    ).toBe(true),
  );
  let parameterWrite = latestSent(
    ws,
    (payload) => payload.type === 'write' && payload.key === 'recipe.forming.rotary.start',
  );
  ws.receive({
    type: 'written',
    key: 'recipe.forming.rotary.start',
    requestId: parameterWrite.requestId,
  });
  sendValue(ws, 'recipe.forming.rotary.start', 250);
  await waitFor(() =>
    expect(screen.getAllByText('Rotary start accepted').length).toBeGreaterThan(0),
  );

  await fireEvent.click(screen.getByRole('button', { name: '250 ms' }));
  await waitFor(() =>
    expect(screen.getByRole('dialog').textContent).toContain('Rotary ms - Start'),
  );
  await enterNumpadDigits(['+/-', '5']);
  await waitFor(() => expect(screen.getByText('Write Rotary start')).toBeTruthy());
  await fireEvent.click(screen.getByRole('button', { name: 'Write' }));
  await waitFor(() =>
    expect(
      latestSent(
        ws,
        (payload) => payload.type === 'write' && payload.key === 'recipe.forming.rotary.start',
      ).value,
    ).toBe(0),
  );
  parameterWrite = latestSent(
    ws,
    (payload) => payload.type === 'write' && payload.key === 'recipe.forming.rotary.start',
  );
  ws.receive({
    type: 'written',
    key: 'recipe.forming.rotary.start',
    requestId: parameterWrite.requestId,
  });
  sendValue(ws, 'recipe.forming.rotary.start', 0);

  await fireEvent.click(screen.getByRole('button', { name: 'Gluing' }));
  await waitFor(() => expect(screen.getByLabelText('Gluing recipe parameters')).toBeTruthy());
  await fireEvent.click(screen.getByRole('button', { name: 'LH3' }));
  await waitFor(() => expect(screen.getByText('Write LH3 enable')).toBeTruthy());
  await fireEvent.click(screen.getByRole('button', { name: 'Write' }));
  await waitFor(() =>
    expect(
      ws.sent.some(
        (payload) =>
          payload.type === 'write' &&
          payload.key === 'recipe.pattern.current.guns.lh3' &&
          payload.value === true,
      ),
    ).toBe(true),
  );
  parameterWrite = latestSent(
    ws,
    (payload) => payload.type === 'write' && payload.key === 'recipe.pattern.current.guns.lh3',
  );
  ws.receive({
    type: 'error',
    key: 'recipe.pattern.current.guns.lh3',
    message: 'ADS rejected parameter write',
    requestId: parameterWrite.requestId,
  });
  await waitFor(() =>
    expect(
      screen.getAllByText('recipe.pattern.current.guns.lh3: ADS rejected parameter write').length,
    ).toBeGreaterThan(0),
  );

  await fireEvent.click(screen.getByRole('button', { name: '3 ms' }));
  await waitFor(() => expect(screen.getByRole('dialog').textContent).toContain('Offset'));
  await enterNumpadDigits(['9']);
  await waitFor(() => expect(screen.getByText('Write LH3 offset')).toBeTruthy());
  await fireEvent.click(screen.getByRole('button', { name: 'Write' }));
  await waitFor(() =>
    expect(
      latestSent(
        ws,
        (payload) => payload.type === 'write' && payload.key === 'parameters.gluing.lh3Offset',
      ),
    ).toBeTruthy(),
  );
  parameterWrite = latestSent(
    ws,
    (payload) => payload.type === 'write' && payload.key === 'parameters.gluing.lh3Offset',
  );
  ws.receive({
    type: 'written',
    key: 'parameters.gluing.lh3Offset',
    requestId: parameterWrite.requestId,
  });
  sendValue(ws, 'parameters.gluing.lh3Offset', 9);
  await waitFor(() => expect(screen.getAllByText('LH3 offset accepted').length).toBeGreaterThan(0));

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
    message: 'ADS rejected force write during drop check',
    requestId: forceWrite.requestId,
  });

  await fireEvent.click(screen.getByRole('button', { name: 'Recipe' }));
  sendStatus(ws, { ads: true, mode: 'ads', message: 'ADS connected' });
  sendOverviewValues(ws, {
    'recipe.activeIndex': 1,
    'recipe.selectedIndex': 1,
    'recipe.hasUnsavedChanges': false,
  });
  sendRecipeParameterValues(ws);
  await waitFor(() => expect(screen.getByText('Working Recipe')).toBeTruthy());
  await fireEvent.click(screen.getByRole('button', { name: 'Forming' }));
  await waitFor(() => expect(screen.getByLabelText('Forming recipe parameters')).toBeTruthy());
  await fireEvent.click(screen.getByRole('button', { name: '140 ms' }));
  await waitFor(() =>
    expect(screen.getByRole('dialog').textContent).toContain('Rotary ms - Start'),
  );
  await enterNumpadDigits(['2', '5', '0']);
  await waitFor(() => expect(screen.getByText('Write Rotary start')).toBeTruthy());
  await fireEvent.click(screen.getByRole('button', { name: 'Write' }));
  await waitFor(() =>
    expect(
      latestSent(
        ws,
        (payload) => payload.type === 'write' && payload.key === 'recipe.forming.rotary.start',
      ),
    ).toBeTruthy(),
  );
  ws.close();

  await waitFor(() =>
    expect(screen.getAllByText('Gateway disconnected; retrying...').length).toBeGreaterThan(0),
  );
});
