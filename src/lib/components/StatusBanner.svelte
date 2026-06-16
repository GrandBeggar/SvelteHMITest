<script>
  let {
    online = false,
    label = online ? 'PLC Connected' : 'PLC Disconnected',
    detail = '',
  } = $props();
</script>

<div class:online class="status-banner" role="status" aria-live="polite">
  <span class="status-dot" aria-hidden="true"></span>
  <div>
    <strong>{label}</strong>
    {#if detail}
      <span>{detail}</span>
    {/if}
  </div>
</div>

<style>
  .status-banner {
    min-height: 34px;
    display: flex;
    align-items: center;
    gap: 8px;
    border-radius: 4px;
    padding: 7px 12px;
    background: var(--kita-chip-faulted-bg);
    color: var(--kita-chip-fg);
  }

  .status-banner.online {
    background: var(--kita-chip-running-bg);
    color: var(--kita-chip-fg);
  }

  .status-dot {
    width: 10px;
    height: 10px;
    flex: 0 0 auto;
    border-radius: var(--kita-radius-round);
    background: var(--kita-chip-fg);
    box-shadow: var(--kita-shadow-status-dot);
  }

  .status-banner.online .status-dot {
    background: var(--kita-chip-fg);
  }

  strong,
  span {
    display: block;
  }

  strong {
    font-size: 13px;
    font-weight: 700;
    text-transform: uppercase;
  }

  span {
    margin-top: 1px;
    color: inherit;
    font-size: 11px;
    font-weight: 600;
    opacity: 0.86;
  }
</style>
