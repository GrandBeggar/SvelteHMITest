<script>
  import { getContext } from 'svelte';
  import NumPad from './NumPad.svelte';

  let {
    title = '',
    unit = '',
    value = 0,
    min = undefined,
    max = undefined,
    onchange = () => {},
  } = $props();

  const getRowLabel = getContext('paramRowLabel') ?? (() => '');
  const numpadLabel = $derived([getRowLabel(), title].filter(Boolean).join(' - '));
  let numpadOpen = $state(false);

  function accept(nextValue) {
    onchange(nextValue);
  }
</script>

<div class="param-input">
  {#if title}
    <span class="param-title">{title}</span>
  {/if}
  <button class="param-box" type="button" onclick={() => (numpadOpen = true)}>
    <span class="param-value">{value}</span>
    {#if unit}
      <span class="param-unit">{unit}</span>
    {/if}
  </button>
</div>

<NumPad
  open={numpadOpen}
  label={numpadLabel}
  currentValue={value}
  {min}
  {max}
  onaccept={accept}
  onclose={() => (numpadOpen = false)}
/>

<style>
  .param-input {
    min-width: 116px;
    display: flex;
    flex-direction: column;
    gap: var(--kita-space-1);
  }

  .param-title {
    color: var(--kita-text-action);
    font-size: var(--kita-font-xs);
    font-weight: 800;
  }

  .param-box {
    min-height: 48px;
    display: flex;
    align-items: baseline;
    justify-content: flex-end;
    gap: var(--kita-space-1);
    border: 1px solid var(--kita-border-emphasis);
    border-radius: var(--kita-radius-control);
    padding: 0 var(--kita-space-3);
    background: var(--kita-bg-inset);
    color: var(--kita-text-primary);
    cursor: pointer;
  }

  .param-box:active {
    border-color: var(--kita-text-action);
  }

  .param-value {
    font-family: var(--kita-font-mono);
    font-size: var(--kita-font-lg);
    font-weight: 850;
  }

  .param-unit {
    color: var(--kita-text-muted);
    font-size: var(--kita-font-xs);
  }
</style>
