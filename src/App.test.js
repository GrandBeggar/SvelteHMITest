import { cleanup, render, screen, waitFor } from '@testing-library/svelte';
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
    'recipe.activeIndex': 1,
    'recipe.selectedIndex': 1,
    'pattern.index': 2,
    'mode.dryCycleEnable': false,
    'metrics.trayCount': 42,
    'metrics.lastCycleTimeMs': 1200,
    'metrics.traysPerMinute': 8.5,
    'metrics.traysLastMinute': 9,
    'metrics.traysLastHour': 480,
    ...overrides,
  };

  for (const [key, value] of Object.entries(values)) {
    sendValue(ws, key, value);
  }
}

test('renders the HMI shell and subscribes through contract keys', async () => {
  const { default: App } = await import('./App.svelte');

  render(App);

  expect(screen.getByText('SvelteHMI')).toBeTruthy();
  expect(screen.getByRole('navigation', { name: 'HMI views' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Overview' })).toBeTruthy();
  expect(screen.getByText('Run Screen')).toBeTruthy();
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

  sendStatus(ws, { ads: true, mode: 'ads', message: 'ADS connected' });
  sendOverviewValues(ws);

  await waitFor(() => expect(screen.getAllByText('Machine Ready').length).toBeGreaterThan(0));
  expect(screen.getByText('Press Button to Begin Cycling')).toBeTruthy();
  expect(screen.getByText('Safety')).toBeTruthy();
  expect(screen.getByText('Performance')).toBeTruthy();
  expect(screen.getByText('Trays this min')).toBeTruthy();

  sendValue(ws, 'input.hopperNotEmpty', null);

  await waitFor(() => expect(screen.getAllByText('Unknown').length).toBeGreaterThan(0));

  sendValue(ws, 'input.hopperNotEmpty', true);
  sendStatus(ws, { ads: false, mode: 'ads', message: 'ADS disconnected' });

  await waitFor(() => expect(screen.getAllByText('Connection Hold').length).toBeGreaterThan(0));
  expect(screen.getAllByText('Stale').length).toBeGreaterThan(0);
});
