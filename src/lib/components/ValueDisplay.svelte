<script>
  let { label, value = undefined, unit = '', quality = 'unknown' } = $props();

  const known = $derived(value !== undefined && value !== null);
  const display = $derived(
    known
      ? typeof value === 'number'
        ? Number.isInteger(value)
          ? String(value)
          : value.toFixed(2)
        : String(value)
      : 'Unknown',
  );
</script>

<article class="value-display" data-quality={quality}>
  <span>{label}</span>
  <strong>
    {display}
    {#if unit && known}<small>{unit}</small>{/if}
  </strong>
  {#if quality !== 'live'}
    <em>{quality === 'stale' ? 'Stale' : 'Unknown'}</em>
  {/if}
</article>

<style>
  .value-display {
    min-width: 0;
    min-height: 34px;
    display: flex;
    align-items: center;
    gap: 8px;
    border: 1px solid var(--kita-border-emphasis);
    border-radius: var(--kita-radius-control);
    padding: 4px 10px;
    background: var(--kita-bg-inset);
  }

  .value-display[data-quality='stale'] {
    border-color: var(--kita-chip-paused-bg);
  }

  .value-display[data-quality='unknown'] {
    border-color: var(--kita-chip-waiting-bg);
  }

  span,
  strong,
  em,
  small {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  span {
    color: var(--kita-text-muted);
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
  }

  strong {
    margin-left: auto;
    color: var(--kita-text-primary);
    font-family: var(--kita-font-mono);
    font-size: 16px;
    font-style: normal;
    font-weight: 700;
  }

  small {
    margin-left: var(--kita-space-1);
    color: var(--kita-text-muted);
    font-family: var(--kita-font-sans);
    font-size: 10px;
  }

  em {
    color: var(--kita-text-warning);
    font-size: 10px;
    font-style: normal;
    font-weight: 700;
    text-transform: uppercase;
  }
</style>
