const stateClassByValue = {
  0: 'inactive',
  1: 'waiting',
  2: 'transitioning',
  3: 'ready',
  4: 'running',
  5: 'paused',
  6: 'soft-fault',
  7: 'faulted',
};

const labelsByState = {
  inactive: 'Inactive',
  waiting: 'Waiting',
  transitioning: 'Transitioning',
  ready: 'Ready',
  running: 'Running',
  paused: 'Paused',
  'soft-fault': 'Soft Fault',
  faulted: 'Faulted',
};

function stateName(value) {
  return typeof value === 'number' ? (stateClassByValue[value] ?? 'inactive') : value;
}

function stateMachineClass(value) {
  return `state-${stateName(value)}`;
}

function stateMachineLabel(value) {
  return labelsByState[stateName(value)] ?? 'Inactive';
}

export { stateMachineClass, stateMachineLabel, stateName };
