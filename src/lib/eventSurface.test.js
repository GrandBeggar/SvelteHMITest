import { describe, expect, test } from 'vitest';
import { deriveEventConditions, eventSummary } from './eventSurface.js';

const now = 10_000;
const liveMeta = {
  'runtime.initialized': { updatedAt: now },
  'safety.controlPower': { updatedAt: now },
  'safety.circuitOk': { updatedAt: now },
  'input.hopperNotEmpty': { updatedAt: now },
  'input.outfeedSensor': { updatedAt: now },
};
const normalValues = {
  'runtime.initialized': true,
  'safety.controlPower': true,
  'safety.circuitOk': true,
  'input.hopperNotEmpty': true,
  'input.outfeedSensor': false,
};
const onlineStatus = {
  gateway: true,
  ads: true,
  mode: 'ads',
  message: 'ADS connected',
};

describe('event surface derivation', () => {
  test('reports no active conditions from normal live status inputs', () => {
    const rows = deriveEventConditions({
      values: normalValues,
      status: onlineStatus,
      valueMeta: liveMeta,
      now,
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      severity: 'running',
      title: 'No active machine conditions',
      source: 'contract status inputs',
    });
    expect(eventSummary(rows)).toBe('No Active Conditions');
  });

  test('reports active safety conditions from real contract keys', () => {
    const rows = deriveEventConditions({
      values: { ...normalValues, 'safety.circuitOk': false },
      status: onlineStatus,
      valueMeta: liveMeta,
      now,
    });

    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          severity: 'faulted',
          title: 'Safety circuit open',
          source: 'safety.circuitOk',
          quality: 'live',
        }),
      ]),
    );
    expect(eventSummary(rows)).toBe('Active Condition');
  });

  test('reports ADS offline without inventing alarm acknowledge semantics', () => {
    const rows = deriveEventConditions({
      values: normalValues,
      status: { ...onlineStatus, ads: false, message: 'ADS disconnected' },
      valueMeta: liveMeta,
      now,
    });

    expect(rows[0]).toMatchObject({
      severity: 'offline',
      title: 'Gateway or ADS offline',
      detail: 'ADS disconnected',
    });
    expect(rows.map((row) => row.title).join(' ')).not.toMatch(/ack|reset|clear/i);
    expect(eventSummary(rows)).toBe('Event Source Offline');
  });

  test('reports stale status data per symbol', () => {
    const rows = deriveEventConditions({
      values: normalValues,
      status: onlineStatus,
      valueMeta: { ...liveMeta, 'safety.controlPower': { updatedAt: 1 } },
      now,
      staleMs: 2000,
    });

    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          severity: 'paused',
          title: 'Control power stale',
          source: 'safety.controlPower',
          quality: 'stale',
        }),
      ]),
    );
    expect(eventSummary(rows)).toBe('Event Source Stale');
  });
});
