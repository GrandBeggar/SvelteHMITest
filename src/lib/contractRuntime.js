function coilKey(coilName) {
  return `manual.coils.${coilName[0].toLowerCase()}${coilName.slice(1)}`;
}

function materializeContractSymbols(contract) {
  const symbols = { ...contract.symbols };

  for (const coilName of contract.coilNames ?? []) {
    const prefix = coilKey(coilName);
    symbols[`${prefix}.out`] = {
      ...contract.coilTemplate.readbackOut,
      symbol: contract.coilTemplate.readbackOut.symbolPattern.replace('{coil}', coilName),
    };
    symbols[`${prefix}.status`] = {
      ...contract.coilTemplate.readbackStatus,
      symbol: contract.coilTemplate.readbackStatus.symbolPattern.replace('{coil}', coilName),
    };
    symbols[`${prefix}.force`] = {
      ...contract.coilTemplate.force,
      symbol: contract.coilTemplate.force.symbolPattern.replace('{coil}', coilName),
    };
  }

  return symbols;
}

function canRead(entry) {
  return entry.access === 'read' || entry.access === 'readwrite';
}

function canWrite(entry) {
  return entry.access === 'write' || entry.access === 'readwrite';
}

function constantValue(contract, constantKey) {
  const constant = contract.constants?.[constantKey];
  if (!constant) {
    throw new Error(`Unknown contract constant: ${constantKey}`);
  }
  return constant.value;
}

function numberBounds(contract, entry) {
  return {
    min: entry.bounds?.min,
    max: entry.bounds?.maxConstant
      ? constantValue(contract, entry.bounds.maxConstant)
      : entry.bounds?.max,
  };
}

function assertNumberBounds(contract, entry, value) {
  const bounds = numberBounds(contract, entry);
  if (bounds.min !== undefined && value < bounds.min) {
    throw new Error(`${entry.symbol} value ${value} is below minimum ${bounds.min}`);
  }
  if (bounds.max !== undefined && value > bounds.max) {
    throw new Error(`${entry.symbol} value ${value} is above maximum ${bounds.max}`);
  }
}

function coerceBoolean(value, symbol) {
  if (typeof value === 'boolean') return value;
  throw new Error(`${symbol} expects BOOL`);
}

function coerceInteger(contract, entry, value, unsigned = false) {
  if (!Number.isInteger(value)) {
    throw new Error(`${entry.symbol} expects an integer`);
  }
  if (unsigned && value < 0) {
    throw new Error(`${entry.symbol} expects an unsigned integer`);
  }
  assertNumberBounds(contract, entry, value);
  return value;
}

function coerceReal(contract, entry, value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${entry.symbol} expects a finite number`);
  }
  assertNumberBounds(contract, entry, value);
  return value;
}

function coerceEnum(contract, entry, value) {
  const enumValues = contract.enums?.[entry.plcType];
  if (!enumValues) {
    throw new Error(`${entry.symbol} uses unknown enum ${entry.plcType}`);
  }

  if (typeof value === 'string' && Object.hasOwn(enumValues, value)) {
    return enumValues[value];
  }

  if (Number.isInteger(value) && Object.values(enumValues).includes(value)) {
    return value;
  }

  throw new Error(`${entry.symbol} expects ${entry.plcType}`);
}

function coerceContractValue(contract, entry, value) {
  if (entry.plcType === 'BOOL') return coerceBoolean(value, entry.symbol);
  if (entry.plcType === 'INT') return coerceInteger(contract, entry, value);
  if (['UINT', 'UDINT'].includes(entry.plcType)) {
    return coerceInteger(contract, entry, value, true);
  }
  if (entry.plcType === 'REAL') return coerceReal(contract, entry, value);
  if (contract.enums?.[entry.plcType]) return coerceEnum(contract, entry, value);

  throw new Error(`${entry.symbol} has unsupported PLC type ${entry.plcType}`);
}

function mockValueFor(entry) {
  if (entry.mock !== undefined && entry.mock !== true) return entry.mock;
  if (entry.plcType === 'BOOL') return false;
  if (['INT', 'UINT', 'UDINT', 'REAL'].includes(entry.plcType)) return 0;
  return null;
}

function buildMockValues(symbols) {
  return new Map(Object.entries(symbols).map(([key, entry]) => [key, mockValueFor(entry)]));
}

function buildContractIndex(contract) {
  return {
    contract,
    symbols: materializeContractSymbols(contract),
  };
}

export {
  buildContractIndex,
  buildMockValues,
  canRead,
  canWrite,
  coerceContractValue,
  materializeContractSymbols,
  numberBounds,
};
