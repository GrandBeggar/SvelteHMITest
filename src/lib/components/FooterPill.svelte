<script>
  import { stateName } from './stateMachine.js';

  let { label, state = 'inactive' } = $props();

  const stateClass = $derived(stateName(state));
</script>

<span class="footer-pill state-{stateClass}">
  {label}
</span>

<style>
  .footer-pill {
    overflow: hidden;
    border-radius: 4px;
    padding: 3px 10px;
    font-size: 11px;
    font-weight: 700;
    text-overflow: ellipsis;
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
