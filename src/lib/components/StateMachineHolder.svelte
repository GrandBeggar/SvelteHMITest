<script>
  import { stateName } from './stateMachine.js';

  let { label, state = 'inactive', children } = $props();

  const stateClass = $derived(stateName(state));
</script>

<section class="holder state-{stateClass}">
  <span class="holder-label">{label}</span>
  <div class="pocket">
    {@render children?.()}
  </div>
</section>

<style>
  .holder {
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 12px;
    border-radius: 5px;
    padding: 3px 12px;
    background: var(--kita-chip-inactive-bg);
  }

  .state-waiting {
    background: var(--kita-chip-waiting-bg);
  }

  .state-transitioning {
    background: var(--kita-chip-transitioning-bg);
  }

  .state-ready {
    background: var(--kita-chip-ready-bg);
  }

  .state-running {
    background: var(--kita-chip-running-bg);
  }

  .state-paused {
    background: var(--kita-chip-paused-bg);
  }

  .state-soft-fault {
    background: var(--kita-chip-soft-fault-bg);
  }

  .state-faulted {
    background: var(--kita-chip-faulted-bg);
  }

  .holder-label {
    min-width: 92px;
    color: var(--kita-text-primary);
    font-size: 13px;
    font-weight: 800;
    white-space: nowrap;
  }

  .pocket {
    min-width: 0;
    flex: 1;
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    border-radius: 5px;
    padding: 5px;
    background: var(--kita-bg-inset);
  }
</style>
