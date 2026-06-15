<script>
  import { stateMachineLabel, stateName } from './stateMachine.js';

  let { label = '', state = 0 } = $props();

  const stateClass = $derived(stateName(state));
  const stateLabel = $derived(label || stateMachineLabel(state));
</script>

<span class="state-chip state-{stateClass}" data-state={stateClass}>
  {stateLabel}
</span>

<style>
  .state-chip {
    min-height: 30px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--kita-radius-chip);
    padding: 0 var(--kita-space-3);
    font-size: var(--kita-font-xs);
    font-weight: 900;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .state-inactive {
    background: var(--kita-chip-inactive-bg);
    color: var(--kita-chip-inactive-fg);
  }

  .state-waiting {
    background: var(--kita-chip-waiting-bg);
    color: var(--kita-chip-waiting-fg);
  }

  .state-transitioning {
    background: var(--kita-chip-transitioning-bg);
    color: var(--kita-chip-fg);
  }

  .state-ready {
    background: var(--kita-chip-ready-bg);
    color: var(--kita-chip-fg);
  }

  .state-running {
    background: var(--kita-chip-running-bg);
    color: var(--kita-chip-fg);
  }

  .state-paused {
    background: var(--kita-chip-paused-bg);
    color: var(--kita-chip-fg);
  }

  .state-soft-fault {
    background: var(--kita-chip-soft-fault-bg);
    color: var(--kita-chip-fg);
  }

  .state-faulted {
    background: var(--kita-chip-faulted-bg);
    color: var(--kita-chip-fg);
  }
</style>
