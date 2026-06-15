// First-pass symbol map for commissioning against the retrofit PLC.
// These are existing symbols from the MultiFormPLC project, so the PLC does not
// need temporary "test" tags for the rollout checks.
export const conn = {
  initialized: 'MAIN.bMachineIsInitialized',
  controlPower: 'Inputs.bControlPower',
  safetyOk: 'Inputs.bSafetyCircuitOK',
  cycleSwitch: 'Inputs.bCycleSwitch',
  startButton: 'Inputs.bStartButton',
  hopperNotEmpty: 'Inputs.bHopperIsNotEmptyPE',
  trayPicked: 'Inputs.bTrayPickedPE',
  outfeedSensor: 'Inputs.bOutfeedSensor',
  vacuumOut: 'MF.Coils.Vacuum.bOut',
  outfeedConveyorOut: 'MF.Coils.OutfeedConveyor.bOut',
  backStopsOut: 'MF.Coils.BackStops.bOut',
  recipeMaxCount: 'C.nRECIPE_MAX_COUNT',
  activeRecipe: 'MF.HMI.Recipe.nActiveIndex',
  selectedRecipe: 'MF.HMI.Recipe.nSelectedIndex',
  patternIndex: 'MF.HMI.nPatternIndex',
  dryCycleEnable: 'MF.HMI.bDryCycleEnable',
  trayCount: 'MF.Metrics.nTrayCount',
  traysPerMinute: 'MF.Metrics.rTraysPerMinute',
  traysLastMinute: 'MF.Metrics.nTraysLastMinute',
  traysLastHour: 'MF.Metrics.nTraysLastHour',
};

export const firstPassSymbols = [
  { key: 'initialized', label: 'PLC Initialized', symbol: conn.initialized, group: 'Runtime' },
  { key: 'controlPower', label: 'Control Power', symbol: conn.controlPower, group: 'Safety' },
  { key: 'safetyOk', label: 'Safety OK', symbol: conn.safetyOk, group: 'Safety' },
  { key: 'cycleSwitch', label: 'Cycle Switch', symbol: conn.cycleSwitch, group: 'Inputs' },
  { key: 'startButton', label: 'Start Button', symbol: conn.startButton, group: 'Inputs' },
  {
    key: 'hopperNotEmpty',
    label: 'Hopper Not Empty',
    symbol: conn.hopperNotEmpty,
    group: 'Inputs',
  },
  { key: 'trayPicked', label: 'Tray Picked PE', symbol: conn.trayPicked, group: 'Inputs' },
  { key: 'outfeedSensor', label: 'Outfeed Sensor', symbol: conn.outfeedSensor, group: 'Inputs' },
  { key: 'vacuumOut', label: 'Vacuum Output', symbol: conn.vacuumOut, group: 'Outputs' },
  {
    key: 'outfeedConveyorOut',
    label: 'Outfeed Conveyor',
    symbol: conn.outfeedConveyorOut,
    group: 'Outputs',
  },
  { key: 'backStopsOut', label: 'Back Stops Output', symbol: conn.backStopsOut, group: 'Outputs' },
  {
    key: 'recipeMaxCount',
    label: 'Recipe Max Count',
    symbol: conn.recipeMaxCount,
    group: 'Recipe',
  },
  { key: 'activeRecipe', label: 'Active Recipe', symbol: conn.activeRecipe, group: 'Recipe' },
  { key: 'trayCount', label: 'Tray Count', symbol: conn.trayCount, group: 'Metrics' },
  {
    key: 'traysPerMinute',
    label: 'Trays Per Minute',
    symbol: conn.traysPerMinute,
    group: 'Metrics',
  },
  {
    key: 'traysLastMinute',
    label: 'Trays Last Minute',
    symbol: conn.traysLastMinute,
    group: 'Metrics',
  },
  { key: 'traysLastHour', label: 'Trays Last Hour', symbol: conn.traysLastHour, group: 'Metrics' },
];

export const writeTestSymbols = [
  {
    key: 'dryCycleEnable',
    label: 'Dry Cycle Enable',
    symbol: conn.dryCycleEnable,
    type: 'boolean',
  },
  {
    key: 'selectedRecipe',
    label: 'Selected Recipe',
    symbol: conn.selectedRecipe,
    type: 'number',
    min: 0,
    max: 20,
  },
  {
    key: 'patternIndex',
    label: 'Pattern Index',
    symbol: conn.patternIndex,
    type: 'number',
    min: 1,
    max: 8,
  },
];
