import { render, screen, waitFor } from '@testing-library/svelte';
import { beforeEach, expect, test, vi } from 'vitest';

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

test('renders the commissioning panel and subscribes through the gateway store', async () => {
  const { default: App } = await import('./App.svelte');

  render(App);

  expect(screen.getByText('SvelteHMI')).toBeTruthy();

  await waitFor(() => expect(MockWebSocket.instances.length).toBe(1));
  await waitFor(() => expect(MockWebSocket.instances[0].sent.length).toBeGreaterThan(0));

  MockWebSocket.instances[0].receive({
    type: 'status',
    ads: false,
    mode: 'mock',
    message: 'Mock mode active',
  });

  await waitFor(() => expect(screen.getByText('Mock mode active')).toBeTruthy());
  expect(
    MockWebSocket.instances[0].sent.some(
      (payload) => payload.type === 'subscribe' && payload.key === 'runtime.initialized',
    ),
  ).toBe(true);
});
