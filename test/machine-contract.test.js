import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { materializeSymbols, validateContract } from '../scripts/validate-machine-contract.js';

const contract = JSON.parse(readFileSync('src/lib/machine-contract.json', 'utf8'));

describe('machine contract validator', () => {
  test('expands coil contract entries from the PLC coil manager list', () => {
    const symbols = materializeSymbols(contract);

    expect(symbols['manual.coils.vacuum.out'].symbol).toBe('MF.Coils.Vacuum.bOut');
    expect(symbols['manual.coils.vacuum.status'].symbol).toBe('MF.Coils.Vacuum.eStatus');
    expect(symbols['manual.coils.vacuum.force'].symbol).toBe('MF.Coils.Vacuum.eForce');
    expect(
      Object.values(symbols).filter((entry) => entry.symbol.startsWith('MF.Coils.')).length,
    ).toBe(45);
  });

  test('passes against the committed PLC symbol-proof fixture', () => {
    const result = validateContract(contract);

    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
  });

  test('does not read live PLC source paths during committed validation', () => {
    const hermeticContract = structuredClone(contract);

    for (const variant of Object.values(hermeticContract.source.variants)) {
      variant.plcRoot = 'Z:\\not-a-real-plc-source';
      variant.tmc = 'Z:\\not-a-real-symbol-table.tmc';
    }

    const result = validateContract(hermeticContract);

    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
  });

  test('rejects writable access to the ST_HMI bStepEnable AT %I* trap', () => {
    const unsafeContract = structuredClone(contract);
    unsafeContract.symbols['test.stepEnableTrap'] = {
      symbol: 'MF.HMI.bStepEnable',
      plcType: 'BOOL',
      access: 'write',
      pages: ['diagnostics'],
      updateMs: 0,
      safetyLevel: 'test',
      writeConfirmation: 'none',
      mock: false,
    };

    const result = validateContract(unsafeContract);

    expect(result.ok).toBe(false);
    expect(result.errors).toContain(
      'test.stepEnableTrap marks AT %I* symbol MF.HMI.bStepEnable writable',
    );
  });
});
