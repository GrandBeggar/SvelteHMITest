<script>
  import { stateName } from './stateMachine.js';

  let {
    label,
    value = undefined,
    quality = 'unknown',
    activeLabel = 'On',
    inactiveLabel = 'Off',
  } = $props();

  const known = $derived(value !== undefined && value !== null);
  const state = $derived(
    quality === 'stale' ? 'paused' : known ? (value ? 'running' : 'inactive') : 'waiting',
  );
  const display = $derived(known ? (value ? activeLabel : inactiveLabel) : 'Unknown');
  const stateClass = $derived(stateName(state));
</script>

<article class="sensor-chip state-{stateClass}" data-quality={quality}>
  <span>{label}</span>
  <strong>{display}</strong>
  {#if quality !== 'live'}
    <small>{quality === 'stale' ? 'Stale' : 'Unknown'}</small>
  {/if}
</article>

<style>
  .sensor-chip {
    min-height: 44px;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: var(--kita-space-2);
    border-radius: var(--kita-radius-chip);
    padding: var(--kita-space-2) var(--kita-space-3);
    background: var(--kita-chip-inactive-bg);
    color: var(--kita-chip-inactive-fg);
  }

  .state-waiting {
    background: var(--kita-chip-waiting-bg);
    color: var(--kita-chip-waiting-fg);
  }

  .state-running {
    background: var(--kita-chip-running-bg);
    color: var(--kita-chip-fg);
  }

  .state-paused {
    background: var(--kita-chip-paused-bg);
    color: var(--kita-bg-page);
  }

  span,
  strong,
  small {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  span {
    font-size: var(--kita-font-xs);
    font-weight: 850;
  }

  strong {
    justify-self: end;
    font-size: var(--kita-font-xs);
    font-weight: 950;
    text-transform: uppercase;
  }

  small {
    grid-column: 1 / -1;
    color: inherit;
    font-size: var(--kita-font-xs);
    font-weight: 800;
    opacity: 0.84;
    text-transform: uppercase;
  }
</style>
