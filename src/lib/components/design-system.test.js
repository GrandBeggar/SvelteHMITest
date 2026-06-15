import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { afterEach, expect, test } from 'vitest';
import NumPad from './NumPad.svelte';
import StateMachineChip from './StateMachineChip.svelte';
import StatusBanner from './StatusBanner.svelte';
import { stateMachineClass, stateMachineLabel } from './stateMachine.js';

afterEach(() => {
  cleanup();
});

test('maps numeric machine states to ISA-101 chip classes and labels', () => {
  expect(stateMachineClass(4)).toBe('state-running');
  expect(stateMachineLabel(7)).toBe('Faulted');

  render(StateMachineChip, { props: { state: 3 } });

  const chip = screen.getByText('Ready');
  expect(chip.classList.contains('state-ready')).toBe(true);
  expect(chip.getAttribute('data-state')).toBe('ready');
});

test('renders connection status without ADS-specific wiring', () => {
  render(StatusBanner, {
    props: {
      online: true,
      label: 'PLC Connected',
      detail: 'Mock mode active',
    },
  });

  expect(screen.getByRole('status')).toBeTruthy();
  expect(screen.getByText('PLC Connected')).toBeTruthy();
  expect(screen.getByText('Mock mode active')).toBeTruthy();
});

test('numpad accepts clamped numeric entry through callbacks', async () => {
  let accepted;
  let closeCount = 0;

  render(NumPad, {
    props: {
      open: true,
      label: 'Pattern',
      currentValue: 1,
      min: 0,
      max: 20,
      onaccept: (value) => {
        accepted = value;
      },
      onclose: () => {
        closeCount += 1;
      },
    },
  });

  await fireEvent.click(screen.getByRole('button', { name: '1' }));
  await fireEvent.click(screen.getByRole('button', { name: '2' }));
  await fireEvent.click(screen.getByRole('button', { name: '.' }));
  await fireEvent.click(screen.getByRole('button', { name: '5' }));
  await fireEvent.click(screen.getByRole('button', { name: 'Accept' }));

  expect(accepted).toBe(12.5);
  expect(closeCount).toBe(1);
});

test('numpad cancel closes without accepting', async () => {
  let accepted;
  let closeCount = 0;

  render(NumPad, {
    props: {
      open: true,
      label: 'Recipe',
      currentValue: 4,
      onaccept: (value) => {
        accepted = value;
      },
      onclose: () => {
        closeCount += 1;
      },
    },
  });

  await fireEvent.click(screen.getByRole('button', { name: '7' }));
  await fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

  expect(accepted).toBeUndefined();
  expect(closeCount).toBe(1);
});
