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
    min-height: 48px;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: var(--kita-space-2);
    border: 1px solid var(--kita-border-emphasis);
    border-radius: var(--kita-radius-control);
    padding: var(--kita-space-2) var(--kita-space-3);
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
    font-size: var(--kita-font-xs);
    font-weight: 850;
  }

  strong {
    justify-self: end;
    color: var(--kita-text-primary);
    font-family: var(--kita-font-mono);
    font-size: var(--kita-font-md);
    font-style: normal;
    font-weight: 850;
  }

  small {
    margin-left: var(--kita-space-1);
    color: var(--kita-text-muted);
    font-family: var(--kita-font-sans);
    font-size: var(--kita-font-xs);
  }

  em {
    grid-column: 1 / -1;
    color: var(--kita-text-warning);
    font-size: var(--kita-font-xs);
    font-style: normal;
    font-weight: 850;
    text-transform: uppercase;
  }
</style>
