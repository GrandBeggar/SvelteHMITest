// First-pass commissioning view over the machine contract. The browser sends
// contract keys; the gateway is the only layer that resolves keys to ADS symbols.
import contract from './machine-contract.json';
import { buildContractIndex, numberBounds } from './contractRuntime.js';

export const { symbols: contractSymbols } = buildContractIndex(contract);

function readItem(key, label, group) {
  const entry = contractSymbols[key];
  return { key, label, symbol: entry.symbol, group };
}

function writeItem(key, label, type) {
  const entry = contractSymbols[key];
  return {
    key,
    label,
    symbol: entry.symbol,
    type,
    ...numberBounds(contract, entry),
  };
}

export const firstPassSymbols = [
  readItem('runtime.initialized', 'PLC Initialized', 'Runtime'),
  readItem('safety.controlPower', 'Control Power', 'Safety'),
  readItem('safety.circuitOk', 'Safety OK', 'Safety'),
  readItem('input.cycleSwitch', 'Cycle Switch', 'Inputs'),
  readItem('input.startButton', 'Start Button', 'Inputs'),
  readItem('input.hopperNotEmpty', 'Hopper Not Empty', 'Inputs'),
  readItem('input.trayPicked', 'Tray Picked PE', 'Inputs'),
  readItem('input.outfeedSensor', 'Outfeed Sensor', 'Inputs'),
  readItem('manual.coils.vacuum.out', 'Vacuum Output', 'Outputs'),
  readItem('manual.coils.outfeedConveyor.out', 'Outfeed Conveyor', 'Outputs'),
  readItem('manual.coils.backStops.out', 'Back Stops Output', 'Outputs'),
  readItem('recipe.maxCount', 'Recipe Max Count', 'Recipe'),
  readItem('recipe.activeIndex', 'Active Recipe', 'Recipe'),
  readItem('metrics.trayCount', 'Tray Count', 'Metrics'),
  readItem('metrics.traysPerMinute', 'Trays Per Minute', 'Metrics'),
  readItem('metrics.traysLastMinute', 'Trays Last Minute', 'Metrics'),
  readItem('metrics.traysLastHour', 'Trays Last Hour', 'Metrics'),
];

export const writeTestSymbols = [
  writeItem('mode.dryCycleEnable', 'Dry Cycle Enable', 'boolean'),
  writeItem('recipe.selectedIndex', 'Selected Recipe', 'number'),
  writeItem('pattern.index', 'Pattern Index', 'number'),
];
